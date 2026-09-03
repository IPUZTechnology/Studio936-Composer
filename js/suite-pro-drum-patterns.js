// Studio 936 Composer - Drum Patterns Core v0.7.2.7
// Shared, light data engine for Main drums and Editor drum panel.
window.Studio936DrumPatterns = (() => {
  "use strict";

  const LANES = [
    {id:"kick",label:"Bombo",short:"BD",defaultVolume:.92},
    {id:"snare",label:"Caja",short:"SD",defaultVolume:.82},
    {id:"hatClosed",label:"Hi-hat cerrado",short:"CH",defaultVolume:.58},
    {id:"hatOpen",label:"Hi-hat abierto",short:"OH",defaultVolume:.55},
    {id:"tomHigh",label:"Tom alto",short:"HT",defaultVolume:.72},
    {id:"tomMid",label:"Tom medio",short:"MT",defaultVolume:.74},
    {id:"tomLow",label:"Tom piso",short:"FT",defaultVolume:.78},
    {id:"crash",label:"Crash",short:"CR",defaultVolume:.62},
    {id:"ride",label:"Ride",short:"RD",defaultVolume:.55},
    {id:"percussion",label:"Percusión",short:"PC",defaultVolume:.62}
  ];

  const KITS = [
    ["studio","Studio acústica"],
    ["rock","Rock grande"],
    ["latin","Latin / percusión"],
    ["electronic","Electrónica"],
    ["soft","Soft / balada"]
  ];

  const STYLES = [
    ["auto","Auto según canción"],
    ["funk","Funk"],
    ["pop","Pop"],
    ["rock","Rock"],
    ["latin","Latin"],
    ["bossa","Bossa Nova"],
    ["bolero","Bolero"],
    ["salsa","Salsa"],
    ["cumbia","Cumbia"],
    ["reggae","Reggae"],
    ["worship","Worship"],
    // Cambio 463: 3 estilos electrónicos nuevos
    ["trance","Trance"],
    ["eurotrance","Eurotrance"],
    ["electro","Electro (UK)"],
    // Cambio 468: 4 géneros electrónicos nuevos más
    ["house","House"],
    ["techno","Techno"],
    ["dnb","Drum & Bass"],
    ["dubstep","Dubstep"],
    // Cambio 471: 3 géneros nuevos más
    ["deephouse","Deep House"],
    ["afrobeats","Afrobeats"],
    ["dembow","Dembow"]
  ];

  const SECTION_PRESETS = {
    intro:{density:.62,crash:true,openHat:false},
    verse:{density:.74,crash:false,openHat:false},
    prechorus:{density:.86,crash:false,openHat:true},
    chorus:{density:1.0,crash:true,openHat:true},
    bridge:{density:.82,crash:true,openHat:false},
    solo:{density:.95,crash:true,openHat:true},
    outro:{density:.72,crash:true,openHat:false}
  };

  const STYLE_ALIASES = {
    ballad:"bolero",
    balada:"bolero",
    jazz:"bossa",
    blues:"rock",
    worship:"worship",
    latin:"latin"
  };

  function clone(value){
    return JSON.parse(JSON.stringify(value || {}));
  }

  function clamp(value,min,max){
    const n = Number(value);
    return Math.max(min,Math.min(max,Number.isFinite(n) ? n : min));
  }

  function blankLane(def){
    return {
      enabled:true,
      mute:false,
      solo:false,
      volume:def.defaultVolume,
      hits:{}
    };
  }

  function emptyPattern({kit="studio",style="auto",sectionKey="intro",bars=1,bpm=95,enabled=true} = {}){
    const lanes = {};
    LANES.forEach(def => lanes[def.id] = blankLane(def));
    return {
      version:2,
      enabled:enabled !== false,
      kit:validKit(kit),
      style:validStyle(style),
      sectionKey:String(sectionKey || "intro"),
      bars:clamp(bars,1,4),
      stepsPerBar:16,
      bpm:Number(bpm) || 95,
      swing:0,
      humanize:.02,
      masterVolume:.78,
      lanes
    };
  }

  function validKit(value){
    return KITS.some(item => item[0] === value) ? value : "studio";
  }

  function validStyle(value){
    const v = STYLE_ALIASES[value] || value;
    return STYLES.some(item => item[0] === v) ? v : "auto";
  }

  function setHits(pattern,laneId,steps,velocity=.78,barOffset=0){
    const lane = pattern.lanes[laneId];
    if(!lane) return;
    steps.forEach(step => {
      const index = Number(step) + barOffset;
      if(index >= 0 && index < pattern.bars * 16) lane.hits[index] = clamp(velocity,.2,1);
    });
  }

  function clearHits(pattern){
    LANES.forEach(def => {
      if(pattern.lanes[def.id]) pattern.lanes[def.id].hits = {};
    });
  }

  function normalizeStyle(style){
    const base = validStyle(style);
    if(base === "auto") return "funk";
    if(base === "latin") return "salsa";
    return base;
  }

  function applyStyle(pattern,style,sectionKey){
    const normalized = normalizeStyle(style || pattern.style || "funk");
    const section = SECTION_PRESETS[sectionKey] || SECTION_PRESETS.verse;
    clearHits(pattern);

    for(let bar=0; bar<pattern.bars; bar++){
      const offset = bar * 16;
      const crashOnBar = section.crash && bar === 0;
      switch(normalized){
        case "funk":
          setHits(pattern,"kick",[0,3,8,10,14],.92,offset);
          setHits(pattern,"snare",[4,12],.88,offset);
          setHits(pattern,"hatClosed",section.density < .7 ? [0,4,8,12] : [0,2,3,6,8,10,11,14],.56,offset);
          if(section.openHat) setHits(pattern,"hatOpen",[7,15],.62,offset);
          if(crashOnBar) setHits(pattern,"crash",[0],.78,offset);
          break;
        case "pop":
          setHits(pattern,"kick",[0,8,11],.86,offset);
          setHits(pattern,"snare",[4,12],.86,offset);
          setHits(pattern,"hatClosed",section.density < .7 ? [0,4,8,12] : [0,2,4,6,8,10,12,14],.52,offset);
          if(crashOnBar) setHits(pattern,"crash",[0],.72,offset);
          break;
        case "rock":
          setHits(pattern,"kick",[0,8,10],.93,offset);
          setHits(pattern,"snare",[4,12],.9,offset);
          setHits(pattern,"hatClosed",[0,2,4,6,8,10,12,14],.58,offset);
          if(section.openHat) setHits(pattern,"hatOpen",[15],.62,offset);
          if(crashOnBar) setHits(pattern,"crash",[0],.82,offset);
          break;
        case "bossa":
          setHits(pattern,"kick",[0,6,8,14],.72,offset);
          setHits(pattern,"snare",[4,10,12],.45,offset);
          setHits(pattern,"hatClosed",[0,2,4,6,8,10,12,14],.42,offset);
          setHits(pattern,"ride",[0,3,6,8,11,14],.48,offset);
          setHits(pattern,"percussion",[2,7,10,15],.52,offset);
          break;
        case "bolero":
          setHits(pattern,"kick",[0,8],.76,offset);
          setHits(pattern,"snare",[4,12],.54,offset);
          setHits(pattern,"hatClosed",[0,4,8,12],.40,offset);
          setHits(pattern,"ride",[2,6,10,14],.38,offset);
          break;
        case "salsa":
          setHits(pattern,"kick",[0,10],.74,offset);
          setHits(pattern,"snare",[4,12],.42,offset);
          setHits(pattern,"hatClosed",[0,2,4,6,8,10,12,14],.42,offset);
          setHits(pattern,"ride",[0,3,6,8,10,14],.55,offset);
          setHits(pattern,"percussion",[0,3,6,10,12,15],.72,offset);
          break;
        case "cumbia":
          // Cambio 467: bombo re-sincronizado con la nueva figura de bajo
          // sincopada de rhythm-engine.js ([0,6,8,12]) — antes pegaba en
          // [0,8], derecho, sin relación real con el bajo. Percusión
          // (guacharaca) más presente, es el instrumento que más define
          // el género.
          setHits(pattern,"kick",[0,6,8,12],.84,offset);
          setHits(pattern,"snare",[4,12],.6,offset);
          setHits(pattern,"hatClosed",[0,2,4,6,8,10,12,14],.48,offset);
          setHits(pattern,"percussion",[0,2,3,5,7,9,10,11,13,14,15],.5,offset);
          break;
        case "reggae":
          setHits(pattern,"kick",[8],.86,offset);
          setHits(pattern,"snare",[8],.84,offset);
          setHits(pattern,"hatClosed",[2,6,10,14],.54,offset);
          setHits(pattern,"hatOpen",[15],.58,offset);
          break;
        case "worship":
          setHits(pattern,"kick",[0,8,10],.78,offset);
          setHits(pattern,"snare",[4,12],.72,offset);
          setHits(pattern,"hatClosed",section.density < .8 ? [0,4,8,12] : [0,2,4,6,8,10,12,14],.44,offset);
          if(section.openHat) setHits(pattern,"hatOpen",[15],.50,offset);
          if(crashOnBar) setHits(pattern,"crash",[0],.72,offset);
          break;
        // Cambio 463: 3 patrones de batería electrónicos nuevos.
        case "trance":
          // Four-on-the-floor clásico: bombo en cada negra, hi-hat
          // cerrado en cada corchea, hi-hat abierto acentuado en los
          // contratiempos — la base de trance más reconocible.
          setHits(pattern,"kick",[0,4,8,12],.95,offset);
          setHits(pattern,"snare",[4,12],.7,offset);
          setHits(pattern,"hatClosed",[0,2,4,6,8,10,12,14],.42,offset);
          setHits(pattern,"hatOpen",[2,6,10,14],.6,offset);
          if(crashOnBar) setHits(pattern,"crash",[0],.7,offset);
          break;
        case "eurotrance":
          // Igual base four-on-the-floor que Trance, pero más denso: hats
          // en semicorcheas (capa suave encima de la capa fuerte de
          // corcheas) y percusión sincopada — sensación más "llena".
          setHits(pattern,"kick",[0,4,8,12],.96,offset);
          setHits(pattern,"snare",[4,12],.74,offset);
          setHits(pattern,"hatClosed",[0,2,4,6,8,10,12,14],.46,offset);
          setHits(pattern,"hatClosed",[1,3,5,7,9,11,13,15],.24,offset);
          setHits(pattern,"hatOpen",[6,14],.62,offset);
          setHits(pattern,"percussion",[3,7,11,15],.4,offset);
          if(crashOnBar) setHits(pattern,"crash",[0],.76,offset);
          break;
        case "electro":
          // Bombo con el "rebote" extra (golpe de más entre el 8 y el
          // 12) típico del electro británico/garage, caja con ghost
          // sincopados y hi-hat abierto ligeramente fuera de la grilla
          // para el aire "bounce" del género.
          setHits(pattern,"kick",[0,4,8,10,12],.9,offset);
          setHits(pattern,"snare",[4,12],.82,offset);
          setHits(pattern,"snare",[7,15],.32,offset);
          setHits(pattern,"hatClosed",[0,2,4,6,8,10,12,14],.4,offset);
          setHits(pattern,"hatOpen",[3,11],.5,offset);
          setHits(pattern,"percussion",[1,9],.46,offset);
          break;
        // Cambio 468: 4 patrones de batería electrónicos nuevos más.
        case "house":
          // Four-on-the-floor con clap clásico de house en el
          // contratiempo, hi-hat abierto acentuado — el "chick" típico
          // del género.
          setHits(pattern,"kick",[0,4,8,12],.92,offset);
          setHits(pattern,"snare",[4,12],.68,offset);
          setHits(pattern,"hatClosed",[2,6,10,14],.5,offset);
          setHits(pattern,"hatOpen",[2,6,10,14],.42,offset);
          setHits(pattern,"percussion",[3,11],.36,offset);
          if(crashOnBar) setHits(pattern,"crash",[0],.66,offset);
          break;
        case "techno":
          // Bombo duro y seco en negras, hi-hat en semicorcheas casi
          // constante (hipnótico), sin caja fuerte ni pad — busca sonar
          // más minimal/directo que House o Trance.
          setHits(pattern,"kick",[0,4,8,12],1,offset);
          setHits(pattern,"hatClosed",[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],.3,offset);
          setHits(pattern,"hatOpen",[6,14],.44,offset);
          setHits(pattern,"percussion",[3,11],.34,offset);
          break;
        case "dnb":
          // Breakbeat sincopado (no four-on-the-floor) — bombo escaso,
          // caja principal en el 2 y 4 con "chatter" de cajas fantasma
          // alrededor, hi-hat denso e irregular. El bajo real de DnB
          // vive en rhythm-engine.js, acá la protagonista es la batería.
          setHits(pattern,"kick",[0,10],.86,offset);
          setHits(pattern,"snare",[4,12],.88,offset);
          setHits(pattern,"snare",[7,9,15],.34,offset);
          setHits(pattern,"hatClosed",[0,2,3,6,8,10,11,14],.44,offset);
          break;
        case "dubstep":
          // Sensación "half-time": un solo golpe grande de caja a mitad
          // de compás (paso 8) en vez de caja en 2 y 4 — es lo que le da
          // esa sensación de espacio/lentitud aunque el tempo real sea
          // rápido. Bombo disperso, hi-hats esporádicos, sin prisa.
          setHits(pattern,"kick",[0,6],.92,offset);
          setHits(pattern,"snare",[8],.95,offset);
          setHits(pattern,"hatClosed",[2,4,6,10,12,14],.34,offset);
          break;
        // Cambio 471: 3 patrones de batería nuevos más.
        case "deephouse":
          // Igual base que House pero más suave — velocidades más bajas,
          // hi-hat abierto más discreto, percusión ligera en vez de
          // clap fuerte. La sensación cálida/relajada del género.
          setHits(pattern,"kick",[0,4,8,12],.8,offset);
          setHits(pattern,"snare",[4,12],.5,offset);
          setHits(pattern,"hatClosed",[2,6,10,14],.4,offset);
          setHits(pattern,"hatOpen",[6,14],.3,offset);
          setHits(pattern,"percussion",[3,7,11,15],.28,offset);
          break;
        case "afrobeats":
          // Bombo sincopado tipo "log drum" (no four-on-the-floor),
          // percusión densa con acentos cruzados — la base rítmica
          // moderna de afrobeats/amapiano, no una imitación de house.
          setHits(pattern,"kick",[0,3,6,10,13],.86,offset);
          setHits(pattern,"snare",[8],.6,offset);
          setHits(pattern,"hatClosed",[0,2,4,6,8,10,12,14],.36,offset);
          setHits(pattern,"percussion",[1,5,7,9,11,15],.5,offset);
          break;
        case "dembow":
          // El patrón "boom-ch-boom-chick" clásico del dembow/reggaetón
          // — bombo pegado exacto con el bajo de rhythm-engine.js
          // ([0,6,10]), caja marcando el "ch" en el contratiempo,
          // hi-hat en corcheas rectas sin swing (muy cuantizado, así es
          // el género real).
          setHits(pattern,"kick",[0,6,10],.92,offset);
          setHits(pattern,"snare",[3,11],.8,offset);
          setHits(pattern,"hatClosed",[0,2,4,6,8,10,12,14],.42,offset);
          break;
        default:
          setHits(pattern,"kick",[0,8,10],.88,offset);
          setHits(pattern,"snare",[4,12],.84,offset);
          setHits(pattern,"hatClosed",[0,2,4,6,8,10,12,14],.52,offset);
      }
    }
    pattern.style = validStyle(style);
    pattern.sectionKey = sectionKey || pattern.sectionKey || "intro";
    return pattern;
  }

  function patternForStyle(style,sectionKey,{kit="studio",bars=1,bpm=95,enabled=true} = {}){
    const pattern = emptyPattern({kit,style,sectionKey,bars,bpm,enabled});
    return applyStyle(pattern, style === "auto" ? "funk" : style, sectionKey || "intro");
  }

  function normalize(raw = {}, context = {}){
    const sectionKey = raw.sectionKey || context.sectionKey || "intro";
    const style = validStyle(raw.style || context.style || "auto");
    const pattern = emptyPattern({
      kit:raw.kit || context.kit || "studio",
      style,
      sectionKey,
      bars:raw.bars || context.bars || 1,
      bpm:raw.bpm || context.bpm || 95,
      enabled:raw.enabled !== false
    });
    pattern.swing = clamp(raw.swing ?? context.swing ?? 0,0,.35);
    pattern.humanize = clamp(raw.humanize ?? context.humanize ?? .02,0,.18);
    pattern.masterVolume = clamp(raw.masterVolume ?? context.masterVolume ?? .78,0,1);
    LANES.forEach(def => {
      const incoming = raw?.lanes?.[def.id] || {};
      const lane = pattern.lanes[def.id];
      lane.enabled = incoming.enabled !== false;
      lane.mute = incoming.mute === true;
      lane.solo = incoming.solo === true;
      lane.volume = clamp(incoming.volume ?? def.defaultVolume,0,1);
      Object.entries(incoming.hits || {}).forEach(([step,velocity]) => {
        const index = clamp(step,0,pattern.bars * 16 - 1);
        const amount = Number(velocity);
        if(amount > 0) lane.hits[index] = clamp(amount,.2,1);
      });
    });
    const hasHits = LANES.some(def => Object.keys(pattern.lanes[def.id].hits).length);
    if(!hasHits) applyStyle(pattern, style === "auto" ? (context.songStyle || context.style || "funk") : style, sectionKey);
    return pattern;
  }

  function hitsAtStep(pattern,step){
    const normalized = normalize(pattern);
    if(normalized.enabled === false) return [];
    const total = Math.max(1, normalized.bars * 16);
    const index = ((Number(step) || 0) % total + total) % total;
    const solo = LANES.some(def => normalized.lanes[def.id]?.solo);
    return LANES
      .map(def => {
        const lane = normalized.lanes[def.id];
        const velocity = Number(lane?.hits?.[index] || 0);
        if(!velocity || !lane || !lane.enabled || lane.mute || (solo && !lane.solo)) return null;
        return {
          laneId:def.id,
          label:def.label,
          short:def.short,
          velocity:clamp(velocity,0,1) * clamp(lane.volume ?? def.defaultVolume,0,1) * clamp(normalized.masterVolume ?? .78,0,1)
        };
      })
      .filter(Boolean);
  }

  function countHits(pattern){
    const p = normalize(pattern);
    return LANES.reduce((sum,def) => sum + Object.keys(p.lanes[def.id].hits || {}).length,0);
  }

  function laneLabel(id){
    return LANES.find(def => def.id === id)?.label || id;
  }

  return {
    version:"drum-patterns-core-v0.7.2.7",
    lanes:LANES,
    kits:KITS,
    styles:STYLES,
    normalize,
    patternForStyle,
    applyStyle,
    hitsAtStep,
    countHits,
    laneLabel,
    validStyle,
    validKit,
    clone
  };
})();
