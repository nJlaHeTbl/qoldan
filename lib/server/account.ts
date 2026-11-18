// Self-service personal data: export everything a user has stored, or delete the account.
// scripts/test-account.mjs checks that every table referencing users is covered here.

export const DELETED_USER_ID = '__deleted_user__';

/** Tables with the user's own data and how to find their rows. */
export const EXPORT_TABLES: ReadonlyArray<readonly [string, string]> = [
  ['listings', 'owner_id = ?1'],
  ['housing_details', 'listing_id IN (SELECT id FROM listings WHERE owner_id = ?1)'],
  ['listing_locations', 'listing_id IN (SELECT id FROM listings WHERE owner_id = ?1)'],
  ['requests', 'owner_id = ?1'],
  ['responses', 'owner_id = ?1'],
  ['request_selections', 'selected_by = ?1'],
  ['bookings', 'owner_id = ?1'],
  ['favorites', 'owner_id = ?1'],
  ['saved_searches', 'owner_id = ?1'],
  ['conversations', 'participant_id = ?1 OR context_owner_id = ?1'],
  // Only the user's own messages: the other side's words are their personal data.
  ['messages', 'sender_id = ?1'],
  ['reviews', 'reviewer_id = ?1 OR reviewee_id = ?1'],
  ['request_reviews', 'reviewer_id = ?1 OR provider_id = ?1'],
  ['reports', 'owner_id = ?1'],
  ['appeals', 'owner_id = ?1'],
  ['support_tickets', 'owner_id = ?1'],
  ['business_verifications', 'owner_id = ?1'],
  ['uploads', 'owner_id = ?1'],
  ['phone_reveals', 'viewer_id = ?1'],
  ['auctions', 'seller_id = ?1'],
  ['bids', 'bidder_id = ?1'],
  ['settlement_edits', 'owner_id = ?1'],
  ['moderation_actions', 'target_owner_id = ?1'],
];

// Staff identities are not the user's data.
const REDACTED_COLUMNS = new Set(['moderator_id', 'reviewed_by']);

export async function exportAccount(db: D1Database, userId: string) {
  const user = await db
    .prepare('SELECT id, email, display_name, created_at, updated_at FROM users WHERE id = ?')
    .bind(userId)
    .first();
  const data: Record<string, unknown[]> = {};
  for (const [table, where] of EXPORT_TABLES) {
    const rows = await db
      .prepare(`SELECT * FROM ${table} WHERE ${where}`)
      .bind(userId)
      .all<Record<string, unknown>>();
    data[table] = rows.results.map((row) =>
      Object.fromEntries(Object.entries(row).filter(([key]) => !REDACTED_COLUMNS.has(key))),
    );
  }
  return {
    format: 'qoldan-account-export-v1',
    exportedAt: new Date().toISOString(),
    note: 'Времена указаны в миллисекундах Unix. Сообщения собеседников не включены — это их персональные данные.',
    user,
    data,
  };
}

/** Why the account cannot be deleted right now, or null. */
export async function deletionBlocker(db: D1Database, userId: string, now = Date.now()) {
  const sellingWithBids = await db
    .prepare(
      `SELECT 1 AS found FROM auctions
       WHERE seller_id = ? AND status = 'active' AND bid_count > 0 AND ends_at > ? LIMIT 1`,
    )
    .bind(userId, now)
    .first();
  if (sellingWithBids) {
    return 'У вас идут торги со ставками. Удалить аккаунт можно после их окончания.';
  }
  const leading = await db
    .prepare(
      `SELECT 1 AS found FROM auctions
       WHERE leader_id = ? AND status = 'active' AND ends_at > ? LIMIT 1`,
    )
    .bind(userId, now)
    .first();
  if (leading) {
    return 'Ваша ставка лидирует в идущих торгах. Удалить аккаунт можно после их окончания.';
  }
  return null;
}

/**
 * Deletes the account and, through ON DELETE CASCADE, everything the user published or wrote.
 * The moderation log and map edits must survive for accountability, so they are re-pointed to
 * an anonymous placeholder user first (their foreign keys do not cascade). Returns the upload keys
 * whose files must then be removed from storage.
 */
export async function deleteAccount(db: D1Database, userId: string, now = Date.now()) {
  const uploads = await db
    .prepare('SELECT key FROM uploads WHERE owner_id = ?')
    .bind(userId)
    .all<{ key: string }>();
  await db.batch([
    db
      .prepare(
        `INSERT OR IGNORE INTO users (id, email, display_name, created_at, updated_at)
         VALUES (?, 'deleted@qoldan.invalid', 'Удалённый пользователь', ?, ?)`,
      )
      .bind(DELETED_USER_ID, now, now),
    db
      .prepare('UPDATE moderation_actions SET target_owner_id = ?1 WHERE target_owner_id = ?2')
      .bind(DELETED_USER_ID, userId),
    db
      .prepare('UPDATE moderation_actions SET moderator_id = ?1 WHERE moderator_id = ?2')
      .bind(DELETED_USER_ID, userId),
    db
      .prepare('UPDATE settlement_edits SET owner_id = ?1 WHERE owner_id = ?2')
      .bind(DELETED_USER_ID, userId),
    db
      .prepare('UPDATE settlement_edits SET reviewed_by = ?1 WHERE reviewed_by = ?2')
      .bind(DELETED_USER_ID, userId),
    // Cascades do not touch counters: other people's requests lose this user's responses.
    db
      .prepare(
        `UPDATE requests SET
           response_count = MAX(response_count - (SELECT COUNT(*) FROM responses
             WHERE responses.request_id = requests.id AND responses.owner_id = ?1), 0),
           updated_at = ?2
         WHERE owner_id != ?1
           AND id IN (SELECT request_id FROM responses WHERE owner_id = ?1)`,
      )
      .bind(userId, now),
    db.prepare('DELETE FROM users WHERE id = ?').bind(userId),
  ]);
  return uploads.results.map((row) => row.key);
}
