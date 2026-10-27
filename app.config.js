// Expo configuration. Secrets come from environment variables (see .env.example).
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

module.exports = {
  expo: {
    name: 'RideOn',
    slug: 'rideon',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    scheme: 'rideon',
    splash: { image: './assets/splash.png', resizeMode: 'contain', backgroundColor: '#FBB207' },
    android: {
      package: 'com.rideon.bunawan',
      versionCode: 1,
      adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#FBB207' },
      permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'CAMERA'],
      // Native Google Maps SDK key (used by production / EAS builds).
      config: { googleMaps: { apiKey: GOOGLE_MAPS_API_KEY } },
    },
    ios: { supportsTablet: false, bundleIdentifier: 'com.rideon.bunawan' },
    plugins: [
      [
        'expo-location',
        { locationWhenInUsePermission: 'RideOn uses your location to set your pickup point and show nearby riders.' },
      ],
      ['expo-image-picker', { photosPermission: 'RideOn needs photo access so riders can upload documents.' }],
    ],
  },
};
