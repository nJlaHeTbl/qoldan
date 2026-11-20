// Builds Qoldan for a plain Node server and puts everything a phone (Termux) or any small server needs into
// release/qoldan-phone/: the standalone server, database migrations, the backup script and start.sh.
// Guide: docs/ANDROID.md. Usage: node scripts/pack-phone.mjs
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, rmSync, writeFileSync } from 'node:fs';

const out = 'release/qoldan-phone';

const build = spawnSync(process.execPath, ['scripts/build-node.mjs'], { stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);

if (existsSync(out)) rmSync(out, { recursive: true, force: true });
cpSync('dist/standalone', out, { recursive: true });
cpSync('drizzle', `${out}/drizzle`, { recursive: true });
cpSync('scripts/backup.mjs', `${out}/backup.mjs`);

// LF line endings: the script runs in Termux's shell.
const start = [
  '#!/data/data/com.termux/files/usr/bin/sh',
  '# Starts Qoldan. Settings live in .env next to this file (created on first start; keep it private).',
  'cd "$(dirname "$0")" || exit 1',
  'if [ ! -f .env ]; then',
  '  secret=$(node -e "console.log(require(\'node:crypto\').randomBytes(32).toString(\'hex\'))")',
  '  printf "QOLDAN_AUTH_SECRET=%s\\nQOLDAN_AUTH_SENDER=console\\nQOLDAN_AUTH_CHANNELS=phone,email\\n" "$secret" > .env',
  '  chmod 600 .env',
  'fi',
  'set -a',
  '. ./.env',
  'set +a',
  'export PORT="${PORT:-3000}" HOST="${HOST:-0.0.0.0}" QOLDAN_AUTH_MODE=own',
  'export QOLDAN_DATA_DIR="${QOLDAN_DATA_DIR:-$HOME/qoldan-data}"',
  'command -v termux-wake-lock >/dev/null 2>&1 && termux-wake-lock',
  'exec node server.js',
  '',
].join('\n');
writeFileSync(`${out}/start.sh`, start, { mode: 0o755 });

console.log(`\nReady: ${out}/  (copy the whole folder to the phone, see docs/ANDROID.md)`);
