'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main-content" tabIndex={-1} className="listing-page listing-page-missing">
      <section>
        <span>Q</span>
        <h1>Что-то пошло не так</h1>
        <p>Мы не смогли показать эту страницу. Ваши данные не потеряны. Попробуйте ещё раз или вернитесь на главную.</p>
        <p>
          <button
            type="button"
            onClick={reset}
            style={{ font: 'inherit', fontWeight: 600, padding: '10px 18px', borderRadius: 10, border: '1px solid currentColor', background: 'transparent', color: 'inherit', cursor: 'pointer' }}
          >
            Попробовать снова
          </button>
        </p>
        <Link href="/">
          <ArrowLeft /> На главную
        </Link>
      </section>
    </main>
  );
}
