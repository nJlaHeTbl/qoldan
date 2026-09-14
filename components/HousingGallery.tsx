'use client';
import { useState } from 'react';

export function HousingGallery({ photos, title }: { photos: string[]; title: string }) {
  const [selected, setSelected] = useState(0);
  const index = Math.min(selected, photos.length - 1);
  return <section className="housing-gallery" aria-label="Фотографии жилья">
    <img className="housing-gallery-main" src={photos[index]} alt={`${title} — фотография ${index + 1}`} />
    {photos.length > 1 && <>
      <div className="housing-gallery-controls"><button type="button" disabled={index === 0} onClick={() => setSelected(index - 1)}>Назад</button>
        <span role="status">{index + 1} / {photos.length}</span><button type="button" disabled={index === photos.length - 1} onClick={() => setSelected(index + 1)}>Далее</button></div>
      <div className="housing-gallery-thumbs">{photos.map((photo, i) => <button type="button" key={photo} aria-label={`Показать фотографию ${i + 1}`} aria-pressed={i === index} onClick={() => setSelected(i)}>
        <img src={photo} alt="" loading="lazy" />
      </button>)}</div>
    </>}
  </section>;
}
