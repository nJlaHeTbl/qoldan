import { authMode, clearedSessionCookie, endSession, isSafeReturnPath } from '@/lib/server/auth';
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

// Sign out from a plain link (the menu uses a link): clears the session and returns to a safe relative page.
export async function GET(request: Request) {
  const env = getMarketplaceBindings();
  if (authMode(env) !== 'own') return new Response('Not found', { status: 404 });
  try {
    await endSession(getMarketplaceDb(), env, request);
  } catch (error) {
    console.error(error);
  }
  const target = new URL(request.url).searchParams.get('return_to') || '/';
  // Only same-site relative paths: no '//' or backslashes (browsers read '/\x' as '//x'), no API targets.
  const safe = isSafeReturnPath(target) ? target : '/';
  return new Response(null, { status: 303, headers: { location: safe, 'set-cookie': clearedSessionCookie(), 'cache-control': 'no-store' } });
}
