import {
  ensureMarketplaceSchema,
  getMarketplaceDb,
  getViewer,
  serverError,
  upsertViewer,
} from '@/lib/server/marketplace-db';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

type RequestRow = Record<string, unknown> & {
  id: string;
  owner_id: string;
  title: string;
  place: string;
  when_text: string;
  budget: string;
  kind: 'agro' | 'build' | 'rent' | 'recycle';
  region: string;
  response_count: number;
  status: 'open' | 'closed';
  owner_name: string;
};

export async function GET(request: Request, context: RouteContext) {
  const authenticatedViewer = getViewer(request);
  const viewer = authenticatedViewer || {
    id: '__qoldan_public_guest__',
    email: '',
    displayName: 'Гость',
  };

  try {
    const { id } = await context.params;
    const requestId = id.trim();
    if (!requestId || requestId.length > 160) {
      return Response.json(
        { error: 'Заявка не найдена или уже закрыта' },
        { status: 404 },
      );
    }

    await ensureMarketplaceSchema();
    if (authenticatedViewer) await upsertViewer(authenticatedViewer);
    const db = getMarketplaceDb();
    const requestRow = await db
      .prepare(
        `SELECT requests.id, requests.title, requests.place, requests.latitude, requests.longitude,
                requests.when_text, requests.budget, requests.kind,
                requests.region, requests.response_count,
                requests.owner_id, requests.status,
                users.display_name AS owner_name,
                request_selections.response_id AS selected_response_id,
                request_selections.status AS selection_status,
                request_selections.selected_at,
                request_selections.completed_at,
                selected_responses.owner_id AS selected_provider_id,
                selected_responses.price AS selected_price,
                selected_providers.display_name AS selected_provider_name,
                selection_conversations.id AS selection_conversation_id,
                request_reviews.id AS service_review_id,
                request_reviews.rating AS service_review_rating,
                request_reviews.comment AS service_review_comment,
                request_reviews.created_at AS service_review_created_at,
                service_reviewers.display_name AS service_reviewer_name
         FROM requests
         JOIN users ON users.id = requests.owner_id
         LEFT JOIN request_selections
           ON request_selections.request_id = requests.id
         LEFT JOIN responses selected_responses
           ON selected_responses.id = request_selections.response_id
         LEFT JOIN users selected_providers
           ON selected_providers.id = selected_responses.owner_id
         LEFT JOIN conversations selection_conversations
           ON selection_conversations.context_type = 'request'
          AND selection_conversations.context_id = requests.id
          AND selection_conversations.participant_id = selected_responses.owner_id
         LEFT JOIN request_reviews
           ON request_reviews.request_id = requests.id
         LEFT JOIN users service_reviewers
           ON service_reviewers.id = request_reviews.reviewer_id
         WHERE requests.id = ?
           AND (requests.status = 'open'
             OR requests.owner_id = ?
             OR selected_responses.owner_id = ?)
         LIMIT 1`,
      )
      .bind(requestId, viewer.id, viewer.id)
      .first<RequestRow>();

    if (!requestRow) {
      return Response.json(
        { error: 'Заявка не найдена или уже закрыта' },
        { status: 404 },
      );
    }

    const canSeeSelection =
      requestRow.owner_id === viewer.id ||
      requestRow.selected_provider_id === viewer.id;
    const responseResult = await db
      .prepare(
        `SELECT responses.id, responses.request_id, responses.price,
                responses.message, users.display_name AS owner_name,
                responses.owner_id,
                request_selections.status AS selection_status,
                service_review_stats.rating_average AS provider_rating_average,
                service_review_stats.review_count AS provider_review_count
         FROM responses
         JOIN users ON users.id = responses.owner_id
         JOIN requests ON requests.id = responses.request_id
         LEFT JOIN request_selections
           ON request_selections.request_id = responses.request_id
          AND request_selections.response_id = responses.id
         LEFT JOIN (
           SELECT provider_id, AVG(rating) AS rating_average,
                  COUNT(*) AS review_count
           FROM request_reviews
           GROUP BY provider_id
         ) AS service_review_stats
           ON service_review_stats.provider_id = responses.owner_id
         WHERE responses.request_id = ?
           AND (responses.owner_id = ? OR requests.owner_id = ?)
         ORDER BY responses.created_at DESC
         LIMIT 250`,
      )
      .bind(requestId, viewer.id, viewer.id)
      .all<Record<string, unknown>>();

    return Response.json({
      request: {
        id: String(requestRow.id),
        title: requestRow.title,
        place: requestRow.place,
        latitude: requestRow.latitude ?? undefined,
        longitude: requestRow.longitude ?? undefined,
        when: requestRow.when_text,
        budget: requestRow.budget,
        responses: Number(requestRow.response_count),
        kind: requestRow.kind,
        region: requestRow.region,
        owner: requestRow.owner_name,
        status: requestRow.status,
        mine: requestRow.owner_id === viewer.id,
        selection:
          canSeeSelection && requestRow.selected_response_id
            ? {
                requestId: String(requestRow.id),
                responseId: requestRow.selected_response_id as string,
                providerId: requestRow.selected_provider_id as string,
                providerName: requestRow.selected_provider_name as string,
                price: requestRow.selected_price as string,
                status: requestRow.selection_status as
                  | 'selected'
                  | 'cancelled'
                  | 'completed',
                conversationId:
                  typeof requestRow.selection_conversation_id === 'string'
                    ? requestRow.selection_conversation_id
                    : '',
                selectedAt: Number(requestRow.selected_at),
                completedAt: requestRow.completed_at
                  ? Number(requestRow.completed_at)
                  : null,
                mineAsProvider: requestRow.selected_provider_id === viewer.id,
                review: requestRow.service_review_id
                  ? {
                      id: requestRow.service_review_id as string,
                      requestId: String(requestRow.id),
                      responseId: requestRow.selected_response_id as string,
                      requestTitle: requestRow.title,
                      rating: Number(requestRow.service_review_rating),
                      comment:
                        (requestRow.service_review_comment as string) || '',
                      reviewer: requestRow.service_reviewer_name as string,
                      providerId: requestRow.selected_provider_id as string,
                      providerName: requestRow.selected_provider_name as string,
                      createdAt: Number(requestRow.service_review_created_at),
                    }
                  : null,
              }
            : null,
      },
      responses: responseResult.results.map((row) => ({
        id: String(row.id),
        requestId: String(row.request_id),
        price: row.price,
        message: row.message || '',
        owner: row.owner_name,
        ownerId: row.owner_id,
        mine: row.owner_id === viewer.id,
        selectionStatus: row.selection_status || null,
        providerRating:
          typeof row.provider_rating_average === 'number'
            ? Number(row.provider_rating_average).toFixed(1)
            : undefined,
        providerReviewCount: Number(row.provider_review_count || 0),
      })),
    });
  } catch (error) {
    return serverError(error);
  }
}
