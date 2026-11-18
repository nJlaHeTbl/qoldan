import { z } from 'zod';
import { deleteAccount, deletionBlocker } from '@/lib/server/account';
import {
  ensureMarketplaceSchema,
  getMarketplaceDb,
  getMarketplaceImages,
  getViewer,
  serverError,
  unauthorized,
} from '@/lib/server/marketplace-db';
import { invalidInput, parseJson } from '@/lib/server/marketplace-schemas';

const input = z
  .object({
    // Typed confirmation: an accidental click must never erase an account.
    confirm: z.literal('УДАЛИТЬ', { error: 'Введите слово УДАЛИТЬ, чтобы подтвердить' }),
  })
  .strict();

// Right to erasure: deletes the account and everything the user published or wrote.
export async function DELETE(request: Request) {
  const viewer = await getViewer(request);
  if (!viewer) return unauthorized();
  try {
    await parseJson(request, input);
    await ensureMarketplaceSchema();
    const db = getMarketplaceDb();
    const blocker = await deletionBlocker(db, viewer.id);
    if (blocker) return Response.json({ error: blocker }, { status: 409 });
    const keys = await deleteAccount(db, viewer.id);
    // Files go after the database: a storage hiccup must not leave half a profile behind.
    let failed = 0;
    for (const key of keys) {
      try {
        await getMarketplaceImages().delete(key);
      } catch {
        failed += 1;
      }
    }
    if (failed) {
      console.warn(JSON.stringify({ event: 'account_delete_files_left', count: failed }));
    }
    return Response.json(
      { deleted: true, filesRemoved: keys.length - failed },
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
