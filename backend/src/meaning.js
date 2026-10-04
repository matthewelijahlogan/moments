// CLIP similarities describe visible framing. They do not establish intent,
// consent, age, love, character, or the truth of anyone's feelings.
const CONCEPTS = {
  care: ['an ordinary act of helping, caring, or comforting', 'an everyday scene without an act of care'],
  connection: ['a shared affectionate everyday moment', 'a solitary scene without a visible relationship'],
  wonder: ['a quiet moment of wonder in nature or ordinary life', 'a routine scene without a moment of discovery'],
  presence: ['an unposed everyday moment being noticed', 'a staged performance directed at the camera'],
  display: ['posing to flaunt luxury goods, wealth, or status', 'objects being used in ordinary everyday life'],
  spectacle: ['gaudy staged spectacle and ostentatious decoration', 'simple surroundings or naturally vivid colors'],
  sexualization: ['sexualized posing intended to attract attention', 'ordinary nonsexual behavior or affectionate closeness'],
  affection: ['tender nonsexual affection between people', 'posing without a visible affectionate interaction'],
};
const ENGINE_VERSION = 'moments-purity-1';
const MODEL_REVISION = 'd15189d7028b43f1d3e65039190477f6af591c2a';
let pipelinePromise;

async function loadMeaningModel() {
  if (!pipelinePromise) {
    pipelinePromise = import('@huggingface/transformers').then(async ({pipeline, env}) => {
      env.cacheDir = process.env.MEANING_MODEL_CACHE || './.model-cache';
      return pipeline('zero-shot-image-classification', 'Xenova/clip-vit-base-patch32',
        {revision: MODEL_REVISION, dtype: 'q8', device: 'cpu'});
    }).catch(error => { pipelinePromise = null; throw error; });
  }
  return pipelinePromise;
}

async function analyzeMeaningFrames(buffers) {
  const classify = await loadMeaningModel();
  const {RawImage} = await import('@huggingface/transformers');
  const observations = [];
  const allLabels = Object.values(CONCEPTS).flat();
  for (const buffer of buffers) {
    const image = await RawImage.fromBlob(new Blob([buffer], {type: 'image/jpeg'}));
    // One image embedding per frame. Renormalizing each pair cancels the
    // shared softmax denominator and retains the paired-description score.
    const result = await classify(image, allLabels);
    const scores = Object.fromEntries(result.map(item => [item.label, item.score]));
    const frame = {};
    for (const [key, labels] of Object.entries(CONCEPTS)) {
      const total = scores[labels[0]] + scores[labels[1]];
      frame[key] = total > 0 ? scores[labels[0]] / total : NaN;
    }
    observations.push(frame);
  }
  return summarizeConcepts(observations);
}

function summarizeConcepts(frames) {
  if (!frames.length || frames.some(frame => Object.keys(CONCEPTS).some(key =>
    !Number.isFinite(frame[key]) || frame[key] < 0 || frame[key] > 1))) {
    throw new Error('Meaning observations are incomplete.');
  }
  const average = key => frames.reduce((sum, frame) => sum + frame[key], 0) / frames.length;
  const values = Object.fromEntries(Object.keys(CONCEPTS).map(key => [key, average(key)]));
  // Sustained framing matters, but a single sexualized frame is not averaged away.
  values.sexualization = Math.max(...frames.map(frame => frame.sexualization));
  return {model: 'Xenova/clip-vit-base-patch32', revision: MODEL_REVISION, frameCount: frames.length, values};
}

function rankMeaning(meaning) {
  const v = meaning.values;
  if (Object.keys(CONCEPTS).some(key => !Number.isFinite(v?.[key]) || v[key] < 0 || v[key] > 1)) {
    throw new Error('Meaning observations are incomplete.');
  }
  const positive = [v.care, v.connection, v.wonder].sort((a, b) => b - a);
  // A landscape or solitary moment can rank highly without faces or smiles.
  const base = (positive[0] * 0.5 + (positive[0] + positive[1]) / 2 * 0.3 + v.presence * 0.2) * 100;
  const evidence = value => Math.max(0, (value - 0.5) * 2);
  const penalties = {display: evidence(v.display) * 25, spectacle: evidence(v.spectacle) * 12,
    sexualization: evidence(v.sexualization) * 30 * (1 - evidence(v.affection) * 0.35)};
  const round = value => Math.round(value * 10) / 10;
  const score = round(Math.max(0, Math.min(100, base - Object.values(penalties).reduce((a, b) => a + b, 0))));
  const eligibleForLeaderboard = Math.max(v.display, v.spectacle) < 0.8 && v.sexualization < 0.8;
  return {score, purityScore: score, baseScore: round(base), scoringVersion: ENGINE_VERSION,
    eligibleForLeaderboard, penalties: Object.fromEntries(Object.entries(penalties).map(([key, value]) => [key, round(value)])),
    dimensions: {care: round(v.care * 100), connection: round(v.connection * 100), wonder: round(v.wonder * 100),
      presence: round(v.presence * 100), simplicity: round((1 - Math.max(v.display, v.spectacle)) * 100)},
    explanation: ['Purity means visible care, connection, wonder, and presence. It is a subjective ranking of the clip, not a judgment of the person.',
      'Nature and solitary moments can score well. Faces, smiles, expensive cameras, saturation, and production polish earn no automatic bonus.',
      'Display-first, gaudy, and sexualized framing reduce the grade. Strong display or sexualization excludes a clip from the board.',
      'Tender non-explicit affection can soften a framing penalty; it never overrides child safety, consent uncertainty, or explicit-content restrictions.',
      'Concept similarities are experimental, uncalibrated visual cues. They cannot prove love, arrogance, consent, or genuine emotion.']};
}

module.exports = {CONCEPTS, ENGINE_VERSION, analyzeMeaningFrames, summarizeConcepts, rankMeaning};
