import React, { useState } from 'react';
import { View, ScrollView, Share, Linking, Pressable, StyleSheet } from 'react-native';
import YellowHeader from '../../components/YellowHeader';
import SegmentTabs from '../../components/SegmentTabs';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Card from '../../components/Card';
import { RIDER_EARNINGS, RIDER_EARNING_TRIPS } from '../../data/mock';
import { peso } from '../../utils/format';
import { colors, radius } from '../../theme';

const FILTERS = ['All', 'Settled', 'Pending'];
const PERIOD = { Daily: 'TODAY', Weekly: 'THIS WEEK', Monthly: 'THIS MONTH' };

export default function EarningsScreen({ navigation }) {
  const [tab, setTab] = useState('Weekly');
  const [filter, setFilter] = useState('All');
  const e = RIDER_EARNINGS[tab];
  const trips = RIDER_EARNING_TRIPS.filter((t) => filter === 'All' || t.state === filter);

  const statement = () =>
    Share.share({ message: `RideOn earnings statement (${tab})\nRider share: ${peso(e.share)}\nCompleted rides: ${e.rides}\nFares: ${peso(e.fares)}\nCommission (10%): ${peso(e.commission)}\nPending settlement: ${peso(e.pending)}` }).catch(() => {});

  return (
    <View style={styles.flex}>
      <YellowHeader title="Earnings" onBack={() => navigation.navigate('Dashboard')} right={{ icon: 'download-outline', label: 'Download statement', onPress: statement }}>
        <SegmentTabs tabs={['Daily', 'Weekly', 'Monthly']} value={tab} onChange={setTab} />
      </YellowHeader>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 30 }}>
        <View style={styles.black}>
          <AppText variant="label" color={colors.gray400}>RIDER SHARE · {PERIOD[tab]}</AppText>
          <AppText variant="h1" color={colors.yellow} style={{ fontSize: 36, lineHeight: 44 }}>{peso(e.share)}</AppText>
          <AppText variant="small" color={colors.gray300}>{e.rides} completed rides · {peso(e.fares)} in fares</AppText>
          <View style={styles.split}>
            <View><AppText variant="label" color={colors.gray400} style={{ fontSize: 8 }}>COMMISSION (10%)</AppText><AppText variant="h3" color={colors.white}>{peso(e.commission)}</AppText></View>
            <View><AppText variant="label" color={colors.yellow} style={{ fontSize: 8 }}>● PENDING SETTLEMENT</AppText><AppText variant="h3" color={colors.yellow}>{peso(e.pending)}</AppText></View>
          </View>
          <AppText variant="small" color={colors.gray500} style={{ fontSize: 9, marginTop: 8 }}>Recorded amounts. Only settled commission counts as paid.</AppText>
        </View>
        <Card style={{ marginTop: 14 }}>
          <AppText variant="label" style={{ marginBottom: 10 }}>COMMISSION SETTLEMENT</AppText>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[['PAID', e.paid, colors.green], ['PENDING', e.pending, colors.yellow], ['DISPUTED', e.disputed, colors.red]].map(([l, v, c]) => (
              <View key={l} style={styles.box}><AppText variant="label" style={{ fontSize: 8 }} color={c}>● <AppText variant="label" style={{ fontSize: 8 }}>{l}</AppText></AppText><AppText variant="bodyBold">{peso(v)}</AppText></View>
            ))}
          </View>
        </Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 8 }}>
          <AppText variant="label">RECENT TRIPS</AppText>
          <Pressable style={styles.filter} onPress={() => setFilter(FILTERS[(FILTERS.indexOf(filter) + 1) % FILTERS.length])} accessibilityLabel="Filter trips"><AppText variant="label" color={colors.black} style={{ fontSize: 8 }}>FILTER: {filter.toUpperCase()}</AppText></Pressable>
        </View>
        <Card style={{ padding: 4 }}>
          {trips.map((t, i) => (
            <Pressable key={t.id} onPress={() => navigation.navigate('TripHistory')} style={[styles.trip, i < trips.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.gray100 }]}>
              <View style={{ flex: 1 }}><AppText variant="bodyBold">{t.id}</AppText><AppText variant="small" style={{ fontSize: 10 }}>{t.meta}</AppText><AppText variant="small" style={{ fontSize: 10 }}>{t.commission}</AppText></View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}><AppText variant="h3">{peso(t.amount, { sign: true })}</AppText><Badge text={t.state.toUpperCase()} tone={t.state === 'Settled' ? 'black' : 'yellow'} /></View>
            </Pressable>
          ))}
        </Card>
        <Button title="Download Statement" icon="download-outline" upper onPress={statement} style={{ marginTop: 16 }} />
        <Button title="Report Discrepancy" variant="outline" icon="warning-outline" upper onPress={() => Linking.openURL('mailto:support@rideon.example?subject=Earnings%20discrepancy')} style={{ marginTop: 10 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.gray100 },
  black: { backgroundColor: colors.black, borderRadius: radius.xl, padding: 20 },
  split: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)', marginTop: 14, paddingTop: 14 },
  box: { flex: 1, backgroundColor: colors.gray100, borderRadius: radius.md, padding: 10 },
  filter: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  trip: { flexDirection: 'row', alignItems: 'center', padding: 14 },
});
