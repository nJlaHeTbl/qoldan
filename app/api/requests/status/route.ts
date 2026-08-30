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
    const db = getMarketplaceDb();
    if (input.status === 'open') {
      const activeSelection = await db
        .prepare(
          `SELECT request_id FROM request_selections
           WHERE request_id = ? AND status IN ('selected', 'completed')`,
        )
        .bind(input.requestId)
        .first<{ request_id: string }>();
      if (activeSelection) {
        return Response.json(
          {
            error: 'Сначала отмените выбранного исполнителя в карточке заявки',
          },
          { status: 409 },
        );
      }
    }
    const result = await db
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
