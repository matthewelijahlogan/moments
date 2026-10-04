const {spawn} = require('child_process');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;
const {analyzeVisionFrames} = require('./vision');
const {screenVideo} = require('./moderation');
const {analyzeMeaningFrames, rankMeaning, ENGINE_VERSION} = require('./meaning');

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function round(value) {
  return Number(value.toFixed(1));
}

function pickTier(score) {
  if (score >= 90) {
    return 'Archive classic';
  }
  if (score >= 82) {
    return 'Meaning-rich';
  }
  if (score >= 74) {
    return 'Quiet signal';
  }
  if (score >= 66) {
    return 'Workable memory';
  }
  return 'Needs stronger residue';
}

function buildFrameTimestamps(durationSeconds) {
  const effectiveDuration = clamp(durationSeconds, 2, 4);
  const fractions = [0.01, 0.25, 0.5, 0.75, 0.99];

  return [...new Set(
    fractions.map(fraction =>
      Number(
        Math.min(
          Math.max(effectiveDuration * fraction, 0.05),
          Math.max(effectiveDuration - 0.05, 0.05),
        ).toFixed(3),
      ),
    ),
  )];
}

function ensureBinary(binaryPath, label) {
  if (!binaryPath) {
    throw new Error(`${label} is not available on this server.`);
  }
}

function runCommand(binaryPath, args) {
  ensureBinary(binaryPath, 'Video analysis tooling');

  return new Promise((resolve, reject) => {
    const child = spawn(binaryPath, args, {
      windowsHide: true,
    });
    const timeout = setTimeout(() => child.kill(), 30_000);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });

    child.on('error', error => { clearTimeout(timeout); reject(error); });
    child.on('close', code => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve({stdout, stderr});
        return;
      }

      reject(
        new Error(
          stderr.trim() || `Video analysis tooling failed with exit code ${code}.`,
        ),
      );
    });
  });
}

async function probeVideo(filePath) {
  const {stdout} = await runCommand(ffprobePath, [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height:format=duration',
    '-of',
    'json',
    filePath,
  ]);

  const payload = JSON.parse(stdout || '{}');
  const stream = (payload.streams && payload.streams[0]) || {};

  return {
    durationSeconds: Number(payload.format && payload.format.duration) || 0,
    width: Number(stream.width) || 0,
    height: Number(stream.height) || 0,
  };
}

async function extractFrame(inputPath, outputPath, timestampSeconds, lastFrame = false) {
  await runCommand(ffmpegPath, [
    '-y',
    ...(lastFrame ? [] : ['-ss', String(timestampSeconds)]),
    '-i',
    inputPath,
    '-vf', 'scale=512:512:force_original_aspect_ratio=decrease',
    // Seeking near the container duration can land after the last decoded
    // frame. Overwrite one image through the sequence to obtain its real end.
    ...(lastFrame ? ['-update', '1'] : ['-frames:v', '1']),
    '-q:v',
    '2',
    outputPath,
  ]);

  return fs.readFile(outputPath);
}

async function analyzeVideo(buffer, {screen = screenVideo, inspectFrames = analyzeVisionFrames,
  interpretFrames = analyzeMeaningFrames} = {}) {
  ensureBinary(ffmpegPath, 'ffmpeg');
  ensureBinary(ffprobePath, 'ffprobe');

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'moments-video-'));
  const inputPath = path.join(tempDir, 'clip.mp4');

  try {
    await fs.writeFile(inputPath, buffer);

    const metadata = await probeVideo(inputPath);
    const clipDurationSeconds = Number(metadata.durationSeconds) || 0;
    if (clipDurationSeconds < 1.95 || clipDurationSeconds > 4.05 || !metadata.width || !metadata.height) {
      const error = new Error(
        `Moments accepts clips from 2 to 4 seconds. This clip is ${round(
          clipDurationSeconds,
        )} seconds.`,
      );
      error.statusCode = 422;
      throw error;
    }
    const moderation = await screen(buffer);
    if (moderation.status !== 'approved') {
      return {
        score: null, purityScore: null, eligibleForLeaderboard: false, moderation,
        title: moderation.status === 'blocked' ? 'Clip not eligible' : 'Safety screening needed',
        tier: moderation.status === 'blocked' ? 'Not eligible' : 'Not ranked',
        summary: moderation.status === 'blocked'
          ? 'This clip does not meet Moments safety rules. It cannot be graded, archived, or published.'
          : 'This clip has not cleared safety screening. It has no grade and cannot join the leaderboard.',
        dimensions: {}, signals: {}, explanation: [], medium: 'video',
        clipDurationSeconds: round(clipDurationSeconds), scoringVersion: ENGINE_VERSION,
      };
    }
    const timestamps = buildFrameTimestamps(clipDurationSeconds);

    const frameBuffers = [];

    for (let index = 0; index < timestamps.length; index += 1) {
      const framePath = path.join(tempDir, `frame-${index}.jpg`);
      const frameBuffer = await extractFrame(inputPath, framePath, timestamps[index], index === timestamps.length - 1);
      frameBuffers.push(frameBuffer);
    }

    let vision = null;
    try {
      vision = await inspectFrames(frameBuffers);
    } catch (error) {
      console.error('Local vision screening unavailable.');
    }
    if (!vision || !Number.isFinite(vision.explicitContentRisk) || vision.analyzedFrames !== frameBuffers.length || vision.explicitContentRisk >= 60) {
      return {score: null, purityScore: null, eligibleForLeaderboard: false,
        moderation: {...moderation, status: 'review_required', eligibleForLeaderboard: false,
          reason: vision ? 'local_safety_disagreement' : 'local_screening_unavailable'},
        title: 'Safety screening needed', tier: 'Not ranked',
        summary: 'Safety checks are incomplete or disagree. This clip cannot be graded or published.',
        dimensions: {}, signals: {}, explanation: [], medium: 'video',
        clipDurationSeconds: round(clipDurationSeconds), scoringVersion: ENGINE_VERSION};
    }
    let meaning;
    try {
      meaning = await interpretFrames(frameBuffers);
    } catch {
      const error = new Error('The meaning model is unavailable. No substitute grade was assigned. Please try again later.');
      error.statusCode = 503;
      throw error;
    }
    const ranking = rankMeaning(meaning);
    const score = ranking.score;

    return {
      score,
      tier: pickTier(score),
      title: {care: 'Small Acts of Care', connection: 'A Moment of Connection',
        wonder: 'Everyday Wonder', presence: 'Quiet Presence'}[
        Object.entries(ranking.dimensions).filter(([key]) => key !== 'simplicity')
          .sort((a, b) => b[1] - a[1])[0][0]],
      summary: `A ${round(clipDurationSeconds)}-second moment ranked for visible care, connection, wonder, and presence.${ranking.eligibleForLeaderboard ? '' : ' Display-first or sexualized framing keeps this clip off the board.'}`,
      dimensions: ranking.dimensions,
      signals: {explicitContentRisk: vision.explicitContentRisk},
      explanation: [
        ...ranking.explanation,
        ...Object.entries(ranking.penalties).filter(([, value]) => value > 0).map(([key, value]) => `${key}: ${value.toFixed(1)} points deducted.`),
      ],
      medium: 'video',
      clipDurationSeconds: round(clipDurationSeconds),
      frameCount: frameBuffers.length,
      scoringEngine: 'local-semantic-clip',
      vision,
      meaning,
      moderation,
      purityScore: score,
      penalties: ranking.penalties,
      baseScore: ranking.baseScore,
      scoringVersion: ranking.scoringVersion,
      eligibleForLeaderboard: ranking.eligibleForLeaderboard,
    };
  } finally {
    await fs.rm(tempDir, {recursive: true, force: true}).catch(() => {});
  }
}

module.exports = {analyzeVideo, buildFrameTimestamps, probeVideo};
