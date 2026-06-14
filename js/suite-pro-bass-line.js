// Studio 936 Composer - Bass Line Pro v0.6.2 SAFE Isolation
// Section-based bass pattern editor. Musical logic lives here; app.js only provides audio/persistence bridge.
(function(){
"use strict";

const VERSION = "bass-line-v0.6";
const STYLE_ID = "s936BassLineProStyles";
const SCALE_INTERVALS = {
  major:[0,2,4,5,7,9,11],
  naturalMinor:[0,2,3,5,7,8,10],
  majorPent:[0,2,4,7,9],
  minorPent:[0,3,5,7,10],
  blues:[0,3,5,6,7,10],
  dorian:[0,2,3,5,7,9,10],
  mixolydian:[0,2,4,5,7,9,10],
  chromatic:[0,1,2,3,4,5,6,7,8,9,10,11]
};
const ROOTS = ["C","C#","D","Eb","E","F","F#","G","Ab","A","Bb","B"];
const PC = {C:0,"C#":1,Db:1,D:2,"D#":3,Eb:3,E:4,F:5,"F#":6,Gb:6,G:7,"G#":8,Ab:8,A:9,"A#":10,Bb:10,B:11};
const NOTE_SHARP = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const NOTE_FLAT = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
const DURATION_OPTIONS = [
  [1,"1/16"],
  [2,"1/8"],
  [4,"1 tiempo"],
  [8,"2 tiempos"],
  [16,"1 compás"],
  [32,"2 compases"]
];
const PATTERNS = [
  ["custom","Personalizado"],
  ["root","Fundamental"],
  ["root-fifth","Fundamental + quinta"],
  ["root-octave","Fundamental + octava"],
  ["root-fifth-octave","Raíz · quinta · octava · quinta"],
  ["scale-up","Escala ascendente"],
  ["walking","Walking sencillo"],
  ["syncopated","Sincopado"]
];

let activeInstance = null;
let previewTimer = null;

function clamp(n,min,max){ return Math.max(min,Math.min(max,Number(n)||0)); }
function clone(value){ try{return JSON.parse(JSON.stringify(value));}catch(error){return value;} }
function bridge(name,...args){
  const fn = window.Studio936AppBridge?.[name];
  if(typeof fn !== "function") return null;
  try{return fn(...args);}catch(error){console.warn("Bass Line Pro bridge:",name,error); return {ok:false,message:error.message};}
}
function el(tag,className="",text=""){
  const node = document.createElement(tag);
  if(className) node.className = className;
  if(text !== "") node.textContent = text;
  return node;
}
function option(value,label,selected){
  const node = document.createElement("option");
  node.value = String(value);
  node.textContent = label;
  node.selected = String(value) === String(selected);
  return node;
}
function field(label,control,className=""){
  const wrap = el("label","s936-bl-field "+className);
  wrap.append(el("span","",label),control);
  return wrap;
}
function button(label,className,handler){
  const node = el("button","s936-bl-btn "+(className||""),label);
  node.type = "button";
  node.addEventListener("click",handler);
  return node;
}
function installStyles(){
  if(document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
#s936SuitePro .s936-bl-shell{display:grid;gap:10px;margin-top:8px}
#s936SuitePro .s936-bl-modebar{display:grid;grid-template-columns:1fr 1fr;gap:6px}
#s936SuitePro .s936-bl-modebar button{border:1px solid rgba(255,255,255,.13);border-radius:10px;background:rgba(255,255,255,.045);color:#fff;padding:7px;font-size:.61rem;font-weight:950;text-transform:uppercase;cursor:pointer}
#s936SuitePro .s936-bl-modebar button.active{border-color:rgba(0,255,204,.65);background:rgba(0,255,204,.13);color:#bfffee}
#s936SuitePro .s936-bl-panel{border:1px solid rgba(255,255,255,.11);border-radius:14px;background:rgba(0,0,0,.18);padding:9px}
#s936SuitePro .s936-bl-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px}
#s936SuitePro .s936-bl-head b{font-size:.66rem;color:#ffe066;text-transform:uppercase;letter-spacing:.55px}
#s936SuitePro .s936-bl-head span{font-size:.55rem;color:rgba(255,255,255,.55)}
#s936SuitePro .s936-bl-config{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
#s936SuitePro .s936-bl-config.secondary{grid-template-columns:1.2fr .8fr .8fr;margin-top:6px}
#s936SuitePro .s936-bl-field{display:grid;gap:3px;min-width:0}
#s936SuitePro .s936-bl-field>span{font-size:.49rem;color:#ffe066;font-weight:950;text-transform:uppercase;letter-spacing:.45px}
#s936SuitePro .s936-bl-field input,#s936SuitePro .s936-bl-field select,#s936SuitePro .s936-bl-pattern-text{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.14);border-radius:9px;background:rgba(0,0,0,.3);color:#fff;padding:7px;font-size:.64rem;font-weight:800}
#s936SuitePro .s936-bl-check{display:flex;align-items:center;gap:6px;color:#fff;font-size:.59rem;font-weight:850;padding:6px 0}
#s936SuitePro .s936-bl-check input{accent-color:#00ffcc}
#s936SuitePro .s936-bl-actions{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}
#s936SuitePro .s936-bl-btn{border:1px solid rgba(255,255,255,.15);border-radius:999px;background:rgba(255,255,255,.055);color:#fff;padding:6px 9px;font-size:.54rem;font-weight:950;text-transform:uppercase;cursor:pointer}
#s936SuitePro .s936-bl-btn.primary{border-color:rgba(0,255,204,.55);background:rgba(0,255,204,.1);color:#bfffee}
#s936SuitePro .s936-bl-btn.warn{border-color:rgba(255,216,77,.6);background:rgba(255,216,77,.08);color:#ffe066}
#s936SuitePro .s936-bl-btn.danger{border-color:rgba(255,90,90,.55);background:rgba(255,90,90,.08);color:#ffbaba}
#s936SuitePro .s936-bl-now{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;border:1px solid rgba(0,255,204,.28);border-radius:11px;background:rgba(0,255,204,.055);padding:7px 9px;margin-top:7px}
#s936SuitePro .s936-bl-now strong{display:block;color:#bfffee;font-size:.68rem}
#s936SuitePro .s936-bl-now span{display:block;color:rgba(255,255,255,.58);font-size:.53rem;margin-top:2px}
#s936SuitePro .s936-bl-now em{font-style:normal;color:#ffe066;font-size:.64rem;font-weight:950}
#s936SuitePro .s936-bl-timeline-wrap{overflow-x:auto;padding-bottom:4px}
#s936SuitePro .s936-bl-timeline{display:grid;grid-auto-flow:column;grid-auto-columns:40px;gap:3px;min-width:max-content}
#s936SuitePro .s936-bl-step{position:relative;height:52px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:rgba(255,255,255,.035);color:rgba(255,255,255,.72);padding:4px 2px;font-size:.48rem;font-weight:850;cursor:pointer}
#s936SuitePro .s936-bl-step.beat{border-color:rgba(255,216,77,.28)}
#s936SuitePro .s936-bl-step.bar{box-shadow:-2px 0 0 rgba(0,255,204,.45)}
#s936SuitePro .s936-bl-step.selected{outline:2px solid #ffe066;background:rgba(255,216,77,.11)}
#s936SuitePro .s936-bl-step.playing{outline:2px solid #00ffcc;background:rgba(0,255,204,.15)}
#s936SuitePro .s936-bl-step .num{display:block;color:rgba(255,255,255,.38);font-size:.43rem}
#s936SuitePro .s936-bl-step .note{display:block;color:#bfffee;font-size:.58rem;margin-top:6px}
#s936SuitePro .s936-bl-step .dur{display:block;color:#ffe066;font-size:.42rem;margin-top:2px}
#s936SuitePro .s936-bl-step.rest .note{color:#ffbaba}
#s936SuitePro .s936-bl-events{display:grid;gap:4px;max-height:170px;overflow:auto}
#s936SuitePro .s936-bl-event{display:grid;grid-template-columns:42px 1fr 82px 30px;gap:5px;align-items:center;border:1px solid rgba(255,255,255,.09);border-radius:9px;background:rgba(255,255,255,.03);padding:5px}
#s936SuitePro .s936-bl-event.active{border-color:rgba(0,255,204,.48);background:rgba(0,255,204,.07)}
#s936SuitePro .s936-bl-event button.select{border:0;background:transparent;color:#ffe066;font-size:.52rem;font-weight:950;cursor:pointer}
#s936SuitePro .s936-bl-event b{color:#bfffee;font-size:.63rem}
#s936SuitePro .s936-bl-event select{border:1px solid rgba(255,255,255,.13);border-radius:7px;background:#111;color:#fff;padding:4px;font-size:.53rem}
#s936SuitePro .s936-bl-event button.remove{border:0;border-radius:50%;background:rgba(255,90,90,.12);color:#ffbaba;width:26px;height:26px;cursor:pointer}
#s936SuitePro .s936-bl-status{min-height:18px;color:rgba(255,255,255,.63);font-size:.56rem;line-height:1.35}
#s936SuitePro .s936-bl-status.error{color:#ffbaba}
#s936SuitePro .s936-bl-note-help{font-size:.53rem;color:rgba(255,255,255,.52);line-height:1.4;margin-top:6px}
@media(max-width:720px){
 #s936SuitePro .s936-bl-config,#s936SuitePro .s936-bl-config.secondary{grid-template-columns:1fr 1fr}
 #s936SuitePro .s936-bl-event{grid-template-columns:36px 1fr 72px 28px}
}
`;
  document.head.appendChild(style);
}
function midiName(midi,flats=false){
  const n=Math.round(Number(midi));
  if(!Number.isFinite(n)) return "";
  const names=flats?NOTE_FLAT:NOTE_SHARP;
  return names[((n%12)+12)%12]+(Math.floor(n/12)-1);
}
function rootPc(root){ return PC[root] ?? 0; }
function chordRoot(name,fallback){
  const match=String(name||"").match(/^\s*([A-Ga-g])([#b]?)/);
  if(!match) return fallback;
  return match[1].toUpperCase()+(match[2]||"");
}
function playableRootMidi(root){
  const pc=rootPc(root);
  for(let midi=28;midi<=52;midi++) if(midi%12===pc) return midi;
  return 36;
}
function bassProfile(){
  return window.Studio936StringInstruments?.profile?.("bass") || {
    id:"bass",label:"Bajo eléctrico",shapeOrder:"4→1",maxFret:24,
    strings:[
      {number:4,label:"E",open:"E1",midi:28},
      {number:3,label:"A",open:"A1",midi:33},
      {number:2,label:"D",open:"D2",midi:38},
      {number:1,label:"G",open:"G2",midi:43}
    ]
  };
}
function positionForMidi(midi,previous=null){
  const profile=bassProfile();
  const candidates=[];
  profile.strings.forEach((string,index)=>{
    const fret=Math.round(midi-string.midi);
    if(fret>=0 && fret<=profile.maxFret){
      const prevPenalty=previous && Number.isFinite(previous.fret)?Math.abs(fret-previous.fret)*.8:0;
      candidates.push({stringIndex:index,stringNumber:string.number,fret,midi,note:midiName(midi),score:fret+prevPenalty+index*.25});
    }
  });
  if(!candidates.length){
    let shifted=midi;
    while(shifted<28) shifted+=12;
    while(shifted>67) shifted-=12;
    if(shifted!==midi) return positionForMidi(shifted,previous);
    return null;
  }
  candidates.sort((a,b)=>a.score-b.score);
  return candidates[0];
}
function normalizeLine(raw={},sectionChords=[],bpm=95){
  const totalBars=Math.max(1,Math.min(64,Number(raw.bars)||sectionChords.reduce((sum,ch)=>sum+(Number(ch.bars)||1),0)||1));
  const totalSteps=totalBars*16;
  const line={
    version:1,
    root:ROOTS.includes(raw.root)?raw.root:(chordRoot(sectionChords[0]?.name,"C")),
    scale:SCALE_INTERVALS[raw.scale]?raw.scale:"major",
    patternId:PATTERNS.some(p=>p[0]===raw.patternId)?raw.patternId:"custom",
    followChords:raw.followChords!==false,
    bars:totalBars,
    stepsPerBar:16,
    bpm:clamp(raw.bpm||bpm,40,240),
    defaultDuration:[1,2,4,8,16,32].includes(Number(raw.defaultDuration))?Number(raw.defaultDuration):4,
    events:[]
  };
  if(Array.isArray(raw.events)){
    line.events=raw.events.map((event,index)=>{
      const step=clamp(event.step,0,totalSteps-1);
      const rest=event.rest===true || String(event.note||"").toUpperCase()==="R";
      const midi=rest?null:Number(event.midi);
      const position=!rest && Number.isFinite(midi)
        ? positionForMidi(Math.round(midi),event)
        : null;
      return {
        id:String(event.id||`bl_${Date.now()}_${index}`),
        step,
        durationSteps:[1,2,4,8,16,32].includes(Number(event.durationSteps))?Number(event.durationSteps):line.defaultDuration,
        rest,
        note:rest?"R":String(event.note||position?.note||midiName(midi)),
        midi:rest?null:(Number.isFinite(midi)?Math.round(midi):position?.midi),
        stringIndex:rest?null:clamp(Number(event.stringIndex ?? position?.stringIndex),0,3),
        stringNumber:rest?null:Number(event.stringNumber||position?.stringNumber||4),
        fret:rest?null:clamp(Number(event.fret ?? position?.fret),0,24)
      };
    }).filter(event=>event.step<totalSteps);
  }
  line.events.sort((a,b)=>a.step-b.step);
  return line;
}
function eventAt(line,step){ return line.events.find(event=>Number(event.step)===Number(step))||null; }
function upsertEvent(line,event){
  line.events=line.events.filter(item=>Number(item.step)!==Number(event.step));
  line.events.push(event);
  line.events.sort((a,b)=>a.step-b.step);
}
function durationLabel(steps){
  return (DURATION_OPTIONS.find(entry=>entry[0]===Number(steps))||[steps,`${steps} pasos`])[1];
}
function chordAtStep(chords,step){
  let cursor=0;
  for(let index=0;index<chords.length;index++){
    const span=(Number(chords[index].bars)||1)*16;
    if(step<cursor+span) return {item:chords[index],index,start:cursor,end:cursor+span};
    cursor+=span;
  }
  return {item:chords[chords.length-1]||null,index:Math.max(0,chords.length-1),start:Math.max(0,cursor-16),end:cursor};
}
function scaleMidi(root,degree,octaveShift=0){
  const intervals=SCALE_INTERVALS.major;
  const rootMidi=playableRootMidi(root);
  return rootMidi+degree+octaveShift*12;
}
function patternTemplate(id){
  switch(id){
    case "root": return [{step:0,interval:0,dur:8},{step:8,interval:0,dur:8}];
    case "root-fifth": return [{step:0,interval:0,dur:4},{step:4,interval:7,dur:4},{step:8,interval:0,dur:4},{step:12,interval:7,dur:4}];
    case "root-octave": return [{step:0,interval:0,dur:4},{step:4,interval:12,dur:4},{step:8,interval:0,dur:4},{step:12,interval:12,dur:4}];
    case "root-fifth-octave": return [{step:0,interval:0,dur:4},{step:4,interval:7,dur:4},{step:8,interval:12,dur:4},{step:12,interval:7,dur:4}];
    case "scale-up": return [0,2,4,6,8,10,12,14].map((step,index)=>({step,scaleIndex:index,dur:2}));
    case "walking": return [0,4,8,12].map((step,index)=>({step,scaleIndex:index,dur:4}));
    case "syncopated": return [
      {step:0,interval:0,dur:2},{step:3,interval:7,dur:2},{step:6,interval:12,dur:2},
      {step:10,interval:7,dur:2},{step:14,interval:0,dur:2}
    ];
    default:return [];
  }
}
function generatePattern(line,chords){
  if(line.patternId==="custom") return line.events;
  const events=[];
  let previous=null;
  const scale=SCALE_INTERVALS[line.scale]||SCALE_INTERVALS.major;
  for(let bar=0;bar<line.bars;bar++){
    const baseStep=bar*16;
    const context=chordAtStep(chords,baseStep);
    const root=line.followChords?chordRoot(context.item?.name,line.root):line.root;
    const baseMidi=playableRootMidi(root);
    patternTemplate(line.patternId).forEach((entry,index)=>{
      const interval=Number.isFinite(entry.scaleIndex)
        ? scale[entry.scaleIndex%scale.length]+Math.floor(entry.scaleIndex/scale.length)*12
        : entry.interval;
      let midi=baseMidi+interval;
      while(midi>64) midi-=12;
      const position=positionForMidi(midi,previous);
      if(!position) return;
      previous=position;
      events.push({
        id:`gen_${bar}_${index}_${Date.now()}`,
        step:baseStep+entry.step,
        durationSteps:entry.dur||line.defaultDuration,
        rest:false,
        note:position.note,
        midi:position.midi,
        stringIndex:position.stringIndex,
        stringNumber:position.stringNumber,
        fret:position.fret
      });
    });
  }
  return events;
}
function summaryText(line){
  return line.events.map(event=>`${event.rest?"R":event.note}:${event.durationSteps}`).join(" ");
}
function parsePatternText(text,line){
  const tokens=String(text||"").trim().split(/\s+/).filter(Boolean);
  const events=[];
  let step=0;
  let previous=null;
  tokens.forEach((token,index)=>{
    const match=token.match(/^([^:]+)(?::(\d+))?$/);
    if(!match) return;
    const note=match[1];
    const duration=[1,2,4,8,16,32].includes(Number(match[2]))?Number(match[2]):line.defaultDuration;
    if(note.toUpperCase()==="R"){
      events.push({id:`txt_${Date.now()}_${index}`,step,durationSteps:duration,rest:true,note:"R",midi:null,stringIndex:null,stringNumber:null,fret:null});
    }else{
      const midi=noteToMidi(note);
      const position=Number.isFinite(midi)?positionForMidi(midi,previous):null;
      if(position){
        previous=position;
        events.push({id:`txt_${Date.now()}_${index}`,step,durationSteps:duration,rest:false,note:position.note,midi:position.midi,stringIndex:position.stringIndex,stringNumber:position.stringNumber,fret:position.fret});
      }
    }
    step+=duration;
  });
  return events.filter(event=>event.step<line.bars*16);
}
function noteToMidi(note){
  const match=String(note||"").trim().match(/^([A-Ga-g])([#b]?)(-?\d+)$/);
  if(!match) return null;
  const key=match[1].toUpperCase()+(match[2]||"");
  const pc=PC[key];
  if(pc===undefined) return null;
  return (Number(match[3])+1)*12+pc;
}
function bassSurfacePayload(sectionKey,line,event,chords){
  const profile=bassProfile();
  const exactFrets=profile.strings.map(()=>null);
  const exactStrings=profile.strings.map(string=>({
    stringNumber:string.number,fret:null,physicalFret:null,midi:null,note:"",finger:""
  }));
  const exactMidis=[];
  if(event && !event.rest && Number.isFinite(Number(event.midi))){
    const index=clamp(event.stringIndex,0,profile.strings.length-1);
    const fret=clamp(event.fret,0,profile.maxFret);
    const midi=Math.round(Number(event.midi));
    exactFrets[index]=fret;
    exactMidis.push(midi);
    exactStrings[index]={
      stringNumber:profile.strings[index].number,
      fret,physicalFret:fret,midi,
      note:String(event.note||midiName(midi)),
      finger:""
    };
  }
  const context=chordAtStep(chords,Number(event?.step)||0);
  return {
    surfaceMode:"bass-line",
    instrument:"bass",
    sectionKey,
    chordIndex:context.index,
    name:event ? `${event.rest?"Silencio":event.note} · paso ${(Number(event.step)||0)+1}` : "Selecciona un paso y toca una nota",
    bass:event?.note||"",
    notes:event?.note||"",
    bars:context.item?.bars||1,
    exactMidis,exactFrets,exactStrings,
    capo:0,barre:null,
    seq:chords
  };
}
function showEventSurface(sectionKey,line,event,chords){
  const editorState=bridge("getEditorState")||{};
  const sectionName=(editorState.sectionOptions||[]).find(entry=>entry[0]===sectionKey)?.[1]||sectionKey;
  const data=bassSurfacePayload(sectionKey,line,event,chords);
  data.sectionName=sectionName;
  const result=bridge("showEditorChordVisual",data);
  if(result?.ok===false){
    console.warn("Bass Line Pro: no se pudo mostrar la superficie del Bajo.",result.message||result);
  }
}
function stopCursor(){
  if(previewTimer){ clearInterval(previewTimer); previewTimer=null; }
}
function render(options={}){
  installStyles();
  stopCursor();
  const host=options.host;
  if(!host) return null;
  const state=bridge("getEditorState")||{};
  const chords=Array.isArray(state.sections?.[options.sectionKey])
    ? state.sections[options.sectionKey]
    : (options.sections?.[options.sectionKey]||[]);
  let line=normalizeLine(state.bassLines?.[options.sectionKey]||{},chords,state.bpm||options.bpm||95);
  let selectedStep=0;
  let selectedEventId=null;
  let selectedDuration=line.defaultDuration;
  let playingStep=-1;
  let scheduledTimers=[];

  const shell=el("div","s936-bl-shell");
  const modebar=el("div","s936-bl-modebar");
  const lineMode=el("button","active","Línea / patrón");
  const positionMode=el("button","","Posición / voicing");
  positionMode.type="button";
  positionMode.addEventListener("click",()=>options.onPositionMode?.());
  modebar.append(lineMode,positionMode);
  shell.appendChild(modebar);

  const configPanel=el("section","s936-bl-panel");
  const configHead=el("div","s936-bl-head");
  configHead.append(el("b","","Bass Line Pro · patrón por sección"),el("span","",`${state.bpm||options.bpm||95} BPM · 4/4`));
  configPanel.appendChild(configHead);

  const sectionSelect=document.createElement("select");
  (state.sectionOptions||options.sectionOptions||[]).forEach(entry=>sectionSelect.appendChild(option(entry[0],entry[1],options.sectionKey)));
  const rootSelect=document.createElement("select");
  ROOTS.forEach(root=>rootSelect.appendChild(option(root,root,line.root)));
  const scaleSelect=document.createElement("select");
  [
    ["major","Mayor"],["naturalMinor","Menor natural"],["majorPent","Pentatónica mayor"],
    ["minorPent","Pentatónica menor"],["blues","Blues"],["dorian","Dórica"],
    ["mixolydian","Mixolidia"],["chromatic","Cromática"]
  ].forEach(entry=>scaleSelect.appendChild(option(entry[0],entry[1],line.scale)));
  const patternSelect=document.createElement("select");
  PATTERNS.forEach(entry=>patternSelect.appendChild(option(entry[0],entry[1],line.patternId)));
  const barsInput=document.createElement("input");
  barsInput.type="number"; barsInput.min="1"; barsInput.max="64"; barsInput.value=String(line.bars);
  const durationSelect=document.createElement("select");
  DURATION_OPTIONS.forEach(entry=>durationSelect.appendChild(option(entry[0],entry[1],line.defaultDuration)));

  const row1=el("div","s936-bl-config");
  row1.append(field("Sección",sectionSelect),field("Fundamental",rootSelect),field("Escala",scaleSelect));
  const row2=el("div","s936-bl-config secondary");
  row2.append(field("Patrón base",patternSelect),field("Compases",barsInput),field("Duración al escribir",durationSelect));
  configPanel.append(row1,row2);

  const followLabel=el("label","s936-bl-check");
  const follow=document.createElement("input");
  follow.type="checkbox"; follow.checked=line.followChords;
  followLabel.append(follow,document.createTextNode("Follow Chords · adaptar la fundamental del patrón al acorde que está sonando"));
  configPanel.appendChild(followLabel);

  const status=el("div","s936-bl-status","Selecciona un paso y toca una posición en el cuello del bajo.");
  const actions=el("div","s936-bl-actions");
  const generateBtn=button("Generar patrón","warn",()=>{ line.events=generatePattern(line,chords); selectedStep=0; selectedEventId=line.events[0]?.id||null; persist(false); redraw(); });
  const saveBtn=button("Guardar línea","primary",()=>persist(true));
  const playBtn=button("Escuchar","primary",()=>play());
  const stopBtn=button("Stop","",()=>stop());
  const restBtn=button("Insertar silencio","",()=>insertRest());
  const clearBtn=button("Limpiar","danger",()=>{ line.events=[]; selectedEventId=null; selectedStep=0; persist(false); redraw(); });
  actions.append(generateBtn,saveBtn,playBtn,stopBtn,restBtn,clearBtn);
  configPanel.append(actions,status);
  shell.appendChild(configPanel);

  const now=el("div","s936-bl-now");
  const nowInfo=el("div");
  const nowTitle=el("strong","","Paso 1 · listo para escribir");
  const nowMeta=el("span","",`Duración ${durationLabel(selectedDuration)} · clic en el cuello para agregar nota`);
  nowInfo.append(nowTitle,nowMeta);
  const nowChord=el("em","",chords[0]?.name||line.root);
  now.append(nowInfo,nowChord);
  shell.appendChild(now);

  const timelinePanel=el("section","s936-bl-panel");
  const timelineHead=el("div","s936-bl-head");
  timelineHead.append(el("b","","Timeline · 16 pasos por compás"),el("span","",`${line.bars} compás(es)`));
  timelinePanel.appendChild(timelineHead);
  const timelineWrap=el("div","s936-bl-timeline-wrap");
  const timeline=el("div","s936-bl-timeline");
  timelineWrap.appendChild(timeline);
  timelinePanel.appendChild(timelineWrap);
  shell.appendChild(timelinePanel);

  const eventPanel=el("section","s936-bl-panel");
  const eventHead=el("div","s936-bl-head");
  eventHead.append(el("b","","Patrón escrito"),el("span","","Nota : duración en pasos"));
  eventPanel.appendChild(eventHead);
  const patternText=document.createElement("textarea");
  patternText.className="s936-bl-pattern-text";
  patternText.rows=2;
  patternText.placeholder="C2:4 G2:2 R:2 C3:8";
  const interpretBtn=button("Interpretar texto","",()=>{
    line.events=parsePatternText(patternText.value,line);
    selectedEventId=line.events[0]?.id||null;
    selectedStep=line.events[0]?.step||0;
    persist(false); redraw();
  });
  const eventsBox=el("div","s936-bl-events");
  eventPanel.append(patternText,interpretBtn,eventsBox);
  shell.appendChild(eventPanel);
  host.appendChild(shell);

  function setStatus(message,error=false){
    status.textContent=message;
    status.classList.toggle("error",!!error);
  }
  function syncConfig(){
    line.root=rootSelect.value;
    line.scale=scaleSelect.value;
    line.patternId=patternSelect.value;
    line.followChords=follow.checked;
    line.bars=clamp(barsInput.value,1,64);
    line.defaultDuration=Number(durationSelect.value)||4;
    selectedDuration=line.defaultDuration;
    const total=line.bars*16;
    line.events=line.events.filter(event=>event.step<total);
    selectedStep=clamp(selectedStep,0,total-1);
  }
  function persist(showMessage){
    syncConfig();
    const response=bridge("saveBassLine",options.sectionKey,line);
    if(response?.ok===false) return setStatus(response.message||"No se pudo guardar.",true);
    if(showMessage) setStatus("Línea de bajo guardada en la canción actual.");
    return response;
  }
  function selectedEvent(){
    return line.events.find(event=>event.id===selectedEventId)||eventAt(line,selectedStep);
  }
  function selectStep(step){
    selectedStep=clamp(step,0,line.bars*16-1);
    const event=eventAt(line,selectedStep);
    selectedEventId=event?.id||null;
    if(event) selectedDuration=event.durationSteps;
    showEventSurface(options.sectionKey,line,event,chords);
    redraw();
  }
  function addFromFret(stringIndex,fret){
    syncConfig();
    if(fret===null){
      insertRest();
      return;
    }
    const profile=bassProfile();
    const index=clamp(stringIndex,0,profile.strings.length-1);
    const normalized=clamp(fret,0,profile.maxFret);
    const midi=profile.strings[index].midi+normalized;
    const event={
      id:`bass_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      step:selectedStep,
      durationSteps:selectedDuration,
      rest:false,
      note:midiName(midi),
      midi,
      stringIndex:index,
      stringNumber:profile.strings[index].number,
      fret:normalized
    };
    upsertEvent(line,event);
    selectedEventId=event.id;
    persist(false);
    showEventSurface(options.sectionKey,line,event,chords);
    setStatus(`${event.note} escrita en paso ${event.step+1} por ${durationLabel(event.durationSteps)}.`);
    selectedStep=clamp(event.step+event.durationSteps,0,line.bars*16-1);
    redraw();
  }
  function insertRest(){
    syncConfig();
    const event={
      id:`rest_${Date.now()}`,step:selectedStep,durationSteps:selectedDuration,
      rest:true,note:"R",midi:null,stringIndex:null,stringNumber:null,fret:null
    };
    upsertEvent(line,event);
    selectedEventId=event.id;
    persist(false);
    setStatus(`Silencio escrito en paso ${event.step+1}.`);
    selectedStep=clamp(event.step+event.durationSteps,0,line.bars*16-1);
    showEventSurface(options.sectionKey,line,event,chords);
    redraw();
  }
  function removeEvent(id){
    line.events=line.events.filter(event=>event.id!==id);
    if(selectedEventId===id) selectedEventId=null;
    persist(false); redraw();
  }
  function updateDuration(id,value){
    const event=line.events.find(item=>item.id===id);
    if(!event) return;
    event.durationSteps=Number(value)||4;
    selectedDuration=event.durationSteps;
    persist(false); redraw();
  }
  function redraw(){
    syncConfig();
    patternText.value=summaryText(line);
    const totalSteps=line.bars*16;
    timeline.innerHTML="";
    for(let step=0;step<totalSteps;step++){
      const event=eventAt(line,step);
      const cell=el("button","s936-bl-step","");
      cell.type="button";
      if(step%4===0) cell.classList.add("beat");
      if(step%16===0) cell.classList.add("bar");
      if(step===selectedStep) cell.classList.add("selected");
      if(step===playingStep) cell.classList.add("playing");
      if(event?.rest) cell.classList.add("rest");
      cell.appendChild(el("span","num",String(step+1)));
      if(event){
        cell.appendChild(el("span","note",event.rest?"R":event.note));
        cell.appendChild(el("span","dur",durationLabel(event.durationSteps)));
      }
      cell.addEventListener("click",()=>selectStep(step));
      timeline.appendChild(cell);
    }
    eventsBox.innerHTML="";
    line.events.forEach(event=>{
      const row=el("div","s936-bl-event"+(event.id===selectedEventId?" active":""));
      const select=el("button","select",`P${event.step+1}`);
      select.type="button"; select.addEventListener("click",()=>{selectedEventId=event.id;selectedStep=event.step;selectedDuration=event.durationSteps;showEventSurface(options.sectionKey,line,event,chords);redraw();});
      const note=el("b","",event.rest?"Silencio":`${event.note} · C${event.stringNumber}/T${event.fret}`);
      const duration=document.createElement("select");
      DURATION_OPTIONS.forEach(entry=>duration.appendChild(option(entry[0],entry[1],event.durationSteps)));
      duration.addEventListener("change",()=>updateDuration(event.id,duration.value));
      const remove=el("button","remove","×");
      remove.type="button"; remove.title="Borrar evento"; remove.addEventListener("click",()=>removeEvent(event.id));
      row.append(select,note,duration,remove);
      eventsBox.appendChild(row);
    });
    const context=chordAtStep(chords,selectedStep);
    nowTitle.textContent=`Paso ${selectedStep+1}${selectedEvent()?` · ${selectedEvent().note}`:" · listo para escribir"}`;
    nowMeta.textContent=`Duración ${durationLabel(selectedDuration)} · ${selectedEvent()?"seleccionado":"clic en el cuello para agregar nota"}`;
    nowChord.textContent=context.item?.name||line.root;
    timelineHead.lastChild.textContent=`${line.bars} compás(es) · ${line.events.length} evento(s)`;
  }
  function clearScheduledAudio(){
    scheduledTimers.forEach(timer=>clearTimeout(timer));
    scheduledTimers=[];
  }
  function play(){
    syncConfig();
    if(!line.events.length) return setStatus("La línea está vacía. Genera un patrón o escribe notas desde el cuello.",true);
    stopCursor();
    clearScheduledAudio();
    bridge("mountEditorInstrumentSurface","bass");
    const bpm=Number(state.bpm||options.bpm||95);
    const stepSeconds=60/bpm/4;
    const totalSteps=line.bars*16;
    const sounding=line.events.filter(event=>!event.rest && Number.isFinite(Number(event.midi)));
    if(!sounding.length) return setStatus("La línea no contiene notas sonoras.",true);

    sounding.forEach(event=>{
      const timer=setTimeout(()=>{
        const payload=bassSurfacePayload(options.sectionKey,line,event,chords);
        payload.noteDuration=Math.max(.08,(Number(event.durationSteps)||1)*stepSeconds*.92);
        bridge("previewEditorChord",payload);
      },Math.max(0,(Number(event.step)||0)*stepSeconds*1000));
      scheduledTimers.push(timer);
    });

    const started=performance.now();
    previewTimer=setInterval(()=>{
      const elapsed=performance.now()-started;
      playingStep=Math.min(totalSteps-1,Math.floor(elapsed/(stepSeconds*1000)));
      redraw();
      if(elapsed>=totalSteps*stepSeconds*1000){
        stopCursor();
        clearScheduledAudio();
        playingStep=-1;
        redraw();
      }
    },45);
    setStatus("Reproduciendo línea de bajo al tempo de la canción.");
  }
  function stop(){
    stopCursor();
    clearScheduledAudio();
    playingStep=-1;
    redraw();
    setStatus("Reproducción detenida.");
  }

  sectionSelect.addEventListener("change",()=>{
    persist(false);
    stop();
    options.onSectionChange?.(sectionSelect.value);
  });
  [rootSelect,scaleSelect,patternSelect,barsInput,durationSelect,follow].forEach(control=>control.addEventListener("change",()=>{
    syncConfig(); persist(false); redraw();
  }));

  const controller={
    setFret(stringIndex,fret){ addFromFret(stringIndex,fret); },
    setFinger(){},
    selectChord(index){
      let start=0;
      for(let i=0;i<Number(index);i++) start+=(Number(chords[i]?.bars)||1)*16;
      selectStep(start);
    },
    stop,
    getLine(){return clone(line);}
  };
  activeInstance=controller;
  redraw();
  const first=selectedEvent()||line.events[0]||null;
  showEventSurface(options.sectionKey,line,first,chords);
  return controller;
}

function getActiveController(){ return activeInstance; }

window.Studio936BassLinePro={version:VERSION,render,normalizeLine,getActiveController};
})();
