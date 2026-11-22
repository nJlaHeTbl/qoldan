import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import hostingConfig from './.openai/hosting.json';

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  '00000000-0000-4000-8000-000000000000';

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

const localBindingConfig = {
  main: 'vinext/server/fetch-handler',
  compatibility_flags: ['nodejs_compat'],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: 'site-creator-d1',
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: 'site-creator-r2',
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Self-hosting build (QOLDAN_TARGET=node): no platform plugins; `cloudflare:workers` is replaced by the
  // Node stand-in (SQLite file + file storage). Without the variable the build is exactly the platform build.
  if (process.env.QOLDAN_TARGET === 'node') {
    return {
      // Keep the namespace expected by Vinext's dynamic navigation imports.
      environments: { client: { build: { rolldownOptions: { preserveEntrySignatures: 'strict' as const } } } },
      css: { postcss: { plugins: [tailwindcss()] } },
      plugins: [vinext()],
      resolve: {
        alias: {
          'cloudflare:workers': fileURLToPath(new URL('./lib/server/node-env.ts', import.meta.url)),
        },
      },
    };
  }

  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import('@cloudflare/vite-plugin');

  return {
    // Keep the namespace expected by Vinext's dynamic navigation imports.
    environments: { client: { build: { rolldownOptions: { preserveEntrySignatures: 'strict' as const } } } },
    css: { postcss: { plugins: [tailwindcss()] } },
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
        config: localBindingConfig,
      }),
    ],
  };
});
