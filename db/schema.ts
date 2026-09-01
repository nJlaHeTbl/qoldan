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

export const businessVerifications = sqliteTable(
  'business_verifications',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    profileType: text('profile_type').notNull(),
    organizationName: text('organization_name').notNull(),
    bin: text('bin').notNull(),
    phone: text('phone').notNull(),
    region: text('region').notNull(),
    referenceUrl: text('reference_url'),
    note: text('note'),
    status: text('status').notNull().default('pending'),
    reviewNote: text('review_note'),
    reviewedBy: text('reviewed_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    reviewedAt: integer('reviewed_at'),
  },
  (table) => [
    uniqueIndex('business_verifications_owner_id_unique').on(table.ownerId),
    index('business_verifications_status_created_at_idx').on(
      table.status,
      table.createdAt,
    ),
  ],
);

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
    livestockType: text('livestock_type'),
    livestockQuantity: integer('livestock_quantity'),
    livestockPriceMode: text('livestock_price_mode'),
    livestockBreed: text('livestock_breed'),
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

export const requestSelections = sqliteTable(
  'request_selections',
  {
    requestId: text('request_id')
      .primaryKey()
      .references(() => requests.id, { onDelete: 'cascade' }),
    responseId: text('response_id')
      .notNull()
      .references(() => responses.id, { onDelete: 'cascade' }),
    selectedBy: text('selected_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('selected'),
    selectedAt: integer('selected_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    completedAt: integer('completed_at'),
  },
  (table) => [
    uniqueIndex('request_selections_response_id_unique').on(table.responseId),
  ],
);

export const requestReviews = sqliteTable(
  'request_reviews',
  {
    id: text('id').primaryKey(),
    requestId: text('request_id')
      .notNull()
      .references(() => requests.id, { onDelete: 'cascade' }),
    responseId: text('response_id')
      .notNull()
      .references(() => responses.id, { onDelete: 'cascade' }),
    reviewerId: text('reviewer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    providerId: text('provider_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(),
    comment: text('comment'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('request_reviews_request_id_unique').on(table.requestId),
    index('request_reviews_provider_id_created_at_idx').on(
      table.providerId,
      table.createdAt,
    ),
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

export const savedSearches = sqliteTable(
  'saved_searches',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    searchQuery: text('search_query').notNull().default(''),
    region: text('region').notNull().default('Весь Казахстан'),
    category: text('category').notNull().default('Все категории'),
    offerType: text('offer_type').notNull().default('Все'),
    deliveryOnly: integer('delivery_only', { mode: 'boolean' })
      .notNull()
      .default(false),
    companyOnly: integer('company_only', { mode: 'boolean' })
      .notNull()
      .default(false),
    livestockType: text('livestock_type').notNull().default('Все виды'),
    livestockPriceMode: text('livestock_price_mode').notNull().default('all'),
    livestockQuantityGroup: text('livestock_quantity_group')
      .notNull()
      .default('all'),
    createdAt: integer('created_at').notNull(),
    lastViewedAt: integer('last_viewed_at').notNull(),
  },
  (table) => [
    uniqueIndex('saved_searches_owner_filters_unique').on(
      table.ownerId,
      table.searchQuery,
      table.region,
      table.category,
      table.offerType,
      table.deliveryOnly,
      table.companyOnly,
      table.livestockType,
      table.livestockPriceMode,
      table.livestockQuantityGroup,
    ),
    index('saved_searches_owner_created_at_idx').on(
      table.ownerId,
      table.createdAt,
    ),
  ],
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
    completedAt: integer('completed_at'),
  },
  (table) => [
    index('bookings_listing_id_created_at_idx').on(
      table.listingId,
      table.createdAt,
    ),
    index('bookings_owner_id_idx').on(table.ownerId),
    index('bookings_listing_status_dates_idx').on(
      table.listingId,
      table.status,
      table.dateFrom,
      table.dateTo,
    ),
  ],
);

export const rentalHandoffs = sqliteTable('rental_handoffs', {
  bookingId: text('booking_id')
    .primaryKey()
    .references(() => bookings.id, { onDelete: 'cascade' }),
  depositAmount: integer('deposit_amount').notNull().default(0),
  depositReceived: integer('deposit_received', { mode: 'boolean' })
    .notNull()
    .default(false),
  conditionOut: text('condition_out').notNull(),
  equipmentList: text('equipment_list'),
  handedOverAt: integer('handed_over_at').notNull(),
  conditionIn: text('condition_in'),
  depositResult: text('deposit_result'),
  returnNote: text('return_note'),
  returnedAt: integer('returned_at'),
  updatedAt: integer('updated_at').notNull(),
});

export const reviews = sqliteTable(
  'reviews',
  {
    id: text('id').primaryKey(),
    bookingId: text('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    listingId: text('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    reviewerId: text('reviewer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    revieweeId: text('reviewee_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(),
    comment: text('comment'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('reviews_booking_id_unique').on(table.bookingId),
    index('reviews_listing_id_created_at_idx').on(
      table.listingId,
      table.createdAt,
    ),
    index('reviews_reviewee_id_created_at_idx').on(
      table.revieweeId,
      table.createdAt,
    ),
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

export const conversations = sqliteTable(
  'conversations',
  {
    id: text('id').primaryKey(),
    contextType: text('context_type').notNull(),
    contextId: text('context_id').notNull(),
    contextTitle: text('context_title').notNull(),
    contextOwnerId: text('context_owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    participantId: text('participant_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('conversations_context_participant_unique').on(
      table.contextType,
      table.contextId,
      table.participantId,
    ),
    index('conversations_owner_updated_at_idx').on(
      table.contextOwnerId,
      table.updatedAt,
    ),
    index('conversations_participant_updated_at_idx').on(
      table.participantId,
      table.updatedAt,
    ),
  ],
);

export const messages = sqliteTable(
  'messages',
  {
    id: text('id').primaryKey(),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    senderId: text('sender_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    createdAt: integer('created_at').notNull(),
    readAt: integer('read_at'),
  },
  (table) => [
    index('messages_conversation_created_at_idx').on(
      table.conversationId,
      table.createdAt,
    ),
  ],
);

export const supportTickets = sqliteTable(
  'support_tickets',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    category: text('category').notNull(),
    message: text('message').notNull(),
    pageContext: text('page_context'),
    status: text('status').notNull().default('new'),
    reviewNote: text('review_note'),
    reviewedBy: text('reviewed_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    reviewedAt: integer('reviewed_at'),
  },
  (table) => [
    index('support_tickets_owner_created_at_idx').on(
      table.ownerId,
      table.createdAt,
    ),
    index('support_tickets_status_created_at_idx').on(
      table.status,
      table.createdAt,
    ),
  ],
);
