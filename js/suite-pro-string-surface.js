// Studio 936 Composer - Shared String Instrument Surface v1.8.4 · QC Final Exact Edit
// Renders Guitar, Ukulele and Bass as one live surface for Main and Editor.
window.Studio936StringSurface = (() => {
  "use strict";

  const MODE_LABELS = {
    play: "Tocar",
    map: "Mapa",
    chord: "Acorde"
  };
  let interactionMode = "play";

  try {
    const saved = window.localStorage?.getItem?.("s936-string-mode");
    if (["play","map","chord"].includes(saved)) interactionMode = saved;
  } catch (_) {}

  function setInteractionMode(mode) {
    interactionMode = ["play","map","chord"].includes(String(mode)) ? String(mode) : "play";
    try { window.localStorage?.setItem?.("s936-string-mode", interactionMode); } catch (_) {}
    updateModeButtons();
    clearTransient();
    return interactionMode;
  }

  function updateModeButtons(root=document) {
    root.querySelectorAll?.("#s936EditorGuitarSurface .s936-mode-button").forEach(button => {
      button.classList.toggle("active", button.dataset.mode === interactionMode);
    });
    const surface = document.getElementById("s936EditorGuitarSurface");
    if (surface) surface.dataset.interactionMode = interactionMode;
  }

  const TRANSIENT_CLASSES = [
    "s936-live-hit",
    "s936-map-hit",
    "s936-slide-hit",
    "s936-bend-hit",
    "s936-strum-hit",
    "active-chord"
  ];

  function clearTransient(root=document){
    root.querySelectorAll?.("#s936EditorGuitarSurface .s936-neck-cell").forEach(cell => {
      TRANSIENT_CLASSES.forEach(cls => cell.classList.remove(cls));
    });
  }

  function clamp(value,min,max){
    const n = Number(value);
    return Math.max(min,Math.min(max,Number.isFinite(n)?n:min));
  }

  function noteName(midi){
    const names = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
    const n = Math.round(Number(midi));
    return `${names[((n%12)+12)%12]}${Math.floor(n/12)-1}`;
  }

  function installStyles(){
    if(document.getElementById("s936StringSurfaceLiveStyles")) return;
    const style = document.createElement("style");
    style.id = "s936StringSurfaceLiveStyles";
    style.textContent = `
      #fretboardContainer.s936-main-string-surface-active{
        display:block!important;
        overflow:hidden!important;
        padding:0!important;
        background:#050707!important;
      }
      #fretboardContainer.s936-main-string-surface-active > *:not(#s936EditorGuitarSurface){
        display:none!important;
      }
      #s936EditorGuitarSurface{
        display:flex;
        flex-direction:column;
        gap:11px;
        box-sizing:border-box;
        width:100%;
        min-height:100%;
        padding:14px;
        background:radial-gradient(circle at 48% 28%,rgba(0,255,204,.045),transparent 38%),#050707;
        color:#fff;
      }
      #s936EditorGuitarSurface .s936-neck-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:2px 2px 0}
      #s936EditorGuitarSurface .s936-neck-title{color:#8affff;font-size:.76rem;font-weight:950;text-transform:uppercase;letter-spacing:.8px}
      #s936EditorGuitarSurface .s936-neck-meta{margin-top:4px;color:#ffe066;font-size:.65rem;font-weight:900}
      #s936EditorGuitarSurface .s936-neck-help{max-width:470px;color:rgba(255,255,255,.68);font-size:.62rem;line-height:1.4;text-align:right}
      #s936EditorGuitarSurface .s936-mode-bar{display:flex;align-items:center;justify-content:flex-end;gap:5px;flex-wrap:wrap;margin-top:7px}
      #s936EditorGuitarSurface .s936-mode-label{color:rgba(255,255,255,.50);font-size:.52rem;font-weight:900;text-transform:uppercase;letter-spacing:.7px}
      #s936EditorGuitarSurface .s936-mode-button{border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(255,255,255,.045);color:#fff;padding:5px 9px;font-size:.55rem;font-weight:950;cursor:pointer}
      #s936EditorGuitarSurface .s936-mode-button.active{border-color:#00ffcc;background:rgba(0,255,204,.16);color:#00ffcc;box-shadow:0 0 0 1px rgba(0,255,204,.12) inset}
      #s936EditorGuitarSurface .s936-neck-cell.s936-map-hit{background:rgba(255,216,77,.23)!important;box-shadow:inset 0 0 0 1px rgba(255,216,77,.55),0 0 14px rgba(255,216,77,.22)}
      #s936EditorGuitarSurface .s936-neck-cell.s936-slide-hit{background:rgba(0,153,255,.28)!important;box-shadow:inset 0 0 0 2px rgba(0,153,255,.65),0 0 18px rgba(0,153,255,.28)}
      #s936EditorGuitarSurface .s936-neck-cell.s936-bend-hit{background:rgba(255,91,234,.30)!important;box-shadow:inset 0 0 0 2px rgba(255,91,234,.72),0 0 18px rgba(255,91,234,.34);transform:translateY(-1px)}
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
      #s936EditorGuitarSurface .s936-finger-pop button.clear{border-color:rgba(255,90,90,.5);color:#ffb9b9}
      #s936EditorGuitarSurface .s936-chart-zone{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.10);border-radius:16px;background:rgba(255,255,255,.022);padding:9px}
      #s936EditorGuitarSurface .s936-chart-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:7px}
      #s936EditorGuitarSurface .s936-chart-head b{color:#ffe066;font-size:.66rem;text-transform:uppercase;letter-spacing:.7px}
      #s936EditorGuitarSurface .s936-chart-head span{color:rgba(255,255,255,.52);font-size:.55rem}
      #s936EditorGuitarSurface .s936-chart-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(108px,128px));justify-content:center;gap:7px;width:100%;padding-bottom:3px}
      #s936EditorGuitarSurface .s936-chart-card{border:1px solid rgba(255,255,255,.11);border-radius:12px;background:rgba(0,0,0,.24);color:#fff;padding:7px;cursor:pointer;text-align:left}
      #s936EditorGuitarSurface .s936-chart-card.active{border-color:#00ffcc;background:rgba(0,255,204,.08);box-shadow:0 0 0 1px rgba(0,255,204,.12) inset}
      #s936EditorGuitarSurface .s936-chart-name{display:block;color:#fff;font-size:.58rem;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #s936EditorGuitarSurface .s936-chart-meta{display:block;color:#ffe066;font-size:.46rem;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #s936EditorGuitarSurface .s936-mini-chart{height:62px;margin-top:6px;position:relative;border-top:2px solid rgba(255,255,255,.62);background:repeating-linear-gradient(to bottom,transparent 0,transparent 11px,rgba(255,255,255,.20) 12px),repeating-linear-gradient(to right,transparent 0,transparent 13px,rgba(255,255,255,.22) 14px)}
      #s936EditorGuitarSurface .s936-mini-dot{position:absolute;width:12px;height:12px;border-radius:50%;background:#00ffcc;color:#00231e;font-size:.36rem;font-weight:950;display:flex;align-items:center;justify-content:center;transform:translate(-50%,-50%)}
      #s936EditorGuitarSurface .s936-mini-open{position:absolute;top:-15px;font-size:.42rem;color:#bfffee;transform:translateX(-50%)}
      #s936EditorGuitarSurface .s936-mini-muted{position:absolute;top:-15px;font-size:.42rem;color:#ffb9b9;transform:translateX(-50%)}
      #s936EditorGuitarSurface .s936-chart-empty{height:62px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.40);font-size:.50rem;text-align:center}
      @media(max-width:760px){
        #s936EditorGuitarSurface{padding:8px}
        #s936EditorGuitarSurface .s936-neck-head{display:block}
        #s936EditorGuitarSurface .s936-neck-help{text-align:left;margin-top:6px}
      }
      #s936EditorGuitarSurface .s936-neck-cell.s936-live-hit,
      #s936EditorGuitarSurface .s936-neck-cell.s936-strum-hit{
        background:rgba(0,255,204,.20)!important;
        border-color:rgba(0,255,204,.78)!important;
        box-shadow:0 0 0 1px rgba(0,255,204,.42),0 0 24px rgba(0,255,204,.28)!important;
        color:#eafffb!important;
      }
      #s936EditorGuitarSurface .s936-neck-cell.s936-live-hit::after,
      #s936EditorGuitarSurface .s936-neck-cell.s936-strum-hit::after{
        content:"";
        position:absolute;
        left:8px;
        right:8px;
        top:50%;
        height:3px;
        border-radius:999px;
        background:rgba(255,216,77,.9);
        box-shadow:0 0 14px rgba(255,216,77,.65);
        transform:translateY(-50%);
        pointer-events:none;
      }
      #s936EditorGuitarSurface .s936-neck-cell.open.s936-live-hit,
      #s936EditorGuitarSurface .s936-neck-cell.open.s936-strum-hit{
        color:#00110e!important;
        background:#00ffcc!important;
      }
    `;
    document.head.appendChild(style);
  }

  function flashCells(cells,cls="s936-live-hit",duration=190){
    const targets = Array.from(cells || []).filter(Boolean);
    targets.forEach(cell => cell.classList.add(cls));
    setTimeout(() => targets.forEach(cell => cell.classList.remove(cls)), duration);
    return targets.length;
  }

  function flashMidis(midis,cls="s936-live-hit",duration=190){
    const wanted = (Array.isArray(midis) ? midis : [midis])
      .map(Number)
      .filter(Number.isFinite)
      .map(Math.round);
    if(!wanted.length) return 0;

    const surface = document.getElementById("s936EditorGuitarSurface");
    if(!surface) return 0;

    // Modo Mapa = teoría: mostrar todas las posiciones equivalentes.
    // Modo Tocar/Acorde = instrumento real: una posición exacta por nota.
    if(interactionMode === "map" || cls === "s936-map-hit"){
      const all = Array.from(surface.querySelectorAll("[data-midi]"))
        .filter(cell => wanted.includes(Math.round(Number(cell.dataset.midi))));
      return flashCells(all,cls,duration);
    }

    const selected = [];
    wanted.forEach(midi => {
      const exact = Array.from(surface.querySelectorAll(
        `.s936-neck-cell.on[data-midi="${midi}"],.s936-neck-cell.open.active[data-midi="${midi}"]`
      ));
      if(exact.length){
        selected.push(exact[0]);
        return;
      }
      const single = surface.querySelector(
        `.s936-neck-cell[data-midi="${midi}"]:not(.capoblocked),.s936-neck-cell.open[data-midi="${midi}"]`
      );
      if(single) selected.push(single);
    });

    return flashCells(selected,cls,duration);
  }

  function flashPosition(stringIndex,physicalFret,cls="s936-live-hit",duration=190){
    const selector = `#s936EditorGuitarSurface [data-string-index="${Number(stringIndex)}"][data-physical-fret="${Number(physicalFret)}"]`;
    return flashCells(document.querySelectorAll(selector),cls,duration);
  }

  function positionSelector(stringIndex,physicalFret){
    return `#s936EditorGuitarSurface [data-string-index="${Number(stringIndex)}"][data-physical-fret="${Number(physicalFret)}"]`;
  }

  function flashStringEvents(events,cls="s936-live-hit",duration=190,interval=0){
    const list = Array.isArray(events) ? events : [events];
    let total = 0;
    list.filter(Boolean).forEach((event,index) => {
      const run = () => {
        const stringIndex = Number(event.stringIndex ?? event.index);
        const physicalFret = Number(event.physicalFret ?? event.fret);
        if(Number.isFinite(stringIndex) && Number.isFinite(physicalFret)){
          const count = flashPosition(stringIndex,physicalFret,cls,duration);
          if(count) { total += count; return; }
        }
        if(Number.isFinite(Number(event.midi))) total += flashMidis([Number(event.midi)],cls,duration);
      };
      if(interval > 0) setTimeout(run,Math.max(0,index * interval));
      else run();
    });
    return total;
  }

  function cellPayloadFromNode(node,instrument,fallback={}){
    if(!node) return null;
    const midi = Number(node.dataset.midi);
    if(!Number.isFinite(midi)) return null;
    const stringIndex = Number(node.dataset.stringIndex);
    const physicalFret = Number(node.dataset.physicalFret);
    return Object.assign({},fallback,{
      instrument: instrument || fallback.instrument,
      midi,
      note: noteName(midi),
      stringIndex,
      physicalFret,
      fret: Math.max(0,physicalFret - (Number(fallback.capo) || 0)),
      open: node.classList.contains("open"),
      maxFret: Number(fallback.maxFret) || 24,
      capo: Number(fallback.capo) || 0
    });
  }

  function activeCellForString(surface,stringIndex){
    if(!surface || !Number.isFinite(Number(stringIndex))) return null;
    const selector = [
      `.s936-neck-cell.on[data-string-index="${Number(stringIndex)}"][data-midi]`,
      `.s936-neck-cell.open.active[data-string-index="${Number(stringIndex)}"][data-midi]`
    ].join(",");
    return surface.querySelector(selector);
  }

  function neckCellFromPoint(x,y,surface){
    if(typeof document.elementFromPoint !== "function") return null;
    const raw = document.elementFromPoint(Number(x)||0,Number(y)||0);
    const cell = raw?.closest?.("#s936EditorGuitarSurface .s936-neck-cell[data-midi]");
    if(!cell || (surface && !surface.contains(cell))) return null;
    return cell;
  }

  function startExpressionGesture(pointerEvent,cell,payload,onCellPlay,surface){
    if(!pointerEvent || !cell || typeof onCellPlay !== "function") return;
    const pointerId = pointerEvent.pointerId;
    const startX = Number(pointerEvent.clientX) || 0;
    const startY = Number(pointerEvent.clientY) || 0;
    const startFret = Number(payload.physicalFret);
    const maxFret = Math.max(0,Number(payload.maxFret) || 24);
    const capo = Math.max(0,Number(payload.capo) || 0);
    const stringIndex = Number(payload.stringIndex);
    const startMidi = Number(payload.midi);
    let lastFret = startFret;
    let lastBend = 0;
    let lastStrummedString = stringIndex;
    let strumCount = 0;
    try { cell.setPointerCapture?.(pointerId); } catch (_) {}

    function emitSlide(targetFret){
      if(strumCount > 0) return;
      if(!Number.isFinite(targetFret) || targetFret === lastFret) return;
      lastFret = targetFret;
      const target = surface?.querySelector?.(`[data-string-index="${stringIndex}"][data-physical-fret="${targetFret}"]`);
      clearTransient(surface);
      if(target) flashCells([target],"s936-slide-hit",210);
      const targetMidi = startMidi + (targetFret - startFret);
      const relativeFret = Math.max(0,targetFret-capo);
      if(surface?.dataset?.owner !== "main" && interactionMode !== "map"){
        editorCall("externalSetFret",stringIndex,relativeFret);
      }
      onCellPlay(Object.assign({},payload,{
        gesture:"slide",
        fromMidi:startMidi,
        midi:targetMidi,
        physicalFret:targetFret,
        fret:relativeFret
      }));
    }

    function emitBend(semitones){
      if(strumCount > 0) return;
      const bend = Math.max(0,Math.min(2,Number(semitones)||0));
      if(bend === lastBend) return;
      lastBend = bend;
      if(bend <= 0) return;
      clearTransient(surface);
      flashCells([cell],"s936-bend-hit",220);
      onCellPlay(Object.assign({},payload,{
        gesture:"bend",
        bendSemitones:bend,
        fromMidi:startMidi,
        midi:startMidi + bend
      }));
    }

    function emitStrum(targetCell,clientY){
      const targetString = Number(targetCell?.dataset?.stringIndex);
      if(!Number.isFinite(targetString) || targetString === lastStrummedString) return false;
      lastStrummedString = targetString;
      const active = activeCellForString(surface,targetString);
      if(!active) return false;
      const node = active;
      const eventPayload = cellPayloadFromNode(node,payload.instrument,payload);
      if(!eventPayload) return false;
      const direction = (Number(clientY)||0) >= startY ? "down" : "up";
      if(strumCount === 0) clearTransient(surface);
      flashCells([node],"s936-strum-hit",250);
      onCellPlay(Object.assign({},eventPayload,{
        gesture:"strum",
        strumDirection:direction,
        source:"vertical-drag"
      }));
      strumCount += 1;
      return true;
    }

    function move(event){
      if(event.pointerId !== pointerId) return;
      const x = Number(event.clientX) || 0;
      const y = Number(event.clientY) || 0;
      const dx = x - startX;
      const dyFromStart = y - startY;
      const dyUp = startY - y;
      const targetCell = neckCellFromPoint(x,y,surface);
      const strummed = targetCell ? emitStrum(targetCell,y) : false;

      if(!strummed && Math.abs(dx) > 26 && Number.isFinite(startFret) && Math.abs(dx) >= Math.abs(dyFromStart)){
        const shift = Math.round(dx / 44);
        const targetFret = clamp(startFret + shift, capo, maxFret);
        emitSlide(targetFret);
      }
      if(!strummed && dyUp > 24 && Math.abs(dx) < 34) emitBend(Math.ceil(Math.min(2,dyUp / 42)));
      event.preventDefault?.();
    }

    function end(event){
      if(event.pointerId !== pointerId) return;
      document.removeEventListener("pointermove",move);
      document.removeEventListener("pointerup",end);
      document.removeEventListener("pointercancel",end);
      try { cell.releasePointerCapture?.(pointerId); } catch (_) {}
    }

    document.addEventListener("pointermove",move,{passive:false});
    document.addEventListener("pointerup",end,{passive:true});
    document.addEventListener("pointercancel",end,{passive:true});
  }

  function emitCellInteraction(event,cell,payload,onCellPlay,surface){
    if(event?.preventDefault) event.preventDefault();
    const enriched = Object.assign({gesture:"tap",visualMode:interactionMode},payload);
    clearTransient(surface);
    flashCells([cell],"s936-live-hit",220);

    // En Editor, Modo Tocar debe escribir la cuerda/traste inmediatamente.
    // Antes dependía del evento click; en touch/iPad podía quedarse solo en luz.
    if(surface?.dataset?.owner !== "main" && interactionMode === "play"){
      const relativeFret = payload.fret === null || String(payload.fret).toUpperCase?.() === "X"
        ? null
        : Math.max(0,Number(payload.fret)||0);
      if(Number.isFinite(Number(payload.stringIndex))){
        editorCall("externalSetFret",Number(payload.stringIndex),relativeFret);
      }
    }

    if(interactionMode === "map") flashMidis([payload.midi],"s936-map-hit",560);
    if(interactionMode === "chord") {
      const chordEvents = Array.from(surface?.querySelectorAll?.(".s936-neck-cell.on[data-midi],.s936-neck-cell.open.active[data-midi]") || [])
        .map(node => cellPayloadFromNode(node,payload.instrument,payload))
        .filter(Boolean)
        .sort((a,b) => Number(a.stringIndex) - Number(b.stringIndex));
      if(chordEvents.length){
        flashStringEvents(chordEvents,"s936-strum-hit",240,34);
        if(typeof onCellPlay === "function"){
          chordEvents.forEach((chordEvent,index) => {
            setTimeout(() => onCellPlay(Object.assign({},chordEvent,{
              gesture:"strum",
              visualMode:interactionMode,
              source:"chord-mode"
            })), index * 34);
          });
        }
        startExpressionGesture(event,cell,enriched,onCellPlay,surface);
        return;
      }
    }
    if(typeof onCellPlay === "function") onCellPlay(enriched);
    startExpressionGesture(event,cell,enriched,onCellPlay,surface);
  }

  function editorCall(method,...args){
    const api = window.Studio936SuiteProEditor;
    if(!api || typeof api[method] !== "function") return false;
    try{
      api[method](...args);
      return true;
    }catch(error){
      console.warn("Studio936StringSurface:",method,error);
      return false;
    }
  }

  function clear(){
    document.querySelectorAll("#s936EditorGuitarSurface").forEach(node => node.remove());
    document.querySelectorAll(".s936-finger-pop").forEach(node => node.remove());
    document.getElementById("fretboardContainer")?.classList?.remove("s936-main-string-surface-active");
  }

  function showFingerPicker(surface,anchor,stringIndex){
    document.querySelectorAll(".s936-finger-pop").forEach(node => node.remove());
    if(!surface || !anchor) return;
    const picker = document.createElement("div");
    picker.className = "s936-finger-pop";
    picker.setAttribute("role","dialog");
    picker.setAttribute("aria-label","Seleccionar dedo");
    [["1","1"],["2","2"],["3","3"],["4","4"],["T","T"],["","×"]].forEach(([value,label]) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      if(!value) btn.classList.add("clear");
      btn.addEventListener("click",event => {
        event.stopPropagation();
        editorCall("externalSetFinger",stringIndex,value);
        picker.remove();
      });
      picker.appendChild(btn);
    });
    surface.appendChild(picker);
    const rect = anchor.getBoundingClientRect();
    const maxLeft = Math.max(8,window.innerWidth-225);
    picker.style.left = `${Math.max(8,Math.min(maxLeft,rect.left-20))}px`;
    picker.style.top = `${Math.max(8,Math.min(window.innerHeight-52,rect.bottom+6))}px`;
  }

  function voicingForItem(item,index,data,profile){
    if(index === data.chordIndex && Array.isArray(data.exactFrets)){
      return {
        frets:data.exactFrets,
        fingers:Array.isArray(data.exactStrings) ? data.exactStrings.map(string => string?.finger || "") : [],
        capo:data.capo || 0,
        shape:data.exactFrets.map(value => value === null ? "X" : String(value)).join("-")
      };
    }
    const preview = Array.isArray(data.seqVoicings) ? data.seqVoicings[index] : null;
    if(preview && Array.isArray(preview.frets) && preview.frets.length === profile.strings.length){
      return {
        frets:preview.frets.map(value => value === null || String(value).toUpperCase() === "X" ? null : clamp(Number(value)||0,0,profile.maxFret)),
        fingers:Array.isArray(preview.fingers) ? preview.fingers : [],
        capo:profile.allowCapo ? clamp(Number(preview.capo)||0,0,profile.capoMax) : 0,
        shape:preview.shape || preview.frets.map(value => value === null ? "X" : String(value)).join("-")
      };
    }
    const saved = item?.voicings?.[profile.id];
    if(!saved || !Array.isArray(saved.frets) || saved.frets.length !== profile.strings.length) return null;
    return {
      frets:saved.frets.map(value => value === null || String(value).toUpperCase() === "X" ? null : clamp(Number(value)||0,0,profile.maxFret)),
      fingers:Array.isArray(saved.fingers) ? saved.fingers : [],
      capo:profile.allowCapo ? clamp(Number(saved.capo)||0,0,profile.capoMax) : 0,
      shape:saved.shape || saved.frets.map(value => value === null ? "X" : String(value)).join("-")
    };
  }

  function renderMiniChart(card,voicing,profile){
    if(!voicing){
      const empty = document.createElement("div");
      empty.className = "s936-chart-empty";
      empty.textContent = "Sin digitación exacta guardada";
      card.appendChild(empty);
      return;
    }
    const chart = document.createElement("div");
    chart.className = "s936-mini-chart";
    chart.style.setProperty("--string-count",String(profile.strings.length));
    const positive = voicing.frets.filter(value => Number(value)>0).map(Number);
    const base = positive.length && Math.min(...positive)>4 ? Math.min(...positive) : 1;
    voicing.frets.forEach((fret,index) => {
      const x = ((index + .5) / profile.strings.length) * 100;
      if(fret === null){
        const mark = document.createElement("span");
        mark.className = "s936-mini-muted";
        mark.textContent = "×";
        mark.style.left = `${x}%`;
        chart.appendChild(mark);
        return;
      }
      if(Number(fret)===0){
        const mark = document.createElement("span");
        mark.className = "s936-mini-open";
        mark.textContent = "○";
        mark.style.left = `${x}%`;
        chart.appendChild(mark);
        return;
      }
      const rel = Number(fret)-base;
      if(rel<0 || rel>4) return;
      const dot = document.createElement("span");
      dot.className = "s936-mini-dot";
      dot.textContent = String(voicing.fingers[index] || "");
      dot.style.left = `${x}%`;
      dot.style.top = `${8 + rel*16}px`;
      chart.appendChild(dot);
    });
    card.appendChild(chart);
  }

  function render({container,data,profiles,sectionNames={},onCellPlay=null,onChordSelect=null,readOnly=false,owner="editor"}={}){
    installStyles();
    const instrument = data?.instrument;
    const isMainSurface = owner === "main" || data?.surfaceOwner === "main" || data?.surfaceMode === "main-practice";
    const profile = profiles?.[instrument];
    if(!container || !profile || !Array.isArray(data?.exactFrets) || data.exactFrets.length !== profile.strings.length){
      clear();
      return {ok:false};
    }

    let surface = document.getElementById("s936EditorGuitarSurface");
    if(!surface){
      surface = document.createElement("section");
      surface.id = "s936EditorGuitarSurface";
      container.appendChild(surface);
    }
    surface.dataset.instrument = instrument;
    surface.dataset.owner = isMainSurface ? "main" : "editor";

    // QC v0.7.1.8.4:
    // En Editor, la superficie siempre entra en Modo Tocar para editar cuerda/traste.
    // Mapa y Acorde quedan como acciones momentáneas, no como estado pegado entre renders.
    if(!isMainSurface && interactionMode !== "play") {
      interactionMode = "play";
      try { window.localStorage?.setItem?.("s936-string-mode", "play"); } catch (_) {}
    }

    container.classList.toggle("s936-main-string-surface-active", !!isMainSurface);
    container.classList.toggle("s936-editor-surface-active", !isMainSurface && container.classList.contains("s936-editor-surface-active"));
    surface.innerHTML = "";

    const head = document.createElement("div");
    head.className = "s936-neck-head";
    const identity = document.createElement("div");
    const title = document.createElement("div");
    title.className = "s936-neck-title";
    const bassLineMode = data.surfaceMode === "bass-line";
    title.textContent = isMainSurface
      ? `SuperGuitarra 936 · ${profile.label}`
      : (bassLineMode ? "Cuello de Bajo · línea por sección" : `Cuello interactivo · ${profile.label}`);
    const meta = document.createElement("div");
    meta.className = "s936-neck-meta";
    const shape = data.exactFrets.map(value => value === null ? "X" : String(value)).join(" ");
    meta.textContent = isMainSurface
      ? `${data.sectionName || data.sectionKey || "Sección"} · ${data.name || "Acorde"} · Forma ${profile.shapeOrder}: ${shape}${data.capo ? ` · Capo ${data.capo}` : ""}`
      : (bassLineMode
        ? `${data.sectionName || data.sectionKey || "Sección"} · ${data.name || "Selecciona un paso"}`
        : `${data.name || "Acorde"} · Forma ${profile.shapeOrder}: ${shape}${data.capo ? ` · Capo ${data.capo}` : ""}`);
    identity.append(title,meta);
    const help = document.createElement("div");
    help.className = "s936-neck-help";
    help.textContent = isMainSurface
      ? "Tocar: nota real y strum de la digitación. Mapa: muestra equivalentes sin cambiar el acorde. Acorde: rasguea la forma activa."
      : (bassLineMode
        ? "Selecciona un paso en Bass Line Pro y toca una cuerda/traste para escribir la nota."
        : "La 1.ª cuerda está arriba. Tocar escribe y suena; Mapa explora notas equivalentes sin editar; Acorde reproduce la digitación.");
    const modeBar = document.createElement("div");
    modeBar.className = "s936-mode-bar";
    const modeLabel = document.createElement("span");
    modeLabel.className = "s936-mode-label";
    modeLabel.textContent = "Modo";
    modeBar.appendChild(modeLabel);
    Object.entries(MODE_LABELS).forEach(([mode,label]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "s936-mode-button";
      button.dataset.mode = mode;
      button.textContent = label;
      button.addEventListener("click",event => {
        event.preventDefault();
        setInteractionMode(mode);
      });
      modeBar.appendChild(button);
    });
    help.appendChild(modeBar);
    head.append(identity,help);
    surface.appendChild(head);
    updateModeButtons(surface);

    const scroll = document.createElement("div");
    scroll.className = "s936-neck-scroll";
    const ruler = document.createElement("div");
    ruler.className = "s936-neck-ruler";
    ruler.style.gridTemplateColumns = `72px 34px 38px repeat(${profile.maxFret},minmax(44px,1fr))`;
    ruler.style.minWidth = `${72+34+38+profile.maxFret*44}px`;
    ["Cuerda","X","0"].forEach(label => {
      const span = document.createElement("span");
      span.textContent = label;
      ruler.appendChild(span);
    });
    const markerFrets = new Set([3,5,7,9,12,15,17,19,21,24].filter(value => value<=profile.maxFret));
    for(let fret=1;fret<=profile.maxFret;fret++){
      const span = document.createElement("span");
      span.textContent = String(fret);
      if(markerFrets.has(fret)) span.classList.add("mark");
      if(fret===12 || fret===24) span.classList.add("double");
      ruler.appendChild(span);
    }
    scroll.appendChild(ruler);

    const exactStrings = Array.isArray(data.exactStrings) ? data.exactStrings : [];
    const bassMidi = data.exactMidis?.length ? Math.min(...data.exactMidis) : null;
    const barre = data.barre || {};
    const barreEnabled = profile.allowBarre && !!barre.enabled;
    const barrePhysicalFret = clamp(Number(barre.fret)||1,1,profile.maxFret)+(data.capo||0);
    const barreHigh = Math.max(clamp(Number(barre.fromString)||profile.strings.length,1,profile.strings.length),clamp(Number(barre.toString)||1,1,profile.strings.length));
    const barreLow = Math.min(clamp(Number(barre.fromString)||profile.strings.length,1,profile.strings.length),clamp(Number(barre.toString)||1,1,profile.strings.length));
    const displayOrder = profile.strings.map((_,index)=>index).reverse();

    displayOrder.forEach(index => {
      const string = profile.strings[index];
      const relativeFret = data.exactFrets[index];
      const row = document.createElement("div");
      row.className = "s936-neck-row";
      row.dataset.stringNumber = String(string.number);
      row.style.gridTemplateColumns = `72px 34px 38px repeat(${profile.maxFret},minmax(44px,1fr))`;
      row.style.minWidth = `${72+34+38+profile.maxFret*44}px`;
      row.style.setProperty("--string-width",`${Math.max(.8,.8+(profile.strings.length-1-index)*.55)}px`);

      const label = document.createElement("div");
      label.className = "s936-neck-string-label";
      label.textContent = `${string.number} · ${string.label}`;
      const open = document.createElement("small");
      open.textContent = string.open;
      label.appendChild(open);
      row.appendChild(label);

      const muteBtn = document.createElement("button");
      muteBtn.type = "button";
      muteBtn.className = "s936-neck-cell mute" + (relativeFret===null ? " active" : "");
      muteBtn.textContent = "X";
      muteBtn.dataset.stringIndex = String(index);
      muteBtn.dataset.physicalFret = "X";
      muteBtn.addEventListener("click",()=>{ if(!readOnly && interactionMode !== "map") editorCall("externalSetFret",index,null); });
      row.appendChild(muteBtn);

      const openBtn = document.createElement("button");
      openBtn.type = "button";
      openBtn.className = "s936-neck-cell open" + (relativeFret===0 ? " active" : "");
      openBtn.textContent = "0";
      const openMidi = string.midi + (data.capo || 0);
      openBtn.dataset.stringIndex = String(index);
      openBtn.dataset.physicalFret = String(data.capo || 0);
      openBtn.dataset.midi = String(openMidi);
      openBtn.addEventListener("pointerdown",event => {
        emitCellInteraction(event,openBtn,{
          instrument,
          midi:openMidi,
          note:noteName(openMidi),
          stringIndex:index,
          physicalFret:data.capo || 0,
          fret:0,
          open:true,
          maxFret:profile.maxFret,
          capo:data.capo || 0
        },onCellPlay,surface);
      },{passive:false});
      openBtn.addEventListener("click",()=>{ if(!readOnly && interactionMode !== "map") editorCall("externalSetFret",index,0); });
      row.appendChild(openBtn);

      const physicalSelected = relativeFret===null ? null : clamp(Number(relativeFret)||0,0,profile.maxFret)+(data.capo||0);
      for(let physicalFret=1;physicalFret<=profile.maxFret;physicalFret++){
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "s936-neck-cell";
        cell.style.setProperty("--string-width",row.style.getPropertyValue("--string-width"));
        const blocked = physicalFret < (data.capo||0);
        if(blocked) cell.classList.add("capoblocked");
        if(data.capo && physicalFret===data.capo) cell.classList.add("capo");
        if(barreEnabled && physicalFret===barrePhysicalFret && string.number<=barreHigh && string.number>=barreLow) cell.classList.add("barre");
        const cellNote = noteName(string.midi+physicalFret);
        cell.textContent = cellNote.replace(/-?\d+$/,"");
        cell.title = `${string.number} · ${string.label} · traste ${physicalFret} · ${cellNote}`;
        if(physicalSelected===physicalFret){
          cell.classList.add("on");
          cell.textContent = "";
          const dot = document.createElement("span");
          dot.className = "s936-neck-dot";
          const stringData = exactStrings[index] || {};
          if(Number.isFinite(stringData.midi) && stringData.midi===bassMidi) dot.classList.add("bass");
          const note = document.createElement("span");
          note.textContent = stringData.note || cellNote;
          const finger = document.createElement("span");
          finger.className = "finger";
          finger.textContent = stringData.finger ? `D${stringData.finger}` : "dedo";
          dot.append(note,finger);
          cell.appendChild(dot);
        }
        const cellMidi = string.midi + physicalFret;
        cell.dataset.stringIndex = String(index);
        cell.dataset.physicalFret = String(physicalFret);
        cell.dataset.midi = String(cellMidi);
        cell.addEventListener("pointerdown",event => {
          if(blocked) return;
          emitCellInteraction(event,cell,{
            instrument,
            midi:cellMidi,
            note:cellNote,
            stringIndex:index,
            physicalFret,
            fret:Math.max(0,physicalFret-(data.capo||0)),
            open:false,
            maxFret:profile.maxFret,
            capo:data.capo || 0
          },onCellPlay,surface);
        },{passive:false});
        cell.addEventListener("click",()=>{
          if(blocked) return;
          const relative = Math.max(0,physicalFret-(data.capo||0));
          if(!readOnly && interactionMode !== "map"){
            editorCall("externalSetFret",index,relative);
            if(!bassLineMode){
              setTimeout(()=>{
                const updated = document.querySelector(`#s936EditorGuitarSurface [data-string-index="${index}"][data-physical-fret="${physicalFret}"]`);
                showFingerPicker(surface,updated,index);
              },90);
            }
          }
        });
        row.appendChild(cell);
      }
      scroll.appendChild(row);
    });
    surface.appendChild(scroll);

    const selectedPhysical = data.exactFrets.filter(value=>Number(value)>0).map(value=>Number(value)+(data.capo||0));
    if(selectedPhysical.length){
      const first = Math.min(...selectedPhysical);
      setTimeout(()=>{ scroll.scrollLeft = Math.max(0,(first-2)*44); },0);
    }

    const chartZone = document.createElement("section");
    chartZone.className = "s936-chart-zone";
    const chartHead = document.createElement("div");
    chartHead.className = "s936-chart-head";
    const chartTitle = document.createElement("b");
    const sectionLabel = sectionNames[data.sectionKey] || data.sectionKey || "Sección";
    chartTitle.textContent = bassLineMode ? `Contexto armónico de ${sectionLabel}` : `Acordes de ${sectionLabel}`;
    const chartHint = document.createElement("span");
    chartHint.textContent = bassLineMode ? "El patrón puede seguir estos acordes" : "Selecciona un chart para editarlo";
    chartHead.append(chartTitle,chartHint);
    chartZone.appendChild(chartHead);

    const chartRow = document.createElement("div");
    chartRow.className = "s936-chart-row";
    (data.seq || []).forEach((item,index) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "s936-chart-card" + (index===data.chordIndex ? " active" : "");
      const name = document.createElement("span");
      name.className = "s936-chart-name";
      name.textContent = `${index+1}. ${item?.name || "Acorde"}`;
      const voicing = voicingForItem(item,index,data,profile);
      const metaLine = document.createElement("span");
      metaLine.className = "s936-chart-meta";
      metaLine.textContent = `${item?.bars || 1} comp. · ${profile.shapeOrder} ${voicing?.shape ? String(voicing.shape).replace(/-/g," ") : "sin forma"}`;
      card.append(name,metaLine);
      renderMiniChart(card,voicing,profile);
      card.addEventListener("click",()=>{ if(typeof onChordSelect === "function") onChordSelect(index); else editorCall("externalSelectChord",index); });
      chartRow.appendChild(card);
    });
    chartZone.appendChild(chartRow);
    surface.appendChild(chartZone);

    return {ok:true};
  }

  function strumMidis(midis,interval=55,duration=220){
    const list = Array.isArray(midis) ? midis.map(Number).filter(Number.isFinite) : [];
    list.forEach((midi,index) => {
      setTimeout(() => flashMidis([midi],"s936-strum-hit",duration), Math.max(0,index * interval));
    });
    return list.length;
  }

  function strumPositions(events,interval=55,duration=220){
    return flashStringEvents(events,"s936-strum-hit",duration,interval);
  }

  return {
    version:"string-surface-v1.8.4-qc-final-exact-edit",
    render,
    clear,
    flashMidis,
    flashPosition,
    flashStringEvents,
    strumMidis,
    strumPositions,
    setInteractionMode: setInteractionMode,
    getInteractionMode: () => interactionMode
  };
})();
