// Rule-based "smart search": turns a phrase such as «перфоратор в аренду в Талдыкоргане до 5000 тенге»
// into structured filters (deal type, price range, place) plus the remaining search words.
// No AI, no network: predictable, instant and free. Explicit filters in the UI always win.

export type DealType = 'Продам' | 'Сдам' | 'Окажу услугу';

export type SmartQuery = {
  words: string[];
  type?: DealType;
  minPrice?: number;
  maxPrice?: number;
  place?: string;
  /** Human-readable list of what was understood, for the hint under the search box. */
  hints: string[];
};

// Main cities and the towns of Zhetisu region (the launch region) in their dictionary form.
export const SMART_PLACES = [
  'Талдыкорган', 'Текели', 'Жаркент', 'Сарканд', 'Ушарал', 'Уштобе', 'Коксу', 'Балпык би', 'Карабулак',
  'Лепсы', 'Акши', 'Алматы', 'Астана', 'Шымкент', 'Караганда', 'Актобе', 'Тараз', 'Павлодар',
  'Усть-Каменогорск', 'Семей', 'Конаев', 'Талгар', 'Есик', 'Каскелен',
];

const RENT = /^(аренд[а-яё]*|напрокат|прокат[а-яё]*|сдам|сдаю|снять|сниму)$/u;
const SALE = /^(купить|куплю|продам|продаю|продажа|продается|б\/у)$/u;
const SERVICE = /^(услуг[а-яё]*|оказ[а-яё]*|мастер|исполнител[а-яё]*)$/u;
const FILLER = new Set([
  'в', 'во', 'на', 'за', 'для', 'по', 'из', 'с', 'и', 'нужен', 'нужна', 'нужно', 'нужны', 'ищу', 'надо',
  'день', 'сутки', 'час', 'тенге', 'тг', '₸', 'тыс', 'т', 'k', 'к', 'руб', 'недорого',
]);

const normalize = (text: string) =>
  text.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').replace(/[«»"“”,;!?()]/g, ' ');

const placeStem = (place: string) => {
  const base = normalize(place).trim();
  // «Талдыкорган» → «талдыкорг» matches «Талдыкоргане», «Талдыкорганский»; short names keep 4+ letters.
  return base.length <= 5 ? base : base.slice(0, Math.max(4, base.length - 2));
};

// Light stemming for Russian case endings: «трактора», «трактором» → «трактор».
const stemWord = (word: string) =>
  word.length > 5 ? word.replace(/(ами|ями|ого|ему|ов|ев|ом|ем|ой|ей|ам|ям|ах|ях|а|я|ы|и|у|ю|е|о)$/u, '') : word;

const toAmount = (digits: string, suffix: string | undefined) => {
  const value = Number(digits.replace(/\s/g, ''));
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return suffix ? value * 1000 : value;
};

export function parseSmartQuery(raw: string, places: readonly string[] = SMART_PLACES): SmartQuery {
  let text = normalize(raw);
  const hints: string[] = [];
  const result: SmartQuery = { words: [], hints };

  // Price: «до 5000», «до 5 тыс», «от 100 000 до 200 000», «дешевле 3000».
  const priceRe = /(до|дешевле|не дороже|от|дороже)\s*(\d[\d\s]*\d|\d)\s*(тыс[а-яё]*\.?|к(?![а-яё])|k(?![a-z]))?/gu;
  text = text.replace(priceRe, (_match, word: string, digits: string, suffix: string | undefined) => {
    const amount = toAmount(digits, suffix);
    if (amount !== undefined) {
      if (word === 'от' || word === 'дороже') result.minPrice = amount;
      else result.maxPrice = amount;
    }
    return ' ';
  });
  if (result.minPrice !== undefined) hints.push(`от ${result.minPrice.toLocaleString('ru-RU')} ₸`);
  if (result.maxPrice !== undefined) hints.push(`до ${result.maxPrice.toLocaleString('ru-RU')} ₸`);

  // Place: the first known town mentioned in any case form.
  for (const place of places) {
    const stem = placeStem(place);
    const re = new RegExp(`(^|\\s)${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\S*`, 'u');
    if (re.test(text)) {
      result.place = place;
      text = text.replace(re, ' ');
      hints.push(place);
      break;
    }
  }

  for (const token of text.split(/\s+/).filter(Boolean)) {
    if (RENT.test(token)) {
      result.type ??= 'Сдам';
    } else if (SALE.test(token)) {
      result.type ??= 'Продам';
    } else if (SERVICE.test(token)) {
      result.type ??= 'Окажу услугу';
    } else if (!FILLER.has(token) && !/^\d+$/.test(token) && token.length > 1) {
      result.words.push(stemWord(token));
    }
  }
  if (result.type) {
    hints.unshift(result.type === 'Сдам' ? 'аренда' : result.type === 'Продам' ? 'продажа' : 'услуга');
  }
  return result;
}

/** Does a listing match the parsed query? `explicitType` is the deal type chosen in the UI, if any. */
export function matchesSmartQuery(
  listing: { title: string; category: string; location: string; region?: string; description?: string; type: string; price: string; livestockType?: string; livestockBreed?: string },
  query: SmartQuery,
  explicitType?: string,
) {
  const haystack = normalize(
    [listing.title, listing.category, listing.location, listing.region, listing.description, listing.livestockType, listing.livestockBreed]
      .filter(Boolean)
      .join(' '),
  );
  if (!query.words.every((word) => haystack.includes(word))) return false;
  if (query.type && !explicitType && listing.type !== query.type) return false;
  if (query.place) {
    const stem = placeStem(query.place);
    if (!normalize(`${listing.location} ${listing.region ?? ''}`).includes(stem)) return false;
  }
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    const digits = listing.price.replace(/[^\d]/g, '');
    if (!digits) return false;
    const price = Number(digits);
    if (query.minPrice !== undefined && price < query.minPrice) return false;
    if (query.maxPrice !== undefined && price > query.maxPrice) return false;
  }
  return true;
}
