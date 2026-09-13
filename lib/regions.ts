// Vehicle registration codes. Stored names remain unchanged for existing records.
export const KAZAKHSTAN_REGIONS = [
  { code: '01', name: 'Астана' },
  { code: '02', name: 'Алматы' },
  { code: '03', name: 'Акмолинская область' },
  { code: '04', name: 'Актюбинская область' },
  { code: '05', name: 'Алматинская область' },
  { code: '06', name: 'Атырауская область' },
  { code: '07', name: 'Западно-Казахстанская область' },
  { code: '08', name: 'Жамбылская область' },
  { code: '09', name: 'Карагандинская область' },
  { code: '10', name: 'Костанайская область' },
  { code: '11', name: 'Кызылординская область' },
  { code: '12', name: 'Мангистауская область' },
  { code: '13', name: 'Туркестанская область' },
  { code: '14', name: 'Павлодарская область' },
  { code: '15', name: 'Северо-Казахстанская область' },
  { code: '16', name: 'Восточно-Казахстанская область' },
  { code: '17', name: 'Шымкент' },
  { code: '18', name: 'Область Абай' },
  { code: '19', name: 'Область Жетісу' },
  { code: '20', name: 'Область Ұлытау' },
] as const;

export const KAZAKHSTAN_MARKET_REGIONS = KAZAKHSTAN_REGIONS.map((region) => region.name);

export const KAZAKHSTAN_REGION_FILTERS = [
  'Весь Казахстан',
  ...KAZAKHSTAN_MARKET_REGIONS,
] as const;
