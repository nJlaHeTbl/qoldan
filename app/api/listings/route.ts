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
    await getMarketplaceDb()
      .prepare(
        `INSERT INTO listings
         (id, owner_id, title, price, unit, location, region, category,
          offer_type, image_url, phone, available, description, seller_type,
          delivery, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
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
        now,
        now,
      )
      .run();
    return Response.json(
      {
        listing: {
          id,
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
