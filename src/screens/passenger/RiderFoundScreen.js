import React, { useEffect, useRef, useState } from 'react';
import { View, Linking, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RideMap from '../../components/RideMap';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import ConfirmDialog from '../../components/ConfirmDialog';
import RouteSummary from '../../components/RouteSummary';
import { Avatar } from '../../components/misc';
import { useBooking } from '../../context/BookingContext';
import { images, RIDER_DRIVER } from '../../data/mock';
import { colors, radius, shadow } from '../../theme';

export default function RiderFoundScreen({ navigation }) {
  const { pickup, destination, legRoute, riderLocation, progress, etaMinutes, cancelRide } = useBooking();
  const [confirm, setConfirm] = useState(false);
  const arrived = progress >= 1;
  const notified = useRef(false);
  useEffect(() => { if (arrived) notified.current = true; }, [arrived]);

  return (
    <View style={styles.flex}>
      <RideMap style={{ flex: 1 }} pickup={pickup.coords} riderLocation={riderLocation} path={legRoute?.path} />
      <View style={[styles.banner, shadow.strong]}>
        <Ionicons name="checkmark-circle" size={18} color={colors.yellow} />
        <AppText variant="label" color={colors.white} style={{ marginLeft: 8, fontSize: 10 }}>RIDER FOUND & ARRIVING</AppText>
      </View>
      <ScrollView style={styles.sheet} contentContainerStyle={{ padding: 20, paddingBottom: 26 }} bounces={false}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="h1">{arrived ? 'Rider has arrived' : `${etaMinutes} min${etaMinutes === 1 ? '' : 's'} away`}</AppText>
            <AppText variant="small" style={{ fontSize: 13 }}>{arrived ? 'Meet your rider at the pickup point' : 'Your rider is on the way'}</AppText>
          </View>
          <View style={styles.clock}><Ionicons name="time" size={22} color={colors.yellow} /></View>
        </View>
        <View style={styles.riderCard}>
          <Avatar source={images.hans} size={56} verified />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <AppText variant="h3">{RIDER_DRIVER.name}</AppText>
            <AppText variant="small"><Ionicons name="star" size={12} color={colors.yellow} /> {RIDER_DRIVER.rating} ({RIDER_DRIVER.rides} rides)</AppText>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <AppText variant="label" style={{ fontSize: 8 }}>VEHICLE</AppText>
            <AppText variant="bodyBold">{RIDER_DRIVER.vehicle}</AppText>
            <AppText variant="small" weight="bold" color={colors.yellowDark}>{RIDER_DRIVER.plate}</AppText>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
          <Button title="Call" icon="call" style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${RIDER_DRIVER.phone}`)} />
          <Button title="Message" icon="chatbubble" variant="accent" style={{ flex: 1 }} onPress={() => Linking.openURL(`sms:${RIDER_DRIVER.phone}`)} />
        </View>
        <View style={{ marginTop: 18 }}><RouteSummary pickup={pickup.name} destination={destination.name} /></View>
        <Button title="Track Rider" variant="accent" icon="locate" upper onPress={() => navigation.navigate('EnRoute')} style={{ marginTop: 18 }} />
        <Button title="Cancel Booking" variant="ghost" icon="close" upper onPress={() => setConfirm(true)} style={{ marginTop: 4 }} />
      </ScrollView>
      <ConfirmDialog visible={confirm} title="Cancel this booking?" message="Your rider is already on the way. A cancellation may affect your rating." confirmText="Cancel booking" destructive onCancel={() => setConfirm(false)} onConfirm={() => { setConfirm(false); cancelRide(); navigation.popToTop(); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  banner: { position: 'absolute', top: 54, left: 16, right: 16, backgroundColor: colors.black, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 3, borderBottomColor: colors.yellow },
  sheet: { maxHeight: '62%', backgroundColor: colors.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, marginTop: -28 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  clock: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' },
  riderCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.gray50, borderRadius: radius.lg, padding: 14, marginTop: 16 },
});
