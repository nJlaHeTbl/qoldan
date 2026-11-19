'use client';

import { useState } from 'react';
import { copyFor, type Lang } from '@/lib/ui-copy';
import { localizeError } from '@/lib/localize-error';

type Props = {
  listingId: string;
  signInPath: string;
  title: string;
  /** Visible label for the first step. */
  showLabel?: string;
  callLabel?: string;
  buttonClass?: string;
  callClass?: string;
  whatsappClass?: string;
  whatsappText?: string;
  lang?: Lang;
};

type State =
  | { step: 'idle' }
  | { step: 'loading' }
  | { step: 'shown'; phone: string }
  | { step: 'signin' }
  | { step: 'error'; message: string };

// The number is never present in public pages or API payloads. It is fetched on demand from
// POST /api/listings/phone, which requires sign-in, enforces rate limits and keeps an audit log.
export default function RevealPhone({
  listingId,
  signInPath,
  title,
  showLabel,
  callLabel,
  buttonClass,
  callClass,
  whatsappClass,
  whatsappText,
  lang = 'ru',
}: Props) {
  const c = copyFor(lang).phone;
  const [state, setState] = useState<State>({ step: 'idle' });

  const reveal = async () => {
    setState({ step: 'loading' });
    try {
      const response = await fetch('/api/listings/phone', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ listingId }),
      });
      if (response.status === 401) {
        setState({ step: 'signin' });
        return;
      }
      const data = (await response.json().catch(() => ({}))) as {
        phone?: string;
        error?: string;
      };
      if (!response.ok || !data.phone) {
        setState({
          step: 'error',
          message: data.error ? await localizeError(data.error, lang) : c.failed,
        });
        return;
      }
      setState({ step: 'shown', phone: data.phone });
    } catch {
      setState({ step: 'error', message: c.offline });
    }
  };

  if (state.step === 'shown') {
    const digits = state.phone.replace(/\D/g, '');
    return (
      <>
        <a className={callClass} href={`tel:${state.phone}`}>
          {callLabel ?? c.call}: {state.phone}
        </a>
        <a
          className={whatsappClass}
          target="_blank"
          rel="noreferrer"
          href={`https://wa.me/${digits}?text=${encodeURIComponent(`${whatsappText ?? c.greeting}: ${title}`)}`}
        >
          WhatsApp
        </a>
      </>
    );
  }
  if (state.step === 'signin') {
    return (
      <a className={buttonClass} href={signInPath} target="_top">
        {c.signIn}
      </a>
    );
  }
  return (
    <>
      <button
        className={buttonClass}
        type="button"
        onClick={() => void reveal()}
        disabled={state.step === 'loading'}
      >
        {state.step === 'loading' ? c.loading : showLabel ?? c.show}
      </button>
      {state.step === 'error' && (
        <span role="alert" className="reveal-phone-error">
          {state.message}
        </span>
      )}
    </>
  );
}
