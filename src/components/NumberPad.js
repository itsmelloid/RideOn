import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from './AppText';
import { colors } from '../theme';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export default function NumberPad({ onPress, onDelete }) {
  return (
    <View style={styles.pad}>
      {KEYS.map((k, i) =>
        k === '' ? (
          <View key={i} style={styles.key} />
        ) : (
          <Pressable
            key={i}
            style={({ pressed }) => [styles.key, pressed && { backgroundColor: colors.gray200 }]}
            onPress={() => (k === 'del' ? onDelete() : onPress(k))}
            accessibilityLabel={k === 'del' ? 'Delete' : k}
          >
            {k === 'del' ? <Ionicons name="backspace" size={24} color={colors.black} /> : <AppText variant="h2" style={{ fontSize: 24 }}>{k}</AppText>}
          </Pressable>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: colors.gray100, paddingBottom: 8 },
  key: { width: '33.33%', height: 58, alignItems: 'center', justifyContent: 'center' },
});
