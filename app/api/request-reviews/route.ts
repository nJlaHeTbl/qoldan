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
  requestReviewInput,
} from '@/lib/server/marketplace-schemas';

export async function POST(request: Request) {
  const viewer = await getViewer(request);
  if (!viewer) return unauthorized();
  try {
    const input = await parseJson(request, requestReviewInput);
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const db = getMarketplaceDb();
    const completedWork = await db
      .prepare(
        `SELECT requests.id AS request_id, requests.title,
                requests.owner_id AS reviewer_id,
                request_selections.response_id,
                request_selections.status,
                responses.owner_id AS provider_id,
                providers.display_name AS provider_name
         FROM requests
         JOIN request_selections
           ON request_selections.request_id = requests.id
         JOIN responses
           ON responses.id = request_selections.response_id
         JOIN users providers ON providers.id = responses.owner_id
         WHERE requests.id = ? AND requests.owner_id = ?`,
      )
      .bind(input.requestId, viewer.id)
      .first<{
        request_id: string;
        title: string;
        reviewer_id: string;
        response_id: string;
        status: string;
        provider_id: string;
        provider_name: string;
      }>();
    if (!completedWork) {
      return Response.json(
        {
          error: 'Завершённая заявка не найдена или принадлежит другому автору',
        },
        { status: 404 },
      );
    }
    if (completedWork.status !== 'completed') {
      return Response.json(
        { error: 'Оценить исполнителя можно только после завершения работы' },
        { status: 409 },
      );
    }
    if (completedWork.provider_id === viewer.id) {
      return Response.json(
        { error: 'Нельзя оставить отзыв самому себе' },
        { status: 409 },
      );
    }

    const id = crypto.randomUUID();
    const createdAt = Date.now();
    const inserted = await db
      .prepare(
        `INSERT OR IGNORE INTO request_reviews
         (id, request_id, response_id, reviewer_id, provider_id,
          rating, comment, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        completedWork.request_id,
        completedWork.response_id,
        viewer.id,
        completedWork.provider_id,
        input.rating,
        input.comment || null,
        createdAt,
      )
      .run();
    if (!inserted.meta.changes) {
      return Response.json(
        { error: 'Отзыв по этой работе уже оставлен' },
        { status: 409 },
      );
    }

    const reputation = await db
      .prepare(
        `SELECT AVG(rating) AS rating_average, COUNT(*) AS review_count
         FROM request_reviews
         WHERE provider_id = ?`,
      )
      .bind(completedWork.provider_id)
      .first<{ rating_average: number; review_count: number }>();

    return Response.json(
      {
        review: {
          id,
          requestId: completedWork.request_id,
          responseId: completedWork.response_id,
          requestTitle: completedWork.title,
          rating: input.rating,
          comment: input.comment,
          reviewer: viewer.displayName,
          providerId: completedWork.provider_id,
          providerName: completedWork.provider_name,
          createdAt,
        },
        reputation: {
          providerId: completedWork.provider_id,
          rating: Number(reputation?.rating_average || input.rating).toFixed(1),
          reviewCount: Number(reputation?.review_count || 1),
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
