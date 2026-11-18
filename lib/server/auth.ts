// Own sign-in with one-time codes (phone or e-mail), for self-hosting. Off by default: on the ChatGPT platform
// the platform signs users in. Enabled with QOLDAN_AUTH_MODE=own. Only hashes of codes and tokens are stored.

export type AuthChannel = 'phone' | 'email';

export const AUTH = {
  codeTtlMs: 10 * 60 * 1000,
  maxAttempts: 5,
  codesPer15Min: 3,
  codesPerDay: 10,
  sessionTtlMs: 30 * 24 * 60 * 60 * 1000,
  cookie: 'qoldan_session',
} as const;

type AuthEnv = {
  QOLDAN_AUTH_MODE?: string;
  QOLDAN_AUTH_SECRET?: string;
  QOLDAN_AUTH_CHANNELS?: string;
  /** 'console' prints codes to the server log — for local development only. */
  QOLDAN_AUTH_SENDER?: string;
};

export const authMode = (env: AuthEnv) => (env.QOLDAN_AUTH_MODE === 'own' ? 'own' : 'platform');

export function enabledChannels(env: AuthEnv): AuthChannel[] {
  const list = (env.QOLDAN_AUTH_CHANNELS || 'phone,email').split(',').map((item) => item.trim());
  return (['phone', 'email'] as const).filter((channel) => list.includes(channel));
}

/** Normalises a phone (Kazakhstan, +7 and 10 digits) or an e-mail; returns null when invalid. */
export function normalizeDestination(channel: AuthChannel, raw: string): string | null {
  const value = raw.trim();
  if (channel === 'email') {
    const email = value.toLowerCase();
    return /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i.test(email) && email.length <= 254 ? email : null;
  }
  let digits = value.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) digits = '7' + digits.slice(1);
  if (digits.length === 10) digits = '7' + digits;
  return digits.length === 11 && digits.startsWith('7') ? '+' + digits : null;
}

const toHex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');

export async function secretHash(env: AuthEnv, value: string) {
  const secret = env.QOLDAN_AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error('QOLDAN_AUTH_SECRET must be set (32+ characters)');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
}

/** Uniform 6-digit code (rejection sampling, no modulo bias). */
export function generateCode() {
  const buffer = new Uint32Array(1);
  const limit = Math.floor(0xffffffff / 1_000_000) * 1_000_000;
  for (;;) {
    crypto.getRandomValues(buffer);
    if (buffer[0] < limit) return String(buffer[0] % 1_000_000).padStart(6, '0');
  }
}

function sameText(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export type CodeSender = (channel: AuthChannel, destination: string, code: string) => Promise<void>;

/** The configured delivery. Real SMS / e-mail providers are plugged in here when the owner picks one. */
export function getCodeSender(env: AuthEnv): CodeSender | null {
  if (env.QOLDAN_AUTH_SENDER === 'console') {
    return async (channel, destination, code) => {
      console.log(JSON.stringify({ event: 'auth_code_dev', channel, destination, code }));
    };
  }
  return null;
}

type Outcome<T> = { ok: true; value: T } | { ok: false; status: number; error: string };

export async function requestCode(
  db: D1Database,
  env: AuthEnv,
  channel: AuthChannel,
  destination: string,
  now = Date.now(),
): Promise<Outcome<null>> {
  const sender = getCodeSender(env);
  if (!sender) return { ok: false, status: 503, error: 'Отправка кодов пока не настроена' };
  const recent = await db
    .prepare(
      `SELECT
         SUM(CASE WHEN created_at >= ?3 THEN 1 ELSE 0 END) AS short_count,
         COUNT(*) AS day_count
       FROM auth_codes WHERE channel = ?1 AND destination = ?2 AND created_at >= ?4`,
    )
    .bind(channel, destination, now - 15 * 60 * 1000, now - 24 * 60 * 60 * 1000)
    .first<{ short_count: number | null; day_count: number }>();
  if (Number(recent?.short_count ?? 0) >= AUTH.codesPer15Min || Number(recent?.day_count ?? 0) >= AUTH.codesPerDay) {
    return { ok: false, status: 429, error: 'Слишком много запросов кода. Попробуйте позже.' };
  }
  const code = generateCode();
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO auth_codes (id, channel, destination, code_hash, attempts, expires_at, created_at)
       VALUES (?, ?, ?, ?, 0, ?, ?)`,
    )
    .bind(id, channel, destination, await secretHash(env, `code:${channel}:${destination}:${code}`), now + AUTH.codeTtlMs, now)
    .run();
  try {
    await sender(channel, destination, code);
  } catch (error) {
    await db.prepare('DELETE FROM auth_codes WHERE id = ?').bind(id).run();
    console.error(error);
    return { ok: false, status: 502, error: 'Не удалось отправить код. Попробуйте ещё раз.' };
  }
  return { ok: true, value: null };
}

export async function verifyCode(
  db: D1Database,
  env: AuthEnv,
  channel: AuthChannel,
  destination: string,
  code: string,
  now = Date.now(),
): Promise<Outcome<{ token: string; userId: string; created: boolean }>> {
  const wrong = { ok: false as const, status: 400, error: 'Неверный или устаревший код' };
  const latest = await db
    .prepare(
      // Only the most recent code counts: issuing a new code voids the older ones.
      `SELECT id, code_hash, attempts, consumed_at, expires_at FROM auth_codes
       WHERE channel = ? AND destination = ?
       ORDER BY created_at DESC, rowid DESC LIMIT 1`,
    )
    .bind(channel, destination)
    .first<{ id: string; code_hash: string; attempts: number; consumed_at: number | null; expires_at: number }>();
  if (!latest || latest.consumed_at !== null || latest.expires_at <= now) return wrong;
  // Count the attempt first and atomically, so parallel guesses cannot exceed the limit.
  const counted = await db
    .prepare('UPDATE auth_codes SET attempts = attempts + 1 WHERE id = ? AND attempts < ? AND consumed_at IS NULL')
    .bind(latest.id, AUTH.maxAttempts)
    .run();
  if (!counted.meta.changes) {
    return { ok: false, status: 429, error: 'Слишком много попыток. Запросите новый код.' };
  }
  const expected = await secretHash(env, `code:${channel}:${destination}:${code.trim()}`);
  if (!sameText(expected, latest.code_hash)) return wrong;
  const consumed = await db
    .prepare('UPDATE auth_codes SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL')
    .bind(now, latest.id)
    .run();
  if (!consumed.meta.changes) return wrong;

  let created = false;
  let userId = (
    await db
      .prepare('SELECT user_id FROM login_identities WHERE channel = ? AND destination = ?')
      .bind(channel, destination)
      .first<{ user_id: string }>()
  )?.user_id;
  if (!userId) {
    userId = crypto.randomUUID();
    created = true;
    await db.batch([
      db
        .prepare('INSERT INTO users (id, email, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
        .bind(userId, channel === 'email' ? destination : '', 'Пользователь Qoldan', now, now),
      db
        .prepare('INSERT INTO login_identities (id, user_id, channel, destination, created_at) VALUES (?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), userId, channel, destination, now),
    ]);
  }
  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  const token = btoa(String.fromCharCode(...tokenBytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  await db
    .prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)')
    .bind(await secretHash(env, `session:${token}`), userId, now, now + AUTH.sessionTtlMs, now)
    .run();
  return { ok: true, value: { token, userId, created } };
}

export function readSessionToken(request: Request) {
  const cookie = request.headers.get('cookie') || '';
  for (const part of cookie.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === AUTH.cookie) return rest.join('=') || null;
  }
  return null;
}

export async function sessionUser(db: D1Database, env: AuthEnv, request: Request, now = Date.now()) {
  const token = readSessionToken(request);
  if (!token || token.length > 200) return null;
  return db
    .prepare(
      `SELECT users.id, users.email, users.display_name FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
    )
    .bind(await secretHash(env, `session:${token}`), now)
    .first<{ id: string; email: string; display_name: string }>();
}

export async function endSession(db: D1Database, env: AuthEnv, request: Request) {
  const token = readSessionToken(request);
  if (!token) return;
  await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await secretHash(env, `session:${token}`)).run();
}

export const sessionCookie = (token: string) =>
  `${AUTH.cookie}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.floor(AUTH.sessionTtlMs / 1000)}`;
export const clearedSessionCookie = () => `${AUTH.cookie}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
