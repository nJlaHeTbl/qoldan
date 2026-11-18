// Portable replacements for the Cloudflare bindings, for self-hosting on an ordinary Node server (for example a
// cloud in Kazakhstan, see docs/INFRASTRUCTURE.md). Node-only: never imported by code that runs on Workers.
// They implement exactly the parts of the D1 and R2 APIs that Qoldan uses, so the routes run unchanged.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

type Row = Record<string, unknown>;

/** D1-compatible database over SQLite (file path or ':memory:'). Batches are atomic and run one at a time. */
export function createSqliteD1(path = ':memory:') {
  const sqlite = new DatabaseSync(path);
  sqlite.exec('PRAGMA foreign_keys = ON');
  let queue: Promise<unknown> = Promise.resolve();

  const statement = (sql: string) => {
    let args: SQLInputValue[] = [];
    const self = {
      bind(...values: unknown[]) {
        args = values as SQLInputValue[];
        return self;
      },
      async first<T = Row>() {
        const row = sqlite.prepare(sql).get(...args);
        // D1 returns plain objects; node:sqlite returns null-prototype ones.
        return (row ? { ...row } : null) as T | null;
      },
      async all<T = Row>() {
        return { results: sqlite.prepare(sql).all(...args).map((row) => ({ ...row })) as T[], success: true };
      },
      async run() {
        const result = sqlite.prepare(sql).run(...args);
        return { success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
      },
    };
    return self;
  };

  type Statement = ReturnType<typeof statement>;
  const runBatch = async (statements: Statement[]) => {
    sqlite.exec('BEGIN');
    try {
      const results = [];
      for (const item of statements) results.push(await item.run());
      sqlite.exec('COMMIT');
      return results;
    } catch (error) {
      sqlite.exec('ROLLBACK');
      throw error;
    }
  };

  return {
    sqlite,
    prepare: statement,
    batch(statements: Statement[]) {
      const run = queue.then(() => runBatch(statements));
      queue = run.catch(() => undefined);
      return run;
    },
    async exec(sql: string) {
      sqlite.exec(sql);
      return { count: 1, duration: 0 };
    },
  };
}

type PutOptions = { httpMetadata?: { contentType?: string } };

/** R2-compatible file store (put / get / delete) in a local directory. */
export function createFileImageStore(directory: string) {
  mkdirSync(directory, { recursive: true });
  const safe = (key: string) => {
    if (!/^[0-9a-zA-Z._-]+$/.test(key) || key.includes('..')) throw new Error('Invalid storage key');
    return join(directory, key);
  };
  return {
    async put(key: string, value: ReadableStream | ArrayBuffer | Uint8Array | string, options: PutOptions = {}) {
      const bytes = new Uint8Array(
        typeof value === 'string' || value instanceof ArrayBuffer || value instanceof Uint8Array
          ? await new Response(value as BodyInit).arrayBuffer()
          : await new Response(value).arrayBuffer(),
      );
      const file = safe(key);
      writeFileSync(file, bytes);
      const etag = createHash('sha256').update(bytes).digest('hex').slice(0, 32);
      writeFileSync(`${file}.meta.json`, JSON.stringify({ contentType: options.httpMetadata?.contentType ?? 'application/octet-stream', etag, size: bytes.length }));
      return { key, size: bytes.length, httpEtag: `"${etag}"` };
    },
    async get(key: string) {
      const file = safe(key);
      if (!existsSync(file)) return null;
      const bytes = readFileSync(file);
      const meta = JSON.parse(readFileSync(`${file}.meta.json`, 'utf8')) as { contentType: string; etag: string; size: number };
      return {
        key,
        size: meta.size,
        httpEtag: `"${meta.etag}"`,
        body: new Response(bytes).body,
        writeHttpMetadata(headers: Headers) {
          headers.set('content-type', meta.contentType);
        },
        async arrayBuffer() {
          return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        },
      };
    },
    async delete(key: string) {
      const file = safe(key);
      rmSync(file, { force: true });
      rmSync(`${file}.meta.json`, { force: true });
    },
  };
}
