import { exportAccount } from '@/lib/server/account';
import {
  ensureMarketplaceSchema,
  getMarketplaceDb,
  getViewer,
  serverError,
  unauthorized,
} from '@/lib/server/marketplace-db';

export const dynamic = 'force-dynamic';

// Right of access: the signed-in user downloads everything Qoldan stores about them as JSON.
export async function GET(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  try {
    await ensureMarketplaceSchema();
    const payload = await exportAccount(getMarketplaceDb(), viewer.id);
    const date = new Date().toISOString().slice(0, 10);
    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': `attachment; filename="qoldan-data-${date}.json"`,
        'cache-control': 'private, no-store',
      },
    });
  } catch (error) {
    return serverError(error);
  }
}
