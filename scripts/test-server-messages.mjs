// Every user-facing Russian message in the API must have Kazakh and English versions, so the interface never
// falls back to Russian for a known error. Adding a new message without a translation fails this test.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SERVER_MESSAGES, translateServerMessage } from '../lib/server-messages.ts';

const files = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (full.endsWith('.ts')) files.push(full);
  }
};
walk('app/api');
walk('lib/server');

const found = new Set();
const patterns = [
  /(?:error:\s*|refuse\(\s*\d+,\s*)'([^'\n`$]{6,})'/g,
  /error:\s*\n\s*'([^'\n]+)'/g,
  /getRateLimitResponse\([\s\S]*?,\s*[\w.]+,\s*'([^'\n]+)'/g,
];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      if (/[а-яё]/i.test(match[1]) && !match[1].endsWith(': ')) found.add(match[1]);
    }
  }
}
const missing = [...found].filter((message) => !SERVER_MESSAGES[message]);
assert.deepEqual(missing, [], `server messages without translation:\n${missing.join('\n')}`);
for (const [message, [kk, en]] of Object.entries(SERVER_MESSAGES)) {
  assert.ok(kk && en, `empty translation for: ${message}`);
  assert.ok(!/[ыэъё]/i.test(en) && /[a-z]/i.test(en), `English text looks untranslated: ${en}`);
}

assert.equal(translateServerMessage('Отклик не найден', 'en'), 'Response not found');
assert.equal(translateServerMessage('Отклик не найден', 'kk'), 'Жауап табылмады');
assert.equal(translateServerMessage('Отклик не найден', 'ru'), 'Отклик не найден');
assert.equal(translateServerMessage('Ставка должна быть не меньше 105 000 ₸', 'en'), 'Ставка должна быть не меньше 105 000 ₸', 'dynamic texts stay as they are');
assert.equal(translateServerMessage('Проверьте характеристики: неверное значение', 'en'), 'Check the characteristics: неверное значение');

console.log(`PASS server messages: ${found.size} static API messages, all translated to Kazakh and English; unknown texts pass through.`);
