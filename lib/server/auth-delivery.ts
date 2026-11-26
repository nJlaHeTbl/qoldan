// Delivery of one-time sign-in codes. The provider is chosen per channel with environment variables, so switching
// from one provider to another needs no code change. Keys come from the hosting panel only, never from the repository.
//
//   QOLDAN_AUTH_SENDER=console           print codes to the server log (local development only)
//   QOLDAN_AUTH_EMAIL_PROVIDER=resend    + RESEND_API_KEY, QOLDAN_AUTH_EMAIL_FROM ("Qoldan <login@your-domain>")
//   QOLDAN_AUTH_SMS_PROVIDER=twilio      + TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM (sender id or number)
//
// Providers are compared in docs/AUTH_PROVIDERS.md. A local Kazakhstan SMS gateway is added here as one more entry
// in SMS_PROVIDERS once the owner has chosen one and signed its contract.

export type DeliveryChannel = 'phone' | 'email';
export type DeliverySender = (channel: DeliveryChannel, destination: string, code: string) => Promise<void>;
type Fetcher = typeof fetch;

export type DeliveryEnv = {
  QOLDAN_AUTH_SENDER?: string;
  QOLDAN_AUTH_EMAIL_PROVIDER?: string;
  QOLDAN_AUTH_EMAIL_FROM?: string;
  RESEND_API_KEY?: string;
  QOLDAN_AUTH_SMS_PROVIDER?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_FROM?: string;
};

type ChannelSender = (destination: string, code: string) => Promise<void>;

const messageText = (code: string) => `Qoldan: ${code} — код входа / кіру коды / sign-in code. Никому не сообщайте.`;

function need(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

async function ensureOk(response: Response, provider: string) {
  if (response.ok) return;
  // Status only: provider error bodies can echo the recipient or credentials.
  throw new Error(`${provider} responded with HTTP ${response.status}`);
}

const EMAIL_PROVIDERS: Record<string, (env: DeliveryEnv, doFetch: Fetcher) => ChannelSender> = {
  resend: (env, doFetch) => async (destination, code) => {
    const response = await doFetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${need(env.RESEND_API_KEY, 'RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: need(env.QOLDAN_AUTH_EMAIL_FROM, 'QOLDAN_AUTH_EMAIL_FROM'),
        to: [destination],
        subject: `Qoldan: ${code}`,
        text: `${messageText(code)}\n\nКод действует 10 минут. Если вы не запрашивали код, просто проигнорируйте письмо.`,
      }),
    });
    await ensureOk(response, 'Resend');
  },
};

const SMS_PROVIDERS: Record<string, (env: DeliveryEnv, doFetch: Fetcher) => ChannelSender> = {
  twilio: (env, doFetch) => async (destination, code) => {
    const sid = need(env.TWILIO_ACCOUNT_SID, 'TWILIO_ACCOUNT_SID');
    const token = need(env.TWILIO_AUTH_TOKEN, 'TWILIO_AUTH_TOKEN');
    const response = await doFetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${btoa(`${sid}:${token}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: destination, From: need(env.TWILIO_FROM, 'TWILIO_FROM'), Body: messageText(code) }).toString(),
    });
    await ensureOk(response, 'Twilio');
  },
};

/** Returns the configured sender, or null when no provider is set up for either channel. */
export function createCodeSender(env: DeliveryEnv, doFetch: Fetcher = fetch): DeliverySender | null {
  if (env.QOLDAN_AUTH_SENDER === 'console') {
    return async (channel, destination, code) => {
      console.log(JSON.stringify({ event: 'auth_code_dev', channel, destination, code }));
    };
  }
  const emailFactory = Object.hasOwn(EMAIL_PROVIDERS, env.QOLDAN_AUTH_EMAIL_PROVIDER ?? '') ? EMAIL_PROVIDERS[env.QOLDAN_AUTH_EMAIL_PROVIDER as string] : undefined;
  const smsFactory = Object.hasOwn(SMS_PROVIDERS, env.QOLDAN_AUTH_SMS_PROVIDER ?? '') ? SMS_PROVIDERS[env.QOLDAN_AUTH_SMS_PROVIDER as string] : undefined;
  if (!emailFactory && !smsFactory) return null;
  const email = emailFactory?.(env, doFetch);
  const sms = smsFactory?.(env, doFetch);
  return async (channel, destination, code) => {
    const send = channel === 'email' ? email : sms;
    if (!send) throw new Error(`No provider configured for channel ${channel}`);
    await send(destination, code);
  };
}
