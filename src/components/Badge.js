import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppText from './AppText';
import { colors, radius } from '../theme';

const TONES = {
  black: { bg: colors.black, fg: colors.yellow },
  yellow: { bg: colors.yellow, fg: colors.black },
  soft: { bg: colors.yellowSoft, fg: colors.black },
  green: { bg: colors.greenSoft, fg: colors.green },
  red: { bg: colors.redSoft, fg: colors.red },
  gray: { bg: colors.gray100, fg: colors.gray600 },
};

export default function Badge({ text, tone = 'black', style }) {
  const t = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }, style]}>
      <AppText variant="label" color={t.fg} style={{ fontSize: 9 }}>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({ badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill } });
