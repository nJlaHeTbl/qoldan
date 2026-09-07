import {
  ensureMarketplaceSchema,
  getMarketplaceDb,
  getRateLimitResponse,
  getViewer,
  serverError,
  unauthorized,
  upsertViewer,
} from '@/lib/server/marketplace-db';
import {
  bookingInput,
  invalidInput,
  parseJson,
} from '@/lib/server/marketplace-schemas';

export async function POST(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  try {
    const input = await parseJson(request, bookingInput);
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const db = getMarketplaceDb();
    const listing = await db
      .prepare(
        `SELECT listings.owner_id, listings.title, listings.phone,
                users.display_name AS owner_name
         FROM listings
         JOIN users ON users.id = listings.owner_id
         WHERE listings.id = ?
           AND listings.status = 'active'
           AND listings.offer_type = 'Сдам'`,
      )
      .bind(input.listingId)
      .first<{
        owner_id: string;
        title: string;
        phone: string;
        owner_name: string;
      }>();
    if (!listing) {
      return Response.json(
        { error: 'Объявление не найдено или временно недоступно' },
        { status: 404 },
      );
    }
    if (listing?.owner_id === viewer.id) {
      return Response.json(
        { error: 'Нельзя бронировать собственное объявление' },
        { status: 409 },
      );
    }
    const occupied = await db
      .prepare(
        `SELECT date_from, date_to
         FROM bookings
         WHERE listing_id = ?
           AND status = 'accepted'
           AND date_from <= ?
           AND date_to >= ?
         LIMIT 1`,
      )
      .bind(input.listingId, input.dateTo, input.dateFrom)
      .first<{ date_from: string; date_to: string }>();
    if (occupied) {
      return Response.json(
        {
          error: `Эти даты уже заняты: ${occupied.date_from} — ${occupied.date_to}`,
        },
        { status: 409 },
      );
    }
    const duplicate = await db
      .prepare(
        `SELECT id
         FROM bookings
         WHERE listing_id = ?
           AND owner_id = ?
           AND status IN ('pending', 'accepted')
           AND date_from <= ?
           AND date_to >= ?
         LIMIT 1`,
      )
      .bind(input.listingId, viewer.id, input.dateTo, input.dateFrom)
      .first<{ id: string }>();
    if (duplicate) {
      return Response.json(
        { error: 'У вас уже есть запрос на пересекающиеся даты' },
        { status: 409 },
      );
    }
    const hourMs = 60 * 60 * 1000;
    const limited = await getRateLimitResponse(
      db
        .prepare(
          `SELECT created_at FROM bookings
           WHERE owner_id = ? AND created_at >= ?
           ORDER BY created_at DESC
           LIMIT 1 OFFSET 9`,
        )
        .bind(viewer.id, Date.now() - hourMs),
      hourMs,
      'Можно отправить до 10 запросов на аренду в час. Попробуйте немного позже.',
    );
    if (limited) return limited;
    const id = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO bookings
         (id, listing_id, owner_id, date_from, date_to, customer_phone,
          delivery, comment, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      )
      .bind(
        id,
        input.listingId,
        viewer.id,
        input.dateFrom,
        input.dateTo,
        input.customerPhone,
        input.delivery ? 1 : 0,
        input.comment || null,
        Date.now(),
      )
      .run();
    return Response.json(
      {
        booking: {
          id,
          listingId: input.listingId,
          listingTitle: listing.title,
          dateFrom: input.dateFrom,
          dateTo: input.dateTo,
          contactPhone: listing.phone,
          counterparty: listing.owner_name,
          delivery: input.delivery,
          comment: input.comment,
          status: 'pending',
          completedAt: null,
          incoming: false,
          canReview: false,
          review: null,
          handoff: null,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    try {
      return invalidInput(error);
    } catch {
      return serverError(error);
    }
  }
}
