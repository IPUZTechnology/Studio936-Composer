// Studio 936 Composer - Suite Pro Practice Module v1.5
// Scope: Practice tab only. It does not touch app legacy, audio internals, MIDI internals, editor internals or transport internals.
// It reads from Studio936AppBridge and uses existing UI controls through safe clicks/events.
(function () {
  "use strict";

  const STYLE_ID = "s936SuiteProPracticeStyles";
  const STATE_KEY = "s936_suitepro_practice_v1";

  const DEFAULT_STATE = {
    selectedSection: "",
    selectedChordIndex: 0,
    soundInstrument: "",
    instrumentView: "guitar",
    selectedPartIndex: 0,
    followEditor: true
  };

  function loadState() {
    try { return Object.assign({}, DEFAULT_STATE, JSON.parse(localStorage.getItem(STATE_KEY) || "{}")); }
    catch (error) { return Object.assign({}, DEFAULT_STATE); }
  }

  const state = loadState();
  let followTimer = null;
  let followCtx = null;
  let isPracticeFollowing = false;
  let followMode = "section";

  function saveState() {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (error) {}
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#s936SuitePro .s936-pr-shell { display:grid; gap:12px; }
#s936SuitePro .s936-pr-topbar {
  display:grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap:10px;
}
#s936SuitePro .s936-pr-control {
  border:1px solid rgba(255,255,255,.12);
  border-radius:14px;
  background:rgba(255,255,255,.045);
  padding:10px;
}
#s936SuitePro .s936-pr-label {
  display:block;
  color:#ffe066;
  font-size:.62rem;
  font-weight:950;
  text-transform:uppercase;
  letter-spacing:.7px;
  margin-bottom:6px;
}
#s936SuitePro .s936-pr-select {
  width:100%;
  border:1px solid rgba(255,255,255,.16);
  border-radius:10px;
  background:rgba(0,0,0,.32);
  color:#fff;
  padding:9px;
  font-weight:800;
}
#s936SuitePro .s936-pr-hero {
  display:grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr);
  gap:12px;
}
#s936SuitePro .s936-pr-big {
  border:1px solid rgba(0,255,204,.28);
  border-radius:18px;
  background:linear-gradient(135deg, rgba(0,255,204,.10), rgba(255,255,255,.035));
  padding:14px;
}
#s936SuitePro .s936-pr-now-title {
  margin:0 0 6px;
  color:#8affff;
  text-transform:uppercase;
  font-size:.82rem;
  letter-spacing:.8px;
}
#s936SuitePro .s936-pr-chord {
  color:#fff;
  font-size:2.1rem;
  font-weight:950;
  line-height:1;
  margin:4px 0 6px;
}
#s936SuitePro .s936-pr-sub {
  color:rgba(255,255,255,.72);
  font-size:.78rem;
  line-height:1.45;
}
#s936SuitePro .s936-pr-note-row {
  display:flex;
  flex-wrap:wrap;
  gap:6px;
  margin-top:10px;
}
#s936SuitePro .s936-pr-note {
  border:1px solid rgba(0,255,204,.42);
  border-radius:999px;
  padding:5px 9px;
  background:rgba(0,255,204,.08);
  color:#bfffee;
  font-size:.7rem;
  font-weight:900;
}
#s936SuitePro .s936-pr-note.root {
  border-color:rgba(255,216,77,.75);
  background:rgba(255,216,77,.13);
  color:#ffe066;
}
#s936SuitePro .s936-pr-note.ext {
  border-color:rgba(255,80,230,.65);
  background:rgba(255,80,230,.10);
  color:#ffd4fb;
}
#s936SuitePro .s936-pr-actions {
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  margin-top:10px;
}
#s936SuitePro .s936-pr-btn {
  border:1px solid rgba(0,255,204,.45);
  border-radius:999px;
  background:rgba(0,255,204,.08);
  color:#bfffee;
  padding:8px 11px;
  font-size:.68rem;
  font-weight:950;
  cursor:pointer;
}
#s936SuitePro .s936-pr-btn:hover { background:rgba(0,255,204,.15); }
#s936SuitePro .s936-pr-btn.warn {
  border-color:rgba(255,216,77,.7);
  color:#ffe066;
  background:rgba(255,216,77,.10);
}
#s936SuitePro .s936-pr-btn.danger {
  border-color:rgba(255,90,90,.7);
  color:#ffb5b5;
  background:rgba(255,90,90,.10);
}
#s936SuitePro .s936-pr-lane {
  display:flex;
  gap:8px;
  overflow:auto;
  padding:4px 0 10px;
  scroll-snap-type:x proximity;
}
#s936SuitePro .s936-pr-chord-card {
  min-width:150px;
  scroll-snap-align:start;
  border:1px solid rgba(255,255,255,.13);
  border-radius:14px;
  background:rgba(255,255,255,.04);
  padding:10px;
  cursor:pointer;
}
#s936SuitePro .s936-pr-chord-card.active {
  border-color:rgba(0,255,204,.85);
  background:rgba(0,255,204,.13);
  box-shadow:0 0 0 1px rgba(0,255,204,.18) inset;
}
#s936SuitePro .s936-pr-chord-card .num {
  color:#ffe066;
  font-size:.62rem;
  font-weight:950;
}
#s936SuitePro .s936-pr-chord-card .name {
  color:#fff;
  font-size:1rem;
  font-weight:950;
  margin:4px 0;
}
#s936SuitePro .s936-pr-chord-card .meta {
  color:rgba(255,255,255,.66);
  font-size:.66rem;
  line-height:1.35;
}
#s936SuitePro .s936-pr-visual-grid {
  display:grid;
  grid-template-columns:minmax(0, 1fr) minmax(0, 1fr);
  gap:12px;
}
#s936SuitePro .s936-pr-panel {
  border:1px solid rgba(255,255,255,.12);
  border-radius:18px;
  background:rgba(255,255,255,.04);
  padding:12px;
}
#s936SuitePro .s936-pr-panel h4 {
  margin:0 0 8px;
  color:#8affff;
  text-transform:uppercase;
  font-size:.75rem;
  letter-spacing:.7px;
}
#s936SuitePro .s936-pr-keyboard {
  display:flex;
  align-items:flex-end;
  gap:3px;
  min-height:132px;
  padding:10px;
  border-radius:14px;
  background:rgba(0,0,0,.30);
  overflow:auto;
}
#s936SuitePro .s936-pr-key {
  position:relative;
  min-width:24px;
  height:92px;
  border:1px solid rgba(255,255,255,.25);
  border-radius:0 0 6px 6px;
  background:rgba(255,255,255,.90);
  color:#111;
  font-size:.55rem;
  font-weight:950;
  display:flex;
  align-items:flex-end;
  justify-content:center;
  padding-bottom:5px;
}
#s936SuitePro .s936-pr-key.black {
  height:62px;
  min-width:20px;
  background:#080808;
  color:#fff;
  margin-left:-12px;
  margin-right:-12px;
  z-index:2;
  border-color:rgba(255,255,255,.12);
}
#s936SuitePro .s936-pr-key.on { background:#00ffcc; color:#00221d; box-shadow:0 0 0 2px rgba(0,255,204,.35) inset; }
#s936SuitePro .s936-pr-key.root { background:#ffe066; color:#161000; }
#s936SuitePro .s936-pr-key.ext { background:#ff5bea; color:#220018; }
#s936SuitePro .s936-pr-fret {
  width:100%;
  max-width:340px;
  border-radius:14px;
  background:rgba(0,0,0,.28);
  padding:10px;
}
#s936SuitePro .s936-pr-fret-grid {
  display:grid;
  grid-template-columns: 24px repeat(6, 1fr);
  gap:0;
  border-left:3px solid rgba(255,255,255,.45);
}
#s936SuitePro .s936-pr-uke .s936-pr-fret-grid {
  grid-template-columns: 24px repeat(5, 1fr);
}
#s936SuitePro .s936-pr-string-label {
  color:rgba(255,255,255,.65);
  font-size:.55rem;
  font-weight:950;
  display:flex;
  align-items:center;
  justify-content:center;
  height:22px;
}
#s936SuitePro .s936-pr-fret-cell {
  position:relative;
  height:22px;
  border-top:1px solid rgba(255,255,255,.20);
  border-right:1px solid rgba(255,255,255,.18);
}
#s936SuitePro .s936-pr-dot {
  position:absolute;
  left:50%;
  top:50%;
  width:16px;
  height:16px;
  transform:translate(-50%,-50%);
  border-radius:999px;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:.55rem;
  font-weight:950;
  background:#00ffcc;
  color:#00332b;
}
#s936SuitePro .s936-pr-dot.root { background:#ffe066; color:#161000; }
#s936SuitePro .s936-pr-dot.ext { background:#ff5bea; color:#220018; }
#s936SuitePro .s936-pr-lyrics {
  margin-top:10px;
  padding:10px;
  border-radius:12px;
  background:rgba(255,255,255,.06);
  color:rgba(255,255,255,.82);
  line-height:1.45;
  font-size:.75rem;
}
#s936SuitePro .s936-pr-status {
  margin-top:8px;
  color:#ffe066;
  font-size:.7rem;
  font-weight:800;
}

#s936SuitePro .s936-pr-chord-layout {
  display:grid;
  grid-template-columns:minmax(0,.78fr) minmax(260px,.92fr);
  gap:12px;
  align-items:stretch;
}
#s936SuitePro .s936-pr-info-col { min-width:0; }
#s936SuitePro .s936-pr-hero-visual {
  border:1px solid rgba(174,230,70,.62);
  border-radius:14px;
  background:rgba(0,0,0,.22);
  padding:10px;
  min-height:150px;
  display:flex;
  flex-direction:column;
  justify-content:center;
  overflow:auto;
}
#s936SuitePro .s936-pr-hero-visual h5 {
  margin:0 0 8px;
  color:#ffe066;
  font-size:.62rem;
  letter-spacing:.7px;
  text-transform:uppercase;
}
#s936SuitePro .s936-pr-hero-visual .s936-pr-keyboard {
  min-height:104px;
  padding:8px;
}
#s936SuitePro .s936-pr-hero-visual .s936-pr-key {
  min-width:18px;
  height:72px;
  font-size:.48rem;
}
#s936SuitePro .s936-pr-hero-visual .s936-pr-key.black {
  min-width:15px;
  height:50px;
  margin-left:-9px;
  margin-right:-9px;
}
#s936SuitePro .s936-pr-hero-visual .s936-pr-fret {
  max-width:100%;
  padding:8px;
}
#s936SuitePro .s936-pr-hero-visual .s936-pr-fret-cell,
#s936SuitePro .s936-pr-hero-visual .s936-pr-string-label {
  height:20px;
}
#s936SuitePro .s936-pr-run-badge {
  display:inline-flex;
  align-items:center;
  gap:6px;
  border:1px solid rgba(174,230,70,.55);
  border-radius:999px;
  padding:5px 9px;
  color:#d7ff72;
  background:rgba(174,230,70,.10);
  font-size:.64rem;
  font-weight:950;
  text-transform:uppercase;
}
#s936SuitePro .s936-pr-karaoke {
  border:1px solid rgba(174,230,70,.36);
  border-radius:18px;
  background:linear-gradient(135deg, rgba(174,230,70,.08), rgba(255,255,255,.035));
  padding:16px;
}
#s936SuitePro .s936-pr-karaoke-head {
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  margin-bottom:12px;
}
#s936SuitePro .s936-pr-karaoke-title {
  margin:0;
  color:#8affff;
  text-transform:uppercase;
  font-size:.82rem;
  letter-spacing:.8px;
}
#s936SuitePro .s936-pr-karaoke-body {
  display:grid;
  gap:8px;
}
#s936SuitePro .s936-pr-karaoke-line {
  border:1px solid rgba(255,255,255,.10);
  border-radius:12px;
  background:rgba(255,255,255,.045);
  padding:10px 12px;
  color:rgba(255,255,255,.82);
  font-size:1rem;
  line-height:1.45;
}
#s936SuitePro .s936-pr-karaoke-line.current {
  border-color:rgba(255,216,77,.75);
  background:rgba(255,216,77,.10);
  color:#fff4b8;
  box-shadow:0 0 0 1px rgba(255,216,77,.14) inset;
}
#s936SuitePro .s936-pr-karaoke-footer {
  margin-top:12px;
  color:rgba(255,255,255,.68);
  font-size:.72rem;
  line-height:1.45;
}


/* Practice Pro v1.2: rehearsal-first layout */
#s936SuitePro .s936-pr-topbar {
  grid-template-columns: minmax(190px, 1.2fr) minmax(150px, .7fr) minmax(210px, .9fr) minmax(230px, 1fr);
  gap:8px;
}
#s936SuitePro .s936-pr-control {
  padding:8px 10px;
  min-height:0;
}
#s936SuitePro .s936-pr-label {
  margin-bottom:4px;
  font-size:.56rem;
}
#s936SuitePro .s936-pr-select {
  padding:7px 9px;
  font-size:.74rem;
}
#s936SuitePro .s936-pr-karaoke {
  order:1;
  padding:18px;
  border-color:rgba(174,230,70,.55);
}
#s936SuitePro .s936-pr-karaoke-title {
  font-size:.92rem;
}
#s936SuitePro .s936-pr-karaoke-body {
  grid-template-columns:1fr;
}
#s936SuitePro .s936-pr-karaoke-line {
  font-size:1.2rem;
  line-height:1.5;
  padding:12px 14px;
}
#s936SuitePro .s936-pr-karaoke-line.current {
  font-size:1.35rem;
  border-color:rgba(255,216,77,.9);
  background:linear-gradient(135deg, rgba(255,216,77,.16), rgba(0,255,204,.06));
}
#s936SuitePro .s936-pr-hero { order:2; }
#s936SuitePro .s936-pr-panel { order:3; }
#s936SuitePro .s936-pr-chord-card.active {
  transform:translateY(-2px);
}
#s936SuitePro .s936-pr-chord-card.active .num::before {
  content:"▶ ";
  color:#d7ff72;
}
#s936SuitePro .s936-pr-hero-visual {
  min-height:132px;
}
#s936SuitePro .s936-pr-fret-grid.clean-voicing .s936-pr-fret-cell {
  height:24px;
}
#s936SuitePro .s936-pr-fret-meta {
  display:flex;
  flex-wrap:wrap;
  gap:6px;
  margin-top:8px;
  color:rgba(255,255,255,.68);
  font-size:.62rem;
  font-weight:800;
}
#s936SuitePro .s936-pr-legend {
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  margin-top:8px;
  color:rgba(255,255,255,.68);
  font-size:.62rem;
}
#s936SuitePro .s936-pr-legend span {
  display:inline-flex;
  align-items:center;
  gap:5px;
}
#s936SuitePro .s936-pr-swatch {
  width:10px;
  height:10px;
  border-radius:999px;
  display:inline-block;
  background:#00ffcc;
}
#s936SuitePro .s936-pr-swatch.root { background:#ffe066; }
#s936SuitePro .s936-pr-swatch.ext { background:#ff5bea; }
#s936SuitePro .s936-pr-lite-actions {
  display:flex;
  gap:6px;
  flex-wrap:wrap;
}

@media(max-width: 980px){
  #s936SuitePro .s936-pr-topbar,
  #s936SuitePro .s936-pr-hero,
  #s936SuitePro .s936-pr-visual-grid,
  #s936SuitePro .s936-pr-chord-layout { grid-template-columns:1fr; }
}

/* Practice Pro v1.3: compact rehearsal screen */
#s936SuitePro .s936-pr-shell { gap:8px; }
#s936SuitePro .s936-pr-topbar {
  grid-template-columns: minmax(170px, 1fr) minmax(145px, .72fr) minmax(190px, .75fr) minmax(260px, 1.05fr);
  gap:6px;
}
#s936SuitePro .s936-pr-control {
  padding:6px 8px;
  border-radius:12px;
}
#s936SuitePro .s936-pr-label {
  font-size:.52rem;
  margin-bottom:3px;
}
#s936SuitePro .s936-pr-select {
  padding:6px 8px;
  font-size:.72rem;
}
#s936SuitePro .s936-pr-btn {
  padding:6px 9px;
  font-size:.62rem;
}
#s936SuitePro .s936-pr-sub {
  font-size:.68rem;
}
#s936SuitePro .s936-pr-karaoke {
  padding:12px 14px;
}
#s936SuitePro .s936-pr-karaoke-head {
  margin-bottom:8px;
}
#s936SuitePro .s936-pr-karaoke-body {
  gap:6px;
}
#s936SuitePro .s936-pr-karaoke-line {
  font-size:1.32rem;
  line-height:1.32;
  padding:11px 13px;
}
#s936SuitePro .s936-pr-karaoke-line.current {
  font-size:1.65rem;
  line-height:1.28;
}
#s936SuitePro .s936-pr-karaoke-footer {
  display:none;
}
#s936SuitePro .s936-pr-hero {
  grid-template-columns: minmax(0,1fr) minmax(0,1fr);
  gap:8px;
}
#s936SuitePro .s936-pr-big {
  padding:10px;
  border-radius:16px;
}
#s936SuitePro .s936-pr-chord-layout {
  grid-template-columns:minmax(0,.52fr) minmax(230px,.48fr);
  gap:9px;
}
#s936SuitePro .s936-pr-chord {
  font-size:1.72rem;
  margin:3px 0 4px;
}
#s936SuitePro .s936-pr-now-title {
  font-size:.74rem;
  margin-bottom:4px;
}
#s936SuitePro .s936-pr-note-row {
  gap:5px;
  margin-top:7px;
}
#s936SuitePro .s936-pr-note {
  padding:4px 7px;
  font-size:.64rem;
}
#s936SuitePro .s936-pr-actions {
  margin-top:8px;
  gap:6px;
}
#s936SuitePro .s936-pr-hero-visual {
  min-height:112px;
  padding:7px;
  justify-content:flex-start;
  overflow:hidden;
}
#s936SuitePro .s936-pr-hero-visual h5 {
  font-size:.56rem;
  margin-bottom:6px;
}
#s936SuitePro .s936-pr-keyboard {
  min-height:96px;
  padding:6px;
}
#s936SuitePro .s936-pr-hero-visual .s936-pr-keyboard {
  min-height:82px;
}
#s936SuitePro .s936-pr-hero-visual .s936-pr-key {
  min-width:15px;
  height:58px;
  font-size:.42rem;
}
#s936SuitePro .s936-pr-hero-visual .s936-pr-key.black {
  min-width:12px;
  height:40px;
  margin-left:-7px;
  margin-right:-7px;
}
#s936SuitePro .s936-pr-lane {
  display:grid;
  grid-template-columns: repeat(auto-fit, minmax(124px, 1fr));
  gap:7px;
  overflow:visible;
  padding:4px 0 2px;
}
#s936SuitePro .s936-pr-chord-card {
  min-width:0;
  padding:8px;
}
#s936SuitePro .s936-pr-chord-card .name {
  font-size:.92rem;
}
#s936SuitePro .s936-pr-chord-card .meta {
  font-size:.60rem;
}
#s936SuitePro .s936-pr-chord-card .s936-pr-note-row {
  justify-content:space-between;
}
#s936SuitePro .s936-pr-panel {
  padding:10px;
  border-radius:16px;
}
#s936SuitePro .s936-pr-fret {
  max-width:220px;
  padding:7px;
}
#s936SuitePro .s936-pr-chord-diagram {
  display:grid;
  grid-template-columns: 26px repeat(var(--strings), 1fr);
  grid-template-rows: 16px repeat(5, 22px);
  gap:0;
  border-radius:10px;
  background:rgba(0,0,0,.22);
  overflow:hidden;
  border:1px solid rgba(255,255,255,.10);
}
#s936SuitePro .s936-pr-diag-corner,
#s936SuitePro .s936-pr-diag-string,
#s936SuitePro .s936-pr-diag-fret-num,
#s936SuitePro .s936-pr-diag-cell {
  position:relative;
  display:flex;
  align-items:center;
  justify-content:center;
}
#s936SuitePro .s936-pr-diag-string {
  color:rgba(255,255,255,.65);
  font-size:.5rem;
  font-weight:950;
  border-bottom:1px solid rgba(255,255,255,.18);
}
#s936SuitePro .s936-pr-diag-fret-num {
  color:rgba(255,255,255,.58);
  font-size:.48rem;
  font-weight:950;
  border-right:1px solid rgba(255,255,255,.16);
}
#s936SuitePro .s936-pr-diag-cell {
  border-right:1px solid rgba(255,255,255,.16);
  border-bottom:1px solid rgba(255,255,255,.14);
}
#s936SuitePro .s936-pr-diag-cell::before {
  content:"";
  position:absolute;
  top:0;
  bottom:0;
  left:50%;
  width:1px;
  background:rgba(255,255,255,.18);
}
#s936SuitePro .s936-pr-diag-dot {
  position:relative;
  z-index:2;
  width:15px;
  height:15px;
  border-radius:999px;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:.48rem;
  font-weight:950;
  background:#00ffcc;
  color:#002c25;
  box-shadow:0 0 0 1px rgba(0,0,0,.3);
}
#s936SuitePro .s936-pr-diag-dot.root { background:#ffe066; color:#141000; }
#s936SuitePro .s936-pr-diag-dot.ext { background:#ff5bea; color:#26001e; }
#s936SuitePro .s936-pr-fret-meta {
  margin-top:5px;
  font-size:.55rem;
  gap:5px;
}
#s936SuitePro .s936-pr-legend {
  margin-top:5px;
  font-size:.55rem;
  gap:6px;
}
@media(max-width: 1180px){
  #s936SuitePro .s936-pr-topbar,
  #s936SuitePro .s936-pr-hero,
  #s936SuitePro .s936-pr-chord-layout { grid-template-columns:1fr; }
}

/* Practice Pro v1.4: sound vs visual instrument + full-song visual follow */
#s936SuitePro .s936-pr-topbar {
  grid-template-columns: minmax(180px, 1fr) minmax(160px, .72fr) minmax(180px, .70fr) minmax(260px, .95fr);
}
#s936SuitePro .s936-pr-control { padding:5px 8px; }
#s936SuitePro .s936-pr-karaoke-line.current { font-size:1.85rem; }
#s936SuitePro .s936-pr-viewbar {
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  border:1px solid rgba(255,255,255,.10);
  border-radius:14px;
  background:rgba(255,255,255,.035);
  padding:7px 10px;
}
#s936SuitePro .s936-pr-viewbar-title {
  color:#ffe066;
  font-size:.58rem;
  font-weight:950;
  text-transform:uppercase;
  letter-spacing:.7px;
}
#s936SuitePro .s936-pr-viewbar-buttons {
  display:flex;
  flex-wrap:wrap;
  gap:6px;
}
#s936SuitePro .s936-pr-viewbtn {
  border:1px solid rgba(255,255,255,.16);
  border-radius:999px;
  background:rgba(255,255,255,.055);
  color:#fff;
  padding:6px 10px;
  font-size:.60rem;
  font-weight:950;
  cursor:pointer;
  text-transform:uppercase;
}
#s936SuitePro .s936-pr-viewbtn.active {
  border-color:rgba(0,255,204,.75);
  color:#00ffcc;
  background:rgba(0,255,204,.12);
}
#s936SuitePro .s936-pr-mode-pill {
  display:inline-flex;
  align-items:center;
  border:1px solid rgba(255,216,77,.55);
  border-radius:999px;
  padding:4px 8px;
  color:#ffe066;
  background:rgba(255,216,77,.08);
  font-size:.58rem;
  font-weight:950;
  text-transform:uppercase;
  margin-left:6px;
}
#s936SuitePro .s936-pr-lane {
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
}

`;
    document.head.appendChild(style);
  }

  function register() {
    window.Studio936SuiteProModules = window.Studio936SuiteProModules || {};
    window.Studio936SuiteProPractice = { version: "practice-v1.4.1", render };
    window.Studio936SuiteProModules.practice = window.Studio936SuiteProPractice;
  }

  function safe(fn, fallback = null) {
    try { return fn(); } catch (error) { console.warn("Suite Pro Practice:", error); return fallback; }
  }

  function getSnapshot(ctx) {
    return safe(() => ctx.snapshot(), {}) || {};
  }

  function sectionLabel(part, sectionKey) {
    return part?.label || part?.name || sectionKey || "Sección";
  }

  function orderedParts(snap) {
    const arrangement = Array.isArray(snap.arrangement) ? snap.arrangement : [];
    if (arrangement.length) return arrangement.map((part) => ({ section: part.section || part.key || "", label: part.label || part.name || part.section || "" }));
    const sections = snap.sections || {};
    return Object.keys(sections).map((key) => ({ section: key, label: key }));
  }

  function sectionItems(snap, sectionKey) {
    const sections = snap.sections || {};
    const items = Array.isArray(sections[sectionKey]) ? sections[sectionKey] : [];
    return items.map((item, index) => Object.assign({ __index: index }, item || {}));
  }

  function activeSection(snap) {
    const parts = orderedParts(snap);
    const current = snap.currentSection || "";
    if (state.selectedSection && (snap.sections || {})[state.selectedSection]) return state.selectedSection;
    if (current && (snap.sections || {})[current]) return current;
    return parts[0]?.section || Object.keys(snap.sections || {})[0] || "";
  }

  function normalizeChordName(item, ctx, snap) {
    return item?.name || item?.chord || ctx.currentChordName?.() || snap.chordLabel || "Acorde";
  }

  function normalizeNotes(item, ctx, chordName) {
    const raw = String(item?.notes || "").trim();
    let notes = raw ? raw.split(/\s+/).filter(Boolean) : [];
    if (!notes.length && typeof ctx.notesFromChordName === "function") notes = ctx.notesFromChordName(chordName);
    if (!notes.length && typeof ctx.currentChordNotes === "function") notes = ctx.currentChordNotes();
    return notes.filter(Boolean).slice(0, 8);
  }

  function rootOf(chordName, ctx) {
    if (typeof ctx.chordRootName === "function") return ctx.chordRootName(chordName);
    const match = String(chordName || "").match(/^([A-Ga-g])([#b]?)/);
    return match ? match[1].toUpperCase() + (match[2] || "") : "";
  }

  function isExtension(note, root, index) {
    return index > 2 || /7|9|11|13/i.test(String(note || ""));
  }

  function setStatus(ctx, text) {
    const box = ctx.q?.(".s936-pr-status", ctx.content?.()) || document.querySelector("#s936SuitePro .s936-pr-status");
    if (box) box.textContent = text;
  }

  function setSectionInApp(ctx, sectionKey) {
    const select = ctx.byId?.("sectionSelect");
    if (!select || !sectionKey) return false;
    select.value = sectionKey;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function setChordInApp(ctx, index) {
    const select = ctx.byId?.("chordSelect");
    if (!select) return false;
    select.value = String(index);
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function soundInstrumentValue(ctx, snap) {
    const select = ctx.byId?.("instrumentSelect");
    return String(state.soundInstrument || select?.value || snap.instrument || "piano");
  }

  function setSoundInstrument(ctx, value) {
    const select = ctx.byId?.("instrumentSelect");
    state.soundInstrument = value || "";
    saveState();
    if (!select || !value) return false;
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function instrumentOptions(ctx, snap) {
    const select = ctx.byId?.("instrumentSelect");
    if (select && select.options && select.options.length) {
      return Array.from(select.options).map((option) => ({
        value: option.value,
        label: option.textContent || option.value
      }));
    }
    return [
      { value: "piano", label: "Piano" },
      { value: "epiano", label: "Piano eléctrico" },
      { value: "guitar", label: "Guitarra" },
      { value: "ukulele", label: "Ukelele" },
      { value: "organ", label: "Órgano" },
      { value: "sax", label: "Saxo guía" },
      { value: "synth", label: "Synth" }
    ];
  }

  function bpmValue(ctx) {
    return Number(ctx.byId?.("bpmSlider")?.value || ctx.byId?.("bpmDisplay")?.textContent || getSnapshot(ctx).bpm || 95);
  }

  function setBpm(ctx, next) {
    const value = Math.max(50, Math.min(180, Number(next) || 95));
    if (typeof window.setBPM === "function") {
      window.setBPM(value);
      return true;
    }
    const slider = ctx.byId?.("bpmSlider");
    if (slider) {
      slider.value = String(value);
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      slider.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const display = ctx.byId?.("bpmDisplay");
    if (display) display.textContent = String(value);
    return true;
  }

  function startPracticeLoop(ctx) {
    followCtx = ctx;
    followMode = "section";
    isPracticeFollowing = true;
    const data = selectedData(ctx);
    setSectionInApp(ctx, data.sectionKey);
    setChordInApp(ctx, data.index);
    ctx.callBridge?.("startGroove", () => ctx.byId?.("playBtn")?.click());
    render(ctx);
    setTimeout(() => setStatus(ctx, "Loop de sección activo. El timeline avanza por acordes y compases."), 30);
    scheduleNextChord(ctx);
  }

  function startFullSongPractice(ctx) {
    followCtx = ctx;
    followMode = "song";
    isPracticeFollowing = true;
    const snap = getSnapshot(ctx);
    const parts = orderedParts(snap).filter((part) => sectionItems(snap, part.section).length);
    const currentSection = selectedData(ctx).sectionKey;
    const currentPartIndex = Math.max(0, parts.findIndex((part) => part.section === currentSection));
    state.selectedPartIndex = currentPartIndex >= 0 ? currentPartIndex : 0;
    state.selectedSection = parts[state.selectedPartIndex]?.section || currentSection;
    state.selectedChordIndex = 0;
    saveState();
    setSectionInApp(ctx, state.selectedSection);
    setChordInApp(ctx, 0);
    ctx.callBridge?.("playFullSong", () => ctx.byId?.("playSongBtn")?.click());
    render(ctx);
    setTimeout(() => setStatus(ctx, "Canción completa activa. Practice rota secciones y acordes visualmente."), 30);
    scheduleNextChord(ctx);
  }

  function stopPracticeFollowOnly() {
    isPracticeFollowing = false;
    followMode = "section";
    if (followTimer) clearTimeout(followTimer);
    followTimer = null;
  }

  function stopPracticeLoop(ctx) {
    stopPracticeFollowOnly();
    ctx.callBridge?.("stopPlayback", () => ctx.byId?.("playBtn")?.click());
    render(ctx);
    setTimeout(() => setStatus(ctx, "Practice detenido."), 30);
  }

  function scheduleNextChord(ctx) {
    if (followTimer) clearTimeout(followTimer);
    if (!isPracticeFollowing) return;
    const data = selectedData(ctx);
    if (!data.items.length) return;
    const bars = Math.max(1, Number(data.item?.bars) || 1);
    const beatMs = 60000 / Math.max(40, bpmValue(ctx));
    const delay = Math.max(850, bars * 4 * beatMs);
    followTimer = setTimeout(() => {
      if (!isPracticeFollowing) return;
      const latest = selectedData(ctx);
      const total = Math.max(1, latest.items.length);
      const nextIndex = latest.index + 1;

      if (nextIndex < total) {
        state.selectedChordIndex = nextIndex;
      } else if (followMode === "song") {
        const snap = getSnapshot(ctx);
        const parts = orderedParts(snap).filter((part) => sectionItems(snap, part.section).length);
        const currentPartIndex = Math.max(0, Number(state.selectedPartIndex) || 0);
        const nextPartIndex = currentPartIndex + 1;

        if (nextPartIndex >= parts.length) {
          stopPracticeFollowOnly();
          render(ctx);
          setTimeout(() => setStatus(ctx, "Canción completa terminada en Practice."), 30);
          return;
        }

        state.selectedPartIndex = nextPartIndex;
        state.selectedSection = parts[nextPartIndex].section;
        state.selectedChordIndex = 0;
        setSectionInApp(ctx, state.selectedSection);
      } else {
        state.selectedChordIndex = 0;
      }

      saveState();
      setChordInApp(ctx, state.selectedChordIndex);
      render(ctx);
      scheduleNextChord(ctx);
    }, delay);
  }

  function focusChord(ctx, sectionKey, chordIndex) {
    state.selectedSection = sectionKey;
    state.selectedPartIndex = Math.max(0, orderedParts(getSnapshot(ctx)).findIndex((part) => part.section === sectionKey));
    state.selectedChordIndex = Number(chordIndex) || 0;
    saveState();
    setSectionInApp(ctx, sectionKey);
    setChordInApp(ctx, state.selectedChordIndex);
    render(ctx);
    if (isPracticeFollowing) scheduleNextChord(ctx);
  }

  function selectedData(ctx) {
    const snap = getSnapshot(ctx);
    const sectionKey = activeSection(snap);
    const items = sectionItems(snap, sectionKey);
    const safeIndex = Math.max(0, Math.min(state.selectedChordIndex || 0, Math.max(0, items.length - 1)));
    const item = items[safeIndex] || {};
    const nextItem = items[(safeIndex + 1) % Math.max(1, items.length)] || {};
    const parts = orderedParts(snap);
    const indexedPart = parts[Math.max(0, Number(state.selectedPartIndex) || 0)];
    const part = (indexedPart && indexedPart.section === sectionKey) ? indexedPart : (parts.find((p) => p.section === sectionKey) || { section: sectionKey, label: sectionKey });
    const chordName = normalizeChordName(item, ctx, snap);
    const nextName = normalizeChordName(nextItem, ctx, snap);
    const notes = normalizeNotes(item, ctx, chordName);
    const root = rootOf(chordName, ctx);
    return { snap, sectionKey, items, index: safeIndex, item, nextItem, part, chordName, nextName, notes, root };
  }

  function render(ctx) {
    followCtx = ctx;
    installStyles();
    const c = ctx.clearContent();
    ctx.title(c, "Practice Pro", "Play-along modular: sonido separado de vista de notas, karaoke arriba y timeline que rota secciones en canción completa.");

    const shell = ctx.el("div", "s936-pr-shell");
    renderTopbar(ctx, shell);
    renderKaraokePanel(ctx, shell);
    renderHero(ctx, shell);
    renderChordLane(ctx, shell);
    c.appendChild(shell);
    setTimeout(() => {
      const active = c.querySelector(".s936-pr-chord-card.active");
      if (active && typeof active.scrollIntoView === "function") active.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }, 60);
  }

  function renderTopbar(ctx, shell) {
    const data = selectedData(ctx);
    const snap = data.snap;
    const parts = orderedParts(snap);
    const topbar = ctx.el("div", "s936-pr-topbar");

    const sectionBox = controlBox(ctx, "Sección");
    const sectionSelect = ctx.el("select", "s936-pr-select");
    parts.forEach((part) => {
      const option = ctx.el("option", "", sectionLabel(part, part.section));
      option.value = part.section;
      if (part.section === data.sectionKey) option.selected = true;
      sectionSelect.appendChild(option);
    });
    sectionSelect.onchange = () => {
      state.selectedSection = sectionSelect.value;
      state.selectedChordIndex = 0;
      saveState();
      stopPracticeFollowOnly();
      setSectionInApp(ctx, state.selectedSection);
      render(ctx);
    };
    sectionBox.appendChild(sectionSelect);

    const soundBox = controlBox(ctx, "Sonido que escucho");
    const soundSelect = ctx.el("select", "s936-pr-select");
    const currentSound = soundInstrumentValue(ctx, snap);
    instrumentOptions(ctx, snap).forEach((item) => {
      const option = ctx.el("option", "", item.label);
      option.value = item.value;
      if (item.value === currentSound) option.selected = true;
      soundSelect.appendChild(option);
    });
    soundSelect.onchange = () => {
      setSoundInstrument(ctx, soundSelect.value);
      render(ctx);
      setTimeout(() => setStatus(ctx, "Sonido de práctica: " + (soundSelect.options[soundSelect.selectedIndex]?.textContent || soundSelect.value)), 30);
    };
    soundBox.appendChild(soundSelect);

    const bpmBox = controlBox(ctx, "Tempo");
    const bpm = bpmValue(ctx);
    const bpmRow = ctx.el("div", "s936-pr-lite-actions");
    [[-10, "-10"], [-5, "-5"], [5, "+5"], [10, "+10"]].forEach(([delta, label]) => {
      const btn = ctx.el("button", "s936-pr-btn", label);
      btn.type = "button";
      btn.onclick = () => {
        setBpm(ctx, bpmValue(ctx) + delta);
        render(ctx);
      };
      bpmRow.appendChild(btn);
    });
    bpmBox.appendChild(ctx.el("div", "s936-pr-sub", bpm + " BPM"));
    bpmBox.appendChild(bpmRow);

    const actionBox = controlBox(ctx, "Práctica");
    const row = ctx.el("div", "s936-pr-lite-actions");
    addButton(ctx, row, isPracticeFollowing ? "Loop activo" : "Loop sección", () => {
      startPracticeLoop(ctx);
    }, "s936-pr-btn warn");
    addButton(ctx, row, "Canción completa", () => {
      startFullSongPractice(ctx);
    });
    addButton(ctx, row, metronomeLabel(ctx), () => toggleMetronome(ctx), metronomeClass(ctx));
    addButton(ctx, row, "Stop", () => stopPracticeLoop(ctx), "s936-pr-btn danger");
    addButton(ctx, row, "Editor", () => ctx.callBridge?.("openEditor", () => false));
    actionBox.appendChild(row);
    renderInlineViewSelector(ctx, actionBox);

    topbar.append(sectionBox, soundBox, bpmBox, actionBox);
    shell.appendChild(topbar);
  }

  function controlBox(ctx, label) {
    const box = ctx.el("div", "s936-pr-control");
    box.appendChild(ctx.el("span", "s936-pr-label", label));
    return box;
  }

  function addButton(ctx, parent, label, fn, className = "s936-pr-btn") {
    const btn = ctx.el("button", className, label);
    btn.type = "button";
    btn.onclick = fn;
    parent.appendChild(btn);
    return btn;
  }

  function metronomeIsOn(ctx) {
    const btn = ctx.byId?.("metroBtn");
    if (!btn) return false;
    return btn.classList.contains("active") || /ON/i.test(btn.textContent || "");
  }

  function metronomeLabel(ctx) {
    return metronomeIsOn(ctx) ? "Metrónomo ON" : "Metrónomo OFF";
  }

  function metronomeClass(ctx) {
    return "s936-pr-btn" + (metronomeIsOn(ctx) ? " s936-pr-metronome-on" : "");
  }

  function toggleMetronome(ctx) {
    const btn = ctx.byId?.("metroBtn");
    if (btn) btn.click();
    setTimeout(() => render(ctx), 80);
  }

  function renderInlineViewSelector(ctx, parent) {
    const data = selectedData(ctx);
    const resolved = resolveInstrument(ctx, data.snap);
    const box = ctx.el("div", "s936-pr-view-inline");
    const buttons = ctx.el("div", "s936-pr-viewbar-buttons");
    buttons.appendChild(ctx.el("span", "s936-pr-view-inline-label", "Vista para tocar"));
    [
      ["piano", "Piano"],
      ["guitar", "Guitarra"],
      ["ukulele", "Ukelele"]
    ].forEach(([value, label]) => {
      const btn = ctx.el("button", "s936-pr-viewbtn" + (resolved === value ? " active" : ""), label);
      btn.type = "button";
      btn.onclick = () => {
        state.instrumentView = value;
        saveState();
        render(ctx);
      };
      buttons.appendChild(btn);
    });
    const mode = ctx.el("span", "s936-pr-mode-pill", "Vista: " + instrumentLabel(resolved));
    buttons.appendChild(mode);
    box.appendChild(buttons);
    parent.appendChild(box);
  }


  function renderViewbar(ctx, shell) {
    const data = selectedData(ctx);
    const bar = ctx.el("section", "s936-pr-viewbar");

    const left = ctx.el("div", "", "");
    left.appendChild(ctx.el("div", "s936-pr-viewbar-title", "Vista de notas para tocar"));
    const resolved = resolveInstrument(ctx, data.snap);
    const desc = ctx.el("div", "s936-pr-sub", "Esto controla solo el mapa visual. El sonido se elige arriba.");
    left.appendChild(desc);

    const buttons = ctx.el("div", "s936-pr-viewbar-buttons");
    [
      ["piano", "Piano"],
      ["guitar", "Guitarra"],
      ["ukulele", "Ukelele"]
    ].forEach(([value, label]) => {
      const btn = ctx.el("button", "s936-pr-viewbtn" + (resolved === value ? " active" : ""), label);
      btn.type = "button";
      btn.onclick = () => {
        state.instrumentView = value;
        saveState();
        render(ctx);
      };
      buttons.appendChild(btn);
    });

    const mode = ctx.el("span", "s936-pr-mode-pill", "Vista: " + instrumentLabel(resolved));
    buttons.appendChild(mode);

    bar.appendChild(left);
    bar.appendChild(buttons);
    shell.appendChild(bar);
  }

  function renderHero(ctx, shell) {
    const data = selectedData(ctx);
    const hero = ctx.el("div", "s936-pr-hero");

    const now = ctx.el("article", "s936-pr-big");
    const nowLayout = ctx.el("div", "s936-pr-chord-layout");
    const nowInfo = ctx.el("div", "s936-pr-info-col");
    nowInfo.appendChild(ctx.el("h4", "s936-pr-now-title", "Ahora"));
    nowInfo.appendChild(ctx.el("div", "s936-pr-chord", data.chordName));
    nowInfo.appendChild(ctx.el("div", "s936-pr-sub", `${sectionLabel(data.part, data.sectionKey)} · acorde ${data.index + 1}/${Math.max(1, data.items.length)} · ${data.item?.bars || 1} compás(es)`));
    nowInfo.appendChild(noteRow(ctx, data.notes, data.root));
    const nowActions = ctx.el("div", "s936-pr-actions");
    addButton(ctx, nowActions, "Escuchar acorde", () => {
      focusChord(ctx, data.sectionKey, data.index);
      setTimeout(() => ctx.byId?.("previewBtn")?.click(), 120);
    }, "s936-pr-btn warn");
    if (isPracticeFollowing) nowActions.appendChild(ctx.el("span", "s936-pr-run-badge", "Timeline activo"));
    nowInfo.appendChild(nowActions);
    const nowVisual = ctx.el("div", "s936-pr-hero-visual");
    renderInstrumentMini(ctx, nowVisual, data, "Mapa de nota · ahora");
    nowLayout.append(nowInfo, nowVisual);
    now.appendChild(nowLayout);

    const nextData = dataForItem(ctx, data, data.nextItem, data.nextName);
    const next = ctx.el("article", "s936-pr-big");
    const nextLayout = ctx.el("div", "s936-pr-chord-layout");
    const nextInfo = ctx.el("div", "s936-pr-info-col");
    nextInfo.appendChild(ctx.el("h4", "s936-pr-now-title", "Siguiente"));
    nextInfo.appendChild(ctx.el("div", "s936-pr-chord", data.nextName));
    nextInfo.appendChild(ctx.el("div", "s936-pr-sub", "Anticipa el próximo cambio armónico antes de tocarlo."));
    nextInfo.appendChild(noteRow(ctx, nextData.notes, nextData.root));
    nextInfo.appendChild(ctx.el("div", "s936-pr-status", isPracticeFollowing ? "Timeline activo: prepara este acorde antes del cambio." : "Usa Loop sección para avanzar visualmente por la práctica."));
    const nextVisual = ctx.el("div", "s936-pr-hero-visual");
    renderInstrumentMini(ctx, nextVisual, nextData, "Mapa de nota · siguiente");
    nextLayout.append(nextInfo, nextVisual);
    next.appendChild(nextLayout);

    hero.append(now, next);
    shell.appendChild(hero);
  }

  function dataForItem(ctx, base, item, name) {
    return Object.assign({}, base, {
      item,
      chordName: name,
      notes: normalizeNotes(item, ctx, name),
      root: rootOf(name, ctx)
    });
  }

  function renderInstrumentMini(ctx, parent, data, title) {
    const instrument = resolveInstrument(ctx, data.snap);
    parent.appendChild(ctx.el("h5", "", title + " · " + instrumentLabel(instrument)));
    if (instrument === "guitar") renderFretboard(ctx, parent, data, ["E", "A", "D", "G", "B", "E"], false);
    else if (instrument === "ukulele") renderFretboard(ctx, parent, data, ["G", "C", "E", "A"], true);
    else renderKeyboard(ctx, parent, data);

    const recorded = String(data.item?.notes || "").trim();
    if (recorded) parent.appendChild(ctx.el("div", "s936-pr-recorded-note", "Notas grabadas: " + recorded));
  }

  function noteRow(ctx, notes, root) {
    const row = ctx.el("div", "s936-pr-note-row");
    notes.forEach((note, index) => {
      const clean = normalizeNote(note);
      const classes = ["s936-pr-note"];
      if (clean === root || index === 0) classes.push("root");
      else if (isExtension(note, root, index)) classes.push("ext");
      row.appendChild(ctx.el("span", classes.join(" "), note));
    });
    return row;
  }

  function renderChordLane(ctx, shell) {
    const data = selectedData(ctx);
    const panel = ctx.el("section", "s936-pr-panel");
    panel.appendChild(ctx.el("h4", "", "Timeline de práctica"));
    const lane = ctx.el("div", "s936-pr-lane");

    if (!data.items.length) {
      lane.appendChild(ctx.el("p", "s936-pr-sub", "No hay acordes en esta sección todavía."));
    }

    data.items.forEach((item, index) => {
      const name = normalizeChordName(item, ctx, data.snap);
      const card = ctx.el("button", "s936-pr-chord-card" + (index === data.index ? " active" : ""));
      card.type = "button";
      card.onclick = () => focusChord(ctx, data.sectionKey, index);
      card.appendChild(ctx.el("div", "num", String(index + 1).padStart(2, "0")));
      card.appendChild(ctx.el("div", "name", name));
      card.appendChild(ctx.el("div", "meta", `${item?.bars || 1} compás(es)`));
      const notes = normalizeNotes(item, ctx, name);
      const row = ctx.el("div", "s936-pr-note-row");
      notes.slice(0, 4).forEach((n, i) => row.appendChild(ctx.el("span", "s936-pr-note " + (i === 0 ? "root" : ""), n)));
      card.appendChild(row);
      lane.appendChild(card);
    });

    panel.appendChild(lane);
    shell.appendChild(panel);
  }

  function renderKaraokePanel(ctx, shell) {
    const data = selectedData(ctx);
    const panel = ctx.el("section", "s936-pr-karaoke");
    const head = ctx.el("div", "s936-pr-karaoke-head");
    head.appendChild(ctx.el("h4", "s936-pr-karaoke-title", "Letra / Karaoke de práctica"));
    head.appendChild(ctx.el("span", "s936-pr-run-badge", `${sectionLabel(data.part, data.sectionKey)} · ${data.chordName}`));
    panel.appendChild(head);

    const lyric = lyricForSection(data.snap, data.sectionKey);
    const body = ctx.el("div", "s936-pr-karaoke-body");
    const lines = splitLyricLines(lyric);
    if (!lines.length) {
      const empty = ctx.el("div", "s936-pr-karaoke-line current", "Sin letra para esta sección todavía.");
      body.appendChild(empty);
    } else {
      const currentLine = Math.min(lines.length - 1, Math.max(0, data.index % lines.length));
      const visible = [currentLine, currentLine + 1, currentLine + 2]
        .filter((lineIndex) => lineIndex < lines.length);
      visible.forEach((lineIndex, visibleIndex) => {
        body.appendChild(ctx.el("div", "s936-pr-karaoke-line" + (visibleIndex === 0 ? " current" : ""), lines[lineIndex]));
      });
    }
    panel.appendChild(body);
    panel.appendChild(ctx.el("div", "s936-pr-karaoke-footer", "Guía de práctica: toca el acorde activo, mira el siguiente y canta la línea resaltada. Cuando uses Loop sección, el timeline avanza por los compases del arreglo."));
    shell.appendChild(panel);
  }

  function splitLyricLines(text) {
    return String(text || "")
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 32);
  }

  function lineLite(ctx, label, value) {
    const p = ctx.el("p", "s936-sp-line");
    p.appendChild(ctx.el("strong", "", label + ":"));
    p.appendChild(document.createTextNode(" " + (value || "")));
    return p;
  }

  function lyricForSection(snap, sectionKey) {
    const lyrics = snap.lyrics || {};
    return String(lyrics[sectionKey] || "").trim();
  }

  function resolveInstrument(ctx, snap) {
    const wanted = state.instrumentView || "auto";
    if (wanted !== "auto") return wanted;
    const inst = String(snap.instrument || ctx.byId?.("instrumentSelect")?.value || "piano").toLowerCase();
    if (inst.includes("guitar")) return "guitar";
    if (inst.includes("ukulele") || inst.includes("uke")) return "ukulele";
    return "piano";
  }

  function instrumentLabel(value) {
    if (value === "guitar") return "Guitarra";
    if (value === "ukulele") return "Ukelele";
    return "Piano";
  }

  const NOTE_INDEX = { C:0, "C#":1, Db:1, D:2, "D#":3, Eb:3, E:4, F:5, "F#":6, Gb:6, G:7, "G#":8, Ab:8, A:9, "A#":10, Bb:10, B:11 };
  const NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const OPEN_PITCH = { guitar: { E:40, A:45, D:50, G:55, B:59 }, ukulele: { G:67, C:60, E:64, A:69 } };

  function normalizeNote(value) {
    const text = String(value || "").trim()
      .replace(/^Do/i, "C").replace(/^Re/i, "D").replace(/^Mi/i, "E").replace(/^Fa/i, "F")
      .replace(/^Sol/i, "G").replace(/^La/i, "A").replace(/^Si/i, "B");
    const match = text.match(/^([A-Ga-g])([#b]?)/);
    return match ? match[1].toUpperCase() + (match[2] || "") : "";
  }

  function pitchClass(note) {
    const n = normalizeNote(note);
    return NOTE_INDEX[n];
  }

  function renderKeyboard(ctx, parent, data) {
    const keyboard = ctx.el("div", "s936-pr-keyboard");
    const active = new Map();
    data.notes.forEach((note, index) => {
      const pc = pitchClass(note);
      if (pc !== undefined) active.set(pc, index);
    });
    const start = 48; // C3
    const end = 72;   // C5
    for (let midi = start; midi <= end; midi++) {
      const name = NOTE_NAMES[midi % 12];
      const key = ctx.el("div", "s936-pr-key" + (name.includes("#") ? " black" : ""), name.replace("#", "♯"));
      const idx = active.get(midi % 12);
      if (idx !== undefined) {
        key.classList.add("on");
        if (idx === 0 || normalizeNote(data.notes[idx]) === data.root) key.classList.add("root");
        else if (idx > 2) key.classList.add("ext");
      }
      keyboard.appendChild(key);
    }
    parent.appendChild(keyboard);
  }

  function findVoicingCandidate(openMidi, pcs, rootPc, stringIndex, isUkulele) {
    const maxFret = isUkulele ? 7 : 8;
    const candidates = [];
    for (let fret = 0; fret <= maxFret; fret++) {
      const pc = (openMidi + fret) % 12;
      const toneIndex = pcs.indexOf(pc);
      if (toneIndex !== -1) {
        const isRoot = pc === rootPc;
        const lowString = stringIndex <= (isUkulele ? 1 : 2);
        const score = fret + (isRoot && lowString ? -2.5 : 0) + (toneIndex > 2 ? 0.8 : 0);
        candidates.push({ fret, pc, toneIndex, isRoot, score });
      }
    }
    candidates.sort((a, b) => a.score - b.score);
    return candidates[0] || null;
  }

  function renderFretboard(ctx, parent, data, strings, isUkulele) {
    const board = ctx.el("div", "s936-pr-fret " + (isUkulele ? "s936-pr-uke" : ""));
    const stringLabels = isUkulele ? ["G", "C", "E", "A"] : ["E", "A", "D", "G", "B", "E"];
    const stringMidis = isUkulele ? [67, 60, 64, 69] : [40, 45, 50, 55, 59, 64];

    const targetNotes = uniqueChordNotes(data.notes);
    const targetPcs = targetNotes.map((note, index) => ({
      note,
      pc: pitchClass(note),
      toneIndex: index,
      isRoot: normalizeNote(note) === data.root || index === 0,
      extension: isExtension(note, data.root, index)
    })).filter((item) => item.pc !== undefined);

    const choices = assignRecordedChordToStrings(stringMidis, targetPcs, isUkulele);
    const frets = choices.filter(Boolean).map((choice) => choice.fret);
    let baseFret = 0;
    if (frets.length) {
      const positive = frets.filter((fret) => fret > 0);
      const minPositive = positive.length ? Math.min.apply(null, positive) : 0;
      const maxFret = Math.max.apply(null, frets);
      baseFret = Math.max(0, Math.min(minPositive || 0, maxFret - 4));
      if (maxFret - baseFret > 4) baseFret = Math.max(0, maxFret - 4);
    }

    const diagram = ctx.el("div", "s936-pr-chord-diagram");
    diagram.style.setProperty("--strings", String(stringLabels.length));
    diagram.appendChild(ctx.el("div", "s936-pr-diag-corner", baseFret === 0 ? "0" : String(baseFret)));
    stringLabels.forEach((label) => diagram.appendChild(ctx.el("div", "s936-pr-diag-string", label)));

    for (let row = 0; row < 5; row++) {
      const fret = baseFret + row;
      diagram.appendChild(ctx.el("div", "s936-pr-diag-fret-num", String(fret)));
      stringLabels.forEach((label, stringIndex) => {
        const cell = ctx.el("div", "s936-pr-diag-cell");
        const choice = choices[stringIndex];
        if (choice && choice.fret === fret) {
          const noteName = NOTE_NAMES[choice.pc] || normalizeNote(choice.note) || "";
          const dot = ctx.el("span", "s936-pr-diag-dot", noteName.replace("#", "♯"));
          if (choice.isRoot || choice.toneIndex === 0) dot.classList.add("root");
          else if (choice.extension) dot.classList.add("ext");
          cell.appendChild(dot);
        }
        diagram.appendChild(cell);
      });
    }

    board.appendChild(diagram);

    const meta = ctx.el("div", "s936-pr-fret-meta");
    const maxUsed = frets.length ? Math.max.apply(null, frets) : 0;
    meta.appendChild(ctx.el("span", "", (isUkulele ? "Ukelele" : "Guitarra") + " · acorde grabado"));
    meta.appendChild(ctx.el("span", "", "Trastes " + baseFret + "-" + (baseFret + 4)));
    meta.appendChild(ctx.el("span", "", "Raíz: " + (data.root || "—")));
    board.appendChild(meta);

    const legend = ctx.el("div", "s936-pr-legend");
    legend.appendChild(legendItem(ctx, "root", "raíz/bajo"));
    legend.appendChild(legendItem(ctx, "", "notas acorde"));
    legend.appendChild(legendItem(ctx, "ext", "extensiones"));
    board.appendChild(legend);

    parent.appendChild(board);
  }

  function uniqueChordNotes(notes) {
    const seen = new Set();
    return (notes || []).filter((note) => {
      const pc = pitchClass(note);
      if (pc === undefined || seen.has(pc)) return false;
      seen.add(pc);
      return true;
    }).slice(0, 6);
  }

  function assignRecordedChordToStrings(stringMidis, targetPcs, isUkulele) {
    const choices = new Array(stringMidis.length).fill(null);
    const usedStrings = new Set();

    targetPcs.forEach((target, targetIndex) => {
      const candidates = [];
      stringMidis.forEach((openMidi, stringIndex) => {
        if (usedStrings.has(stringIndex)) return;
        const maxFret = isUkulele ? 12 : 14;
        for (let fret = 0; fret <= maxFret; fret++) {
          const pc = (openMidi + fret) % 12;
          if (pc !== target.pc) continue;
          const lowString = stringIndex <= (isUkulele ? 1 : 2);
          const highString = stringIndex >= (isUkulele ? 2 : 3);
          const score =
            Math.abs(fret - 3) +
            (target.isRoot && lowString ? -2.2 : 0) +
            (target.extension && highString ? -0.9 : 0) +
            (target.extension && lowString ? 1.2 : 0) +
            (targetIndex * 0.08);
          candidates.push(Object.assign({}, target, { fret, stringIndex, score }));
        }
      });
      candidates.sort((a, b) => a.score - b.score);
      const choice = candidates[0];
      if (choice) {
        choices[choice.stringIndex] = choice;
        usedStrings.add(choice.stringIndex);
      }
    });

    return choices;
  }

  function legendItem(ctx, toneClass, label) {
    const item = ctx.el("span", "", "");
    item.appendChild(ctx.el("i", "s936-pr-swatch " + toneClass, ""));
    item.appendChild(document.createTextNode(label));
    return item;
  }


  register();
})();
