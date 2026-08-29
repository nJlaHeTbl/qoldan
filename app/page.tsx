'use client';
/* oxlint-disable next/no-img-element, react/react-compiler -- marketplace photos can be remote or user-uploaded; shared server data is hydrated after mount */
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
  ArrowRight,
  Bell,
  ChevronDown,
  Clock3,
  Construction,
  Heart,
  Map,
  MapPin,
  Menu,
  PackageOpen,
  Search,
  SlidersHorizontal,
  Star,
  Tractor,
  UserRound,
  Wrench,
  X,
  Plus,
  CheckCircle2,
  MessageCircle,
  Navigation,
  Phone,
  Flag,
} from 'lucide-react';
import {
  MarketplaceMap,
  type MarketplaceMapMarker,
} from '@/components/MarketplaceMap';
import {
  getRegionCenter,
  resolveCoordinates,
  type Coordinates,
} from '@/lib/geo';
type Listing = {
  id: number | string;
  title: string;
  price: string;
  unit?: string;
  location: string;
  region?: string;
  distance: string;
  category: string;
  type: 'Продам' | 'Сдам' | 'Окажу услугу';
  image: string;
  rating?: string;
  verified?: boolean;
  description?: string;
  owner?: string;
  phone?: string;
  available?: string;
  deposit?: string;
  sellerType?: 'Частное лицо' | 'Компания' | 'Магазин';
  delivery?: boolean;
  status?: 'active' | 'paused';
  latitude?: number;
  longitude?: number;
  mine?: boolean;
};
type RequestItem = {
  id: number | string;
  title: string;
  place: string;
  when: string;
  budget: string;
  responses: number;
  kind: 'agro' | 'build' | 'rent' | 'recycle';
  region?: string;
  owner?: string;
  status?: 'open' | 'closed';
  mine?: boolean;
};
type ResponseItem = {
  id: string;
  requestId: string;
  price: string;
  message: string;
  owner: string;
  mine?: boolean;
};
type ActivityItem = {
  id: string;
  kind: 'response' | 'booking';
  title: string;
  description: string;
  createdAt: number;
};
type BookingItem = {
  id: string;
  listingId: string;
  listingTitle: string;
  dateFrom: string;
  dateTo: string;
  contactPhone: string;
  counterparty: string;
  delivery: boolean;
  comment: string;
  status: 'pending' | 'accepted' | 'declined';
  incoming: boolean;
};
type ReportTarget = {
  type: 'listing' | 'request';
  id: string;
  title: string;
};
type SubmitFormEvent = {
  preventDefault: () => void;
  currentTarget: HTMLFormElement;
};
const fieldText = (data: FormData, key: string, fallback = '') => {
  const value = data.get(key);
  return typeof value === 'string' ? value : fallback;
};
const apiError = async (response: Response) => {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error || 'Не удалось сохранить изменения';
  } catch {
    return 'Не удалось сохранить изменения';
  }
};
const isDemoListing = (id: Listing['id']) => {
  const numericId = Number(id);
  return Number.isFinite(numericId) && numericId < 1000;
};
const isDemoRequest = (id: RequestItem['id']) => {
  const numericId = Number(id);
  return Number.isFinite(numericId) && numericId < 10_000;
};
const formatActivityDate = (timestamp: number) =>
  new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
const formatBookingDate = (date: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${date}T12:00:00`));
const listings: Listing[] = [
  {
    id: 1,
    title: 'Вспашка полей трактором МТЗ-82',
    price: '18 000 ₸',
    unit: '/ га',
    location: 'Талдыкорган',
    distance: '3,2 км',
    category: 'Сельхозуслуги',
    type: 'Окажу услугу',
    image:
      'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=900&q=80',
    rating: '4.9',
    verified: true,
    owner: 'Руслан',
    phone: '+7 777 221 48 90',
    available: 'Свободен 2–7 сентября',
    description:
      'Вспашка, боронование и подготовка поля. Выезд по области Жетісу до 80 км.',
  },
  {
    id: 2,
    title: 'Перфоратор Bosch GBH 2-26',
    price: '3 500 ₸',
    unit: '/ сутки',
    location: 'мкр. Каратал',
    distance: '2,1 км',
    category: 'Инструменты',
    type: 'Сдам',
    image:
      'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=900&q=80',
    rating: '4.8',
    owner: 'Арман',
    phone: '+7 701 884 13 02',
    available: 'Свободен 29 августа – 4 сентября',
    deposit: 'Залог 25 000 ₸',
    description:
      'Комплект с кейсом и тремя бурами. Можно забрать сегодня или заказать доставку по городу.',
  },
  {
    id: 3,
    title: 'Кирпич облицовочный, остаток 860 шт.',
    price: '95 ₸',
    unit: '/ шт.',
    location: 'Еркин',
    distance: '8,4 км',
    category: 'Стройматериалы',
    type: 'Продам',
    image:
      'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 4,
    title: 'Мини-экскаватор с оператором',
    price: '12 000 ₸',
    unit: '/ час',
    location: 'Талдыкорган',
    distance: '5,7 км',
    category: 'Спецтехника',
    type: 'Окажу услугу',
    image:
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80',
    rating: '5.0',
    verified: true,
    owner: 'Даурен',
    phone: '+7 747 603 80 11',
    available: 'Ближайшее окно — завтра с 10:00',
    description:
      'Котлованы, септики, траншеи и планировка участка. Минимальный заказ — 3 часа.',
  },
  {
    id: 5,
    title: 'Бетономешалка 180 л',
    price: '5 000 ₸',
    unit: '/ сутки',
    location: 'мкр. Жастар',
    distance: '1,8 км',
    category: 'Оборудование',
    type: 'Сдам',
    image:
      'https://images.unsplash.com/photo-1580901369227-308f6f40bdeb?auto=format&fit=crop&w=900&q=80',
    rating: '4.7',
    owner: 'Нуржан',
    phone: '+7 705 440 55 27',
    available: 'Свободна на выходные',
    deposit: 'Залог 30 000 ₸',
    description:
      'Исправная бетономешалка 180 л. Самовывоз или доставка по договорённости.',
  },
  {
    id: 6,
    title: 'Профлист С-21, 24 листа',
    price: '132 000 ₸',
    location: 'Уштобе',
    distance: '42 км',
    category: 'Стройматериалы',
    type: 'Продам',
    image:
      'https://images.unsplash.com/photo-1531835551805-16d864c8d311?auto=format&fit=crop&w=900&q=80',
  },
];
const nationalListings: Listing[] = [
  {
    id: 101,
    title: 'Уборка пшеницы комбайном Claas',
    price: '25 000 ₸',
    unit: '/ га',
    location: 'Костанай',
    region: 'Костанайская область',
    distance: '12 км',
    category: 'Сельхозуслуги',
    type: 'Окажу услугу',
    image: listings[0].image,
    rating: '4.9',
    verified: true,
    owner: 'Серик Агро',
    phone: '+7 702 458 11 90',
    available: 'Свободен 5–18 сентября',
    sellerType: 'Компания',
    description:
      'Уборка зерновых двумя комбайнами, собственная доставка техники по району.',
  },
  {
    id: 102,
    title: 'Пресс-подборщик, сенокос и тюкование',
    price: '1 200 ₸',
    unit: '/ тюк',
    location: 'Кокшетау',
    region: 'Акмолинская область',
    distance: '18 км',
    category: 'Сельхозуслуги',
    type: 'Окажу услугу',
    image: listings[0].image,
    rating: '4.8',
    owner: 'Ерлан',
    phone: '+7 775 662 90 04',
    available: 'Выезд в течение двух дней',
    description:
      'Сенокос, валкование и прессование сена. Радиус выезда 120 км.',
  },
  {
    id: 103,
    title: 'Генератор 7 кВт с доставкой',
    price: '11 000 ₸',
    unit: '/ сутки',
    location: 'Астана',
    region: 'Астана',
    distance: '4,6 км',
    category: 'Оборудование',
    type: 'Сдам',
    image: listings[4].image,
    rating: '4.9',
    verified: true,
    owner: 'RentPro Astana',
    phone: '+7 707 190 70 70',
    available: 'Свободен сегодня',
    deposit: 'Залог 60 000 ₸',
    sellerType: 'Компания',
    delivery: true,
    description:
      'Бензиновый генератор, кабели и доставка по городу. Проверка при получении.',
  },
  {
    id: 104,
    title: 'Проектор Full HD и экран 120″',
    price: '8 000 ₸',
    unit: '/ сутки',
    location: 'Алматы',
    region: 'Алматы',
    distance: '2,9 км',
    category: 'Электроника',
    type: 'Сдам',
    image: listings[1].image,
    rating: '4.7',
    owner: 'AlmaRent',
    phone: '+7 747 220 11 02',
    available: 'Свободен 30 августа – 6 сентября',
    deposit: 'Залог 50 000 ₸',
    sellerType: 'Компания',
    delivery: true,
    description:
      'Комплект для презентаций и мероприятий: проектор, экран, стойка, HDMI.',
  },
  {
    id: 105,
    title: 'Остаток партии ламината, 18 пачек',
    price: '118 000 ₸',
    location: 'Шымкент',
    region: 'Шымкент',
    distance: '6,1 км',
    category: 'Стройматериалы',
    type: 'Продам',
    image: listings[2].image,
    verified: true,
    owner: 'Склад №7',
    phone: '+7 701 330 41 17',
    sellerType: 'Магазин',
    delivery: true,
    description:
      'Нераспроданный остаток партии, класс 33. Цена на 38% ниже первоначальной.',
  },
  {
    id: 106,
    title: 'Сдам пастбище на сезон, 420 га',
    price: 'Договорная',
    location: 'Семей',
    region: 'Область Абай',
    distance: '38 км',
    category: 'Пастбища',
    type: 'Сдам',
    image: listings[0].image,
    owner: 'Нурлан',
    phone: '+7 708 114 65 30',
    available: 'Сентябрь – ноябрь',
    description:
      'Вода и подъезд для грузового транспорта. Подходит для КРС и лошадей.',
  },
  {
    id: 107,
    title: 'Сено в тюках, урожай 2026',
    price: '1 100 ₸',
    unit: '/ тюк',
    location: 'Тараз',
    region: 'Жамбылская область',
    distance: '14 км',
    category: 'Корма и сено',
    type: 'Продам',
    image: listings[0].image,
    rating: '4.6',
    owner: 'КХ Береке',
    phone: '+7 777 091 38 22',
    sellerType: 'Компания',
    delivery: true,
    description: 'Люцерна, сухое хранение. От 50 тюков возможна доставка.',
  },
  {
    id: 108,
    title: 'Кирпич красный, остаток 1 700 шт.',
    price: '88 ₸',
    unit: '/ шт.',
    location: 'Актобе',
    region: 'Актюбинская область',
    distance: '9,5 км',
    category: 'Стройматериалы',
    type: 'Продам',
    image: listings[2].image,
    owner: 'Марат',
    phone: '+7 705 671 82 44',
    delivery: false,
    description:
      'Остаток после строительства дома. Самовывоз, помощь с погрузкой.',
  },
  {
    id: 109,
    title: 'Шатёр 6×12, столы и 80 стульев',
    price: '65 000 ₸',
    unit: '/ сутки',
    location: 'Атырау',
    region: 'Атырауская область',
    distance: '7,3 км',
    category: 'Для мероприятий',
    type: 'Сдам',
    image: listings[4].image,
    rating: '4.8',
    owner: 'Event Atyrau',
    phone: '+7 701 824 55 66',
    available: 'Свободно на ближайшие выходные',
    sellerType: 'Компания',
    delivery: true,
    description: 'Монтаж, демонтаж и доставка входят в стоимость по городу.',
  },
];
const defaultListings = [
  ...listings.map((x) => ({ ...x, region: 'Область Жетісу' as const })),
  ...nationalListings,
];
const kzRegions = [
  'Весь Казахстан',
  'Астана',
  'Алматы',
  'Шымкент',
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
];
const initialRequests: RequestItem[] = [
  {
    id: 1428,
    title: 'Нужен комбайн убрать 70 га пшеницы',
    place: 'Коксуский район, Жетісу',
    when: 'до 8 сентября',
    budget: 'Договорная',
    responses: 4,
    kind: 'agro',
    region: 'Область Жетісу',
  },
  {
    id: 1429,
    title: 'Ищу манипулятор для доставки кирпича',
    place: 'Талдыкорган → Еркин',
    when: 'завтра',
    budget: 'до 35 000 ₸',
    responses: 7,
    kind: 'build',
    region: 'Область Жетісу',
  },
  {
    id: 1430,
    title: 'Нужен генератор 5–7 кВт на выходные',
    place: 'Текели',
    when: 'на 2 дня',
    budget: 'до 18 000 ₸',
    responses: 2,
    kind: 'rent',
    region: 'Область Жетісу',
  },
  {
    id: 1431,
    title: 'Есть 600 кг картона — кто вывезет дороже?',
    place: 'Алматы, Алатауский район',
    when: 'на этой неделе',
    budget: 'Предлагайте цену',
    responses: 6,
    kind: 'recycle',
    region: 'Алматы',
  },
];
const recyclePrices = [
  { name: 'Картон', price: '55 ₸/кг', trend: '+4%', icon: '📦' },
  { name: 'PET-пластик', price: '90 ₸/кг', trend: '+7%', icon: '♻️' },
  { name: 'Чёрный металл', price: '115 ₸/кг', trend: '−2%', icon: '🔩' },
  { name: 'Европаллет', price: '1 700 ₸/шт.', trend: '+3%', icon: '🪵' },
];
const aboutContent = {
  ru: {
    eyebrow: 'О ПРИЛОЖЕНИИ',
    title: 'Один сервис — три способа решить задачу',
    lead: 'Qoldan объединяет технику, аренду и материалы в одной местной экосистеме. Выберите направление, чтобы узнать, как оно работает.',
    result: 'Всё связано внутри Qoldan',
    resultText:
      'Строите дом? Купите остатки материалов, арендуйте бетономешалку, закажите экскаватор, а после стройки продайте лишнее — в одном сервисе.',
    items: [
      {
        title: 'Сельхозтехника и услуги',
        short: 'Техника и исполнители для хозяйства',
        text: 'Здесь люди находят тракторы, комбайны, экскаваторы, грузовики и другую технику вместе с услугами.',
        example:
          'Например, фермер указывает место, дату и объём работы для вспашки 20 гектаров, а владельцы техники предлагают свою цену.',
        benefit:
          'Больше не нужно искать трактористов по знакомым, чатам и разным объявлениям.',
      },
      {
        title: 'Аренда вещей и оборудования',
        short: 'Нужная вещь на нужный срок',
        text: 'Люди сдают и арендуют то, что нет смысла покупать ради одного использования: инструменты, генераторы, камеры и оборудование для мероприятий.',
        example:
          'Человек видит, что есть рядом, сколько стоит аренда и на какие даты вещь свободна.',
        benefit: 'Отдельный удобный маркетплейс, созданный именно для аренды.',
      },
      {
        title: 'Стройматериалы и остатки',
        short: 'Продать лишнее, купить дешевле',
        text: 'После ремонта и стройки остаются кирпичи, плитка, доски, трубы, утеплитель и смеси. Здесь их можно быстро выставить и найти рядом.',
        example:
          'Покупатель экономит относительно магазина, а владелец освобождает место и возвращает часть денег.',
        benefit:
          'Позже подключим магазины и склады с остатками партий и товарами со скидкой.',
      },
    ],
  },
  kk: {
    eyebrow: 'ҚОСЫМША ТУРАЛЫ',
    title: 'Бір сервис — мәселені шешудің үш жолы',
    lead: 'Qoldan техника, жалға беру және материалдарды бір жергілікті экожүйеге біріктіреді. Қалай жұмыс істейтінін көру үшін бағытты таңдаңыз.',
    result: 'Барлығы Qoldan ішінде байланысқан',
    resultText:
      'Үй салып жатырсыз ба? Қалған материалдарды сатып алыңыз, бетон араластырғышты жалға алыңыз, экскаваторға тапсырыс беріңіз, кейін артығын осы сервисте сатыңыз.',
    items: [
      {
        title: 'Ауыл шаруашылығы техникасы мен қызметтер',
        short: 'Шаруашылыққа арналған техника мен мамандар',
        text: 'Мұнда трактор, комбайн, экскаватор, жүк көлігі және басқа техниканы қызметімен бірге табуға болады.',
        example:
          'Мысалы, фермер 20 гектар жерді жырту үшін орнын, күнін және жұмыс көлемін көрсетеді, ал техника иелері өз бағасын ұсынады.',
        benefit:
          'Тракторшыны таныстардан, чаттардан және әртүрлі хабарландырулардан іздеудің қажеті жоқ.',
      },
      {
        title: 'Заттар мен жабдықтарды жалға алу',
        short: 'Қажетті зат — қажетті мерзімге',
        text: 'Бір рет пайдалану үшін сатып алудың қажеті жоқ құралдарды, генераторларды, камералар мен іс-шара жабдықтарын жалға беруге және алуға болады.',
        example:
          'Адам жақын жердегі ұсыныстарды, бағасын және бос күндерін бірден көреді.',
        benefit: 'Арнайы жалға алуға арналған ыңғайлы маркетплейс.',
      },
      {
        title: 'Құрылыс материалдары мен қалдықтар',
        short: 'Артығын сату, арзанырақ сатып алу',
        text: 'Жөндеу мен құрылыстан кейін қалған кірпіш, тақтай, құбыр, плитка және қоспаларды тез жариялап, жақын жерден табуға болады.',
        example:
          'Сатып алушы дүкеннен арзанырақ алады, ал сатушы орнын босатып, қаражатының бір бөлігін қайтарады.',
        benefit:
          'Кейін жеңілдік тауарлары мен партия қалдықтары бар дүкендер мен қоймаларды қосамыз.',
      },
    ],
  },
  en: {
    eyebrow: 'ABOUT THE APP',
    title: 'One service — three ways to get things done',
    lead: 'Qoldan brings machinery, rentals, and materials into one local ecosystem. Choose a direction to see how it works.',
    result: 'Everything connects inside Qoldan',
    resultText:
      'Building a house? Buy leftover materials, rent a concrete mixer, book an excavator, then sell what remains — all in one service.',
    items: [
      {
        title: 'Agricultural machinery and services',
        short: 'Equipment and operators for local work',
        text: 'Find tractors, combines, excavators, trucks, and other machinery together with the people who operate them.',
        example:
          'A farmer enters the location, date, and scope for ploughing 20 hectares, and equipment owners offer their price.',
        benefit:
          'No more searching through acquaintances, chats, and scattered listings.',
      },
      {
        title: 'Equipment and item rental',
        short: 'The right item for the right amount of time',
        text: 'Rent out or borrow things that make no sense to buy for one use: tools, generators, cameras, and event equipment.',
        example:
          'See what is nearby, how much it costs, and which dates are available.',
        benefit:
          'A focused, convenient marketplace designed specifically for rentals.',
      },
      {
        title: 'Building materials and leftovers',
        short: 'Sell the extra, buy for less',
        text: 'List and discover nearby bricks, tiles, timber, pipes, insulation, cement, and other materials left after a project.',
        example:
          'Buyers save compared with stores while sellers clear space and recover part of their costs.',
        benefit:
          'Later, stores and warehouses can offer surplus batches and discounted stock.',
      },
    ],
  },
} as const;
export default function Home() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('Все');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [mapOpen, setMapOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [aboutLang, setAboutLang] = useState<'ru' | 'kk' | 'en'>('ru');
  const [aboutTopic, setAboutTopic] = useState(0);
  const [allListings, setAllListings] = useState<Listing[]>(defaultListings);
  const [allRequests, setAllRequests] =
    useState<RequestItem[]>(initialRequests);
  const [allResponses, setAllResponses] = useState<ResponseItem[]>([]);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [viewerName, setViewerName] = useState('Пользователь Qoldan');
  const [serverConnected, setServerConnected] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [modal, setModal] = useState<
    | 'listing'
    | 'request'
    | 'detail'
    | 'response'
    | 'profile'
    | 'notifications'
    | 'info'
    | 'booking'
    | 'bookings'
    | 'report'
    | 'regions'
    | 'recycle'
    | null
  >(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(
    null,
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('Все категории');
  const [maxDistance, setMaxDistance] = useState(100);
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [myOnly, setMyOnly] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('Весь Казахстан');
  const [deliveryOnly, setDeliveryOnly] = useState(false);
  const [companyOnly, setCompanyOnly] = useState(false);
  const [listingImage, setListingImage] = useState('');
  const [listingCoords, setListingCoords] = useState<Coordinates | null>(null);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [requestKind, setRequestKind] = useState<'all' | RequestItem['kind']>(
    'all',
  );
  const [requestOwnerOnly, setRequestOwnerOnly] = useState(false);
  const [requestSeed, setRequestSeed] = useState('');
  const [requestSeedKind, setRequestSeedKind] =
    useState<RequestItem['kind']>('agro');
  const about = aboutContent[aboutLang];
  const aboutIcons = [Tractor, Wrench, PackageOpen];
  const viewerInitials = viewerName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  const selectedResponses = selectedRequest
    ? allResponses.filter(
        (response) => response.requestId === String(selectedRequest.id),
      )
    : [];
  const activeFilterCount = [
    categoryFilter !== 'Все категории',
    maxDistance < 100 && selectedRegion !== 'Весь Казахстан',
    deliveryOnly,
    companyOnly,
    myOnly,
  ].filter(Boolean).length;
  useEffect(() => {
    let active = true;
    const loadMarketplace = async () => {
      try {
        const response = await fetch('/api/bootstrap', { cache: 'no-store' });
        if (!response.ok) throw new Error(await apiError(response));
        const data = (await response.json()) as {
          viewer: { displayName: string };
          listings: Listing[];
          requests: RequestItem[];
          favorites: string[];
          responses: ResponseItem[];
          bookings: BookingItem[];
          activities: ActivityItem[];
        };
        if (!active) return;
        setAllListings([...data.listings, ...defaultListings]);
        setAllRequests([...data.requests, ...initialRequests]);
        setFavorites(data.favorites.map(String));
        setAllResponses(data.responses);
        setBookings(data.bookings);
        setActivities(data.activities);
        setViewerName(data.viewer.displayName);
        setServerConnected(true);
      } catch {
        if (!active) return;
        setServerConnected(false);
      } finally {
        if (active) setStorageReady(true);
      }
    };
    void loadMarketplace();
    const refreshTimer = window.setInterval(() => {
      void loadMarketplace();
    }, 45_000);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);
  useEffect(() => {
    if (!modal) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setModal(null);
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [modal]);
  const filtered = useMemo(
    () =>
      allListings.filter(
        (i) =>
          (i.title.toLowerCase().includes(query.toLowerCase()) ||
            i.category.toLowerCase().includes(query.toLowerCase()) ||
            i.location.toLowerCase().includes(query.toLowerCase()) ||
            i.region?.toLowerCase().includes(query.toLowerCase()) ||
            i.description?.toLowerCase().includes(query.toLowerCase())) &&
          (type === 'Все' || i.type === type) &&
          (categoryFilter === 'Все категории' ||
            i.category === categoryFilter) &&
          (selectedRegion === 'Весь Казахстан' ||
            i.region === selectedRegion) &&
          (selectedRegion === 'Весь Казахстан' ||
            parseFloat(i.distance.replace(',', '.')) <= maxDistance) &&
          (!favoriteOnly || favorites.includes(String(i.id))) &&
          (!myOnly || i.mine) &&
          (myOnly || i.status !== 'paused') &&
          (!deliveryOnly || i.delivery) &&
          (!companyOnly ||
            i.sellerType === 'Компания' ||
            i.sellerType === 'Магазин'),
      ),
    [
      allListings,
      query,
      type,
      categoryFilter,
      maxDistance,
      favoriteOnly,
      myOnly,
      favorites,
      selectedRegion,
      deliveryOnly,
      companyOnly,
    ],
  );
  const visibleRequests = useMemo(
    () =>
      allRequests.filter(
        (request) =>
          (requestKind === 'all' || request.kind === requestKind) &&
          (requestOwnerOnly ||
            selectedRegion === 'Весь Казахстан' ||
            request.region === selectedRegion) &&
          (!requestOwnerOnly || request.mine) &&
          (requestOwnerOnly || request.status !== 'closed'),
      ),
    [allRequests, requestKind, requestOwnerOnly, selectedRegion],
  );
  const toggleFavorite = async (id: Listing['id']) => {
    const listingId = String(id);
    const active = !favorites.includes(listingId);
    setFavorites((previous) =>
      active
        ? [...previous, listingId]
        : previous.filter((item) => item !== listingId),
    );
    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ listingId, active }),
      });
      if (!response.ok) throw new Error(await apiError(response));
    } catch (error) {
      setFavorites((previous) =>
        active
          ? previous.filter((item) => item !== listingId)
          : [...previous, listingId],
      );
      notify(
        error instanceof Error
          ? error.message
          : 'Не удалось обновить избранное',
      );
    }
  };
  const notify = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(''), 2600);
  };
  const openAddListing = () => {
    setListingImage('');
    setListingCoords(null);
    setModal('listing');
  };
  const openRequestForm = (seed = '', kind: RequestItem['kind'] = 'agro') => {
    setRequestSeed(seed);
    setRequestSeedKind(kind);
    setModal('request');
  };
  const handleListingImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setListingImage('');
      return;
    }
    if (file.size > 5_000_000) {
      e.target.value = '';
      notify('Фото слишком большое — выберите файл до 5 МБ');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const source = new Image();
      source.onload = () => {
        const maxSide = 1100;
        const scale = Math.min(
          1,
          maxSide / Math.max(source.width, source.height),
        );
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(source.width * scale);
        canvas.height = Math.round(source.height * scale);
        const context = canvas.getContext('2d');
        if (!context) return;
        context.drawImage(source, 0, 0, canvas.width, canvas.height);
        let quality = 0.78;
        let compressed = canvas.toDataURL('image/jpeg', quality);
        while (compressed.length > 1_100_000 && quality > 0.46) {
          quality -= 0.08;
          compressed = canvas.toDataURL('image/jpeg', quality);
        }
        if (compressed.length > 1_100_000) {
          notify('Не удалось достаточно сжать фото — выберите другое');
          e.target.value = '';
          return;
        }
        setListingImage(compressed);
      };
      source.onerror = () => notify('Не удалось открыть фотографию');
      source.src = typeof reader.result === 'string' ? reader.result : '';
    };
    reader.readAsDataURL(file);
  };
  const captureListingLocation = () => {
    if (!navigator.geolocation) {
      notify('Геопозиция не поддерживается этим устройством');
      return;
    }
    setSubmitting('geolocation');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = Number(position.coords.latitude.toFixed(6));
        const longitude = Number(position.coords.longitude.toFixed(6));
        if (
          latitude < 40 ||
          latitude > 56 ||
          longitude < 45 ||
          longitude > 88
        ) {
          notify('Точка находится за пределами Казахстана');
          setSubmitting(null);
          return;
        }
        setListingCoords({ latitude, longitude });
        setSubmitting(null);
        notify('Точная точка сохранится вместе с объявлением');
      },
      () => {
        setSubmitting(null);
        notify('Не удалось получить геопозицию — укажите город вручную');
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  };
  const openListing = (item: Listing) => {
    setSelectedListing(item);
    setModal('detail');
  };
  const openReport = (target: ReportTarget) => {
    setReportTarget(target);
    setModal('report');
  };
  const mapMarkers = useMemo<MarketplaceMapMarker[]>(
    () =>
      filtered.slice(0, 100).map((item) => {
        const coordinates = resolveCoordinates(item);
        return {
          id: String(item.id),
          title: item.title,
          price: `${item.price}${item.unit ? ` ${item.unit}` : ''}`,
          type: item.type,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        };
      }),
    [filtered],
  );
  const selectMapListing = (id: string) => {
    const item = filtered.find((listing) => String(listing.id) === id);
    if (item) openListing(item);
  };
  const exploreDirection = (label: string) => {
    setQuery('');
    setType('Все');
    setCategoryFilter('Все категории');
    setDeliveryOnly(false);
    setCompanyOnly(false);
    setFavoriteOnly(false);
    setMyOnly(false);
    if (label === 'Услуги' || label === 'Рабочие услуги') {
      setType('Окажу услугу');
    } else if (label === 'Аренда техники') {
      setType('Сдам');
    } else if (label === 'Доставка') {
      setDeliveryOnly(true);
    } else if (label === 'Техника') {
      setQuery('техник');
    } else if (label === 'Остатки партий') {
      setQuery('остат');
    } else if (label === 'Перевозка скота') {
      setQuery('перевоз');
    } else if (label === 'Генераторы') {
      setQuery('генератор');
    } else {
      setCategoryFilter(label);
    }
    document.querySelector('#catalog')?.scrollIntoView({ behavior: 'smooth' });
  };
  const addListing = async (e: SubmitFormEvent) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (!listingImage) {
      notify('Добавьте фотографию объявления');
      return;
    }
    setSubmitting('listing');
    try {
      const imageBlob = await (await fetch(listingImage)).blob();
      const uploadData = new FormData();
      uploadData.set('image', imageBlob, 'qoldan-photo.jpg');
      const uploadResponse = await fetch('/api/uploads', {
        method: 'POST',
        body: uploadData,
      });
      if (!uploadResponse.ok) throw new Error(await apiError(uploadResponse));
      const upload = (await uploadResponse.json()) as { url: string };
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: fieldText(f, 'title'),
          price: `${fieldText(f, 'price')} ₸`,
          unit: fieldText(f, 'unit'),
          location: fieldText(f, 'location'),
          region: fieldText(f, 'region'),
          category: fieldText(f, 'category'),
          type: fieldText(f, 'type'),
          imageUrl: upload.url,
          phone: fieldText(f, 'phone'),
          available: fieldText(f, 'available', 'Доступно по договорённости'),
          description: fieldText(
            f,
            'description',
            'Новое предложение от пользователя Qoldan.',
          ),
          sellerType: fieldText(f, 'sellerType'),
          delivery: f.get('delivery') === 'on',
          latitude: listingCoords?.latitude,
          longitude: listingCoords?.longitude,
        }),
      });
      if (!response.ok) throw new Error(await apiError(response));
      const data = (await response.json()) as { listing: Listing };
      setAllListings((previous) => [data.listing, ...previous]);
      setListingImage('');
      setServerConnected(true);
      setModal(null);
      notify('Объявление опубликовано и доступно с других устройств');
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Не удалось опубликовать объявление',
      );
    } finally {
      setSubmitting(null);
    }
  };
  const addRequest = async (e: SubmitFormEvent) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSubmitting('request');
    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: fieldText(f, 'title'),
          place: fieldText(f, 'place'),
          when: fieldText(f, 'when'),
          budget: fieldText(f, 'budget', 'Договорная'),
          kind: fieldText(f, 'kind'),
          region: fieldText(f, 'region'),
        }),
      });
      if (!response.ok) throw new Error(await apiError(response));
      const data = (await response.json()) as { request: RequestItem };
      setAllRequests((previous) => [data.request, ...previous]);
      setServerConnected(true);
      setModal(null);
      notify('Заявка опубликована — отклики будут общими для всех устройств');
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Не удалось опубликовать заявку',
      );
    } finally {
      setSubmitting(null);
    }
  };
  const sendResponse = async (e: SubmitFormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    const f = new FormData(e.currentTarget);
    setSubmitting('response');
    try {
      const response = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          price: fieldText(f, 'price'),
          message: fieldText(f, 'message'),
        }),
      });
      if (!response.ok) throw new Error(await apiError(response));
      const data = (await response.json()) as { response: ResponseItem };
      setAllResponses((previous) => [data.response, ...previous]);
      setAllRequests((previous) =>
        previous.map((item) =>
          item.id === selectedRequest.id
            ? { ...item, responses: item.responses + 1 }
            : item,
        ),
      );
      setModal(null);
      notify(`Отклик отправлен к заявке #${selectedRequest.id}`);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Не удалось отправить отклик',
      );
    } finally {
      setSubmitting(null);
    }
  };
  const updateListingStatus = async () => {
    if (!selectedListing?.mine) return;
    const status = selectedListing.status === 'paused' ? 'active' : 'paused';
    setSubmitting('listing-status');
    try {
      const response = await fetch('/api/listings/status', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ listingId: selectedListing.id, status }),
      });
      if (!response.ok) throw new Error(await apiError(response));
      setAllListings((previous) =>
        previous.map((item) =>
          String(item.id) === String(selectedListing.id)
            ? { ...item, status }
            : item,
        ),
      );
      setSelectedListing((previous) =>
        previous ? { ...previous, status } : previous,
      );
      notify(
        status === 'paused'
          ? 'Объявление поставлено на паузу и скрыто из общего каталога'
          : 'Объявление снова видно в общем каталоге',
      );
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Не удалось изменить объявление',
      );
    } finally {
      setSubmitting(null);
    }
  };
  const updateRequestStatus = async () => {
    if (!selectedRequest?.mine) return;
    const status = selectedRequest.status === 'closed' ? 'open' : 'closed';
    setSubmitting('request-status');
    try {
      const response = await fetch('/api/requests/status', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ requestId: selectedRequest.id, status }),
      });
      if (!response.ok) throw new Error(await apiError(response));
      setAllRequests((previous) =>
        previous.map((item) =>
          String(item.id) === String(selectedRequest.id)
            ? { ...item, status }
            : item,
        ),
      );
      setSelectedRequest((previous) =>
        previous ? { ...previous, status } : previous,
      );
      notify(
        status === 'closed'
          ? 'Заявка закрыта — новые отклики больше не принимаются'
          : 'Заявка снова открыта для предложений',
      );
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Не удалось изменить заявку',
      );
    } finally {
      setSubmitting(null);
    }
  };
  const addRecycleLot = async (e: SubmitFormEvent) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSubmitting('recycle');
    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: `${fieldText(f, 'amount')} ${fieldText(f, 'unit')} · ${fieldText(f, 'material')} — кто заберёт дороже?`,
          place: fieldText(f, 'place'),
          when: fieldText(f, 'when'),
          budget: 'Приёмщики делают ставки',
          kind: 'recycle',
          region: fieldText(f, 'region'),
        }),
      });
      if (!response.ok) throw new Error(await apiError(response));
      const data = (await response.json()) as { request: RequestItem };
      setAllRequests((previous) => [data.request, ...previous]);
      setModal(null);
      notify('Партия опубликована на бирже вторсырья');
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Не удалось опубликовать партию',
      );
    } finally {
      setSubmitting(null);
    }
  };
  const submitBooking = async (e: SubmitFormEvent) => {
    e.preventDefault();
    if (!selectedListing) return;
    const data = new FormData(e.currentTarget);
    if (fieldText(data, 'dateTo') < fieldText(data, 'dateFrom')) {
      notify('Дата возврата не может быть раньше даты начала');
      return;
    }
    setSubmitting('booking');
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          listingId: selectedListing.id,
          dateFrom: fieldText(data, 'dateFrom'),
          dateTo: fieldText(data, 'dateTo'),
          customerPhone: fieldText(data, 'customerPhone'),
          delivery: data.get('delivery') === 'on',
          comment: fieldText(data, 'comment'),
        }),
      });
      if (!response.ok) throw new Error(await apiError(response));
      const result = (await response.json()) as { booking: BookingItem };
      setBookings((previous) => [result.booking, ...previous]);
      setModal(null);
      notify('Запрос на бронирование отправлен владельцу');
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Не удалось отправить запрос',
      );
    } finally {
      setSubmitting(null);
    }
  };
  const updateBookingStatus = async (
    bookingId: string,
    status: 'accepted' | 'declined',
  ) => {
    setSubmitting(`booking-status-${bookingId}`);
    try {
      const response = await fetch('/api/bookings/status', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ bookingId, status }),
      });
      if (!response.ok) throw new Error(await apiError(response));
      setBookings((previous) =>
        previous.map((booking) =>
          booking.id === bookingId ? { ...booking, status } : booking,
        ),
      );
      notify(
        status === 'accepted'
          ? 'Бронирование подтверждено — арендатор увидит решение'
          : 'Запрос на бронирование отклонён',
      );
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Не удалось изменить бронирование',
      );
    } finally {
      setSubmitting(null);
    }
  };
  const submitReport = async (e: SubmitFormEvent) => {
    e.preventDefault();
    if (!reportTarget) return;
    const data = new FormData(e.currentTarget);
    setSubmitting('report');
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          targetType: reportTarget.type,
          targetId: reportTarget.id,
          reason: fieldText(data, 'reason'),
          description: fieldText(data, 'description'),
        }),
      });
      if (!response.ok) throw new Error(await apiError(response));
      setModal(null);
      setReportTarget(null);
      notify('Спасибо — сообщение отправлено на проверку');
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Не удалось отправить жалобу',
      );
    } finally {
      setSubmitting(null);
    }
  };
  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top">
          <span className="brandmark">
            <Tractor size={21} />
          </span>
          <span>Qoldan</span>
          <em>КАЗАХСТАН</em>
        </a>
        <nav className={menuOpen ? 'nav open' : 'nav'}>
          <a
            href="#catalog"
            onClick={() => {
              setMenuOpen(false);
              setFavoriteOnly(false);
              setMyOnly(false);
            }}
          >
            Объявления
          </a>
          <a
            href="#requests"
            onClick={() => {
              setMenuOpen(false);
              setRequestOwnerOnly(false);
            }}
          >
            Мне нужно
          </a>
          <a href="#recycle" onClick={() => setMenuOpen(false)}>
            Вторсырьё
          </a>
          <a href="#about" onClick={() => setMenuOpen(false)}>
            О приложении
          </a>
        </nav>
        <div className="header-actions">
          <button
            className="icon-button hide-mobile"
            onClick={() => setModal('notifications')}
            aria-label="Уведомления"
          >
            <Bell size={19} />
            {activities.length > 0 && <i />}
          </button>
          <button
            className="profile hide-mobile"
            onClick={() => setModal('profile')}
          >
            <span>{viewerInitials || 'Q'}</span>
            <b>{viewerName}</b>
            <ChevronDown size={15} />
          </button>
          <button className="primary-button" onClick={openAddListing}>
            <Plus size={18} /> Подать объявление
          </button>
          <button
            className="icon-button mobile-menu"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <section className="hero" id="top">
        <div className="hero-copy">
          <span className="eyebrow">
            <MapPin size={14} /> Ресурсы, аренда и услуги по всему Казахстану
          </span>
          <h1>
            Всё нужное для дела — <span>рядом</span>
          </h1>
          <p>
            Найдите технику, возьмите оборудование в аренду или купите материалы
            рядом — в любом регионе страны.
          </p>
          <div className="searchbox">
            <Search size={22} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Трактор, кирпич, генератор или город"
            />
            <button className="location" onClick={() => setModal('regions')}>
              <MapPin size={17} /> {selectedRegion} <ChevronDown size={15} />
            </button>
            <button
              className="search-button"
              onClick={() => {
                setFavoriteOnly(false);
                setMyOnly(false);
                document
                  .querySelector('#catalog')
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Найти
            </button>
          </div>
          <div className="quick-search">
            <span>Часто ищут:</span>
            {['Комбайн', 'Перфоратор', 'Кирпич', 'Сено', 'Проектор'].map(
              (x) => (
                <button
                  key={x}
                  onClick={() => {
                    setQuery(x);
                    setFavoriteOnly(false);
                    setMyOnly(false);
                    document
                      .querySelector('#catalog')
                      ?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  {x}
                </button>
              ),
            )}
          </div>
        </div>
        <div className="hero-art">
          <img
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=85"
            alt="Поля Казахстана"
          />
          <div className="float-card fc-one">
            <span>
              <Map size={20} />
            </span>
            <div>
              <b>Весь Казахстан</b>
              <small>20 регионов и городов в одном сервисе</small>
            </div>
          </div>
          <div className="float-card fc-two">
            <span>
              <CheckCircle2 size={20} />
            </span>
            <div>
              <b>Предложения рядом</b>
              <small>Частные лица и компании</small>
            </div>
          </div>
        </div>
      </section>
      <section className="categories wrap">
        <div className="section-head">
          <div>
            <span className="kicker">КАТЕГОРИИ</span>
            <h2>Что нужно сегодня?</h2>
          </div>
          <a href="#catalog">
            Смотреть всё <ArrowRight size={17} />
          </a>
        </div>
        <div className="category-grid">
          {[
            [
              'green',
              Tractor,
              'Сельхозтехника|и услуги',
              'Вспашка, уборка, перевозка, аренда техники',
              'Открыть раздел',
              'Сельхоз',
            ],
            [
              'orange',
              Wrench,
              'Аренда инструментов|и оборудования',
              'От дрели до генератора — берите на нужный срок',
              'Открыть раздел',
              'Инструменты',
            ],
            [
              'sand',
              PackageOpen,
              'Остатки и|стройматериалы',
              'Кирпич, плитка, смеси и другие остатки рядом',
              'Открыть раздел',
              'Стройматериалы',
            ],
          ].map((c, i) => {
            const Icon = c[1] as typeof Tractor;
            return (
              <button
                key={i}
                className={'category-card ' + (c[0] as string)}
                onClick={() => {
                  setQuery(c[5] as string);
                  document
                    .querySelector('#catalog')
                    ?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <span className="cat-icon">
                  <Icon />
                </span>
                <div>
                  <h3>
                    {(c[2] as string).split('|').map((t, j) => (
                      <span key={t}>
                        {t}
                        {j === 0 && <br />}
                      </span>
                    ))}
                  </h3>
                  <p>{c[3] as string}</p>
                  <b>
                    {c[4] as string} <ArrowRight size={16} />
                  </b>
                </div>
                <span className="cat-number">0{i + 1}</span>
              </button>
            );
          })}
        </div>
      </section>
      <section className="national-explorer">
        <div className="wrap">
          <div className="national-top">
            <div>
              <span className="kicker">КАРТА РЕСУРСОВ КАЗАХСТАНА</span>
              <h2>Одна площадка для всей страны</h2>
              <p>
                Выберите регион или направление — Qoldan покажет подходящие
                ресурсы, технику и исполнителей.
              </p>
            </div>
            <button onClick={() => setModal('regions')}>
              <MapPin /> {selectedRegion}
              <ChevronDown />
            </button>
          </div>
          <div className="region-quick">
            {[
              'Астана',
              'Алматы',
              'Шымкент',
              'Область Жетісу',
              'Костанайская область',
              'Атырауская область',
            ].map((r) => (
              <button
                key={r}
                className={selectedRegion === r ? 'active' : ''}
                onClick={() => {
                  setSelectedRegion(r);
                  document
                    .querySelector('#catalog')
                    ?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {r}
              </button>
            ))}
            <button onClick={() => setModal('regions')}>
              Все регионы и города <ArrowRight />
            </button>
          </div>
          <div className="direction-columns">
            <article>
              <div>
                <span>
                  <Tractor />
                </span>
                <b>Сельское хозяйство</b>
              </div>
              {[
                'Техника',
                'Услуги',
                'Корма и сено',
                'Зерно',
                'Пастбища',
                'Перевозка скота',
              ].map((x) => (
                <button key={x} onClick={() => exploreDirection(x)}>
                  {x}
                  <ArrowRight />
                </button>
              ))}
            </article>
            <article>
              <div>
                <span>
                  <Construction />
                </span>
                <b>Стройка и материалы</b>
              </div>
              {[
                'Стройматериалы',
                'Остатки партий',
                'Инструменты',
                'Аренда техники',
                'Рабочие услуги',
                'Доставка',
              ].map((x) => (
                <button key={x} onClick={() => exploreDirection(x)}>
                  {x}
                  <ArrowRight />
                </button>
              ))}
            </article>
            <article>
              <div>
                <span>
                  <Wrench />
                </span>
                <b>Аренда вещей</b>
              </div>
              {[
                'Инструменты',
                'Спецтехника',
                'Электроника',
                'Оборудование',
                'Для мероприятий',
                'Генераторы',
              ].map((x) => (
                <button key={x} onClick={() => exploreDirection(x)}>
                  {x}
                  <ArrowRight />
                </button>
              ))}
            </article>
          </div>
        </div>
      </section>
      <section className="catalog-section" id="catalog">
        <div className="wrap">
          <div className="section-head catalog-head">
            <div>
              <span className="kicker">
                {myOnly
                  ? 'ВАШИ ПРЕДЛОЖЕНИЯ'
                  : favoriteOnly
                    ? 'ВАШЕ ИЗБРАННОЕ'
                    : selectedRegion === 'Весь Казахстан'
                      ? 'ПРЕДЛОЖЕНИЯ ПО СТРАНЕ'
                      : 'ПРЕДЛОЖЕНИЯ В РЕГИОНЕ'}
              </span>
              <h2>
                {myOnly
                  ? 'Мои объявления'
                  : favoriteOnly
                    ? 'Сохранённые объявления'
                    : selectedRegion}
              </h2>
            </div>
            <div className="view-controls">
              <button
                className={!mapOpen ? 'active' : ''}
                onClick={() => setMapOpen(false)}
              >
                <Menu size={17} /> Список
              </button>
              <button
                className={mapOpen ? 'active' : ''}
                onClick={() => setMapOpen(true)}
              >
                <Map size={17} /> На карте
              </button>
            </div>
          </div>
          <div className="filter-row">
            <div className="pills">
              {['Все', 'Продам', 'Сдам', 'Окажу услугу'].map((x) => (
                <button
                  key={x}
                  className={type === x ? 'active' : ''}
                  onClick={() => setType(x)}
                >
                  {x}
                </button>
              ))}
            </div>
            <div className="filter-actions">
              {favoriteOnly && (
                <button
                  className="clear-favorite"
                  onClick={() => setFavoriteOnly(false)}
                >
                  <X size={14} /> Все объявления
                </button>
              )}
              {myOnly && (
                <button
                  className="clear-favorite"
                  onClick={() => setMyOnly(false)}
                >
                  <X size={14} /> Все объявления
                </button>
              )}
              <button
                className="filter-button"
                onClick={() => setFiltersOpen(!filtersOpen)}
              >
                <SlidersHorizontal size={17} /> Фильтры{' '}
                {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
              </button>
            </div>
          </div>
          {filtersOpen && (
            <div className="filter-panel national-filters">
              <label>
                Категория
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option>Все категории</option>
                  {[...new Set(allListings.map((x) => x.category))].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                Радиус: <b>{maxDistance} км</b>
                <input
                  type="range"
                  min="2"
                  max="100"
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(Number(e.target.value))}
                  disabled={selectedRegion === 'Весь Казахстан'}
                />
              </label>
              <label className="mini-check">
                <input
                  type="checkbox"
                  checked={deliveryOnly}
                  onChange={(e) => setDeliveryOnly(e.target.checked)}
                />{' '}
                С доставкой
              </label>
              <label className="mini-check">
                <input
                  type="checkbox"
                  checked={companyOnly}
                  onChange={(e) => setCompanyOnly(e.target.checked)}
                />{' '}
                Магазины и компании
              </label>
              <button
                onClick={() => {
                  setCategoryFilter('Все категории');
                  setMaxDistance(100);
                  setDeliveryOnly(false);
                  setCompanyOnly(false);
                  setMyOnly(false);
                }}
              >
                Сбросить
              </button>
            </div>
          )}
          {mapOpen ? (
            <MarketplaceMap
              markers={mapMarkers}
              fallbackCenter={getRegionCenter(selectedRegion)}
              onSelect={selectMapListing}
            />
          ) : (
            <div className="listing-grid">
              {filtered.map((item) => (
                <article className="listing-card" key={item.id}>
                  <button
                    className="listing-open"
                    onClick={() => openListing(item)}
                    aria-label={`Открыть объявление: ${item.title}`}
                  />
                  <div className="listing-image">
                    <img src={item.image} alt={item.title} />
                    <span
                      className={`type ${item.type === 'Продам' ? 'sale' : item.type === 'Сдам' ? 'rent' : 'service'}`}
                    >
                      {item.type}
                    </span>
                    {item.sellerType && (
                      <span className="seller-type">{item.sellerType}</span>
                    )}
                    {item.mine && item.status === 'paused' && (
                      <span className="status-chip paused">На паузе</span>
                    )}
                    <button
                      className={
                        favorites.includes(String(item.id))
                          ? 'heart active'
                          : 'heart'
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        void toggleFavorite(item.id);
                      }}
                      aria-label={
                        favorites.includes(String(item.id))
                          ? 'Удалить из избранного'
                          : 'Добавить в избранное'
                      }
                    >
                      <Heart
                        size={19}
                        fill={
                          favorites.includes(String(item.id))
                            ? 'currentColor'
                            : 'none'
                        }
                      />
                    </button>
                  </div>
                  <div className="listing-body">
                    <small>{item.category}</small>
                    <h3>{item.title}</h3>
                    <div className="price">
                      {item.price} <span>{item.unit}</span>
                    </div>
                    <div className="meta">
                      <span>
                        <MapPin size={14} />
                        {item.location} · {item.distance}
                      </span>
                      {item.rating && (
                        <span className="rating">
                          <Star size={14} fill="currentColor" /> {item.rating}
                        </span>
                      )}
                    </div>
                    {item.delivery && (
                      <div className="delivery-tag">
                        <Construction /> Есть доставка
                      </div>
                    )}
                    {item.verified && (
                      <div className="verified">
                        <CheckCircle2 size={14} /> Проверенный исполнитель
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
          {!mapOpen && filtered.length === 0 && (
            <div className="empty">
              <Search />
              <h3>Ничего не нашли</h3>
              <p>
                {myOnly
                  ? 'Ваши новые объявления появятся здесь после публикации.'
                  : favoriteOnly
                    ? 'Добавляйте объявления сердечком — они появятся здесь.'
                    : 'Попробуйте другой регион или сбросьте фильтры.'}
              </p>
              <button
                onClick={() => {
                  setQuery('');
                  setType('Все');
                  setCategoryFilter('Все категории');
                  setMaxDistance(100);
                  setFavoriteOnly(false);
                  setMyOnly(false);
                  setDeliveryOnly(false);
                  setCompanyOnly(false);
                  setSelectedRegion('Весь Казахстан');
                }}
              >
                Сбросить фильтры
              </button>
            </div>
          )}
          {!mapOpen && filtered.length > 0 && (
            <button
              className="more-button"
              onClick={() =>
                notify(`Показаны все предложения: ${selectedRegion}`)
              }
            >
              Показать ещё
            </button>
          )}
        </div>
      </section>
      <section className="requests wrap" id="requests">
        <div className="request-intro">
          <span className="kicker">НЕ НАШЛИ НУЖНОЕ?</span>
          <h2>Расскажите, что вам нужно</h2>
          <p>
            Оставьте заявку — владельцы техники и продавцы сами предложат цену.
            Это бесплатно.
          </p>
          <button className="dark-button" onClick={() => openRequestForm()}>
            <Plus size={18} /> Создать заявку
          </button>
          <div className="intro-stat">
            <b>{allRequests.length}</b>
            <span>
              примеров заявок и ваших публикаций
              <br />
              в текущей рабочей версии
            </span>
          </div>
        </div>
        <div className="request-list">
          <div className="request-list-head">
            <div>
              <h3>{requestOwnerOnly ? 'Мои заявки' : 'Актуальные заявки'}</h3>
              {requestOwnerOnly && (
                <button onClick={() => setRequestOwnerOnly(false)}>
                  Показать все
                </button>
              )}
            </div>
            <span className="live-dot">Живая лента MVP</span>
          </div>
          <div className="request-filters" aria-label="Фильтр заявок">
            {(
              [
                ['all', 'Все'],
                ['agro', 'Сельхоз'],
                ['rent', 'Аренда'],
                ['build', 'Стройка'],
                ['recycle', 'Вторсырьё'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                className={requestKind === value ? 'active' : ''}
                onClick={() => setRequestKind(value)}
              >
                {label}
              </button>
            ))}
          </div>
          {visibleRequests.map((r) => {
            const Icon =
              r.kind === 'agro'
                ? Tractor
                : r.kind === 'rent'
                  ? Wrench
                  : r.kind === 'recycle'
                    ? PackageOpen
                    : Construction;
            return (
              <article className="request-card" key={r.id}>
                <span className="request-icon">
                  <Icon />
                </span>
                <div className="request-main">
                  <span>
                    ЗАЯВКА #{r.id}
                    {r.mine && r.status === 'closed' && (
                      <em className="inline-status">Закрыта</em>
                    )}
                  </span>
                  <h4>{r.title}</h4>
                  <div>
                    <small>
                      <MapPin size={13} />
                      {r.place}
                    </small>
                    <small>
                      <Clock3 size={13} />
                      {r.when}
                    </small>
                  </div>
                </div>
                <div className="request-side">
                  <b>{r.budget}</b>
                  <button
                    onClick={() => {
                      setSelectedRequest(r);
                      setModal('response');
                    }}
                  >
                    <MessageCircle size={14} />
                    {r.responses} откликов
                  </button>
                </div>
              </article>
            );
          })}
          {visibleRequests.length === 0 && (
            <div className="request-empty">
              <MessageCircle />
              <b>Пока нет подходящих заявок</b>
              <span>Измените направление или создайте новую заявку.</span>
              <button onClick={() => openRequestForm()}>Создать заявку</button>
            </div>
          )}
        </div>
      </section>
      <section className="recycle-section" id="recycle">
        <div className="wrap">
          <div className="recycle-head">
            <div>
              <span className="kicker">B2B · ДЕМО НАПРАВЛЕНИЯ</span>
              <h2>Биржа вторсырья Казахстана</h2>
              <p>
                Карта цен и обратный аукцион для картона, пластика, металла,
                паллет и плёнки. Выставляете объём — приёмщики предлагают свою
                цену и вывоз.
              </p>
            </div>
            <button onClick={() => setModal('recycle')}>
              <Plus /> Выставить партию
            </button>
          </div>
          <div className="recycle-grid">
            {recyclePrices.map((x, i) => (
              <article key={x.name}>
                <span>{x.icon}</span>
                <div>
                  <small>ПРИМЕР ОТОБРАЖЕНИЯ ЦЕНЫ</small>
                  <h3>{x.name}</h3>
                  <b>{x.price}</b>
                </div>
                <em className={x.trend.startsWith('−') ? 'down' : ''}>
                  {x.trend}
                </em>
                <svg viewBox="0 0 120 34" aria-hidden="true">
                  <polyline
                    points={
                      i === 2
                        ? '0,8 20,12 40,10 60,19 80,17 100,25 120,22'
                        : '0,28 20,25 40,26 60,16 80,19 100,9 120,5'
                    }
                  />
                </svg>
              </article>
            ))}
          </div>
          <div className="auction-card">
            <div className="auction-main">
              <span>ДЕМО АУКЦИОНА</span>
              <h3>600 кг картона · Алматы</h3>
              <p>Самовывоз из Алатауского района до 4 сентября</p>
            </div>
            <div className="auction-bids">
              <div>
                <small>Лучшая ставка</small>
                <b>63 ₸/кг</b>
              </div>
              <div>
                <small>Предложений</small>
                <b>6</b>
              </div>
              <button
                onClick={() => {
                  setSelectedRequest(initialRequests[3]);
                  setModal('response');
                }}
              >
                Сделать ставку <ArrowRight />
              </button>
            </div>
          </div>
        </div>
      </section>
      <section className="about-section" id="about">
        <div className="wrap">
          <div className="about-heading">
            <div>
              <span className="kicker">{about.eyebrow}</span>
              <h2>{about.title}</h2>
              <p>{about.lead}</p>
            </div>
            <div className="language-switch" aria-label="Язык раздела">
              {(
                [
                  ['ru', 'Русский'],
                  ['kk', 'Қазақша'],
                  ['en', 'English'],
                ] as const
              ).map(([code, label]) => (
                <button
                  key={code}
                  className={aboutLang === code ? 'active' : ''}
                  onClick={() => setAboutLang(code)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="about-workspace">
            <div className="about-tabs" role="tablist">
              {about.items.map((item, i) => {
                const Icon = aboutIcons[i];
                return (
                  <button
                    key={item.title}
                    role="tab"
                    aria-selected={aboutTopic === i}
                    className={aboutTopic === i ? 'active' : ''}
                    onClick={() => setAboutTopic(i)}
                  >
                    <span className="about-tab-icon">
                      <Icon />
                    </span>
                    <span>
                      <small>0{i + 1}</small>
                      <b>{item.title}</b>
                      <em>{item.short}</em>
                    </span>
                    <ArrowRight className="about-arrow" />
                  </button>
                );
              })}
            </div>
            <article
              className={`about-detail topic-${aboutTopic + 1}`}
              role="tabpanel"
            >
              <div className="about-detail-top">
                <span className="about-big-icon">
                  {(() => {
                    const Icon = aboutIcons[aboutTopic];
                    return <Icon />;
                  })()}
                </span>
                <span>0{aboutTopic + 1}</span>
              </div>
              <h3>{about.items[aboutTopic].title}</h3>
              <p className="about-main-text">{about.items[aboutTopic].text}</p>
              <div className="about-example">
                <b>
                  {aboutLang === 'ru'
                    ? 'Как это работает'
                    : aboutLang === 'kk'
                      ? 'Қалай жұмыс істейді'
                      : 'How it works'}
                </b>
                <p>{about.items[aboutTopic].example}</p>
              </div>
              <div className="about-benefit">
                <CheckCircle2 />
                <span>{about.items[aboutTopic].benefit}</span>
              </div>
            </article>
          </div>
          <div className="ecosystem-note">
            <div className="ecosystem-icons">
              <span>
                <PackageOpen />
              </span>
              <ArrowRight />
              <span>
                <Wrench />
              </span>
              <ArrowRight />
              <span>
                <Construction />
              </span>
            </div>
            <div>
              <b>{about.result}</b>
              <p>{about.resultText}</p>
            </div>
          </div>
        </div>
      </section>
      <section className="how" id="how">
        <div className="wrap">
          <span className="kicker">ПРОСТОЙ СТАРТ</span>
          <h2>Три шага — и дело сделано</h2>
          <div className="steps">
            {[
              [
                '1',
                'Найдите или опишите',
                'Ищите готовое предложение или создайте свою заявку.',
              ],
              [
                '2',
                'Свяжитесь напрямую',
                'Обсудите цену, сроки и детали без посредников.',
              ],
              [
                '3',
                'Договоритесь на месте',
                'Оплата и передача — так, как удобно вам обоим.',
              ],
            ].map((s, i) => (
              <div className="step-fragment" key={s[0]}>
                <div>
                  <span>{s[0]}</span>
                  <h3>{s[1]}</h3>
                  <p>{s[2]}</p>
                </div>
                {i < 2 && <ArrowRight />}
              </div>
            ))}
          </div>
        </div>
      </section>
      <footer>
        <div className="wrap footer-grid">
          <div>
            <a className="brand" href="#top">
              <span className="brandmark">
                <Tractor size={21} />
              </span>
              <span>Qoldan</span>
            </a>
            <p>Казахстанский маркетплейс ресурсов, аренды и услуг рядом.</p>
          </div>
          <div>
            <b>Площадка</b>
            <a
              href="#catalog"
              onClick={() => {
                setFavoriteOnly(false);
                setMyOnly(false);
              }}
            >
              Объявления
            </a>
            <a href="#requests" onClick={() => setRequestOwnerOnly(false)}>
              Заявки
            </a>
            <a href="#recycle">Биржа вторсырья</a>
            <a href="#about">О приложении</a>
          </div>
          <div>
            <b>Казахстан</b>
            <button
              onClick={() => {
                setSelectedRegion('Алматы');
                document
                  .querySelector('#catalog')
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Алматы
            </button>
            <button
              onClick={() => {
                setSelectedRegion('Астана');
                document
                  .querySelector('#catalog')
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Астана
            </button>
            <button onClick={() => setModal('regions')}>Все регионы</button>
          </div>
          <div>
            <b>Помощь</b>
            <button onClick={() => setModal('info')}>Правила сервиса</button>
            <button onClick={() => setModal('info')}>Связаться с нами</button>
            <button onClick={() => setModal('info')}>Безопасность</button>
          </div>
        </div>
        <div className="wrap foot-bottom">
          <span>© 2026 Qoldan. Сделано в Казахстане.</span>
          <a href="#about">Русский · Қазақша · English</a>
        </div>
      </footer>
      <nav className="mobile-bottom">
        <a
          href="#catalog"
          onClick={() => {
            setFavoriteOnly(false);
            setMyOnly(false);
          }}
        >
          <Search />
          <span>Поиск</span>
        </a>
        <a href="#requests" onClick={() => setRequestOwnerOnly(false)}>
          <MessageCircle />
          <span>Заявки</span>
        </a>
        <button onClick={openAddListing} aria-label="Подать объявление">
          <Plus />
        </button>
        <a
          href="#catalog"
          onClick={() => {
            setFavoriteOnly(true);
            setMyOnly(false);
          }}
        >
          <Heart />
          <span>Избранное</span>
        </a>
        <button className="mobile-profile" onClick={() => setModal('profile')}>
          <UserRound />
          <span>Профиль</span>
        </button>
      </nav>
      {modal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <dialog
            open
            className={`app-modal ${modal === 'detail' ? 'detail-modal' : ''}`}
            aria-label="Окно Qoldan"
          >
            <button
              className="modal-close"
              onClick={() => setModal(null)}
              aria-label="Закрыть"
            >
              <X />
            </button>
            {modal === 'listing' && (
              <>
                <div className="modal-title">
                  <span>
                    <Plus />
                  </span>
                  <div>
                    <small>НОВОЕ ПРЕДЛОЖЕНИЕ</small>
                    <h2>Подать объявление</h2>
                    <p>
                      Предложение появится в выбранном регионе и будет доступно
                      в вашем профиле на других устройствах.
                    </p>
                  </div>
                </div>
                <form className="product-form" onSubmit={addListing}>
                  <label>
                    Тип предложения
                    <select name="type" required>
                      <option>Продам</option>
                      <option>Сдам</option>
                      <option>Окажу услугу</option>
                    </select>
                  </label>
                  <label>
                    Категория
                    <select name="category" required>
                      <option>Сельхозуслуги</option>
                      <option>Спецтехника</option>
                      <option>Корма и сено</option>
                      <option>Зерно</option>
                      <option>Пастбища</option>
                      <option>Перевозка скота</option>
                      <option>Инструменты</option>
                      <option>Электроника</option>
                      <option>Оборудование</option>
                      <option>Для мероприятий</option>
                      <option>Стройматериалы</option>
                      <option>Остатки партий</option>
                      <option>Доставка</option>
                    </select>
                  </label>
                  <label className="wide">
                    Название
                    <input
                      name="title"
                      required
                      placeholder="Например, вспашка полей МТЗ-82"
                    />
                  </label>
                  <label className="wide photo-upload">
                    Фотография
                    <input
                      name="image"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      required
                      onChange={handleListingImage}
                    />
                    <span>
                      <Plus />
                      <b>Выбрать реальное фото</b>
                      <small>JPG, PNG или WebP · до 5 МБ, сожмём сами</small>
                    </span>
                    {listingImage && (
                      <img src={listingImage} alt="Предпросмотр объявления" />
                    )}
                  </label>
                  <label>
                    Цена
                    <input
                      name="price"
                      type="number"
                      min="0"
                      required
                      placeholder="18000"
                    />
                  </label>
                  <label>
                    Единица
                    <select name="unit">
                      <option>/ услуга</option>
                      <option>/ га</option>
                      <option>/ час</option>
                      <option>/ сутки</option>
                      <option>/ шт.</option>
                      <option>/ кг</option>
                      <option>/ тюк</option>
                    </select>
                  </label>
                  <label>
                    Регион
                    <select
                      name="region"
                      required
                      defaultValue={
                        selectedRegion === 'Весь Казахстан'
                          ? 'Область Жетісу'
                          : selectedRegion
                      }
                    >
                      {kzRegions.slice(1).map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Город или район
                    <input
                      name="location"
                      required
                      defaultValue={
                        selectedRegion === 'Алматы' ||
                        selectedRegion === 'Астана' ||
                        selectedRegion === 'Шымкент'
                          ? selectedRegion
                          : selectedRegion === 'Весь Казахстан' ||
                              selectedRegion === 'Область Жетісу'
                            ? 'Талдыкорган'
                            : ''
                      }
                    />
                  </label>
                  <button
                    className={`geolocation-picker wide ${listingCoords ? 'captured' : ''}`}
                    type="button"
                    onClick={captureListingLocation}
                    disabled={submitting === 'geolocation'}
                  >
                    <Navigation />
                    <span>
                      <b>
                        {submitting === 'geolocation'
                          ? 'Определяем точку…'
                          : listingCoords
                            ? 'Точная точка добавлена'
                            : 'Добавить точку с устройства'}
                      </b>
                      <small>
                        {listingCoords
                          ? `${listingCoords.latitude.toFixed(4)}, ${listingCoords.longitude.toFixed(4)} · нажмите, чтобы обновить`
                          : 'Необязательно — город и регион всё равно останутся видны'}
                      </small>
                    </span>
                    {listingCoords && <CheckCircle2 />}
                  </button>
                  <label>
                    Телефон для связи
                    <input
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      required
                      placeholder="+7 700 123 45 67"
                    />
                  </label>
                  <label>
                    Кто размещает
                    <select name="sellerType">
                      <option>Частное лицо</option>
                      <option>Компания</option>
                      <option>Магазин</option>
                    </select>
                  </label>
                  <label className="check-line form-delivery">
                    <input name="delivery" type="checkbox" /> Возможна доставка
                    или выезд
                  </label>
                  <label className="wide">
                    Когда доступно
                    <input
                      name="available"
                      placeholder="Например, 2–7 сентября"
                    />
                  </label>
                  <label className="wide">
                    Описание
                    <textarea
                      name="description"
                      rows={3}
                      placeholder="Расскажите о состоянии, условиях и радиусе выезда"
                    />
                  </label>
                  <button
                    className="submit-button"
                    type="submit"
                    disabled={submitting === 'listing'}
                  >
                    {submitting === 'listing'
                      ? 'Публикуем…'
                      : 'Опубликовать объявление'}{' '}
                    <ArrowRight />
                  </button>
                </form>
              </>
            )}
            {modal === 'request' && (
              <>
                <div className="modal-title">
                  <span>
                    <MessageCircle />
                  </span>
                  <div>
                    <small>МНЕ НУЖНО</small>
                    <h2>Создать заявку</h2>
                    <p>
                      Опишите задачу — исполнители увидят её и смогут предложить
                      цену.
                    </p>
                  </div>
                </div>
                <form className="product-form" onSubmit={addRequest}>
                  <label>
                    Направление
                    <select name="kind" defaultValue={requestSeedKind}>
                      <option value="agro">Сельхозтехника и услуги</option>
                      <option value="rent">Аренда</option>
                      <option value="build">Материалы и стройка</option>
                      <option value="recycle">Вторсырьё и вывоз</option>
                    </select>
                  </label>
                  <label>
                    Бюджет
                    <input
                      name="budget"
                      placeholder="До 50 000 ₸ или договорная"
                    />
                  </label>
                  <label className="wide">
                    Что вам нужно?
                    <input
                      name="title"
                      required
                      defaultValue={requestSeed}
                      placeholder="Например, убрать 70 га пшеницы"
                    />
                  </label>
                  <label>
                    Регион
                    <select
                      name="region"
                      required
                      defaultValue={
                        selectedRegion === 'Весь Казахстан'
                          ? 'Область Жетісу'
                          : selectedRegion
                      }
                    >
                      {kzRegions.slice(1).map((region) => (
                        <option key={region}>{region}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Где?
                    <input
                      name="place"
                      required
                      defaultValue={
                        selectedRegion === 'Весь Казахстан'
                          ? 'Талдыкорган'
                          : selectedRegion
                      }
                    />
                  </label>
                  <label>
                    Когда?
                    <input
                      name="when"
                      required
                      placeholder="Завтра или точная дата"
                    />
                  </label>
                  <button
                    className="submit-button"
                    type="submit"
                    disabled={submitting === 'request'}
                  >
                    {submitting === 'request'
                      ? 'Публикуем…'
                      : 'Опубликовать заявку'}{' '}
                    <ArrowRight />
                  </button>
                </form>
              </>
            )}
            {modal === 'response' && selectedRequest && (
              <>
                <div className="modal-title">
                  <span>
                    <MessageCircle />
                  </span>
                  <div>
                    <small>МИНИ-ТЕНДЕР · ЗАЯВКА #{selectedRequest.id}</small>
                    <h2>{selectedRequest.title}</h2>
                    <p>
                      {selectedRequest.place} · {selectedRequest.when}
                    </p>
                  </div>
                </div>
                {selectedResponses.length > 0 ? (
                  <div className="bid-list">
                    {selectedResponses.map((response) => (
                      <div key={response.id}>
                        <span>{response.owner.slice(0, 1).toUpperCase()}</span>
                        <b>{response.owner}</b>
                        <em>{response.price}</em>
                        <small>
                          {response.message || 'Готов обсудить детали заказа'}
                        </small>
                        {selectedRequest.mine && (
                          <button
                            onClick={() => {
                              setModal(null);
                              notify(`Предложение ${response.owner} выбрано`);
                            }}
                          >
                            Выбрать
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : selectedRequest.responses > 0 && !selectedRequest.mine ? (
                  <div className="demo-contact">
                    <b>{selectedRequest.responses} откликов уже получено</b>
                    <span>
                      Их детали доступны автору заявки. Добавьте своё
                      предложение ниже.
                    </span>
                  </div>
                ) : null}
                {selectedRequest.mine ? (
                  <div className="owner-management">
                    <div>
                      <b>
                        {selectedRequest.status === 'closed'
                          ? 'Заявка закрыта'
                          : 'Это ваша активная заявка'}
                      </b>
                      <span>
                        {selectedRequest.status === 'closed'
                          ? 'Она скрыта из общей ленты, но сохранена в разделе «Мои заявки».'
                          : 'Здесь появятся цены исполнителей, а новые отклики придут в уведомления.'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void updateRequestStatus()}
                      disabled={submitting === 'request-status'}
                    >
                      {submitting === 'request-status'
                        ? 'Сохраняем…'
                        : selectedRequest.status === 'closed'
                          ? 'Открыть снова'
                          : 'Закрыть заявку'}
                    </button>
                  </div>
                ) : (
                  <form
                    className="product-form response-form"
                    onSubmit={sendResponse}
                  >
                    <h3>Предложить свой вариант</h3>
                    <label className="wide">
                      Ваша цена
                      <input
                        name="price"
                        required
                        placeholder={
                          selectedRequest.kind === 'recycle'
                            ? 'Например, 64 ₸/кг'
                            : 'Например, 48 000 ₸'
                        }
                      />
                    </label>
                    <label className="wide">
                      Комментарий
                      <textarea
                        name="message"
                        rows={2}
                        placeholder="Когда сможете выполнить и что входит в цену"
                      />
                    </label>
                    <button
                      className="submit-button"
                      type="submit"
                      disabled={submitting === 'response'}
                    >
                      {submitting === 'response'
                        ? 'Отправляем…'
                        : 'Добавить отклик'}{' '}
                      <ArrowRight />
                    </button>
                  </form>
                )}
                {!selectedRequest.mine &&
                  !isDemoRequest(selectedRequest.id) && (
                    <button
                      className="report-inline"
                      type="button"
                      onClick={() =>
                        openReport({
                          type: 'request',
                          id: String(selectedRequest.id),
                          title: selectedRequest.title,
                        })
                      }
                    >
                      <Flag /> Сообщить о проблеме с заявкой
                    </button>
                  )}
              </>
            )}
            {modal === 'detail' && selectedListing && (
              <>
                <div className="detail-photo">
                  <img
                    src={selectedListing.image}
                    alt={selectedListing.title}
                  />
                  <span
                    className={`type ${selectedListing.type === 'Продам' ? 'sale' : selectedListing.type === 'Сдам' ? 'rent' : 'service'}`}
                  >
                    {selectedListing.type}
                  </span>
                </div>
                <div className="detail-content">
                  <small className="kicker">
                    {selectedListing.category} · {selectedListing.region}
                  </small>
                  <h2>{selectedListing.title}</h2>
                  <div className="detail-price">
                    {selectedListing.price} <span>{selectedListing.unit}</span>
                  </div>
                  <p>
                    {selectedListing.description ||
                      'Свяжитесь с владельцем, чтобы уточнить подробности предложения.'}
                  </p>
                  <div className="detail-facts">
                    <span>
                      <MapPin />
                      {selectedListing.location} · {selectedListing.distance}
                    </span>
                    <span>
                      <Clock3 />
                      {selectedListing.available || 'По договорённости'}
                    </span>
                    {selectedListing.deposit && (
                      <span>
                        <CheckCircle2 />
                        {selectedListing.deposit}
                      </span>
                    )}
                    {selectedListing.delivery && (
                      <span>
                        <Construction /> Доставка или выезд доступны
                      </span>
                    )}
                    {selectedListing.latitude !== undefined &&
                      selectedListing.longitude !== undefined && (
                        <span>
                          <Navigation /> Точная точка добавлена владельцем
                        </span>
                      )}
                  </div>
                  <div className="owner-card">
                    <span>
                      {(selectedListing.owner || 'АК')
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                    <div>
                      <b>{selectedListing.owner || 'Пользователь Qoldan'}</b>
                      <small>
                        {selectedListing.sellerType || 'Частное лицо'} ·{' '}
                        {selectedListing.verified
                          ? 'профиль подтверждён'
                          : 'участник площадки'}
                      </small>
                    </div>
                    {selectedListing.rating && (
                      <em>
                        <Star fill="currentColor" /> {selectedListing.rating}
                      </em>
                    )}
                  </div>
                  {selectedListing.mine && (
                    <div className="owner-management">
                      <div>
                        <b>
                          {selectedListing.status === 'paused'
                            ? 'Объявление на паузе'
                            : 'Объявление активно'}
                        </b>
                        <span>
                          {selectedListing.status === 'paused'
                            ? 'Его видите только вы в разделе «Мои объявления».'
                            : 'Оно доступно покупателям и заказчикам в общем каталоге.'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void updateListingStatus()}
                        disabled={submitting === 'listing-status'}
                      >
                        {submitting === 'listing-status'
                          ? 'Сохраняем…'
                          : selectedListing.status === 'paused'
                            ? 'Возобновить'
                            : 'Поставить на паузу'}
                      </button>
                    </div>
                  )}
                  {!selectedListing.mine && (
                    <div className="contact-actions">
                      {isDemoListing(selectedListing.id) ||
                      !selectedListing.phone ||
                      selectedListing.phone.replace(/\D/g, '') ===
                        '77000000000' ? (
                        <div className="demo-contact">
                          <b>Демонстрационное объявление</b>
                          <span>
                            Контакты скрыты: карточка показывает сценарий
                            сервиса и не ведёт к случайному номеру.
                          </span>
                        </div>
                      ) : (
                        <>
                          <a
                            className="call-button"
                            href={`tel:${selectedListing.phone}`}
                          >
                            Позвонить
                          </a>
                          <a
                            className="whatsapp-button"
                            target="_blank"
                            rel="noreferrer"
                            href={`https://wa.me/${(selectedListing.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Здравствуйте! Пишу по объявлению Qoldan: ${selectedListing.title}`)}`}
                          >
                            <MessageCircle /> WhatsApp
                          </a>
                        </>
                      )}
                      {selectedListing.type === 'Сдам' && (
                        <button onClick={() => setModal('booking')}>
                          Забронировать
                        </button>
                      )}
                      <button
                        className="related-request"
                        onClick={() => {
                          const relatedKind: RequestItem['kind'] =
                            selectedListing.type === 'Сдам'
                              ? 'rent'
                              : selectedListing.category === 'Стройматериалы' ||
                                  selectedListing.category === 'Остатки партий'
                                ? 'build'
                                : 'agro';
                          openRequestForm(
                            `Нужно: ${selectedListing.title}`,
                            relatedKind,
                          );
                        }}
                      >
                        <MessageCircle /> Оставить встречную заявку
                      </button>
                      {!isDemoListing(selectedListing.id) && (
                        <button
                          className="report-action"
                          type="button"
                          onClick={() =>
                            openReport({
                              type: 'listing',
                              id: String(selectedListing.id),
                              title: selectedListing.title,
                            })
                          }
                        >
                          <Flag /> Пожаловаться на объявление
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
            {modal === 'booking' && selectedListing && (
              <>
                <div className="modal-title">
                  <span>
                    <Clock3 />
                  </span>
                  <div>
                    <small>БРОНИРОВАНИЕ</small>
                    <h2>{selectedListing.title}</h2>
                    <p>
                      {selectedListing.price} {selectedListing.unit} · оплата
                      владельцу при получении
                    </p>
                  </div>
                </div>
                <form className="product-form" onSubmit={submitBooking}>
                  <label>
                    Дата начала
                    <input
                      name="dateFrom"
                      type="date"
                      min={new Date().toISOString().slice(0, 10)}
                      required
                    />
                  </label>
                  <label>
                    Дата возврата
                    <input
                      name="dateTo"
                      type="date"
                      min={new Date().toISOString().slice(0, 10)}
                      required
                    />
                  </label>
                  <label className="wide">
                    Телефон для ответа владельца
                    <input
                      name="customerPhone"
                      type="tel"
                      inputMode="tel"
                      required
                      placeholder="+7 700 123 45 67"
                    />
                  </label>
                  <label className="wide check-line">
                    <input name="delivery" type="checkbox" /> Нужна доставка по
                    городу {selectedListing.location}
                  </label>
                  <label className="wide">
                    Комментарий
                    <textarea
                      name="comment"
                      rows={2}
                      placeholder="Удобное время и адрес"
                    />
                  </label>
                  <button
                    className="submit-button"
                    type="submit"
                    disabled={submitting === 'booking'}
                  >
                    {submitting === 'booking'
                      ? 'Отправляем…'
                      : 'Отправить владельцу'}{' '}
                    <ArrowRight />
                  </button>
                </form>
              </>
            )}
            {modal === 'report' && reportTarget && (
              <>
                <div className="modal-title report-title">
                  <span>
                    <Flag />
                  </span>
                  <div>
                    <small>БЕЗОПАСНОСТЬ QOLDAN</small>
                    <h2>Сообщить о проблеме</h2>
                    <p>
                      «{reportTarget.title}». Жалоба не публикуется и будет
                      доступна только команде проверки.
                    </p>
                  </div>
                </div>
                <form className="product-form" onSubmit={submitReport}>
                  <label className="wide">
                    Что произошло
                    <select name="reason" required defaultValue="fraud">
                      <option value="fraud">Подозрение на обман</option>
                      <option value="spam">
                        Спам или повторная публикация
                      </option>
                      <option value="wrong_info">
                        Неверная цена, фото или описание
                      </option>
                      <option value="unsafe">Опасный товар или услуга</option>
                      <option value="other">Другая причина</option>
                    </select>
                  </label>
                  <label className="wide">
                    Комментарий
                    <textarea
                      name="description"
                      rows={4}
                      maxLength={800}
                      placeholder="Коротко опишите проблему — без паролей и банковских данных"
                    />
                  </label>
                  <div className="report-note wide">
                    <CheckCircle2 />
                    <span>
                      Мы сохраним тип публикации, её номер и выбранную причину.
                      Автор не увидит, кто отправил жалобу.
                    </span>
                  </div>
                  <button
                    className="submit-button report-submit"
                    type="submit"
                    disabled={submitting === 'report'}
                  >
                    {submitting === 'report'
                      ? 'Отправляем…'
                      : 'Отправить на проверку'}{' '}
                    <ArrowRight />
                  </button>
                </form>
              </>
            )}
            {modal === 'regions' && (
              <>
                <div className="modal-title">
                  <span>
                    <MapPin />
                  </span>
                  <div>
                    <small>ГЕОГРАФИЯ QOLDAN</small>
                    <h2>Выберите регион</h2>
                    <p>
                      Покажем предложения и заявки в нужной части Казахстана.
                    </p>
                  </div>
                </div>
                <div className="region-modal-grid">
                  {kzRegions.map((r, i) => (
                    <button
                      key={r}
                      className={selectedRegion === r ? 'active' : ''}
                      onClick={() => {
                        setSelectedRegion(r);
                        setModal(null);
                        setMaxDistance(100);
                        notify(
                          r === 'Весь Казахстан'
                            ? 'Показываем всю страну'
                            : `Выбран регион: ${r}`,
                        );
                      }}
                    >
                      <span>{i === 0 ? '🇰🇿' : String(i).padStart(2, '0')}</span>
                      {r}
                      {selectedRegion === r && <CheckCircle2 />}
                    </button>
                  ))}
                </div>
              </>
            )}
            {modal === 'recycle' && (
              <>
                <div className="modal-title">
                  <span>
                    <PackageOpen />
                  </span>
                  <div>
                    <small>ОБРАТНЫЙ АУКЦИОН</small>
                    <h2>Выставить партию вторсырья</h2>
                    <p>
                      В рабочем MVP партия сохранится локально как новая заявка.
                    </p>
                  </div>
                </div>
                <form className="product-form" onSubmit={addRecycleLot}>
                  <label>
                    Материал
                    <select name="material">
                      <option>Картон</option>
                      <option>PET-пластик</option>
                      <option>Чёрный металл</option>
                      <option>Европаллеты</option>
                      <option>Стрейч-плёнка</option>
                    </select>
                  </label>
                  <label>
                    Количество
                    <input
                      name="amount"
                      type="number"
                      min="1"
                      required
                      placeholder="600"
                    />
                  </label>
                  <label>
                    Единица
                    <select name="unit">
                      <option>кг</option>
                      <option>тонн</option>
                      <option>шт.</option>
                    </select>
                  </label>
                  <label>
                    Когда забрать
                    <input name="when" required placeholder="До 5 сентября" />
                  </label>
                  <label>
                    Регион
                    <select
                      name="region"
                      required
                      defaultValue={
                        selectedRegion === 'Весь Казахстан'
                          ? 'Алматы'
                          : selectedRegion
                      }
                    >
                      {kzRegions.slice(1).map((region) => (
                        <option key={region}>{region}</option>
                      ))}
                    </select>
                  </label>
                  <label className="wide">
                    Адрес или район
                    <input
                      name="place"
                      required
                      placeholder="Алматы, Алатауский район"
                    />
                  </label>
                  <button
                    className="submit-button"
                    type="submit"
                    disabled={submitting === 'recycle'}
                  >
                    {submitting === 'recycle'
                      ? 'Публикуем…'
                      : 'Опубликовать партию'}{' '}
                    <ArrowRight />
                  </button>
                </form>
              </>
            )}
            {modal === 'profile' && (
              <>
                <div className="profile-cover">
                  <span>{viewerInitials || 'Q'}</span>
                  <div>
                    <h2>{viewerName}</h2>
                    <p>
                      <MapPin />{' '}
                      {serverConnected
                        ? 'Профиль синхронизирован'
                        : storageReady
                          ? 'Демонстрационный режим'
                          : 'Подключаем профиль…'}
                    </p>
                  </div>
                </div>
                <div className="profile-stats">
                  <div>
                    <b>{allListings.filter((x) => x.mine).length}</b>
                    <span>объявлений</span>
                  </div>
                  <div>
                    <b>{allRequests.filter((x) => x.mine).length}</b>
                    <span>заявок</span>
                  </div>
                  <div>
                    <b>
                      {bookings.filter((x) => x.status === 'pending').length}
                    </b>
                    <span>броней ожидают</span>
                  </div>
                </div>
                <div className="profile-menu">
                  <button
                    onClick={() => {
                      setModal(null);
                      setFavoriteOnly(true);
                      setMyOnly(false);
                      document
                        .querySelector('#catalog')
                        ?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <Heart /> Избранное <b>{favorites.length}</b>
                  </button>
                  <button onClick={() => setModal('bookings')}>
                    <Clock3 /> Бронирования <b>{bookings.length}</b>
                  </button>
                  <button
                    onClick={() => {
                      setModal(null);
                      setFavoriteOnly(false);
                      setMyOnly(true);
                      document
                        .querySelector('#catalog')
                        ?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <PackageOpen /> Мои объявления <ArrowRight />
                  </button>
                  <button
                    onClick={() => {
                      setModal(null);
                      setRequestOwnerOnly(true);
                      setRequestKind('all');
                      document
                        .querySelector('#requests')
                        ?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <MessageCircle /> Мои заявки <ArrowRight />
                  </button>
                </div>
              </>
            )}
            {modal === 'bookings' && (
              <>
                <div className="modal-title">
                  <span>
                    <Clock3 />
                  </span>
                  <div>
                    <small>КАБИНЕТ АРЕНДЫ</small>
                    <h2>Бронирования</h2>
                    <p>
                      Входящие запросы на ваши вещи и отправленные вами
                      бронирования.
                    </p>
                  </div>
                </div>
                {bookings.length > 0 ? (
                  <div className="booking-list">
                    {bookings.map((booking) => (
                      <article key={booking.id}>
                        <div className="booking-head">
                          <div>
                            <small>
                              {booking.incoming
                                ? 'ВХОДЯЩИЙ ЗАПРОС'
                                : 'ВЫ ОТПРАВИЛИ ЗАПРОС'}
                            </small>
                            <h3>{booking.listingTitle}</h3>
                          </div>
                          <span className={`booking-status ${booking.status}`}>
                            {booking.status === 'accepted'
                              ? 'Подтверждено'
                              : booking.status === 'declined'
                                ? 'Отклонено'
                                : 'Ожидает ответа'}
                          </span>
                        </div>
                        <div className="booking-meta">
                          <span>
                            <Clock3 /> {formatBookingDate(booking.dateFrom)} —{' '}
                            {formatBookingDate(booking.dateTo)}
                          </span>
                          <span>
                            <UserRound /> {booking.counterparty}
                          </span>
                          {booking.delivery && (
                            <span>
                              <Construction /> Нужна доставка
                            </span>
                          )}
                        </div>
                        {booking.comment && <p>{booking.comment}</p>}
                        <div className="booking-footer">
                          <a href={`tel:${booking.contactPhone}`}>
                            <Phone /> {booking.contactPhone}
                          </a>
                          {booking.incoming && booking.status === 'pending' && (
                            <div>
                              <button
                                className="decline"
                                onClick={() =>
                                  void updateBookingStatus(
                                    booking.id,
                                    'declined',
                                  )
                                }
                                disabled={
                                  submitting === `booking-status-${booking.id}`
                                }
                              >
                                Отклонить
                              </button>
                              <button
                                onClick={() =>
                                  void updateBookingStatus(
                                    booking.id,
                                    'accepted',
                                  )
                                }
                                disabled={
                                  submitting === `booking-status-${booking.id}`
                                }
                              >
                                Подтвердить
                              </button>
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="notification-empty">
                    <Clock3 />
                    <b>Бронирований пока нет</b>
                    <span>
                      Здесь появятся запросы на аренду и решения владельцев.
                    </span>
                  </div>
                )}
              </>
            )}
            {modal === 'notifications' && (
              <>
                <div className="modal-title">
                  <span>
                    <Bell />
                  </span>
                  <div>
                    <small>УВЕДОМЛЕНИЯ</small>
                    <h2>Что нового</h2>
                    <p>Реальные отклики и запросы по вашим публикациям.</p>
                  </div>
                </div>
                {activities.length > 0 ? (
                  <div className="notification-list">
                    {activities.map((activity) => (
                      <article key={activity.id}>
                        <span>
                          {activity.kind === 'booking' ? (
                            <Clock3 />
                          ) : (
                            <MessageCircle />
                          )}
                        </span>
                        <div>
                          <b>{activity.title}</b>
                          <p>{activity.description}</p>
                          <small>
                            {formatActivityDate(activity.createdAt)}
                          </small>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="notification-empty">
                    <Bell />
                    <b>Пока тихо</b>
                    <span>
                      Когда кто-то откликнется или запросит аренду, событие
                      появится здесь.
                    </span>
                  </div>
                )}
              </>
            )}
            {modal === 'info' && (
              <>
                <div className="modal-title">
                  <span>
                    <CheckCircle2 />
                  </span>
                  <div>
                    <small>ЦЕНТР ПОМОЩИ</small>
                    <h2>Договаривайтесь уверенно</h2>
                    <p>
                      Qoldan соединяет людей напрямую и помогает проверить
                      главное до сделки.
                    </p>
                  </div>
                </div>
                <div className="info-grid">
                  <article>
                    <b>Безопасность</b>
                    <p>
                      Проверяйте товар при встрече, не переводите предоплату
                      незнакомым людям и фиксируйте условия аренды в сообщениях.
                    </p>
                  </article>
                  <article>
                    <b>Правила сервиса</b>
                    <p>
                      Указывайте честную цену, реальные фотографии и точное
                      местоположение. Запрещены дубли, обман и опасные товары.
                    </p>
                  </article>
                  <article>
                    <b>Связаться с нами</b>
                    <p>
                      Контакты поддержки появятся перед открытием пилота.
                      <br />
                      Сейчас это закрытая рабочая версия Qoldan.
                    </p>
                  </article>
                </div>
              </>
            )}
          </dialog>
        </div>
      )}
      {toast && (
        <output className="toast" aria-live="polite">
          <CheckCircle2 size={18} />
          {toast}
        </output>
      )}
    </main>
  );
}
