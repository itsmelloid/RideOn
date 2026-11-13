import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { colors, fonts } from '../theme';

const NAVIGATION = [
  ['Dashboard', 'grid-outline'], ['Bookings', 'calendar-outline'], ['Riders', 'bicycle-outline'], ['Passengers', 'people-outline'], ['Live Tracking', 'navigate-outline'], ['Revenue', 'trending-up-outline'],
  ['Fare Settings', 'options-outline'], ['Commission', 'pie-chart-outline'], ['Complaints', 'shield-checkmark-outline'], ['Announcements', 'megaphone-outline'], ['Transactions', 'wallet-outline'], ['Reports', 'bar-chart-outline'], ['Settings & Logs', 'settings-outline'],
];

const peso = (value) => `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
const date = (value) => value ? new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const DOCUMENTS = [
  ['license-front', 'Driver’s License — Front'],
  ['license-back', 'Driver’s License — Back'],
  ['orcr', 'Vehicle Permit / ORCR'],
  ['tricycle-photo', 'Tricycle Photo'],
];
const isImageDocument = (path) => /\.(jpe?g|png|webp)$/i.test(path || '');

function Brand() {
  return <View style={styles.brand}><Image source={require('../../assets/images/logo.png')} style={styles.brandLogo} resizeMode="contain" /><View><Text style={styles.brandText}>RideOn</Text><Text style={styles.brandCaption}>ADMIN PORTAL</Text></View></View>;
}

function Metric({ icon, label, value, note }) {
  const { width } = useWindowDimensions();
  return <View style={[styles.metric, width < 760 && styles.metricMobile]}><View style={styles.metricIcon}><Text>{icon}</Text></View><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text>{note ? <Text style={styles.metricNote}>{note}</Text> : null}</View>;
}

function Status({ value }) {
  const name = value || 'unknown';
  const tone = name === 'approved' || name === 'completed' ? styles.green : name === 'pending' ? styles.orange : name === 'rejected' || name === 'cancelled' ? styles.red : styles.gray;
  return <Text style={[styles.status, tone]}>{name.replace('_', ' ')}</Text>;
}

function Login({ onSignedIn }) {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    setError('');
    if (!email.trim() || !password) return setError('Enter your admin email and password.');
    setLoading(true);
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (authError) { setError('Invalid email or password.'); setLoading(false); return; }
    const { data: admin, error: adminError } = await supabase.from('admin_users').select('id, full_name').eq('id', data.user.id).maybeSingle();
    if (adminError || !admin) {
      await supabase.auth.signOut();
      setError('This account is not authorized to use the admin portal.');
      setLoading(false);
      return;
    }
    onSignedIn(admin);
    setLoading(false);
  };
  if (compact) return <ScrollView contentContainerStyle={styles.mobileLoginScroll}><View style={styles.mobileLoginHero}><Brand /><Text style={styles.mobileLoginEyebrow}>SECURE ADMIN ACCESS</Text><Text style={styles.mobileLoginTitle}>Manage every RideOn trip in one place.</Text></View><View style={styles.mobileLoginForm}><Text style={styles.loginTitle}>Admin sign in</Text><Text style={styles.loginSub}>Use your authorized RideOn admin account.</Text><Text style={styles.fieldLabel}>EMAIL ADDRESS</Text><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="admin@rideon.com" placeholderTextColor={colors.gray400} style={styles.input} /><Text style={styles.fieldLabel}>PASSWORD</Text><TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Enter your password" placeholderTextColor={colors.gray400} style={styles.input} onSubmitEditing={submit} />{error ? <Text style={styles.error}>{error}</Text> : null}<Pressable onPress={submit} style={styles.loginButton} disabled={loading}>{loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.loginButtonText}>Log in</Text>}</Pressable><Text style={styles.loginFine}>Only accounts listed in the admin_users database table can enter.</Text></View></ScrollView>;
  return <View style={styles.loginPage}><View style={styles.loginPitch}><Brand /><Text style={styles.eyebrow}>ADMIN CONSOLE</Text><Text style={styles.pitchTitle}>Your Ride,{`\n`}Just a Tap Away.</Text><Text style={styles.pitchLine}>✓ Verify riders and manage accounts</Text><Text style={styles.pitchLine}>✓ Monitor bookings and fares in real time</Text><Text style={styles.pitchLine}>✓ Review platform performance</Text></View><View style={styles.loginPanel}><View style={styles.loginCard}><Text style={styles.loginTitle}>Admin sign in</Text><Text style={styles.loginSub}>Use your authorized RideOn admin account.</Text><Text style={styles.fieldLabel}>EMAIL ADDRESS</Text><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="admin@rideon.com" placeholderTextColor={colors.gray400} style={styles.input} /><Text style={styles.fieldLabel}>PASSWORD</Text><TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Enter your password" placeholderTextColor={colors.gray400} style={styles.input} onSubmitEditing={submit} />{error ? <Text style={styles.error}>{error}</Text> : null}<Pressable onPress={submit} style={styles.loginButton} disabled={loading}>{loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.loginButtonText}>Log in</Text>}</Pressable><Text style={styles.loginFine}>Only accounts listed in the admin_users database table can enter.</Text></View></View></View>;
}

export default function AdminPortal({ forceLogin = false }) {
  const [admin, setAdmin] = useState(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState('Dashboard');
  const [data, setData] = useState({ profiles: [], trips: [] });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [documentReview, setDocumentReview] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setMessage('');
    const [profilesRes, tripsRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, phone, role, rider_status, rider_code, plate, vehicle_model, license_number, license_expiry, documents, rides_count, rating, created_at, submitted_at').order('created_at', { ascending: false }),
      supabase.from('trips').select('id, trip_code, status, fare, commission, payment_method, created_at, passenger:profiles!trips_passenger_id_fkey(full_name), rider:profiles!trips_rider_id_fkey(full_name)').order('created_at', { ascending: false }).limit(50),
    ]);
    if (profilesRes.error || tripsRes.error) setMessage(profilesRes.error?.message || tripsRes.error?.message || 'Could not load portal data.');
    else setData({ profiles: profilesRes.data || [], trips: tripsRes.data || [] });
    setLoading(false);
  }, []);

  useEffect(() => { (async () => {
    if (!isSupabaseConfigured) { setChecking(false); return; }
    const { data: sessionData } = await supabase.auth.getSession();
    if (forceLogin && sessionData.session) {
      await supabase.auth.signOut();
    } else if (sessionData.session) {
      const { data: row } = await supabase.from('admin_users').select('id, full_name').eq('id', sessionData.session.user.id).maybeSingle();
      if (row) setAdmin(row); else await supabase.auth.signOut();
    }
    setChecking(false);
  })(); }, [forceLogin]);
  // Loading is a deliberate async synchronization after an authorized session is restored.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (admin) load(); }, [admin, load]);

  const review = async (id, status) => {
    setMessage('');
    const { error } = await supabase.rpc('review_rider_application', { p_rider_id: id, p_status: status });
    if (error) setMessage(error.message); else { setMessage(`Rider ${status}.`); load(); }
  };
  const requestResubmission = async (id) => {
    setMessage('');
    const { error } = await supabase.rpc('review_rider_application', { p_rider_id: id, p_status: 'rejected' });
    if (error) { setMessage(error.message); return false; }
    setMessage('Rider asked to re-upload their documents.');
    load();
    return true;
  };
  const openDocumentReview = async (rider) => {
    const paths = rider.documents && typeof rider.documents === 'object' ? rider.documents : {};
    const documents = DOCUMENTS.map(([key, label]) => {
      const path = paths[key];
      return { key, label, path: typeof path === 'string' && path.startsWith(`${rider.id}/`) ? path : null };
    });
    setDocumentReview({ rider, documents, loading: true });
    const signedDocuments = await Promise.all(documents.map(async (document) => {
      if (!document.path) return document;
      try {
        const { data: signed, error } = await supabase.storage.from('rider-documents').createSignedUrl(document.path, 300);
        return { ...document, url: error ? null : signed?.signedUrl };
      } catch {
        return document;
      }
    }));
    setDocumentReview((current) => current?.rider.id === rider.id ? { ...current, documents: signedDocuments, loading: false } : current);
  };
  const signOut = async () => { await supabase.auth.signOut(); setAdmin(null); setData({ profiles: [], trips: [] }); };
  const stats = useMemo(() => {
    const riders = data.profiles.filter(p => p.role === 'rider');
    const completed = data.trips.filter(t => t.status === 'completed');
    return { riders, pending: riders.filter(r => r.rider_status === 'pending'), passengers: data.profiles.filter(p => p.role === 'passenger'), completed, revenue: completed.reduce((sum, t) => sum + Number(t.commission || 0), 0) };
  }, [data]);
  if (checking) return <View style={styles.center}><ActivityIndicator color={colors.yellow} /></View>;
  if (!isSupabaseConfigured) return <View style={styles.center}><Text style={styles.error}>Add Supabase credentials to .env before opening the admin portal.</Text></View>;
  if (!admin) return <Login onSignedIn={setAdmin} />;
  if (tab !== '__legacy') return <><PrototypeWorkspace admin={admin} tab={tab} setTab={setTab} stats={stats} trips={data.trips} loading={loading} load={load} review={review} onOpenDocuments={openDocumentReview} signOut={signOut} /><DocumentReviewModal review={documentReview} onClose={() => setDocumentReview(null)} onRequestResubmission={requestResubmission} /></>;
  const visible = tab === 'Riders' ? stats.riders : tab === 'Passengers' ? stats.passengers : [];
  return <View style={styles.shell}><View style={styles.sidebar}><Brand /><Text style={styles.sidebarCaption}>ADMIN CONSOLE</Text>{['Overview', 'Riders', 'Passengers', 'Bookings'].map(item => <Pressable key={item} onPress={() => setTab(item)} style={[styles.navItem, tab === item && styles.navActive]}><Text style={[styles.navText, tab === item && styles.navTextActive]}>{item === 'Overview' ? '▦' : item === 'Riders' ? '◉' : item === 'Passengers' ? '●' : '▤'}  {item}</Text></Pressable>)}<View style={styles.sidebarBottom}><Text style={styles.adminName}>{admin.full_name || 'RideOn Admin'}</Text><Text style={styles.adminRole}>Administrator</Text><Pressable onPress={signOut}><Text style={styles.signOut}>Sign out</Text></Pressable></View></View><ScrollView style={styles.main} contentContainerStyle={styles.mainContent}><View style={styles.topbar}><View><Text style={styles.pageTitle}>{tab === 'Overview' ? 'System Overview' : `${tab} Management`}</Text><Text style={styles.pageSub}>Monitor and manage the RideOn platform.</Text></View><Pressable onPress={load} style={styles.refresh}><Text style={styles.refreshText}>{loading ? 'Refreshing…' : '↻ Refresh data'}</Text></Pressable></View>{message ? <Text style={styles.notice}>{message}</Text> : null}<View style={styles.metrics}><Metric icon="◉" label="TOTAL RIDERS" value={stats.riders.length} note={`${stats.pending.length} awaiting review`} /><Metric icon="●" label="PASSENGERS" value={stats.passengers.length} /><Metric icon="▤" label="COMPLETED RIDES" value={stats.completed.length} /><Metric icon="₱" label="COMMISSION" value={peso(stats.revenue)} /></View>{tab === 'Overview' ? <><View style={styles.sectionHead}><Text style={styles.sectionTitle}>Pending Rider Applications</Text><Text style={styles.sectionHint}>{stats.pending.length} to review</Text></View><Table rows={stats.pending} kind="riders" onReview={review} /><View style={styles.sectionHead}><Text style={styles.sectionTitle}>Recent Bookings</Text></View><Table rows={data.trips.slice(0, 8)} kind="trips" /></> : tab === 'Bookings' ? <Table rows={data.trips} kind="trips" /> : <Table rows={visible} kind="riders" onReview={review} />}</ScrollView></View>;
}

function PrototypeWorkspace({ admin, tab, setTab, stats, trips, loading, load, review, onOpenDocuments, signOut }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 760;
  const [navigationOpen, setNavigationOpen] = useState(false);
  const isDashboard = tab === 'Dashboard';
  const isPeople = tab === 'Riders' || tab === 'Passengers';
  const heading = isDashboard ? 'System Overview' : `${tab} Management`;
  const activeRows = tab === 'Riders' ? stats.riders : tab === 'Passengers' ? stats.passengers : [];
  return (
    <View style={styles.prototypeShell}>
      {isMobile && navigationOpen ? <Pressable style={styles.mobileScrim} onPress={() => setNavigationOpen(false)} /> : null}
      <View style={[styles.prototypeSidebar, isMobile && styles.prototypeSidebarMobile, isMobile && !navigationOpen && styles.prototypeSidebarHidden]}>
        <Brand />
        <Text style={styles.prototypeSection}>WORKSPACE</Text>
        {NAVIGATION.map(([label, icon]) => <Pressable key={label} onPress={() => { setTab(label); setNavigationOpen(false); }} style={[styles.prototypeNav, tab === label && styles.prototypeNavActive]}><Ionicons name={icon} size={14} color={tab === label ? colors.yellow : '#72767D'} /><Text style={[styles.prototypeNavText, tab === label && styles.prototypeNavTextActive]}>{label}</Text>{label === 'Riders' && stats.pending.length > 0 ? <View style={styles.navCount}><Text style={styles.navCountText}>{stats.pending.length}</Text></View> : null}</Pressable>)}
        <View style={styles.prototypeUser}><View style={styles.userAvatar}><Text style={styles.userInitial}>{(admin.full_name || 'A').slice(0, 1)}</Text></View><View style={styles.userCopy}><Text style={styles.adminName}>{admin.full_name || 'RideOn Admin'}</Text><Text style={styles.adminRole}>Super administrator</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Lock admin portal" onPress={signOut} style={styles.lockButton}><Ionicons name="lock-closed-outline" size={14} color={colors.black} /></Pressable></View>
      </View>
      <ScrollView style={[styles.prototypeMain, isMobile && styles.prototypeMainMobile]} contentContainerStyle={[styles.prototypeContent, isMobile && styles.prototypeContentMobile]}>
        <View style={[styles.prototypeTopbar, isMobile && styles.prototypeTopbarMobile]}><View style={isMobile && styles.mobileTitleArea}>{isMobile ? <Pressable accessibilityRole="button" accessibilityLabel="Open navigation" onPress={() => setNavigationOpen(true)} style={styles.menuButton}><Ionicons name="menu-outline" size={22} color={colors.black} /></Pressable> : null}<View><Text style={styles.prototypeEyebrow}>RIDEON / ADMIN CONSOLE</Text><Text style={styles.prototypeTitle}>{heading}</Text><Text style={styles.prototypeSub}>Live platform status, rider verification, and bookings in one workspace.</Text></View></View><View style={styles.topActions}><View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE DATA</Text></View><Pressable onPress={load} style={styles.prototypeButton}><Ionicons name="refresh-outline" size={14} color={colors.black} /><Text style={styles.prototypeButtonText}>{loading ? 'Loading' : 'Refresh'}</Text></Pressable></View></View>
        <View style={[styles.prototypeMetrics, isMobile && styles.prototypeMetricsMobile]}><Metric icon="R" label="TOTAL RIDERS" value={stats.riders.length} note={`${stats.pending.length} pending review`} /><Metric icon="P" label="PASSENGERS" value={stats.passengers.length} /><Metric icon="B" label="COMPLETED RIDES" value={stats.completed.length} /><Metric icon="PHP" label="COMMISSION" value={peso(stats.revenue)} /></View>
        {isDashboard ? <><View style={styles.workspaceHeader}><View><Text style={styles.workspaceTitle}>Pending Rider Applications</Text><Text style={styles.workspaceSub}>Review submitted documents before riders can take bookings.</Text></View><Pressable onPress={() => setTab('Riders')}><Text style={styles.viewAll}>View rider management</Text></Pressable></View><Table rows={stats.pending} kind="riders" onReview={review} onOpenDocuments={onOpenDocuments} /><View style={styles.workspaceHeader}><View><Text style={styles.workspaceTitle}>Recent Bookings</Text><Text style={styles.workspaceSub}>Latest activity across the RideOn network.</Text></View><Pressable onPress={() => setTab('Bookings')}><Text style={styles.viewAll}>View all bookings</Text></Pressable></View><Table rows={trips.slice(0, 7)} kind="trips" /></> : tab === 'Bookings' ? <Table rows={trips} kind="trips" /> : isPeople ? <><View style={styles.filterStrip}><Text style={styles.filterActive}>{tab === 'Riders' ? 'All riders' : 'All passengers'}</Text><Text style={styles.filterText}>Active</Text><Text style={styles.filterText}>Pending</Text><View style={styles.searchStub}><Ionicons name="search-outline" size={13} color={colors.gray500} /><Text style={styles.searchText}>Search records</Text></View></View><Table rows={activeRows} kind="riders" onReview={review} onOpenDocuments={onOpenDocuments} /></> : <View style={styles.placeholderCard}><View style={styles.placeholderIcon}><Ionicons name="construct-outline" size={25} color={colors.black} /></View><Text style={styles.placeholderTitle}>{tab} workspace</Text><Text style={styles.placeholderCopy}>This section is styled and ready for its dedicated workflow. Dashboard, riders, passengers, and bookings already use your live Supabase data.</Text></View>}
      </ScrollView>
    </View>
  );
}

function Table({ rows, kind, onReview, onOpenDocuments }) {
  const isRider = kind === 'riders';
  const headings = isRider ? ['RIDER', 'CONTACT', 'VEHICLE', 'STATUS', 'SUBMITTED', 'ACTION'] : ['BOOKING', 'PASSENGER', 'RIDER', 'FARE', 'PAYMENT', 'STATUS'];
  return <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.tableScroll}><View style={[styles.table, styles.tableWide]}><View style={styles.tableHead}>{headings.map(x => <Text key={x} style={styles.headCell}>{x}</Text>)}</View>{rows.length === 0 ? <Text style={styles.empty}>No records to show.</Text> : rows.map(row => isRider ? <View style={styles.tableRow} key={row.id}><Text style={styles.cellStrong}>{row.full_name}</Text><Text style={styles.cell}>{row.phone || '—'}</Text><Text style={styles.cell}>{row.plate || '—'}</Text><Status value={row.role === 'rider' ? row.rider_status : row.role} /><Text style={styles.cell}>{date(row.submitted_at || row.created_at)}</Text><View style={styles.actions}>{row.rider_status === 'pending' && onReview ? <><Pressable onPress={() => onOpenDocuments?.(row)} style={styles.documentButton}><Ionicons name="eye-outline" size={12} color={colors.black} /><Text style={styles.actionText}>Docs</Text></Pressable><Pressable onPress={() => onReview(row.id, 'approved')} style={styles.approve}><Text style={styles.actionText}>Approve</Text></Pressable><Pressable onPress={() => onReview(row.id, 'rejected')} style={styles.reject}><Text style={styles.rejectText}>Reject</Text></Pressable></> : <Text style={styles.cell}>—</Text>}</View></View> : <View style={styles.tableRow} key={row.id}><Text style={styles.cellStrong}>{row.trip_code}</Text><Text style={styles.cell}>{row.passenger?.full_name || '—'}</Text><Text style={styles.cell}>{row.rider?.full_name || 'Unassigned'}</Text><Text style={styles.cellStrong}>{peso(row.fare)}</Text><Text style={styles.cell}>{row.payment_method || '—'}</Text><Status value={row.status} /></View>)}</View></ScrollView>;
}

function DocumentReviewModal({ review, onClose, onRequestResubmission }) {
  if (!review) return null;
  const openPdf = (url) => url && Linking.openURL(url).catch(() => {});
  return <Modal transparent visible animationType="fade" onRequestClose={onClose}><View style={styles.documentBackdrop}><View style={styles.documentModal}><View style={styles.documentHeader}><View><Text style={styles.documentTitle}>Rider documents</Text><Text style={styles.documentSub}>{review.rider.full_name}</Text></View><Pressable onPress={onClose} style={styles.closeButton}><Ionicons name="close" size={20} color={colors.black} /></Pressable></View>{review.loading ? <View style={styles.documentLoading}><ActivityIndicator color={colors.black} /><Text style={styles.documentSub}>Loading documents…</Text></View> : <ScrollView contentContainerStyle={styles.documentList}>{review.documents.map((document) => <DocumentCard key={document.key} document={document} onOpenPdf={openPdf} />)}</ScrollView>}<View style={styles.resubmissionFooter}><Text style={styles.resubmissionCopy}>If any preview is unavailable, ask the rider to submit a clean copy.</Text><Pressable onPress={async () => { if (await onRequestResubmission(review.rider.id)) onClose(); }} style={styles.resubmissionButton}><Ionicons name="refresh-outline" size={14} color={colors.black} /><Text style={styles.resubmissionText}>Request re-upload</Text></Pressable></View></View></View></Modal>;
}

function DocumentCard({ document, onOpenPdf }) {
  const [failed, setFailed] = useState(false);
  const preview = document.url && isImageDocument(document.path) && !failed;
  return <View style={styles.documentCard}><Text style={styles.documentLabel}>{document.label}</Text>{preview ? <Image source={{ uri: document.url }} resizeMode="contain" style={styles.documentImage} onError={() => setFailed(true)} /> : <View style={styles.documentFallback}><Ionicons name={document.path ? 'document-text-outline' : 'alert-circle-outline'} size={28} color={document.path ? colors.gray500 : colors.red} /><Text style={styles.documentFallbackText}>{document.path ? (failed ? 'Preview unavailable for this older file.' : 'Document unavailable.') : 'Not submitted'}</Text></View>}{document.url && !isImageDocument(document.path) ? <Pressable onPress={() => onOpenPdf(document.url)} style={styles.openDocumentButton}><Text style={styles.openDocumentText}>Open document</Text></Pressable> : null}</View>;
}

const styles = StyleSheet.create({
  prototypeShell: { flex: 1, minHeight: '100vh', backgroundColor: '#F7F8FA' },
  prototypeSidebar: { position: 'fixed', left: 0, top: 0, bottom: 0, width: 228, backgroundColor: '#08090B', paddingHorizontal: 16, paddingTop: 24, paddingBottom: 18, zIndex: 10 },
  prototypeSidebarMobile: { width: 252, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 18, elevation: 12 }, prototypeSidebarHidden: { left: -270 }, mobileScrim: { position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.42)', zIndex: 9 },
  prototypeSection: { color: '#6E7279', fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1, marginTop: 37, marginBottom: 10, marginLeft: 9 },
  prototypeNav: { height: 36, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', borderRadius: 7, marginBottom: 2 },
  prototypeNavActive: { backgroundColor: '#202226', borderLeftWidth: 2, borderLeftColor: colors.yellow },
  prototypeNavText: { color: '#8B9098', fontFamily: fonts.medium, fontSize: 10, marginLeft: 10, flex: 1 },
  prototypeNavTextActive: { color: colors.white, fontFamily: fonts.bold },
  navCount: { backgroundColor: colors.yellow, minWidth: 17, height: 17, borderRadius: 8.5, alignItems: 'center', justifyContent: 'center' }, navCountText: { color: colors.black, fontSize: 8, fontFamily: fonts.extrabold },
  prototypeUser: { flexDirection: 'row', alignItems: 'center', marginTop: 'auto', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#24262B' }, userAvatar: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center' }, userInitial: { fontFamily: fonts.extrabold, color: colors.black, fontSize: 12 }, userCopy: { flex: 1, marginLeft: 8 }, lockButton: { width: 28, height: 28, borderRadius: 7, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center' },
  prototypeMain: { flex: 1, marginLeft: 228 }, prototypeContent: { padding: 31, minWidth: 960, paddingBottom: 60 },
  prototypeMainMobile: { marginLeft: 0 }, prototypeContentMobile: { minWidth: 0, padding: 16, paddingBottom: 34 }, prototypeTopbarMobile: { alignItems: 'flex-start', flexDirection: 'column', gap: 13 }, mobileTitleArea: { flexDirection: 'row', alignItems: 'flex-start' }, menuButton: { width: 38, height: 38, borderRadius: 8, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center', marginRight: 10 }, prototypeMetricsMobile: { flexWrap: 'wrap', gap: 9 },
  prototypeTopbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 23, borderBottomWidth: 1, borderBottomColor: '#E6E8EB', marginBottom: 22 }, prototypeEyebrow: { color: colors.yellowDark, fontSize: 8, letterSpacing: 1, fontFamily: fonts.bold, marginBottom: 7 }, prototypeTitle: { fontFamily: fonts.extrabold, color: '#121316', fontSize: 25, letterSpacing: -0.7 }, prototypeSub: { fontFamily: fonts.regular, fontSize: 10, color: colors.gray500, marginTop: 5 }, topActions: { flexDirection: 'row', alignItems: 'center', gap: 10 }, livePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EAF8EE', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 7 }, liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#22A447', marginRight: 5 }, liveText: { fontFamily: fonts.bold, fontSize: 8, color: '#177335' }, prototypeButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.yellow, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 7, gap: 5 }, prototypeButtonText: { color: colors.black, fontFamily: fonts.bold, fontSize: 10 },
  prototypeMetrics: { flexDirection: 'row', gap: 12, marginBottom: 27 }, workspaceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }, workspaceTitle: { fontFamily: fonts.bold, color: colors.ink, fontSize: 14 }, workspaceSub: { fontFamily: fonts.regular, color: colors.gray500, fontSize: 10, marginTop: 3 }, viewAll: { color: colors.yellowDark, fontFamily: fonts.bold, fontSize: 10 },
  filterStrip: { height: 47, borderWidth: 1, borderColor: colors.gray200, backgroundColor: colors.white, borderRadius: 9, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 16, marginBottom: 12 }, filterActive: { color: colors.black, backgroundColor: colors.yellow, fontFamily: fonts.bold, fontSize: 9, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 5 }, filterText: { color: colors.gray500, fontFamily: fonts.medium, fontSize: 9 }, searchStub: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', backgroundColor: colors.gray50, borderWidth: 1, borderColor: colors.gray200, borderRadius: 5, paddingHorizontal: 9, paddingVertical: 6 }, searchText: { color: colors.gray400, fontFamily: fonts.regular, fontSize: 9, marginLeft: 5 },
  placeholderCard: { minHeight: 280, backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.gray200, alignItems: 'center', justifyContent: 'center', padding: 28 }, placeholderIcon: { width: 53, height: 53, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.yellow }, placeholderTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink, marginTop: 15 }, placeholderCopy: { maxWidth: 400, textAlign: 'center', color: colors.gray500, fontFamily: fonts.regular, fontSize: 11, lineHeight: 17, marginTop: 7 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.gray50,
    padding: 24,
  },
  loginPage: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: colors.black,
    minHeight: "100%",
  },
  loginPageMobile: { flexDirection: 'column', minHeight: '100vh' },
  mobileLoginScroll: { flexGrow: 1, minHeight: '100vh', backgroundColor: colors.gray50 }, mobileLoginHero: { backgroundColor: colors.black, padding: 25, paddingTop: 40, paddingBottom: 31 }, mobileLoginEyebrow: { color: colors.yellow, fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1, marginTop: 34 }, mobileLoginTitle: { color: colors.white, fontFamily: fonts.extrabold, fontSize: 26, lineHeight: 31, marginTop: 9, maxWidth: 290 }, mobileLoginForm: { backgroundColor: colors.white, margin: 16, marginTop: -12, borderRadius: 13, padding: 21, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 14, elevation: 3 },
  loginPitch: {
    width: "42%",
    minWidth: 360,
    padding: 52,
    justifyContent: "center",
  },
  loginPitchMobile: { width: '100%', minWidth: 0, padding: 28, paddingBottom: 24 },
  loginPanel: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 420,
  },
  loginPanelMobile: { minWidth: 0, paddingHorizontal: 24, paddingBottom: 35, alignItems: 'stretch' },
  loginCard: { width: 340 },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandLogo: { width: 46, height: 46, borderRadius: 12 },
  brandText: {
    color: colors.yellow,
    fontFamily: fonts.extrabold,
    fontSize: 21,
  },
  brandCaption: { color: colors.gray500, fontFamily: fonts.bold, fontSize: 7, letterSpacing: 1.1, marginTop: 1 },
  eyebrow: {
    color: colors.yellow,
    fontSize: 10,
    fontFamily: fonts.bold,
    marginTop: 72,
    marginBottom: 12,
  },
  pitchTitle: {
    color: colors.white,
    fontFamily: fonts.extrabold,
    fontSize: 38,
    lineHeight: 41,
    marginBottom: 17,
  },
  pitchLine: {
    color: colors.gray300,
    fontFamily: fonts.regular,
    fontSize: 12,
    marginVertical: 4,
  },
  loginTitle: { color: colors.ink, fontFamily: fonts.bold, fontSize: 25 },
  loginSub: {
    color: colors.gray500,
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 7,
    marginBottom: 28,
  },
  fieldLabel: {
    color: colors.gray600,
    fontFamily: fonts.bold,
    fontSize: 9,
    marginBottom: 7,
    marginTop: 14,
  },
  input: {
    height: 45,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.gray50,
    borderRadius: 7,
    paddingHorizontal: 13,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.ink,
  },
  loginButton: {
    height: 45,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
    marginTop: 22,
  },
  loginButtonText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  loginFine: {
    color: colors.gray400,
    fontFamily: fonts.regular,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 16,
  },
  error: {
    color: colors.red,
    fontFamily: fonts.medium,
    fontSize: 11,
    marginTop: 10,
  },
  shell: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: colors.gray50,
    minHeight: "100%",
  },
  sidebar: {
    width: 218,
    backgroundColor: colors.black,
    padding: 24,
    minHeight: "100%",
  },
  sidebarCaption: {
    color: colors.yellow,
    fontFamily: fonts.bold,
    fontSize: 8,
    marginTop: 51,
    marginBottom: 12,
  },
  navItem: {
    paddingVertical: 10,
    paddingHorizontal: 11,
    borderRadius: 7,
    marginBottom: 3,
  },
  navActive: { backgroundColor: "#262626" },
  navText: { color: colors.gray400, fontFamily: fonts.medium, fontSize: 11 },
  navTextActive: { color: colors.white },
  sidebarBottom: { marginTop: "auto", paddingTop: 30 },
  adminName: { color: colors.white, fontFamily: fonts.bold, fontSize: 11 },
  adminRole: {
    color: colors.gray500,
    fontFamily: fonts.regular,
    fontSize: 9,
    marginTop: 3,
  },
  signOut: {
    color: colors.yellow,
    fontFamily: fonts.bold,
    fontSize: 10,
    marginTop: 16,
  },
  main: { flex: 1 },
  mainContent: { padding: 34, minWidth: 850 },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 26,
  },
  pageTitle: { fontFamily: fonts.bold, fontSize: 24, color: colors.ink },
  pageSub: {
    color: colors.gray500,
    fontFamily: fonts.regular,
    fontSize: 11,
    marginTop: 4,
  },
  refresh: {
    backgroundColor: colors.black,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 7,
  },
  refreshText: { color: colors.white, fontFamily: fonts.bold, fontSize: 10 },
  notice: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.green,
    marginBottom: 14,
  },
  metrics: { flexDirection: "row", gap: 14, marginBottom: 29 },
  metric: {
    flex: 1,
    minWidth: 150,
    minHeight: 120,
    backgroundColor: "#E5E7E9",
    borderRadius: 10,
    padding: 15,
  },
  metricMobile: { flexGrow: 1, flexBasis: '46%', minWidth: 0, minHeight: 108, padding: 12 },
  metricIcon: {
    width: 23,
    height: 23,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.yellow,
  },
  metricLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.gray600,
    marginTop: 13,
  },
  metricValue: {
    fontFamily: fonts.extrabold,
    fontSize: 23,
    color: colors.ink,
    marginTop: 3,
  },
  metricNote: {
    color: colors.gray500,
    fontFamily: fonts.regular,
    fontSize: 9,
    marginTop: 4,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 9,
    marginBottom: 10,
  },
  sectionTitle: { fontFamily: fonts.bold, color: colors.ink, fontSize: 14 },
  sectionHint: {
    color: colors.gray500,
    fontFamily: fonts.medium,
    fontSize: 10,
  },
  table: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 25,
  },
  tableScroll: { flexGrow: 1 }, tableWide: { minWidth: 760, flex: 1 },
  tableHead: {
    backgroundColor: colors.gray50,
    flexDirection: "row",
    paddingVertical: 11,
    paddingHorizontal: 15,
  },
  headCell: {
    flex: 1,
    color: colors.gray500,
    fontFamily: fonts.bold,
    fontSize: 8,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  cell: {
    flex: 1,
    color: colors.gray600,
    fontFamily: fonts.regular,
    fontSize: 10,
  },
  cellStrong: {
    flex: 1,
    color: colors.ink,
    fontFamily: fonts.bold,
    fontSize: 10,
  },
  status: {
    flex: 1,
    alignSelf: "center",
    textTransform: "capitalize",
    fontFamily: fonts.bold,
    fontSize: 9,
    paddingVertical: 4,
    paddingHorizontal: 7,
    borderRadius: 999,
    overflow: "hidden",
  },
  green: { color: "#15803D", backgroundColor: "#DCFCE7" },
  orange: { color: "#A16207", backgroundColor: "#FEF3C7" },
  red: { color: "#B91C1C", backgroundColor: "#FEE2E2" },
  gray: { color: colors.gray600, backgroundColor: colors.gray100 },
  actions: { flex: 1, flexDirection: "row", gap: 5, alignItems: 'center' },
  documentButton: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FDE68A', borderRadius: 5, paddingVertical: 6, paddingHorizontal: 7 },
  approve: {
    backgroundColor: colors.yellow,
    borderRadius: 5,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  reject: {
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 5,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  actionText: { color: colors.black, fontFamily: fonts.bold, fontSize: 8 },
  rejectText: { color: colors.gray600, fontFamily: fonts.bold, fontSize: 8 },
  empty: {
    color: colors.gray500,
    fontFamily: fonts.regular,
    fontSize: 11,
    padding: 22,
    textAlign: "center",
  },
  documentBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.52)', justifyContent: 'center', padding: 18 },
  documentModal: { width: '100%', maxWidth: 720, maxHeight: '90%', alignSelf: 'center', backgroundColor: colors.white, borderRadius: 14, overflow: 'hidden' },
  documentHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  documentTitle: { color: colors.ink, fontFamily: fonts.bold, fontSize: 17 },
  documentSub: { color: colors.gray500, fontFamily: fonts.regular, fontSize: 11, marginTop: 4 },
  closeButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' },
  documentLoading: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 10 },
  documentList: { padding: 14, gap: 12 },
  documentCard: { borderWidth: 1, borderColor: colors.gray200, borderRadius: 9, padding: 11 },
  documentLabel: { color: colors.ink, fontFamily: fonts.bold, fontSize: 11, marginBottom: 8 },
  documentImage: { width: '100%', height: 220, backgroundColor: colors.gray100, borderRadius: 6 },
  documentFallback: { height: 100, borderRadius: 6, backgroundColor: colors.gray50, alignItems: 'center', justifyContent: 'center', gap: 7 },
  documentFallbackText: { color: colors.gray500, fontFamily: fonts.regular, fontSize: 10 },
  openDocumentButton: { alignSelf: 'flex-start', marginTop: 9, backgroundColor: colors.yellow, borderRadius: 5, paddingHorizontal: 10, paddingVertical: 7 },
  openDocumentText: { color: colors.black, fontFamily: fonts.bold, fontSize: 10 },
  resubmissionFooter: { borderTopWidth: 1, borderTopColor: colors.gray200, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  resubmissionCopy: { flex: 1, color: colors.gray500, fontFamily: fonts.regular, fontSize: 10, lineHeight: 14 },
  resubmissionButton: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.yellow, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8 },
  resubmissionText: { color: colors.black, fontFamily: fonts.bold, fontSize: 10 },
});
