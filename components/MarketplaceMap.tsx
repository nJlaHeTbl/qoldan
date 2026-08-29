'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';

export type MarketplaceMapMarker = {
  id: string;
  title: string;
  price: string;
  type: 'Продам' | 'Сдам' | 'Окажу услугу';
  latitude: number;
  longitude: number;
};

type Props = {
  markers: MarketplaceMapMarker[];
  fallbackCenter: { latitude: number; longitude: number };
  onSelect: (id: string) => void;
};

const markerColors: Record<MarketplaceMapMarker['type'], string> = {
  Продам: '#314b75',
  Сдам: '#d86a25',
  'Окажу услугу': '#0d6b45',
};

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      })[character] || character,
  );

export function MarketplaceMap({ markers, fallbackCenter, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    let cancelled = false;
    let currentMap: LeafletMap | null = null;

    void import('leaflet').then((L) => {
      if (cancelled || !containerRef.current) return;
      mapRef.current?.remove();
      const map = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
      });
      currentMap = map;
      mapRef.current = map;

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      const bounds = L.latLngBounds([]);
      for (const marker of markers) {
        const point = L.circleMarker([marker.latitude, marker.longitude], {
          radius: 10,
          weight: 3,
          color: '#ffffff',
          fillColor: markerColors[marker.type],
          fillOpacity: 1,
        }).addTo(map);
        point.bindTooltip(
          `<div><b>${escapeHtml(marker.title)}</b><span>${escapeHtml(marker.price)}</span></div>`,
          { direction: 'top', offset: [0, -9] },
        );
        point.on('click', () => onSelectRef.current(marker.id));
        bounds.extend([marker.latitude, marker.longitude]);
      }

      if (markers.length === 0) {
        map.setView([fallbackCenter.latitude, fallbackCenter.longitude], 5);
      } else if (markers.length === 1) {
        map.setView([markers[0].latitude, markers[0].longitude], 12);
      } else {
        map.fitBounds(bounds.pad(0.18), { maxZoom: 11 });
      }
    });

    return () => {
      cancelled = true;
      currentMap?.remove();
      if (mapRef.current === currentMap) mapRef.current = null;
    };
  }, [fallbackCenter.latitude, fallbackCenter.longitude, markers]);

  return (
    <div className="real-map-shell">
      <div
        ref={containerRef}
        className="real-map"
        aria-label="Карта объявлений"
      />
      <div className="map-legend" aria-label="Легенда карты">
        <span className="sale">Продам</span>
        <span className="rent">Сдам</span>
        <span className="service">Услуга</span>
      </div>
      <small className="map-hint">
        Нажмите на точку, чтобы открыть объявление
      </small>
    </div>
  );
}
