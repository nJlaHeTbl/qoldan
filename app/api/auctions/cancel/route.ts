import { z } from 'zod';
import {
  ensureMarketplaceSchema,
  getMarketplaceDb,
  getViewer,
  serverError,
  unauthorized,
} from '@/lib/server/marketplace-db';
import { invalidInput, parseJson } from '@/lib/server/marketplace-schemas';

const input = z.object({ auctionId: z.uuid() }).strict();

// A seller may withdraw an auction only while nobody has bid. After the first bid the terms are
// locked (also enforced by database triggers), so a seller cannot back out of a running auction.
export async function POST(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  try {
    const { auctionId } = await parseJson(request, input);
    await ensureMarketplaceSchema();
    const db = getMarketplaceDb();
    const now = Date.now();
    const result = await db
      .prepare(
        `UPDATE auctions SET status = 'cancelled', result = NULL, settled_at = ?1, updated_at = ?1
         WHERE id = ?2 AND seller_id = ?3 AND status = 'active' AND bid_count = 0 AND ends_at > ?1`,
      )
      .bind(now, auctionId, viewer.id)
      .run();
    if (!result.meta.changes) {
      const exists = await db
        .prepare('SELECT seller_id, bid_count, status FROM auctions WHERE id = ?')
        .bind(auctionId)
        .first<{ seller_id: string; bid_count: number; status: string }>();
      if (!exists || exists.seller_id !== viewer.id) {
        return Response.json({ error: 'Торги не найдены' }, { status: 404 });
      }
      return Response.json(
        {
          error:
            exists.bid_count > 0
              ? 'Торги нельзя отменить: уже есть ставки'
              : 'Торги уже завершены или отменены',
        },
        { status: 409 },
      );
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
