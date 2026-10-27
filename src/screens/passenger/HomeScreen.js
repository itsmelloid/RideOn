import React, { useCallback, useEffect, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RideMap from '../../components/RideMap';
import AppText from '../../components/AppText';
import { useBooking } from '../../context/BookingContext';
import { getCurrentCoords } from '../../services/location';
import { haversineKm } from '../../utils/geo';
import { BUNAWAN_CENTER, SERVICE_RADIUS_KM } from '../../data/places';
import { colors, radius, shadow } from '../../theme';

export default function HomeScreen({ navigation }) {
  const { pickup, setPickup, hasUnread } = useBooking();
  const insets = useSafeAreaInsets();
  const [userLoc, setUserLoc] = useState(null);
  const [note, setNote] = useState('');

  const locate = useCallback(async () => {
    const c = await getCurrentCoords();
    if (!c) return setNote('Location permission is off. Using the default pickup point.');
    if (haversineKm(c, BUNAWAN_CENTER) > SERVICE_RADIUS_KM) return setNote('You are outside the Bunawan service area. Using the default pickup point.');
    setNote('');
    setUserLoc(c);
    setPickup({ id: 'gps', name: 'My Location', address: 'Current location', coords: c });
  }, [setPickup]);

  useEffect(() => { locate(); }, [locate]);

  return (
    <View style={styles.flex}>
      <RideMap style={styles.flex} pickup={pickup.coords} userLocation={userLoc} />
      <View style={[styles.card, { top: insets.top + 10 }, shadow.strong]}>
        <View style={styles.cardTop}>
          <Ionicons name="menu" size={22} color={colors.black} />
          <AppText variant="label" style={{ fontSize: 9 }}>RIDEON BUNAWAN</AppText>
          <Pressable onPress={() => navigation.navigate('Notifications')} accessibilityLabel="Notifications" hitSlop={10}>
            <Ionicons name="notifications" size={20} color={colors.black} />
            {hasUnread ? <View style={styles.dot} /> : null}
          </Pressable>
        </View>
        <View style={styles.row}>
          <View style={styles.ring} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <AppText variant="label" style={{ fontSize: 8, color: colors.yellowDark }}>PICKUP LOCATION</AppText>
            <AppText variant="bodyBold">{pickup.name}</AppText>
          </View>
        </View>
        <Pressable style={styles.row} onPress={() => navigation.navigate('Destination')} accessibilityRole="button" accessibilityLabel="Where to?">
          <View style={styles.square} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <AppText variant="label" style={{ fontSize: 8 }}>WHERE TO?</AppText>
            <AppText variant="body" color={colors.gray400}>Enter destination</AppText>
          </View>
          <Ionicons name="heart" size={16} color={colors.yellow} />
        </Pressable>
        {note ? <AppText variant="small" color={colors.red} style={{ marginTop: 6, fontSize: 11 }}>{note}</AppText> : null}
      </View>
      <Pressable style={[styles.locate, shadow.card]} onPress={locate} accessibilityLabel="Use my location">
        <Ionicons name="locate" size={20} color={colors.black} />
      </Pressable>
      <Pressable style={[styles.cta, shadow.strong]} onPress={() => navigation.navigate('Destination')} accessibilityRole="button" accessibilityLabel="Find a ride">
        <View>
          <AppText variant="label" color={colors.gray400} style={{ fontSize: 8 }}>READY TO GO?</AppText>
          <AppText variant="bodyBold" color={colors.white}>Find a Ride</AppText>
        </View>
        <View style={styles.ctaIcon}><Ionicons name="arrow-forward" size={18} color={colors.black} /></View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { position: 'absolute', left: 16, right: 16, backgroundColor: colors.white, borderRadius: radius.lg, padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  ring: { width: 14, height: 14, borderRadius: 7, borderWidth: 3, borderColor: colors.yellow },
  square: { width: 14, height: 14, backgroundColor: colors.black, borderRadius: 2 },
  dot: { position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.red },
  locate: { position: 'absolute', right: 16, bottom: 100, width: 42, height: 42, borderRadius: 21, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  cta: { position: 'absolute', left: 16, right: 16, bottom: 22, backgroundColor: colors.black, borderRadius: radius.lg, paddingVertical: 12, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ctaIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center' },
});
