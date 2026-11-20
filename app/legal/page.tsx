import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage from '@/components/LegalPage';
import { LEGAL_COPY, LEGAL_DOCS } from '@/lib/legal';
import { requestLang } from '@/lib/server/request-lang';

export const metadata: Metadata = {
  title: 'Правовые документы | Qoldan',
  description: 'Политика данных, оферта, условия возврата и политика cookie Qoldan.',
};

const intro = {
  ru: {
    title: 'Правовые документы Qoldan',
    text: 'Qoldan — информационная площадка: пользователи сами публикуют объявления и заявки и договариваются напрямую. Qoldan не принимает оплату и не удерживает комиссию.',
  },
  kk: {
    title: 'Qoldan құқықтық құжаттары',
    text: 'Qoldan — ақпараттық алаң: пайдаланушылар хабарландырулар мен өтінімдерді өздері жариялап, тікелей келіседі. Qoldan төлем қабылдамайды және комиссия ұстамайды.',
  },
  en: {
    title: 'Qoldan legal documents',
    text: 'Qoldan is an information platform: users publish listings and requests themselves and agree directly. Qoldan does not take payments or charge fees.',
  },
} as const;

export default async function LegalIndexPage() {
  const lang = await requestLang();
  const copy = intro[lang];
  return (
    <LegalPage title={copy.title} lang={lang}>
      <p>{copy.text}</p>
      <ul>
        {LEGAL_DOCS.map((doc) => (
          <li key={doc.href}>
            <Link href={doc.href}>{LEGAL_COPY[lang].titles[doc.href] ?? doc.title}</Link>
          </li>
        ))}
      </ul>
    </LegalPage>
  );
}
