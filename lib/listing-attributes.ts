import { z } from 'zod';

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
export function describeAttributes(attributes: ListingAttributes): string[] {
  const facts: string[] = [];
  if (attributes.withOperator === true) facts.push('С оператором');
  if (attributes.withOperator === false) facts.push('Без оператора');
  if (attributes.rate) facts.push(`Цена за ${attributes.rate}`);
  if (attributes.serviceArea) facts.push(`Район работ: ${attributes.serviceArea}`);
  if (attributes.travel) facts.push('Возможен выезд');
  if (attributes.quantity !== undefined) {
    facts.push(`Количество: ${attributes.quantity.toLocaleString('ru-RU')}${attributes.unit ? ` ${attributes.unit}` : ''}`);
  }
  if (attributes.condition) facts.push(`Состояние: ${attributes.condition}`);
  if (attributes.partialSale) facts.push('Можно купить часть партии');
  if (attributes.deposit !== undefined) {
    facts.push(attributes.deposit > 0 ? `Залог ${attributes.deposit.toLocaleString('ru-RU')} ₸` : 'Без залога');
  }
  if (attributes.minTerm) facts.push(`Минимальный срок: ${attributes.minTerm}`);
  return facts;
}
