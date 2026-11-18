'use client';

import { useEffect, useState } from 'react';
import type { AuctionSummary } from '@/lib/auction';
import { copyFor, money, type Lang, type UiCopy } from '@/lib/ui-copy';

type MyAuction = AuctionSummary & {
  title: string;
  image: string;
  role: 'seller' | 'bidder';
  youLead: boolean;
  youWon: boolean;
  outbid: boolean;
};

function label(item: MyAuction, now: number, c: UiCopy['myAuctions']) {
  if (item.phase === 'cancelled') return c.cancelled;
  if (item.phase === 'scheduled') return c.scheduled;
  if (item.phase === 'active') {
    const minutes = Math.max(0, Math.floor((item.endsAt - now) / 60000));
    return c.left(Math.floor(minutes / 1440), Math.floor((minutes % 1440) / 60), minutes % 60);
  }
  if (item.result === 'sold') return item.youWon ? c.won : item.role === 'seller' ? c.sold : c.ended;
  if (item.result === 'reserve_not_met') return c.reserve;
  return c.none;
}

// "My auctions": running ones first (with a clear "outbid" mark), then the archive of finished ones.
export default function MyAuctions({ onClose, lang = 'ru' }: { onClose?: () => void; lang?: Lang }) {
  const c = copyFor(lang).myAuctions;
  const [items, setItems] = useState<MyAuction[] | null>(null);
  const [serverNow, setServerNow] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const response = await fetch('/api/auctions?mine=1', { cache: 'no-store' });
        if (!response.ok) throw new Error();
        const data = (await response.json()) as { auctions: MyAuction[]; serverNow: number };
        if (alive) {
          setItems(data.auctions);
          setServerNow(data.serverNow);
          setFailed(false);
        }
      } catch {
        if (alive) setFailed(true);
      }
    };
    void load();
    const timer = setInterval(() => {
      if (!document.hidden) void load();
    }, 15000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  if (failed) return <p className="auction-message error">{c.loadFailed}</p>;
  if (!items) return <p className="auction-hint">{c.loading}</p>;
  const active = items.filter((item) => item.phase === 'active' || item.phase === 'scheduled');
  const archive = items.filter((item) => item.phase !== 'active' && item.phase !== 'scheduled');
  if (items.length === 0) {
    return (
      <div className="notification-empty">
        <b>{c.emptyTitle}</b>
        <p>{c.emptyText}</p>
      </div>
    );
  }
  const renderList = (list: MyAuction[]) => (
    <ul className="my-auctions-list">
      {list.map((item) => (
        <li key={item.id}>
          <a href={`/listing/${item.listingId}`} onClick={onClose}>
            <b>{item.title}</b>
            <span>
              {item.currentBid === null ? c.start(money(item.startPrice, lang)) : c.bid(money(item.currentBid, lang))} ·{' '}
              {item.role === 'seller' ? c.selling : c.bidding}
            </span>
            <small className={item.outbid ? 'outbid' : item.youLead ? 'lead' : ''}>
              {item.outbid ? c.outbid : item.youLead && item.phase === 'active' ? c.leading : ''}
              {label(item, serverNow, c)}
            </small>
          </a>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="my-auctions">
      {active.length > 0 && (
        <>
          <h3>{c.running}</h3>
          {renderList(active)}
        </>
      )}
      {archive.length > 0 && (
        <>
          <h3>{c.archive}</h3>
          {renderList(archive)}
        </>
      )}
    </div>
  );
}
