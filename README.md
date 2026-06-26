# Music Social App

Mobile-first music rating and friend activity app.

This repo is no longer a Next.js web app. The goal is a native-feeling phone app that combines:

- **Beli-style rankings** for songs, albums, and artists
- **Airbuds-style social activity** showing what friends are rating, replaying, and reacting to

## Current direction

Build a mobile app first. Web/admin tools can come later, but the product starts as a phone app.

## Stack

- Expo
- React Native
- TypeScript
- Local mock data for MVP screens
- Future backend: Supabase/Postgres or custom API
- Future integrations: Spotify first, Apple Music later

## Run locally

```bash
npm install
npm run start
```

Then open the app in the iOS Simulator, Android Emulator, or Expo Go.

## MVP product pillars

1. Rate songs fast
2. Build ranked lists like Beli
3. See friend activity like Airbuds
4. React/comment on friends' music takes
5. Compare taste compatibility
6. Import listening data from Spotify later

## Core tabs

- Feed
- Rate
- Rankings
- Friends
- Profile
