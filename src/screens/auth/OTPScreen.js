import React, { useEffect, useState } from 'react';
import { View, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import OTPInput from '../../components/OTPInput';
import NumberPad from '../../components/NumberPad';
import { IconBox } from '../../components/misc';
import { useAuth } from '../../context/AuthContext';
import { colors, shadow } from '../../theme';

// PROTOTYPE ONLY: real SMS verification needs a backend/SMS provider (e.g. Firebase Auth, Twilio Verify).
const DEMO_CODE = '1234';
const RESEND_SECONDS = 30;

const formatPhone = (p) => (p.startsWith('09') ? `+63 ${p.slice(1, 4)} ${p.slice(4, 7)} ${p.slice(7)}` : p);

export default function OTPScreen({ navigation, route }) {
  const { data } = route.params;
  const { signUp, startSession } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [wait, setWait] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const press = (d) => {
    setError('');
    setCode((c) => (c.length < 4 ? c + d : c));
  };

  const verify = async () => {
    if (code.length < 4) return setError('Enter the 4-digit code.');
    if (code !== DEMO_CODE) return setError('Incorrect code. Please try again.');
    setLoading(true);
    try {
      const user = await signUp(data);
      await startSession(user); // RootNavigator switches to the correct app automatically
    } catch (e) {
      setLoading(false);
      Alert.alert('Sign up failed', e.message);
    }
  };

  return (
    <Screen bg={colors.yellow} edges={['top']}>
      <View style={styles.top}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back} accessibilityLabel="Go back"><Ionicons name="arrow-back" size={20} color={colors.yellow} /></Pressable>
      </View>
      <View style={[styles.card, shadow.strong]}>
        <View style={styles.iconRing}><IconBox icon="phone-portrait" size={46} round bg={colors.yellow} color={colors.black} /></View>
        <AppText variant="h2" align="center" style={{ marginTop: 14 }}>Phone Verification</AppText>
        <AppText variant="small" align="center" style={{ fontSize: 13, marginTop: 6 }}>Enter the 4-digit code sent to</AppText>
        <AppText variant="bodyBold" align="center" style={{ marginBottom: 22 }}>{formatPhone(data.phone)}</AppText>
        <OTPInput code={code} error={error} />
        {error ? <AppText variant="small" color={colors.red} align="center" style={{ marginTop: 8 }}>{error}</AppText> : null}
        <Button title="Verify Now" variant="accent" icon="checkmark-circle" loading={loading} onPress={verify} style={{ marginTop: 20 }} />
        <View style={styles.resend}>
          <AppText variant="small">Didn't receive code? </AppText>
          <Pressable disabled={wait > 0} onPress={() => { setWait(RESEND_SECONDS); Alert.alert('Code sent', 'A new code was sent (prototype).'); }}>
            <AppText variant="bodyBold" color={wait > 0 ? colors.gray400 : colors.black} style={{ fontSize: 12 }}>{wait > 0 ? `Resend in ${wait}s` : 'Resend Code'}</AppText>
          </Pressable>
        </View>
        <Pressable onPress={() => navigation.goBack()} style={{ alignItems: 'center', marginTop: 10 }}>
          <AppText variant="small"><Ionicons name="create-outline" size={12} /> Change Phone Number</AppText>
        </Pressable>
        {__DEV__ ? <AppText variant="small" align="center" style={{ marginTop: 10, fontSize: 10 }}>Demo code: {DEMO_CODE}</AppText> : null}
      </View>
      <View style={{ flex: 1 }} />
      <NumberPad onPress={press} onDelete={() => setCode((c) => c.slice(0, -1))} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { padding: 18 },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.white, marginHorizontal: 18, borderRadius: 28, padding: 22, marginTop: 10 },
  iconRing: { alignSelf: 'center', width: 80, height: 80, borderRadius: 40, backgroundColor: colors.yellowSoft, alignItems: 'center', justifyContent: 'center' },
  resend: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
});
