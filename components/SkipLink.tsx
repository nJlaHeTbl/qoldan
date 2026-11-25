'use client';
import { useSyncExternalStore } from 'react';
import { copyFor, readClientLang, subscribeClientLang, type Lang } from '@/lib/ui-copy';

// «Skip to content» link in the language chosen on this device (the server renders Russian).
export default function SkipLink() {
  const lang = useSyncExternalStore(subscribeClientLang, readClientLang, () => 'ru' as Lang);
  return (
    <a className="skip-link" href="#main-content">
      {copyFor(lang).shell.skip}
    </a>
  );
}
