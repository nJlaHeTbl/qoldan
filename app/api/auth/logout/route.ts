import { authMode, clearedSessionCookie, endSession } from '@/lib/server/auth';
import { getMarketplaceBindings, getMarketplaceDb, serverError } from '@/lib/server/marketplace-db';

// Sign out: deletes the session server-side and clears the cookie. Disabled (404) unless QOLDAN_AUTH_MODE=own.
export async function POST(request: Request) {
  const env = getMarketplaceBindings();
  if (authMode(env) !== 'own') return new Response('Not found', { status: 404 });
  try {
    await endSession(getMarketplaceDb(), env, request);
    return Response.json({ signedOut: true }, { headers: { 'set-cookie': clearedSessionCookie(), 'cache-control': 'no-store' } });
  } catch (error) {
    return serverError(error);
  }
}
