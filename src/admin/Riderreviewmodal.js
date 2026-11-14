import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { colors, fonts } from '../theme';

// The four documents a rider uploads in the app (keys match what the app saves in profiles.documents).
const DOCS = [
  ['license-front', 'Driver’s license (front)'],
  ['license-back', 'Driver’s license (back)'],
  ['orcr', 'Vehicle permit / ORCR'],
  ['tricycle-photo', 'Photo of tricycle'],
];
const isImage = (path = '') => /\.(png|jpe?g|webp|gif|heic|heif)$/i.test(path);
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

function Row({ label, value, bad }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, bad && { color: colors.red }]}>{value || '—'}</Text>
    </View>
  );
}

// Everything an admin needs to decide: details, the uploaded files (opened with short-lived private links),
// automatic checks, and Approve / Reject with a confirmation step.
export default function RiderReviewModal({ rider, onClose, onReview }) {
  const [files, setFiles] = useState({}); // key -> { url, error }
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(null);
  const [confirm, setConfirm] = useState(null); // 'approved' | 'rejected'
  const [busy, setBusy] = useState(false);

  const documents = (rider && rider.documents) || {};

  useEffect(() => {
    setFiles({});
    setZoom(null);
    setConfirm(null);
    if (!rider) return undefined;
    let alive = true;
    setLoading(true);
    (async () => {
      const entries = await Promise.all(
        DOCS.map(async ([key]) => {
          const path = documents[key];
          if (!path) return [key, null];
          const { data, error } = await supabase.storage.from('rider-documents').createSignedUrl(path, 600);
          return [key, error ? { error: error.message } : { url: data.signedUrl }];
        })
      );
      if (alive) {
        setFiles(Object.fromEntries(entries.filter(([, v]) => v)));
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [rider?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const missing = useMemo(() => DOCS.filter(([key]) => !documents[key]).map(([, label]) => label), [documents]);
  const expiry = rider?.license_expiry ? new Date(`${rider.license_expiry}T23:59:59`) : null;
  const expired = !!expiry && expiry < new Date();
  const daysLeft = expiry ? Math.ceil((expiry - new Date()) / 86400000) : null;
  const unreadable = Object.values(files).some((f) => f.error);

  if (!rider) return null;
  const pending = rider.rider_status === 'pending';
  const canApprove = missing.length === 0 && !expired && !unreadable;

  const decide = async (status) => {
    setBusy(true);
    const ok = await onReview(rider.id, status);
    setBusy(false);
    if (ok) onClose();
    else setConfirm(null);
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.head}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>RIDER APPLICATION</Text>
              <Text style={styles.title}>{rider.full_name}</Text>
              <Text style={styles.sub}>Status: {String(rider.rider_status || 'unknown').replace('_', ' ')} · Submitted {fmtDate(rider.submitted_at || rider.created_at)}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.close} accessibilityLabel="Close"><Ionicons name="close" size={18} color={colors.black} /></Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <Text style={styles.section}>DETAILS</Text>
            <View style={styles.card}>
              <Row label="Rider ID" value={rider.rider_code} />
              <Row label="Mobile number" value={rider.phone} />
              <Row label="Email" value={rider.email} />
              <Row label="Vehicle model" value={rider.vehicle_model} />
              <Row label="Plate number" value={rider.plate} />
              <Row label="License number" value={rider.license_number} />
              <Row label="License expiry" value={rider.license_expiry ? `${fmtDate(rider.license_expiry)}${expired ? ' — EXPIRED' : daysLeft <= 30 ? ` — expires in ${daysLeft} days` : ''}` : '—'} bad={expired} />
            </View>

            <Text style={styles.section}>UPLOADED DOCUMENTS</Text>
            {loading ? <ActivityIndicator color={colors.yellow} style={{ marginVertical: 18 }} /> : null}
            <View style={styles.grid}>
              {DOCS.map(([key, label]) => {
                const path = documents[key];
                const file = files[key];
                return (
                  <View key={key} style={styles.doc}>
                    <Text style={styles.docLabel}>{label}</Text>
                    {!path ? (
                      <View style={[styles.thumb, styles.thumbMissing]}><Ionicons name="alert-circle" size={22} color={colors.red} /><Text style={styles.missingText}>Not uploaded</Text></View>
                    ) : file && file.error ? (
                      <View style={[styles.thumb, styles.thumbMissing]}><Text style={styles.missingText}>Could not open file</Text><Text style={styles.errorSmall} numberOfLines={3}>{file.error}</Text></View>
                    ) : !file ? (
                      <View style={styles.thumb}><ActivityIndicator color={colors.gray400} /></View>
                    ) : isImage(path) ? (
                      <Pressable onPress={() => setZoom(file.url)} accessibilityLabel={`Enlarge ${label}`}>
                        <Image source={{ uri: file.url }} style={styles.thumb} resizeMode="cover" />
                        <Text style={styles.enlarge}>Tap to enlarge</Text>
                      </Pressable>
                    ) : (
                      <View style={styles.thumb}><Ionicons name="document-text-outline" size={26} color={colors.gray500} /><Text style={styles.fileText}>{String(path).split('.').pop().toUpperCase()} file</Text></View>
                    )}
                    {file && file.url ? <Text style={styles.link} onPress={() => Linking.openURL(file.url)}>Open in new tab</Text> : null}
                  </View>
                );
              })}
            </View>

            <Text style={styles.section}>CHECKS</Text>
            <View style={styles.card}>
              <Text style={[styles.check, missing.length ? styles.bad : styles.good]}>{missing.length ? `✗ Missing: ${missing.join(', ')}` : '✓ All 4 documents uploaded'}</Text>
              <Text style={[styles.check, expired ? styles.bad : styles.good]}>{!expiry ? '• No license expiry date on file' : expired ? '✗ Driver’s license is expired' : '✓ Driver’s license is not expired'}</Text>
              <Text style={styles.hint}>Compare the license number and name on the photo with the details above before approving.</Text>
            </View>
          </ScrollView>

          <View style={styles.foot}>
            {!pending ? (
              <Text style={styles.footNote}>This application is already {String(rider.rider_status).replace('_', ' ')}.</Text>
            ) : confirm ? (
              <>
                <Text style={styles.confirmText}>{confirm === 'approved' ? `Approve ${rider.full_name}? They will be able to go online and take bookings.` : `Reject ${rider.full_name}'s application?`}</Text>
                <View style={styles.buttons}>
                  <Pressable onPress={() => setConfirm(null)} style={styles.btnGhost} disabled={busy}><Text style={styles.btnGhostText}>Back</Text></Pressable>
                  <Pressable onPress={() => decide(confirm)} style={[confirm === 'approved' ? styles.btnApprove : styles.btnReject, busy && { opacity: 0.6 }]} disabled={busy}>
                    {busy ? <ActivityIndicator color={colors.black} /> : <Text style={confirm === 'approved' ? styles.btnApproveText : styles.btnRejectText}>{confirm === 'approved' ? 'Yes, approve' : 'Yes, reject'}</Text>}
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                {!canApprove ? <Text style={styles.footNote}>Approval is disabled: {missing.length ? 'some documents are missing' : expired ? 'the license is expired' : 'a document could not be opened'}. You can reject and ask the rider to re-submit.</Text> : null}
                <View style={styles.buttons}>
                  <Pressable onPress={() => setConfirm('rejected')} style={styles.btnReject}><Text style={styles.btnRejectText}>Reject</Text></Pressable>
                  <Pressable onPress={() => setConfirm('approved')} style={[styles.btnApprove, !canApprove && { opacity: 0.4 }]} disabled={!canApprove}><Text style={styles.btnApproveText}>Approve application</Text></Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </View>

      <Modal transparent visible={!!zoom} animationType="fade" onRequestClose={() => setZoom(null)}>
        <Pressable style={styles.zoomBackdrop} onPress={() => setZoom(null)}>
          {zoom ? <Image source={{ uri: zoom }} style={styles.zoomImage} resizeMode="contain" /> : null}
          <Text style={styles.zoomHint}>Click anywhere to close</Text>
        </Pressable>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  sheet: { width: '100%', maxWidth: 780, maxHeight: '94%', backgroundColor: colors.white, borderRadius: 14, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  eyebrow: { color: colors.yellowDark, fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1 },
  title: { color: colors.ink, fontFamily: fonts.extrabold, fontSize: 20, marginTop: 4 },
  sub: { color: colors.gray500, fontFamily: fonts.regular, fontSize: 10, marginTop: 3, textTransform: 'capitalize' },
  close: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20, paddingBottom: 10 },
  section: { color: colors.gray500, fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1, marginTop: 14, marginBottom: 8 },
  card: { backgroundColor: colors.gray50, borderRadius: 10, borderWidth: 1, borderColor: colors.gray100, padding: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  rowLabel: { color: colors.gray500, fontFamily: fonts.regular, fontSize: 10 },
  rowValue: { color: colors.ink, fontFamily: fonts.bold, fontSize: 10, maxWidth: '65%', textAlign: 'right' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  doc: { width: '47%', minWidth: 200, flexGrow: 1 },
  docLabel: { color: colors.ink, fontFamily: fonts.bold, fontSize: 10, marginBottom: 6 },
  thumb: { height: 150, borderRadius: 10, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', width: '100%' },
  thumbMissing: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', padding: 8 },
  missingText: { color: colors.red, fontFamily: fonts.bold, fontSize: 10, marginTop: 4 },
  errorSmall: { color: colors.red, fontFamily: fonts.regular, fontSize: 8, marginTop: 4, textAlign: 'center' },
  fileText: { color: colors.gray500, fontFamily: fonts.medium, fontSize: 10, marginTop: 4 },
  enlarge: { color: colors.gray500, fontFamily: fonts.regular, fontSize: 8, marginTop: 4 },
  link: { color: colors.yellowDark, fontFamily: fonts.bold, fontSize: 9, marginTop: 4 },
  check: { fontFamily: fonts.bold, fontSize: 10, marginVertical: 3 },
  good: { color: '#15803D' },
  bad: { color: colors.red },
  hint: { color: colors.gray500, fontFamily: fonts.regular, fontSize: 9, marginTop: 8 },
  foot: { padding: 16, borderTopWidth: 1, borderTopColor: colors.gray100, backgroundColor: colors.white },
  footNote: { color: colors.gray500, fontFamily: fonts.medium, fontSize: 10, marginBottom: 10 },
  confirmText: { color: colors.ink, fontFamily: fonts.bold, fontSize: 11, marginBottom: 10 },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  btnApprove: { backgroundColor: colors.yellow, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 11, minWidth: 130, alignItems: 'center' },
  btnApproveText: { color: colors.black, fontFamily: fonts.bold, fontSize: 11 },
  btnReject: { borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 11, alignItems: 'center' },
  btnRejectText: { color: colors.red, fontFamily: fonts.bold, fontSize: 11 },
  btnGhost: { borderWidth: 1, borderColor: colors.gray200, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 11, alignItems: 'center' },
  btnGhostText: { color: colors.gray600, fontFamily: fonts.bold, fontSize: 11 },
  zoomBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  zoomImage: { width: '100%', height: '88%' },
  zoomHint: { color: colors.gray400, fontFamily: fonts.regular, fontSize: 10, marginTop: 10 },
});