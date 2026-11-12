import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from './AppText';
import { colors } from '../theme';

const CircleButton = ({ icon, onPress, label, dot }) => (
  <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.circle} hitSlop={8}>
    <Ionicons name={icon} size={20} color={colors.black} />
    {dot ? <View style={styles.dot} /> : null}
  </Pressable>
);

// Yellow header with rounded bottom corners used across the Figma screens.
export default function YellowHeader({ title, onBack, backIcon = 'chevron-back', right, children, tall }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 10 }, tall && { paddingBottom: 24 }]}>
      <View style={styles.row}>
        {onBack ? <CircleButton icon={backIcon} onPress={onBack} label="Go back" /> : <View style={styles.spacer} />}
        <AppText variant="h3" style={styles.title}>{title}</AppText>
        {right ? <CircleButton {...right} /> : <View style={styles.spacer} />}
      </View>
      {children}
    </View>
  );
}

export { CircleButton };

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.yellow, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, paddingHorizontal: 18, paddingBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { textTransform: 'uppercase', letterSpacing: 0.6, fontSize: 15 },
  circle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.12)', alignItems: 'center', justifyContent: 'center' },
  spacer: { width: 40 },
  dot: { position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.red },
});
