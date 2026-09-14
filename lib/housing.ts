export const HOUSING_CATEGORIES = ['Посуточные квартиры', 'Гостиницы'] as const;
export const isHousingCategory = (category: string) => HOUSING_CATEGORIES.some(value => value === category);
export const normalizeHousingSearch = (value: string) => value.normalize('NFKC').toLocaleLowerCase('ru-RU').replaceAll('ё', 'е').trim().replace(/\s+/g, ' ');
export type HousingListing = {
  id: string; title: string; price: string; category: string; location: string; region: string;
  image: string; description: string; phone: string; owner: string; available: string;
  guests: number; rooms: number; mine: boolean; favorite: boolean; status: string;
  latitude: number | null; longitude: number | null;
  updatedAt: number; sellerType: 'Частное лицо' | 'Компания' | 'Магазин';
};
