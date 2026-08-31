'use client';
/* oxlint-disable next/no-img-element, react/react-compiler -- marketplace photos can be remote or user-uploaded; shared server data is hydrated after mount */
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { type DateRange } from 'react-day-picker';
import { ru } from 'date-fns/locale';
import {
  ArrowRight,
  Beef,
  Bell,
  Bookmark,
  ChevronLeft,
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
  ShieldCheck,
  CircleAlert,
  Eye,
  EyeOff,
  ShieldAlert,
  ScrollText,
  Scale,
  Send,
} from 'lucide-react';
import {
  MarketplaceMap,
  type MarketplaceMapMarker,
} from '@/components/MarketplaceMap';
import { Calendar } from '@/components/ui/calendar';
import {
  calculateDistanceKm,
  formatDistanceKm,
  getRegionCenter,
  hasExactCoordinates,
  resolveCoordinates,
  type Coordinates,
} from '@/lib/geo';
type LivestockType =
  | 'Лошади'
  | 'Крупный рогатый скот'
  | 'Овцы'
  | 'Козы'
  | 'Верблюды'
  | 'Другое';
type LivestockPriceMode = 'per_head' | 'whole_group';
type LivestockQuantityGroup = 'all' | 'single' | 'small_group' | 'large_group';
type Listing = {
  id: number | string;
  ownerId?: string;
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
  reviewCount?: number;
  verified?: boolean;
  businessType?: BusinessProfileType;
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
  livestockType?: LivestockType;
  livestockQuantity?: number;
  livestockPriceMode?: LivestockPriceMode;
  livestockBreed?: string;
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
  selection?: RequestSelection | null;
};
type RequestSelection = {
  requestId: string;
  responseId: string;
  providerId: string;
  providerName: string;
  price: string;
  status: 'selected' | 'cancelled' | 'completed';
  conversationId: string;
  selectedAt: number;
  completedAt: number | null;
  mineAsProvider: boolean;
  review: RequestServiceReview | null;
};
type RequestServiceReview = {
  id: string;
  requestId: string;
  responseId: string;
  requestTitle: string;
  rating: number;
  comment: string;
  reviewer: string;
  providerId: string;
  providerName: string;
  createdAt: number;
};
type ResponseItem = {
  id: string;
  requestId: string;
  price: string;
  message: string;
  owner: string;
  ownerId: string;
  mine?: boolean;
  selectionStatus?: RequestSelection['status'] | null;
  providerRating?: string;
  providerReviewCount: number;
};
type ServiceTrust = {
  serviceRating?: string;
  serviceReviewCount: number;
};
type ProviderReview = {
  id: string;
  rating: number;
  comment: string;
  subjectTitle: string;
  reviewer: string;
  createdAt: number;
};
type ProviderProfile = {
  id: string;
  displayName: string;
  joinedAt: number;
  verified: boolean;
  organizationName?: string;
  businessType?: BusinessProfileType;
  region?: string;
  serviceRating?: string;
  serviceReviewCount: number;
  rentalRating?: string;
  rentalReviewCount: number;
  completedWorkCount: number;
  activeListingCount: number;
  listings: Listing[];
  serviceReviews: ProviderReview[];
  rentalReviews: ProviderReview[];
};
type SavedSearchItem = {
  id: string;
  name: string;
  query: string;
  region: string;
  category: string;
  offerType: 'Все' | Listing['type'];
  deliveryOnly: boolean;
  companyOnly: boolean;
  livestockType: 'Все виды' | LivestockType;
  livestockPriceMode: 'all' | LivestockPriceMode;
  livestockQuantityGroup: LivestockQuantityGroup;
  totalMatches: number;
  newMatches: number;
  latestMatchAt: number | null;
  createdAt: number;
  lastViewedAt: number;
};
type ActivityItem = {
  id: string;
  kind: 'response' | 'booking' | 'moderation' | 'appeal' | 'message' | 'search';
  title: string;
  description: string;
  createdAt: number;
  moderationActionId?: string;
  moderationAction?: 'warn' | 'restrict' | 'restore';
  targetTitle?: string;
  appealId?: string | null;
  appealStatus?: AppealItem['status'] | null;
};
type ConversationSummary = {
  id: string;
  contextType: 'listing' | 'request';
  contextId: string;
  contextTitle: string;
  counterparty: string;
  lastMessage: string;
  lastMessageAt: number | null;
  unreadCount: number;
  updatedAt: number;
};
type ChatMessage = {
  id: string;
  body: string;
  senderName: string;
  mine: boolean;
  createdAt: number;
  readAt: number | null;
};
type ReviewItem = {
  id: string;
  bookingId: string;
  listingId: string;
  listingTitle: string;
  rating: number;
  comment: string;
  reviewer: string;
  createdAt: number;
};
type DepositResult =
  | 'not_applicable'
  | 'returned'
  | 'partially_withheld'
  | 'withheld';
type RentalHandoff = {
  depositAmount: number;
  depositReceived: boolean;
  conditionOut: string;
  equipmentList: string;
  handedOverAt: number;
  conditionIn: string;
  depositResult: DepositResult | null;
  returnNote: string;
  returnedAt: number | null;
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
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  completedAt: number | null;
  incoming: boolean;
  canReview: boolean;
  review: ReviewItem | null;
  handoff: RentalHandoff | null;
};
type AvailabilityRange = {
  dateFrom: string;
  dateTo: string;
};
type ReportTarget = {
  type: 'listing' | 'request';
  id: string;
  title: string;
};
type ModerationReport = {
  id: string;
  targetType: 'listing' | 'request';
  targetId: string;
  targetTitle: string;
  targetPlace: string;
  targetRegion: string;
  targetOwner: string;
  targetStatus: string;
  reason: 'fraud' | 'spam' | 'wrong_info' | 'unsafe' | 'other';
  description: string;
  status: 'new' | 'reviewing' | 'closed';
  reviewNote: string;
  reporterName: string;
  reviewerName: string;
  createdAt: number;
  reviewedAt: number | null;
};
type ModerationAction = {
  id: string;
  reportId: string | null;
  targetType: 'listing' | 'request';
  targetId: string;
  targetTitle: string;
  targetOwner: string;
  action: 'warn' | 'restrict' | 'restore';
  note: string;
  moderatorName: string;
  createdAt: number;
};
type AppealItem = {
  id: string;
  moderationActionId: string;
  targetTitle: string;
  action: 'warn' | 'restrict';
  message: string;
  status: 'new' | 'reviewing' | 'approved' | 'rejected';
  resolutionNote: string;
  createdAt: number;
  reviewedAt: number | null;
};
type ModerationAppeal = AppealItem & {
  ownerName: string;
  reviewerName: string;
};
type BusinessProfileType = 'farm' | 'company' | 'store' | 'service_company';
type BusinessVerification = {
  id: string;
  profileType: BusinessProfileType;
  organizationName: string;
  maskedBin: string;
  phone: string;
  region: string;
  referenceUrl: string;
  note: string;
  status: 'pending' | 'verified' | 'rejected';
  reviewNote: string;
  createdAt: number;
  reviewedAt: number | null;
};
type ModerationVerification = Omit<BusinessVerification, 'maskedBin'> & {
  ownerId: string;
  ownerName: string;
  bin: string;
  reviewerName: string;
};
type AppealTarget = {
  moderationActionId: string;
  targetTitle: string;
  action: 'warn' | 'restrict';
};
type ContentMode = 'all' | 'real' | 'demo';
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
const reportReasonLabels: Record<ModerationReport['reason'], string> = {
  fraud: 'Подозрение на обман',
  spam: 'Спам или повтор',
  wrong_info: 'Неверная информация',
  unsafe: 'Опасный товар или услуга',
  other: 'Другая причина',
};
const depositResultLabels: Record<DepositResult, string> = {
  not_applicable: 'Залога не было',
  returned: 'Возвращён полностью',
  partially_withheld: 'Частично удержан',
  withheld: 'Удержан полностью',
};
const businessProfileLabels: Record<BusinessProfileType, string> = {
  farm: 'Фермерское хозяйство',
  company: 'Компания',
  store: 'Магазин или склад',
  service_company: 'Сервисная компания',
};
const formatActivityDate = (timestamp: number) =>
  new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
const formatJoinedDate = (timestamp: number) =>
  new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(timestamp));
const formatBookingDate = (date: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${date}T12:00:00`));
const formatTenge = (amount: number) => `${amount.toLocaleString('ru-RU')} ₸`;
const livestockQuantityLabel = (quantity: number) => {
  const mod100 = quantity % 100;
  const mod10 = quantity % 10;
  const word =
    mod100 >= 11 && mod100 <= 14
      ? 'голов'
      : mod10 === 1
        ? 'голова'
        : mod10 >= 2 && mod10 <= 4
          ? 'головы'
          : 'голов';
  return `${quantity} ${word}`;
};
const livestockPriceModeLabels: Record<'all' | LivestockPriceMode, string> = {
  all: 'Любая цена',
  per_head: 'За одну голову',
  whole_group: 'За всю группу',
};
const livestockQuantityGroupLabels: Record<LivestockQuantityGroup, string> = {
  all: 'Любое количество',
  single: '1 голова',
  small_group: '2–10 голов',
  large_group: '11 и больше',
};
const parseCalendarDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
};
const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
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
  {
    id: 110,
    title: 'Табун лошадей — 12 голов',
    price: '7 800 000 ₸',
    unit: '/ всё стадо',
    location: 'Талдыкорган',
    region: 'Область Жетісу',
    distance: '16 км',
    category: 'Скот и животные',
    type: 'Продам',
    image:
      'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=900&q=80',
    owner: 'Демонстрация Qoldan',
    phone: '+7 700 000 00 00',
    sellerType: 'Частное лицо',
    livestockType: 'Лошади',
    livestockQuantity: 12,
    livestockPriceMode: 'whole_group',
    livestockBreed: 'Казахская порода',
    description:
      'Пример объявления о продаже группы животных. Контакты и цена указаны только для демонстрации функции.',
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
  const [savedSearches, setSavedSearches] = useState<SavedSearchItem[]>([]);
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
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewTarget, setReviewTarget] = useState<BookingItem | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [serviceReviewTarget, setServiceReviewTarget] =
    useState<RequestItem | null>(null);
  const [serviceReviewRating, setServiceReviewRating] = useState(5);
  const [serviceTrust, setServiceTrust] = useState<ServiceTrust>({
    serviceReviewCount: 0,
  });
  const [providerProfile, setProviderProfile] =
    useState<ProviderProfile | null>(null);
  const [providerLoading, setProviderLoading] = useState(false);
  const [providerError, setProviderError] = useState('');
  const [handoffTarget, setHandoffTarget] = useState<BookingItem | null>(null);
  const [bookingRange, setBookingRange] = useState<DateRange | undefined>();
  const [availabilityRanges, setAvailabilityRanges] = useState<
    AvailabilityRange[]
  >([]);
  const [availabilityState, setAvailabilityState] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversation, setActiveConversation] =
    useState<ConversationSummary | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [messagingUnreadCount, setMessagingUnreadCount] = useState(0);
  const [messagingLoading, setMessagingLoading] = useState(false);
  const [moderationReports, setModerationReports] = useState<
    ModerationReport[]
  >([]);
  const [moderationActions, setModerationActions] = useState<
    ModerationAction[]
  >([]);
  const [appeals, setAppeals] = useState<AppealItem[]>([]);
  const [moderationAppeals, setModerationAppeals] = useState<
    ModerationAppeal[]
  >([]);
  const [businessVerification, setBusinessVerification] =
    useState<BusinessVerification | null>(null);
  const [moderationVerifications, setModerationVerifications] = useState<
    ModerationVerification[]
  >([]);
  const [appealTarget, setAppealTarget] = useState<AppealTarget | null>(null);
  const [appealNotes, setAppealNotes] = useState<Record<string, string>>({});
  const [moderationNotes, setModerationNotes] = useState<
    Record<string, string>
  >({});
  const [verificationNotes, setVerificationNotes] = useState<
    Record<string, string>
  >({});
  const [moderationFilter, setModerationFilter] = useState<
    | 'active'
    | 'appeals'
    | 'verifications'
    | 'journal'
    | ModerationReport['status']
  >('active');
  const [moderationLoading, setModerationLoading] = useState(false);
  const [canModerate, setCanModerate] = useState(false);
  const [moderationPendingCount, setModerationPendingCount] = useState(0);
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
    | 'provider'
    | 'saved-searches'
    | 'verification'
    | 'notifications'
    | 'messages'
    | 'info'
    | 'booking'
    | 'bookings'
    | 'review'
    | 'service-review'
    | 'handover'
    | 'report'
    | 'appeal'
    | 'appeals'
    | 'moderation'
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
  const [listingContentMode, setListingContentMode] =
    useState<ContentMode>('all');
  const [selectedRegion, setSelectedRegion] = useState('Весь Казахстан');
  const [deliveryOnly, setDeliveryOnly] = useState(false);
  const [companyOnly, setCompanyOnly] = useState(false);
  const [listingImage, setListingImage] = useState('');
  const [listingFlow, setListingFlow] = useState<'standard' | 'livestock'>(
    'standard',
  );
  const [livestockTypeFilter, setLivestockTypeFilter] = useState<
    'Все виды' | LivestockType
  >('Все виды');
  const [livestockPriceModeFilter, setLivestockPriceModeFilter] = useState<
    'all' | LivestockPriceMode
  >('all');
  const [livestockQuantityGroup, setLivestockQuantityGroup] =
    useState<LivestockQuantityGroup>('all');
  const [listingCoords, setListingCoords] = useState<Coordinates | null>(null);
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [userLocationLoading, setUserLocationLoading] = useState(false);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [requestKind, setRequestKind] = useState<'all' | RequestItem['kind']>(
    'all',
  );
  const [requestOwnerOnly, setRequestOwnerOnly] = useState(false);
  const [requestContentMode, setRequestContentMode] =
    useState<ContentMode>('all');
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
  const calendarToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }, []);
  const occupiedCalendarRanges = useMemo(
    () =>
      availabilityRanges.map((range) => ({
        from: parseCalendarDate(range.dateFrom),
        to: parseCalendarDate(range.dateTo),
      })),
    [availabilityRanges],
  );
  const selectedResponses = selectedRequest
    ? allResponses.filter(
        (response) => response.requestId === String(selectedRequest.id),
      )
    : [];
  const activeRequestSelection =
    selectedRequest?.selection &&
    selectedRequest.selection.status !== 'cancelled'
      ? selectedRequest.selection
      : null;
  const selectedListingReviews = selectedListing
    ? reviews.filter(
        (review) => review.listingId === String(selectedListing.id),
      )
    : [];
  const visibleModerationReports = moderationReports.filter((report) =>
    moderationFilter === 'active'
      ? report.status !== 'closed'
      : moderationFilter === 'journal'
        ? false
        : report.status === moderationFilter,
  );
  const realListingCount = allListings.filter(
    (listing) => !isDemoListing(listing.id),
  ).length;
  const demoListingCount = allListings.length - realListingCount;
  const realRequestCount = allRequests.filter(
    (request) => !isDemoRequest(request.id),
  ).length;
  const demoRequestCount = allRequests.length - realRequestCount;
  const activeFilterCount = [
    categoryFilter !== 'Все категории',
    maxDistance < 100 && selectedRegion !== 'Весь Казахстан',
    deliveryOnly,
    companyOnly,
    myOnly,
    listingContentMode !== 'all',
    livestockTypeFilter !== 'Все виды',
    livestockPriceModeFilter !== 'all',
    livestockQuantityGroup !== 'all',
    Boolean(userCoords),
  ].filter(Boolean).length;
  const savedSearchNewCount = savedSearches.reduce(
    (total, item) => total + item.newMatches,
    0,
  );
  const hasSavableSearch =
    !userCoords &&
    Boolean(
      query.trim() ||
      type !== 'Все' ||
      categoryFilter !== 'Все категории' ||
      selectedRegion !== 'Весь Казахстан' ||
      deliveryOnly ||
      companyOnly ||
      livestockTypeFilter !== 'Все виды' ||
      livestockPriceModeFilter !== 'all' ||
      livestockQuantityGroup !== 'all',
    );
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
          savedSearches: SavedSearchItem[];
          responses: ResponseItem[];
          bookings: BookingItem[];
          reviews: ReviewItem[];
          verification: BusinessVerification | null;
          appeals: AppealItem[];
          activities: ActivityItem[];
          moderation: { canModerate: boolean; pendingCount: number };
          messaging: { unreadCount: number };
          trust: ServiceTrust;
        };
        if (!active) return;
        setAllListings([...data.listings, ...defaultListings]);
        setAllRequests([...data.requests, ...initialRequests]);
        setFavorites(data.favorites.map(String));
        setSavedSearches(data.savedSearches);
        setAllResponses(data.responses);
        setBookings(data.bookings);
        setReviews(data.reviews);
        setBusinessVerification(data.verification);
        setAppeals(data.appeals);
        setActivities(data.activities);
        setCanModerate(data.moderation.canModerate);
        setModerationPendingCount(data.moderation.pendingCount);
        setMessagingUnreadCount(data.messaging.unreadCount);
        setServiceTrust(data.trust);
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
  useEffect(() => {
    if (modal !== 'messages') return;
    let active = true;
    const refreshMessages = async () => {
      try {
        const conversationResponse = await fetch('/api/conversations', {
          cache: 'no-store',
        });
        if (!conversationResponse.ok || !active) return;
        const conversationData = (await conversationResponse.json()) as {
          conversations: ConversationSummary[];
        };
        if (!active) return;
        let nextConversations = conversationData.conversations;
        if (activeConversation) {
          const messageResponse = await fetch(
            `/api/conversations/${encodeURIComponent(activeConversation.id)}/messages`,
            { cache: 'no-store' },
          );
          if (messageResponse.ok && active) {
            const messageData = (await messageResponse.json()) as {
              messages: ChatMessage[];
            };
            setChatMessages(messageData.messages);
            nextConversations = nextConversations.map((conversation) =>
              conversation.id === activeConversation.id
                ? { ...conversation, unreadCount: 0 }
                : conversation,
            );
            const refreshedActive = nextConversations.find(
              (conversation) => conversation.id === activeConversation.id,
            );
            if (refreshedActive) setActiveConversation(refreshedActive);
          }
        }
        setConversations(nextConversations);
        setMessagingUnreadCount(
          nextConversations.reduce(
            (total, conversation) => total + conversation.unreadCount,
            0,
          ),
        );
      } catch {
        // The current thread stays usable if a background refresh misses a beat.
      }
    };
    const refreshTimer = window.setInterval(() => {
      void refreshMessages();
    }, 12_000);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, [modal, activeConversation]);
  const distanceFromUser = (listing: Listing) =>
    userCoords
      ? calculateDistanceKm(userCoords, resolveCoordinates(listing))
      : null;
  const listingDistanceLabel = (listing: Listing) => {
    const distance = distanceFromUser(listing);
    if (distance !== null) {
      return `${hasExactCoordinates(listing) ? '' : '≈ '}${formatDistanceKm(distance)}`;
    }
    if (listing.distance !== 'Рядом') return listing.distance;
    return hasExactCoordinates(listing) ? 'точка указана' : 'место указано';
  };
  const filtered = useMemo(
    () =>
      allListings
        .filter(
          (i) =>
            (i.title.toLowerCase().includes(query.toLowerCase()) ||
              i.category.toLowerCase().includes(query.toLowerCase()) ||
              i.location.toLowerCase().includes(query.toLowerCase()) ||
              i.region?.toLowerCase().includes(query.toLowerCase()) ||
              i.description?.toLowerCase().includes(query.toLowerCase()) ||
              i.livestockType?.toLowerCase().includes(query.toLowerCase()) ||
              i.livestockBreed?.toLowerCase().includes(query.toLowerCase())) &&
            (type === 'Все' || i.type === type) &&
            (categoryFilter === 'Все категории' ||
              i.category === categoryFilter) &&
            (selectedRegion === 'Весь Казахстан' ||
              i.region === selectedRegion) &&
            (!userCoords ||
              calculateDistanceKm(userCoords, resolveCoordinates(i)) <=
                maxDistance) &&
            (!favoriteOnly || favorites.includes(String(i.id))) &&
            (!myOnly || i.mine) &&
            (myOnly ||
              listingContentMode === 'all' ||
              (listingContentMode === 'real'
                ? !isDemoListing(i.id)
                : isDemoListing(i.id))) &&
            (myOnly || i.status !== 'paused') &&
            (!deliveryOnly || i.delivery) &&
            (!companyOnly ||
              i.sellerType === 'Компания' ||
              i.sellerType === 'Магазин') &&
            (livestockTypeFilter === 'Все виды' ||
              i.livestockType === livestockTypeFilter) &&
            (livestockPriceModeFilter === 'all' ||
              i.livestockPriceMode === livestockPriceModeFilter) &&
            (livestockQuantityGroup === 'all' ||
              (livestockQuantityGroup === 'single' &&
                i.livestockQuantity === 1) ||
              (livestockQuantityGroup === 'small_group' &&
                i.livestockQuantity !== undefined &&
                i.livestockQuantity >= 2 &&
                i.livestockQuantity <= 10) ||
              (livestockQuantityGroup === 'large_group' &&
                i.livestockQuantity !== undefined &&
                i.livestockQuantity >= 11)),
        )
        .sort((a, b) => {
          if (!userCoords) return 0;
          return (
            calculateDistanceKm(userCoords, resolveCoordinates(a)) -
            calculateDistanceKm(userCoords, resolveCoordinates(b))
          );
        }),
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
      listingContentMode,
      livestockTypeFilter,
      livestockPriceModeFilter,
      livestockQuantityGroup,
      userCoords,
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
          (requestOwnerOnly ||
            requestContentMode === 'all' ||
            (requestContentMode === 'real'
              ? !isDemoRequest(request.id)
              : isDemoRequest(request.id))) &&
          (requestOwnerOnly || request.status !== 'closed'),
      ),
    [
      allRequests,
      requestKind,
      requestOwnerOnly,
      requestContentMode,
      selectedRegion,
    ],
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
  const saveCurrentSearch = async () => {
    if (!hasSavableSearch) {
      notify('Сначала задайте запрос, регион или фильтр');
      return;
    }
    const name = [
      query.trim() ? `«${query.trim()}»` : '',
      type !== 'Все' ? type : '',
      categoryFilter !== 'Все категории' ? categoryFilter : '',
      selectedRegion !== 'Весь Казахстан' ? selectedRegion : '',
      deliveryOnly ? 'С доставкой' : '',
      companyOnly ? 'Компании' : '',
      livestockTypeFilter !== 'Все виды' ? livestockTypeFilter : '',
      livestockPriceModeFilter !== 'all'
        ? livestockPriceModeLabels[livestockPriceModeFilter]
        : '',
      livestockQuantityGroup !== 'all'
        ? livestockQuantityGroupLabels[livestockQuantityGroup]
        : '',
    ]
      .filter(Boolean)
      .join(' · ')
      .slice(0, 120);
    setSubmitting('saved-search-create');
    try {
      const response = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name,
          query: query.trim(),
          region: selectedRegion,
          category: categoryFilter,
          offerType: type,
          deliveryOnly,
          companyOnly,
          livestockType: livestockTypeFilter,
          livestockPriceMode: livestockPriceModeFilter,
          livestockQuantityGroup,
        }),
      });
      if (!response.ok) throw new Error(await apiError(response));
      const data = (await response.json()) as {
        savedSearch: SavedSearchItem;
      };
      setSavedSearches((current) => [data.savedSearch, ...current]);
      notify('Поиск сохранён — новые объявления появятся в уведомлениях');
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Не удалось сохранить поиск',
      );
    } finally {
      setSubmitting(null);
    }
  };
  const applySavedSearch = async (savedSearch: SavedSearchItem) => {
    setUserCoords(null);
    setQuery(savedSearch.query);
    setType(savedSearch.offerType);
    setCategoryFilter(savedSearch.category);
    setSelectedRegion(savedSearch.region);
    setDeliveryOnly(savedSearch.deliveryOnly);
    setCompanyOnly(savedSearch.companyOnly);
    setLivestockTypeFilter(savedSearch.livestockType);
    setLivestockPriceModeFilter(savedSearch.livestockPriceMode);
    setLivestockQuantityGroup(savedSearch.livestockQuantityGroup);
    setMaxDistance(100);
    setFavoriteOnly(false);
    setMyOnly(false);
    setListingContentMode('real');
    setFiltersOpen(false);
    setModal(null);
    window.setTimeout(
      () =>
        document
          .querySelector('#catalog')
          ?.scrollIntoView({ behavior: 'smooth' }),
      0,
    );
    try {
      const response = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_seen',
          savedSearchId: savedSearch.id,
        }),
      });
      if (!response.ok) throw new Error(await apiError(response));
      const data = (await response.json()) as { viewedAt: number };
      setSavedSearches((current) =>
        current.map((item) =>
          item.id === savedSearch.id
            ? { ...item, newMatches: 0, lastViewedAt: data.viewedAt }
            : item,
        ),
      );
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Не удалось отметить поиск просмотренным',
      );
    }
  };
  const deleteSavedSearch = async (savedSearchId: string) => {
    setSubmitting(`saved-search-delete-${savedSearchId}`);
    try {
      const response = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'delete', savedSearchId }),
      });
      if (!response.ok) throw new Error(await apiError(response));
      setSavedSearches((current) =>
        current.filter((item) => item.id !== savedSearchId),
      );
      notify('Сохранённый поиск удалён');
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Не удалось удалить поиск',
      );
    } finally {
      setSubmitting(null);
    }
  };
  const openAddListing = () => {
    setListingImage('');
    setListingFlow('standard');
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
  const toggleNearbyMode = () => {
    if (userCoords) {
      setUserCoords(null);
      setMaxDistance(100);
      notify('Режим «Рядом со мной» выключен');
      return;
    }
    if (!navigator.geolocation) {
      notify('Геопозиция не поддерживается этим устройством');
      return;
    }
    setUserLocationLoading(true);
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
          setUserLocationLoading(false);
          notify('Сейчас режим работает только на территории Казахстана');
          return;
        }
        setUserCoords({ latitude, longitude });
        setSelectedRegion('Весь Казахстан');
        setMaxDistance(50);
        setUserLocationLoading(false);
        notify('Сначала показываем ближайшие предложения');
      },
      () => {
        setUserLocationLoading(false);
        notify(
          'Не удалось получить точку — поиск по региону продолжает работать',
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  };
  const openListing = (item: Listing) => {
    setSelectedListing(item);
    setModal('detail');
  };
  const openProviderProfile = async (providerId?: string) => {
    if (!providerId) {
      notify('У демонстрационного примера нет реального профиля');
      return;
    }
    setProviderProfile(null);
    setProviderError('');
    setProviderLoading(true);
    setModal('provider');
    try {
      const response = await fetch(
        `/api/providers/${encodeURIComponent(providerId)}`,
        { cache: 'no-store' },
      );
      if (!response.ok) throw new Error(await apiError(response));
      const data = (await response.json()) as { profile: ProviderProfile };
      setProviderProfile(data.profile);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Не удалось открыть профиль';
      setProviderError(message);
      notify(message);
    } finally {
      setProviderLoading(false);
    }
  };
  const openConversation = async (conversation: ConversationSummary) => {
    setActiveConversation(conversation);
    setChatMessages([]);
    setMessagingLoading(true);
    try {
      const response = await fetch(
        `/api/conversations/${encodeURIComponent(conversation.id)}/messages`,
        { cache: 'no-store' },
      );
      if (!response.ok) throw new Error(await apiError(response));
      const data = (await response.json()) as { messages: ChatMessage[] };
      setChatMessages(data.messages);
      setConversations((current) =>
        current.map((item) =>
          item.id === conversation.id ? { ...item, unreadCount: 0 } : item,
        ),
      );
      if (conversation.unreadCount > 0) {
        setMessagingUnreadCount((current) =>
          Math.max(0, current - conversation.unreadCount),
        );
      }
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Не удалось открыть диалог',
      );
    } finally {
      setMessagingLoading(false);
    }
  };
  const openMessages = async (conversationId?: string) => {
    setModal('messages');
    setMessagingLoading(true);
    if (!conversationId) {
      setActiveConversation(null);
      setChatMessages([]);
    }
    try {
      const response = await fetch('/api/conversations', { cache: 'no-store' });
      if (!response.ok) throw new Error(await apiError(response));
      const data = (await response.json()) as {
        conversations: ConversationSummary[];
      };
      setConversations(data.conversations);
      const selected = conversationId
        ? data.conversations.find((item) => item.id === conversationId)
        : null;
      if (selected) await openConversation(selected);
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Не удалось загрузить сообщения',
      );
    } finally {
      setMessagingLoading(false);
    }
  };
  const startConversation = async (
    targetType: ConversationSummary['contextType'],
    targetId: string,
  ) => {
    setSubmitting(`conversation-${targetType}-${targetId}`);
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ targetType, targetId }),
      });
      if (!response.ok) throw new Error(await apiError(response));
      const data = (await response.json()) as {
        conversation: ConversationSummary;
      };
      setConversations((current) => [
        data.conversation,
        ...current.filter((item) => item.id !== data.conversation.id),
      ]);
      setModal('messages');
      await openConversation(data.conversation);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Не удалось начать диалог',
      );
    } finally {
      setSubmitting(null);
    }
  };
  const sendChatMessage = async (event: SubmitFormEvent) => {
    event.preventDefault();
    if (!activeConversation) return;
    const formElement = event.currentTarget;
    const body = fieldText(new FormData(formElement), 'body').trim();
    if (!body) return;
    setSubmitting('chat-message');
    try {
      const response = await fetch(
        `/api/conversations/${encodeURIComponent(activeConversation.id)}/messages`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ body }),
        },
      );
      if (!response.ok) throw new Error(await apiError(response));
      const data = (await response.json()) as { message: ChatMessage };
      setChatMessages((current) => [...current, data.message]);
      setConversations((current) =>
        current
          .map((item) =>
            item.id === activeConversation.id
              ? {
                  ...item,
                  lastMessage: data.message.body,
                  lastMessageAt: data.message.createdAt,
                  updatedAt: data.message.createdAt,
                }
              : item,
          )
          .sort((a, b) => b.updatedAt - a.updatedAt),
      );
      formElement.reset();
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Не удалось отправить сообщение',
      );
    } finally {
      setSubmitting(null);
    }
  };
  const openReport = (target: ReportTarget) => {
    setReportTarget(target);
    setModal('report');
  };
  const openAppeal = (activity: ActivityItem) => {
    if (
      !activity.moderationActionId ||
      (activity.moderationAction !== 'warn' &&
        activity.moderationAction !== 'restrict')
    ) {
      return;
    }
    setAppealTarget({
      moderationActionId: activity.moderationActionId,
      targetTitle: activity.targetTitle || activity.title,
      action: activity.moderationAction,
    });
    setModal('appeal');
  };
  const submitAppeal = async (event: SubmitFormEvent) => {
    event.preventDefault();
    if (!appealTarget) return;
    const form = new FormData(event.currentTarget);
    const message = fieldText(form, 'message').trim();
    setSubmitting('appeal');
    try {
      const response = await fetch('/api/appeals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          moderationActionId: appealTarget.moderationActionId,
          message,
        }),
      });
      if (!response.ok) throw new Error(await apiError(response));
      const data = (await response.json()) as { appeal: AppealItem };
      setAppeals((current) => [data.appeal, ...current]);
      setActivities((current) =>
        current.map((activity) =>
          activity.moderationActionId === data.appeal.moderationActionId
            ? {
                ...activity,
                appealId: data.appeal.id,
                appealStatus: data.appeal.status,
              }
            : activity,
        ),
      );
      setAppealTarget(null);
      setModal('appeals');
      notify('Апелляция отправлена команде Qoldan');
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Не удалось отправить апелляцию',
      );
    } finally {
      setSubmitting(null);
    }
  };
  const openModeration = async () => {
    setModal('moderation');
    setModerationLoading(true);
    try {
      const response = await fetch('/api/moderation/reports', {
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(await apiError(response));
      const data = (await response.json()) as {
        reports: ModerationReport[];
        actions: ModerationAction[];
        appeals: ModerationAppeal[];
        verifications: ModerationVerification[];
      };
      setModerationReports(data.reports);
      setModerationActions(data.actions);
      setModerationAppeals(data.appeals);
      setModerationVerifications(data.verifications);
      setModerationNotes(
        Object.fromEntries(
          data.reports.map((report) => [report.id, report.reviewNote]),
        ),
      );
      setAppealNotes(
        Object.fromEntries(
          data.appeals.map((appeal) => [appeal.id, appeal.resolutionNote]),
        ),
      );
      setVerificationNotes(
        Object.fromEntries(
          data.verifications.map((verification) => [
            verification.id,
            verification.reviewNote,
          ]),
        ),
      );
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Не удалось загрузить очередь модерации',
      );
    } finally {
      setModerationLoading(false);
    }
  };
  const submitBusinessVerification = async (event: SubmitFormEvent) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setSubmitting('business-verification');
    try {
      const response = await fetch('/api/verifications', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          profileType: fieldText(fields, 'profileType'),
          organizationName: fieldText(fields, 'organizationName'),
          bin: fieldText(fields, 'bin').replace(/\D/g, ''),
          phone: fieldText(fields, 'phone'),
          region: fieldText(fields, 'region'),
          referenceUrl: fieldText(fields, 'referenceUrl'),
          note: fieldText(fields, 'note'),
        }),
      });
      if (!response.ok) throw new Error(await apiError(response));
      const data = (await response.json()) as {
        verification: BusinessVerification;
      };
      setBusinessVerification(data.verification);
      if (canModerate) {
        setModerationPendingCount((current) => current + 1);
      }
      setModal('profile');
      notify('Заявка на подтверждение бизнеса отправлена');
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Не удалось отправить данные на проверку',
      );
    } finally {
      setSubmitting(null);
    }
  };
  const updateBusinessVerification = async (
    verificationId: string,
    status: 'verified' | 'rejected',
  ) => {
    const reviewNote = (verificationNotes[verificationId] || '').trim();
    if (reviewNote.length < 5) {
      notify('Добавьте короткое объяснение решения');
      return;
    }
    setSubmitting(`business-verification-${verificationId}`);
    try {
      const response = await fetch('/api/moderation/verifications', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ verificationId, status, reviewNote }),
      });
      if (!response.ok) throw new Error(await apiError(response));
      const data = (await response.json()) as {
        verification: Pick<
          ModerationVerification,
          'id' | 'status' | 'reviewNote' | 'reviewerName' | 'reviewedAt'
        >;
      };
      setModerationVerifications((current) =>
        current.map((verification) =>
          verification.id === data.verification.id
            ? { ...verification, ...data.verification }
            : verification,
        ),
      );
      setModerationPendingCount((current) => Math.max(0, current - 1));
      notify(
        status === 'verified'
          ? 'Бизнес-профиль подтверждён'
          : 'Запрос на уточнение сохранён',
      );
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Не удалось сохранить решение по бизнес-профилю',
      );
    } finally {
      setSubmitting(null);
    }
  };
  const updateModerationAppeal = async (
    appealId: string,
    status: 'reviewing' | 'approved' | 'rejected',
  ) => {
    const resolutionNote = (appealNotes[appealId] || '').trim();
    if (status !== 'reviewing' && resolutionNote.length < 5) {
      notify('Добавьте короткое объяснение итогового решения');
      return;
    }
    setSubmitting(`moderation-appeal-${appealId}`);
    try {
      const response = await fetch('/api/moderation/appeals', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ appealId, status, resolutionNote }),
      });
      if (!response.ok) throw new Error(await apiError(response));
      const data = (await response.json()) as {
        appeal: Pick<
          ModerationAppeal,
          'id' | 'status' | 'resolutionNote' | 'reviewerName' | 'reviewedAt'
        >;
        restorationAction: ModerationAction | null;
      };
      setModerationAppeals((current) =>
        current.map((appeal) =>
          appeal.id === data.appeal.id ? { ...appeal, ...data.appeal } : appeal,
        ),
      );
      if (data.restorationAction) {
        setModerationActions((current) => [
          data.restorationAction as ModerationAction,
          ...current,
        ]);
      }
      if (status === 'approved' || status === 'rejected') {
        setModerationPendingCount((current) => Math.max(0, current - 1));
      }
      notify(
        status === 'reviewing'
          ? 'Апелляция взята на проверку'
          : status === 'approved'
            ? 'Апелляция удовлетворена'
            : 'Итог по апелляции сохранён',
      );
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Не удалось обновить апелляцию',
      );
    } finally {
      setSubmitting(null);
    }
  };
  const updateModerationReport = async (
    reportId: string,
    status: 'reviewing' | 'closed',
  ) => {
    setSubmitting(`moderation-${reportId}`);
    try {
      const response = await fetch('/api/moderation/reports', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          reportId,
          status,
          reviewNote: moderationNotes[reportId] || '',
        }),
      });
      if (!response.ok) throw new Error(await apiError(response));
      const data = (await response.json()) as {
        report: Pick<
          ModerationReport,
          'id' | 'status' | 'reviewNote' | 'reviewerName' | 'reviewedAt'
        >;
      };
      setModerationReports((current) =>
        current.map((report) =>
          report.id === data.report.id ? { ...report, ...data.report } : report,
        ),
      );
      if (status === 'closed') {
        setModerationPendingCount((current) => Math.max(0, current - 1));
      }
      notify(
        status === 'closed'
          ? 'Жалоба закрыта и сохранена в истории'
          : 'Жалоба взята на проверку',
      );
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Не удалось обновить жалобу',
      );
    } finally {
      setSubmitting(null);
    }
  };
  const applyModerationAction = async (
    report: ModerationReport,
    action: ModerationAction['action'],
  ) => {
    const note = (moderationNotes[report.id] || '').trim();
    if (note.length < 5) {
      notify('Сначала добавьте короткую заметку с причиной решения');
      return;
    }
    setSubmitting(`moderation-action-${report.id}`);
    try {
      const response = await fetch('/api/moderation/actions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          reportId: report.id,
          targetType: report.targetType,
          targetId: report.targetId,
          action,
          note,
        }),
      });
      if (!response.ok) throw new Error(await apiError(response));
      const data = (await response.json()) as {
        action: ModerationAction;
        targetStatus: string;
      };
      setModerationActions((current) => [data.action, ...current]);
      setModerationReports((current) =>
        current.map((item) =>
          item.id === report.id
            ? {
                ...item,
                targetStatus: data.targetStatus,
                status: item.status === 'new' ? 'reviewing' : item.status,
              }
            : item,
        ),
      );
      notify(
        action === 'warn'
          ? 'Предупреждение отправлено автору'
          : action === 'restrict'
            ? 'Публикация скрыта и автор уведомлён'
            : 'Публикация восстановлена и автор уведомлён',
      );
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Не удалось применить действие модератора',
      );
    } finally {
      setSubmitting(null);
    }
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
  const resetLivestockFilters = () => {
    setLivestockTypeFilter('Все виды');
    setLivestockPriceModeFilter('all');
    setLivestockQuantityGroup('all');
  };
  const exploreDirection = (label: string) => {
    setQuery('');
    setType('Все');
    setCategoryFilter('Все категории');
    setDeliveryOnly(false);
    setCompanyOnly(false);
    setFavoriteOnly(false);
    setMyOnly(false);
    resetLivestockFilters();
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
          unit:
            listingFlow === 'livestock'
              ? fieldText(f, 'livestockPriceMode') === 'per_head'
                ? '/ голову'
                : '/ всё стадо'
              : fieldText(f, 'unit'),
          location: fieldText(f, 'location'),
          region: fieldText(f, 'region'),
          category:
            listingFlow === 'livestock'
              ? 'Скот и животные'
              : fieldText(f, 'category'),
          type: listingFlow === 'livestock' ? 'Продам' : fieldText(f, 'type'),
          imageUrl: upload.url,
          phone: fieldText(f, 'phone'),
          available:
            listingFlow === 'livestock'
              ? 'Продажа по договорённости'
              : fieldText(f, 'available', 'Доступно по договорённости'),
          description: fieldText(
            f,
            'description',
            'Новое предложение от пользователя Qoldan.',
          ),
          sellerType: fieldText(f, 'sellerType'),
          delivery: f.get('delivery') === 'on',
          latitude: listingCoords?.latitude,
          longitude: listingCoords?.longitude,
          livestockType:
            listingFlow === 'livestock'
              ? fieldText(f, 'livestockType')
              : undefined,
          livestockQuantity:
            listingFlow === 'livestock'
              ? Number(fieldText(f, 'livestockQuantity'))
              : undefined,
          livestockPriceMode:
            listingFlow === 'livestock'
              ? fieldText(f, 'livestockPriceMode')
              : undefined,
          livestockBreed:
            listingFlow === 'livestock'
              ? fieldText(f, 'livestockBreed')
              : undefined,
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
  const updateRequestSelection = async (
    action: 'select' | 'cancel' | 'complete',
    responseId?: string,
  ) => {
    if (!selectedRequest) return;
    setSubmitting(`request-selection-${action}`);
    try {
      const response = await fetch('/api/responses/selection', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          responseId,
          action,
        }),
      });
      if (!response.ok) throw new Error(await apiError(response));
      const data = (await response.json()) as {
        selection: RequestSelection;
        requestStatus: RequestItem['status'];
      };
      const updateItem = (item: RequestItem) =>
        String(item.id) === String(selectedRequest.id)
          ? {
              ...item,
              status: data.requestStatus,
              selection: data.selection,
            }
          : item;
      setAllRequests((current) => current.map(updateItem));
      setSelectedRequest((current) =>
        current ? updateItem(current) : current,
      );
      setAllResponses((current) =>
        current.map((item) =>
          item.requestId === String(selectedRequest.id)
            ? {
                ...item,
                selectionStatus:
                  item.id === data.selection.responseId
                    ? data.selection.status
                    : null,
              }
            : item,
        ),
      );
      if (action === 'select') {
        notify(`${data.selection.providerName} выбран исполнителем`);
        if (data.selection.conversationId) {
          await openMessages(data.selection.conversationId);
        }
      } else if (action === 'cancel') {
        notify('Выбор отменён — заявка снова принимает отклики');
      } else {
        notify('Работа отмечена выполненной');
      }
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Не удалось изменить выбор исполнителя',
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
  const loadBookingAvailability = async (listingId: string) => {
    setAvailabilityState('loading');
    try {
      const response = await fetch(
        `/api/bookings/availability?listingId=${encodeURIComponent(listingId)}`,
        { cache: 'no-store' },
      );
      if (!response.ok) throw new Error(await apiError(response));
      const result = (await response.json()) as {
        ranges: AvailabilityRange[];
      };
      setAvailabilityRanges(result.ranges);
      setAvailabilityState('ready');
    } catch (error) {
      setAvailabilityRanges([]);
      setAvailabilityState('error');
      notify(
        error instanceof Error
          ? error.message
          : 'Не удалось загрузить занятые даты',
      );
    }
  };
  const openBooking = () => {
    if (!selectedListing) return;
    setBookingRange(undefined);
    setAvailabilityRanges([]);
    setModal('booking');
    void loadBookingAvailability(String(selectedListing.id));
  };
  const submitBooking = async (e: SubmitFormEvent) => {
    e.preventDefault();
    if (!selectedListing) return;
    const data = new FormData(e.currentTarget);
    if (!bookingRange?.from) {
      notify('Выберите дату или период аренды в календаре');
      return;
    }
    const dateFrom = toIsoDate(bookingRange.from);
    const dateTo = toIsoDate(bookingRange.to || bookingRange.from);
    setSubmitting('booking');
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          listingId: selectedListing.id,
          dateFrom,
          dateTo,
          customerPhone: fieldText(data, 'customerPhone'),
          delivery: data.get('delivery') === 'on',
          comment: fieldText(data, 'comment'),
        }),
      });
      if (!response.ok) throw new Error(await apiError(response));
      const result = (await response.json()) as { booking: BookingItem };
      setBookings((previous) => [result.booking, ...previous]);
      setBookingRange(undefined);
      setModal(null);
      notify('Запрос на бронирование отправлен владельцу');
    } catch (error) {
      void loadBookingAvailability(String(selectedListing.id));
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
      const result = (await response.json()) as {
        autoDeclinedIds: string[];
      };
      setBookings((previous) =>
        previous.map((booking) =>
          booking.id === bookingId
            ? {
                ...booking,
                status,
              }
            : result.autoDeclinedIds.includes(booking.id)
              ? { ...booking, status: 'declined' }
              : booking,
        ),
      );
      notify(
        status === 'accepted'
          ? result.autoDeclinedIds.length > 0
            ? `Бронирование подтверждено, пересекающихся запросов отклонено: ${result.autoDeclinedIds.length}`
            : 'Бронирование подтверждено — даты теперь заняты'
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
  const openHandover = (booking: BookingItem) => {
    setHandoffTarget(booking);
    setModal('handover');
  };
  const submitHandover = async (event: SubmitFormEvent) => {
    event.preventDefault();
    if (!handoffTarget) return;
    const form = new FormData(event.currentTarget);
    const returning = Boolean(handoffTarget.handoff?.handedOverAt);
    setSubmitting('handover');
    try {
      const payload = returning
        ? {
            action: 'return',
            bookingId: handoffTarget.id,
            conditionIn: fieldText(form, 'conditionIn'),
            depositResult: fieldText(form, 'depositResult'),
            returnNote: fieldText(form, 'returnNote'),
          }
        : {
            action: 'handover',
            bookingId: handoffTarget.id,
            depositAmount: Number(fieldText(form, 'depositAmount', '0')),
            depositReceived: form.get('depositReceived') === 'on',
            conditionOut: fieldText(form, 'conditionOut'),
            equipmentList: fieldText(form, 'equipmentList'),
          };
      const response = await fetch('/api/bookings/handover', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await apiError(response));
      const result = (await response.json()) as {
        status: BookingItem['status'];
        completedAt?: number;
        handoff: RentalHandoff;
      };
      setBookings((current) =>
        current.map((booking) =>
          booking.id === handoffTarget.id
            ? {
                ...booking,
                status: result.status,
                completedAt: result.completedAt || booking.completedAt,
                handoff: result.handoff,
              }
            : booking,
        ),
      );
      setHandoffTarget(null);
      setModal('bookings');
      notify(
        returning
          ? 'Возврат зафиксирован — аренда завершена'
          : 'Передача зафиксирована и видна арендатору',
      );
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Не удалось сохранить акт',
      );
    } finally {
      setSubmitting(null);
    }
  };
  const openReview = (booking: BookingItem) => {
    setReviewTarget(booking);
    setReviewRating(5);
    setModal('review');
  };
  const submitReview = async (event: SubmitFormEvent) => {
    event.preventDefault();
    if (!reviewTarget) return;
    const form = new FormData(event.currentTarget);
    setSubmitting('review');
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          bookingId: reviewTarget.id,
          rating: reviewRating,
          comment: fieldText(form, 'comment').trim(),
        }),
      });
      if (!response.ok) throw new Error(await apiError(response));
      const data = (await response.json()) as { review: ReviewItem };
      const nextReviews = [data.review, ...reviews];
      const listingReviews = nextReviews.filter(
        (review) => review.listingId === data.review.listingId,
      );
      const rating = (
        listingReviews.reduce((sum, review) => sum + review.rating, 0) /
        listingReviews.length
      ).toFixed(1);
      setReviews(nextReviews);
      setBookings((current) =>
        current.map((booking) =>
          booking.id === reviewTarget.id
            ? { ...booking, canReview: false, review: data.review }
            : booking,
        ),
      );
      setAllListings((current) =>
        current.map((listing) =>
          String(listing.id) === data.review.listingId
            ? { ...listing, rating, reviewCount: listingReviews.length }
            : listing,
        ),
      );
      setSelectedListing((current) =>
        current && String(current.id) === data.review.listingId
          ? { ...current, rating, reviewCount: listingReviews.length }
          : current,
      );
      setReviewTarget(null);
      setModal('bookings');
      notify('Спасибо! Отзыв подтверждён завершённой арендой');
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Не удалось отправить отзыв',
      );
    } finally {
      setSubmitting(null);
    }
  };
  const openServiceReview = (request: RequestItem) => {
    setServiceReviewTarget(request);
    setServiceReviewRating(5);
    setModal('service-review');
  };
  const submitServiceReview = async (event: SubmitFormEvent) => {
    event.preventDefault();
    if (!serviceReviewTarget) return;
    const form = new FormData(event.currentTarget);
    setSubmitting('service-review');
    try {
      const response = await fetch('/api/request-reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          requestId: serviceReviewTarget.id,
          rating: serviceReviewRating,
          comment: fieldText(form, 'comment').trim(),
        }),
      });
      if (!response.ok) throw new Error(await apiError(response));
      const data = (await response.json()) as {
        review: RequestServiceReview;
        reputation: {
          providerId: string;
          rating: string;
          reviewCount: number;
        };
      };
      const updateRequestReview = (request: RequestItem): RequestItem =>
        String(request.id) === String(data.review.requestId) &&
        request.selection
          ? {
              ...request,
              selection: { ...request.selection, review: data.review },
            }
          : request;
      setAllRequests((current) => current.map(updateRequestReview));
      setSelectedRequest((current) =>
        current ? updateRequestReview(current) : current,
      );
      setAllResponses((current) =>
        current.map((item) =>
          item.ownerId === data.reputation.providerId
            ? {
                ...item,
                providerRating: data.reputation.rating,
                providerReviewCount: data.reputation.reviewCount,
              }
            : item,
        ),
      );
      setServiceReviewTarget(null);
      setModal('response');
      notify('Спасибо! Оценка подтверждена завершённой работой');
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Не удалось опубликовать отзыв',
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
            onClick={() => void openMessages()}
            aria-label={`Сообщения${messagingUnreadCount ? `, непрочитанных: ${messagingUnreadCount}` : ''}`}
          >
            <MessageCircle size={19} />
            {messagingUnreadCount > 0 && <i />}
          </button>
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
            {[
              'Комбайн',
              'Перфоратор',
              'Кирпич',
              'Сено',
              'Проектор',
              'Лошади',
            ].map((x) => (
              <button
                key={x}
                onClick={() => {
                  if (x === 'Лошади') {
                    setQuery('');
                    setCategoryFilter('Скот и животные');
                    resetLivestockFilters();
                    setLivestockTypeFilter('Лошади');
                  } else {
                    setQuery(x);
                  }
                  setFavoriteOnly(false);
                  setMyOnly(false);
                  document
                    .querySelector('#catalog')
                    ?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {x}
              </button>
            ))}
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
            [
              'livestock',
              Beef,
              'Скот и|животные',
              'Продайте одну голову или целое стадо простым объявлением',
              'Открыть раздел',
              'Скот и животные',
            ],
          ].map((c, i) => {
            const Icon = c[1] as typeof Tractor;
            return (
              <button
                key={i}
                className={'category-card ' + (c[0] as string)}
                onClick={() => {
                  if (c[5] === 'Скот и животные') {
                    setQuery('');
                    setType('Все');
                    setCategoryFilter('Скот и животные');
                    resetLivestockFilters();
                  } else {
                    setQuery(c[5] as string);
                  }
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
                  setUserCoords(null);
                  setSelectedRegion(r);
                  setMaxDistance(100);
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
                'Скот и животные',
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
          {!myOnly && !favoriteOnly && (
            <div className="data-source-bar">
              <div>
                <CheckCircle2 />
                <span>
                  <b>Прозрачная лента</b>
                  Настоящие публикации хранятся в общей базе. Примеры всегда
                  отмечены словом «ДЕМО».
                </span>
              </div>
              <div
                className="data-source-switch"
                aria-label="Источник объявлений"
              >
                {(
                  [
                    ['all', `Все · ${allListings.length}`],
                    ['real', `Реальные · ${realListingCount}`],
                    ['demo', `Демо · ${demoListingCount}`],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={listingContentMode === value ? 'active' : ''}
                    onClick={() => setListingContentMode(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
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
              <button
                className={`near-me-button ${userCoords ? 'active' : ''}`}
                type="button"
                disabled={userLocationLoading}
                aria-pressed={Boolean(userCoords)}
                onClick={toggleNearbyMode}
              >
                <Navigation />
                {userLocationLoading
                  ? 'Определяем…'
                  : userCoords
                    ? `Рядом · ${maxDistance} км`
                    : 'Рядом со мной'}
                {userCoords && <X />}
              </button>
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
              {!favoriteOnly && !myOnly && (
                <button
                  className="save-search-button"
                  type="button"
                  disabled={
                    !hasSavableSearch || submitting === 'saved-search-create'
                  }
                  title={
                    userCoords
                      ? 'Выключите «Рядом со мной»: точная геопозиция не сохраняется'
                      : hasSavableSearch
                        ? 'Получать новые реальные совпадения'
                        : 'Сначала задайте условие поиска'
                  }
                  onClick={() => void saveCurrentSearch()}
                >
                  <Bookmark />
                  {submitting === 'saved-search-create'
                    ? 'Сохраняем…'
                    : 'Сохранить поиск'}
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
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    if (e.target.value !== 'Скот и животные') {
                      resetLivestockFilters();
                    }
                  }}
                >
                  <option>Все категории</option>
                  {[...new Set(allListings.map((x) => x.category))].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label className="radius-filter">
                Радиус:{' '}
                <b>
                  {userCoords ? `${maxDistance} км` : 'сначала включите GPS'}
                </b>
                <input
                  type="range"
                  min="2"
                  max="100"
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(Number(e.target.value))}
                  disabled={!userCoords}
                />
                <small>
                  {userCoords
                    ? 'Точные точки считаются точно, остальные — приблизительно'
                    : 'Без геопозиции каталог фильтруется только по региону'}
                </small>
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
                  setListingContentMode('all');
                  resetLivestockFilters();
                  setUserCoords(null);
                }}
              >
                Сбросить
              </button>
            </div>
          )}
          {categoryFilter === 'Скот и животные' && (
            <div className="livestock-catalog-filters">
              <div className="livestock-filter-title">
                <span>
                  <Beef />
                </span>
                <div>
                  <b>Подберите животных</b>
                  <small>Три простых фильтра — без сложной анкеты</small>
                </div>
              </div>
              <label>
                Вид скота
                <select
                  value={livestockTypeFilter}
                  onChange={(e) =>
                    setLivestockTypeFilter(
                      e.target.value as 'Все виды' | LivestockType,
                    )
                  }
                >
                  <option>Все виды</option>
                  <option>Лошади</option>
                  <option>Крупный рогатый скот</option>
                  <option>Овцы</option>
                  <option>Козы</option>
                  <option>Верблюды</option>
                  <option>Другое</option>
                </select>
              </label>
              <label>
                Количество
                <select
                  value={livestockQuantityGroup}
                  onChange={(e) =>
                    setLivestockQuantityGroup(
                      e.target.value as LivestockQuantityGroup,
                    )
                  }
                >
                  {Object.entries(livestockQuantityGroupLabels).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label>
                Цена указана
                <select
                  value={livestockPriceModeFilter}
                  onChange={(e) =>
                    setLivestockPriceModeFilter(
                      e.target.value as 'all' | LivestockPriceMode,
                    )
                  }
                >
                  {Object.entries(livestockPriceModeLabels).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <button type="button" onClick={resetLivestockFilters}>
                <X /> Очистить
              </button>
            </div>
          )}
          {mapOpen ? (
            <MarketplaceMap
              markers={mapMarkers}
              fallbackCenter={userCoords || getRegionCenter(selectedRegion)}
              userCoordinates={userCoords}
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
                    {isDemoListing(item.id) && (
                      <span className="source-chip demo">ДЕМО · ПРИМЕР</span>
                    )}
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
                    {item.livestockQuantity && item.livestockType && (
                      <div className="livestock-tag">
                        <Beef />
                        {livestockQuantityLabel(item.livestockQuantity)} ·{' '}
                        {item.livestockType}
                      </div>
                    )}
                    <div className="price">
                      {item.price} <span>{item.unit}</span>
                    </div>
                    <div className="meta">
                      <span>
                        <MapPin size={14} />
                        {item.location} · {listingDistanceLabel(item)}
                      </span>
                      {item.rating && !isDemoListing(item.id) && (
                        <span className="rating">
                          <Star size={14} fill="currentColor" /> {item.rating}
                          {item.reviewCount ? ` · ${item.reviewCount}` : ''}
                        </span>
                      )}
                    </div>
                    {item.delivery && (
                      <div className="delivery-tag">
                        <Construction /> Есть доставка
                      </div>
                    )}
                    {item.verified && !isDemoListing(item.id) && (
                      <div className="verified">
                        <ShieldCheck size={14} /> Бизнес подтверждён Qoldan
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
                  setListingContentMode('all');
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
            <b>{realRequestCount}</b>
            <span>
              реальных заявок в общей базе
              <br />
              демо-примеров рядом: {demoRequestCount}
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
            <span className="live-dot">Обновляется автоматически</span>
          </div>
          {!requestOwnerOnly && (
            <div className="data-source-bar compact request-source-bar">
              <div>
                <CheckCircle2 />
                <span>
                  <b>Источник заявки виден сразу</b>
                  Демо-примеры не принадлежат реальным заказчикам.
                </span>
              </div>
              <div className="data-source-switch" aria-label="Источник заявок">
                {(
                  [
                    ['all', `Все · ${allRequests.length}`],
                    ['real', `Реальные · ${realRequestCount}`],
                    ['demo', `Демо · ${demoRequestCount}`],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={requestContentMode === value ? 'active' : ''}
                    onClick={() => setRequestContentMode(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
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
                    <em
                      className={`request-source-badge ${isDemoRequest(r.id) ? 'demo' : 'real'}`}
                    >
                      {isDemoRequest(r.id) ? 'ДЕМО-ПРИМЕР' : 'РЕАЛЬНАЯ'}
                    </em>
                    {r.selection && r.selection.status !== 'cancelled' ? (
                      <em className="inline-status selected-work">
                        {r.selection.status === 'completed'
                          ? 'Работа выполнена'
                          : r.selection.mineAsProvider
                            ? 'Вы выбраны'
                            : 'Исполнитель выбран'}
                      </em>
                    ) : r.mine && r.status === 'closed' ? (
                      <em className="inline-status">Закрыта</em>
                    ) : null}
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
            className={`app-modal ${modal === 'detail' ? 'detail-modal' : ''} ${modal === 'provider' ? 'provider-modal' : ''} ${modal === 'moderation' ? 'moderation-modal' : ''} ${modal === 'messages' ? 'messages-modal' : ''}`}
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
                  <div className="listing-mode-switch wide">
                    <button
                      type="button"
                      className={listingFlow === 'standard' ? 'active' : ''}
                      aria-pressed={listingFlow === 'standard'}
                      onClick={() => setListingFlow('standard')}
                    >
                      <PackageOpen />
                      <span>
                        <b>Обычное объявление</b>
                        <small>Техника, аренда, услуги и материалы</small>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={listingFlow === 'livestock' ? 'active' : ''}
                      aria-pressed={listingFlow === 'livestock'}
                      onClick={() => setListingFlow('livestock')}
                    >
                      <Beef />
                      <span>
                        <b>Скот или стадо</b>
                        <small>Одна голова или несколько животных</small>
                      </span>
                    </button>
                  </div>
                  {listingFlow === 'standard' ? (
                    <>
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
                    </>
                  ) : (
                    <div className="livestock-fields wide">
                      <div className="livestock-fields-head">
                        <span>
                          <Beef />
                        </span>
                        <div>
                          <b>Продажа животных</b>
                          <small>
                            Заполните четыре коротких поля — остальное как в
                            обычном объявлении
                          </small>
                        </div>
                      </div>
                      <label>
                        Вид скота
                        <select name="livestockType" required>
                          <option>Лошади</option>
                          <option>Крупный рогатый скот</option>
                          <option>Овцы</option>
                          <option>Козы</option>
                          <option>Верблюды</option>
                          <option>Другое</option>
                        </select>
                      </label>
                      <label>
                        Количество голов
                        <input
                          name="livestockQuantity"
                          type="number"
                          min="1"
                          max="10000"
                          defaultValue="1"
                          required
                        />
                      </label>
                      <label>
                        Как указана цена
                        <select name="livestockPriceMode" required>
                          <option value="per_head">За одну голову</option>
                          <option value="whole_group">За всё стадо</option>
                        </select>
                      </label>
                      <label>
                        Порода <small>необязательно</small>
                        <input
                          name="livestockBreed"
                          maxLength={120}
                          placeholder="Например, казахская белоголовая"
                        />
                      </label>
                    </div>
                  )}
                  <label className="wide">
                    Название
                    <input
                      name="title"
                      required
                      placeholder={
                        listingFlow === 'livestock'
                          ? 'Например, табун лошадей — 12 голов'
                          : 'Например, вспашка полей МТЗ-82'
                      }
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
                    {listingFlow === 'livestock' ? 'Цена, ₸' : 'Цена'}
                    <input
                      name="price"
                      type="number"
                      min="0"
                      required
                      placeholder="18000"
                    />
                  </label>
                  {listingFlow === 'standard' && (
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
                  )}
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
                    <input name="delivery" type="checkbox" />{' '}
                    {listingFlow === 'livestock'
                      ? 'Помогу с перевозкой'
                      : 'Возможна доставка или выезд'}
                  </label>
                  {listingFlow === 'standard' && (
                    <label className="wide">
                      Когда доступно
                      <input
                        name="available"
                        placeholder="Например, 2–7 сентября"
                      />
                    </label>
                  )}
                  <label className="wide">
                    Описание
                    <textarea
                      name="description"
                      rows={3}
                      placeholder={
                        listingFlow === 'livestock'
                          ? 'Возраст, состояние, документы и условия осмотра'
                          : 'Расскажите о состоянии, условиях и радиусе выезда'
                      }
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
                {isDemoRequest(selectedRequest.id) && (
                  <div className="demo-flow-note">
                    <CircleAlert />
                    <div>
                      <b>Это демонстрационный сценарий</b>
                      <span>
                        Такой заявки нет в общей базе и за ней не стоит реальный
                        заказчик. Цифра откликов показана только как пример
                        будущего мини-тендера.
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          openRequestForm(
                            selectedRequest.title,
                            selectedRequest.kind,
                          )
                        }
                      >
                        Создать похожую настоящую заявку <ArrowRight />
                      </button>
                    </div>
                  </div>
                )}
                {!isDemoRequest(selectedRequest.id) &&
                  activeRequestSelection && (
                    <section
                      className={`request-selection-card ${activeRequestSelection.status}`}
                    >
                      <span>
                        {activeRequestSelection.status === 'completed' ? (
                          <CheckCircle2 />
                        ) : (
                          <ShieldCheck />
                        )}
                      </span>
                      <div className="request-selection-copy">
                        <small>
                          {activeRequestSelection.status === 'completed'
                            ? 'РАБОТА ЗАВЕРШЕНА'
                            : activeRequestSelection.mineAsProvider
                              ? 'ВАС ВЫБРАЛИ ИСПОЛНИТЕЛЕМ'
                              : 'ИСПОЛНИТЕЛЬ ВЫБРАН'}
                        </small>
                        <h3>{activeRequestSelection.providerName}</h3>
                        <p>
                          Предложение: <b>{activeRequestSelection.price}</b>
                          {activeRequestSelection.status === 'completed' &&
                          activeRequestSelection.completedAt
                            ? ` · завершено ${formatActivityDate(activeRequestSelection.completedAt)}`
                            : ' · заявка закрыта для новых откликов'}
                        </p>
                      </div>
                      <div className="request-selection-actions">
                        <button
                          type="button"
                          className="selection-profile"
                          onClick={() =>
                            void openProviderProfile(
                              activeRequestSelection.providerId,
                            )
                          }
                        >
                          <UserRound /> Профиль исполнителя
                        </button>
                        {activeRequestSelection.conversationId && (
                          <button
                            type="button"
                            className="selection-chat"
                            onClick={() =>
                              void openMessages(
                                activeRequestSelection.conversationId,
                              )
                            }
                          >
                            <MessageCircle /> Открыть диалог
                          </button>
                        )}
                        {selectedRequest.mine &&
                          activeRequestSelection.status === 'selected' && (
                            <>
                              <button
                                type="button"
                                className="selection-complete"
                                disabled={
                                  submitting === 'request-selection-complete'
                                }
                                onClick={() =>
                                  void updateRequestSelection('complete')
                                }
                              >
                                <CheckCircle2 /> Работа выполнена
                              </button>
                              <button
                                type="button"
                                className="selection-cancel"
                                disabled={
                                  submitting === 'request-selection-cancel'
                                }
                                onClick={() =>
                                  void updateRequestSelection('cancel')
                                }
                              >
                                Отменить выбор
                              </button>
                            </>
                          )}
                        {selectedRequest.mine &&
                          activeRequestSelection.status === 'completed' &&
                          !activeRequestSelection.review && (
                            <button
                              type="button"
                              className="selection-review"
                              onClick={() => openServiceReview(selectedRequest)}
                            >
                              <Star fill="currentColor" /> Оценить исполнителя
                            </button>
                          )}
                      </div>
                      {activeRequestSelection.review && (
                        <div className="request-service-review">
                          <span>
                            <Star fill="currentColor" />
                            {activeRequestSelection.review.rating}/5
                          </span>
                          <div>
                            <b>Проверенный отзыв о работе</b>
                            <p>
                              {activeRequestSelection.review.comment ||
                                'Заказчик подтвердил выполнение без дополнительного комментария.'}
                            </p>
                            <small>
                              {activeRequestSelection.review.reviewer} ·{' '}
                              {formatActivityDate(
                                activeRequestSelection.review.createdAt,
                              )}
                            </small>
                          </div>
                        </div>
                      )}
                    </section>
                  )}
                {!isDemoRequest(selectedRequest.id) &&
                selectedResponses.length > 0 ? (
                  <div className="bid-list">
                    {selectedResponses.map((response) => (
                      <div
                        key={response.id}
                        className={
                          activeRequestSelection?.responseId === response.id
                            ? 'selected-bid'
                            : ''
                        }
                      >
                        <span>{response.owner.slice(0, 1).toUpperCase()}</span>
                        <div className="bid-provider">
                          <button
                            type="button"
                            className="bid-provider-link"
                            onClick={() =>
                              void openProviderProfile(response.ownerId)
                            }
                          >
                            {response.owner}
                          </button>
                          <small>
                            {response.providerReviewCount > 0
                              ? `★ ${response.providerRating} · ${response.providerReviewCount} проверенных ${response.providerReviewCount === 1 ? 'работа' : 'работ'} `
                              : 'Новый исполнитель'}
                          </small>
                        </div>
                        <em>{response.price}</em>
                        <small className="bid-message">
                          {response.message || 'Готов обсудить детали заказа'}
                        </small>
                        {activeRequestSelection?.responseId === response.id && (
                          <strong className="bid-selected-label">
                            <CheckCircle2 />
                            {activeRequestSelection.status === 'completed'
                              ? 'Работа завершена'
                              : 'Выбран'}
                          </strong>
                        )}
                        {selectedRequest.mine &&
                          !activeRequestSelection &&
                          selectedRequest.status !== 'closed' && (
                            <button
                              disabled={
                                submitting === 'request-selection-select'
                              }
                              onClick={() =>
                                void updateRequestSelection(
                                  'select',
                                  response.id,
                                )
                              }
                            >
                              {submitting === 'request-selection-select'
                                ? 'Выбираем…'
                                : 'Выбрать исполнителя'}
                            </button>
                          )}
                      </div>
                    ))}
                  </div>
                ) : !isDemoRequest(selectedRequest.id) &&
                  selectedRequest.responses > 0 &&
                  !selectedRequest.mine ? (
                  <div className="demo-contact">
                    <b>{selectedRequest.responses} откликов уже получено</b>
                    <span>
                      Их детали доступны автору заявки. Добавьте своё
                      предложение ниже.
                    </span>
                  </div>
                ) : null}
                {!selectedRequest.mine &&
                  !isDemoRequest(selectedRequest.id) &&
                  selectedRequest.status !== 'closed' &&
                  !activeRequestSelection && (
                    <button
                      className="chat-request-button"
                      type="button"
                      onClick={() =>
                        void startConversation(
                          'request',
                          String(selectedRequest.id),
                        )
                      }
                      disabled={
                        submitting ===
                        `conversation-request-${String(selectedRequest.id)}`
                      }
                    >
                      <MessageCircle />
                      {submitting ===
                      `conversation-request-${String(selectedRequest.id)}`
                        ? 'Открываем диалог…'
                        : 'Написать заказчику в Qoldan'}
                    </button>
                  )}
                {selectedRequest.mine && !activeRequestSelection ? (
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
                ) : isDemoRequest(selectedRequest.id) ||
                  selectedRequest.mine ||
                  activeRequestSelection ? null : selectedResponses.some(
                    (response) => response.mine,
                  ) ? (
                  <div className="response-already-sent">
                    <CheckCircle2 />
                    <div>
                      <b>Ваш отклик уже отправлен</b>
                      <span>
                        Заказчик видит вашу цену и комментарий. Повторный отклик
                        не нужен — детали можно обсудить в сообщениях.
                      </span>
                    </div>
                  </div>
                ) : selectedRequest.status === 'closed' ? null : (
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
                  {isDemoListing(selectedListing.id) && (
                    <span className="source-chip demo detail-source-chip">
                      ДЕМО · ПРИМЕР
                    </span>
                  )}
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
                    {selectedListing.livestockQuantity &&
                      selectedListing.livestockType && (
                        <span>
                          <Beef />
                          {livestockQuantityLabel(
                            selectedListing.livestockQuantity,
                          )}{' '}
                          · {selectedListing.livestockType}
                          {selectedListing.livestockBreed
                            ? ` · ${selectedListing.livestockBreed}`
                            : ''}
                        </span>
                      )}
                    <span>
                      <MapPin />
                      {selectedListing.location} ·{' '}
                      {listingDistanceLabel(selectedListing)}
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
                      {isDemoListing(selectedListing.id)
                        ? 'Q'
                        : (selectedListing.owner || 'АК')
                            .slice(0, 2)
                            .toUpperCase()}
                    </span>
                    <div>
                      <b>
                        {isDemoListing(selectedListing.id)
                          ? 'Демонстрация Qoldan'
                          : selectedListing.owner || 'Пользователь Qoldan'}
                      </b>
                      <small>
                        {isDemoListing(selectedListing.id)
                          ? 'Пример интерфейса · не реальный продавец'
                          : `${selectedListing.sellerType || 'Частное лицо'} · ${selectedListing.verified ? 'бизнес подтверждён Qoldan' : 'участник площадки'}`}
                      </small>
                    </div>
                    {!isDemoListing(selectedListing.id) &&
                      selectedListing.ownerId && (
                        <button
                          type="button"
                          className="owner-profile-link"
                          onClick={() =>
                            void openProviderProfile(selectedListing.ownerId)
                          }
                        >
                          <UserRound /> Профиль
                        </button>
                      )}
                    {selectedListing.rating &&
                      !isDemoListing(selectedListing.id) && (
                        <em>
                          <Star fill="currentColor" /> {selectedListing.rating}
                          {selectedListing.reviewCount
                            ? ` · ${selectedListing.reviewCount}`
                            : ''}
                        </em>
                      )}
                  </div>
                  {!isDemoListing(selectedListing.id) && (
                    <section className="listing-reviews">
                      <div className="listing-reviews-head">
                        <div>
                          <small>ПОДТВЕРЖДЕНО АРЕНДОЙ</small>
                          <h3>Отзывы после реальных сделок</h3>
                        </div>
                        <ShieldCheck />
                      </div>
                      {selectedListingReviews.length > 0 ? (
                        <div className="review-items">
                          {selectedListingReviews.slice(0, 4).map((review) => (
                            <article key={review.id}>
                              <div>
                                <b>{review.reviewer}</b>
                                <span>
                                  {Array.from({ length: 5 }, (_, index) => (
                                    <Star
                                      key={index}
                                      fill={
                                        index < review.rating
                                          ? 'currentColor'
                                          : 'none'
                                      }
                                    />
                                  ))}
                                </span>
                              </div>
                              {review.comment && <p>{review.comment}</p>}
                              <small>
                                {formatActivityDate(review.createdAt)}
                              </small>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <p className="reviews-empty">
                          Проверенных отзывов пока нет. Оставить первый сможет
                          арендатор после завершения бронирования.
                        </p>
                      )}
                    </section>
                  )}
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
                            сервиса, не принадлежит реальному продавцу и не
                            ведёт к случайному номеру.
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const relatedKind: RequestItem['kind'] =
                                selectedListing.type === 'Сдам'
                                  ? 'rent'
                                  : selectedListing.category ===
                                        'Стройматериалы' ||
                                      selectedListing.category ===
                                        'Остатки партий'
                                    ? 'build'
                                    : 'agro';
                              openRequestForm(
                                `Нужно: ${selectedListing.title}`,
                                relatedKind,
                              );
                            }}
                          >
                            Создать похожую реальную заявку <ArrowRight />
                          </button>
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
                      {!isDemoListing(selectedListing.id) && (
                        <button
                          className="chat-action"
                          type="button"
                          onClick={() =>
                            void startConversation(
                              'listing',
                              String(selectedListing.id),
                            )
                          }
                          disabled={
                            submitting ===
                            `conversation-listing-${String(selectedListing.id)}`
                          }
                        >
                          <MessageCircle />
                          {submitting ===
                          `conversation-listing-${String(selectedListing.id)}`
                            ? 'Открываем диалог…'
                            : 'Написать в Qoldan'}
                        </button>
                      )}
                      {!isDemoListing(selectedListing.id) &&
                        selectedListing.type === 'Сдам' && (
                          <button onClick={openBooking}>Забронировать</button>
                        )}
                      {!isDemoListing(selectedListing.id) && (
                        <button
                          className="related-request"
                          onClick={() => {
                            const relatedKind: RequestItem['kind'] =
                              selectedListing.type === 'Сдам'
                                ? 'rent'
                                : selectedListing.category ===
                                      'Стройматериалы' ||
                                    selectedListing.category ===
                                      'Остатки партий'
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
                      )}
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
            {modal === 'provider' && (
              <div className="provider-profile">
                {providerLoading ? (
                  <div className="provider-status">
                    <UserRound />
                    <b>Собираем профиль и репутацию…</b>
                    <span>Проверяем активные предложения и отзывы.</span>
                  </div>
                ) : providerError ? (
                  <div className="provider-status error">
                    <CircleAlert />
                    <b>Не удалось открыть профиль</b>
                    <span>{providerError}</span>
                  </div>
                ) : providerProfile ? (
                  <>
                    <section className="provider-cover">
                      <span>
                        {providerProfile.displayName
                          .split(/\s+/)
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join('')
                          .toUpperCase() || 'Q'}
                      </span>
                      <div>
                        <small>ПУБЛИЧНЫЙ ПРОФИЛЬ</small>
                        <h2>{providerProfile.displayName}</h2>
                        <p>
                          {providerProfile.region && (
                            <>
                              <MapPin /> {providerProfile.region} ·{' '}
                            </>
                          )}
                          в Qoldan с{' '}
                          {formatJoinedDate(providerProfile.joinedAt)}
                        </p>
                      </div>
                      {providerProfile.verified && (
                        <strong>
                          <ShieldCheck /> Бизнес подтверждён
                        </strong>
                      )}
                    </section>

                    {providerProfile.verified &&
                      providerProfile.businessType && (
                        <div className="provider-verification">
                          <ShieldCheck />
                          <div>
                            <b>
                              {providerProfile.organizationName ||
                                providerProfile.displayName}
                            </b>
                            <span>
                              {
                                businessProfileLabels[
                                  providerProfile.businessType
                                ]
                              }{' '}
                              · документы проверены командой Qoldan
                            </span>
                          </div>
                        </div>
                      )}

                    <div className="provider-stats">
                      <div>
                        <b>{providerProfile.activeListingCount}</b>
                        <span>активных предложений</span>
                      </div>
                      <div>
                        <b>{providerProfile.completedWorkCount}</b>
                        <span>завершённых работ</span>
                      </div>
                      <div>
                        <b>
                          {providerProfile.serviceRating
                            ? `★ ${providerProfile.serviceRating}`
                            : '—'}
                        </b>
                        <span>
                          услуги · {providerProfile.serviceReviewCount} отзывов
                        </span>
                      </div>
                      <div>
                        <b>
                          {providerProfile.rentalRating
                            ? `★ ${providerProfile.rentalRating}`
                            : '—'}
                        </b>
                        <span>
                          аренда · {providerProfile.rentalReviewCount} отзывов
                        </span>
                      </div>
                    </div>

                    <section className="provider-section">
                      <div className="provider-section-head">
                        <div>
                          <small>СЕЙЧАС ДОСТУПНО</small>
                          <h3>Активные предложения</h3>
                        </div>
                        <span>{providerProfile.listings.length}</span>
                      </div>
                      {providerProfile.listings.length > 0 ? (
                        <div className="provider-offer-grid">
                          {providerProfile.listings.map((listing) => (
                            <button
                              type="button"
                              key={listing.id}
                              onClick={() => openListing(listing)}
                            >
                              <img src={listing.image} alt={listing.title} />
                              <span>
                                <small>
                                  {listing.type} · {listing.category}
                                </small>
                                <b>{listing.title}</b>
                                <em>
                                  {listing.price} {listing.unit}
                                </em>
                                <i>
                                  <MapPin /> {listing.location}
                                </i>
                              </span>
                              <ArrowRight />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="provider-empty">
                          <PackageOpen />
                          <span>
                            Сейчас у пользователя нет активных объявлений.
                          </span>
                        </div>
                      )}
                    </section>

                    <div className="provider-review-columns">
                      <section className="provider-section">
                        <div className="provider-section-head">
                          <div>
                            <small>ПОСЛЕ РЕАЛЬНОЙ ЗАЯВКИ</small>
                            <h3>Отзывы об услугах</h3>
                          </div>
                          <ShieldCheck />
                        </div>
                        {providerProfile.serviceReviews.length > 0 ? (
                          <div className="provider-reviews">
                            {providerProfile.serviceReviews.map((review) => (
                              <article key={review.id}>
                                <div>
                                  <b>{review.reviewer}</b>
                                  <strong>★ {review.rating}/5</strong>
                                </div>
                                <small>{review.subjectTitle}</small>
                                <p>
                                  {review.comment ||
                                    'Работа подтверждена без дополнительного комментария.'}
                                </p>
                                <time>
                                  {formatActivityDate(review.createdAt)}
                                </time>
                              </article>
                            ))}
                          </div>
                        ) : (
                          <div className="provider-empty compact">
                            <Star />
                            <span>
                              Проверенных отзывов об услугах пока нет.
                            </span>
                          </div>
                        )}
                      </section>

                      <section className="provider-section">
                        <div className="provider-section-head">
                          <div>
                            <small>ПОСЛЕ ЗАВЕРШЁННОЙ АРЕНДЫ</small>
                            <h3>Отзывы об аренде</h3>
                          </div>
                          <ShieldCheck />
                        </div>
                        {providerProfile.rentalReviews.length > 0 ? (
                          <div className="provider-reviews">
                            {providerProfile.rentalReviews.map((review) => (
                              <article key={review.id}>
                                <div>
                                  <b>{review.reviewer}</b>
                                  <strong>★ {review.rating}/5</strong>
                                </div>
                                <small>{review.subjectTitle}</small>
                                <p>
                                  {review.comment ||
                                    'Аренда завершена без дополнительного комментария.'}
                                </p>
                                <time>
                                  {formatActivityDate(review.createdAt)}
                                </time>
                              </article>
                            ))}
                          </div>
                        ) : (
                          <div className="provider-empty compact">
                            <Star />
                            <span>Проверенных отзывов об аренде пока нет.</span>
                          </div>
                        )}
                      </section>
                    </div>

                    <div className="provider-safety-note">
                      <ShieldCheck />
                      <span>
                        Отзывы появляются только после завершённой заявки или
                        аренды. Контакты открываются внутри конкретного
                        активного объявления.
                      </span>
                    </div>
                  </>
                ) : null}
              </div>
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
                  <div className="booking-calendar-card wide">
                    <div className="booking-calendar-head">
                      <div>
                        <small>ДОСТУПНОСТЬ</small>
                        <h3>Выберите даты аренды</h3>
                      </div>
                      <span
                        className={`availability-status ${availabilityState}`}
                      >
                        {availabilityState === 'loading'
                          ? 'Проверяем…'
                          : availabilityState === 'error'
                            ? 'Проверит сервер'
                            : availabilityRanges.length > 0
                              ? `Занято периодов: ${availabilityRanges.length}`
                              : 'Свободно'}
                      </span>
                    </div>
                    <Calendar
                      mode="range"
                      locale={ru}
                      selected={bookingRange}
                      onSelect={setBookingRange}
                      defaultMonth={bookingRange?.from || calendarToday}
                      startMonth={calendarToday}
                      disabled={[
                        { before: calendarToday },
                        ...occupiedCalendarRanges,
                      ]}
                      modifiers={{ booked: occupiedCalendarRanges }}
                      modifiersClassNames={{ booked: 'qoldan-booked-day' }}
                      excludeDisabled
                      className="booking-calendar"
                    />
                    <div className="booking-calendar-legend">
                      <span>
                        <i className="selected" /> Вы выбрали
                      </span>
                      <span>
                        <i className="booked" /> Уже занято
                      </span>
                      <span>
                        <i className="free" /> Свободно
                      </span>
                    </div>
                    <div className="booking-selection">
                      <Clock3 />
                      <div>
                        <b>
                          {bookingRange?.from
                            ? `${formatBookingDate(toIsoDate(bookingRange.from))}${bookingRange.to ? ` — ${formatBookingDate(toIsoDate(bookingRange.to))}` : ' · один день'}`
                            : 'Период ещё не выбран'}
                        </b>
                        <span>
                          {bookingRange?.from
                            ? 'Владелец получит запрос на этот период.'
                            : 'Для аренды на один день нажмите дату один раз.'}
                        </span>
                      </div>
                    </div>
                    {availabilityRanges.length > 0 && (
                      <div className="busy-periods">
                        <b>Ближайшие занятые периоды</b>
                        <div>
                          {availabilityRanges.slice(0, 3).map((range) => (
                            <span key={`${range.dateFrom}-${range.dateTo}`}>
                              {formatBookingDate(range.dateFrom)} —{' '}
                              {formatBookingDate(range.dateTo)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
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
                        setUserCoords(null);
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
            {modal === 'appeal' && appealTarget && (
              <>
                <div className="modal-title appeal-title">
                  <span>
                    <Scale />
                  </span>
                  <div>
                    <small>АПЕЛЛЯЦИЯ</small>
                    <h2>Оспорить решение</h2>
                    <p>
                      Спокойно объясните, почему решение стоит пересмотреть.
                      Обращение увидит только команда Qoldan.
                    </p>
                  </div>
                </div>
                <div className="appeal-target-card">
                  <small>
                    {appealTarget.action === 'restrict'
                      ? 'ПУБЛИКАЦИЯ ВРЕМЕННО СКРЫТА'
                      : 'ПРЕДУПРЕЖДЕНИЕ'}
                  </small>
                  <b>{appealTarget.targetTitle}</b>
                </div>
                <form className="app-form appeal-form" onSubmit={submitAppeal}>
                  <label>
                    Почему решение нужно пересмотреть?
                    <textarea
                      name="message"
                      rows={5}
                      minLength={10}
                      maxLength={1200}
                      required
                      placeholder="Например: в объявлении указаны реальные данные, а подтверждающие документы готов предоставить…"
                    />
                  </label>
                  <p className="appeal-hint">
                    Одна апелляция на одно решение. Команда сохранит ответ в
                    разделе «Мои апелляции».
                  </p>
                  <button
                    className="submit-button"
                    type="submit"
                    disabled={submitting === 'appeal'}
                  >
                    {submitting === 'appeal'
                      ? 'Отправляем…'
                      : 'Отправить апелляцию'}{' '}
                    <ArrowRight />
                  </button>
                </form>
              </>
            )}
            {modal === 'appeals' && (
              <>
                <div className="modal-title appeal-title">
                  <span>
                    <Scale />
                  </span>
                  <div>
                    <small>ЛИЧНЫЙ КАБИНЕТ</small>
                    <h2>Мои апелляции</h2>
                    <p>
                      Статусы обращений и ответы команды по решениям модерации.
                    </p>
                  </div>
                </div>
                {appeals.length > 0 ? (
                  <div className="appeal-list">
                    {appeals.map((appeal) => (
                      <article key={appeal.id}>
                        <div className="appeal-list-head">
                          <div>
                            <small>
                              {appeal.action === 'restrict'
                                ? 'СКРЫТИЕ ПУБЛИКАЦИИ'
                                : 'ПРЕДУПРЕЖДЕНИЕ'}
                            </small>
                            <h3>{appeal.targetTitle}</h3>
                          </div>
                          <span
                            className={`moderation-status ${appeal.status}`}
                          >
                            {appeal.status === 'new'
                              ? 'Отправлена'
                              : appeal.status === 'reviewing'
                                ? 'Проверяется'
                                : appeal.status === 'approved'
                                  ? 'Одобрена'
                                  : 'Отклонена'}
                          </span>
                        </div>
                        <p>{appeal.message}</p>
                        {appeal.resolutionNote && (
                          <div className="appeal-answer">
                            <CheckCircle2 />
                            <div>
                              <b>Ответ команды Qoldan</b>
                              <p>{appeal.resolutionNote}</p>
                            </div>
                          </div>
                        )}
                        <small>{formatActivityDate(appeal.createdAt)}</small>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="notification-empty">
                    <Scale />
                    <b>Апелляций нет</b>
                    <span>
                      Если вы не согласитесь с предупреждением или скрытием,
                      решение можно будет оспорить из уведомления.
                    </span>
                  </div>
                )}
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
                <section className="service-reputation-card">
                  <span>
                    <Star fill="currentColor" />
                  </span>
                  <div>
                    <small>РЕПУТАЦИЯ ИСПОЛНИТЕЛЯ</small>
                    <b>
                      {serviceTrust.serviceReviewCount > 0
                        ? `${serviceTrust.serviceRating} из 5`
                        : 'Пока без оценок'}
                    </b>
                    <p>
                      {serviceTrust.serviceReviewCount > 0
                        ? `${serviceTrust.serviceReviewCount} проверенных отзывов после выполненных заявок.`
                        : 'Первая оценка появится только после завершённой работы через мини‑тендер Qoldan.'}
                    </p>
                  </div>
                </section>
                <section
                  className={`business-verification-card ${businessVerification?.status || 'empty'}`}
                >
                  <span className="business-verification-icon">
                    {businessVerification?.status === 'rejected' ? (
                      <CircleAlert />
                    ) : (
                      <ShieldCheck />
                    )}
                  </span>
                  <div>
                    <small>
                      {businessVerification?.status === 'verified'
                        ? 'БИЗНЕС ПОДТВЕРЖДЁН QOLDAN'
                        : businessVerification?.status === 'pending'
                          ? 'ЗАЯВКА НА ПРОВЕРКЕ'
                          : businessVerification?.status === 'rejected'
                            ? 'НУЖНО УТОЧНИТЬ ДАННЫЕ'
                            : 'ДЛЯ ФЕРМ, КОМПАНИЙ И МАГАЗИНОВ'}
                    </small>
                    <b>
                      {businessVerification?.organizationName ||
                        'Подтвердите бизнес-профиль'}
                    </b>
                    <p>
                      {businessVerification?.status === 'verified'
                        ? 'Значок доверия и название организации уже показываются на ваших объявлениях.'
                        : businessVerification?.status === 'pending'
                          ? `${businessProfileLabels[businessVerification.profileType]} · БИН ${businessVerification.maskedBin}`
                          : businessVerification?.status === 'rejected'
                            ? businessVerification.reviewNote ||
                              'Исправьте данные и отправьте заявку повторно.'
                            : 'Публично покажем только название организации, тип профиля и значок — без БИН и документов.'}
                    </p>
                  </div>
                  {(!businessVerification ||
                    businessVerification.status === 'rejected') && (
                    <button
                      type="button"
                      onClick={() => setModal('verification')}
                    >
                      {businessVerification ? 'Подать снова' : 'Подтвердить'}
                      <ArrowRight />
                    </button>
                  )}
                </section>
                <div className="profile-menu">
                  {canModerate && (
                    <button
                      className="moderation-entry"
                      onClick={() => void openModeration()}
                    >
                      <ShieldCheck /> Модерация
                      <b>{moderationPendingCount}</b>
                    </button>
                  )}
                  <button onClick={() => setModal('saved-searches')}>
                    <Bookmark /> Сохранённые поиски
                    <b>{savedSearchNewCount || savedSearches.length}</b>
                  </button>
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
                  <button onClick={() => void openMessages()}>
                    <MessageCircle /> Сообщения
                    <b>{messagingUnreadCount}</b>
                  </button>
                  <button onClick={() => setModal('bookings')}>
                    <Clock3 /> Бронирования <b>{bookings.length}</b>
                  </button>
                  <button onClick={() => setModal('appeals')}>
                    <Scale /> Мои апелляции <b>{appeals.length}</b>
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
            {modal === 'saved-searches' && (
              <>
                <div className="modal-title saved-searches-title">
                  <span>
                    <Bookmark />
                  </span>
                  <div>
                    <small>ПЕРСОНАЛЬНЫЙ ПОИСК</small>
                    <h2>Сохранённые поиски</h2>
                    <p>
                      Qoldan следит только за настоящими объявлениями и покажет
                      новые совпадения здесь и в уведомлениях.
                    </p>
                  </div>
                </div>
                {savedSearches.length > 0 ? (
                  <div className="saved-search-list">
                    {savedSearches.map((savedSearch) => (
                      <article key={savedSearch.id}>
                        <span className="saved-search-icon">
                          <Search />
                        </span>
                        <div className="saved-search-copy">
                          <div>
                            <h3>{savedSearch.name}</h3>
                            {savedSearch.newMatches > 0 && (
                              <b>
                                {savedSearch.newMatches === 1
                                  ? '1 новое'
                                  : `${savedSearch.newMatches} новых`}
                              </b>
                            )}
                          </div>
                          <p>
                            {[
                              savedSearch.query
                                ? `Запрос: ${savedSearch.query}`
                                : '',
                              savedSearch.offerType !== 'Все'
                                ? savedSearch.offerType
                                : '',
                              savedSearch.category !== 'Все категории'
                                ? savedSearch.category
                                : '',
                              savedSearch.region !== 'Весь Казахстан'
                                ? savedSearch.region
                                : '',
                              savedSearch.deliveryOnly ? 'С доставкой' : '',
                              savedSearch.companyOnly
                                ? 'Магазины и компании'
                                : '',
                              savedSearch.livestockType !== 'Все виды'
                                ? savedSearch.livestockType
                                : '',
                              savedSearch.livestockPriceMode !== 'all'
                                ? livestockPriceModeLabels[
                                    savedSearch.livestockPriceMode
                                  ]
                                : '',
                              savedSearch.livestockQuantityGroup !== 'all'
                                ? livestockQuantityGroupLabels[
                                    savedSearch.livestockQuantityGroup
                                  ]
                                : '',
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                          <small>
                            Сейчас найдено: {savedSearch.totalMatches}
                          </small>
                        </div>
                        <div className="saved-search-actions">
                          <button
                            type="button"
                            className="apply-saved-search"
                            onClick={() => void applySavedSearch(savedSearch)}
                          >
                            Показать <ArrowRight />
                          </button>
                          <button
                            type="button"
                            className="delete-saved-search"
                            aria-label={`Удалить поиск ${savedSearch.name}`}
                            disabled={
                              submitting ===
                              `saved-search-delete-${savedSearch.id}`
                            }
                            onClick={() =>
                              void deleteSavedSearch(savedSearch.id)
                            }
                          >
                            <X />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="notification-empty saved-search-empty">
                    <Bookmark />
                    <b>Поисков пока нет</b>
                    <span>
                      Выберите запрос, регион или фильтр в каталоге и нажмите
                      «Сохранить поиск».
                    </span>
                  </div>
                )}
              </>
            )}
            {modal === 'verification' && (
              <>
                <div className="modal-title verification-title">
                  <span>
                    <ShieldCheck />
                  </span>
                  <div>
                    <small>ПРОВЕРЕННЫЙ БИЗНЕС</small>
                    <h2>Подтвердить организацию</h2>
                    <p>
                      Ручная проверка для ферм, компаний, сервисов, магазинов и
                      складов Казахстана.
                    </p>
                  </div>
                </div>
                <div className="verification-safety-note">
                  <ShieldCheck />
                  <div>
                    <b>Без удостоверений и ИИН</b>
                    <span>
                      Мы не просим сканы документов. БИН полностью видит только
                      команда проверки; покупателям он не показывается.
                    </span>
                  </div>
                </div>
                <form
                  className="product-form verification-form"
                  onSubmit={submitBusinessVerification}
                >
                  <label>
                    Тип профиля
                    <select
                      name="profileType"
                      required
                      defaultValue={businessVerification?.profileType || 'farm'}
                    >
                      {(
                        Object.entries(businessProfileLabels) as [
                          BusinessProfileType,
                          string,
                        ][]
                      ).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Регион работы
                    <select
                      name="region"
                      required
                      defaultValue={
                        businessVerification?.region ||
                        (selectedRegion === 'Весь Казахстан'
                          ? 'Область Жетісу'
                          : selectedRegion)
                      }
                    >
                      {kzRegions.slice(1).map((region) => (
                        <option key={region}>{region}</option>
                      ))}
                    </select>
                  </label>
                  <label className="wide">
                    Название организации
                    <input
                      name="organizationName"
                      minLength={3}
                      maxLength={180}
                      required
                      defaultValue={
                        businessVerification?.organizationName || ''
                      }
                      placeholder="Например, КХ Береке или ТОО Жетісу Агро"
                    />
                  </label>
                  <label>
                    БИН — 12 цифр
                    <input
                      name="bin"
                      inputMode="numeric"
                      pattern="[0-9]{12}"
                      minLength={12}
                      maxLength={12}
                      required
                      placeholder="123456789012"
                    />
                  </label>
                  <label>
                    Рабочий телефон
                    <input
                      name="phone"
                      type="tel"
                      minLength={7}
                      maxLength={32}
                      required
                      defaultValue={businessVerification?.phone || ''}
                      placeholder="+7 700 000 00 00"
                    />
                  </label>
                  <label className="wide">
                    Сайт или публичная страница — необязательно
                    <input
                      name="referenceUrl"
                      type="url"
                      maxLength={300}
                      defaultValue={businessVerification?.referenceUrl || ''}
                      placeholder="https://example.kz"
                    />
                  </label>
                  <label className="wide">
                    Комментарий для проверки — необязательно
                    <textarea
                      name="note"
                      rows={3}
                      maxLength={800}
                      defaultValue={businessVerification?.note || ''}
                      placeholder="Чем занимается организация и что можно проверить в открытых источниках"
                    />
                  </label>
                  <p className="verification-terms wide">
                    Значок означает, что команда Qoldan вручную сверила данные
                    заявки. Это не государственная гарантия сделки — перед
                    оплатой всё равно проверяйте товар и условия.
                  </p>
                  <button
                    className="submit-button"
                    type="submit"
                    disabled={submitting === 'business-verification'}
                  >
                    {submitting === 'business-verification'
                      ? 'Отправляем…'
                      : 'Отправить на проверку'}{' '}
                    <ArrowRight />
                  </button>
                </form>
              </>
            )}
            {modal === 'messages' && (
              <>
                <div className="modal-title messages-title">
                  <span>
                    <MessageCircle />
                  </span>
                  <div>
                    <small>СООБЩЕНИЯ QOLDAN</small>
                    <h2>Договоритесь напрямую</h2>
                    <p>
                      Каждый диалог привязан к реальному объявлению или заявке.
                    </p>
                  </div>
                </div>
                <div className="chat-safety">
                  <ShieldCheck />
                  <span>
                    Не отправляйте коды из SMS, данные карты и предоплату
                    незнакомому человеку.
                  </span>
                </div>
                <div
                  className={`message-layout ${activeConversation ? 'has-active' : ''}`}
                >
                  <aside className="conversation-list" aria-label="Диалоги">
                    <div className="conversation-list-head">
                      <b>Входящие</b>
                      <span>{conversations.length}</span>
                    </div>
                    {messagingLoading && conversations.length === 0 ? (
                      <div className="conversation-empty compact">
                        <MessageCircle />
                        <span>Загружаем диалоги…</span>
                      </div>
                    ) : conversations.length > 0 ? (
                      conversations.map((conversation) => (
                        <button
                          key={conversation.id}
                          type="button"
                          className={`conversation-row ${activeConversation?.id === conversation.id ? 'active' : ''}`}
                          onClick={() => void openConversation(conversation)}
                        >
                          <span className="conversation-avatar">
                            {conversation.counterparty
                              .slice(0, 1)
                              .toUpperCase()}
                          </span>
                          <span className="conversation-copy">
                            <b>{conversation.counterparty}</b>
                            <small>{conversation.contextTitle}</small>
                            <em>
                              {conversation.lastMessage || 'Начните диалог'}
                            </em>
                          </span>
                          <span className="conversation-meta">
                            <small>
                              {formatActivityDate(
                                conversation.lastMessageAt ||
                                  conversation.updatedAt,
                              )}
                            </small>
                            {conversation.unreadCount > 0 && (
                              <b>{conversation.unreadCount}</b>
                            )}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="conversation-empty">
                        <MessageCircle />
                        <b>Диалогов пока нет</b>
                        <span>
                          Откройте реальное объявление или заявку и нажмите
                          «Написать в Qoldan».
                        </span>
                      </div>
                    )}
                  </aside>
                  <section className="chat-panel" aria-label="Переписка">
                    {activeConversation ? (
                      <>
                        <div className="chat-head">
                          <button
                            type="button"
                            className="chat-back"
                            onClick={() => {
                              setActiveConversation(null);
                              setChatMessages([]);
                            }}
                            aria-label="Вернуться к диалогам"
                          >
                            <ChevronLeft />
                          </button>
                          <span className="conversation-avatar">
                            {activeConversation.counterparty
                              .slice(0, 1)
                              .toUpperCase()}
                          </span>
                          <div>
                            <b>{activeConversation.counterparty}</b>
                            <span>
                              {activeConversation.contextType === 'listing'
                                ? 'Объявление'
                                : 'Заявка'}{' '}
                              · {activeConversation.contextTitle}
                            </span>
                          </div>
                        </div>
                        <div className="message-bubbles" aria-live="polite">
                          {messagingLoading && chatMessages.length === 0 ? (
                            <div className="chat-placeholder">
                              Загружаем переписку…
                            </div>
                          ) : chatMessages.length > 0 ? (
                            chatMessages.map((message) => (
                              <div
                                key={message.id}
                                className={`message-bubble ${message.mine ? 'mine' : ''}`}
                              >
                                {!message.mine && <b>{message.senderName}</b>}
                                <p>{message.body}</p>
                                <small>
                                  {formatActivityDate(message.createdAt)}
                                  {message.mine && message.readAt
                                    ? ' · прочитано'
                                    : ''}
                                </small>
                              </div>
                            ))
                          ) : (
                            <div className="chat-placeholder welcome">
                              <MessageCircle />
                              <b>Начните разговор</b>
                              <span>
                                Уточните цену, сроки, состояние или условия
                                выезда.
                              </span>
                            </div>
                          )}
                        </div>
                        <form className="chat-form" onSubmit={sendChatMessage}>
                          <textarea
                            name="body"
                            rows={2}
                            maxLength={1200}
                            required
                            placeholder="Напишите сообщение…"
                            aria-label="Сообщение"
                          />
                          <button
                            type="submit"
                            disabled={submitting === 'chat-message'}
                            aria-label="Отправить сообщение"
                          >
                            <Send />
                          </button>
                        </form>
                      </>
                    ) : (
                      <div className="chat-placeholder select-chat">
                        <MessageCircle />
                        <b>Выберите диалог</b>
                        <span>
                          Переписка и контекст публикации будут здесь.
                        </span>
                      </div>
                    )}
                  </section>
                </div>
              </>
            )}
            {modal === 'moderation' && canModerate && (
              <>
                <div className="modal-title moderation-title">
                  <span>
                    <ShieldCheck />
                  </span>
                  <div>
                    <small>ЦЕНТР БЕЗОПАСНОСТИ</small>
                    <h2>Очередь модерации</h2>
                    <p>
                      Проверяйте сигналы пользователей и фиксируйте решение без
                      автоматического удаления публикаций.
                    </p>
                  </div>
                </div>
                <div className="moderation-filters">
                  {(
                    [
                      ['active', 'В работе'],
                      ['new', 'Новые'],
                      ['reviewing', 'Проверяются'],
                      ['appeals', 'Апелляции'],
                      ['verifications', 'Бизнес'],
                      ['closed', 'История'],
                      ['journal', 'Журнал действий'],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={moderationFilter === value ? 'active' : ''}
                      onClick={() => setModerationFilter(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {moderationLoading ? (
                  <div className="notification-empty moderation-empty">
                    <ShieldCheck />
                    <b>Загружаем обращения…</b>
                    <span>Проверяем актуальные статусы в общей базе.</span>
                  </div>
                ) : moderationFilter === 'verifications' ? (
                  moderationVerifications.length > 0 ? (
                    <div className="moderation-list business-moderation-list">
                      {moderationVerifications.map((verification) => (
                        <article key={verification.id}>
                          <div className="moderation-card-head">
                            <div>
                              <small>
                                {
                                  businessProfileLabels[
                                    verification.profileType
                                  ]
                                }
                                {' · '}
                                {verification.region}
                              </small>
                              <h3>{verification.organizationName}</h3>
                            </div>
                            <span
                              className={`moderation-status ${verification.status}`}
                            >
                              {verification.status === 'pending'
                                ? 'На проверке'
                                : verification.status === 'verified'
                                  ? 'Подтверждён'
                                  : 'Нужно уточнить'}
                            </span>
                          </div>
                          <div className="business-verification-data">
                            <div>
                              <small>АВТОР ПРОФИЛЯ</small>
                              <b>{verification.ownerName}</b>
                            </div>
                            <div>
                              <small>БИН · ТОЛЬКО ДЛЯ МОДЕРАЦИИ</small>
                              <b>{verification.bin}</b>
                            </div>
                            <div>
                              <small>РАБОЧИЙ ТЕЛЕФОН</small>
                              <b>{verification.phone}</b>
                            </div>
                            <div>
                              <small>ПОДАНО</small>
                              <b>
                                {formatActivityDate(verification.createdAt)}
                              </b>
                            </div>
                          </div>
                          {(verification.referenceUrl || verification.note) && (
                            <div className="business-verification-reference">
                              {verification.referenceUrl && (
                                <a
                                  href={verification.referenceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Открыть публичный источник <ArrowRight />
                                </a>
                              )}
                              {verification.note && <p>{verification.note}</p>}
                            </div>
                          )}
                          <label>
                            Комментарий проверки
                            <textarea
                              rows={2}
                              minLength={5}
                              maxLength={800}
                              value={verificationNotes[verification.id] ?? ''}
                              disabled={verification.status !== 'pending'}
                              placeholder="Что сверили и почему приняли решение"
                              onChange={(event) =>
                                setVerificationNotes((current) => ({
                                  ...current,
                                  [verification.id]: event.target.value,
                                }))
                              }
                            />
                          </label>
                          {verification.status === 'pending' ? (
                            <div className="moderation-actions">
                              <button
                                type="button"
                                className="approve"
                                disabled={
                                  submitting ===
                                  `business-verification-${verification.id}`
                                }
                                onClick={() =>
                                  void updateBusinessVerification(
                                    verification.id,
                                    'verified',
                                  )
                                }
                              >
                                <ShieldCheck /> Подтвердить
                              </button>
                              <button
                                type="button"
                                className="reject"
                                disabled={
                                  submitting ===
                                  `business-verification-${verification.id}`
                                }
                                onClick={() =>
                                  void updateBusinessVerification(
                                    verification.id,
                                    'rejected',
                                  )
                                }
                              >
                                <CircleAlert /> Уточнить данные
                              </button>
                            </div>
                          ) : (
                            <div className="moderation-resolution">
                              <CheckCircle2 />
                              <span>
                                Решил:{' '}
                                {verification.reviewerName || 'модератор'}
                                {verification.reviewedAt
                                  ? ` · ${formatActivityDate(verification.reviewedAt)}`
                                  : ''}
                              </span>
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="notification-empty moderation-empty">
                      <ShieldCheck />
                      <b>Заявок бизнеса пока нет</b>
                      <span>
                        Заявки ферм, компаний, сервисов, магазинов и складов
                        появятся здесь.
                      </span>
                    </div>
                  )
                ) : moderationFilter === 'appeals' ? (
                  moderationAppeals.length > 0 ? (
                    <div className="moderation-list appeal-moderation-list">
                      {moderationAppeals.map((appeal) => (
                        <article key={appeal.id}>
                          <div className="moderation-card-head">
                            <div>
                              <small>
                                АПЕЛЛЯЦИЯ ·{' '}
                                {appeal.action === 'restrict'
                                  ? 'СКРЫТИЕ'
                                  : 'ПРЕДУПРЕЖДЕНИЕ'}
                              </small>
                              <h3>{appeal.targetTitle}</h3>
                            </div>
                            <span
                              className={`moderation-status ${appeal.status}`}
                            >
                              {appeal.status === 'new'
                                ? 'Новая'
                                : appeal.status === 'reviewing'
                                  ? 'На проверке'
                                  : appeal.status === 'approved'
                                    ? 'Одобрена'
                                    : 'Отклонена'}
                            </span>
                          </div>
                          <div className="appeal-message">
                            <Scale />
                            <div>
                              <b>Позиция автора</b>
                              <p>{appeal.message}</p>
                            </div>
                          </div>
                          <div className="moderation-meta">
                            <span>Автор: {appeal.ownerName}</span>
                            <span>{formatActivityDate(appeal.createdAt)}</span>
                          </div>
                          <label>
                            Ответ команды Qoldan
                            <textarea
                              rows={2}
                              maxLength={800}
                              value={appealNotes[appeal.id] ?? ''}
                              disabled={
                                appeal.status === 'approved' ||
                                appeal.status === 'rejected'
                              }
                              placeholder="Что проверили и почему приняли такое решение"
                              onChange={(event) =>
                                setAppealNotes((current) => ({
                                  ...current,
                                  [appeal.id]: event.target.value,
                                }))
                              }
                            />
                          </label>
                          {appeal.status === 'approved' ||
                          appeal.status === 'rejected' ? (
                            <div className="moderation-resolution">
                              <CheckCircle2 />
                              <span>
                                Решил: {appeal.reviewerName || 'модератор'}
                                {appeal.reviewedAt
                                  ? ` · ${formatActivityDate(appeal.reviewedAt)}`
                                  : ''}
                              </span>
                            </div>
                          ) : (
                            <div className="moderation-actions appeal-actions">
                              {appeal.status === 'new' && (
                                <button
                                  type="button"
                                  className="review"
                                  disabled={
                                    submitting ===
                                    `moderation-appeal-${appeal.id}`
                                  }
                                  onClick={() =>
                                    void updateModerationAppeal(
                                      appeal.id,
                                      'reviewing',
                                    )
                                  }
                                >
                                  Взять на проверку
                                </button>
                              )}
                              <button
                                type="button"
                                className="approve"
                                disabled={
                                  submitting ===
                                  `moderation-appeal-${appeal.id}`
                                }
                                onClick={() =>
                                  void updateModerationAppeal(
                                    appeal.id,
                                    'approved',
                                  )
                                }
                              >
                                Удовлетворить
                              </button>
                              <button
                                type="button"
                                className="reject"
                                disabled={
                                  submitting ===
                                  `moderation-appeal-${appeal.id}`
                                }
                                onClick={() =>
                                  void updateModerationAppeal(
                                    appeal.id,
                                    'rejected',
                                  )
                                }
                              >
                                Отклонить
                              </button>
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="notification-empty moderation-empty">
                      <Scale />
                      <b>Апелляций пока нет</b>
                      <span>
                        Обращения авторов появятся здесь после предупреждения
                        или временного скрытия публикации.
                      </span>
                    </div>
                  )
                ) : moderationFilter === 'journal' ? (
                  moderationActions.length > 0 ? (
                    <div className="moderation-journal">
                      {moderationActions.map((action) => (
                        <article key={action.id}>
                          <span
                            className={`moderation-action-icon ${action.action}`}
                          >
                            {action.action === 'restrict' ? (
                              <EyeOff />
                            ) : action.action === 'restore' ? (
                              <Eye />
                            ) : (
                              <ShieldAlert />
                            )}
                          </span>
                          <div>
                            <small>
                              {action.action === 'restrict'
                                ? 'ПУБЛИКАЦИЯ СКРЫТА'
                                : action.action === 'restore'
                                  ? 'ПУБЛИКАЦИЯ ВОССТАНОВЛЕНА'
                                  : 'ПРЕДУПРЕЖДЕНИЕ'}
                            </small>
                            <h3>{action.targetTitle}</h3>
                            <p>{action.note}</p>
                            <footer>
                              <span>Автор: {action.targetOwner}</span>
                              <span>Модератор: {action.moderatorName}</span>
                              <span>
                                {formatActivityDate(action.createdAt)}
                              </span>
                            </footer>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="notification-empty moderation-empty">
                      <ScrollText />
                      <b>Журнал пока пуст</b>
                      <span>
                        Предупреждения, скрытия и восстановления появятся здесь
                        автоматически.
                      </span>
                    </div>
                  )
                ) : visibleModerationReports.length > 0 ? (
                  <div className="moderation-list">
                    {visibleModerationReports.map((report) => (
                      <article key={report.id}>
                        <div className="moderation-card-head">
                          <div>
                            <small>
                              {report.targetType === 'listing'
                                ? 'ОБЪЯВЛЕНИЕ'
                                : 'ЗАЯВКА'}{' '}
                              · {report.targetRegion || 'Регион не указан'}
                            </small>
                            <h3>{report.targetTitle}</h3>
                          </div>
                          <span
                            className={`moderation-status ${report.status}`}
                          >
                            {report.status === 'new'
                              ? 'Новая'
                              : report.status === 'reviewing'
                                ? 'На проверке'
                                : 'Закрыта'}
                          </span>
                        </div>
                        <div className="moderation-reason">
                          <CircleAlert />
                          <div>
                            <b>{reportReasonLabels[report.reason]}</b>
                            {report.description && <p>{report.description}</p>}
                          </div>
                        </div>
                        <div className="moderation-meta">
                          <span>Автор: {report.targetOwner}</span>
                          <span>Сигнал: {report.reporterName}</span>
                          {report.targetPlace && (
                            <span>{report.targetPlace}</span>
                          )}
                          <span>{formatActivityDate(report.createdAt)}</span>
                        </div>
                        <label>
                          Заметка модератора
                          <textarea
                            rows={2}
                            maxLength={800}
                            value={moderationNotes[report.id] ?? ''}
                            disabled={report.status === 'closed'}
                            placeholder="Что проверили и какое решение приняли"
                            onChange={(event) =>
                              setModerationNotes((current) => ({
                                ...current,
                                [report.id]: event.target.value,
                              }))
                            }
                          />
                        </label>
                        {report.status !== 'closed' &&
                          report.targetStatus !== 'deleted' && (
                            <div className="moderation-enforcement">
                              <button
                                type="button"
                                className="warn"
                                disabled={
                                  submitting ===
                                  `moderation-action-${report.id}`
                                }
                                onClick={() =>
                                  void applyModerationAction(report, 'warn')
                                }
                              >
                                <ShieldAlert /> Предупредить автора
                              </button>
                              {report.targetStatus === 'active' ||
                              report.targetStatus === 'open' ? (
                                <button
                                  type="button"
                                  className="restrict"
                                  disabled={
                                    submitting ===
                                    `moderation-action-${report.id}`
                                  }
                                  onClick={() =>
                                    void applyModerationAction(
                                      report,
                                      'restrict',
                                    )
                                  }
                                >
                                  <EyeOff /> Временно скрыть
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="restore"
                                  disabled={
                                    submitting ===
                                    `moderation-action-${report.id}`
                                  }
                                  onClick={() =>
                                    void applyModerationAction(
                                      report,
                                      'restore',
                                    )
                                  }
                                >
                                  <Eye /> Восстановить
                                </button>
                              )}
                            </div>
                          )}
                        {report.status === 'closed' ? (
                          <div className="moderation-resolution">
                            <CheckCircle2 />
                            <span>
                              Закрыл: {report.reviewerName || 'модератор'}
                              {report.reviewedAt
                                ? ` · ${formatActivityDate(report.reviewedAt)}`
                                : ''}
                            </span>
                          </div>
                        ) : (
                          <div className="moderation-actions">
                            {report.status === 'new' && (
                              <button
                                type="button"
                                className="review"
                                disabled={
                                  submitting === `moderation-${report.id}`
                                }
                                onClick={() =>
                                  void updateModerationReport(
                                    report.id,
                                    'reviewing',
                                  )
                                }
                              >
                                Взять на проверку
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={
                                submitting === `moderation-${report.id}`
                              }
                              onClick={() =>
                                void updateModerationReport(report.id, 'closed')
                              }
                            >
                              Закрыть обращение
                            </button>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="notification-empty moderation-empty">
                    <ShieldCheck />
                    <b>Здесь пока пусто</b>
                    <span>
                      Для выбранного статуса обращений нет. Новые жалобы
                      появятся здесь автоматически.
                    </span>
                  </div>
                )}
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
                            {booking.status === 'completed'
                              ? 'Завершено'
                              : booking.status === 'accepted'
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
                        {booking.handoff && (
                          <div
                            className={`handoff-summary ${booking.handoff.returnedAt ? 'returned' : ''}`}
                          >
                            <div className="handoff-summary-head">
                              <span>
                                <ScrollText />
                              </span>
                              <div>
                                <small>АКТ АРЕНДЫ</small>
                                <b>
                                  {booking.handoff.returnedAt
                                    ? 'Передача и возврат зафиксированы'
                                    : 'Передача зафиксирована'}
                                </b>
                              </div>
                              <ShieldCheck />
                            </div>
                            <div className="handoff-steps">
                              <span className="done">
                                <CheckCircle2 /> Передано
                              </span>
                              <i />
                              <span
                                className={
                                  booking.handoff.returnedAt ? 'done' : ''
                                }
                              >
                                <CheckCircle2 /> Возвращено
                              </span>
                            </div>
                            <div className="handoff-facts">
                              <span>
                                <b>Состояние при передаче</b>
                                {booking.handoff.conditionOut}
                              </span>
                              <span>
                                <b>Залог</b>
                                {booking.handoff.depositAmount > 0
                                  ? `${formatTenge(booking.handoff.depositAmount)} · получен`
                                  : 'Без залога'}
                              </span>
                              {booking.handoff.equipmentList && (
                                <span>
                                  <b>Комплект</b>
                                  {booking.handoff.equipmentList}
                                </span>
                              )}
                              {booking.handoff.returnedAt && (
                                <>
                                  <span>
                                    <b>Состояние при возврате</b>
                                    {booking.handoff.conditionIn}
                                  </span>
                                  <span>
                                    <b>Итог по залогу</b>
                                    {booking.handoff.depositResult
                                      ? depositResultLabels[
                                          booking.handoff.depositResult
                                        ]
                                      : 'Не указан'}
                                  </span>
                                  {booking.handoff.returnNote && (
                                    <span>
                                      <b>Примечание</b>
                                      {booking.handoff.returnNote}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        )}
                        {booking.review && (
                          <div className="verified-review">
                            <div>
                              <ShieldCheck />
                              <b>Проверенный отзыв</b>
                              <span>
                                {Array.from({ length: 5 }, (_, index) => (
                                  <Star
                                    key={index}
                                    fill={
                                      index < booking.review!.rating
                                        ? 'currentColor'
                                        : 'none'
                                    }
                                  />
                                ))}
                              </span>
                            </div>
                            {booking.review.comment && (
                              <p>{booking.review.comment}</p>
                            )}
                          </div>
                        )}
                        {booking.status === 'accepted' && !booking.handoff && (
                          <div className="booking-completion-note">
                            <ScrollText />
                            <span>
                              {booking.incoming
                                ? 'Перед выдачей зафиксируйте состояние, комплектность и фактически полученный залог.'
                                : 'Владелец ещё не оформил передачу. После выдачи здесь появится общий чек-лист.'}
                            </span>
                          </div>
                        )}
                        {booking.incoming &&
                          booking.status === 'accepted' &&
                          booking.handoff &&
                          !booking.handoff.returnedAt && (
                            <div className="booking-completion-note return">
                              <CheckCircle2 />
                              <span>
                                Когда вещь вернут, зафиксируйте её состояние и
                                итог по залогу. После этого аренда завершится.
                              </span>
                            </div>
                          )}
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
                          {booking.incoming &&
                            booking.status === 'accepted' && (
                              <div>
                                <button
                                  className={
                                    booking.handoff ? 'complete' : 'handover'
                                  }
                                  type="button"
                                  onClick={() => openHandover(booking)}
                                >
                                  <ScrollText />
                                  {booking.handoff
                                    ? 'Оформить возврат'
                                    : 'Оформить передачу'}
                                </button>
                              </div>
                            )}
                          {!booking.incoming && booking.canReview && (
                            <div>
                              <button
                                className="review"
                                type="button"
                                onClick={() => openReview(booking)}
                              >
                                <Star /> Оставить отзыв
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
            {modal === 'handover' && handoffTarget && (
              <>
                <div className="modal-title handover-title">
                  <span>
                    {handoffTarget.handoff ? <CheckCircle2 /> : <ScrollText />}
                  </span>
                  <div>
                    <small>
                      {handoffTarget.handoff
                        ? 'ВОЗВРАТ АРЕНДЫ'
                        : 'ПЕРЕДАЧА АРЕНДЫ'}
                    </small>
                    <h2>
                      {handoffTarget.handoff
                        ? 'Зафиксировать возврат'
                        : 'Чек-лист передачи'}
                    </h2>
                    <p>
                      «{handoffTarget.listingTitle}» ·{' '}
                      {formatBookingDate(handoffTarget.dateFrom)} —{' '}
                      {formatBookingDate(handoffTarget.dateTo)}
                    </p>
                  </div>
                </div>
                <form className="handover-form" onSubmit={submitHandover}>
                  {!handoffTarget.handoff ? (
                    <>
                      <div className="handover-party-card">
                        <UserRound />
                        <div>
                          <small>АРЕНДАТОР</small>
                          <b>{handoffTarget.counterparty}</b>
                        </div>
                        <span>{handoffTarget.contactPhone}</span>
                      </div>
                      <label>
                        Состояние при передаче
                        <textarea
                          name="conditionOut"
                          rows={3}
                          minLength={5}
                          maxLength={1200}
                          required
                          placeholder="Например: исправен, корпус без трещин, счётчик 148 часов…"
                        />
                      </label>
                      <label>
                        Комплектность <small>необязательно</small>
                        <textarea
                          name="equipmentList"
                          rows={2}
                          maxLength={800}
                          placeholder="Кейс, зарядное устройство, два аккумулятора…"
                        />
                      </label>
                      <label>
                        Фактический залог, ₸
                        <input
                          name="depositAmount"
                          type="number"
                          inputMode="numeric"
                          min="0"
                          max="100000000"
                          step="1000"
                          defaultValue="0"
                          required
                        />
                        <small>
                          Укажите 0, если залога нет. Qoldan не принимает и не
                          хранит эти деньги.
                        </small>
                      </label>
                      <label className="handover-check">
                        <input name="depositReceived" type="checkbox" />
                        <span>
                          Подтверждаю, что указанный залог фактически получен
                        </span>
                      </label>
                    </>
                  ) : (
                    <>
                      <div className="handover-original-state">
                        <div>
                          <small>ПРИ ПЕРЕДАЧЕ</small>
                          <b>{handoffTarget.handoff.conditionOut}</b>
                        </div>
                        <span>
                          {handoffTarget.handoff.depositAmount > 0
                            ? `Залог ${formatTenge(handoffTarget.handoff.depositAmount)}`
                            : 'Без залога'}
                        </span>
                      </div>
                      <label>
                        Состояние при возврате
                        <textarea
                          name="conditionIn"
                          rows={3}
                          minLength={5}
                          maxLength={1200}
                          required
                          placeholder="Что изменилось, всё ли работает, есть ли новые повреждения…"
                        />
                      </label>
                      {handoffTarget.handoff.depositReceived &&
                      handoffTarget.handoff.depositAmount > 0 ? (
                        <label>
                          Итог по залогу
                          <select name="depositResult" defaultValue="returned">
                            <option value="returned">
                              Возвращён полностью
                            </option>
                            <option value="partially_withheld">
                              Частично удержан
                            </option>
                            <option value="withheld">Удержан полностью</option>
                          </select>
                        </label>
                      ) : (
                        <input
                          name="depositResult"
                          type="hidden"
                          defaultValue="not_applicable"
                        />
                      )}
                      <label>
                        Итог и примечание <small>необязательно</small>
                        <textarea
                          name="returnNote"
                          rows={3}
                          maxLength={1200}
                          placeholder="Если залог удержан, обязательно укажите причину и договорённость сторон"
                        />
                      </label>
                    </>
                  )}
                  <div className="handover-trust-note">
                    <ShieldCheck />
                    <span>
                      Запись увидят обе стороны. Она помогает сверить факты, но
                      не заменяет юридический договор или акт с подписями.
                    </span>
                  </div>
                  <button
                    className="submit-button"
                    type="submit"
                    disabled={submitting === 'handover'}
                  >
                    {submitting === 'handover'
                      ? 'Сохраняем…'
                      : handoffTarget.handoff
                        ? 'Подтвердить возврат'
                        : 'Зафиксировать передачу'}{' '}
                    <ArrowRight />
                  </button>
                </form>
              </>
            )}
            {modal === 'review' && reviewTarget && (
              <>
                <div className="modal-title review-title">
                  <span>
                    <Star fill="currentColor" />
                  </span>
                  <div>
                    <small>ПОДТВЕРЖДЕНО АРЕНДОЙ</small>
                    <h2>Как всё прошло?</h2>
                    <p>
                      «{reviewTarget.listingTitle}». Отзыв появится в карточке и
                      поможет другим выбрать надёжное предложение.
                    </p>
                  </div>
                </div>
                <form className="review-form" onSubmit={submitReview}>
                  <fieldset>
                    <legend>Ваша оценка</legend>
                    <div className="review-star-picker">
                      {Array.from({ length: 5 }, (_, index) => {
                        const value = index + 1;
                        return (
                          <button
                            key={value}
                            type="button"
                            className={value <= reviewRating ? 'active' : ''}
                            onClick={() => setReviewRating(value)}
                            aria-label={`Оценка ${value} из 5`}
                            aria-pressed={value <= reviewRating}
                          >
                            <Star fill="currentColor" />
                          </button>
                        );
                      })}
                    </div>
                    <b>{reviewRating} из 5</b>
                  </fieldset>
                  <label>
                    Расскажите подробнее <small>необязательно</small>
                    <textarea
                      name="comment"
                      rows={4}
                      maxLength={800}
                      placeholder="Например: всё соответствовало описанию, владелец был на связи…"
                    />
                  </label>
                  <div className="review-trust-note">
                    <ShieldCheck />
                    <span>
                      Qoldan разрешает один отзыв только реальному арендатору
                      после завершения бронирования.
                    </span>
                  </div>
                  <button
                    className="submit-button"
                    type="submit"
                    disabled={submitting === 'review'}
                  >
                    {submitting === 'review'
                      ? 'Публикуем…'
                      : 'Опубликовать отзыв'}{' '}
                    <ArrowRight />
                  </button>
                </form>
              </>
            )}
            {modal === 'service-review' && serviceReviewTarget?.selection && (
              <>
                <div className="modal-title review-title service-review-title">
                  <span>
                    <Star fill="currentColor" />
                  </span>
                  <div>
                    <small>ПОДТВЕРЖДЕНО ВЫПОЛНЕННОЙ ЗАЯВКОЙ</small>
                    <h2>Оцените исполнителя</h2>
                    <p>
                      {serviceReviewTarget.selection.providerName} по заявке «
                      {serviceReviewTarget.title}». Оценка войдёт в репутацию
                      исполнителя в будущих мини‑тендерах.
                    </p>
                  </div>
                </div>
                <form className="review-form" onSubmit={submitServiceReview}>
                  <fieldset>
                    <legend>Ваша оценка</legend>
                    <div className="review-star-picker">
                      {Array.from({ length: 5 }, (_, index) => {
                        const value = index + 1;
                        return (
                          <button
                            key={value}
                            type="button"
                            className={
                              value <= serviceReviewRating ? 'active' : ''
                            }
                            onClick={() => setServiceReviewRating(value)}
                            aria-label={`Оценка ${value} из 5`}
                            aria-pressed={value <= serviceReviewRating}
                          >
                            <Star fill="currentColor" />
                          </button>
                        );
                      })}
                    </div>
                    <b>{serviceReviewRating} из 5</b>
                  </fieldset>
                  <label>
                    Что было хорошо или что стоит улучшить?{' '}
                    <small>необязательно</small>
                    <textarea
                      name="comment"
                      rows={4}
                      maxLength={800}
                      placeholder="Например: приехал вовремя, объём выполнил полностью, цена не изменилась…"
                    />
                  </label>
                  <div className="review-trust-note">
                    <ShieldCheck />
                    <span>
                      Один отзыв доступен только автору заявки после того, как
                      он отметил работу выполненной.
                    </span>
                  </div>
                  <button
                    className="submit-button"
                    type="submit"
                    disabled={submitting === 'service-review'}
                  >
                    {submitting === 'service-review'
                      ? 'Публикуем…'
                      : 'Опубликовать проверенный отзыв'}{' '}
                    <ArrowRight />
                  </button>
                </form>
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
                          ) : activity.kind === 'search' ? (
                            <Bookmark />
                          ) : activity.kind === 'moderation' ? (
                            <ShieldAlert />
                          ) : activity.kind === 'appeal' ? (
                            <Scale />
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
                          {activity.kind === 'moderation' &&
                            activity.moderationAction !== 'restore' &&
                            (activity.appealStatus ? (
                              <span
                                className={`appeal-inline-status ${activity.appealStatus}`}
                              >
                                {activity.appealStatus === 'new'
                                  ? 'Апелляция отправлена'
                                  : activity.appealStatus === 'reviewing'
                                    ? 'Апелляция проверяется'
                                    : activity.appealStatus === 'approved'
                                      ? 'Апелляция одобрена'
                                      : 'Апелляция отклонена'}
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="appeal-inline-button"
                                onClick={() => openAppeal(activity)}
                              >
                                <Scale /> Оспорить решение
                              </button>
                            ))}
                          {activity.kind === 'message' && (
                            <button
                              type="button"
                              className="appeal-inline-button"
                              onClick={() => void openMessages()}
                            >
                              <MessageCircle /> Открыть сообщения
                            </button>
                          )}
                          {activity.kind === 'search' && (
                            <button
                              type="button"
                              className="appeal-inline-button"
                              onClick={() => setModal('saved-searches')}
                            >
                              <Bookmark /> Открыть сохранённые поиски
                            </button>
                          )}
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
