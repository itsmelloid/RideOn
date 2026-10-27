import React, { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import YellowHeader from '../../components/YellowHeader';
import AppText from '../../components/AppText';
import SegmentTabs from '../../components/SegmentTabs';
import { IconBox, SectionLabel, EmptyState } from '../../components/misc';
import { useBooking } from '../../context/BookingContext';
import { colors, radius, shadow } from '../../theme';

const FILTERS = ['All', 'Bookings', 'Payments', 'Updates'];

export default function NotificationsScreen({ navigation }) {
  const { notifications, markAllRead } = useBooking();
  const [filter, setFilter] = useState('All');
  const items = notifications.filter((n) => filter === 'All' || n.type === filter);
  const groups = ['Today', 'Earlier'];

  return (
    <View style={styles.flex}>
      <YellowHeader title="Notifications" onBack={() => navigation.goBack()} right={{ icon: 'checkmark', label: 'Mark all as read', onPress: markAllRead }} />
      <SegmentTabs variant="chips" tabs={FILTERS} value={filter} onChange={setFilter} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 30 }}>
        {items.length === 0 ? <EmptyState icon="notifications-off-outline" title="Nothing here yet" /> : null}
        {groups.map((g) => {
          const rows = items.filter((n) => n.group === g);
          if (!rows.length) return null;
          return (
            <View key={g}>
              <SectionLabel action={g === 'Today' ? 'Mark all as read' : undefined} onAction={markAllRead}>{g}</SectionLabel>
              {rows.map((n) => (
                <Pressable key={n.id} style={[styles.card, n.unread && styles.unread, shadow.card]} accessibilityRole="button">
                  <IconBox icon={n.icon} size={42} round />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <AppText variant="bodyBold">{n.title}</AppText>
                    <AppText variant="small" style={{ fontSize: 12 }}>{n.body}</AppText>
                    <AppText variant="label" style={{ fontSize: 8, marginTop: 4 }}>{n.time}</AppText>
                  </View>
                  {n.unread ? <View style={styles.dot} /> : null}
                </Pressable>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.gray100 },
  card: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: 'transparent' },
  unread: { borderColor: colors.yellow },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.yellow, marginTop: 4 },
});
