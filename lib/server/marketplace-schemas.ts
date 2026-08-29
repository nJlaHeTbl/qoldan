import { z } from 'zod';

const shortText = z.string().trim().min(1).max(160);
const offerTypes = ['Продам', 'Сдам', 'Окажу услугу'] as const;
const sellerTypes = ['Частное лицо', 'Компания', 'Магазин'] as const;
const requestKinds = ['agro', 'build', 'rent', 'recycle'] as const;
const listingStatuses = ['active', 'paused'] as const;
const requestStatuses = ['open', 'closed'] as const;
const bookingStatuses = ['accepted', 'declined'] as const;

export const listingInput = z.object({
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

export const favoriteInput = z.object({
  listingId: z.union([z.string(), z.number()]).transform(String),
  active: z.boolean(),
});

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
