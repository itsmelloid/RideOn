import React, { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import YellowHeader from '../../components/YellowHeader';
import RideMap from '../../components/RideMap';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import Card from '../../components/Card';
import RouteSummary from '../../components/RouteSummary';
import ConfirmDialog from '../../components/ConfirmDialog';
import { StatBox, SectionLabel, Divider } from '../../components/misc';
import { useBooking } from '../../context/BookingContext';
import { peso, km } from '../../utils/format';
import { FARE } from '../../services/fare';
import { colors, radius } from '../../theme';

const Line = ({ label, value, bold }) => (
  <View style={styles.line}>
    <AppText variant={bold ? 'bodyBold' : 'small'} style={bold ? { fontSize: 15 } : { fontSize: 13 }}>{label}</AppText>
    <AppText variant="bodyBold" style={bold ? { fontSize: 20 } : { fontSize: 13 }}>{value}</AppText>
  </View>
);

export default function TripDetailsScreen({ navigation }) {
  const { pickup, destination, route, fare, paymentMethod, setPaymentMethod, balance, requestRide, cancelRide } = useBooking();
  const [confirmCancel, setConfirmCancel] = useState(false);
  if (!route || !fare) return null;

  const togglePayment = () => setPaymentMethod(paymentMethod === 'RideOn Wallet' ? 'Cash' : 'RideOn Wallet');

  const confirm = async () => {
    if (paymentMethod === 'RideOn Wallet' && balance < fare.total) {
      return Alert.alert('Insufficient balance', 'Your RideOn Wallet balance is too low. Top up your wallet or switch to Cash.');
    }
    try {
      await requestRide();
      navigation.navigate('Searching');
    } catch (error) {
      Alert.alert('Could not create booking', error.message);
    }
  };

  return (
    <View style={styles.flex}>
      <YellowHeader title="Trip Details" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 30 }}>
        <RideMap style={styles.map} pickup={pickup.coords} destination={destination.coords} path={route.path} interactive={false} padding={{ top: 40, right: 40, bottom: 40, left: 40 }} />
        <Card style={{ marginTop: 14 }}>
          <RouteSummary pickup={pickup.name} destination={destination.name} pickupLabel="Pickup Location" />
        </Card>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
          <StatBox icon="speedometer" label="Distance" value={km(route.distanceKm)} />
          <StatBox icon="hourglass" label="Est. Time" value={`${Math.max(1, Math.round(route.durationMin))} mins`} />
        </View>
        <SectionLabel style={{ marginTop: 18 }}>FARE BREAKDOWN</SectionLabel>
        <Line label="Base Fare" value={peso(fare.base)} />
        <Line label={`Distance (${peso(FARE.perKm)}/km after ${FARE.includedKm} km)`} value={peso(fare.distanceCharge)} />
        <Divider />
        <Line label="Total Fare" value={peso(fare.total)} bold />
        <Pressable onPress={togglePayment} style={styles.payment} accessibilityRole="button" accessibilityLabel="Change payment method">
          <View style={styles.payIcon}><Ionicons name={paymentMethod === 'Cash' ? 'cash' : 'wallet'} size={16} color={colors.black} /></View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <AppText variant="label" style={{ fontSize: 8 }}>PAYMENT METHOD</AppText>
            <AppText variant="bodyBold">{paymentMethod}{paymentMethod === 'RideOn Wallet' ? ` · ${peso(balance)}` : ''}</AppText>
          </View>
          <Ionicons name="swap-horizontal" size={18} color={colors.gray500} />
        </Pressable>
        <Button title="Confirm Booking" variant="accent" iconRight="arrow-forward" upper onPress={confirm} style={{ marginTop: 18 }} />
        <Pressable onPress={() => setConfirmCancel(true)} style={{ alignItems: 'center', marginTop: 16 }}>
          <AppText variant="bodyBold" style={{ fontSize: 12 }}>Cancel Trip Request</AppText>
        </Pressable>
      </ScrollView>
      <ConfirmDialog
        visible={confirmCancel}
        title="Cancel trip request?"
        message="Your trip details will be cleared."
        confirmText="Yes, cancel"
        destructive
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() => { setConfirmCancel(false); cancelRide(); navigation.popToTop(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  map: { height: 170, borderRadius: radius.lg },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  payment: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.gray100, borderRadius: radius.md, padding: 12, marginTop: 14 },
  payIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
});
