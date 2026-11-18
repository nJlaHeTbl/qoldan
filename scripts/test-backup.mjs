// Tests scripts/backup.mjs: consistent SQLite copy with integrity check, incremental photo copy, retention, restore.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, utimesSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { backup } from './backup.mjs';

const root = mkdtempSync(join(tmpdir(), 'qoldan-backup-'));
try {
  const dbPath = join(root, 'qoldan.sqlite');
  const images = join(root, 'images');
  const out = join(root, 'backups');
  mkdirSync(images);
  const live = new DatabaseSync(dbPath);
  live.exec("CREATE TABLE listings (id TEXT PRIMARY KEY, title TEXT); INSERT INTO listings VALUES ('a', 'Трактор'), ('b', 'Кирпич')");
  writeFileSync(join(images, 'one.png'), 'png-1');

  // Backup while the database is open (as on a running server).
  const first = backup({ db: dbPath, images, out, now: new Date('2026-11-19T03:00:00Z') });
  assert.ok(existsSync(first.file));
  assert.equal(first.imagesCopied, 1);
  const copy = new DatabaseSync(first.file);
  assert.deepEqual(copy.prepare('SELECT title FROM listings ORDER BY id').all().map((row) => row.title), ['Трактор', 'Кирпич']);
  copy.close();

  // Next day: one new photo, an old backup past retention is removed.
  writeFileSync(join(images, 'two.png'), 'png-2');
  const stale = join(out, 'db', 'qoldan-2026-09-01T03-00-00-000Z.sqlite');
  copyFileSync(first.file, stale);
  const old = new Date('2026-09-01T03:00:00Z');
  utimesSync(stale, old, old);
  const second = backup({ db: dbPath, images, out, now: new Date('2026-11-20T03:00:00Z') });
  assert.equal(second.imagesCopied, 1, 'only the new photo is copied');
  assert.equal(second.oldRemoved, 1, 'backups older than 30 days are removed');
  assert.equal(readdirSync(join(out, 'db')).length, 2);

  // Restore: replace the live file with the copy; data is back.
  live.exec("DELETE FROM listings");
  live.close();
  copyFileSync(second.file, dbPath);
  const restored = new DatabaseSync(dbPath);
  assert.equal(restored.prepare('SELECT COUNT(*) AS n FROM listings').get().n, 2, 'restore brings the data back');
  restored.close();
} finally {
  rmSync(root, { recursive: true, force: true });
}
console.log('PASS backup: consistent SQLite copy while open, integrity check, incremental photos, 30-day retention, restore.');
