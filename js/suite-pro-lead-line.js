// Studio 936 Composer - Guitar Lead Pro v0.7.1
// Section-based melodic sequencer for lead guitar. Uses the shared guitar neck and project bridge.
(function(){
"use strict";

const VERSION = "lead-line-v0.7.1";
const STYLE_ID = "s936LeadLineStyles";
const Core = window.Studio936SequencerCore;
const Strings = window.Studio936StringInstruments;
const ROOTS = ["C","C#","D","Eb","E","F","F#","G","Ab","A","Bb","B"];
const SCALES = [
  ["major","Mayor"],
  ["naturalMinor","Menor natural"],
  ["majorPent","Pentatónica mayor"],
  ["minorPent","Pentatónica menor"],
  ["blues","Blues"],
  ["dorian","Dórica"],
  ["mixolydian","Mixolidia"],
  ["chromatic","Cromática"]
];
const MOTIFS = [
  ["custom","Personalizado"],
  ["scale-up","Escala ascendente"],
  ["scale-down","Escala descendente"],
  ["pentatonic","Frase pentatónica"],
  ["blues","Frase blues"],
  ["chord-arpeggio","Arpegio del acorde"],
  ["question-answer","Pregunta y respuesta"],
  ["repeat","Motivo repetido"]
];
const ARTICULATIONS = [
  ["normal","Normal"],
  ["legato","Legato"],
  ["staccato","Staccato"],
  ["accent","Acento"],
  ["bend","Bend guía"],
  ["slide","Slide guía"]
];

let activeController = null;
let cursorTimer = null;

function bridge(name,...args){
  const fn = window.Studio936AppBridge?.[name];
  if(typeof fn !== "function") return null;
  try { return fn(...args); }
  catch(error){
    console.warn("Guitar Lead bridge:",name,error);
    return {ok:false,message:error.message};
  }
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
  const wrap = el("label","s936-ll-field "+className);
  wrap.append(el("span","",label),control);
  return wrap;
}
function button(label,className,handler){
  const node = el("button","s936-ll-btn "+(className||""),label);
  node.type = "button";
  node.addEventListener("click",handler);
  return node;
}
function clone(value){
  return Core?.clone ? Core.clone(value) : JSON.parse(JSON.stringify(value));
}
function clamp(value,min,max){
  return Core?.clamp ? Core.clamp(value,min,max) : Math.max(min,Math.min(max,Number(value)||0));
}
function uid(prefix){
  return Core?.uid ? Core.uid(prefix) : `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
}
function durationLabel(steps){
  return Core?.durationLabel ? Core.durationLabel(steps) : `${steps} pasos`;
}
function installStyles(){
  if(document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
#s936SuitePro .s936-ll-shell{display:grid;gap:10px;margin-top:8px}
#s936SuitePro .s936-ll-panel{border:1px solid rgba(255,255,255,.13);border-radius:15px;background:rgba(255,255,255,.045);padding:11px}
#s936SuitePro .s936-ll-panel.primary{border-color:rgba(255,90,190,.38);background:linear-gradient(135deg,rgba(255,80,180,.09),rgba(100,70,255,.06))}
#s936SuitePro .s936-ll-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
#s936SuitePro .s936-ll-head b{color:#ff9cde;font-size:.82rem;letter-spacing:.5px;text-transform:uppercase}
#s936SuitePro .s936-ll-head span{color:rgba(255,255,255,.55);font-size:.66rem}
#s936SuitePro .s936-ll-config{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
#s936SuitePro .s936-ll-config.secondary{grid-template-columns:1.4fr .8fr .9fr}
#s936SuitePro .s936-ll-field{display:grid;gap:4px;min-width:0}
#s936SuitePro .s936-ll-field>span{color:rgba(255,255,255,.58);font-size:.62rem;font-weight:800;text-transform:uppercase;letter-spacing:.45px}
#s936SuitePro .s936-ll-field select,#s936SuitePro .s936-ll-field input,#s936SuitePro .s936-ll-pattern-text{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.13);border-radius:9px;background:#111722;color:#fff;padding:8px;font-size:.74rem}
#s936SuitePro .s936-ll-check{display:flex;align-items:center;gap:7px;margin-top:8px;color:rgba(255,255,255,.7);font-size:.7rem}
#s936SuitePro .s936-ll-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}
#s936SuitePro .s936-ll-btn{border:1px solid rgba(255,255,255,.14);border-radius:9px;background:rgba(255,255,255,.07);color:#fff;padding:8px 10px;font-size:.7rem;font-weight:800;cursor:pointer}
#s936SuitePro .s936-ll-btn.primary{background:linear-gradient(135deg,#b52cff,#ff4fb2);border-color:transparent}
#s936SuitePro .s936-ll-btn.warn{background:rgba(255,190,50,.13);border-color:rgba(255,190,50,.38);color:#ffd77b}
#s936SuitePro .s936-ll-btn.danger{background:rgba(255,80,80,.1);border-color:rgba(255,80,80,.35);color:#ffaaaa}
#s936SuitePro .s936-ll-status{margin-top:8px;border-radius:9px;background:rgba(0,0,0,.25);padding:8px;color:#b7ffe9;font-size:.7rem}
#s936SuitePro .s936-ll-status.error{color:#ffabab}
#s936SuitePro .s936-ll-now{display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:9px;background:rgba(0,0,0,.2)}
#s936SuitePro .s936-ll-now div{display:grid;gap:2px}
#s936SuitePro .s936-ll-now strong{font-size:.79rem;color:#fff}
#s936SuitePro .s936-ll-now span{font-size:.65rem;color:rgba(255,255,255,.55)}
#s936SuitePro .s936-ll-now em{font-style:normal;color:#ff9cde;font-size:.72rem;font-weight:900}
#s936SuitePro .s936-ll-timeline-wrap{overflow-x:auto;padding-bottom:4px}
#s936SuitePro .s936-ll-timeline{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(52px,1fr);gap:4px;min-width:max-content}
#s936SuitePro .s936-ll-step{height:64px;display:grid;align-content:center;justify-items:center;gap:2px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:rgba(255,255,255,.035);color:#fff;cursor:pointer}
#s936SuitePro .s936-ll-step.beat{border-top-color:rgba(255,210,80,.65)}
#s936SuitePro .s936-ll-step.bar{box-shadow:inset 3px 0 0 rgba(255,255,255,.18)}
#s936SuitePro .s936-ll-step.selected{outline:2px solid #ff64c8;background:rgba(255,70,190,.14)}
#s936SuitePro .s936-ll-step.playing{background:#fff;color:#111;transform:translateY(-2px)}
#s936SuitePro .s936-ll-step.rest .note{color:#ffb5b5}
#s936SuitePro .s936-ll-step .num{font-size:.55rem;opacity:.55}
#s936SuitePro .s936-ll-step .note{font-size:.74rem;font-weight:900}
#s936SuitePro .s936-ll-step .dur{font-size:.52rem;opacity:.62}
#s936SuitePro .s936-ll-events{display:grid;gap:5px;margin-top:8px;max-height:220px;overflow:auto}
#s936SuitePro .s936-ll-event{display:grid;grid-template-columns:44px minmax(0,1fr) 105px 30px;gap:6px;align-items:center;border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:5px;background:rgba(255,255,255,.025)}
#s936SuitePro .s936-ll-event.active{border-color:rgba(255,90,190,.55);background:rgba(255,90,190,.08)}
#s936SuitePro .s936-ll-event button,#s936SuitePro .s936-ll-event select{border:1px solid rgba(255,255,255,.12);border-radius:7px;background:#111722;color:#fff;padding:5px;font-size:.64rem}
#s936SuitePro .s936-ll-event b{font-size:.68rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#s936SuitePro .s936-ll-pattern-text{resize:vertical;margin-top:4px}
@media(max-width:740px){
  #s936SuitePro .s936-ll-config,#s936SuitePro .s936-ll-config.secondary{grid-template-columns:1fr}
  #s936SuitePro .s936-ll-event{grid-template-columns:40px minmax(0,1fr) 88px 28px}
}`;
  document.head.appendChild(style);
}

function guitarProfile(){
  return Strings?.profile?.("guitar") || {
    maxFret:24,
    strings:[
      {number:6,label:"E",open:"E2",midi:40},
      {number:5,label:"A",open:"A2",midi:45},
      {number:4,label:"D",open:"D3",midi:50},
      {number:3,label:"G",open:"G3",midi:55},
      {number:2,label:"B",open:"B3",midi:59},
      {number:1,label:"e",open:"E4",midi:64}
    ]
  };
}
function sectionBars(chords){
  return Core?.sectionBars ? Core.sectionBars(chords) : Math.max(1,(chords||[]).reduce((sum,item)=>sum+(Number(item?.bars)||1),0));
}
function normalizeLine(raw,chords,bpm){
  const bars = clamp(Number(raw?.bars)||sectionBars(chords),1,64);
  const total = bars*16;
  return {
    version:1,
    root:ROOTS.includes(raw?.root) ? raw.root : "C",
    scale:SCALES.some(item=>item[0]===raw?.scale) ? raw.scale : "majorPent",
    motifId:MOTIFS.some(item=>item[0]===raw?.motifId) ? raw.motifId : "pentatonic",
    followChords:raw?.followChords !== false,
    bars,
    stepsPerBar:16,
    bpm:Number(bpm)||95,
    defaultDuration:[1,2,4,8,16,32].includes(Number(raw?.defaultDuration)) ? Number(raw.defaultDuration) : 2,
    articulation:ARTICULATIONS.some(item=>item[0]===raw?.articulation) ? raw.articulation : "normal",
    events:Core?.normalizeEvents ? Core.normalizeEvents(raw?.events,total,"lead") : (Array.isArray(raw?.events)?clone(raw.events):[])
  };
}
function playablePosition(midi,preferredString=null){
  const profile = guitarProfile();
  const options = [];
  profile.strings.forEach((string,index)=>{
    const fret = Number(midi)-Number(string.midi);
    if(fret>=0 && fret<=profile.maxFret){
      const preferredPenalty = preferredString===null ? 0 : Math.abs(index-preferredString)*2;
      const comfort = fret<=12 ? Math.abs(fret-7)*.22 : 3+(fret-12)*.35;
      options.push({stringIndex:index,stringNumber:string.number,fret,midi:Number(midi),score:preferredPenalty+comfort});
    }
  });
  options.sort((a,b)=>a.score-b.score);
  return options[0] || null;
}
function pitchInRange(root,octave=4){
  const pc = Core?.rootPc ? Core.rootPc(root) : 0;
  let midi = (octave+1)*12+pc;
  while(midi<52) midi+=12;
  while(midi>76) midi-=12;
  return midi;
}
function degreeSequence(line,chordName){
  const root = line.followChords && chordName && Core?.chordRoot ? Core.chordRoot(chordName,line.root) : line.root;
  const intervals = Core?.SCALE_INTERVALS?.[line.scale] || [0,2,4,5,7,9,11];
  const isMinor = /(^|[^a-z])m(?!aj)/i.test(String(chordName||""));
  switch(line.motifId){
    case "scale-up": return {root,intervals:intervals.concat([12])};
    case "scale-down": return {root,intervals:intervals.concat([12]).slice().reverse()};
    case "blues": return {root,intervals:[0,3,5,6,7,10,12,10]};
    case "chord-arpeggio": return {root,intervals:isMinor?[0,3,7,10,12,10,7,3]:[0,4,7,11,12,11,7,4]};
    case "question-answer": return {root,intervals:[0,2,4,7,5,4,2,0]};
    case "repeat": return {root,intervals:[0,4,7,4,0,4,7,9]};
    case "pentatonic": {
      const pent = line.scale.includes("minor") ? [0,3,5,7,10,12,10,7] : [0,2,4,7,9,12,9,7];
      return {root,intervals:pent};
    }
    default: return {root,intervals:[0,2,4,2,0,4,7,4]};
  }
}
function generateMotif(line,chords){
  const events = [];
  const total = line.bars*16;
  const spacing = Math.max(1,Number(line.defaultDuration)||2);
  let cursor = 0;
  let sequenceIndex = 0;
  while(cursor<total){
    const context = Core?.chordAtStep ? Core.chordAtStep(chords,cursor) : {item:chords?.[0]};
    const sequence = degreeSequence(line,context.item?.name);
    const rootMidi = pitchInRange(sequence.root,4);
    const interval = sequence.intervals[sequenceIndex % sequence.intervals.length];
    const midi = rootMidi + interval;
    const position = playablePosition(midi);
    if(position){
      events.push({
        id:uid("lead"),
        step:cursor,
        durationSteps:spacing,
        rest:false,
        note:Core?.midiName ? Core.midiName(midi,/b/.test(sequence.root)) : String(midi),
        midi,
        stringIndex:position.stringIndex,
        stringNumber:position.stringNumber,
        fret:position.fret,
        velocity:line.articulation==="accent" ? .96 : .82,
        articulation:line.articulation
      });
    }
    cursor += spacing;
    sequenceIndex++;
  }
  return events;
}
function surfacePayload(sectionKey,line,event,chords,sectionName){
  const profile = guitarProfile();
  const exactFrets = Array(profile.strings.length).fill(null);
  const exactMidis = [];
  const exactStrings = [];
  if(event && !event.rest && Number.isFinite(Number(event.midi))){
    const index = clamp(event.stringIndex,0,profile.strings.length-1);
    exactFrets[index] = clamp(event.fret,0,profile.maxFret);
    exactMidis.push(Number(event.midi));
    exactStrings.push({
      stringIndex:index,
      stringNumber:profile.strings[index].number,
      fret:exactFrets[index],
      physicalFret:exactFrets[index],
      midi:Number(event.midi),
      note:event.note,
      finger:""
    });
  }
  const context = Core?.chordAtStep ? Core.chordAtStep(chords,event?.step||0) : {index:0,item:chords?.[0]};
  return {
    surfaceMode:"lead-line",
    instrument:"guitar",
    sectionKey,
    sectionName,
    chordIndex:context.index||0,
    name:event ? `${event.rest?"Silencio":event.note} · paso ${(Number(event.step)||0)+1}` : "Selecciona un paso y toca una nota",
    bass:"",
    notes:event?.note||"",
    bars:context.item?.bars||1,
    exactMidis,
    exactFrets,
    exactStrings,
    capo:0,
    barre:null,
    seq:chords,
    noteDuration:.35
  };
}
function showSurface(sectionKey,line,event,chords,sectionName){
  const payload = surfacePayload(sectionKey,line,event,chords,sectionName);
  const result = bridge("showEditorChordVisual",payload);
  if(result?.ok===false) console.warn("Guitar Lead: no se pudo mostrar el cuello.",result.message||result);
}
function stopCursor(){
  if(cursorTimer){ clearInterval(cursorTimer); cursorTimer=null; }
}

function render(options={}){
  installStyles();
  stopCursor();
  const host = options.host;
  if(!host) return null;
  const state = bridge("getEditorState") || {};
  const sectionKey = options.sectionKey || state.sectionKey || "intro";
  const chords = Array.isArray(state.sections?.[sectionKey]) ? state.sections[sectionKey] : (options.sections?.[sectionKey]||[]);
  const sectionOptions = state.sectionOptions || options.sectionOptions || [];
  const sectionName = (sectionOptions.find(entry=>entry[0]===sectionKey)||[sectionKey,sectionKey])[1];
  let line = normalizeLine(state.leadLines?.[sectionKey] || {},chords,state.bpm||options.bpm||95);
  let selectedStep = 0;
  let selectedEventId = null;
  let selectedDuration = line.defaultDuration;
  let playingStep = -1;
  let timers = [];

  const shell = el("div","s936-ll-shell");
  const config = el("section","s936-ll-panel primary");
  const head = el("div","s936-ll-head");
  head.append(el("b","","Guitarra Lead Pro · solo por sección"),el("span","",`${state.bpm||95} BPM · cuello sincronizado`));
  config.appendChild(head);

  const sectionSelect = document.createElement("select");
  sectionOptions.forEach(entry=>sectionSelect.appendChild(option(entry[0],entry[1],sectionKey)));
  const rootSelect = document.createElement("select");
  ROOTS.forEach(root=>rootSelect.appendChild(option(root,root,line.root)));
  const scaleSelect = document.createElement("select");
  SCALES.forEach(entry=>scaleSelect.appendChild(option(entry[0],entry[1],line.scale)));
  const motifSelect = document.createElement("select");
  MOTIFS.forEach(entry=>motifSelect.appendChild(option(entry[0],entry[1],line.motifId)));
  const durationSelect = document.createElement("select");
  (Core?.DURATION_OPTIONS || [[1,"1/16"],[2,"1/8"],[4,"1 tiempo"],[8,"2 tiempos"],[16,"1 compás"]])
    .forEach(entry=>durationSelect.appendChild(option(entry[0],entry[1],line.defaultDuration)));
  const articulationSelect = document.createElement("select");
  ARTICULATIONS.forEach(entry=>articulationSelect.appendChild(option(entry[0],entry[1],line.articulation)));
  const barsInput = document.createElement("input");
  barsInput.type="number"; barsInput.min="1"; barsInput.max="64"; barsInput.value=String(line.bars);

  const row1 = el("div","s936-ll-config");
  row1.append(field("Sección",sectionSelect),field("Fundamental",rootSelect),field("Escala",scaleSelect));
  const row2 = el("div","s936-ll-config secondary");
  row2.append(field("Motivo / progresión",motifSelect),field("Duración",durationSelect),field("Articulación",articulationSelect));
  config.append(row1,row2);

  const followLabel = el("label","s936-ll-check");
  const follow = document.createElement("input");
  follow.type="checkbox"; follow.checked=line.followChords;
  followLabel.append(follow,document.createTextNode("Follow Chords · adaptar la frase al acorde que está sonando"));
  config.appendChild(followLabel);

  const status = el("div","s936-ll-status","Selecciona un paso y toca una cuerda/traste en el cuello de la guitarra.");
  const actions = el("div","s936-ll-actions");
  actions.append(
    button("Generar motivo","warn",()=>{ syncConfig(); line.events=generateMotif(line,chords); selectedStep=0; selectedEventId=line.events[0]?.id||null; persist(false); redraw(); }),
    button("Guardar solo","primary",()=>persist(true)),
    button("Escuchar","primary",()=>play()),
    button("Stop","",()=>stop()),
    button("Insertar silencio","",()=>insertRest()),
    button("Limpiar","danger",()=>{ line.events=[];selectedEventId=null;selectedStep=0;persist(false);redraw(); })
  );
  config.append(actions,status);
  shell.appendChild(config);

  const now = el("div","s936-ll-now");
  const nowInfo = el("div");
  const nowTitle = el("strong","","Paso 1 · listo para escribir");
  const nowMeta = el("span","",`Duración ${durationLabel(selectedDuration)} · toca el cuello`);
  nowInfo.append(nowTitle,nowMeta);
  const nowChord = el("em","",chords[0]?.name||line.root);
  now.append(nowInfo,nowChord);
  shell.appendChild(now);

  const timelinePanel = el("section","s936-ll-panel");
  const timelineHead = el("div","s936-ll-head");
  timelineHead.append(el("b","","Timeline melódico · 16 pasos por compás"),el("span","",`${line.bars} compás(es)`));
  timelinePanel.appendChild(timelineHead);
  const timelineWrap = el("div","s936-ll-timeline-wrap");
  const timeline = el("div","s936-ll-timeline");
  timelineWrap.appendChild(timeline);
  timelinePanel.appendChild(timelineWrap);
  shell.appendChild(timelinePanel);

  const eventPanel = el("section","s936-ll-panel");
  const eventHead = el("div","s936-ll-head");
  eventHead.append(el("b","","Frase escrita"),el("span","","Nota · cuerda/traste · duración"));
  eventPanel.appendChild(eventHead);
  const patternText = document.createElement("textarea");
  patternText.className="s936-ll-pattern-text";
  patternText.rows=2;
  patternText.readOnly=true;
  const eventsBox = el("div","s936-ll-events");
  eventPanel.append(patternText,eventsBox);
  shell.appendChild(eventPanel);
  host.appendChild(shell);

  function setStatus(message,error=false){
    status.textContent=message;
    status.classList.toggle("error",!!error);
  }
  function syncConfig(){
    line.root=rootSelect.value;
    line.scale=scaleSelect.value;
    line.motifId=motifSelect.value;
    line.followChords=follow.checked;
    line.defaultDuration=Number(durationSelect.value)||2;
    line.articulation=articulationSelect.value;
    line.bars=clamp(barsInput.value||line.bars,1,64);
    selectedDuration=line.defaultDuration;
    const total=line.bars*16;
    line.events=line.events.filter(event=>event.step<total);
    selectedStep=clamp(selectedStep,0,total-1);
  }
  function persist(showMessage){
    syncConfig();
    const response=bridge("saveLeadLine",sectionKey,line);
    if(response?.ok===false){ setStatus(response.message||"No se pudo guardar el solo.",true); return response; }
    if(showMessage) setStatus("Solo de guitarra guardado en la canción actual.");
    return response;
  }
  function selectedEvent(){
    return line.events.find(event=>event.id===selectedEventId) || line.events.find(event=>event.step===selectedStep) || null;
  }
  function selectStep(step){
    selectedStep=clamp(step,0,line.bars*16-1);
    const event=line.events.find(item=>item.step===selectedStep)||null;
    selectedEventId=event?.id||null;
    if(event) selectedDuration=event.durationSteps;
    showSurface(sectionKey,line,event,chords,sectionName);
    redraw();
  }
  function addFromFret(stringIndex,fret){
    syncConfig();
    if(fret===null){ insertRest(); return; }
    const profile=guitarProfile();
    const index=clamp(stringIndex,0,profile.strings.length-1);
    const normalized=clamp(fret,0,profile.maxFret);
    const midi=profile.strings[index].midi+normalized;
    const event={
      id:uid("lead"),
      step:selectedStep,
      durationSteps:selectedDuration,
      rest:false,
      note:Core?.midiName ? Core.midiName(midi,false) : String(midi),
      midi,
      stringIndex:index,
      stringNumber:profile.strings[index].number,
      fret:normalized,
      velocity:line.articulation==="accent" ? .96 : .82,
      articulation:line.articulation
    };
    line.events = Core?.upsertEvent ? Core.upsertEvent(line.events,event) : line.events.filter(item=>item.step!==event.step).concat(event).sort((a,b)=>a.step-b.step);
    selectedEventId=event.id;
    persist(false);
    showSurface(sectionKey,line,event,chords,sectionName);
    setStatus(`${event.note} escrita en paso ${event.step+1} · cuerda ${event.stringNumber}, traste ${event.fret}.`);
    selectedStep=clamp(event.step+event.durationSteps,0,line.bars*16-1);
    redraw();
  }
  function insertRest(){
    syncConfig();
    const event={id:uid("lead_rest"),step:selectedStep,durationSteps:selectedDuration,rest:true,note:"R",midi:null,stringIndex:null,stringNumber:null,fret:null,articulation:"rest"};
    line.events = Core?.upsertEvent ? Core.upsertEvent(line.events,event) : line.events.filter(item=>item.step!==event.step).concat(event);
    selectedEventId=event.id;
    persist(false);
    setStatus(`Silencio escrito en paso ${event.step+1}.`);
    selectedStep=clamp(event.step+event.durationSteps,0,line.bars*16-1);
    showSurface(sectionKey,line,event,chords,sectionName);
    redraw();
  }
  function removeEvent(id){
    line.events=line.events.filter(event=>event.id!==id);
    if(selectedEventId===id) selectedEventId=null;
    persist(false);redraw();
  }
  function updateDuration(id,value){
    const event=line.events.find(item=>item.id===id);
    if(!event) return;
    event.durationSteps=Number(value)||2;
    selectedDuration=event.durationSteps;
    persist(false);redraw();
  }
  function summary(){
    return line.events.map(event=>`${event.rest?"R":event.note}:${event.durationSteps}`).join(" ");
  }
  function redraw(){
    syncConfig();
    patternText.value=summary();
    const total=line.bars*16;
    timeline.innerHTML="";
    for(let step=0;step<total;step++){
      const event=line.events.find(item=>item.step===step)||null;
      const cell=el("button","s936-ll-step","");
      cell.type="button";
      if(step%4===0) cell.classList.add("beat");
      if(step%16===0) cell.classList.add("bar");
      if(step===selectedStep) cell.classList.add("selected");
      if(step===playingStep) cell.classList.add("playing");
      if(event?.rest) cell.classList.add("rest");
      cell.append(el("span","num",String(step+1)));
      if(event){
        cell.append(el("span","note",event.rest?"R":event.note),el("span","dur",durationLabel(event.durationSteps)));
      }
      cell.addEventListener("click",()=>selectStep(step));
      timeline.appendChild(cell);
    }
    eventsBox.innerHTML="";
    line.events.forEach(event=>{
      const row=el("div","s936-ll-event"+(event.id===selectedEventId?" active":""));
      const select=el("button","","P"+(event.step+1));
      select.type="button";
      select.addEventListener("click",()=>{selectedStep=event.step;selectedEventId=event.id;selectedDuration=event.durationSteps;showSurface(sectionKey,line,event,chords,sectionName);redraw();});
      const description=event.rest?"Silencio":`${event.note} · C${event.stringNumber}/T${event.fret} · ${event.articulation||"normal"}`;
      const note=el("b","",description);
      const duration=document.createElement("select");
      (Core?.DURATION_OPTIONS||[[1,"1/16"],[2,"1/8"],[4,"1 tiempo"],[8,"2 tiempos"],[16,"1 compás"]]).forEach(entry=>duration.appendChild(option(entry[0],entry[1],event.durationSteps)));
      duration.addEventListener("change",()=>updateDuration(event.id,duration.value));
      const remove=el("button","","×");
      remove.type="button";remove.title="Borrar evento";remove.addEventListener("click",()=>removeEvent(event.id));
      row.append(select,note,duration,remove);
      eventsBox.appendChild(row);
    });
    const context=Core?.chordAtStep ? Core.chordAtStep(chords,selectedStep) : {item:chords[0]};
    const event=selectedEvent();
    nowTitle.textContent=`Paso ${selectedStep+1}${event?` · ${event.note}`:" · listo para escribir"}`;
    nowMeta.textContent=`Duración ${durationLabel(selectedDuration)} · ${event?"evento seleccionado":"toca el cuello para agregar nota"}`;
    nowChord.textContent=context.item?.name||line.root;
    timelineHead.lastChild.textContent=`${line.bars} compás(es) · ${line.events.length} evento(s)`;
  }
  function clearTimers(){
    timers.forEach(timer=>clearTimeout(timer));
    timers=[];
  }
  function play(){
    syncConfig();
    if(!line.events.length){setStatus("La frase está vacía. Genera un motivo o escribe notas desde el cuello.",true);return;}
    stopCursor();clearTimers();
    bridge("mountEditorInstrumentSurface","guitar");
    const bpm=Number(state.bpm||options.bpm||95);
    const stepSeconds=60/bpm/4;
    const total=line.bars*16;
    line.events.filter(event=>!event.rest&&Number.isFinite(Number(event.midi))).forEach(event=>{
      const timer=setTimeout(()=>{
        const payload=surfacePayload(sectionKey,line,event,chords,sectionName);
        payload.noteDuration=Math.max(.08,(Number(event.durationSteps)||1)*stepSeconds*.9);
        bridge("previewEditorChord",payload);
      },Math.max(0,event.step*stepSeconds*1000));
      timers.push(timer);
    });
    const started=performance.now();
    cursorTimer=setInterval(()=>{
      const elapsed=performance.now()-started;
      playingStep=Math.min(total-1,Math.floor(elapsed/(stepSeconds*1000)));
      redraw();
      if(elapsed>=total*stepSeconds*1000){
        stopCursor();clearTimers();playingStep=-1;redraw();
      }
    },45);
    setStatus("Reproduciendo solo al tempo de la canción.");
  }
  function stop(){
    stopCursor();clearTimers();playingStep=-1;redraw();setStatus("Reproducción detenida.");
  }

  sectionSelect.addEventListener("change",()=>{
    persist(false);stop();options.onSectionChange?.(sectionSelect.value);
  });
  [rootSelect,scaleSelect,motifSelect,durationSelect,articulationSelect,barsInput,follow].forEach(control=>control.addEventListener("change",()=>{
    syncConfig();persist(false);redraw();
  }));

  const controller={
    setFret(stringIndex,fret){addFromFret(stringIndex,fret);},
    setFinger(){},
    selectChord(index){
      let start=0;
      for(let i=0;i<Number(index);i++) start+=(Number(chords[i]?.bars)||1)*16;
      selectStep(start);
    },
    stop,
    destroy(){stop();},
    getLine(){return clone(line);}
  };
  activeController=controller;
  redraw();
  showSurface(sectionKey,line,line.events[0]||null,chords,sectionName);
  return controller;
}

function getActiveController(){return activeController;}

window.Studio936LeadLinePro={version:VERSION,render,getActiveController};
})();
