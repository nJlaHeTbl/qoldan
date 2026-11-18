// End-to-end smoke test on a real local server (vinext dev + local D1 in .wrangler/state). Starts the server,
// walks the main pages and flows over HTTP, checks security headers and that phone numbers never reach HTML,
// then stops the server. Writes only synthetic "E2E" rows into the LOCAL database. Run: node scripts/e2e-smoke.mjs
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';

const PORT = Number(process.env.E2E_PORT || 3107);
const origin = `http://localhost:${PORT}`;
const node = process.execPath;

const migrate = spawnSync(node, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'migrations', 'apply', 'DB', '--local', '--config', 'wrangler.local.json', '--persist-to', '.wrangler/state'], { encoding: 'utf8' });
assert.equal(migrate.status, 0, 'local migrations: ' + migrate.stderr);

const server = spawn(node, ['node_modules/vinext/dist/cli.js', 'dev', '--port', String(PORT)], { stdio: ['ignore', 'pipe', 'pipe'] });
let serverLog = '';
server.stdout.on('data', (chunk) => { serverLog += chunk; });
server.stderr.on('data', (chunk) => { serverLog += chunk; });
// vinext starts child processes; on Windows kill() leaves them running, so kill the whole tree.
const stop = () => {
  if (server.exitCode !== null) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
  else server.kill();
  // A force-killed dev server leaves its lock file behind and the next `vinext dev` would refuse to start.
  try {
    const lock = JSON.parse(readFileSync('.vinext/dev/lock.json', 'utf8'));
    if (lock.port === PORT) rmSync('.vinext/dev/lock.json', { force: true });
  } catch { /* no lock file */ }
};
process.on('exit', stop);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitForServer() {
  for (let i = 0; i < 120; i += 1) {
    try {
      const response = await fetch(origin + '/robots.txt');
      if (response.ok) return;
    } catch { /* not up yet */ }
    await wait(500);
  }
  throw new Error('server did not start:\n' + serverLog.slice(-2000));
}

const results = [];
async function check(label, fn) {
  try {
    await fn();
    results.push(['PASS', label]);
  } catch (error) {
    results.push(['FAIL', label, error instanceof Error ? error.message : String(error)]);
  }
}
const get = (path) => fetch(origin + path, { redirect: 'manual' });
const jsonHeaders = { 'content-type': 'application/json' };
const post = (path, body) => fetch(origin + path, { method: 'POST', headers: jsonHeaders, body: JSON.stringify(body) });
const patch = (path, body) => fetch(origin + path, { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify(body) });

try {
  await waitForServer();

  await check('home page renders with security headers', async () => {
    const response = await get('/');
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.ok(response.headers.get('permissions-policy'));
    assert.match(await response.text(), /Qoldan/);
  });

  for (const path of ['/housing', '/legal', '/legal/privacy', '/legal/terms', '/legal/auctions', '/legal/returns', '/legal/cookies']) {
    await check(`page ${path}`, async () => {
      const response = await get(path);
      assert.equal(response.status, 200);
      assert.match(await response.text(), /<html/i);
    });
  }

  await check('unknown page shows the branded 404', async () => {
    const response = await get('/no-such-page-e2e');
    assert.equal(response.status, 404);
    assert.match(await response.text(), /не найдена/);
  });

  await check('robots.txt and live sitemap', async () => {
    assert.match(await (await get('/robots.txt')).text(), /Sitemap:/);
    const sitemap = await get('/sitemap.xml');
    assert.equal(sitemap.status, 200);
    assert.match(sitemap.headers.get('content-type') || '', /xml/);
    assert.match(await sitemap.text(), /<urlset/);
  });

  let requestId = '';
  await check('request flow: create, read, edit, close (local user)', async () => {
    const created = await post('/api/requests', { title: 'E2E Нужен трактор на 10 га', place: 'Талдыкорган', when: 'На этой неделе', budget: 'Договорная', kind: 'agro', region: 'Область Жетісу' });
    assert.equal(created.status, 201, await created.clone().text());
    requestId = (await created.json()).request.id;
    assert.equal((await get('/api/requests/' + requestId)).status, 200);
    const edited = await patch('/api/requests', { requestId, data: { title: 'E2E Нужен трактор на 12 га', place: 'Талдыкорган', when: 'На этой неделе', budget: 'до 100 000 ₸', kind: 'agro', region: 'Область Жетісу' } });
    assert.equal(edited.status, 200, await edited.clone().text());
    const page = await get('/request/' + requestId);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /12 га/);
    const closed = await post('/api/requests/status', { requestId, status: 'closed' });
    assert.equal(closed.status, 200, await closed.clone().text());
  });

  await check('catalog payload hides other people’s phone numbers', async () => {
    const boot = await (await get('/api/bootstrap')).json();
    assert.ok(Array.isArray(boot.listings));
    for (const listing of boot.listings) {
      if (!listing.mine) assert.equal(listing.phone, undefined, `phone leaked for listing ${listing.id}`);
    }
  });

  await check('listing pages never contain the phone number in HTML', async () => {
    const boot = await (await get('/api/bootstrap')).json();
    const real = boot.listings.filter((listing) => typeof listing.id === 'string' && listing.id.includes('-')).slice(0, 5);
    for (const listing of real) {
      const html = await (await get('/listing/' + listing.id)).text();
      assert.ok(!/\+7\s?\d{3}\s?\d{3}/.test(html), `phone-like text in /listing/${listing.id}`);
    }
  });

  await check('account export downloads JSON', async () => {
    const response = await get('/api/account/export');
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-disposition') || '', /attachment/);
    assert.equal((await response.json()).format, 'qoldan-account-export-v1');
  });

  await check('API refuses bad input with 400, not 500', async () => {
    const response = await post('/api/requests', { title: 'x' });
    assert.equal(response.status, 400);
  });
} finally {
  stop();
}

for (const [status, label, detail] of results) console.log(`${status}  ${label}${detail ? `\n      ${detail}` : ''}`);
const failed = results.filter(([status]) => status === 'FAIL').length;
console.log(failed ? `\n${failed} e2e check(s) failed` : `\nAll ${results.length} e2e checks passed.`);
process.exit(failed ? 1 : 0);
