// Translation tables of server pages: own keys only (user-typed units/categories like "constructor" stay text),
// and every request kind / listing label has RU, KK and EN versions.
import assert from 'node:assert/strict';
import { listingPageCopy } from '../lib/listing-page-copy.ts';
import { valueLabel } from '../lib/ui-copy.ts';
for (const lang of ['ru', 'kk', 'en']) {
  const t = listingPageCopy(lang);
  for (const evil of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
    assert.equal(t.unitLabel(evil), evil); assert.equal(t.categoryLabel(evil), evil); assert.equal(valueLabel(lang, evil), evil);
  }
}
assert.equal(listingPageCopy('en').unitLabel('/ час'), '/ hour');
assert.equal(listingPageCopy('kk').categoryLabel('Зерно'), 'Астық');

import { requestPageCopy } from '../lib/request-page-copy.ts';
import { describeAttributes } from '../lib/listing-attributes.ts';
for (const lang of ['ru', 'kk', 'en']) {
  const r = requestPageCopy(lang);
  for (const kind of ['agro', 'rent', 'build', 'recycle']) assert.ok(r.kinds[kind], `${lang} kind ${kind}`);
  assert.equal(r.responses(1).startsWith('1 '), true);
  assert.deepEqual(describeAttributes({ rateUnit: 'constructor' }, lang).some((fact) => typeof fact !== 'string'), false);
}
assert.equal(requestPageCopy('ru').responses(3), '3 отклика');
assert.equal(requestPageCopy('ru').responses(11), '11 откликов');
// Housing section and shared place fields: every stored category/seller value is labelled, no Cyrillic leaks
// into the English texts, user-typed values stay text.
import { housingCopy } from '../lib/housing-copy.ts';
import { locationCopy } from '../lib/location-copy.ts';
import { HOUSING_CATEGORIES } from '../lib/housing.ts';
for (const lang of ['kk', 'en']) {
  const h = housingCopy(lang);
  for (const kind of HOUSING_CATEGORIES) assert.notEqual(h.categoryLabel(kind), kind, `${lang} housing ${kind}`);
  for (const seller of ['Частное лицо', 'Магазин']) assert.notEqual(h.sellerLabel(seller), seller, `${lang} seller ${seller}`);
  for (const evil of ['constructor', 'toString', '__proto__']) { assert.equal(h.categoryLabel(evil), evil); assert.equal(h.sellerLabel(evil), evil); }
  assert.deepEqual(Object.keys(locationCopy(lang)).sort(), Object.keys(locationCopy('ru')).sort());
}
const cyrillic = /[А-Яа-яЁё]/;
for (const [key, value] of Object.entries({ ...housingCopy('en'), ...locationCopy('en') })) {
  if (typeof value === 'string') assert.ok(!cyrillic.test(value), `English text ${key} has Cyrillic`);
}
assert.equal(housingCopy('en').roomsGuests(1, 2), '1 room · up to 2 guests');
// Home-page shell strings: same keys in every language, no Cyrillic in English.
import { copyFor } from '../lib/ui-copy.ts';
const shellKeys = Object.keys(copyFor('ru').shell).sort();
for (const lang of ['kk', 'en']) assert.deepEqual(Object.keys(copyFor(lang).shell).sort(), shellKeys, `shell keys ${lang}`);
for (const [key, value] of Object.entries(copyFor('en').shell)) assert.ok(!cyrillic.test(value), `English shell ${key} has Cyrillic`);
console.log('page copy tests passed');

// Regions, directions menu and demo examples: every language is complete and English has no Cyrillic.
import { COPY } from '../lib/ui-copy.ts';
import { KAZAKHSTAN_REGIONS, regionLabel } from '../lib/regions.ts';
import { demoRequestText } from '../lib/demo-copy.ts';
// attrs.values is a lookup table (stored Russian value -> label), so Russian may legitimately have fewer entries.
const withoutLookup = (copy) => ({ ...copy, attrs: { ...copy.attrs, values: {} } });
const shape = (value) => (value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v)]).sort(([a], [b]) => (a < b ? -1 : 1))) : typeof value);
assert.deepEqual(shape(withoutLookup(COPY.kk)), shape(withoutLookup(COPY.ru)), 'COPY kk structure matches ru');
assert.deepEqual(shape(withoutLookup(COPY.en)), shape(withoutLookup(COPY.ru)), 'COPY en structure matches ru');
for (const { name } of KAZAKHSTAN_REGIONS) {
  assert.ok(!cyrillic.test(regionLabel('en', name)), `English region ${name}`);
  assert.notEqual(regionLabel('kk', name), '', `Kazakh region ${name}`);
}
assert.equal(regionLabel('en', 'Алматы'), 'Almaty');
assert.equal(regionLabel('en', 'constructor'), 'constructor');
for (const [id, byLang] of Object.entries(demoRequestText)) {
  for (const [field, value] of Object.entries(byLang.en)) assert.ok(!cyrillic.test(value), `English demo ${id} ${field}`);
  assert.deepEqual(Object.keys(byLang.kk).sort(), Object.keys(byLang.en).sort());
}
for (const category of ['Техника', 'Услуги', 'Корма и сено', 'Зерно', 'Пастбища', 'Скот и животные', 'Перевозка скота', 'Стройматериалы', 'Остатки партий', 'Инструменты', 'Аренда техники', 'Рабочие услуги', 'Доставка', 'Спецтехника', 'Электроника', 'Оборудование', 'Для мероприятий', 'Генераторы']) {
  assert.ok(!cyrillic.test(listingPageCopy('en').categoryLabel(category)), `English category ${category}`);
  assert.ok(listingPageCopy('kk').categoryLabel(category).length > 0, `Kazakh category ${category}`);
}
console.log('regions and demo copy tests passed');
