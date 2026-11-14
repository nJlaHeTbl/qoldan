'use client';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, BedDouble, Heart, MapPin, Plus, Phone, Search } from 'lucide-react';
import { KAZAKHSTAN_REGIONS } from '@/lib/regions';
import { HOUSING_CATEGORIES, getHousingPhotos, type HousingListing } from '@/lib/housing';
import { getRegionCenter } from '@/lib/geo';
import { LocationFields } from '@/components/LocationFields';
import { SettlementSearch } from '@/components/SettlementSearch';
import ConsentNote from '@/components/ConsentNote';
import { MarketplaceMap } from '@/components/MarketplaceMap';

type Filters = { region: string; kind: string; q: string; place: string[]; guests: string; maxPrice: string; view: string };
type Photo = { id: string; preview: string; file?: File; url?: string };
const initialFilters: Filters = { region: 'Весь Казахстан', kind: 'all', q: '', place: [], guests: '0', maxPrice: '0', view: 'all' };
async function api(url: string, body: unknown, method = 'POST') {
  const response = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json() as { error?: string };
  if (!response.ok) throw new Error(data.error || 'Не удалось сохранить. Попробуйте ещё раз.');
  return data;
}
export default function HousingClient({ signedIn, signInPath }: { signedIn: boolean; signInPath: string }) {
  const [filters, setFilters] = useState(initialFilters);
  const [draft, setDraft] = useState(initialFilters);
  const [placeText, setPlaceText] = useState('');
  const [items, setItems] = useState<HousingListing[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<HousingListing | null>(null);
  const [formSession, setFormSession] = useState(0);
  const dirtyForm = useRef(false);
  const [showMap, setShowMap] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const uploadedPhotos = useRef(new Map<string, string>());
  const objectUrls = useRef(new Set<string>());
  const [uploadProgress, setUploadProgress] = useState('');
  // Best effort: the server refuses to delete a photo that is still linked to a listing.
  function discardUploads(urls: string[]) {
    for (const url of urls) void fetch('/api/uploads', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url }) }).catch(() => null);
  }
  function clearPhotos(discard = true) {
    if (discard) discardUploads([...uploadedPhotos.current.values()]);
    objectUrls.current.forEach(url => URL.revokeObjectURL(url)); objectUrls.current.clear();
    uploadedPhotos.current.clear(); setPhotos([]); setUploadProgress('');
  }
  function removePhoto(photo: Photo) {
    if (saveLock.current) return;
    if (objectUrls.current.delete(photo.preview)) URL.revokeObjectURL(photo.preview);
    const uploaded = uploadedPhotos.current.get(photo.id);
    if (uploaded) { uploadedPhotos.current.delete(photo.id); discardUploads([uploaded]); }
    setPhotos(current => current.filter(value => value.id !== photo.id)); dirtyForm.current = true;
  }
  const saveLock = useRef(false);
  const noticeRef = useRef<HTMLParagraphElement>(null);
  function openForm(item: HousingListing | null = null) {
    if (saveLock.current || (showForm && dirtyForm.current && !window.confirm('В форме есть несохранённые изменения. Открыть другую форму без сохранения?'))) return;
    clearPhotos(); setEditing(item); setFormSession(value => value + 1);
    if (item) setPhotos(getHousingPhotos(item.image, item.photos).map(url => ({ id: url, preview: url, url })));
    setFormError(''); setNotice(''); dirtyForm.current = false; setShowForm(true);
    requestAnimationFrame(() => document.getElementById('housing-publish-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
  function closeForm() {
    if (saveLock.current || (dirtyForm.current && !window.confirm('Закрыть форму без сохранения изменений?'))) return;
    setShowForm(false); setEditing(null); clearPhotos(); dirtyForm.current = false;
    setRevision(value => value + 1);
  }
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (showForm && (dirtyForm.current || saveLock.current)) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [showForm]);
  useEffect(() => () => { objectUrls.current.forEach(url => URL.revokeObjectURL(url)); }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    const params = new URLSearchParams({ ...filters, place: '', page: String(page) });
    params.delete('place'); filters.place.forEach(name => params.append('place', name));
    fetch('/api/housing?' + params, { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        const data = await response.json() as { items: HousingListing[]; hasMore: boolean; error?: string };
        if (!response.ok) throw new Error(data.error || 'Не удалось загрузить жильё');
        if (!controller.signal.aborted) { setItems(data.items); setHasMore(data.hasMore); }
      }).catch(e => { if (!controller.signal.aborted) { setError(e.message); setItems([]); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filters, page, revision]);
  const markers = useMemo(() => items.filter(item => item.latitude != null && item.longitude != null).map(item => ({
    id: item.id, title: item.title, price: item.price + ' ₸ / сутки', type: 'Сдам' as const,
    latitude: item.latitude!, longitude: item.longitude!,
  })), [items]);
  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPage(1); setFilters({ ...draft, place: draft.place.length ? draft.place : placeText.trim() ? [placeText.trim()] : [] });
  }
  async function favorite(item: HousingListing) {
    if (!signedIn || busy) return;
    setBusy(true); setError('');
    try {
      await api('/api/favorites', { listingId: item.id, active: !item.favorite });
      setRevision(value => value + 1);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function toggleStatus(item: HousingListing) {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await api('/api/listings/status', { listingId: item.id, status: item.status === 'active' ? 'paused' : 'active' });
      setRevision(value => value + 1);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saveLock.current) return;
    if (!photos.length) { setFormError('Добавьте хотя бы одну настоящую фотографию жилья.'); return; }
    saveLock.current = true; setSaving(true); setFormError('');
    const form = event.currentTarget, values = new FormData(form);
    try {
      const photoUrls: string[] = [];
      for (const [index, photo] of photos.entries()) {
        let url = photo.url || uploadedPhotos.current.get(photo.id);
        if (!url && photo.file) {
          setUploadProgress(`Загружаем фотографию ${index + 1} из ${photos.length}…`);
          const upload = new FormData(); upload.append('image', photo.file);
          const response = await fetch('/api/uploads', { method: 'POST', body: upload });
          const data = await response.json() as { url: string; error?: string };
          if (!response.ok) throw new Error(data.error || 'Не удалось загрузить фотографию');
          url = data.url; uploadedPhotos.current.set(photo.id, url);
        }
        if (!url) throw new Error('Выберите фотографию заново');
        photoUrls.push(url);
      }
      const imageUrl = photoUrls[0]; setUploadProgress('Сохраняем объявление…');
      const latitude = String(values.get('latitude') || ''), longitude = String(values.get('longitude') || '');
      const data = {
        title: values.get('title'), price: values.get('price'), category: values.get('category'),
        unit: '/ сутки', type: 'Сдам', location: values.get('location'), region: values.get('region'),
        phone: values.get('phone'), available: values.get('available'), description: values.get('description'),
        sellerType: values.get('sellerType'), imageUrl,
        housing: { guests: Number(values.get('guests')), rooms: Number(values.get('rooms')), photos: photoUrls },
        ...(latitude && longitude ? { latitude: Number(latitude), longitude: Number(longitude) } : {}),
      };
      if (editing) await api('/api/housing', { listingId: editing.id, expectedUpdatedAt: editing.updatedAt, data }, 'PATCH');
      else await api('/api/listings', data);
      if (editing) discardUploads(getHousingPhotos(editing.image, editing.photos).filter(url => !photoUrls.includes(url)));
      clearPhotos(false); setShowForm(false);
      setFilters({ ...initialFilters, view: 'mine' }); setDraft({ ...initialFilters, view: 'mine' }); setPlaceText(''); setPage(1); setRevision(value => value + 1);
      setNotice(editing ? (editing.status === 'paused' ? 'Изменения сохранены. Объявление осталось на паузе.' : 'Изменения сохранены и видны посетителям.') : 'Объявление опубликовано. Оно доступно посетителям в разделе «Жильё».');
      setEditing(null); dirtyForm.current = false;
      requestAnimationFrame(() => { noticeRef.current?.focus(); noticeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    } catch (e) { setFormError((e as Error).message + ' Ваши поля сохранены на этой странице.'); }
    finally { saveLock.current = false; setSaving(false); setUploadProgress(''); }
  }
  return <main className="housing-page">
    <header className="housing-header">
      <a href="/" className="brand"><span className="brandmark">Q</span>Qoldan</a>
      <a href="/#catalog"><ArrowLeft size={17} /> Все направления</a>
      {signedIn ? <button type="button" onClick={() => openForm()} disabled={saving}><Plus size={18} /> Разместить жильё</button> : <a className="housing-primary" href={signInPath} target="_top">Войти и разместить</a>}
    </header>
    <section className="housing-intro">
      <span className="housing-label"><BedDouble size={18} /> Отдельный раздел Qoldan</span>
      <h1>Жильё на сутки</h1>
      <p>Гостиницы и квартиры в городах, посёлках и сёлах Казахстана.</p>
    </section>
    <p ref={noticeRef} tabIndex={-1} role="status">{notice}</p>
    {showForm && signedIn && <section className="housing-publish" aria-labelledby="housing-publish-title">
      <h2 id="housing-publish-title">{editing ? 'Редактировать жильё' : 'Разместить жильё'}</h2>
      <p>Указывайте цену за весь выбранный номер или квартиру за сутки. Наличие, залог и время заезда гость согласует с вами напрямую.</p>
      {editing && <p>Редактируется: <b>{editing.title}</b>. Статус публикации не изменится.</p>}
      <form key={formSession} onSubmit={publish} onChange={() => { dirtyForm.current = true; }}>
        <fieldset disabled={saving}>
          <div className="housing-form-grid">
            <label>Тип жилья<select name="category" defaultValue={editing?.category}>{HOUSING_CATEGORIES.map(kind => <option key={kind}>{kind}</option>)}</select></label>
            <label>Кто сдаёт<select name="sellerType" defaultValue={editing?.sellerType}><option>Частное лицо</option><option>Компания</option><option>Магазин</option></select></label>
            <label className="housing-wide">Название<input name="title" defaultValue={editing?.title} required minLength={4} maxLength={160} placeholder="Например, двухкомнатная квартира рядом с вокзалом" /></label>
            <label>Цена за сутки, ₸<input name="price" defaultValue={editing?.price} type="number" required min="1" max="9999999" step="1" /></label>
            <label>Максимум гостей<input name="guests" type="number" required min="1" max="50" defaultValue={editing?.guests ?? 2} /></label>
            <label>Количество комнат<input name="rooms" type="number" required min="1" max="30" defaultValue={editing?.rooms ?? 1} /></label>
            <label>Телефон для гостей<input name="phone" defaultValue={editing?.phone} type="tel" required minLength={10} maxLength={32} placeholder="+7 …" autoComplete="tel" /></label>
            <div className="housing-wide"><LocationFields initialRegion={editing?.region || (filters.region === 'Весь Казахстан' ? 'Область Жетісу' : filters.region)} initialPlace={editing?.location}
              initialPoint={editing?.latitude != null && editing.longitude != null ? { latitude: editing.latitude, longitude: editing.longitude } : null}
              onPointChange={() => { dirtyForm.current = true; }} fieldName="location" /></div>
            <label className="housing-wide">Свободные даты и время заезда<input name="available" defaultValue={editing?.available || ''} maxLength={160} placeholder="Например, с 20 сентября, заезд с 14:00. Уточняйте по телефону." /></label>
            <label className="housing-wide">Описание и условия<textarea name="description" defaultValue={editing?.description || ''} required minLength={20} maxLength={1200} rows={5} placeholder="Спальные места, удобства, адрес или ориентир, залог, правила проживания. Для гостиницы описывайте конкретный тип номера." /></label>
            <label className="housing-wide">Добавить фотографии — {photos.length} из 5. JPG, PNG или WebP до 5 МБ каждая<input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={photos.length >= 5} onChange={e => {
              const files = Array.from(e.target.files || []); e.target.value = '';
              if (photos.length + files.length > 5) { setFormError('Можно добавить до пяти фотографий. Удалите лишние или выберите меньше файлов.'); return; }
              if (files.some(file => file.size > 5000000 || !['image/jpeg','image/png','image/webp'].includes(file.type))) { setFormError('Каждая фотография должна быть JPG, PNG или WebP до 5 МБ.'); return; }
              const added = files.map(file => { const preview = URL.createObjectURL(file); objectUrls.current.add(preview); return { id: crypto.randomUUID(), file, preview }; });
              setPhotos(current => [...current, ...added]); setFormError('');
            }} /></label>
            <div className="housing-wide housing-photo-editor">{photos.map((photo, index) => <div key={photo.id}>
              <img src={photo.preview} alt={`Фотография ${index + 1}`} />
              <div><button type="button" aria-pressed={index === 0} onClick={() => { setPhotos(current => [photo, ...current.filter(value => value.id !== photo.id)]); dirtyForm.current = true; }}>{index === 0 ? 'Главная' : 'Сделать главной'}</button>
              <button type="button" aria-label={`Удалить фотографию ${index + 1}`} onClick={() => removePhoto(photo)}>Удалить</button></div>
            </div>)}</div>
          </div>
          {formError && <p role="alert" className="housing-error">{formError}</p>}
          <p role="status">{uploadProgress}</p>
          <ConsentNote />
          <div className="housing-actions"><button className="housing-primary" type="submit">{saving ? 'Сохраняем…' : editing ? 'Сохранить изменения' : 'Опубликовать'}</button><button type="button" onClick={closeForm}>Закрыть форму</button></div>
        </fieldset>
      </form>
    </section>}
    <form className="housing-filters" onSubmit={applyFilters}>
      <label>Регион<select value={draft.region} onChange={e => { setDraft({ ...draft, region: e.target.value, place: [] }); setPlaceText(''); }}>
        <option>Весь Казахстан</option>{KAZAKHSTAN_REGIONS.map(r => <option key={r.code} value={r.name}>{r.code} — {r.name}</option>)}
      </select></label>
      <label>Тип жилья<select value={draft.kind} onChange={e => setDraft({ ...draft, kind: e.target.value })}><option value="all">Всё жильё</option>{HOUSING_CATEGORIES.map(kind => <option key={kind}>{kind}</option>)}</select></label>
      <label>Поиск<input value={draft.q} maxLength={160} onChange={e => setDraft({ ...draft, q: e.target.value })} placeholder="Название, ориентир, удобства" /></label>
      <label>Цена до, ₸ / сутки<input type="number" min="0" max="9999999" value={draft.maxPrice === '0' ? '' : draft.maxPrice} onChange={e => setDraft({ ...draft, maxPrice: e.target.value || '0' })} placeholder="Любая" /></label>
      <label>Гостей не меньше<input type="number" min="0" max="50" value={draft.guests === '0' ? '' : draft.guests} onChange={e => setDraft({ ...draft, guests: e.target.value || '0' })} placeholder="Любое число" /></label>
      <label>Показать<select value={draft.view} onChange={e => setDraft({ ...draft, view: e.target.value })}><option value="all">Все объявления</option>{signedIn && <><option value="mine">Мои объявления</option><option value="favorites">Избранное</option></>}</select></label>
      {draft.region !== 'Весь Казахстан' && <div className="housing-wide"><SettlementSearch region={draft.region} value={placeText}
        onChange={value => { setPlaceText(value); setDraft({ ...draft, place: [] }); }}
        onSelect={place => { setPlaceText(place.name); setDraft({ ...draft, place: [...new Set([place.name, ...place.aliases])].filter(Boolean).slice(0, 30) }); }} /></div>}
      <div className="housing-actions housing-wide"><button className="housing-primary" type="submit"><Search size={17} /> Найти жильё</button>
        {signedIn && <button type="button" onClick={() => { setDraft({ ...initialFilters, view: 'mine' }); setFilters({ ...initialFilters, view: 'mine' }); setPlaceText(''); setPage(1); }}>Мои объявления</button>}
        <button type="button" disabled={loading} onClick={() => setRevision(value => value + 1)}>Обновить список</button>
        <button type="button" onClick={() => { setDraft(initialFilters); setFilters(initialFilters); setPlaceText(''); setPage(1); }}>Сбросить</button>
        <button type="button" aria-pressed={showMap} onClick={() => setShowMap(value => !value)}><MapPin size={17} /> {showMap ? 'Скрыть карту' : 'На карте'}</button>
      </div>
    </form>
    <p className="housing-note">Объявления размещают пользователи. Qoldan не подтверждает свободные даты и не принимает оплату за проживание. Не переводите предоплату без проверки объекта и владельца.</p>
    {error && <p className="housing-error" role="alert">{error} <button type="button" onClick={() => setRevision(value => value + 1)}>Повторить</button></p>}
    {loading ? <p role="status">Загружаем жильё…</p> : <>
      {showMap && !error && <section><p>На карте — точки объявлений с текущей страницы. Если точка не указана, объект остаётся в списке.</p><MarketplaceMap markers={markers} fallbackCenter={getRegionCenter(filters.region)} overview={filters.region === 'Весь Казахстан'} onSelect={id => document.getElementById('housing-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })} /></section>}
      {!items.length && !error && <section className="housing-empty"><BedDouble size={32} /><h2>Пока нет подходящих объявлений</h2><p>Попробуйте другой регион или снимите фильтры. Этот раздел новый — демонстрационные квартиры и гостиницы сюда не добавлены.</p>{signedIn ? <button className="housing-primary" type="button" onClick={() => openForm()}>Разместить первое жильё</button> : <a className="housing-primary" href={signInPath} target="_top">Войти и разместить жильё</a>}</section>}
      <div className="housing-grid">{items.map(item => <article className="housing-card" id={'housing-' + item.id} key={item.id}>
        <a href={'/listing/' + item.id} aria-label={item.title}><img src={item.image} alt={item.title} loading="lazy" decoding="async" width="480" height="320" /></a>
        <div className="housing-card-body"><span className="housing-label">{item.category}</span><h2>{item.title}</h2>
          <b className="housing-price">{Number(item.price).toLocaleString('ru-RU')} ₸ <small>/ сутки</small></b>
          <p>{item.rooms} комн. · до {item.guests} гостей</p><p><MapPin size={15} /> {item.location} · {item.region}</p>
          <p className="housing-description">{item.description}</p><p>{item.available || 'Свободные даты уточняйте у владельца'}</p>
          <div className="housing-actions">{item.status === 'active' && <a className="housing-primary" href={'tel:+' + item.phone.replace(/\D/g, '')}><Phone size={16} /> Позвонить</a>}
            {signedIn ? <button type="button" disabled={busy} aria-pressed={item.favorite} aria-label={item.favorite ? 'Убрать из избранного' : 'В избранное'} onClick={() => void favorite(item)}><Heart size={18} fill={item.favorite ? 'currentColor' : 'none'} /></button> : <a href={signInPath} target="_top" aria-label="Войти, чтобы добавить в избранное"><Heart size={18} /></a>}
            {item.status === 'active' && <a href={'/listing/' + item.id}>Подробнее</a>}
          </div>
          {item.mine && <div className="housing-owner"><span>{item.status === 'active' ? 'Опубликовано' : item.status === 'paused' ? 'На паузе' : 'Ограничено модерацией'}</span>{['active','paused'].includes(item.status) && <>
            <button type="button" disabled={busy || saving} onClick={() => openForm(item)}>Редактировать</button>
            <button type="button" disabled={busy || saving || (showForm && editing?.id === item.id)} title={showForm && editing?.id === item.id ? 'Сначала сохраните или закройте форму редактирования' : undefined} onClick={() => void toggleStatus(item)}>{item.status === 'active' ? 'Снять с публикации' : 'Опубликовать снова'}</button>
          </>}</div>}
        </div>
      </article>)}</div>
      {!error && (page > 1 || hasMore) && <nav className="housing-pagination" aria-label="Страницы объявлений"><button disabled={page === 1} onClick={() => setPage(value => value - 1)}>Назад</button><span>Страница {page}</span><button disabled={!hasMore} onClick={() => setPage(value => value + 1)}>Далее</button></nav>}
    </>}
    <footer><a href="/">Qoldan · Все направления</a><a href="/map-editor">Исправить населённый пункт</a></footer>
  </main>;
}
