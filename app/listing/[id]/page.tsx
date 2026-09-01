/* oxlint-disable next/no-img-element -- listing photos can be remote or user-uploaded */
import type { Metadata } from 'next';
import Link from 'next/link';
import { cache } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Construction,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import {
  ensureMarketplaceSchema,
  getMarketplaceDb,
} from '@/lib/server/marketplace-db';
import { RecentViewTracker } from '@/components/RecentViewTracker';

const SITE_ORIGIN = 'https://qoldan-zhetisu.nuc9i218.chatgpt.site';

type ListingDetailRow = {
  id: string;
  title: string;
  price: string;
  unit: string | null;
  location: string;
  region: string;
  category: string;
  offer_type: 'Продам' | 'Сдам' | 'Окажу услугу';
  image_url: string;
  phone: string;
  available: string | null;
  description: string | null;
  seller_type: string;
  delivery: number;
  created_at: number;
  owner_name: string;
  verified_business_id: string | null;
};

type ListingPageProps = {
  params: Promise<{ id: string }>;
};

const getListing = cache(async (id: string) => {
  await ensureMarketplaceSchema();
  return getMarketplaceDb()
    .prepare(
      `SELECT listings.id, listings.title, listings.price, listings.unit,
              listings.location, listings.region, listings.category,
              listings.offer_type, listings.image_url, listings.phone,
              listings.available, listings.description, listings.seller_type,
              listings.delivery, listings.created_at,
              users.display_name AS owner_name,
              verified_business.id AS verified_business_id
       FROM listings
       JOIN users ON users.id = listings.owner_id
       LEFT JOIN business_verifications verified_business
         ON verified_business.owner_id = listings.owner_id
        AND verified_business.status = 'verified'
       WHERE listings.id = ? AND listings.status = 'active'
       LIMIT 1`,
    )
    .bind(id)
    .first<ListingDetailRow>();
});

const absoluteListingImage = (value: string) => {
  try {
    const image = new URL(value, SITE_ORIGIN);
    return image.protocol === 'https:' || image.protocol === 'http:'
      ? image.toString()
      : null;
  } catch {
    return null;
  }
};

const listingDescription = (listing: ListingDetailRow) =>
  (
    listing.description ||
    `${listing.offer_type}: ${listing.title} в регионе ${listing.region}.`
  ).slice(0, 180);

export async function generateMetadata({
  params,
}: ListingPageProps): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) {
    return {
      title: 'Объявление не найдено | Qoldan',
      robots: { index: false, follow: false },
      openGraph: { images: [] },
      twitter: { images: [] },
    };
  }
  const image = absoluteListingImage(listing.image_url);
  const title = `${listing.title} — ${listing.price}`;
  const description = listingDescription(listing);
  return {
    title: `${title} | Qoldan`,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: image ? [{ url: image, alt: listing.title }] : [],
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : [],
    },
  };
}

const formatPublishedDate = (timestamp: number) =>
  new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(timestamp));

export default async function ListingPage({ params }: ListingPageProps) {
  const { id } = await params;
  const listing = await getListing(id);

  if (!listing) {
    return (
      <main className="listing-page listing-page-missing">
        <section>
          <span>Q</span>
          <h1>Объявление больше недоступно</h1>
          <p>Возможно, владелец поставил его на паузу или снял с публикации.</p>
          <Link href="/#catalog">
            <ArrowLeft /> Вернуться в каталог
          </Link>
        </section>
      </main>
    );
  }

  const phoneDigits = listing.phone.replace(/\D/g, '');
  const whatsappText = encodeURIComponent(
    `Здравствуйте! Пишу по объявлению Qoldan: ${listing.title}`,
  );

  return (
    <main className="listing-page">
      <RecentViewTracker kind="listing" itemId={listing.id} />
      <header className="listing-page-header">
        <Link className="listing-page-brand" href="/#top" aria-label="Qoldan">
          <span>Q</span>
          <b>Qoldan</b>
        </Link>
        <Link className="listing-page-back" href="/#catalog">
          <ArrowLeft /> Все объявления
        </Link>
      </header>
      <section className="listing-page-shell">
        <article className="listing-page-card">
          <div className="listing-page-photo">
            <img src={listing.image_url} alt={listing.title} />
            <span className="listing-page-type">{listing.offer_type}</span>
          </div>
          <div className="listing-page-content">
            <small>
              {listing.category} · {listing.region}
            </small>
            <h1>{listing.title}</h1>
            <div className="listing-page-price">
              {listing.price} <span>{listing.unit || ''}</span>
            </div>
            <p>{listingDescription(listing)}</p>
            <div className="listing-page-facts">
              <span>
                <MapPin /> {listing.location}, {listing.region}
              </span>
              <span>
                <CheckCircle2 /> Опубликовано{' '}
                {formatPublishedDate(Number(listing.created_at))}
              </span>
              {listing.available && (
                <span>
                  <CheckCircle2 /> {listing.available}
                </span>
              )}
              {Boolean(listing.delivery) && (
                <span>
                  <Construction /> Доставка или выезд доступны
                </span>
              )}
            </div>
            <div className="listing-page-owner">
              <span>{listing.owner_name.slice(0, 2).toUpperCase()}</span>
              <div>
                <b>{listing.owner_name}</b>
                <small>
                  {listing.seller_type} ·{' '}
                  {listing.verified_business_id
                    ? 'бизнес подтверждён Qoldan'
                    : 'участник площадки'}
                </small>
              </div>
              {listing.verified_business_id && <ShieldCheck />}
            </div>
            <div className="listing-page-actions">
              <a href={`tel:${listing.phone}`}>
                <Phone /> Позвонить
              </a>
              <a
                className="whatsapp"
                href={`https://wa.me/${phoneDigits}?text=${whatsappText}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle /> WhatsApp
              </a>
            </div>
            <p className="listing-page-safety">
              Qoldan не принимает оплату. Уточните состояние, условия и личность
              второй стороны до передачи денег.
            </p>
          </div>
        </article>
      </section>
    </main>
  );
}
