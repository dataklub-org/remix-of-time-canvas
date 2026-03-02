# Fractalito Mobile

Mobile app for Fractalito, built with Expo + React Native.

## Requirements

- Node.js 18+ (recommended)
- npm 9+
- Expo Go app on your phone (or iOS/Android simulator)

## Setup

1. Go to the mobile app folder:

```bash
cd remix-of-time-canvas/fractalito-mobile

## 2. npm install
Configure environment variables:
Create a .env file in fractalito-mobile/ with:
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
Run the App
Start Expo:
npm install
npx expo start -c
Then:

Scan the QR code with Expo Go, or
Press i for iOS simulator
Press a for Android emulator
Common Commands
Start dev server: npx expo start
Start with clean cache: npx expo start -c
Type check: npx tsc --noEmit
Troubleshooting
ENOENT: no such file or directory, package.json
You are in the wrong folder. Run commands inside:
remix-of-time-canvas/fractalito-mobile
App builds but shows stale UI
Clear cache and restart:
npx expo start -c
Supabase errors
Check .env values and confirm your Supabase project URL/key are correct.


## Note

This README is for starting the **mobile app only** (`fractalito-mobile`).
