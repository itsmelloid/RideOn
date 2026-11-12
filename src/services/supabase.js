import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

// True only when both values exist in .env (see SUPABASE_GUIDE.md).
export const isSupabaseConfigured = url.length > 0 && key.length > 0;

// The publishable key is safe inside the app because Row Level Security protects the data.
// NEVER put the secret / service_role key in this app.
export const supabase = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder-key', {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

// Phone numbers become a hidden login email, e.g. 09123456789@phone.rideon.app (no email is ever sent).
// If Supabase rejects this domain, change it here to one you own.
export const PHONE_EMAIL_DOMAIN = 'phone.rideon.app';
