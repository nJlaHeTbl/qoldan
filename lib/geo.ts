export type Coordinates = {
  latitude: number;
  longitude: number;
};

const KAZAKHSTAN_CENTER: Coordinates = {
  latitude: 48.0196,
  longitude: 66.9237,
};

const regionCenters: Record<string, Coordinates> = {
  'Весь Казахстан': KAZAKHSTAN_CENTER,
  Астана: { latitude: 51.1694, longitude: 71.4491 },
  Алматы: { latitude: 43.2389, longitude: 76.8897 },
  Шымкент: { latitude: 42.3417, longitude: 69.5901 },
  'Область Абай': { latitude: 50.4111, longitude: 80.2275 },
  'Акмолинская область': { latitude: 52.0, longitude: 69.0 },
  'Актюбинская область': { latitude: 48.0, longitude: 58.8 },
  'Алматинская область': { latitude: 44.9, longitude: 78.2 },
  'Атырауская область': { latitude: 47.1, longitude: 51.9 },
  'Восточно-Казахстанская область': { latitude: 49.95, longitude: 82.6 },
  'Жамбылская область': { latitude: 43.9, longitude: 71.4 },
  'Область Жетісу': { latitude: 45.0, longitude: 78.4 },
  'Западно-Казахстанская область': { latitude: 50.1, longitude: 51.2 },
  'Карагандинская область': { latitude: 48.2, longitude: 72.8 },
  'Костанайская область': { latitude: 52.1, longitude: 63.5 },
  'Кызылординская область': { latitude: 45.1, longitude: 64.5 },
  'Мангистауская область': { latitude: 44.0, longitude: 52.0 },
  'Павлодарская область': { latitude: 52.3, longitude: 76.9 },
  'Северо-Казахстанская область': { latitude: 54.9, longitude: 69.2 },
  'Туркестанская область': { latitude: 43.2, longitude: 68.3 },
  'Область Ұлытау': { latitude: 48.0, longitude: 66.0 },
};

const placeCenters: Record<string, Coordinates> = {
  талдыкорган: { latitude: 45.0177, longitude: 78.3738 },
  текели: { latitude: 44.8308, longitude: 78.8239 },
  еркин: { latitude: 45.057, longitude: 78.315 },
  уштобе: { latitude: 45.253, longitude: 77.98 },
  алматы: regionCenters.Алматы,
  астана: regionCenters.Астана,
  шымкент: regionCenters.Шымкент,
  костанай: { latitude: 53.2144, longitude: 63.6246 },
  кокшетау: { latitude: 53.2833, longitude: 69.3833 },
  семей: { latitude: 50.4111, longitude: 80.2275 },
  тараз: { latitude: 42.9, longitude: 71.3667 },
  актобе: { latitude: 50.2839, longitude: 57.1669 },
  атырау: { latitude: 47.0945, longitude: 51.9238 },
};

const hashOffset = (value: string, axis: number) => {
  let hash = axis === 0 ? 17 : 31;
  for (const character of value) {
    hash = (hash * 33 + character.charCodeAt(0)) % 10_000;
  }
  return (hash / 10_000 - 0.5) * (axis === 0 ? 0.36 : 0.52);
};

export function getRegionCenter(region?: string): Coordinates {
  return (region && regionCenters[region]) || KAZAKHSTAN_CENTER;
}

export function resolveCoordinates(item: {
  id: number | string;
  location: string;
  region?: string;
  latitude?: number;
  longitude?: number;
}): Coordinates {
  if (
    typeof item.latitude === 'number' &&
    Number.isFinite(item.latitude) &&
    typeof item.longitude === 'number' &&
    Number.isFinite(item.longitude)
  ) {
    return { latitude: item.latitude, longitude: item.longitude };
  }

  const normalized = item.location.toLocaleLowerCase('ru-RU');
  const place = Object.entries(placeCenters).find(([name]) =>
    normalized.includes(name),
  )?.[1];
  const base = place || getRegionCenter(item.region);
  const key = String(item.id);
  return {
    latitude: base.latitude + hashOffset(key, 0),
    longitude: base.longitude + hashOffset(key, 1),
  };
}
