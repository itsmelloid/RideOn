import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import AdminPortal from './src/admin/AdminPortal';
import { colors, fonts } from './src/theme';

// This platform entry intentionally does not import the mobile navigator.
// react-native-screens contains native Fabric components that must not be
// evaluated by the browser, while the admin console is a browser-only portal.
export default function WebApp() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  if (!fontsLoaded) {
    return <View style={styles.center}><ActivityIndicator color={colors.yellow} /></View>;
  }

  const webPath = window.location.pathname.replace(/\/$/, '');
  if (webPath === '/admin' || webPath === '/admin/login') {
    return <AdminPortal forceLogin={webPath === '/admin/login'} />;
  }

  return <View style={styles.center}><Text style={styles.title}>RideOn Admin</Text><Text style={styles.copy}>Open /admin to access the administrator portal.</Text></View>;
}

const styles = {
  center: { flex: 1, minHeight: '100%', backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: colors.yellow, fontFamily: fonts.extrabold, fontSize: 28 },
  copy: { color: colors.white, fontFamily: fonts.regular, fontSize: 13, marginTop: 10 },
};
