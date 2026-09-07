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
  messageInput,
  parseJson,
} from '@/lib/server/marketplace-schemas';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

async function findConversation(id: string, viewerId: string) {
  return getMarketplaceDb()
    .prepare(
      `SELECT id, context_type, context_id, context_title,
              context_owner_id, participant_id
       FROM conversations
       WHERE id = ?
         AND (context_owner_id = ? OR participant_id = ?)`,
    )
    .bind(id, viewerId, viewerId)
    .first<{
      id: string;
      context_type: 'listing' | 'request';
      context_id: string;
      context_title: string;
      context_owner_id: string;
      participant_id: string;
    }>();
}

export async function GET(request: Request, context: RouteContext) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  try {
    const { id } = await context.params;
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const conversation = await findConversation(id, viewer.id);
    if (!conversation) {
      return Response.json({ error: 'Диалог не найден' }, { status: 404 });
    }

    const db = getMarketplaceDb();
    await db
      .prepare(
        `UPDATE messages
         SET read_at = ?
         WHERE conversation_id = ?
           AND sender_id != ?
           AND read_at IS NULL`,
      )
      .bind(Date.now(), conversation.id, viewer.id)
      .run();
    const result = await db
      .prepare(
        `SELECT messages.id, messages.body, messages.sender_id,
                messages.created_at, messages.read_at,
                users.display_name AS sender_name
         FROM messages
         JOIN users ON users.id = messages.sender_id
         WHERE messages.conversation_id = ?
         ORDER BY messages.created_at ASC
         LIMIT 500`,
      )
      .bind(conversation.id)
      .all<{
        id: string;
        body: string;
        sender_id: string;
        created_at: number;
        read_at: number | null;
        sender_name: string;
      }>();

    return Response.json({
      conversation: {
        id: conversation.id,
        contextType: conversation.context_type,
        contextId: conversation.context_id,
        contextTitle: conversation.context_title,
      },
      messages: result.results.map((message) => ({
        id: message.id,
        body: message.body,
        senderName: message.sender_name,
        mine: message.sender_id === viewer.id,
        createdAt: Number(message.created_at),
        readAt: message.read_at ? Number(message.read_at) : null,
      })),
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  try {
    const input = await parseJson(request, messageInput);
    const { id } = await context.params;
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const conversation = await findConversation(id, viewer.id);
    if (!conversation) {
      return Response.json({ error: 'Диалог не найден' }, { status: 404 });
    }

    const messageId = crypto.randomUUID();
    const now = Date.now();
    const db = getMarketplaceDb();
    const minuteMs = 60 * 1000;
    const limited = await getRateLimitResponse(
      db
        .prepare(
          `SELECT created_at FROM messages
           WHERE conversation_id = ? AND sender_id = ? AND created_at >= ?
           ORDER BY created_at DESC
           LIMIT 1 OFFSET 29`,
        )
        .bind(conversation.id, viewer.id, now - minuteMs),
      minuteMs,
      'Слишком много сообщений подряд. Подождите немного и продолжайте.',
    );
    if (limited) return limited;
    await db.batch([
      db
        .prepare(
          `INSERT INTO messages
           (id, conversation_id, sender_id, body, created_at, read_at)
           VALUES (?, ?, ?, ?, ?, NULL)`,
        )
        .bind(messageId, conversation.id, viewer.id, input.body, now),
      db
        .prepare('UPDATE conversations SET updated_at = ? WHERE id = ?')
        .bind(now, conversation.id),
    ]);

    return Response.json(
      {
        message: {
          id: messageId,
          body: input.body,
          senderName: viewer.displayName,
          mine: true,
          createdAt: now,
          readAt: null,
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
