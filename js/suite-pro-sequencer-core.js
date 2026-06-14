// Studio 936 Composer - Shared Sequencer Core v1.0
// Pure helpers shared by Guitar Lead and Drum Composer.
window.Studio936SequencerCore = (() => {
  "use strict";

  const SHARP_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const FLAT_NAMES = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
  const PC = {
    C:0,"B#":0,"C#":1,Db:1,D:2,"D#":3,Eb:3,E:4,Fb:4,"E#":5,F:5,
    "F#":6,Gb:6,G:7,"G#":8,Ab:8,A:9,"A#":10,Bb:10,B:11,Cb:11
  };
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
  const DURATION_OPTIONS = [
    [1,"1/16"],
    [2,"1/8"],
    [4,"1 tiempo"],
    [8,"2 tiempos"],
    [16,"1 compás"],
    [32,"2 compases"]
  ];

  function clamp(value,min,max){
    const n = Number(value);
    return Math.max(min,Math.min(max,Number.isFinite(n) ? n : min));
  }

  function clone(value){
    try { return JSON.parse(JSON.stringify(value)); }
    catch (error) { return value; }
  }

  function uid(prefix="event"){
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  }

  function rootPc(root){
    return Number.isFinite(PC[root]) ? PC[root] : 0;
  }

  function midiName(midi,preferFlats=false){
    const value = Math.round(Number(midi));
    if(!Number.isFinite(value)) return "";
    const names = preferFlats ? FLAT_NAMES : SHARP_NAMES;
    return `${names[((value%12)+12)%12]}${Math.floor(value/12)-1}`;
  }

  function noteToMidi(token){
    const text = String(token || "").trim();
    const match = text.match(/^([A-Ga-g])([#b]?)(-?\d+)$/);
    if(!match) return null;
    const name = match[1].toUpperCase() + (match[2] || "");
    if(!Number.isFinite(PC[name])) return null;
    return (Number(match[3]) + 1) * 12 + PC[name];
  }

  function chordRoot(name,fallback="C"){
    const text = String(name || "").trim();
    const match = text.match(/^([A-Ga-g])([#b]?)/);
    return match ? match[1].toUpperCase() + (match[2] || "") : fallback;
  }

  function scaleMidis(root,scale,low=52,high=88){
    const intervals = SCALE_INTERVALS[scale] || SCALE_INTERVALS.major;
    const pitch = rootPc(root);
    const out = [];
    for(let midi=low;midi<=high;midi++){
      const distance = ((midi-pitch)%12+12)%12;
      if(intervals.includes(distance)) out.push(midi);
    }
    return out;
  }

  function durationLabel(steps){
    const match = DURATION_OPTIONS.find(item => Number(item[0]) === Number(steps));
    return match ? match[1] : `${steps} pasos`;
  }

  function sectionBars(chords){
    const seq = Array.isArray(chords) ? chords : [];
    return Math.max(1,seq.reduce((sum,item)=>sum+(Number(item?.bars)||1),0));
  }

  function chordAtStep(chords,step){
    const seq = Array.isArray(chords) ? chords : [];
    let cursor = 0;
    const target = Math.max(0,Number(step)||0);
    for(let index=0;index<seq.length;index++){
      const width = Math.max(1,Number(seq[index]?.bars)||1) * 16;
      if(target < cursor + width) return {index,item:seq[index],start:cursor,end:cursor+width};
      cursor += width;
    }
    const index = Math.max(0,seq.length-1);
    return {index,item:seq[index]||null,start:Math.max(0,cursor-16),end:cursor};
  }

  function normalizeEvents(events,totalSteps,prefix="event"){
    const limit = Math.max(1,Number(totalSteps)||16);
    return (Array.isArray(events) ? events : [])
      .map((source,index)=>{
        const rest = source?.rest === true || String(source?.note||"").toUpperCase() === "R";
        const step = clamp(source?.step,0,limit-1);
        const durationSteps = Math.max(1,Number(source?.durationSteps)||1);
        return {
          ...clone(source||{}),
          id:String(source?.id || `${prefix}_${index}_${step}`),
          step,
          durationSteps,
          rest,
          note:rest ? "R" : String(source?.note || ""),
          midi:rest || !Number.isFinite(Number(source?.midi)) ? null : Math.round(Number(source.midi))
        };
      })
      .sort((a,b)=>a.step-b.step);
  }

  function upsertEvent(events,event){
    const next = (Array.isArray(events) ? events : []).filter(item => item.id !== event.id && item.step !== event.step);
    next.push(event);
    next.sort((a,b)=>a.step-b.step);
    return next;
  }

  return {
    version:"sequencer-core-v1.0",
    SHARP_NAMES,
    FLAT_NAMES,
    PC,
    SCALE_INTERVALS,
    DURATION_OPTIONS,
    clamp,
    clone,
    uid,
    rootPc,
    midiName,
    noteToMidi,
    chordRoot,
    scaleMidis,
    durationLabel,
    sectionBars,
    chordAtStep,
    normalizeEvents,
    upsertEvent
  };
})();
