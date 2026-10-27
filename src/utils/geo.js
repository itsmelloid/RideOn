const toRad = (d) => (d * Math.PI) / 180;

// Great-circle distance in kilometres.
export const haversineKm = (a, b) => {
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

// Decodes a Google encoded polyline (precision 5).
export const decodePolyline = (encoded = '') => {
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
};

// Point at fraction t (0..1) along a polyline; used to animate the rider on the map.
export const pointAlong = (path, t) => {
  if (!path || path.length === 0) return null;
  if (path.length === 1 || t <= 0) return path[0];
  if (t >= 1) return path[path.length - 1];
  const idx = t * (path.length - 1);
  const i = Math.floor(idx);
  const f = idx - i;
  const a = path[i];
  const b = path[i + 1];
  return {
    latitude: a.latitude + (b.latitude - a.latitude) * f,
    longitude: a.longitude + (b.longitude - a.longitude) * f,
  };
};

export const regionForCoords = (coords, pad = 1.6) => {
  const lats = coords.map((c) => c.latitude);
  const lngs = coords.map((c) => c.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * pad, 0.01),
    longitudeDelta: Math.max((maxLng - minLng) * pad, 0.01),
  };
};
