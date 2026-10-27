import React from 'react';
import { View, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from './AppText';
import { colors, radius } from '../theme';

export const Avatar = ({ source, name = '', size = 48, verified, online }) => (
  <View style={{ width: size, height: size }}>
    {source ? (
      <Image source={source} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.gray200 }} />
    ) : (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' }}>
        <AppText variant="bodyBold" color={colors.yellow} style={{ fontSize: size * 0.36 }}>{name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?'}</AppText>
      </View>
    )}
    {verified ? (
      <View style={[styles.avatarBadge, { backgroundColor: colors.green }]}>
        <Ionicons name="checkmark" size={10} color={colors.white} />
      </View>
    ) : null}
    {online ? <View style={[styles.avatarBadge, { backgroundColor: colors.green, width: 12, height: 12, borderRadius: 6 }]} /> : null}
  </View>
);

export const IconBox = ({ icon, size = 40, bg = colors.black, color = colors.yellow, round }) => (
  <View style={{ width: size, height: size, borderRadius: round ? size / 2 : 12, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
    <Ionicons name={icon} size={size * 0.5} color={color} />
  </View>
);

export const StarRating = ({ value = 0, onChange, size = 30 }) => (
  <View style={{ flexDirection: 'row', gap: 6 }}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Pressable key={n} onPress={onChange ? () => onChange(n) : undefined} hitSlop={6} accessibilityLabel={`${n} star`}>
        <Ionicons name={n <= value ? 'star' : 'star-outline'} size={size} color={colors.yellow} />
      </Pressable>
    ))}
  </View>
);

export const SectionLabel = ({ children, action, onAction, style }) => (
  <View style={[styles.sectionRow, style]}>
    <AppText variant="label">{children}</AppText>
    {action ? (
      <Pressable onPress={onAction} hitSlop={8}>
        <AppText variant="label" color={colors.yellowDark}>{action}</AppText>
      </Pressable>
    ) : null}
  </View>
);

export const EmptyState = ({ icon = 'ban-outline', title, message }) => (
  <View style={styles.empty}>
    <Ionicons name={icon} size={40} color={colors.gray400} />
    <AppText variant="bodyBold" style={{ marginTop: 10 }}>{title}</AppText>
    {message ? <AppText variant="small" align="center" style={{ marginTop: 4, maxWidth: 260 }}>{message}</AppText> : null}
  </View>
);

export const StatBox = ({ icon, label, value, dark }) => (
  <View style={[styles.stat, dark && { backgroundColor: colors.black }]}>
    {icon ? <IconBox icon={icon} size={34} bg={dark ? colors.yellow : colors.black} color={dark ? colors.black : colors.yellow} /> : null}
    <AppText variant="label" style={{ marginTop: icon ? 14 : 0 }} color={dark ? colors.gray400 : colors.gray500}>{label}</AppText>
    <AppText variant="h2" color={dark ? colors.white : colors.black} style={{ marginTop: 2 }}>{value}</AppText>
  </View>
);

export const Divider = ({ style }) => <View style={[{ height: 1, backgroundColor: colors.gray100, marginVertical: 12 }, style]} />;

export const ListRow = ({ icon, title, onPress, danger, last }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [styles.listRow, pressed && { backgroundColor: colors.gray50 }]} accessibilityRole="button">
    {icon ? <IconBox icon={icon} size={38} bg={danger ? colors.redSoft : colors.black} color={danger ? colors.red : colors.yellow} /> : null}
    <AppText variant="bodyBold" color={danger ? colors.red : colors.black} style={{ flex: 1, marginLeft: 12 }}>{title}</AppText>
    {!danger ? <Ionicons name="chevron-forward" size={18} color={colors.gray400} /> : null}
  </Pressable>
);

const styles = StyleSheet.create({
  avatarBadge: { position: 'absolute', right: -2, bottom: -2, width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 6 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  stat: { flex: 1, backgroundColor: colors.gray100, borderRadius: radius.lg, padding: 16 },
  listRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, padding: 12, borderRadius: radius.md },
});

// Round white back button floated over a map.
export const FloatingBack = ({ onPress, icon = 'chevron-back', right, style }) => {
  const insets = useSafeAreaInsets();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Go back" style={[{ position: 'absolute', top: insets.top + 10, [right ? 'right' : 'left']: 16, width: 42, height: 42, borderRadius: 21, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }, style]}>
      <Ionicons name={icon} size={20} color={colors.black} />
    </Pressable>
  );
};

export const userAvatarSource = (user, images) => {
  if (!user) return null;
  if (user.name === 'Adrian Dusal') return images.adrian;
  if (user.name === 'Hans Braga') return images.hans;
  return null;
};
