import {
  ensureMarketplaceSchema,
  getMarketplaceDb,
  getViewer,
  serverError,
  unauthorized,
  upsertViewer,
} from '@/lib/server/marketplace-db';
import {
  bookingStatusInput,
  invalidInput,
  parseJson,
} from '@/lib/server/marketplace-schemas';

export async function POST(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  try {
    const input = await parseJson(request, bookingStatusInput);
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const db = getMarketplaceDb();
    const booking = await db
      .prepare(
        `SELECT bookings.id, bookings.listing_id, bookings.date_from,
                bookings.date_to, bookings.status
         FROM bookings
         JOIN listings ON listings.id = bookings.listing_id
         WHERE bookings.id = ? AND listings.owner_id = ?`,
      )
      .bind(input.bookingId, viewer.id)
      .first<{
        id: string;
        listing_id: string;
        date_from: string;
        date_to: string;
        status: 'pending' | 'accepted' | 'declined' | 'completed';
      }>();
    if (!booking) {
      return Response.json(
        { error: 'Бронирование не найдено или принадлежит другому владельцу' },
        { status: 404 },
      );
    }
    if (input.status === 'completed') {
      if (booking.status !== 'accepted') {
        return Response.json(
          { error: 'Завершить можно только подтверждённую аренду' },
          { status: 409 },
        );
      }
      const completedAt = Date.now();
      const completed = await db
        .prepare(
          `UPDATE bookings
           SET status = 'completed', completed_at = ?
           WHERE id = ? AND status = 'accepted'`,
        )
        .bind(completedAt, booking.id)
        .run();
      if (!completed.meta.changes) {
        return Response.json(
          { error: 'Статус аренды уже изменился' },
          { status: 409 },
        );
      }
      return Response.json({
        bookingId: input.bookingId,
        status: input.status,
        completedAt,
        autoDeclinedIds: [],
      });
    }
    if (booking.status !== 'pending') {
      return Response.json(
        { error: 'Решение по этому бронированию уже принято' },
        { status: 409 },
      );
    }
    if (input.status === 'declined') {
      await db
        .prepare(
          `UPDATE bookings SET status = 'declined'
           WHERE id = ? AND status = 'pending'`,
        )
        .bind(booking.id)
        .run();
      return Response.json({
        bookingId: input.bookingId,
        status: input.status,
        autoDeclinedIds: [],
      });
    }

    const accepted = await db
      .prepare(
        `UPDATE bookings
         SET status = 'accepted'
         WHERE id = ?
           AND status = 'pending'
           AND NOT EXISTS (
             SELECT 1
             FROM bookings AS occupied
             WHERE occupied.listing_id = bookings.listing_id
               AND occupied.id != bookings.id
               AND occupied.status = 'accepted'
               AND occupied.date_from <= bookings.date_to
               AND occupied.date_to >= bookings.date_from
           )`,
      )
      .bind(booking.id)
      .run();
    if (!accepted.meta.changes) {
      return Response.json(
        {
          error:
            'Эти даты уже заняты другим подтверждённым бронированием. Выберите другой запрос.',
        },
        { status: 409 },
      );
    }

    const overlapping = await db
      .prepare(
        `SELECT id
         FROM bookings
         WHERE listing_id = ?
           AND id != ?
           AND status = 'pending'
           AND date_from <= ?
           AND date_to >= ?`,
      )
      .bind(booking.listing_id, booking.id, booking.date_to, booking.date_from)
      .all<{ id: string }>();
    if (overlapping.results.length > 0) {
      await db
        .prepare(
          `UPDATE bookings
           SET status = 'declined'
           WHERE listing_id = ?
             AND id != ?
             AND status = 'pending'
             AND date_from <= ?
             AND date_to >= ?`,
        )
        .bind(
          booking.listing_id,
          booking.id,
          booking.date_to,
          booking.date_from,
        )
        .run();
    }
    return Response.json({
      bookingId: input.bookingId,
      status: input.status,
      autoDeclinedIds: overlapping.results.map((item) => item.id),
    });
  } catch (error) {
    try {
      return invalidInput(error);
    } catch {
      return serverError(error);
    }
  }
}
