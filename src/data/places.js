// NOTE: Agusan del Sur State University uses its published coordinates. The other coordinates are
// approximate starting points for the Bunawan area - replace them with exact values (or rely on
// Google Places search) before launch.
export const BUNAWAN_CENTER = { latitude: 8.1781, longitude: 125.9935 };
// Bookings are only offered inside this radius (km) around Bunawan.
export const SERVICE_RADIUS_KM = 30;

export const PLACES = [
  { id: 'assu', name: 'Agusan del Sur State University', address: 'Bunawan, Agusan del Sur', latitude: 8.16928, longitude: 126.00455 },
  { id: 'market', name: 'Bunawan Public Market', address: 'Poblacion, Bunawan', latitude: 8.1752, longitude: 125.9902 },
  { id: 'health', name: 'Bunawan Health Center', address: 'Poblacion, Bunawan', latitude: 8.1768, longitude: 125.9917 },
  { id: 'stm', name: 'San Teodoro, Public Market', address: 'San Teodoro, Bunawan', latitude: 8.1581, longitude: 125.9955 },
  { id: 'plaza', name: 'Poblacion Plaza', address: 'Poblacion, Bunawan', latitude: 8.1775, longitude: 125.9928 },
  { id: 'school', name: 'Bunawan Elementary School', address: 'Poblacion, Bunawan', latitude: 8.1741, longitude: 125.9951 },
];

export const toCoord = (p) => ({ latitude: p.latitude, longitude: p.longitude });
export const toPlace = (p) => ({ id: p.id, name: p.name, address: p.address, coords: toCoord(p) });
