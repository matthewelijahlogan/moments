const {test} = require('node:test');
const assert = require('node:assert/strict');
const {POLICY_VERSION, contentHash, evaluateScreening, screenVideo, requirePublishable} = require('../src/moderation');
const {archiveMoment} = require('../src/persistence');

const clip = Buffer.from('synthetic-test-video');
const hash = contentHash(clip);
const now = Date.parse('2026-10-04T18:00:00Z');
function safeReport(overrides = {}) {
  return {contentHash: hash, policyVersion: POLICY_VERSION, provider: 'test-only', screeningId: 'receipt-test',
    coverage: 'full-video', knownCsamScreening: 'completed', contextScreening: 'completed',
    reviewedAt: new Date(now).toISOString(), decision: 'approved',
    knownCsamMatch: false, childSexualization: false, childNudity: false, childCompromisingSituation: false,
    explicitSexualActivity: false, graphicNudity: false, childrenPresent: false, ageUncertain: false,
    nonConsensualContent: false, consentUncertain: false, ...overrides};
}

test('complete exact-content screening permits ranking', () => {
  assert.equal(evaluateScreening(safeReport(), hash, now).status, 'approved');
});

for (const flag of ['knownCsamMatch', 'childSexualization', 'childNudity', 'childCompromisingSituation',
  'explicitSexualActivity', 'graphicNudity', 'nonConsensualContent']) {
  test(`${flag} is blocked despite approval or claims of affection`, () => {
    const report = safeReport({[flag]: true, lovePersonified: true, childSafetyHumanReview: 'approved', reviewerId: 'reviewer'});
    const result = evaluateScreening(report, hash, now);
    assert.equal(result.status, 'blocked');
    assert.equal(result.eligibleForLeaderboard, false);
  });
}

test('children require human review and uncertain age cannot be overridden', () => {
  assert.equal(evaluateScreening(safeReport({childrenPresent: true}), hash, now).status, 'review_required');
  assert.equal(evaluateScreening(safeReport({childrenPresent: true, childSafetyHumanReview: 'approved', reviewerId: 'trained-reviewer'}), hash, now).status, 'approved');
  assert.equal(evaluateScreening(safeReport({ageUncertain: true, childSafetyHumanReview: 'approved', reviewerId: 'reviewer'}), hash, now).status, 'review_required');
  assert.equal(evaluateScreening(safeReport({consentUncertain: true}), hash, now).status, 'review_required');
});

test('missing fields, stale reports, sampled coverage, and replayed receipts fail closed', () => {
  for (const [key, value] of Object.entries(safeReport())) {
    const report = safeReport();
    delete report[key];
    assert.notEqual(evaluateScreening(report, hash, now).status, 'approved', key);
  }
  for (const report of [safeReport({contentHash: 'wrong'}), safeReport({coverage: 'sampled-frames'}),
    safeReport({reviewedAt: '2026-10-01T00:00:00Z'}), safeReport({knownCsamScreening: 'unavailable'}),
    safeReport({policyVersion: 'old-policy'})]) {
    assert.equal(evaluateScreening(report, hash, now).status, 'review_required');
  }
});

test('missing provider, provider error, and malformed JSON never approve', async () => {
  const oldUrl = process.env.MODERATION_SERVICE_URL;
  const oldToken = process.env.MODERATION_SERVICE_TOKEN;
  try {
    delete process.env.MODERATION_SERVICE_URL;
    delete process.env.MODERATION_SERVICE_TOKEN;
    assert.equal((await screenVideo(clip)).status, 'review_required');
    process.env.MODERATION_SERVICE_URL = 'https://screening.example.invalid/video';
    process.env.MODERATION_SERVICE_TOKEN = 'test-only';
    const result = await screenVideo(clip, {now, fetchImpl: async (url, options) => {
      assert.equal(options.headers['X-Content-SHA256'], hash);
      assert.equal(options.body, clip);
      return {ok: true, json: async () => safeReport()};
    }});
    assert.equal(result.status, 'approved');
    for (const fetchImpl of [async () => {throw new Error('offline');},
      async () => ({ok: false}), async () => ({ok: true, json: async () => ({})})]) {
      assert.equal((await screenVideo(clip, {now, fetchImpl})).status, 'review_required');
    }
  } finally {
    if (oldUrl === undefined) delete process.env.MODERATION_SERVICE_URL; else process.env.MODERATION_SERVICE_URL = oldUrl;
    if (oldToken === undefined) delete process.env.MODERATION_SERVICE_TOKEN; else process.env.MODERATION_SERVICE_TOKEN = oldToken;
  }
});

test('archive rejects unsafe analysis before touching Storage or database', async () => {
  const analysis = {score: 100, eligibleForLeaderboard: true,
    moderation: evaluateScreening(safeReport({knownCsamMatch: true}), hash, now)};
  await assert.rejects(archiveMoment({analysis, file: {buffer: clip}}), /cannot be published/);
  const approved = {...analysis, moderation: evaluateScreening(safeReport(), hash, now)};
  assert.doesNotThrow(() => requirePublishable(approved, clip));
  assert.throws(() => requirePublishable(approved, Buffer.from('different-content')), /cannot be published/);
  assert.throws(() => requirePublishable({...approved, eligibleForLeaderboard: false}, clip), /cannot be published/);
});
