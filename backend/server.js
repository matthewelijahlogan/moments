const express = require('express');
const cors = require('cors');
const multer = require('multer');
const {analyzeImage, analyzeVideo, featuredLeaderboard} = require('./src/analyzer');

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 64 * 1024 * 1024,
  },
});

app.use(
  cors({
    origin: true,
  }),
);
app.use(express.json({limit: '1mb'}));

app.get('/health', (request, response) => {
  response.json({
    ok: true,
    service: 'moments-backend',
    timestamp: new Date().toISOString(),
  });
});

app.get('/leaderboard', (request, response) => {
  response.json({
    entries: featuredLeaderboard,
  });
});

app.post('/score-image', upload.single('file'), async (request, response, next) => {
  try {
    if (!request.file || !request.file.buffer) {
      response.status(400).json({
        error: 'Upload a photo using the "file" field.',
      });
      return;
    }

    const result = await analyzeImage(request.file.buffer);
    response.json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/score-video', upload.single('file'), async (request, response, next) => {
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

app.use((error, request, response, next) => {
  if (error && error.code === 'LIMIT_FILE_SIZE') {
    response.status(413).json({
      error: 'Uploads must be 64MB or smaller.',
    });
    return;
  }

  console.error(error);
  response.status(500).json({
    error: 'Moments could not score that image right now.',
  });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`Moments backend listening on ${port}`);
});
