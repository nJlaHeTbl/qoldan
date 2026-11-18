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

const requestKinds = {
  agro: { label: 'Сельхозработы', Icon: Tractor },
  rent: { label: 'Аренда оборудования', Icon: Wrench },
  build: { label: 'Стройка и материалы', Icon: Construction },
  recycle: { label: 'Вторсырьё', Icon: PackageOpen },
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

const formatPublishedDate = (timestamp: number) =>
  new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(timestamp));

const formatResponseCount = (count: number) => {
  const mod100 = count % 100;
  const mod10 = count % 10;
  const word =
    mod100 >= 11 && mod100 <= 14
      ? 'откликов'
      : mod10 === 1
        ? 'отклик'
        : mod10 >= 2 && mod10 <= 4
          ? 'отклика'
          : 'откликов';
  return `${count} ${word}`;
};

export default async function RequestPage({ params }: RequestPageProps) {
  const { id } = await params;
  const item = await getRequest(id);

  if (!item) {
    return (
      <main id="main-content" tabIndex={-1} className="listing-page listing-page-missing">
        <section>
          <span>Q</span>
          <h1>Заявка больше недоступна</h1>
          <p>
            Возможно, заказчик уже выбрал исполнителя, закрыл заявку или она
            была снята с публикации.
          </p>
          <Link href="/#requests">
            <ArrowLeft /> Смотреть актуальные заявки
          </Link>
        </section>
      </main>
    );
  }

  const kind = requestKinds[item.kind] || requestKinds.agro;
  const DirectionIcon = kind.Icon;
  const responseLabel = formatResponseCount(item.response_count);

  return (
    <main id="main-content" tabIndex={-1} className="listing-page request-page">
      <RecentViewTracker kind="request" itemId={item.id} />
      <header className="listing-page-header">
        <Link className="listing-page-brand" href="/#top" aria-label="Qoldan">
          <span>Q</span>
          <b>Qoldan</b>
        </Link>
        <Link className="listing-page-back" href="/#requests">
          <ArrowLeft /> Все заявки
        </Link>
      </header>
      <section className="listing-page-shell request-page-shell">
        <article className="request-page-card">
          <aside className="request-page-direction">
            <span>
              <DirectionIcon />
            </span>
            <small>МНЕ НУЖНО · {kind.label}</small>
            <b>{responseLabel}</b>
            <p>
              Исполнители предлагают цену сами. Qoldan не принимает оплату и не
              удерживает комиссию за отклик.
            </p>
          </aside>
          <div className="request-page-content">
            <small>ЗАЯВКА #{item.id}</small>
            <h1>{item.title}</h1>
            <div className="request-page-budget">
              <CircleDollarSign />
              <span>
                Бюджет <b>{item.budget}</b>
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
                <CheckCircle2 /> Опубликовано{' '}
                {formatPublishedDate(Number(item.created_at))}
              </span>
            </div>
            <div className="listing-page-owner request-page-owner">
              <span>{item.owner_name.slice(0, 2).toUpperCase()}</span>
              <div>
                <b>{item.owner_name}</b>
                <small>Заказчик на Qoldan</small>
              </div>
            </div>
            <div className="request-page-actions">
              <Link href={`/?request=${encodeURIComponent(item.id)}#requests`}>
                <MessageCircle /> Откликнуться в Qoldan
              </Link>
              <Link className="secondary" href="/#requests">
                Посмотреть другие заявки
              </Link>
            </div>
            <p className="listing-page-safety">
              До начала работы уточните объём, сроки, итоговую цену и условия
              выезда. Не переводите предоплату незнакомому человеку без
              проверки.
            </p>
          </div>
        </article>
      </section>
    </main>
  );
}
