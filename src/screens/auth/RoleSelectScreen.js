import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import { IconBox } from '../../components/misc';
import { useAuth } from '../../context/AuthContext';
import { colors, radius, shadow } from '../../theme';

const OPTIONS = [
  { role: 'passenger', title: 'Passenger', desc: 'I want to book a ride and reach my destination.', icon: 'person-circle' },
  { role: 'rider', title: 'Rider', desc: 'I want to drive my vehicle and earn money.', icon: 'car' },
];

export default function RoleSelectScreen({ navigation }) {
  const { selectedRole, setSelectedRole } = useAuth();
  return (
    <Screen>
      <View style={styles.top}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={20} />
        </Pressable>
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} /><View style={styles.dot} /><View style={styles.dot} />
        </View>
        <View style={{ width: 38 }} />
      </View>
      <View style={styles.body}>
        <AppText variant="h1" style={{ marginBottom: 8 }}>Join RideOn as...</AppText>
        <AppText variant="small" style={{ fontSize: 13, marginBottom: 24 }}>Choose how you want to use the platform today. You can always change this later.</AppText>
        {OPTIONS.map((o) => {
          const active = selectedRole === o.role;
          return (
            <Pressable key={o.role} onPress={() => setSelectedRole(o.role)} style={[styles.card, active && styles.cardActive, shadow.card]} accessibilityRole="radio" accessibilityState={{ selected: active }}>
              <IconBox icon={o.icon} size={62} bg={active ? colors.yellow : colors.gray100} color={active ? colors.black : colors.gray400} />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <AppText variant="h3">{o.title}</AppText>
                <AppText variant="small" style={{ marginTop: 2 }}>{o.desc}</AppText>
              </View>
              <View style={[styles.radio, active && { backgroundColor: colors.yellow, borderColor: colors.yellow }]}>
                {active ? <Ionicons name="checkmark" size={14} color={colors.black} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.footer}>
        <Button title="Continue" iconRight="arrow-forward" onPress={() => navigation.navigate('Login')} />
        <AppText variant="label" align="center" style={{ marginTop: 14, fontSize: 9 }}>STEP 1 OF 3</AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 8, height: 4, borderRadius: 2, backgroundColor: colors.gray200 },
  dotActive: { width: 26, backgroundColor: colors.yellow },
  body: { flex: 1, paddingHorizontal: 22, paddingTop: 12 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.xl, padding: 16, marginBottom: 16, borderWidth: 1.5, borderColor: colors.gray100 },
  cardActive: { borderColor: colors.yellow, backgroundColor: colors.yellowSoft },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: colors.gray300, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingHorizontal: 22, paddingBottom: 18 },
});
