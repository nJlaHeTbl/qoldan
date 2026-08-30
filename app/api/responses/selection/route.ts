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
  requestSelectionInput,
} from '@/lib/server/marketplace-schemas';

type SelectionRow = {
  request_id: string;
  response_id: string;
  request_title: string;
  request_owner_id: string;
  provider_id: string;
  provider_name: string;
  price: string;
  status: 'selected' | 'cancelled' | 'completed';
  selected_at: number;
  updated_at: number;
  completed_at: number | null;
  conversation_id: string | null;
};

async function getSelection(requestId: string) {
  return getMarketplaceDb()
    .prepare(
      `SELECT request_selections.request_id,
              request_selections.response_id,
              request_selections.status,
              request_selections.selected_at,
              request_selections.updated_at,
              request_selections.completed_at,
              requests.title AS request_title,
              requests.owner_id AS request_owner_id,
              responses.owner_id AS provider_id,
              responses.price,
              providers.display_name AS provider_name,
              conversations.id AS conversation_id
       FROM request_selections
       JOIN requests ON requests.id = request_selections.request_id
       JOIN responses ON responses.id = request_selections.response_id
       JOIN users providers ON providers.id = responses.owner_id
       LEFT JOIN conversations
         ON conversations.context_type = 'request'
        AND conversations.context_id = requests.id
        AND conversations.participant_id = responses.owner_id
       WHERE request_selections.request_id = ?`,
    )
    .bind(requestId)
    .first<SelectionRow>();
}

function mapSelection(row: SelectionRow, viewerId: string) {
  return {
    requestId: row.request_id,
    responseId: row.response_id,
    providerName: row.provider_name,
    price: row.price,
    status: row.status,
    conversationId: row.conversation_id || '',
    selectedAt: Number(row.selected_at),
    completedAt: row.completed_at ? Number(row.completed_at) : null,
    mineAsProvider: row.provider_id === viewerId,
  };
}

export async function POST(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  try {
    const input = await parseJson(request, requestSelectionInput);
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const db = getMarketplaceDb();
    const now = Date.now();

    if (input.action === 'select') {
      const target = await db
        .prepare(
          `SELECT responses.id AS response_id, responses.request_id,
                  responses.owner_id AS provider_id, responses.price,
                  providers.display_name AS provider_name,
                  requests.owner_id AS request_owner_id,
                  requests.title AS request_title,
                  requests.status AS request_status
           FROM responses
           JOIN requests ON requests.id = responses.request_id
           JOIN users providers ON providers.id = responses.owner_id
           WHERE responses.id = ? AND responses.request_id = ?`,
        )
        .bind(input.responseId, input.requestId)
        .first<{
          response_id: string;
          request_id: string;
          provider_id: string;
          provider_name: string;
          price: string;
          request_owner_id: string;
          request_title: string;
          request_status: string;
        }>();
      if (!target || target.request_owner_id !== viewer.id) {
        return Response.json(
          { error: 'Отклик не найден или заявка принадлежит другому автору' },
          { status: 404 },
        );
      }
      if (target.request_status !== 'open') {
        return Response.json(
          { error: 'Исполнителя можно выбрать только в открытой заявке' },
          { status: 409 },
        );
      }
      const existing = await getSelection(input.requestId);
      if (existing && existing.status !== 'cancelled') {
        return Response.json(
          { error: 'По этой заявке исполнитель уже выбран' },
          { status: 409 },
        );
      }

      const conversationId = crypto.randomUUID();
      const writes = await db.batch([
        db
          .prepare(
            `INSERT OR IGNORE INTO conversations
             (id, context_type, context_id, context_title, context_owner_id,
              participant_id, created_at, updated_at)
             VALUES (?, 'request', ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            conversationId,
            target.request_id,
            target.request_title,
            viewer.id,
            target.provider_id,
            now,
            now,
          ),
        db
          .prepare(
            `INSERT INTO request_selections
             (request_id, response_id, selected_by, status, selected_at,
              updated_at, completed_at)
             VALUES (?, ?, ?, 'selected', ?, ?, NULL)
             ON CONFLICT(request_id) DO UPDATE SET
               response_id = excluded.response_id,
               selected_by = excluded.selected_by,
               status = 'selected',
               selected_at = excluded.selected_at,
               updated_at = excluded.updated_at,
               completed_at = NULL
             WHERE request_selections.status = 'cancelled'`,
          )
          .bind(target.request_id, target.response_id, viewer.id, now, now),
        db
          .prepare(
            `UPDATE requests SET status = 'closed', updated_at = ?
             WHERE id = ? AND owner_id = ? AND status = 'open'`,
          )
          .bind(now, target.request_id, viewer.id),
      ]);
      if (!writes[1].meta.changes || !writes[2].meta.changes) {
        await db.batch([
          db
            .prepare(
              `UPDATE request_selections SET status = 'cancelled', updated_at = ?
               WHERE request_id = ? AND status = 'selected'`,
            )
            .bind(Date.now(), target.request_id),
          db
            .prepare(
              `UPDATE requests SET status = 'open', updated_at = ?
               WHERE id = ? AND owner_id = ?`,
            )
            .bind(Date.now(), target.request_id, viewer.id),
        ]);
        return Response.json(
          { error: 'Статус заявки изменился. Обновите страницу и повторите.' },
          { status: 409 },
        );
      }
      const selection = await getSelection(target.request_id);
      if (!selection) throw new Error('Request selection was not created');
      return Response.json({
        selection: mapSelection(selection, viewer.id),
        requestStatus: 'closed',
      });
    }

    const selection = await getSelection(input.requestId);
    if (!selection || selection.request_owner_id !== viewer.id) {
      return Response.json(
        { error: 'Выбор исполнителя не найден или принадлежит другому автору' },
        { status: 404 },
      );
    }
    if (selection.status !== 'selected') {
      return Response.json(
        { error: 'Это решение уже нельзя изменить повторно' },
        { status: 409 },
      );
    }

    if (input.action === 'cancel') {
      const writes = await db.batch([
        db
          .prepare(
            `UPDATE request_selections
             SET status = 'cancelled', updated_at = ?
             WHERE request_id = ? AND status = 'selected'`,
          )
          .bind(now, input.requestId),
        db
          .prepare(
            `UPDATE requests SET status = 'open', updated_at = ?
             WHERE id = ? AND owner_id = ?`,
          )
          .bind(now, input.requestId, viewer.id),
      ]);
      if (!writes[0].meta.changes || !writes[1].meta.changes) {
        return Response.json(
          { error: 'Статус выбора уже изменился' },
          { status: 409 },
        );
      }
      const updated = await getSelection(input.requestId);
      if (!updated) throw new Error('Cancelled selection was not found');
      return Response.json({
        selection: mapSelection(updated, viewer.id),
        requestStatus: 'open',
      });
    }

    const result = await db
      .prepare(
        `UPDATE request_selections
         SET status = 'completed', completed_at = ?, updated_at = ?
         WHERE request_id = ? AND status = 'selected'`,
      )
      .bind(now, now, input.requestId)
      .run();
    if (!result.meta.changes) {
      return Response.json(
        { error: 'Статус выбора уже изменился' },
        { status: 409 },
      );
    }
    const completed = await getSelection(input.requestId);
    if (!completed) throw new Error('Completed selection was not found');
    return Response.json({
      selection: mapSelection(completed, viewer.id),
      requestStatus: 'closed',
    });
  } catch (error) {
    try {
      return invalidInput(error);
    } catch {
      return serverError(error);
    }
  }
}
