// Isolated real route/SQLite tests for favourites and the "price dropped" notice. No network or production writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { createSqliteD1 } from '../lib/server/portable.ts';
import * as housing from '../lib/housing.ts';
import * as regions from '../lib/regions.ts';
import { priceNumber } from '../lib/price.ts';

// --- price parsing: only plain amounts count, vague prices never trigger a notice ---
assert.equal(priceNumber('18 000 ₸'), 18000);
assert.equal(priceNumber('80000'), 80000);
assert.equal(priceNumber('12\u00a0000 тг'), 12000);
assert.equal(priceNumber('Договорная'), null);
assert.equal(priceNumber('от 5 000'), null);
assert.equal(priceNumber('5 000 – 7 000'), null);
assert.equal(priceNumber('0'), null);
assert.equal(priceNumber(null), null);

const require = createRequire(import.meta.url), db = createSqliteD1(), sqlite = db.sqlite;
for (const file of fs.readdirSync('drizzle').filter((name) => name.endsWith('.sql')).sort()) sqlite.exec(fs.readFileSync('drizzle/' + file, 'utf8'));
const blobs = new Map();
const images = { async put(key, stream) { blobs.set(key, await new Response(stream).arrayBuffer()); }, async delete(key) { blobs.delete(key); } };
const loaded = new Map();
function compile(path) {
  if (loaded.has(path)) return loaded.get(path);
  const result = {};
  const output = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const resolver = (name) => {
    if (name === 'cloudflare:workers') return { env: { DB: db, IMAGES: images } };
    if (name === '@/lib/housing') return housing;
    if (name === '@/lib/regions') return regions;
    if (name.startsWith('@/')) return compile(name.slice(2) + '.ts');
    return require(name);
  };
  vm.compileFunction(output, ['require', 'exports'], { filename: path })(resolver, result);
  loaded.set(path, result);
  return result;
}
const listings = compile('app/api/listings/route.ts');
const uploads = compile('app/api/uploads/route.ts');
const favorites = compile('app/api/favorites/route.ts');
const bootstrap = compile('app/api/bootstrap/route.ts');
const identity = (id) => (id ? { 'oai-authenticated-user-id': id, 'oai-authenticated-user-email': id + '@qoldan.test' } : {});
const req = (path, method, body, id) => {
  const init = { method, headers: { ...identity(id), ...(body instanceof FormData ? {} : { 'content-type': 'application/json' }) } };
  if (body !== undefined) init.body = body instanceof FormData ? body : JSON.stringify(body);
  return new Request('https://qoldan.example' + path, init);
};
const ok = async (promise, status, label) => { const response = await promise; assert.equal(response.status, status, `${label}: ${await response.clone().text()}`); return response; };
const png = () => { const form = new FormData(); form.append('image', new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF6kAAAAASUVORK5CYII=', 'base64')], 'test.png', { type: 'image/png' })); return form; };

const imageUrl = (await (await ok(uploads.POST(req('/api/uploads', 'POST', png(), 'owner')), 201, 'upload')).json()).url;
const listing = (await (await ok(listings.POST(req('/api/listings', 'POST', { title: 'Тестовый генератор', category: 'Инструменты', price: '5000', unit: '', type: 'Продам', region: 'Область Жетісу', location: 'Талдыкорган', description: 'Тестовое описание без настоящего объекта.', phone: '+70000000001', sellerType: 'Частное лицо', imageUrl, delivery: false }, 'owner')), 201, 'publish')).json()).listing;

await ok(favorites.POST(req('/api/favorites', 'POST', { listingId: listing.id, active: true }, 'buyer')), 200, 'favourite');
assert.equal(sqlite.prepare('SELECT price_at_save FROM favorites WHERE owner_id = ? AND listing_id = ?').get('buyer', listing.id).price_at_save, '5000', 'price remembered when saved');

const priceNotices = async () => {
  const data = await (await ok(bootstrap.GET(req('/api/bootstrap', 'GET', undefined, 'buyer')), 200, 'bootstrap')).json();
  assert.ok(data.favorites.includes(listing.id), 'favourite ids still returned');
  return data.activities.filter((item) => item.kind === 'price');
};
const setPrice = (price) => sqlite.prepare('UPDATE listings SET price = ?, updated_at = ? WHERE id = ?').run(price, Date.now(), listing.id);

assert.equal((await priceNotices()).length, 0, 'no notice while price is unchanged');
setPrice('4 000 ₸');
const [notice] = await priceNotices();
assert.ok(notice, 'notice after the price dropped');
assert.equal(notice.listingId, listing.id);
assert.match(notice.description, /5\s000 ₸.*4\s000 ₸/);
setPrice('6000');
assert.equal((await priceNotices()).length, 0, 'no notice when the price went up');
setPrice('Договорная');
assert.equal((await priceNotices()).length, 0, 'no notice for a vague price');
setPrice('3000');
sqlite.prepare("UPDATE listings SET status = 'hidden' WHERE id = ?").run(listing.id);
assert.equal((await priceNotices()).length, 0, 'no notice for a listing that is no longer active');

// Re-saving keeps the original price: the notice compares with the first save.
sqlite.prepare("UPDATE listings SET status = 'active' WHERE id = ?").run(listing.id);
await ok(favorites.POST(req('/api/favorites', 'POST', { listingId: listing.id, active: true }, 'buyer')), 200, 'favourite again');
assert.equal((await priceNotices()).length, 1);
// Removing from favourites stops notices.
await ok(favorites.POST(req('/api/favorites', 'POST', { listingId: listing.id, active: false }, 'buyer')), 200, 'unfavourite');
const after = await (await ok(bootstrap.GET(req('/api/bootstrap', 'GET', undefined, 'buyer')), 200, 'bootstrap')).json();
assert.equal(after.activities.filter((item) => item.kind === 'price').length, 0);
// Demo listings that are not in the database are saved without a price and never notify.
await ok(favorites.POST(req('/api/favorites', 'POST', { listingId: 'demo-1', active: true }, 'buyer')), 200, 'favourite demo');
assert.equal(sqlite.prepare('SELECT price_at_save FROM favorites WHERE listing_id = ?').get('demo-1').price_at_save, null);

console.log('favorites tests passed');
