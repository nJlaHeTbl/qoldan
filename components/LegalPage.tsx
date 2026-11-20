import Link from 'next/link';
import type { ReactNode } from 'react';
import { LEGAL_COPY, LEGAL_DOCS, OPERATOR, isPlaceholder, type LegalLang } from '@/lib/legal';
import LegalLangSwitch from '@/components/LegalLangSwitch';

const styles = `
.legal-page{max-width:780px;margin:0 auto;padding:20px 16px 72px;line-height:1.65}
.legal-page header{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:28px;flex-wrap:wrap}
.legal-page h1{font-size:1.7rem;line-height:1.25;margin:0 0 6px}
.legal-page h2{font-size:1.2rem;margin:28px 0 8px}
.legal-page a{text-decoration:underline;text-underline-offset:3px}
.legal-page ul{padding-left:1.25rem}
.legal-page li{margin:4px 0}
.legal-table{overflow-x:auto}
.legal-page table{border-collapse:collapse;width:100%;min-width:560px;font-size:.92rem}
.legal-page th,.legal-page td{border:1px solid color-mix(in srgb,currentColor 25%,transparent);padding:8px 10px;text-align:left;vertical-align:top}
.legal-page>nav{margin-top:40px;padding-top:16px;border-top:1px solid color-mix(in srgb,currentColor 20%,transparent)}
.legal-page>nav ul{list-style:none;padding:0}
.legal-meta{opacity:.7;font-size:.9rem}
.legal-todo{background:#fde68a;color:#111;padding:0 4px;border-radius:3px}
.legal-langs{display:inline-flex;gap:4px}
.legal-langs button{font:inherit;font-size:.85rem;padding:4px 10px;border-radius:6px;border:1px solid color-mix(in srgb,currentColor 30%,transparent);background:transparent;color:inherit;cursor:pointer;min-height:36px}
.legal-langs button[aria-pressed=true]{background:#0d6b45;border-color:#0d6b45;color:#fff}
.legal-note{padding:10px 12px;border-radius:8px;background:color-mix(in srgb,currentColor 8%,transparent);font-size:.92rem}
`;

export function Todo({ children }: { children: ReactNode }) {
  return <mark className="legal-todo">{children}</mark>;
}

export function Op({ field, lang = 'ru' }: { field: keyof typeof OPERATOR; lang?: LegalLang }) {
  const value = LEGAL_COPY[lang].operator[field];
  return isPlaceholder(value) ? <Todo>{value}</Todo> : <>{value}</>;
}

export function DataTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="legal-table">
      <table>
        <thead>
          <tr>{head.map((cell) => <th key={cell}>{cell}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>{row.map((cell, i) => <td key={i}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function LegalPage({ title, children, lang = 'ru' }: { title: string; children: ReactNode; lang?: LegalLang }) {
  const copy = LEGAL_COPY[lang];
  return (
    <main id="main-content" tabIndex={-1} lang={lang} className="legal-page">
      <style>{styles}</style>
      <header>
        <Link href="/">← Qoldan</Link>
        <Link href="/legal">{copy.allDocs}</Link>
        <LegalLangSwitch lang={lang} label={copy.languageLabel} />
      </header>
      <h1>{title}</h1>
      <p className="legal-meta">{copy.edition} {copy.updated}</p>
      {copy.note && <p className="legal-note">{copy.note}</p>}
      {children}
      <nav aria-label={copy.docsLabel}>
        <b>{copy.otherDocs}</b>
        <ul>
          {LEGAL_DOCS.map((doc) => (
            <li key={doc.href}><Link href={doc.href}>{copy.titles[doc.href] ?? doc.title}</Link></li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
