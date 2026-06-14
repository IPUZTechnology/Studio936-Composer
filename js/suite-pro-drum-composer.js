// Studio 936 Composer - Drum Composer Pro v0.7.1
// Section-based drum pattern editor with selectable kit pieces and a 16-step sequencer.
(function(){
"use strict";

const VERSION = "drum-composer-v0.7.1.2";
const STYLE_ID = "s936DrumComposerStyles";
const Core = window.Studio936SequencerCore;
const DrumSurface = window.Studio936DrumSurface || null;

const LANES = [
  {id:"kick",label:"Bombo",short:"BD",group:"core",defaultVolume:.92},
  {id:"snare",label:"Caja",short:"SD",group:"core",defaultVolume:.82},
  {id:"hatClosed",label:"Hi-hat cerrado",short:"CH",group:"cymbal",defaultVolume:.58},
  {id:"hatOpen",label:"Hi-hat abierto",short:"OH",group:"cymbal",defaultVolume:.58},
  {id:"tomHigh",label:"Tom alto",short:"HT",group:"tom",defaultVolume:.72},
  {id:"tomMid",label:"Tom medio",short:"MT",group:"tom",defaultVolume:.74},
  {id:"tomLow",label:"Tom piso",short:"FT",group:"tom",defaultVolume:.78},
  {id:"crash",label:"Crash",short:"CR",group:"cymbal",defaultVolume:.62},
  {id:"ride",label:"Ride",short:"RD",group:"cymbal",defaultVolume:.55},
  {id:"percussion",label:"Percusión",short:"PC",group:"perc",defaultVolume:.62}
];

const KITS = [
  ["studio","Studio acústica"],
  ["rock","Rock grande"],
  ["latin","Latin / percusión"],
  ["electronic","Electrónica"],
  ["soft","Soft / balada"]
];

const PRESETS = [
  ["custom","Personalizado"],
  ["rock","Rock básico"],
  ["funk","Funk groove"],
  ["pop","Pop estable"],
  ["bossa","Bossa Nova"],
  ["salsa","Salsa / Latin"],
  ["reggae","Reggae"],
  ["ballad","Balada"],
  ["tom-session","Sesión de toms"],
  ["percussion-only","Solo percusión"]
];

const PERCUSSION_VOICES = [
  ["conga","Conga"],
  ["clap","Clap"],
  ["shaker","Shaker"],
  ["cowbell","Campana"]
];

let activeController = null;
let audioCtx = null;
let timer = null;
let selectedLaneId = "kick";
const visualTimers = new Set();

function bridge(name,...args){
  const fn=window.Studio936AppBridge?.[name];
  if(typeof fn!=="function") return null;
  try{return fn(...args);}
  catch(error){console.warn("Drum Composer bridge:",name,error);return {ok:false,message:error.message};}
}
function el(tag,className="",text=""){
  const node=document.createElement(tag);
  if(className) node.className=className;
  if(text!=="") node.textContent=text;
  return node;
}
function option(value,label,selected){
  const node=document.createElement("option");
  node.value=String(value);
  node.textContent=label;
  node.selected=String(value)===String(selected);
  return node;
}
function field(label,control,className=""){
  const wrap=el("label","s936-dc-field "+className);
  wrap.append(el("span","",label),control);
  return wrap;
}
function button(label,className,handler){
  const node=el("button","s936-dc-btn "+(className||""),label);
  node.type="button";
  node.addEventListener("click",handler);
  return node;
}
function clamp(value,min,max){
  return Core?.clamp ? Core.clamp(value,min,max) : Math.max(min,Math.min(max,Number(value)||0));
}
function clone(value){
  return Core?.clone ? Core.clone(value) : JSON.parse(JSON.stringify(value));
}
function installStyles(){
  if(document.getElementById(STYLE_ID)) return;
  const style=document.createElement("style");
  style.id=STYLE_ID;
  style.textContent=`
#s936SuitePro .s936-dc-shell{display:grid;gap:10px;margin-top:8px}
#s936SuitePro .s936-dc-panel{border:1px solid rgba(255,255,255,.13);border-radius:15px;background:rgba(255,255,255,.045);padding:11px}
#s936SuitePro .s936-dc-panel.primary{border-color:rgba(255,190,55,.38);background:linear-gradient(135deg,rgba(255,184,45,.10),rgba(255,75,75,.055))}
#s936SuitePro .s936-dc-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
#s936SuitePro .s936-dc-head b{color:#ffd36d;font-size:.82rem;text-transform:uppercase;letter-spacing:.55px}
#s936SuitePro .s936-dc-head span{color:rgba(255,255,255,.55);font-size:.65rem}
#s936SuitePro .s936-dc-config{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}
#s936SuitePro .s936-dc-field{display:grid;gap:4px;min-width:0}
#s936SuitePro .s936-dc-field>span{font-size:.61rem;font-weight:800;color:rgba(255,255,255,.58);text-transform:uppercase;letter-spacing:.42px}
#s936SuitePro .s936-dc-field select,#s936SuitePro .s936-dc-field input{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.13);border-radius:9px;background:#111722;color:#fff;padding:8px;font-size:.72rem}
#s936SuitePro .s936-dc-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}
#s936SuitePro .s936-dc-btn{border:1px solid rgba(255,255,255,.14);border-radius:9px;background:rgba(255,255,255,.07);color:#fff;padding:8px 10px;font-size:.69rem;font-weight:850;cursor:pointer}
#s936SuitePro .s936-dc-btn.primary{background:linear-gradient(135deg,#ff9d2f,#ff5c4d);border-color:transparent}
#s936SuitePro .s936-dc-btn.warn{background:rgba(255,210,70,.12);border-color:rgba(255,210,70,.35);color:#ffe28c}
#s936SuitePro .s936-dc-btn.danger{background:rgba(255,75,75,.10);border-color:rgba(255,75,75,.34);color:#ffaaaa}
#s936SuitePro .s936-dc-status{margin-top:8px;border-radius:9px;background:rgba(0,0,0,.25);padding:8px;color:#caffd8;font-size:.69rem}
#s936SuitePro .s936-dc-status.error{color:#ffabab}
#s936SuitePro .s936-dc-workspace{display:grid;grid-template-columns:minmax(205px,260px) minmax(0,1fr);gap:9px;align-items:start}
#s936SuitePro .s936-dc-kit{display:grid;gap:6px}
#s936SuitePro .s936-dc-lane-control{display:grid;grid-template-columns:26px minmax(0,1fr) 28px 28px;gap:5px;align-items:center;border:1px solid rgba(255,255,255,.08);border-radius:9px;padding:6px;background:rgba(255,255,255,.025)}
#s936SuitePro .s936-dc-lane-control.selected{border-color:rgba(0,255,204,.7);box-shadow:0 0 0 2px rgba(0,255,204,.12),0 0 18px rgba(0,255,204,.12)}
#s936SuitePro .s936-dc-lane-control.off{opacity:.42}
#s936SuitePro .s936-dc-lane-control.solo{border-color:rgba(255,210,70,.52);background:rgba(255,210,70,.07)}
#s936SuitePro .s936-dc-lane-control.muted{border-color:rgba(255,75,75,.42)}
#s936SuitePro .s936-dc-lane-control input[type=checkbox]{accent-color:#ffc74d}
#s936SuitePro .s936-dc-lane-name{display:grid;gap:2px;min-width:0}
#s936SuitePro .s936-dc-lane-name b{font-size:.67rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#s936SuitePro .s936-dc-lane-name input{width:100%;accent-color:#ffbd4f}
#s936SuitePro .s936-dc-mini{border:1px solid rgba(255,255,255,.12);border-radius:6px;background:#111722;color:#fff;font-size:.59rem;font-weight:900;height:27px;cursor:pointer}
#s936SuitePro .s936-dc-mini.active{background:#ffd15d;color:#201500}
#s936SuitePro .s936-dc-grid-wrap{overflow:auto;padding-bottom:5px}
#s936SuitePro .s936-dc-grid{display:grid;gap:4px;min-width:max-content}
#s936SuitePro .s936-dc-grid-head,#s936SuitePro .s936-dc-grid-row{display:grid;grid-template-columns:82px repeat(var(--steps),34px);gap:3px;align-items:center}
#s936SuitePro .s936-dc-grid-head span{font-size:.54rem;text-align:center;color:rgba(255,255,255,.48)}
#s936SuitePro .s936-dc-grid-head .label{text-align:left;color:#ffd36d;font-weight:900}
#s936SuitePro .s936-dc-row-label{font-size:.62rem;color:rgba(255,255,255,.78);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#s936SuitePro .s936-dc-step{width:34px;height:34px;border:1px solid rgba(255,255,255,.09);border-radius:7px;background:rgba(255,255,255,.035);color:#fff;cursor:pointer;padding:0}
#s936SuitePro .s936-dc-step.beat{border-top-color:rgba(255,210,80,.62)}
#s936SuitePro .s936-dc-step.bar{box-shadow:inset 3px 0 0 rgba(255,255,255,.18)}
#s936SuitePro .s936-dc-step.on{background:rgba(255,165,55,.58);border-color:#ffbd58}
#s936SuitePro .s936-dc-step.accent{background:#fff0a0;border-color:#fff;color:#301d00;box-shadow:0 0 10px rgba(255,210,70,.45)}
#s936SuitePro .s936-dc-step.playing{outline:2px solid #fff;transform:translateY(-2px)}
#s936SuitePro .s936-dc-step.disabled{opacity:.25}
#s936SuitePro .s936-dc-legend{display:flex;gap:12px;flex-wrap:wrap;margin-top:7px;font-size:.62rem;color:rgba(255,255,255,.55)}
#s936SuitePro .s936-dc-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:4px;vertical-align:-1px;background:rgba(255,165,55,.58)}
#s936SuitePro .s936-dc-legend i.accent{background:#fff0a0}
@media(max-width:920px){
  #s936SuitePro .s936-dc-workspace{grid-template-columns:1fr}
  #s936SuitePro .s936-dc-kit{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media(max-width:660px){
  #s936SuitePro .s936-dc-config{grid-template-columns:1fr 1fr}
  #s936SuitePro .s936-dc-kit{grid-template-columns:1fr}
}`;
  document.head.appendChild(style);
}

function blankLane(def){
  return {enabled:true,mute:false,solo:false,volume:def.defaultVolume,hits:{}};
}
function normalizePattern(raw,chords,bpm){
  const sectionBars=Math.max(1,(chords||[]).reduce((sum,item)=>sum+(Number(item?.bars)||1),0));
  const bars=clamp(Number(raw?.bars)||Math.min(4,sectionBars),1,8);
  const lanes={};
  LANES.forEach(def=>{
    const source=raw?.lanes?.[def.id]||{};
    const hits={};
    Object.entries(source.hits||{}).forEach(([step,velocity])=>{
      const index=clamp(step,0,bars*16-1);
      const amount=Number(velocity);
      if(amount>0) hits[index]=clamp(amount,.2,1);
    });
    lanes[def.id]={
      enabled:source.enabled!==false,
      mute:source.mute===true,
      solo:source.solo===true,
      volume:clamp(source.volume ?? def.defaultVolume,0,1),
      hits
    };
  });
  return {
    version:1,
    kit:KITS.some(item=>item[0]===raw?.kit)?raw.kit:"studio",
    preset:PRESETS.some(item=>item[0]===raw?.preset)?raw.preset:"rock",
    percussionVoice:PERCUSSION_VOICES.some(item=>item[0]===raw?.percussionVoice)?raw.percussionVoice:"conga",
    bars,
    stepsPerBar:16,
    bpm:Number(bpm)||95,
    swing:clamp(raw?.swing,0,.35),
    humanize:clamp(raw?.humanize,0,.18),
    masterVolume:clamp(raw?.masterVolume ?? .8,0,1),
    lanes
  };
}
function setHits(lane,steps,velocity=.78,barOffset=0){
  steps.forEach(step=>{lane.hits[barOffset+step]=velocity;});
}
function clearHits(pattern){
  LANES.forEach(def=>{pattern.lanes[def.id].hits={};});
}
function applyPreset(pattern,preset){
  clearHits(pattern);
  const bars=pattern.bars;
  for(let bar=0;bar<bars;bar++){
    const offset=bar*16;
    switch(preset){
      case "funk":
        setHits(pattern.lanes.kick,[0,3,8,10,14],.9,offset);
        setHits(pattern.lanes.snare,[4,12],.88,offset);
        setHits(pattern.lanes.hatClosed,[0,2,3,6,8,10,11,14],.56,offset);
        setHits(pattern.lanes.hatOpen,[7,15],.65,offset);
        break;
      case "pop":
        setHits(pattern.lanes.kick,[0,8,11],.86,offset);
        setHits(pattern.lanes.snare,[4,12],.86,offset);
        setHits(pattern.lanes.hatClosed,[0,2,4,6,8,10,12,14],.55,offset);
        break;
      case "bossa":
        setHits(pattern.lanes.kick,[0,6,8,14],.72,offset);
        setHits(pattern.lanes.snare,[4,10,12],.45,offset);
        setHits(pattern.lanes.hatClosed,[0,2,4,6,8,10,12,14],.43,offset);
        setHits(pattern.lanes.ride,[0,3,6,8,11,14],.48,offset);
        setHits(pattern.lanes.percussion,[2,7,10,15],.52,offset);
        break;
      case "salsa":
        setHits(pattern.lanes.kick,[0,10],.74,offset);
        setHits(pattern.lanes.snare,[4,12],.42,offset);
        setHits(pattern.lanes.hatClosed,[0,2,4,6,8,10,12,14],.42,offset);
        setHits(pattern.lanes.ride,[0,3,6,8,10,14],.55,offset);
        setHits(pattern.lanes.percussion,[0,3,6,10,12,15],.72,offset);
        break;
      case "reggae":
        setHits(pattern.lanes.kick,[8],.85,offset);
        setHits(pattern.lanes.snare,[8],.84,offset);
        setHits(pattern.lanes.hatClosed,[2,6,10,14],.54,offset);
        setHits(pattern.lanes.hatOpen,[15],.58,offset);
        break;
      case "ballad":
        setHits(pattern.lanes.kick,[0,10],.68,offset);
        setHits(pattern.lanes.snare,[4,12],.62,offset);
        setHits(pattern.lanes.hatClosed,[0,4,8,12],.38,offset);
        break;
      case "tom-session":
        setHits(pattern.lanes.tomHigh,[0,4],.78,offset);
        setHits(pattern.lanes.tomMid,[6,10],.82,offset);
        setHits(pattern.lanes.tomLow,[12,14,15],.9,offset);
        if(bar===0) setHits(pattern.lanes.crash,[0],.72,offset);
        break;
      case "percussion-only":
        setHits(pattern.lanes.percussion,[0,3,6,8,10,13,15],.72,offset);
        setHits(pattern.lanes.ride,[0,4,8,12],.38,offset);
        break;
      case "rock":
      default:
        setHits(pattern.lanes.kick,[0,8,10],.9,offset);
        setHits(pattern.lanes.snare,[4,12],.88,offset);
        setHits(pattern.lanes.hatClosed,[0,2,4,6,8,10,12,14],.56,offset);
        if(bar===0) setHits(pattern.lanes.crash,[0],.72,offset);
        break;
    }
  }
  pattern.preset=preset;
}
function addTomFill(pattern){
  const offset=(pattern.bars-1)*16;
  setHits(pattern.lanes.tomHigh,[8,9],.76,offset);
  setHits(pattern.lanes.tomMid,[10,11,12],.82,offset);
  setHits(pattern.lanes.tomLow,[13,14,15],.92,offset);
  pattern.lanes.crash.hits[offset]=.84;
}
function ensureAudio(){
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC) return null;
  if(!audioCtx) audioCtx=new AC();
  audioCtx.resume?.();
  return audioCtx;
}
function noiseBuffer(duration=.12){
  const ctx=audioCtx;
  const buffer=ctx.createBuffer(1,Math.max(1,Math.floor(ctx.sampleRate*duration)),ctx.sampleRate);
  const data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*(1-i/data.length);
  return buffer;
}
function outputGain(volume,when,decay){
  const gain=audioCtx.createGain();
  gain.gain.setValueAtTime(Math.max(.0001,volume),when);
  gain.gain.exponentialRampToValueAtTime(.0001,when+decay);
  gain.connect(audioCtx.destination);
  return gain;
}
function playTone(freq,volume,when,decay,type="sine",endFreq=null){
  const osc=audioCtx.createOscillator();
  osc.type=type;
  osc.frequency.setValueAtTime(freq,when);
  if(endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq,when+decay*.75);
  osc.connect(outputGain(volume,when,decay));
  osc.start(when);osc.stop(when+decay+.02);
}
function playNoise(volume,when,decay,filterType="highpass",frequency=2500){
  const source=audioCtx.createBufferSource();
  source.buffer=noiseBuffer(decay);
  const filter=audioCtx.createBiquadFilter();
  filter.type=filterType;filter.frequency.setValueAtTime(frequency,when);
  source.connect(filter).connect(outputGain(volume,when,decay));
  source.start(when);source.stop(when+decay+.02);
}
function playLane(id,velocity,pattern,when){
  if(!ensureAudio()) return;
  const lane=pattern.lanes[id];
  const volume=clamp(velocity,0,1)*lane.volume*pattern.masterVolume;
  const kit=pattern.kit;
  switch(id){
    case "kick":
      playTone(kit==="electronic"?145:112,volume,when,.22,"sine",kit==="electronic"?48:42);
      break;
    case "snare":
      playNoise(volume*.78,when,.15,"bandpass",kit==="soft"?1450:1900);
      playTone(kit==="electronic"?210:175,volume*.22,when,.11,"triangle",120);
      break;
    case "hatClosed":
      playNoise(volume*.55,when,.045,"highpass",kit==="soft"?5200:6700);
      break;
    case "hatOpen":
      playNoise(volume*.58,when,.20,"highpass",5600);
      break;
    case "tomHigh":
      playTone(190,volume*.78,when,.25,"sine",118);
      break;
    case "tomMid":
      playTone(145,volume*.8,when,.30,"sine",86);
      break;
    case "tomLow":
      playTone(105,volume*.84,when,.36,"sine",62);
      break;
    case "crash":
      playNoise(volume*.65,when,.45,"highpass",3800);
      break;
    case "ride":
      playNoise(volume*.48,when,.22,"highpass",4800);
      playTone(780,volume*.12,when,.18,"square");
      break;
    case "percussion":
      if(pattern.percussionVoice==="clap"){
        [0,.018,.035].forEach(delay=>playNoise(volume*.38,when+delay,.08,"bandpass",1500));
      }else if(pattern.percussionVoice==="shaker"){
        playNoise(volume*.48,when,.10,"highpass",7200);
      }else if(pattern.percussionVoice==="cowbell"){
        playTone(560,volume*.48,when,.14,"square");
        playTone(845,volume*.28,when,.10,"square");
      }else{
        playTone(310,volume*.58,when,.16,"sine",205);
        playNoise(volume*.18,when,.08,"bandpass",1200);
      }
      break;
  }
}

function render(options={}){
  installStyles();

  // Detener de forma segura una instancia anterior.
  // No llamar al stop local de esta nueva instancia antes de crear su grid.
  if(activeController && typeof activeController.destroy==="function"){
    try{ activeController.destroy(); }catch(error){
      console.warn("Drum Composer: no se pudo detener la instancia anterior.",error);
    }
  }
  activeController=null;
  if(timer){
    clearTimeout(timer);
    timer=null;
  }

  const host=options.host;
  if(!host) return null;
  const state=bridge("getEditorState")||{};
  const sectionKey=options.sectionKey||state.sectionKey||"intro";
  const chords=Array.isArray(state.sections?.[sectionKey])?state.sections[sectionKey]:(options.sections?.[sectionKey]||[]);
  const sectionOptions=state.sectionOptions||options.sectionOptions||[];
  let pattern=normalizePattern(state.drumPatterns?.[sectionKey]||{},chords,state.bpm||options.bpm||95);
  let playingStep=-1;
  const laneRows=new Map();

  const shell=el("div","s936-dc-shell");
  const config=el("section","s936-dc-panel primary");
  const head=el("div","s936-dc-head");
  head.append(el("b","","Batería Pro · patrón por sección"),el("span","",`${state.bpm||95} BPM · ${pattern.bars} compás(es)`));
  config.appendChild(head);

  const sectionSelect=document.createElement("select");
  sectionOptions.forEach(entry=>sectionSelect.appendChild(option(entry[0],entry[1],sectionKey)));
  const kitSelect=document.createElement("select");
  KITS.forEach(entry=>kitSelect.appendChild(option(entry[0],entry[1],pattern.kit)));
  const presetSelect=document.createElement("select");
  PRESETS.forEach(entry=>presetSelect.appendChild(option(entry[0],entry[1],pattern.preset)));
  const barsInput=document.createElement("input");
  barsInput.type="number";barsInput.min="1";barsInput.max="8";barsInput.value=String(pattern.bars);
  const percussionSelect=document.createElement("select");
  PERCUSSION_VOICES.forEach(entry=>percussionSelect.appendChild(option(entry[0],entry[1],pattern.percussionVoice)));
  const swingInput=document.createElement("input");
  swingInput.type="range";swingInput.min="0";swingInput.max=".35";swingInput.step=".01";swingInput.value=String(pattern.swing);
  const humanInput=document.createElement("input");
  humanInput.type="range";humanInput.min="0";humanInput.max=".18";humanInput.step=".01";humanInput.value=String(pattern.humanize);
  const masterInput=document.createElement("input");
  masterInput.type="range";masterInput.min="0";masterInput.max="1";masterInput.step=".01";masterInput.value=String(pattern.masterVolume);

  const configGrid=el("div","s936-dc-config");
  configGrid.append(
    field("Sección",sectionSelect),
    field("Modelo de batería",kitSelect),
    field("Patrón",presetSelect),
    field("Compases",barsInput),
    field("Voz de percusión",percussionSelect),
    field("Swing",swingInput),
    field("Humanización",humanInput),
    field("Volumen general",masterInput)
  );
  config.appendChild(configGrid);

  const status=el("div","s936-dc-status","Activa las piezas del kit y dibuja los golpes. Un segundo clic convierte el golpe en acento.");
  const actions=el("div","s936-dc-actions");
  actions.append(
    button("Aplicar patrón","warn",()=>{syncConfig();applyPreset(pattern,presetSelect.value);persist(false);redraw();}),
    button("Añadir fill de toms","warn",()=>{syncConfig();addTomFill(pattern);persist(false);redraw();}),
    button("Guardar batería","primary",()=>persist(true)),
    button("Escuchar","primary",()=>play()),
    button("Stop","",()=>stopPlayback()),
    button("Limpiar","danger",()=>{clearHits(pattern);pattern.preset="custom";presetSelect.value="custom";persist(false);redraw();})
  );
  config.append(actions,status);
  shell.appendChild(config);

  const workspace=el("div","s936-dc-workspace");
  const kitPanel=el("section","s936-dc-panel");
  const kitHead=el("div","s936-dc-head");
  kitHead.append(el("b","","Instrumentos del kit"),el("span","","ON · Mute · Solo · Volumen"));
  kitPanel.appendChild(kitHead);
  const kitList=el("div","s936-dc-kit");
  kitPanel.appendChild(kitList);

  const gridPanel=el("section","s936-dc-panel");
  const gridHead=el("div","s936-dc-head");
  gridHead.append(el("b","","Secuenciador de pasos"),el("span","","Normal · Acento · OFF"));
  gridPanel.appendChild(gridHead);
  const gridWrap=el("div","s936-dc-grid-wrap");
  const grid=el("div","s936-dc-grid");
  gridWrap.appendChild(grid);
  gridPanel.appendChild(gridWrap);
  const legend=el("div","s936-dc-legend");
  legend.innerHTML='<span><i></i> Golpe normal</span><span><i class="accent"></i> Acento</span><span>Click: normal → acento → off</span>';
  gridPanel.appendChild(legend);

  workspace.append(kitPanel,gridPanel);
  shell.appendChild(workspace);
  host.appendChild(shell);

  function setStatus(message,error=false){
    status.textContent=message;
    status.classList.toggle("error",!!error);
  }
  function clearVisualTimers(){
    visualTimers.forEach(handle=>clearTimeout(handle));
    visualTimers.clear();
  }
  function sectionLabel(){
    const match=sectionOptions.find(entry=>String(entry?.[0])===String(sectionKey));
    return match?.[1] || options.sectionName || sectionKey;
  }
  function syncSurface(){
    return bridge("mountEditorDrumSurface",{
      sectionKey,
      sectionName:sectionLabel(),
      pattern:clone(pattern),
      onLaneSelect:laneId=>focusLane(laneId,true),
      onLaneTrigger:(laneId,velocity)=>previewLane(laneId,velocity)
    });
  }
  function focusLane(laneId,scroll=false){
    if(!LANES.some(def=>def.id===laneId)) return;
    selectedLaneId=laneId;
    kitList.querySelectorAll(".s936-dc-lane-control").forEach(row=>{
      row.classList.toggle("selected",row.dataset.lane===laneId);
    });
    const row=laneRows.get(laneId);
    if(scroll&&row?.scrollIntoView){
      row.scrollIntoView({block:"nearest",behavior:"smooth"});
    }
    bridge("selectEditorDrumLane",laneId);
  }
  function previewLane(laneId,velocity=.9){
    const def=LANES.find(item=>item.id===laneId);
    const lane=pattern.lanes[laneId];
    if(!def||!lane) return;
    focusLane(laneId,true);
    if(!ensureAudio()){
      setStatus("AudioContext no disponible.",true);
      return;
    }
    const when=audioCtx.currentTime+.015;
    playLane(laneId,clamp(velocity,0,1),pattern,when);
    bridge("flashEditorDrumLane",laneId,velocity,190);
    setStatus(`${def.label} · vista previa`);
  }
  function syncConfig(){
    pattern.kit=kitSelect.value;
    pattern.preset=presetSelect.value;
    pattern.percussionVoice=percussionSelect.value;
    pattern.swing=clamp(swingInput.value,0,.35);
    pattern.humanize=clamp(humanInput.value,0,.18);
    pattern.masterVolume=clamp(masterInput.value,0,1);
    const nextBars=clamp(barsInput.value,1,8);
    if(nextBars!==pattern.bars){
      pattern.bars=nextBars;
      const total=nextBars*16;
      LANES.forEach(def=>{
        Object.keys(pattern.lanes[def.id].hits).forEach(step=>{if(Number(step)>=total) delete pattern.lanes[def.id].hits[step];});
      });
    }
  }
  function persist(showMessage){
    syncConfig();
    const response=bridge("saveDrumPattern",sectionKey,pattern);
    if(response?.ok===false){setStatus(response.message||"No se pudo guardar la batería.",true);return response;}
    if(showMessage) setStatus("Patrón de batería guardado en la canción actual.");
    return response;
  }
  function anySolo(){
    return LANES.some(def=>pattern.lanes[def.id].solo);
  }
  function audibleLane(lane){
    if(!lane.enabled||lane.mute) return false;
    return anySolo()?lane.solo:true;
  }
  function toggleHit(laneId,step){
    const lane=pattern.lanes[laneId];
    if(!lane.enabled) return;
    const current=Number(lane.hits[step]||0);
    if(current<=0) lane.hits[step]=.72;
    else if(current<.9) lane.hits[step]=1;
    else delete lane.hits[step];
    pattern.preset="custom";
    presetSelect.value="custom";
    persist(false);redraw();
  }
  function redrawKit(){
    kitList.innerHTML="";
    laneRows.clear();
    LANES.forEach(def=>{
      const lane=pattern.lanes[def.id];
      const row=el("div","s936-dc-lane-control");
      row.dataset.lane=def.id;
      if(def.id===selectedLaneId) row.classList.add("selected");
      if(!lane.enabled) row.classList.add("off");
      if(lane.mute) row.classList.add("muted");
      if(lane.solo) row.classList.add("solo");
      const enabled=document.createElement("input");
      enabled.type="checkbox";enabled.checked=lane.enabled;
      enabled.title=`Activar ${def.label}`;
      enabled.addEventListener("change",()=>{lane.enabled=enabled.checked;persist(false);redraw();});
      const name=el("div","s936-dc-lane-name");
      const label=el("b","",def.label);
      label.title=`Seleccionar ${def.label}`;
      label.addEventListener("click",()=>focusLane(def.id,false));
      const volume=document.createElement("input");
      volume.type="range";volume.min="0";volume.max="1";volume.step=".01";volume.value=String(lane.volume);
      volume.title=`Volumen ${def.label}`;
      volume.addEventListener("input",()=>{lane.volume=clamp(volume.value,0,1);persist(false);syncSurface();});
      name.append(label,volume);
      const mute=el("button","s936-dc-mini"+(lane.mute?" active":""),"M");
      mute.type="button";mute.title="Mute";mute.addEventListener("click",()=>{lane.mute=!lane.mute;persist(false);redraw();});
      const solo=el("button","s936-dc-mini"+(lane.solo?" active":""),"S");
      solo.type="button";solo.title="Solo";solo.addEventListener("click",()=>{lane.solo=!lane.solo;persist(false);redraw();});
      row.append(enabled,name,mute,solo);
      kitList.appendChild(row);
      laneRows.set(def.id,row);
    });
  }
  function redrawGrid(){
    const total=pattern.bars*16;
    grid.style.setProperty("--steps",String(total));
    grid.innerHTML="";
    const header=el("div","s936-dc-grid-head");
    header.style.setProperty("--steps",String(total));
    header.appendChild(el("span","label","Kit"));
    for(let step=0;step<total;step++){
      const label=step%16===0?`C${Math.floor(step/16)+1}`:String((step%16)+1);
      header.appendChild(el("span","",label));
    }
    grid.appendChild(header);
    LANES.forEach(def=>{
      const lane=pattern.lanes[def.id];
      const row=el("div","s936-dc-grid-row");
      row.style.setProperty("--steps",String(total));
      row.appendChild(el("div","s936-dc-row-label",`${def.short} · ${def.label}`));
      for(let step=0;step<total;step++){
        const velocity=Number(lane.hits[step]||0);
        const cell=el("button","s936-dc-step","");
        cell.type="button";
        if(step%4===0) cell.classList.add("beat");
        if(step%16===0) cell.classList.add("bar");
        if(velocity>0) cell.classList.add("on");
        if(velocity>=.9) cell.classList.add("accent");
        if(step===playingStep) cell.classList.add("playing");
        if(!lane.enabled) cell.classList.add("disabled");
        cell.title=`${def.label} · paso ${step+1}${velocity?velocity>=.9?" · acento":" · golpe":""}`;
        cell.addEventListener("click",()=>toggleHit(def.id,step));
        row.appendChild(cell);
      }
      grid.appendChild(row);
    });
  }
  function redraw(){
    syncConfig();
    redrawKit();
    redrawGrid();
    gridHead.lastChild.textContent=`${pattern.bars} compás(es) · ${LANES.reduce((sum,def)=>sum+Object.keys(pattern.lanes[def.id].hits).length,0)} golpes`;
    syncSurface();
  }
  function playStep(step){
    const bpm=Number(state.bpm||options.bpm||95);
    const stepSeconds=60/bpm/4;
    const now=audioCtx.currentTime+.015;
    LANES.forEach(def=>{
      const lane=pattern.lanes[def.id];
      const velocity=Number(lane.hits[step]||0);
      if(!velocity||!audibleLane(lane)) return;
      const human=(Math.random()*2-1)*pattern.humanize*stepSeconds;
      const swing=(step%2?pattern.swing*stepSeconds:0);
      const when=Math.max(audioCtx.currentTime,now+human+swing);
      playLane(def.id,velocity,pattern,when);
      const delay=Math.max(0,(when-audioCtx.currentTime)*1000);
      const handle=setTimeout(()=>{
        visualTimers.delete(handle);
        bridge("flashEditorDrumLane",def.id,velocity,Math.max(90,stepSeconds*720));
      },delay);
      visualTimers.add(handle);
    });
  }
  function play(){
    syncConfig();
    if(!ensureAudio()){setStatus("AudioContext no disponible.",true);return;}
    if(timer) clearTimeout(timer);
    let step=0;
    const total=pattern.bars*16;
    const bpm=Number(state.bpm||options.bpm||95);
    const stepMs=60/bpm/4*1000;
    const tick=()=>{
      playingStep=step;
      playStep(step);
      redrawGrid();
      step++;
      if(step>=total){
        timer=setTimeout(()=>{playingStep=-1;redrawGrid();timer=null;},stepMs);
        return;
      }
      timer=setTimeout(tick,Math.max(20,stepMs));
    };
    tick();
    setStatus("Reproduciendo patrón de batería al tempo de la canción.");
  }
  function stopPlayback(){
    if(timer) clearTimeout(timer);
    timer=null;
    visualTimers.forEach(handle=>clearTimeout(handle));
    visualTimers.clear();
    window.Studio936DrumSurface?.clearActive?.();
    playingStep=-1;
    if(grid) redrawGrid();
    setStatus("Batería detenida.");
  }

  sectionSelect.addEventListener("change",()=>{
    persist(false);stopPlayback();options.onSectionChange?.(sectionSelect.value);
  });
  [kitSelect,presetSelect,barsInput,percussionSelect,swingInput,humanInput,masterInput].forEach(control=>control.addEventListener("change",()=>{
    syncConfig();persist(false);redraw();
  }));

  const controller={
    stop:stopPlayback,
    destroy(){
      stopPlayback();
      window.Studio936DrumSurface?.clearActive?.();
    },
    getPattern(){return clone(pattern);},
    selectLane:focusLane
  };
  activeController=controller;
  redraw();
  return controller;
}

function stop(){activeController?.stop?.();}
function getActiveController(){return activeController;}

window.Studio936DrumComposerPro={version:VERSION,render,stop,getActiveController,lanes:clone(LANES)};
})();
