import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BottomTabBar from '../components/BottomTabBar';
import DashboardScreen from '../screens/rider/DashboardScreen';
import RequestsScreen from '../screens/rider/RequestsScreen';
import PickupScreen from '../screens/rider/PickupScreen';
import EarningsScreen from '../screens/rider/EarningsScreen';
import RiderProfileScreen from '../screens/rider/RiderProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// The Requests tab hosts the incoming request screen and the pickup screen so the tab bar stays visible.
function RequestsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RequestsHome" component={RequestsScreen} />
      <Stack.Screen name="Pickup" component={PickupScreen} />
    </Stack.Navigator>
  );
}

const icons = {
  Dashboard: { active: 'home', idle: 'home-outline' },
  Requests: { active: 'file-tray', idle: 'file-tray-outline' },
  Earnings: { active: 'wallet', idle: 'wallet-outline' },
  RiderProfile: { active: 'person', idle: 'person-outline' },
};
const labels = { Dashboard: 'DASHBOARD', Requests: 'REQUESTS', Earnings: 'EARNINGS', RiderProfile: 'PROFILE' };

export default function RiderTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <BottomTabBar {...props} icons={icons} labels={labels} />}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Requests" component={RequestsStack} />
      <Tab.Screen name="Earnings" component={EarningsScreen} />
      <Tab.Screen name="RiderProfile" component={RiderProfileScreen} />
    </Tab.Navigator>
  );
}
