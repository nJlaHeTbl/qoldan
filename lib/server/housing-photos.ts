// Include gallery references everywhere an upload can be removed or reused.
export const photoReferenceSql = `SELECT id FROM listings WHERE image_url = ?
  UNION ALL SELECT h.listing_id AS id FROM housing_details h, json_each(h.photos) p WHERE p.value = ?`;

// Guard evaluated inside the write itself, so two simultaneous saves cannot both claim one photo.
// Binds: JSON array of photo URLs, owner id. `self` is the SQL expression of the listing being written.
export const photoClaimGuardSql = (self: string) => `NOT EXISTS (SELECT 1 FROM json_each(?) n WHERE
  NOT EXISTS (SELECT 1 FROM uploads u WHERE u.owner_id = ? AND '/api/media/' || u.key = n.value)
  OR EXISTS (SELECT 1 FROM listings o WHERE o.image_url = n.value AND o.id != ${self})
  OR EXISTS (SELECT 1 FROM housing_details h, json_each(h.photos) p WHERE p.value = n.value AND h.listing_id != ${self}))`;

export async function validateHousingPhotos(db: D1Database, ownerId: string, photos: string[], listingId = '') {
  for (const url of photos) {
    const owned = await db.prepare('SELECT key FROM uploads WHERE key = ? AND owner_id = ?')
      .bind(url.slice('/api/media/'.length), ownerId).first();
    if (!owned) return Response.json({ error: 'Фотография не найдена или принадлежит другому пользователю. Загрузите её ещё раз.' }, { status: 400 });
    const linked = await db.prepare(`SELECT id FROM (${photoReferenceSql}) WHERE id != ? LIMIT 1`)
      .bind(url, url, listingId).first();
    if (linked) return Response.json({ error: 'Эта фотография используется в другом объявлении.' }, { status: 409 });
  }
  return null;
}
