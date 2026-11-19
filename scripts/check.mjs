// One command for every quality gate: integration tests, type check, lint baseline and build.
// Used locally (`node scripts/check.mjs`, add `--no-build` to skip the build) and in CI.
// Runs binaries through `node node_modules/...` so paths with Cyrillic characters work on Windows.
import { spawnSync } from 'node:child_process';

// Known lint findings that predate the current work. The number may only go down.
const LINT_BASELINE = 65;

const TESTS = [
  'test-requests',
  'test-housing',
  'test-request-selection',
  'test-response-creation',
  'test-auctions',
  'test-account',
  'test-chat',
  'test-smart-search',
  'test-portable',
  'test-server-messages',
  'test-auth',
  'test-backup',
  'test-legal',
  'test-favorites',
];

const node = process.execPath;
const run = (label, args, { capture = false } = {}) => {
  const started = Date.now();
  const result = spawnSync(node, args, {
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    maxBuffer: 64 * 1024 * 1024,
  });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  return { ok: result.status === 0, out: `${result.stdout || ''}${result.stderr || ''}`, label, seconds };
};

const failures = [];
const report = (step) => {
  console.log(`${step.ok ? 'PASS' : 'FAIL'}  ${step.label} (${step.seconds}s)`);
  if (!step.ok) failures.push(step.label);
};

for (const test of TESTS) {
  const step = run(test, ['--experimental-strip-types', `scripts/${test}.mjs`], { capture: true });
  report(step);
  if (!step.ok) console.log(step.out.split('\n').slice(-25).join('\n'));
}

report(run('typescript', ['node_modules/typescript/bin/tsc', '--noEmit']));

const lint = run('oxlint', ['node_modules/oxlint/bin/oxlint'], { capture: true });
const lintErrors = lint.out.split('\n').filter((line) => / error /.test(line)).length;
const lintOk = lintErrors <= LINT_BASELINE;
console.log(`${lintOk ? 'PASS' : 'FAIL'}  oxlint: ${lintErrors} findings (baseline ${LINT_BASELINE}, must not grow)`);
if (!lintOk) {
  failures.push('oxlint');
  console.log(lint.out.split('\n').filter((line) => / error /.test(line)).join('\n'));
}

if (!process.argv.includes('--no-build')) {
  report(run('build', ['node_modules/vinext/dist/cli.js', 'build'], { capture: true }));
}

if (failures.length) {
  console.log(`\n${failures.length} check(s) failed: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('\nAll checks passed.');
