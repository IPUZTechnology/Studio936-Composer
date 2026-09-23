// Studio 936 — Pentagrama (notación tradicional) por sección, integrado a Vista Continua.
//
// Owner: Val trajo un prototipo aparte ("Studio936 DAW - Master Edition") con un
// pentagrama real dibujado en canvas (clave de sol, plicas, corcheas con corchete,
// líneas adicionales, barras de repetición), un algoritmo matemático de Auto-Acordes,
// y un "Oído IA" que transcribe voz/guitarra grabada a notas+acordes+secciones vía
// Gemini. Pidió mantener EXACTAMENTE ese diseño visual, pero puesto DEBAJO de Chart
// y de la letra/karaoke en Vista Continua, y HORIZONTAL a lo largo del tiempo real de
// la canción (el prototipo original lo dibujaba en sistemas verticales, como una
// partitura impresa) -- no como una página aparte con su propio estado, sino leyendo
// y escribiendo la sección REAL de la canción (misma instanceKey que ya usa
// track-recorder.js para Voz, para que "Coro"/"Coro BIS" no compartan pentagrama sin
// querer).
//
// PASO 1: el dibujo del pentagrama + poner notas a mano con clic, igual que el
// prototipo. PASO 2 (Auto-Acordes) y PASO 3 (Oído IA) están más abajo en este
// mismo archivo, sobre esta misma base de datos.
(function () {
  'use strict';

  const PENTAGRAM_KEY = 's936_section_pentagram_v1';
  // Owner: BUG DE RAÍZ encontrado al verificar Auto-Acordes -- escribir
  // acordes solo en project.sections (vía el bridge) no bastaba, porque el
  // Chart (readStructureDraftSnapshot, mismo archivo que ya arregló el
  // Cambio 422) usa SIEMPRE el borrador de Estructura como fuente
  // PRIMARIA de acordes en cuanto existe (draft.clones[sección].items) --
  // project.sections queda como último recurso. Sin escribir acá también,
  // "Auto-Acordes" guardaba bien pero no se veía en pantalla. Se escribe
  // en los dos lugares para que se vea siempre, exista o no un borrador.
  const STRUCTURE_DRAFT_KEY = 's936_suitepro_structure_v4';
  const PX_PER_BAR = 320; // mismo ancho por compás que ya usa toda Vista Continua
  const LINE_GAP = 8;
  const TOP_PAD = 30;
  const WHITE_KEYS = [48,50,52,53,55,57,59,60,62,64,65,67,69,71,72,74,76,77,79,81,83,84,86,88,89,91,93,95,96];

  function readStore() {
    try { return JSON.parse(localStorage.getItem(PENTAGRAM_KEY) || '{}'); } catch (_) { return {}; }
  }
  function writeStore(store) {
    try { localStorage.setItem(PENTAGRAM_KEY, JSON.stringify(store)); } catch (_) {}
  }
  function getNotes(sectionKey) {
    const store = readStore();
    return (store[sectionKey] && Array.isArray(store[sectionKey].notes)) ? store[sectionKey].notes : [];
  }
  function setNotes(sectionKey, notes) {
    const store = readStore();
    store[sectionKey] = Object.assign({}, store[sectionKey], { notes, updatedAt: Date.now() });
    writeStore(store);
  }

  let selectedDuration = 1; // negra, igual que el prototipo (empieza en ♩)

  function getMidiYOffset(midi) {
    let closest = WHITE_KEYS.reduce((prev, curr) => Math.abs(curr - midi) < Math.abs(prev - midi) ? curr : prev);
    return WHITE_KEYS.indexOf(closest);
  }

  // Owner: mismo motor matemático de Auto-Acordes del prototipo (analiza qué notas
  // hay en un compás, pesa cada clase de tono por su duración, y arma el símbolo del
  // acorde según qué intervalos detecta contra la raíz). Se deja acá, listo para el
  // próximo commit que lo conecte al acorde real del Chart.
  function calculateChordForNotes(notes) {
    if (!notes || !notes.length) return '';
    const rootNames = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    const pitchWeights = {};
    notes.forEach(n => { const pc = n.midi % 12; pitchWeights[pc] = (pitchWeights[pc] || 0) + n.duration; });
    let rootPc = -1, maxWeight = -1;
    for (const pc in pitchWeights) { if (pitchWeights[pc] > maxWeight) { maxWeight = pitchWeights[pc]; rootPc = parseInt(pc); } }
    if (rootPc === -1) return '';
    const rootName = rootNames[rootPc];
    const hasInterval = (semi) => !!pitchWeights[(rootPc + semi) % 12];
    const min3 = hasInterval(3), maj3 = hasInterval(4), dim5 = hasInterval(6), min7 = hasInterval(10);
    const sus4 = hasInterval(5) && !min3 && !maj3, sus2 = hasInterval(2) && !min3 && !maj3;
    if (sus4) return rootName + 'sus4';
    if (sus2) return rootName + 'sus2';
    if (min3 && dim5) return rootName + 'dim';
    if (min3) return rootName + (min7 ? 'm7' : 'm');
    if (maj3) return rootName + (min7 ? '7' : 'maj7');
    return rootName + 'maj7';
  }

  // Owner: paso 2/3 -- toma las notas ya puestas a mano en el pentagrama de
  // ESTA sección (una repetición concreta, ej. "Coro BIS"), las agrupa por
  // compás, corre calculateChordForNotes() en cada uno, y arma la secuencia
  // de acordes final: un compás sin notas sostiene el acorde del compás
  // anterior (silencio = sigue sonando lo mismo), y compases consecutivos
  // con el mismo acorde se funden en una sola entrada más larga (igual que
  // ya hace el Chart con `bars` en cada acorde real).
  function computeChordsForSection(sectionKey, totalBars) {
    const notes = getNotes(sectionKey);
    if (!notes.length) return null;
    const midiToNote = (window.Studio936MusicTheory || {}).midiToNote || (m => 'C4');
    const perBar = [];
    for (let bar = 0; bar < totalBars; bar++) {
      const barNotes = notes.filter(n => n.bar === bar);
      perBar.push({ name: calculateChordForNotes(barNotes), barNotes });
    }
    let lastName = '';
    perBar.forEach(b => { if (b.name) lastName = b.name; else b.name = lastName || 'C'; });
    const chords = [];
    perBar.forEach(b => {
      const prev = chords[chords.length - 1];
      if (prev && prev.name === b.name) { prev.bars += 1; return; }
      const midis = b.barNotes.map(n => n.midi).sort((x, y) => x - y);
      const bass = midis.length ? midiToNote(midis[0]) : '';
      const notesStr = midis.length ? midis.map(midiToNote).join(' ') : '';
      chords.push({ name: b.name, bass, notes: notesStr, bars: 1 });
    });
    return chords;
  }

  // Owner: el pentagrama está guardado por instanceKey (cada repetición,
  // "Coro"/"Coro BIS", tiene sus propias notas), pero los acordes reales de
  // la canción se guardan por TIPO de sección compartido entre repeticiones
  // -- así ya funcionan Chart/Structure hoy (BIS secciones), así que
  // Auto-Acordes sigue esa misma regla en vez de inventar una nueva.
  function baseSectionType(instanceKey) {
    return String(instanceKey || '').split('__occ')[0];
  }

  function writeChordsIntoStructureDraft(sectionKey, chords) {
    try {
      const raw = JSON.parse(localStorage.getItem(STRUCTURE_DRAFT_KEY) || '{}');
      if (!raw.draft || typeof raw.draft !== 'object') return false;
      if (!raw.draft.clones || typeof raw.draft.clones !== 'object') raw.draft.clones = {};
      const prevSource = (raw.draft.clones[sectionKey] && raw.draft.clones[sectionKey].source) || '';
      raw.draft.clones[sectionKey] = {
        source: prevSource,
        items: chords.map(c => ({ name: c.name, bars: c.bars, bass: c.bass || '', notes: c.notes || '' })),
        createdAt: new Date().toISOString()
      };
      localStorage.setItem(STRUCTURE_DRAFT_KEY, JSON.stringify(raw));
      return true;
    } catch (_) { return false; }
  }

  // Owner: "acá se define la estructura de la canción... pero no debe
  // cambiar la lógica para verlo lineal" (Val) -- estas funciones leen y
  // escriben EXACTAMENTE el mismo `draft.parts` que ya usa Vista Continua
  // (readStructureDraftSnapshot en el Chart) para dibujarse lineal, con el
  // mismo instanceKey (computeInstanceKeyForPart == computeSectionInstanceKey
  // del Chart). El editor grande solo AGREGA/QUITA/REORDENA entradas de esa
  // misma lista -- el Chart la vuelve a leer tal cual, sin tocar cómo la
  // dibuja.
  function readStructureParts() {
    try {
      const raw = JSON.parse(localStorage.getItem(STRUCTURE_DRAFT_KEY) || '{}');
      return (raw.draft && Array.isArray(raw.draft.parts)) ? raw.draft.parts : [];
    } catch (_) { return []; }
  }
  function writeStructureParts(parts) {
    try {
      const raw = JSON.parse(localStorage.getItem(STRUCTURE_DRAFT_KEY) || '{}');
      raw.draft = raw.draft && typeof raw.draft === 'object' ? raw.draft : {};
      raw.draft.parts = parts;
      localStorage.setItem(STRUCTURE_DRAFT_KEY, JSON.stringify(raw));
    } catch (_) {}
  }
  function computeInstanceKeyForPart(parts, idx) {
    const type = (parts[idx] && parts[idx].section) || '';
    let occ = 0;
    for (let i = 0; i < idx; i++) { if (parts[i] && parts[i].section === type) occ++; }
    return occ === 0 ? type : (type + '__occ' + occ);
  }
  const SECTION_TYPE_LABELS = {
    intro: 'Intro', verse: 'Verso', verse1: 'Verso 1', verse2: 'Verso 2', verse3: 'Verso 3', verse4: 'Verso 4',
    prechorus: 'Pre-coro', chorus: 'Coro', bridge: 'Puente', interlude: 'Interludio', solo: 'Solo', outro: 'Outro'
  };
  function labelForType(type) {
    return SECTION_TYPE_LABELS[type] || String(type || 'Sección').replace(/[-_]+/g, ' ').replace(/\b\w/g, (x) => x.toUpperCase());
  }

  function playPreviewNote(midi, durationSec) {
    try {
      const ctx = window.__studio936AudioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const osc1 = ctx.createOscillator(), osc2 = ctx.createOscillator();
      const gain = ctx.createGain(), filter = ctx.createBiquadFilter();
      osc1.type = 'sine'; osc2.type = 'triangle';
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      osc1.frequency.value = freq; osc2.frequency.value = freq * 1.003;
      filter.type = 'lowpass'; filter.frequency.value = 1400;
      osc1.connect(filter); osc2.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(durationSec, 0.3));
      osc1.start(now); osc2.start(now);
      osc1.stop(now + Math.max(durationSec, 0.3)); osc2.stop(now + Math.max(durationSec, 0.3));
    } catch (_) {}
  }

  function installStyles() {
    if (document.getElementById('s936pg-styles')) return;
    const style = document.createElement('style');
    style.id = 's936pg-styles';
    style.textContent = `
      .s936pg-lanerow{display:flex;gap:3px;}
      .s936pg-labelspacer{width:320px;max-width:320px;flex-shrink:0;box-sizing:border-box;background:#0a0b10;border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:7px;padding:0 10px;font-size:10px;font-weight:700;color:#c5c6c7;letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;}
      .s936pg-labelspacer:hover{background:rgba(94,234,212,.08);color:#5eead4;}
      .s936pg-wrap{position:relative;background:#0a0b10;border-top:1px solid rgba(255,255,255,.06);}
      .s936pg-canvas{display:block;height:96px;cursor:crosshair;}
      .s936pg-toolbar{position:fixed;z-index:9998;display:flex;align-items:center;gap:4px;background:rgba(10,11,16,.95);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:5px 8px;box-shadow:0 8px 24px rgba(0,0,0,.5);backdrop-filter:blur(6px);}
      .s936pg-toolbar-label{font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;opacity:.7;color:#c5c6c7;margin-right:2px;}
      .s936pg-figbtn{background:none;border:none;color:#c5c6c7;font-size:18px;padding:3px 6px;border-radius:5px;cursor:pointer;line-height:1;}
      .s936pg-figbtn:hover{background:rgba(255,255,255,.08);}
      .s936pg-figbtn.is-active{background:#2563eb;color:#fff;}
      .s936pg-drag{cursor:move;color:#7fa8a0;font-size:11px;padding:0 4px;}
      .s936pg-autochords{position:absolute;top:2px;left:2px;z-index:2;background:rgba(37,99,235,.85);color:#fff;border:none;border-radius:5px;font-size:10px;font-weight:700;letter-spacing:.02em;padding:2px 7px;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.35);}
      .s936pg-autochords:hover{background:#2563eb;}
      .s936pg-autochords.is-busy{opacity:.6;pointer-events:none;}
      .s936pg-bigeditor{position:absolute;top:2px;right:2px;z-index:2;background:rgba(255,255,255,.1);color:#e5e7eb;border:1px solid rgba(255,255,255,.18);border-radius:5px;font-size:12px;line-height:1;padding:3px 6px;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.35);}
      .s936pg-bigeditor:hover{background:rgba(255,255,255,.2);}
      .s936pg-big-backdrop{position:fixed;inset:0;z-index:9990;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);}
      .s936pg-big-card{background:#0f111a;border:1px solid rgba(255,255,255,.15);border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.85);width:min(96vw,1320px);height:min(90vh,860px);display:flex;flex-direction:column;overflow:hidden;}
      .s936pg-big-head{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.1);background:#14151f;flex-shrink:0;}
      .s936pg-big-meta{display:flex;align-items:center;gap:8px;padding:10px 16px;border-bottom:1px solid rgba(255,255,255,.08);background:#14151f;flex-wrap:wrap;flex-shrink:0;}
      .s936pg-meta-field{display:flex;align-items:center;gap:6px;background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.14);border-radius:6px;padding:6px 10px;}
      .s936pg-meta-field input{background:transparent;border:none;color:#e5e7eb;font-size:12px;font-weight:600;outline:none;}
      .s936pg-meta-field input::placeholder{color:rgba(255,255,255,.35);}
      .s936pg-meta-field span{font-size:9px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;opacity:.7;}
      .s936pg-meta-title input{width:200px;}
      .s936pg-meta-author input{width:140px;}
      .s936pg-meta-bpm-input{width:40px;font-weight:800;}
      .s936pg-big-title{color:#fff;font-weight:700;font-size:14px;}
      .s936pg-big-sub{color:#9ca3af;font-size:10px;margin-top:2px;}
      .s936pg-big-close{background:rgba(255,255,255,.08);color:#c5c6c7;border:none;border-radius:7px;width:28px;height:28px;font-size:14px;cursor:pointer;}
      .s936pg-big-close:hover{background:rgba(255,255,255,.18);}
      .s936pg-big-hint{color:#7fa8a0;font-size:10px;}
      /* Owner: "el Editor... debe dejarlo idéntico... mismo diseño mismo
         botones, ya está hecho" (Val) -- layout de 2 columnas + panel de
         acciones, calcado del prototipo "Studio936 DAW - Master Edition"
         (actionPanel 2x2 + aside "LETRA Y COMPASES" + main con el
         pentagrama), no una reinvención. */
      .s936pg-big-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;flex-shrink:0;}
      .s936pg-actbtn{border-radius:6px;font-size:9px;font-weight:700;padding:6px 6px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;border:1px solid transparent;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .s936pg-actbtn:hover{filter:brightness(1.2);}
      .s936pg-actbtn.rec{background:rgba(16,185,129,.18);color:#34d399;border-color:rgba(16,185,129,.45);}
      .s936pg-actbtn.rec.is-recording{background:#dc2626;color:#fff;border-color:#ef4444;animation:s936pg-pulse 1.1s infinite;}
      .s936pg-actbtn.upload{background:rgba(168,85,247,.12);color:#c084fc;border-color:rgba(168,85,247,.4);}
      .s936pg-actbtn.chords{background:rgba(37,99,235,.15);color:#60a5fa;border-color:rgba(37,99,235,.45);}
      .s936pg-actbtn.vibe{background:rgba(99,102,241,.12);color:#a5b4fc;border-color:rgba(99,102,241,.4);}
      .s936pg-big-columns{display:flex;gap:10px;flex:1;min-height:0;padding:0 16px 16px;}
      .s936pg-big-leftcol{width:300px;flex-shrink:0;display:flex;flex-direction:column;gap:8px;min-height:0;}
      .s936pg-big-lyricspanel{flex:1;min-height:0;display:flex;flex-direction:column;border:1px solid rgba(255,255,255,.08);border-radius:10px;background:#0a0b10;overflow:hidden;}
      .s936pg-big-panelhead{padding:9px 12px;border-bottom:1px solid rgba(255,255,255,.08);background:#14151f;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.8;}
      .s936pg-big-lyriclist{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:6px;}
      .s936pg-lyricrow{display:flex;align-items:center;gap:8px;}
      .s936pg-lyricrow-label{font-size:9px;width:24px;flex-shrink:0;text-align:right;opacity:.6;font-weight:700;}
      .s936pg-lyricrow-grid{flex:1;display:grid;grid-template-columns:repeat(4,1fr);gap:4px;min-width:0;}
      .s936pg-lyric-input{width:100%;box-sizing:border-box;text-align:center;border-radius:4px;font-size:10px;padding:5px 2px;background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.12);color:#c5c6c7;}
      .s936pg-lyric-input::placeholder{color:rgba(255,255,255,.25);}
      .s936pg-lyric-input.has-syllable{font-weight:700;border-color:rgba(59,130,246,.45);background:rgba(59,130,246,.12);color:#93c5fd;}
      /* Owner: una tarjeta por sección real (LETRA Y COMPASES muestra TODA
         la canción, no solo la sección abierta -- "no hay sección" era
         justamente esto lo que faltaba). */
      .s936pg-secblock{border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:6px;background:rgba(255,255,255,.02);}
      .s936pg-secblock.is-selected{border-color:rgba(94,234,212,.5);background:rgba(94,234,212,.05);}
      .s936pg-sec-header{display:flex;align-items:center;gap:5px;margin-bottom:6px;flex-wrap:wrap;}
      .s936pg-sec-moves{display:flex;flex-direction:column;gap:0;}
      .s936pg-sec-moves button{background:none;border:none;color:#7f8a8a;font-size:8px;cursor:pointer;line-height:1;padding:1px;}
      .s936pg-sec-moves button:disabled{opacity:.25;cursor:default;}
      .s936pg-sec-namewrap{display:flex;align-items:center;gap:2px;flex:1;min-width:0;color:#c084fc;font-weight:700;font-size:10px;letter-spacing:.04em;text-transform:uppercase;}
      .s936pg-sec-name{background:transparent;border:none;border-bottom:1px dashed transparent;color:#c084fc;font-weight:700;font-size:10px;letter-spacing:.04em;text-transform:uppercase;width:84px;min-width:0;padding:2px 0;}
      .s936pg-sec-name:hover,.s936pg-sec-name:focus{border-bottom-color:rgba(192,132,252,.5);outline:none;}
      .s936pg-sec-view,.s936pg-sec-dup{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#c5c6c7;border-radius:4px;font-size:9px;font-weight:700;padding:3px 6px;cursor:pointer;white-space:nowrap;}
      .s936pg-sec-view:hover,.s936pg-sec-dup:hover{background:rgba(255,255,255,.14);}
      .s936pg-sec-bars{background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.12);color:#c5c6c7;border-radius:4px;font-size:9px;padding:3px;}
      .s936pg-sec-del{background:none;border:none;color:rgba(239,68,68,.7);cursor:pointer;font-size:11px;padding:2px;}
      .s936pg-sec-del:hover{color:#ef4444;}
      .s936pg-sec-lyricgrid{padding-left:8px;border-left:1px solid rgba(255,255,255,.08);display:flex;flex-direction:column;gap:4px;}
      .s936pg-sec-empty{color:#7f8a8a;font-size:10px;text-align:center;padding:20px 10px;}
      .s936pg-add-section{margin:8px 10px 10px;padding:8px;border-radius:999px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);color:#c5c6c7;font-size:10px;font-weight:700;cursor:pointer;}
      .s936pg-add-section:hover{background:rgba(255,255,255,.12);}
      .s936pg-addsec-card{max-width:300px;text-align:left;}
      .s936pg-big-scorepanel{flex:1;display:flex;flex-direction:column;min-width:0;border:1px solid rgba(255,255,255,.08);border-radius:10px;overflow:hidden;background:#0a0b10;}
      .s936pg-big-scorehead{display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid rgba(255,255,255,.08);background:#14151f;flex-wrap:wrap;flex-shrink:0;}
      .s936pg-big-scoretitle{font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;display:flex;align-items:center;gap:6px;white-space:nowrap;}
      .s936pg-big-scoretitle small{font-weight:400;text-transform:none;opacity:.6;letter-spacing:0;}
      .s936pg-big-playbtn{background:rgba(16,185,129,.18);color:#34d399;border:1px solid rgba(16,185,129,.4);border-radius:6px;padding:5px 12px;font-size:10px;font-weight:700;cursor:pointer;white-space:nowrap;}
      .s936pg-big-playbtn.is-playing{background:#dc2626;color:#fff;border-color:#ef4444;}
      .s936pg-big-iconbtn{width:26px;height:26px;border-radius:6px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#c5c6c7;font-size:11px;cursor:pointer;flex-shrink:0;}
      .s936pg-big-iconbtn:hover{background:rgba(255,255,255,.16);}
      .s936pg-big-figures{display:flex;align-items:center;gap:1px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:2px 4px;}
      .s936pg-big-scorebody{flex:1;overflow:auto;padding:16px;}
      .s936pg-oido{position:fixed;z-index:9998;display:flex;align-items:center;gap:4px;background:rgba(10,11,16,.95);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:5px 8px;box-shadow:0 8px 24px rgba(0,0,0,.5);backdrop-filter:blur(6px);}
      .s936pg-oido-btn{border-radius:6px;border:1px solid transparent;font-size:11px;font-weight:700;padding:5px 9px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;white-space:nowrap;}
      .s936pg-oido-key{background:rgba(255,255,255,.06);color:#c5c6c7;border-color:rgba(255,255,255,.12);}
      .s936pg-oido-key:hover{background:rgba(255,255,255,.12);}
      .s936pg-oido-rec{background:rgba(16,185,129,.15);color:#34d399;border-color:rgba(16,185,129,.4);}
      .s936pg-oido-rec:hover{background:rgba(16,185,129,.25);}
      .s936pg-oido-rec.is-recording{background:#dc2626;color:#fff;border-color:#ef4444;animation:s936pg-pulse 1.1s infinite;}
      .s936pg-oido-upload{background:rgba(168,85,247,.12);color:#c084fc;border-color:rgba(168,85,247,.35);}
      .s936pg-oido-upload:hover{background:rgba(168,85,247,.22);}
      @keyframes s936pg-pulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.55)}50%{box-shadow:0 0 0 6px rgba(239,68,68,0)}}
      .s936pg-modal-backdrop{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.35);}
      .s936pg-modal-card{background:#14151f;border:1px solid rgba(255,255,255,.15);border-radius:12px;padding:22px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.8);max-width:360px;}
      .s936pg-modal-icon{width:48px;height:48px;border-radius:999px;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:20px;}
      .s936pg-modal-icon.brain{background:rgba(168,85,247,.2);color:#c084fc;animation:s936pg-spin 1.4s linear infinite;}
      .s936pg-modal-icon.warn{background:rgba(245,158,11,.2);color:#fbbf24;}
      .s936pg-modal-icon.info{background:rgba(99,102,241,.18);color:#a5b4fc;}
      @keyframes s936pg-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      .s936pg-modal-title{color:#fff;font-weight:700;font-size:13px;margin-bottom:6px;}
      .s936pg-modal-body{color:#9ca3af;font-size:11px;margin-bottom:0;}
      .s936pg-modal-btn{margin-top:14px;padding:8px 16px;font-size:11px;font-weight:700;border:none;border-radius:7px;background:#2563eb;color:#fff;cursor:pointer;}
      .s936pg-key-field{text-align:left;margin-top:12px;}
      .s936pg-key-field label{display:block;font-size:10px;color:#9ca3af;margin-bottom:4px;}
      .s936pg-key-field input{width:100%;box-sizing:border-box;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);border-radius:6px;padding:8px;color:#e5e7eb;font-size:11px;}
      .s936pg-key-actions{display:flex;gap:8px;margin-top:14px;justify-content:flex-end;}
      .s936pg-key-actions button{padding:7px 14px;font-size:11px;font-weight:700;border-radius:7px;border:none;cursor:pointer;}
      .s936pg-key-cancel{background:rgba(255,255,255,.08);color:#c5c6c7;}
      .s936pg-key-save{background:#2563eb;color:#fff;}
    `;
    document.head.appendChild(style);
  }

  // Owner: "panel de edición grande" (Val) necesita el mismo pentagrama pero
  // más grande/legible para trabajar con precisión -- en vez de duplicar el
  // dibujo, todas las funciones de acá reciben un `geo` con un factor de
  // escala. La fila normal (inline, en Vista Continua) usa escala 1 (los
  // mismos números de siempre); el editor grande usa una escala mayor.
  function makeGeo(scale) {
    scale = scale || 1;
    return {
      scale,
      pxPerBar: PX_PER_BAR * scale,
      lineGap: LINE_GAP * scale,
      topPad: TOP_PAD * scale
    };
  }
  const DEFAULT_GEO = makeGeo(1);

  function drawLedgerLines(g, midi, nx, c4Y, staffTop, geo) {
    const halfW = 8 * geo.scale;
    if (midi <= 60) {
      g.beginPath(); g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 1;
      g.moveTo(nx - halfW, c4Y); g.lineTo(nx + halfW, c4Y); g.stroke();
    } else if (midi >= 81) {
      const topLedger = staffTop - geo.lineGap;
      g.beginPath(); g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 1;
      g.moveTo(nx - halfW, topLedger); g.lineTo(nx + halfW, topLedger); g.stroke();
    }
  }

  function drawIndividualNotes(g, group, barStartX, c4Y, bottomLineY, staffTop, geo) {
    const s = geo.scale;
    group.forEach((note) => {
      const stepOffset = getMidiYOffset(note.midi);
      const nx = barStartX + note.beat * (geo.pxPerBar / 4) + 18 * s;
      const ny = c4Y - stepOffset * (geo.lineGap / 2);
      drawLedgerLines(g, note.midi, nx, c4Y, staffTop, geo);
      g.beginPath();
      if (note.duration >= 2) {
        g.ellipse(nx, ny, 5 * s, 3.5 * s, -0.2, 0, Math.PI * 2);
        g.strokeStyle = '#e2e8f0'; g.lineWidth = 2; g.stroke();
      } else {
        g.ellipse(nx, ny, 5 * s, 3.5 * s, -0.2, 0, Math.PI * 2);
        g.fillStyle = '#e2e8f0'; g.fill();
      }
      if (note.duration === 3 || note.duration === 1.5) {
        g.beginPath(); g.arc(nx + 10 * s, ny, 2.5 * s, 0, Math.PI * 2); g.fillStyle = '#e2e8f0'; g.fill();
      }
      if (note.duration < 4) {
        const stemsUp = note.midi < 71;
        const stemX = stemsUp ? nx + 4.5 * s : nx - 4.5 * s;
        const stemYEnd = stemsUp ? ny - 25 * s : ny + 25 * s;
        g.beginPath(); g.strokeStyle = '#e2e8f0'; g.lineWidth = 1.5;
        g.moveTo(stemX, ny); g.lineTo(stemX, stemYEnd); g.stroke();
      }
      if (note.syllable) {
        g.textAlign = 'center'; g.fillStyle = '#93c5fd'; g.font = 'bold ' + Math.round(11 * s) + 'px Inter, sans-serif';
        g.fillText(note.syllable, nx, bottomLineY + 26 * s);
      }
    });
  }

  function drawBeamedGroup(g, group, barStartX, c4Y, bottomLineY, staffTop, geo) {
    const s = geo.scale;
    const avgMidi = group.reduce((sum, n) => sum + n.midi, 0) / group.length;
    const stemsUp = avgMidi < 71;
    const stemDir = stemsUp ? -1 : 1;
    const stemXOff = stemsUp ? 4.5 * s : -4.5 * s;
    const beamHeight = 22 * s;
    const beamPoints = [];
    let firstNx = 0, lastNx = 0;
    group.forEach((note, idx) => {
      const stepOffset = getMidiYOffset(note.midi);
      const nx = barStartX + note.beat * (geo.pxPerBar / 4) + 18 * s;
      if (idx === 0) firstNx = nx;
      if (idx === group.length - 1) lastNx = nx;
      const ny = c4Y - stepOffset * (geo.lineGap / 2);
      drawLedgerLines(g, note.midi, nx, c4Y, staffTop, geo);
      g.beginPath();
      g.ellipse(nx, ny, 5 * s, 3.5 * s, -0.2, 0, Math.PI * 2);
      g.fillStyle = '#e2e8f0'; g.fill();
      const stemEnd = ny + beamHeight * stemDir;
      g.beginPath(); g.strokeStyle = '#e2e8f0'; g.lineWidth = 1.5;
      g.moveTo(nx + stemXOff, ny); g.lineTo(nx + stemXOff, stemEnd); g.stroke();
      beamPoints.push({ x: nx + stemXOff, y: stemEnd });
    });
    g.beginPath(); g.strokeStyle = '#e2e8f0'; g.lineWidth = 4;
    g.moveTo(beamPoints[0].x, beamPoints[0].y);
    g.lineTo(beamPoints[beamPoints.length - 1].x, beamPoints[beamPoints.length - 1].y);
    g.stroke();
    const first = group[0];
    if (first.syllable) {
      g.textAlign = 'center'; g.fillStyle = '#93c5fd'; g.font = 'bold ' + Math.round(11 * s) + 'px Inter, sans-serif';
      g.fillText(first.syllable, (firstNx + lastNx) / 2, bottomLineY + 26 * s);
    }
  }

  // Owner: dibuja el pentagrama en UNA sola fila horizontal a lo largo de TODA la
  // sección (a diferencia del prototipo original, que lo partía en sistemas
  // verticales de 4 compases -- acá tiene que alinear con Chart/Lyric/Voz, que ya
  // son horizontales, 320px por compás).
  function drawPentagram(canvas, notes, totalBars, geo, drawClef) {
    geo = geo || DEFAULT_GEO;
    if (drawClef === undefined) drawClef = true;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const g = canvas.getContext('2d');
    g.scale(dpr, dpr);
    g.clearRect(0, 0, w, h);

    const staffTop = geo.topPad;
    const bottomLineY = staffTop + 4 * geo.lineGap;
    const c4Y = bottomLineY + geo.lineGap;

    g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 1;
    g.beginPath();
    for (let i = 0; i < 5; i++) { const ly = staffTop + i * geo.lineGap; g.moveTo(0, ly); g.lineTo(w, ly); }
    g.stroke();

    // Owner: "el canal es solo uno... mi lógica es lo mismo canal con marca
    // de dónde hasta dónde es cada parte" (Val) -- un pentagrama real solo
    // lleva la clave UNA vez al principio de la línea, no repetida en cada
    // sección; repetirla hacía que pareciera un pentagrama nuevo y
    // desconectado en cada compás de cambio de sección ("se vuelve loco"),
    // en vez de UN SOLO canal continuo con las secciones ya marcadas arriba
    // (el "● VERSO 1" que ya pinta Chart en Vista Continua).
    if (drawClef) {
      g.fillStyle = 'rgba(255,255,255,.85)'; g.font = Math.round(26 * geo.scale) + 'px serif'; g.textAlign = 'left';
      g.fillText('𝄞', 2, bottomLineY + 4);
    }

    g.strokeStyle = 'rgba(255,255,255,.12)';
    for (let b = 0; b <= totalBars; b++) {
      const x = b * geo.pxPerBar;
      g.beginPath(); g.moveTo(x, staffTop); g.lineTo(x, bottomLineY); g.stroke();
    }

    for (let bar = 0; bar < totalBars; bar++) {
      const barNotes = notes.filter(n => n.bar === bar);
      const beats = { 0: [], 1: [], 2: [], 3: [] };
      barNotes.forEach(n => { const bi = Math.floor(n.beat); if (bi >= 0 && bi <= 3) beats[bi].push(n); });
      const barStartX = bar * geo.pxPerBar;
      for (let b = 0; b < 4; b++) {
        const group = beats[b].sort((a, c) => a.beat - c.beat);
        if (!group.length) continue;
        const needsBeaming = group.length > 1 && group.every(n => n.duration < 1);
        if (needsBeaming) drawBeamedGroup(g, group, barStartX, c4Y, bottomLineY, staffTop, geo);
        else drawIndividualNotes(g, group, barStartX, c4Y, bottomLineY, staffTop, geo);
      }
    }
  }

  function hitTestNote(notes, bar, exactBeat, midi) {
    return notes.findIndex(n => n.bar === bar && exactBeat >= n.beat && exactBeat <= (n.beat + n.duration) && Math.abs(midi - n.midi) <= 2);
  }

  function pointToBarBeatMidi(canvas, clientX, clientY, geo) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.clientWidth ? rect.width / canvas.clientWidth : 1;
    const scaleY = canvas.clientHeight ? rect.height / canvas.clientHeight : 1;
    const x = (clientX - rect.left) / scaleX, y = (clientY - rect.top) / scaleY;
    const bar = Math.floor(x / geo.pxPerBar);
    const xInBar = x - bar * geo.pxPerBar;
    const exactBeat = xInBar / (geo.pxPerBar / 4);
    const staffTop = geo.topPad, bottomLineY = staffTop + 4 * geo.lineGap, c4Y = bottomLineY + geo.lineGap;
    const spaceOffset = (c4Y - y) / (geo.lineGap / 2);
    let midiIdx = Math.round(spaceOffset);
    midiIdx = Math.max(0, Math.min(midiIdx, WHITE_KEYS.length - 1));
    return { bar, exactBeat, midi: WHITE_KEYS[midiIdx] };
  }

  function attachClickHandler(canvas, sectionKey, totalBars, redraw, geo) {
    geo = geo || DEFAULT_GEO;
    canvas.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      const { bar, exactBeat, midi } = pointToBarBeatMidi(canvas, e.clientX, e.clientY, geo);
      if (bar < 0 || bar >= totalBars) return;
      const snap = selectedDuration;
      const beat = Math.floor(exactBeat / snap) * snap;
      if (beat + snap > 4) return;

      let notes = getNotes(sectionKey).slice();
      const clickedIdx = hitTestNote(notes, bar, exactBeat, midi);
      if (clickedIdx !== -1) {
        notes.splice(clickedIdx, 1);
      } else {
        let preservedSyllable = '';
        const beatSlot = Math.floor(beat);
        const matched = notes.find(n => n.bar === bar && Math.floor(n.beat) === beatSlot);
        if (matched) preservedSyllable = matched.syllable || '';
        notes = notes.filter(n => !(n.bar === bar && beat < n.beat + n.duration && beat + snap > n.beat));
        const totalD = notes.filter(n => n.bar === bar).reduce((s, n) => s + n.duration, 0);
        if (totalD + snap <= 4) {
          notes.push({ bar, beat, duration: snap, midi, syllable: preservedSyllable });
          playPreviewNote(midi, Math.min(snap * 0.4, 1));
        }
      }
      setNotes(sectionKey, notes);
      redraw();
    });
  }

  // Owner: "letra y pentagrama" (Val) -- en el prototipo original la letra
  // vive PEGADA a cada nota (la sílaba se dibuja debajo, como en una
  // partitura de coro real), no en un cuadro de texto aparte. Doble clic
  // sobre una nota ya puesta permite escribir/editar esa sílaba sin
  // necesidad del editor grande (aunque ahí es más cómodo por el tamaño).
  function attachSyllableEditor(canvas, sectionKey, totalBars, redraw, geo) {
    geo = geo || DEFAULT_GEO;
    canvas.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      const { bar, exactBeat, midi } = pointToBarBeatMidi(canvas, e.clientX, e.clientY, geo);
      if (bar < 0 || bar >= totalBars) return;
      const notes = getNotes(sectionKey).slice();
      const idx = hitTestNote(notes, bar, exactBeat, midi);
      if (idx === -1) return;
      const typed = window.prompt('Sílaba/letra para esta nota:', notes[idx].syllable || '');
      if (typed === null) return;
      notes[idx] = Object.assign({}, notes[idx], { syllable: typed.trim() });
      setNotes(sectionKey, notes);
      redraw();
    });
  }

  // Owner: una sola barra de figuras global (igual que el prototipo), flotante,
  // arrastrable, para no repetirla en cada sección -- selecciona qué duración usa
  // el próximo clic en CUALQUIER pentagrama de la canción.
  let _toolbarEl = null;
  function ensureFiguresToolbar() {
    if (_toolbarEl) return;
    installStyles();
    const bar = document.createElement('div');
    bar.className = 's936pg-toolbar';
    bar.style.top = '96px';
    bar.style.right = '24px';
    const drag = document.createElement('span');
    drag.className = 's936pg-drag';
    drag.textContent = '⠿';
    const label = document.createElement('span');
    label.className = 's936pg-toolbar-label';
    label.textContent = 'Figura:';
    bar.append(drag, label);
    const figures = [
      { d: 4, glyph: '𝅝', title: 'Redonda' },
      { d: 2, glyph: '𝅗𝅥', title: 'Blanca' },
      { d: 3, glyph: '𝅗𝅥.', title: 'Blanca con puntillo' },
      { d: 1, glyph: '♩', title: 'Negra' },
      { d: 1.5, glyph: '♩.', title: 'Negra con puntillo' },
      { d: 0.5, glyph: '♪', title: 'Corchea' },
      { d: 0.333, glyph: '3♪', title: 'Tresillo' },
      { d: 0.25, glyph: '♬', title: 'Semicorchea' }
    ];
    figures.forEach(f => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 's936pg-figbtn' + (f.d === selectedDuration ? ' is-active' : '');
      b.textContent = f.glyph;
      b.title = f.title;
      b.onclick = () => {
        selectedDuration = f.d;
        bar.querySelectorAll('.s936pg-figbtn').forEach(x => x.classList.remove('is-active'));
        b.classList.add('is-active');
      };
      bar.appendChild(b);
    });
    document.body.appendChild(bar);
    _toolbarEl = bar;

    let dragging = false, startX = 0, startY = 0, barStartLeft = 0, barStartTop = 0;
    drag.addEventListener('pointerdown', (e) => {
      dragging = true; drag.setPointerCapture(e.pointerId);
      startX = e.clientX; startY = e.clientY;
      const r = bar.getBoundingClientRect();
      barStartLeft = r.left; barStartTop = r.top;
    });
    drag.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      bar.style.right = 'auto';
      bar.style.left = Math.max(0, barStartLeft + (e.clientX - startX)) + 'px';
      bar.style.top = Math.max(0, barStartTop + (e.clientY - startY)) + 'px';
    });
    drag.addEventListener('pointerup', () => { dragging = false; });
  }

  // ── PASO 3/3: Oído IA ────────────────────────────────────────────────────
  // Owner: graba (o sube) audio, lo manda a Gemini con el mismo prompt del
  // prototipo (pedir secciones + acordes por compás + notas exactas
  // cantadas/tocadas), y con la respuesta CREA la canción completa: escribe
  // el arreglo y los acordes en el borrador de Estructura (misma fuente que
  // ya usa Auto-Acordes), y las notas en el pentagrama de cada sección. Solo
  // Gemini está realmente conectado (igual que en el prototipo -- ahí OpenAI
  // y los demás tiraban "no configurado").
  const GEMINI_KEY_STORAGE = 'studio936_gemini_key';
  const GEMINI_PROMPT = `Listen very carefully to this entire musical recording from start to finish.
CRITICAL STRUCTURAL & TRANSCRIPTION RULES:
1. SECTIONS: Divide the song into natural musical sections based on the audio (e.g., "Intro", "Verso 1", "Coro").
2. MEASURE ALIGNMENT: The very first musical sound of the instrument at 0.0 seconds MUST start at measure index 0 of the first section (Intro).
3. INTRO vs VOCALS:
   - For instrumental intro measures: detect and provide the correct "chord", set "notes": [].
   - When vocals start: detect exact sung melodic pitches (MIDI note numbers like 60 for C4, 62 for D4, etc.) and assign exact word/syllable to "syllable".
4. TIME SIGNATURE 4/4: Each measure has 4 beats (0.0 to 3.0).
Return a strict JSON array of section objects:
[
  {
    "sectionName": "Intro",
    "repeat": false,
    "measures": [
      { "measure": 0, "chord": "Cmaj7", "notes": [] }
    ]
  }
]
Return strictly valid JSON and nothing else.`;

  function getGeminiKey() {
    try { return localStorage.getItem(GEMINI_KEY_STORAGE) || ''; } catch (_) { return ''; }
  }
  function setGeminiKey(key) {
    try { localStorage.setItem(GEMINI_KEY_STORAGE, key); } catch (_) {}
  }

  function showOidoModal(icon, title, body, dismissible) {
    const backdrop = document.createElement('div');
    backdrop.className = 's936pg-modal-backdrop';
    const card = document.createElement('div');
    card.className = 's936pg-modal-card';
    const known = icon === 'brain' || icon === 'warn';
    const glyph = icon === 'brain' ? '🧠' : icon === 'warn' ? '⚠️' : icon;
    card.innerHTML =
      '<div class="s936pg-modal-icon ' + (known ? icon : 'info') + '">' + glyph + '</div>' +
      '<div class="s936pg-modal-title"></div>' +
      '<div class="s936pg-modal-body"></div>';
    card.querySelector('.s936pg-modal-title').textContent = title;
    card.querySelector('.s936pg-modal-body').textContent = body;
    if (dismissible) {
      const btn = document.createElement('button');
      btn.className = 's936pg-modal-btn';
      btn.type = 'button';
      btn.textContent = 'Entendido';
      btn.onclick = () => backdrop.remove();
      card.appendChild(btn);
    }
    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
    return backdrop;
  }

  function openApiKeyPrompt() {
    const backdrop = document.createElement('div');
    backdrop.className = 's936pg-modal-backdrop';
    const card = document.createElement('div');
    card.className = 's936pg-modal-card';
    card.innerHTML =
      '<div class="s936pg-modal-title">Oído IA (Gemini)</div>' +
      '<div class="s936pg-modal-body">Necesita tu API Key de Google AI Studio para escuchar y transcribir el audio.</div>' +
      '<div class="s936pg-key-field"><label>API Key de Gemini</label><input type="password" placeholder="Pega tu API Key aquí..." /></div>' +
      '<div class="s936pg-key-actions"><button type="button" class="s936pg-key-cancel">Cancelar</button><button type="button" class="s936pg-key-save">Guardar</button></div>';
    const input = card.querySelector('input');
    input.value = getGeminiKey();
    card.querySelector('.s936pg-key-cancel').onclick = () => backdrop.remove();
    card.querySelector('.s936pg-key-save').onclick = () => {
      setGeminiKey(input.value.trim());
      backdrop.remove();
    };
    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result).split(',')[1] || '');
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function inferSectionType(name) {
    const n = String(name || '').toLowerCase();
    if (n.includes('pre')) return 'prechorus';
    if (n.includes('coro') || n.includes('chorus')) return 'chorus';
    if (n.includes('puente') || n.includes('bridge')) return 'bridge';
    if (n.includes('interlud')) return 'interlude';
    if (n.includes('solo')) return 'solo';
    if (n.includes('outro') || n.includes('final')) return 'outro';
    if (n.includes('intro')) return 'intro';
    return 'verse';
  }

  function uniqueAiSectionKey(name, used) {
    const type = inferSectionType(name);
    let key = type, n = 2;
    while (used.has(key)) { key = type + n; n++; }
    used.add(key);
    return key;
  }

  // Owner: mismo criterio de fusión que Auto-Acordes -- un compás sin
  // acorde detectado sostiene el anterior, y compases consecutivos con el
  // mismo acorde se funden en una sola entrada más larga.
  function mergeChordsFromMeasures(measures) {
    const names = measures.map(m => String((m && m.chord) || '').trim());
    let lastName = '';
    const filled = names.map(n => { if (n) lastName = n; return n || lastName || 'C'; });
    const chords = [];
    filled.forEach((name) => {
      const prev = chords[chords.length - 1];
      if (prev && prev.name === name) { prev.bars += 1; return; }
      chords.push({ name, bass: '', notes: '', bars: 1 });
    });
    return chords;
  }

  function pentagramNotesFromMeasures(measures) {
    const notes = [];
    measures.forEach((m, barIdx) => {
      if (!m || !Array.isArray(m.notes)) return;
      m.notes.forEach((n) => {
        const midi = Number(n.midi);
        if (!Number.isFinite(midi) || midi <= 0) return;
        notes.push({
          bar: barIdx,
          beat: Number(n.beat) || 0,
          duration: Math.max(0.25, Number(n.duration) || 1),
          midi: Math.round(midi),
          syllable: n.syllable || ''
        });
      });
    });
    return notes;
  }

  // Owner: escribe la canción DETECTADA POR IA en los mismos dos lugares
  // que ya usa Auto-Acordes (borrador de Estructura + project.sections),
  // pero reemplazando el arreglo entero -- Oído IA "crea la canción, hace
  // las secciones", no agrega acordes a una que ya existe.
  function applyAiSongResult(parsedSections) {
    const used = new Set();
    const parts = [];
    const clones = {};
    const sectionsForBridge = [];
    const pentagramWrites = [];
    parsedSections.forEach((secObj) => {
      const measures = Array.isArray(secObj.measures) && secObj.measures.length ? secObj.measures : [{ chord: 'C', notes: [] }];
      const key = uniqueAiSectionKey(secObj.sectionName, used);
      const label = secObj.sectionName || key;
      parts.push({ section: key, label, bars: measures.length, repeat: 1, independent: true, type: inferSectionType(secObj.sectionName) });
      const chords = mergeChordsFromMeasures(measures);
      clones[key] = { source: '', items: chords, createdAt: new Date().toISOString() };
      sectionsForBridge.push({ key, chords });
      pentagramWrites.push({ key, notes: pentagramNotesFromMeasures(measures) });
    });

    try {
      const raw = JSON.parse(localStorage.getItem(STRUCTURE_DRAFT_KEY) || '{}');
      raw.draft = raw.draft && typeof raw.draft === 'object' ? raw.draft : {};
      raw.draft.parts = parts;
      raw.draft.clones = clones;
      localStorage.setItem(STRUCTURE_DRAFT_KEY, JSON.stringify(raw));
    } catch (_) {}

    pentagramWrites.forEach((w) => setNotes(w.key, w.notes));

    window.Studio936AppBridge?.replaceSongFromAI?.(sectionsForBridge);
    try { window.dispatchEvent(new CustomEvent('studio936:section-chords-updated', { detail: { full: true } })); } catch (_) {}
  }

  async function transcribeAudioWithAI(blob) {
    const apiKey = getGeminiKey();
    if (!apiKey) { openApiKeyPrompt(); return; }
    const raw = (() => { try { return JSON.parse(localStorage.getItem(STRUCTURE_DRAFT_KEY) || '{}'); } catch (_) { return {}; } })();
    const hasExisting = !!(raw.draft && Array.isArray(raw.draft.parts) && raw.draft.parts.length);
    if (hasExisting && !window.confirm('Oído IA va a reemplazar TODA la estructura, acordes y pentagramas de la canción actual con lo que detecte en este audio. ¿Continuar?')) {
      return;
    }
    const loading = showOidoModal('brain', 'Oído IA (Gemini) analizando audio...', 'Mapeando secciones musicales y melodía exacta...');
    try {
      const base64Data = await blobToBase64(blob);
      const mimeType = blob.type || 'audio/webm';
      const payload = {
        contents: [{ role: 'user', parts: [{ text: GEMINI_PROMPT }, { inlineData: { mimeType, data: base64Data } }] }],
        generationConfig: { responseMimeType: 'application/json' }
      };
      const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(apiKey);
      const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      let jsonText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!jsonText) throw new Error((result?.error?.message) || 'Gemini no devolvió transcripción.');
      jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed) || !parsed.length) throw new Error('Gemini no detectó secciones válidas en el audio.');
      applyAiSongResult(parsed);
      loading.remove();
    } catch (err) {
      loading.remove();
      showOidoModal('warn', 'Aviso de Oído IA', err?.message || 'No se pudo transcribir el audio.', true);
    }
  }

  let _oidoPanelEl = null;
  let _oidoRecorder = null;
  let _oidoChunks = [];
  async function toggleOidoRecording(btn) {
    if (!getGeminiKey()) { openApiKeyPrompt(); return; }
    if (_oidoRecorder && _oidoRecorder.state === 'recording') {
      _oidoRecorder.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      _oidoChunks = [];
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mr.ondataavailable = (e) => { if (e.data && e.data.size) _oidoChunks.push(e.data); };
      mr.onstop = async () => {
        btn.textContent = '🎙️ Grabar';
        btn.classList.remove('is-recording');
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(_oidoChunks, { type: 'audio/webm' });
        await transcribeAudioWithAI(blob);
      };
      _oidoRecorder = mr;
      mr.start();
      btn.textContent = '⏹ Detener';
      btn.classList.add('is-recording');
    } catch (e) {
      showOidoModal('warn', 'Micrófono no disponible', e?.message || 'No se pudo acceder al micrófono.', true);
    }
  }

  function ensureOidoIAPanel() {
    if (_oidoPanelEl) return;
    installStyles();
    const panel = document.createElement('div');
    panel.className = 's936pg-oido';
    panel.style.top = '8px';
    panel.style.right = '24px';
    const drag = document.createElement('span');
    drag.className = 's936pg-drag';
    drag.textContent = '⠿';
    const label = document.createElement('span');
    label.className = 's936pg-toolbar-label';
    label.textContent = 'Oído IA:';
    const keyBtn = document.createElement('button');
    keyBtn.type = 'button';
    keyBtn.className = 's936pg-oido-btn s936pg-oido-key';
    keyBtn.title = 'Configurar API Key de Gemini';
    keyBtn.textContent = '🔑';
    keyBtn.onclick = openApiKeyPrompt;
    const recBtn = document.createElement('button');
    recBtn.type = 'button';
    recBtn.className = 's936pg-oido-btn s936pg-oido-rec';
    recBtn.title = 'Grabar con Oído IA';
    recBtn.textContent = '🎙️ Grabar';
    recBtn.onclick = () => toggleOidoRecording(recBtn);
    const uploadLabel = document.createElement('label');
    uploadLabel.className = 's936pg-oido-btn s936pg-oido-upload';
    uploadLabel.title = 'Subir un audio para transcribir';
    uploadLabel.textContent = '📁 Subir';
    const uploadInput = document.createElement('input');
    uploadInput.type = 'file';
    uploadInput.accept = 'audio/*';
    uploadInput.hidden = true;
    uploadInput.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (file) transcribeAudioWithAI(file);
    };
    uploadLabel.appendChild(uploadInput);
    panel.append(drag, label, keyBtn, recBtn, uploadLabel);
    document.body.appendChild(panel);
    _oidoPanelEl = panel;

    let dragging = false, startX = 0, startY = 0, panelStartLeft = 0, panelStartTop = 0;
    drag.addEventListener('pointerdown', (e) => {
      dragging = true; drag.setPointerCapture(e.pointerId);
      startX = e.clientX; startY = e.clientY;
      const r = panel.getBoundingClientRect();
      panelStartLeft = r.left; panelStartTop = r.top;
    });
    drag.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      panel.style.right = 'auto';
      panel.style.left = Math.max(0, panelStartLeft + (e.clientX - startX)) + 'px';
      panel.style.top = Math.max(0, panelStartTop + (e.clientY - startY)) + 'px';
    });
    drag.addEventListener('pointerup', () => { dragging = false; });
  }

  // Owner: un solo lugar para el click de "Auto-Acordes" -- lo usan tanto el
  // botón chiquito de la fila inline como el del editor grande.
  function runAutoChords(sectionKey, totalBars, btn) {
    if (btn.classList.contains('is-busy')) return;
    const chords = computeChordsForSection(sectionKey, totalBars);
    const label = btn.textContent;
    if (!chords) {
      btn.textContent = 'Sin notas';
    } else {
      const target = baseSectionType(sectionKey);
      const draftWritten = writeChordsIntoStructureDraft(target, chords);
      const result = window.Studio936AppBridge?.applyPentagramChords?.(target, chords);
      const bridgeOk = !result || result.ok !== false;
      btn.textContent = (draftWritten || bridgeOk) ? '✓ Aplicado' : '⚠ ' + (result?.message || 'Error');
      try { window.dispatchEvent(new CustomEvent('studio936:section-chords-updated', { detail: { sectionKey: target } })); } catch (_) {}
    }
    btn.classList.add('is-busy');
    setTimeout(() => { btn.textContent = label; btn.classList.remove('is-busy'); }, 1400);
  }

  // Owner: "LETRA Y COMPASES" -- calcado del prototipo original: una fila
  // por compás, una grilla de 4 casillas de texto (una por tiempo). Si el
  // tiempo ya tiene una nota, muestra/edita su sílaba; si no tiene nota y
  // se escribe algo, crea una nota nueva ahí mismo (midi 60 por defecto,
  // igual que el prototipo) -- exactamente la misma lógica, no una versión
  // simplificada.
  function buildLyricGrid(listEl, sectionKey, totalBars, redrawCanvas) {
    listEl.innerHTML = '';
    const notes = getNotes(sectionKey);
    for (let bar = 0; bar < totalBars; bar++) {
      const row = document.createElement('div');
      row.className = 's936pg-lyricrow';
      const label = document.createElement('span');
      label.className = 's936pg-lyricrow-label';
      label.textContent = 'C ' + (bar + 1);
      const grid = document.createElement('div');
      grid.className = 's936pg-lyricrow-grid';
      for (let b = 0; b < 4; b++) {
        const beatNotes = notes.filter(n => n.bar === bar && Math.floor(n.beat) === b);
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 's936pg-lyric-input';
        if (beatNotes.length) {
          input.value = beatNotes.map(n => n.syllable).filter(Boolean).join('-');
          input.classList.add('has-syllable');
        } else {
          input.placeholder = 'T' + (b + 1);
        }
        input.addEventListener('change', (e) => {
          const val = e.target.value.trim();
          const current = getNotes(sectionKey).slice();
          const targetIdx = current.findIndex(n => n.bar === bar && Math.floor(n.beat) === b);
          if (targetIdx !== -1) {
            current[targetIdx] = Object.assign({}, current[targetIdx], { syllable: val });
          } else if (val) {
            current.push({ bar, beat: b, duration: 1, midi: 60, syllable: val });
            playPreviewNote(60, 0.5);
          } else {
            return;
          }
          setNotes(sectionKey, current);
          buildLyricGrid(listEl, sectionKey, totalBars, redrawCanvas);
          redrawCanvas();
        });
        grid.appendChild(input);
      }
      row.append(label, grid);
      listEl.appendChild(row);
    }
  }

  // Owner: "▶ PLAY" del prototipo -- recorre las notas de esta sección en
  // orden (compás, tiempo) y las suena una tras otra respetando el BPM
  // real de la canción, para poder escuchar lo que se compuso.
  let _bigPlayTimer = null;
  function playSectionNotes(sectionKey, btn) {
    if (_bigPlayTimer) {
      clearTimeout(_bigPlayTimer); _bigPlayTimer = null;
      btn.textContent = '▶ PLAY'; btn.classList.remove('is-playing');
      return;
    }
    const notes = getNotes(sectionKey).slice().sort((a, b) => (a.bar * 4 + a.beat) - (b.bar * 4 + b.beat));
    if (!notes.length) return;
    const bpm = Number(window.Studio936AppBridge?.getBpm?.()) || 95;
    const secPerBeat = 60 / bpm;
    btn.textContent = '⏹ Detener'; btn.classList.add('is-playing');
    let i = 0;
    const step = () => {
      if (i >= notes.length) { btn.textContent = '▶ PLAY'; btn.classList.remove('is-playing'); _bigPlayTimer = null; return; }
      const n = notes[i];
      playPreviewNote(n.midi, Math.min(n.duration * secPerBeat, 1.2));
      i++;
      const next = notes[i];
      const delay = next ? Math.max(80, ((next.bar * 4 + next.beat) - (n.bar * 4 + n.beat)) * secPerBeat * 1000) : 400;
      _bigPlayTimer = setTimeout(step, delay);
    };
    step();
  }

  // Owner: "🧑‍🚀 Analizar Vibe" del prototipo -- ahí también era un
  // análisis simple/cosmético (no una IA real), así que se deja igual de
  // liviano: un par de acordes menores vs. mayores + el BPM real.
  function analyzeVibeText(sectionKey, totalBars) {
    const notes = getNotes(sectionKey);
    if (!notes.length) return 'Todavía no hay notas en este pentagrama para analizar.';
    const chords = computeChordsForSection(sectionKey, totalBars) || [];
    const minorish = chords.filter(c => /m(?!aj)/.test(c.name)).length;
    const bpm = Number(window.Studio936AppBridge?.getBpm?.()) || 95;
    const mood = chords.length && minorish > chords.length / 2 ? 'introspectivo / melancólico' : 'luminoso / positivo';
    const energy = bpm >= 120 ? 'alta energía' : bpm >= 90 ? 'energía media' : 'energía baja, calmado';
    return 'Vibe detectado: ' + mood + ', ' + energy + ' (' + bpm + ' BPM).';
  }

  // Owner: "el panel de edición grande con letra y pentagrama, como te lo
  // di" (Val) -- ESTE modal es "el Editor / el cerebro" que definió Val en
  // su prototipo ("Studio936 DAW - Master Edition"): panel de acciones 2x2
  // (Grabar/Subir/Auto-Acordes/Analizar Vibe), columna "LETRA Y COMPASES",
  // y el pentagrama con su propia cabecera (título, PLAY, figuras,
  // imprimir/exportar/config IA). No es una reinvención -- es el mismo
  // diseño y los mismos botones del HTML que trajo, adaptado a UNA sección
  // (las demás secciones/canción entera se siguen gobernando en Estructura
  // y en el panel flotante de Oído IA). Lo único realmente nuevo es la
  // conexión real: "Auto-Acordes" de acá escribe el acorde sugerido
  // directo en el Chart real -- de ahí en más, ese acorde se edita en Chart.
  function openBigEditor(sectionKey, totalBars, sectionLabel) {
    installStyles();
    const backdrop = document.createElement('div');
    backdrop.className = 's936pg-big-backdrop';
    const card = document.createElement('div');
    card.className = 's936pg-big-card';

    // Owner: "no hay sección... la lógica 100% del render que te di debe
    // ser igual" (Val, con captura) -- el prototipo original muestra TODAS
    // las secciones de la canción en LETRA Y COMPASES (con "+ Añadir
    // Sección" para crear más), no solo la que se abrió. Esto lee el
    // arreglo REAL (mismo draft.parts que ya usan Auto-Acordes/Oído IA),
    // y cualquier alta/baja/reordenar que se haga acá escribe ahí mismo --
    // el Chart ya lo muestra apenas se guarda (misma fuente de siempre).
    let parts = readStructureParts();
    let selectedIdx = Math.max(0, parts.findIndex((p, i) => computeInstanceKeyForPart(parts, i) === sectionKey));

    const head = document.createElement('div');
    head.className = 's936pg-big-head';
    const headText = document.createElement('div');
    const title = document.createElement('div');
    title.className = 's936pg-big-title';
    const sub = document.createElement('div');
    sub.className = 's936pg-big-sub';
    sub.textContent = 'Editor grande — letra y pentagrama';
    headText.append(title, sub);
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 's936pg-big-close';
    closeBtn.textContent = '✕';
    closeBtn.onclick = () => backdrop.remove();
    head.append(headText, closeBtn);

    // Owner: "aquí es donde nace la canción, es la cabeza de todo" (Val,
    // con captura del original) -- el header del prototipo trae Nombre de
    // Canción/Autor/BPM bien visibles, y Val marcó que faltaban. Son los
    // mismos project.title/project.author/project.bpm reales (no un campo
    // suelto): esto lee y escribe la MISMA canción que ya gobierna el
    // resto del DAW, vía los getters/setters nuevos del bridge.
    const bridge = window.Studio936AppBridge;
    const metaBar = document.createElement('div');
    metaBar.className = 's936pg-big-meta';
    const titleField = document.createElement('div');
    titleField.className = 's936pg-meta-field s936pg-meta-title';
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.placeholder = 'Nombre de Canción';
    titleInput.value = bridge?.getTitle?.() || '';
    titleInput.addEventListener('change', () => bridge?.setTitle?.(titleInput.value));
    titleField.appendChild(titleInput);
    const authorField = document.createElement('div');
    authorField.className = 's936pg-meta-field s936pg-meta-author';
    const authorInput = document.createElement('input');
    authorInput.type = 'text';
    authorInput.placeholder = 'Autor';
    authorInput.value = bridge?.getAuthor?.() || '';
    authorInput.addEventListener('change', () => bridge?.setAuthor?.(authorInput.value));
    authorField.appendChild(authorInput);
    const bpmField = document.createElement('div');
    bpmField.className = 's936pg-meta-field';
    const bpmLabel = document.createElement('span');
    bpmLabel.textContent = 'BPM:';
    const bpmInput = document.createElement('input');
    bpmInput.type = 'number';
    bpmInput.className = 's936pg-meta-bpm-input';
    bpmInput.min = '40'; bpmInput.max = '240';
    bpmInput.value = bridge?.getBpm?.() || 95;
    bpmInput.addEventListener('change', () => bridge?.setBPM?.(bpmInput.value));
    bpmField.append(bpmLabel, bpmInput);
    metaBar.append(titleField, authorField, bpmField);

    // Panel de acciones 2x2, igual al actionPanel del prototipo.
    const actions = document.createElement('div');
    actions.className = 's936pg-big-actions';
    const recBtn = document.createElement('button');
    recBtn.type = 'button';
    recBtn.className = 's936pg-actbtn rec';
    recBtn.textContent = '● Grabar con Oído IA';
    const uploadBtn = document.createElement('label');
    uploadBtn.className = 's936pg-actbtn upload';
    uploadBtn.textContent = '✨ Subir Audio IA';
    const uploadInput = document.createElement('input');
    uploadInput.type = 'file';
    uploadInput.accept = 'audio/*';
    uploadInput.hidden = true;
    uploadInput.onchange = async (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (file) { await transcribeAudioWithAI(file); parts = readStructureParts(); renderSectionsList(); }
    };
    uploadBtn.appendChild(uploadInput);
    const chordsBtn = document.createElement('button');
    chordsBtn.type = 'button';
    chordsBtn.className = 's936pg-actbtn chords';
    chordsBtn.textContent = '🎸 Auto-Acordes';
    chordsBtn.title = 'Calcular acordes desde las notas y aplicarlos al Chart real';
    chordsBtn.onclick = () => runAutoChords(currentSectionKey(), currentTotalBars(), chordsBtn);
    const vibeBtn = document.createElement('button');
    vibeBtn.type = 'button';
    vibeBtn.className = 's936pg-actbtn vibe';
    vibeBtn.textContent = '🧑‍🚀 Analizar Vibe';
    vibeBtn.onclick = () => showOidoModal('🧑‍🚀', 'Analizar Vibe', analyzeVibeText(currentSectionKey(), currentTotalBars()), true);
    actions.append(recBtn, uploadBtn, chordsBtn, vibeBtn);

    // Owner: "los 4 botones estaban muy grandes, ponerlos a la izquierda...
    // al lado subes todas las notas del pentagrama bien distribuidos" (Val,
    // con captura) -- en el prototipo original actionPanel y LETRA Y
    // COMPASES viven en la MISMA columna angosta de la izquierda (un
    // <aside> apilado), no en una fila propia de ancho completo; yo los
    // había puesto arriba de las dos columnas, ocupando todo el ancho, lo
    // que dejaba a los botones enormes y el pentagrama con menos alto útil
    // del que en realidad tiene disponible. Corregido: acciones + LETRA Y
    // COMPASES apiladas en la columna izquierda angosta; el pentagrama pasa
    // a ocupar todo el alto disponible al lado.
    const leftCol = document.createElement('div');
    leftCol.className = 's936pg-big-leftcol';
    leftCol.appendChild(actions);

    // Columnas: [acciones + LETRA Y COMPASES] (izquierda) + pentagrama (derecha).
    const columns = document.createElement('div');
    columns.className = 's936pg-big-columns';

    const lyricsPanel = document.createElement('aside');
    lyricsPanel.className = 's936pg-big-lyricspanel';
    const lyricsHead = document.createElement('div');
    lyricsHead.className = 's936pg-big-panelhead';
    lyricsHead.textContent = 'LETRA Y COMPASES';
    const lyricsList = document.createElement('div');
    lyricsList.className = 's936pg-big-lyriclist';
    const addSectionBtn = document.createElement('button');
    addSectionBtn.type = 'button';
    addSectionBtn.className = 's936pg-add-section';
    addSectionBtn.textContent = '+ Añadir Sección';
    addSectionBtn.onclick = openAddSectionModal;
    lyricsPanel.append(lyricsHead, lyricsList, addSectionBtn);
    leftCol.appendChild(lyricsPanel);

    const scorePanel = document.createElement('div');
    scorePanel.className = 's936pg-big-scorepanel';
    const scoreHead = document.createElement('div');
    scoreHead.className = 's936pg-big-scorehead';
    const scoreTitle = document.createElement('span');
    scoreTitle.className = 's936pg-big-scoretitle';
    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 's936pg-big-playbtn';
    playBtn.textContent = '▶ PLAY';
    playBtn.onclick = () => playSectionNotes(currentSectionKey(), playBtn);
    const figures = document.createElement('div');
    figures.className = 's936pg-big-figures';
    const keyBtn = document.createElement('button');
    keyBtn.type = 'button';
    keyBtn.className = 's936pg-big-iconbtn';
    keyBtn.textContent = '🔑';
    keyBtn.title = 'Configurar API Key de Gemini';
    keyBtn.onclick = openApiKeyPrompt;
    const printBtn = document.createElement('button');
    printBtn.type = 'button';
    printBtn.className = 's936pg-big-iconbtn';
    printBtn.textContent = '🖨️';
    printBtn.title = 'Imprimir partitura (próximo cambio)';
    printBtn.onclick = () => alert('Imprimir partitura: próximo cambio.');
    const exportBtn = document.createElement('button');
    exportBtn.type = 'button';
    exportBtn.className = 's936pg-big-iconbtn';
    exportBtn.textContent = '📤';
    exportBtn.title = 'Exportar proyecto (próximo cambio)';
    exportBtn.onclick = () => alert('Exportar proyecto DAW: próximo cambio.');
    scoreHead.append(scoreTitle, playBtn, figures, keyBtn, printBtn, exportBtn);

    const scoreBody = document.createElement('div');
    scoreBody.className = 's936pg-big-scorebody';

    scorePanel.append(scoreHead, scoreBody);
    columns.append(leftCol, scorePanel);
    card.append(head, metaBar, columns);
    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
    backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) backdrop.remove(); });

    // Owner: misma barra de figuras global de siempre (⠿ arrastrable la
    // deja el hilo de arriba), acá se clona chiquita para vivir adentro del
    // editor grande sin duplicar el estado de `selectedDuration`.
    const figureDefs = [
      { d: 4, glyph: '𝅝' }, { d: 2, glyph: '𝅗𝅥' }, { d: 3, glyph: '𝅗𝅥.' }, { d: 1, glyph: '♩' },
      { d: 1.5, glyph: '♩.' }, { d: 0.5, glyph: '♪' }, { d: 0.333, glyph: '3♪' }, { d: 0.25, glyph: '♬' }
    ];
    figureDefs.forEach((f) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 's936pg-figbtn' + (f.d === selectedDuration ? ' is-active' : '');
      b.textContent = f.glyph;
      b.style.fontSize = '13px';
      b.onclick = () => {
        selectedDuration = f.d;
        figures.querySelectorAll('.s936pg-figbtn').forEach((x) => x.classList.remove('is-active'));
        b.classList.add('is-active');
        document.querySelectorAll('.s936pg-toolbar .s936pg-figbtn').forEach((x) => {
          x.classList.toggle('is-active', x.textContent === f.glyph);
        });
      };
      figures.appendChild(b);
    });

    function currentSectionKey() { return computeInstanceKeyForPart(parts, selectedIdx); }
    function currentTotalBars() { return Math.max(1, Number(parts[selectedIdx]?.bars) || 4); }
    function currentPartLabel() { return parts[selectedIdx]?.label || currentSectionKey(); }

    // Owner: cada sección tiene su propio pentagrama -- al elegir otra en
    // LETRA Y COMPASES, el canvas de la derecha se reconstruye entero (así
    // no queda ningún listener/estado de la sección anterior colgado).
    function mountScoreForSelection() {
      scoreBody.innerHTML = '';
      title.textContent = '🎼 ' + currentPartLabel();
      scoreTitle.innerHTML = PENTAGRAM_ICON_SVG + ' PENTAGRAMA TRADICIONAL <small>(' + currentPartLabel() + ' — Haz clic para dibujar)</small>';
      if (!parts.length) return;
      const key = currentSectionKey();
      const bars = currentTotalBars();
      const canvas = document.createElement('canvas');
      canvas.className = 's936pg-canvas';
      const geo = makeGeo(1.6);
      canvas.style.width = (geo.pxPerBar * bars) + 'px';
      canvas.style.height = '220px';
      canvas.title = 'Pentagrama — clic para poner/quitar una nota';
      scoreBody.appendChild(canvas);
      function redraw() { drawPentagram(canvas, getNotes(key), bars, geo); }
      attachClickHandler(canvas, key, bars, redraw, geo);
      requestAnimationFrame(redraw);
    }

    recBtn.onclick = async () => {
      await toggleOidoRecording(recBtn);
      parts = readStructureParts();
      selectedIdx = 0;
      renderSectionsList();
    };

    function persistParts() {
      writeStructureParts(parts);
      try { window.dispatchEvent(new CustomEvent('studio936:section-chords-updated', { detail: { full: true } })); } catch (_) {}
    }

    function selectSection(idx) {
      selectedIdx = Math.max(0, Math.min(parts.length - 1, idx));
      mountScoreForSelection();
      renderSectionsList();
    }

    // Owner: "LETRA Y COMPASES" -- una tarjeta por sección REAL, calcada
    // del prototipo (nombre editable, ↻ x2 para duplicar -- misma
    // convención de "Coro"/"Coro BIS" que ya usa el resto de la app --,
    // compases, subir/bajar, borrar), con su propia grilla de letra debajo.
    function buildSectionCard(part, idx) {
      const block = document.createElement('div');
      block.className = 's936pg-secblock' + (idx === selectedIdx ? ' is-selected' : '');
      const header = document.createElement('div');
      header.className = 's936pg-sec-header';

      const moves = document.createElement('div');
      moves.className = 's936pg-sec-moves';
      const upBtn = document.createElement('button');
      upBtn.type = 'button'; upBtn.textContent = '▲'; upBtn.disabled = idx === 0;
      upBtn.onclick = () => {
        [parts[idx - 1], parts[idx]] = [parts[idx], parts[idx - 1]];
        if (selectedIdx === idx) selectedIdx = idx - 1; else if (selectedIdx === idx - 1) selectedIdx = idx;
        persistParts(); renderSectionsList(); mountScoreForSelection();
      };
      const downBtn = document.createElement('button');
      downBtn.type = 'button'; downBtn.textContent = '▼'; downBtn.disabled = idx === parts.length - 1;
      downBtn.onclick = () => {
        [parts[idx + 1], parts[idx]] = [parts[idx], parts[idx + 1]];
        if (selectedIdx === idx) selectedIdx = idx + 1; else if (selectedIdx === idx + 1) selectedIdx = idx;
        persistParts(); renderSectionsList(); mountScoreForSelection();
      };
      moves.append(upBtn, downBtn);

      const nameWrap = document.createElement('div');
      nameWrap.className = 's936pg-sec-namewrap';
      const bracketL = document.createElement('span'); bracketL.textContent = '[';
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 's936pg-sec-name';
      nameInput.value = part.label || labelForType(part.section);
      nameInput.addEventListener('change', () => {
        part.label = nameInput.value.trim() || labelForType(part.section);
        persistParts();
        if (idx === selectedIdx) mountScoreForSelection();
      });
      const bracketR = document.createElement('span'); bracketR.textContent = ']';
      nameWrap.append(bracketL, nameInput, bracketR);

      const dupBtn = document.createElement('button');
      dupBtn.type = 'button';
      dupBtn.className = 's936pg-sec-dup';
      dupBtn.textContent = '↻ x2';
      dupBtn.title = 'Duplicar esta sección (queda como "BIS", comparte los mismos acordes)';
      dupBtn.onclick = () => {
        parts.splice(idx + 1, 0, Object.assign({}, part));
        persistParts(); renderSectionsList();
      };

      const barsSelect = document.createElement('select');
      barsSelect.className = 's936pg-sec-bars';
      [2, 4, 8, 12, 16].forEach((n) => {
        const opt = document.createElement('option');
        opt.value = String(n); opt.textContent = n + ' Cmp';
        if (Number(part.bars) === n) opt.selected = true;
        barsSelect.appendChild(opt);
      });
      barsSelect.addEventListener('change', () => {
        part.bars = Number(barsSelect.value) || 4;
        persistParts(); renderSectionsList();
        if (idx === selectedIdx) mountScoreForSelection();
      });

      const viewBtn = document.createElement('button');
      viewBtn.type = 'button';
      viewBtn.className = 's936pg-sec-view';
      viewBtn.textContent = '🎼';
      viewBtn.title = 'Ver el pentagrama de esta sección';
      viewBtn.onclick = () => selectSection(idx);

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 's936pg-sec-del';
      delBtn.textContent = '🗑';
      delBtn.title = 'Borrar esta sección';
      delBtn.onclick = () => {
        if (parts.length <= 1) { alert('La canción necesita al menos una sección.'); return; }
        if (!window.confirm('¿Borrar la sección "' + (part.label || labelForType(part.section)) + '"? Esto la quita del arreglo.')) return;
        parts.splice(idx, 1);
        if (selectedIdx >= parts.length) selectedIdx = parts.length - 1;
        persistParts(); renderSectionsList(); mountScoreForSelection();
      };

      header.append(moves, nameWrap, viewBtn, dupBtn, barsSelect, delBtn);
      block.appendChild(header);

      const grid = document.createElement('div');
      grid.className = 's936pg-sec-lyricgrid';
      const key = computeInstanceKeyForPart(parts, idx);
      const bars = Math.max(1, Number(part.bars) || 4);
      buildLyricGrid(grid, key, bars, () => { if (idx === selectedIdx) mountScoreForSelection(); });
      block.appendChild(grid);

      block.addEventListener('click', (e) => {
        if (e.target === block || e.target === header) selectSection(idx);
      });

      return block;
    }

    function renderSectionsList() {
      lyricsList.innerHTML = '';
      if (!parts.length) {
        const empty = document.createElement('div');
        empty.className = 's936pg-sec-empty';
        empty.textContent = 'Esta canción todavía no tiene secciones. Usá "+ Añadir Sección" para crear la primera.';
        lyricsList.appendChild(empty);
        return;
      }
      parts.forEach((part, idx) => lyricsList.appendChild(buildSectionCard(part, idx)));
    }

    // Owner: "+ Añadir Sección" -- mismo modal simple del prototipo
    // (Nombre + Compases, Cancelar/Crear), no un formulario de tipos nuevo.
    function openAddSectionModal() {
      const modalBackdrop = document.createElement('div');
      modalBackdrop.className = 's936pg-modal-backdrop';
      const modalCard = document.createElement('div');
      modalCard.className = 's936pg-modal-card s936pg-addsec-card';
      modalCard.innerHTML =
        '<div class="s936pg-modal-title" style="text-align:left">Añadir Nueva Sección</div>' +
        '<div class="s936pg-key-field"><label>Nombre</label><input type="text" value="Verso" /></div>' +
        '<div class="s936pg-key-field"><label>Compases</label>' +
        '<select><option value="2">2 Compases</option><option value="4" selected>4 Compases</option>' +
        '<option value="8">8 Compases</option><option value="12">12 Compases</option><option value="16">16 Compases</option></select></div>' +
        '<div class="s936pg-key-actions"><button type="button" class="s936pg-key-cancel">Cancelar</button><button type="button" class="s936pg-key-save">Crear</button></div>';
      const nameInput = modalCard.querySelector('input');
      const barsSelect = modalCard.querySelector('select');
      modalCard.querySelector('.s936pg-key-cancel').onclick = () => modalBackdrop.remove();
      modalCard.querySelector('.s936pg-key-save').onclick = () => {
        const name = nameInput.value.trim() || 'Sección';
        const bars = Number(barsSelect.value) || 4;
        const type = inferSectionType(name);
        const used = new Set(parts.map((p) => p.section));
        let key = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '') || 'seccion';
        let n = 2;
        while (used.has(key)) { key = key.replace(/\d+$/, '') + n; n++; }
        const newPart = { section: key, label: name, bars, repeat: 1, independent: true, type };
        parts.push(newPart);
        persistParts();
        selectedIdx = parts.length - 1;
        renderSectionsList();
        mountScoreForSelection();
        modalBackdrop.remove();
      };
      modalBackdrop.appendChild(modalCard);
      document.body.appendChild(modalBackdrop);
      nameInput.focus();
      nameInput.select();
    }

    renderSectionsList();
    mountScoreForSelection();
  }

  // Owner: "debe tener un icono de pentagrama limpio SVG" (Val) -- el
  // emoji 🎼 no combinaba con los íconos reales (SVG) del resto de la app.
  // Un pentagrama de 5 líneas + dos notas, en el mismo tono cian de los
  // demás íconos de la barra superior.
  const PENTAGRAM_ICON_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0">' +
    '<line x1="1" y1="6" x2="23" y2="6" stroke="#5eead4" stroke-width="1.4"/>' +
    '<line x1="1" y1="9.5" x2="23" y2="9.5" stroke="#5eead4" stroke-width="1.4"/>' +
    '<line x1="1" y1="13" x2="23" y2="13" stroke="#5eead4" stroke-width="1.4"/>' +
    '<line x1="1" y1="16.5" x2="23" y2="16.5" stroke="#5eead4" stroke-width="1.4"/>' +
    '<line x1="1" y1="20" x2="23" y2="20" stroke="#5eead4" stroke-width="1.4"/>' +
    '<circle cx="8.5" cy="16.5" r="2.1" fill="#5eead4"/>' +
    '<line x1="10.4" y1="16.5" x2="10.4" y2="6.5" stroke="#5eead4" stroke-width="1.3"/>' +
    '<circle cx="16.5" cy="13" r="2.1" fill="#5eead4"/>' +
    '<line x1="18.4" y1="13" x2="18.4" y2="3" stroke="#5eead4" stroke-width="1.3"/>' +
    '</svg>';

  function renderSectionPentagram(block, sectionKey, opts) {
    try {
      if (!block || !sectionKey) return;
      installStyles();
      const totalBars = Number(opts && opts.totalMeasures) || 0;
      if (!(totalBars > 0)) return;
      const sectionLabel = (opts && opts.sectionLabel) || sectionKey;

      // Owner: "el pentagrama debe iniciar en el mismo punto que el primer
      // tiempo del Chart" (Val, con captura) -- Chart/Lyric/Voz reservan
      // 320px de columna de controles SOLO en la primera sección de la
      // canción (arrIndex === 0) y las demás arrancan pegadas al borde;
      // el pentagrama no tenía ese mismo espaciador, así que su compás 1
      // quedaba corrido hacia la izquierda, debajo de esa columna, en vez
      // de alinear con el compás 1 real de Chart.
      const row = document.createElement('div');
      row.className = 's936pg-lanerow';
      if (!(opts && opts.hideLabelColumn)) {
        const spacer = document.createElement('div');
        spacer.className = 's936pg-labelspacer';
        spacer.innerHTML = PENTAGRAM_ICON_SVG + '<span>Pentagrama</span>';
        spacer.title = 'Abrir editor grande (letra + pentagrama)';
        spacer.addEventListener('click', () => openBigEditor(sectionKey, totalBars, sectionLabel));
        row.appendChild(spacer);
      }

      const wrap = document.createElement('div');
      wrap.className = 's936pg-wrap';
      const canvas = document.createElement('canvas');
      canvas.className = 's936pg-canvas';
      canvas.style.width = (PX_PER_BAR * totalBars) + 'px';
      canvas.title = 'Pentagrama — clic para poner/quitar una nota';
      const autoBtn = document.createElement('button');
      autoBtn.type = 'button';
      autoBtn.className = 's936pg-autochords';
      autoBtn.textContent = '🎼 Auto-Acordes';
      autoBtn.title = 'Calcular acordes a partir de las notas de este pentagrama y aplicarlos a la sección';
      autoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        runAutoChords(sectionKey, totalBars, autoBtn);
      });
      const bigBtn = document.createElement('button');
      bigBtn.type = 'button';
      bigBtn.className = 's936pg-bigeditor';
      bigBtn.textContent = '⛶';
      bigBtn.title = 'Abrir editor grande (letra + pentagrama)';
      bigBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openBigEditor(sectionKey, totalBars, sectionLabel);
      });
      wrap.append(canvas, autoBtn, bigBtn);
      row.appendChild(wrap);
      block.appendChild(row);
      const drawClef = !(opts && opts.hideLabelColumn);
      function redraw() { drawPentagram(canvas, getNotes(sectionKey), totalBars, DEFAULT_GEO, drawClef); }
      attachClickHandler(canvas, sectionKey, totalBars, redraw);
      attachSyllableEditor(canvas, sectionKey, totalBars, redraw);
      // Owner: BUG encontrado al verificar -- el canvas recién insertado
      // todavía no tiene layout (clientWidth/clientHeight en 0) en el mismo
      // instante en que se arma todo Vista Continua de una sola pasada, así
      // que este primer redraw() se salía vacío (el guard `if(!w||!h)
      // return` de drawPentagram) y el pentagrama quedaba en blanco hasta
      // el primer clic -- por eso a veces "aparecía" y a veces no. Un
      // requestAnimationFrame alcanza para que el layout ya esté listo.
      requestAnimationFrame(redraw);
      ensureFiguresToolbar();
      ensureOidoIAPanel();
    } catch (e) {
      console.error('[Pentagrama] renderSectionPentagram falló:', e);
    }
  }

  window.Studio936Pentagram = {
    renderSectionPentagram,
    getNotes,
    setNotes,
    calculateChordForNotes,
    transcribeAudioWithAI
  };
})();
