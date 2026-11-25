'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSyncExternalStore } from 'react';
import { LEGAL_COPY, LEGAL_DOCS } from '@/lib/legal';
import { readClientLang, subscribeClientLang, type Lang } from '@/lib/ui-copy';

// Mounted in the root layout on every page. The server renders Russian; the browser then switches to the language
// chosen on this device and follows later switches without a reload.
export function LegalLinks() {
  const lang = useSyncExternalStore(subscribeClientLang, readClientLang, () => 'ru' as Lang);
  const copy = LEGAL_COPY[lang].footer;
  return (
    <div lang={lang} className="legal-links">
      <p style={{ margin: '0 0 6px' }}>{copy.lead}</p>
      <nav aria-label={LEGAL_COPY[lang].docsLabel}>
        {LEGAL_DOCS.map((doc, index) => (
          <span key={doc.href}>
            {index ? ' · ' : ''}
            <Link href={doc.href} style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}>
              {copy.links[doc.href] ?? LEGAL_COPY[lang].titles[doc.href]}
            </Link>
          </span>
        ))}
      </nav>
    </div>
  );
}

export default function LegalFooter() {
  const pathname = usePathname();
  // The home page carries these links inside its own footer, so a second footer would be a duplicate.
  if (pathname === '/') return null;
  return (
    <footer style={{ padding: '24px 16px 104px', textAlign: 'center', fontSize: '.85rem', lineHeight: 1.6, opacity: 0.8 }}>
      <LegalLinks />
    </footer>
  );
}
