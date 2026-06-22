// Studio 936 Composer - Suite Pro Editor v0.7.1 Instrumental Pro
// Scope: Editor tab inside Compose.
// Refines the guitar UX with a compact interactive chart, realistic neck, exact voicings, TAB and lifecycle cleanup.
// It does not replace or delete the legacy editor.
(function () {
  "use strict";

  const STYLE_ID = "s936SuiteProEditorStyles";
  const VERSION = "editor-v0.7.2.10-drum-clean-layout";
  const state = {
    sectionKey: "",
    chordIndex: null,
    instrument: "",
    manualName: false,
    manualPanelOpen: false,
    miniStartFret: null,
    bassMode: "line"
  };
  let activeController = null;
  let lifecycleObserver = null;
  const StringInstruments = window.Studio936StringInstruments || null;
  const PianoEditor = window.Studio936SuiteProPianoEditor || null;
  const VoicingStore = window.Studio936VoicingStore || null;
  const BassLine = window.Studio936BassLinePro || null;
  const LeadLine = window.Studio936LeadLinePro || null;
  const DrumComposer = window.Studio936DrumComposerPro || null;
  const DrumPatterns = window.Studio936DrumPatterns || null;

  function isStringInstrument(instrument = state.instrument) {
    return !!StringInstruments?.isStringInstrument?.(instrument);
  }

  function stringProfile(instrument = state.instrument) {
    return StringInstruments?.profile?.(instrument) || {
      id:"guitar", label:"Guitarra", shortLabel:"Guitarra", shapeOrder:"6→1",
      maxFret:24, capoMax:12, minSounding:2, allowBarre:true, allowCapo:true,
      strings:GUITAR_STRINGS,
      defaultFrets:[0,2,2,1,0,0],
      defaultFingers:["0","2","3","1","0","0"]
    };
  }

  function activeStrings() {
    return stringProfile().strings;
  }

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
#s936SuitePro .s936-ed-shell{display:grid;gap:10px;overflow:visible}
#s936SuitePro .s936-ed-module,#s936SuitePro .s936-ed-card,#s936SuitePro .s936-ed-instrument-content{min-width:0;overflow:visible}
#s936SuitePro #s936EditorInstrumentTabs{display:flex!important;visibility:visible!important;opacity:1!important;position:sticky!important;top:0!important;z-index:999!important}
#s936SuitePro select.s936-ed-select,#s936SuitePro .s936-ed-field select,#s936SuitePro .s936-ed-card select{max-width:100%;min-width:0;position:relative;z-index:5}
#s936SuitePro .s936-ed-instruments-persistent .s936-ed-inst{font-size:.66rem;padding:7px 4px}
#s936SuitePro .s936-ed-lead-host,#s936SuitePro .s936-ed-drums-host{padding:10px}
#s936SuitePro .s936-ed-card{border:1px solid rgba(255,255,255,.13);border-radius:16px;background:rgba(255,255,255,.045);padding:12px}
#s936SuitePro .s936-ed-card.primary{border-color:rgba(0,255,204,.38);background:linear-gradient(135deg,rgba(0,255,204,.09),rgba(255,255,255,.035))}
#s936SuitePro .s936-ed-title{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px;position:relative}
#s936SuitePro .s936-ed-title-main{display:flex;align-items:center;gap:6px;min-width:0}
#s936SuitePro .s936-ed-title h4{margin:0;color:#8affff;font-size:.82rem;text-transform:uppercase;letter-spacing:.8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#s936SuitePro .s936-ed-version{color:rgba(255,255,255,.45);font-size:.50rem;font-weight:900;white-space:nowrap}
#s936SuitePro .s936-ed-help{width:24px;height:24px;border-radius:50%;border:1px solid rgba(0,255,204,.42);background:rgba(0,255,204,.08);color:#bfffee;font-size:.72rem;font-weight:950;cursor:pointer;display:grid;place-items:center;padding:0}
#s936SuitePro .s936-ed-help:hover,#s936SuitePro .s936-ed-help[aria-expanded="true"]{background:rgba(0,255,204,.18);border-color:#00ffcc}
#s936SuitePro .s936-ed-help-pop{border:1px solid rgba(0,255,204,.30);border-radius:11px;background:#071112;padding:8px 9px;margin:-1px 0 8px;color:rgba(255,255,255,.75);font-size:.60rem;line-height:1.4;box-shadow:0 12px 28px rgba(0,0,0,.32)}
#s936SuitePro .s936-ed-help-pop[hidden]{display:none}
#s936SuitePro .s936-ed-help-pop button{margin-top:6px;border:1px solid rgba(255,216,77,.55);border-radius:999px;background:rgba(255,216,77,.08);color:#ffe066;padding:5px 8px;font-size:.53rem;font-weight:950;text-transform:uppercase;cursor:pointer}
#s936SuitePro .s936-ed-note{margin:0;color:rgba(255,255,255,.67);font-size:.66rem;line-height:1.42}
#s936SuitePro .s936-ed-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
#s936SuitePro .s936-ed-chordline{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,1fr) 78px;gap:7px;align-items:end}
#s936SuitePro .s936-ed-chordline .s936-ed-field{min-width:0}
#s936SuitePro .s936-ed-chordline .s936-ed-input,#s936SuitePro .s936-ed-chordline .s936-ed-select{padding:7px 8px}
#s936SuitePro .s936-ed-piano-leftline{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(86px,.9fr) minmax(0,1fr);gap:6px;align-items:end}
#s936SuitePro .s936-ed-piano-leftline .s936-ed-field{min-width:0}
#s936SuitePro .s936-ed-piano-leftline .s936-ed-input,#s936SuitePro .s936-ed-piano-leftline .s936-ed-select{padding:7px 7px;font-size:.66rem}
#s936SuitePro .s936-ed-field.full{grid-column:1/-1}
#s936SuitePro .s936-ed-field label{display:block;color:#ffe066;font-size:.56rem;font-weight:950;text-transform:uppercase;letter-spacing:.65px;margin:0 0 4px}
#s936SuitePro .s936-ed-input,#s936SuitePro .s936-ed-select{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.17);border-radius:11px;background:rgba(0,0,0,.34);color:#fff;padding:8px 9px;font-size:.72rem;font-weight:800}
#s936SuitePro .s936-ed-input[readonly]{color:#bfffee;background:rgba(0,255,204,.045)}
#s936SuitePro .s936-ed-input:focus,#s936SuitePro .s936-ed-select:focus{outline:none;border-color:rgba(0,255,204,.72);box-shadow:0 0 0 2px rgba(0,255,204,.10)}
#s936SuitePro .s936-ed-instruments{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;margin:8px 0}
#s936SuitePro .s936-ed-instruments-persistent{position:sticky!important;top:0!important;z-index:40!important;display:flex!important;visibility:visible!important;opacity:1!important}
#s936SuitePro .s936-ed-instrument-content{min-width:0}
#s936SuitePro .s936-ed-instruments-isolated{display:flex!important;flex-wrap:nowrap!important;width:100%!important;min-width:0!important}
#s936SuitePro .s936-ed-instruments-isolated>.s936-ed-inst{display:flex!important;flex:1 1 0!important;width:auto!important;min-width:0!important;visibility:visible!important;opacity:1!important;position:relative!important;inset:auto!important}

#s936SuitePro .s936-ed-inst{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:clip;border:1px solid rgba(255,255,255,.16);border-radius:11px;background:rgba(255,255,255,.05);color:#fff;padding:7px 2px;font-size:.53rem;font-weight:950;text-transform:uppercase;cursor:pointer}
#s936SuitePro .s936-ed-inst.active{border-color:#00ffcc;background:rgba(0,255,204,.14);color:#bfffee}
#s936SuitePro .s936-ed-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
#s936SuitePro .s936-ed-btn{border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(255,255,255,.06);color:#fff;padding:7px 10px;font-size:.59rem;font-weight:950;text-transform:uppercase;cursor:pointer}
#s936SuitePro .s936-ed-btn:hover{background:rgba(255,255,255,.10)}
#s936SuitePro .s936-ed-btn.primary{border-color:rgba(0,255,204,.60);background:rgba(0,255,204,.12);color:#bfffee}
#s936SuitePro .s936-ed-btn.warn{border-color:rgba(255,216,77,.65);background:rgba(255,216,77,.10);color:#ffe066}
#s936SuitePro .s936-ed-btn.danger{border-color:rgba(255,90,90,.65);background:rgba(255,90,90,.10);color:#ffb9b9}
#s936SuitePro .s936-ed-status{min-height:16px;margin-top:8px;color:#bfffee;font-size:.62rem;font-weight:800;line-height:1.35}
#s936SuitePro .s936-ed-name-tools{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px}
#s936SuitePro .s936-ed-check{display:flex;align-items:center;gap:5px;color:rgba(255,255,255,.68);font-size:.58rem;font-weight:800}
#s936SuitePro .s936-ed-alt{color:rgba(255,255,255,.58);font-size:.57rem;line-height:1.35}
#s936SuitePro .s936-ed-manual-toggle{width:auto;display:inline-flex;gap:12px;align-items:center;justify-content:space-between;margin-top:9px;border:1px solid rgba(255,216,77,.42);border-radius:12px;background:rgba(255,216,77,.07);color:#ffe066;padding:9px 10px;font-size:.61rem;font-weight:950;text-transform:uppercase;cursor:pointer}
#s936SuitePro .s936-ed-manual-toggle span:last-child{font-size:.8rem}
#s936SuitePro .s936-ed-manual{border:1px solid rgba(255,216,77,.24);border-radius:14px;background:rgba(255,216,77,.035);padding:9px;margin-top:7px}
#s936SuitePro .s936-ed-manual[hidden]{display:none}
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
#s936SuitePro .s936-ed-result{border:1px solid rgba(0,255,204,.29);border-radius:13px;background:rgba(0,255,204,.055);padding:10px;margin-top:9px}
#s936SuitePro .s936-ed-result-title{color:#8affff;font-size:.58rem;font-weight:950;text-transform:uppercase;letter-spacing:.7px;margin-bottom:7px}
#s936SuitePro .s936-ed-result-line{display:grid;grid-template-columns:90px minmax(0,1fr);gap:7px;margin:5px 0;font-size:.61rem;line-height:1.35}
#s936SuitePro .s936-ed-result-line b{color:#ffe066}
#s936SuitePro .s936-ed-result-line span{color:#e9ffff;overflow-wrap:anywhere}
#s936SuitePro .s936-ed-result-name{display:grid;grid-template-columns:90px minmax(0,1fr);gap:7px;align-items:center}
#s936SuitePro .s936-ed-result-name b{color:#ffe066;font-size:.61rem}
#s936SuitePro .s936-ed-result-name .s936-ed-input{padding:7px 8px}
#s936SuitePro .s936-ed-tab{margin:7px 0 0;padding:8px;border-radius:10px;background:#050707;color:#bfffee;font:700 .58rem/1.35 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre;overflow:auto}
#s936SuitePro .s936-ed-visual-note{border-left:3px solid #ffe066;padding-left:9px;margin-top:10px;color:rgba(255,255,255,.72);font-size:.62rem;line-height:1.45}

/* Compact traditional chord map inside the Editor dock */
#s936SuitePro .s936-ed-guitar-card{border:1px solid rgba(0,255,204,.34);border-radius:15px;background:linear-gradient(180deg,rgba(0,255,204,.075),rgba(0,0,0,.18));padding:9px;margin-top:9px}
#s936SuitePro .s936-ed-guitar-card-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:5px}
#s936SuitePro .s936-ed-guitar-card-name{color:#fff;font-size:.76rem;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#s936SuitePro .s936-ed-guitar-card-order{color:#ffe066;font:900 .50rem/1 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:nowrap}
#s936SuitePro .s936-ed-guitar-shape{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:5px 0 2px;color:rgba(255,255,255,.60);font-size:.51rem}
#s936SuitePro .s936-ed-guitar-shape code{color:#bfffee;font:900 .62rem/1.2 ui-monospace,SFMono-Regular,Consolas,monospace}
#s936SuitePro .s936-ed-fret-range{display:grid;grid-template-columns:auto 28px 54px 28px;gap:5px;align-items:center;margin:5px 0 6px}
#s936SuitePro .s936-ed-fret-range label{color:rgba(255,255,255,.62);font-size:.50rem;font-weight:900;text-transform:uppercase;white-space:nowrap}
#s936SuitePro .s936-ed-fret-range button{height:27px;border:1px solid rgba(255,255,255,.16);border-radius:8px;background:rgba(255,255,255,.055);color:#fff;font-size:.66rem;font-weight:950;cursor:pointer;padding:0}
#s936SuitePro .s936-ed-fret-range button:hover{border-color:#00ffcc;background:rgba(0,255,204,.12)}
#s936SuitePro .s936-ed-fret-range input{height:27px;width:100%;box-sizing:border-box;border:1px solid rgba(255,216,77,.38);border-radius:8px;background:rgba(0,0,0,.30);color:#ffe066;text-align:center;font-size:.61rem;font-weight:950;padding:3px}
#s936SuitePro .s936-ed-dock-chart{display:flex;justify-content:center;align-items:center;min-height:150px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:radial-gradient(circle at 50% 38%,rgba(0,255,204,.055),transparent 48%),linear-gradient(180deg,rgba(21,35,33,.96),rgba(5,10,10,.98));padding:6px;overflow:hidden}
#s936SuitePro .s936-ed-chord-svg{width:min(100%,230px);height:auto;display:block;overflow:visible;touch-action:manipulation}
#s936SuitePro .s936-ed-chord-svg .string{stroke:rgba(232,236,235,.72);stroke-linecap:round}
#s936SuitePro .s936-ed-chord-svg .fret{stroke:rgba(255,255,255,.33);stroke-width:1.25}
#s936SuitePro .s936-ed-chord-svg .nut{stroke:#ffe8b0;stroke-width:4}
#s936SuitePro .s936-ed-chord-svg .hit{fill:transparent;cursor:pointer}
#s936SuitePro .s936-ed-chord-svg .hit:hover{fill:rgba(0,255,204,.12)}
#s936SuitePro .s936-ed-chord-svg .status-hit{cursor:pointer}
#s936SuitePro .s936-ed-chord-svg .status{font:950 12px/1 system-ui,sans-serif;text-anchor:middle;dominant-baseline:middle;fill:rgba(255,255,255,.78)}
#s936SuitePro .s936-ed-chord-svg .status.open{fill:#00ffcc}
#s936SuitePro .s936-ed-chord-svg .status.mute{fill:#ff8f8f}
#s936SuitePro .s936-ed-chord-svg .fret-number{font:900 9px/1 system-ui,sans-serif;text-anchor:end;dominant-baseline:middle;fill:#ffe066}
#s936SuitePro .s936-ed-chord-svg .string-number{font:900 8px/1 system-ui,sans-serif;text-anchor:middle;fill:rgba(255,255,255,.48)}
#s936SuitePro .s936-ed-chord-svg .dot{fill:#00ffcc;stroke:rgba(0,0,0,.7);stroke-width:1.5}
#s936SuitePro .s936-ed-chord-svg .dot.bass{fill:#ff5bea}
#s936SuitePro .s936-ed-chord-svg .finger{font:950 9px/1 system-ui,sans-serif;text-anchor:middle;dominant-baseline:middle;fill:#00231e;pointer-events:none}
#s936SuitePro .s936-ed-chord-svg .finger.bass{fill:#2a0024}
#s936SuitePro .s936-ed-mini-fingers{display:flex;align-items:center;justify-content:center;gap:5px;margin-top:6px;flex-wrap:wrap}
#s936SuitePro .s936-ed-mini-fingers span{color:rgba(255,255,255,.58);font-size:.49rem;margin-right:2px}
#s936SuitePro .s936-ed-mini-fingers button{width:25px;height:25px;border-radius:50%;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.055);color:#fff;font-size:.53rem;font-weight:950;cursor:pointer}
#s936SuitePro .s936-ed-mini-fingers button:hover{border-color:#00ffcc;background:rgba(0,255,204,.13)}
#s936SuitePro .s936-ed-guitar-card .s936-ed-name-tools{margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,.07)}
#s936SuitePro .s936-ed-guitar-card .s936-ed-alt{display:none}

/* Editor Pro guitar surface outside Suite Pro */
#fretboardContainer.s936-editor-surface-active{display:block!important;overflow:hidden!important;padding:0!important;background:#050707!important}
#fretboardContainer.s936-editor-surface-active > *:not(#s936EditorGuitarSurface):not(#s936EditorDrumSurface){display:none!important}
#s936EditorGuitarSurface{display:flex;flex-direction:column;gap:11px;box-sizing:border-box;width:100%;min-height:100%;padding:14px;background:radial-gradient(circle at 48% 28%,rgba(0,255,204,.045),transparent 38%),#050707;color:#fff}
#s936EditorGuitarSurface .s936-neck-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:2px 2px 0}
#s936EditorGuitarSurface .s936-neck-title{color:#8affff;font-size:.76rem;font-weight:950;text-transform:uppercase;letter-spacing:.8px}
#s936EditorGuitarSurface .s936-neck-meta{margin-top:4px;color:#ffe066;font-size:.65rem;font-weight:900}
#s936EditorGuitarSurface .s936-neck-help{max-width:470px;color:rgba(255,255,255,.68);font-size:.62rem;line-height:1.4;text-align:right}
#s936EditorGuitarSurface .s936-neck-scroll{overflow:auto;border:1px solid rgba(255,216,77,.36);border-radius:19px;background:linear-gradient(180deg,rgba(68,31,15,.96),rgba(29,15,9,.98) 48%,rgba(55,25,13,.96));padding:10px 11px 13px;box-shadow:0 18px 45px rgba(0,0,0,.32),inset 0 0 40px rgba(255,171,71,.045);position:relative}
#s936EditorGuitarSurface .s936-neck-scroll::before{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(7deg,transparent 0 11px,rgba(255,255,255,.018) 12px,transparent 13px 25px);mix-blend-mode:screen}
#s936EditorGuitarSurface .s936-neck-ruler,#s936EditorGuitarSurface .s936-neck-row{display:grid;grid-template-columns:72px 34px 38px repeat(24,minmax(44px,1fr));min-width:1200px;width:100%;box-sizing:border-box;align-items:center;position:relative;z-index:1}
#s936EditorGuitarSurface .s936-neck-ruler{margin-bottom:5px}
#s936EditorGuitarSurface .s936-neck-ruler span{font-size:.48rem;color:rgba(255,255,255,.45);text-align:center}
#s936EditorGuitarSurface .s936-neck-ruler .mark{color:#00ffcc;font-weight:950}
#s936EditorGuitarSurface .s936-neck-ruler .double::after{content:"••";display:block;color:#ffe066;font-size:.42rem;letter-spacing:2px;margin-top:1px}
#s936EditorGuitarSurface .s936-neck-string-label{font-size:.58rem;font-weight:950;color:#fff;padding-right:8px}
#s936EditorGuitarSurface .s936-neck-string-label small{display:block;color:rgba(255,255,255,.45);font-size:.46rem;font-weight:700}
#s936EditorGuitarSurface .s936-neck-cell{height:36px;border:0;border-right:2px solid rgba(214,182,136,.57);background:rgba(255,255,255,.016);color:rgba(255,255,255,.32);font-size:.45rem;cursor:pointer;position:relative;display:flex;align-items:center;justify-content:center;padding:0}
#s936EditorGuitarSurface .s936-neck-cell.fret-one{border-left:6px solid rgba(245,231,197,.94)}
#s936EditorGuitarSurface .s936-neck-cell::before{content:"";position:absolute;left:-1px;right:-1px;top:50%;height:var(--string-width,1px);background:linear-gradient(90deg,#e7e7e7,#868686 34%,#efefef 65%,#8e8e8e);transform:translateY(-50%);opacity:.86;box-shadow:0 1px 0 rgba(0,0,0,.48)}
#s936EditorGuitarSurface .s936-neck-cell:hover{background:rgba(0,255,204,.10);color:#fff}
#s936EditorGuitarSurface .s936-neck-cell.capoblocked{opacity:.22;cursor:not-allowed}
#s936EditorGuitarSurface .s936-neck-cell.open,#s936EditorGuitarSurface .s936-neck-cell.mute{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.045);margin:2px;border-radius:7px;height:29px;color:rgba(255,255,255,.75);font-weight:950}
#s936EditorGuitarSurface .s936-neck-cell.open::before,#s936EditorGuitarSurface .s936-neck-cell.mute::before{display:none}
#s936EditorGuitarSurface .s936-neck-cell.mute.active{background:rgba(255,90,90,.18);border-color:#ff6f6f;color:#ffc1c1}
#s936EditorGuitarSurface .s936-neck-cell.open.active{background:rgba(0,255,204,.15);border-color:#00ffcc;color:#bfffee}
#s936EditorGuitarSurface .s936-neck-cell.on{background:rgba(0,255,204,.11);color:#001c18}
#s936EditorGuitarSurface .s936-neck-dot{width:29px;height:29px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#00ffcc;color:#00231e;font-size:.47rem;font-weight:950;box-shadow:0 0 0 2px rgba(0,255,204,.22),0 0 18px rgba(0,255,204,.34);line-height:1;position:relative;z-index:3}
#s936EditorGuitarSurface .s936-neck-dot.bass{background:#ff5bea;color:#260020;box-shadow:0 0 0 2px rgba(255,91,234,.22),0 0 18px rgba(255,91,234,.34)}
#s936EditorGuitarSurface .s936-neck-dot .finger{margin-top:2px;font-size:.42rem}
#s936EditorGuitarSurface .s936-neck-cell.barre{box-shadow:inset 0 4px 0 rgba(255,216,77,.94),inset 0 -4px 0 rgba(255,216,77,.94)}
#s936EditorGuitarSurface .s936-neck-cell.capo{box-shadow:inset 6px 0 0 rgba(255,216,77,.88)}
#s936EditorGuitarSurface .s936-finger-pop{position:fixed;z-index:99999;display:flex;gap:5px;align-items:center;border:1px solid rgba(0,255,204,.5);border-radius:12px;background:#071112;padding:7px;box-shadow:0 14px 35px rgba(0,0,0,.55)}
#s936EditorGuitarSurface .s936-finger-pop button{width:30px;height:30px;border-radius:50%;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.07);color:#fff;font-size:.62rem;font-weight:950;cursor:pointer}
#s936EditorGuitarSurface .s936-finger-pop button:hover{border-color:#00ffcc;background:rgba(0,255,204,.14)}
#s936EditorGuitarSurface .s936-finger-pop button.clear{border-color:rgba(255,90,90,.5);color:#ffb9b9}
#s936EditorGuitarSurface .s936-chart-zone{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.10);border-radius:16px;background:rgba(255,255,255,.022);padding:9px}
#s936EditorGuitarSurface .s936-chart-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:7px}
#s936EditorGuitarSurface .s936-chart-head b{color:#ffe066;font-size:.66rem;text-transform:uppercase;letter-spacing:.7px}
#s936EditorGuitarSurface .s936-chart-head span{color:rgba(255,255,255,.52);font-size:.55rem}
#s936EditorGuitarSurface .s936-chart-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(108px,128px));justify-content:center;gap:7px;width:100%;padding-bottom:3px}
#s936EditorGuitarSurface .s936-chart-card{flex:0 0 108px;border:1px solid rgba(255,255,255,.11);border-radius:12px;background:rgba(0,0,0,.24);color:#fff;padding:7px;cursor:pointer;text-align:left}
#s936EditorGuitarSurface .s936-chart-card.active{border-color:#00ffcc;background:rgba(0,255,204,.08);box-shadow:0 0 0 1px rgba(0,255,204,.12) inset}
#s936EditorGuitarSurface .s936-chart-name{display:block;color:#fff;font-size:.58rem;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#s936EditorGuitarSurface .s936-chart-meta{display:block;color:#ffe066;font-size:.46rem;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#s936EditorGuitarSurface .s936-mini-chart{height:62px;margin-top:6px;position:relative;border-top:2px solid rgba(255,255,255,.62);background:repeating-linear-gradient(to bottom,transparent 0,transparent 11px,rgba(255,255,255,.20) 12px),repeating-linear-gradient(to right,transparent 0,transparent 13px,rgba(255,255,255,.22) 14px)}
#s936EditorGuitarSurface .s936-mini-dot{position:absolute;width:12px;height:12px;border-radius:50%;background:#00ffcc;color:#00231e;font-size:.36rem;font-weight:950;display:flex;align-items:center;justify-content:center;transform:translate(-50%,-50%)}
#s936EditorGuitarSurface .s936-mini-open{position:absolute;top:-15px;font-size:.42rem;color:#bfffee;transform:translateX(-50%)}
#s936EditorGuitarSurface .s936-mini-muted{position:absolute;top:-15px;font-size:.42rem;color:#ffb9b9;transform:translateX(-50%)}
#s936EditorGuitarSurface .s936-chart-empty{height:62px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.40);font-size:.50rem;text-align:center}

#s936SuitePro .s936-ed-drum-panel{display:grid;gap:9px;margin-top:10px}
#s936SuitePro .s936-ed-drum-panel .s936-ed-drum-head{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
#s936SuitePro .s936-ed-drum-panel .s936-ed-drum-head b{color:#ffd36d;font-size:.72rem;text-transform:uppercase;letter-spacing:.55px}
#s936SuitePro .s936-ed-drum-config{display:grid;grid-template-columns:1fr;gap:7px}
#s936SuitePro .s936-ed-drum-config.clean{grid-template-columns:1fr}
#s936SuitePro .s936-ed-drum-config.clean .s936-ed-field[data-kind="pattern"]{display:grid}
#s936SuitePro .s936-ed-drum-panel.wide .s936-ed-drum-config.clean{grid-template-columns:1.2fr 1fr 1fr;align-items:end}
#s936SuitePro .s936-ed-drum-actions{display:flex;flex-wrap:wrap;gap:6px}
#s936SuitePro .s936-ed-drum-mixer{display:grid;gap:5px}
#s936SuitePro .s936-ed-drum-lane{display:grid;grid-template-columns:22px minmax(0,1fr) 26px 26px;gap:5px;align-items:center;border:1px solid rgba(255,255,255,.09);border-radius:9px;padding:6px;background:rgba(255,255,255,.027)}
#s936SuitePro .s936-ed-drum-lane.active{border-color:rgba(0,255,204,.62);box-shadow:0 0 0 2px rgba(0,255,204,.10)}
#s936SuitePro .s936-ed-drum-lane.off{opacity:.42}
#s936SuitePro .s936-ed-drum-lane b{display:block;color:#fff;font-size:.62rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#s936SuitePro .s936-ed-drum-lane input[type=range]{width:100%;accent-color:#ffd36d}
#s936SuitePro .s936-ed-drum-mini{height:24px;border:1px solid rgba(255,255,255,.12);border-radius:7px;background:rgba(255,255,255,.05);color:#fff;font-size:.52rem;font-weight:950;cursor:pointer}
#s936SuitePro .s936-ed-drum-mini.active{background:#ffd36d;color:#1b1300}
#s936SuitePro .s936-ed-drum-grid-wrap{overflow:auto;border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:5px 14px 7px 5px;background:rgba(0,0,0,.16);max-height:340px;-webkit-overflow-scrolling:touch}
#s936SuitePro .s936-ed-drum-grid{display:grid;gap:3px;min-width:max-content}
#s936SuitePro .s936-ed-drum-row{display:grid;grid-template-columns:14px 38px 22px 18px 18px repeat(var(--steps),18px);gap:2px;align-items:center}
#s936SuitePro .s936-ed-drum-panel.wide .s936-ed-drum-row{grid-template-columns:18px 92px 28px 22px 22px repeat(var(--steps),20px);gap:3px}
#s936SuitePro .s936-ed-drum-row.off{opacity:.42}
#s936SuitePro .s936-ed-drum-row.active{filter:drop-shadow(0 0 8px rgba(0,255,204,.22))}
#s936SuitePro .s936-ed-drum-row span{font-size:.50rem;color:rgba(255,255,255,.62);font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#s936SuitePro .s936-ed-drum-row .s936-ed-drum-lane-chip{height:22px;border:1px solid rgba(0,255,204,.20);border-radius:7px;background:rgba(0,255,204,.055);color:#fff;font-size:.48rem;font-weight:950;display:flex;align-items:center;justify-content:center;gap:3px;padding:0 3px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#s936SuitePro .s936-ed-drum-panel.wide .s936-ed-drum-row .s936-ed-drum-lane-chip{justify-content:flex-start;padding:0 6px;height:24px}
#s936SuitePro .s936-ed-drum-row.active .s936-ed-drum-lane-chip{border-color:rgba(0,255,204,.70);box-shadow:0 0 0 2px rgba(0,255,204,.10)}
#s936SuitePro .s936-ed-drum-row .s936-ed-drum-lane-chip em{font-style:normal;color:#ffd36d;font-size:.50rem;min-width:18px;text-align:center} #s936SuitePro .s936-ed-drum-row .s936-ed-drum-lane-chip span{display:none}
#s936SuitePro .s936-ed-drum-panel.wide .s936-ed-drum-row .s936-ed-drum-lane-chip span{display:inline;color:#bfffee;font-size:.48rem;max-width:58px;overflow:hidden;text-overflow:ellipsis}
#s936SuitePro .s936-ed-drum-row input[type=checkbox]{width:13px;height:13px;accent-color:#00ffd0}
#s936SuitePro .s936-ed-drum-row input[type=range]{width:74px;accent-color:#ffd36d}
#s936SuitePro .s936-ed-drum-row .s936-ed-drum-mini{height:19px;width:18px;padding:0;font-size:.45rem}
#s936SuitePro .s936-ed-drum-panel.wide .s936-ed-drum-row .s936-ed-drum-mini{height:22px;width:22px;font-size:.50rem}
#s936SuitePro .s936-ed-drum-step{width:18px;height:18px;border:1px solid rgba(255,255,255,.10);border-radius:5px;background:rgba(255,255,255,.035);cursor:pointer;padding:0}
#s936SuitePro .s936-ed-drum-panel.wide .s936-ed-drum-step{width:20px;height:20px} #s936SuitePro .s936-ed-drum-step.half-a{background:rgba(255,255,255,.032)} #s936SuitePro .s936-ed-drum-step.half-b{background:rgba(0,255,204,.045)} #s936SuitePro .s936-ed-drum-step.bar-start{border-left-color:rgba(255,211,109,.78);box-shadow:-1px 0 0 rgba(255,211,109,.35)} #s936SuitePro .s936-ed-drum-step.mid{border-left-color:rgba(0,255,204,.75);box-shadow:-1px 0 0 rgba(0,255,204,.25)}
#s936SuitePro .s936-ed-drum-step.beat{border-top-color:#ffd36d}
#s936SuitePro .s936-ed-drum-step.on{background:rgba(255,185,70,.60);border-color:#ffc856}
#s936SuitePro .s936-ed-drum-step.accent{background:#fff0a0;border-color:#fff}
#s936SuitePro .s936-ed-drum-vol{position:relative;display:flex;justify-content:center}
#s936SuitePro .s936-ed-drum-vol-btn{width:20px;height:19px;border:1px solid rgba(255,255,255,.12);border-radius:7px;background:rgba(255,255,255,.055);color:#ffd36d;font-size:.58rem;line-height:1;cursor:pointer;padding:0}
#s936SuitePro .s936-ed-drum-panel.wide .s936-ed-drum-vol-btn{width:24px;height:22px;font-size:.64rem}
#s936SuitePro .s936-ed-drum-vol input[type=range]{position:absolute;left:24px;top:-5px;width:88px;display:none;background:rgba(0,0,0,.88);border:1px solid rgba(255,211,109,.25);border-radius:7px;padding:4px;z-index:8}
#s936SuitePro .s936-ed-drum-vol.open input[type=range],#s936SuitePro .s936-ed-drum-vol:focus-within input[type=range],#s936SuitePro .s936-ed-drum-vol:hover input[type=range]{display:block}
#s936SuitePro .s936-ed-drum-ruler{opacity:.72}
#s936SuitePro .s936-ed-drum-ruler .s936-ed-drum-ruler-spacer{height:13px}
#s936SuitePro .s936-ed-drum-ruler .s936-ed-drum-step{height:13px;font-size:.42rem;color:rgba(255,255,255,.55);cursor:default;background:transparent;border-color:transparent;text-align:center}
#s936SuitePro .s936-ed-drum-ruler .s936-ed-drum-step.bar-start{color:#ffd36d;border-left-color:rgba(255,211,109,.55)}
#s936SuitePro .s936-ed-drum-ruler .s936-ed-drum-step.mid{color:#00ffd0;border-left-color:rgba(0,255,204,.55)}
#s936SuitePro .s936-ed-drum-note{color:#bfffee;font-size:.60rem;line-height:1.35}

@media(max-width:760px){
  #s936SuitePro .s936-ed-grid{grid-template-columns:1fr}
  #s936SuitePro .s936-ed-chordline{grid-template-columns:minmax(0,1fr) 72px}
  #s936SuitePro .s936-ed-field.full{grid-column:auto}
  #s936SuitePro .s936-ed-string-head,#s936SuitePro .s936-ed-string-row{grid-template-columns:38px minmax(62px,1fr) minmax(58px,.75fr) minmax(65px,.85fr)}
  #s936EditorGuitarSurface{padding:8px}
  #s936EditorGuitarSurface .s936-neck-head{display:block}
  #s936EditorGuitarSurface .s936-neck-help{text-align:left;margin-top:6px}
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

  function fretOptions(maxFret = stringProfile().maxFret) {
    const list = [["X", "X · apagada"], ["0", "0 · al aire"]];
    for (let i = 1; i <= maxFret; i++) list.push([String(i), String(i)]);
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
    const profile = stringProfile();
    const saved = item?.voicings?.[profile.id] || null;
    if (saved && Array.isArray(saved.frets) && saved.frets.length === profile.strings.length) {
      return StringInstruments.normalizeDraft(item, profile.id);
    }
    if (profile.id !== "guitar") {
      return StringInstruments.normalizeDraft(item, profile.id);
    }
    const suggested = suggestGuitarShape(item || {});
    return {
      instrument:profile.id,
      tuning:profile.strings.map(s => s.open),
      frets:suggested.frets.map(value => StringInstruments.normalizeFret(value, profile.maxFret)),
      fingers:suggested.fingers.slice(),
      capo:0,
      barre:{
        enabled:false,
        fret:1,
        fromString:profile.strings.length,
        toString:1,
        finger:"1"
      }
    };
  }

  function calculateGuitar(draft, preferredName) {
    const profile = stringProfile();
    return StringInstruments.calculate(draft, profile.id, {
      noteNameFromMidi,
      detectChord,
      preferFlats:preferFlatsFrom(preferredName)
    });
  }

  function buildResultBox(ctx, options = {}) {
    const box = el(ctx, "div", "s936-ed-result");
    box.appendChild(el(ctx, "div", "s936-ed-result-title", options.title || "Resultado sonoro"));
    const refs = {};

    const nameRow = el(ctx, "div", "s936-ed-result-line");
    nameRow.appendChild(el(ctx, "b", "", "Nombre detectado"));
    refs.name = el(ctx, "span", "", "—");
    nameRow.appendChild(refs.name);
    box.appendChild(nameRow);

    [
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

  function buildGuitarDockCard(ctx, nameInput, nameTools) {
    const profile = stringProfile();
    const box = el(ctx, "section", "s936-ed-guitar-card");
    const head = el(ctx, "div", "s936-ed-guitar-card-head");
    const name = el(ctx, "div", "s936-ed-guitar-card-name", "Acorde");
    const order = el(ctx, "div", "s936-ed-guitar-card-order", `MAPA ${profile.shapeOrder}`);
    head.append(name, order);
    box.appendChild(head);

    const range = el(ctx, "div", "s936-ed-fret-range");
    range.appendChild(el(ctx, "label", "", "Desde traste"));
    const rangePrev = el(ctx, "button", "", "◀");
    rangePrev.type = "button";
    rangePrev.title = "Rango anterior";
    const rangeInput = makeInput(ctx, "number", state.miniStartFret || 1);
    rangeInput.min = "1";
    rangeInput.max = String(Math.max(1, profile.maxFret - 4));
    rangeInput.step = "1";
    rangeInput.title = "Primer traste visible en el mapa pequeño";
    const rangeNext = el(ctx, "button", "", "▶");
    rangeNext.type = "button";
    rangeNext.title = "Rango siguiente";
    range.append(rangePrev, rangeInput, rangeNext);
    box.appendChild(range);

    const chart = el(ctx, "div", "s936-ed-dock-chart");
    box.appendChild(chart);

    const shapeRow = el(ctx, "div", "s936-ed-guitar-shape");
    shapeRow.appendChild(el(ctx, "span", "", "Forma"));
    const shape = el(ctx, "code", "", profile.strings.map(() => "X").join(" "));
    shapeRow.appendChild(shape);
    box.appendChild(shapeRow);

    const manualNameArea = el(ctx, "div", "s936-ed-manual-name");
    manualNameArea.hidden = true;
    manualNameArea.appendChild(nameInput);
    box.appendChild(manualNameArea);
    if (nameTools) box.appendChild(nameTools);

    return {
      box,
      refs:{ name, shape, chart, manualNameArea, rangeInput, rangePrev, rangeNext }
    };
  }

  function renderGuitarDockChart(refs, calculation, handlers, fingerTarget) {
    const chart = refs?.chart;
    if (!chart || !calculation) return;
    chart.innerHTML = "";

    const profile = stringProfile(calculation.instrument || state.instrument);
    const strings = calculation.strings || [];
    const count = profile.strings.length;
    const maxStart = Math.max(1, profile.maxFret - 4);
    const SVG_NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 210 178");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `Mapa compacto editable de ${profile.label.toLowerCase()}`);
    svg.classList.add("s936-ed-chord-svg");

    const positiveFrets = strings
      .map(stringData => Number(stringData?.fret))
      .filter(fret => Number.isFinite(fret) && fret > 0);
    const minPositive = positiveFrets.length ? Math.min(...positiveFrets) : 1;
    const maxPositive = positiveFrets.length ? Math.max(...positiveFrets) : 1;
    let autoBaseFret = minPositive > 4 ? minPositive : 1;
    if (maxPositive - autoBaseFret > 4) autoBaseFret = Math.max(1, maxPositive - 4);
    autoBaseFret = clamp(autoBaseFret, 1, maxStart);
    if (!Number.isFinite(Number(state.miniStartFret))) state.miniStartFret = autoBaseFret;
    const baseFret = clamp(Number(state.miniStartFret) || autoBaseFret, 1, maxStart);
    if (refs.rangeInput) refs.rangeInput.value = String(baseFret);

    const x0 = count === 6 ? 43 : 58;
    const xGap = count > 1 ? (count === 6 ? 25 : 31) : 0;
    const y0 = 36;
    const yGap = 25;
    const stringX = index => x0 + index * xGap;
    const endX = stringX(count - 1);
    const makeSvg = (tag, attrs = {}) => {
      const node = document.createElementNS(SVG_NS, tag);
      Object.entries(attrs).forEach(([key,value]) => node.setAttribute(key, String(value)));
      return node;
    };

    strings.forEach((stringData, index) => {
      const x = stringX(index);
      const fret = stringData?.fret ?? null;
      const statusHit = makeSvg("rect", {
        x:x - 11, y:5, width:22, height:24, rx:6,
        class:"status-hit", fill:"transparent"
      });
      statusHit.addEventListener("click", () => {
        handlers?.setFret?.(index, fret === null ? 0 : null);
      });
      svg.appendChild(statusHit);

      const status = makeSvg("text", {
        x, y:18,
        class:`status ${fret === null ? "mute" : fret === 0 ? "open" : ""}`
      });
      status.textContent = fret === null ? "×" : fret === 0 ? "○" : "•";
      svg.appendChild(status);

      const number = makeSvg("text", { x, y:174, class:"string-number" });
      number.textContent = String(profile.strings[index].number);
      svg.appendChild(number);
    });

    if (baseFret === 1) {
      svg.appendChild(makeSvg("line", {
        x1:x0, x2:endX, y1:y0, y2:y0, class:"nut"
      }));
    }

    for (let row = 0; row <= 5; row++) {
      const y = y0 + row * yGap;
      svg.appendChild(makeSvg("line", {
        x1:x0, x2:endX, y1:y, y2:y, class:"fret"
      }));
    }

    strings.forEach((stringData, index) => {
      const x = stringX(index);
      const line = makeSvg("line", {
        x1:x, x2:x, y1:y0, y2:y0 + 5 * yGap,
        class:"string"
      });
      line.setAttribute("stroke-width", String(Math.max(.9, 3.3 - index * (2.4 / Math.max(1,count-1)))));
      svg.appendChild(line);
    });

    if (baseFret > 1) {
      const base = makeSvg("text", {
        x:x0 - 10, y:y0 + yGap / 2,
        class:"fret-number"
      });
      base.textContent = `${baseFret}fr`;
      svg.appendChild(base);
    }

    for (let row = 0; row < 5; row++) {
      const fret = baseFret + row;
      strings.forEach((stringData, index) => {
        const x = stringX(index);
        const y = y0 + row * yGap;

        const hit = makeSvg("rect", {
          x:x - xGap / 2,
          y,
          width:xGap,
          height:yGap,
          class:"hit"
        });
        hit.setAttribute("aria-label", `Cuerda ${profile.strings[index].number}, traste ${fret}`);
        hit.addEventListener("click", () => handlers?.setFretAndChooseFinger?.(index, fret));
        svg.appendChild(hit);

        if (Number(stringData?.fret) === fret) {
          const cy = y + yGap / 2;
          const isBass = stringData?.midi === calculation.bassMidi;
          const dot = makeSvg("circle", {
            cx:x, cy, r:9.5,
            class:`dot${isBass ? " bass" : ""}`
          });
          svg.appendChild(dot);
          const finger = makeSvg("text", {
            x, y:cy + .5,
            class:`finger${isBass ? " bass" : ""}`
          });
          finger.textContent = stringData?.finger || "•";
          svg.appendChild(finger);
        }
      });
    }

    chart.appendChild(svg);

    if (Number.isInteger(fingerTarget) && fingerTarget >= 0 && fingerTarget < count) {
      const picker = el(null, "div", "s936-ed-mini-fingers");
      picker.appendChild(el(null, "span", "", `Dedo · cuerda ${profile.strings[fingerTarget].number}:`));
      [["1","1"],["2","2"],["3","3"],["4","4"],["T","T"],["","×"]].forEach(([value,label]) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = label;
        btn.addEventListener("click", () => handlers?.setFinger?.(fingerTarget, value));
        picker.appendChild(btn);
      });
      chart.appendChild(picker);
    }
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

  function suiteEditorIsVisible(root) {
    if (!root || !root.querySelector(".s936-ed-module")) return false;
    if (root.hidden || root.getAttribute("aria-hidden") === "true") return false;
    const style = window.getComputedStyle ? window.getComputedStyle(root) : null;
    if (style && (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0)) return false;
    return root.getClientRects ? root.getClientRects().length > 0 : true;
  }

  function watchLifecycle() {
    const root = document.getElementById("s936SuitePro");
    if (!root || lifecycleObserver) return;
    const verify = () => {
      setTimeout(() => {
        if (!suiteEditorIsVisible(root)) {
          try { activeController?.stop?.(); } catch (error) {}
          try { activeController?.destroy?.(); } catch (error) {}
          activeController = null;
          bridge("deactivateEditorSurface");
        }
      }, 0);
    };
    lifecycleObserver = new MutationObserver(verify);
    lifecycleObserver.observe(root, {
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:["class","style","hidden","aria-hidden"]
    });
    document.addEventListener("click", event => {
      const button = event.target?.closest?.("button");
      if (!button || !button.closest("#s936SuitePro")) return;
      const label = String(button.textContent || "").trim().toUpperCase();
      if (label === "CERRAR" || label === "CLOSE") verify();
    }, true);
  }

  function keepInstrumentTabsVisible(tabs) {
    if (!tabs) return;
    tabs.hidden = false;
    tabs.removeAttribute("hidden");
    Object.assign(tabs.style, {
      display:"flex",
      visibility:"visible",
      opacity:"1",
      position:"sticky",
      top:"0",
      zIndex:"999"
    });
    tabs.querySelectorAll(".s936-ed-inst").forEach(button => {
      button.hidden = false;
      button.removeAttribute("hidden");
      Object.assign(button.style, {
        display:"flex",
        visibility:"visible",
        opacity:"1",
        position:"relative",
        inset:"auto"
      });
    });
  }

  function syncPersistentInstrumentTabs(tabs) {
    if (!tabs) return;
    keepInstrumentTabsVisible(tabs);
    tabs.querySelectorAll(".s936-ed-inst").forEach(button => {
      const active = button.dataset.instrument === state.instrument;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    });
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => keepInstrumentTabsVisible(tabs));
    }
  }

  function createPersistentInstrumentTabs(ctx, contentHost) {
    const instruments = document.createElement("div");
    instruments.id = "s936EditorInstrumentTabs";
    instruments.className = "s936-ed-instruments s936-ed-instruments-isolated s936-ed-instruments-persistent";
    instruments.dataset.surfaceIndependent = "true";
    instruments.setAttribute("role", "tablist");
    instruments.setAttribute("aria-label", "Instrumentos del Editor Pro");

    Object.assign(instruments.style, {
      display:"flex",
      flexWrap:"nowrap",
      gap:"5px",
      width:"100%",
      minWidth:"0",
      alignItems:"stretch",
      position:"sticky",
      top:"0",
      zIndex:"40",
      boxSizing:"border-box",
      padding:"7px",
      marginBottom:"8px",
      border:"1px solid rgba(255,255,255,.12)",
      borderRadius:"12px",
      background:"rgba(10,12,18,.96)",
      backdropFilter:"blur(12px)",
      boxShadow:"0 8px 22px rgba(0,0,0,.28)"
    });

    [["piano","Piano"],["guitar","Guitarra"],["ukulele","Ukelele"],["bass","Bajo"],["lead","G. Lead"],["drums","Batería"]].forEach(([key,label]) => {
      const btn = document.createElement("button");
      btn.className = "s936-ed-inst";
      btn.type = "button";
      const fullLabel = key === "lead" ? "Guitarra Lead" : label;
      btn.textContent = label;
      btn.dataset.instrument = key;
      btn.title = fullLabel;
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-label", `Abrir ${fullLabel}`);

      Object.assign(btn.style, {
        display:"flex",
        alignItems:"center",
        justifyContent:"center",
        flex:"1 1 0",
        minWidth:"0",
        width:"auto",
        whiteSpace:"nowrap",
        overflow:"hidden"
      });

      btn.addEventListener("click", () => {
        if (state.instrument === key) return;

        try { activeController?.stop?.(); } catch (error) {}
        try { activeController?.destroy?.(); } catch (error) {}
        activeController = null;

        state.instrument = key;
        state.miniStartFret = null;
        if (key === "bass") state.bassMode = "line";

        syncPersistentInstrumentTabs(instruments);

        // v0.7.2.6: Batería en Editor se engancha al kit visual seguro del Main.
        // No monta superficie pesada dentro del dock; solo cambia el Main a batería.
        if (key === "drums") {
          try { bridge("deactivateEditorSurface"); } catch (_) {}
          try { bridge("renderMainDrumSurface"); } catch (_) {}
          renderModule(ctx, contentHost);
          return;
        }

        let response = bridge("setEditorInstrument", key);

        if (response?.ok === false) {
          setTimeout(() => renderModule(ctx, contentHost), 0);
          return;
        }

        renderModule(ctx, contentHost);
      });

      instruments.appendChild(btn);
    });

    syncPersistentInstrumentTabs(instruments);
    return instruments;
  }


  function renderDrumEditorPanel(ctx, shell, host, data, sections, sectionKeys) {
    const sectionOptions = (data.sectionOptions || sectionKeys.map(k => [k, humanize(k)]))
      .filter(entry => Array.isArray(entry) && sections[entry[0]])
      .map(entry => [entry[0], entry[1] || humanize(entry[0])]);

    let drumSection = state.sectionKey || data.sectionKey || sectionKeys[0] || "intro";
    if (!sections[drumSection]) drumSection = sectionKeys[0] || "intro";

    const fromStore = data.drumPatterns?.[drumSection] || {};
    let pattern = DrumPatterns?.normalize
      ? DrumPatterns.normalize(fromStore, {
          sectionKey:drumSection,
          style:fromStore.style || "auto",
          songStyle:data.style || "funk",
          bpm:data.bpm || 95,
          bars:Math.max(1,Math.min(4,(sections[drumSection] || []).reduce((sum,item) => sum + (Number(item?.bars) || 1),0) || 1))
        })
      : fromStore;

    const drumsHost = el(ctx, "section", "s936-ed-card s936-ed-drums-host");
    const panel = el(ctx, "div", "s936-ed-drum-panel");
    const syncPanelWidth = () => {
      const suite = document.getElementById("s936SuitePro");
      const width = suite?.getBoundingClientRect?.().width || panel.getBoundingClientRect?.().width || window.innerWidth || 0;
      panel.classList.toggle("wide", width > 760);
    };
    syncPanelWidth();
    setTimeout(syncPanelWidth, 80);
    window.addEventListener("resize", syncPanelWidth, {passive:true});
    const head = el(ctx, "div", "s936-ed-drum-head");
    head.appendChild(el(ctx, "b", "", "Batería Pro · patrón por sección"));
    const meta = el(ctx, "span", "s936-ed-drum-note", `${data.bpm || 95} BPM · base activa de la canción`);
    head.appendChild(meta);
    panel.appendChild(head);

    const kitOptions = DrumPatterns?.kits || [["studio","Studio acústica"],["rock","Rock"],["latin","Latin"],["electronic","Electrónica"],["soft","Soft"]];
    const styleOptions = DrumPatterns?.styles || [["auto","Auto según canción"],["funk","Funk"],["pop","Pop"],["rock","Rock"],["bossa","Bossa"],["salsa","Salsa"],["bolero","Bolero"]];
    const sectionSelect = makeSelect(ctx, sectionOptions, drumSection);
    const kitSelect = makeSelect(ctx, kitOptions, pattern.kit || "studio");
    const styleSelect = makeSelect(ctx, styleOptions, pattern.style || "auto");
    const barsSelect = makeSelect(ctx, [["1","16 pasos"],["2","32 pasos"],["4","64 pasos"]], String(pattern.bars || 1));
    const activeSelect = makeSelect(ctx, [["on","Batería ON"],["off","Batería OFF"]], pattern.enabled === false ? "off" : "on");

    const config = el(ctx, "div", "s936-ed-drum-config clean");
    const kitField = field(ctx, "Kit", kitSelect);
    const styleField = field(ctx, "Patrón", styleSelect);
    styleField.setAttribute("data-kind", "pattern");
    const barsField = field(ctx, "Longitud", barsSelect);
    config.append(kitField, styleField, barsField);
    panel.appendChild(config);

    const editorContext = el(ctx, "div", "s936-ed-status",
      `Usando sección superior: ${humanize(drumSection)} · estilo de canción: ${humanize(data.style || "funk")} · canal base ${pattern.enabled === false ? "OFF" : "ON"}`
    );
    panel.appendChild(editorContext);

    const actions = el(ctx, "div", "s936-ed-drum-actions");
    const status = el(ctx, "div", "s936-ed-status", "Elige estilo, aplica patrón y toca el kit visual para escuchar piezas.");
    const applyBtn = button(ctx, "Aplicar patrón", "warn", () => {
      syncConfig();
      const styleForPattern = styleSelect.value === "auto" ? (data.style || "funk") : styleSelect.value;
      pattern = DrumPatterns?.patternForStyle
        ? DrumPatterns.patternForStyle(styleForPattern, drumSection, {
            kit:kitSelect.value,
            bars:Number(barsSelect.value) || 1,
            bpm:data.bpm || 95,
            enabled:activeSelect.value !== "off"
          })
        : pattern;
      pattern.style = styleSelect.value;
      persist("Patrón aplicado a la sección.");
      redraw();
    });
    const clearBtn = button(ctx, "Limpiar", "danger", () => {
      syncConfig();
      Object.values(pattern.lanes || {}).forEach(lane => lane.hits = {});
      pattern.style = "custom";
      persist("Patrón limpiado.");
      redraw();
    });
    const saveBtn = button(ctx, "Guardar batería", "primary", () => {
      syncConfig();
      persist("Batería guardada en la canción.");
      redraw();
    });
    const previewBtn = button(ctx, "Escuchar golpe", "", () => {
      const lane = selectedLane || "kick";
      bridge("triggerEditorDrumLane", lane, .92, pattern);
      bridge("flashEditorDrumLane", lane, .92, 180);
    });
    actions.append(applyBtn, saveBtn, previewBtn, clearBtn);
    panel.append(actions,status);

    const mixer = el(ctx, "div", "s936-ed-drum-mixer");
    // v0.7.2.8: el mixer vive ahora integrado en cada fila del secuenciador.
    // Se conserva esta referencia para compatibilidad interna, pero no se monta como bloque separado.

    const gridTitle = el(ctx, "div", "s936-ed-drum-head");
    gridTitle.appendChild(el(ctx, "b", "", "Mixer + secuenciador por pieza"));
    gridTitle.appendChild(el(ctx, "span", "s936-ed-drum-note", "Una fila compacta: ON · pieza · 🔊 · M/S · pasos guiados"));
    panel.appendChild(gridTitle);

    const gridWrap = el(ctx, "div", "s936-ed-drum-grid-wrap");
    const grid = el(ctx, "div", "s936-ed-drum-grid");
    gridWrap.appendChild(grid);
    panel.appendChild(gridWrap);
    drumsHost.appendChild(panel);
    shell.appendChild(drumsHost);
    host.appendChild(shell);

    let selectedLane = "kick";

    function lanes(){
      return DrumPatterns?.lanes || [
        {id:"kick",label:"Bombo",short:"BD",defaultVolume:.92},
        {id:"snare",label:"Caja",short:"SD",defaultVolume:.82},
        {id:"hatClosed",label:"Hi-hat cerrado",short:"CH",defaultVolume:.58},
        {id:"hatOpen",label:"Hi-hat abierto",short:"OH",defaultVolume:.55},
        {id:"tomHigh",label:"Tom alto",short:"HT",defaultVolume:.72},
        {id:"tomMid",label:"Tom medio",short:"MT",defaultVolume:.74},
        {id:"tomLow",label:"Tom piso",short:"FT",defaultVolume:.78},
        {id:"crash",label:"Crash",short:"CR",defaultVolume:.62},
        {id:"ride",label:"Ride",short:"RD",defaultVolume:.55},
        {id:"percussion",label:"Percusión",short:"PC",defaultVolume:.62}
      ];
    }

    function syncConfig(){
      pattern = DrumPatterns?.normalize
        ? DrumPatterns.normalize(pattern || {}, {
            sectionKey:drumSection,
            style:styleSelect.value,
            songStyle:data.style || "funk",
            kit:kitSelect.value,
            bars:Number(barsSelect.value) || 1,
            bpm:data.bpm || 95
          })
        : pattern;
      pattern.sectionKey = drumSection;
      pattern.kit = kitSelect.value;
      pattern.style = styleSelect.value;
      pattern.bars = Number(barsSelect.value) || 1;
      pattern.bpm = data.bpm || 95;
      pattern.enabled = activeSelect.value !== "off";
    }

    function persist(message){
      const response = bridge("saveDrumPattern", drumSection, pattern);
      bridge("renderMainDrumSurface");
      if(response?.ok === false){
        status.textContent = response.message || "No se pudo guardar la batería.";
        status.style.color = "#ffb3b3";
      }else{
        status.textContent = message || response?.message || "Patrón actualizado.";
        status.style.color = "";
      }
      return response;
    }

    function ensureLane(laneId, def){
      pattern.lanes = pattern.lanes || {};
      pattern.lanes[laneId] = pattern.lanes[laneId] || {
        enabled:true,
        mute:false,
        solo:false,
        volume:def.defaultVolume || .7,
        hits:{}
      };
      pattern.lanes[laneId].hits = pattern.lanes[laneId].hits || {};
      return pattern.lanes[laneId];
    }

    function toggleHit(laneId, step){
      syncConfig();
      const def = lanes().find(item => item.id === laneId) || {};
      const lane = ensureLane(laneId, def);
      const current = Number(lane.hits[step] || 0);
      if(current <= 0) lane.hits[step] = .72;
      else if(current < .9) lane.hits[step] = 1;
      else delete lane.hits[step];
      pattern.style = "custom";
      persist("Golpe actualizado.");
      redraw();
    }

    function redrawMixer(){
      // v0.7.2.8: controles compactos integrados por fila en redrawGrid().
      if (mixer) mixer.innerHTML = "";
    }

    function redrawGrid(){
      grid.innerHTML = "";
      const total = Math.max(16,(Number(pattern.bars) || 1) * 16);
      grid.style.setProperty("--steps", String(total));

      const ruler = el(ctx, "div", "s936-ed-drum-row s936-ed-drum-ruler");
      ruler.style.setProperty("--steps", String(total));
      for (let i = 0; i < 5; i++) ruler.appendChild(el(ctx, "span", "s936-ed-drum-ruler-spacer", ""));
      for(let step=0; step<total; step++){
        const pos = step % 16;
        const label = pos === 0 ? "1" : pos === 4 ? "2" : pos === 8 ? "3" : pos === 12 ? "4" : "";
        ruler.appendChild(el(ctx, "span", "s936-ed-drum-step " + (pos < 8 ? "half-a " : "half-b ") + (pos % 4 === 0 ? "bar-start " : "") + (pos === 8 ? "mid " : ""), label));
      }
      grid.appendChild(ruler);

      lanes().forEach(def => {
        const lane = ensureLane(def.id, def);
        const row = el(ctx, "div", "s936-ed-drum-row" + (def.id === selectedLane ? " active" : "") + (lane.enabled === false ? " off" : ""));
        row.style.setProperty("--steps", String(total));

        const enabled = document.createElement("input");
        enabled.type = "checkbox";
        enabled.checked = lane.enabled !== false;
        enabled.title = `Activar ${def.label}`;
        enabled.addEventListener("change", () => {
          lane.enabled = enabled.checked;
          persist("Canal actualizado.");
          redraw();
        });
        row.appendChild(enabled);

        const chip = el(ctx, "button", "s936-ed-drum-lane-chip", "");
        chip.type = "button";
        chip.title = `${def.label} · tocar / seleccionar`;
        chip.innerHTML = `<em>${def.short || ""}</em><span>${def.label || def.id}</span>`;
        chip.setAttribute("aria-label", def.label || def.id);
        chip.addEventListener("click", () => {
          selectedLane = def.id;
          bridge("triggerEditorDrumLane", def.id, .92, pattern);
          bridge("flashEditorDrumLane", selectedLane, .82, 160);
          redraw();
        });
        row.appendChild(chip);

        const volWrap = el(ctx, "div", "s936-ed-drum-vol");
        const volBtn = el(ctx, "button", "s936-ed-drum-vol-btn", "🔊");
        volBtn.type = "button";
        volBtn.title = `Volumen ${def.label}`;
        const volume = document.createElement("input");
        volume.type = "range";
        volume.min = "0";
        volume.max = "1";
        volume.step = ".01";
        volume.value = String(lane.volume ?? def.defaultVolume ?? .7);
        volume.title = `Volumen ${def.label}`;
        volBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          document.querySelectorAll("#s936SuitePro .s936-ed-drum-vol.open").forEach(node => {
            if (node !== volWrap) node.classList.remove("open");
          });
          volWrap.classList.toggle("open");
        });
        volume.addEventListener("input", () => {
          lane.volume = Number(volume.value);
          persist("Volumen actualizado.");
        });
        volWrap.append(volBtn, volume);
        row.appendChild(volWrap);

        const mute = el(ctx, "button", "s936-ed-drum-mini" + (lane.mute ? " active" : ""), "M");
        mute.type = "button";
        mute.title = `Mute ${def.label}`;
        mute.addEventListener("click", () => {
          lane.mute = !lane.mute;
          persist("Mute actualizado.");
          redraw();
        });
        row.appendChild(mute);

        const solo = el(ctx, "button", "s936-ed-drum-mini" + (lane.solo ? " active" : ""), "S");
        solo.type = "button";
        solo.title = `Solo ${def.label}`;
        solo.addEventListener("click", () => {
          lane.solo = !lane.solo;
          persist("Solo actualizado.");
          redraw();
        });
        row.appendChild(solo);

        for(let step=0; step<total; step++){
          const velocity = Number(lane.hits?.[step] || 0);
          const pos = step % 16;
          const cell = el(ctx, "button", "s936-ed-drum-step" + (pos < 8 ? " half-a" : " half-b") + (pos % 4 === 0 ? " beat bar-start" : "") + (pos === 8 ? " mid" : "") + (velocity > 0 ? " on" : "") + (velocity >= .9 ? " accent" : ""), "");
          cell.type = "button";
          cell.title = `${def.label} · paso ${step + 1}`;
          cell.addEventListener("click", () => toggleHit(def.id, step));
          row.appendChild(cell);
        }
        grid.appendChild(row);
      });
    }

    function redraw(){
      syncConfig();
      meta.textContent = `${data.bpm || 95} BPM · ${pattern.enabled === false ? "batería OFF" : "batería ON"} · ${DrumPatterns?.countHits?.(pattern) || 0} golpes`;
      redrawMixer();
      redrawGrid();
    }

    sectionSelect.addEventListener("change", () => {
      syncConfig();
      persist("Sección anterior guardada.");
      state.sectionKey = sectionSelect.value;
      drumSection = sectionSelect.value;
      bridge("selectEditorSection", drumSection);
      renderModule(ctx, host);
    });
    [kitSelect, styleSelect, barsSelect, activeSelect].forEach(control => {
      control.addEventListener("change", () => {
        syncConfig();
        persist("Configuración actualizada.");
        redraw();
      });
    });

    bridge("renderMainDrumSurface");
    activeController = { stop(){ window.removeEventListener("resize", syncPanelWidth); }, destroy(){ window.removeEventListener("resize", syncPanelWidth); } };
    redraw();
  }


  function render(ctx, host) {
    installStyles();
    watchLifecycle();

    const initialData = getEditorState();
    state.instrument = state.instrument || initialData.instrument || "piano";

    const mount = el(ctx, "div", "s936-ed-module");
    const contentHost = el(ctx, "div", "s936-ed-instrument-content");
    const tabs = createPersistentInstrumentTabs(ctx, contentHost);

    mount.append(tabs, contentHost);
    host.appendChild(mount);
    paint(ctx, contentHost);
  }

  function paint(ctx, host) {
    installStyles();
    try { activeController?.stop?.(); } catch (error) {}
    try { activeController?.destroy?.(); } catch (error) {}
    activeController = null;
    const data = getEditorState();
    const sections = data.sections || {};
    const sectionKeys = Object.keys(sections);
    if (!sectionKeys.length) {
      bridge("deactivateEditorSurface");
      host.appendChild(el(ctx, "section", "s936-ed-card", "No hay secciones disponibles en el proyecto."));
      return;
    }

    state.sectionKey = sections[state.sectionKey] ? state.sectionKey : (data.sectionKey || sectionKeys[0]);
    state.chordIndex = state.chordIndex === null ? (Number(data.chordIndex) || 0) : (Number(state.chordIndex) || 0);
    state.instrument = state.instrument || data.instrument || "piano";
    if (state.instrument === "drums") {
      // v0.7.2.6: enganchar el Editor al kit visual del Main.
      // Esto limpia la guitarra/lead anterior y muestra batería sin cargar el panel pesado.
      try { bridge("deactivateEditorSurface"); } catch (_) {}
      try { bridge("renderMainDrumSurface"); } catch (_) {}
    } else if (state.instrument === "lead") {
      bridge("mountEditorInstrumentSurface", "lead");
    } else {
      bridge("mountEditorInstrumentSurface", state.instrument);
    }

    const seq = Array.isArray(sections[state.sectionKey]) ? sections[state.sectionKey] : [];
    if (state.chordIndex >= seq.length) state.chordIndex = Math.max(0, seq.length - 1);
    const item = seq[state.chordIndex] || { name:"C", bass:"C2", notes:"C3 E3 G3", bars:1 };

    const shell = el(ctx, "div", "s936-ed-shell");
    const card = el(ctx, "section", "s936-ed-card primary");
    const title = el(ctx, "div", "s936-ed-title");
    const titleMain = el(ctx, "div", "s936-ed-title-main");
    const editorTitle = state.instrument === "bass" && state.bassMode !== "position"
      ? "Editor Instrumental · Bass Line"
      : state.instrument === "lead"
        ? "Editor Instrumental · Guitarra Lead"
        : state.instrument === "drums"
          ? "Editor Instrumental · Batería"
          : "Editor Instrumental · Acordes";
    titleMain.appendChild(el(ctx, "h4", "", editorTitle));
    const helpButton = el(ctx, "button", "s936-ed-help", "ⓘ");
    helpButton.type = "button";
    helpButton.title = "Ayuda rápida del Editor Pro";
    helpButton.setAttribute("aria-expanded", "false");
    titleMain.appendChild(helpButton);
    title.appendChild(titleMain);
    title.appendChild(el(ctx, "span", "s936-ed-version", VERSION));
    card.appendChild(title);

    const helpPop = el(ctx, "div", "s936-ed-help-pop");
    helpPop.hidden = true;
    helpPop.appendChild(document.createTextNode(
      state.instrument === "bass" && state.bassMode !== "position"
        ? "Construye una línea de bajo por sección: elige fundamental, escala, patrón, tiempo y duración; luego escribe notas directamente desde el cuello."
        : state.instrument === "lead"
          ? "Crea solos por sección con fundamental, escala, motivo, duración y articulación. Selecciona un paso y toca directamente sobre el cuello."
          : state.instrument === "drums"
            ? "Diseña la batería por sección: activa piezas del kit, dibuja golpes, acentos, fills, mute y solo, y reproduce el patrón al BPM de la canción."
            : isStringInstrument()
              ? `Construye ${stringProfile().label.toLowerCase()} desde el mapa pequeño, el cuello grande o la digitación manual. Las tres vistas permanecen sincronizadas.`
              : "El acorde se calcula, se escucha y se refleja sobre el instrumento principal."
    ));
    const helpLink = el(ctx, "button", "", "Ir a Ayuda");
    helpLink.type = "button";
    helpLink.addEventListener("click", () => bridge("openHelp"));
    helpPop.appendChild(document.createElement("br"));
    helpPop.appendChild(helpLink);
    helpButton.addEventListener("click", () => {
      helpPop.hidden = !helpPop.hidden;
      helpButton.setAttribute("aria-expanded", String(!helpPop.hidden));
    });
    card.appendChild(helpPop);

    shell.appendChild(card);

    if (state.instrument === "lead") {
      const sectionOptionsForLead = (data.sectionOptions || sectionKeys.map(k => [k, humanize(k)]))
        .filter(entry => Array.isArray(entry) && sections[entry[0]])
        .map(entry => [entry[0], entry[1] || humanize(entry[0])]);
      const leadHost = el(ctx, "section", "s936-ed-card s936-ed-lead-host");
      if (!LeadLine) {
        leadHost.appendChild(el(ctx, "div", "s936-ed-status", "Guitarra Lead Pro no está disponible. Revisa que js/suite-pro-lead-line.js cargue antes del Editor."));
      } else {
        activeController = LeadLine.render({
          host:leadHost,
          sectionKey:state.sectionKey,
          sectionName:(sectionOptionsForLead.find(entry => entry[0] === state.sectionKey) || [state.sectionKey,humanize(state.sectionKey)])[1],
          sectionOptions:sectionOptionsForLead,
          sections,
          bpm:data.bpm || 95,
          onSectionChange:key => {
            state.sectionKey = key;
            state.chordIndex = 0;
            bridge("selectEditorSection", key);
            renderModule(ctx, host);
          }
        });
      }
      shell.appendChild(leadHost);
      host.appendChild(shell);
      return;
    }

    if (state.instrument === "drums") {
      renderDrumEditorPanel(ctx, shell, host, data, sections, sectionKeys);
      return;
    }

    if (state.instrument === "bass" && state.bassMode !== "position" && !BassLine) {
      state.bassMode = "position";
      const warning = el(ctx, "div", "s936-ed-status", "Bass Line Pro no está disponible; se abrió el modo Posición / voicing.");
      card.appendChild(warning);
    }

    if (state.instrument === "bass" && state.bassMode !== "position" && BassLine) {
      const sectionOptionsForBass = (data.sectionOptions || sectionKeys.map(k => [k, humanize(k)]))
        .filter(entry => Array.isArray(entry) && sections[entry[0]])
        .map(entry => [entry[0], entry[1] || humanize(entry[0])]);
      const bassHost = el(ctx, "section", "s936-ed-card s936-ed-bass-host");
      activeController = BassLine.render({
        host:bassHost,
        sectionKey:state.sectionKey,
        sectionName:(sectionOptionsForBass.find(entry => entry[0] === state.sectionKey) || [state.sectionKey,humanize(state.sectionKey)])[1],
        sectionOptions:sectionOptionsForBass,
        sections,
        bpm:data.bpm || 95,
        onSectionChange:key => {
          state.sectionKey = key;
          state.chordIndex = 0;
          bridge("selectEditorSection", key);
          renderModule(ctx, host);
        },
        onPositionMode:() => {
          state.bassMode = "position";
          renderModule(ctx, host);
        }
      });
      shell.appendChild(bassHost);
      host.appendChild(shell);
      return;
    }

    if (state.instrument === "bass" && state.bassMode === "position") {
      const modebar = el(ctx, "div", "s936-bl-modebar");
      const lineButton = el(ctx, "button", "", "Línea / patrón");
      lineButton.type = "button";
      lineButton.addEventListener("click", () => {
        state.bassMode = "line";
        renderModule(ctx, host);
      });
      const positionButton = el(ctx, "button", "active", "Posición / voicing");
      positionButton.type = "button";
      modebar.append(lineButton, positionButton);
      card.appendChild(modebar);
    }

    const sectionOptions = (data.sectionOptions || sectionKeys.map(k => [k, humanize(k)]))
      .filter(entry => Array.isArray(entry) && sections[entry[0]])
      .map(entry => [entry[0], entry[1] || humanize(entry[0])]);

    const sectionSelect = makeSelect(ctx, sectionOptions, state.sectionKey);
    const chordSelect = makeSelect(
      ctx,
      seq.map((ch,index) => [String(index), `${index + 1}. ${ch.name || "Acorde"}`]),
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
    let result = null;

    nameInput.readOnly = !state.manualName;
    manualCheck.addEventListener("change", () => {
      state.manualName = manualCheck.checked;
      nameInput.readOnly = !state.manualName;
      if (result?.refs?.manualNameArea) result.refs.manualNameArea.hidden = !state.manualName;
      if (!state.manualName) recalculate();
    });

    let pianoDraft = null;
    let pianoModeSelect = null;
    let pianoPatternInput = null;

    const grid = el(ctx, "div", "s936-ed-grid");
    grid.appendChild(field(ctx, "Sección", sectionSelect, true));
    const chordLine = el(ctx, "div", "s936-ed-chordline");
    chordLine.appendChild(field(ctx, "Acorde", chordSelect, false));
    chordLine.appendChild(field(ctx, "Compases", barsInput, false));
    grid.appendChild(chordLine);

    if (!isStringInstrument()) {
      const nameField = field(ctx, "Nombre del acorde", nameInput, true);
      nameField.appendChild(nameTools);
      grid.appendChild(nameField);

      if (state.instrument === "piano" && PianoEditor) {
        pianoDraft = PianoEditor.normalize(item);
        bassInput.value = pianoDraft.leftHand.notes.join(" ");
        notesInput.value = pianoDraft.rightHand.notes.join(" ");
        pianoModeSelect = makeSelect(ctx, PianoEditor.modes, pianoDraft.leftHand.mode);
        pianoPatternInput = makeInput(ctx, "text", pianoDraft.leftHand.pattern.join(" "));

        bassInput.placeholder = "C2 C3";
        pianoPatternInput.placeholder = "C2 C3 C2 C3";
        notesInput.placeholder = "E3 G3 B3 D4";

        const pianoLeftLine = el(ctx, "div", "s936-ed-piano-leftline");
        pianoLeftLine.appendChild(field(ctx, "Mano izquierda · bajos", bassInput, false));
        pianoLeftLine.appendChild(field(ctx, "Modo", pianoModeSelect, false));
        pianoLeftLine.appendChild(field(ctx, "Patrón", pianoPatternInput, false));
        grid.appendChild(pianoLeftLine);
        grid.appendChild(field(ctx, "Mano derecha · acorde completo", notesInput, true));
      } else {
        grid.appendChild(field(ctx, "Bajo", bassInput, false));
        grid.appendChild(field(ctx, "Notas sonoras", notesInput, true));
      }
    }
    card.appendChild(grid);

    const status = el(ctx, "div", "s936-ed-status");
    result = isStringInstrument()
      ? buildGuitarDockCard(ctx, nameInput, nameTools)
      : buildResultBox(ctx, { title:"Resultado sonoro" });
    if (result?.refs?.manualNameArea) result.refs.manualNameArea.hidden = !state.manualName;

    let guitarDraft = null;
    let guitarControls = null;
    let latestCalculation = null;
    let visualTimer = null;
    let visualSerial = 0;
    let dockFingerTarget = null;

    if (isStringInstrument()) {
      const profile = stringProfile();
      const stringCount = profile.strings.length;
      const maxStartFret = Math.max(1, profile.maxFret - 4);
      bassInput.readOnly = true;
      notesInput.readOnly = true;
      guitarDraft = normalizeGuitarDraft(item);

      card.appendChild(result.box);

      const fretStops = [1,5,9,13,17,20].filter(value => value <= maxStartFret).concat(maxStartFret).filter((value,index,array) => array.indexOf(value) === index).sort((a,b) => a-b);
      const setMiniStartFret = value => {
        state.miniStartFret = clamp(Number(value) || 1, 1, maxStartFret);
        if (result?.refs?.rangeInput) result.refs.rangeInput.value = String(state.miniStartFret);
        recalculate();
      };
      result.refs.rangeInput.addEventListener("change", () => setMiniStartFret(result.refs.rangeInput.value));
      result.refs.rangePrev.addEventListener("click", () => {
        const current = clamp(Number(state.miniStartFret) || 1, 1, maxStartFret);
        const previous = [...fretStops].reverse().find(value => value < current) || 1;
        setMiniStartFret(previous);
      });
      result.refs.rangeNext.addEventListener("click", () => {
        const current = clamp(Number(state.miniStartFret) || 1, 1, maxStartFret);
        const next = fretStops.find(value => value > current) || maxStartFret;
        setMiniStartFret(next);
      });

      const manualToggle = el(ctx, "button", "s936-ed-manual-toggle");
      manualToggle.type = "button";
      const toggleText = el(ctx, "span", "", state.manualPanelOpen ? "Ocultar digitación manual" : "Editar digitación manualmente");
      const toggleIcon = el(ctx, "span", "", state.manualPanelOpen ? "▴" : "▾");
      manualToggle.append(toggleText, toggleIcon);
      card.appendChild(manualToggle);

      const guitarBox = el(ctx, "section", "s936-ed-manual");
      guitarBox.hidden = !state.manualPanelOpen;
      const guitarHead = el(ctx, "div", "s936-ed-guitar-head");
      guitarHead.appendChild(el(ctx, "b", "", `Digitación exacta · ${stringCount} cuerdas`));
      guitarHead.appendChild(el(ctx, "span", "s936-ed-alt", "Sincronizada con el cuello grande"));
      guitarBox.appendChild(guitarHead);

      const head = el(ctx, "div", "s936-ed-string-head");
      ["Cuerda","Traste","Dedo","Nota"].forEach(label => head.appendChild(el(ctx, "span", "", label)));
      guitarBox.appendChild(head);

      const fretSelects = [];
      const fingerSelects = [];
      const noteLabels = [];

      activeStrings().forEach((string, i) => {
        const row = el(ctx, "div", "s936-ed-string-row");
        const label = el(ctx, "div", "s936-ed-string-label", `${string.number} · ${string.label}`);
        label.appendChild(el(ctx, "span", "", string.open));
        row.appendChild(label);

        const fret = makeSelect(ctx, fretOptions(profile.maxFret), guitarDraft.frets[i] === null ? "X" : String(guitarDraft.frets[i]), "s936-ed-mini");
        const finger = makeSelect(ctx, fingerOptions(), guitarDraft.fingers[i], "s936-ed-mini");
        const note = el(ctx, "div", "s936-ed-note-result", "—");
        fretSelects.push(fret);
        fingerSelects.push(finger);
        noteLabels.push(note);
        row.append(fret, finger, note);
        guitarBox.appendChild(row);
      });

      const barreBox = el(ctx, "div", "s936-ed-barre");
      const capoInput = makeInput(ctx, "number", profile.allowCapo ? guitarDraft.capo : 0);
      capoInput.min = "0";
      capoInput.max = String(profile.capoMax || 12);
      capoInput.disabled = !profile.allowCapo;

      const barreEnabledWrap = el(ctx, "label", "s936-ed-check full");
      const barreEnabled = document.createElement("input");
      barreEnabled.type = "checkbox";
      barreEnabled.checked = profile.allowBarre && guitarDraft.barre.enabled;
      barreEnabled.disabled = !profile.allowBarre;
      barreEnabledWrap.appendChild(barreEnabled);
      barreEnabledWrap.appendChild(document.createTextNode(profile.allowBarre ? "Usar barré / cejilla con el dedo" : "Barré no aplica a este instrumento"));

      const barreFret = makeInput(ctx, "number", guitarDraft.barre.fret);
      barreFret.min = "1";
      barreFret.max = String(profile.maxFret);
      barreFret.disabled = !profile.allowBarre;
      const stringOptionsDescending = profile.strings.map(string => [String(string.number),String(string.number)]);
      const stringOptionsAscending = stringOptionsDescending.slice().reverse();
      const fromString = makeSelect(ctx, stringOptionsDescending, guitarDraft.barre.fromString);
      const toString = makeSelect(ctx, stringOptionsAscending, guitarDraft.barre.toString);
      fromString.disabled = !profile.allowBarre;
      toString.disabled = !profile.allowBarre;
      const barreFinger = makeSelect(ctx, [["1","1 · índice"],["2","2 · medio"],["3","3 · anular"],["4","4 · meñique"]], guitarDraft.barre.finger);
      barreFinger.disabled = !profile.allowBarre;

      if (profile.allowCapo) barreBox.appendChild(field(ctx, "Capo externo", capoInput, false));
      if (profile.allowBarre) {
        barreBox.appendChild(barreEnabledWrap);
        barreBox.appendChild(field(ctx, "Traste del barré", barreFret, false));
        barreBox.appendChild(field(ctx, "Desde cuerda", fromString, false));
        barreBox.appendChild(field(ctx, "Hasta cuerda", toString, false));
        barreBox.appendChild(field(ctx, "Dedo del barré", barreFinger, false));

        const applyBarreBtn = button(ctx, "Aplicar barré a cuerdas", "warn", () => {
          const fretValue = clamp(barreFret.value, 1, profile.maxFret);
          const high = Math.max(Number(fromString.value), Number(toString.value));
          const low = Math.min(Number(fromString.value), Number(toString.value));
          activeStrings().forEach((string, i) => {
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
      }
      if (profile.allowCapo || profile.allowBarre) guitarBox.appendChild(barreBox);
      card.appendChild(guitarBox);

      manualToggle.addEventListener("click", () => {
        state.manualPanelOpen = !state.manualPanelOpen;
        guitarBox.hidden = !state.manualPanelOpen;
        toggleText.textContent = state.manualPanelOpen ? "Ocultar digitación manual" : "Editar digitación manualmente";
        toggleIcon.textContent = state.manualPanelOpen ? "▴" : "▾";
      });

      guitarControls = {
        fretSelects, fingerSelects, noteLabels,
        capoInput, barreEnabled, barreFret, fromString, toString, barreFinger
      };

      [...fretSelects, ...fingerSelects, capoInput, barreEnabled, barreFret, fromString, toString, barreFinger]
        .forEach(control => control.addEventListener("change", recalculate));
    } else {
      card.appendChild(result.box);
      bridge("mountEditorInstrumentSurface", "piano");
    }

    const controls = {
      section:sectionSelect, chord:chordSelect, name:nameInput,
      bass:bassInput, notes:notesInput, bars:barsInput
    };

      function collectGuitarDraft() {
      if (!guitarControls) return null;
      const profile = stringProfile();
      return {
        instrument:profile.id,
        tuning:profile.strings.map(s => s.open),
        frets:guitarControls.fretSelects.map(select => StringInstruments.normalizeFret(select.value, profile.maxFret)),
        fingers:guitarControls.fingerSelects.map(select => select.value),
        capo:profile.allowCapo ? clamp(guitarControls.capoInput.value,0,profile.capoMax) : 0,
        barre:{
          enabled:profile.allowBarre && guitarControls.barreEnabled.checked,
          fret:clamp(guitarControls.barreFret.value,1,profile.maxFret),
          fromString:clamp(guitarControls.fromString.value,1,profile.strings.length),
          toString:clamp(guitarControls.toString.value,1,profile.strings.length),
          finger:guitarControls.barreFinger.value || "1"
        }
      };
    }

      function currentPayload() {
      const payload = {
        sectionKey:controls.section.value,
        chordIndex:Number(controls.chord.value) || 0,
        name:controls.name.value.trim() || "Acorde",
        bass:controls.bass.value.trim(),
        notes:controls.notes.value.trim(),
        bars:clamp(controls.bars.value,1,16),
        instrument:state.instrument || "piano"
      };

      if (isStringInstrument() && latestCalculation) {
        payload.name = state.manualName
          ? (controls.name.value.trim() || latestCalculation.detection.primary)
          : latestCalculation.detection.primary;
        payload.bass = latestCalculation.bass;
        payload.notes = latestCalculation.notes;
        payload.exactMidis = latestCalculation.exactMidis;
        payload.exactFrets = latestCalculation.strings.map(s => s.fret);
        payload.exactStrings = latestCalculation.strings;
        payload.capo = latestCalculation.voicing.capo;
        payload.barre = latestCalculation.voicing.barre;
        payload.rootPitchClass = latestCalculation.detection.rootPc;
        payload.voicings = { [state.instrument]:latestCalculation.voicing };
      } else if (state.instrument === "piano" && PianoEditor) {
        const pianoVoicing = PianoEditor.createVoicing({
          leftNotes:controls.bass.value,
          leftMode:pianoModeSelect?.value || "together",
          leftPattern:pianoPatternInput?.value || controls.bass.value,
          rightNotes:controls.notes.value
        });
        const legacy = PianoEditor.legacyFields(pianoVoicing);
        payload.bass = legacy.bass;
        payload.notes = legacy.notes;
        payload.leftHandMidis = parseNoteMidis(pianoVoicing.leftHand.notes.join(" "));
        payload.rightHandMidis = parseNoteMidis(pianoVoicing.rightHand.notes.join(" "));
        payload.pianoMode = pianoVoicing.leftHand.mode;
        payload.pianoPattern = pianoVoicing.leftHand.pattern;
        payload.voicings = { piano:pianoVoicing };
      }
      return payload;
    }

    function setResultNode(node, value) {
      if (!node) return;
      if (node.tagName === "INPUT") node.value = value || "";
      else node.textContent = value || "—";
    }

      function setGuitarControlFret(stringIndex, fret, chooseFinger = false) {
      if (!guitarControls) return;
      const profile = stringProfile();
      const index = clamp(Number(stringIndex), 0, profile.strings.length - 1);
      const normalized = fret === null || String(fret).toUpperCase() === "X"
        ? null
        : clamp(Number(fret), 0, profile.maxFret);
      guitarControls.fretSelects[index].value = normalized === null ? "X" : String(normalized);
      if (normalized === null) guitarControls.fingerSelects[index].value = "";
      else if (normalized === 0) guitarControls.fingerSelects[index].value = "0";
      else if (guitarControls.fingerSelects[index].value === "0") guitarControls.fingerSelects[index].value = "";
      if (normalized !== null && normalized > 0) {
        const maxStart = Math.max(1, profile.maxFret - 4);
        const currentStart = clamp(Number(state.miniStartFret) || 1, 1, maxStart);
        if (normalized < currentStart || normalized > currentStart + 4) {
          state.miniStartFret = Math.min(maxStart, 1 + Math.floor((normalized - 1) / 4) * 4);
        }
      }
      dockFingerTarget = chooseFinger && normalized !== null && normalized > 0 ? index : null;
      recalculate({ immediate:true });
    }

      function setGuitarControlFinger(stringIndex, finger) {
      if (!guitarControls) return;
      const profile = stringProfile();
      const index = clamp(Number(stringIndex), 0, profile.strings.length - 1);
      const value = ["","0","1","2","3","4","T"].includes(String(finger)) ? String(finger) : "";
      guitarControls.fingerSelects[index].value = value;
      dockFingerTarget = null;
      recalculate({ immediate:true });
    }

    function updateResult(name, bass, notes, shape, tab, alternativesText) {
      if (isStringInstrument()) {
        setResultNode(result.refs.name, name || "Sin identificar");
        const profile = stringProfile();
        result.refs.shape.textContent = `${profile.shapeOrder} · ${String(shape || profile.strings.map(() => "X").join("-")).replace(/-/g, " ")}`;
        alternatives.textContent = alternativesText || "";
        renderGuitarDockChart(result.refs, latestCalculation, {
          setFret:(index, fret) => setGuitarControlFret(index, fret, false),
          setFretAndChooseFinger:(index, fret) => setGuitarControlFret(index, fret, true),
          setFinger:(index, finger) => setGuitarControlFinger(index, finger)
        }, dockFingerTarget);
        return;
      }
      setResultNode(result.refs.name, name || "Sin identificar");
      result.refs.bass.textContent = bass || "—";
      result.refs.notes.textContent = notes || "—";
      result.refs.shape.textContent = shape || "—";
      result.refs.tab.textContent = tab || "";
      alternatives.textContent = alternativesText || "";
    }

    function scheduleVisual(payload, immediate = false) {
      clearTimeout(visualTimer);
      const token = ++visualSerial;
      const draw = () => {
        if (token !== visualSerial) return;
        visualTimer = null;
        const response = bridge("showEditorChordVisual", payload);
        if (response?.ok === false) setStatus(status, response.message || "No se pudo visualizar.", true);
      };
      if (immediate) {
        queueMicrotask(draw);
        return;
      }
      visualTimer = setTimeout(draw, 36);
    }

      function recalculate(options = {}) {
      const immediateVisual = !!(options && options.immediate);
      if (isStringInstrument() && guitarControls) {
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
        scheduleVisual(currentPayload(), immediateVisual);
        return;
      }

      const rightMidis = parseNoteMidis(notesInput.value);
      const leftMidis = state.instrument === "piano"
        ? parseNoteMidis(bassInput.value)
        : [noteTokenToMidi(bassInput.value)].filter(Number.isFinite);
      const bassMidi = leftMidis.length ? Math.min(...leftMidis) : null;
      const harmonicMidis = rightMidis.concat(leftMidis);
      const detection = detectChord(harmonicMidis, bassMidi, preferFlatsFrom(nameInput.value || item.name));
      if (!state.manualName && detection.primary) nameInput.value = detection.primary;
      updateResult(
        nameInput.value,
        bassInput.value,
        notesInput.value,
        state.instrument === "piano" ? "Mano izquierda + mano derecha" : "Mapa de notas",
        "",
        detection.alternatives.length ? "Alternativas: " + detection.alternatives.join(" · ") : "Nombre calculado desde las notas."
      );
      if (rightMidis.length || leftMidis.length) scheduleVisual(currentPayload());
    }

    activeController = isStringInstrument() && guitarControls ? {
      stop() {
        clearTimeout(visualTimer);
        visualSerial++;
      },
      setFret(stringIndex, fret) {
        setGuitarControlFret(stringIndex, fret, false);
      },
      setFinger(stringIndex, finger) {
        setGuitarControlFinger(stringIndex, finger);
      },
      selectChord(index) {
        const next = Math.max(0, Math.min(seq.length - 1, Number(index) || 0));
        state.chordIndex = next;
        state.miniStartFret = null;
        bridge("selectEditorChord", state.sectionKey, next);
        renderModule(ctx, host);
      }
    } : null;

    sectionSelect.addEventListener("change", () => {
      state.sectionKey = sectionSelect.value;
      state.chordIndex = 0;
      state.miniStartFret = null;
      bridge("selectEditorSection", state.sectionKey);
      renderModule(ctx, host);
    });

    chordSelect.addEventListener("change", () => {
      state.chordIndex = Number(chordSelect.value) || 0;
      state.miniStartFret = null;
      bridge("selectEditorChord", state.sectionKey, state.chordIndex);
      renderModule(ctx, host);
    });

    notesInput.addEventListener("input", recalculate);
    bassInput.addEventListener("input", recalculate);
    pianoModeSelect?.addEventListener("change", recalculate);
    pianoPatternInput?.addEventListener("input", recalculate);
    nameInput.addEventListener("input", () => {
      if (state.manualName) {
        setResultNode(result.refs.name, nameInput.value || "Acorde");
        if (isStringInstrument()) scheduleVisual(currentPayload());
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

    if (!isStringInstrument()) {
      card.appendChild(el(ctx, "div", "s936-ed-visual-note",
        "Piano: mano izquierda para bajos simples, octavados, simultáneos o alternados; mano derecha para el voicing completo."
      ));
    }
    host.appendChild(shell);

    recalculate({ immediate:true });
    setTimeout(() => {
      if (isStringInstrument()) {
        // v0.7.2: handshake limpio Main → Editor.
        // Primero asegura dueño Editor; luego refresca la superficie con el payload actual.
        bridge("mountEditorInstrumentSurface", state.instrument);
        try { window.Studio936StringSurface?.setInteractionMode?.("play"); } catch (_) {}
        recalculate({ immediate:true });
        scheduleVisual(currentPayload(), true);
        setTimeout(() => scheduleVisual(currentPayload(), true), 80);
        return;
      }
      bridge("selectEditorChord", state.sectionKey, state.chordIndex);
      recalculate();
    }, 0);
  }

  function renderModule(ctx, host) {
    if (!host) return;
    while (host.firstChild) host.removeChild(host.firstChild);
    const tabs = document.getElementById("s936EditorInstrumentTabs");
    keepInstrumentTabsVisible(tabs);
    paint(ctx, host);
    syncPersistentInstrumentTabs(tabs);
  }

  function register() {
    window.Studio936SuiteProModules = window.Studio936SuiteProModules || {};
    window.Studio936DebugEditorInstruments = function () {
    const buttons = Array.from(document.querySelectorAll("#s936SuitePro .s936-ed-inst"));
    return {
      version:VERSION,
      count:buttons.length,
      instruments:buttons.map(button => ({
        key:button.dataset.instrument || "",
        label:String(button.textContent || "").trim(),
        active:button.classList.contains("active"),
        visible:!!(button.offsetWidth || button.offsetHeight || button.getClientRects().length)
      }))
    };
  };

  window.Studio936SuiteProEditor = {
      version:VERSION,
      render,
      externalSetFret(stringIndex, fret) {
        activeController?.setFret?.(stringIndex, fret);
      },
      externalSetFinger(stringIndex, finger) {
        activeController?.setFinger?.(stringIndex, finger);
      },
      externalSelectChord(index) {
        activeController?.selectChord?.(index);
      }
    };
    window.Studio936SuiteProModules.editor = window.Studio936SuiteProEditor;
  }

  register();
})();
