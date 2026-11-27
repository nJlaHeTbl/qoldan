// The hosting platform frame blocks window.prompt (throws) and answers window.confirm with "no" without showing it,
// so user-facing pages must ask for confirmation with their own UI instead.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(full);
  return entry.name.endsWith('.tsx') ? [full] : [];
});

const files = [...walk('app'), ...walk('components')];
assert.ok(files.length > 10, 'pages found');

const offenders = [];
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  source.split(/\r?\n/).forEach((line, index) => {
    if (/\bwindow\.(prompt|confirm|alert)\s*\(/.test(line) && !line.trim().startsWith('//')) {
      offenders.push(`${file}:${index + 1}`);
    }
  });
}

// Known leftovers: the owner-only map editor and the housing "unsaved changes" guard still use window.confirm.
const ALLOWED = new Set([
  path.join('app', 'map-editor', 'page.tsx'),
  path.join('app', 'housing', 'housing-client.tsx'),
]);
const blocking = offenders.filter((place) => !ALLOWED.has(place.split(':')[0]));
assert.deepEqual(blocking, [], `native dialogs are not shown inside the platform frame: ${blocking.join(', ')}`);
console.log(`native dialog test passed (${offenders.length} known leftovers in the map editor and housing guard)`);
