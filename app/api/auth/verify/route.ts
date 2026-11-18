import { z } from 'zod';
import { authMode, enabledChannels, normalizeDestination, sessionCookie, verifyCode } from '@/lib/server/auth';
import { getMarketplaceBindings, getMarketplaceDb, serverError } from '@/lib/server/marketplace-db';
import { invalidInput, parseJson } from '@/lib/server/marketplace-schemas';

const input = z
  .object({
    channel: z.enum(['phone', 'email']),
    destination: z.string().trim().min(5).max(254),
    code: z.string().trim().regex(/^\d{6}$/, 'Код состоит из 6 цифр'),
  })
  .strict();

// Step 2 of own sign-in: check the code and set the session cookie. Disabled (404) unless QOLDAN_AUTH_MODE=own.
export async function POST(request: Request) {
  const env = getMarketplaceBindings();
  if (authMode(env) !== 'own') return new Response('Not found', { status: 404 });
  try {
    const { channel, destination, code } = await parseJson(request, input);
    const normalized = enabledChannels(env).includes(channel) ? normalizeDestination(channel, destination) : null;
    if (!normalized) return Response.json({ error: 'Неверный или устаревший код' }, { status: 400 });
    const outcome = await verifyCode(getMarketplaceDb(), env, channel, normalized, code);
    if (!outcome.ok) return Response.json({ error: outcome.error }, { status: outcome.status });
    return Response.json(
      { signedIn: true, newAccount: outcome.value.created },
      { headers: { 'set-cookie': sessionCookie(outcome.value.token), 'cache-control': 'no-store' } },
    );
  } catch (error) {
    try {
      return invalidInput(error);
    } catch {
      return serverError(error);
    }
  }
}
