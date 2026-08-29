import {
  ensureMarketplaceSchema,
  getMarketplaceDb,
  getViewer,
  serverError,
  unauthorized,
  upsertViewer,
} from '@/lib/server/marketplace-db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  try {
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const db = getMarketplaceDb();
    const [listingResult, requestResult, favoriteResult, responseResult] =
      await Promise.all([
        db
          .prepare(
            `SELECT listings.id, listings.title, listings.price, listings.unit,
                    listings.location, listings.region, listings.category,
                    listings.offer_type, listings.image_url, listings.phone,
                    listings.available, listings.description,
                    listings.seller_type, listings.delivery, listings.owner_id,
                    users.display_name AS owner_name
             FROM listings
             JOIN users ON users.id = listings.owner_id
             WHERE listings.status = 'active'
             ORDER BY listings.created_at DESC
             LIMIT 250`,
          )
          .all<Record<string, unknown>>(),
        db
          .prepare(
            `SELECT requests.id, requests.title, requests.place,
                    requests.when_text, requests.budget, requests.kind,
                    requests.region, requests.response_count,
                    requests.owner_id, users.display_name AS owner_name
             FROM requests
             JOIN users ON users.id = requests.owner_id
             WHERE requests.status = 'open'
             ORDER BY requests.created_at DESC
             LIMIT 250`,
          )
          .all<Record<string, unknown>>(),
        db
          .prepare(
            'SELECT listing_id FROM favorites WHERE owner_id = ? ORDER BY created_at DESC',
          )
          .bind(viewer.id)
          .all<{ listing_id: string }>(),
        db
          .prepare(
            `SELECT responses.id, responses.request_id, responses.price,
                    responses.message, users.display_name AS owner_name,
                    responses.owner_id
             FROM responses
             JOIN users ON users.id = responses.owner_id
             JOIN requests ON requests.id = responses.request_id
             WHERE responses.owner_id = ? OR requests.owner_id = ?
             ORDER BY responses.created_at DESC
             LIMIT 250`,
          )
          .bind(viewer.id, viewer.id)
          .all<Record<string, unknown>>(),
      ]);

    return Response.json({
      viewer,
      listings: listingResult.results.map((row) => ({
        id: String(row.id),
        title: row.title,
        price: row.price,
        unit: row.unit || undefined,
        location: row.location,
        region: row.region,
        distance: 'Рядом',
        category: row.category,
        type: row.offer_type,
        image: row.image_url,
        owner: row.owner_name,
        phone: row.phone,
        available: row.available || undefined,
        description: row.description || undefined,
        sellerType: row.seller_type,
        delivery: Boolean(row.delivery),
        mine: row.owner_id === viewer.id,
      })),
      requests: requestResult.results.map((row) => ({
        id: String(row.id),
        title: row.title,
        place: row.place,
        when: row.when_text,
        budget: row.budget,
        responses: Number(row.response_count),
        kind: row.kind,
        region: row.region,
        owner: row.owner_name,
        mine: row.owner_id === viewer.id,
      })),
      favorites: favoriteResult.results.map((row) => row.listing_id),
      responses: responseResult.results.map((row) => ({
        id: String(row.id),
        requestId: String(row.request_id),
        price: row.price,
        message: row.message || '',
        owner: row.owner_name,
        mine: row.owner_id === viewer.id,
      })),
    });
  } catch (error) {
    return serverError(error);
  }
}
