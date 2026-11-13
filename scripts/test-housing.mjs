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
let beforeUploadDelete = null, beforeStorageDelete = null;
const db = {
  prepare(sql) {
    return {
      args: [],
      bind(...values) { this.args = values; return this; },
      async first() { return sqlite.prepare(sql).get(...this.args) || null; },
      async all() { return { results: sqlite.prepare(sql).all(...this.args) }; },
      async run() {
        if (/^DELETE FROM uploads\b/.test(sql.trim()) && beforeUploadDelete) {
          const hook = beforeUploadDelete; beforeUploadDelete = null; await hook(this.args[0]);
        }
        const result = sqlite.prepare(sql).run(...this.args); return { meta: { changes: Number(result.changes) } };
      },
    };
  },
  queue: Promise.resolve(),
  batch(statements) { const run = this.queue.then(() => this.runBatch(statements)); this.queue = run.catch(() => {}); return run; },
  async runBatch(statements) {
    sqlite.exec('BEGIN');
    try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec('COMMIT'); return results; }
    catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  },
};
const blobs = new Map();
const images = {
  async put(key, stream) { blobs.set(key, await new Response(stream).arrayBuffer()); },
  async delete(key) {
    if (beforeStorageDelete) { const hook = beforeStorageDelete; beforeStorageDelete = null; await hook(key); }
    blobs.delete(key);
  },
};
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
const beforeEdit = (await search({view:'mine'},'owner'))[0];
const edit = { listingId: item.id, expectedUpdatedAt: beforeEdit.updatedAt, data: {
  ...payload, title: 'LOCAL TEST Новая квартира', price: '17000', region: 'Астана', location: 'Астана',
  housing: { guests: 5, rooms: 3 }, latitude: 51.16, longitude: 71.43,
} };
assert.equal((await catalog.PATCH(req('/api/housing','PATCH',edit,null))).status,401);
assert.equal((await catalog.PATCH(req('/api/housing','PATCH',edit,'other'))).status,404);
assert.equal((await catalog.PATCH(req('/api/housing','PATCH',{...edit,data:{...edit.data,price:'-1'}}))).status,400);
const edited = await catalog.PATCH(req('/api/housing','PATCH',edit));
assert.equal(edited.status,200,await edited.clone().text());
const afterEdit = (await search({view:'mine'},'owner'))[0];
assert.ok(afterEdit.updatedAt > beforeEdit.updatedAt);
assert.equal(afterEdit.price,'17000');
assert.equal(afterEdit.rooms,3);
assert.equal(afterEdit.latitude,51.16);
assert.equal(afterEdit.image,beforeEdit.image);
assert.equal((await search({place:'Талдыкорган'})).length,0);
assert.equal((await search({region:'Астана',q:'НОВАЯ'})).length,1);
assert.equal((await search({view:'favorites'},'other'))[0].id,item.id);
// A stale update cannot modify the index or remove coordinates after failing the first statement.
assert.equal((await catalog.PATCH(req('/api/housing','PATCH',{...edit,data:{...edit.data,location:'Устаревший адрес',latitude:undefined,longitude:undefined}}))).status,409);
assert.equal((await search({view:'mine'},'owner'))[0].latitude,51.16);
assert.equal((await search({q:'Устаревший адрес'})).length,0);
const removePoint = {...edit,expectedUpdatedAt:afterEdit.updatedAt,data:{...edit.data,latitude:undefined,longitude:undefined}};
assert.equal((await catalog.PATCH(req('/api/housing','PATCH',removePoint))).status,200);
assert.equal((await search({view:'mine'},'owner'))[0].latitude,null);
// Pause invalidates an open form and editing a fresh paused record does not republish it.
const pointRemoved = (await search({view:'mine'},'owner'))[0];
assert.equal((await status.POST(req('/api/listings/status','POST',{listingId:item.id,status:'paused'}))).status,200);
assert.equal((await catalog.PATCH(req('/api/housing','PATCH',{...removePoint,expectedUpdatedAt:pointRemoved.updatedAt}))).status,409);
const paused = (await search({view:'mine'},'owner'))[0];
const pausedEdit = {...removePoint,expectedUpdatedAt:paused.updatedAt};
assert.equal((await catalog.PATCH(req('/api/housing','PATCH',pausedEdit))).status,200);
assert.equal((await search({})).length,0);
assert.equal((await search({view:'mine'},'owner'))[0].status,'paused');
// Replacing the photo keeps the record and favorites; another user's upload is rejected.
const otherUpload = await uploads.POST(req('/api/uploads','POST',upload,'other'));
const otherImage = (await otherUpload.json()).url;
const latest = (await search({view:'mine'},'owner'))[0];
assert.equal((await catalog.PATCH(req('/api/housing','PATCH',{...pausedEdit,expectedUpdatedAt:latest.updatedAt,data:{...pausedEdit.data,imageUrl:otherImage}}))).status,400);
const nextUpload = await uploads.POST(req('/api/uploads','POST',upload));
const nextImage = (await nextUpload.json()).url;
assert.equal((await catalog.PATCH(req('/api/housing','PATCH',{...pausedEdit,expectedUpdatedAt:latest.updatedAt,data:{...pausedEdit.data,imageUrl:nextImage}}))).status,200);
assert.equal((await search({view:'mine'},'owner'))[0].image,nextImage);
assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM listings').get().n,1);
// Gallery persistence, ownership, limits, stale edits and upload lifecycle.
const extras = [];
for (let i = 0; i < 4; i++) { const r = await uploads.POST(req('/api/uploads','POST',upload)); assert.equal(r.status,201); extras.push((await r.json()).url); }
const gallery = [nextImage, ...extras];
const currentGalleryRow = (await search({view:'mine'},'owner'))[0];
const galleryEdit = {...pausedEdit,expectedUpdatedAt:currentGalleryRow.updatedAt,data:{...pausedEdit.data,imageUrl:nextImage,housing:{guests:5,rooms:3,photos:gallery}}};
assert.equal((await catalog.PATCH(req('/api/housing','PATCH',galleryEdit))).status,200);
assert.deepEqual((await search({view:'mine'},'owner'))[0].photos,gallery);
const withPhotos = photos => ({...galleryEdit,data:{...galleryEdit.data,housing:{...galleryEdit.data.housing,photos}}});
assert.equal((await catalog.PATCH(req('/api/housing','PATCH',withPhotos([...gallery,otherImage])))).status,400);
assert.equal((await catalog.PATCH(req('/api/housing','PATCH',withPhotos([nextImage,nextImage])))).status,400);
assert.equal((await catalog.PATCH(req('/api/housing','PATCH',withPhotos([nextImage,otherImage])))).status,400);
assert.equal((await catalog.PATCH(req('/api/housing','PATCH',withPhotos([extras[0],nextImage])))).status,400);
assert.equal((await catalog.PATCH(req('/api/housing','PATCH',withPhotos([nextImage])))).status,409);
assert.deepEqual((await search({view:'mine'},'owner'))[0].photos,gallery);
// The previous client omitting photos must not erase the gallery.
const oldClientEdit = {...galleryEdit,expectedUpdatedAt:(await search({view:'mine'},'owner'))[0].updatedAt,data:{...galleryEdit.data,housing:{guests:5,rooms:3}}};
assert.equal((await catalog.PATCH(req('/api/housing','PATCH',oldClientEdit))).status,200);
assert.deepEqual((await search({view:'mine'},'owner'))[0].photos,gallery);
assert.equal((await uploads.DELETE(req('/api/uploads','DELETE',{url:extras[0]}))).status,409);
// Photos stay protected even when old enough for abandoned-upload cleanup.
sqlite.prepare('UPDATE uploads SET created_at=? WHERE owner_id=?').run(Date.now()-2*86400000,'owner');
const cleanupTrigger = await uploads.POST(req('/api/uploads','POST',upload)); assert.equal(cleanupTrigger.status,201);
for (const url of gallery) assert.ok(blobs.has(url.slice('/api/media/'.length)));
// Cover can be switched to a former extra and an omitted photo then removed.
const reordered = [extras[0],nextImage,...extras.slice(2)];
const reorderedEdit = {...galleryEdit,expectedUpdatedAt:(await search({view:'mine'},'owner'))[0].updatedAt,data:{...galleryEdit.data,imageUrl:extras[0],housing:{guests:5,rooms:3,photos:reordered}}};
assert.equal((await catalog.PATCH(req('/api/housing','PATCH',reorderedEdit))).status,200);
assert.deepEqual((await search({view:'mine'},'owner'))[0].photos,reordered);
assert.equal((await uploads.DELETE(req('/api/uploads','DELETE',{url:extras[1]}))).status,200);
assert.ok(!blobs.has(extras[1].slice('/api/media/'.length)));
// New publications persist multiple photos too.
const freshCover = (await cleanupTrigger.json()).url;
const freshExtraResponse = await uploads.POST(req('/api/uploads','POST',upload));
const freshExtra = (await freshExtraResponse.json()).url;
assert.equal((await listing.POST(req('/api/listings','POST',{...payload,imageUrl:freshCover,housing:{guests:2,rooms:1,photos:[freshCover,otherImage]}}))).status,400);
assert.equal((await listing.POST(req('/api/listings','POST',{...payload,imageUrl:freshCover,housing:{guests:2,rooms:1,photos:[freshCover,nextImage]}}))).status,409);
const createdGallery = await listing.POST(req('/api/listings','POST',{...payload,imageUrl:freshCover,housing:{guests:2,rooms:1,photos:[freshCover,freshExtra]}}));
assert.equal(createdGallery.status,201,await createdGallery.clone().text());
const galleryId = (await createdGallery.json()).listing.id;
assert.deepEqual((await search({view:'mine'},'owner')).find(row=>row.id===galleryId).photos,[freshCover,freshExtra]);
sqlite.prepare("UPDATE listings SET status='paused' WHERE id=?").run(galleryId);
sqlite.prepare("UPDATE listings SET status='restricted' WHERE id=?").run(item.id);
assert.equal((await catalog.PATCH(req('/api/housing','PATCH',pausedEdit))).status,403);
assert.equal((await status.POST(req('/api/listings/status','POST',{listingId:item.id,status:'active'}))).status,404);
assert.equal((await search({})).length,0);
// Two simultaneous saves cannot both claim one photo (write-time guard, not only the pre-check).
sqlite.prepare('DELETE FROM listings WHERE owner_id=?').run('racer');
const raceUpload = async () => (await (await uploads.POST(req('/api/uploads','POST',upload,'racer'))).json()).url;
const raceA = await raceUpload(), raceB = await raceUpload();
const raced = await Promise.all([
  listing.POST(req('/api/listings','POST',{...payload,imageUrl:raceA,housing:{guests:2,rooms:1,photos:[raceA,raceB]}},'racer')),
  listing.POST(req('/api/listings','POST',{...payload,imageUrl:raceB,housing:{guests:2,rooms:1,photos:[raceB]}},'racer')),
]);
assert.deepEqual(raced.map(r => r.status).sort((a,b) => a-b),[201,409]);
assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM listings WHERE owner_id='racer'").get().n,1);
assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM housing_details h JOIN listings l ON l.id=h.listing_id WHERE l.owner_id='racer'").get().n,1);
// Same for two simultaneous edits adding one new photo to two different listings.
const raceC = await raceUpload(), raceD = await raceUpload(), raceE = await raceUpload();
const second = await listing.POST(req('/api/listings','POST',{...payload,imageUrl:raceC,housing:{guests:2,rooms:1,photos:[raceC]}},'racer'));
assert.equal(second.status,201);
const mineRows = await search({view:'mine'},'racer');
assert.equal(mineRows.length,2);
const racedEdits = await Promise.all(mineRows.map(row => catalog.PATCH(req('/api/housing','PATCH',{listingId:row.id,expectedUpdatedAt:row.updatedAt,data:{...payload,imageUrl:row.image,housing:{guests:2,rooms:1,photos:[...row.photos,raceD]}}},'racer'))));
assert.deepEqual(racedEdits.map(r => r.status).sort((a,b) => a-b),[200,409]);
assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM housing_details h, json_each(h.photos) p WHERE p.value=?").get(raceD).n,1);
// A lost race leaves the losing listing fully editable afterwards.
for (const row of await search({view:'mine'},'racer')) {
  const extra = row.photos.includes(raceD) ? [] : [raceE];
  assert.equal((await catalog.PATCH(req('/api/housing','PATCH',{listingId:row.id,expectedUpdatedAt:row.updatedAt,data:{...payload,imageUrl:row.image,housing:{guests:3,rooms:1,photos:[...row.photos,...extra]}}},'racer'))).status,200);
}
// Deterministic interleavings: cleanup must never remove a photo claimed by a save.
const cleanupOwner = 'cleanup-race';
const cleanupUpload = async () => {
  const response = await uploads.POST(req('/api/uploads','POST',upload,cleanupOwner));
  assert.equal(response.status,201);
  return (await response.json()).url;
};
const cleanupCover = await cleanupUpload(), cleanupExtra = await cleanupUpload();
const cleanupCreated = await listing.POST(req('/api/listings','POST',{...payload,imageUrl:cleanupCover},cleanupOwner));
assert.equal(cleanupCreated.status,201);
const cleanupId = (await cleanupCreated.json()).listing.id;
const cleanupEdit = async extra => {
  const row = (await search({view:'mine'},cleanupOwner)).find(row => row.id === cleanupId);
  return catalog.PATCH(req('/api/housing','PATCH',{
    listingId: row.id, expectedUpdatedAt: row.updatedAt,
    data: {...payload,imageUrl:row.image,housing:{guests:2,rooms:1,photos:[row.image,extra]}},
  },cleanupOwner));
};
const cleanupDelete = url => uploads.DELETE(req('/api/uploads','DELETE',{url},cleanupOwner));
let concurrentSave;
beforeStorageDelete = async key => {
  assert.equal(key,cleanupExtra.slice('/api/media/'.length));
  concurrentSave = await cleanupEdit(cleanupExtra);
};
assert.equal((await cleanupDelete(cleanupExtra)).status,200);
assert.equal(concurrentSave.status,400,'A deletion already in storage must block a new gallery claim');
assert.deepEqual((await search({view:'mine'},cleanupOwner))[0].photos,[cleanupCover]);
assert.ok(!blobs.has(cleanupExtra.slice('/api/media/'.length)));

// The reverse order: a save that wins must prevent storage deletion entirely.
const savedExtra = await cleanupUpload();
beforeUploadDelete = async key => {
  assert.equal(key,savedExtra.slice('/api/media/'.length));
  concurrentSave = await cleanupEdit(savedExtra);
};
assert.equal((await cleanupDelete(savedExtra)).status,409);
assert.equal(concurrentSave.status,200);
assert.ok(blobs.has(savedExtra.slice('/api/media/'.length)));
assert.ok(sqlite.prepare('SELECT key FROM uploads WHERE key=?').get(savedExtra.slice('/api/media/'.length)));
assert.deepEqual((await search({view:'mine'},cleanupOwner))[0].photos,[cleanupCover,savedExtra]);

// The same deletion guard protects a new publication's cover.
const deletedCover = await cleanupUpload();
beforeStorageDelete = async () => {
  concurrentSave = await listing.POST(req('/api/listings','POST',{...payload,imageUrl:deletedCover},cleanupOwner));
};
assert.equal((await cleanupDelete(deletedCover)).status,200);
assert.equal(concurrentSave.status,400);
assert.equal((await search({view:'mine'},cleanupOwner)).length,1);

// A failed storage operation restores metadata, preserves the file and permits retry.
const retryPhoto = await cleanupUpload(), retryKey = retryPhoto.slice('/api/media/'.length);
const metadata = sqlite.prepare('SELECT * FROM uploads WHERE key=?').get(retryKey);
const foreignDelete = await uploads.DELETE(req('/api/uploads','DELETE',{url:retryPhoto},'other'));
assert.equal(foreignDelete.status,200);
assert.deepEqual(await foreignDelete.json(),{deleted:false});
beforeStorageDelete = async () => { throw new Error('Simulated storage deletion failure'); };
const originalError = console.error, loggedErrors = [];
let failedDeletion;
try { console.error = (...args) => loggedErrors.push(args); failedDeletion = await cleanupDelete(retryPhoto); }
finally { console.error = originalError; }
assert.equal(failedDeletion.status,500);
assert.ok(loggedErrors.some(args => args.some(arg => String(arg).includes('Simulated storage deletion failure'))));
assert.deepEqual(sqlite.prepare('SELECT * FROM uploads WHERE key=?').get(retryKey),metadata);
assert.ok(blobs.has(retryKey));
assert.deepEqual(await (await cleanupDelete(retryPhoto)).json(),{deleted:true});
assert.ok(!blobs.has(retryKey));
assert.equal(sqlite.prepare('SELECT key FROM uploads WHERE key=?').get(retryKey),undefined);
assert.deepEqual(await (await cleanupDelete(retryPhoto)).json(),{deleted:false});
assert.equal(beforeStorageDelete,null);
assert.equal(beforeUploadDelete,null);
sqlite.close();
console.log('PASS housing: publishing/editing, five-photo galleries, cover and deletion, ownership/limits, stale conflict and old-client preservation, cleanup protection, search/favorites/coordinates/moderation, simultaneous photo claims, save/delete races and storage-failure retry. No network writes.');
