import { z } from 'zod';

const shortText = z.string().trim().min(1).max(160);
const offerTypes = ['Продам', 'Сдам', 'Окажу услугу'] as const;
const sellerTypes = ['Частное лицо', 'Компания', 'Магазин'] as const;
const livestockTypes = [
  'Лошади',
  'Крупный рогатый скот',
  'Овцы',
  'Козы',
  'Верблюды',
  'Другое',
] as const;
const livestockPriceModes = ['per_head', 'whole_group'] as const;
const requestKinds = ['agro', 'build', 'rent', 'recycle'] as const;
const listingStatuses = ['active', 'paused'] as const;
const requestStatuses = ['open', 'closed'] as const;
const bookingStatuses = ['accepted', 'declined'] as const;
const depositResults = [
  'not_applicable',
  'returned',
  'partially_withheld',
  'withheld',
] as const;
const businessProfileTypes = [
  'farm',
  'company',
  'store',
  'service_company',
] as const;
const reportReasons = [
  'fraud',
  'spam',
  'wrong_info',
  'unsafe',
  'other',
] as const;

export const listingInput = z
  .object({
    title: shortText.min(4),
    price: z.string().trim().min(1).max(40),
    unit: z.string().trim().max(30).optional().default(''),
    location: shortText,
    region: shortText,
    category: shortText,
    type: z.enum(offerTypes),
    imageUrl: z.string().trim().min(1).max(500),
    phone: z.string().trim().min(7).max(32),
    available: z.string().trim().max(160).optional().default(''),
    description: z.string().trim().max(1200).optional().default(''),
    sellerType: z.enum(sellerTypes),
    delivery: z.boolean().optional().default(false),
    livestockType: z.enum(livestockTypes).optional(),
    livestockQuantity: z.number().int().min(1).max(10_000).optional(),
    livestockPriceMode: z.enum(livestockPriceModes).optional(),
    livestockBreed: z.string().trim().max(120).optional().default(''),
    latitude: z.number().min(40).max(56).optional(),
    longitude: z.number().min(45).max(88).optional(),
  })
  .refine(
    (data) =>
      (data.latitude === undefined && data.longitude === undefined) ||
      (data.latitude !== undefined && data.longitude !== undefined),
    { message: 'Передайте обе координаты', path: ['latitude'] },
  )
  .superRefine((data, context) => {
    if (data.category !== 'Скот и животные') return;
    if (data.type !== 'Продам') {
      context.addIssue({
        code: 'custom',
        path: ['type'],
        message: 'Объявление о скоте публикуется как продажа',
      });
    }
    if (!data.livestockType) {
      context.addIssue({
        code: 'custom',
        path: ['livestockType'],
        message: 'Выберите вид скота',
      });
    }
    if (!data.livestockQuantity) {
      context.addIssue({
        code: 'custom',
        path: ['livestockQuantity'],
        message: 'Укажите количество голов',
      });
    }
    if (!data.livestockPriceMode) {
      context.addIssue({
        code: 'custom',
        path: ['livestockPriceMode'],
        message: 'Укажите, за что указана цена',
      });
    }
  });

export const requestInput = z.object({
  title: shortText.min(4),
  place: shortText,
  when: shortText,
  budget: z.string().trim().min(1).max(80),
  kind: z.enum(requestKinds),
  region: shortText,
});

export const listingStatusInput = z.object({
  listingId: z.union([z.string(), z.number()]).transform(String),
  status: z.enum(listingStatuses),
});

export const requestStatusInput = z.object({
  requestId: z.union([z.string(), z.number()]).transform(String),
  status: z.enum(requestStatuses),
});

export const responseInput = z.object({
  requestId: z.union([z.string(), z.number()]).transform(String),
  price: z.string().trim().min(1).max(80),
  message: z.string().trim().max(800).optional().default(''),
});

export const requestSelectionInput = z
  .object({
    requestId: z.union([z.string(), z.number()]).transform(String),
    responseId: z.union([z.string(), z.number()]).transform(String).optional(),
    action: z.enum(['select', 'cancel', 'complete']),
  })
  .superRefine((value, context) => {
    if (value.action === 'select' && !value.responseId) {
      context.addIssue({
        code: 'custom',
        path: ['responseId'],
        message: 'Выберите отклик исполнителя',
      });
    }
  });

export const favoriteInput = z.object({
  listingId: z.union([z.string(), z.number()]).transform(String),
  active: z.boolean(),
});

const savedSearchCreate = z
  .object({
    action: z.literal('create'),
    name: z.string().trim().min(1).max(120),
    query: z.string().trim().max(160).optional().default(''),
    region: shortText,
    category: shortText,
    offerType: z.enum(['Все', ...offerTypes]),
    deliveryOnly: z.boolean().optional().default(false),
    companyOnly: z.boolean().optional().default(false),
    livestockType: z
      .enum(['Все виды', ...livestockTypes])
      .optional()
      .default('Все виды'),
    livestockPriceMode: z
      .enum(['all', ...livestockPriceModes])
      .optional()
      .default('all'),
    livestockQuantityGroup: z
      .enum(['all', 'single', 'small_group', 'large_group'])
      .optional()
      .default('all'),
  })
  .refine(
    (value) =>
      Boolean(value.query) ||
      value.region !== 'Весь Казахстан' ||
      value.category !== 'Все категории' ||
      value.offerType !== 'Все' ||
      value.deliveryOnly ||
      value.companyOnly ||
      value.livestockType !== 'Все виды' ||
      value.livestockPriceMode !== 'all' ||
      value.livestockQuantityGroup !== 'all',
    { message: 'Сначала задайте хотя бы одно условие поиска' },
  );

export const savedSearchInput = z.discriminatedUnion('action', [
  savedSearchCreate,
  z.object({
    action: z.enum(['delete', 'mark_seen']),
    savedSearchId: z.string().trim().min(1).max(100),
  }),
]);

export const bookingInput = z
  .object({
    listingId: z.union([z.string(), z.number()]).transform(String),
    dateFrom: z.iso.date(),
    dateTo: z.iso.date(),
    customerPhone: z.string().trim().min(7).max(32),
    delivery: z.boolean().optional().default(false),
    comment: z.string().trim().max(800).optional().default(''),
  })
  .refine((data) => data.dateTo >= data.dateFrom, {
    message: 'Дата возврата не может быть раньше даты начала',
    path: ['dateTo'],
  });

export const bookingStatusInput = z.object({
  bookingId: z.union([z.string(), z.number()]).transform(String),
  status: z.enum(bookingStatuses),
});

export const rentalHandoverInput = z
  .discriminatedUnion('action', [
    z.object({
      action: z.literal('handover'),
      bookingId: z.string().trim().min(1).max(100),
      depositAmount: z.number().int().min(0).max(100_000_000),
      depositReceived: z.boolean(),
      conditionOut: z.string().trim().min(5).max(1200),
      equipmentList: z.string().trim().max(800).optional().default(''),
    }),
    z.object({
      action: z.literal('return'),
      bookingId: z.string().trim().min(1).max(100),
      conditionIn: z.string().trim().min(5).max(1200),
      depositResult: z.enum(depositResults),
      returnNote: z.string().trim().max(1200).optional().default(''),
    }),
  ])
  .superRefine((value, context) => {
    if (
      value.action === 'handover' &&
      value.depositAmount > 0 &&
      !value.depositReceived
    ) {
      context.addIssue({
        code: 'custom',
        path: ['depositReceived'],
        message: 'Подтвердите получение указанного залога',
      });
    }
    if (
      value.action === 'return' &&
      (value.depositResult === 'partially_withheld' ||
        value.depositResult === 'withheld') &&
      value.returnNote.length < 10
    ) {
      context.addIssue({
        code: 'custom',
        path: ['returnNote'],
        message: 'Объясните причину удержания залога',
      });
    }
  });

export const businessVerificationInput = z.object({
  profileType: z.enum(businessProfileTypes),
  organizationName: z
    .string()
    .trim()
    .min(3, 'Укажите полное название организации')
    .max(180),
  bin: z
    .string()
    .trim()
    .regex(/^\d{12}$/, 'БИН должен состоять из 12 цифр'),
  phone: z.string().trim().min(7, 'Укажите рабочий телефон').max(32),
  region: shortText,
  referenceUrl: z
    .string()
    .trim()
    .max(300)
    .optional()
    .default('')
    .refine(
      (value) => value === '' || /^https:\/\//i.test(value),
      'Ссылка должна начинаться с https://',
    ),
  note: z.string().trim().max(800).optional().default(''),
});

export const moderationVerificationInput = z.object({
  verificationId: z.string().trim().min(1).max(100),
  status: z.enum(['verified', 'rejected']),
  reviewNote: z
    .string()
    .trim()
    .min(5, 'Добавьте короткое объяснение решения')
    .max(800),
});

export const reviewInput = z.object({
  bookingId: z.string().trim().min(1).max(100),
  rating: z
    .number()
    .int()
    .min(1, 'Выберите оценку от 1 до 5')
    .max(5, 'Выберите оценку от 1 до 5'),
  comment: z.string().trim().max(800).optional().default(''),
});

export const requestReviewInput = z.object({
  requestId: z.union([z.string(), z.number()]).transform(String),
  rating: z
    .number()
    .int()
    .min(1, 'Выберите оценку от 1 до 5')
    .max(5, 'Выберите оценку от 1 до 5'),
  comment: z.string().trim().max(800).optional().default(''),
});

export const reportInput = z.object({
  targetType: z.enum(['listing', 'request']),
  targetId: z.union([z.string(), z.number()]).transform(String),
  reason: z.enum(reportReasons),
  description: z.string().trim().max(800).optional().default(''),
});

export const moderationReportInput = z.object({
  reportId: z.string().trim().min(1).max(100),
  status: z.enum(['reviewing', 'closed']),
  reviewNote: z.string().trim().max(800).optional().default(''),
});

export const moderationActionInput = z.object({
  reportId: z.string().trim().min(1).max(100).optional(),
  targetType: z.enum(['listing', 'request']),
  targetId: z.string().trim().min(1).max(100),
  action: z.enum(['warn', 'restrict', 'restore']),
  note: z.string().trim().min(5).max(800),
});

export const appealInput = z.object({
  moderationActionId: z.string().trim().min(1).max(100),
  message: z.string().trim().min(10).max(1200),
});

export const moderationAppealInput = z
  .object({
    appealId: z.string().trim().min(1).max(100),
    status: z.enum(['reviewing', 'approved', 'rejected']),
    resolutionNote: z.string().trim().max(1200).optional().default(''),
  })
  .superRefine((value, context) => {
    if (
      value.status !== 'reviewing' &&
      value.resolutionNote.trim().length < 5
    ) {
      context.addIssue({
        code: 'custom',
        path: ['resolutionNote'],
        message: 'Добавьте пояснение решения',
      });
    }
  });

export const conversationInput = z.object({
  targetType: z.enum(['listing', 'request']),
  targetId: z
    .union([z.string(), z.number()])
    .transform(String)
    .pipe(z.string().min(1).max(100)),
});

export const messageInput = z.object({
  body: z.string().trim().min(1, 'Напишите сообщение').max(1200),
});

export const supportTicketInput = z.object({
  category: z.enum(['bug', 'idea', 'safety', 'other']),
  message: z
    .string()
    .trim()
    .min(10, 'Опишите вопрос хотя бы в 10 символах')
    .max(1500),
  pageContext: z.string().trim().max(240).optional().default(''),
});

export const supportTicketStatusInput = z
  .object({
    ticketId: z.string().trim().min(1).max(100),
    status: z.enum(['reviewing', 'closed']),
    reviewNote: z.string().trim().max(800).optional().default(''),
  })
  .superRefine((value, context) => {
    if (value.status === 'closed' && value.reviewNote.length < 5) {
      context.addIssue({
        code: 'custom',
        path: ['reviewNote'],
        message: 'Добавьте короткий итог обращения',
      });
    }
  });

export async function parseJson<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.output<T>> {
  return schema.parse(await request.json());
}

export function invalidInput(error: unknown) {
  if (error instanceof z.ZodError) {
    return Response.json(
      { error: error.issues[0]?.message || 'Проверьте заполненные поля' },
      { status: 400 },
    );
  }
  throw error;
}
