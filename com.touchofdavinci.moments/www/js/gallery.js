function getStoredMoments() {
  return JSON.parse(localStorage.getItem("moments") || "[]");
}

function buildGallery() {
  const galleryContainer = document.getElementById("galleryContainer");
  if (!galleryContainer) return;

  const moments = getStoredMoments();

  moments.forEach((moment) => {
    const thumb = document.createElement("div");
    thumb.className = "thumbnail";

    const video = document.createElement("video");
    if (window.cordova?.file?.dataDirectory) {
      video.src = cordova.file.dataDirectory + moment.filename;
    }
    video.width = 160;
    video.height = 120;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.loop = true;
    video.preload = "metadata";

    const badge = document.createElement("div");
    badge.className = "gradeBadge";
    badge.textContent = moment.score == null ? "-" : Number(moment.score).toFixed(1);

    thumb.addEventListener("click", () => {
      location.href = `../pages/analyze.html?file=${encodeURIComponent(moment.filename)}`;
    });

    thumb.appendChild(video);
    thumb.appendChild(badge);
    galleryContainer.appendChild(thumb);
  });
}

document.addEventListener("deviceready", buildGallery, { once: true });
document.addEventListener("DOMContentLoaded", buildGallery, { once: true });