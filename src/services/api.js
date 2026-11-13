import { supabase } from './supabase';

// Small wrapper: returns data or throws an Error with a readable message.
const must = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

export const fetchProfile = async (uid) => must(await supabase.from('profiles').select('*').eq('id', uid).single());
export const resolveLoginEmail = async (identifier) => must(await supabase.rpc('resolve_login_email', { identifier }));
export const updateProfile = async (uid, patch) => must(await supabase.from('profiles').update(patch).eq('id', uid));
export const submitRiderApplicationRpc = async () => must(await supabase.rpc('submit_rider_application'));

export const topUpWallet = async (amount) => Number(must(await supabase.rpc('top_up_wallet', { p_amount: amount })));
export const listTransactions = async (uid) =>
  must(await supabase.from('wallet_transactions').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(50));

export const listTrips = async (column, uid) =>
  must(await supabase.from('trips').select('*').eq(column, uid).order('created_at', { ascending: false }).limit(200));

// Uploads a picked image/file to the private "rider-documents" bucket under the user's own folder.
export const uploadDocument = async (uid, name, file) => {
  const res = await fetch(file.uri);
  const bytes = await res.arrayBuffer();
  const suppliedExt = (file.name && file.name.includes('.') ? file.name.split('.').pop() : '').toLowerCase();
  const isPdf = file.mimeType === 'application/pdf' || suppliedExt === 'pdf';
  const ext = isPdf ? 'pdf' : file.mimeType === 'image/png' ? 'png' : file.mimeType === 'image/webp' ? 'webp' : 'jpg';
  const path = `${uid}/${name}.${ext}`;
  const contentType = isPdf ? 'application/pdf' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  const { error } = await supabase.storage.from('rider-documents').upload(path, bytes, {
    upsert: true,
    contentType,
  });
  if (error) throw new Error(error.message);
  return path;
};

/* ---------- Real matching (database functions in supabase/matching.sql) ---------- */
// Passenger
export const requestTrip = async (p) => must(await supabase.rpc('request_trip', { p }));
export const cancelTrip = async (id, reason) => must(await supabase.rpc('cancel_trip', { p_trip: id, p_reason: reason || null }));
export const rateTrip = async (id, rating, feedback) => must(await supabase.rpc('rate_trip', { p_trip: id, p_rating: rating, p_feedback: feedback || null }));
// Both apps
export const myActiveTrip = async () => must(await supabase.rpc('my_active_trip'));
export const pollTrip = async (id) => must(await supabase.rpc('poll_trip', { p_trip: id }));
// Rider
export const openRequests = async () => (await must(await supabase.rpc('open_requests'))) || [];
export const declineTrip = async (id) => must(await supabase.rpc('decline_trip', { p_trip: id }));
export const acceptTrip = async (id) => must(await supabase.rpc('accept_trip', { p_trip: id }));
export const riderArrived = async (id) => must(await supabase.rpc('rider_arrived', { p_trip: id }));
export const startTrip = async (id) => must(await supabase.rpc('start_trip', { p_trip: id }));
export const completeTrip = async (id) => must(await supabase.rpc('complete_trip', { p_trip: id }));
export const riderCancelTrip = async (id, reason) => must(await supabase.rpc('rider_cancel_trip', { p_trip: id, p_reason: reason || null }));

// The rider app reports "I am online, here" so dispatch knows who can receive requests.
export const setRiderLocation = async (uid, coords, online) =>
  must(
    await supabase.from('rider_locations').upsert({
      rider_id: uid,
      online,
      updated_at: new Date().toISOString(),
      ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}),
    })
  );
