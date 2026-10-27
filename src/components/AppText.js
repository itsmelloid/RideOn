import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme';

// Central text component so every label uses the Figma typography.
const VARIANTS = {
  h1: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34, color: colors.black },
  h2: { fontFamily: fonts.extrabold, fontSize: 22, lineHeight: 28, color: colors.black },
  h3: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, color: colors.black },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.ink },
  bodyBold: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, color: colors.black },
  small: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.gray500 },
  label: { fontFamily: fonts.bold, fontSize: 10, lineHeight: 14, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.gray500 },
  button: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, color: colors.black },
};

export default function AppText({ variant = 'body', color, weight, align, style, children, ...rest }) {
  return (
    <Text
      {...rest}
      style={[
        VARIANTS[variant],
        color && { color },
        weight && { fontFamily: fonts[weight] },
        align && { textAlign: align },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export const textStyles = StyleSheet.create({});
