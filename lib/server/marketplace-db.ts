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
};

let schemaPromise: Promise<void> | undefined;

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
  const configured = getMarketplaceBindings().QOLDAN_ADMIN_USER_IDS || '';
  return configured
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .includes(viewer.id);
}

export async function ensureMarketplaceSchema() {
  if (schemaPromise) return schemaPromise;
  schemaPromise = (async () => {
    const db = getMarketplaceDb();
    await db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY NOT NULL,
        email TEXT NOT NULL,
        display_name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS listings (
        id TEXT PRIMARY KEY NOT NULL,
        owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        price TEXT NOT NULL,
        unit TEXT,
        location TEXT NOT NULL,
        region TEXT NOT NULL,
        category TEXT NOT NULL,
        offer_type TEXT NOT NULL,
        image_url TEXT NOT NULL,
        phone TEXT NOT NULL,
        available TEXT,
        description TEXT,
        seller_type TEXT NOT NULL,
        delivery INTEGER DEFAULT 0 NOT NULL,
        status TEXT DEFAULT 'active' NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS listing_locations (
        listing_id TEXT PRIMARY KEY NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        updated_at INTEGER NOT NULL
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS requests (
        id TEXT PRIMARY KEY NOT NULL,
        owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        place TEXT NOT NULL,
        when_text TEXT NOT NULL,
        budget TEXT NOT NULL,
        kind TEXT NOT NULL,
        region TEXT NOT NULL,
        status TEXT DEFAULT 'open' NOT NULL,
        response_count INTEGER DEFAULT 0 NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS responses (
        id TEXT PRIMARY KEY NOT NULL,
        request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
        owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        price TEXT NOT NULL,
        message TEXT,
        created_at INTEGER NOT NULL
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS favorites (
        owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        listing_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (owner_id, listing_id)
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY NOT NULL,
        listing_id TEXT NOT NULL,
        owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date_from TEXT NOT NULL,
        date_to TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        delivery INTEGER DEFAULT 0 NOT NULL,
        comment TEXT,
        status TEXT DEFAULT 'pending' NOT NULL,
        created_at INTEGER NOT NULL
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS uploads (
        key TEXT PRIMARY KEY NOT NULL,
        owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY NOT NULL,
        owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'new' NOT NULL,
        review_note TEXT,
        reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at INTEGER,
        created_at INTEGER NOT NULL
      )`),
    ]);
    await db.batch([
      db.prepare(
        'CREATE INDEX IF NOT EXISTS listings_status_created_at_idx ON listings (status, created_at)',
      ),
      db.prepare(
        'CREATE INDEX IF NOT EXISTS listings_region_status_idx ON listings (region, status)',
      ),
      db.prepare(
        'CREATE INDEX IF NOT EXISTS listings_owner_id_idx ON listings (owner_id)',
      ),
      db.prepare(
        'CREATE INDEX IF NOT EXISTS listings_category_offer_type_idx ON listings (category, offer_type)',
      ),
      db.prepare(
        'CREATE INDEX IF NOT EXISTS requests_status_created_at_idx ON requests (status, created_at)',
      ),
      db.prepare(
        'CREATE INDEX IF NOT EXISTS requests_region_kind_idx ON requests (region, kind)',
      ),
      db.prepare(
        'CREATE INDEX IF NOT EXISTS requests_owner_id_idx ON requests (owner_id)',
      ),
      db.prepare(
        'CREATE INDEX IF NOT EXISTS responses_request_id_created_at_idx ON responses (request_id, created_at)',
      ),
      db.prepare(
        'CREATE INDEX IF NOT EXISTS responses_owner_id_idx ON responses (owner_id)',
      ),
      db.prepare(
        'CREATE INDEX IF NOT EXISTS bookings_listing_id_created_at_idx ON bookings (listing_id, created_at)',
      ),
      db.prepare(
        'CREATE INDEX IF NOT EXISTS bookings_owner_id_idx ON bookings (owner_id)',
      ),
      db.prepare(
        'CREATE INDEX IF NOT EXISTS uploads_owner_id_idx ON uploads (owner_id)',
      ),
      db.prepare(
        'CREATE INDEX IF NOT EXISTS reports_owner_id_created_at_idx ON reports (owner_id, created_at)',
      ),
      db.prepare(
        'CREATE INDEX IF NOT EXISTS reports_status_created_at_idx ON reports (status, created_at)',
      ),
      db.prepare(
        'CREATE INDEX IF NOT EXISTS reports_target_idx ON reports (target_type, target_id)',
      ),
    ]);
    await db.prepare('PRAGMA optimize').run();
  })();
  return schemaPromise;
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
