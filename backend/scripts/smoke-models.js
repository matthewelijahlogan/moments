// Real local model loading/inference on a synthetic color field. No user media,
// safety approval, archive write, or detector-accuracy claim is involved.
const assert = require('node:assert/strict');
const {Jimp} = require('jimp');
const {analyzeVisionFrames} = require('../src/vision');
const {analyzeMeaningFrames, rankMeaning} = require('../src/meaning');

(async () => {
  const image = new Jimp({width: 224, height: 224, color: 0x336699ff});
  const buffer = await image.getBuffer('image/jpeg');
  const vision = await analyzeVisionFrames([buffer]);
  const meaning = await analyzeMeaningFrames([buffer]);
  const ranking = rankMeaning(meaning);
  assert.equal(vision.analyzedFrames, 1);
  assert.equal(meaning.frameCount, 1);
  assert.ok(Number.isFinite(ranking.score));
  console.log(JSON.stringify({modelsLoaded: [vision.model, meaning.model], realInference: true,
    syntheticTestScore: ranking.score, childSafetyVerified: false}));
})().catch(error => {console.error(error.message); process.exitCode = 1;});
