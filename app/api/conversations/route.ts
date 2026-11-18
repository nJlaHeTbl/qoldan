import { checkNewConversation } from '@/lib/server/chat-guard';
import {
  ensureMarketplaceSchema,
  getMarketplaceDb,
  getViewer,
  serverError,
  unauthorized,
  upsertViewer,
} from '@/lib/server/marketplace-db';
import {
  conversationInput,
  invalidInput,
  parseJson,
} from '@/lib/server/marketplace-schemas';

export const dynamic = 'force-dynamic';

type ConversationRow = {
  id: string;
  context_type: 'listing' | 'request';
  context_id: string;
  context_title: string;
  counterparty: string;
  last_message: string | null;
  last_message_at: number | null;
  unread_count: number;
  updated_at: number;
};

function mapConversation(row: ConversationRow) {
  return {
    id: row.id,
    contextType: row.context_type,
    contextId: row.context_id,
    contextTitle: row.context_title,
    counterparty: row.counterparty,
    lastMessage: row.last_message || '',
    lastMessageAt: row.last_message_at ? Number(row.last_message_at) : null,
    unreadCount: Number(row.unread_count || 0),
    updatedAt: Number(row.updated_at),
  };
}

export async function GET(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  try {
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const result = await getMarketplaceDb()
      .prepare(
        `SELECT conversations.id, conversations.context_type,
                conversations.context_id, conversations.context_title,
                CASE
                  WHEN conversations.context_owner_id = ?
                    THEN participant.display_name
                  ELSE context_owner.display_name
                END AS counterparty,
                (
                  SELECT messages.body
                  FROM messages
                  WHERE messages.conversation_id = conversations.id
                  ORDER BY messages.created_at DESC
                  LIMIT 1
                ) AS last_message,
                (
                  SELECT messages.created_at
                  FROM messages
                  WHERE messages.conversation_id = conversations.id
                  ORDER BY messages.created_at DESC
                  LIMIT 1
                ) AS last_message_at,
                (
                  SELECT COUNT(*)
                  FROM messages
                  WHERE messages.conversation_id = conversations.id
                    AND messages.sender_id != ?
                    AND messages.read_at IS NULL
                ) AS unread_count,
                conversations.updated_at
         FROM conversations
         JOIN users AS context_owner
           ON context_owner.id = conversations.context_owner_id
         JOIN users AS participant
           ON participant.id = conversations.participant_id
         WHERE conversations.context_owner_id = ?
            OR conversations.participant_id = ?
         ORDER BY conversations.updated_at DESC
         LIMIT 150`,
      )
      .bind(viewer.id, viewer.id, viewer.id, viewer.id)
      .all<ConversationRow>();

    return Response.json({
      conversations: result.results.map(mapConversation),
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  try {
    const input = await parseJson(request, conversationInput);
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const db = getMarketplaceDb();
    const target =
      input.targetType === 'listing'
        ? await db
            .prepare(
              `SELECT listings.id, listings.owner_id, listings.title,
                      users.display_name AS owner_name
               FROM listings
               JOIN users ON users.id = listings.owner_id
               WHERE listings.id = ? AND listings.status = 'active'`,
            )
            .bind(input.targetId)
            .first<{
              id: string;
              owner_id: string;
              title: string;
              owner_name: string;
            }>()
        : await db
            .prepare(
              `SELECT requests.id, requests.owner_id, requests.title,
                      users.display_name AS owner_name
               FROM requests
               JOIN users ON users.id = requests.owner_id
               WHERE requests.id = ? AND requests.status = 'open'`,
            )
            .bind(input.targetId)
            .first<{
              id: string;
              owner_id: string;
              title: string;
              owner_name: string;
            }>();

    if (!target) {
      return Response.json(
        { error: 'Публикация не найдена или больше не активна' },
        { status: 404 },
      );
    }
    if (target.owner_id === viewer.id) {
      return Response.json(
        { error: 'Нельзя начать диалог с самим собой' },
        { status: 409 },
      );
    }

    const existing = await db
      .prepare(
        'SELECT id FROM conversations WHERE context_type = ? AND context_id = ? AND participant_id = ?',
      )
      .bind(input.targetType, input.targetId, viewer.id)
      .first<{ id: string }>();
    if (!existing) {
      const limited = await checkNewConversation(db, viewer.id);
      if (limited) return limited;
    }
    const id = crypto.randomUUID();
    const now = Date.now();
    const inserted = await db
      .prepare(
        `INSERT OR IGNORE INTO conversations
         (id, context_type, context_id, context_title, context_owner_id,
          participant_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        input.targetType,
        input.targetId,
        target.title,
        target.owner_id,
        viewer.id,
        now,
        now,
      )
      .run();
    const conversation = await db
      .prepare(
        `SELECT id, context_type, context_id, context_title, updated_at
         FROM conversations
         WHERE context_type = ? AND context_id = ? AND participant_id = ?`,
      )
      .bind(input.targetType, input.targetId, viewer.id)
      .first<{
        id: string;
        context_type: 'listing' | 'request';
        context_id: string;
        context_title: string;
        updated_at: number;
      }>();

    if (!conversation) throw new Error('Conversation was not created');
    return Response.json(
      {
        conversation: {
          id: conversation.id,
          contextType: conversation.context_type,
          contextId: conversation.context_id,
          contextTitle: conversation.context_title,
          counterparty: target.owner_name,
          lastMessage: '',
          lastMessageAt: null,
          unreadCount: 0,
          updatedAt: Number(conversation.updated_at),
        },
      },
      { status: inserted.meta.changes ? 201 : 200 },
    );
  } catch (error) {
    try {
      return invalidInput(error);
    } catch {
      return serverError(error);
    }
  }
}
