'use client';
import { useState } from 'react';
import type { Lang } from '@/lib/ui-copy';
import { housingCopy } from '@/lib/housing-copy';

export function HousingGallery({ photos, title, lang = 'ru' }: { photos: string[]; title: string; lang?: Lang }) {
  const t = housingCopy(lang);
  const [selected, setSelected] = useState(0);
  const index = Math.min(selected, photos.length - 1);
  return <section className="housing-gallery" aria-label={t.galleryLabel}>
    <img className="housing-gallery-main" src={photos[index]} alt={t.galleryPhoto(title, index + 1)} />
    {photos.length > 1 && <>
      <div className="housing-gallery-controls"><button type="button" disabled={index === 0} onClick={() => setSelected(index - 1)}>{t.back}</button>
        <span role="status">{index + 1} / {photos.length}</span><button type="button" disabled={index === photos.length - 1} onClick={() => setSelected(index + 1)}>{t.next}</button></div>
      <div className="housing-gallery-thumbs">{photos.map((photo, i) => <button type="button" key={photo} aria-label={t.showPhoto(i + 1)} aria-pressed={i === index} onClick={() => setSelected(i)}>
        <img src={photo} alt="" loading="lazy" />
      </button>)}</div>
    </>}
  </section>;
}
