// Isolated real route/SQLite tests for editing a regular listing (owner only, stale-form and auction guards).
// No network or production writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { createSqliteD1 } from '../lib/server/portable.ts';
import * as housing from '../lib/housing.ts';
import * as regions from '../lib/regions.ts';

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
const ok = async (promise, status, label) => {
  const response = await promise;
  assert.equal(response.status, status, `${label}: ${await response.clone().text()}`);
  return response;
};
const png = () => {
  const form = new FormData();
  form.append('image', new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF6kAAAAASUVORK5CYII=', 'base64')], 'test.png', { type: 'image/png' }));
  return form;
};
const base = { category: 'Инструменты', price: '5000', unit: '', type: 'Продам', region: 'Область Жетісу', location: 'Талдыкорган', description: 'Тестовое описание без настоящего объекта.', phone: '+70000000001', sellerType: 'Частное лицо', delivery: false };
const publish = async (title, extra = {}) => {
  const imageUrl = (await (await ok(uploads.POST(req('/api/uploads', 'POST', png(), 'owner')), 201, 'upload')).json()).url;
  const listing = (await (await ok(listings.POST(req('/api/listings', 'POST', { ...base, title, imageUrl, ...extra }, 'owner')), 201, 'publish')).json()).listing;
  return { listing, data: { ...base, title, imageUrl } };
};
const stamp = (id) => sqlite.prepare('SELECT updated_at FROM listings WHERE id = ?').get(id).updated_at;
const edit = (listingId, expectedUpdatedAt, data, who = 'owner') =>
  listings.PATCH(req('/api/listings', 'PATCH', { listingId, expectedUpdatedAt, data }, who));
const boot = async (who) => (await ok(bootstrap.GET(req('/api/bootstrap', 'GET', undefined, who)), 200, 'bootstrap ' + who)).json();

const { listing, data } = await publish('Тестовая бетономешалка');
await ok(favorites.POST(req('/api/favorites', 'POST', { listingId: listing.id, active: true }, 'buyer')), 200, 'favourite');

// Guests and other users cannot edit.
await ok(edit(listing.id, stamp(listing.id), { ...data, price: '1' }, null), 401, 'guest');
await ok(edit(listing.id, stamp(listing.id), { ...data, price: '1' }, 'buyer'), 404, 'stranger');

// The owner sees updatedAt; other viewers do not.
const before = (await boot('owner')).listings.find((item) => item.id === listing.id);
assert.equal(before.updatedAt, stamp(listing.id));
assert.equal((await boot('buyer')).listings.find((item) => item.id === listing.id).updatedAt, undefined);

// Owner edit: text, price and terms are saved and the stamp moves forward.
const saved = await (await ok(edit(listing.id, before.updatedAt, { ...data, title: 'Бетономешалка 180 л', price: '4000', description: 'Новое описание.', delivery: true, showPhone: false }), 200, 'edit')).json();
const row = sqlite.prepare('SELECT title, price, description, delivery, show_phone, updated_at FROM listings WHERE id = ?').get(listing.id);
assert.deepEqual({ ...row }, { title: 'Бетономешалка 180 л', price: '4000', description: 'Новое описание.', delivery: 1, show_phone: 0, updated_at: saved.listing.updatedAt });
assert.ok(saved.listing.updatedAt > before.updatedAt);
assert.equal(saved.listing.hasPhone, false);
// Later edits start from the saved values, as the form does.
Object.assign(data, { title: 'Бетономешалка 180 л', price: '4000', description: 'Новое описание.', delivery: true, showPhone: false });

// A second tab with the old stamp is refused and changes nothing.
await ok(edit(listing.id, before.updatedAt, { ...data, price: '1' }), 409, 'stale form');
assert.equal(sqlite.prepare('SELECT price FROM listings WHERE id = ?').get(listing.id).price, '4000');

// Category and type stay as published.
await ok(edit(listing.id, saved.listing.updatedAt, { ...data, category: 'Стройматериалы' }), 400, 'category change');
await ok(edit(listing.id, saved.listing.updatedAt, { ...data, type: 'Сдам' }), 400, 'type change');

// The place can change; the map point follows it (a new point is saved, no point removes the old one).
const moved = await (await ok(edit(listing.id, saved.listing.updatedAt, { ...data, location: 'Текели', latitude: 44.83, longitude: 78.82 }), 200, 'place with point')).json();
assert.deepEqual({ ...sqlite.prepare('SELECT l.location, p.latitude, p.longitude FROM listings l JOIN listing_locations p ON p.listing_id = l.id WHERE l.id = ?').get(listing.id) }, { location: 'Текели', latitude: 44.83, longitude: 78.82 });
const unpinned = await (await ok(edit(listing.id, moved.listing.updatedAt, { ...data, location: 'Талдыкорган' }), 200, 'place without point')).json();
assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM listing_locations WHERE listing_id = ?').get(listing.id).n, 0);

// The photo can change to the owner's own unused upload; the replaced upload is cleaned up.
const upload = async (who) => (await (await ok(uploads.POST(req('/api/uploads', 'POST', png(), who)), 201, 'upload ' + who)).json()).url;
const strangersPhoto = await upload('buyer');
await ok(edit(listing.id, unpinned.listing.updatedAt, { ...data, imageUrl: strangersPhoto }), 400, "someone else's photo");
const other = await publish('Другое объявление владельца');
await ok(edit(listing.id, unpinned.listing.updatedAt, { ...data, imageUrl: other.data.imageUrl }), 409, 'photo of another listing');
const oldKey = data.imageUrl.slice('/api/media/'.length);
const newPhoto = await upload('owner');
const rephotographed = await (await ok(edit(listing.id, unpinned.listing.updatedAt, { ...data, imageUrl: newPhoto }), 200, 'new photo')).json();
assert.equal(rephotographed.listing.image, newPhoto);
assert.equal(sqlite.prepare('SELECT image_url FROM listings WHERE id = ?').get(listing.id).image_url, newPhoto);
assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM uploads WHERE key = ?').get(oldKey).n, 0, 'old photo record removed');
assert.equal(blobs.has(oldKey), false, 'old photo file removed');
data.imageUrl = newPhoto;
saved.listing.updatedAt = rephotographed.listing.updatedAt;

// The price drop reaches the buyer who saved the listing at 5000.
const notices = (await boot('buyer')).activities.filter((item) => item.kind === 'price');
assert.equal(notices.length, 1);
assert.match(notices[0].description, /Бетономешалка 180 л/);

// Paused listings can be edited; listings restricted by moderation cannot.
sqlite.prepare("UPDATE listings SET status = 'paused' WHERE id = ?").run(listing.id);
const paused = await (await ok(edit(listing.id, stamp(listing.id), { ...data, price: '3900' }), 200, 'paused edit')).json();
sqlite.prepare("UPDATE listings SET status = 'restricted' WHERE id = ?").run(listing.id);
await ok(edit(listing.id, paused.listing.updatedAt, { ...data, price: '1' }), 403, 'restricted');

// A running auction freezes the listing.
const auctioned = await publish('Тестовый лот на торгах', { price: '1000', auction: { startPrice: 1000, minStep: 100, durationHours: 24 } });
auctioned.data.price = '1000';
await ok(edit(auctioned.listing.id, stamp(auctioned.listing.id), { ...auctioned.data, price: '1' }), 409, 'auction running');
await ok(edit(auctioned.listing.id, stamp(auctioned.listing.id), { ...auctioned.data, auction: { startPrice: 1, minStep: 1, durationHours: 24 } }), 400, 'auction in payload');
// A finished (sold) auction stays frozen too: the winner must see what they bid for. A cancelled one is editable.
sqlite.prepare("UPDATE auctions SET status = 'ended', result = 'sold' WHERE listing_id = ?").run(auctioned.listing.id);
await ok(edit(auctioned.listing.id, stamp(auctioned.listing.id), { ...auctioned.data, title: 'Совсем другой товар' }), 409, 'ended auction');
const cancelled = await publish('Тестовый лот, торги отменены', { price: '1000', auction: { startPrice: 1000, minStep: 100, durationHours: 24 } });
cancelled.data.price = '1000';
sqlite.prepare("UPDATE auctions SET status = 'cancelled' WHERE listing_id = ?").run(cancelled.listing.id);
await ok(edit(cancelled.listing.id, stamp(cancelled.listing.id), { ...cancelled.data, price: '900' }), 200, 'cancelled auction');

// Housing has its own editor.
const housingId = crypto.randomUUID();
sqlite.prepare(`INSERT INTO listings (id, owner_id, title, price, unit, location, region, category, offer_type, image_url, phone, seller_type, created_at, updated_at)
  VALUES (?, 'owner', 'Квартира посуточно', '15000', '/ сутки', 'Талдыкорган', 'Область Жетісу', 'Посуточные квартиры', 'Сдам', '/api/media/00000000-0000-0000-0000-000000000000.jpg', '+70000000001', 'Частное лицо', 1, 1)`).run(housingId);
await ok(edit(housingId, 1, { ...data, category: 'Посуточные квартиры', type: 'Сдам', unit: '/ сутки', price: '9000', housing: undefined }), 400, 'housing');

console.log('listing edit tests passed');
