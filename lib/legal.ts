// Operator details are deliberately placeholders: fill them in before launch.
// scripts/test-legal.mjs lists every placeholder that is still unfilled.
export const LEGAL_UPDATED = '14 ноября 2026';

export const OPERATOR = {
  name: 'Zhumash Miras (физическое лицо)',
  id: 'ИИН сообщается по обоснованному запросу пользователя или уполномоченного органа',
  address: 'Республика Казахстан; для корреспонденции используйте e-mail',
  email: 'zhumash.miras05@gmail.com',
} as const;

export const LEGAL_DOCS = [
  { href: '/legal/privacy', title: 'Политика защиты персональных данных' },
  { href: '/legal/terms', title: 'Публичная оферта (пользовательское соглашение)' },
  { href: '/legal/auctions', title: 'Правила онлайн-торгов' },
  { href: '/legal/returns', title: 'Условия возврата, отмены и споров' },
  { href: '/legal/cookies', title: 'Политика cookie и локального хранилища' },
] as const;

export const COOKIE_NOTICE_KEY = 'qoldan-cookie-notice-v1';

export const isPlaceholder = (value: string) => value.startsWith('[');

// Kazakh and English versions of the legal pages are translations for convenience; the Russian text prevails.
// Kazakh texts need a native speaker's and a lawyer's review.
export type LegalLang = 'ru' | 'kk' | 'en';

export const LEGAL_COPY = {
  ru: {
    updated: LEGAL_UPDATED,
    edition: 'Редакция от',
    allDocs: 'Все документы',
    otherDocs: 'Другие документы',
    docsLabel: 'Правовые документы',
    languageLabel: 'Язык документа',
    note: '',
    operator: { name: OPERATOR.name, id: OPERATOR.id, address: OPERATOR.address, email: OPERATOR.email },
    titles: Object.fromEntries(LEGAL_DOCS.map((doc) => [doc.href, doc.title])) as Record<string, string>,
    footer: {
      lead: 'Qoldan не принимает оплату и не берёт комиссию: участники договариваются напрямую.',
      label: 'Правовая информация',
      links: { '/legal/privacy': 'Политика данных', '/legal/terms': 'Оферта', '/legal/returns': 'Возврат и споры', '/legal/cookies': 'Cookie' } as Record<string, string>,
    },
  },
  kk: {
    updated: '2026 жылғы 14 қараша',
    edition: 'Редакция күні:',
    allDocs: 'Барлық құжаттар',
    otherDocs: 'Басқа құжаттар',
    docsLabel: 'Құқықтық құжаттар',
    languageLabel: 'Құжат тілі',
    note: 'Бұл — ыңғайлылық үшін жасалған аударма. Мәтіндер арасында айырмашылық болса, орыс тіліндегі редакция қолданылады.',
    operator: {
      name: 'Zhumash Miras (жеке тұлға)',
      id: 'ЖСН пайдаланушының немесе уәкілетті органның негізделген сұрауы бойынша хабарланады',
      address: 'Қазақстан Республикасы; хат-хабар үшін e-mail пайдаланыңыз',
      email: OPERATOR.email,
    },
    titles: {
      '/legal/privacy': 'Дербес деректерді қорғау саясаты',
      '/legal/terms': 'Жария оферта (пайдаланушы келісімі)',
      '/legal/auctions': 'Онлайн-сауда ережелері',
      '/legal/returns': 'Қайтару, бас тарту және дау шарттары',
      '/legal/cookies': 'Cookie және жергілікті сақтау саясаты',
    } as Record<string, string>,
    footer: {
      lead: 'Qoldan төлем қабылдамайды және комиссия алмайды: қатысушылар тікелей келіседі.',
      label: 'Құқықтық ақпарат',
      links: { '/legal/privacy': 'Деректер саясаты', '/legal/terms': 'Оферта', '/legal/returns': 'Қайтару және даулар', '/legal/cookies': 'Cookie' } as Record<string, string>,
    },
  },
  en: {
    updated: '14 November 2026',
    edition: 'Version of',
    allDocs: 'All documents',
    otherDocs: 'Other documents',
    docsLabel: 'Legal documents',
    languageLabel: 'Document language',
    note: 'This is a translation for convenience. If the versions differ, the Russian version prevails.',
    operator: {
      name: 'Zhumash Miras (individual)',
      id: 'the IIN is provided on a justified request of a user or an authorised body',
      address: 'Republic of Kazakhstan; please use e-mail for correspondence',
      email: OPERATOR.email,
    },
    titles: {
      '/legal/privacy': 'Personal Data Protection Policy',
      '/legal/terms': 'Public Offer (User Agreement)',
      '/legal/auctions': 'Online Auction Rules',
      '/legal/returns': 'Returns, Cancellations and Disputes',
      '/legal/cookies': 'Cookie and Local Storage Policy',
    } as Record<string, string>,
    footer: {
      lead: 'Qoldan does not take payments or charge fees: participants agree directly.',
      label: 'Legal information',
      links: { '/legal/privacy': 'Data policy', '/legal/terms': 'Offer', '/legal/returns': 'Returns and disputes', '/legal/cookies': 'Cookies' } as Record<string, string>,
    },
  },
} satisfies Record<LegalLang, unknown>;
