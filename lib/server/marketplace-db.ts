import { env } from 'cloudflare:workers';

export type Viewer = {
  id: string;
  email: string;
  displayName: string;
};

type MarketplaceBindings = Cloudflare.Env & {
  DB: D1Database;
  IMAGES: R2Bucket;
  QOLDAN_ADMIN_USER_IDS?: string;
  QOLDAN_ADMIN_EMAILS?: string;
};

export function getMarketplaceBindings() {
  return env as MarketplaceBindings;
}

export function getMarketplaceDb() {
  const db = getMarketplaceBindings().DB;
  if (!db) throw new Error('D1 binding DB is unavailable');
  return db;
}

export function getMarketplaceImages() {
  const images = getMarketplaceBindings().IMAGES;
  if (!images) throw new Error('R2 binding IMAGES is unavailable');
  return images;
}

function decodeDisplayName(request: Request) {
  const encoded = request.headers.get('oai-authenticated-user-full-name');
  const encoding = request.headers.get(
    'oai-authenticated-user-full-name-encoding',
  );
  if (!encoded || encoding !== 'percent-encoded-utf-8') return '';
  try {
    return decodeURIComponent(encoded).trim();
  } catch {
    return '';
  }
}

export function getViewer(request: Request): Viewer | null {
  const id = request.headers.get('oai-authenticated-user-id');
  const email = request.headers.get('oai-authenticated-user-email');
  if (id && email) {
    return {
      id,
      email,
      displayName:
        decodeDisplayName(request) ||
        email.split('@')[0] ||
        'Пользователь Qoldan',
    };
  }

  const hostname = new URL(request.url).hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return {
      id: 'local-qoldan-user',
      email: 'local@qoldan.test',
      displayName: 'Азамат',
    };
  }
  return null;
}

export function canModerate(viewer: Viewer) {
  if (viewer.id === 'local-qoldan-user') return true;
  const bindings = getMarketplaceBindings();
  const configuredIds = bindings.QOLDAN_ADMIN_USER_IDS || '';
  const configuredEmails = bindings.QOLDAN_ADMIN_EMAILS || '';
  const idMatches = configuredIds
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .includes(viewer.id);
  const emailMatches = configuredEmails
    .split(',')
    .map((email) => email.trim().toLocaleLowerCase())
    .filter(Boolean)
    .includes(viewer.email.toLocaleLowerCase());
  return idMatches || emailMatches;
}

export function ensureMarketplaceSchema() {
  return Promise.resolve();
}
export async function upsertViewer(viewer: Viewer) {
  const now = Date.now();
  await getMarketplaceDb()
    .prepare(
      `INSERT INTO users (id, email, display_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         email = excluded.email,
         display_name = excluded.display_name,
         updated_at = excluded.updated_at`,
    )
    .bind(viewer.id, viewer.email, viewer.displayName, now, now)
    .run();
}

export async function getRateLimitResponse(
  statement: D1PreparedStatement,
  windowMs: number,
  message: string,
) {
  const recent = await statement.first<{ created_at: number }>();
  if (!recent) return null;

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((Number(recent.created_at) + windowMs - Date.now()) / 1000),
  );
  return Response.json(
    {
      error: message,
      code: 'rate_limited',
      retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        'cache-control': 'no-store',
        'retry-after': String(retryAfterSeconds),
      },
    },
  );
}

export function unauthorized() {
  return Response.json(
    { error: 'Войдите в Qoldan, чтобы продолжить' },
    { status: 401 },
  );
}

export function forbidden() {
  return Response.json(
    { error: 'Этот раздел доступен только команде модерации' },
    { status: 403 },
  );
}

export function serverError(error: unknown) {
  console.error(error);
  return Response.json(
    { error: 'Сервис временно недоступен. Попробуйте ещё раз.' },
    { status: 500 },
  );
}
