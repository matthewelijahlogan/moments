const camera = document.querySelector('#camera');
const playback = document.querySelector('#playback');
const recordButton = document.querySelector('#recordButton');
const reviewScoreButton = document.querySelector('#reviewScoreButton');
const recordLabel = document.querySelector('#recordLabel');
const recordingLight = document.querySelector('#recordingLight');
const counter = document.querySelector('#counter');
const tapeStatus = document.querySelector('#tapeStatus');
const resultCard = document.querySelector('#resultCard');
const archiveButton = document.querySelector('#archiveButton');
const leaderboard = document.querySelector('#leaderboard');
const username = document.querySelector('#username');
const toast = document.querySelector('#toast');
const splash = document.querySelector('#splash');
const authStatus = document.querySelector('#authStatus');
const googleSignIn = document.querySelector('#googleSignIn');
const appleSignIn = document.querySelector('#appleSignIn');
const signOutButton = document.querySelector('#signOut');

let stream;
let recorder;
let chunks = [];
let recordedBlob;
let result;
let startedAt = 0;
let timer;
let toastTimer;
let authClient;
let authSession;

username.value = localStorage.getItem('moments.username') || 'ArchiveKeeper';

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 4200);
}

function stopCamera() {
  stream?.getTracks().forEach(track => track.stop());
  stream = null;
  camera.srcObject = null;
}

function resetRecorder() {
  if (playback.src) {
    URL.revokeObjectURL(playback.src);
  }
  recordedBlob = null;
  result = null;
  playback.removeAttribute('src');
  playback.hidden = true;
  recordButton.hidden = false;
  reviewScoreButton.hidden = true;
  archiveButton.disabled = true;
  archiveButton.textContent = 'ARCHIVE THIS TAPE';
  tapeStatus.textContent = 'TAPE 001 / READY';
}

function showView(target) {
  document
    .querySelectorAll('.view')
    .forEach(view => view.classList.toggle('active', view.dataset.view === target));
  document
    .querySelectorAll('.deck-button')
    .forEach(button =>
      button.classList.toggle('active', button.dataset.target === target),
    );
  if (target === 'record' && !recordedBlob) {
    ensureCamera().catch(error => showToast(error.message));
  } else if (target !== 'record') {
    stopCamera();
  }
}

document.querySelectorAll('.deck-button').forEach(button => {
  button.addEventListener('click', () => {
    if (button.dataset.target === 'record' && result) {
      resetRecorder();
    }
    showView(button.dataset.target);
  });
});

username.addEventListener('change', () => {
  const value = username.value.trim() || 'ArchiveKeeper';
  username.value = value;
  localStorage.setItem('moments.username', value);
});

async function ensureCamera() {
  if (stream && stream.active) {
    return stream;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('This browser does not support camera recording.');
  }

  stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: {facingMode: 'environment'},
  });
  camera.srcObject = stream;
  camera.hidden = false;
  playback.hidden = true;
  return stream;
}

function supportedMimeType() {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  return candidates.find(type => MediaRecorder.isTypeSupported(type)) || '';
}

function updateCounter() {
  const elapsed = Math.min((Date.now() - startedAt) / 1000, 5);
  counter.textContent = `00:0${Math.floor(elapsed)}`;
  if (elapsed >= 5 && recorder?.state === 'recording') {
    recorder.stop();
  }
}

async function startRecording() {
  if (!window.MediaRecorder) {
    throw new Error('This browser cannot record video. Try Safari or Chrome.');
  }
  const activeStream = await ensureCamera();
  resetRecorder();
  chunks = [];
  const mimeType = supportedMimeType();
  recorder = new MediaRecorder(activeStream, mimeType ? {mimeType} : undefined);
  recorder.addEventListener('dataavailable', event => {
    if (event.data.size) {
      chunks.push(event.data);
    }
  });
  recorder.addEventListener('stop', finishRecording, {once: true});
  recorder.start(250);
  startedAt = Date.now();
  recordButton.classList.add('recording');
  recordingLight.classList.add('on');
  recordLabel.textContent = 'HOLD THE MOMENT';
  tapeStatus.textContent = 'TAPE 001 / RECORDING';
  timer = setInterval(updateCounter, 100);
}

function stopRecording() {
  const elapsed = (Date.now() - startedAt) / 1000;
  if (elapsed < 3) {
    showToast('Keep rolling for at least three seconds.');
    return;
  }
  recorder.stop();
}

async function finishRecording() {
  clearInterval(timer);
  recordButton.classList.remove('recording');
  recordingLight.classList.remove('on');
  recordedBlob = new Blob(chunks, {type: recorder.mimeType || 'video/webm'});
  stopCamera();

  playback.src = URL.createObjectURL(recordedBlob);
  playback.hidden = false;
  camera.hidden = true;
  recordButton.hidden = true;
  reviewScoreButton.hidden = false;
  tapeStatus.textContent = 'TAPE 001 / PLAY IT BACK';
  counter.textContent = '00:00';
  await playback.play().catch(() => {});
}

async function scoreRecording() {
  if (!recordedBlob) {
    return;
  }
  reviewScoreButton.disabled = true;
  reviewScoreButton.textContent = 'REWINDING THROUGH THE MEANING…';
  tapeStatus.textContent = 'TAPE 001 / SCORING';

  try {
    const form = new FormData();
    form.append('file', recordedBlob, `moment-${Date.now()}.webm`);
    form.append('username', username.value.trim() || 'ArchiveKeeper');
    const response = await fetch('/score-video', {method: 'POST', body: form});
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || `Scoring failed (${response.status}).`);
    }
    result = payload;
    renderResult(payload);
    archiveButton.disabled = false;
    tapeStatus.textContent = `${payload.title.toUpperCase()} / ${Number(
      payload.score,
    ).toFixed(1)}`;
    reviewScoreButton.hidden = true;
    showView('tapes');
  } catch (error) {
    showToast(error.message);
    tapeStatus.textContent = 'TAPE 001 / TRY AGAIN';
  } finally {
    reviewScoreButton.disabled = false;
    reviewScoreButton.textContent = 'BE KIND, REWIND & SCORE';
  }
}

recordButton.addEventListener('click', async () => {
  try {
    if (recorder?.state === 'recording') {
      stopRecording();
    } else {
      await startRecording();
    }
  } catch (error) {
    showToast(error.message);
  }
});
reviewScoreButton.addEventListener('click', scoreRecording);

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderResult(moment) {
  const dimensions = Object.entries(moment.dimensions || {})
    .map(
      ([label, value]) =>
        `<span>${escapeHtml(label)} ${Number(value).toFixed(1)}</span>`,
    )
    .join('');
  const reasons = (moment.explanation || [])
    .map(line => `<li>${escapeHtml(line)}</li>`)
    .join('');
  resultCard.innerHTML = `
    <p class="eyebrow">${escapeHtml(moment.tier)} · ${Number(
      moment.clipDurationSeconds,
    ).toFixed(1)}S TAPE</p>
    <h1>${escapeHtml(moment.title)} — ${Number(moment.score).toFixed(1)}</h1>
    <p>${escapeHtml(moment.summary)}</p>
    <div class="dimensions">${dimensions}</div>
    <ul>${reasons}</ul>
  `;
}

archiveButton.addEventListener('click', async () => {
  if (!recordedBlob || !result) {
    return;
  }
  if (!authSession?.access_token) {
    showView('settings');
    showToast('Sign in before saving this tape to the shared archive.');
    return;
  }

  archiveButton.disabled = true;
  archiveButton.textContent = 'ARCHIVING…';
  try {
    const form = new FormData();
    form.append('file', recordedBlob, `moment-${Date.now()}.webm`);
    form.append('username', username.value.trim() || 'ArchiveKeeper');
    const response = await fetch('/moments', {
      method: 'POST',
      headers: {Authorization: `Bearer ${authSession.access_token}`},
      body: form,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || `Archive failed (${response.status}).`);
    }
    archiveButton.textContent = 'SAVED TO ARCHIVE';
    tapeStatus.textContent = `${result.title.toUpperCase()} / ARCHIVED`;
    await loadLeaderboard();
  } catch (error) {
    archiveButton.disabled = false;
    archiveButton.textContent = 'ARCHIVE THIS TAPE';
    showToast(error.message);
  }
});

async function loadLeaderboard() {
  try {
    const response = await fetch('/leaderboard');
    const payload = await response.json();
    const entries = Array.isArray(payload) ? payload : payload.entries || [];
    leaderboard.innerHTML = entries
      .map(
        (entry, index) => `
          <article>
            <p class="eyebrow">TAPE ${String(index + 1).padStart(3, '0')} · ${escapeHtml(
              entry.username,
            )}</p>
            <h2>${escapeHtml(entry.title)} — ${Number(entry.score).toFixed(1)}</h2>
            <p>${escapeHtml(entry.summary || '')}</p>
          </article>
        `,
      )
      .join('');
  } catch {
    leaderboard.innerHTML =
      '<p>The community deck is temporarily unavailable. Your recorder still works.</p>';
  }
}

function renderAuth(session) {
  authSession = session;
  const user = session?.user;
  authStatus.textContent = user
    ? `SIGNED IN / ${user.email || user.user_metadata?.name || 'TAPE KEEPER'}`
    : 'Sign in to own tapes across phone and web.';
  googleSignIn.hidden = Boolean(user);
  appleSignIn.hidden = Boolean(user);
  signOutButton.hidden = !user;
}

async function initAuth() {
  try {
    const response = await fetch('/auth-config');
    const config = await response.json();
    if (!config.enabled || !window.supabase) {
      throw new Error('OAuth provider setup is not finished yet.');
    }
    authClient = window.supabase.createClient(
      config.supabaseUrl,
      config.publishableKey,
    );
    googleSignIn.disabled = !config.providers.includes('google');
    appleSignIn.disabled = !config.providers.includes('apple');
    if (!config.providers.length) {
      authStatus.textContent =
        'OAuth wiring is ready; Google or Apple client credentials still need to be enabled in Supabase.';
    }
    const {data} = await authClient.auth.getSession();
    if (data.session || config.providers.length) {
      renderAuth(data.session);
    }
    authClient.auth.onAuthStateChange((_event, session) => renderAuth(session));
  } catch (error) {
    authStatus.textContent = error.message;
    googleSignIn.disabled = true;
    appleSignIn.disabled = true;
  }
}

async function beginOAuth(provider) {
  if (!authClient) {
    showToast('OAuth provider setup is not finished yet.');
    return;
  }
  const {error} = await authClient.auth.signInWithOAuth({
    provider,
    options: {redirectTo: window.location.origin},
  });
  if (error) {
    showToast(error.message);
  }
}

googleSignIn.addEventListener('click', () => beginOAuth('google'));
appleSignIn.addEventListener('click', () => beginOAuth('apple'));
signOutButton.addEventListener('click', async () => {
  const {error} = await authClient.auth.signOut();
  if (error) {
    showToast(error.message);
  }
});

window.addEventListener('beforeunload', stopCamera);
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').catch(() => {});
}

setTimeout(() => {
  splash.classList.add('hide');
  setTimeout(() => splash.remove(), 320);
}, 1500);

loadLeaderboard();
initAuth();
setTimeout(
  () => ensureCamera().catch(error => showToast(error.message)),
  1600,
);
