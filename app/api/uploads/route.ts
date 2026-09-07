import {
  ensureMarketplaceSchema,
  getMarketplaceDb,
  getMarketplaceImages,
  getRateLimitResponse,
  getViewer,
  serverError,
  unauthorized,
  upsertViewer,
} from '@/lib/server/marketplace-db';

const allowedTypes = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);
const uploadUrlPattern = /^\/api\/media\/([0-9a-f-]{36}\.(?:jpg|png|webp))$/i;

function hasValidImageSignature(type: string, bytes: Uint8Array) {
  if (type === 'image/jpeg') {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (type === 'image/png') {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (byte, index) => bytes[index] === byte,
    );
  }
  if (type === 'image/webp') {
    return (
      new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' &&
      new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP'
    );
  }
  return false;
}

export async function POST(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  try {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 5_500_000) {
      return Response.json(
        { error: 'Фотография должна быть размером до 5 МБ' },
        { status: 413 },
      );
    }
    const formData = await request.formData();
    const image = formData.get('image');
    if (!(image instanceof File)) {
      return Response.json({ error: 'Выберите фотографию' }, { status: 400 });
    }
    const extension = allowedTypes.get(image.type);
    if (!extension || image.size > 5_000_000) {
      return Response.json(
        { error: 'Нужен JPG, PNG или WebP размером до 5 МБ' },
        { status: 400 },
      );
    }
    const signature = new Uint8Array(await image.slice(0, 12).arrayBuffer());
    if (!hasValidImageSignature(image.type, signature)) {
      return Response.json(
        { error: 'Файл повреждён или не является фотографией' },
        { status: 400 },
      );
    }
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const db = getMarketplaceDb();
    const hourMs = 60 * 60 * 1000;
    const limited = await getRateLimitResponse(
      db
        .prepare(
          `SELECT created_at FROM uploads
           WHERE owner_id = ? AND created_at >= ?
           ORDER BY created_at DESC
           LIMIT 1 OFFSET 19`,
        )
        .bind(viewer.id, Date.now() - hourMs),
      hourMs,
      'Можно загрузить до 20 фотографий в час. Попробуйте немного позже.',
    );
    if (limited) return limited;

    const dayMs = 24 * hourMs;
    const usage = await db
      .prepare(
        `SELECT COALESCE(SUM(size), 0) AS total_size FROM uploads
         WHERE owner_id = ? AND created_at >= ?`,
      )
      .bind(viewer.id, Date.now() - dayMs)
      .first<{ total_size: number }>();
    if (Number(usage?.total_size || 0) + image.size > 50_000_000) {
      return Response.json(
        {
          error: 'Достигнут дневной лимит фотографий. Попробуйте снова завтра.',
          code: 'upload_limit_reached',
        },
        { status: 429, headers: { 'cache-control': 'no-store' } },
      );
    }

    const key = `${crypto.randomUUID()}.${extension}`;
    const images = getMarketplaceImages();
    await images.put(key, image.stream(), {
      httpMetadata: { contentType: image.type },
      customMetadata: { ownerId: viewer.id },
    });
    try {
      await db
        .prepare(
          `INSERT INTO uploads (key, owner_id, content_type, size, created_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(key, viewer.id, image.type, image.size, Date.now())
        .run();
    } catch (error) {
      await images.delete(key);
      throw error;
    }
    return Response.json({ url: `/api/media/${key}` }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  try {
    const body = (await request.json()) as { url?: unknown };
    const key =
      typeof body.url === 'string'
        ? uploadUrlPattern.exec(body.url.trim())?.[1]
        : undefined;
    if (!key) {
      return Response.json(
        { error: 'Не удалось определить фотографию' },
        { status: 400 },
      );
    }
    await ensureMarketplaceSchema();
    const db = getMarketplaceDb();
    const upload = await db
      .prepare('SELECT key FROM uploads WHERE key = ? AND owner_id = ?')
      .bind(key, viewer.id)
      .first();
    if (!upload) return Response.json({ deleted: false });
    const linkedListing = await db
      .prepare('SELECT id FROM listings WHERE image_url = ? LIMIT 1')
      .bind(`/api/media/${key}`)
      .first();
    if (linkedListing) {
      return Response.json(
        { error: 'Фотография уже привязана к объявлению' },
        { status: 409 },
      );
    }
    await getMarketplaceImages().delete(key);
    await db
      .prepare('DELETE FROM uploads WHERE key = ? AND owner_id = ?')
      .bind(key, viewer.id)
      .run();
    return Response.json({ deleted: true });
  } catch (error) {
    return serverError(error);
  }
}
