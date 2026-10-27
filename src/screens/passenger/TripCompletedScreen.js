import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import YellowHeader from '../../components/YellowHeader';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Card from '../../components/Card';
import Input from '../../components/Input';
import RouteSummary from '../../components/RouteSummary';
import { Avatar, StarRating, Divider } from '../../components/misc';
import { useBooking } from '../../context/BookingContext';
import { images, RIDER_DRIVER } from '../../data/mock';
import { peso } from '../../utils/format';
import { calculateFare } from '../../services/fare';
import { colors } from '../../theme';

export default function TripCompletedScreen({ navigation }) {
  const { lastTrip, finishAndReset, rateTrip } = useBooking();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  if (!lastTrip) return null;
  const f = calculateFare(lastTrip.distanceKm);

  const home = () => { finishAndReset(); navigation.popToTop(); };
  const bookAgain = () => { finishAndReset(); navigation.popToTop(); navigation.navigate('Destination'); };
  const submit = async () => {
    if (!rating) return Alert.alert('Rate your rider', 'Please select a star rating first.');
    try {
      await rateTrip(rating);
      setSubmitted(true);
    } catch (error) {
      Alert.alert('Could not submit rating', error.message);
    }
  };

  return (
    <View style={styles.flex}>
      <YellowHeader title="Trip Completed" onBack={home} />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 30 }}>
        <Card style={{ alignItems: 'center' }}>
          <View style={styles.check}><Ionicons name="checkmark" size={26} color={colors.yellow} /></View>
          <AppText variant="label" style={{ marginTop: 10, fontSize: 9 }}>YOU HAVE ARRIVED</AppText>
          <AppText variant="h1" style={{ fontSize: 40, lineHeight: 48 }}>{peso(lastTrip.fare)}</AppText>
          <Badge tone="soft" text={lastTrip.method === 'Cash' ? 'PAY RIDER · CASH' : 'PAID · RIDEON WALLET'} />
        </Card>
        <Card style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Badge text={`TRIP ${lastTrip.id}`} tone="yellow" />
            <AppText variant="small">Today</AppText>
          </View>
          <RouteSummary pickup={lastTrip.pickup} destination={lastTrip.destination} />
        </Card>
        <Card style={{ marginTop: 12 }}>
          <AppText variant="label" style={{ marginBottom: 8 }}>FARE BREAKDOWN</AppText>
          <View style={styles.line}><AppText variant="small">Base fare</AppText><AppText variant="bodyBold">{peso(f.base)}</AppText></View>
          <View style={styles.line}><AppText variant="small">Distance charge ({lastTrip.distanceKm.toFixed(1)} km)</AppText><AppText variant="bodyBold">{peso(f.distanceCharge)}</AppText></View>
          <Divider />
          <View style={styles.line}><AppText variant="bodyBold">Total</AppText><AppText variant="bodyBold">{peso(lastTrip.fare)}</AppText></View>
        </Card>
        <Card style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center' }}>
          <Avatar source={images.hans} size={44} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <AppText variant="bodyBold">{RIDER_DRIVER.name}</AppText>
            <AppText variant="small">{RIDER_DRIVER.vehicle} · {RIDER_DRIVER.plateFull}</AppText>
          </View>
          <Badge text="✓ VERIFIED" tone="black" />
        </Card>
        <Card style={{ marginTop: 12 }}>
          <AppText variant="label" style={{ marginBottom: 10 }}>RATE YOUR RIDER</AppText>
          {submitted ? (
            <View style={{ alignItems: 'center', paddingVertical: 10 }}>
              <StarRating value={rating} size={26} />
              <AppText variant="bodyBold" style={{ marginTop: 8 }}>Thanks for your feedback!</AppText>
            </View>
          ) : (
            <>
              <StarRating value={rating} onChange={setRating} />
              <Input placeholder="Add optional feedback…" value={feedback} onChangeText={setFeedback} multiline style={{ marginTop: 14, marginBottom: 10 }} autoCapitalize="sentences" />
              <Button title="Submit Rating" icon="checkmark" onPress={submit} />
            </>
          )}
        </Card>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <Button title="View Trip" variant="outline" small icon="location-outline" style={{ flex: 1, paddingHorizontal: 6 }} onPress={() => Alert.alert('Trip', `${lastTrip.pickup} → ${lastTrip.destination}`)} />
          <Button title="Receipt" variant="outline" small icon="document-text-outline" style={{ flex: 1, paddingHorizontal: 6 }} onPress={() => Alert.alert('Receipt', `Trip ${lastTrip.id}\nTotal ${peso(lastTrip.fare)}\nPaid via ${lastTrip.method}`)} />
          <Button title="Report" variant="outline" small icon="warning-outline" style={{ flex: 1, paddingHorizontal: 6 }} onPress={() => navigation.navigate('Safety')} />
        </View>
        <Button title="Book Again" variant="accent" icon="refresh" upper onPress={bookAgain} style={{ marginTop: 14 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.gray50 },
  check: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
});
