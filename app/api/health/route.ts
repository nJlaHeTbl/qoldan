import { getMarketplaceDb } from '@/lib/server/marketplace-db';

export const dynamic = 'force-dynamic';

// Health check for uptime monitoring: answers fast, touches the database with a trivial query, reveals no data.
export async function GET() {
  const started = Date.now();
  try {
    await getMarketplaceDb().prepare('SELECT 1 AS ok').first();
    return Response.json(
      { status: 'ok', db: 'ok', ms: Date.now() - started },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    console.error(JSON.stringify({ event: 'health_db_failed', message: error instanceof Error ? error.message : 'unknown' }));
    return Response.json({ status: 'error', db: 'unavailable' }, { status: 503, headers: { 'cache-control': 'no-store' } });
  }
}
