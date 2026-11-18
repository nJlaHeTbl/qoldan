import {
  auctionPhase,
  nextMinimumBid,
  type AuctionSummary,
} from '@/lib/auction';

export type AuctionRow = {
  id: string;
  listing_id: string;
  seller_id: string;
  start_price: number;
  min_step: number;
  reserve_price: number | null;
  starts_at: number;
  ends_at: number;
  extensions: number;
  status: string;
  current_bid: number | null;
  bid_count: number;
  leader_id: string | null;
  result: string | null;
  winner_id: string | null;
};

export const AUCTION_COLUMNS = `auctions.id, auctions.listing_id, auctions.seller_id, auctions.start_price,
  auctions.min_step, auctions.reserve_price, auctions.starts_at, auctions.ends_at, auctions.extensions,
  auctions.status, auctions.current_bid, auctions.bid_count, auctions.leader_id, auctions.result,
  auctions.winner_id`;

/**
 * Finalises every auction whose time is up. One idempotent statement, safe to run from any request:
 * the winner is the highest bidder, but only if the hidden reserve price was reached.
 */
export async function settleDueAuctions(db: D1Database, now = Date.now()) {
  await db
    .prepare(
      `UPDATE auctions SET
         status = 'ended',
         result = CASE
           WHEN current_bid IS NULL THEN 'no_bids'
           WHEN reserve_price IS NOT NULL AND current_bid < reserve_price THEN 'reserve_not_met'
           ELSE 'sold' END,
         winner_id = CASE
           WHEN current_bid IS NOT NULL AND (reserve_price IS NULL OR current_bid >= reserve_price)
           THEN leader_id END,
         settled_at = ?1, updated_at = ?1
       WHERE status = 'active' AND ends_at <= ?1`,
    )
    .bind(now)
    .run();
}

/** Public view of an auction. The reserve amount and the bidders' identities are never included. */
export function toAuctionSummary(row: AuctionRow, now: number): AuctionSummary {
  const base = {
    startPrice: Number(row.start_price),
    minStep: Number(row.min_step),
    currentBid: row.current_bid === null ? null : Number(row.current_bid),
  };
  return {
    id: row.id,
    listingId: row.listing_id,
    ...base,
    nextMinimum: nextMinimumBid(base),
    bidCount: Number(row.bid_count),
    startsAt: Number(row.starts_at),
    endsAt: Number(row.ends_at),
    extensions: Number(row.extensions),
    phase: auctionPhase(
      { status: row.status, startsAt: Number(row.starts_at), endsAt: Number(row.ends_at) },
      now,
    ),
    result:
      row.status === 'ended' && row.result
        ? (row.result as AuctionSummary['result'])
        : null,
    hasReserve: row.reserve_price !== null,
  };
}
