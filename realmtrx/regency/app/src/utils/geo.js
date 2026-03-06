export function computeCentroid(properties) {
  const withCoords = properties.filter((p) => p.latitude != null && p.longitude != null);
  if (withCoords.length === 0) return null;
  const lat = withCoords.reduce((s, p) => s + p.latitude, 0) / withCoords.length;
  const lng = withCoords.reduce((s, p) => s + p.longitude, 0) / withCoords.length;
  return [lat, lng];
}

export function computeBounds(properties) {
  const withCoords = properties.filter((p) => p.latitude != null && p.longitude != null);
  if (withCoords.length === 0) return null;
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const p of withCoords) {
    if (p.latitude < minLat) minLat = p.latitude;
    if (p.latitude > maxLat) maxLat = p.latitude;
    if (p.longitude < minLng) minLng = p.longitude;
    if (p.longitude > maxLng) maxLng = p.longitude;
  }
  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}

export function hasCoords(p) {
  return p.latitude != null && p.longitude != null;
}
