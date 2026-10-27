import React, { useState } from 'react';
import { View, ScrollView, Image, Pressable, StyleSheet, Alert } from 'react-native';
import YellowHeader from '../../components/YellowHeader';
import SegmentTabs from '../../components/SegmentTabs';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Card from '../../components/Card';
import Input from '../../components/Input';
import RouteSummary from '../../components/RouteSummary';
import { EmptyState, SectionLabel } from '../../components/misc';
import { useBooking } from '../../context/BookingContext';
import { images } from '../../data/mock';
import { peso } from '../../utils/format';
import { colors, radius } from '../../theme';

export default function BookingsScreen({ navigation }) {
  const { bookings, status, tripId, pickup, destination, fare, etaMinutes } = useBooking();
  const [tab, setTab] = useState('ACTIVE');
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');

  const live = ['found', 'inTrip'].includes(status);
  const match = (b) => !query || `${b.pickup} ${b.destination} ${b.id}`.toLowerCase().includes(query.toLowerCase());
  const active = bookings.filter((b) => b.status === 'Active' && match(b));
  const completed = bookings.filter((b) => b.status === 'Completed' && match(b));
  const cancelled = bookings.filter((b) => b.status === 'Cancelled' && match(b));

  return (
    <View style={styles.flex}>
      <YellowHeader title="My Bookings" onBack={() => navigation.navigate('Home')} right={{ icon: searching ? 'close' : 'search', label: 'Search bookings', onPress: () => { setSearching((s) => !s); setQuery(''); } }}>
        <SegmentTabs tabs={['ACTIVE', 'COMPLETED', 'CANCELLED']} value={tab} onChange={setTab} />
      </YellowHeader>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 30 }}>
        {searching ? <Input placeholder="Search by place or trip ID" value={query} onChangeText={setQuery} icon="search" /> : null}
        {tab === 'ACTIVE' ? (
          <>
            {live ? (
              <Card style={{ marginBottom: 14 }}>
                <View style={styles.rowBetween}>
                  <View><Badge text="ON THE WAY" tone="soft" /><AppText variant="h3" style={{ marginTop: 4 }}>RIDE TO {destination?.name?.toUpperCase().slice(0, 16)}</AppText></View>
                  <Badge text={`ID: ${tripId}`} tone="yellow" />
                </View>
                <View style={{ marginVertical: 12 }}><RouteSummary pickup={pickup.name} destination={destination.name} /></View>
                <View style={styles.rowBetween}><AppText variant="small">ETA {etaMinutes} min</AppText><AppText variant="h3">{peso(fare?.total)}</AppText></View>
                <Button title="View Details" small style={{ marginTop: 12 }} onPress={() => navigation.navigate(status === 'found' ? 'RiderFound' : 'EnRoute')} />
              </Card>
            ) : null}
            {active.map((b) => (
              <Card key={b.id} style={{ marginBottom: 14 }}>
                <View style={styles.rowBetween}>
                  <View><Badge text="ON THE WAY" tone="soft" /><AppText variant="h3" style={{ marginTop: 4 }}>{b.label}</AppText></View>
                  <Badge text={`ID: ${b.id}`} tone="yellow" />
                </View>
                <View style={{ marginVertical: 12 }}><RouteSummary pickup={b.pickup} destination={b.destination} /></View>
                <View style={styles.rowBetween}><AppText variant="small">{b.when}</AppText><AppText variant="h3">{peso(b.fare)}</AppText></View>
                <Button title="View Details" small style={{ marginTop: 12 }} onPress={() => Alert.alert(`Trip ${b.id}`, `${b.pickup} → ${b.destination}\n${b.when}\nFare ${peso(b.fare)}`)} />
              </Card>
            ))}
            {!live && active.length === 0 ? <EmptyState icon="car-outline" title="No active bookings" message="Book a ride and it will show up here." /> : null}
            <View style={styles.promo}>
              <Image source={images.bannerAdventure} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <View style={{ padding: 16 }}>
                <AppText variant="h3" color={colors.white} style={{ textTransform: 'uppercase', fontStyle: 'italic' }}>Book your{'\n'}next{'\n'}adventure</AppText>
                <AppText variant="small" color={colors.gray300} style={{ fontSize: 10, marginVertical: 6 }}>Save up to 20% on weekend trips</AppText>
                <Pressable style={styles.learn} onPress={() => navigation.navigate('Destination')}><AppText variant="label" color={colors.black} style={{ fontSize: 8 }}>LEARN MORE</AppText></Pressable>
              </View>
            </View>
          </>
        ) : null}
        {tab === 'COMPLETED' ? (
          completed.length ? (
            <>
              <SectionLabel>COMPLETED RECENTLY</SectionLabel>
              {completed.map((b) => (
                <Card key={b.id + b.when} style={{ marginBottom: 12 }}>
                  <View style={styles.rowBetween}><AppText variant="bodyBold">{b.rider || 'Rider'}</AppText><Badge text={(b.tag || 'FINISHED').toUpperCase()} tone="black" /></View>
                  <AppText variant="small" style={{ marginBottom: 10 }}>{b.when}</AppText>
                  <View style={styles.infoRow}>
                    <View style={styles.info}><AppText variant="label" style={{ fontSize: 8 }}>TO</AppText><AppText variant="bodyBold" style={{ fontSize: 12 }}>{b.destination}</AppText></View>
                    <View style={styles.info}><AppText variant="label" style={{ fontSize: 8 }}>FARE</AppText><AppText variant="bodyBold">{peso(b.fare)}</AppText></View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    <Button title="Rate Trip" variant="outline" small icon="star-outline" style={{ flex: 1 }} onPress={() => Alert.alert('Rate trip', 'Rating past trips is not part of the prototype yet.')} />
                    <Button title="Book Again" variant="accent" small icon="refresh" style={{ flex: 1 }} onPress={() => navigation.navigate('Destination')} />
                  </View>
                </Card>
              ))}
            </>
          ) : <EmptyState title="No completed bookings" message="Finished trips will appear here." />
        ) : null}
        {tab === 'CANCELLED' ? (
          cancelled.length ? cancelled.map((b) => (
            <Card key={b.id} style={{ marginBottom: 12 }}>
              <View style={styles.rowBetween}><AppText variant="bodyBold">{b.id}</AppText><Badge text="CANCELLED" tone="red" /></View>
              <View style={{ marginTop: 10 }}><RouteSummary pickup={b.pickup} destination={b.destination} /></View>
            </Card>
          )) : <EmptyState title="No Cancelled Bookings" message="You haven't cancelled any rides in the last 30 days." />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.gray100 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  promo: { height: 150, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.black, justifyContent: 'center', marginVertical: 10 },
  learn: { alignSelf: 'flex-start', backgroundColor: colors.yellow, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4 },
  infoRow: { flexDirection: 'row', gap: 10 },
  info: { flex: 1, backgroundColor: colors.gray50, borderRadius: radius.sm, padding: 10 },
});
