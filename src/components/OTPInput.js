import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppText from './AppText';
import { colors, radius } from '../theme';

export default function OTPInput({ code, length = 4, error }) {
  return (
    <View style={styles.row}>
      {Array.from({ length }).map((_, i) => {
        const active = i === code.length;
        return (
          <View key={i} style={[styles.box, active && styles.active, !!error && styles.error]}>
            <AppText variant="h2">{code[i] || ''}</AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 14 },
  box: { width: 58, height: 66, borderRadius: radius.md, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  active: { borderColor: colors.yellow, backgroundColor: colors.white },
  error: { borderColor: colors.red },
});
