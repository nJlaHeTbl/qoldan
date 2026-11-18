import {
  ensureMarketplaceSchema,
  getMarketplaceDb,
  getViewer,
  serverError,
  unauthorized,
  upsertViewer,
} from '@/lib/server/marketplace-db';
import {
  businessVerificationInput,
  invalidInput,
  parseJson,
} from '@/lib/server/marketplace-schemas';

export async function POST(request: Request) {
  const viewer = await getViewer(request);
  if (!viewer) return unauthorized();
  try {
    const input = await parseJson(request, businessVerificationInput);
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const db = getMarketplaceDb();
    const existing = await db
      .prepare(
        `SELECT id, status
         FROM business_verifications
         WHERE owner_id = ?`,
      )
      .bind(viewer.id)
      .first<{ id: string; status: 'pending' | 'verified' | 'rejected' }>();
    if (existing?.status === 'pending') {
      return Response.json(
        { error: 'Заявка уже находится на проверке' },
        { status: 409 },
      );
    }
    if (existing?.status === 'verified') {
      return Response.json(
        { error: 'Бизнес-профиль уже подтверждён' },
        { status: 409 },
      );
    }

    const id = existing?.id || crypto.randomUUID();
    const now = Date.now();
    if (existing) {
      await db
        .prepare(
          `UPDATE business_verifications
           SET profile_type = ?, organization_name = ?, bin = ?, phone = ?,
               region = ?, reference_url = ?, note = ?, status = 'pending',
               review_note = NULL, reviewed_by = NULL, reviewed_at = NULL,
               created_at = ?, updated_at = ?
           WHERE id = ? AND owner_id = ? AND status = 'rejected'`,
        )
        .bind(
          input.profileType,
          input.organizationName,
          input.bin,
          input.phone,
          input.region,
          input.referenceUrl || null,
          input.note || null,
          now,
          now,
          id,
          viewer.id,
        )
        .run();
    } else {
      await db
        .prepare(
          `INSERT INTO business_verifications
           (id, owner_id, profile_type, organization_name, bin, phone,
            region, reference_url, note, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
        )
        .bind(
          id,
          viewer.id,
          input.profileType,
          input.organizationName,
          input.bin,
          input.phone,
          input.region,
          input.referenceUrl || null,
          input.note || null,
          now,
          now,
        )
        .run();
    }

    return Response.json(
      {
        verification: {
          id,
          profileType: input.profileType,
          organizationName: input.organizationName,
          maskedBin: `••••••••${input.bin.slice(-4)}`,
          phone: input.phone,
          region: input.region,
          referenceUrl: input.referenceUrl,
          note: input.note,
          status: 'pending',
          reviewNote: '',
          createdAt: now,
          reviewedAt: null,
        },
      },
      { status: existing ? 200 : 201 },
    );
  } catch (error) {
    try {
      return invalidInput(error);
    } catch {
      return serverError(error);
    }
  }
}
