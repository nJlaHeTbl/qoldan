import { getMarketplaceImages, serverError } from '@/lib/server/marketplace-db';

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string }> },
) {
  try {
    const { key } = await context.params;
    if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(key)) {
      return new Response('Not found', { status: 404 });
    }
    const object = await getMarketplaceImages().get(key);
    if (!object) return new Response('Not found', { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('cache-control', 'public, max-age=31536000, immutable');
    return new Response(object.body, { headers });
  } catch (error) {
    return serverError(error);
  }
}
