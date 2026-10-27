import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import YellowHeader from '../../components/YellowHeader';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Card from '../../components/Card';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Avatar, ListRow, userAvatarSource } from '../../components/misc';
import { useAuth } from '../../context/AuthContext';
import { images } from '../../data/mock';
import { colors, radius } from '../../theme';

const Info = ({ l, v }) => <View style={styles.info}><AppText variant="small">{l}</AppText><AppText variant="bodyBold">{v}</AppText></View>;
const Doc = ({ title, sub, status, warn }) => (
  <View style={styles.doc}>
    <Ionicons name="document-outline" size={20} color={colors.gray500} />
    <View style={{ flex: 1, marginLeft: 10 }}><AppText variant="bodyBold">{title}</AppText><AppText variant="small" color={warn ? colors.yellowDark : colors.gray500} style={{ fontSize: 10 }}>{sub}</AppText></View>
    <Badge text={status} tone={status === 'APPROVED' ? 'black' : 'yellow'} />
  </View>
);

export default function RiderProfileScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const [logout, setLogout] = useState(false);
  return (
    <View style={styles.flex}>
      <YellowHeader title="Profile" onBack={() => navigation.navigate('Dashboard')} right={{ icon: 'create-outline', label: 'Edit profile', onPress: () => Alert.alert('Edit profile', 'Identity and vehicle changes need admin approval.') }} />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 30 }}>
        <Card style={{ alignItems: 'center' }}>
          <Avatar source={userAvatarSource(user, images)} name={user?.name} size={76} />
          <AppText variant="h2" style={{ marginTop: 8 }}>{user?.name}</AppText>
          <Badge text="✓ VERIFIED RIDER" tone="black" style={{ marginTop: 4 }} />
          <View style={{ flexDirection: 'row', marginTop: 14, alignSelf: 'stretch' }}>
            {[['RATING', '4.9'], ['TRIPS', '312'], ['RIDER ID', user?.riderId || 'RD-0042']].map(([l, v]) => (
              <View key={l} style={{ flex: 1, alignItems: 'center' }}><AppText variant="h3">{v}</AppText><AppText variant="label" style={{ fontSize: 8 }}>{l}</AppText></View>
            ))}
          </View>
        </Card>
        <Card style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <AppText variant="label" color={colors.black}>VEHICLE</AppText>
            <AppText variant="label" color={colors.black} style={{ textDecorationLine: 'underline' }} onPress={() => Linking.openURL('mailto:support@rideon.example?subject=Vehicle%20change')}>Request change</AppText>
          </View>
          <Info l="Type" v="Tricycle" /><Info l="Plate number" v={user?.plate || 'TRI-4821'} /><Info l="Registration valid until" v="Jan 15, 2027" />
        </Card>
        <Card style={{ marginTop: 12 }}>
          <AppText variant="label" color={colors.black} style={{ marginBottom: 6 }}>DOCUMENTS</AppText>
          <Doc title="Valid ID" sub="No expiry" status="APPROVED" />
          <Doc title="Driver's License" sub="Expires Mar 2028" status="APPROVED" />
          <Doc title="Operating Permit" sub="Expires in 12 days" status="EXPIRING" warn />
          <Button title="Update Documents" variant="outline" small icon="cloud-upload-outline" style={{ marginTop: 10 }} onPress={() => Alert.alert('Update documents', 'Document changes need the backend and admin approval.')} />
        </Card>
        <View style={styles.warn}><Ionicons name="alert-circle" size={16} color={colors.red} /><AppText variant="small" color={colors.red} style={{ flex: 1, marginLeft: 8, fontSize: 11 }}>Changes to identity, vehicle, or eligibility need admin approval before you can receive new bookings.</AppText></View>
        <View style={{ gap: 8 }}>
          <ListRow icon="lock-closed" title="Change Password" onPress={() => Alert.alert('Change password', 'Needs a backend.')} />
          <ListRow icon="notifications" title="Notifications" onPress={() => Alert.alert('Notifications', 'No new notifications.')} />
          <ListRow icon="help-circle" title="Support / Report" onPress={() => Linking.openURL('mailto:support@rideon.example')} />
          <ListRow icon="log-out-outline" title="Log Out" danger onPress={() => setLogout(true)} />
        </View>
      </ScrollView>
      <ConfirmDialog visible={logout} title="Log out?" message="You will go offline." confirmText="Log out" onCancel={() => setLogout(false)} onConfirm={() => { setLogout(false); signOut(); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.gray100 },
  info: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  doc: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  warn: { flexDirection: 'row', backgroundColor: colors.gray200, borderRadius: radius.md, padding: 12, marginVertical: 12 },
});
