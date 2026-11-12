import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getRoute } from '../services/maps';
import { getCurrentCoords } from '../services/location';
import { useAuth } from './AuthContext';
import * as api from '../services/api';

export const REQUEST_SECONDS = 12; // how long a rider has to answer a request on screen
const REQUEST_POLL_MS = 4000;
const TRIP_POLL_MS = 5000;
const Ctx = createContext(null);

const fmt = (iso) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const sameDay = (iso) => new Date(iso).toDateString() === new Date().toDateString();
const co = (lat, lng) => ({ latitude: lat, longitude: lng });
const STAGE = { accepted: 'enRoute', arrived: 'arrived', in_progress: 'inProgress' };

const toHistory = (t) =>
  t.status === 'completed'
    ? { id: t.trip_code, status: 'Completed', when: fmt(t.created_at), from: t.pickup_name, to: t.destination_name, fare: Number(t.fare), commission: Number(t.commission), share: Number(t.rider_share) }
    : { id: t.trip_code, status: 'Cancelled', when: fmt(t.created_at), from: t.pickup_name, to: t.destination_name, note: 'Cancelled before completion. No fee recorded.' };

// A row from open_requests() -> the shape RequestsScreen / DashboardScreen use.
const toRequest = (r) => ({
  id: r.id,
  code: r.trip_code,
  passenger: { name: r.passenger_name || 'Passenger', rating: Number(r.passenger_rating) || 5, trips: r.passenger_trip_count || 0 },
  pickup: { id: 'pickup', name: r.pickup_name, coords: co(r.pickup_lat, r.pickup_lng) },
  destination: { id: 'destination', name: r.destination_name, coords: co(r.destination_lat, r.destination_lng) },
  route: { distanceKm: Number(r.distance_km) || 0, durationMin: Number(r.duration_min) || 0, path: null },
  fare: { total: Number(r.fare), riderShare: Number(r.rider_share), commission: Number(r.commission) },
  pickupAwayKm: r.distance_to_pickup_km != null ? r.distance_to_pickup_km : '—',
  payment: r.payment_method === 'RideOn Wallet' ? 'APP WALLET' : 'CASH',
});

// A trip row (accepted / arrived / in progress) -> the active-trip shape the rider screens use.
// trip.id is the trip CODE shown on screen; trip.uuid is the database id used for actions.
const toTrip = (row) => ({
  id: row.trip_code,
  uuid: row.id,
  passenger: { name: row.passenger_name || 'Passenger', rating: Number(row.passenger_rating) || 5, trips: row.passenger_trip_count || 0 },
  pickup: { id: 'pickup', name: row.pickup_name, coords: co(row.pickup_lat, row.pickup_lng) },
  destination: { id: 'destination', name: row.destination_name, coords: co(row.destination_lat, row.destination_lng) },
  route: { distanceKm: Number(row.distance_km) || 0, durationMin: Number(row.duration_min) || 0, path: [co(row.pickup_lat, row.pickup_lng), co(row.destination_lat, row.destination_lng)] },
  fare: { total: Number(row.fare), riderShare: Number(row.rider_share), commission: Number(row.commission) },
});

export function RiderProvider({ children }) {
  const { user } = useAuth();
  const [online, setOnlineState] = useState(false); // a rider starts OFFLINE until they switch on
  const [rows, setRows] = useState([]); // trip history from Supabase
  const [request, setRequest] = useState(null);
  const [trip, setTrip] = useState(null);
  const [stage, setStage] = useState(null); // enRoute | arrived | inProgress
  const [summary, setSummary] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [notice, setNotice] = useState('');
  const [syncError, setSyncError] = useState('');
  const dismissed = useRef(new Set());
  const isRider = !!user && user.role === 'rider' && user.status === 'approved';

  const reload = useCallback(async () => {
    if (!isRider) return;
    try {
      setRows(await api.listTrips('rider_id', user.id));
      setSyncError('');
    } catch (e) {
      setSyncError(e.message);
    }
  }, [isRider, user]);

  useEffect(() => {
    if (isRider) reload();
    else { setRows([]); setTrip(null); setRequest(null); setOnlineState(false); }
  }, [isRider, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const history = useMemo(() => rows.filter((r) => ['completed', 'cancelled'].includes(r.status)).map(toHistory), [rows]);
  const completed = useMemo(() => rows.filter((r) => r.status === 'completed'), [rows]);
  const totalTrips = completed.length;
  const todayEarnings = useMemo(() => completed.filter((r) => sameDay(r.created_at)).reduce((a, r) => a + Number(r.rider_share), 0), [completed]);

  // ---- pick up a job that was already running (app was closed) ----
  useEffect(() => {
    if (!isRider) return undefined;
    let alive = true;
    api.myActiveTrip().then((row) => {
      if (!alive || !row || row.rider_id !== user.id) return;
      setTrip(toTrip(row));
      setStage(STAGE[row.status] || 'enRoute');
      if (row.started_at) setStartedAt(new Date(row.started_at).getTime());
      setOnlineState(true);
      getRoute(co(row.pickup_lat, row.pickup_lng), co(row.destination_lat, row.destination_lng)).then((r) => {
        if (alive) setTrip((cur) => (cur && cur.uuid === row.id ? { ...cur, route: { ...cur.route, path: r.path } } : cur));
      });
    }).catch(() => {});
    return () => { alive = false; };
  }, [isRider, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- tell the server "I am online, here" (every 30 s, every 5 s during a trip) ----
  useEffect(() => {
    if (!isRider) return undefined;
    let alive = true;
    const beat = async () => {
      const coords = online ? await getCurrentCoords() : null;
      if (alive) api.setRiderLocation(user.id, coords, online).catch(() => {});
    };
    beat();
    const timer = online ? setInterval(beat, trip ? 5000 : 30000) : null;
    return () => { alive = false; if (timer) clearInterval(timer); };
  }, [isRider, online, !!trip, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- while online and free: ask the server for open requests ----
  useEffect(() => {
    if (!isRider || !online || trip || request) return undefined;
    let alive = true;
    const tick = async () => {
      try {
        const list = await api.openRequests();
        if (!alive) return;
        const next = list.find((r) => !dismissed.current.has(r.id));
        if (next) setRequest(toRequest(next));
      } catch (e) {
        // try again on the next tick
      }
    };
    tick();
    const timer = setInterval(tick, REQUEST_POLL_MS);
    return () => { alive = false; clearInterval(timer); };
  }, [isRider, online, trip, request]);

  // ---- during a job: notice if the passenger cancelled ----
  useEffect(() => {
    if (!trip || !trip.uuid) return undefined;
    const timer = setInterval(async () => {
      try {
        const res = await api.pollTrip(trip.uuid);
        if (res && res.trip.status === 'cancelled') {
          setNotice('The passenger cancelled this trip.');
          setTrip(null);
          setStage(null);
        }
      } catch (e) {
        // ignore
      }
    }, TRIP_POLL_MS);
    return () => clearInterval(timer);
  }, [trip?.uuid]); // eslint-disable-line react-hooks/exhaustive-deps

  const setOnline = (v) => {
    setOnlineState(v);
    if (!v) setRequest(null);
  };

  const decline = useCallback(() => {
    if (!request) return;
    dismissed.current.add(request.id);
    api.declineTrip(request.id).catch(() => {});
    setRequest(null);
  }, [request]);

  // Throws if someone else took the request first.
  const accept = useCallback(async () => {
    if (!request) return false;
    const req = request;
    try {
      const row = await api.acceptTrip(req.id);
      setSummary(null);
      setRequest(null);
      setStartedAt(null);
      setTrip(toTrip(row));
      setStage('enRoute');
      getRoute(req.pickup.coords, req.destination.coords).then((r) => {
        setTrip((cur) => (cur && cur.uuid === row.id ? { ...cur, route: { ...cur.route, path: r.path } } : cur));
      });
      return true;
    } catch (e) {
      dismissed.current.add(req.id);
      setRequest(null);
      throw e;
    }
  }, [request]);

  const markArrived = useCallback(async () => {
    await api.riderArrived(trip.uuid);
    setStage('arrived');
  }, [trip]);

  const startTrip = useCallback(async () => {
    await api.startTrip(trip.uuid);
    setStartedAt(Date.now());
    setStage('inProgress');
  }, [trip]);

  const cancelTrip = useCallback(async () => {
    await api.riderCancelTrip(trip.uuid, 'rider');
    setTrip(null);
    setStage(null);
  }, [trip]);

  const completeTrip = useCallback(async () => {
    const row = await api.completeTrip(trip.uuid);
    setSummary({
      id: row.trip_code, passenger: trip.passenger, fare: Number(row.fare), share: Number(row.rider_share), commission: Number(row.commission),
      distanceKm: trip.route.distanceKm, durationMin: trip.route.durationMin,
    });
    setTrip(null);
    setStage(null);
    reload();
    return true;
  }, [trip, reload]);

  const clearNotice = () => setNotice('');

  const value = useMemo(
    () => ({
      online, setOnline, todayEarnings, totalTrips, rows, request, trip, stage, summary, history, startedAt, notice, clearNotice, syncError,
      accept, decline, markArrived, startTrip, cancelTrip, completeTrip, reload,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [online, todayEarnings, totalTrips, rows, request, trip, stage, summary, history, startedAt, notice, syncError, accept, decline, markArrived, startTrip, cancelTrip, completeTrip, reload]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useRider = () => useContext(Ctx);
