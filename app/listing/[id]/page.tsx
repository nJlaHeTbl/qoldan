/* oxlint-disable next/no-img-element -- listing photos can be remote or user-uploaded */
import type { Metadata } from 'next';
import Link from 'next/link';
import { cache } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Construction,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import {
  ensureMarketplaceSchema,
  getMarketplaceDb,
} from '@/lib/server/marketplace-db';
import { RecentViewTracker } from '@/components/RecentViewTracker';
import { isHousingCategory, getHousingPhotos } from '@/lib/housing';
import { HousingGallery } from '@/components/HousingGallery';
import RevealPhone from '@/components/RevealPhone';
import AuctionPanel from '@/components/AuctionPanel';
import { chatGPTSignInPath } from '../../chatgpt-auth';

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
  show_phone: number;
  has_phone: number;
  available: string | null;
  description: string | null;
  seller_type: string;
  delivery: number;
  created_at: number;
  owner_name: string;
  verified_business_id: string | null;
  guests: number | null;
  rooms: number | null;
  photos: string | null;
  latitude: number | null;
  longitude: number | null;
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
              listings.offer_type, listings.image_url, listings.show_phone,
              (listings.phone != '') AS has_phone,
              listings.available, listings.description, listings.seller_type,
              listings.delivery, listings.created_at,
              users.display_name AS owner_name,
              verified_business.id AS verified_business_id,
              housing_details.guests, housing_details.rooms, housing_details.photos,
              listing_locations.latitude, listing_locations.longitude
       FROM listings
       JOIN users ON users.id = listings.owner_id
       LEFT JOIN housing_details ON housing_details.listing_id = listings.id
       LEFT JOIN listing_locations ON listing_locations.listing_id = listings.id
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
      <main id="main-content" tabIndex={-1} className="listing-page listing-page-missing">
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


  return (
    <main id="main-content" tabIndex={-1} className="listing-page">
      <RecentViewTracker kind="listing" itemId={listing.id} />
      <header className="listing-page-header">
        <Link className="listing-page-brand" href="/#top" aria-label="Qoldan">
          <span>Q</span>
          <b>Qoldan</b>
        </Link>
        <Link className="listing-page-back" href={isHousingCategory(listing.category) ? '/housing' : '/#catalog'}>
          <ArrowLeft /> {isHousingCategory(listing.category) ? 'Всё жильё' : 'Все объявления'}
        </Link>
      </header>
      <section className="listing-page-shell">
        <article className="listing-page-card">
          {isHousingCategory(listing.category) ? <HousingGallery title={listing.title} photos={getHousingPhotos(listing.image_url, listing.photos)} /> : <div className="listing-page-photo">
            <img src={listing.image_url} alt={listing.title} />
            <span className="listing-page-type">{listing.offer_type}</span>
          </div>}
          <div className="listing-page-content">
            <small>
              {listing.category} · {listing.region}
            </small>
            <h1>{listing.title}</h1>
            <div className="listing-page-price">
              {listing.price}{isHousingCategory(listing.category) ? ' ₸' : ''} <span>{listing.unit || ''}</span>
            </div>
            <p style={{whiteSpace:'pre-line'}}>{listing.description || listingDescription(listing)}</p>
            <div className="listing-page-facts">
              {listing.guests && <span>{listing.rooms} комн. · до {listing.guests} гостей{listing.available ? '' : ' · Свободные даты уточняйте у владельца'}</span>}
              {listing.latitude != null && listing.longitude != null && <a href={`https://www.openstreetmap.org/?mlat=${listing.latitude}&mlon=${listing.longitude}#map=16/${listing.latitude}/${listing.longitude}`} target="_blank" rel="noreferrer"><MapPin /> Посмотреть указанную точку на карте</a>}
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
            <AuctionPanel
              listingId={listing.id}
              signInPath={chatGPTSignInPath(`/listing/${listing.id}`)}
            />
            <div className="listing-page-actions">
              {listing.show_phone && listing.has_phone ? (
                <RevealPhone
                  listingId={listing.id}
                  signInPath={chatGPTSignInPath(`/listing/${listing.id}`)}
                  title={listing.title}
                  whatsappClass="whatsapp"
                />
              ) : (
                <span>Владелец не показывает номер. Напишите ему в чате Qoldan.</span>
              )}
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
