'use client';
/* oxlint-disable next/no-img-element, react/react-compiler -- marketplace photos can be remote or user-uploaded; shared server data is hydrated after mount */
import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { type DateRange } from 'react-day-picker';
import {
  ArrowRight,
  ArrowUpDown,
  Beef,
  Bell,
  Bookmark,
  ChevronLeft,
  ChevronDown,
  Clock3,
  Construction,
  Heart,
  History,
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
  Share2,
  LifeBuoy,
  LockKeyhole,
} from 'lucide-react';
import {
  MarketplaceMap,
  type MarketplaceMapMarker,
} from '@/components/MarketplaceMap';
import {
  calculateDistanceKm,
  formatDistanceKm,
  getRegionCenter,
  hasExactCoordinates,
  resolveCoordinates,
  type Coordinates,
} from '@/lib/geo';
import {
  KAZAKHSTAN_OBLASTS,
  KAZAKHSTAN_REGION_FILTERS,
  KAZAKHSTAN_REPUBLICAN_CITIES,
} from '@/lib/regions';

const BookingCalendar = lazy(() => import('@/components/BookingCalendar'));
type LivestockType =
  | 'Лошади'
  | 'Крупный рогатый скот'
  | 'Овцы'
  | 'Козы'
  | 'Верблюды'
  | 'Другое';
type LivestockPriceMode = 'per_head' | 'whole_group';
type LivestockQuantityGroup = 'all' | 'single' | 'small_group' | 'large_group';
type ListingSort = 'recommended' | 'newest' | 'price_asc' | 'price_desc';
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
  createdAt?: number;
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
type RecentView = {
  kind: 'listing' | 'request';
  id: string;
  viewedAt: number;
};
type RecentItem =
  | { kind: 'listing'; viewedAt: number; listing: Listing }
  | { kind: 'request'; viewedAt: number; request: RequestItem };
type FormDraft = {
  fields: Record<string, string>;
  savedAt: number;
};
type ListingFormDraft = FormDraft & {
  flow: 'standard' | 'livestock';
};
type SupportTopic = 'safety' | 'rules' | 'privacy' | 'feedback' | 'queue';
type SupportTicket = {
  id: string;
  category: 'bug' | 'idea' | 'safety' | 'other';
  message: string;
  pageContext: string;
  status: 'new' | 'reviewing' | 'closed';
  reviewNote: string;
  ownerName: string;
  reviewerName: string;
  createdAt: number;
  updatedAt: number;
  reviewedAt: number | null;
  mine: boolean;
};
const RECENT_VIEWS_KEY = 'qoldan-recent-views-v1';
const LISTING_DRAFT_KEY = 'qoldan-listing-draft-v1';
const REQUEST_DRAFT_KEY = 'qoldan-request-draft-v1';
type SubmitFormEvent = {
  preventDefault: () => void;
  currentTarget: HTMLFormElement;
};
const fieldText = (data: FormData, key: string, fallback = '') => {
  const value = data.get(key);
  return typeof value === 'string' ? value : fallback;
};
const isValidPhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
};
const collectDraftFields = (form: HTMLFormElement) => {
  const fields: Record<string, string> = {};
  new FormData(form).forEach((value, key) => {
    if (typeof value === 'string') fields[key] = value;
  });
  form
    .querySelectorAll<HTMLInputElement>('input[type="checkbox"][name]')
    .forEach((input) => {
      fields[input.name] = input.checked ? 'on' : '';
    });
  return fields;
};
const sanitizeDraftFields = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] =>
      entry.every((part) => typeof part === 'string'),
    ),
  );
};
const clearFormFields = (form: HTMLFormElement) => {
  form.querySelectorAll('input, select, textarea').forEach((control) => {
    if (control instanceof HTMLInputElement) {
      if (control.type === 'checkbox' || control.type === 'radio') {
        control.checked = false;
      } else {
        control.value = '';
      }
    } else if (control instanceof HTMLSelectElement) {
      control.selectedIndex = 0;
    } else if (control instanceof HTMLTextAreaElement) {
      control.value = '';
    }
  });
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
const listingPriceValue = (price: string) => {
  const digits = price.replace(/[^\d]/g, '');
  return digits ? Number(digits) : null;
};
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
const LISTINGS_PAGE_SIZE = 9;
const REQUESTS_PAGE_SIZE = 8;
const MAX_LISTING_IMAGE_BYTES = 5_000_000;
const TARGET_LISTING_IMAGE_BYTES = 1_200_000;
const MAX_LISTING_IMAGE_SIDE = 1_280;
const LISTING_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

type DecodedListingImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  dispose: () => void;
};

const decodeListingImage = async (file: File): Promise<DecodedListingImage> => {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: 'from-image',
      });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        dispose: () => bitmap.close(),
      };
    } catch {
      // Older mobile browsers fall back to an image element below.
    }
  }

  const sourceUrl = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () =>
      resolve({
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        dispose: () => URL.revokeObjectURL(sourceUrl),
      });
    image.onerror = () => {
      URL.revokeObjectURL(sourceUrl);
      reject(new Error('Не удалось открыть фотографию'));
    };
    image.src = sourceUrl;
  });
};

const canvasToJpeg = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error('Не удалось обработать фотографию')),
      'image/jpeg',
      quality,
    );
  });

const optimizeListingImage = async (file: File) => {
  const decoded = await decodeListingImage(file);
  try {
    if (decoded.width < 1 || decoded.height < 1) {
      throw new Error('Фотография повреждена');
    }

    const scale = Math.min(
      1,
      MAX_LISTING_IMAGE_SIDE / Math.max(decoded.width, decoded.height),
    );
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(decoded.width * scale));
    canvas.height = Math.max(1, Math.round(decoded.height * scale));
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Не удалось обработать фотографию');

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);

    let optimized = await canvasToJpeg(canvas, 0.82);
    for (const quality of [0.74, 0.66, 0.58, 0.5]) {
      if (optimized.size <= TARGET_LISTING_IMAGE_BYTES) break;
      optimized = await canvasToJpeg(canvas, quality);
    }
    return optimized;
  } finally {
    decoded.dispose();
  }
};
const kzRepublicanCities = KAZAKHSTAN_REPUBLICAN_CITIES;
const kzOblasts = KAZAKHSTAN_OBLASTS;
const kzRegions = KAZAKHSTAN_REGION_FILTERS;
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
type AppLanguage = keyof typeof aboutContent;
const UI_LANGUAGE_KEY = 'qoldan-ui-language-v1';
const uiContent = {
  ru: {
    country: 'КАЗАХСТАН',
    navListings: 'Объявления',
    navRequests: 'Мне нужно',
    navRecycle: 'Вторсырьё',
    navAbout: 'О приложении',
    publish: 'Подать объявление',
    heroEyebrow: 'Ресурсы, аренда и услуги по всему Казахстану',
    heroTitle: 'Всё нужное для дела —',
    heroAccent: 'рядом',
    heroLead:
      'Найдите технику, возьмите оборудование в аренду или купите материалы рядом — в любом регионе страны.',
    searchPlaceholder: 'Трактор, кирпич, генератор или город',
    search: 'Найти',
    popular: 'Часто ищут:',
    popularItems: [
      ['Комбайн', 'Комбайн'],
      ['Перфоратор', 'Перфоратор'],
      ['Кирпич', 'Кирпич'],
      ['Сено', 'Сено'],
      ['Проектор', 'Проектор'],
      ['Лошади', 'Лошади'],
    ],
    allKazakhstan: 'Весь Казахстан',
    regionsCaption: '20 регионов и городов в одном сервисе',
    nearbyOffers: 'Предложения рядом',
    peopleAndCompanies: 'Частные лица и компании',
    categoriesKicker: 'КАТЕГОРИИ',
    categoriesTitle: 'Что нужно сегодня?',
    seeAll: 'Смотреть всё',
    openSection: 'Открыть раздел',
    categories: [
      {
        title: 'Сельхозтехника|и услуги',
        description: 'Вспашка, уборка, перевозка, аренда техники',
      },
      {
        title: 'Аренда инструментов|и оборудования',
        description: 'От дрели до генератора — берите на нужный срок',
      },
      {
        title: 'Остатки и|стройматериалы',
        description: 'Кирпич, плитка, смеси и другие остатки рядом',
      },
      {
        title: 'Скот и|животные',
        description: 'Продайте одну голову или целое стадо простым объявлением',
      },
    ],
    mapKicker: 'КАРТА РЕСУРСОВ КАЗАХСТАНА',
    mapTitle: 'Одна площадка для всей страны',
    mapLead:
      'Выберите регион или направление — Qoldan покажет подходящие ресурсы, технику и исполнителей.',
    allRegions: 'Все регионы и города',
    catalogCountry: 'ПРЕДЛОЖЕНИЯ ПО СТРАНЕ',
    catalogRegion: 'ПРЕДЛОЖЕНИЯ В РЕГИОНЕ',
    myOffers: 'ВАШИ ПРЕДЛОЖЕНИЯ',
    favoritesKicker: 'ВАШЕ ИЗБРАННОЕ',
    myListings: 'Мои объявления',
    savedListings: 'Сохранённые объявления',
    list: 'Список',
    onMap: 'На карте',
    transparentFeed: 'Прозрачная лента',
    transparentFeedText:
      'Настоящие публикации хранятся в общей базе. Примеры всегда отмечены словом «ДЕМО».',
    all: 'Все',
    real: 'Реальные',
    demo: 'Демо',
    sale: 'Продам',
    rent: 'Сдам',
    service: 'Окажу услугу',
    nearest: 'Сначала ближайшие',
    recommended: 'Сначала подходящие',
    newest: 'Сначала новые',
    cheapest: 'Сначала дешевле',
    expensive: 'Сначала дороже',
    locating: 'Определяем…',
    nearMe: 'Рядом со мной',
    filters: 'Фильтры',
    shown: 'Показано',
    of: 'из',
    showMore: 'Показать ещё',
    viewedAll: 'Вы посмотрели все подходящие предложения',
    requestKicker: 'НЕ НАШЛИ НУЖНОЕ?',
    requestTitle: 'Расскажите, что вам нужно',
    requestLead:
      'Оставьте заявку — владельцы техники и продавцы сами предложат цену. Это бесплатно.',
    createRequest: 'Создать заявку',
    realRequests: 'реальных заявок в общей базе',
    demoNearby: 'демо-примеров рядом:',
    activeRequests: 'Актуальные заявки',
    myRequests: 'Мои заявки',
    showAll: 'Показать все',
    autoUpdate: 'Обновляется автоматически',
    agro: 'Сельхоз',
    rental: 'Аренда',
    build: 'Стройка',
    recycle: 'Вторсырьё',
    request: 'ЗАЯВКА',
    demoExample: 'ДЕМО-ПРИМЕР',
    realRequest: 'РЕАЛЬНАЯ',
    responses: 'откликов',
    noRequests: 'Пока нет подходящих заявок',
    noRequestsText: 'Измените направление или создайте новую заявку.',
    recycleKicker: 'B2B · ДЕМО НАПРАВЛЕНИЯ',
    recycleTitle: 'Биржа вторсырья Казахстана',
    recycleLead:
      'Карта цен и обратный аукцион для картона, пластика, металла, паллет и плёнки. Выставляете объём — приёмщики предлагают свою цену и вывоз.',
    listBatch: 'Выставить партию',
    easyStart: 'ПРОСТОЙ СТАРТ',
    stepsTitle: 'Три шага — и дело сделано',
    steps: [
      [
        'Найдите или опишите',
        'Ищите готовое предложение или создайте свою заявку.',
      ],
      ['Свяжитесь напрямую', 'Обсудите цену, сроки и детали без посредников.'],
      [
        'Договоритесь на месте',
        'Оплата и передача — так, как удобно вам обоим.',
      ],
    ],
    footerLead: 'Казахстанский маркетплейс ресурсов, аренды и услуг рядом.',
    platform: 'Площадка',
    requests: 'Заявки',
    recycleExchange: 'Биржа вторсырья',
    kazakhstan: 'Казахстан',
    allRegionsShort: 'Все регионы',
    help: 'Помощь',
    rules: 'Правила сервиса',
    contact: 'Связаться с нами',
    safety: 'Безопасность',
    madeIn: 'Сделано в Казахстане.',
    mobileSearch: 'Поиск',
    favorites: 'Избранное',
    profile: 'Профиль',
    messages: 'Сообщения',
    notifications: 'Уведомления',
  },
  kk: {
    country: 'ҚАЗАҚСТАН',
    navListings: 'Хабарландырулар',
    navRequests: 'Маған керек',
    navRecycle: 'Қайталама шикізат',
    navAbout: 'Қосымша туралы',
    publish: 'Хабарландыру беру',
    heroEyebrow: 'Қазақстан бойынша ресурстар, жалға беру және қызметтер',
    heroTitle: 'Іске қажет нәрсенің бәрі —',
    heroAccent: 'жақын жерде',
    heroLead:
      'Техника табыңыз, жабдықты жалға алыңыз немесе материалды еліміздің кез келген өңірінен сатып алыңыз.',
    searchPlaceholder: 'Трактор, кірпіш, генератор немесе қала',
    search: 'Іздеу',
    popular: 'Жиі іздейді:',
    popularItems: [
      ['Комбайн', 'Комбайн'],
      ['Перфоратор', 'Перфоратор'],
      ['Кирпич', 'Кірпіш'],
      ['Сено', 'Шөп'],
      ['Проектор', 'Проектор'],
      ['Лошади', 'Жылқы'],
    ],
    allKazakhstan: 'Бүкіл Қазақстан',
    regionsCaption: '20 өңір мен қала бір сервисте',
    nearbyOffers: 'Жақын ұсыныстар',
    peopleAndCompanies: 'Жеке тұлғалар мен компаниялар',
    categoriesKicker: 'САНАТТАР',
    categoriesTitle: 'Бүгін не қажет?',
    seeAll: 'Барлығын көру',
    openSection: 'Бөлімді ашу',
    categories: [
      {
        title: 'Ауыл шаруашылық техникасы|және қызметтер',
        description: 'Жер жырту, жинау, тасымалдау және техника жалдау',
      },
      {
        title: 'Құралдар мен жабдықтарды|жалға алу',
        description: 'Бұрғыдан генераторға дейін — керекті мерзімге алыңыз',
      },
      {
        title: 'Қалған және|құрылыс материалдары',
        description: 'Кірпіш, плитка, қоспалар және басқа қалдықтар',
      },
      {
        title: 'Мал және|жануарлар',
        description: 'Бір малды немесе толық табынды оңай жариялаңыз',
      },
    ],
    mapKicker: 'ҚАЗАҚСТАН РЕСУРСТАР КАРТАСЫ',
    mapTitle: 'Бүкіл елге арналған бір алаң',
    mapLead:
      'Өңірді немесе бағытты таңдаңыз — Qoldan қажетті ресурс, техника және орындаушыларды көрсетеді.',
    allRegions: 'Барлық өңірлер мен қалалар',
    catalogCountry: 'ЕЛ БОЙЫНША ҰСЫНЫСТАР',
    catalogRegion: 'ӨҢІРДЕГІ ҰСЫНЫСТАР',
    myOffers: 'СІЗДІҢ ҰСЫНЫСТАРЫҢЫЗ',
    favoritesKicker: 'ТАҢДАУЛЫЛАРЫҢЫЗ',
    myListings: 'Менің хабарландыруларым',
    savedListings: 'Сақталған хабарландырулар',
    list: 'Тізім',
    onMap: 'Картада',
    transparentFeed: 'Ашық лента',
    transparentFeedText:
      'Нақты жарияланымдар ортақ базада сақталады. Мысалдар әрқашан «ДЕМО» деп белгіленеді.',
    all: 'Барлығы',
    real: 'Нақты',
    demo: 'Демо',
    sale: 'Сатамын',
    rent: 'Жалға беремін',
    service: 'Қызмет көрсетемін',
    nearest: 'Алдымен жақындары',
    recommended: 'Алдымен сәйкестері',
    newest: 'Алдымен жаңалары',
    cheapest: 'Алдымен арзандары',
    expensive: 'Алдымен қымбаттары',
    locating: 'Анықтап жатырмыз…',
    nearMe: 'Маған жақын',
    filters: 'Сүзгілер',
    shown: 'Көрсетілді',
    of: '/',
    showMore: 'Тағы көрсету',
    viewedAll: 'Барлық сәйкес ұсынысты көрдіңіз',
    requestKicker: 'КЕРЕГІН ТАППАДЫҢЫЗ БА?',
    requestTitle: 'Не қажет екенін жазыңыз',
    requestLead:
      'Өтінім қалдырыңыз — техника иелері мен сатушылар өз бағасын ұсынады. Бұл тегін.',
    createRequest: 'Өтінім жасау',
    realRequests: 'ортақ базадағы нақты өтінім',
    demoNearby: 'жанындағы демо-мысалдар:',
    activeRequests: 'Өзекті өтінімдер',
    myRequests: 'Менің өтінімдерім',
    showAll: 'Барлығын көрсету',
    autoUpdate: 'Автоматты жаңартылады',
    agro: 'Ауыл шаруашылығы',
    rental: 'Жалға алу',
    build: 'Құрылыс',
    recycle: 'Қайталама шикізат',
    request: 'ӨТІНІМ',
    demoExample: 'ДЕМО-МЫСАЛ',
    realRequest: 'НАҚТЫ',
    responses: 'ұсыныс',
    noRequests: 'Сәйкес өтінімдер әзірге жоқ',
    noRequestsText: 'Бағытты өзгертіңіз немесе жаңа өтінім жасаңыз.',
    recycleKicker: 'B2B · БАҒЫТ ДЕМОСЫ',
    recycleTitle: 'Қазақстанның қайталама шикізат биржасы',
    recycleLead:
      'Картон, пластик, металл, паллет және үлдірге арналған баға картасы мен кері аукцион. Көлемді көрсетесіз — қабылдаушылар баға мен алып кетуді ұсынады.',
    listBatch: 'Партияны жариялау',
    easyStart: 'ОҢАЙ БАСТАУ',
    stepsTitle: 'Үш қадам — жұмыс дайын',
    steps: [
      [
        'Табыңыз немесе сипаттаңыз',
        'Дайын ұсынысты іздеңіз немесе өз өтініміңізді жасаңыз.',
      ],
      [
        'Тікелей байланысыңыз',
        'Баға, мерзім және егжей-тегжейін делдалсыз талқылаңыз.',
      ],
      ['Орнында келісіңіз', 'Төлем мен тапсыруды екі жаққа ыңғайлы етіңіз.'],
    ],
    footerLead:
      'Қазақстандық ресурстар, жалға беру және қызметтер маркетплейсі.',
    platform: 'Алаң',
    requests: 'Өтінімдер',
    recycleExchange: 'Шикізат биржасы',
    kazakhstan: 'Қазақстан',
    allRegionsShort: 'Барлық өңірлер',
    help: 'Көмек',
    rules: 'Сервис ережелері',
    contact: 'Бізге жазу',
    safety: 'Қауіпсіздік',
    madeIn: 'Қазақстанда жасалған.',
    mobileSearch: 'Іздеу',
    favorites: 'Таңдаулы',
    profile: 'Профиль',
    messages: 'Хабарламалар',
    notifications: 'Хабарландырулар',
  },
  en: {
    country: 'KAZAKHSTAN',
    navListings: 'Listings',
    navRequests: 'I need',
    navRecycle: 'Recyclables',
    navAbout: 'About',
    publish: 'Post a listing',
    heroEyebrow: 'Resources, rentals, and services across Kazakhstan',
    heroTitle: 'Everything you need to get it done —',
    heroAccent: 'nearby',
    heroLead:
      'Find machinery, rent equipment, or buy materials nearby in any region of the country.',
    searchPlaceholder: 'Tractor, bricks, generator, or city',
    search: 'Search',
    popular: 'Popular:',
    popularItems: [
      ['Комбайн', 'Combine'],
      ['Перфоратор', 'Rotary hammer'],
      ['Кирпич', 'Bricks'],
      ['Сено', 'Hay'],
      ['Проектор', 'Projector'],
      ['Лошади', 'Horses'],
    ],
    allKazakhstan: 'All Kazakhstan',
    regionsCaption: '20 regions and cities in one service',
    nearbyOffers: 'Nearby offers',
    peopleAndCompanies: 'Individuals and companies',
    categoriesKicker: 'CATEGORIES',
    categoriesTitle: 'What do you need today?',
    seeAll: 'View all',
    openSection: 'Open section',
    categories: [
      {
        title: 'Farm machinery|and services',
        description: 'Ploughing, harvesting, hauling, and equipment rental',
      },
      {
        title: 'Tool and equipment|rental',
        description: 'From drills to generators — rent for as long as needed',
      },
      {
        title: 'Surplus and|building materials',
        description: 'Bricks, tiles, mixes, and other leftovers nearby',
      },
      {
        title: 'Livestock and|animals',
        description: 'List one animal or an entire herd in a simple post',
      },
    ],
    mapKicker: 'KAZAKHSTAN RESOURCE MAP',
    mapTitle: 'One marketplace for the whole country',
    mapLead:
      'Choose a region or direction and Qoldan will show relevant resources, machinery, and providers.',
    allRegions: 'All regions and cities',
    catalogCountry: 'OFFERS ACROSS THE COUNTRY',
    catalogRegion: 'OFFERS IN THIS REGION',
    myOffers: 'YOUR OFFERS',
    favoritesKicker: 'YOUR FAVORITES',
    myListings: 'My listings',
    savedListings: 'Saved listings',
    list: 'List',
    onMap: 'Map',
    transparentFeed: 'Transparent feed',
    transparentFeedText:
      'Real posts are stored in the shared database. Examples are always marked “DEMO”.',
    all: 'All',
    real: 'Real',
    demo: 'Demo',
    sale: 'For sale',
    rent: 'For rent',
    service: 'Service',
    nearest: 'Nearest first',
    recommended: 'Best matches first',
    newest: 'Newest first',
    cheapest: 'Lowest price first',
    expensive: 'Highest price first',
    locating: 'Locating…',
    nearMe: 'Near me',
    filters: 'Filters',
    shown: 'Showing',
    of: 'of',
    showMore: 'Show more',
    viewedAll: 'You have seen every matching offer',
    requestKicker: 'CAN’T FIND IT?',
    requestTitle: 'Tell us what you need',
    requestLead:
      'Post a request and equipment owners or sellers will offer their price. It’s free.',
    createRequest: 'Create request',
    realRequests: 'real requests in the shared database',
    demoNearby: 'demo examples alongside:',
    activeRequests: 'Active requests',
    myRequests: 'My requests',
    showAll: 'Show all',
    autoUpdate: 'Updates automatically',
    agro: 'Agriculture',
    rental: 'Rental',
    build: 'Construction',
    recycle: 'Recyclables',
    request: 'REQUEST',
    demoExample: 'DEMO EXAMPLE',
    realRequest: 'REAL',
    responses: 'responses',
    noRequests: 'No matching requests yet',
    noRequestsText: 'Change the category or create a new request.',
    recycleKicker: 'B2B · DIRECTION DEMO',
    recycleTitle: 'Kazakhstan recyclables exchange',
    recycleLead:
      'A price map and reverse auction for cardboard, plastic, metal, pallets, and film. List a quantity and recyclers offer a price and pickup.',
    listBatch: 'List a batch',
    easyStart: 'EASY START',
    stepsTitle: 'Three steps to get it done',
    steps: [
      [
        'Find it or describe it',
        'Search existing offers or create your own request.',
      ],
      [
        'Connect directly',
        'Discuss price, timing, and details without intermediaries.',
      ],
      [
        'Agree in person',
        'Handle payment and handover in the way that suits both sides.',
      ],
    ],
    footerLead:
      'Kazakhstan’s marketplace for nearby resources, rentals, and services.',
    platform: 'Marketplace',
    requests: 'Requests',
    recycleExchange: 'Recyclables exchange',
    kazakhstan: 'Kazakhstan',
    allRegionsShort: 'All regions',
    help: 'Help',
    rules: 'Service rules',
    contact: 'Contact us',
    safety: 'Safety',
    madeIn: 'Made in Kazakhstan.',
    mobileSearch: 'Search',
    favorites: 'Favorites',
    profile: 'Profile',
    messages: 'Messages',
    notifications: 'Notifications',
  },
} as const;
const internalContent = {
  ru: {
    close: 'Закрыть',
    listing: {
      eyebrow: 'НОВОЕ ПРЕДЛОЖЕНИЕ',
      title: 'Подать объявление',
      lead: 'Предложение появится в выбранном регионе и будет доступно в вашем профиле на других устройствах.',
      standard: 'Обычное объявление',
      standardHint: 'Техника, аренда, услуги и материалы',
      livestock: 'Скот или стадо',
      livestockHint: 'Одна голова или несколько животных',
      draftSaved: 'Черновик сохранён на устройстве',
      draftAuto: 'Черновик сохранится автоматически',
      draftHint:
        'Текст и контакты не пропадут. Фото и точную геопозицию нужно выбрать повторно.',
      clear: 'Очистить',
      offerType: 'Тип предложения',
      category: 'Категория',
      livestockSale: 'Продажа животных',
      livestockFieldsHint:
        'Заполните четыре коротких поля — остальное как в обычном объявлении',
      livestockType: 'Вид скота',
      quantity: 'Количество голов',
      priceMode: 'Как указана цена',
      perHead: 'За одну голову',
      wholeGroup: 'За всё стадо',
      breed: 'Порода',
      optional: 'необязательно',
      breedPlaceholder: 'Например, казахская белоголовая',
      name: 'Название',
      livestockTitlePlaceholder: 'Например, табун лошадей — 12 голов',
      standardTitlePlaceholder: 'Например, вспашка полей МТЗ-82',
      photo: 'Фотография',
      choosePhoto: 'Выбрать реальное фото',
      photoHint: 'JPG, PNG или WebP · до 5 МБ, сожмём сами',
      photoProcessing: 'Подготавливаем фото…',
      photoReady: 'Фото готово',
      photoOptimized: 'быстрая загрузка',
      previewAlt: 'Предпросмотр объявления',
      price: 'Цена',
      unit: 'Единица',
      region: 'Регион',
      city: 'Город или район',
      locating: 'Определяем точку…',
      pointAdded: 'Точная точка добавлена',
      addPoint: 'Добавить точку с устройства',
      updatePoint: 'нажмите, чтобы обновить',
      pointHint: 'Необязательно — город и регион всё равно останутся видны',
      phone: 'Телефон для связи',
      seller: 'Кто размещает',
      person: 'Частное лицо',
      company: 'Компания',
      store: 'Магазин',
      livestockDelivery: 'Помогу с перевозкой',
      delivery: 'Возможна доставка или выезд',
      available: 'Когда доступно',
      availablePlaceholder: 'Например, 2–7 сентября',
      description: 'Описание',
      livestockDescription: 'Возраст, состояние, документы и условия осмотра',
      standardDescription: 'Расскажите о состоянии, условиях и радиусе выезда',
      publishing: 'Публикуем…',
      publish: 'Опубликовать объявление',
      categories: [
        ['Сельхозуслуги', 'Сельхозуслуги'],
        ['Спецтехника', 'Спецтехника'],
        ['Корма и сено', 'Корма и сено'],
        ['Зерно', 'Зерно'],
        ['Пастбища', 'Пастбища'],
        ['Перевозка скота', 'Перевозка скота'],
        ['Инструменты', 'Инструменты'],
        ['Электроника', 'Электроника'],
        ['Оборудование', 'Оборудование'],
        ['Для мероприятий', 'Для мероприятий'],
        ['Стройматериалы', 'Стройматериалы'],
        ['Остатки партий', 'Остатки партий'],
        ['Доставка', 'Доставка'],
      ],
      livestockTypes: [
        ['Лошади', 'Лошади'],
        ['Крупный рогатый скот', 'Крупный рогатый скот'],
        ['Овцы', 'Овцы'],
        ['Козы', 'Козы'],
        ['Верблюды', 'Верблюды'],
        ['Другое', 'Другое'],
      ],
    },
    requestForm: {
      eyebrow: 'МНЕ НУЖНО',
      title: 'Создать заявку',
      lead: 'Опишите задачу — исполнители увидят её и смогут предложить цену.',
      draftRestored: 'Черновик заявки восстановлен',
      draftAuto: 'Черновик сохраняется автоматически',
      draftHint:
        'Заполненные поля останутся на этом устройстве, даже если пропадёт интернет.',
      direction: 'Направление',
      agro: 'Сельхозтехника и услуги',
      rent: 'Аренда',
      build: 'Материалы и стройка',
      recycle: 'Вторсырьё и вывоз',
      budget: 'Бюджет',
      budgetPlaceholder: 'До 50 000 ₸ или договорная',
      need: 'Что вам нужно?',
      needPlaceholder: 'Например, убрать 70 га пшеницы',
      region: 'Регион',
      where: 'Где?',
      when: 'Когда?',
      whenPlaceholder: 'Завтра или точная дата',
      publishing: 'Публикуем…',
      publish: 'Опубликовать заявку',
    },
    regions: {
      eyebrow: 'ГЕОГРАФИЯ QOLDAN',
      title: 'Выберите регион',
      lead: 'Покажем предложения и заявки в нужной части Казахстана.',
      cities: 'Города республиканского значения',
      oblasts: 'Области',
    },
    profile: {
      synced: 'Профиль синхронизирован',
      demo: 'Демонстрационный режим',
      connecting: 'Подключаем профиль…',
      listings: 'объявлений',
      requests: 'заявок',
      bookingsPending: 'броней ожидают',
      reputation: 'РЕПУТАЦИЯ ИСПОЛНИТЕЛЯ',
      noRatings: 'Пока без оценок',
      outOfFive: 'из 5',
      verifiedReviews: 'проверенных отзывов после выполненных заявок.',
      firstRating:
        'Первая оценка появится после завершённой работы через мини‑тендер Qoldan.',
      moderation: 'Модерация',
      savedSearches: 'Сохранённые поиски',
      recent: 'Недавно просмотренные',
      favorites: 'Избранное',
      messages: 'Сообщения',
      bookings: 'Бронирования',
      appeals: 'Мои апелляции',
      help: 'Помощь и безопасность',
      myListings: 'Мои объявления',
      myRequests: 'Мои заявки',
    },
    detail: {
      demo: 'ДЕМО · ПРИМЕР',
      share: 'Поделиться',
      noDescription:
        'Свяжитесь с владельцем, чтобы уточнить подробности предложения.',
      negotiable: 'По договорённости',
      delivery: 'Доставка или выезд доступны',
      exactPoint: 'Точная точка добавлена владельцем',
      demoOwner: 'Демонстрация Qoldan',
      demoOwnerHint: 'Пример интерфейса · не реальный продавец',
      user: 'Пользователь Qoldan',
      verifiedBusiness: 'бизнес подтверждён Qoldan',
      member: 'участник площадки',
      profile: 'Профиль',
      rentalVerified: 'ПОДТВЕРЖДЕНО АРЕНДОЙ',
      reviews: 'Отзывы после реальных сделок',
      noReviews:
        'Проверенных отзывов пока нет. Оставить первый сможет арендатор после завершения бронирования.',
      paused: 'Объявление на паузе',
      active: 'Объявление активно',
      pausedHint: 'Его видите только вы в разделе «Мои объявления».',
      activeHint: 'Оно доступно покупателям и заказчикам в общем каталоге.',
      saving: 'Сохраняем…',
      resume: 'Возобновить',
      pause: 'Поставить на паузу',
      demoListing: 'Демонстрационное объявление',
      demoListingHint:
        'Контакты скрыты: карточка показывает сценарий сервиса и не принадлежит реальному продавцу.',
      createRequest: 'Создать похожую реальную заявку',
      needPrefix: 'Нужно',
      call: 'Позвонить',
      openingChat: 'Открываем диалог…',
      write: 'Написать в Qoldan',
      book: 'Забронировать',
      counterRequest: 'Оставить встречную заявку',
      report: 'Пожаловаться на объявление',
    },
    requestDetail: {
      miniTender: 'МИНИ-ТЕНДЕР · ЗАЯВКА',
      share: 'Поделиться заявкой',
      demoTitle: 'Это демонстрационный сценарий',
      demoText:
        'Такой заявки нет в общей базе и за ней не стоит реальный заказчик. Отклики показаны как пример будущего мини-тендера.',
      createReal: 'Создать похожую настоящую заявку',
      openingChat: 'Открываем диалог…',
      writeCustomer: 'Написать заказчику в Qoldan',
      responseSent: 'Ваш отклик уже отправлен',
      responseSentHint:
        'Заказчик видит вашу цену и комментарий. Повторный отклик не нужен — детали можно обсудить в сообщениях.',
      propose: 'Предложить свой вариант',
      yourPrice: 'Ваша цена',
      priceExample: 'Например, 48 000 ₸',
      recyclePriceExample: 'Например, 64 ₸/кг',
      comment: 'Комментарий',
      commentPlaceholder: 'Когда сможете выполнить и что входит в цену',
      sending: 'Отправляем…',
      addResponse: 'Добавить отклик',
      report: 'Сообщить о проблеме с заявкой',
    },
    booking: {
      eyebrow: 'БРОНИРОВАНИЕ',
      payOwner: 'оплата владельцу при получении',
      availability: 'ДОСТУПНОСТЬ',
      chooseDates: 'Выберите даты аренды',
      checking: 'Проверяем…',
      serverCheck: 'Проверит сервер',
      occupiedCount: 'Занято периодов',
      free: 'Свободно',
      selected: 'Вы выбрали',
      occupied: 'Уже занято',
      oneDay: 'один день',
      notSelected: 'Период ещё не выбран',
      ownerGetsRequest: 'Владелец получит запрос на этот период.',
      oneDayHint: 'Для аренды на один день нажмите дату один раз.',
      nearestOccupied: 'Ближайшие занятые периоды',
      phone: 'Телефон для ответа владельца',
      delivery: 'Нужна доставка по городу',
      comment: 'Комментарий',
      commentPlaceholder: 'Удобное время и адрес',
      sending: 'Отправляем…',
      send: 'Отправить владельцу',
    },
    messages: {
      eyebrow: 'СООБЩЕНИЯ QOLDAN',
      title: 'Договоритесь напрямую',
      lead: 'Каждый диалог привязан к реальному объявлению или заявке.',
      safety:
        'Не отправляйте коды из SMS, данные карты и предоплату незнакомому человеку.',
      dialogs: 'Диалоги',
      inbox: 'Входящие',
      loading: 'Загружаем диалоги…',
      start: 'Начните диалог',
      empty: 'Диалогов пока нет',
      emptyHint:
        'Откройте реальное объявление или заявку и нажмите «Написать в Qoldan».',
      correspondence: 'Переписка',
      back: 'Вернуться к диалогам',
      listing: 'Объявление',
      request: 'Заявка',
      loadingChat: 'Загружаем переписку…',
      read: 'прочитано',
      startTalk: 'Начните разговор',
      startTalkHint: 'Уточните цену, сроки, состояние или условия выезда.',
      placeholder: 'Напишите сообщение…',
      message: 'Сообщение',
      send: 'Отправить сообщение',
      choose: 'Выберите диалог',
      chooseHint: 'Переписка и контекст публикации будут здесь.',
    },
    support: {
      eyebrow: 'ПОМОЩЬ И БЕЗОПАСНОСТЬ',
      title: 'Qoldan рядом, когда нужно',
      lead: 'Короткие правила без мелкого шрифта и настоящее обращение в команду с номером и статусом.',
      safety: 'Безопасность',
      rules: 'Правила',
      privacy: 'Приватность',
      feedback: 'Написать нам',
      queue: 'Очередь',
      mainRule: 'ГЛАВНОЕ ПРАВИЛО',
      mainRuleTitle: 'Сначала проверьте — потом рассчитывайтесь',
      mainRuleText:
        'Qoldan пока не принимает оплату и не просит код из SMS. Договорённость и расчёт происходят напрямую между участниками.',
      safetyItems: [
        [
          'Обсудите всё в сообщениях',
          'Зафиксируйте цену, объём работы, дату, доставку и условия отмены до встречи.',
        ],
        [
          'Осмотрите товар или технику',
          'Сверьте состояние, комплектность и документы. Для скота уточните здоровье и ветдокументы.',
        ],
        [
          'Не спешите с предоплатой',
          'Не переводите деньги незнакомому человеку только из-за скидки или срочности.',
        ],
        [
          'Для аренды сделайте передачу',
          'Встроенный чек-лист сохранит состояние, комплект и залог при выдаче и возврате.',
        ],
      ],
      reportProblem: 'Сообщить о проблеме',
      honest: 'Публикуйте честно',
      honestText:
        'Реальные фото, понятная цена, верная категория, населённый пункт и актуальное описание.',
      oneOffer: 'Одно предложение — одно объявление',
      oneOfferText:
        'Не создавайте повторы, спам и заголовки, которые не соответствуют содержанию.',
      prohibited: 'Что запрещено',
      prohibitedText:
        'Обман, краденые и незаконные товары, опасные услуги, ложные сведения о животных и чужие фотографии.',
      moderationNote:
        'При жалобе публикация не исчезает автоматически: модератор проверяет контекст, фиксирует решение и даёт автору возможность подать апелляцию.',
      dataEyebrow: 'ПРОСТО О ДАННЫХ',
      dataTitle: 'Публично — только то, что нужно для объявления',
      dataLead:
        'Перед публикацией проверяйте, какие контакты и сведения вы оставляете в открытом описании.',
      privacyItems: [
        [
          'Видят другие',
          'Название, фото, цена, описание, регион, имя автора и контакт для связи.',
        ],
        [
          'Не публикуется',
          'БИН, заметки модерации, личные сообщения и данные проверки бизнес-профиля.',
        ],
        [
          'Точная геопозиция',
          'Добавляется только по вашему действию. Населённый пункт всё равно остаётся виден.',
        ],
      ],
      privacyNote:
        'Не пишите в открытом описании ИИН, номер документа, банковские данные, домашний адрес или коды из SMS.',
      writeTeam: 'Напишите команде Qoldan',
      writeTeamHint: 'Мы сохраним обращение и покажем его статус здесь.',
      topic: 'Тема',
      bug: 'Ошибка в приложении',
      idea: 'Идея для Qoldan',
      safetyQuestion: 'Вопрос безопасности',
      other: 'Другой вопрос',
      messageLabel: 'Что произошло или что хотите предложить',
      messagePlaceholder:
        'Опишите своими словами. Если это ошибка — напишите, что нажали и что ожидали увидеть.',
      formHint:
        'Страница прикрепится автоматически. Не указывайте ИИН и банковские данные.',
      sending: 'Отправляем…',
      send: 'Отправить обращение',
      myTickets: 'МОИ ОБРАЩЕНИЯ',
      history: 'История и статусы',
      updating: 'Обновляем…',
      teamReply: 'ОТВЕТ КОМАНДЫ',
      noTickets: 'Обращений пока нет',
      noTicketsText: 'Первое обращение появится здесь сразу после отправки.',
      statusNew: 'Новое',
      statusReviewing: 'Проверяется',
      statusClosed: 'Закрыто',
    },
  },
  kk: {
    close: 'Жабу',
    listing: {
      eyebrow: 'ЖАҢА ҰСЫНЫС',
      title: 'Хабарландыру беру',
      lead: 'Ұсыныс таңдалған өңірде жарияланып, басқа құрылғылардағы профиліңізде қолжетімді болады.',
      standard: 'Қарапайым хабарландыру',
      standardHint: 'Техника, жалға беру, қызметтер және материалдар',
      livestock: 'Мал немесе табын',
      livestockHint: 'Бір мал немесе бірнеше жануар',
      draftSaved: 'Нобай құрылғыда сақталды',
      draftAuto: 'Нобай автоматты сақталады',
      draftHint:
        'Мәтін мен байланыс жоғалмайды. Фото мен нақты орынды қайта таңдау керек.',
      clear: 'Тазарту',
      offerType: 'Ұсыныс түрі',
      category: 'Санат',
      livestockSale: 'Мал сату',
      livestockFieldsHint:
        'Төрт қысқа өрісті толтырыңыз — қалғаны кәдімгі хабарландыру сияқты',
      livestockType: 'Мал түрі',
      quantity: 'Мал саны',
      priceMode: 'Баға қалай көрсетілген',
      perHead: 'Бір бас үшін',
      wholeGroup: 'Бүкіл табын үшін',
      breed: 'Тұқымы',
      optional: 'міндетті емес',
      breedPlaceholder: 'Мысалы, қазақтың ақбас сиыры',
      name: 'Атауы',
      livestockTitlePlaceholder: 'Мысалы, 12 бас жылқы табыны',
      standardTitlePlaceholder: 'Мысалы, МТЗ-82 тракторымен жер жырту',
      photo: 'Фотосурет',
      choosePhoto: 'Нақты фото таңдау',
      photoHint: 'JPG, PNG немесе WebP · 5 МБ дейін, өзіміз сығамыз',
      photoProcessing: 'Фото дайындалуда…',
      photoReady: 'Фото дайын',
      photoOptimized: 'жылдам жүктеу',
      previewAlt: 'Хабарландыру көрінісі',
      price: 'Бағасы',
      unit: 'Өлшем бірлігі',
      region: 'Өңір',
      city: 'Қала немесе аудан',
      locating: 'Орын анықталуда…',
      pointAdded: 'Нақты орын қосылды',
      addPoint: 'Құрылғыдан орынды қосу',
      updatePoint: 'жаңарту үшін басыңыз',
      pointHint: 'Міндетті емес — қала мен өңір бәрібір көрінеді',
      phone: 'Байланыс телефоны',
      seller: 'Кім жариялайды',
      person: 'Жеке тұлға',
      company: 'Компания',
      store: 'Дүкен',
      livestockDelivery: 'Тасымалдауға көмектесемін',
      delivery: 'Жеткізу немесе барып қызмет көрсету мүмкін',
      available: 'Қашан қолжетімді',
      availablePlaceholder: 'Мысалы, 2–7 қыркүйек',
      description: 'Сипаттама',
      livestockDescription: 'Жасы, күйі, құжаттары және көру шарттары',
      standardDescription: 'Күйі, шарттары және бару қашықтығын жазыңыз',
      publishing: 'Жариялануда…',
      publish: 'Хабарландыруды жариялау',
      categories: [
        ['Сельхозуслуги', 'Ауыл шаруашылық қызметтері'],
        ['Спецтехника', 'Арнайы техника'],
        ['Корма и сено', 'Жем және шөп'],
        ['Зерно', 'Астық'],
        ['Пастбища', 'Жайылым'],
        ['Перевозка скота', 'Мал тасымалдау'],
        ['Инструменты', 'Құралдар'],
        ['Электроника', 'Электроника'],
        ['Оборудование', 'Жабдық'],
        ['Для мероприятий', 'Іс-шараларға'],
        ['Стройматериалы', 'Құрылыс материалдары'],
        ['Остатки партий', 'Партия қалдықтары'],
        ['Доставка', 'Жеткізу'],
      ],
      livestockTypes: [
        ['Лошади', 'Жылқы'],
        ['Крупный рогатый скот', 'Ірі қара'],
        ['Овцы', 'Қой'],
        ['Козы', 'Ешкі'],
        ['Верблюды', 'Түйе'],
        ['Другое', 'Басқа'],
      ],
    },
    requestForm: {
      eyebrow: 'МАҒАН КЕРЕК',
      title: 'Өтінім жасау',
      lead: 'Тапсырманы сипаттаңыз — орындаушылар көріп, өз бағасын ұсынады.',
      draftRestored: 'Өтінім нобайы қалпына келтірілді',
      draftAuto: 'Нобай автоматты сақталады',
      draftHint: 'Интернет өшсе де, толтырылған өрістер осы құрылғыда қалады.',
      direction: 'Бағыт',
      agro: 'Ауыл шаруашылық техникасы мен қызметтер',
      rent: 'Жалға алу',
      build: 'Материалдар мен құрылыс',
      recycle: 'Қайталама шикізат және алып кету',
      budget: 'Бюджет',
      budgetPlaceholder: '50 000 ₸ дейін немесе келісімді',
      need: 'Сізге не қажет?',
      needPlaceholder: 'Мысалы, 70 га бидай жинау',
      region: 'Өңір',
      where: 'Қайда?',
      when: 'Қашан?',
      whenPlaceholder: 'Ертең немесе нақты күн',
      publishing: 'Жариялануда…',
      publish: 'Өтінімді жариялау',
    },
    regions: {
      eyebrow: 'QOLDAN ГЕОГРАФИЯСЫ',
      title: 'Өңірді таңдаңыз',
      lead: 'Қазақстанның қажетті бөлігіндегі ұсыныстар мен өтінімдерді көрсетеміз.',
      cities: 'Республикалық маңызы бар қалалар',
      oblasts: 'Облыстар',
    },
    profile: {
      synced: 'Профиль синхрондалды',
      demo: 'Демонстрациялық режим',
      connecting: 'Профиль қосылуда…',
      listings: 'хабарландыру',
      requests: 'өтінім',
      bookingsPending: 'бронь күтуде',
      reputation: 'ОРЫНДАУШЫ БЕДЕЛІ',
      noRatings: 'Әзірге баға жоқ',
      outOfFive: '5-тен',
      verifiedReviews: 'орындалған өтінімнен кейінгі расталған пікір.',
      firstRating:
        'Алғашқы баға Qoldan мини-тендері арқылы аяқталған жұмыстан кейін шығады.',
      moderation: 'Модерация',
      savedSearches: 'Сақталған іздеулер',
      recent: 'Жақында қаралғандар',
      favorites: 'Таңдаулы',
      messages: 'Хабарламалар',
      bookings: 'Броньдар',
      appeals: 'Менің апелляцияларым',
      help: 'Көмек және қауіпсіздік',
      myListings: 'Менің хабарландыруларым',
      myRequests: 'Менің өтінімдерім',
    },
    detail: {
      demo: 'ДЕМО · ҮЛГІ',
      share: 'Бөлісу',
      noDescription: 'Ұсыныс туралы толық ақпаратты иесінен сұраңыз.',
      negotiable: 'Келісім бойынша',
      delivery: 'Жеткізу немесе барып қызмет көрсету бар',
      exactPoint: 'Нақты орынды иесі қосты',
      demoOwner: 'Qoldan демонстрациясы',
      demoOwnerHint: 'Интерфейс үлгісі · нақты сатушы емес',
      user: 'Qoldan қолданушысы',
      verifiedBusiness: 'бизнес Qoldan арқылы расталған',
      member: 'платформа қатысушысы',
      profile: 'Профиль',
      rentalVerified: 'ЖАЛҒА АЛУМЕН РАСТАЛҒАН',
      reviews: 'Нақты мәмілелерден кейінгі пікірлер',
      noReviews:
        'Расталған пікірлер әзірге жоқ. Алғашқы пікірді бронь аяқталғаннан кейін жалға алушы қалдыра алады.',
      paused: 'Хабарландыру кідіртілді',
      active: 'Хабарландыру белсенді',
      pausedHint: 'Оны «Менің хабарландыруларым» бөлімінде тек сіз көресіз.',
      activeHint:
        'Ол жалпы каталогта сатып алушылар мен тапсырыс берушілерге көрінеді.',
      saving: 'Сақталуда…',
      resume: 'Қайта қосу',
      pause: 'Кідірту',
      demoListing: 'Демонстрациялық хабарландыру',
      demoListingHint:
        'Байланыс жасырылған: карточка қызмет сценарийін көрсетеді және нақты сатушыға тиесілі емес.',
      createRequest: 'Ұқсас нақты өтінім жасау',
      needPrefix: 'Қажет',
      call: 'Қоңырау шалу',
      openingChat: 'Диалог ашылуда…',
      write: 'Qoldan ішінде жазу',
      book: 'Броньдау',
      counterRequest: 'Қарсы өтінім қалдыру',
      report: 'Хабарландыруға шағымдану',
    },
    requestDetail: {
      miniTender: 'МИНИ-ТЕНДЕР · ӨТІНІМ',
      share: 'Өтініммен бөлісу',
      demoTitle: 'Бұл демонстрациялық сценарий',
      demoText:
        'Бұл өтінім ортақ базада жоқ және артында нақты тапсырыс беруші тұрмайды. Жауаптар болашақ мини-тендердің үлгісі ретінде көрсетілген.',
      createReal: 'Ұқсас нақты өтінім жасау',
      openingChat: 'Диалог ашылуда…',
      writeCustomer: 'Тапсырыс берушіге Qoldan ішінде жазу',
      responseSent: 'Жауабыңыз жіберілді',
      responseSentHint:
        'Тапсырыс беруші бағаңыз бен пікіріңізді көреді. Қайта жауап берудің қажеті жоқ — егжей-тегжейін хабарламада талқылауға болады.',
      propose: 'Өз ұсынысыңызды беріңіз',
      yourPrice: 'Сіздің бағаңыз',
      priceExample: 'Мысалы, 48 000 ₸',
      recyclePriceExample: 'Мысалы, 64 ₸/кг',
      comment: 'Пікір',
      commentPlaceholder: 'Қашан орындай аласыз және бағаға не кіреді',
      sending: 'Жіберілуде…',
      addResponse: 'Жауап қосу',
      report: 'Өтінім мәселесі туралы хабарлау',
    },
    booking: {
      eyebrow: 'БРОНЬДАУ',
      payOwner: 'төлем алған кезде иесіне беріледі',
      availability: 'ҚОЛЖЕТІМДІЛІК',
      chooseDates: 'Жалға алу күндерін таңдаңыз',
      checking: 'Тексерілуде…',
      serverCheck: 'Сервер тексереді',
      occupiedCount: 'Бос емес кезеңдер',
      free: 'Бос',
      selected: 'Сіз таңдадыңыз',
      occupied: 'Бос емес',
      oneDay: 'бір күн',
      notSelected: 'Кезең әлі таңдалмады',
      ownerGetsRequest: 'Иесі осы кезеңге сұраныс алады.',
      oneDayHint: 'Бір күнге жалға алу үшін күнді бір рет басыңыз.',
      nearestOccupied: 'Жақын бос емес кезеңдер',
      phone: 'Иесінің жауабы үшін телефон',
      delivery: 'Қала ішінде жеткізу қажет',
      comment: 'Пікір',
      commentPlaceholder: 'Ыңғайлы уақыт пен мекенжай',
      sending: 'Жіберілуде…',
      send: 'Иесіне жіберу',
    },
    messages: {
      eyebrow: 'QOLDAN ХАБАРЛАМАЛАРЫ',
      title: 'Тікелей келісіңіз',
      lead: 'Әр диалог нақты хабарландыруға немесе өтінімге байланыстырылған.',
      safety:
        'SMS кодтарын, карта деректерін және бейтаныс адамға алдын ала төлем жібермеңіз.',
      dialogs: 'Диалогтар',
      inbox: 'Кіріс',
      loading: 'Диалогтар жүктелуде…',
      start: 'Диалогты бастаңыз',
      empty: 'Диалогтар әзірге жоқ',
      emptyHint:
        'Нақты хабарландыруды немесе өтінімді ашып, «Qoldan ішінде жазу» түймесін басыңыз.',
      correspondence: 'Хат алмасу',
      back: 'Диалогтарға оралу',
      listing: 'Хабарландыру',
      request: 'Өтінім',
      loadingChat: 'Хат алмасу жүктелуде…',
      read: 'оқылды',
      startTalk: 'Сөйлесуді бастаңыз',
      startTalkHint:
        'Бағаны, мерзімді, жағдайды немесе бару шарттарын нақтылаңыз.',
      placeholder: 'Хабарлама жазыңыз…',
      message: 'Хабарлама',
      send: 'Хабарламаны жіберу',
      choose: 'Диалогты таңдаңыз',
      chooseHint: 'Хат алмасу мен жарияланым контексті осында көрсетіледі.',
    },
    support: {
      eyebrow: 'КӨМЕК ЖӘНЕ ҚАУІПСІЗДІК',
      title: 'Қажет кезде Qoldan жаныңызда',
      lead: 'Ұсақ қаріпсіз қысқа ережелер және нөмірі мен мәртебесі бар нақты өтініш.',
      safety: 'Қауіпсіздік',
      rules: 'Ережелер',
      privacy: 'Құпиялық',
      feedback: 'Бізге жазу',
      queue: 'Кезек',
      mainRule: 'БАСТЫ ЕРЕЖЕ',
      mainRuleTitle: 'Алдымен тексеріңіз — кейін есептесіңіз',
      mainRuleText:
        'Qoldan әзірге төлем қабылдамайды және SMS кодын сұрамайды. Келісім мен есеп айырысу қатысушылар арасында тікелей өтеді.',
      safetyItems: [
        [
          'Бәрін хабарламада талқылаңыз',
          'Баға, жұмыс көлемі, күн, жеткізу және бас тарту шарттарын алдын ала жазыңыз.',
        ],
        [
          'Тауарды немесе техниканы қараңыз',
          'Күйін, жиынтығын және құжаттарын тексеріңіз. Мал үшін ветқұжаттарды нақтылаңыз.',
        ],
        [
          'Алдын ала төлемге асықпаңыз',
          'Жеңілдік немесе асығыстық үшін бейтаныс адамға ақша жібермеңіз.',
        ],
        [
          'Жалға бергенде тапсыруды рәсімдеңіз',
          'Кіріктірілген чек-лист күйін, жиынтығын және кепілді сақтайды.',
        ],
      ],
      reportProblem: 'Мәселе туралы хабарлау',
      honest: 'Шынайы жариялаңыз',
      honestText:
        'Нақты фото, түсінікті баға, дұрыс санат, елді мекен және өзекті сипаттама.',
      oneOffer: 'Бір ұсыныс — бір хабарландыру',
      oneOfferText: 'Қайталау, спам және мазмұнға сай емес тақырып жасамаңыз.',
      prohibited: 'Не тыйым салынған',
      prohibitedText:
        'Алаяқтық, ұрланған және заңсыз тауар, қауіпті қызмет, мал туралы жалған ақпарат және бөтен фото.',
      moderationNote:
        'Шағым түскенде жарияланым автоматты өшпейді: модератор тексеріп, шешімді тіркейді және авторға апелляция беруге мүмкіндік береді.',
      dataEyebrow: 'ДЕРЕКТЕР ТУРАЛЫ ҚАРАПАЙЫМ',
      dataTitle: 'Ашық жерде — тек хабарландыруға қажеттісі',
      dataLead:
        'Жарияламас бұрын ашық сипаттамада қандай байланыс пен мәлімет қалдырғаныңызды тексеріңіз.',
      privacyItems: [
        [
          'Басқалар көреді',
          'Атауы, фото, баға, сипаттама, өңір, автор аты және байланыс нөмірі.',
        ],
        [
          'Жарияланбайды',
          'БСН, модерация жазбалары, жеке хабарламалар және бизнес тексеру деректері.',
        ],
        [
          'Нақты геопозиция',
          'Тек сіздің әрекетіңізбен қосылады. Елді мекен бәрібір көрінеді.',
        ],
      ],
      privacyNote:
        'Ашық сипаттамада ЖСН, құжат нөмірі, банк деректері, үй мекенжайы немесе SMS кодын жазбаңыз.',
      writeTeam: 'Qoldan командасына жазыңыз',
      writeTeamHint: 'Өтінішті сақтап, мәртебесін осы жерде көрсетеміз.',
      topic: 'Тақырып',
      bug: 'Қосымшадағы қате',
      idea: 'Qoldan үшін идея',
      safetyQuestion: 'Қауіпсіздік сұрағы',
      other: 'Басқа сұрақ',
      messageLabel: 'Не болды немесе не ұсынғыңыз келеді',
      messagePlaceholder:
        'Өз сөзіңізбен жазыңыз. Қате болса, не басқаныңызды және не күткеніңізді айтыңыз.',
      formHint: 'Бет автоматты тіркеледі. ЖСН мен банк деректерін көрсетпеңіз.',
      sending: 'Жіберілуде…',
      send: 'Өтінішті жіберу',
      myTickets: 'МЕНІҢ ӨТІНІШТЕРІМ',
      history: 'Тарих және мәртебелер',
      updating: 'Жаңартылуда…',
      teamReply: 'КОМАНДА ЖАУАБЫ',
      noTickets: 'Өтініштер әзірге жоқ',
      noTicketsText: 'Алғашқы өтініш жіберілгеннен кейін бірден осында шығады.',
      statusNew: 'Жаңа',
      statusReviewing: 'Тексерілуде',
      statusClosed: 'Жабық',
    },
  },
  en: {
    close: 'Close',
    listing: {
      eyebrow: 'NEW OFFER',
      title: 'Post a listing',
      lead: 'Your offer will appear in the selected region and remain available in your profile on other devices.',
      standard: 'Regular listing',
      standardHint: 'Machinery, rentals, services, and materials',
      livestock: 'Livestock or herd',
      livestockHint: 'One animal or a whole group',
      draftSaved: 'Draft saved on this device',
      draftAuto: 'Draft saves automatically',
      draftHint:
        'Your text and contact details will remain. Select the photo and exact location again.',
      clear: 'Clear',
      offerType: 'Offer type',
      category: 'Category',
      livestockSale: 'Livestock sale',
      livestockFieldsHint:
        'Fill in four short fields — the rest works like a regular listing',
      livestockType: 'Livestock type',
      quantity: 'Number of animals',
      priceMode: 'Price applies to',
      perHead: 'One animal',
      wholeGroup: 'The whole group',
      breed: 'Breed',
      optional: 'optional',
      breedPlaceholder: 'For example, Kazakh Whiteheaded',
      name: 'Title',
      livestockTitlePlaceholder: 'For example, herd of 12 horses',
      standardTitlePlaceholder: 'For example, MTZ-82 field ploughing',
      photo: 'Photo',
      choosePhoto: 'Choose a real photo',
      photoHint: 'JPG, PNG, or WebP · up to 5 MB, optimized automatically',
      photoProcessing: 'Preparing photo…',
      photoReady: 'Photo is ready',
      photoOptimized: 'fast upload',
      previewAlt: 'Listing preview',
      price: 'Price',
      unit: 'Unit',
      region: 'Region',
      city: 'City or district',
      locating: 'Locating…',
      pointAdded: 'Exact location added',
      addPoint: 'Add location from device',
      updatePoint: 'tap to update',
      pointHint: 'Optional — the city and region will still remain visible',
      phone: 'Contact phone',
      seller: 'Posted by',
      person: 'Individual',
      company: 'Company',
      store: 'Store',
      livestockDelivery: 'I can help with transport',
      delivery: 'Delivery or travel available',
      available: 'Availability',
      availablePlaceholder: 'For example, September 2–7',
      description: 'Description',
      livestockDescription: 'Age, condition, documents, and viewing terms',
      standardDescription: 'Describe the condition, terms, and travel radius',
      publishing: 'Publishing…',
      publish: 'Publish listing',
      categories: [
        ['Сельхозуслуги', 'Farm services'],
        ['Спецтехника', 'Heavy machinery'],
        ['Корма и сено', 'Feed and hay'],
        ['Зерно', 'Grain'],
        ['Пастбища', 'Pastures'],
        ['Перевозка скота', 'Livestock transport'],
        ['Инструменты', 'Tools'],
        ['Электроника', 'Electronics'],
        ['Оборудование', 'Equipment'],
        ['Для мероприятий', 'Event equipment'],
        ['Стройматериалы', 'Building materials'],
        ['Остатки партий', 'Surplus batches'],
        ['Доставка', 'Delivery'],
      ],
      livestockTypes: [
        ['Лошади', 'Horses'],
        ['Крупный рогатый скот', 'Cattle'],
        ['Овцы', 'Sheep'],
        ['Козы', 'Goats'],
        ['Верблюды', 'Camels'],
        ['Другое', 'Other'],
      ],
    },
    requestForm: {
      eyebrow: 'I NEED',
      title: 'Create a request',
      lead: 'Describe the task and providers will see it and offer their price.',
      draftRestored: 'Request draft restored',
      draftAuto: 'Draft saves automatically',
      draftHint:
        'Completed fields will stay on this device even if your connection drops.',
      direction: 'Category',
      agro: 'Farm machinery and services',
      rent: 'Rental',
      build: 'Materials and construction',
      recycle: 'Recyclables and pickup',
      budget: 'Budget',
      budgetPlaceholder: 'Up to 50,000 ₸ or negotiable',
      need: 'What do you need?',
      needPlaceholder: 'For example, harvest 70 ha of wheat',
      region: 'Region',
      where: 'Where?',
      when: 'When?',
      whenPlaceholder: 'Tomorrow or a specific date',
      publishing: 'Publishing…',
      publish: 'Publish request',
    },
    regions: {
      eyebrow: 'QOLDAN GEOGRAPHY',
      title: 'Choose a region',
      lead: 'We will show offers and requests in the relevant part of Kazakhstan.',
      cities: 'Cities of republican significance',
      oblasts: 'Regions',
    },
    profile: {
      synced: 'Profile synced',
      demo: 'Demo mode',
      connecting: 'Connecting profile…',
      listings: 'listings',
      requests: 'requests',
      bookingsPending: 'bookings pending',
      reputation: 'PROVIDER REPUTATION',
      noRatings: 'No ratings yet',
      outOfFive: 'out of 5',
      verifiedReviews: 'verified reviews after completed requests.',
      firstRating:
        'The first rating appears after work completed through a Qoldan mini-tender.',
      moderation: 'Moderation',
      savedSearches: 'Saved searches',
      recent: 'Recently viewed',
      favorites: 'Favorites',
      messages: 'Messages',
      bookings: 'Bookings',
      appeals: 'My appeals',
      help: 'Help and safety',
      myListings: 'My listings',
      myRequests: 'My requests',
    },
    detail: {
      demo: 'DEMO · EXAMPLE',
      share: 'Share',
      noDescription: 'Contact the owner for more details about this offer.',
      negotiable: 'By arrangement',
      delivery: 'Delivery or travel is available',
      exactPoint: 'Exact location added by the owner',
      demoOwner: 'Qoldan demonstration',
      demoOwnerHint: 'Interface example · not a real seller',
      user: 'Qoldan user',
      verifiedBusiness: 'business verified by Qoldan',
      member: 'platform member',
      profile: 'Profile',
      rentalVerified: 'VERIFIED THROUGH RENTAL',
      reviews: 'Reviews after real transactions',
      noReviews:
        'There are no verified reviews yet. The first renter can leave one after a completed booking.',
      paused: 'Listing paused',
      active: 'Listing active',
      pausedHint: 'Only you can see it under My listings.',
      activeHint: 'It is visible to buyers and customers in the main catalog.',
      saving: 'Saving…',
      resume: 'Resume',
      pause: 'Pause listing',
      demoListing: 'Demonstration listing',
      demoListingHint:
        'Contacts are hidden: this card demonstrates the service and does not belong to a real seller.',
      createRequest: 'Create a similar real request',
      needPrefix: 'Needed',
      call: 'Call',
      openingChat: 'Opening conversation…',
      write: 'Message in Qoldan',
      book: 'Book',
      counterRequest: 'Create a matching request',
      report: 'Report listing',
    },
    requestDetail: {
      miniTender: 'MINI-TENDER · REQUEST',
      share: 'Share request',
      demoTitle: 'This is a demonstration scenario',
      demoText:
        'This request is not in the shared database and has no real customer. Responses are shown as an example of the future mini-tender.',
      createReal: 'Create a similar real request',
      openingChat: 'Opening conversation…',
      writeCustomer: 'Message the customer in Qoldan',
      responseSent: 'Your response has been sent',
      responseSentHint:
        'The customer can see your price and comment. No second response is needed — discuss details in messages.',
      propose: 'Make your offer',
      yourPrice: 'Your price',
      priceExample: 'For example, 48,000 ₸',
      recyclePriceExample: 'For example, 64 ₸/kg',
      comment: 'Comment',
      commentPlaceholder:
        'When you can complete it and what the price includes',
      sending: 'Sending…',
      addResponse: 'Send response',
      report: 'Report a problem with this request',
    },
    booking: {
      eyebrow: 'BOOKING',
      payOwner: 'pay the owner at pickup',
      availability: 'AVAILABILITY',
      chooseDates: 'Choose rental dates',
      checking: 'Checking…',
      serverCheck: 'Server will verify',
      occupiedCount: 'Occupied periods',
      free: 'Available',
      selected: 'Your selection',
      occupied: 'Already occupied',
      oneDay: 'one day',
      notSelected: 'No dates selected yet',
      ownerGetsRequest: 'The owner will receive a request for this period.',
      oneDayHint: 'For a one-day rental, select the date once.',
      nearestOccupied: 'Upcoming occupied periods',
      phone: 'Phone number for the owner to reply',
      delivery: 'Delivery needed in',
      comment: 'Comment',
      commentPlaceholder: 'Preferred time and address',
      sending: 'Sending…',
      send: 'Send to owner',
    },
    messages: {
      eyebrow: 'QOLDAN MESSAGES',
      title: 'Agree directly',
      lead: 'Every conversation is linked to a real listing or request.',
      safety:
        'Never send SMS codes, card details, or prepayment to a stranger.',
      dialogs: 'Conversations',
      inbox: 'Inbox',
      loading: 'Loading conversations…',
      start: 'Start a conversation',
      empty: 'No conversations yet',
      emptyHint: 'Open a real listing or request and choose Message in Qoldan.',
      correspondence: 'Messages',
      back: 'Back to conversations',
      listing: 'Listing',
      request: 'Request',
      loadingChat: 'Loading messages…',
      read: 'read',
      startTalk: 'Start the conversation',
      startTalkHint: 'Ask about the price, timing, condition, or travel terms.',
      placeholder: 'Write a message…',
      message: 'Message',
      send: 'Send message',
      choose: 'Choose a conversation',
      chooseHint: 'Messages and the publication context will appear here.',
    },
    support: {
      eyebrow: 'HELP AND SAFETY',
      title: 'Qoldan is here when you need it',
      lead: 'Short, plain-language rules and real support requests with a reference number and status.',
      safety: 'Safety',
      rules: 'Rules',
      privacy: 'Privacy',
      feedback: 'Contact us',
      queue: 'Queue',
      mainRule: 'THE MAIN RULE',
      mainRuleTitle: 'Check first, pay afterwards',
      mainRuleText:
        'Qoldan does not take payments yet and never asks for an SMS code. Participants agree and settle directly.',
      safetyItems: [
        [
          'Discuss everything in messages',
          'Record the price, scope, date, delivery, and cancellation terms before meeting.',
        ],
        [
          'Inspect the item or machinery',
          'Check condition, completeness, and documents. For livestock, ask for veterinary records.',
        ],
        [
          'Do not rush into prepayment',
          'Do not send money to a stranger just because of a discount or urgency.',
        ],
        [
          'Use a rental handover',
          'The built-in checklist records condition, included items, and deposit at handover and return.',
        ],
      ],
      reportProblem: 'Report a problem',
      honest: 'Post honestly',
      honestText:
        'Use real photos, a clear price, the correct category, location, and an up-to-date description.',
      oneOffer: 'One offer, one listing',
      oneOfferText:
        'Do not create duplicates, spam, or headlines that do not match the content.',
      prohibited: 'What is prohibited',
      prohibitedText:
        'Fraud, stolen or illegal goods, unsafe services, false livestock details, and other people’s photos.',
      moderationNote:
        'A report does not remove a post automatically. A moderator reviews the context, records a decision, and allows the author to appeal.',
      dataEyebrow: 'DATA IN PLAIN LANGUAGE',
      dataTitle: 'Only listing essentials are public',
      dataLead:
        'Before posting, check which contact details and information you leave in the public description.',
      privacyItems: [
        [
          'Others can see',
          'Title, photo, price, description, region, author name, and chosen contact details.',
        ],
        [
          'Not published',
          'BIN, moderation notes, private messages, and business verification details.',
        ],
        [
          'Exact location',
          'Added only when you choose to share it. The city or town still remains visible.',
        ],
      ],
      privacyNote:
        'Do not put your IIN, document number, banking details, home address, or SMS codes in a public description.',
      writeTeam: 'Write to the Qoldan team',
      writeTeamHint: 'We will save your request and show its status here.',
      topic: 'Topic',
      bug: 'App issue',
      idea: 'Idea for Qoldan',
      safetyQuestion: 'Safety question',
      other: 'Other question',
      messageLabel: 'What happened or what would you like to suggest?',
      messagePlaceholder:
        'Describe it in your own words. For an issue, tell us what you tapped and what you expected.',
      formHint:
        'The current page is attached automatically. Do not include identity or banking details.',
      sending: 'Sending…',
      send: 'Send request',
      myTickets: 'MY REQUESTS',
      history: 'History and status',
      updating: 'Updating…',
      teamReply: 'TEAM REPLY',
      noTickets: 'No requests yet',
      noTicketsText:
        'Your first request will appear here immediately after sending.',
      statusNew: 'New',
      statusReviewing: 'Under review',
      statusClosed: 'Closed',
    },
  },
} as const;

const authContent = {
  ru: {
    guest: 'Гость',
    signIn: 'Войти',
    title: 'Войдите, чтобы продолжить',
    lead: 'Смотреть реальные объявления можно без входа. Войдите через ChatGPT, чтобы публиковать, сохранять, бронировать и отвечать людям.',
    action: 'Войти через ChatGPT',
    privacy:
      'Qoldan получает только имя, email и безопасный идентификатор аккаунта.',
    signOut: 'Выйти из аккаунта',
  },
  kk: {
    guest: 'Қонақ',
    signIn: 'Кіру',
    title: 'Жалғастыру үшін кіріңіз',
    lead: 'Нақты хабарландыруларды кірусіз көруге болады. Жариялау, сақтау, брондау және адамдарға жауап беру үшін ChatGPT арқылы кіріңіз.',
    action: 'ChatGPT арқылы кіру',
    privacy:
      'Qoldan тек атыңызды, email-ді және аккаунттың қауіпсіз идентификаторын алады.',
    signOut: 'Аккаунттан шығу',
  },
  en: {
    guest: 'Guest',
    signIn: 'Sign in',
    title: 'Sign in to continue',
    lead: 'Anyone can browse real listings. Sign in with ChatGPT to post, save, book, and reply to people.',
    action: 'Sign in with ChatGPT',
    privacy:
      'Qoldan receives only your name, email, and a secure account identifier.',
    signOut: 'Sign out',
  },
} as const;

type QoldanClientProps = {
  isSignedIn: boolean;
  initialDisplayName: string | null;
  signInPath: string;
  signOutPath: string;
};

export default function QoldanClient({
  isSignedIn,
  initialDisplayName,
  signInPath,
  signOutPath,
}: QoldanClientProps) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('Все');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearchItem[]>([]);
  const [visibleListingCount, setVisibleListingCount] =
    useState(LISTINGS_PAGE_SIZE);
  const [listingSort, setListingSort] = useState<ListingSort>('recommended');
  const [mapOpen, setMapOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [appLang, setAppLang] = useState<AppLanguage>('ru');
  const [aboutTopic, setAboutTopic] = useState(0);
  const [allListings, setAllListings] = useState<Listing[]>(defaultListings);
  const [allRequests, setAllRequests] =
    useState<RequestItem[]>(initialRequests);
  const [recentViews, setRecentViews] = useState<RecentView[]>([]);
  const [listingDraft, setListingDraft] = useState<ListingFormDraft | null>(
    null,
  );
  const [requestDraft, setRequestDraft] = useState<FormDraft | null>(null);
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
  const [supportTopic, setSupportTopic] = useState<SupportTopic>('safety');
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [supportQueue, setSupportQueue] = useState<SupportTicket[]>([]);
  const [supportNotes, setSupportNotes] = useState<Record<string, string>>({});
  const [supportLoading, setSupportLoading] = useState(false);
  const [viewerName, setViewerName] = useState(
    initialDisplayName || authContent.ru.guest,
  );
  const [serverConnected, setServerConnected] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [requestLinkHandled, setRequestLinkHandled] = useState(false);
  const [modal, setModal] = useState<
    | 'listing'
    | 'request'
    | 'detail'
    | 'response'
    | 'profile'
    | 'provider'
    | 'saved-searches'
    | 'recent'
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
    | 'signin'
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
  const [listingImageBlob, setListingImageBlob] = useState<Blob | null>(null);
  const [listingImageSize, setListingImageSize] = useState(0);
  const [listingImageProcessing, setListingImageProcessing] = useState(false);
  const listingImageJob = useRef(0);
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
  const [visibleRequestCount, setVisibleRequestCount] =
    useState(REQUESTS_PAGE_SIZE);
  const [requestSeed, setRequestSeed] = useState('');
  const [requestSeedKind, setRequestSeedKind] =
    useState<RequestItem['kind']>('agro');
  const about = aboutContent[appLang];
  const tr = uiContent[appLang];
  const internal = internalContent[appLang];
  const auth = authContent[appLang];
  const renderRegionOptions = () => (
    <>
      <optgroup label={internal.regions.cities}>
        {kzRepublicanCities.map((region) => (
          <option key={region}>{region}</option>
        ))}
      </optgroup>
      <optgroup label={internal.regions.oblasts}>
        {kzOblasts.map((region) => (
          <option key={region}>{region}</option>
        ))}
      </optgroup>
    </>
  );
  const formatLocalizedBookingDate = (date: string) =>
    new Intl.DateTimeFormat(
      appLang === 'kk' ? 'kk-KZ' : appLang === 'en' ? 'en-US' : 'ru-RU',
      { day: 'numeric', month: 'short' },
    ).format(new Date(`${date}T00:00:00`));
  const localizedListingType = (value: Listing['type']) =>
    value === 'Продам' ? tr.sale : value === 'Сдам' ? tr.rent : tr.service;
  const localizedCategory = (value: string) =>
    internal.listing.categories.find(([source]) => source === value)?.[1] ||
    value;
  const localizedLivestockType = (value: string) =>
    internal.listing.livestockTypes.find(([source]) => source === value)?.[1] ||
    value;
  const localizedSupportCategory = (category: SupportTicket['category']) =>
    ({
      bug: internal.support.bug,
      idea: internal.support.idea,
      safety: internal.support.safetyQuestion,
      other: internal.support.other,
    })[category];
  const localizedSupportStatus = (status: SupportTicket['status']) =>
    ({
      new: internal.support.statusNew,
      reviewing: internal.support.statusReviewing,
      closed: internal.support.statusClosed,
    })[status];
  const selectedRegionLabel =
    selectedRegion === 'Весь Казахстан' ? tr.allKazakhstan : selectedRegion;
  const aboutIcons = [Tractor, Wrench, PackageOpen];
  const visibleViewerName = isSignedIn ? viewerName : auth.guest;
  const viewerInitials = visibleViewerName
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
  const openSupportCount = supportTickets.filter(
    (ticket) => ticket.status !== 'closed',
  ).length;
  const pendingSupportCount = supportQueue.filter(
    (ticket) => ticket.status !== 'closed',
  ).length;
  const realListingCount = allListings.filter(
    (listing) => !isDemoListing(listing.id),
  ).length;
  const demoListingCount = allListings.length - realListingCount;
  const realRequestCount = allRequests.filter(
    (request) => !isDemoRequest(request.id),
  ).length;
  const demoRequestCount = allRequests.length - realRequestCount;
  const recentItems = useMemo<RecentItem[]>(
    () =>
      recentViews.reduce<RecentItem[]>((items, view) => {
        if (view.kind === 'listing') {
          const listing = allListings.find(
            (item) => String(item.id) === view.id,
          );
          if (
            listing &&
            !isDemoListing(listing.id) &&
            listing.status !== 'paused'
          ) {
            items.push({ kind: 'listing', viewedAt: view.viewedAt, listing });
          }
          return items;
        }
        const request = allRequests.find((item) => String(item.id) === view.id);
        if (
          request &&
          !isDemoRequest(request.id) &&
          request.status !== 'closed'
        ) {
          items.push({ kind: 'request', viewedAt: view.viewedAt, request });
        }
        return items;
      }, []),
    [recentViews, allListings, allRequests],
  );
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
  const chooseLanguage = (language: AppLanguage) => {
    setAppLang(language);
    document.documentElement.lang = language;
    try {
      window.localStorage.setItem(UI_LANGUAGE_KEY, language);
    } catch {
      // Выбранный язык всё равно останется активным в текущем окне.
    }
  };
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(UI_LANGUAGE_KEY);
      if (stored === 'ru' || stored === 'kk' || stored === 'en') {
        setAppLang(stored);
        document.documentElement.lang = stored;
      }
    } catch {
      // По умолчанию интерфейс остаётся на русском языке.
    }
  }, []);
  useEffect(
    () => () => {
      if (listingImage.startsWith('blob:')) URL.revokeObjectURL(listingImage);
    },
    [listingImage],
  );
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(RECENT_VIEWS_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as unknown;
      if (!Array.isArray(parsed)) return;
      setRecentViews(
        parsed
          .filter(
            (item): item is RecentView =>
              Boolean(item) &&
              typeof item === 'object' &&
              ((item as RecentView).kind === 'listing' ||
                (item as RecentView).kind === 'request') &&
              typeof (item as RecentView).id === 'string' &&
              typeof (item as RecentView).viewedAt === 'number',
          )
          .slice(0, 12),
      );
    } catch {
      // Ограниченное хранилище не должно мешать работе каталога.
    }
  }, []);
  useEffect(() => {
    try {
      const storedListing = window.localStorage.getItem(LISTING_DRAFT_KEY);
      if (storedListing) {
        const parsed = JSON.parse(storedListing) as Partial<ListingFormDraft>;
        const fields = sanitizeDraftFields(parsed.fields);
        if (
          fields &&
          typeof parsed.savedAt === 'number' &&
          (parsed.flow === 'standard' || parsed.flow === 'livestock')
        ) {
          setListingDraft({
            fields,
            flow: parsed.flow,
            savedAt: parsed.savedAt,
          });
        }
      }
      const storedRequest = window.localStorage.getItem(REQUEST_DRAFT_KEY);
      if (storedRequest) {
        const parsed = JSON.parse(storedRequest) as Partial<FormDraft>;
        const fields = sanitizeDraftFields(parsed.fields);
        if (fields && typeof parsed.savedAt === 'number') {
          setRequestDraft({ fields, savedAt: parsed.savedAt });
        }
      }
    } catch {
      // Ограниченное хранилище не должно мешать публикации.
    }
  }, []);
  useEffect(() => {
    let active = true;
    const loadMarketplace = async () => {
      try {
        const response = await fetch('/api/bootstrap', { cache: 'no-store' });
        if (!response.ok) throw new Error(await apiError(response));
        const data = (await response.json()) as {
          viewer: { displayName: string } | null;
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
        if (data.viewer) setViewerName(data.viewer.displayName);
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
          if (listingSort === 'newest') {
            return (b.createdAt || 0) - (a.createdAt || 0);
          }
          if (listingSort === 'price_asc' || listingSort === 'price_desc') {
            const priceA = listingPriceValue(a.price);
            const priceB = listingPriceValue(b.price);
            if (priceA === null) return priceB === null ? 0 : 1;
            if (priceB === null) return -1;
            return listingSort === 'price_asc'
              ? priceA - priceB
              : priceB - priceA;
          }
          if (userCoords) {
            return (
              calculateDistanceKm(userCoords, resolveCoordinates(a)) -
              calculateDistanceKm(userCoords, resolveCoordinates(b))
            );
          }
          return 0;
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
      listingSort,
    ],
  );
  const visibleListings = filtered.slice(0, visibleListingCount);
  const remainingListingCount = Math.max(
    filtered.length - visibleListings.length,
    0,
  );
  const nextListingCount = Math.min(LISTINGS_PAGE_SIZE, remainingListingCount);
  useEffect(() => {
    setVisibleListingCount(LISTINGS_PAGE_SIZE);
  }, [
    query,
    type,
    categoryFilter,
    maxDistance,
    favoriteOnly,
    myOnly,
    selectedRegion,
    deliveryOnly,
    companyOnly,
    listingContentMode,
    livestockTypeFilter,
    livestockPriceModeFilter,
    livestockQuantityGroup,
    userCoords,
    listingSort,
  ]);
  const filteredRequests = useMemo(
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
  const visibleRequests = filteredRequests.slice(0, visibleRequestCount);
  const remainingRequestCount = Math.max(
    filteredRequests.length - visibleRequests.length,
    0,
  );
  const nextRequestCount = Math.min(REQUESTS_PAGE_SIZE, remainingRequestCount);
  useEffect(() => {
    setVisibleRequestCount(REQUESTS_PAGE_SIZE);
  }, [
    allRequests,
    requestKind,
    requestOwnerOnly,
    requestContentMode,
    selectedRegion,
  ]);
  const requireSignIn = () => {
    if (isSignedIn) return true;
    setModal('signin');
    setMenuOpen(false);
    return false;
  };
  const toggleFavorite = async (id: Listing['id']) => {
    if (!requireSignIn()) return;
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
  const rememberRecentView = (
    kind: RecentView['kind'],
    id: string | number,
  ) => {
    const nextItem: RecentView = {
      kind,
      id: String(id),
      viewedAt: Date.now(),
    };
    setRecentViews((current) => {
      const next = [
        nextItem,
        ...current.filter(
          (item) => item.kind !== kind || item.id !== nextItem.id,
        ),
      ].slice(0, 12);
      try {
        window.localStorage.setItem(RECENT_VIEWS_KEY, JSON.stringify(next));
      } catch {
        // История остаётся доступной до закрытия страницы.
      }
      return next;
    });
  };
  const clearRecentViews = () => {
    setRecentViews([]);
    try {
      window.localStorage.removeItem(RECENT_VIEWS_KEY);
    } catch {
      // Список уже очищен в текущем сеансе.
    }
    notify('История просмотров очищена');
  };
  const storeDraft = (key: string, value: FormDraft | ListingFormDraft) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Поля остаются в текущем окне, даже если хранилище недоступно.
    }
  };
  const removeDraft = (key: string) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Локальное состояние всё равно очищается.
    }
  };
  const saveListingDraft = (
    form: HTMLFormElement,
    flow: ListingFormDraft['flow'] = listingFlow,
  ) => {
    setListingDraft((current) => {
      const next: ListingFormDraft = {
        flow,
        fields: { ...current?.fields, ...collectDraftFields(form) },
        savedAt: Date.now(),
      };
      storeDraft(LISTING_DRAFT_KEY, next);
      return next;
    });
  };
  const saveRequestDraft = (form: HTMLFormElement) => {
    setRequestDraft((current) => {
      const next: FormDraft = {
        fields: { ...current?.fields, ...collectDraftFields(form) },
        savedAt: Date.now(),
      };
      storeDraft(REQUEST_DRAFT_KEY, next);
      return next;
    });
  };
  const clearListingImageState = () => {
    listingImageJob.current += 1;
    setListingImage('');
    setListingImageBlob(null);
    setListingImageSize(0);
    setListingImageProcessing(false);
  };
  const clearListingDraft = (form?: HTMLFormElement | null) => {
    setListingDraft(null);
    removeDraft(LISTING_DRAFT_KEY);
    if (form) clearFormFields(form);
    setListingFlow('standard');
    clearListingImageState();
    setListingCoords(null);
    notify('Черновик объявления очищен');
  };
  const clearRequestDraft = (form?: HTMLFormElement | null) => {
    setRequestDraft(null);
    removeDraft(REQUEST_DRAFT_KEY);
    if (form) clearFormFields(form);
    notify('Черновик заявки очищен');
  };
  const changeListingFlow = (
    flow: ListingFormDraft['flow'],
    form?: HTMLFormElement | null,
  ) => {
    if (form) saveListingDraft(form, flow);
    setListingFlow(flow);
  };
  useEffect(() => {
    if (!storageReady || requestLinkHandled) return;
    const linkedRequestId = new URLSearchParams(window.location.search).get(
      'request',
    );
    setRequestLinkHandled(true);
    if (!linkedRequestId) return;

    let active = true;
    const openLinkedRequest = async () => {
      try {
        const response = await fetch(
          `/api/requests/${encodeURIComponent(linkedRequestId)}`,
          { cache: 'no-store' },
        );
        if (!response.ok) throw new Error(await apiError(response));
        const data = (await response.json()) as {
          request: RequestItem;
          responses: ResponseItem[];
        };
        if (!active) return;
        setAllRequests((current) => [
          data.request,
          ...current.filter(
            (item) => String(item.id) !== String(data.request.id),
          ),
        ]);
        setAllResponses((current) => [
          ...data.responses,
          ...current.filter(
            (item) => item.requestId !== String(data.request.id),
          ),
        ]);
        setSelectedRequest(data.request);
        rememberRecentView('request', data.request.id);
        setRequestContentMode('real');
        setRequestOwnerOnly(false);
        setModal('response');
      } catch (error) {
        if (!active) return;
        notify(
          error instanceof Error
            ? error.message
            : 'Не удалось открыть заявку по ссылке',
        );
      }
    };
    void openLinkedRequest();
    return () => {
      active = false;
    };
  }, [storageReady, requestLinkHandled]);
  const saveCurrentSearch = async () => {
    if (!requireSignIn()) return;
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
    if (!requireSignIn()) return;
    clearListingImageState();
    setListingFlow(listingDraft?.flow || 'standard');
    setListingCoords(null);
    setModal('listing');
  };
  const openRequestForm = (seed = '', kind: RequestItem['kind'] = 'agro') => {
    if (!requireSignIn()) return;
    setRequestSeed(seed);
    setRequestSeedKind(kind);
    setModal('request');
  };
  const handleListingImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      clearListingImageState();
      return;
    }
    if (!LISTING_IMAGE_TYPES.has(file.type)) {
      e.target.value = '';
      clearListingImageState();
      notify('Нужен файл JPG, PNG или WebP');
      return;
    }
    if (file.size > MAX_LISTING_IMAGE_BYTES) {
      e.target.value = '';
      clearListingImageState();
      notify('Фото слишком большое — выберите файл до 5 МБ');
      return;
    }

    const jobId = ++listingImageJob.current;
    setListingImage('');
    setListingImageBlob(null);
    setListingImageSize(0);
    setListingImageProcessing(true);
    try {
      const optimized = await optimizeListingImage(file);
      if (jobId !== listingImageJob.current) return;
      setListingImageBlob(optimized);
      setListingImageSize(optimized.size);
      setListingImage(URL.createObjectURL(optimized));
    } catch (error) {
      if (jobId !== listingImageJob.current) return;
      e.target.value = '';
      notify(
        error instanceof Error
          ? error.message
          : 'Не удалось обработать фотографию',
      );
    } finally {
      if (jobId === listingImageJob.current) setListingImageProcessing(false);
    }
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
        setListingSort('recommended');
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
    if (!isDemoListing(item.id)) rememberRecentView('listing', item.id);
    setSelectedListing(item);
    setModal('detail');
  };
  const openRequest = (item: RequestItem) => {
    if (!isDemoRequest(item.id)) rememberRecentView('request', item.id);
    setSelectedRequest(item);
    setModal('response');
  };
  const openRecentItem = (item: RecentItem) => {
    if (item.kind === 'listing') openListing(item.listing);
    else openRequest(item.request);
  };
  const shareListing = async (item: Listing) => {
    const url = new URL(
      `/listing/${encodeURIComponent(String(item.id))}`,
      window.location.origin,
    ).toString();
    const shareData = {
      title: `${item.title} — Qoldan`,
      text: `${item.title} · ${item.price}${item.unit ? ` ${item.unit}` : ''}`,
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        notify('Объявление отправлено');
        return;
      }
      await navigator.clipboard.writeText(url);
      notify('Ссылка на объявление скопирована');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(url);
        notify('Ссылка на объявление скопирована');
      } catch {
        notify('Не удалось скопировать ссылку — попробуйте ещё раз');
      }
    }
  };
  const shareRequest = async (item: RequestItem) => {
    const url = new URL(
      `/request/${encodeURIComponent(String(item.id))}`,
      window.location.origin,
    ).toString();
    const shareData = {
      title: `${item.title} — заявка Qoldan`,
      text: `${item.place} · ${item.when} · ${item.budget}`,
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        notify('Заявка отправлена');
        return;
      }
      await navigator.clipboard.writeText(url);
      notify('Ссылка на заявку скопирована');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(url);
        notify('Ссылка на заявку скопирована');
      } catch {
        notify('Не удалось скопировать ссылку — попробуйте ещё раз');
      }
    }
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
    if (!requireSignIn()) return;
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
    if (!requireSignIn()) return;
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
    if (!requireSignIn()) return;
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
    if (!requireSignIn()) return;
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
    if (!requireSignIn()) return;
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
  const openSupport = async (topic: SupportTopic = 'safety') => {
    setSupportTopic(topic);
    setModal('info');
    setSupportLoading(true);
    try {
      const response = await fetch('/api/support', { cache: 'no-store' });
      if (!response.ok) throw new Error(await apiError(response));
      const data = (await response.json()) as {
        tickets: SupportTicket[];
        queue: SupportTicket[];
        canModerate: boolean;
      };
      setSupportTickets(data.tickets);
      setSupportQueue(data.queue);
      setSupportNotes(
        Object.fromEntries(
          data.queue.map((ticket) => [ticket.id, ticket.reviewNote]),
        ),
      );
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Не удалось загрузить обращения',
      );
    } finally {
      setSupportLoading(false);
    }
  };
  const submitSupportTicket = async (event: SubmitFormEvent) => {
    event.preventDefault();
    if (!requireSignIn()) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    setSubmitting('support-ticket');
    try {
      const pageContext = `${window.location.pathname}${window.location.hash}`;
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          category: fieldText(fields, 'category'),
          message: fieldText(fields, 'message'),
          pageContext,
        }),
      });
      if (!response.ok) throw new Error(await apiError(response));
      const data = (await response.json()) as { ticket: SupportTicket };
      setSupportTickets((current) => [data.ticket, ...current]);
      if (canModerate) {
        setSupportQueue((current) => [data.ticket, ...current]);
      }
      form.reset();
      notify(`Обращение ${data.ticket.id.slice(0, 8)} получено`);
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Не удалось отправить обращение',
      );
    } finally {
      setSubmitting(null);
    }
  };
  const updateSupportTicket = async (
    ticketId: string,
    status: 'reviewing' | 'closed',
  ) => {
    setSubmitting(`support-${ticketId}`);
    try {
      const response = await fetch('/api/support', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          status,
          reviewNote: supportNotes[ticketId] || '',
        }),
      });
      if (!response.ok) throw new Error(await apiError(response));
      const data = (await response.json()) as {
        ticket: Pick<
          SupportTicket,
          | 'id'
          | 'status'
          | 'reviewNote'
          | 'reviewerName'
          | 'reviewedAt'
          | 'updatedAt'
        >;
      };
      const mergeTicket = (ticket: SupportTicket) =>
        ticket.id === data.ticket.id ? { ...ticket, ...data.ticket } : ticket;
      setSupportQueue((current) => current.map(mergeTicket));
      setSupportTickets((current) => current.map(mergeTicket));
      notify(status === 'closed' ? 'Обращение закрыто' : 'Обращение в работе');
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Не удалось обновить обращение',
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
    if (!requireSignIn()) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    if (!isValidPhone(fieldText(fields, 'phone'))) {
      notify('Проверьте номер телефона: нужно от 10 до 15 цифр');
      return;
    }
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
    if (!requireSignIn()) return;
    const f = new FormData(e.currentTarget);
    if (listingImageProcessing) {
      notify('Дождитесь, пока фотография будет подготовлена');
      return;
    }
    if (!listingImage || !listingImageBlob) {
      notify('Добавьте фотографию объявления');
      return;
    }
    if (!isValidPhone(fieldText(f, 'phone'))) {
      notify('Проверьте номер телефона: нужно от 10 до 15 цифр');
      return;
    }
    if (fieldText(f, 'title').trim().length < 4) {
      notify('Название объявления должно содержать хотя бы 4 символа');
      return;
    }
    if (!fieldText(f, 'location').trim()) {
      notify('Укажите город или населённый пункт');
      return;
    }
    setSubmitting('listing');
    let pendingUploadUrl = '';
    try {
      const uploadData = new FormData();
      uploadData.set('image', listingImageBlob, 'qoldan-photo.jpg');
      const uploadResponse = await fetch('/api/uploads', {
        method: 'POST',
        body: uploadData,
      });
      if (!uploadResponse.ok) throw new Error(await apiError(uploadResponse));
      const upload = (await uploadResponse.json()) as { url: string };
      pendingUploadUrl = upload.url;
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
      pendingUploadUrl = '';
      setAllListings((previous) => [data.listing, ...previous]);
      setListingDraft(null);
      removeDraft(LISTING_DRAFT_KEY);
      clearListingImageState();
      setServerConnected(true);
      setModal(null);
      notify('Объявление опубликовано и доступно с других устройств');
    } catch (error) {
      if (pendingUploadUrl) {
        await fetch('/api/uploads', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url: pendingUploadUrl }),
        }).catch(() => null);
      }
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
    if (!requireSignIn()) return;
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
      setRequestDraft(null);
      removeDraft(REQUEST_DRAFT_KEY);
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
    if (!requireSignIn()) return;
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
    if (!requireSignIn()) return;
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
    if (!requireSignIn()) return;
    if (!selectedListing) return;
    setBookingRange(undefined);
    setAvailabilityRanges([]);
    setModal('booking');
    void loadBookingAvailability(String(selectedListing.id));
  };
  const submitBooking = async (e: SubmitFormEvent) => {
    e.preventDefault();
    if (!requireSignIn()) return;
    if (!selectedListing) return;
    const data = new FormData(e.currentTarget);
    if (!isValidPhone(fieldText(data, 'customerPhone'))) {
      notify('Проверьте номер телефона: нужно от 10 до 15 цифр');
      return;
    }
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
    if (!requireSignIn()) return;
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
    if (!requireSignIn()) return;
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
    if (!requireSignIn()) return;
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
    if (!requireSignIn()) return;
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
          <em>{tr.country}</em>
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
            {tr.navListings}
          </a>
          <a
            href="#requests"
            onClick={() => {
              setMenuOpen(false);
              setRequestOwnerOnly(false);
            }}
          >
            {tr.navRequests}
          </a>
          <a href="#recycle" onClick={() => setMenuOpen(false)}>
            {tr.navRecycle}
          </a>
          <a href="#about" onClick={() => setMenuOpen(false)}>
            {tr.navAbout}
          </a>
        </nav>
        <div className="header-actions">
          <div className="header-language" aria-label="Тіл · Язык · Language">
            {(
              [
                ['ru', 'RU'],
                ['kk', 'QAZ'],
                ['en', 'EN'],
              ] as const
            ).map(([code, label]) => (
              <button
                key={code}
                type="button"
                className={appLang === code ? 'active' : ''}
                aria-pressed={appLang === code}
                onClick={() => chooseLanguage(code)}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            className="icon-button hide-mobile"
            onClick={() => void openMessages()}
            aria-label={`${tr.messages}${messagingUnreadCount ? `: ${messagingUnreadCount}` : ''}`}
          >
            <MessageCircle size={19} />
            {messagingUnreadCount > 0 && <i />}
          </button>
          <button
            className="icon-button hide-mobile"
            onClick={() => setModal('notifications')}
            aria-label={tr.notifications}
          >
            <Bell size={19} />
            {activities.length > 0 && <i />}
          </button>
          <button
            className="profile hide-mobile"
            onClick={() => setModal(isSignedIn ? 'profile' : 'signin')}
          >
            <span>{viewerInitials || 'Q'}</span>
            <b>{isSignedIn ? viewerName : auth.signIn}</b>
            <ChevronDown size={15} />
          </button>
          <button className="primary-button" onClick={openAddListing}>
            <Plus size={18} /> {tr.publish}
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
            <MapPin size={14} /> {tr.heroEyebrow}
          </span>
          <h1>
            {tr.heroTitle} <span>{tr.heroAccent}</span>
          </h1>
          <p>{tr.heroLead}</p>
          <div className="searchbox">
            <Search size={22} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tr.searchPlaceholder}
            />
            <button className="location" onClick={() => setModal('regions')}>
              <MapPin size={17} /> {selectedRegionLabel}{' '}
              <ChevronDown size={15} />
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
              {tr.search}
            </button>
          </div>
          <div className="quick-search">
            <span>{tr.popular}</span>
            {tr.popularItems.map(([value, label]) => (
              <button
                key={value}
                onClick={() => {
                  if (value === 'Лошади') {
                    setQuery('');
                    setCategoryFilter('Скот и животные');
                    resetLivestockFilters();
                    setLivestockTypeFilter('Лошади');
                  } else {
                    setQuery(value);
                  }
                  setFavoriteOnly(false);
                  setMyOnly(false);
                  document
                    .querySelector('#catalog')
                    ?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="hero-art">
          <img
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=85"
            alt="Поля Казахстана"
            decoding="async"
            fetchPriority="high"
          />
          <div className="float-card fc-one">
            <span>
              <Map size={20} />
            </span>
            <div>
              <b>{tr.allKazakhstan}</b>
              <small>{tr.regionsCaption}</small>
            </div>
          </div>
          <div className="float-card fc-two">
            <span>
              <CheckCircle2 size={20} />
            </span>
            <div>
              <b>{tr.nearbyOffers}</b>
              <small>{tr.peopleAndCompanies}</small>
            </div>
          </div>
        </div>
      </section>
      <section className="categories wrap">
        <div className="section-head">
          <div>
            <span className="kicker">{tr.categoriesKicker}</span>
            <h2>{tr.categoriesTitle}</h2>
          </div>
          <a href="#catalog">
            {tr.seeAll} <ArrowRight size={17} />
          </a>
        </div>
        <div className="category-grid">
          {[
            [
              'green',
              Tractor,
              tr.categories[0].title,
              tr.categories[0].description,
              tr.openSection,
              'Сельхоз',
            ],
            [
              'orange',
              Wrench,
              tr.categories[1].title,
              tr.categories[1].description,
              tr.openSection,
              'Инструменты',
            ],
            [
              'sand',
              PackageOpen,
              tr.categories[2].title,
              tr.categories[2].description,
              tr.openSection,
              'Стройматериалы',
            ],
            [
              'livestock',
              Beef,
              tr.categories[3].title,
              tr.categories[3].description,
              tr.openSection,
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
              <span className="kicker">{tr.mapKicker}</span>
              <h2>{tr.mapTitle}</h2>
              <p>{tr.mapLead}</p>
            </div>
            <button onClick={() => setModal('regions')}>
              <MapPin /> {selectedRegionLabel}
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
              {tr.allRegions} <ArrowRight />
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
                  ? tr.myOffers
                  : favoriteOnly
                    ? tr.favoritesKicker
                    : selectedRegion === 'Весь Казахстан'
                      ? tr.catalogCountry
                      : tr.catalogRegion}
              </span>
              <h2>
                {myOnly
                  ? tr.myListings
                  : favoriteOnly
                    ? tr.savedListings
                    : selectedRegionLabel}
              </h2>
            </div>
            <div className="view-controls">
              <button
                className={!mapOpen ? 'active' : ''}
                onClick={() => setMapOpen(false)}
              >
                <Menu size={17} /> {tr.list}
              </button>
              <button
                className={mapOpen ? 'active' : ''}
                onClick={() => setMapOpen(true)}
              >
                <Map size={17} /> {tr.onMap}
              </button>
            </div>
          </div>
          {!myOnly && !favoriteOnly && (
            <div className="data-source-bar">
              <div>
                <CheckCircle2 />
                <span>
                  <b>{tr.transparentFeed}</b>
                  {tr.transparentFeedText}
                </span>
              </div>
              <div
                className="data-source-switch"
                aria-label="Источник объявлений"
              >
                {(
                  [
                    ['all', `${tr.all} · ${allListings.length}`],
                    ['real', `${tr.real} · ${realListingCount}`],
                    ['demo', `${tr.demo} · ${demoListingCount}`],
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
              {(
                [
                  ['Все', tr.all],
                  ['Продам', tr.sale],
                  ['Сдам', tr.rent],
                  ['Окажу услугу', tr.service],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  className={type === value ? 'active' : ''}
                  onClick={() => setType(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="filter-actions">
              <label className="sort-control">
                <ArrowUpDown />
                <select
                  aria-label="Сортировка объявлений"
                  value={listingSort}
                  onChange={(event) =>
                    setListingSort(event.target.value as ListingSort)
                  }
                >
                  <option value="recommended">
                    {userCoords ? tr.nearest : tr.recommended}
                  </option>
                  <option value="newest">{tr.newest}</option>
                  <option value="price_asc">{tr.cheapest}</option>
                  <option value="price_desc">{tr.expensive}</option>
                </select>
              </label>
              <button
                className={`near-me-button ${userCoords ? 'active' : ''}`}
                type="button"
                disabled={userLocationLoading}
                aria-pressed={Boolean(userCoords)}
                onClick={toggleNearbyMode}
              >
                <Navigation />
                {userLocationLoading
                  ? tr.locating
                  : userCoords
                    ? `${tr.nearMe} · ${maxDistance} км`
                    : tr.nearMe}
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
                <SlidersHorizontal size={17} /> {tr.filters}{' '}
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
                  setListingSort('recommended');
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
              {visibleListings.map((item) => (
                <article className="listing-card" key={item.id}>
                  <button
                    className="listing-open"
                    onClick={() => openListing(item)}
                    aria-label={`Открыть объявление: ${item.title}`}
                  />
                  <div className="listing-image">
                    <img
                      src={item.image}
                      alt={item.title}
                      loading="lazy"
                      decoding="async"
                    />
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
                  setListingSort('recommended');
                }}
              >
                Сбросить фильтры
              </button>
            </div>
          )}
          {!mapOpen && filtered.length > 0 && (
            <div className="catalog-pagination" aria-live="polite">
              <p>
                {tr.shown} <b>{visibleListings.length}</b> {tr.of}{' '}
                <b>{filtered.length}</b>
              </p>
              {remainingListingCount > 0 ? (
                <button
                  className="more-button"
                  type="button"
                  onClick={() =>
                    setVisibleListingCount(
                      (count) => count + LISTINGS_PAGE_SIZE,
                    )
                  }
                >
                  {tr.showMore} {nextListingCount}
                </button>
              ) : (
                <span>{tr.viewedAll}</span>
              )}
            </div>
          )}
        </div>
      </section>
      <section className="requests wrap" id="requests">
        <div className="request-intro">
          <span className="kicker">{tr.requestKicker}</span>
          <h2>{tr.requestTitle}</h2>
          <p>{tr.requestLead}</p>
          <button className="dark-button" onClick={() => openRequestForm()}>
            <Plus size={18} /> {tr.createRequest}
          </button>
          <div className="intro-stat">
            <b>{realRequestCount}</b>
            <span>
              {tr.realRequests}
              <br />
              {tr.demoNearby} {demoRequestCount}
            </span>
          </div>
        </div>
        <div className="request-list">
          <div className="request-list-head">
            <div>
              <h3>{requestOwnerOnly ? tr.myRequests : tr.activeRequests}</h3>
              {requestOwnerOnly && (
                <button onClick={() => setRequestOwnerOnly(false)}>
                  {tr.showAll}
                </button>
              )}
            </div>
            <span className="live-dot">{tr.autoUpdate}</span>
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
                    ['all', `${tr.all} · ${allRequests.length}`],
                    ['real', `${tr.real} · ${realRequestCount}`],
                    ['demo', `${tr.demo} · ${demoRequestCount}`],
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
                ['all', tr.all],
                ['agro', tr.agro],
                ['rent', tr.rental],
                ['build', tr.build],
                ['recycle', tr.recycle],
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
                    {tr.request} #{r.id}
                    <em
                      className={`request-source-badge ${isDemoRequest(r.id) ? 'demo' : 'real'}`}
                    >
                      {isDemoRequest(r.id) ? tr.demoExample : tr.realRequest}
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
                  <button onClick={() => openRequest(r)}>
                    <MessageCircle size={14} />
                    {r.responses} {tr.responses}
                  </button>
                </div>
              </article>
            );
          })}
          {visibleRequests.length === 0 && (
            <div className="request-empty">
              <MessageCircle />
              <b>{tr.noRequests}</b>
              <span>{tr.noRequestsText}</span>
              <button onClick={() => openRequestForm()}>
                {tr.createRequest}
              </button>
            </div>
          )}
          {filteredRequests.length > 0 && (
            <div
              className="catalog-pagination request-pagination"
              aria-live="polite"
            >
              <p>
                {tr.shown} <b>{visibleRequests.length}</b> {tr.of}{' '}
                <b>{filteredRequests.length}</b>
              </p>
              {remainingRequestCount > 0 ? (
                <button
                  className="more-button"
                  type="button"
                  onClick={() =>
                    setVisibleRequestCount(
                      (count) => count + REQUESTS_PAGE_SIZE,
                    )
                  }
                >
                  {tr.showMore} {nextRequestCount}
                </button>
              ) : (
                <span>{tr.viewedAll}</span>
              )}
            </div>
          )}
        </div>
      </section>
      <section className="recycle-section" id="recycle">
        <div className="wrap">
          <div className="recycle-head">
            <div>
              <span className="kicker">{tr.recycleKicker}</span>
              <h2>{tr.recycleTitle}</h2>
              <p>{tr.recycleLead}</p>
            </div>
            <button
              onClick={() => {
                if (requireSignIn()) setModal('recycle');
              }}
            >
              <Plus /> {tr.listBatch}
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
              <button onClick={() => openRequest(initialRequests[3])}>
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
            <div className="language-switch" aria-label="Тіл · Язык · Language">
              {(
                [
                  ['ru', 'Русский'],
                  ['kk', 'Қазақша'],
                  ['en', 'English'],
                ] as const
              ).map(([code, label]) => (
                <button
                  key={code}
                  className={appLang === code ? 'active' : ''}
                  onClick={() => chooseLanguage(code)}
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
                  {appLang === 'ru'
                    ? 'Как это работает'
                    : appLang === 'kk'
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
          <span className="kicker">{tr.easyStart}</span>
          <h2>{tr.stepsTitle}</h2>
          <div className="steps">
            {tr.steps.map((step, i) => (
              <div className="step-fragment" key={step[0]}>
                <div>
                  <span>{i + 1}</span>
                  <h3>{step[0]}</h3>
                  <p>{step[1]}</p>
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
            <p>{tr.footerLead}</p>
          </div>
          <div>
            <b>{tr.platform}</b>
            <a
              href="#catalog"
              onClick={() => {
                setFavoriteOnly(false);
                setMyOnly(false);
              }}
            >
              {tr.navListings}
            </a>
            <a href="#requests" onClick={() => setRequestOwnerOnly(false)}>
              {tr.requests}
            </a>
            <a href="#recycle">{tr.recycleExchange}</a>
            <a href="#about">{tr.navAbout}</a>
          </div>
          <div>
            <b>{tr.kazakhstan}</b>
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
            <button onClick={() => setModal('regions')}>
              {tr.allRegionsShort}
            </button>
          </div>
          <div>
            <b>{tr.help}</b>
            <button onClick={() => void openSupport('rules')}>
              {tr.rules}
            </button>
            <button onClick={() => void openSupport('feedback')}>
              {tr.contact}
            </button>
            <button onClick={() => void openSupport('safety')}>
              {tr.safety}
            </button>
          </div>
        </div>
        <div className="wrap foot-bottom">
          <span>© 2026 Qoldan. {tr.madeIn}</span>
          <div className="footer-languages" aria-label="Тіл · Язык · Language">
            {(
              [
                ['ru', 'Русский'],
                ['kk', 'Қазақша'],
                ['en', 'English'],
              ] as const
            ).map(([code, label]) => (
              <button
                key={code}
                type="button"
                className={appLang === code ? 'active' : ''}
                onClick={() => chooseLanguage(code)}
              >
                {label}
              </button>
            ))}
          </div>
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
          <span>{tr.mobileSearch}</span>
        </a>
        <a href="#requests" onClick={() => setRequestOwnerOnly(false)}>
          <MessageCircle />
          <span>{tr.requests}</span>
        </a>
        <button onClick={openAddListing} aria-label={internal.listing.title}>
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
          <span>{tr.favorites}</span>
        </a>
        <button
          className="mobile-profile"
          onClick={() => setModal(isSignedIn ? 'profile' : 'signin')}
        >
          <UserRound />
          <span>{isSignedIn ? tr.profile : auth.signIn}</span>
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
            className={`app-modal ${modal === 'detail' ? 'detail-modal' : ''} ${modal === 'provider' ? 'provider-modal' : ''} ${modal === 'moderation' ? 'moderation-modal' : ''} ${modal === 'messages' ? 'messages-modal' : ''} ${modal === 'info' ? 'info-modal' : ''}`}
            aria-label="Окно Qoldan"
          >
            <button
              className="modal-close"
              onClick={() => setModal(null)}
              aria-label={internal.close}
            >
              <X />
            </button>
            {modal === 'signin' && (
              <>
                <div className="modal-title">
                  <span>
                    <UserRound />
                  </span>
                  <div>
                    <small>QOLDAN</small>
                    <h2>{auth.title}</h2>
                    <p>{auth.lead}</p>
                  </div>
                </div>
                <div className="signin-panel">
                  <a href={signInPath} target="_top">
                    <UserRound /> {auth.action}
                  </a>
                  <p>
                    <ShieldCheck /> {auth.privacy}
                  </p>
                </div>
              </>
            )}
            {modal === 'listing' && (
              <>
                <div className="modal-title">
                  <span>
                    <Plus />
                  </span>
                  <div>
                    <small>{internal.listing.eyebrow}</small>
                    <h2>{internal.listing.title}</h2>
                    <p>{internal.listing.lead}</p>
                  </div>
                </div>
                <form
                  className="product-form"
                  onSubmit={addListing}
                  onChange={(event) => saveListingDraft(event.currentTarget)}
                >
                  <div className="listing-mode-switch wide">
                    <button
                      type="button"
                      className={listingFlow === 'standard' ? 'active' : ''}
                      aria-pressed={listingFlow === 'standard'}
                      onClick={(event) =>
                        changeListingFlow('standard', event.currentTarget.form)
                      }
                    >
                      <PackageOpen />
                      <span>
                        <b>{internal.listing.standard}</b>
                        <small>{internal.listing.standardHint}</small>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={listingFlow === 'livestock' ? 'active' : ''}
                      aria-pressed={listingFlow === 'livestock'}
                      onClick={(event) =>
                        changeListingFlow('livestock', event.currentTarget.form)
                      }
                    >
                      <Beef />
                      <span>
                        <b>{internal.listing.livestock}</b>
                        <small>{internal.listing.livestockHint}</small>
                      </span>
                    </button>
                  </div>
                  <div className="form-draft-note wide">
                    <CheckCircle2 />
                    <span>
                      <b>
                        {listingDraft
                          ? internal.listing.draftSaved
                          : internal.listing.draftAuto}
                      </b>
                      <small>{internal.listing.draftHint}</small>
                    </span>
                    {listingDraft && (
                      <button
                        type="button"
                        onClick={(event) =>
                          clearListingDraft(event.currentTarget.form)
                        }
                      >
                        {internal.listing.clear}
                      </button>
                    )}
                  </div>
                  {listingFlow === 'standard' ? (
                    <>
                      <label>
                        {internal.listing.offerType}
                        <select
                          name="type"
                          required
                          defaultValue={listingDraft?.fields.type || 'Продам'}
                        >
                          <option value="Продам">{tr.sale}</option>
                          <option value="Сдам">{tr.rent}</option>
                          <option value="Окажу услугу">{tr.service}</option>
                        </select>
                      </label>
                      <label>
                        {internal.listing.category}
                        <select
                          name="category"
                          required
                          defaultValue={
                            listingDraft?.fields.category || 'Сельхозуслуги'
                          }
                        >
                          {internal.listing.categories.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
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
                          <b>{internal.listing.livestockSale}</b>
                          <small>{internal.listing.livestockFieldsHint}</small>
                        </div>
                      </div>
                      <label>
                        {internal.listing.livestockType}
                        <select
                          name="livestockType"
                          required
                          defaultValue={
                            listingDraft?.fields.livestockType || 'Лошади'
                          }
                        >
                          {internal.listing.livestockTypes.map(
                            ([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                      <label>
                        {internal.listing.quantity}
                        <input
                          name="livestockQuantity"
                          type="number"
                          min="1"
                          max="10000"
                          defaultValue={
                            listingDraft?.fields.livestockQuantity || '1'
                          }
                          required
                        />
                      </label>
                      <label>
                        {internal.listing.priceMode}
                        <select
                          name="livestockPriceMode"
                          required
                          defaultValue={
                            listingDraft?.fields.livestockPriceMode ||
                            'per_head'
                          }
                        >
                          <option value="per_head">
                            {internal.listing.perHead}
                          </option>
                          <option value="whole_group">
                            {internal.listing.wholeGroup}
                          </option>
                        </select>
                      </label>
                      <label>
                        {internal.listing.breed}{' '}
                        <small>{internal.listing.optional}</small>
                        <input
                          name="livestockBreed"
                          maxLength={120}
                          defaultValue={
                            listingDraft?.fields.livestockBreed || ''
                          }
                          placeholder={internal.listing.breedPlaceholder}
                        />
                      </label>
                    </div>
                  )}
                  <label className="wide">
                    {internal.listing.name}
                    <input
                      name="title"
                      minLength={4}
                      maxLength={160}
                      required
                      defaultValue={listingDraft?.fields.title || ''}
                      placeholder={
                        listingFlow === 'livestock'
                          ? internal.listing.livestockTitlePlaceholder
                          : internal.listing.standardTitlePlaceholder
                      }
                    />
                  </label>
                  <label
                    className="wide photo-upload"
                    aria-busy={listingImageProcessing}
                  >
                    {internal.listing.photo}
                    <input
                      name="image"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      required
                      disabled={listingImageProcessing}
                      onChange={handleListingImage}
                    />
                    <span
                      className={
                        listingImageProcessing
                          ? 'processing'
                          : listingImage
                            ? 'ready'
                            : ''
                      }
                    >
                      {listingImage ? <CheckCircle2 /> : <Plus />}
                      <b>
                        {listingImageProcessing
                          ? internal.listing.photoProcessing
                          : listingImage
                            ? internal.listing.photoReady
                            : internal.listing.choosePhoto}
                      </b>
                      <small>
                        {listingImageSize > 0
                          ? `${Math.ceil(listingImageSize / 1024)} KB · ${internal.listing.photoOptimized}`
                          : internal.listing.photoHint}
                      </small>
                    </span>
                    {listingImage && (
                      <img
                        src={listingImage}
                        alt={internal.listing.previewAlt}
                        decoding="async"
                      />
                    )}
                  </label>
                  <label>
                    {internal.listing.price}
                    {listingFlow === 'livestock' ? ', ₸' : ''}
                    <input
                      name="price"
                      type="number"
                      min="0"
                      required
                      defaultValue={listingDraft?.fields.price || ''}
                      placeholder="18000"
                    />
                  </label>
                  {listingFlow === 'standard' && (
                    <label>
                      {internal.listing.unit}
                      <select
                        name="unit"
                        defaultValue={listingDraft?.fields.unit || '/ услуга'}
                      >
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
                    {internal.listing.region}
                    <select
                      name="region"
                      required
                      defaultValue={
                        listingDraft?.fields.region ||
                        (selectedRegion === 'Весь Казахстан'
                          ? 'Область Жетісу'
                          : selectedRegion)
                      }
                    >
                      {renderRegionOptions()}
                    </select>
                  </label>
                  <label>
                    {internal.listing.city}
                    <input
                      name="location"
                      maxLength={160}
                      required
                      defaultValue={
                        listingDraft?.fields.location ||
                        (selectedRegion === 'Алматы' ||
                        selectedRegion === 'Астана' ||
                        selectedRegion === 'Шымкент'
                          ? selectedRegion
                          : selectedRegion === 'Весь Казахстан' ||
                              selectedRegion === 'Область Жетісу'
                            ? 'Талдыкорган'
                            : '')
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
                          ? internal.listing.locating
                          : listingCoords
                            ? internal.listing.pointAdded
                            : internal.listing.addPoint}
                      </b>
                      <small>
                        {listingCoords
                          ? `${listingCoords.latitude.toFixed(4)}, ${listingCoords.longitude.toFixed(4)} · ${internal.listing.updatePoint}`
                          : internal.listing.pointHint}
                      </small>
                    </span>
                    {listingCoords && <CheckCircle2 />}
                  </button>
                  <label>
                    {internal.listing.phone}
                    <input
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      minLength={10}
                      maxLength={32}
                      pattern="[+0-9() -]{10,32}"
                      required
                      defaultValue={listingDraft?.fields.phone || ''}
                      placeholder="+7 700 123 45 67"
                    />
                  </label>
                  <label>
                    {internal.listing.seller}
                    <select
                      name="sellerType"
                      defaultValue={
                        listingDraft?.fields.sellerType || 'Частное лицо'
                      }
                    >
                      <option value="Частное лицо">
                        {internal.listing.person}
                      </option>
                      <option value="Компания">
                        {internal.listing.company}
                      </option>
                      <option value="Магазин">{internal.listing.store}</option>
                    </select>
                  </label>
                  <label className="check-line form-delivery">
                    <input
                      name="delivery"
                      type="checkbox"
                      defaultChecked={listingDraft?.fields.delivery === 'on'}
                    />{' '}
                    {listingFlow === 'livestock'
                      ? internal.listing.livestockDelivery
                      : internal.listing.delivery}
                  </label>
                  {listingFlow === 'standard' && (
                    <label className="wide">
                      {internal.listing.available}
                      <input
                        name="available"
                        defaultValue={listingDraft?.fields.available || ''}
                        placeholder={internal.listing.availablePlaceholder}
                      />
                    </label>
                  )}
                  <label className="wide">
                    {internal.listing.description}
                    <textarea
                      name="description"
                      rows={3}
                      defaultValue={listingDraft?.fields.description || ''}
                      placeholder={
                        listingFlow === 'livestock'
                          ? internal.listing.livestockDescription
                          : internal.listing.standardDescription
                      }
                    />
                  </label>
                  <button
                    className="submit-button"
                    type="submit"
                    disabled={
                      submitting === 'listing' || listingImageProcessing
                    }
                  >
                    {listingImageProcessing
                      ? internal.listing.photoProcessing
                      : submitting === 'listing'
                        ? internal.listing.publishing
                        : internal.listing.publish}{' '}
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
                    <small>{internal.requestForm.eyebrow}</small>
                    <h2>{internal.requestForm.title}</h2>
                    <p>{internal.requestForm.lead}</p>
                  </div>
                </div>
                <form
                  className="product-form"
                  onSubmit={addRequest}
                  onChange={(event) => saveRequestDraft(event.currentTarget)}
                >
                  <div className="form-draft-note wide">
                    <CheckCircle2 />
                    <span>
                      <b>
                        {!requestSeed && requestDraft
                          ? internal.requestForm.draftRestored
                          : internal.requestForm.draftAuto}
                      </b>
                      <small>{internal.requestForm.draftHint}</small>
                    </span>
                    {!requestSeed && requestDraft && (
                      <button
                        type="button"
                        onClick={(event) =>
                          clearRequestDraft(event.currentTarget.form)
                        }
                      >
                        {internal.listing.clear}
                      </button>
                    )}
                  </div>
                  <label>
                    {internal.requestForm.direction}
                    <select
                      name="kind"
                      defaultValue={
                        requestSeed
                          ? requestSeedKind
                          : requestDraft?.fields.kind || requestSeedKind
                      }
                    >
                      <option value="agro">{internal.requestForm.agro}</option>
                      <option value="rent">{internal.requestForm.rent}</option>
                      <option value="build">
                        {internal.requestForm.build}
                      </option>
                      <option value="recycle">
                        {internal.requestForm.recycle}
                      </option>
                    </select>
                  </label>
                  <label>
                    {internal.requestForm.budget}
                    <input
                      name="budget"
                      defaultValue={
                        requestSeed ? '' : requestDraft?.fields.budget || ''
                      }
                      placeholder={internal.requestForm.budgetPlaceholder}
                    />
                  </label>
                  <label className="wide">
                    {internal.requestForm.need}
                    <input
                      name="title"
                      required
                      defaultValue={
                        requestSeed || requestDraft?.fields.title || ''
                      }
                      placeholder={internal.requestForm.needPlaceholder}
                    />
                  </label>
                  <label>
                    {internal.requestForm.region}
                    <select
                      name="region"
                      required
                      defaultValue={
                        (!requestSeed && requestDraft?.fields.region) ||
                        (selectedRegion === 'Весь Казахстан'
                          ? 'Область Жетісу'
                          : selectedRegion)
                      }
                    >
                      {renderRegionOptions()}
                    </select>
                  </label>
                  <label>
                    {internal.requestForm.where}
                    <input
                      name="place"
                      required
                      defaultValue={
                        (!requestSeed && requestDraft?.fields.place) ||
                        (selectedRegion === 'Весь Казахстан'
                          ? 'Талдыкорган'
                          : selectedRegion)
                      }
                    />
                  </label>
                  <label>
                    {internal.requestForm.when}
                    <input
                      name="when"
                      required
                      defaultValue={
                        requestSeed ? '' : requestDraft?.fields.when || ''
                      }
                      placeholder={internal.requestForm.whenPlaceholder}
                    />
                  </label>
                  <button
                    className="submit-button"
                    type="submit"
                    disabled={submitting === 'request'}
                  >
                    {submitting === 'request'
                      ? internal.requestForm.publishing
                      : internal.requestForm.publish}{' '}
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
                    <small>
                      {internal.requestDetail.miniTender} #{selectedRequest.id}
                    </small>
                    <h2>{selectedRequest.title}</h2>
                    <p>
                      {selectedRequest.place} · {selectedRequest.when}
                    </p>
                  </div>
                </div>
                {!isDemoRequest(selectedRequest.id) && (
                  <button
                    className="request-share-button"
                    type="button"
                    onClick={() => void shareRequest(selectedRequest)}
                  >
                    <Share2 /> {internal.requestDetail.share}
                  </button>
                )}
                {isDemoRequest(selectedRequest.id) && (
                  <div className="demo-flow-note">
                    <CircleAlert />
                    <div>
                      <b>{internal.requestDetail.demoTitle}</b>
                      <span>{internal.requestDetail.demoText}</span>
                      <button
                        type="button"
                        onClick={() =>
                          openRequestForm(
                            selectedRequest.title,
                            selectedRequest.kind,
                          )
                        }
                      >
                        {internal.requestDetail.createReal} <ArrowRight />
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
                        ? internal.requestDetail.openingChat
                        : internal.requestDetail.writeCustomer}
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
                      <b>{internal.requestDetail.responseSent}</b>
                      <span>{internal.requestDetail.responseSentHint}</span>
                    </div>
                  </div>
                ) : selectedRequest.status === 'closed' ? null : !isSignedIn ? (
                  <div className="signin-panel inline-signin-panel">
                    <p>{auth.lead}</p>
                    <a href={signInPath} target="_top">
                      <UserRound /> {auth.action}
                    </a>
                  </div>
                ) : (
                  <form
                    className="product-form response-form"
                    onSubmit={sendResponse}
                  >
                    <h3>{internal.requestDetail.propose}</h3>
                    <label className="wide">
                      {internal.requestDetail.yourPrice}
                      <input
                        name="price"
                        required
                        placeholder={
                          selectedRequest.kind === 'recycle'
                            ? internal.requestDetail.recyclePriceExample
                            : internal.requestDetail.priceExample
                        }
                      />
                    </label>
                    <label className="wide">
                      {internal.requestDetail.comment}
                      <textarea
                        name="message"
                        rows={2}
                        placeholder={internal.requestDetail.commentPlaceholder}
                      />
                    </label>
                    <button
                      className="submit-button"
                      type="submit"
                      disabled={submitting === 'response'}
                    >
                      {submitting === 'response'
                        ? internal.requestDetail.sending
                        : internal.requestDetail.addResponse}{' '}
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
                      <Flag /> {internal.requestDetail.report}
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
                    decoding="async"
                  />
                  <span
                    className={`type ${selectedListing.type === 'Продам' ? 'sale' : selectedListing.type === 'Сдам' ? 'rent' : 'service'}`}
                  >
                    {localizedListingType(selectedListing.type)}
                  </span>
                  {isDemoListing(selectedListing.id) && (
                    <span className="source-chip demo detail-source-chip">
                      {internal.detail.demo}
                    </span>
                  )}
                </div>
                <div className="detail-content">
                  <div className="detail-heading-row">
                    <small className="kicker">
                      {localizedCategory(selectedListing.category)} ·{' '}
                      {selectedListing.region}
                    </small>
                    {!isDemoListing(selectedListing.id) && (
                      <button
                        className="share-listing-button"
                        type="button"
                        onClick={() => void shareListing(selectedListing)}
                      >
                        <Share2 /> {internal.detail.share}
                      </button>
                    )}
                  </div>
                  <h2>{selectedListing.title}</h2>
                  <div className="detail-price">
                    {selectedListing.price} <span>{selectedListing.unit}</span>
                  </div>
                  <p>
                    {selectedListing.description ||
                      internal.detail.noDescription}
                  </p>
                  <div className="detail-facts">
                    {selectedListing.livestockQuantity &&
                      selectedListing.livestockType && (
                        <span>
                          <Beef />
                          {livestockQuantityLabel(
                            selectedListing.livestockQuantity,
                          )}{' '}
                          ·{' '}
                          {localizedLivestockType(
                            selectedListing.livestockType,
                          )}
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
                      {selectedListing.available || internal.detail.negotiable}
                    </span>
                    {selectedListing.deposit && (
                      <span>
                        <CheckCircle2 />
                        {selectedListing.deposit}
                      </span>
                    )}
                    {selectedListing.delivery && (
                      <span>
                        <Construction /> {internal.detail.delivery}
                      </span>
                    )}
                    {selectedListing.latitude !== undefined &&
                      selectedListing.longitude !== undefined && (
                        <span>
                          <Navigation /> {internal.detail.exactPoint}
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
                          ? internal.detail.demoOwner
                          : selectedListing.owner || internal.detail.user}
                      </b>
                      <small>
                        {isDemoListing(selectedListing.id)
                          ? internal.detail.demoOwnerHint
                          : `${selectedListing.sellerType === 'Компания' ? internal.listing.company : selectedListing.sellerType === 'Магазин' ? internal.listing.store : internal.listing.person} · ${selectedListing.verified ? internal.detail.verifiedBusiness : internal.detail.member}`}
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
                          <UserRound /> {internal.detail.profile}
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
                          <small>{internal.detail.rentalVerified}</small>
                          <h3>{internal.detail.reviews}</h3>
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
                          {internal.detail.noReviews}
                        </p>
                      )}
                    </section>
                  )}
                  {selectedListing.mine && (
                    <div className="owner-management">
                      <div>
                        <b>
                          {selectedListing.status === 'paused'
                            ? internal.detail.paused
                            : internal.detail.active}
                        </b>
                        <span>
                          {selectedListing.status === 'paused'
                            ? internal.detail.pausedHint
                            : internal.detail.activeHint}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void updateListingStatus()}
                        disabled={submitting === 'listing-status'}
                      >
                        {submitting === 'listing-status'
                          ? internal.detail.saving
                          : selectedListing.status === 'paused'
                            ? internal.detail.resume
                            : internal.detail.pause}
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
                          <b>{internal.detail.demoListing}</b>
                          <span>{internal.detail.demoListingHint}</span>
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
                                `${internal.detail.needPrefix}: ${selectedListing.title}`,
                                relatedKind,
                              );
                            }}
                          >
                            {internal.detail.createRequest} <ArrowRight />
                          </button>
                        </div>
                      ) : (
                        <>
                          <a
                            className="call-button"
                            href={`tel:${selectedListing.phone}`}
                          >
                            {internal.detail.call}
                          </a>
                          <a
                            className="whatsapp-button"
                            target="_blank"
                            rel="noreferrer"
                            href={`https://wa.me/${(selectedListing.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(`${appLang === 'kk' ? 'Сәлеметсіз бе! Qoldan хабарландыруы бойынша жазып тұрмын' : appLang === 'en' ? 'Hello! I am contacting you about a Qoldan listing' : 'Здравствуйте! Пишу по объявлению Qoldan'}: ${selectedListing.title}`)}`}
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
                            ? internal.detail.openingChat
                            : internal.detail.write}
                        </button>
                      )}
                      {!isDemoListing(selectedListing.id) &&
                        selectedListing.type === 'Сдам' && (
                          <button onClick={openBooking}>
                            {internal.detail.book}
                          </button>
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
                              `${internal.detail.needPrefix}: ${selectedListing.title}`,
                              relatedKind,
                            );
                          }}
                        >
                          <MessageCircle /> {internal.detail.counterRequest}
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
                          <Flag /> {internal.detail.report}
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
                              <img
                                src={listing.image}
                                alt={listing.title}
                                loading="lazy"
                                decoding="async"
                              />
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
                    <small>{internal.booking.eyebrow}</small>
                    <h2>{selectedListing.title}</h2>
                    <p>
                      {selectedListing.price} {selectedListing.unit} ·{' '}
                      {internal.booking.payOwner}
                    </p>
                  </div>
                </div>
                <form className="product-form" onSubmit={submitBooking}>
                  <div className="booking-calendar-card wide">
                    <div className="booking-calendar-head">
                      <div>
                        <small>{internal.booking.availability}</small>
                        <h3>{internal.booking.chooseDates}</h3>
                      </div>
                      <span
                        className={`availability-status ${availabilityState}`}
                      >
                        {availabilityState === 'loading'
                          ? internal.booking.checking
                          : availabilityState === 'error'
                            ? internal.booking.serverCheck
                            : availabilityRanges.length > 0
                              ? `${internal.booking.occupiedCount}: ${availabilityRanges.length}`
                              : internal.booking.free}
                      </span>
                    </div>
                    <Suspense
                      fallback={
                        <div
                          className="booking-calendar-loading"
                          aria-live="polite"
                        >
                          {internal.booking.checking}
                        </div>
                      }
                    >
                      <BookingCalendar
                        language={appLang}
                        selected={bookingRange}
                        onSelect={setBookingRange}
                        today={calendarToday}
                        occupiedRanges={occupiedCalendarRanges}
                      />
                    </Suspense>
                    <div className="booking-calendar-legend">
                      <span>
                        <i className="selected" /> {internal.booking.selected}
                      </span>
                      <span>
                        <i className="booked" /> {internal.booking.occupied}
                      </span>
                      <span>
                        <i className="free" /> {internal.booking.free}
                      </span>
                    </div>
                    <div className="booking-selection">
                      <Clock3 />
                      <div>
                        <b>
                          {bookingRange?.from
                            ? `${formatLocalizedBookingDate(toIsoDate(bookingRange.from))}${bookingRange.to ? ` — ${formatLocalizedBookingDate(toIsoDate(bookingRange.to))}` : ` · ${internal.booking.oneDay}`}`
                            : internal.booking.notSelected}
                        </b>
                        <span>
                          {bookingRange?.from
                            ? internal.booking.ownerGetsRequest
                            : internal.booking.oneDayHint}
                        </span>
                      </div>
                    </div>
                    {availabilityRanges.length > 0 && (
                      <div className="busy-periods">
                        <b>{internal.booking.nearestOccupied}</b>
                        <div>
                          {availabilityRanges.slice(0, 3).map((range) => (
                            <span key={`${range.dateFrom}-${range.dateTo}`}>
                              {formatLocalizedBookingDate(range.dateFrom)} —{' '}
                              {formatLocalizedBookingDate(range.dateTo)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <label className="wide">
                    {internal.booking.phone}
                    <input
                      name="customerPhone"
                      type="tel"
                      inputMode="tel"
                      minLength={10}
                      maxLength={32}
                      pattern="[+0-9() -]{10,32}"
                      required
                      placeholder="+7 700 123 45 67"
                    />
                  </label>
                  <label className="wide check-line">
                    <input name="delivery" type="checkbox" />{' '}
                    {internal.booking.delivery} {selectedListing.location}
                  </label>
                  <label className="wide">
                    {internal.booking.comment}
                    <textarea
                      name="comment"
                      rows={2}
                      placeholder={internal.booking.commentPlaceholder}
                    />
                  </label>
                  <button
                    className="submit-button"
                    type="submit"
                    disabled={submitting === 'booking'}
                  >
                    {submitting === 'booking'
                      ? internal.booking.sending
                      : internal.booking.send}{' '}
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
                    <small>{internal.regions.eyebrow}</small>
                    <h2>{internal.regions.title}</h2>
                    <p>{internal.regions.lead}</p>
                  </div>
                </div>
                <div className="region-modal-grid">
                  <button
                    className={
                      selectedRegion === 'Весь Казахстан'
                        ? 'active wide'
                        : 'wide'
                    }
                    onClick={() => {
                      setUserCoords(null);
                      setSelectedRegion('Весь Казахстан');
                      setModal(null);
                      setMaxDistance(100);
                      notify('Показываем всю страну');
                    }}
                  >
                    <span>🇰🇿</span>
                    {tr.allKazakhstan}
                    {selectedRegion === 'Весь Казахстан' && <CheckCircle2 />}
                  </button>
                  <h3 className="region-modal-heading">
                    {internal.regions.cities}
                  </h3>
                  {kzRepublicanCities.map((r) => (
                    <button
                      key={r}
                      className={selectedRegion === r ? 'active' : ''}
                      onClick={() => {
                        setUserCoords(null);
                        setSelectedRegion(r);
                        setModal(null);
                        setMaxDistance(100);
                        notify(`Выбран регион: ${r}`);
                      }}
                    >
                      <span>
                        {String(kzRegions.indexOf(r)).padStart(2, '0')}
                      </span>
                      {r}
                      {selectedRegion === r && <CheckCircle2 />}
                    </button>
                  ))}
                  <h3 className="region-modal-heading">
                    {internal.regions.oblasts}
                  </h3>
                  {kzOblasts.map((r) => (
                    <button
                      key={r}
                      className={selectedRegion === r ? 'active' : ''}
                      onClick={() => {
                        setUserCoords(null);
                        setSelectedRegion(r);
                        setModal(null);
                        setMaxDistance(100);
                        notify(`Выбран регион: ${r}`);
                      }}
                    >
                      <span>
                        {String(kzRegions.indexOf(r)).padStart(2, '0')}
                      </span>
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
                      Партия будет опубликована как настоящая заявка и появится
                      в выбранном регионе.
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
                      {renderRegionOptions()}
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
                    <h2>{visibleViewerName}</h2>
                    <p>
                      <MapPin />{' '}
                      {serverConnected
                        ? internal.profile.synced
                        : storageReady
                          ? internal.profile.demo
                          : internal.profile.connecting}
                    </p>
                  </div>
                </div>
                <div className="profile-stats">
                  <div>
                    <b>{allListings.filter((x) => x.mine).length}</b>
                    <span>{internal.profile.listings}</span>
                  </div>
                  <div>
                    <b>{allRequests.filter((x) => x.mine).length}</b>
                    <span>{internal.profile.requests}</span>
                  </div>
                  <div>
                    <b>
                      {bookings.filter((x) => x.status === 'pending').length}
                    </b>
                    <span>{internal.profile.bookingsPending}</span>
                  </div>
                </div>
                <section className="service-reputation-card">
                  <span>
                    <Star fill="currentColor" />
                  </span>
                  <div>
                    <small>{internal.profile.reputation}</small>
                    <b>
                      {serviceTrust.serviceReviewCount > 0
                        ? `${serviceTrust.serviceRating} ${internal.profile.outOfFive}`
                        : internal.profile.noRatings}
                    </b>
                    <p>
                      {serviceTrust.serviceReviewCount > 0
                        ? `${serviceTrust.serviceReviewCount} ${internal.profile.verifiedReviews}`
                        : internal.profile.firstRating}
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
                      <ShieldCheck /> {internal.profile.moderation}
                      <b>{moderationPendingCount}</b>
                    </button>
                  )}
                  <button onClick={() => setModal('saved-searches')}>
                    <Bookmark /> {internal.profile.savedSearches}
                    <b>{savedSearchNewCount || savedSearches.length}</b>
                  </button>
                  <button onClick={() => setModal('recent')}>
                    <History /> {internal.profile.recent}
                    <b>{recentItems.length}</b>
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
                    <Heart /> {internal.profile.favorites}{' '}
                    <b>{favorites.length}</b>
                  </button>
                  <button onClick={() => void openMessages()}>
                    <MessageCircle /> {internal.profile.messages}
                    <b>{messagingUnreadCount}</b>
                  </button>
                  <button onClick={() => setModal('bookings')}>
                    <Clock3 /> {internal.profile.bookings}{' '}
                    <b>{bookings.length}</b>
                  </button>
                  <button onClick={() => setModal('appeals')}>
                    <Scale /> {internal.profile.appeals} <b>{appeals.length}</b>
                  </button>
                  <button onClick={() => void openSupport('safety')}>
                    <LifeBuoy /> {internal.profile.help}
                    <b>{openSupportCount}</b>
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
                    <PackageOpen /> {internal.profile.myListings} <ArrowRight />
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
                    <MessageCircle /> {internal.profile.myRequests}{' '}
                    <ArrowRight />
                  </button>
                  <a
                    className="profile-signout"
                    href={signOutPath}
                    target="_top"
                  >
                    <UserRound /> {auth.signOut}
                  </a>
                </div>
              </>
            )}
            {modal === 'recent' && (
              <>
                <div className="recent-title-row">
                  <div className="modal-title">
                    <span>
                      <History />
                    </span>
                    <div>
                      <small>БЫСТРО ВЕРНУТЬСЯ</small>
                      <h2>Недавно просмотренные</h2>
                      <p>
                        Последние реальные объявления и заявки на этом
                        устройстве. Демо-примеры сюда не попадают.
                      </p>
                    </div>
                  </div>
                  {recentItems.length > 0 && (
                    <button type="button" onClick={clearRecentViews}>
                      Очистить
                    </button>
                  )}
                </div>
                {recentItems.length > 0 ? (
                  <div className="recent-list">
                    {recentItems.map((item) => {
                      const id =
                        item.kind === 'listing'
                          ? String(item.listing.id)
                          : String(item.request.id);
                      const title =
                        item.kind === 'listing'
                          ? item.listing.title
                          : item.request.title;
                      const place =
                        item.kind === 'listing'
                          ? item.listing.location
                          : item.request.place;
                      const value =
                        item.kind === 'listing'
                          ? `${item.listing.price}${item.listing.unit ? ` ${item.listing.unit}` : ''}`
                          : item.request.budget;
                      return (
                        <button
                          type="button"
                          key={`${item.kind}-${id}`}
                          onClick={() => openRecentItem(item)}
                        >
                          {item.kind === 'listing' ? (
                            <img
                              src={item.listing.image}
                              alt={item.listing.title}
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <span className="recent-request-icon">
                              <MessageCircle />
                            </span>
                          )}
                          <span className="recent-copy">
                            <small>
                              {item.kind === 'listing'
                                ? 'ОБЪЯВЛЕНИЕ'
                                : 'ЗАЯВКА'}{' '}
                              · {formatActivityDate(item.viewedAt)}
                            </small>
                            <b>{title}</b>
                            <em>
                              {place} · {value}
                            </em>
                          </span>
                          <ArrowRight />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="notification-empty recent-empty">
                    <History />
                    <b>История пока пустая</b>
                    <span>
                      Откройте настоящее объявление или заявку — и Qoldan
                      сохранит быстрый переход на этом устройстве.
                    </span>
                  </div>
                )}
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
                      {renderRegionOptions()}
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
                      inputMode="tel"
                      minLength={10}
                      maxLength={32}
                      pattern="[+0-9() -]{10,32}"
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
                    <small>{internal.messages.eyebrow}</small>
                    <h2>{internal.messages.title}</h2>
                    <p>{internal.messages.lead}</p>
                  </div>
                </div>
                <div className="chat-safety">
                  <ShieldCheck />
                  <span>{internal.messages.safety}</span>
                </div>
                <div
                  className={`message-layout ${activeConversation ? 'has-active' : ''}`}
                >
                  <aside
                    className="conversation-list"
                    aria-label={internal.messages.dialogs}
                  >
                    <div className="conversation-list-head">
                      <b>{internal.messages.inbox}</b>
                      <span>{conversations.length}</span>
                    </div>
                    {messagingLoading && conversations.length === 0 ? (
                      <div className="conversation-empty compact">
                        <MessageCircle />
                        <span>{internal.messages.loading}</span>
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
                              {conversation.lastMessage ||
                                internal.messages.start}
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
                        <b>{internal.messages.empty}</b>
                        <span>{internal.messages.emptyHint}</span>
                      </div>
                    )}
                  </aside>
                  <section
                    className="chat-panel"
                    aria-label={internal.messages.correspondence}
                  >
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
                            aria-label={internal.messages.back}
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
                                ? internal.messages.listing
                                : internal.messages.request}{' '}
                              · {activeConversation.contextTitle}
                            </span>
                          </div>
                        </div>
                        <div className="message-bubbles" aria-live="polite">
                          {messagingLoading && chatMessages.length === 0 ? (
                            <div className="chat-placeholder">
                              {internal.messages.loadingChat}
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
                                    ? ` · ${internal.messages.read}`
                                    : ''}
                                </small>
                              </div>
                            ))
                          ) : (
                            <div className="chat-placeholder welcome">
                              <MessageCircle />
                              <b>{internal.messages.startTalk}</b>
                              <span>{internal.messages.startTalkHint}</span>
                            </div>
                          )}
                        </div>
                        <form className="chat-form" onSubmit={sendChatMessage}>
                          <textarea
                            name="body"
                            rows={2}
                            maxLength={1200}
                            required
                            placeholder={internal.messages.placeholder}
                            aria-label={internal.messages.message}
                          />
                          <button
                            type="submit"
                            disabled={submitting === 'chat-message'}
                            aria-label={internal.messages.send}
                          >
                            <Send />
                          </button>
                        </form>
                      </>
                    ) : (
                      <div className="chat-placeholder select-chat">
                        <MessageCircle />
                        <b>{internal.messages.choose}</b>
                        <span>{internal.messages.chooseHint}</span>
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
                    <LifeBuoy />
                  </span>
                  <div>
                    <small>{internal.support.eyebrow}</small>
                    <h2>{internal.support.title}</h2>
                    <p>{internal.support.lead}</p>
                  </div>
                </div>
                <div className="support-tabs" aria-label="Разделы помощи">
                  {(
                    [
                      ['safety', internal.support.safety],
                      ['rules', internal.support.rules],
                      ['privacy', internal.support.privacy],
                      ['feedback', internal.support.feedback],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={supportTopic === value ? 'active' : ''}
                      onClick={() => setSupportTopic(value)}
                    >
                      {label}
                      {value === 'feedback' && openSupportCount > 0 && (
                        <b>{openSupportCount}</b>
                      )}
                    </button>
                  ))}
                  {canModerate && (
                    <button
                      type="button"
                      className={supportTopic === 'queue' ? 'active' : ''}
                      onClick={() => setSupportTopic('queue')}
                    >
                      {internal.support.queue} <b>{pendingSupportCount}</b>
                    </button>
                  )}
                </div>
                {supportTopic === 'safety' && (
                  <section className="support-guide">
                    <div className="support-lead">
                      <ShieldCheck />
                      <div>
                        <small>{internal.support.mainRule}</small>
                        <b>{internal.support.mainRuleTitle}</b>
                        <p>{internal.support.mainRuleText}</p>
                      </div>
                    </div>
                    <div className="support-checklist">
                      {internal.support.safetyItems.map(
                        ([title, copy], index) => (
                          <article key={title}>
                            <span>{index + 1}</span>
                            <div>
                              <b>{title}</b>
                              <p>{copy}</p>
                            </div>
                          </article>
                        ),
                      )}
                    </div>
                    <button
                      type="button"
                      className="support-action"
                      onClick={() => setSupportTopic('feedback')}
                    >
                      {internal.support.reportProblem} <ArrowRight />
                    </button>
                  </section>
                )}
                {supportTopic === 'rules' && (
                  <section className="support-guide">
                    <div className="info-grid support-rule-grid">
                      <article>
                        <CheckCircle2 />
                        <b>{internal.support.honest}</b>
                        <p>{internal.support.honestText}</p>
                      </article>
                      <article>
                        <ScrollText />
                        <b>{internal.support.oneOffer}</b>
                        <p>{internal.support.oneOfferText}</p>
                      </article>
                      <article>
                        <ShieldAlert />
                        <b>{internal.support.prohibited}</b>
                        <p>{internal.support.prohibitedText}</p>
                      </article>
                    </div>
                    <div className="support-note">
                      <CircleAlert />
                      <p>{internal.support.moderationNote}</p>
                    </div>
                  </section>
                )}
                {supportTopic === 'privacy' && (
                  <section className="support-guide">
                    <div className="support-lead privacy">
                      <LockKeyhole />
                      <div>
                        <small>{internal.support.dataEyebrow}</small>
                        <b>{internal.support.dataTitle}</b>
                        <p>{internal.support.dataLead}</p>
                      </div>
                    </div>
                    <div className="privacy-list">
                      {internal.support.privacyItems.map(([title, copy]) => (
                        <article key={title}>
                          <b>{title}</b>
                          <p>{copy}</p>
                        </article>
                      ))}
                    </div>
                    <div className="support-note">
                      <LockKeyhole />
                      <p>{internal.support.privacyNote}</p>
                    </div>
                  </section>
                )}
                {supportTopic === 'feedback' && (
                  <section className="support-feedback">
                    <form
                      className="support-form"
                      onSubmit={submitSupportTicket}
                    >
                      <div className="support-form-head">
                        <LifeBuoy />
                        <div>
                          <b>{internal.support.writeTeam}</b>
                          <p>{internal.support.writeTeamHint}</p>
                        </div>
                      </div>
                      <label>
                        {internal.support.topic}
                        <select name="category" defaultValue="bug">
                          <option value="bug">{internal.support.bug}</option>
                          <option value="idea">{internal.support.idea}</option>
                          <option value="safety">
                            {internal.support.safetyQuestion}
                          </option>
                          <option value="other">
                            {internal.support.other}
                          </option>
                        </select>
                      </label>
                      <label>
                        {internal.support.messageLabel}
                        <textarea
                          name="message"
                          rows={5}
                          minLength={10}
                          maxLength={1500}
                          required
                          placeholder={internal.support.messagePlaceholder}
                        />
                      </label>
                      <small>{internal.support.formHint}</small>
                      <button
                        className="submit-button"
                        type="submit"
                        disabled={submitting === 'support-ticket'}
                      >
                        {submitting === 'support-ticket'
                          ? internal.support.sending
                          : internal.support.send}{' '}
                        <Send />
                      </button>
                    </form>
                    <div className="support-history">
                      <div className="support-history-title">
                        <div>
                          <small>{internal.support.myTickets}</small>
                          <b>{internal.support.history}</b>
                        </div>
                        {supportLoading && (
                          <span>{internal.support.updating}</span>
                        )}
                      </div>
                      {supportTickets.length > 0 ? (
                        <div className="support-ticket-list">
                          {supportTickets.map((ticket) => (
                            <article key={ticket.id}>
                              <div className="support-ticket-head">
                                <div>
                                  <small>
                                    № {ticket.id.slice(0, 8).toUpperCase()} ·{' '}
                                    {formatActivityDate(ticket.createdAt)}
                                  </small>
                                  <b>
                                    {localizedSupportCategory(ticket.category)}
                                  </b>
                                </div>
                                <span
                                  className={`support-status ${ticket.status}`}
                                >
                                  {localizedSupportStatus(ticket.status)}
                                </span>
                              </div>
                              <p>{ticket.message}</p>
                              {ticket.reviewNote && (
                                <div className="support-reply">
                                  <CheckCircle2 />
                                  <span>
                                    <small>{internal.support.teamReply}</small>
                                    {ticket.reviewNote}
                                  </span>
                                </div>
                              )}
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="notification-empty support-empty">
                          <MessageCircle />
                          <b>{internal.support.noTickets}</b>
                          <span>{internal.support.noTicketsText}</span>
                        </div>
                      )}
                    </div>
                  </section>
                )}
                {supportTopic === 'queue' && canModerate && (
                  <section className="support-queue">
                    <div className="support-queue-summary">
                      <div>
                        <small>ОЧЕРЕДЬ ПИЛОТА</small>
                        <b>{pendingSupportCount} требуют внимания</b>
                      </div>
                      {supportLoading && <span>Обновляем…</span>}
                    </div>
                    {supportQueue.length > 0 ? (
                      <div className="moderation-list support-ticket-list">
                        {supportQueue.map((ticket) => (
                          <article key={ticket.id}>
                            <div className="support-ticket-head">
                              <div>
                                <small>
                                  № {ticket.id.slice(0, 8).toUpperCase()} ·{' '}
                                  {ticket.ownerName}
                                </small>
                                <b>
                                  {localizedSupportCategory(ticket.category)}
                                </b>
                              </div>
                              <span
                                className={`support-status ${ticket.status}`}
                              >
                                {localizedSupportStatus(ticket.status)}
                              </span>
                            </div>
                            <p>{ticket.message}</p>
                            <div className="support-ticket-meta">
                              <span>
                                {formatActivityDate(ticket.createdAt)}
                              </span>
                              {ticket.pageContext && (
                                <span>Страница: {ticket.pageContext}</span>
                              )}
                            </div>
                            <label>
                              Ответ или итог
                              <textarea
                                rows={2}
                                maxLength={800}
                                value={supportNotes[ticket.id] ?? ''}
                                disabled={ticket.status === 'closed'}
                                placeholder="Что проверили и какой результат"
                                onChange={(event) =>
                                  setSupportNotes((current) => ({
                                    ...current,
                                    [ticket.id]: event.target.value,
                                  }))
                                }
                              />
                            </label>
                            {ticket.status !== 'closed' && (
                              <div className="support-queue-actions">
                                {ticket.status === 'new' && (
                                  <button
                                    type="button"
                                    disabled={
                                      submitting === `support-${ticket.id}`
                                    }
                                    onClick={() =>
                                      void updateSupportTicket(
                                        ticket.id,
                                        'reviewing',
                                      )
                                    }
                                  >
                                    Взять в работу
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="complete"
                                  disabled={
                                    submitting === `support-${ticket.id}`
                                  }
                                  onClick={() =>
                                    void updateSupportTicket(
                                      ticket.id,
                                      'closed',
                                    )
                                  }
                                >
                                  Закрыть с ответом
                                </button>
                              </div>
                            )}
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="notification-empty support-empty">
                        <CheckCircle2 />
                        <b>Очередь пуста</b>
                        <span>
                          Новые обращения появятся здесь автоматически.
                        </span>
                      </div>
                    )}
                  </section>
                )}
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
