import {
  ensureMarketplaceSchema,
  getMarketplaceDb,
  getViewer,
  serverError,
  unauthorized,
  upsertViewer,
} from '@/lib/server/marketplace-db';
import {
  invalidInput,
  parseJson,
  reviewInput,
} from '@/lib/server/marketplace-schemas';

export async function POST(request: Request) {
  const viewer = await getViewer(request);
  if (!viewer) return unauthorized();
  try {
    const input = await parseJson(request, reviewInput);
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const db = getMarketplaceDb();
    const booking = await db
      .prepare(
        `SELECT bookings.id, bookings.listing_id, bookings.status,
                listings.owner_id AS reviewee_id, listings.title
         FROM bookings
         JOIN listings ON listings.id = bookings.listing_id
         WHERE bookings.id = ? AND bookings.owner_id = ?`,
      )
      .bind(input.bookingId, viewer.id)
      .first<{
        id: string;
        listing_id: string;
        status: string;
        reviewee_id: string;
        title: string;
      }>();
    if (!booking) {
      return Response.json(
        { error: 'Аренда не найдена или принадлежит другому пользователю' },
        { status: 404 },
      );
    }
    if (booking.status !== 'completed') {
      return Response.json(
        { error: 'Отзыв доступен только после завершения аренды' },
        { status: 409 },
      );
    }
    if (booking.reviewee_id === viewer.id) {
      return Response.json(
        { error: 'Нельзя оставить отзыв самому себе' },
        { status: 409 },
      );
    }
    const id = crypto.randomUUID();
    const createdAt = Date.now();
    const inserted = await db
      .prepare(
        `INSERT OR IGNORE INTO reviews
         (id, booking_id, listing_id, reviewer_id, reviewee_id,
          rating, comment, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        booking.id,
        booking.listing_id,
        viewer.id,
        booking.reviewee_id,
        input.rating,
        input.comment || null,
        createdAt,
      )
      .run();
    if (!inserted.meta.changes) {
      return Response.json(
        { error: 'Отзыв по этой аренде уже оставлен' },
        { status: 409 },
      );
    }
    return Response.json(
      {
        review: {
          id,
          bookingId: booking.id,
          listingId: booking.listing_id,
          listingTitle: booking.title,
          rating: input.rating,
          comment: input.comment,
          reviewer: viewer.displayName,
          createdAt,
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
