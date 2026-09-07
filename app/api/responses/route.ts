import {
  ensureMarketplaceSchema,
  getMarketplaceDb,
  getRateLimitResponse,
  getViewer,
  serverError,
  unauthorized,
  upsertViewer,
} from '@/lib/server/marketplace-db';
import {
  invalidInput,
  parseJson,
  responseInput,
} from '@/lib/server/marketplace-schemas';

export async function POST(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  try {
    const input = await parseJson(request, responseInput);
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const db = getMarketplaceDb();
    const target = await db
      .prepare('SELECT id, owner_id FROM requests WHERE id = ? AND status = ?')
      .bind(input.requestId, 'open')
      .first<{ id: string; owner_id: string }>();
    if (!target) {
      return Response.json(
        {
          error:
            'Это демонстрационная заявка. Создайте новую для живых откликов.',
        },
        { status: 409 },
      );
    }
    if (target.owner_id === viewer.id) {
      return Response.json(
        { error: 'Нельзя откликаться на собственную заявку' },
        { status: 409 },
      );
    }
    const existing = await db
      .prepare(
        `SELECT id FROM responses
         WHERE request_id = ? AND owner_id = ?`,
      )
      .bind(input.requestId, viewer.id)
      .first<{ id: string }>();
    if (existing) {
      return Response.json(
        { error: 'Вы уже отправили отклик на эту заявку' },
        { status: 409 },
      );
    }
    const hourMs = 60 * 60 * 1000;
    const limited = await getRateLimitResponse(
      db
        .prepare(
          `SELECT created_at FROM responses
           WHERE owner_id = ? AND created_at >= ?
           ORDER BY created_at DESC
           LIMIT 1 OFFSET 29`,
        )
        .bind(viewer.id, Date.now() - hourMs),
      hourMs,
      'Можно отправить до 30 откликов в час. Попробуйте немного позже.',
    );
    if (limited) return limited;
    const id = crypto.randomUUID();
    const now = Date.now();
    try {
      await db.batch([
        db
          .prepare(
            `INSERT INTO responses
             (id, request_id, owner_id, price, message, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            id,
            input.requestId,
            viewer.id,
            input.price,
            input.message || null,
            now,
          ),
        db
          .prepare(
            `UPDATE requests
             SET response_count = response_count + 1, updated_at = ?
             WHERE id = ?`,
          )
          .bind(now, input.requestId),
      ]);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes(
          'UNIQUE constraint failed: responses.request_id, responses.owner_id',
        )
      ) {
        return Response.json(
          { error: 'Вы уже отправили отклик на эту заявку' },
          { status: 409 },
        );
      }
      throw error;
    }
    return Response.json(
      {
        response: {
          id,
          requestId: input.requestId,
          price: input.price,
          message: input.message,
          owner: viewer.displayName,
          ownerId: viewer.id,
          mine: true,
          selectionStatus: null,
          providerReviewCount: 0,
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
