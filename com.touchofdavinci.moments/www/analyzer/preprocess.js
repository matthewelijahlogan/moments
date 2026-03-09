import * as tf from '@tensorflow/tfjs';

/**
 * Preprocess the image for model inference.
 * @param {HTMLImageElement} image - The image element to preprocess.
 * @returns {tf.Tensor} - The preprocessed image tensor.
 */
export function preprocessImage(image) {
  return tf.browser.fromPixels(image)
    .resizeNearestNeighbor([224, 224]) // Resize to match model input size
    .expandDims(0)                     // Add batch dimension
    .toFloat()                         // Convert to float32
    .div(tf.scalar(127.5))             // Normalize to [-1, 1] range
    .sub(tf.scalar(1));                // Adjust to range of [-1, 1]
}
