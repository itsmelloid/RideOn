import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { supabase, isSupabaseConfigured, PHONE_EMAIL_DOMAIN } from '../services/supabase';
import * as api from '../services/api';
import { registerForPushNotificationsAsync } from '../services/push';

const AuthContext = createContext(null);

const normalizePhone = (v = '') => v.replace(/[\s-]/g, '').replace(/^\+63/, '0');
const phoneEmail = (phone) => `${normalizePhone(phone)}@${PHONE_EMAIL_DOMAIN}`;
const INVALID = 'Incorrect mobile number/email or password.';
const NOT_CONFIGURED = 'Supabase is not set up yet. Add your keys to the .env file (see SUPABASE_GUIDE.md).';

// Converts a database profile row into the user object the screens use.
const toUser = (p) => ({
  id: p.id,
  role: p.role,
  name: p.full_name,
  phone: p.phone,
  email: p.email,
  status: p.role === 'rider' ? p.rider_status : undefined,
  rides: p.rides_count,
  rating: Number(p.rating),
  since: new Date(p.created_at).getFullYear(),
  riderId: p.rider_code,
  plate: p.plate,
  vehicleModel: p.vehicle_model,
  licenseExpiry: p.license_expiry,
  submittedAt: p.submitted_at,
  suspended: !!p.suspended,
  suspendedReason: p.suspended_reason || '',
});

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('passenger');
  const [restrictionNotice, setRestrictionNotice] = useState('');

  const enforceAccountAccess = useCallback(async (uid) => {
    const profile = await api.fetchProfile(uid);
    if (profile.suspended) {
      const message = `Your account is restricted.${profile.suspended_reason ? ` Reason: ${profile.suspended_reason}` : ' Contact support for help.'}`;
      await supabase.auth.signOut();
      setUser(null);
      setRestrictionNotice(message);
      throw new Error(message);
    }
    return profile;
  }, []);

  // Restore the saved session on app start.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (isSupabaseConfigured) {
          const { data } = await supabase.auth.getSession();
          if (data.session) setUser(toUser(await enforceAccountAccess(data.session.user.id)));
        }
      } catch (e) {
        // offline or expired session - show the login screen
      } finally {
        if (alive) setReady(true);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setUser(null);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.getUser().then(({ data }) => {
          if (data.user) return enforceAccountAccess(data.user.id).then((profile) => setUser(toUser(profile)));
          return null;
        }).catch(() => {});
      }
    });
    return () => subscription.remove();
  }, [enforceAccountAccess]);

  useEffect(() => {
    if (!user || user.suspended) return undefined;
    registerForPushNotificationsAsync().then((token) => {
      if (token) return api.savePushToken(user.id, token, 'android');
      return null;
    }).catch(() => {});
    return undefined;
  }, [user?.id, user?.suspended]);

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) return null;
    const u = toUser(await enforceAccountAccess(data.user.id));
    setUser(u);
    return u;
  }, []);

  const signIn = useCallback(async (identifier, password, role) => {
    if (!isSupabaseConfigured) throw new Error(NOT_CONFIGURED);
    const id = identifier.trim();
    const lookup = id.includes('@') ? id.toLowerCase() : normalizePhone(id);
    let email;
    try {
      email = await api.resolveLoginEmail(lookup);
    } catch (e) {
      throw new Error('Could not reach the server. Check your internet connection.');
    }
    if (!email) throw new Error(INVALID);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(INVALID);
    const profile = await enforceAccountAccess(data.user.id);
    if (profile.role !== role) {
      await supabase.auth.signOut();
      const other = profile.role === 'rider' ? 'Rider' : 'Passenger';
      throw new Error(`This account is registered as a ${other}. Go back and choose ${other}.`);
    }
    const u = toUser(profile);
    setRestrictionNotice('');
    setUser(u);
    return u;
  }, []);

  const signUp = useCallback(async (data) => {
    if (!isSupabaseConfigured) throw new Error(NOT_CONFIGURED);
    const phone = normalizePhone(data.phone);
    const { data: res, error } = await supabase.auth.signUp({
      email: phoneEmail(phone),
      password: data.password,
      options: { data: { role: data.role, full_name: data.fullName, phone, email: data.email || '' } },
    });
    if (error) {
      if (/already|registered|database error/i.test(error.message)) throw new Error('This mobile number is already registered.');
      throw new Error(error.message);
    }
    if (!res.session) throw new Error('Email confirmation is still ON in Supabase. Turn off "Confirm email" (Authentication > Sign In / Providers > Email).');
    const u = toUser(await enforceAccountAccess(res.user.id));
    setRestrictionNotice('');
    setUser(u); // RootNavigator switches to the right app
    return u;
  }, []);

  // Kept so OTPScreen works unchanged: the session already started inside signUp.
  const startSession = useCallback(async () => {}, []);

  const signOut = useCallback(async () => {
    try {
      if (user && user.role === 'rider') await api.setRiderLocation(user.id, null, false).catch(() => {});
      await supabase.auth.signOut();
    } finally {
      setUser(null);
    }
  }, [user]);

  // Rider registration: upload documents, save details, then move the application to "pending".
  const submitApplication = useCallback(
    async (fields, docs) => {
      const uid = user.id;
      const paths = {};
      for (const [key, file] of Object.entries(docs)) paths[key] = await api.uploadDocument(uid, key, file);
      await api.updateProfile(uid, {
        full_name: fields.fullName,
        plate: fields.plate,
        vehicle_model: fields.model,
        license_number: fields.license,
        license_expiry: fields.expiryIso,
        documents: paths,
      });
      await api.submitRiderApplicationRpc();
      await refreshProfile();
    },
    [user, refreshProfile]
  );

  const value = useMemo(
    () => ({ ready, user, selectedRole, setSelectedRole, restrictionNotice, setRestrictionNotice, signIn, signUp, signOut, startSession, refreshProfile, submitApplication }),
    [ready, user, selectedRole, restrictionNotice, signIn, signUp, signOut, startSession, refreshProfile, submitApplication]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
