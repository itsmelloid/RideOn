import React, { useEffect, useState } from 'react';
import { View, ScrollView, Linking, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import YellowHeader from '../../components/YellowHeader';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import Card from '../../components/Card';
import ConfirmDialog from '../../components/ConfirmDialog';
import RideMap from '../../components/RideMap';
import RouteSummary from '../../components/RouteSummary';
import { Avatar } from '../../components/misc';
import { useRider } from '../../context/RiderContext';
import { getRoute } from '../../services/maps';
import { images } from '../../data/mock';
import { peso, km } from '../../utils/format';
import { colors, radius } from '../../theme';

const Chip = ({ text, on }) => (
  <View style={[styles.chip, on && { backgroundColor: colors.black }]}>
    {on ? <Ionicons name="checkmark" size={12} color={colors.yellow} /> : null}
    <AppText variant="label" color={on ? colors.white : colors.gray500} style={{ fontSize: 9, marginLeft: on ? 4 : 0 }}>{text}</AppText>
  </View>
);

export default function PickupScreen({ navigation }) {
  const { trip, stage, markArrived, startTrip, cancelTrip } = useRider();
  const [path, setPath] = useState(null);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!trip) return;
    // Route from a spot near the pickup point (prototype stand-in for the rider's live GPS position).
    const start = { latitude: trip.pickup.coords.latitude + 0.004, longitude: trip.pickup.coords.longitude - 0.003 };
    getRoute(start, trip.pickup.coords).then((r) => setPath(r.path));
  }, [trip]);

  useEffect(() => { if (!trip && navigation.canGoBack()) navigation.goBack(); }, [trip, navigation]);
  if (!trip) return null;

  const arrived = stage === 'arrived';
  const navigate = () => Linking.openURL(`google.navigation:q=${trip.pickup.coords.latitude},${trip.pickup.coords.longitude}`).catch(() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${trip.pickup.coords.latitude},${trip.pickup.coords.longitude}`));
  const go = async () => {
    try {
      await startTrip();
      navigation.navigate('ActiveTrip');
    } catch (error) {
      Alert.alert('Could not start trip', error.message);
    }
  };

  return (
    <View style={styles.flex}>
      <YellowHeader title="Pickup" onBack={() => navigation.navigate('RequestsHome')} right={{ icon: 'notifications', label: 'Notifications', onPress: () => {} }} />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 30 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}><Chip text="ACCEPTED" on /><Chip text="EN ROUTE" on /><Chip text="ARRIVED" on={arrived} /></View>
        <RideMap style={styles.map} pickup={trip.pickup.coords} path={path} interactive={false} padding={{ top: 40, right: 40, bottom: 40, left: 40 }} />
        <Card style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Avatar source={images.adrian} size={48} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <AppText variant="h3">{trip.passenger.name}</AppText>
              <AppText variant="small">★ {trip.passenger.rating} · Passenger</AppText>
            </View>
            <Button title="" icon="call" small style={styles.circle} onPress={() => Alert.alert('Call passenger', 'In-app calling needs the backend (masked numbers).')} />
            <Button title="" icon="chatbubble" small style={[styles.circle, { marginLeft: 8 }]} onPress={() => Alert.alert('Message', 'In-app chat needs the backend.')} />
          </View>
          <View style={{ marginVertical: 14 }}><RouteSummary pickup={trip.pickup.name} destination={trip.destination.name} /></View>
          <View style={styles.fare}>
            <View><AppText variant="label" style={{ fontSize: 8 }}>ESTIMATED FARE</AppText><AppText variant="h2">{peso(trip.fare.total)}</AppText></View>
            <View style={{ alignItems: 'flex-end' }}><AppText variant="label" style={{ fontSize: 8 }}>DISTANCE</AppText><AppText variant="bodyBold">{km(trip.route.distanceKm)} · ~{Math.max(1, Math.round(trip.route.durationMin))} min</AppText></View>
          </View>
        </Card>
        <Button title="Navigate to Pickup" icon="navigate" upper onPress={navigate} style={{ marginTop: 14 }} />
        {arrived ? <Button title="Start Trip" variant="accent" icon="play" upper onPress={go} style={{ marginTop: 10 }} /> : <Button title="Arrived at Pickup" variant="accent" icon="location" upper onPress={async () => { try { await markArrived(); } catch (error) { Alert.alert('Could not update ride', error.message); } }} style={{ marginTop: 10 }} />}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <Button title="Report Problem" variant="outline" icon="warning-outline" small upper style={{ flex: 1, paddingHorizontal: 6 }} onPress={() => Alert.alert('Report received', 'Thanks — our team will review it.')} />
          <Button title="Cancel Booking" variant="danger" icon="close" small upper style={{ flex: 1, paddingHorizontal: 6 }} onPress={() => setConfirm(true)} />
        </View>
      </ScrollView>
      <ConfirmDialog visible={confirm} title="Cancel this booking?" message="Frequent cancellations can affect your rider rating." confirmText="Cancel booking" destructive onCancel={() => setConfirm(false)} onConfirm={() => { setConfirm(false); cancelTrip(); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.gray100 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200 },
  map: { height: 150, borderRadius: radius.lg, marginTop: 14 },
  circle: { width: 40, minHeight: 40, height: 40, borderRadius: 20, paddingHorizontal: 0 },
  fare: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.gray50, borderRadius: radius.md, padding: 14 },
});
