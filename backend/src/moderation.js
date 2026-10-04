const crypto = require('crypto');

const POLICY_VERSION = 'moments-safety-1';
const REQUIRED_FLAGS = ['knownCsamMatch', 'childSexualization', 'childNudity',
  'childCompromisingSituation', 'explicitSexualActivity', 'graphicNudity',
  'childrenPresent', 'ageUncertain', 'nonConsensualContent', 'consentUncertain'];

function contentHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function decision(status, reason, extra = {}) {
  return {status, reason, policyVersion: POLICY_VERSION, eligibleForLeaderboard: status === 'approved', ...extra};
}

function evaluateScreening(report, hash, now = Date.now()) {
  if (!report || report.contentHash !== hash || report.policyVersion !== POLICY_VERSION ||
      !report.provider || !report.screeningId || report.coverage !== 'full-video' ||
      report.knownCsamScreening !== 'completed' || report.contextScreening !== 'completed' ||
      !REQUIRED_FLAGS.every(key => typeof report[key] === 'boolean')) {
    return decision('review_required', 'screening_incomplete');
  }
  const reviewedAt = Date.parse(report.reviewedAt);
  if (!Number.isFinite(reviewedAt) || reviewedAt > now + 60_000 || now - reviewedAt > 24 * 60 * 60_000) {
    return decision('review_required', 'screening_expired');
  }
  const evidence = {contentHash: hash, provider: String(report.provider).slice(0, 120),
    screeningId: String(report.screeningId).slice(0, 160), reviewedAt: report.reviewedAt,
    childrenPresent: report.childrenPresent,
    childSafetyHumanReview: report.childSafetyHumanReview || null,
    reviewerId: typeof report.reviewerId === 'string' ? report.reviewerId.slice(0, 120) : null};
  if (report.knownCsamMatch || report.childSexualization || report.childNudity || report.childCompromisingSituation) {
    return decision('blocked', 'child_safety', evidence);
  }
  if (report.explicitSexualActivity || report.graphicNudity) {
    return decision('blocked', 'explicit_content', evidence);
  }
  if (report.nonConsensualContent) return decision('blocked', 'nonconsensual_content', evidence);
  if (report.consentUncertain) return decision('review_required', 'consent_uncertain', evidence);
  if (report.ageUncertain) return decision('review_required', 'age_uncertain', evidence);
  if (report.childrenPresent && !(report.childSafetyHumanReview === 'approved' &&
      typeof report.reviewerId === 'string' && report.reviewerId.trim())) {
    return decision('review_required', 'child_safety_review', evidence);
  }
  if (report.decision !== 'approved') return decision('review_required', 'provider_review', evidence);
  return decision('approved', 'screened', evidence);
}

async function screenVideo(buffer, {fetchImpl = fetch, now = Date.now()} = {}) {
  const hash = contentHash(buffer);
  const endpoint = process.env.MODERATION_SERVICE_URL;
  const token = process.env.MODERATION_SERVICE_TOKEN;
  if (!endpoint || !token) return decision('review_required', 'screening_unavailable', {contentHash: hash});
  try {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' || url.username || url.password) {
      return decision('review_required', 'screening_unavailable', {contentHash: hash});
    }
    const response = await fetchImpl(url, {method: 'POST', redirect: 'error',
      headers: {'Content-Type': 'application/octet-stream', Authorization: `Bearer ${token}`,
        'X-Content-SHA256': hash, 'X-Moments-Policy': POLICY_VERSION},
      body: buffer, signal: AbortSignal.timeout(30_000)});
    if (!response.ok) return decision('review_required', 'screening_unavailable', {contentHash: hash});
    return evaluateScreening(await response.json(), hash, now);
  } catch {
    return decision('review_required', 'screening_unavailable', {contentHash: hash});
  }
}

function requirePublishable(analysis, buffer) {
  const moderation = analysis?.moderation;
  if (moderation?.status !== 'approved' || moderation.policyVersion !== POLICY_VERSION ||
      moderation.eligibleForLeaderboard !== true || moderation.contentHash !== contentHash(buffer) ||
      analysis.eligibleForLeaderboard !== true || !Number.isFinite(analysis.score)) {
    const error = new Error('This clip has not cleared safety screening and ranking. It cannot be published.');
    error.statusCode = 422;
    throw error;
  }
}

module.exports = {POLICY_VERSION, contentHash, evaluateScreening, screenVideo, requirePublishable};
