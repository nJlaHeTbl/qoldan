// The nonce-based CSP builder never allows inline or eval scripts and rejects weak nonces.
import assert from 'node:assert/strict';
import { buildCsp, newNonce } from '../lib/server/csp.ts';

const nonce = newNonce();
assert.match(nonce, /^[A-Za-z0-9+/=]{24}$/);
assert.notEqual(newNonce(), newNonce());
const policy = buildCsp({ nonce });
const scriptSrc = policy.split('; ').find((part) => part.startsWith('script-src'));
assert.ok(scriptSrc.includes(`'nonce-${nonce}'`));
assert.ok(!scriptSrc.includes("'unsafe-inline'") && !scriptSrc.includes("'unsafe-eval'"));
for (const must of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "connect-src 'self'"]) assert.ok(policy.includes(must), must);
assert.ok(policy.includes('https://tile.openstreetmap.org'));
assert.throws(() => buildCsp({ nonce: 'short' }));
assert.throws(() => buildCsp({ nonce: "abc'; script-src * 'unsafe-inline" }));
console.log('csp tests passed');
