// Studio 936 Composer - Suite Pro Editor v0.2
// Scope: Editor tab inside Compose.
// Adds exact six-string guitar voicings, chord detection, TAB and full-instrument visualization.
// It does not replace or delete the legacy editor.
(function () {
  "use strict";

  const STYLE_ID = "s936SuiteProEditorStyles";
  const VERSION = "editor-v0.2-guitar-exact";
  const state = {
    sectionKey: "",
    chordIndex: null,
    instrument: "",
    manualName: false
  };

  const SHARP_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const FLAT_NAMES = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
  const GUITAR_STRINGS = [
    { number: 6, label: "E", open: "E2", midi: 40 },
    { number: 5, label: "A", open: "A2", midi: 45 },
    { number: 4, label: "D", open: "D3", midi: 50 },
    { number: 3, label: "G", open: "G3", midi: 55 },
    { number: 2, label: "B", open: "B3", midi: 59 },
    { number: 1, label: "e", open: "E4", midi: 64 }
  ];

  const CHORD_PATTERNS = [
    { suffix: "maj13", quality: "major13", intervals: [0,2,4,7,9,11] },
    { suffix: "13", quality: "dominant13", intervals: [0,2,4,7,9,10] },
    { suffix: "m13", quality: "minor13", intervals: [0,2,3,7,9,10] },
    { suffix: "maj11", quality: "major11", intervals: [0,2,4,5,7,11] },
    { suffix: "11", quality: "dominant11", intervals: [0,2,4,5,7,10] },
    { suffix: "m11", quality: "minor11", intervals: [0,2,3,5,7,10] },
    { suffix: "maj9", quality: "major9", intervals: [0,2,4,7,11] },
    { suffix: "9", quality: "dominant9", intervals: [0,2,4,7,10] },
    { suffix: "m9", quality: "minor9", intervals: [0,2,3,7,10] },
    { suffix: "7b9", quality: "dominant7b9", intervals: [0,1,4,7,10] },
    { suffix: "7#9", quality: "dominant7sharp9", intervals: [0,3,4,7,10] },
    { suffix: "add9", quality: "majorAdd9", intervals: [0,2,4,7] },
    { suffix: "m(add9)", quality: "minorAdd9", intervals: [0,2,3,7] },
    { suffix: "maj7", quality: "major7", intervals: [0,4,7,11] },
    { suffix: "m7", quality: "minor7", intervals: [0,3,7,10] },
    { suffix: "m(maj7)", quality: "minorMajor7", intervals: [0,3,7,11] },
    { suffix: "7", quality: "dominant7", intervals: [0,4,7,10] },
    { suffix: "6", quality: "major6", intervals: [0,4,7,9] },
    { suffix: "m6", quality: "minor6", intervals: [0,3,7,9] },
    { suffix: "dim7", quality: "diminished7", intervals: [0,3,6,9] },
    { suffix: "m7b5", quality: "halfDiminished", intervals: [0,3,6,10] },
    { suffix: "aug", quality: "augmented", intervals: [0,4,8] },
    { suffix: "dim", quality: "diminished", intervals: [0,3,6] },
    { suffix: "sus2", quality: "sus2", intervals: [0,2,7] },
    { suffix: "sus4", quality: "sus4", intervals: [0,5,7] },
    { suffix: "", quality: "major", intervals: [0,4,7] },
    { suffix: "m", quality: "minor", intervals: [0,3,7] },
    { suffix: "5", quality: "power", intervals: [0,7] }
  ];

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#s936SuitePro .s936-ed-shell{display:grid;gap:10px}
#s936SuitePro .s936-ed-card{border:1px solid rgba(255,255,255,.13);border-radius:16px;background:rgba(255,255,255,.045);padding:12px}
#s936SuitePro .s936-ed-card.primary{border-color:rgba(0,255,204,.38);background:linear-gradient(135deg,rgba(0,255,204,.09),rgba(255,255,255,.035))}
#s936SuitePro .s936-ed-title{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:9px}
#s936SuitePro .s936-ed-title h4{margin:0;color:#8affff;font-size:.82rem;text-transform:uppercase;letter-spacing:.8px}
#s936SuitePro .s936-ed-version{color:rgba(255,255,255,.48);font-size:.56rem;font-weight:900}
#s936SuitePro .s936-ed-note{margin:0;color:rgba(255,255,255,.67);font-size:.66rem;line-height:1.42}
#s936SuitePro .s936-ed-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
#s936SuitePro .s936-ed-field.full{grid-column:1/-1}
#s936SuitePro .s936-ed-field label{display:block;color:#ffe066;font-size:.56rem;font-weight:950;text-transform:uppercase;letter-spacing:.65px;margin:0 0 4px}
#s936SuitePro .s936-ed-input,#s936SuitePro .s936-ed-select{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.17);border-radius:11px;background:rgba(0,0,0,.34);color:#fff;padding:8px 9px;font-size:.72rem;font-weight:800}
#s936SuitePro .s936-ed-input[readonly]{color:#bfffee;background:rgba(0,255,204,.045)}
#s936SuitePro .s936-ed-input:focus,#s936SuitePro .s936-ed-select:focus{outline:none;border-color:rgba(0,255,204,.72);box-shadow:0 0 0 2px rgba(0,255,204,.10)}
#s936SuitePro .s936-ed-instruments{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:9px 0}
#s936SuitePro .s936-ed-inst{border:1px solid rgba(255,255,255,.16);border-radius:12px;background:rgba(255,255,255,.05);color:#fff;padding:8px 6px;font-size:.61rem;font-weight:950;text-transform:uppercase;cursor:pointer}
#s936SuitePro .s936-ed-inst.active{border-color:#00ffcc;background:rgba(0,255,204,.14);color:#bfffee}
#s936SuitePro .s936-ed-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
#s936SuitePro .s936-ed-btn{border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(255,255,255,.06);color:#fff;padding:7px 10px;font-size:.59rem;font-weight:950;text-transform:uppercase;cursor:pointer}
#s936SuitePro .s936-ed-btn.primary{border-color:rgba(0,255,204,.60);background:rgba(0,255,204,.12);color:#bfffee}
#s936SuitePro .s936-ed-btn.warn{border-color:rgba(255,216,77,.65);background:rgba(255,216,77,.10);color:#ffe066}
#s936SuitePro .s936-ed-btn.danger{border-color:rgba(255,90,90,.65);background:rgba(255,90,90,.10);color:#ffb9b9}
#s936SuitePro .s936-ed-status{min-height:16px;margin-top:8px;color:#bfffee;font-size:.62rem;font-weight:800;line-height:1.35}
#s936SuitePro .s936-ed-name-tools{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px}
#s936SuitePro .s936-ed-check{display:flex;align-items:center;gap:5px;color:rgba(255,255,255,.68);font-size:.58rem;font-weight:800}
#s936SuitePro .s936-ed-alt{color:rgba(255,255,255,.58);font-size:.57rem;line-height:1.35}
#s936SuitePro .s936-ed-guitar{border:1px solid rgba(255,216,77,.24);border-radius:14px;background:rgba(255,216,77,.035);padding:9px;margin-top:9px}
#s936SuitePro .s936-ed-guitar-head{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:7px}
#s936SuitePro .s936-ed-guitar-head b{color:#ffe066;font-size:.63rem;text-transform:uppercase;letter-spacing:.6px}
#s936SuitePro .s936-ed-string-head,#s936SuitePro .s936-ed-string-row{display:grid;grid-template-columns:42px minmax(72px,1fr) minmax(66px,.8fr) minmax(74px,1fr);gap:5px;align-items:center}
#s936SuitePro .s936-ed-string-head{color:rgba(255,255,255,.50);font-size:.50rem;text-transform:uppercase;font-weight:900;padding:0 2px 4px}
#s936SuitePro .s936-ed-string-row{padding:4px 0;border-top:1px solid rgba(255,255,255,.06)}
#s936SuitePro .s936-ed-string-label{color:#fff;font-size:.62rem;font-weight:950}
#s936SuitePro .s936-ed-string-label span{display:block;color:rgba(255,255,255,.45);font-size:.49rem;font-weight:700}
#s936SuitePro .s936-ed-mini{padding:6px 7px;font-size:.62rem;border-radius:9px}
#s936SuitePro .s936-ed-note-result{color:#bfffee;font-size:.62rem;font-weight:900;text-align:center}
#s936SuitePro .s936-ed-barre{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;border-top:1px solid rgba(255,255,255,.08);margin-top:8px;padding-top:8px}
#s936SuitePro .s936-ed-barre .full{grid-column:1/-1}
#s936SuitePro .s936-ed-result{border:1px solid rgba(0,255,204,.25);border-radius:13px;background:rgba(0,255,204,.045);padding:9px;margin-top:9px}
#s936SuitePro .s936-ed-result-title{color:#8affff;font-size:.58rem;font-weight:950;text-transform:uppercase;letter-spacing:.7px;margin-bottom:6px}
#s936SuitePro .s936-ed-result-line{display:grid;grid-template-columns:92px minmax(0,1fr);gap:7px;margin:4px 0;font-size:.61rem;line-height:1.35}
#s936SuitePro .s936-ed-result-line b{color:#ffe066}
#s936SuitePro .s936-ed-result-line span{color:#e9ffff;overflow-wrap:anywhere}
#s936SuitePro .s936-ed-tab{margin:7px 0 0;padding:8px;border-radius:10px;background:#050707;color:#bfffee;font:700 .58rem/1.35 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre;overflow:auto}
#s936SuitePro .s936-ed-visual-note{border-left:3px solid #ffe066;padding-left:9px;margin-top:10px;color:rgba(255,255,255,.72);font-size:.62rem;line-height:1.45}
#s936ExactVoicingMap{box-sizing:border-box;margin:8px 10px;border:1px solid rgba(0,255,204,.38);border-radius:14px;background:rgba(2,13,14,.96);padding:9px;color:#fff;position:relative;z-index:5}
#s936ExactVoicingMap .s936-xv-head{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:7px}
#s936ExactVoicingMap .s936-xv-head b{color:#8affff;font-size:.66rem;text-transform:uppercase;letter-spacing:.7px}
#s936ExactVoicingMap .s936-xv-head span{color:#ffe066;font-size:.58rem;font-weight:900}
#s936ExactVoicingMap .s936-xv-scroll{overflow-x:auto;padding-bottom:4px}
#s936ExactVoicingMap .s936-xv-ruler,#s936ExactVoicingMap .s936-xv-row{display:grid;grid-template-columns:42px repeat(25,24px);gap:2px;min-width:690px;align-items:center}
#s936ExactVoicingMap .s936-xv-ruler{margin-bottom:3px}
#s936ExactVoicingMap .s936-xv-ruler span{font-size:.45rem;color:rgba(255,255,255,.42);text-align:center}
#s936ExactVoicingMap .s936-xv-label{font-size:.52rem;font-weight:950;color:#fff}
#s936ExactVoicingMap .s936-xv-cell{height:15px;border:1px solid rgba(255,255,255,.08);border-radius:3px;background:rgba(255,255,255,.025);font-size:.43rem;display:flex;align-items:center;justify-content:center;color:transparent}
#s936ExactVoicingMap .s936-xv-cell.on{border-color:#00ffcc;background:#00ffcc;color:#00251f;font-weight:950;box-shadow:0 0 10px rgba(0,255,204,.32)}
#s936ExactVoicingMap .s936-xv-cell.bass{border-color:#ff5bea;background:#ff5bea;color:#23001f}
#s936ExactVoicingMap .s936-xv-cell.barre{outline:1px solid rgba(255,216,77,.85);outline-offset:1px}
#s936ExactVoicingMap .s936-xv-muted{color:#ff9f9f;font-size:.58rem;font-weight:950}
@media(max-width:760px){
  #s936SuitePro .s936-ed-grid{grid-template-columns:1fr}
  #s936SuitePro .s936-ed-field.full{grid-column:auto}
  #s936SuitePro .s936-ed-string-head,#s936SuitePro .s936-ed-string-row{grid-template-columns:38px minmax(62px,1fr) minmax(58px,.75fr) minmax(65px,.85fr)}
}
`;
    document.head.appendChild(style);
  }

  function bridge(name, ...args) {
    const api = window.Studio936AppBridge;
    if (!api || typeof api[name] !== "function") {
      console.warn("Suite Pro Editor: bridge method unavailable:", name);
      return null;
    }
    try {
      return api[name](...args);
    } catch (error) {
      console.error("Suite Pro Editor bridge error:", name, error);
      return null;
    }
  }

  function el(ctx, tag, className, text) {
    if (ctx && typeof ctx.el === "function") return ctx.el(tag, className || "", text);
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function field(ctx, label, control, full) {
    const wrap = el(ctx, "div", "s936-ed-field" + (full ? " full" : ""));
    wrap.appendChild(el(ctx, "label", "", label));
    wrap.appendChild(control);
    return wrap;
  }

  function makeInput(ctx, type, value) {
    const input = el(ctx, "input", "s936-ed-input");
    input.type = type || "text";
    input.value = value ?? "";
    return input;
  }

  function makeSelect(ctx, options, value, extraClass) {
    const select = el(ctx, "select", "s936-ed-select" + (extraClass ? " " + extraClass : ""));
    (options || []).forEach(([v, label]) => {
      const option = document.createElement("option");
      option.value = v;
      option.textContent = label;
      select.appendChild(option);
    });
    if (value !== undefined && value !== null) select.value = String(value);
    return select;
  }

  function button(ctx, label, className, handler) {
    const btn = el(ctx, "button", "s936-ed-btn " + (className || ""), label);
    btn.type = "button";
    btn.addEventListener("click", handler);
    return btn;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, Number(n) || 0));
  }

  function humanize(key) {
    const known = {
      intro: "Introducción", verse: "Verso", verse1: "Verso 1", verse2: "Verso 2",
      verse3: "Verso 3", verse4: "Verso 4", prechorus: "Pre-coro",
      chorus: "Coro", bridge: "Puente", interlude: "Interludio", solo: "Solo", outro: "Outro"
    };
    return known[key] || String(key || "Sección").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }

  function preferFlatsFrom(text) {
    return /(?:^|[^A-G])(?:Bb|Eb|Ab|Db|Gb|Cb|Fb)/i.test(String(text || "")) || /b/.test(String(text || ""));
  }

  function normalizeSolfege(token) {
    const match = String(token || "").trim().match(/^(Do|Re|Mi|Fa|Sol|La|Si)([#b]?)(-?\d+)$/i);
    if (!match) return String(token || "").trim();
    const map = { do:"C", re:"D", mi:"E", fa:"F", sol:"G", la:"A", si:"B" };
    return map[match[1].toLowerCase()] + (match[2] || "") + match[3];
  }

  function noteTokenToMidi(token) {
    const value = normalizeSolfege(token);
    const match = value.match(/^([A-Ga-g])([#b]?)(-?\d+)$/);
    if (!match) return null;
    const base = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 }[match[1].toUpperCase()];
    const accidental = match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0;
    const octave = Number(match[3]);
    return 12 * (octave + 1) + base + accidental;
  }

  function parseNoteMidis(text) {
    return String(text || "").trim().split(/\s+/).map(noteTokenToMidi).filter(Number.isFinite);
  }

  function noteNameFromMidi(midi, flats) {
    const n = Math.round(Number(midi));
    const pc = ((n % 12) + 12) % 12;
    const octave = Math.floor(n / 12) - 1;
    return (flats ? FLAT_NAMES : SHARP_NAMES)[pc] + octave;
  }

  function pcName(pc, flats) {
    return (flats ? FLAT_NAMES : SHARP_NAMES)[((pc % 12) + 12) % 12];
  }

  function sameSet(a, b) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  }

  function detectChord(midis, bassMidi, flats) {
    const pcs = [...new Set((midis || []).filter(Number.isFinite).map(m => ((m % 12) + 12) % 12))].sort((a,b) => a-b);
    if (!pcs.length) return { primary:"", alternatives:[], rootPc:null, quality:"", confidence:0 };
    const bassPc = Number.isFinite(bassMidi) ? ((bassMidi % 12) + 12) % 12 : pcs[0];
    const candidates = [];

    for (let root = 0; root < 12; root++) {
      const actual = pcs.map(pc => (pc - root + 12) % 12).sort((a,b) => a-b);
      CHORD_PATTERNS.forEach((pattern, patternIndex) => {
        const target = pattern.intervals.slice().sort((a,b) => a-b);
        let confidence = 0;
        let omittedFifth = false;

        if (sameSet(actual, target)) {
          confidence = 100;
        } else if (target.includes(7)) {
          const withoutFifth = target.filter(v => v !== 7);
          if (sameSet(actual, withoutFifth)) {
            confidence = 82;
            omittedFifth = true;
          }
        }

        if (!confidence) return;
        let score = confidence + target.length * 2 - patternIndex * .01;
        if (root === bassPc) score += 16;
        if (pattern.suffix === "" || pattern.suffix === "m") score += 1;
        const slash = bassPc !== root ? "/" + pcName(bassPc, flats) : "";
        const label = pcName(root, flats) + pattern.suffix + slash + (omittedFifth ? " (sin 5ª)" : "");
        candidates.push({ label, rootPc:root, quality:pattern.quality, score, confidence });
      });
    }

    if (!candidates.length) {
      const root = bassPc;
      return {
        primary: pcName(root, flats) + "(notas)",
        alternatives: [],
        rootPc: root,
        quality: "cluster",
        confidence: 30
      };
    }

    candidates.sort((a,b) => b.score - a.score);
    const unique = [];
    candidates.forEach(c => {
      if (!unique.some(x => x.label === c.label)) unique.push(c);
    });
    return {
      primary: unique[0].label,
      alternatives: unique.slice(1, 4).map(c => c.label),
      rootPc: unique[0].rootPc,
      quality: unique[0].quality,
      confidence: unique[0].confidence
    };
  }

  function normalizeFret(value) {
    if (value === null || value === undefined || String(value).toUpperCase() === "X" || String(value) === "-1") return null;
    return clamp(parseInt(value, 10), 0, 24);
  }

  function fretOptions() {
    const list = [["X", "X · apagada"], ["0", "0 · al aire"]];
    for (let i = 1; i <= 24; i++) list.push([String(i), String(i)]);
    return list;
  }

  function fingerOptions() {
    return [
      ["", "—"],
      ["0", "0 · abierta"],
      ["1", "1 · índice"],
      ["2", "2 · medio"],
      ["3", "3 · anular"],
      ["4", "4 · meñique"],
      ["T", "T · pulgar"]
    ];
  }

  function assignSuggestedFingers(frets) {
    const fingerMap = new Map();
    let next = 1;
    return frets.map(fret => {
      if (fret === null) return "";
      if (fret === 0) return "0";
      if (!fingerMap.has(fret)) {
        fingerMap.set(fret, String(Math.min(4, next)));
        next++;
      }
      return fingerMap.get(fret);
    });
  }

  function scoreShape(frets, targetPcs, bassPc) {
    const sounded = [];
    frets.forEach((fret, i) => {
      if (fret === null) return;
      sounded.push({ midi:GUITAR_STRINGS[i].midi + fret, fret, stringIndex:i });
    });
    if (sounded.length < 3) return -Infinity;

    const pcs = new Set(sounded.map(x => x.midi % 12));
    let coverage = 0;
    targetPcs.forEach(pc => { if (pcs.has(pc)) coverage++; });
    const missing = targetPcs.length - coverage;
    const lowest = sounded.reduce((a,b) => a.midi <= b.midi ? a : b);
    const fretted = sounded.filter(x => x.fret > 0);
    const span = fretted.length ? Math.max(...fretted.map(x => x.fret)) - Math.min(...fretted.map(x => x.fret)) : 0;
    const openCount = sounded.filter(x => x.fret === 0).length;
    const muted = 6 - sounded.length;
    const distinctFrets = new Set(fretted.map(x => x.fret)).size;

    let score = coverage * 22 - missing * 28;
    score += lowest.midi % 12 === bassPc ? 30 : -12;
    score += sounded.length * 2 + openCount * 1.5;
    score -= span * 4 + muted * 1.2;
    if (distinctFrets > 4) score -= (distinctFrets - 4) * 12;
    score -= fretted.reduce((sum,x) => sum + x.fret, 0) / Math.max(1, fretted.length) * .35;
    return score;
  }

  function suggestGuitarShape(item) {
    const flats = preferFlatsFrom(item?.name);
    const noteMidis = parseNoteMidis(item?.notes || "");
    const bassMidi = noteTokenToMidi(item?.bass || "");
    const all = noteMidis.slice();
    if (Number.isFinite(bassMidi)) all.push(bassMidi);
    const targetPcs = [...new Set(all.map(m => ((m % 12) + 12) % 12))];
    const fallback = { frets:[0,2,2,1,0,0], fingers:["0","2","3","1","0","0"] };

    if (!targetPcs.length) return fallback;
    const bassPc = Number.isFinite(bassMidi) ? ((bassMidi % 12) + 12) % 12 : targetPcs[0];
    let best = null;
    let bestScore = -Infinity;

    for (let windowStart = 0; windowStart <= 12; windowStart++) {
      const windowEnd = Math.min(24, Math.max(4, windowStart + 4));
      const candidates = GUITAR_STRINGS.map(string => {
        const values = [null];
        if (targetPcs.includes(string.midi % 12)) values.push(0);
        const start = Math.max(1, windowStart);
        for (let fret = start; fret <= windowEnd; fret++) {
          if (targetPcs.includes((string.midi + fret) % 12)) values.push(fret);
        }
        return [...new Set(values)];
      });

      function walk(index, shape) {
        if (index === 6) {
          const score = scoreShape(shape, targetPcs, bassPc);
          if (score > bestScore) {
            bestScore = score;
            best = shape.slice();
          }
          return;
        }
        candidates[index].forEach(value => {
          shape.push(value);
          walk(index + 1, shape);
          shape.pop();
        });
      }
      walk(0, []);
    }

    const frets = best || fallback.frets;
    return { frets, fingers:assignSuggestedFingers(frets), flats };
  }

  function normalizeGuitarDraft(item) {
    const saved = item?.voicings?.guitar || item?.guitarVoicing || null;
    const suggested = suggestGuitarShape(item || {});
    const frets = Array.isArray(saved?.frets) && saved.frets.length === 6
      ? saved.frets.map(normalizeFret)
      : suggested.frets.map(normalizeFret);
    const fingers = Array.isArray(saved?.fingers) && saved.fingers.length === 6
      ? saved.fingers.map(v => String(v ?? ""))
      : suggested.fingers.slice();

    return {
      tuning: GUITAR_STRINGS.map(s => s.open),
      frets,
      fingers,
      capo: clamp(saved?.capo || 0, 0, 12),
      barre: {
        enabled: !!saved?.barre?.enabled,
        fret: clamp(saved?.barre?.fret || 1, 1, 24),
        fromString: clamp(saved?.barre?.fromString || 6, 1, 6),
        toString: clamp(saved?.barre?.toString || 1, 1, 6),
        finger: String(saved?.barre?.finger || "1")
      }
    };
  }

  function calculateGuitar(draft, preferredName) {
    const flats = preferFlatsFrom(preferredName);
    const capo = clamp(draft.capo, 0, 12);
    const strings = GUITAR_STRINGS.map((string, i) => {
      const rawFret = normalizeFret(draft.frets[i]);
      const fret = rawFret === null ? null : Math.min(rawFret, Math.max(0, 24 - capo));
      if (fret === null) {
        return {
          number:string.number, label:string.label, open:string.open,
          fret:null, physicalFret:null, finger:String(draft.fingers[i] || ""),
          midi:null, note:"X", muted:true
        };
      }
      const midi = string.midi + capo + fret;
      return {
        number:string.number, label:string.label, open:string.open,
        fret, physicalFret:capo + fret, finger:String(draft.fingers[i] || (fret === 0 ? "0" : "")),
        midi, note:noteNameFromMidi(midi, flats), muted:false
      };
    });

    const sounded = strings.filter(s => Number.isFinite(s.midi));
    const bassString = sounded.reduce((lowest, current) => !lowest || current.midi < lowest.midi ? current : lowest, null);
    const exactMidis = sounded.map(s => s.midi);
    const bassMidi = bassString?.midi ?? null;
    const detection = detectChord(exactMidis, bassMidi, flats);
    const shape = strings.map(s => s.muted ? "X" : String(s.fret)).join("-");
    const notes = sounded.map(s => s.note).join(" ");
    const bass = Number.isFinite(bassMidi) ? noteNameFromMidi(bassMidi, flats) : "";

    const tabRows = strings.slice().reverse().map(s => {
      const token = s.muted ? "X" : String(s.fret);
      return `${s.label}|--${token.padStart(2,"-")}-- ${s.note}`;
    });
    const capoLine = capo > 0 ? `Capo: traste ${capo}\n` : "";

    return {
      strings,
      exactMidis,
      bassMidi,
      bass,
      notes,
      shape,
      tab: capoLine + tabRows.join("\n"),
      detection,
      voicing: {
        tuning:GUITAR_STRINGS.map(s => s.open),
        frets:strings.map(s => s.fret),
        fingers:strings.map(s => s.finger),
        capo,
        barre:{
          enabled:!!draft.barre.enabled,
          fret:clamp(draft.barre.fret,1,24),
          fromString:clamp(draft.barre.fromString,1,6),
          toString:clamp(draft.barre.toString,1,6),
          finger:String(draft.barre.finger || "1")
        },
        shape,
        notes,
        bass
      }
    };
  }

  function buildResultBox(ctx) {
    const box = el(ctx, "div", "s936-ed-result");
    box.appendChild(el(ctx, "div", "s936-ed-result-title", "Resultado sonoro"));
    const refs = {};
    [
      ["name", "Nombre detectado"],
      ["bass", "Bajo"],
      ["notes", "Notas"],
      ["shape", "Forma"]
    ].forEach(([key,label]) => {
      const row = el(ctx, "div", "s936-ed-result-line");
      row.appendChild(el(ctx, "b", "", label));
      refs[key] = el(ctx, "span", "", "—");
      row.appendChild(refs[key]);
      box.appendChild(row);
    });
    refs.tab = el(ctx, "pre", "s936-ed-tab", "");
    box.appendChild(refs.tab);
    return { box, refs };
  }

  function setStatus(node, message, isError) {
    node.textContent = message || "";
    node.style.color = isError ? "#ffb9b9" : "#bfffee";
  }

  function getEditorState() {
    return bridge("getEditorState") || {
      sectionKey: "intro", chordIndex: 0, instrument: "piano", sections: {}, sectionOptions: []
    };
  }

  function render(ctx, host) {
    installStyles();
    const mount = el(ctx, "div", "s936-ed-module");
    host.appendChild(mount);
    paint(ctx, mount);
  }

  function paint(ctx, host) {
    installStyles();
    const data = getEditorState();
    const sections = data.sections || {};
    const sectionKeys = Object.keys(sections);
    if (!sectionKeys.length) {
      host.appendChild(el(ctx, "section", "s936-ed-card", "No hay secciones disponibles en el proyecto."));
      return;
    }

    state.sectionKey = sections[state.sectionKey] ? state.sectionKey : (data.sectionKey || sectionKeys[0]);
    state.chordIndex = state.chordIndex === null ? (Number(data.chordIndex) || 0) : (Number(state.chordIndex) || 0);
    state.instrument = state.instrument || data.instrument || "piano";

    const seq = Array.isArray(sections[state.sectionKey]) ? sections[state.sectionKey] : [];
    if (state.chordIndex >= seq.length) state.chordIndex = Math.max(0, seq.length - 1);
    const item = seq[state.chordIndex] || { name:"C", bass:"C2", notes:"C3 E3 G3", bars:1 };

    const shell = el(ctx, "div", "s936-ed-shell");
    const card = el(ctx, "section", "s936-ed-card primary");
    const title = el(ctx, "div", "s936-ed-title");
    title.appendChild(el(ctx, "h4", "", "Editor Pro · Acordes"));
    title.appendChild(el(ctx, "span", "s936-ed-version", VERSION));
    card.appendChild(title);
    card.appendChild(el(ctx, "p", "s936-ed-note", "El acorde se calcula, se escucha y se refleja sobre el instrumento principal. En guitarra, cada cuerda tiene traste, dedo y nota resultante."));

    const instruments = el(ctx, "div", "s936-ed-instruments");
    [["piano","Piano"],["guitar","Guitarra"],["ukulele","Ukelele"]].forEach(([key,label]) => {
      const btn = el(ctx, "button", "s936-ed-inst" + (state.instrument === key ? " active" : ""), label);
      btn.type = "button";
      btn.addEventListener("click", () => {
        const result = bridge("setEditorInstrument", key);
        if (result?.ok === false) return;
        state.instrument = key;
        renderModule(ctx, host);
      });
      instruments.appendChild(btn);
    });
    card.appendChild(instruments);

    const sectionOptions = (data.sectionOptions || sectionKeys.map(k => [k, humanize(k)]))
      .filter(entry => Array.isArray(entry) && sections[entry[0]])
      .map(entry => [entry[0], entry[1] || humanize(entry[0])]);

    const sectionSelect = makeSelect(ctx, sectionOptions, state.sectionKey);
    const chordSelect = makeSelect(
      ctx,
      seq.map((ch,index) => [String(index), `${index + 1}. ${ch.name || "Acorde"} · ${ch.bars || 1} comp.`]),
      state.chordIndex
    );
    const nameInput = makeInput(ctx, "text", item.name || "");
    const bassInput = makeInput(ctx, "text", item.bass || "C2");
    const notesInput = makeInput(ctx, "text", item.notes || "");
    const barsInput = makeInput(ctx, "number", item.bars || 1);
    barsInput.min = "1";
    barsInput.max = "16";

    const manualWrap = el(ctx, "label", "s936-ed-check");
    const manualCheck = document.createElement("input");
    manualCheck.type = "checkbox";
    manualCheck.checked = !!state.manualName;
    manualWrap.appendChild(manualCheck);
    manualWrap.appendChild(document.createTextNode("Nombre manual"));
    const alternatives = el(ctx, "div", "s936-ed-alt", "");
    const nameTools = el(ctx, "div", "s936-ed-name-tools");
    nameTools.appendChild(manualWrap);
    nameTools.appendChild(alternatives);

    nameInput.readOnly = !state.manualName;
    manualCheck.addEventListener("change", () => {
      state.manualName = manualCheck.checked;
      nameInput.readOnly = !state.manualName;
      if (!state.manualName) recalculate();
    });

    const grid = el(ctx, "div", "s936-ed-grid");
    grid.appendChild(field(ctx, "Sección", sectionSelect, true));
    grid.appendChild(field(ctx, "Acorde seleccionado", chordSelect, true));
    const nameField = field(ctx, "Nombre del acorde", nameInput, true);
    nameField.appendChild(nameTools);
    grid.appendChild(nameField);
    grid.appendChild(field(ctx, state.instrument === "guitar" ? "Bajo resultante" : "Bajo", bassInput, false));
    grid.appendChild(field(ctx, state.instrument === "guitar" ? "Notas resultantes" : (state.instrument === "piano" ? "Notas del voicing" : "Notas sonoras"), notesInput, true));
    grid.appendChild(field(ctx, "Compases", barsInput, false));
    card.appendChild(grid);

    const status = el(ctx, "div", "s936-ed-status");
    const result = buildResultBox(ctx);
    let guitarDraft = null;
    let guitarControls = null;
    let latestCalculation = null;
    let visualTimer = null;

    if (state.instrument === "guitar") {
      bassInput.readOnly = true;
      notesInput.readOnly = true;
      guitarDraft = normalizeGuitarDraft(item);

      const guitarBox = el(ctx, "section", "s936-ed-guitar");
      const guitarHead = el(ctx, "div", "s936-ed-guitar-head");
      guitarHead.appendChild(el(ctx, "b", "", "Digitación exacta · 6 cuerdas"));
      guitarHead.appendChild(el(ctx, "span", "s936-ed-alt", "X = apagada · 0 = abierta · 1–24 = traste"));
      guitarBox.appendChild(guitarHead);

      const head = el(ctx, "div", "s936-ed-string-head");
      ["Cuerda","Traste","Dedo","Nota"].forEach(text => head.appendChild(el(ctx, "span", "", text)));
      guitarBox.appendChild(head);

      const fretSelects = [];
      const fingerSelects = [];
      const noteLabels = [];

      GUITAR_STRINGS.forEach((string, i) => {
        const row = el(ctx, "div", "s936-ed-string-row");
        const label = el(ctx, "div", "s936-ed-string-label", `${string.number} · ${string.label}`);
        label.appendChild(el(ctx, "span", "", string.open));
        row.appendChild(label);

        const fret = makeSelect(ctx, fretOptions(), guitarDraft.frets[i] === null ? "X" : String(guitarDraft.frets[i]), "s936-ed-mini");
        const finger = makeSelect(ctx, fingerOptions(), guitarDraft.fingers[i], "s936-ed-mini");
        const note = el(ctx, "div", "s936-ed-note-result", "—");
        fretSelects.push(fret);
        fingerSelects.push(finger);
        noteLabels.push(note);
        row.appendChild(fret);
        row.appendChild(finger);
        row.appendChild(note);
        guitarBox.appendChild(row);
      });

      const barreBox = el(ctx, "div", "s936-ed-barre");
      const capoInput = makeInput(ctx, "number", guitarDraft.capo);
      capoInput.min = "0";
      capoInput.max = "12";

      const barreEnabledWrap = el(ctx, "label", "s936-ed-check full");
      const barreEnabled = document.createElement("input");
      barreEnabled.type = "checkbox";
      barreEnabled.checked = guitarDraft.barre.enabled;
      barreEnabledWrap.appendChild(barreEnabled);
      barreEnabledWrap.appendChild(document.createTextNode("Usar barré / cejilla con el dedo"));

      const barreFret = makeInput(ctx, "number", guitarDraft.barre.fret);
      barreFret.min = "1";
      barreFret.max = "24";
      const fromString = makeSelect(ctx, [["6","6"],["5","5"],["4","4"],["3","3"],["2","2"],["1","1"]], guitarDraft.barre.fromString);
      const toString = makeSelect(ctx, [["1","1"],["2","2"],["3","3"],["4","4"],["5","5"],["6","6"]], guitarDraft.barre.toString);
      const barreFinger = makeSelect(ctx, [["1","1 · índice"],["2","2 · medio"],["3","3 · anular"],["4","4 · meñique"]], guitarDraft.barre.finger);

      barreBox.appendChild(field(ctx, "Capo externo", capoInput, false));
      barreBox.appendChild(barreEnabledWrap);
      barreBox.appendChild(field(ctx, "Traste del barré", barreFret, false));
      barreBox.appendChild(field(ctx, "Desde cuerda", fromString, false));
      barreBox.appendChild(field(ctx, "Hasta cuerda", toString, false));
      barreBox.appendChild(field(ctx, "Dedo del barré", barreFinger, false));
      const applyBarreBtn = button(ctx, "Aplicar barré a cuerdas", "warn", () => {
        const fretValue = clamp(barreFret.value, 1, 24);
        const high = Math.max(Number(fromString.value), Number(toString.value));
        const low = Math.min(Number(fromString.value), Number(toString.value));
        GUITAR_STRINGS.forEach((string, i) => {
          if (string.number <= high && string.number >= low) {
            const current = normalizeFret(fretSelects[i].value);
            if (current === null || current === 0 || current < fretValue) {
              fretSelects[i].value = String(fretValue);
              fingerSelects[i].value = barreFinger.value;
            }
          }
        });
        barreEnabled.checked = true;
        recalculate();
      });
      const applyWrap = el(ctx, "div", "full");
      applyWrap.appendChild(applyBarreBtn);
      barreBox.appendChild(applyWrap);
      guitarBox.appendChild(barreBox);
      card.appendChild(guitarBox);

      guitarControls = {
        fretSelects, fingerSelects, noteLabels,
        capoInput, barreEnabled, barreFret, fromString, toString, barreFinger
      };

      [...fretSelects, ...fingerSelects, capoInput, barreEnabled, barreFret, fromString, toString, barreFinger]
        .forEach(control => control.addEventListener("change", recalculate));
    }

    card.appendChild(result.box);

    const controls = {
      section:sectionSelect, chord:chordSelect, name:nameInput,
      bass:bassInput, notes:notesInput, bars:barsInput
    };

    function collectGuitarDraft() {
      if (!guitarControls) return null;
      return {
        tuning:GUITAR_STRINGS.map(s => s.open),
        frets:guitarControls.fretSelects.map(select => normalizeFret(select.value)),
        fingers:guitarControls.fingerSelects.map(select => select.value),
        capo:clamp(guitarControls.capoInput.value,0,12),
        barre:{
          enabled:guitarControls.barreEnabled.checked,
          fret:clamp(guitarControls.barreFret.value,1,24),
          fromString:clamp(guitarControls.fromString.value,1,6),
          toString:clamp(guitarControls.toString.value,1,6),
          finger:guitarControls.barreFinger.value || "1"
        }
      };
    }

    function currentPayload() {
      const base = {
        sectionKey:controls.section.value,
        chordIndex:Number(controls.chord.value) || 0,
        name:controls.name.value.trim() || "Acorde",
        bass:controls.bass.value.trim(),
        notes:controls.notes.value.trim(),
        bars:clamp(controls.bars.value,1,16),
        instrument:state.instrument || "piano"
      };
      if (state.instrument === "guitar" && latestCalculation) {
        base.name = state.manualName ? (controls.name.value.trim() || latestCalculation.detection.primary) : latestCalculation.detection.primary;
        base.bass = latestCalculation.bass;
        base.notes = latestCalculation.notes;
        base.exactMidis = latestCalculation.exactMidis;
        base.exactFrets = latestCalculation.strings.map(s => s.fret);
        base.exactStrings = latestCalculation.strings;
        base.capo = latestCalculation.voicing.capo;
        base.barre = latestCalculation.voicing.barre;
        base.rootPitchClass = latestCalculation.detection.rootPc;
        base.voicings = { guitar:latestCalculation.voicing };
      }
      return base;
    }

    function updateResult(name, bass, notes, shape, tab, alternativesText) {
      result.refs.name.textContent = name || "Sin identificar";
      result.refs.bass.textContent = bass || "—";
      result.refs.notes.textContent = notes || "—";
      result.refs.shape.textContent = shape || "—";
      result.refs.tab.textContent = tab || "";
      alternatives.textContent = alternativesText || "";
    }

    function scheduleVisual(payload) {
      clearTimeout(visualTimer);
      visualTimer = setTimeout(() => {
        const response = bridge("showEditorChordVisual", payload);
        if (response?.ok === false) setStatus(status, response.message || "No se pudo visualizar.", true);
      }, 80);
    }

    function recalculate() {
      if (state.instrument === "guitar" && guitarControls) {
        latestCalculation = calculateGuitar(collectGuitarDraft(), nameInput.value || item.name);
        guitarControls.noteLabels.forEach((label, i) => {
          const stringData = latestCalculation.strings[i];
          label.textContent = stringData.note;
          guitarControls.fretSelects[i].value = stringData.fret === null ? "X" : String(stringData.fret);
          if (stringData.fret === null) guitarControls.fingerSelects[i].value = "";
          else if (stringData.fret === 0) guitarControls.fingerSelects[i].value = "0";
          else if (guitarControls.fingerSelects[i].value === "0") guitarControls.fingerSelects[i].value = "";
        });
        bassInput.value = latestCalculation.bass;
        notesInput.value = latestCalculation.notes;
        if (!state.manualName) nameInput.value = latestCalculation.detection.primary;
        const alt = latestCalculation.detection.alternatives.length
          ? "Alternativas: " + latestCalculation.detection.alternatives.join(" · ")
          : "Nombre calculado desde las cuerdas que realmente suenan.";
        updateResult(
          nameInput.value,
          latestCalculation.bass,
          latestCalculation.notes,
          latestCalculation.shape,
          latestCalculation.tab,
          alt
        );
        scheduleVisual(currentPayload());
        return;
      }

      const noteMidis = parseNoteMidis(notesInput.value);
      const bassMidi = noteTokenToMidi(bassInput.value);
      const harmonicMidis = noteMidis.slice();
      if (Number.isFinite(bassMidi)) harmonicMidis.push(bassMidi);
      const detection = detectChord(harmonicMidis, bassMidi, preferFlatsFrom(nameInput.value || item.name));
      if (!state.manualName && detection.primary) nameInput.value = detection.primary;
      updateResult(
        nameInput.value,
        bassInput.value,
        notesInput.value,
        state.instrument === "piano" ? "Voicing por alturas" : "Mapa de notas",
        "",
        detection.alternatives.length ? "Alternativas: " + detection.alternatives.join(" · ") : "Nombre calculado desde las notas."
      );
      if (noteMidis.length) scheduleVisual(currentPayload());
    }

    sectionSelect.addEventListener("change", () => {
      state.sectionKey = sectionSelect.value;
      state.chordIndex = 0;
      bridge("selectEditorSection", state.sectionKey);
      renderModule(ctx, host);
    });

    chordSelect.addEventListener("change", () => {
      state.chordIndex = Number(chordSelect.value) || 0;
      bridge("selectEditorChord", state.sectionKey, state.chordIndex);
      renderModule(ctx, host);
    });

    notesInput.addEventListener("input", recalculate);
    bassInput.addEventListener("input", recalculate);
    nameInput.addEventListener("input", () => {
      if (state.manualName) {
        result.refs.name.textContent = nameInput.value || "Acorde";
      }
    });

    const actionBox = el(ctx, "div", "s936-ed-actions");
    actionBox.appendChild(button(ctx, "Escuchar", "warn", () => {
      const response = bridge("previewEditorChord", currentPayload());
      setStatus(status, response?.message || (response?.ok === false ? "No se pudo escuchar." : "Escuchando acorde."), response?.ok === false);
    }));
    actionBox.appendChild(button(ctx, "Aplicar", "primary", () => {
      const response = bridge("applyEditorChord", currentPayload());
      if (response?.ok === false) {
        setStatus(status, response.message || "No se pudo aplicar el acorde.", true);
        return;
      }
      setStatus(status, response?.message || "Acorde aplicado.", false);
      renderModule(ctx, host);
    }));
    actionBox.appendChild(button(ctx, "Agregar", "", () => {
      const response = bridge("addEditorChord", currentPayload());
      if (response?.ok === false) return setStatus(status, response.message || "No se pudo agregar.", true);
      state.chordIndex = Number(response?.chordIndex) || 0;
      renderModule(ctx, host);
    }));
    actionBox.appendChild(button(ctx, "Duplicar", "", () => {
      const response = bridge("duplicateEditorChord", state.sectionKey, state.chordIndex);
      if (response?.ok === false) return setStatus(status, response.message || "No se pudo duplicar.", true);
      state.chordIndex = Number(response?.chordIndex) || 0;
      renderModule(ctx, host);
    }));
    actionBox.appendChild(button(ctx, "Borrar", "danger", () => {
      if (!window.confirm("¿Borrar este acorde de la sección?")) return;
      const response = bridge("deleteEditorChord", state.sectionKey, state.chordIndex);
      if (response?.ok === false) return setStatus(status, response.message || "No se pudo borrar.", true);
      state.chordIndex = Number(response?.chordIndex) || 0;
      renderModule(ctx, host);
    }));
    card.appendChild(actionBox);
    card.appendChild(status);

    const visualText = state.instrument === "piano"
      ? "Piano: el nombre se calcula desde las alturas y el acorde se ilumina en el teclado completo."
      : state.instrument === "guitar"
        ? "Guitarra v0.2: la forma, el bajo, las notas y la TAB nacen de las seis cuerdas. El mapa exacto 0–24 aparece sobre el diapasón principal."
        : "Ukelele conserva por ahora el mapa de notas de v0.1. La digitación exacta de cuatro cuerdas será la siguiente fase.";
    card.appendChild(el(ctx, "div", "s936-ed-visual-note", visualText));
    shell.appendChild(card);
    host.appendChild(shell);

    recalculate();
    setTimeout(() => {
      bridge("selectEditorChord", state.sectionKey, state.chordIndex);
      recalculate();
    }, 0);
  }

  function renderModule(ctx, host) {
    if (!host) return;
    while (host.firstChild) host.removeChild(host.firstChild);
    paint(ctx, host);
  }

  function register() {
    window.Studio936SuiteProModules = window.Studio936SuiteProModules || {};
    window.Studio936SuiteProEditor = { version:VERSION, render };
    window.Studio936SuiteProModules.editor = window.Studio936SuiteProEditor;
  }

  register();
})();
