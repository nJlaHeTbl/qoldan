// Isolated real route/SQLite integration tests. No network or production writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createRequire } from 'node:module';
import ts from 'typescript';
import * as housing from '../lib/housing.ts';
import * as regions from '../lib/regions.ts';
const require = createRequire(import.meta.url), sqlite = new DatabaseSync(':memory:');
for (const file of fs.readdirSync('drizzle').filter(name => name.endsWith('.sql')).sort()) sqlite.exec(fs.readFileSync('drizzle/' + file, 'utf8'));
const db = {
  prepare(sql) {
    return {
      args: [],
      bind(...values) { this.args = values; return this; },
      async first() { return sqlite.prepare(sql).get(...this.args) || null; },
      async all() { return { results: sqlite.prepare(sql).all(...this.args) }; },
      async run() { const result = sqlite.prepare(sql).run(...this.args); return { meta: { changes: Number(result.changes) } }; },
    };
  },
  async batch(statements) {
    sqlite.exec('BEGIN');
    try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec('COMMIT'); return results; }
    catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  },
};
const blobs = new Map();
const images = { async put(key, stream) { blobs.set(key, await new Response(stream).arrayBuffer()); }, async delete(key) { blobs.delete(key); } };
const loaded = new Map();
function compile(path) {
  if (loaded.has(path)) return loaded.get(path);
  const result = {};
  const output = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const resolver = name => {
    if (name === 'cloudflare:workers') return { env: { DB: db, IMAGES: images } };
    if (name === '@/lib/housing') return housing;
    if (name === '@/lib/regions') return regions;
    if (name.startsWith('@/')) return compile(name.slice(2) + '.ts');
    return require(name);
  };
  new Function('require','exports',output)(resolver,result); loaded.set(path,result); return result;
}
const listing = compile('app/api/listings/route.ts');
const uploads = compile('app/api/uploads/route.ts');
const catalog = compile('app/api/housing/route.ts');
const favorite = compile('app/api/favorites/route.ts');
const status = compile('app/api/listings/status/route.ts');
const identity = id => id ? { 'oai-authenticated-user-id': id, 'oai-authenticated-user-email': id + '@qoldan.test' } : {};
const req = (path, method = 'GET', body, id = 'owner') => new Request('https://qoldan.example' + path, { method, headers: { ...identity(id), ...(body instanceof FormData ? {} : { 'content-type': 'application/json' }) }, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body) });
const payload = { title: 'LOCAL TEST Квартира Берёзовая', category: 'Посуточные квартиры', price: '15000', unit: '/ сутки', type: 'Сдам', region: 'Область Жетісу', location: 'Талдыкорган', description: 'Тестовые условия проживания, без настоящего объекта.', phone: '+70000000000', sellerType: 'Частное лицо', housing: { guests: 4, rooms: 2 }, latitude: 45.01, longitude: 78.37 };
assert.equal((await listing.POST(req('/api/listings', 'POST', payload, null))).status, 401);
assert.equal((await catalog.GET(req('/api/housing?view=mine', 'GET', undefined, null))).status, 401);
assert.equal((await catalog.GET(req('/api/housing?page=-1'))).status, 400);
const upload = new FormData();
upload.append('image', new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF6kAAAAASUVORK5CYII=', 'base64')], 'test.png', { type: 'image/png' }));
const imageResponse = await uploads.POST(req('/api/uploads','POST',upload));
assert.equal(imageResponse.status,201);
payload.imageUrl = (await imageResponse.json()).url;
assert.equal(blobs.size,1);
assert.equal((await listing.POST(req('/api/listings','POST',payload,'other'))).status,400);
assert.equal((await listing.POST(req('/api/listings','POST',{...payload,price:'0'}))).status,400);
assert.equal((await listing.POST(req('/api/listings','POST',{...payload,type:'Продам'}))).status,400);
assert.equal((await listing.POST(req('/api/listings','POST',{...payload,housing:undefined}))).status,400);
const created = await listing.POST(req('/api/listings','POST',payload));
assert.equal(created.status,201,await created.clone().text());
const item = (await created.json()).listing;
assert.equal((await listing.POST(req('/api/listings','POST',payload))).status,409);
assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM listings').get().n,1);
assert.equal(sqlite.prepare('SELECT guests FROM housing_details WHERE listing_id=?').get(item.id).guests,4);
assert.equal(sqlite.prepare('SELECT latitude FROM listing_locations WHERE listing_id=?').get(item.id).latitude,45.01);
async function search(params, id = null) { const result=await catalog.GET(req('/api/housing?' + new URLSearchParams(params), 'GET', undefined, id)); assert.equal(result.status,200); return (await result.json()).items; }
assert.equal((await search({q:'БЕРЕЗОВАЯ'})).length,1);
assert.equal((await search({place:'тАлДыКорГаН'})).length,1);
assert.equal((await search({region:'Алматы'})).length,0);
assert.equal((await search({maxPrice:'14999'})).length,0);
assert.equal((await search({maxPrice:'15000',guests:'4'})).length,1);
assert.equal((await search({guests:'5'})).length,0);
assert.equal((await search({view:'mine'},'other')).length,0);
assert.equal((await favorite.POST(req('/api/favorites','POST',{listingId:item.id,active:true},'other'))).status,200);
assert.equal((await search({view:'favorites'},'other')).length,1);
assert.equal((await status.POST(req('/api/listings/status','POST',{listingId:item.id,status:'paused'},'other'))).status,404);
assert.equal((await status.POST(req('/api/listings/status','POST',{listingId:item.id,status:'paused'}))).status,200);
assert.equal((await search({})).length,0);
assert.equal((await search({view:'mine'},'owner')).length,1);
assert.equal((await status.POST(req('/api/listings/status','POST',{listingId:item.id,status:'active'}))).status,200);
sqlite.prepare("UPDATE listings SET status='restricted' WHERE id=?").run(item.id);
assert.equal((await status.POST(req('/api/listings/status','POST',{listingId:item.id,status:'active'}))).status,404);
assert.equal((await search({})).length,0);
sqlite.close();
console.log('PASS housing: migrations, photo ownership, atomic save, price/type validation, duplicate protection, Unicode search, region/price/guests filters, favorites, pause, owner isolation and moderation restriction. No network writes.');
