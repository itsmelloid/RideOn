import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import YellowHeader from '../../components/YellowHeader';
import SegmentTabs from '../../components/SegmentTabs';
import AppText from '../../components/AppText';
import Badge from '../../components/Badge';
import Card from '../../components/Card';
import RouteSummary from '../../components/RouteSummary';
import { EmptyState } from '../../components/misc';
import { useRider } from '../../context/RiderContext';
import { peso } from '../../utils/format';
import { colors } from '../../theme';

export default function TripHistoryScreen({ navigation }) {
  const { history } = useRider();
  const [tab, setTab] = useState('ALL');
  const [oldestFirst, setOldestFirst] = useState(false);
  let rows = history.filter((h) => tab === 'ALL' || h.status.toUpperCase() === tab);
  if (oldestFirst) rows = [...rows].reverse();

  return (
    <View style={styles.flex}>
      <YellowHeader title="Trip History" onBack={() => navigation.goBack()} right={{ icon: oldestFirst ? 'arrow-up' : 'filter', label: 'Sort order', onPress: () => setOldestFirst((o) => !o) }}>
        <SegmentTabs tabs={['ALL', 'COMPLETED', 'CANCELLED']} value={tab} onChange={setTab} />
      </YellowHeader>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 30 }}>
        {rows.length === 0 ? <EmptyState title="No trips yet" /> : null}
        {rows.map((h) => (
          <Card key={h.id + h.when} style={{ marginBottom: 12 }}>
            <View style={styles.between}><AppText variant="h3">{h.id}</AppText><Badge text={h.status.toUpperCase()} tone="black" /></View>
            <AppText variant="small" style={{ marginBottom: 10 }}>{h.when}</AppText>
            <RouteSummary pickup={h.from} destination={h.to} pickupLabel="From" destinationLabel="To" />
            {h.status === 'Completed' ? (
              <View style={styles.money}>
                {[['FARE', h.fare, colors.black], ['COMMISSION', h.commission, colors.gray500], ['YOUR SHARE', h.share, colors.black]].map(([l, v, c]) => (
                  <View key={l} style={{ flex: 1 }}><AppText variant="label" style={{ fontSize: 8 }}>{l}</AppText><AppText variant="bodyBold" color={c}>{peso(v)}</AppText></View>
                ))}
              </View>
            ) : (
              <View style={styles.note}><Ionicons name="information-circle-outline" size={14} color={colors.gray600} /><AppText variant="small" style={{ flex: 1, marginLeft: 6, fontSize: 11 }}>{h.note}</AppText></View>
            )}
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.gray100 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  money: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.gray100, marginTop: 12, paddingTop: 10 },
  note: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.gray100, marginTop: 12, paddingTop: 10 },
});
