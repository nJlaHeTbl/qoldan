'use client';
import { useRouter } from 'next/navigation';
import { storeLangCookie, type Lang } from '@/lib/ui-copy';

const LANGS: ReadonlyArray<readonly [Lang, string]> = [['ru', 'RU'], ['kk', 'KK'], ['en', 'EN']];

// Same choice as the switch on the main page: cookie for server pages, local storage for the main page.
export default function LegalLangSwitch({ lang, label }: { lang: Lang; label: string }) {
  const router = useRouter();
  const choose = (next: Lang) => {
    storeLangCookie(next);
    try {
      window.localStorage.setItem('qoldan-ui-language-v1', next);
    } catch {
      // Storage blocked: the cookie alone still switches the documents.
    }
    router.refresh();
  };
  return (
    <nav aria-label={label} className="legal-langs">
      {LANGS.map(([code, text]) => (
        <button key={code} type="button" lang={code} aria-pressed={code === lang} onClick={() => choose(code)}>
          {text}
        </button>
      ))}
    </nav>
  );
}
