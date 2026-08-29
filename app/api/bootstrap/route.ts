import {
  canModerate,
  ensureMarketplaceSchema,
  getMarketplaceDb,
  getViewer,
  serverError,
  unauthorized,
  upsertViewer,
} from '@/lib/server/marketplace-db';

export const dynamic = 'force-dynamic';

type ResponseActivityRow = {
  id: string;
  price: string;
  message: string | null;
  created_at: number;
  actor_name: string;
  target_title: string;
};

type BookingActivityRow = {
  id: string;
  date_from: string;
  date_to: string;
  created_at: number;
  actor_name: string;
  target_title: string;
};

type BookingDecisionActivityRow = {
  id: string;
  status: 'accepted' | 'declined';
  created_at: number;
  actor_name: string;
  target_title: string;
};

type ModerationActivityRow = {
  id: string;
  action: 'warn' | 'restrict' | 'restore';
  target_title: string;
  note: string;
  created_at: number;
  appeal_id: string | null;
  appeal_status: 'new' | 'reviewing' | 'approved' | 'rejected' | null;
};

type AppealRow = {
  id: string;
  moderation_action_id: string;
  target_title: string;
  action: 'warn' | 'restrict';
  message: string;
  status: 'new' | 'reviewing' | 'approved' | 'rejected';
  resolution_note: string | null;
  created_at: number;
  reviewed_at: number | null;
};

type MessageActivityRow = {
  id: string;
  body: string;
  created_at: number;
  actor_name: string;
  context_title: string;
};

export async function GET(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  try {
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const db = getMarketplaceDb();
    const viewerCanModerate = canModerate(viewer);
    const [
      listingResult,
      requestResult,
      favoriteResult,
      responseResult,
      bookingResult,
      responseActivityResult,
      bookingActivityResult,
      bookingDecisionActivityResult,
      moderationActivityResult,
      appealResult,
      messageActivityResult,
      unreadMessageResult,
    ] = await Promise.all([
      db
        .prepare(
          `SELECT listings.id, listings.title, listings.price, listings.unit,
                    listings.location, listings.region, listings.category,
                    listings.offer_type, listings.image_url, listings.phone,
                    listings.available, listings.description,
                    listings.seller_type, listings.delivery, listings.owner_id,
                    listings.status,
                    listing_locations.latitude, listing_locations.longitude,
                    users.display_name AS owner_name
             FROM listings
             JOIN users ON users.id = listings.owner_id
             LEFT JOIN listing_locations ON listing_locations.listing_id = listings.id
             WHERE listings.status = 'active' OR listings.owner_id = ?
             ORDER BY listings.created_at DESC
             LIMIT 250`,
        )
        .bind(viewer.id)
        .all<Record<string, unknown>>(),
      db
        .prepare(
          `SELECT requests.id, requests.title, requests.place,
                    requests.when_text, requests.budget, requests.kind,
                    requests.region, requests.response_count,
                    requests.owner_id, requests.status,
                    users.display_name AS owner_name
             FROM requests
             JOIN users ON users.id = requests.owner_id
             WHERE requests.status = 'open' OR requests.owner_id = ?
             ORDER BY requests.created_at DESC
             LIMIT 250`,
        )
        .bind(viewer.id)
        .all<Record<string, unknown>>(),
      db
        .prepare(
          'SELECT listing_id FROM favorites WHERE owner_id = ? ORDER BY created_at DESC',
        )
        .bind(viewer.id)
        .all<{ listing_id: string }>(),
      db
        .prepare(
          `SELECT responses.id, responses.request_id, responses.price,
                    responses.message, users.display_name AS owner_name,
                    responses.owner_id
             FROM responses
             JOIN users ON users.id = responses.owner_id
             JOIN requests ON requests.id = responses.request_id
             WHERE responses.owner_id = ? OR requests.owner_id = ?
             ORDER BY responses.created_at DESC
             LIMIT 250`,
        )
        .bind(viewer.id, viewer.id)
        .all<Record<string, unknown>>(),
      db
        .prepare(
          `SELECT bookings.id, bookings.listing_id, bookings.owner_id AS customer_id,
                  bookings.date_from, bookings.date_to, bookings.customer_phone,
                  bookings.delivery, bookings.comment, bookings.status,
                  listings.title AS listing_title, listings.phone AS listing_phone,
                  listings.owner_id AS listing_owner_id,
                  customers.display_name AS customer_name,
                  listing_owners.display_name AS listing_owner_name
           FROM bookings
           JOIN listings ON listings.id = bookings.listing_id
           JOIN users customers ON customers.id = bookings.owner_id
           JOIN users listing_owners ON listing_owners.id = listings.owner_id
           WHERE bookings.owner_id = ? OR listings.owner_id = ?
           ORDER BY bookings.created_at DESC
           LIMIT 150`,
        )
        .bind(viewer.id, viewer.id)
        .all<Record<string, unknown>>(),
      db
        .prepare(
          `SELECT responses.id, responses.price, responses.message,
                    responses.created_at, users.display_name AS actor_name,
                    requests.title AS target_title
             FROM responses
             JOIN users ON users.id = responses.owner_id
             JOIN requests ON requests.id = responses.request_id
             WHERE requests.owner_id = ?
             ORDER BY responses.created_at DESC
             LIMIT 50`,
        )
        .bind(viewer.id)
        .all<ResponseActivityRow>(),
      db
        .prepare(
          `SELECT bookings.id, bookings.date_from, bookings.date_to,
                    bookings.created_at, users.display_name AS actor_name,
                    listings.title AS target_title
             FROM bookings
             JOIN users ON users.id = bookings.owner_id
             JOIN listings ON listings.id = bookings.listing_id
             WHERE listings.owner_id = ?
             ORDER BY bookings.created_at DESC
             LIMIT 50`,
        )
        .bind(viewer.id)
        .all<BookingActivityRow>(),
      db
        .prepare(
          `SELECT bookings.id, bookings.status, bookings.created_at,
                  users.display_name AS actor_name,
                  listings.title AS target_title
           FROM bookings
           JOIN listings ON listings.id = bookings.listing_id
           JOIN users ON users.id = listings.owner_id
           WHERE bookings.owner_id = ?
             AND bookings.status IN ('accepted', 'declined')
           ORDER BY bookings.created_at DESC
           LIMIT 50`,
        )
        .bind(viewer.id)
        .all<BookingDecisionActivityRow>(),
      db
        .prepare(
          `SELECT moderation_actions.id, moderation_actions.action,
                  moderation_actions.target_title, moderation_actions.note,
                  moderation_actions.created_at, appeals.id AS appeal_id,
                  appeals.status AS appeal_status
             FROM moderation_actions
             LEFT JOIN appeals
               ON appeals.moderation_action_id = moderation_actions.id
             WHERE moderation_actions.target_owner_id = ?
             ORDER BY moderation_actions.created_at DESC
             LIMIT 50`,
        )
        .bind(viewer.id)
        .all<ModerationActivityRow>(),
      db
        .prepare(
          `SELECT appeals.id, appeals.moderation_action_id,
                  moderation_actions.target_title, moderation_actions.action,
                  appeals.message, appeals.status, appeals.resolution_note,
                  appeals.created_at, appeals.reviewed_at
             FROM appeals
             JOIN moderation_actions
               ON moderation_actions.id = appeals.moderation_action_id
             WHERE appeals.owner_id = ?
             ORDER BY appeals.created_at DESC
             LIMIT 100`,
        )
        .bind(viewer.id)
        .all<AppealRow>(),
      db
        .prepare(
          `SELECT messages.id, messages.body, messages.created_at,
                  users.display_name AS actor_name,
                  conversations.context_title
           FROM messages
           JOIN conversations
             ON conversations.id = messages.conversation_id
           JOIN users ON users.id = messages.sender_id
           WHERE (conversations.context_owner_id = ?
                  OR conversations.participant_id = ?)
             AND messages.sender_id != ?
           ORDER BY messages.created_at DESC
           LIMIT 50`,
        )
        .bind(viewer.id, viewer.id, viewer.id)
        .all<MessageActivityRow>(),
      db
        .prepare(
          `SELECT COUNT(*) AS count
           FROM messages
           JOIN conversations
             ON conversations.id = messages.conversation_id
           WHERE (conversations.context_owner_id = ?
                  OR conversations.participant_id = ?)
             AND messages.sender_id != ?
             AND messages.read_at IS NULL`,
        )
        .bind(viewer.id, viewer.id, viewer.id)
        .first<{ count: number }>(),
    ]);

    const activities = [
      ...responseActivityResult.results.map((row) => ({
        id: `response-${String(row.id)}`,
        kind: 'response',
        title: `Новый отклик от ${String(row.actor_name)}`,
        description: `На «${String(row.target_title)}» · ${String(row.price)}${row.message ? ` · ${String(row.message)}` : ''}`,
        createdAt: Number(row.created_at),
      })),
      ...bookingActivityResult.results.map((row) => ({
        id: `booking-${String(row.id)}`,
        kind: 'booking',
        title: `Запрос на аренду от ${String(row.actor_name)}`,
        description: `${String(row.target_title)} · ${String(row.date_from)} — ${String(row.date_to)}`,
        createdAt: Number(row.created_at),
      })),
      ...bookingDecisionActivityResult.results.map((row) => ({
        id: `booking-decision-${String(row.id)}-${row.status}`,
        kind: 'booking',
        title:
          row.status === 'accepted'
            ? `Бронирование подтверждено — ${String(row.actor_name)}`
            : `Бронирование отклонено — ${String(row.actor_name)}`,
        description: String(row.target_title),
        createdAt: Number(row.created_at),
      })),
      ...moderationActivityResult.results.map((row) => ({
        id: `moderation-${String(row.id)}`,
        kind: 'moderation',
        title:
          row.action === 'restrict'
            ? 'Публикация временно скрыта'
            : row.action === 'restore'
              ? 'Публикация снова активна'
              : 'Предупреждение от команды Qoldan',
        description: `«${String(row.target_title)}» · ${String(row.note)}`,
        createdAt: Number(row.created_at),
        moderationActionId: row.id,
        moderationAction: row.action,
        targetTitle: row.target_title,
        appealId: row.appeal_id,
        appealStatus: row.appeal_status,
      })),
      ...appealResult.results
        .filter((row) => row.status === 'approved' || row.status === 'rejected')
        .map((row) => ({
          id: `appeal-decision-${String(row.id)}-${row.status}`,
          kind: 'appeal',
          title:
            row.status === 'approved'
              ? 'Апелляция удовлетворена'
              : 'Апелляция отклонена',
          description: `«${String(row.target_title)}»${row.resolution_note ? ` · ${String(row.resolution_note)}` : ''}`,
          createdAt: Number(row.reviewed_at || row.created_at),
          appealId: row.id,
          appealStatus: row.status,
        })),
      ...messageActivityResult.results.map((row) => ({
        id: `message-${String(row.id)}`,
        kind: 'message',
        title: `Сообщение от ${String(row.actor_name)}`,
        description: `«${String(row.context_title)}» · ${String(row.body)}`,
        createdAt: Number(row.created_at),
      })),
    ]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 50);

    const moderationCount = viewerCanModerate
      ? await db
          .prepare(
            `SELECT
               (SELECT COUNT(*) FROM reports
                 WHERE status IN ('new', 'reviewing')) +
               (SELECT COUNT(*) FROM appeals
                 WHERE status IN ('new', 'reviewing')) AS count`,
          )
          .first<{ count: number }>()
      : null;

    return Response.json({
      viewer,
      moderation: {
        canModerate: viewerCanModerate,
        pendingCount: Number(moderationCount?.count || 0),
      },
      listings: listingResult.results.map((row) => ({
        id: String(row.id),
        title: row.title,
        price: row.price,
        unit: row.unit || undefined,
        location: row.location,
        region: row.region,
        distance: 'Рядом',
        category: row.category,
        type: row.offer_type,
        image: row.image_url,
        owner: row.owner_name,
        phone: row.phone,
        available: row.available || undefined,
        description: row.description || undefined,
        sellerType: row.seller_type,
        delivery: Boolean(row.delivery),
        status: row.status,
        latitude: typeof row.latitude === 'number' ? row.latitude : undefined,
        longitude:
          typeof row.longitude === 'number' ? row.longitude : undefined,
        mine: row.owner_id === viewer.id,
      })),
      requests: requestResult.results.map((row) => ({
        id: String(row.id),
        title: row.title,
        place: row.place,
        when: row.when_text,
        budget: row.budget,
        responses: Number(row.response_count),
        kind: row.kind,
        region: row.region,
        owner: row.owner_name,
        status: row.status,
        mine: row.owner_id === viewer.id,
      })),
      favorites: favoriteResult.results.map((row) => row.listing_id),
      responses: responseResult.results.map((row) => ({
        id: String(row.id),
        requestId: String(row.request_id),
        price: row.price,
        message: row.message || '',
        owner: row.owner_name,
        mine: row.owner_id === viewer.id,
      })),
      bookings: bookingResult.results.map((row) => {
        const incoming =
          row.listing_owner_id === viewer.id && row.customer_id !== viewer.id;
        return {
          id: String(row.id),
          listingId: String(row.listing_id),
          listingTitle: row.listing_title,
          dateFrom: row.date_from,
          dateTo: row.date_to,
          contactPhone: incoming ? row.customer_phone : row.listing_phone,
          counterparty: incoming ? row.customer_name : row.listing_owner_name,
          delivery: Boolean(row.delivery),
          comment: row.comment || '',
          status: row.status,
          incoming,
        };
      }),
      appeals: appealResult.results.map((row) => ({
        id: row.id,
        moderationActionId: row.moderation_action_id,
        targetTitle: row.target_title,
        action: row.action,
        message: row.message,
        status: row.status,
        resolutionNote: row.resolution_note || '',
        createdAt: Number(row.created_at),
        reviewedAt: row.reviewed_at ? Number(row.reviewed_at) : null,
      })),
      messaging: {
        unreadCount: Number(unreadMessageResult?.count || 0),
      },
      activities,
    });
  } catch (error) {
    return serverError(error);
  }
}
