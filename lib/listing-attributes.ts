import { z } from 'zod';

// zod probes whether eval is allowed by calling Function(''); under a strict Content-Security-Policy that probe is
// reported as a violation. Turning the JIT off skips the probe (the Workers runtime has no eval anyway).
z.config({ jitless: true });

// Category-specific characteristics. Stored as validated JSON in listings.attributes; the server keeps
// only the fields of the listing's own group, so a client cannot attach arbitrary data.

export type AttributeGroup = 'machinery' | 'materials' | 'rental';

const MACHINERY_CATEGORIES = ['Сельхозуслуги', 'Спецтехника', 'Перевозка скота', 'Доставка'];
const MATERIAL_CATEGORIES = ['Стройматериалы', 'Остатки партий'];

export const MATERIAL_UNITS = ['шт', 'м²', 'м³', 'м', 'кг', 'т', 'поддон', 'мешок'] as const;
export const MATERIAL_CONDITIONS = ['новое', 'б/у', 'остатки'] as const;
export const MACHINERY_RATES = ['час', 'га', 'смена', 'день', 'рейс'] as const;
export const RENTAL_RATES = ['час', 'день', 'неделя', 'месяц'] as const;

/** Which characteristics a listing gets; machinery and materials win over the generic rental set. */
export function attributeGroup(category: string, type: string): AttributeGroup | null {
  if (MACHINERY_CATEGORIES.includes(category)) return 'machinery';
  if (MATERIAL_CATEGORIES.includes(category)) return 'materials';
  if (type === 'Сдам' && category !== 'Посуточные квартиры' && category !== 'Гостиницы') return 'rental';
  return null;
}

const shortText = z.string().trim().max(120);

export const attributeSchemas = {
  machinery: z
    .object({
      withOperator: z.boolean().optional(),
      rate: z.enum(MACHINERY_RATES).optional(),
      serviceArea: shortText.optional(),
      travel: z.boolean().optional(),
    })
    .strip(),
  materials: z
    .object({
      quantity: z.number().positive().max(10_000_000).optional(),
      unit: z.enum(MATERIAL_UNITS).optional(),
      condition: z.enum(MATERIAL_CONDITIONS).optional(),
      partialSale: z.boolean().optional(),
    })
    .strip(),
  rental: z
    .object({
      deposit: z.number().int().min(0).max(100_000_000).optional(),
      minTerm: shortText.optional(),
      rate: z.enum(RENTAL_RATES).optional(),
    })
    .strip(),
} as const;

export type ListingAttributes = {
  withOperator?: boolean;
  rate?: string;
  serviceArea?: string;
  travel?: boolean;
  quantity?: number;
  unit?: string;
  condition?: string;
  partialSale?: boolean;
  deposit?: number;
  minTerm?: string;
};

/** Validates raw attributes for the listing's group. Unknown keys are dropped; bad values throw. */
export function cleanAttributes(category: string, type: string, raw: unknown): ListingAttributes {
  const group = attributeGroup(category, type);
  if (!group || raw === undefined || raw === null) return {};
  const parsed = attributeSchemas[group].parse(raw) as ListingAttributes;
  return Object.fromEntries(
    Object.entries(parsed).filter(([, value]) => value !== undefined && value !== ''),
  ) as ListingAttributes;
}

/** Safe read of the stored JSON (never throws on legacy or damaged rows). */
export function readAttributes(json: unknown): ListingAttributes {
  if (typeof json !== 'string' || !json) return {};
  try {
    const value = JSON.parse(json) as unknown;
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as ListingAttributes) : {};
  } catch {
    return {};
  }
}

/** Short human-readable facts for cards and the listing page. */
const FACTS = {
  ru: { with: 'С оператором', without: 'Без оператора', rate: (r: string) => `Цена за ${r}`, area: (a: string) => `Район работ: ${a}`, travel: 'Возможен выезд', qty: (q: string) => `Количество: ${q}`, cond: (c: string) => `Состояние: ${c}`, partial: 'Можно купить часть партии', deposit: (d: string) => `Залог ${d} ₸`, noDeposit: 'Без залога', term: (t: string) => `Минимальный срок: ${t}`, locale: 'ru-RU' },
  kk: { with: 'Оператормен', without: 'Операторсыз', rate: (r: string) => `Баға: ${r} үшін`, area: (a: string) => `Жұмыс ауданы: ${a}`, travel: 'Баруға болады', qty: (q: string) => `Саны: ${q}`, cond: (c: string) => `Жағдайы: ${c}`, partial: 'Партияның бір бөлігін алуға болады', deposit: (d: string) => `Кепіл ${d} ₸`, noDeposit: 'Кепілсіз', term: (t: string) => `Ең аз мерзім: ${t}`, locale: 'ru-RU' },
  en: { with: 'With operator', without: 'Without operator', rate: (r: string) => `Price per ${r}`, area: (a: string) => `Service area: ${a}`, travel: 'Can travel', qty: (q: string) => `Quantity: ${q}`, cond: (c: string) => `Condition: ${c}`, partial: 'Part of the batch available', deposit: (d: string) => `Deposit ${d} ₸`, noDeposit: 'No deposit', term: (t: string) => `Minimum term: ${t}`, locale: 'en-US' },
} as const;
const VALUE_LABELS: Record<'kk' | 'en', Record<string, string>> = {
  kk: { 'час': 'сағат', 'смена': 'ауысым', 'день': 'күн', 'неделя': 'апта', 'месяц': 'ай', 'новое': 'жаңа', 'б/у': 'қолданылған', 'остатки': 'қалдықтар', 'шт': 'дана', 'мешок': 'қап' },
  en: { 'час': 'hour', 'га': 'ha', 'смена': 'shift', 'день': 'day', 'рейс': 'trip', 'неделя': 'week', 'месяц': 'month', 'новое': 'new', 'б/у': 'used', 'остатки': 'leftovers', 'шт': 'pcs', 'поддон': 'pallet', 'мешок': 'bag' },
};

export function describeAttributes(attributes: ListingAttributes, lang: 'ru' | 'kk' | 'en' = 'ru'): string[] {
  const t = FACTS[lang];
  const label = (value: string) => {
    if (lang === 'ru') return value;
    const table = VALUE_LABELS[lang];
    return Object.hasOwn(table, value) ? table[value] : value; // own keys only
  };
  const facts: string[] = [];
  if (attributes.withOperator === true) facts.push(t.with);
  if (attributes.withOperator === false) facts.push(t.without);
  if (attributes.rate) facts.push(t.rate(label(attributes.rate)));
  if (attributes.serviceArea) facts.push(t.area(attributes.serviceArea));
  if (attributes.travel) facts.push(t.travel);
  if (attributes.quantity !== undefined) {
    facts.push(t.qty(`${attributes.quantity.toLocaleString(t.locale)}${attributes.unit ? ` ${label(attributes.unit)}` : ''}`));
  }
  if (attributes.condition) facts.push(t.cond(label(attributes.condition)));
  if (attributes.partialSale) facts.push(t.partial);
  if (attributes.deposit !== undefined) {
    facts.push(attributes.deposit > 0 ? t.deposit(attributes.deposit.toLocaleString(t.locale)) : t.noDeposit);
  }
  if (attributes.minTerm) facts.push(t.term(attributes.minTerm));
  return facts;
}
