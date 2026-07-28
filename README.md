# Moments

Moments is a retro-styled social photo app that scores images for presence, depth, connection, atmosphere, and coherence instead of surface polish.

## What changed

- `mobile/` is now the React Native 0.81 Android app in vanilla JavaScript.
- `backend/` is a Render-ready Node service with image/video scoring, a persistent archive, and a shared leaderboard.
- `supabase/` contains the database and private Storage migration.
- `com.touchofdavinci.moments/` remains as the legacy Cordova prototype for reference while the new stack replaces it.
- `MomentsImages/` provides the tape, banner, parchment, and cassette artwork now reused by the React Native client.

## Project layout

- `mobile/`: React Native app
- `backend/`: Express + Jimp/FFmpeg image and short-video scoring service
- `render.yaml`: Render service definition for the backend
- `supabase/migrations/`: Supabase schema, indexes, and private media bucket
- `MomentsImages/`: shared visual source assets

## Local setup

1. Install backend dependencies:

   ```bash
   cd backend
   npm install
   ```

2. Start the backend:

   ```bash
   npm start
   ```

3. Install mobile dependencies in a second terminal:

   ```bash
   cd mobile
   npm install
   ```

4. Start Metro:

   ```bash
   npm start
   ```

5. Run Android:

   ```bash
   npm run android
   ```

## Backend notes

- Default local URL for the Android emulator is `http://10.0.2.2:3000`.
- Render can deploy the backend directly from `backend/` using the included `render.yaml`.
- The scoring engine is deterministic and explainable. It derives its score from brightness balance, contrast, warmth, color richness, focus, symmetry, and tonal entropy.
- Scoring still works without Supabase. When Supabase variables are configured, `POST /moments` stores private media plus score metadata and `/leaderboard` returns community entries.

## Supabase setup

1. Create a free Supabase project.
2. Run `supabase/migrations/20260728000000_create_moments_archive.sql` in the Supabase SQL editor.
3. Copy `backend/.env.example` to `backend/.env` for local development and fill in the project URL and service-role key.
4. In Render, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as secret environment variables. Never place the service-role key in the mobile app.

The `moments-media` bucket is private. The mobile app and public website receive leaderboard metadata, not direct media URLs.

## API

- `GET /health`: service and persistence status
- `GET /leaderboard?limit=50`: ranked community metadata, or featured fallback entries before Supabase is configured
- `POST /score-image`: score an image without saving it
- `POST /score-video`: score a short clip without saving it
- `POST /moments`: recompute, privately store, and publish a moment's score to the leaderboard

## Play Store prep still required

- Create a release keystore and wire release signing into `mobile/android/app/build.gradle`.
- Replace default launcher icons and add a branded feature graphic.
- Add Supabase Auth before introducing comments, follows, private sharing, or cross-device profile ownership. The current device identifier is deliberately not treated as authentication.
- Configure the final Render backend URL inside the app profile screen before release testing.
