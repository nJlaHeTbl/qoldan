import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Страница не найдена | Qoldan',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main id="main-content" tabIndex={-1} className="listing-page listing-page-missing">
      <section>
        <span>Q</span>
        <h1>Такой страницы нет</h1>
        <p>Ссылка устарела или адрес набран с ошибкой. Начните с каталога — там всё нужное рядом.</p>
        <Link href="/">
          <ArrowLeft /> На главную
        </Link>
      </section>
    </main>
  );
}
