// Studio 936 — Grabador de Pistas por Sección (Cambio 251)
//
// QUÉ ES: módulo nuevo, autosuficiente — no modifica el Chart
// (suite-pro-chart-v260-cambio100.js), ni audio-engine.js, ni transport.js,
// ni app.js. Se conecta a ellos solo a través de su API pública ya
// existente (window.Studio936SuiteProChart) y de un evento que el Chart
// ya dispara por su cuenta (studio936:chart-practice-start).
//
// QUÉ HACE (Cambio 251): agrega un selector "Voz / Guitarra / Piano /
// Batería / Otro" para grabar una pista real (micrófono o instrumento
// conectado, ej. vía interfaz USB tipo Flow 8) ligada a la sección
// actualmente seleccionada de la canción. Guarda cada toma con su
// instante de anclaje en el reloj de audio compartido
// (window.__studio936AudioCtx.currentTime), para que Cambio 252 pueda
// reproducirlas en sincronía exacta junto con el Play de esa sección y
// el resaltado de letra tipo karaoke — ese cableado de reproducción
// conjunta es la siguiente entrega, no esta.
//
// PERSISTENCIA: sigue el mismo patrón ya usado por
// suite-pro-structure-v489-cambio94.js — si el usuario configuró una
// carpeta local (File System Access API), el audio real se escribe ahí
// (subcarpeta "audio", igual que ya hace la Librería). Si no hay carpeta
// configurada, la toma queda disponible en memoria durante la sesión
// (Object URL) y su metadata en localStorage — igual de honesto que el
// resto de la app: sin carpeta configurada, no sobrevive a un cierre de
// pestaña, y eso se le avisa al usuario en el propio panel.
(function () {
  'use strict';

  const META_KEY = 's936_section_tracks_v1';
  const S936_API_BASE = 'https://studio936-escenario-api.ripuz.workers.dev';
  // Cambio 255: mismos canales que ya controla el Mixer de Compose
  // (suite-pro-channel-mixer.js) — se reutilizan, no se inventa un
  // sistema de mute nuevo.
  const BACKING_CHANNELS = ['drums', 'bass', 'chord', 'solo', 'piano', 'ukulele'];
  let muteBackingWhileRec = true;
  let mutedChannelsBeforeRec = null;
  const INSTRUMENTS = [
    { id: 'voz', label: 'Voz' },
    { id: 'guitarra', label: 'Guitarra' },
    { id: 'piano', label: 'Piano' },
    { id: 'bateria', label: 'Batería' },
    // Cambio 364: Val pidió que también aparezcan como opciones de pista.
    { id: 'tecladomidi', label: 'Teclado MIDI' },
    { id: 'setelectronico', label: 'Set electrónico' },
    { id: 'otro', label: 'Otro instrumento' }
  ];

  let panelEl = null;
  let mediaStream = null;
  let mediaRecorder = null;
  let recordedChunks = [];
  let recordStartedAt = null;
  let recordAnchorCtxTime = null;
  let recordTimerHandle = null;
  let recordSeconds = 0;
  let currentInstrument = 'voz';
  const objectUrlsById = {}; // takeId -> object URL en memoria, para esta sesión

  // ─── Utilidades básicas ────────────────────────────────────────────────

  function getMainAudioCtx() {
    return window.__studio936AudioCtx || null;
  }

  function getCurrentSectionKey() {
    try {
      const sel = document.getElementById('sectionSelect');
      if (sel && sel.value) return sel.value;
    } catch (_) {}
    return '__song__';
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

  function uid() {
    return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function toast(msg) {
    try {
      if (window.s936CloudToast) { window.s936CloudToast(msg, true); return; }
    } catch (_) {}
    console.log('[Track Recorder]', msg);
  }

  // ─── Metadata: lectura/escritura en localStorage ───────────────────────
  // Misma filosofía que SECTION_LYRICS_KEY del Chart: un solo objeto,
  // indexado por sección, con un arreglo de tomas dentro.

  function readMetaStore() {
    try {
      return JSON.parse(localStorage.getItem(META_KEY) || '{}');
    } catch (_) { return {}; }
  }

  function writeMetaStore(store) {
    try { localStorage.setItem(META_KEY, JSON.stringify(store)); } catch (_) {}
  }

  function listTakesForSection(sectionKey) {
    const store = readMetaStore();
    return store[sectionKey] || [];
  }

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

  // ─── Persistencia real del audio (carpeta configurada, si existe) ──────

  async function tryWriteBlobToConfiguredFolder(filename, blob) {
    try {
      const structureMod = window.Studio936SuiteProStructure;
      if (!structureMod || typeof structureMod.getLibraryAudioDirHandle !== 'function') return false;
      const dirHandle = await structureMod.getLibraryAudioDirHandle();
      if (!dirHandle) return false;
      const fh = await dirHandle.getFileHandle(filename, { create: true });
      const writable = await fh.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (e) {
      console.warn('[Track Recorder] no se pudo escribir a la carpeta configurada', e);
      return false;
    }
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

  // ─── Cambio 254: nube (R2 vía backend) ──────────────────────────────────

  function getCurrentCompositionId() {
    try { return window.Studio936Library?.getCurrentOpenCompositionId?.() || null; }
    catch (_) { return null; }
  }

  function getCurrentUser() {
    try { return window.Studio936Library?.getCurrentUser?.() || null; }
    catch (_) { return null; }
  }

  async function tryUploadTrackToCloud(sectionKey, instrumentId, label, blob, durationSec) {
    const compositionId = getCurrentCompositionId();
    const user = getCurrentUser();
    if (!user) return { ok: false, reason: 'no-session' };
    if (!compositionId) return { ok: false, reason: 'no-composition' };
    try {
      const params = new URLSearchParams({
        compositionId, section: sectionKey, instrument: instrumentId,
        label: label || '', durationSec: String(durationSec || 0)
      });
      const resp = await fetch(S936_API_BASE + '/api/tracks?' + params.toString(), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': blob.type || 'audio/webm' },
        body: blob
      });
      if (!resp.ok) return { ok: false, reason: 'http-' + resp.status };
      const data = await resp.json();
      return { ok: true, cloudTrackId: data.id, cloudFileUrl: data.fileUrl };
    } catch (e) {
      return { ok: false, reason: 'network' };
    }
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

  // ─── Grabación ──────────────────────────────────────────────────────────

  async function ensureMic() {
    if (mediaStream) return mediaStream;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast('⚠️ Este navegador no permite grabar audio.');
      return null;
    }
    try {
      // Nota honesta: esto pide el micrófono/entrada de audio que el
      // sistema operativo tenga seleccionada por defecto. Si el usuario
      // quiere grabar desde una interfaz externa (ej. Flow 8 con una
      // guitarra conectada), debe elegirla como entrada de audio del
      // SISTEMA antes de darle "Habilitar entrada" aquí — el navegador no
      // permite (todavía, de forma confiable en todos los navegadores)
      // elegir el dispositivo de entrada específico desde código.
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return mediaStream;
    } catch (e) {
      toast('⚠️ No se pudo acceder al micrófono/entrada de audio.');
      return null;
    }
  }

  function stopRecordTimer() {
    if (recordTimerHandle) { clearInterval(recordTimerHandle); recordTimerHandle = null; }
  }

  function startRecordTimer() {
    stopRecordTimer();
    recordSeconds = 0;
    recordTimerHandle = setInterval(() => {
      recordSeconds += 1;
      const timerEl = panelEl && panelEl.querySelector('.s936tr-timer');
      if (timerEl) timerEl.textContent = fmtTime(recordSeconds);
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
      BACKING_CHANNELS.forEach(key => {
        bridge.setChannelMute?.(key, !!mutedChannelsBeforeRec[key]);
      });
    } catch (_) {}
    mutedChannelsBeforeRec = null;
  }

  async function startRecording() {
    const stream = await ensureMic();
    if (!stream) return;

    recordedChunks = [];
    let mimeType = '';
    try {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
    } catch (_) {}

    try {
      mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch (e) {
      toast('⚠️ Este navegador no permite grabar con MediaRecorder.');
      return;
    }

    mediaRecorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) recordedChunks.push(ev.data);
    };

    const ctx = getMainAudioCtx();
    recordAnchorCtxTime = ctx ? ctx.currentTime : null;
    recordStartedAt = Date.now();

    // Cambio 255: si el usuario dejó marcado "silenciar fondo", se
    // silencian los canales del groove ANTES de arrancar el Play — así lo
    // que se escuche por bocinas (y podría colarse por el micrófono) no
    // suena, aunque el reloj interno del groove sí siga corriendo para
    // mantener la sincronía con lo que grabas.
    muteBackingChannels();

    // Cambio 255: grabar ahora también arranca el Play de la sección
    // actual al mismo tiempo — para que siempre haya base/click contra la
    // cual cantar o tocar, en vez de grabar sobre silencio.
    try {
      const sectionKey = getCurrentSectionKey();
      window.Studio936SuiteProChart?.startChartSectionPractice?.(null, sectionKey);
    } catch (_) {}

    mediaRecorder.start();
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
      // Cambio 255: detener la grabación también detiene el Play de la
      // sección y restaura el fondo a como estaba antes de silenciarlo.
      try { window.Studio936SuiteProChart?.stopChartRhythmConsole?.({ stopAudio: true, stopBridge: true }); } catch (_) {}
      restoreBackingChannels();
    });
  }

  let pendingBlob = null;
  let pendingObjectUrl = null;

  async function handleRecClick() {
    const live = mediaRecorder && mediaRecorder.state === 'recording';
    if (live) {
      const blob = await stopRecording();
      if (blob) {
        pendingBlob = blob;
        if (pendingObjectUrl) { try { URL.revokeObjectURL(pendingObjectUrl); } catch (_) {} }
        pendingObjectUrl = URL.createObjectURL(blob);
      }
      renderPanelBody();
    } else {
      pendingBlob = null;
      if (pendingObjectUrl) { try { URL.revokeObjectURL(pendingObjectUrl); } catch (_) {} pendingObjectUrl = null; }
      await startRecording();
    }
  }

  function discardPending() {
    pendingBlob = null;
    if (pendingObjectUrl) { try { URL.revokeObjectURL(pendingObjectUrl); } catch (_) {} pendingObjectUrl = null; }
    recordSeconds = 0;
    renderPanelBody();
  }

  async function saveTake() {
    if (!pendingBlob) return;
    const sectionKey = getCurrentSectionKey();
    const instrumentInfo = INSTRUMENTS.find(i => i.id === currentInstrument) || INSTRUMENTS[0];
    const id = uid();
    const ext = (pendingBlob.type || '').includes('webm') ? 'webm' : 'audio';
    const fileName = `pista-${sectionKey}-${currentInstrument}-${id}.${ext}`;

    const savedToDisk = await tryWriteBlobToConfiguredFolder(fileName, pendingBlob);

    const take = {
      id,
      section: sectionKey,
      instrument: currentInstrument,
      instrumentLabel: instrumentInfo.label,
      label: instrumentInfo.label + ' · ' + fmtTime(recordSeconds),
      fileName: savedToDisk ? fileName : null,
      savedToDisk: !!savedToDisk,
      savedToCloud: false,
      cloudTrackId: null,
      cloudFileUrl: null,
      createdAt: Date.now(),
      durationSec: recordSeconds,
      anchorAudioCtxTime: recordAnchorCtxTime // para Cambio 252
    };

    saveTakeMeta(sectionKey, take);

    // Guarda también en memoria para esta sesión, para poder escuchar la
    // toma de una vez sin depender de la carpeta configurada.
    objectUrlsById[id] = pendingObjectUrl;
    const blobForCloud = pendingBlob;
    pendingObjectUrl = null;
    pendingBlob = null;
    recordSeconds = 0;

    toast(savedToDisk
      ? '🎙️ Pista guardada en tu carpeta y lista para esta sección.'
      : '🎙️ Pista guardada en esta sesión (configura una carpeta local para que sobreviva a cerrar la pestaña).');

    renderPanelBody();

    // Cambio 254: subir a la nube (R2), sin bloquear ni deshacer el
    // guardado local si esto falla — la copia local ya está a salvo.
    const cloudResult = await tryUploadTrackToCloud(sectionKey, currentInstrument, take.label, blobForCloud, take.durationSec);
    if (cloudResult.ok) {
      updateTakeMeta(sectionKey, id, {
        savedToCloud: true,
        cloudTrackId: cloudResult.cloudTrackId,
        cloudFileUrl: cloudResult.cloudFileUrl
      });
      toast('☁️ Pista también guardada en la nube.');
    } else if (cloudResult.reason === 'no-session') {
      toast('☁️ Pista NO subida a la nube — inicia sesión para respaldarla ahí también.');
    } else if (cloudResult.reason === 'no-composition') {
      toast('☁️ Pista NO subida a la nube — guarda primero la canción en la Librería.');
    } else {
      toast('⚠️ No se pudo subir la pista a la nube (se quedó en tu copia local).');
    }
    renderPanelBody();
  }

  async function ensureTakePlayable(take) {
    if (objectUrlsById[take.id]) return objectUrlsById[take.id];
    if (take.fileName) {
      const file = await tryRestoreBlobFromConfiguredFolder(take.fileName);
      if (file) {
        const url = URL.createObjectURL(file);
        objectUrlsById[take.id] = url;
        return url;
      }
    }
    // Cambio 254: si no está en disco ni en memoria, pero sí se subió a la
    // nube en su momento, se recupera de ahí — esto es justo lo que evita
    // que una pista quede "perdida" solo por cerrar la pestaña sin carpeta
    // configurada.
    if (take.savedToCloud && take.cloudFileUrl) {
      const blob = await tryFetchBlobFromCloud(take);
      if (blob) {
        const url = URL.createObjectURL(blob);
        objectUrlsById[take.id] = url;
        return url;
      }
    }
    return null;
  }

  function removeTake(sectionKey, takeId) {
    const takes = listTakesForSection(sectionKey);
    const take = takes.find(t => t.id === takeId);
    deleteTakeMeta(sectionKey, takeId);
    if (objectUrlsById[takeId]) {
      try { URL.revokeObjectURL(objectUrlsById[takeId]); } catch (_) {}
      delete objectUrlsById[takeId];
    }
    if (take && take.savedToCloud && take.cloudTrackId) {
      fetch(S936_API_BASE + '/api/tracks/' + encodeURIComponent(take.cloudTrackId), {
        method: 'DELETE',
        credentials: 'include'
      }).catch(() => {});
    }
    renderPanelBody();
  }

  // ─── UI: panel flotante ─────────────────────────────────────────────────

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
      .s936tr-panel{position:fixed;top:90px;right:24px;width:340px;max-width:92vw;
        background:linear-gradient(155deg,rgba(14,26,26,.97),rgba(10,18,18,.97));
        border:1px solid rgba(91,232,201,.28);border-radius:16px;box-shadow:0 18px 48px rgba(0,0,0,.5);
        z-index:9999;color:#e8f4f2;font-family:inherit;backdrop-filter:blur(10px);}
      .s936tr-head{display:flex;align-items:center;justify-content:space-between;
        padding:14px 16px;border-bottom:1px solid rgba(91,232,201,.16);}
      .s936tr-title{font-weight:800;font-size:.92rem;color:#5be8c9;letter-spacing:.3px;}
      .s936tr-close{background:none;border:none;color:#9fd8cc;font-size:1.1rem;cursor:pointer;line-height:1;}
      .s936tr-body{padding:14px 16px;max-height:60vh;overflow-y:auto;}
      .s936tr-section{font-size:.78rem;color:#9fd8cc;margin-bottom:10px;}
      .s936tr-section b{color:#e8f4f2;}
      .s936tr-folder-row{display:flex;flex-direction:column;gap:6px;margin-bottom:12px;
        padding:8px 10px;border-radius:8px;background:rgba(255,255,255,.03);}
      .s936tr-folder-ok{font-size:.74rem;color:#5be8c9;}
      .s936tr-folder-warn{font-size:.74rem;color:#ffc98a;}
      .s936tr-folder-btn{align-self:flex-start;background:rgba(91,232,201,.14);border:1px solid rgba(91,232,201,.35);
        color:#5be8c9;border-radius:7px;padding:5px 10px;font-size:.72rem;cursor:pointer;font-weight:700;}
      .s936tr-select{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(91,232,201,.25);
        border-radius:8px;color:#e8f4f2;padding:8px 10px;font-size:.85rem;margin-bottom:12px;}
      .s936tr-mute-row{display:flex;align-items:center;gap:8px;font-size:.74rem;color:#9fd8cc;
        margin-bottom:12px;cursor:pointer;}
      .s936tr-mute-row input{cursor:pointer;}
      .s936tr-recrow{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
      .s936tr-recbtn{flex:1;padding:10px;border-radius:10px;border:1px solid rgba(255,120,120,.4);
        background:rgba(255,80,80,.14);color:#ffb3b3;font-weight:700;cursor:pointer;font-size:.85rem;}
      .s936tr-recbtn.live{background:rgba(255,60,60,.35);color:#fff;}
      .s936tr-timer{font-variant-numeric:tabular-nums;font-size:.85rem;color:#9fd8cc;min-width:48px;text-align:right;}
      .s936tr-pending{border:1px dashed rgba(91,232,201,.35);border-radius:10px;padding:10px;margin-bottom:12px;}
      .s936tr-pending audio{width:100%;margin:8px 0;}
      .s936tr-actions{display:flex;gap:8px;}
      .s936tr-btn{flex:1;padding:8px 10px;border-radius:8px;border:1px solid rgba(91,232,201,.3);
        background:rgba(91,232,201,.12);color:#e8f4f2;font-size:.8rem;cursor:pointer;font-weight:600;}
      .s936tr-btn.secondary{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.15);color:#c9d8d5;}
      .s936tr-btn.danger{background:rgba(255,80,80,.12);border-color:rgba(255,120,120,.3);color:#ffb3b3;}
      .s936tr-list h5{font-size:.75rem;color:#9fd8cc;text-transform:uppercase;letter-spacing:.6px;margin:14px 0 8px;}
      .s936tr-take{border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:8px 10px;margin-bottom:8px;}
      .s936tr-take.is-lost{border-color:rgba(255,180,120,.35);background:rgba(255,180,120,.05);}
      .s936tr-take-head{display:flex;justify-content:space-between;align-items:center;font-size:.82rem;margin-bottom:6px;}
      .s936tr-take-del{background:none;border:none;color:#ff9d9d;cursor:pointer;font-size:.75rem;}
      .s936tr-take audio{width:100%;}
      .s936tr-take-actions{margin-top:6px;}
      .s936tr-btn.small{padding:5px 8px;font-size:.72rem;flex:none;}
      .s936tr-hint{font-size:.72rem;color:#7fa8a0;margin-top:10px;line-height:1.4;}
      .s936tr-empty{font-size:.78rem;color:#7fa8a0;font-style:italic;}
      .s936tr-lanewrap{padding:6px 4px 2px;display:flex;flex-direction:column;gap:5px;}
      .s936tr-laneheading{font-size:.62rem;color:#7fa8a0;text-transform:uppercase;letter-spacing:.5px;
        font-weight:700;margin-bottom:1px;}
      /* Cambio 368: Val aclaró que quería una columna FIJA real (como en
         cualquier DAW: encabezado de pista a la izquierda, línea de
         tiempo a la derecha) — no apilar el nombre arriba de la barra
         (eso fue el intento del Cambio 366, que resultó no ser lo que
         pedía). El ancho (96px) es el MISMO que .s936-ch-cont-headerspacer
         en suite-pro-chart-v260-cambio100.js — si alguno de los dos
         cambia, hay que cambiar el otro para que sigan alineados. */
      /* Cambio 423: 160px → 320px — esta medida está pensada para
         coincidir EXACTO con el ancho de la barra de Chart/Lyric en
         suite-pro-chart-v260-cambio100.js (.s936-ch-cont-headerspacer).
         Si se vuelve a cambiar uno de los dos, hay que cambiar el otro
         también, o se pierde la alineación entre filas — ya pasó una
         vez (esta corrección) porque el ancho del Chart se actualizó
         varias veces sin acordarse de este archivo. */
      .s936tr-lanerow{display:grid;grid-template-columns:320px 1fr;align-items:center;gap:3px;}
      /* Cambio 426: variante "continuación" — sin columna de nombre, la
         tira de color ocupa el 100% desde el borde, para conectar sin
         corte con la tira de la sección anterior. */
      .s936tr-lanerow-continuation{grid-template-columns:0 1fr;gap:0}
      .s936tr-lanerow-continuation .s936tr-lanelabel{display:none}
      /* Cambio 423: mismo estilo visual (fondo oscuro redondeado, alto
         mínimo) que .s936-ch-mini-sesion-spacer del Chart — Val pidió
         que la barra de instrumentos se vea igual, no distinta. */
      .s936tr-lanelabel{
        display:flex;align-items:center;gap:2px;overflow:hidden;
        background:rgba(255,255,255,.05);border-radius:5px;
        box-sizing:border-box;min-height:56px;padding:0 6px;
      }
      .s936tr-laneicon{display:flex;align-items:center;justify-content:center;width:18px;height:18px;
        margin-right:2px;cursor:default;font-size:12px;flex-shrink:0;}
      .s936tr-lanebtn{width:16px;height:16px;padding:0;border:none;background:none;border-radius:3px;
        display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;
        color:rgba(255,255,255,.65);font-size:8px;line-height:1;}
      .s936tr-lanebtn:hover{background:rgba(255,255,255,.08);}
      .s936tr-lanebtn.is-active{background:rgba(255,120,120,.22);color:#ff9d9d;}
      .s936tr-lanetrack{height:7px;border-radius:4px;cursor:default;width:100%;}
      .s936tr-laneadd{position:relative;padding-left:0;margin-top:2px;}
      .s936tr-laneaddbtn{width:20px;height:20px;padding:0;border-radius:50%;
        border:1px solid rgba(91,232,201,.35);background:rgba(91,232,201,.1);color:#5be8c9;
        display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:11px;line-height:1;}
      .s936tr-laneaddbtn:hover{background:rgba(91,232,201,.2);}
      .s936tr-lanepicker{display:none;position:absolute;left:26px;top:0;background:#0d1a1a;
        border:1px solid rgba(91,232,201,.3);border-radius:8px;padding:3px;gap:2px;z-index:20;
        box-shadow:0 8px 24px rgba(0,0,0,.5);}
      .s936tr-lanepicker button{width:24px;height:24px;padding:0;border:none;background:none;
        border-radius:5px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:13px;}
      .s936tr-lanepicker button:hover{background:rgba(255,255,255,.08);}
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

    // Cambio 251 (arreglo de guardado): aviso claro de si hay carpeta
    // configurada o no — sin esto, una toma grabada sin carpeta se pierde
    // en silencio al cerrar la pestaña, y el usuario no se entera hasta
    // que la busca y no está.
    const hasFolder = !!localStorage.getItem('s936_library_dir_name');
    const folderRow = el('div', 's936tr-folder-row');
    if (hasFolder) {
      folderRow.appendChild(el('span', 's936tr-folder-ok', '💾 Carpeta configurada: lo que grabes queda guardado de verdad.'));
    } else {
      folderRow.appendChild(el('span', 's936tr-folder-warn', '⚠️ Sin carpeta configurada: lo que grabes se pierde al cerrar esta pestaña.'));
      const cfgBtn = el('button', 's936tr-folder-btn', '📁 Configurar carpeta ahora');
      cfgBtn.onclick = () => {
        try { window.Studio936SuiteProStructure?.openLibraryConfig?.({}); } catch (_) {}
      };
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

    // Cambio 255: interruptor para silenciar el fondo mientras se graba
    // (evita que se cuele por el micrófono si estás en bocinas, no
    // audífonos). El groove sigue sonando "por dentro" para mantener el
    // reloj — solo se silencia lo que sale por las bocinas.
    const muteRow = el('label', 's936tr-mute-row');
    const muteCheckbox = document.createElement('input');
    muteCheckbox.type = 'checkbox';
    muteCheckbox.checked = muteBackingWhileRec;
    muteCheckbox.onchange = () => { muteBackingWhileRec = muteCheckbox.checked; };
    muteRow.appendChild(muteCheckbox);
    muteRow.appendChild(document.createTextNode(' Silenciar fondo mientras grabo (usa audífonos si lo desmarcas)'));
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
      pending.appendChild(el('div', '', 'Toma lista — escúchala antes de guardar:'));
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
    if (!takes.length) {
      listWrap.appendChild(el('div', 's936tr-empty', 'Todavía no hay pistas grabadas aquí.'));
    } else {
      takes.forEach(take => {
        const box = el('div', 's936tr-take');
        const head = el('div', 's936tr-take-head');
        head.appendChild(el('span', '', take.label + (take.savedToDisk ? ' 💾' : ' (solo esta sesión)') + (take.savedToCloud ? ' ☁️' : '')));
        const delBtn = el('button', 's936tr-take-del', '✕ borrar');
        delBtn.onclick = () => removeTake(sectionKey, take.id);
        head.appendChild(delBtn);
        box.appendChild(head);

        const audio = document.createElement('audio');
        audio.controls = true;
        box.appendChild(audio);

        const takeActions = el('div', 's936tr-take-actions');
        const dlBtn = el('button', 's936tr-btn secondary small', '⬇ Descargar');
        dlBtn.disabled = true;
        takeActions.appendChild(dlBtn);
        box.appendChild(takeActions);

        ensureTakePlayable(take).then(url => {
          if (url) {
            audio.src = url;
            dlBtn.disabled = false;
            dlBtn.onclick = () => {
              // Cambio 251 (arreglo): cada pista es un archivo de audio
              // estándar (.webm) — se puede descargar y llevar a
              // cualquier otra herramienta, no queda encerrada aquí.
              const a = document.createElement('a');
              a.href = url;
              a.download = (take.fileName || (take.label.replace(/[^a-z0-9]+/gi, '-') + '.webm'));
              document.body.appendChild(a);
              a.click();
              a.remove();
            };
          } else {
            // Ficha sin audio disponible: no se saved a disco y ya no
            // está en memoria (sesión anterior cerrada). Se avisa en vez
            // de dejar un reproductor mudo sin explicación.
            box.classList.add('is-lost');
            head.querySelector('span').textContent = take.label + ' — ⚠️ audio perdido (no se guardó en disco)';
            audio.remove();
          }
        });

        listWrap.appendChild(box);
      });
    }
    body.appendChild(listWrap);

    const hint = el('div', 's936tr-hint',
      'Para grabar desde una interfaz externa (ej. Flow 8 con guitarra conectada), selecciónala como entrada de audio del sistema antes de grabar. Al darle Play a esta sección desde el Chart, las pistas guardadas aquí suenan junto con el groove — como referencia, no con precisión de estudio profesional todavía.');
    body.appendChild(hint);
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
  }

  function closePanel() {
    if (panelEl) panelEl.style.display = 'none';
  }

  // ─── Cambio 252: reproducción sincronizada con el Play de la sección ───
  //
  // Nota honesta sobre precisión: esto usa elementos <audio> normales, no
  // el reloj de muestra exacta de Web Audio (AudioBufferSourceNode +
  // ctx.currentTime). Eso significa que puede haber unos pocos
  // milisegundos de desfase — imperceptible para escuchar una referencia
  // mientras compones, pero no es el nivel de precisión de un canal real
  // de estudio. Si más adelante hace falta esa precisión exacta (para el
  // sistema de canales real del Studio), se puede reconstruir con
  // AudioBufferSourceNode anclado a ctx.currentTime — pieza aparte, no
  // esta.
  const playingTrackEls = [];

  function stopSyncedPlayback() {
    while (playingTrackEls.length) {
      const audioEl = playingTrackEls.pop();
      try { audioEl.pause(); audioEl.currentTime = 0; } catch (_) {}
    }
  }

  async function startSyncedPlaybackForSection(sectionKey) {
    stopSyncedPlayback();
    const takes = listTakesForSection(sectionKey);
    if (!takes.length) return;
    for (const take of takes) {
      const url = await ensureTakePlayable(take);
      if (!url) continue; // toma perdida (sin carpeta configurada) — se salta, no rompe el Play
      const audioEl = new Audio(url);
      audioEl.currentTime = 0;
      try { await audioEl.play(); } catch (_) {}
      playingTrackEls.push(audioEl);
    }
  }

  window.addEventListener('studio936:chart-practice-start', (ev) => {
    const sectionKey = ev?.detail?.section || getCurrentSectionKey();
    startSyncedPlaybackForSection(sectionKey);
  });

  window.addEventListener('studio936:chart-practice-stop', () => {
    stopSyncedPlayback();
  });

  installStyles();

  // ─── Cambio 258: línea de pistas real, dentro del Chart ─────────────────
  // Diseño validado con Val en 7 rondas de mockup: columna angosta de solo
  // iconos (icono → play → mute → solo → borrar), tooltip con el nombre al
  // pasar el mouse, línea con marcas por compás, botón "+" compacto para
  // agregar instrumento nuevo. Sin texto visible de nombre — ahorra ancho
  // junto al Dock, que ya es amplio de por sí.
  const LANE_INSTRUMENTS = INSTRUMENTS; // Voz/Guitarra/Piano/Batería/Otro, ya definidos arriba
  // Cambio 258 (corrección): Tabler Icons NO está cargado en index.html —
  // se usan emojis, mismo criterio que el resto de la app (🎙️, 💾, ☁️...).
  const LANE_ICONS = {
    voz: '🎤', guitarra: '🎸', piano: '🎹',
    bateria: '🥁', tecladomidi: '🎛️', setelectronico: '💻', otro: '🎵'
  };
  const LANE_COLORS = {
    voz: '#378ADD', guitarra: '#639922', piano: '#7F77DD',
    bateria: '#D4537E', tecladomidi: '#EF9F27', setelectronico: '#5DCAA5', otro: '#888780'
  };
  // Estado de mute/solo/pan por sección+instrumento — ajuste de SESIÓN,
  // mismo criterio ya usado en suite-pro-channel-mixer.js (no se guarda
  // todavía). Cambio 364: se agrega "pan" (balance izq/der, -1 a 1) al
  // mismo nivel que mute/solo — AVISO: por ahora es solo estado visual,
  // igual que mute/solo ya eran antes de este cambio — playInstrumentGroup
  // reproduce con un <audio> simple, sin pasar por ningún nodo de Web
  // Audio que respete mute/solo/pan todavía. Conectarlo a audio real de
  // verdad es un cambio aparte (requiere AudioContext + StereoPannerNode +
  // GainNode en vez de `new Audio()` directo).
  const laneMuteSolo = {}; // { [sectionKey]: { [instrumentId]: {muted, solo, pan} } }
  function getLaneState(sectionKey, instrumentId) {
    if (!laneMuteSolo[sectionKey]) laneMuteSolo[sectionKey] = {};
    if (!laneMuteSolo[sectionKey][instrumentId]) laneMuteSolo[sectionKey][instrumentId] = { muted: false, solo: false, pan: 0 };
    return laneMuteSolo[sectionKey][instrumentId];
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

  function tickBackgroundStyle() {
    return 'repeating-linear-gradient(to right, transparent 0, transparent calc(25% - 1px), rgba(255,255,255,.22) calc(25% - 1px), rgba(255,255,255,.22) 25%)';
  }

  function laneMiniBtn(symbol, title, color, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 's936tr-lanebtn';
    b.title = title;
    b.setAttribute('aria-label', title);
    b.textContent = symbol;
    if (color) b.style.color = color;
    b.onclick = (e) => { e.stopPropagation(); onClick(e); };
    return b;
  }

  async function playInstrumentGroup(takes) {
    for (const take of takes) {
      const url = await ensureTakePlayable(take);
      if (!url) continue;
      const a = new Audio(url);
      a.play().catch(() => {});
    }
  }

  function buildLaneRow(sectionKey, instrumentId, takes) {
    const info = INSTRUMENTS.find(i => i.id === instrumentId) || INSTRUMENTS[INSTRUMENTS.length - 1];
    const color = LANE_COLORS[instrumentId] || LANE_COLORS.otro;
    const icon = LANE_ICONS[instrumentId] || LANE_ICONS.otro;
    const state = getLaneState(sectionKey, instrumentId);

    const row = document.createElement('div');
    row.className = 's936tr-lanerow';

    const label = document.createElement('div');
    label.className = 's936tr-lanelabel';

    const iconSpan = document.createElement('span');
    iconSpan.className = 's936tr-laneicon';
    iconSpan.title = info.label;
    iconSpan.textContent = icon;

    // Cambio 367: el nombre del instrumento ahora se ve escrito, no solo
    // como tooltip del ícono — Val no reconocía qué instrumento era cada
    // fila porque antes solo había un emoji, sin texto.
    const nameSpan = document.createElement('span');
    nameSpan.className = 's936tr-lanename';
    nameSpan.textContent = info.label;
    nameSpan.style.cssText = 'font-size:.62rem;font-weight:700;color:' + color + ';margin-right:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:52px;';

    const track = document.createElement('div');
    track.className = 's936tr-lanetrack';
    track.title = info.label;
    track.style.backgroundColor = color;
    track.style.backgroundImage = tickBackgroundStyle();
    track.style.opacity = state.muted ? '0.2' : '0.55';

    const playBtn = laneMiniBtn('▶', 'Escuchar ' + info.label, color, () => playInstrumentGroup(takes));
    const muteBtn = laneMiniBtn(state.muted ? '🔇' : '🔊', 'Silenciar ' + info.label, null, () => {
      state.muted = !state.muted;
      track.style.opacity = state.muted ? '0.2' : '0.55';
      muteBtn.textContent = state.muted ? '🔇' : '🔊';
      muteBtn.classList.toggle('is-active', state.muted);
    });
    const soloBtn = laneMiniBtn('🎧', 'Solo ' + info.label, null, () => {
      state.solo = !state.solo;
      soloBtn.classList.toggle('is-active', state.solo);
      soloBtn.style.color = state.solo ? color : '';
    });
    // Cambio 364: Pan (balance izquierda/derecha), -1 a 1. Estado visual
    // por ahora — ver aviso arriba de getLaneState.
    const panSlider = document.createElement('input');
    panSlider.type = 'range';
    panSlider.min = '-1'; panSlider.max = '1'; panSlider.step = '0.1';
    panSlider.value = String(state.pan || 0);
    panSlider.title = 'Balance izquierda/derecha';
    panSlider.style.cssText = 'width:42px;height:16px;vertical-align:middle;';
    panSlider.oninput = () => { state.pan = Number(panSlider.value); };
    const delBtn = laneMiniBtn('🗑', 'Borrar ' + info.label, null, () => {
      takes.forEach(t => removeTake(sectionKey, t.id));
      row.remove();
    });

    label.append(iconSpan, nameSpan, playBtn, muteBtn, soloBtn, panSlider, delBtn);

    // Cambio 364: canal MIDI (1-16) — solo tiene sentido para la pista de
    // Teclado MIDI, ninguna otra lo necesita.
    if (instrumentId === 'tecladomidi') {
      const midiSelect = document.createElement('select');
      midiSelect.title = 'Canal MIDI';
      midiSelect.style.cssText = 'font-size:10px;background:#1c2731;color:#e6edf3;border:1px solid #2a3844;border-radius:6px;padding:1px 3px;';
      for (let ch = 1; ch <= 16; ch++) {
        const opt = document.createElement('option');
        opt.value = String(ch);
        opt.textContent = 'Ch ' + ch;
        midiSelect.appendChild(opt);
      }
      midiSelect.value = String(state.midiChannel || 1);
      midiSelect.onchange = () => { state.midiChannel = Number(midiSelect.value); };
      label.appendChild(midiSelect);
    }
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
    addBtn.setAttribute('aria-label', 'Agregar instrumento');
    addBtn.textContent = '+';

    const picker = document.createElement('div');
    picker.className = 's936tr-lanepicker';
    picker.style.display = 'none';
    LANE_INSTRUMENTS.forEach(inst => {
      const b = document.createElement('button');
      b.type = 'button';
      b.title = inst.label;
      b.setAttribute('aria-label', inst.label);
      b.textContent = LANE_ICONS[inst.id] || '🎵';
      b.onclick = (e) => {
        e.stopPropagation();
        picker.style.display = 'none';
        // Reutiliza el panel de grabación real ya construido — no se
        // duplica lógica de grabar, solo se abre preseleccionado.
        currentInstrument = inst.id;
        openPanel();
      };
      picker.appendChild(b);
    });
    addBtn.onclick = (e) => {
      e.stopPropagation();
      picker.style.display = picker.style.display === 'none' ? 'flex' : 'none';
    };

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
      // Cambio 379/381: opts.hideHeader oculta SOLO el título de texto
      // ("🎙️ Pistas de toda esta sección") — las filas de instrumento y
      // el "+" para agregar uno más siguen apareciendo igual que siempre,
      // como su propia fila al final. El Chart (Vista Continua) usa esto
      // porque ya tiene sus propios íconos fijos de Chart/Lyric arriba;
      // Arreglo de la Canción sigue llamando esta función sin opts, sin
      // cambios.
      const hideHeader = !!(opts && opts.hideHeader);
      if (!hideHeader) {
        // Cambio 258 (arreglo): sin esta etiqueta, cuando una sección tiene
        // más de 4 compases (se dibuja en varias filas), la línea de pistas
        // parece pertenecer solo a la última fila — aunque en realidad
        // representa TODA la sección (se graba de corrido, no por compás).
        const heading = document.createElement('div');
        heading.className = 's936tr-laneheading';
        heading.textContent = '🎙️ Pistas de toda esta sección';
        wrap.appendChild(heading);
      }
      const groups = groupTakesByInstrument(sectionKey);
      // Cambio 426: opts.hideLabelColumn — para Vista Continua, donde el
      // Chart pidió que la tira de color de cada instrumento sea UNA
      // sola, corrida de punta a punta de toda la canción (no una por
      // sección). Como renderSectionLanes se llama UNA VEZ POR SECCIÓN
      // (bloque), sin esto cada sección volvía a reservar sus propios
      // 320px para el nombre del instrumento — eso cortaba la tira
      // continua, viéndose como una línea/corte al empezar cada sección
      // nueva. Con hideLabelColumn, esa sección solo dibuja la
      // continuación de la tira de color, sin repetir la columna del
      // nombre.
      const hideLabelColumn = !!(opts && opts.hideLabelColumn);
      Object.keys(groups).forEach(instrumentId => {
        const row = buildLaneRow(sectionKey, instrumentId, groups[instrumentId]);
        if (hideLabelColumn) {
          row.classList.add("s936tr-lanerow-continuation");
        }
        wrap.appendChild(row);
      });
      if (!hideLabelColumn) {
        wrap.appendChild(buildAddInstrumentControl(sectionKey, wrap));
      }
      sectionEl.appendChild(wrap);
    } catch (e) {
      // Cambio 258 (diagnóstico): si algo falla aquí, antes quedaba mudo
      // (protegido por el try/catch del Chart) y no había forma de saber
      // por qué sin abrir DevTools. Ahora avisa en pantalla, una sola vez
      // por sesión, con el mensaje real del error.
      console.error('[Studio936TrackRecorder] renderSectionLanes falló:', e);
      if (!_laneDiagnosticShown) {
        _laneDiagnosticShown = true;
        toast('⚠️ La línea de pistas no se pudo dibujar: ' + (e && e.message ? e.message : 'error desconocido'));
      }
    }
  }

  function toggle() {
    if (panelEl && panelEl.style.display !== 'none') closePanel();
    else openPanel();
  }

  // Cambio 251 (corrección): "REC Voz" y "REC Instrumento" ya existían como
  // botones en la Consola de Sesión (panel izquierdo del Zoom de sección),
  // pero disparaban un evento que nadie escuchaba — al hacer clic no pasaba
  // nada más que un aviso de texto. Aquí se conectan esos dos botones ya
  // existentes con el panel real de grabación, sin tocar el archivo que
  // los dibuja (suite-pro-structure-v489-cambio94.js): solo se escucha el
  // mismo evento que ese botón ya venía disparando desde hace varios
  // Cambios, y se abre el panel con el instrumento correcto preseleccionado.
  window.addEventListener('studio936:prepare-section-voice-rec', () => {
    currentInstrument = 'voz';
    openPanel();
  });
  window.addEventListener('studio936:prepare-section-instrument-rec', () => {
    // El botón "REC Instrumento" no dice cuál instrumento — se abre el
    // panel con Guitarra preseleccionada (la opción más común) y el
    // usuario cambia a Piano/Batería/Otro en el propio selector si hace falta.
    currentInstrument = 'guitarra';
    openPanel();
  });

  window.Studio936TrackRecorder = { toggle, openPanel, closePanel, renderSectionLanes, buildAddInstrumentControl };
})();
