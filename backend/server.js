const express = require('express');
const cors = require('cors');
const path = require('path');
const {rateLimit} = require('express-rate-limit');
const multer = require('multer');
const {createClient} = require('@supabase/supabase-js');
const {analyzeVideo, featuredLeaderboard} = require('./src/analyzer');
const {
  archiveMoment,
  isPersistenceConfigured,
  listLeaderboard,
} = require('./src/persistence');

const app = express();
app.set('trust proxy', 1);

function publicAuthClient() {
  const url = String(process.env.SUPABASE_URL || '').trim();
  const key = String(process.env.SUPABASE_PUBLISHABLE_KEY || '').trim();
  return url && key
    ? createClient(url, key, {
        auth: {autoRefreshToken: false, persistSession: false},
      })
    : null;
}

async function requireArchiveUser(request, response, next) {
  const client = publicAuthClient();
  if (!client) {
    response.status(503).json({
      error: 'OAuth is not configured on this Moments service yet.',
    });
    return;
  }

  const authorization = String(request.headers.authorization || '');
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice(7).trim()
    : '';
  if (!token) {
    response.status(401).json({
      error: 'Sign in before saving a tape to the shared archive.',
    });
    return;
  }

  const {data, error} = await client.auth.getUser(token);
  if (error || !data.user) {
    response.status(401).json({
      error: 'Your sign-in expired. Sign in again before archiving.',
    });
    return;
  }

  request.authUser = data.user;
  next();
}

const scoringLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});
const archiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 64 * 1024 * 1024,
  },
  fileFilter: (request, file, callback) => {
    const mimeType = String(file.mimetype || '').toLowerCase();
    const browserRecordedVideo =
      mimeType.startsWith('video/') ||
      ['application/mp4', 'application/x-matroska', 'application/octet-stream'].includes(
        mimeType,
      );

    if (!browserRecordedVideo) {
      const error = new Error(
        'That recording could not be read. Record another moment and try again.',
      );
      error.statusCode = 415;
      callback(error);
      return;
    }

    callback(null, true);
  },
});

const allowedOrigins = String(process.env.CORS_ORIGINS || '')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
  }),
);
app.use(express.json({limit: '1mb'}));
app.get('/.moments-client/supabase.js', (request, response) => {
  response.sendFile(
    path.join(
      __dirname,
      'node_modules',
      '@supabase',
      'supabase-js',
      'dist',
      'umd',
      'supabase.js',
    ),
  );
});
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  '/.moments-vision/human',
  express.static(path.join(__dirname, 'node_modules', '@vladmandic', 'human', 'models')),
);
app.use(
  '/.moments-vision/wasm',
  express.static(
    path.join(__dirname, 'node_modules', '@tensorflow', 'tfjs-backend-wasm', 'dist'),
  ),
);

app.get('/health', (request, response) => {
  response.json({
    ok: true,
    service: 'moments-backend',
    persistence: isPersistenceConfigured() ? 'supabase' : 'local-only',
    scoring: 'local-open-source',
    capture: 'video-only-3-to-5-seconds',
    timestamp: new Date().toISOString(),
  });
});

app.get('/auth-config', async (request, response) => {
  const url = String(process.env.SUPABASE_URL || '').trim();
  const publishableKey = String(
    process.env.SUPABASE_PUBLISHABLE_KEY || '',
  ).trim();
  let providers = [];
  if (url && publishableKey) {
    try {
      const settingsResponse = await fetch(`${url}/auth/v1/settings`, {
        headers: {apikey: publishableKey},
      });
      const settings = await settingsResponse.json();
      providers = ['google', 'apple'].filter(
        provider => settings.external && settings.external[provider],
      );
    } catch (error) {
      console.error('Could not read Supabase provider settings:', error);
    }
  }

  response.json({
    enabled: Boolean(url && publishableKey),
    supabaseUrl: url || null,
    publishableKey: publishableKey || null,
    redirectUrl: `${request.protocol}://${request.get('host')}`,
    providers,
  });
});

app.get('/leaderboard', async (request, response, next) => {
  try {
    const persistedEntries = await listLeaderboard(request.query.limit);
    response.json({
      entries:
        persistedEntries && persistedEntries.length
          ? persistedEntries
          : featuredLeaderboard,
      source: persistedEntries ? 'supabase' : 'featured',
    });
  } catch (error) {
    next(error);
  }
});

app.post('/score-image', (request, response) => {
  response.status(410).json({
    error: 'Moments now scores 3–5 second video clips instead of photos.',
  });
});

app.post('/score-video', scoringLimiter, upload.single('file'), async (request, response, next) => {
  try {
    if (!request.file || !request.file.buffer) {
      response.status(400).json({
        error: 'No recording reached the scorer. Record another moment and try again.',
      });
      return;
    }

    const result = await analyzeVideo(request.file.buffer);
    response.json(result);
  } catch (error) {
    next(error);
  }
});

app.post(
  '/moments',
  archiveLimiter,
  requireArchiveUser,
  upload.single('file'),
  async (request, response, next) => {
  try {
    if (!request.file || !request.file.buffer) {
      response.status(400).json({
        error: 'No recording reached the archive. Record another moment and try again.',
      });
      return;
    }

    if (!request.file.mimetype.startsWith('video/')) {
      response.status(415).json({
        error: 'The archive accepts 3–5 second video clips only.',
      });
      return;
    }

    const analysis = await analyzeVideo(request.file.buffer);
    const entry = await archiveMoment({
      analysis,
      clientId: request.authUser.id,
      file: request.file,
      username: request.body.username,
    });

    response.status(201).json({
      ...analysis,
      archive: entry,
    });
  } catch (error) {
    next(error);
  }
  },
);

app.use((error, request, response, next) => {
  if (error && error.code === 'LIMIT_FILE_SIZE') {
    response.status(413).json({
      error: 'That recording is too large. Keep it between three and five seconds.',
    });
    return;
  }

  console.error(error);
  response.status(error.statusCode || 500).json({
    error:
      error.statusCode && error.message
        ? error.message
        : 'Moments could not process that file right now.',
  });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`Moments backend listening on ${port}`);
});
