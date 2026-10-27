import React, { useState } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from './AppText';
import { colors, fonts, radius } from '../theme';

export default function Input({
  label,
  optional,
  icon,
  error,
  secureTextEntry,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize = 'none',
  editable = true,
  rightElement,
  style,
  ...rest
}) {
  const [hidden, setHidden] = useState(!!secureTextEntry);
  return (
    <View style={[styles.wrap, style]}>
      {label ? (
        <View style={styles.labelRow}>
          <AppText variant="label" style={styles.label}>{label}</AppText>
          {optional ? <AppText variant="label" color={colors.gray400}>Optional</AppText> : null}
        </View>
      ) : null}
      <View style={[styles.field, !!error && styles.fieldError, !editable && { opacity: 0.7 }]}>
        {icon ? <Ionicons name={icon} size={18} color={colors.gray400} style={{ marginRight: 10 }} /> : null}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.gray400}
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          accessibilityLabel={label || placeholder}
          {...rest}
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} accessibilityLabel="Toggle password visibility">
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.gray500} />
          </Pressable>
        ) : null}
        {rightElement}
      </View>
      {error ? <AppText variant="small" color={colors.red} style={{ marginTop: 4 }}>{error}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { color: colors.gray600 },
  field: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.gray100, borderRadius: radius.md, borderWidth: 1.5, borderColor: 'transparent', paddingHorizontal: 14, minHeight: 52 },
  fieldError: { borderColor: colors.red, backgroundColor: colors.redSoft },
  input: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.black, paddingVertical: 12 },
});
