import { getMarketplaceImages } from '@/lib/server/marketplace-db';

type UploadMetadata = {
  content_type: string;
  size: number;
  created_at: number;
};

export async function deleteUnusedUpload(
  db: D1Database,
  ownerId: string,
  key: string,
): Promise<'deleted' | 'in-use' | 'missing'> {
  const upload = await db
    .prepare(
      `SELECT content_type, size, created_at FROM uploads
       WHERE key = ? AND owner_id = ?`,
    )
    .bind(key, ownerId)
    .first<UploadMetadata>();
  if (!upload) return 'missing';

  // Remove the claimable record atomically before touching storage. Listing
  // writes require this record, so either the save or the cleanup can win.
  const deletion = await db
    .prepare(
      `DELETE FROM uploads
       WHERE key = ? AND owner_id = ?
         AND NOT EXISTS (
           SELECT 1 FROM listings
           WHERE listings.image_url = '/api/media/' || uploads.key
         ) AND NOT EXISTS (
           SELECT 1 FROM housing_details h, json_each(h.photos) p
           WHERE p.value = '/api/media/' || uploads.key
         )`,
    )
    .bind(key, ownerId)
    .run();
  if (!deletion.meta.changes) return 'in-use';

  try {
    await getMarketplaceImages().delete(key);
  } catch (error) {
    await db
      .prepare(
        `INSERT OR IGNORE INTO uploads
         (key, owner_id, content_type, size, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(key, ownerId, upload.content_type, upload.size, upload.created_at)
      .run();
    throw error;
  }
  return 'deleted';
}
