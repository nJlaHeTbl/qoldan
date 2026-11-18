// Storage limits for data that only serves protection purposes. Run opportunistically from requests
// (there is no scheduler), so each call is one cheap, idempotent statement.

const DAY = 24 * 60 * 60 * 1000;
export const PHONE_REVEAL_RETENTION_DAYS = 365;

/** Deletes "show phone" audit records older than the retention period. Returns rows removed. */
export async function purgeExpiredPhoneReveals(db: D1Database, now = Date.now()) {
  const result = await db
    .prepare('DELETE FROM phone_reveals WHERE created_at < ?')
    .bind(now - PHONE_REVEAL_RETENTION_DAYS * DAY)
    .run();
  return result.meta.changes ?? 0;
}

/** Runs the purge on roughly one request in `every`, so the cost is spread out. */
export async function maybePurge(db: D1Database, every = 20, random = Math.random) {
  if (random() * every >= 1) return 0;
  try {
    return await purgeExpiredPhoneReveals(db);
  } catch (error) {
    console.error(error);
    return 0;
  }
}
