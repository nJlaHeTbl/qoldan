// Client-side photo optimisation before upload: phone photos (often 4–8 MB) are downscaled to 1280 px on the
// long side and re-encoded as JPEG around 1.2 MB, so they fit the 5 MB server limit and load fast on mobile data.
const TARGET_LISTING_IMAGE_BYTES = 1_200_000;
const MAX_LISTING_IMAGE_SIDE = 1_280;
export const LISTING_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

type DecodedListingImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  dispose: () => void;
};

const decodeListingImage = async (file: File): Promise<DecodedListingImage> => {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: 'from-image',
      });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        dispose: () => bitmap.close(),
      };
    } catch {
      // Older mobile browsers fall back to an image element below.
    }
  }

  const sourceUrl = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () =>
      resolve({
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        dispose: () => URL.revokeObjectURL(sourceUrl),
      });
    image.onerror = () => {
      URL.revokeObjectURL(sourceUrl);
      reject(new Error('Не удалось открыть фотографию'));
    };
    image.src = sourceUrl;
  });
};

const canvasToJpeg = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error('Не удалось обработать фотографию')),
      'image/jpeg',
      quality,
    );
  });

export const optimizeListingImage = async (file: File) => {
  const decoded = await decodeListingImage(file);
  try {
    if (decoded.width < 1 || decoded.height < 1) {
      throw new Error('Фотография повреждена');
    }

    const scale = Math.min(
      1,
      MAX_LISTING_IMAGE_SIDE / Math.max(decoded.width, decoded.height),
    );
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(decoded.width * scale));
    canvas.height = Math.max(1, Math.round(decoded.height * scale));
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Не удалось обработать фотографию');

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);

    let optimized = await canvasToJpeg(canvas, 0.82);
    for (const quality of [0.74, 0.66, 0.58, 0.5]) {
      if (optimized.size <= TARGET_LISTING_IMAGE_BYTES) break;
      optimized = await canvasToJpeg(canvas, quality);
    }
    return optimized;
  } finally {
    decoded.dispose();
  }
};
