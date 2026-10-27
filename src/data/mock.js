// Local mock data for the prototype. Replace with API calls when a backend exists.
export const images = {
  logo: require('../../assets/images/logo.png'),
  hans: require('../../assets/images/avatar-hans.jpg'),
  adrian: require('../../assets/images/avatar-adrian.jpg'),
  bannerAdventure: require('../../assets/images/banner-adventure.jpg'),
  bannerOffers: require('../../assets/images/banner-offers.jpg'),
  tricycle: require('../../assets/images/tricycle.jpg'),
  bunawanDark: require('../../assets/images/bunawan-dark.jpg'),
};

// Demo accounts (password: password123). Passwords here are for the offline prototype only.
export const DEMO_ACCOUNTS = [
  { id: 'p1', role: 'passenger', name: 'Adrian Dusal', phone: '09123456789', email: 'adrian@example.com', password: 'password123', rides: 124, rating: 4.9, since: 2026 },
  { id: 'r1', role: 'rider', name: 'Hans Braga', phone: '09123456780', email: 'hans@example.com', password: 'password123', riderId: 'RD-0042', plate: 'TRI-4821', status: 'approved' },
];

export const RIDER_DRIVER = { name: 'Hans Braga', rating: 4.9, rides: '120+', vehicle: 'Red R.E', plate: 'ABC 123', plateFull: 'TRI-4821', phone: '09123456780' };

export const PASSENGER_NOTIFICATIONS = [
  { id: 'n1', group: 'Today', icon: 'checkmark', title: 'Trip completed', body: 'You paid ₱35.00 for trip #RO-9821. Rate your rider!', time: '2 min ago', unread: true, type: 'Bookings' },
  { id: 'n2', group: 'Today', icon: 'location', title: 'Your rider has arrived', body: 'Kuya Mario R. is waiting at Bunawan Public Market · TRI-4821.', time: '14 min ago', unread: true, type: 'Bookings' },
  { id: 'n3', group: 'Today', icon: 'person', title: 'Booking accepted', body: 'Kuya Mario R. accepted your request and is on the way.', time: '22 min ago', unread: false, type: 'Bookings' },
  { id: 'n4', group: 'Earlier', icon: 'warning', title: 'Rider cancelled — finding another', body: "We're matching you with the next available rider.", time: 'Yesterday', unread: false, type: 'Updates' },
  { id: 'n5', group: 'Earlier', icon: 'megaphone', title: 'RideOn announcement', body: 'Scheduled maintenance tonight, 11 PM – 12 AM.', time: 'Yesterday', unread: false, type: 'Updates' },
  { id: 'n6', group: 'Earlier', icon: 'shield-checkmark', title: 'Report update', body: 'Your report #RP-0142 is now under review.', time: '2 days ago', unread: false, type: 'Updates' },
  { id: 'n7', group: 'Earlier', icon: 'wallet', title: 'Test wallet credit', body: 'A test top-up of ₱100.00 was recorded.', time: '3 days ago', unread: false, type: 'Payments' },
];

export const PASSENGER_TRANSACTIONS = [
  { id: 't1', title: 'Ride Payment', amount: -24, date: 'Oct 24, 2023 • 10:30 AM', status: 'Success', icon: 'car' },
  { id: 't2', title: 'Top Up Wallet', amount: 100, date: 'Oct 22, 2023 • 08:45 PM', status: 'Success', icon: 'wallet' },
  { id: 't3', title: 'Ride Payment', amount: -15.5, date: 'Oct 20, 2023 • 11:20 AM', status: 'Failed', icon: 'car' },
];

export const PASSENGER_BOOKINGS_SEED = [
  { id: '#RO-9821', status: 'Active', pickup: 'Agusan del Sur State University', destination: 'Bianos Pizza Shop, Bunawan, Agusan del Sur', when: 'Today, 10:30 AM', fare: 15, label: 'RIDE TO ADSSU' },
  { id: '#RO-9790', status: 'Completed', pickup: 'Bunawan Public Market', destination: 'Agusan del Sur State University', when: 'Yesterday • 06:15 PM', fare: 15, rider: 'Hans Braga', tag: 'Finished' },
];

export const RIDER_HISTORY = [
  { id: '#RO-9821', status: 'Completed', when: 'Oct 22 · 2:06 – 2:14 PM', from: 'Bunawan Public Market', to: 'Bunawan Elementary School', fare: 35, commission: 3.5, share: 31.5 },
  { id: '#RO-9820', status: 'Cancelled', when: 'Oct 22 · 11:40 AM', from: 'Poblacion Plaza', to: 'Bunawan Health Center', note: 'Passenger cancelled before pickup. No fee recorded.' },
  { id: '#RO-9819', status: 'Completed', when: 'Oct 21 · 5:22 – 5:35 PM', from: 'Bunawan Health Center', to: 'Poblacion Plaza', fare: 25, commission: 2.5, share: 22.5 },
  { id: '#RO-9818', status: 'Completed', when: 'Oct 21 · 3:10 – 3:28 PM', from: 'Bunawan Public Market', to: 'Bunawan Elementary School', fare: 40, commission: 4, share: 36 },
];

export const RIDER_EARNINGS = {
  Daily: { share: 157.5, rides: 5, fares: 175, commission: 17.5, pending: 7, paid: 10.5, disputed: 0 },
  Weekly: { share: 1247.4, rides: 42, fares: 1386, commission: 138.6, pending: 46.2, paid: 92.4, disputed: 0 },
  Monthly: { share: 4984.2, rides: 171, fares: 5538, commission: 553.8, pending: 46.2, paid: 507.6, disputed: 0 },
};

export const RIDER_EARNING_TRIPS = [
  { id: 'Trip #RO-9821', meta: 'Oct 22 · Fare ₱35.00', commission: 'Commission ₱3.50', amount: 31.5, state: 'Settled' },
  { id: 'Trip #RO-9820', meta: 'Oct 22 · Fare ₱50.00', commission: 'Commission ₱5.00', amount: 45, state: 'Pending' },
  { id: 'Trip #RO-9819', meta: 'Oct 21 · Fare ₱25.00', commission: 'Commission ₱2.50', amount: 22.5, state: 'Settled' },
  { id: 'Trip #RO-9818', meta: 'Oct 21 · Fare ₱40.00', commission: 'Commission ₱4.00', amount: 36, state: 'Pending' },
];

export const RIDER_DOCUMENTS = [
  { id: 'd1', title: 'Valid ID', sub: 'Submitted Oct 20', status: 'Approved' },
  { id: 'd2', title: "Driver's License", sub: 'Expires Mar 2028', status: 'Approved' },
  { id: 'd3', title: 'Tricycle Registration', sub: 'Submitted Oct 20', status: 'Pending' },
  { id: 'd4', title: 'Operating Permit', sub: 'Photo is blurry — please re-upload', status: 'Re-upload', warn: true },
];

export const MOCK_REQUEST = {
  passenger: { name: 'Adrian Dusal', rating: 4.9, trips: 240 },
  pickupId: 'stm',
  destinationId: 'assu',
  pickupAwayKm: 0.8,
};
