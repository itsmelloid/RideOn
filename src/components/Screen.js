import React from 'react';
import { View, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';

// Safe-area aware screen wrapper. Use edges to control which sides get padding.
export default function Screen({ children, bg = colors.white, edges = ['top', 'bottom'], dark = false, style }) {
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: bg }, style]} edges={edges}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <View style={styles.flex}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
