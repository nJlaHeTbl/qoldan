import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requestLang } from '@/lib/server/request-lang';
import { copyFor } from '@/lib/ui-copy';

export const metadata = {
  title: 'Страница не найдена | Qoldan',
  robots: { index: false, follow: false },
};

// Also rendered (with HTTP 404) when a listing or a request does not exist: the pages call notFound().
export default async function NotFound() {
  const lang = await requestLang();
  const t = copyFor(lang).shell;
  return (
    <main id="main-content" tabIndex={-1} lang={lang} className="listing-page listing-page-missing">
      <section>
        <span>Q</span>
        <h1>{t.notFoundTitle}</h1>
        <p>{t.notFoundText}</p>
        <Link href="/">
          <ArrowLeft /> {t.notFoundHome}
        </Link>
      </section>
    </main>
  );
}
