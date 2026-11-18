'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AuctionSummary } from '@/lib/auction';
import { copyFor, dateTime, money, type Lang } from '@/lib/ui-copy';

type Bid = { amount: number; createdAt: number; bidder: string; mine: boolean };
type ViewerState = { isSeller: boolean; youLead: boolean; youWon: boolean } | null;
type Payload = {
  serverNow: number;
  auction: AuctionSummary | null;
  viewer: ViewerState;
  bids: Bid[];
};

function formatLeft(ms: number, lang: Lang) {
  if (ms <= 0) return '0:00';
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const unit = lang === 'en' ? { d: 'd', h: 'h', m: 'min' } : lang === 'kk' ? { d: 'к', h: 'сағ', m: 'мин' } : { d: 'д', h: 'ч', m: 'мин' };
  if (days > 0) return `${days} ${unit.d} ${hours} ${unit.h}`;
  if (hours > 0) return `${hours} ${unit.h} ${String(minutes).padStart(2, '0')} ${unit.m}`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// Live auction block. The server owns every number; the browser only shows them, counts down using
// the server clock offset, and refreshes while the tab is visible.
export default function AuctionPanel({
  listingId,
  signInPath,
  lang = 'ru',
}: {
  listingId: string;
  signInPath: string;
  lang?: Lang;
}) {
  const c = copyFor(lang).auction;
  const [data, setData] = useState<Payload | null>(null);
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [amount, setAmount] = useState('');
  const [rules, setRules] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const typedAmount = useRef(false);

  const apply = useCallback((payload: Payload) => {
    setData(payload);
    if (payload.serverNow) setOffset(payload.serverNow - Date.now());
    if (payload.auction && !typedAmount.current) {
      setAmount(String(payload.auction.nextMinimum));
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/auctions?listingId=${encodeURIComponent(listingId)}`, {
        cache: 'no-store',
      });
      if (response.ok) apply((await response.json()) as Payload);
    } catch {
      /* A failed refresh keeps the last known state on screen. */
    }
  }, [apply, listingId]);

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    return () => clearTimeout(first);
  }, [load]);

  const phase = data?.auction?.phase;
  useEffect(() => {
    if (phase !== 'active' && phase !== 'scheduled') return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const refresh = setInterval(() => {
      if (!document.hidden) void load();
    }, 5000);
    return () => {
      clearInterval(tick);
      clearInterval(refresh);
    };
  }, [phase, load]);

  if (!data || !data.auction) return null;
  const auction = data.auction;
  const viewer = data.viewer;
  const serverTime = now + offset;
  const left = auction.endsAt - serverTime;
  const running = auction.phase === 'active' && left > 0;
  const price = auction.currentBid ?? auction.startPrice;
  const result =
    auction.result === 'sold' ? c.resultSold : auction.result === 'reserve_not_met' ? c.resultReserve : c.resultNone;

  const submit = async (event: { preventDefault(): void }) => {
    event.preventDefault();
    setMessage(null);
    const value = Number(amount);
    if (!Number.isInteger(value) || value < auction.nextMinimum) {
      setMessage({ kind: 'error', text: c.tooLow(money(auction.nextMinimum, lang)) });
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/auctions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ auctionId: auction.id, amount: value, acceptRules: rules }),
      });
      const body = (await response.json().catch(() => ({}))) as Partial<Payload> & { error?: string };
      if (!response.ok) {
        setMessage({ kind: 'error', text: body.error || c.failed });
        typedAmount.current = false;
        await load();
        return;
      }
      typedAmount.current = false;
      setMessage({ kind: 'ok', text: c.accepted(money(value, lang)) });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const cancelAuction = async () => {
    if (!window.confirm(c.cancelConfirm)) return;
    setBusy(true);
    try {
      const response = await fetch('/api/auctions/cancel', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ auctionId: auction.id }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setMessage(
        response.ok
          ? { kind: 'ok', text: c.cancelled_ok }
          : { kind: 'error', text: body.error || c.cancelFailed },
      );
      await load();
    } finally {
      setBusy(false);
    }
  };

  const bids = showAll ? data.bids : data.bids.slice(0, 5);
  const chip =
    auction.phase === 'active' && running
      ? c.live
      : auction.phase === 'scheduled'
        ? c.scheduled
        : auction.phase === 'cancelled'
          ? c.cancelled
          : c.ended;

  return (
    <section className={`auction-panel ${running ? 'live' : 'closed'}`} aria-label={c.region}>
      <div className="auction-top">
        <span className="auction-chip">{chip}</span>
        {running && (
          <span className={`auction-timer ${left < 120000 ? 'urgent' : ''}`} aria-label={c.timeLeft}>
            {formatLeft(left, lang)}
          </span>
        )}
      </div>

      <div className="auction-price">
        <small>{auction.currentBid === null ? c.startPrice : c.currentBid}</small>
        <b>{money(price, lang)}</b>
        <span>
          {auction.bidCount > 0 ? c.bids(auction.bidCount) : c.noBids}
          {auction.hasReserve && auction.phase !== 'ended' ? c.hasReserve : ''}
        </span>
      </div>

      {viewer?.youLead && running && <p className="auction-note good">{c.youLead}</p>}
      {data.bids.some((bid) => bid.mine) && viewer && !viewer.youLead && running && (
        <p className="auction-note warn">{c.outbid}</p>
      )}
      {auction.phase === 'ended' && auction.result && (
        <p className="auction-note">
          {viewer?.youWon ? c.youWon : result}
          {viewer?.isSeller && auction.result === 'sold' ? c.sellerSold : ''}
        </p>
      )}

      {running && viewer?.isSeller && (
        <div className="auction-seller">
          <p>{c.yourAuction}</p>
          {auction.bidCount === 0 && (
            <button type="button" onClick={() => void cancelAuction()} disabled={busy}>
              {c.cancel}
            </button>
          )}
        </div>
      )}

      {running && !viewer?.isSeller && (
        viewer ? (
          <form onSubmit={submit} className="auction-form">
            <label>
              {c.yourBid}
              <input
                type="number"
                inputMode="numeric"
                min={auction.nextMinimum}
                step={1}
                value={amount}
                onChange={(event) => {
                  typedAmount.current = true;
                  setAmount(event.target.value);
                }}
                required
              />
            </label>
            <p className="auction-hint">
              {c.atLeast(money(auction.nextMinimum, lang), money(auction.minStep, lang))}
            </p>
            <label className="auction-rules">
              <input type="checkbox" checked={rules} onChange={(event) => setRules(event.target.checked)} required />
              <span>
                {c.rulesBefore}{' '}
                <Link href="/legal/auctions" target="_blank">
                  {c.rulesLink}
                </Link>
                {c.rulesAfter}
              </span>
            </label>
            <button type="submit" disabled={busy || viewer?.youLead}>
              {busy ? c.sending : viewer?.youLead ? c.leading : c.placeBid}
            </button>
          </form>
        ) : (
          <a className="auction-signin" href={signInPath} target="_top">
            {c.signIn}
          </a>
        )
      )}

      {message && (
        <output className={`auction-message ${message.kind}`}>
          {message.text}
        </output>
      )}

      {data.bids.length > 0 && (
        <div className="auction-history">
          <b>{c.history}</b>
          <ol>
            {bids.map((bid) => (
              <li key={`${bid.amount}-${bid.createdAt}`} className={bid.mine ? 'mine' : ''}>
                <span>{bid.mine ? c.you : c.participant(bid.bidder)}</span>
                <b>{money(bid.amount, lang)}</b>
                <time dateTime={new Date(bid.createdAt).toISOString()}>{dateTime(bid.createdAt, lang)}</time>
              </li>
            ))}
          </ol>
          {data.bids.length > 5 && (
            <button type="button" className="auction-more" onClick={() => setShowAll((value) => !value)}>
              {showAll ? c.collapse : c.showAll(data.bids.length)}
            </button>
          )}
        </div>
      )}
      <p className="auction-footnote">{c.footnote}</p>
    </section>
  );
}
