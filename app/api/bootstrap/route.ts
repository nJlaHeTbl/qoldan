import {
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

export async function GET(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  try {
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const db = getMarketplaceDb();
    const [
      listingResult,
      requestResult,
      favoriteResult,
      responseResult,
      bookingResult,
      responseActivityResult,
      bookingActivityResult,
      bookingDecisionActivityResult,
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
    ]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 50);

    return Response.json({
      viewer,
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
      activities,
    });
  } catch (error) {
    return serverError(error);
  }
}
