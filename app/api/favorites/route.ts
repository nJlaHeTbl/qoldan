import {
  ensureMarketplaceSchema,
  getMarketplaceDb,
  getViewer,
  serverError,
  unauthorized,
  upsertViewer,
} from '@/lib/server/marketplace-db';
import {
  favoriteInput,
  invalidInput,
  parseJson,
} from '@/lib/server/marketplace-schemas';

export async function POST(request: Request) {
  const viewer = await getViewer(request);
  if (!viewer) return unauthorized();
  try {
    const input = await parseJson(request, favoriteInput);
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const db = getMarketplaceDb();
    if (input.active) {
      await db
        .prepare(
          `INSERT INTO favorites (owner_id, listing_id, created_at, price_at_save)
           VALUES (?, ?, ?, (SELECT price FROM listings WHERE id = ?))
           ON CONFLICT(owner_id, listing_id) DO NOTHING`,
        )
        .bind(viewer.id, input.listingId, Date.now(), input.listingId)
        .run();
    } else {
      await db
        .prepare('DELETE FROM favorites WHERE owner_id = ? AND listing_id = ?')
        .bind(viewer.id, input.listingId)
        .run();
    }
    return Response.json({ ok: true });
  } catch (error) {
    try {
      return invalidInput(error);
    } catch {
      return serverError(error);
    }
  }
}
