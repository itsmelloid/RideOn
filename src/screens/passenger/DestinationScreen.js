import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RideMap from '../../components/RideMap';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import { FloatingBack } from '../../components/misc';
import { useBooking } from '../../context/BookingContext';
import { searchPlaces, getPlaceCoords } from '../../services/maps';
import { PLACES, toPlace } from '../../data/places';
import { colors, fonts, radius } from '../../theme';

const RECENT = ['assu', 'market', 'health'].map((id) => toPlace(PLACES.find((p) => p.id === id)));

export default function DestinationScreen({ navigation }) {
  const { pickup, setPickup, destination, setDestination, swap, prepareTrip } = useBooking();
  const [active, setActive] = useState('destination');
  const [pickupText, setPickupText] = useState(pickup?.name || '');
  const [destText, setDestText] = useState(destination?.name || '');
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loadingTrip, setLoadingTrip] = useState(false);
  const [error, setError] = useState('');
  const debounce = useRef(null);

  useEffect(() => setPickupText(pickup?.name || ''), [pickup]);
  useEffect(() => setDestText(destination?.name || ''), [destination]);

  const onType = (field, text) => {
    setActive(field);
    field === 'pickup' ? setPickupText(text) : setDestText(text);
    clearTimeout(debounce.current);
    if (!text.trim()) return setResults([]);
    debounce.current = setTimeout(async () => {
      setBusy(true);
      setResults(await searchPlaces(text));
      setBusy(false);
    }, 350);
  };

  const choose = async (place) => {
    setError('');
    try {
      const coords = await getPlaceCoords(place);
      const full = { ...place, coords };
      active === 'pickup' ? setPickup(full) : setDestination(full);
      setResults([]);
    } catch (e) {
      setError('Could not load that place. Please try another.');
    }
  };

  const proceed = async () => {
    if (!destination) return;
    if (pickup.id === destination.id) return setError('Pickup and destination cannot be the same.');
    setLoadingTrip(true);
    const r = await prepareTrip();
    setLoadingTrip(false);
    if (!r) return setError('Could not calculate the route. Please try again.');
    navigation.navigate('TripDetails');
  };

  const list = results.length ? results : RECENT;
  return (
    <View style={styles.flex}>
      <RideMap style={{ height: 230 }} pickup={pickup?.coords} destination={destination?.coords} interactive={false} />
      <FloatingBack onPress={() => navigation.goBack()} />
      <KeyboardAvoidingView style={styles.sheet} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.handle} />
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 22, paddingBottom: 30 }}>
          <AppText variant="h1" style={{ marginBottom: 14 }}>Where to?</AppText>
          <View style={styles.fields}>
            <View style={{ flex: 1 }}>
              <View style={[styles.field, active === 'pickup' && styles.fieldActive]}>
                <View style={styles.ring} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <AppText variant="label" style={{ fontSize: 8 }}>PICKUP</AppText>
                  <TextInput style={styles.input} value={pickupText} onFocus={() => setActive('pickup')} onChangeText={(t) => onType('pickup', t)} placeholder="Pickup location" placeholderTextColor={colors.gray400} />
                </View>
                <Ionicons name="locate" size={18} color={colors.gray500} />
              </View>
              <View style={[styles.field, { marginTop: 10 }, active === 'destination' && styles.fieldActive]}>
                <View style={styles.square} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <AppText variant="label" style={{ fontSize: 8 }}>DESTINATION</AppText>
                  <TextInput style={styles.input} value={destText} onFocus={() => setActive('destination')} onChangeText={(t) => onType('destination', t)} placeholder="Enter destination" placeholderTextColor={colors.gray400} autoFocus />
                </View>
              </View>
            </View>
            <Pressable onPress={swap} style={styles.swap} accessibilityLabel="Swap pickup and destination"><Ionicons name="swap-vertical" size={20} /></Pressable>
          </View>
          {error ? <AppText variant="small" color={colors.red} style={{ marginTop: 8 }}>{error}</AppText> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 18, marginBottom: 6 }}>
            <AppText variant="label">{results.length ? 'SEARCH RESULTS' : 'RECENT PLACES'}</AppText>
            {busy ? <ActivityIndicator size="small" color={colors.gray500} style={{ marginLeft: 8 }} /> : null}
          </View>
          {list.length === 0 ? <AppText variant="small">No places found.</AppText> : null}
          {list.map((p) => (
            <Pressable key={p.id} style={styles.place} onPress={() => choose(p)} accessibilityRole="button">
              <View style={styles.clock}><Ionicons name={results.length ? 'location-outline' : 'time-outline'} size={18} color={colors.gray600} /></View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <AppText variant="bodyBold">{p.name}</AppText>
                <AppText variant="small">{p.address}</AppText>
              </View>
            </Pressable>
          ))}
          <Button title="Continue" variant="primary" loading={loadingTrip} disabled={!destination} onPress={proceed} style={{ marginTop: 18 }} upper />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  sheet: { flex: 1, backgroundColor: colors.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, marginTop: -28 },
  handle: { alignSelf: 'center', width: 44, height: 4, borderRadius: 2, backgroundColor: colors.gray200, marginTop: 10 },
  fields: { flexDirection: 'row', alignItems: 'center' },
  field: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.gray100, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, borderColor: 'transparent' },
  fieldActive: { borderColor: colors.black, backgroundColor: colors.white },
  input: { fontFamily: fonts.bold, fontSize: 14, color: colors.black, padding: 0, marginTop: 1 },
  ring: { width: 14, height: 14, borderRadius: 7, borderWidth: 3, borderColor: colors.yellow },
  square: { width: 14, height: 14, backgroundColor: colors.black, borderRadius: 2 },
  swap: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  place: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  clock: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' },
});
