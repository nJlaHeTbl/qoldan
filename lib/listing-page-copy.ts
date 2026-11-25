// Texts of the server-rendered listing page (/listing/[id]) in RU/KK/EN. Kazakh texts need a native speaker's review.
import type { Lang } from '@/lib/ui-copy';

type Copy = {
  missingTitle: string;
  missingText: string;
  backCatalog: string;
  allHousing: string;
  allListings: string;
  rooms: (rooms: number, guests: number) => string;
  datesAsk: string;
  mapPoint: string;
  published: string;
  delivery: string;
  verified: string;
  member: string;
  noPhone: string;
  safety: string;
  similar: string;
  locale: string;
  offer: Record<string, string>;
  seller: Record<string, string>;
  categories: Record<string, string>;
  units: Record<string, string>;
};

const RU: Copy = {
  missingTitle: 'Объявление больше недоступно',
  missingText: 'Возможно, владелец поставил его на паузу или снял с публикации.',
  backCatalog: 'Вернуться в каталог',
  allHousing: 'Всё жильё',
  allListings: 'Все объявления',
  rooms: (rooms, guests) => `${rooms} комн. · до ${guests} гостей`,
  datesAsk: ' · Свободные даты уточняйте у владельца',
  mapPoint: 'Посмотреть указанную точку на карте',
  published: 'Опубликовано',
  delivery: 'Доставка или выезд доступны',
  verified: 'бизнес подтверждён Qoldan',
  member: 'участник площадки',
  noPhone: 'Владелец не показывает номер. Напишите ему в чате Qoldan.',
  safety: 'Qoldan не принимает оплату. Уточните состояние, условия и личность второй стороны до передачи денег.',
  similar: 'Похожие объявления',
  locale: 'ru-RU',
  offer: {},
  seller: {},
  categories: {},
  units: {},
};

const KK: Copy = {
  missingTitle: 'Хабарландыру енді қолжетімсіз',
  missingText: 'Иесі оны кідіртіп қойған немесе жариялаудан алып тастаған болуы мүмкін.',
  backCatalog: 'Каталогқа оралу',
  allHousing: 'Барлық баспана',
  allListings: 'Барлық хабарландыру',
  rooms: (rooms, guests) => `${rooms} бөлме · ${guests} қонаққа дейін`,
  datesAsk: ' · Бос күндерді иесінен нақтылаңыз',
  mapPoint: 'Көрсетілген нүктені картадан көру',
  published: 'Жарияланды',
  delivery: 'Жеткізу немесе барып қызмет көрсету бар',
  verified: 'бизнесті Qoldan растады',
  member: 'алаң қатысушысы',
  noPhone: 'Иесі нөмірін көрсетпейді. Оған Qoldan чатында жазыңыз.',
  safety: 'Qoldan төлем қабылдамайды. Ақша бермес бұрын күйін, шарттарын және екінші тараптың жеке басын нақтылаңыз.',
  similar: 'Ұқсас хабарландырулар',
  locale: 'kk-KZ',
  offer: { Продам: 'Сатамын', Сдам: 'Жалға беремін', 'Окажу услугу': 'Қызмет көрсетемін' },
  seller: { 'Частное лицо': 'Жеке тұлға', Компания: 'Компания', Магазин: 'Дүкен' },
  categories: {
    Сельхозуслуги: 'Ауыл шаруашылық қызметтері',
    Спецтехника: 'Арнайы техника',
    Техника: 'Техника',
    Сельхозтехника: 'Ауыл шаруашылығы техникасы',
    Услуги: 'Қызметтер',
    'Скот и животные': 'Мал және жануарлар',
    'Аренда техники': 'Техника жалға алу',
    'Рабочие услуги': 'Жұмыс қызметтері',
    Генераторы: 'Генераторлар',
    'Корма и сено': 'Жем және шөп',
    Зерно: 'Астық',
    Пастбища: 'Жайылым',
    'Перевозка скота': 'Мал тасымалдау',
    Инструменты: 'Құралдар',
    Электроника: 'Электроника',
    Оборудование: 'Жабдық',
    'Для мероприятий': 'Іс-шараларға',
    Стройматериалы: 'Құрылыс материалдары',
    'Остатки партий': 'Партия қалдықтары',
    Доставка: 'Жеткізу',
    'Посуточные квартиры': 'Тәуліктік пәтерлер',
    Гостиницы: 'Қонақ үйлер',
  },
  units: { '/ услуга': '/ қызмет', '/ га': '/ га', '/ час': '/ сағат', '/ сутки': '/ тәулік', '/ шт.': '/ дана', '/ кг': '/ кг', '/ тюк': '/ бума', '/ голову': '/ басы', '/ всё стадо': '/ бүкіл табын' },
};

const EN: Copy = {
  missingTitle: 'This listing is no longer available',
  missingText: 'The owner may have paused or removed it.',
  backCatalog: 'Back to the catalogue',
  allHousing: 'All housing',
  allListings: 'All listings',
  rooms: (rooms, guests) => `${rooms} ${rooms === 1 ? 'room' : 'rooms'} · up to ${guests} guests`,
  datesAsk: ' · Ask the owner about free dates',
  mapPoint: 'See the marked point on the map',
  published: 'Published',
  delivery: 'Delivery or call-out available',
  verified: 'business verified by Qoldan',
  member: 'marketplace member',
  noPhone: 'The owner does not show the number. Message them in the Qoldan chat.',
  safety: 'Qoldan does not take payments. Check the condition, the terms and the other party’s identity before paying.',
  similar: 'Similar listings',
  locale: 'en-US',
  offer: { Продам: 'For sale', Сдам: 'For rent', 'Окажу услугу': 'Service' },
  seller: { 'Частное лицо': 'Private person', Компания: 'Company', Магазин: 'Shop' },
  categories: {
    Сельхозуслуги: 'Farm services',
    Спецтехника: 'Heavy machinery',
    Техника: 'Machinery',
    Сельхозтехника: 'Agricultural machinery',
    Услуги: 'Services',
    'Скот и животные': 'Livestock and animals',
    'Аренда техники': 'Machinery rental',
    'Рабочие услуги': 'Labour services',
    Генераторы: 'Generators',
    'Корма и сено': 'Feed and hay',
    Зерно: 'Grain',
    Пастбища: 'Pastures',
    'Перевозка скота': 'Livestock transport',
    Инструменты: 'Tools',
    Электроника: 'Electronics',
    Оборудование: 'Equipment',
    'Для мероприятий': 'Event equipment',
    Стройматериалы: 'Building materials',
    'Остатки партий': 'Surplus batches',
    Доставка: 'Delivery',
    'Посуточные квартиры': 'Daily apartments',
    Гостиницы: 'Hotels',
  },
  units: { '/ услуга': '/ service', '/ га': '/ ha', '/ час': '/ hour', '/ сутки': '/ day', '/ шт.': '/ piece', '/ кг': '/ kg', '/ тюк': '/ bale', '/ голову': '/ head', '/ всё стадо': '/ whole herd' },
};

const COPIES: Record<Lang, Copy> = { ru: RU, kk: KK, en: EN };

export function listingPageCopy(lang: Lang) {
  const copy = COPIES[lang];
  // Stored values are Russian; unknown ones are shown as written.
  // Own keys only: user-typed values such as "constructor" must never reach Object.prototype.
  const label = (table: Record<string, string>, value: string) =>
    Object.hasOwn(table, value) && typeof table[value] === 'string' ? table[value] : value;
  return {
    ...copy,
    offerLabel: (value: string) => label(copy.offer, value),
    sellerLabel: (value: string) => label(copy.seller, value),
    categoryLabel: (value: string) => label(copy.categories, value),
    unitLabel: (value: string) => label(copy.units, value),
  };
}
