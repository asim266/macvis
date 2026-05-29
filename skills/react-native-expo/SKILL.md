---
name: React Native + Expo
description: Build and ship cross-platform mobile apps.
when_to_use: Building iOS/Android apps with React Native and Expo.
icon: 📱
---

# React Native + Expo

## Scaffold
- `npx create-expo-app@latest <name>` in the projects dir. `npm run start` opens the dev server.
- Test on device with the Expo Go app (scan QR), or `i`/`a` for iOS/Android simulators.

## Building UIs
- Core components: `View`, `Text`, `Pressable`, `FlatList`, `ScrollView`, `Image`. No HTML.
- Styling via `StyleSheet.create` or a lib (NativeWind for Tailwind syntax).
- Navigation: `expo-router` (file-based) or React Navigation.
- Lists: `FlatList` with `keyExtractor`; never `.map` large lists.

## Platform & native
- Branch with `Platform.OS`. Use Expo SDK modules (`expo-camera`, `expo-location`) before ejecting.
- Safe areas: `react-native-safe-area-context`.

## Ship
- `eas build` for store binaries; `eas submit` to upload. Configure `app.json` (icon, splash, bundle id).

## Verify
- Run on at least one simulator and confirm no red-box errors before claiming done.
