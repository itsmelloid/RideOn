import React, { useEffect, useState } from 'react';
import { View, Linking, Share, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RideMap from '../../components/RideMap';
import AppText from '../../components/AppText';
import { Avatar, userAvatarSource } from '../../components/misc';
import { useBooking } from '../../context/BookingContext';
import { images } from '../../data/mock';
import { km } from '../../utils/format';
import { colors, radius, shadow } from '../../theme';

export default function EnRouteScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { pickup, destination, leg, legRoute, riderLocation, arrived, etaMinutes, remainingKm, tripId, driver, status } = useBooking();
  const [expanded, setExpanded] = useState(false);
  const toPickup = leg === 'toPickup';

  // Follow the trip status from the server (the rider starts and completes the trip).
  useEffect(() => {
    if (status === 'completed') navigation.replace('TripCompleted');
    else if (status === 'searching') navigation.replace('Searching');
    else if (status === 'noRider') navigation.replace('NoRiders');
    else if (status === 'idle') navigation.popToTop();
  }, [status, navigation]);

  if (!driver || !leg) return null;
  const share = () =>
    Share.share({ message: `I'm on RideOn trip ${tripId}: ${pickup.name} → ${destination.name}. Rider: ${driver.name} (${driver.plate}).` }).catch(() => {});
  const target = toPickup ? pickup.name : destination.name;
  const waiting = toPickup && arrived;

  return (
    <View style={styles.flex}>
      <RideMap style={{ flex: 1 }} pickup={pickup.coords} destination={toPickup ? undefined : destination.coords} riderLocation={riderLocation} path={legRoute?.path} />
      <View style={[styles.status, { top: insets.top + 10 }, shadow.strong]}>
        <View style={styles.statusIcon}><Ionicons name="navigate" size={18} color={colors.black} /></View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <AppText variant="label" color={colors.yellow} style={{ fontSize: 8 }}>STATUS</AppText>
          <AppText variant="bodyBold" color={colors.white} numberOfLines={1}>{waiting ? 'Rider has arrived' : toPickup ? `Rider arriving at ${target}` : `En Route to ${target}`}</AppText>
        </View>
        <Pressable onPress={() => navigation.canGoBack() && navigation.goBack()} hitSlop={10} accessibilityLabel="Back"><Ionicons name="contract" size={20} color={colors.white} /></Pressable>
      </View>
      <ScrollView style={styles.sheet} contentContainerStyle={{ padding: 20, paddingBottom: 26 }} bounces={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <AppText variant="label" color={colors.green} style={{ fontSize: 9 }}>● {waiting ? 'WAITING FOR YOU' : 'ON THE MOVE'}</AppText>
            <AppText variant="h1" style={{ fontSize: 30 }}>{etaMinutes == null ? '—' : etaMinutes} min{etaMinutes === 1 ? '' : 's'} <AppText variant="small" style={{ fontSize: 15 }}>left</AppText></AppText>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <AppText variant="label" style={{ fontSize: 8 }}>DISTANCE</AppText>
            <AppText variant="h2">{km(remainingKm)}</AppText>
          </View>
        </View>
        {waiting ? <AppText variant="small" style={{ marginTop: 8 }}>Board your rider. The trip starts when the rider taps "Start Trip".</AppText> : null}
        <View style={styles.rider}>
          <Avatar source={userAvatarSource({ name: driver.name }, images)} name={driver.name} size={48} verified />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <AppText variant="bodyBold" style={{ fontSize: 15 }}>{driver.name}</AppText>
            <AppText variant="small">{driver.vehicle} · {driver.plate}</AppText>
          </View>
          <Pressable style={[styles.round, { backgroundColor: colors.black }]} onPress={() => driver.phone && Linking.openURL(`tel:${driver.phone}`)} accessibilityLabel="Call rider"><Ionicons name="call" size={18} color={colors.yellow} /></Pressable>
          <Pressable style={[styles.round, { backgroundColor: colors.yellow, marginLeft: 8 }]} onPress={() => driver.phone && Linking.openURL(`sms:${driver.phone}`)} accessibilityLabel="Message rider"><Ionicons name="chatbubble" size={18} color={colors.black} /></Pressable>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
          <Pressable style={[styles.action, { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200 }]} onPress={share}>
            <Ionicons name="share-social" size={20} color={colors.yellow} /><AppText variant="label" color={colors.black} style={{ marginTop: 4 }}>SHARE TRIP</AppText>
          </Pressable>
          <Pressable style={[styles.action, { backgroundColor: colors.black }]} onPress={() => navigation.navigate('Safety')}>
            <Ionicons name="alert-circle" size={20} color={colors.yellow} /><AppText variant="label" color={colors.yellow} style={{ marginTop: 4 }}>SOS / EMERGENCY</AppText>
          </Pressable>
        </View>
        <Pressable onPress={() => setExpanded((e) => !e)} style={{ alignItems: 'center', marginTop: 14 }}>
          <AppText variant="label" color={colors.gray600} style={{ fontSize: 11 }}>VIEW TRIP DETAILS {expanded ? '⌃' : '›'}</AppText>
        </Pressable>
        {expanded ? (
          <View style={{ marginTop: 8 }}>
            <AppText variant="small">Trip {tripId}</AppText>
            <AppText variant="small">From: {pickup.name}</AppText>
            <AppText variant="small">To: {destination.name}</AppText>
          </View>
        ) : null}
        <Pressable style={styles.safety} onPress={() => navigation.navigate('Safety')}>
          <Ionicons name="shield-checkmark" size={18} color={colors.gray600} /><AppText variant="bodyBold" style={{ marginLeft: 8 }}>Safety Center & Help</AppText>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  status: { position: 'absolute', left: 16, right: 16, backgroundColor: colors.black, borderRadius: radius.md, padding: 12, flexDirection: 'row', alignItems: 'center' },
  statusIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center' },
  sheet: { maxHeight: '58%', backgroundColor: colors.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, marginTop: -28 },
  rider: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.gray50, borderRadius: radius.lg, padding: 12, marginTop: 14 },
  round: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  action: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: radius.lg },
  safety: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gray100, borderRadius: radius.md, paddingVertical: 14, marginTop: 14 },
});
