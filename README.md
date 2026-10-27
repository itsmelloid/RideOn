# RideOn (React Native + Expo)

Tricycle ride-hailing app for Bunawan, Agusan del Sur. This project recreates the RideOn Figma prototype:
shared onboarding, the **Passenger** app and the **Rider** app, with **Google Maps** (live map, routes, place search).
The admin console (desktop web pages in the Figma file) is not included - it is a separate web project.

## Technologies
React Native, Expo, React Navigation, react-native-maps (Google Maps), expo-location, AsyncStorage,
Plus Jakarta Sans (Google Fonts).

## Prerequisites
- Node.js LTS (https://nodejs.org) and Visual Studio Code
- **Expo Go** on your Android phone (Play Store)
- Phone and computer on the same Wi-Fi
- (For real maps data) a Google Cloud API key - see "Google Maps setup"

## 1. Create the Expo project and add these files
Open a terminal in VS Code (Terminal > New Terminal) in the folder where you keep projects:

```bash
npx create-expo-app@latest RideOn --template blank
cd RideOn
```

Copy everything from this zip into the new `RideOn` folder (replace `App.js`) and **delete `app.json`**
(this project uses `app.config.js` instead). Keep the `src`, `assets`, `App.js`, `app.config.js`, `eas.json`,
`.env.example` and `.gitignore` items. Then install the dependencies (`expo install` picks versions that match your Expo SDK):

```bash
npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context react-native-gesture-handler react-native-maps expo-location expo-image-picker expo-document-picker expo-font expo-splash-screen @expo-google-fonts/plus-jakarta-sans @react-native-async-storage/async-storage @expo/vector-icons
```

## 2. Run on your Android phone (Expo Go)
```bash
npx expo start
```
Scan the QR code with Expo Go. If it cannot connect: use `npx expo start --tunnel`, or check that both devices share
the same Wi-Fi.

**Demo accounts** (password `password123`): passenger `09123456789`, rider `09123456780`. OTP demo code: `1234`.
New passenger/rider sign-ups work too (stored on the device only). A new rider sees the Verification screen; in
development builds a "DEV: Simulate approval" button lets you continue to the rider dashboard.

## 3. Google Maps setup
1. In Google Cloud Console create a project, enable billing, and enable: **Maps SDK for Android**, **Routes API**,
   **Places API (New)**.
2. Create an API key. Copy `.env.example` to `.env` and paste it:
   `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-key`
3. Restart with `npx expo start -c`.
- **Without a key** the app still works: the map shows in Expo Go, routes become straight lines and place search uses
  the built-in Bunawan list.
- **Key restrictions (important for production):** restrict the key to Android apps (package `com.rideon.bunawan`
  + your signing SHA-1) and to the three APIs above. Expo Go uses a different package, so use an unrestricted
  *temporary dev key* only while testing in Expo Go, and delete it afterwards. Best practice is to call Routes and
  Places from your own backend so the key is never in the app.

## 4. Build for production (APK / Play Store)
```bash
npm install -g eas-cli
eas login
eas build:configure
eas secret:create --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value "your-key"
eas build --platform android --profile preview      # installable APK for testing
eas build --platform android --profile production   # .aab for Google Play
```

## Project structure
```
assets/        logo, avatars, banners, icon, splash
src/theme/     colors, fonts, radius, shadows (from Figma)
src/components/ buttons, inputs, headers, tab bar, RideMap, dialogs...
src/context/   Auth, Booking (passenger trip flow), Rider
src/navigation/ Root, PassengerTabs, RiderTabs
src/screens/   auth/ passenger/ rider/
src/services/  maps (Routes + Places), location, fare
src/data/      mock data and Bunawan places
```

## Troubleshooting
- *Metro/“Unable to resolve module”*: run `npx expo install <package>` then `npx expo start -c`.
- *Map is blank/grey*: key missing or API not enabled/billing off; check `adb logcat` for "Authorization failure".
- *Fonts not loading*: restart with `-c`; check internet on first run.
- *Location says outside service area*: bookings are limited to 30 km around Bunawan (`SERVICE_RADIUS_KM`).
  The pickup then defaults to San Teodoro.
- *Expo Go won't open the project*: make sure Expo Go matches the SDK version (update it in the Play Store).

## Current prototype limitations (be honest before launch)
These need a backend / services and are **simulated**:
- **Authentication**: accounts are stored on the phone with plain passwords; OTP is a fixed demo code.
- **Rider matching & live tracking**: the rider "found", movement, and request countdown are timers. Passenger and
  rider apps are not connected to each other.
- **Payments & wallet**: balance/top-up are local numbers, no payment provider. Fares are calculated on the device.
- **Documents**: picked files are not uploaded; admin approval does not exist yet.
- Call/Message in the rider app, password change, Edit Profile, Forgot password, rating storage: placeholders.
- Place coordinates other than the university are approximate; verify them in Google Maps / Places.
- Support email `support@rideon.example` is a placeholder.
- Admin console pages from the Figma file are not built.

## Going to production checklist
Backend + real auth (e.g. Firebase Auth/phone OTP), secure token storage (`expo-secure-store`), realtime
trips (WebSockets/Firebase), payment provider, server-side fare + commission, background location for riders,
push notifications, crash reporting, privacy policy/terms URLs, Play Store listing + data-safety form,
and a security review of the Google API key restrictions.
