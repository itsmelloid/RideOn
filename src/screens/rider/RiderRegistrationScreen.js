import React, { useState } from 'react';
import { View, ScrollView, Image, Pressable, Modal, KeyboardAvoidingView, Platform, StyleSheet, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { useAuth } from '../../context/AuthContext';
import { images } from '../../data/mock';
import { isValidPhone } from '../../utils/validation';
import { colors, radius } from '../../theme';

const Section = ({ icon, title }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 12 }}>
    <Ionicons name={icon} size={16} color={colors.black} />
    <AppText variant="h3" style={{ marginLeft: 8 }}>{title}</AppText>
  </View>
);

const parseDate = (v) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
  return d.getMonth() === Number(m[1]) - 1 && d.getDate() === Number(m[2]) ? d : null;
};

export default function RiderRegistrationScreen() {
  const insets = useSafeAreaInsets();
  const { user, submitRiderApplication, signOut } = useAuth();
  const [f, setF] = useState({ fullName: user?.name || '', phone: user?.phone || '', license: '', expiry: '', model: '', plate: '' });
  const [docs, setDocs] = useState({ front: null, back: null, orcr: null, photo: null });
  const [errors, setErrors] = useState({});
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));

  const pickImage = async (key) => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
      if (!res.canceled && res.assets?.length) setDocs((d) => ({ ...d, [key]: { uri: res.assets[0].uri, name: 'Photo selected' } }));
    } catch (e) {
      Alert.alert('Could not open photos', 'Please allow photo access in your phone settings.');
    }
  };
  const pickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
      if (!res.canceled && res.assets?.length) setDocs((d) => ({ ...d, orcr: { uri: res.assets[0].uri, name: res.assets[0].name } }));
    } catch (e) {
      Alert.alert('Could not open files', 'Please try again.');
    }
  };

  const submit = async () => {
    const e = {};
    if (f.fullName.trim().length < 2) e.fullName = 'Enter your full name.';
    if (!isValidPhone(f.phone.startsWith('+63') ? f.phone : f.phone.replace(/^0?/, '0'))) e.phone = 'Enter a valid PH mobile number.';
    if (!/^[A-Z]\d{2}-\d{2}-\d{6}$/i.test(f.license.trim())) e.license = 'Use the format N01-00-123456.';
    const d = parseDate(f.expiry);
    if (!d) e.expiry = 'Use mm/dd/yyyy.';
    else if (d <= new Date()) e.expiry = 'Your license must not be expired.';
    if (f.model.trim().length < 2) e.model = 'Enter your vehicle model.';
    if (!/^[A-Z0-9]{3}[ -]?[A-Z0-9]{3,4}$/i.test(f.plate.trim())) e.plate = 'Enter a valid plate number.';
    if (!docs.front || !docs.back) e.docs = 'Upload both sides of your driver’s license.';
    else if (!docs.orcr) e.docs = 'Upload your vehicle permit / ORCR.';
    else if (!docs.photo) e.docs = 'Add a photo of your tricycle.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      await submitRiderApplication({ fullName: f.fullName.trim(), phone: f.phone.replace(/[\s-]/g, ''), plate: f.plate.trim().toUpperCase(), vehicleModel: f.model.trim() });
    } catch (error) {
      setLoading(false);
      Alert.alert('Submission failed', error.message);
    }
  };

  const Upload = ({ label, k, sub }) => (
    <View style={{ flex: 1 }}>
      <AppText variant="label" style={{ marginBottom: 6, fontSize: 8 }}>{label}</AppText>
      <Pressable onPress={() => pickImage(k)} style={styles.drop} accessibilityRole="button" accessibilityLabel={sub}>
        {docs[k] ? <Image source={{ uri: docs[k].uri }} style={StyleSheet.absoluteFill} /> : <><Ionicons name="camera" size={20} color={colors.gray500} /><AppText variant="small" style={{ fontSize: 10, marginTop: 4 }}>{sub}</AppText></>}
      </Pressable>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={signOut} style={styles.back} accessibilityLabel="Cancel registration"><Ionicons name="arrow-back" size={18} color={colors.yellow} /></Pressable>
          <AppText variant="h3" style={{ marginLeft: 12 }}>Rider Registration</AppText>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }}>
          <AppText variant="bodyBold" style={{ fontSize: 12 }}>Step 1 of 3</AppText>
          <AppText variant="small" color={colors.ink} style={{ fontSize: 10, fontStyle: 'italic' }}>Personal & Vehicle Info</AppText>
        </View>
        <View style={styles.bar}><View style={styles.barFill} /></View>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          <Section icon="person" title="Personal Information" />
          <Input label="Full Name" placeholder="Hans Braga" autoCapitalize="words" value={f.fullName} onChangeText={set('fullName')} error={errors.fullName} />
          <Input label="Mobile Number" placeholder="+63 912 345 6789" keyboardType="phone-pad" value={f.phone} onChangeText={set('phone')} error={errors.phone} />
          <Section icon="card" title="License Details" />
          <Input label="Driver's License Number" placeholder="N01-00-123456" autoCapitalize="characters" value={f.license} onChangeText={set('license')} error={errors.license} />
          <Input label="Expiry Date" placeholder="mm/dd/yyyy" keyboardType="number-pad" value={f.expiry} onChangeText={set('expiry')} error={errors.expiry} maxLength={10} />
          <Section icon="bicycle" title="Vehicle Information" />
          <Input label="Vehicle Model (Tricycle)" placeholder="Bajaj RE / TVS King" autoCapitalize="words" value={f.model} onChangeText={set('model')} error={errors.model} />
          <Input label="Plate Number" placeholder="123 ABC" autoCapitalize="characters" value={f.plate} onChangeText={set('plate')} error={errors.plate} />
          <Section icon="cloud-upload" title="Document Uploads" />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Upload label="LICENSE (FRONT)" k="front" sub="Upload Front" />
            <Upload label="LICENSE (BACK)" k="back" sub="Upload Back" />
          </View>
          <AppText variant="label" style={{ marginTop: 14, marginBottom: 6, fontSize: 8 }}>VEHICLE PERMIT / ORCR</AppText>
          <View style={styles.orcr}>
            <Ionicons name="document" size={16} color={colors.gray500} />
            <AppText variant="small" style={{ flex: 1, marginLeft: 8 }} numberOfLines={1}>{docs.orcr ? docs.orcr.name : 'Select ORCR document...'}</AppText>
            <Pressable style={styles.uploadBtn} onPress={pickDocument}><AppText variant="label" color={colors.white} style={{ fontSize: 8 }}>UPLOAD</AppText></Pressable>
          </View>
          <AppText variant="label" style={{ marginTop: 14, marginBottom: 6, fontSize: 8 }}>PHOTO OF TRICYCLE</AppText>
          <Pressable onPress={() => pickImage('photo')} style={styles.photo} accessibilityRole="button" accessibilityLabel="Replace photo">
            <Image source={docs.photo ? { uri: docs.photo.uri } : images.tricycle} style={StyleSheet.absoluteFill} />
            <View style={styles.replace}><Ionicons name="swap-horizontal" size={12} /><AppText variant="label" color={colors.black} style={{ marginLeft: 4, fontSize: 9 }}>{docs.photo ? 'Replace Photo' : 'Add Photo'}</AppText></View>
          </Pressable>
          {errors.docs ? <AppText variant="small" color={colors.red} style={{ marginTop: 8 }}>{errors.docs}</AppText> : null}
          <Button title="Preview Documents" icon="eye" onPress={() => setPreview(true)} style={{ marginTop: 18 }} small />
          <Button title="Submit for Verification" variant="accent" loading={loading} onPress={submit} style={{ marginTop: 10 }} small />
          <AppText variant="small" align="center" style={{ fontSize: 10, marginTop: 12 }}>By submitting, you agree to our Rider Terms and Privacy Policy.</AppText>
        </ScrollView>
      </KeyboardAvoidingView>
      <Pressable style={[styles.support, { bottom: insets.bottom + 16 }]} onPress={() => Linking.openURL('mailto:support@rideon.example')} accessibilityLabel="Contact support"><Ionicons name="headset" size={20} color={colors.yellow} /></Pressable>
      <Modal transparent visible={preview} animationType="fade" onRequestClose={() => setPreview(false)}>
        <View style={styles.backdrop}>
          <View style={styles.box}>
            <AppText variant="h3" style={{ marginBottom: 12 }}>Your documents</AppText>
            {[['License (Front)', docs.front], ['License (Back)', docs.back], ['Vehicle Permit / ORCR', docs.orcr], ['Tricycle photo', docs.photo]].map(([l, v]) => (
              <View key={l} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                <AppText variant="body">{l}</AppText>
                <AppText variant="bodyBold" color={v ? colors.green : colors.red}>{v ? 'Added' : 'Missing'}</AppText>
              </View>
            ))}
            <Button title="Close" variant="outline" onPress={() => setPreview(false)} style={{ marginTop: 14 }} small />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.yellow, paddingHorizontal: 20, paddingBottom: 16 },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' },
  bar: { height: 6, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 3, marginTop: 8 },
  barFill: { width: '34%', height: 6, backgroundColor: colors.black, borderRadius: 3 },
  drop: { height: 96, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.gray300, backgroundColor: colors.gray50, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  orcr: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.gray100, borderRadius: radius.md, padding: 10 },
  uploadBtn: { backgroundColor: colors.black, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7 },
  photo: { height: 140, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.gray200, justifyContent: 'flex-end', alignItems: 'center' },
  replace: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, marginBottom: 12 },
  support: { position: 'absolute', right: 16, width: 46, height: 46, borderRadius: 23, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 24 },
  box: { backgroundColor: colors.white, borderRadius: radius.xl, padding: 22 },
});
