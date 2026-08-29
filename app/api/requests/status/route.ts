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
  requestStatusInput,
} from '@/lib/server/marketplace-schemas';

export async function POST(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  try {
    const input = await parseJson(request, requestStatusInput);
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const result = await getMarketplaceDb()
      .prepare(
        `UPDATE requests
         SET status = ?, updated_at = ?
         WHERE id = ? AND owner_id = ?`,
      )
      .bind(input.status, Date.now(), input.requestId, viewer.id)
      .run();
    if (!result.meta.changes) {
      return Response.json(
        { error: 'Заявка не найдена или принадлежит другому пользователю' },
        { status: 404 },
      );
    }
    return Response.json({ requestId: input.requestId, status: input.status });
  } catch (error) {
    try {
      return invalidInput(error);
    } catch {
      return serverError(error);
    }
  }
}
