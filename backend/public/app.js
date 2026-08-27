const $ = selector => document.querySelector(selector);
const camera = $('#camera');
const playback = $('#playback');
const recordButton = $('#recordButton');
const reviewButton = $('#reviewScoreButton');
const recordAgainButton = $('#recordAgainButton');
const recordActions = $('#recordActions');
const reflection = $('#inlineResult');
const recordingLight = $('#recordingLight');
const counter = $('#counter');
const status = $('#tapeStatus');
const emptyCamera = $('#cameraEmpty');
const username = $('#username');
const savedMoments = $('#savedMoments');
const leaderboard = $('#leaderboard');
const toast = $('#toast');
const promptText = $('#promptText');
const authStatus = $('#authStatus');
const googleSignIn = $('#googleSignIn');
const appleSignIn = $('#appleSignIn');
const signOutButton = $('#signOut');

const prompts = [
  'What feels ordinary now, but won’t forever?',
  'Who or what made today softer?',
  'What would you want to hear again?',
  'What is quietly changing?',
  'What made you stop for a second?',
];
let promptIndex = 0;
let stream, recorder, recordedBlob, result, timer, startedAt, toastTimer, authClient, authSession;
let chunks = [];
let library = JSON.parse(localStorage.getItem('moments.library') || '[]');
username.value = localStorage.getItem('moments.username') || '';

function openLibraryStore() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error('Device storage is unavailable.'));
    const request = indexedDB.open('moments-library', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('moments', {keyPath:'id'});
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function loadDeviceLibrary() {
  try {
    const database = await openLibraryStore();
    const records = await new Promise((resolve, reject) => {
      const request = database.transaction('moments').objectStore('moments').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (records.length) library = records.sort((a,b) => new Date(b.savedAt) - new Date(a.savedAt));
    renderLibrary();
  } catch { /* localStorage remains a useful metadata-only fallback. */ }
}
async function storeDeviceMoment(moment) {
  const database = await openLibraryStore();
  await new Promise((resolve, reject) => {
    const request = database.transaction('moments', 'readwrite').objectStore('moments').put({...moment, clip:recordedBlob});
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
  });
}

function showToast(message) { clearTimeout(toastTimer); toast.textContent = message; toast.classList.add('show'); toastTimer = setTimeout(() => toast.classList.remove('show'), 3800); }
function escapeHtml(value) { return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }
function stopCamera() { stream?.getTracks().forEach(track => track.stop()); stream = null; camera.srcObject = null; }
async function ensureCamera() {
  if (stream?.active) return stream;
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser cannot access a camera. Try a current version of Safari or Chrome.');
  stream = await navigator.mediaDevices.getUserMedia({audio:true, video:{facingMode:'environment'}});
  camera.srcObject = stream; camera.hidden = false; emptyCamera.hidden = true; return stream;
}
function showView(target) {
  document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.dataset.view === target));
  document.querySelectorAll('[data-target]').forEach(button => button.classList.toggle('active', button.dataset.target === target));
  if (target === 'capture' && !recordedBlob) ensureCamera().catch(error => { emptyCamera.hidden = false; showToast(error.message); });
  if (target !== 'capture') stopCamera();
  if (target === 'library') renderLibrary();
  if (target === 'scores') loadLeaderboard();
  window.scrollTo({top:0, behavior:'smooth'});
}
document.querySelectorAll('[data-target]').forEach(button => button.addEventListener('click', () => showView(button.dataset.target)));
$('#newPrompt').addEventListener('click', () => { promptIndex = (promptIndex + 1) % prompts.length; promptText.textContent = prompts[promptIndex]; });
username.addEventListener('change', () => { username.value = username.value.trim(); localStorage.setItem('moments.username', username.value); });

function supportedMimeType() { return ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm','video/mp4'].find(type => MediaRecorder.isTypeSupported(type)) || ''; }
function updateCounter() { const elapsed = Math.min((Date.now()-startedAt)/1000,5); counter.textContent = `0:0${Math.floor(elapsed)}`; if (elapsed >= 5 && recorder?.state === 'recording') recorder.stop(); }
function resetRecorder() {
  clearInterval(timer); if (playback.src) URL.revokeObjectURL(playback.src);
  recordedBlob = null; result = null; playback.removeAttribute('src'); playback.hidden = true; camera.hidden = false; reflection.hidden = true; reflection.innerHTML = ''; recordButton.hidden = false; recordButton.classList.remove('recording'); recordButton.setAttribute('aria-label','Start recording'); recordActions.hidden = true; reviewButton.hidden = false; status.textContent = 'Ready when you are · 3–5 seconds'; counter.textContent = '0:00';
}
async function startRecording() {
  if (!window.MediaRecorder) throw new Error('This browser cannot record video. Try a current version of Safari or Chrome.');
  const activeStream = await ensureCamera(); resetRecorder(); chunks = [];
  const type = supportedMimeType(); recorder = new MediaRecorder(activeStream, type ? {mimeType:type} : undefined);
  recorder.addEventListener('dataavailable', event => { if (event.data.size) chunks.push(event.data); });
  recorder.addEventListener('stop', finishRecording, {once:true}); recorder.start(250); startedAt = Date.now(); timer = setInterval(updateCounter,100);
  recordButton.classList.add('recording'); recordButton.setAttribute('aria-label','Stop recording'); $('#recordLabel').textContent = 'Stop recording'; recordingLight.hidden = false; status.textContent = 'Hold onto the scene for at least three seconds';
}
function stopRecording() { if ((Date.now()-startedAt)/1000 < 3) { showToast('Give it another moment—clips need to be at least three seconds.'); return; } recorder.stop(); }
async function finishRecording() {
  clearInterval(timer); recordedBlob = new Blob(chunks,{type:recorder.mimeType || 'video/webm'}); stopCamera(); playback.src = URL.createObjectURL(recordedBlob); playback.hidden = false; camera.hidden = true; recordButton.hidden = true; recordingLight.hidden = true; recordActions.hidden = false; status.textContent = 'Take a look. Keep it only if it feels like yours.'; await playback.play().catch(() => {});
}
recordButton.addEventListener('click', () => (recorder?.state === 'recording' ? stopRecording() : startRecording()).catch(error => showToast(error.message)));
recordAgainButton.addEventListener('click', async () => { resetRecorder(); try { await ensureCamera(); } catch(error) { showToast(error.message); } });

function renderReflection(moment) {
  const dimensions = Object.entries(moment.dimensions || {}).map(([label,value]) => `<span>${escapeHtml(label)} ${Number(value).toFixed(0)}</span>`).join('');
  const notes = (moment.explanation || []).map(line => `<li>${escapeHtml(line)}</li>`).join('');
  reflection.innerHTML = `<p class="kicker">Meaning grade · ${Number(moment.clipDurationSeconds || 0).toFixed(1)} seconds</p><div class="grade-line"><h1>${escapeHtml(moment.title)}</h1><strong>${Number(moment.score).toFixed(1)}</strong></div><p>${escapeHtml(moment.summary)}</p><div class="dimensions">${dimensions}</div><ul>${notes}</ul><div class="review-actions"><button class="button primary-action" id="saveMoment" type="button">Keep this moment</button><button class="button secondary-action" id="closeReflection" type="button">Back to clip</button></div>`;
  reflection.hidden = false;
  $('#closeReflection').addEventListener('click', () => { reflection.hidden = true; });
  $('#saveMoment').addEventListener('click', saveMoment);
}
async function scoreRecording() {
  if (!recordedBlob) return; reviewButton.disabled = recordAgainButton.disabled = true; reviewButton.textContent = 'Grading…'; status.textContent = 'Reading the visible story in these frames…';
  try { const form = new FormData(); form.append('file',recordedBlob,`moment-${Date.now()}.webm`); form.append('username',username.value || 'Anonymous'); const response = await fetch('/score-video',{method:'POST',body:form}); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || 'We could not reflect on that clip.'); result = payload; renderReflection(payload); status.textContent = 'Your reflection is ready.'; reviewButton.hidden = true; }
  catch(error) { status.textContent = 'Reflection unavailable—your clip is still here.'; showToast(error.message); }
  finally { reviewButton.disabled = recordAgainButton.disabled = false; reviewButton.textContent = 'Get its grade'; }
}
reviewButton.addEventListener('click', scoreRecording);
function renderLibrary() {
  if (!library.length) { savedMoments.innerHTML = '<div class="empty-state"><span>⌁</span><h2>Nothing saved yet.</h2><p>Make a short clip, reflect on it, and keep the ones that matter.</p><button class="text-button" data-target="capture" type="button">Capture your first moment</button></div>'; savedMoments.querySelector('[data-target]').addEventListener('click', () => showView('capture')); return; }
  savedMoments.innerHTML = library.map(moment => `<article class="saved-card"><p class="score">${escapeHtml(moment.tier || 'Saved moment')} · ${new Date(moment.savedAt).toLocaleDateString()}</p><h2>${escapeHtml(moment.title || 'Untitled moment')}</h2><p>${escapeHtml(moment.summary || 'A moment worth returning to.')}</p></article>`).join('');
}
async function loadLeaderboard() {
  if (!leaderboard) return;
  leaderboard.innerHTML = '<div class="empty-state"><span>✦</span><h2>Loading the board…</h2></div>';
  try {
    const response = await fetch('/leaderboard');
    const payload = await response.json();
    const entries = Array.isArray(payload) ? payload : payload.entries || [];
    leaderboard.innerHTML = entries.length ? entries.map((entry, index) => `<article class="saved-card leaderboard-card"><p class="score">#${index + 1} · ${escapeHtml(entry.username)}</p><div class="grade-line"><h2>${escapeHtml(entry.title)}</h2><strong>${Number(entry.score).toFixed(1)}</strong></div><p>${escapeHtml(entry.summary || 'A moment held in a few frames.')}</p></article>`).join('') : '<div class="empty-state"><span>✦</span><h2>The board is quiet.</h2><p>Be the first to add a graded moment.</p></div>';
  } catch {
    leaderboard.innerHTML = '<div class="empty-state"><span>✦</span><h2>The board is resting.</h2><p>Your camera and private library still work.</p></div>';
  }
}
async function saveMoment() {
  if (!result) return;
  const saved = {id:`moment-${Date.now()}`,title:result.title,summary:result.summary,tier:result.tier,savedAt:new Date().toISOString()};
  library.unshift(saved); library = library.slice(0,100); localStorage.setItem('moments.library',JSON.stringify(library));
  storeDeviceMoment(saved).catch(() => showToast('Saved in your library. Your browser could not keep the video file.'));
  const saveButton = $('#saveMoment'); if (saveButton) { saveButton.textContent = 'Saved to your library'; saveButton.disabled = true; }
  showToast('Saved to your library on this device.');
  if (authSession?.access_token && recordedBlob) {
    try { const form = new FormData(); form.append('file',recordedBlob,`moment-${Date.now()}.webm`); form.append('username',username.value || 'Anonymous'); await fetch('/moments',{method:'POST',headers:{Authorization:`Bearer ${authSession.access_token}`},body:form}); } catch { showToast('Saved here. Private backup will retry next time.'); }
  }
}
function renderAuth(session) { authSession=session; const user=session?.user; authStatus.textContent=user ? `Signed in as ${user.email || user.user_metadata?.name || 'a member'}. New saved moments are backed up privately.` : 'Sign in to back up new saved moments privately.'; googleSignIn.hidden=Boolean(user); appleSignIn.hidden=Boolean(user); signOutButton.hidden=!user; }
async function initAuth() { try { const response=await fetch('/auth-config'); const config=await response.json(); if(!config.enabled || !window.supabase) throw new Error('Private backup is not set up yet.'); authClient=window.supabase.createClient(config.supabaseUrl,config.publishableKey); googleSignIn.disabled=!config.providers.includes('google'); appleSignIn.disabled=!config.providers.includes('apple'); const {data}=await authClient.auth.getSession(); renderAuth(data.session); authClient.auth.onAuthStateChange((_event,session) => renderAuth(session)); } catch(error) { authStatus.textContent='Private backup is not available yet. Your device library still works.'; googleSignIn.disabled=appleSignIn.disabled=true; } }
async function beginOAuth(provider) { if(!authClient) return showToast('Private backup is not available yet.'); const {error}=await authClient.auth.signInWithOAuth({provider,options:{redirectTo:window.location.origin}}); if(error) showToast(error.message); }
googleSignIn.addEventListener('click',() => beginOAuth('google')); appleSignIn.addEventListener('click',() => beginOAuth('apple')); signOutButton.addEventListener('click',async () => { const {error}=await authClient.auth.signOut(); if(error) showToast(error.message); });
window.addEventListener('beforeunload',stopCamera); if('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js').catch(() => {}); renderLibrary(); loadDeviceLibrary(); initAuth(); setTimeout(() => ensureCamera().catch(() => { emptyCamera.hidden=false; }),400);
