import React, { useEffect, useState } from 'react';
import { View, ScrollView, Linking, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import YellowHeader from '../../components/YellowHeader';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Card from '../../components/Card';
import ConfirmDialog from '../../components/ConfirmDialog';
import RideMap from '../../components/RideMap';
import RouteSummary from '../../components/RouteSummary';
import { useRider } from '../../context/RiderContext';
import { clock, peso } from '../../utils/format';
import { colors, radius } from '../../theme';

export default function ActiveTripScreen({ navigation }) {
  const { trip, startedAt, completeTrip } = useRider();
  const [elapsed, setElapsed] = useState(0);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - (startedAt || Date.now())) / 1000)), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  if (!trip) return null;
  const started = new Date(startedAt || Date.now()).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const open = () => Linking.openURL(`google.navigation:q=${trip.destination.coords.latitude},${trip.destination.coords.longitude}`).catch(() => {});
  const finish = async () => {
    setConfirm(false);
    try {
      await completeTrip();
      navigation.replace('RideCompleted');
    } catch (error) {
      Alert.alert('Could not complete trip', error.message);
    }
  };

  return (
    <View style={styles.flex}>
      <YellowHeader title="Active Trip" onBack={() => navigation.goBack()} right={{ icon: 'warning', label: 'Report safety issue', onPress: () => Alert.alert('Safety issue reported', 'Our team has been notified.') }} />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 30 }}>
        <View style={styles.timer}>
          <Badge text="IN PROGRESS" tone="yellow" />
          <AppText variant="h1" color={colors.white} style={{ fontSize: 52, lineHeight: 60, marginTop: 8 }}>{clock(elapsed)}</AppText>
          <AppText variant="small" color={colors.gray300}>Started {started} · Passenger boarded</AppText>
        </View>
        <RideMap style={styles.map} pickup={trip.pickup.coords} destination={trip.destination.coords} path={trip.route.path} interactive={false} padding={{ top: 40, right: 40, bottom: 40, left: 40 }} />
        <Card style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}><Badge text={`TRIP ${trip.id}`} tone="yellow" /><AppText variant="bodyBold">{trip.passenger.name}</AppText></View>
          <RouteSummary pickup={trip.pickup.name} destination={trip.destination.name} />
          <View style={styles.fare}><AppText variant="small">Estimated fare</AppText><AppText variant="h3">{peso(trip.fare.total)}</AppText></View>
        </Card>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <Button title="Navigate" variant="outline" small icon="navigate-outline" style={{ flex: 1, paddingHorizontal: 4 }} onPress={open} />
          <Button title="Call" variant="outline" small icon="call-outline" style={{ flex: 1, paddingHorizontal: 4 }} onPress={() => Alert.alert('Call passenger', 'In-app calling needs the backend.')} />
          <Button title="Message" variant="outline" small icon="chatbubble-outline" style={{ flex: 1, paddingHorizontal: 4 }} onPress={() => Alert.alert('Message', 'In-app chat needs the backend.')} />
        </View>
        <Button title="Complete Trip" variant="accent" icon="checkmark" upper onPress={() => setConfirm(true)} style={{ marginTop: 12 }} />
        <View style={styles.note}><Ionicons name="alert-circle" size={16} color={colors.red} /><AppText variant="small" color={colors.red} style={{ flex: 1, marginLeft: 8, fontSize: 11 }}>Completing the trip records the final fare and commission once. Fare or destination changes need confirmation first.</AppText></View>
        <Button title="Report Safety Issue" variant="danger" icon="warning-outline" upper onPress={() => Alert.alert('Safety issue reported', 'Our team has been notified.')} />
      </ScrollView>
      <ConfirmDialog visible={confirm} title="Complete this trip?" message={`The final fare of ${peso(trip.fare.total)} will be recorded.`} confirmText="Complete trip" cancelText="Not yet" onCancel={() => setConfirm(false)} onConfirm={finish} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.gray100 },
  timer: { backgroundColor: colors.black, borderRadius: radius.xl, padding: 22, alignItems: 'center' },
  map: { height: 130, borderRadius: radius.lg, marginTop: 14 },
  fare: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.gray50, borderRadius: radius.md, padding: 12, marginTop: 12 },
  note: { flexDirection: 'row', backgroundColor: colors.gray200, borderRadius: radius.md, padding: 12, marginVertical: 12 },
});
