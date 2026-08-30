import {
  ensureMarketplaceSchema,
  getMarketplaceDb,
  getViewer,
  serverError,
  unauthorized,
  upsertViewer,
} from '@/lib/server/marketplace-db';
import {
  invalidInput,
  parseJson,
  savedSearchInput,
} from '@/lib/server/marketplace-schemas';
import {
  mapSavedSearch,
  savedSearchSelect,
  type SavedSearchRow,
} from '@/lib/server/saved-searches';

export async function POST(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  try {
    const input = await parseJson(request, savedSearchInput);
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const db = getMarketplaceDb();

    if (input.action === 'create') {
      const count = await db
        .prepare(
          'SELECT COUNT(*) AS count FROM saved_searches WHERE owner_id = ?',
        )
        .bind(viewer.id)
        .first<{ count: number }>();
      if (Number(count?.count || 0) >= 20) {
        return Response.json(
          { error: 'Можно сохранить не больше 20 поисков' },
          { status: 409 },
        );
      }
      const id = crypto.randomUUID();
      const now = Date.now();
      const inserted = await db
        .prepare(
          `INSERT OR IGNORE INTO saved_searches
           (id, owner_id, name, search_query, region, category, offer_type,
            delivery_only, company_only, created_at, last_viewed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id,
          viewer.id,
          input.name,
          input.query,
          input.region,
          input.category,
          input.offerType,
          input.deliveryOnly ? 1 : 0,
          input.companyOnly ? 1 : 0,
          now,
          now,
        )
        .run();
      if (!inserted.meta.changes) {
        return Response.json(
          { error: 'Такой поиск уже сохранён' },
          { status: 409 },
        );
      }
      const row = await db
        .prepare(
          `${savedSearchSelect} WHERE saved_searches.id = ? AND saved_searches.owner_id = ?`,
        )
        .bind(id, viewer.id)
        .first<SavedSearchRow>();
      if (!row) throw new Error('Saved search was not created');
      return Response.json(
        { savedSearch: mapSavedSearch(row) },
        { status: 201 },
      );
    }

    if (input.action === 'delete') {
      const deleted = await db
        .prepare('DELETE FROM saved_searches WHERE id = ? AND owner_id = ?')
        .bind(input.savedSearchId, viewer.id)
        .run();
      if (!deleted.meta.changes) {
        return Response.json(
          { error: 'Сохранённый поиск не найден' },
          { status: 404 },
        );
      }
      return Response.json({ deleted: true });
    }

    const viewedAt = Date.now();
    const updated = await db
      .prepare(
        `UPDATE saved_searches SET last_viewed_at = ?
         WHERE id = ? AND owner_id = ?`,
      )
      .bind(viewedAt, input.savedSearchId, viewer.id)
      .run();
    if (!updated.meta.changes) {
      return Response.json(
        { error: 'Сохранённый поиск не найден' },
        { status: 404 },
      );
    }
    return Response.json({ viewedAt });
  } catch (error) {
    try {
      return invalidInput(error);
    } catch {
      return serverError(error);
    }
  }
}
