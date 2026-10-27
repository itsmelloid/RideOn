import React, { useState } from 'react';
import { View, Image, KeyboardAvoidingView, Platform, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { images } from '../../data/mock';
import { useAuth } from '../../context/AuthContext';
import { isValidEmail } from '../../utils/validation';
import { colors } from '../../theme';

export default function LoginScreen({ navigation }) {
  const { signIn, selectedRole } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const roleLabel = selectedRole === 'rider' ? 'Rider' : 'Passenger';

  const submit = async () => {
    const e = {};
    if (!isValidEmail(identifier)) e.identifier = 'Enter the email address used to register.';
    if (!password) e.password = 'Please enter your password.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      await signIn(identifier, password, selectedRole);
    } catch (err) {
      setErrors({ form: err.message });
      setLoading(false);
    }
  };

  return (
    <Screen bg={colors.yellow} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
          <View style={styles.header}>
            <Pressable onPress={() => navigation.goBack()} style={styles.back} accessibilityLabel="Go back"><Ionicons name="chevron-back" size={20} /></Pressable>
            <Image source={images.logo} style={styles.logo} resizeMode="contain" />
            <AppText variant="small" color={colors.ink} style={{ fontSize: 13 }}>
              Your Ride, <AppText variant="small" color={colors.white} style={{ fontSize: 13 }}>Just a Tap Away.</AppText>
            </AppText>
          </View>
          <View style={styles.sheet}>
            <AppText variant="h1">Welcome back</AppText>
            <AppText variant="small" style={{ fontSize: 13, marginBottom: 20 }}>
              {selectedRole === 'rider' ? 'Log in to accept rides.' : 'Log in to book or accept rides.'}
            </AppText>
            <Input label="Email address" icon="mail-outline" placeholder="you@example.com" value={identifier} onChangeText={setIdentifier} error={errors.identifier} keyboardType="email-address" autoCapitalize="none" />
            <Input label="Password" icon="lock-closed-outline" placeholder="Enter your password" secureTextEntry value={password} onChangeText={setPassword} error={errors.password} />
            {errors.form ? <AppText variant="small" color={colors.red} style={{ marginBottom: 8 }}>{errors.form}</AppText> : null}
            <Pressable onPress={() => Alert.alert('Forgot password', 'Password reset needs a backend service. It is not part of this prototype yet.')} style={{ alignSelf: 'flex-end', marginBottom: 16 }}>
              <AppText variant="bodyBold" style={{ fontSize: 12, textDecorationLine: 'underline' }}>Forgot password?</AppText>
            </Pressable>
            <Button title={`Log In as ${roleLabel}`} upper loading={loading} onPress={submit} />
            <View style={styles.or}><View style={styles.line} /><AppText variant="label" style={{ marginHorizontal: 10, fontSize: 9 }}>OR</AppText><View style={styles.line} /></View>
            <Button title="Create an Account" variant="outline" upper onPress={() => navigation.navigate('SignUp')} />
            <AppText variant="small" align="center" style={{ marginTop: 16, fontSize: 10 }}>By continuing, you agree to RideOn’s Terms & Privacy Policy.</AppText>
            {__DEV__ ? <AppText variant="small" align="center" style={{ marginTop: 10, fontSize: 10 }}>Demo: 09123456789 (passenger) · 09123456780 (rider) · password123</AppText> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingTop: 12, paddingBottom: 26 },
  back: { position: 'absolute', left: 18, top: 12, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.12)', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  logo: { width: 110, height: 110, marginBottom: 8 },
  sheet: { flex: 1, backgroundColor: colors.white, borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 24, paddingBottom: 40 },
  or: { flexDirection: 'row', alignItems: 'center', marginVertical: 14 },
  line: { flex: 1, height: 1, backgroundColor: colors.gray200 },
});
