import {
  canModerate,
  ensureMarketplaceSchema,
  getMarketplaceDb,
  getViewer,
  serverError,
  upsertViewer,
} from '@/lib/server/marketplace-db';
import {
  mapSavedSearch,
  savedSearchSelect,
  type SavedSearchRow,
} from '@/lib/server/saved-searches';
import { readAttributes } from '@/lib/listing-attributes';
import { priceNumber } from '@/lib/price';
import {
  AUCTION_COLUMNS,
  settleDueAuctions,
  toAuctionSummary,
  type AuctionRow,
} from '@/lib/server/auctions';

export const dynamic = 'force-dynamic';

type ResponseActivityRow = {
  id: string;
  price: string;
  message: string | null;
  created_at: number;
  actor_name: string;
  target_title: string;
};

type SelectionActivityRow = {
  request_id: string;
  status: 'selected' | 'cancelled' | 'completed';
  price: string;
  selected_at: number;
  updated_at: number;
  completed_at: number | null;
  customer_name: string;
  request_title: string;
};

type RequestReviewActivityRow = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: number;
  reviewer_name: string;
  request_title: string;
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
  status: 'accepted' | 'declined' | 'completed';
  created_at: number;
  actor_name: string;
  target_title: string;
};

type HandoffActivityRow = {
  booking_id: string;
  deposit_amount: number;
  handed_over_at: number;
  actor_name: string;
  target_title: string;
};

type ReviewRow = {
  id: string;
  booking_id: string;
  listing_id: string;
  listing_title: string;
  rating: number;
  comment: string | null;
  reviewer_name: string;
  created_at: number;
};

type OwnVerificationRow = {
  id: string;
  profile_type: 'farm' | 'company' | 'store' | 'service_company';
  organization_name: string;
  bin: string;
  phone: string;
  region: string;
  reference_url: string | null;
  note: string | null;
  status: 'pending' | 'verified' | 'rejected';
  review_note: string | null;
  created_at: number;
  reviewed_at: number | null;
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
  const authenticatedViewer = await getViewer(request);
  const viewer = authenticatedViewer || {
    id: '__qoldan_public_guest__',
    email: '',
    displayName: 'Гость',
  };
  try {
    await ensureMarketplaceSchema();
    if (authenticatedViewer) await upsertViewer(authenticatedViewer);
    const db = getMarketplaceDb();
    const viewerCanModerate = authenticatedViewer
      ? canModerate(authenticatedViewer)
      : false;
    await settleDueAuctions(db);
    const auctionRows = await db
      .prepare(
        `SELECT ${AUCTION_COLUMNS} FROM auctions
         WHERE auctions.status = 'active' OR auctions.settled_at >= ?
         LIMIT 500`,
      )
      .bind(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .all<AuctionRow>();
    const auctionNow = Date.now();
    const auctionByListing = new Map(
      auctionRows.results.map((row) => [row.listing_id, toAuctionSummary(row, auctionNow)]),
    );
    const [listingResult, requestResult, reviewResult] = await Promise.all([
      db
        .prepare(
          `SELECT listings.id, listings.title, listings.price, listings.unit,
                          listings.location, listings.region, listings.category,
                          listings.offer_type, listings.image_url, listings.phone, listings.show_phone, listings.attributes,
                          listings.available, listings.description,
                          listings.seller_type, listings.delivery, listings.owner_id,
                          listings.livestock_type, listings.livestock_quantity,
                          listings.livestock_price_mode, listings.livestock_breed,
                          listings.status, listings.created_at, listings.updated_at,
                          listing_locations.latitude, listing_locations.longitude,
                          COALESCE(verified_business.organization_name,
                                   users.display_name) AS owner_name,
                          verified_business.id AS verified_business_id,
                          verified_business.profile_type AS business_profile_type,
                          review_stats.rating_average,
                          review_stats.review_count
                   FROM listings
                   JOIN users ON users.id = listings.owner_id
                   LEFT JOIN business_verifications verified_business
                     ON verified_business.owner_id = listings.owner_id
                    AND verified_business.status = 'verified'
                   LEFT JOIN listing_locations ON listing_locations.listing_id = listings.id
                   LEFT JOIN (
                     SELECT listing_id, AVG(rating) AS rating_average,
                            COUNT(*) AS review_count
                     FROM reviews
                     GROUP BY listing_id
                   ) AS review_stats ON review_stats.listing_id = listings.id
                   WHERE listings.status = 'active' OR listings.owner_id = ?
                   ORDER BY listings.created_at DESC
                   LIMIT 250`,
        )
        .bind(viewer.id)
        .all<Record<string, unknown>>(),
      db
        .prepare(
          `SELECT requests.id, requests.title, requests.place, requests.latitude, requests.longitude,
                          requests.when_text, requests.budget, requests.kind,
                          requests.region, requests.response_count,
                          requests.owner_id, requests.status,
                          users.display_name AS owner_name,
                          request_selections.response_id AS selected_response_id,
                          request_selections.status AS selection_status,
                          request_selections.selected_at,
                          request_selections.completed_at,
                          selected_responses.owner_id AS selected_provider_id,
                           selected_responses.price AS selected_price,
                           selected_providers.display_name AS selected_provider_name,
                           selection_conversations.id AS selection_conversation_id,
                           request_reviews.id AS service_review_id,
                           request_reviews.rating AS service_review_rating,
                           request_reviews.comment AS service_review_comment,
                           request_reviews.created_at AS service_review_created_at,
                           service_reviewers.display_name AS service_reviewer_name
                   FROM requests
                   JOIN users ON users.id = requests.owner_id
                   LEFT JOIN request_selections
                     ON request_selections.request_id = requests.id
                   LEFT JOIN responses selected_responses
                     ON selected_responses.id = request_selections.response_id
                   LEFT JOIN users selected_providers
                     ON selected_providers.id = selected_responses.owner_id
                    LEFT JOIN conversations selection_conversations
                     ON selection_conversations.context_type = 'request'
                     AND selection_conversations.context_id = requests.id
                     AND selection_conversations.participant_id = selected_responses.owner_id
                    LEFT JOIN request_reviews
                      ON request_reviews.request_id = requests.id
                    LEFT JOIN users service_reviewers
                      ON service_reviewers.id = request_reviews.reviewer_id
                   WHERE requests.status = 'open'
                      OR requests.owner_id = ?
                      OR selected_responses.owner_id = ?
                   ORDER BY requests.created_at DESC
                   LIMIT 250`,
        )
        .bind(viewer.id, viewer.id)
        .all<Record<string, unknown>>(),
      db
        .prepare(
          `SELECT reviews.id, reviews.booking_id, reviews.listing_id,
                        listings.title AS listing_title, reviews.rating,
                        reviews.comment, reviews.created_at,
                        users.display_name AS reviewer_name
                 FROM reviews
                 JOIN listings ON listings.id = reviews.listing_id
                 JOIN users ON users.id = reviews.reviewer_id
                 ORDER BY reviews.created_at DESC
                 LIMIT 250`,
        )
        .all<ReviewRow>(),
    ]);
    const [
      favoriteResult,
      savedSearchResult,
      responseResult,
      bookingResult,
      verificationResult,
      responseActivityResult,
      selectionActivityResult,
      requestReviewActivityResult,
      serviceTrustResult,
      bookingActivityResult,
      bookingDecisionActivityResult,
      handoffActivityResult,
      moderationActivityResult,
      appealResult,
      messageActivityResult,
      unreadMessageResult,
    ] = authenticatedViewer
      ? await Promise.all([
          db
            .prepare(
              `SELECT favorites.listing_id, favorites.price_at_save,
                      listings.title, listings.price, listings.status, listings.updated_at
               FROM favorites
               LEFT JOIN listings ON listings.id = favorites.listing_id
               WHERE favorites.owner_id = ?
               ORDER BY favorites.created_at DESC`,
            )
            .bind(viewer.id)
            .all<{
              listing_id: string;
              price_at_save: string | null;
              title: string | null;
              price: string | null;
              status: string | null;
              updated_at: number | null;
            }>(),
          db
            .prepare(
              `${savedSearchSelect}
                     WHERE saved_searches.owner_id = ?
                     ORDER BY saved_searches.created_at DESC
                     LIMIT 20`,
            )
            .bind(viewer.id)
            .all<SavedSearchRow>(),
          db
            .prepare(
              `SELECT responses.id, responses.request_id, responses.price,
                               responses.message, users.display_name AS owner_name,
                               responses.owner_id,
                               request_selections.status AS selection_status,
                               service_review_stats.rating_average AS provider_rating_average,
                               service_review_stats.review_count AS provider_review_count
                       FROM responses
                       JOIN users ON users.id = responses.owner_id
                       JOIN requests ON requests.id = responses.request_id
                        LEFT JOIN request_selections
                          ON request_selections.request_id = responses.request_id
                         AND request_selections.response_id = responses.id
                        LEFT JOIN (
                          SELECT provider_id, AVG(rating) AS rating_average,
                                 COUNT(*) AS review_count
                          FROM request_reviews
                          GROUP BY provider_id
                        ) AS service_review_stats
                          ON service_review_stats.provider_id = responses.owner_id
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
                            bookings.completed_at,
                            listings.title AS listing_title, listings.phone AS listing_phone,
                            listings.owner_id AS listing_owner_id,
                            customers.display_name AS customer_name,
                            listing_owners.display_name AS listing_owner_name,
                            reviews.id AS review_id, reviews.rating AS review_rating,
                            reviews.comment AS review_comment,
                            reviews.created_at AS review_created_at,
                            reviewers.display_name AS review_reviewer_name,
                            rental_handoffs.booking_id AS handoff_booking_id,
                            rental_handoffs.deposit_amount,
                            rental_handoffs.deposit_received,
                            rental_handoffs.condition_out,
                            rental_handoffs.equipment_list,
                            rental_handoffs.handed_over_at,
                            rental_handoffs.condition_in,
                            rental_handoffs.deposit_result,
                            rental_handoffs.return_note,
                            rental_handoffs.returned_at
                     FROM bookings
                     JOIN listings ON listings.id = bookings.listing_id
                     JOIN users customers ON customers.id = bookings.owner_id
                     JOIN users listing_owners ON listing_owners.id = listings.owner_id
                     LEFT JOIN reviews ON reviews.booking_id = bookings.id
                     LEFT JOIN users reviewers ON reviewers.id = reviews.reviewer_id
                     LEFT JOIN rental_handoffs
                       ON rental_handoffs.booking_id = bookings.id
                     WHERE bookings.owner_id = ? OR listings.owner_id = ?
                     ORDER BY bookings.created_at DESC
                     LIMIT 150`,
            )
            .bind(viewer.id, viewer.id)
            .all<Record<string, unknown>>(),
          db
            .prepare(
              `SELECT id, profile_type, organization_name, bin, phone, region,
                            reference_url, note, status, review_note,
                            created_at, reviewed_at
                     FROM business_verifications
                     WHERE owner_id = ?`,
            )
            .bind(viewer.id)
            .first<OwnVerificationRow>(),
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
              `SELECT request_selections.request_id, request_selections.status,
                            request_selections.selected_at,
                            request_selections.updated_at,
                            request_selections.completed_at,
                            responses.price,
                            customers.display_name AS customer_name,
                            requests.title AS request_title
                     FROM request_selections
                     JOIN responses ON responses.id = request_selections.response_id
                     JOIN requests ON requests.id = request_selections.request_id
                     JOIN users customers ON customers.id = requests.owner_id
                     WHERE responses.owner_id = ?
                     ORDER BY request_selections.updated_at DESC
                     LIMIT 50`,
            )
            .bind(viewer.id)
            .all<SelectionActivityRow>(),
          db
            .prepare(
              `SELECT request_reviews.id, request_reviews.rating,
                            request_reviews.comment, request_reviews.created_at,
                            reviewers.display_name AS reviewer_name,
                            requests.title AS request_title
                     FROM request_reviews
                     JOIN requests ON requests.id = request_reviews.request_id
                     JOIN users reviewers ON reviewers.id = request_reviews.reviewer_id
                     WHERE request_reviews.provider_id = ?
                     ORDER BY request_reviews.created_at DESC
                     LIMIT 50`,
            )
            .bind(viewer.id)
            .all<RequestReviewActivityRow>(),
          db
            .prepare(
              `SELECT AVG(rating) AS rating_average, COUNT(*) AS review_count
                     FROM request_reviews
                     WHERE provider_id = ?`,
            )
            .bind(viewer.id)
            .first<{ rating_average: number | null; review_count: number }>(),
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
              `SELECT bookings.id, bookings.status,
                            COALESCE(bookings.completed_at, bookings.created_at) AS created_at,
                            users.display_name AS actor_name,
                            listings.title AS target_title
                     FROM bookings
                     JOIN listings ON listings.id = bookings.listing_id
                     JOIN users ON users.id = listings.owner_id
                     WHERE bookings.owner_id = ?
                        AND bookings.status IN ('accepted', 'declined', 'completed')
                     ORDER BY bookings.created_at DESC
                     LIMIT 50`,
            )
            .bind(viewer.id)
            .all<BookingDecisionActivityRow>(),
          db
            .prepare(
              `SELECT rental_handoffs.booking_id,
                            rental_handoffs.deposit_amount,
                            rental_handoffs.handed_over_at,
                            users.display_name AS actor_name,
                            listings.title AS target_title
                     FROM rental_handoffs
                     JOIN bookings ON bookings.id = rental_handoffs.booking_id
                     JOIN listings ON listings.id = bookings.listing_id
                     JOIN users ON users.id = listings.owner_id
                     WHERE bookings.owner_id = ?
                     ORDER BY rental_handoffs.handed_over_at DESC
                     LIMIT 50`,
            )
            .bind(viewer.id)
            .all<HandoffActivityRow>(),
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
        ])
      : ([
          { results: [] as never[] },
          { results: [] as never[] },
          { results: [] as never[] },
          { results: [] as never[] },
          null,
          { results: [] as never[] },
          { results: [] as never[] },
          { results: [] as never[] },
          null,
          { results: [] as never[] },
          { results: [] as never[] },
          { results: [] as never[] },
          { results: [] as never[] },
          { results: [] as never[] },
          { results: [] as never[] },
          null,
        ] as const);

    // Auction events for the signed-in user: outbid, won, sold or ended, new bids on their auctions.
    const auctionActivityResult = authenticatedViewer
      ? await db
          .prepare(
            `SELECT auctions.id, auctions.seller_id, auctions.status, auctions.result, auctions.current_bid,
                    auctions.bid_count, auctions.leader_id, auctions.winner_id, auctions.updated_at,
                    auctions.settled_at, listings.title,
                    EXISTS (SELECT 1 FROM bids WHERE bids.auction_id = auctions.id AND bids.bidder_id = ?1) AS i_bid
             FROM auctions JOIN listings ON listings.id = auctions.listing_id
             WHERE (auctions.seller_id = ?1
                    OR EXISTS (SELECT 1 FROM bids WHERE bids.auction_id = auctions.id AND bids.bidder_id = ?1))
               AND auctions.updated_at >= ?2
             ORDER BY auctions.updated_at DESC LIMIT 40`,
          )
          .bind(viewer.id, Date.now() - 30 * 24 * 60 * 60 * 1000)
          .all<Record<string, unknown>>()
      : { results: [] as Record<string, unknown>[] };
    const auctionActivities = auctionActivityResult.results.flatMap((row) => {
      const amount = row.current_bid === null ? 0 : Number(row.current_bid);
      const money = `${amount.toLocaleString('ru-RU')} ₸`;
      const title = String(row.title);
      const at = Number(row.settled_at || row.updated_at);
      const base = { kind: 'response' as const, createdAt: at };
      if (row.seller_id === viewer.id) {
        if (row.status === 'active' && Number(row.bid_count) > 0) {
          return [{ ...base, id: `auction-bid-${String(row.id)}-${String(row.bid_count)}`, title: 'Новая ставка в ваших торгах', description: `«${title}» · сейчас ${money}` }];
        }
        if (row.status === 'ended') {
          return [{
            ...base,
            id: `auction-end-${String(row.id)}`,
            title: row.result === 'sold' ? 'Торги завершены: товар продан' : row.result === 'reserve_not_met' ? 'Торги завершены: резервная цена не достигнута' : 'Торги завершены без ставок',
            description: row.result === 'sold' ? `«${title}» · ${money}. Победитель напишет вам в чате` : `«${title}»`,
          }];
        }
        return [];
      }
      if (!row.i_bid) return [];
      if (row.status === 'active' && row.leader_id !== viewer.id) {
        return [{ ...base, id: `auction-outbid-${String(row.id)}-${String(row.bid_count)}`, title: 'Вашу ставку перебили', description: `«${title}» · сейчас ${money}` }];
      }
      if (row.status === 'ended' && row.winner_id === viewer.id) {
        return [{ ...base, id: `auction-won-${String(row.id)}`, title: 'Вы выиграли торги', description: `«${title}» · ${money}. Напишите продавцу в чате Qoldan` }];
      }
      if (row.status === 'ended') {
        return [{ ...base, id: `auction-lost-${String(row.id)}`, title: 'Торги завершены', description: `«${title}» · победила другая ставка` }];
      }
      return [];
    });
    // Saved listings that became cheaper than when they were added to favourites.
    const priceDropActivities = favoriteResult.results.flatMap((row) => {
      if (row.status !== 'active' || !row.title) return [];
      const before = priceNumber(row.price_at_save);
      const now = priceNumber(row.price);
      if (before === null || now === null || now >= before) return [];
      return [
        {
          id: `price-drop-${row.listing_id}-${now}`,
          kind: 'price',
          title: 'Цена снизилась',
          description: `«${row.title}» · было ${before.toLocaleString('ru-RU')} ₸, стало ${now.toLocaleString('ru-RU')} ₸`,
          createdAt: Number(row.updated_at || Date.now()),
          listingId: row.listing_id,
        },
      ];
    });
    const activities = [
      ...priceDropActivities,
      ...savedSearchResult.results
        .filter((row) => Number(row.new_matches || 0) > 0)
        .map((row) => ({
          id: `saved-search-${String(row.id)}-${String(row.latest_match_at)}`,
          kind: 'search',
          title:
            Number(row.new_matches) === 1
              ? '1 новое предложение'
              : `${Number(row.new_matches)} новых предложений`,
          description: String(row.name),
          createdAt: Number(row.latest_match_at || Date.now()),
        })),
      ...responseActivityResult.results.map((row) => ({
        id: `response-${String(row.id)}`,
        kind: 'response',
        title: `Новый отклик от ${String(row.actor_name)}`,
        description: `На «${String(row.target_title)}» · ${String(row.price)}${row.message ? ` · ${String(row.message)}` : ''}`,
        createdAt: Number(row.created_at),
      })),
      ...selectionActivityResult.results.map((row) => ({
        id: `selection-${String(row.request_id)}-${row.status}`,
        kind: 'response',
        title:
          row.status === 'selected'
            ? `Вас выбрали исполнителем — ${String(row.customer_name)}`
            : row.status === 'completed'
              ? 'Заказчик отметил работу выполненной'
              : 'Заказчик отменил выбор исполнителя',
        description: `«${String(row.request_title)}» · ${String(row.price)}`,
        createdAt: Number(
          row.status === 'completed'
            ? row.completed_at || row.updated_at
            : row.updated_at || row.selected_at,
        ),
      })),
      ...requestReviewActivityResult.results.map((row) => ({
        id: `request-review-${String(row.id)}`,
        kind: 'response',
        title: `Новый проверенный отзыв от ${String(row.reviewer_name)}`,
        description: `«${String(row.request_title)}» · ${Number(row.rating)}/5${row.comment ? ` · ${String(row.comment)}` : ''}`,
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
            : row.status === 'completed'
              ? `Аренда завершена — можно оставить отзыв`
              : `Бронирование отклонено — ${String(row.actor_name)}`,
        description: String(row.target_title),
        createdAt: Number(row.created_at),
      })),
      ...handoffActivityResult.results.map((row) => ({
        id: `handoff-${String(row.booking_id)}`,
        kind: 'booking',
        title: `Передача аренды зафиксирована — ${String(row.actor_name)}`,
        description: `${String(row.target_title)} · ${Number(row.deposit_amount) > 0 ? `залог ${Number(row.deposit_amount).toLocaleString('ru-RU')} ₸` : 'без залога'}`,
        createdAt: Number(row.handed_over_at),
      })),
      ...(verificationResult && verificationResult.status !== 'pending'
        ? [
            {
              id: `business-verification-${verificationResult.id}-${verificationResult.status}`,
              kind: 'moderation',
              title:
                verificationResult.status === 'verified'
                  ? 'Бизнес-профиль подтверждён'
                  : 'Нужно уточнить данные бизнеса',
              description: `${verificationResult.organization_name}${verificationResult.review_note ? ` · ${verificationResult.review_note}` : ''}`,
              createdAt: Number(
                verificationResult.reviewed_at || verificationResult.created_at,
              ),
            },
          ]
        : []),
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
      ...auctionActivities,
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
                  WHERE status IN ('new', 'reviewing')) +
               (SELECT COUNT(*) FROM business_verifications
                  WHERE status = 'pending') AS count`,
          )
          .first<{ count: number }>()
      : null;

    return Response.json({
      viewer: authenticatedViewer
        ? { displayName: authenticatedViewer.displayName }
        : null,
      moderation: {
        canModerate: viewerCanModerate,
        pendingCount: Number(moderationCount?.count || 0),
      },
      listings: listingResult.results.map((row) => ({
        id: String(row.id),
        ownerId: row.owner_id,
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
        // The phone number is never part of a public payload: other users get it through
        // POST /api/listings/phone (signed in, rate limited, logged, owner consent required).
        phone: row.owner_id === viewer.id ? row.phone : undefined,
        hasPhone: Boolean(row.show_phone) && Boolean(row.phone),
        auction: auctionByListing.get(String(row.id)),
        attributes: readAttributes(row.attributes),
        available: row.available || undefined,
        description: row.description || undefined,
        sellerType: row.seller_type,
        verified: Boolean(row.verified_business_id),
        businessType: row.business_profile_type || undefined,
        delivery: Boolean(row.delivery),
        livestockType: row.livestock_type || undefined,
        livestockQuantity:
          typeof row.livestock_quantity === 'number'
            ? row.livestock_quantity
            : undefined,
        livestockPriceMode: row.livestock_price_mode || undefined,
        livestockBreed: row.livestock_breed || undefined,
        status: row.status,
        createdAt: Number(row.created_at),
        // Only the owner needs it: the edit form sends it back to detect a stale form.
        updatedAt: row.owner_id === viewer.id ? Number(row.updated_at) : undefined,
        latitude: typeof row.latitude === 'number' ? row.latitude : undefined,
        longitude:
          typeof row.longitude === 'number' ? row.longitude : undefined,
        mine: row.owner_id === viewer.id,
        rating:
          typeof row.rating_average === 'number'
            ? Number(row.rating_average).toFixed(1)
            : undefined,
        reviewCount: Number(row.review_count || 0),
      })),
      requests: requestResult.results.map((row) => {
        const canSeeSelection =
          row.owner_id === viewer.id || row.selected_provider_id === viewer.id;
        return {
          id: String(row.id),
          title: row.title,
          place: row.place,
          latitude: row.latitude ?? undefined,
          longitude: row.longitude ?? undefined,
          when: row.when_text,
          budget: row.budget,
          responses: Number(row.response_count),
          kind: row.kind,
          region: row.region,
          owner: row.owner_name,
          status: row.status,
          mine: row.owner_id === viewer.id,
          selection:
            canSeeSelection && row.selected_response_id
              ? {
                  requestId: String(row.id),
                  responseId: row.selected_response_id as string,
                  providerId: row.selected_provider_id as string,
                  providerName: row.selected_provider_name as string,
                  price: row.selected_price as string,
                  status: row.selection_status as
                    | 'selected'
                    | 'cancelled'
                    | 'completed',
                  conversationId:
                    typeof row.selection_conversation_id === 'string'
                      ? row.selection_conversation_id
                      : '',
                  selectedAt: Number(row.selected_at),
                  completedAt: row.completed_at
                    ? Number(row.completed_at)
                    : null,
                  mineAsProvider: row.selected_provider_id === viewer.id,
                  review: row.service_review_id
                    ? {
                        id: row.service_review_id as string,
                        requestId: String(row.id),
                        responseId: row.selected_response_id as string,
                        requestTitle: row.title as string,
                        rating: Number(row.service_review_rating),
                        comment: (row.service_review_comment as string) || '',
                        reviewer: row.service_reviewer_name as string,
                        providerId: row.selected_provider_id as string,
                        providerName: row.selected_provider_name as string,
                        createdAt: Number(row.service_review_created_at),
                      }
                    : null,
                }
              : null,
        };
      }),
      favorites: favoriteResult.results.map((row) => row.listing_id),
      savedSearches: savedSearchResult.results.map(mapSavedSearch),
      responses: responseResult.results.map((row) => ({
        id: String(row.id),
        requestId: String(row.request_id),
        price: row.price,
        message: row.message || '',
        owner: row.owner_name,
        ownerId: row.owner_id,
        mine: row.owner_id === viewer.id,
        selectionStatus: row.selection_status || null,
        providerRating:
          typeof row.provider_rating_average === 'number'
            ? Number(row.provider_rating_average).toFixed(1)
            : undefined,
        providerReviewCount: Number(row.provider_review_count || 0),
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
          completedAt: row.completed_at ? Number(row.completed_at) : null,
          incoming,
          canReview: !incoming && row.status === 'completed' && !row.review_id,
          review: row.review_id
            ? {
                id: row.review_id as string,
                bookingId: String(row.id),
                listingId: String(row.listing_id),
                listingTitle: row.listing_title,
                rating: Number(row.review_rating),
                comment: row.review_comment || '',
                reviewer: row.review_reviewer_name,
                createdAt: Number(row.review_created_at),
              }
            : null,
          handoff: row.handoff_booking_id
            ? {
                depositAmount: Number(row.deposit_amount || 0),
                depositReceived: Boolean(row.deposit_received),
                conditionOut: row.condition_out || '',
                equipmentList: row.equipment_list || '',
                handedOverAt: Number(row.handed_over_at),
                conditionIn: row.condition_in || '',
                depositResult: row.deposit_result || null,
                returnNote: row.return_note || '',
                returnedAt: row.returned_at ? Number(row.returned_at) : null,
              }
            : null,
        };
      }),
      reviews: reviewResult.results.map((row) => ({
        id: row.id,
        bookingId: row.booking_id,
        listingId: row.listing_id,
        listingTitle: row.listing_title,
        rating: Number(row.rating),
        comment: row.comment || '',
        reviewer: row.reviewer_name,
        createdAt: Number(row.created_at),
      })),
      verification: verificationResult
        ? {
            id: verificationResult.id,
            profileType: verificationResult.profile_type,
            organizationName: verificationResult.organization_name,
            maskedBin: `••••••••${verificationResult.bin.slice(-4)}`,
            phone: verificationResult.phone,
            region: verificationResult.region,
            referenceUrl: verificationResult.reference_url || '',
            note: verificationResult.note || '',
            status: verificationResult.status,
            reviewNote: verificationResult.review_note || '',
            createdAt: Number(verificationResult.created_at),
            reviewedAt: verificationResult.reviewed_at
              ? Number(verificationResult.reviewed_at)
              : null,
          }
        : null,
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
      trust: {
        serviceRating:
          typeof serviceTrustResult?.rating_average === 'number'
            ? Number(serviceTrustResult.rating_average).toFixed(1)
            : undefined,
        serviceReviewCount: Number(serviceTrustResult?.review_count || 0),
      },
      activities,
    });
  } catch (error) {
    return serverError(error);
  }
}
