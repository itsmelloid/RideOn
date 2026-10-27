import React from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import { Avatar, IconBox } from '../../components/misc';
import { useRider } from '../../context/RiderContext';
import { images } from '../../data/mock';
import { peso } from '../../utils/format';
import { colors, radius } from '../../theme';

export default function RideCompletedScreen({ navigation }) {
  const { summary } = useRider();
  if (!summary) return null;
  return (
    <Screen bg={colors.yellow}>
      <ScrollView bounces={false} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ alignItems: 'center', paddingVertical: 28 }}>
          <View style={styles.check}><Ionicons name="checkmark" size={26} color={colors.yellow} /></View>
          <AppText variant="h1" style={{ marginTop: 12 }}>Ride Completed!</AppText>
          <AppText variant="small" color={colors.ink}>Thank you for a safe trip.</AppText>
        </View>
        <View style={styles.sheet}>
          <AppText variant="label" align="center" style={{ fontSize: 9 }}>TOTAL TRIP FARE</AppText>
          <AppText variant="h1" align="center" style={{ fontSize: 44, lineHeight: 52 }}>{peso(summary.fare)}</AppText>
          <View style={{ alignItems: 'center', marginVertical: 8 }}><Badge text="▮ Payment Received" tone="black" /></View>
          <View style={styles.breakdown}>
            <AppText variant="label" style={{ marginBottom: 10 }}>EARNINGS BREAKDOWN</AppText>
            <View style={styles.row}><IconBox icon="wallet" size={34} /><View style={{ flex: 1, marginLeft: 10 }}><AppText variant="bodyBold">Your Share</AppText><AppText variant="small" style={{ fontSize: 10 }}>90% of total fare</AppText></View><AppText variant="h3">{peso(summary.share)}</AppText></View>
            <View style={styles.row}><IconBox icon="business" size={34} /><View style={{ flex: 1, marginLeft: 10 }}><AppText variant="bodyBold">Platform Fee</AppText><AppText variant="small" style={{ fontSize: 10 }}>10% commission</AppText></View><AppText variant="h3" color={colors.gray500}>{peso(summary.commission)}</AppText></View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <View style={styles.stat}><Ionicons name="speedometer" size={16} color={colors.yellowDark} /><AppText variant="small" style={{ fontSize: 10 }}>Distance</AppText><AppText variant="h3">{summary.distanceKm.toFixed(1)} km</AppText></View>
            <View style={styles.stat}><Ionicons name="time" size={16} color={colors.yellowDark} /><AppText variant="small" style={{ fontSize: 10 }}>Duration</AppText><AppText variant="h3">{Math.max(1, Math.round(summary.durationMin))} mins</AppText></View>
          </View>
          <View style={styles.pass}>
            <Avatar source={images.adrian} size={40} />
            <View style={{ flex: 1, marginLeft: 10 }}><AppText variant="label" style={{ fontSize: 8 }}>PASSENGER</AppText><AppText variant="bodyBold">{summary.passenger.name}</AppText></View>
            <AppText variant="bodyBold">★ {summary.passenger.rating}</AppText>
          </View>
          <Button title="Back to Dashboard" variant="accent" iconRight="arrow-forward" onPress={() => navigation.popToTop()} style={{ marginTop: 16 }} />
          <AppText variant="small" align="center" style={{ marginTop: 14 }} onPress={() => Alert.alert('Report received', 'Thanks — our team will review it.')}>ⓘ Report a Problem</AppText>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  check: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' },
  sheet: { flex: 1, backgroundColor: colors.white, borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 22 },
  breakdown: { backgroundColor: colors.gray50, borderRadius: radius.lg, padding: 16, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  stat: { flex: 1, backgroundColor: colors.gray100, borderRadius: radius.lg, padding: 14, alignItems: 'center', gap: 2 },
  pass: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.gray50, borderRadius: radius.lg, padding: 12, marginTop: 12 },
});
