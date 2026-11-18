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
  moderationAppealInput,
  parseJson,
} from '@/lib/server/marketplace-schemas';

export const dynamic = 'force-dynamic';

type AppealRow = {
  id: string;
  moderation_action_id: string;
  status: 'new' | 'reviewing' | 'approved' | 'rejected';
  report_id: string | null;
  action: 'warn' | 'restrict' | 'restore';
  target_type: 'listing' | 'request';
  target_id: string;
  target_owner_id: string;
  target_owner: string;
  target_title: string;
};

export async function PATCH(request: Request) {
  const viewer = await getViewer(request);
  if (!viewer) return unauthorized();
  if (!canModerate(viewer)) return forbidden();
  try {
    const input = await parseJson(request, moderationAppealInput);
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const db = getMarketplaceDb();
    const appeal = await db
      .prepare(
        `SELECT appeals.id, appeals.moderation_action_id, appeals.status,
                moderation_actions.report_id, moderation_actions.action,
                moderation_actions.target_type, moderation_actions.target_id,
                moderation_actions.target_owner_id,
                moderation_actions.target_title,
                target_owners.display_name AS target_owner
           FROM appeals
           JOIN moderation_actions
             ON moderation_actions.id = appeals.moderation_action_id
           JOIN users target_owners
             ON target_owners.id = moderation_actions.target_owner_id
           WHERE appeals.id = ?`,
      )
      .bind(input.appealId)
      .first<AppealRow>();
    if (!appeal) {
      return Response.json({ error: 'Апелляция не найдена' }, { status: 404 });
    }
    if (appeal.status === 'approved' || appeal.status === 'rejected') {
      return Response.json(
        { error: 'По этой апелляции уже принято итоговое решение' },
        { status: 409 },
      );
    }

    const now = Date.now();
    const statements: D1PreparedStatement[] = [
      db
        .prepare(
          `UPDATE appeals
           SET status = ?, resolution_note = ?, reviewed_by = ?, reviewed_at = ?
           WHERE id = ?`,
        )
        .bind(
          input.status,
          input.resolutionNote || null,
          viewer.id,
          now,
          appeal.id,
        ),
    ];
    let targetStatus = 'unchanged';
    let restorationAction = null;
    if (
      input.status === 'approved' &&
      appeal.action === 'restrict' &&
      (appeal.target_type === 'listing' || appeal.target_type === 'request')
    ) {
      const table = appeal.target_type === 'listing' ? 'listings' : 'requests';
      const activeStatus = appeal.target_type === 'listing' ? 'active' : 'open';
      const target = await db
        .prepare(`SELECT status FROM ${table} WHERE id = ?`)
        .bind(appeal.target_id)
        .first<{ status: string }>();
      if (!target) {
        targetStatus = 'deleted';
      } else if (target.status !== activeStatus) {
        targetStatus = activeStatus;
        const actionId = crypto.randomUUID();
        const actionNote = `Апелляция удовлетворена: ${input.resolutionNote}`;
        statements.push(
          db
            .prepare(
              `UPDATE ${table} SET status = ?, updated_at = ? WHERE id = ?`,
            )
            .bind(activeStatus, now, appeal.target_id),
          db
            .prepare(
              `INSERT INTO moderation_actions
               (id, report_id, moderator_id, target_type, target_id,
                target_owner_id, target_title, action, note, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, 'restore', ?, ?)`,
            )
            .bind(
              actionId,
              appeal.report_id,
              viewer.id,
              appeal.target_type,
              appeal.target_id,
              appeal.target_owner_id,
              appeal.target_title,
              actionNote,
              now,
            ),
        );
        restorationAction = {
          id: actionId,
          reportId: appeal.report_id,
          moderatorName: viewer.displayName,
          targetType: appeal.target_type,
          targetId: appeal.target_id,
          targetOwner: appeal.target_owner,
          targetTitle: appeal.target_title,
          action: 'restore' as const,
          note: actionNote,
          createdAt: now,
        };
      } else {
        targetStatus = activeStatus;
      }
    }
    await db.batch(statements);
    return Response.json({
      appeal: {
        id: appeal.id,
        status: input.status,
        resolutionNote: input.resolutionNote,
        reviewerName: viewer.displayName,
        reviewedAt: now,
      },
      restorationAction,
      targetStatus,
    });
  } catch (error) {
    try {
      return invalidInput(error);
    } catch {
      return serverError(error);
    }
  }
}
