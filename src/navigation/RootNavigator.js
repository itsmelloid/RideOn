import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

import WelcomeScreen from '../screens/auth/WelcomeScreen';
import RoleSelectScreen from '../screens/auth/RoleSelectScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import OTPScreen from '../screens/auth/OTPScreen';

import PassengerTabs from './PassengerTabs';
import DestinationScreen from '../screens/passenger/DestinationScreen';
import TripDetailsScreen from '../screens/passenger/TripDetailsScreen';
import SearchingScreen from '../screens/passenger/SearchingScreen';
import NoRidersScreen from '../screens/passenger/NoRidersScreen';
import RiderFoundScreen from '../screens/passenger/RiderFoundScreen';
import EnRouteScreen from '../screens/passenger/EnRouteScreen';
import TripCompletedScreen from '../screens/passenger/TripCompletedScreen';
import NotificationsScreen from '../screens/passenger/NotificationsScreen';
import SafetyScreen from '../screens/passenger/SafetyScreen';

import RiderTabs from './RiderTabs';
import RiderRegistrationScreen from '../screens/rider/RiderRegistrationScreen';
import RiderVerificationScreen from '../screens/rider/RiderVerificationScreen';
import ActiveTripScreen from '../screens/rider/ActiveTripScreen';
import RideCompletedScreen from '../screens/rider/RideCompletedScreen';
import TripHistoryScreen from '../screens/rider/TripHistoryScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { ready, user } = useAuth();

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.black} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      {!user ? (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="OTP" component={OTPScreen} />
        </>
      ) : user.role === 'passenger' ? (
        <>
          <Stack.Screen name="PassengerTabs" component={PassengerTabs} />
          <Stack.Screen name="Destination" component={DestinationScreen} />
          <Stack.Screen name="TripDetails" component={TripDetailsScreen} />
          <Stack.Screen name="Searching" component={SearchingScreen} options={{ gestureEnabled: false }} />
          <Stack.Screen name="NoRiders" component={NoRidersScreen} options={{ gestureEnabled: false }} />
          <Stack.Screen name="RiderFound" component={RiderFoundScreen} options={{ gestureEnabled: false }} />
          <Stack.Screen name="EnRoute" component={EnRouteScreen} options={{ gestureEnabled: false }} />
          <Stack.Screen name="TripCompleted" component={TripCompletedScreen} options={{ gestureEnabled: false }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Safety" component={SafetyScreen} options={{ presentation: 'modal' }} />
        </>
      ) : user.status === 'approved' ? (
        <>
          <Stack.Screen name="RiderTabs" component={RiderTabs} />
          <Stack.Screen name="ActiveTrip" component={ActiveTripScreen} options={{ gestureEnabled: false }} />
          <Stack.Screen name="RideCompleted" component={RideCompletedScreen} options={{ gestureEnabled: false }} />
          <Stack.Screen name="TripHistory" component={TripHistoryScreen} />
        </>
      ) : user.status === 'pending' ? (
        <Stack.Screen name="RiderVerification" component={RiderVerificationScreen} />
      ) : (
        <Stack.Screen name="RiderRegistration" component={RiderRegistrationScreen} />
      )}
    </Stack.Navigator>
  );
}
