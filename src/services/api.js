
import { supabase } from './supabase';
import { File } from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

// Small wrapper: returns data or throws an Error with a readable message.
const must = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

export const fetchProfile = async (uid) =>
  must(await supabase.from('profiles').select('*').eq('id', uid).single());

export const resolveLoginEmail = async (identifier) =>
  must(await supabase.rpc('resolve_login_email', { identifier }));

export const updateProfile = async (uid, patch) =>
  must(await supabase.from('profiles').update(patch).eq('id', uid));

export const setAccountSuspension = async (uid, suspended, reason) =>
  must(
    await supabase.rpc('set_account_suspension', {
      p_user_id: uid,
      p_suspended: suspended,
      p_reason: reason || null,
    })
  );

export const savePushToken = async (uid, token, platform) =>
  must(await supabase.from('push_tokens').upsert({ user_id: uid, token, platform, updated_at: new Date().toISOString() }, { onConflict: 'token' }));

export const submitRiderApplicationRpc = async () =>
  must(await supabase.rpc('submit_rider_application'));

export const createTopupRequest = async (amount, referenceNote) =>
  must(
    await supabase.rpc('create_topup_request', {
      p_amount: amount,
      p_reference_note: referenceNote || '',
    })
  );

export const reviewTopupRequest = async (id, status) =>
  must(await supabase.rpc('review_topup_request', { p_request_id: id, p_status: status }));

export const listTopupRequests = async (uid) =>
  must(
    await supabase
      .from('topup_requests')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50)
  );

export const listTransactions = async (uid) =>
  must(
    await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50)
  );

export const listTrips = async (column, uid) =>
  must(
    await supabase
      .from('trips')
      .select('*')
      .eq(column, uid)
      .order('created_at', { ascending: false })
      .limit(200)
  );

// Upload a picked image/PDF. The registration screen copies picked files to the
// app documents directory before they reach here, so their URI remains readable
// after Android's DocumentPicker cache is released.
export const uploadDocument = async (uid, name, file) => {
  if (!uid) throw new Error('Missing rider user ID.');
  if (!file?.uri) throw new Error(`No file selected for ${name}.`);

  const suppliedName = String(file.name || '');
  const suppliedExt = suppliedName.includes('.')
    ? suppliedName.split('.').pop().toLowerCase()
    : '';

  const mimeType = String(file.mimeType || '').toLowerCase();

  let ext;
  let contentType;

  if (mimeType === 'application/pdf' || suppliedExt === 'pdf') {
    ext = 'pdf';
    contentType = 'application/pdf';
  } else if (mimeType === 'image/png' || suppliedExt === 'png') {
    ext = 'png';
    contentType = 'image/png';
  } else if (mimeType === 'image/webp' || suppliedExt === 'webp') {
    ext = 'webp';
    contentType = 'image/webp';
  } else if (
    mimeType === 'image/jpeg' ||
    mimeType === 'image/jpg' ||
    ['jpg', 'jpeg'].includes(suppliedExt) ||
    !mimeType
  ) {
    ext = 'jpg';
    contentType = 'image/jpeg';
  } else {
    throw new Error(
      `Unsupported document type: ${mimeType || suppliedExt || 'unknown'}. Please select a JPG, PNG, WEBP, or PDF file.`
    );
  }

  const localFile = new File(file.uri);
  if (!localFile.exists) {
    throw new Error(
      `The selected ${name} file is no longer available. Please select it again.`
    );
  }

  const base64 = await localFile.base64();

  if (!base64 || !base64.trim()) {
    throw new Error(
      `The selected ${name} file is empty or could not be read. Please select it again.`
    );
  }

  const bytes = decode(base64);

  if (!bytes || bytes.byteLength === 0) {
    throw new Error(
      `The selected ${name} file contains no data. Please select it again.`
    );
  }

  const path = `${uid}/${name}.${ext}`;

  const { error } = await supabase.storage
    .from('rider-documents')
    .upload(path, bytes, {
      upsert: true,
      contentType,
    });

  if (error) {
    throw new Error(`Upload failed for ${name}: ${error.message}`);
  }

  return path;
};

/* ---------- Real matching (database functions in supabase/matching.sql) ---------- */

// Passenger
export const requestTrip = async (p) =>
  must(await supabase.rpc('request_trip', { p }));

export const cancelTrip = async (id, reason) =>
  must(
    await supabase.rpc('cancel_trip', {
      p_trip: id,
      p_reason: reason || null,
    })
  );

export const rateTrip = async (id, rating, feedback) =>
  must(
    await supabase.rpc('rate_trip', {
      p_trip: id,
      p_rating: rating,
      p_feedback: feedback || null,
    })
  );

// Both apps
export const myActiveTrip = async () =>
  must(await supabase.rpc('my_active_trip'));

export const pollTrip = async (id) =>
  must(await supabase.rpc('poll_trip', { p_trip: id }));

// Rider
export const openRequests = async () =>
  (await must(await supabase.rpc('open_requests'))) || [];

export const declineTrip = async (id) =>
  must(await supabase.rpc('decline_trip', { p_trip: id }));

export const acceptTrip = async (id) =>
  must(await supabase.rpc('accept_trip', { p_trip: id }));

export const riderArrived = async (id) =>
  must(await supabase.rpc('rider_arrived', { p_trip: id }));

export const startTrip = async (id) =>
  must(await supabase.rpc('start_trip', { p_trip: id }));

export const completeTrip = async (id) =>
  must(await supabase.rpc('complete_trip', { p_trip: id }));

export const riderCancelTrip = async (id, reason) =>
  must(
    await supabase.rpc('rider_cancel_trip', {
      p_trip: id,
      p_reason: reason || null,
    })
  );

// Rider location
export const setRiderLocation = async (uid, coords, online) =>
  must(
    await supabase.from('rider_locations').upsert({
      rider_id: uid,
      online,
      updated_at: new Date().toISOString(),
      ...(coords
        ? {
            latitude: coords.latitude,
            longitude: coords.longitude,
          }
        : {}),
    })
  );
