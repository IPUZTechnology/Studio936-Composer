// Studio 936 — Grabador de Pistas por Sección (Cambio 251)
// Cambio 506: getCurrentSectionKey() nunca devuelve "__song__".
(function () {
  'use strict';

  const META_KEY = 's936_section_tracks_v1';
  const S936_API_BASE = 'https://studio936-escenario-api.ripuz.workers.dev';
  const BACKING_CHANNELS = ['drums', 'bass', 'chord', 'solo', 'piano', 'organ', 'ukulele', 'sax', 'violin', 'trumpet', 'cello', 'banjo'];
  let muteBackingWhileRec = true;
  let mutedChannelsBeforeRec = null;
  const INSTRUMENTS = [
    { id: 'voz', label: 'Voz' },
    { id: 'guitarra', label: 'Guitarra' },
    { id: 'piano', label: 'Piano' },
    { id: 'bateria', label: 'Batería' },
    { id: 'tecladomidi', label: 'MIDI' },
    { id: 'setelectronico', label: 'Electro' },
    { id: 'otro', label: 'Otro instrumento' }
  ];

  let panelEl = null;
  let mediaStream = null;
  let mediaRecorder = null;
  let recordedChunks = [];
  let recordStartedAt = null;
  // Owner: "un canal se graba donde se necesite... si pasa de sección a
  // sección debe empalmar" -- posición absoluta (en segundos de LA
  // CANCIÓN completa, no de la sección) donde arrancó ESTA grabación.
  // Se captura en startRecording() y se usa al guardar para partir el
  // audio en pedazos exactos por sección (ver saveTake()/splitRecordingBySections()).
  let recordStartSongSec = 0;

  function getPlaybackAudioCtx() { return window.__studio936AudioCtx || null; }
  const decodedBuffersById = {};
  const instrumentAudioNodes = {};
  let recordAnchorCtxTime = null;
  let recordTimerHandle = null;
  let recordSeconds = 0;
  let currentInstrument = 'voz';
  const objectUrlsById = {};

  function getMainAudioCtx() { return window.__studio936AudioCtx || null; }

  function getCurrentSectionKey() {
    // Intento 1: el Bridge real (app.js)
    try {
      const real = window.Studio936AppBridge?.getCurrentSectionKeyReal?.();
      if (real && real !== '__song__') return real;
    } catch (_) {}
    // Intento 2: el <select>, si NO está en "Canción completa"
    try {
      const sel = document.getElementById('sectionSelect');
      if (sel && sel.value && sel.value !== '__song__') return sel.value;
    } catch (_) {}
    // Intento 3: primera sección con acordes reales
    try {
      const song = window.currentSong || window.song || null;
      if (song && song.sections) {
        const keys = Object.keys(song.sections);
        const withChords = keys.find(k => Array.isArray(song.sections[k]?.chords) && song.sections[k].chords.length > 0);
        if (withChords) return withChords;
        if (keys.length) return keys[0];
      }
    } catch (_) {}
    // Intento 4: cualquier opción del select que no sea "__song__"
    try {
      const opt = document.querySelector('#sectionSelect option[value]:not([value="__song__"])');
      if (opt && opt.value) return opt.value;
    } catch (_) {}
    return null;
  }

  function getCurrentSectionLabel() {
    try {
      const sel = document.getElementById('sectionSelect');
      const opt = sel && sel.options[sel.selectedIndex];
      if (opt && opt.textContent) return opt.textContent.trim();
    } catch (_) {}
    return 'Sección actual';
  }

  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }
  function uid() { return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function toast(msg) {
    try { if (window.s936CloudToast) { window.s936CloudToast(msg, true); return; } } catch (_) {}
    console.log('[Track Recorder]', msg);
  }

  function readMetaStore() { try { return JSON.parse(localStorage.getItem(META_KEY) || '{}'); } catch (_) { return {}; } }
  function writeMetaStore(store) { try { localStorage.setItem(META_KEY, JSON.stringify(store)); } catch (_) {} }
  function listTakesForSection(sectionKey) { const store = readMetaStore(); return store[sectionKey] || []; }
  function saveTakeMeta(sectionKey, take) {
    const store = readMetaStore();
    if (!store[sectionKey]) store[sectionKey] = [];
    store[sectionKey].push(take);
    writeMetaStore(store);
  }
  function deleteTakeMeta(sectionKey, takeId) {
    const store = readMetaStore();
    if (!store[sectionKey]) return;
    store[sectionKey] = store[sectionKey].filter(t => t.id !== takeId);
    writeMetaStore(store);
  }

  function getCurrentPlaybackSection(){ return currentPlaybackSection; }
  function listRecordedInstruments(sectionKey){
    try { return Object.keys(groupTakesByInstrument(sectionKey || currentPlaybackSection || '')); }
    catch(_) { return []; }
  }
  function getLaneStateExternal(sectionKey, instrumentId){
    try { const s = getLaneState(sectionKey, instrumentId); return { muted:!!s.muted, solo:!!s.solo, pan:s.pan||0, volume:s.volume!=null?s.volume:0.8 }; }
    catch(_) { return { muted:false, solo:false, pan:0, volume:0.8 }; }
  }
  function setLaneVolume(sectionKey, instrumentId, value){
    try { getLaneState(sectionKey, instrumentId).volume = Math.max(0, Math.min(1, Number(value))); refreshLivePlaybackGains(sectionKey); return true; } catch(_) { return false; }
  }
  function setLaneMute(sectionKey, instrumentId, muted){
    try { getLaneState(sectionKey, instrumentId).muted = !!muted; refreshLivePlaybackGains(sectionKey); return true; } catch(_) { return false; }
  }
  function setLanePan(sectionKey, instrumentId, value){
    try { getLaneState(sectionKey, instrumentId).pan = Math.max(-1, Math.min(1, Number(value))); refreshLivePlaybackGains(sectionKey); return true; } catch(_) { return false; }
  }

  const RESERVED_KEY = 's936_suitepro_reserved_lanes_v1';
  function readReservedStore() { try { return JSON.parse(localStorage.getItem(RESERVED_KEY) || '{}'); } catch (_) { return {}; } }
  function writeReservedStore(store) { try { localStorage.setItem(RESERVED_KEY, JSON.stringify(store)); } catch (_) {} }
  function reserveInstrumentLane(sectionKey, instrumentId) {
    const store = readReservedStore();
    if (!store[sectionKey]) store[sectionKey] = [];
    if (!store[sectionKey].includes(instrumentId)) store[sectionKey].push(instrumentId);
    writeReservedStore(store);
  }
  function listReservedInstruments(sectionKey) { const store = readReservedStore(); return store[sectionKey] || []; }

  function updateTakeClips(sectionKey, takeId, clips) {
    const store = readMetaStore();
    const list = store[sectionKey];
    if (!list) return;
    const take = list.find(t => t.id === takeId);
    if (!take) return;
    take.clips = clips;
    writeMetaStore(store);
  }
  function getEffectiveClips(take) {
    if (Array.isArray(take.clips) && take.clips.length) return take.clips;
    return [{ id: 'full', startSec: 0, endSec: Number(take.durationSec) || 0, deleted: false }];
  }
  function splitClipsAt(clips, cutSec) {
    const result = [];
    clips.forEach(clip => {
      if (cutSec > clip.startSec + 0.05 && cutSec < clip.endSec - 0.05) {
        result.push({ id: uid(), startSec: clip.startSec, endSec: cutSec, deleted: clip.deleted });
        result.push({ id: uid(), startSec: cutSec, endSec: clip.endSec, deleted: clip.deleted });
      } else { result.push(clip); }
    });
    return result.sort((a, b) => a.startSec - b.startSec);
  }

  // Owner: "un canal se graba donde se necesite... si pasa de sección a
  // sección debe empalmar" -- una grabación larga (que cruza de una
  // sección a la siguiente) se guarda como VARIAS tomas independientes,
  // una por sección real, cada una recortada del audio original con
  // AudioBuffer (sample-accurate) y re-codificada a WAV -- así cada
  // pedazo es un archivo normal y corriente, compatible con TODO lo que
  // ya existe (reproducción, tijera/editor, descarga, nube) sin tocar
  // ese código. No se usa MediaRecorder por pedazo (cortaría con un
  // click audible) -- se graba UNA sola toma continua de punta a punta
  // y se corta en software, en el sample exacto del límite real de
  // cada sección, así el empalme queda sin hueco ni corte.
  function sliceAudioBuffer(ctx, buffer, startSec, endSec) {
    const sampleRate = buffer.sampleRate;
    const startSample = Math.max(0, Math.floor(startSec * sampleRate));
    const endSample = Math.min(buffer.length, Math.ceil(endSec * sampleRate));
    const frameCount = Math.max(1, endSample - startSample);
    const sliced = ctx.createBuffer(buffer.numberOfChannels, frameCount, sampleRate);
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const src = buffer.getChannelData(ch).subarray(startSample, startSample + frameCount);
      sliced.copyToChannel(src, ch);
    }
    return sliced;
  }

  function audioBufferToWavBlob(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const frameCount = buffer.length;
    const bytesPerSample = 2; // 16-bit PCM
    const blockAlign = numChannels * bytesPerSample;
    const dataSize = frameCount * blockAlign;
    const bufferArr = new ArrayBuffer(44 + dataSize);
    const view = new DataView(bufferArr);
    function writeStr(offset, str) { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); }
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true);
    writeStr(36, 'data');
    view.setUint32(40, dataSize, true);
    const channels = [];
    for (let ch = 0; ch < numChannels; ch++) channels.push(buffer.getChannelData(ch));
    let offset = 44;
    for (let i = 0; i < frameCount; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, channels[ch][i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        offset += 2;
      }
    }
    return new Blob([bufferArr], { type: 'audio/wav' });
  }

  function drawWaveform(canvas, buffer, clips) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const g = canvas.getContext('2d');
    g.scale(dpr, dpr);
    g.clearRect(0, 0, w, h);
    const data = buffer.getChannelData(0);
    const step = Math.max(1, Math.floor(data.length / w));
    g.fillStyle = 'rgba(0,255,204,.55)';
    for (let x = 0; x < w; x++) {
      let min = 1, max = -1;
      const start = x * step;
      for (let i = 0; i < step && start + i < data.length; i++) {
        const v = data[start + i];
        if (v < min) min = v;
        if (v > max) max = v;
      }
      const yMin = (1 - (max + 1) / 2) * h;
      const yMax = (1 - (min + 1) / 2) * h;
      g.fillRect(x, yMin, 1, Math.max(1, yMax - yMin));
    }
    const dur = buffer.duration || 1;
    clips.filter(c => c.deleted).forEach(c => {
      const x0 = (c.startSec / dur) * w, x1 = (c.endSec / dur) * w;
      g.fillStyle = 'rgba(226,75,74,.35)';
      g.fillRect(x0, 0, Math.max(1, x1 - x0), h);
    });
  }

  function buildScissorsEditor(sectionKey, take, audioUrl) {
    const wrap = el('div', 's936tr-scissors');
    const status = el('div', 's936tr-scissors-status', 'Cargando forma de onda…');
    wrap.appendChild(status);
    const ctx = getMainAudioCtx();
    fetch(audioUrl).then(r => r.arrayBuffer()).then(buf => ctx.decodeAudioData(buf)).then(buffer => {
      status.remove();
      const canvas = document.createElement('canvas');
      canvas.className = 's936tr-scissors-canvas';
      canvas.style.height = '64px';
      canvas.style.width = '100%';
      canvas.style.cursor = 'crosshair';
      wrap.appendChild(canvas);
      wrap.appendChild(el('div', 's936tr-scissors-hint', 'Tocá sobre la forma de onda para cortar ahí.'));
      const piecesWrap = el('div', 's936tr-pieces');
      wrap.appendChild(piecesWrap);
      function currentClips() { return getEffectiveClips(take); }
      function redraw() {
        const clips = currentClips();
        drawWaveform(canvas, buffer, clips);
        piecesWrap.innerHTML = '';
        clips.forEach((clip, i) => {
          const piece = el('div', 's936tr-piece' + (clip.deleted ? ' is-deleted' : ''));
          piece.appendChild(el('span', '', 'Pedazo ' + (i + 1) + ' · ' + fmtTime(clip.startSec) + '–' + fmtTime(clip.endSec)));
          const toggleBtn = el('button', 's936tr-piece-btn', clip.deleted ? '↺ Recuperar' : '✕ Borrar');
          toggleBtn.onclick = () => {
            const clips2 = currentClips().map(c => c.id === clip.id ? { ...c, deleted: !c.deleted } : c);
            take.clips = clips2; updateTakeClips(sectionKey, take.id, clips2); redraw();
          };
          piece.appendChild(toggleBtn);
          piecesWrap.appendChild(piece);
        });
      }
      canvas.onclick = (ev) => {
        const rect = canvas.getBoundingClientRect();
        const frac = (ev.clientX - rect.left) / rect.width;
        const cutSec = Math.max(0.05, Math.min(buffer.duration - 0.05, frac * buffer.duration));
        const clips2 = splitClipsAt(currentClips(), cutSec);
        take.clips = clips2; updateTakeClips(sectionKey, take.id, clips2); redraw();
      };
      redraw();
    }).catch(() => { status.textContent = 'No se pudo cargar la forma de onda.'; });
    return wrap;
  }

  async function tryWriteBlobToConfiguredFolder(filename, blob) {
    try {
      const structureMod = window.Studio936SuiteProStructure;
      if (!structureMod || typeof structureMod.getLibraryAudioDirHandle !== 'function') return false;
      const dirHandle = await structureMod.getLibraryAudioDirHandle();
      if (!dirHandle) return false;
      const fh = await dirHandle.getFileHandle(filename, { create: true });
      const writable = await fh.createWritable();
      await writable.write(blob); await writable.close();
      return true;
    } catch (e) { console.warn('[Track Recorder] no se pudo escribir a la carpeta', e); return false; }
  }
  async function tryRestoreBlobFromConfiguredFolder(filename) {
    try {
      const structureMod = window.Studio936SuiteProStructure;
      if (!structureMod || typeof structureMod.getLibraryAudioDirHandle !== 'function') return null;
      const dirHandle = await structureMod.getLibraryAudioDirHandle();
      if (!dirHandle) return null;
      const fh = await dirHandle.getFileHandle(filename);
      return await fh.getFile();
    } catch (_) { return null; }
  }

  function getCurrentCompositionId() { try { return window.Studio936Library?.getCurrentOpenCompositionId?.() || null; } catch (_) { return null; } }
  function getCurrentUser() { try { return window.Studio936Library?.getCurrentUser?.() || null; } catch (_) { return null; } }

  async function tryUploadTrackToCloud(sectionKey, instrumentId, label, blob, durationSec) {
    const compositionId = getCurrentCompositionId();
    const user = getCurrentUser();
    if (!user) return { ok: false, reason: 'no-session' };
    if (!compositionId) return { ok: false, reason: 'no-composition' };
    try {
      const params = new URLSearchParams({ compositionId, section: sectionKey, instrument: instrumentId, label: label || '', durationSec: String(durationSec || 0) });
      const resp = await fetch(S936_API_BASE + '/api/tracks?' + params.toString(), {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': blob.type || 'audio/webm' }, body: blob
      });
      if (!resp.ok) return { ok: false, reason: 'http-' + resp.status };
      const data = await resp.json();
      return { ok: true, cloudTrackId: data.id, cloudFileUrl: data.fileUrl };
    } catch (e) { return { ok: false, reason: 'network' }; }
  }
  async function tryFetchBlobFromCloud(take) {
    if (!take.cloudFileUrl) return null;
    try {
      const resp = await fetch(S936_API_BASE + take.cloudFileUrl, { credentials: 'include' });
      if (!resp.ok) return null;
      return await resp.blob();
    } catch (_) { return null; }
  }
  function updateTakeMeta(sectionKey, takeId, patch) {
    const store = readMetaStore();
    const list = store[sectionKey] || [];
    const take = list.find(t => t.id === takeId);
    if (!take) return;
    Object.assign(take, patch);
    writeMetaStore(store);
  }

  async function ensureMic() {
    if (mediaStream) return mediaStream;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast('⚠️ Este navegador no permite grabar audio.'); return null; }
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return mediaStream;
    } catch (e) { toast('⚠️ No se pudo acceder al micrófono/entrada de audio.'); return null; }
  }

  function stopRecordTimer() { if (recordTimerHandle) { clearInterval(recordTimerHandle); recordTimerHandle = null; } }
  function startRecordTimer() {
    stopRecordTimer();
    recordSeconds = 0;
    recordTimerHandle = setInterval(() => {
      recordSeconds += 1;
      const timerEl = panelEl && panelEl.querySelector('.s936tr-timer');
      if (timerEl) timerEl.textContent = fmtTime(recordSeconds);
      try {
        const track = document.querySelector('.s936tr-lanerow.is-selected .s936tr-lanetrack');
        if (track) {
          const secondsPerBar = Number(track.dataset.secondsPerBar) || 0;
          track.classList.remove('is-empty');
          track.classList.add('is-recording-live');
          track.textContent = fmtTime(recordSeconds);
          if (secondsPerBar > 0) {
            // Owner: "se abre como las aguas del mar, se despega la
            // línea... queda en la línea de las lyrics" -- esta barra EN
            // VIVO crecía sin freno (nada la topaba en el ancho real de
            // la sección) -- al cruzar de sección seguía estirándose por
            // pixeles y se desbordaba sobre el bloque de la sección
            // siguiente, cayendo encima de CUALQUIER fila que hubiera
            // ahí (la de letra, si esa sección no tenía su propio canal
            // de Voz todavía). Se topa acá al ancho real de la sección
            // (sectionMaxWidthPx, mandado desde Vista Continua) -- la
            // barra en vivo ya no se desborda; al soltar REC, el corte
            // real por sección (splitRecordingIntoSectionTakes) sí
            // sigue grabando y empalmando bien más allá de este límite
            // visual, esto es solo la vista MIENTRAS se graba.
            const maxWidthPx = Number(track.dataset.maxWidthPx) || 0;
            let px = Math.max(24, Math.round((recordSeconds / secondsPerBar) * 320));
            if (maxWidthPx > 0) px = Math.min(px, maxWidthPx);
            track.style.width = px + 'px';
          }
        }
      } catch (_) {}
    }, 1000);
  }

  function muteBackingChannels() {
    const bridge = window.Studio936AppBridge;
    if (!bridge || !muteBackingWhileRec) { mutedChannelsBeforeRec = null; return; }
    try {
      const mix = bridge.getChannelMix?.() || {};
      mutedChannelsBeforeRec = {};
      BACKING_CHANNELS.forEach(key => {
        mutedChannelsBeforeRec[key] = !!(mix[key] && mix[key].mute);
        bridge.setChannelMute?.(key, true);
      });
    } catch (_) { mutedChannelsBeforeRec = null; }
  }
  function restoreBackingChannels() {
    const bridge = window.Studio936AppBridge;
    if (!bridge || !mutedChannelsBeforeRec) return;
    try {
      BACKING_CHANNELS.forEach(key => { bridge.setChannelMute?.(key, !!mutedChannelsBeforeRec[key]); });
    } catch (_) {}
    mutedChannelsBeforeRec = null;
  }

  async function startRecording() {
    const stream = await ensureMic();
    if (!stream) return;
    recordedChunks = [];
    let mimeType = '';
    try { if (window.MediaRecorder && MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm'; } catch (_) {}
    try { mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream); }
    catch (e) { toast('⚠️ Este navegador no permite grabar con MediaRecorder.'); return; }
    mediaRecorder.ondataavailable = (ev) => { if (ev.data && ev.data.size > 0) recordedChunks.push(ev.data); };
    const ctx = getMainAudioCtx();
    recordAnchorCtxTime = ctx ? ctx.currentTime : null;
    recordStartedAt = Date.now();
    muteBackingChannels();
    // Owner: "un canal se graba donde se necesite... si pasa de sección
    // a sección debe empalmar" -- se guarda AQUÍ (al arrancar, no al
    // guardar) la posición absoluta en segundos de LA CANCIÓN donde
    // arranca esta toma -- startChartSectionPractice() de la línea de
    // abajo lleva el playhead exactamente a ese mismo punto (el inicio
    // real de la sección actual), así que coincide con lo que de verdad
    // se va a grabar. Si la grabación sigue más allá del final de esta
    // sección, esta ancla es la que permite partirla en pedazos exactos
    // por sección al guardar (ver splitRecordingIntoSectionTakes()).
    try {
      const bridge = window.Studio936AppBridge;
      const sectionKey = getCurrentSectionKey();
      const idx = bridge?.getCurrentSongSectionIndex?.();
      recordStartSongSec = bridge?.getSongPositionSeconds?.(sectionKey, idx) ?? 0;
    } catch (_) { recordStartSongSec = 0; }
    try {
      const sectionKey = getCurrentSectionKey();
      window.Studio936SuiteProChart?.startChartSectionPractice?.(null, sectionKey);
    } catch (_) {}
    mediaRecorder.start(250);
    startRecordTimer();
    renderPanelBody();
  }

  function stopRecording() {
    return new Promise((resolve) => {
      if (!mediaRecorder || mediaRecorder.state === 'inactive') { resolve(null); return; }
      mediaRecorder.onstop = () => {
        stopRecordTimer();
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(recordedChunks, { type: mimeType });
        resolve(blob);
      };
      mediaRecorder.stop();
      try { window.Studio936SuiteProChart?.stopChartRhythmConsole?.({ stopAudio: true, stopBridge: true }); } catch (_) {}
      restoreBackingChannels();
    });
  }

  let pendingBlob = null;
  let pendingObjectUrl = null;

  async function stopAndSaveTake() {
    let blob;
    try { blob = await stopRecording(); }
    catch (e) { console.error('[Track Recorder] stopRecording() falló', e); toast('⚠️ Error al parar la grabación: ' + (e?.message || e)); return false; }
    if (!blob || blob.size < 100) {
      console.warn('[Track Recorder] stopRecording() no devolvió audio válido');
      toast('⚠️ No se capturó audio (grabación muy corta o vacía) — no se guardó nada.');
      return false;
    }
    pendingBlob = blob;
    if (pendingObjectUrl) { try { URL.revokeObjectURL(pendingObjectUrl); } catch (_) {} }
    pendingObjectUrl = URL.createObjectURL(blob);
    try { await saveTake(); }
    catch (e) { console.error('[Track Recorder] saveTake() falló', e); toast('⚠️ Error al guardar la toma: ' + (e?.message || e)); return false; }
    renderPanelBody();
    return true;
  }

  async function handleRecClick() {
    const live = mediaRecorder && mediaRecorder.state === 'recording';
    if (live) { await stopAndSaveTake(); } else { await startRecording(); }
  }

  function discardPending() {
    pendingBlob = null;
    if (pendingObjectUrl) { try { URL.revokeObjectURL(pendingObjectUrl); } catch (_) {} pendingObjectUrl = null; }
    recordSeconds = 0;
    renderPanelBody();
  }

  // Owner: "un canal se graba donde se necesite... si pasa de sección a
  // sección debe empalmar" -- guarda UN pedazo (de una posible serie,
  // si la grabación cruzó varias secciones) como una toma normal,
  // reutilizando EXACTAMENTE el mismo camino de siempre (disco, nube,
  // metadata, evento) -- así cada pedazo funciona con todo lo que ya
  // existe (reproducción, tijera/editor, descarga) sin cambiar nada más.
  async function saveOneSegmentTake(sectionKey, blob, startSec, durationSec, extraLabel, groupId, groupIndex, groupTotal) {
    const instrumentInfo = INSTRUMENTS.find(i => i.id === currentInstrument) || INSTRUMENTS[0];
    const id = uid();
    const ext = (blob.type || '').includes('webm') ? 'webm' : ((blob.type || '').includes('wav') ? 'wav' : 'audio');
    const fileName = `pista-${sectionKey}-${currentInstrument}-${id}.${ext}`;
    const savedToDisk = await tryWriteBlobToConfiguredFolder(fileName, blob);
    const take = {
      id, section: sectionKey, startSec,
      instrument: currentInstrument,
      instrumentLabel: instrumentInfo.label,
      label: instrumentInfo.label + ' · ' + fmtTime(durationSec) + (extraLabel ? ' · ' + extraLabel : ''),
      fileName: savedToDisk ? fileName : null,
      savedToDisk: !!savedToDisk, savedToCloud: false,
      cloudTrackId: null, cloudFileUrl: null,
      createdAt: Date.now(), durationSec,
      anchorAudioCtxTime: recordAnchorCtxTime,
      // Owner: pedazos de UNA misma grabación que cruzó de sección --
      // se guardan enlazados (mismo groupId, con su posición dentro del
      // grupo) para que a futuro se puedan identificar/tratar como una
      // sola toma continua (ej. al arrastrar o al mostrar "empalma con
      // la siguiente sección").
      groupId: groupId || id,
      groupIndex: groupIndex || 0,
      groupTotal: groupTotal || 1
    };
    saveTakeMeta(sectionKey, take);
    objectUrlsById[id] = URL.createObjectURL(blob);
    try { window.dispatchEvent(new CustomEvent('studio936:take-saved', { detail: { sectionKey, instrument: currentInstrument } })); } catch (_) {}
    const cloudResult = await tryUploadTrackToCloud(sectionKey, currentInstrument, take.label, blob, durationSec);
    if (cloudResult.ok) {
      updateTakeMeta(sectionKey, id, { savedToCloud: true, cloudTrackId: cloudResult.cloudTrackId, cloudFileUrl: cloudResult.cloudFileUrl });
    }
    return take;
  }

  // Owner: "la grabación puede cruzar de una sección a la siguiente sin
  // parar... debe empalmar" -- si la toma completa cruzó el límite de
  // una o más secciones, se corta en software (sample-accurate, sin
  // click audible) exactamente en cada límite real de sección y se
  // guarda un pedazo por cada una -- así cada pedazo queda del tamaño
  // real que se grabó ahí (medio compás, un compás, la sección entera,
  // lo que sea) y, al reproducirse juntos, empalman sin hueco ni corte.
  // Si no hay límites de canción disponibles (ej. Chart no montado) o
  // el audio no se puede decodificar, se guarda todo como ANTES -- una
  // sola toma bajo la sección actual, sin re-codificar.
  async function splitRecordingIntoSectionTakes(blob) {
    const fallbackSectionKey = getCurrentSectionKey();
    const boundaries = window.Studio936SuiteProChart?.getSongSectionBoundaries?.() || [];
    if (!boundaries.length) return [{ sectionKey: fallbackSectionKey, blob, startSec: recordStartSongSec, durationSec: recordSeconds }];

    let decoded = null;
    let decodeCtx = null;
    try {
      decodeCtx = getMainAudioCtx() || new (window.AudioContext || window.webkitAudioContext)();
      const arrBuf = await blob.arrayBuffer();
      decoded = await decodeCtx.decodeAudioData(arrBuf);
    } catch (_) { decoded = null; }
    if (!decoded) return [{ sectionKey: fallbackSectionKey, blob, startSec: recordStartSongSec, durationSec: recordSeconds }];

    const recordEndSongSec = recordStartSongSec + decoded.duration;
    const EPS = 0.05;
    const overlapping = boundaries.filter(b => b.endSec > recordStartSongSec + EPS && b.startSec < recordEndSongSec - EPS);
    if (!overlapping.length) return [{ sectionKey: fallbackSectionKey, blob, startSec: recordStartSongSec, durationSec: recordSeconds }];

    const pieces = overlapping.map((b) => {
      const segStartSong = Math.max(b.startSec, recordStartSongSec);
      const segEndSong = Math.min(b.endSec, recordEndSongSec);
      return { sectionKey: b.section, sectionLabel: b.label, startSec: segStartSong, durationSec: segEndSong - segStartSong };
    }).filter(p => p.durationSec > EPS);

    if (pieces.length <= 1) return [{ sectionKey: pieces[0]?.sectionKey || fallbackSectionKey, blob, startSec: recordStartSongSec, durationSec: recordSeconds }];

    return pieces.map((p) => {
      const offsetInBuffer = p.startSec - recordStartSongSec;
      const sliced = sliceAudioBuffer(decodeCtx, decoded, offsetInBuffer, offsetInBuffer + p.durationSec);
      return { sectionKey: p.sectionKey, sectionLabel: p.sectionLabel, blob: audioBufferToWavBlob(sliced), startSec: p.startSec, durationSec: p.durationSec };
    });
  }

  async function saveTake() {
    if (!pendingBlob) return;
    const currentSectionKey = getCurrentSectionKey();
    // CAMBIO 506: abortar si no hay sección real
    if (!currentSectionKey || currentSectionKey === '__song__') {
      toast('⚠️ Elegí una sección concreta (Verso, Coro, etc.) antes de grabar — no se guardó nada.');
      if (pendingObjectUrl) { try { URL.revokeObjectURL(pendingObjectUrl); } catch (_) {} }
      pendingBlob = null;
      pendingObjectUrl = null;
      recordSeconds = 0;
      return;
    }
    const blobForSplit = pendingBlob;
    if (pendingObjectUrl) { try { URL.revokeObjectURL(pendingObjectUrl); } catch (_) {} }
    pendingObjectUrl = null;
    pendingBlob = null;
    const savedRecordSeconds = recordSeconds;
    recordSeconds = 0;
    renderPanelBody();

    const pieces = await splitRecordingIntoSectionTakes(blobForSplit);
    const groupId = uid();
    const lastSection = pieces[pieces.length - 1].sectionKey;
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      const extraLabel = pieces.length > 1 ? (p.sectionLabel || p.sectionKey) : '';
      await saveOneSegmentTake(p.sectionKey, p.blob, p.startSec, p.durationSec || savedRecordSeconds, extraLabel, groupId, i, pieces.length);
    }
    if (pieces.length > 1) {
      toast('✅ Grabación guardada en ' + pieces.length + ' pedazos (cruzó de sección) — instrumento "' + (INSTRUMENTS.find(i => i.id === currentInstrument)?.label || currentInstrument) + '".');
    } else {
      toast('✅ Toma guardada — sección "' + lastSection + '", instrumento "' + (INSTRUMENTS.find(i => i.id === currentInstrument)?.label || currentInstrument) + '".');
    }
    renderPanelBody();
  }

  async function ensureTakePlayable(take) {
    if (objectUrlsById[take.id]) return objectUrlsById[take.id];
    if (take.fileName) {
      const file = await tryRestoreBlobFromConfiguredFolder(take.fileName);
      if (file) { const url = URL.createObjectURL(file); objectUrlsById[take.id] = url; return url; }
    }
    if (take.savedToCloud && take.cloudFileUrl) {
      const blob = await tryFetchBlobFromCloud(take);
      if (blob) { const url = URL.createObjectURL(blob); objectUrlsById[take.id] = url; return url; }
    }
    return null;
  }

  function removeTake(sectionKey, takeId) {
    const takes = listTakesForSection(sectionKey);
    const take = takes.find(t => t.id === takeId);
    deleteTakeMeta(sectionKey, takeId);
    try { window.dispatchEvent(new CustomEvent('studio936:take-saved', { detail: { sectionKey, removed: true } })); } catch (_) {}
    if (objectUrlsById[takeId]) { try { URL.revokeObjectURL(objectUrlsById[takeId]); } catch (_) {} delete objectUrlsById[takeId]; }
    if (take && take.savedToCloud && take.cloudTrackId) {
      fetch(S936_API_BASE + '/api/tracks/' + encodeURIComponent(take.cloudTrackId), { method: 'DELETE', credentials: 'include' }).catch(() => {});
    }
    renderPanelBody();
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function installStyles() {
    if (document.getElementById('s936tr-styles')) return;
    const style = document.createElement('style');
    style.id = 's936tr-styles';
    style.textContent = `
      .s936tr-panel{position:fixed;top:90px;right:24px;width:340px;max-width:92vw;min-width:280px;min-height:200px;max-height:88vh;overflow-y:auto;resize:both;background:linear-gradient(155deg,rgba(14,26,26,.97),rgba(10,18,18,.97));border:1px solid rgba(91,232,201,.28);border-radius:16px;box-shadow:0 18px 48px rgba(0,0,0,.5);z-index:9999;color:#e8f4f2;font-family:inherit;backdrop-filter:blur(10px);}
      .s936tr-head{cursor:move;touch-action:none;display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(91,232,201,.16);}
      .s936tr-title{font-weight:800;font-size:.92rem;color:#5be8c9;letter-spacing:.3px;}
      .s936tr-close{background:none;border:none;color:#9fd8cc;font-size:1.1rem;cursor:pointer;line-height:1;}
      .s936tr-body{padding:14px 16px;max-height:60vh;overflow-y:auto;}
      .s936tr-section{font-size:.78rem;color:#9fd8cc;margin-bottom:10px;}
      .s936tr-section b{color:#e8f4f2;}
      .s936tr-folder-row{display:flex;flex-direction:column;gap:6px;margin-bottom:12px;padding:8px 10px;border-radius:8px;background:rgba(255,255,255,.03);}
      .s936tr-folder-ok{font-size:.74rem;color:#5be8c9;}
      .s936tr-folder-warn{font-size:.74rem;color:#ffc98a;}
      .s936tr-folder-btn{align-self:flex-start;background:rgba(91,232,201,.14);border:1px solid rgba(91,232,201,.35);color:#5be8c9;border-radius:7px;padding:5px 10px;font-size:.72rem;cursor:pointer;font-weight:700;}
      .s936tr-select{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(91,232,201,.25);border-radius:8px;color:#e8f4f2;padding:8px 10px;font-size:.85rem;margin-bottom:12px;}
      .s936tr-mute-row{display:flex;align-items:center;gap:8px;font-size:.74rem;color:#9fd8cc;margin-bottom:12px;cursor:pointer;}
      .s936tr-mute-row input{cursor:pointer;}
      .s936tr-recrow{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
      .s936tr-recbtn{flex:1;padding:10px;border-radius:10px;border:1px solid rgba(255,120,120,.4);background:rgba(255,80,80,.14);color:#ffb3b3;font-weight:700;cursor:pointer;font-size:.85rem;}
      .s936tr-recbtn.live{background:rgba(255,60,60,.35);color:#fff;}
      .s936tr-timer{font-variant-numeric:tabular-nums;font-size:.85rem;color:#9fd8cc;min-width:48px;text-align:right;}
      .s936tr-pending{border:1px dashed rgba(91,232,201,.35);border-radius:10px;padding:10px;margin-bottom:12px;}
      .s936tr-actions{display:flex;gap:8px;}
      .s936tr-btn{flex:1;padding:8px 10px;border-radius:8px;border:1px solid rgba(91,232,201,.3);background:rgba(91,232,201,.12);color:#e8f4f2;font-size:.8rem;cursor:pointer;font-weight:600;}
      .s936tr-btn.secondary{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.15);color:#c9d8d5;}
      .s936tr-list h5{font-size:.75rem;color:#9fd8cc;text-transform:uppercase;letter-spacing:.6px;margin:14px 0 8px;}
      .s936tr-take{border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:8px 10px;margin-bottom:8px;}
      .s936tr-take.is-lost{border-color:rgba(255,180,120,.35);background:rgba(255,180,120,.05);}
      .s936tr-take-head{display:flex;justify-content:space-between;align-items:center;font-size:.82rem;margin-bottom:6px;}
      .s936tr-take-del{background:none;border:none;color:#ff9d9d;cursor:pointer;font-size:.75rem;}
      .s936tr-take audio{width:100%;}
      .s936tr-take-actions{margin-top:6px;}
      .s936tr-scissors{margin-top:8px;padding:8px;border:1px solid rgba(0,255,204,.25);border-radius:8px;background:rgba(0,255,204,.03);}
      .s936tr-scissors-canvas{display:block;background:#05070a;border-radius:6px;border:1px solid rgba(255,255,255,.08);}
      .s936tr-scissors-hint{font-size:.6rem;color:#7d8d8a;margin:5px 0;}
      .s936tr-pieces{display:flex;flex-direction:column;gap:4px;}
      .s936tr-piece{display:flex;justify-content:space-between;align-items:center;font-size:.66rem;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:6px;padding:4px 8px;}
      .s936tr-piece.is-deleted{opacity:.5;text-decoration:line-through;}
      .s936tr-piece-btn{background:none;border:1px solid rgba(255,255,255,.15);border-radius:5px;color:#ffb0b0;font-size:.6rem;padding:2px 8px;cursor:pointer;}
      .s936tr-btn.small{padding:5px 8px;font-size:.72rem;flex:none;}
      .s936tr-hint{font-size:.72rem;color:#7fa8a0;margin-top:10px;line-height:1.4;}
      .s936tr-empty{font-size:.78rem;color:#7fa8a0;font-style:italic;}
      .s936tr-lanewrap{padding:2px 4px 2px;display:flex;flex-direction:column;gap:5px;}
      /* Cambio 513: CSS viejo de colapso por franja fina, ya no se usa
         — reemplazado por esconder/mostrar todo el bloque de una vez
         (ver heading.onclick en renderSectionLanes). */
      .s936tr-laneheading{font-size:.62rem;color:#7fa8a0;text-transform:uppercase;letter-spacing:.5px;font-weight:700;margin-bottom:1px;}
      .s936tr-lanerow{display:grid;grid-template-columns:320px 1fr;align-items:center;gap:3px;}
      .s936tr-lanerow.is-selected{background:rgba(0,255,204,.08);border-radius:8px;box-shadow:inset 0 0 0 1px rgba(0,255,204,.35);}
      .s936tr-lanerow-continuation{grid-template-columns:0 1fr;gap:0}
      .s936tr-lanerow-continuation .s936tr-lanelabel{display:none}
      /* Owner: "la barra de controles de canales se debe quedar inmóvil
         cuando el play camina y la canción pasa por debajo" -- esta
         columna (nombre + 🎧 + volumen + 🔊 + ⋮) vive dentro de la
         misma fila horizontalmente scrolleable que el Chart (Vista
         Continua, ver .s936-ch-cont-headerspacer) -- position:sticky
         la clava al borde izquierdo real del contenedor con scroll, sin
         quitarle su espacio reservado en el flujo. Fondo sólido (ya no
         translúcido) para que los bloques de pista no se transparenten
         por debajo al pasar. Sin ancestro con scroll horizontal (ej. el
         panel flotante "Pistas por sección"), sticky no cambia nada --
         mismo resultado visual de siempre. */
      /* Owner: el panel se perdía después de cierto compás -- sticky solo
         puede quedarse "pegado" dentro de los límites de SU PROPIA fila
         (la fila vive solo en la primera sección, con el ancho de ESA
         sección nada más). Se cambia a position:relative -- el
         desplazamiento real lo pone JS por transform
         (syncStickyHeaderColumn, en suite-pro-chart-...js), que no tiene
         ese límite y funciona en TODO el rango de scroll. */
      .s936tr-lanelabel{display:flex;align-items:center;gap:5px;overflow:hidden;background:#121212;border-radius:5px;box-sizing:border-box;min-height:68px;padding:0 8px;position:relative;z-index:7;}
      .s936tr-laneicon{display:flex;align-items:center;justify-content:center;width:29px;height:29px;cursor:default;font-size:.95rem;flex-shrink:0;border-radius:6px;}
      .s936tr-lanebtn-lg{width:29px;height:29px;padding:0;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;color:rgba(255,255,255,.75);font-size:15px;line-height:1;}
      .s936tr-lanebtn-lg:hover{background:rgba(255,255,255,.1);}
      .s936tr-lanebtn-lg.is-active{background:rgba(255,120,120,.22);border-color:rgba(255,120,120,.4);color:#ff9d9d;}
      .s936tr-lanebtn-lg.is-active.is-solo{background:rgba(0,255,204,.2);border-color:rgba(0,255,204,.45);color:#7dffe0;}
      .s936tr-lanevol{display:flex;align-items:center;flex:1;min-width:20px;}
      .s936tr-lanevol input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:16px;background:transparent;cursor:pointer;margin:0;}
      .s936tr-lanevol input[type=range]::-webkit-slider-runnable-track{height:4px;border-radius:2px;background:rgba(255,255,255,.15);}
      .s936tr-lanevol input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:12px;height:12px;border-radius:50%;background:#5be8c9;margin-top:-4px;box-shadow:0 0 4px rgba(91,232,201,.5);}
      .s936tr-lanemenu{display:none;position:fixed;margin-top:2px;background:#0d1a1a;border:1px solid rgba(91,232,201,.3);border-radius:8px;padding:8px;z-index:99999;box-shadow:0 8px 24px rgba(0,0,0,.5);min-width:150px;}
      .s936tr-lanemenu.is-open{display:flex;flex-direction:column;gap:6px;}
      .s936tr-lanemenu-row{display:flex;align-items:center;gap:6px;font-size:.68rem;color:#c9d8d5;}
      .s936tr-lanemenu-row input[type=range]{flex:1;accent-color:#5be8c9;}
      .s936tr-lanemenubtn{padding:5px 8px;border-radius:6px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#c9d8d5;font-size:.68rem;cursor:pointer;text-align:left;}
      .s936tr-lanemenubtn.danger{color:#ff9d9d;border-color:rgba(255,120,120,.3);}
      .s936tr-lanemore-wrap{position:relative;flex-shrink:0;}
      .s936tr-lanetrack{height:54px;border-radius:4px;cursor:default;width:100%;}
      .s936tr-lanetrack.is-empty{width:120px !important;flex-shrink:0;background:transparent !important;border:1px dashed rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-size:.6rem;color:#5e6c6a;opacity:1 !important;}
      .s936tr-lanetrack.is-recording-live{transition:width .15s linear;display:flex;align-items:center;justify-content:flex-end;padding-right:6px;box-sizing:border-box;overflow:hidden;white-space:nowrap;font-size:.62rem;font-weight:700;color:rgba(255,255,255,.92);text-shadow:0 1px 2px rgba(0,0,0,.6);}
      .s936tr-laneadd{position:relative;padding-left:0;margin-top:2px;}
      .s936tr-laneaddbtn{width:20px;height:20px;padding:0;border-radius:50%;border:1px solid rgba(91,232,201,.35);background:rgba(91,232,201,.1);color:#5be8c9;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:11px;line-height:1;}
      .s936tr-lanepicker{display:none;position:absolute;left:26px;top:0;background:#0d1a1a;border:1px solid rgba(91,232,201,.3);border-radius:8px;padding:3px;gap:2px;z-index:20;box-shadow:0 8px 24px rgba(0,0,0,.5);}
      .s936tr-lanepicker button{width:24px;height:24px;padding:0;border:none;background:none;border-radius:5px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:13px;}
    `;
    document.head.appendChild(style);
  }

  function renderPanelBody() {
    if (!panelEl) return;
    const body = panelEl.querySelector('.s936tr-body');
    if (!body) return;
    body.innerHTML = '';
    const sectionKey = getCurrentSectionKey();
    const sectionInfo = el('div', 's936tr-section');
    sectionInfo.innerHTML = 'Sección actual: <b>' + getCurrentSectionLabel() + '</b>';
    body.appendChild(sectionInfo);
    const hasFolder = !!localStorage.getItem('s936_library_dir_name');
    const folderRow = el('div', 's936tr-folder-row');
    if (hasFolder) { folderRow.appendChild(el('span', 's936tr-folder-ok', '💾 Carpeta configurada.')); }
    else {
      folderRow.appendChild(el('span', 's936tr-folder-warn', '⚠️ Sin carpeta configurada: se pierde al cerrar.'));
      const cfgBtn = el('button', 's936tr-folder-btn', '📁 Configurar carpeta');
      cfgBtn.onclick = () => { try { window.Studio936SuiteProStructure?.openLibraryConfig?.({}); } catch (_) {} };
      folderRow.appendChild(cfgBtn);
    }
    body.appendChild(folderRow);
    const select = el('select', 's936tr-select');
    INSTRUMENTS.forEach(i => {
      const opt = document.createElement('option');
      opt.value = i.id; opt.textContent = i.label;
      if (i.id === currentInstrument) opt.selected = true;
      select.appendChild(opt);
    });
    select.onchange = () => { currentInstrument = select.value; };
    body.appendChild(select);
    const muteRow = el('label', 's936tr-mute-row');
    const muteCheckbox = document.createElement('input');
    muteCheckbox.type = 'checkbox';
    muteCheckbox.checked = muteBackingWhileRec;
    muteCheckbox.onchange = () => { muteBackingWhileRec = muteCheckbox.checked; };
    muteRow.appendChild(muteCheckbox);
    muteRow.appendChild(document.createTextNode(' Silenciar fondo mientras grabo'));
    body.appendChild(muteRow);
    const live = mediaRecorder && mediaRecorder.state === 'recording';
    const recRow = el('div', 's936tr-recrow');
    const recBtn = el('button', 's936tr-recbtn' + (live ? ' live' : ''), live ? '⏹ Detener' : '⏺ Grabar');
    recBtn.onclick = handleRecClick;
    const timer = el('div', 's936tr-timer', fmtTime(recordSeconds));
    recRow.append(recBtn, timer);
    body.appendChild(recRow);
    if (pendingBlob && pendingObjectUrl) {
      const pending = el('div', 's936tr-pending');
      pending.appendChild(el('div', '', 'Toma lista:'));
      const audio = document.createElement('audio');
      audio.controls = true; audio.src = pendingObjectUrl;
      pending.appendChild(audio);
      const actions = el('div', 's936tr-actions');
      const saveBtn = el('button', 's936tr-btn', '💾 Guardar pista');
      saveBtn.onclick = saveTake;
      const discardBtn = el('button', 's936tr-btn secondary', 'Descartar');
      discardBtn.onclick = discardPending;
      actions.append(saveBtn, discardBtn);
      pending.appendChild(actions);
      body.appendChild(pending);
    }
    const listWrap = el('div', 's936tr-list');
    listWrap.appendChild(el('h5', '', 'Pistas guardadas de esta sección'));
    const takes = listTakesForSection(sectionKey);
    if (!takes.length) { listWrap.appendChild(el('div', 's936tr-empty', 'Todavía no hay pistas grabadas aquí.')); }
    else {
      takes.forEach(take => {
        const box = el('div', 's936tr-take');
        const head = el('div', 's936tr-take-head');
        head.appendChild(el('span', '', take.label + (take.savedToDisk ? ' 💾' : ' (solo esta sesión)')));
        const delBtn = el('button', 's936tr-take-del', '✕ borrar');
        delBtn.onclick = () => removeTake(sectionKey, take.id);
        head.appendChild(delBtn);
        box.appendChild(head);
        const audio = document.createElement('audio');
        audio.controls = true;
        box.appendChild(audio);
        let takeUrl = null;
        ensureTakePlayable(take).then(url => {
          if (url) { audio.src = url; takeUrl = url; }
          else { box.classList.add('is-lost'); head.querySelector('span').textContent = take.label + ' — ⚠️ audio perdido'; audio.remove(); }
        });
        // REPUESTO tras la reescritura de DeepSeek (Cambio 506): estos
        // 2 botones (Descargar y Editar/tijera, del Cambio 490 de esta
        // misma sesión) se habían perdido por completo en el archivo
        // que compartió — el botón de tijera quedó sin su función
        // buildScissorsEditor(), que ya existía en el archivo pero
        // nadie la llamaba.
        const takeActions = el('div', 's936tr-take-actions');
        const dlBtn = el('button', 's936tr-btn secondary small', '⬇ Descargar');
        dlBtn.onclick = () => {
          if (!takeUrl) return;
          const a = document.createElement('a');
          a.href = takeUrl; a.download = 'studio936-' + take.instrument + '-' + take.id + '.webm';
          document.body.appendChild(a); a.click(); a.remove();
        };
        takeActions.appendChild(dlBtn);
        const scissorsBtn = el('button', 's936tr-btn secondary small', '✂️ Editar');
        let scissorsPanel = null;
        scissorsBtn.onclick = () => {
          if (scissorsPanel) { scissorsPanel.remove(); scissorsPanel = null; return; }
          ensureTakePlayable(take).then(url => {
            if (!url) return;
            scissorsPanel = buildScissorsEditor(sectionKey, take, url);
            box.appendChild(scissorsPanel);
          });
        };
        takeActions.appendChild(scissorsBtn);
        box.appendChild(takeActions);
        listWrap.appendChild(box);
      });
    }
    body.appendChild(listWrap);
  }

  function openPanel() {
    installStyles();
    if (panelEl) { panelEl.style.display = 'block'; renderPanelBody(); return; }
    panelEl = el('div', 's936tr-panel');
    const head = el('div', 's936tr-head');
    head.appendChild(el('div', 's936tr-title', '🎙️ Pistas por sección'));
    const closeBtn = el('button', 's936tr-close', '✕');
    closeBtn.onclick = closePanel;
    head.appendChild(closeBtn);
    panelEl.appendChild(head);
    panelEl.appendChild(el('div', 's936tr-body'));
    document.body.appendChild(panelEl);
    renderPanelBody();
    let dragging = false, startX = 0, startY = 0, panelStartLeft = 0, panelStartTop = 0;
    head.addEventListener('pointerdown', (evt) => {
      if (evt.target.closest('button')) return;
      dragging = true; head.setPointerCapture(evt.pointerId);
      startX = evt.clientX; startY = evt.clientY;
      const rect = panelEl.getBoundingClientRect();
      panelStartLeft = rect.left; panelStartTop = rect.top;
    });
    head.addEventListener('pointermove', (evt) => {
      if (!dragging) return;
      panelEl.style.right = 'auto';
      panelEl.style.left = Math.max(0, panelStartLeft + (evt.clientX - startX)) + 'px';
      panelEl.style.top = Math.max(0, panelStartTop + (evt.clientY - startY)) + 'px';
    });
    head.addEventListener('pointerup', () => { dragging = false; });
  }

  function closePanel() { if (panelEl) panelEl.style.display = 'none'; }

  let lanesCollapsed = false;
  function setLanesCollapsed(collapsed) {
    collapsed = !!collapsed;
    if (collapsed === lanesCollapsed) return;
    lanesCollapsed = collapsed;
    document.querySelectorAll('.s936tr-lanewrap').forEach(w => { w.classList.toggle('is-collapsed', lanesCollapsed); });
    window.dispatchEvent(new CustomEvent('studio936:lanes-collapse-changed', { detail: { collapsed: lanesCollapsed } }));
  }
  function toggleAllLaneWraps() { setLanesCollapsed(!lanesCollapsed); }
  function isLanesCollapsed() { return lanesCollapsed; }

  let playingSources = [];
  let currentPlaybackSection = null;

  function stopSyncedPlayback() {
    while (playingSources.length) {
      const src = playingSources.pop();
      try { src.stop(); } catch (_) {}
    }
    currentPlaybackSection = null;
  }

  async function startSyncedPlaybackForSection(sectionKey) {
    stopSyncedPlayback();
    const takes = listTakesForSection(sectionKey);
    if (!takes.length) return;
    currentPlaybackSection = sectionKey;
    const ctx = getPlaybackAudioCtx();
    if (ctx.state === 'suspended') { try { await ctx.resume(); } catch (_) {} }
    const prepared = await Promise.all(takes.map(async (take) => {
      try {
        let buffer = decodedBuffersById[take.id];
        if (!buffer) {
          const url = await ensureTakePlayable(take);
          if (!url) return null;
          const arrayBuffer = await (await fetch(url)).arrayBuffer();
          buffer = await ctx.decodeAudioData(arrayBuffer);
          decodedBuffersById[take.id] = buffer;
        }
        return { take, buffer };
      } catch (_) { return null; }
    }));
    if (currentPlaybackSection !== sectionKey) return;
    const startAt = ctx.currentTime + 0.12;
    prepared.forEach(item => {
      if (!item) return;
      const { take, buffer } = item;
      const instrumentId = take.instrument || 'otro';
      const nodes = getOrCreateInstrumentNodes(ctx, sectionKey, instrumentId);
      const clips = getEffectiveClips(take).filter(c => !c.deleted && c.endSec > c.startSec);
      clips.forEach(clip => {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(nodes.panner);
        source.start(startAt + clip.startSec, clip.startSec, clip.endSec - clip.startSec);
        nodes.sources.add(source);
        source.onended = () => { nodes.sources.delete(source); };
        playingSources.push(source);
      });
    });
  }

  window.addEventListener('studio936:chart-practice-start', (ev) => {
    const sectionKey = ev?.detail?.section || getCurrentSectionKey();
    startSyncedPlaybackForSection(sectionKey);
    startPlayhead(sectionKey);
  });
  window.addEventListener('studio936:chart-practice-stop', () => { stopSyncedPlayback(); stopPlayhead(); });

  // Cambio 514: al elegir una sección distinta arriba (sin darle Play),
  // el playhead se ubica ahí como referencia visual, quieto — no arranca
  // ninguna reproducción real, solo marca "estás mirando acá".
  window.addEventListener('studio936:section-selected', (ev) => {
    const sectionKey = ev?.detail?.section;
    if (sectionKey && sectionKey !== '__song__' && !isRecordingActiveNow()) {
      showStaticPlayheadAtSection(sectionKey);
    }
  });

  function isRecordingActiveNow() { return !!(mediaRecorder && mediaRecorder.state === 'recording'); }

  function showStaticPlayheadAtSection(sectionKey) {
    stopPlayhead();
    const firstBar = document.querySelector('.s936-ch-bar[data-section="' + sectionKey + '"][data-bar="0"]');
    if (!firstBar) return;
    const sectionEl = firstBar.closest('.s936-ch-sec');
    if (!sectionEl) return;
    ensurePlayheadStyle();
    if (getComputedStyle(sectionEl).position === 'static') sectionEl.style.position = 'relative';
    let line = sectionEl.querySelector('.s936-playhead');
    if (!line) {
      line = document.createElement('div');
      line.className = 's936-playhead';
      sectionEl.appendChild(line);
    }
    const barRect = firstBar.getBoundingClientRect();
    const secRect = sectionEl.getBoundingClientRect();
    line.style.left = (barRect.left - secRect.left) + 'px';
    line.style.display = 'block';
    playheadSectionKey = sectionKey;
  }

  // Cambio 508: playhead visual real — una línea que cruza TODOS los
  // canales de la sección (Chart, Lyric, y las pistas grabadas),
  // moviéndose en sincronía con el reloj real del AudioContext (el
  // mismo que ya usa el motor de audio para arrancar las tomas
  // grabadas) — no un mecanismo aparte que se pueda desincronizar.
  let playheadRafId = null;
  let playheadStartAt = null;
  let playheadSectionKey = null;

  function ensurePlayheadStyle() {
    if (document.getElementById('s936PlayheadStyle')) return;
    const style = document.createElement('style');
    style.id = 's936PlayheadStyle';
    style.textContent = `
.s936-playhead{position:absolute;top:0;bottom:0;width:2px;pointer-events:none;z-index:50;
  background:linear-gradient(180deg,#ffe066,#c9a227 60%,#8a6d1a);
  box-shadow:0 0 8px 1px rgba(255,224,102,.55);
  transition:left .08s linear;}
`;
    document.head.appendChild(style);
  }

  function getSectionSecondsPerBar() {
    try {
      const bpm = Number(window.Studio936AppBridge?.getEditorState?.()?.bpm) || 95;
      return 4 * (60 / bpm);
    } catch (_) { return 4 * (60 / 95); }
  }

  function startPlayhead(sectionKey) {
    stopPlayhead();
    const ctx = getPlaybackAudioCtx();
    if (!ctx) return;
    const firstBar = document.querySelector('.s936-ch-bar[data-section="' + sectionKey + '"][data-bar="0"]');
    if (!firstBar) return; // sección no visible en pantalla ahora mismo — nada que animar
    const sectionEl = firstBar.closest('.s936-ch-sec');
    if (!sectionEl) return;
    ensurePlayheadStyle();
    if (getComputedStyle(sectionEl).position === 'static') sectionEl.style.position = 'relative';
    let line = sectionEl.querySelector('.s936-playhead');
    if (!line) {
      line = document.createElement('div');
      line.className = 's936-playhead';
      sectionEl.appendChild(line);
    }
    line.style.display = 'block';
    playheadSectionKey = sectionKey;
    playheadStartAt = ctx.currentTime + 0.12; // mismo colchón que usa el motor de audio real al arrancar
    const secondsPerBar = getSectionSecondsPerBar();

    function tick() {
      const elapsed = ctx.currentTime - playheadStartAt;
      if (elapsed < 0) { playheadRafId = requestAnimationFrame(tick); return; }
      const barIndex = Math.floor(elapsed / secondsPerBar);
      const fracInBar = (elapsed % secondsPerBar) / secondsPerBar;
      const barEl = document.querySelector('.s936-ch-bar[data-section="' + sectionKey + '"][data-bar="' + barIndex + '"]');
      if (barEl && sectionEl.isConnected) {
        const barRect = barEl.getBoundingClientRect();
        const secRect = sectionEl.getBoundingClientRect();
        const leftPx = (barRect.left - secRect.left) + barRect.width * fracInBar;
        line.style.left = leftPx + 'px';
      } else if (!barEl) {
        // Cambio 509: antes esto simplemente apagaba la línea para
        // siempre (por eso "solo funcionaba en la primera sección" —
        // en Canción completa, al pasar a la sección 2, no había
        // ningún aviso de que la sección cambió). Ahora, antes de
        // rendirse, pregunta cuál es la sección REAL que está sonando
        // ahora — si cambió, la línea se reubica sola ahí.
        try {
          const realNow = window.Studio936AppBridge?.getCurrentSectionKeyReal?.();
          if (realNow && realNow !== sectionKey) {
            startPlayhead(realNow);
            return;
          }
        } catch (_) {}
        line.style.display = 'none';
        return;
      }
      playheadRafId = requestAnimationFrame(tick);
    }
    playheadRafId = requestAnimationFrame(tick);
  }

  function stopPlayhead() {
    if (playheadRafId) { cancelAnimationFrame(playheadRafId); playheadRafId = null; }
    if (playheadSectionKey) {
      const line = document.querySelector('.s936-ch-sec .s936-playhead');
      if (line) line.style.display = 'none';
    }
    playheadSectionKey = null;
  }

  installStyles();

  const LANE_INSTRUMENTS = INSTRUMENTS;
  const LANE_ICONS = { voz: '🎤', guitarra: '🎸', piano: '🎹', bateria: '🥁', tecladomidi: '🎛️', setelectronico: '💻', otro: '🎵' };
  const LANE_COLORS = { voz: '#378ADD', guitarra: '#639922', piano: '#7F77DD', bateria: '#D4537E', tecladomidi: '#EF9F27', setelectronico: '#5DCAA5', otro: '#888780' };
  const laneMuteSolo = {};
  function getLaneState(sectionKey, instrumentId) {
    if (!laneMuteSolo[sectionKey]) laneMuteSolo[sectionKey] = {};
    if (!laneMuteSolo[sectionKey][instrumentId]) laneMuteSolo[sectionKey][instrumentId] = { muted: false, solo: false, pan: 0, volume: 0.8 };
    return laneMuteSolo[sectionKey][instrumentId];
  }
  function computeRealGain(sectionKey, instrumentId) {
    const state = getLaneState(sectionKey, instrumentId);
    const locallyAudible = !state.muted ? (state.volume != null ? state.volume : 0.8) : 0;
    const sectionStates = laneMuteSolo[sectionKey] || {};
    const anySolo = Object.values(sectionStates).some(s => s.solo);
    if (anySolo) return state.solo ? locallyAudible : 0;
    return locallyAudible;
  }
  function refreshLivePlaybackGains(sectionKey) {
    if (sectionKey !== currentPlaybackSection) return;
    Object.keys(instrumentAudioNodes).forEach(instrumentId => {
      const nodes = instrumentAudioNodes[instrumentId];
      if (!nodes) return;
      const state = getLaneState(sectionKey, instrumentId);
      nodes.gain.gain.value = computeRealGain(sectionKey, instrumentId);
      nodes.panner.pan.value = state.pan || 0;
    });
  }
  function getOrCreateInstrumentNodes(ctx, sectionKey, instrumentId) {
    if (instrumentAudioNodes[instrumentId]) {
      const nodes = instrumentAudioNodes[instrumentId];
      nodes.gain.gain.value = computeRealGain(sectionKey, instrumentId);
      nodes.panner.pan.value = getLaneState(sectionKey, instrumentId).pan || 0;
      return nodes;
    }
    const gain = ctx.createGain();
    const panner = ctx.createStereoPanner();
    gain.gain.value = computeRealGain(sectionKey, instrumentId);
    panner.pan.value = getLaneState(sectionKey, instrumentId).pan || 0;
    panner.connect(gain);
    gain.connect(window.__studio936MasterBus || ctx.destination);
    const nodes = { gain, panner, sources: new Set() };
    instrumentAudioNodes[instrumentId] = nodes;
    return nodes;
  }
  function groupTakesByInstrument(sectionKey) {
    const groups = {};
    listTakesForSection(sectionKey).forEach(t => {
      const key = t.instrument || 'otro';
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  }
  function tickBackgroundStyle() { return 'repeating-linear-gradient(to right, transparent 0, transparent calc(25% - 1px), rgba(255,255,255,.22) calc(25% - 1px), rgba(255,255,255,.22) 25%)'; }

  async function playInstrumentGroup(takes) {
    for (const take of takes) {
      const url = await ensureTakePlayable(take);
      if (!url) continue;
      const a = new Audio(url);
      a.play().catch(() => {});
    }
  }

  function buildLaneRow(sectionKey, instrumentId, takes, secondsPerBar, sectionMaxWidthPx) {
    const info = INSTRUMENTS.find(i => i.id === instrumentId) || INSTRUMENTS[INSTRUMENTS.length - 1];
    const color = LANE_COLORS[instrumentId] || LANE_COLORS.otro;
    const icon = LANE_ICONS[instrumentId] || LANE_ICONS.otro;
    const state = getLaneState(sectionKey, instrumentId);
    const row = document.createElement('div');
    row.className = 's936tr-lanerow';
    row.classList.toggle('is-selected', currentInstrument === instrumentId);
    row.style.cursor = 'pointer';
    row.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      currentInstrument = instrumentId;
      document.querySelectorAll('.s936tr-lanerow').forEach(r => r.classList.remove('is-selected'));
      row.classList.add('is-selected');
      toast('🎙️ Canal "' + info.label + '" seleccionado.');
    });
    const label = document.createElement('div');
    label.className = 's936tr-lanelabel';
    const iconSpan = document.createElement('span');
    iconSpan.className = 's936tr-laneicon';
    iconSpan.title = info.label;
    iconSpan.textContent = icon;
    iconSpan.style.background = color + '24';
    iconSpan.style.border = '1px solid ' + color + '4d';
    const nameSpan = document.createElement('span');
    nameSpan.className = 's936tr-lanename';
    nameSpan.textContent = info.label;
    nameSpan.style.cssText = 'font-size:.62rem;font-weight:700;color:' + color + ';margin-right:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:50px;flex-shrink:0;';
    const track = document.createElement('div');
    track.className = 's936tr-lanetrack';
    track.title = info.label;
    track.dataset.laneKey = sectionKey + '::' + instrumentId;
    track.dataset.secondsPerBar = String(secondsPerBar || 0);
    track.dataset.maxWidthPx = String(sectionMaxWidthPx || 0);
    track.style.backgroundColor = color;
    track.style.backgroundImage = tickBackgroundStyle();
    function updateTrackOpacity() {
      track.style.opacity = state.muted ? '0.12' : String(0.15 + (state.volume != null ? state.volume : 0.8) * 0.4);
    }
    updateTrackOpacity();
    if (!takes || !takes.length) {
      track.classList.add('is-empty');
      track.textContent = 'Vacío — grabá con REC';
      track.style.opacity = '1';
    }
    if (secondsPerBar > 0 && takes && takes.length) {
      const longestSec = takes.reduce((max, t) => Math.max(max, Number(t.durationSec) || 0), 0);
      if (longestSec > 0) {
        let px = Math.max(24, Math.round((longestSec / secondsPerBar) * 320));
        if (sectionMaxWidthPx > 0) px = Math.min(px, sectionMaxWidthPx);
        track.style.width = px + 'px';
        track.style.flexShrink = '0';
      }
    }
    const soloBtn = document.createElement('button');
    soloBtn.type = 'button';
    soloBtn.className = 's936tr-lanebtn-lg';
    soloBtn.title = 'Solo ' + info.label;
    soloBtn.textContent = '🎧';
    soloBtn.classList.toggle('is-active', state.solo);
    soloBtn.classList.add('is-solo');
    soloBtn.onclick = (e) => { e.stopPropagation(); state.solo = !state.solo; soloBtn.classList.toggle('is-active', state.solo); refreshLivePlaybackGains(sectionKey); };
    const volWrap = document.createElement('div');
    volWrap.className = 's936tr-lanevol';
    const volSlider = document.createElement('input');
    volSlider.type = 'range';
    volSlider.min = '0'; volSlider.max = '1'; volSlider.step = '0.01';
    volSlider.value = String(state.volume != null ? state.volume : 0.8);
    volSlider.oninput = () => { state.volume = Number(volSlider.value); updateTrackOpacity(); refreshLivePlaybackGains(sectionKey); };
    volWrap.appendChild(volSlider);
    const muteBtn = document.createElement('button');
    muteBtn.type = 'button';
    muteBtn.className = 's936tr-lanebtn-lg';
    muteBtn.textContent = state.muted ? '🔇' : '🔊';
    muteBtn.classList.toggle('is-active', state.muted);
    muteBtn.onclick = (e) => { e.stopPropagation(); state.muted = !state.muted; muteBtn.textContent = state.muted ? '🔇' : '🔊'; muteBtn.classList.toggle('is-active', state.muted); updateTrackOpacity(); refreshLivePlaybackGains(sectionKey); };
    const moreWrap = document.createElement('div');
    moreWrap.className = 's936tr-lanemore-wrap';
    const moreBtn = document.createElement('button');
    moreBtn.type = 'button';
    moreBtn.className = 's936tr-lanebtn-lg';
    moreBtn.textContent = '⋮';
    const menu = document.createElement('div');
    menu.className = 's936tr-lanemenu';
    const playRow = document.createElement('button');
    playRow.type = 'button';
    playRow.className = 's936tr-lanemenubtn';
    playRow.textContent = '▶ Escuchar';
    playRow.onclick = (e) => { e.stopPropagation(); playInstrumentGroup(takes); };
    const panRow = document.createElement('div');
    panRow.className = 's936tr-lanemenu-row';
    const panLabel = document.createElement('span');
    panLabel.textContent = 'L/R';
    const panSlider = document.createElement('input');
    panSlider.type = 'range';
    panSlider.min = '-1'; panSlider.max = '1'; panSlider.step = '0.1';
    panSlider.value = String(state.pan || 0);
    panSlider.oninput = () => { state.pan = Number(panSlider.value); refreshLivePlaybackGains(sectionKey); };
    panRow.append(panLabel, panSlider);
    const delRow = document.createElement('button');
    delRow.type = 'button';
    delRow.className = 's936tr-lanemenubtn danger';
    delRow.textContent = '🗑 Borrar pista';
    delRow.onclick = (e) => { e.stopPropagation(); takes.forEach(t => removeTake(sectionKey, t.id)); row.remove(); if (menu.parentNode) menu.parentNode.removeChild(menu); };
    menu.append(playRow, panRow, delRow);
    moreWrap.append(moreBtn, menu);
    function closeLaneMenu() { menu.classList.remove('is-open'); if (menu.parentNode !== moreWrap) moreWrap.appendChild(menu); }
    menu._closeSelf = closeLaneMenu;
    function openLaneMenu() {
      document.querySelectorAll('.s936tr-lanemenu.is-open').forEach(m => { if (m !== menu && typeof m._closeSelf === 'function') m._closeSelf(); });
      const r = moreBtn.getBoundingClientRect();
      document.body.appendChild(menu);
      menu.style.top = (r.bottom + 4) + 'px';
      menu.style.left = Math.max(6, r.right - 150) + 'px';
      menu.classList.add('is-open');
    }
    moreBtn.onclick = (e) => { e.stopPropagation(); if (menu.classList.contains('is-open')) closeLaneMenu(); else openLaneMenu(); };
    playRow.addEventListener('click', closeLaneMenu);
    delRow.addEventListener('click', closeLaneMenu);
    label.append(iconSpan, nameSpan, soloBtn, volWrap, muteBtn, moreWrap);
    row.append(label, track);
    return row;
  }

  function buildAddInstrumentControl(sectionKey, laneListEl) {
    const wrap = document.createElement('div');
    wrap.className = 's936tr-laneadd';
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 's936tr-laneaddbtn';
    addBtn.title = 'Agregar instrumento';
    addBtn.textContent = '+';
    const picker = document.createElement('div');
    picker.className = 's936tr-lanepicker';
    picker.style.display = 'none';
    LANE_INSTRUMENTS.forEach(inst => {
      const b = document.createElement('button');
      b.type = 'button';
      b.title = inst.label;
      b.textContent = LANE_ICONS[inst.id] || '🎵';
      b.onclick = (e) => {
        e.stopPropagation();
        picker.style.display = 'none';
        currentInstrument = inst.id;
        reserveInstrumentLane(sectionKey, inst.id);
        try { window.dispatchEvent(new CustomEvent('studio936:take-saved', { detail: { sectionKey, instrument: inst.id, reserved: true } })); } catch (_) {}
        toast('🎙️ Canal "' + inst.label + '" agregado.');
      };
      picker.appendChild(b);
    });
    addBtn.onclick = (e) => { e.stopPropagation(); picker.style.display = picker.style.display === 'none' ? 'flex' : 'none'; };
    wrap.append(addBtn, picker);
    return wrap;
  }

  let _laneDiagnosticShown = false;
  function renderSectionLanes(sectionEl, sectionKey, opts) {
    try {
      if (!sectionEl || !sectionKey) return;
      installStyles();
      const wrap = document.createElement('div');
      wrap.className = 's936tr-lanewrap';
      const hideHeader = !!(opts && opts.hideHeader);
      const rowsBox = document.createElement('div');
      rowsBox.className = 's936tr-lanerows-box';
      if (!hideHeader) {
        // Cambio 513: SIMPLE — un clic en el título esconde/muestra TODO
        // el bloque de canales de golpe (nada de franjas finitas por
        // instrumento, eso fue el intento anterior y no era lo que Val
        // pedía). Reusa el mismo estado global ya existente
        // (lanesCollapsed) para que un solo clic afecte todas las
        // secciones a la vez, útil quering estás practicando y no
        // querés ver las pistas grabadas tapando el Chart.
        const heading = document.createElement('div');
        heading.className = 's936tr-laneheading';
        heading.style.cursor = 'pointer';
        heading.style.userSelect = 'none';
        heading.textContent = (lanesCollapsed ? '▶ ' : '▼ ') + '🎙️ Pistas de toda esta sección';
        heading.onclick = () => {
          toggleAllLaneWraps();
          document.querySelectorAll('.s936tr-laneheading').forEach(h => {
            h.textContent = (lanesCollapsed ? '▶ ' : '▼ ') + '🎙️ Pistas de toda esta sección';
          });
          document.querySelectorAll('.s936tr-lanerows-box').forEach(b => {
            b.style.display = lanesCollapsed ? 'none' : '';
          });
        };
        wrap.appendChild(heading);
      }
      const groups = groupTakesByInstrument(sectionKey);
      listReservedInstruments(sectionKey).forEach(instrumentId => { if (!groups[instrumentId]) groups[instrumentId] = []; });
      const hideLabelColumn = !!(opts && opts.hideLabelColumn);
      const secondsPerBar = Number(opts && opts.secondsPerBar) > 0 ? Number(opts.secondsPerBar) : 0;
      // Owner: "se abre como las aguas del mar... queda en la línea de
      // las lyrics" -- ancho máximo real de ESTA sección (en px, 320 por
      // compás) para que la barra EN VIVO de una grabación (ver
      // startRecordTimer) nunca pueda crecer más allá de su propio
      // bloque y desbordarse sobre el de la siguiente sección.
      const sectionMaxWidthPx = Number(opts && opts.sectionBars) > 0 ? Number(opts.sectionBars) * 320 : 0;
      if (lanesCollapsed && !hideHeader) rowsBox.style.display = 'none';
      Object.keys(groups).forEach(instrumentId => {
        const row = buildLaneRow(sectionKey, instrumentId, groups[instrumentId], secondsPerBar, sectionMaxWidthPx);
        if (hideLabelColumn) row.classList.add("s936tr-lanerow-continuation");
        rowsBox.appendChild(row);
      });
      if (!hideLabelColumn) rowsBox.appendChild(buildAddInstrumentControl(sectionKey, wrap));
      wrap.appendChild(rowsBox);
      sectionEl.appendChild(wrap);
    } catch (e) {
      console.error('[Studio936TrackRecorder] renderSectionLanes falló:', e);
      if (!_laneDiagnosticShown) { _laneDiagnosticShown = true; toast('⚠️ Línea de pistas no se pudo dibujar: ' + (e && e.message ? e.message : 'error')); }
    }
  }

  function toggle() { if (panelEl && panelEl.style.display !== 'none') closePanel(); else openPanel(); }

  window.addEventListener('studio936:prepare-section-voice-rec', () => { currentInstrument = 'voz'; openPanel(); });
  window.addEventListener('studio936:prepare-section-instrument-rec', () => { currentInstrument = 'guitarra'; openPanel(); });

  window.Studio936TrackRecorder = {
    toggle, openPanel, closePanel, renderSectionLanes, buildAddInstrumentControl,
    isLanesCollapsed, toggleAllLaneWraps, setLanesCollapsed,
    getCurrentPlaybackSection, listRecordedInstruments, getLaneStateExternal,
    setLaneVolume, setLaneMute, setLanePan,
    startRecording, stopRecording, stopAndSaveTake,
    isRecordingActive: () => !!(mediaRecorder && mediaRecorder.state === 'recording')
  };
})();