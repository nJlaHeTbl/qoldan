// Isolated real route/SQLite tests for own sign-in (one-time codes, sessions), as used on self-hosting.
// QOLDAN_AUTH_MODE=own here. No network writes; codes are captured from the dev console sender.
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
    if (name === 'cloudflare:workers') return { env: { DB: db, IMAGES: images, QOLDAN_ADMIN_USER_IDS: 'mod', QOLDAN_AUTH_MODE: 'own', QOLDAN_AUTH_SECRET: 'test-secret-0123456789-abcdefghijklmnop', QOLDAN_AUTH_SENDER: 'console' } };
    if (name === '@/lib/housing') return housing;
    if (name === '@/lib/regions') return regions;
    if (name.startsWith('@/')) return compile(name.slice(2) + '.ts');
    return require(name);
  };
  vm.compileFunction(output, ['require', 'exports'], { filename: path })(resolver, result); loaded.set(path, result); return result;
}
const requests = compile('app/api/requests/route.ts');
const ok = async (promise, status, label) => { const response = await promise; assert.equal(response.status, status, `${label}: ${await response.clone().text()}`); return response; };
const codeRoute = compile('app/api/auth/code/route.ts');
const verifyRoute = compile('app/api/auth/verify/route.ts');
const logoutRoute = compile('app/api/auth/logout/route.ts');
const exportRoute = compile('app/api/account/export/route.ts');

// Capture the codes the dev "console" sender prints.
const sent = [];
const realLog = console.log;
console.log = (...args) => {
  const text = String(args[0] ?? '');
  if (text.includes('"auth_code_dev"')) sent.push(JSON.parse(text));
  else realLog(...args);
};
const post = (route, body, headers = {}) => route.POST(new Request('https://qoldan.example/api/auth', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }));
const lastCode = () => sent[sent.length - 1].code;
const cookieFrom = (response) => (response.headers.get('set-cookie') || '').split(';')[0];
const withCookie = (path, method, body, cookie, extra = {}) => {
  const init = { method, headers: { 'content-type': 'application/json', cookie, ...extra } };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new Request('https://qoldan.example' + path, init);
};

// --- requesting a code ---
await ok(post(codeRoute, { channel: 'phone', destination: '8 701 123 45 67' }), 400, 'consent is required');
await ok(post(codeRoute, { channel: 'phone', destination: '12345', consent: true }), 400, 'invalid phone');
await ok(post(codeRoute, { channel: 'email', destination: 'not-an-email', consent: true }), 400, 'invalid e-mail');
const first = await (await ok(post(codeRoute, { channel: 'phone', destination: '8 (701) 123-45-67', consent: true }), 200, 'code sent')).json();
assert.equal(first.destination, '+77011234567', 'Kazakh phone formats are normalised');
assert.equal(sent.at(-1).destination, '+77011234567');
assert.match(lastCode(), /^\d{6}$/);
const stored = sqlite.prepare('SELECT code_hash FROM auth_codes ORDER BY created_at DESC LIMIT 1').get();
assert.ok(!stored.code_hash.includes(lastCode()), 'only a hash of the code is stored');

// --- wrong codes and the attempt limit ---
const verify = (code, destination = '+77011234567', channel = 'phone') => post(verifyRoute, { channel, destination, code });
const wrongCode = lastCode() === '000000' ? '111111' : '000000';
for (let i = 0; i < 5; i++) await ok(verify(wrongCode), 400, 'wrong code ' + i);
await ok(verify(lastCode()), 429, 'after five wrong attempts even the right code is refused');

// --- new code, sign in, account created ---
await ok(post(codeRoute, { channel: 'phone', destination: '+7 701 123 45 67', consent: true }), 200, 'second code');
const signedIn = await ok(verify(lastCode()), 200, 'right code');
assert.equal((await signedIn.clone().json()).newAccount, true);
assert.match(signedIn.headers.get('set-cookie'), /qoldan_session=[\w-]{40,}; Path=\/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000/);
const cookie = cookieFrom(signedIn);
await ok(verify(lastCode()), 400, 'a code works only once');

// --- rate limit: three codes per 15 minutes per destination ---
await ok(post(codeRoute, { channel: 'phone', destination: '87011234567', consent: true }), 200, 'third code');
await ok(post(codeRoute, { channel: 'phone', destination: '87011234567', consent: true }), 429, 'fourth code in 15 minutes');

// --- the session cookie is the only identity; platform headers are ignored ---
const createRequest = (opts) => requests.POST(withCookie('/api/requests', 'POST', { title: 'AUTH TEST Нужен грейдер', place: 'Текели', when: 'Завтра', budget: 'Договорная', kind: 'build', region: 'Область Жетісу' }, opts.cookie || '', opts.extra || {}));
const createdRequest = await (await ok(createRequest({ cookie }), 201, 'signed-in user creates a request')).json();
const userId = sqlite.prepare('SELECT user_id FROM login_identities WHERE destination = ?').get('+77011234567').user_id;
assert.equal(sqlite.prepare('SELECT owner_id FROM requests WHERE id = ?').get(createdRequest.request.id).owner_id, userId);
await ok(createRequest({}), 401, 'no cookie, no access');
await ok(createRequest({ extra: { 'oai-authenticated-user-id': userId, 'oai-authenticated-user-email': 'x@y.kz' } }), 401, 'spoofed platform headers are ignored in own mode');
await ok(createRequest({ cookie: 'qoldan_session=forged-token-value' }), 401, 'a forged token is refused');
await ok(exportRoute.GET(withCookie('/api/account/export', 'GET', undefined, cookie)), 200, 'export works with the session');

// --- second sign-in reuses the account; e-mail channel works too ---
sqlite.prepare('DELETE FROM auth_codes').run();
await ok(post(codeRoute, { channel: 'phone', destination: '87011234567', consent: true }), 200, 'code again');
const again = await (await ok(verify(lastCode()), 200, 'sign in again')).json();
assert.equal(again.newAccount, false, 'same phone, same account');
await ok(post(codeRoute, { channel: 'email', destination: 'Farmer@Example.KZ', consent: true }), 200, 'e-mail code');
assert.equal(sent.at(-1).destination, 'farmer@example.kz');
await ok(verify(lastCode(), 'farmer@example.kz', 'email'), 200, 'e-mail sign-in');
assert.equal(sqlite.prepare("SELECT email FROM users WHERE id = (SELECT user_id FROM login_identities WHERE destination = 'farmer@example.kz')").get().email, 'farmer@example.kz');

// --- expired codes and sessions ---
await ok(post(codeRoute, { channel: 'email', destination: 'farmer@example.kz', consent: true }), 200, 'code to expire');
sqlite.prepare('UPDATE auth_codes SET expires_at = 1').run();
await ok(verify(lastCode(), 'farmer@example.kz', 'email'), 400, 'an expired code is refused');
sqlite.prepare('UPDATE sessions SET expires_at = 1 WHERE user_id = ?').run(userId);
await ok(createRequest({ cookie }), 401, 'an expired session is refused');

// --- sign out deletes the session ---
sqlite.prepare('DELETE FROM auth_codes').run();
await ok(post(codeRoute, { channel: 'phone', destination: '87011234567', consent: true }), 200, 'code for logout test');
const fresh = cookieFrom(await ok(verify(lastCode()), 200, 'fresh session'));
await ok(createRequest({ cookie: fresh }), 201, 'fresh session works');
const out = await ok(logoutRoute.POST(withCookie('/api/auth/logout', 'POST', {}, fresh)), 200, 'logout');
assert.match(out.headers.get('set-cookie'), /Max-Age=0/);
await ok(createRequest({ cookie: fresh }), 401, 'the cookie is useless after logout');

// --- deleting the user removes identities and sessions (cascade) ---
sqlite.prepare('DELETE FROM users WHERE id = ?').run(userId);
assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM login_identities WHERE user_id = ?').get(userId).n, 0);
assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?').get(userId).n, 0);

console.log = realLog;
sqlite.close();
console.log('PASS auth: phone/e-mail normalisation, consent, hashed codes, 5-attempt and 3-per-15-min limits, single-use codes, HttpOnly session cookie, platform headers ignored, expiry, logout, cascade on account deletion.');
