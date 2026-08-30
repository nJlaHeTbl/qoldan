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

type ModerationActionRow = {
  id: string;
  report_id: string | null;
  target_type: 'listing' | 'request';
  target_id: string;
  target_title: string;
  action: 'warn' | 'restrict' | 'restore';
  note: string;
  created_at: number;
  moderator_name: string;
  target_owner: string;
};

type ModerationAppealRow = {
  id: string;
  moderation_action_id: string;
  owner_name: string;
  target_title: string;
  action: 'warn' | 'restrict';
  message: string;
  status: 'new' | 'reviewing' | 'approved' | 'rejected';
  resolution_note: string | null;
  created_at: number;
  reviewed_at: number | null;
  reviewer_name: string | null;
};

type BusinessVerificationRow = {
  id: string;
  owner_id: string;
  profile_type: 'farm' | 'company' | 'store' | 'service_company';
  organization_name: string;
  bin: string;
  phone: string;
  region: string;
  reference_url: string | null;
  note: string | null;
  status: 'pending' | 'verified' | 'rejected';
  review_note: string | null;
  created_at: number;
  reviewed_at: number | null;
  owner_name: string;
  reviewer_name: string | null;
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
    const db = getMarketplaceDb();
    const [reportResult, actionResult, appealResult, verificationResult] =
      await Promise.all([
        db
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
          .all<ModerationReportRow>(),
        db
          .prepare(
            `SELECT moderation_actions.id, moderation_actions.report_id,
                  moderation_actions.target_type, moderation_actions.target_id,
                  moderation_actions.target_title, moderation_actions.action,
                  moderation_actions.note, moderation_actions.created_at,
                  moderators.display_name AS moderator_name,
                  target_owners.display_name AS target_owner
             FROM moderation_actions
             JOIN users moderators
               ON moderators.id = moderation_actions.moderator_id
             JOIN users target_owners
               ON target_owners.id = moderation_actions.target_owner_id
             ORDER BY moderation_actions.created_at DESC
             LIMIT 200`,
          )
          .all<ModerationActionRow>(),
        db
          .prepare(
            `SELECT appeals.id, appeals.moderation_action_id,
                  owners.display_name AS owner_name,
                  moderation_actions.target_title,
                  moderation_actions.action,
                  appeals.message, appeals.status, appeals.resolution_note,
                  appeals.created_at, appeals.reviewed_at,
                  reviewers.display_name AS reviewer_name
             FROM appeals
             JOIN moderation_actions
               ON moderation_actions.id = appeals.moderation_action_id
             JOIN users owners ON owners.id = appeals.owner_id
             LEFT JOIN users reviewers ON reviewers.id = appeals.reviewed_by
             ORDER BY CASE appeals.status
               WHEN 'new' THEN 0
               WHEN 'reviewing' THEN 1
               ELSE 2
             END, appeals.created_at DESC
             LIMIT 200`,
          )
          .all<ModerationAppealRow>(),
        db
          .prepare(
            `SELECT business_verifications.id,
                  business_verifications.owner_id,
                  business_verifications.profile_type,
                  business_verifications.organization_name,
                  business_verifications.bin,
                  business_verifications.phone,
                  business_verifications.region,
                  business_verifications.reference_url,
                  business_verifications.note,
                  business_verifications.status,
                  business_verifications.review_note,
                  business_verifications.created_at,
                  business_verifications.reviewed_at,
                  owners.display_name AS owner_name,
                  reviewers.display_name AS reviewer_name
           FROM business_verifications
           JOIN users owners ON owners.id = business_verifications.owner_id
           LEFT JOIN users reviewers
             ON reviewers.id = business_verifications.reviewed_by
           ORDER BY CASE business_verifications.status
             WHEN 'pending' THEN 0
             ELSE 1
           END, business_verifications.created_at DESC
           LIMIT 150`,
          )
          .all<BusinessVerificationRow>(),
      ]);
    return Response.json({
      reports: reportResult.results.map((row) => ({
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
      actions: actionResult.results.map((row) => ({
        id: row.id,
        reportId: row.report_id,
        targetType: row.target_type,
        targetId: row.target_id,
        targetTitle: row.target_title,
        targetOwner: row.target_owner,
        action: row.action,
        note: row.note,
        moderatorName: row.moderator_name,
        createdAt: Number(row.created_at),
      })),
      appeals: appealResult.results.map((row) => ({
        id: row.id,
        moderationActionId: row.moderation_action_id,
        ownerName: row.owner_name,
        targetTitle: row.target_title,
        action: row.action,
        message: row.message,
        status: row.status,
        resolutionNote: row.resolution_note || '',
        reviewerName: row.reviewer_name || '',
        createdAt: Number(row.created_at),
        reviewedAt: row.reviewed_at ? Number(row.reviewed_at) : null,
      })),
      verifications: verificationResult.results.map((row) => ({
        id: row.id,
        ownerId: row.owner_id,
        ownerName: row.owner_name,
        profileType: row.profile_type,
        organizationName: row.organization_name,
        bin: row.bin,
        phone: row.phone,
        region: row.region,
        referenceUrl: row.reference_url || '',
        note: row.note || '',
        status: row.status,
        reviewNote: row.review_note || '',
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
