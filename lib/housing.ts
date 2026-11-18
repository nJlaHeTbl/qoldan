export const HOUSING_CATEGORIES = ['Посуточные квартиры', 'Гостиницы'] as const;
export const isHousingCategory = (category: string) => HOUSING_CATEGORIES.some(value => value === category);
export function getHousingPhotos(cover: string, serialized: unknown): string[] {
  let photos: unknown = serialized;
  try { if (typeof serialized === 'string') photos = JSON.parse(serialized); } catch { photos = []; }
  return [...new Set([cover, ...(Array.isArray(photos) ? photos.filter((v): v is string => typeof v === 'string' && /^\/api\/media\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(v)) : [])])].slice(0, 5);
}
export const normalizeHousingSearch = (value: string) => value.normalize('NFKC').toLocaleLowerCase('ru-RU').replaceAll('ё', 'е').trim().replace(/\s+/g, ' ');
export type HousingListing = {
  id: string; title: string; price: string; category: string; location: string; region: string;
  image: string; description: string; phone?: string; hasPhone?: boolean; owner: string; available: string;
  photos: string[];
  guests: number; rooms: number; mine: boolean; favorite: boolean; status: string;
  latitude: number | null; longitude: number | null;
  updatedAt: number; sellerType: 'Частное лицо' | 'Компания' | 'Магазин';
};
