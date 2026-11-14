import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import * as api from '../services/api';
import { getRoute } from '../services/maps';
import { calculateFare, loadFareSettings } from '../services/fare';
import { haversineKm } from '../utils/geo';
import { PLACES, toPlace } from '../data/places';

// How often the passenger app asks the server "what is happening with my trip?"
export const POLL_MS = 3000;
const ACTIVE = ['searching', 'accepted', 'arrived', 'in_progress'];
const AVG_SPEED_KMH = 20; // used for the "mins away" estimate

const fmtDate = (iso) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const mapTx = (t) => ({ id: t.id, title: t.title, amount: Number(t.amount), date: fmtDate(t.created_at), status: t.status, icon: t.kind === 'topup' ? 'wallet' : 'car' });
const mapTrip = (t) => ({
  id: t.trip_code,
  status: t.status === 'completed' ? 'Completed' : t.status === 'cancelled' ? 'Cancelled' : 'Active',
  pickup: t.pickup_name,
  destination: t.destination_name,
  when: fmtDate(t.created_at),
  fare: Number(t.fare),
  rider: t.rider_name || 'RideOn rider',
  tag: 'Finished',
});
const coordsOf = (lat, lng) => ({ latitude: lat, longitude: lng });
const Ctx = createContext(null);

const DEFAULT_PICKUP = toPlace(PLACES.find((p) => p.id === 'stm'));

export function BookingProvider({ children }) {
  const { user } = useAuth();
  const [pickup, setPickup] = useState(DEFAULT_PICKUP);
  const [destination, setDestination] = useState(null);
  const [route, setRoute] = useState(null); // pickup -> destination (from Google)
  const [fare, setFare] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('RideOn Wallet');
  const [trip, setTrip] = useState(null); // the trip row from the database - the single source of truth
  const [riderLocation, setRiderLocation] = useState(null);
  const [legRoute, setLegRoute] = useState(null);
  const [resumeTarget, setResumeTarget] = useState(null);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [topupRequests, setTopupRequests] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [syncError, setSyncError] = useState('');
  const [lastTrip, setLastTrip] = useState(null);
  const lastStatus = useRef(null);
  const pickupRouteFor = useRef(null);

  const pushNotification = useCallback((n) => {
    setNotifications((prev) => [{ id: `n${Date.now()}${Math.random()}`, group: 'Today', time: 'Just now', unread: true, type: 'Bookings', ...n }, ...prev]);
  }, []);

  // ---- wallet, transactions and trip history ----
  const reload = useCallback(async () => {
    if (!user || user.role !== 'passenger') return;
    try {
      const [profile, tx, trips, topups] = await Promise.all([api.fetchProfile(user.id), api.listTransactions(user.id), api.listTrips('passenger_id', user.id), api.listTopupRequests(user.id)]);
      setBalance(Number(profile.wallet_balance));
      setTransactions(tx.map(mapTx));
      setBookings(trips.filter((t) => !ACTIVE.includes(t.status)).map(mapTrip));
      setTopupRequests(topups);
      setSyncError('');
    } catch (e) {
      setSyncError(e.message);
    }
  }, [user]);

  // ---- on login: load data, and continue a trip that was already running (app was closed) ----
  useEffect(() => {
    if (!user || user.role !== 'passenger') {
      setBalance(0); setTransactions([]); setTopupRequests([]); setBookings([]); setNotifications([]); setTrip(null);
      return undefined;
    }
    reload();
    loadFareSettings();
    let alive = true;
    (async () => {
      try {
        const row = await api.myActiveTrip();
        if (!alive || !row || row.passenger_id !== user.id) return;
        const p = { id: 'trip-pickup', name: row.pickup_name, address: '', coords: coordsOf(row.pickup_lat, row.pickup_lng) };
        const d = { id: 'trip-destination', name: row.destination_name, address: '', coords: coordsOf(row.destination_lat, row.destination_lng) };
        setPickup(p);
        setDestination(d);
        setPaymentMethod(row.payment_method);
        setFare({ total: Number(row.fare), commission: Number(row.commission), riderShare: Number(row.rider_share) });
        setTrip(row);
        setResumeTarget(row.status === 'searching' ? 'Searching' : row.status === 'in_progress' ? 'EnRoute' : 'RiderFound');
        getRoute(p.coords, d.coords).then((r) => alive && setRoute(r));
      } catch (e) {
        // no active trip, or offline
      }
    })();
    return () => { alive = false; };
  }, [user?.id, user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- keep asking the server about the trip while it is active ----
  useEffect(() => {
    if (!trip || !ACTIVE.includes(trip.status)) return undefined;
    let alive = true;
    let busy = false;
    const tick = async () => {
      if (busy) return;
      busy = true;
      try {
        const res = await api.pollTrip(trip.id);
        if (!alive || !res) return;
        setTrip(res.trip);
        setRiderLocation(res.rider_location ? coordsOf(res.rider_location.latitude, res.rider_location.longitude) : null);
      } catch (e) {
        // network hiccup: try again on the next tick
      } finally {
        busy = false;
      }
    };
    const timer = setInterval(tick, POLL_MS);
    return () => { alive = false; clearInterval(timer); };
  }, [trip?.id, trip?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- react to status changes: notifications + the completed summary ----
  useEffect(() => {
    const s = trip?.status;
    const prev = lastStatus.current;
    if (s === prev) return;
    lastStatus.current = s;
    if (!trip) return;
    if (s === 'accepted' && prev === 'searching') pushNotification({ icon: 'person', title: 'Booking accepted', body: `${trip.rider_name} accepted your request and is on the way.` });
    if (s === 'searching' && (prev === 'accepted' || prev === 'arrived')) pushNotification({ icon: 'warning', title: 'Rider cancelled — finding another', body: "We're matching you with the next available rider.", type: 'Updates' });
    if (s === 'arrived') pushNotification({ icon: 'location', title: 'Your rider has arrived', body: `${trip.rider_name} is waiting at ${trip.pickup_name}${trip.rider_plate ? ` · ${trip.rider_plate}` : ''}.` });
    if (s === 'completed') {
      setLastTrip({ id: trip.trip_code, tripUuid: trip.id, pickup: trip.pickup_name, destination: trip.destination_name, fare: Number(trip.fare), method: trip.payment_method, rider: trip.rider_name || 'Your rider', distanceKm: Number(trip.distance_km) || 0, rating: 0 });
      pushNotification({ icon: 'checkmark', title: 'Trip completed', body: `You paid ₱${Number(trip.fare).toFixed(2)} for trip ${trip.trip_code}. Rate your rider!` });
      reload();
    }
  }, [trip?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- the route the rider is on: rider -> pickup (looked up once), then pickup -> destination ----
  useEffect(() => {
    if (!trip) { setLegRoute(null); pickupRouteFor.current = null; return; }
    if (trip.status === 'in_progress') { if (route) setLegRoute(route); return; }
    if ((trip.status === 'accepted' || trip.status === 'arrived') && riderLocation && pickupRouteFor.current !== trip.id) {
      pickupRouteFor.current = trip.id;
      getRoute(riderLocation, coordsOf(trip.pickup_lat, trip.pickup_lng)).then(setLegRoute).catch(() => {});
    }
  }, [trip?.id, trip?.status, riderLocation, route]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- values the screens read ----
  const status = useMemo(() => {
    if (!trip) return 'idle';
    if (trip.status === 'searching') return 'searching';
    if (trip.status === 'cancelled') return trip.cancel_reason === 'no_rider' ? 'noRider' : 'idle';
    if (trip.status === 'accepted' || trip.status === 'arrived') return 'found';
    if (trip.status === 'in_progress') return 'inTrip';
    if (trip.status === 'completed') return 'completed';
    return 'idle';
  }, [trip]);

  const leg = !trip ? null : trip.status === 'in_progress' ? 'toDestination' : trip.status === 'accepted' || trip.status === 'arrived' ? 'toPickup' : null;
  const arrived = trip?.status === 'arrived';
  const target = leg === 'toPickup' ? pickup?.coords : leg === 'toDestination' ? destination?.coords : null;
  const straightKm = riderLocation && target ? haversineKm(riderLocation, target) * 1.2 : null;
  const remainingKm = straightKm != null ? straightKm : legRoute?.distanceKm || 0;
  const etaMinutes = arrived ? 0 : straightKm != null ? Math.max(1, Math.ceil((straightKm / AVG_SPEED_KMH) * 60)) : legRoute ? Math.max(1, Math.ceil(legRoute.durationMin)) : null;
  const driver = trip && trip.rider_id
    ? { name: trip.rider_name || 'Your rider', rating: Number(trip.rider_rating) || 5, vehicle: trip.rider_vehicle || 'Tricycle', plate: trip.rider_plate || '', phone: trip.rider_phone || '' }
    : null;
  const tripId = trip ? trip.trip_code : null;

  // ---- actions ----
  const swap = () => {
    if (!destination) return;
    setPickup(destination);
    setDestination(pickup);
  };

  // Route + estimated fare for the selected pickup/destination.
  const prepareTrip = useCallback(async () => {
    if (!pickup?.coords || !destination?.coords) return null;
    await loadFareSettings();
    const r = await getRoute(pickup.coords, destination.coords);
    setRoute(r);
    setFare(calculateFare(r.distanceKm));
    return r;
  }, [pickup, destination]);

  // Creates the trip in the database. The SERVER recalculates the fare and checks everything.
  const requestRide = useCallback(async () => {
    if (!pickup?.coords || !destination?.coords || !route) throw new Error('Choose a destination first.');
    const row = await api.requestTrip({
      pickup_name: pickup.name, pickup_lat: pickup.coords.latitude, pickup_lng: pickup.coords.longitude,
      destination_name: destination.name, destination_lat: destination.coords.latitude, destination_lng: destination.coords.longitude,
      distance_km: route.distanceKm, duration_min: route.durationMin, payment_method: paymentMethod,
    });
    setRiderLocation(null);
    setLegRoute(null);
    setTrip(row);
    setFare((f) => ({ ...(f || {}), total: Number(row.fare), commission: Number(row.commission), riderShare: Number(row.rider_share) }));
    return row;
  }, [pickup, destination, route, paymentMethod]);

  // Throws if the server refuses (for example the rider already started the trip).
  const cancelRide = useCallback(async () => {
    if (trip && ACTIVE.includes(trip.status)) await api.cancelTrip(trip.id, 'passenger');
    setTrip(null);
    setRiderLocation(null);
    setLegRoute(null);
    reload();
  }, [trip, reload]);

  const finishAndReset = useCallback(() => {
    setTrip(null);
    setDestination(null);
    setRoute(null);
    setFare(null);
    setRiderLocation(null);
    setLegRoute(null);
  }, []);

  const rateTrip = useCallback(async (rating, feedback) => {
    if (!trip) throw new Error('No trip to rate');
    await api.rateTrip(trip.id, rating, feedback);
  }, [trip]);

  // A passenger submits a cash-in request; an authorized admin credits it later.
  const requestTopUp = async (amount, referenceNote) => {
    await api.createTopupRequest(amount, referenceNote);
    await reload();
  };

  const markAllRead = () => setNotifications((n) => n.map((x) => ({ ...x, unread: false })));
  const clearResume = () => setResumeTarget(null);
  const hasUnread = notifications.some((n) => n.unread);

  const value = useMemo(
    () => ({
      pickup, setPickup, destination, setDestination, swap, route, fare, paymentMethod, setPaymentMethod, status, tripId, leg, legRoute, arrived,
      riderLocation, driver, balance, transactions, topupRequests, bookings, notifications, lastTrip, etaMinutes, remainingKm, hasUnread, syncError, resumeTarget,
      prepareTrip, requestRide, cancelRide, finishAndReset, rateTrip, requestTopUp, markAllRead, clearResume,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pickup, destination, route, fare, paymentMethod, status, tripId, leg, legRoute, arrived, riderLocation, trip, balance, transactions, topupRequests, bookings, notifications, lastTrip, etaMinutes, remainingKm, syncError, resumeTarget, prepareTrip, requestRide, cancelRide, finishAndReset, rateTrip]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useBooking = () => useContext(Ctx);
