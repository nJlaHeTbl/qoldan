import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const source = readFileSync(new URL('../app/api/responses/route.ts', import.meta.url), 'utf8');
const queries = [...source.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE requests (id TEXT PRIMARY KEY, owner_id TEXT, status TEXT, response_count INTEGER, updated_at INTEGER);
CREATE TABLE responses (id TEXT PRIMARY KEY, request_id TEXT, owner_id TEXT, price TEXT, message TEXT, created_at INTEGER, UNIQUE(request_id, owner_id));
INSERT INTO requests VALUES ('r', 'author', 'open', 0, 0);`);
const insert = db.prepare(queries.find((q) => q.includes('INSERT INTO responses')));
const update = db.prepare(queries.find((q) => q.includes('UPDATE requests')));
function submit(id, owner) {
  db.exec('BEGIN');
  try {
    const result = insert.run(id, 'r', owner, '1000', null, 1, 'r', owner);
    update.run(1, 'r');
    db.exec('COMMIT');
    return result.changes;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
assert.equal(submit('one', 'provider'), 1);
assert.throws(() => submit('duplicate', 'provider'), /UNIQUE constraint/);
assert.equal(submit('self', 'author'), 0);
db.exec("UPDATE requests SET status = 'closed'");
assert.equal(submit('late', 'other'), 0);
assert.equal(db.prepare('SELECT response_count FROM requests').get().response_count, 1);
assert.equal(db.prepare('SELECT COUNT(*) AS count FROM responses').get().count, 1);
db.close();
console.log('PASS: normal response, duplicate rollback, own request, closed request, accurate count');
