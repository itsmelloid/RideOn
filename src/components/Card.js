import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius, shadow } from '../theme';

export default function Card({ children, style, dark, flat }) {
  return <View style={[styles.card, dark && styles.dark, !flat && !dark && shadow.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16 },
  dark: { backgroundColor: colors.black },
});
