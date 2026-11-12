// Static assets and simulation data. Real user data now comes from Supabase.
export const images = {
  logo: require('../../assets/images/logo.png'),
  hans: require('../../assets/images/avatar-hans.jpg'),
  adrian: require('../../assets/images/avatar-adrian.jpg'),
  bannerAdventure: require('../../assets/images/banner-adventure.jpg'),
  bannerOffers: require('../../assets/images/banner-offers.jpg'),
  tricycle: require('../../assets/images/tricycle.jpg'),
  bunawanDark: require('../../assets/images/bunawan-dark.jpg'),
};

// The simulated rider shown to passengers until realtime matching is added.
export const RIDER_DRIVER = { name: 'Hans Braga', rating: 4.9, rides: '120+', vehicle: 'Red R.E', plate: 'ABC 123', plateFull: 'TRI-4821', phone: '09123456780' };

// Simulated incoming booking for the rider app until realtime matching is added.
export const MOCK_REQUEST = {
  passenger: { name: 'Adrian Dusal', rating: 4.9, trips: 240 },
  pickupId: 'stm',
  destinationId: 'assu',
  pickupAwayKm: 0.8,
};
