const {spawn} = require('child_process');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const Jimp = require('jimp');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;

const featuredLeaderboard = [
  {
    id: 'featured-quiet-morning',
    username: 'QuietSignal',
    title: 'Kitchen light at 7:12',
    score: 94.2,
    summary:
      'High warmth and calm contrast made this read like a lived-in memory instead of a staged shot.',
    source: 'Featured',
  },
  {
    id: 'featured-parking-lot',
    username: 'TapeArchive',
    title: 'Rain on the lot',
    score: 91.7,
    summary:
      'The frame held strong atmosphere and visual tension, which pushed the meaning score above pure aesthetics.',
    source: 'Featured',
  },
  {
    id: 'featured-porch',
    username: 'HumanVoltage',
    title: 'Shoes on the porch',
    score: 88.6,
    summary:
      'Intimacy and narrative residue carried the image even though the composition stayed understated.',
    source: 'Featured',
  },
];

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function clampScore(value) {
  return round(clamp(value, 15, 98));
}

function round(value) {
  return Number(value.toFixed(1));
}

function closeness(value, target, tolerance) {
  return clamp(1 - Math.abs(value - target) / tolerance);
}

function projectScore(rawValue) {
  return round(clamp(42 + rawValue * 52, 15, 98));
}

function computeEntropy(histogram, total) {
  if (!total) {
    return 0;
  }

  let entropy = 0;
  histogram.forEach(count => {
    if (!count) {
      return;
    }

    const probability = count / total;
    entropy -= probability * Math.log2(probability);
  });

  return entropy / Math.log2(histogram.length);
}

function summarizePixels(pixels) {
  const height = pixels.length;
  const width = pixels[0].length;
  const centerXStart = Math.floor(width * 0.25);
  const centerXEnd = Math.ceil(width * 0.75);
  const centerYStart = Math.floor(height * 0.25);
  const centerYEnd = Math.ceil(height * 0.75);
  const histogram = new Array(16).fill(0);

  let luminanceSum = 0;
  let luminanceSquaredSum = 0;
  let spreadSum = 0;
  let warmthSum = 0;
  let symmetrySum = 0;
  let symmetryCount = 0;
  let totalEdge = 0;
  let centerEdge = 0;
  let outerEdge = 0;
  let centerCount = 0;
  let outerCount = 0;
  let edgeCount = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = pixels[y][x];
      const luminance = r * 0.2126 + g * 0.7152 + b * 0.0722;
      const spread = Math.max(r, g, b) - Math.min(r, g, b);
      const warmth = clamp((r - b + 1) / 2);

      luminanceSum += luminance;
      luminanceSquaredSum += luminance * luminance;
      spreadSum += spread;
      warmthSum += warmth;

      const histogramIndex = Math.min(
        histogram.length - 1,
        Math.floor(luminance * histogram.length),
      );
      histogram[histogramIndex] += 1;

      if (x < width - 1 && y < height - 1) {
        const [nextRightR, nextRightG, nextRightB] = pixels[y][x + 1];
        const [nextDownR, nextDownG, nextDownB] = pixels[y + 1][x];
        const rightLum =
          nextRightR * 0.2126 + nextRightG * 0.7152 + nextRightB * 0.0722;
        const downLum =
          nextDownR * 0.2126 + nextDownG * 0.7152 + nextDownB * 0.0722;
        const edge =
          Math.abs(luminance - rightLum) + Math.abs(luminance - downLum);

        totalEdge += edge;
        edgeCount += 1;

        const inCenter =
          x >= centerXStart &&
          x < centerXEnd &&
          y >= centerYStart &&
          y < centerYEnd;

        if (inCenter) {
          centerEdge += edge;
          centerCount += 1;
        } else {
          outerEdge += edge;
          outerCount += 1;
        }
      }

      if (x < width / 2) {
        const mirrorX = width - x - 1;
        const [mirrorR, mirrorG, mirrorB] = pixels[y][mirrorX];
        const difference =
          (Math.abs(r - mirrorR) +
            Math.abs(g - mirrorG) +
            Math.abs(b - mirrorB)) /
          3;
        symmetrySum += 1 - difference;
        symmetryCount += 1;
      }
    }
  }

  const pixelCount = width * height;
  const brightness = luminanceSum / pixelCount;
  const contrast = Math.sqrt(
    Math.max(luminanceSquaredSum / pixelCount - brightness * brightness, 0),
  );
  const colorRichness = spreadSum / pixelCount;
  const warmth = warmthSum / pixelCount;
  const symmetry = symmetryCount ? symmetrySum / symmetryCount : 0;
  const edgeDensity = edgeCount ? totalEdge / edgeCount : 0;
  const centerEdgeDensity = centerCount ? centerEdge / centerCount : 0;
  const outerEdgeDensity = outerCount ? outerEdge / outerCount : 0;
  const centerFocus = clamp(
    (centerEdgeDensity + 0.025) / (outerEdgeDensity + 0.025) / 1.9,
  );
  const entropy = computeEntropy(histogram, pixelCount);

  return {
    brightness,
    contrast,
    colorRichness,
    warmth,
    symmetry,
    edgeDensity,
    centerFocus,
    entropy,
  };
}

function buildSignals(summary) {
  return {
    brightness: round(summary.brightness * 100),
    contrast: round(clamp(summary.contrast / 0.32) * 100),
    colorRichness: round(clamp(summary.colorRichness / 0.65) * 100),
    warmth: round(summary.warmth * 100),
    symmetry: round(summary.symmetry * 100),
    centerFocus: round(summary.centerFocus * 100),
    atmosphere: round(summary.entropy * 100),
  };
}

function buildDimensions(summary) {
  const balancedBrightness = closeness(summary.brightness, 0.58, 0.38);
  const balancedContrast = closeness(summary.contrast, 0.22, 0.18);
  const contrastNorm = clamp(summary.contrast / 0.32);
  const edgeNorm = clamp(summary.edgeDensity / 0.42);

  const presenceRaw =
    balancedBrightness * 0.35 +
    summary.warmth * 0.25 +
    summary.centerFocus * 0.2 +
    (1 - edgeNorm * 0.45) * 0.2;

  const depthRaw =
    contrastNorm * 0.3 +
    summary.entropy * 0.25 +
    edgeNorm * 0.25 +
    summary.centerFocus * 0.2;

  const connectionRaw =
    summary.warmth * 0.45 +
    balancedBrightness * 0.25 +
    summary.centerFocus * 0.3;

  const atmosphereRaw =
    summary.entropy * 0.35 +
    clamp(summary.colorRichness / 0.65) * 0.25 +
    balancedContrast * 0.2 +
    contrastNorm * 0.2;

  const coherenceRaw =
    summary.symmetry * 0.4 +
    summary.centerFocus * 0.3 +
    balancedBrightness * 0.3;

  return {
    presence: projectScore(presenceRaw),
    depth: projectScore(depthRaw),
    connection: projectScore(connectionRaw),
    atmosphere: projectScore(atmosphereRaw),
    coherence: projectScore(coherenceRaw),
  };
}

function buildOverallScore(dimensions) {
  const weighted =
    dimensions.presence * 0.24 +
    dimensions.depth * 0.22 +
    dimensions.connection * 0.22 +
    dimensions.atmosphere * 0.17 +
    dimensions.coherence * 0.15;

  return round(weighted);
}

function pickTier(score) {
  if (score >= 90) {
    return 'Archive classic';
  }
  if (score >= 82) {
    return 'Meaning-rich';
  }
  if (score >= 74) {
    return 'Quiet signal';
  }
  if (score >= 66) {
    return 'Workable memory';
  }
  return 'Needs stronger residue';
}

function pickTitle(dimensions, signals) {
  const entries = Object.entries(dimensions).sort(
    (left, right) => right[1] - left[1],
  );
  const topDimension = entries[0][0];

  if (topDimension === 'connection' && signals.warmth >= 62) {
    return 'Human Warmth';
  }
  if (topDimension === 'atmosphere' && signals.atmosphere >= 58) {
    return 'Atmospheric Hold';
  }
  if (topDimension === 'depth' && signals.contrast >= 54) {
    return 'Deep Recall';
  }
  if (topDimension === 'coherence' && signals.symmetry >= 58) {
    return 'Held Together';
  }
  if (signals.centerFocus >= 60) {
    return 'Focused Memory';
  }
  return 'Living Archive';
}

function buildSummary(dimensions, signals) {
  const strengths = [];

  if (dimensions.connection >= 82) {
    strengths.push('human warmth');
  }
  if (dimensions.depth >= 82) {
    strengths.push('memory depth');
  }
  if (dimensions.atmosphere >= 82) {
    strengths.push('atmosphere');
  }
  if (dimensions.coherence >= 82) {
    strengths.push('frame coherence');
  }

  if (!strengths.length) {
    strengths.push('balanced visual residue');
  }

  const detail =
    signals.centerFocus >= 58
      ? 'The image keeps its attention centered long enough to feel intentional.'
      : 'The image has room to push subject focus harder for a stronger emotional lock.';

  return `The score is driven by ${strengths.slice(0, 2).join(' and ')}. ${detail}`;
}

function buildExplanation(dimensions, signals) {
  return [
    dimensions.presence >= 80
      ? 'Presence landed high because the light sat in a usable range and the frame stayed emotionally legible.'
      : 'Presence stayed moderate because the image does not fully settle into a stable emotional center.',
    dimensions.depth >= 80
      ? 'Depth rose on contrast, texture, and tonal variety, which makes the moment feel lived rather than merely shown.'
      : 'Depth stayed lighter because the image leaves less tonal complexity and narrative residue than the strongest entries.',
    dimensions.connection >= 80
      ? 'Connection benefited from warmer color balance and a clearer subject pull, which makes the photo feel inhabited.'
      : 'Connection could climb if the subject relationship felt more immediate or less visually dispersed.',
    signals.atmosphere >= 60
      ? 'Atmosphere helped the score because the frame carries enough tonal spread to suggest context beyond the obvious subject.'
      : 'Atmosphere is present but restrained, so the image reads cleaner than it does immersive.',
  ];
}

async function imageBufferToPixels(buffer) {
  const image = await Jimp.read(buffer);
  image.cover(96, 96);

  const pixels = [];
  for (let y = 0; y < image.bitmap.height; y += 1) {
    const row = [];
    for (let x = 0; x < image.bitmap.width; x += 1) {
      const color = Jimp.intToRGBA(image.getPixelColor(x, y));
      row.push([color.r / 255, color.g / 255, color.b / 255]);
    }
    pixels.push(row);
  }

  return pixels;
}

function analyzePixels(pixels) {
  const summary = summarizePixels(pixels);
  const signals = buildSignals(summary);
  const dimensions = buildDimensions(summary);
  const score = buildOverallScore(dimensions);

  return {
    score,
    tier: pickTier(score),
    title: pickTitle(dimensions, signals),
    summary: buildSummary(dimensions, signals),
    dimensions,
    signals,
    explanation: buildExplanation(dimensions, signals),
  };
}

function averageMetricObjects(objects) {
  if (!objects.length) {
    return {};
  }

  const totals = {};
  objects.forEach(object => {
    Object.entries(object).forEach(([key, value]) => {
      totals[key] = (totals[key] || 0) + Number(value || 0);
    });
  });

  return Object.fromEntries(
    Object.entries(totals).map(([key, value]) => [key, round(value / objects.length)]),
  );
}

function computeFrameMotion(frames) {
  if (frames.length < 2) {
    return 0;
  }

  let totalDifference = 0;
  let totalSamples = 0;

  for (let index = 1; index < frames.length; index += 1) {
    const previous = frames[index - 1];
    const current = frames[index];

    for (let y = 0; y < current.length; y += 1) {
      for (let x = 0; x < current[y].length; x += 1) {
        totalDifference +=
          Math.abs(current[y][x][0] - previous[y][x][0]) +
          Math.abs(current[y][x][1] - previous[y][x][1]) +
          Math.abs(current[y][x][2] - previous[y][x][2]);
        totalSamples += 3;
      }
    }
  }

  const normalizedDifference = totalSamples ? totalDifference / totalSamples : 0;
  return clamp(normalizedDifference / 0.32);
}

function buildFrameTimestamps(durationSeconds) {
  const effectiveDuration = clamp(durationSeconds, 0.8, 5);
  const fractions = [0.14, 0.34, 0.56, 0.78, 0.92];

  return [...new Set(
    fractions.map(fraction =>
      Number(
        Math.min(
          Math.max(effectiveDuration * fraction, 0.05),
          Math.max(effectiveDuration - 0.05, 0.05),
        ).toFixed(3),
      ),
    ),
  )];
}

function mixVideoDimensions(dimensions, motionSignal, durationSeconds) {
  const motionCalm = closeness(motionSignal, 0.18, 0.18);
  const motionEnergy = clamp(motionSignal / 0.3);
  const durationNorm = clamp(durationSeconds / 5);

  return {
    presence: clampScore(
      dimensions.presence + (motionCalm - 0.5) * 8 + durationNorm * 2,
    ),
    depth: clampScore(dimensions.depth + motionEnergy * 5 + durationNorm * 2),
    connection: clampScore(dimensions.connection + (motionCalm - 0.5) * 6),
    atmosphere: clampScore(
      dimensions.atmosphere + motionEnergy * 6 + durationNorm * 3,
    ),
    coherence: clampScore(
      dimensions.coherence + motionCalm * 6 - motionEnergy * 3,
    ),
  };
}

function buildVideoTitle(dimensions, signals, motionPercent) {
  if (dimensions.coherence >= 84 && motionPercent >= 12 && motionPercent <= 42) {
    return 'Held in Motion';
  }
  if (dimensions.atmosphere >= 84) {
    return 'Atmospheric Sequence';
  }
  if (dimensions.depth >= 84) {
    return 'Lived Sequence';
  }
  if (motionPercent >= 48) {
    return 'Moving Tension';
  }

  return pickTitle(dimensions, signals);
}

function buildVideoSummary(dimensions, motionPercent, durationSeconds) {
  const strengths = [];

  if (dimensions.atmosphere >= 82) {
    strengths.push('atmosphere');
  }
  if (dimensions.depth >= 82) {
    strengths.push('temporal depth');
  }
  if (dimensions.coherence >= 82) {
    strengths.push('continuity');
  }
  if (!strengths.length) {
    strengths.push('steady visual residue');
  }

  const motionDetail =
    motionPercent >= 45
      ? 'Motion added urgency and made the clip feel less posed.'
      : 'The clip stayed controlled enough to read like an intentional memory fragment.';

  return `The clip draws its score from ${strengths.slice(0, 2).join(' and ')} across ${round(
    durationSeconds,
  )} seconds. ${motionDetail}`;
}

function buildVideoExplanation(dimensions, signals, motionPercent, frameCount) {
  const baseLines = buildExplanation(dimensions, signals).map(line =>
    line.replace(/image/g, 'clip').replace(/photo/g, 'clip'),
  );

  baseLines.push(
    motionPercent >= 45
      ? `Motion mattered because ${frameCount} sampled frames showed enough change to create pressure instead of a static tableau.`
      : `Motion stayed relatively calm across ${frameCount} sampled frames, which helped the clip read as stable rather than frantic.`,
  );

  return baseLines;
}

function ensureBinary(binaryPath, label) {
  if (!binaryPath) {
    throw new Error(`${label} is not available on this server.`);
  }
}

function runCommand(binaryPath, args) {
  ensureBinary(binaryPath, 'Video analysis tooling');

  return new Promise((resolve, reject) => {
    const child = spawn(binaryPath, args, {
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) {
        resolve({stdout, stderr});
        return;
      }

      reject(
        new Error(
          stderr.trim() || `Video analysis tooling failed with exit code ${code}.`,
        ),
      );
    });
  });
}

async function probeVideo(filePath) {
  const {stdout} = await runCommand(ffprobePath, [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height:format=duration',
    '-of',
    'json',
    filePath,
  ]);

  const payload = JSON.parse(stdout || '{}');
  const stream = (payload.streams && payload.streams[0]) || {};

  return {
    durationSeconds: Number(payload.format && payload.format.duration) || 0,
    width: Number(stream.width) || 0,
    height: Number(stream.height) || 0,
  };
}

async function extractFrame(inputPath, outputPath, timestampSeconds) {
  await runCommand(ffmpegPath, [
    '-y',
    '-ss',
    String(timestampSeconds),
    '-i',
    inputPath,
    '-frames:v',
    '1',
    '-q:v',
    '2',
    outputPath,
  ]);

  return fs.readFile(outputPath);
}

async function analyzeImage(buffer) {
  const pixels = await imageBufferToPixels(buffer);
  return {
    ...analyzePixels(pixels),
    medium: 'image',
  };
}

async function analyzeVideo(buffer) {
  ensureBinary(ffmpegPath, 'ffmpeg');
  ensureBinary(ffprobePath, 'ffprobe');

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'moments-video-'));
  const inputPath = path.join(tempDir, 'clip.mp4');

  try {
    await fs.writeFile(inputPath, buffer);

    const metadata = await probeVideo(inputPath);
    const clipDurationSeconds = clamp(metadata.durationSeconds || 0, 0.8, 5);
    const timestamps = buildFrameTimestamps(clipDurationSeconds);

    const pixelFrames = [];
    const frameAnalyses = [];

    for (let index = 0; index < timestamps.length; index += 1) {
      const framePath = path.join(tempDir, `frame-${index}.jpg`);
      const frameBuffer = await extractFrame(inputPath, framePath, timestamps[index]);
      const pixels = await imageBufferToPixels(frameBuffer);
      pixelFrames.push(pixels);
      frameAnalyses.push(analyzePixels(pixels));
    }

    const baseSignals = averageMetricObjects(
      frameAnalyses.map(analysis => analysis.signals),
    );
    const baseDimensions = averageMetricObjects(
      frameAnalyses.map(analysis => analysis.dimensions),
    );
    const motionSignal = computeFrameMotion(pixelFrames);
    const motionPercent = round(motionSignal * 100);
    const dimensions = mixVideoDimensions(
      baseDimensions,
      motionSignal,
      clipDurationSeconds,
    );
    const signals = {
      ...baseSignals,
      motion: motionPercent,
      clipLength: round((clipDurationSeconds / 5) * 100),
    };
    const score = buildOverallScore(dimensions);

    return {
      score,
      tier: pickTier(score),
      title: buildVideoTitle(dimensions, signals, motionPercent),
      summary: buildVideoSummary(dimensions, motionPercent, clipDurationSeconds),
      dimensions,
      signals,
      explanation: buildVideoExplanation(
        dimensions,
        signals,
        motionPercent,
        frameAnalyses.length,
      ),
      medium: 'video',
      clipDurationSeconds: round(clipDurationSeconds),
      frameCount: frameAnalyses.length,
    };
  } finally {
    await fs.rm(tempDir, {recursive: true, force: true}).catch(() => {});
  }
}

module.exports = {
  analyzeImage,
  analyzeVideo,
  featuredLeaderboard,
};
