import {
  canModerate,
  ensureMarketplaceSchema,
  forbidden,
  getMarketplaceDb,
  getViewer,
  serverError,
  unauthorized,
  upsertViewer,
} from '@/lib/server/marketplace-db';
import {
  invalidInput,
  moderationActionInput,
  parseJson,
} from '@/lib/server/marketplace-schemas';

export const dynamic = 'force-dynamic';

type TargetRow = {
  id: string;
  owner_id: string;
  title: string;
  status: string;
  owner_name: string;
};

export async function POST(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  if (!canModerate(viewer)) return forbidden();
  try {
    const input = await parseJson(request, moderationActionInput);
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const db = getMarketplaceDb();
    const table = input.targetType === 'listing' ? 'listings' : 'requests';
    const target = await db
      .prepare(
        `SELECT target.id, target.owner_id, target.title, target.status,
                users.display_name AS owner_name
           FROM ${table} target
           JOIN users ON users.id = target.owner_id
           WHERE target.id = ?`,
      )
      .bind(input.targetId)
      .first<TargetRow>();
    if (!target) {
      return Response.json({ error: 'Публикация не найдена' }, { status: 404 });
    }
    if (input.reportId) {
      const report = await db
        .prepare(
          'SELECT id FROM reports WHERE id = ? AND target_type = ? AND target_id = ?',
        )
        .bind(input.reportId, input.targetType, input.targetId)
        .first<{ id: string }>();
      if (!report) {
        return Response.json(
          { error: 'Жалоба не относится к этой публикации' },
          { status: 409 },
        );
      }
    }

    const activeStatus = input.targetType === 'listing' ? 'active' : 'open';
    const restrictedStatus =
      input.targetType === 'listing' ? 'paused' : 'closed';
    if (input.action === 'restrict' && target.status === restrictedStatus) {
      return Response.json({ error: 'Публикация уже скрыта' }, { status: 409 });
    }
    if (input.action === 'restore' && target.status === activeStatus) {
      return Response.json(
        { error: 'Публикация уже активна' },
        { status: 409 },
      );
    }

    const actionId = crypto.randomUUID();
    const now = Date.now();
    const statements: D1PreparedStatement[] = [];
    let targetStatus = target.status;
    if (input.action === 'restrict' || input.action === 'restore') {
      targetStatus =
        input.action === 'restrict' ? restrictedStatus : activeStatus;
      statements.push(
        db
          .prepare(
            `UPDATE ${table} SET status = ?, updated_at = ? WHERE id = ?`,
          )
          .bind(targetStatus, now, target.id),
      );
    }
    statements.push(
      db
        .prepare(
          `INSERT INTO moderation_actions
           (id, report_id, moderator_id, target_type, target_id,
            target_owner_id, target_title, action, note, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          actionId,
          input.reportId || null,
          viewer.id,
          input.targetType,
          target.id,
          target.owner_id,
          target.title,
          input.action,
          input.note,
          now,
        ),
    );
    if (input.reportId) {
      statements.push(
        db
          .prepare(
            `UPDATE reports
             SET status = CASE WHEN status = 'new' THEN 'reviewing' ELSE status END,
                 reviewed_by = ?, reviewed_at = ?
             WHERE id = ?`,
          )
          .bind(viewer.id, now, input.reportId),
      );
    }
    await db.batch(statements);
    return Response.json(
      {
        action: {
          id: actionId,
          reportId: input.reportId || null,
          moderatorName: viewer.displayName,
          targetType: input.targetType,
          targetId: target.id,
          targetOwner: target.owner_name,
          targetTitle: target.title,
          action: input.action,
          note: input.note,
          createdAt: now,
        },
        targetStatus,
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
