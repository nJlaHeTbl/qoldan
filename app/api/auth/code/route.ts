import { z } from 'zod';
import { authMode, enabledChannels, normalizeDestination, requestCode } from '@/lib/server/auth';
import { getMarketplaceBindings, getMarketplaceDb, serverError } from '@/lib/server/marketplace-db';
import { invalidInput, parseJson } from '@/lib/server/marketplace-schemas';

const input = z
  .object({
    channel: z.enum(['phone', 'email']),
    destination: z.string().trim().min(5).max(254),
    consent: z.literal(true, { error: 'Подтвердите согласие на обработку номера или e-mail для входа' }),
  })
  .strict();

// Step 1 of own sign-in: send a one-time code. Disabled (404) unless QOLDAN_AUTH_MODE=own.
export async function POST(request: Request) {
  const env = getMarketplaceBindings();
  if (authMode(env) !== 'own') return new Response('Not found', { status: 404 });
  try {
    const { channel, destination } = await parseJson(request, input);
    if (!enabledChannels(env).includes(channel)) {
      return Response.json({ error: 'Этот способ входа сейчас недоступен' }, { status: 400 });
    }
    const normalized = normalizeDestination(channel, destination);
    if (!normalized) {
      return Response.json(
        { error: channel === 'phone' ? 'Проверьте номер телефона' : 'Проверьте адрес e-mail' },
        { status: 400 },
      );
    }
    const outcome = await requestCode(getMarketplaceDb(), env, channel, normalized);
    if (!outcome.ok) return Response.json({ error: outcome.error }, { status: outcome.status });
    return Response.json({ sent: true, destination: normalized }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    try {
      return invalidInput(error);
    } catch {
      return serverError(error);
    }
  }
}
