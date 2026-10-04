# Moments

Moments is a phone-first home-video app for two-to-four-second clips: small glimpses of what makes life meaningful, ranked for visible care, connection, wonder, and presence. Its native app keeps the CRT/VCR home-video theme.

## Purity and safety

The new local CLIP scorer uses an explicit, versioned meaning rubric. Display-first, gaudy, and sexualized framing lower the grade; strong framing cues exclude a clip from the board. Non-explicit tenderness can soften a framing penalty, but never overrides safety. Scores interpret clips, not anyone's character or feelings.

Full-video screening must clear before a grade, archive write, or public video link is issued. Child exploitation, sexualized or compromising child situations, and explicit content are blocked. Children in otherwise ordinary footage require trained human child-safety review. Uncertain ages or consent stay unranked.

**This is an implementation foundation, not launch-ready child-safety detection.** A qualified screening service is not bundled or configured. Without one, uploads return `score: null` and stay unranked. The generic local NSFW model cannot certify child safety.

- [Scoring rubric and evaluation plan](docs/MOMENTS_RUBRIC.md)
- [Screening service contract and deployment requirements](docs/SCREENING_INTEGRATION.md)

Apply both Supabase migrations before deploying the updated backend. The new migration keeps old entries private until they are rescreened and rescored. Approved leaderboard entries can play their videos through short-lived links; raw Storage remains private. There are no invented fallback scores or unscreened local entries on the community board.

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
- The meaning score uses paired semantic descriptions of care, connection, wonder, presence, display, spectacle, and sexualized framing. Faces, smiles, color saturation, and equipment cost earn no automatic bonus. CLIP similarities and rubric thresholds require human evaluation before launch.
- Local NSFWJS checks all five meaning samples as a secondary check. Specialist full-video screening and known-CSAM screening are separate mandatory requirements.
- Scoring still works without Supabase. When Supabase variables are configured, `POST /moments` stores private media plus score metadata and `/leaderboard` returns community entries.
- The same endpoints are used by React Native and the responsive web recorder, so the clip format and scoring behavior remain consistent across clients.
- Capture is explicitly review-first: recording releases the camera, plays the tape back, and waits for **BE KIND, REWIND & SCORE** before uploading anything to the scorer.
- A generated masking-tape/Sharpie mark is used for the splash screen and install icons.

## OAuth

- Supabase Auth is the shared identity layer for native and web clients.
- Scoring remains public, but cloud archive writes require a valid Supabase access token. The backend verifies that token and uses the authenticated user ID as archive ownership.
- Production redirect URLs are `https://moments-wb6h.onrender.com` and `moments://auth/callback`.
- Set `SUPABASE_PUBLISHABLE_KEY` on Render. The publishable key is safe to expose to clients; the service-role key remains server-only.
- Google and Apple buttons are provider-aware and remain disabled until their OAuth client ID/secret is enabled in the Supabase Auth dashboard.

## Supabase setup

1. Create a free Supabase project.
2. Run `supabase/migrations/20260728000000_create_moments_archive.sql` in the Supabase SQL editor.
3. Copy `backend/.env.example` to `backend/.env` for local development and fill in the project URL and service-role key.
4. In Render, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as secret environment variables. Never place the service-role key in the mobile app.

The `moments-media` bucket is private. Only current-policy, approved leaderboard entries can receive 60-second playback links through `GET /moments/:id/video`.

## API

- `GET /health`: service and persistence status
- `GET /leaderboard?limit=50`: screened community entries, or an empty board when no eligible entries exist
- `GET /moments/:id/video`: short-lived playback redirect for an approved, published entry; otherwise 404
- `POST /score-image`: retired; returns `410 Gone`
- `POST /score-video`: screen and grade a two-to-four-second clip; incomplete/blocked screening returns no grade
- `POST /moments`: authenticate, rescreen, recompute, and publish only an eligible moment; never trusts a client's score or moderation decision

## Play Store prep still required

- Create a release keystore and wire release signing into `mobile/android/app/build.gradle`.
- Replace default launcher icons and add a branded feature graphic.
- Configure Supabase OAuth providers for authenticated archive ownership.
- Connect and validate the screening service, trained review, and incident handling before enabling publication.
- Configure the final Render backend URL inside the app profile screen before release testing.
