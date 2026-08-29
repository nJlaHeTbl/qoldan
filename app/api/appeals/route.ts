import {
  ensureMarketplaceSchema,
  getMarketplaceDb,
  getViewer,
  serverError,
  unauthorized,
  upsertViewer,
} from '@/lib/server/marketplace-db';
import {
  appealInput,
  invalidInput,
  parseJson,
} from '@/lib/server/marketplace-schemas';

export async function POST(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  try {
    const input = await parseJson(request, appealInput);
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const db = getMarketplaceDb();
    const action = await db
      .prepare(
        `SELECT id, target_title, action
           FROM moderation_actions
           WHERE id = ? AND target_owner_id = ?
             AND action IN ('warn', 'restrict')`,
      )
      .bind(input.moderationActionId, viewer.id)
      .first<{
        id: string;
        target_title: string;
        action: 'warn' | 'restrict';
      }>();
    if (!action) {
      return Response.json(
        { error: 'Решение для апелляции не найдено' },
        { status: 404 },
      );
    }
    const duplicate = await db
      .prepare('SELECT id FROM appeals WHERE moderation_action_id = ?')
      .bind(action.id)
      .first<{ id: string }>();
    if (duplicate) {
      return Response.json(
        { error: 'Апелляция по этому решению уже отправлена' },
        { status: 409 },
      );
    }
    const id = crypto.randomUUID();
    const now = Date.now();
    await db
      .prepare(
        `INSERT INTO appeals
         (id, moderation_action_id, owner_id, message, status, created_at)
         VALUES (?, ?, ?, ?, 'new', ?)`,
      )
      .bind(id, action.id, viewer.id, input.message, now)
      .run();
    return Response.json(
      {
        appeal: {
          id,
          moderationActionId: action.id,
          targetTitle: action.target_title,
          action: action.action,
          message: input.message,
          status: 'new',
          resolutionNote: '',
          createdAt: now,
          reviewedAt: null,
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
