'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AuctionSummary } from '@/lib/auction';

type Bid = { amount: number; createdAt: number; bidder: string; mine: boolean };
type ViewerState = { isSeller: boolean; youLead: boolean; youWon: boolean } | null;
type Payload = {
  serverNow: number;
  auction: AuctionSummary | null;
  viewer: ViewerState;
  bids: Bid[];
};

const money = (value: number) => `${value.toLocaleString('ru-RU')} ₸`;

function formatLeft(ms: number) {
  if (ms <= 0) return '0:00';
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (days > 0) return `${days} д ${hours} ч`;
  if (hours > 0) return `${hours} ч ${String(minutes).padStart(2, '0')} мин`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

const RESULT_TEXT: Record<string, string> = {
  sold: 'Торги завершены: есть победитель',
  reserve_not_met: 'Торги завершены: резервная цена не достигнута',
  no_bids: 'Торги завершены без ставок',
};

// Live auction block. The server owns every number; the browser only shows them, counts down using
// the server clock offset, and refreshes while the tab is visible.
export default function AuctionPanel({
  listingId,
  signInPath,
}: {
  listingId: string;
  signInPath: string;
}) {
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
    void load();
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

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    const value = Number(amount);
    if (!Number.isInteger(value) || value < auction.nextMinimum) {
      setMessage({ kind: 'error', text: `Ставка не меньше ${money(auction.nextMinimum)}` });
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
        setMessage({ kind: 'error', text: body.error || 'Не удалось сделать ставку' });
        typedAmount.current = false;
        await load();
        return;
      }
      typedAmount.current = false;
      setMessage({ kind: 'ok', text: `Ставка ${money(value)} принята. Вы лидируете` });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const cancelAuction = async () => {
    if (!window.confirm('Отменить торги? Это возможно только пока нет ставок.')) return;
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
          ? { kind: 'ok', text: 'Торги отменены' }
          : { kind: 'error', text: body.error || 'Не удалось отменить торги' },
      );
      await load();
    } finally {
      setBusy(false);
    }
  };

  const bids = showAll ? data.bids : data.bids.slice(0, 5);
  const chip =
    auction.phase === 'active' && running
      ? 'Идут торги'
      : auction.phase === 'scheduled'
        ? 'Скоро начнутся'
        : auction.phase === 'cancelled'
          ? 'Торги отменены'
          : 'Торги завершены';

  return (
    <section className={`auction-panel ${running ? 'live' : 'closed'}`} aria-label="Онлайн-торги">
      <div className="auction-top">
        <span className="auction-chip">{chip}</span>
        {running && (
          <span className={`auction-timer ${left < 120000 ? 'urgent' : ''}`} aria-label="Осталось времени">
            {formatLeft(left)}
          </span>
        )}
      </div>

      <div className="auction-price">
        <small>{auction.currentBid === null ? 'Стартовая цена' : 'Текущая ставка'}</small>
        <b>{money(price)}</b>
        <span>
          {auction.bidCount > 0 ? `Ставок: ${auction.bidCount}` : 'Ставок пока нет'}
          {auction.hasReserve && auction.phase !== 'ended' ? ' · есть резервная цена' : ''}
        </span>
      </div>

      {viewer?.youLead && running && <p className="auction-note good">Ваша ставка лидирует</p>}
      {data.bids.some((bid) => bid.mine) && viewer && !viewer.youLead && running && (
        <p className="auction-note warn">Вашу ставку перебили</p>
      )}
      {auction.phase === 'ended' && auction.result && (
        <p className="auction-note">
          {viewer?.youWon ? 'Вы победили. Свяжитесь с продавцом через чат Qoldan' : RESULT_TEXT[auction.result]}
          {viewer?.isSeller && auction.result === 'sold' ? '. Победитель напишет вам в чате' : ''}
        </p>
      )}

      {running && viewer?.isSeller && (
        <div className="auction-seller">
          <p>Это ваши торги. Делать ставки нельзя.</p>
          {auction.bidCount === 0 && (
            <button type="button" onClick={() => void cancelAuction()} disabled={busy}>
              Отменить торги
            </button>
          )}
        </div>
      )}

      {running && !viewer?.isSeller && (
        viewer ? (
          <form onSubmit={submit} className="auction-form">
            <label>
              Ваша ставка, ₸
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
              Не меньше {money(auction.nextMinimum)} (шаг {money(auction.minStep)})
            </p>
            <label className="auction-rules">
              <input type="checkbox" checked={rules} onChange={(event) => setRules(event.target.checked)} required />
              <span>
                Мне есть 18 лет, я принимаю{' '}
                <Link href="/legal/auctions" target="_blank">
                  правила торгов
                </Link>
                . Ставку нельзя отозвать.
              </span>
            </label>
            <button type="submit" disabled={busy || viewer?.youLead}>
              {busy ? 'Отправляем…' : viewer?.youLead ? 'Вы лидируете' : 'Сделать ставку'}
            </button>
          </form>
        ) : (
          <a className="auction-signin" href={signInPath} target="_top">
            Войдите, чтобы участвовать в торгах
          </a>
        )
      )}

      {message && (
        <p role="status" className={`auction-message ${message.kind}`}>
          {message.text}
        </p>
      )}

      {data.bids.length > 0 && (
        <div className="auction-history">
          <b>История ставок</b>
          <ol>
            {bids.map((bid) => (
              <li key={`${bid.amount}-${bid.createdAt}`} className={bid.mine ? 'mine' : ''}>
                <span>{bid.mine ? 'Вы' : bid.bidder}</span>
                <b>{money(bid.amount)}</b>
                <time dateTime={new Date(bid.createdAt).toISOString()}>
                  {new Date(bid.createdAt).toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </li>
            ))}
          </ol>
          {data.bids.length > 5 && (
            <button type="button" className="auction-more" onClick={() => setShowAll((value) => !value)}>
              {showAll ? 'Свернуть' : `Показать все (${data.bids.length})`}
            </button>
          )}
        </div>
      )}
      <p className="auction-footnote">
        Деньги через Qoldan не проходят: после торгов победитель и продавец договариваются напрямую.
      </p>
    </section>
  );
}
