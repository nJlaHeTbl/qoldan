import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

// Exercise the actual route SQL with stale preflight reads, not copied queries.
const source = readFileSync(new URL('../app/api/responses/selection/route.ts', import.meta.url), 'utf8');
const queries = [...source.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
const find = (text) => {
  const query = queries.find((query) => query.includes(text));
  assert.ok(query, `Missing route query: ${text}`);
  return query;
};
const db = new DatabaseSync(':memory:');
db.exec(`
  CREATE TABLE requests (id TEXT PRIMARY KEY, owner_id TEXT, status TEXT, updated_at INTEGER);
  CREATE TABLE request_selections (request_id TEXT PRIMARY KEY, response_id TEXT,
    selected_by TEXT, status TEXT, selected_at INTEGER, updated_at INTEGER, completed_at INTEGER);
  INSERT INTO requests VALUES ('request', 'owner', 'open', 0);
`);
const select = (response) => {
  db.exec('BEGIN');
  const inserted = db.prepare(find('INSERT INTO request_selections')).run(
    'request', response, 'owner', 1, 1, 'request', 'owner');
  const closed = db.prepare(find("UPDATE requests SET status = 'closed'")).run(1, 'request', 'owner');
  db.exec('COMMIT');
  return [inserted.changes, closed.changes];
};
const cancel = () => {
  db.exec('BEGIN');
  const cancelled = db.prepare(find("SET status = 'cancelled'")).run(2, 'request');
  const opened = db.prepare(find("UPDATE requests SET status = 'open'")).run(2, 'request', 'owner');
  db.exec('COMMIT');
  return [cancelled.changes, opened.changes];
};
assert.deepEqual(select('first'), [1, 1]);
assert.deepEqual(select('second'), [0, 0], 'stale second selection must not undo winner');
assert.equal(db.prepare('SELECT response_id FROM request_selections').get().response_id, 'first');
assert.equal(db.prepare('SELECT status FROM requests').get().status, 'closed');
assert.deepEqual(cancel(), [1, 1]);
assert.deepEqual(cancel(), [0, 0]);
assert.deepEqual(select('second'), [1, 1], 'cancelled selection can be replaced');
db.prepare(find("SET status = 'completed'")).run(3, 3, 'request');
assert.deepEqual(cancel(), [0, 0], 'stale cancellation must not reopen completed work');
assert.equal(db.prepare('SELECT status FROM requests').get().status, 'closed');
db.exec("DELETE FROM request_selections; UPDATE requests SET status = 'closed'");
assert.deepEqual(select('third'), [0, 0], 'closed request cannot receive a selection');
console.log('PASS: competing selections, repeated cancellation, reselection, completed and closed requests');
db.close();
