import { z } from 'zod';
import { getMarketplaceDb, getViewer, serverError, unauthorized } from '@/lib/server/marketplace-db';
import { HOUSING_CATEGORIES, normalizeHousingSearch } from '@/lib/housing';
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
