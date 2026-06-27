// Studio 936 Composer - Suite Pro Structure / ADN Module v4.0.3
// Scope: Compose > Estructura only. No toca app.js, Practice, Drums, Mixer, Recorder ni MIDI.
// Product goal: constructor claro de forma musical, sin controles repetidos y con edición segura sobre el proyecto central.
(function () {
  "use strict";

  const STYLE_ID = "s936SuiteProStructureStylesV4";
  const STATE_KEY = "s936_suitepro_structure_v4";
  const APP_STORAGE_KEY = "studio936ComposerV25SongStructure";
  const BACKUP_KEY = "studio936_structure_backups_v4";

  const PART_OPTIONS = [
    ["intro", "Intro"],
    ["verse", "Verso"],
    ["verse1", "Verso 1"],
    ["verse2", "Verso 2"],
    ["verse3", "Verso 3"],
    ["verse4", "Verso 4"],
    ["prechorus", "Pre-coro"],
    ["chorus", "Coro"],
    ["bridge", "Puente"],
    ["interlude", "Interludio"],
    ["solo", "Solo"],
    ["outro", "Outro"],
    ["custom", "Personalizada"]
  ];

  const DEFAULT_STATE = {
    draft: null,
    newType: "verse",
    newLabel: "",
    newBars: 8,
    editingIndex: -1
  };

  const state = loadState();

  function loadState() {
    try { return Object.assign({}, DEFAULT_STATE, JSON.parse(localStorage.getItem(STATE_KEY) || "{}")); }
    catch (error) { return Object.assign({}, DEFAULT_STATE); }
  }

  function saveState() {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (error) {}
  }

  function register() {
    window.Studio936SuiteProModules = window.Studio936SuiteProModules || {};
    window.Studio936SuiteProStructure = { version: "structure-v4.0.3", render };
    window.Studio936SuiteProModules.structure = window.Studio936SuiteProStructure;
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#s936SuitePro .s936-struct-shell{display:grid;gap:12px}
#s936SuitePro .s936-struct-with-chart{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:14px;align-items:start}
#s936SuitePro .s936-struct-left-col{display:grid;gap:12px}
#s936SuitePro .s936-struct-right-col{position:sticky;top:0}
#s936SuitePro .s936-struct-card{border:1px solid rgba(255,255,255,.12);border-radius:18px;background:rgba(255,255,255,.045);padding:13px}
#s936SuitePro .s936-struct-card.main{border-color:rgba(0,255,204,.36);background:linear-gradient(135deg,rgba(0,255,204,.10),rgba(255,255,255,.035))}
#s936SuitePro .s936-struct-card.gold{border-color:rgba(255,216,77,.42);background:linear-gradient(135deg,rgba(255,216,77,.10),rgba(255,255,255,.035))}
#s936SuitePro .s936-struct-card.dangerzone{border-color:rgba(255,90,90,.32);background:linear-gradient(135deg,rgba(255,90,90,.08),rgba(255,255,255,.035))}
#s936SuitePro .s936-struct-card h4{margin:0 0 8px;color:#8affff;font-size:.82rem;text-transform:uppercase;letter-spacing:.8px}
#s936SuitePro .s936-struct-card h5{margin:0 0 7px;color:#fff;font-size:.88rem}
#s936SuitePro .s936-struct-line{margin:6px 0;color:rgba(255,255,255,.80);font-size:.72rem;line-height:1.42}
#s936SuitePro .s936-struct-line strong{color:#ffe066}
#s936SuitePro .s936-struct-muted{color:rgba(255,255,255,.62);font-size:.68rem;line-height:1.45}
#s936SuitePro .s936-struct-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}
#s936SuitePro .s936-struct-btn{border:1px solid rgba(0,255,204,.45);border-radius:999px;background:rgba(0,255,204,.08);color:#bfffee;padding:7px 11px;font-size:.64rem;font-weight:950;cursor:pointer;text-transform:uppercase}
#s936SuitePro .s936-struct-btn.warn{border-color:rgba(255,216,77,.70);background:rgba(255,216,77,.10);color:#ffe066}
#s936SuitePro .s936-struct-btn.danger{border-color:rgba(255,90,90,.70);background:rgba(255,90,90,.10);color:#ffb5b5}
#s936SuitePro .s936-struct-btn.secondary{border-color:rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:#fff}
#s936SuitePro .s936-struct-score{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:8px}
#s936SuitePro .s936-struct-score .metric{border:1px solid rgba(255,255,255,.11);border-radius:14px;background:rgba(0,0,0,.18);padding:9px;text-align:center}
#s936SuitePro .s936-struct-score .metric b{display:block;color:#00ffcc;font-size:1.1rem}
#s936SuitePro .s936-struct-score .metric span{display:block;color:rgba(255,255,255,.62);font-size:.58rem;text-transform:uppercase;font-weight:900}
#s936SuitePro .s936-struct-grid{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(330px,.92fr);gap:12px}
#s936SuitePro .s936-struct-form{display:grid;grid-template-columns:minmax(120px,.8fr) minmax(120px,1fr) minmax(90px,.45fr);gap:8px;align-items:end}
#s936SuitePro .s936-struct-form.two{grid-template-columns:minmax(160px,1fr) minmax(120px,.55fr)}
#s936SuitePro .s936-struct-field label{display:block;color:#ffe066;font-size:.58rem;font-weight:950;text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px}
#s936SuitePro .s936-struct-select,#s936SuitePro .s936-struct-input{width:100%;border:1px solid rgba(255,255,255,.16);border-radius:12px;background:rgba(0,0,0,.26);color:#fff;padding:8px 10px;font-size:.75rem;font-weight:800}
#s936SuitePro .s936-struct-list{display:grid;gap:8px;margin-top:10px}
#s936SuitePro .s936-struct-part{display:grid;grid-template-columns:38px minmax(0,1fr) auto;gap:8px;align-items:center;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(0,0,0,.18);padding:9px}
#s936SuitePro .s936-struct-part.independent{border-color:rgba(255,216,77,.28);background:linear-gradient(135deg,rgba(255,216,77,.07),rgba(0,0,0,.18))}
#s936SuitePro .s936-struct-num{color:#ffe066;font-size:.66rem;font-weight:950;text-align:center}
#s936SuitePro .s936-struct-part b{display:block;color:#fff;font-size:.80rem}
#s936SuitePro .s936-struct-part span{display:block;color:rgba(255,255,255,.65);font-size:.62rem;line-height:1.35;margin-top:2px}
#s936SuitePro .s936-struct-mini-actions{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}
#s936SuitePro .s936-struct-mini{border:1px solid rgba(255,255,255,.14);border-radius:999px;background:rgba(255,255,255,.05);color:#fff;padding:5px 8px;font-size:.58rem;font-weight:950;cursor:pointer}
#s936SuitePro .s936-struct-mini:hover{border-color:rgba(0,255,204,.55);color:#00ffcc}
#s936SuitePro .s936-struct-mini.warn{border-color:rgba(255,216,77,.42);color:#ffe066}
#s936SuitePro .s936-struct-mini.danger{border-color:rgba(255,90,90,.42);color:#ffb5b5}
#s936SuitePro .s936-struct-flow{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
#s936SuitePro .s936-struct-chip{border:1px solid rgba(0,255,204,.35);border-radius:999px;background:rgba(0,255,204,.08);color:#bfffee;padding:5px 8px;font-size:.62rem;font-weight:900}
#s936SuitePro .s936-struct-chip.gold{border-color:rgba(255,216,77,.55);background:rgba(255,216,77,.12);color:#ffe066}
#s936SuitePro .s936-struct-toolgrid{display:grid;grid-template-columns:1fr;gap:10px}
#s936SuitePro .s936-struct-section-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:7px;margin-top:10px}
#s936SuitePro .s936-struct-section-card{border:1px solid rgba(255,255,255,.11);border-radius:13px;background:rgba(0,0,0,.18);padding:8px}
#s936SuitePro .s936-struct-section-card b{display:block;color:#fff;font-size:.70rem;text-transform:uppercase}
#s936SuitePro .s936-struct-section-card span{display:block;color:rgba(255,255,255,.63);font-size:.60rem;margin-top:3px}
@media(max-width:1100px){#s936SuitePro .s936-struct-grid,#s936SuitePro .s936-struct-form,#s936SuitePro .s936-struct-form.two{grid-template-columns:1fr}#s936SuitePro .s936-struct-score{grid-template-columns:repeat(2,1fr)}#s936SuitePro .s936-struct-part{grid-template-columns:28px minmax(0,1fr)}#s936SuitePro .s936-struct-mini-actions{grid-column:1/-1;justify-content:flex-start}}

#s936SuitePro .s936-struct-diagnosis{margin:10px 0 0;padding:8px 10px;border-left:3px solid rgba(0,255,204,.55);background:rgba(0,255,204,.055);color:rgba(255,255,255,.76);font-size:.68rem;line-height:1.4}
#s936SuitePro .s936-struct-empty{border:1px dashed rgba(255,255,255,.18);border-radius:14px;padding:16px;color:rgba(255,255,255,.62);font-size:.72rem;text-align:center}
#s936SuitePro .s936-struct-add{display:grid;gap:10px}
#s936SuitePro .s936-struct-mode-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
#s936SuitePro .s936-struct-mode{border:1px solid rgba(255,255,255,.14);border-radius:12px;background:rgba(255,255,255,.055);color:#fff;padding:8px 7px;font-size:.60rem;font-weight:950;cursor:pointer;text-transform:uppercase}
#s936SuitePro .s936-struct-mode.active{border-color:rgba(0,255,204,.70);background:rgba(0,255,204,.12);color:#00ffcc}
#s936SuitePro .s936-struct-add-panel{display:grid;gap:9px;border:1px solid rgba(255,255,255,.10);border-radius:14px;background:rgba(0,0,0,.15);padding:10px}
#s936SuitePro .s936-struct-help{margin:0;color:rgba(255,255,255,.66);font-size:.66rem;line-height:1.42}
#s936SuitePro .s936-struct-available{display:flex;flex-wrap:wrap;gap:5px}
#s936SuitePro .s936-struct-advanced{border:1px solid rgba(255,255,255,.11);border-radius:16px;background:rgba(255,255,255,.035);overflow:hidden}
#s936SuitePro .s936-struct-advanced summary{cursor:pointer;padding:11px 13px;color:#ffe066;font-size:.68rem;font-weight:950;text-transform:uppercase;letter-spacing:.7px}
#s936SuitePro .s936-struct-advanced-body{padding:0 13px 13px;border-top:1px solid rgba(255,255,255,.08)}
@media(max-width:760px){#s936SuitePro .s936-struct-mode-tabs{grid-template-columns:1fr}}


/* Structure v4: songwriter workbench */
#s936SuitePro .s936-struct-v4{gap:14px}
#s936SuitePro .s936-struct-workbench{padding:16px}
#s936SuitePro .s936-struct-headline{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
#s936SuitePro .s936-struct-meta-form{display:grid;grid-template-columns:minmax(240px,1.35fr) minmax(170px,.75fr) minmax(220px,.9fr);gap:10px;align-items:end;margin:12px 0}
#s936SuitePro .s936-struct-meta-form-inline{display:flex;gap:8px;align-items:center;margin:8px 0;flex-wrap:nowrap}
#s936SuitePro .s936-struct-title-inline{flex:1 1 0;min-width:0}
#s936SuitePro .s936-struct-select-inline{flex:0 0 140px}
#s936SuitePro .s936-struct-bpm-inline{flex:0 0 60px;text-align:center}
#s936SuitePro .s936-struct-bpm-wrap{display:grid;grid-template-columns:minmax(130px,1fr) 72px auto;gap:8px;align-items:center}
#s936SuitePro .s936-struct-bpm-range{width:100%;accent-color:#00ffcc}
#s936SuitePro .s936-struct-bpm-number{padding-left:8px!important;padding-right:8px!important}
#s936SuitePro .s936-struct-bpm-unit{color:#ffe066;font-size:.62rem;font-weight:950}
#s936SuitePro .s936-struct-score-three{grid-template-columns:repeat(3,1fr)}
#s936SuitePro .s936-struct-create-strip{margin-top:12px;border:1px solid rgba(255,216,77,.26);border-radius:16px;background:rgba(255,216,77,.055);padding:11px}
#s936SuitePro .s936-struct-create-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px}
#s936SuitePro .s936-struct-create-head h5{margin:0;color:#ffe066;text-transform:uppercase;font-size:.72rem;letter-spacing:.7px}
#s936SuitePro .s936-struct-create-form{display:grid;grid-template-columns:minmax(150px,.75fr) minmax(230px,1.25fr) minmax(90px,.45fr) auto;gap:8px;align-items:end}
#s936SuitePro .s936-struct-create-action{display:flex;align-items:flex-end}
#s936SuitePro .s936-struct-create-action .s936-struct-btn{min-height:35px;white-space:nowrap}
#s936SuitePro .s936-struct-main-actions{border-top:1px solid rgba(255,255,255,.09);padding-top:11px;margin-top:12px}
#s936SuitePro .s936-struct-hidden-file{display:none!important}
#s936SuitePro .s936-struct-arrangement-full{width:100%;padding:14px}
#s936SuitePro .s936-struct-section-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
#s936SuitePro .s936-struct-arrangement-count{border:1px solid rgba(0,255,204,.30);border-radius:999px;background:rgba(0,255,204,.08);color:#9fffea;padding:5px 9px;font-size:.62rem;font-weight:950;text-transform:uppercase}
#s936SuitePro .s936-struct-list-wide{gap:9px}
#s936SuitePro .s936-struct-part-wide{display:block;padding:0;overflow:hidden}
#s936SuitePro .s936-struct-part-wide.is-editing{border-color:rgba(255,216,77,.58);box-shadow:0 0 0 1px rgba(255,216,77,.10) inset}
#s936SuitePro .s936-struct-part-top{display:grid;grid-template-columns:38px minmax(180px,1fr) auto;gap:10px;align-items:center;padding:10px 11px}
#s936SuitePro .s936-struct-part-info{min-width:0}
#s936SuitePro .s936-struct-part-titleline{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
#s936SuitePro .s936-struct-part-titleline b{font-size:.84rem}
#s936SuitePro .s936-struct-part-type{display:inline-flex!important;margin:0!important;border:1px solid rgba(0,255,204,.24);border-radius:999px;background:rgba(0,255,204,.065);color:#9fffea!important;padding:3px 7px;font-size:.52rem!important;font-weight:950;text-transform:uppercase}
#s936SuitePro .s936-struct-part-meta{font-size:.60rem!important}
#s936SuitePro .s936-struct-chords{display:flex;flex-wrap:wrap;gap:6px;padding:0 11px 11px 59px}
#s936SuitePro .s936-struct-chord-chip{display:inline-flex!important;align-items:center;margin:0!important;border:1px solid rgba(0,255,204,.34);border-radius:999px;background:rgba(0,255,204,.075);color:#c9fff3!important;padding:5px 9px;font-size:.62rem!important;font-weight:950}
#s936SuitePro .s936-struct-chord-chip.root{border-color:rgba(255,216,77,.58);background:rgba(255,216,77,.09);color:#ffe889!important}
#s936SuitePro .s936-struct-no-chords{color:rgba(255,255,255,.48)!important;font-style:italic}
#s936SuitePro .s936-struct-mini.edit{border-color:rgba(0,255,204,.48);color:#8affff;background:rgba(0,255,204,.08)}
#s936SuitePro .s936-struct-part-editor{border-top:1px solid rgba(255,255,255,.09);background:linear-gradient(135deg,rgba(255,216,77,.055),rgba(0,255,204,.035));padding:12px 14px}
#s936SuitePro .s936-struct-editor-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:9px}
#s936SuitePro .s936-struct-editor-head b{color:#ffe066;text-transform:uppercase;font-size:.72rem}
#s936SuitePro .s936-struct-editor-head span{color:rgba(255,255,255,.58);font-size:.62rem}
#s936SuitePro .s936-struct-editor-form{display:grid;grid-template-columns:minmax(180px,.8fr) minmax(90px,.35fr) minmax(300px,1.85fr);gap:9px;align-items:end}
#s936SuitePro .s936-struct-chord-editor{min-height:64px;resize:vertical;font-family:inherit;line-height:1.4}
@media(max-width:1100px){
  #s936SuitePro .s936-struct-meta-form{grid-template-columns:1fr 1fr}
  #s936SuitePro .s936-struct-meta-form .s936-struct-field:first-child{grid-column:1/-1}
  #s936SuitePro .s936-struct-create-form{grid-template-columns:1fr 1fr}
  #s936SuitePro .s936-struct-create-action{align-items:stretch}
  #s936SuitePro .s936-struct-part-top{grid-template-columns:34px minmax(0,1fr)}
  #s936SuitePro .s936-struct-part-top .s936-struct-mini-actions{grid-column:1/-1;padding-left:44px}
  #s936SuitePro .s936-struct-chords{padding-left:54px}
  #s936SuitePro .s936-struct-editor-form{grid-template-columns:1fr 120px}
  #s936SuitePro .s936-struct-editor-form .wide{grid-column:1/-1}
}
@media(max-width:700px){
  #s936SuitePro .s936-struct-meta-form,#s936SuitePro .s936-struct-create-form,#s936SuitePro .s936-struct-editor-form{grid-template-columns:1fr}
  #s936SuitePro .s936-struct-meta-form .s936-struct-field:first-child,#s936SuitePro .s936-struct-editor-form .wide{grid-column:auto}
  #s936SuitePro .s936-struct-score-three{grid-template-columns:repeat(3,1fr)}
  #s936SuitePro .s936-struct-create-head,#s936SuitePro .s936-struct-section-heading,#s936SuitePro .s936-struct-editor-head{display:block}
  #s936SuitePro .s936-struct-create-head .s936-struct-muted{display:block;margin-top:4px}
  #s936SuitePro .s936-struct-part-top .s936-struct-mini-actions{padding-left:0}
  #s936SuitePro .s936-struct-chords{padding-left:11px}
}


/* Structure v4.0.3: compact visual pass only */
#s936SuitePro .s936-struct-workbench-compact{
  display:block!important;
  width:100%!important;
  min-height:0!important;
  padding:10px 12px!important;
}
#s936SuitePro .s936-struct-meta-form-compact{
  grid-template-columns:minmax(220px,1.35fr) minmax(150px,.75fr) minmax(190px,.9fr)!important;
  gap:8px!important;
  margin:0!important;
}
#s936SuitePro .s936-struct-create-strip-compact{
  margin-top:8px!important;
  padding:8px!important;
}
#s936SuitePro .s936-struct-main-actions-compact{
  margin-top:8px!important;
  padding-top:8px!important;
  align-items:center!important;
}
#s936SuitePro .s936-struct-compact-status{
  margin-left:auto;
  color:rgba(255,255,255,.58);
  font-size:.61rem;
  font-weight:800;
  white-space:nowrap;
}
#s936SuitePro .s936-struct-arrangement-full{
  padding:12px!important;
}
#s936SuitePro .s936-struct-list-wide{
  gap:7px!important;
}
#s936SuitePro .s936-struct-part-mainline{
  display:grid;
  grid-template-columns:34px minmax(135px,.55fr) minmax(320px,2.35fr) auto;
  gap:10px;
  align-items:center;
  padding:9px 10px;
}
#s936SuitePro .s936-struct-chords-inline{
  padding:0!important;
  min-width:0;
  flex-wrap:wrap;
  align-items:center;
}
#s936SuitePro .s936-struct-chords-inline .s936-struct-chord-chip{
  min-width:64px;
  justify-content:center;
  padding:6px 11px;
  font-size:.66rem!important;
}
#s936SuitePro .s936-struct-part-mainline .s936-struct-mini-actions{
  flex-wrap:nowrap;
  align-items:center;
  white-space:nowrap;
}
@media(max-width:1250px){
  #s936SuitePro .s936-struct-part-mainline{
    grid-template-columns:32px minmax(130px,.65fr) minmax(250px,1.8fr);
  }
  #s936SuitePro .s936-struct-part-mainline>.s936-struct-mini-actions{
    grid-column:2/-1;
    justify-content:flex-end;
  }
}
@media(max-width:900px){
  #s936SuitePro .s936-struct-meta-form-compact{
    grid-template-columns:1fr 1fr!important;
  }
  #s936SuitePro .s936-struct-meta-form-compact .s936-struct-field:first-child{
    grid-column:1/-1;
  }
  #s936SuitePro .s936-struct-part-mainline{
    grid-template-columns:30px minmax(0,1fr);
  }
  #s936SuitePro .s936-struct-chords-inline{
    grid-column:2/-1;
  }
  #s936SuitePro .s936-struct-part-mainline>.s936-struct-mini-actions{
    grid-column:2/-1;
    justify-content:flex-start;
    flex-wrap:wrap;
  }
  #s936SuitePro .s936-struct-compact-status{
    width:100%;
    margin-left:0;
  }
}
@media(max-width:650px){
  #s936SuitePro .s936-struct-meta-form-compact,
  #s936SuitePro .s936-struct-create-form{
    grid-template-columns:1fr!important;
  }
  #s936SuitePro .s936-struct-meta-form-compact .s936-struct-field:first-child{
    grid-column:auto;
  }
  #s936SuitePro .s936-struct-workbench-compact{
    padding:9px!important;
  }
}

/* ── COCKPIT HEADER v4.1 ── */
#s936SuitePro .s936-ckpt-shell{
  background:rgba(0,0,0,.32);
  border:1px solid rgba(0,255,204,.22);
  border-radius:14px;
  padding:0;
  overflow:hidden;
}
/* Fila superior: título + estilo + BPM + menú */
#s936SuitePro .s936-ckpt-topbar{
  display:grid;
  grid-template-columns:minmax(0,1.4fr) minmax(0,.8fr) 72px 32px;
  gap:6px;
  align-items:center;
  padding:8px 10px;
  background:rgba(0,255,204,.04);
  border-bottom:1px solid rgba(255,255,255,.07);
}
#s936SuitePro .s936-ckpt-input{
  background:rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.12);
  border-radius:8px;
  color:#fff;
  font-size:.75rem;
  font-weight:700;
  padding:5px 8px;
  width:100%;
  outline:none;
  transition:border-color .15s;
}
#s936SuitePro .s936-ckpt-input:focus{border-color:rgba(0,255,204,.6)}
#s936SuitePro .s936-ckpt-select{
  background:rgba(20,24,36,.96)!important;
  border:1px solid rgba(255,255,255,.18);
  border-radius:8px;
  color:#fff!important;
  font-size:.72rem;
  font-weight:700;
  padding:5px 8px;
  width:100%;
  outline:none;
  -webkit-appearance:none;
  appearance:none;
}
#s936SuitePro .s936-ckpt-select option{
  background:#0d1117!important;
  color:#fff!important;
}
#s936SuitePro .s936-ckpt-bpm{
  background:rgba(0,255,204,.08);
  border:1px solid rgba(0,255,204,.3);
  border-radius:8px;
  color:#00ffcc;
  font-size:.82rem;
  font-weight:900;
  padding:5px 6px;
  width:100%;
  text-align:center;
  outline:none;
}
/* Botón menú ⚙ */
#s936SuitePro .s936-ckpt-menu-btn{
  width:32px;height:32px;
  border-radius:8px;
  border:1px solid rgba(255,255,255,.18);
  background:rgba(255,255,255,.06);
  color:rgba(255,255,255,.7);
  font-size:.85rem;
  cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  transition:border-color .15s,background .15s;
  position:relative;
}
#s936SuitePro .s936-ckpt-menu-btn:hover{border-color:rgba(0,255,204,.5);color:#00ffcc}
/* Dropdown del menú */
#s936SuitePro .s936-ckpt-dropdown{
  display:none;
  position:absolute;
  bottom:38px;right:0;top:auto;
  background:#0d1117;
  border:1px solid rgba(0,255,204,.35);
  border-radius:10px;
  padding:6px;
  z-index:200;
  min-width:160px;
  box-shadow:0 8px 24px rgba(0,0,0,.7);
}
#s936SuitePro .s936-ckpt-dropdown.open{display:block}
#s936SuitePro .s936-ckpt-dd-item{
  display:block;width:100%;
  text-align:left;
  background:transparent;
  border:none;
  color:rgba(255,255,255,.82);
  font-size:.68rem;
  font-weight:800;
  padding:7px 10px;
  border-radius:7px;
  cursor:pointer;
  text-transform:uppercase;
  letter-spacing:.5px;
  transition:background .12s,color .12s;
}
#s936SuitePro .s936-ckpt-dd-item:hover{background:rgba(0,255,204,.1);color:#00ffcc}
#s936SuitePro .s936-ckpt-dd-item.warn{color:#ffe066}
#s936SuitePro .s936-ckpt-dd-item.warn:hover{background:rgba(255,224,102,.12)}
#s936SuitePro .s936-ckpt-dd-sep{height:1px;background:rgba(255,255,255,.08);margin:4px 0}
/* Fila ADD: nueva parte — colapsable */
#s936SuitePro .s936-ckpt-add-toggle{
  display:flex;align-items:center;gap:6px;
  padding:6px 10px;
  cursor:pointer;
  border-bottom:1px solid rgba(255,255,255,.06);
  color:rgba(255,224,102,.8);
  font-size:.63rem;
  font-weight:900;
  text-transform:uppercase;
  letter-spacing:.6px;
  user-select:none;
  transition:background .12s;
}
#s936SuitePro .s936-ckpt-add-toggle:hover{background:rgba(255,224,102,.05)}
#s936SuitePro .s936-ckpt-add-toggle .s936-ckpt-chevron{
  margin-left:auto;
  font-size:.7rem;
  transition:transform .2s;
  color:rgba(255,255,255,.35);
}
#s936SuitePro .s936-ckpt-add-toggle.open .s936-ckpt-chevron{transform:rotate(180deg)}
/* Formulario de nueva parte */
#s936SuitePro .s936-ckpt-add-body{
  display:none;
  grid-template-columns:minmax(0,.7fr) minmax(0,1.2fr) 60px auto;
  gap:6px;
  align-items:end;
  padding:8px 10px;
  background:rgba(255,224,102,.03);
  border-bottom:1px solid rgba(255,255,255,.06);
}
#s936SuitePro .s936-ckpt-add-body.open{display:grid}
#s936SuitePro .s936-ckpt-add-label{
  display:block;
  color:rgba(255,255,255,.45);
  font-size:.55rem;
  font-weight:900;
  text-transform:uppercase;
  letter-spacing:.5px;
  margin-bottom:3px;
}
#s936SuitePro .s936-ckpt-add-btn{
  background:rgba(0,255,204,.1);
  border:1px solid rgba(0,255,204,.4);
  border-radius:8px;
  color:#00ffcc;
  font-size:.62rem;
  font-weight:900;
  padding:5px 10px;
  cursor:pointer;
  text-transform:uppercase;
  white-space:nowrap;
  transition:background .12s;
  align-self:end;
}
#s936SuitePro .s936-ckpt-add-btn:hover{background:rgba(0,255,204,.2)}
/* Fila de status compacta */
#s936SuitePro .s936-ckpt-status{
  display:flex;align-items:center;gap:8px;
  padding:5px 10px;
  color:rgba(255,255,255,.38);
  font-size:.58rem;
  font-weight:800;
  text-transform:uppercase;
  letter-spacing:.5px;
  border-bottom:1px solid rgba(255,255,255,.06);
}
#s936SuitePro .s936-ckpt-status-dot{
  width:5px;height:5px;border-radius:50%;
  background:#00ffcc;
  box-shadow:0 0 4px #00ffcc;
  flex-shrink:0;
}
/* Botón primario aplicar */
#s936SuitePro .s936-ckpt-apply-btn{
  margin-left:auto;
  background:rgba(0,255,204,.12);
  border:1px solid rgba(0,255,204,.45);
  border-radius:7px;
  color:#00ffcc;
  font-size:.58rem;
  font-weight:900;
  padding:3px 10px;
  cursor:pointer;
  text-transform:uppercase;
  letter-spacing:.5px;
  transition:background .12s;
}
#s936SuitePro .s936-ckpt-apply-btn:hover{background:rgba(0,255,204,.22)}

/* ── ROW LAYOUT v4.2 ── */
#s936SuitePro .s936-ckpt-part-row{
  display:flex;
  align-items:center;
  gap:8px;
  padding:8px 10px;
  border:1px solid rgba(255,255,255,.09);
  border-radius:11px;
  background:rgba(0,0,0,.18);
  transition:border-color .15s,background .15s;
  cursor:default;
}
#s936SuitePro .s936-ckpt-part-row:hover{
  border-color:rgba(0,255,204,.2);
  background:rgba(0,0,0,.28);
}
#s936SuitePro .s936-ckpt-part-row.is-editing{
  border-color:rgba(255,224,102,.45);
  background:rgba(255,224,102,.04);
}
#s936SuitePro .s936-ckpt-part-num{
  color:rgba(255,255,255,.3);
  font-size:.6rem;
  font-weight:900;
  min-width:18px;
  text-align:center;
  flex-shrink:0;
}
#s936SuitePro .s936-ckpt-part-badge{
  border-radius:5px;
  font-size:.52rem;
  font-weight:900;
  padding:3px 7px;
  text-transform:uppercase;
  letter-spacing:.5px;
  flex-shrink:0;
  white-space:nowrap;
}
#s936SuitePro .s936-ckpt-part-info{
  flex:1;
  min-width:0;
}
#s936SuitePro .s936-ckpt-part-name{
  font-size:.75rem;
  font-weight:700;
  color:#fff;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
#s936SuitePro .s936-ckpt-part-bars{
  font-size:.58rem;
  color:rgba(255,255,255,.38);
  margin-top:1px;
}
#s936SuitePro .s936-ckpt-row-actions{
  display:flex;
  align-items:center;
  gap:4px;
  flex-shrink:0;
}
#s936SuitePro .s936-ckpt-row-action{
  width:26px;height:26px;
  border-radius:6px;
  border:1px solid rgba(255,255,255,.12);
  background:rgba(255,255,255,.04);
  color:rgba(255,255,255,.5);
  font-size:.72rem;
  cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  transition:border-color .12s,color .12s,background .12s;
  flex-shrink:0;
}
#s936SuitePro .s936-ckpt-row-action:hover{
  border-color:rgba(0,255,204,.5);
  color:#00ffcc;
  background:rgba(0,255,204,.08);
}
#s936SuitePro .s936-ckpt-row-action.play:hover{
  border-color:rgba(0,255,204,.7);
  color:#00ffcc;
  background:rgba(0,255,204,.12);
}
#s936SuitePro .s936-ckpt-row-action.edit-active{
  border-color:rgba(255,224,102,.6);
  color:#ffe066;
  background:rgba(255,224,102,.08);
}

/* ── ROW GEAR MENU ── */
#s936SuitePro .s936-ckpt-row-gear{
  position:relative;
  flex-shrink:0;
}
#s936SuitePro .s936-ckpt-row-btn{
  width:28px;height:28px;
  border-radius:7px;
  border:1px solid rgba(255,255,255,.14);
  background:rgba(255,255,255,.05);
  color:rgba(255,255,255,.55);
  font-size:.78rem;
  cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  transition:border-color .15s,color .15s,background .15s;
}
#s936SuitePro .s936-ckpt-row-btn:hover{
  border-color:rgba(0,255,204,.5);
  color:#00ffcc;
  background:rgba(0,255,204,.08);
}
#s936SuitePro .s936-ckpt-row-dd{
  display:none;
  position:absolute;
  bottom:32px;right:0;
  background:#0d1117;
  border:1px solid rgba(0,255,204,.3);
  border-radius:10px;
  padding:5px;
  z-index:300;
  min-width:148px;
  box-shadow:0 8px 24px rgba(0,0,0,.8);
}
#s936SuitePro .s936-ckpt-row-dd.open{display:block}
#s936SuitePro .s936-ckpt-row-dd-item{
  display:block;width:100%;
  text-align:left;
  background:transparent;border:none;
  color:rgba(255,255,255,.8);
  font-size:.65rem;font-weight:800;
  padding:6px 10px;border-radius:7px;
  cursor:pointer;
  text-transform:uppercase;letter-spacing:.4px;
  transition:background .1s,color .1s;
}
#s936SuitePro .s936-ckpt-row-dd-item:hover{background:rgba(0,255,204,.1);color:#00ffcc}
#s936SuitePro .s936-ckpt-row-dd-item.warn{color:#ffe066}
#s936SuitePro .s936-ckpt-row-dd-item.warn:hover{background:rgba(255,224,102,.1)}
#s936SuitePro .s936-ckpt-row-dd-item.danger{color:#ff8080}
#s936SuitePro .s936-ckpt-row-dd-item.danger:hover{background:rgba(255,80,80,.1)}
#s936SuitePro .s936-ckpt-row-dd-sep{height:1px;background:rgba(255,255,255,.08);margin:3px 0}

`;
    document.head.appendChild(style);
  }

  function safe(fn, fallback = null) {
    try { return fn(); } catch (error) { console.warn("Suite Pro Structure:", error); return fallback; }
  }

  function snap(ctx) { return safe(() => ctx.snapshot(), {}) || {}; }

  function sectionItems(s, key) {
    const sections = s.sections || {};
    return Array.isArray(sections[key]) ? sections[key] : [];
  }

  function cloneItems(items) {
    return JSON.parse(JSON.stringify(Array.isArray(items) ? items : []));
  }

  function readArrangement(s) {
    const arrangement = Array.isArray(s.arrangement) ? s.arrangement : [];
    if (arrangement.length) {
      return arrangement.map((p) => ({
        section: p.section || p.key || "verse",
        label: p.label || p.name || labelFor(p.section || p.key || "verse"),
        bars: Number(p.bars) || inferredBars(s, p.section || p.key),
        independent: false
      }));
    }
    const sections = s.sections || {};
    return Object.keys(sections).map((key) => ({
      section: key,
      label: labelFor(key),
      bars: inferredBars(s, key),
      independent: false
    }));
  }

  function ensureDraft(ctx) {
    const s = snap(ctx);
    const current = readArrangement(s);
    if (!state.draft || !Array.isArray(state.draft.parts)) {
      state.draft = {
        createdAt: new Date().toISOString(),
        parts: current.length ? current : defaultParts(),
        clones: {},
        notes: {},
        meta: {
          title: s.title || s.project?.title || document.getElementById("songTitle")?.value || "Canción sin nombre",
          style: s.style || s.project?.style || document.getElementById("styleSelect")?.value || "pop",
          bpm: Number(s.bpm || s.project?.bpm || document.getElementById("bpmSlider")?.value || 95)
        },
        importedLyrics: {},
        importedSolos: {}
      };
      saveState();
    }
    if (!state.draft.clones) state.draft.clones = {};
    if (!state.draft.notes) state.draft.notes = {};
    if (!state.draft.meta) {
      state.draft.meta = {
        title: s.title || s.project?.title || document.getElementById("songTitle")?.value || "Canción sin nombre",
        style: s.style || s.project?.style || document.getElementById("styleSelect")?.value || "pop",
        bpm: Number(s.bpm || s.project?.bpm || document.getElementById("bpmSlider")?.value || 95)
      };
    }
    if (!state.draft.importedLyrics) state.draft.importedLyrics = {};
    if (!state.draft.importedSolos) state.draft.importedSolos = {};
    return state.draft.parts;
  }

  function defaultParts() {
    return [
      { section:"intro", label:"Intro", bars:4 },
      { section:"verse1", label:"Verso 1", bars:8 },
      { section:"prechorus", label:"Pre-coro", bars:4 },
      { section:"chorus", label:"Coro", bars:8 },
      { section:"verse2", label:"Verso 2", bars:8 },
      { section:"chorus", label:"Coro final", bars:8 },
      { section:"outro", label:"Outro", bars:4 }
    ];
  }

  function labelFor(key) {
    const found = PART_OPTIONS.find(([value]) => value === key);
    return found ? found[1] : humanizeKey(key);
  }

  function humanizeKey(key) {
    return String(key || "Sección").replace(/[-_]+/g, " ").replace(/\b\w/g, (x) => x.toUpperCase());
  }

  function inferredBars(s, key) {
    const items = sectionItems(s, key);
    return items.reduce((sum, item) => sum + Math.max(1, Number(item?.bars) || 1), 0) || suggestedBars(key);
  }

  function suggestedBars(key) {
    const k = String(key || "").toLowerCase();
    if (k.includes("intro") || k.includes("outro") || k.includes("pre")) return 4;
    if (k.includes("bridge") || k.includes("puente") || k.includes("interlude") || k.includes("solo")) return 8;
    return 8;
  }

  function allKnownSections(s, parts) {
    const keys = new Set();
    Object.keys(s.sections || {}).forEach((key) => keys.add(key));
    (parts || []).forEach((part) => { if (part.section) keys.add(part.section); });
    return Array.from(keys).sort((a, b) => labelFor(a).localeCompare(labelFor(b), "es"));
  }

  function uniqueSectionKey(s, parts, base) {
    const used = new Set(allKnownSections(s, parts));
    const clean = String(base || "section").toLowerCase().replace(/[^a-z0-9]+/g, "") || "section";
    if (!used.has(clean)) return clean;
    for (let i = 2; i < 99; i += 1) {
      const candidate = clean + i;
      if (!used.has(candidate)) return candidate;
    }
    return clean + Date.now();
  }

  function render(ctx, shell) {
    installStyles();
    const root = ctx.el("div", "s936-struct-shell s936-struct-v4");
    const s = snap(ctx);
    const parts = ensureDraft(ctx);

    renderHeader(ctx, root, s, parts);
    renderBuilder(ctx, root, s, parts);
    shell.appendChild(root);

    // v0.8.5: montar chart con reintentos hasta que el fretboardContainer tenga dimensiones
    const Chart = window.Studio936SuiteProChart;
    if (Chart && typeof Chart.mountInRightPanel === "function") {
      const onEdit = (sectionKey, chordIndex, newName) => {
        try {
          window.Studio936AppBridge?.selectEditorSection?.(sectionKey);
          window.Studio936AppBridge?.selectEditorChord?.(chordIndex);
        } catch(_) {}
      };
      let attempts = 0;
      const tryMount = () => {
        const fc = document.getElementById("fretboardContainer");
        const h = fc ? fc.getBoundingClientRect().height : 0;
        if (h > 50 || attempts >= 8) {
          Chart.mountInRightPanel({ onChordEdit: onEdit });
        } else {
          attempts++;
          setTimeout(tryMount, 80);
        }
      };
      setTimeout(tryMount, 80);
    }
  }

  // v4.1 — COCKPIT HEADER: topbar compacta + menú ⚙ + add colapsable
  function renderHeader(ctx, root, s, parts) {
    const meta = state.draft.meta || {};

    const shell = ctx.el("div", "s936-ckpt-shell");

    // ── TOP BAR: título · estilo · BPM · menú ──
    const topbar = ctx.el("div", "s936-ckpt-topbar");

    const titleInput = ctx.el("input", "s936-ckpt-input");
    titleInput.value = meta.title || "";
    titleInput.placeholder = "Título";
    titleInput.title = "Título de la canción";
    titleInput.oninput = () => { state.draft.meta.title = titleInput.value; saveState(); };

    const styleSelect = ctx.el("select", "s936-ckpt-select");
    styleSelect.title = "Ritmo / Estilo";
    styleOptions(ctx, s).forEach((item) => {
      const opt = ctx.el("option", "", item.label);
      opt.value = item.value;
      if (String(item.value) === String(meta.style || "pop")) opt.selected = true;
      styleSelect.appendChild(opt);
    });
    styleSelect.onchange = () => { state.draft.meta.style = styleSelect.value; saveState(); };

    const bpmInput = ctx.el("input", "s936-ckpt-bpm");
    bpmInput.type = "number";
    bpmInput.min = "50"; bpmInput.max = "220";
    bpmInput.value = String(Math.max(50, Math.min(220, Number(meta.bpm) || 95)));
    bpmInput.title = "BPM";
    bpmInput.oninput = () => {
      const v = Math.max(50, Math.min(220, Number(bpmInput.value) || 95));
      state.draft.meta.bpm = v; saveState();
    };

    // Botón menú ⚙ con dropdown
    const menuBtn = ctx.el("button", "s936-ckpt-menu-btn");
    menuBtn.title = "Opciones";
    menuBtn.innerHTML = "⚙";
    menuBtn.setAttribute("aria-label", "Opciones de estructura");

    const dropdown = ctx.el("div", "s936-ckpt-dropdown");
    dropdown.id = "s936CkptDropdown";

    const ddApply = ctx.el("button", "s936-ckpt-dd-item warn", "▶ Aplicar estructura");
    ddApply.onclick = () => { dropdown.classList.remove("open"); applyDraft(ctx); };

    const ddReleer = ctx.el("button", "s936-ckpt-dd-item", "↺ Releer canción");
    ddReleer.onclick = () => {
      dropdown.classList.remove("open");
      if (!window.confirm("¿Descartar cambios y releer la canción actual?")) return;
      const fresh = snap(ctx);
      state.draft = {
        createdAt: new Date().toISOString(),
        parts: readArrangement(fresh),
        clones: {}, notes: {},
        meta: {
          title: fresh.title || fresh.project?.title || document.getElementById("songTitle")?.value || "Canción sin nombre",
          style: fresh.style || fresh.project?.style || document.getElementById("styleSelect")?.value || "pop",
          bpm: Number(fresh.bpm || fresh.project?.bpm || document.getElementById("bpmSlider")?.value || 95)
        },
        importedLyrics: {}, importedSolos: {}
      };
      state.editingIndex = -1;
      saveState(); renderAgain(ctx);
    };

    const ddSep1 = ctx.el("div", "s936-ckpt-dd-sep");

    const ddGuardar = ctx.el("button", "s936-ckpt-dd-item", "💾 Guardar estructura");
    ddGuardar.onclick = () => { dropdown.classList.remove("open"); saveStructureFile(ctx, s, parts); };

    const ddCargar = ctx.el("button", "s936-ckpt-dd-item", "📂 Cargar canción");
    const fileInput = ctx.el("input", "s936-struct-hidden-file");
    fileInput.type = "file"; fileInput.accept = "application/json,.json";
    fileInput.onchange = () => { const f = fileInput.files?.[0]; if (f) loadStructureFile(ctx, f); fileInput.value = ""; };
    ddCargar.onclick = () => {
      dropdown.classList.remove("open");
      const lib = window.Studio936SuiteProLibrary || window.Studio936SuiteProModules?.library;
      if (lib && typeof lib.openPicker === "function") {
        lib.openPicker((song) => { if (song) loadStructureFromSong(ctx, song); });
      } else { fileInput.click(); }
    };

    const ddSep2 = ctx.el("div", "s936-ckpt-dd-sep");

    const ddPlantillas = ctx.el("button", "s936-ckpt-dd-item", "🎼 Plantillas");
    ddPlantillas.onclick = () => {
      dropdown.classList.remove("open");
      if (ctx.state) { ctx.state.composeTool = "structure"; ctx.state.structureSubtool = "templates"; }
      if (typeof render === "function") render(ctx);
    };

    const ddInspiracion = ctx.el("button", "s936-ckpt-dd-item", "✨ Inspiración");
    ddInspiracion.onclick = () => {
      dropdown.classList.remove("open");
      if (ctx.state) { ctx.state.composeTool = "structure"; ctx.state.structureSubtool = "inspire"; }
      if (typeof render === "function") render(ctx);
    };

    dropdown.append(ddApply, ddReleer, ddSep1, ddGuardar, ddCargar, ddSep2, ddPlantillas, ddInspiracion, fileInput);

    // Toggle dropdown
    menuBtn.onclick = (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("open");
    };
    // Cerrar al click fuera
    document.addEventListener("click", function closeDD(e) {
      if (!menuBtn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove("open");
      }
    }, { once: false, capture: false });

    menuBtn.appendChild(dropdown);
    topbar.append(titleInput, styleSelect, bpmInput, menuBtn);
    shell.appendChild(topbar);

    // ── STATUS BAR ──
    const statusBar = ctx.el("div", "s936-ckpt-status");
    const dot = ctx.el("span", "s936-ckpt-status-dot");
    const statusText = ctx.el("span", "", `${parts.length} partes · ${totalBars(parts)} compases · ${uniqueSectionCount(parts)} secciones`);
    statusBar.append(dot, statusText);
    shell.appendChild(statusBar);

    // ── ADD TOGGLE (colapsable) ──
    const addToggle = ctx.el("div", "s936-ckpt-add-toggle");
    addToggle.innerHTML = `<span>+ Crear Sección</span><span class="s936-ckpt-chevron">▾</span>`;
    // Recordar estado del panel add en localStorage
    const addOpenKey = "s936_ckpt_add_open";
    const addIsOpen = localStorage.getItem(addOpenKey) === "1";
    if (addIsOpen) addToggle.classList.add("open");

    const addBody = ctx.el("div", "s936-ckpt-add-body" + (addIsOpen ? " open" : ""));

    addToggle.onclick = () => {
      const now = !addToggle.classList.contains("open");
      addToggle.classList.toggle("open", now);
      addBody.classList.toggle("open", now);
      localStorage.setItem(addOpenKey, now ? "1" : "0");
    };
    shell.appendChild(addToggle);

    // Formulario dentro del add
    const typeField = ctx.el("div", "");
    const typeLabel = ctx.el("span", "s936-ckpt-add-label", "Tipo");
    const typeSelect = ctx.el("select", "s936-ckpt-select");
    PART_OPTIONS.forEach(([value, label]) => {
      const opt = ctx.el("option", "", label);
      opt.value = value;
      if (value === state.newType) opt.selected = true;
      typeSelect.appendChild(opt);
    });
    typeSelect.onchange = () => {
      state.newType = typeSelect.value;
      state.newBars = suggestedBars(typeSelect.value);
      barsInput.value = String(state.newBars);
      saveState();
    };
    typeField.append(typeLabel, typeSelect);

    const nameField = ctx.el("div", "");
    const nameLabel = ctx.el("span", "s936-ckpt-add-label", "Nombre");
    const nameInput = ctx.el("input", "s936-ckpt-input");
    nameInput.value = state.newLabel || "";
    nameInput.placeholder = "Ej. Coro final";
    nameInput.oninput = () => { state.newLabel = nameInput.value; saveState(); };
    nameField.append(nameLabel, nameInput);

    const barsField = ctx.el("div", "");
    const barsLabel = ctx.el("span", "s936-ckpt-add-label", "Comp.");
    const barsInput = ctx.el("input", "s936-ckpt-bpm");
    barsInput.type = "number"; barsInput.min = "1"; barsInput.max = "64";
    barsInput.value = String(state.newBars || suggestedBars(state.newType));
    barsInput.oninput = () => { state.newBars = Math.max(1, Number(barsInput.value) || 8); saveState(); };
    barsField.append(barsLabel, barsInput);

    const addBtn = ctx.el("button", "s936-ckpt-add-btn", "+ Añadir");
    addBtn.onclick = () => {
      const type = typeSelect.value || "verse";
      const visible = (nameInput.value || (type === "custom" ? "Parte nueva" : labelFor(type))).trim();
      const section = uniqueSectionKey(s, parts, type === "custom" ? visible : type);
      const bars = Math.max(1, Number(barsInput.value) || suggestedBars(type));
      parts.push({ section, label: visible, bars, independent: true, type });
      state.draft.parts = parts;
      state.draft.clones[section] = {
        source: "",
        items: defaultChordsFor(type, projectKey(s), bars),
        createdAt: new Date().toISOString()
      };
      state.newLabel = "";
      state.editingIndex = parts.length - 1;
      saveState(); renderAgain(ctx);
    };

    addBody.append(typeField, nameField, barsField, addBtn);
    shell.appendChild(addBody);

    root.appendChild(shell);
  }

  function renderBuilder(ctx, root, s, parts) {
    const listCard = ctx.el("section", "s936-struct-card s936-struct-arrangement-full");
    const titleRow = ctx.el("div", "s936-struct-section-heading");
    const left = ctx.el("div", "");
    left.appendChild(ctx.el("h4", "", "Arreglo de la canción"));
    left.appendChild(ctx.el("p", "s936-struct-muted", "Ordena, duplica, renombra y edita cada parte. Duplicar crea una copia independiente para que puedas convertirla en Verso 2, Coro final o cualquier nueva sección."));
    titleRow.appendChild(left);
    titleRow.appendChild(ctx.el("span", "s936-struct-arrangement-count", `${parts.length} parte${parts.length === 1 ? "" : "s"}`));
    listCard.appendChild(titleRow);

    const list = ctx.el("div", "s936-struct-list s936-struct-list-wide");
    if (!parts.length) {
      list.appendChild(ctx.el("div", "s936-struct-empty", "Todavía no hay partes. Créala en el tablero ADN de la canción."));
    } else {
      parts.forEach((part, index) => list.appendChild(partRow(ctx, s, parts, part, index)));
    }
    listCard.appendChild(list);
    root.appendChild(listCard);
  }




  const BADGE_COLORS = {"intro": "background:rgba(0,255,204,.15);border:1px solid rgba(0,255,204,.4);color:#00ffcc", "verse": "background:rgba(91,143,255,.15);border:1px solid rgba(91,143,255,.4);color:#8ab4ff", "verse1": "background:rgba(91,143,255,.15);border:1px solid rgba(91,143,255,.4);color:#8ab4ff", "verse2": "background:rgba(91,143,255,.15);border:1px solid rgba(91,143,255,.4);color:#8ab4ff", "verse3": "background:rgba(91,143,255,.15);border:1px solid rgba(91,143,255,.4);color:#8ab4ff", "verse4": "background:rgba(91,143,255,.15);border:1px solid rgba(91,143,255,.4);color:#8ab4ff", "prechorus": "background:rgba(255,180,50,.15);border:1px solid rgba(255,180,50,.4);color:#ffcf6e", "chorus": "background:rgba(255,80,180,.15);border:1px solid rgba(255,80,180,.4);color:#ff9ee0", "bridge": "background:rgba(180,100,255,.15);border:1px solid rgba(180,100,255,.4);color:#cc99ff", "interlude": "background:rgba(100,220,180,.15);border:1px solid rgba(100,220,180,.4);color:#7dffd8", "solo": "background:rgba(255,120,80,.15);border:1px solid rgba(255,120,80,.4);color:#ffaa88", "outro": "background:rgba(150,150,170,.15);border:1px solid rgba(150,150,170,.4);color:#ccccdd"};
  function badgeStyle(type) {
    const base = type ? type.replace(/[0-9]/g,"") : "verse";
    return BADGE_COLORS[type] || BADGE_COLORS[base] || "background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.25);color:#fff";
  }
  function badgeLabel(type) {
    const map = {intro:"INTRO",verse:"VERSE",verse1:"VERSE 1",verse2:"VERSE 2",verse3:"VERSE 3",verse4:"VERSE 4",
      prechorus:"PRE-CH",chorus:"CHORUS",bridge:"BRIDGE",interlude:"INTRL",solo:"SOLO",outro:"OUTRO"};
    return map[type] || (type||"PART").toUpperCase().slice(0,6);
  }
  function partRow(ctx, s, parts, part, index) {
    const isEditing = state.editingIndex === index;
    const row = ctx.el("article", "");
    row.style.cssText = "display:flex;flex-direction:column;gap:0";

    const line = ctx.el("div", "s936-ckpt-part-row" + (isEditing ? " is-editing" : ""));

    // Número
    const num = ctx.el("div", "s936-ckpt-part-num", String(index + 1).padStart(2, "0"));
    line.appendChild(num);

    // Badge tipo
    const type = part.type || baseType(part.section) || "verse";
    const badge = ctx.el("span", "s936-ckpt-part-badge", badgeLabel(type));
    badge.setAttribute("style", badgeStyle(type));
    line.appendChild(badge);

    // Info nombre + compases
    const info = ctx.el("div", "s936-ckpt-part-info");
    info.appendChild(ctx.el("div", "s936-ckpt-part-name", part.label || labelFor(part.section)));
    info.appendChild(ctx.el("div", "s936-ckpt-part-bars",
      `${Math.max(1, Number(part.bars) || inferredBars(s, part.section))} compases`));
    line.appendChild(info);

    // Botones de acción visibles
    const rowActions = ctx.el("div", "s936-ckpt-row-actions");

    // ▶ Play — selecciona sección y lanza groove
    const playBtn = ctx.el("button", "s936-ckpt-row-action play");
    playBtn.innerHTML = "▶";
    playBtn.title = "Escuchar sección";
    playBtn.onclick = (e) => {
      e.stopPropagation();
      try {
        const sel = document.getElementById("sectionSelect");
        if (sel) { sel.value = part.section; sel.dispatchEvent(new Event("change", { bubbles: true })); }
        const bridge = window.Studio936AppBridge;
        if (bridge?.startGroove) { bridge.startGroove(); }
        else {
          // fallback: click directo al botón START GROOVE del main
          const grooveBtn = document.querySelector("[data-action='startGroove'], #startGrooveBtn, .groove-start-btn");
          if (grooveBtn) grooveBtn.click();
        }
      } catch(_) {}
    };
    rowActions.appendChild(playBtn);

    // ✎ Editar
    const editBtn = ctx.el("button", "s936-ckpt-row-action" + (isEditing ? " edit-active" : ""));
    editBtn.innerHTML = "✎";
    editBtn.title = isEditing ? "Cerrar editor" : "Editar parte";
    editBtn.onclick = (e) => {
      e.stopPropagation();
      state.editingIndex = isEditing ? -1 : index;
      saveState(); renderAgain(ctx);
    };
    rowActions.appendChild(editBtn);

    // ⚙ Gear dropdown
    const gearWrap = ctx.el("div", "s936-ckpt-row-gear");
    const gearBtn = ctx.el("button", "s936-ckpt-row-btn");
    gearBtn.innerHTML = "⚙";
    gearBtn.title = "Más opciones";

    const rowDD = ctx.el("div", "s936-ckpt-row-dd");

    const ddUp   = ctx.el("button", "s936-ckpt-row-dd-item", "▲ Subir");
    ddUp.onclick = () => { rowDD.classList.remove("open"); move(parts, index, -1, ctx); };

    const ddDown = ctx.el("button", "s936-ckpt-row-dd-item", "▼ Bajar");
    ddDown.onclick = () => { rowDD.classList.remove("open"); move(parts, index, 1, ctx); };

    const ddSep1 = ctx.el("div", "s936-ckpt-row-dd-sep");

    const ddDup  = ctx.el("button", "s936-ckpt-row-dd-item warn", "⧉ Duplicar");
    ddDup.onclick = () => { rowDD.classList.remove("open"); duplicatePart(ctx, s, parts, index); };

    const ddRen  = ctx.el("button", "s936-ckpt-row-dd-item", "✎ Renombrar");
    ddRen.onclick = () => { rowDD.classList.remove("open"); renameVisible(ctx, parts, index); };

    const ddSep2 = ctx.el("div", "s936-ckpt-row-dd-sep");

    const ddDel  = ctx.el("button", "s936-ckpt-row-dd-item danger", "✕ Quitar");
    ddDel.onclick = () => { rowDD.classList.remove("open"); deleteFromArrangement(ctx, parts, index); };

    rowDD.append(ddUp, ddDown, ddSep1, ddDup, ddRen, ddSep2, ddDel);

    gearBtn.onclick = (e) => {
      e.stopPropagation();
      document.querySelectorAll(".s936-ckpt-row-dd.open").forEach(d => { if (d !== rowDD) d.classList.remove("open"); });
      rowDD.classList.toggle("open");
    };
    document.addEventListener("click", () => rowDD.classList.remove("open"));

    gearWrap.append(gearBtn, rowDD);
    rowActions.appendChild(gearWrap);
    line.appendChild(rowActions);
    row.appendChild(line);

    const items = draftOrLiveItems(s, part.section);
    if (isEditing) {
      row.appendChild(renderPartEditor(ctx, s, parts, part, index, items));
    }
    return row;
  }


  function styleOptions(ctx, s) {
    const select = document.getElementById("styleSelect");
    if (select?.options?.length) {
      return Array.from(select.options).map((option) => ({
        value: option.value,
        label: option.textContent || option.value
      }));
    }
    return [
      { value:"funk", label:"Funk" },
      { value:"pop", label:"Pop" },
      { value:"rock", label:"Rock" },
      { value:"ballad", label:"Balada" },
      { value:"worship", label:"Worship" },
      { value:"jazz", label:"Jazz" },
      { value:"bossa", label:"Bossa Nova" },
      { value:"reggae", label:"Reggae" },
      { value:"salsa", label:"Salsa" },
      { value:"cumbia", label:"Cumbia" }
    ];
  }

  function duplicatePart(ctx, s, parts, index) {
    const sourcePart = parts[index];
    if (!sourcePart) return;
    const sourceItems = draftOrLiveItems(s, sourcePart.section);
    const newSection = uniqueSectionKey(s, parts, sourcePart.section + "copy");
    const visible = (sourcePart.label || labelFor(sourcePart.section)) + " copia";
    state.draft.clones[newSection] = {
      source: sourcePart.section,
      items: cloneItems(sourceItems.length ? sourceItems : defaultChordsFor(sourcePart.type || sourcePart.section, projectKey(s), sourcePart.bars)),
      createdAt: new Date().toISOString()
    };
    parts.splice(index + 1, 0, {
      section: newSection,
      label: visible,
      bars: Math.max(1, Number(sourcePart.bars) || inferredBars(s, sourcePart.section)),
      independent: true,
      type: sourcePart.type || baseType(sourcePart.section)
    });
    state.draft.parts = parts;
    state.editingIndex = index + 1;
    saveState();
    renderAgain(ctx);
  }

  function renderPartEditor(ctx, s, parts, part, index, items) {
    const editor = ctx.el("div", "s936-struct-part-editor");
    const title = ctx.el("div", "s936-struct-editor-head");
    title.appendChild(ctx.el("b", "", "Editor de parte"));
    title.appendChild(ctx.el("span", "", "Los cambios quedan en el borrador hasta pulsar Aplicar estructura."));
    editor.appendChild(title);

    const form = ctx.el("div", "s936-struct-editor-form");
    const nameField = field(ctx, "Nombre visible");
    const nameInput = ctx.el("input", "s936-struct-input");
    nameInput.value = part.label || labelFor(part.section);
    nameField.appendChild(nameInput);

    const barsField = field(ctx, "Compases");
    const barsInput = ctx.el("input", "s936-struct-input");
    barsInput.type = "number";
    barsInput.min = "1";
    barsInput.max = "64";
    barsInput.value = String(Math.max(1, Number(part.bars) || inferredBars(s, part.section)));
    barsField.appendChild(barsInput);

    const chordField = field(ctx, "Progresión de acordes");
    chordField.classList.add("wide");
    const chordInput = ctx.el("textarea", "s936-struct-input s936-struct-chord-editor");
    chordInput.value = (items || []).map((item) => String(item?.name || item?.chord || "").trim()).filter(Boolean).join(" · ");
    chordInput.placeholder = "Ej. Fmaj7 · Cmaj7 · Am7 · G6/9";
    chordField.appendChild(chordInput);

    form.append(nameField, barsField, chordField);
    editor.appendChild(form);

    const actions = ctx.el("div", "s936-struct-actions");
    button(ctx, actions, "Guardar cambios", () => {
      const label = (nameInput.value || part.label || labelFor(part.section)).trim();
      const bars = Math.max(1, Number(barsInput.value) || 8);
      const names = parseChordNames(chordInput.value);
      part.label = label;
      part.bars = bars;
      state.draft.parts[index] = part;

      if (names.length) {
        const oldItems = Array.isArray(items) ? items : [];
        state.draft.clones[part.section] = {
          source: part.section,
          items: names.map((name, chordIndex) => {
            const existing = oldItems[chordIndex] || {};
            return Object.assign({}, existing, {
              name,
              bass: existing.bass || chordBass(name),
              notes: existing.notes || chordNotes(name, projectKey(s)).join(" "),
              bars: Math.max(1, Number(existing.bars) || Math.max(1, Math.round(bars / names.length)))
            });
          }),
          createdAt: state.draft.clones?.[part.section]?.createdAt || new Date().toISOString()
        };
      }
      state.editingIndex = -1;
      saveState();
      renderAgain(ctx);
      toast(ctx, "Parte actualizada en el borrador.");
    }, "s936-struct-btn warn");
    button(ctx, actions, "Cancelar", () => {
      state.editingIndex = -1;
      saveState();
      renderAgain(ctx);
    }, "s936-struct-btn secondary");
    editor.appendChild(actions);
    return editor;
  }

  function parseChordNames(value) {
    return String(value || "")
      .split(/[\n,;|·]+/)
      .map((name) => name.trim())
      .filter(Boolean)
      .slice(0, 32);
  }

  function structurePayload(ctx, s, parts) {
    const sections = {};
    Array.from(new Set(parts.map((part) => part.section))).forEach((section) => {
      sections[section] = cloneItems(draftOrLiveItems(s, section));
    });
    const lyrics = {};
    const solos = {};
    const liveLyrics = Object.assign({}, s.lyrics || {}, state.draft?.importedLyrics || {});
    const liveSolos = Object.assign({}, s.sectionSolos || {}, state.draft?.importedSolos || {});
    Object.keys(sections).forEach((section) => {
      if (liveLyrics[section] !== undefined) lyrics[section] = liveLyrics[section];
      if (liveSolos[section] !== undefined) solos[section] = liveSolos[section];
    });
    return {
      format: "studio936-structure",
      version: 4,
      savedAt: new Date().toISOString(),
      meta: Object.assign({}, state.draft?.meta || {}),
      parts: cloneItems(parts),
      sections,
      lyrics,
      sectionSolos: solos
    };
  }

  function saveStructureFile(ctx, s, parts) {
    const payload = structurePayload(ctx, s, parts);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type:"application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const name = String(payload.meta?.title || "estructura")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "estructura";
    a.href = url;
    a.download = `studio936-${name}-estructura.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(ctx, "Estructura guardada en JSON.");
  }

  function loadStructureFromSong(ctx, song) {
    // v0.8.1: cargar canción desde librería
    try {
      if (!song || typeof song !== "object") return;
      const parts = Array.isArray(song.arrangement) ? song.arrangement : readArrangement(song);
      const clones = {};
      parts.forEach(p => {
        if (song.sections?.[p.section]) {
          clones[p.section] = { source:"", items: song.sections[p.section], createdAt: new Date().toISOString() };
        }
      });
      state.draft = {
        createdAt: new Date().toISOString(),
        parts,
        clones,
        notes: {},
        meta: {
          title: song.title || song.project?.title || "Canción",
          style: song.style || song.project?.style || "pop",
          bpm: Number(song.bpm || song.project?.bpm || 95)
        },
        importedLyrics: song.lyrics || {},
        importedSolos: song.solos || {}
      };
      state.editingIndex = -1;
      saveState();
      renderAgain(ctx);
    } catch(e) { console.warn("loadStructureFromSong error:", e); }
  }

  function loadStructureFile(ctx, file) {
    const reader = new FileReader();
    reader.onerror = () => toast(ctx, "No se pudo leer el archivo.");
    reader.onload = () => {
      const data = safe(() => JSON.parse(String(reader.result || "{}")), null);
      if (!data || data.format !== "studio936-structure" || !Array.isArray(data.parts)) {
        return toast(ctx, "El archivo no es una estructura válida de Studio 936.");
      }
      if (!window.confirm(`¿Cargar la estructura “${data.meta?.title || file.name}” en el tablero? La canción central no cambia hasta pulsar Aplicar estructura.`)) return;
      const clones = {};
      Object.keys(data.sections || {}).forEach((section) => {
        clones[section] = {
          source: "archivo",
          items: cloneItems(data.sections[section]),
          createdAt: new Date().toISOString()
        };
      });
      state.draft = {
        createdAt: new Date().toISOString(),
        parts: cloneItems(data.parts),
        clones,
        notes: {},
        meta: {
          title: data.meta?.title || "Canción sin nombre",
          style: data.meta?.style || "pop",
          bpm: Math.max(50, Math.min(180, Number(data.meta?.bpm) || 95))
        },
        importedLyrics: Object.assign({}, data.lyrics || {}),
        importedSolos: Object.assign({}, data.sectionSolos || {})
      };
      state.editingIndex = -1;
      saveState();
      renderAgain(ctx);
      toast(ctx, "Estructura cargada en el tablero.");
    };
    reader.readAsText(file);
  }



  function structureStatus(parts) {
    const hasChorus = parts.some((p) => /chorus|coro/i.test((p.section || "") + " " + (p.label || "")));
    const hasVerse = parts.some((p) => /verse|verso/i.test((p.section || "") + " " + (p.label || "")));
    const hasBridge = parts.some((p) => /bridge|puente|interlude|interludio/i.test((p.section || "") + " " + (p.label || "")));

    if (!parts.length) return "Todavía no hay forma definida.";
    if (!hasVerse || !hasChorus) return "La forma necesita al menos verso y coro para funcionar como canción.";
    if (parts.length < 5) return "Hay una base funcional; puede necesitar intro, repetición o cierre.";
    if (!hasBridge) return "Forma sólida; un puente o interludio puede aportar contraste.";
    return "Forma completa y lista para trabajar acordes, letra y arreglo.";
  }





  function renameVisible(ctx, parts, index) {
    const part = parts[index];
    if (!part) return;
    const next = window.prompt("Nuevo nombre visible de esta aparición:\n\nNo cambia la clave interna ni los acordes.", part.label || labelFor(part.section));
    if (next === null) return;
    part.label = (next || part.label || labelFor(part.section)).trim();
    state.draft.parts = parts;
    saveState();
    renderAgain(ctx);
  }

  function deleteFromArrangement(ctx, parts, index) {
    const part = parts[index];
    if (!part) return;
    if (!window.confirm(`¿Quitar “${part.label || labelFor(part.section)}” del arreglo?\n\nSolo quita esta aparición de la forma. No borra los acordes ni la letra de la sección.`)) return;
    parts.splice(index, 1);
    state.draft.parts = parts;
    saveState();
    renderAgain(ctx);
  }


  function draftOrLiveItems(s, section) {
    const clone = state.draft?.clones?.[section];
    if (clone && Array.isArray(clone.items)) return clone.items;
    return sectionItems(s, section);
  }



  function applyDraft(ctx) {
    const s = snap(ctx);
    const parts = ensureDraft(ctx).slice();
    if (!parts.length) return toast(ctx, "No hay estructura para aplicar.");
    const msg = [
      "Esto aplicará el tablero ADN a la canción actual.",
      "",
      "Actualiza título, estilo, tempo, forma, compases y acordes editados.",
      "Guarda un backup local antes de aplicar.",
      "",
      "¿Aplicar estructura?"
    ].join("\n");
    if (!window.confirm(msg)) return;

    const current = safe(() => JSON.parse(JSON.stringify(s.project || s)), {}) || {};
    backup(ctx, current);

    const sections = Object.assign({}, current.sections || s.sections || {});
    const lyrics = Object.assign({}, current.lyrics || s.lyrics || {}, state.draft?.importedLyrics || {});
    const sectionSolos = Object.assign({}, current.sectionSolos || s.sectionSolos || {}, state.draft?.importedSolos || {});
    const key = projectKey(s, current);

    const clones = state.draft?.clones || {};
    Object.keys(clones).forEach((section) => {
      sections[section] = cloneItems(clones[section].items || []);
      if (lyrics[section] === undefined) lyrics[section] = "";
      if (!sectionSolos[section]) sectionSolos[section] = { key, scale: "major", phrase: "" };
    });

    parts.forEach((part) => {
      if (!Array.isArray(sections[part.section]) || !sections[part.section].length) {
        sections[part.section] = defaultChordsFor(part.type || part.section, key, part.bars);
      }
      if (lyrics[part.section] === undefined) lyrics[part.section] = "";
      if (!sectionSolos[part.section]) sectionSolos[part.section] = { key, scale: "major", phrase: "" };
    });

    const meta = state.draft?.meta || {};
    const project = Object.assign({}, current, {
      title: String(meta.title || current.title || s.title || "Canción sin nombre").trim(),
      style: meta.style || current.style || s.style || "pop",
      bpm: Math.max(50, Math.min(180, Number(meta.bpm || current.bpm || s.bpm || 95))),
      sections,
      lyrics,
      sectionSolos,
      arrangement: parts.map((p) => ({
        section: p.section,
        label: p.label || labelFor(p.section),
        bars: Math.max(1, Number(p.bars) || suggestedBars(p.section))
      })),
      updatedAt: new Date().toISOString()
    });

    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(project));
    toast(ctx, "Estructura aplicada. Recargando canción...");
    setTimeout(() => window.location.reload(), 450);
  }

  function defaultChordsFor(section, key, bars) {
    const map = {
      intro: ["I", "V"],
      verse: ["I", "V", "vi", "IV"],
      verse1: ["I", "V", "vi", "IV"],
      verse2: ["I", "V", "vi", "IV"],
      verse3: ["I", "V", "vi", "IV"],
      verse4: ["I", "V", "vi", "IV"],
      prechorus: ["IV", "V", "vi", "V"],
      chorus: ["I", "V", "vi", "IV"],
      bridge: ["vi", "IV", "I", "V"],
      interlude: ["I", "IV"],
      solo: ["I", "V", "vi", "IV"],
      outro: ["I", "V"]
    };
    const base = baseType(section);
    const romans = map[section] || map[base] || ["I", "V", "vi", "IV"];
    const chordNames = romans.map((r) => romanToChord(key, r));
    const per = Math.max(1, Math.round((Number(bars) || suggestedBars(section)) / Math.max(1, chordNames.length)));
    return chordNames.map((name) => ({ name, bass: chordBass(name), notes: chordNotes(name, key).join(" "), bars: per }));
  }

  function baseType(section) {
    const k = String(section || "").toLowerCase();
    if (k.includes("intro")) return "intro";
    if (k.includes("pre")) return "prechorus";
    if (k.includes("chorus") || k.includes("coro")) return "chorus";
    if (k.includes("bridge") || k.includes("puente")) return "bridge";
    if (k.includes("interlude")) return "interlude";
    if (k.includes("solo")) return "solo";
    if (k.includes("outro")) return "outro";
    return "verse";
  }

  const NOTE_INDEX = { C:0, "C#":1, Db:1, D:2, "D#":3, Eb:3, E:4, F:5, "F#":6, Gb:6, G:7, "G#":8, Ab:8, A:9, "A#":10, Bb:10, B:11 };
  const SHARP = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const FLAT = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
  const FLAT_KEYS = new Set(["F","Bb","Eb","Ab","Db","Gb"]);
  const ROMAN = { I:0, ii:1, iii:2, IV:3, V:4, vi:5, vii:6 };

  function normalizeKey(value) {
    const m = String(value || "").trim().match(/^([A-Ga-g])([#b]?)/);
    return m ? m[1].toUpperCase() + (m[2] || "") : "C";
  }

  function projectKey(s, current) {
    return normalizeKey(current?.key || current?.soloKey || s?.key || s?.soloKey || "C");
  }

  function namesFor(key) { return String(key || "").includes("b") || FLAT_KEYS.has(key) ? FLAT : SHARP; }

  function majorChords(key) {
    const root = NOTE_INDEX[normalizeKey(key)] ?? 0;
    const names = namesFor(key);
    const quality = ["", "m", "m", "", "", "m", "dim"];
    return [0,2,4,5,7,9,11].map((step, i) => names[(root + step) % 12] + quality[i]);
  }

  function romanToChord(key, roman) {
    const chords = majorChords(key);
    const idx = ROMAN[roman];
    return idx === undefined ? roman : chords[idx];
  }

  function chordBass(name) {
    const m = String(name || "").match(/^([A-Ga-g])([#b]?)/);
    return (m ? m[1].toUpperCase() + (m[2] || "") : "C") + "2";
  }

  function chordNotes(name, key) {
    const rootName = normalizeKey(name);
    const root = NOTE_INDEX[rootName] ?? 0;
    const lower = String(name || "").toLowerCase();
    let intervals = [0,4,7];
    if (/(^|[^a-z])m(?!aj)|min|minor/.test(lower)) intervals = [0,3,7];
    if (/maj7/.test(lower)) intervals.push(11);
    else if (/7|9|11|13/.test(lower)) intervals.push(10);
    if (/9/.test(lower)) intervals.push(2);
    const names = namesFor(key || rootName);
    return Array.from(new Set(intervals)).slice(0, 5).map((n, i) => names[(root + n) % 12] + (i < 3 ? "3" : "4"));
  }

  function backup(ctx, project) {
    const list = safe(() => JSON.parse(localStorage.getItem(BACKUP_KEY) || "[]"), []) || [];
    list.unshift({ id:"structure_" + Date.now(), createdAt:new Date().toISOString(), title:project.title || "Canción", project });
    localStorage.setItem(BACKUP_KEY, JSON.stringify(list.slice(0, 20)));
  }


  function renderAgain(ctx) {
    const content = ctx.content?.() || document.querySelector("#s936SuitePro .s936-sp-content");
    if (content) {
      content.textContent = "";
      const shell = ctx.el("div", "s936-cmp-shell");
      render(ctx, shell);
      content.appendChild(shell);
    } else if (typeof ctx.render === "function") {
      ctx.render();
    }
  }

  function totalBars(parts) { return parts.reduce((sum, p) => sum + Math.max(1, Number(p.bars) || suggestedBars(p.section)), 0); }
  function uniqueSectionCount(parts) { return new Set(parts.map((p) => p.section)).size; }

  function field(ctx, label) {
    const wrap = ctx.el("div", "s936-struct-field");
    wrap.appendChild(ctx.el("label", "", label));
    return wrap;
  }


  function metric(ctx, parent, value, label) {
    const box = ctx.el("div", "metric");
    box.appendChild(ctx.el("b", "", String(value)));
    box.appendChild(ctx.el("span", "", label));
    parent.appendChild(box);
  }

  function button(ctx, parent, label, fn, className = "s936-struct-btn") {
    const b = ctx.el("button", className, label);
    b.type = "button";
    b.onclick = fn;
    parent.appendChild(b);
    return b;
  }

  function mini(ctx, parent, label, fn, danger=false, extraClass="") {
    const b = ctx.el("button", "s936-struct-mini " + extraClass, label);
    b.type = "button";
    if (danger) b.classList.add("danger");
    b.onclick = fn;
    parent.appendChild(b);
    return b;
  }

  function move(parts, index, delta, ctx) {
    const next = index + delta;
    if (next < 0 || next >= parts.length) return;
    const [item] = parts.splice(index, 1);
    parts.splice(next, 0, item);
    state.draft.parts = parts;
    saveState();
    renderAgain(ctx);
  }

  function toast(ctx, message) {
    if (ctx.toast) return ctx.toast(message);
    const box = document.createElement("div");
    box.textContent = message;
    box.style.cssText = "position:fixed;right:18px;bottom:18px;background:#111;color:#00ffcc;border:1px solid #00ffcc;border-radius:12px;padding:10px 12px;z-index:99999;font-weight:900";
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 2200);
  }

  register();
})();
