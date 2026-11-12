import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Linking } from 'react-native';
import YellowHeader from '../../components/YellowHeader';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Avatar, ListRow, userAvatarSource } from '../../components/misc';
import { useAuth } from '../../context/AuthContext';
import { images } from '../../data/mock';
import { colors, radius, shadow } from '../../theme';

export default function PassengerProfileScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const [logout, setLogout] = useState(false);
  const [del, setDel] = useState(false);
  const soon = (t) => Alert.alert(t, 'This section is not part of the prototype yet.');

  return (
    <View style={styles.flex}>
      <YellowHeader title="Profile" onBack={() => navigation.navigate('Home')} right={{ icon: 'settings-sharp', label: 'Settings', onPress: () => soon('Settings') }} tall>
        <View style={{ alignItems: 'center', marginTop: 10, marginBottom: 26 }}>
          <Avatar source={userAvatarSource(user, images)} name={user?.name} size={96} verified />
          <AppText variant="h2" style={{ marginTop: 10 }}>{user?.name}</AppText>
          <Badge text="✓ VERIFIED PASSENGER" tone="black" style={{ marginTop: 6 }} />
        </View>
      </YellowHeader>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 30 }}>
        <View style={[styles.stats, shadow.card]}>
          {[['Rides', user?.rides ?? 0], ['Avg Rating', `${user?.rating ?? 5} ★`], ['Member Since', user?.since ?? 2026]].map(([l, v]) => (
            <View key={l} style={{ alignItems: 'center', flex: 1 }}>
              <AppText variant="label" style={{ fontSize: 8 }}>{l}</AppText>
              <AppText variant="h2" style={{ fontSize: 20 }}>{v}</AppText>
            </View>
          ))}
        </View>
        <View style={{ gap: 10, marginTop: 14 }}>
          <ListRow icon="person" title="Edit Profile" onPress={() => soon('Edit Profile')} />
          <ListRow icon="calendar" title="My Bookings" onPress={() => navigation.navigate('Bookings')} />
          <ListRow icon="wallet" title="Wallet & Payments" onPress={() => navigation.navigate('Wallet')} />
          <ListRow icon="notifications" title="Notification Settings" onPress={() => soon('Notification Settings')} />
          <ListRow icon="headset" title="Help & Support" onPress={() => Linking.openURL('mailto:support@rideon.example')} />
          <ListRow icon="information-circle" title="About RideOn" onPress={() => Alert.alert('RideOn', 'Version 1.0.0\nServing the heart of Agusan del Sur.')} />
        </View>
        <View style={{ alignItems: 'center', marginVertical: 16 }}>
          <ListRow icon="trash-outline" title="Delete Account" danger onPress={() => setDel(true)} />
        </View>
        <Button title="Log Out" icon="log-out-outline" onPress={() => setLogout(true)} />
      </ScrollView>
      <ConfirmDialog visible={logout} title="Log out?" message="You can log back in anytime." confirmText="Log out" onCancel={() => setLogout(false)} onConfirm={() => { setLogout(false); signOut(); }} />
      <ConfirmDialog visible={del} title="Delete account?" message="Account deletion needs a backend. In this prototype it only logs you out." confirmText="Continue" destructive onCancel={() => setDel(false)} onConfirm={() => { setDel(false); signOut(); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.gray100 },
  stats: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: radius.lg, paddingVertical: 14, marginTop: -26 },
});
