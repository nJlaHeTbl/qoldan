import Link from 'next/link';
import type { ReactNode } from 'react';
import { LEGAL_DOCS, LEGAL_UPDATED, OPERATOR, isPlaceholder } from '@/lib/legal';

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
.legal-page nav{margin-top:40px;padding-top:16px;border-top:1px solid color-mix(in srgb,currentColor 20%,transparent)}
.legal-page nav ul{list-style:none;padding:0}
.legal-meta{opacity:.7;font-size:.9rem}
.legal-todo{background:#fde68a;color:#111;padding:0 4px;border-radius:3px}
`;

export function Todo({ children }: { children: ReactNode }) {
  return <mark className="legal-todo">{children}</mark>;
}

export function Op({ field }: { field: keyof typeof OPERATOR }) {
  const value = OPERATOR[field];
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

export default function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="legal-page">
      <style>{styles}</style>
      <header>
        <Link href="/">← Qoldan</Link>
        <Link href="/legal">Все документы</Link>
      </header>
      <h1>{title}</h1>
      <p className="legal-meta">Редакция от {LEGAL_UPDATED}</p>
      {children}
      <nav aria-label="Правовые документы">
        <b>Другие документы</b>
        <ul>
          {LEGAL_DOCS.map((doc) => (
            <li key={doc.href}><Link href={doc.href}>{doc.title}</Link></li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
