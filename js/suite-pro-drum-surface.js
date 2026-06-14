// Studio 936 Composer - Drum Performance Surface v0.7.1.2
// Visual and interactive drum kit for the main instrument area.
window.Studio936DrumSurface = (() => {
  "use strict";

  const ROOT_ID = "s936EditorDrumSurface";
  const STYLE_ID = "s936EditorDrumSurfaceStyles";

  const PIECES = [
    { id:"crash", label:"Crash", short:"CR", kind:"cymbal", x:10, y:8, w:18, h:16, rotate:-9 },
    { id:"hatOpen", label:"Hi-hat abierto", short:"OH", kind:"cymbal small", x:4, y:28, w:14, h:13, rotate:-5 },
    { id:"hatClosed", label:"Hi-hat cerrado", short:"CH", kind:"cymbal small", x:7, y:42, w:14, h:13, rotate:4 },
    { id:"tomHigh", label:"Tom alto", short:"HT", kind:"drum tom", x:31, y:20, w:15, h:19, rotate:-5 },
    { id:"tomMid", label:"Tom medio", short:"MT", kind:"drum tom", x:51, y:20, w:15, h:19, rotate:5 },
    { id:"ride", label:"Ride", short:"RD", kind:"cymbal", x:73, y:8, w:20, h:17, rotate:8 },
    { id:"snare", label:"Caja", short:"SD", kind:"drum snare", x:22, y:48, w:17, h:20, rotate:-3 },
    { id:"kick", label:"Bombo", short:"BD", kind:"drum kick", x:40, y:51, w:22, h:30, rotate:0 },
    { id:"tomLow", label:"Tom piso", short:"FT", kind:"drum floor", x:66, y:47, w:19, h:25, rotate:4 },
    { id:"percussion", label:"Percusión", short:"PC", kind:"pad", x:85, y:37, w:12, h:18, rotate:4 }
  ];

  const state = {
    container:null,
    root:null,
    pattern:null,
    sectionName:"",
    selectedLane:"kick",
    onLaneSelect:null,
    onLaneTrigger:null,
    timers:new Map()
  };

  function clamp(value,min,max){
    const n = Number(value);
    return Math.max(min,Math.min(max,Number.isFinite(n)?n:min));
  }

  function installStyles(){
    if(document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#${ROOT_ID}{
  --s936-drum-gold:#ffd36d;
  --s936-drum-cyan:#00ffd0;
  --s936-drum-magenta:#ff2bd6;
  width:100%;
  min-height:100%;
  box-sizing:border-box;
  display:grid;
  grid-template-rows:auto minmax(360px,1fr) auto;
  gap:12px;
  padding:14px;
  color:#f7ffff;
  background:
    radial-gradient(circle at 50% 38%,rgba(0,255,208,.085),transparent 30%),
    radial-gradient(circle at 16% 16%,rgba(255,43,214,.06),transparent 25%),
    linear-gradient(180deg,#07100f 0%,#030606 100%);
  overflow:auto;
}
#${ROOT_ID} .s936-drum-surface-head{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:14px;
  padding:2px 4px 0;
}
#${ROOT_ID} .s936-drum-surface-title{
  color:#8affff;
  font-size:.82rem;
  font-weight:950;
  letter-spacing:.85px;
  text-transform:uppercase;
}
#${ROOT_ID} .s936-drum-surface-sub{
  margin-top:4px;
  color:rgba(255,255,255,.62);
  font-size:.66rem;
  line-height:1.35;
}
#${ROOT_ID} .s936-drum-surface-chips{
  display:flex;
  flex-wrap:wrap;
  justify-content:flex-end;
  gap:6px;
}
#${ROOT_ID} .s936-drum-chip{
  border:1px solid rgba(0,255,208,.28);
  border-radius:999px;
  padding:5px 9px;
  background:rgba(0,255,208,.07);
  color:#cffff7;
  font-size:.58rem;
  font-weight:900;
  letter-spacing:.35px;
  text-transform:uppercase;
}
#${ROOT_ID} .s936-drum-stage{
  position:relative;
  width:100%;
  min-height:clamp(390px,58vh,670px);
  border:1px solid rgba(255,211,109,.25);
  border-radius:28px;
  overflow:hidden;
  background:
    linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),
    linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px),
    radial-gradient(ellipse at 50% 87%,rgba(255,211,109,.13),transparent 42%),
    radial-gradient(circle at 50% 45%,rgba(28,56,50,.82),#090e0d 65%);
  background-size:28px 28px,28px 28px,auto,auto;
  box-shadow:inset 0 0 70px rgba(0,0,0,.65),0 22px 55px rgba(0,0,0,.38);
}
#${ROOT_ID} .s936-drum-stage::before{
  content:"";
  position:absolute;
  left:7%;
  right:7%;
  bottom:4%;
  height:22%;
  border-radius:50%;
  background:radial-gradient(ellipse,rgba(0,0,0,.55),transparent 68%);
  filter:blur(8px);
  pointer-events:none;
}
#${ROOT_ID} .s936-drum-piece{
  --piece-volume:.75;
  --piece-accent:var(--s936-drum-cyan);
  position:absolute;
  left:calc(var(--x) * 1%);
  top:calc(var(--y) * 1%);
  width:calc(var(--w) * 1%);
  height:calc(var(--h) * 1%);
  min-width:72px;
  min-height:58px;
  transform:rotate(calc(var(--r) * 1deg));
  border:0;
  background:transparent;
  color:#fff;
  cursor:pointer;
  opacity:calc(.42 + var(--piece-volume) * .58);
  transition:filter .14s ease,opacity .14s ease,transform .14s ease;
  z-index:2;
}
#${ROOT_ID} .s936-drum-piece:hover,
#${ROOT_ID} .s936-drum-piece:focus-visible{
  filter:brightness(1.18);
  outline:none;
  z-index:5;
}
#${ROOT_ID} .s936-drum-piece.off,
#${ROOT_ID} .s936-drum-piece.muted{
  opacity:.24;
  filter:grayscale(.9);
}
#${ROOT_ID} .s936-drum-piece.solo{
  filter:drop-shadow(0 0 12px rgba(255,211,109,.7));
}
#${ROOT_ID} .s936-drum-piece.selected .s936-drum-face{
  box-shadow:0 0 0 3px rgba(0,255,208,.8),0 0 26px rgba(0,255,208,.38),inset 0 0 20px rgba(255,255,255,.13);
}
#${ROOT_ID} .s936-drum-piece.active{
  z-index:8;
  transform:rotate(calc(var(--r) * 1deg)) scale(1.075);
  filter:brightness(1.42) drop-shadow(0 0 20px var(--piece-accent));
}
#${ROOT_ID} .s936-drum-face{
  position:absolute;
  inset:0;
  display:flex;
  align-items:center;
  justify-content:center;
  border:2px solid rgba(255,255,255,.25);
  overflow:hidden;
  box-shadow:inset 0 0 22px rgba(255,255,255,.10),0 9px 20px rgba(0,0,0,.45);
}
#${ROOT_ID} .s936-drum-face::after{
  content:"";
  position:absolute;
  inset:10%;
  border:1px solid rgba(255,255,255,.12);
  border-radius:inherit;
}
#${ROOT_ID} .cymbal .s936-drum-face{
  border-radius:50%;
  background:
    radial-gradient(circle at 42% 36%,#fff6b8 0 2%,transparent 3%),
    repeating-radial-gradient(circle,rgba(255,255,255,.16) 0 1px,transparent 2px 7px),
    radial-gradient(circle,#f8df79 0 8%,#c89a28 9% 48%,#705215 74%,#2b210b 100%);
  border-color:#ffe98f;
  box-shadow:inset 0 0 18px rgba(255,255,255,.3),0 7px 18px rgba(0,0,0,.5);
}
#${ROOT_ID} .cymbal.small .s936-drum-face{
  background:
    repeating-radial-gradient(circle,rgba(255,255,255,.18) 0 1px,transparent 2px 6px),
    radial-gradient(circle,#ffec8e 0 10%,#b78620 12% 55%,#4d390f 100%);
}
#${ROOT_ID} .drum .s936-drum-face{
  border-radius:50%;
  background:
    radial-gradient(circle at 38% 32%,rgba(255,255,255,.8),rgba(230,247,245,.28) 8%,transparent 17%),
    radial-gradient(circle,#d9eeeb 0 57%,#536d69 59% 64%,#172522 66% 76%,#050807 78%);
  border:3px solid #8aa7a2;
}
#${ROOT_ID} .drum.tom .s936-drum-face{
  background:
    radial-gradient(circle at 38% 30%,rgba(255,255,255,.75),transparent 17%),
    radial-gradient(circle,#d8f2ee 0 54%,#04b89c 56% 60%,#073a32 63% 76%,#020807 79%);
}
#${ROOT_ID} .drum.snare .s936-drum-face{
  background:
    repeating-linear-gradient(90deg,transparent 0 7px,rgba(255,255,255,.11) 8px 9px),
    radial-gradient(circle,#eaf8f6 0 57%,#c9d5d3 59% 64%,#3c4a48 66% 76%,#070909 78%);
}
#${ROOT_ID} .drum.kick .s936-drum-face{
  border-radius:50%;
  background:
    radial-gradient(circle at 50% 48%,#04110f 0 24%,#0f4f45 25% 29%,#030807 30% 52%,#03a98f 54% 58%,#07120f 60% 100%);
  border:4px solid #6e8b86;
}
#${ROOT_ID} .drum.floor .s936-drum-face{
  background:
    radial-gradient(circle at 38% 30%,rgba(255,255,255,.7),transparent 17%),
    radial-gradient(circle,#d9f0ed 0 54%,#ff2bd6 56% 60%,#4b073f 63% 76%,#080207 79%);
}
#${ROOT_ID} .pad .s936-drum-face{
  border-radius:18px;
  background:
    linear-gradient(135deg,rgba(255,255,255,.2),transparent 38%),
    linear-gradient(145deg,#5a2560,#1c0b22 63%);
  border-color:#ff8ded;
}
#${ROOT_ID} .s936-drum-piece-label{
  position:relative;
  z-index:2;
  display:grid;
  place-items:center;
  gap:1px;
  min-width:42px;
  padding:4px 6px;
  border-radius:9px;
  background:rgba(0,0,0,.58);
  text-shadow:0 1px 4px #000;
  pointer-events:none;
}
#${ROOT_ID} .s936-drum-piece-label b{
  color:#fff;
  font-size:clamp(.55rem,.75vw,.78rem);
  font-weight:950;
}
#${ROOT_ID} .s936-drum-piece-label small{
  color:var(--s936-drum-gold);
  font-size:.49rem;
  font-weight:950;
}
#${ROOT_ID} .s936-drum-foot{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  border:1px solid rgba(255,255,255,.08);
  border-radius:13px;
  padding:8px 11px;
  background:rgba(255,255,255,.035);
  color:rgba(255,255,255,.68);
  font-size:.62rem;
}
#${ROOT_ID} .s936-drum-now{
  color:#bffff6;
  font-weight:900;
}
@media(max-width:900px){
  #${ROOT_ID}{padding:9px;grid-template-rows:auto minmax(340px,1fr) auto}
  #${ROOT_ID} .s936-drum-stage{min-height:420px}
  #${ROOT_ID} .s936-drum-piece{min-width:54px;min-height:48px}
  #${ROOT_ID} .s936-drum-surface-head{display:grid}
  #${ROOT_ID} .s936-drum-surface-chips{justify-content:flex-start}
}
`;
    document.head.appendChild(style);
  }

  function lane(pattern,id){
    return pattern?.lanes?.[id] || {};
  }

  function pieceElement(id){
    return state.root?.querySelector?.(`[data-drum-lane="${id}"]`) || null;
  }

  function setSelected(id,notify=true){
    if(!PIECES.some(piece => piece.id === id)) return;
    state.selectedLane = id;
    state.root?.querySelectorAll?.(".s936-drum-piece").forEach(node => {
      node.classList.toggle("selected",node.dataset.drumLane === id);
    });
    const def = PIECES.find(piece => piece.id === id);
    const now = state.root?.querySelector?.(".s936-drum-now");
    if(now && def) now.textContent = `Seleccionado: ${def.label}`;
    if(notify && typeof state.onLaneSelect === "function"){
      state.onLaneSelect(id);
    }
  }

  function createRoot(container){
    const root = document.createElement("section");
    root.id = ROOT_ID;
    root.setAttribute("aria-label","Batería visual interactiva");

    const head = document.createElement("div");
    head.className = "s936-drum-surface-head";

    const copy = document.createElement("div");
    const title = document.createElement("div");
    title.className = "s936-drum-surface-title";
    title.textContent = "Batería Pro · Kit interactivo";
    const sub = document.createElement("div");
    sub.className = "s936-drum-surface-sub";
    sub.textContent = "Toca una pieza para escucharla y seleccionar su fila en el secuenciador.";
    copy.append(title,sub);

    const chips = document.createElement("div");
    chips.className = "s936-drum-surface-chips";
    ["section","kit","tempo","steps"].forEach(key => {
      const chip = document.createElement("span");
      chip.className = "s936-drum-chip";
      chip.dataset.chip = key;
      chips.appendChild(chip);
    });
    head.append(copy,chips);

    const stage = document.createElement("div");
    stage.className = "s936-drum-stage";

    PIECES.forEach(def => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `s936-drum-piece ${def.kind}`;
      button.dataset.drumLane = def.id;
      button.style.setProperty("--x",String(def.x));
      button.style.setProperty("--y",String(def.y));
      button.style.setProperty("--w",String(def.w));
      button.style.setProperty("--h",String(def.h));
      button.style.setProperty("--r",String(def.rotate || 0));
      button.title = `${def.label} · clic para escuchar y seleccionar`;
      button.setAttribute("aria-label",def.label);

      const face = document.createElement("span");
      face.className = "s936-drum-face";
      const label = document.createElement("span");
      label.className = "s936-drum-piece-label";
      const strong = document.createElement("b");
      strong.textContent = def.label;
      const small = document.createElement("small");
      small.textContent = def.short;
      label.append(strong,small);
      face.appendChild(label);
      button.appendChild(face);

      button.addEventListener("click",() => {
        setSelected(def.id,true);
        flashLane(def.id,.92,190);
        if(typeof state.onLaneTrigger === "function"){
          state.onLaneTrigger(def.id,.92);
        }
      });

      stage.appendChild(button);
    });

    const foot = document.createElement("div");
    foot.className = "s936-drum-foot";
    const now = document.createElement("span");
    now.className = "s936-drum-now";
    now.textContent = "Seleccionado: Bombo";
    const hint = document.createElement("span");
    hint.textContent = "La intensidad del brillo sigue el acento del patrón.";
    foot.append(now,hint);

    root.append(head,stage,foot);
    container.appendChild(root);
    return root;
  }

  function updatePattern(pattern = state.pattern,sectionName = state.sectionName){
    state.pattern = pattern || {};
    state.sectionName = sectionName || state.sectionName || "Sección";
    if(!state.root) return {ok:false,message:"La superficie de batería no está montada."};

    const kit = String(state.pattern?.kit || "acoustic");
    const bpm = Number(state.pattern?.bpm || state.pattern?.tempo || 95);
    const bars = Math.max(1,Number(state.pattern?.bars)||1);
    const totalSteps = bars * 16;

    const setChip = (key,text) => {
      const node = state.root.querySelector(`[data-chip="${key}"]`);
      if(node) node.textContent = text;
    };
    setChip("section",state.sectionName);
    setChip("kit",`Kit ${kit}`);
    setChip("tempo",`${Math.round(bpm)} BPM`);
    setChip("steps",`${totalSteps} pasos`);

    PIECES.forEach(def => {
      const node = pieceElement(def.id);
      if(!node) return;
      const data = lane(state.pattern,def.id);
      const enabled = data.enabled !== false;
      const volume = clamp(data.volume ?? .75,0,1);
      node.style.setProperty("--piece-volume",String(volume));
      node.classList.toggle("off",!enabled);
      node.classList.toggle("muted",!!data.mute);
      node.classList.toggle("solo",!!data.solo);
      node.setAttribute("aria-disabled",String(!enabled));
      node.title = `${def.label}${!enabled?" · desactivado":data.mute?" · mute":data.solo?" · solo":""}`;
    });
    setSelected(state.selectedLane,false);
    return {ok:true};
  }

  function render({
    container,
    pattern = {},
    sectionName = "Sección",
    onLaneSelect = null,
    onLaneTrigger = null
  } = {}){
    installStyles();
    if(!container) return {ok:false,message:"No existe el contenedor para la batería."};

    state.container = container;
    state.pattern = pattern || {};
    state.sectionName = sectionName || "Sección";
    state.onLaneSelect = typeof onLaneSelect === "function" ? onLaneSelect : null;
    state.onLaneTrigger = typeof onLaneTrigger === "function" ? onLaneTrigger : null;

    let root = document.getElementById(ROOT_ID);
    if(root && root.parentElement !== container) root.remove();
    root = document.getElementById(ROOT_ID);
    if(!root) root = createRoot(container);
    state.root = root;

    return updatePattern(state.pattern,state.sectionName);
  }

  function flashLane(id,velocity=.82,duration=160){
    const node = pieceElement(id);
    if(!node) return false;
    const value = clamp(velocity,0,1);
    node.style.setProperty("--piece-accent",value >= .9 ? "var(--s936-drum-magenta)" : "var(--s936-drum-cyan)");
    node.classList.add("active");
    const previous = state.timers.get(id);
    if(previous) clearTimeout(previous);
    const timer = setTimeout(() => {
      node.classList.remove("active");
      state.timers.delete(id);
    },Math.max(70,Number(duration)||160));
    state.timers.set(id,timer);
    return true;
  }

  function clearActive(){
    state.timers.forEach(timer => clearTimeout(timer));
    state.timers.clear();
    state.root?.querySelectorAll?.(".s936-drum-piece.active").forEach(node => node.classList.remove("active"));
  }

  function clear(){
    clearActive();
    document.querySelectorAll(`#${ROOT_ID}`).forEach(node => node.remove());
    state.container = null;
    state.root = null;
    state.pattern = null;
    state.onLaneSelect = null;
    state.onLaneTrigger = null;
  }

  function getState(){
    return {
      version:"drum-performance-surface-v0.7.1.2",
      mounted:!!state.root,
      selectedLane:state.selectedLane,
      sectionName:state.sectionName,
      kit:state.pattern?.kit || null
    };
  }

  return {
    version:"drum-performance-surface-v0.7.1.2",
    render,
    updatePattern,
    flashLane,
    selectLane:(id,notify=false) => setSelected(id,notify),
    clearActive,
    clear,
    getState
  };
})();
