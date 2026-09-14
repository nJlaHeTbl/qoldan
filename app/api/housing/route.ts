import { z } from 'zod';
import { getMarketplaceDb, getViewer, serverError, unauthorized } from '@/lib/server/marketplace-db';
import { HOUSING_CATEGORIES, isHousingCategory, normalizeHousingSearch } from '@/lib/housing';
import { listingInput, parseJson, invalidInput } from '@/lib/server/marketplace-schemas';
import { KAZAKHSTAN_REGION_FILTERS } from '@/lib/regions';

const filters = z.object({
  region: z.enum(KAZAKHSTAN_REGION_FILTERS).default('Весь Казахстан'),
  kind: z.enum(['all', ...HOUSING_CATEGORIES]).default('all'),
  q: z.string().trim().max(160).default(''),
  place: z.array(z.string().trim().min(1).max(160)).max(30).default([]),
  maxPrice: z.coerce.number().int().min(0).max(9999999).default(0),
  guests: z.coerce.number().int().min(0).max(50).default(0),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  view: z.enum(['all', 'mine', 'favorites']).default('all'),
});
export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = filters.safeParse({ ...Object.fromEntries(url.searchParams), place: url.searchParams.getAll('place') });
  if (!parsed.success) return Response.json({ error: 'Проверьте параметры поиска жилья' }, { status: 400 });
  const f = parsed.data, viewer = getViewer(request);
  if (f.view !== 'all' && !viewer) return unauthorized();
  try {
    const conditions = ["l.category IN ('Посуточные квартиры', 'Гостиницы')"];
    const values: (string | number)[] = [viewer?.id || '', viewer?.id || ''];
    if (f.view === 'mine') { conditions.push('l.owner_id = ?'); values.push(viewer!.id); }
    else conditions.push("l.status = 'active'");
    if (f.view === 'favorites') conditions.push('fav.listing_id IS NOT NULL');
    if (f.region !== 'Весь Казахстан') { conditions.push('l.region = ?'); values.push(f.region); }
    if (f.kind !== 'all') { conditions.push('l.category = ?'); values.push(f.kind); }
    if (f.q) { conditions.push('instr(h.search_text, ?) > 0'); values.push(normalizeHousingSearch(f.q)); }
    if (f.place.length) {
      conditions.push('(' + f.place.map(() => 'instr(h.location_search, ?) > 0').join(' OR ') + ')');
      values.push(...f.place.map(normalizeHousingSearch));
    }
    if (f.maxPrice) { conditions.push('CAST(l.price AS INTEGER) <= ?'); values.push(f.maxPrice); }
    if (f.guests) { conditions.push('h.guests >= ?'); values.push(f.guests); }
    const result = await getMarketplaceDb().prepare(`
      SELECT l.id, l.title, l.price, l.category, l.location, l.region, l.image_url AS image,
             l.description, l.phone, l.available, l.status, u.display_name AS owner,
             l.updated_at AS updatedAt, l.seller_type AS sellerType,
             h.guests, h.rooms, p.latitude, p.longitude,
             (l.owner_id = ?) AS mine, (fav.listing_id IS NOT NULL) AS favorite
      FROM listings l JOIN housing_details h ON h.listing_id = l.id
      JOIN users u ON u.id = l.owner_id
      LEFT JOIN listing_locations p ON p.listing_id = l.id
      LEFT JOIN favorites fav ON fav.listing_id = l.id AND fav.owner_id = ?
      WHERE ${conditions.join(' AND ')}
      ORDER BY l.created_at DESC, l.id DESC LIMIT 25 OFFSET ?
    `).bind(...values, (f.page - 1) * 24).all<Record<string, unknown>>();
    return Response.json({
      items: result.results.slice(0, 24).map(row => ({ ...row, mine: Boolean(row.mine), favorite: Boolean(row.favorite) })),
      hasMore: result.results.length > 24,
    }, { headers: { 'cache-control': 'private, no-store' } });
  } catch (error) { return serverError(error); }
}

const editInput = z.object({
  listingId: z.string().uuid(),
  expectedUpdatedAt: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER - 1),
  data: listingInput,
});

export async function PATCH(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  try {
    const { listingId, expectedUpdatedAt, data } = await parseJson(request, editInput);
    if (!isHousingCategory(data.category) || !data.housing) {
      return Response.json({ error: 'Выберите тип жилья и заполните характеристики' }, { status: 400 });
    }
    const db = getMarketplaceDb();
    const current = await db.prepare(
      `SELECT l.status, l.image_url FROM listings l
       JOIN housing_details h ON h.listing_id = l.id
       WHERE l.id = ? AND l.owner_id = ? AND l.category IN ('Посуточные квартиры', 'Гостиницы')`
    ).bind(listingId, viewer.id).first<{ status: string; image_url: string }>();
    if (!current) return Response.json({ error: 'Объявление не найдено или принадлежит другому пользователю' }, { status: 404 });
    if (!['active', 'paused'].includes(current.status)) {
      return Response.json({ error: 'Объявление ограничено модерацией. Сначала обратитесь в поддержку.' }, { status: 403 });
    }
    if (data.imageUrl !== current.image_url) {
      const owned = await db.prepare(
        'SELECT key FROM uploads WHERE key = ? AND owner_id = ?'
      ).bind(data.imageUrl.slice('/api/media/'.length), viewer.id).first();
      if (!owned) return Response.json({ error: 'Фотография не найдена. Загрузите её ещё раз.' }, { status: 400 });
      const linked = await db.prepare('SELECT id FROM listings WHERE image_url = ? AND id != ?')
        .bind(data.imageUrl, listingId).first();
      if (linked) return Response.json({ error: 'Эта фотография используется в другом объявлении.' }, { status: 409 });
    }
    const updatedAt = Math.max(Date.now(), expectedUpdatedAt + 1);
    const statements = [
      db.prepare(`UPDATE listings SET title = ?, price = ?, unit = '/ сутки', location = ?, region = ?,
        category = ?, offer_type = 'Сдам', image_url = ?, phone = ?, available = ?, description = ?,
        seller_type = ?, updated_at = ?
        WHERE id = ? AND owner_id = ? AND updated_at = ? AND status IN ('active', 'paused')
          AND EXISTS (SELECT 1 FROM housing_details WHERE listing_id = listings.id)`)
        .bind(data.title, data.price, data.location, data.region, data.category, data.imageUrl, data.phone,
          data.available || null, data.description || null, data.sellerType, updatedAt, listingId, viewer.id, expectedUpdatedAt),
      // The batch is atomic; a stale first update must not touch the search index or coordinates.
      db.prepare('UPDATE housing_details SET guests = ?, rooms = ?, search_text = ?, location_search = ? WHERE listing_id = ? AND changes() = 1')
        .bind(data.housing.guests, data.housing.rooms,
          normalizeHousingSearch([data.title, data.location, data.description].join(' ')),
          normalizeHousingSearch(data.location), listingId),
    ];
    if (data.latitude !== undefined && data.longitude !== undefined) {
      statements.push(db.prepare(`INSERT INTO listing_locations (listing_id, latitude, longitude, updated_at)
        SELECT ?, ?, ?, ? WHERE changes() = 1
        ON CONFLICT(listing_id) DO UPDATE SET latitude = excluded.latitude, longitude = excluded.longitude, updated_at = excluded.updated_at`)
        .bind(listingId, data.latitude, data.longitude, updatedAt));
    } else {
      statements.push(db.prepare('DELETE FROM listing_locations WHERE listing_id = ? AND changes() = 1').bind(listingId));
    }
    const result = await db.batch(statements);
    if (!result[0].meta.changes) return Response.json({
      error: 'Объявление уже изменилось в другой вкладке. Закройте форму, обновите список и откройте редактирование заново. Ваши правки не записаны.',
    }, { status: 409 });
    return Response.json({ listingId, updatedAt }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    try { return invalidInput(error); } catch { return serverError(error); }
  }
}
