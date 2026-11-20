// Cross-site request forgery guard for the API (lib/server/request-guard.ts, wired in proxy.ts).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { crossSiteWriteBlock, CROSS_SITE_ERROR } from '../lib/server/request-guard.ts';

const url = 'https://qoldan.example/api/listings';
const call = (method, headers = {}) => crossSiteWriteBlock(new Request(url, { method, headers }));
const status = (response) => (response ? response.status : 'pass');

// Reads are never blocked, even from other sites.
assert.equal(status(call('GET', { origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' })), 'pass');
// Own pages pass, also behind a proxy that rewrites the host.
assert.equal(status(call('POST', { origin: 'https://qoldan.example', 'sec-fetch-site': 'same-origin' })), 'pass');
assert.equal(status(call('POST', { origin: 'https://qoldan.example' })), 'pass');
assert.equal(
  status(crossSiteWriteBlock(new Request('http://internal:8787/api/bids', {
    method: 'POST', headers: { origin: 'https://qoldan.example', 'x-forwarded-host': 'qoldan.example' },
  }))),
  'pass',
);
// Non-browser clients (tests, scripts) send neither header.
assert.equal(status(call('DELETE')), 'pass');
// Another site, a sibling subdomain on the same hosting, or an opaque origin is rejected.
for (const origin of ['https://evil.example', 'https://other.qoldan.example', 'null']) {
  const response = call('POST', { origin, 'sec-fetch-site': origin === 'null' ? 'cross-site' : 'same-site' });
  assert.equal(status(response), 403, origin);
  assert.equal((await response.json()).error, CROSS_SITE_ERROR);
}
for (const method of ['PATCH', 'PUT', 'DELETE']) assert.equal(status(call(method, { origin: 'https://evil.example' })), 403, method);
// A cross-site form post without Origin (old browsers strip it) is still recognised by Sec-Fetch-Site.
assert.equal(status(call('POST', { 'sec-fetch-site': 'cross-site' })), 403);
// The guard is actually mounted for the API.
const proxy = fs.readFileSync('proxy.ts', 'utf8');
assert.ok(proxy.includes('crossSiteWriteBlock') && proxy.includes("'/api/:path*'"), 'proxy.ts must apply the guard to /api');
console.log('request guard tests passed');
