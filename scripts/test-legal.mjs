// Keeps the legal pages honest: every table that stores data must be described in the privacy
// policy, every form must show the consent note, and unfilled operator details are listed.
// Read-only: no network, no writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const privacy = read('app/legal/privacy/page.tsx');
const client = read('app/qoldan-client.tsx');
const housingClient = read('app/housing/housing-client.tsx');

// 1. Table -> wording that must appear in the privacy policy.
const covered = {
  users: 'e-mail', listings: 'Объявления', listing_locations: 'Точка на карте', housing_details: 'жильё',
  uploads: 'фото', favorites: 'Избранное', saved_searches: 'сохранённые поиски', requests: 'Заявки',
  responses: 'отклик', request_selections: 'отклик', request_reviews: 'Отзывы', reviews: 'Отзывы',
  conversations: 'Чаты', messages: 'Чаты', bookings: 'Бронирования', rental_handoffs: 'передача техники',
  reports: 'Жалобы', appeals: 'апелляции', moderation_actions: 'модерации', support_tickets: 'обращения',
  business_verifications: 'БИН', settlement_edits: 'Правки карты', settlement_overrides: 'Правки карты',
};
const tables = new Set();
for (const file of fs.readdirSync('drizzle').filter(name => name.endsWith('.sql'))) {
  for (const match of read('drizzle/' + file).matchAll(/CREATE TABLE `(\w+)`/g)) tables.add(match[1]);
}
for (const table of tables) {
  assert.ok(covered[table], `Table "${table}" stores data but is not covered by the privacy policy mapping: update app/legal/privacy/page.tsx and this test`);
  assert.ok(privacy.toLowerCase().includes(covered[table].toLowerCase()), `Privacy policy does not mention "${covered[table]}" (table ${table})`);
}

// 2. Every form with a submit button shows the consent note right before it.
const submitButtons = [...client.matchAll(/className="submit-button"/g)].length;
const noteBeforeButton = [...client.matchAll(/<ConsentNote lang=\{appLang\} \/>\s*<button\s+className="submit-button"/g)].length;
assert.equal(noteBeforeButton, submitButtons, `${submitButtons - noteBeforeButton} form(s) lack the consent note`);
assert.ok(housingClient.includes('<ConsentNote />'), 'Housing form lacks the consent note');

// 3. Sensitive business verification needs explicit, server-checked consent.
assert.ok(client.includes('name="consent" required'), 'Verification form lacks the required consent checkbox');
assert.ok(read('lib/server/marketplace-schemas.ts').includes('z.literal(true'), 'Verification schema does not require consent');

// 4. The pages promised in the policy exist.
for (const page of ['privacy', 'terms', 'returns', 'cookies']) assert.ok(fs.existsSync(`app/legal/${page}/page.tsx`), `Missing legal page: ${page}`);
assert.ok(read('app/layout.tsx').includes('<CookieNotice />'), 'Cookie notice is not mounted in the layout');

// 5. Report (not fail) placeholders that still need real values before launch.
const legal = read('lib/legal.ts');
const unfilled = [...legal.matchAll(/(\w+): '(\[[^']+\])'/g)].map(match => `${match[1]} = ${match[2]}`);
const inPages = fs.readdirSync('app/legal', { recursive: true }).filter(name => String(name).endsWith('page.tsx'))
  .flatMap(name => [...read('app/legal/' + name).matchAll(/<Todo>(\[[^<]+\])<\/Todo>/g)].map(match => `${name}: ${match[1]}`));
console.log(`PASS legal: ${tables.size} tables covered, ${submitButtons} forms + housing form show consent, verification consent enforced.`);
if (unfilled.length || inPages.length) console.log('TODO before launch -> ' + [...unfilled, ...inPages].join('; '));
