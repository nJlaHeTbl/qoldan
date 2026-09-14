'use client';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, CircleMarker } from 'leaflet';
import { KAZAKHSTAN_REGIONS } from '@/lib/regions';
import { getRegionCenter, type Coordinates } from '@/lib/geo';
import { SettlementSearch } from './SettlementSearch';

export function LocationFields({ initialRegion, initialPlace = '', initialPoint = null, fieldName, point, onPointChange }: {
  initialRegion: string; initialPlace?: string; fieldName: 'location' | 'place';
  point?: Coordinates | null; onPointChange?: (point: Coordinates | null) => void;
  initialPoint?: Coordinates | null;
}) {
  const [region,setRegion] = useState(initialRegion);
  const [place,setPlace] = useState(initialPlace);
  const [localPoint,setLocalPoint] = useState<Coordinates | null>(initialPoint);
  const [showMap,setShowMap] = useState(false);
  const [hint,setHint] = useState('');
  const current = point === undefined ? localPoint : point;
  const setPoint = (p: Coordinates | null) => {setLocalPoint(p); onPointChange?.(p);};
  const callback = useRef(setPoint); callback.current = setPoint;
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<CircleMarker | null>(null);
  useEffect(() => {
    if (!showMap) return;
    let stopped = false;
    let map: LeafletMap | undefined;
    void import('leaflet').then(L => {
      if (stopped || !container.current) return;
      map = L.map(container.current,{scrollWheelZoom:false}); mapRef.current=map;
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
      const center=current || getRegionCenter(region);
      map.setView([center.latitude,center.longitude], current ? 12 : 7);
      if(current) markerRef.current=L.circleMarker([current.latitude,current.longitude]).addTo(map);
      map.on('click',e => {
        const {lat,lng}=e.latlng;
        if(lat<40 || lat>56 || lng<45 || lng>88) {setHint('Выберите точку в Казахстане.'); return;}
        const p={latitude:Number(lat.toFixed(6)),longitude:Number(lng.toFixed(6))};
        markerRef.current?.remove(); markerRef.current=L.circleMarker([lat,lng]).addTo(map!);
        callback.current(p); setHint('Точка выбрана вручную. Проверьте область и название.');
      });
    }).catch(()=>setHint('Карта не загрузилась. Можно сохранить название без точки.'));
    return () => {stopped=true;map?.remove();mapRef.current=null;markerRef.current=null;};
  },[showMap,region]);
  useEffect(() => {
    if(current && mapRef.current) {
      mapRef.current.setView([current.latitude,current.longitude],12);
      void import('leaflet').then(L=>{
        if(!mapRef.current) return;
        markerRef.current?.remove(); markerRef.current=L.circleMarker([current.latitude,current.longitude]).addTo(mapRef.current);
      });
    } else {markerRef.current?.remove(); markerRef.current=null;}
  },[current?.latitude,current?.longitude]);
  return <div className="location-fields wide">
    <label>Регион<select name="region" required value={region} onChange={e=>{setRegion(e.target.value);setPlace('');setPoint(null);setHint('');}}>
      {KAZAKHSTAN_REGIONS.map(r=><option key={r.code} value={r.name}>{r.code} — {r.name}</option>)}
    </select></label>
    <SettlementSearch region={region} value={place} name={fieldName} required
      onChange={v=>{setPlace(v);setPoint(null);setHint('');}}
      onSelect={p=>{setPlace(p.name);setPoint({latitude:p.latitude,longitude:p.longitude});setHint('Выбран центр населённого пункта. Уточните расположение объекта на карте.');setShowMap(true);}} />
    <input type="hidden" name="latitude" value={current?.latitude ?? ''}/>
    <input type="hidden" name="longitude" value={current?.longitude ?? ''}/>
    <button type="button" onClick={()=>setShowMap(v=>!v)}>{showMap?'Скрыть карту':'Указать объект или адрес на карте'}</button>
    {showMap && <><p>Нажмите на карту в нужном месте. Эта точка будет видна посетителям — не указывайте частный адрес без необходимости.</p><div ref={container} className="location-point-map" aria-label="Выбор точки на карте Казахстана" /></>}
    {current && <small>Точка: {current.latitude.toFixed(5)}, {current.longitude.toFixed(5)} <button type="button" onClick={()=>{setPoint(null);setHint('');}}>Убрать точку</button></small>}
    {hint && <small role="status">{hint}</small>}
  </div>;
}
