// Studio 936 Composer - String Instrument Profiles and Voicing Engine v1.1.3 · Ukelele Alias Guard
// Shared by Guitar, Ukulele and Bass editors.
window.Studio936StringInstruments = (() => {
  "use strict";

  const PROFILES = {
    guitar: {
      id:"guitar",
      label:"Guitarra",
      shortLabel:"Guitarra",
      shapeOrder:"6→1",
      maxFret:24,
      capoMax:12,
      minSounding:2,
      strings:[
        {number:6,label:"E",open:"E2",midi:40},
        {number:5,label:"A",open:"A2",midi:45},
        {number:4,label:"D",open:"D3",midi:50},
        {number:3,label:"G",open:"G3",midi:55},
        {number:2,label:"B",open:"B3",midi:59},
        {number:1,label:"e",open:"E4",midi:64}
      ],
      defaultFrets:[0,2,2,1,0,0],
      defaultFingers:["0","2","3","1","0","0"],
      allowBarre:true,
      allowCapo:true,
      role:"chord"
    },
    lead: {
      id:"lead",
      label:"Guitarra Lead",
      shortLabel:"Lead",
      shapeOrder:"6→1",
      maxFret:24,
      capoMax:12,
      minSounding:1,
      strings:[
        {number:6,label:"E",open:"E2",midi:40},
        {number:5,label:"A",open:"A2",midi:45},
        {number:4,label:"D",open:"D3",midi:50},
        {number:3,label:"G",open:"G3",midi:55},
        {number:2,label:"B",open:"B3",midi:59},
        {number:1,label:"e",open:"E4",midi:64}
      ],
      defaultFrets:[null,null,null,null,null,0],
      defaultFingers:["","","","","","0"],
      allowBarre:true,
      allowCapo:true,
      role:"lead"
    },
    ukulele: {
      id:"ukulele",
      label:"Ukelele",
      shortLabel:"Ukelele",
      shapeOrder:"4→1",
      maxFret:20,
      capoMax:12,
      minSounding:2,
      strings:[
        {number:4,label:"G",open:"G4",midi:67},
        {number:3,label:"C",open:"C4",midi:60},
        {number:2,label:"E",open:"E4",midi:64},
        {number:1,label:"A",open:"A4",midi:69}
      ],
      defaultFrets:[0,0,0,3],
      defaultFingers:["0","0","0","3"],
      allowBarre:true,
      allowCapo:true,
      role:"chord"
    },
    bass: {
      id:"bass",
      label:"Bajo eléctrico",
      shortLabel:"Bajo",
      shapeOrder:"4→1",
      maxFret:24,
      capoMax:12,
      minSounding:1,
      strings:[
        {number:4,label:"E",open:"E1",midi:28},
        {number:3,label:"A",open:"A1",midi:33},
        {number:2,label:"D",open:"D2",midi:38},
        {number:1,label:"G",open:"G2",midi:43}
      ],
      defaultFrets:[0,null,null,null],
      defaultFingers:["0","","",""],
      allowBarre:false,
      allowCapo:false,
      role:"bass"
    }
  };

  function clone(value){
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function clamp(value,min,max){
    const n = Number(value);
    return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
  }

  function normalizeFret(value, maxFret=24){
    if(value === null || value === undefined) return null;
    const text = String(value).trim().toUpperCase();
    if(text === "" || text === "X" || text === "M") return null;
    return clamp(Number(text)||0, 0, maxFret);
  }

  function canonicalInstrumentId(id){
    const value = String(id || "").trim().toLowerCase();
    if(value === "uke" || value === "ukelele" || value === "ukulele") return "ukulele";
    if(value === "guitarra" || value === "guitar") return "guitar";
    if(value === "guitar-lead" || value === "guitarra-lead" || value === "glead" || value === "g.lead") return "lead";
    if(value === "bajo" || value === "bass") return "bass";
    return PROFILES[value] ? value : "guitar";
  }

  function profile(id){
    return PROFILES[canonicalInstrumentId(id)] || PROFILES.guitar;
  }

  function normalizeDraft(item, instrument){
    const p = profile(canonicalInstrumentId(instrument));
    const saved = item?.voicings?.[p.id] || null;
    const frets = Array.isArray(saved?.frets) && saved.frets.length === p.strings.length
      ? saved.frets.map(value => normalizeFret(value,p.maxFret))
      : clone(p.defaultFrets);
    const fingers = Array.isArray(saved?.fingers) && saved.fingers.length === p.strings.length
      ? saved.fingers.map(value => String(value ?? ""))
      : clone(p.defaultFingers);
    return {
      instrument:p.id,
      tuning:p.strings.map(string => string.open),
      frets,
      fingers,
      capo:p.allowCapo ? clamp(saved?.capo || 0,0,p.capoMax) : 0,
      barre:{
        enabled:p.allowBarre && !!saved?.barre?.enabled,
        fret:clamp(saved?.barre?.fret || 1,1,p.maxFret),
        fromString:clamp(saved?.barre?.fromString || p.strings.length,1,p.strings.length),
        toString:clamp(saved?.barre?.toString || 1,1,p.strings.length),
        finger:String(saved?.barre?.finger || "1")
      }
    };
  }

  function calculate(draft, instrument, helpers={}){
    const p = profile(canonicalInstrumentId(instrument));
    const noteNameFromMidi = typeof helpers.noteNameFromMidi === "function"
      ? helpers.noteNameFromMidi
      : midi => String(midi);
    const detectChord = typeof helpers.detectChord === "function"
      ? helpers.detectChord
      : () => ({primary:"Acorde",alternatives:[],rootPc:null});
    const preferFlats = !!helpers.preferFlats;
    const capo = p.allowCapo ? clamp(draft?.capo || 0,0,p.capoMax) : 0;

    const strings = p.strings.map((string,index) => {
      const raw = normalizeFret(draft?.frets?.[index],p.maxFret);
      const fret = raw === null ? null : Math.min(raw, Math.max(0,p.maxFret-capo));
      if(fret === null){
        return {
          number:string.number,label:string.label,open:string.open,
          fret:null,physicalFret:null,finger:String(draft?.fingers?.[index]||""),
          midi:null,note:"X",muted:true
        };
      }
      const midi = string.midi + capo + fret;
      return {
        number:string.number,label:string.label,open:string.open,
        fret,physicalFret:capo+fret,
        finger:String(draft?.fingers?.[index] || (fret===0 ? "0" : "")),
        midi,note:noteNameFromMidi(midi,preferFlats),muted:false
      };
    });

    const sounded = strings.filter(string => Number.isFinite(string.midi));
    const bassString = sounded.reduce((lowest,current) => !lowest || current.midi < lowest.midi ? current : lowest, null);
    const exactMidis = sounded.map(string => string.midi);
    const bassMidi = bassString?.midi ?? null;
    const detection = detectChord(exactMidis,bassMidi,preferFlats);
    const shape = strings.map(string => string.muted ? "X" : String(string.fret)).join("-");
    const notes = sounded.map(string => string.note).join(" ");
    const bass = Number.isFinite(bassMidi) ? noteNameFromMidi(bassMidi,preferFlats) : "";
    const tabRows = strings.slice().reverse().map(string => {
      const token = string.muted ? "X" : String(string.fret);
      return `${string.label}|--${token.padStart(2,"-")}-- ${string.note}`;
    });
    const capoLine = capo > 0 ? `Capo: traste ${capo}\n` : "";

    return {
      instrument:p.id,
      profile:p,
      strings,
      exactMidis,
      bassMidi,
      bass,
      notes,
      shape,
      tab:capoLine + tabRows.join("\n"),
      detection,
      voicing:{
        instrument:p.id,
        tuning:p.strings.map(string => string.open),
        frets:strings.map(string => string.fret),
        fingers:strings.map(string => string.finger),
        capo,
        barre:{
          enabled:p.allowBarre && !!draft?.barre?.enabled,
          fret:clamp(draft?.barre?.fret || 1,1,p.maxFret),
          fromString:clamp(draft?.barre?.fromString || p.strings.length,1,p.strings.length),
          toString:clamp(draft?.barre?.toString || 1,1,p.strings.length),
          finger:String(draft?.barre?.finger || "1")
        },
        shape,notes,bass,midis:exactMidis
      }
    };
  }

  function isStringInstrument(id){
    return !!PROFILES[canonicalInstrumentId(id)];
  }

  return {
    version:"string-instruments-v1.1.3-ukulele-alias-guard",
    profiles:PROFILES,
    profile,
    canonicalInstrumentId,
    normalizeFret,
    normalizeDraft,
    calculate,
    isStringInstrument,
    clone
  };
})();
