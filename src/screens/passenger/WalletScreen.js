import React, { useState } from 'react';
import { View, ScrollView, Image, Modal, Pressable, StyleSheet, Alert, Linking } from 'react-native';
import YellowHeader from '../../components/YellowHeader';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Card from '../../components/Card';
import { Avatar, IconBox, SectionLabel, userAvatarSource } from '../../components/misc';
import { useBooking } from '../../context/BookingContext';
import { useAuth } from '../../context/AuthContext';
import { images } from '../../data/mock';
import { peso } from '../../utils/format';
import { colors, radius, shadow } from '../../theme';

const AMOUNTS = [50, 100, 200, 500];

export default function WalletScreen({ navigation }) {
  const { balance, transactions, topUp } = useBooking();
  const { user } = useAuth();
  const [showAll, setShowAll] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [amount, setAmount] = useState(100);
  const list = showAll ? transactions : transactions.slice(0, 3);

  const actions = [
    { icon: 'add', label: 'TOP UP', onPress: () => setTopUpOpen(true) },
    { icon: 'time', label: 'HISTORY', onPress: () => setShowAll(true) },
    { icon: 'card', label: 'METHODS', onPress: () => Alert.alert('Payment methods', 'Available now: RideOn Wallet and Cash.\nCards and e-wallets need a payment provider.') },
  ];

  return (
    <View style={styles.flex}>
      <YellowHeader title="Wallet" onBack={() => navigation.navigate('Home')} right={{ icon: 'ellipsis-vertical', label: 'More', onPress: () => Alert.alert('Wallet', 'More options coming soon.') }} tall>
        <View style={[styles.balance, shadow.strong]}>
          <AppText variant="label" color={colors.gray400}>TOTAL BALANCE</AppText>
          <AppText variant="h1" color={colors.white} style={{ fontSize: 34, marginTop: 4 }}>{peso(balance)}</AppText>
          <View style={styles.balFoot}>
            <Avatar source={userAvatarSource(user, images)} name={user?.name} size={30} />
            <AppText variant="label" color={colors.yellow} style={{ fontSize: 9 }}>RIDEON PASSENGER</AppText>
          </View>
        </View>
      </YellowHeader>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 30 }}>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
          {actions.map((a) => (
            <Pressable key={a.label} onPress={a.onPress} style={[styles.action, shadow.card]} accessibilityRole="button" accessibilityLabel={a.label}>
              <IconBox icon={a.icon} size={38} round />
              <AppText variant="label" color={colors.black} style={{ marginTop: 8, fontSize: 9 }}>{a.label}</AppText>
            </Pressable>
          ))}
        </View>
        <SectionLabel style={{ marginTop: 18 }} action={showAll ? 'SHOW LESS' : 'VIEW ALL'} onAction={() => setShowAll((s) => !s)}>RECENT TRANSACTIONS</SectionLabel>
        {list.map((t) => (
          <Card key={t.id} style={styles.tx}>
            <IconBox icon={t.icon} size={42} round bg={t.status === 'Failed' ? colors.gray600 : colors.black} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <AppText variant="bodyBold">{t.title}</AppText>
              <AppText variant="small" style={{ fontSize: 10 }}>{t.date}</AppText>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <AppText variant="bodyBold">{peso(t.amount, { sign: true })}</AppText>
              <Badge text={t.status.toUpperCase()} tone={t.status === 'Failed' ? 'gray' : 'black'} />
            </View>
          </Card>
        ))}
        <Card dark style={styles.help}>
          <View style={{ flex: 1 }}>
            <AppText variant="h3" color={colors.white}>Having issues?</AppText>
            <AppText variant="small" color={colors.gray400} style={{ fontSize: 11 }}>Our team is here to help with your payments.</AppText>
          </View>
          <Pressable style={styles.helpBtn} onPress={() => Linking.openURL('mailto:support@rideon.example?subject=Payment%20help')}><AppText variant="label" color={colors.black} style={{ fontSize: 9 }}>REQUEST{'\n'}HELP</AppText></Pressable>
        </Card>
        <View style={styles.offers}>
          <Image source={images.bannerOffers} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <AppText variant="h3" color={colors.white} style={{ padding: 16, maxWidth: 200 }}>Exclusive Offers on your next Top Up!</AppText>
        </View>
      </ScrollView>
      <Modal transparent visible={topUpOpen} animationType="slide" onRequestClose={() => setTopUpOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <AppText variant="h2">Top Up Wallet</AppText>
            <AppText variant="small" style={{ marginVertical: 8 }}>Prototype only — no real payment is made.</AppText>
            <View style={{ flexDirection: 'row', gap: 10, marginVertical: 12 }}>
              {AMOUNTS.map((a) => (
                <Pressable key={a} onPress={() => setAmount(a)} style={[styles.chip, amount === a && { backgroundColor: colors.black }]}>
                  <AppText variant="bodyBold" color={amount === a ? colors.yellow : colors.black}>₱{a}</AppText>
                </Pressable>
              ))}
            </View>
            <Button title={`Add ${peso(amount)}`} variant="accent" onPress={() => { topUp(amount); setTopUpOpen(false); }} />
            <Button title="Cancel" variant="ghost" onPress={() => setTopUpOpen(false)} style={{ marginTop: 6 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.gray100 },
  balance: { backgroundColor: colors.black, borderRadius: radius.xl, padding: 20, marginTop: 16, marginBottom: -50 },
  balFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  action: { flex: 1, backgroundColor: colors.white, borderRadius: radius.lg, alignItems: 'center', paddingVertical: 14, marginTop: 58 },
  tx: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, padding: 12 },
  help: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  helpBtn: { backgroundColor: colors.yellow, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  offers: { height: 110, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.black, marginTop: 12, justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 34 },
  chip: { flex: 1, backgroundColor: colors.gray100, borderRadius: radius.md, alignItems: 'center', paddingVertical: 12 },
});
