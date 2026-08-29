import {
  ensureMarketplaceSchema,
  getMarketplaceDb,
  getMarketplaceImages,
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

export async function POST(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  try {
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
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const key = `${crypto.randomUUID()}.${extension}`;
    await getMarketplaceImages().put(key, image.stream(), {
      httpMetadata: { contentType: image.type },
      customMetadata: { ownerId: viewer.id },
    });
    await getMarketplaceDb()
      .prepare(
        `INSERT INTO uploads (key, owner_id, content_type, size, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(key, viewer.id, image.type, image.size, Date.now())
      .run();
    return Response.json({ url: `/api/media/${key}` }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
