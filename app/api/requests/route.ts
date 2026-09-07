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
  requestInput,
} from '@/lib/server/marketplace-schemas';

export async function POST(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  try {
    const input = await parseJson(request, requestInput);
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const db = getMarketplaceDb();
    const hourMs = 60 * 60 * 1000;
    const limited = await getRateLimitResponse(
      db
        .prepare(
          `SELECT created_at FROM requests
           WHERE owner_id = ? AND created_at >= ?
           ORDER BY created_at DESC
           LIMIT 1 OFFSET 9`,
        )
        .bind(viewer.id, Date.now() - hourMs),
      hourMs,
      'Можно создать до 10 заявок в час. Попробуйте немного позже.',
    );
    if (limited) return limited;
    const id = crypto.randomUUID();
    const now = Date.now();
    await db
      .prepare(
        `INSERT INTO requests
         (id, owner_id, title, place, when_text, budget, kind, region,
          status, response_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', 0, ?, ?)`,
      )
      .bind(
        id,
        viewer.id,
        input.title,
        input.place,
        input.when,
        input.budget,
        input.kind,
        input.region,
        now,
        now,
      )
      .run();
    return Response.json(
      {
        request: {
          id,
          title: input.title,
          place: input.place,
          when: input.when,
          budget: input.budget,
          responses: 0,
          kind: input.kind,
          region: input.region,
          owner: viewer.displayName,
          status: 'open',
          mine: true,
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
