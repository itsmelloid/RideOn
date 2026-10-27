import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppText from './AppText';
import { colors } from '../theme';

// Pickup (yellow ring) -> Destination (black square) rows with a dotted connector.
export default function RouteSummary({ pickup, destination, pickupLabel = 'Pickup', destinationLabel = 'Destination', dark }) {
  const fg = dark ? colors.white : colors.black;
  const sub = dark ? colors.gray400 : colors.gray500;
  return (
    <View>
      <View style={styles.row}>
        <View style={styles.ring} />
        <View style={styles.text}>
          <AppText variant="label" color={sub}>{pickupLabel}</AppText>
          <AppText variant="bodyBold" color={fg}>{pickup}</AppText>
        </View>
      </View>
      <View style={[styles.line, { borderColor: dark ? colors.gray600 : colors.gray300 }]} />
      <View style={styles.row}>
        <View style={[styles.square, dark && { backgroundColor: colors.white }]} />
        <View style={styles.text}>
          <AppText variant="label" color={sub}>{destinationLabel}</AppText>
          <AppText variant="bodyBold" color={fg}>{destination}</AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  text: { flex: 1, marginLeft: 12 },
  ring: { width: 14, height: 14, borderRadius: 7, borderWidth: 3, borderColor: colors.yellow, marginTop: 3, backgroundColor: 'transparent' },
  square: { width: 14, height: 14, backgroundColor: colors.black, marginTop: 3, borderRadius: 2 },
  line: { height: 18, borderLeftWidth: 2, borderStyle: 'dotted', marginLeft: 6, marginVertical: 2 },
});
