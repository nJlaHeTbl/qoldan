// Unit tests for the rule-based smart search (pure functions, no network, no database).
import assert from 'node:assert/strict';
import { matchesSmartQuery, parseSmartQuery } from '../lib/smart-search.ts';

const q = parseSmartQuery('Нужен перфоратор в аренду в Талдыкоргане до 5000 тенге в день');
assert.deepEqual(q.words, ['перфоратор']);
assert.equal(q.type, 'Сдам');
assert.equal(q.place, 'Талдыкорган');
assert.equal(q.maxPrice, 5000);
assert.deepEqual(q.hints.map(hint => hint.replace(/\s/g, ' ')), ['аренда', 'до 5 000 ₸', 'Талдыкорган']);

const range = parseSmartQuery('куплю трактор от 1 000 000 до 3 млн');
assert.equal(range.type, 'Продам');
assert.equal(range.minPrice, 1_000_000);
assert.equal(range.maxPrice, 3, 'a bare "3" without a known unit stays a number');
const thousands = parseSmartQuery('генератор до 15 тыс');
assert.equal(thousands.maxPrice, 15_000);
assert.deepEqual(thousands.words, ['генератор']);

assert.deepEqual(parseSmartQuery('трактора').words, ['трактор'], 'case endings are trimmed');
assert.equal(parseSmartQuery('кирпич Текели').place, 'Текели');
assert.equal(parseSmartQuery('кирпич в Алматы').place, 'Алматы');
assert.equal(parseSmartQuery('кирпич').place, undefined);
assert.equal(parseSmartQuery('').words.length, 0);
assert.equal(parseSmartQuery('вспашка услуги').type, 'Окажу услугу');

const listing = (extra) => ({ title: 'Перфоратор Bosch 800 Вт', category: 'Инструменты', location: 'Талдыкорган', region: 'Область Жетісу', description: 'Аренда с бурами', type: 'Сдам', price: '3 000 ₸', ...extra });
assert.equal(matchesSmartQuery(listing(), q), true, 'matches all parts of the query');
assert.equal(matchesSmartQuery(listing({ price: '7 000 ₸' }), q), false, 'too expensive');
assert.equal(matchesSmartQuery(listing({ location: 'Текели' }), q), false, 'another town');
assert.equal(matchesSmartQuery(listing({ type: 'Продам' }), q), false, 'a sale when renting was asked');
assert.equal(matchesSmartQuery(listing({ type: 'Продам' }), q, 'Продам'), true, 'an explicit UI filter wins over the guess');
assert.equal(matchesSmartQuery(listing({ price: 'Договорная' }), q), false, 'no price cannot satisfy a price limit');
assert.equal(matchesSmartQuery(listing({ title: 'Бетономешалка', description: '' }), q), false, 'missing word');
assert.equal(matchesSmartQuery(listing({ title: 'Перфоратор', location: 'г. Талдыкорган, мкр Жастар' }), q), true, 'place inside a longer address');
assert.equal(matchesSmartQuery(listing(), parseSmartQuery('')), true, 'an empty query matches everything');
assert.equal(matchesSmartQuery({ ...listing(), title: 'Трактор МТЗ', category: 'Спецтехника', type: 'Продам', price: '2 500 000 ₸' }, parseSmartQuery('трактора от 1 000 000')), true);

console.log('PASS smart search: deal type, price range with thousands, towns in any case, stemming, explicit filters win, empty query matches all.');
