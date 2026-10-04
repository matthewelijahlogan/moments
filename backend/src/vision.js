const tf = require('@tensorflow/tfjs');
const nsfw = require('nsfwjs');
const {Jimp} = require('jimp');

let modelPromise;
async function loadModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      await tf.setBackend('cpu');
      await tf.ready();
      return nsfw.load('MobileNetV2');
    })().catch(error => {modelPromise = null; throw error;});
  }
  return modelPromise;
}

async function imageTensor(buffer) {
  const image = await Jimp.read(buffer);
  // Preserve the whole composition; a center crop can remove edge content.
  image.contain({w: 224, h: 224});
  const {data, height, width} = image.bitmap;
  const rgb = new Int32Array(width * height * 3);
  for (let source = 0, target = 0; source < data.length; source += 4) {
    rgb[target++] = data[source];
    rgb[target++] = data[source + 1];
    rgb[target++] = data[source + 2];
  }
  return tf.tensor3d(rgb, [height, width, 3], 'int32');
}

async function analyzeVisionFrames(frameBuffers) {
  if (!frameBuffers.length) throw new Error('No frames available for local screening.');
  const model = await loadModel();
  let risk = 0;
  for (const buffer of frameBuffers) {
    const tensor = await imageTensor(buffer);
    try {
      const classifications = await model.classify(tensor, 5);
      const probabilities = Object.fromEntries(classifications.map(item => [item.className.toLowerCase(), item.probability]));
      if (['porn', 'hentai', 'sexy'].some(key => !Number.isFinite(probabilities[key]))) {
        throw new Error('Local screening returned incomplete observations.');
      }
      risk = Math.max(risk, Math.min(1, probabilities.porn + probabilities.hentai + probabilities.sexy * 0.72));
    } finally {
      tensor.dispose();
    }
  }
  return {model: 'nsfwjs-MobileNetV2', analyzedFrames: frameBuffers.length,
    explicitContentRisk: Math.round(risk * 1000) / 10,
    scope: 'sampled-frame-secondary-check', childSafetyVerified: false};
}

module.exports = {analyzeVisionFrames};
