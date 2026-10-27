import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getRoute } from '../services/maps';
import { calculateFare } from '../services/fare';
import { PLACES, toPlace } from '../data/places';
import { supabase } from '../../lib/supabase';
import { useAuth } from './AuthContext';

const Ctx = createContext(null);
const DEFAULT_PICKUP = toPlace(PLACES.find((p) => p.id === 'stm'));
const shortId = (id) => `#RO-${String(id || '').replace(/-/g, '').slice(0, 6).toUpperCase()}`;
const toPlaceFromRide = (ride, kind) => ({
  id: `${ride.id}:${kind}`,
  name: kind === 'pickup' ? ride.pickup_label : ride.destination_label,
  address: '',
  coords: { latitude: kind === 'pickup' ? ride.pickup_lat : ride.destination_lat, longitude: kind === 'pickup' ? ride.pickup_lng : ride.destination_lng },
});
const dbStatus = (status) => ({ requested: 'searching', accepted: 'found', rider_arrived: 'found', in_progress: 'inTrip', completed: 'completed', cancelled: 'idle' }[status] || 'idle');

export function BookingProvider({ children }) {
  const { user } = useAuth();
  const [pickup, setPickup] = useState(DEFAULT_PICKUP);
  const [destination, setDestination] = useState(null);
  const [route, setRoute] = useState(null);
  const [fare, setFare] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [status, setStatus] = useState('idle');
  const [activeRide, setActiveRide] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [lastTrip, setLastTrip] = useState(null);

  const sync = useCallback(async () => {
    if (!user || user.role !== 'passenger') return;
    const [{ data: rides, error: ridesError }, { data: notes }, { data: txs }] = await Promise.all([
      supabase.from('rides').select('*').eq('passenger_id', user.id).order('requested_at', { ascending: false }),
      supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('wallet_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);
    if (ridesError) throw ridesError;
    const list = (rides || []).map((r) => ({ id: shortId(r.id), dbId: r.id,
      status: r.status === 'completed' ? 'Completed' : r.status === 'cancelled' ? 'Cancelled' : 'Active',
      pickup: r.pickup_label, destination: r.destination_label, fare: Number(r.fare_total),
      rider: r.rider_id ? 'Assigned rider' : undefined, tag: r.status === 'completed' ? 'Finished' : undefined,
      when: new Date(r.requested_at).toLocaleString() }));
    setBookings(list);
    setNotifications((notes || []).map((n) => ({ id: n.id, title: n.title, body: n.body, type: n.type,
      unread: !n.is_read, time: new Date(n.created_at).toLocaleString(), group: 'Today', icon: 'notifications' })));
    setTransactions((txs || []).map((t) => ({ id: t.id, title: t.kind.replace('_', ' '), amount: Number(t.amount),
      date: new Date(t.created_at).toLocaleString(), status: t.status === 'success' ? 'Success' : t.status, icon: 'wallet' })));
    const live = (rides || []).find((r) => ['requested', 'accepted', 'rider_arrived', 'in_progress'].includes(r.status));
    if (live) {
      setActiveRide(live); setStatus(dbStatus(live.status)); setPickup(toPlaceFromRide(live, 'pickup'));
      setDestination(toPlaceFromRide(live, 'destination'));
      setFare({ total: Number(live.fare_total), riderShare: Number(live.rider_share), commission: Number(live.commission), base: 0, distanceCharge: 0 });
    } else {
      const completed = (rides || []).find((r) => r.status === 'completed');
      if (completed) setLastTrip({ id: shortId(completed.id), dbId: completed.id, pickup: completed.pickup_label, destination: completed.destination_label,
        fare: Number(completed.fare_total), method: completed.payment_method, distanceKm: Number(completed.distance_km || 0), rider: 'Assigned rider' });
      setActiveRide(null); setStatus(completed ? 'completed' : 'idle');
    }
  }, [status, user]);

  useEffect(() => { sync().catch(() => {}); }, [sync]);
  useEffect(() => {
    if (!user || user.role !== 'passenger') return undefined;
    const channel = supabase.channel(`passenger-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides', filter: `passenger_id=eq.${user.id}` }, () => sync().catch(() => {}))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => sync().catch(() => {}))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [sync, user]);

  const prepareTrip = useCallback(async () => {
    if (!pickup?.coords || !destination?.coords) return null;
    const nextRoute = await getRoute(pickup.coords, destination.coords);
    setRoute(nextRoute); setFare(calculateFare(nextRoute.distanceKm));
    return nextRoute;
  }, [destination, pickup]);

  const swap = () => { if (destination) { setPickup(destination); setDestination(pickup); } };

  const requestRide = useCallback(async () => {
    if (!user || !pickup?.coords || !destination?.coords || !fare || !route) throw new Error('Choose a pickup and destination first.');
    const { data, error } = await supabase.from('rides').insert({
      passenger_id: user.id, pickup_label: pickup.name, pickup_lat: pickup.coords.latitude, pickup_lng: pickup.coords.longitude,
      destination_label: destination.name, destination_lat: destination.coords.latitude, destination_lng: destination.coords.longitude,
      distance_km: route.distanceKm, duration_min: Math.ceil(route.durationMin), fare_total: fare.total,
      rider_share: fare.riderShare, commission: fare.commission, payment_method: paymentMethod,
    }).select().single();
    if (error) throw error;
    setActiveRide(data); setStatus('searching');
    return data;
  }, [destination, fare, paymentMethod, pickup, route, user]);

  const cancelRide = useCallback(async () => {
    if (activeRide?.id) {
      const { error } = await supabase.rpc('update_ride_status', { p_ride_id: activeRide.id, p_status: 'cancelled' });
      if (error) throw error;
    }
    setActiveRide(null); setStatus('idle');
  }, [activeRide]);

  const completeTrip = useCallback(() => { if (activeRide) setStatus('completed'); }, [activeRide]);
  const finishAndReset = useCallback(() => { setStatus('idle'); setDestination(null); setRoute(null); setFare(null); }, []);
  const markAllRead = useCallback(async () => {
    if (!user) return;
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    if (!error) sync().catch(() => {});
  }, [sync, user]);
  const rateTrip = useCallback(async (rating) => {
    if (!lastTrip?.dbId) return;
    const { error } = await supabase.rpc('rate_ride', { p_ride_id: lastTrip.dbId, p_rating: rating });
    if (error) throw error;
  }, [lastTrip]);
  const balance = transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const etaMinutes = activeRide?.duration_min || route?.durationMin || 0;
  const value = useMemo(() => ({ pickup, setPickup, destination, setDestination, swap, route, fare, paymentMethod, setPaymentMethod,
    status, tripId: activeRide ? shortId(activeRide.id) : null, leg: null, legRoute: route, progress: 0, riderLocation: null,
    balance, transactions, bookings, notifications, lastTrip, etaMinutes, remainingKm: route?.distanceKm || 0,
    hasUnread: notifications.some((n) => n.unread), prepareTrip, requestRide, beginTrip: () => {}, cancelRide,
    completeTrip, finishAndReset, topUp: () => {}, markAllRead, rateTrip, sync }),
  [activeRide, balance, bookings, cancelRide, completeTrip, destination, etaMinutes, fare, finishAndReset, lastTrip, markAllRead, notifications, paymentMethod, pickup, prepareTrip, rateTrip, requestRide, route, status, transactions]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useBooking = () => useContext(Ctx);
