// Isolated real route/SQLite integration tests for personal-data self-service: export and account
// deletion. No network or production writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createSqliteD1 } from '../lib/server/portable.ts';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import * as housing from '../lib/housing.ts';
import * as regions from '../lib/regions.ts';
const require = createRequire(import.meta.url), db = createSqliteD1(), sqlite = db.sqlite;
for (const file of fs.readdirSync('drizzle').filter(name => name.endsWith('.sql')).sort()) sqlite.exec(fs.readFileSync('drizzle/' + file, 'utf8'));
const blobs = new Map();
const images = { async put(key, stream) { blobs.set(key, await new Response(stream).arrayBuffer()); }, async delete(key) { blobs.delete(key); } };
const loaded = new Map();
function compile(path) {
  if (loaded.has(path)) return loaded.get(path);
  const result = {};
  const output = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const resolver = name => {
    if (name === 'cloudflare:workers') return { env: { DB: db, IMAGES: images, QOLDAN_ADMIN_USER_IDS: 'mod' } };
    if (name === '@/lib/housing') return housing;
    if (name === '@/lib/regions') return regions;
    if (name.startsWith('@/')) return compile(name.slice(2) + '.ts');
    return require(name);
  };
  vm.compileFunction(output, ['require', 'exports'], { filename: path })(resolver, result); loaded.set(path, result); return result;
}
const requests = compile('app/api/requests/route.ts');
const responses = compile('app/api/responses/route.ts');
const listings = compile('app/api/listings/route.ts');
const phoneRoute = compile('app/api/listings/phone/route.ts');
const uploads = compile('app/api/uploads/route.ts');
const identity = id => id ? { 'oai-authenticated-user-id': id, 'oai-authenticated-user-email': id + '@qoldan.test' } : {};
const req = (path, method, body, id = 'owner', origin = 'https://qoldan.example') => {
  const init = { method, headers: { ...identity(id), ...(body instanceof FormData ? {} : { 'content-type': 'application/json' }) } };
  if (body !== undefined) init.body = body instanceof FormData ? body : JSON.stringify(body);
  return new Request(origin + path, init);
};
const ok = async (promise, status, label) => { const response = await promise; assert.equal(response.status, status, `${label}: ${await response.clone().text()}`); return response; };
const accountRoute = compile('app/api/account/route.ts');
const exportRoute = compile('app/api/account/export/route.ts');
const auctions = compile('app/api/auctions/route.ts');

// --- coverage: every table that references users is exported or deliberately skipped ---
const accountSource = fs.readFileSync('lib/server/account.ts', 'utf8');
const exported = new Set([...accountSource.matchAll(/\['(\w+)', '/g)].map(match => match[1]));
// sessions hold only token hashes: exporting them would help nobody and is a security risk.
const skipped = new Set(['users', 'sessions']);
for (const { name } of sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all()) {
  if (name.startsWith('sqlite') || name.startsWith('_') || skipped.has(name)) continue;
  const pointsToUsers = sqlite.prepare(`PRAGMA foreign_key_list(${name})`).all().some(fk => fk.table === 'users');
  if (pointsToUsers) assert.ok(exported.has(name), `table ${name} stores user data but is missing from EXPORT_TABLES`);
}

// --- fixtures: alice publishes, responds, bids and is moderated; bob is an unrelated user ---
const png = () => { const form = new FormData(); form.append('image', new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF6kAAAAASUVORK5CYII=', 'base64')], 'test.png', { type: 'image/png' })); return form; };
const publish = async (who, title) => {
  const imageUrl = (await (await ok(uploads.POST(req('/api/uploads', 'POST', png(), who)), 201, 'upload')).json()).url;
  return (await (await ok(listings.POST(req('/api/listings', 'POST', { title, category: 'Спецтехника', price: '50000', unit: '', type: 'Продам', region: 'Область Жетісу', location: 'Талдыкорган', description: 'Тестовое описание без настоящего объекта.', phone: '+70000000001', sellerType: 'Частное лицо', imageUrl, delivery: false }, who)), 201, 'publish')).json()).listing;
};
const aliceListing = await publish('alice', 'LOCAL TEST Алиса продаёт каток');
const bobListing = await publish('bob', 'LOCAL TEST Боб продаёт генератор');
const bobRequest = (await (await ok(requests.POST(req('/api/requests', 'POST', { title: 'LOCAL TEST Бобу нужен трактор', place: 'Талдыкорган', when: 'В сентябре', budget: 'Договорная', kind: 'agro', region: 'Область Жетісу' }, 'bob')), 201, 'bob request')).json()).request;
await ok(responses.POST(req('/api/responses', 'POST', { requestId: bobRequest.id, price: '1000', message: 'Алиса откликается' }, 'alice')), 201, 'alice responds');
await ok(responses.POST(req('/api/responses', 'POST', { requestId: bobRequest.id, price: '2000', message: 'Карл откликается' }, 'carl')), 201, 'carl responds');
await ok(phoneRoute.POST(req('/api/listings/phone', 'POST', { listingId: bobListing.id }, 'alice')), 200, 'alice reveals bob phone');
sqlite.prepare("INSERT OR IGNORE INTO users (id, email, display_name, created_at, updated_at) VALUES ('mod', 'mod@qoldan.test', 'Модератор', 1, 1)").run();
sqlite.prepare("INSERT INTO moderation_actions (id, target_type, target_id, target_owner_id, target_title, moderator_id, action, note, created_at) VALUES ('m1', 'listing', ?, 'alice', 'LOCAL TEST Алиса продаёт каток', 'mod', 'warn', 'Проверка модерации', ?)").run(aliceListing.id, Date.now());
assert.equal(sqlite.prepare('SELECT response_count FROM requests WHERE id = ?').get(bobRequest.id).response_count, 2);

// --- export ---
await ok(exportRoute.GET(req('/api/account/export', 'GET', undefined, null)), 401, 'guest export');
const exportResponse = await ok(exportRoute.GET(req('/api/account/export', 'GET', undefined, 'alice')), 200, 'export');
assert.match(exportResponse.headers.get('content-disposition'), /attachment; filename="qoldan-data-/);
assert.equal(exportResponse.headers.get('cache-control'), 'private, no-store');
const dump = await exportResponse.json();
assert.equal(dump.user.id, 'alice');
assert.deepEqual(dump.data.listings.map(row => row.title), ['LOCAL TEST Алиса продаёт каток']);
assert.equal(dump.data.responses.length, 1);
assert.equal(dump.data.phone_reveals.length, 1);
assert.equal(dump.data.uploads.length, 1);
assert.equal(dump.data.moderation_actions.length, 1);
assert.ok(!('moderator_id' in dump.data.moderation_actions[0]), 'staff identity is redacted');
const dumpText = JSON.stringify(dump);
assert.ok(!dumpText.includes('Боб продаёт') && !dumpText.includes('Карл откликается'), 'other people\'s content is not exported');

// --- deletion guards ---
const del = (who, body) => accountRoute.DELETE(req('/api/account', 'DELETE', body, who));
await ok(del(null, { confirm: 'УДАЛИТЬ' }), 401, 'guest delete');
await ok(del('alice', {}), 400, 'confirmation required');
await ok(del('alice', { confirm: 'да' }), 400, 'exact confirmation word');
const auctionId = crypto.randomUUID();
sqlite.prepare("INSERT INTO auctions (id, listing_id, seller_id, start_price, min_step, starts_at, ends_at, base_ends_at, status, current_bid, bid_count, leader_id, created_at, updated_at) VALUES (?, ?, 'bob', 100, 10, ?, ?, ?, 'active', 100, 1, 'alice', ?, ?)").run(auctionId, bobListing.id, Date.now() - 1000, Date.now() + 3600_000, Date.now() + 3600_000, Date.now(), Date.now());
sqlite.prepare("INSERT INTO bids (id, auction_id, bidder_id, amount, created_at) VALUES (?, ?, 'alice', 100, ?)").run(crypto.randomUUID(), auctionId, Date.now());
await ok(del('alice', { confirm: 'УДАЛИТЬ' }), 409, 'cannot leave while leading an auction');
assert.ok(sqlite.prepare("SELECT 1 FROM users WHERE id = 'alice'").get(), 'nothing was deleted by a refused request');

// End the auction (alice wins), then deletion is allowed.
sqlite.prepare('UPDATE auctions SET ends_at = ends_at + 0 WHERE id = ?').run(auctionId);
sqlite.exec('DROP TRIGGER auctions_end_never_shortened');
sqlite.prepare('UPDATE auctions SET ends_at = ? WHERE id = ?').run(Date.now() - 1000, auctionId);
await ok(auctions.GET(req('/api/auctions?listingId=' + bobListing.id, 'GET', undefined, null)), 200, 'settle auction');
assert.equal(sqlite.prepare('SELECT winner_id FROM auctions WHERE id = ?').get(auctionId).winner_id, 'alice');

// --- deletion ---
const aliceKey = dump.data.uploads[0].key;
assert.ok(blobs.has(aliceKey), 'alice photo is in storage before deletion');
const deleted = await (await ok(del('alice', { confirm: 'УДАЛИТЬ' }), 200, 'delete account')).json();
assert.equal(deleted.deleted, true); assert.equal(deleted.filesRemoved, 1);
assert.ok(!blobs.has(aliceKey), 'alice photo is removed from storage');
assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM users WHERE id = 'alice'").get().n, 0);
for (const [table, column] of [['listings', 'owner_id'], ['responses', 'owner_id'], ['uploads', 'owner_id'], ['phone_reveals', 'viewer_id'], ['bids', 'bidder_id']]) {
  assert.equal(sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${column} = 'alice'`).get().n, 0, `${table} rows of alice are gone`);
}
const keptLog = sqlite.prepare("SELECT target_owner_id, note FROM moderation_actions WHERE id = 'm1'").get();
assert.deepEqual([keptLog.target_owner_id, keptLog.note], ['__deleted_user__', 'Проверка модерации'], 'the moderation log survives without the personal link');
assert.equal(sqlite.prepare('SELECT winner_id FROM auctions WHERE id = ?').get(auctionId).winner_id, null, 'the finished auction keeps its result but forgets the winner');
assert.equal(sqlite.prepare('SELECT response_count FROM requests WHERE id = ?').get(bobRequest.id).response_count, 1, "bob's request counter drops alice's response");
assert.ok(sqlite.prepare('SELECT 1 FROM listings WHERE id = ?').get(bobListing.id), "bob's listing is untouched");
assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM responses WHERE owner_id = 'carl'").get().n, 1, "carl's response is untouched");

// Signing in again starts an empty profile.
const fresh = await (await ok(exportRoute.GET(req('/api/account/export', 'GET', undefined, 'alice')), 200, 'export after delete')).json();
assert.equal(fresh.data.listings.length, 0); assert.equal(fresh.data.responses.length, 0);

sqlite.close();
console.log('PASS account: export covers every user table, redacts staff and other people, deletion is confirmed, blocked during live auctions, removes data and files, keeps the anonymised moderation log, fixes counters. No network writes.');
