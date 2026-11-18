// Tests for the self-hosting adapters (lib/server/portable.ts): D1-compatible SQLite and an R2-compatible file
// store. The route suites (test-requests, test-auctions, test-account, test-chat) also run on createSqliteD1.
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileImageStore, createSqliteD1 } from '../lib/server/portable.ts';

// --- database: D1 call shapes, atomic batches, changes() chaining, foreign keys ---
const db = createSqliteD1();
await db.exec('CREATE TABLE parent (id TEXT PRIMARY KEY); CREATE TABLE child (id TEXT PRIMARY KEY, parent_id TEXT NOT NULL REFERENCES parent(id) ON DELETE CASCADE, n INTEGER NOT NULL DEFAULT 0)');
assert.equal((await db.prepare('INSERT INTO parent (id) VALUES (?)').bind('p1').run()).meta.changes, 1);
assert.deepEqual(await db.prepare('SELECT id FROM parent WHERE id = ?').bind('p1').first(), { id: 'p1' });
assert.equal(await db.prepare('SELECT id FROM parent WHERE id = ?').bind('nope').first(), null);
await assert.rejects(
  db.batch([
    db.prepare('INSERT INTO child (id, parent_id) VALUES (?, ?)').bind('c1', 'p1'),
    db.prepare('INSERT INTO child (id, parent_id) VALUES (?, ?)').bind('c2', 'missing-parent'),
  ]),
  /FOREIGN KEY/,
);
assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM child').first()).n, 0, 'a failed batch rolls back completely');
const chained = await db.batch([
  db.prepare('INSERT INTO child (id, parent_id) SELECT ?, ? WHERE 0').bind('c3', 'p1'),
  db.prepare('UPDATE child SET n = n + 1 WHERE changes() = 1'),
]);
assert.deepEqual(chained.map((result) => result.meta.changes), [0, 0], 'changes() sees the previous statement');
await db.prepare('INSERT INTO child (id, parent_id) VALUES (?, ?)').bind('c4', 'p1').run();
await db.prepare('DELETE FROM parent WHERE id = ?').bind('p1').run();
assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM child').first()).n, 0, 'cascades work (foreign keys on)');
const all = await db.prepare('SELECT 1 AS one UNION SELECT 2').all();
assert.deepEqual(all.results.map((row) => row.one), [1, 2]);

// --- file store: put / get / delete, metadata and safety ---
const dir = mkdtempSync(join(tmpdir(), 'qoldan-store-'));
try {
  const store = createFileImageStore(dir);
  const key = '0f9c2d1e-1111-4222-8333-444455556666.png';
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF6kAAAAASUVORK5CYII=', 'base64');
  const stream = new Response(png).body;
  const put = await store.put(key, stream, { httpMetadata: { contentType: 'image/png' } });
  assert.equal(put.size, png.length);
  const object = await store.get(key);
  assert.ok(object);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  assert.equal(headers.get('content-type'), 'image/png');
  assert.match(object.httpEtag, /^"[0-9a-f]{32}"$/);
  assert.deepEqual(Buffer.from(await new Response(object.body).arrayBuffer()), png, 'the bytes come back unchanged');
  assert.equal(await store.get('00000000-0000-4000-8000-000000000000.png'), null, 'a missing key returns null');
  await assert.rejects(store.put('../escape.png', 'x'), /Invalid storage key/, 'no path traversal');
  await assert.rejects(store.get('sub/dir.png'), /Invalid storage key/);
  await store.delete(key);
  assert.equal(await store.get(key), null);
  assert.equal(existsSync(join(dir, key)), false);
  await store.delete(key); // deleting twice is harmless
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log('PASS portable: D1-compatible SQLite (atomic batches, changes() chaining, cascades) and R2-compatible file store (metadata, etag, traversal guard).');
