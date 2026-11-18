import {
  ensureMarketplaceSchema,
  getMarketplaceDb,
  getRateLimitResponse,
  getViewer,
  serverError,
  unauthorized,
  upsertViewer,
} from '@/lib/server/marketplace-db';
import { z } from 'zod';
import {
  invalidInput,
  parseJson,
  requestInput,
} from '@/lib/server/marketplace-schemas';

export async function POST(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  try {
    const input = await parseJson(request, requestInput);
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const db = getMarketplaceDb();
    const hourMs = 60 * 60 * 1000;
    const limited = await getRateLimitResponse(
      db
        .prepare(
          `SELECT created_at FROM requests
           WHERE owner_id = ? AND created_at >= ?
           ORDER BY created_at DESC
           LIMIT 1 OFFSET 9`,
        )
        .bind(viewer.id, Date.now() - hourMs),
      hourMs,
      'Можно создать до 10 заявок в час. Попробуйте немного позже.',
    );
    if (limited) return limited;
    const id = crypto.randomUUID();
    const now = Date.now();
    await db
      .prepare(
        `INSERT INTO requests
         (id, owner_id, title, place, when_text, budget, kind, region,
          status, response_count, created_at, updated_at, latitude, longitude)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', 0, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        viewer.id,
        input.title,
        input.place,
        input.when,
        input.budget,
        input.kind,
        input.region,
        now,
        now,
        input.latitude ?? null,
        input.longitude ?? null,
      )
      .run();
    return Response.json(
      {
        request: {
          id,
          title: input.title,
          place: input.place,
          latitude: input.latitude,
          longitude: input.longitude,
          when: input.when,
          budget: input.budget,
          responses: 0,
          kind: input.kind,
          region: input.region,
          owner: viewer.displayName,
          status: 'open',
          mine: true,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    try {
      return invalidInput(error);
    } catch {
      return serverError(error);
    }
  }
}

const editInput = z.object({
  requestId: z.string().trim().min(1).max(80),
  data: requestInput,
});

// The owner may fix a request until the first response arrives: after that, providers have priced
// the original terms, so changing them would mislead. The guard lives in the UPDATE itself, so a
// response that lands at the same moment wins and the edit is refused.
export async function PATCH(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  try {
    const { requestId, data } = await parseJson(request, editInput);
    await ensureMarketplaceSchema();
    const db = getMarketplaceDb();
    const now = Date.now();
    const result = await db
      .prepare(
        `UPDATE requests SET title = ?, place = ?, when_text = ?, budget = ?, kind = ?, region = ?,
           latitude = ?, longitude = ?, updated_at = MAX(updated_at + 1, ?)
         WHERE id = ? AND owner_id = ? AND status = 'open' AND response_count = 0`,
      )
      .bind(
        data.title,
        data.place,
        data.when,
        data.budget,
        data.kind,
        data.region,
        data.latitude ?? null,
        data.longitude ?? null,
        now,
        requestId,
        viewer.id,
      )
      .run();
    if (!result.meta.changes) {
      const current = await db
        .prepare('SELECT status, response_count FROM requests WHERE id = ? AND owner_id = ?')
        .bind(requestId, viewer.id)
        .first<{ status: string; response_count: number }>();
      if (!current) {
        return Response.json({ error: 'Заявка не найдена' }, { status: 404 });
      }
      return Response.json(
        {
          error:
            current.response_count > 0
              ? 'На заявку уже откликнулись: условия изменить нельзя. Закройте её и создайте новую.'
              : 'Закрытую заявку нельзя изменить. Откройте её снова.',
        },
        { status: 409 },
      );
    }
    return Response.json({
      request: {
        id: requestId,
        title: data.title,
        place: data.place,
        latitude: data.latitude,
        longitude: data.longitude,
        when: data.when,
        budget: data.budget,
        kind: data.kind,
        region: data.region,
      },
    });
  } catch (error) {
    try {
      return invalidInput(error);
    } catch {
      return serverError(error);
    }
  }
}
