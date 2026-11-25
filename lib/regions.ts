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

// Display names only: stored values and filters keep the Russian names above.
const REGION_NAMES: Record<'kk' | 'en', Record<string, string>> = {
  kk: {
    'Весь Казахстан': 'Бүкіл Қазақстан', Астана: 'Астана', Алматы: 'Алматы', 'Акмолинская область': 'Ақмола облысы',
    'Актюбинская область': 'Ақтөбе облысы', 'Алматинская область': 'Алматы облысы', 'Атырауская область': 'Атырау облысы',
    'Западно-Казахстанская область': 'Батыс Қазақстан облысы', 'Жамбылская область': 'Жамбыл облысы',
    'Карагандинская область': 'Қарағанды облысы', 'Костанайская область': 'Қостанай облысы',
    'Кызылординская область': 'Қызылорда облысы', 'Мангистауская область': 'Маңғыстау облысы',
    'Туркестанская область': 'Түркістан облысы', 'Павлодарская область': 'Павлодар облысы',
    'Северо-Казахстанская область': 'Солтүстік Қазақстан облысы', 'Восточно-Казахстанская область': 'Шығыс Қазақстан облысы',
    Шымкент: 'Шымкент', 'Область Абай': 'Абай облысы', 'Область Жетісу': 'Жетісу облысы', 'Область Ұлытау': 'Ұлытау облысы',
  },
  en: {
    'Весь Казахстан': 'All Kazakhstan', Астана: 'Astana', Алматы: 'Almaty', 'Акмолинская область': 'Akmola Region',
    'Актюбинская область': 'Aktobe Region', 'Алматинская область': 'Almaty Region', 'Атырауская область': 'Atyrau Region',
    'Западно-Казахстанская область': 'West Kazakhstan Region', 'Жамбылская область': 'Zhambyl Region',
    'Карагандинская область': 'Karaganda Region', 'Костанайская область': 'Kostanay Region',
    'Кызылординская область': 'Kyzylorda Region', 'Мангистауская область': 'Mangystau Region',
    'Туркестанская область': 'Turkistan Region', 'Павлодарская область': 'Pavlodar Region',
    'Северо-Казахстанская область': 'North Kazakhstan Region', 'Восточно-Казахстанская область': 'East Kazakhstan Region',
    Шымкент: 'Shymkent', 'Область Абай': 'Abai Region', 'Область Жетісу': 'Zhetisu Region', 'Область Ұлытау': 'Ulytau Region',
  },
};
export const regionLabel = (lang: 'ru' | 'kk' | 'en', name: string) =>
  lang === 'ru' ? name : Object.hasOwn(REGION_NAMES[lang], name) ? REGION_NAMES[lang][name] : name;
