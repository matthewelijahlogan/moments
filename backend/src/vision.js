const path = require('path');
const tf = require('@tensorflow/tfjs');
const nsfw = require('nsfwjs');
const {Jimp} = require('jimp');

const humanModulePath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@vladmandic',
  'human',
  'dist',
  'human.node-wasm.js',
);

let modelPromise;

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function round(value) {
  return Number(value.toFixed(1));
}

function average(values) {
  return values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : 0;
}

function modelOrigin() {
  const port = Number(process.env.PORT || 3000);
  return (
    process.env.VISION_MODEL_BASE_URL ||
    `http://127.0.0.1:${port}/.moments-vision`
  ).replace(/\/+$/, '');
}

async function loadModels() {
  if (!modelPromise) {
    modelPromise = (async () => {
      // Human's package currently exposes its WASM bundle without a usable
      // CommonJS subpath, so resolve the installed, version-pinned file directly.
      // eslint-disable-next-line import/no-dynamic-require, global-require
      const Human = require(humanModulePath);
      const origin = modelOrigin();
      const human = new Human.Human({
        backend: 'wasm',
        modelBasePath: `${origin}/human/`,
        wasmPath: `${origin}/wasm/`,
        warmup: 'none',
        cacheModels: true,
        face: {
          enabled: true,
          detector: {
            enabled: true,
            maxDetected: 8,
            minConfidence: 0.25,
          },
          mesh: {enabled: false},
          iris: {enabled: false},
          emotion: {enabled: true},
          description: {enabled: false},
          antispoof: {enabled: false},
          liveness: {enabled: false},
        },
        body: {enabled: false},
        hand: {enabled: false},
        object: {
          enabled: true,
          maxDetected: 12,
          minConfidence: 0.2,
        },
        segmentation: {enabled: false},
        gesture: {enabled: false},
      });

      await human.load();
      tf.enableProdMode();
      await tf.ready();
      const safety = await nsfw.load('MobileNetV2');

      return {human, safety};
    })().catch(error => {
      modelPromise = null;
      throw error;
    });
  }

  return modelPromise;
}

async function imageTensor(buffer, tensorFactory) {
  const image = await Jimp.read(buffer);
  image.cover({w: 224, h: 224});
  const {data, height, width} = image.bitmap;
  const rgb = new Int32Array(width * height * 3);

  for (let source = 0, target = 0; source < data.length; source += 4) {
    rgb[target] = data[source];
    rgb[target + 1] = data[source + 1];
    rgb[target + 2] = data[source + 2];
    target += 3;
  }

  return tensorFactory(rgb, [height, width, 3], 'int32');
}

function emotionScore(face, name) {
  const emotion = (face.emotion || []).find(
    entry => String(entry.emotion).toLowerCase() === name,
  );
  return Number(emotion && emotion.score) || 0;
}

function boxAreaRatio(item, frameArea) {
  const box = item.box || item.boxRaw || [];
  const width = Number(box[2]) || 0;
  const height = Number(box[3]) || 0;
  return frameArea ? clamp((width * height) / frameArea) : 0;
}

async function analyzeFrame(buffer, models) {
  const humanTensor = await imageTensor(
    buffer,
    models.human.tf.tensor3d.bind(models.human.tf),
  );
  const safetyTensor = await imageTensor(buffer, tf.tensor3d);

  try {
    const [humanResult, classifications] = await Promise.all([
      models.human.detect(humanTensor),
      models.safety.classify(safetyTensor, 5),
    ]);
    const probabilities = Object.fromEntries(
      classifications.map(item => [
        item.className.toLowerCase(),
        Number(item.probability) || 0,
      ]),
    );
    const frameArea =
      Number(humanResult.width || 224) * Number(humanResult.height || 224);
    const faces = (humanResult.face || []).filter(
      face =>
        Math.max(Number(face.boxScore) || 0, Number(face.faceScore) || 0) >=
          0.75 && boxAreaRatio(face, frameArea) >= 0.012,
    );
    const objects = (humanResult.object || []).map(item => ({
      label: String(item.label || '').toLowerCase(),
      score: Number(item.score) || 0,
      area: boxAreaRatio(item, frameArea),
    }));

    const objectPeople = objects.filter(
      object => object.label === 'person' && object.score >= 0.58,
    ).length;

    return {
      faceCount: faces.length,
      personCount: Math.max(faces.length, objectPeople),
      happiness: average(faces.map(face => emotionScore(face, 'happy'))),
      surprise: average(faces.map(face => emotionScore(face, 'surprise'))),
      distress: average(
        faces.map(
          face =>
            emotionScore(face, 'angry') +
            emotionScore(face, 'disgust') +
            emotionScore(face, 'fear'),
        ),
      ),
      explicitRisk: clamp(
        (probabilities.porn || 0) +
          (probabilities.hentai || 0) +
          (probabilities.sexy || 0) * 0.72,
      ),
      objectArea: clamp(
        objects.reduce(
          (total, object) =>
            total + (object.score >= 0.35 ? object.area : 0),
          0,
        ),
      ),
      objects: objects
        .filter(object => object.score >= 0.35)
        .map(object => object.label),
    };
  } finally {
    models.human.tf.dispose(humanTensor);
    safetyTensor.dispose();
  }
}

function summarizeFrames(frames) {
  const faceFrames = frames.filter(frame => frame.faceCount > 0);
  const peopleFrames = frames.filter(frame => frame.personCount > 0);
  const happiness = average(faceFrames.map(frame => frame.happiness));
  const happinessSpread = faceFrames.length
    ? Math.max(...faceFrames.map(frame => frame.happiness)) -
      Math.min(...faceFrames.map(frame => frame.happiness))
    : 0;
  const expressionContinuity = faceFrames.length
    ? clamp(
        faceFrames.length / frames.length * 0.65 +
          (1 - happinessSpread) * 0.35,
      )
    : 0;
  const peoplePersistence = peopleFrames.length / frames.length;
  const togetherness = average(
    frames.map(frame => clamp((frame.personCount - 1) / 3)),
  );
  const explicitRisk = Math.max(...frames.map(frame => frame.explicitRisk), 0);
  const objectDisplayRisk = average(
    frames.map(frame =>
      frame.personCount === 0 && frame.objectArea >= 0.42
        ? clamp((frame.objectArea - 0.35) / 0.5)
        : 0,
    ),
  );
  const humanWarmth = faceFrames.length
    ? clamp(
        happiness * 0.58 +
          expressionContinuity * 0.22 +
          peoplePersistence * 0.12 +
          togetherness * 0.08,
      )
    : 0;

  return {
    model: 'local-open-source',
    analyzedFrames: frames.length,
    faceFrames: faceFrames.length,
    peakPeople: Math.max(...frames.map(frame => frame.personCount), 0),
    humanWarmth: round(humanWarmth * 100),
    expressionContinuity: round(expressionContinuity * 100),
    togetherness: round(togetherness * 100),
    explicitContentRisk: round(explicitRisk * 100),
    objectDisplayRisk: round(objectDisplayRisk * 100),
    observedObjects: [
      ...new Set(frames.flatMap(frame => frame.objects)),
    ].slice(0, 8),
  };
}

async function analyzeVisionFrames(frameBuffers) {
  const models = await loadModels();
  const selectedFrames =
    frameBuffers.length <= 3
      ? frameBuffers
      : [
          frameBuffers[0],
          frameBuffers[Math.floor(frameBuffers.length / 2)],
          frameBuffers[frameBuffers.length - 1],
        ];
  const frames = [];

  // Sequential execution keeps peak memory low enough for Render's free tier.
  for (const frame of selectedFrames) {
    frames.push(await analyzeFrame(frame, models));
  }

  return summarizeFrames(frames);
}

module.exports = {
  analyzeVisionFrames,
};
