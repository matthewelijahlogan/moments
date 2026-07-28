const express = require('express');
const cors = require('cors');
const path = require('path');
const {rateLimit} = require('express-rate-limit');
const multer = require('multer');
const {analyzeVideo, featuredLeaderboard} = require('./src/analyzer');
const {
  archiveMoment,
  isPersistenceConfigured,
  listLeaderboard,
} = require('./src/persistence');

const app = express();
app.set('trust proxy', 1);

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
    const supportedTypes = [
      'video/mp4',
      'video/quicktime',
      'video/webm',
    ];

    if (!supportedTypes.includes(file.mimetype)) {
      const error = new Error('Use a 3–5 second MP4, MOV, or WebM clip.');
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
        error: 'Upload a clip using the "file" field.',
      });
      return;
    }

    const result = await analyzeVideo(request.file.buffer);
    response.json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/moments', archiveLimiter, upload.single('file'), async (request, response, next) => {
  try {
    if (!request.file || !request.file.buffer) {
      response.status(400).json({
        error: 'Upload a 3–5 second clip using the "file" field.',
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
      clientId: request.body.clientId,
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
});

app.use((error, request, response, next) => {
  if (error && error.code === 'LIMIT_FILE_SIZE') {
    response.status(413).json({
      error: 'Uploads must be 64MB or smaller.',
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
