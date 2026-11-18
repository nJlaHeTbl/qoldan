// Stand-in for `cloudflare:workers` when Qoldan runs on an ordinary Node server (QOLDAN_TARGET=node build,
// see vite.config.ts). Provides the same `env` bindings: DB (SQLite file), IMAGES (file store) and the QOLDAN_*
// settings from the process environment. Pending migrations from ./drizzle are applied on start.
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createFileImageStore, createSqliteD1 } from '@/lib/server/portable';

const dataDir = resolve(process.env.QOLDAN_DATA_DIR || 'data');
const dbPath = resolve(process.env.QOLDAN_DB_PATH || join(dataDir, 'qoldan.sqlite'));
mkdirSync(dirname(dbPath), { recursive: true });

const DB = createSqliteD1(dbPath);
const IMAGES = createFileImageStore(resolve(process.env.QOLDAN_IMAGES_DIR || join(dataDir, 'images')));

/** Applies drizzle/*.sql files that are not recorded yet, each in its own transaction. */
function migrate(dir: string) {
  if (!existsSync(dir)) {
    console.warn(JSON.stringify({ event: 'migrations_dir_missing', dir }));
    return;
  }
  DB.sqlite.exec('CREATE TABLE IF NOT EXISTS qoldan_migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)');
  const applied = new Set(
    (DB.sqlite.prepare('SELECT name FROM qoldan_migrations').all() as Array<{ name: string }>).map((row) => row.name),
  );
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.sql')).sort()) {
    if (applied.has(file)) continue;
    DB.sqlite.exec('BEGIN');
    try {
      DB.sqlite.exec(readFileSync(join(dir, file), 'utf8'));
      DB.sqlite.prepare('INSERT INTO qoldan_migrations (name, applied_at) VALUES (?, ?)').run(file, Date.now());
      DB.sqlite.exec('COMMIT');
      console.log(JSON.stringify({ event: 'migration_applied', file }));
    } catch (error) {
      DB.sqlite.exec('ROLLBACK');
      throw error;
    }
  }
}
migrate(resolve(process.env.QOLDAN_MIGRATIONS_DIR || 'drizzle'));

const settings = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => key.startsWith('QOLDAN_')),
) as Record<string, string>;

export const env = { ...settings, DB, IMAGES };
