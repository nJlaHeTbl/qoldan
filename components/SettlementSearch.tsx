'use client';
import { useEffect, useId, useState } from 'react';
import { KAZAKHSTAN_REGIONS } from '@/lib/regions';
import type { Lang } from '@/lib/ui-copy';
import { locationCopy } from '@/lib/location-copy';

export type Settlement = { id: string; name: string; aliases: string[]; latitude: number; longitude: number; district: string; revision?: string };
export function SettlementSearch({ region, value, onChange, onSelect, name, required = false, lang = 'ru' }: {
  region: string; value: string; onChange: (value: string) => void; onSelect: (place: Settlement) => void; name?: string; required?: boolean; lang?: Lang;
}) {
  const t = locationCopy(lang);
  const id = useId();
  const [places, setPlaces] = useState<Settlement[]>([]);
  const [status, setStatus] = useState<'' | 'chooseRegion' | 'loading' | 'unavailable'>('');
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setPlaces([]);
    const code = KAZAKHSTAN_REGIONS.find(r => r.name === region)?.code;
    if (!code) { setStatus('chooseRegion'); return; }
    setStatus('loading');
    Promise.all([`/settlements/${code}.json`, `/api/settlement-overrides?region=${code}`].map(async url=>{
      const r=await fetch(url,{signal:controller.signal});if(!r.ok)throw new Error();return r.json();
    })).then(([data,overrides]) => {
      if (!Array.isArray(data)) throw new Error();
      const rows = data.filter((p): p is Settlement => typeof p?.id === 'string' && typeof p?.name === 'string' && Array.isArray(p?.aliases) && p.aliases.every((n: unknown) => typeof n === 'string') && Number.isFinite(p?.latitude) && Number.isFinite(p?.longitude));
      if(!Array.isArray(overrides))throw new Error();
      const merged=new Map(rows.map(p=>[p.id,p]));
      for(const edited of overrides) {
        const base=merged.get(edited.id);
        if(edited.reset) {if(base)merged.set(edited.id,{...base,revision:edited.revision});else merged.delete(edited.id);}
        else merged.set(edited.id,{...edited,aliases:[...new Set([...(base?.aliases || []),base?.name,...edited.aliases].filter(Boolean))]});
      }
      if (!controller.signal.aborted) {setPlaces([...merged.values()]); setStatus('');}
    })
      .catch(() => { if (!controller.signal.aborted) setStatus('unavailable'); });
    return () => controller.abort();
  }, [region]);
  const normalized = value.trim().toLocaleLowerCase().replaceAll('ё', 'е');
  const matches = places.filter(p => !normalized || [p.name,...p.aliases].some(n => n.toLocaleLowerCase().replaceAll('ё','е').includes(normalized))).slice(0,12);
  return <div className="settlement-search">
    <label htmlFor={id}>{t.settlement}</label>
    <input id={id} name={name} value={value} required={required} maxLength={160} autoComplete="off"
      placeholder={t.placeholder} onFocus={() => setExpanded(true)}
      onChange={e => {onChange(e.target.value); setExpanded(true);}} aria-describedby={`${id}-hint`} />
    {expanded && matches.length > 0 && <div className="settlement-results">
      {matches.map(p => <button type="button" key={p.id} onClick={() => {onSelect(p); setExpanded(false);}}>
        <b>{p.name}</b><small>{p.latitude.toFixed(3)}, {p.longitude.toFixed(3)}</small>
      </button>)}
      <button type="button" onClick={() => setExpanded(false)}>{t.hide}</button>
    </div>}
    <small id={`${id}-hint`}>{(status && t[status]) || (normalized && !matches.length ? t.notFound : t.searchHint)}</small>
    <small>{t.source} <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">GeoNames</a>, CC BY 4.0. {t.sourceNote}</small>
    <small><a href="/map-editor">{t.fix}</a></small>
  </div>;
}
