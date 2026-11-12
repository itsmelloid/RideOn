import React from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import AppText from './AppText';
import Button from './Button';
import { colors, radius } from '../theme';

export default function ConfirmDialog({ visible, title, message, confirmText = 'Confirm', cancelText = 'Keep', destructive, onConfirm, onCancel }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.box}>
          <AppText variant="h3" align="center">{title}</AppText>
          {message ? <AppText variant="small" align="center" style={{ marginTop: 8, marginBottom: 18 }}>{message}</AppText> : null}
          <Button title={confirmText} variant={destructive ? 'danger' : 'primary'} onPress={onConfirm} style={{ marginBottom: 10 }} />
          <Button title={cancelText} variant="outline" onPress={onCancel} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 24 },
  box: { backgroundColor: colors.white, borderRadius: radius.xl, padding: 22 },
});
