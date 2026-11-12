import React from 'react';
import { Pressable, ActivityIndicator, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from './AppText';
import { colors, radius, shadow } from '../theme';

// variants: primary (black) | accent (yellow) | outline | danger | ghost | dark (for black cards)
const VARIANTS = {
  primary: { bg: colors.black, fg: colors.white, iconColor: colors.yellow, border: colors.black },
  accent: { bg: colors.yellow, fg: colors.black, iconColor: colors.black, border: colors.yellow },
  outline: { bg: colors.white, fg: colors.black, iconColor: colors.black, border: colors.gray200 },
  outlineYellow: { bg: 'transparent', fg: colors.black, iconColor: colors.black, border: colors.black },
  danger: { bg: colors.redSoft, fg: colors.red, iconColor: colors.red, border: colors.redBorder },
  dark: { bg: 'rgba(255,255,255,0.12)', fg: colors.white, iconColor: colors.white, border: 'transparent' },
  ghost: { bg: 'transparent', fg: colors.gray500, iconColor: colors.gray500, border: 'transparent' },
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  small = false,
  upper = false,
  style,
}) {
  const v = VARIANTS[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={inactive ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        small && styles.small,
        { backgroundColor: v.bg, borderColor: v.border },
        (variant === 'primary' || variant === 'accent') && !inactive && shadow.card,
        pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
        inactive && { opacity: 0.55 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Ionicons name={icon} size={18} color={v.iconColor} style={styles.iconL} /> : null}
          <AppText variant="button" color={v.fg} style={upper && { textTransform: 'uppercase', letterSpacing: 0.6 }}>
            {title}
          </AppText>
          {iconRight ? <Ionicons name={iconRight} size={18} color={v.iconColor} style={styles.iconR} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 54, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  small: { minHeight: 44, borderRadius: radius.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  iconL: { marginRight: 8 },
  iconR: { marginLeft: 8 },
});
