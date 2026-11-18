// Isolated real route/SQLite integration tests for "Мне нужно", moderation locks and the
// local-admin shortcut. No network or production writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import vm from 'node:vm';
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
  queue: Promise.resolve(),
  batch(statements) { const run = this.queue.then(() => this.runBatch(statements)); this.queue = run.catch(() => {}); return run; },
  async runBatch(statements) {
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
    if (name === 'cloudflare:workers') return { env: { DB: db, IMAGES: images, QOLDAN_ADMIN_USER_IDS: 'mod' } };
    if (name === '@/lib/housing') return housing;
    if (name === '@/lib/regions') return regions;
    if (name.startsWith('@/')) return compile(name.slice(2) + '.ts');
    return require(name);
  };
  vm.compileFunction(output, ['require', 'exports'], { filename: path })(resolver, result); loaded.set(path, result); return result;
}
const requests = compile('app/api/requests/route.ts');
const requestStatus = compile('app/api/requests/status/route.ts');
const responses = compile('app/api/responses/route.ts');
const selection = compile('app/api/responses/selection/route.ts');
const moderation = compile('app/api/moderation/actions/route.ts');
const listings = compile('app/api/listings/route.ts');
const listingStatus = compile('app/api/listings/status/route.ts');
const phoneRoute = compile('app/api/listings/phone/route.ts');
const bootstrap = compile('app/api/bootstrap/route.ts');
const uploads = compile('app/api/uploads/route.ts');
const identity = id => id ? { 'oai-authenticated-user-id': id, 'oai-authenticated-user-email': id + '@qoldan.test' } : {};
const req = (path, method, body, id = 'owner', origin = 'https://qoldan.example') => {
  const init = { method, headers: { ...identity(id), ...(body instanceof FormData ? {} : { 'content-type': 'application/json' }) } };
  if (body !== undefined) init.body = body instanceof FormData ? body : JSON.stringify(body);
  return new Request(origin + path, init);
};
const ok = async (promise, status, label) => { const response = await promise; assert.equal(response.status, status, `${label}: ${await response.clone().text()}`); return response; };

// --- "Мне нужно": create, respond, select race ---
const requestBody = { title: 'LOCAL TEST Нужен комбайн', place: 'Талдыкорган', when: 'В сентябре', budget: 'Договорная', kind: 'agro', region: 'Область Жетісу' };
assert.equal((await requests.POST(req('/api/requests', 'POST', requestBody, null))).status, 401);
assert.equal((await requests.POST(req('/api/requests', 'POST', { ...requestBody, title: 'abc' }))).status, 400);
assert.equal((await requests.POST(req('/api/requests', 'POST', { ...requestBody, latitude: 45 }))).status, 400);
const request = (await (await ok(requests.POST(req('/api/requests', 'POST', requestBody)), 201, 'create request')).json()).request;
const respond = async (id, price) => (await (await ok(responses.POST(req('/api/responses', 'POST', { requestId: request.id, price, message: 'тест' }, id)), 201, 'respond')).json()).response.id;
await ok(responses.POST(req('/api/responses', 'POST', { requestId: request.id, price: '1' }, 'owner')), 409, 'own request');
const respA = await respond('provA', '100000'), respB = await respond('provB', '90000');
await ok(responses.POST(req('/api/responses', 'POST', { requestId: request.id, price: '1' }, 'provA')), 409, 'duplicate response');
assert.equal(sqlite.prepare('SELECT response_count FROM requests WHERE id=?').get(request.id).response_count, 2);
const select = responseId => selection.POST(req('/api/responses/selection', 'POST', { requestId: request.id, responseId, action: 'select' }));
await ok(selection.POST(req('/api/responses/selection', 'POST', { requestId: request.id, responseId: respA, action: 'select' }, 'provA')), 404, 'provider cannot select');
const raced = await Promise.all([select(respA), select(respB)]);
assert.deepEqual(raced.map(r => r.status).sort((a, b) => a - b), [200, 409]);
const conversations = sqlite.prepare("SELECT participant_id FROM conversations WHERE context_type='request' AND context_id=?").all(request.id);
const winner = sqlite.prepare('SELECT responses.owner_id AS id FROM request_selections JOIN responses ON responses.id=request_selections.response_id WHERE request_selections.request_id=?').get(request.id).id;
assert.deepEqual(conversations.map(row => row.participant_id), [winner], 'a lost selection race must not leave a chat with the losing provider');
await ok(selection.POST(req('/api/responses/selection', 'POST', { requestId: request.id, action: 'cancel' })), 200, 'cancel');

// --- editing a request: only the owner, only while open and before the first response ---
const editable = (await (await ok(requests.POST(req('/api/requests', 'POST', { ...requestBody, title: 'LOCAL TEST Нужна сеялка' })), 201, 'create editable')).json()).request;
const edit = (data, who = 'owner', requestId = editable.id) => requests.PATCH(req('/api/requests', 'PATCH', { requestId, data: { ...requestBody, ...data } }, who));
await ok(edit({ title: 'LOCAL TEST Нужна сеялка на 40 га', budget: 'до 200 000 ₸' }), 200, 'owner edits');
const editedRow = sqlite.prepare('SELECT title, budget FROM requests WHERE id = ?').get(editable.id);
assert.deepEqual([editedRow.title, editedRow.budget], ['LOCAL TEST Нужна сеялка на 40 га', 'до 200 000 ₸']);
await ok(edit({ title: 'LOCAL TEST чужая правка' }, 'stranger'), 404, 'a stranger cannot edit');
await ok(edit({ title: 'LOCAL TEST гость' }, null), 401, 'a guest cannot edit');
await ok(edit({ title: 'ab' }), 400, 'validation still applies');
await ok(responses.POST(req('/api/responses', 'POST', { requestId: editable.id, price: '150000' }, 'provC')), 201, 'first response');
await ok(edit({ budget: 'до 50 000 ₸' }), 409, 'terms are frozen after the first response');
assert.equal(sqlite.prepare('SELECT budget FROM requests WHERE id = ?').get(editable.id).budget, 'до 200 000 ₸');
const closedOne = (await (await ok(requests.POST(req('/api/requests', 'POST', { ...requestBody, title: 'LOCAL TEST Нужен грейдер' })), 201, 'create closable')).json()).request;
await ok(requestStatus.POST(req('/api/requests/status', 'POST', { requestId: closedOne.id, status: 'closed' })), 200, 'close');
await ok(edit({ title: 'LOCAL TEST Нужен грейдер срочно' }, 'owner', closedOne.id), 409, 'a closed request cannot be edited');

// --- withdrawing a response ---
const wreq = (await (await ok(requests.POST(req('/api/requests', 'POST', { ...requestBody, title: 'LOCAL TEST Нужен трактор' })), 201, 'create second request')).json()).request;
const wresp = async id => (await (await ok(responses.POST(req('/api/responses', 'POST', { requestId: wreq.id, price: '50000' }, id)), 201, 'respond second')).json()).response.id;
const wA = await wresp('provA'), wB = await wresp('provB');
const withdraw = (id, who) => responses.DELETE(req('/api/responses?id=' + id, 'DELETE', undefined, who));
await ok(withdraw(wA, null), 401, 'guest cannot withdraw');
await ok(withdraw('not-an-id', 'provA'), 400, 'bad id');
await ok(withdraw(wA, 'provB'), 404, 'cannot withdraw someone else response');
await ok(withdraw(wA, 'owner'), 404, 'request owner cannot withdraw a provider response');
await ok(selection.POST(req('/api/responses/selection', 'POST', { requestId: wreq.id, responseId: wB, action: 'select' })), 200, 'select second');
await ok(withdraw(wB, 'provB'), 409, 'selected response cannot be withdrawn');
await ok(withdraw(wA, 'provA'), 409, 'no withdrawal once a provider is chosen');
await ok(selection.POST(req('/api/responses/selection', 'POST', { requestId: wreq.id, action: 'cancel' })), 200, 'cancel second selection');
await ok(withdraw(wA, 'provA'), 200, 'withdraw after selection cancelled');
assert.equal(sqlite.prepare('SELECT response_count FROM requests WHERE id=?').get(wreq.id).response_count, 1);
assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM responses WHERE id=?').get(wA).n, 0);
await ok(responses.POST(req('/api/responses', 'POST', { requestId: wreq.id, price: '40000' }, 'provA')), 201, 'can respond again after withdrawing');

// --- moderation lock on requests ---
const moderate = (targetType, targetId, action, id = 'mod', origin) => moderation.POST(req('/api/moderation/actions', 'POST', { targetType, targetId, action, note: 'Проверка модерации' }, id, origin));
const setRequestStatus = status => requestStatus.POST(req('/api/requests/status', 'POST', { requestId: request.id, status }));
await ok(moderate('request', request.id, 'restrict', 'owner'), 403, 'owner is not a moderator');
await ok(moderate('request', request.id, 'restrict'), 201, 'restrict request');
assert.equal(sqlite.prepare('SELECT status FROM requests WHERE id=?').get(request.id).status, 'closed');
await ok(setRequestStatus('open'), 403, 'owner cannot lift a moderator restriction');
assert.equal(sqlite.prepare('SELECT status FROM requests WHERE id=?').get(request.id).status, 'closed');
await ok(moderate('request', request.id, 'restore'), 201, 'restore request');
await ok(setRequestStatus('closed'), 200, 'owner closes own request');
await ok(setRequestStatus('open'), 200, 'owner reopens own request after restore');

// --- moderation lock on listings ---
const png = new FormData();
png.append('image', new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF6kAAAAASUVORK5CYII=', 'base64')], 'test.png', { type: 'image/png' }));
const imageUrl = (await (await ok(uploads.POST(req('/api/uploads', 'POST', png, 'seller')), 201, 'upload')).json()).url;
const listing = (await (await ok(listings.POST(req('/api/listings', 'POST', { title: 'LOCAL TEST Квартира Берёзовая', category: 'Посуточные квартиры', price: '15000', unit: '/ сутки', type: 'Сдам', region: 'Область Жетісу', location: 'Талдыкорган', description: 'Тестовые условия проживания, без настоящего объекта.', phone: '+70000000000', sellerType: 'Частное лицо', housing: { guests: 4, rooms: 2 }, imageUrl }, 'seller')), 201, 'create listing')).json()).listing;
const setListingStatus = status => listingStatus.POST(req('/api/listings/status', 'POST', { listingId: listing.id, status }, 'seller'));
await ok(setListingStatus('paused'), 200, 'owner pauses');
await ok(setListingStatus('active'), 200, 'owner resumes own pause');
await ok(moderate('listing', listing.id, 'restrict'), 201, 'restrict listing');
await ok(setListingStatus('active'), 403, 'owner cannot lift a moderator restriction on a listing');
assert.equal(sqlite.prepare('SELECT status FROM listings WHERE id=?').get(listing.id).status, 'paused');
await ok(moderate('listing', listing.id, 'restore'), 201, 'restore listing');
await ok(setListingStatus('paused'), 200, 'owner pauses after restore');
await ok(setListingStatus('active'), 200, 'owner resumes after restore');

// --- phone privacy: never in public payloads, only through the rate-limited "show phone" action ---
const PHONE = '+70000000000';
const phoneOf = async who => (await (await ok(bootstrap.GET(req('/api/bootstrap', 'GET', undefined, who)), 200, 'bootstrap ' + who)).json()).listings.find(item => item.id === listing.id);
for (const who of [null, 'buyer1']) { const seen = await phoneOf(who); assert.ok(seen, 'listing visible'); assert.equal(seen.phone, undefined, 'phone must not reach ' + (who || 'guests')); assert.equal(seen.hasPhone, true); }
assert.equal((await phoneOf('seller')).phone, PHONE, 'owner still sees own phone');
const guestHtml = await (await ok(bootstrap.GET(req('/api/bootstrap', 'GET', undefined, null)), 200, 'guest bootstrap')).text();
assert.ok(!guestHtml.includes(PHONE), 'guest payload must not contain the number anywhere');
const reveal = (who, id = listing.id) => phoneRoute.POST(req('/api/listings/phone', 'POST', { listingId: id }, who));
await ok(reveal(null), 401, 'guest cannot reveal');
assert.equal((await (await ok(reveal('buyer1'), 200, 'signed-in reveal')).json()).phone, PHONE);
assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM phone_reveals WHERE viewer_id = ?').get('buyer1').n, 1);
await ok(reveal('buyer1'), 200, 'repeat reveal');
assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM phone_reveals WHERE viewer_id = ?').get('buyer1').n, 1, 'repeat reveal is not logged twice');
await ok(reveal('buyer1', crypto.randomUUID()), 404, 'unknown listing');
sqlite.prepare('UPDATE listings SET show_phone = 0 WHERE id = ?').run(listing.id);
assert.equal((await phoneOf('buyer2')).hasPhone, false);
await ok(reveal('buyer2'), 403, 'owner withheld consent');
assert.equal((await (await ok(reveal('seller'), 200, 'owner can read own')).json()).phone, PHONE);
sqlite.prepare('UPDATE listings SET show_phone = 1 WHERE id = ?').run(listing.id);
const baseListing = sqlite.prepare('SELECT * FROM listings WHERE id = ?').get(listing.id);
for (let i = 0; i < 20; i++) { const copy = { ...baseListing, id: crypto.randomUUID(), image_url: '/api/media/' + crypto.randomUUID() + '.png' }; sqlite.prepare('INSERT INTO listings (' + Object.keys(copy).join(',') + ') VALUES (' + Object.keys(copy).map(() => '?').join(',') + ')').run(...Object.values(copy)); }
const extra = sqlite.prepare("SELECT id FROM listings WHERE id != ? AND owner_id = 'seller' LIMIT 20").all(listing.id).map(row => row.id);
const outcomes = []; for (const id of extra) outcomes.push((await reveal('scraper', id)).status);
assert.deepEqual([outcomes.filter(code => code === 200).length, outcomes.filter(code => code === 429).length], [15, 5], 'scraping is cut off after 15 new numbers per hour: ' + outcomes);
const parallel = await Promise.all(extra.map(id => reveal('scraper2', id)));
assert.deepEqual([parallel.filter(r => r.status === 200).length, parallel.filter(r => r.status === 429).length], [15, 5], 'parallel requests must not slip past the hourly limit');

// --- live sitemap: active listings and open requests only ---
const sitemap = compile('app/sitemap.xml/route.ts');
const sitemapXml = async () => (await ok(sitemap.GET(req('/sitemap.xml', 'GET', undefined, null)), 200, 'sitemap')).text();
let xml = await sitemapXml();
assert.ok(xml.includes('<loc>https://qoldan.example/legal/privacy</loc>'), 'static legal pages are listed');
assert.ok(xml.includes('/listing/' + listing.id), 'an active listing is listed');
assert.ok(xml.includes('/request/' + editable.id), 'an open request is listed');
assert.ok(!xml.includes('/request/' + closedOne.id), 'a closed request is not listed');
sqlite.prepare("UPDATE listings SET status = 'paused' WHERE id = ?").run(listing.id);
xml = await sitemapXml();
assert.ok(!xml.includes('/listing/' + listing.id), 'a hidden listing disappears from the sitemap');
assert.ok(!xml.includes('+7') && !xml.includes('@qoldan.test'), 'no personal data in the sitemap');
sqlite.prepare("UPDATE listings SET status = 'active' WHERE id = ?").run(listing.id);

// --- local-admin shortcut must not be reachable by a spoofed id on a real host ---
await ok(moderate('request', request.id, 'warn', 'local-qoldan-user'), 403, 'spoofed local id on a public host');
await ok(moderate('request', request.id, 'warn', 'local-qoldan-user', 'http://localhost:3000'), 201, 'local dev moderator on localhost');
sqlite.close();
console.log('PASS requests: create/respond/select race without orphan chat, moderation locks for requests and listings, local-admin only on localhost. No network writes.');
