import { z } from 'zod';
import {
  ensureMarketplaceSchema,
  getMarketplaceDb,
  getViewer,
  serverError,
  unauthorized,
  upsertViewer,
} from '@/lib/server/marketplace-db';
import { invalidInput, parseJson } from '@/lib/server/marketplace-schemas';
import { maybePurge } from '@/lib/server/retention';

const input = z.object({ listingId: z.uuid() }).strict();

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
// New numbers a signed-in user may reveal. Re-opening one already revealed is free.
const HOURLY_LIMIT = 15;
const DAILY_LIMIT = 50;

function limited(message: string, retryAfterSeconds: number) {
  return Response.json(
    { error: message, code: 'rate_limited', retryAfterSeconds },
    {
      status: 429,
      headers: {
        'cache-control': 'no-store',
        'retry-after': String(retryAfterSeconds),
      },
    },
  );
}

export async function POST(request: Request) {
  const viewer = await getViewer(request);
  if (!viewer) return unauthorized();
  try {
    const { listingId } = await parseJson(request, input);
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const db = getMarketplaceDb();
    const listing = await db
      .prepare(
        `SELECT owner_id, phone, show_phone, status FROM listings WHERE id = ?`,
      )
      .bind(listingId)
      .first<{
        owner_id: string;
        phone: string;
        show_phone: number;
        status: string;
      }>();
    if (!listing || (listing.status !== 'active' && listing.owner_id !== viewer.id)) {
      return Response.json({ error: 'Объявление не найдено' }, { status: 404 });
    }
    if (listing.owner_id === viewer.id) {
      return Response.json(
        { phone: listing.phone },
        { headers: { 'cache-control': 'no-store' } },
      );
    }
    if (!listing.show_phone || !listing.phone) {
      return Response.json(
        {
          error:
            'Владелец не показывает номер. Напишите ему в чате Qoldan.',
          code: 'phone_hidden',
        },
        { status: 403, headers: { 'cache-control': 'no-store' } },
      );
    }
    const already = await db
      .prepare(
        `SELECT 1 AS found FROM phone_reveals WHERE listing_id = ? AND viewer_id = ?`,
      )
      .bind(listingId, viewer.id)
      .first<{ found: number }>();
    if (!already) {
      const now = Date.now();
      // Check and write in ONE statement so parallel requests cannot slip past the limits.
      const written = await db
        .prepare(
          `INSERT OR IGNORE INTO phone_reveals (id, listing_id, viewer_id, created_at)
           SELECT ?, ?, ?, ?
           WHERE (SELECT COUNT(*) FROM phone_reveals WHERE viewer_id = ? AND created_at >= ?) < ?
             AND (SELECT COUNT(*) FROM phone_reveals WHERE viewer_id = ? AND created_at >= ?) < ?`,
        )
        .bind(
          crypto.randomUUID(),
          listingId,
          viewer.id,
          now,
          viewer.id,
          now - HOUR_MS,
          HOURLY_LIMIT,
          viewer.id,
          now - DAY_MS,
          DAILY_LIMIT,
        )
        .run();
      if (!written.meta.changes) {
        // Either a parallel request already revealed this number (fine), or a limit was hit.
        const raced = await db
          .prepare(
            `SELECT 1 AS found FROM phone_reveals WHERE listing_id = ? AND viewer_id = ?`,
          )
          .bind(listingId, viewer.id)
          .first<{ found: number }>();
        if (!raced) {
          const oldest = await db
            .prepare(
              `SELECT created_at FROM phone_reveals
               WHERE viewer_id = ? AND created_at >= ?
               ORDER BY created_at ASC LIMIT 1`,
            )
            .bind(viewer.id, now - HOUR_MS)
            .first<{ created_at: number }>();
          // Suspicious pattern (scraping): leave a trace for moderators in the logs.
          console.warn(
            JSON.stringify({ event: 'phone_reveal_rate_limited', viewerId: viewer.id }),
          );
          return limited(
            'Слишком много запросов номеров. Попробуйте позже или напишите владельцам в чате.',
            Math.max(
              1,
              Math.ceil(((oldest?.created_at ?? now) + HOUR_MS - now) / 1000),
            ),
          );
        }
      }
    }
    await maybePurge(db);
    return Response.json(
      { phone: listing.phone },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    try {
      return invalidInput(error);
    } catch {
      return serverError(error);
    }
  }
}
