'use client';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, BedDouble, Heart, MapPin, Plus, Search } from 'lucide-react';
import { KAZAKHSTAN_REGIONS } from '@/lib/regions';
import { HOUSING_CATEGORIES, getHousingPhotos, type HousingListing } from '@/lib/housing';
import { getRegionCenter } from '@/lib/geo';
import { LocationFields } from '@/components/LocationFields';
import { SettlementSearch } from '@/components/SettlementSearch';
import ConsentNote from '@/components/ConsentNote';
import { LegalLinks } from '@/components/LegalFooter';
import RevealPhone from '@/components/RevealPhone';
import { optimizeListingImage } from '@/lib/image-optimize';
import { MarketplaceMap } from '@/components/MarketplaceMap';
import type { Lang } from '@/lib/ui-copy';
import { housingCopy } from '@/lib/housing-copy';
import { localizeError } from '@/lib/localize-error';

type Filters = { region: string; kind: string; q: string; place: string[]; guests: string; maxPrice: string; view: string };
type Photo = { id: string; preview: string; file?: File; url?: string };
const FILTERS_KEY = 'qoldan-housing-filters-v1';
const initialFilters: Filters = { region: 'Весь Казахстан', kind: 'all', q: '', place: [], guests: '0', maxPrice: '0', view: 'all' };
async function api(url: string, body: unknown, method = 'POST') {
  const response = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json() as { error?: string };
  // An empty message means "no server text": the caller shows its own translated fallback.
  if (!response.ok) throw new Error(data.error || '');
  return data;
}
export default function HousingClient({ signedIn, signInPath, lang = 'ru' }: { signedIn: boolean; signInPath: string; lang?: Lang }) {
  // Stable per language: the map markers below depend on it.
  const t = useMemo(() => housingCopy(lang), [lang]);
  const failure = async (e: unknown, fallback: string) => (await localizeError((e as Error)?.message || '', lang)) || fallback;
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
    if (saveLock.current || (showForm && dirtyForm.current && !window.confirm(t.unsavedSwitch))) return;
    clearPhotos(); setEditing(item); setFormSession(value => value + 1);
    if (item) setPhotos(getHousingPhotos(item.image, item.photos).map(url => ({ id: url, preview: url, url })));
    setFormError(''); setNotice(''); dirtyForm.current = false; setShowForm(true);
    requestAnimationFrame(() => document.getElementById('housing-publish-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
  function closeForm() {
    if (saveLock.current || (dirtyForm.current && !window.confirm(t.unsavedClose))) return;
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
  // Keep filters and page for this tab, so coming back from a listing page does not reset the search.
  const restored = useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const saved = JSON.parse(window.sessionStorage.getItem(FILTERS_KEY) || 'null') as { filters?: Filters; page?: number } | null;
        if (saved?.filters && typeof saved.filters.region === 'string' && Array.isArray(saved.filters.place)) {
          const next = { ...initialFilters, ...saved.filters };
          setFilters(next); setDraft(next); setPlaceText(next.place.join(', '));
          if (typeof saved.page === 'number' && saved.page >= 1) setPage(Math.floor(saved.page));
        }
      } catch { /* Private mode or damaged value: start with default filters. */ }
      restored.current = true;
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!restored.current) return;
    try { window.sessionStorage.setItem(FILTERS_KEY, JSON.stringify({ filters, page })); } catch { /* Not saved, nothing breaks. */ }
  }, [filters, page]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    const params = new URLSearchParams({ ...filters, place: '', page: String(page) });
    params.delete('place'); filters.place.forEach(name => params.append('place', name));
    fetch('/api/housing?' + params, { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        const data = await response.json() as { items: HousingListing[]; hasMore: boolean; error?: string };
        if (!response.ok) throw new Error(data.error || '');
        if (!controller.signal.aborted) { setItems(data.items); setHasMore(data.hasMore); }
      }).catch(async e => { const message = (await localizeError((e as Error)?.message || '', lang)) || t.loadFailed; if (!controller.signal.aborted) { setError(message); setItems([]); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filters, page, revision, t, lang]);
  const markers = useMemo(() => items.filter(item => item.latitude != null && item.longitude != null).map(item => ({
    id: item.id, title: item.title, price: `${item.price} ₸ ${t.perDay}`, type: 'Сдам' as const,
    latitude: item.latitude!, longitude: item.longitude!,
  })), [items, t]);
  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPage(1); setFilters({ ...draft, place: draft.place.length ? draft.place : placeText.trim() ? [placeText.trim()] : [] });
  }
  async function favorite(item: HousingListing) {
    if (!signedIn || busy) return;
    setBusy(true); setError('');
    try {
      await api('/api/favorites', { listingId: item.id, active: !item.favorite });
      setRevision(value => value + 1);
    } catch (e) { setError(await failure(e, t.saveFailed)); }
    finally { setBusy(false); }
  }
  async function toggleStatus(item: HousingListing) {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await api('/api/listings/status', { listingId: item.id, status: item.status === 'active' ? 'paused' : 'active' });
      setRevision(value => value + 1);
    } catch (e) { setError(await failure(e, t.saveFailed)); }
    finally { setBusy(false); }
  }
  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saveLock.current) return;
    if (!photos.length) { setFormError(t.needPhoto); return; }
    saveLock.current = true; setSaving(true); setFormError('');
    const form = event.currentTarget, values = new FormData(form);
    try {
      const photoUrls: string[] = [];
      for (const [index, photo] of photos.entries()) {
        let url = photo.url || uploadedPhotos.current.get(photo.id);
        if (!url && photo.file) {
          setUploadProgress(t.uploading(index + 1, photos.length));
          const optimized = await optimizeListingImage(photo.file);
          const upload = new FormData(); upload.append('image', new File([optimized], 'photo.jpg', { type: 'image/jpeg' }));
          const response = await fetch('/api/uploads', { method: 'POST', body: upload });
          const data = await response.json() as { url: string; error?: string };
          if (!response.ok) throw new Error(data.error || t.uploadFailed);
          url = data.url; uploadedPhotos.current.set(photo.id, url);
        }
        if (!url) throw new Error(t.pickAgain);
        photoUrls.push(url);
      }
      const imageUrl = photoUrls[0]; setUploadProgress(t.saving);
      const latitude = String(values.get('latitude') || ''), longitude = String(values.get('longitude') || '');
      const data = {
        title: values.get('title'), price: values.get('price'), category: values.get('category'),
        unit: '/ сутки', type: 'Сдам', location: values.get('location'), region: values.get('region'),
        phone: values.get('phone'), showPhone: values.get('showPhone') === 'on', available: values.get('available'), description: values.get('description'),
        sellerType: values.get('sellerType'), imageUrl,
        housing: { guests: Number(values.get('guests')), rooms: Number(values.get('rooms')), photos: photoUrls },
        ...(latitude && longitude ? { latitude: Number(latitude), longitude: Number(longitude) } : {}),
      };
      if (editing) await api('/api/housing', { listingId: editing.id, expectedUpdatedAt: editing.updatedAt, data }, 'PATCH');
      else await api('/api/listings', data);
      if (editing) discardUploads(getHousingPhotos(editing.image, editing.photos).filter(url => !photoUrls.includes(url)));
      clearPhotos(false); setShowForm(false);
      setFilters({ ...initialFilters, view: 'mine' }); setDraft({ ...initialFilters, view: 'mine' }); setPlaceText(''); setPage(1); setRevision(value => value + 1);
      setNotice(editing ? (editing.status === 'paused' ? t.savedPaused : t.savedActive) : t.published);
      setEditing(null); dirtyForm.current = false;
      requestAnimationFrame(() => { noticeRef.current?.focus(); noticeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    } catch (e) { setFormError(`${await failure(e, t.saveFailed)} ${t.fieldsKept}`); }
    finally { saveLock.current = false; setSaving(false); setUploadProgress(''); }
  }
  return <main id="main-content" tabIndex={-1} lang={lang} className="housing-page">
    <header className="housing-header">
      <a href="/" className="brand"><span className="brandmark">Q</span>Qoldan</a>
      <a href="/#catalog"><ArrowLeft size={17} /> {t.allDirections}</a>
      {signedIn ? <button type="button" onClick={() => openForm()} disabled={saving}><Plus size={18} /> {t.place}</button> : <a className="housing-primary" href={signInPath} target="_top">{t.signInPlace}</a>}
    </header>
    <section className="housing-intro">
      <span className="housing-label"><BedDouble size={18} /> {t.sectionLabel}</span>
      <h1>{t.title}</h1>
      <p>{t.lead}</p>
    </section>
    <p ref={noticeRef} tabIndex={-1} role="status">{notice}</p>
    {showForm && signedIn && <section className="housing-publish" aria-labelledby="housing-publish-title">
      <h2 id="housing-publish-title">{editing ? t.edit : t.place}</h2>
      <p>{t.priceHelp}</p>
      {editing && <p>{t.editingNow} <b>{editing.title}</b>. {t.editingTail}</p>}
      <form key={formSession} onSubmit={publish} onChange={() => { dirtyForm.current = true; }}>
        <fieldset disabled={saving}>
          <div className="housing-form-grid">
            <label>{t.kind}<select name="category" defaultValue={editing?.category}>{HOUSING_CATEGORIES.map(kind => <option key={kind} value={kind}>{t.categoryLabel(kind)}</option>)}</select></label>
            <label>{t.sellerType}<select name="sellerType" defaultValue={editing?.sellerType}>{(['Частное лицо', 'Компания', 'Магазин'] as const).map(kind => <option key={kind} value={kind}>{t.sellerLabel(kind)}</option>)}</select></label>
            <label className="housing-wide">{t.name}<input name="title" defaultValue={editing?.title} required minLength={4} maxLength={160} placeholder={t.namePlaceholder} /></label>
            <label>{t.pricePerDay}<input name="price" defaultValue={editing?.price} type="number" required min="1" max="9999999" step="1" /></label>
            <label>{t.maxGuests}<input name="guests" type="number" required min="1" max="50" defaultValue={editing?.guests ?? 2} /></label>
            <label>{t.rooms}<input name="rooms" type="number" required min="1" max="30" defaultValue={editing?.rooms ?? 1} /></label>
            <label>{t.phone}<input name="phone" defaultValue={editing?.phone} type="tel" required minLength={10} maxLength={32} placeholder="+7 …" autoComplete="tel" /></label>
        <label className="check-line"><input name="showPhone" type="checkbox" defaultChecked={editing ? editing.hasPhone !== false : true} /> {t.showPhone}</label>
            <div className="housing-wide"><LocationFields initialRegion={editing?.region || (filters.region === 'Весь Казахстан' ? 'Область Жетісу' : filters.region)} initialPlace={editing?.location}
              initialPoint={editing?.latitude != null && editing.longitude != null ? { latitude: editing.latitude, longitude: editing.longitude } : null}
              onPointChange={() => { dirtyForm.current = true; }} fieldName="location" lang={lang} /></div>
            <label className="housing-wide">{t.available}<input name="available" defaultValue={editing?.available || ''} maxLength={160} placeholder={t.availablePlaceholder} /></label>
            <label className="housing-wide">{t.description}<textarea name="description" defaultValue={editing?.description || ''} required minLength={20} maxLength={1200} rows={5} placeholder={t.descriptionPlaceholder} /></label>
            <label className="housing-wide">{t.addPhotos(photos.length)}<input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={photos.length >= 5} onChange={e => {
              const files = Array.from(e.target.files || []); e.target.value = '';
              if (photos.length + files.length > 5) { setFormError(t.tooManyPhotos); return; }
              if (files.some(file => file.size > 40000000 || !['image/jpeg','image/png','image/webp'].includes(file.type))) { setFormError(t.badPhoto); return; }
              const added = files.map(file => { const preview = URL.createObjectURL(file); objectUrls.current.add(preview); return { id: crypto.randomUUID(), file, preview }; });
              setPhotos(current => [...current, ...added]); setFormError('');
            }} /></label>
            <div className="housing-wide housing-photo-editor">{photos.map((photo, index) => <div key={photo.id}>
              <img src={photo.preview} alt={t.photo(index + 1)} />
              <div><button type="button" aria-pressed={index === 0} onClick={() => { setPhotos(current => [photo, ...current.filter(value => value.id !== photo.id)]); dirtyForm.current = true; }}>{index === 0 ? t.cover : t.makeCover}</button>
              <button type="button" aria-label={t.removePhoto(index + 1)} onClick={() => removePhoto(photo)}>{t.remove}</button></div>
            </div>)}</div>
          </div>
          {formError && <p role="alert" className="housing-error">{formError}</p>}
          <p role="status">{uploadProgress}</p>
          <ConsentNote lang={lang} />
          <div className="housing-actions"><button className="housing-primary" type="submit">{saving ? t.savingButton : editing ? t.saveChanges : t.publish}</button><button type="button" onClick={closeForm}>{t.closeForm}</button></div>
        </fieldset>
      </form>
    </section>}
    <form className="housing-filters" onSubmit={applyFilters}>
      <label>{t.region}<select value={draft.region} onChange={e => { setDraft({ ...draft, region: e.target.value, place: [] }); setPlaceText(''); }}>
        <option value="Весь Казахстан">{t.allKazakhstan}</option>{KAZAKHSTAN_REGIONS.map(r => <option key={r.code} value={r.name}>{r.code} — {r.name}</option>)}
      </select></label>
      <label>{t.kind}<select value={draft.kind} onChange={e => setDraft({ ...draft, kind: e.target.value })}><option value="all">{t.allHousing}</option>{HOUSING_CATEGORIES.map(kind => <option key={kind} value={kind}>{t.categoryLabel(kind)}</option>)}</select></label>
      <label>{t.search}<input value={draft.q} maxLength={160} onChange={e => setDraft({ ...draft, q: e.target.value })} placeholder={t.searchPlaceholder} /></label>
      <label>{t.maxPrice}<input type="number" min="0" max="9999999" value={draft.maxPrice === '0' ? '' : draft.maxPrice} onChange={e => setDraft({ ...draft, maxPrice: e.target.value || '0' })} placeholder={t.anyPrice} /></label>
      <label>{t.minGuests}<input type="number" min="0" max="50" value={draft.guests === '0' ? '' : draft.guests} onChange={e => setDraft({ ...draft, guests: e.target.value || '0' })} placeholder={t.anyGuests} /></label>
      <label>{t.show}<select value={draft.view} onChange={e => setDraft({ ...draft, view: e.target.value })}><option value="all">{t.allListings}</option>{signedIn && <><option value="mine">{t.mine}</option><option value="favorites">{t.favorites}</option></>}</select></label>
      {draft.region !== 'Весь Казахстан' && <div className="housing-wide"><SettlementSearch region={draft.region} value={placeText} lang={lang}
        onChange={value => { setPlaceText(value); setDraft({ ...draft, place: [] }); }}
        onSelect={place => { setPlaceText(place.name); setDraft({ ...draft, place: [...new Set([place.name, ...place.aliases])].filter(Boolean).slice(0, 30) }); }} /></div>}
      <div className="housing-actions housing-wide"><button className="housing-primary" type="submit"><Search size={17} /> {t.find}</button>
        {signedIn && <button type="button" onClick={() => { setDraft({ ...initialFilters, view: 'mine' }); setFilters({ ...initialFilters, view: 'mine' }); setPlaceText(''); setPage(1); }}>{t.mine}</button>}
        <button type="button" disabled={loading} onClick={() => setRevision(value => value + 1)}>{t.refresh}</button>
        <button type="button" onClick={() => { setDraft(initialFilters); setFilters(initialFilters); setPlaceText(''); setPage(1); }}>{t.reset}</button>
        <button type="button" aria-pressed={showMap} onClick={() => setShowMap(value => !value)}><MapPin size={17} /> {showMap ? t.hideMap : t.onMap}</button>
      </div>
    </form>
    <p className="housing-note">{t.note}</p>
    {error && <p className="housing-error" role="alert">{error} <button type="button" onClick={() => setRevision(value => value + 1)}>{t.retry}</button></p>}
    {loading ? <p role="status">{t.loading}</p> : <>
      {showMap && !error && <section><p>{t.mapNote}</p><MarketplaceMap lang={lang} markers={markers} fallbackCenter={getRegionCenter(filters.region)} overview={filters.region === 'Весь Казахстан'} onSelect={id => document.getElementById('housing-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })} /></section>}
      {!items.length && !error && <section className="housing-empty"><BedDouble size={32} /><h2>{t.emptyTitle}</h2><p>{t.emptyText}</p>{signedIn ? <button className="housing-primary" type="button" onClick={() => openForm()}>{t.placeFirst}</button> : <a className="housing-primary" href={signInPath} target="_top">{t.signInFirst}</a>}</section>}
      <div className="housing-grid">{items.map(item => <article className="housing-card" id={'housing-' + item.id} key={item.id}>
        <a href={'/listing/' + item.id} aria-label={item.title}><img src={item.image} alt={item.title} loading="lazy" decoding="async" width="480" height="320" /></a>
        <div className="housing-card-body"><span className="housing-label">{t.categoryLabel(item.category)}</span><h2>{item.title}</h2>
          <b className="housing-price">{Number(item.price).toLocaleString(t.numberLocale)} ₸ <small>{t.perDay}</small></b>
          <p>{t.roomsGuests(item.rooms, item.guests)}</p><p><MapPin size={15} /> {item.location} · {item.region}</p>
          <p className="housing-description">{item.description}</p><p>{item.available || t.datesAsk}</p>
          <div className="housing-actions">{item.status === 'active' && !item.mine && (item.hasPhone ? <RevealPhone listingId={item.id} signInPath={signInPath} title={item.title} buttonClass="housing-primary" callClass="housing-primary" whatsappClass="housing-primary" lang={lang} /> : <span className="phone-hidden-note">{t.phoneHidden}</span>)}
            {signedIn ? <button type="button" disabled={busy} aria-pressed={item.favorite} aria-label={item.favorite ? t.unfavorite : t.favorite} onClick={() => void favorite(item)}><Heart size={18} fill={item.favorite ? 'currentColor' : 'none'} /></button> : <a href={signInPath} target="_top" aria-label={t.signInFavorite}><Heart size={18} /></a>}
            {item.status === 'active' && <a href={'/listing/' + item.id}>{t.details}</a>}
          </div>
          {item.mine && <div className="housing-owner"><span>{item.status === 'active' ? t.statusActive : item.status === 'paused' ? t.statusPaused : t.statusRestricted}</span>{['active','paused'].includes(item.status) && <>
            <button type="button" disabled={busy || saving} onClick={() => openForm(item)}>{t.editButton}</button>
            <button type="button" disabled={busy || saving || (showForm && editing?.id === item.id)} title={showForm && editing?.id === item.id ? t.closeEditFirst : undefined} onClick={() => void toggleStatus(item)}>{item.status === 'active' ? t.unpublish : t.republish}</button>
          </>}</div>}
        </div>
      </article>)}</div>
      {!error && (page > 1 || hasMore) && <nav className="housing-pagination" aria-label={t.pages}><button disabled={page === 1} onClick={() => setPage(value => value - 1)}>{t.back}</button><span>{t.page(page)}</span><button disabled={!hasMore} onClick={() => setPage(value => value + 1)}>{t.next}</button></nav>}
    </>}
    <footer><a href="/">{t.footerHome}</a><a href="/map-editor">{t.fixPlace}</a><div style={{ flexBasis: '100%', textAlign: 'center', fontSize: 12, lineHeight: 1.6, opacity: 0.8 }}><LegalLinks /></div></footer>
  </main>;
}
