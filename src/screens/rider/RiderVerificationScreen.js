import React from 'react';
import { View, ScrollView, StyleSheet, Alert, Linking, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import YellowHeader from '../../components/YellowHeader';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Card from '../../components/Card';
import { IconBox } from '../../components/misc';
import { useAuth } from '../../context/AuthContext';
import { RIDER_DOCUMENTS } from '../../data/mock';
import { shortDateTime } from '../../utils/format';
import { colors, radius } from '../../theme';

const Step = ({ title, sub, state }) => (
  <View style={{ flexDirection: 'row', marginBottom: 14 }}>
    <View style={[styles.dotWrap, state === 'done' && { backgroundColor: colors.black, borderColor: colors.black }, state === 'now' && { borderColor: colors.yellow }]}>
      {state === 'done' ? <Ionicons name="checkmark" size={12} color={colors.yellow} /> : state === 'now' ? <View style={styles.nowDot} /> : null}
    </View>
    <View style={{ marginLeft: 12, flex: 1 }}>
      <AppText variant="bodyBold" color={state === 'todo' ? colors.gray400 : colors.black}>{title}</AppText>
      <AppText variant="small" style={{ fontSize: 11 }}>{sub}</AppText>
    </View>
  </View>
);

export default function RiderVerificationScreen() {
  const { user, signOut } = useAuth();
  const when = shortDateTime(user?.submittedAt);
  const support = () => Linking.openURL('mailto:support@rideon.example?subject=Rider%20application');

  return (
    <View style={styles.flex}>
      <YellowHeader title="Verification" onBack={signOut} backIcon="log-out-outline" />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 30 }}>
        <Card style={{ alignItems: 'center' }}>
          <IconBox icon="time" size={64} round />
          <Badge text="PENDING REVIEW" tone="yellow" style={{ marginTop: 10 }} />
          <AppText variant="h2" align="center" style={{ marginTop: 8 }}>Application under review</AppText>
          <AppText variant="small" align="center" style={{ marginTop: 6 }}>We’re checking your documents. You can’t go online or receive bookings until you’re approved.</AppText>
        </Card>
        <Card style={{ marginTop: 12 }}>
          <AppText variant="label" style={{ marginBottom: 12 }}>APPLICATION PROGRESS</AppText>
          <Step title="Application submitted" sub={when} state="done" />
          <Step title="Documents received" sub={when} state="done" />
          <Step title="Admin review" sub="In progress" state="now" />
          <Step title="Decision" sub="Approved, rejected, or more info needed" state="todo" />
        </Card>
        <Card style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <AppText variant="label">YOUR DOCUMENTS</AppText>
            <AppText variant="label" color={colors.black} style={{ textDecorationLine: 'underline' }}>View documents</AppText>
          </View>
          {RIDER_DOCUMENTS.map((d) => (
            <View key={d.id} style={styles.doc}>
              <IconBox icon="document-outline" size={34} bg={colors.gray100} color={colors.gray600} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <AppText variant="bodyBold">{d.title}</AppText>
                <AppText variant="small" color={d.warn ? colors.red : colors.gray500} style={{ fontSize: 10 }}>{d.sub}</AppText>
              </View>
              <Badge text={d.status.toUpperCase()} tone={d.status === 'Approved' ? 'black' : d.warn ? 'soft' : 'yellow'} />
            </View>
          ))}
          <Button title="Upload Missing Document" variant="outline" small icon="cloud-upload-outline" style={{ marginTop: 10 }} onPress={() => Alert.alert('Upload', 'Re-uploading documents needs the backend; not part of the prototype yet.')} />
        </Card>
        <View style={styles.warn}><Ionicons name="alert-circle" size={16} color={colors.red} /><AppText variant="small" color={colors.red} style={{ flex: 1, marginLeft: 8, fontSize: 11 }}>Pending, rejected, or suspended riders can’t go online or receive new bookings.</AppText></View>
        <Button title="Resubmit for Review" upper onPress={() => Alert.alert('Resubmitted', 'Your application was sent for another review.')} />
        <Button title="Contact Support" variant="outline" upper onPress={support} style={{ marginTop: 10 }} />
        <Pressable onPress={signOut} style={{ alignItems: 'center', marginTop: 14 }}><AppText variant="small">Log out</AppText></Pressable>
        {__DEV__ ? <AppText variant="small" align="center" style={{ marginTop: 10, fontSize: 10 }}>For testing, approve this rider from Supabase, then sign out and sign in again.</AppText> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.gray100 },
  dotWrap: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.gray300, alignItems: 'center', justifyContent: 'center' },
  nowDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.yellow },
  doc: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  warn: { flexDirection: 'row', backgroundColor: colors.gray200, borderRadius: radius.md, padding: 12, marginVertical: 12, alignItems: 'center' },
});
