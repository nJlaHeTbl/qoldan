'use client';
import 'leaflet/dist/leaflet.css';
import {useEffect,useRef} from 'react';
import type {Map as LeafletMap,Marker} from 'leaflet';
import type {Coordinates} from '@/lib/geo';
export function MapEditPoint({point,onChange}:{point:Coordinates;onChange:(point:Coordinates)=>void}) {
  const element=useRef<HTMLDivElement>(null), mapRef=useRef<LeafletMap|null>(null),markerRef=useRef<Marker|null>(null),callback=useRef(onChange);
  callback.current=onChange;
  const latestPoint=useRef(point);latestPoint.current=point;
  useEffect(()=>{
    let cancelled=false,map:LeafletMap|undefined;
    void import('leaflet').then(L=>{
      if(cancelled || !element.current) return;
      map=L.map(element.current,{scrollWheelZoom:false}).setView([point.latitude,point.longitude],12);mapRef.current=map;
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
      const marker=L.marker([point.latitude,point.longitude],{draggable:true,icon:L.divIcon({className:'map-edit-pin',html:'<span aria-hidden="true">●</span>',iconSize:[28,28],iconAnchor:[14,14]})}).addTo(map);markerRef.current=marker;
      const update=(lat:number,lng:number)=>{
        if(lat<40 || lat>56 || lng<45 || lng>88) {marker.setLatLng([latestPoint.current.latitude,latestPoint.current.longitude]);return;}
        marker.setLatLng([lat,lng]);callback.current({latitude:Number(lat.toFixed(6)),longitude:Number(lng.toFixed(6))});
      };
      map.on('click',e=>update(e.latlng.lat,e.latlng.lng));
      marker.on('dragend',()=>{const p=marker.getLatLng();update(p.lat,p.lng);});
    });
    return()=>{cancelled=true;map?.remove();mapRef.current=null;markerRef.current=null;};
  },[]);
  useEffect(()=>{markerRef.current?.setLatLng([point.latitude,point.longitude]);mapRef.current?.panTo([point.latitude,point.longitude]);},[point.latitude,point.longitude]);
  return <div ref={element} className="location-point-map" aria-label="Нажмите на карту или перетащите маркер для изменения точки"/>;
}
