import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const listings = sqliteTable(
  'listings',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    price: text('price').notNull(),
    unit: text('unit'),
    location: text('location').notNull(),
    region: text('region').notNull(),
    category: text('category').notNull(),
    offerType: text('offer_type').notNull(),
    imageUrl: text('image_url').notNull(),
    phone: text('phone').notNull(),
    available: text('available'),
    description: text('description'),
    sellerType: text('seller_type').notNull(),
    delivery: integer('delivery', { mode: 'boolean' }).notNull().default(false),
    status: text('status').notNull().default('active'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    index('listings_status_created_at_idx').on(table.status, table.createdAt),
    index('listings_region_status_idx').on(table.region, table.status),
    index('listings_owner_id_idx').on(table.ownerId),
    index('listings_category_offer_type_idx').on(
      table.category,
      table.offerType,
    ),
  ],
);

export const listingLocations = sqliteTable('listing_locations', {
  listingId: text('listing_id')
    .primaryKey()
    .references(() => listings.id, { onDelete: 'cascade' }),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const requests = sqliteTable(
  'requests',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    place: text('place').notNull(),
    whenText: text('when_text').notNull(),
    budget: text('budget').notNull(),
    kind: text('kind').notNull(),
    region: text('region').notNull(),
    status: text('status').notNull().default('open'),
    responseCount: integer('response_count').notNull().default(0),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    index('requests_status_created_at_idx').on(table.status, table.createdAt),
    index('requests_region_kind_idx').on(table.region, table.kind),
    index('requests_owner_id_idx').on(table.ownerId),
  ],
);

export const responses = sqliteTable(
  'responses',
  {
    id: text('id').primaryKey(),
    requestId: text('request_id')
      .notNull()
      .references(() => requests.id, { onDelete: 'cascade' }),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    price: text('price').notNull(),
    message: text('message'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('responses_request_id_created_at_idx').on(
      table.requestId,
      table.createdAt,
    ),
    index('responses_owner_id_idx').on(table.ownerId),
  ],
);

export const favorites = sqliteTable(
  'favorites',
  {
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    listingId: text('listing_id').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.ownerId, table.listingId] })],
);

export const bookings = sqliteTable(
  'bookings',
  {
    id: text('id').primaryKey(),
    listingId: text('listing_id').notNull(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    dateFrom: text('date_from').notNull(),
    dateTo: text('date_to').notNull(),
    customerPhone: text('customer_phone').notNull(),
    delivery: integer('delivery', { mode: 'boolean' }).notNull().default(false),
    comment: text('comment'),
    status: text('status').notNull().default('pending'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('bookings_listing_id_created_at_idx').on(
      table.listingId,
      table.createdAt,
    ),
    index('bookings_owner_id_idx').on(table.ownerId),
  ],
);

export const uploads = sqliteTable(
  'uploads',
  {
    key: text('key').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    contentType: text('content_type').notNull(),
    size: integer('size').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('uploads_owner_id_idx').on(table.ownerId)],
);

export const reports = sqliteTable(
  'reports',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    reason: text('reason').notNull(),
    description: text('description'),
    status: text('status').notNull().default('new'),
    reviewNote: text('review_note'),
    reviewedBy: text('reviewed_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    reviewedAt: integer('reviewed_at'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('reports_owner_id_created_at_idx').on(table.ownerId, table.createdAt),
    index('reports_status_created_at_idx').on(table.status, table.createdAt),
    index('reports_target_idx').on(table.targetType, table.targetId),
  ],
);

export const moderationActions = sqliteTable(
  'moderation_actions',
  {
    id: text('id').primaryKey(),
    reportId: text('report_id').references(() => reports.id, {
      onDelete: 'set null',
    }),
    moderatorId: text('moderator_id')
      .notNull()
      .references(() => users.id),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    targetOwnerId: text('target_owner_id')
      .notNull()
      .references(() => users.id),
    targetTitle: text('target_title').notNull(),
    action: text('action').notNull(),
    note: text('note').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('moderation_actions_created_at_idx').on(table.createdAt),
    index('moderation_actions_target_owner_created_at_idx').on(
      table.targetOwnerId,
      table.createdAt,
    ),
  ],
);

export const appeals = sqliteTable(
  'appeals',
  {
    id: text('id').primaryKey(),
    moderationActionId: text('moderation_action_id')
      .notNull()
      .references(() => moderationActions.id, { onDelete: 'cascade' }),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    message: text('message').notNull(),
    status: text('status').notNull().default('new'),
    resolutionNote: text('resolution_note'),
    reviewedBy: text('reviewed_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: integer('created_at').notNull(),
    reviewedAt: integer('reviewed_at'),
  },
  (table) => [
    uniqueIndex('appeals_moderation_action_id_unique').on(
      table.moderationActionId,
    ),
    index('appeals_owner_id_created_at_idx').on(table.ownerId, table.createdAt),
    index('appeals_status_created_at_idx').on(table.status, table.createdAt),
  ],
);
