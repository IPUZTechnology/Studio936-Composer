// Studio 936 Composer - Chart View v2.1.1 Cambio 12 (MINI CONSOLA RÍTMICA CON LUZ POR CELDA)
// 🎸 Click en el mástil → pone dedos → detecta acorde automáticamente
// 🎹 Click en teclas del piano → arma acorde → detecta automáticamente
window.Studio936SuiteProChart = (() => {
  "use strict";
  const VERSION = "chart-v2.1.1-cambio-12";
  const STYLE_ID = "s936-chart-v211-cambio12";

  const INSTRUMENTS = [
    { id: "piano",   label: "Piano" },
    { id: "guitar",  label: "Guitarra" },
    { id: "ukulele", label: "Ukulele" },
    { id: "bass",    label: "Bajo" }
  ];

  let _chartInstrument = localStorage.getItem("s936_chart_inst_v1") || "piano";
  let _activeBeatEl = null;
  let _activeBarEl = null;
  let _playbackInterval = null;
  let _currentPlaybackPos = null;

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

  // ─── CAMBIO 12: MINI CONSOLA RÍTMICA DEL CHART ─────────────────────────
  let _chartRhythmTimer = null;
  let _chartRhythmSteps = [];
  let _chartRhythmIndex = 0;
  let _chartRhythmPulse = false;
  let _chartActiveStepEl = null;

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
    const ctx = getPopupAudioCtx();
    if (!ctx || !Number.isFinite(Number(midi))) return;
    const now = ctx.currentTime;
    const start = now + Math.max(0, Number(startOffset) || 0);
    const dur = Math.max(0.05, Number(duration) || 0.22);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(midiToFreq(midi), start);
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
    const ctx = getPopupAudioCtx();
    if (!ctx) return;
    const strong = (Number(step) || 0) % 4 === 0;
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
      "#tempoInput", "#bpmInput", "[data-bpm]", ".tempo-value", ".bpm-value"
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      const b = valid(el?.value || el?.textContent || el?.dataset?.bpm);
      if (b) return b;
    }
    return 95;
  }

  function schedulePopupRhythmHit(midis, bpm, withPercussion = false) {
    const notes = normalizePopupMidis(midis);
    if (!notes.length) return;
    const beatMs = Math.max(180, Math.round(60000 / (Number(bpm) || 95)));
    const gain = notes.length > 5 ? 0.034 : 0.046;
    notes.forEach(m => schedulePopupTone(m, 0, Math.min(0.38, beatMs / 1000 * 0.62), gain));
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

  function clearChartStepLight() {
    if (_chartActiveStepEl) {
      _chartActiveStepEl.classList.remove(
        "chart-step-active",
        "chart-step-hit",
        "chart-step-hold",
        "chart-step-rest",
        "chart-step-repeat"
      );
      _chartActiveStepEl = null;
    }
  }

  function setChartStepLight(el, rhythmMode) {
    clearChartStepLight();
    if (!el) return;
    const mode = normalizeRhythmMode(rhythmMode || "hit");
    el.classList.add("chart-step-active", "chart-step-" + mode);
    _chartActiveStepEl = el;
    try { el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" }); } catch(_) {}
  }

  function stopChartRhythmConsole({ stopAudio = true } = {}) {
    if (_chartRhythmTimer) {
      clearInterval(_chartRhythmTimer);
      _chartRhythmTimer = null;
    }
    _chartRhythmSteps = [];
    _chartRhythmIndex = 0;
    clearChartStepLight();
    document.querySelectorAll(".s936-ch-console-btn.playing").forEach(btn => btn.classList.remove("playing"));
    document.querySelectorAll(".s936-ch-console-status").forEach(el => {
      el.textContent = "Detenido";
      el.classList.remove("on");
    });
    if (stopAudio) stopChartPopupAudio();
  }

  function chordToChartMidis(chordName) {
    return chordNameToPreviewMidis(chordName);
  }

  function collectChartRhythmSteps(container) {
    const root = container || document;
    const nodes = Array.from(root.querySelectorAll(".s936-ch-beat, .s936-ch-repeat-bar"));
    const steps = [];
    let lastChord = "";

    nodes.forEach((el) => {
      if (el.classList.contains("s936-ch-repeat-bar")) {
        const chord = el.dataset.repeatChord || lastChord || "";
        if (chord) lastChord = chord;
        [0, 1, 2, 3].forEach((beat) => {
          steps.push({
            el,
            chord,
            rhythm: beat === 0 ? "repeat" : "hold",
            label: "% " + (beat + 1)
          });
        });
        return;
      }

      const mode = normalizeRhythmMode(el.dataset.rhythm || "hit");
      let chord = el.dataset.chord || "";
      if (chord) lastChord = chord;
      if (!chord && (mode === "hold" || mode === "repeat")) chord = lastChord;
      steps.push({
        el,
        chord,
        rhythm: mode,
        label: (Number(el.dataset.bar) + 1) + "." + (Number(el.dataset.beat) + 1)
      });
    });

    return steps;
  }

  function startChartRhythmConsole(container, { withPulse = false } = {}) {
    stopChartRhythmConsole({ stopAudio: true });
    _chartRhythmSteps = collectChartRhythmSteps(container);
    if (!_chartRhythmSteps.length) return false;

    _chartRhythmPulse = !!withPulse;
    _chartRhythmIndex = 0;

    const runStep = () => {
      if (!_chartRhythmSteps.length) return;
      const step = _chartRhythmSteps[_chartRhythmIndex % _chartRhythmSteps.length];
      _chartRhythmIndex += 1;

      const mode = normalizeRhythmMode(step.rhythm || "hit");
      setChartStepLight(step.el, mode);

      if (_chartRhythmPulse) {
        schedulePopupPercussion(_chartRhythmIndex - 1, 0);
      }

      if (mode === "hit" || mode === "repeat") {
        const midis = chordToChartMidis(step.chord);
        if (midis.length) schedulePopupRhythmHit(midis, getCurrentChartBpm(), false);
      }

      const status = container?.querySelector?.(".s936-ch-console-status");
      if (status) {
        status.textContent = "Corriendo · " + (step.label || "beat") + (step.chord ? " · " + step.chord : "");
        status.classList.add("on");
      }
    };

    runStep();
    const beatMs = Math.max(180, Math.round(60000 / getCurrentChartBpm()));
    _chartRhythmTimer = setInterval(runStep, beatMs);
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
  min-height:calc(100vh - 205px);
  max-height:calc(100vh - 145px);
  overflow:auto;
  background:#090b11;
  border-top:1px solid rgba(0,255,204,.16);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.04);
}

.s936-ch-head{
  display:flex;align-items:center;justify-content:space-between;
  padding:8px 14px 7px;border-bottom:1px solid rgba(255,255,255,.08);
  background:#0d0f18;position:sticky;top:0;z-index:10;gap:10px
}
.s936-ch-title{font-size:.72rem;font-weight:900;color:#00ffcc;text-transform:uppercase;letter-spacing:.8px}
.s936-ch-meta{font-size:.5rem;color:rgba(255,255,255,.35);margin-top:1px}

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
    const effectiveRhythm = normalizeRhythmMode(rhythmMode || (beatVal ? "hit" : "empty"));
    const rInfo = rhythmInfo(effectiveRhythm);
    const cell = document.createElement("div");
    cell.className = "s936-ch-beat" + (parsed ? " has-chord" : "") + " rhythm-" + rInfo.className;
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

  // ─── RENDER COMPÁS ───────────────────────────────────────────────────────
  function renderBar({ barIndex, sectionKey, beatsData, rhythmData, barInfo, inst, voicingLibrary, onRerender }) {
    const bar = document.createElement("div");
    bar.className = "s936-ch-bar" + (barIndex === 0 ? " s936-cb-open" : "");
    bar.dataset.section = sectionKey;
    bar.dataset.bar = barIndex;

    const head = document.createElement("div");
    head.className = "s936-ch-bar-head";
    const num = document.createElement("span");
    num.className = "s936-ch-num";
    num.textContent = barIndex + 1;
    head.appendChild(num);

    if (barInfo?.isFirst && barInfo?.chord) {
      const fig = document.createElement("span");
      fig.className = "s936-ch-bar-fig";
      fig.innerHTML = noteSVG(rhythmFig(barInfo.totalBars));
      head.appendChild(fig);
    }
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
      return bar;
    }

    const beatsRow = document.createElement("div");
    beatsRow.className = "s936-ch-beats";

    const explicitFirstChord = beatsData[barIndex + "_0"] || "";
    const inheritedChord = explicitFirstChord || barInfo?.chord?.name || "";
    for (let b = 0; b < 4; b++) {
      const bKey = barIndex + "_" + b;
      let bVal = beatsData[bKey] || "";

      if (b === 0 && !bVal && barInfo?.isFirst) {
        bVal = barInfo.chord?.name || "";
      }

      const savedRhythm = rhythmData[bKey];
      let rhythmMode = savedRhythm || defaultRhythmForBeat({ beatVal: bVal, beatIndex: b, barInfo });
      if (!savedRhythm && explicitFirstChord && b > 0 && !bVal) {
        rhythmMode = "hold";
      }

      beatsRow.appendChild(renderBeat(
        sectionKey, barIndex, b, bVal, inst, voicingLibrary, onRerender, rhythmMode, inheritedChord
      ));
    }
    bar.appendChild(beatsRow);

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
      const arrangement = parts.map((part, idx) => ({
        section: part.section || part.key || ("section" + (idx + 1)),
        label: part.label || part.name || part.section || ("Parte " + (idx + 1)),
        bars: Math.max(1, Number(part.bars) || 4),
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
        sections[sectionKey] = defaultSectionChordsForChart(sectionKey, part.bars);
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
    stopChartRhythmConsole({ stopAudio: false });
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
    const changeBanner = document.createElement("div");
    changeBanner.className = "s936-ch-change-banner";
    changeBanner.textContent = "Cambio número 12 · Mini consola rítmica ilumina el Chart";
    container.appendChild(changeBanner);
    _activeBarEl = null;
    _activeBeatEl = null;

    const inst = instrument || _chartInstrument || "piano";
    _chartInstrument = inst;

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
    metaEl.textContent = (edState.style || "") + (edState.bpm ? " · " + edState.bpm + " BPM" : "") + " · " + totalBars + " comp.";
    info.append(titleEl, metaEl);

    const instWrap = document.createElement("div");
    instWrap.className = "s936-ch-inst-wrap";
    const instBtn = document.createElement("button");
    instBtn.className = "s936-ch-inst-btn";
    instBtn.textContent = INSTRUMENTS.find(i => i.id === inst)?.label || inst.toUpperCase();
    const instMenu = document.createElement("div");
    instMenu.className = "s936-ch-inst-menu";
    INSTRUMENTS.forEach(({ id, label }) => {
      const opt = document.createElement("button");
      opt.className = "s936-ch-inst-opt" + (id === inst ? " active" : "");
      opt.textContent = label;
      opt.onclick = (e) => {
        e.stopPropagation();
        _chartInstrument = id;
        localStorage.setItem("s936_chart_inst_v1", id);
        instMenu.classList.remove("open");
        render({ container, instrument: id, onChordEdit });
      };
      instMenu.appendChild(opt);
    });
    instBtn.onclick = (e) => { e.stopPropagation(); instMenu.classList.toggle("open"); };
    document.addEventListener("click", () => instMenu.classList.remove("open"), { once: false });
    instWrap.append(instBtn, instMenu);
    head.append(info, instWrap);
    container.appendChild(head);

    // Cambio 12: mini consola ligera para recorrer el Chart al BPM e iluminar cada celda.
    let consolePulseOn = false;
    const miniConsole = document.createElement("div");
    miniConsole.className = "s936-ch-console";
    const consoleTitle = document.createElement("div");
    consoleTitle.className = "s936-ch-console-title";
    consoleTitle.textContent = "🎛 Mini consola ritmo";
    const playChartBtn = document.createElement("button");
    playChartBtn.className = "s936-ch-console-btn";
    playChartBtn.textContent = "▶ Recorrer Chart";
    playChartBtn.title = "Reproduce el Chart al BPM e ilumina cada celda.";
    const pulseChartBtn = document.createElement("button");
    pulseChartBtn.className = "s936-ch-console-btn";
    pulseChartBtn.textContent = "🥁 Pulso OFF";
    pulseChartBtn.title = "Agrega un pulso ligero al recorrido del Chart.";
    const stopChartBtn = document.createElement("button");
    stopChartBtn.className = "s936-ch-console-btn stop";
    stopChartBtn.textContent = "■ Stop";
    const consoleStatus = document.createElement("span");
    consoleStatus.className = "s936-ch-console-status";
    consoleStatus.textContent = "Detenido";

    playChartBtn.onclick = (e) => {
      e.stopPropagation();
      const ok = startChartRhythmConsole(container, { withPulse: consolePulseOn });
      if (ok) {
        playChartBtn.classList.add("playing");
        consoleStatus.textContent = "Corriendo";
        consoleStatus.classList.add("on");
      }
    };
    pulseChartBtn.onclick = (e) => {
      e.stopPropagation();
      consolePulseOn = !consolePulseOn;
      pulseChartBtn.classList.toggle("active", consolePulseOn);
      pulseChartBtn.textContent = consolePulseOn ? "🥁 Pulso ON" : "🥁 Pulso OFF";
      if (_chartRhythmTimer) {
        startChartRhythmConsole(container, { withPulse: consolePulseOn });
        playChartBtn.classList.add("playing");
      }
    };
    stopChartBtn.onclick = (e) => {
      e.stopPropagation();
      stopChartRhythmConsole({ stopAudio: true });
      playChartBtn.classList.remove("playing");
      consoleStatus.textContent = "Detenido";
      consoleStatus.classList.remove("on");
    };

    miniConsole.append(consoleTitle, playChartBtn, pulseChartBtn, stopChartBtn, consoleStatus);
    container.appendChild(miniConsole);

    const body = document.createElement("div");
    body.className = "s936-ch-body";
    const sectionBars = getSectionBars();
    const COLS = 4;

    arrangement.forEach(item => {
      let chords = sections[item.section] || [];
      const totalMeasures = sectionBars[item.section]
        || Number(item.bars)
        || chords.reduce((s, c) => s + (Number(c.bars) || 1), 0)
        || 4;
      if (!Array.isArray(chords) || !chords.length) {
        chords = defaultSectionChordsForChart(item.section, totalMeasures);
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

      const hd = document.createElement("div");
      hd.className = "s936-ch-sec-hd";
      const badge = document.createElement("span");
      badge.className = "s936-ch-sec-badge";
      badge.textContent = item.label || item.section;
      const sinfo = document.createElement("span");
      sinfo.className = "s936-ch-sec-info";
      sinfo.textContent = chords.length + " acordes · " + totalMeasures + " comp.";
      hd.append(badge, sinfo);
      sec.appendChild(hd);

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
            onRerender
          });
          line.appendChild(barEl);
        }
        sec.appendChild(line);
      }

      sec.appendChild(Object.assign(document.createElement("div"), { className: "s936-ch-dblbar" }));
      body.appendChild(sec);
    });

    container.appendChild(body);
    container.addEventListener("click", () => closePopups());
    return { ok: true, version: VERSION };
  }

  // ─── HIGHLIGHT PLAYBACK ──────────────────────────────────────────────────
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
  let _chartActive = false;

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

    if (!_savedMainChildren) {
      _savedMainChildren = Array.from(main.children)
        .filter((el) => el && el.id !== "s936-chart-view-panel")
        .map((el) => ({
          el,
          display: el.style.display,
          visibility: el.style.visibility
        }));
      _savedMainStyle = {
        position: main.style.position,
        overflow: main.style.overflow,
        minHeight: main.style.minHeight
      };
    }

    _savedMainChildren.forEach((item) => {
      if (item?.el) {
        item.el.style.display = "none";
        item.el.style.visibility = "hidden";
      }
    });

    main.style.position = main.style.position || "relative";
    main.style.overflow = "auto";
    main.style.minHeight = main.style.minHeight || "620px";

    const chartEl = document.createElement("div");
    chartEl.id = "s936-chart-view-panel";
    chartEl.className = "s936-chart-main-panel";
    chartEl.style.isolation = "isolate";
    main.appendChild(chartEl);

    const edState = window.Studio936AppBridge?.getEditorState?.() || {};
    render({
      container: chartEl,
      instrument: _chartInstrument || edState.instrument || "piano",
      onChordEdit
    });

    _chartActive = true;
    setTimeout(startPlaybackSync, 500);

    return { ok: true, version: VERSION, target: "main.main" };
  }

  function unmountFromRightPanel() {
    _chartActive = false;
    _activeBarEl = null;
    _activeBeatEl = null;
    stopPlaybackSync();

    try { window.Studio936InstrumentSurfaceManager?.startObserver?.(); } catch(_) {}

    const chartEl = document.getElementById("s936-chart-view-panel");
    if (chartEl) {
      if (chartEl._resizeHandler) window.removeEventListener("resize", chartEl._resizeHandler);
      chartEl.remove();
    }

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
  };

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
    stopChartRhythmConsole,
    openVoicingEditor
  };
})();