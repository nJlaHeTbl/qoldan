// Shared auction rules. Everything here is enforced again on the server; the client only reads it
// to build the form and to explain the rules.
export const AUCTION_CATEGORIES = [
  'Спецтехника',
  'Инструменты',
  'Электроника',
  'Оборудование',
  'Остатки партий',
  'Стройматериалы',
] as const;

export const AUCTION_DURATIONS_HOURS = [24, 72, 168] as const;
export const AUCTION_MAX_AMOUNT = 1_000_000_000; // tenge
export const AUCTION_MAX_JUMP_FACTOR = 10; // fat-finger guard: a bid above 10x the price is rejected
export const AUCTION_SNIPE_WINDOW_MS = 2 * 60 * 1000;
export const AUCTION_MAX_EXTENSIONS = 10;
export const AUCTION_BIDS_PER_HOUR = 30;
export const AUCTION_MAX_ACTIVE_PER_SELLER = 10;
export const AUCTION_MIN_AGE = 18;

export const isAuctionCategory = (category: string) =>
  (AUCTION_CATEGORIES as readonly string[]).includes(category);

/** Smallest amount the next bid may have. */
export function nextMinimumBid(auction: {
  startPrice: number;
  minStep: number;
  currentBid: number | null;
}) {
  return auction.currentBid === null
    ? auction.startPrice
    : auction.currentBid + auction.minStep;
}

export type AuctionPhase = 'scheduled' | 'active' | 'ended' | 'cancelled';

export function auctionPhase(
  auction: { status: string; startsAt: number; endsAt: number },
  now: number,
): AuctionPhase {
  if (auction.status === 'cancelled') return 'cancelled';
  if (auction.status === 'ended' || now >= auction.endsAt) return 'ended';
  if (now < auction.startsAt) return 'scheduled';
  return 'active';
}

export type AuctionSummary = {
  id: string;
  listingId: string;
  startPrice: number;
  minStep: number;
  currentBid: number | null;
  nextMinimum: number;
  bidCount: number;
  startsAt: number;
  endsAt: number;
  extensions: number;
  phase: AuctionPhase;
  result: 'sold' | 'reserve_not_met' | 'no_bids' | null;
  hasReserve: boolean;
};
