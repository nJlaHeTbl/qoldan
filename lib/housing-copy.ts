// Texts of the housing section (/housing) and the housing photo gallery in RU/KK/EN.
// Kazakh texts need a native speaker's review. Stored values (categories, seller types) stay Russian;
// only their labels are translated.
import type { Lang } from '@/lib/ui-copy';

type Copy = {
  saveFailed: string;
  loadFailed: string;
  unsavedSwitch: string;
  unsavedClose: string;
  needPhoto: string;
  uploading: (index: number, total: number) => string;
  uploadFailed: string;
  pickAgain: string;
  saving: string;
  savedPaused: string;
  savedActive: string;
  published: string;
  fieldsKept: string;
  allDirections: string;
  place: string;
  signInPlace: string;
  sectionLabel: string;
  title: string;
  lead: string;
  edit: string;
  priceHelp: string;
  editingNow: string;
  editingTail: string;
  kind: string;
  sellerType: string;
  name: string;
  namePlaceholder: string;
  pricePerDay: string;
  maxGuests: string;
  rooms: string;
  phone: string;
  showPhone: string;
  available: string;
  availablePlaceholder: string;
  description: string;
  descriptionPlaceholder: string;
  addPhotos: (count: number) => string;
  tooManyPhotos: string;
  badPhoto: string;
  photo: (index: number) => string;
  cover: string;
  makeCover: string;
  removePhoto: (index: number) => string;
  remove: string;
  savingButton: string;
  saveChanges: string;
  publish: string;
  closeForm: string;
  region: string;
  allKazakhstan: string;
  allHousing: string;
  search: string;
  searchPlaceholder: string;
  maxPrice: string;
  anyPrice: string;
  minGuests: string;
  anyGuests: string;
  show: string;
  allListings: string;
  mine: string;
  favorites: string;
  find: string;
  refresh: string;
  reset: string;
  hideMap: string;
  onMap: string;
  note: string;
  retry: string;
  loading: string;
  mapNote: string;
  emptyTitle: string;
  emptyText: string;
  placeFirst: string;
  signInFirst: string;
  perDay: string;
  roomsGuests: (rooms: number, guests: number) => string;
  datesAsk: string;
  phoneHidden: string;
  unfavorite: string;
  favorite: string;
  signInFavorite: string;
  details: string;
  statusActive: string;
  statusPaused: string;
  statusRestricted: string;
  editButton: string;
  closeEditFirst: string;
  unpublish: string;
  republish: string;
  pages: string;
  back: string;
  next: string;
  page: (page: number) => string;
  footerHome: string;
  fixPlace: string;
  galleryLabel: string;
  galleryPhoto: (title: string, index: number) => string;
  showPhoto: (index: number) => string;
  numberLocale: string;
  categories: Record<string, string>;
  sellers: Record<string, string>;
};

const RU: Copy = {
  saveFailed: 'Не удалось сохранить. Попробуйте ещё раз.',
  loadFailed: 'Не удалось загрузить жильё',
  unsavedSwitch: 'В форме есть несохранённые изменения. Открыть другую форму без сохранения?',
  unsavedClose: 'Закрыть форму без сохранения изменений?',
  needPhoto: 'Добавьте хотя бы одну настоящую фотографию жилья.',
  uploading: (index, total) => `Загружаем фотографию ${index} из ${total}…`,
  uploadFailed: 'Не удалось загрузить фотографию',
  pickAgain: 'Выберите фотографию заново',
  saving: 'Сохраняем объявление…',
  savedPaused: 'Изменения сохранены. Объявление осталось на паузе.',
  savedActive: 'Изменения сохранены и видны посетителям.',
  published: 'Объявление опубликовано. Оно доступно посетителям в разделе «Жильё».',
  fieldsKept: 'Ваши поля сохранены на этой странице.',
  allDirections: 'Все направления',
  place: 'Разместить жильё',
  signInPlace: 'Войти и разместить',
  sectionLabel: 'Отдельный раздел Qoldan',
  title: 'Жильё на сутки',
  lead: 'Гостиницы и квартиры в городах, посёлках и сёлах Казахстана.',
  edit: 'Редактировать жильё',
  priceHelp: 'Указывайте цену за весь выбранный номер или квартиру за сутки. Наличие, залог и время заезда гость согласует с вами напрямую.',
  editingNow: 'Редактируется:',
  editingTail: 'Статус публикации не изменится.',
  kind: 'Тип жилья',
  sellerType: 'Кто сдаёт',
  name: 'Название',
  namePlaceholder: 'Например, двухкомнатная квартира рядом с вокзалом',
  pricePerDay: 'Цена за сутки, ₸',
  maxGuests: 'Максимум гостей',
  rooms: 'Количество комнат',
  phone: 'Телефон для гостей',
  showPhone: 'Показывать мой номер вошедшим пользователям (по кнопке «Показать телефон»)',
  available: 'Свободные даты и время заезда',
  availablePlaceholder: 'Например, с 20 сентября, заезд с 14:00. Уточняйте по телефону.',
  description: 'Описание и условия',
  descriptionPlaceholder: 'Спальные места, удобства, адрес или ориентир, залог, правила проживания. Для гостиницы описывайте конкретный тип номера.',
  addPhotos: (count) => `Добавить фотографии — ${count} из 5. JPG, PNG или WebP; большие фото уменьшаются автоматически`,
  tooManyPhotos: 'Можно добавить до пяти фотографий. Удалите лишние или выберите меньше файлов.',
  badPhoto: 'Каждая фотография должна быть JPG, PNG или WebP до 40 МБ — перед загрузкой она уменьшится автоматически.',
  photo: (index) => `Фотография ${index}`,
  cover: 'Главная',
  makeCover: 'Сделать главной',
  removePhoto: (index) => `Удалить фотографию ${index}`,
  remove: 'Удалить',
  savingButton: 'Сохраняем…',
  saveChanges: 'Сохранить изменения',
  publish: 'Опубликовать',
  closeForm: 'Закрыть форму',
  region: 'Регион',
  allKazakhstan: 'Весь Казахстан',
  allHousing: 'Всё жильё',
  search: 'Поиск',
  searchPlaceholder: 'Название, ориентир, удобства',
  maxPrice: 'Цена до, ₸ / сутки',
  anyPrice: 'Любая',
  minGuests: 'Гостей не меньше',
  anyGuests: 'Любое число',
  show: 'Показать',
  allListings: 'Все объявления',
  mine: 'Мои объявления',
  favorites: 'Избранное',
  find: 'Найти жильё',
  refresh: 'Обновить список',
  reset: 'Сбросить',
  hideMap: 'Скрыть карту',
  onMap: 'На карте',
  note: 'Объявления размещают пользователи. Qoldan не подтверждает свободные даты и не принимает оплату за проживание. Не переводите предоплату без проверки объекта и владельца.',
  retry: 'Повторить',
  loading: 'Загружаем жильё…',
  mapNote: 'На карте — точки объявлений с текущей страницы. Если точка не указана, объект остаётся в списке.',
  emptyTitle: 'Пока нет подходящих объявлений',
  emptyText: 'Попробуйте другой регион или снимите фильтры. Этот раздел новый — демонстрационные квартиры и гостиницы сюда не добавлены.',
  placeFirst: 'Разместить первое жильё',
  signInFirst: 'Войти и разместить жильё',
  perDay: '/ сутки',
  roomsGuests: (rooms, guests) => `${rooms} комн. · до ${guests} гостей`,
  datesAsk: 'Свободные даты уточняйте у владельца',
  phoneHidden: 'Владелец не показывает номер',
  unfavorite: 'Убрать из избранного',
  favorite: 'В избранное',
  signInFavorite: 'Войти, чтобы добавить в избранное',
  details: 'Подробнее',
  statusActive: 'Опубликовано',
  statusPaused: 'На паузе',
  statusRestricted: 'Ограничено модерацией',
  editButton: 'Редактировать',
  closeEditFirst: 'Сначала сохраните или закройте форму редактирования',
  unpublish: 'Снять с публикации',
  republish: 'Опубликовать снова',
  pages: 'Страницы объявлений',
  back: 'Назад',
  next: 'Далее',
  page: (page) => `Страница ${page}`,
  footerHome: 'Qoldan · Все направления',
  fixPlace: 'Исправить населённый пункт',
  galleryLabel: 'Фотографии жилья',
  galleryPhoto: (title, index) => `${title} — фотография ${index}`,
  showPhoto: (index) => `Показать фотографию ${index}`,
  numberLocale: 'ru-RU',
  categories: {},
  sellers: {},
};

const KK: Copy = {
  saveFailed: 'Сақтау мүмкін болмады. Қайталап көріңіз.',
  loadFailed: 'Баспананы жүктеу мүмкін болмады',
  unsavedSwitch: 'Формада сақталмаған өзгерістер бар. Сақтамай басқа форманы ашу керек пе?',
  unsavedClose: 'Өзгерістерді сақтамай форманы жабу керек пе?',
  needPhoto: 'Баспананың кемінде бір нақты фотосуретін қосыңыз.',
  uploading: (index, total) => `${total} фотосуреттің ${index}-і жүктелуде…`,
  uploadFailed: 'Фотосуретті жүктеу мүмкін болмады',
  pickAgain: 'Фотосуретті қайта таңдаңыз',
  saving: 'Хабарландыру сақталуда…',
  savedPaused: 'Өзгерістер сақталды. Хабарландыру кідірісте қалды.',
  savedActive: 'Өзгерістер сақталды және келушілерге көрінеді.',
  published: 'Хабарландыру жарияланды. Ол «Баспана» бөлімінде келушілерге қолжетімді.',
  fieldsKept: 'Толтырған өрістеріңіз осы бетте сақталды.',
  allDirections: 'Барлық бағыттар',
  place: 'Баспана орналастыру',
  signInPlace: 'Кіру және орналастыру',
  sectionLabel: 'Qoldan-ның жеке бөлімі',
  title: 'Тәуліктік баспана',
  lead: 'Қазақстанның қалалары, кенттері мен ауылдарындағы қонақ үйлер мен пәтерлер.',
  edit: 'Баспананы өңдеу',
  priceHelp: 'Таңдалған бөлменің немесе пәтердің бір тәулікке толық бағасын көрсетіңіз. Бос орын, кепілақы және кіру уақытын қонақ сізбен тікелей келіседі.',
  editingNow: 'Өңделуде:',
  editingTail: 'Жариялану мәртебесі өзгермейді.',
  kind: 'Баспана түрі',
  sellerType: 'Кім жалға береді',
  name: 'Атауы',
  namePlaceholder: 'Мысалы, вокзал жанындағы екі бөлмелі пәтер',
  pricePerDay: 'Тәулігіне бағасы, ₸',
  maxGuests: 'Қонақтардың ең көп саны',
  rooms: 'Бөлмелер саны',
  phone: 'Қонақтарға арналған телефон',
  showPhone: 'Нөмірімді кірген пайдаланушыларға көрсету («Телефонды көрсету» батырмасы арқылы)',
  available: 'Бос күндер және кіру уақыты',
  availablePlaceholder: 'Мысалы, 20 қыркүйектен бастап, кіру 14:00-ден. Телефон арқылы нақтылаңыз.',
  description: 'Сипаттамасы және шарттары',
  descriptionPlaceholder: 'Төсек орындар, жайлылықтар, мекенжай немесе бағдар, кепілақы, тұру ережелері. Қонақ үй үшін нақты бөлме түрін сипаттаңыз.',
  addPhotos: (count) => `Фотосурет қосу — 5-тен ${count}. JPG, PNG немесе WebP; үлкен суреттер автоматты түрде кішірейеді`,
  tooManyPhotos: 'Бес фотосуретке дейін қосуға болады. Артығын өшіріңіз немесе азырақ файл таңдаңыз.',
  badPhoto: 'Әр фотосурет 40 МБ-қа дейінгі JPG, PNG немесе WebP болуы керек — жүктер алдында ол автоматты түрде кішірейеді.',
  photo: (index) => `Фотосурет ${index}`,
  cover: 'Басты',
  makeCover: 'Басты ету',
  removePhoto: (index) => `${index}-фотосуретті өшіру`,
  remove: 'Өшіру',
  savingButton: 'Сақталуда…',
  saveChanges: 'Өзгерістерді сақтау',
  publish: 'Жариялау',
  closeForm: 'Форманы жабу',
  region: 'Өңір',
  allKazakhstan: 'Бүкіл Қазақстан',
  allHousing: 'Барлық баспана',
  search: 'Іздеу',
  searchPlaceholder: 'Атауы, бағдар, жайлылықтар',
  maxPrice: 'Бағасы дейін, ₸ / тәулік',
  anyPrice: 'Кез келген',
  minGuests: 'Қонақтар кемінде',
  anyGuests: 'Кез келген сан',
  show: 'Көрсету',
  allListings: 'Барлық хабарландыру',
  mine: 'Менің хабарландыруларым',
  favorites: 'Таңдаулылар',
  find: 'Баспана табу',
  refresh: 'Тізімді жаңарту',
  reset: 'Тазарту',
  hideMap: 'Картаны жасыру',
  onMap: 'Картада',
  note: 'Хабарландыруларды пайдаланушылар орналастырады. Qoldan бос күндерді растамайды және тұру үшін төлем қабылдамайды. Нысан мен иесін тексермей алдын ала төлем аудармаңыз.',
  retry: 'Қайталау',
  loading: 'Баспана жүктелуде…',
  mapNote: 'Картада — ағымдағы беттегі хабарландырулардың нүктелері. Нүкте көрсетілмесе, нысан тізімде қалады.',
  emptyTitle: 'Әзірге сәйкес хабарландыру жоқ',
  emptyText: 'Басқа өңірді таңдаңыз немесе сүзгілерді алып тастаңыз. Бұл бөлім жаңа — мұнда көрсетілім пәтерлері мен қонақ үйлері қосылмаған.',
  placeFirst: 'Алғашқы баспананы орналастыру',
  signInFirst: 'Кіру және баспана орналастыру',
  perDay: '/ тәулік',
  roomsGuests: (rooms, guests) => `${rooms} бөлме · ${guests} қонаққа дейін`,
  datesAsk: 'Бос күндерді иесінен нақтылаңыз',
  phoneHidden: 'Иесі нөмірін көрсетпейді',
  unfavorite: 'Таңдаулылардан алып тастау',
  favorite: 'Таңдаулыларға',
  signInFavorite: 'Таңдаулыларға қосу үшін кіріңіз',
  details: 'Толығырақ',
  statusActive: 'Жарияланды',
  statusPaused: 'Кідірісте',
  statusRestricted: 'Модерациямен шектелген',
  editButton: 'Өңдеу',
  closeEditFirst: 'Алдымен өңдеу формасын сақтаңыз немесе жабыңыз',
  unpublish: 'Жариялаудан алу',
  republish: 'Қайта жариялау',
  pages: 'Хабарландыру беттері',
  back: 'Артқа',
  next: 'Әрі қарай',
  page: (page) => `${page}-бет`,
  footerHome: 'Qoldan · Барлық бағыттар',
  fixPlace: 'Елді мекенді түзету',
  galleryLabel: 'Баспана фотосуреттері',
  galleryPhoto: (title, index) => `${title} — ${index}-фотосурет`,
  showPhoto: (index) => `${index}-фотосуретті көрсету`,
  numberLocale: 'ru-RU',
  categories: { 'Посуточные квартиры': 'Тәуліктік пәтерлер', Гостиницы: 'Қонақ үйлер' },
  sellers: { 'Частное лицо': 'Жеке тұлға', Компания: 'Компания', Магазин: 'Дүкен' },
};

const EN: Copy = {
  saveFailed: 'Could not save. Please try again.',
  loadFailed: 'Could not load the stays',
  unsavedSwitch: 'The form has unsaved changes. Open another form without saving?',
  unsavedClose: 'Close the form without saving the changes?',
  needPhoto: 'Add at least one real photo of the place.',
  uploading: (index, total) => `Uploading photo ${index} of ${total}…`,
  uploadFailed: 'Could not upload the photo',
  pickAgain: 'Choose the photo again',
  saving: 'Saving the listing…',
  savedPaused: 'Changes saved. The listing is still paused.',
  savedActive: 'Changes saved and visible to visitors.',
  published: 'Listing published. Visitors can find it in the Stays section.',
  fieldsKept: 'Your entries are kept on this page.',
  allDirections: 'All sections',
  place: 'List a stay',
  signInPlace: 'Sign in to list',
  sectionLabel: 'A separate Qoldan section',
  title: 'Stays by the day',
  lead: 'Hotels and apartments in cities, towns and villages of Kazakhstan.',
  edit: 'Edit the stay',
  priceHelp: 'Give the price for the whole room or apartment per day. Availability, deposit and check-in time are agreed between you and the guest directly.',
  editingNow: 'Editing:',
  editingTail: 'The publication status will not change.',
  kind: 'Type of stay',
  sellerType: 'Who is renting',
  name: 'Title',
  namePlaceholder: 'For example, two-room apartment near the station',
  pricePerDay: 'Price per day, ₸',
  maxGuests: 'Maximum guests',
  rooms: 'Number of rooms',
  phone: 'Phone for guests',
  showPhone: 'Show my number to signed-in users (via the “Show phone” button)',
  available: 'Free dates and check-in time',
  availablePlaceholder: 'For example, from 20 September, check-in from 14:00. Ask by phone.',
  description: 'Description and terms',
  descriptionPlaceholder: 'Beds, amenities, address or landmark, deposit, house rules. For a hotel, describe one specific room type.',
  addPhotos: (count) => `Add photos — ${count} of 5. JPG, PNG or WebP; large photos are reduced automatically`,
  tooManyPhotos: 'You can add up to five photos. Remove some or choose fewer files.',
  badPhoto: 'Each photo must be JPG, PNG or WebP up to 40 MB — it is reduced automatically before upload.',
  photo: (index) => `Photo ${index}`,
  cover: 'Cover',
  makeCover: 'Make cover',
  removePhoto: (index) => `Remove photo ${index}`,
  remove: 'Remove',
  savingButton: 'Saving…',
  saveChanges: 'Save changes',
  publish: 'Publish',
  closeForm: 'Close form',
  region: 'Region',
  allKazakhstan: 'All Kazakhstan',
  allHousing: 'All stays',
  search: 'Search',
  searchPlaceholder: 'Title, landmark, amenities',
  maxPrice: 'Price up to, ₸ / day',
  anyPrice: 'Any',
  minGuests: 'At least guests',
  anyGuests: 'Any number',
  show: 'Show',
  allListings: 'All listings',
  mine: 'My listings',
  favorites: 'Favourites',
  find: 'Find a stay',
  refresh: 'Refresh list',
  reset: 'Reset',
  hideMap: 'Hide map',
  onMap: 'On the map',
  note: 'Listings are posted by users. Qoldan does not confirm free dates and does not take payment for stays. Do not send a prepayment before checking the place and the owner.',
  retry: 'Retry',
  loading: 'Loading stays…',
  mapNote: 'The map shows the points of listings on this page. A place without a point stays in the list.',
  emptyTitle: 'No matching listings yet',
  emptyText: 'Try another region or clear the filters. This section is new — no demo apartments or hotels were added.',
  placeFirst: 'List the first stay',
  signInFirst: 'Sign in to list a stay',
  perDay: '/ day',
  roomsGuests: (rooms, guests) => `${rooms} ${rooms === 1 ? 'room' : 'rooms'} · up to ${guests} guests`,
  datesAsk: 'Ask the owner about free dates',
  phoneHidden: 'The owner does not show the number',
  unfavorite: 'Remove from favourites',
  favorite: 'Add to favourites',
  signInFavorite: 'Sign in to add to favourites',
  details: 'Details',
  statusActive: 'Published',
  statusPaused: 'Paused',
  statusRestricted: 'Restricted by moderation',
  editButton: 'Edit',
  closeEditFirst: 'Save or close the edit form first',
  unpublish: 'Unpublish',
  republish: 'Publish again',
  pages: 'Listing pages',
  back: 'Back',
  next: 'Next',
  page: (page) => `Page ${page}`,
  footerHome: 'Qoldan · All sections',
  fixPlace: 'Fix a settlement',
  galleryLabel: 'Photos of the place',
  galleryPhoto: (title, index) => `${title} — photo ${index}`,
  showPhoto: (index) => `Show photo ${index}`,
  numberLocale: 'en-US',
  categories: { 'Посуточные квартиры': 'Daily apartments', Гостиницы: 'Hotels' },
  sellers: { 'Частное лицо': 'Private person', Компания: 'Company', Магазин: 'Shop' },
};

const COPIES: Record<Lang, Copy> = { ru: RU, kk: KK, en: EN };

export function housingCopy(lang: Lang | undefined) {
  const copy = COPIES[lang ?? 'ru'];
  // Own keys only: a stored value such as "constructor" is shown as written.
  const label = (table: Record<string, string>, value: string) =>
    Object.hasOwn(table, value) && typeof table[value] === 'string' ? table[value] : value;
  return {
    ...copy,
    categoryLabel: (value: string) => label(copy.categories, value),
    sellerLabel: (value: string) => label(copy.sellers, value),
  };
}
