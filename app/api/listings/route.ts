import {
  ensureMarketplaceSchema,
  getMarketplaceDb,
  getMarketplaceImages,
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
import { photoClaimGuardSql, photoReferenceSql, validateHousingPhotos } from '@/lib/server/housing-photos';

const listingImagePattern =
  /^\/api\/media\/([0-9a-f-]{36}\.(?:jpg|png|webp))$/i;

async function discardUnusedUpload(
  db: D1Database,
  ownerId: string,
  key: string,
) {
  try {
    const imageUrl = `/api/media/${key}`;
    const linkedListing = await db
      .prepare(photoReferenceSql + ' LIMIT 1')
      .bind(imageUrl, imageUrl)
      .first();
    if (linkedListing) return;
    await getMarketplaceImages().delete(key);
    await db
      .prepare('DELETE FROM uploads WHERE key = ? AND owner_id = ?')
      .bind(key, ownerId)
      .run();
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
    const id = crypto.randomUUID();
    const now = Date.now();
    const claimedPhotos = input.housing?.photos || [input.imageUrl];
    const listingStatement = db
      .prepare(
        `INSERT INTO listings
         (id, owner_id, title, price, unit, location, region, category,
          offer_type, image_url, phone, available, description, seller_type,
          delivery, livestock_type, livestock_quantity, livestock_price_mode,
          livestock_breed, status, created_at, updated_at)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?
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
