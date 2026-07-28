# Moments

Moments is a phone-first home-video app for three-to-five-second clips. Its 1990s CRT/VHS interface is built around recording first, then preserving the brief pieces of life people will actually want to remember.

## What changed

- `mobile/` is the primary React Native 0.81 phone app.
- `backend/` is both a Render-ready scoring/archive service and an installable responsive web companion.
- `supabase/` contains the database and private Storage migration.
- `com.touchofdavinci.moments/` remains as the legacy Cordova prototype for reference while the new stack replaces it.
- `MomentsImages/` provides the tape, banner, parchment, and cassette artwork now reused by the React Native client.

## Project layout

- `mobile/`: React Native app
- `backend/`: Express + FFmpeg + local open-source vision scoring, plus the web/PWA client
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
- Production scoring API: `https://moments-wb6h.onrender.com`.
- Render can deploy the backend directly from `backend/` using the included `render.yaml`.
- The service requires no OpenAI key or other hosted-AI key. Open-source model weights run inside the Moments service.
- The meaning score combines motion, atmosphere, visible face/expression continuity, togetherness, and composition. A local safety model applies a substantial penalty to likely sexualized content; object-dominant, person-light display framing receives a smaller penalty.
- Visible expression is only a cue. Moments does not claim it can prove whether a person's smile or emotion is genuine.
- Scoring still works without Supabase. When Supabase variables are configured, `POST /moments` stores private media plus score metadata and `/leaderboard` returns community entries.
- The same endpoints are used by React Native and the responsive web recorder, so the clip format and scoring behavior remain consistent across clients.

## Supabase setup

1. Create a free Supabase project.
2. Run `supabase/migrations/20260728000000_create_moments_archive.sql` in the Supabase SQL editor.
3. Copy `backend/.env.example` to `backend/.env` for local development and fill in the project URL and service-role key.
4. In Render, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as secret environment variables. Never place the service-role key in the mobile app.

The `moments-media` bucket is private. The mobile app and public website receive leaderboard metadata, not direct media URLs.

## API

- `GET /health`: service and persistence status
- `GET /leaderboard?limit=50`: ranked community metadata, or featured fallback entries before Supabase is configured
- `POST /score-image`: retired; returns `410 Gone`
- `POST /score-video`: score a three-to-five-second MP4, MOV, or WebM clip without saving it
- `POST /moments`: recompute, privately store, and publish a moment's score to the leaderboard

## Play Store prep still required

- Create a release keystore and wire release signing into `mobile/android/app/build.gradle`.
- Replace default launcher icons and add a branded feature graphic.
- Add Supabase Auth before cross-device ownership can be considered secure. Today, both clients share the same service/archive contract, while the local device identifier remains deliberately non-authenticating.
- Configure the final Render backend URL inside the app profile screen before release testing.
