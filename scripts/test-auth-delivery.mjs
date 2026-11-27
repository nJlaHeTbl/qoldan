// Code delivery: provider chosen by environment variables, correct request shapes, no secrets in errors.
import assert from 'node:assert/strict';
import { createCodeSender } from '../lib/server/auth-delivery.ts';

const calls = [];
const okFetch = async (url, init) => { calls.push({ url: String(url), init }); return new Response('{}', { status: 200 }); };
const failFetch = async () => new Response('{"error":"to=+77010000000 key=SECRET"}', { status: 422 });

assert.equal(createCodeSender({}), null, 'no provider configured');
assert.equal(createCodeSender({ QOLDAN_AUTH_EMAIL_PROVIDER: 'constructor' }), null, 'unknown provider names never reach Object.prototype');
assert.equal(createCodeSender({ QOLDAN_AUTH_SMS_PROVIDER: 'toString' }), null);

const env = {
  QOLDAN_AUTH_EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 're_test_key', QOLDAN_AUTH_EMAIL_FROM: 'Qoldan <login@example.test>',
  QOLDAN_AUTH_SMS_PROVIDER: 'twilio', TWILIO_ACCOUNT_SID: 'ACtest', TWILIO_AUTH_TOKEN: 'tok', TWILIO_FROM: 'Qoldan',
};
const send = createCodeSender(env, okFetch);
await send('email', 'user@example.kz', '123456');
assert.equal(calls[0].url, 'https://api.resend.com/emails');
assert.equal(calls[0].init.headers.Authorization, 'Bearer re_test_key');
const mail = JSON.parse(calls[0].init.body);
assert.deepEqual(mail.to, ['user@example.kz']);
assert.ok(mail.text.includes('123456') && mail.subject.includes('123456'));

await send('phone', '+77010000000', '654321');
assert.equal(calls[1].url, 'https://api.twilio.com/2010-04-01/Accounts/ACtest/Messages.json');
assert.equal(calls[1].init.headers.Authorization, `Basic ${btoa('ACtest:tok')}`);
const form = new URLSearchParams(calls[1].init.body);
assert.equal(form.get('To'), '+77010000000');
assert.equal(form.get('From'), 'Qoldan');
assert.ok(form.get('Body').includes('654321'));

await assert.rejects(createCodeSender(env, failFetch)('phone', '+77010000000', '111111'), (error) => {
  assert.match(error.message, /HTTP 422/);
  assert.ok(!error.message.includes('SECRET') && !error.message.includes('7701'), 'provider body is never copied into the error');
  return true;
});

const emailOnly = createCodeSender({ QOLDAN_AUTH_EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'k', QOLDAN_AUTH_EMAIL_FROM: 'a@b.kz' }, okFetch);
await assert.rejects(emailOnly('phone', '+77010000000', '222222'), /No provider configured for channel phone/);
await assert.rejects(createCodeSender({ QOLDAN_AUTH_EMAIL_PROVIDER: 'resend' }, okFetch)('email', 'u@e.kz', '333333'), /RESEND_API_KEY is not configured/);

const logged = [];
const original = console.log;
console.log = (line) => logged.push(line);
await createCodeSender({ QOLDAN_AUTH_SENDER: 'console' })('email', 'u@e.kz', '444444');
console.log = original;
assert.ok(logged[0].includes('auth_code_dev'));
console.log('auth delivery tests passed');
