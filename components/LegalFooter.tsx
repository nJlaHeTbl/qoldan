import Link from 'next/link';
import { LEGAL_DOCS } from '@/lib/legal';

const labels: Record<string, string> = {
  '/legal/privacy': 'Политика данных',
  '/legal/terms': 'Оферта',
  '/legal/returns': 'Возврат и споры',
  '/legal/cookies': 'Cookie',
};

export default function LegalFooter() {
  return (
    <footer
      aria-label="Правовая информация"
      style={{ padding: '24px 16px 104px', textAlign: 'center', fontSize: '.85rem', lineHeight: 1.6, opacity: 0.8 }}
    >
      <p style={{ margin: '0 0 6px' }}>
        Qoldan не принимает оплату и не берёт комиссию: участники договариваются напрямую.
      </p>
      <nav aria-label="Правовые документы">
        {LEGAL_DOCS.map((doc, index) => (
          <span key={doc.href}>
            {index ? ' · ' : ''}
            <Link href={doc.href} style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}>
              {labels[doc.href] ?? doc.title}
            </Link>
          </span>
        ))}
      </nav>
    </footer>
  );
}
