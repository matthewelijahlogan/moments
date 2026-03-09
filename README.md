# Moments

Moments is a retro-styled social photo app that scores images for presence, depth, connection, atmosphere, and coherence instead of surface polish.

## What changed

- `mobile/` is now the React Native 0.81 Android app in vanilla JavaScript.
- `backend/` is a Render-ready Node service with `/health`, `/leaderboard`, and `/score-image`.
- `com.touchofdavinci.moments/` remains as the legacy Cordova prototype for reference while the new stack replaces it.
- `MomentsImages/` provides the tape, banner, parchment, and cassette artwork now reused by the React Native client.

## Project layout

- `mobile/`: React Native app
- `backend/`: Express + TensorFlow.js image scoring service
- `render.yaml`: Render service definition for the backend
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

## Play Store prep still required

- Create a release keystore and wire release signing into `mobile/android/app/build.gradle`.
- Replace default launcher icons and add a branded feature graphic.
- Remove the temporary local-only social model if you need real accounts, uploads, comments, or cross-user persistence.
- Configure the final Render backend URL inside the app profile screen before release testing.
