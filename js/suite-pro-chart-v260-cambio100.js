// Studio 936 Composer - Chart View v2.5.9 Cambio 94 (ZOOM NO PERSISTE ENTRE VISITAS)
// 🎸 Click en el mástil → pone dedos → detecta acorde automáticamente
// 🎹 Click en teclas del piano → arma acorde → detecta automáticamente
// Cambio 94: el Chart ya no recupera el Zoom guardado en localStorage al
// cargar la página — consistente con el mismo cambio en structure.js, cada
// recarga empieza sin ninguna sección enfocada.
window.Studio936SuiteProChart = (() => {
  "use strict";
  const VERSION = "chart-v2.5.9-cambio-94";
  const STYLE_ID = "s936-chart-v259-cambio94";

  const INSTRUMENTS = [
    { id: "piano",   label: "Piano" },
    { id: "guitar",  label: "Guitarra" },
    { id: "ukulele", label: "Ukulele" },
    { id: "bass",    label: "Bajo" }
  ];

  // Cambio 18: el selector superior del Main es la fuente de verdad para la vista instrumental del Chart.
  const MAIN_TO_CHART_INSTRUMENT = {
    piano: "piano",
    epiano: "piano",
    organ: "piano",
    synth: "piano",
    sax: "piano",
    drums: "piano",
    guitar: "guitar",
    lead: "guitar",
    ukulele: "ukulele",
    bass: "bass"
  };

  function normalizeChartInstrumentId(value) {
    const raw = String(value || "").trim().toLowerCase();
    return MAIN_TO_CHART_INSTRUMENT[raw] || (INSTRUMENTS.some(i => i.id === raw) ? raw : "piano");
  }

  function chartInstrumentLabel(id) {
    return INSTRUMENTS.find(i => i.id === normalizeChartInstrumentId(id))?.label || "Piano";
  }

  function getMainInstrumentSelect() {
    return document.getElementById("instrumentSelect") || document.querySelector(".instrument-select");
  }

  function getMainSelectedChartInstrument() {
    const sel = getMainInstrumentSelect();
    return normalizeChartInstrumentId(sel?.value || window.Studio936AppBridge?.getEditorState?.()?.instrument || _chartInstrument || "piano");
  }

  // Cambio 105: el rastreo de "ya conecté esto" vivía en el propio
  // `container` — pero Suite Pro remonta el panel del Chart en un elemento
  // NUEVO cada vez que sales y vuelves a entrar (Estructura/Chart), así que
  // esta función nunca reconocía que ya había una escucha viva y agregaba
  // otra sobre el selector COMPARTIDO (#instrumentSelect), sin borrar la
  // anterior. Con el tiempo se acumulaban varias, cada una con su propio
  // `container` capturado (a veces uno ya viejo/desmontado) — al cambiar de
  // instrumento, todas disparaban a la vez y competían entre sí (a veces
  // ganaba una vieja con datos planos, a veces dos arrancaban el reproductor
  // casi juntas y se pisaban). Ahora el rastreo vive a nivel de módulo: solo
  // existe UNA escucha viva, siempre apuntando al contenedor más reciente.
  let _mainInstrumentChangeHandler = null;
  let _mainInstrumentChangeSelect = null;

  function bindMainInstrumentController(container, onChordEdit) {
    const sel = getMainInstrumentSelect();
    if (!container || !sel) return;
    if (_mainInstrumentChangeSelect && _mainInstrumentChangeHandler) {
      try { _mainInstrumentChangeSelect.removeEventListener("change", _mainInstrumentChangeHandler); } catch(_) {}
    }
    const handler = () => {
      const next = getMainSelectedChartInstrument();
      if (next === _chartInstrument) return;
      _chartInstrument = next;
      try { localStorage.setItem("s936_chart_inst_v1", next); } catch(_) {}
      render({ container, instrument: next, onChordEdit });
    };
    sel.addEventListener("change", handler);
    _mainInstrumentChangeSelect = sel;
    _mainInstrumentChangeHandler = handler;
  }

  let _chartInstrument = localStorage.getItem("s936_chart_inst_v1") || "piano";
  // Cambio 260 (paso 1): estado del interruptor de vista continua — vive
  // solo en memoria (no en localStorage todavía), arranca siempre en
  // "Vista: Bloques" (la de siempre) al recargar la página.
  let _chartContinuousViewOn = false;
  // Cambio 261: estado del péndulo/karaoke de la vista continua — se
  // reconstruye en cada render() de esa vista; solo un listener activo a
  // la vez (se limpia el anterior antes de crear uno nuevo).
  let _contPlayheadRAF = null;
  let _contPlayheadCleanup = null;
  let _activeBeatEl = null;
  let _activeBarEl = null;
  let _activeLyricWordEl = null; // Cambio 51: palabra de letra resaltada tipo karaoke
  let _playbackInterval = null;
  let _currentPlaybackPos = null;

  const FOCUS_KEY = "s936_chart_focus_section_v1";
  let _focusSection = null;

  function readFocusSection() {
    // Cambio 94: se quita el respaldo a localStorage — antes, si la app se
    // recargaba, el Chart recuperaba el Zoom de la última sección usada
    // (guardado de una visita anterior), aunque el dock ya mostrara la
    // lista completa (Cambio 94 en structure.js). Ahora ambos son
    // consistentes: cada recarga empieza sin ninguna sección enfocada:
    // solo la variable en memoria de la sesión ACTUAL del navegador cuenta.
    if (_focusSection && _focusSection.section) return _focusSection;
    return null;
  }

  function setFocusSection(section, info = {}) {
    if (!section) return clearFocusSection();
    _focusSection = { active:true, section:String(section), label:info.label || "", at:Date.now() };
    try { localStorage.setItem(FOCUS_KEY, JSON.stringify(_focusSection)); } catch(_) {}
    const panel = getActiveChartPanel?.();
    if (panel) render({ container: panel, instrument: _chartInstrument });
    return true;
  }

  function clearFocusSection() {
    _focusSection = null;
    try { localStorage.removeItem(FOCUS_KEY); } catch(_) {}
    const panel = getActiveChartPanel?.();
    if (panel) render({ container: panel, instrument: _chartInstrument });
    return true;
  }

  window.addEventListener("studio936:chart-focus-section", (ev) => {
    const detail = ev.detail || {};
    if (detail.section) setFocusSection(detail.section, detail);
  });
  window.addEventListener("studio936:chart-clear-focus-section", () => clearFocusSection());


  // ─── MAPAS DE NOTAS PARA INSTRUMENTOS ──────────────────────────────────
  const FRETBOARD_CONFIG = {
    guitar: {
      strings: ['E4', 'B3', 'G3', 'D3', 'A2', 'E2'],
      open: [64, 59, 55, 50, 45, 40],
      frets: 15,
      label: 'Guitarra'
    },
    ukulele: {
      strings: ['A4', 'E4', 'C4', 'G4'],
      open: [69, 64, 60, 67],
      frets: 12,
      label: 'Ukulele'
    },
    bass: {
      strings: ['G2', 'D2', 'A1', 'E1'],
      open: [43, 38, 33, 28],
      frets: 12,
      label: 'Bajo'
    }
  };

  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  function midiToNote(midi) {
    const octave = Math.floor(midi / 12) - 1;
    const note = NOTE_NAMES[midi % 12];
    return note + octave;
  }

  function noteToMidi(note) {
    const m = note.match(/^([A-G][#b]?)(\d+)$/);
    if (!m) return null;
    const octave = parseInt(m[2]);
    const noteIndex = NOTE_NAMES.indexOf(m[1]);
    if (noteIndex === -1) return null;
    return (octave + 1) * 12 + noteIndex;
  }
  // ─── CAMBIO 8: MINI AUDIO INTERNO DEL CHART ─────────────────────────────
  let _popupAudioCtx = null;
  let _popupAudioTimers = [];
  let _popupAudioNodes = [];
  let _popupRhythmTimer = null;
  let _popupRhythmProvider = null;
  let _popupRhythmPercussion = false;
  let _popupRhythmStep = 0;

  // ─── CAMBIO 14: BRIDGE DE PRÁCTICA CHART ↔ MAIN ─────────────────────
  let _chartRhythmTimer = null;
  let _chartRhythmSteps = [];
  let _chartRhythmIndex = 0;
  let _chartRhythmPulse = false;
  let _chartActiveStepEl = null;
  let _chartActiveRepeatEl = null;
  let _chartPracticeBridge = { source: "interno", started: false, harmonySink: false, bpm: 95, style: "" };
  // Cambio 102: recuerda las opciones de la última sesión de práctica
  // arrancada con éxito, para poder retomarla automáticamente si un
  // re-render (ej. cambio de instrumento) la apaga a medio camino.
  let _lastPracticeStartOptions = null;

  function getPopupAudioCtx() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!_popupAudioCtx) _popupAudioCtx = new Ctx();
    if (_popupAudioCtx.state === "suspended") {
      try { _popupAudioCtx.resume(); } catch(_) {}
    }
    return _popupAudioCtx;
  }

  function stopChartPopupAudio() {
    _popupAudioTimers.forEach(id => clearTimeout(id));
    _popupAudioTimers = [];
    if (_popupRhythmTimer) {
      clearInterval(_popupRhythmTimer);
      _popupRhythmTimer = null;
    }
    _popupRhythmProvider = null;
    _popupRhythmStep = 0;
    _popupAudioNodes.forEach(node => {
      try { node.stop(0); } catch(_) {}
      try { node.disconnect(); } catch(_) {}
    });
    _popupAudioNodes = [];
  }

  function midiToFreq(midi) {
    return 440 * Math.pow(2, (Number(midi) - 69) / 12);
  }

  function schedulePopupTone(midi, startOffset, duration, gainValue) {
    const n = Number(midi);
    if (!Number.isFinite(n)) return;
    if (playEngineNote(n, Math.max(0.05, Number(duration) || 0.22), Math.max(0.02, Number(gainValue) || 0.055), "triangle", startOffset)) return;
    const ctx = getPopupAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const start = now + Math.max(0, Number(startOffset) || 0);
    const dur = Math.max(0.05, Number(duration) || 0.22);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(midiToFreq(n), start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.002, gainValue || 0.055), start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.03);
    _popupAudioNodes.push(osc);

    const cleanup = setTimeout(() => {
      _popupAudioNodes = _popupAudioNodes.filter(n => n !== osc);
      try { osc.disconnect(); } catch(_) {}
      try { gain.disconnect(); } catch(_) {}
    }, Math.ceil((startOffset + dur + 0.18) * 1000));
    _popupAudioTimers.push(cleanup);
  }

  function schedulePopupPercussion(step, startOffset = 0) {
    const strong = (Number(step) || 0) % 4 === 0;
    if (playEngineClick(strong, startOffset)) return;
    const ctx = getPopupAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const start = now + Math.max(0, Number(startOffset) || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = strong ? "sine" : "square";
    osc.frequency.setValueAtTime(strong ? 82 : 1180, start);
    if (strong) {
      osc.frequency.exponentialRampToValueAtTime(46, start + 0.09);
    }

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(strong ? 0.09 : 0.022, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + (strong ? 0.16 : 0.045));

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + (strong ? 0.18 : 0.06));
    _popupAudioNodes.push(osc);

    const cleanup = setTimeout(() => {
      _popupAudioNodes = _popupAudioNodes.filter(n => n !== osc);
      try { osc.disconnect(); } catch(_) {}
      try { gain.disconnect(); } catch(_) {}
    }, Math.ceil((startOffset + 0.24) * 1000));
    _popupAudioTimers.push(cleanup);
  }

  function normalizePopupMidis(midis) {
    return [...new Set((midis || [])
      .map(Number)
      .filter(m => Number.isFinite(m) && m >= 12 && m <= 108))]
      .sort((a, b) => a - b);
  }

  function getMainAudioCtx() {
    return window.__studio936AudioCtx || null;
  }

  function hasMainAudioEngine() {
    const Audio = window.Studio936AudioEngine;
    return !!(Audio && typeof Audio.playNote === "function" && typeof Audio.resumeAudio === "function" && getMainAudioCtx());
  }

  function mainEngineWhen(offset = 0) {
    const ctx = getMainAudioCtx();
    return ctx ? ctx.currentTime + Math.max(0, Number(offset) || 0) : undefined;
  }

  function playEngineNote(midi, duration = 0.22, gain = 0.05, type = "triangle", offset = 0) {
    const n = Number(midi);
    if (!Number.isFinite(n)) return false;
    const Audio = window.Studio936AudioEngine;
    if (!hasMainAudioEngine()) return false;
    try {
      Audio.resumeAudio?.();
      Audio.playNote(n, duration, gain, type, mainEngineWhen(offset));
      return true;
    } catch (error) {
      console.warn("Studio936 Chart: AudioEngine note failed", error);
      return false;
    }
  }

  function playEngineChord(midis, duration = 0.22, gain = 0.26, offset = 0) {
    const notes = normalizePopupMidis(midis);
    const Audio = window.Studio936AudioEngine;
    if (!notes.length || !hasMainAudioEngine()) return false;
    try {
      Audio.resumeAudio?.();
      if (typeof Audio.strumChord === "function") {
        Audio.strumChord(notes, duration, gain, mainEngineWhen(offset), "active-chord");
      } else {
        notes.forEach((m, i) => Audio.playNote(m, duration, Math.max(0.035, gain / Math.max(2, notes.length)), "triangle", mainEngineWhen(offset + i * 0.012)));
      }
      return true;
    } catch (error) {
      console.warn("Studio936 Chart: AudioEngine chord failed", error);
      return false;
    }
  }

  function playEngineClick(accent = false, offset = 0) {
    const Audio = window.Studio936AudioEngine;
    if (!hasMainAudioEngine() || typeof Audio.playMetronomeClick !== "function") return false;
    try {
      Audio.resumeAudio?.();
      Audio.playMetronomeClick(!!accent, mainEngineWhen(offset));
      return true;
    } catch (error) {
      console.warn("Studio936 Chart: AudioEngine click failed", error);
      return false;
    }
  }

  // Cambio 104: dispara la batería REAL de Main (mismo kit/patrón por
  // sección y estilo) para un paso de dieciseisavo (0-15) dentro del
  // groove de práctica del Chart. Antes de este cambio, el Chart no
  // tocaba percusión en absoluto.
  function playEngineDrumStep(sectionKey, step16, offset = 0) {
    const bridge = window.Studio936AppBridge;
    if (!hasMainAudioEngine() || typeof bridge?.scheduleDrumStep !== "function") return false;
    try {
      bridge.scheduleDrumStep(sectionKey, step16, mainEngineWhen(offset));
      return true;
    } catch (error) {
      console.warn("Studio936 Chart: batería vía Bridge falló", error);
      return false;
    }
  }

  function rootMidiForChord(chordName) {
    const m = String(chordName || "").match(/^([A-G][b#]?)/i);
    if (!m) return 36;
    const pc = PC[m[1].toUpperCase().replace("b","B")] ?? 0;
    let midi = 36 + pc;
    while (midi < 36) midi += 12;
    while (midi > 47) midi -= 12;
    return midi;
  }

  function bassPatternMidi(rootMidi, chordMidis, step16, styleName) {
    const root = Number(rootMidi) || 36;
    const style = String(styleName || "").toLowerCase();
    const fifth = root + 7;
    const octave = root + 12;
    if (style === "jazz") {
      const pool = [root, chordMidis?.[0] || root + 4, chordMidis?.[1] || fifth, root + 11];
      return pool[[0,4,8,12].indexOf(step16)] || root;
    }
    if (style === "blues") return step16 % 6 === 0 ? fifth : root;
    if (style === "bossa") return (step16 === 0 || step16 === 8) ? root : fifth;
    if (style === "funk") return (step16 === 6 || step16 === 14) ? fifth : root;
    if (style === "bolero") return step16 === 8 ? fifth : root;
    if (style === "salsa") return (step16 === 7 || step16 === 14) ? fifth : (step16 === 10 ? octave : root);
    if (style === "cumbia") return (step16 === 4 || step16 === 12) ? fifth : root;
    if (style === "reggae") return step16 === 8 ? fifth : root;
    return root;
  }

  function thinChartChord(notes) {
    const list = normalizePopupMidis(notes);
    if (list.length <= 2) return list;
    return [list[0], list[list.length - 1]];
  }

  function scheduleChartPracticeGroove(step, mode, bridgeState) {
    const normalizedMode = normalizeRhythmMode(mode || step?.rhythm || "hit");
    if (normalizedMode === "rest") {
      if (_chartRhythmPulse) playEngineClick(Number(step?.beat || 0) === 0, 0);
      return true;
    }

    const chordName = step?.chord || "";
    const chordMidis = chordToChartMidis(chordName, step);
    if (!chordMidis.length) return false;

    const bpm = Number(bridgeState?.bpm || getCurrentChartBpm()) || 95;
    const styleName = String(bridgeState?.style || getCurrentChartStyle() || "funk").toLowerCase();
    const rhythm = window.Studio936Rhythms?.[styleName] || window.Studio936Rhythms?.funk || { bass:[0], chord:[0], ghost:[] };
    const beatIndex = Math.max(0, Math.min(3, Number(step?.beat) || 0));
    const sixteenth = 60 / bpm / 4;
    const rootBass = rootMidiForChord(chordName);
    const useEngine = hasMainAudioEngine();

    if (!useEngine) {
      schedulePopupRhythmHit(chordMidis, bpm, false, normalizedMode);
      if (_chartRhythmPulse) schedulePopupPercussion(_chartRhythmIndex - 1, 0);
      return false;
    }

    for (let sub = 0; sub < 4; sub += 1) {
      const step16 = beatIndex * 4 + sub;
      const offset = sub * sixteenth;
      playEngineDrumStep(step?.section, step16, offset);
      if (_chartRhythmPulse && sub === 0) playEngineClick(beatIndex === 0, offset);
      if (Array.isArray(rhythm.bass) && rhythm.bass.includes(step16)) {
        const bass = bassPatternMidi(rootBass, chordMidis, step16, styleName);
        playEngineNote(bass, 0.29, normalizedMode === "hold" ? 0.40 : 0.46, "sine", offset);
        if (step16 === 0 || styleName === "rock" || styleName === "ballad") {
          playEngineNote(Math.max(24, bass - 12), 0.16, normalizedMode === "hold" ? 0.50 : 0.62, "sine", offset);
        }
      }
      if (rhythm.arp) {
        const arpSteps = styleName === "ballad" ? [0,2,4,6,8,10,12,14] : [0,3,6,8,11,14];
        if (arpSteps.includes(step16)) {
          const m = chordMidis[(Math.floor(step16 / 2) + Number(step?.bar || 0)) % chordMidis.length];
          playEngineNote(m, 0.12, normalizedMode === "hold" ? 0.46 : 0.54, "triangle", offset);
        }
      }
      if (Array.isArray(rhythm.chord) && rhythm.chord.includes(step16)) {
        playEngineChord(chordMidis, 0.13, normalizedMode === "hold" ? 0.29 : 0.36, offset);
      }
      if (Array.isArray(rhythm.ghost) && rhythm.ghost.includes(step16)) {
        playEngineChord(thinChartChord(chordMidis), 0.055, 0.18, offset);
      }
    }

    // Si el estilo no dispara nada justo en ese beat, deja respirar el acorde para que no parezca mudo.
    const hasAny = [rhythm.bass, rhythm.chord, rhythm.ghost].some(list => Array.isArray(list) && list.some(v => v >= beatIndex * 4 && v < beatIndex * 4 + 4));
    if (!hasAny && normalizedMode === "hold") {
      playEngineChord(chordMidis, Math.min(0.55, 60 / bpm * 0.85), 0.23, 0);
    }
    return true;
  }

  function chordNameToPreviewMidis(chordName) {
    const pcs = [...chordPitchClasses(chordName)];
    return normalizePopupMidis(pcs.map(pc => 60 + pc));
  }

  function getCurrentChartBpm() {
    const valid = value => {
      const n = Number(value);
      return Number.isFinite(n) && n >= 30 && n <= 260 ? n : null;
    };
    try {
      const bridgeBpm = window.Studio936AppBridge?.getBpm?.();
      const b = valid(bridgeBpm);
      if (b) return b;
    } catch(_) {}
    try {
      const raw = JSON.parse(localStorage.getItem("s936_suitepro_structure_v4") || "{}");
      const b = valid(raw?.draft?.meta?.bpm || raw?.meta?.bpm);
      if (b) return b;
    } catch(_) {}
    const selectors = [
      "#bpmSlider", "#bpmDisplay", "#tempoInput", "#bpmInput", "[data-bpm]", ".tempo-value", ".bpm-value"
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      const b = valid(el?.value || el?.textContent || el?.dataset?.bpm);
      if (b) return b;
    }
    return 95;
  }

  function schedulePopupRhythmHit(midis, bpm, withPercussion = false, playMode = "hit") {
    const notes = normalizePopupMidis(midis);
    if (!notes.length) return;
    const beatMs = Math.max(180, Math.round(60000 / (Number(bpm) || 95)));
    const mode = normalizeRhythmMode(playMode || "hit");

    // Cambio 14:
    // "hold" no es silencio. Si el acorde pertenece al compás,
    // los beats 2, 3 y 4 también deben sonar/respirar ese acorde,
    // pero con ataque más suave para sentirse como sostén.
    const isHold = mode === "hold";
    const gain = isHold
      ? (notes.length > 5 ? 0.016 : 0.023)
      : (notes.length > 5 ? 0.034 : 0.046);
    const duration = isHold
      ? Math.min(0.88, beatMs / 1000 * 0.92)
      : Math.min(0.38, beatMs / 1000 * 0.62);

    notes.forEach(m => schedulePopupTone(m, 0, duration, gain));
    if (withPercussion) {
      schedulePopupPercussion(_popupRhythmStep, 0);
      _popupRhythmStep += 1;
    }
  }

  function playPopupChord(midis, duration = 0.75) {
    const notes = normalizePopupMidis(midis);
    if (!notes.length) return;
    stopChartPopupAudio();
    const gain = notes.length > 5 ? 0.038 : 0.052;
    notes.forEach(m => schedulePopupTone(m, 0, duration, gain));
  }

  function playPopupArpeggio(midis, bpm) {
    const notes = normalizePopupMidis(midis);
    if (!notes.length) return;
    stopChartPopupAudio();
    const step = Math.max(0.09, (60 / (Number(bpm) || 95)) / 2);
    notes.forEach((m, i) => schedulePopupTone(m, i * step, step * 0.92, 0.06));
  }

  function startPopupRhythm(midisOrProvider, bpm, withPercussion = false) {
    const provider = typeof midisOrProvider === "function" ? midisOrProvider : () => midisOrProvider;
    const notes = normalizePopupMidis(provider());
    if (!notes.length) return false;
    stopChartPopupAudio();
    _popupRhythmProvider = provider;
    _popupRhythmPercussion = !!withPercussion;
    _popupRhythmStep = 0;
    const beatMs = Math.max(180, Math.round(60000 / (Number(bpm) || 95)));
    const hit = () => schedulePopupRhythmHit(_popupRhythmProvider?.() || [], getCurrentChartBpm(), _popupRhythmPercussion);
    hit();
    _popupRhythmTimer = setInterval(hit, beatMs);
    return true;
  }

  function restartPopupRhythmIfNeeded(withPercussion) {
    if (!_popupRhythmProvider || !_popupRhythmTimer) return false;
    return startPopupRhythm(_popupRhythmProvider, getCurrentChartBpm(), !!withPercussion);
  }

  function playPopupSingleMidi(midi) {
    const n = Number(midi);
    if (!Number.isFinite(n)) return;
    schedulePopupTone(n, 0, 0.24, 0.07);
  }

  function closeRepeatPracticeView(el) {
    if (!el) return;
    el.classList.remove("repeat-practice-open");
    el.querySelectorAll(".s936-repeat-practice-grid").forEach(node => node.remove());
  }

  function openRepeatPracticeView(el, step) {
    if (!el || !el.classList.contains("s936-ch-repeat-bar")) return;
    el.classList.add("repeat-practice-open");
    let grid = el.querySelector(".s936-repeat-practice-grid");
    if (!grid) {
      grid = document.createElement("div");
      grid.className = "s936-repeat-practice-grid";
      const chord = el.dataset.repeatChord || step?.chord || "";
      [0, 1, 2, 3].forEach((idx) => {
        const cell = document.createElement("div");
        cell.className = "s936-repeat-practice-cell";
        cell.dataset.repeatBeat = String(idx);
        const symbol = document.createElement("strong");
        symbol.textContent = "♩";
        const label = document.createElement("span");
        label.textContent = String(idx + 1);
        const chordLabel = document.createElement("em");
        chordLabel.textContent = chord || "%";
        cell.append(symbol, label, chordLabel);
        grid.appendChild(cell);
      });
      el.appendChild(grid);
    }
    const beat = Math.max(0, Math.min(3, Number(step?.beat) || 0));
    grid.querySelectorAll(".s936-repeat-practice-cell").forEach((cell) => {
      cell.classList.toggle("active", Number(cell.dataset.repeatBeat) === beat);
    });
    _chartActiveRepeatEl = el;
  }

  function clearChartStepLight({ closeRepeat = true } = {}) {
    if (_chartActiveStepEl) {
      _chartActiveStepEl.classList.remove(
        "chart-step-active",
        "chart-step-hit",
        "chart-step-hold",
        "chart-step-rest",
        "chart-step-repeat"
      );
      if (closeRepeat && _chartActiveStepEl.classList?.contains("s936-ch-repeat-bar")) {
        closeRepeatPracticeView(_chartActiveStepEl);
      }
      _chartActiveStepEl = null;
    }
    if (closeRepeat && _chartActiveRepeatEl && _chartActiveRepeatEl !== _chartActiveStepEl) {
      closeRepeatPracticeView(_chartActiveRepeatEl);
      _chartActiveRepeatEl = null;
    }
  }

  function setChartStepLight(el, rhythmMode, step = null) {
    clearChartStepLight({ closeRepeat: el !== _chartActiveRepeatEl });
    if (!el) return;
    const mode = normalizeRhythmMode(rhythmMode || "hit");
    el.classList.add("chart-step-active", "chart-step-" + mode);
    if (el.classList.contains("s936-ch-repeat-bar")) {
      openRepeatPracticeView(el, step || { beat: 0, chord: el.dataset.repeatChord || "" });
    }
    _chartActiveStepEl = el;
    try { el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" }); } catch(_) {}
  }

  function emitChartPracticeStep(step, mode) {
    try {
      window.dispatchEvent(new CustomEvent("studio936:chart-practice-step", {
        detail: {
          section: step?.section || "",
          bar: Number.isFinite(Number(step?.bar)) ? Number(step.bar) : null,
          beat: Number.isFinite(Number(step?.beat)) ? Number(step.beat) : null,
          chord: step?.chord || "",
          rhythm: normalizeRhythmMode(mode || step?.rhythm || "hit"),
          label: step?.label || "",
          bpm: _chartPracticeBridge?.bpm || getCurrentChartBpm(),
          style: _chartPracticeBridge?.style || getCurrentChartStyle(),
          sourceClock: _chartPracticeBridge?.source || "interno",
          source: "Studio936SuiteProChart",
          version: VERSION
        }
      }));
    } catch(_) {}
  }

  function getCurrentChartStyle() {
    try {
      const bridgeStyle = window.Studio936AppBridge?.getStyle?.();
      if (bridgeStyle) return String(bridgeStyle);
    } catch(_) {}
    try {
      const raw = JSON.parse(localStorage.getItem("s936_suitepro_structure_v4") || "{}");
      const style = raw?.draft?.meta?.style || raw?.draft?.style || raw?.meta?.style || raw?.style;
      if (style) return String(style);
    } catch(_) {}
    const selectors = ["#styleSelect", "#songStyle", "[data-style]", ".style-value"];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      const value = el?.value || el?.textContent || el?.dataset?.style;
      if (value) return String(value).trim();
    }
    return "";
  }

  function tryBridgeCall(names, ...args) {
    const bridge = window.Studio936AppBridge;
    if (!bridge) return false;
    for (const name of names) {
      const fn = bridge[name];
      if (typeof fn === "function") {
        try {
          fn.apply(bridge, args);
          return true;
        } catch (error) {
          console.warn("Studio936 Chart bridge call failed:", name, error);
        }
      }
    }
    return false;
  }

  function startChartCentralPracticeBridge({ withPulse = false } = {}) {
    const bpm = getCurrentChartBpm();
    const style = getCurrentChartStyle();
    let started = false;

    tryBridgeCall(["setBpm"], bpm);
    if (style) tryBridgeCall(["setStyle"], style);

    // Cambio 16: no arrancamos el groove Main viejo si no acepta armonía del Chart,
    // porque tocaría la progresión antigua. Primero usamos el AudioEngine + RhythmEngine
    // central como motor sonoro, y dejamos eventos para que el Main completo se conecte
    // cuando exponga un sink armónico real.
    started = hasMainAudioEngine();

    if (!started) {
      started = tryBridgeCall(
        ["startChartPractice", "startPracticeGroove"],
        { bpm, style, withPulse, source: "Studio936SuiteProChart", version: VERSION }
      );
    }

    try {
      window.dispatchEvent(new CustomEvent("studio936:chart-practice-start", {
        detail: { bpm, style, withPulse: !!withPulse, centralStarted: started, version: VERSION, section: getCurrentChartSectionKey(), scope: "chart" }
      }));
    } catch(_) {}

    _chartPracticeBridge = {
      source: started ? (hasMainAudioEngine() ? "audio-engine" : "main") : "interno",
      started,
      harmonySink: false,
      bpm,
      style
    };
    return _chartPracticeBridge;
  }

  function stopChartCentralPracticeBridge() {
    const wasStarted = !!_chartPracticeBridge?.started;
    if (wasStarted) {
      tryBridgeCall(["stopGroove", "stopRhythm", "stopPracticeGroove", "stopChartPractice"]);
    }
    try {
      window.dispatchEvent(new CustomEvent("studio936:chart-practice-stop", {
        detail: { centralStopped: wasStarted, version: VERSION }
      }));
    } catch(_) {}
    _chartPracticeBridge = { source: "interno", started: false, harmonySink: false, bpm: getCurrentChartBpm(), style: getCurrentChartStyle() };
  }

  function publishChartHarmonyStep(step, mode) {
    const detail = {
      section: step?.section || "",
      bar: Number.isFinite(Number(step?.bar)) ? Number(step.bar) : null,
      beat: Number.isFinite(Number(step?.beat)) ? Number(step.beat) : null,
      chord: step?.chord || "",
      rhythm: normalizeRhythmMode(mode || step?.rhythm || "hit"),
      bpm: _chartPracticeBridge?.bpm || getCurrentChartBpm(),
      style: _chartPracticeBridge?.style || getCurrentChartStyle(),
      sourceClock: _chartPracticeBridge?.source || "interno",
      source: "Studio936SuiteProChart",
      version: VERSION
    };

    let sent = false;
    const bridge = window.Studio936AppBridge;
    if (bridge) {
      const names = ["onChartHarmony", "setChartChord", "setCurrentChord", "receiveChartChord", "updateCurrentChord"];
      for (const name of names) {
        if (typeof bridge[name] === "function") {
          try {
            bridge[name](detail);
            sent = true;
            break;
          } catch (error) {
            console.warn("Studio936 Chart harmony bridge failed:", name, error);
          }
        }
      }
    }

    try {
      window.dispatchEvent(new CustomEvent("studio936:chart-harmony", { detail }));
    } catch(_) {}

    _chartPracticeBridge.harmonySink = sent;
    return sent;
  }

  function stopChartRhythmConsole({ stopAudio = true, stopBridge = true, preserveResume = false } = {}) {
    if (_chartRhythmTimer) {
      clearInterval(_chartRhythmTimer);
      _chartRhythmTimer = null;
    }
    _chartRhythmSteps = [];
    _chartRhythmIndex = 0;
    clearChartStepLight({ closeRepeat: true });
    if (stopBridge) stopChartCentralPracticeBridge();
    document.querySelectorAll(".s936-ch-console-btn.playing").forEach(btn => btn.classList.remove("playing"));
    document.querySelectorAll(".s936-ch-console-status").forEach(el => {
      el.textContent = "Listo";
      el.classList.remove("on");
    });
    document.querySelectorAll(".s936-ch-console-source").forEach(el => {
      el.textContent = "Motor: listo";
      el.classList.remove("main", "fallback");
    });
    setMainTransportChartState(false);
    if (stopAudio) stopChartPopupAudio();
    // Cambio 102: un stop EXPLÍCITO (usuario le da Stop) olvida la sesión;
    // un stop interno por re-render (preserveResume:true) la conserva para
    // poder retomarla automáticamente después de redibujar.
    if (!preserveResume) _lastPracticeStartOptions = null;
  }

  // Cambio 100: conversión de una digitación real ({frets:[...]} para
  // guitarra/ukelele/bajo, o {midis:[...]} para piano) a notas MIDI reales,
  // usando la misma tabla de afinación (FRETBOARD_CONFIG) que ya usa el
  // diapasón visual — así el audio y el dibujo siempre coinciden.
  function chordVoicingToMidis(voicing, inst) {
    if (!voicing) return null;
    if (inst === "piano") {
      if (Array.isArray(voicing.midis) && voicing.midis.length) {
        return voicing.midis.map(Number).filter(Number.isFinite);
      }
      return null;
    }
    const config = FRETBOARD_CONFIG[inst];
    if (!config || !Array.isArray(voicing.frets)) return null;
    const midis = voicing.frets
      .map((fret, i) => {
        if (fret === null || fret === undefined || String(fret).toUpperCase() === "X") return null;
        const base = config.open[i];
        if (!Number.isFinite(base)) return null;
        const n = Number(fret);
        return Number.isFinite(n) ? base + n : null;
      })
      .filter(m => Number.isFinite(m));
    return midis.length ? midis : null;
  }

  // Cambio 100: busca la digitación real del acorde, en el mismo orden de
  // prioridad que ya usa el dibujo del diapasón (renderBeat): voicing
  // guardado para ese beat exacto → librería de voicings del instrumento
  // actual (viene del Bridge, misma fuente que Main) → forma de acorde
  // conocida (GUITAR_SHAPES/UKU_SHAPES). Si nada de eso existe, devuelve
  // null y el llamador cae al genérico anterior (nunca se queda mudo).
  function realChartChordMidis(chordName, sectionKey, barIndex, beatIndex, inst) {
    if (!chordName) return null;
    const nameUpper = chordName.toUpperCase().trim();
    let voicing = null;
    if (sectionKey !== undefined && barIndex !== undefined && beatIndex !== undefined) {
      voicing = getBeatVoicing(sectionKey, barIndex, beatIndex, inst);
    }
    if (!voicing) {
      try {
        const edState = window.Studio936AppBridge?.getEditorState?.() || {};
        voicing = edState.voicingLibrary?.[inst]?.[nameUpper] || null;
      } catch(_) { voicing = null; }
    }
    if (!voicing && inst !== "piano") {
      voicing = calcFretVoicing(chordName, inst);
    }
    return chordVoicingToMidis(voicing, inst);
  }

  function chordToChartMidis(chordName, step) {
    const inst = getMainSelectedChartInstrument();
    const real = realChartChordMidis(chordName, step?.section, step?.bar, step?.beat, inst);
    if (real && real.length) return real;
    // Fallback: apilado genérico de clases de altura (comportamiento anterior).
    return chordNameToPreviewMidis(chordName);

  }

  function collectChartRhythmSteps(container) {
    const root = container || document;
    const nodes = Array.from(root.querySelectorAll(".s936-ch-beat, .s936-ch-repeat-bar"));
    const steps = [];
    let lastChord = "";
    let activeBarChord = "";

    nodes.forEach((el) => {
      if (el.classList.contains("s936-ch-repeat-bar")) {
        const chord = el.dataset.repeatChord || activeBarChord || lastChord || "";
        if (chord) {
          activeBarChord = chord;
          lastChord = chord;
        }
        [0, 1, 2, 3].forEach((beat) => {
          steps.push({
            el,
            section: el.dataset.section || "",
            bar: Number(el.dataset.bar),
            beat,
            chord,
            rhythm: beat === 0 ? "repeat" : "hold",
            label: "% " + (beat + 1)
          });
        });
        return;
      }

      const barNum = Number(el.dataset.bar);
      const beatNum = Number(el.dataset.beat);
      if (beatNum === 0) activeBarChord = "";

      const mode = normalizeRhythmMode(el.dataset.rhythm || "hit");
      let chord = el.dataset.chord || "";
      if (chord && beatNum === 0) activeBarChord = chord;
      if (chord) lastChord = chord;

      // Cambio 14:
      // Si la celda es sostén/repetición, hereda el acorde activo del compás.
      // Esto evita que los beats 2-4 queden mudos cuando hay un solo acorde
      // ocupando todo el compás.
      if (!chord && (mode === "hold" || mode === "repeat")) {
        chord = activeBarChord || lastChord || "";
      }
      if (mode === "hold" && !activeBarChord && chord) {
        activeBarChord = chord;
      }

      steps.push({
        el,
        section: el.dataset.section || "",
        bar: barNum,
        beat: beatNum,
        chord,
        rhythm: mode,
        label: (barNum + 1) + "." + (beatNum + 1)
      });
    });

    return steps;
  }


  function normalizeStepKey(section, bar, beat = 0) {
    return String(section || "") + "::" + String(Number(bar) || 0) + "::" + String(Number(beat) || 0);
  }

  function findStepIndex(steps, section, bar, beat = 0, preferLastBeat = false) {
    const targetSection = String(section || "");
    const targetBar = Number(bar) || 0;
    const filtered = steps
      .map((step, index) => ({ step, index }))
      .filter(({ step }) => String(step.section || "") === targetSection && Number(step.bar) === targetBar);
    if (!filtered.length) return -1;
    if (preferLastBeat) return filtered[filtered.length - 1].index;
    const exact = filtered.find(({ step }) => Number(step.beat) === Number(beat || 0));
    return exact ? exact.index : filtered[0].index;
  }

  function applyPracticeNavigationToSteps(steps) {
    const list = Array.isArray(steps) ? steps : [];
    if (!list.length) return list;
    const marks = readNavigationMarks().filter(isBarPracticeMark);

    // Cambio 23:
    // El loop de práctica es temporal y manda sobre el recorrido visual.
    // Si existen Loop inicio + Loop final en una sección, Practicar Chart toca solo ese rango.
    const loopStart = marks.find(mark => String(mark.type || "") === "loopStart");
    const loopEnd = marks.find(mark => String(mark.type || "") === "loopEnd"
      && (!loopStart || String(mark.section || "") === String(loopStart.section || "")));

    if (loopStart && loopEnd) {
      const a = findStepIndex(list, loopStart.section, loopStart.bar, 0, false);
      const b = findStepIndex(list, loopEnd.section, loopEnd.bar, 3, true);
      if (a >= 0 && b >= 0) {
        const start = Math.min(a, b);
        const end = Math.max(a, b);
        return list.slice(start, end + 1).map(step => Object.assign({}, step, { practiceRange: "loop" }));
      }
    }

    // Practicar desde aquí no crea loop: solo arranca en ese compás y continúa hacia adelante.
    const practiceStart = marks.find(mark => String(mark.type || "") === "practiceStart");
    if (practiceStart) {
      const start = findStepIndex(list, practiceStart.section, practiceStart.bar, 0, false);
      if (start >= 0) return expandSectionRepeatsInSteps(list.slice(start)).map(step => Object.assign({}, step, { practiceRange: "fromHere" }));
    }

    return expandSectionRepeatsInSteps(list);
  }

  function startChartRhythmConsole(container, { withPulse = false, scope = "auto", section = "", sourceLabel = "" } = {}) {
    stopChartRhythmConsole({ stopAudio: true, stopBridge: true });
    // Cambio 101: el Chart y el Main son dos relojes de reproducción
    // independientes (cada uno con su propio setInterval/rAF). Si Main ya
    // estaba sonando (arrancado antes de entrar al Chart, sin pasar por el
    // botón interceptado #playBtn), su transporte seguía corriendo en
    // paralelo al del Chart — ambos mandando notas al mismo motor de audio
    // sin coordinarse, produciendo dos ritmos simultáneos. Se detiene el
    // transporte de Main explícitamente antes de arrancar el del Chart.
    try { window.Studio936AppBridge?.stopPlayback?.(); } catch(_) {}
    const baseSteps = collectChartRhythmSteps(container);
    if (scope === "song") {
      _chartRhythmSteps = expandSectionRepeatsInSteps(baseSteps).map(step => Object.assign({}, step, { practiceRange: "song" }));
    } else if (scope === "section") {
      const sectionKey = String(section || getCurrentChartSectionKey() || "");
      const filtered = baseSteps.filter(step => String(step.section || "") === sectionKey);
      _chartRhythmSteps = expandSectionRepeatsInSteps(filtered.length ? filtered : baseSteps).map(step => Object.assign({}, step, { practiceRange: "section" }));
    } else {
      _chartRhythmSteps = applyPracticeNavigationToSteps(baseSteps);
    }
    if (!_chartRhythmSteps.length) return false;

    _chartRhythmPulse = !!withPulse;
    _chartRhythmIndex = 0;
    const bridgeState = startChartCentralPracticeBridge({ withPulse: _chartRhythmPulse });
    try {
      window.dispatchEvent(new CustomEvent("studio936:chart-practice-start", {
        detail: {
          bpm: bridgeState.bpm || getCurrentChartBpm(),
          style: bridgeState.style || getCurrentChartStyle(),
          withPulse: _chartRhythmPulse,
          centralStarted: !!bridgeState.started,
          version: VERSION,
          section: _chartRhythmSteps[0]?.section || "",
          scope: scope || "auto",
          sourceLabel: sourceLabel || ""
        }
      }));
    } catch(_) {}

    const sourceEl = container?.querySelector?.(".s936-ch-console-source");
    if (sourceEl) {
      const isMain = bridgeState.source === "main" || bridgeState.source === "audio-engine";
      const firstRange = _chartRhythmSteps[0]?.practiceRange || "";
      let range = sourceLabel ? (" · " + sourceLabel) : "";
      if (!range) {
        if (firstRange === "loop") range = " · Loop activo";
        else if (firstRange === "fromHere") range = " · Desde aquí";
        else if (firstRange === "section") range = " · Sesión";
        else if (firstRange === "song") range = " · Canción";
      }
      sourceEl.textContent = (bridgeState.source === "audio-engine"
        ? "Motor: Main Audio + Rhythm · BPM " + bridgeState.bpm
        : (isMain ? "Motor: Main/Groove · BPM " + bridgeState.bpm : "Motor: Interno fallback · BPM " + bridgeState.bpm)) + range;
      sourceEl.classList.toggle("main", isMain);
      sourceEl.classList.toggle("fallback", !isMain);
    }

    const runStep = () => {
      if (!_chartRhythmSteps.length) return;
      const step = _chartRhythmSteps[_chartRhythmIndex % _chartRhythmSteps.length];
      _chartRhythmIndex += 1;

      const mode = normalizeRhythmMode(step.rhythm || "hit");
      setChartStepLight(step.el, mode, step);

      publishChartHarmonyStep(step, mode);
      emitChartPracticeStep(step, mode);

      if (mode === "hit" || mode === "repeat" || mode === "hold" || mode === "rest") {
        scheduleChartPracticeGroove(step, mode, bridgeState);
      }

      const status = container?.querySelector?.(".s936-ch-console-status");
      if (status) {
        const action = mode === "hold" ? "sostiene" : (mode === "rest" ? "silencio" : "toca");
        status.textContent = "Practicando · " + (step.label || "beat") + " · " + action + (step.chord ? " · " + step.chord : "");
        status.classList.add("on");
      }
    };

    runStep();
    const beatMs = Math.max(180, Math.round(60000 / (bridgeState.bpm || getCurrentChartBpm())));
    _chartRhythmTimer = setInterval(runStep, beatMs);
    _lastPracticeStartOptions = { withPulse, scope, section, sourceLabel };
    return true;
  }


  // ─── DETECCIÓN DE ACORDES ──────────────────────────────────────────────
  function detectChordFromFrets(frets, inst) {
    if (!frets || frets.length === 0) return null;
    
    const config = FRETBOARD_CONFIG[inst];
    if (!config) return null;
    
    const notes = frets.map((fret, i) => {
      if (fret === null || fret === 'X' || fret === undefined) return null;
      const midi = config.open[i] + fret;
      return midiToNote(midi);
    }).filter(n => n !== null);
    
    if (notes.length === 0) return null;
    
    const MT = window.Studio936MusicTheory;
    if (MT?.detectChord) {
      try {
        const result = MT.detectChord(notes);
        if (result) return result;
      } catch(_) {}
    }
    
    const rootNote = notes[0];
    const rootMatch = rootNote.match(/^([A-G][#b]?)/);
    if (!rootMatch) return null;
    
    const root = rootMatch[1];
    
    const hasMinorThird = notes.some(n => {
      const midi = noteToMidi(n);
      if (!midi) return false;
      const rootMidi = noteToMidi(root + '4');
      if (!rootMidi) return false;
      const diff = ((midi - rootMidi) % 12 + 12) % 12;
      return diff === 3;
    });
    
    const hasSeventh = notes.some(n => {
      const midi = noteToMidi(n);
      if (!midi) return false;
      const rootMidi = noteToMidi(root + '4');
      if (!rootMidi) return false;
      const diff = ((midi - rootMidi) % 12 + 12) % 12;
      return diff === 10 || diff === 11;
    });
    
    let chord = root;
    if (notes.length === 1) {
      return root;
    } else if (notes.length === 2) {
      return root + '5';
    } else if (notes.length >= 3) {
      if (hasMinorThird) chord = root + 'm';
      if (hasSeventh) chord += hasMinorThird ? '7' : 'maj7';
    }
    return chord;
  }

  function detectChordFromNotes(midis) {
    if (!midis || midis.length === 0) return null;
    
    const notes = midis.map(m => midiToNote(m));
    if (notes.length === 0) return null;
    
    const MT = window.Studio936MusicTheory;
    if (MT?.detectChord) {
      try {
        const result = MT.detectChord(notes);
        if (result) return result;
      } catch(_) {}
    }
    
    const sorted = [...midis].sort((a, b) => a - b);
    const rootMidi = sorted[0];
    const root = midiToNote(rootMidi).replace(/\d+$/, '');
    
    const intervals = sorted.map(m => ((m - rootMidi) % 12 + 12) % 12);
    const hasMinorThird = intervals.some(i => i === 3);
    const hasSeventh = intervals.some(i => i === 10 || i === 11);
    
    let chord = root;
    if (midis.length === 1) {
      return root;
    } else if (midis.length === 2) {
      return root + '5';
    } else if (midis.length >= 3) {
      if (hasMinorThird) chord = root + 'm';
      if (hasSeventh) chord += hasMinorThird ? '7' : 'maj7';
    }
    return chord;
  }

  // ─── ESTILOS ──────────────────────────────────────────────────────────────
  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = `
/* Cambio 260 (paso 1) — vista continua, solo lectura */
.s936-ch-continuous-toggle{
  margin-left:8px;padding:4px 10px;border-radius:999px;
  background:rgba(0,255,204,.08);border:1px solid rgba(0,255,204,.3);
  color:#bfffee;font-size:.55rem;font-weight:800;text-transform:uppercase;
  letter-spacing:.4px;cursor:pointer;
}
.s936-ch-continuous-toggle:hover{background:rgba(0,255,204,.16)}
.s936-ch-cont-scroller{display:inline-flex;min-width:100%;overflow-x:auto;padding:10px}
.s936-ch-cont-block{flex-shrink:0;padding:0 10px 0 0;min-width:220px}
.s936-ch-cont-label{font-size:.55rem;font-weight:800;text-transform:uppercase;
  letter-spacing:.4px;margin-bottom:4px;white-space:nowrap}
.s936-ch-cont-row{display:flex;gap:3px;margin-bottom:3px}
.s936-ch-cont-cell{background:rgba(255,255,255,.05);border-radius:5px;
  padding:4px 7px;font-size:.62rem;width:60px;text-align:center;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0}
.s936-ch-cont-cell.chord{font-weight:700;color:#e8f4f2;cursor:pointer}
.s936-ch-cont-cell.chord:hover{background:rgba(0,255,204,.1)}
.s936-ch-cont-chordname{overflow:hidden;text-overflow:ellipsis}
.s936-ch-cont-minimap{display:flex;gap:1px;height:6px;margin-top:3px;border-radius:2px;overflow:hidden}
.s936-ch-cont-minimap-seg{flex:1;background:rgba(255,255,255,.12)}
.s936-ch-cont-minimap-seg.on{background:#00ffcc}
.s936-ch-cont-cell.lyric{color:#9fd8cc}
.s936-ch-cont-playhead{position:absolute;top:0;bottom:0;left:0;width:2px;
  background:#00ffcc;box-shadow:0 0 8px rgba(0,255,204,.7);
  transition:transform .12s linear;pointer-events:none;z-index:5}
.s936-ch-cont-cell.chord.is-playing{background:rgba(0,255,204,.22);outline:1px solid #00ffcc}
.s936-ch-cont-cell.lyric.is-playing{background:rgba(0,255,204,.16);color:#e8fffb;font-weight:700}
#s936-chart-view-panel{font-family:system-ui,sans-serif;color:#fff;isolation:isolate}
.s936-ch-change-banner{
  position:sticky;top:0;z-index:12;
  display:inline-flex;align-items:center;gap:6px;
  margin:8px 10px 0;padding:4px 9px;text-align:left;
  background:rgba(0,255,204,.10);
  border:1px solid rgba(0,255,204,.26);
  border-radius:999px;
  color:#bfffee;font-size:.52rem;font-weight:900;text-transform:uppercase;
  letter-spacing:.6px
}
.s936-chart-main-panel{
  width:100%;
  min-height:calc(100vh - 128px);
  max-height:calc(100vh - 112px);
  overflow:auto;
  background:#090b11;
  border-top:1px solid rgba(0,255,204,.16);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.04);
}
/* Cambio 27: escenario compacto.
   En Chart activo conservamos los comandos Play/Groove del Main,
   pero ocultamos la banda grande de estado/step-grid para ganar hoja. */
body.s936-chart-stage .status-bar{
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  min-height:0!important;
  height:auto!important;
  padding:6px 10px!important;
  margin:0!important;
  gap:0!important;
  background:rgba(10,12,16,.88)!important;
  border-bottom:1px solid rgba(0,255,204,.18)!important;
}
body.s936-chart-stage .status-bar .now-box{
  display:none!important;
}
body.s936-chart-stage .status-bar .transport{
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  gap:8px!important;
  margin:0!important;
  width:auto!important;
}
body.s936-chart-stage main.main,
body.s936-chart-stage main{
  padding-top:0!important;
  margin-top:0!important;
}
body.s936-chart-stage #s936-chart-view-panel{
  border-top:1px solid rgba(0,255,204,.32);
  margin-top:0!important;
}

.status-bar .transport button.s936-chart-transport-on{
  outline:2px solid rgba(0,255,204,.55)!important;
  box-shadow:0 0 18px rgba(0,255,204,.18)!important;
}


/* Cambio 28 · escenario más alto y limpieza del main antiguo.
   Conserva el header superior y los comandos de transporte,
   pero el Chart ocupa el escenario sin la franja vieja de ayuda/saltar. */
body.s936-chart-stage .status-bar{
  min-height:38px!important;
  height:38px!important;
  padding:3px 8px!important;
  margin:0!important;
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  background:rgba(10,12,16,.96)!important;
  border-bottom:1px solid rgba(0,255,204,.18)!important;
}
body.s936-chart-stage .status-bar .now-box{
  display:none!important;
}
body.s936-chart-stage .status-bar .transport{
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  gap:7px!important;
  margin:0!important;
  width:auto!important;
  min-height:32px!important;
  height:32px!important;
}
body.s936-chart-stage .status-bar .transport .btn,
body.s936-chart-stage .status-bar .transport button{
  min-height:30px!important;
  padding-top:6px!important;
  padding-bottom:6px!important;
}
body.s936-chart-stage main.main,
body.s936-chart-stage main{
  margin-top:0!important;
  padding-top:0!important;
}
body.s936-chart-stage main.main > :not(#s936-chart-view-panel),
body.s936-chart-stage main > :not(#s936-chart-view-panel){
  display:none!important;
  visibility:hidden!important;
  height:0!important;
  min-height:0!important;
  max-height:0!important;
  overflow:hidden!important;
  opacity:0!important;
  pointer-events:none!important;
}
body.s936-chart-stage #s936-chart-view-panel,
body.s936-chart-stage .s936-chart-main-panel{
  margin-top:0!important;
  border-top:1px solid rgba(0,255,204,.30)!important;
  min-height:calc(100vh - 152px)!important;
}
body.s936-chart-stage #s936-chart-view-panel .s936-ch-body{
  padding-top:6px!important;
}


/* Cambio 39 · Escenario más alto: Chart pegado a los controles superiores. */
body.s936-chart-stage .status-bar{
  min-height:30px!important;
  height:30px!important;
  padding:1px 6px!important;
  margin:0!important;
  overflow:hidden!important;
  background:rgba(8,10,14,.98)!important;
}
body.s936-chart-stage .status-bar .now-box,
body.s936-chart-stage .status-bar .step-grid,
body.s936-chart-stage .status-bar .current-part-pill,
body.s936-chart-stage .status-bar .label-small,
body.s936-chart-stage .status-bar #sectionLabel,
body.s936-chart-stage .status-bar #measureLabel,
body.s936-chart-stage .status-bar #chordLabel{
  display:none!important;
}
body.s936-chart-stage .status-bar .transport{
  height:29px!important;
  min-height:29px!important;
}
body.s936-chart-stage .status-bar .transport button,
body.s936-chart-stage .status-bar .transport .btn{
  min-height:26px!important;
  height:26px!important;
  padding:4px 10px!important;
  font-size:.62rem!important;
}
body.s936-chart-stage main.main,
body.s936-chart-stage main{
  margin-top:0!important;
  padding-top:0!important;
}
body.s936-chart-stage main .jump,
body.s936-chart-stage main .jump-to-part,
body.s936-chart-stage main .jump-section,
body.s936-chart-stage main .section-jump,
body.s936-chart-stage main .part-jump,
body.s936-chart-stage main [class*="jump"],
body.s936-chart-stage main [id*="jump"],
body.s936-chart-stage main [class*="Jump"],
body.s936-chart-stage main [id*="Jump"]{
  display:none!important;
  height:0!important;
  min-height:0!important;
  margin:0!important;
  padding:0!important;
  overflow:hidden!important;
}
body.s936-chart-stage #s936-chart-view-panel,
body.s936-chart-stage .s936-chart-main-panel{
  margin-top:0!important;
  min-height:calc(100vh - 118px)!important;
  max-height:calc(100vh - 110px)!important;
  border-top:1px solid rgba(0,255,204,.26)!important;
}
body.s936-chart-stage #s936-chart-view-panel 
/* Cambio 40 · Chart respeta el dock flexible cuando el guard detecta invasión. */
body.s936-chart-stage #s936-chart-view-panel[data-s936-dock-flex="on"],
body.s936-chart-stage .s936-chart-main-panel[data-s936-dock-flex="on"]{
  transition:margin-left .12s ease,width .12s ease!important;
}


/* Cambio 44 · escenario derecho estable: Chart siempre gana sobre piano/main, sin scroll horizontal global */
html, body{
  overflow-x:hidden!important;
}
body.s936-chart-stage main.main,
body.s936-chart-stage main{
  overflow-x:hidden!important;
  width:auto!important;
  max-width:100vw!important;
}
body.s936-chart-stage #s936-chart-view-panel,
body.s936-chart-stage .s936-chart-main-panel{
  display:block!important;
  visibility:visible!important;
  opacity:1!important;
  position:relative!important;
  z-index:4!important;
  margin-left:0!important;
  width:100%!important;
  max-width:100%!important;
  overflow-x:hidden!important;
  background:#090b11!important;
}
body.s936-chart-stage #pianoContainer,
body.s936-chart-stage #fretboardContainer,
body.s936-chart-stage #keyboardContainer,
body.s936-chart-stage #instrumentSurface,
body.s936-chart-stage .piano-container,
body.s936-chart-stage .fretboard-container,
body.s936-chart-stage .instrument-surface,
body.s936-chart-stage .s936-main-piano{
  display:none!important;
  visibility:hidden!important;
  height:0!important;
  max-height:0!important;
  overflow:hidden!important;
  opacity:0!important;
}

.s936-ch-head{
  padding:5px 10px 4px!important;
}
body.s936-chart-stage #s936-chart-view-panel .s936-ch-body{
  padding:4px 8px 32px!important;
}
body.s936-chart-stage #s936-chart-view-panel .s936-ch-sec{
  margin-bottom:12px!important;
}

.s936-ch-head{
  display:flex;align-items:center;justify-content:space-between;
  padding:8px 14px 7px;border-bottom:1px solid rgba(255,255,255,.08);
  background:#0d0f18;position:sticky;top:0;z-index:10;gap:10px
}
.s936-ch-title{font-size:.72rem;font-weight:900;color:#00ffcc;text-transform:uppercase;letter-spacing:.8px}
.s936-ch-meta{font-size:.5rem;color:rgba(255,255,255,.35);margin-top:1px}
.s936-ch-meta.focus{color:#ffe066;font-weight:900;text-transform:uppercase;letter-spacing:.45px}

.s936-ch-inst-wrap{position:relative}
.s936-ch-inst-btn{
  font-size:.52rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;
  background:rgba(255,91,234,.14);border:1px solid rgba(255,91,234,.4);
  border-radius:10px;color:#ff5bea;padding:3px 12px;cursor:pointer;white-space:nowrap
}
.s936-ch-inst-btn:hover{background:rgba(255,91,234,.25)}
.s936-ch-inst-menu{
  position:absolute;top:calc(100% + 4px);right:0;
  background:#131726;border:1px solid rgba(0,255,204,.35);border-radius:8px;
  padding:4px;z-index:50;min-width:100px;box-shadow:0 8px 24px rgba(0,0,0,.8);
  display:none
}
.s936-ch-inst-menu.open{display:block}
.s936-ch-inst-opt{
  display:block;width:100%;text-align:left;background:none;border:none;
  color:rgba(255,255,255,.7);font-size:.54rem;font-weight:700;padding:5px 10px;
  cursor:pointer;border-radius:5px;text-transform:uppercase;letter-spacing:.4px
}
.s936-ch-inst-opt:hover{background:rgba(0,255,204,.1);color:#00ffcc}
.s936-ch-inst-opt.active{color:#00ffcc;background:rgba(0,255,204,.08)}

.s936-ch-body{padding:10px 10px 40px}

.s936-ch-sec{margin-bottom:18px}
.s936-ch-sec-hd{display:flex;align-items:center;gap:8px;margin-bottom:4px}
.s936-ch-sec-badge{
  background:rgba(255,224,102,.13);border:1px solid rgba(255,224,102,.4);
  border-radius:4px;color:#ffe066;font-size:.52rem;font-weight:900;
  padding:2px 8px;text-transform:uppercase;letter-spacing:.6px
}
.s936-ch-sec-info{color:rgba(255,255,255,.28);font-size:.46rem}

.s936-ch-line{
  display:grid;grid-template-columns:repeat(4,1fr);
  border-top:2px solid rgba(255,255,255,.25);margin-bottom:1px
}

.s936-ch-bar{
  border-right:1px solid rgba(255,255,255,.12);
  padding:2px 2px 4px 2px;position:relative;
  box-sizing:border-box;transition:background .1s;
  min-height:140px;
}
.s936-ch-bar:last-child{border-right:2px solid rgba(255,255,255,.3)}
.s936-ch-bar:hover{background:rgba(0,255,204,.03)}
.s936-ch-bar.s936-cb-active{background:rgba(0,255,204,.13)!important;outline:2px solid rgba(0,255,204,.45);outline-offset:-2px}
.s936-ch-bar.s936-cb-open::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:#ffe066;border-radius:0 2px 2px 0}

.s936-ch-num{font-size:.38rem;color:rgba(255,255,255,.22);font-weight:700;line-height:1;padding-left:4px;display:block}

.s936-ch-bar-head{
  padding:2px 4px 4px;
  min-height:20px;
  display:flex;
  align-items:center;
  justify-content:space-between;
}

.s936-ch-beats{display:grid;grid-template-columns:repeat(4,1fr);gap:3px;padding:0 2px}
.s936-ch-beat{
  background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);
  border-radius:4px;display:flex;flex-direction:column;
  padding:4px 3px 3px;cursor:pointer;
  transition:background .1s,border-color .1s;position:relative;min-width:0;
  min-height:120px;
}
.s936-ch-beat:hover{background:rgba(0,255,204,.1);border-color:rgba(0,255,204,.35)}
.s936-ch-beat.has-chord{background:rgba(0,255,204,.08);border-color:rgba(0,255,204,.28)}
.s936-ch-beat.active-beat{
  background:rgba(0,255,204,.25)!important;
  border-color:rgba(0,255,204,.8)!important;
  box-shadow:0 0 20px rgba(0,255,204,.3);
}
.s936-ch-beat.chart-step-active,
.s936-ch-repeat-bar.chart-step-active{
  outline:2px solid rgba(255,224,102,.95)!important;
  outline-offset:-2px;
  box-shadow:0 0 24px rgba(255,224,102,.28), inset 0 0 28px rgba(0,255,204,.12)!important;
  transform:translateY(-1px);
}
.s936-ch-beat.chart-step-hit{
  background:rgba(0,255,204,.18)!important;
}
.s936-ch-beat.chart-step-hold{
  background:rgba(255,224,102,.13)!important;
}
.s936-ch-beat.chart-step-rest{
  background:rgba(255,255,255,.05)!important;
  opacity:.68;
}
.s936-ch-beat.chart-step-repeat,
.s936-ch-repeat-bar.chart-step-repeat{
  background:rgba(0,255,204,.11)!important;
}
.s936-ch-beat.chart-step-active .s936-ch-pw.hit-k,
.s936-ch-beat.chart-step-active .s936-ch-fd,
.s936-ch-beat.chart-step-active .s936-ch-rhythm-mark,
.s936-ch-repeat-bar.chart-step-active span{
  animation:s936-chart-note-glow .38s ease-in-out;
}
@keyframes s936-chart-note-glow{
  0%{filter:brightness(1);transform:scale(1)}
  50%{filter:brightness(1.8);transform:scale(1.08)}
  100%{filter:brightness(1);transform:scale(1)}
}

.s936-ch-console{
  margin:8px 10px 0;
  padding:8px 10px;
  border:1px solid rgba(0,255,204,.28);
  border-radius:12px;
  background:linear-gradient(135deg,rgba(0,255,204,.07),rgba(255,91,234,.05));
  display:flex;
  align-items:center;
  gap:8px;
  flex-wrap:wrap;
}
.s936-ch-console-title{
  color:#00ffcc;
  font-size:.56rem;
  font-weight:900;
  letter-spacing:.55px;
  text-transform:uppercase;
  margin-right:4px;
}
.s936-ch-console-btn{
  background:rgba(255,255,255,.065);
  border:1px solid rgba(255,255,255,.16);
  color:rgba(255,255,255,.86);
  border-radius:8px;
  padding:6px 10px;
  cursor:pointer;
  font-size:.56rem;
  font-weight:900;
  letter-spacing:.35px;
  text-transform:uppercase;
}
.s936-ch-console-btn:hover{
  border-color:rgba(0,255,204,.45);
  background:rgba(0,255,204,.12);
  color:#00ffcc;
}
.s936-ch-console-btn.playing,
.s936-ch-console-btn.active{
  border-color:rgba(0,255,204,.72);
  background:rgba(0,255,204,.18);
  color:#00ffcc;
  box-shadow:0 0 18px rgba(0,255,204,.14);
}
.s936-ch-console-btn.stop{
  border-color:rgba(255,80,80,.28);
  color:#ff9a9a;
}
.s936-ch-console-status{
  margin-left:auto;
  color:rgba(255,255,255,.42);
  font-size:.52rem;
  font-weight:800;
  letter-spacing:.25px;
}
.s936-ch-console-status.on{
  color:#ffe066;
}
.s936-ch-console-source{
  color:rgba(255,255,255,.38);
  font-size:.52rem;
  font-weight:800;
  letter-spacing:.35px;
  margin-left:0;
}
.s936-ch-console-source.main{
  color:#00ffcc;
}
.s936-ch-console-source.fallback{
  color:#ffe066;
}
.s936-ch-beat .voicing-editor-hint{
  font-size:.35rem;
  color:rgba(255,255,255,.2);
  text-align:center;
  margin-top:2px;
  opacity:0;
  transition:opacity .2s;
}
.s936-ch-beat:hover .voicing-editor-hint{
  opacity:1;
}

.s936-ch-beat-num{
  font-size:.34rem;
  color:rgba(255,255,255,.28);
  font-weight:700;
  line-height:1;
  margin-bottom:3px;
  text-align:center;
}

.s936-ch-beat-chord{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:1px;
  min-height:24px;
  margin-bottom:3px;
  padding:0 2px;
}
.s936-ch-beat-root{
  font-size:.85rem;
  font-weight:900;
  color:#fff;
  line-height:1.2;
}
.s936-ch-beat-qual{
  font-size:.48rem;
  font-weight:700;
  color:rgba(255,255,255,.6);
  vertical-align:super;
  line-height:1;
}
.s936-ch-beat-bass{
  font-size:.4rem;
  color:#ff5bea;
  font-weight:700;
}
.s936-ch-beat-empty-label{
  font-size:.6rem;
  color:rgba(255,255,255,.15);
  font-weight:400;
  text-align:center;
}

.s936-ch-rhythm-mark{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-width:24px;
  min-height:24px;
  padding:2px 6px;
  border-radius:8px;
  border:1px solid rgba(255,224,102,.28);
  background:rgba(255,224,102,.08);
  color:#ffe066;
  font-size:.82rem;
  font-weight:900;
  line-height:1;
}
.s936-ch-rhythm-mark.rest{
  border-color:rgba(255,255,255,.18);
  background:rgba(255,255,255,.04);
  color:rgba(255,255,255,.45);
}
.s936-ch-rhythm-mark.repeat{
  border-color:rgba(0,255,204,.32);
  background:rgba(0,255,204,.08);
  color:#00ffcc;
  font-size:.72rem;
}
.s936-ch-beat.rhythm-hold,
.s936-ch-beat.rhythm-repeat{
  background:rgba(255,224,102,.045);
}
.s936-ch-beat.rhythm-rest{
  background:rgba(255,255,255,.025);
  opacity:.82;
}
.s936-ch-beat-rhythm-label{
  margin-top:2px;
  text-align:center;
  font-size:.38rem;
  font-weight:800;
  letter-spacing:.35px;
  text-transform:uppercase;
  color:rgba(255,224,102,.42);
}
.s936-ch-repeat-bar{
  min-height:128px;
  display:flex;
  align-items:center;
  justify-content:center;
  flex-direction:column;
  gap:6px;
  border:1px dashed rgba(0,255,204,.22);
  border-radius:8px;
  margin:2px;
  background:rgba(0,255,204,.035);
  cursor:pointer;
}
.s936-ch-repeat-bar span{
  font-size:2.4rem;
  color:#00ffcc;
  font-weight:900;
  line-height:1;
}
.s936-ch-repeat-bar small{
  font-size:.48rem;
  color:rgba(255,255,255,.34);
  text-transform:uppercase;
  letter-spacing:.6px;
}

.s936-ch-repeat-bar.repeat-practice-open{
  align-items:stretch;
  justify-content:center;
  padding:6px;
}
.s936-ch-repeat-bar.repeat-practice-open > span,
.s936-ch-repeat-bar.repeat-practice-open > small{
  display:none;
}
.s936-repeat-practice-grid{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:4px;
  width:100%;
  min-height:108px;
}
.s936-repeat-practice-cell{
  border:1px solid rgba(255,255,255,.12);
  border-radius:7px;
  background:rgba(255,255,255,.045);
  display:flex;
  align-items:center;
  justify-content:center;
  flex-direction:column;
  gap:2px;
  min-width:0;
  color:rgba(255,255,255,.42);
}
.s936-repeat-practice-cell strong{
  font-size:1.4rem;
  color:rgba(255,224,102,.62);
  line-height:1;
}
.s936-repeat-practice-cell span{
  font-size:.46rem;
  color:rgba(255,255,255,.34);
  font-weight:900;
}
.s936-repeat-practice-cell em{
  font-style:normal;
  font-size:.52rem;
  color:rgba(0,255,204,.72);
  max-width:100%;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.s936-repeat-practice-cell.active{
  background:rgba(0,255,204,.18);
  border-color:rgba(0,255,204,.76);
  box-shadow:0 0 20px rgba(0,255,204,.24), inset 0 0 18px rgba(255,224,102,.08);
  transform:translateY(-1px);
}
.s936-repeat-practice-cell.active strong{
  color:#00ffcc;
  animation:s936-chart-note-glow .38s ease-in-out;
}

.s936-ch-beat-voicing{
  flex:1;
  display:flex;
  align-items:center;
  justify-content:center;
  min-height:40px;
  margin-top:2px;
  padding:2px 0;
  width:100%;
}

.s936-ch-piano-mini{
  height:40px;
  width:100%;
  position:relative;
  border:1px solid rgba(255,255,255,.2);
  border-radius:3px;
  overflow:hidden;
  background:#1e1e1e;
}
.s936-ch-pw{position:absolute;top:0;bottom:0;box-sizing:border-box}
.s936-ch-pw.white-k{
  background:#ccc;
  border-right:1px solid #666;
}
.s936-ch-pw.black-k{
  background:#1a1a1a;
  z-index:2;
  top:0;
  height:60%;
  border-radius:0 0 2px 2px;
  border:1px solid #555;
}
.s936-ch-pw.hit-k{
  background:#00ffcc!important;
  box-shadow:0 0 8px rgba(0,255,204,.9);
}

.s936-ch-fret-mini{
  height:40px;
  width:100%;
  position:relative;
  border:1px solid rgba(86,96,106,.5);
  border-radius:3px;
  overflow:hidden;
  background:linear-gradient(90deg,rgba(139,91,49,.4),rgba(70,45,26,.2));
}
.s936-ch-fs{position:absolute;left:2%;right:0;height:1px;background:rgba(200,180,140,.5)}
.s936-ch-ff{position:absolute;top:0;bottom:0;width:1px;background:rgba(255,255,255,.15)}
.s936-ch-fd{
  position:absolute;
  width:8px;
  height:8px;
  border-radius:50%;
  background:#00ffcc;
  transform:translate(-50%,-50%);
  box-shadow:0 0 6px rgba(0,255,204,.7);
  z-index:3;
}
.s936-ch-fm{position:absolute;color:rgba(255,80,80,.8);font-size:.5rem;font-weight:900;transform:translateX(-50%)}
.s936-ch-capo{position:absolute;left:0;top:0;bottom:0;width:3px;background:rgba(255,224,102,.6);border-radius:0 2px 2px 0}
.s936-ch-fret-label{
  position:absolute;
  left:0;
  top:50%;
  transform:translateY(-50%);
  color:rgba(255,255,255,.3);
  font-size:.35rem;
  font-weight:700;
  padding-left:1px;
  z-index:4;
}

/* ─── POPUP ─── */
.s936-ch-pop{
  position:fixed !important;
  background:#0e1320;
  border:1px solid rgba(0,255,204,.45);
  border-radius:10px;
  padding:10px;
  box-shadow:0 12px 40px rgba(0,0,0,.95);
  z-index:9999;
  width:220px;
  max-height:90vh;
  overflow-y:auto;
}
.s936-ch-pop label{font-size:.42rem;color:rgba(0,255,204,.6);text-transform:uppercase;letter-spacing:.6px;font-weight:700;display:block;margin-bottom:3px}
.s936-picker-preview{
  font-size:1.4rem;
  font-weight:900;
  color:#00ffcc;
  text-align:center;
  padding:10px;
  background:rgba(0,255,204,.12);
  border-radius:6px;
  margin-bottom:8px;
  min-height:44px;
  display:flex;
  align-items:center;
  justify-content:center;
  border:2px solid rgba(0,255,204,.5);
  letter-spacing:0.5px;
  text-shadow:0 0 20px rgba(0,255,204,.3);
}
.s936-picker-preview.empty{
  color:rgba(255,255,255,.25);
  border-color:rgba(255,255,255,.1);
  background:rgba(255,255,255,.03);
  text-shadow:none;
}
.s936-picker-roots{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:4px}
.s936-picker-btn{
  background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);
  border-radius:4px;color:rgba(255,255,255,.75);font-size:.58rem;font-weight:700;
  padding:4px 2px;cursor:pointer;text-align:center;transition:all .1s
}
.s936-picker-btn:hover{background:rgba(0,255,204,.14);border-color:rgba(0,255,204,.4);color:#00ffcc}
.s936-picker-btn.sel{background:rgba(0,255,204,.22);border-color:#00ffcc;color:#00ffcc}
.s936-picker-acc{display:flex;gap:3px;margin-bottom:5px}
.s936-picker-acc .s936-picker-btn{flex:1;font-size:.52rem}
.s936-picker-quals{display:grid;grid-template-columns:repeat(4,1fr);gap:2px;margin-bottom:5px}
.s936-picker-quals .s936-picker-btn{font-size:.48rem;padding:4px 2px}
.s936-picker-acts{display:flex;gap:4px}
.s936-picker-ok{
  flex:1;background:rgba(0,255,204,.18);border:1px solid rgba(0,255,204,.4);
  border-radius:5px;color:#bfffee;font-size:.55rem;font-weight:700;padding:6px;cursor:pointer
}
.s936-picker-del{
  background:rgba(255,80,80,.12);border:1px solid rgba(255,80,80,.35);
  border-radius:5px;color:#ff8080;font-size:.55rem;font-weight:700;padding:6px 10px;cursor:pointer
}

#s936-ch-pop-overlay{
  position:fixed;
  inset:0;
  z-index:9998;
}

/* ─── CAMBIO 6: popup movible con mapa previo ─── */
.s936-ch-pop-v6{
  resize:both;
  min-width:300px;
  min-height:430px;
  max-width:min(560px,calc(100vw - 16px));
  max-height:calc(100vh - 16px);
}
.s936-ch-pop-drag{
  cursor:move;
  user-select:none;
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:10px;
  padding:8px 9px;
  margin:-2px -2px 8px;
  border-radius:8px;
  border:1px solid rgba(0,255,204,.28);
  background:linear-gradient(135deg,rgba(0,255,204,.13),rgba(255,91,234,.08));
  color:#bfffee;
  font-size:.58rem;
  font-weight:900;
  letter-spacing:.4px;
  text-transform:uppercase;
}
.s936-ch-pop-drag small{
  color:rgba(255,255,255,.36);
  font-size:.42rem;
  font-weight:800;
  white-space:nowrap;
  text-transform:none;
}
.s936-picker-notes-line{
  min-height:18px;
  margin:-3px 0 8px;
  padding:4px 6px;
  border-radius:6px;
  background:rgba(255,255,255,.035);
  color:rgba(255,255,255,.55);
  font-size:.5rem;
  text-align:center;
  letter-spacing:.25px;
}
.s936-picker-map-label{
  color:rgba(0,255,204,.68);
  font-size:.44rem;
  text-transform:uppercase;
  letter-spacing:.7px;
  font-weight:900;
  margin:6px 0 4px;
}
.s936-picker-map-box{
  min-height:84px;
  padding:8px;
  border-radius:9px;
  border:1px solid rgba(0,255,204,.22);
  background:rgba(0,255,204,.045);
  display:flex;
  align-items:center;
  justify-content:center;
}
.s936-picker-map-box .s936-ch-piano-mini{
  height:58px;
  min-width:210px;
}
.s936-picker-map-box .s936-ch-fret-mini{
  height:88px;
  min-width:220px;
}
.s936-picker-map-empty{
  color:rgba(255,255,255,.32);
  font-size:.54rem;
  text-align:center;
}
.s936-picker-map-hint{
  color:rgba(255,255,255,.36);
  font-size:.48rem;
  line-height:1.25;
  margin:5px 0 8px;
  text-align:center;
}
.s936-picker-voicing-btn{
  width:100%;
  margin:7px 0 6px;
  background:rgba(255,224,102,.12);
  border:1px solid rgba(255,224,102,.4);
  border-radius:7px;
  color:#ffe066;
  font-size:.55rem;
  font-weight:900;
  padding:7px;
  cursor:pointer;
  text-transform:uppercase;
  letter-spacing:.45px;
}
.s936-picker-voicing-btn:hover{
  background:rgba(255,224,102,.2);
  box-shadow:0 0 18px rgba(255,224,102,.12);
}


/* ─── CAMBIO 8: popup centrado, audio y mapa editable directo ─── */
.s936-ch-pop-v7{
  resize:both;
  min-width:520px;
  min-height:380px;
  max-width:calc(100vw - 16px);
  max-height:calc(100vh - 16px);
  overflow:auto;
  padding:10px;
}
.s936-picker-main-v7{
  display:grid;
  grid-template-columns:minmax(310px,1.25fr) minmax(220px,.75fr);
  gap:10px;
  align-items:start;
}
.s936-picker-pane-v7{
  min-width:0;
}
.s936-picker-pane-preview-v7{
  display:flex;
  flex-direction:column;
  gap:5px;
}
.s936-picker-pane-controls-v7{
  display:flex;
  flex-direction:column;
  gap:5px;
}
.s936-ch-pop-v7 .s936-picker-preview{
  font-size:1.65rem;
  min-height:58px;
  margin-bottom:2px;
}
.s936-ch-pop-v7 .s936-picker-quals{
  grid-template-columns:repeat(3,1fr);
  gap:4px;
}
.s936-ch-pop-v7 .s936-picker-btn{
  padding:6px 4px;
  font-size:.56rem;
}
.s936-ch-pop-v7 .s936-picker-map-box-live{
  min-height:190px;
  align-items:stretch;
  justify-content:stretch;
  overflow:auto;
}
.s936-picker-fret-controls{
  display:flex;
  align-items:center;
  gap:6px;
  min-height:28px;
}
.s936-picker-fret-label{
  color:rgba(0,255,204,.72);
  font-size:.52rem;
  font-weight:900;
  text-transform:uppercase;
  letter-spacing:.45px;
  white-space:nowrap;
}
.s936-picker-fret-value{
  min-width:28px;
  text-align:center;
  padding:4px 8px;
  border-radius:7px;
  border:1px solid rgba(0,255,204,.35);
  background:rgba(0,255,204,.1);
  color:#00ffcc;
  font-size:.72rem;
  font-weight:900;
}
.s936-picker-fret-step{
  border:1px solid rgba(255,255,255,.15);
  background:rgba(255,255,255,.06);
  color:#fff;
  border-radius:7px;
  min-width:30px;
  padding:5px 7px;
  cursor:pointer;
}
.s936-picker-fret-step:hover{
  border-color:rgba(0,255,204,.4);
  color:#00ffcc;
}
.s936-picker-fret-range{
  flex:1;
  min-width:90px;
  accent-color:#00ffcc;
}
.s936-picker-fret-live{
  display:grid;
  grid-template-columns:64px 34px 34px repeat(6,minmax(34px,1fr));
  gap:3px;
  width:100%;
  min-width:420px;
  align-self:center;
}
.s936-picker-fret-cell{
  min-height:24px;
  border-radius:5px;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:.56rem;
  font-weight:800;
  color:rgba(255,255,255,.55);
}
.s936-picker-fret-cell.head{
  min-height:18px;
  font-size:.45rem;
  color:rgba(0,255,204,.65);
  text-transform:uppercase;
  letter-spacing:.4px;
}
.s936-picker-fret-cell.string-label{
  justify-content:flex-start;
  padding-left:7px;
  color:#ffe066;
  background:rgba(255,224,102,.08);
  border:1px solid rgba(255,224,102,.15);
}
.s936-picker-fret-cell.fret-btn{
  border:1px solid rgba(255,255,255,.1);
  background:rgba(255,255,255,.045);
  cursor:pointer;
  color:rgba(255,255,255,.65);
}
.s936-picker-fret-cell.fret-btn:hover{
  border-color:rgba(0,255,204,.35);
  background:rgba(0,255,204,.09);
}
.s936-picker-fret-cell.fret-btn.active{
  background:#00ffcc;
  color:#04110e;
  border-color:#00ffcc;
  box-shadow:0 0 10px rgba(0,255,204,.35);
}
.s936-picker-fret-cell.fret-btn.muted{
  background:rgba(255,80,80,.18);
  color:#ff9a9a;
  border-color:rgba(255,80,80,.35);
  box-shadow:none;
}
.s936-picker-piano-live{
  position:relative;
  width:100%;
  min-width:280px;
  height:150px;
  border-radius:10px;
  border:1px solid rgba(255,255,255,.14);
  background:#111;
  overflow:hidden;
  align-self:center;
}
.s936-picker-piano-key{
  position:absolute;
  top:0;
  bottom:0;
  border:none;
  cursor:pointer;
  transition:filter .12s, background .12s, box-shadow .12s;
}
.s936-picker-piano-key.white{
  background:linear-gradient(#f6f6f6,#cacaca);
  border-right:1px solid #777;
  z-index:1;
}
.s936-picker-piano-key.black{
  background:linear-gradient(#2a2a2a,#080808);
  height:62%;
  z-index:3;
  border:1px solid #444;
  border-top:none;
  border-radius:0 0 5px 5px;
}
.s936-picker-piano-key.active{
  background:#00ffcc!important;
  box-shadow:0 0 18px rgba(0,255,204,.5);
}
.s936-picker-piano-key:hover{
  filter:brightness(1.12);
}
.s936-picker-acts-v7{
  margin-top:6px;
}
.s936-picker-acts-v7 .s936-picker-ok,
.s936-picker-acts-v7 .s936-picker-del{
  font-size:.62rem;
  padding:9px;
}


.s936-picker-rhythm-title{
  margin-top:8px;
  font-size:.46rem;
  color:#ffe066;
  font-weight:900;
  text-transform:uppercase;
  letter-spacing:.7px;
}
.s936-picker-rhythm-row{
  display:grid;
  grid-template-columns:repeat(4,minmax(90px,1fr));
  gap:7px;
  margin:5px 0 8px;
}
.s936-picker-rhythm-btn{
  border:1px solid rgba(255,224,102,.24);
  background:rgba(255,224,102,.07);
  color:rgba(255,255,255,.72);
  border-radius:9px;
  padding:8px 7px;
  font-size:.56rem;
  font-weight:900;
  cursor:pointer;
  text-transform:uppercase;
  letter-spacing:.35px;
}
.s936-picker-rhythm-btn:hover{
  background:rgba(255,224,102,.13);
  border-color:rgba(255,224,102,.45);
  color:#ffe066;
}
.s936-picker-rhythm-btn.sel{
  background:rgba(0,255,204,.16);
  border-color:rgba(0,255,204,.55);
  color:#00ffcc;
  box-shadow:0 0 14px rgba(0,255,204,.12);
}
.s936-picker-audio-row{
  display:grid;
  grid-template-columns:repeat(5,minmax(84px,1fr));
  gap:7px;
  margin:8px 0 4px;
}
.s936-picker-audio-btn{
  border:1px solid rgba(0,255,204,.28);
  background:rgba(0,255,204,.08);
  color:#bfffee;
  border-radius:9px;
  padding:8px 7px;
  font-size:.58rem;
  font-weight:900;
  cursor:pointer;
  text-transform:uppercase;
  letter-spacing:.42px;
}
.s936-picker-audio-btn:hover{
  background:rgba(0,255,204,.17);
  border-color:rgba(0,255,204,.55);
  box-shadow:0 0 16px rgba(0,255,204,.13);
}
.s936-picker-audio-btn.stop{
  border-color:rgba(255,80,80,.35);
  background:rgba(255,80,80,.10);
  color:#ffaaaa;
}
.s936-picker-audio-btn.stop:hover{
  background:rgba(255,80,80,.18);
  border-color:rgba(255,80,80,.55);
}
.s936-picker-audio-btn.active{
  background:rgba(255,224,102,.20);
  border-color:rgba(255,224,102,.55);
  color:#ffe066;
  box-shadow:0 0 16px rgba(255,224,102,.16);
}
.s936-picker-audio-btn.pulse{
  border-color:rgba(255,224,102,.35);
  background:rgba(255,224,102,.08);
  color:#ffeeb0;
}
.s936-picker-audio-mini{
  color:rgba(255,255,255,.36);
  font-size:.48rem;
  text-align:center;
  margin-top:1px;
}
@media (max-width:960px){
  .s936-picker-audio-row{
    grid-template-columns:repeat(2,1fr);
  }
}
@media (max-width:820px){
  .s936-ch-pop-v7{
    width:calc(100vw - 18px)!important;
    left:8px!important;
  }
  .s936-picker-main-v7{
    grid-template-columns:1fr;
  }
}

/* ─── EDITOR DE VOICING ─── */
.s936-voicing-editor{
  position:fixed;
  top:50%;
  left:50%;
  transform:translate(-50%,-50%);
  background:#0a0e18;
  border:2px solid rgba(0,255,204,.5);
  border-radius:16px;
  padding:20px;
  z-index:10000;
  min-width:340px;
  max-width:500px;
  width:90%;
  box-shadow:0 20px 60px rgba(0,0,0,.95);
}
.s936-voicing-editor-title{
  color:#00ffcc;
  font-weight:900;
  font-size:.9rem;
  margin-bottom:12px;
  text-align:center;
  letter-spacing:.5px;
}
.s936-voicing-editor-subtitle{
  color:rgba(255,255,255,.3);
  font-size:.5rem;
  text-align:center;
  margin-bottom:12px;
}
.s936-voicing-editor-container{
  width:100%;
  min-height:160px;
  background:rgba(255,255,255,.03);
  border-radius:8px;
  padding:8px;
  border:1px solid rgba(255,255,255,.06);
}
.s936-voicing-editor-actions{
  display:flex;
  gap:8px;
  margin-top:14px;
}
.s936-voicing-editor-apply{
  flex:1;
  background:rgba(0,255,204,.18);
  border:1px solid rgba(0,255,204,.4);
  border-radius:8px;
  color:#bfffee;
  padding:10px;
  cursor:pointer;
  font-weight:700;
  font-size:.7rem;
  transition:all .2s;
}
.s936-voicing-editor-apply:hover{
  background:rgba(0,255,204,.3);
  box-shadow:0 0 20px rgba(0,255,204,.2);
}
.s936-voicing-editor-cancel{
  background:rgba(255,80,80,.1);
  border:1px solid rgba(255,80,80,.3);
  border-radius:8px;
  color:#ff8080;
  padding:10px 18px;
  cursor:pointer;
  font-weight:700;
  font-size:.7rem;
  transition:all .2s;
}
.s936-voicing-editor-cancel:hover{
  background:rgba(255,80,80,.2);
}
.s936-voicing-editor-detected{
  text-align:center;
  padding:6px;
  margin-top:8px;
  border-radius:4px;
  background:rgba(0,255,204,.06);
  color:rgba(255,255,255,.4);
  font-size:.6rem;
}

.s936-fretboard-svg{
  width:100%;
  height:auto;
  cursor:pointer;
  border-radius:4px;
}
.s936-fretboard-svg .fret-dot{
  transition:all .15s;
}
.s936-fretboard-svg .fret-dot:hover{
  r:8;
  filter:brightness(1.3);
}

.s936-piano-interactive{
  display:flex;
  height:60px;
  position:relative;
  background:#111;
  border-radius:6px;
  overflow:hidden;
  width:100%;
  border:1px solid rgba(255,255,255,.1);
}
.s936-piano-interactive .piano-key{
  position:absolute;
  top:0;
  bottom:0;
  cursor:pointer;
  transition:all .1s;
  border-radius:0 0 3px 3px;
}
.s936-piano-interactive .piano-key.white{
  background:linear-gradient(180deg,#f0f0f0,#d0d0d0);
  border-right:1px solid #999;
}
.s936-piano-interactive .piano-key.white.active{
  background:linear-gradient(180deg,#00ffcc,#00ccaa);
  box-shadow:0 0 20px rgba(0,255,204,.4);
}
.s936-piano-interactive .piano-key.black{
  background:linear-gradient(180deg,#333,#111);
  border:1px solid #444;
  border-top:none;
  z-index:2;
}
.s936-piano-interactive .piano-key.black.active{
  background:linear-gradient(180deg,#00ffcc,#009988);
  box-shadow:0 0 20px rgba(0,255,204,.4);
}
.s936-piano-interactive .piano-key:hover{
  filter:brightness(1.15);
}

.s936-ch-dblbar{height:3px;margin-top:2px;background:linear-gradient(to right,rgba(255,255,255,.15) 0,rgba(255,255,255,.15) calc(100% - 4px),rgba(255,255,255,.5) calc(100% - 4px),rgba(255,255,255,.5) 100%)}

/* Cambio 17 · Marcaciones profesionales de navegación musical */
.s936-ch-bar-nav{
  display:flex;
  flex-wrap:wrap;
  gap:3px;
  align-items:center;
  justify-content:flex-end;
  max-width:76%;
}
.s936-ch-nav-badge{
  display:inline-flex;
  align-items:center;
  gap:3px;
  border:1px solid rgba(255,224,102,.50);
  background:linear-gradient(135deg,rgba(255,224,102,.16),rgba(0,255,204,.07));
  color:#ffe066;
  border-radius:999px;
  padding:2px 6px;
  font-size:.42rem;
  font-weight:950;
  line-height:1;
  letter-spacing:.35px;
  white-space:nowrap;
  box-shadow:0 0 12px rgba(255,224,102,.10);
}
.s936-ch-nav-badge.strong{
  border-color:rgba(0,255,204,.58);
  color:#bfffee;
  background:linear-gradient(135deg,rgba(0,255,204,.17),rgba(255,91,234,.08));
}
.s936-ch-nav-badge.stop{
  border-color:rgba(255,91,234,.62);
  color:#ffbaf3;
  background:linear-gradient(135deg,rgba(255,91,234,.18),rgba(255,255,255,.04));
}
.s936-ch-bar.has-nav{
  outline:1px solid rgba(255,224,102,.20);
  outline-offset:-2px;
}
.s936-ch-section-navline{
  display:flex;
  flex-wrap:wrap;
  gap:5px;
  margin:4px 0 8px;
}
.s936-ch-section-navline .s936-ch-nav-badge{
  font-size:.46rem;
  padding:3px 7px;
}


/* Cambio 23 · escenario Chart sin borrar los comandos Groove del Main */
body.s936-chart-stage > section.status-bar,
body.s936-chart-stage section.status-bar{
  display:block!important;
  visibility:visible!important;
  opacity:1!important;
  height:auto!important;
  min-height:unset!important;
  max-height:none!important;
  pointer-events:auto!important;
}
body.s936-chart-stage main.main,
body.s936-chart-stage main{
  margin-top:0!important;
  padding-top:0!important;
}
.s936-chart-main-panel{
  min-height:calc(100vh - 210px)!important;
  max-height:none!important;
  margin-top:8px!important;
}
.s936-chart-hidden-surface{
  display:none!important;
  visibility:hidden!important;
  height:0!important;
  min-height:0!important;
  max-height:0!important;
  overflow:hidden!important;
  opacity:0!important;
  pointer-events:none!important;
}
.status-bar .transport button.s936-chart-transport-on{
  outline:2px solid rgba(0,255,204,.55)!important;
  box-shadow:0 0 18px rgba(0,255,204,.18)!important;
}

.s936-ch-head{
  padding:5px 12px!important;
}
.s936-ch-inst-wrap.main-controlled{
  display:flex;
  flex-direction:column;
  align-items:flex-end;
  gap:2px;
}
.s936-ch-inst-btn.main-controlled{
  cursor:default;
  pointer-events:none;
  background:rgba(0,255,204,.12)!important;
  border-color:rgba(0,255,204,.38)!important;
  color:#bfffee!important;
}
.s936-ch-inst-main-hint{
  color:rgba(255,255,255,.34);
  font-size:.44rem;
  font-weight:800;
  text-transform:uppercase;
  letter-spacing:.5px;
}
.s936-ch-console{
  position:sticky;
  top:0;
  z-index:30;
  backdrop-filter:blur(10px);
}
.s936-ch-bar-nav{
  justify-content:flex-start!important;
  max-width:calc(100% - 22px)!important;
  flex:1;
}
.s936-ch-nav-badge{
  font-size:.68rem!important;
  padding:5px 10px!important;
  border-radius:10px!important;
  box-shadow:0 0 16px rgba(255,224,102,.18);
}
.s936-ch-nav-badge[data-nav-type="fine"],
.s936-ch-nav-badge[data-nav-type="dcFine"],
.s936-ch-nav-badge[data-nav-type="dsCoda"]{
  border-color:rgba(255,91,234,.62)!important;
  color:#ffb8f4!important;
  background:rgba(255,91,234,.16)!important;
}
.s936-ch-nav-badge[data-nav-type="coda"],
.s936-ch-nav-badge[data-nav-type="segno"]{
  border-color:rgba(0,255,204,.62)!important;
  color:#bfffee!important;
  background:rgba(0,255,204,.13)!important;
}
.s936-ch-nav-badge[data-nav-type="ending1"],
.s936-ch-nav-badge[data-nav-type="ending2"]{
  border-color:rgba(120,170,255,.65)!important;
  color:#cfe0ff!important;
  background:rgba(120,170,255,.14)!important;
}
.s936-ch-bar.has-nav .s936-ch-bar-head{
  min-height:30px;
  align-items:center;
  background:linear-gradient(90deg,rgba(255,224,102,.08),rgba(0,255,204,.04));
  border-radius:5px;
}
.s936-ch-bar-fig{
  transform:scale(1.18);
  transform-origin:center;
  opacity:.95;
}
.s936-repeat-practice-grid{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:8px;
  width:100%;
  margin-top:8px;
}
.s936-repeat-practice-cell{
  min-height:72px;
  border:1px solid rgba(255,224,102,.34);
  border-radius:10px;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:4px;
  background:rgba(255,224,102,.06);
  color:#ffe066;
  font-weight:900;
}
.s936-repeat-practice-cell strong{
  font-size:1.25rem;
}
.s936-repeat-practice-cell span{
  font-size:.52rem;
  color:rgba(255,255,255,.55);
}
.s936-repeat-practice-cell em{
  font-style:normal;
  color:#bfffee;
  font-size:.62rem;
}
.s936-repeat-practice-cell.active{
  background:rgba(0,255,204,.22);
  border-color:#00ffcc;
  box-shadow:0 0 24px rgba(0,255,204,.28);
  color:#00ffcc;
}


/* Cambio 23 · menú contextual profesional por compás */
.s936-ch-bar-head{
  cursor:pointer;
  user-select:none;
}
.s936-ch-bar-head:hover{
  background:linear-gradient(90deg,rgba(0,255,204,.08),rgba(255,224,102,.04));
  border-radius:5px;
}
.s936-ch-bar-head::after{
  content:"";
  display:none;
}
.s936-ch-bar-note-trigger{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-width:20px;
  min-height:20px;
  margin-left:auto;
  border:1px solid rgba(255,224,102,.40);
  background:rgba(255,224,102,.10);
  color:#ffe066;
  border-radius:999px;
  font-size:.92rem;
  line-height:1;
  box-shadow:0 0 10px rgba(255,224,102,.10);
}
.s936-ch-bar-note-trigger svg{
  transform:scale(1.05);
}
.s936-ch-bar-head:hover .s936-ch-bar-note-trigger{
  border-color:rgba(0,255,204,.62);
  background:rgba(0,255,204,.15);
  color:#00ffcc;
  box-shadow:0 0 16px rgba(0,255,204,.18);
}

.s936-bar-menu-simple{
  min-width:290px;
}
.s936-bar-menu-hint{
  color:rgba(255,255,255,.45);
  font-size:.54rem;
  line-height:1.25;
  margin:4px 0 8px;
}

.s936-bar-menu-overlay{
  position:fixed;
  inset:0;
  z-index:10020;
  background:transparent;
}
.s936-bar-menu{
  position:fixed;
  z-index:10021;
  min-width:250px;
  max-width:min(360px,calc(100vw - 20px));
  background:linear-gradient(145deg,#0a0f18,#121827);
  border:1px solid rgba(0,255,204,.42);
  border-radius:14px;
  box-shadow:0 18px 55px rgba(0,0,0,.92),0 0 24px rgba(0,255,204,.08);
  padding:10px;
  color:#fff;
  font-family:system-ui,sans-serif;
}
.s936-bar-menu-title{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  color:#00ffcc;
  font-size:.62rem;
  font-weight:950;
  letter-spacing:.55px;
  text-transform:uppercase;
  padding:4px 4px 8px;
  border-bottom:1px solid rgba(255,255,255,.08);
  margin-bottom:7px;
}
.s936-bar-menu-title small{
  color:rgba(255,255,255,.36);
  font-size:.48rem;
  font-weight:800;
  text-transform:none;
  letter-spacing:.2px;
}
.s936-bar-menu-group{
  margin:7px 0 9px;
}
.s936-bar-menu-group-label{
  color:#ffe066;
  font-size:.48rem;
  font-weight:950;
  text-transform:uppercase;
  letter-spacing:.55px;
  margin:0 0 5px 2px;
}
.s936-bar-menu-grid{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:5px;
}
.s936-bar-menu button{
  border:1px solid rgba(255,255,255,.14);
  background:rgba(255,255,255,.055);
  color:rgba(255,255,255,.78);
  border-radius:8px;
  padding:7px 8px;
  font-size:.56rem;
  font-weight:850;
  cursor:pointer;
  text-align:left;
}
.s936-bar-menu button:hover{
  border-color:rgba(0,255,204,.45);
  color:#00ffcc;
  background:rgba(0,255,204,.12);
}
.s936-bar-menu button.warn{
  border-color:rgba(255,224,102,.42);
  color:#ffe066;
}
.s936-bar-menu button.stop{
  border-color:rgba(255,91,234,.42);
  color:#ffbaf3;
}
.s936-bar-menu button.danger{
  border-color:rgba(255,85,85,.40);
  color:#ff8c8c;
}
.s936-ch-nav-badge[data-nav-type="loopStart"],
.s936-ch-nav-badge[data-nav-type="loopEnd"]{
  border-color:rgba(0,255,204,.62)!important;
  color:#bfffee!important;
  background:rgba(0,255,204,.14)!important;
}

/* Cambio 23 · Chart visual pro, sin saturar el panel */
.s936-ch-section-navline{
  display:none!important;
}
.s936-ch-bar{
  overflow:visible;
}
.s936-ch-bar.nav-repeatStart{
  box-shadow:inset 3px 0 0 rgba(255,224,102,.95), inset 9px 0 20px rgba(255,224,102,.08);
}
.s936-ch-bar.nav-repeatEnd{
  box-shadow:inset -3px 0 0 rgba(255,224,102,.95), inset -9px 0 20px rgba(255,224,102,.08);
}
.s936-ch-bar.nav-loopStart{
  box-shadow:inset 3px 0 0 rgba(0,255,204,.95), inset 9px 0 20px rgba(0,255,204,.09);
}
.s936-ch-bar.nav-loopEnd{
  box-shadow:inset -3px 0 0 rgba(0,255,204,.95), inset -9px 0 20px rgba(0,255,204,.09);
}
.s936-ch-bar.nav-fine{
  outline:1px solid rgba(255,91,234,.36);
}
.s936-ch-bar-fig{
  min-width:24px!important;
  min-height:24px!important;
  border-width:1.5px!important;
  background:radial-gradient(circle at 40% 35%,rgba(255,224,102,.24),rgba(255,224,102,.08))!important;
}
.s936-ch-bar-head:hover .s936-ch-bar-fig{
  transform:scale(1.08);
}
.s936-ch-beat.rhythm-hold{
  background:linear-gradient(180deg,rgba(255,224,102,.075),rgba(255,255,255,.035));
  border-color:rgba(255,224,102,.24);
}
.s936-ch-beat.rhythm-hold:hover{
  background:linear-gradient(180deg,rgba(255,224,102,.13),rgba(0,255,204,.06));
  border-color:rgba(255,224,102,.42);
}
.s936-ch-hold-wrap{
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:2px;
  width:100%;
}
.s936-ch-hold-wrap .s936-ch-rhythm-mark{
  font-size:1.18rem;
  line-height:.9;
  color:#ffe066;
  text-shadow:0 0 14px rgba(255,224,102,.22);
}
.s936-ch-hold-chord{
  font-size:.52rem;
  color:#bfffee;
  font-weight:950;
  line-height:1;
  letter-spacing:.2px;
  opacity:.86;
}
.s936-ch-voicing-held{
  opacity:.62;
  filter:saturate(.82);
}
.s936-ch-beat.chart-step-active{
  box-shadow:0 0 28px rgba(255,224,102,.34), inset 0 0 34px rgba(0,255,204,.13)!important;
}
.s936-ch-bar:has(.chart-step-active){
  background:linear-gradient(90deg,rgba(255,224,102,.08),rgba(0,255,204,.045))!important;
  outline:1px solid rgba(255,224,102,.28);
  outline-offset:-2px;
}
.s936-ch-bar:has(.chart-step-active) .s936-ch-bar-fig{
  border-color:#ffe066!important;
  background:rgba(255,224,102,.18)!important;
  box-shadow:0 0 16px rgba(255,224,102,.26);
}
.s936-bar-menu-pro{
  min-width:320px;
  background:linear-gradient(155deg,#070b12 0%,#101724 70%,#0a1018 100%)!important;
  border:1.5px solid rgba(0,255,204,.58)!important;
  box-shadow:0 24px 70px rgba(0,0,0,.96),0 0 0 1px rgba(255,255,255,.045) inset,0 0 28px rgba(0,255,204,.12)!important;
  backdrop-filter:blur(18px);
}
.s936-bar-menu-pro .s936-bar-menu-title{
  background:rgba(0,255,204,.08);
  border:1px solid rgba(0,255,204,.20);
  border-radius:10px;
  padding:8px 10px;
}
.s936-bar-menu-pro .s936-bar-menu-hint{
  color:rgba(255,255,255,.58);
  margin:8px 2px 10px;
}
.s936-bar-menu-pro .s936-bar-menu-group{
  padding:7px;
  border:1px solid rgba(255,255,255,.07);
  border-radius:12px;
  background:rgba(255,255,255,.028);
}
.s936-bar-menu-pro .s936-bar-menu-group.practice{
  border-color:rgba(0,255,204,.20);
  background:rgba(0,255,204,.045);
}
.s936-bar-menu-pro .s936-bar-menu-group.score{
  border-color:rgba(255,224,102,.18);
  background:rgba(255,224,102,.035);
}
.s936-bar-menu-pro .s936-bar-menu-grid{
  grid-template-columns:repeat(2,minmax(0,1fr));
}
.s936-bar-menu-pro button{
  text-align:center;
  min-height:31px;
  border-radius:10px;
  font-size:.58rem;
  background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.035));
}
.s936-ch-nav-badge{
  max-width:92px;
  overflow:hidden;
  text-overflow:ellipsis;
}
.s936-ch-bar-nav{
  gap:4px!important;
}
.s936-ch-nav-badge[data-nav-type="loopStart"],
.s936-ch-nav-badge[data-nav-type="loopEnd"]{
  border-style:dashed!important;
}



/* Cambio 24 · menú mini y compás sostenido limpio */
.s936-bar-menu-practice-mini{
  min-width:220px!important;
  max-width:248px!important;
  padding:8px!important;
  border-radius:13px!important;
  background:linear-gradient(145deg,rgba(6,10,15,.86),rgba(14,21,31,.78))!important;
  border:1px solid rgba(0,255,204,.36)!important;
  box-shadow:0 14px 42px rgba(0,0,0,.78),0 0 20px rgba(0,255,204,.10)!important;
  backdrop-filter:blur(18px)!important;
}
.s936-bar-menu-practice-mini .s936-bar-menu-title{
  margin:0 0 7px!important;
  padding:5px 7px!important;
  border:1px solid rgba(0,255,204,.16)!important;
  border-radius:9px!important;
  background:rgba(0,255,204,.065)!important;
  font-size:.52rem!important;
}
.s936-bar-menu-practice-mini .s936-bar-menu-title small{
  font-size:.42rem!important;
  opacity:.62;
}
.s936-bar-menu-practice-mini .s936-bar-menu-grid{
  display:grid!important;
  grid-template-columns:repeat(2,minmax(0,1fr))!important;
  gap:5px!important;
}
.s936-bar-menu-practice-mini button{
  min-height:28px!important;
  padding:6px 7px!important;
  border-radius:9px!important;
  text-align:center!important;
  font-size:.53rem!important;
  font-weight:950!important;
  background:rgba(255,255,255,.055)!important;
}
.s936-bar-menu-practice-mini button:hover{
  background:rgba(0,255,204,.13)!important;
}
.s936-bar-menu-practice-mini button.danger{
  color:#ff9b9b!important;
  border-color:rgba(255,90,90,.42)!important;
}
.s936-ch-beat.compact-hold{
  justify-content:center;
}
.s936-ch-beat.compact-hold .s936-ch-beat-chord{
  flex:1;
  min-height:86px;
  margin:0;
  display:flex;
  align-items:center;
  justify-content:center;
}
.s936-ch-beat.compact-hold .s936-ch-hold-wrap{
  min-height:76px;
  border-radius:10px;
  border:1px solid rgba(255,224,102,.22);
  background:linear-gradient(180deg,rgba(255,224,102,.10),rgba(255,255,255,.025));
  box-shadow:inset 0 0 18px rgba(255,224,102,.045);
}
.s936-ch-beat.compact-hold .s936-ch-hold-wrap .s936-ch-rhythm-mark{
  width:30px;
  height:30px;
  min-width:30px;
  min-height:30px;
  padding:0;
  font-size:1.18rem;
  border-radius:999px;
  background:rgba(255,224,102,.115);
}
.s936-ch-beat.compact-hold .s936-ch-hold-chord{
  margin-top:3px;
  font-size:.56rem;
  color:#bfffee;
}
.s936-ch-beat.compact-hold .s936-ch-beat-voicing,
.s936-ch-beat.compact-hold .s936-ch-voicing-held-empty{
  display:none!important;
}
.s936-ch-beat.compact-hold.active-beat .s936-ch-hold-wrap,
.s936-ch-beat.compact-hold.chart-step-active .s936-ch-hold-wrap{
  border-color:rgba(0,255,204,.68);
  background:linear-gradient(180deg,rgba(0,255,204,.18),rgba(255,224,102,.08));
  box-shadow:0 0 24px rgba(0,255,204,.20), inset 0 0 18px rgba(255,224,102,.08);
}
.s936-ch-sec-repeat-badge,
.s936-ch-sec-navmark-badge{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-height:18px;
  border-radius:999px;
  padding:2px 8px;
  font-size:.50rem;
  font-weight:950;
  letter-spacing:.45px;
  text-transform:uppercase;
}
.s936-ch-sec-repeat-badge{
  color:#ffe066;
  border:1px solid rgba(255,224,102,.45);
  background:rgba(255,224,102,.10);
}
.s936-ch-sec-navmark-badge{
  color:#ffbaf3;
  border:1px solid rgba(255,91,234,.40);
  background:rgba(255,91,234,.10);
}

/* Cambio 26 · menú de práctica extra compacto y menos invasivo */
.s936-bar-menu-practice-mini{
  min-width:174px!important;
  max-width:190px!important;
  padding:6px!important;
  border-radius:12px!important;
  background:linear-gradient(145deg,rgba(7,11,16,.74),rgba(16,22,30,.66))!important;
  border:1px solid rgba(0,255,204,.30)!important;
  box-shadow:0 10px 30px rgba(0,0,0,.70),0 0 14px rgba(0,255,204,.08)!important;
  backdrop-filter:blur(16px)!important;
}
.s936-bar-menu-practice-mini .s936-bar-menu-title{
  display:none!important;
}
.s936-bar-menu-practice-mini .s936-bar-menu-grid{
  grid-template-columns:1fr!important;
  gap:4px!important;
}
.s936-bar-menu-practice-mini button{
  min-height:25px!important;
  padding:5px 7px!important;
  border-radius:8px!important;
  font-size:.50rem!important;
  letter-spacing:.12px!important;
  background:rgba(255,255,255,.05)!important;
}
.s936-bar-menu-practice-mini button.danger{
  margin-top:2px!important;
}

/* Cambio 26 · sostenidos más limpios: sin mapa, solo símbolo + acorde */
.s936-ch-beat.compact-hold .s936-ch-beat-chord{
  min-height:74px!important;
}
.s936-ch-beat.compact-hold .s936-ch-hold-wrap{
  min-height:64px!important;
  background:linear-gradient(180deg,rgba(255,224,102,.085),rgba(255,255,255,.018))!important;
}
.s936-ch-beat.compact-hold .s936-ch-hold-wrap .s936-ch-rhythm-mark{
  width:25px!important;
  height:25px!important;
  min-width:25px!important;
  min-height:25px!important;
  font-size:1.02rem!important;
}
.s936-ch-beat.compact-hold .s936-ch-hold-chord{
  font-size:.50rem!important;
}

/* Cambio 26 · holds invisibles en reposo; aparecen solo durante práctica/play */
.s936-ch-beat.compact-hold:not(.chart-step-active):not(.active-beat){
  background:rgba(255,255,255,.028)!important;
  border-color:rgba(255,255,255,.09)!important;
  box-shadow:none!important;
}
.s936-ch-beat.compact-hold:not(.chart-step-active):not(.active-beat) .s936-ch-beat-chord{
  opacity:0!important;
  pointer-events:none;
}
.s936-ch-beat.compact-hold:not(.chart-step-active):not(.active-beat) .s936-ch-hold-wrap{
  opacity:0!important;
  transform:scale(.94);
}
.s936-ch-beat.compact-hold:not(.chart-step-active):not(.active-beat) .s936-ch-beat-num{
  opacity:.18!important;
}
.s936-ch-beat.compact-hold.chart-step-active .s936-ch-beat-chord,
.s936-ch-beat.compact-hold.active-beat .s936-ch-beat-chord{
  opacity:1!important;
}
.s936-ch-beat.compact-hold.chart-step-active .s936-ch-hold-wrap,
.s936-ch-beat.compact-hold.active-beat .s936-ch-hold-wrap{
  opacity:1!important;
  transform:scale(1);
}
.s936-ch-beat.compact-hold.chart-step-active .s936-ch-hold-chord,
.s936-ch-beat.compact-hold.active-beat .s936-ch-hold-chord{
  opacity:.98!important;
}
.s936-ch-beat.compact-hold.chart-step-active .s936-ch-rhythm-mark,
.s936-ch-beat.compact-hold.active-beat .s936-ch-rhythm-mark{
  color:#00ffcc!important;
  background:rgba(0,255,204,.16)!important;
  border-color:rgba(0,255,204,.48)!important;
  text-shadow:0 0 16px rgba(0,255,204,.35)!important;
}

    
/* Cambio 32 · sin tracker temporal en la hoja */
.s936-ch-change-banner{display:none!important}
`;
    s.textContent += `
/* Cambio 51 · letra tipo cinta karaoke fluida (sin cuadrícula), resaltado por palabra
   sincronizado con el beat real del Chart. Consolida y reemplaza los estilos de
   Cambio 45 / 48 / 50 para esta misma zona. */
.s936-ch-lyric-line{
  margin:14px 4px 6px;
  padding:4px 6px;
  border:none;
  border-radius:0;
  background:none;
  box-shadow:none;
  color:rgba(255,255,255,.55);
  font-size:1.6rem;
  line-height:1.4;
  font-weight:850;
  letter-spacing:.01em;
  white-space:normal;
  overflow:visible;
  text-align:center;
}
/* Cambio 77: la palabra queda alineada EXACTAMENTE debajo de su tiempo real
   (mismo grid de 4 columnas que la fila de acordes .s936-ch-beats), pero sin
   ningún borde, fondo ni número visible — sigue viéndose como texto fluido,
   no como cuadrícula. Esto es lo que hace que, al reproducir, la iluminación
   karaoke caiga justo en el lugar correcto debajo del tiempo que suena. */
.s936-ch-lyric-beats{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  column-gap:4px;
}
.s936-ch-lyric-beat{
  display:block;
  text-align:center;
  padding:0 .05em;
  border:none;
  background:none;
  color:rgba(255,255,255,.40);
  font-size:1.6rem;
  font-weight:850;
  transition:color .2s ease, transform .2s ease, text-shadow .2s ease;
  /* Cambio 84: si una palabra no cabe en su tiempo (ej. una palabra de 4
     sílabas), hace wrap dentro de su PROPIA columna en vez de invadir la
     celda vecina. min-width:0 es necesario porque los ítems de grid, por
     defecto, no se achican más que su contenido sin partir — sin esto, la
     palabra empujaría la columna o se saldría hacia el lado. */
  min-width:0;
  overflow-wrap:break-word;
  word-break:break-word;
  hyphens:auto;
}
.s936-ch-lyric-beat.has-text{
  color:rgba(234,255,251,.82);
}
.s936-ch-lyric-beat::before{
  content:none;
}
.s936-ch-lyric-beat.is-long{
  text-decoration:underline;
  text-decoration-color:rgba(255,224,102,.45);
  text-underline-offset:4px;
}
.s936-ch-lyric-beat.is-long::after{
  content:none;
}
/* Palabra activa: resaltado tipo karaoke, avanza sola con el tempo del Chart. */
.s936-ch-lyric-beat.active-word{
  color:#ffe066;
  text-shadow:0 0 10px rgba(255,224,102,.55),0 0 22px rgba(0,255,204,.25);
  transform:scale(1.16);
}
/* Cambio 52: ya no se anida la letra dentro de la caja %, así que no hace falta
   una regla especial de ancho/centrado para ese caso; usa la misma cinta normal. */
.s936-ch-lyric-empty{
  display:none;
}
`;
    document.head.appendChild(s);
  }

  // ─── RENDER FRETBOARD INTERACTIVO ──────────────────────────────────────
  function renderInteractiveFretboard(container, inst, currentFrets, onFretChange) {
    const config = FRETBOARD_CONFIG[inst];
    if (!config) return null;
    
    const strings = config.strings.length;
    const maxFrets = config.frets;
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${maxFrets * 22 + 50} ${strings * 28 + 20}`);
    svg.setAttribute('class', 's936-fretboard-svg');
    svg.style.width = '100%';
    svg.style.height = 'auto';
    svg.style.cursor = 'pointer';
    
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', maxFrets * 22 + 50);
    bg.setAttribute('height', strings * 28 + 20);
    bg.setAttribute('fill', 'rgba(60,40,20,0.15)');
    bg.setAttribute('rx', '4');
    svg.appendChild(bg);
    
    for (let s = 0; s < strings; s++) {
      const y = s * 28 + 18;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', '35');
      line.setAttribute('y1', y);
      line.setAttribute('x2', maxFrets * 22 + 35);
      line.setAttribute('y2', y);
      const width = s === 0 ? '2.5' : (s === strings - 1 ? '1.5' : '2');
      line.setAttribute('stroke', `rgba(200,180,150,${s === 0 ? '0.5' : '0.3'})`);
      line.setAttribute('stroke-width', width);
      line.setAttribute('class', 'fret-string');
      svg.appendChild(line);
    }
    
    for (let f = 0; f <= maxFrets; f++) {
      const x = f * 22 + 35;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x);
      line.setAttribute('y1', '8');
      line.setAttribute('x2', x);
      line.setAttribute('y2', strings * 28 + 12);
      line.setAttribute('stroke', f === 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)');
      line.setAttribute('stroke-width', f === 0 ? '2' : '0.8');
      line.setAttribute('class', 'fret-line');
      svg.appendChild(line);
      
      if (f > 0 && f % 2 === 0) {
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', x);
        label.setAttribute('y', strings * 28 + 16);
        label.setAttribute('fill', 'rgba(255,255,255,0.12)');
        label.setAttribute('font-size', '6');
        label.setAttribute('text-anchor', 'middle');
        label.textContent = f;
        svg.appendChild(label);
      }
    }
    
    const dotGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    dotGroup.setAttribute('class', 'dot-group');
    
    currentFrets.forEach((fret, s) => {
      if (fret === null || fret === 'X' || fret === undefined) return;
      const x = fret * 22 + 35;
      const y = s * 28 + 18;
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', x);
      dot.setAttribute('cy', y);
      dot.setAttribute('r', '7');
      dot.setAttribute('fill', '#00ffcc');
      dot.setAttribute('opacity', '0.9');
      dot.setAttribute('class', 'fret-dot');
      dot.dataset.string = s;
      dot.dataset.fret = fret;
      dotGroup.appendChild(dot);
      
      const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      glow.setAttribute('cx', x);
      glow.setAttribute('cy', y);
      glow.setAttribute('r', '12');
      glow.setAttribute('fill', 'rgba(0,255,204,0.15)');
      glow.setAttribute('class', 'fret-glow');
      dotGroup.appendChild(glow);
    });
    svg.appendChild(dotGroup);
    
    svg.addEventListener('click', (e) => {
      const rect = svg.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width * (maxFrets * 22 + 50);
      const y = (e.clientY - rect.top) / rect.height * (strings * 28 + 20);
      
      const stringIndex = Math.round((y - 18) / 28);
      const fretIndex = Math.round((x - 35) / 22);
      
      if (stringIndex >= 0 && stringIndex < strings && fretIndex >= 0 && fretIndex <= maxFrets) {
        const newFrets = [...currentFrets];
        if (newFrets[stringIndex] === fretIndex) {
          newFrets[stringIndex] = null;
        } else {
          newFrets[stringIndex] = fretIndex;
        }
        onFretChange(newFrets);
      }
    });
    
    container.appendChild(svg);
    return svg;
  }

  // ─── RENDER PIANO INTERACTIVO ──────────────────────────────────────────
  function renderInteractivePiano(container, currentNotes, onNoteToggle) {
    const piano = document.createElement('div');
    piano.className = 's936-piano-interactive';
    
    const WHITE_KEYS = [0, 2, 4, 5, 7, 9, 11];
    const BLACK_KEYS = [1, 3, 6, 8, 10];
    const startMidi = 48;
    const endMidi = 72;
    
    let whiteIndex = 0;
    for (let midi = startMidi; midi < endMidi; midi++) {
      const pc = midi % 12;
      if (WHITE_KEYS.includes(pc)) {
        const key = document.createElement('div');
        key.className = 'piano-key white';
        const left = (whiteIndex / 7) * 100;
        key.style.cssText = `left:${left}%;width:${100/7}%;`;
        key.dataset.midi = midi;
        if (currentNotes.includes(midi)) {
          key.classList.add('active');
        }
        key.addEventListener('click', (e) => {
          e.stopPropagation();
          const midiVal = parseInt(key.dataset.midi);
          onNoteToggle(midiVal);
        });
        piano.appendChild(key);
        whiteIndex++;
      }
    }
    
    let blackIndex = 0;
    for (let midi = startMidi; midi < endMidi; midi++) {
      const pc = midi % 12;
      if (BLACK_KEYS.includes(pc)) {
        const key = document.createElement('div');
        key.className = 'piano-key black';
        const position = (blackIndex + 1) / 7 * 100;
        key.style.cssText = `left:${position - 6}%;width:12%;height:55%;top:0;`;
        key.dataset.midi = midi;
        if (currentNotes.includes(midi)) {
          key.classList.add('active');
        }
        key.addEventListener('click', (e) => {
          e.stopPropagation();
          const midiVal = parseInt(key.dataset.midi);
          onNoteToggle(midiVal);
        });
        piano.appendChild(key);
        blackIndex++;
      }
    }
    
    container.appendChild(piano);
    return piano;
  }

  // ─── ABRIR EDITOR DE VOICING ────────────────────────────────────────────
  function openVoicingEditor(cell, sectionKey, barIndex, beatIndex, beatVal, inst, onRerender) {
    document.querySelectorAll('.s936-voicing-editor').forEach(el => el.remove());
    document.querySelectorAll('#s936-voicing-overlay').forEach(el => el.remove());
    
    const overlay = document.createElement('div');
    overlay.id = 's936-voicing-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.7);backdrop-filter:blur(4px);';
    overlay.onclick = () => { overlay.remove(); editor.remove(); };
    
    const editor = document.createElement('div');
    editor.className = 's936-voicing-editor';
    
    const title = document.createElement('div');
    title.className = 's936-voicing-editor-title';
    title.textContent = `🎸 Editar voicing · ${inst.toUpperCase()}`;
    editor.appendChild(title);
    
    const subtitle = document.createElement('div');
    subtitle.className = 's936-voicing-editor-subtitle';
    subtitle.textContent = 'Click en el mástil para poner/quitar dedos';
    editor.appendChild(subtitle);
    
    const editorContainer = document.createElement('div');
    editorContainer.className = 's936-voicing-editor-container';
    editor.appendChild(editorContainer);
    
    const detectedDisplay = document.createElement('div');
    detectedDisplay.className = 's936-voicing-editor-detected';
    detectedDisplay.textContent = '🎵 Acorde detectado: —';
    editor.appendChild(detectedDisplay);
    
    let currentFrets = [];
    let currentNotes = [];
    let isPiano = inst === 'piano';
    
    if (isPiano) {
      currentNotes = [];
      const renderPiano = () => {
        editorContainer.innerHTML = '';
        renderInteractivePiano(editorContainer, currentNotes, (midi) => {
          const index = currentNotes.indexOf(midi);
          if (index > -1) {
            currentNotes.splice(index, 1);
          } else {
            currentNotes.push(midi);
          }
          renderPiano();
          const chord = detectChordFromNotes(currentNotes);
          if (chord) {
            detectedDisplay.textContent = `🎵 Acorde detectado: ${chord}`;
            detectedDisplay.style.color = '#00ffcc';
          } else {
            detectedDisplay.textContent = `🎵 Acorde detectado: — (${currentNotes.length} notas)`;
            detectedDisplay.style.color = 'rgba(255,255,255,.4)';
          }
        });
      };
      renderPiano();
    } else {
      const stringCount = inst === 'guitar' ? 6 : 4;
      currentFrets = new Array(stringCount).fill(null);
      
      if (beatVal) {
        const parsed = parseChord(beatVal);
        if (parsed) {
          const shape = calcFretVoicing(parsed.root + parsed.qual, inst);
          if (shape && shape.frets) {
            currentFrets = shape.frets.slice(0, stringCount);
            while (currentFrets.length < stringCount) currentFrets.push(null);
          }
        }
      }
      
      const renderFret = () => {
        editorContainer.innerHTML = '';
        renderInteractiveFretboard(editorContainer, inst, currentFrets, (newFrets) => {
          currentFrets = newFrets;
          renderFret();
          const chord = detectChordFromFrets(currentFrets, inst);
          if (chord) {
            detectedDisplay.textContent = `🎵 Acorde detectado: ${chord}`;
            detectedDisplay.style.color = '#00ffcc';
          } else {
            const validNotes = currentFrets.filter(f => f !== null && f !== 'X').length;
            detectedDisplay.textContent = `🎵 Acorde detectado: — (${validNotes} notas)`;
            detectedDisplay.style.color = 'rgba(255,255,255,.4)';
          }
        });
      };
      renderFret();
    }
    
    const actions = document.createElement('div');
    actions.className = 's936-voicing-editor-actions';
    
    const applyBtn = document.createElement('button');
    applyBtn.className = 's936-voicing-editor-apply';
    applyBtn.textContent = '✓ Aplicar acorde al beat';
    applyBtn.onclick = () => {
      let chordName = '';
      if (isPiano) {
        chordName = detectChordFromNotes(currentNotes);
      } else {
        chordName = detectChordFromFrets(currentFrets, inst);
      }
      if (chordName) {
        saveBeat(sectionKey, barIndex, beatIndex, chordName);
        overlay.remove();
        editor.remove();
        onRerender();
      } else {
        detectedDisplay.textContent = '⚠️ No se pudo detectar un acorde válido';
        detectedDisplay.style.color = '#ff8080';
      }
    };
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 's936-voicing-editor-cancel';
    cancelBtn.textContent = '✕ Cancelar';
    cancelBtn.onclick = () => { overlay.remove(); editor.remove(); };
    
    actions.append(applyBtn, cancelBtn);
    editor.appendChild(actions);
    
    document.body.appendChild(overlay);
    document.body.appendChild(editor);
  }

  // ─── DATOS ────────────────────────────────────────────────────────────────
  function getSectionBars() {
    try {
      const d = JSON.parse(localStorage.getItem("s936_suitepro_structure_v4") || "{}");
      return (d?.draft?.parts || []).reduce((m, p) => {
        if (p.section) m[p.section] = Number(p.bars) || 4;
        return m;
      }, {});
    } catch(_) { return {}; }
  }

  function getBeatsData(sectionKey) {
    try {
      return JSON.parse(localStorage.getItem("s936_chart_beats_v1") || "{}")[sectionKey] || {};
    } catch(_) { return {}; }
  }

  function saveBeat(sectionKey, barIndex, beatIndex, val) {
    try {
      const d = JSON.parse(localStorage.getItem("s936_chart_beats_v1") || "{}");
      if (!d[sectionKey]) d[sectionKey] = {};
      const key = barIndex + "_" + beatIndex;
      if (val) d[sectionKey][key] = val;
      else delete d[sectionKey][key];
      localStorage.setItem("s936_chart_beats_v1", JSON.stringify(d));
    } catch(_) {}
  }


  const RHYTHM_MODES = {
    hit:    { symbol: "♩", label: "Tocar",    className: "hit" },
    hold:   { symbol: "♩", label: "Sostener", className: "hold" },
    rest:   { symbol: "𝄽", label: "Silencio", className: "rest" },
    repeat: { symbol: "%",  label: "Repetir",  className: "repeat" },
    empty:  { symbol: "",   label: "",         className: "empty" }
  };

  function normalizeRhythmMode(mode) {
    const value = String(mode || "").toLowerCase().trim();
    return RHYTHM_MODES[value] ? value : "hit";
  }

  function getRhythmData(sectionKey) {
    try {
      return JSON.parse(localStorage.getItem("s936_chart_rhythm_v1") || "{}")[sectionKey] || {};
    } catch(_) { return {}; }
  }

  function saveBeatRhythm(sectionKey, barIndex, beatIndex, mode) {
    try {
      const d = JSON.parse(localStorage.getItem("s936_chart_rhythm_v1") || "{}");
      if (!d[sectionKey]) d[sectionKey] = {};
      const key = barIndex + "_" + beatIndex;
      const normalized = normalizeRhythmMode(mode);
      if (normalized && normalized !== "empty") d[sectionKey][key] = normalized;
      else delete d[sectionKey][key];
      if (Object.keys(d[sectionKey]).length === 0) delete d[sectionKey];
      localStorage.setItem("s936_chart_rhythm_v1", JSON.stringify(d));
    } catch(_) {}
  }

  // Cambio 11: cuando un compás que era "%" recibe un acorde nuevo en el tiempo 1,
  // el compás deja de ser repetición y se completa musicalmente:
  // tiempo 1 = tocar, tiempos 2-4 = sostener, salvo que ya tengan datos propios.
  function repairBarRhythmAfterChordSave(sectionKey, barIndex, beatIndex, chordValue, requestedRhythm) {
    try {
      if (!chordValue || beatIndex !== 0) return;

      const beatsAll = JSON.parse(localStorage.getItem("s936_chart_beats_v1") || "{}");
      const rhythmAll = JSON.parse(localStorage.getItem("s936_chart_rhythm_v1") || "{}");
      const beats = beatsAll[sectionKey] || {};
      if (!rhythmAll[sectionKey]) rhythmAll[sectionKey] = {};
      const rhythms = rhythmAll[sectionKey];

      const firstKey = barIndex + "_0";
      const wantedFirst = normalizeRhythmMode(requestedRhythm);
      rhythms[firstKey] = (!wantedFirst || wantedFirst === "empty" || wantedFirst === "repeat") ? "hit" : wantedFirst;

      [1, 2, 3].forEach((b) => {
        const key = barIndex + "_" + b;
        if (!beats[key] && !rhythms[key]) {
          rhythms[key] = "hold";
        }
      });

      localStorage.setItem("s936_chart_rhythm_v1", JSON.stringify(rhythmAll));
    } catch(_) {}
  }

  function rhythmInfo(mode) {
    return RHYTHM_MODES[normalizeRhythmMode(mode)] || RHYTHM_MODES.hit;
  }

  function defaultRhythmForBeat({ beatVal, beatIndex, barInfo }) {
    if (beatVal) return "hit";
    if (barInfo?.chord && beatIndex > 0 && barInfo?.isFirst) return "hold";
    return "empty";
  }


  function getBeatVoicing(sectionKey, barIndex, beatIndex, inst) {
    try {
      const d = JSON.parse(localStorage.getItem("s936_chart_voicings_v1") || "{}");
      return d?.[sectionKey]?.[barIndex + "_" + beatIndex]?.[inst] || null;
    } catch(_) {
      return null;
    }
  }

  function saveBeatVoicing(sectionKey, barIndex, beatIndex, inst, voicing) {
    try {
      const d = JSON.parse(localStorage.getItem("s936_chart_voicings_v1") || "{}");
      if (!d[sectionKey]) d[sectionKey] = {};
      const key = barIndex + "_" + beatIndex;
      if (!d[sectionKey][key]) d[sectionKey][key] = {};
      if (voicing) d[sectionKey][key][inst] = voicing;
      else delete d[sectionKey][key][inst];
      if (Object.keys(d[sectionKey][key]).length === 0) delete d[sectionKey][key];
      if (Object.keys(d[sectionKey]).length === 0) delete d[sectionKey];
      localStorage.setItem("s936_chart_voicings_v1", JSON.stringify(d));
    } catch(_) {}
  }

  function prepopulate(sectionKey, chords) {
    try {
      const d = JSON.parse(localStorage.getItem("s936_chart_beats_v1") || "{}");
      if (d[sectionKey] && Object.keys(d[sectionKey]).length > 0) return;
      if (!Array.isArray(chords) || !chords.length) return;
      d[sectionKey] = {};
      let bi = 0;
      chords.forEach(c => {
        const bars = Math.max(1, Number(c.bars) || 1);
        d[sectionKey][bi + "_0"] = c.name || "";
        bi += bars;
      });
      localStorage.setItem("s936_chart_beats_v1", JSON.stringify(d));
    } catch(_) {}
  }

  // ─── PARSING ──────────────────────────────────────────────────────────────
  function parseChord(name) {
    if (!name || !String(name).trim()) return null;
    const m = String(name).match(/^([A-G][b#]?)(.*)$/);
    if (!m) return { root: name, qual: "", bass: "" };
    const bassM = (m[2] || "").match(/^(.*)\/(([A-G][b#]?))$/);
    return bassM
      ? { root: m[1], qual: bassM[1], bass: bassM[2] }
      : { root: m[1], qual: m[2] || "", bass: "" };
  }

  const PC = {C:0,"C#":1,DB:1,D:2,"D#":3,EB:3,E:4,FB:4,"E#":5,F:5,"F#":6,GB:6,G:7,"G#":8,AB:8,A:9,"A#":10,BB:10,B:11,CB:11,"B#":0};
  function chordPitchClasses(chordName) {
    if (!chordName) return new Set();
    const MT = window.Studio936MusicTheory;
    if (MT?.chordVoicing) {
      try {
        const notes = MT.chordVoicing(chordName);
        const pcs = new Set(
          notes.split(" ").map(n => {
            const m2 = n.match(/^([A-G][b#]?)/i);
            if (!m2) return -1;
            return PC[m2[1].toUpperCase().replace("b","B")] ?? -1;
          }).filter(p => p >= 0)
        );
        return pcs;
      } catch(_) {}
    }
    const m = String(chordName).match(/^([A-G][b#]?)(.*)/);
    if (!m) return new Set();
    const rootPc = PC[m[1].toUpperCase().replace("b","B")] ?? 0;
    const qual = m[2].toLowerCase();
    let ints = [0, 4, 7];
    if (qual.includes("m") && !qual.includes("maj")) ints = [0, 3, 7];
    if (qual.includes("dim")) ints = [0, 3, 6];
    if (qual.includes("aug")) ints = [0, 4, 8];
    if (qual.includes("sus4")) ints = [0, 5, 7];
    if (qual.includes("sus2")) ints = [0, 2, 7];
    if (qual.includes("7")) ints.push(qual.includes("maj") ? 11 : 10);
    if (qual.includes("9")) ints.push(2);
    if (qual.includes("11")) ints.push(5);
    if (qual.includes("13")) ints.push(9);
    if (qual.includes("6") && !qual.includes("13")) ints.push(9);
    return new Set(ints.map(i => ((rootPc + i) % 12 + 12) % 12));
  }

  // ─── VOICINGS ─────────────────────────────────────────────────────────────
  const GUITAR_SHAPES = {
    "C": [null,3,2,0,1,0], "C#": [null,4,3,1,2,1], "Db": [null,4,3,1,2,1],
    "D": [null,null,0,2,3,2], "D#": [null,null,1,3,4,3], "Eb": [null,null,1,3,4,3],
    "E": [0,2,2,1,0,0], "F": [1,3,3,2,1,1], "F#": [2,4,4,3,2,2], "Gb": [2,4,4,3,2,2],
    "G": [3,2,0,0,0,3], "G#": [4,3,1,1,1,4], "Ab": [4,3,1,1,1,4],
    "A": [null,0,2,2,2,0], "A#": [null,1,3,3,3,1], "Bb": [null,1,3,3,3,1],
    "B": [null,2,4,4,4,2],
    "Cm": [null,3,2,0,1,0], "C#m": [null,4,2,1,2,0], "Dbm": [null,4,2,1,2,0],
    "Dm": [null,null,0,2,3,1], "D#m": [null,null,1,3,4,2], "Ebm": [null,null,1,3,4,2],
    "Em": [0,2,2,0,0,0], "Fm": [1,3,3,1,1,1], "F#m": [2,4,4,2,2,2], "Gbm": [2,4,4,2,2,2],
    "Gm": [3,5,5,3,3,3], "G#m": [4,3,1,1,0,4], "Abm": [4,3,1,1,0,4],
    "Am": [null,0,2,2,1,0], "A#m": [null,1,3,3,2,1], "Bbm": [null,1,3,3,2,1],
    "Bm": [null,2,4,4,3,2],
    "C7": [null,3,2,3,1,0], "D7": [null,null,0,2,1,2], "E7": [0,2,0,1,0,0],
    "F7": [1,3,1,2,1,1], "G7": [3,2,0,0,0,1], "A7": [null,0,2,0,2,0],
    "B7": [null,2,1,2,0,2],
    "Cm7": [null,3,2,3,1,3], "Dm7": [null,null,0,2,1,1], "Em7": [0,2,0,0,0,0],
    "Fm7": [1,3,1,1,1,1], "Gm7": [3,2,0,0,3,1], "Am7": [null,0,2,0,1,0],
    "Bm7": [null,2,4,2,3,2],
    "Cmaj7": [null,3,2,0,0,0], "Dmaj7": [null,null,0,2,2,2], "Emaj7": [0,2,1,1,0,0],
    "Fmaj7": [null,null,3,2,1,0], "Gmaj7": [3,2,0,0,0,2], "Amaj7": [null,0,2,1,2,0],
    "Bmaj7": [null,2,4,3,4,2],
    "Csus2": [null,3,0,0,1,3], "Dsus2": [null,null,0,2,3,0], "Esus2": [0,2,2,0,0,0],
    "Gsus2": [3,0,0,2,3,3], "Asus2": [null,0,2,2,0,0],
    "Csus4": [null,3,3,0,1,1], "Dsus4": [null,null,0,2,3,3], "Esus4": [0,2,2,2,0,0],
    "Gsus4": [3,3,0,0,1,3], "Asus4": [null,0,2,2,3,0],
    "C6": [null,3,2,0,0,0], "D6": [null,null,0,2,0,2], "E6": [0,2,2,1,2,0],
    "G6": [3,2,0,0,0,0], "A6": [null,0,2,2,2,2],
    "C9": [null,3,2,3,3,0], "D9": [null,null,0,2,1,2], "E9": [0,2,0,1,0,2],
    "G9": [3,2,0,0,0,1], "A9": [null,0,2,0,2,0],
    "Cm9": [null,3,2,3,3,3], "Dm9": [null,null,0,2,1,1], "Em9": [0,2,0,0,0,0],
    "Gm9": [3,2,0,0,3,1], "Am9": [null,0,2,0,1,0],
    "C13": [null,3,2,3,1,0], "D13": [null,null,0,2,1,2], "E13": [0,2,0,1,0,0],
    "G13": [3,2,0,0,0,1], "A13": [null,0,2,0,2,0],
    "Cadd9": [null,3,2,0,3,0], "Dadd9": [null,null,0,4,3,0], "Gadd9": [3,0,0,0,3,3],
    "Eadd9": [0,2,2,1,0,0], "Aadd9": [null,0,2,4,2,0],
    "Cdim": [null,3,2,3,1,3], "Gdim": [3,2,3,0,3,1],
    "Caug": [null,3,2,1,1,0], "Eaug": [0,3,2,1,0,0], "Gaug": [3,2,1,0,3,0],
  };

  const UKU_SHAPES = {
    "C":[0,0,0,3],"D":[2,2,2,0],"E":[4,4,4,2],"F":[2,0,1,0],"G":[0,2,3,2],
    "A":[2,1,0,0],"B":[4,3,2,2],
    "Cm":[0,3,3,3],"Dm":[2,2,1,0],"Em":[0,4,3,2],"Fm":[1,0,1,3],"Gm":[0,2,3,1],
    "Am":[2,0,0,0],"Bm":[4,2,2,2],
    "C7":[0,0,0,1],"D7":[2,2,2,3],"E7":[1,2,0,2],"F7":[2,3,1,3],"G7":[0,2,1,2],
    "A7":[0,1,0,0],"B7":[2,3,2,2],
    "Cmaj7":[0,0,0,2],"Fmaj7":[2,4,1,3],"Gmaj7":[0,2,2,2],"Amaj7":[1,1,0,0],
    "Cm7":[0,3,3,3],"Dm7":[2,2,1,3],"Em7":[0,2,0,2],"Fm7":[1,0,1,1],"Am7":[0,0,0,0],
  };

  function bassShape(chordName) {
    const PC2 = {C:0,"C#":1,DB:1,D:2,"D#":3,EB:3,E:4,F:5,"F#":6,GB:6,G:7,"G#":8,AB:8,A:9,"A#":10,BB:10,B:11};
    const m = String(chordName).match(/^([A-G][b#]?)/i);
    if (!m) return null;
    const rootPc = PC2[m[1].toUpperCase().replace("b","B")] ?? 0;
    const openMidis = [28, 33, 38, 43];
    const frets = openMidis.map(open => {
      let f = ((rootPc - (open % 12) + 12) % 12);
      if (f > 7) f -= 12;
      return f < 0 ? f + 12 : f;
    });
    const best = frets.reduce((bi, f, i) => f <= 4 && (bi === -1 || f < frets[bi]) ? i : bi, -1);
    return frets.map((f, i) => i === best ? f : (f <= 4 ? f : null));
  }

  function calcFretVoicing(chordName, inst) {
    if (!chordName) return null;
    
    const rootMatch = chordName.match(/^([A-G][b#]?)/i);
    const root = rootMatch ? rootMatch[1].toUpperCase() : null;
    
    let cleanName = String(chordName).toUpperCase().trim().replace(/\s+/g, "");
    if (cleanName.includes('/')) {
      cleanName = cleanName.split('/')[0];
    }
    
    const searchVariants = [
      cleanName,
      cleanName.replace(/MAJOR/g, 'MAJ7').replace(/MAJ/g, 'MAJ7'),
      cleanName.replace(/MINOR/g, 'm').replace(/MIN/g, 'm'),
      cleanName.replace(/[0-9]/g, ''),
      root,
    ];
    
    if (inst === "guitar") {
      let shape = null;
      for (const variant of searchVariants) {
        shape = GUITAR_SHAPES[variant];
        if (shape) break;
      }
      if (!shape && root) {
        if (cleanName.includes('M') && !cleanName.includes('MAJ7')) {
          shape = GUITAR_SHAPES[root + 'maj7'];
        }
        if (!shape && cleanName.includes('m') && !cleanName.includes('MAJ7')) {
          shape = GUITAR_SHAPES[root + 'm'];
        }
        if (!shape && cleanName.includes('7')) {
          shape = GUITAR_SHAPES[root + '7'];
        }
        if (!shape) {
          shape = GUITAR_SHAPES[root];
        }
      }
      if (!shape && root) {
        const defaultShapes = {
          'C': [null,3,2,0,1,0], 'C#': [null,4,3,1,2,1], 'Db': [null,4,3,1,2,1],
          'D': [null,null,0,2,3,2], 'D#': [null,null,1,3,4,3], 'Eb': [null,null,1,3,4,3],
          'E': [0,2,2,1,0,0], 'F': [1,3,3,2,1,1], 'F#': [2,4,4,3,2,2], 'Gb': [2,4,4,3,2,2],
          'G': [3,2,0,0,0,3], 'G#': [4,3,1,1,1,4], 'Ab': [4,3,1,1,1,4],
          'A': [null,0,2,2,2,0], 'A#': [null,1,3,3,3,1], 'Bb': [null,1,3,3,3,1],
          'B': [null,2,4,4,4,2]
        };
        shape = defaultShapes[root];
      }
      return shape ? { frets: shape } : null;
    }
    
    if (inst === "ukulele") {
      let shape = null;
      for (const variant of searchVariants) {
        shape = UKU_SHAPES[variant];
        if (shape) break;
      }
      if (!shape && root) {
        const defaultShapes = {
          'C': [0,0,0,3], 'D': [2,2,2,0], 'E': [4,4,4,2], 'F': [2,0,1,0],
          'G': [0,2,3,2], 'A': [2,1,0,0], 'B': [4,3,2,2]
        };
        shape = defaultShapes[root];
      }
      return shape ? { frets: shape } : null;
    }
    
    if (inst === "bass") {
      const shape = bassShape(chordName);
      return shape ? { frets: shape } : null;
    }
    return null;
  }

  // ─── FIGURAS ──────────────────────────────────────────────────────────────
  function noteSVG(type) {
    const H = "#e8e8e8";
    if (type === "whole")
      return `<svg width="12" height="16" viewBox="0 0 12 16"><ellipse cx="6" cy="12" rx="5" ry="3" fill="none" stroke="${H}" stroke-width="1.4"/></svg>`;
    if (type === "half")
      return `<svg width="10" height="16" viewBox="0 0 10 16"><ellipse cx="5" cy="12" rx="4" ry="2.5" fill="none" stroke="${H}" stroke-width="1.3"/><line x1="8.8" y1="12" x2="8.8" y2="1.5" stroke="${H}" stroke-width="1.3"/></svg>`;
    if (type === "quarter")
      return `<svg width="10" height="16" viewBox="0 0 10 16"><ellipse cx="5" cy="12" rx="4" ry="2.5" fill="${H}" stroke="${H}" stroke-width="1"/><line x1="8.8" y1="12" x2="8.8" y2="1.5" stroke="${H}" stroke-width="1.3"/></svg>`;
    return "";
  }

  function rhythmFig(totalBars) {
    if (totalBars >= 4) return "whole";
    if (totalBars === 3) return "half";
    if (totalBars === 2) return "half";
    return "quarter";
  }

  // ─── MINI PIANO ──────────────────────────────────────────────────────────
  const WK = [0,2,4,5,7,9,11];
  const BK = [1,3,6,8,10];
  const BK_POS = { 1:1/7, 3:2/7, 6:4/7, 8:5/7, 10:6/7 };

  function miniPiano(voicingPiano, chordName) {
    const wrap = document.createElement("div");
    wrap.className = "s936-ch-piano-mini";

    let hitPcs;
    if (Array.isArray(voicingPiano?.midis) && voicingPiano.midis.length > 0) {
      hitPcs = new Set(voicingPiano.midis.map(m => ((m % 12) + 12) % 12));
    } else if (chordName) {
      hitPcs = chordPitchClasses(chordName);
    } else {
      hitPcs = new Set();
    }

    const wkW = 100 / 7;

    WK.forEach((pc, i) => {
      const k = document.createElement("div");
      k.className = "s936-ch-pw white-k" + (hitPcs.has(pc) ? " hit-k" : "");
      k.style.cssText = `left:${i * wkW}%;width:${wkW}%`;
      wrap.appendChild(k);
    });

    BK.forEach(pc => {
      const center = BK_POS[pc] * 100;
      const bkW = wkW * 0.6;
      const k = document.createElement("div");
      k.className = "s936-ch-pw black-k" + (hitPcs.has(pc) ? " hit-k" : "");
      k.style.cssText = `left:${center - bkW / 2}%;width:${bkW}%`;
      wrap.appendChild(k);
    });

    return wrap;
  }

  // ─── MINI FRETBOARD ──────────────────────────────────────────────────────
  function miniFret(voicingFret) {
    const wrap = document.createElement("div");
    wrap.className = "s936-ch-fret-mini";

    if (!voicingFret || !Array.isArray(voicingFret.frets) || !voicingFret.frets.length) {
      return wrap;
    }

    const frets = [...voicingFret.frets].reverse();
    const strings = frets.length;
    const capo = Number(voicingFret.capo) || 0;

    const numeric = frets.filter(f => f !== null && String(f).toUpperCase() !== "X" && Number(f) >= 0).map(Number);
    const minF = numeric.length ? Math.min(...numeric.filter(n => n > 0)) : 0;
    const maxF = numeric.length ? Math.max(...numeric) : 4;
    const start = capo > 0 ? capo : (minF > 1 ? minF - 1 : 0);
    const span = Math.max(4, maxF - start + 1);

    const fretLabel = document.createElement("div");
    fretLabel.className = "s936-ch-fret-label";
    fretLabel.textContent = start > 0 ? start : "";
    wrap.appendChild(fretLabel);

    if (capo > 0) {
      const c = document.createElement("div");
      c.className = "s936-ch-capo";
      wrap.appendChild(c);
    }

    for (let s = 0; s < strings; s++) {
      const el = document.createElement("div");
      el.className = "s936-ch-fs";
      el.style.top = ((s + 0.5) / strings * 100) + "%";
      wrap.appendChild(el);
    }

    for (let f = 0; f <= span; f++) {
      const el = document.createElement("div");
      el.className = "s936-ch-ff";
      el.style.cssText = `left:${8 + f / span * 88}%;z-index:1`;
      wrap.appendChild(el);
    }

    frets.forEach((fret, si) => {
      const top = (si + 0.5) / strings * 100;
      const strF = String(fret).toUpperCase();
      if (fret === null || strF === "X") {
        const m = document.createElement("div");
        m.className = "s936-ch-fm";
        m.textContent = "×";
        m.style.cssText = `top:${top}%;left:4%;z-index:2`;
        wrap.appendChild(m);
      } else {
        const f0 = Number(fret);
        const leftPct = f0 === 0 ? 4 : 8 + ((f0 - start + 0.5) / span) * 88;
        const dot = document.createElement("div");
        dot.className = "s936-ch-fd";
        dot.style.cssText = `top:${top}%;left:${leftPct}%;z-index:3`;
        wrap.appendChild(dot);
      }
    });

    return wrap;
  }

  // ─── POPUP CON PREVIEW ──────────────────────────────────────────────────
  function closePopups() {
    stopChartPopupAudio();
    document.querySelectorAll(".s936-ch-pop").forEach(p => p.remove());
    document.querySelectorAll(".s936-voicing-editor").forEach(p => p.remove());
    document.querySelectorAll("#s936-voicing-overlay").forEach(p => p.remove());
    const ov = document.getElementById("s936-ch-pop-overlay");
    if (ov) ov.remove();
  }

  function showBeatPop(targetEl, label, currentVal, inst, currentRhythm, onSave, onOpenVoicing) {
    closePopups();

    const ROOTS = ["C","D","E","F","G","A","B"];
    const ACCS  = ["♮","#","b"];
    const QUALS = [
      ["",      "Mayor"],
      ["m",     "Menor"],
      ["7",     "Dom 7"],
      ["m7",    "m7"],
      ["maj7",  "Maj7"],
      ["m7b5",  "m7b5"],
      ["dim",   "Dim"],
      ["dim7",  "Dim7"],
      ["aug",   "Aug"],
      ["sus4",  "Sus4"],
      ["sus2",  "Sus2"],
      ["9",     "9"],
      ["m9",    "m9"],
      ["maj9",  "Maj9"],
      ["11",    "11"],
      ["13",    "13"],
      ["add9",  "add9"],
      ["6",     "6"],
      ["m6",    "m6"],
      ["5",     "5 (power)"],
    ];

    const previewInst = INSTRUMENTS.some(i => i.id === inst) ? inst : (_chartInstrument || "piano");
    const qualValues = new Set(QUALS.map(([q]) => q));
    let manualChordName = "";
    let rhythmMode = normalizeRhythmMode(currentRhythm || (currentVal ? "hit" : "hold"));

    const initM = currentVal ? String(currentVal).match(/^([A-G])(#|b)?(.*)$/) : null;
    let selRoot = initM ? initM[1] : "C";
    let selAcc  = initM ? (initM[2] || "♮") : "♮";
    let selQual = initM ? (initM[3] || "") : "";

    let inlineFrets = null;
    let inlineNotes = null;
    let fretStart = 0;
    const visibleFrets = 6;

    const pop = document.createElement("div");
    pop.className = "s936-ch-pop s936-ch-pop-v7 s936-ch-pop-v8 s936-ch-pop-v9 s936-ch-pop-v10";
    const popW = Math.min(980, Math.max(760, Math.floor(window.innerWidth * 0.70)));
    const popH = Math.min(620, Math.max(500, Math.floor(window.innerHeight * 0.76)));
    const left = Math.max(8, Math.round((window.innerWidth - popW) / 2));
    const top = Math.max(36, Math.round((window.innerHeight - popH) / 2));
    pop.style.cssText = `left:${left}px;top:${top}px;width:${popW}px;height:${popH}px;`;
    pop.onclick = (e) => e.stopPropagation();

    const drag = document.createElement("div");
    drag.className = "s936-ch-pop-drag";
    drag.innerHTML = `<span>${label}</span><small>Arrastra · cambio 11</small>`;
    pop.appendChild(drag);

    const main = document.createElement("div");
    main.className = "s936-picker-main-v7";
    pop.appendChild(main);

    const leftPane = document.createElement("div");
    leftPane.className = "s936-picker-pane-v7 s936-picker-pane-preview-v7";
    const rightPane = document.createElement("div");
    rightPane.className = "s936-picker-pane-v7 s936-picker-pane-controls-v7";
    main.append(leftPane, rightPane);

    const preview = document.createElement("div");
    preview.className = "s936-picker-preview";
    preview.textContent = currentVal || "—";
    if (!currentVal) preview.classList.add("empty");
    leftPane.appendChild(preview);

    const notesLine = document.createElement("div");
    notesLine.className = "s936-picker-notes-line";
    leftPane.appendChild(notesLine);

    const mapLabel = document.createElement("div");
    mapLabel.className = "s936-picker-map-label";
    mapLabel.textContent = previewInst === "piano" ? "Mapa editable de notas" : "Mapa editable de digitación";
    leftPane.appendChild(mapLabel);

    const fretControls = document.createElement("div");
    fretControls.className = "s936-picker-fret-controls";
    leftPane.appendChild(fretControls);

    const mapBox = document.createElement("div");
    mapBox.className = "s936-picker-map-box s936-picker-map-box-live";
    leftPane.appendChild(mapBox);

    const rhythmTitle = document.createElement("div");
    rhythmTitle.className = "s936-picker-rhythm-title";
    rhythmTitle.textContent = "Ritmo del beat";
    leftPane.appendChild(rhythmTitle);

    const rhythmRow = document.createElement("div");
    rhythmRow.className = "s936-picker-rhythm-row";
    const rhythmBtns = {};
    [
      ["hit", "♩ Tocar"],
      ["hold", "♩ Sostener"],
      ["rest", "𝄽 Silencio"],
      ["repeat", "% Repetir"]
    ].forEach(([mode, txt]) => {
      const btn = document.createElement("button");
      btn.className = "s936-picker-rhythm-btn";
      btn.textContent = txt;
      btn.onclick = (e) => {
        e.stopPropagation();
        setRhythmMode(mode);
      };
      rhythmBtns[mode] = btn;
      rhythmRow.appendChild(btn);
    });
    leftPane.appendChild(rhythmRow);

    const audioRow = document.createElement("div");
    audioRow.className = "s936-picker-audio-row";

    const chordBtn = document.createElement("button");
    chordBtn.className = "s936-picker-audio-btn";
    chordBtn.textContent = "▶ Acorde";
    chordBtn.title = "Escuchar el acorde completo";

    const arpBtn = document.createElement("button");
    arpBtn.className = "s936-picker-audio-btn";
    arpBtn.textContent = "✨ Arpegio";
    arpBtn.title = "Escuchar las notas una por una";

    const rhythmBtn = document.createElement("button");
    rhythmBtn.className = "s936-picker-audio-btn";
    rhythmBtn.textContent = "♫ Ritmo tempo";
    rhythmBtn.title = "Repetir el acorde al BPM actual y seguir cambios en vivo";

    const pulseBtn = document.createElement("button");
    pulseBtn.className = "s936-picker-audio-btn pulse";
    pulseBtn.textContent = "🥁 Pulso";
    pulseBtn.title = "Activar/desactivar pulso percusivo ligero dentro del popup";

    const stopBtn = document.createElement("button");
    stopBtn.className = "s936-picker-audio-btn stop";
    stopBtn.textContent = "■ Stop";
    stopBtn.title = "Detener prueba de audio";

    audioRow.append(chordBtn, arpBtn, rhythmBtn, pulseBtn, stopBtn);
    leftPane.appendChild(audioRow);

    const audioHint = document.createElement("div");
    audioHint.className = "s936-picker-audio-mini";
    audioHint.textContent = "El ritmo sigue en vivo la nota/calidad/mapa que cambies, sin depender de app.js.";
    leftPane.appendChild(audioHint);

    const hintLine = document.createElement("div");
    hintLine.className = "s936-picker-map-hint";
    hintLine.textContent = previewInst === "piano"
      ? "Toca teclas en este mapa: el acorde se recalcula aquí mismo."
      : "Toca cuerdas y trastes en este mapa: no se abre otra ventana.";
    leftPane.appendChild(hintLine);

    let rhythmRunning = false;
    let pulseOn = false;

    function updateAudioButtonState() {
      rhythmBtn.classList.toggle("active", rhythmRunning);
      pulseBtn.classList.toggle("active", pulseOn);
      rhythmBtn.textContent = rhythmRunning ? "♫ Ritmo vivo" : "♫ Ritmo tempo";
      pulseBtn.textContent = pulseOn ? "🥁 Pulso ON" : "🥁 Pulso";
    }

    function updateRhythmButtons() {
      Object.entries(rhythmBtns).forEach(([mode, btn]) => {
        btn.classList.toggle("sel", mode === rhythmMode);
      });
    }

    function setRhythmMode(mode) {
      rhythmMode = normalizeRhythmMode(mode);
      updateRhythmButtons();
      if (rhythmMode === "rest") {
        if (rhythmRunning) restartLiveRhythm();
        return;
      }
      pulseLiveChordNow();
    }

    function pulseLiveChordNow() {
      if (!rhythmRunning) return;
      schedulePopupRhythmHit(currentPopupMidis(), getCurrentChartBpm(), pulseOn);
    }

    function restartLiveRhythm() {
      if (!rhythmRunning) return;
      startPopupRhythm(() => currentPopupMidis(), getCurrentChartBpm(), pulseOn);
      updateAudioButtonState();
    }

    function buildChordName() {
      if (manualChordName) return manualChordName;
      if (!selRoot) return "";
      const acc = selAcc === "♮" ? "" : selAcc;
      return selRoot + acc + selQual;
    }

    function chordNameFromPicker() {
      if (!selRoot) return "";
      const acc = selAcc === "♮" ? "" : selAcc;
      return selRoot + acc + selQual;
    }

    function normalizeChordToPicker(name) {
      const m = String(name || "").match(/^([A-G])(#|b)?(.*)$/);
      if (!m) return false;
      selRoot = m[1];
      selAcc = m[2] || "♮";
      const q = m[3] || "";
      selQual = qualValues.has(q) ? q : "";
      manualChordName = qualValues.has(q) ? "" : String(name);
      return true;
    }

    function setPickerClasses() {
      Object.entries(rootBtns).forEach(([r, b]) => b.classList.toggle("sel", r === selRoot));
      Object.entries(accBtns).forEach(([a, b]) => b.classList.toggle("sel", a === selAcc));
      Object.entries(qualBtns).forEach(([q, b]) => b.classList.toggle("sel", !manualChordName && q === selQual));
    }

    function getPcNotesLine(name) {
      const pcs = [...chordPitchClasses(name)].sort((a, b) => a - b);
      return pcs.length
        ? "Notas: " + pcs.map(pc => NOTE_NAMES[pc] || "").filter(Boolean).join(" · ")
        : "Notas: —";
    }

    function initInlineStateFromChord(name) {
      if (previewInst === "piano") {
        const pcs = [...chordPitchClasses(name)];
        inlineNotes = pcs.map(pc => 48 + pc).sort((a, b) => a - b);
        inlineFrets = null;
        return;
      }

      const cfg = FRETBOARD_CONFIG[previewInst];
      const stringCount = cfg?.strings?.length || (previewInst === "guitar" ? 6 : 4);
      const shape = name ? calcFretVoicing(name, previewInst) : null;
      inlineFrets = shape?.frets ? shape.frets.slice(0, stringCount) : new Array(stringCount).fill(null);
      while (inlineFrets.length < stringCount) inlineFrets.push(null);
      inlineNotes = null;
      const numeric = inlineFrets.filter(f => f !== null && f !== "X" && Number.isFinite(Number(f))).map(Number);
      const minF = numeric.length ? Math.min(...numeric.filter(f => f > 0)) : 0;
      fretStart = Math.max(0, Math.min((cfg?.frets || 12) - visibleFrets, minF > 1 ? minF - 1 : 0));
    }

    function currentInlineVoicing() {
      if (previewInst === "piano") {
        const midis = Array.isArray(inlineNotes)
          ? [...new Set(inlineNotes)].sort((a, b) => a - b)
          : [];
        return midis.length ? { midis, source: "popup-inline-v8" } : null;
      }
      if (!Array.isArray(inlineFrets)) return null;
      const hasAny = inlineFrets.some(f => f !== null && f !== undefined && String(f).toUpperCase() !== "X");
      return hasAny ? { frets: [...inlineFrets], startFret: fretStart, source: "popup-inline-v8" } : null;
    }

    function currentPopupMidis() {
      if (rhythmMode === "rest") return [];
      if (previewInst === "piano") {
        const notes = Array.isArray(inlineNotes) ? inlineNotes : [];
        return normalizePopupMidis(notes.length ? notes : chordNameToPreviewMidis(buildChordName()));
      }

      const cfg = FRETBOARD_CONFIG[previewInst];
      if (cfg && Array.isArray(inlineFrets)) {
        const midis = inlineFrets.map((fret, i) => {
          if (fret === null || fret === undefined || String(fret).toUpperCase() === "X") return null;
          const n = Number(fret);
          return Number.isFinite(n) ? cfg.open[i] + n : null;
        }).filter(m => m !== null);
        if (midis.length) return normalizePopupMidis(midis);
      }

      return chordNameToPreviewMidis(buildChordName());
    }

    function refreshPreviewText(name) {
      if (name) {
        preview.textContent = name;
        preview.className = "s936-picker-preview";
      } else {
        preview.textContent = "—";
        preview.className = "s936-picker-preview empty";
      }
      notesLine.textContent = name ? getPcNotesLine(name) : "";
    }

    function applyDetectedChord(name) {
      if (!name) return;
      normalizeChordToPicker(name);
      setPickerClasses();
      refreshPreviewText(buildChordName());
    }

    function renderFretControls() {
      fretControls.innerHTML = "";
      if (previewInst === "piano") return;
      const cfg = FRETBOARD_CONFIG[previewInst];
      const maxStart = Math.max(0, (cfg?.frets || 12) - visibleFrets);

      const minus = document.createElement("button");
      minus.className = "s936-picker-fret-step";
      minus.textContent = "◀";
      const plus = document.createElement("button");
      plus.className = "s936-picker-fret-step";
      plus.textContent = "▶";

      const label = document.createElement("label");
      label.className = "s936-picker-fret-label";
      label.textContent = "Traste inicial";

      const value = document.createElement("span");
      value.className = "s936-picker-fret-value";
      value.textContent = String(fretStart);

      const range = document.createElement("input");
      range.type = "range";
      range.min = "0";
      range.max = String(maxStart);
      range.value = String(fretStart);
      range.className = "s936-picker-fret-range";

      const setStart = (next) => {
        fretStart = Math.max(0, Math.min(maxStart, Number(next) || 0));
        value.textContent = String(fretStart);
        range.value = String(fretStart);
        renderInlineMap(false);
      };

      minus.onclick = (e) => { e.stopPropagation(); setStart(fretStart - 1); };
      plus.onclick = (e) => { e.stopPropagation(); setStart(fretStart + 1); };
      range.oninput = (e) => { e.stopPropagation(); setStart(range.value); };

      fretControls.append(minus, label, value, range, plus);
    }

    function renderInlinePiano() {
      const piano = document.createElement("div");
      piano.className = "s936-picker-piano-live";
      const WHITE_KEYS = [0, 2, 4, 5, 7, 9, 11];
      const BLACK_KEYS = [1, 3, 6, 8, 10];
      const blackPos = {1:0.95, 3:1.95, 6:3.95, 8:4.95, 10:5.95};
      const active = new Set((inlineNotes || []).map(m => ((m % 12) + 12) % 12));
      WHITE_KEYS.forEach((pc, i) => {
        const key = document.createElement("button");
        key.className = "s936-picker-piano-key white" + (active.has(pc) ? " active" : "");
        key.style.left = (i * (100 / 7)) + "%";
        key.style.width = (100 / 7) + "%";
        key.dataset.midi = String(48 + pc);
        key.onclick = (e) => {
          e.stopPropagation();
          const midi = Number(key.dataset.midi);
          const idx = inlineNotes.indexOf(midi);
          if (idx >= 0) inlineNotes.splice(idx, 1);
          else inlineNotes.push(midi);
          inlineNotes.sort((a, b) => a - b);
          playPopupSingleMidi(midi);
          const detected = detectChordFromNotes(inlineNotes);
          if (detected) applyDetectedChord(detected);
          renderInlineMap(false);
          pulseLiveChordNow();
        };
        piano.appendChild(key);
      });
      BLACK_KEYS.forEach((pc) => {
        const key = document.createElement("button");
        key.className = "s936-picker-piano-key black" + (active.has(pc) ? " active" : "");
        key.style.left = ((blackPos[pc] / 7) * 100) + "%";
        key.style.width = "8.5%";
        key.dataset.midi = String(48 + pc);
        key.onclick = (e) => {
          e.stopPropagation();
          const midi = Number(key.dataset.midi);
          const idx = inlineNotes.indexOf(midi);
          if (idx >= 0) inlineNotes.splice(idx, 1);
          else inlineNotes.push(midi);
          inlineNotes.sort((a, b) => a - b);
          playPopupSingleMidi(midi);
          const detected = detectChordFromNotes(inlineNotes);
          if (detected) applyDetectedChord(detected);
          renderInlineMap(false);
          pulseLiveChordNow();
        };
        piano.appendChild(key);
      });
      mapBox.appendChild(piano);
    }

    function renderInlineFrets() {
      const cfg = FRETBOARD_CONFIG[previewInst];
      if (!cfg) {
        mapBox.textContent = "Instrumento sin mapa.";
        return;
      }
      const fretGrid = document.createElement("div");
      fretGrid.className = "s936-picker-fret-live";
      const strings = cfg.strings || [];
      const frets = Array.from({ length: visibleFrets }, (_, i) => fretStart + i + 1);

      const headerEmpty = document.createElement("div");
      headerEmpty.className = "s936-picker-fret-cell head";
      headerEmpty.textContent = "Cuerda";
      fretGrid.appendChild(headerEmpty);
      ["X", "0", ...frets].forEach(f => {
        const h = document.createElement("div");
        h.className = "s936-picker-fret-cell head";
        h.textContent = String(f);
        fretGrid.appendChild(h);
      });

      strings.forEach((stringLabel, sIndex) => {
        const lbl = document.createElement("div");
        lbl.className = "s936-picker-fret-cell string-label";
        lbl.textContent = stringLabel;
        fretGrid.appendChild(lbl);

        const xBtn = document.createElement("button");
        xBtn.className = "s936-picker-fret-cell fret-btn" + (inlineFrets[sIndex] === null || inlineFrets[sIndex] === "X" ? " active muted" : "");
        xBtn.textContent = "×";
        xBtn.onclick = (e) => {
          e.stopPropagation();
          inlineFrets[sIndex] = null;
          renderInlineMap(false);
          pulseLiveChordNow();
        };
        fretGrid.appendChild(xBtn);

        const openBtn = document.createElement("button");
        openBtn.className = "s936-picker-fret-cell fret-btn" + (Number(inlineFrets[sIndex]) === 0 ? " active" : "");
        openBtn.textContent = "○";
        openBtn.onclick = (e) => {
          e.stopPropagation();
          inlineFrets[sIndex] = Number(inlineFrets[sIndex]) === 0 ? null : 0;
          if (Number(inlineFrets[sIndex]) === 0) playPopupSingleMidi(cfg.open[sIndex]);
          const detected = detectChordFromFrets(inlineFrets, previewInst);
          if (detected) applyDetectedChord(detected);
          renderInlineMap(false);
          pulseLiveChordNow();
        };
        fretGrid.appendChild(openBtn);

        frets.forEach((fret) => {
          const btn = document.createElement("button");
          btn.className = "s936-picker-fret-cell fret-btn" + (Number(inlineFrets[sIndex]) === fret ? " active" : "");
          btn.textContent = Number(inlineFrets[sIndex]) === fret ? "●" : "";
          btn.onclick = (e) => {
            e.stopPropagation();
            inlineFrets[sIndex] = Number(inlineFrets[sIndex]) === fret ? null : fret;
            if (Number(inlineFrets[sIndex]) === fret) playPopupSingleMidi(cfg.open[sIndex] + fret);
            const detected = detectChordFromFrets(inlineFrets, previewInst);
            if (detected) applyDetectedChord(detected);
            renderInlineMap(false);
            pulseLiveChordNow();
          };
          fretGrid.appendChild(btn);
        });
      });

      mapBox.appendChild(fretGrid);
    }

    function renderInlineMap(resetFromPicker) {
      const name = buildChordName();
      if (resetFromPicker) initInlineStateFromChord(name);
      renderFretControls();
      mapBox.innerHTML = "";
      if (!name && previewInst !== "piano") {
        const empty = document.createElement("div");
        empty.className = "s936-picker-map-empty";
        empty.textContent = "Selecciona nota y calidad para iniciar el mapa.";
        mapBox.appendChild(empty);
        refreshPreviewText("");
        return;
      }
      refreshPreviewText(name);
      if (previewInst === "piano") renderInlinePiano();
      else renderInlineFrets();
    }

    chordBtn.onclick = (e) => {
      e.stopPropagation();
      rhythmRunning = false;
      updateAudioButtonState();
      playPopupChord(currentPopupMidis());
    };
    arpBtn.onclick = (e) => {
      e.stopPropagation();
      rhythmRunning = false;
      updateAudioButtonState();
      playPopupArpeggio(currentPopupMidis(), getCurrentChartBpm());
    };
    rhythmBtn.onclick = (e) => {
      e.stopPropagation();
      rhythmRunning = !rhythmRunning;
      if (rhythmRunning) {
        rhythmRunning = startPopupRhythm(() => currentPopupMidis(), getCurrentChartBpm(), pulseOn);
      } else {
        stopChartPopupAudio();
      }
      updateAudioButtonState();
    };
    pulseBtn.onclick = (e) => {
      e.stopPropagation();
      pulseOn = !pulseOn;
      if (rhythmRunning) restartLiveRhythm();
      updateAudioButtonState();
    };
    stopBtn.onclick = (e) => {
      e.stopPropagation();
      rhythmRunning = false;
      stopChartPopupAudio();
      updateAudioButtonState();
    };
    updateAudioButtonState();
    updateRhythmButtons();

    const rootLbl = document.createElement("div");
    rootLbl.className = "s936-picker-label";
    rootLbl.textContent = "Nota";
    rightPane.appendChild(rootLbl);

    const rootGrid = document.createElement("div");
    rootGrid.className = "s936-picker-roots";
    const rootBtns = {};
    ROOTS.forEach(r => {
      const btn = document.createElement("button");
      btn.className = "s936-picker-btn" + (r === selRoot ? " sel" : "");
      btn.textContent = r;
      btn.onclick = (e) => {
        e.stopPropagation();
        manualChordName = "";
        selRoot = r;
        setPickerClasses();
        renderInlineMap(true);
        pulseLiveChordNow();
      };
      rootBtns[r] = btn;
      rootGrid.appendChild(btn);
    });
    rightPane.appendChild(rootGrid);

    const accLbl = document.createElement("div");
    accLbl.className = "s936-picker-label";
    accLbl.textContent = "Alteración";
    rightPane.appendChild(accLbl);

    const accRow = document.createElement("div");
    accRow.className = "s936-picker-acc";
    const accBtns = {};
    ACCS.forEach(a => {
      const btn = document.createElement("button");
      btn.className = "s936-picker-btn" + (a === selAcc ? " sel" : "");
      btn.textContent = a === "♮" ? "Natural" : (a === "#" ? "#" : "b");
      btn.onclick = (e) => {
        e.stopPropagation();
        manualChordName = "";
        selAcc = a;
        setPickerClasses();
        renderInlineMap(true);
        pulseLiveChordNow();
      };
      accBtns[a] = btn;
      accRow.appendChild(btn);
    });
    rightPane.appendChild(accRow);

    const qualLbl = document.createElement("div");
    qualLbl.className = "s936-picker-label";
    qualLbl.textContent = "Calidad";
    rightPane.appendChild(qualLbl);

    const qualGrid = document.createElement("div");
    qualGrid.className = "s936-picker-quals";
    const qualBtns = {};
    QUALS.forEach(([q, lbTxt]) => {
      const btn = document.createElement("button");
      btn.className = "s936-picker-btn" + (q === selQual ? " sel" : "");
      btn.textContent = lbTxt;
      btn.onclick = (e) => {
        e.stopPropagation();
        manualChordName = "";
        selQual = q;
        setPickerClasses();
        renderInlineMap(true);
        pulseLiveChordNow();
      };
      qualBtns[q] = btn;
      qualGrid.appendChild(btn);
    });
    rightPane.appendChild(qualGrid);

    const acts = document.createElement("div");
    acts.className = "s936-picker-acts s936-picker-acts-v7";
    const okBtn = document.createElement("button");
    okBtn.className = "s936-picker-ok";
    okBtn.textContent = "✓ Aplicar acorde y mapa";
    const delBtn = document.createElement("button");
    delBtn.className = "s936-picker-del";
    delBtn.textContent = "Borrar";
    acts.append(okBtn, delBtn);
    rightPane.appendChild(acts);

    if (currentVal) normalizeChordToPicker(currentVal);
    setPickerClasses();
    renderInlineMap(true);

    const doSave = (val, voicing) => { stopChartPopupAudio(); pop.remove(); onSave(val, voicing, rhythmMode); };
    okBtn.onclick = (e) => { e.stopPropagation(); doSave(buildChordName(), currentInlineVoicing()); };
    delBtn.onclick = (e) => { e.stopPropagation(); rhythmMode = "empty"; doSave("", null); };

    function makeMovable() {
      let moving = false;
      let dx = 0;
      let dy = 0;

      const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
      const moveTo = (x, y) => {
        const r = pop.getBoundingClientRect();
        const maxX = Math.max(8, window.innerWidth - r.width - 8);
        const maxY = Math.max(8, window.innerHeight - r.height - 8);
        pop.style.left = clamp(x, 8, maxX) + "px";
        pop.style.top = clamp(y, 8, maxY) + "px";
      };

      drag.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        const r = pop.getBoundingClientRect();
        moving = true;
        dx = e.clientX - r.left;
        dy = e.clientY - r.top;
        drag.setPointerCapture?.(e.pointerId);
        e.preventDefault();
      });

      drag.addEventListener("pointermove", (e) => {
        if (!moving) return;
        moveTo(e.clientX - dx, e.clientY - dy);
      });

      const stop = (e) => {
        if (!moving) return;
        moving = false;
        try { drag.releasePointerCapture?.(e.pointerId); } catch(_) {}
      };
      drag.addEventListener("pointerup", stop);
      drag.addEventListener("pointercancel", stop);
      window.addEventListener("resize", () => {
        const r = pop.getBoundingClientRect();
        moveTo(r.left, r.top);
      }, { once: true });
    }

    document.addEventListener("keydown", function esc(e) {
      if (e.key === "Escape") { stopChartPopupAudio(); pop.remove(); document.removeEventListener("keydown", esc); }
    });

    document.body.appendChild(pop);
    makeMovable();
  }

  // ─── RENDER BEAT ──────────────────────────────────────────────────────────
  function renderBeat(sectionKey, barIndex, beatIndex, beatVal, inst, voicingLibrary, onRerender, rhythmMode, inheritedVal) {
    const parsed = parseChord(beatVal);
    const inheritedParsed = (!parsed && inheritedVal) ? parseChord(inheritedVal) : null;
    const effectiveRhythm = normalizeRhythmMode(rhythmMode || (beatVal ? "hit" : (inheritedVal ? "hold" : "empty")));
    const rInfo = rhythmInfo(effectiveRhythm);
    const cell = document.createElement("div");
    const compactHold = !!(!parsed && inheritedParsed && effectiveRhythm === "hold");
    cell.className = "s936-ch-beat" + (parsed ? " has-chord" : "") + (compactHold ? " compact-hold" : "") + " rhythm-" + rInfo.className;
    cell.dataset.section = sectionKey;
    cell.dataset.bar = barIndex;
    cell.dataset.beat = beatIndex;
    cell.dataset.rhythm = effectiveRhythm;
    cell.dataset.chord = beatVal || inheritedVal || "";

    const num = document.createElement("span");
    num.className = "s936-ch-beat-num";
    num.textContent = beatIndex + 1;
    cell.appendChild(num);

    const chordRow = document.createElement("div");
    chordRow.className = "s936-ch-beat-chord";

    if (parsed) {
      const r = document.createElement("span");
      r.className = "s936-ch-beat-root";
      r.textContent = parsed.root;
      const q = document.createElement("sup");
      q.className = "s936-ch-beat-qual";
      q.textContent = parsed.qual;
      chordRow.append(r, q);
      if (parsed.bass) {
        const b = document.createElement("span");
        b.className = "s936-ch-beat-bass";
        b.textContent = "/" + parsed.bass;
        chordRow.appendChild(b);
      }
    } else if (inheritedParsed && effectiveRhythm === "hold") {
      const holdWrap = document.createElement("span");
      holdWrap.className = "s936-ch-hold-wrap";
      const mark = document.createElement("span");
      mark.className = "s936-ch-rhythm-mark hold";
      mark.textContent = "♩";
      mark.title = "Sostener " + inheritedVal;
      const smallChord = document.createElement("span");
      smallChord.className = "s936-ch-hold-chord";
      smallChord.textContent = inheritedVal;
      holdWrap.append(mark, smallChord);
      chordRow.appendChild(holdWrap);
    } else if (rInfo.symbol) {
      const mark = document.createElement("span");
      mark.className = "s936-ch-rhythm-mark " + rInfo.className;
      mark.textContent = rInfo.symbol;
      mark.title = rInfo.label;
      chordRow.appendChild(mark);
    } else {
      const empty = document.createElement("span");
      empty.className = "s936-ch-beat-empty-label";
      empty.textContent = "—";
      chordRow.appendChild(empty);
    }
    cell.appendChild(chordRow);

    const voicingContainer = document.createElement("div");
    voicingContainer.className = "s936-ch-beat-voicing";

    if (parsed && effectiveRhythm !== "rest") {
      const chordName = parsed.root + parsed.qual;
      const nameUpper = chordName.toUpperCase().trim();

      if (inst === "piano") {
        const beatVoicing = getBeatVoicing(sectionKey, barIndex, beatIndex, inst);
        const savedVoicing = beatVoicing || voicingLibrary?.[inst]?.[nameUpper] || null;
        voicingContainer.appendChild(miniPiano(savedVoicing, chordName));
      } else {
        let savedVoicing = getBeatVoicing(sectionKey, barIndex, beatIndex, inst) || voicingLibrary?.[inst]?.[nameUpper];
        let fretVoicing = null;

        if (savedVoicing) {
          fretVoicing = savedVoicing;
        } else {
          fretVoicing = calcFretVoicing(chordName, inst);
        }
        voicingContainer.appendChild(miniFret(fretVoicing));
      }
    } else if (inheritedParsed && effectiveRhythm === "hold") {
      // Cambio 24: los beats sostenidos ya no repiten el mapa/teclado.
      // El primer beat explica el voicing; los beats 2-4 muestran nota pequeña + acorde.
      voicingContainer.classList.add("s936-ch-voicing-held", "s936-ch-voicing-held-empty");
    } else if (rInfo.symbol) {
      const rhythmLabel = document.createElement("div");
      rhythmLabel.className = "s936-ch-beat-rhythm-label";
      rhythmLabel.textContent = rInfo.label;
      voicingContainer.appendChild(rhythmLabel);
    }
    cell.appendChild(voicingContainer);

    const hint = document.createElement("div");
    hint.className = "voicing-editor-hint";
    hint.textContent = "🖱 Click para editar acorde, mapa y ritmo";
    cell.appendChild(hint);

    cell.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      // Cambio 10: el ritmo también se edita en el popup único.
    });

    cell.addEventListener("click", (e) => {
      e.stopPropagation();
      const popupStartVal = beatVal || inheritedVal || "";
      const label = beatVal ? "Editar acorde" : "Añadir acorde";
      showBeatPop(
        cell,
        label + " · Tiempo " + (beatIndex + 1),
        popupStartVal,
        inst,
        effectiveRhythm,
        (val, voicing, nextRhythm) => {
          saveBeat(sectionKey, barIndex, beatIndex, val);
          saveBeatRhythm(sectionKey, barIndex, beatIndex, nextRhythm);
          repairBarRhythmAfterChordSave(sectionKey, barIndex, beatIndex, val, nextRhythm);
          saveBeatVoicing(sectionKey, barIndex, beatIndex, inst, val ? voicing : null);
          onRerender();
        },
        previewName => {
          const startName = previewName || popupStartVal || "";
          if (startName && startName !== beatVal) {
            saveBeat(sectionKey, barIndex, beatIndex, startName);
            onRerender();
          }
          setTimeout(() => openVoicingEditor(cell, sectionKey, barIndex, beatIndex, startName, inst, onRerender), 0);
        }
      );
    });

    return cell;
  }


  // ─── CAMBIO 17: MARCACIONES DE NAVEGACIÓN MUSICAL ───────────────────────
  const NAV_KEY = "s936_chart_navigation_v1";
  const NAV_LABELS = {
    repeatStart: { symbol: "𝄆", label: "Inicio repetición", cls: "strong" },
    repeatEnd:   { symbol: "𝄇", label: "Fin repetición", cls: "strong" },
    bis:         { symbol: "Bis", label: "Bis", cls: "strong" },
    loopStart:   { symbol: "Loop", label: "Inicio", cls: "strong" },
    loopEnd:     { symbol: "Loop", label: "Final", cls: "strong" },
    practiceStart:{ symbol: "▶", label: "Desde aquí", cls: "strong" },
    fine:        { symbol: "Fine", label: "Fine", cls: "stop" },
    segno:       { symbol: "𝄋", label: "Segno", cls: "strong" },
    coda:        { symbol: "𝄌", label: "Coda", cls: "strong" },
    dcFine:      { symbol: "D.C.", label: "al Fine", cls: "stop" },
    dsCoda:      { symbol: "D.S.", label: "al Coda", cls: "stop" },
    ending1:     { symbol: "1.", label: "Casilla", cls: "strong" },
    ending2:     { symbol: "2.", label: "Casilla", cls: "strong" }
  };

  function readNavigationMarks() {
    try {
      const raw = JSON.parse(localStorage.getItem(NAV_KEY) || "{}");
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw?.marks)) return raw.marks;
    } catch(_) {}
    try {
      const rawStruct = JSON.parse(localStorage.getItem("s936_suitepro_structure_v4") || "{}");
      if (Array.isArray(rawStruct?.draft?.navigation)) return rawStruct.draft.navigation;
    } catch(_) {}
    return [];
  }

  function navInfo(type) {
    return NAV_LABELS[type] || { symbol: String(type || ""), label: "", cls: "" };
  }

  function formatNavigationMark(mark) {
    const info = navInfo(mark?.type);
    if (!mark) return "";
    const repeats = Math.max(2, Number(mark.repeats) || 2);
    switch (mark.type) {
      case "repeatStart": return "𝄆";
      case "repeatEnd": return "𝄇 x" + repeats;
      case "loopStart": return "Loop In";
      case "loopEnd": return "Loop Out";
      case "practiceStart": return "▶ Desde aquí";
      case "fine": return "Fine";
      case "segno": return "𝄋";
      case "coda": return "Coda";
      case "bis": return "Bis x" + repeats;
      case "ending1": return "1ª";
      case "ending2": return "2ª";
      default:
        return [info.symbol, info.label].filter(Boolean).join(" ");
    }
  }

  // Cambio 26:
  // El Chart ya no muestra residuos antiguos de Coda/Fine/Segno guardados como marcas de compás.
  // En el compás solo viven marcas de práctica local. Las marcas de partitura/canción viven en sección.
  const BAR_PRACTICE_MARK_TYPES = new Set(["loopStart", "loopEnd", "practiceStart"]);

  function isBarPracticeMark(mark) {
    return BAR_PRACTICE_MARK_TYPES.has(String(mark?.type || ""));
  }

  function marksForBar(sectionKey, barIndex) {
    return readNavigationMarks().filter((mark) => {
      return isBarPracticeMark(mark)
        && String(mark.section || "") === String(sectionKey || "")
        && Number(mark.bar || 0) === Number(barIndex || 0);
    });
  }

  function sectionMarks(sectionKey) {
    return readNavigationMarks().filter((mark) => {
      return !isBarPracticeMark(mark) && String(mark.section || "") === String(sectionKey || "");
    });
  }

  function readStructurePartMetaMap() {
    const map = {};
    try {
      const raw = JSON.parse(localStorage.getItem("s936_suitepro_structure_v4") || "{}");
      const parts = Array.isArray(raw?.draft?.parts) ? raw.draft.parts : [];
      parts.forEach((part, index) => {
        const key = String(part.section || part.key || "");
        if (!key) return;
        if (!map[key]) {
          map[key] = {
            repeat: Math.max(1, Number(part.repeat) || 1),
            navMark: String(part.navMark || ""),
            label: part.label || part.name || key,
            index
          };
        }
      });
    } catch(_) {}
    return map;
  }

  function decorateArrangementWithStructureMeta(arrangement) {
    const meta = readStructurePartMetaMap();
    return (Array.isArray(arrangement) ? arrangement : []).map((part) => {
      const key = String(part?.section || "");
      const m = meta[key] || {};
      return Object.assign({}, part, {
        repeat: Math.max(1, Number(part?.repeat || m.repeat) || 1),
        navMark: part?.navMark || m.navMark || "",
        label: part?.label || m.label || part?.section
      });
    });
  }

  function sectionRepeatCount(sectionKey) {
    const meta = readStructurePartMetaMap();
    return Math.max(1, Number(meta[String(sectionKey || "")]?.repeat) || 1);
  }

  function sectionNavLabel(navMark) {
    switch (String(navMark || "")) {
      case "segno": return "𝄋 Segno";
      case "coda": return "𝄌 Coda";
      case "fine": return "Fine";
      case "dacapo": return "Da Capo";
      case "dalsegno": return "Dal Segno";
      case "bis": return "Bis";
      default: return "";
    }
  }

  function expandSectionRepeatsInSteps(steps) {
    const list = Array.isArray(steps) ? steps : [];
    if (!list.length) return list;
    const out = [];
    let i = 0;
    while (i < list.length) {
      const section = String(list[i]?.section || "");
      let j = i + 1;
      while (j < list.length && String(list[j]?.section || "") === section) j++;
      const chunk = list.slice(i, j);
      const times = Math.max(1, sectionRepeatCount(section));
      for (let r = 0; r < times; r++) {
        chunk.forEach(step => out.push(Object.assign({}, step, {
          sectionRepeatTurn: r + 1,
          sectionRepeatTotal: times
        })));
      }
      i = j;
    }
    return out;
  }


  function renderNavigationBadges(marks) {
    const wrap = document.createElement("div");
    wrap.className = "s936-ch-bar-nav";
    marks.forEach((mark) => {
      const info = navInfo(mark.type);
      const badge = document.createElement("span");
      badge.className = "s936-ch-nav-badge " + (info.cls || "");
      badge.dataset.navType = mark.type || "";
      badge.textContent = formatNavigationMark(mark);
      badge.title = (mark.partLabel || mark.section || "") + " · compás " + ((Number(mark.bar) || 0) + 1);
      wrap.appendChild(badge);
    });
    return wrap;
  }

  function writeNavigationMarks(marks) {
    const clean = Array.isArray(marks) ? marks : [];
    try {
      localStorage.setItem(NAV_KEY, JSON.stringify({
        version: "navigation-v1-cambio24",
        updatedAt: new Date().toISOString(),
        marks: clean
      }));
    } catch(_) {}
    try {
      const rawStruct = JSON.parse(localStorage.getItem("s936_suitepro_structure_v4") || "{}");
      if (rawStruct && typeof rawStruct === "object") {
        if (!rawStruct.draft || typeof rawStruct.draft !== "object") rawStruct.draft = {};
        rawStruct.draft.navigation = clean;
        localStorage.setItem("s936_suitepro_structure_v4", JSON.stringify(rawStruct));
      }
    } catch(_) {}
    try {
      window.dispatchEvent(new CustomEvent("studio936:chart-navigation-changed", { detail: { marks: clean } }));
    } catch(_) {}
  }

  function upsertNavigationMark(sectionKey, barIndex, type, repeats) {
    const marks = readNavigationMarks().filter((mark) => {
      return !(String(mark.section || "") === String(sectionKey || "")
        && Number(mark.bar || 0) === Number(barIndex || 0)
        && String(mark.type || "") === String(type || ""));
    });
    marks.push({
      id: "nav-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8),
      section: sectionKey,
      partLabel: sectionKey,
      bar: Number(barIndex) || 0,
      type,
      repeats: Math.max(2, Math.min(8, Number(repeats) || 2)),
      source: "chart-practice-menu-cambio24",
      createdAt: new Date().toISOString()
    });
    marks.sort((a, b) => String(a.section).localeCompare(String(b.section)) || Number(a.bar || 0) - Number(b.bar || 0));
    writeNavigationMarks(marks);
  }

  function clearNavigationMarksForBar(sectionKey, barIndex) {
    writeNavigationMarks(readNavigationMarks().filter((mark) => {
      return !(String(mark.section || "") === String(sectionKey || "")
        && Number(mark.bar || 0) === Number(barIndex || 0));
    }));
  }

  function clearPracticeLoopMarks(sectionKey) {
    writeNavigationMarks(readNavigationMarks().filter((mark) => {
      return !(String(mark.section || "") === String(sectionKey || "")
        && ["loopStart", "loopEnd"].includes(String(mark.type || "")));
    }));
  }

  function clearPracticeMarks(sectionKey) {
    writeNavigationMarks(readNavigationMarks().filter((mark) => {
      return !(String(mark.section || "") === String(sectionKey || "")
        && ["loopStart", "loopEnd", "practiceStart"].includes(String(mark.type || "")));
    }));
  }

  function setPracticeStartMark(sectionKey, barIndex) {
    const marks = readNavigationMarks().filter((mark) => {
      return !(String(mark.section || "") === String(sectionKey || "")
        && String(mark.type || "") === "practiceStart");
    });
    marks.push({
      id: "practiceStart:" + String(sectionKey || "") + ":" + Number(barIndex || 0),
      section: sectionKey || "",
      bar: Number(barIndex) || 0,
      type: "practiceStart",
      repeats: 1,
      createdAt: Date.now()
    });
    writeNavigationMarks(marks);
  }

  function applyBarRhythmPreset(sectionKey, barIndex, preset) {
    if (preset === "hitHold") {
      saveBeatRhythm(sectionKey, barIndex, 0, "hit");
      [1, 2, 3].forEach((b) => saveBeatRhythm(sectionKey, barIndex, b, "hold"));
      return;
    }
    if (preset === "restBar") {
      [0, 1, 2, 3].forEach((b) => saveBeatRhythm(sectionKey, barIndex, b, "rest"));
      return;
    }
    if (preset === "repeatBar") {
      [0, 1, 2, 3].forEach((b) => {
        saveBeat(sectionKey, barIndex, b, "");
        saveBeatRhythm(sectionKey, barIndex, b, "");
      });
      return;
    }
    if (preset === "clearRhythm") {
      [0, 1, 2, 3].forEach((b) => saveBeatRhythm(sectionKey, barIndex, b, ""));
      return;
    }
  }

  function closeBarContextMenus() {
    document.querySelectorAll(".s936-bar-menu,.s936-bar-menu-overlay").forEach((el) => el.remove());
  }

  function showBarContextMenu(event, { sectionKey, barIndex, onRerender }) {
    closeBarContextMenus();

    const overlay = document.createElement("div");
    overlay.className = "s936-bar-menu-overlay";
    overlay.onclick = closeBarContextMenus;

    const menu = document.createElement("div");
    menu.className = "s936-bar-menu s936-bar-menu-practice-mini";
    menu.onclick = (e) => e.stopPropagation();

    const title = document.createElement("div");
    title.className = "s936-bar-menu-title";
    title.innerHTML = `<span>Práctica · C${Number(barIndex) + 1}</span><small>${sectionKey}</small>`;
    menu.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "s936-bar-menu-grid";

    function addButton(label, fn, cls, titleText) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      if (cls) btn.className = cls;
      if (titleText) btn.title = titleText;
      btn.onclick = () => {
        try { fn(); } catch (error) { console.error("Chart practice menu action failed:", error); }
        closeBarContextMenus();
        onRerender?.();
      };
      grid.appendChild(btn);
    }

    addButton("▶ Desde aquí", () => setPracticeStartMark(sectionKey, barIndex), "", "Empieza la práctica desde este compás.");
    addButton("Loop In", () => upsertNavigationMark(sectionKey, barIndex, "loopStart", 2), "", "Marca inicio de loop de práctica.");
    addButton("Loop Out", () => upsertNavigationMark(sectionKey, barIndex, "loopEnd", 2), "", "Marca final de loop de práctica.");
    addButton("Limpiar", () => clearPracticeMarks(sectionKey), "danger", "Quita loop inicio, loop final y practicar desde aquí.");

    menu.appendChild(grid);
    document.body.append(overlay, menu);

    const rect = event?.target?.getBoundingClientRect?.();
    const preferredX = rect ? rect.left : (event.clientX || 8);
    const preferredY = rect ? rect.bottom + 8 : (event.clientY || 8);
    const x = Math.min(Math.max(8, preferredX), window.innerWidth - 250);
    const y = Math.min(Math.max(8, preferredY), window.innerHeight - 170);
    menu.style.left = x + "px";
    menu.style.top = y + "px";
  }

  // ─── RENDER COMPÁS ───────────────────────────────────────────────────────

  // ─── CAMBIO 45: LYRICS POR COMPÁS EN CHART ─────────────────────────────
  const SECTION_LYRICS_KEY = "s936_section_lyrics_v1";

  function readSectionLyricsStore() {
    try {
      const raw = JSON.parse(localStorage.getItem(SECTION_LYRICS_KEY) || "{}");
      return raw && typeof raw === "object" ? raw : {};
    } catch(_) {
      return {};
    }
  }

  function lyricForBar(sectionKey, barIndex) {
    try {
      const store = readSectionLyricsStore();
      const sec = store[sectionKey] || {};
      const lines = sec.lines || sec.bars || {};
      const beats = sec.beats || {};
      const durations = sec.durations || {};
      const barBeats = beats[String(barIndex)] || beats[barIndex] || null;
      const beatList = [0, 1, 2, 3].map((beat) => String((barBeats && (barBeats[String(beat)] || barBeats[beat])) || "").trim());
      const barDurations = durations[String(barIndex)] || durations[barIndex] || {};
      const durationList = [0, 1, 2, 3].map((beat) => Math.max(1, Math.min(4, Number((barDurations && (barDurations[String(beat)] || barDurations[beat])) || 1))));
      const text = String(lines[String(barIndex)] || lines[barIndex] || beatList.filter(Boolean).join(" ") || "").trim();
      return { text, beats: beatList, durations: durationList };
    } catch(_) {
      return { text: "", beats: ["", "", "", ""], durations: [1,1,1,1] };
    }
  }


  function buildLyricElement(sectionKey, barIndex) {
    const lyricData = lyricForBar(sectionKey, barIndex);
    if (!lyricData || !lyricData.text) return null;
    const lyricEl = document.createElement("div");
    lyricEl.className = "s936-ch-lyric-line";
    lyricEl.title = lyricData.text;
    const hasBeatLyrics = Array.isArray(lyricData.beats) && lyricData.beats.some(Boolean);
    if (hasBeatLyrics) {
      const grid = document.createElement("div");
      grid.className = "s936-ch-lyric-beats";

      // Cambio 52: si una palabra dura varios tiempos (2T/3T/4T), los tiempos que
      // cubre deben "pertenecer" a esa palabra para el resaltado tipo karaoke,
      // igual que el acorde sostenido ya hace con activeChordInBar.
      let ownerBeat = null;
      let ownerDur = 0;
      const owners = [0, 1, 2, 3].map((beat) => {
        const val = String(lyricData.beats[beat] || "").trim();
        if (val) {
          ownerBeat = beat;
          ownerDur = Math.max(1, Math.min(4, Number(lyricData.durations?.[beat] || 1)));
        }
        const withinSustain = ownerBeat !== null && (beat - ownerBeat) < ownerDur;
        return withinSustain ? ownerBeat : beat;
      });

      [0, 1, 2, 3].forEach((beat) => {
        const span = document.createElement("span");
        const value = String(lyricData.beats[beat] || "").trim();
        const dur = Math.max(1, Math.min(4, Number(lyricData.durations?.[beat] || 1)));
        span.className = "s936-ch-lyric-beat" + (value ? " has-text" : "") + (dur > 1 ? " is-long" : "");
        span.dataset.dur = dur > 1 ? (dur + "T") : "";
        // Cambio 51: coordenadas del tiempo para poder resaltar esta palabra exacta durante Play (karaoke).
        span.dataset.section = sectionKey;
        span.dataset.bar = String(barIndex);
        span.dataset.beat = String(beat);
        // Cambio 52: a qué tiempo "pertenece" este beat para el resaltado (sostenido de palabra).
        span.dataset.owner = String(owners[beat]);
        span.textContent = value;
        grid.appendChild(span);
      });
      lyricEl.appendChild(grid);
    } else {
      lyricEl.textContent = lyricData.text;
    }
    return lyricEl;
  }



  function renderBar({ barIndex, sectionKey, beatsData, rhythmData, barInfo, inst, voicingLibrary, onRerender, navMarks }) {
    const bar = document.createElement("div");
    bar.className = "s936-ch-bar" + (barIndex === 0 ? " s936-cb-open" : "");
    bar.dataset.section = sectionKey;
    bar.dataset.bar = barIndex;

    const head = document.createElement("div");
    head.className = "s936-ch-bar-head";
    head.title = "Cambio 26: clic para práctica local de este compás.";
    head.tabIndex = 0;
    head.addEventListener("click", (event) => {
      event.stopPropagation();
      showBarContextMenu(event, { sectionKey, barIndex, onRerender });
    });
    head.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        showBarContextMenu(event, { sectionKey, barIndex, onRerender });
      }
    });
    const num = document.createElement("span");
    num.className = "s936-ch-num";
    num.textContent = barIndex + 1;
    head.appendChild(num);

    if (Array.isArray(navMarks) && navMarks.length) {
      bar.classList.add("has-nav");
      navMarks.forEach((mark) => {
        if (mark?.type) bar.classList.add("nav-" + String(mark.type));
      });
      head.appendChild(renderNavigationBadges(navMarks));
    }

    const fig = document.createElement("span");
    fig.className = "s936-ch-bar-fig s936-ch-bar-note-trigger";
    fig.title = "Práctica del compás";
    fig.innerHTML = noteSVG(rhythmFig(barInfo?.totalBars || 1)) || "♪";
    head.appendChild(fig);
    bar.appendChild(head);

    const hasExplicitBeatInBar = [0, 1, 2, 3].some((b) => {
      const key = barIndex + "_" + b;
      return !!beatsData[key] || !!rhythmData[key];
    });

    // Cambio 10: si este compás solo continúa exactamente el compás/acorde anterior,
    // mostrar % limpio en lugar de repetir cuatro mapas iguales.
    if (barInfo?.chord && !barInfo?.isFirst && !hasExplicitBeatInBar) {
      bar.classList.add("s936-ch-bar-is-repeat");
      const rep = document.createElement("div");
      rep.className = "s936-ch-repeat-bar";
      rep.dataset.section = sectionKey;
      rep.dataset.bar = barIndex;
      rep.dataset.rhythm = "repeat";
      rep.dataset.repeatChord = barInfo.chord?.name || "";
      rep.innerHTML = `<span>%</span><small>Repite compás anterior</small>`;
      rep.onclick = (e) => {
        e.stopPropagation();
        showBeatPop(
          rep,
          "Editar repetición · Compás " + (barIndex + 1),
          barInfo.chord?.name || "",
          inst,
          "repeat",
          (val, voicing, nextRhythm) => {
            saveBeat(sectionKey, barIndex, 0, val);
            saveBeatRhythm(sectionKey, barIndex, 0, val ? "hit" : (nextRhythm || "repeat"));
            repairBarRhythmAfterChordSave(sectionKey, barIndex, 0, val, val ? "hit" : (nextRhythm || "repeat"));
            saveBeatVoicing(sectionKey, barIndex, 0, inst, val ? voicing : null);
            onRerender();
          }
        );
      };
      bar.appendChild(rep);
      // Cambio 52: la letra de un compás % debe vivir en la misma cinta karaoke
      // que el resto de compases (no flotando dentro de la caja %), para que se
      // lea como una sola línea continua.
      const lyricRepeatEl = buildLyricElement(sectionKey, barIndex);
      if (lyricRepeatEl) bar.appendChild(lyricRepeatEl);
      return bar;
    }

    const beatsRow = document.createElement("div");
    beatsRow.className = "s936-ch-beats";

    // Cambio 26:
    // El acorde sostenido debe seguir el último acorde explícito dentro del compás.
    // Ejemplo: beat 1 = C, beat 3 = F → beat 2 sostiene C y beat 4 sostiene F.
    let activeChordInBar = beatsData[barIndex + "_0"] || barInfo?.chord?.name || "";
    for (let b = 0; b < 4; b++) {
      const bKey = barIndex + "_" + b;
      let bVal = beatsData[bKey] || "";

      if (b === 0 && !bVal && barInfo?.isFirst) {
        bVal = barInfo.chord?.name || "";
      }

      const inheritedForThisBeat = bVal ? "" : activeChordInBar;
      const savedRhythm = rhythmData[bKey];
      let rhythmMode = savedRhythm || defaultRhythmForBeat({ beatVal: bVal, beatIndex: b, barInfo });

      if (!savedRhythm && b > 0 && !bVal && inheritedForThisBeat) {
        rhythmMode = "hold";
      }

      beatsRow.appendChild(renderBeat(
        sectionKey, barIndex, b, bVal, inst, voicingLibrary, onRerender, rhythmMode, inheritedForThisBeat
      ));

      if (bVal) {
        activeChordInBar = bVal;
      }
    }
    bar.appendChild(beatsRow);

    const lyricEl = buildLyricElement(sectionKey, barIndex);
    if (lyricEl) bar.appendChild(lyricEl);

    return bar;
  }


  // ─── FALLBACK CAMBIO 3: LEER BORRADOR DE ESTRUCTURA ──────────────────────
  function readStructureDraftSnapshot() {
    try {
      const raw = JSON.parse(localStorage.getItem("s936_suitepro_structure_v4") || "{}");
      const draft = raw?.draft && typeof raw.draft === "object" ? raw.draft : {};
      const parts = Array.isArray(draft.parts) ? draft.parts : [];
      const meta = draft.meta || {};
      if (!parts.length) return null;
      // Cambio 239: verificar si es canción nueva para no generar acordes por defecto
      const mainProject = JSON.parse(localStorage.getItem("studio936ComposerV25SongStructure") || "{}");
      const isNewSong = !!mainProject.isNewSong;
      const arrangement = parts.map((part, idx) => ({
        section: part.section || part.key || ("section" + (idx + 1)),
        label: part.label || part.name || part.section || ("Parte " + (idx + 1)),
        bars: Math.max(1, Number(part.bars) || 4),
        repeat: Math.max(1, Number(part.repeat) || 1),
        navMark: part.navMark || "",
        _source: "structure-draft"
      }));
      const sections = {};
      arrangement.forEach((part) => {
        const sectionKey = part.section;
        const existing = Array.isArray(part.items) ? part.items : null;
        if (existing && existing.length) {
          sections[sectionKey] = existing.map((item) => ({
            name: item.name || item.chord || item.label || "C",
            bars: Math.max(1, Number(item.bars) || 1),
            bass: item.bass || "",
            notes: item.notes || "",
            voicings: item.voicings || {}
          }));
          return;
        }
        sections[sectionKey] = isNewSong ? [] : defaultSectionChordsForChart(sectionKey, part.bars);
      });
      return {
        arrangement,
        edState: {
          title: meta.title || "Borrador de Estructura",
          style: meta.style || "",
          bpm: meta.bpm || "",
          instrument: localStorage.getItem("s936_chart_inst_v1") || "piano",
          sections,
          voicingLibrary: {}
        }
      };
    } catch (error) {
      console.warn("Studio936 Chart fallback draft failed:", error);
      return null;
    }
  }

  function defaultSectionChordsForChart(sectionKey, bars) {
    const key = String(sectionKey || "").toLowerCase();
    let progression;
    if (key.includes("pre")) progression = ["F", "G"];
    else if (key.includes("chorus") || key.includes("coro")) progression = ["C", "G", "Am", "F"];
    else if (key.includes("bridge") || key.includes("puente") || key.includes("solo")) progression = ["Am", "F", "C", "G"];
    else if (key.includes("outro")) progression = ["C"];
    else if (key.includes("intro")) progression = ["C", "G"];
    else progression = ["C", "G", "Am", "F"];

    const totalBars = Math.max(1, Number(bars) || 4);
    const each = Math.max(1, Math.floor(totalBars / progression.length));
    const items = progression.map((name) => ({ name, bars: each }));
    const used = items.reduce((sum, item) => sum + item.bars, 0);
    if (used < totalBars && items.length) items[items.length - 1].bars += (totalBars - used);
    if (used > totalBars && items.length) items[items.length - 1].bars = Math.max(1, items[items.length - 1].bars - (used - totalBars));
    return items;
  }

  // ─── RENDER PRINCIPAL ─────────────────────────────────────────────────────
  function render({ container, instrument, onChordEdit } = {}) {
    if (!container) return;
    installStyles();
    stopChartRhythmConsole({ stopAudio: false, stopBridge: false, preserveResume: true });
    // Cambio 5: si el panel todavía no está pegado al DOM, reintentar un ciclo después.
    if (!container.isConnected && !container.dataset.s936ChartDeferred) {
      container.dataset.s936ChartDeferred = "1";
      setTimeout(() => {
        delete container.dataset.s936ChartDeferred;
        render({ container, instrument, onChordEdit });
      }, 0);
      return;
    }
    container.innerHTML = "";
    // Cambio 32: sin tracker temporal visible en el Chart.
    _activeBarEl = null;
    _activeBeatEl = null;
    _activeLyricWordEl = null; // Cambio 51: limpiar palabra karaoke al re-renderizar

    const inst = normalizeChartInstrumentId(instrument || getMainSelectedChartInstrument() || _chartInstrument || "piano");
    _chartInstrument = inst;
    try { localStorage.setItem("s936_chart_inst_v1", inst); } catch(_) {}
    bindMainInstrumentController(container, onChordEdit);

    const bridge = window.Studio936AppBridge;
    const draftFallback = readStructureDraftSnapshot();

    let arrangement = [];
    let edState = {};
    if (bridge) {
      arrangement = bridge.getArrangement?.() || [];
      edState = bridge.getEditorState?.() || {};
    }

    // Cambio 3: si el bridge todavía no entrega arreglo, usar el borrador vivo de Estructura.
    if (!Array.isArray(arrangement) || !arrangement.length) {
      arrangement = draftFallback?.arrangement || [];
    }
    arrangement = decorateArrangementWithStructureMeta(arrangement);

    // Cambio 29: modo Zoom sección. El panel izquierdo decide la sección;
    // el Chart filtra la hoja electrónica sin duplicar consola.
    const focus = readFocusSection();
    if (focus?.section && Array.isArray(arrangement) && arrangement.length) {
      arrangement = arrangement.filter((item) => item && item.section === focus.section);
    }

    if (!edState || typeof edState !== "object") edState = {};
    if (!edState.sections || !Object.keys(edState.sections || {}).length) {
      edState = Object.assign({}, draftFallback?.edState || {}, edState, {
        sections: edState.sections && Object.keys(edState.sections).length ? edState.sections : (draftFallback?.edState?.sections || {}),
        voicingLibrary: edState.voicingLibrary || draftFallback?.edState?.voicingLibrary || {}
      });
    }

    const sections = edState.sections || {};
    const voicingLibrary = edState.voicingLibrary || {};

    if (!arrangement.length) {
      const p = document.createElement("p");
      p.style.cssText = "color:rgba(255,255,255,.3);padding:32px;text-align:center;font-size:.7rem";
      p.textContent = "Sin arreglo — crea partes en Estructura.";
      container.appendChild(p);
      return;
    }

    const totalBars = arrangement.reduce((acc, item) => {
      return acc + (sections[item.section] || []).reduce((s, c) => s + (Number(c.bars) || 1), 0);
    }, 0);

    const head = document.createElement("div");
    head.className = "s936-ch-head";

    const info = document.createElement("div");
    const titleEl = document.createElement("div");
    titleEl.className = "s936-ch-title";
    titleEl.textContent = edState.title || edState.style || "Canción";
    const metaEl = document.createElement("div");
    metaEl.className = "s936-ch-meta";
    // Cambio 71 (via Structure): versión visible del Chart, para confirmar de
    // un vistazo si el navegador corre esta versión o una anterior en caché.
    metaEl.textContent = (edState.style || "") + (edState.bpm ? " · " + edState.bpm + " BPM" : "") + " · " + totalBars + " comp. · CHART CAMBIO 105";
    const focusNow = readFocusSection();
    if (focusNow?.section) {
      const focusEl = document.createElement("div");
      focusEl.className = "s936-ch-meta focus";
      focusEl.textContent = "Zoom sección: " + (focusNow.label || focusNow.section);
      info.append(titleEl, metaEl, focusEl);
    } else {
      info.append(titleEl, metaEl);
    }

    const instWrap = document.createElement("div");
    instWrap.className = "s936-ch-inst-wrap main-controlled";
    const instBtn = document.createElement("div");
    instBtn.className = "s936-ch-inst-btn main-controlled";
    instBtn.textContent = "Vista: " + chartInstrumentLabel(inst);
    instBtn.title = "Controlado por el selector de instrumento superior del Main.";
    const instHint = document.createElement("small");
    instHint.className = "s936-ch-inst-main-hint";
    instHint.textContent = "Selector superior";
    instWrap.append(instBtn, instHint);

    // Cambio 260 (paso 1): botón para alternar entre la vista de siempre
    // (bloques apilados) y la vista nueva (línea continua, solo lectura
    // por ahora). No reemplaza nada — es una vista alterna, reversible con
    // un clic, sin tocar el camino de código que ya funciona.
    const continuousToggle = document.createElement("button");
    continuousToggle.type = "button";
    continuousToggle.className = "s936-ch-continuous-toggle";
    continuousToggle.textContent = _chartContinuousViewOn ? "Vista: Continua" : "Vista: Bloques";
    continuousToggle.title = "Alternar entre vista de bloques y vista de línea continua (solo lectura por ahora)";
    continuousToggle.onclick = () => {
      _chartContinuousViewOn = !_chartContinuousViewOn;
      if (!_chartContinuousViewOn && _contPlayheadCleanup) {
        try { _contPlayheadCleanup(); } catch(_) {}
        _contPlayheadCleanup = null;
        if (_contPlayheadRAF) { try { cancelAnimationFrame(_contPlayheadRAF); } catch(_) {} _contPlayheadRAF = null; }
      }
      render({ container, instrument, onChordEdit });
    };
    instWrap.appendChild(continuousToggle);

    head.append(info, instWrap);
    container.appendChild(head);

    // Cambio 24: los controles de práctica viven en la Mini consola sesión del panel izquierdo.
    // El Chart queda limpio como partitura/tablatura electrónica; conserva las funciones públicas
    // startChartRhythmConsole/stopChartRhythmConsole para que la consola izquierda las invoque.
    const body = document.createElement("div");
    body.className = "s936-ch-body";
    const sectionBars = getSectionBars();
    const COLS = 4;

    // Cambio 260 (paso 1 — vista continua, solo lectura): interruptor
    // seguro, no toca la lógica del bucle de siempre. Si la vista continua
    // NO está activa, todo sigue exactamente igual que antes.
    function renderContinuousTimelineView(bodyEl) {
      bodyEl.innerHTML = "";
      const scroller = document.createElement("div");
      scroller.className = "s936-ch-cont-scroller";
      scroller.style.position = "relative";

      const SECTION_COLORS = {
        intro: "#5DCAA5", verso: "#AFA9EC", verse: "#AFA9EC",
        prechorus: "#E8C468", "pre-ch": "#E8C468",
        chorus: "#F0997B", coro: "#F0997B",
        bridge: "#7BC3E8", intrl: "#7BC3E8", interlude: "#7BC3E8",
        outro: "#C99CE0"
      };
      const DEFAULT_COLOR = "#8FA3A0";

      // Cambio 261: reloj plano de toda la canción (concatenando todas
      // las secciones en orden) — cada compás guarda su inicio/fin en
      // segundos, calculado con el BPM real, y una referencia a sus
      // celdas de acorde/letra para poder resaltarlas mientras suena.
      const bpm = Number(edState.bpm) > 0 ? Number(edState.bpm) : 95;
      const secondsPerBar = 4 * (60 / bpm); // 4 tiempos por compás
      const flatTimeline = [];
      let cursorSec = 0;
      const sectionAnchors = {}; // sectionKey -> segundo donde empieza esa sección en el reloj plano

      arrangement.forEach(item => {
        let chords = sections[item.section] || [];
        const totalMeasures = sectionBars[item.section]
          || Number(item.bars)
          || chords.reduce((s, c) => s + (Number(c.bars) || 1), 0)
          || 4;
        if (!Array.isArray(chords) || !chords.length) {
          const _mainProj = JSON.parse(localStorage.getItem("studio936ComposerV25SongStructure") || "{}");
          if (!_mainProj.isNewSong) chords = defaultSectionChordsForChart(item.section, totalMeasures);
        }

        const barMap = {};
        let bi = 0;
        chords.forEach(chord => {
          const bars = Math.max(1, Number(chord.bars) || 1);
          for (let k = 0; k < bars; k++) barMap[bi + k] = { chord, isFirst: k === 0 };
          bi += bars;
        });

        const sectionVisualType = String(item.type || item.section || "").toLowerCase();
        const color = SECTION_COLORS[sectionVisualType] || DEFAULT_COLOR;
        sectionAnchors[item.section] = cursorSec;

        const block = document.createElement("div");
        block.className = "s936-ch-cont-block";
        block.style.borderRight = "2px solid " + color;

        const label = document.createElement("div");
        label.className = "s936-ch-cont-label";
        label.style.color = color;
        label.textContent = "● " + (item.label || item.section || "");
        block.appendChild(label);

        const chordRow = document.createElement("div");
        chordRow.className = "s936-ch-cont-row";
        const lyricRow = document.createElement("div");
        lyricRow.className = "s936-ch-cont-row";

        for (let idx = 0; idx < totalMeasures; idx++) {
          const info = barMap[idx];
          const chordVal = info?.isFirst === false ? "" : (info?.chord?.name || "");
          const chordCell = document.createElement("div");
          chordCell.className = "s936-ch-cont-cell chord";
          chordCell.title = "Clic para editar este acorde";

          const nameEl = document.createElement("div");
          nameEl.className = "s936-ch-cont-chordname";
          nameEl.textContent = info?.isFirst === false ? "%" : (chordVal || "—");
          chordCell.appendChild(nameEl);

          // Cambio 260 (paso 2): mini-mapa visual — referencia rápida, no
          // la digitación exacta (eso sigue viviendo en el editor completo
          // al hacer clic). Aquí solo un vistazo, como pediste, "bonito".
          if (chordVal) {
            const mini = document.createElement("div");
            mini.className = "s936-ch-cont-minimap";
            const parsedForMini = parseChord(chordVal);
            const rootIdx = parsedForMini ? (NOTE_NAMES.indexOf(parsedForMini.root) % 5) : 0;
            for (let k = 0; k < 5; k++) {
              const seg = document.createElement("span");
              seg.className = "s936-ch-cont-minimap-seg" + (k === rootIdx || k === (rootIdx + 2) % 5 ? " on" : "");
              mini.appendChild(seg);
            }
            chordCell.appendChild(mini);
          }

          // Cambio 260 (paso 2): clic abre el MISMO editor de siempre
          // (showBeatPop → openVoicingEditor), reutilizando exactamente
          // las mismas funciones de guardado que usa la vista de bloques
          // (saveBeat/saveBeatRhythm/repairBarRhythmAfterChordSave/
          // saveBeatVoicing) — no se creó ningún editor nuevo. Por ahora
          // edita el Tiempo 1 del compás (el caso normal, un acorde por
          // compás); afinar edición por tiempo individual queda para
          // después si hace falta.
          chordCell.addEventListener("click", (e) => {
            e.stopPropagation();
            const sectionKey = item.section;
            const barIndex = idx;
            const beatIndex = 0;
            const label = chordVal ? "Editar acorde" : "Añadir acorde";
            const effectiveRhythm = normalizeRhythmMode(chordVal ? "hit" : "empty");
            const onRerenderCont = () => render({ container, instrument: inst, onChordEdit });
            showBeatPop(
              chordCell,
              label + " · Compás " + (barIndex + 1),
              chordVal,
              inst,
              effectiveRhythm,
              (val, voicing, nextRhythm) => {
                saveBeat(sectionKey, barIndex, beatIndex, val);
                saveBeatRhythm(sectionKey, barIndex, beatIndex, nextRhythm);
                repairBarRhythmAfterChordSave(sectionKey, barIndex, beatIndex, val, nextRhythm);
                saveBeatVoicing(sectionKey, barIndex, beatIndex, inst, val ? voicing : null);
                onRerenderCont();
              },
              previewName => {
                const startName = previewName || chordVal || "";
                if (startName && startName !== chordVal) {
                  saveBeat(sectionKey, barIndex, beatIndex, startName);
                  onRerenderCont();
                }
                setTimeout(() => openVoicingEditor(chordCell, sectionKey, barIndex, beatIndex, startName, inst, onRerenderCont), 0);
              }
            );
          });

          chordRow.appendChild(chordCell);

          const lyricData = lyricForBar(item.section, idx);
          const lyricCell = document.createElement("div");
          lyricCell.className = "s936-ch-cont-cell lyric";
          lyricCell.textContent = lyricData?.text || "";
          lyricRow.appendChild(lyricCell);

          // Cambio 261: registrar este compás en el reloj plano de toda
          // la canción — con esto el péndulo sabe, en cualquier segundo
          // dado, qué celdas resaltar.
          flatTimeline.push({
            sectionKey: item.section,
            barIndex: idx,
            startSec: cursorSec,
            endSec: cursorSec + secondsPerBar,
            chordCellEl: chordCell,
            lyricCellEl: lyricCell
          });
          cursorSec += secondsPerBar;
        }

        block.append(chordRow, lyricRow);
        scroller.appendChild(block);
      });

      bodyEl.appendChild(scroller);

      // Cambio 261: péndulo + karaoke (a nivel de compás, no de palabra —
      // esta vista muestra un cuadro por compás, no por tiempo/palabra
      // individual como Ly Letra; ese detalle más fino se pierde aquí a
      // propósito, por el diseño compacto).
      const playhead = document.createElement("div");
      playhead.className = "s936-ch-cont-playhead";
      playhead.style.display = "none";
      scroller.appendChild(playhead);

      // Limpiar cualquier oyente/animación de una vista continua anterior
      // antes de crear la nueva — evita que se acumulen oyentes duplicados
      // cada vez que se vuelve a renderizar.
      if (_contPlayheadCleanup) { try { _contPlayheadCleanup(); } catch(_) {} }
      if (_contPlayheadRAF) { try { cancelAnimationFrame(_contPlayheadRAF); } catch(_) {} _contPlayheadRAF = null; }

      let activeChordEl = null;
      let activeLyricEl = null;
      function clearHighlight() {
        if (activeChordEl) { activeChordEl.classList.remove("is-playing"); activeChordEl = null; }
        if (activeLyricEl) { activeLyricEl.classList.remove("is-playing"); activeLyricEl = null; }
      }

      function tick(anchorSec, wallStart) {
        const ctx = window.__studio936AudioCtx;
        const nowSec = ctx ? ctx.currentTime : (Date.now() / 1000);
        const elapsed = nowSec - wallStart;
        const posSec = anchorSec + elapsed;
        const bar = flatTimeline.find(b => posSec >= b.startSec && posSec < b.endSec);
        if (bar) {
          playhead.style.display = "block";
          const left = bar.chordCellEl.offsetLeft;
          playhead.style.transform = "translateX(" + left + "px)";
          if (bar.chordCellEl !== activeChordEl) {
            clearHighlight();
            activeChordEl = bar.chordCellEl;
            activeLyricEl = bar.lyricCellEl;
            activeChordEl.classList.add("is-playing");
            activeLyricEl.classList.add("is-playing");
            // Mantener el péndulo visible dentro del scroll horizontal.
            const scRect = scroller.getBoundingClientRect();
            const cellRect = bar.chordCellEl.getBoundingClientRect();
            if (cellRect.left < scRect.left || cellRect.right > scRect.right) {
              scroller.scrollTo({ left: left - 40, behavior: "smooth" });
            }
          }
          _contPlayheadRAF = requestAnimationFrame(() => tick(anchorSec, wallStart));
        } else {
          // Se acabó el reloj plano (llegó al final de la canción) — se
          // detiene solo, sin esperar el evento de stop.
          playhead.style.display = "none";
          clearHighlight();
          _contPlayheadRAF = null;
        }
      }

      function onPracticeStart(ev) {
        // Cambio 261 (diagnóstico temporal): confirmar en pantalla si este
        // evento realmente llega, en vez de seguir adivinando a ciegas.
        try {
          if (window.s936CloudToast) {
            window.s936CloudToast('🔍 Péndulo: evento de Play recibido (sección: ' + (ev?.detail?.section || '?') + ', scope: ' + (ev?.detail?.scope || '?') + ')', true);
          } else {
            console.log('[Péndulo] chart-practice-start recibido', ev?.detail);
          }
        } catch(_) {}
        const ctx = window.__studio936AudioCtx;
        const wallStart = ctx ? ctx.currentTime : (Date.now() / 1000);
        const scope = ev?.detail?.scope;
        const sectionKey = ev?.detail?.section;
        const anchorSec = (scope === "section" && sectionKey && sectionAnchors[sectionKey] != null)
          ? sectionAnchors[sectionKey]
          : 0;
        if (_contPlayheadRAF) cancelAnimationFrame(_contPlayheadRAF);
        tick(anchorSec, wallStart);
      }

      function onPracticeStop() {
        if (_contPlayheadRAF) { cancelAnimationFrame(_contPlayheadRAF); _contPlayheadRAF = null; }
        playhead.style.display = "none";
        clearHighlight();
      }

      window.addEventListener("studio936:chart-practice-start", onPracticeStart);
      window.addEventListener("studio936:chart-practice-stop", onPracticeStop);
      _contPlayheadCleanup = () => {
        window.removeEventListener("studio936:chart-practice-start", onPracticeStart);
        window.removeEventListener("studio936:chart-practice-stop", onPracticeStop);
      };
    }

    if (_chartContinuousViewOn) {
      renderContinuousTimelineView(body);
    } else {
    arrangement.forEach(item => {
      let chords = sections[item.section] || [];
      const totalMeasures = sectionBars[item.section]
        || Number(item.bars)
        || chords.reduce((s, c) => s + (Number(c.bars) || 1), 0)
        || 4;
      if (!Array.isArray(chords) || !chords.length) {
        // Cambio 239: no generar acordes por defecto en canciones nuevas
        const _mainProj = JSON.parse(localStorage.getItem("studio936ComposerV25SongStructure") || "{}");
        if(!_mainProj.isNewSong) chords = defaultSectionChordsForChart(item.section, totalMeasures);
      }

      prepopulate(item.section, chords);
      let beatsData = getBeatsData(item.section);
      const rhythmData = getRhythmData(item.section);

      if (Object.keys(beatsData).length === 0 && chords.length > 0) {
        beatsData = {};
        chords.forEach((chord, idx) => {
          const bars = Math.max(1, Number(chord.bars) || 1);
          beatsData[idx + "_0"] = chord.name || "";
        });
        try {
          const d = JSON.parse(localStorage.getItem("s936_chart_beats_v1") || "{}");
          d[item.section] = beatsData;
          localStorage.setItem("s936_chart_beats_v1", JSON.stringify(d));
        } catch(_) {}
      }

      const barMap = {};
      let bi = 0;
      chords.forEach(chord => {
        const bars = Math.max(1, Number(chord.bars) || 1);
        for (let k = 0; k < bars; k++) {
          barMap[bi + k] = { chord, totalBars: bars, isFirst: k === 0 };
        }
        bi += bars;
      });

      const sec = document.createElement("div");
      sec.className = "s936-ch-sec";
      const sectionVisualType = String(item.type || item.section || "").toLowerCase();
      sec.dataset.partType = sectionVisualType;

      const hd = document.createElement("div");
      hd.className = "s936-ch-sec-hd";
      const badge = document.createElement("span");
      badge.className = "s936-ch-sec-badge";
      badge.dataset.partType = sectionVisualType;
      badge.textContent = item.label || item.section;
      if (Math.max(1, Number(item.repeat) || 1) > 1) {
        const repeatBadge = document.createElement("span");
        repeatBadge.className = "s936-ch-sec-repeat-badge";
        repeatBadge.textContent = "x" + Math.max(1, Number(item.repeat) || 1);
        repeatBadge.title = "Esta sección se repite " + Math.max(1, Number(item.repeat) || 1) + " veces";
        hd.appendChild(repeatBadge);
      }
      const navLabel = sectionNavLabel(item.navMark);
      if (navLabel) {
        const navBadge = document.createElement("span");
        navBadge.className = "s936-ch-sec-navmark-badge";
        navBadge.textContent = navLabel;
        navBadge.title = "Marca de navegación definida en Editar parte";
        hd.appendChild(navBadge);
      }
      const sinfo = document.createElement("span");
      sinfo.className = "s936-ch-sec-info";
      sinfo.textContent = chords.length + " acordes · " + totalMeasures + " comp.";
      hd.append(badge, sinfo);
      sec.appendChild(hd);

      const secMarks = sectionMarks(item.section);
      if (secMarks.length) {
        const navLine = document.createElement("div");
        navLine.className = "s936-ch-section-navline";
        secMarks
          .slice()
          .sort((a, b) => Number(a.bar || 0) - Number(b.bar || 0))
          .forEach((mark) => {
            const info = navInfo(mark.type);
            const badgeMark = document.createElement("span");
            badgeMark.className = "s936-ch-nav-badge " + (info.cls || "");
            badgeMark.textContent = formatNavigationMark(mark);
            navLine.appendChild(badgeMark);
          });
        sec.appendChild(navLine);
      }

      const onRerender = () => render({ container, instrument: inst, onChordEdit });

      for (let i = 0; i < totalMeasures; i += COLS) {
        const line = document.createElement("div");
        line.className = "s936-ch-line";

        for (let j = 0; j < COLS; j++) {
          const barIndex = i + j;
          if (barIndex >= totalMeasures) {
            const empty = document.createElement("div");
            empty.style.cssText = "border-right:1px solid rgba(255,255,255,.07);min-height:110px";
            line.appendChild(empty);
            continue;
          }
          const barInfo = barMap[barIndex];
          const barEl = renderBar({
            barIndex,
            sectionKey: item.section,
            beatsData,
            rhythmData,
            barInfo,
            inst,
            voicingLibrary,
            onRerender,
            navMarks: marksForBar(item.section, barIndex)
          });
          line.appendChild(barEl);
        }
        sec.appendChild(line);
      }

      sec.appendChild(Object.assign(document.createElement("div"), { className: "s936-ch-dblbar" }));
      // Cambio 258: gancho mínimo — todo el dibujo real de la línea de
      // pistas vive en suite-pro-track-recorder.js (módulo aparte), este
      // archivo no gana lógica nueva, solo avisa "aquí termina la sección,
      // dibuja lo tuyo si quieres". Envuelto en try/catch: si ese módulo no
      // está cargado o falla, el Chart sigue funcionando exactamente igual.
      try { window.Studio936TrackRecorder?.renderSectionLanes?.(sec, item.section); } catch(_) {}
      body.appendChild(sec);
    });
    }

    container.appendChild(body);
    container.addEventListener("click", () => closePopups());

    // Cambio 102: si el redibujado apagó una sesión de práctica que estaba
    // activa (ej. el usuario cambió de instrumento mientras sonaba), la
    // retomamos automáticamente sobre el nuevo contenido ya renderizado —
    // antes esto dejaba el reproductor "frenado" en silencio, sin avisar.
    if (_lastPracticeStartOptions) {
      const resumeOptions = _lastPracticeStartOptions;
      setTimeout(() => { startChartRhythmConsole(container, resumeOptions); }, 0);
    }

    return { ok: true, version: VERSION };
  }

  // ─── HIGHLIGHT PLAYBACK ──────────────────────────────────────────────────

  // Cambio 51: resalta únicamente la palabra de letra que corresponde al tiempo activo,
  // tipo karaoke. Reutiliza las mismas coordenadas (sección/compás/tiempo) que ya usa
  // el resaltado de acordes; no agrega motor de audio nuevo.
  function syncActiveLyricWord(sectionKey, barIndex, beatIndex) {
    if (_activeLyricWordEl) {
      _activeLyricWordEl.classList.remove("active-word");
      _activeLyricWordEl = null;
    }
    if (sectionKey == null || barIndex == null || beatIndex == null) return;

    // Cambio 52: si el tiempo activo cae dentro de una palabra sostenida (2T/3T/4T),
    // hay que resaltar la celda "dueña" (donde vive el texto), no la celda vacía actual.
    const beatSelector = `.s936-ch-lyric-beat[data-section="${sectionKey}"][data-bar="${barIndex}"][data-beat="${beatIndex}"]`;
    const beatSpan = document.querySelector(beatSelector);
    const ownerBeat = beatSpan ? (beatSpan.dataset.owner ?? beatIndex) : beatIndex;

    const ownerSelector = `.s936-ch-lyric-beat[data-section="${sectionKey}"][data-bar="${barIndex}"][data-beat="${ownerBeat}"]`;
    const wordEl = document.querySelector(ownerSelector);
    if (wordEl) {
      wordEl.classList.add("active-word");
      _activeLyricWordEl = wordEl;
    }
  }

  function highlightBeat(sectionKey, barIndex, beatIndex) {
    if (_activeBeatEl) {
      _activeBeatEl.classList.remove("active-beat");
    }
    if (_activeBarEl) {
      _activeBarEl.classList.remove("s936-cb-active");
    }

    const selector = `.s936-ch-beat[data-section="${sectionKey}"][data-bar="${barIndex}"][data-beat="${beatIndex}"]`;
    const beatEl = document.querySelector(selector);
    
    if (beatEl) {
      beatEl.classList.add("active-beat");
      _activeBeatEl = beatEl;
      
      const barEl = beatEl.closest(".s936-ch-bar");
      if (barEl) {
        barEl.classList.add("s936-cb-active");
        _activeBarEl = barEl;
        barEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }

    syncActiveLyricWord(sectionKey, barIndex, beatIndex);
  }

  function highlightBar(sectionKey, barIndex) {
    if (_activeBarEl) _activeBarEl.classList.remove("s936-cb-active");
    const el = document.querySelector(`.s936-ch-bar[data-section="${sectionKey}"][data-bar="${barIndex}"]`);
    if (el) {
      el.classList.add("s936-cb-active");
      _activeBarEl = el;
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  // ─── PLAYBACK SYNC ──────────────────────────────────────────────────────
  function startPlaybackSync() {
    if (_playbackInterval) {
      clearInterval(_playbackInterval);
      _playbackInterval = null;
    }
    
    const player = window.Studio936Player || window.player || window._player;
    if (!player) {
      console.warn("Studio936: Player no encontrado para sync");
      return;
    }
    
    try {
      const pos = player.getCurrentPosition?.();
      if (pos) {
        _currentPlaybackPos = pos;
        const { section, bar, beat } = pos;
        if (section && bar !== undefined && beat !== undefined) {
          highlightBeat(section, bar, beat);
        }
      }
    } catch(e) {}
    
    _playbackInterval = setInterval(() => {
      try {
        const pos = player.getCurrentPosition?.();
        if (pos) {
          const { section, bar, beat } = pos;
          if (section && bar !== undefined && beat !== undefined) {
            if (!_currentPlaybackPos || 
                _currentPlaybackPos.section !== section ||
                _currentPlaybackPos.bar !== bar ||
                _currentPlaybackPos.beat !== beat) {
              _currentPlaybackPos = pos;
              highlightBeat(section, bar, beat);
            }
          }
        }
      } catch(e) {}
    }, 150);
  }

  function stopPlaybackSync() {
    if (_playbackInterval) {
      clearInterval(_playbackInterval);
      _playbackInterval = null;
    }
    _currentPlaybackPos = null;
  }

  // ─── MOUNT / UNMOUNT ─────────────────────────────────────────────────────
  let _savedFretDisplay = null;
  let _savedPianoDisplay = null;
  let _savedMainChildren = null;
  let _savedMainStyle = null;
  let _savedStatusBarState = null;
  let _savedStageSurfaces = null;
  let _chartActive = false;
  let _chartTransportCaptureHandler = null;

  const CHART_STAGE_SURFACE_SELECTORS = [
    "#pianoContainer",
    "#fretboardContainer",
    "#keyboardContainer",
    "#instrumentSurface",
    "#editorInstrumentSurface",
    "#stringSurfaceContainer",
    ".piano-container",
    ".fretboard-container",
    ".keyboard-container",
    ".instrument-surface",
    ".main-instrument-surface",
    ".s936-main-piano",
    ".s936-fretboard",
    ".editor-instrument-surface",
    "[data-s936-surface]"
  ];

  function getActiveChartPanel() {
    return document.getElementById("s936-chart-view-panel");
  }

  function setMainTransportChartState(on) {
    ["playBtn", "playSongBtn"].forEach((id) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.classList.toggle("s936-chart-transport-on", !!on);
      btn.setAttribute("data-s936-chart-controlled", on ? "1" : "0");
    });
  }

  // Cambio 152: el Chart siempre dispara la práctica de canción completa
  // (scope:"song") al interceptar el botón Play principal — por eso, cuando
  // SÍ arranca/detiene esa práctica, hay que usar el mismo par de clases que
  // app.js usa para el modo "canción" (btn-all / btn-all.btn-song-active),
  // así los 4 íconos de imagen (Play Sección, Pause Sección, Play Canción,
  // Pause Canción) cambian correctamente en vez de quedarse pegados en el
  // ícono equivocado o sin ninguno. Deliberadamente separado de
  // setMainTransportChartState(): esa otra función también se llama al
  // simplemente cerrar el panel del Chart (unbind), momento en el que NO se
  // debe tocar el ícono si no hubo un play/stop real.
  function setPlayIconChartState(on) {
    ["playBtn", "playSongBtn"].forEach((id) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.className = on ? "btn btn-all btn-song-active" : "btn btn-all";
    });
  }

  function bindMainTransportToChart() {
    if (_chartTransportCaptureHandler) return;
    _chartTransportCaptureHandler = (event) => {
      if (!_chartActive) return;
      const btn = event.target?.closest?.("#playBtn,#playSongBtn");
      if (!btn) return;

      const panel = getActiveChartPanel();
      if (!panel) return;

      // Cambio 27: cuando el Chart está abierto, los Play superiores disparan
      // la misma práctica de canción completa del Chart. La mini consola izquierda
      // queda para practicar la parte/sección.
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();

      const alreadyOn = !!_chartRhythmTimer;
      // Cambio 28: ambos Play superiores son el mismo mando de canción completa.
      // Si ya está corriendo, cualquiera de los dos detiene; si está detenido, cualquiera arranca.
      if (alreadyOn) {
        stopChartRhythmConsole({ stopAudio: true, stopBridge: true });
        setMainTransportChartState(false);
        setPlayIconChartState(false);
        return;
      }

      const ok = startChartRhythmConsole(panel, {
        withPulse: false,
        scope: "song",
        sourceLabel: "Canción completa"
      });
      setMainTransportChartState(!!ok);
      setPlayIconChartState(!!ok);
    };
    document.addEventListener("click", _chartTransportCaptureHandler, true);
  }

  function unbindMainTransportToChart() {
    if (_chartTransportCaptureHandler) {
      document.removeEventListener("click", _chartTransportCaptureHandler, true);
      _chartTransportCaptureHandler = null;
    }
    setMainTransportChartState(false);
  }

  function startChartSongPractice(container, options = {}) {
    return startChartRhythmConsole(container || getActiveChartPanel(), Object.assign({}, options, { scope: "song" }));
  }

  function startChartSectionPractice(container, section, options = {}) {
    return startChartRhythmConsole(container || getActiveChartPanel(), Object.assign({}, options, {
      scope: "section",
      section: section || getCurrentChartSectionKey()
    }));
  }

  function getCurrentChartSectionKey() {
    try {
      const sel = document.getElementById("sectionSelect");
      if (sel?.value) return sel.value;
    } catch(_) {}
    try {
      const ed = window.Studio936AppBridge?.getEditorState?.();
      if (ed?.section) return ed.section;
      if (ed?.selectedSection) return ed.selectedSection;
    } catch(_) {}
    try {
      const panel = getActiveChartPanel();
      const first = panel?.querySelector?.(".s936-ch-sec") || panel?.querySelector?.(".s936-ch-beat");
      return first?.dataset?.section || "";
    } catch(_) {}
    return "";
  }

  function hideOnlyMainVisualSurfaces(main) {
    const found = new Set();
    CHART_STAGE_SURFACE_SELECTORS.forEach((sel) => {
      try {
        document.querySelectorAll(sel).forEach((el) => {
          if (!el || el.id === "s936-chart-view-panel" || el.closest("#s936-chart-view-panel")) return;
          if (main && !main.contains(el)) return;
          const text = String(el.textContent || "").toLowerCase();
          const idc = String((el.id || "") + " " + (el.className || "")).toLowerCase();
          if (/start groove|escuchar canción|play full song|metronome|metrónomo|solo on|solo off|guardar local|save local/.test(text)) return;
          if (/button|toolbar|controls|transport|topbar/.test(idc) && !/piano|fret|keyboard|surface|string/.test(idc)) return;
          found.add(el);
        });
      } catch(_) {}
    });
    if (!_savedStageSurfaces) {
      _savedStageSurfaces = Array.from(found).map((el) => ({
        el,
        display: el.style.display,
        visibility: el.style.visibility,
        height: el.style.height,
        minHeight: el.style.minHeight,
        maxHeight: el.style.maxHeight,
        overflow: el.style.overflow,
        opacity: el.style.opacity,
        pointerEvents: el.style.pointerEvents
      }));
    }
    (_savedStageSurfaces || []).forEach((item) => {
      const el = item?.el;
      if (!el) return;
      el.classList.add("s936-chart-hidden-surface");
      el.style.display = "none";
      el.style.visibility = "hidden";
      el.style.height = "0px";
      el.style.minHeight = "0px";
      el.style.maxHeight = "0px";
      el.style.overflow = "hidden";
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
    });
  }

  function restoreMainVisualSurfaces() {
    if (!_savedStageSurfaces) return;
    _savedStageSurfaces.forEach((item) => {
      const el = item?.el;
      if (!el) return;
      el.classList.remove("s936-chart-hidden-surface");
      el.style.display = item.display || "";
      el.style.visibility = item.visibility || "";
      el.style.height = item.height || "";
      el.style.minHeight = item.minHeight || "";
      el.style.maxHeight = item.maxHeight || "";
      el.style.overflow = item.overflow || "";
      el.style.opacity = item.opacity || "";
      el.style.pointerEvents = item.pointerEvents || "";
    });
    _savedStageSurfaces = null;
  }

  function mountInRightPanel({ onChordEdit } = {}) {
    const main = document.querySelector("main.main") || document.querySelector("main");
    if (!main) return { ok: false, reason: "main-not-found" };

    try { window.Studio936InstrumentSurfaceManager?.stopObserver?.(); } catch(_) {}

    // Cambio 5: el Chart entra dentro del panel grande derecho real, no dentro del panel izquierdo de Suite Pro.
    const prev = document.getElementById("s936-chart-view-panel");
    if (prev) {
      if (prev._resizeHandler) window.removeEventListener("resize", prev._resizeHandler);
      prev.remove();
    }

    if (!_savedMainStyle) {
      _savedMainStyle = {
        position: main.style.position,
        overflow: main.style.overflow,
        minHeight: main.style.minHeight
      };
    }

    // Cambio 23: NO escondemos los comandos Groove/Play/Metronomo del Main.
    // Solo retiramos visualmente la superficie grande del instrumento para que el Chart sea el escenario.
    document.body?.classList?.add("s936-chart-stage");
    hideOnlyMainVisualSurfaces(main);

    main.style.position = main.style.position || "relative";
    main.style.overflow = "auto";
    main.style.minHeight = main.style.minHeight || "620px";

    const chartEl = document.createElement("div");
    chartEl.id = "s936-chart-view-panel";
    chartEl.className = "s936-chart-main-panel";
    chartEl.style.isolation = "isolate";
    // Cambio 27: colocar el Chart al inicio del escenario main para eliminar
    // la banda visual vacía y subir los compases.
    main.insertBefore(chartEl, main.firstChild);

    const edState = window.Studio936AppBridge?.getEditorState?.() || {};
    render({
      container: chartEl,
      instrument: getMainSelectedChartInstrument() || edState.instrument || _chartInstrument || "piano",
      onChordEdit
    });

    _chartActive = true;
    bindMainTransportToChart();
    setTimeout(startPlaybackSync, 500);

    return { ok: true, version: VERSION, target: "main.main" };
  }

  function unmountFromRightPanel() {
    _chartActive = false;
    _activeBarEl = null;
    _activeBeatEl = null;
    _activeLyricWordEl = null; // Cambio 51
    stopPlaybackSync();
    unbindMainTransportToChart();

    try { window.Studio936InstrumentSurfaceManager?.startObserver?.(); } catch(_) {}

    const chartEl = document.getElementById("s936-chart-view-panel");
    if (chartEl) {
      if (chartEl._resizeHandler) window.removeEventListener("resize", chartEl._resizeHandler);
      chartEl.remove();
    }

    restoreMainVisualSurfaces();

    if (_savedMainChildren) {
      _savedMainChildren.forEach((item) => {
        if (item?.el) {
          item.el.style.display = item.display || "";
          item.el.style.visibility = item.visibility || "";
        }
      });
      _savedMainChildren = null;
    }

    const main = document.querySelector("main.main") || document.querySelector("main");
    if (main && _savedMainStyle) {
      main.style.position = _savedMainStyle.position || "";
      main.style.overflow = _savedMainStyle.overflow || "";
      main.style.minHeight = _savedMainStyle.minHeight || "";
      _savedMainStyle = null;
    }
    document.body?.classList?.remove("s936-chart-stage");

    const fc = document.getElementById("fretboardContainer");
    const pc = document.getElementById("pianoContainer");
    if (fc && _savedFretDisplay !== null) { fc.style.display = _savedFretDisplay; _savedFretDisplay = null; }
    if (pc && _savedPianoDisplay !== null) { pc.style.display = _savedPianoDisplay; _savedPianoDisplay = null; }
  }

  function downloadFile() {
    const content = document.getElementById("s936-chart-view-panel")?.outerHTML || "";
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "studio936-chart.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  window.highlightChartBeat = (section, bar, beat) => {
    const el = document.querySelector(
      `.s936-ch-beat[data-section="${section}"][data-bar="${bar}"][data-beat="${beat}"]`
    );
    if (el) {
      document.querySelectorAll('.s936-ch-beat.active-beat').forEach(b => b.classList.remove('active-beat'));
      el.classList.add('active-beat');
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    // Cambio 51: mismo puente, ahora también resalta la palabra de letra tipo karaoke.
    syncActiveLyricWord(section, bar, beat);
  };


  if (!window.__s936ChartLyricsCambio45Bound) {
    window.__s936ChartLyricsCambio45Bound = true;
    window.addEventListener("studio936:section-lyrics-updated", () => {
      try {
        const panel = document.getElementById("s936-chart-view-panel");
        if (panel) render({ container: panel, instrument: _chartInstrument });
      } catch(_) {}
    });
  }

  // Cambio 72: diagnóstico manual — compara las claves de sección guardadas
  // en localStorage contra las que el Chart está usando AHORA MISMO en
  // pantalla para dibujar los compases. Si no coinciden, ahí está el bug.
  // Se puede llamar desde la consola del navegador escribiendo:
  //   s936DebugLyrics()
  function debugLyrics() {
    const stored = readSectionLyricsStore();
    const domSections = new Set();
    document.querySelectorAll("[data-section]").forEach((el) => {
      if (el.dataset.section) domSections.add(el.dataset.section);
    });
    console.log("%c[S936 DEBUG] Letra guardada en localStorage (por sección):", "color:#0ff;font-weight:bold");
    console.log(stored);
    console.log("%c[S936 DEBUG] Claves de sección que el Chart usa AHORA en pantalla:", "color:#ff0;font-weight:bold");
    console.log(Array.from(domSections));
    console.log("%c[S936 DEBUG] ¿Coincide cada una con datos guardados?", "color:#0f0;font-weight:bold");
    domSections.forEach((sec) => {
      const hasData = !!(stored[sec] && (stored[sec].lines || stored[sec].beats));
      console.log(
        (hasData ? "✅ " : "❌ ") + JSON.stringify(sec) + " → " + (hasData ? "SÍ tiene letra guardada con esta clave exacta" : "NO se encontró letra guardada con esta clave exacta")
      );
    });
    return { stored, domSections: Array.from(domSections) };
  }
  window.s936DebugLyrics = debugLyrics;

  return { 
    version: VERSION, 
    render, 
    mountInRightPanel, 
    unmountFromRightPanel, 
    highlightBar,
    highlightBeat,
    isActive: () => _chartActive,
    downloadFile,
    startPlaybackSync,
    stopPlaybackSync,
    startChartRhythmConsole,
    startChartSongPractice,
    startChartSectionPractice,
    stopChartRhythmConsole,
    setFocusSection,
    clearFocusSection,
    openVoicingEditor,
    debugLyrics
  };
})();