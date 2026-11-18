// Backup for self-hosting: a consistent copy of the SQLite database (VACUUM INTO works while the server runs),
// verified with an integrity check, plus new photo files; copies older than the retention period are removed.
// Run daily (cron / systemd timer). Restore steps: docs/INFRASTRUCTURE.md, section 4.
//   node scripts/backup.mjs --db data/qoldan.sqlite --images data/images --out /backups/qoldan [--keep-days 30]
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

export function backup({ db, images, out, keepDays = 30, now = new Date() }) {
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const target = resolve(out);
  mkdirSync(join(target, 'db'), { recursive: true });

  const file = join(target, 'db', `qoldan-${stamp}.sqlite`);
  const source = new DatabaseSync(resolve(db));
  try {
    source.prepare('VACUUM INTO ?').run(file);
  } finally {
    source.close();
  }
  const copy = new DatabaseSync(file);
  const check = copy.prepare('PRAGMA integrity_check').get();
  copy.close();
  if (check?.integrity_check !== 'ok') throw new Error('backup integrity check failed: ' + JSON.stringify(check));

  // Photos never change after upload (immutable keys), so copying only missing files is enough.
  let copied = 0;
  if (images && existsSync(images)) {
    mkdirSync(join(target, 'images'), { recursive: true });
    for (const name of readdirSync(images)) {
      const destination = join(target, 'images', name);
      if (!existsSync(destination)) {
        copyFileSync(join(images, name), destination);
        copied += 1;
      }
    }
  }

  const cutoff = now.getTime() - keepDays * 24 * 60 * 60 * 1000;
  let removed = 0;
  for (const name of readdirSync(join(target, 'db'))) {
    const path = join(target, 'db', name);
    if (name.startsWith('qoldan-') && name.endsWith('.sqlite') && statSync(path).mtimeMs < cutoff) {
      rmSync(path, { force: true });
      removed += 1;
    }
  }
  return { file, imagesCopied: copied, oldRemoved: removed };
}

// fileURLToPath decodes non-Latin folder names (the project path contains Cyrillic).
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const arg = (name, fallback) => {
    const index = process.argv.indexOf(name);
    return index > -1 ? process.argv[index + 1] : fallback;
  };
  const result = backup({
    db: arg('--db', 'data/qoldan.sqlite'),
    images: arg('--images', 'data/images'),
    out: arg('--out', 'backups'),
    keepDays: Number(arg('--keep-days', '30')),
  });
  console.log(JSON.stringify({ event: 'backup_done', ...result }));
}
