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
  listingStatusInput,
  parseJson,
} from '@/lib/server/marketplace-schemas';

export async function POST(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  try {
    const input = await parseJson(request, listingStatusInput);
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    if (input.status === 'active') {
      // A moderator's restriction is also stored as 'paused'; only a moderator or an
      // approved appeal (both write a 'restore' action) may lift it.
      const restricted = await getMarketplaceDb()
        .prepare(
          `SELECT 1 AS locked FROM listings
           WHERE id = ? AND owner_id = ?
             AND (SELECT action FROM moderation_actions
                  WHERE target_type = 'listing' AND target_id = listings.id
                    AND action IN ('restrict', 'restore')
                  ORDER BY created_at DESC, rowid DESC LIMIT 1) = 'restrict'`,
        )
        .bind(input.listingId, viewer.id)
        .first();
      if (restricted) {
        return Response.json(
          {
            error:
              'Объявление скрыто модератором. Его нельзя опубликовать самостоятельно — подайте апелляцию.',
          },
          { status: 403 },
        );
      }
    }
    const result = await getMarketplaceDb()
      .prepare(
        `UPDATE listings
         SET status = ?, updated_at = MAX(updated_at + 1, ?)
         WHERE id = ? AND owner_id = ? AND status IN ('active', 'paused')
           AND (? != 'active' OR (SELECT action FROM moderation_actions
                WHERE target_type = 'listing' AND target_id = listings.id
                  AND action IN ('restrict', 'restore')
                ORDER BY created_at DESC, rowid DESC LIMIT 1) IS NOT 'restrict')
           AND (?6 = 'active' OR NOT EXISTS (
                SELECT 1 FROM auctions WHERE listing_id = listings.id
                  AND status = 'active' AND bid_count > 0 AND ends_at > ?7))`,
      )
      .bind(input.status, Date.now(), input.listingId, viewer.id, input.status, input.status, Date.now())
      .run();
    if (!result.meta.changes) {
      const bidding = await getMarketplaceDb()
        .prepare(
          `SELECT 1 AS locked FROM auctions JOIN listings ON listings.id = auctions.listing_id
           WHERE auctions.listing_id = ? AND listings.owner_id = ? AND auctions.status = 'active'
             AND auctions.bid_count > 0 AND auctions.ends_at > ?`,
        )
        .bind(input.listingId, viewer.id, Date.now())
        .first();
      if (bidding) {
        return Response.json(
          { error: 'Нельзя скрыть объявление, пока идут торги со ставками.' },
          { status: 409 },
        );
      }
      return Response.json(
        { error: 'Объявление не найдено или принадлежит другому пользователю' },
        { status: 404 },
      );
    }
    return Response.json({ listingId: input.listingId, status: input.status });
  } catch (error) {
    try {
      return invalidInput(error);
    } catch {
      return serverError(error);
    }
  }
}
