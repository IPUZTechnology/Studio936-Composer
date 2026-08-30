// Studio 936 Composer - Suite Pro Structure / ADN Module v4.6.1 Cambio 57 (HOTFIX)
// Scope: Compose > Estructura only. No toca app.js, Practice, Drums, Mixer, Recorder ni MIDI.
// Product goal: constructor claro de forma musical, sin controles repetidos y con edición segura sobre el proyecto central.
// Cambio 57 (HOTFIX): mismo bug que el Cambio 54, ahora en el elemento nuevo del
// Cambio 56 — ".s936-lyric-sub-row{display:flex}" le ganaba en cascada a [hidden],
// así que esa fila (vacía, 52px) quedaba SIEMPRE visible debajo de cada celda,
// incluso en tiempos sin dividir. Se restaura el comportamiento correcto.
(function () {
  "use strict";

  const STYLE_ID = "s936SuiteProStructureStylesV461Cambio57";
  const STATE_KEY = "s936_suitepro_structure_v4";
  const APP_STORAGE_KEY = "studio936ComposerV25SongStructure";
  const BACKUP_KEY = "studio936_structure_backups_v4";
  const NAV_KEY = "s936_chart_navigation_v1";

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
    editingIndex: -1,
    focusSection: ""
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
    window.Studio936SuiteProStructure = { version: "structure-v4.4.6-cambio-42", render };
    window.Studio936SuiteProModules.structure = window.Studio936SuiteProStructure;
  }


  function installDockFlexGuard() {
    if (window.__s936DockFlexGuardCambio41) return;
    window.__s936DockFlexGuardCambio41 = true;

    const sync = () => {
      try {
        const dock = document.getElementById("s936SuitePro");
        const chartPanel = document.querySelector("#s936-chart-view-panel, .s936-chart-main-panel");
        if (!dock) return;
        const dockRect = dock.getBoundingClientRect();
        document.documentElement.style.setProperty("--s936-suite-dock-right", Math.ceil(dockRect.right + 8) + "px");
        if (chartPanel) {
          // Cambio 48: no empujar el Chart con margin-left; eso generaba scroll horizontal
          // y podía dejar visible el piano/main. El layout real lo maneja el escenario.
          chartPanel.style.marginLeft = "";
          chartPanel.style.width = "";
          chartPanel.dataset.s936DockFlex = "balanced";
        }
        document.documentElement.style.overflowX = "hidden";
        document.body.style.overflowX = "hidden";
      } catch (_) {}
    };

    window.addEventListener("resize", sync, { passive: true });
    window.addEventListener("studio936:chart-mounted", sync);
    window.addEventListener("studio936:chart-practice-start", sync);
    setTimeout(sync, 60);
    setTimeout(sync, 420);
    setTimeout(sync, 1100);
  }

  function installChartStageKeeperCambio41() {
    if (window.__s936ChartStageKeeperCambio41) return;
    window.__s936ChartStageKeeperCambio41 = true;

    const isStructureVisible = () => {
      try {
        const root = document.querySelector("#s936SuitePro");
        if (!root) return false;
        const active = root.querySelector(".s936-compose-subrail .active,[data-tool='structure'].active");
        if (active && active.dataset?.tool && active.dataset.tool !== "structure") return false;
        return !!root.querySelector(".s936-struct-v4,.s936-struct-shell");
      } catch (_) { return false; }
    };

    const ensure = () => {
      try {
        if (!isStructureVisible()) return;
        const Chart = window.Studio936SuiteProChart;
        if (!Chart || typeof Chart.mountInRightPanel !== "function") return;
        const panel = document.getElementById("s936-chart-view-panel");
        const pianoVisible = (() => {
          const p = document.getElementById("pianoContainer") || document.querySelector(".piano-container,.s936-main-piano");
          if (!p) return false;
          const r = p.getBoundingClientRect();
          return r.width > 200 && r.height > 80 && getComputedStyle(p).display !== "none";
        })();
        if (!panel || pianoVisible || !document.body.classList.contains("s936-chart-stage")) {
          Chart.mountInRightPanel({
            onChordEdit: (sectionKey, chordIndex) => {
              try {
                window.Studio936AppBridge?.selectEditorSection?.(sectionKey);
                window.Studio936AppBridge?.selectEditorChord?.(sectionKey, chordIndex);
              } catch(_) {}
            }
          });
          window.dispatchEvent(new CustomEvent("studio936:chart-mounted", { detail: { source: "cambio41-keeper" } }));
        }
      } catch (error) {
        console.warn("Cambio 44 chart keeper:", error);
      }
    };

    window.addEventListener("load", () => setTimeout(ensure, 350), { once: true });
    window.addEventListener("resize", () => setTimeout(ensure, 120), { passive: true });
    document.addEventListener("click", () => setTimeout(ensure, 180), true);
    [120, 500, 1100, 2000, 3500].forEach((ms) => setTimeout(ensure, ms));
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
  border:1px solid rgba(255,224,102,.3);
  background:rgba(255,224,102,.06);
  color:rgba(255,224,102,.8);
  font-size:.9rem;
  cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  transition:border-color .15s,background .15s;
  position:relative;
  overflow:visible;
}
#s936SuitePro .s936-ckpt-topbar{
  overflow:visible!important;
}
#s936SuitePro .s936-ckpt-shell{
  overflow:visible!important;
}
#s936SuitePro .s936-ckpt-menu-btn:hover{border-color:rgba(255,224,102,.7);color:#ffe066;background:rgba(255,224,102,.12)}
/* Dropdown del menú */
#s936SuitePro .s936-ckpt-dropdown{
  display:none;
  position:absolute;
  top:36px;
  right:0;
  background:#0d1117;
  border:1px solid rgba(0,255,204,.35);
  border-radius:10px;
  padding:6px;
  z-index:9999;
  min-width:220px;
  box-shadow:0 8px 24px rgba(0,0,0,.9);
}
#s936SuitePro .s936-ckpt-dropdown.open{display:block}
#s936SuitePro .s936-ckpt-dd-item{
  display:block;width:100%;
  text-align:left;
  background:transparent;
  border:none;
  color:rgba(255,255,255,.82);
  font-size:.75rem;
  font-weight:600;
  padding:8px 12px;
  border-radius:7px;
  cursor:pointer;
  text-transform:none!important;
  letter-spacing:0!important;
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

#s936SuitePro .s936-struct-change-banner{
  display:inline-flex;align-items:center;justify-content:flex-start;gap:6px;
  width:max-content;max-width:100%;
  border:1px solid rgba(0,255,204,.30);
  border-radius:999px;
  background:rgba(0,255,204,.10);
  color:#bfffee;
  padding:4px 9px;
  font-size:.52rem;
  font-weight:900;
  letter-spacing:.55px;
  text-transform:uppercase;
  box-shadow:0 0 12px rgba(0,255,204,.05);
}
#s936SuitePro .s936-struct-right-status{
  border:1px solid rgba(255,216,77,.26);
  border-radius:12px;
  background:rgba(255,216,77,.07);
  color:#ffeaa0;
  padding:9px 10px;
  font-size:.62rem;
  line-height:1.35;
}
#s936SuitePro .s936-struct-chart-card{
  padding:0;
  overflow:hidden;
  border-color:rgba(0,255,204,.28);
  background:#090b11;
}
#s936SuitePro .s936-struct-chart-card .s936-struct-chart-title{
  display:flex;align-items:center;justify-content:space-between;gap:8px;
  padding:10px 12px;
  border-bottom:1px solid rgba(255,255,255,.08);
}
#s936SuitePro .s936-struct-chart-card .s936-struct-chart-title h4{
  margin:0;color:#8affff;font-size:.76rem;text-transform:uppercase;letter-spacing:.8px;
}
#s936SuitePro .s936-struct-chart-card .s936-struct-chart-title span{
  color:rgba(255,255,255,.58);font-size:.62rem;font-weight:800;
}
#s936SuitePro .s936-struct-chart-card #s936-chart-view-panel{
  max-height:62vh;
  overflow:auto;
  border-radius:0;
}

/* ── MODAL EDITAR PARTE v4.4 ── */
#s936-part-modal-overlay{
  position:fixed;inset:0;
  background:rgba(0,0,0,.72);
  z-index:9000;
  display:flex;align-items:center;justify-content:center;
  padding:16px;
}
#s936-part-modal{
  background:#0d1117;
  border:1px solid rgba(0,255,204,.35);
  border-radius:16px;
  width:100%;max-width:480px;
  max-height:90vh;
  overflow-y:auto;
  box-shadow:0 24px 64px rgba(0,0,0,.9);
  display:flex;flex-direction:column;
}
.s936-modal-head{
  display:flex;align-items:center;gap:10px;
  padding:12px 16px;
  border-bottom:1px solid rgba(255,255,255,.08);
  position:sticky;top:0;background:#0d1117;z-index:1;
}
.s936-modal-badge{
  border-radius:5px;
  font-size:.52rem;font-weight:900;
  padding:3px 8px;
  text-transform:uppercase;letter-spacing:.5px;
  flex-shrink:0;
}
.s936-modal-title{
  font-size:.82rem;font-weight:700;color:#fff;flex:1;
}
.s936-modal-close{
  width:28px;height:28px;border-radius:7px;
  border:1px solid rgba(255,255,255,.15);
  background:rgba(255,255,255,.05);
  color:rgba(255,255,255,.6);
  font-size:.9rem;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  transition:border-color .12s,color .12s;flex-shrink:0;
}
.s936-modal-close:hover{border-color:rgba(255,80,80,.6);color:#ff8080}
.s936-modal-body{padding:14px 16px;display:flex;flex-direction:column;gap:14px;}
.s936-modal-block{
  border:1px solid rgba(255,255,255,.08);
  border-radius:10px;
  overflow:hidden;
}
.s936-modal-block-head{
  padding:6px 12px;
  background:rgba(255,255,255,.04);
  border-bottom:1px solid rgba(255,255,255,.06);
  color:rgba(255,255,255,.45);
  font-size:.58rem;font-weight:900;
  text-transform:uppercase;letter-spacing:.7px;
}
.s936-modal-block-body{
  padding:10px 12px;
  display:grid;gap:10px;
}
.s936-modal-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.s936-modal-row.three{grid-template-columns:1fr 1fr 1fr;}
.s936-modal-field label{
  display:block;
  color:rgba(255,255,255,.4);
  font-size:.57rem;font-weight:900;
  text-transform:uppercase;letter-spacing:.5px;
  margin-bottom:4px;
}
.s936-modal-input,.s936-modal-select{
  width:100%;
  background:rgba(255,255,255,.06)!important;
  border:1px solid rgba(255,255,255,.14);
  border-radius:8px;
  color:#fff!important;
  font-size:.75rem;font-weight:700;
  padding:7px 10px;
  outline:none;
  transition:border-color .15s;
  box-sizing:border-box;
  -webkit-appearance:none;appearance:none;
}
.s936-modal-select option{background:#0d1117!important;color:#fff!important;}
.s936-modal-input:focus,.s936-modal-select:focus{border-color:rgba(0,255,204,.5);}
.s936-modal-input.bpm{
  color:#00ffcc!important;
  background:rgba(0,255,204,.07)!important;
  border-color:rgba(0,255,204,.25);
  text-align:center;font-size:.9rem;
}
/* Marcas de navegación */
.s936-modal-marks{display:flex;flex-wrap:wrap;gap:6px;}
.s936-modal-mark{
  border-radius:7px;
  border:1px solid rgba(255,255,255,.15);
  background:rgba(255,255,255,.05);
  color:rgba(255,255,255,.55);
  font-size:.62rem;font-weight:900;
  padding:5px 10px;cursor:pointer;
  transition:border-color .12s,color .12s,background .12s;
  user-select:none;
}
.s936-modal-mark.active{
  border-color:rgba(180,100,255,.6);
  background:rgba(180,100,255,.12);
  color:#cc99ff;
}
.s936-modal-mark:hover:not(.active){border-color:rgba(255,255,255,.3);color:#fff;}
/* Notas texto */
.s936-modal-textarea{
  width:100%;
  background:rgba(255,255,255,.05);
  border:1px solid rgba(255,255,255,.12);
  border-radius:8px;color:#fff;
  font-size:.72rem;
  padding:8px 10px;
  outline:none;resize:vertical;
  min-height:52px;
  box-sizing:border-box;
  transition:border-color .15s;
}
.s936-modal-textarea:focus{border-color:rgba(0,255,204,.4);}
/* Footer acciones */
.s936-modal-foot{
  display:flex;gap:8px;
  padding:12px 16px;
  border-top:1px solid rgba(255,255,255,.08);
  position:sticky;bottom:0;background:#0d1117;
}
.s936-modal-btn{
  flex:1;
  border-radius:8px;
  font-size:.65rem;font-weight:900;
  padding:9px;cursor:pointer;
  text-transform:uppercase;letter-spacing:.5px;
  transition:background .12s;border:1px solid;
}
.s936-modal-btn.save{
  background:rgba(0,255,204,.12);
  border-color:rgba(0,255,204,.45);color:#00ffcc;
}
.s936-modal-btn.save:hover{background:rgba(0,255,204,.22);}
.s936-modal-btn.cancel{
  background:rgba(255,255,255,.05);
  border-color:rgba(255,255,255,.15);color:rgba(255,255,255,.55);
  flex:0 0 80px;
}
.s936-modal-btn.cancel:hover{background:rgba(255,255,255,.1);}

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
  display:none;
}
#s936SuitePro .s936-ckpt-nav-mark{
  border-radius:5px;
  font-size:.5rem;font-weight:900;
  padding:2px 7px;
  text-transform:uppercase;letter-spacing:.4px;
  cursor:pointer;
  flex-shrink:0;
  background:rgba(180,100,255,.15);
  border:1px solid rgba(180,100,255,.45);
  color:#cc99ff;
  transition:background .12s,border-color .12s;
  user-select:none;
}
#s936SuitePro .s936-ckpt-nav-mark:hover{
  background:rgba(255,80,80,.15);
  border-color:rgba(255,80,80,.5);
  color:#ff9999;
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
#s936SuitePro .s936-ckpt-row-action.play.playing{
  border-color:rgba(0,255,204,.8);
  color:#00ffcc;
  background:rgba(0,255,204,.18);
  box-shadow:0 0 6px rgba(0,255,204,.3);
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

/* Cambio 24 · Navegación musical visible antes del arreglo */
#s936SuitePro .s936-struct-nav-card{
  border-color:rgba(255,224,102,.54);
  background:linear-gradient(135deg,rgba(255,224,102,.15),rgba(0,255,204,.065));
  box-shadow:0 0 18px rgba(255,224,102,.08);
}
#s936SuitePro .s936-struct-nav-grid{
  display:grid;
  grid-template-columns:1.2fr .65fr 1fr .62fr auto;
  gap:8px;
  align-items:end;
}
#s936SuitePro .s936-struct-nav-grid label{
  display:grid;
  gap:4px;
  color:rgba(255,255,255,.56);
  font-size:.52rem;
  text-transform:uppercase;
  letter-spacing:.55px;
  font-weight:900;
}
#s936SuitePro .s936-struct-nav-grid select,
#s936SuitePro .s936-struct-nav-grid input{
  width:100%;
  box-sizing:border-box;
  border:1px solid rgba(255,255,255,.14);
  background:rgba(0,0,0,.25);
  color:#fff;
  border-radius:10px;
  padding:7px 8px;
  font-size:.68rem;
  font-weight:850;
}
#s936SuitePro .s936-struct-nav-list{
  display:flex;
  flex-wrap:wrap;
  gap:7px;
  margin-top:10px;
}
#s936SuitePro .s936-struct-nav-pill{
  display:inline-flex;
  align-items:center;
  gap:7px;
  border:1px solid rgba(255,224,102,.38);
  background:rgba(255,224,102,.08);
  color:#ffe066;
  border-radius:999px;
  padding:6px 8px 6px 10px;
  font-size:.64rem;
  font-weight:900;
}
#s936SuitePro .s936-struct-nav-pill button{
  border:0;
  background:rgba(255,80,80,.16);
  color:#ffb5b5;
  border-radius:999px;
  width:20px;
  height:20px;
  cursor:pointer;
  font-weight:950;
}
@media(max-width:900px){
  #s936SuitePro .s936-struct-nav-grid{grid-template-columns:1fr 1fr}
}


/* Cambio 29 · Consola por sección */
#s936SuitePro .s936-ckpt-section-console{
  display:flex;
  align-items:center;
  gap:4px;
  flex-shrink:0;
}
#s936SuitePro .s936-ckpt-part-row.is-focus{
  border-color:rgba(0,255,204,.55);
  background:linear-gradient(135deg,rgba(0,255,204,.12),rgba(0,0,0,.20));
  box-shadow:0 0 18px rgba(0,255,204,.10);
}
#s936SuitePro .s936-ckpt-row-action.loop{
  border-color:rgba(255,224,102,.25);
  color:#ffe066;
}
#s936SuitePro .s936-ckpt-row-action.zoom{
  border-color:rgba(0,255,204,.25);
  color:#00ffcc;
}
#s936SuitePro .s936-ckpt-row-action.lyric{
  border-color:rgba(255,91,234,.25);
  color:#ff9df4;
}
#s936SuitePro .s936-ckpt-row-action.rec{
  border-color:rgba(255,80,80,.28);
  color:#ff9d9d;
}
#s936SuitePro .s936-ckpt-focusbar{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
  border:1px solid rgba(0,255,204,.28);
  background:rgba(0,255,204,.07);
  border-radius:12px;
  padding:8px 10px;
  margin:8px 0;
}
#s936SuitePro .s936-ckpt-focusbar b{
  color:#00ffcc;
  font-size:.72rem;
  text-transform:uppercase;
  letter-spacing:.5px;
}
#s936SuitePro .s936-ckpt-focusbar small{
  color:rgba(255,255,255,.48);
  font-size:.56rem;
  font-weight:800;
}
#s936SuitePro .s936-ckpt-focusbar button{
  border:1px solid rgba(255,224,102,.38);
  background:rgba(255,224,102,.08);
  color:#ffe066;
  border-radius:999px;
  padding:6px 10px;
  cursor:pointer;
  font-size:.6rem;
  font-weight:950;
  text-transform:uppercase;
}



/* Cambio 48 · Lyric editor inline: no overlay negro, no invade el Chart */
#s936SuitePro .s936-lyrics-inline-panel{
  margin:10px 0 12px;
  border:1px solid rgba(255,224,102,.38);
  border-radius:16px;
  background:
    radial-gradient(circle at 10% 0%,rgba(255,224,102,.10),transparent 34%),
    linear-gradient(145deg,rgba(10,16,24,.96),rgba(5,8,12,.92));
  box-shadow:0 18px 42px rgba(0,0,0,.34),0 0 0 1px rgba(255,255,255,.05) inset;
  overflow:hidden;
}
#s936SuitePro .s936-lyrics-inline-panel .s936-lyrics-head{
  padding:11px 12px;
  background:linear-gradient(90deg,rgba(0,255,204,.09),rgba(255,224,102,.07));
}
#s936SuitePro .s936-lyrics-inline-panel .s936-lyrics-head b{
  color:#ffe066;
  font-size:.72rem;
}
#s936SuitePro .s936-lyrics-inline-panel .s936-lyrics-head small{
  font-size:.56rem;
}
#s936SuitePro .s936-lyrics-inline-panel .s936-lyrics-body{
  padding:10px 12px 2px;
  max-height:270px;
  overflow:auto;
}
#s936SuitePro .s936-lyrics-inline-panel .s936-lyrics-row{
  grid-template-columns:62px 1fr;
  gap:8px;
}
#s936SuitePro .s936-lyrics-inline-panel .s936-lyrics-row label{
  font-size:.54rem;
}
#s936SuitePro .s936-lyrics-inline-panel .s936-lyrics-row textarea{
  min-height:34px;
  max-height:82px;
  font-size:.68rem;
  padding:8px 9px;
}
#s936SuitePro .s936-lyrics-inline-panel .s936-lyrics-actions{
  padding:10px 12px 12px;
}
#s936SuitePro .s936-lyrics-inline-panel .s936-lyrics-save,
#s936SuitePro .s936-lyrics-inline-panel .s936-lyrics-cancel{
  min-height:34px;
  font-size:.62rem;
}


/* Cambio 48 · Editor flotante tipo Chart de letra por compás y tiempo */
#s936SuitePro .s936-lyrics-inline-panel{display:none!important}
.s936-lyrics-float-panel{
  position:fixed;
  z-index:99999;
  width:min(720px,calc(100vw - 36px));
  height:min(620px,calc(100vh - 54px));
  left:max(18px,calc(50vw - 360px));
  top:96px;
  resize:both;
  overflow:hidden;
  display:flex;
  flex-direction:column;
  border:1px solid rgba(0,255,204,.42);
  border-radius:18px;
  background:
    radial-gradient(circle at 12% 0%,rgba(0,255,204,.13),transparent 35%),
    radial-gradient(circle at 90% 0%,rgba(255,224,102,.11),transparent 33%),
    linear-gradient(145deg,rgba(7,12,18,.97),rgba(3,6,10,.94));
  box-shadow:0 24px 70px rgba(0,0,0,.56),0 0 0 1px rgba(255,255,255,.06) inset;
  color:#fff;
  backdrop-filter:blur(16px);
}
.s936-lyrics-float-panel .s936-lyrics-head{
  cursor:move;
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:12px;
  padding:12px 14px;
  border-bottom:1px solid rgba(0,255,204,.16);
  background:linear-gradient(90deg,rgba(0,255,204,.10),rgba(255,224,102,.07));
  user-select:none;
}
.s936-lyrics-float-panel .s936-lyrics-head b{
  display:block;
  color:#00ffcc;
  font-size:.82rem;
  letter-spacing:.45px;
  text-transform:uppercase;
}
.s936-lyrics-float-panel .s936-lyrics-head small{
  display:block;
  margin-top:3px;
  color:rgba(255,255,255,.58);
  font-size:.62rem;
  font-weight:800;
}
.s936-lyrics-float-panel .s936-lyrics-close{
  width:30px;
  height:30px;
  border-radius:10px;
  border:1px solid rgba(255,255,255,.18);
  background:rgba(255,255,255,.06);
  color:#fff;
  font-weight:900;
  cursor:pointer;
}
.s936-lyrics-float-panel .s936-lyrics-body{
  padding:12px 14px;
  flex:1;
  overflow:auto;
}
.s936-lyrics-float-panel .s936-lyrics-help{
  margin:0 0 12px;
  padding:9px 10px;
  border:1px solid rgba(255,224,102,.18);
  border-radius:12px;
  background:rgba(255,224,102,.06);
  color:rgba(255,255,255,.70);
  font-size:.66rem;
  line-height:1.38;
  font-weight:800;
}
.s936-lyrics-float-panel .s936-lyrics-row{
  display:grid;
  grid-template-columns:72px 1fr;
  gap:10px;
  align-items:start;
  margin-bottom:10px;
  padding:9px;
  border:1px solid rgba(255,255,255,.08);
  border-radius:14px;
  background:rgba(255,255,255,.035);
}
.s936-lyrics-float-panel .s936-lyrics-row label{
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  min-height:76px;
  border-radius:12px;
  border:1px solid rgba(0,255,204,.18);
  background:rgba(0,255,204,.06);
  color:#00ffcc;
  font-size:.62rem;
  font-weight:950;
  text-transform:uppercase;
  letter-spacing:.5px;
}
.s936-lyrics-float-panel .s936-lyrics-row label span{
  margin-top:4px;
  color:rgba(255,255,255,.45);
  font-size:.52rem;
}
.s936-lyrics-float-panel .s936-lyrics-beat-grid{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:7px;
}
.s936-lyrics-float-panel .s936-lyrics-beat-cell{
  min-width:0;
}
.s936-lyrics-float-panel .s936-lyrics-beat-cell em{
  display:block;
  margin:0 0 4px;
  color:#ffe066;
  font-size:.53rem;
  font-style:normal;
  font-weight:950;
  text-transform:uppercase;
}
.s936-lyrics-float-panel .s936-lyrics-beat-cell textarea{
  width:100%;
  min-height:58px;
  max-height:120px;
  resize:vertical;
  box-sizing:border-box;
  border:1px solid rgba(0,255,204,.16);
  border-radius:10px;
  background:rgba(0,0,0,.30);
  color:#fff;
  padding:8px;
  font-size:.72rem;
  line-height:1.24;
  outline:none;
}
.s936-lyrics-float-panel .s936-lyrics-beat-cell textarea:focus{
  border-color:rgba(0,255,204,.62);
  box-shadow:0 0 0 2px rgba(0,255,204,.09);
}
.s936-lyrics-float-panel .s936-lyrics-actions{
  display:flex;
  gap:10px;
  padding:12px 14px;
  border-top:1px solid rgba(0,255,204,.14);
  background:rgba(0,0,0,.22);
}
.s936-lyrics-float-panel .s936-lyrics-save,
.s936-lyrics-float-panel .s936-lyrics-cancel{
  flex:1;
  min-height:38px;
  border-radius:12px;
  border:1px solid rgba(0,255,204,.32);
  background:rgba(0,255,204,.11);
  color:#dffff8;
  font-size:.68rem;
  font-weight:950;
  text-transform:uppercase;
  cursor:pointer;
}
.s936-lyrics-float-panel .s936-lyrics-cancel{
  flex:.45;
  border-color:rgba(255,255,255,.18);
  background:rgba(255,255,255,.06);
  color:rgba(255,255,255,.82);
}
@media(max-width:720px){
  .s936-lyrics-float-panel{
    left:10px!important;
    top:72px!important;
    width:calc(100vw - 20px)!important;
    height:calc(100vh - 92px)!important;
  }
  .s936-lyrics-float-panel .s936-lyrics-row{
    grid-template-columns:1fr;
  }
  .s936-lyrics-float-panel .s936-lyrics-row label{
    min-height:34px;
    flex-direction:row;
    gap:6px;
  }
  .s936-lyrics-float-panel .s936-lyrics-beat-grid{
    grid-template-columns:repeat(2,minmax(0,1fr));
  }
}


/* Cambio 50 · Ly glass más limpio + guía suave + duración por tempo */
.s936-lyrics-float-panel{
  border-color:rgba(0,255,204,.26)!important;
  box-shadow:0 18px 54px rgba(0,0,0,.46),0 0 0 1px rgba(255,255,255,.035) inset!important;
}
.s936-lyrics-float-panel .s936-lyrics-head{
  padding:10px 12px!important;
  align-items:center!important;
}
.s936-lyrics-float-panel .s936-lyrics-title{
  display:flex;
  align-items:center;
  gap:8px;
  min-width:0;
}
.s936-lyrics-float-panel .s936-lyrics-head b{
  font-size:.80rem!important;
  letter-spacing:.35px!important;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.s936-lyrics-float-panel .s936-lyrics-head small{
  display:none!important;
}
.s936-lyrics-float-panel .s936-lyrics-info{
  width:22px;
  height:22px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  border:1px solid rgba(255,224,102,.28);
  border-radius:8px;
  color:#ffe066;
  background:rgba(255,224,102,.06);
  font-size:.62rem;
  font-weight:950;
  cursor:help;
  flex:0 0 auto;
}
.s936-lyrics-float-panel .s936-lyrics-help{
  display:none!important;
}
.s936-lyrics-float-panel .s936-lyrics-chart-grid{
  gap:10px!important;
}
.s936-lyrics-float-panel .s936-lyrics-bar-card{
  border-color:rgba(0,255,204,.16)!important;
  background:linear-gradient(135deg,rgba(0,255,204,.035),rgba(255,224,102,.018))!important;
  box-shadow:0 10px 28px rgba(0,0,0,.22)!important;
}
.s936-lyrics-float-panel .s936-lyrics-bar-head{
  border-color:rgba(0,255,204,.16)!important;
  background:rgba(0,0,0,.16)!important;
}
.s936-lyrics-float-panel .s936-lyrics-beat-cell em{
  display:flex!important;
  align-items:center;
  justify-content:center;
  min-height:18px;
  padding:2px 4px;
  margin:0 0 5px!important;
  border-radius:7px;
  border:1px solid rgba(255,224,102,.10);
  background:rgba(255,224,102,.028);
  color:rgba(255,224,102,.66)!important;
  font-size:.46rem!important;
  font-weight:800!important;
  letter-spacing:.02em!important;
  text-transform:none!important;
}
.s936-lyrics-float-panel .s936-lyrics-beat-cell textarea{
  min-height:62px!important;
  font-size:.84rem!important;
  line-height:1.20!important;
  font-weight:800;
  border-color:rgba(0,255,204,.13)!important;
  background:rgba(0,0,0,.22)!important;
}
.s936-lyrics-float-panel .s936-lyric-duration-row{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:5px;
  margin-top:5px;
}
.s936-lyrics-float-panel .s936-lyric-duration-row span{
  color:rgba(255,255,255,.38);
  font-size:.46rem;
  font-weight:900;
  text-transform:uppercase;
}
.s936-lyrics-float-panel .s936-lyric-duration{
  width:46px;
  height:20px;
  border-radius:8px;
  border:1px solid rgba(255,224,102,.18);
  background:rgba(255,224,102,.055);
  color:rgba(255,224,102,.82);
  font-size:.50rem;
  font-weight:950;
  outline:none;
  cursor:pointer;
}
.s936-lyrics-float-panel .s936-lyrics-actions{
  display:none!important;
}

/* Cambio 31 · Consola por sección funcional */
#s936SuitePro .s936-ckpt-part-row.is-console-playing{
  border-color:rgba(255,224,102,.55);
  background:linear-gradient(135deg,rgba(255,224,102,.12),rgba(0,0,0,.22));
  box-shadow:0 0 18px rgba(255,224,102,.10);
}
#s936SuitePro .s936-ckpt-row-action.play.playing,
#s936SuitePro .s936-ckpt-row-action.loop.playing{
  border-color:rgba(255,224,102,.70)!important;
  color:#ffe066!important;
  background:rgba(255,224,102,.14)!important;
  box-shadow:0 0 12px rgba(255,224,102,.16);
}
#s936SuitePro .s936-ckpt-console-state{
  display:none;
  margin-left:auto;
  color:rgba(255,224,102,.85);
  font-size:.52rem;
  font-weight:950;
  text-transform:uppercase;
  letter-spacing:.45px;
}
#s936SuitePro .s936-ckpt-part-row.is-console-playing .s936-ckpt-console-state{
  display:inline-flex;
}

/* Cambio 24 · Mini consola sesión real; las marcas se editan en el Chart */
.s936-session-console-card{
  border-color:rgba(0,255,204,.40)!important;
  background:
    radial-gradient(circle at 20% 0%,rgba(0,255,204,.12),transparent 34%),
    linear-gradient(135deg,rgba(0,255,204,.08),rgba(255,91,234,.035))!important;
  box-shadow:0 0 26px rgba(0,255,204,.07);
}
.s936-session-console-top{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:10px;
  margin-bottom:8px;
}
.s936-session-console-titlewrap h4{
  margin:0;
}
.s936-session-console-titlewrap small{
  display:block;
  color:rgba(255,255,255,.42);
  font-size:.54rem;
  font-weight:800;
  text-transform:uppercase;
  letter-spacing:.45px;
  margin-top:2px;
}
.s936-session-engine{
  border:1px solid rgba(255,255,255,.13);
  background:rgba(255,255,255,.045);
  color:rgba(255,255,255,.48);
  border-radius:999px;
  padding:5px 8px;
  font-size:.52rem;
  font-weight:900;
  white-space:nowrap;
}
.s936-session-engine.on{
  color:#00ffcc;
  border-color:rgba(0,255,204,.45);
  background:rgba(0,255,204,.10);
}
.s936-session-display{
  display:flex;
  flex-wrap:wrap;
  gap:6px;
  margin-bottom:9px;
}
.s936-session-chip{
  border:1px solid rgba(255,255,255,.12);
  background:rgba(255,255,255,.045);
  color:rgba(255,255,255,.62);
  border-radius:9px;
  padding:6px 8px;
  font-size:.58rem;
  font-weight:900;
}
.s936-session-chip.strong{
  color:#bfffee;
  border-color:rgba(0,255,204,.38);
  background:rgba(0,255,204,.10);
}
.s936-session-console-row{
  display:grid;
  gap:7px;
  margin-top:8px;
}
.s936-session-console-row.main{
  grid-template-columns:repeat(2,minmax(0,1fr));
}
.s936-session-console-row.secondary{
  grid-template-columns:repeat(3,minmax(0,1fr));
}
.s936-session-big{
  min-height:34px;
  font-size:.66rem!important;
}
.s936-session-console-card .s936-struct-btn.active,
.s936-session-console-card .s936-struct-btn.primary.active{
  box-shadow:0 0 18px rgba(0,255,204,.22);
  border-color:#00ffcc!important;
}
.s936-session-console-note{
  margin-top:9px;
  color:rgba(255,255,255,.46);
  font-size:.58rem;
  line-height:1.35;
}
.s936-session-mark-summary{display:none!important;}
.s936-struct-nav-pill.compact{
  font-size:.52rem;
  padding:3px 6px;
}




/* Cambio 39 · Limpieza del dock: no trackers/banners temporales */
#s936SuitePro .s936-struct-change-banner,
#s936SuitePro .s936-struct-right-status,
#s936SuitePro .s936-ckpt-topbar,
#s936SuitePro .s936-ckpt-topbar-compact{
  display:none!important;
}
#s936SuitePro .s936-struct-shell{gap:8px!important}
#s936SuitePro .s936-struct-card.s936-struct-arrangement-full{margin-top:0!important}
`;
    style.textContent += `
/* Cambio 31 · Dock limpio: datos maestros arriba, menú canción compacto, canales dorados */
#s936SuitePro .s936-ckpt-topbar-compact{
  display:flex!important;
  justify-content:flex-end!important;
  align-items:center!important;
  padding:4px 8px!important;
  min-height:0!important;
  background:transparent!important;
  border-bottom:0!important;
  margin:-2px 0 4px!important;
}
#s936SuitePro .s936-ckpt-topbar-compact .s936-ckpt-input,
#s936SuitePro .s936-ckpt-topbar-compact .s936-ckpt-select,
#s936SuitePro .s936-ckpt-topbar-compact .s936-ckpt-bpm,
#s936SuitePro .s936-ckpt-status{display:none!important}
#s936SuitePro .s936-ckpt-shell{
  border:0!important;
  background:transparent!important;
  box-shadow:none!important;
}
#s936SuitePro .s936-ckpt-menu-btn-wide{
  width:auto!important;
  height:26px!important;
  padding:4px 10px!important;
  border-radius:999px!important;
  border-color:rgba(255,216,77,.34)!important;
  background:rgba(255,216,77,.055)!important;
  color:#ffe066!important;
  text-transform:uppercase!important;
  font-weight:950!important;
  box-shadow:0 0 0 1px rgba(0,0,0,.18) inset;
}
#s936SuitePro .s936-ckpt-menu-btn-wide:hover{
  background:rgba(255,216,77,.11)!important;
  border-color:rgba(255,216,77,.62)!important;
}
#s936SuitePro .s936-ckpt-row-actions{
  gap:4px!important;
}
#s936SuitePro .s936-ckpt-row-action,
#s936SuitePro .s936-ckpt-row-btn{
  color:#e9d48a!important;
  border-color:rgba(233,212,138,.23)!important;
  background:rgba(233,212,138,.045)!important;
  box-shadow:none!important;
  font-size:.58rem!important;
  line-height:1!important;
  font-weight:950!important;
  min-width:24px!important;
  height:24px!important;
}
#s936SuitePro .s936-ckpt-row-action:hover,
#s936SuitePro .s936-ckpt-row-btn:hover{
  color:#ffe066!important;
  border-color:rgba(255,224,102,.48)!important;
  background:rgba(255,224,102,.09)!important;
}
#s936SuitePro .s936-ckpt-row-action.play.playing{
  color:#00ffcc!important;
  border-color:rgba(0,255,204,.55)!important;
  background:rgba(0,255,204,.10)!important;
}
#s936SuitePro .s936-ckpt-row-action.loop,
#s936SuitePro .s936-ckpt-row-action.zoom,
#s936SuitePro .s936-ckpt-row-action.lyric,
#s936SuitePro .s936-ckpt-row-action.rec,
#s936SuitePro .s936-ckpt-row-action.danger{
  color:#e9d48a!important;
  border-color:rgba(233,212,138,.23)!important;
  background:rgba(233,212,138,.045)!important;
}
#s936SuitePro .s936-ckpt-row-action.lyric,
#s936SuitePro .s936-ckpt-row-action.rec{
  font-size:.46rem!important;
  letter-spacing:.25px!important;
}
#s936SuitePro .s936-ckpt-part-row{
  grid-template-columns:28px 54px minmax(0,1fr) auto!important;
}
#s936SuitePro .s936-ckpt-part-row:hover{
  border-color:rgba(255,224,102,.24)!important;
}
#s936SuitePro .s936-ckpt-part-row.is-focus{
  border-color:rgba(255,224,102,.48)!important;
  box-shadow:0 0 0 1px rgba(255,224,102,.16) inset,0 0 18px rgba(255,224,102,.08);
}

/* Cambio 39 · Dock como consola por sección: menú arriba, botones sobrios y agrupados */
#s936SuitePro .s936-ckpt-topbar,
#s936SuitePro .s936-ckpt-topbar-compact,
#s936SuitePro .s936-ckpt-menu-btn-wide,
#s936SuitePro .s936-ckpt-dropdown{
  display:none!important;
}
#s936SuitePro .s936-struct-shell{gap:6px!important}
#s936SuitePro .s936-struct-card.s936-struct-arrangement-full{
  margin-top:0!important;
  padding-top:10px!important;
  border-color:rgba(0,255,204,.22)!important;
  background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(0,0,0,.08))!important;
}
#s936SuitePro .s936-struct-section-heading{
  margin-bottom:8px!important;
}
#s936SuitePro .s936-ckpt-part-row{
  min-height:41px!important;
  padding:6px 8px!important;
  border-color:rgba(255,255,255,.085)!important;
  background:rgba(255,255,255,.026)!important;
  grid-template-columns:25px 52px minmax(0,1fr) auto!important;
}
#s936SuitePro .s936-ckpt-part-row:hover{
  border-color:rgba(255,224,102,.30)!important;
  background:rgba(255,224,102,.035)!important;
}
#s936SuitePro .s936-ckpt-part-row.is-console-playing,
#s936SuitePro .s936-ckpt-part-row.is-focus{
  border-color:rgba(255,224,102,.52)!important;
  background:linear-gradient(135deg,rgba(255,224,102,.10),rgba(0,255,204,.04))!important;
  box-shadow:0 0 0 1px rgba(255,224,102,.12) inset,0 0 18px rgba(255,224,102,.08)!important;
}
#s936SuitePro .s936-ckpt-row-actions{
  display:flex!important;
  align-items:center!important;
  gap:3px!important;
  padding-left:5px!important;
  border-left:1px solid rgba(255,224,102,.10);
}
#s936SuitePro .s936-ckpt-row-action,
#s936SuitePro .s936-ckpt-row-btn{
  width:24px!important;
  min-width:24px!important;
  height:24px!important;
  border-radius:7px!important;
  border:1px solid rgba(233,212,138,.24)!important;
  background:rgba(233,212,138,.040)!important;
  color:#dfca82!important;
  font-size:.55rem!important;
  font-weight:950!important;
  letter-spacing:.12px!important;
}
#s936SuitePro .s936-ckpt-row-action:hover,
#s936SuitePro .s936-ckpt-row-btn:hover{
  color:#ffe066!important;
  border-color:rgba(255,224,102,.58)!important;
  background:rgba(255,224,102,.10)!important;
}
#s936SuitePro .s936-ckpt-row-action.play,
#s936SuitePro .s936-ckpt-row-action.loop,
#s936SuitePro .s936-ckpt-row-action.zoom{
  color:#ffe066!important;
}
#s936SuitePro .s936-ckpt-row-action.lyric,
#s936SuitePro .s936-ckpt-row-action.rec{
  font-size:.44rem!important;
}
#s936SuitePro .s936-ckpt-row-action.play.playing,
#s936SuitePro .s936-ckpt-row-action.loop.playing{
  color:#00ffcc!important;
  border-color:rgba(0,255,204,.55)!important;
  background:rgba(0,255,204,.11)!important;
  box-shadow:0 0 12px rgba(0,255,204,.12)!important;
}
#s936SuitePro .s936-ckpt-part-name{
  font-size:.70rem!important;
}
#s936SuitePro .s936-ckpt-part-num{
  color:rgba(255,255,255,.30)!important;
}
`;
    style.textContent += `
/* Cambio 39 · Panel izquierdo autoajustado y más compacto.
   La consola por sección gana espacio; si la canción es larga, solo la lista hace scroll suave. */
#s936SuitePro .s936-struct-shell{
  gap:4px!important;
}
#s936SuitePro .s936-struct-card.s936-struct-arrangement-full{
  margin-top:0!important;
  padding:7px 7px 9px!important;
  max-height:calc(100vh - 218px)!important;
  overflow:auto!important;
  scrollbar-width:thin;
}
#s936SuitePro .s936-struct-card.s936-struct-arrangement-full::-webkit-scrollbar{
  width:6px;
}
#s936SuitePro .s936-struct-section-heading{
  margin:0 0 6px!important;
}
#s936SuitePro .s936-struct-section-heading h4{
  font-size:.76rem!important;
  line-height:1.1!important;
}
#s936SuitePro .s936-ckpt-part-row{
  min-height:34px!important;
  padding:4px 6px!important;
  grid-template-columns:22px 48px minmax(0,1fr) auto!important;
}
#s936SuitePro .s936-ckpt-part-name{
  font-size:.64rem!important;
  line-height:1.05!important;
}
#s936SuitePro .s936-ckpt-part-num{
  font-size:.54rem!important;
}
#s936SuitePro .s936-ckpt-part-badge{
  transform:scale(.92);
  transform-origin:left center;
}
#s936SuitePro .s936-ckpt-row-actions{
  gap:2px!important;
  padding-left:4px!important;
}
#s936SuitePro .s936-ckpt-row-action,
#s936SuitePro .s936-ckpt-row-btn{
  width:21px!important;
  min-width:21px!important;
  height:21px!important;
  border-radius:7px!important;
  font-size:.48rem!important;
}
#s936SuitePro .s936-ckpt-row-action.lyric,
#s936SuitePro .s936-ckpt-row-action.rec{
  font-size:.40rem!important;
}
@media(max-height:760px){
  #s936SuitePro .s936-struct-card.s936-struct-arrangement-full{
    max-height:calc(100vh - 180px)!important;
  }
  #s936SuitePro .s936-ckpt-part-row{
    min-height:30px!important;
    padding-top:3px!important;
    padding-bottom:3px!important;
  }
  #s936SuitePro .s936-ckpt-row-action,
  #s936SuitePro .s936-ckpt-row-btn{
    width:19px!important;
    min-width:19px!important;
    height:19px!important;
  }
}
`;
    style.textContent += `
/* Cambio 39 · Consola por sección más clara: nombre primero, botones definidos y flechas compactas */
#s936SuitePro .s936-struct-card.s936-struct-arrangement-full{
  border-radius:16px!important;
  padding:8px 8px 10px!important;
  background:
    radial-gradient(circle at 0% 0%,rgba(0,255,204,.07),transparent 30%),
    linear-gradient(180deg,rgba(255,255,255,.035),rgba(0,0,0,.10))!important;
}
#s936SuitePro .s936-ckpt-part-row{
  min-height:38px!important;
  padding:5px 7px!important;
  gap:6px!important;
  grid-template-columns:22px minmax(112px,1fr) auto!important;
  display:grid!important;
  align-items:center!important;
}
#s936SuitePro .s936-ckpt-part-num{
  font-size:.54rem!important;
  opacity:.75!important;
}
#s936SuitePro .s936-ckpt-part-badge{
  grid-column:2!important;
  grid-row:1!important;
  justify-self:start!important;
  transform:none!important;
  order:0!important;
  font-size:.46rem!important;
  padding:2px 6px!important;
  opacity:.92!important;
  margin-left:0!important;
}
#s936SuitePro .s936-ckpt-part-info{
  grid-column:2!important;
  grid-row:1!important;
  padding-left:46px!important;
  min-width:0!important;
}
#s936SuitePro .s936-ckpt-part-name{
  font-size:.70rem!important;
  font-weight:900!important;
  letter-spacing:.05px!important;
}
#s936SuitePro .s936-ckpt-console-state,
#s936SuitePro .s936-ckpt-nav-mark{
  grid-column:2!important;
  justify-self:start!important;
  margin-top:18px!important;
}
#s936SuitePro .s936-ckpt-row-actions{
  grid-column:3!important;
  display:grid!important;
  grid-auto-flow:column!important;
  grid-auto-columns:26px!important;
  align-items:center!important;
  gap:4px!important;
  padding-left:8px!important;
  border-left:1px solid rgba(255,224,102,.12)!important;
}
#s936SuitePro .s936-ckpt-row-action,
#s936SuitePro .s936-ckpt-row-btn{
  width:26px!important;
  min-width:26px!important;
  height:26px!important;
  border-radius:8px!important;
  font-size:.58rem!important;
  color:#e8d28a!important;
  border:1px solid rgba(232,210,138,.28)!important;
  background:linear-gradient(180deg,rgba(232,210,138,.065),rgba(232,210,138,.025))!important;
}
#s936SuitePro .s936-ckpt-row-action:hover,
#s936SuitePro .s936-ckpt-row-btn:hover{
  color:#ffe066!important;
  border-color:rgba(255,224,102,.65)!important;
  background:rgba(255,224,102,.105)!important;
  transform:translateY(-1px);
}
#s936SuitePro .s936-ckpt-row-action.play{
  font-size:.68rem!important;
}
#s936SuitePro .s936-ckpt-row-action.loop{
  font-size:.62rem!important;
}
#s936SuitePro .s936-ckpt-row-action.zoom{
  font-size:.58rem!important;
}
#s936SuitePro .s936-ckpt-row-action.lyric{
  font-size:.48rem!important;
}
#s936SuitePro .s936-ckpt-row-action.rec{
  font-size:.44rem!important;
  letter-spacing:.15px!important;
}
#s936SuitePro .s936-ckpt-row-actions .s936-ckpt-row-action:nth-last-child(3),
#s936SuitePro .s936-ckpt-row-actions .s936-ckpt-row-action:nth-last-child(2){
  width:21px!important;
  min-width:21px!important;
  height:22px!important;
  font-size:.48rem!important;
  opacity:.82!important;
  border-radius:999px!important;
  background:rgba(255,255,255,.025)!important;
}
#s936SuitePro .s936-ckpt-row-gear .s936-ckpt-row-btn{
  width:23px!important;
  min-width:23px!important;
  height:24px!important;
}
@media(max-width:430px){
  #s936SuitePro .s936-ckpt-part-row{
    grid-template-columns:20px minmax(92px,1fr) auto!important;
  }
  #s936SuitePro .s936-ckpt-row-actions{
    grid-auto-columns:23px!important;
    gap:3px!important;
  }
  #s936SuitePro .s936-ckpt-row-action,
  #s936SuitePro .s936-ckpt-row-btn{
    width:23px!important;
    min-width:23px!important;
    height:24px!important;
  }
}
`;

    style.textContent += `
/* Cambio 39 · Consola por sección: botones principales más legibles y mover compacto */
#s936SuitePro .s936-struct-card.s936-struct-arrangement-full{
  padding:8px 7px 10px!important;
}
#s936SuitePro .s936-ckpt-part-row{
  grid-template-columns:20px minmax(116px,1fr) auto!important;
  gap:5px!important;
}
#s936SuitePro .s936-ckpt-row-actions{
  grid-auto-columns:auto!important;
  gap:4px!important;
  padding-left:7px!important;
}
#s936SuitePro .s936-ckpt-row-action,
#s936SuitePro .s936-ckpt-row-btn{
  width:27px!important;
  min-width:27px!important;
  height:27px!important;
  border-radius:9px!important;
}
#s936SuitePro .s936-ckpt-row-action.play,
#s936SuitePro .s936-ckpt-row-action.loop,
#s936SuitePro .s936-ckpt-row-action.zoom{
  width:29px!important;
  min-width:29px!important;
  height:29px!important;
  font-size:.66rem!important;
}
#s936SuitePro .s936-ckpt-row-action.lyric{
  min-width:26px!important;
  font-size:.50rem!important;
}
#s936SuitePro .s936-ckpt-row-action.rec{
  min-width:29px!important;
  font-size:.42rem!important;
}
#s936SuitePro .s936-ckpt-row-action.edit-active,
#s936SuitePro .s936-ckpt-row-action:hover,
#s936SuitePro .s936-ckpt-row-btn:hover{
  box-shadow:0 0 0 1px rgba(255,224,102,.16) inset, 0 0 14px rgba(255,224,102,.10)!important;
}
#s936SuitePro .s936-ckpt-move-stepper{
  width:18px!important;
  height:29px!important;
  display:grid!important;
  grid-template-rows:1fr 1fr!important;
  gap:2px!important;
  align-items:stretch!important;
  justify-items:stretch!important;
  opacity:.88!important;
}
#s936SuitePro .s936-ckpt-move-mini{
  width:18px!important;
  min-width:18px!important;
  height:13px!important;
  padding:0!important;
  border-radius:6px!important;
  border:1px solid rgba(232,210,138,.22)!important;
  background:rgba(255,255,255,.020)!important;
  color:rgba(232,210,138,.70)!important;
  font-size:.46rem!important;
  line-height:10px!important;
  cursor:pointer!important;
}
#s936SuitePro .s936-ckpt-move-mini:hover{
  color:#ffe066!important;
  border-color:rgba(255,224,102,.55)!important;
  background:rgba(255,224,102,.08)!important;
}
#s936SuitePro .s936-ckpt-row-gear .s936-ckpt-row-btn{
  width:23px!important;
  min-width:23px!important;
  height:29px!important;
  border-radius:9px!important;
}
#s936SuitePro .s936-ckpt-part-name{
  max-width:112px!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
  white-space:nowrap!important;
}
@media(max-width:430px){
  #s936SuitePro .s936-ckpt-row-action,
  #s936SuitePro .s936-ckpt-row-btn{
    width:24px!important;
    min-width:24px!important;
    height:25px!important;
  }
  #s936SuitePro .s936-ckpt-row-action.play,
  #s936SuitePro .s936-ckpt-row-action.loop,
  #s936SuitePro .s936-ckpt-row-action.zoom{
    width:26px!important;
    min-width:26px!important;
    height:26px!important;
  }
}

`;
    style.textContent += `
/* Cambio 39 · Consola izquierda compacta: tag + tooltip, nombres ocultos y dock flexible */
#s936SuitePro{
  resize:horizontal!important;
  overflow-x:hidden!important;
  overflow-y:auto!important;
  min-width:330px!important;
  max-width:min(560px,46vw)!important;
  width:clamp(360px,25vw,470px)!important;
}
#s936SuitePro .s936-struct-shell,
#s936SuitePro .s936-struct-card,
#s936SuitePro .s936-struct-arrangement-full,
#s936SuitePro .s936-ckpt-parts,
#s936SuitePro .s936-ckpt-part-row{
  max-width:100%!important;
  overflow-x:hidden!important;
}
#s936SuitePro .s936-struct-arrangement-full{
  scrollbar-width:thin!important;
}
#s936SuitePro .s936-struct-arrangement-full::-webkit-scrollbar{
  width:6px!important;
  height:0!important;
}
#s936SuitePro .s936-ckpt-part-row{
  grid-template-columns:18px 62px minmax(0,1fr)!important;
  min-height:38px!important;
  padding:5px 7px!important;
  gap:5px!important;
}
#s936SuitePro .s936-ckpt-part-info{
  display:none!important;
}
#s936SuitePro .s936-ckpt-part-badge{
  grid-column:2!important;
  grid-row:1!important;
  justify-self:stretch!important;
  align-self:center!important;
  text-align:center!important;
  transform:none!important;
  max-width:62px!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
  white-space:nowrap!important;
  cursor:help!important;
  font-size:.48rem!important;
  padding:3px 4px!important;
  border-radius:7px!important;
}
#s936SuitePro .s936-ckpt-part-num{
  grid-column:1!important;
  font-size:.52rem!important;
  opacity:.48!important;
}
#s936SuitePro .s936-ckpt-row-actions{
  grid-column:3!important;
  display:flex!important;
  justify-content:flex-end!important;
  align-items:center!important;
  gap:4px!important;
  padding-left:6px!important;
  min-width:0!important;
}
#s936SuitePro .s936-ckpt-row-action,
#s936SuitePro .s936-ckpt-row-btn{
  flex:0 0 auto!important;
}
#s936SuitePro .s936-ckpt-row-action.play,
#s936SuitePro .s936-ckpt-row-action.loop,
#s936SuitePro .s936-ckpt-row-action.zoom{
  width:30px!important;
  min-width:30px!important;
  height:30px!important;
  font-size:.66rem!important;
}
#s936SuitePro .s936-ckpt-row-action.lyric,
#s936SuitePro .s936-ckpt-row-action.rec{
  width:28px!important;
  min-width:28px!important;
  height:28px!important;
}
#s936SuitePro .s936-ckpt-move-stepper{
  width:16px!important;
  min-width:16px!important;
  height:30px!important;
}
#s936SuitePro .s936-ckpt-move-mini{
  width:16px!important;
  min-width:16px!important;
  height:14px!important;
  font-size:.38rem!important;
}
#s936SuitePro .s936-ckpt-row-gear .s936-ckpt-row-btn{
  width:23px!important;
  min-width:23px!important;
  height:28px!important;
}
#s936SuitePro .s936-ckpt-part-row::after{
  content:attr(data-section-label);
  position:absolute;
  left:42px;
  top:-25px;
  opacity:0;
  pointer-events:none;
  padding:5px 8px;
  border-radius:8px;
  border:1px solid rgba(255,224,102,.32);
  background:rgba(8,11,18,.96);
  color:#ffe066;
  font-size:.58rem;
  font-weight:900;
  letter-spacing:.15px;
  white-space:nowrap;
  transform:translateY(4px);
  transition:opacity .12s ease, transform .12s ease;
  z-index:80;
}
#s936SuitePro .s936-ckpt-part-row:hover::after{
  opacity:1;
  transform:translateY(0);
}
#s936SuitePro .s936-ckpt-part-row{
  position:relative!important;
}
@media(max-width:390px){
  #s936SuitePro .s936-ckpt-part-row{
    grid-template-columns:16px 54px minmax(0,1fr)!important;
    gap:3px!important;
  }
  #s936SuitePro .s936-ckpt-part-badge{max-width:54px!important;font-size:.43rem!important}
  #s936SuitePro .s936-ckpt-row-actions{gap:3px!important;padding-left:4px!important}
  #s936SuitePro .s936-ckpt-row-action.play,
  #s936SuitePro .s936-ckpt-row-action.loop,
  #s936SuitePro .s936-ckpt-row-action.zoom{
    width:27px!important;min-width:27px!important;height:28px!important;
  }
}
`;
    
    style.textContent += `
/* Cambio 39 · Aprovechar espacio ganado: sin columna vacía, acciones corren a la izquierda y botones respiran */
#s936SuitePro .s936-ckpt-part-row{
  grid-template-columns:18px 58px auto!important;
  justify-content:start!important;
  align-items:center!important;
  column-gap:5px!important;
  min-height:39px!important;
}
#s936SuitePro .s936-ckpt-part-info{
  display:none!important;
}
#s936SuitePro .s936-ckpt-part-badge{
  grid-column:2!important;
  justify-self:stretch!important;
  max-width:58px!important;
  min-width:0!important;
  text-align:center!important;
}
#s936SuitePro .s936-ckpt-row-actions{
  grid-column:3!important;
  justify-self:start!important;
  justify-content:flex-start!important;
  width:auto!important;
  max-width:none!important;
  margin-left:0!important;
  padding-left:5px!important;
  border-left:1px solid rgba(255,224,102,.10)!important;
  gap:5px!important;
}
#s936SuitePro .s936-ckpt-row-action,
#s936SuitePro .s936-ckpt-row-btn{
  width:31px!important;
  min-width:31px!important;
  height:31px!important;
  border-radius:9px!important;
  font-size:.62rem!important;
}
#s936SuitePro .s936-ckpt-row-action.play,
#s936SuitePro .s936-ckpt-row-action.loop,
#s936SuitePro .s936-ckpt-row-action.zoom{
  width:33px!important;
  min-width:33px!important;
  height:33px!important;
  font-size:.72rem!important;
}
#s936SuitePro .s936-ckpt-row-action.lyric{
  width:31px!important;
  min-width:31px!important;
  height:31px!important;
  font-size:.52rem!important;
}
#s936SuitePro .s936-ckpt-row-action.rec{
  width:32px!important;
  min-width:32px!important;
  height:31px!important;
  font-size:.43rem!important;
}
#s936SuitePro .s936-ckpt-move-stepper{
  width:17px!important;
  min-width:17px!important;
  height:31px!important;
  margin-left:1px!important;
}
#s936SuitePro .s936-ckpt-move-mini{
  width:17px!important;
  min-width:17px!important;
  height:14px!important;
}
#s936SuitePro .s936-ckpt-row-gear .s936-ckpt-row-btn{
  width:24px!important;
  min-width:24px!important;
  height:31px!important;
}
#s936SuitePro .s936-struct-arrangement-full{
  padding-left:7px!important;
  padding-right:7px!important;
}
@media(max-width:390px){
  #s936SuitePro .s936-ckpt-part-row{
    grid-template-columns:16px 52px auto!important;
    column-gap:3px!important;
  }
  #s936SuitePro .s936-ckpt-part-badge{max-width:52px!important}
  #s936SuitePro .s936-ckpt-row-actions{gap:3px!important;padding-left:3px!important}
  #s936SuitePro .s936-ckpt-row-action,
  #s936SuitePro .s936-ckpt-row-btn{
    width:27px!important;
    min-width:27px!important;
    height:28px!important;
  }
  #s936SuitePro .s936-ckpt-row-action.play,
  #s936SuitePro .s936-ckpt-row-action.loop,
  #s936SuitePro .s936-ckpt-row-action.zoom{
    width:29px!important;
    min-width:29px!important;
    height:30px!important;
  }
}
`;


    style.textContent += `
/* Cambio 40 · Consola: números visibles, acciones equilibradas y dock flexible sin cubrir Chart */
#s936SuitePro{
  min-width:350px!important;
  width:clamp(380px,26.5vw,520px)!important;
  max-width:min(590px,48vw)!important;
  resize:horizontal!important;
  overflow-x:hidden!important;
}
#s936SuitePro .s936-struct-card.s936-struct-arrangement-full{
  overflow-x:hidden!important;
}
#s936SuitePro .s936-ckpt-part-row{
  display:grid!important;
  grid-template-columns:22px 58px minmax(0,1fr)!important;
  column-gap:6px!important;
  align-items:center!important;
  min-height:40px!important;
  padding:5px 6px!important;
}
#s936SuitePro .s936-ckpt-part-num{
  grid-column:1!important;
  width:20px!important;
  min-width:20px!important;
  height:24px!important;
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  border-radius:8px!important;
  color:#ffe066!important;
  background:rgba(255,224,102,.075)!important;
  border:1px solid rgba(255,224,102,.18)!important;
  font-size:.56rem!important;
  font-weight:950!important;
  opacity:1!important;
  text-shadow:0 0 8px rgba(255,224,102,.18)!important;
}
#s936SuitePro .s936-ckpt-part-badge{
  grid-column:2!important;
  max-width:58px!important;
  min-width:58px!important;
  justify-self:stretch!important;
}
#s936SuitePro .s936-ckpt-row-actions{
  grid-column:3!important;
  display:grid!important;
  grid-template-columns:repeat(6,minmax(28px,1fr)) 17px 24px!important;
  gap:4px!important;
  justify-self:stretch!important;
  align-items:center!important;
  width:100%!important;
  max-width:100%!important;
  padding-left:6px!important;
  margin-left:0!important;
  border-left:1px solid rgba(255,224,102,.13)!important;
}
#s936SuitePro .s936-ckpt-row-action,
#s936SuitePro .s936-ckpt-row-btn{
  width:100%!important;
  min-width:0!important;
  height:31px!important;
  border-radius:9px!important;
  font-size:.62rem!important;
}
#s936SuitePro .s936-ckpt-row-action.play,
#s936SuitePro .s936-ckpt-row-action.loop,
#s936SuitePro .s936-ckpt-row-action.zoom{
  height:33px!important;
  font-size:.74rem!important;
}
#s936SuitePro .s936-ckpt-row-action.lyric{
  font-size:.54rem!important;
}
#s936SuitePro .s936-ckpt-row-action.rec{
  font-size:.43rem!important;
}
#s936SuitePro .s936-ckpt-move-stepper{
  width:17px!important;
  min-width:17px!important;
  height:31px!important;
  justify-self:center!important;
  margin:0!important;
}
#s936SuitePro .s936-ckpt-move-mini{
  width:17px!important;
  min-width:17px!important;
  height:14px!important;
  border-radius:7px!important;
}
#s936SuitePro .s936-ckpt-row-gear,
#s936SuitePro .s936-ckpt-row-gear .s936-ckpt-row-btn{
  width:24px!important;
  min-width:24px!important;
}
#s936SuitePro .s936-ckpt-row-gear{
  justify-self:end!important;
}
#s936SuitePro .s936-ckpt-row-gear .s936-ckpt-row-btn{
  height:31px!important;
}
/* El submenú se queda liviano; Mapa Maestro se conserva, Tab Pro queda visualmente secundario hasta consolidarlo. */
#s936SuitePro .s936-compose-subrail button[data-tool="tabpro"],
#s936SuitePro .s936-compose-subrail [data-tool="tabpro"]{
  opacity:.72!important;
}
/* Si el Chart detecta que el dock lo invade, el guard de cambio 40 lo corre sin superponer. */
body.s936-chart-stage #s936-chart-view-panel[data-s936-dock-flex="on"],
body.s936-chart-stage .s936-chart-main-panel[data-s936-dock-flex="on"]{
  transition:margin-left .12s ease,width .12s ease!important;
}
@media(max-width:430px){
  #s936SuitePro .s936-ckpt-part-row{
    grid-template-columns:20px 54px minmax(0,1fr)!important;
    column-gap:4px!important;
  }
  #s936SuitePro .s936-ckpt-part-badge{min-width:54px!important;max-width:54px!important}
  #s936SuitePro .s936-ckpt-row-actions{
    grid-template-columns:repeat(6,minmax(25px,1fr)) 15px 22px!important;
    gap:3px!important;
    padding-left:4px!important;
  }
  #s936SuitePro .s936-ckpt-row-action,
  #s936SuitePro .s936-ckpt-row-btn{height:28px!important}
  #s936SuitePro .s936-ckpt-row-action.play,
  #s936SuitePro .s936-ckpt-row-action.loop,
  #s936SuitePro .s936-ckpt-row-action.zoom{height:30px!important}
}
`;


    style.textContent += `
/* Cambio 44 · Dock flexible real, sin cubrir Chart ni crear scroll horizontal */
html, body{
  overflow-x:hidden!important;
}
#s936SuitePro{
  width:clamp(365px,24vw,430px)!important;
  min-width:340px!important;
  max-width:min(440px,36vw)!important;
  resize:horizontal!important;
  box-sizing:border-box!important;
  overflow-x:hidden!important;
  overflow-y:auto!important;
}
#s936SuitePro *{
  box-sizing:border-box!important;
}
#s936SuitePro .s936-struct-arrangement-full,
#s936SuitePro .s936-ckpt-parts,
#s936SuitePro .s936-ckpt-part-row{
  overflow-x:hidden!important;
  max-width:100%!important;
}
#s936SuitePro .s936-ckpt-part-row{
  grid-template-columns:24px 58px minmax(0,1fr)!important;
  gap:5px!important;
  min-height:40px!important;
  padding:5px 6px!important;
}
#s936SuitePro .s936-ckpt-part-num{
  opacity:1!important;
  color:#ffe066!important;
  background:rgba(255,224,102,.09)!important;
  border-color:rgba(255,224,102,.24)!important;
  font-size:.58rem!important;
}
#s936SuitePro .s936-ckpt-part-badge{
  min-width:58px!important;
  max-width:58px!important;
}
#s936SuitePro .s936-ckpt-row-actions{
  display:flex!important;
  flex-wrap:nowrap!important;
  align-items:center!important;
  justify-content:space-between!important;
  gap:4px!important;
  width:100%!important;
  min-width:0!important;
  max-width:100%!important;
  padding-left:5px!important;
  border-left:1px solid rgba(255,224,102,.12)!important;
}
#s936SuitePro .s936-ckpt-row-action,
#s936SuitePro .s936-ckpt-row-btn{
  flex:1 1 0!important;
  width:auto!important;
  min-width:25px!important;
  max-width:34px!important;
  height:31px!important;
  border-radius:9px!important;
  font-size:.62rem!important;
}
#s936SuitePro .s936-ckpt-row-action.play{
  flex:1.18 1 0!important;
  max-width:38px!important;
  font-size:.78rem!important;
}
#s936SuitePro .s936-ckpt-row-action.lyric,
#s936SuitePro .s936-ckpt-row-action.rec{
  font-size:.50rem!important;
}
#s936SuitePro .s936-ckpt-move-stepper{
  flex:0 0 16px!important;
  width:16px!important;
  min-width:16px!important;
  max-width:16px!important;
  height:31px!important;
}
#s936SuitePro .s936-ckpt-row-gear{
  flex:0 0 23px!important;
  width:23px!important;
  min-width:23px!important;
}
#s936SuitePro .s936-ckpt-row-gear .s936-ckpt-row-btn{
  width:23px!important;
  min-width:23px!important;
  max-width:23px!important;
}
body.s936-chart-stage #s936-chart-view-panel,
body.s936-chart-stage .s936-chart-main-panel{
  margin-left:0!important;
  width:100%!important;
  max-width:100%!important;
}
@media(max-width:1280px){
  #s936SuitePro{
    width:360px!important;
    min-width:330px!important;
    max-width:390px!important;
  }
  #s936SuitePro .s936-ckpt-part-row{
    grid-template-columns:22px 54px minmax(0,1fr)!important;
    gap:4px!important;
  }
  #s936SuitePro .s936-ckpt-part-badge{
    min-width:54px!important;
    max-width:54px!important;
  }
  #s936SuitePro .s936-ckpt-row-actions{gap:3px!important;padding-left:4px!important}
  #s936SuitePro .s936-ckpt-row-action,
  #s936SuitePro .s936-ckpt-row-btn{
    min-width:22px!important;
    max-width:30px!important;
    height:29px!important;
    font-size:.56rem!important;
  }
  #s936SuitePro .s936-ckpt-row-action.play{max-width:34px!important}
}
`;


    style.textContent += `
/* Cambio 44 · Zoom sección: consola ampliada de sesión */
#s936SuitePro .s936-zoom-session-console{
  margin-top:10px!important;
  border:1px solid rgba(255,224,102,.34)!important;
  border-radius:16px!important;
  padding:10px!important;
  background:
    radial-gradient(circle at 10% 0%,rgba(255,224,102,.12),transparent 34%),
    radial-gradient(circle at 100% 20%,rgba(0,255,204,.10),transparent 30%),
    linear-gradient(180deg,rgba(255,255,255,.035),rgba(0,0,0,.18))!important;
  box-shadow:0 0 22px rgba(255,224,102,.07)!important;
}
#s936SuitePro .s936-zoom-session-head{
  display:flex!important;
  align-items:center!important;
  justify-content:space-between!important;
  gap:8px!important;
  margin-bottom:9px!important;
}
#s936SuitePro .s936-zoom-session-title{
  display:flex!important;
  flex-direction:column!important;
  gap:2px!important;
  min-width:0!important;
}
#s936SuitePro .s936-zoom-session-title b{
  color:#ffe066!important;
  font-size:.78rem!important;
  letter-spacing:.45px!important;
  text-transform:uppercase!important;
}
#s936SuitePro .s936-zoom-session-title small{
  color:rgba(255,255,255,.48)!important;
  font-size:.55rem!important;
  font-weight:850!important;
}
#s936SuitePro .s936-zoom-session-badge{
  border:1px solid rgba(0,255,204,.28)!important;
  background:rgba(0,255,204,.08)!important;
  color:#00ffcc!important;
  border-radius:999px!important;
  padding:5px 8px!important;
  font-size:.54rem!important;
  font-weight:950!important;
  white-space:nowrap!important;
}
#s936SuitePro .s936-zoom-session-grid{
  display:grid!important;
  grid-template-columns:repeat(2,minmax(0,1fr))!important;
  gap:8px!important;
}
#s936SuitePro .s936-zoom-session-btn{
  min-height:44px!important;
  border-radius:12px!important;
  border:1px solid rgba(233,212,138,.28)!important;
  background:linear-gradient(180deg,rgba(233,212,138,.075),rgba(233,212,138,.025))!important;
  color:#e9d48a!important;
  font-size:.66rem!important;
  font-weight:950!important;
  letter-spacing:.25px!important;
  text-transform:uppercase!important;
  cursor:pointer!important;
}
#s936SuitePro .s936-zoom-session-btn:hover{
  color:#ffe066!important;
  border-color:rgba(255,224,102,.62)!important;
  background:rgba(255,224,102,.105)!important;
  transform:translateY(-1px);
  box-shadow:0 0 16px rgba(255,224,102,.10)!important;
}
#s936SuitePro .s936-zoom-session-btn.primary{
  border-color:rgba(0,255,204,.44)!important;
  color:#00ffcc!important;
  background:rgba(0,255,204,.10)!important;
}
#s936SuitePro .s936-zoom-session-btn.danger{
  border-color:rgba(255,80,80,.34)!important;
  color:#ffabab!important;
  background:rgba(255,80,80,.065)!important;
}
#s936SuitePro .s936-zoom-session-btn.future{
  opacity:.76!important;
}
#s936SuitePro .s936-zoom-session-block{
  margin-top:10px!important;
  border:1px solid rgba(255,255,255,.08)!important;
  background:rgba(255,255,255,.025)!important;
  border-radius:13px!important;
  padding:9px!important;
}
#s936SuitePro .s936-zoom-session-block h5{
  margin:0 0 7px!important;
  color:#9fffee!important;
  font-size:.62rem!important;
  letter-spacing:.5px!important;
  text-transform:uppercase!important;
}
#s936SuitePro .s936-zoom-session-chips{
  display:flex!important;
  flex-wrap:wrap!important;
  gap:6px!important;
}
#s936SuitePro .s936-zoom-session-chip{
  border:1px solid rgba(255,255,255,.12)!important;
  background:rgba(255,255,255,.04)!important;
  color:rgba(255,255,255,.62)!important;
  border-radius:999px!important;
  padding:5px 8px!important;
  font-size:.56rem!important;
  font-weight:900!important;
}
#s936SuitePro .s936-zoom-session-status{
  margin-top:9px!important;
  border-left:3px solid rgba(0,255,204,.38)!important;
  background:rgba(0,255,204,.045)!important;
  border-radius:9px!important;
  padding:8px 9px!important;
  color:rgba(255,255,255,.62)!important;
  font-size:.58rem!important;
  line-height:1.35!important;
}
#s936SuitePro .s936-zoom-session-send{
  width:100%!important;
  margin-top:8px!important;
}
@media(max-width:390px){
  #s936SuitePro .s936-zoom-session-grid{
    grid-template-columns:1fr!important;
  }
  #s936SuitePro .s936-zoom-session-btn{
    min-height:38px!important;
  }
}
`;


    style.textContent += `
/* Cambio 44 · Zoom sección sin controles repetidos: barra principal + herramientas */
#s936SuitePro .s936-ckpt-part-row.is-focus .s936-ckpt-row-actions{
  grid-template-columns:repeat(3, minmax(0,1fr))!important;
  gap:7px!important;
  padding-left:8px!important;
}
#s936SuitePro .s936-ckpt-part-row.is-focus .s936-ckpt-row-action{
  min-width:52px!important;
  max-width:none!important;
  height:36px!important;
  font-size:.72rem!important;
  border-radius:12px!important;
}
#s936SuitePro .s936-ckpt-part-row.is-focus .s936-ckpt-row-action.zoom{
  color:#ffe066!important;
  border-color:rgba(255,224,102,.54)!important;
}
#s936SuitePro .s936-zoom-session-console{
  padding:12px!important;
}
#s936SuitePro .s936-zoom-session-head{
  margin-bottom:10px!important;
}
#s936SuitePro .s936-zoom-session-grid.s936-zoom-tools-grid{
  display:grid!important;
  grid-template-columns:repeat(2,minmax(0,1fr))!important;
  gap:8px!important;
  margin-top:8px!important;
}
#s936SuitePro .s936-zoom-session-btn.tool{
  min-height:48px!important;
  text-align:left!important;
  padding:8px 10px!important;
  display:flex!important;
  flex-direction:column!important;
  justify-content:center!important;
  gap:2px!important;
}
#s936SuitePro .s936-zoom-session-btn.tool strong{
  color:#ffe066!important;
  font-size:.68rem!important;
  letter-spacing:.3px!important;
}
#s936SuitePro .s936-zoom-session-btn.tool small{
  color:rgba(255,255,255,.52)!important;
  font-size:.52rem!important;
  line-height:1.2!important;
  text-transform:none!important;
  letter-spacing:0!important;
}
#s936SuitePro .s936-zoom-session-btn.tool.primary strong{
  color:#00ffcc!important;
}
#s936SuitePro .s936-zoom-session-tools-title{
  margin:10px 0 6px!important;
  color:#9fffee!important;
  font-size:.62rem!important;
  font-weight:950!important;
  letter-spacing:.55px!important;
  text-transform:uppercase!important;
}
#s936SuitePro .s936-zoom-session-block.compact{
  padding:8px!important;
}
#s936SuitePro .s936-zoom-session-chip{
  cursor:pointer!important;
}
#s936SuitePro .s936-zoom-session-chip:hover{
  color:#ffe066!important;
  border-color:rgba(255,224,102,.42)!important;
}
@media(max-width:390px){
  #s936SuitePro .s936-ckpt-part-row.is-focus .s936-ckpt-row-actions{
    grid-template-columns:repeat(3,minmax(0,1fr))!important;
  }
  #s936SuitePro .s936-zoom-session-grid.s936-zoom-tools-grid{
    grid-template-columns:1fr!important;
  }
}
`;


    style.textContent += `
/* Cambio 44 · Zoom sección sin header duplicado + barra principal limpia */
#s936SuitePro .s936-ckpt-focusbar{
  display:none!important;
  height:0!important;
  padding:0!important;
  margin:0!important;
  border:0!important;
  overflow:hidden!important;
}
#s936SuitePro .s936-ckpt-part-row.is-focus{
  grid-template-columns:32px 70px minmax(0,1fr)!important;
  align-items:center!important;
  padding:8px!important;
  gap:7px!important;
  background:
    radial-gradient(circle at 0% 0%,rgba(255,224,102,.13),transparent 35%),
    linear-gradient(90deg,rgba(0,255,204,.10),rgba(255,224,102,.045))!important;
}
#s936SuitePro .s936-ckpt-part-row.is-focus .s936-ckpt-part-info,
#s936SuitePro .s936-ckpt-part-row.is-focus .s936-ckpt-console-state{
  display:none!important;
}
#s936SuitePro .s936-ckpt-part-row.is-focus .s936-ckpt-row-actions{
  display:grid!important;
  grid-template-columns:1fr 1fr 1fr!important;
  gap:8px!important;
  width:100%!important;
  padding-left:0!important;
}
#s936SuitePro .s936-ckpt-part-row.is-focus .s936-ckpt-row-action{
  width:100%!important;
  max-width:none!important;
  min-width:0!important;
  height:40px!important;
  border-radius:14px!important;
  font-size:.86rem!important;
  font-weight:950!important;
}
#s936SuitePro .s936-ckpt-part-row.is-focus .s936-ckpt-row-action.play{
  background:linear-gradient(180deg,rgba(0,255,204,.20),rgba(0,255,204,.08))!important;
  color:#00ffcc!important;
  border-color:rgba(0,255,204,.55)!important;
}
#s936SuitePro .s936-ckpt-part-row.is-focus .s936-ckpt-row-action.loop{
  background:linear-gradient(180deg,rgba(255,224,102,.16),rgba(255,224,102,.07))!important;
  color:#ffe066!important;
  border-color:rgba(255,224,102,.52)!important;
}
#s936SuitePro .s936-ckpt-part-row.is-focus .s936-ckpt-row-action.zoom{
  background:linear-gradient(180deg,rgba(255,120,120,.13),rgba(255,120,120,.045))!important;
  color:#ffd0d0!important;
  border-color:rgba(255,120,120,.38)!important;
}
#s936SuitePro .s936-zoom-session-console{
  margin-top:8px!important;
}
#s936SuitePro .s936-zoom-session-title small{
  display:none!important;
}
#s936SuitePro .s936-zoom-session-status{
  font-size:.56rem!important;
  opacity:.92!important;
}
`;

    style.textContent += `
/* Cambio 48 · Dashboard visual + editor Ly por compás */
#s936SuitePro .s936-zoom-session-console{
  background:linear-gradient(155deg,rgba(0,255,204,.065),rgba(255,224,102,.055),rgba(0,0,0,.22))!important;
}
#s936SuitePro .s936-zoom-session-head{
  margin-bottom:8px!important;
}
#s936SuitePro .s936-zoom-session-tools-title{
  display:flex!important;
  align-items:center!important;
  gap:6px!important;
  color:#ffe066!important;
  font-size:.62rem!important;
  text-transform:uppercase!important;
  letter-spacing:.7px!important;
  margin:6px 0 8px!important;
}
#s936SuitePro .s936-zoom-tools-grid{
  display:grid!important;
  grid-template-columns:repeat(2,minmax(0,1fr))!important;
  gap:8px!important;
}
#s936SuitePro .s936-zoom-session-btn.tool{
  min-height:58px!important;
  border-radius:14px!important;
  padding:10px 10px!important;
  display:grid!important;
  align-content:center!important;
  gap:3px!important;
  background:radial-gradient(circle at 20% 0%,rgba(255,224,102,.10),transparent 35%),linear-gradient(135deg,rgba(255,255,255,.07),rgba(0,0,0,.22))!important;
  border:1px solid rgba(255,224,102,.22)!important;
  color:#f8f4dc!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 8px 20px rgba(0,0,0,.18)!important;
}
#s936SuitePro .s936-zoom-session-btn.tool:hover{
  transform:translateY(-1px)!important;
  border-color:rgba(0,255,204,.52)!important;
  background:radial-gradient(circle at 22% 0%,rgba(0,255,204,.15),transparent 38%),linear-gradient(135deg,rgba(0,255,204,.08),rgba(0,0,0,.22))!important;
}
#s936SuitePro .s936-zoom-session-btn.tool strong{
  font-size:.74rem!important;
  letter-spacing:.25px!important;
  color:#ffe58a!important;
}
#s936SuitePro .s936-zoom-session-btn.tool small{
  font-size:.55rem!important;
  color:rgba(255,255,255,.58)!important;
}
#s936SuitePro .s936-zoom-session-btn.tool.lyric-card strong{
  color:#ffb7f3!important;
}
#s936SuitePro .s936-lyrics-modal-overlay{
  position:fixed;
  inset:0;
  z-index:9999;
  background:rgba(0,0,0,.72);
  backdrop-filter:blur(10px);
  display:flex;
  align-items:center;
  justify-content:center;
  padding:22px;
}
#s936SuitePro .s936-lyrics-modal{
  width:min(760px,calc(100vw - 36px));
  max-height:86vh;
  overflow:auto;
  border:1px solid rgba(0,255,204,.44);
  border-radius:20px;
  background:linear-gradient(150deg,#0b1018,#10131c 60%,#080a0f);
  box-shadow:0 28px 80px rgba(0,0,0,.75),0 0 0 1px rgba(255,255,255,.06) inset;
  color:#fff;
}
#s936SuitePro .s936-lyrics-head{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:12px;
  padding:16px 18px;
  border-bottom:1px solid rgba(255,255,255,.08);
  background:linear-gradient(90deg,rgba(0,255,204,.09),rgba(255,224,102,.06));
}
#s936SuitePro .s936-lyrics-head b{
  display:block;
  color:#00ffcc;
  font-size:.86rem;
  text-transform:uppercase;
  letter-spacing:.6px;
}
#s936SuitePro .s936-lyrics-head small{
  color:rgba(255,255,255,.58);
  font-size:.64rem;
}
#s936SuitePro .s936-lyrics-close{
  width:32px;height:32px;border-radius:10px;
  border:1px solid rgba(255,255,255,.16);
  background:rgba(255,255,255,.06);
  color:#fff;font-weight:900;cursor:pointer;
}
#s936SuitePro .s936-lyrics-body{
  padding:14px 16px 6px;
  display:grid;
  gap:9px;
}
#s936SuitePro .s936-lyrics-row{
  display:grid;
  grid-template-columns:86px 1fr;
  gap:10px;
  align-items:center;
}
#s936SuitePro .s936-lyrics-row label{
  color:#ffe066;
  font-size:.62rem;
  font-weight:900;
  text-transform:uppercase;
  letter-spacing:.5px;
}
#s936SuitePro .s936-lyrics-row textarea{
  min-height:42px;
  resize:vertical;
  border-radius:12px;
  border:1px solid rgba(255,255,255,.13);
  background:rgba(0,0,0,.28);
  color:#fff;
  padding:10px 11px;
  font-size:.78rem;
  line-height:1.35;
  outline:none;
}
#s936SuitePro .s936-lyrics-row textarea:focus{
  border-color:rgba(0,255,204,.55);
  box-shadow:0 0 0 2px rgba(0,255,204,.08);
}
#s936SuitePro .s936-lyrics-actions{
  display:flex;
  gap:10px;
  padding:14px 16px 16px;
  border-top:1px solid rgba(255,255,255,.08);
}
#s936SuitePro .s936-lyrics-save{
  flex:1;
  min-height:40px;
  border-radius:13px;
  border:1px solid rgba(0,255,204,.45);
  background:linear-gradient(135deg,rgba(0,255,204,.20),rgba(0,255,204,.08));
  color:#cffff7;
  font-weight:900;
  cursor:pointer;
}
#s936SuitePro .s936-lyrics-cancel{
  min-width:120px;
  min-height:40px;
  border-radius:13px;
  border:1px solid rgba(255,255,255,.14);
  background:rgba(255,255,255,.05);
  color:rgba(255,255,255,.75);
  font-weight:900;
  cursor:pointer;
}

/* Cambio 48 · Ly flotante como réplica del Chart: 4 compases por línea */
.s936-lyrics-float-panel{
  width:min(1180px,calc(100vw - 34px));
  height:min(660px,calc(100vh - 52px));
  left:max(18px,calc(50vw - 590px));
}
.s936-lyrics-float-panel .s936-lyrics-body{
  padding:12px;
}
.s936-lyrics-float-panel .s936-lyrics-help{
  margin-bottom:12px;
}
.s936-lyrics-float-panel .s936-lyrics-chart-grid{
  display:grid;
  grid-template-columns:repeat(4,minmax(190px,1fr));
  gap:12px;
  align-items:stretch;
  min-width:880px;
}
.s936-lyrics-float-panel .s936-lyrics-bar-card{
  min-height:150px;
  display:flex;
  flex-direction:column;
  gap:8px;
  padding:9px;
  border:1px solid rgba(0,255,204,.22);
  border-radius:14px;
  background:
    radial-gradient(circle at 18% 0%,rgba(0,255,204,.10),transparent 38%),
    linear-gradient(145deg,rgba(5,14,16,.72),rgba(9,11,17,.70));
  box-shadow:0 0 0 1px rgba(255,255,255,.035) inset,0 10px 22px rgba(0,0,0,.22);
}
.s936-lyrics-float-panel .s936-lyrics-bar-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
  padding:5px 7px;
  border-radius:10px;
  background:rgba(0,0,0,.22);
  border:1px solid rgba(255,224,102,.14);
}
.s936-lyrics-float-panel .s936-lyrics-bar-head strong{
  color:#00ffcc;
  font-size:.62rem;
  letter-spacing:.45px;
  text-transform:uppercase;
}
.s936-lyrics-float-panel .s936-lyrics-bar-head span{
  color:rgba(255,224,102,.72);
  font-size:.48rem;
  font-weight:900;
  text-transform:uppercase;
}
.s936-lyrics-float-panel .s936-lyrics-beat-grid{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:6px;
  flex:1;
}
.s936-lyrics-float-panel .s936-lyrics-beat-cell{
  min-width:0;
  display:flex;
  flex-direction:column;
  gap:4px;
}
.s936-lyrics-float-panel .s936-lyrics-beat-cell em{
  display:block;
  text-align:center;
  color:#ffe066;
  font-size:.48rem;
  font-style:normal;
  font-weight:950;
  text-transform:uppercase;
  opacity:.9;
}
.s936-lyrics-float-panel .s936-lyrics-beat-cell textarea{
  width:100%;
  flex:1;
  min-height:72px;
  max-height:none;
  resize:none;
  box-sizing:border-box;
  border:1px solid rgba(0,255,204,.20);
  border-radius:10px;
  background:rgba(0,0,0,.32);
  color:#fff;
  padding:8px 6px;
  font-size:.72rem;
  line-height:1.22;
  text-align:center;
  outline:none;
}
.s936-lyrics-float-panel .s936-lyrics-beat-cell textarea:focus{
  border-color:rgba(0,255,204,.68);
  box-shadow:0 0 0 2px rgba(0,255,204,.10),0 0 16px rgba(0,255,204,.12);
  background:rgba(0,35,32,.50);
}
@media (max-width:900px){
  .s936-lyrics-float-panel .s936-lyrics-chart-grid{
    grid-template-columns:repeat(2,minmax(190px,1fr));
    min-width:430px;
  }
}

`;

    style.textContent += `
/* Cambio 49 · Ly editor vidrio pro + guía de acordes del Chart */
.s936-lyrics-float-panel{
  width:min(1180px,calc(100vw - 34px))!important;
  min-width:520px!important;
  min-height:300px!important;
  border:1px solid rgba(0,255,204,.26)!important;
  border-radius:20px!important;
  background:
    radial-gradient(circle at 10% 0%,rgba(0,255,204,.13),transparent 34%),
    radial-gradient(circle at 85% 8%,rgba(255,224,102,.10),transparent 30%),
    linear-gradient(145deg,rgba(5,13,15,.74),rgba(10,9,14,.62))!important;
  box-shadow:0 24px 80px rgba(0,0,0,.48),0 0 0 1px rgba(255,255,255,.07) inset,0 0 30px rgba(0,255,204,.055)!important;
  backdrop-filter:blur(20px) saturate(1.1)!important;
  -webkit-backdrop-filter:blur(20px) saturate(1.1)!important;
}
.s936-lyrics-float-panel .s936-lyrics-head{
  padding:10px 12px!important;
  align-items:center!important;
  border-bottom:1px solid rgba(255,255,255,.075)!important;
  background:linear-gradient(90deg,rgba(0,255,204,.11),rgba(255,224,102,.07),rgba(255,255,255,.025))!important;
}
.s936-lyrics-float-panel .s936-lyrics-title b{
  color:#00ffcc!important;
  font-size:.78rem!important;
  letter-spacing:.55px!important;
}
.s936-lyrics-float-panel .s936-lyrics-title small{
  color:rgba(255,255,255,.54)!important;
  font-size:.58rem!important;
}
.s936-lyrics-float-panel .s936-lyrics-toolbar{
  display:flex!important;
  align-items:center!important;
  justify-content:flex-end!important;
  gap:7px!important;
  flex-shrink:0!important;
}
.s936-lyrics-float-panel .s936-lyrics-tool{
  width:34px!important;
  height:32px!important;
  border-radius:11px!important;
  border:1px solid rgba(255,224,102,.24)!important;
  background:linear-gradient(145deg,rgba(255,224,102,.10),rgba(0,0,0,.20))!important;
  color:#ffe98b!important;
  font-size:.82rem!important;
  font-weight:950!important;
  cursor:pointer!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.08)!important;
}
.s936-lyrics-float-panel .s936-lyrics-tool:hover{
  transform:translateY(-1px);
  border-color:rgba(0,255,204,.50)!important;
  color:#00ffcc!important;
  background:linear-gradient(145deg,rgba(0,255,204,.12),rgba(0,0,0,.18))!important;
}
.s936-lyrics-float-panel .s936-lyrics-tool.saved{
  color:#00ffcc!important;
  box-shadow:0 0 14px rgba(0,255,204,.18)!important;
}
.s936-lyrics-float-panel .s936-lyrics-tool.close{
  border-color:rgba(255,255,255,.16)!important;
  color:rgba(255,255,255,.82)!important;
  background:rgba(255,255,255,.055)!important;
  font-size:1rem!important;
}
.s936-lyrics-float-panel .s936-lyrics-body{
  padding:12px!important;
}
.s936-lyrics-float-panel .s936-lyrics-help{
  margin:0 0 10px!important;
  border:1px solid rgba(255,224,102,.13)!important;
  border-radius:12px!important;
  background:rgba(255,224,102,.045)!important;
  font-size:.61rem!important;
}
.s936-lyrics-float-panel .s936-lyrics-chart-grid{
  grid-template-columns:repeat(4,minmax(185px,1fr))!important;
  gap:10px!important;
}
.s936-lyrics-float-panel .s936-lyrics-bar-card{
  min-height:136px!important;
  padding:8px!important;
  border:1px solid rgba(0,255,204,.17)!important;
  border-radius:14px!important;
  background:
    radial-gradient(circle at 20% 0%,rgba(0,255,204,.075),transparent 38%),
    linear-gradient(145deg,rgba(4,16,17,.58),rgba(7,9,12,.58))!important;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.035),0 8px 20px rgba(0,0,0,.20)!important;
}
.s936-lyrics-float-panel .s936-lyrics-bar-head{
  border:1px solid rgba(255,224,102,.12)!important;
  background:rgba(0,0,0,.18)!important;
  padding:5px 7px!important;
}
.s936-lyrics-float-panel .s936-lyrics-bar-head strong{
  font-size:.58rem!important;
}
.s936-lyrics-float-panel .s936-lyrics-bar-head span{
  font-size:.45rem!important;
}
.s936-lyrics-float-panel .s936-lyrics-beat-grid{
  gap:5px!important;
}
.s936-lyrics-float-panel .s936-lyrics-beat-cell em{
  min-height:17px!important;
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  border:1px solid rgba(255,224,102,.16)!important;
  border-radius:999px!important;
  background:rgba(255,224,102,.055)!important;
  color:#ffe066!important;
  font-size:.49rem!important;
  letter-spacing:.15px!important;
  opacity:1!important;
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
  padding:0 4px!important;
}
.s936-lyrics-float-panel .s936-lyrics-beat-cell em[data-chord=""],
.s936-lyrics-float-panel .s936-lyrics-beat-cell em[data-chord="—"]{
  color:rgba(255,255,255,.34)!important;
}
.s936-lyrics-float-panel .s936-lyrics-beat-cell textarea{
  min-height:70px!important;
  border:1px solid rgba(0,255,204,.14)!important;
  border-radius:10px!important;
  background:rgba(0,0,0,.22)!important;
  font-size:.70rem!important;
}
.s936-lyrics-float-panel .s936-lyrics-actions{
  display:none!important;
}
@media(max-width:900px){
  .s936-lyrics-float-panel{
    min-width:0!important;
  }
  .s936-lyrics-float-panel .s936-lyrics-chart-grid{
    grid-template-columns:repeat(2,minmax(185px,1fr))!important;
  }
}

/* Cambio 51 · ícono de nota para duración (reemplaza el <select> de texto) + texto de letra más legible */
.s936-lyrics-float-panel .s936-lyrics-beat-cell textarea{
  min-height:74px!important;
  font-size:.92rem!important;
  line-height:1.28!important;
  font-weight:800!important;
  padding-right:28px!important;
}
/* Cambio 55: la nota ya no es una fila aparte — vive como badge pequeño
   dentro del mismo cuadro de texto (menos elementos, más limpio). */
.s936-lyric-input-wrap{
  position:relative;
}
.s936-lyric-duration-wrap{
  position:absolute;
  top:6px;
  right:5px;
  z-index:2;
}
.s936-lyric-duration-btn{
  min-width:22px;
  height:20px;
  padding:0 4px;
  border-radius:6px;
  border:1px solid rgba(255,224,102,.22);
  background:rgba(8,12,16,.55);
  color:rgba(255,224,102,.75);
  font-size:.76rem;
  line-height:1;
  font-weight:900;
  cursor:pointer;
  opacity:.72;
  transition:opacity .15s ease,border-color .15s ease,background .15s ease,transform .15s ease;
}
.s936-lyric-duration-btn:hover{
  opacity:1;
  border-color:rgba(255,224,102,.55);
  background:rgba(255,224,102,.11);
  transform:translateY(-1px);
}
.s936-lyric-duration-pop{
  position:absolute;
  left:50%;
  bottom:calc(100% + 6px);
  transform:translateX(-50%);
  z-index:5;
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:8px;
  padding:8px;
  border-radius:12px;
  border:1px solid rgba(0,255,204,.30);
  background:linear-gradient(150deg,rgba(8,14,18,.98),rgba(4,7,10,.98));
  box-shadow:0 12px 28px rgba(0,0,0,.5);
}
/* Cambio 54 (fix urgente): el "display:flex" de arriba, al tener la misma
   especificidad que la regla nativa [hidden]{display:none} del navegador,
   la estaba ganando por orden de cascada — por eso el popover de nota/duración
   quedaba SIEMPRE abierto en cada celda, tapando la letra. Esta regla obliga
   a que [hidden] gane siempre. */
.s936-lyric-duration-pop[hidden]{
  display:none!important;
}
.s936-lyric-duration-pop-durations{
  display:flex;
  gap:4px;
}
.s936-lyric-duration-opt{
  min-width:28px;
  height:26px;
  padding:0 5px;
  border-radius:7px;
  border:1px solid rgba(255,255,255,.14);
  background:rgba(255,255,255,.04);
  color:rgba(255,255,255,.78);
  font-size:.92rem;
  line-height:1;
  cursor:pointer;
}
.s936-lyric-duration-opt:hover{
  border-color:rgba(0,255,204,.45);
  color:#eafffb;
}
.s936-lyric-duration-opt.is-active{
  border-color:rgba(0,255,204,.55);
  background:rgba(0,255,204,.14);
  color:#eafffb;
}

/* Cambio 53 · pentagrama mini para elegir altura (pitch) dentro del popover de Ly Letra */
.s936-note-staff-wrap{
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:4px;
}
.s936-note-pitch-label{
  color:#ffe066;
  font-size:.62rem;
  font-weight:950;
  text-transform:uppercase;
  letter-spacing:.4px;
}
.s936-note-staff{
  position:relative;
  width:132px;
  height:130px;
  display:flex;
  flex-direction:column;
  border-radius:8px;
  background:rgba(255,255,255,.02);
}
.s936-note-row{
  position:relative;
  flex:1;
  width:100%;
  border:none;
  background:none;
  padding:0;
  cursor:pointer;
}
.s936-note-row:hover{
  background:rgba(0,255,204,.08);
}
.s936-note-row.is-active{
  background:rgba(0,255,204,.16);
}
.s936-note-row.is-active .s936-note-mark{
  background:#ffe066!important;
  box-shadow:0 0 8px rgba(255,224,102,.6);
}
.s936-note-row .s936-note-mark{
  content:"";
  position:absolute;
  left:50%;
  top:50%;
  transform:translate(-50%,-50%);
  height:1px;
  background:rgba(0,255,204,.45);
}
.s936-note-row.s936-note-line .s936-note-mark{
  width:100%;
}
.s936-note-row.s936-note-ledger .s936-note-mark{
  width:38%;
  background:rgba(255,224,102,.55);
}

/* Cambio 56 · dividir un tiempo en 2-4 sílabas, cada una con su propia nota */
.s936-lyric-subdivide-row{
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:4px;
  padding-top:6px;
  border-top:1px solid rgba(255,255,255,.08);
  width:100%;
}
.s936-lyric-subdivide-label{
  color:rgba(255,255,255,.55);
  font-size:.56rem;
  text-transform:uppercase;
  letter-spacing:.3px;
  font-weight:800;
}
.s936-lyric-subdivide-btns{
  display:flex;
  gap:4px;
}
.s936-lyric-subdivide-opt{
  min-width:22px;
  height:22px;
  border-radius:6px;
  border:1px solid rgba(255,255,255,.14);
  background:rgba(255,255,255,.04);
  color:rgba(255,255,255,.72);
  font-size:.68rem;
  font-weight:900;
  cursor:pointer;
}
.s936-lyric-subdivide-opt:hover{
  border-color:rgba(0,255,204,.42);
  color:#eafffb;
}
.s936-lyric-subdivide-opt.is-active{
  border-color:rgba(255,224,102,.55);
  background:rgba(255,224,102,.14);
  color:#ffe066;
}
.s936-lyric-sub-row{
  display:flex;
  gap:3px;
  min-height:52px;
}
/* Cambio 57 (HOTFIX): mismo bug que el Cambio 54 — "display:flex" sin más le
   ganaba en cascada al atributo [hidden] del navegador, así que esta fila de
   sílabas quedaba SIEMPRE visible (vacía, 52px) debajo de CADA celda, incluso
   en tiempos sin dividir. Se fuerza a que [hidden] gane siempre. */
.s936-lyric-sub-row[hidden]{
  display:none!important;
}
.s936-lyric-sub-mini{
  position:relative;
  flex:1;
  min-width:0;
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:2px;
}
.s936-lyric-sub-input{
  width:100%;
  min-width:0;
  border-radius:7px;
  border:1px solid rgba(0,255,204,.16);
  background:rgba(0,0,0,.22);
  color:#eafffb;
  font-size:.66rem;
  font-weight:800;
  text-align:center;
  padding:5px 2px;
}
.s936-lyric-sub-input:focus{
  outline:none;
  border-color:rgba(0,255,204,.5);
}
.s936-lyric-sub-dot{
  min-width:18px;
  height:16px;
  padding:0 3px;
  border-radius:5px;
  border:1px solid rgba(255,224,102,.20);
  background:rgba(8,12,16,.5);
  color:rgba(255,224,102,.55);
  font-size:.6rem;
  line-height:1;
  cursor:pointer;
}
.s936-lyric-sub-dot.has-pitch{
  color:#ffe066;
  border-color:rgba(255,224,102,.55);
  background:rgba(255,224,102,.12);
}
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
    if (!Array.isArray(state.draft.navigation)) state.draft.navigation = readNavigationMarks();
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
    installDockFlexGuard();
    installChartStageKeeperCambio41();
    // Limpiar dropdown huérfano del body
    document.getElementById("s936CkptDropdown")?.remove();

    const root = ctx.el("div", "s936-struct-shell s936-struct-v4");
    // Cambio 39: sin banners temporales en el dock; el menú de canción vive en Compose.

    // Cambio 4: insertar raíz primero. Así no queda solo el menú si algo falla.
    shell.appendChild(root);

    try {
      const s = snap(ctx);
      const parts = ensureDraft(ctx);
      // Cambio 39: el menú de canción sube al nivel Compose; no duplicar cabecera en Estructura.
      // Cambio 29: el panel izquierdo se convierte en consola por sección; no hay bloque de consola separado.
      renderBuilder(ctx, root, s, parts);
      scheduleRightPanelChart(ctx, root);
    } catch (error) {
      console.error("Suite Pro Structure Cambio 24 render error:", error);
      const err = ctx.el("section", "s936-struct-card dangerzone");
      err.innerHTML = "<h4>Cambio número 46 · Error visible en Estructura</h4><p>No se pudo construir el panel. Revisa la primera línea roja de consola.</p>";
      const code = ctx.el("pre", "", String(error && (error.stack || error.message) || error));
      code.style.cssText = "white-space:pre-wrap;color:#ffb5b5;font-size:.62rem;line-height:1.35;background:rgba(0,0,0,.25);padding:10px;border-radius:10px;overflow:auto";
      err.appendChild(code);
      root.appendChild(err);
    }
  }

  function renderChangeBanner(ctx, root) { /* Cambio 39: tracker visual removido del dock. */ }

  function scheduleRightPanelChart(ctx, root) {
    const status = ctx.el("section", "s936-struct-right-status");
    status.style.display = "none";
    status.textContent = "Cambio número 37 · Cargando Chart…";

    const ensureChartScriptLoaded = () => {
      const src = "js/suite-pro-chart-v248-cambio48.js";
      const already = Array.from(document.scripts || []).some((script) => String(script.src || "").includes(src));
      if (already) return;
      const script = document.createElement("script");
      script.src = src + "?v=cambio-48-20260702";
      script.dataset.s936Cambio8ChartLoader = "true";
      document.body.appendChild(script);
    };

    const mount = (attempt = 0) => {
      const Chart = window.Studio936SuiteProChart;
      if (!Chart || typeof Chart.mountInRightPanel !== "function") {
        status.textContent = "Cambio número 37 · Cargando Chart… intento " + (attempt + 1) + ".";
        if (attempt === 0) ensureChartScriptLoaded();
        if (attempt < 12) {
          setTimeout(() => mount(attempt + 1), 160 + attempt * 120);
        } else {
          status.textContent = "Cambio número 37 · No encontré Studio936SuiteProChart.mountInRightPanel(). Revisa que index.html cargue suite-pro-chart-v248-cambio48.js.";
          status.style.color = "#ffb5b5";
        }
        return;
      }

      try {
        const result = Chart.mountInRightPanel({
          onChordEdit: (sectionKey, chordIndex) => {
            try {
              window.Studio936AppBridge?.selectEditorSection?.(sectionKey);
              window.Studio936AppBridge?.selectEditorChord?.(sectionKey, chordIndex);
            } catch(_) {}
          }
        });

        if (result && result.ok) {
          status.textContent = "Cambio número 48 · Chart montado. Ly tipo Chart preparado.";
          status.style.color = "#bfffee";
        } else {
          status.textContent = "Cambio número 37 · Chart no pudo montarse en el panel derecho: " + (result?.reason || "sin razón reportada") + ".";
          status.style.color = "#ffb5b5";
        }
      } catch (error) {
        console.warn("Suite Pro Structure Cambio 9 Chart right panel:", error);
        status.textContent = "Cambio número 37 · Error al montar Chart en panel derecho. Revisa la primera línea roja de consola.";
        status.style.color = "#ffb5b5";
      }
    };

    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => setTimeout(() => mount(0), 0));
    } else {
      setTimeout(() => mount(0), 0);
    }
  }

  // v4.1 — COCKPIT HEADER: topbar compacta + menú ⚙ + add colapsable

  // ─── CAMBIO 18: MARCACIONES DE NAVEGACIÓN MUSICAL ───────────────────────
  const NAV_TYPES = [
    ["repeatStart", "𝄆 Inicio repetición"],
    ["repeatEnd", "𝄇 Fin repetición"],
    ["bis", "Bis / repetir bloque"],
    ["fine", "Fine"],
    ["segno", "𝄋 Segno"],
    ["coda", "𝄌 Coda"],
    ["dcFine", "D.C. al Fine"],
    ["dsCoda", "D.S. al Coda"],
    ["ending1", "Casilla 1"],
    ["ending2", "Casilla 2"]
  ];

  function readNavigationMarks() {
    try {
      const raw = JSON.parse(localStorage.getItem(NAV_KEY) || "{}");
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw?.marks)) return raw.marks;
    } catch(_) {}
    return Array.isArray(state?.draft?.navigation) ? state.draft.navigation : [];
  }

  function writeNavigationMarks(marks) {
    const clean = Array.isArray(marks) ? marks : [];
    try {
      localStorage.setItem(NAV_KEY, JSON.stringify({
        version: "navigation-v1-cambio20",
        updatedAt: new Date().toISOString(),
        marks: clean
      }));
    } catch(_) {}
    if (state.draft) state.draft.navigation = clean;
    saveState();
  }

  function navTypeLabel(type) {
    return (NAV_TYPES.find(([id]) => id === type) || [type, type])[1];
  }

  function navMarkText(mark) {
    const label = navTypeLabel(mark.type);
    if (mark.type === "bis" || mark.type === "repeatEnd") {
      return label + " x" + Math.max(2, Number(mark.repeats) || 2);
    }
    return label;
  }

  function renderNavigationPanel(ctx, root, s, parts) {
    const card = ctx.el("section", "s936-struct-card s936-struct-nav-card");
    card.appendChild(ctx.el("h4", "", "Marcaciones musicales"));
    card.appendChild(ctx.el("p", "s936-struct-muted", "Define las señales del mapa profesional: repeticiones, Fine, Segno, Coda y casillas. Cambio 24 las deja visibles arriba y dibujadas claramente en el Chart; la obediencia completa en práctica viene después."));

    const grid = ctx.el("div", "s936-struct-nav-grid");

    const partLabel = ctx.el("label", "", "Parte");
    const partSelect = ctx.el("select", "");
    parts.forEach((part, index) => {
      const opt = ctx.el("option", "", (index + 1) + ". " + (part.label || labelFor(part.section)));
      opt.value = String(index);
      partSelect.appendChild(opt);
    });
    partLabel.appendChild(partSelect);

    const barLabel = ctx.el("label", "", "Compás");
    const barSelect = ctx.el("select", "");
    barLabel.appendChild(barSelect);

    const typeLabel = ctx.el("label", "", "Marca");
    const typeSelect = ctx.el("select", "");
    NAV_TYPES.forEach(([id, label]) => {
      const opt = ctx.el("option", "", label);
      opt.value = id;
      typeSelect.appendChild(opt);
    });
    typeLabel.appendChild(typeSelect);

    const repLabel = ctx.el("label", "", "Vueltas");
    const repInput = ctx.el("input", "");
    repInput.type = "number";
    repInput.min = "2";
    repInput.max = "8";
    repInput.value = "2";
    repLabel.appendChild(repInput);

    const addBtn = ctx.el("button", "s936-struct-btn warn", "Agregar marca");

    function refreshBars() {
      barSelect.innerHTML = "";
      const part = parts[Number(partSelect.value) || 0] || parts[0];
      const bars = Math.max(1, Number(part?.bars) || inferredBars(s, part?.section) || 4);
      for (let i = 0; i < bars; i += 1) {
        const opt = ctx.el("option", "", "Compás " + (i + 1));
        opt.value = String(i);
        barSelect.appendChild(opt);
      }
    }

    partSelect.onchange = refreshBars;
    refreshBars();

    addBtn.onclick = () => {
      const part = parts[Number(partSelect.value) || 0];
      if (!part) return;
      const marks = readNavigationMarks();
      const mark = {
        id: "nav-" + Date.now() + "-" + Math.random().toString(16).slice(2),
        section: part.section,
        partLabel: part.label || labelFor(part.section),
        bar: Number(barSelect.value) || 0,
        type: typeSelect.value,
        repeats: Math.max(2, Math.min(8, Number(repInput.value) || 2)),
        createdAt: new Date().toISOString()
      };
      marks.push(mark);
      marks.sort((a, b) => String(a.section).localeCompare(String(b.section)) || Number(a.bar || 0) - Number(b.bar || 0));
      writeNavigationMarks(marks);
      renderAgain(ctx);
    };

    grid.append(partLabel, barLabel, typeLabel, repLabel, addBtn);
    card.appendChild(grid);

    const list = ctx.el("div", "s936-struct-nav-list");
    const marks = readNavigationMarks();
    if (!marks.length) {
      list.appendChild(ctx.el("span", "s936-struct-muted", "Sin marcaciones todavía."));
    } else {
      marks.forEach((mark) => {
        const pill = ctx.el("span", "s936-struct-nav-pill");
        pill.appendChild(document.createTextNode((mark.partLabel || mark.section) + " · C" + ((Number(mark.bar) || 0) + 1) + " · " + navMarkText(mark)));
        const del = ctx.el("button", "", "×");
        del.title = "Quitar marca";
        del.onclick = () => {
          writeNavigationMarks(readNavigationMarks().filter((item) => item.id !== mark.id));
          renderAgain(ctx);
        };
        pill.appendChild(del);
        list.appendChild(pill);
      });
    }
    card.appendChild(list);

    root.appendChild(card);
  }

  function renderSessionConsole(ctx, root, s, parts) {
    const currentPart = parts?.[state.selectedIndex] || parts?.[0] || {};
    const currentLabel = currentPart.label || currentPart.name || currentPart.section || "Sección";
    const currentSection = currentPart.section || s?.currentSection || "";
    const bpm = Number(state.draft?.meta?.bpm || s?.bpm || 95) || 95;
    const style = state.draft?.meta?.style || s?.style || "Funk";

    const card = ctx.el("section", "s936-struct-card s936-session-console-card");
    const top = ctx.el("div", "s936-session-console-top");
    const titleWrap = ctx.el("div", "s936-session-console-titlewrap");
    titleWrap.appendChild(ctx.el("h4", "", "Mini consola sesión"));
    titleWrap.appendChild(ctx.el("small", "", "Panel por sección · práctica y grabación futura"));
    const engine = ctx.el("span", "s936-session-engine", "Motor: listo");
    top.append(titleWrap, engine);
    card.appendChild(top);

    const display = ctx.el("div", "s936-session-display");
    const chipPart = ctx.el("span", "s936-session-chip strong", "Parte: " + currentLabel);
    const chipStyle = ctx.el("span", "s936-session-chip", "Ritmo: " + style);
    const chipBpm = ctx.el("span", "s936-session-chip", "BPM: " + bpm);
    display.append(chipPart, chipStyle, chipBpm);
    card.appendChild(display);

    const row = ctx.el("div", "s936-session-console-row main");
    const play = ctx.el("button", "s936-struct-btn primary s936-session-big", "▶ Sesión");
    const loop = ctx.el("button", "s936-struct-btn s936-session-big", "🔁 Loop");
    const pulse = ctx.el("button", "s936-struct-btn s936-session-big", "🥁 Pulso");
    const stop = ctx.el("button", "s936-struct-btn danger s936-session-big", "■ Stop");

    function chartPanel() {
      return document.getElementById("s936-chart-view-panel");
    }

    function setEngine(text, on) {
      engine.textContent = text;
      engine.classList.toggle("on", !!on);
    }

    play.onclick = () => {
      const panel = chartPanel();
      const ok = window.Studio936SuiteProChart?.startChartSectionPractice?.(panel, currentSection, { withPulse: false, sourceLabel: "Sesión" });
      setEngine(ok ? "Motor: sesión activa" : "Motor: Chart no listo", ok);
      play.classList.toggle("active", !!ok);
      if (!ok) alert("El Chart todavía no está listo para practicar.");
    };
    loop.onclick = () => {
      try {
        window.dispatchEvent(new CustomEvent("studio936:chart-loop-current-section", {
          detail: { section: currentSection, part: currentLabel }
        }));
      } catch(_) {}
      const panel = chartPanel();
      const ok = window.Studio936SuiteProChart?.startChartSectionPractice?.(panel, currentSection, { withPulse: false, sourceLabel: "Loop sesión" });
      setEngine(ok ? "Loop de sesión activo" : "Loop preparado", !!ok);
      play.classList.toggle("active", !!ok);
    };
    pulse.onclick = () => {
      const panel = chartPanel();
      const ok = window.Studio936SuiteProChart?.startChartSectionPractice?.(panel, currentSection, { withPulse: true, sourceLabel: "Sesión + pulso" });
      setEngine(ok ? "Pulso de sesión activo" : "Motor: Chart no listo", ok);
      pulse.classList.toggle("active", !!ok);
    };
    stop.onclick = () => {
      window.Studio936SuiteProChart?.stopChartRhythmConsole?.({ stopAudio: true });
      setEngine("Motor: listo", false);
      play.classList.remove("active");
      pulse.classList.remove("active");
    };

    row.append(play, loop, pulse, stop);
    card.appendChild(row);

    const smallRow = ctx.el("div", "s936-session-console-row secondary");
    const fromHere = ctx.el("button", "s936-struct-btn", "▶ Desde parte");
    const editMarks = ctx.el("button", "s936-struct-btn", "♪ Marcar compás");
    const clearLoop = ctx.el("button", "s936-struct-btn", "Limpiar loop");
    fromHere.onclick = () => {
      try {
        window.dispatchEvent(new CustomEvent("studio936:chart-practice-from-part", {
          detail: { section: currentSection, part: currentLabel }
        }));
      } catch(_) {}
      play.click();
    };
    editMarks.onclick = () => {
      alert("Marca directamente en el Chart: clic sobre la nota/encabezado del compás.");
    };
    clearLoop.onclick = () => {
      try {
        window.dispatchEvent(new CustomEvent("studio936:chart-clear-practice-loop", {
          detail: { section: currentSection }
        }));
      } catch(_) {}
      setEngine("Loop limpio", false);
    };
    smallRow.append(fromHere, editMarks, clearLoop);
    card.appendChild(smallRow);

    const note = ctx.el("div", "s936-session-console-note", "Play superior = canción completa. Esta consola = práctica de la sección/parte. Próximo: REC, pads y consola flotante.");
    card.appendChild(note);

    root.appendChild(card);
  }



  // ─── CAMBIO 45: LYRICS POR COMPÁS / KARAOKE BASE ───────────────────────
  const SECTION_LYRICS_KEY = "s936_section_lyrics_v1";

  function readSectionLyricsStore() {
    try {
      const raw = JSON.parse(localStorage.getItem(SECTION_LYRICS_KEY) || "{}");
      return raw && typeof raw === "object" ? raw : {};
    } catch(_) {
      return {};
    }
  }

  function saveSectionLyricsStore(data) {
    try {
      localStorage.setItem(SECTION_LYRICS_KEY, JSON.stringify(data || {}));
    } catch(_) {}
  }

  function sectionBarCountForLyrics(part, s) {
    const direct = Math.max(1, Number(part?.bars) || 0);
    if (direct) return direct;
    try {
      const items = draftOrLiveItems(s, part?.section);
      const total = items.reduce((sum, item) => sum + Math.max(1, Number(item.bars) || 1), 0);
      if (total) return total;
    } catch(_) {}
    return 4;
  }

  // Cambio 49: guía armónica del editor Ly.
  // El editor de letra debe replicar la sección del Chart y mostrar en cada tiempo
  // el acorde real/sostenido que guía la voz, sin volver a dibujar mapas instrumentales.
  function readChartBeatsForLyrics(section) {
    try {
      const data = JSON.parse(localStorage.getItem("s936_chart_beats_v1") || "{}");
      const sectionData = data?.[section];
      return sectionData && typeof sectionData === "object" ? sectionData : {};
    } catch(_) {
      return {};
    }
  }

  function chordNameFromItem(item) {
    return String(item?.name || item?.chord || item?.label || item?.symbol || "").trim();
  }

  function lyricChordGuideForSection(s, part, bars) {
    const section = part?.section || "";
    const totalBars = Math.max(1, Number(bars) || 1);
    const guide = Array.from({ length: totalBars }, () => ["", "", "", ""]);
    const beatsData = readChartBeatsForLyrics(section);

    let items = [];
    try {
      items = draftOrLiveItems(s, section);
    } catch(_) {
      items = [];
    }

    if (!Array.isArray(items) || !items.length) {
      try {
        const key = projectKey(s, s?.project || s || {});
        items = defaultChordsFor(part?.type || section, key || "C", totalBars);
      } catch(_) {
        items = [];
      }
    }

    const baseByBar = [];
    let cursor = 0;
    (Array.isArray(items) ? items : []).forEach((item) => {
      const chord = chordNameFromItem(item);
      const itemBars = Math.max(1, Number(item?.bars) || 1);
      for (let k = 0; k < itemBars && cursor < totalBars; k++) {
        baseByBar[cursor] = chord;
        cursor++;
      }
    });

    let previousActive = "";
    for (let bar = 0; bar < totalBars; bar++) {
      let active = String(beatsData[bar + "_0"] || baseByBar[bar] || previousActive || "").trim();
      for (let beat = 0; beat < 4; beat++) {
        const explicit = String(beatsData[bar + "_" + beat] || "").trim();
        if (explicit) active = explicit;
        guide[bar][beat] = active || "";
      }
      if (active) previousActive = active;
    }

    return guide;
  }

  // Cambio 51: mapa de íconos musicales para la duración por tiempo.
  const LYRIC_NOTE_ICON = { 1: "♩", 2: "𝅗𝅥", 3: "𝅗𝅥.", 4: "𝅝" };
  const LYRIC_NOTE_LABEL = {
    1: "Negra · 1 tiempo",
    2: "Blanca · 2 tiempos",
    3: "Blanca con puntillo · 3 tiempos",
    4: "Redonda · 4 tiempos"
  };

  // Cambio 53: pentagrama mini para elegir la altura (pitch) de la nota.
  // Notación interna en letras (A–G + octava, ej. "G4") para que sea compatible
  // a futuro con MIDI/partitura real; en pantalla se muestra en solfeo (Do/Re/Mi...).
  const SOLFA_BY_LETTER = { C: "Do", D: "Re", E: "Mi", F: "Fa", G: "Sol", A: "La", B: "Si" };
  function noteSolfa(pitch) {
    const p = String(pitch || "").trim();
    if (!p) return "";
    const letter = p[0].toUpperCase();
    const octave = p.slice(1);
    return (SOLFA_BY_LETTER[letter] || letter) + octave;
  }
  // De agudo a grave, tal como se dibuja de arriba hacia abajo en el pentagrama.
  // Líneas reales: F5 D5 B4 G4 E4 (clave de sol). Líneas adicionales: A5 arriba, C4 abajo.
  const NOTE_STAFF_LINES = ["F5", "D5", "B4", "G4", "E4"];
  const NOTE_STAFF_LEDGER = ["A5", "C4"];
  const NOTE_STAFF_STEPS = ["A5", "G5", "F5", "E5", "D5", "C5", "B4", "A4", "G4", "F4", "E4", "D4", "C4"]
    .map((pitch) => ({
      pitch,
      kind: NOTE_STAFF_LEDGER.includes(pitch) ? "ledger" : (NOTE_STAFF_LINES.includes(pitch) ? "line" : "space")
    }));

  function buildNoteStaffPicker(ctx, initialPitch, onPick) {
    const wrap = ctx.el("div", "s936-note-staff-wrap");
    const label = ctx.el("div", "s936-note-pitch-label", initialPitch ? noteSolfa(initialPitch) : "Sin nota");
    const staff = ctx.el("div", "s936-note-staff");
    NOTE_STAFF_STEPS.forEach((step) => {
      const row = ctx.el("button", "s936-note-row s936-note-" + step.kind);
      row.type = "button";
      row.title = noteSolfa(step.pitch);
      row.dataset.pitch = step.pitch;
      if (step.pitch === initialPitch) row.classList.add("is-active");
      if (step.kind !== "space") row.appendChild(ctx.el("span", "s936-note-mark"));
      row.onclick = (e) => {
        e.stopPropagation();
        staff.querySelectorAll(".s936-note-row").forEach((r) => r.classList.remove("is-active"));
        row.classList.add("is-active");
        label.textContent = noteSolfa(step.pitch);
        onPick(step.pitch);
      };
      staff.appendChild(row);
    });
    wrap.append(label, staff);
    return wrap;
  }

  function openSectionLyricsEditor(ctx, s, part, parts) {
    if (!part) return;

    // Cambio 48: editor Ly flotante, movible y redimensionable.
    // Se puede poner encima o al lado del Chart, y escribe letra por compás / tiempo.
    document.getElementById("s936-lyrics-modal-overlay")?.remove();
    document.getElementById("s936-lyrics-inline-panel")?.remove();
    document.getElementById("s936-lyrics-float-panel")?.remove();
    // Cambio 55: por si quedó algún popover de nota "portado" a <body> de una sesión anterior.
    document.querySelectorAll("body > .s936-lyric-duration-pop").forEach((p) => p.remove());

    const section = part.section || "";
    const label = part.label || labelFor(section);
    const bars = sectionBarCountForLyrics(part, s);
    const store = readSectionLyricsStore();
    const current = store[section] || {};
    const lines = current.lines || current.bars || {};
    const beats = current.beats || {};
    const durations = current.durations || {};
    const pitches = current.pitches || {}; // Cambio 53: altura de nota por tiempo
    const subdivisions = current.subdivisions || {}; // Cambio 56: cuántas sílabas dividen el tiempo
    const subBeats = current.subBeats || {};         // Cambio 56: texto de cada sílaba
    const subPitches = current.subPitches || {};     // Cambio 56: altura de cada sílaba
    const chordGuide = lyricChordGuideForSection(s, part, bars);

    const panel = ctx.el("section", "s936-lyrics-float-panel");
    panel.id = "s936-lyrics-float-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Editor flotante tipo Chart de letra por compás y tiempo");

    const head = ctx.el("div", "s936-lyrics-head");
    const title = ctx.el("div", "s936-lyrics-title");
    const titleText = ctx.el("b", "", label + " · Editor de letras");
    titleText.title = "Editor flotante: escribe letra por compás y por tempo mirando el Chart.";
    const infoTip = ctx.el("span", "s936-lyrics-info", "?");
    infoTip.title = "Réplica vacía de la sección actual: 4 compases por línea, 4 tiempos por compás. Puedes escribir palabra, sílaba o frase en cada tiempo y escoger duración 1T/2T/3T/4T.";
    const titleHint = ctx.el("small", "", "");
    title.append(titleText, infoTip, titleHint);

    const toolbar = ctx.el("div", "s936-lyrics-toolbar");
    function lyricTool(icon, tip, extra) {
      const b = ctx.el("button", "s936-lyrics-tool " + (extra || ""), icon);
      b.type = "button";
      b.title = tip;
      b.setAttribute("aria-label", tip);
      toolbar.appendChild(b);
      return b;
    }

    const saveTop = lyricTool("💾", "Guardar");
    const draftTop = lyricTool("📝", "Guardar borrador");
    const boardTop = lyricTool("⇢", "Move al tablero");
    const voiceTop = lyricTool("🎙", "Crear nota voz");
    const textTop = lyricTool("✎", "Crear nota texto");
    const close = lyricTool("×", "Cerrar editor de letra", "close");
    close.onclick = () => {
      openLyricPopovers.forEach((pop) => pop.remove());
      openLyricPopovers.clear();
      panel.remove();
    };

    head.append(title, toolbar);
    panel.appendChild(head);

    const body = ctx.el("div", "s936-lyrics-body");
    const help = ctx.el("div", "s936-lyrics-help", "");
    body.appendChild(help);

    const fields = [];
    const durationFields = [];
    const subdivisionFields = []; // Cambio 56

    // Cambio 55: helpers de "portal" para el popover de nota/duración — evita que
    // el overflow del panel/body lo recorte, moviéndolo a <body> con position:fixed
    // mientras está abierto, y lo devuelve a su celda al cerrarlo.
    const openLyricPopovers = new Set();
    function closeLyricPopover(pop) {
      pop.hidden = true;
      openLyricPopovers.delete(pop);
    }
    function closeAllLyricPopovers() {
      openLyricPopovers.forEach((pop) => { pop.hidden = true; });
      openLyricPopovers.clear();
    }
    function openLyricPopover(anchorBtn, pop) {
      if (pop.parentElement !== document.body) document.body.appendChild(pop);
      const rect = anchorBtn.getBoundingClientRect();
      const estHeight = 230;
      pop.style.position = "fixed";
      pop.style.left = Math.round(rect.left + rect.width / 2) + "px";
      if (rect.top - estHeight < 8) {
        pop.style.top = Math.round(rect.bottom + 8) + "px";
        pop.style.transform = "translateX(-50%)";
      } else {
        pop.style.top = Math.round(rect.top - 8) + "px";
        pop.style.transform = "translate(-50%,-100%)";
      }
      pop.hidden = false;
      openLyricPopovers.add(pop);
    }
    const chartGrid = ctx.el("div", "s936-lyrics-chart-grid");
    for (let i = 0; i < bars; i++) {
      const barCard = ctx.el("article", "s936-lyrics-bar-card");
      barCard.dataset.bar = String(i);
      const barHead = ctx.el("div", "s936-lyrics-bar-head");
      barHead.appendChild(ctx.el("strong", "", "Compás " + (i + 1)));
      barHead.appendChild(ctx.el("span", "", "4 tiempos"));
      barCard.appendChild(barHead);

      const grid = ctx.el("div", "s936-lyrics-beat-grid");
      const oldLine = String(lines[String(i)] || lines[i] || "").trim();
      const splitOld = oldLine && !beats[String(i)] ? oldLine.split(/\s+/) : [];
      const barBeats = beats[String(i)] || beats[i] || {};
      const barDurations = durations[String(i)] || durations[i] || {};
      const barPitches = pitches[String(i)] || pitches[i] || {}; // Cambio 53
      const barSubdivisions = subdivisions[String(i)] || subdivisions[i] || {}; // Cambio 56
      const barSubBeats = subBeats[String(i)] || subBeats[i] || {};
      const barSubPitches = subPitches[String(i)] || subPitches[i] || {};

      for (let b = 0; b < 4; b++) {
        const cell = ctx.el("div", "s936-lyrics-beat-cell");
        const guideName = String(chordGuide?.[i]?.[b] || "").trim();
        // Cambio 55: la nota deja de ser una fila aparte debajo del texto —
        // ahora vive DENTRO del mismo cuadro donde escribes, como una guía.
        const inputWrap = ctx.el("div", "s936-lyric-input-wrap");
        const em = ctx.el("em", "", guideName || "—");
        em.title = "Tiempo " + (b + 1) + (guideName ? " · " + guideName : " · sin acorde guía");
        em.dataset.beat = String(b + 1);
        em.dataset.chord = guideName;
        const ta = document.createElement("textarea");
        ta.title = "Escribe palabra, sílaba o frase para este tiempo.";
        ta.value = String(barBeats[String(b)] || barBeats[b] || splitOld[b] || "");
        ta.dataset.bar = String(i);
        ta.dataset.beat = String(b);
        fields.push(ta);

        // Cambio 51/53: ícono de nota; clic abre pentagrama (altura) + 4 figuras (duración).
        const initialDur = Math.max(1, Math.min(4, Number(barDurations[String(b)] || barDurations[b] || 1)));
        const initialPitch = String(barPitches[String(b)] || barPitches[b] || "").trim();

        const durationWrap = ctx.el("div", "s936-lyric-duration-wrap");
        durationWrap.dataset.bar = String(i);
        durationWrap.dataset.beat = String(b);
        durationWrap.dataset.value = String(initialDur);
        durationWrap.dataset.pitch = initialPitch;

        const durationBtn = ctx.el("button", "s936-lyric-duration-btn", LYRIC_NOTE_ICON[initialDur]);
        durationBtn.type = "button";
        const btnLabel = () => LYRIC_NOTE_LABEL[Number(durationWrap.dataset.value)] +
          (durationWrap.dataset.pitch ? " · " + noteSolfa(durationWrap.dataset.pitch) : "");
        durationBtn.title = btnLabel();
        durationBtn.setAttribute("aria-label", "Nota: " + btnLabel());

        // Cambio 55: el placeholder del cuadro de texto ahora ES la guía de la nota
        // (ej. "♩ Sol4"), en vez del genérico "letra". Se actualiza al elegir altura/duración.
        function updateGuidePlaceholder() {
          const durIcon = LYRIC_NOTE_ICON[Number(durationWrap.dataset.value)] || "♩";
          const pitchTxt = durationWrap.dataset.pitch ? noteSolfa(durationWrap.dataset.pitch) : "";
          ta.placeholder = pitchTxt ? (durIcon + " " + pitchTxt) : durIcon + " letra";
        }
        updateGuidePlaceholder();

        const durationPop = ctx.el("div", "s936-lyric-duration-pop");
        durationPop.hidden = true;

        // Cambio 53: pentagrama para elegir la altura de la nota.
        const staffPicker = buildNoteStaffPicker(ctx, initialPitch, (pitch) => {
          durationWrap.dataset.pitch = pitch;
          durationBtn.title = btnLabel();
          durationBtn.setAttribute("aria-label", "Nota: " + btnLabel());
          updateGuidePlaceholder();
        });
        durationPop.appendChild(staffPicker);

        const durationOptsRow = ctx.el("div", "s936-lyric-duration-pop-durations");
        [1, 2, 3, 4].forEach((n) => {
          const opt = ctx.el("button", "s936-lyric-duration-opt", LYRIC_NOTE_ICON[n]);
          opt.type = "button";
          opt.title = LYRIC_NOTE_LABEL[n];
          opt.dataset.value = String(n);
          if (n === initialDur) opt.classList.add("is-active");
          opt.onclick = (e) => {
            e.stopPropagation();
            durationWrap.dataset.value = String(n);
            durationBtn.textContent = LYRIC_NOTE_ICON[n];
            durationBtn.title = btnLabel();
            durationBtn.setAttribute("aria-label", "Nota: " + btnLabel());
            durationOptsRow.querySelectorAll(".s936-lyric-duration-opt").forEach((o) => o.classList.remove("is-active"));
            opt.classList.add("is-active");
            updateGuidePlaceholder();
            closeLyricPopover(durationPop);
          };
          durationOptsRow.appendChild(opt);
        });
        durationPop.appendChild(durationOptsRow);

        // Cambio 56: dividir el tiempo en 2, 3 o 4 sílabas (corcheas/semicorcheas),
        // cada una con su propio texto y su propia nota — ej. "mu-cu-ra" en un solo tiempo.
        const initialSubdivision = Math.max(1, Math.min(4, Number(barSubdivisions[String(b)] || barSubdivisions[b] || 1)));
        const initialSubTexts = Array.isArray(barSubBeats[String(b)] || barSubBeats[b]) ? (barSubBeats[String(b)] || barSubBeats[b]) : [];
        const initialSubPitchesArr = Array.isArray(barSubPitches[String(b)] || barSubPitches[b]) ? (barSubPitches[String(b)] || barSubPitches[b]) : [];

        const subRow = ctx.el("div", "s936-lyric-sub-row");
        subRow.hidden = initialSubdivision <= 1;
        let subInputs = [];

        function renderSubdivision(n, presetTexts, presetPitches) {
          subRow.innerHTML = "";
          subInputs = [];
          if (n <= 1) {
            ta.hidden = false;
            subRow.hidden = true;
            return;
          }
          ta.hidden = true;
          ta.value = "";
          subRow.hidden = false;
          for (let s = 0; s < n; s++) {
            const mini = ctx.el("div", "s936-lyric-sub-mini");
            const miniInput = document.createElement("input");
            miniInput.type = "text";
            miniInput.className = "s936-lyric-sub-input";
            miniInput.placeholder = String(s + 1);
            miniInput.value = presetTexts[s] || "";
            mini.appendChild(miniInput);

            const miniDot = ctx.el("button", "s936-lyric-sub-dot", "♪");
            miniDot.type = "button";
            let miniPitch = String(presetPitches[s] || "").trim();
            const syncDot = () => {
              miniDot.title = miniPitch ? ("Sílaba " + (s + 1) + " · " + noteSolfa(miniPitch)) : ("Sílaba " + (s + 1) + " · sin nota, clic para elegir");
              miniDot.classList.toggle("has-pitch", !!miniPitch);
            };
            syncDot();

            const miniPop = ctx.el("div", "s936-lyric-duration-pop s936-lyric-sub-pop");
            miniPop.hidden = true;
            const miniStaff = buildNoteStaffPicker(ctx, miniPitch, (pitch) => {
              miniPitch = pitch;
              syncDot();
              closeLyricPopover(miniPop);
            });
            miniPop.appendChild(miniStaff);
            miniDot.onclick = (e) => {
              e.stopPropagation();
              const wasHidden = miniPop.hidden;
              closeAllLyricPopovers();
              if (wasHidden) openLyricPopover(miniDot, miniPop);
            };

            mini.append(miniDot, miniPop);
            subRow.appendChild(mini);
            subInputs.push({ input: miniInput, getPitch: () => miniPitch });
          }
        }
        renderSubdivision(initialSubdivision, initialSubTexts, initialSubPitchesArr);

        const subdivideRow = ctx.el("div", "s936-lyric-subdivide-row");
        subdivideRow.appendChild(ctx.el("span", "s936-lyric-subdivide-label", "Dividir tiempo en sílabas"));
        const subdivideBtns = ctx.el("div", "s936-lyric-subdivide-btns");
        [1, 2, 3, 4].forEach((n) => {
          const sb = ctx.el("button", "s936-lyric-subdivide-opt", String(n));
          sb.type = "button";
          sb.title = n === 1 ? "Sin dividir (una sola nota)" : ("Dividir en " + n + " sílabas");
          sb.dataset.value = String(n);
          if (n === initialSubdivision) sb.classList.add("is-active");
          sb.onclick = (e) => {
            e.stopPropagation();
            subdivideBtns.querySelectorAll(".s936-lyric-subdivide-opt").forEach((o) => o.classList.remove("is-active"));
            sb.classList.add("is-active");
            renderSubdivision(n, [], []);
            if (n === 1) closeLyricPopover(durationPop);
          };
          subdivideBtns.appendChild(sb);
        });
        subdivideRow.appendChild(subdivideBtns);
        durationPop.appendChild(subdivideRow);

        subdivisionFields.push({
          bar: String(i),
          beat: String(b),
          getValue: () => Number(subdivideBtns.querySelector(".is-active")?.dataset.value || 1),
          getTexts: () => subInputs.map((si) => si.input.value.trim()),
          getPitches: () => subInputs.map((si) => si.getPitch())
        });

        // Cambio 55: corrige que el pentagrama "se escondiera" — el panel y el
        // cuerpo del editor tienen overflow:hidden/auto para poder hacer scroll,
        // y eso recortaba el popover aunque fuera position:absolute. Ahora, al
        // abrirlo, se calcula su posición real en pantalla y se mueve como
        // "portal" a <body> con position:fixed, así nunca queda recortado.
        durationBtn.onclick = (e) => {
          e.stopPropagation();
          const wasHidden = durationPop.hidden;
          closeAllLyricPopovers();
          if (wasHidden) openLyricPopover(durationBtn, durationPop);
        };

        durationWrap.append(durationBtn, durationPop);
        durationFields.push(durationWrap);

        inputWrap.append(ta, subRow, durationWrap);
        cell.append(em, inputWrap);
        grid.appendChild(cell);
      }

      barCard.appendChild(grid);
      chartGrid.appendChild(barCard);
    }
    body.appendChild(chartGrid);
    panel.appendChild(body);

    const actions = ctx.el("div", "s936-lyrics-actions");
    const save = ctx.el("button", "s936-lyrics-save", "✓ Guardar y ver en Chart");
    const closeBtn = ctx.el("button", "s936-lyrics-cancel", "Cerrar");

    function saveLyrics(closeAfterSave) {
      const nextBeats = {};
      const nextLines = {};
      const nextDurations = {};
      const nextPitches = {}; // Cambio 53
      const nextSubdivisions = {}; // Cambio 56
      const nextSubBeats = {};
      const nextSubPitches = {};

      fields.forEach((field) => {
        const bar = field.dataset.bar;
        const beat = field.dataset.beat;
        const value = String(field.value || "").trim();
        if (!nextBeats[bar]) nextBeats[bar] = {};
        if (value) nextBeats[bar][beat] = value;
      });

      durationFields.forEach((field) => {
        const bar = field.dataset.bar;
        const beat = field.dataset.beat;
        const value = Math.max(1, Math.min(4, Number(field.dataset.value) || 1));
        const pitch = String(field.dataset.pitch || "").trim();
        const hasText = String(nextBeats?.[bar]?.[beat] || "").trim();
        if (value > 1 && hasText) {
          if (!nextDurations[bar]) nextDurations[bar] = {};
          nextDurations[bar][beat] = value;
        }
        if (pitch && hasText) {
          if (!nextPitches[bar]) nextPitches[bar] = {};
          nextPitches[bar][beat] = pitch;
        }
      });

      // Cambio 56: si el tiempo está dividido en sílabas, guarda cada sílaba
      // (texto + su propia nota) y además une el texto en nextBeats para que
      // el Chart (que aún no dibuja sub-notas) muestre algo legible mientras
      // llega el Cambio 57 con el dibujo real por sílaba.
      subdivisionFields.forEach((sf) => {
        const n = sf.getValue();
        if (n <= 1) return;
        const texts = sf.getTexts();
        const hasAny = texts.some((t) => t);
        if (!hasAny) return;

        if (!nextSubdivisions[sf.bar]) nextSubdivisions[sf.bar] = {};
        nextSubdivisions[sf.bar][sf.beat] = n;

        if (!nextSubBeats[sf.bar]) nextSubBeats[sf.bar] = {};
        nextSubBeats[sf.bar][sf.beat] = texts;

        if (!nextSubPitches[sf.bar]) nextSubPitches[sf.bar] = {};
        nextSubPitches[sf.bar][sf.beat] = sf.getPitches();

        if (!nextBeats[sf.bar]) nextBeats[sf.bar] = {};
        const joinedSyllables = texts.filter(Boolean).join("-");
        if (joinedSyllables) nextBeats[sf.bar][sf.beat] = joinedSyllables;
      });

      Object.keys(nextBeats).forEach((bar) => {
        const joined = [0, 1, 2, 3]
          .map((beat) => String(nextBeats[bar][String(beat)] || "").trim())
          .filter(Boolean)
          .join(" ");
        if (joined) nextLines[bar] = joined;
        else delete nextBeats[bar];
      });

      const data = readSectionLyricsStore();
      data[section] = {
        label,
        section,
        bars,
        beats: nextBeats,
        lines: nextLines,
        durations: nextDurations,
        pitches: nextPitches,
        subdivisions: nextSubdivisions,
        subBeats: nextSubBeats,
        subPitches: nextSubPitches,
        updatedAt: new Date().toISOString()
      };
      saveSectionLyricsStore(data);

      try {
        window.dispatchEvent(new CustomEvent("studio936:section-lyrics-updated", {
          detail: {
            section, label, bars, beats: nextBeats, lines: nextLines,
            durations: nextDurations, pitches: nextPitches,
            subdivisions: nextSubdivisions, subBeats: nextSubBeats, subPitches: nextSubPitches,
            source: "structure-lyrics-floating-editor"
          }
        }));
      } catch(_) {}

      try {
        const chartPanel = document.getElementById("s936-chart-view-panel");
        if (chartPanel && window.Studio936SuiteProChart?.render) {
          window.Studio936SuiteProChart.render({ container: chartPanel });
        }
      } catch(_) {}

      saveTop.title = "Guardado";
      setTimeout(() => { saveTop.title = "Guardar"; }, 900);
      if (closeAfterSave) {
        openLyricPopovers.forEach((pop) => pop.remove());
        openLyricPopovers.clear();
        panel.remove();
      }
    }

    saveTop.onclick = (e) => {
      e.stopPropagation();
      saveLyrics(false);
      saveTop.classList.add("saved");
      setTimeout(() => saveTop.classList.remove("saved"), 850);
    };

    draftTop.onclick = (e) => {
      e.stopPropagation();
      saveLyrics(false);
      toast(ctx, "Borrador de letra guardado.");
    };

    boardTop.onclick = (e) => {
      e.stopPropagation();
      saveLyrics(false);
      toast(ctx, "Letra preparada para tablero.");
    };

    voiceTop.onclick = (e) => {
      e.stopPropagation();
      toast(ctx, "Nota de voz preparada para el siguiente módulo.");
    };

    textTop.onclick = (e) => {
      e.stopPropagation();
      toast(ctx, "Nota de texto preparada para el siguiente módulo.");
    };

    save.onclick = (e) => {
      e.stopPropagation();
      saveLyrics(false);
    };

    closeBtn.onclick = (e) => {
      e.stopPropagation();
      openLyricPopovers.forEach((pop) => pop.remove());
      openLyricPopovers.clear();
      panel.remove();
    };

    actions.append(save, closeBtn);
    panel.appendChild(actions);

    // Cambio 51: cerrar el popover de duración abierto si se hace clic en cualquier otra parte del panel.
    panel.addEventListener("click", () => {
      closeAllLyricPopovers();
    });

    document.body.appendChild(panel);

    // Cambio 49: posición inicial tipo editor de vidrio sobre la zona baja del Chart.
    // Arranca donde normalmente se quiere escribir mirando la sección, pero sigue siendo movible/redimensionable.
    try {
      const dock = document.getElementById("s936SuitePro")?.getBoundingClientRect?.();
      const chart = document.getElementById("s936-chart-view-panel")?.getBoundingClientRect?.();
      const left = dock ? Math.max(18, dock.right + 22) : Math.max(24, window.innerWidth * 0.30);
      const availableWidth = Math.max(520, window.innerWidth - left - 24);
      panel.style.left = left + "px";
      panel.style.width = Math.min(1180, availableWidth) + "px";
      const chartTop = chart ? chart.top : 180;
      const desiredTop = Math.max(chartTop + 210, Math.round(window.innerHeight * 0.48));
      panel.style.top = Math.min(Math.max(92, desiredTop), Math.max(92, window.innerHeight - 390)) + "px";
      panel.style.height = Math.min(390, Math.max(300, window.innerHeight - parseInt(panel.style.top, 10) - 24)) + "px";
    } catch(_) {}

    // Arrastre desde la barra superior.
    let drag = null;
    head.addEventListener("pointerdown", (event) => {
      if (event.target === close) return;
      drag = {
        startX: event.clientX,
        startY: event.clientY,
        left: panel.offsetLeft,
        top: panel.offsetTop
      };
      head.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    head.addEventListener("pointermove", (event) => {
      if (!drag) return;
      const nextLeft = Math.min(window.innerWidth - 80, Math.max(8, drag.left + event.clientX - drag.startX));
      const nextTop = Math.min(window.innerHeight - 64, Math.max(8, drag.top + event.clientY - drag.startY));
      panel.style.left = nextLeft + "px";
      panel.style.top = nextTop + "px";
    });
    head.addEventListener("pointerup", () => { drag = null; });
    head.addEventListener("pointercancel", () => { drag = null; });

    setTimeout(() => fields[0]?.focus?.(), 80);
  }


  function renderZoomSessionConsole(ctx, root, s, part, parts) {
    if (!part) return;
    const section = part.section || "";
    const label = part.label || labelFor(section);
    const bpm = Number(state.draft?.meta?.bpm || s?.bpm || document.getElementById("bpmInput")?.value || 95) || 95;
    const style = state.draft?.meta?.style || s?.style || document.getElementById("styleSelect")?.value || "Funk";

    const card = ctx.el("section", "s936-zoom-session-console");
    const head = ctx.el("div", "s936-zoom-session-head");
    const title = ctx.el("div", "s936-zoom-session-title");
    title.appendChild(ctx.el("b", "", "Consola de sesión"));
    title.appendChild(ctx.el("small", "", label + " · herramientas de arreglo y conexión"));
    const badge = ctx.el("span", "s936-zoom-session-badge", "Zoom activo");
    head.append(title, badge);
    card.appendChild(head);

    const status = ctx.el("div", "s936-zoom-session-status", "Barra superior: Play / Loop / Salir. Aquí preparas instrumentos, pads, REC y envío al Studio.");
    const panel = () => document.getElementById("s936-chart-view-panel");

    function setStatus(text) {
      status.textContent = text;
    }

    function emitTool(eventName, labelText, extra = {}) {
      try {
        window.dispatchEvent(new CustomEvent(eventName, {
          detail: { section, label, bpm, style, source: "zoom-session-console", ...extra }
        }));
      } catch(_) {}
      setStatus(labelText);
    }

    function toolButton(className, titleText, hintText, eventName, statusText, extra) {
      const btn = ctx.el("button", "s936-zoom-session-btn tool " + (className || ""));
      btn.innerHTML = `<strong>${titleText}</strong><small>${hintText}</small>`;
      btn.onclick = (e) => {
        e.stopPropagation();
        emitTool(eventName, statusText, extra || {});
      };
      return btn;
    }

    function lyricToolButton() {
      const btn = ctx.el("button", "s936-zoom-session-btn tool lyric-card");
      btn.innerHTML = `<strong>Ly Letra</strong><small>lírica por compás</small>`;
      btn.onclick = (e) => {
        e.stopPropagation();
        openSectionLyricsEditor(ctx, s, part, parts);
        setStatus("Editor Ly flotante abierto: escribe por compás y por tiempo mientras miras el Chart.");
      };
      return btn;
    }

    const toolsTitle = ctx.el("div", "s936-zoom-session-tools-title", "Dashboard de herramientas");
    card.appendChild(toolsTitle);

    const grid = ctx.el("div", "s936-zoom-session-grid s936-zoom-tools-grid");
    grid.append(
      toolButton("primary", "🥁 Batería", "seguir ritmo actual", "studio936:prepare-section-drums", "Batería preparada para seguir el ritmo de esta sección."),
      toolButton("", "🎸 Bajo / Groove", "raíz y patrón", "studio936:prepare-section-bass-groove", "Bajo/Groove preparado para la armonía de la sección."),
      toolButton("", "🎛 Pads", "disparar colores", "studio936:prepare-section-pads", "Pads preparados para esta sección."),
      toolButton("", "✨ Arpegio / Ritmo", "probar patrón", "studio936:prepare-section-arp-rhythm", "Arpegio/Ritmo preparado para la sección."),
      lyricToolButton(),
      toolButton("", "REC Voz", "toma vocal", "studio936:prepare-section-voice-rec", "REC voz preparado para esta sección."),
      toolButton("", "REC Instrumento", "guitarra/línea", "studio936:prepare-section-instrument-rec", "REC instrumento preparado para esta sección."),
      toolButton("", "🎹 MIDI / Teclado", "controlador", "studio936:prepare-section-midi", "MIDI/teclado preparado para esta sección.")
    );
    card.appendChild(grid);

    const block = ctx.el("div", "s936-zoom-session-block compact");
    block.appendChild(ctx.el("h5", "", "Conexiones rápidas"));
    const chips = ctx.el("div", "s936-zoom-session-chips");
    [
      ["Micrófono", "studio936:prepare-section-mic"],
      ["Guitarra / línea", "studio936:prepare-section-line"],
      ["Interfaz de audio", "studio936:prepare-section-audio-input"],
      ["Teclado MIDI", "studio936:prepare-section-midi"],
      ["Monitor", "studio936:prepare-section-monitor"]
    ].forEach(([text, eventName]) => {
      const chip = ctx.el("button", "s936-zoom-session-chip", text);
      chip.onclick = (e) => {
        e.stopPropagation();
        emitTool(eventName, text + " preparado para esta sección.");
      };
      chips.appendChild(chip);
    });
    block.appendChild(chips);
    card.appendChild(block);

    const send = ctx.el("button", "s936-zoom-session-btn primary s936-zoom-session-send", "⇢ Enviar toma al Studio");
    send.onclick = (e) => {
      e.stopPropagation();
      try {
        window.dispatchEvent(new CustomEvent("studio936:send-section-take-to-studio", {
          detail: { section, label, bpm, style, source: "zoom-session-console" }
        }));
      } catch(_) {}
      setStatus("Ruta preparada: esta sección podrá enviarse al Studio para mezcla/edición cuando activemos REC real.");
    };
    card.appendChild(send);
    card.appendChild(status);
    root.appendChild(card);
  }

  function renderHeader(ctx, root, s, parts) {
    const meta = state.draft.meta || {};

    const shell = ctx.el("div", "s936-ckpt-shell");

    // ── MENÚ COMPACTO: los datos maestros viven arriba en el Main ──
    const topbar = ctx.el("div", "s936-ckpt-topbar s936-ckpt-topbar-compact");

    // Cambio 31: no duplicar título/estilo/BPM en el dock. Se conservan en draft desde el Main.
    const titleInput = null;
    const styleSelect = null;
    const bpmInput = null;

    // Botón menú canción compacto
    const menuBtn = ctx.el("button", "s936-ckpt-menu-btn s936-ckpt-menu-btn-wide");
    menuBtn.title = "Menú canción";
    menuBtn.innerHTML = "☰ Menú canción";
    menuBtn.style.fontSize=".62rem";
    menuBtn.style.letterSpacing=".35px";
    menuBtn.setAttribute("aria-label", "Menú canción");

    const dropdown = ctx.el("div", "s936-ckpt-dropdown");
    dropdown.id = "s936CkptDropdown";

    // ── CANCIÓN ──
    const ddNueva = ctx.el("button", "s936-ckpt-dd-item", "✦ Nueva canción");
    ddNueva.onclick = () => {
      dropdown.classList.remove("open");
      if (!window.confirm("¿Crear una nueva canción? Se perderán los cambios no guardados.")) return;
      try { window.Studio936AppBridge?.newSong?.(); } catch(_) {}
    };

    const ddAbrir = ctx.el("button", "s936-ckpt-dd-item", "📂 Abrir de librería");
    const fileInput = ctx.el("input", "s936-struct-hidden-file");
    fileInput.type = "file"; fileInput.accept = "application/json,.json";
    fileInput.style.display = "none";
    fileInput.onchange = () => { const f = fileInput.files?.[0]; if (f) loadStructureFile(ctx, f); fileInput.value = ""; };
    ddAbrir.onclick = async () => {
      dropdown.classList.remove("open");
      // Intentar abrir con File System Access API desde carpeta guardada
      const savedHandle = await getLibraryDirHandle();
      if (savedHandle && window.showOpenFilePicker) {
        try {
          const [fh] = await window.showOpenFilePicker({
            startIn: savedHandle,
            types: [{ description: "Studio 936", accept: { "application/json": [".json"] } }],
            multiple: false
          });
          const file = await fh.getFile();
          loadStructureFile(ctx, file);
          return;
        } catch(e) { if (e.name !== "AbortError") console.warn(e); }
      }
      // Fallback: input file normal
      const lib = window.Studio936SuiteProLibrary || window.Studio936SuiteProModules?.library;
      if (lib && typeof lib.openPicker === "function") {
        lib.openPicker((song) => { if (song) loadStructureFromSong(ctx, song); });
      } else { fileInput.click(); }
    };

    const ddGuardarLib = ctx.el("button", "s936-ckpt-dd-item", "💾 Guardar en librería");
    ddGuardarLib.onclick = async () => {
      dropdown.classList.remove("open");
      await saveToLibraryDir(ctx, s, parts);
    };

    const ddSep1 = ctx.el("div", "s936-ckpt-dd-sep");

    const ddPlantillas = ctx.el("button", "s936-ckpt-dd-item", "🎼 Plantillas");
    ddPlantillas.onclick = () => {
      dropdown.classList.remove("open");
      try {
        const compose = window.Studio936SuiteProCompose || window.Studio936SuiteProModules?.compose;
        if (compose && typeof compose.goTo === "function") { compose.goTo("templates"); return; }
        if (ctx.state) { ctx.state.composeTool = "structure"; ctx.state.structureSubtool = "templates"; }
        const composeRender = window.Studio936SuiteProModules?.compose?.render;
        if (composeRender && ctx) composeRender(ctx);
      } catch(_) {}
    };

    const ddInspiracion = ctx.el("button", "s936-ckpt-dd-item", "✨ Inspiración");
    ddInspiracion.onclick = () => {
      dropdown.classList.remove("open");
      try {
        const compose = window.Studio936SuiteProCompose || window.Studio936SuiteProModules?.compose;
        if (compose && typeof compose.goTo === "function") { compose.goTo("inspire"); return; }
        if (ctx.state) { ctx.state.composeTool = "structure"; ctx.state.structureSubtool = "inspire"; }
        const composeRender = window.Studio936SuiteProModules?.compose?.render;
        if (composeRender && ctx) composeRender(ctx);
      } catch(_) {}
    };

    const ddSep2 = ctx.el("div", "s936-ckpt-dd-sep");

    // ── BORRADOR ──
    const ddConfirmar = ctx.el("button", "s936-ckpt-dd-item warn", "✓ Salvar cambios");
    ddConfirmar.onclick = () => { dropdown.classList.remove("open"); applyDraft(ctx); };

    const ddDescartar = ctx.el("button", "s936-ckpt-dd-item", "↺ Descartar cambios");
    ddDescartar.onclick = () => {
      dropdown.classList.remove("open");
      if (!window.confirm("¿Descartar cambios y volver a la canción actual?")) return;
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

    const ddSep3 = ctx.el("div", "s936-ckpt-dd-sep");

    const ddExportar = ctx.el("button", "s936-ckpt-dd-item", "⬇ Exportar MusicXML");
    ddExportar.onclick = () => { dropdown.classList.remove("open"); exportMusicXML(ctx, s, parts); };

    const ddSep4 = ctx.el("div", "s936-ckpt-dd-sep");
    const ddConfig = ctx.el("button", "s936-ckpt-dd-item", "⚙ Configurar librería");
    ddConfig.onclick = () => { dropdown.classList.remove("open"); openLibraryConfig(ctx); };

    dropdown.append(ddNueva, ddAbrir, ddGuardarLib, ddSep1, ddPlantillas, ddInspiracion, ddSep2, ddConfirmar, ddDescartar, ddSep3, ddExportar, ddSep4, ddConfig, fileInput);

    // Toggle dropdown ☰ — position:absolute dentro del menuBtn
    menuBtn.onclick = (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.contains("open");
      document.querySelectorAll(".s936-ckpt-dropdown.open").forEach(d => d.classList.remove("open"));
      if (!isOpen) dropdown.classList.add("open");
    };
    document.addEventListener("click", (e) => {
      if (!menuBtn.contains(e.target)) dropdown.classList.remove("open");
    });

    // Dropdown dentro del botón — position absolute relativo al botón
    menuBtn.style.position = "relative";
    menuBtn.appendChild(dropdown);
    topbar.append(menuBtn);
    shell.appendChild(topbar);

    // ── STATUS BAR ──
    const statusBar = ctx.el("div", "s936-ckpt-status");
    const dot = ctx.el("span", "s936-ckpt-status-dot");
    const statusText = ctx.el("span", "", `${parts.length} partes · ${totalBars(parts)} compases · ${uniqueSectionCount(parts)} secciones`);
    statusBar.append(dot, statusText);
    shell.appendChild(statusBar);

    root.appendChild(shell);
  }

  // Construye el bloque "+ Crear Sección" — usado en renderBuilder
  function buildAddSection(ctx, s, parts) {
    const addOpenKey = "s936_ckpt_add_open";
    const addIsOpen = localStorage.getItem(addOpenKey) === "1";

    const addToggle = ctx.el("div", "s936-ckpt-add-toggle" + (addIsOpen ? " open" : ""));
    addToggle.innerHTML = `<span>+ Crear Sección</span><span class="s936-ckpt-chevron">▾</span>`;

    const addBody = ctx.el("div", "s936-ckpt-add-body" + (addIsOpen ? " open" : ""));

    addToggle.onclick = () => {
      const now = !addToggle.classList.contains("open");
      addToggle.classList.toggle("open", now);
      addBody.classList.toggle("open", now);
      localStorage.setItem(addOpenKey, now ? "1" : "0");
    };

    const typeField = ctx.el("div", "");
    const typeLabel = ctx.el("span", "s936-ckpt-add-label", "Tipo");
    const typeSelect = ctx.el("select", "s936-ckpt-select");
    PART_OPTIONS.forEach(([value, label]) => {
      const opt = ctx.el("option", "", label);
      opt.value = value;
      if (value === state.newType) opt.selected = true;
      typeSelect.appendChild(opt);
    });

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

    typeSelect.onchange = () => {
      state.newType = typeSelect.value;
      state.newBars = suggestedBars(typeSelect.value);
      barsInput.value = String(state.newBars);
      saveState();
    };
    typeField.append(typeLabel, typeSelect);

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
    return { addToggle, addBody };
  }

  function renderBuilder(ctx, root, s, parts) {
    const listCard = ctx.el("section", "s936-struct-card s936-struct-arrangement-full");
    const titleRow = ctx.el("div", "s936-struct-section-heading");
    const left = ctx.el("div", "");
    left.appendChild(ctx.el("h4", "", "Arreglo de la canción"));

    titleRow.appendChild(left);

    listCard.appendChild(titleRow);

    const focusSection = state.focusSection || "";
    const focusedPart = focusSection ? parts.find(p => p.section === focusSection) : null;
    if (focusedPart) {
      // Cambio 48: se elimina el header grande "Zoom sección".
      // El control principal vive en la barra del canal: Play / Loop / Salir.
    }

    // "+ Crear Sección" debajo del título
    if (!focusedPart) {
      const { addToggle, addBody } = buildAddSection(ctx, s, parts);
      listCard.appendChild(addToggle);
      listCard.appendChild(addBody);
    }

    const list = ctx.el("div", "s936-struct-list s936-struct-list-wide");
    const visibleParts = focusedPart ? parts.filter(p => p.section === focusSection) : parts;
    if (!visibleParts.length) {
      list.appendChild(ctx.el("div", "s936-struct-empty", "Todavía no hay partes. Créala en el tablero ADN de la canción."));
    } else {
      visibleParts.forEach((part) => {
        const originalIndex = parts.findIndex(p => p === part || p.section === part.section);
        list.appendChild(partRow(ctx, s, parts, part, originalIndex < 0 ? 0 : originalIndex));
      });
    }
    listCard.appendChild(list);
    if (focusedPart) {
      renderZoomSessionConsole(ctx, listCard, s, focusedPart, parts);
    }
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

  function setConsoleChannelActive(section, mode) {
    try {
      document.querySelectorAll("#s936SuitePro .s936-ckpt-part-row").forEach(row => {
        const on = section && row.dataset.section === section;
        row.classList.toggle("is-console-playing", !!on);
      });
      document.querySelectorAll("#s936SuitePro .s936-ckpt-row-action.play, #s936SuitePro .s936-ckpt-row-action.loop").forEach(btn => {
        const on = section && btn.dataset.section === section;
        btn.classList.toggle("playing", !!on);
        if (btn.classList.contains("play")) btn.innerHTML = on ? "■" : "▶";
      });
      try {
        window.dispatchEvent(new CustomEvent("studio936:section-console-state", {
          detail: { section, mode: mode || "", version: "cambio-31" }
        }));
      } catch(_) {}
    } catch(_) {}
  }

  function clearConsoleChannelActive() {
    setConsoleChannelActive("", "");
  }

  if (!window.__s936SectionConsoleCambio31Bound) {
    window.__s936SectionConsoleCambio31Bound = true;
    window.addEventListener("studio936:chart-practice-stop", clearConsoleChannelActive);
    window.addEventListener("studio936:chart-practice-start", (ev) => {
      const sec = ev?.detail?.section || ev?.detail?.focusSection || "";
      if (sec) setConsoleChannelActive(sec, ev?.detail?.scope || "practice");
    });
    window.addEventListener("studio936:chart-practice-step", (ev) => {
      const sec = ev?.detail?.section || "";
      if (sec) {
        document.querySelectorAll("#s936SuitePro .s936-ckpt-part-row").forEach(row => {
          row.classList.toggle("is-console-playing", row.dataset.section === sec);
        });
      }
    });
  }


  function partRow(ctx, s, parts, part, index) {
    const isEditing = state.editingIndex === index;
    const row = ctx.el("article", "");
    row.style.cssText = "display:flex;flex-direction:column;gap:0";

    const isFocus = state.focusSection && state.focusSection === part.section;
    const line = ctx.el("div", "s936-ckpt-part-row" + (isEditing ? " is-editing" : "") + (isFocus ? " is-focus" : ""));
    line.dataset.section = part.section || "";
    line.dataset.partIndex = String(index);
    line.dataset.consoleChannel = "section";

    // Número
    const num = ctx.el("div", "s936-ckpt-part-num", String(index + 1).padStart(2, "0"));
    line.appendChild(num);

    // Badge tipo
    const type = part.type || baseType(part.section) || "verse";
    const badge = ctx.el("span", "s936-ckpt-part-badge", badgeLabel(type));
    badge.setAttribute("style", badgeStyle(type));
    const sectionFullName = part.label || labelFor(part.section);
    badge.title = sectionFullName + " · " + badgeLabel(type);
    line.title = sectionFullName + " · canal de sección";
    line.dataset.sectionLabel = sectionFullName;
    line.appendChild(badge);

    // Info: solo nombre (sin compases)
    const info = ctx.el("div", "s936-ckpt-part-info");
    info.appendChild(ctx.el("div", "s936-ckpt-part-name", part.label || labelFor(part.section)));
    line.appendChild(info);

    const consoleState = ctx.el("span", "s936-ckpt-console-state", "ACTIVA");
    line.appendChild(consoleState);

    // Badge marca navegación (Da Capo, Coda, etc.) — clickeable para desactivar
    const NAV_LABELS = {
      segno:"§ Segno", coda:"⊕ Coda", fine:"Fine",
      dacapo:"Da Capo", dalsegno:"Dal §", bis:"Bis"
    };
    if (part.navMark && NAV_LABELS[part.navMark]) {
      const markBadge = ctx.el("span", "s936-ckpt-nav-mark", NAV_LABELS[part.navMark]);
      markBadge.title = "Clic para desactivar " + NAV_LABELS[part.navMark];
      markBadge.onclick = (e) => {
        e.stopPropagation();
        // Mini confirm inline — sin alert del browser
        const existing = document.getElementById("s936-mark-confirm-" + index);
        if (existing) { existing.remove(); return; }
        const confirmEl = document.createElement("div");
        confirmEl.id = "s936-mark-confirm-" + index;
        confirmEl.style.cssText = "position:absolute;z-index:400;background:#0d1117;border:1px solid rgba(255,80,80,.5);border-radius:8px;padding:6px 8px;display:flex;align-items:center;gap:6px;font-size:.6rem;color:#ff9999;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,.8);";
        confirmEl.innerHTML = `<span>¿Quitar ${NAV_LABELS[part.navMark]}?</span>`;
        const yesBtn = document.createElement("button");
        yesBtn.textContent = "Sí";
        yesBtn.style.cssText = "background:rgba(255,80,80,.2);border:1px solid rgba(255,80,80,.5);border-radius:5px;color:#ff9999;font-size:.58rem;font-weight:900;padding:2px 8px;cursor:pointer;";
        yesBtn.onclick = (ev) => {
          ev.stopPropagation();
          part.navMark = "";
          state.draft.parts[index] = part;
          saveState(); renderAgain(ctx);
        };
        const noBtn = document.createElement("button");
        noBtn.textContent = "No";
        noBtn.style.cssText = "background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);border-radius:5px;color:rgba(255,255,255,.55);font-size:.58rem;font-weight:900;padding:2px 8px;cursor:pointer;";
        noBtn.onclick = (ev) => { ev.stopPropagation(); confirmEl.remove(); };
        confirmEl.append(yesBtn, noBtn);
        // Posicionar relativo al badge
        markBadge.style.position = "relative";
        markBadge.appendChild(confirmEl);
        // Auto-cerrar al click fuera
        setTimeout(() => {
          document.addEventListener("click", function autoClose() {
            confirmEl.remove(); document.removeEventListener("click", autoClose);
          }, { once: true });
        }, 100);
      };
      line.appendChild(markBadge);
    }

    // Botones de acción visibles: [▶][⏸][✎][▲][▼][⚙]
    const rowActions = ctx.el("div", "s936-ckpt-row-actions");

    // ▶ Play / ■ Stop — toggle con estado visual
    const playBtn = ctx.el("button", "s936-ckpt-row-action play");
    playBtn.dataset.section = part.section || "";
    playBtn.innerHTML = "▶";
    playBtn.title = "Escuchar sección";
    let _isPlaying = false;
    function setPlayState(on) {
      _isPlaying = on;
      playBtn.innerHTML = on ? "■" : "▶";
      playBtn.classList.toggle("playing", on);
      playBtn.title = on ? "Detener" : "Escuchar sección";
    }
    playBtn.onclick = (e) => {
      e.stopPropagation();
      if (_isPlaying) {
        // Detener
        try {
          window.Studio936SuiteProChart?.stopChartRhythmConsole?.({ stopAudio: true, stopBridge: true });
          const bridge = window.Studio936AppBridge;
          if (bridge?.stopGroove) bridge.stopGroove();
          else document.querySelector("#stopGrooveBtn, [data-action='stopGroove']")?.click();
        } catch(_) {}
        setPlayState(false);
        // resetear otros play buttons
        document.querySelectorAll(".s936-ckpt-row-action.play.playing").forEach(b => {
          if (b !== playBtn) { b.innerHTML = "▶"; b.classList.remove("playing"); }
        });
      } else {
        // Play — resetear otros primero
        document.querySelectorAll(".s936-ckpt-row-action.play").forEach(b => {
          b.innerHTML = "▶"; b.classList.remove("playing");
        });
        try {
          const sel = document.getElementById("sectionSelect");
          if (sel) { sel.value = part.section; sel.dispatchEvent(new Event("change", { bubbles: true })); }
          const panel = document.getElementById("s936-chart-view-panel");
          const ok = window.Studio936SuiteProChart?.startChartSectionPractice?.(panel, part.section, { withPulse:false, sourceLabel:"Sección" });
          if (!ok) {
            const bridge = window.Studio936AppBridge;
            if (bridge?.startGroove) bridge.startGroove();
            else document.querySelector("#startGrooveBtn, [data-action='startGroove']")?.click();
          }
        } catch(_) {}
        setPlayState(true);
        setConsoleChannelActive(part.section, "play");
      }
    };
    rowActions.appendChild(playBtn);

    // 🔁 Loop sección
    const loopBtn = ctx.el("button", "s936-ckpt-row-action loop");
    loopBtn.dataset.section = part.section || "";
    loopBtn.innerHTML = "↻";
    loopBtn.title = "Loop de esta sección";
    loopBtn.onclick = (e) => {
      e.stopPropagation();
      try {
        window.dispatchEvent(new CustomEvent("studio936:chart-loop-current-section", {
          detail: { section: part.section, part: part.label || labelFor(part.section) }
        }));
      } catch(_) {}
      try {
        const panel = document.getElementById("s936-chart-view-panel");
        window.Studio936SuiteProChart?.startChartSectionPractice?.(panel, part.section, { withPulse:false, sourceLabel:"Loop sección" });
        setConsoleChannelActive(part.section, "loop");
        loopBtn.classList.add("playing");
      } catch(_) {}
    };
    rowActions.appendChild(loopBtn);

    // 🔎 Zoom sección — filtra Chart y panel izquierdo
    const zoomBtn = ctx.el("button", "s936-ckpt-row-action zoom" + (isFocus ? " playing" : ""));
    zoomBtn.innerHTML = isFocus ? "↩" : "⛶";
    zoomBtn.title = isFocus ? "Salir de zoom sección" : "Zoom sección";
    zoomBtn.onclick = (e) => {
      e.stopPropagation();
      if (isFocus) {
        state.focusSection = "";
        try { localStorage.removeItem("s936_chart_focus_section_v1"); } catch(_) {}
        try { window.Studio936SuiteProChart?.clearFocusSection?.(); } catch(_) {}
      } else {
        state.focusSection = part.section;
        try {
          localStorage.setItem("s936_chart_focus_section_v1", JSON.stringify({
            active:true,
            section: part.section,
            label: part.label || labelFor(part.section),
            at: Date.now()
          }));
        } catch(_) {}
        try { window.Studio936SuiteProChart?.setFocusSection?.(part.section, { label: part.label || labelFor(part.section) }); } catch(_) {}
      }
      saveState();
      renderAgain(ctx);
    };
    rowActions.appendChild(zoomBtn);

    // Cambio 48: en Zoom sección, la barra del canal solo deja los controles principales.
    // Las herramientas grandes viven abajo en la consola ampliada para evitar duplicados.
    if (isFocus) {
      line.appendChild(rowActions);
      row.appendChild(line);
      return row;
    }

    // ✍ Letra por compás — placeholder visible para el próximo módulo
    const lyricBtn = ctx.el("button", "s936-ckpt-row-action lyric");
    lyricBtn.innerHTML = "Ly";
    lyricBtn.title = "Letra por compás / karaoke — próximo cambio";
    lyricBtn.onclick = (e) => {
      e.stopPropagation();
      openSectionLyricsEditor(ctx, s, part, parts);
    };
    rowActions.appendChild(lyricBtn);

    // 🎙 REC futuro
    const recBtn = ctx.el("button", "s936-ckpt-row-action rec");
    recBtn.innerHTML = "REC";
    recBtn.title = "REC sección — futuro";
    recBtn.onclick = (e) => {
      e.stopPropagation();
      alert("REC por sección vendrá después de consolidar el Chart y lyrics.");
    };
    rowActions.appendChild(recBtn);

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

    // Cambio 39 · Mover sección como micro-stepper vertical para ahorrar espacio
    const moveWrap = ctx.el("div", "s936-ckpt-move-stepper");
    const upBtn = ctx.el("button", "s936-ckpt-move-mini up");
    upBtn.innerHTML = "˄";
    upBtn.title = "Subir sección";
    upBtn.onclick = (e) => { e.stopPropagation(); move(parts, index, -1, ctx); };

    const downBtn = ctx.el("button", "s936-ckpt-move-mini down");
    downBtn.innerHTML = "˅";
    downBtn.title = "Bajar sección";
    downBtn.onclick = (e) => { e.stopPropagation(); move(parts, index, 1, ctx); };

    moveWrap.append(upBtn, downBtn);
    rowActions.appendChild(moveWrap);

    // ⚙ Gear dropdown — Duplicar, Renombrar, Quitar
    const gearWrap = ctx.el("div", "s936-ckpt-row-gear");
    const gearBtn = ctx.el("button", "s936-ckpt-row-btn");
    gearBtn.innerHTML = "⋯";
    gearBtn.title = "Más opciones";

    const rowDD = ctx.el("div", "s936-ckpt-row-dd");

    const ddDup = ctx.el("button", "s936-ckpt-row-dd-item warn", "⧉ Duplicar");
    ddDup.onclick = () => { rowDD.classList.remove("open"); duplicatePart(ctx, s, parts, index); };

    const ddRen = ctx.el("button", "s936-ckpt-row-dd-item", "✎ Renombrar");
    ddRen.onclick = () => { rowDD.classList.remove("open"); renameVisible(ctx, parts, index); };

    const ddSep = ctx.el("div", "s936-ckpt-row-dd-sep");

    const ddDel = ctx.el("button", "s936-ckpt-row-dd-item danger", "✕ Quitar");
    ddDel.onclick = () => { rowDD.classList.remove("open"); deleteFromArrangement(ctx, parts, index); };

    rowDD.append(ddDup, ddRen, ddSep, ddDel);

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
      // Modal flotante — se monta en body, no inline
      renderPartEditor(ctx, s, parts, part, index, items);
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

  // v4.4 — Modal flotante de edición de parte
  function renderPartEditor(ctx, s, parts, part, index, items) {
    // No retorna nada inline — monta el modal en body
    openPartModal(ctx, s, parts, part, index, items);
    return null;
  }

  function openPartModal(ctx, s, parts, part, index, items) {
    // Cerrar modal anterior si existe
    document.getElementById("s936-part-modal-overlay")?.remove();

    const type = part.type || baseType(part.section) || "verse";

    const overlay = document.createElement("div");
    overlay.id = "s936-part-modal-overlay";

    const modal = document.createElement("div");
    modal.id = "s936-part-modal";

    // ── HEAD ──
    const head = document.createElement("div");
    head.className = "s936-modal-head";

    const badge = document.createElement("span");
    badge.className = "s936-modal-badge";
    badge.textContent = badgeLabel(type);
    badge.setAttribute("style", badgeStyle(type));

    const titleEl = document.createElement("div");
    titleEl.className = "s936-modal-title";
    titleEl.textContent = part.label || labelFor(part.section);

    const closeBtn = document.createElement("button");
    closeBtn.className = "s936-modal-close";
    closeBtn.innerHTML = "✕";
    closeBtn.title = "Cerrar";
    closeBtn.onclick = () => {
      overlay.remove();
      state.editingIndex = -1;
      saveState();
      renderAgain(ctx);
    };

    head.append(badge, titleEl, closeBtn);
    modal.appendChild(head);

    // ── BODY ──
    const body = document.createElement("div");
    body.className = "s936-modal-body";

    // -- Bloque 1: Identidad --
    const b1 = modalBlock("Identidad");
    const b1body = b1.querySelector(".s936-modal-block-body");
    b1body.classList.add("s936-modal-row");

    const nameF = modalField("Nombre visible");
    const nameInput = document.createElement("input");
    nameInput.className = "s936-modal-input";
    nameInput.value = part.label || labelFor(part.section);
    nameInput.oninput = () => titleEl.textContent = nameInput.value || part.label;
    nameF.appendChild(nameInput);

    const typeF = modalField("Tipo");
    const typeSelect = document.createElement("select");
    typeSelect.className = "s936-modal-select";
    PART_OPTIONS.forEach(([v, l]) => {
      const opt = document.createElement("option");
      opt.value = v; opt.textContent = l;
      if (v === type) opt.selected = true;
      typeSelect.appendChild(opt);
    });
    typeF.appendChild(typeSelect);
    b1body.append(nameF, typeF);
    body.appendChild(b1);

    // -- Bloque 2: Métrica --
    const b2 = modalBlock("Métrica");
    const b2body = b2.querySelector(".s936-modal-block-body");
    b2body.classList.add("s936-modal-row", "three");

    const barsF = modalField("Compases");
    const barsInput = document.createElement("input");
    barsInput.className = "s936-modal-input";
    barsInput.type = "number"; barsInput.min = "1"; barsInput.max = "128";
    barsInput.value = String(Math.max(1, Number(part.bars) || inferredBars(s, part.section)));
    barsF.appendChild(barsInput);

    const timeSigF = modalField("Compás");
    const timeSigSelect = document.createElement("select");
    timeSigSelect.className = "s936-modal-select";
    [["4/4","4/4"],["3/4","3/4"],["6/8","6/8"],["5/4","5/4"],["7/8","7/8"],["2/4","2/4"],["12/8","12/8"]]
      .forEach(([v,l]) => {
        const opt = document.createElement("option");
        opt.value = v; opt.textContent = l;
        if (v === (part.timeSig || "4/4")) opt.selected = true;
        timeSigSelect.appendChild(opt);
      });
    timeSigF.appendChild(timeSigSelect);

    const bpmF = modalField("BPM propio");
    const bpmInput = document.createElement("input");
    bpmInput.className = "s936-modal-input bpm";
    bpmInput.type = "number"; bpmInput.min = "40"; bpmInput.max = "220";
    bpmInput.value = String(part.bpm || "");
    bpmInput.placeholder = "Global";
    bpmF.appendChild(bpmInput);

    b2body.append(barsF, timeSigF, bpmF);
    body.appendChild(b2);

    // -- Bloque 3: Repetición --
    const b3 = modalBlock("Repetición");
    const b3body = b3.querySelector(".s936-modal-block-body");

    const repsF = modalField("Repetir N veces");
    const repsInput = document.createElement("input");
    repsInput.className = "s936-modal-input";
    repsInput.type = "number"; repsInput.min = "1"; repsInput.max = "8";
    repsInput.value = String(part.repeat || 1);
    repsF.appendChild(repsInput);
    b3body.appendChild(repsF);
    body.appendChild(b3);

    // -- Bloque 4: Marcas de navegación --
    const b4 = modalBlock("Marcas de navegación");
    const b4body = b4.querySelector(".s936-modal-block-body");
    const marksWrap = document.createElement("div");
    marksWrap.className = "s936-modal-marks";
    const marks = [
      ["segno", "§ Segno"],
      ["coda",  "⊕ Coda"],
      ["fine",  "Fine"],
      ["dacapo","Da Capo"],
      ["dalsegno","Dal Segno"],
      ["bis",   "Bis"],
    ];
    const activeMark = part.navMark || "";
    marks.forEach(([key, label]) => {
      const btn = document.createElement("button");
      btn.className = "s936-modal-mark" + (activeMark === key ? " active" : "");
      btn.textContent = label;
      btn.onclick = () => {
        marksWrap.querySelectorAll(".s936-modal-mark").forEach(b => b.classList.remove("active"));
        if (activeMark === key) {
          btn.classList.remove("active");
          btn._selected = false;
        } else {
          btn.classList.add("active");
          btn._selected = true;
        }
        marksWrap._active = btn._selected ? key : "";
      };
      marksWrap.appendChild(btn);
    });
    marksWrap._active = activeMark;
    b4body.appendChild(marksWrap);
    body.appendChild(b4);

    // -- Bloque 5: Nota de producción --
    const b5 = modalBlock("Nota de producción");
    const b5body = b5.querySelector(".s936-modal-block-body");
    const noteArea = document.createElement("textarea");
    noteArea.className = "s936-modal-textarea";
    noteArea.placeholder = "Instrucciones para músicos, dinámica, carácter...";
    noteArea.value = part.note || "";
    b5body.appendChild(noteArea);
    body.appendChild(b5);

    modal.appendChild(body);

    // ── FOOTER ──
    const foot = document.createElement("div");
    foot.className = "s936-modal-foot";

    const saveBtn = document.createElement("button");
    saveBtn.className = "s936-modal-btn save";
    saveBtn.textContent = "✓ Guardar en borrador";
    saveBtn.onclick = () => {
      const label = (nameInput.value || labelFor(part.section)).trim();
      const bars  = Math.max(1, Number(barsInput.value) || 8);
      part.label   = label;
      part.bars    = bars;
      part.type    = typeSelect.value;
      part.timeSig = timeSigSelect.value;
      part.bpm     = bpmInput.value ? Number(bpmInput.value) : undefined;
      part.repeat  = Math.max(1, Number(repsInput.value) || 1);
      part.navMark = marksWrap._active || "";
      part.note    = noteArea.value.trim();
      state.draft.parts[index] = part;
      state.editingIndex = -1;
      saveState();
      overlay.remove();
      renderAgain(ctx);
      toast(ctx, "Sección actualizada en el borrador.");
    };

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "s936-modal-btn cancel";
    cancelBtn.textContent = "Cancelar";
    cancelBtn.onclick = () => {
      overlay.remove();
      state.editingIndex = -1;
      saveState();
      renderAgain(ctx);
    };

    foot.append(saveBtn, cancelBtn);
    modal.appendChild(foot);

    // Cerrar al click en overlay
    overlay.onclick = (e) => { if (e.target === overlay) cancelBtn.onclick(); };
    // Cerrar con Escape
    const escHandler = (e) => { if (e.key === "Escape") { cancelBtn.onclick(); document.removeEventListener("keydown", escHandler); } };
    document.addEventListener("keydown", escHandler);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  function modalBlock(title) {
    const block = document.createElement("div");
    block.className = "s936-modal-block";
    const head = document.createElement("div");
    head.className = "s936-modal-block-head";
    head.textContent = title;
    const body = document.createElement("div");
    body.className = "s936-modal-block-body";
    block.append(head, body);
    return block;
  }

  function modalField(label) {
    const wrap = document.createElement("div");
    wrap.className = "s936-modal-field";
    const lbl = document.createElement("label");
    lbl.textContent = label;
    wrap.appendChild(lbl);
    return wrap;
  }


  function exportMusicXML(ctx, s, parts) {
    try {
      const meta = state.draft.meta || {};
      const title = meta.title || "Canción";
      const bpm = meta.bpm || 95;
      let measures = "";
      let measureNum = 1;
      parts.forEach(part => {
        const bars = Math.max(1, Number(part.bars) || 4);
        const timeSig = part.timeSig || "4/4";
        const [beats, beatType] = timeSig.split("/");
        const items = draftOrLiveItems(s, part.section);
        for (let b = 0; b < bars; b++) {
          const chord = items[b % Math.max(1, items.length)];
          const chordName = chord?.name || chord?.chord || "";
          measures += `    <measure number="${measureNum}">
      <direction><direction-type><words>${b === 0 ? part.label || "" : ""}</words></direction-type></direction>
      ${b === 0 ? `<attributes><divisions>4</divisions><time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time></attributes>` : ""}
      <harmony><root><root-step>${chordName.replace(/[^A-G]/,"") || "C"}</root-step></root><kind>${chordName.includes("m") ? "minor" : "major"}</kind></harmony>
      <note><rest/><duration>16</duration><type>whole</type></note>
    </measure>
`;
          measureNum++;
        }
      });
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN"
  "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <work><work-title>${title}</work-title></work>
  <identification><encoding><software>Studio 936 Composer</software></encoding></identification>
  <part-list><score-part id="P1"><part-name>Chord Chart</part-name></score-part></part-list>
  <part id="P1">
${measures}  </part>
</score-partwise>`;
      const blob = new Blob([xml], { type:"application/vnd.recordare.musicxml+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const slug = title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"") || "cancion";
      a.href = url; a.download = `studio936-${slug}.musicxml`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast(ctx, "Exportado como MusicXML.");
    } catch(e) { toast(ctx, "Error al exportar MusicXML."); console.warn(e); }
  }


  // ── Storage Service v1 · Local (futuro: Cloudflare Pro) ──
  const LS_DIR_KEY = "s936_library_dir_name";
  const LS_SONGS_KEY = "s936_library_songs_v1";
  let _dirHandle = null; // FileSystemDirectoryHandle en memoria

  async function getLibraryDirHandle() {
    // Devuelve el handle si está en memoria o si el user lo re-verifica
    if (_dirHandle) {
      try { await _dirHandle.requestPermission({ mode: "readwrite" }); return _dirHandle; } catch(_) {}
    }
    return null;
  }

  async function saveToLibraryDir(ctx, s, parts) {
    const payload = structurePayload(ctx, s, parts);
    const meta = payload.meta || {};
    const slug = String(meta.title || "cancion")
      .toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"")
      .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"") || "cancion";
    const filename = `studio936-${slug}.json`;
    const json = JSON.stringify(payload, null, 2);

    // 1. Intentar con carpeta configurada (File System Access API)
    const dirHandle = await getLibraryDirHandle();
    if (dirHandle && window.FileSystemFileHandle) {
      try {
        const fh = await dirHandle.getFileHandle(filename, { create: true });
        const writable = await fh.createWritable();
        await writable.write(json);
        await writable.close();
        // Guardar también en localStorage como backup
        saveToLocalLib(payload);
        toast(ctx, `Guardado en carpeta: ${filename}`);
        return;
      } catch(e) { console.warn("FileSystem write error:", e); }
    }

    // 2. Fallback: localStorage + descarga
    saveToLocalLib(payload);
    // Descarga automática
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast(ctx, "Guardado en librería local.");
  }

  function saveToLocalLib(payload) {
    try {
      const list = JSON.parse(localStorage.getItem(LS_SONGS_KEY) || "[]");
      const existing = list.findIndex(x => x.id === payload.meta?.title);
      const entry = {
        id: payload.meta?.title || Date.now().toString(36),
        title: payload.meta?.title || "Sin título",
        style: payload.meta?.style || "",
        bpm: payload.meta?.bpm || 95,
        parts: payload.parts?.length || 0,
        savedAt: new Date().toISOString(),
        payload
      };
      if (existing >= 0) list[existing] = entry;
      else list.unshift(entry);
      localStorage.setItem(LS_SONGS_KEY, JSON.stringify(list.slice(0, 80)));
    } catch(e) {}
  }

  function openLibraryConfig(ctx) {
    // Cerrar modal anterior
    document.getElementById("s936-lib-config-overlay")?.remove();

    const dirName = localStorage.getItem(LS_DIR_KEY) || "";
    const hasApi = !!window.showDirectoryPicker;

    const overlay = document.createElement("div");
    overlay.id = "s936-lib-config-overlay";
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;";

    const modal = document.createElement("div");
    modal.style.cssText = "background:#0d1117;border:1px solid rgba(0,255,204,.35);border-radius:16px;width:100%;max-width:400px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.9);";

    // Head
    const head = document.createElement("div");
    head.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(0,255,204,.04);";
    head.innerHTML = `<span style="font-size:.82rem;font-weight:700;color:#00ffcc;">⚙ Configurar librería</span>`;
    const closeX = document.createElement("button");
    closeX.innerHTML = "✕";
    closeX.style.cssText = "background:none;border:none;color:rgba(255,255,255,.5);cursor:pointer;font-size:.9rem;";
    closeX.onclick = () => overlay.remove();
    head.appendChild(closeX);
    modal.appendChild(head);

    // Body
    const body = document.createElement("div");
    body.style.cssText = "padding:16px;display:flex;flex-direction:column;gap:12px;";

    // Estado actual
    const status = document.createElement("div");
    status.style.cssText = "background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:10px;padding:10px 12px;font-size:.72rem;color:rgba(255,255,255,.65);line-height:1.5;";
    status.innerHTML = dirName
      ? `<span style="color:#00ffcc;">✓ Carpeta configurada:</span><br><span style="color:#fff;font-weight:700;">${dirName}</span>`
      : `<span style="color:rgba(255,255,255,.4);">Sin carpeta configurada. Se usará localStorage + descarga automática.</span>`;
    body.appendChild(status);

    if (hasApi) {
      const pickBtn = document.createElement("button");
      pickBtn.style.cssText = "background:rgba(0,255,204,.1);border:1px solid rgba(0,255,204,.4);border-radius:10px;color:#00ffcc;font-size:.72rem;font-weight:900;padding:10px;cursor:pointer;text-transform:uppercase;letter-spacing:.5px;";
      pickBtn.textContent = "📁 Seleccionar carpeta";
      pickBtn.onclick = async () => {
        try {
          const handle = await window.showDirectoryPicker({ mode: "readwrite" });
          _dirHandle = handle;
          localStorage.setItem(LS_DIR_KEY, handle.name);
          status.innerHTML = `<span style="color:#00ffcc;">✓ Carpeta configurada:</span><br><span style="color:#fff;font-weight:700;">${handle.name}</span>`;
          toast(ctx, `Carpeta configurada: ${handle.name}`);
        } catch(e) { if (e.name !== "AbortError") toast(ctx, "No se pudo acceder a la carpeta."); }
      };
      body.appendChild(pickBtn);

      const note = document.createElement("p");
      note.style.cssText = "font-size:.62rem;color:rgba(255,255,255,.35);line-height:1.5;margin:0;";
      note.textContent = "Chrome y Edge soportan selección de carpeta. Firefox usará descarga automática.";
      body.appendChild(note);
    } else {
      const note = document.createElement("p");
      note.style.cssText = "font-size:.65rem;color:rgba(255,200,100,.6);line-height:1.5;margin:0;background:rgba(255,200,100,.05);border:1px solid rgba(255,200,100,.15);border-radius:8px;padding:10px;";
      note.textContent = "Tu navegador no soporta selección de carpeta. Se usará localStorage + descarga automática al guardar.";
      body.appendChild(note);
    }

    // Separador Pro
    const sep = document.createElement("div");
    sep.style.cssText = "border-top:1px solid rgba(255,255,255,.07);padding-top:10px;";
    const proNote = document.createElement("p");
    proNote.style.cssText = "font-size:.62rem;color:rgba(180,100,255,.6);line-height:1.5;margin:0;";
    proNote.innerHTML = "🚀 <b style='color:#cc99ff'>Studio 936 Pro</b> · Guardado en nube multi-dispositivo. Próximamente.";
    sep.appendChild(proNote);
    body.appendChild(sep);

    modal.appendChild(body);
    overlay.appendChild(modal);
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
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
    // Limpiar dropdown del body antes de re-renderizar
    document.getElementById("s936CkptDropdown")?.remove();
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
