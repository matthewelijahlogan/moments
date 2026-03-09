import * as tf from '@tensorflow/tfjs';

/**
 * Load the TensorFlow.js model.
 * @param {string} modelPath - Path to the model JSON file.
 * @returns {Promise<tf.LayersModel>} - The loaded model.
 */
export async function loadModel(modelPath) {
  try {
    const model = await tf.loadLayersModel(modelPath);
    console.log('Model loaded successfully!');
    return model;
  } catch (error) {
    console.error('Error loading model:', error);
    throw error;
  }
}

/**
 * Save the TensorFlow.js model.
 * @param {tf.LayersModel} model - The model to save.
 * @param {string} modelPath - Path to save the model JSON file.
 */
export async function saveModel(model, modelPath) {
  try {
    await model.save(modelPath);
    console.log('Model saved successfully!');
  } catch (error) {
    console.error('Error saving model:', error);
    throw error;
  }
}
