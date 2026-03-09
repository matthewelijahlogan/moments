function shareCurrentMoment() {
  const video = document.getElementById("viewer");
  const scoreText = document.getElementById("viewerScore")?.textContent || "";

  if (!navigator.share) {
    alert("Share is not supported on this device.");
    return;
  }

  navigator.share({
    title: "My Moment",
    text: scoreText || "Check out this moment",
    url: video?.currentSrc || location.href
  }).catch((err) => {
    console.warn("Share dismissed or failed:", err.message);
  });
}

export function openMomentViewer(momentSrc, { title = "Untitled Moment", score = null } = {}) {
  const existing = document.getElementById("moment-viewer-overlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "moment-viewer-overlay";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;flex-direction:column;justify-content:center;align-items:center;padding:1rem;z-index:9999;";

  const titleEl = document.createElement("h2");
  titleEl.innerText = title;
  titleEl.style.color = "white";
  overlay.appendChild(titleEl);

  const video = document.createElement("video");
  video.src = momentSrc;
  video.controls = true;
  video.autoplay = true;
  video.style.cssText = "max-width:90vw;max-height:60vh;border:8px solid #ffcc00;border-radius:20px;";
  overlay.appendChild(video);

  if (score !== null) {
    const scoreEl = document.createElement("div");
    scoreEl.innerText = `Score: ${parseFloat(score).toFixed(3)}`;
    scoreEl.style.cssText = "margin:1rem;font-size:1.25rem;color:#ffcc00;";
    overlay.appendChild(scoreEl);
  }

  const btns = document.createElement("div");
  btns.style.marginTop = "1rem";

  const closeBtn = document.createElement("button");
  closeBtn.innerText = "Close";
  closeBtn.style.cssText = "margin:0 .5rem;padding:.5rem 1rem;background:#ffcc00;border:none;border-radius:10px;";
  closeBtn.onclick = () => overlay.remove();

  const shareBtn = document.createElement("button");
  shareBtn.innerText = "Share";
  shareBtn.style.cssText = "margin:0 .5rem;padding:.5rem 1rem;background:#ffcc00;border:none;border-radius:10px;";
  shareBtn.onclick = shareCurrentMoment;

  btns.appendChild(closeBtn);
  btns.appendChild(shareBtn);
  overlay.appendChild(btns);

  document.body.appendChild(overlay);
}

function initMomentViewerPage() {
  if (!document.getElementById("viewer")) return;

  const params = new URLSearchParams(location.search);
  const filename = params.get("file");
  const score = params.get("score");

  if (filename && window.cordova?.file?.dataDirectory) {
    const viewer = document.getElementById("viewer");
    viewer.src = cordova.file.dataDirectory + filename;
  }

  if (score) {
    const scoreEl = document.getElementById("viewerScore");
    if (scoreEl) scoreEl.textContent = `Score: ${score}`;
  }
}

window.shareMoment = shareCurrentMoment;
document.addEventListener("deviceready", initMomentViewerPage, { once: true });
document.addEventListener("DOMContentLoaded", initMomentViewerPage, { once: true });