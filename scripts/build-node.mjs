// Builds Qoldan for an ordinary Node server (self-hosting, e.g. a cloud in Kazakhstan). Cross-platform way to set
// QOLDAN_TARGET=node. Output: dist/standalone/server.js. Start (from the project root, so ./drizzle is found):
//   PORT=3000 HOST=0.0.0.0 QOLDAN_DATA_DIR=/var/lib/qoldan QOLDAN_AUTH_MODE=own QOLDAN_AUTH_SECRET=... node dist/standalone/server.js
// The regular `vinext build` (platform build) is unaffected.
import { spawnSync } from 'node:child_process';

const result = spawnSync(process.execPath, ['node_modules/vinext/dist/cli.js', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, QOLDAN_TARGET: 'node' },
});
process.exit(result.status ?? 1);
