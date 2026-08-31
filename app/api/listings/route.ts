import {
  ensureMarketplaceSchema,
  getMarketplaceDb,
  getViewer,
  serverError,
  unauthorized,
  upsertViewer,
} from '@/lib/server/marketplace-db';
import {
  invalidInput,
  listingInput,
  parseJson,
} from '@/lib/server/marketplace-schemas';

export async function POST(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  try {
    const input = await parseJson(request, listingInput);
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const id = crypto.randomUUID();
    const now = Date.now();
    const db = getMarketplaceDb();
    const listingStatement = db
      .prepare(
        `INSERT INTO listings
         (id, owner_id, title, price, unit, location, region, category,
          offer_type, image_url, phone, available, description, seller_type,
          delivery, livestock_type, livestock_quantity, livestock_price_mode,
          livestock_breed, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      )
      .bind(
        id,
        viewer.id,
        input.title,
        input.price,
        input.unit || null,
        input.location,
        input.region,
        input.category,
        input.type,
        input.imageUrl,
        input.phone,
        input.available || null,
        input.description || null,
        input.sellerType,
        input.delivery ? 1 : 0,
        input.livestockType || null,
        input.livestockQuantity || null,
        input.livestockPriceMode || null,
        input.livestockBreed || null,
        now,
        now,
      );
    if (input.latitude !== undefined && input.longitude !== undefined) {
      await db.batch([
        listingStatement,
        db
          .prepare(
            `INSERT INTO listing_locations
             (listing_id, latitude, longitude, updated_at)
             VALUES (?, ?, ?, ?)`,
          )
          .bind(id, input.latitude, input.longitude, now),
      ]);
    } else {
      await listingStatement.run();
    }
    return Response.json(
      {
        listing: {
          id,
          ownerId: viewer.id,
          title: input.title,
          price: input.price,
          unit: input.unit || undefined,
          location: input.location,
          region: input.region,
          distance: 'Рядом',
          category: input.category,
          type: input.type,
          image: input.imageUrl,
          owner: viewer.displayName,
          phone: input.phone,
          available: input.available || undefined,
          description: input.description || undefined,
          sellerType: input.sellerType,
          delivery: input.delivery,
          livestockType: input.livestockType,
          livestockQuantity: input.livestockQuantity,
          livestockPriceMode: input.livestockPriceMode,
          livestockBreed: input.livestockBreed || undefined,
          status: 'active',
          createdAt: now,
          latitude: input.latitude,
          longitude: input.longitude,
          mine: true,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    try {
      return invalidInput(error);
    } catch {
      return serverError(error);
    }
  }
}
