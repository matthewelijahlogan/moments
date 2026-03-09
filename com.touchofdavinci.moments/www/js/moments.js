const MAX_MOMENTS = 100;
let mediaStream = null;
let initialized = false;

function getPermissionList() {
  const perms = cordova.plugins.permissions;
  return [perms.CAMERA, perms.RECORD_AUDIO];
}

function ensureCordovaReady(callback) {
  if (window.cordova) {
    callback();
    return;
  }
  document.addEventListener("deviceready", callback, { once: true });
}

function requestRequiredPermissions() {
  return new Promise((resolve) => {
    const perms = cordova.plugins.permissions;
    const requiredPermissions = getPermissionList();

    perms.hasPermission(requiredPermissions, (status) => {
      if (status.hasPermission) {
        resolve(true);
        return;
      }

      perms.requestPermissions(requiredPermissions, (requestStatus) => {
        resolve(Boolean(requestStatus.hasPermission));
      }, (error) => {
        console.error("Permission request error:", error);
        resolve(false);
      });
    }, (error) => {
      console.error("Permission check error:", error);
      resolve(false);
    });
  });
}

function initApp() {
  if (initialized) return;
  initialized = true;

  const recordBtn = document.getElementById("recordBtn");
  const playBtn = document.getElementById("playBtn");

  if (!recordBtn || !playBtn) {
    console.warn("Capture controls not found.");
    return;
  }

  recordBtn.addEventListener("click", async () => {
    const allowed = await requestRequiredPermissions();
    if (!allowed) {
      alert("Camera and microphone permissions are required.");
      return;
    }

    await startCameraPreview();
    startRecording();
  });

  playBtn.addEventListener("click", () => {
    window.location.href = "gallery.html";
  });

  window.addEventListener("beforeunload", stopPreview);
}

async function startCameraPreview() {
  const videoEl = document.getElementById("momentPreview");
  if (!videoEl || mediaStream) return;

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    videoEl.srcObject = mediaStream;
  } catch (err) {
    console.error("Camera preview error:", err);
  }
}

function stopPreview() {
  if (!mediaStream) return;
  mediaStream.getTracks().forEach((track) => track.stop());
  mediaStream = null;
}

function startRecording() {
  if (!navigator.device?.capture?.captureVideo) {
    alert("Video capture is not available on this device.");
    return;
  }

  navigator.device.capture.captureVideo(
    (mediaFiles) => {
      const captured = mediaFiles?.[0];
      if (!captured?.fullPath) {
        alert("Capture did not return a valid file.");
        return;
      }

      window.resolveLocalFileSystemURL(
        captured.fullPath,
        (fileEntry) => fileEntry.file((file) => {
          const reader = new FileReader();
          reader.onloadend = function onLoadEnd() {
            const blob = new Blob([new Uint8Array(this.result)], {
              type: file.type || "video/mp4"
            });
            showSavePrompt(blob, file.name || `moment_${Date.now()}.mp4`);
          };
          reader.readAsArrayBuffer(file);
        }),
        (err) => {
          console.error("File resolve error:", err);
          alert("Could not read captured video.");
        }
      );
    },
    (error) => {
      console.error("Video capture failed:", error);
    },
    { limit: 1, duration: 5 }
  );
}

function showSavePrompt(blob, sourceName) {
  const prompt = document.getElementById("savePrompt");
  if (!prompt) return;

  prompt.style.display = "block";

  const saveBtn = document.getElementById("saveBtn");
  const discardBtn = document.getElementById("discardBtn");

  saveBtn.onclick = () => {
    saveMoment(blob, sourceName);
    prompt.style.display = "none";
  };

  discardBtn.onclick = () => {
    prompt.style.display = "none";
  };
}

function saveMoment(blob, sourceName) {
  const extension = sourceName.includes(".") ? sourceName.split(".").pop() : "mp4";
  const filename = `moment_${Date.now()}.${extension}`;

  window.resolveLocalFileSystemURL(
    cordova.file.dataDirectory,
    (dirEntry) => {
      dirEntry.getFile(
        filename,
        { create: true, exclusive: false },
        (fileEntry) => {
          fileEntry.createWriter((writer) => {
            writer.onwriteend = () => {
              const moments = JSON.parse(localStorage.getItem("moments") || "[]");
              moments.unshift({ filename, score: null, createdAt: Date.now() });
              localStorage.setItem("moments", JSON.stringify(moments.slice(0, MAX_MOMENTS)));
              alert("Moment saved.");
            };
            writer.onerror = (err) => console.error("Write failed:", err);
            writer.write(blob);
          }, (err) => console.error("Writer creation failed:", err));
        },
        (err) => {
          console.error("Unable to create file:", err);
          alert("Save failed.");
        }
      );
    },
    (err) => {
      console.error("Unable to open data directory:", err);
      alert("Save failed.");
    }
  );
}

document.addEventListener("DOMContentLoaded", () => {
  ensureCordovaReady(initApp);
});