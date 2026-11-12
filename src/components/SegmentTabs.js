import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import AppText from './AppText';
import { colors, radius } from '../theme';

// Pill tabs. variant "onYellow" renders the black active pill inside a translucent track (Figma header tabs).
export default function SegmentTabs({ tabs, value, onChange, variant = 'onYellow' }) {
  if (variant === 'chips') {
    return (
      <View style={styles.chipRow}>
        {tabs.map((t) => {
          const active = t === value;
          return (
            <Pressable key={t} onPress={() => onChange(t)} style={[styles.chip, active && styles.chipActive]} accessibilityRole="tab">
              <AppText variant="bodyBold" color={active ? colors.white : colors.gray600} style={{ fontSize: 12 }}>{t}</AppText>
            </Pressable>
          );
        })}
      </View>
    );
  }
  return (
    <View style={styles.track}>
      {tabs.map((t) => {
        const active = t === value;
        return (
          <Pressable key={t} onPress={() => onChange(t)} style={[styles.tab, active && styles.tabActive]} accessibilityRole="tab">
            <AppText variant="label" color={active ? colors.white : colors.black} style={{ letterSpacing: 0.5 }}>{t}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: radius.pill, padding: 4, marginTop: 16 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.pill },
  tabActive: { backgroundColor: colors.black },
  chipRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingVertical: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200 },
  chipActive: { backgroundColor: colors.black, borderColor: colors.black },
});
