'use client';

import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { copyFor, type Lang } from '@/lib/ui-copy';
import { translateServerMessage } from '@/lib/server-messages';

type Channel = 'phone' | 'email';
const LANGUAGE_KEY = 'qoldan-ui-language-v1';

function readLang(): Lang {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_KEY);
    return stored === 'kk' || stored === 'en' ? stored : 'ru';
  } catch {
    return 'ru';
  }
}

// One-time-code sign-in for self-hosting: contact → code → session cookie (set by the server) → back.
export default function SignInForm({ channels, returnTo }: { channels: Channel[]; returnTo: string }) {
  const lang = useSyncExternalStore(() => () => undefined, readLang, () => 'ru' as Lang);
  const c = copyFor(lang).signIn;
  const [channel, setChannel] = useState<Channel>(channels[0] ?? 'phone');
  const [destination, setDestination] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const call = async (path: string, body: unknown) => {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string; destination?: string };
    if (!response.ok) throw new Error(data.error ? translateServerMessage(data.error, lang) : c.failed);
    return data;
  };

  const requestCode = async (event?: { preventDefault(): void }) => {
    event?.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await call('/api/auth/code', { channel, destination, consent });
      setSentTo(data.destination ?? destination);
      setCooldown(60);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : c.failed);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (event: { preventDefault(): void }) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await call('/api/auth/verify', { channel, destination: sentTo, code });
      window.location.assign(returnTo);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : c.failed);
      setBusy(false);
    }
  };

  return (
    <section className="signin-card">
      <h1>{c.title}</h1>
      <p className="signin-lead">{c.lead}</p>
      {!sentTo ? (
        <form onSubmit={requestCode} className="signin-form">
          {channels.length > 1 && (
            <div className="auction-mode" role="radiogroup" aria-label={c.title}>
              {channels.map((item) => (
                <label key={item} className={channel === item ? 'active' : ''}>
                  <input type="radio" name="channel" value={item} checked={channel === item} onChange={() => setChannel(item)} />
                  {item === 'phone' ? c.phone : c.email}
                </label>
              ))}
            </div>
          )}
          <label>
            {channel === 'phone' ? c.phoneLabel : c.emailLabel}
            <input
              type={channel === 'phone' ? 'tel' : 'email'}
              inputMode={channel === 'phone' ? 'tel' : 'email'}
              autoComplete={channel === 'phone' ? 'tel' : 'email'}
              placeholder={channel === 'phone' ? '+7 700 123 45 67' : 'name@example.kz'}
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              required
              maxLength={254}
            />
          </label>
          <label className="auction-rules">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required />
            <span>
              {c.consentBefore}{' '}
              <Link href="/legal/privacy" target="_blank">{c.consentLink}</Link>
            </span>
          </label>
          <button type="submit" disabled={busy}>{busy ? c.sending : c.getCode}</button>
        </form>
      ) : (
        <form onSubmit={verify} className="signin-form">
          <p className="signin-sent">
            {c.codeSent(sentTo)}{' '}
            <button type="button" className="auction-more" onClick={() => { setSentTo(null); setCode(''); setError(''); }}>
              {c.change}
            </button>
          </p>
          <label>
            {c.codeLabel}
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              required
            />
          </label>
          <button type="submit" disabled={busy || code.length !== 6}>{busy ? c.checking : c.submit}</button>
          <button type="button" className="auction-more" disabled={cooldown > 0 || busy} onClick={() => void requestCode()}>
            {cooldown > 0 ? c.resendIn(cooldown) : c.resend}
          </button>
        </form>
      )}
      {error && <output className="auction-message error">{error}</output>}
    </section>
  );
}
