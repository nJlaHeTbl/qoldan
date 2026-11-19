'use client';

import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { COOKIE_NOTICE_KEY } from '@/lib/legal';

type Lang = 'ru' | 'kk' | 'en';

const text: Record<Lang, { body: string; ok: string; more: string }> = {
  ru: {
    body: 'Qoldan не использует рекламные и аналитические cookie. В браузере хранятся только язык, черновики форм и недавние просмотры.',
    ok: 'Понятно',
    more: 'Подробнее',
  },
  kk: {
    body: 'Qoldan жарнамалық және аналитикалық cookie қолданбайды. Браузерде тек тіл, форма жобалары және соңғы қаралғандар сақталады.',
    ok: 'Түсінікті',
    more: 'Толығырақ',
  },
  en: {
    body: 'Qoldan does not use advertising or analytics cookies. Your browser only stores your language, form drafts and recently viewed items.',
    ok: 'Got it',
    more: 'Details',
  },
};

const css = `
.cookie-notice{position:fixed;left:12px;right:12px;bottom:12px;z-index:60;max-width:720px;margin:0 auto;
display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;justify-content:space-between;padding:12px 16px;
border-radius:12px;border:1px solid color-mix(in srgb,CanvasText 25%,transparent);background:Canvas;color:CanvasText;
box-shadow:0 8px 28px rgba(0,0,0,.18);font-size:.9rem;line-height:1.45}
.cookie-notice p{margin:0;flex:1 1 280px}
.cookie-notice div{display:flex;gap:14px;align-items:center}
.cookie-notice a{color:inherit;text-decoration:underline;text-underline-offset:3px}
.cookie-notice button{cursor:pointer;font:inherit;font-weight:600;padding:8px 16px;border-radius:8px;
border:1px solid currentColor;background:transparent;color:inherit}
@media(max-width:620px){.cookie-notice{left:8px;right:8px;bottom:calc(72px + env(safe-area-inset-bottom));padding:10px 12px;font-size:.82rem;gap:8px 12px}.cookie-notice p{flex-basis:100%}.cookie-notice div{width:100%;justify-content:space-between}.cookie-notice a,.cookie-notice button{min-height:40px;display:inline-flex;align-items:center}}
`;

const CHANGE_EVENT = 'qoldan-cookie-notice-change';

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

// Storage may be blocked (private mode); then the notice simply shows on every visit.
function readStorage(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

const getAcknowledged = () => (readStorage(COOKIE_NOTICE_KEY) ? 'yes' : 'no');
const getLang = (): Lang => {
  const stored = readStorage('qoldan-ui-language-v1');
  return stored === 'kk' || stored === 'en' ? stored : 'ru';
};

export default function CookieNotice() {
  // Server snapshot is "yes" so the notice is never rendered on the server (no hydration mismatch).
  const acknowledged = useSyncExternalStore(subscribe, getAcknowledged, () => 'yes');
  const lang = useSyncExternalStore(subscribe, getLang, () => 'ru' as Lang);
  const [dismissed, setDismissed] = useState(false);

  if (acknowledged === 'yes' || dismissed) return null;
  const copy = text[lang];
  const close = () => {
    try {
      window.localStorage.setItem(COOKIE_NOTICE_KEY, '1');
    } catch {
      // Without storage the notice closes for this page view only.
    }
    setDismissed(true);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return (
    <section className="cookie-notice" aria-label="Cookie">
      <style>{css}</style>
      <p>{copy.body}</p>
      <div>
        <Link href="/legal/cookies">{copy.more}</Link>
        <button type="button" onClick={close}>{copy.ok}</button>
      </div>
    </section>
  );
}
