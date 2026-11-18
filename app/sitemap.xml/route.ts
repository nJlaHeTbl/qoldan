import { LEGAL_DOCS } from '@/lib/legal';
import { ensureMarketplaceSchema, getMarketplaceDb } from '@/lib/server/marketplace-db';

export const dynamic = 'force-dynamic';

const STATIC_PATHS = ['/', '/housing', '/legal', ...LEGAL_DOCS.map((doc) => doc.href)];
const MAX_ITEMS = 20000;

const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

// Live sitemap: public pages plus every active listing and open request, so search engines can
// index real offers. Hidden, paused and moderated items are never listed; no personal data.
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const today = isoDate(Date.now());
  const urls: Array<{ loc: string; lastmod: string }> = STATIC_PATHS.map((path) => ({
    loc: origin + path,
    lastmod: today,
  }));
  try {
    await ensureMarketplaceSchema();
    const db = getMarketplaceDb();
    const [listingRows, requestRows] = await Promise.all([
      db
        .prepare(
          `SELECT id, updated_at FROM listings WHERE status = 'active'
           ORDER BY updated_at DESC LIMIT ?`,
        )
        .bind(MAX_ITEMS)
        .all<{ id: string; updated_at: number }>(),
      db
        .prepare(
          `SELECT id, updated_at FROM requests WHERE status = 'open'
           ORDER BY updated_at DESC LIMIT ?`,
        )
        .bind(MAX_ITEMS)
        .all<{ id: string; updated_at: number }>(),
    ]);
    for (const row of listingRows.results) {
      urls.push({ loc: `${origin}/listing/${encodeURIComponent(row.id)}`, lastmod: isoDate(Number(row.updated_at)) });
    }
    for (const row of requestRows.results) {
      urls.push({ loc: `${origin}/request/${encodeURIComponent(row.id)}`, lastmod: isoDate(Number(row.updated_at)) });
    }
  } catch (error) {
    // Without the database the sitemap still lists the public pages.
    console.error(error);
  }
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => `  <url><loc>${url.loc}</loc><lastmod>${url.lastmod}</lastmod></url>`),
    '</urlset>',
    '',
  ].join('\n');
  return new Response(body, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
}
