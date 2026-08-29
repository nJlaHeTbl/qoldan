import {
  ensureMarketplaceSchema,
  getMarketplaceDb,
  getViewer,
  serverError,
  unauthorized,
  upsertViewer,
} from '@/lib/server/marketplace-db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  try {
    const listingId = new URL(request.url).searchParams.get('listingId') || '';
    if (!listingId || listingId.length > 100) {
      return Response.json({ error: 'Объявление не выбрано' }, { status: 400 });
    }
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const db = getMarketplaceDb();
    const listing = await db
      .prepare(
        `SELECT id
         FROM listings
         WHERE id = ? AND status = 'active' AND offer_type = 'Сдам'`,
      )
      .bind(listingId)
      .first<{ id: string }>();
    if (!listing) {
      return Response.json(
        { error: 'Объявление не найдено или больше не сдаётся' },
        { status: 404 },
      );
    }
    const result = await db
      .prepare(
        `SELECT date_from, date_to
         FROM bookings
         WHERE listing_id = ? AND status = 'accepted'
         ORDER BY date_from ASC
         LIMIT 250`,
      )
      .bind(listingId)
      .all<{ date_from: string; date_to: string }>();
    return Response.json({
      ranges: result.results.map((item) => ({
        dateFrom: item.date_from,
        dateTo: item.date_to,
      })),
    });
  } catch (error) {
    return serverError(error);
  }
}
