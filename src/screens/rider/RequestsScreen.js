import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, Linking } from 'react-native';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import Screen from '../../components/Screen';
import { Avatar, EmptyState } from '../../components/misc';
import { useRider, REQUEST_SECONDS } from '../../context/RiderContext';
import { images } from '../../data/mock';
import { peso, km } from '../../utils/format';
import { colors, radius } from '../../theme';

const openMapsRoute = (a, b) => Linking.openURL(`https://www.google.com/maps/dir/?api=1&origin=${a.latitude},${a.longitude}&destination=${b.latitude},${b.longitude}&travelmode=driving`);

export default function RequestsScreen({ navigation }) {
  const { online, request, trip, accept, decline } = useRider();
  const [seconds, setSeconds] = useState(REQUEST_SECONDS);

  // Countdown restarts for every new request and declines it automatically at 0.
  useEffect(() => {
    if (!request) return undefined;
    setSeconds(REQUEST_SECONDS);
    const t = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) { clearInterval(t); decline(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [request?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (trip) {
    return (
      <Screen>
        <EmptyState icon="car" title="You have an active trip" message="Continue to manage the pickup or the ride in progress." />
        <View style={{ paddingHorizontal: 24 }}><Button title="Continue trip" variant="accent" onPress={() => navigation.navigate('Pickup')} /></View>
      </Screen>
    );
  }
  if (!request || !online) {
    return (
      <Screen>
        <EmptyState icon="file-tray-outline" title={online ? 'No requests right now' : 'You are offline'} message={online ? 'New booking requests will show up here.' : 'Go online from the dashboard to receive bookings.'} />
      </Screen>
    );
  }

  const onAccept = async () => {
    try {
      await accept();
      navigation.navigate('Pickup');
    } catch (error) {
      // The request can be claimed by another rider between refresh and tap.
      decline();
    }
  };
  return (
    <Screen bg={colors.black} dark>
      <Image source={images.bunawanDark} style={[StyleSheet.absoluteFill, { opacity: 0.35 }]} resizeMode="cover" />
      <View style={styles.body}>
        <View style={styles.ring}><AppText variant="h1" color={colors.white} style={{ fontSize: 26, lineHeight: 28 }}>{seconds}</AppText><AppText variant="label" color={colors.gray300} style={{ fontSize: 7 }}>SECONDS</AppText></View>
        <AppText variant="h2" color={colors.white} style={{ fontStyle: 'italic', marginTop: 14, textTransform: 'uppercase' }}>New ride request</AppText>
        <AppText variant="small" color={colors.gray300}>Incoming booking nearby</AppText>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Avatar source={images.adrian} size={52} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <AppText variant="h3">{request.passenger.name}</AppText>
              <AppText variant="label" style={{ fontSize: 8 }}>✓ VERIFIED PASSENGER · ★ {request.passenger.rating}</AppText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <AppText variant="label" style={{ fontSize: 8 }}>EARNINGS</AppText>
              <AppText variant="h2">{peso(request.fare.riderShare)}</AppText>
            </View>
          </View>
          <View style={{ marginTop: 14 }}>
            <AppText variant="label" style={{ fontSize: 8 }}>PICKUP ({request.pickupAwayKm} KM AWAY)</AppText>
            <AppText variant="bodyBold">● {request.pickup.name}</AppText>
            <AppText variant="label" style={{ fontSize: 8, marginTop: 8 }}>DESTINATION ({km(request.route.distanceKm)} TRIP)</AppText>
            <AppText variant="bodyBold">■ {request.destination.name}</AppText>
          </View>
          <View style={styles.cardFoot}>
            <AppText variant="label" color={colors.yellowDark} style={{ fontSize: 9 }} onPress={() => openMapsRoute(request.pickup.coords, request.destination.coords)}>▮ VIEW ROUTE ON MAP</AppText>
            <View><AppText variant="label" style={{ fontSize: 7 }}>PAYMENT</AppText><AppText variant="bodyBold" style={{ fontSize: 11 }}>{request.payment}</AppText></View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
          <View style={styles.stat}><AppText variant="label" color={colors.yellow} style={{ fontSize: 8 }}>TOTAL DISTANCE</AppText><AppText variant="h2" color={colors.white}>{request.route.distanceKm.toFixed(1)} <AppText variant="small" color={colors.gray300}>km</AppText></AppText></View>
          <View style={styles.stat}><AppText variant="label" color={colors.yellow} style={{ fontSize: 8 }}>EST. DURATION</AppText><AppText variant="h2" color={colors.white}>{Math.max(1, Math.round(request.route.durationMin))} <AppText variant="small" color={colors.gray300}>min</AppText></AppText></View>
        </View>
        <Button title="Accept Request" variant="accent" icon="flash" upper onPress={onAccept} style={{ marginTop: 16, alignSelf: 'stretch' }} />
        <Button title="Decline Request" variant="ghost" icon="close" upper onPress={decline} />
        <AppText variant="label" color={colors.gray500} style={{ fontSize: 8, marginTop: 4 }}>DRIVE SAFELY • RIDEON BUNAWAN</AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', padding: 22, justifyContent: 'center' },
  ring: { width: 74, height: 74, borderRadius: 37, borderWidth: 4, borderColor: colors.yellow, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.white, borderRadius: radius.xl, padding: 16, marginTop: 18, alignSelf: 'stretch' },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.gray100, marginTop: 12, paddingTop: 12 },
  stat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.md, padding: 14 },
});
