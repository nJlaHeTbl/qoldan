'use client';

import { useEffect, useState } from 'react';
import type { AuctionSummary } from '@/lib/auction';

type MyAuction = AuctionSummary & {
  title: string;
  image: string;
  role: 'seller' | 'bidder';
  youLead: boolean;
  youWon: boolean;
  outbid: boolean;
};

const money = (value: number) => `${value.toLocaleString('ru-RU')} ₸`;

function label(item: MyAuction, now: number) {
  if (item.phase === 'cancelled') return 'Отменены';
  if (item.phase === 'scheduled') return 'Скоро начнутся';
  if (item.phase === 'active') {
    const minutes = Math.max(0, Math.floor((item.endsAt - now) / 60000));
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    return days > 0 ? `Осталось ${days} д ${hours} ч` : hours > 0 ? `Осталось ${hours} ч ${minutes % 60} мин` : `Осталось ${minutes} мин`;
  }
  if (item.result === 'sold') return item.youWon ? 'Вы победили' : item.role === 'seller' ? 'Продано' : 'Завершены';
  if (item.result === 'reserve_not_met') return 'Резервная цена не достигнута';
  return 'Завершены без ставок';
}

// "My auctions": running ones first (with a clear "outbid" mark), then the archive of finished ones.
export default function MyAuctions({ onClose }: { onClose?: () => void }) {
  const [items, setItems] = useState<MyAuction[] | null>(null);
  const [serverNow, setServerNow] = useState(0);
  const [error, setError] = useState('');

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
          setError('');
        }
      } catch {
        if (alive) setError('Не удалось загрузить торги. Попробуйте позже.');
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

  if (error) return <p className="auction-message error">{error}</p>;
  if (!items) return <p className="auction-hint">Загружаем…</p>;
  const active = items.filter((item) => item.phase === 'active' || item.phase === 'scheduled');
  const archive = items.filter((item) => item.phase !== 'active' && item.phase !== 'scheduled');
  if (items.length === 0) {
    return (
      <div className="notification-empty">
        <b>Торгов пока нет</b>
        <p>Выставьте товар на торги при публикации или сделайте ставку в чужих торгах.</p>
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
              {item.currentBid === null ? `Старт ${money(item.startPrice)}` : `Ставка ${money(item.currentBid)}`} ·{' '}
              {item.role === 'seller' ? 'вы продаёте' : 'вы участвуете'}
            </span>
            <small className={item.outbid ? 'outbid' : item.youLead ? 'lead' : ''}>
              {item.outbid ? 'Вашу ставку перебили · ' : item.youLead && item.phase === 'active' ? 'Вы лидируете · ' : ''}
              {label(item, serverNow)}
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
          <h3>Идут сейчас</h3>
          {renderList(active)}
        </>
      )}
      {archive.length > 0 && (
        <>
          <h3>Архив</h3>
          {renderList(archive)}
        </>
      )}
    </div>
  );
}
