import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import Screen from '../../components/Screen';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import { images } from '../../data/mock';
import { colors } from '../../theme';

export default function WelcomeScreen({ navigation }) {
  return (
    <Screen bg={colors.yellow}>
      <View style={styles.center}>
        <Image source={images.logo} style={styles.logo} resizeMode="contain" />
        <AppText variant="h3" weight="medium" style={{ fontSize: 18 }}>
          Your Ride, <AppText variant="h3" weight="medium" color={colors.white} style={{ fontSize: 18 }}>Just a Tap Away.</AppText>
        </AppText>
      </View>
      <View style={styles.bottom}>
        <Button title="Get Started" iconRight="arrow-forward" onPress={() => navigation.navigate('RoleSelect')} style={{ marginBottom: 12 }} />
        <Button title="Log In" variant="outlineYellow" onPress={() => navigation.navigate('Login')} />
        <View style={styles.links}>
          <AppText variant="small" color={colors.ink}>Terms of Service</AppText>
          <AppText variant="small" color={colors.ink}>  •  </AppText>
          <AppText variant="small" color={colors.ink}>Privacy Policy</AppText>
        </View>
        <AppText variant="label" align="center" color="rgba(0,0,0,0.5)" style={{ fontSize: 8, marginTop: 8 }}>— SECURED WITH RIDEON PAY —</AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 230, height: 230, marginBottom: 20 },
  bottom: { paddingHorizontal: 24, paddingBottom: 20 },
  links: { flexDirection: 'row', justifyContent: 'center', marginTop: 22 },
});
