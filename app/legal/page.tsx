import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage from '@/components/LegalPage';
import { LEGAL_DOCS } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Правовые документы | Qoldan',
  description: 'Политика данных, оферта, условия возврата и политика cookie Qoldan.',
};

export default function LegalIndexPage() {
  return (
    <LegalPage title="Правовые документы Qoldan">
      <p>
        Qoldan — информационная площадка: пользователи сами публикуют объявления и заявки и
        договариваются напрямую. Qoldan не принимает оплату и не удерживает комиссию.
      </p>
      <ul>
        {LEGAL_DOCS.map((doc) => (
          <li key={doc.href}>
            <Link href={doc.href}>{doc.title}</Link>
          </li>
        ))}
      </ul>
    </LegalPage>
  );
}
