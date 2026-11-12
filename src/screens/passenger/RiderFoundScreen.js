import React, { useEffect, useState } from 'react';
import { View, Linking, ScrollView, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RideMap from '../../components/RideMap';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import ConfirmDialog from '../../components/ConfirmDialog';
import RouteSummary from '../../components/RouteSummary';
import { Avatar, userAvatarSource } from '../../components/misc';
import { useBooking } from '../../context/BookingContext';
import { images } from '../../data/mock';
import { colors, radius, shadow } from '../../theme';

export default function RiderFoundScreen({ navigation }) {
  const { pickup, destination, legRoute, riderLocation, arrived, etaMinutes, driver, status, cancelRide } = useBooking();
  const [confirm, setConfirm] = useState(false);

  // The server decides what happens next; this screen just follows the trip status.
  useEffect(() => {
    if (status === 'inTrip') navigation.replace('EnRoute');
    else if (status === 'searching') navigation.replace('Searching');
    else if (status === 'noRider') navigation.replace('NoRiders');
    else if (status === 'completed') navigation.replace('TripCompleted');
    else if (status === 'idle') navigation.popToTop();
  }, [status, navigation]);

  const stop = async () => {
    try {
      await cancelRide();
      setConfirm(false);
      navigation.popToTop();
    } catch (e) {
      setConfirm(false);
      Alert.alert('Could not cancel', e.message);
    }
  };

  if (!driver) return null;
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
            <AppText variant="h1">{arrived ? 'Rider has arrived' : etaMinutes ? `${etaMinutes} min${etaMinutes === 1 ? '' : 's'} away` : 'On the way'}</AppText>
            <AppText variant="small" style={{ fontSize: 13 }}>{arrived ? 'Meet your rider at the pickup point' : 'Your rider is on the way'}</AppText>
          </View>
          <View style={styles.clock}><Ionicons name="time" size={22} color={colors.yellow} /></View>
        </View>
        <View style={styles.riderCard}>
          <Avatar source={userAvatarSource({ name: driver.name }, images)} name={driver.name} size={56} verified />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <AppText variant="h3">{driver.name}</AppText>
            <AppText variant="small"><Ionicons name="star" size={12} color={colors.yellow} /> {driver.rating.toFixed(1)}</AppText>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <AppText variant="label" style={{ fontSize: 8 }}>VEHICLE</AppText>
            <AppText variant="bodyBold">{driver.vehicle}</AppText>
            <AppText variant="small" weight="bold" color={colors.yellowDark}>{driver.plate}</AppText>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
          <Button title="Call" icon="call" style={{ flex: 1 }} onPress={() => driver.phone && Linking.openURL(`tel:${driver.phone}`)} />
          <Button title="Message" icon="chatbubble" variant="accent" style={{ flex: 1 }} onPress={() => driver.phone && Linking.openURL(`sms:${driver.phone}`)} />
        </View>
        <View style={{ marginTop: 18 }}><RouteSummary pickup={pickup.name} destination={destination.name} /></View>
        <Button title="Track Rider" variant="accent" icon="locate" upper onPress={() => navigation.navigate('EnRoute')} style={{ marginTop: 18 }} />
        <Button title="Cancel Booking" variant="ghost" icon="close" upper onPress={() => setConfirm(true)} style={{ marginTop: 4 }} />
      </ScrollView>
      <ConfirmDialog visible={confirm} title="Cancel this booking?" message="Your rider is already on the way. A cancellation may affect your rating." confirmText="Cancel booking" destructive onCancel={() => setConfirm(false)} onConfirm={stop} />
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
