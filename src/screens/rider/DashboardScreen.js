import React from 'react';
import { View, ScrollView, Pressable, Switch, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../../components/AppText';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import RideMap from '../../components/RideMap';
import { Avatar, IconBox, SectionLabel, StatBox, userAvatarSource } from '../../components/misc';
import { useAuth } from '../../context/AuthContext';
import { useRider } from '../../context/RiderContext';
import { images } from '../../data/mock';
import { PLACES } from '../../data/places';
import { peso } from '../../utils/format';
import { colors, radius, shadow } from '../../theme';

export default function DashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { online, setOnline, todayEarnings, totalTrips, request, trip, accept, decline } = useRider();
  const center = PLACES.find((p) => p.id === 'stm');

  const acceptNow = async () => {
    try {
      await accept();
      navigation.navigate('Requests', { screen: 'Pickup' });
    } catch (error) {
      Alert.alert('Could not accept ride', error.message);
    }
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={{ paddingBottom: 30 }} bounces={false}>
      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Avatar source={userAvatarSource(user, images)} name={user?.name} size={42} online={online} />
          <View style={{ marginLeft: 10 }}>
            <AppText variant="label" style={{ fontSize: 8 }}>WELCOME BACK</AppText>
            <AppText variant="h3">{user?.name}</AppText>
          </View>
        </View>
        <Pressable style={styles.round} onPress={() => Alert.alert('Support', 'Email support@rideon.example for help.')} accessibilityLabel="Support"><Ionicons name="headset" size={18} /></Pressable>
        <Pressable style={[styles.round, { marginLeft: 8 }]} onPress={() => Alert.alert('Notifications', 'No new notifications.')} accessibilityLabel="Notifications"><Ionicons name="notifications" size={18} /><View style={styles.dot} /></Pressable>
      </View>
      <View style={styles.pad}>
        <View style={[styles.status, shadow.card, !online && { backgroundColor: colors.gray300 }]}>
          <IconBox icon="power" size={44} bg="rgba(255,255,255,0.4)" color={colors.black} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <AppText variant="label" color={colors.ink} style={{ fontSize: 8 }}>CURRENT STATUS</AppText>
            <AppText variant="h2" style={{ fontSize: 18, lineHeight: 22 }}>YOU ARE{'\n'}{online ? 'ONLINE' : 'OFFLINE'}</AppText>
          </View>
          <Switch value={online} onValueChange={async (v) => {
            if (trip && !v) return Alert.alert('Trip in progress', 'Finish your active trip before going offline.');
            try { await setOnline(v); } catch (error) { Alert.alert('Could not update status', error.message); }
          }} trackColor={{ true: colors.black, false: colors.gray500 }} thumbColor={colors.white} accessibilityLabel="Go online" />
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
          <StatBox icon="cash" label="TODAY'S EARNINGS" value={peso(todayEarnings).replace('.00', '')} />
          <Pressable style={{ flex: 1, flexDirection: 'row' }} onPress={() => navigation.navigate('TripHistory')} accessibilityLabel="Trip history"><StatBox icon="car-sport" label="TOTAL TRIPS" value={String(totalTrips)} /></Pressable>
        </View>
        <SectionLabel style={{ marginTop: 20 }}>LIVE AREA MAP<Badge text="● High Demand" tone="soft" style={{ marginLeft: 8 }} /></SectionLabel>
        <RideMap style={styles.map} pickup={{ latitude: center.latitude, longitude: center.longitude }} circle={{ center: { latitude: center.latitude, longitude: center.longitude }, radius: 250 }} interactive={false} />
        <SectionLabel style={{ marginTop: 18 }} action="View all" onAction={() => navigation.navigate('Requests')}>NEW REQUESTS</SectionLabel>
        {request && online ? (
          <View style={styles.req}>
            <Pressable onPress={() => navigation.navigate('Requests')} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <IconBox icon="person" size={44} bg="rgba(255,255,255,0.1)" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <AppText variant="h3" color={colors.white}>{request.passenger.name}</AppText>
                <AppText variant="small" color={colors.gray300}>★ {request.passenger.rating} ({request.passenger.trips} trips)</AppText>
              </View>
              <Badge text="NEARBY" tone="yellow" />
            </Pressable>
            <View style={{ marginVertical: 14 }}>
              <AppText variant="small" color={colors.white}><AppText color={colors.yellow}>● </AppText>{request.pickup.name}</AppText>
              <AppText variant="small" color={colors.white} style={{ marginTop: 6 }}>■ {request.destination.name}</AppText>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button title="DECLINE" variant="dark" small style={{ flex: 1 }} onPress={decline} />
              <Button title="ACCEPT RIDE" variant="accent" small style={{ flex: 2 }} onPress={acceptNow} />
            </View>
          </View>
        ) : (
          <View style={[styles.req, { alignItems: 'center', paddingVertical: 26 }]}>
            <Ionicons name={online ? 'radio' : 'moon'} size={26} color={colors.yellow} />
            <AppText variant="bodyBold" color={colors.white} style={{ marginTop: 8 }}>{online ? 'Looking for requests…' : 'You are offline'}</AppText>
            <AppText variant="small" color={colors.gray400} style={{ marginTop: 2 }}>{trip ? 'Finish your active trip first.' : online ? 'New bookings will appear here.' : 'Go online to receive bookings.'}</AppText>
          </View>
        )}
        {trip ? <Button title="Continue active trip" variant="accent" style={{ marginTop: 12 }} onPress={() => navigation.navigate('Requests', { screen: 'Pickup' })} /> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingBottom: 14 },
  round: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 8, right: 9, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.yellow },
  pad: { paddingHorizontal: 18 },
  status: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.yellow, borderRadius: radius.lg, padding: 16 },
  map: { height: 150, borderRadius: radius.lg },
  req: { backgroundColor: colors.black, borderRadius: radius.lg, padding: 16 },
});
