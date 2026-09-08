export const KAZAKHSTAN_REPUBLICAN_CITIES = [
  'Алматы',
  'Астана',
  'Шымкент',
] as const;

export const KAZAKHSTAN_OBLASTS = [
  'Область Абай',
  'Акмолинская область',
  'Актюбинская область',
  'Алматинская область',
  'Атырауская область',
  'Восточно-Казахстанская область',
  'Жамбылская область',
  'Область Жетісу',
  'Западно-Казахстанская область',
  'Карагандинская область',
  'Костанайская область',
  'Кызылординская область',
  'Мангистауская область',
  'Павлодарская область',
  'Северо-Казахстанская область',
  'Туркестанская область',
  'Область Ұлытау',
] as const;

export const KAZAKHSTAN_MARKET_REGIONS = [
  ...KAZAKHSTAN_REPUBLICAN_CITIES,
  ...KAZAKHSTAN_OBLASTS,
] as const;

export const KAZAKHSTAN_REGION_FILTERS = [
  'Весь Казахстан',
  ...KAZAKHSTAN_MARKET_REGIONS,
] as const;
