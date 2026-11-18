// Isolated real route/SQLite integration tests for chat anti-spam and anti-fraud guards.
// No network or production writes.
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
const listings = compile('app/api/listings/route.ts');
const uploads = compile('app/api/uploads/route.ts');
const identity = id => id ? { 'oai-authenticated-user-id': id, 'oai-authenticated-user-email': id + '@qoldan.test' } : {};
const req = (path, method, body, id = 'owner', origin = 'https://qoldan.example') => {
  const init = { method, headers: { ...identity(id), ...(body instanceof FormData ? {} : { 'content-type': 'application/json' }) } };
  if (body !== undefined) init.body = body instanceof FormData ? body : JSON.stringify(body);
  return new Request(origin + path, init);
};
const ok = async (promise, status, label) => { const response = await promise; assert.equal(response.status, status, `${label}: ${await response.clone().text()}`); return response; };
const conversations = compile('app/api/conversations/route.ts');
const messagesRoute = compile('app/api/conversations/[id]/messages/route.ts');
const { containsCardNumber } = compile('lib/server/chat-guard.ts');

// --- card number detection (Luhn) without blocking phones, prices or dates ---
assert.equal(containsCardNumber('Скиньте на карту 4111 1111 1111 1111'), true);
assert.equal(containsCardNumber('4111-1111-1111-1111'), true);
assert.equal(containsCardNumber('Мой номер +7 701 234 56 78, цена 1 500 000 тг'), false);
assert.equal(containsCardNumber('1234 5678 9012 3456'), false, 'random 16 digits that fail Luhn are allowed');
assert.equal(containsCardNumber('Дата 2026-11-18, заказ 20261118'), false);

// --- fixtures ---
const png = () => { const form = new FormData(); form.append('image', new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF6kAAAAASUVORK5CYII=', 'base64')], 'test.png', { type: 'image/png' })); return form; };
const publish = async (who, title) => {
  const imageUrl = (await (await ok(uploads.POST(req('/api/uploads', 'POST', png(), who)), 201, 'upload')).json()).url;
  return (await (await ok(listings.POST(req('/api/listings', 'POST', { title, category: 'Инструменты', price: '5000', unit: '', type: 'Продам', region: 'Область Жетісу', location: 'Талдыкорган', description: 'Тестовое описание без настоящего объекта.', phone: '+70000000001', sellerType: 'Частное лицо', imageUrl, delivery: false }, who)), 201, 'publish')).json()).listing;
};
const open = async (who, listingId) => {
  const response = await conversations.POST(req('/api/conversations', 'POST', { targetType: 'listing', targetId: listingId }, who));
  assert.ok([200, 201].includes(response.status), 'open conversation: ' + await response.clone().text());
  return (await response.json()).conversation.id;
};
const send = (who, conversationId, body) => messagesRoute.POST(req(`/api/conversations/${conversationId}/messages`, 'POST', { body }, who), { params: Promise.resolve({ id: conversationId }) });
const owners = ['bob1', 'bob2', 'bob3', 'bob4', 'bob5'];
const items = [];
for (const owner of owners) items.push(await publish(owner, 'LOCAL TEST Перфоратор ' + owner));
const first = await open('alice', items[0].id);

// --- duplicates and card numbers ---
await ok(send('alice', first, 'Здравствуйте, ещё продаёте?'), 201, 'first message');
await ok(send('alice', first, 'Здравствуйте, ещё продаёте?'), 409, 'accidental double send');
const card = await ok(send('alice', first, 'Переведите предоплату на 4111 1111 1111 1111'), 400, 'card number');
assert.equal((await card.json()).code, 'card_number');
await ok(send('alice', first, 'Мой номер +7 701 234 56 78'), 201, 'phone numbers are fine');

// --- mass mailing: the same text in five different chats ---
const spam = 'Дёшево продам запчасти, пишите в WhatsApp';
const chats = [first];
for (const item of items.slice(1)) chats.push(await open('alice', item.id));
for (const chat of chats.slice(0, 4)) await ok(send('alice', chat, spam), 201, 'copy');
const mass = await ok(send('alice', chats[4], spam), 429, 'fifth identical copy is refused');
assert.equal((await mass.json()).code, 'mass_message');
await ok(send('alice', chats[4], 'Здравствуйте, какой у перфоратора патрон?'), 201, 'a personal message still goes through');

// --- global rate: 60 messages per 10 minutes ---
for (let i = 0; i < 60; i++) sqlite.prepare('INSERT INTO messages (id, conversation_id, sender_id, body, created_at) VALUES (?, ?, ?, ?, ?)').run(crypto.randomUUID(), chats[1], 'alice', 'filler ' + i, Date.now() - 1000);
const rated = await ok(send('alice', chats[2], 'Ещё вопрос по доставке'), 429, 'too many messages');
assert.equal((await rated.json()).code, 'rate_limited');

// --- new conversations: 20 per hour, re-opening is always allowed ---
sqlite.prepare("INSERT OR IGNORE INTO users (id, email, display_name, created_at, updated_at) VALUES ('carl', 'carl@qoldan.test', 'Карл', 1, 1)").run();
for (let i = 0; i < 20; i++) sqlite.prepare("INSERT INTO conversations (id, context_type, context_id, context_title, context_owner_id, participant_id, created_at, updated_at) VALUES (?, 'listing', ?, 'x', 'bob1', 'carl', ?, ?)").run(crypto.randomUUID(), 'fake-' + i, Date.now(), Date.now());
const tooMany = await conversations.POST(req('/api/conversations', 'POST', { targetType: 'listing', targetId: items[1].id }, 'carl'));
assert.equal(tooMany.status, 429, 'the 21st new conversation within an hour is refused');
sqlite.prepare("INSERT INTO conversations (id, context_type, context_id, context_title, context_owner_id, participant_id, created_at, updated_at) VALUES (?, 'listing', ?, 'x', 'bob1', 'carl', ?, ?)").run(crypto.randomUUID(), items[0].id, Date.now() - 3 * 3600_000, Date.now());
assert.equal((await conversations.POST(req('/api/conversations', 'POST', { targetType: 'listing', targetId: items[0].id }, 'carl'))).status, 200, 'an existing conversation re-opens despite the limit');

sqlite.close();
console.log('PASS chat: card numbers blocked (Luhn), phones allowed, double sends and mass mailing refused, 60 per 10 minutes, 20 new chats per hour with free re-opening. No network writes.');
