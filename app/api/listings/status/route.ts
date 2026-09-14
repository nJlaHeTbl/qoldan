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
  listingStatusInput,
  parseJson,
} from '@/lib/server/marketplace-schemas';

export async function POST(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  try {
    const input = await parseJson(request, listingStatusInput);
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const result = await getMarketplaceDb()
      .prepare(
        `UPDATE listings
         SET status = ?, updated_at = MAX(updated_at + 1, ?)
         WHERE id = ? AND owner_id = ? AND status IN ('active', 'paused')`,
      )
      .bind(input.status, Date.now(), input.listingId, viewer.id)
      .run();
    if (!result.meta.changes) {
      return Response.json(
        { error: 'Объявление не найдено или принадлежит другому пользователю' },
        { status: 404 },
      );
    }
    return Response.json({ listingId: input.listingId, status: input.status });
  } catch (error) {
    try {
      return invalidInput(error);
    } catch {
      return serverError(error);
    }
  }
}
