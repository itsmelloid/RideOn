import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import BottomTabBar from '../components/BottomTabBar';
import HomeScreen from '../screens/passenger/HomeScreen';
import BookingsScreen from '../screens/passenger/BookingsScreen';
import WalletScreen from '../screens/passenger/WalletScreen';
import PassengerProfileScreen from '../screens/passenger/PassengerProfileScreen';

const Tab = createBottomTabNavigator();
const icons = {
  Home: { active: 'home', idle: 'home-outline' },
  Bookings: { active: 'calendar', idle: 'calendar-outline' },
  Wallet: { active: 'wallet', idle: 'wallet-outline' },
  Profile: { active: 'person', idle: 'person-outline' },
};
const labels = { Home: 'HOME', Bookings: 'BOOKINGS', Wallet: 'WALLET', Profile: 'PROFILE' };

export default function PassengerTabs({ navigation }) {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomTabBar {...props} icons={icons} labels={labels} centerAction={() => navigation.navigate('Destination')} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Bookings" component={BookingsScreen} />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen name="Profile" component={PassengerProfileScreen} />
    </Tab.Navigator>
  );
}
