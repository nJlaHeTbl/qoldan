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
      responseActivityResult,
      bookingActivityResult,
    ] = await Promise.all([
      db
        .prepare(
          `SELECT listings.id, listings.title, listings.price, listings.unit,
                    listings.location, listings.region, listings.category,
                    listings.offer_type, listings.image_url, listings.phone,
                    listings.available, listings.description,
                    listings.seller_type, listings.delivery, listings.owner_id,
                    users.display_name AS owner_name
             FROM listings
             JOIN users ON users.id = listings.owner_id
             WHERE listings.status = 'active'
             ORDER BY listings.created_at DESC
             LIMIT 250`,
        )
        .all<Record<string, unknown>>(),
      db
        .prepare(
          `SELECT requests.id, requests.title, requests.place,
                    requests.when_text, requests.budget, requests.kind,
                    requests.region, requests.response_count,
                    requests.owner_id, users.display_name AS owner_name
             FROM requests
             JOIN users ON users.id = requests.owner_id
             WHERE requests.status = 'open'
             ORDER BY requests.created_at DESC
             LIMIT 250`,
        )
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
      activities,
    });
  } catch (error) {
    return serverError(error);
  }
}
