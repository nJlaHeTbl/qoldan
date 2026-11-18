import {
  ensureMarketplaceSchema,
  getMarketplaceDb,
  getViewer,
  serverError,
  upsertViewer,
} from '@/lib/server/marketplace-db';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

type ProviderRow = {
  id: string;
  display_name: string;
  created_at: number;
  organization_name: string | null;
  profile_type: string | null;
  region: string | null;
  verified_business_id: string | null;
};

export async function GET(request: Request, context: RouteContext) {
  const authenticatedViewer = getViewer(request);
  const viewer = authenticatedViewer || {
    id: '__qoldan_public_guest__',
    email: '',
    displayName: 'Гость',
  };

  try {
    const { id } = await context.params;
    const providerId = id.trim();
    if (!providerId || providerId.length > 160) {
      return Response.json({ error: 'Профиль не найден' }, { status: 404 });
    }

    await ensureMarketplaceSchema();
    if (authenticatedViewer) await upsertViewer(authenticatedViewer);
    const db = getMarketplaceDb();
    const provider = await db
      .prepare(
        `SELECT users.id, users.display_name, users.created_at,
                business_verifications.id AS verified_business_id,
                business_verifications.organization_name,
                business_verifications.profile_type,
                business_verifications.region
         FROM users
         LEFT JOIN business_verifications
           ON business_verifications.owner_id = users.id
          AND business_verifications.status = 'verified'
         WHERE users.id = ?`,
      )
      .bind(providerId)
      .first<ProviderRow>();

    if (!provider) {
      return Response.json({ error: 'Профиль не найден' }, { status: 404 });
    }

    const [
      listingResult,
      serviceStats,
      rentalStats,
      completedStats,
      activeStats,
      serviceReviews,
      rentalReviews,
    ] = await Promise.all([
      db
        .prepare(
          `SELECT listings.id, listings.title, listings.price, listings.unit,
                    listings.location, listings.region, listings.category,
                    listings.offer_type, listings.image_url, listings.phone, listings.show_phone,
                    listings.available, listings.description,
                    listings.seller_type, listings.delivery, listings.owner_id,
                    listings.livestock_type, listings.livestock_quantity,
                    listings.livestock_price_mode, listings.livestock_breed,
                    listings.status, listing_locations.latitude,
                    listing_locations.longitude, review_stats.rating_average,
                    review_stats.review_count
             FROM listings
             LEFT JOIN listing_locations
               ON listing_locations.listing_id = listings.id
             LEFT JOIN (
               SELECT listing_id, AVG(rating) AS rating_average,
                      COUNT(*) AS review_count
               FROM reviews
               GROUP BY listing_id
             ) AS review_stats ON review_stats.listing_id = listings.id
             WHERE listings.owner_id = ? AND listings.status = 'active'
             ORDER BY listings.created_at DESC
             LIMIT 30`,
        )
        .bind(providerId)
        .all<Record<string, unknown>>(),
      db
        .prepare(
          `SELECT AVG(rating) AS rating_average, COUNT(*) AS review_count
             FROM request_reviews
             WHERE provider_id = ?`,
        )
        .bind(providerId)
        .first<{ rating_average: number | null; review_count: number }>(),
      db
        .prepare(
          `SELECT AVG(rating) AS rating_average, COUNT(*) AS review_count
             FROM reviews
             WHERE reviewee_id = ?`,
        )
        .bind(providerId)
        .first<{ rating_average: number | null; review_count: number }>(),
      db
        .prepare(
          `SELECT COUNT(*) AS completed_count
             FROM request_selections
             JOIN responses ON responses.id = request_selections.response_id
             WHERE responses.owner_id = ?
               AND request_selections.status = 'completed'`,
        )
        .bind(providerId)
        .first<{ completed_count: number }>(),
      db
        .prepare(
          `SELECT COUNT(*) AS active_count
           FROM listings
           WHERE owner_id = ? AND status = 'active'`,
        )
        .bind(providerId)
        .first<{ active_count: number }>(),
      db
        .prepare(
          `SELECT request_reviews.id, request_reviews.rating,
                    request_reviews.comment, request_reviews.created_at,
                    requests.title AS subject_title,
                    reviewers.display_name AS reviewer_name
             FROM request_reviews
             JOIN requests ON requests.id = request_reviews.request_id
             JOIN users reviewers ON reviewers.id = request_reviews.reviewer_id
             WHERE request_reviews.provider_id = ?
             ORDER BY request_reviews.created_at DESC
             LIMIT 10`,
        )
        .bind(providerId)
        .all<Record<string, unknown>>(),
      db
        .prepare(
          `SELECT reviews.id, reviews.rating, reviews.comment,
                    reviews.created_at,
                    CASE WHEN listings.status = 'active'
                         THEN listings.title
                         ELSE 'Завершённая аренда'
                    END AS subject_title,
                    reviewers.display_name AS reviewer_name
             FROM reviews
             JOIN listings ON listings.id = reviews.listing_id
             JOIN users reviewers ON reviewers.id = reviews.reviewer_id
             WHERE reviews.reviewee_id = ?
             ORDER BY reviews.created_at DESC
             LIMIT 10`,
        )
        .bind(providerId)
        .all<Record<string, unknown>>(),
    ]);

    const mapReview = (row: Record<string, unknown>) => ({
      id: String(row.id),
      rating: Number(row.rating),
      comment: (row.comment as string) || '',
      subjectTitle: row.subject_title as string,
      reviewer: row.reviewer_name as string,
      createdAt: Number(row.created_at),
    });
    const verified = Boolean(provider.verified_business_id);

    return Response.json({
      profile: {
        id: provider.id,
        displayName: verified
          ? provider.organization_name || provider.display_name
          : provider.display_name,
        joinedAt: Number(provider.created_at),
        verified,
        organizationName: verified
          ? provider.organization_name || undefined
          : undefined,
        businessType: verified ? provider.profile_type || undefined : undefined,
        region: verified ? provider.region || undefined : undefined,
        serviceRating:
          typeof serviceStats?.rating_average === 'number'
            ? Number(serviceStats.rating_average).toFixed(1)
            : undefined,
        serviceReviewCount: Number(serviceStats?.review_count || 0),
        rentalRating:
          typeof rentalStats?.rating_average === 'number'
            ? Number(rentalStats.rating_average).toFixed(1)
            : undefined,
        rentalReviewCount: Number(rentalStats?.review_count || 0),
        completedWorkCount: Number(completedStats?.completed_count || 0),
        activeListingCount: Number(activeStats?.active_count || 0),
        listings: listingResult.results.map((row) => ({
          id: String(row.id),
          ownerId: row.owner_id,
          title: row.title,
          price: row.price,
          unit: row.unit || undefined,
          location: row.location,
          region: row.region,
          distance: 'Рядом',
          category: row.category,
          type: row.offer_type,
          image: row.image_url,
          owner: verified
            ? provider.organization_name || provider.display_name
            : provider.display_name,
          phone: row.owner_id === viewer.id ? row.phone : undefined,
          hasPhone: Boolean(row.show_phone) && Boolean(row.phone),
          available: row.available || undefined,
          description: row.description || undefined,
          sellerType: row.seller_type,
          verified,
          businessType: verified
            ? provider.profile_type || undefined
            : undefined,
          delivery: Boolean(row.delivery),
          livestockType: row.livestock_type || undefined,
          livestockQuantity:
            typeof row.livestock_quantity === 'number'
              ? row.livestock_quantity
              : undefined,
          livestockPriceMode: row.livestock_price_mode || undefined,
          livestockBreed: row.livestock_breed || undefined,
          status: row.status,
          latitude: typeof row.latitude === 'number' ? row.latitude : undefined,
          longitude:
            typeof row.longitude === 'number' ? row.longitude : undefined,
          mine: row.owner_id === viewer.id,
          rating:
            typeof row.rating_average === 'number'
              ? Number(row.rating_average).toFixed(1)
              : undefined,
          reviewCount: Number(row.review_count || 0),
        })),
        serviceReviews: serviceReviews.results.map(mapReview),
        rentalReviews: rentalReviews.results.map(mapReview),
      },
    });
  } catch (error) {
    return serverError(error);
  }
}
