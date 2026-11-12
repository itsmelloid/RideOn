import * as Location from 'expo-location';

// Returns the device position, or null when permission is denied / unavailable.
export const getCurrentCoords = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch (e) {
    return null;
  }
};
