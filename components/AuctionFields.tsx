'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AUCTION_DURATIONS_HOURS, isAuctionCategory } from '@/lib/auction';

// Sale-method switch inside the listing form. It watches the form's "type" and "category" fields
// and shows itself only where auctions are allowed. The server enforces the same rules.
export default function AuctionFields() {
  const anchor = useRef<HTMLFieldSetElement>(null);
  const [eligible, setEligible] = useState(false);
  const [mode, setMode] = useState<'fixed' | 'auction'>('fixed');

  useEffect(() => {
    const form = anchor.current?.form;
    if (!form) return;
    const read = () => {
      const type = (form.elements.namedItem('type') as HTMLSelectElement | null)?.value;
      const category = (form.elements.namedItem('category') as HTMLSelectElement | null)?.value;
      setEligible(type === 'Продам' && Boolean(category) && isAuctionCategory(category as string));
    };
    read();
    form.addEventListener('change', read);
    return () => form.removeEventListener('change', read);
  }, []);

  return (
    <fieldset
      ref={anchor}
      className="auction-fields wide"
      hidden={!eligible}
      style={eligible ? undefined : { display: 'none' }}
    >
      {eligible && (
        <>
          <legend>Способ продажи</legend>
          <div className="auction-mode" role="radiogroup" aria-label="Способ продажи">
            <label className={mode === 'fixed' ? 'active' : ''}>
              <input
                type="radio"
                name="saleMode"
                value="fixed"
                checked={mode === 'fixed'}
                onChange={() => setMode('fixed')}
              />
              Фиксированная цена
            </label>
            <label className={mode === 'auction' ? 'active' : ''}>
              <input
                type="radio"
                name="saleMode"
                value="auction"
                checked={mode === 'auction'}
                onChange={() => setMode('auction')}
              />
              Онлайн-торги
            </label>
          </div>
          {mode === 'auction' && (
            <div className="auction-terms">
              <p className="auction-hint">
                Цена выше станет стартовой. После первой ставки условия изменить нельзя, а торги отменить
                нельзя. Деньги через Qoldan не проходят.{' '}
                <Link href="/legal/auctions" target="_blank">
                  Правила торгов
                </Link>
              </p>
              <label>
                Шаг ставки, ₸
                <input name="auctionStep" type="number" inputMode="numeric" min="1" step="1" required placeholder="1000" />
              </label>
              <label>
                Резервная цена, ₸ (необязательно)
                <input name="auctionReserve" type="number" inputMode="numeric" min="1" step="1" placeholder="Скрыта от участников" />
              </label>
              <label>
                Длительность
                <select name="auctionDuration" defaultValue="72">
                  {AUCTION_DURATIONS_HOURS.map((hours) => (
                    <option key={hours} value={hours}>
                      {hours === 24 ? '1 сутки' : hours === 72 ? '3 суток' : '7 суток'}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </>
      )}
    </fieldset>
  );
}
