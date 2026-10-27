import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getRoute } from '../services/maps';
import { getCurrentCoords } from '../services/location';
import { calculateFare } from '../services/fare';
import { supabase } from '../../lib/supabase';
import { useAuth } from './AuthContext';

export const REQUEST_SECONDS = 12;
const Ctx = createContext(null);
const shortId = (id) => `#RO-${String(id || '').replace(/-/g, '').slice(0, 6).toUpperCase()}`;
const coords = (lat, lng) => ({ latitude: lat, longitude: lng });

const rowToTrip = async (row) => {
  const pickup = { name: row.pickup_label, address: '', coords: coords(row.pickup_lat, row.pickup_lng) };
  const destination = { name: row.destination_label, address: '', coords: coords(row.destination_lat, row.destination_lng) };
  const route = await getRoute(pickup.coords, destination.coords);
  const fare = { ...calculateFare(Number(row.distance_km || route.distanceKm)), total: Number(row.fare_total), riderShare: Number(row.rider_share), commission: Number(row.commission) };
  return { id: shortId(row.id), dbId: row.id, passenger: { name: row.passenger_name || 'Passenger', rating: 5, trips: 0 }, pickup, destination, route, fare, pickupAwayKm: 0, payment: row.payment_method || 'Cash', startedAt: row.started_at };
};

export function RiderProvider({ children }) {
  const { user } = useAuth();
  const [online, setOnlineState] = useState(false);
  const [request, setRequest] = useState(null);
  const [trip, setTrip] = useState(null);
  const [stage, setStage] = useState(null);
  const [summary, setSummary] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [history, setHistory] = useState([]);

  const refresh = useCallback(async () => {
    if (!user || user.role !== 'rider' || user.status !== 'approved') return;
    const [{ data: location }, { data: activeRows }, { data: historyRows }] = await Promise.all([
      supabase.from('rider_locations').select('is_online').eq('rider_id', user.id).maybeSingle(),
      supabase.from('rides').select('*').eq('rider_id', user.id).in('status', ['accepted', 'rider_arrived', 'in_progress']).order('requested_at', { ascending: false }).limit(1),
      supabase.from('rides').select('*').eq('rider_id', user.id).in('status', ['completed', 'cancelled']).order('requested_at', { ascending: false }).limit(50),
    ]);
    setOnlineState(Boolean(location?.is_online));
    setHistory((historyRows || []).map((r) => ({ id: shortId(r.id), status: r.status === 'completed' ? 'Completed' : 'Cancelled',
      when: new Date(r.requested_at).toLocaleString(), from: r.pickup_label, to: r.destination_label,
      fare: Number(r.fare_total), commission: Number(r.commission), share: Number(r.rider_share), note: 'Cancelled ride.' })));
    if (activeRows?.[0]) {
      const active = await rowToTrip(activeRows[0]);
      setTrip(active);
      setStage(activeRows[0].status === 'accepted' ? 'enRoute' : activeRows[0].status === 'rider_arrived' ? 'arrived' : 'inProgress');
      setStartedAt(activeRows[0].started_at ? new Date(activeRows[0].started_at).getTime() : null);
    } else setTrip(null);
  }, [user]);

  const refreshRequest = useCallback(async () => {
    if (!online || trip || !user || user.status !== 'approved') { setRequest(null); return; }
    const { data, error } = await supabase.rpc('available_rides');
    if (error) return;
    if (data?.[0]) setRequest(await rowToTrip(data[0]));
    else setRequest(null);
  }, [online, trip, user]);

  useEffect(() => { refresh().catch(() => {}); }, [refresh]);
  useEffect(() => {
    refreshRequest().catch(() => {});
    const timer = setInterval(() => refreshRequest().catch(() => {}), 7000);
    return () => clearInterval(timer);
  }, [refreshRequest]);
  useEffect(() => {
    if (!user || user.role !== 'rider') return undefined;
    const channel = supabase.channel(`rider-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides', filter: `rider_id=eq.${user.id}` }, () => refresh().catch(() => {}))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [refresh, user]);

  const setOnline = useCallback(async (value) => {
    if (!user) return;
    const current = value ? await getCurrentCoords() : null;
    const { error } = await supabase.from('rider_locations').upsert({ rider_id: user.id, is_online: value,
      latitude: current?.latitude || 8.1781, longitude: current?.longitude || 125.9935, updated_at: new Date().toISOString() });
    if (error) throw error;
    setOnlineState(value); if (!value) setRequest(null);
  }, [user]);

  const accept = useCallback(async () => {
    if (!request) return;
    const { error } = await supabase.rpc('claim_ride', { p_ride_id: request.dbId });
    if (error) throw error;
    setTrip(request); setStage('enRoute'); setRequest(null);
  }, [request]);
  const decline = useCallback(() => setRequest(null), []);
  const updateStatus = useCallback(async (next) => {
    if (!trip) return;
    const { error } = await supabase.rpc('update_ride_status', { p_ride_id: trip.dbId, p_status: next });
    if (error) throw error;
  }, [trip]);
  const markArrived = useCallback(async () => { await updateStatus('rider_arrived'); setStage('arrived'); }, [updateStatus]);
  const startTrip = useCallback(async () => { await updateStatus('in_progress'); setStartedAt(Date.now()); setStage('inProgress'); }, [updateStatus]);
  const cancelTrip = useCallback(async () => { await updateStatus('cancelled'); setTrip(null); setStage(null); }, [updateStatus]);
  const completeTrip = useCallback(async () => {
    if (!trip) return;
    await updateStatus('completed');
    setSummary({ id: trip.id, passenger: trip.passenger, fare: trip.fare.total, share: trip.fare.riderShare, commission: trip.fare.commission, distanceKm: trip.route.distanceKm, durationMin: trip.route.durationMin });
    setTrip(null); setStage(null); refresh().catch(() => {});
  }, [refresh, trip, updateStatus]);
  const todayEarnings = history.filter((r) => r.status === 'Completed').reduce((total, r) => total + Number(r.share || 0), 0);
  const totalTrips = history.filter((r) => r.status === 'Completed').length;
  const value = useMemo(() => ({ online, setOnline, todayEarnings, totalTrips, request, trip, stage, summary, history,
    accept, decline, markArrived, startTrip, cancelTrip, completeTrip, startedAt }),
  [accept, cancelTrip, completeTrip, decline, history, markArrived, online, request, stage, startTrip, startedAt, summary, todayEarnings, totalTrips, trip]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useRider = () => useContext(Ctx);
