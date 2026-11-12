import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from './AppText';
import { colors, shadow } from '../theme';

// Custom tab bar. When `centerAction` is passed (passenger app) a yellow "+" button sits in the middle.
export default function BottomTabBar({ state, navigation, icons, labels, centerAction }) {
  const insets = useSafeAreaInsets();
  const routes = state.routes;
  const mid = centerAction ? Math.floor(routes.length / 2) : -1;

  const renderTab = (route, index) => {
    const active = state.index === index;
    const color = active ? colors.black : colors.gray400;
    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!active && !event.defaultPrevented) navigation.navigate(route.name);
    };
    return (
      <Pressable key={route.key} onPress={onPress} style={styles.tab} accessibilityRole="tab" accessibilityState={{ selected: active }}>
        <Ionicons name={active ? icons[route.name].active : icons[route.name].idle} size={22} color={color} />
        <AppText variant="label" color={color} style={{ fontSize: 8.5, marginTop: 3 }}>{labels[route.name]}</AppText>
      </Pressable>
    );
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }, shadow.strong]}>
      {routes.map((route, index) => (
        <React.Fragment key={route.key}>
          {index === mid ? (
            <View style={styles.centerWrap}>
              <Pressable onPress={centerAction} style={styles.fab} accessibilityRole="button" accessibilityLabel="Book a ride">
                <Ionicons name="add" size={28} color={colors.black} />
              </Pressable>
            </View>
          ) : null}
          {renderTab(route, index)}
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 10, alignItems: 'flex-end' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  centerWrap: { flex: 1, alignItems: 'center' },
  fab: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center', marginTop: -30, borderWidth: 4, borderColor: colors.white, ...shadow.card },
});
