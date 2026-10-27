import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RideMap from '../../components/RideMap';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Card from '../../components/Card';
import RouteSummary from '../../components/RouteSummary';
import { useBooking } from '../../context/BookingContext';
import { peso } from '../../utils/format';
import { colors } from '../../theme';

export default function NoRidersScreen({ navigation }) {
  const { pickup, destination, fare, requestRide, cancelRide } = useBooking();
  return (
    <View style={styles.flex}>
      <RideMap style={{ height: 210 }} pickup={pickup.coords} interactive={false} />
      <ScrollView style={styles.sheet} contentContainerStyle={{ padding: 20, paddingBottom: 30 }}>
        <View style={styles.icon}><Ionicons name="search" size={30} color={colors.yellow} /></View>
        <AppText variant="h2" align="center" style={{ marginTop: 14 }}>No riders available right now</AppText>
        <AppText variant="small" align="center" style={{ fontSize: 13, marginVertical: 8 }}>All nearby riders are busy. Try again in a moment, or edit your trip.</AppText>
        <Card style={{ marginTop: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Badge text="NO RIDER AVAILABLE" tone="black" />
            <AppText variant="bodyBold">Est. {peso(fare?.total)}</AppText>
          </View>
          <RouteSummary pickup={pickup.name} destination={destination.name} />
        </Card>
        <Button title="Try Again" icon="refresh" upper onPress={() => { requestRide(); navigation.replace('Searching'); }} style={{ marginTop: 16 }} />
        <Button title="Edit Trip" variant="outline" icon="create-outline" upper onPress={() => { cancelRide(); navigation.navigate('Destination'); }} style={{ marginTop: 10 }} />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <Button title="Cancel Request" variant="danger" icon="close" small upper style={{ flex: 1 }} onPress={() => { cancelRide(); navigation.popToTop(); }} />
          <Button title="Help" variant="outline" icon="help-circle-outline" small upper style={{ flex: 1 }} onPress={() => navigation.navigate('Safety')} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.gray50 },
  sheet: { flex: 1, backgroundColor: colors.gray50, marginTop: -24, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  icon: { alignSelf: 'center', width: 70, height: 70, borderRadius: 35, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' },
});
