import {
  ensureMarketplaceSchema,
  getMarketplaceDb,
  getRateLimitResponse,
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
import { normalizeHousingSearch } from '@/lib/housing';
import { AUCTION_MAX_ACTIVE_PER_SELLER } from '@/lib/auction';
import { cleanAttributes } from '@/lib/listing-attributes';
import { photoClaimGuardSql, photoReferenceSql, validateHousingPhotos } from '@/lib/server/housing-photos';
import { deleteUnusedUpload } from '@/lib/server/upload-cleanup';

const listingImagePattern =
  /^\/api\/media\/([0-9a-f-]{36}\.(?:jpg|png|webp))$/i;

async function discardUnusedUpload(
  db: D1Database,
  ownerId: string,
  key: string,
) {
  try {
    await deleteUnusedUpload(db, ownerId, key);
  } catch (error) {
    console.error('Unable to clean an unused listing upload', error);
  }
}

export async function POST(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  try {
    const input = await parseJson(request, listingInput);
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const db = getMarketplaceDb();
    const imageKey = listingImagePattern.exec(input.imageUrl)?.[1];
    const ownedUpload = imageKey
      ? await db
          .prepare('SELECT key FROM uploads WHERE key = ? AND owner_id = ?')
          .bind(imageKey, viewer.id)
          .first<{ key: string }>()
      : null;
    if (!imageKey || !ownedUpload) {
      return Response.json(
        { error: 'Фотография не найдена. Загрузите её ещё раз.' },
        { status: 400 },
      );
    }
    const linkedListing = await db
      .prepare(photoReferenceSql + ' LIMIT 1')
      .bind(input.imageUrl, input.imageUrl)
      .first();
    if (linkedListing) {
      return Response.json(
        { error: 'Эта фотография уже используется в объявлении.' },
        { status: 409 },
      );
    }
    if (input.housing) {
      const photoError = await validateHousingPhotos(db, viewer.id, input.housing.photos || [input.imageUrl]);
      if (photoError) return photoError;
    }
    const hourMs = 60 * 60 * 1000;
    const limited = await getRateLimitResponse(
      db
        .prepare(
          `SELECT created_at FROM listings
           WHERE owner_id = ? AND created_at >= ?
           ORDER BY created_at DESC
           LIMIT 1 OFFSET 7`,
        )
        .bind(viewer.id, Date.now() - hourMs),
      hourMs,
      'Можно опубликовать до 8 объявлений в час. Попробуйте немного позже.',
    );
    if (limited) {
      if (!input.housing) await discardUnusedUpload(db, viewer.id, imageKey);
      return limited;
    }
    if (input.auction) {
      const running = await db
        .prepare(
          "SELECT COUNT(*) AS n FROM auctions WHERE seller_id = ? AND status = 'active' AND ends_at > ?",
        )
        .bind(viewer.id, Date.now())
        .first<{ n: number }>();
      if (Number(running?.n) >= AUCTION_MAX_ACTIVE_PER_SELLER) {
        await discardUnusedUpload(db, viewer.id, imageKey);
        return Response.json(
          { error: `Одновременно можно вести до ${AUCTION_MAX_ACTIVE_PER_SELLER} торгов.` },
          { status: 429 },
        );
      }
    }
    const id = crypto.randomUUID();
    const now = Date.now();
    const claimedPhotos = input.housing?.photos || [input.imageUrl];
    const listingStatement = db
      .prepare(
        `INSERT INTO listings
         (id, owner_id, title, price, unit, location, region, category,
          offer_type, image_url, phone, show_phone, available, description, seller_type,
          delivery, livestock_type, livestock_quantity, livestock_price_mode,
          livestock_breed, attributes, status, created_at, updated_at)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?
         WHERE ${photoClaimGuardSql("''")}`,
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
        input.showPhone ? 1 : 0,
        input.available || null,
        input.description || null,
        input.sellerType,
        input.delivery ? 1 : 0,
        input.livestockType || null,
        input.livestockQuantity || null,
        input.livestockPriceMode || null,
        input.livestockBreed || null,
        JSON.stringify(cleanAttributes(input.category, input.type, input.attributes)),
        now,
        now,
        JSON.stringify(claimedPhotos),
        viewer.id,
      );
    try {
      const statements = [listingStatement];
      if (input.housing) {
        statements.push(db.prepare(
          'INSERT INTO housing_details (listing_id, guests, rooms, search_text, location_search, photos) SELECT ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM listings WHERE id = ?)'
        ).bind(id, input.housing.guests, input.housing.rooms,
          normalizeHousingSearch([input.title, input.location, input.description].join(' ')),
          normalizeHousingSearch(input.location), JSON.stringify(claimedPhotos), id));
      }
      if (input.auction) {
        // Same atomic batch as the listing: an auction never exists without its listing and vice versa.
        statements.push(
          db
            .prepare(
              `INSERT INTO auctions
               (id, listing_id, seller_id, start_price, min_step, reserve_price, starts_at, ends_at,
                base_ends_at, status, created_at, updated_at)
               SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?
               WHERE EXISTS (SELECT 1 FROM listings WHERE id = ?)`,
            )
            .bind(
              crypto.randomUUID(),
              id,
              viewer.id,
              input.auction.startPrice,
              input.auction.minStep,
              input.auction.reservePrice ?? null,
              now,
              now + input.auction.durationHours * 3_600_000,
              now + input.auction.durationHours * 3_600_000,
              now,
              now,
              id,
            ),
        );
      }
      if (input.latitude !== undefined && input.longitude !== undefined) {
        statements.push(
          db
            .prepare(
              `INSERT INTO listing_locations
               (listing_id, latitude, longitude, updated_at)
               SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM listings WHERE id = ?)`,
            )
            .bind(id, input.latitude, input.longitude, now, id),
        );
      }
      const written = await db.batch(statements);
      // The photo was claimed by a simultaneous save between the checks above and this write.
      if (!written[0].meta.changes) {
        return Response.json(
          { error: 'Эта фотография уже используется в объявлении.' },
          { status: 409 },
        );
      }
    } catch (error) {
      if (!input.housing) await discardUnusedUpload(db, viewer.id, imageKey);
      throw error;
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
