import { supabase, isSupabaseConfigured } from './supabase';

// The SERVER calculates the real fare (database function calc_fare). This copy only shows an estimate
// before booking, using the same rules read from the `fare_settings` table. Defaults are used until loaded.
let settings = { base: 15, perKm: 1.6, min: 15, rounding: 'nearest_1', commissionRate: 0.1 };

export const getFareSettings = () => settings;

export const loadFareSettings = async () => {
  if (!isSupabaseConfigured) return settings;
  try {
    const { data } = await supabase.from('fare_settings').select('*').eq('id', 1).single();
    if (data) {
      settings = {
        base: Number(data.base_fare),
        perKm: Number(data.per_km),
        min: Number(data.min_fare),
        rounding: data.rounding,
        commissionRate: Number(data.commission_rate),
      };
    }
  } catch (e) {
    // keep the previous values
  }
  return settings;
};

const round2 = (n) => Math.round(n * 100) / 100;
const applyRounding = (value, rule) => {
  if (rule === 'nearest_1') return Math.round(value);
  if (rule === 'up_1') return Math.ceil(value);
  if (rule === 'nearest_5') return Math.round(value / 5) * 5;
  return round2(value);
};

export const calculateFare = (distanceKm) => {
  const s = settings;
  const total = Math.max(s.min, applyRounding(s.base + distanceKm * s.perKm, s.rounding));
  const commission = round2(total * s.commissionRate);
  return { base: s.base, distanceCharge: round2(total - s.base), total, commission, riderShare: round2(total - commission) };
};
