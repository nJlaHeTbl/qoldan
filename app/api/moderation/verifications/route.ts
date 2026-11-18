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
  moderationVerificationInput,
  parseJson,
} from '@/lib/server/marketplace-schemas';

export async function PATCH(request: Request) {
  const viewer = await getViewer(request);
  if (!viewer) return unauthorized();
  if (!canModerate(viewer)) return forbidden();
  try {
    const input = await parseJson(request, moderationVerificationInput);
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const db = getMarketplaceDb();
    const verification = await db
      .prepare(
        `SELECT id, owner_id, organization_name, status
         FROM business_verifications
         WHERE id = ?`,
      )
      .bind(input.verificationId)
      .first<{
        id: string;
        owner_id: string;
        organization_name: string;
        status: string;
      }>();
    if (!verification) {
      return Response.json({ error: 'Заявка не найдена' }, { status: 404 });
    }
    if (verification.owner_id === viewer.id) {
      return Response.json(
        { error: 'Модератор не может проверить собственный бизнес-профиль' },
        { status: 409 },
      );
    }
    if (verification.status !== 'pending') {
      return Response.json(
        { error: 'По этой заявке уже принято решение' },
        { status: 409 },
      );
    }
    const reviewedAt = Date.now();
    const updated = await db
      .prepare(
        `UPDATE business_verifications
         SET status = ?, review_note = ?, reviewed_by = ?,
             reviewed_at = ?, updated_at = ?
         WHERE id = ? AND status = 'pending'`,
      )
      .bind(
        input.status,
        input.reviewNote,
        viewer.id,
        reviewedAt,
        reviewedAt,
        verification.id,
      )
      .run();
    if (!updated.meta.changes) {
      return Response.json(
        { error: 'Статус заявки уже изменился' },
        { status: 409 },
      );
    }
    return Response.json({
      verification: {
        id: verification.id,
        status: input.status,
        reviewNote: input.reviewNote,
        reviewerName: viewer.displayName,
        reviewedAt,
      },
    });
  } catch (error) {
    try {
      return invalidInput(error);
    } catch {
      return serverError(error);
    }
  }
}
