import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import YellowHeader from '../../components/YellowHeader';
import AppText from '../../components/AppText';
import Card from '../../components/Card';
import { TERMS, PRIVACY, LEGAL_VERSION } from '../../data/legal';
import { colors } from '../../theme';

export default function LegalScreen({ navigation, route }) {
  const privacy = route.params?.kind === 'privacy';
  const sections = privacy ? PRIVACY : TERMS;
  return <View style={styles.flex}><YellowHeader title={privacy ? 'Privacy Policy' : 'Terms of Service'} onBack={() => navigation.goBack()} /><ScrollView contentContainerStyle={styles.scroll}><AppText variant="small" color={colors.gray600}>Version: {LEGAL_VERSION}</AppText>{sections.map(([heading, text]) => <Card key={heading} style={styles.card}><AppText variant="h3">{heading}</AppText><AppText variant="small" style={styles.copy}>{text}</AppText></Card>)}</ScrollView></View>;
}
const styles = StyleSheet.create({ flex: { flex: 1, backgroundColor: colors.gray100 }, scroll: { padding: 18, paddingBottom: 32 }, card: { marginTop: 12 }, copy: { marginTop: 8, lineHeight: 19 } });
