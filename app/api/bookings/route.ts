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
    const db = getMarketplaceDb();
    const listing = await db
      .prepare(
        `SELECT listings.owner_id, listings.title, listings.phone,
                users.display_name AS owner_name
         FROM listings
         JOIN users ON users.id = listings.owner_id
         WHERE listings.id = ? AND listings.status = 'active'`,
      )
      .bind(input.listingId)
      .first<{
        owner_id: string;
        title: string;
        phone: string;
        owner_name: string;
      }>();
    if (!listing) {
      return Response.json(
        { error: 'Объявление не найдено или временно недоступно' },
        { status: 404 },
      );
    }
    if (listing?.owner_id === viewer.id) {
      return Response.json(
        { error: 'Нельзя бронировать собственное объявление' },
        { status: 409 },
      );
    }
    const id = crypto.randomUUID();
    await db
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
      {
        booking: {
          id,
          listingId: input.listingId,
          listingTitle: listing.title,
          dateFrom: input.dateFrom,
          dateTo: input.dateTo,
          contactPhone: listing.phone,
          counterparty: listing.owner_name,
          delivery: input.delivery,
          comment: input.comment,
          status: 'pending',
          incoming: false,
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
