let initialized = false;

function getApiBaseUrl() {
  const configured = localStorage.getItem("momentsApiBaseUrl");
  if (!configured) return null;
  return configured.replace(/\/+$/, "");
}

function calculateFallbackScore(videoEl) {
  const duration = Number.isFinite(videoEl.duration) ? videoEl.duration : 0;
  const normalized = Math.min(100, Math.max(10, duration * 12));
  return Number(normalized.toFixed(2));
}

function displayScore(score) {
  const el = document.getElementById("lifeScore");
  if (el) el.textContent = `Score: ${Number(score).toFixed(2)}`;
}

function displayDetailedAnalysis(data) {
  const list = document.getElementById("predictionsList");
  if (!list) return;

  list.innerHTML = "";
  Object.entries(data).forEach(([key, value]) => {
    const li = document.createElement("li");
    li.textContent = `${key}: ${value}`;
    list.appendChild(li);
  });
}

function saveScore(filename, score) {
  const moments = JSON.parse(localStorage.getItem("moments") || "[]");
  const idx = moments.findIndex((item) => item.filename === filename);
  if (idx >= 0) {
    moments[idx].score = score;
    localStorage.setItem("moments", JSON.stringify(moments));
  }
}

async function scoreWithApi(filePath, filename) {
  const apiBase = getApiBaseUrl();
  if (!apiBase) return null;

  const fileEntry = await new Promise((resolve, reject) => {
    window.resolveLocalFileSystemURL(filePath, resolve, reject);
  });

  const file = await new Promise((resolve, reject) => {
    fileEntry.file(resolve, reject);
  });

  const formData = new FormData();
  formData.append("file", file, filename);

  const response = await fetch(`${apiBase}/score-image`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Scoring API failed: ${response.status}`);
  }

  return response.json();
}

async function init() {
  if (initialized) return;
  initialized = true;

  const params = new URLSearchParams(location.search);
  const filename = params.get("file");
  if (!filename) {
    console.warn("No file provided in query");
    return;
  }

  const videoEl = document.getElementById("analyzerVideo");
  const hasCordova = Boolean(window.cordova?.file?.dataDirectory);
  if (!videoEl || !hasCordova) {
    console.warn("Cordova file APIs are not available.");
    return;
  }

  const filePath = cordova.file.dataDirectory + filename;
  videoEl.src = filePath;
  videoEl.load();

  try {
    const apiResult = await scoreWithApi(filePath, filename);
    if (apiResult && typeof apiResult.score !== "undefined") {
      displayScore(apiResult.score);
      displayDetailedAnalysis(apiResult);
      saveScore(filename, Number(apiResult.score));
      return;
    }
  } catch (err) {
    console.warn("Falling back to local scoring:", err.message);
  }

  videoEl.addEventListener("loadedmetadata", () => {
    const score = calculateFallbackScore(videoEl);
    displayScore(score);
    displayDetailedAnalysis({
      analysis_mode: "local_fallback",
      duration_seconds: videoEl.duration.toFixed(2)
    });
    saveScore(filename, score);
  }, { once: true });
}

document.addEventListener("deviceready", init, { once: true });
document.addEventListener("DOMContentLoaded", init, { once: true });