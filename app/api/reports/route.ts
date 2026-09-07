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
  invalidInput,
  parseJson,
  reportInput,
} from '@/lib/server/marketplace-schemas';

export async function POST(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  try {
    const input = await parseJson(request, reportInput);
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const db = getMarketplaceDb();
    const table = input.targetType === 'listing' ? 'listings' : 'requests';
    const target = await db
      .prepare(`SELECT owner_id FROM ${table} WHERE id = ?`)
      .bind(input.targetId)
      .first<{ owner_id: string }>();
    if (!target) {
      return Response.json({ error: 'Публикация не найдена' }, { status: 404 });
    }
    if (target.owner_id === viewer.id) {
      return Response.json(
        { error: 'Нельзя отправить жалобу на собственную публикацию' },
        { status: 409 },
      );
    }
    const duplicate = await db
      .prepare(
        `SELECT id FROM reports
         WHERE owner_id = ? AND target_type = ? AND target_id = ?
           AND status IN ('new', 'reviewing')
         LIMIT 1`,
      )
      .bind(viewer.id, input.targetType, input.targetId)
      .first<{ id: string }>();
    if (duplicate) {
      return Response.json(
        { error: 'Вы уже сообщили об этой публикации' },
        { status: 409 },
      );
    }
    const dayMs = 24 * 60 * 60 * 1000;
    const limited = await getRateLimitResponse(
      db
        .prepare(
          `SELECT created_at FROM reports
           WHERE owner_id = ? AND created_at >= ?
           ORDER BY created_at DESC
           LIMIT 1 OFFSET 19`,
        )
        .bind(viewer.id, Date.now() - dayMs),
      dayMs,
      'Можно отправить до 20 жалоб в сутки. Попробуйте позже.',
    );
    if (limited) return limited;
    const id = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO reports
         (id, owner_id, target_type, target_id, reason, description,
          status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'new', ?)`,
      )
      .bind(
        id,
        viewer.id,
        input.targetType,
        input.targetId,
        input.reason,
        input.description || null,
        Date.now(),
      )
      .run();
    return Response.json({ report: { id, status: 'new' } }, { status: 201 });
  } catch (error) {
    try {
      return invalidInput(error);
    } catch {
      return serverError(error);
    }
  }
}
