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
console.log('page copy tests passed');
