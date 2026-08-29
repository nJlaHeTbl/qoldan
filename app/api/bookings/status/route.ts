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
    const result = await getMarketplaceDb()
      .prepare(
        `UPDATE bookings
         SET status = ?
         WHERE id = ? AND listing_id IN (
           SELECT id FROM listings WHERE owner_id = ?
         )`,
      )
      .bind(input.status, input.bookingId, viewer.id)
      .run();
    if (!result.meta.changes) {
      return Response.json(
        { error: 'Бронирование не найдено или принадлежит другому владельцу' },
        { status: 404 },
      );
    }
    return Response.json({ bookingId: input.bookingId, status: input.status });
  } catch (error) {
    try {
      return invalidInput(error);
    } catch {
      return serverError(error);
    }
  }
}
