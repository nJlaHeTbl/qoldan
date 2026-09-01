import {
  canModerate,
  ensureMarketplaceSchema,
  forbidden,
  getMarketplaceDb,
  getViewer,
  serverError,
  unauthorized,
  upsertViewer,
} from '@/lib/server/marketplace-db';
import {
  invalidInput,
  parseJson,
  supportTicketInput,
  supportTicketStatusInput,
} from '@/lib/server/marketplace-schemas';

export const dynamic = 'force-dynamic';

type SupportTicketRow = {
  id: string;
  owner_id: string;
  category: 'bug' | 'idea' | 'safety' | 'other';
  message: string;
  page_context: string | null;
  status: 'new' | 'reviewing' | 'closed';
  review_note: string | null;
  owner_name: string;
  reviewer_name: string | null;
  created_at: number;
  updated_at: number;
  reviewed_at: number | null;
};

const serializeTicket = (row: SupportTicketRow, viewerId: string) => ({
  id: row.id,
  category: row.category,
  message: row.message,
  pageContext: row.page_context || '',
  status: row.status,
  reviewNote: row.review_note || '',
  ownerName: row.owner_name,
  reviewerName: row.reviewer_name || '',
  createdAt: Number(row.created_at),
  updatedAt: Number(row.updated_at),
  reviewedAt: row.reviewed_at ? Number(row.reviewed_at) : null,
  mine: row.owner_id === viewerId,
});

const selectTickets = `SELECT support_tickets.id, support_tickets.owner_id,
    support_tickets.category, support_tickets.message,
    support_tickets.page_context, support_tickets.status,
    support_tickets.review_note, support_tickets.created_at,
    support_tickets.updated_at, support_tickets.reviewed_at,
    owners.display_name AS owner_name,
    reviewers.display_name AS reviewer_name
  FROM support_tickets
  JOIN users owners ON owners.id = support_tickets.owner_id
  LEFT JOIN users reviewers ON reviewers.id = support_tickets.reviewed_by`;

export async function GET(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  try {
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const db = getMarketplaceDb();
    const moderator = canModerate(viewer);
    const mineResult = await db
      .prepare(
        `${selectTickets}
         WHERE support_tickets.owner_id = ?
         ORDER BY support_tickets.created_at DESC
         LIMIT 30`,
      )
      .bind(viewer.id)
      .all<SupportTicketRow>();
    const queueResult = moderator
      ? await db
          .prepare(
            `${selectTickets}
             ORDER BY CASE support_tickets.status
               WHEN 'new' THEN 0
               WHEN 'reviewing' THEN 1
               ELSE 2
             END, support_tickets.created_at DESC
             LIMIT 150`,
          )
          .all<SupportTicketRow>()
      : null;
    return Response.json({
      tickets: mineResult.results.map((row) => serializeTicket(row, viewer.id)),
      queue:
        queueResult?.results.map((row) => serializeTicket(row, viewer.id)) ||
        [],
      canModerate: moderator,
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  try {
    const input = await parseJson(request, supportTicketInput);
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const db = getMarketplaceDb();
    const duplicate = await db
      .prepare(
        `SELECT id FROM support_tickets
         WHERE owner_id = ? AND category = ? AND message = ?
           AND created_at >= ?
         LIMIT 1`,
      )
      .bind(
        viewer.id,
        input.category,
        input.message,
        Date.now() - 5 * 60 * 1000,
      )
      .first<{ id: string }>();
    if (duplicate) {
      return Response.json(
        { error: 'Такое обращение уже отправлено' },
        { status: 409 },
      );
    }
    const id = crypto.randomUUID();
    const now = Date.now();
    await db
      .prepare(
        `INSERT INTO support_tickets
         (id, owner_id, category, message, page_context, status,
          created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'new', ?, ?)`,
      )
      .bind(
        id,
        viewer.id,
        input.category,
        input.message,
        input.pageContext || null,
        now,
        now,
      )
      .run();
    return Response.json(
      {
        ticket: {
          id,
          category: input.category,
          message: input.message,
          pageContext: input.pageContext,
          status: 'new',
          reviewNote: '',
          ownerName: viewer.displayName,
          reviewerName: '',
          createdAt: now,
          updatedAt: now,
          reviewedAt: null,
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

export async function PATCH(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  if (!canModerate(viewer)) return forbidden();
  try {
    const input = await parseJson(request, supportTicketStatusInput);
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const db = getMarketplaceDb();
    const existing = await db
      .prepare('SELECT id, status FROM support_tickets WHERE id = ?')
      .bind(input.ticketId)
      .first<{ id: string; status: string }>();
    if (!existing) {
      return Response.json({ error: 'Обращение не найдено' }, { status: 404 });
    }
    const now = Date.now();
    await db
      .prepare(
        `UPDATE support_tickets
         SET status = ?, review_note = ?, reviewed_by = ?,
             reviewed_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        input.status,
        input.reviewNote || null,
        viewer.id,
        now,
        now,
        input.ticketId,
      )
      .run();
    return Response.json({
      ticket: {
        id: input.ticketId,
        status: input.status,
        reviewNote: input.reviewNote,
        reviewerName: viewer.displayName,
        reviewedAt: now,
        updatedAt: now,
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
