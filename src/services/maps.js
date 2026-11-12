import { decodePolyline, haversineKm } from '../utils/geo';
import { BUNAWAN_CENTER, PLACES, toPlace } from '../data/places';

const KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
export const hasMapsKey = () => KEY.length > 0;

const withTimeout = (promise, ms = 10000) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms))]);

// Straight-line fallback so the app keeps working without a key or without internet.
const fallbackRoute = (origin, destination) => {
  const distanceKm = haversineKm(origin, destination) * 1.2; // rough road factor
  return {
    path: [origin, destination],
    distanceKm,
    durationMin: Math.max(1, (distanceKm / 25) * 60),
    source: 'fallback',
  };
};

// Google Routes API (computeRoutes). Enable "Routes API" in Google Cloud.
export const getRoute = async (origin, destination) => {
  if (!hasMapsKey()) return fallbackRoute(origin, destination);
  try {
    const res = await withTimeout(
      fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': KEY,
          'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
        },
        body: JSON.stringify({
          origin: { location: { latLng: origin } },
          destination: { location: { latLng: destination } },
          travelMode: 'DRIVE',
        }),
      })
    );
    if (!res.ok) throw new Error(`Routes API ${res.status}`);
    const data = await res.json();
    const route = data.routes && data.routes[0];
    if (!route) throw new Error('No route found');
    return {
      path: decodePolyline(route.polyline.encodedPolyline),
      distanceKm: route.distanceMeters / 1000,
      durationMin: parseInt(route.duration, 10) / 60,
      source: 'google',
    };
  } catch (e) {
    return fallbackRoute(origin, destination);
  }
};

const localSearch = (query) => {
  const q = query.trim().toLowerCase();
  return PLACES.filter((p) => !q || p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q)).map(toPlace);
};

// Google Places API (New) autocomplete biased to Bunawan. Your saved Bunawan places are always searched too,
// and the result says WHERE the answers came from, so the screen can explain a failure instead of hiding it:
//   { results, source: 'google' | 'local', error: null | 'NO_KEY' | 'a readable message' }
const readError = async (res) => {
  try {
    const body = await res.json();
    const msg = body && body.error && body.error.message;
    return `${res.status}${msg ? ` - ${msg}` : ''}`;
  } catch (e) {
    return String(res.status);
  }
};

export const searchPlaces = async (query) => {
  const q = query.trim();
  const local = localSearch(q);
  if (!q) return { results: local, source: 'local', error: null };
  if (!hasMapsKey()) return { results: local, source: 'local', error: 'NO_KEY' };
  try {
    const res = await withTimeout(
      fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY },
        body: JSON.stringify({
          input: q,
          includedRegionCodes: ['ph'],
          // Google's field is "radius" (0 - 50000 metres), not "radiusMeters".
          locationBias: { circle: { center: BUNAWAN_CENTER, radius: 30000 } },
        }),
      })
    );
    if (!res.ok) throw new Error(await readError(res));
    const data = await res.json();
    const google = (data.suggestions || [])
      .filter((x) => x.placePrediction)
      .map((x) => ({
        id: x.placePrediction.placeId,
        name: x.placePrediction.structuredFormat?.mainText?.text || x.placePrediction.text?.text || 'Place',
        address: x.placePrediction.structuredFormat?.secondaryText?.text || '',
        coords: null, // resolved later by getPlaceCoords
      }));
    // saved places first, then Google's, without duplicates
    const seen = new Set(local.map((l) => l.name.toLowerCase()));
    return { results: [...local, ...google.filter((g) => !seen.has(g.name.toLowerCase()))], source: 'google', error: null };
  } catch (e) {
    return { results: local, source: 'local', error: e.message };
  }
};

export const getPlaceCoords = async (place) => {
  if (place.coords) return place.coords;
  const res = await withTimeout(
    fetch(`https://places.googleapis.com/v1/places/${place.id}`, {
      headers: { 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': 'location' },
    })
  );
  if (!res.ok) throw new Error(`Could not load place (${await readError(res)})`);
  const data = await res.json();
  return { latitude: data.location.latitude, longitude: data.location.longitude };
};