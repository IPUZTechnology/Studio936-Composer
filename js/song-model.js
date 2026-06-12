// Studio 936 Composer - Song Model Module
// Source: extracted from v25.9 core modular.

window.Studio936SongModel = (() => {
'use strict';
const sectionNames = {
    intro:'Introducción', verse:'Verso', verse1:'Verso 1', verse2:'Verso 2', verse3:'Verso 3', verse4:'Verso 4', prechorus:'Pre-coro', chorus:'Coro', bridge:'Puente', interlude:'Interludio', solo:'Solo', outro:'Outro'
};
const songOrder = ['intro','verse','verse1','verse2','verse3','verse4','prechorus','chorus','bridge','interlude','solo','outro'];
const defaultLyrics = () => ({
    intro:'Intro instrumental sobre Fmaj13 – Fmaj7 – Cmaj7.\nRepetir dos veces para abrir el groove.',
    verse:'Quizás no pueda ser\nEste el lugar\nPues solo vine aquí\nA despertar\noooohhh tiempo de la verdad',
    verse1:'De la luz eterna\nRecibí el don de amar\nYo soy aquí y allá\nEn ti padre uno más\nYo yo yo yo soy, yo soy la verdad',
    verse2:'Despertar de un sueño\nLlamado realidad\nCon los pies descalzos\nSobre Madre Gaia\nConectando soles volviendo a la unidad',
    verse3:'Vive esta verdad\nY el camino se abrirá\nPaz en el corazón\nY la alquimia florecerá\nEs la vuelta a casa y es recordar',
    verse4:'Nuevo verso o variación. Escribe aquí la letra de esta parte.',
    prechorus:'Ama, ríe, baila\nCrea tu propia realidad\nLuz por siempre\nMi llama encendida esta',
    chorus:'La magia vibra en mí\ndespierta un genio aquí\nTiempo de la verdad\nEs hora de despertar',
    interlude:'Interludio instrumental.\nUsa este espacio para respirar antes de volver al verso o al coro.',
    bridge:'Puente / bridge. Úsalo para cambiar energía antes del coro final.',
    solo:'Solo principal.\nPuedes modificar la frase de solo y probar nuevas melodías.',
    outro:'Final / outro. Cierra la canción o deja una repetición suave.'
});

const defaultSectionSolos = () => ({
    intro:{key:'F', scale:'major', phrase:'D4:1 E4:1 G4:1 A4:1 C5:1 D5:1 F5:1 E5:1 C5:1 B4:1 A4:1 G4:1 R:2 G4:1 A4:1'},
    verse:{key:'F', scale:'major', phrase:''},
    verse1:{key:'F', scale:'major', phrase:''},
    verse2:{key:'F', scale:'major', phrase:''},
    verse3:{key:'F', scale:'major', phrase:''},
    verse4:{key:'F', scale:'major', phrase:''},
    prechorus:{key:'C', scale:'major', phrase:'E4:2 G4:2 A4:2 D5:2 C5:2 A4:2 G4:2 E4:2'},
    chorus:{key:'G', scale:'mixolydian', phrase:'B4:2 D5:2 E5:2 A5:2 G5:4 R:2 E5:2 D5:2'},
    interlude:{key:'C', scale:'major', phrase:'G4:1 G4:1 R:1 G4:1 A4:1 C5:1 A4:1 G4:1 E4:1 G4:1 A4:1 C5:1 D5:1 C5:1 A4:1 G4:1'},
    bridge:{key:'C', scale:'major', phrase:''},
    solo:{key:'F', scale:'major', phrase:'D4:1 E4:1 G4:1 A4:1 C5:1 D5:1 F5:1 E5:1 C5:1 B4:1 A4:1 G4:1 R:2 G4:1 A4:1 C5:1 D5:1 E5:1 D5:1 C5:1 B4:1 A4:1 G4:2 F4:2 E4:2 C4:4'},
    outro:{key:'C', scale:'major', phrase:''}
});

const noteNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const solfege = { 'DO':'C','RE':'D','MI':'E','FA':'F','SOL':'G','LA':'A','SI':'B' };
const enharmonic = { 'CB':'B','B#':'C','E#':'F','FB':'E' };
const scaleIntervals = {
    minorPent:[0,3,5,7,10,12], majorPent:[0,2,4,7,9,12], blues:[0,3,5,6,7,10,12],
    dorian:[0,2,3,5,7,9,10,12], mixolydian:[0,2,4,5,7,9,10,12], major:[0,2,4,5,7,9,11,12], minor:[0,2,3,5,7,8,10,12]
};


function defaultArrangement(){
    return [
        {id:'a_intro',section:'intro',label:'Intro'},
        {id:'a_verse',section:'verse',label:'Verso 1'},
        {id:'a_verse1',section:'verse1',label:'Verso 2'},
        {id:'a_pre1',section:'prechorus',label:'Pre-coro'},
        {id:'a_chorus1',section:'chorus',label:'Coro'},
        {id:'a_interlude',section:'interlude',label:'Interludio'},
        {id:'a_verse2',section:'verse2',label:'Verso 3'},
        {id:'a_verse3',section:'verse3',label:'Verso 4'},
        {id:'a_pre2',section:'prechorus',label:'Pre-coro BIS'},
        {id:'a_chorus2',section:'chorus',label:'Coro BIS'},
        {id:'a_outro',section:'outro',label:'Outro'}
    ];
}

const defaultProject = () => ({
    title:'Despertar de un Sueño', author:'Rafael Ipuz', bpm:95, style:'funk', instrument:'piano', arrangement: defaultArrangement(), grooveVol:7, viewMode:'piano', routingMode:'normal', fretMode:'guitar', tuningHz:440, voicingLibrary:normalizeVoicingLibrary(null),
    soloOn:true,
    soloPhrase:'D4:1 E4:1 G4:1 A4:1 C5:1 D5:1 F5:1 E5:1 C5:1 B4:1 A4:1 G4:1 R:2 G4:1 A4:1 C5:1 D5:1 E5:1 D5:1 C5:1 B4:1 A4:1 G4:2 F4:2 E4:2 C4:4',
    soloKey:'F', soloScale:'major',
    lyrics: defaultLyrics(),
    sectionSolos: defaultSectionSolos(),
    sections:{
        intro:[
            chord('Fmaj13','F2','E3 A3 D4 F4',2),
            chord('Fmaj7','F2','E3 A3 C4 E4',2),
            chord('Cmaj7','C2','B2 E3 G3 B3',2),
            chord('Fmaj13','F2','E3 A3 D4 F4',2),
            chord('Fmaj7','F2','E3 A3 C4 E4',2),
            chord('Cmaj7','C2','B2 E3 G3 B3',2)
        ],
        verse:[
            chord('Fmaj13','F2','E3 A3 D4 F4',2),
            chord('Fmaj7','F2','E3 A3 C4 E4',1),
            chord('Cmaj7','C2','B2 E3 G3 B3',1),
            chord('Fmaj13','F2','E3 A3 D4 F4',2),
            chord('Fmaj7','F2','E3 A3 C4 E4',1),
            chord('Cmaj7','C2','B2 E3 G3 B3',1),
            chord('Fmaj13','F2','E3 A3 D4 F4',1),
            chord('Fmaj7','F2','E3 A3 C4 E4',1),
            chord('Cmaj7','C2','B2 E3 G3 B3',2)
        ],
        verse1:[
            chord('Fmaj13','F2','E3 A3 D4 F4',2),
            chord('Fmaj7','F2','E3 A3 C4 E4',1),
            chord('Cmaj7','C2','B2 E3 G3 B3',1),
            chord('Fmaj13','F2','E3 A3 D4 F4',2),
            chord('Fmaj7','F2','E3 A3 C4 E4',1),
            chord('Cmaj7','C2','B2 E3 G3 B3',1),
            chord('Fmaj13','F2','E3 A3 D4 F4',1),
            chord('Fmaj7','F2','E3 A3 C4 E4',1),
            chord('Cmaj7','C2','B2 E3 G3 B3',2)
        ],
        verse2:[
            chord('Fmaj13','F2','E3 A3 D4 F4',2),
            chord('Fmaj7','F2','E3 A3 C4 E4',1),
            chord('Cmaj7','C2','B2 E3 G3 B3',1),
            chord('Fmaj13','F2','E3 A3 D4 F4',2),
            chord('Fmaj7','F2','E3 A3 C4 E4',1),
            chord('Cmaj7','C2','B2 E3 G3 B3',1),
            chord('Fmaj13','F2','E3 A3 D4 F4',1),
            chord('Fmaj7','F2','E3 A3 C4 E4',1),
            chord('Cmaj7','C2','B2 E3 G3 B3',2)
        ],
        verse3:[
            chord('Fmaj13','F2','E3 A3 D4 F4',2),
            chord('Fmaj7','F2','E3 A3 C4 E4',1),
            chord('Cmaj7','C2','B2 E3 G3 B3',1),
            chord('Fmaj13','F2','E3 A3 D4 F4',2),
            chord('Fmaj7','F2','E3 A3 C4 E4',1),
            chord('Cmaj7','C2','B2 E3 G3 B3',1),
            chord('Fmaj13','F2','E3 A3 D4 F4',1),
            chord('Fmaj7','F2','E3 A3 C4 E4',1),
            chord('Cmaj7','C2','B2 E3 G3 B3',2)
        ],
        verse4:[
            chord('Fmaj13','F2','E3 A3 D4 F4',2),
            chord('Fmaj7','F2','E3 A3 C4 E4',1),
            chord('Cmaj7','C2','B2 E3 G3 B3',1)
        ],
        prechorus:[
            chord('Fmaj7/C','C2','E3 A3 C4 E4',1),
            chord('C6/9','C2','E3 G3 A3 D4',1),
            chord('Am6/11','A1','C3 E3 F3 A3',1),
            chord('Cmaj7','C2','B2 E3 G3 B3',1),
            chord('Fmaj7/C','C2','E3 A3 C4 E4',1),
            chord('C6/9','C2','E3 G3 A3 D4',1),
            chord('Am6/11','A1','C3 E3 F3 A3',1),
            chord('Cmaj7','C2','B2 E3 G3 B3',1)
        ],
        chorus:[
            chord('G6/9','G1','B2 D3 E3 A3',1),
            chord('Am6','A1','C3 E3 F#3 A3',1),
            chord('Gmaj9','G1','B2 D3 F#3 A3',1),
            chord('C','C2','C3 E3 G3 C4',1),
            chord('G6/9','G1','B2 D3 E3 A3',1),
            chord('Am6','A1','C3 E3 F#3 A3',1),
            chord('Gmaj9','G1','B2 D3 F#3 A3',1),
            chord('C','C2','C3 E3 G3 C4',1)
        ],
        bridge:[
            chord('Dm9','D2','F3 A3 C4 E4',1),
            chord('G13','G1','F3 A3 B3 E4',1),
            chord('Cmaj9','C2','E3 G3 B3 D4',2)
        ],
        interlude:[
            chord('Fmaj7/C','C2','E3 A3 C4 E4',1),
            chord('C6/9','C2','E3 G3 A3 D4',1),
            chord('Am6/11','A1','C3 E3 F3 A3',1),
            chord('Cmaj7','C2','B2 E3 G3 B3',1),
            chord('Fmaj7/C','C2','E3 A3 C4 E4',1),
            chord('C6/9','C2','E3 G3 A3 D4',1),
            chord('Am6/11','A1','C3 E3 F3 A3',1),
            chord('Cmaj7','C2','B2 E3 G3 B3',1),
            chord('G6/9','G1','B2 D3 E3 A3',1),
            chord('Am6','A1','C3 E3 F#3 A3',1),
            chord('Gmaj6','G1','B2 D3 E3 G3',1),
            chord('C','C2','C3 E3 G3 C4',1)
        ],
        solo:[
            chord('Fmaj13','F2','E3 A3 D4 F4',2),
            chord('Fmaj7','F2','E3 A3 C4 E4',2),
            chord('Cmaj7','C2','B2 E3 G3 B3',2)
        ],
        outro:[
            chord('C','C2','C3 E3 G3 C4',2)
        ]
    }
});
function chord(name,bass,notes,bars){return {name,bass,notes,bars:Number(bars)||1};}

function deepClone(value){
    return value == null ? value : JSON.parse(JSON.stringify(value));
}

function normalizeChord(raw, fallback){
    const source = raw && typeof raw === 'object' ? raw : (fallback || {});
    const base = chord(
        source.name || fallback?.name || 'C',
        source.bass || fallback?.bass || 'C2',
        source.notes || fallback?.notes || 'C3 E3 G3',
        source.bars || fallback?.bars || 1
    );
    const out = {...deepClone(source), ...base};
    if(source.voicings && typeof source.voicings === 'object'){
        out.voicings = deepClone(source.voicings);
    }
    return out;
}

function normalizeVoicingLibrary(raw){
    const instruments = ['piano','guitar','ukulele','bass'];
    const out = {};
    instruments.forEach(instrument=>{
        out[instrument] = {};
        const source = raw && typeof raw === 'object' ? raw[instrument] : null;
        if(source && typeof source === 'object'){
            Object.entries(source).forEach(([name,voicing])=>{
                if(voicing && typeof voicing === 'object'){
                    out[instrument][String(name).trim().toUpperCase()] = deepClone(voicing);
                }
            });
        }
    });
    return out;
}


function clamp(n,a,b){return Math.max(a,Math.min(b,n));}

function normalizeSectionSolos(raw, legacy, defaults){
    const out = JSON.parse(JSON.stringify(defaults || defaultSectionSolos()));
    if(raw && typeof raw === 'object'){
        songOrder.forEach(k=>{
            const r = raw[k];
            if(typeof r === 'string') out[k] = {...out[k], phrase:r};
            else if(r && typeof r === 'object') out[k] = {...out[k], ...r};
        });
    }
    if(legacy && legacy.soloPhrase && (!raw || !raw.solo)){
        out.solo = {key:legacy.soloKey || 'F', scale:legacy.soloScale || 'major', phrase:legacy.soloPhrase};
    }
    songOrder.forEach(k=>{
        out[k] = out[k] || {key:'C', scale:'major', phrase:''};
        out[k].key = out[k].key || 'C';
        out[k].scale = out[k].scale || 'major';
        out[k].phrase = out[k].phrase || '';
    });
    return out;
}

function normalizeArrangement(raw, prj){
    const fallback = defaultArrangement();
    const sections = prj && prj.sections ? prj.sections : {};
    let arr = Array.isArray(raw) && raw.length ? raw : fallback;
    arr = arr.map((p,i)=>{
        if(typeof p === 'string') return {id:'part_'+i+'_'+p, section:p, label:sectionNames[p] || p};
        const section = p && p.section && sections[p.section] ? p.section : null;
        if(!section) return null;
        return {id: p.id || ('part_'+i+'_'+section), section, label: String(p.label || sectionNames[section] || section)};
    }).filter(Boolean);
    if(!arr.length) arr = Object.keys(sections).filter(k=>sections[k] && sections[k].length).slice(0,1).map((k,i)=>({id:'part_'+i+'_'+k,section:k,label:sectionNames[k]||k}));
    return arr;
}

function normalizeProject(p, styles={}, instruments={}){
    const d = defaultProject();
    p = p || {};
    const merged = {...d, ...p};
    merged.sections = {...d.sections, ...(p.sections||{})};
    if(!merged.sections.verse4) merged.sections.verse4 = JSON.parse(JSON.stringify(merged.sections.verse3 || merged.sections.verse || d.sections.verse));
    if(!merged.sections.bridge) merged.sections.bridge = JSON.parse(JSON.stringify(merged.sections.prechorus || d.sections.prechorus));
    if(!merged.sections.outro) merged.sections.outro = [chord('C','C2','C3 E3 G3 C4',2)];
    merged.lyrics = {...d.lyrics, ...(p.lyrics||{})};
    merged.sectionSolos = normalizeSectionSolos(p.sectionSolos || null, p, d.sectionSolos);
    Object.keys(merged.sections).forEach(k=>{
        if(!Array.isArray(merged.sections[k]) || !merged.sections[k].length) merged.sections[k]=d.sections[k] || [chord('C','C2','C3 E3 G3',1)];
        merged.sections[k] = merged.sections[k].map((x,i)=>normalizeChord(x, d.sections[k]?.[i] || null));
    });
    merged.voicingLibrary = normalizeVoicingLibrary(p.voicingLibrary || merged.voicingLibrary);
    merged.arrangement = normalizeArrangement(p.arrangement, merged);
    if(styles && Object.keys(styles).length && !styles[merged.style]) merged.style='funk';
    if(instruments && Object.keys(instruments).length && !instruments[merged.instrument]) merged.instrument='piano';
    merged.author = String(merged.author || '').trim() || 'Autor no definido';
    merged.bpm = clamp(Number(merged.bpm)||95,60,160);
    merged.grooveVol = clamp(Number(merged.grooveVol)||7,1,10);
    merged.viewMode = merged.viewMode === 'fretboard' ? 'fretboard' : 'piano';
    merged.routingMode = merged.routingMode === 'split' ? 'split' : 'normal';
    merged.fretMode = ['guitar','ukulele','bass'].includes(merged.fretMode) ? merged.fretMode : 'guitar';
    merged.tuningHz = clamp(Number(merged.tuningHz)||440,390,470);
    merged.soloOn = merged.soloOn !== false;
    return merged;
}

return {
    sectionNames,
    songOrder,
    defaultLyrics,
    defaultSectionSolos,
    noteNames,
    solfege,
    enharmonic,
    scaleIntervals,
    defaultArrangement,
    defaultProject,
    chord,
    normalizeChord,
    normalizeVoicingLibrary,
    normalizeProject,
    normalizeArrangement,
    normalizeSectionSolos
};
})();
