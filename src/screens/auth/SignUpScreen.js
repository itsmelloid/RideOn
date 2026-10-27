import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { useAuth } from '../../context/AuthContext';
import { validateSignUp } from '../../utils/validation';
import { colors } from '../../theme';

export default function SignUpScreen({ navigation }) {
  const { selectedRole, signUp } = useAuth();
  const roleName = selectedRole === 'rider' ? 'Rider' : 'Passenger';
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', password: '', confirm: '', agreed: false });
  const [errors, setErrors] = useState({});
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    const e = validateSignUp(form);
    setErrors(e);
    if (Object.keys(e).length) return;
    try {
      await signUp({ fullName: form.fullName.trim(), phone: form.phone.replace(/[\s-]/g, ''), email: form.email.trim(), password: form.password, role: selectedRole });
    } catch (error) {
      Alert.alert('Sign up failed', error.message);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.top}>
            <Pressable onPress={() => navigation.goBack()} style={styles.back} accessibilityLabel="Go back"><Ionicons name="chevron-back" size={20} /></Pressable>
            <View style={styles.dots}><View style={styles.dot} /><View style={[styles.dot, styles.dotActive]} /></View>
            <View style={{ width: 38 }} />
          </View>
          <AppText variant="h1" style={{ marginTop: 6 }}>Create {roleName} Account</AppText>
          <AppText variant="small" style={{ fontSize: 13, marginBottom: 20 }}>Join our community and start {selectedRole === 'rider' ? 'earning' : 'riding'} today.</AppText>
          <Input label="Full Name" icon="person-outline" placeholder="John Doe" autoCapitalize="words" value={form.fullName} onChangeText={set('fullName')} error={errors.fullName} />
          <Input label="Mobile Number" icon="call-outline" placeholder="09XX XXX XXXX" keyboardType="phone-pad" value={form.phone} onChangeText={set('phone')} error={errors.phone} />
          <Input label="Email Address" icon="mail-outline" placeholder="john@example.com" keyboardType="email-address" value={form.email} onChangeText={set('email')} error={errors.email} />
          <Input label="Password" icon="lock-closed-outline" placeholder="At least 8 characters" secureTextEntry value={form.password} onChangeText={set('password')} error={errors.password} />
          <Input label="Confirm Password" icon="help-circle-outline" placeholder="••••••••" secureTextEntry value={form.confirm} onChangeText={set('confirm')} error={errors.confirm} />
          <Pressable style={styles.agree} onPress={() => set('agreed')(!form.agreed)} accessibilityRole="checkbox" accessibilityState={{ checked: form.agreed }}>
            <View style={[styles.box, form.agreed && { backgroundColor: colors.yellow, borderColor: colors.yellow }]}>
              {form.agreed ? <Ionicons name="checkmark" size={12} color={colors.black} /> : null}
            </View>
            <AppText variant="small" style={{ flex: 1, marginLeft: 10, fontSize: 11 }}>
              By signing up, you agree to our <AppText variant="small" weight="bold" color={colors.black} style={{ fontSize: 11, textDecorationLine: 'underline' }}>Terms of Service</AppText> and <AppText variant="small" weight="bold" color={colors.black} style={{ fontSize: 11, textDecorationLine: 'underline' }}>Privacy Policy</AppText>.
            </AppText>
          </Pressable>
          {errors.agreed ? <AppText variant="small" color={colors.red} style={{ marginTop: 4 }}>{errors.agreed}</AppText> : null}
          <Button title="Create Account" iconRight="arrow-forward" onPress={submit} style={{ marginTop: 18 }} />
          <View style={styles.login}>
            <AppText variant="small">Already have an account? </AppText>
            <Pressable onPress={() => navigation.navigate('Login')}><AppText variant="bodyBold" style={{ fontSize: 12, textDecorationLine: 'underline' }}>Log In</AppText></Pressable>
          </View>
          <AppText variant="label" align="center" style={{ fontSize: 8, marginTop: 14 }}>RIDEON {roleName.toUpperCase()} ENROLLMENT</AppText>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 22, paddingBottom: 40 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 8, height: 4, borderRadius: 2, backgroundColor: colors.gray200 },
  dotActive: { width: 26, backgroundColor: colors.yellow },
  agree: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 },
  box: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: colors.gray300, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  login: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
});
