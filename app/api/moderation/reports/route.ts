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
  moderationReportInput,
  parseJson,
} from '@/lib/server/marketplace-schemas';

export const dynamic = 'force-dynamic';

type ModerationReportRow = {
  id: string;
  target_type: 'listing' | 'request';
  target_id: string;
  reason: string;
  description: string | null;
  status: 'new' | 'reviewing' | 'closed';
  review_note: string | null;
  created_at: number;
  reviewed_at: number | null;
  reporter_name: string;
  reviewer_name: string | null;
  target_title: string | null;
  target_place: string | null;
  target_region: string | null;
  target_owner: string | null;
  target_status: string | null;
};

function getModerator(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return { viewer: null, response: unauthorized() };
  if (!canModerate(viewer)) return { viewer: null, response: forbidden() };
  return { viewer, response: null };
}

export async function GET(request: Request) {
  const moderator = getModerator(request);
  if (!moderator.viewer) return moderator.response;
  try {
    await ensureMarketplaceSchema();
    await upsertViewer(moderator.viewer);
    const result = await getMarketplaceDb()
      .prepare(
        `SELECT reports.id, reports.target_type, reports.target_id,
                reports.reason, reports.description, reports.status,
                reports.review_note, reports.created_at, reports.reviewed_at,
                reporters.display_name AS reporter_name,
                reviewers.display_name AS reviewer_name,
                COALESCE(listings.title, requests.title) AS target_title,
                COALESCE(listings.location, requests.place) AS target_place,
                COALESCE(listings.region, requests.region) AS target_region,
                COALESCE(listing_owners.display_name, request_owners.display_name)
                  AS target_owner,
                COALESCE(listings.status, requests.status) AS target_status
           FROM reports
           JOIN users reporters ON reporters.id = reports.owner_id
           LEFT JOIN users reviewers ON reviewers.id = reports.reviewed_by
           LEFT JOIN listings
             ON reports.target_type = 'listing' AND listings.id = reports.target_id
           LEFT JOIN requests
             ON reports.target_type = 'request' AND requests.id = reports.target_id
           LEFT JOIN users listing_owners ON listing_owners.id = listings.owner_id
           LEFT JOIN users request_owners ON request_owners.id = requests.owner_id
           ORDER BY CASE reports.status
             WHEN 'new' THEN 0
             WHEN 'reviewing' THEN 1
             ELSE 2
           END, reports.created_at DESC
           LIMIT 200`,
      )
      .all<ModerationReportRow>();
    return Response.json({
      reports: result.results.map((row) => ({
        id: row.id,
        targetType: row.target_type,
        targetId: row.target_id,
        targetTitle: row.target_title || 'Публикация удалена',
        targetPlace: row.target_place || '',
        targetRegion: row.target_region || '',
        targetOwner: row.target_owner || 'Автор не найден',
        targetStatus: row.target_status || 'deleted',
        reason: row.reason,
        description: row.description || '',
        status: row.status,
        reviewNote: row.review_note || '',
        reporterName: row.reporter_name,
        reviewerName: row.reviewer_name || '',
        createdAt: Number(row.created_at),
        reviewedAt: row.reviewed_at ? Number(row.reviewed_at) : null,
      })),
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(request: Request) {
  const moderator = getModerator(request);
  if (!moderator.viewer) return moderator.response;
  try {
    const input = await parseJson(request, moderationReportInput);
    await ensureMarketplaceSchema();
    await upsertViewer(moderator.viewer);
    const db = getMarketplaceDb();
    const existing = await db
      .prepare('SELECT id FROM reports WHERE id = ?')
      .bind(input.reportId)
      .first<{ id: string }>();
    if (!existing) {
      return Response.json({ error: 'Жалоба не найдена' }, { status: 404 });
    }
    const reviewedAt = Date.now();
    await db
      .prepare(
        `UPDATE reports
         SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = ?
         WHERE id = ?`,
      )
      .bind(
        input.status,
        input.reviewNote || null,
        moderator.viewer.id,
        reviewedAt,
        input.reportId,
      )
      .run();
    return Response.json({
      report: {
        id: input.reportId,
        status: input.status,
        reviewNote: input.reviewNote,
        reviewerName: moderator.viewer.displayName,
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
