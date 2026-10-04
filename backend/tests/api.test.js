const {test} = require('node:test');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const ffmpeg = require('ffmpeg-static');
const app = require('../server');

test('API exposes no invented board and rejects a client-forged safety approval', async () => {
  const oldUrl = process.env.SUPABASE_URL;
  const oldScreening = process.env.MODERATION_SERVICE_URL;
  delete process.env.SUPABASE_URL;
  delete process.env.MODERATION_SERVICE_URL;
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'moments-api-test-'));
  try {
    const health = await (await fetch(`${base}/health`)).json();
    assert.equal(health.capture, 'video-only-2-to-4-seconds');
    assert.equal(health.moderationConfigured, false);
    const board = await (await fetch(`${base}/leaderboard`)).json();
    assert.deepEqual(board.entries, []);
    assert.equal((await fetch(`${base}/moments/00000000-0000-0000-0000-000000000000/video`)).status, 404);
    assert.equal((await fetch(`${base}/score-image`, {method: 'POST'})).status, 410);
    assert.equal((await fetch(`${base}/moments`, {method: 'POST'})).status, 503);

    const output = path.join(folder, 'blue.mp4');
    execFileSync(ffmpeg, ['-y', '-f', 'lavfi', '-i', 'color=c=blue:s=64x64:r=10:d=2',
      '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', output], {stdio: 'ignore', windowsHide: true});
    const form = new FormData();
    form.append('file', new Blob([await fs.readFile(output)], {type: 'video/mp4'}), 'blue.mp4');
    form.append('score', '100');
    form.append('moderation', JSON.stringify({status: 'approved', eligibleForLeaderboard: true}));
    const response = await fetch(`${base}/score-video`, {method: 'POST', body: form});
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.score, null);
    assert.equal(result.moderation.status, 'review_required');
    assert.equal(result.eligibleForLeaderboard, false);
  } finally {
    if (oldUrl !== undefined) process.env.SUPABASE_URL = oldUrl;
    if (oldScreening !== undefined) process.env.MODERATION_SERVICE_URL = oldScreening;
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await fs.rm(folder, {recursive: true, force: true});
  }
});
