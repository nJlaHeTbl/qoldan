import { z } from 'zod';
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
import { isHousingCategory, normalizeHousingSearch } from '@/lib/housing';
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
  const viewer = await getViewer(request);
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

const editInput = z.object({
  listingId: z.uuid(),
  expectedUpdatedAt: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER - 1),
  data: listingInput,
});

// Owner edits a regular listing: text, price, terms, contacts, photo and place. Category and type stay as published
// (they drive search and attributes); housing has its own editor; a listing with an auction is frozen.
export async function PATCH(request: Request) {
  const viewer = await getViewer(request);
  if (!viewer) return unauthorized();
  try {
    const { listingId, expectedUpdatedAt, data } = await parseJson(request, editInput);
    if (data.auction || data.housing) {
      return Response.json({ error: 'Категорию и тип объявления изменить нельзя' }, { status: 400 });
    }
    const db = getMarketplaceDb();
    const current = await db
      .prepare(
        `SELECT status, category, offer_type, image_url, location, region,
                EXISTS (SELECT 1 FROM auctions WHERE auctions.listing_id = listings.id AND auctions.status <> 'cancelled') AS has_auction
         FROM listings WHERE id = ? AND owner_id = ?`,
      )
      .bind(listingId, viewer.id)
      .first<{ status: string; category: string; offer_type: string; image_url: string; location: string; region: string; has_auction: number }>();
    if (!current) {
      return Response.json({ error: 'Объявление не найдено или принадлежит другому пользователю' }, { status: 404 });
    }
    if (isHousingCategory(current.category)) {
      return Response.json({ error: 'Жильё изменяется в разделе «Жильё»' }, { status: 400 });
    }
    if (!['active', 'paused'].includes(current.status)) {
      return Response.json({ error: 'Объявление ограничено модерацией. Сначала обратитесь в поддержку.' }, { status: 403 });
    }
    if (Number(current.has_auction)) {
      return Response.json({ error: 'Объявление с торгами изменить нельзя' }, { status: 409 });
    }
    if (data.category !== current.category || data.type !== current.offer_type) {
      return Response.json({ error: 'Категорию и тип объявления изменить нельзя' }, { status: 400 });
    }
    // A new photo must be the owner's own upload that no other listing uses (same rules as publishing).
    const photoChanged = data.imageUrl !== current.image_url;
    if (photoChanged) {
      const photoError = await validateHousingPhotos(db, viewer.id, [data.imageUrl], listingId);
      if (photoError) return photoError;
    }
    const updatedAt = Math.max(Date.now(), expectedUpdatedAt + 1);
    const attributes = cleanAttributes(data.category, data.type, data.attributes);
    const listingUpdate = db
      .prepare(
        `UPDATE listings SET title = ?, price = ?, unit = ?, phone = ?, show_phone = ?, available = ?,
           description = ?, seller_type = ?, delivery = ?, livestock_type = ?, livestock_quantity = ?,
           livestock_price_mode = ?, livestock_breed = ?, attributes = ?, image_url = ?, location = ?, region = ?,
           updated_at = ?
         WHERE id = ? AND owner_id = ? AND updated_at = ? AND status IN ('active', 'paused')
           AND NOT EXISTS (SELECT 1 FROM auctions WHERE auctions.listing_id = listings.id AND auctions.status <> 'cancelled')
           ${photoChanged ? `AND ${photoClaimGuardSql('listings.id')}` : ''}`,
      )
      .bind(
        data.title,
        data.price,
        data.unit || null,
        data.phone,
        data.showPhone ? 1 : 0,
        data.available || null,
        data.description || null,
        data.sellerType,
        data.delivery ? 1 : 0,
        data.livestockType || null,
        data.livestockQuantity || null,
        data.livestockPriceMode || null,
        data.livestockBreed || null,
        JSON.stringify(attributes),
        data.imageUrl,
        data.location,
        data.region,
        updatedAt,
        listingId,
        viewer.id,
        expectedUpdatedAt,
        ...(photoChanged ? [JSON.stringify([data.imageUrl]), viewer.id] : []),
      );
    // The map point follows the place: a new point is saved, no point removes the old one. Same atomic batch,
    // and only when the listing row itself was written.
    const locationStatement =
      data.latitude !== undefined && data.longitude !== undefined
        ? db
            .prepare(
              `INSERT INTO listing_locations (listing_id, latitude, longitude, updated_at)
               SELECT ?, ?, ?, ? WHERE changes() = 1
               ON CONFLICT(listing_id) DO UPDATE SET latitude = excluded.latitude,
                 longitude = excluded.longitude, updated_at = excluded.updated_at`,
            )
            .bind(listingId, data.latitude, data.longitude, updatedAt)
        : db.prepare('DELETE FROM listing_locations WHERE listing_id = ? AND changes() = 1').bind(listingId);
    const [result] = await db.batch([listingUpdate, locationStatement]);
    if (!result.meta.changes) {
      if (photoChanged) {
        // The photo may have been claimed by another save meanwhile.
        const lateError = await validateHousingPhotos(db, viewer.id, [data.imageUrl], listingId);
        if (lateError) return lateError;
      }
      return Response.json(
        {
          error:
            'Объявление уже изменилось в другой вкладке. Закройте форму, обновите список и откройте редактирование заново. Ваши правки не записаны.',
        },
        { status: 409 },
      );
    }
    if (photoChanged) {
      // The replaced photo is removed only if nothing else references it.
      const oldKey = listingImagePattern.exec(current.image_url)?.[1];
      if (oldKey) await discardUnusedUpload(db, viewer.id, oldKey);
    }
    return Response.json(
      {
        listing: {
          id: listingId,
          title: data.title,
          price: data.price,
          unit: data.unit || undefined,
          phone: data.phone,
          hasPhone: data.showPhone && Boolean(data.phone),
          available: data.available || undefined,
          description: data.description || undefined,
          sellerType: data.sellerType,
          delivery: data.delivery,
          livestockType: data.livestockType,
          livestockQuantity: data.livestockQuantity,
          livestockPriceMode: data.livestockPriceMode,
          livestockBreed: data.livestockBreed || undefined,
          attributes,
          image: data.imageUrl,
          location: data.location,
          region: data.region,
          latitude: data.latitude,
          longitude: data.longitude,
          updatedAt,
        },
      },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    try {
      return invalidInput(error);
    } catch {
      return serverError(error);
    }
  }
}
