import React from 'react';
import { View, Linking, Share, StyleSheet, Alert } from 'react-native';
import Screen from '../../components/Screen';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import { ListRow, IconBox } from '../../components/misc';
import { useBooking } from '../../context/BookingContext';

export default function SafetyScreen({ navigation }) {
  const { tripId, pickup, destination } = useBooking();
  const shareTrip = () => Share.share({ message: `RideOn trip ${tripId || ''}: ${pickup?.name || ''} → ${destination?.name || ''}` }).catch(() => {});
  return (
    <Screen>
      <View style={styles.body}>
        <IconBox icon="shield-checkmark" size={64} round />
        <AppText variant="h2" style={{ marginTop: 12, marginBottom: 18 }}>Safety Center & Help</AppText>
        <View style={{ gap: 10, alignSelf: 'stretch' }}>
          <ListRow icon="share-social" title="Share Trip" onPress={shareTrip} />
          <ListRow icon="alert-circle" title="SOS / Emergency (call 911)" onPress={() => Linking.openURL('tel:911')} />
          <ListRow icon="headset" title="Contact RideOn Support" onPress={() => Linking.openURL('mailto:support@rideon.example')} />
          <ListRow icon="flag" title="Report a Problem" onPress={() => Alert.alert('Report received', 'Thanks — our team will review your report.')} />
        </View>
      </View>
      <View style={{ padding: 20 }}><Button title="Close" variant="outline" onPress={() => navigation.goBack()} /></View>
    </Screen>
  );
}

const styles = StyleSheet.create({ body: { flex: 1, alignItems: 'center', padding: 24, paddingTop: 36 } });
