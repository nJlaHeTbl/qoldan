import Link from 'next/link';

type Lang = 'ru' | 'kk' | 'en';

const copy: Record<Lang, [string, string, string, string, string]> = {
  ru: ['Отправляя форму, вы соглашаетесь с ', 'политикой данных', ' и ', 'офертой', '.'],
  kk: ['Форманы жіберу арқылы сіз ', 'деректер саясатымен', ' және ', 'офертамен', ' келісесіз.'],
  en: ['By submitting this form you agree to the ', 'data policy', ' and the ', 'terms', '.'],
};

// Links open in a new tab so a half-filled form is never lost.
export default function ConsentNote({ lang = 'ru' }: { lang?: Lang }) {
  const text = copy[lang];
  return (
    <p className="consent-note" style={{ fontSize: '.85rem', opacity: 0.8, margin: '8px 0' }}>
      {text[0]}
      <Link href="/legal/privacy" target="_blank" rel="noopener">{text[1]}</Link>
      {text[2]}
      <Link href="/legal/terms" target="_blank" rel="noopener">{text[3]}</Link>
      {text[4]}
    </p>
  );
}
