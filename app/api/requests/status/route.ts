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
    if (input.status === 'open') {
      // A moderator's restriction is also stored as 'closed'; only a moderator or an
      // approved appeal (both write a 'restore' action) may lift it.
      const restricted = await db
        .prepare(
          `SELECT 1 AS locked FROM requests
           WHERE id = ? AND owner_id = ?
             AND (SELECT action FROM moderation_actions
                  WHERE target_type = 'request' AND target_id = requests.id
                    AND action IN ('restrict', 'restore')
                  ORDER BY created_at DESC, rowid DESC LIMIT 1) = 'restrict'`,
        )
        .bind(input.requestId, viewer.id)
        .first();
      if (restricted) {
        return Response.json(
          {
            error:
              'Заявка скрыта модератором. Её нельзя открыть самостоятельно — подайте апелляцию.',
          },
          { status: 403 },
        );
      }
    }
    const result = await db
      .prepare(
        `UPDATE requests
         SET status = ?, updated_at = ?
         WHERE id = ? AND owner_id = ?
           AND (? != 'open' OR (SELECT action FROM moderation_actions
                WHERE target_type = 'request' AND target_id = requests.id
                  AND action IN ('restrict', 'restore')
                ORDER BY created_at DESC, rowid DESC LIMIT 1) IS NOT 'restrict')
           AND (? != 'open' OR NOT EXISTS (
             SELECT 1 FROM request_selections
             WHERE request_id = requests.id AND status IN ('selected', 'completed')
           ))`,
      )
      .bind(input.status, Date.now(), input.requestId, viewer.id, input.status, input.status)
      .run();
    if (!result.meta.changes) {
      return Response.json(
        { error: 'Заявка недоступна или её статус изменился. Обновите страницу.' },
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
