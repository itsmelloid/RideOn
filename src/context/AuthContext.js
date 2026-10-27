import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { supabase } from '../../lib/supabase';

const AuthContext = createContext(null);

const toUser = (authUser, profile, riderProfile) => ({
  id: authUser.id, email: authUser.email, name: profile.full_name, fullName: profile.full_name,
  phone: profile.phone, avatarPath: profile.avatar_path, role: profile.role,
  ...(riderProfile ? { status: riderProfile.status, plate: riderProfile.plate,
    vehicleModel: riderProfile.vehicle_model, riderId: riderProfile.rider_id,
    submittedAt: riderProfile.submitted_at } : {}),
});

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('passenger');

  const loadProfile = useCallback(async (authUser) => {
    if (!authUser) { setUser(null); return null; }
    const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
    if (error) throw error;
    let riderProfile = null;
    if (profile.role === 'rider') {
      const { data, error: riderError } = await supabase.from('rider_profiles').select('*').eq('user_id', authUser.id).maybeSingle();
      if (riderError) throw riderError;
      riderProfile = data;
    }
    const next = toUser(authUser, profile, riderProfile);
    setUser(next);
    return next;
  }, []);

  useEffect(() => {
    let alive = true;
    const boot = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (alive) await loadProfile(session?.user || null);
      } catch { if (alive) setUser(null); } finally { if (alive) setReady(true); }
    };
    boot();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadProfile(session?.user || null).catch(() => setUser(null));
    });
    const appState = Platform.OS === 'web' ? null : AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    return () => { alive = false; subscription.unsubscribe(); appState?.remove(); };
  }, [loadProfile]);

  const signIn = useCallback(async (email, password, role) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
    const loaded = await loadProfile(data.user);
    if (loaded.role !== role) {
      await supabase.auth.signOut();
      throw new Error(`This account is registered as a ${loaded.role}, not a ${role}.`);
    }
    return loaded;
  }, [loadProfile]);

  const signUp = useCallback(async (data) => {
    const { data: response, error } = await supabase.auth.signUp({
      email: data.email.trim(), password: data.password,
      options: { data: { full_name: data.fullName.trim(), phone: data.phone, role: data.role } },
    });
    if (error) throw error;
    if (!response.session) throw new Error('Check your email to confirm your account, then log in. For local testing, disable Confirm email in Supabase Auth settings.');
    return loadProfile(response.user);
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
  }, []);

  const updateUser = useCallback(async (patch) => {
    if (!user) return;
    const profilePatch = {};
    if (patch.name || patch.fullName) profilePatch.full_name = patch.name || patch.fullName;
    if (patch.phone) profilePatch.phone = patch.phone;
    if (patch.avatarPath) profilePatch.avatar_path = patch.avatarPath;
    if (Object.keys(profilePatch).length) {
      const { error } = await supabase.from('profiles').update(profilePatch).eq('id', user.id);
      if (error) throw error;
    }
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) await loadProfile(authUser);
  }, [loadProfile, user]);

  const submitRiderApplication = useCallback(async ({ fullName, phone, plate, vehicleModel }) => {
    const { error } = await supabase.rpc('submit_rider_application', {
      p_full_name: fullName, p_phone: phone, p_plate: plate, p_vehicle_model: vehicleModel,
    });
    if (error) throw error;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) await loadProfile(authUser);
  }, [loadProfile]);

  const value = useMemo(() => ({ ready, user, selectedRole, setSelectedRole, signIn, signUp, signOut,
    startSession: loadProfile, updateUser, submitRiderApplication }),
  [ready, user, selectedRole, signIn, signUp, signOut, loadProfile, updateUser, submitRiderApplication]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
