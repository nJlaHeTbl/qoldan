import type { Metadata } from 'next';
import Link from 'next/link';
import { cache } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Construction,
  MapPin,
  MessageCircle,
  PackageOpen,
  Tractor,
  Wrench,
} from 'lucide-react';
import {
  ensureMarketplaceSchema,
  getMarketplaceDb,
} from '@/lib/server/marketplace-db';
import { RecentViewTracker } from '@/components/RecentViewTracker';
import { requestLang } from '@/lib/server/request-lang';
import { requestPageCopy } from '@/lib/request-page-copy';

type RequestDetailRow = {
  id: string;
  title: string;
  place: string;
  when_text: string;
  budget: string;
  kind: 'agro' | 'build' | 'rent' | 'recycle';
  region: string;
  response_count: number;
  created_at: number;
  owner_name: string;
};

type RequestPageProps = {
  params: Promise<{ id: string }>;
};

const requestIcons = {
  agro: Tractor,
  rent: Wrench,
  build: Construction,
  recycle: PackageOpen,
} as const;

const getRequest = cache(async (id: string) => {
  await ensureMarketplaceSchema();
  return getMarketplaceDb()
    .prepare(
      `SELECT requests.id, requests.title, requests.place,
              requests.when_text, requests.budget, requests.kind,
              requests.region, requests.response_count, requests.created_at,
              users.display_name AS owner_name
       FROM requests
       JOIN users ON users.id = requests.owner_id
       WHERE requests.id = ? AND requests.status = 'open'
       LIMIT 1`,
    )
    .bind(id)
    .first<RequestDetailRow>();
});

const requestDescription = (item: RequestDetailRow) =>
  `${item.place}, ${item.region} · ${item.when_text} · бюджет ${item.budget}`.slice(
    0,
    180,
  );

export async function generateMetadata({
  params,
}: RequestPageProps): Promise<Metadata> {
  const { id } = await params;
  const item = await getRequest(id);
  if (!item) {
    return {
      title: 'Заявка недоступна | Qoldan',
      robots: { index: false, follow: false },
      openGraph: { images: [] },
      twitter: { images: [] },
    };
  }
  const title = `${item.title} — заявка Qoldan`;
  const description = requestDescription(item);
  return {
    title,
    description,
    // Only open requests are shown at all; closed ones answer 404 with noindex.
    alternates: { canonical: `https://qoldan-zhetisu.nuc9i218.chatgpt.site/request/${encodeURIComponent(id)}` },
    openGraph: {
      title,
      description,
      type: 'website',
      images: [],
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: [],
    },
  };
}

const formatPublishedDate = (timestamp: number, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(timestamp));

export default async function RequestPage({ params }: RequestPageProps) {
  const { id } = await params;
  const item = await getRequest(id);
  const lang = await requestLang();
  const t = requestPageCopy(lang);

  if (!item) {
    return (
      <main id="main-content" tabIndex={-1} lang={lang} className="listing-page listing-page-missing">
        <section>
          <span>Q</span>
          <h1>{t.missingTitle}</h1>
          <p>{t.missingText}</p>
          <Link href="/#requests">
            <ArrowLeft /> {t.missingLink}
          </Link>
        </section>
      </main>
    );
  }

  const kind = Object.hasOwn(requestIcons, item.kind) ? item.kind : 'agro';
  const DirectionIcon = requestIcons[kind];
  const responseLabel = t.responses(Number(item.response_count));

  return (
    <main id="main-content" tabIndex={-1} lang={lang} className="listing-page request-page">
      <RecentViewTracker kind="request" itemId={item.id} />
      <header className="listing-page-header">
        <Link className="listing-page-brand" href="/#top" aria-label="Qoldan">
          <span>Q</span>
          <b>Qoldan</b>
        </Link>
        <Link className="listing-page-back" href="/#requests">
          <ArrowLeft /> {t.allRequests}
        </Link>
      </header>
      <section className="listing-page-shell request-page-shell">
        <article className="request-page-card">
          <aside className="request-page-direction">
            <span>
              <DirectionIcon />
            </span>
            <small>{t.eyebrow} · {t.kinds[kind]}</small>
            <b>{responseLabel}</b>
            <p>{t.directionNote}</p>
          </aside>
          <div className="request-page-content">
            <small>{t.requestNo(item.id)}</small>
            <h1>{item.title}</h1>
            <div className="request-page-budget">
              <CircleDollarSign />
              <span>
                {t.budget} <b>{item.budget}</b>
              </span>
            </div>
            <div className="listing-page-facts request-page-facts">
              <span>
                <MapPin /> {item.place}, {item.region}
              </span>
              <span>
                <CalendarDays /> {item.when_text}
              </span>
              <span>
                <CheckCircle2 /> {t.published}{' '}
                {formatPublishedDate(Number(item.created_at), t.locale)}
              </span>
            </div>
            <div className="listing-page-owner request-page-owner">
              <span>{item.owner_name.slice(0, 2).toUpperCase()}</span>
              <div>
                <b>{item.owner_name}</b>
                <small>{t.customer}</small>
              </div>
            </div>
            <div className="request-page-actions">
              <Link href={`/?request=${encodeURIComponent(item.id)}#requests`}>
                <MessageCircle /> {t.respond}
              </Link>
              <Link className="secondary" href="/#requests">
                {t.others}
              </Link>
            </div>
            <p className="listing-page-safety">{t.safety}</p>
          </div>
        </article>
      </section>
    </main>
  );
}
