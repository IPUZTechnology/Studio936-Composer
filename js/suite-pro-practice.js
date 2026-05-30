// Studio 936 Composer - Suite Pro Practice Module v1.10.2
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
  grid-template-columns:minmax(150px,.75fr) minmax(150px,.75fr) minmax(210px,.72fr) minmax(430px,1.65fr);
  gap:8px;
  align-items:stretch;
}
#s936SuitePro .s936-pr-control {
  border:1px solid rgba(255,255,255,.12);
  border-radius:13px;
  background:rgba(255,255,255,.045);
  padding:8px 9px;
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
  padding:7px 9px;
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
/* Practice Pro v1.6: map selector lives beside Now/Next, master-map chord diagrams */
#s936SuitePro .s936-pr-map-selector {
  display:inline-flex;
  align-items:center;
  gap:5px;
  flex-wrap:wrap;
  border:1px solid rgba(255,255,255,.10);
  border-radius:999px;
  padding:4px 6px;
  background:rgba(255,255,255,.035);
}
#s936SuitePro .s936-pr-map-label {
  color:#ffe066;
  font-size:.55rem;
  font-weight:950;
  text-transform:uppercase;
  letter-spacing:.6px;
  margin-right:2px;
}
#s936SuitePro .s936-pr-map-selector .s936-pr-viewbtn {
  padding:5px 8px;
  font-size:.55rem;
}
#s936SuitePro .s936-pr-view-inline,
#s936SuitePro .s936-pr-viewbar {
  display:none !important;
}
#s936SuitePro .s936-pr-master-board {
  width:100%;
  max-width:260px;
  margin:0 auto;
}
#s936SuitePro .s936-pr-master-chart {
  position:relative;
  width:100%;
  height:135px;
  border-radius:12px;
  background:linear-gradient(180deg, rgba(80,58,35,.70), rgba(10,12,14,.92));
  border:1px solid rgba(255,255,255,.12);
  overflow:hidden;
  box-shadow:inset 0 0 20px rgba(255,216,77,.08);
}
#s936SuitePro .s936-pr-master-chart.ukulele {
  height:128px;
}
#s936SuitePro .s936-pr-master-chart .fret-line {
  position:absolute;
  left:8%;
  right:8%;
  height:1px;
  background:rgba(255,255,255,.36);
}
#s936SuitePro .s936-pr-master-chart .string-line {
  position:absolute;
  top:12%;
  bottom:10%;
  width:1px;
  background:rgba(255,255,255,.36);
}
#s936SuitePro .s936-pr-master-chart .base-fret {
  position:absolute;
  left:4px;
  top:4px;
  color:#fff;
  font-weight:950;
  font-size:.62rem;
  z-index:4;
}
#s936SuitePro .s936-pr-master-chart .note-dot {
  position:absolute;
  transform:translate(-50%,-50%);
  z-index:5;
  width:18px;
  height:18px;
  border-radius:999px;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:.55rem;
  font-weight:950;
  color:#002c25;
  background:#00ffcc;
  box-shadow:0 0 10px rgba(0,255,204,.22), 0 0 0 1px rgba(0,0,0,.25);
}
#s936SuitePro .s936-pr-master-chart .note-dot.root {
  background:#ffe066;
  color:#141000;
  box-shadow:0 0 12px rgba(255,216,77,.24), 0 0 0 1px rgba(0,0,0,.25);
}
#s936SuitePro .s936-pr-master-chart .note-dot.tension {
  background:#ff5bea;
  color:#26001e;
  box-shadow:0 0 12px rgba(255,91,234,.22), 0 0 0 1px rgba(0,0,0,.25);
}
#s936SuitePro .s936-pr-master-chart .mute-x {
  position:absolute;
  top:2px;
  transform:translateX(-50%);
  color:rgba(255,255,255,.70);
  font-size:.65rem;
  font-weight:950;
  z-index:5;
}
#s936SuitePro .s936-pr-master-labels {
  display:grid;
  grid-template-columns:repeat(6, 1fr);
  gap:0;
  padding:4px 8% 0;
  color:rgba(255,255,255,.65);
  font-size:.55rem;
  font-weight:950;
  text-align:center;
}
#s936SuitePro .s936-pr-master-board .s936-pr-master-chart.ukulele + .s936-pr-master-labels {
  grid-template-columns:repeat(4, 1fr);
  padding-left:8%;
  padding-right:8%;
}
#s936SuitePro .s936-pr-recorded-note {
  margin-top:6px;
  color:rgba(255,255,255,.76);
  font-size:.62rem;
  font-weight:800;
}



/* Practice Pro v1.7: tighter topbar, view selector inline with chord notes, true compact chord-card maps */
#s936SuitePro .s936-pr-actions-control .s936-pr-lite-actions {
  align-items:center;
  gap:7px;
}
#s936SuitePro .s936-pr-actions-control .s936-pr-btn {
  padding:7px 10px;
  font-size:.64rem;
}
#s936SuitePro .s936-pr-note-action-row {
  display:flex;
  align-items:center;
  gap:9px;
  flex-wrap:wrap;
  margin-top:9px;
}
#s936SuitePro .s936-pr-note-action-row .s936-pr-note-row {
  margin-top:0;
}
#s936SuitePro .s936-pr-note-action-row .s936-pr-actions {
  margin-top:0;
}
#s936SuitePro .s936-pr-hero-visual.is-fret {
  align-items:center;
  justify-content:center;
}
#s936SuitePro .s936-pr-hero-visual.is-fret h5 {
  align-self:stretch;
}
#s936SuitePro .s936-pr-hero-visual.is-fret .s936-pr-master-board {
  max-width:190px;
}
#s936SuitePro .s936-pr-hero-visual.is-fret .s936-pr-master-chart {
  height:150px;
}
#s936SuitePro .s936-pr-hero-visual.is-fret .s936-pr-recorded-note {
  display:none;
}
#s936SuitePro .s936-pr-hero-visual.is-piano .s936-pr-keyboard {
  min-height:116px;
}
#s936SuitePro .s936-pr-hero-visual.is-piano .s936-pr-key {
  min-width:24px;
  height:86px;
}
#s936SuitePro .s936-pr-hero-visual.is-piano .s936-pr-key.black {
  min-width:18px;
  height:58px;
  margin-left:-11px;
  margin-right:-11px;
}
@media(max-width:1100px){
  #s936SuitePro .s936-pr-topbar {
    grid-template-columns:minmax(120px,1fr) minmax(120px,1fr);
  }
}


/* Practice Pro v1.9: one ticket fix - chord row alignment + real neck map */
#s936SuitePro .s936-pr-chord-heading {
  display:flex;
  align-items:center;
  justify-content:flex-start;
  gap:12px;
  flex-wrap:wrap;
}
#s936SuitePro .s936-pr-chord-heading .s936-pr-chord {
  margin:0;
}
#s936SuitePro .s936-pr-chord-heading .s936-pr-btn {
  margin-top:2px;
  padding:7px 12px;
}
#s936SuitePro .s936-pr-view-row {
  display:flex;
  align-items:center;
  gap:7px;
  flex-wrap:wrap;
  margin-top:8px;
}
#s936SuitePro .s936-pr-view-row .s936-pr-map-selector {
  margin-left:0;
}
#s936SuitePro .s936-pr-note-action-row {
  display:block;
  margin-top:8px;
}
#s936SuitePro .s936-pr-hero-visual {
  min-height:138px;
}
#s936SuitePro .s936-pr-hero-visual h5 {
  margin-bottom:6px;
}
#s936SuitePro .s936-pr-neck-board {
  width:100%;
  max-width:520px;
  margin:0 auto;
  background:rgba(0,0,0,.25);
  border-radius:12px;
  padding:6px 8px 8px;
}
#s936SuitePro .s936-pr-neck-grid {
  display:grid;
  grid-template-columns:22px repeat(13, minmax(18px, 1fr));
  gap:0;
  border-left:3px solid rgba(255,255,255,.62);
}
#s936SuitePro .s936-pr-neck-fret,
#s936SuitePro .s936-pr-neck-string {
  height:16px;
  display:flex;
  align-items:center;
  justify-content:center;
  color:rgba(255,255,255,.62);
  font-size:.50rem;
  font-weight:950;
}
#s936SuitePro .s936-pr-neck-string {
  color:#ffe7a0;
}
#s936SuitePro .s936-pr-neck-cell {
  position:relative;
  height:18px;
  border-top:1px solid rgba(255,255,255,.18);
  border-right:1px solid rgba(255,216,77,.24);
}
#s936SuitePro .s936-pr-neck-dot {
  position:absolute;
  left:50%;
  top:50%;
  transform:translate(-50%,-50%);
  min-width:18px;
  height:16px;
  padding:0 4px;
  border-radius:999px;
  display:flex;
  align-items:center;
  justify-content:center;
  background:#00ffcc;
  color:#002a24;
  font-size:.50rem;
  font-weight:950;
  box-shadow:0 0 9px rgba(0,255,204,.25);
}
#s936SuitePro .s936-pr-neck-dot.root {
  background:#ffe066;
  color:#161000;
}
#s936SuitePro .s936-pr-neck-dot.tension {
  background:#ff5bea;
  color:#25001d;
}
#s936SuitePro .s936-pr-master-board .s936-pr-fret-meta,
#s936SuitePro .s936-pr-master-board .s936-pr-legend {
  display:none !important;
}
#s936SuitePro .s936-pr-hero-visual.is-fret .s936-pr-master-board {
  max-width:520px;
}
@media(max-width:1100px){
  #s936SuitePro .s936-pr-neck-grid {
    grid-template-columns:20px repeat(13, minmax(14px, 1fr));
  }
  #s936SuitePro .s936-pr-neck-cell { height:16px; }
  #s936SuitePro .s936-pr-neck-dot { min-width:16px; height:14px; font-size:.45rem; }
}


/* Practice Pro v1.10: map-note polish and playable fret-window constraint */
#s936SuitePro .s936-pr-chord-heading {
  gap:8px;
}
#s936SuitePro .s936-pr-chord-heading .s936-pr-btn {
  display:none !important;
}
#s936SuitePro .s936-pr-note-action-row {
  display:flex !important;
  align-items:center !important;
  gap:8px !important;
  flex-wrap:wrap !important;
  margin-top:9px !important;
}
#s936SuitePro .s936-pr-note-action-row .s936-pr-note-row {
  margin-top:0 !important;
}
#s936SuitePro .s936-pr-note-action-row > .s936-pr-btn.warn {
  margin-top:0 !important;
  padding:7px 11px !important;
}
#s936SuitePro .s936-pr-view-row {
  margin-top:0 !important;
}
#s936SuitePro .s936-pr-run-badge {
  display:none !important;
}
#s936SuitePro .s936-pr-neck-board {
  max-width:500px !important;
}
#s936SuitePro .s936-pr-neck-cell.outside-window {
  opacity:.34;
  background:rgba(255,255,255,.015);
}
#s936SuitePro .s936-pr-neck-cell.window-edge {
  border-left:1px solid rgba(255,216,77,.45);
}
#s936SuitePro .s936-pr-neck-dot.muted {
  background:rgba(255,255,255,.14);
  color:rgba(255,255,255,.55);
}
#s936SuitePro .s936-pr-status:empty {
  display:none !important;
}


/* Practice Pro v1.10.2: topbar width balance only.
   Goal: shorten Section/Sound/Tempo blocks and keep Practice buttons on one row on smaller screens. */
#s936SuitePro .s936-pr-topbar {
  grid-template-columns:
    minmax(130px, .58fr)
    minmax(130px, .58fr)
    minmax(160px, .52fr)
    minmax(520px, 2.05fr) !important;
  gap:7px !important;
}
#s936SuitePro .s936-pr-control {
  padding:6px 8px !important;
}
#s936SuitePro .s936-pr-select {
  padding:6px 8px !important;
}
#s936SuitePro .s936-pr-actions-control .s936-pr-lite-actions {
  flex-wrap:nowrap !important;
  overflow-x:auto;
  overflow-y:hidden;
  gap:6px !important;
  padding-bottom:1px;
}
#s936SuitePro .s936-pr-actions-control .s936-pr-btn {
  white-space:nowrap;
  flex:0 0 auto;
  padding:6px 9px !important;
  font-size:.60rem !important;
}

@media(max-width:1180px){
  #s936SuitePro .s936-pr-topbar {
    grid-template-columns:
      minmax(105px, .48fr)
      minmax(110px, .50fr)
      minmax(135px, .48fr)
      minmax(420px, 1.75fr) !important;
  }
}

@media(max-width:980px){
  #s936SuitePro .s936-pr-topbar {
    grid-template-columns:
      minmax(95px, .45fr)
      minmax(100px, .48fr)
      minmax(120px, .45fr)
      minmax(360px, 1.65fr) !important;
  }
  #s936SuitePro .s936-pr-actions-control .s936-pr-btn {
    padding:5px 8px !important;
    font-size:.56rem !important;
  }
}
`;
    document.head.appendChild(style);
  }

  function register() {
    window.Studio936SuiteProModules = window.Studio936SuiteProModules || {};
    window.Studio936SuiteProPractice = { version: "practice-v1.10.2", render };
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
    ctx.title(c, "Practice Pro", "");

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
    actionBox.classList.add("s936-pr-actions-control");
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
    const wrap = ctx.el("div", "s936-pr-map-selector");
    wrap.appendChild(ctx.el("span", "s936-pr-map-label", "Vista"));
    [
      ["piano", "Piano"],
      ["guitar", "Guitarra"],
      ["ukulele", "Ukelele"]
    ].forEach(([value, label]) => {
      const btn = ctx.el("button", "s936-pr-viewbtn" + (resolved === value ? " active" : ""), label);
      btn.type = "button";
      btn.title = "Mostrar mapa de notas en " + label;
      btn.onclick = () => {
        state.instrumentView = value;
        saveState();
        render(ctx);
      };
      wrap.appendChild(btn);
    });
    parent.appendChild(wrap);
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

    const nowHeading = ctx.el("div", "s936-pr-chord-heading");
    nowHeading.appendChild(ctx.el("div", "s936-pr-chord", data.chordName));
    nowInfo.appendChild(nowHeading);

    nowInfo.appendChild(ctx.el("div", "s936-pr-sub", `${sectionLabel(data.part, data.sectionKey)} · acorde ${data.index + 1}/${Math.max(1, data.items.length)} · ${data.item?.bars || 1} compás(es)`));
    const nowInline = ctx.el("div", "s936-pr-note-action-row");
    nowInline.appendChild(noteRow(ctx, data.notes, data.root));
    addButton(ctx, nowInline, "Escuchar acorde", () => {
      focusChord(ctx, data.sectionKey, data.index);
      setTimeout(() => ctx.byId?.("previewBtn")?.click(), 120);
    }, "s936-pr-btn warn");
    const viewRow = ctx.el("div", "s936-pr-view-row");
    renderInlineViewSelector(ctx, viewRow);
    nowInline.appendChild(viewRow);
    nowInfo.appendChild(nowInline);

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
    nextInfo.appendChild(ctx.el("div", "s936-pr-status", isPracticeFollowing ? "" : "Usa Loop sección para avanzar visualmente por la práctica."));
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
    parent.classList.toggle("is-fret", instrument === "guitar" || instrument === "ukulele");
    parent.classList.toggle("is-piano", instrument === "piano");
    parent.appendChild(ctx.el("h5", "", title + " · " + instrumentLabel(instrument)));
    if (instrument === "guitar") renderFretboard(ctx, parent, data, ["E", "A", "D", "G", "B", "E"], false);
    else if (instrument === "ukulele") renderFretboard(ctx, parent, data, ["G", "C", "E", "A"], true);
    else renderKeyboard(ctx, parent, data);
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

  function normalizeNoteWithOctave(value, fallbackOctave = 4) {
    const raw = String(value || "").trim()
      .replace(/^Do/i, "C").replace(/^Re/i, "D").replace(/^Mi/i, "E").replace(/^Fa/i, "F")
      .replace(/^Sol/i, "G").replace(/^La/i, "A").replace(/^Si/i, "B");
    const match = raw.match(/^([A-Ga-g])([#b]?)(-?\d+)?/);
    if (!match) return null;
    const name = match[1].toUpperCase() + (match[2] || "");
    const pc = NOTE_INDEX[name];
    if (pc === undefined) return null;
    const octave = match[3] !== undefined ? Number(match[3]) : fallbackOctave;
    return { name, pc, octave, midi: pc + ((octave + 1) * 12) };
  }

  function midiForPitchClassAtOctave(pc, octave) {
    return pc + ((octave + 1) * 12);
  }

  function bassNameForPiano(data) {
    const itemBass = String(data?.item?.bass || "").trim();
    if (itemBass) {
      const parsed = normalizeNoteWithOctave(itemBass, 2);
      if (parsed) return parsed.name;
    }
    const slash = String(data?.chordName || "").match(/\/\s*([A-Ga-g])([#b]?)/);
    if (slash) return slash[1].toUpperCase() + (slash[2] || "");
    return data?.root || normalizeNote(data?.notes?.[0]) || "C";
  }

  function rightHandMidiForPiano(data, bassPc) {
    const used = new Set();
    const notes = [];

    (data.notes || []).forEach((note) => {
      const parsed = normalizeNoteWithOctave(note, 4);
      if (!parsed || used.has(parsed.pc)) return;
      // Keep the right hand as a compact triad / four-note voicing, not repeated octaves.
      let octave = parsed.octave;
      while (octave < 4) octave += 1;
      while (octave > 5) octave -= 1;
      const midi = midiForPitchClassAtOctave(parsed.pc, octave);
      if (midi < 60 || midi > 76) return;
      used.add(parsed.pc);
      notes.push({ midi, name: parsed.name });
    });

    if (!notes.length && typeof data.root === "string") {
      const rootPc = NOTE_INDEX[data.root];
      if (rootPc !== undefined) {
        [0, 4, 7].forEach((interval) => {
          const pc = (rootPc + interval) % 12;
          if (!used.has(pc)) {
            used.add(pc);
            notes.push({ midi: midiForPitchClassAtOctave(pc, 4), name: NOTE_NAMES[pc] });
          }
        });
      }
    }

    return notes.filter((item) => item.midi % 12 !== bassPc || notes.length <= 3).slice(0, 4);
  }

  function renderPianoKey(ctx, midi, activeMap) {
    const name = NOTE_NAMES[midi % 12];
    const key = ctx.el("div", "s936-pr-key" + (name.includes("#") ? " black" : ""), name.replace("#", "♯"));
    const role = activeMap.get(midi);
    if (role) {
      key.classList.add("on");
      if (role === "bass") key.classList.add("root");
      // Right hand remains green only: no extension color in Practice piano view.
    }
    return key;
  }

  function renderKeyboard(ctx, parent, data) {
    const bassName = bassNameForPiano(data);
    const bassPc = NOTE_INDEX[bassName] ?? pitchClass(data.notes?.[0]) ?? 0;
    const bassMidi = [
      midiForPitchClassAtOctave(bassPc, 2),
      midiForPitchClassAtOctave(bassPc, 3)
    ];
    const rightMidi = rightHandMidiForPiano(data, bassPc);

    const wrap = ctx.el("div", "s936-pr-piano-split");
    wrap.style.display = "grid";
    wrap.style.gridTemplateColumns = "minmax(150px,.58fr) minmax(260px,1fr)";
    wrap.style.gap = "8px";
    wrap.style.alignItems = "stretch";

    const left = ctx.el("div", "s936-pr-piano-hand");
    const right = ctx.el("div", "s936-pr-piano-hand");

    const leftTitle = ctx.el("div", "s936-pr-sub", "Bajo / mano izquierda");
    leftTitle.style.margin = "0 0 5px";
    leftTitle.style.color = "#ffe066";
    leftTitle.style.fontWeight = "900";

    const rightTitle = ctx.el("div", "s936-pr-sub", "Triada / mano derecha");
    rightTitle.style.margin = "0 0 5px";
    rightTitle.style.color = "#bfffee";
    rightTitle.style.fontWeight = "900";

    const leftKeys = ctx.el("div", "s936-pr-keyboard");
    leftKeys.style.minHeight = "74px";
    leftKeys.style.overflow = "hidden";

    const rightKeys = ctx.el("div", "s936-pr-keyboard");
    rightKeys.style.minHeight = "74px";
    rightKeys.style.overflow = "hidden";

    const leftActive = new Map();
    bassMidi.forEach((midi) => leftActive.set(midi, "bass"));

    const rightActive = new Map();
    rightMidi.forEach((item) => rightActive.set(item.midi, "right"));

    // Left hand: compact bass octave zone.
    for (let midi = 36; midi <= 48; midi++) {
      leftKeys.appendChild(renderPianoKey(ctx, midi, leftActive));
    }

    // Right hand: one playable triad/four-note voicing.
    for (let midi = 60; midi <= 76; midi++) {
      rightKeys.appendChild(renderPianoKey(ctx, midi, rightActive));
    }

    left.appendChild(leftTitle);
    left.appendChild(leftKeys);
    right.appendChild(rightTitle);
    right.appendChild(rightKeys);
    wrap.appendChild(left);
    wrap.appendChild(right);

    const guide = ctx.el("div", "s936-pr-sub", "Bajo en octavas · mano derecha en verde");
    guide.style.marginTop = "6px";
    guide.style.fontSize = ".62rem";
    guide.style.color = "rgba(255,255,255,.68)";

    parent.appendChild(wrap);
    parent.appendChild(guide);
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
    const instrument = isUkulele ? "ukulele" : "guitar";
    const tuning = stringTuningsForPractice(instrument);
    const position = practiceChordPosition(data, instrument);
    const baseFret = fretBaseFromPosition(position);
    const targetNotes = uniqueChordNotes(data.notes);
    const targetPcs = targetNotes
      .map((note, index) => ({
        note,
        pc: pitchClass(note),
        toneIndex: index,
        isRoot: normalizeNote(note) === data.root || index === 0,
        extension: isExtension(note, data.root, index)
      }))
      .filter((item) => item.pc !== undefined);

    const board = ctx.el("div", "s936-pr-neck-board");
    const neck = ctx.el("div", "s936-pr-neck-grid " + instrument);

    neck.appendChild(ctx.el("div", "s936-pr-neck-fret", ""));
    for (let fret = 0; fret <= 12; fret += 1) {
      neck.appendChild(ctx.el("div", "s936-pr-neck-fret", String(fret)));
    }

    const choices = choosePracticeNeckVoicing(tuning, targetPcs, baseFret, data.root, isUkulele);
    const windowStart = fretWindowStart(baseFret);
    const windowEnd = fretWindowEnd(baseFret, isUkulele);

    tuning.forEach((string, rowIndex) => {
      neck.appendChild(ctx.el("div", "s936-pr-neck-string", string.label));
      for (let fret = 0; fret <= 12; fret += 1) {
        const outside = fret < windowStart || fret > windowEnd;
        const edge = fret === windowStart || fret === windowEnd;
        const cell = ctx.el("div", "s936-pr-neck-cell" + (outside ? " outside-window" : "") + (edge ? " window-edge" : ""));
        const choice = choices[rowIndex];
        if (choice && choice.fret === fret) {
          const role = choice.isRoot ? "root" : (choice.extension ? "tension" : "active");
          const dot = ctx.el("span", "s936-pr-neck-dot " + role, pcName(choice.pc));
          dot.title = string.label + " · fret " + choice.fret + " · " + pcName(choice.pc);
          cell.appendChild(dot);
        }
        neck.appendChild(cell);
      }
    });

    board.appendChild(neck);
    parent.appendChild(board);
  }

  function pcName(pc) {
    return NOTE_NAMES[((Number(pc) % 12) + 12) % 12] || "";
  }

  function choosePracticeNeckVoicing(tuning, targetPcs, baseFret, root, isUkulele) {
    const choices = new Array(tuning.length).fill(null);
    const pcs = Array.isArray(targetPcs) ? targetPcs.filter((item) => item && item.pc !== undefined) : [];
    if (!pcs.length) return choices;

    const rootPc = pitchClass(root || pcs[0]?.note || "");
    const from = fretWindowStart(baseFret);
    const to = fretWindowEnd(baseFret, isUkulele);
    const midString = Math.floor((tuning.length - 1) / 2);
    const usedPcs = new Map();

    tuning.forEach((string, stringIndex) => {
      const candidates = [];
      for (let fret = from; fret <= to; fret += 1) {
        const pc = (string.pc + fret) % 12;
        const target = pcs.find((item) => item.pc === pc);
        if (!target) continue;

        const lowString = stringIndex <= midString;
        const highString = stringIndex > midString;
        const nearBase = baseFret === 0 ? fret * 0.32 : Math.abs(fret - baseFret) * 0.35;
        const rootLowBonus = (pc === rootPc || target.isRoot) && lowString ? -2.0 : 0;
        const rootHighPenalty = (pc === rootPc || target.isRoot) && highString ? 0.7 : 0;
        const extensionLowPenalty = target.extension && lowString ? 0.9 : 0;
        const extensionHighBonus = target.extension && highString ? -0.45 : 0;
        const duplicatePenalty = usedPcs.has(pc) ? 0.45 + usedPcs.get(pc) * 0.18 : 0;
        const openBonus = fret === 0 ? -0.18 : 0;
        const score = nearBase + rootLowBonus + rootHighPenalty + extensionLowPenalty + extensionHighBonus + duplicatePenalty + openBonus + target.toneIndex * 0.08;

        candidates.push(Object.assign({}, target, {
          fret,
          pc,
          stringIndex,
          isRoot: pc === rootPc || target.isRoot,
          score
        }));
      }

      candidates.sort((a, b) => a.score - b.score);
      const best = candidates[0] || null;
      choices[stringIndex] = best;
      if (best) usedPcs.set(best.pc, (usedPcs.get(best.pc) || 0) + 1);
    });

    return choices;
  }

  function fretWindowStart(baseFret) {
    const base = Math.max(0, Number(baseFret) || 0);
    if (base <= 1) return 0;
    return Math.min(9, base);
  }

  function fretWindowEnd(baseFret, isUkulele) {
    const start = fretWindowStart(baseFret);
    const span = isUkulele ? 4 : 4;
    return Math.min(12, start + span);
  }


  function slug(text) {
    return String(text || "studio936").toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "studio936";
  }

  function fretBaseFromPosition(position) {
    const raw = String(position || "open");
    return raw === "open" ? 0 : Math.max(0, Number(raw) || 0);
  }

  function fretPositionLabel(position) {
    const raw = String(position || "open");
    return raw === "open" ? "Abierta" : "Traste " + raw;
  }

  function practiceChordPosition(data, instrument) {
    let positions = {};
    try { positions = JSON.parse(localStorage.getItem("s936_suite_fret_positions_v34") || "{}") || {}; }
    catch (error) { positions = {}; }

    const key = instrument + "::" + slug(data.chordName || data.name || "chord");
    return positions[key] || localStorage.getItem("s936_suite_fret_position_v33") || "open";
  }

  function stringTuningsForPractice(instrument) {
    if (instrument === "ukulele") {
      return [
        { label:"G", pc:7 },
        { label:"C", pc:0 },
        { label:"E", pc:4 },
        { label:"A", pc:9 }
      ];
    }
    return [
      { label:"E", pc:4 },
      { label:"A", pc:9 },
      { label:"D", pc:2 },
      { label:"G", pc:7 },
      { label:"B", pc:11 },
      { label:"E", pc:4 }
    ];
  }

  function findPracticeFretForString(openPc, targetPcs, baseFret, stringIndex, stringCount) {
    let best = null;
    const from = baseFret > 0 ? baseFret : 0;
    const to = baseFret > 0 ? baseFret + 4 : 5;

    for (let fret = from; fret <= to; fret += 1) {
      const pc = (openPc + fret) % 12;
      const target = targetPcs.find((item) => item.pc === pc);
      if (!target) continue;

      const lowString = stringIndex <= Math.floor((stringCount - 1) / 2);
      const highString = stringIndex >= Math.ceil((stringCount - 1) / 2);
      const score =
        target.toneIndex +
        (baseFret > 0 ? Math.abs(fret - baseFret) * 0.25 : fret * 0.2) +
        (target.isRoot && lowString ? -1.5 : 0) +
        (target.extension && highString ? -0.7 : 0) +
        (target.extension && lowString ? 1.0 : 0);

      if (!best || score < best.score) best = Object.assign({}, target, { fret, score });
    }

    return best;
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
