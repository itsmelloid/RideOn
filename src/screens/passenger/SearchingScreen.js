import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RideMap from '../../components/RideMap';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import ConfirmDialog from '../../components/ConfirmDialog';
import { FloatingBack } from '../../components/misc';
import { useBooking } from '../../context/BookingContext';
import { peso } from '../../utils/format';
import { colors, radius, shadow } from '../../theme';

export default function SearchingScreen({ navigation }) {
  const { pickup, fare, status, cancelRide } = useBooking();
  const [confirm, setConfirm] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }), Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    if (status === 'found') navigation.replace('RiderFound');
    if (status === 'noRider') navigation.replace('NoRiders');
  }, [status, navigation]);

  const stop = () => { setConfirm(false); cancelRide(); navigation.popToTop(); };

  return (
    <View style={styles.flex}>
      <RideMap style={styles.flex} pickup={pickup.coords} interactive={false} />
      <FloatingBack onPress={() => setConfirm(true)} />
      <View style={styles.live}><View style={styles.liveDot} /><AppText variant="label" color={colors.black} style={{ fontSize: 9 }}>LIVE SEARCH</AppText></View>
      <View style={[styles.sheet, shadow.strong]}>
        <View style={styles.handle} />
        <Animated.View style={[styles.pulse, { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) }], opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] }) }]}>
          <Ionicons name="search" size={28} color={colors.yellow} />
        </Animated.View>
        <AppText variant="h2" align="center" style={{ fontSize: 20, marginTop: 14 }}>Searching for a Rider...</AppText>
        <AppText variant="small" align="center" style={{ fontSize: 13, marginVertical: 8 }}>Connecting you with the nearest available driver in your area.</AppText>
        <View style={styles.summary}>
          <View style={{ flex: 1 }}>
            <AppText variant="label" style={{ fontSize: 8 }}>PICKUP - DESTINATION</AppText>
            <AppText variant="bodyBold" numberOfLines={2}>{pickup.name}</AppText>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <AppText variant="label" style={{ fontSize: 8 }}>FARE</AppText>
            <AppText variant="h3">{peso(fare?.total)}</AppText>
          </View>
        </View>
        <Button title="Edit Trip" variant="accent" icon="create-outline" onPress={() => { cancelRide(); navigation.navigate('Destination'); }} style={{ marginTop: 14 }} />
        <Button title="Cancel Request" variant="outline" icon="close" onPress={() => setConfirm(true)} style={{ marginTop: 10 }} />
      </View>
      <ConfirmDialog visible={confirm} title="Cancel your request?" message="We'll stop searching for a rider." confirmText="Cancel request" destructive onCancel={() => setConfirm(false)} onConfirm={stop} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  live: { position: 'absolute', top: 60, right: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },
  sheet: { position: 'absolute', left: 14, right: 14, bottom: 24, backgroundColor: colors.white, borderRadius: 32, padding: 20 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.gray200, marginBottom: 14 },
  pulse: { alignSelf: 'center', width: 72, height: 72, borderRadius: 36, backgroundColor: colors.yellowSoft, alignItems: 'center', justifyContent: 'center' },
  summary: { flexDirection: 'row', backgroundColor: colors.gray50, borderRadius: radius.md, padding: 14, marginTop: 4 },
});
