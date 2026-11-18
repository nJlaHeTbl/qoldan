import { z } from 'zod';
import {
  AUCTION_BIDS_PER_HOUR,
  AUCTION_MAX_AMOUNT,
  AUCTION_MAX_EXTENSIONS,
  AUCTION_MAX_JUMP_FACTOR,
  AUCTION_SNIPE_WINDOW_MS,
  auctionPhase,
} from '@/lib/auction';
import {
  AUCTION_COLUMNS,
  settleDueAuctions,
  toAuctionSummary,
  type AuctionRow,
} from '@/lib/server/auctions';
import {
  ensureMarketplaceSchema,
  getMarketplaceDb,
  getViewer,
  serverError,
  unauthorized,
  upsertViewer,
} from '@/lib/server/marketplace-db';
import { invalidInput, parseJson } from '@/lib/server/marketplace-schemas';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'cache-control': 'private, no-store' };
const HOUR_MS = 60 * 60 * 1000;

const bidInput = z
  .object({
    auctionId: z.uuid(),
    amount: z.number().int().min(1).max(AUCTION_MAX_AMOUNT),
    // Explicit confirmation of the auction rules and of being at least 18 years old.
    acceptRules: z.literal(true, {
      error: 'Подтвердите, что вам есть 18 лет и вы принимаете правила торгов',
    }),
  })
  .strict();

type BidRow = { bidder_id: string; amount: number; created_at: number };

function viewerState(row: AuctionRow, viewerId: string, now: number) {
  const phase = auctionPhase(
    { status: row.status, startsAt: row.starts_at, endsAt: row.ends_at },
    now,
  );
  return {
    isSeller: row.seller_id === viewerId,
    youLead: phase !== 'cancelled' && row.leader_id === viewerId,
    youWon: row.status === 'ended' && row.winner_id === viewerId,
  };
}

export async function GET(request: Request) {
  const viewer = getViewer(request);
  const url = new URL(request.url);
  try {
    await ensureMarketplaceSchema();
    const db = getMarketplaceDb();
    const now = Date.now();
    await settleDueAuctions(db, now);

    if (url.searchParams.get('mine') === '1') {
      if (!viewer) return unauthorized();
      const result = await db
        .prepare(
          `SELECT ${AUCTION_COLUMNS}, listings.title, listings.image_url,
                  EXISTS (SELECT 1 FROM bids WHERE bids.auction_id = auctions.id AND bids.bidder_id = ?1) AS i_bid
           FROM auctions JOIN listings ON listings.id = auctions.listing_id
           WHERE auctions.seller_id = ?1
              OR EXISTS (SELECT 1 FROM bids WHERE bids.auction_id = auctions.id AND bids.bidder_id = ?1)
           ORDER BY (auctions.status = 'active') DESC, auctions.ends_at DESC
           LIMIT 100`,
        )
        .bind(viewer.id)
        .all<AuctionRow & { title: string; image_url: string; i_bid: number }>();
      return Response.json(
        {
          serverNow: now,
          auctions: result.results.map((row) => ({
            ...toAuctionSummary(row, now),
            title: row.title,
            image: row.image_url,
            ...viewerState(row, viewer.id, now),
            role: row.seller_id === viewer.id ? 'seller' : 'bidder',
            // Bid on it but somebody else leads: the "you were outbid" notice, shown while it is running.
            outbid:
              row.status === 'active' &&
              Boolean(row.i_bid) &&
              row.leader_id !== viewer.id,
          })),
        },
        { headers: NO_STORE },
      );
    }

    const listingId = z.uuid().safeParse(url.searchParams.get('listingId'));
    if (!listingId.success) {
      return Response.json({ error: 'Укажите объявление' }, { status: 400 });
    }
    const row = await db
      .prepare(
        `SELECT ${AUCTION_COLUMNS} FROM auctions WHERE auctions.listing_id = ?`,
      )
      .bind(listingId.data)
      .first<AuctionRow>();
    if (!row) return Response.json({ auction: null }, { headers: NO_STORE });
    const bids = await db
      .prepare(
        `SELECT bidder_id, amount, created_at FROM bids
         WHERE auction_id = ? ORDER BY amount ASC LIMIT 200`,
      )
      .bind(row.id)
      .all<BidRow>();
    // Bidders stay anonymous ("Участник 1…") so that nobody can pressure or collude with them.
    const labels = new Map<string, number>();
    for (const bid of [...bids.results].sort((a, b) => a.created_at - b.created_at)) {
      if (!labels.has(bid.bidder_id)) labels.set(bid.bidder_id, labels.size + 1);
    }
    return Response.json(
      {
        serverNow: now,
        auction: toAuctionSummary(row, now),
        viewer: viewer ? viewerState(row, viewer.id, now) : null,
        bids: bids.results
          .slice(-30)
          .reverse()
          .map((bid) => ({
            amount: Number(bid.amount),
            createdAt: Number(bid.created_at),
            bidder: `Участник ${labels.get(bid.bidder_id)}`,
            mine: viewer ? bid.bidder_id === viewer.id : false,
          })),
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  try {
    const input = await parseJson(request, bidInput);
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const db = getMarketplaceDb();
    const now = Date.now();
    await settleDueAuctions(db, now);

    const reload = () =>
      db
        .prepare(`SELECT ${AUCTION_COLUMNS} FROM auctions WHERE auctions.id = ?`)
        .bind(input.auctionId)
        .first<AuctionRow>();
    const reject = (row: AuctionRow, error: string, status = 409) =>
      Response.json(
        {
          error,
          auction: toAuctionSummary(row, now),
          viewer: viewerState(row, viewer.id, now),
        },
        { status, headers: NO_STORE },
      );

    const before = await reload();
    if (!before) {
      return Response.json({ error: 'Торги не найдены' }, { status: 404 });
    }
    const explain = (row: AuctionRow) => {
      const summary = toAuctionSummary(row, now);
      if (row.seller_id === viewer.id) {
        return 'Нельзя делать ставки в собственных торгах';
      }
      if (summary.phase === 'scheduled') return 'Торги ещё не начались';
      if (summary.phase !== 'active') return 'Торги завершены или отменены';
      if (row.status === 'active') {
        // Still open by time, so the listing itself must have been hidden (for example by a moderator).
        return 'Торги приостановлены: объявление скрыто';
      }
      if (row.leader_id === viewer.id) {
        return 'Ваша ставка уже лидирует. Дождитесь, пока её перебьют';
      }
      if (input.amount < summary.nextMinimum) {
        return `Ставка должна быть не меньше ${summary.nextMinimum.toLocaleString('ru-RU')} ₸. Возможно, её только что перебили`;
      }
      if (
        input.amount >
        Math.max(summary.currentBid ?? 0, summary.startPrice) *
          AUCTION_MAX_JUMP_FACTOR
      ) {
        return 'Проверьте сумму: ставка слишком сильно превышает текущую цену';
      }
      return 'Ставку не удалось принять. Обновите страницу и попробуйте ещё раз';
    };
    if (before.seller_id === viewer.id) return reject(before, explain(before), 403);

    let written;
    try {
      written = await db.batch([
        db
          .prepare(
            `INSERT INTO bids (id, auction_id, bidder_id, amount, created_at)
             SELECT ?1, ?2, ?3, ?4, ?5
             WHERE EXISTS (
               SELECT 1 FROM auctions a
               WHERE a.id = ?2 AND a.status = 'active'
                 AND a.starts_at <= ?5 AND a.ends_at > ?5
                 AND a.seller_id != ?3
                 AND EXISTS (SELECT 1 FROM listings l WHERE l.id = a.listing_id AND l.status = 'active')
                 AND (a.leader_id IS NULL OR a.leader_id != ?3)
                 AND ?4 >= COALESCE(a.current_bid + a.min_step, a.start_price)
                 AND ?4 <= MAX(COALESCE(a.current_bid, 0), a.start_price) * ?6
             )
             AND (SELECT COUNT(*) FROM bids WHERE bidder_id = ?3 AND created_at >= ?5 - ?7) < ?8`,
          )
          .bind(
            crypto.randomUUID(),
            input.auctionId,
            viewer.id,
            input.amount,
            now,
            AUCTION_MAX_JUMP_FACTOR,
            HOUR_MS,
            AUCTION_BIDS_PER_HOUR,
          ),
        // Anti-sniping: a bid in the last two minutes pushes the end to "now + 2 minutes" (never earlier).
        db
          .prepare(
            `UPDATE auctions SET
               current_bid = ?1, leader_id = ?2, bid_count = bid_count + 1, updated_at = ?3,
               ends_at = CASE WHEN ends_at - ?3 <= ?4 AND extensions < ?5 THEN ?3 + ?4 ELSE ends_at END,
               extensions = extensions + CASE WHEN ends_at - ?3 <= ?4 AND extensions < ?5 THEN 1 ELSE 0 END
             WHERE id = ?6 AND changes() = 1`,
          )
          .bind(
            input.amount,
            viewer.id,
            now,
            AUCTION_SNIPE_WINDOW_MS,
            AUCTION_MAX_EXTENSIONS,
            input.auctionId,
          ),
      ]);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('UNIQUE constraint failed: bids.auction_id, bids.amount')
      ) {
        const row = (await reload()) ?? before;
        return reject(row, 'Такую ставку уже сделали. Предложите больше');
      }
      throw error;
    }
    if (!written[0].meta.changes) {
      const row = (await reload()) ?? before;
      const hourly = await db
        .prepare(
          `SELECT COUNT(*) AS n FROM bids WHERE bidder_id = ? AND created_at >= ?`,
        )
        .bind(viewer.id, now - HOUR_MS)
        .first<{ n: number }>();
      if (Number(hourly?.n) >= AUCTION_BIDS_PER_HOUR) {
        console.warn(
          JSON.stringify({ event: 'bid_rate_limited', viewerId: viewer.id }),
        );
        return reject(row, 'Слишком много ставок за час. Попробуйте позже', 429);
      }
      return reject(row, explain(row));
    }
    const row = (await reload()) ?? before;
    return Response.json(
      {
        auction: toAuctionSummary(row, now),
        viewer: viewerState(row, viewer.id, now),
        bid: { amount: input.amount },
      },
      { status: 201, headers: NO_STORE },
    );
  } catch (error) {
    try {
      return invalidInput(error);
    } catch {
      return serverError(error);
    }
  }
}
