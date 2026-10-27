import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { BUNAWAN_CENTER } from '../data/places';

const DEFAULT_REGION = { ...BUNAWAN_CENTER, latitudeDelta: 0.03, longitudeDelta: 0.03 };

// Google Map used by every map screen. Pass any of: pickup, destination, riderLocation, path, userLocation.
export default function RideMap({ pickup, destination, riderLocation, path, userLocation, style, interactive = true, padding, circle }) {
  const ref = useRef(null);
  const padKey = JSON.stringify(padding || null);

  useEffect(() => {
    const pts = [pickup, destination, riderLocation, ...(path && path.length ? [path[0], path[path.length - 1]] : [])].filter(Boolean);
    if (!ref.current || pts.length === 0) return;
    const t = setTimeout(() => {
      if (pts.length === 1) {
        ref.current?.animateToRegion({ ...pts[0], latitudeDelta: 0.012, longitudeDelta: 0.012 }, 400);
      } else {
        ref.current?.fitToCoordinates(pts, { edgePadding: padding || { top: 80, right: 60, bottom: 80, left: 60 }, animated: true });
      }
    }, 250);
    return () => clearTimeout(t);
    // padding is compared by value so inline objects do not re-fit the map on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup, destination, riderLocation, path, padKey]);

  return (
    <View style={[styles.wrap, style]}>
      <MapView
        ref={ref}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={pickup ? { ...pickup, latitudeDelta: 0.02, longitudeDelta: 0.02 } : DEFAULT_REGION}
        showsUserLocation={!!userLocation}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {circle ? <Circle center={circle.center} radius={circle.radius} fillColor="rgba(251,178,7,0.30)" strokeColor="rgba(251,178,7,0.8)" strokeWidth={1} /> : null}
        {path && path.length > 1 ? <Polyline coordinates={path} strokeColor="#4F2BE8" strokeWidth={5} lineCap="round" lineJoin="round" /> : null}
        {pickup ? (
          <Marker coordinate={pickup} anchor={{ x: 0.5, y: 0.5 }} title="Pickup">
            <View style={styles.pickupDot}><View style={styles.pickupInner} /></View>
          </Marker>
        ) : null}
        {destination ? (
          <Marker coordinate={destination} anchor={{ x: 0.5, y: 1 }} title="Destination">
            <Ionicons name="location-sharp" size={36} color={colors.red} />
          </Marker>
        ) : null}
        {riderLocation ? (
          <Marker coordinate={riderLocation} anchor={{ x: 0.5, y: 0.5 }} title="Rider">
            <View style={styles.rider}><Ionicons name="bicycle" size={16} color={colors.yellow} /></View>
          </Marker>
        ) : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', backgroundColor: '#E5F3E8' },
  pickupDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.yellow },
  pickupInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.black },
  rider: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.yellow },
});
