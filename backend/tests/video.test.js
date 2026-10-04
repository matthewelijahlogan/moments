const {test} = require('node:test');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const ffmpeg = require('ffmpeg-static');
const {analyzeVideo, buildFrameTimestamps} = require('../src/analyzer');
const {contentHash, POLICY_VERSION} = require('../src/moderation');
const {summarizeConcepts} = require('../src/meaning');

test('real decoding accepts 2–4 seconds; unscreened clips are never graded', async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'moments-test-'));
  const oldUrl = process.env.MODERATION_SERVICE_URL;
  delete process.env.MODERATION_SERVICE_URL;
  try {
    for (const duration of [1, 2, 3, 4, 5]) {
      const output = path.join(folder, `${duration}.mp4`);
      execFileSync(ffmpeg, ['-y', '-f', 'lavfi', '-i', `color=c=blue:s=64x64:r=10:d=${duration}`,
        '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', output], {stdio: 'ignore', windowsHide: true});
      const buffer = await fs.readFile(output);
      if (duration < 2 || duration > 4) {
        await assert.rejects(analyzeVideo(buffer), /2 to 4 seconds/);
      } else {
        const result = await analyzeVideo(buffer);
        assert.equal(result.score, null);
        assert.equal(result.eligibleForLeaderboard, false);
        assert.equal(result.moderation.status, 'review_required');
        assert.equal(result.clipDurationSeconds, duration);
      }
    }
    await assert.rejects(analyzeVideo(Buffer.from('invalid media')));
  } finally {
    if (oldUrl !== undefined) process.env.MODERATION_SERVICE_URL = oldUrl;
    await fs.rm(folder, {recursive: true, force: true});
  }
});
test('meaning sample covers both ends and the middle of the clip', () => {
  for (const duration of [2, 3, 4]) {
    const times = buildFrameTimestamps(duration);
    assert.equal(times.length, 5);
    assert.ok(times[0] <= 0.05);
    assert.ok(times.at(-1) >= duration - 0.05);
    assert.equal(times[2], duration / 2);
  }
});

test('approved flow uses semantic cues; disagreements and model failure never fall back to pixels', async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'moments-flow-test-'));
  try {
    const output = path.join(folder, 'blue.mp4');
    execFileSync(ffmpeg, ['-y', '-f', 'lavfi', '-i', 'color=c=blue:s=64x64:r=10:d=2',
      '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', output], {stdio: 'ignore', windowsHide: true});
    const buffer = await fs.readFile(output);
    const screen = async () => ({status: 'approved', policyVersion: POLICY_VERSION,
      contentHash: contentHash(buffer), eligibleForLeaderboard: true});
    const inspectFrames = async frames => ({explicitContentRisk: 0, analyzedFrames: frames.length});
    const interpretFrames = async frames => summarizeConcepts(frames.map(() => ({care: 0.85,
      connection: 0.8, wonder: 0.7, presence: 0.9, display: 0.1, spectacle: 0.1, sexualization: 0.1, affection: 0.85})));
    const result = await analyzeVideo(buffer, {screen, inspectFrames, interpretFrames});
    assert.equal(result.scoringEngine, 'local-semantic-clip');
    assert.ok(result.score > 80);
    assert.equal(result.frameCount, 5);
    assert.equal(result.eligibleForLeaderboard, true);

    for (const inspectFrames of [async () => null, async () => ({explicitContentRisk: 99, analyzedFrames: 5}),
      async () => ({explicitContentRisk: NaN, analyzedFrames: 5}), async () => ({explicitContentRisk: 0, analyzedFrames: 1})]) {
      const held = await analyzeVideo(buffer, {screen, inspectFrames, interpretFrames});
      assert.equal(held.score, null);
      assert.equal(held.eligibleForLeaderboard, false);
    }
    await assert.rejects(analyzeVideo(buffer, {screen, inspectFrames,
      interpretFrames: async () => {throw new Error('model offline');}}), /No substitute grade/);
  } finally {
    await fs.rm(folder, {recursive: true, force: true});
  }
});
