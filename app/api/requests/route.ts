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
  requestInput,
} from '@/lib/server/marketplace-schemas';

export async function POST(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  try {
    const input = await parseJson(request, requestInput);
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const id = crypto.randomUUID();
    const now = Date.now();
    await getMarketplaceDb()
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
