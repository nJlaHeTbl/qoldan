import {
  ensureMarketplaceSchema,
  getMarketplaceDb,
  getViewer,
  serverError,
  unauthorized,
  upsertViewer,
} from '@/lib/server/marketplace-db';
import {
  bookingInput,
  invalidInput,
  parseJson,
} from '@/lib/server/marketplace-schemas';

export async function POST(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  try {
    const input = await parseJson(request, bookingInput);
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const id = crypto.randomUUID();
    await getMarketplaceDb()
      .prepare(
        `INSERT INTO bookings
         (id, listing_id, owner_id, date_from, date_to, customer_phone,
          delivery, comment, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      )
      .bind(
        id,
        input.listingId,
        viewer.id,
        input.dateFrom,
        input.dateTo,
        input.customerPhone,
        input.delivery ? 1 : 0,
        input.comment || null,
        Date.now(),
      )
      .run();
    return Response.json(
      { booking: { id, status: 'pending' } },
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
