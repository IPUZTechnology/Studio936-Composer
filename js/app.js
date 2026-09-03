// Studio 936 Composer - extracted JavaScript from legacy v25.9 + Editor Pro bridge v0.7.2.7 Drum Patterns Base
// Keep script order intact.

(() => {
'use strict';
const debugArrangementEnabled = new URLSearchParams(window.location.search).get('debugArrangement') === '1';
const STORAGE_KEY = 'studio936ComposerV25SongStructure';
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
window.__studio936AudioCtx = audioCtx;

// Cambio 455: bus maestro con limitador — antes, connectOut() mandaba cada
// nota (o cada cuerda de un acorde) directo a audioCtx.destination, sin
// ningun control compartido. Con una sola nota nunca se notaba, pero un
// acorde real son 3-6 cuerdas del mismo sample sonando casi juntas (unos
// 24ms de diferencia entre cada una, para el rasgueo) — sumadas, superan
// facil el limite de 0 a 1 que soporta la salida de audio, y el navegador
// recorta la onda a la fuerza (clipping). Eso sonaba distorsionado/sucio,
// como si fuera "otro instrumento" en vez de una guitarra limpia (Val,
// sesion de hoy). Un DynamicsCompressorNode entre todo y el destino final
// evita que la suma se pase — no cambia el timbre de una nota sola, solo
// evita que varias juntas se aplasten.
// Cambio 456: compresor suavizado — Val reportó que el piano/Rhodes (que
// antes sonaba bien) quedó "aplastado" tras el Cambio 455. El umbral de
// -8dB con ratio 9:1 estaba comprimiendo CUALQUIER nota, no solo los
// acordes que sumaban demasiado. Ahora el umbral queda casi en el techo
// (-2dB) — una nota sola nunca lo toca, sigue sonando igual que siempre;
// solo entra cuando varias notas juntas (un acorde real) se acercan al
// límite, que es exactamente el caso que había que resolver.
const __studio936MasterCompressor = audioCtx.createDynamicsCompressor();
__studio936MasterCompressor.threshold.setValueAtTime(-2, audioCtx.currentTime);
__studio936MasterCompressor.knee.setValueAtTime(6, audioCtx.currentTime);
__studio936MasterCompressor.ratio.setValueAtTime(14, audioCtx.currentTime);
__studio936MasterCompressor.attack.setValueAtTime(0.002, audioCtx.currentTime);
__studio936MasterCompressor.release.setValueAtTime(0.12, audioCtx.currentTime);
__studio936MasterCompressor.connect(audioCtx.destination);
window.__studio936MasterBus = __studio936MasterCompressor;

const SongModel = window.Studio936SongModel || {};
const {
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
    chord
} = SongModel;
if(!sectionNames || !songOrder || !defaultProject || !chord){
    throw new Error('Studio936SongModel no está cargado. Revisa que js/song-model.js se cargue antes de js/app.js.');
}

const instruments = window.Studio936Instruments || {}; // Loaded from js/instruments.js
let editorPreviewInstrument = null;
function activeInstrumentId(){
    return editorPreviewInstrument || project.instrument || 'piano';
}
function currentInstrument(){
    return instruments[activeInstrumentId()] || instruments.piano;
}
// Cambio 135: toca una nota forzando un instrumento específico, sin
// importar cuál esté seleccionado arriba — es la base de las voces
// paralelas de Piano/Ukelele en el Mixer de Canales (práctica).
function playNoteAsInstrument(midi,vol,decay,type,time,instrumentId){
    if(!Number.isFinite(midi)) return;
    const role = noteRole(type);
    const inst = instruments[instrumentId] || instruments.piano;
    const prof = inst[role] || inst.chord || instruments.piano.chord;
    // Cambio 448: mismo criterio que playNoteImpl (Cambio 446) — esta
    // función se usa para forzar un instrumento específico sin importar
    // cuál esté seleccionado arriba (selector de práctica, voces
    // paralelas de Piano/Ukelele en el Mixer de Canales). Se le había
    // quedado afuera del Cambio 446 — por eso Val vio que elegir otro
    // instrumento en el selector no cambiaba el sonido real.
    const sampleEngine = window.Studio936SampleEngine;
    if (sampleEngine) {
        if (sampleEngine.hasSample(instrumentId)) {
            const now = Math.max(time, audioCtx.currentTime);
            const m = adjustedMidiForInstrument(midi, prof, role);
            const finalDecay = Math.max(.06, decay * (prof.decayMult || 1));
            const v = Math.min(1, vol * (project.grooveVol/7) * (prof.volMult || 1) * 2.2);
            const outGain = audioCtx.createGain();
            connectOut(outGain, role);
            const played = sampleEngine.playSampledNote(audioCtx, outGain, instrumentId, m, finalDecay, v, now);
            if (played) return;
        } else {
            sampleEngine.warmUp(audioCtx, instrumentId);
        }
    }
    if(inst.mode === 'pluck') return playPluckedNote(midi,vol,decay,type,time,role,inst,prof);
    if(inst.mode === 'wind') return playWindNote(midi,vol,decay,type,time,role,inst,prof);
    return playBasicSynthNote(midi,vol,decay,type,time,role,inst,prof);
}
function strumChordAsInstrument(notes,dur,vol,time,instrumentId){
    notes.forEach((m,i) => playNoteAsInstrument(m,dur,vol,'triangle',time + i*0.012,instrumentId));
}
function masterA(){ return clamp(Number(project.tuningHz)||440,390,470); }
function midiFreq(m){ return masterA() * Math.pow(2,(m-69)/12); }
function connectOut(node,role='music'){
    // Cambio 133: panorama (izquierda/derecha) real por canal, desde el
    // Mixer de Canales. El modo "split" (click a la izquierda) sigue
    // funcionando como base; el panorama del canal, si está puesto, gana.
    let panValue = null;
    if(project.routingMode === 'split') panValue = (role === 'click') ? -1 : 1;
    const channelKey = role === 'bass' ? 'bass' : role === 'solo' ? 'solo' : role === 'drums' ? 'drums' : (role === 'chord' || role === 'music') ? 'chord' : null;
    if(channelKey && channelMix[channelKey] && channelMix[channelKey].pan) panValue = channelMix[channelKey].pan;
    // Cambio 455: bus maestro con limitador en vez de audioCtx.destination
    // directo — ver __studio936MasterCompressor más arriba.
    const outBus = window.__studio936MasterBus || audioCtx.destination;
    if(panValue !== null && audioCtx.createStereoPanner){
        const pan = audioCtx.createStereoPanner();
        pan.pan.setValueAtTime(Math.max(-1,Math.min(1,panValue)),audioCtx.currentTime);
        node.connect(pan); pan.connect(outBus);
    } else node.connect(outBus);
}
function noteRole(type){ if(type==='sine') return 'bass'; if(type==='square') return 'solo'; return 'chord'; }

const styles = window.Studio936Rhythms || {}; // Loaded from js/rhythm-engine.js
const DrumPatterns = window.Studio936DrumPatterns || null; // Loaded from js/suite-pro-drum-patterns.js

const Transport = window.Studio936Transport || {};

const modelNormalizeProject = SongModel.normalizeProject;
const normalizeArrangement = SongModel.normalizeArrangement;
const normalizeSectionSolos = SongModel.normalizeSectionSolos;
if(!modelNormalizeProject || !normalizeArrangement || !normalizeSectionSolos){
    throw new Error('Studio936SongModel incompleto. Revisa normalizeProject / normalizeArrangement / normalizeSectionSolos en js/song-model.js.');
}


const Storage = window.Studio936Storage;
if(!Storage){
    throw new Error('Studio936Storage no está cargado. Revisa que js/storage.js se cargue antes de js/app.js.');
}

const Piano = window.Studio936Piano;
if(!Piano || !Piano.buildPiano){
    throw new Error('Studio936Piano no está cargado. Revisa que js/piano.js se cargue antes de js/app.js.');
}

const Fretboard = window.Studio936Fretboard;
if(!Fretboard || !Fretboard.buildFretboard){
    throw new Error('Studio936Fretboard no está cargado. Revisa que js/fretboard.js se cargue antes de js/app.js.');
}
const EditorModule = window.Studio936Editor;
if(!EditorModule || !EditorModule.setup){
    throw new Error('Studio936Editor no está cargado. Revisa que js/editor.js se cargue antes de js/app.js.');
}

const els = {
    piano:document.getElementById('piano'), fretboardContainer:document.getElementById('fretboardContainer'), fretboard:document.getElementById('fretboard'), fretMarkers:document.getElementById('fretMarkers'), viewToggleBtn:document.getElementById('viewToggleBtn'), routingSelect:document.getElementById('routingSelect'), fretModeSelect:document.getElementById('fretModeSelect'), tuningSelect:document.getElementById('tuningSelect'), tuningCustom:document.getElementById('tuningCustom'), midiBtn:document.getElementById('midiBtn'), songTitle:document.getElementById('songTitle'), songAuthor:document.getElementById('songAuthor'), styleSelect:document.getElementById('styleSelect'), instrumentSelect:document.getElementById('instrumentSelect'), sectionSelect:document.getElementById('sectionSelect'),
    bpmSlider:document.getElementById('bpmSlider'), bpmDisplay:document.getElementById('bpmDisplay'), metroDot:document.getElementById('metroDot'), playBtn:document.getElementById('playBtn'), playSongBtn:document.getElementById('playSongBtn'), metroBtn:document.getElementById('metroBtn'), soloBtn:document.getElementById('soloBtn'), chordHoldBtn:document.getElementById('chordHoldBtn'), tableroBtn:document.getElementById('tableroBtn'), saveBtn:document.getElementById('saveBtn'),
    sectionLabel:document.getElementById('sectionLabel'), measureLabel:document.getElementById('measureLabel'), chordLabel:document.getElementById('chordLabel'), currentPartTag:document.getElementById('currentPartTag'), stepGrid:document.getElementById('stepGrid'),
    chordSelect:document.getElementById('chordSelect'), chordName:document.getElementById('chordName'), bassInput:document.getElementById('bassInput'), chordNotes:document.getElementById('chordNotes'), barsInput:document.getElementById('barsInput'), grooveVol:document.getElementById('grooveVol'),
    previewBtn:document.getElementById('previewBtn'), applyBtn:document.getElementById('applyBtn'), addBtn:document.getElementById('addBtn'), dupBtn:document.getElementById('dupBtn'), deleteBtn:document.getElementById('deleteBtn'),
    sectionList:document.getElementById('sectionList'), resetSectionBtn:document.getElementById('resetSectionBtn'), resetAllBtn:document.getElementById('resetAllBtn'),
    soloKey:document.getElementById('soloKey'), soloScale:document.getElementById('soloScale'), soloPhrase:document.getElementById('soloPhrase'), previewSoloBtn:document.getElementById('previewSoloBtn'), generateSoloBtn:document.getElementById('generateSoloBtn'), applySoloBtn:document.getElementById('applySoloBtn'),
    txtBtn:document.getElementById('txtBtn'), jsonBtn:document.getElementById('jsonBtn'), copyBtn:document.getElementById('copyBtn'), importBtn:document.getElementById('importBtn'), importFile:document.getElementById('importFile'), lyricsBtn:document.getElementById('lyricsBtn'), lyricsModal:document.getElementById('lyricsModal'), lyricsGrid:document.getElementById('lyricsGrid'), closeLyricsBtn:document.getElementById('closeLyricsBtn'), saveLyricsBtn:document.getElementById('saveLyricsBtn'), saveStatus:document.getElementById('saveStatus'), styleHelp:document.getElementById('styleHelp'), editorSectionBadge:document.getElementById('editorSectionBadge'), sectionNoteMap:document.getElementById('sectionNoteMap'), lyricsMap:document.getElementById('lyricsMap'), helpBtn:document.getElementById('helpBtn'), helpModal:document.getElementById('helpModal'), closeHelpBtn:document.getElementById('closeHelpBtn'), clearSoloBtn:document.getElementById('clearSoloBtn')
};
let project = loadProject();
const EDITOR_INSTRUMENT_IDS = ['piano','guitar','ukulele','bass','lead'];
const EDITOR_SURFACE_IDS = [...EDITOR_INSTRUMENT_IDS,'drums'];
let editorInstrument = [...EDITOR_INSTRUMENT_IDS,'drums'].includes(project.instrument) ? project.instrument : 'piano';
let _mainInstrumentBeforeEditor = null; // v0.8.0: instrumento original del Main antes de abrir el Editor
function canonicalInstrumentId(value){
    const id = String(value || '').trim().toLowerCase();
    if(id === 'uke' || id === 'ukelele' || id === 'ukulele') return 'ukulele';
    if(id === 'guitarra' || id === 'guitar') return 'guitar';
    // Cambio 457: guitarSteel/guitarElectric (Cambio 456) usan un sample de
    // audio distinto (eso vive en activeInstrumentId(), sin tocar), pero
    // para TODO lo estructural — diapasón, voicings, tuning — son una
    // guitarra normal de 6 cuerdas. Sin esto, caían en ninguna categoría
    // conocida y el diapasón no se mostraba (Val: "me sale el piano").
    if(id === 'guitarsteel' || id === 'guitar-steel' || id === 'guitarelectric' || id === 'guitar-electric') return 'guitar';
    if(id === 'guitar-lead' || id === 'guitarra-lead' || id === 'g.lead' || id === 'glead') return 'lead';
    if(id === 'bajo' || id === 'bass') return 'bass';
    if(id === 'drum' || id === 'drums' || id === 'bateria' || id === 'batería') return 'drums';
    if(id === 'piano') return 'piano';
    return id;
}

const InstrumentSurfaceManager = window.Studio936InstrumentSurfaceManager;
if(!InstrumentSurfaceManager || typeof InstrumentSurfaceManager.configure !== 'function'){
    throw new Error('Studio936InstrumentSurfaceManager no está cargado. Revisa el orden de scripts antes de js/app.js.');
}
InstrumentSurfaceManager.configure({
    pianoContainer:()=>document.getElementById('pianoContainer'),
    fretboardContainer:()=>els.fretboardContainer || document.getElementById('fretboardContainer'),
    stringSurface:()=>window.Studio936StringSurface || null,
    drumSurface:()=>window.Studio936DrumSurface || null,
    getMainInstrument:()=>project.instrument || 'piano'
});

function captureEditorSurfaceSession(){
    return InstrumentSurfaceManager.beginEditorSession(editorInstrument);
}
function mountEditorInstrumentSurface(instrument){
    // Desmontar chart si estaba activo desde Estructura
    try { if(window.Studio936SuiteProChart?.isActive?.()) window.Studio936SuiteProChart.unmountFromRightPanel(); } catch(_) {}
    // v0.7.3.10 — Fix: Piano y Batería pasan por el SurfaceManager correctamente.
    // Bug anterior: Piano hacía endEditorSession+manejo manual → ISM perdía control.
    // Bug anterior: Drums llamaba renderMainDrumSurface → montaba batería del Main, no del Editor.
    // Bug anterior: segundo bloque if(drums) nunca ejecutaba (primer bloque retornaba antes).
    const requested = canonicalInstrumentId(instrument);
    const value = EDITOR_SURFACE_IDS.includes(requested) ? requested : 'piano';
    editorInstrument = value;

    if(value === 'piano'){
        // Limpiar superficies de editor de cuerdas/batería antes de mostrar piano
        try { clearMainStringSurface(); } catch(_) {}
        try { clearMainDrumSurface(); } catch(_) {}
        // El SurfaceManager maneja visibilidad de pianoContainer y fretboardContainer
        return InstrumentSurfaceManager.showEditorInstrument('piano');
    }

    if(value === 'drums'){
        // Usar renderEditorDrums vía ISM — nunca renderMainDrumSurface desde el Editor
        const sectionKey = els.sectionSelect?.value || 'intro';
        const pattern = project.drumPatterns?.[sectionKey] || {};
        return mountEditorDrumSurface({
            pattern,
            sectionKey,
            sectionName: sectionNames[sectionKey] || sectionKey
        });
    }

    // v0.7.5.9: renderizar directamente via ISM con seq completo.
    // No usar setTimeout — el enforce() del ISM borraba el DOM antes que corriera.
    // Llamar renderEditorStrings directamente garantiza que lastStringRender quede
    // guardado con seq → enforce() preserva los charts en rerenders posteriores.
    try {
        const sectionKey = els.sectionSelect?.value || 'intro';
        const seq = Array.isArray(project.sections?.[sectionKey]) ? project.sections[sectionKey] : [];
        const chordIndex = Math.max(0, Math.min(seq.length - 1, Number(els.chordSelect?.value) || 0));
        const item = seq[chordIndex];
        if (item && stringInstrumentId(value) && window.Studio936StringInstruments && window.Studio936StringSurface) {
            const voicing = exactStringVoicing(item, value);
            InstrumentSurfaceManager.renderEditorStrings({
                instrument: value,
                data: {
                    instrument: value,
                    sectionKey,
                    chordIndex,
                    seq,
                    name: item.name,
                    bass: item.bass,
                    notes: item.notes,
                    bars: item.bars,
                    exactFrets: voicing ? voicing.voicing.frets : null,
                    exactMidis: voicing ? voicing.midis : [],
                    exactStrings: voicing ? voicing.strings : null,
                    capo: voicing ? (voicing.voicing.capo || 0) : 0,
                    seqVoicings: mainStringSeqVoicingPreviews(seq, value)
                },
                profiles: window.Studio936StringInstruments.profiles,
                sectionNames,
                onCellPlay: event => {
                    const midi = Number(event?.midi);
                    if(!Number.isFinite(midi)) return;
                    resumeAudio();
                    withEditorPreviewInstrument(value, () => {
                        playNote(midi, value === 'bass' ? .34 : .24, value === 'bass' ? .72 : .64,
                            value === 'bass' ? 'sine' : 'triangle', audioCtx.currentTime);
                    });
                    if(Number.isFinite(Number(event?.stringIndex)) && Number.isFinite(Number(event?.physicalFret))){
                        window.Studio936StringSurface?.flashPosition?.(Number(event.stringIndex), Number(event.physicalFret), 's936-live-hit', 220);
                    }
                },
                renderer: window.Studio936StringSurface
            });
        } else {
            InstrumentSurfaceManager.showEditorInstrument(value);
        }
    } catch(_) {
        InstrumentSurfaceManager.showEditorInstrument(value);
    }
    return { ok: true };
}
function mountEditorDrumSurface(payload={}){
    editorInstrument = 'drums';
    return InstrumentSurfaceManager.renderEditorDrums({
        pattern:payload.pattern || {},
        sectionName:String(payload.sectionName || sectionNames[payload.sectionKey] || payload.sectionKey || 'Sección'),
        renderer:window.Studio936DrumSurface || null,
        onLaneSelect:typeof payload.onLaneSelect === 'function' ? payload.onLaneSelect : null,
        onLaneTrigger:typeof payload.onLaneTrigger === 'function' ? payload.onLaneTrigger : null
    });
}
function flashEditorDrumLane(laneId,velocity=.82,duration=160){
    return InstrumentSurfaceManager.flashEditorDrumLane(laneId,velocity,duration);
}
function selectEditorDrumLane(laneId){
    return InstrumentSurfaceManager.selectEditorDrumLane(laneId);
}
function triggerEditorDrumLane(laneId, velocity=.92, pattern={}){
    const id = String(laneId || 'kick');
    const vol = Math.max(.05,Math.min(1,Number(velocity)||.92));
    try { InstrumentSurfaceManager.selectEditorDrumLane(id); } catch(_) {}
    try { InstrumentSurfaceManager.flashEditorDrumLane(id, vol, 190); } catch(_) {}
    const drum = window.Studio936DrumComposerPro;
    if(drum && typeof drum.previewLane === 'function'){
        const response = drum.previewLane(id, vol, pattern || {});
        if(response?.ok !== false) return response;
    }
    resumeAudio();
    const now = audioCtx.currentTime + .01;
    const map = {
        kick: {midi:36, dur:.16, type:'sine', gain:.9},
        snare: {midi:38, dur:.12, type:'square', gain:.58},
        hatClosed: {midi:42, dur:.07, type:'triangle', gain:.32},
        hatOpen: {midi:46, dur:.18, type:'triangle', gain:.36},
        tomHigh: {midi:48, dur:.16, type:'sine', gain:.55},
        tomMid: {midi:45, dur:.18, type:'sine', gain:.55},
        tomFloor: {midi:41, dur:.20, type:'sine', gain:.58},
        tomLow: {midi:41, dur:.20, type:'sine', gain:.58},
        crash: {midi:49, dur:.30, type:'triangle', gain:.38},
        ride: {midi:51, dur:.22, type:'triangle', gain:.34},
        percussion: {midi:64, dur:.10, type:'square', gain:.36}
    };
    const hit = map[id] || map.percussion;
    playNote(hit.midi, hit.dur, vol * hit.gain, hit.type, now);
    return {ok:true,laneId:id,fallback:true};
}
function withEditorPreviewInstrument(instrument,callback){
    const previous = editorPreviewInstrument;
    editorPreviewInstrument = EDITOR_INSTRUMENT_IDS.includes(instrument) ? instrument : null;
    try{
        return callback();
    }finally{
        editorPreviewInstrument = previous;
    }
}
let keyMap = {};
let fretCells = [];
let chordHoldEnabled=false, heldChord=new Set();
let isPlaying=false, metroEnabled=false, soloEnabled=true, playAllMode=false, activeSongSection='intro', activeSongPartLabel='Introducción', songSectionIdx=0, selectedArrangementIndex=0, timer=null, nextTime=0, chordIdx=0, stepInChord=0, globalStep=0, soloCursor=0, lastVisualTimer=[], lastEditorSection='intro';
// Cambio 129: mezcla por canal — silenciar o bajar el volumen de cada
// instrumento del groove (batería, bajo, acordes/guitarra, solo) de
// forma independiente, desde el ícono nuevo "Canales/Instrumentos".
// Es un ajuste de sesión (no se guarda todavía con la canción).
let channelMix = {
    drums:{mute:false, vol:1, pan:0},
    bass:{mute:false, vol:1, pan:0},
    chord:{mute:false, vol:1, pan:0},
    solo:{mute:false, vol:1, pan:0},
    piano:{mute:true, vol:1, pan:0},
    ukulele:{mute:true, vol:1, pan:0}
};

function buildPiano(){
    return Piano.buildPiano(els.piano, keyMap, triggerKeyboardNote);
}
function buildStepGrid(){
    els.stepGrid.innerHTML='';
    for(let i=0;i<16;i++){ const s=document.createElement('div'); s.className='step ' + (i%4===0?'beat':''); s.dataset.step=i; els.stepGrid.appendChild(s); }
}


function buildFretboard(){
    return Fretboard.buildFretboard({
        els,
        project,
        fretCells,
        midiToNote,
        onCellPlay:(midi,meta={}) => {
            resumeAudio();
            const instrument = meta.mode || project.instrument || 'guitar';
            withEditorPreviewInstrument(['guitar','ukulele','bass'].includes(instrument) ? instrument : project.instrument, () => {
                playNote(midi, instrument === 'bass' ? .38 : .28, instrument === 'bass' ? .70 : .62, instrument === 'bass' ? 'sine' : 'triangle', audioCtx.currentTime);
            });
            flashFretboard([midi],'active-chord',420);
        }
    });
}
function setViewMode(mode){
    if(mode === 'piano'){
        window.Studio936AppBridge?.deactivateEditorSurface?.();
        clearMainStringSurface();
        clearMainDrumSurface();
        resetMainSurfaceClasses();
        showLegacyFretboardShell();
    }
    return Fretboard.setViewMode({
        mode,
        project,
        els,
        updateFretboardMap
    });
}
function flashFretboard(midis,cls,dur=220){
    const liveClass = cls === 'active-bass' ? 's936-live-hit' : cls === 'active-solo' ? 's936-strum-hit' : 's936-strum-hit';
    const liveHits = flashMainStringMidis(midis,liveClass,dur);
    if(liveHits) return liveHits;
    return Fretboard.flashFretboard(fretCells, midis, cls, dur);
}
function clearFretboardActive(){
    document.querySelectorAll('#s936EditorGuitarSurface .s936-live-hit,#s936EditorGuitarSurface .s936-strum-hit').forEach(node => node.classList.remove('s936-live-hit','s936-strum-hit'));
    return Fretboard.clearFretboardActive(fretCells);
}
function updateFretboardMap(){
    const item = editorSeq()[Number(els.chordSelect?.value)||0] || currentItem();
    if(stringInstrumentId(project.instrument) && !InstrumentSurfaceManager?.getState?.().active){
        renderMainStringSurface(Number(els.chordSelect?.value)||chordIdx,true);
        return {ok:true, surface:'super-string-main'};
    }
    if(drumInstrumentId(project.instrument) && !InstrumentSurfaceManager?.getState?.().active){
        renderMainDrumSurface(true);
        return {ok:true, surface:'super-drum-main'};
    }
    return Fretboard.updateFretboardMap({
        fretCells,
        item,
        parseNotes,
        noteToMidi,
        project
    });
}

function stringInstrumentId(value){
    return ['guitar','ukulele','bass','lead'].includes(value) ? value : null;
}
function drumInstrumentId(value){
    return value === 'drums' ? 'drums' : null;
}
function exactStringVoicing(item,instrument=project.instrument){
    const id = stringInstrumentId(instrument);
    const StringInstruments = window.Studio936StringInstruments;
    if(!id || !item || !StringInstruments?.profile) return null;
    const profile = StringInstruments.profile(id);
    const voicing = item.voicings?.[id] || item.voicings?.[profile.id];
    if(!voicing || !Array.isArray(voicing.frets) || voicing.frets.length !== profile.strings.length) return null;
    const capo = profile.allowCapo ? clamp(Number(voicing.capo)||0,0,profile.capoMax || 12) : 0;
    const strings = profile.strings.map((string,index) => {
        const raw = voicing.frets[index];
        const fret = raw === null || raw === undefined || String(raw).toUpperCase() === 'X'
            ? null
            : clamp(Number(raw)||0,0,profile.maxFret || 24);
        if(fret === null) return {index,midi:null,fret:null,muted:true};
        return {index,midi:Number(string.midi) + capo + fret,fret,physicalFret:capo + fret,muted:false};
    });
    const midis = Array.isArray(voicing.midis) && voicing.midis.length
        ? voicing.midis.map(Number).filter(Number.isFinite)
        : strings.map(string => string.midi).filter(Number.isFinite);
    return {instrument:id,profile,voicing,strings,midis};
}
function exactStringMidis(item,instrument=project.instrument){
    return exactStringVoicing(item,instrument)?.midis || [];
}

let lastMainStringRenderKey = '';

function mainSurfaceContainer(){
    return els.fretboardContainer || document.getElementById('fretboardContainer');
}
function hideLegacyFretboardShell(){
    const container = mainSurfaceContainer();
    const wrap = container?.querySelector?.('.fretboard-wrap');
    if(wrap) wrap.style.display = 'none';
    const charts = document.getElementById('v23ChordCharts');
    if(charts) charts.style.display = 'none';
}
function showLegacyFretboardShell(){
    const container = mainSurfaceContainer();
    const wrap = container?.querySelector?.('.fretboard-wrap');
    if(wrap) wrap.style.display = '';
}
function resetMainSurfaceClasses(){
    const container = mainSurfaceContainer();
    container?.classList?.remove('s936-main-string-surface-active','s936-main-drum-surface-active');
}
function forceMainSurfaceOwnership(reason='main'){
    try {
        const state = InstrumentSurfaceManager?.getState?.();
        if(state?.active){
            InstrumentSurfaceManager.endEditorSession({restore:false});
        }
    } catch(error){
        console.warn('Studio936 Main surface: no pude cerrar sesión de editor antes de montar Main.', reason, error);
    }
    document.body?.removeAttribute?.('data-s936-surface-owner');
    document.body?.removeAttribute?.('data-s936-editor-instrument');
    document.body?.classList?.remove?.('s936-editor-guitar-surface','s936-editor-drum-surface');
}
function prepareMainSurface(kind){
    const container = mainSurfaceContainer();
    if(!container) return null;
    forceMainSurfaceOwnership(kind);
    container.style.display = 'flex';
    container.style.visibility = 'visible';
    container.removeAttribute?.('data-s936-editor-surface');
    hideLegacyFretboardShell();
    if(kind === 'drums'){
        container.classList.remove('s936-main-string-surface-active','s936-editor-surface-active');
        container.classList.add('s936-main-drum-surface-active');
        window.Studio936StringSurface?.clear?.();
        document.getElementById('s936EditorGuitarSurface')?.remove();
    }else if(kind === 'strings'){
        container.classList.remove('s936-main-drum-surface-active','s936-editor-surface-active');
        container.classList.add('s936-main-string-surface-active');
        window.Studio936DrumSurface?.clear?.();
        document.getElementById('s936EditorDrumSurface')?.remove();
    }
    const charts = document.getElementById('v23ChordCharts');
    if(charts) charts.style.display = 'none';
    return container;
}

function stringProfileFor(instrument=project.instrument){
    const id = stringInstrumentId(instrument);
    const StringInstruments = window.Studio936StringInstruments;
    return id && StringInstruments?.profile ? StringInstruments.profile(id) : null;
}
function pcOfMidi936(midi){ return ((Math.round(Number(midi)) % 12) + 12) % 12; }
function normalizeStringFret936(value,maxFret=24){
    if(value === null || value === undefined) return null;
    const text = String(value).trim().toUpperCase();
    if(text === '' || text === 'X' || text === 'M') return null;
    return clamp(Number(text)||0,0,maxFret);
}
function buildStringVoicingFromFrets(item,instrument,voicing,generated=false){
    const profile = stringProfileFor(instrument);
    if(!profile || !voicing || !Array.isArray(voicing.frets)) return null;
    const capo = profile.allowCapo ? clamp(Number(voicing.capo)||0,0,profile.capoMax || 12) : 0;
    const frets = voicing.frets.slice(0,profile.strings.length).map(value => normalizeStringFret936(value,profile.maxFret || 24));
    while(frets.length < profile.strings.length) frets.push(null);
    const fingers = Array.isArray(voicing.fingers) ? voicing.fingers.slice(0,profile.strings.length).map(v=>String(v ?? '')) : frets.map(v => v===0 ? '0' : '');
    while(fingers.length < profile.strings.length) fingers.push('');
    const strings = profile.strings.map((string,index) => {
        const fret = frets[index];
        if(fret === null) return {
            index,
            number:string.number,
            label:string.label,
            open:string.open,
            fret:null,
            physicalFret:null,
            finger:fingers[index] || '',
            midi:null,
            note:'X',
            muted:true
        };
        const midi = Number(string.midi) + capo + fret;
        return {
            index,
            number:string.number,
            label:string.label,
            open:string.open,
            fret,
            physicalFret:capo + fret,
            finger:fingers[index] || (fret === 0 ? '0' : ''),
            midi,
            note:midiToNote(midi),
            muted:false
        };
    });
    const midis = strings.map(string => string.midi).filter(Number.isFinite);
    const bassString = strings.filter(string => Number.isFinite(string.midi)).sort((a,b)=>a.midi-b.midi)[0] || null;
    return {
        instrument:profile.id,
        profile,
        voicing:Object.assign({},voicing,{frets,fingers,capo,midis,notes:midis.map(midiToNote).join(' '),bass:bassString ? midiToNote(bassString.midi) : ''}),
        strings,
        midis,
        generated
    };
}
function inferStringVoicing(item,instrument=project.instrument){
    const id = stringInstrumentId(instrument);
    const profile = stringProfileFor(id);
    if(!id || !profile || !item) return null;

    const saved = item.voicings?.[id] || item.voicings?.[profile.id];
    if(saved && Array.isArray(saved.frets) && saved.frets.length === profile.strings.length){
        return buildStringVoicingFromFrets(item,id,saved,false);
    }

    const chordMidis = parseNotes(item.notes || '');
    const bassMidi = noteToMidi(item.bass || '');
    const pcs = new Set(chordMidis.map(pcOfMidi936));
    if(Number.isFinite(bassMidi)) pcs.add(pcOfMidi936(bassMidi));
    if(!pcs.size){
        return buildStringVoicingFromFrets(item,id,{frets:profile.defaultFrets || profile.strings.map(()=>0),fingers:profile.defaultFingers || [],capo:0},true);
    }

    if(id === 'bass'){
        const targetPc = Number.isFinite(bassMidi) ? pcOfMidi936(bassMidi) : [...pcs][0];
        let best = null;
        profile.strings.forEach((string,index) => {
            for(let fret=0; fret<=Math.min(profile.maxFret || 24,12); fret++){
                const midi = Number(string.midi) + fret;
                if(pcOfMidi936(midi) !== targetPc) continue;
                const rangePenalty = midi < 31 || midi > 55 ? 20 : 0;
                const score = 100 - Math.abs(midi - (Number.isFinite(bassMidi) ? bassMidi : 40)) - fret * .6 - rangePenalty;
                if(!best || score > best.score) best = {index,fret,score};
            }
        });
        const frets = profile.strings.map(()=>null);
        const fingers = profile.strings.map(()=>'');
        if(best){
            frets[best.index] = best.fret;
            fingers[best.index] = best.fret === 0 ? '0' : '1';
        }else{
            frets[0] = 0; fingers[0] = '0';
        }
        return buildStringVoicingFromFrets(item,id,{frets,fingers,capo:0,generated:true},true);
    }

    const pcList = [...pcs];
    const targetBassPc = Number.isFinite(bassMidi) ? pcOfMidi936(bassMidi) : pcList[0];
    const maxFret = profile.maxFret || 24;
    const span = id === 'ukulele' ? 4 : 4;
    const minUsed = id === 'ukulele' ? Math.min(3,profile.strings.length) : Math.min(4,profile.strings.length);
    let best = null;

    function optionsForString(string,start){
        const options = [null];
        for(let fret=0; fret<=Math.min(maxFret,12); fret++){
            if(fret !== 0 && (fret < start || fret > start + span)) continue;
            const midi = Number(string.midi) + fret;
            if(pcList.includes(pcOfMidi936(midi))) options.push({fret,midi,pc:pcOfMidi936(midi)});
        }
        return options;
    }

    for(let start=0; start<=8; start++){
        const all = profile.strings.map(string => optionsForString(string,start));
        function rec(index,combo){
            if(index === all.length){
                const used = combo.filter(Boolean);
                if(used.length < minUsed) return;
                const distinct = [...new Set(used.map(note => note.pc))];
                if(distinct.length < Math.min(3,pcList.length)) return;
                const fretted = used.filter(note => note.fret > 0).map(note => note.fret);
                const minF = fretted.length ? Math.min(...fretted) : 0;
                const maxF = fretted.length ? Math.max(...fretted) : 0;
                if(maxF - minF > span) return;
                const low = used.slice().sort((a,b)=>a.midi-b.midi)[0];
                let score = distinct.length * 32 + used.length * 6 - combo.filter(note => !note).length * 4 - maxF * .7 - (maxF-minF) * 5;
                if(distinct.includes(targetBassPc)) score += 18;
                if(low && low.pc === targetBassPc) score += 20;
                if(start >= 1 && start <= 5) score += 5;
                if(id === 'ukulele' && used.length === 4) score += 8;
                if(!best || score > best.score) best = {score,combo,start};
                return;
            }
            all[index].forEach(option => rec(index+1,combo.concat([option])));
        }
        rec(0,[]);
    }

    if(!best){
        return buildStringVoicingFromFrets(item,id,{frets:profile.defaultFrets || profile.strings.map(()=>0),fingers:profile.defaultFingers || [],capo:0,generated:true},true);
    }
    const frets = best.combo.map(option => option ? option.fret : null);
    const fingers = best.combo.map(option => !option ? '' : option.fret === 0 ? '0' : '');
    return buildStringVoicingFromFrets(item,id,{frets,fingers,capo:0,generated:true},true);
}
function mainStringVoicing(item,instrument=project.instrument){
    return inferStringVoicing(item,instrument);
}
function mainStringPlaybackMidis(item,instrument=project.instrument){
    const voicing = mainStringVoicing(item,instrument);
    if(voicing?.midis?.length) return voicing.midis;
    return exactStringMidis(item,instrument);
}
function mainStringVisualBassMidis(item,instrument=project.instrument){
    const events = mainStringVisualBassEvents(item,instrument);
    return events.map(event => event.midi).filter(Number.isFinite);
}
function mainStringVoicingEvents(item,instrument=project.instrument){
    const voicing = mainStringVoicing(item,instrument);
    if(!voicing?.strings?.length) return [];
    return voicing.strings
        .filter(string => string && !string.muted && Number.isFinite(Number(string.midi)) && Number.isFinite(Number(string.physicalFret)))
        .map(string => ({
            stringIndex:Number(string.index),
            physicalFret:Number(string.physicalFret),
            fret:Number(string.fret),
            midi:Number(string.midi),
            note:string.note || midiToNote(Number(string.midi))
        }));
}
function mainStringEventsForMidis(item,midis,instrument=project.instrument){
    const wanted = (Array.isArray(midis) ? midis : [midis]).map(Number).filter(Number.isFinite).map(Math.round);
    const pool = mainStringVoicingEvents(item,instrument);
    const used = new Set();
    const events = [];
    wanted.forEach(midi => {
        let idx = pool.findIndex((event,index) => !used.has(index) && Math.round(event.midi) === midi);
        if(idx < 0) idx = pool.findIndex((event,index) => !used.has(index) && pcOfMidi936(event.midi) === pcOfMidi936(midi));
        if(idx >= 0){
            used.add(idx);
            events.push(Object.assign({},pool[idx],{midi}));
        }
    });
    return events;
}
function mainStringVisualBassEvents(item,instrument=project.instrument){
    const events = mainStringVoicingEvents(item,instrument);
    if(!events.length) return [];
    return [events.slice().sort((a,b)=>a.midi-b.midi)[0]];
}
function mainStringSeqVoicingPreviews(seq,instrument=project.instrument){
    return (Array.isArray(seq) ? seq : []).map(item => {
        const voicing = mainStringVoicing(item,instrument);
        return voicing?.voicing ? voicing.voicing : null;
    });
}
function clearMainStringSurface(){
    lastMainStringRenderKey = '';
    const container = mainSurfaceContainer();
    container?.classList?.remove('s936-main-string-surface-active');
    if(!InstrumentSurfaceManager?.getState?.().active){
        window.Studio936StringSurface?.clear?.();
    }
    if(!container?.classList?.contains('s936-main-drum-surface-active')) showLegacyFretboardShell();
}
function renderMainStringSurface(index=chordIdx,force=false){
    const instrument = stringInstrumentId(project.instrument);
    const StringSurface = window.Studio936StringSurface;
    const StringInstruments = window.Studio936StringInstruments;
    if(!instrument || !StringSurface?.render || !StringInstruments?.profiles) return false;
    if(InstrumentSurfaceManager?.getState?.().active) return false;
    const sectionKey = currentSectionKey();
    const seq = Array.isArray(project.sections?.[sectionKey]) ? project.sections[sectionKey] : [];
    if(!seq.length) return false;
    const chordIndex = Math.max(0,Math.min(seq.length-1,Number(index)||0));
    const item = seq[chordIndex] || currentItem();
    const voicing = mainStringVoicing(item,instrument);
    if(!voicing?.voicing || !voicing.midis?.length) return false;
    const seqVoicings = mainStringSeqVoicingPreviews(seq,instrument);

    const shape = (voicing.voicing.frets || []).map(value => value === null ? 'X' : String(value)).join('-');
    const key = [instrument,sectionKey,chordIndex,item?.name || '',shape,project.bpm].join('|');
    if(!force && key === lastMainStringRenderKey && document.getElementById('s936EditorGuitarSurface')) return true;
    lastMainStringRenderKey = key;

    const container = prepareMainSurface('strings');
    const pianoBox = document.getElementById('pianoContainer');
    if(!container) return false;
    if(pianoBox) pianoBox.style.display = 'none';
    if(els.viewToggleBtn) els.viewToggleBtn.textContent = 'Vista piano';
    project.viewMode = 'fretboard';
    project.fretMode = instrument;
    if(els.fretModeSelect) els.fretModeSelect.value = instrument;

    StringSurface.render({
        container,
        owner:'main',
        readOnly:true,
        profiles:StringInstruments.profiles,
        sectionNames,
        data:{
            surfaceOwner:'main',
            surfaceMode:'main-practice',
            instrument,
            sectionKey,
            sectionName:sectionNames[sectionKey] || sectionKey,
            chordIndex,
            seq,
            seqVoicings,
            name:item?.name || 'Acorde',
            bass:item?.bass || voicing.voicing.bass || '',
            notes:item?.notes || voicing.voicing.notes || '',
            bars:item?.bars || 1,
            exactFrets:voicing.voicing.frets,
            exactMidis:voicing.midis,
            exactStrings:voicing.strings,
            capo:voicing.voicing.capo || 0,
            barre:voicing.voicing.barre || null
        },
        onCellPlay:event => {
            const midi = Number(event?.midi);
            if(!Number.isFinite(midi)) return;
            resumeAudio();
            const gesture = String(event?.gesture || 'tap');
            playNote(
                midi,
                gesture === 'strum' ? .13 : gesture === 'slide' ? .18 : gesture === 'bend' ? .16 : (instrument === 'bass' ? .36 : .24),
                gesture === 'strum' ? .58 : (instrument === 'bass' ? .72 : .66),
                instrument === 'bass' ? 'sine' : 'triangle',
                audioCtx.currentTime
            );
            const cls = gesture === 'strum' ? 's936-strum-hit' : gesture === 'slide' ? 's936-slide-hit' : gesture === 'bend' ? 's936-bend-hit' : 's936-live-hit';
            if(Number.isFinite(Number(event?.stringIndex)) && Number.isFinite(Number(event?.physicalFret))){
                StringSurface.flashPosition?.(Number(event.stringIndex),Number(event.physicalFret),cls,220);
            }
        },
        onChordSelect:selectedIndex => {
            const next = Math.max(0,Math.min(seq.length-1,Number(selectedIndex)||0));
            chordIdx = next;
            stepInChord = 0;
            if(els.chordSelect) els.chordSelect.value = String(next);
            const nextItem = seq[next];
            if(nextItem){
                els.chordLabel.textContent = nextItem.name || 'Acorde';
                loadEditorFromSelected();
            }
            renderMainStringSurface(next,true);
        }
    });
    return true;
}
let lastMainDrumRenderKey = '';
function defaultDrumPattern(sectionKey=currentSectionKey()){
    const key = String(sectionKey || currentSectionKey() || 'intro');
    const stored = project.drumPatterns?.[key];
    if(DrumPatterns?.normalize){
        return DrumPatterns.normalize(stored || {}, {
            sectionKey:key,
            style:'auto',
            songStyle:project.style || 'funk',
            bpm:project.bpm || 95,
            bars:Math.max(1,Math.min(4,(project.sections?.[key] || []).reduce((sum,item)=>sum+(Number(item?.bars)||1),0) || 1))
        });
    }
    if(stored && typeof stored === 'object') return stored;
    return {
        enabled:true,
        kit:'studio',
        style:'auto',
        sectionKey:key,
        bars:1,
        bpm:project.bpm || 95,
        masterVolume:.78,
        lanes:{
            kick:{enabled:true,volume:.9,hits:{0:.9,8:.9}},
            snare:{enabled:true,volume:.75,hits:{4:.86,12:.86}},
            hatClosed:{enabled:true,volume:.55,hits:{0:.5,2:.5,4:.5,6:.5,8:.5,10:.5,12:.5,14:.5}},
            hatOpen:{enabled:true,volume:.50,hits:{}},
            tomHigh:{enabled:true,volume:.65,hits:{}},
            tomMid:{enabled:true,volume:.65,hits:{}},
            tomLow:{enabled:true,volume:.65,hits:{}},
            crash:{enabled:true,volume:.70,hits:{0:.7}},
            ride:{enabled:true,volume:.60,hits:{}},
            percussion:{enabled:true,volume:.58,hits:{}}
        }
    };
}

function drumOutputGain(volume,when,decay){
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(Math.max(.0001,volume),when);
    gain.gain.exponentialRampToValueAtTime(.0001,when + Math.max(.035,decay));
    connectOut(gain,'drums');
    return gain;
}
function playDrumTone(freq,volume,when,decay,type='sine',endFreq=null){
    try{
        const osc = audioCtx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(freq,when);
        if(endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),when + Math.max(.04,decay*.76));
        osc.connect(drumOutputGain(volume,when,decay));
        osc.start(when);
        osc.stop(when + decay + .04);
    }catch(_){}
}
function playDrumNoise(volume,when,decay,filterType='highpass',frequency=4200){
    try{
        const length = Math.max(1,Math.floor(audioCtx.sampleRate * Math.max(.03,decay)));
        const buffer = audioCtx.createBuffer(1,length,audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for(let i=0;i<length;i++) data[i] = (Math.random()*2-1) * (1 - i/length);
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = filterType;
        filter.frequency.setValueAtTime(frequency,when);
        source.connect(filter).connect(drumOutputGain(volume,when,decay));
        source.start(when);
        source.stop(when + decay + .04);
    }catch(_){}
}
function playSongDrumLane(laneId,velocity,pattern,when){
    const kit = String(pattern?.kit || 'studio');
    const v = Math.max(.01,Math.min(1,Number(velocity)||.7)) * (Number(project.grooveVol || 7) / 7) * .72 * channelMix.drums.vol;
    // Cambio 448: si hay un sample real (WebAudioFont) para este golpe,
    // se usa ESE en vez de las capas de tono+ruido sintetizadas de
    // abajo — un solo golpe de sample ya trae el cuerpo+ataque juntos,
    // así que no tiene sentido sumarle las capas viejas encima.
    // playSampledDrum ya dispara la carga del kit sola si todavía no
    // está lista (mismo patrón que playSampledNote) — no hace falta
    // pedirla aparte acá.
    const sampleEngine = window.Studio936SampleEngine;
    if (sampleEngine) {
        const outGain = audioCtx.createGain();
        connectOut(outGain, 'drums');
        const dur = laneId === 'crash' ? .6 : laneId === 'ride' ? .35 : laneId === 'hatOpen' ? .25 : .3;
        if (sampleEngine.playSampledDrum(audioCtx, outGain, laneId, dur, Math.min(1, v * 1.3), when)) return;
        // si todavía no está lista (cargando o falló), sigue hacia abajo
        // y toca con el sintetizador de siempre en este golpe puntual.
    }
    switch(String(laneId)){
        case 'kick':
            playDrumTone(kit === 'electronic' ? 138 : 112,v,when,.22,'sine',kit === 'electronic' ? 48 : 42);
            break;
        case 'snare':
            playDrumNoise(v*.72,when,.14,'bandpass',kit === 'soft' ? 1450 : 1950);
            playDrumTone(kit === 'electronic' ? 210 : 176,v*.18,when,.10,'triangle',120);
            break;
        case 'hatClosed':
            playDrumNoise(v*.42,when,.045,'highpass',kit === 'soft' ? 5200 : 6900);
            break;
        case 'hatOpen':
            playDrumNoise(v*.46,when,.20,'highpass',5700);
            break;
        case 'tomHigh':
            playDrumTone(190,v*.68,when,.24,'sine',118);
            break;
        case 'tomMid':
            playDrumTone(145,v*.70,when,.28,'sine',86);
            break;
        case 'tomLow':
            playDrumTone(105,v*.74,when,.34,'sine',62);
            break;
        case 'crash':
            playDrumNoise(v*.58,when,.45,'highpass',3800);
            break;
        case 'ride':
            playDrumNoise(v*.40,when,.18,'highpass',4900);
            playDrumTone(780,v*.10,when,.14,'square');
            break;
        case 'percussion':
            if(kit === 'latin'){
                playDrumTone(315,v*.52,when,.16,'sine',205);
                playDrumNoise(v*.14,when,.08,'bandpass',1250);
            }else if(kit === 'electronic'){
                playDrumTone(560,v*.45,when,.11,'square');
            }else{
                playDrumNoise(v*.34,when,.10,'bandpass',1500);
            }
            break;
    }
}
function scheduleSongDrums(sectionKey,step,when){
    if(channelMix.drums.mute) return [];
    const pattern = defaultDrumPattern(sectionKey);
    if(pattern?.enabled === false || project.drumsEnabled === false) return [];
    const hits = DrumPatterns?.hitsAtStep ? DrumPatterns.hitsAtStep(pattern,step) : [];
    hits.forEach((hit,index) => {
        const offset = Math.max(0,index * .006);
        playSongDrumLane(hit.laneId,hit.velocity,pattern,when + offset);
        if(project.instrument === 'drums'){
            setVisual(when + offset, () => window.Studio936DrumSurface?.flashLane?.(hit.laneId,hit.velocity,170));
        }
    });
    return hits;
}

function clearMainDrumSurface(){
    lastMainDrumRenderKey = '';
    const container = mainSurfaceContainer();
    container?.classList?.remove('s936-main-drum-surface-active');
    if(!InstrumentSurfaceManager?.getState?.().active){
        window.Studio936DrumSurface?.clear?.();
    }
    if(!container?.classList?.contains('s936-main-string-surface-active')) showLegacyFretboardShell();
}
function renderMainDrumSurface(force=false){
    if(project.instrument !== 'drums') return false;
    if(InstrumentSurfaceManager?.getState?.().active){
        if(force) forceMainSurfaceOwnership('drums-force');
        else return false;
    }
    const DrumSurface = window.Studio936DrumSurface;
    if(!DrumSurface?.render) return false;
    const container = els.fretboardContainer || document.getElementById('fretboardContainer');
    const pianoBox = document.getElementById('pianoContainer');
    if(!container) return false;
    const sectionKey = currentSectionKey();
    const pattern = defaultDrumPattern(sectionKey);
    const key = ['drums',sectionKey,project.bpm,pattern?.kit || 'studio',pattern?.style || project.style || 'auto',pattern?.bars || 1,pattern?.enabled !== false,DrumPatterns?.countHits?.(pattern) || 0].join('|');
    if(!force && key === lastMainDrumRenderKey && document.getElementById('s936EditorDrumSurface')) return true;
    lastMainDrumRenderKey = key;
    const target = prepareMainSurface('drums') || container;
    if(pianoBox) pianoBox.style.display = 'none';
    target.style.display = 'flex';
    target.style.visibility = 'visible';
    if(els.viewToggleBtn) els.viewToggleBtn.textContent = 'Vista piano';
    project.viewMode = 'fretboard';
    try {
        DrumSurface.render({
            container:target,
            pattern,
            sectionName:sectionNames[sectionKey] || sectionKey,
            onLaneSelect:()=>{},
            onLaneTrigger:(laneId,velocity)=>triggerEditorDrumLane(laneId,velocity,pattern)
        });
    } catch(error){
        console.error('Studio936 Main batería: no pude montar el kit visual.', error);
        return false;
    }
    return true;
}
function scheduleMainDrumSurface(){
    if(project.instrument !== 'drums') return;
    renderMainDrumSurface(true);
    requestAnimationFrame(() => renderMainDrumSurface(true));
    setTimeout(() => renderMainDrumSurface(true), 120);
    setTimeout(() => renderMainDrumSurface(true), 360);
}
function flashMainDrumStep(stepBar,types={}){
    const isMainDrums = project.instrument === 'drums';
    if(isMainDrums && !document.getElementById('s936EditorDrumSurface')) renderMainDrumSurface(false);
    const DrumSurface = window.Studio936DrumSurface;
    if(!DrumSurface?.flashLane) return false;
    const pattern = defaultDrumPattern(currentSectionKey());
    const hits = DrumPatterns?.hitsAtStep
        ? DrumPatterns.hitsAtStep(pattern, Number(stepInChord) || Number(stepBar) || 0)
        : [];
    const lanes = hits.length
        ? hits
        : [
            ...(stepBar % 4 === 0 ? [{laneId:'kick',velocity:.92}] : []),
            ...((stepBar === 4 || stepBar === 12 || types.chord) ? [{laneId:'snare',velocity:.72}] : []),
            ...(stepBar % 2 === 0 ? [{laneId:'hatClosed',velocity:.52}] : []),
            ...(types.ghost ? [{laneId:'percussion',velocity:.5}] : [])
        ];
    lanes.forEach((hit,index)=>setTimeout(()=>DrumSurface.flashLane(hit.laneId,hit.velocity || .72,160),index*24));
    return lanes.length > 0;
}
function flashMainStringMidis(midis,cls='s936-live-hit',dur=220){
    if(!stringInstrumentId(project.instrument)) return 0;
    if(!document.getElementById('s936EditorGuitarSurface')) renderMainStringSurface(chordIdx,false);
    const events = mainStringEventsForMidis(currentItem(),midis,project.instrument);
    if(events.length && window.Studio936StringSurface?.flashStringEvents){
        return window.Studio936StringSurface.flashStringEvents(events,cls,dur);
    }
    return window.Studio936StringSurface?.flashMidis?.(midis,cls,dur) || 0;
}
function chordPlaybackMidis(item){
    const id = stringInstrumentId(project.instrument);
    const exact = id ? mainStringPlaybackMidis(item,id) : [];
    if(exact.length) return exact;
    const notes = parseNotes(item?.notes || '');
    return notes.length ? notes : [60,64,67];
}
function flashExactStringVoicing(item,cls='active-chord',dur=230){
    const voicing = exactStringVoicing(item,project.instrument);
    const events = voicing?.strings
        ?.filter(string => string && !string.muted && Number.isFinite(Number(string.midi)))
        ?.map(string => ({stringIndex:Number(string.index),physicalFret:Number(string.physicalFret),midi:Number(string.midi)})) || [];
    if(events.length && window.Studio936StringSurface?.flashStringEvents){
        window.Studio936StringSurface.flashStringEvents(events,cls,dur);
        return events.map(event => event.midi);
    }
    const exact = exactStringMidis(item,project.instrument);
    if(exact.length) flashFretboard(exact,cls,dur);
    return exact;
}
function triggerKeyboardNote(midi){
    resumeAudio();
    if(chordHoldEnabled){
        if(heldChord.has(midi)) heldChord.delete(midi); else heldChord.add(midi);
        updateHeldChordVisual();
        const notes=[...heldChord].sort((a,b)=>a-b);
        if(notes.length){
            const now=audioCtx.currentTime+.01;
            notes.forEach((m,i)=>playNote(m,.22,.95,'triangle',now+i*(currentInstrument().strum||.012)));
            flashStatus('Acorde hold: ' + notes.map(midiToNote).join(' · ') + '. Toca otra tecla para sumar/quitar.');
        } else {
            flashStatus('Acorde hold activo: toca varias teclas para armar un acorde.');
        }
    } else {
        playNote(midi,.34,.85,'triangle',audioCtx.currentTime);
        flashKeys([midi],'active-chord',380);
    }
}
function updateHeldChordVisual(){
    Object.entries(keyMap).forEach(([m,k])=>k.classList.toggle('held-chord', heldChord.has(Number(m))));
}
function clearHeldChord(){ heldChord.clear(); updateHeldChordVisual(); }
function toggleChordHold(){
    chordHoldEnabled = !chordHoldEnabled;
    if(!chordHoldEnabled) clearHeldChord();
    if(els.chordHoldBtn){
        els.chordHoldBtn.textContent = chordHoldEnabled ? 'Acorde ON' : 'Acorde OFF';
        els.chordHoldBtn.classList.toggle('active', chordHoldEnabled);
    }
    flashStatus(chordHoldEnabled ? 'Modo acorde activo: en iPad puedes tocar varias teclas a la vez o ir sumándolas una por una.' : 'Modo acorde apagado.');
}

// Cambio 110: Tablero — muestra el Chart directamente en el área principal
// del Main, con el instrumento actual sonando (el Tablero es una FORMA DE
// VER, no cambia qué instrumento/timbre está sonando). Reutiliza
// mountInRightPanel/unmountFromRightPanel, el mismo mecanismo que ya usa
// Suite Pro para esto — no se inventó nada nuevo, solo se le dio un acceso
// directo desde el Main sin tener que abrir Suite Pro.
let tableroEnabled = false;
function toggleTablero(){
    const Chart = window.Studio936SuiteProChart;
    if(!Chart){ flashStatus('El Tablero no está disponible todavía (Chart no cargó).'); return; }
    tableroEnabled = !tableroEnabled;
    if(els.tableroBtn){
        // Cambio 158: el tooltip bilingüe ("Tocar-Partitura"/"Play-Score")
        // ahora lo controla i18n.js de forma centralizada — aquí solo se
        // marca visualmente el estado ON con el mismo brillo cian que usan
        // los demás íconos activos (.img-icon-btn.active img).
        els.tableroBtn.classList.toggle('active', tableroEnabled);
    }
    if(tableroEnabled){
        try { Chart.mountInRightPanel({}); } catch(error){ console.warn('Studio936 Tablero: no se pudo montar.', error); }
        flashStatus('Tablero activo — el instrumento sigue siendo el mismo, solo cambia la vista.');
    } else {
        try { Chart.unmountFromRightPanel(); } catch(error){ console.warn('Studio936 Tablero: no se pudo desmontar.', error); }
        flashStatus('Tablero desactivado.');
    }
}

// Cambio 132: varios íconos PNG (Play Piano, etc.) traen un fondo sólido
// "horneado" dentro de los píxeles — ningún CSS puede quitar eso, porque
// no es un borde de botón, es parte de la imagen. Esta función lo quita
// de verdad: dibuja la imagen en un canvas oculto, detecta el color del
// fondo mirando las 4 esquinas, y vuelve transparente esa región
// conectada (flood-fill), sin tocar el dibujo de adentro del ícono.
function stripFlatIconBackground(imgEl){
    try {
        const run = () => {
            try {
                const w = imgEl.naturalWidth, h = imgEl.naturalHeight;
                if(!w || !h) return;
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(imgEl, 0, 0, w, h);
                const imgData = ctx.getImageData(0, 0, w, h);
                const data = imgData.data;
                const idx = (x,y) => (y*w+x)*4;
                const colorAt = (x,y) => { const i=idx(x,y); return [data[i],data[i+1],data[i+2]]; };
                const close = (a,b,tol) => Math.abs(a[0]-b[0])<=tol && Math.abs(a[1]-b[1])<=tol && Math.abs(a[2]-b[2])<=tol;
                const corners = [colorAt(0,0), colorAt(w-1,0), colorAt(0,h-1), colorAt(w-1,h-1)];
                const bg = corners[0];
                const cornersAgree = corners.every(c => close(c, bg, 18));
                if(!cornersAgree) return; // esquinas de distinto color: no hay fondo plano uniforme, no tocar
                const tol = 26;
                const visited = new Uint8Array(w*h);
                const stack = [[0,0],[w-1,0],[0,h-1],[w-1,h-1]];
                while(stack.length){
                    const [x,y] = stack.pop();
                    if(x<0||y<0||x>=w||y>=h) continue;
                    const p = y*w+x;
                    if(visited[p]) continue;
                    visited[p] = 1;
                    if(!close(colorAt(x,y), bg, tol)) continue;
                    data[p*4+3] = 0;
                    stack.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
                }
                ctx.putImageData(imgData, 0, 0);
                imgEl.src = canvas.toDataURL('image/png');
            } catch(_) {}
        };
        if(imgEl.complete && imgEl.naturalWidth) run();
        else imgEl.addEventListener('load', run, { once:true });
    } catch(_) {}
}
function stripFlatIconBackgrounds(){
    document.querySelectorAll('.img-icon-btn img').forEach(stripFlatIconBackground);
}
if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', stripFlatIconBackgrounds);
} else {
    stripFlatIconBackgrounds();
}
setTimeout(stripFlatIconBackgrounds, 800);
setTimeout(stripFlatIconBackgrounds, 2000);

function loadProject(){
    return Storage.loadProject(
        STORAGE_KEY,
        defaultProject,
        p => modelNormalizeProject(p, styles, instruments)
    );
}
let Arrangement = null;
function arrangementParts(){ return Arrangement.arrangementParts(); }
function selectArrangementPart(index, options = {}){
    if(!Arrangement || typeof Arrangement.selectArrangementPart !== 'function') return null;
    const state = Arrangement.selectArrangementPart(index);
    if(!state || !state.selectedPart) return state;

    activeSongSection = state.selectedPart.section;
    activeSongPartLabel = state.selectedPart.label || sectionNames[activeSongSection] || activeSongSection;

    if(options.syncSectionSelect !== false && els.sectionSelect){
        els.sectionSelect.value = activeSongSection;
        els.sectionSelect.dispatchEvent(new Event('change', { bubbles:true }));
    }

    if(options.render !== false){
        renderArrangementBuilder();
        updatePartDisplay();
    }

    return state;
}
function sectionChordCount(k){ return (project.sections[k]||[]).length; }

function saveProject(show=false){
    syncProjectFromControls(false);
    Storage.saveProject(STORAGE_KEY, project);
    if(show){
        flashStatus('Guardado localmente en este navegador. Para respaldo externo usa Bajar JSON.');
        if(els.saveBtn){
            els.saveBtn.textContent='Guardado ✓';
            els.saveBtn.classList.add('active');
            setTimeout(()=>{ els.saveBtn.textContent='Guardar local'; els.saveBtn.classList.remove('active'); },1200);
        }
    }
}
function flashStatus(msg){
    els.saveStatus.textContent = msg;
    setTimeout(()=>els.saveStatus.textContent='Auto-guardado local activo. Botón Guardar local = navegador actual. Respaldo real = Bajar JSON.',2300);
}
function syncProjectFromControls(readChord=true){
    project.title = els.songTitle.value.trim() || 'Canción sin nombre';
    project.author = els.songAuthor.value.trim() || 'Autor no definido';
    project.style = els.styleSelect.value;
    project.instrument = els.instrumentSelect.value;
    if(els.routingSelect) project.routingMode = els.routingSelect.value;
    if(els.fretModeSelect) project.fretMode = els.fretModeSelect.value;
    if(els.tuningSelect){ project.tuningHz = els.tuningSelect.value === 'custom' ? clamp(Number(els.tuningCustom.value)||440,390,470) : clamp(Number(els.tuningSelect.value)||440,390,470); }
    project.bpm = Number(els.bpmSlider.value);
    project.grooveVol = clamp(Number(els.grooveVol.value)||7,1,10);
    project.soloOn = soloEnabled;
    saveSoloForSection(editorSectionKey(), false);
    project.soloPhrase = project.sectionSolos?.solo?.phrase || els.soloPhrase.value.trim();
    project.soloKey = project.sectionSolos?.solo?.key || els.soloKey.value.trim() || 'C';
    project.soloScale = project.sectionSolos?.solo?.scale || els.soloScale.value;
    if(readChord) applyEditorToProject(false);
}
function clamp(n,a,b){return Math.max(a,Math.min(b,n));}

const MusicTheory = window.Studio936MusicTheory || {};
function noteToMidi(note){ return MusicTheory.noteToMidi(note); }
function midiToNote(midi){ return MusicTheory.midiToNote(midi); }
function parseNotes(text){ return MusicTheory.parseNotes(text); }
function parseSolo(text){ return MusicTheory.parseSolo(text); }
function rootMidiFromKey(key,oct=4){
    const m = noteToMidi(String(key||'C').replace(/-?\d$/,'') + oct);
    return m === null ? 60 : m;
}

function adjustedMidiForInstrument(midi, prof, role){
    let m = midi + (prof.transpose || 0);
    const instrumentId = activeInstrumentId();
    if(instrumentId === 'ukulele'){
        while(m < 55) m += 12;
        while(m > 88) m -= 12;
    }
    if(instrumentId === 'guitar'){
        while(m < 40) m += 12;
        while(m > 82) m -= 12;
    }
    if(instrumentId === 'sax'){
        while(m < 50) m += 12;
        while(m > 82) m -= 12;
    }
    if(instrumentId === 'bass'){
        while(m < 28) m += 12;
        while(m > 67) m -= 12;
    }
    return m;
}
function playNoteImpl(midi,vol=.18,decay=.45,type='triangle',time=audioCtx.currentTime){
    if(!Number.isFinite(midi)) return;
    const role = noteRole(type);
    const inst = currentInstrument();
    const prof = inst[role] || inst.chord || instruments.piano.chord;
    // Cambio 446: si hay un sample real (WebAudioFont) disponible para
    // el instrumento activo, se usa ESE en vez del sintetizador de
    // osciladores — mismo cálculo de pitch/volumen/duración que ya
    // hacía el camino de abajo, para que sea un reemplazo de sonido
    // nomás, sin cambiar CUÁNDO ni QUÉ TAN FUERTE suena cada nota. Si
    // el sample todavía no está listo (cargando o falló), sigue exacto
    // igual que siempre — las líneas de abajo no se tocaron.
    const sampleEngine = window.Studio936SampleEngine;
    const instrumentId = activeInstrumentId();
    if (sampleEngine) {
        if (sampleEngine.hasSample(instrumentId)) {
            const now = Math.max(time, audioCtx.currentTime);
            const m = adjustedMidiForInstrument(midi, prof, role);
            const finalDecay = Math.max(.06, decay * (prof.decayMult || 1));
            // *2.2: WebAudioFont espera una escala de volumen distinta
            // a la del sintetizador de osciladores viejo — el número
            // salió de escuchar y ajustar, no de una fórmula exacta.
            const v = Math.min(1, vol * (project.grooveVol/7) * (prof.volMult || 1) * 2.2);
            const outGain = audioCtx.createGain();
            connectOut(outGain, role);
            const played = sampleEngine.playSampledNote(audioCtx, outGain, instrumentId, m, finalDecay, v, now);
            if (played) return;
            // si falló justo en este golpe puntual, sigue hacia abajo y
            // toca con el sintetizador de siempre en vez de quedar en
            // silencio.
        } else {
            sampleEngine.warmUp(audioCtx, instrumentId); // pide la carga para la próxima nota
        }
    }
    if(inst.mode === 'pluck') return playPluckedNote(midi,vol,decay,type,time,role,inst,prof);
    if(inst.mode === 'wind') return playWindNote(midi,vol,decay,type,time,role,inst,prof);
    return playBasicSynthNote(midi,vol,decay,type,time,role,inst,prof);
}
function playNote(midi,dur=.18,vol=.45,type='triangle',when=audioCtx.currentTime){ return AudioEngine.playNote(midi,dur,vol,type,when); }
function connectToneChain(osc,osc2,filter,gain,role='music'){
    osc.connect(filter); osc2.connect(filter); filter.connect(gain); connectOut(gain,role);
}
function playBasicSynthNote(midi,vol,decay,type,time,role,inst,prof){
    const osc = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    const now = Math.max(time, audioCtx.currentTime);
    const v = vol * (project.grooveVol/7) * (prof.volMult || 1);
    const attack = prof.attack ?? .014;
    const finalDecay = Math.max(.06, decay * (prof.decayMult || 1));
    const m = adjustedMidiForInstrument(midi, prof, role);
    osc.type = prof.type || type;
    osc2.type = prof.type2 || (type === 'sine' ? 'sine' : 'triangle');
    const freq = midiFreq(m);
    osc.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq*(prof.detune || 1.005), now);
    filter.type='lowpass'; filter.frequency.setValueAtTime(prof.filter || 2400, now); filter.Q.setValueAtTime(prof.q || .6, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002,v), now+attack);
    gain.gain.exponentialRampToValueAtTime(0.001, now+finalDecay);
    connectToneChain(osc,osc2,filter,gain,role);
    osc.start(now); osc2.start(now); osc.stop(now+finalDecay+.04); osc2.stop(now+finalDecay+.04);
}
function playPluckedNote(midi,vol,decay,type,time,role,inst,prof){
    const instrumentId = activeInstrumentId();
    const now = Math.max(time, audioCtx.currentTime);
    const m = adjustedMidiForInstrument(midi, prof, role);
    const freq = midiFreq(m);
    const finalDecay = Math.max(.08, decay * (prof.decayMult || .5));
    const v = vol * (project.grooveVol/7) * (instrumentId === 'ukulele' ? 1.12 : instrumentId === 'bass' ? 1.05 : .95);
    const osc = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const oscGain = audioCtx.createGain();
    const osc2Gain = audioCtx.createGain();
    const body = audioCtx.createBiquadFilter();
    const bright = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();
    osc.type = prof.type || 'triangle';
    osc2.type = prof.type2 || 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq*(prof.detune || 1.0026), now);
    body.type = 'bandpass'; body.frequency.setValueAtTime(inst.body || 220, now); body.Q.setValueAtTime(instrumentId==='ukulele'?3.2:instrumentId==='bass'?1.35:2.1, now);
    bright.type = 'lowpass'; bright.frequency.setValueAtTime(prof.filter || inst.brightness || 3000, now); bright.Q.setValueAtTime(.8, now);
    oscGain.gain.setValueAtTime(1, now);
    osc2Gain.gain.setValueAtTime(instrumentId === 'ukulele' ? .28 : instrumentId === 'bass' ? .34 : .22, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002,v), now + (prof.attack || .003));
    gain.gain.exponentialRampToValueAtTime(0.001, now + finalDecay);
    osc.connect(oscGain); osc2.connect(osc2Gain); oscGain.connect(body); osc2Gain.connect(body); body.connect(bright); bright.connect(gain); connectOut(gain,role);
    osc.start(now); osc2.start(now); osc.stop(now+finalDecay+.05); osc2.stop(now+finalDecay+.05);
    addPickNoise(now, v * (inst.pick || 1), instrumentId==='ukulele' ? 0.018 : instrumentId==='bass' ? 0.014 : 0.026, instrumentId==='ukulele' ? 5200 : instrumentId==='bass' ? 900 : 3300);
}
function addPickNoise(time,vol,dur,frequency){
    try{
        const sr = audioCtx.sampleRate;
        const length = Math.max(1,Math.floor(sr*dur));
        const buffer = audioCtx.createBuffer(1,length,sr);
        const data = buffer.getChannelData(0);
        for(let i=0;i<length;i++) data[i]=(Math.random()*2-1)*(1-i/length);
        const src = audioCtx.createBufferSource(); src.buffer=buffer;
        const filt = audioCtx.createBiquadFilter(); filt.type='bandpass'; filt.frequency.setValueAtTime(frequency,time); filt.Q.setValueAtTime(1.7,time);
        const gain = audioCtx.createGain(); gain.gain.setValueAtTime(vol*.12,time); gain.gain.exponentialRampToValueAtTime(0.0001,time+dur);
        src.connect(filt); filt.connect(gain); connectOut(gain,'music');
        src.start(time); src.stop(time+dur+.01);
    }catch(e){}
}
function playWindNote(midi,vol,decay,type,time,role,inst,prof){
    const now = Math.max(time, audioCtx.currentTime);
    const m = adjustedMidiForInstrument(midi, prof, role);
    const freq = midiFreq(m);
    const finalDecay = Math.max(.18, decay * (prof.decayMult || 1.25));
    const v = vol * (project.grooveVol/7) * (role==='solo' ? 1.05 : .85);
    const osc = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    osc.type = prof.type || 'sawtooth'; osc2.type = prof.type2 || 'triangle';
    osc.frequency.setValueAtTime(freq, now); osc2.frequency.setValueAtTime(freq*(prof.detune||1.003), now);
    lfo.frequency.setValueAtTime(5.2, now); lfoGain.gain.setValueAtTime(role==='solo'?9:4, now);
    lfo.connect(lfoGain); lfoGain.connect(osc.detune); lfoGain.connect(osc2.detune);
    filter.type='bandpass'; filter.frequency.setValueAtTime(prof.filter || 1900, now); filter.Q.setValueAtTime(1.05, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(Math.max(.0002,v), now + (prof.attack || .07));
    gain.gain.exponentialRampToValueAtTime(0.001, now + finalDecay);
    connectToneChain(osc,osc2,filter,gain,role);
    osc.start(now); osc2.start(now); lfo.start(now);
    osc.stop(now+finalDecay+.05); osc2.stop(now+finalDecay+.05); lfo.stop(now+finalDecay+.05);
}
function playMetronomeClick(accent,when){ return AudioEngine.playMetronomeClick(accent,when); }
function previewMetronome(){ return AudioEngine.previewMetronome(); }
function strumChord(notes,dur,vol,when,cls='active-chord'){ return AudioEngine.strumChord(notes,dur,vol,when,cls); }
function flashKeys(midis,cls,dur=200){
    const stringLive = stringInstrumentId(project.instrument);
    if(!stringLive) midis.forEach(m=>{ if(keyMap[m]) keyMap[m].classList.add(cls); });
    flashFretboard(midis,cls,dur);
    if(!stringLive) setTimeout(()=>midis.forEach(m=>{ if(keyMap[m]) keyMap[m].classList.remove(cls); }),dur);
}
function setVisual(time,fn){
    const delay = Math.max(0,(time-audioCtx.currentTime)*1000);
    lastVisualTimer.push(setTimeout(fn,delay));
}
function clearKeys(){ Object.values(keyMap).forEach(k=>k.classList.remove('active-chord','active-bass','active-solo')); clearFretboardActive(); window.Studio936DrumSurface?.clearActive?.(); updateHeldChordVisual(); }
// Cambio 146: encendido/apagado preciso por nota, para tocar en vivo con
// un teclado MIDI físico — se enciende al presionar la tecla real y se
// apaga al soltarla (a diferencia de flashKeys, que usa un temporizador
// fijo pensado para la reproducción programada del groove).
function liveKeyOn(midi){
    const stringLive = stringInstrumentId(project.instrument);
    if(!stringLive){ if(keyMap[midi]) keyMap[midi].classList.add('active-chord'); }
    else { flashFretboard([midi],'active-chord',60000); }
}
function liveKeyOff(midi){
    const stringLive = stringInstrumentId(project.instrument);
    if(!stringLive){ if(keyMap[midi]) keyMap[midi].classList.remove('active-chord'); }
    else { clearFretboardActive(); }
}
function resumeAudio(){ return AudioEngine.resumeAudio(); }

const AudioEngine = (window.Studio936AudioEngine || {}).setup({
    audioCtx,
    getProject:()=>project,
    connectOut,
    flashKeys,
    setVisual,
    pulseMetro,
    getStrumDelay:()=>currentInstrument().strum || .012,
    playNoteImpl
});

function arrangementOrder(){ return Arrangement.arrangementOrder(); }
/* Editor extraction map (pre js/editor.js split):
   Core editor state/readers: editorSectionKey, editorSeq, currentItem.
   Core editor mutators/render: renderSectionList, applyEditorToProject, addChord, duplicateChord, deleteChord, resetSection, resetAll.
   Related control sync currently named loadEditorFromSelected (candidate alias: applyEditorChordToControls).
   Section selector refresh currently named renderSectionOptions/ensureSectionOption (candidate alias: updateSectionSelect).
*/
function editorSectionKey(){ return els.sectionSelect.value || 'intro'; }
function currentSectionKey(){ return playAllMode ? activeSongSection : editorSectionKey(); }
function currentSeq(){return project.sections[currentSectionKey()] || project.sections.intro;}
function editorSeq(){return project.sections[editorSectionKey()] || project.sections.intro;}
const Editor = EditorModule.setup({
    els,
    get project(){ return project; },
    set project(v){ project=v; },
    chord,
    clamp,
    defaultProject,
    noteToMidi,
    parseNotes,
    saveProject,
    flashStatus,
    renderChordSelect,
    updateSectionNoteMap,
    updateFretboardMap,
    escapeHtml,
    getChordIdx:()=>chordIdx,
    setChordIdx:v=>{ chordIdx=v; },
    setStepInChord:v=>{ stepInChord=v; }
});
function currentItem(){ const seq=currentSeq(); return seq[Math.min(chordIdx,seq.length-1)] || chord('C','C2','C3 E3 G3',1); }
function chordDurationSteps(item){ return Math.max(1,Number(item.bars)||1) * 16; }
function stepOffset(step,style){
    const s = styles[style] || styles.funk;
    if(!s.swing) return 0;
    const offSteps = [2,6,10,14];
    return offSteps.includes(step%16) ? (60/project.bpm/4)*s.swing : 0;
}
/* Transport Extraction Inventory
   Scope target: safe future extraction of transport/playback from js/app.js into js/transport.js (not performed in this PR).
   Runtime rule: inventory-only comments; no behavior changes.

   1) Transport state variables (shared mutable playback state in app scope):
      - isPlaying, metroEnabled, soloEnabled, playAllMode
      - activeSongSection, activeSongPartLabel
      - songSectionIdx, chordIdx, stepInChord, globalStep
      - timer, nextTime, lastVisualTimer

   2) Transport functions and call flow:
      - Entry/exit: startStop, startFullSong, stopPlayback
      - Clocking: scheduler -> scheduleStep -> advanceStep -> moveToNextSongSection
      - Timing/selectors: stepOffset, chordDurationSteps, currentSectionKey, currentSeq, currentItem
      - UI updates: updateLiveUI, updatePartDisplay, updateStepGrid, markStepSolo, pulseMetro
      - Visual scheduling/cleanup helpers used by transport: setVisual, clearKeys

   3) Dependencies on modules/helpers:
      - AudioEngine wrappers used by transport path: resumeAudio, playNote, strumChord, playMetronomeClick
      - MusicTheory wrappers used by transport path: noteToMidi, parseNotes, parseSolo
      - Arrangement dependencies: arrangementParts, renderArrangementBuilder
      - Editor selection dependencies: editorSectionKey() reader, els.sectionSelect, els.chordSelect
      - Fretboard/piano visual dependencies: flashKeys, clearFretboardActive, updateHeldChordVisual
      - Persistence dependencies in transport starts: syncProjectFromControls, saveProject
      - UI/state helpers: flashStatus, sectionNames, styles, els

   4) DOM elements used by transport/UI updates:
      - playBtn, playSongBtn, metroBtn, soloBtn
      - sectionSelect, chordSelect
      - sectionLabel, chordLabel, measureLabel
      - stepGrid, metroDot, currentPartTag

   5) Risk notes for first extraction stage:
      - Previous transport splits typically fail when hidden app-scope coupling is missed
        (shared mutable indices, arrangement/editor selectors, and visual timers must stay coherent).
      - Keep tightly-coupled UI helpers in app.js for stage 1 (updateLiveUI/updatePartDisplay/updateStepGrid,
        plus direct els writes) and extract pure scheduling pieces first.
      - Preserve wrapper layer compatibility (AudioEngine/MusicTheory wrapper functions) so call sites do not
        bind directly to module internals during first move.
      - Transport setup should occur once at startup (single wiring/source of truth for playback state and wrappers),
        not inside resetAll or legacy/init blocks, to avoid duplicate handlers, stale closures, and timer leaks.
 */
function scheduler(){
    while(isPlaying && nextTime < audioCtx.currentTime + .14){
        scheduleStep(nextTime);
        const stepDur = 60 / project.bpm / 4;
        nextTime += stepDur;
        advanceStep();
    }
    if(isPlaying) timer = requestAnimationFrame(scheduler);
}
function scheduleStep(time){
    const item = currentItem();
    const section = currentSectionKey();
    const stepBar0Debug = stepInChord % 16;
    if(stepBar0Debug === 0) console.log('[S936_AUDIO_DEBUG] SCHEDULER_SOURCE', {source:'main', section, style:project.style, bpm:project.bpm, t:time});
    const stepBar = stepInChord % 16;
    const barNum = Math.floor(stepInChord/16) + 1;
    const st = styles[project.style] || styles.funk;
    const when = time + stepOffset(stepBar,project.style);
    const bass = noteToMidi(item.bass) ?? 36;
    const notes = parseNotes(item.notes);
    const chordNotes = chordPlaybackMidis(item);
    const rootFifth = [bass, bass+7].filter(n=>n>=24 && n<=84);
    const visualType = {chord:st.chord.includes(stepBar), bass:st.bass.includes(stepBar), ghost:st.ghost.includes(stepBar), solo:false};

    setVisual(time,()=>{
        updateLiveUI(item,stepBar,barNum,visualType);
        // Cambio 107: Main avisa su posición real en cada paso — primer
        // paso hacia "un solo reloj" (Main como única fuente autorizada).
        // Cualquier módulo (Chart, karaoke, lo que venga) puede escuchar
        // esto para sincronizar su propia visualización SIN tener que
        // correr su propio scheduler. Puramente informativo: no dispara
        // audio, no cambia nada de lo que ya existía.
        try {
            window.dispatchEvent(new CustomEvent('studio936:main-transport-step', {
                detail: {
                    section, stepBar, barNum,
                    chordName: item?.name || '',
                    bpm: project.bpm, style: project.style,
                    playAllMode: !!playAllMode,
                    t: time
                }
            }));
        } catch(_) {}
    });
    if(metroEnabled && stepBar%4===0){ playMetronomeClick(stepBar===0,time); setVisual(time,()=>pulseMetro()); }
    scheduleSongDrums(section,stepInChord,when);

    if(st.bass.includes(stepBar) && !channelMix.bass.mute){
        const bassChoice = bassPatternNote(bass,chordNotes,stepBar,project.style);
        playNote(bassChoice,.29,.46*channelMix.bass.vol,'sine',when);
        if(stepBar===0 || project.style==='rock' || project.style==='ballad') playNote(Math.max(24,bassChoice-12),.16,.62*channelMix.bass.vol,'sine',when);
        setVisual(when,()=>{
            const stringBass = mainStringVisualBassMidis(item,project.instrument);
            if(stringBass.length) flashMainStringMidis(stringBass,'s936-live-hit',210);
            else flashKeys([bassChoice, Math.max(24,bassChoice-12)],'active-bass',210);
        });
    }
    if(st.arp && !channelMix.chord.mute){
        const arpSteps = project.style==='ballad' ? [0,2,4,6,8,10,12,14] : [0,3,6,8,11,14];
        if(arpSteps.includes(stepBar)){
            const m = chordNotes[(Math.floor(stepBar/2)+barNum)%chordNotes.length];
            playNote(m,.12,.54*channelMix.chord.vol,'triangle',when);
            setVisual(when,()=>{
                if(!flashMainStringMidis([m],'s936-strum-hit',190)) flashKeys([m],'active-chord',190);
            });
        }
    }
    if(st.chord.includes(stepBar) && !channelMix.chord.mute) strumChord(chordNotes,.13,.35*channelMix.chord.vol,when,'active-chord');
    if(st.ghost.includes(stepBar) && !channelMix.chord.mute) strumChord(thinChord(chordNotes),.055,.18*channelMix.chord.vol,when,'active-chord');

    // Cambio 135: voces paralelas de práctica (Piano/Ukelele) — suenan
    // junto al instrumento principal, sin importar cuál esté elegido
    // arriba. Apagadas por defecto (mute:true), se activan desde el
    // Mixer de Canales.
    if(st.chord.includes(stepBar)){
        if(!channelMix.piano.mute) strumChordAsInstrument(chordNotes,.13,.35*channelMix.piano.vol,when,'piano');
        if(!channelMix.ukulele.mute){
            const ukeNotes = mainStringPlaybackMidis(item,'ukulele');
            strumChordAsInstrument((ukeNotes && ukeNotes.length) ? ukeNotes : chordNotes,.13,.35*channelMix.ukulele.vol,when,'ukulele');
        }
    }

    if(soloEnabled && !channelMix.solo.mute){
        const sectionSolo = getSectionSolo(section);
        const solo = parseSolo(sectionSolo.phrase || '');
        const event = soloEventAtStep(solo, globalStep);
        if(event && event.midi !== null){
            const soloMidi = clamp(event.midi,48,84);
            playNote(soloMidi,.22,.34*channelMix.solo.vol,'square',when+.01);
            setVisual(when,()=>{ flashKeys([soloMidi],'active-solo',240); markStepSolo(stepBar); });
        }
    }
}
function soloEventAtStep(events,step){
    if(Transport && typeof Transport.soloEventAtStep==='function') return Transport.soloEventAtStep(events,step);
    if(!events.length) return null;
    const total = events.reduce((a,e)=>a+e.dur,0);
    let pos = step % total;
    for(const e of events){ if(pos===0) return e; pos -= e.dur; if(pos<0) return null; }
    return null;
}
function bassPatternNote(bass,chordNotes,step,style){
    if(Transport && typeof Transport.bassPatternNote==='function') return Transport.bassPatternNote(bass,chordNotes,step,style);
    if(style==='jazz'){
        const tones=[bass, chordNotes[0]||bass+4, chordNotes[1]||bass+7, bass+11].map(n=>whileInRange(n,31,55));
        return tones[[0,4,8,12].indexOf(step)] || bass;
    }
    if(style==='blues') return whileInRange(step%6===0?bass+7:bass,31,55);
    if(style==='bossa') return whileInRange((step===0||step===8)?bass:bass+7,31,55);
    if(style==='funk') return whileInRange((step===6||step===14)?bass+7:bass,31,55);
    if(style==='bolero') return whileInRange((step===8)?bass+7:bass,31,55);
    if(style==='salsa') return whileInRange((step===7||step===14)?bass+7:(step===10?bass+12:bass),31,55);
    if(style==='cumbia') return whileInRange((step===4||step===12)?bass+7:bass,31,55);
    if(style==='reggae') return whileInRange((step===8)?bass+7:bass,31,55);
    return whileInRange(bass,31,55);
}
function whileInRange(n,min,max){
    if(Transport && typeof Transport.whileInRange==='function') return Transport.whileInRange(n,min,max);
    while(n<min)n+=12; while(n>max)n-=12; return n;
}
function thinChord(notes){
    if(Transport && typeof Transport.thinChord==='function') return Transport.thinChord(notes);
    if(notes.length<=2) return notes;
    return [notes[0], notes[notes.length-1]];
}
function advanceStep(){
    globalStep++; stepInChord++;
    if(stepInChord >= chordDurationSteps(currentItem())){
        stepInChord=0; chordIdx++;
        if(chordIdx>=currentSeq().length){
            if(playAllMode){ moveToNextSongSection(); }
            else { chordIdx=0; }
        }
    }
}
function moveToNextSongSection(){
    const parts = arrangementParts();
    songSectionIdx++;
    if(songSectionIdx >= parts.length){ stopPlayback(); flashStatus('Canción completa reproducida.'); return; }
    activeSongSection = parts[songSectionIdx].section; activeSongPartLabel = parts[songSectionIdx].label || sectionNames[activeSongSection] || activeSongSection;
    selectedArrangementIndex = songSectionIdx; renderArrangementBuilder();
    chordIdx = 0; stepInChord = 0;
    highlightPlayingSectionInSelector();
}

function updatePartDisplay(){
    const partName = playAllMode ? (activeSongPartLabel || sectionNames[currentSectionKey()] || currentSectionKey()) : (sectionNames[currentSectionKey()] || currentSectionKey());
    if(!els.currentPartTag) return;
    els.currentPartTag.textContent = playAllMode ? `Parte: ${partName} · Canción completa` : `Parte: ${partName}`;
    els.currentPartTag.classList.toggle('fullsong', !!playAllMode);
}
function updateLiveUI(item,stepBar,barNum,types){
    els.sectionLabel.textContent = (playAllMode ? 'Canción completa · ' : '') + (playAllMode ? (activeSongPartLabel || sectionNames[currentSectionKey()] || currentSectionKey()) : (sectionNames[currentSectionKey()] || currentSectionKey()));
    els.chordLabel.textContent = item.name || 'Acorde';
    updatePartDisplay();
    els.measureLabel.textContent = `Compás ${barNum}/${item.bars || 1} · Paso ${stepBar+1}/16`;
    updateStepGrid(stepBar,types);
    if(project.instrument === 'drums'){
        renderMainDrumSurface(false);
        flashMainDrumStep(stepBar,types);
    } else {
        renderMainStringSurface(chordIdx,false);
    }
}
function updateStepGrid(activeStep=-1,types={}){
    const st = styles[project.style] || styles.funk;
    [...els.stepGrid.children].forEach((el,i)=>{
        el.className = 'step ' + (i%4===0?'beat ':'');
        if(st.bass.includes(i)) el.classList.add('bass');
        if(st.chord.includes(i)) el.classList.add('chord');
        if(st.ghost.includes(i)) el.classList.add('ghost');
        if(i===activeStep) el.classList.add('active');
    });
}
function markStepSolo(step){ const el=els.stepGrid.children[step]; if(el) el.classList.add('solo'); }
function pulseMetro(){ els.metroDot.classList.add('dot-active'); setTimeout(()=>els.metroDot.classList.remove('dot-active'),80); }

// Cambio 107: avisa a quien esté escuchando (Chart, karaoke, etc.) que el
// transporte de Main arrancó o se detuvo — junto con el evento de paso
// (arriba), es la base para que otros módulos dejen de tener su propio
// reloj y sigan al de Main. Puramente informativo.
function broadcastMainTransportState(active){
    try {
        window.dispatchEvent(new CustomEvent('studio936:main-transport-state', {
            detail: { active: !!active, playAllMode: !!playAllMode, section: currentSectionKey(), bpm: project.bpm, style: project.style }
        }));
    } catch(_) {}
}
// Cambio 138: cambia solo el texto de un botón (su <span class="btn-label">
// si existe), sin tocar ningún ícono (SVG/img) que tenga adentro — mismo
// patrón usado antes para Play Piano/Metrónomo, generalizado aquí.
// Cambio 142: Transponer — motor propio y activo (el que existía antes
// vivía dentro de un bloque deshabilitado a propósito,
// `ENABLE_LEGACY_V18_PRO_SUITE = false`, por eso nunca funcionó). Este
// transforma la canción EN VIVO (sin recargar la página), reutilizando
// el mismo patrón de refresco que ya usa el resto de la app.
const S936_NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const S936_PC = {C:0,'C#':1,DB:1,D:2,'D#':3,EB:3,E:4,FB:4,'E#':5,F:5,'F#':6,GB:6,G:7,'G#':8,AB:8,A:9,'A#':10,BB:10,B:11,CB:11,'B#':0};
function s936ParseRoot(root){
    if(!root) return null;
    root = String(root).trim().toUpperCase().replace(/♭/g,'B').replace(/♯/g,'#');
    const v = S936_PC[root];
    return v===undefined ? null : v;
}
function s936PcToName(pc){ return S936_NOTE_NAMES[((pc%12)+12)%12]; }
function s936TransposeRoot(root,semi){ const pc=s936ParseRoot(root); return pc==null?root:s936PcToName(pc+semi); }
function s936TransposeChordName(name,semi){
    return String(name||'').replace(/^([A-Ga-g](?:#|b)?)(.*?)(?:\/([A-Ga-g](?:#|b)?))?$/i,
        (m,r,rest,slash)=> s936TransposeRoot(r,semi)+(rest||'')+(slash?('/'+s936TransposeRoot(slash,semi)):''));
}
function s936TransposeNoteToken(tok,semi){
    const m = String(tok||'').match(/^([A-Ga-g](?:#|b)?)(-?\d+)?$/i);
    if(!m) return tok;
    return s936TransposeRoot(m[1],semi)+(m[2]||'');
}
function s936TransposeNotes(str,semi){
    return String(str||'').split(/(\s+|,|;)/).map(x=>/^[\s,;]+$/.test(x)?x:s936TransposeNoteToken(x,semi)).join('');
}
function s936TransposeSoloPhrase(str,semi){
    return String(str||'').replace(/([A-Ga-g](?:#|b)?)(-?\d+)(?=\s*:)/gi,(m,r,o)=>s936TransposeRoot(r,semi)+o);
}
function transposeSongInPlace(semi){
    if(!semi) return;
    songOrder.forEach(k=>{
        (project.sections[k]||[]).forEach(c=>{
            if(c.name) c.name = s936TransposeChordName(c.name, semi);
            if(c.bass) c.bass = s936TransposeNotes(c.bass, semi);
            if(c.notes) c.notes = s936TransposeNotes(c.notes, semi);
        });
        if(project.sectionSolos && project.sectionSolos[k]){
            if(project.sectionSolos[k].key) project.sectionSolos[k].key = s936TransposeRoot(project.sectionSolos[k].key, semi);
            if(project.sectionSolos[k].phrase) project.sectionSolos[k].phrase = s936TransposeSoloPhrase(project.sectionSolos[k].phrase, semi);
        }
    });
    saveProject(false);
    renderChordSelect(); renderSectionList(); loadEditorFromSelected(); updateSectionNoteMap(); renderArrangementBuilder(); updateLiveUI(currentItem(),0,1,{});
}
// Cambio 150: se elimina el modal intermedio — el campo "Clave" ahora es
// un select normal, igual que Estilo/Instrumento/Sección. Elegir una nota
// nueva transporta la canción al instante, sin pantalla de confirmación.
let s936CurrentSongKey = 'C';
// Cambio 151: el estilo inline de un <option> no se refleja en la caja
// cerrada del <select> en la mayoría de navegadores (solo se ve dentro de
// la lista desplegada) — por eso "Canción completa" se veía sin color/
// negrilla aunque el <option> ya tenía el estilo puesto. Se resuelve
// alternando una clase sobre el propio <select> según el valor elegido.
function s936UpdateSectionSelectStyle(){
    const sel = document.getElementById('sectionSelect');
    if(!sel) return;
    sel.classList.toggle('is-full-song', sel.value === '__song__');
}
document.addEventListener('DOMContentLoaded', ()=>setTimeout(s936UpdateSectionSelectStyle, 0));
document.addEventListener('change', (e)=>{ if(e.target && e.target.id === 'sectionSelect') s936UpdateSectionSelectStyle(); });
function s936InitKeySelect(){
    const sel = document.getElementById('s936KeySelect');
    if(!sel) return;
    sel.value = s936CurrentSongKey;
    sel.addEventListener('change', ()=>{
        const from = s936ParseRoot(s936CurrentSongKey);
        const to = s936ParseRoot(sel.value);
        const semi = to - from;
        if(semi){
            transposeSongInPlace(semi);
            s936CurrentSongKey = sel.value;
            flashStatus(`Canción transportada ${semi>0?'+':''}${semi} semitono(s). Clave actual: ${s936CurrentSongKey}.`);
        } else {
            s936CurrentSongKey = sel.value;
        }
    });
}
document.addEventListener('DOMContentLoaded', s936InitKeySelect);

function setBtnLabel(btn, text){
    if(!btn) return;
    const label = btn.querySelector('.btn-label');
    if(label) label.textContent = text; else btn.textContent = text;
}
function startStop(){
    resumeAudio();
    console.log('[S936_AUDIO_DEBUG] PLAY_FROM_MAIN', {alreadyPlaying:isPlaying, playAllMode, t:audioCtx.currentTime});
    if(isPlaying) console.log('[S936_AUDIO_DEBUG] TRANSPORT_ALREADY_RUNNING', {source:'main', playAllMode});
    syncProjectFromControls(false); saveProject(false);
    if(isPlaying && !playAllMode){ stopPlayback(); return; }
    if(isPlaying) stopPlayback();
    playAllMode=false;
    isPlaying = true;
    setBtnLabel(els.playBtn,'Stop Groove'); els.playBtn.className='btn btn-stop';
    if(els.sectionSelect) els.sectionSelect.classList.add('live-section-active');
    chordIdx = Number(els.chordSelect.value)||0; stepInChord=0; globalStep=0; nextTime=audioCtx.currentTime+.04;
    scheduler();
    broadcastMainTransportState(true);
}
// Cambio 140: un solo botón Play — decide qué modo arrancar según el
// selector de sección (si dice "Toda la canción", toca la canción
// completa; si no, toca solo la sección elegida en loop).
function unifiedPlayToggle(){
    if(isPlaying){ stopPlayback(); return; }
    if(els.sectionSelect && els.sectionSelect.value === '__song__') startFullSong();
    else startStop();
}
function updatePlayButtonMode(){
    if(isPlaying || !els.playBtn || !els.sectionSelect) return;
    if(els.sectionSelect.value === '__song__'){
        setBtnLabel(els.playBtn,'Escuchar canción'); els.playBtn.className='btn btn-all';
    } else {
        setBtnLabel(els.playBtn,'Start Groove'); els.playBtn.className='btn btn-play';
    }
}
// Cambio 140: durante "Toda la canción", el selector de sección refleja
// en vivo cuál sección está sonando (sin disparar su propio onchange,
// ya que asignar .value por código no dispara ese evento).
function highlightPlayingSectionInSelector(){
    if(!els.sectionSelect) return;
    els.sectionSelect.classList.add('live-fullsong');
    if(els.sectionSelect.querySelector(`option[value="${CSS.escape(activeSongSection)}"]`)){
        els.sectionSelect.value = activeSongSection;
    }
}
function startFullSong(){
    resumeAudio();
    syncProjectFromControls(false); saveProject(false);
    if(isPlaying && playAllMode){ stopPlayback(); return; }
    if(isPlaying) stopPlayback();
    const parts = arrangementParts();
    if(!parts.length){ flashStatus('No hay secciones para reproducir.'); return; }
    playAllMode=true; isPlaying=true; songSectionIdx=0; activeSongSection=parts[0].section; activeSongPartLabel = parts[0].label || sectionNames[activeSongSection] || activeSongSection; selectedArrangementIndex=0; renderArrangementBuilder();
    chordIdx=0; stepInChord=0; globalStep=0; nextTime=audioCtx.currentTime+.04;
    setBtnLabel(els.playBtn,'Stop canción'); els.playBtn.className='btn btn-all btn-song-active';
    highlightPlayingSectionInSelector();
    scheduler();
    broadcastMainTransportState(true);
}
function stopPlayback(){
    console.log('[S936_AUDIO_DEBUG] STOP_MAIN_TRANSPORT', {t:audioCtx.currentTime});
    const wasFullSong = playAllMode;
    isPlaying=false; playAllMode=false;
    if(els.sectionSelect) els.sectionSelect.classList.remove('live-section-active');
    if(wasFullSong){
        // Cambio 140: vuelve a mostrar "Toda la canción" en el selector
        // (durante la reproducción mostraba la sección real que sonaba).
        if(els.sectionSelect){ els.sectionSelect.classList.remove('live-fullsong'); els.sectionSelect.value='__song__'; }
    } else if(els.sectionSelect){
        activeSongSection=els.sectionSelect.value; activeSongPartLabel = sectionNames[activeSongSection] || activeSongSection;
    }
    if(timer) cancelAnimationFrame(timer); timer=null; clearKeys();
    lastVisualTimer.forEach(clearTimeout); lastVisualTimer=[];
    els.chordLabel.textContent='Modo manual'; updatePartDisplay(); updateStepGrid(-1);
    updatePlayButtonMode();
    broadcastMainTransportState(false);
}

function setBPM(v){
    project.bpm = clamp(Number(v)||95,60,160);
    els.bpmSlider.value = project.bpm;
    els.bpmDisplay.textContent = project.bpm;
    document.querySelectorAll('.preset-btn').forEach(b=>b.classList.toggle('active',Number(b.textContent)===project.bpm));
    saveProject(false);
}
window.setBPM = setBPM;


function renderArrangementBuilder(){ return Arrangement.renderArrangementBuilder(); }
function renderSectionOptions(){ Object.keys(project.sections || {}).forEach(k=>{ if(!els.sectionSelect.querySelector(`option[value="${CSS.escape(k)}"]`)){ const o=document.createElement('option'); o.value=k; o.textContent=sectionNames[k] || k; els.sectionSelect.appendChild(o); } }); }

function renderAll(){
    els.songTitle.value = project.title;
    els.songAuthor.value = project.author || 'Autor no definido';
    els.styleSelect.value = project.style;
    els.instrumentSelect.value = project.instrument || 'piano';
    if(els.routingSelect) els.routingSelect.value = project.routingMode || 'normal';
    if(els.fretModeSelect) els.fretModeSelect.value = project.fretMode || 'guitar';
    buildFretboard();
    if(els.tuningSelect){ const hz=Number(project.tuningHz)||440; els.tuningSelect.value = [440,432,444].includes(Math.round(hz)) ? String(Math.round(hz)) : 'custom'; if(els.tuningCustom) els.tuningCustom.value = hz; }
    setViewMode(project.viewMode || 'piano');
    if(els.sectionSelect.value !== '__song__'){
        els.sectionSelect.value = (els.sectionSelect.value && project.sections[els.sectionSelect.value]) ? els.sectionSelect.value : 'intro';
    }
    const initSectionKey = (els.sectionSelect.value === '__song__') ? 'intro' : els.sectionSelect.value;
    activeSongSection = initSectionKey; activeSongPartLabel = sectionNames[initSectionKey] || initSectionKey;
    lastEditorSection = initSectionKey;
    els.bpmSlider.value = project.bpm; els.bpmDisplay.textContent = project.bpm;
    els.grooveVol.value = project.grooveVol;
    soloEnabled = project.soloOn !== false; if(els.soloBtn){ els.soloBtn.textContent = soloEnabled ? 'Solo ON' : 'Solo OFF'; els.soloBtn.classList.toggle('active',soloEnabled); }
    loadSoloFromSelectedSection();
    renderSectionOptions(); renderChordSelect(); renderSectionList(); loadEditorFromSelected(); updateStyleHelp(); updatePartDisplay(); updateStepGrid(-1); updateSectionNoteMap(); renderArrangementBuilder(); setBPM(project.bpm); updatePlayButtonMode();
    if(stringInstrumentId(project.instrument)) setTimeout(()=>renderMainStringSurface(chordIdx,true),0);
    else if(project.instrument === 'drums') setTimeout(()=>scheduleMainDrumSurface(),0);
}
function renderChordSelect(){
    const seq = editorSeq(); els.chordSelect.innerHTML='';
    seq.forEach((c,i)=>{ const o=document.createElement('option'); o.value=i; o.textContent=`${i+1}. ${c.name} · ${c.bars||1} compás(es)`; els.chordSelect.appendChild(o); });
    if(Number(els.chordSelect.value)>=seq.length) els.chordSelect.value=0;
}
function renderSectionList(){ return Editor.renderSectionList(); }
function loadEditorFromSelected(){ return Editor.loadEditorFromSelected(); }
function applyEditorToProject(render=true){ return Editor.applyEditorToProject(render); }
function escapeHtml(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function updateStyleHelp(){ const inst = instruments[project.instrument]?.label || 'Piano'; els.styleHelp.textContent = (styles[project.style]?.help || styles.funk.help) + ' · Instrumento guía: ' + inst + '.'; }

function previewChord(){
    resumeAudio();
    const t=audioCtx.currentTime+.02;
    const item = editorSeq()[Number(els.chordSelect?.value)||0] || currentItem();
    if(project.instrument === 'drums'){
        scheduleMainDrumSurface();
        ['kick','snare','hatClosed'].forEach((lane,index)=>setTimeout(()=>triggerEditorDrumLane(lane,index===0 ? .95 : .72,defaultDrumPattern()),index*70));
        return;
    }
    if(stringInstrumentId(project.instrument)){
        const voicing = mainStringVoicing(item,project.instrument);
        const notes = voicing?.midis || mainStringPlaybackMidis(item,project.instrument);
        if(notes.length){
            renderMainStringSurface(Number(els.chordSelect?.value)||chordIdx,true);
            const strum = currentInstrument().strum || .018;
            notes.forEach((midi,index)=>playNote(midi,project.instrument === 'bass' ? .34 : .20,project.instrument === 'bass' ? .76 : .82,project.instrument === 'bass' ? 'sine' : 'triangle',t + index*strum));
            const events = mainStringVoicingEvents(item,project.instrument);
            if(events.length) window.Studio936StringSurface?.strumPositions?.(events,Math.max(22,Math.round(strum*1000)),240);
            else window.Studio936StringSurface?.strumMidis?.(notes,Math.max(22,Math.round(strum*1000)),240);
            return;
        }
    }
    const bass=noteToMidi(els.bassInput.value.trim()); const notes=parseNotes(els.chordNotes.value.trim());
    if(bass!==null){ playNote(bass,.28,.75,'sine',t); flashKeys([bass],'active-bass',600); }
    strumChord(notes,.16,.9,t+.05,'active-chord');
}
function addChord(){ return Editor.addChord(); }
function duplicateChord(){ return Editor.duplicateChord(); }
function deleteChord(){ return Editor.deleteChord(); }
function resetSection(){ return Editor.resetSection(); }
function resetAll(){
    stopPlayback(); project=defaultProject(); Storage.clearProject(STORAGE_KEY); renderAll(); flashStatus('Proyecto restaurado al estado inicial.');
}


function getSectionSolo(k){
    if(!project.sectionSolos) project.sectionSolos = defaultSectionSolos();
    if(!project.sectionSolos[k]) project.sectionSolos[k] = {key:'C', scale:'major', phrase:''};
    return project.sectionSolos[k];
}
function loadSoloFromSelectedSection(){
    const data = getSectionSolo(editorSectionKey());
    els.soloKey.value = data.key || 'C';
    els.soloScale.value = data.scale || 'major';
    els.soloPhrase.value = data.phrase || '';
}
function saveSoloForSection(k=editorSectionKey(), show=true){
    if(!project.sectionSolos) project.sectionSolos = defaultSectionSolos();
    project.sectionSolos[k] = {
        key: els.soloKey.value.trim() || 'C',
        scale: els.soloScale.value || 'major',
        phrase: els.soloPhrase.value.trim()
    };
    project.soloPhrase = project.sectionSolos.solo?.phrase || project.soloPhrase || '';
    project.soloKey = project.sectionSolos.solo?.key || project.soloKey || 'C';
    project.soloScale = project.sectionSolos.solo?.scale || project.soloScale || 'major';
    if(show){ saveProject(false); flashStatus('Línea melódica guardada para ' + (sectionNames[k] || k) + '.'); }
}
function clearSoloForSection(){
    els.soloPhrase.value = '';
    saveSoloForSection(editorSectionKey(), true);
}
function sectionChordMapText(k){
    const seq = project.sections[k] || [];
    return seq.map((c,i)=>`${i+1}. ${c.name} (${c.bars||1}c) | Bajo ${c.bass} | Notas ${c.notes}`).join('\n');
}
function sectionChordMapHtml(k,compact=false){
    const seq = project.sections[k] || [];
    if(!seq.length) return '<div class="hint">No hay acordes en esta sección.</div>';
    return seq.map((c,i)=>`<div class="map-line"><span class="map-chip accent">${i+1}. ${escapeHtml(c.name)}</span><span class="map-chip">${c.bars||1} comp.</span><span class="map-chip bass">Bajo ${escapeHtml(c.bass)}</span>${compact ? '' : `<span>${escapeHtml(c.notes)}</span>`}</div>`).join('');
}
function updateSectionNoteMap(){
    const k = editorSectionKey();
    if(els.editorSectionBadge) els.editorSectionBadge.textContent = `Mostrando: ${sectionNames[k] || k} · ${(project.sections[k]||[]).length} acorde(s)`;
    if(els.sectionNoteMap) els.sectionNoteMap.innerHTML = sectionChordMapHtml(k,false);
}
function renderLyricsMap(){
    if(!els.lyricsMap) return;
    const lines = arrangementOrder().map(k=>`<div class="map-line"><span class="map-chip accent">${sectionNames[k]}</span><span>${escapeHtml((project.sections[k]||[]).map(c=>`${c.name} (${c.bars||1}c)`).join(' → '))}</span></div>`).join('');
    els.lyricsMap.innerHTML = `<h3>Mapa armónico / notas de la canción</h3>${lines}<div class="arrangement-note">Este mapa también sale en el TXT exportado junto con la letra.</div>`;
}

function generateSolo(){
    const root = rootMidiFromKey(els.soloKey.value,4);
    const intervals = scaleIntervals[els.soloScale.value] || scaleIntervals.minorPent;
    const scale = intervals.map(i=>root+i);
    const style = els.styleSelect.value;
    let pattern;
    if(style==='blues') pattern=[0,1,2,3,4,3,2,null,1,2,4,5,4,2,1,null];
    else if(style==='jazz') pattern=[0,2,4,5,4,2,1,null,2,3,5,4,3,1,0,null];
    else if(style==='bossa'||style==='ballad') pattern=[0,null,2,3,4,null,3,2,1,null,2,4,3,null,1,0];
    else pattern=[0,1,2,null,3,4,3,2,null,1,2,4,5,4,2,null];
    const phrase = pattern.map(x=> x===null ? 'R:2' : midiToNote(scale[x%scale.length])+':2').join(' ');
    els.soloPhrase.value = phrase;
    saveSoloForSection(editorSectionKey(), false); saveProject(false);
    flashStatus('Frase sugerida para ' + (sectionNames[editorSectionKey()] || editorSectionKey()) + '. Puedes editarla nota por nota.');
}
function previewSolo(){
    resumeAudio();
    const events=parseSolo(els.soloPhrase.value); let t=audioCtx.currentTime+.03; const stepDur=60/project.bpm/4;
    events.slice(0,32).forEach(ev=>{ if(ev.midi!==null){ playNote(ev.midi,.22,.32,'square',t); setVisual(t,()=>flashKeys([ev.midi],'active-solo',210)); } t += stepDur*ev.dur; });
}
function saveSolo(){ saveSoloForSection(editorSectionKey(), true); }

function lyricsTabHelpers(){
    return { els, songOrder, sectionNames, defaultLyrics, sectionChordMapHtml, renderLyricsMap, syncProjectFromControls, saveProject, flashStatus };
}
function renderLyricsGrid(){
    if(window.Studio936LyricsTab?.buildLyricsModal) return window.Studio936LyricsTab.buildLyricsModal(project, lyricsTabHelpers());
    if(!project.lyrics) project.lyrics = defaultLyrics();
    renderLyricsMap();
    els.lyricsGrid.innerHTML='';
    songOrder.forEach(k=>{
        const box=document.createElement('div'); box.className='lyric-box';
        const label=document.createElement('label'); label.textContent=sectionNames[k];
        const miniMap=document.createElement('div'); miniMap.className='lyric-section-map'; miniMap.innerHTML=sectionChordMapHtml(k,true);
        const ta=document.createElement('textarea'); ta.dataset.lyricSection=k; ta.placeholder=`Letra para ${sectionNames[k]}...`; ta.value=project.lyrics[k] || '';
        box.appendChild(label); box.appendChild(miniMap); box.appendChild(ta); els.lyricsGrid.appendChild(box);
    });
}
function openLyrics(){
    if(window.Studio936LyricsTab?.openLyricsModal) return window.Studio936LyricsTab.openLyricsModal(project, lyricsTabHelpers());
    syncProjectFromControls(false); renderLyricsGrid(); els.lyricsModal.style.display='flex';
}
function closeLyrics(){
    if(window.Studio936LyricsTab?.closeLyricsModal) return window.Studio936LyricsTab.closeLyricsModal(project, lyricsTabHelpers());
    els.lyricsModal.style.display='none';
}
function syncLyricsFromModal(show=true){
    if(window.Studio936LyricsTab?.syncLyricsFromModal) return window.Studio936LyricsTab.syncLyricsFromModal(project, lyricsTabHelpers(), show);
    if(!project.lyrics) project.lyrics = defaultLyrics();
    if(!els.lyricsGrid) return;
    els.lyricsGrid.querySelectorAll('[data-lyric-section]').forEach(ta=>{ project.lyrics[ta.dataset.lyricSection] = ta.value; });
    if(show){ saveProject(false); flashStatus('Letra guardada y lista para exportar TXT.'); closeLyrics(); }
}
function saveLyricsModal(){
    if(window.Studio936LyricsTab?.saveLyricsModal) return window.Studio936LyricsTab.saveLyricsModal(project, lyricsTabHelpers());
    syncLyricsFromModal(true);
}


const exportI18n = {
    es:{
        song:'CANCIÓN', author:'AUTOR', undefinedAuthor:'Autor no definido', style:'ESTILO', instrument:'INSTRUMENTO GUÍA', tempo:'TEMPO', order:'ORDEN REAL DE CANCIÓN',
        noteMap:'MAPA DE NOTAS / ACORDES', bass:'Bajo', notes:'Notas', bars:'Compases', melody:'MELODÍA / SOLO DE LA SECCIÓN', key:'Tonalidad', scale:'Escala', phrase:'Frase', lyrics:'LETRA', summary:'RESUMEN DE LÍNEAS MELÓDICAS / SOLOS',
        sections:{intro:'Introducción',verse:'Verso',verse1:'Verso 1',verse2:'Verso 2',verse3:'Verso 3',prechorus:'Pre-coro',chorus:'Coro',interlude:'Interludio',solo:'Solo'},
        styles:{funk:'Funk',rock:'Rock',ballad:'Balada',bossa:'Bossa Nova',jazz:'Jazz',blues:'Blues',pop:'Pop',bolero:'Bolero',salsa:'Salsa',cumbia:'Cumbia',reggae:'Reggae'},
        instruments:{piano:'Piano',epiano:'Piano eléctrico',guitar:'Guitarra',ukulele:'Ukelele',organ:'Órgano',sax:'Saxo guía',synth:'Synth'},
        scales:{minorPent:'Pentatónica menor',majorPent:'Pentatónica mayor',blues:'Blues',dorian:'Dórica',mixolydian:'Mixolidia',major:'Mayor',minor:'Menor natural'}
    },
    en:{
        song:'SONG', author:'AUTHOR', undefinedAuthor:'Undefined author', style:'STYLE', instrument:'GUIDE INSTRUMENT', tempo:'TEMPO', order:'REAL SONG ORDER',
        noteMap:'NOTE / CHORD MAP', bass:'Bass', notes:'Notes', bars:'Bars', melody:'SECTION MELODY / SOLO', key:'Key', scale:'Scale', phrase:'Phrase', lyrics:'LYRICS', summary:'MELODIC LINES / SOLOS SUMMARY',
        sections:{intro:'Introduction',verse:'Verse',verse1:'Verse 1',verse2:'Verse 2',verse3:'Verse 3',prechorus:'Pre-chorus',chorus:'Chorus',interlude:'Interlude',solo:'Solo'},
        styles:{funk:'Funk',rock:'Rock',ballad:'Ballad',bossa:'Bossa Nova',jazz:'Jazz',blues:'Blues',pop:'Pop',bolero:'Bolero',salsa:'Salsa',cumbia:'Cumbia',reggae:'Reggae'},
        instruments:{piano:'Piano',epiano:'Electric piano',guitar:'Guitar',ukulele:'Ukulele',organ:'Organ',sax:'Sax guide',synth:'Synth'},
        scales:{minorPent:'Minor pentatonic',majorPent:'Major pentatonic',blues:'Blues',dorian:'Dorian',mixolydian:'Mixolydian',major:'Major',minor:'Natural minor'}
    }
};
function exportLang(){
    const stored = (localStorage.getItem('pianoComposerUiLangV15') || document.documentElement.lang || 'es').toLowerCase();
    return stored.startsWith('en') ? 'en' : 'es';
}
function exportT(){ return exportI18n[exportLang()] || exportI18n.es; }
function exportSectionName(k,t){ return (t.sections && t.sections[k]) || sectionNames[k] || k; }
function exportStyleName(k,t){ return (t.styles && t.styles[k]) || (styles[k] && styles[k].label) || k; }
function exportInstrumentName(k,t){ return (t.instruments && t.instruments[k]) || (instruments[k] && instruments[k].label) || k || 'Piano'; }
function exportScaleName(k,t){ return (t.scales && t.scales[k]) || k; }

function projectText(){
    syncProjectFromControls(false);
    syncLyricsFromModal(false);
    const t = exportT();
    let out=[];
    out.push(`${t.song}: ${project.title}`);
    out.push(`${t.author}: ${project.author || t.undefinedAuthor}`);
    out.push(`${t.style}: ${exportStyleName(project.style,t)}`);
    out.push(`${t.instrument}: ${exportInstrumentName(project.instrument,t)}`);
    out.push(`${t.tempo}: ${project.bpm} BPM`);
    out.push(`A4: ${masterA()} Hz`);
    out.push(`Routing: ${project.routingMode === 'split' ? 'Click L / Music R' : 'Normal stereo'}`);
    out.push(`${t.order}: ${arrangementParts().map(p=>p.label || exportSectionName(p.section,t)).join(' → ')}`);
    out.push('');
    arrangementParts().forEach((part,partIndex)=>{
        const k = part.section;
        out.push(`## ${String(part.label || exportSectionName(k,t)).toUpperCase()} (${exportSectionName(k,t)})`);
        out.push(`${t.noteMap}:`);
        (project.sections[k]||[]).forEach((c,i)=>out.push(`${i+1}. ${c.name} | ${t.bass}: ${c.bass} | ${t.notes}: ${c.notes} | ${t.bars}: ${c.bars}`));
        const line = getSectionSolo(k);
        if(line && line.phrase){
            out.push('');
            out.push(`${t.melody}:`);
            out.push(`${t.key}: ${line.key} | ${t.scale}: ${exportScaleName(line.scale,t)}`);
            out.push(`${t.phrase}: ${line.phrase}`);
        }
        const lyr = (project.lyrics && project.lyrics[k] ? project.lyrics[k].trim() : '');
        if(lyr){ out.push(''); out.push(`${t.lyrics}:`); out.push(lyr); }
        out.push('');
    });
    out.push(`## ${t.summary}`);
    arrangementParts().forEach(part=>{
        const k = part.section; const line = getSectionSolo(k);
        if(line && line.phrase) out.push(`${part.label || exportSectionName(k,t)} | ${line.key} | ${exportScaleName(line.scale,t)} | ${line.phrase}`);
    });
    return out.join('\n');
}

function getMidiExport(){ return window.Studio936MidiExport || null; }
function midiExportHelpers(){
    const safeSlug = (s) => String(s || 'studio936')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9]+/g,'-')
      .replace(/^-+|-+$/g,'') || 'studio936';

    return {
        syncProjectFromControls,
        syncLyricsFromModal,
        arrangementParts,
        songOrder,
        sectionNames,
        parseSolo,
        getSectionSolo,
        styles,
        noteToMidi,
        parseNotes,
        bassPatternNote,
        thinChord,
        clamp,
        masterA,
        slug: safeSlug,
        flashStatus,
        download: (filename, content, type) => download(filename, content, type)
    };
}
function buildMidiBytes(){ const MidiExport = getMidiExport(); return MidiExport && MidiExport.buildMidiBytes ? MidiExport.buildMidiBytes(project, midiExportHelpers()) : new Uint8Array(); }
function exportMidi(){ const MidiExport = getMidiExport(); if(MidiExport && MidiExport.exportMidi){ console.log('MIDI diagnóstico: export modular.'); return MidiExport.exportMidi(project, midiExportHelpers()); } console.log('MIDI diagnóstico: export legacy.'); }

function download(filename,content,type){
    Storage.download(filename, content, type);
}
const ExportText = window.Studio936ExportText || null;
function exportHelpers(){
    return {
        projectText: () => projectText(),
        download,
        syncProjectFromControls,
        syncLyricsFromModal,
        flashStatus,
        readJsonFile: Storage.readJsonFile,
        modelNormalizeProject,
        styles,
        instruments,
        renderAll,
        saveProject,
        setProject: nextProject => { project = nextProject; }
    };
}
function exportTxt(){
    if(ExportText && ExportText.exportTxt) return ExportText.exportTxt(project, exportHelpers());
    download('progresion.txt', projectText(), 'text/plain;charset=utf-8');
}
function exportJson(){
    if(ExportText && ExportText.exportJson) return ExportText.exportJson(project, exportHelpers());
    syncProjectFromControls(false); syncLyricsFromModal(false);
    download('proyecto.json', JSON.stringify(project,null,2), 'application/json;charset=utf-8');
}
async function copyText(){
    if(ExportText && ExportText.copyText) return ExportText.copyText(project, exportHelpers());
    try{ await navigator.clipboard.writeText(projectText()); flashStatus('Progresión copiada al portapapeles.'); }catch(e){ flashStatus('No pude copiar; usa Bajar TXT.'); }
}
function importJson(file){
    if(ExportText && ExportText.importFromFile) return ExportText.importFromFile(file, exportHelpers());
    if(!file) return;
    Storage.readJsonFile(file)
        .then(text => {
            try{
                project = modelNormalizeProject(JSON.parse(text), styles, instruments);
                renderAll();
                saveProject(false);
                flashStatus('Proyecto importado correctamente.');
            }catch(e){ flashStatus('JSON inválido.'); }
        })
        .catch(() => flashStatus('No pude leer el archivo JSON.'));
}

function bind(){
    els.playBtn.onclick=unifiedPlayToggle;
    els.metroBtn.onclick=()=>{ metroEnabled=!metroEnabled; const metroSpan=els.metroBtn.querySelector('span'); if(metroSpan) metroSpan.textContent=metroEnabled?'🔊':'🥁'; else if(!els.metroBtn.querySelector('img')) els.metroBtn.textContent=metroEnabled?'🔊':'🥁'; els.metroBtn.classList.toggle('active',metroEnabled); if(metroEnabled){ previewMetronome(); flashStatus('Metrónomo activado: escucharás el click junto con Start Groove o Escuchar canción.'); } else { flashStatus('Metrónomo apagado.'); } };
    if(els.soloBtn) els.soloBtn.onclick=()=>{ soloEnabled=!soloEnabled; project.soloOn=soloEnabled; els.soloBtn.textContent=soloEnabled?'Solo ON':'Solo OFF'; els.soloBtn.classList.toggle('active',soloEnabled); saveProject(false); };
    if(els.chordHoldBtn) els.chordHoldBtn.onclick=toggleChordHold;
    if(els.tableroBtn) els.tableroBtn.onclick=toggleTablero;
    els.bpmSlider.oninput=()=>setBPM(els.bpmSlider.value);
    els.songTitle.oninput=()=>saveProject(false);
    els.songAuthor.oninput=()=>saveProject(false);
    els.styleSelect.onchange=()=>{ project.style=els.styleSelect.value; updateStyleHelp(); updateStepGrid(-1); updateSectionNoteMap(); updateFretboardMap(); saveProject(false); };
    els.instrumentSelect.onchange=()=>{
        try { InstrumentSurfaceManager?.endEditorSession?.({restore:false}); } catch(_) {}
        resetMainSurfaceClasses();
        project.instrument=els.instrumentSelect.value;
        if(stringInstrumentId(project.instrument)){
            clearMainDrumSurface();
            project.fretMode = project.instrument === 'ukulele' ? 'ukulele' : project.instrument === 'bass' ? 'bass' : project.instrument === 'lead' ? 'guitar' : 'guitar';
            if(els.fretModeSelect) els.fretModeSelect.value = project.fretMode;
            setViewMode('fretboard');
            buildFretboard(); updateFretboardMap();
            renderMainStringSurface(chordIdx,true);
            flashStatus(project.instrument === 'ukulele' ? 'SuperUkelele 936 activo.' : project.instrument === 'bass' ? 'SuperBajo 936 activo.' : project.instrument === 'lead' ? 'SuperGuitarra Lead 936 activa.' : 'SuperGuitarra 936 activa.');
        } else if(project.instrument === 'drums'){
            clearMainStringSurface();
            setViewMode('fretboard');
            scheduleMainDrumSurface();
            flashStatus('Batería 936 activa en Main.');
        } else {
            clearMainStringSurface();
            clearMainDrumSurface();
            resetMainSurfaceClasses();
            setViewMode('piano');
            if(els.pianoContainer) els.pianoContainer.style.display = 'flex';
            if(els.fretboardContainer) els.fretboardContainer.style.display = 'none';
            requestAnimationFrame(() => {
                try {
                    clearMainStringSurface();
                    clearMainDrumSurface();
                    resetMainSurfaceClasses();
                    if(els.pianoContainer) els.pianoContainer.style.display = 'flex';
                    if(els.fretboardContainer) els.fretboardContainer.style.display = 'none';
                } catch(_) {}
            });
            flashStatus(project.instrument === 'piano' ? 'Vista de piano activa.' : 'Vista de teclado activa para ' + (instruments[project.instrument]?.label || project.instrument) + '.');
        }
        updateStyleHelp(); saveProject(false);
    };
    if(els.viewToggleBtn) els.viewToggleBtn.onclick=()=>{ setViewMode(project.viewMode==='piano'?'fretboard':'piano'); saveProject(false); flashStatus(project.viewMode==='fretboard'?'Vista de diapasón activa.':'Vista de piano activa.'); };
    if(els.routingSelect) els.routingSelect.onchange=()=>{ project.routingMode=els.routingSelect.value; saveProject(false); flashStatus(project.routingMode==='split'?'Routing split: click a la izquierda, música a la derecha.':'Routing normal estéreo.'); };
    if(els.fretModeSelect) els.fretModeSelect.onchange=()=>{ project.fretMode=els.fretModeSelect.value; buildFretboard(); updateFretboardMap(); saveProject(false); flashStatus(project.fretMode==='bass'?'Diapasón bajo activo.':project.fretMode==='ukulele'?'Diapasón ukelele activo.':'Diapasón guitarra activo.'); };
    if(els.tuningSelect) els.tuningSelect.onchange=()=>{ project.tuningHz = els.tuningSelect.value==='custom' ? clamp(Number(els.tuningCustom.value)||440,390,470) : clamp(Number(els.tuningSelect.value)||440,390,470); if(els.tuningCustom) els.tuningCustom.value=project.tuningHz; saveProject(false); flashStatus('Afinación A4 = '+project.tuningHz+' Hz.'); };
    if(els.tuningCustom) els.tuningCustom.onchange=()=>{ project.tuningHz=clamp(Number(els.tuningCustom.value)||440,390,470); els.tuningCustom.value=project.tuningHz; if(els.tuningSelect) els.tuningSelect.value=[440,432,444].includes(Math.round(project.tuningHz))?String(Math.round(project.tuningHz)):'custom'; saveProject(false); flashStatus('Afinación A4 = '+project.tuningHz+' Hz.'); };
    els.sectionSelect.onchange=()=>{
        if(els.sectionSelect.value === '__song__'){
            // Cambio 140: "Toda la canción" no es una sección real — no
            // se intenta cargar editor/acordes para ella, solo se
            // actualiza el aspecto del botón único.
            updatePlayButtonMode();
            return;
        }
        saveSoloForSection(lastEditorSection, false); activeSongSection=els.sectionSelect.value; lastEditorSection=els.sectionSelect.value; chordIdx=0; stepInChord=0; renderChordSelect(); loadEditorFromSelected(); renderSectionList(); loadSoloFromSelectedSection(); updateSectionNoteMap(); renderArrangementBuilder(); updateLiveUI(currentItem(),0,1,{}); saveProject(false);
        updatePlayButtonMode();
    };
    els.chordSelect.onchange=()=>{ loadEditorFromSelected(); renderSectionList(); updateSectionNoteMap(); };
    if(window.Studio936UiBindings?.bindEditorActions){
        window.Studio936UiBindings.bindEditorActions({
            els,
            previewChord,
            applyEditorToProject,
            addChord,
            duplicateChord,
            deleteChord,
            resetSection,
            resetAll,
            generateSolo,
            previewSolo,
            saveSolo,
            clearSoloForSection
        });
    }
    if(window.Studio936UiBindings?.bindStaticActions){
        window.Studio936UiBindings.bindStaticActions({
            els,
            saveProject,
            exportTxt,
            exportJson,
            copyText,
            importJson,
            openLyrics,
            closeLyrics,
            saveLyricsModal,
            flashStatus
        });
    }
    if(els.midiBtn) els.midiBtn.onclick=()=>{ console.log('MIDI diagnóstico: click recibido.'); try{ if(!window.Studio936MidiExport) throw new Error('Studio936MidiExport no disponible'); exportMidi(); }catch(err){ console.error(err); flashStatus('Error exportando MIDI. Revisa consola.'); } };
    [els.chordName,els.bassInput,els.chordNotes,els.barsInput,els.grooveVol,els.tuningCustom].filter(Boolean).forEach(x=>x.addEventListener('change',()=>saveProject(false)));
    [els.soloPhrase,els.soloKey,els.soloScale].forEach(x=>x.addEventListener('change',()=>saveSoloForSection(editorSectionKey(), false)));
}

Arrangement = window.Studio936Arrangement.setup({
    els,
    get project(){ return project; },
    set project(v){ project=v; },
    sectionNames,
    songOrder,
    normalizeArrangement,
    chord,
    escapeHtml,
    saveProject,
    flashStatus,
    renderSectionList,
    editorSectionKey,
    loadEditorFromSelected,
    selectArrangementPart:(index)=>selectArrangementPart(index),
    onPartSelected:(p)=>{ activeSongPartLabel=p.label || sectionNames[p.section] || p.section; updatePartDisplay(); },
    getSelectedArrangementIndex:()=>selectedArrangementIndex,
    setSelectedArrangementIndex:v=>{ selectedArrangementIndex=Number(v)||0; }
});
window.Studio936DebugArrangement = function(){
    const diagnostic = {
        arrangement: Arrangement.getArrangementState ? Arrangement.getArrangementState() : null,
        arrangementSelectedIndex: Arrangement.getSelectedArrangementIndex ? Arrangement.getSelectedArrangementIndex() : selectedArrangementIndex,
        arrangementSelectedSection: Arrangement.getArrangementState ? Arrangement.getArrangementState()?.selectedSection : null,
        sectionSelect: els.sectionSelect ? els.sectionSelect.value : null,
        activeSongSection,
        activeSongPartLabel,
        selectedArrangementIndex,
        projectArrangement: project.arrangement
    };
    if(debugArrangementEnabled) console.debug('Studio936 arrangement diagnostics', diagnostic);
    return diagnostic;
};

function bindFinalMidiExport(){
    const btn = document.getElementById('midiBtn');
    if(!btn) return;
    btn.onclick = function(){
        try{
            console.log('MIDI FINAL: modular handler');
            if(!window.Studio936MidiExport || typeof window.Studio936MidiExport.exportMidi !== 'function'){
                throw new Error('Studio936MidiExport.exportMidi no disponible');
            }
            window.Studio936MidiExport.exportMidi(project, midiExportHelpers());
        }catch(err){
            console.error(err);
            flashStatus('Error exportando MIDI. Revisa consola.');
        }
    };
}


function installStudio936AppBridge(){
    const StringInstruments = window.Studio936StringInstruments || null;
    const StringSurface = window.Studio936StringSurface || null;
    const VoicingStore = window.Studio936VoicingStore || null;
    const PianoEditorPro = window.Studio936SuiteProPianoEditor || null;

    function safeClone(value){
        try { return JSON.parse(JSON.stringify(value)); }
        catch(error){ return value; }
    }
    function safe(fn, fallback=null){
        try { return fn(); }
        catch(error){ console.warn('Studio936AppBridge safe call failed:', error); return fallback; }
    }
    function currentKeyFromControls(){
        return (els.soloKey && els.soloKey.value) || project.soloKey || 'C';
    }
    function currentSectionName(){
        const key = currentSectionKey ? currentSectionKey() : (els.sectionSelect?.value || 'intro');
        return sectionNames[key] || key;
    }
    function clickWorkspacePanel(name){
        const btn = document.querySelector(`#v25UxBar [data-ux-open="${name}"]`);
        if(btn){ btn.click(); return true; }
        return false;
    }
    function getSongSnapshot(){
        syncProjectFromControls(false);
        syncLyricsFromModal(false);
        const parts = safe(() => arrangementParts(), []);
        return {
            title: project.title,
            author: project.author,
            style: project.style,
            instrument: project.instrument,
            bpm: project.bpm,
            tuningHz: project.tuningHz,
            routingMode: project.routingMode,
            key: currentKeyFromControls(),
            currentSection: els.sectionSelect?.value || 'intro',
            currentSectionName: currentSectionName(),
            currentPart: els.currentPartTag?.textContent || '',
            chordLabel: els.chordLabel?.textContent || '',
            arrangement: safeClone(parts),
            sections: safeClone(project.sections || {}),
            lyrics: safeClone(project.lyrics || {}),
            sectionSolos: safeClone(project.sectionSolos || {}),
            bassLines: safeClone(project.bassLines || {}),
            project: safeClone(project)
        };
    }
    function getFullSongText(){
        return projectText();
    }
    // Cambio 96: setInstrument/setKey — dispara el mismo evento 'change' que ya
    // maneja toda la lógica existente (surfaces, fretboard, flashStatus, etc.),
    // en vez de duplicar esa lógica en el bridge. Si el valor no es válido, no
    // toca nada y retorna false (mismo criterio defensivo que el resto del bridge).
    function setInstrument(value){
        return safe(() => {
            if(!els.instrumentSelect) return false;
            const id = canonicalInstrumentId(value);
            const hasOption = !!els.instrumentSelect.querySelector(`option[value="${CSS.escape(id)}"]`);
            if(!id || !hasOption) return false;
            els.instrumentSelect.value = id;
            els.instrumentSelect.dispatchEvent(new Event('change', {bubbles:true}));
            return true;
        }, false);
    }
    function setKey(value){
        return safe(() => {
            if(!els.soloKey) return false;
            const key = String(value || '').trim();
            if(!key) return false;
            els.soloKey.value = key;
            els.soloKey.dispatchEvent(new Event('change', {bubbles:true}));
            return true;
        }, false);
    }
    // Cambio 103: el Bridge no tenía getBpm()/getStyle() — el Chart ya los
    // llamaba (window.Studio936AppBridge?.getBpm?.()), pero como no existían,
    // caía en silencio a un respaldo de localStorage que puede quedar
    // desactualizado respecto al estilo/tempo real activo en Main, haciendo
    // que el Chart tocara el patrón rítmico de OTRO estilo por completo.
    function getBpm(){
        return safe(() => Number(project.bpm) || 95, 95);
    }
    function getStyle(){
        return safe(() => String(project.style || ''), '');
    }
    // Cambio 107: consulta si el transporte de Main está sonando ahora
    // mismo — base para que otros módulos decidan si deben esperar,
    // detenerlo, o simplemente seguirlo en vez de arrancar el suyo.
    function isMainPlaying(){
        return safe(() => !!isPlaying, false);
    }
    // Cambio 129: mixer de canales — permite al panel de "Canales/
    // Instrumentos" leer y cambiar el silencio/volumen de cada parte
    // del groove (batería, bajo, acordes/guitarra, solo) sin tocar
    // ningún otro archivo.
    function getChannelMix(){
        return safe(() => JSON.parse(JSON.stringify(channelMix)), {});
    }
    function setChannelMute(channel, muted){
        return safe(() => {
            if(!channelMix[channel]) return false;
            channelMix[channel].mute = !!muted;
            return true;
        }, false);
    }
    function setChannelVolume(channel, vol){
        return safe(() => {
            if(!channelMix[channel]) return false;
            channelMix[channel].vol = Math.max(0, Math.min(1, Number(vol)));
            return true;
        }, false);
    }
    function setChannelPan(channel, pan){
        return safe(() => {
            if(!channelMix[channel]) return false;
            channelMix[channel].pan = Math.max(-1, Math.min(1, Number(pan)));
            return true;
        }, false);
    }
    // Cambio 146: tocar en vivo desde un teclado MIDI físico — enciende la
    // tecla real en el piano/diapasón principal y suena con el timbre del
    // instrumento actualmente seleccionado (no el sonido del teclado MIDI).
    function playLiveNote(midiNumber, velocity01){
        return safe(() => {
            resumeAudio();
            const midi = Number(midiNumber);
            if(!Number.isFinite(midi)) return false;
            const vol = Math.max(.08, Math.min(1, Number(velocity01) || .7)) * .5;
            playNote(midi, 1.6, vol, 'triangle', audioCtx.currentTime);
            liveKeyOn(midi);
            return true;
        }, false);
    }
    function stopLiveNote(midiNumber){
        return safe(() => {
            const midi = Number(midiNumber);
            if(!Number.isFinite(midi)) return false;
            liveKeyOff(midi);
            return true;
        }, false);
    }
    // Cambio 104: el Chart nunca reproducía batería — su groove de práctica
    // solo tocaba bajo/acordes/arpegio/click, sin percusión, por eso sonaba
    // "sin groove" comparado con Main. Este método reutiliza el motor de
    // batería REAL de Main (mismo kit, mismo patrón por sección/estilo).
    function scheduleDrumStep(sectionKey, step, when){
        return safe(() => scheduleSongDrums(String(sectionKey || currentSectionKey()), Number(step) || 0, Number(when) || audioCtx.currentTime) || [], []);
    }
    function getProjectJson(){
        syncProjectFromControls(false);
        syncLyricsFromModal(false);
        return JSON.stringify(project, null, 2);
    }

    function editorSectionOptions(){
        return Object.keys(project.sections || {}).map(key => [key, sectionNames[key] || key]);
    }
    function getEditorState(){
        syncProjectFromControls(false);
        const sectionKey = els.sectionSelect?.value || 'intro';
        const seq = Array.isArray(project.sections?.[sectionKey]) ? project.sections[sectionKey] : [];
        const mainInstrument = canonicalInstrumentId(project.instrument || els.instrumentSelect?.value || 'piano');
        const instrument = EDITOR_SURFACE_IDS.includes(mainInstrument)
            ? mainInstrument
            : (EDITOR_SURFACE_IDS.includes(editorInstrument) ? editorInstrument : 'piano');
        editorInstrument = instrument;
        if(VoicingStore){
            VoicingStore.ensure(project);
            seq.forEach(item => VoicingStore.hydrateChord(project,item,instrument));
        }
        const chordIndex = Math.max(0, Math.min(seq.length - 1, Number(els.chordSelect?.value) || 0));
        return {
            sectionKey,
            sectionName: sectionNames[sectionKey] || sectionKey,
            chordIndex,
            instrument,
            bpm:project.bpm,
            style:project.style || 'funk',
            drumsEnabled:project.drumsEnabled !== false,
            viewMode: project.viewMode || 'piano',
            fretMode: project.fretMode || 'guitar',
            sectionOptions: editorSectionOptions(),
            sections: safeClone(project.sections || {}),
            currentChord: safeClone(seq[chordIndex] || null),
            voicingLibrary:safeClone(project.voicingLibrary || {}),
            bassLines:safeClone(project.bassLines || {}),
            leadLines:safeClone(project.leadLines || {}),
            drumPatterns:safeClone(project.drumPatterns || {})
        };
    }
    function normalizeMidiList(list){
        return Array.isArray(list)
            ? list.map(Number).filter(Number.isFinite).map(n => Math.round(n))
            : [];
    }
    function normalizeEditorPayload(payload={}){
        const sectionKey = String(payload.sectionKey || els.sectionSelect?.value || 'intro');
        const seq = Array.isArray(project.sections?.[sectionKey]) ? project.sections[sectionKey] : null;
        const chordIndex = Math.max(0, Math.min(Math.max(0,(seq?.length || 1)-1), Number(payload.chordIndex) || 0));
        const instrument = String(payload.instrument || editorInstrument || 'piano');
        const profile = StringInstruments?.profile?.(instrument) || null;
        const expectedStrings = profile?.strings?.length || 0;
        const exactFrets = Array.isArray(payload.exactFrets) && expectedStrings
            ? payload.exactFrets.slice(0,expectedStrings).map(v => v === null || String(v).toUpperCase() === 'X' ? null : clamp(Number(v)||0,0,profile.maxFret || 24))
            : null;
        const voicings = payload.voicings && typeof payload.voicings === 'object' ? safeClone(payload.voicings) : null;
        const piano = voicings?.piano || null;
        return {
            sectionKey,
            seq,
            chordIndex,
            name: String(payload.name || 'Acorde').trim() || 'Acorde',
            bass: String(payload.bass || '').trim(),
            notes: String(payload.notes || '').trim(),
            bars: clamp(Number(payload.bars) || 1, 1, 16),
            instrument,
            profile,
            exactMidis: normalizeMidiList(payload.exactMidis),
            exactFrets,
            exactStrings: Array.isArray(payload.exactStrings) ? safeClone(payload.exactStrings) : null,
            capo: profile?.allowCapo ? clamp(Number(payload.capo)||0,0,profile.capoMax || 12) : 0,
            barre: payload.barre && typeof payload.barre === 'object' ? safeClone(payload.barre) : null,
            rootPitchClass: Number.isFinite(Number(payload.rootPitchClass)) ? ((Number(payload.rootPitchClass)%12)+12)%12 : null,
            voicings,
            leftHandMidis: normalizeMidiList(payload.leftHandMidis),
            rightHandMidis: normalizeMidiList(payload.rightHandMidis),
            pianoMode: String(payload.pianoMode || piano?.leftHand?.mode || 'together'),
            pianoPattern: Array.isArray(payload.pianoPattern) ? payload.pianoPattern.map(String) : (Array.isArray(piano?.leftHand?.pattern) ? piano.leftHand.pattern.map(String) : []),
            surfaceMode: String(payload.surfaceMode || ''),
            noteDuration: Number.isFinite(Number(payload.noteDuration)) ? Math.max(.06,Number(payload.noteDuration)) : null
        };
    }
    function validateEditorPayload(payload={}){
        const data = normalizeEditorPayload(payload);
        if(!data.seq) return { ok:false, message:'La sección seleccionada no existe.', data };
        const exactMode = !!data.profile && data.exactMidis.length > 0;
        const exactMinimum = data.surfaceMode === 'lead-line' ? 1 : (data.profile?.minSounding || 1);
        if(exactMode && data.exactMidis.length < exactMinimum){
            return { ok:false, message:`La digitación de ${data.profile.label.toLowerCase()} necesita al menos ${exactMinimum} cuerda(s) sonora(s).`, data };
        }
        if(data.instrument === 'piano'){
            const left = data.leftHandMidis.length ? data.leftHandMidis : parseNotes(data.bass);
            const right = data.rightHandMidis.length ? data.rightHandMidis : parseNotes(data.notes);
            if(!left.length) return { ok:false, message:'No pude leer los bajos de la mano izquierda.', data };
            if(!right.length) return { ok:false, message:'No pude leer las notas de la mano derecha.', data };
            return { ok:true, data };
        }
        if(!exactMode && noteToMidi(data.bass) === null){
            return { ok:false, message:'No pude leer la nota de bajo. Usa un formato como C2, F#2 o Sib2.', data };
        }
        if(!exactMode && parseNotes(data.notes).length === 0){
            return { ok:false, message:'No pude leer las notas del acorde. Usa un formato como C3 E3 G3.', data };
        }
        return { ok:true, data };
    }
    function selectEditorSection(sectionKey){
        const key = String(sectionKey || '');
        if(!project.sections?.[key]) return { ok:false, message:'La sección seleccionada no existe.' };
        if(els.sectionSelect){
            const changed = els.sectionSelect.value !== key;
            els.sectionSelect.value = key;
            if(changed) els.sectionSelect.dispatchEvent(new Event('change', { bubbles:true }));
            else {
                chordIdx = 0;
                stepInChord = 0;
                renderChordSelect();
                loadEditorFromSelected();
                renderSectionList();
                updateSectionNoteMap();
                updateFretboardMap();
            }
        }
        return Object.assign({ ok:true }, getEditorState());
    }
    function selectEditorChord(sectionKey, index){
        const sectionResult = selectEditorSection(sectionKey);
        if(sectionResult?.ok === false) return sectionResult;
        const seq = project.sections?.[sectionKey] || [];
        if(!seq.length) return { ok:false, message:'La sección no tiene acordes.' };
        const idx = Math.max(0, Math.min(seq.length - 1, Number(index) || 0));
        if(els.chordSelect){
            els.chordSelect.value = String(idx);
            els.chordSelect.dispatchEvent(new Event('change', { bubbles:true }));
        }
        chordIdx = idx;
        return Object.assign({ ok:true }, getEditorState());
    }
    function deactivateEditorSurface(){
        const result = InstrumentSurfaceManager.endEditorSession({restore:true});
        // v0.8.0: restaurar instrumento original del Main al cerrar el Editor
        if(_mainInstrumentBeforeEditor !== null){
            project.instrument = _mainInstrumentBeforeEditor;
            if(els.instrumentSelect) els.instrumentSelect.value = _mainInstrumentBeforeEditor;
            _mainInstrumentBeforeEditor = null;
        }
        const mainInstrument = project.instrument || 'piano';
        if(['guitar','ukulele','bass','lead'].includes(mainInstrument)){
            project.fretMode = mainInstrument === 'lead' ? 'guitar' : mainInstrument;
            if(els.fretModeSelect) els.fretModeSelect.value = project.fretMode;
            buildFretboard();
            setViewMode('fretboard');
            updateFretboardMap();
            renderMainStringSurface(chordIdx,true);
        }else if(mainInstrument === 'drums'){
            setViewMode('fretboard');
            renderMainDrumSurface(true);
        }else if(mainInstrument === 'piano'){
            project.viewMode = 'piano';
            const pianoBox = document.getElementById('pianoContainer');
            if(pianoBox) pianoBox.style.display = 'flex';
            if(els.fretboardContainer) els.fretboardContainer.style.display = 'none';
            if(els.viewToggleBtn) els.viewToggleBtn.textContent = 'Vista diapasón';
        }
        return {
            ok:true,
            instrument:editorInstrument,
            mainInstrument,
            surface:result
        };
    }
    function clearExactVoicingMap(){
        return deactivateEditorSurface();
    }
    function installEditorSurfaceCleanup(){
        if(window.__s936EditorSurfaceCleanupBound) return;
        window.__s936EditorSurfaceCleanupBound = true;
        els.instrumentSelect?.addEventListener('change', () => {
            try { InstrumentSurfaceManager.endEditorSession({restore:false}); } catch(_) {}
        }, true);
        document.addEventListener('click', event => {
            const button = event.target?.closest?.('button');
            if(!button) return;
            const label = String(button.textContent || '').trim().toUpperCase();
            if(button.closest('#s936SuitePro') && (label === 'CERRAR' || label === 'CLOSE')){
                setTimeout(deactivateEditorSurface, 0);
                return;
            }
            if(button.closest('.workspace-tabs,.workspace-nav,.v25-workspace-nav') && label !== 'SUITE PRO'){
                setTimeout(deactivateEditorSurface, 0);
            }
        }, true);
        window.addEventListener('pagehide', deactivateEditorSurface);
    }
    installEditorSurfaceCleanup();
    function syncMainInstrumentFromEditor(value){
        if(!['piano','guitar','ukulele','bass','lead','drums'].includes(value)) return;
        project.instrument = value;
        if(els.instrumentSelect) els.instrumentSelect.value = value;
        if(['guitar','ukulele','bass','lead'].includes(value)){
            project.fretMode = value === 'lead' ? 'guitar' : value;
            if(els.fretModeSelect) els.fretModeSelect.value = project.fretMode;
        }
        saveProject(false);
    }
    function setEditorInstrument(instrument){
        const requested = canonicalInstrumentId(instrument);
        const value = EDITOR_SURFACE_IDS.includes(requested) ? requested : 'piano';
        // v0.8.0: Guardar instrumento original del Main la primera vez que se abre el Editor.
        // Al cerrar el Editor, deactivateEditorSurface lo restaura.
        if(_mainInstrumentBeforeEditor === null){
            _mainInstrumentBeforeEditor = project.instrument || 'piano';
        }
        if(!InstrumentSurfaceManager.getState().active){
            InstrumentSurfaceManager.beginEditorSession(value);
        }
        mountEditorInstrumentSurface(value);
        // Sincronizar el Main con el instrumento del Editor
        // mountEditorInstrumentSurface ya controla la superficie — solo actualizamos
        // project.instrument y el dropdown para que el groove suene en el instrumento correcto.
        if(value !== 'drums'){
            project.instrument = value;
            if(els.instrumentSelect && els.instrumentSelect.value !== value){
                els.instrumentSelect.value = value;
            }
            project.fretMode = value === 'ukulele' ? 'ukulele' : value === 'bass' ? 'bass' : value === 'lead' ? 'guitar' : 'guitar';
            if(els.fretModeSelect) els.fretModeSelect.value = project.fretMode;
        }
        return Object.assign({
            ok:true,
            instrument:value,
            mainInstrument:project.instrument || 'piano',
            isolated:false,
            synced:true
        }, getEditorState());
    }
    function showEditorChordVisual(payload={}){
        const data = normalizeEditorPayload(payload);
        // v0.7.3.12: No pisar la superficie si el editor ya está en piano o drums.
        // data.instrument viene de project.instrument (Main) y sobreescribía el Editor.
        const ismState = InstrumentSurfaceManager.getState();
        const editorLocked = ismState.active &&
            (ismState.editorInstrument === 'piano' || ismState.editorInstrument === 'drums');
        if(!editorLocked){
            mountEditorInstrumentSurface(data.instrument);
        }
        const seqItem = data.seq?.[data.chordIndex] || {};
        const item = {
            name: data.name || seqItem.name || 'Acorde',
            bass: data.bass || seqItem.bass || 'C2',
            notes: data.notes || seqItem.notes || 'C3 E3 G3',
            bars: data.bars || seqItem.bars || 1
        };

        const hasExactStringNotes = !!data.profile && data.exactMidis.length > 0 && Array.isArray(data.exactFrets);
        const isEmptySequencerSurface = (data.surfaceMode === 'bass-line' || data.surfaceMode === 'lead-line')
            && !!data.profile
            && Array.isArray(data.exactFrets);
        // v0.7.5.7: al abrir Editor en instrumento de cuerda sin digitación exacta,
        // renderizar igual para mostrar los charts de sección desde el primer momento.
        const isInitialStringMount = !!data.profile && !!stringInstrumentId(data.instrument) && Array.isArray(data.seq) && data.seq.length > 0;
        const useStringSurface = hasExactStringNotes || isEmptySequencerSurface || isInitialStringMount;
        if(data.profile && Array.isArray(data.seq)){
            data.seqVoicings = mainStringSeqVoicingPreviews(data.seq,data.instrument);
            if(data.voicings?.[data.instrument]) data.seqVoicings[data.chordIndex] = data.voicings[data.instrument];
            else if(Array.isArray(data.exactFrets)) data.seqVoicings[data.chordIndex] = {
                frets:safeClone(data.exactFrets),
                fingers:Array.isArray(data.exactStrings) ? data.exactStrings.map(string => string?.finger || '') : [],
                capo:data.capo || 0,
                barre:data.barre || null,
                midis:safeClone(data.exactMidis || [])
            };
        }
        const leftMidis = data.instrument === 'piano'
            ? (data.leftHandMidis.length ? data.leftHandMidis : parseNotes(item.bass))
            : [];
        const rightMidis = data.instrument === 'piano'
            ? (data.rightHandMidis.length ? data.rightHandMidis : parseNotes(item.notes))
            : [];
        const notes = hasExactStringNotes
            ? data.exactMidis
            : data.instrument === 'piano'
                ? rightMidis
                : parseNotes(item.notes);
        const bass = hasExactStringNotes
            ? Math.min(...data.exactMidis)
            : data.instrument === 'piano'
                ? (leftMidis.length ? Math.min(...leftMidis) : null)
                : noteToMidi(item.bass);

        if(!notes.length && !leftMidis.length && !isEmptySequencerSurface){
            return { ok:false, message:'No pude visualizar las notas del acorde.' };
        }

        clearKeys();
        leftMidis.forEach(midi => {
            if(keyMap[midi]) keyMap[midi].classList.add('active-bass');
        });
        if(Number.isFinite(bass) && keyMap[bass]) keyMap[bass].classList.add('active-bass');
        notes.forEach(midi => {
            if(keyMap[midi]) keyMap[midi].classList.add('active-chord');
        });

        if(!useStringSurface){
            try{
                Fretboard.updateFretboardMap({
                    fretCells,
                    item,
                    parseNotes,
                    noteToMidi,
                    project
                });
            }catch(error){
                console.warn('Editor Pro: no se pudo actualizar el diapasón.', error);
            }
        }

        if(useStringSurface && StringSurface && StringInstruments){
            InstrumentSurfaceManager.renderEditorStrings({
                instrument:data.instrument,
                data,
                profiles:StringInstruments.profiles,
                sectionNames,
                onCellPlay:event => {
                    const midi = Number(event?.midi);
                    if(!Number.isFinite(midi)) return;
                    const gesture = String(event?.gesture || 'tap');
                    resumeAudio();
                    withEditorPreviewInstrument(data.instrument, () => {
                        playNote(
                            midi,
                            gesture === 'slide' ? .18 : gesture === 'bend' ? .16 : (data.instrument === 'bass' ? .34 : .24),
                            data.instrument === 'bass' ? .72 : .64,
                            data.instrument === 'bass' ? 'sine' : 'triangle',
                            audioCtx.currentTime
                        );
                    });
                    const cls = gesture === 'slide' ? 's936-slide-hit' : gesture === 'bend' ? 's936-bend-hit' : 's936-live-hit';
                    if(Number.isFinite(Number(event?.stringIndex)) && Number.isFinite(Number(event?.physicalFret))){
                        StringSurface?.flashPosition?.(Number(event.stringIndex),Number(event.physicalFret),cls,220);
                    }
                },
                renderer:StringSurface
            });
        } else if(data.instrument !== 'piano' && els.fretboardContainer){
            buildFretboard();
            updateFretboardMap();
        }

        if(els.chordLabel) els.chordLabel.textContent = item.name || 'Acorde';
        return {
            ok:true,
            item:safeClone(item),
            notes:safeClone(notes),
            bass,
            exact:hasExactStringNotes,
            emptySequencerSurface:isEmptySequencerSurface
        };
    }
    function exactStringEventsFromEditorData(data){
        return (Array.isArray(data?.exactStrings) ? data.exactStrings : [])
            .filter(string => string && !string.muted && Number.isFinite(Number(string.midi)) && Number.isFinite(Number(string.physicalFret)) && Number.isFinite(Number(string.index)))
            .map(string => ({
                stringIndex:Number(string.index),
                physicalFret:Number(string.physicalFret),
                midi:Number(string.midi),
                note:string.note || midiToNote(Number(string.midi))
            }));
    }
    function previewEditorChord(payload={}){
        const result = validateEditorPayload(payload);
        if(!result.ok) return result;
        const data = result.data;
        mountEditorInstrumentSurface(data.instrument);
        resumeAudio();
        return withEditorPreviewInstrument(data.instrument, () => {
        const stringExact = !!data.profile && data.exactMidis.length > 0;
        const when = audioCtx.currentTime + .02;
        if(data.instrument === 'piano') clearKeys();
        else showEditorChordVisual(data);

        if(stringExact){
            const notes = data.exactMidis;
            const events = exactStringEventsFromEditorData(data);
            const strum = currentInstrument().strum || .018;
            const exactDuration = data.noteDuration || (data.instrument === 'bass' ? .32 : .22);
            notes.forEach((midi,index) => {
                const type = data.instrument === 'bass' ? 'sine' : 'triangle';
                playNote(midi,exactDuration,.82,type,when + index * strum);
                setVisual(when + index * strum, () => {
                    const event = events[index];
                    if(event) StringSurface?.flashStringEvents?.([event],'s936-strum-hit',230);
                    else StringSurface?.flashMidis?.([midi],'s936-strum-hit',230);
                });
            });
            if(events.length) StringSurface?.strumPositions?.(events,Math.max(22,Math.round(strum * 1000)),230);
            else StringSurface?.strumMidis?.(notes,Math.max(22,Math.round(strum * 1000)),230);
            setTimeout(() => showEditorChordVisual(data), Math.max(420,Math.ceil(exactDuration*1000)+120));
            return {
                ok:true,
                message:`Digitación exacta de ${data.profile.label.toLowerCase()} escuchada y mostrada en el instrumento principal.`
            };
        }

        if(data.instrument === 'piano'){
            const piano = data.voicings?.piano || {
                leftHand:{
                    notes:data.pianoPattern.length ? data.pianoPattern : [data.bass],
                    mode:data.pianoMode || 'together',
                    pattern:data.pianoPattern
                },
                rightHand:{notes:data.notes.split(/\s+/).filter(Boolean)}
            };
            const fallbackLeft = data.leftHandMidis.length
                ? data.leftHandMidis
                : parseNotes((piano.leftHand?.notes || []).join(' ') || data.bass);
            const fallbackRight = data.rightHandMidis.length
                ? data.rightHandMidis
                : parseNotes((piano.rightHand?.notes || []).join(' ') || data.notes);
            const plan = PianoEditorPro?.previewPlan
                ? PianoEditorPro.previewPlan(piano,{bpm:project.bpm})
                : {
                    mode:data.pianoMode || 'together',
                    pulseSeconds:60 / (Number(project.bpm) || 95) / 2,
                    durationSeconds:.8,
                    leftEvents:[{at:0,notes:(piano.leftHand?.notes || [])}],
                    rightNotes:(piano.rightHand?.notes || [])
                };

            const right = parseNotes(plan.rightNotes.join(' '));
            const rightMidis = right.length ? right : fallbackRight;
            const bassFlashMs = Math.max(130, Math.round(plan.pulseSeconds * 780));

            plan.leftEvents.forEach(event => {
                const midis = parseNotes((event.notes || []).join(' '));
                if(!midis.length) return;
                const eventTime = when + Math.max(0,Number(event.at) || 0);
                midis.forEach(midi => {
                    playNote(midi,Math.max(.22,plan.pulseSeconds * .82),.76,'sine',eventTime);
                });
                setVisual(eventTime,() => flashKeys(midis,'active-bass',bassFlashMs));
            });

            if(!plan.leftEvents.length && fallbackLeft.length){
                fallbackLeft.forEach(midi => playNote(midi,.32,.76,'sine',when));
                setVisual(when,() => flashKeys(fallbackLeft,'active-bass',bassFlashMs));
            }

            if(rightMidis.length){
                strumChord(
                    rightMidis,
                    Math.max(.30,Math.min(.85,plan.durationSeconds * .72)),
                    .90,
                    when + .03,
                    'active-chord'
                );
            }

            const restoreDelay = Math.ceil((plan.durationSeconds + .28) * 1000);
            setTimeout(() => showEditorChordVisual(data), restoreDelay);
            return {
                ok:true,
                message:plan.mode === 'together'
                    ? 'Bajos simultáneos de mano izquierda y acorde completo de mano derecha escuchados.'
                    : plan.mode === 'alternate'
                        ? 'Bajos alternados al tempo y acorde completo de mano derecha escuchados.'
                        : 'Patrón de bajos al tempo y acorde completo de mano derecha escuchados.'
            };
        }

        const bass = noteToMidi(data.bass);
        const notes = parseNotes(data.notes);
        if(bass !== null) playNote(bass,.30,.75,'sine',when);
        strumChord(notes,.18,.90,when + .05,'active-chord');
        setTimeout(() => showEditorChordVisual(data), 820);
        return { ok:true, message:'Acorde escuchado y mostrado en el instrumento principal.' };
        });
    }
    function refreshEditorAfterMutation(sectionKey, index){
        selectEditorSection(sectionKey);
        renderChordSelect();
        const seq = project.sections?.[sectionKey] || [];
        const idx = Math.max(0, Math.min(seq.length - 1, Number(index) || 0));
        if(els.chordSelect) els.chordSelect.value = String(idx);
        chordIdx = idx;
        stepInChord = 0;
        loadEditorFromSelected();
        renderSectionList();
        updateSectionNoteMap();
        updateFretboardMap();
        saveProject(false);

        const item = seq[idx];
        if(item){
            const instrument = project.instrument || 'piano';
            const voicing = item.voicings?.[instrument];
            const exactFrets = Array.isArray(voicing?.frets) ? voicing.frets : null;
            const payload = Object.assign(
                { sectionKey, chordIndex:idx, instrument },
                item
            );
            if(exactFrets){
                Object.assign(payload,{
                    exactFrets,
                    exactMidis:Array.isArray(voicing.midis) ? voicing.midis : [],
                    exactStrings:Array.isArray(voicing.strings) ? voicing.strings : null,
                    capo:voicing.capo || 0,
                    barre:voicing.barre || null
                });
            }
            if(instrument === 'piano' && voicing){
                payload.voicings = {piano:voicing};
                payload.leftHandMidis = parseNotes((voicing.leftHand?.notes || []).join(' '));
                payload.rightHandMidis = parseNotes((voicing.rightHand?.notes || []).join(' '));
                payload.pianoMode = voicing.leftHand?.mode || 'together';
                payload.pianoPattern = voicing.leftHand?.pattern || [];
            }
            showEditorChordVisual(payload);
        }
        return idx;
    }
    function mergeVoicings(previous, incoming){
        const current = previous && typeof previous === 'object' ? safeClone(previous) : {};
        const next = incoming && typeof incoming === 'object' ? safeClone(incoming) : {};
        return Object.assign(current, next);
    }
    function applyEditorChord(payload={}){
        const result = validateEditorPayload(payload);
        if(!result.ok) return result;
        const data = result.data;
        const previous = data.seq[data.chordIndex] || {};
        const next = Object.assign(
            {},
            previous,
            chord(data.name, data.bass, data.notes, data.bars)
        );
        if(data.voicings){
            next.voicings = mergeVoicings(previous.voicings, data.voicings);
            const instrumentVoicing = next.voicings[data.instrument];
            if(instrumentVoicing && data.exactMidis.length){
                instrumentVoicing.midis = safeClone(data.exactMidis);
                instrumentVoicing.notes = data.notes;
                instrumentVoicing.bass = data.bass;
                instrumentVoicing.strings = safeClone(data.exactStrings || []);
            }
            if(VoicingStore && instrumentVoicing){
                VoicingStore.remember(project,data.instrument,data.name,instrumentVoicing);
            }
        }
        data.seq[data.chordIndex] = next;
        saveProject(false);
        const idx = refreshEditorAfterMutation(data.sectionKey, data.chordIndex);
        return {
            ok:true,
            message:'Acorde y voicing aplicados y guardados en la canción actual.',
            chordIndex:idx,
            state:getEditorState()
        };
    }
    function addEditorChord(payload={}){
        const result = validateEditorPayload(payload);
        if(!result.ok) return result;
        const data = result.data;
        const item = Object.assign(
            {},
            chord(data.name, data.bass, data.notes, data.bars),
            { name:data.name }
        );
        if(data.voicings){
            item.voicings = mergeVoicings(null, data.voicings);
            const instrumentVoicing = item.voicings[data.instrument];
            if(instrumentVoicing && data.exactMidis.length){
                instrumentVoicing.midis = safeClone(data.exactMidis);
                instrumentVoicing.notes = data.notes;
                instrumentVoicing.bass = data.bass;
                instrumentVoicing.strings = safeClone(data.exactStrings || []);
            }
            if(VoicingStore && instrumentVoicing){
                VoicingStore.remember(project,data.instrument,data.name,instrumentVoicing);
            }
        } else if(VoicingStore){
            const remembered = VoicingStore.recall(project,data.instrument,data.name);
            if(remembered){
                item.voicings = {[data.instrument]:remembered};
            }
        }
        const newIndex = Math.min(data.seq.length, data.chordIndex + 1);
        data.seq.splice(newIndex, 0, item);
        saveProject(false);
        const idx = refreshEditorAfterMutation(data.sectionKey, newIndex);
        return {
            ok:true,
            message:'Acorde agregado con su voicing y guardado.',
            chordIndex:idx,
            state:getEditorState()
        };
    }
    function duplicateEditorChord(sectionKey, index){
        const seq = project.sections?.[sectionKey];
        if(!Array.isArray(seq) || !seq.length) return { ok:false, message:'No hay acorde para duplicar.' };
        const idx = Math.max(0, Math.min(seq.length - 1, Number(index) || 0));
        const copy = safeClone(seq[idx]);
        const newIndex = idx + 1;
        seq.splice(newIndex, 0, copy);
        if(VoicingStore){
            ['piano','guitar','ukulele','bass'].forEach(instrument => {
                if(copy?.voicings?.[instrument]){
                    VoicingStore.remember(project,instrument,copy.name,copy.voicings[instrument]);
                }
            });
        }
        saveProject(false);
        const selected = refreshEditorAfterMutation(sectionKey, newIndex);
        return { ok:true, message:'Acorde duplicado exactamente con todos sus voicings.', chordIndex:selected, state:getEditorState() };
    }
    function deleteEditorChord(sectionKey, index){
        const seq = project.sections?.[sectionKey];
        if(!Array.isArray(seq) || !seq.length) return { ok:false, message:'No hay acorde para borrar.' };
        if(seq.length <= 1) return { ok:false, message:'La sección debe conservar al menos un acorde.' };
        const idx = Math.max(0, Math.min(seq.length - 1, Number(index) || 0));
        seq.splice(idx, 1);
        const selected = refreshEditorAfterMutation(sectionKey, Math.max(0, idx - 1));
        return { ok:true, message:'Acorde borrado.', chordIndex:selected, state:getEditorState() };
    }

    function saveBassLine(sectionKey,line){
        const key = String(sectionKey || els.sectionSelect?.value || 'intro');
        if(!project.sections?.[key]) return {ok:false,message:'La sección seleccionada no existe.'};
        project.bassLines = project.bassLines && typeof project.bassLines === 'object' ? project.bassLines : {};
        let normalized = safeClone(line || {});
        if(typeof SongModel.normalizeBassLines === 'function'){
            normalized = SongModel.normalizeBassLines({[key]:normalized},project.sections)?.[key] || normalized;
        }
        normalized.bpm = project.bpm;
        project.bassLines[key] = normalized;
        saveProject(false);
        return {ok:true,message:'Línea de bajo guardada en la canción actual.',line:safeClone(normalized)};
    }

    function saveLeadLine(sectionKey,line){
        const key = String(sectionKey || els.sectionSelect?.value || 'intro');
        if(!project.sections?.[key]) return {ok:false,message:'La sección seleccionada no existe.'};
        project.leadLines = project.leadLines && typeof project.leadLines === 'object' ? project.leadLines : {};
        const normalized = safeClone(line || {});
        normalized.bpm = project.bpm;
        normalized.updatedAt = new Date().toISOString();
        project.leadLines[key] = normalized;
        saveProject(false);
        return {ok:true,message:'Solo de guitarra guardado en la canción actual.',line:safeClone(normalized)};
    }

    function setDrumsEnabled(enabled){
        project.drumsEnabled = enabled !== false;
        saveProject(false);
        if(project.instrument === 'drums') renderMainDrumSurface(true);
        return {ok:true,drumsEnabled:project.drumsEnabled,state:getEditorState()};
    }

    function saveDrumPattern(sectionKey,pattern){
        const key = String(sectionKey || els.sectionSelect?.value || 'intro');
        if(!project.sections?.[key]) return {ok:false,message:'La sección seleccionada no existe.'};
        project.drumPatterns = project.drumPatterns && typeof project.drumPatterns === 'object' ? project.drumPatterns : {};
        const normalized = DrumPatterns?.normalize
            ? DrumPatterns.normalize(pattern || {}, {sectionKey:key, bpm:project.bpm, songStyle:project.style || 'funk'})
            : safeClone(pattern || {});
        normalized.bpm = project.bpm;
        normalized.sectionKey = key;
        normalized.updatedAt = new Date().toISOString();
        project.drumsEnabled = normalized.enabled !== false;
        project.drumPatterns[key] = normalized;
        saveProject(false);
        if(project.instrument === 'drums') renderMainDrumSurface(true);
        return {ok:true,message:'Patrón de batería guardado en la canción actual.',pattern:safeClone(normalized),state:getEditorState()};
    }

    window.Studio936DebugEditorIsolation = function(){
        const surface = InstrumentSurfaceManager.getState();
        return {
            version:'v0.7.0-surface-manager',
            editorInstrument,
            mainInstrument:project.instrument || 'piano',
            mainSelector:els.instrumentSelect?.value || '',
            sessionActive:surface.active,
            pianoDisplay:surface.pianoDisplay,
            fretboardDisplay:surface.fretboardDisplay,
            exactSurfaceExists:surface.exactSurfaceExists,
            surfaceOwner:surface.owner,
            surfaceManager:surface
        };
    };

    window.Studio936AppBridge = {
        version: 'suite-pro-bridge-v0.7.3.24-cambio247-savelocal-library-sync',
        getSongSnapshot,
        getFullSongText,
        getProjectJson,
        // Cambio 165: la Librería nueva necesita leer la composición actual
        // (para "Guardar composición actual") y cargar una guardada (para
        // "Abrir") sin reinventar nada — reutiliza getProjectJson/setProject
        // que ya existen y ya están probados.
        getProjectSnapshot: () => { try { return JSON.parse(getProjectJson()); } catch(_) { return null; } },
        loadProject: (projectObj) => {
            try {
                project = modelNormalizeProject(projectObj, styles, instruments);
                renderAll();
                saveProject(false);
                return true;
            } catch(e) { console.warn('loadProject error:', e); return false; }
        },
        getEditorState,
        setInstrument,
        setKey,
        setBPM: (v) => { setBPM(v); return true; },
        getBpm,
        getStyle,
        isMainPlaying,
        getChannelMix,
        setChannelMute,
        setChannelVolume,
        setChannelPan,
        playLiveNote,
        stopLiveNote,
        scheduleDrumStep,
        saveBassLine,
        saveLeadLine,
        saveDrumPattern,
        setDrumsEnabled,
        selectEditorSection,
        selectEditorChord,
        setEditorInstrument,
        captureEditorSurfaceSession,
        mountEditorInstrumentSurface,
        mountEditorDrumSurface,
        flashEditorDrumLane,
        selectEditorDrumLane,
        triggerEditorDrumLane,
        deactivateEditorSurface,
        getInstrumentSurfaceState:()=>InstrumentSurfaceManager.getState(),
        renderMainStringSurface:()=>renderMainStringSurface(chordIdx,true),
        renderMainDrumSurface:()=>{ project.instrument='drums'; if(els.instrumentSelect) els.instrumentSelect.value='drums'; scheduleMainDrumSurface(); return true; },
        showEditorChordVisual,
        previewEditorChord,
        applyEditorChord,
        addEditorChord,
        duplicateEditorChord,
        deleteEditorChord,
        getArrangement: () => safeClone(safe(() => arrangementParts(), [])),
        startGroove: () => { startStop(); return true; },
        playFullSong: () => { startFullSong(); return true; },
        stopPlayback: () => { stopPlayback(); return true; },
        openEditor: () => clickWorkspacePanel('editor'),
        openStructure: () => clickWorkspacePanel('structure'),
        openExport: () => clickWorkspacePanel('export'),
        openLyrics: () => { openLyrics(); return true; },
        openHelp: () => { els.helpBtn?.click(); return true; },
        // Cambio 247: "Guardar local" ahora también actualiza (o crea) la
        // composición en la Librería, y de ahí empuja a la nube (D1) si hay
        // sesión activa — usa saveOrUpdateCurrent(), el gancho que ya se
        // había dejado listo en Cambio 201 para justo este cable. Se dispara
        // SOLO en el clic explícito de "Guardar local", nunca en los
        // autoguardados silenciosos de saveProject(false), para no llamar a
        // la API en cada tecla. Si la Librería no cargó o falla, el guardado
        // local sigue funcionando igual (no se rompe nada).
        saveLocal: () => {
            saveProject(true);
            try {
                const snapshot = JSON.parse(getProjectJson());
                window.Studio936Library?.saveOrUpdateCurrent?.(snapshot);
            } catch(e) { console.warn('Cambio 247 · saveOrUpdateCurrent error:', e); }
            return true;
        },
        newSong: (titleOverride, authorOverride) => {
            try {
                const blank = {
                    isNewSong: true,
                    title: titleOverride || 'Nueva canción',
                    author: authorOverride || '',
                    bpm: 95,
                    style: 'pop',
                    instrument: 'piano',
                    grooveVol: 7,
                    viewMode: 'piano',
                    sections: { intro:[], verse:[], verse1:[], verse2:[], verse3:[], prechorus:[], chorus:[], interlude:[], solo:[], bridge:[], outro:[] },
                    lyrics: { intro:'', verse:'', verse1:'', verse2:'', verse3:'', prechorus:'', chorus:'', interlude:'', solo:'', bridge:'', outro:'' },
                    sectionSolos: {},
                    arrangement: []
                };
                // Guardar plantilla en sessionStorage ANTES de limpiar cachés
                if(titleOverride) sessionStorage.setItem('s936_new_title', titleOverride);
                if(authorOverride) sessionStorage.setItem('s936_new_author', authorOverride);
                localStorage.setItem('studio936ComposerV25SongStructure', JSON.stringify(blank));
                // Limpiar TODOS los cachés s936_ del Chart y Structure,
                // pero NUNCA la librería del usuario (s936_library_v2)
                Object.keys(localStorage)
                    .filter(k => k.startsWith('s936_') && !k.startsWith('s936_library'))
                    .forEach(k => localStorage.removeItem(k));
                setTimeout(() => location.reload(), 80);
                return true;
            } catch(e) { console.warn('newSong error:', e); return false; }
        },
        exportTxt: () => { exportTxt(); return true; },
        exportJson: () => { exportJson(); return true; },
        exportMidi: () => { exportMidi(); return true; },
        copyFullSongText: async () => {
            const text = getFullSongText();
            if(navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
            else throw new Error('Clipboard API no disponible');
            flashStatus('Canción completa copiada desde Suite Pro.');
            return true;
        },
        flashStatus: msg => { flashStatus(msg); return true; }
    };
}
installStudio936AppBridge();

// Cambio 97: badge de versión visible para app.js/Bridge — hasta ahora era
// el único de los módulos con lógica activa sin ningún indicador en pantalla,
// lo que causó dudas sobre si un despliegue realmente había tomado efecto
// (ver Cambio 96). Bump este texto cada vez que cambie la versión del bridge.
// Discreto, esquina inferior izquierda, no interfiere con ningún control.
function installStudio936BridgeBadge(){
    try {
        if(document.getElementById('s936BridgeVersionBadge')) return;
        const badge = document.createElement('div');
        badge.id = 's936BridgeVersionBadge';
        badge.textContent = 'BRIDGE CAMBIO 96';
        badge.title = window.Studio936AppBridge?.version || '';
        Object.assign(badge.style, {
            position: 'fixed',
            left: '8px',
            bottom: '8px',
            zIndex: '9999',
            padding: '2px 7px',
            borderRadius: '999px',
            border: '1px solid rgba(0,255,204,.35)',
            background: 'rgba(10,14,20,.85)',
            color: '#7dffe0',
            fontSize: '.56rem',
            fontWeight: '900',
            letterSpacing: '.3px',
            textTransform: 'uppercase',
            fontFamily: 'inherit',
            pointerEvents: 'none',
            userSelect: 'none'
        });
        (document.body || document.documentElement).appendChild(badge);
    } catch(error) {
        console.warn('No se pudo montar el badge del bridge:', error);
    }
}
if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', installStudio936BridgeBadge);
} else {
    installStudio936BridgeBadge();
}

buildPiano(); buildFretboard(); buildStepGrid(); bind(); renderAll();
bindFinalMidiExport();
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bindFinalMidiExport);
setTimeout(bindFinalMidiExport,0);
setTimeout(bindFinalMidiExport,500);
setTimeout(bindFinalMidiExport,1500);

/*
Post-MIDI Recovery App Inventory
- Remaining responsibilities in app.js:
  - bootstrap/init and startup wiring
  - project state and persistence orchestration
  - DOM element map and shared UI/state helpers
  - UI bindings for controls, toggles, and export/import actions
  - editor wrappers/glue (section, chord, solo, lyrics)
  - arrangement glue integration
  - transport/playback integration still inline or partially wrapped
  - legacy enhancement blocks
  - Suite Pro integration code
  - export wrappers (TXT/JSON/MIDI handoff + helper composition)
- Candidate next modules:
  - suite-pro.js
  - legacy-enhancements.js
  - ui-bindings.js
  - app-bootstrap.js
  - transport phase 2
- Risk levels:
  - low: ui-bindings.js, app-bootstrap.js
  - medium: legacy-enhancements.js, suite-pro.js
  - high: transport phase 2
- Recommended next extraction:
  - ui-bindings.js (safest): largely event wiring and delegation boundaries are already present, so extraction can be done with minimal behavior risk and without touching MIDI, scheduler, or transport internals.
*/
})();

/* ---- Script block separator ---- */

// v16 extension: bilingual UI + touch-screen context-menu prevention + bilingual TXT export.
(() => {
    'use strict';
    if(window.Studio936I18n?.bindLanguage){
        window.Studio936I18n.bindLanguage({
            els: window.__studio936Els || null,
            project: () => window.__studio936Project || null,
            renderSectionList: window.renderSectionList || null,
            updateHeaderBadges: window.updateHeaderBadges || null,
            loadSoloForSection: window.loadSoloForSection || null
        });
    }
})();

/* ---- Script block separator ---- */

// v17 extension: labels for MIDI / fretboard / routing / tuning.
(() => {
    const LANG_KEY = 'pianoComposerUiLangV15';
    const es = { midi:'Exportar MIDI', viewFret:'Vista diapasón', viewPiano:'Vista piano', prod:'Producción / monitoreo', routing:'Ruteo audio', tuning:'Afinación maestra', custom:'Frecuencia personalizada A4', fretTitle:'Diapasón guitarra · vista de notas', fretHint:'Clic/toque para escuchar · 0-12 trastes', fretMode:'Diapasón', guitar:'Guitarra', bass:'Bajo', normal:'Normal estéreo', split:'Click L / Música R', help:'<div class="help-block wide v17-help"><h3>12. Exportar MIDI</h3><p><b>Exportar MIDI</b> crea un archivo <code>.mid</code> con pistas separadas para armonía/acordes, bajo y melodías/solos por sección. Puedes arrastrarlo a Reaper, FL Studio, Logic, GarageBand o Cakewalk y asignar instrumentos virtuales profesionales.</p><ul><li>La pista de acordes usa el groove del estilo activo.</li><li>La pista de bajo usa el patrón de bajo del estilo activo.</li><li>Las melodías/solos se exportan desde cada sección.</li><li>El MIDI incluye tempo, marcadores de sección y una nota de texto con autor, estilo y afinación A4.</li></ul><div class="help-note">El MIDI guarda notas, no el sonido del navegador.</div></div><div class="help-block v17-help"><h3>13. Diapasón guitarra</h3><p><b>Vista diapasón</b> cambia el teclado visual por un mástil de guitarra de 0 a 12 trastes. Verde = notas del acorde; magenta = bajo/raíz por octavas.</p></div><div class="help-block v17-help"><h3>14. Ruteo Flow 8 / monitoreo</h3><p><b>Click L / Música R</b> manda el metrónomo totalmente a la izquierda y los acordes/bajo/solo totalmente a la derecha.</p></div><div class="help-block v17-help"><h3>15. Afinación maestra</h3><p><b>A4</b> cambia la afinación del oscilador interno: 440 Hz estándar, 432 Hz experimental, 444 Hz o personalizada. En MIDI queda anotado como texto.</p></div>' };
    const en = { midi:'Export MIDI', viewFret:'Fretboard view', viewPiano:'Piano view', prod:'Production / monitoring', routing:'Audio routing', tuning:'Master tuning', custom:'Custom A4 frequency', fretTitle:'Guitar fretboard · note view', fretHint:'Click/touch to play · frets 0-12', fretMode:'Fretboard', guitar:'Guitar', bass:'Bass', normal:'Normal stereo', split:'Click L / Music R', help:'<div class="help-block wide v17-help"><h3>12. Export MIDI</h3><p><b>Export MIDI</b> creates a <code>.mid</code> file with separate tracks for harmony/chords, bass and section melodies/solos. You can drag it into Reaper, FL Studio, Logic, GarageBand or Cakewalk and assign high-quality virtual instruments.</p><ul><li>The chord track follows the active style groove.</li><li>The bass track follows the active style bass pattern.</li><li>Melodies/solos are exported from each section.</li><li>The MIDI includes tempo, section markers and a text note with author, style and A4 tuning.</li></ul><div class="help-note">MIDI stores notes, not the browser sound.</div></div><div class="help-block v17-help"><h3>13. Guitar fretboard</h3><p><b>Fretboard view</b> switches the visual keyboard to a 0-12 fret guitar neck. Green = chord tones; magenta = bass/root positions by octave.</p></div><div class="help-block v17-help"><h3>14. Flow 8 / monitoring routing</h3><p><b>Click L / Music R</b> sends the metronome hard left and chords/bass/solo hard right.</p></div><div class="help-block v17-help"><h3>15. Master tuning</h3><p><b>A4</b> changes the internal oscillator tuning: 440 Hz standard, 432 Hz experimental, 444 Hz or custom. MIDI includes it as a text note.</p></div>' };
    function lang(){ return (document.documentElement.lang || localStorage.getItem(LANG_KEY) || 'es').startsWith('en') ? 'en' : 'es'; }
    function T(){ return lang()==='en' ? en : es; }
    function $(id){ return document.getElementById(id); }
    function set(id,txt){ const e=$(id); if(e) e.textContent=txt; }
    function apply(){ const t=T(); set('midiBtn',t.midi); set('productionTitle',t.prod); set('routingLabel',t.routing); set('tuningLabel',t.tuning); set('customTuningLabel',t.custom); set('fretboardTitle',t.fretTitle); set('fretboardHint',t.fretHint); set('fretModeLabel',t.fretMode); const fm=$('fretModeSelect'); if(fm){ if(fm.options[0]) fm.options[0].textContent=t.guitar; if(fm.options[1]) fm.options[1].textContent=(t.ukulele||'Ukelele'); if(fm.options[2]) fm.options[2].textContent=t.bass; } const view=$('viewToggleBtn'); if(view){ view.textContent = /piano/i.test(view.textContent) || view.textContent.includes('piano') ? t.viewPiano : t.viewFret; } const routing=$('routingSelect'); if(routing){ const o=routing.options; if(o[0]) o[0].textContent=t.normal; if(o[1]) o[1].textContent=t.split; } const body=document.querySelector('#helpModal .help-body'); if(body && !body.querySelector('.v17-help')) body.insertAdjacentHTML('beforeend', t.help); }
    const reapply=()=>setTimeout(apply,140); ['langBtn','helpBtn','viewToggleBtn','routingSelect','tuningSelect'].forEach(id=>{ const e=$(id); if(e) ['click','change'].forEach(ev=>e.addEventListener(ev,reapply)); }); if(window.MutationObserver){ const help=$('helpModal'); if(help) new MutationObserver(reapply).observe(help,{attributes:true,childList:true,subtree:true}); } setTimeout(apply,260);
})();

/* ---- Script block separator ---- */

// Studio 936 Composer v18 Pro Suite extension (disabled: legacy duplicate of newer v19-v25 UX layers).
const ENABLE_LEGACY_V18_PRO_SUITE = false; if (ENABLE_LEGACY_V18_PRO_SUITE) { (() => {
'use strict';
const STORAGE_KEY = 'studio936ComposerV25SongStructure';
const LIB_KEY = 'studio936ComposerLibraryV18';
const ADDON_KEY = 'studio936ComposerAddonV18';
const LANG_KEY = 'pianoComposerUiLangV15';
const ONBOARD_KEY = 'studio936ComposerOnboardingSeenV18';
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const PC = {C:0,'C#':1,DB:1,D:2,'D#':3,EB:3,E:4,FB:4,'E#':5,F:5,'F#':6,GB:6,G:7,'G#':8,AB:8,A:9,'A#':10,BB:10,B:11,CB:11,'B#':0};
const SPANISH_ROOT = {DO:'C',RE:'D',MI:'E',FA:'F',SOL:'G',LA:'A',SI:'B'};
const SCALE_INTERVALS = MusicTheory.SCALE_INTERVALS;
const SCALE_LABELS = MusicTheory.SCALE_LABELS;
const SECTION_NAMES_ES = {intro:'Introducción', verse:'Verso', verse1:'Verso 1', verse2:'Verso 2', verse3:'Verso 3', verse4:'Verso 4', prechorus:'Pre-coro', chorus:'Coro', bridge:'Puente', interlude:'Interludio', solo:'Solo', outro:'Outro'};
const SECTION_NAMES_EN = {intro:'Introduction', verse:'Verse', verse1:'Verse 1', verse2:'Verse 2', verse3:'Verse 3', prechorus:'Pre-chorus', chorus:'Chorus', interlude:'Interlude', solo:'Solo'};
const SONG_ORDER = ['intro','verse','verse1','verse2','verse3','prechorus','chorus','interlude','solo'];
const I18N = {
  es:{suite:'Studio 936 Pro Suite',library:'Biblioteca',templates:'Plantillas',transpose:'Transponer',scales:'Escalas',chordAI:'Acordes IA',drums:'Batería',mixer:'Mixer',record:'REC Idea',midiIn:'MIDI IN',pdf:'PDF Lead Sheet',lead:'Vista Lead Sheet',practice:'Modo Práctica',share:'Compartir',inspire:'Inspirarme',theory:'Teoría',close:'Cerrar',apply:'Aplicar',save:'Guardar',open:'Abrir',duplicate:'Duplicar',delete:'Borrar',newSong:'Nueva canción',import:'Importar',copy:'Copiar',drumsOn:'Batería ON',drumsOff:'Batería OFF',recOn:'REC ON',recOff:'REC Idea',detected:'Acorde detectado',applyDetected:'Aplicar acorde detectado',noChord:'Toca notas para detectar el acorde',saved:'Guardado',section:'Sección',key:'Tonalidad',scale:'Escala',notes:'Notas',mood:'Intención',soft:'Suave',epic:'Épico',sad:'Triste',funk:'Funk',jazz:'Jazz',resolve:'Resolver',pdfDone:'PDF generado',shareCopied:'Link copiado',templateApplied:'Plantilla aplicada',transposeDone:'Transposición aplicada',libraryEmpty:'No hay canciones guardadas todavía.',onboardTitle:'Bienvenido a Studio 936 Composer',onboardText:'Crea progresiones, letras, melodías, grooves y exporta tus ideas para producción.'},
  en:{suite:'Studio 936 Pro Suite',library:'Library',templates:'Templates',transpose:'Transpose',scales:'Scales',chordAI:'Chord AI',drums:'Drums',mixer:'Mixer',record:'REC Idea',midiIn:'MIDI IN',pdf:'PDF Lead Sheet',lead:'Lead Sheet View',practice:'Practice Mode',share:'Share',inspire:'Inspire Me',theory:'Theory',close:'Close',apply:'Apply',save:'Save',open:'Open',duplicate:'Duplicate',delete:'Delete',newSong:'New song',import:'Import',copy:'Copy',drumsOn:'Drums ON',drumsOff:'Drums OFF',recOn:'REC ON',recOff:'REC Idea',detected:'Detected chord',applyDetected:'Apply detected chord',noChord:'Play notes to detect the chord',saved:'Saved',section:'Section',key:'Key',scale:'Scale',notes:'Notes',mood:'Mood',soft:'Soft',epic:'Epic',sad:'Sad',funk:'Funk',jazz:'Jazz',resolve:'Resolve',pdfDone:'PDF generated',shareCopied:'Link copied',templateApplied:'Template applied',transposeDone:'Transpose applied',libraryEmpty:'No saved songs yet.',onboardTitle:'Welcome to Studio 936 Composer',onboardText:'Create progressions, lyrics, melodies, grooves and export your ideas for production.'}
};
function lang(){ return (document.documentElement.lang || localStorage.getItem(LANG_KEY) || 'es').startsWith('en') ? 'en' : 'es'; }
function T(k){ return (I18N[lang()]||I18N.es)[k] || I18N.es[k] || k; }
function $(id){ return document.getElementById(id); }
function q(sel,root=document){ return root.querySelector(sel); }
function qa(sel,root=document){ return [...root.querySelectorAll(sel)]; }
function esc(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function clone(o){ return JSON.parse(JSON.stringify(o)); }
function flash(msg){ const s=$('saveStatus'); if(s){ s.textContent=msg; setTimeout(()=>{ if(s.textContent===msg) s.textContent='Studio 936 Composer v19 listo.'; },2600); } }
function slug(s){ return String(s || 'studio936').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') || 'studio936'; }
function getProject(){
  try{ const save=$('saveBtn'); if(save) save.click(); }catch(e){}
  try{ const raw=localStorage.getItem(STORAGE_KEY); if(raw) return normalizeProject(JSON.parse(raw)); }catch(e){}
  return normalizeProject(baseProject());
}
function setProject(p,reload=true){ localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeProject(p))); if(reload) setTimeout(()=>location.reload(),120); }
function chord(name,bass,notes,bars){ return MusicTheory.chord(name,bass,notes,bars); }
function baseLyrics(){ return {intro:'Intro instrumental sobre Fmaj13 – Fmaj7 – Cmaj7.', verse:'Quizás no pueda ser\nEste el lugar\nPues solo vine aquí\nA despertar', verse1:'De la luz eterna\nRecibí el don de amar\nYo soy aquí y allá', verse2:'Despertar de un sueño\nLlamado realidad', verse3:'Vive esta verdad\nY el camino se abrirá', prechorus:'Ama, ríe, baila\nCrea tu propia realidad', chorus:'La magia vibra en mí\ndespierta un genio aquí\nEs hora de despertar', interlude:'Interludio instrumental.', solo:'Solo principal.'}; }
function baseSolos(){ const o={}; SONG_ORDER.forEach(k=>o[k]={key:k==='chorus'?'G':'F',scale:k==='chorus'?'mixolydian':'lydian',phrase:''}); o.intro.phrase='D4:1 E4:1 G4:1 A4:1 C5:2 B4:1 A4:1 G4:2'; o.solo.phrase='D4:1 E4:1 G4:1 A4:1 C5:1 D5:1 F5:2 E5:1 D5:1 C5:2 R:2'; return o; }
function baseProject(){ return {title:'Despertar de un Sueño',author:'Rafael Ipuz',bpm:95,style:'funk',instrument:'piano',grooveVol:7,viewMode:'piano',routingMode:'normal',fretMode:'guitar',tuningHz:440,soloOn:true,lyrics:baseLyrics(),sectionSolos:baseSolos(),sections:{intro:[chord('Fmaj13','F2','E3 A3 D4 F4',2),chord('Fmaj7','F2','E3 A3 C4 E4',2),chord('Cmaj7','C2','B2 E3 G3 B3',2)],verse:[chord('Fmaj13','F2','E3 A3 D4 F4',2),chord('Fmaj7','F2','E3 A3 C4 E4',1),chord('Cmaj7','C2','B2 E3 G3 B3',1)],verse1:[chord('Fmaj13','F2','E3 A3 D4 F4',2),chord('Fmaj7','F2','E3 A3 C4 E4',1),chord('Cmaj7','C2','B2 E3 G3 B3',1)],verse2:[chord('Fmaj13','F2','E3 A3 D4 F4',2),chord('Fmaj7','F2','E3 A3 C4 E4',1),chord('Cmaj7','C2','B2 E3 G3 B3',1)],verse3:[chord('Fmaj13','F2','E3 A3 D4 F4',2),chord('Fmaj7','F2','E3 A3 C4 E4',1),chord('Cmaj7','C2','B2 E3 G3 B3',1)],prechorus:[chord('Fmaj7/C','C2','E3 A3 C4 E4',1),chord('C6/9','C2','E3 G3 A3 D4',1),chord('Am6/11','A2','C3 E3 F3 A3',1),chord('Cmaj7','C2','B2 E3 G3 B3',1)],chorus:[chord('G6/9','G2','B2 D3 E3 A3',1),chord('Am6','A2','C3 E3 F#3 A3',1),chord('Gmaj9','G2','B2 D3 F#3 A3',1),chord('C','C2','C3 E3 G3 C4',1)],interlude:[chord('Fmaj7/C','C2','E3 A3 C4 E4',1),chord('C6/9','C2','E3 G3 A3 D4',1),chord('Am6/11','A2','C3 E3 F3 A3',1),chord('Cmaj7','C2','B2 E3 G3 B3',1)],solo:[chord('Fmaj13','F2','E3 A3 D4 F4',2),chord('Cmaj7','C2','B2 E3 G3 B3',2)]}}; }
function normalizeProject(p){ const d=baseProject(); p=p||{}; p={...d,...p}; p.sections={...d.sections,...(p.sections||{})}; p.lyrics={...d.lyrics,...(p.lyrics||{})}; p.sectionSolos={...d.sectionSolos,...(p.sectionSolos||{})}; SONG_ORDER.forEach(k=>{ if(!Array.isArray(p.sections[k])) p.sections[k]=d.sections[k]||[]; p.sections[k]=p.sections[k].map(x=>chord(x.name||'C',x.bass||'C2',x.notes||'C3 E3 G3',x.bars||1)); p.sectionSolos[k]={key:'C',scale:'major',phrase:'',...(p.sectionSolos[k]||{})}; }); p.bpm=Number(p.bpm)||95; p.title=p.title||'Canción sin nombre'; p.author=p.author||'Autor no definido'; return p; }
function parseRoot(root){ if(!root) return null; root=String(root).trim().toUpperCase(); root=root.replace(/♭/g,'B').replace(/♯/g,'#'); const sp=Object.keys(SPANISH_ROOT).find(x=>root.startsWith(x)); if(sp) root=SPANISH_ROOT[sp]+root.slice(sp.length); return PC[root]; }
function pcToName(pc){ return NOTE_NAMES[((pc%12)+12)%12]; }
function transposeRoot(root,semi){ const pc=parseRoot(root); return pc==null?root:pcToName(pc+semi); }
function transposeChordName(name,semi){ return String(name||'').replace(/^([A-Ga-g](?:#|b|♭|♯)?|Do|Re|Mi|Fa|Sol|La|Si)(.*?)(?:\/([A-Ga-g](?:#|b|♭|♯)?|Do|Re|Mi|Fa|Sol|La|Si))?$/i,(m,r,rest,slash)=> transposeRoot(r,semi)+(rest||'')+(slash?('/'+transposeRoot(slash,semi)) : '')); }
function transposeNoteToken(tok,semi){ const m=String(tok||'').match(/^([A-Ga-g](?:#|b|♭|♯)?|Do|Re|Mi|Fa|Sol|La|Si)(-?\d+)?$/i); if(!m) return tok; let root=transposeRoot(m[1],semi); return root+(m[2]||''); }
function transposeNotes(str,semi){ return String(str||'').split(/(\s+|,|;)/).map(x=>/^[\s,;]+$/.test(x)?x:transposeNoteToken(x,semi)).join(''); }
function transposeSoloPhrase(str,semi){ return String(str||'').replace(/([A-Ga-g](?:#|b|♭|♯)?|Do|Re|Mi|Fa|Sol|La|Si)(-?\d+)(?=\s*:)/gi,(m,r,o)=>transposeRoot(r,semi)+o); }
function transposeProject(p,semi){ p=clone(p); SONG_ORDER.forEach(k=>{ (p.sections[k]||[]).forEach(c=>{ c.name=transposeChordName(c.name,semi); c.bass=transposeNotes(c.bass,semi); c.notes=transposeNotes(c.notes,semi); }); if(p.sectionSolos[k]){ p.sectionSolos[k].key=transposeRoot(p.sectionSolos[k].key,semi); p.sectionSolos[k].phrase=transposeSoloPhrase(p.sectionSolos[k].phrase,semi); }}); return p; }
function noteToMidi(tok){ const m=String(tok||'').trim().match(/^([A-Ga-g](?:#|b|♭|♯)?)(-?\d+)$/); if(!m) return null; const pc=parseRoot(m[1]); if(pc==null) return null; return pc + (Number(m[2])+1)*12; }
function midiToNote(m){ return pcToName(m%12)+(Math.floor(m/12)-1); }
function parseNotes(str){ return String(str||'').split(/[\s,;]+/).map(noteToMidi).filter(Number.isFinite); }
function scaleNotes(key,scale){ return MusicTheory.scaleNotes(key, scale); }
function sectionName(k){ return (lang()==='en'?SECTION_NAMES_EN:SECTION_NAMES_ES)[k]||k; }
function projectLines(p){ const lines=[]; lines.push(`${lang()==='en'?'SONG':'CANCIÓN'}: ${p.title}`); lines.push(`${lang()==='en'?'AUTHOR':'AUTOR'}: ${p.author}`); lines.push(`BPM: ${p.bpm} · Style: ${p.style} · A4: ${p.tuningHz||440} Hz`); lines.push(''); SONG_ORDER.forEach(k=>{ const sec=p.sections[k]||[]; if(!sec.length) return; lines.push(`[${sectionName(k).toUpperCase()}]`); sec.forEach(c=>lines.push(`| ${c.name} | bass:${c.bass} | notes:${c.notes} | bars:${c.bars}`)); const solo=p.sectionSolos?.[k]; if(solo?.phrase) lines.push(`Melody/Solo (${solo.key} ${solo.scale}): ${solo.phrase}`); if(p.lyrics?.[k]){ lines.push(lang()==='en'?'Lyrics:':'Letra:'); String(p.lyrics[k]).split('\n').forEach(l=>lines.push('  '+l)); } lines.push(''); }); return lines; }
function download(name,content,type){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([content],{type})); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1200); }
function pdfSafe(s){ return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[–—]/g,'-').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/[^\x09\x0A\x0D\x20-\x7E]/g,''); }
function escPdf(s){ return pdfSafe(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)'); }
function makePdf(lines){ const max=48, pages=[]; for(let i=0;i<lines.length;i+=max) pages.push(lines.slice(i,i+max)); let objects=[]; const pageObjs=[]; const contentObjs=[]; const fontObj=3; let next=4; pages.forEach(()=>{ pageObjs.push(next++); contentObjs.push(next++); }); objects[1]='1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'; objects[2]=`2 0 obj\n<< /Type /Pages /Kids [${pageObjs.map(n=>n+' 0 R').join(' ')}] /Count ${pages.length} >>\nendobj\n`; objects[3]='3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n'; pages.forEach((pl,idx)=>{ const pObj=pageObjs[idx], cObj=contentObjs[idx]; const content=['BT','/F1 10 Tf','40 800 Td','14 TL']; pl.forEach((line,j)=>{ content.push(`(${escPdf(line).slice(0,105)}) Tj`); if(j<pl.length-1) content.push('T*'); }); content.push('ET'); const stream=content.join('\n'); objects[pObj]=`${pObj} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${cObj} 0 R >>\nendobj\n`; objects[cObj]=`${cObj} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`; }); let out='%PDF-1.4\n'; const offsets=[0]; for(let i=1;i<objects.length;i++){ offsets[i]=out.length; out+=objects[i]||''; } const xref=out.length; out+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`; for(let i=1;i<objects.length;i++) out+=String(offsets[i]).padStart(10,'0')+' 00000 n \n'; out+=`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`; return out; }
function leadSheetHelpers(){
  return {
    songOrder: SONG_ORDER,
    sectionName,
    translate: T,
    openModal,
    closeModal,
    byId: $,
    slug,
    download,
    projectText: projectLines,
    flashStatus: flash
  };
}
function exportPdf(){
  const p=getProject();
  if(window.Studio936LeadSheet?.exportLeadSheetPdf){
    window.Studio936LeadSheet.exportLeadSheetPdf(p, leadSheetHelpers());
    return;
  }
  download(slug(p.title)+'-lead-sheet.pdf', makePdf(projectLines(p)), 'application/pdf');
  flash(T('pdfDone'));
}
function buildLeadHtml(p){
  if(window.Studio936LeadSheet?.buildLeadSheet) return window.Studio936LeadSheet.buildLeadSheet(p, leadSheetHelpers());
  return `<div class="v18-lead-sheet"><h1>${esc(p.title)}</h1><h2>${esc(p.author)}</h2><p><b>BPM:</b> ${esc(p.bpm)} · <b>Style:</b> ${esc(p.style)} · <b>A4:</b> ${esc(p.tuningHz||440)} Hz</p>${SONG_ORDER.map(k=>{ const sec=p.sections[k]||[]; if(!sec.length) return ''; return `<section><h3>${esc(sectionName(k))}</h3><div class="v18-chordline">${sec.map(c=>`<span>${esc(c.name)}</span>`).join(' ')}</div>${p.lyrics?.[k]?`<pre>${esc(p.lyrics[k])}</pre>`:''}${p.sectionSolos?.[k]?.phrase?`<p><b>Solo:</b> ${esc(p.sectionSolos[k].phrase)}</p>`:''}</section>`; }).join('')}</div>`;
}
function showLeadSheet(){
  const p=getProject();
  if(window.Studio936LeadSheet?.openLeadSheet){
    window.Studio936LeadSheet.openLeadSheet(p, leadSheetHelpers());
    return;
  }
  openModal('lead',T('lead'), buildLeadHtml(p)+`<div class="v18-actions"><button class="v18-btn" id="v18PrintLead">Print / PDF</button><button class="v18-btn" id="v18ExportPdf2">${T('pdf')}</button></div>`);
  $('v18PrintLead').onclick=()=>window.print(); $('v18ExportPdf2').onclick=exportPdf;
}
function makeTemplate(style){ const p=baseProject(); p.style=style; p.title={funk:'Funk idea 936',rock:'Rock idea 936',balada:'Balada idea 936',bossa:'Bossa idea 936',jazz:'Jazz idea 936',blues:'Blues idea 936',bolero:'Bolero idea 936',salsa:'Salsa idea 936',cumbia:'Cumbia idea 936',reggae:'Reggae idea 936'}[style]||'Idea 936'; p.bpm={funk:96,rock:110,balada:76,bossa:118,jazz:120,blues:86,bolero:72,salsa:98,cumbia:92,reggae:78}[style]||95; const maps={
  funk:[chord('Fmaj13','F2','E3 A3 D4 F4',1),chord('Fmaj7','F2','E3 A3 C4 E4',1),chord('Cmaj7','C2','B2 E3 G3 B3',2)],
  rock:[chord('E5','E2','E3 B3 E4',1),chord('G5','G2','G3 D4 G4',1),chord('A5','A2','A3 E4 A4',1),chord('C5','C2','C3 G3 C4',1)],
  balada:[chord('Cadd9','C2','C3 E3 G3 D4',1),chord('G/B','B1','B2 D3 G3',1),chord('Am7','A2','A2 C3 E3 G3',1),chord('Fmaj7','F2','F2 A2 C3 E3',1)],
  bossa:[chord('Cmaj9','C2','E3 G3 B3 D4',1),chord('A7(b13)','A2','C#3 G3 F4',1),chord('Dm9','D2','F3 A3 C4 E4',1),chord('G13','G2','F3 B3 E4 A4',1)],
  jazz:[chord('Dm9','D2','F3 A3 C4 E4',1),chord('G13','G2','F3 B3 E4 A4',1),chord('Cmaj9','C2','E3 G3 B3 D4',1),chord('A7alt','A2','C#3 G3 Bb3 F4',1)],
  blues:[chord('C7','C2','E3 G3 Bb3 C4',1),chord('F7','F2','Eb3 A3 C4 F4',1),chord('C7','C2','E3 G3 Bb3 C4',1),chord('G7','G2','F3 B3 D4 G4',1)],
  bolero:[chord('Cmaj7','C2','E3 G3 B3 C4',1),chord('Am7','A2','C3 E3 G3 A3',1),chord('Dm7','D2','F3 A3 C4 D4',1),chord('G7','G2','F3 B3 D4 G4',1)],
  salsa:[chord('Cm7','C2','Eb3 G3 Bb3 C4',1),chord('F7','F2','Eb3 A3 C4 F4',1),chord('Bbmaj7','Bb1','D3 F3 A3 Bb3',1),chord('G7','G2','F3 B3 D4 G4',1)],
  cumbia:[chord('Am','A2','A2 C3 E3 A3',1),chord('G','G2','G2 B2 D3 G3',1),chord('F','F2','F2 A2 C3 F3',1),chord('E7','E2','E2 G#2 B2 D3',1)],
  reggae:[chord('G','G2','G3 B3 D4',1),chord('D','D2','F#3 A3 D4',1),chord('Em','E2','G3 B3 E4',1),chord('C','C2','E3 G3 C4',1)]
 }; const prog=maps[style]||maps.funk; p.sections.intro=clone(prog); p.sections.verse=clone(prog); p.sections.verse1=clone(prog); p.sections.chorus=clone(prog.slice().reverse()); p.sections.interlude=clone(prog); return p; }
function showTemplates(){ const styles=['funk','rock','balada','bossa','jazz','blues','bolero','salsa','cumbia','reggae']; openModal('templates',T('templates'),`<p>Elige una plantilla para cargar estructura, acordes, tempo y estilo.</p><div class="v18-card-grid">${styles.map(s=>`<button class="v18-card" data-template="${s}"><b>${s.toUpperCase()}</b><small>${makeTemplate(s).bpm} BPM</small></button>`).join('')}</div>`); qa('[data-template]').forEach(b=>b.onclick=()=>{ setProject(makeTemplate(b.dataset.template)); }); }
function showLibrary(){ renderLibraryModal(); }
function library(){ try{return JSON.parse(localStorage.getItem(LIB_KEY)||'[]')}catch(e){return []} }
function saveLibrary(list){ localStorage.setItem(LIB_KEY,JSON.stringify(list)); }
function renderLibraryModal(){ const list=library(); const body=`<div class="v18-actions"><button class="v18-btn" id="v18SaveLib">${T('save')} actual</button><button class="v18-btn" id="v18NewBlank">${T('newSong')}</button></div>${list.length?`<div class="v18-list">${list.map(x=>`<div class="v18-list-row"><div><b>${esc(x.title)}</b><small>${esc(x.author||'')} · ${new Date(x.updated).toLocaleString()}</small></div><div><button class="v18-mini" data-open="${x.id}">${T('open')}</button><button class="v18-mini" data-dup="${x.id}">${T('duplicate')}</button><button class="v18-mini danger" data-del="${x.id}">${T('delete')}</button></div></div>`).join('')}</div>`:`<p>${T('libraryEmpty')}</p>`}`; openModal('library',T('library'),body); $('v18SaveLib').onclick=()=>{ const p=getProject(); const l=library(); l.unshift({id:Date.now().toString(36),title:p.title,author:p.author,updated:Date.now(),project:p}); saveLibrary(l.slice(0,60)); flash(T('saved')); renderLibraryModal(); }; $('v18NewBlank').onclick=()=>{ const p=baseProject(); p.title='Nueva canción'; p.author=''; SONG_ORDER.forEach(k=>{p.lyrics[k]=''; if(k!=='intro')p.sections[k]=[];}); setProject(p); }; qa('[data-open]').forEach(b=>b.onclick=()=>{ const it=library().find(x=>x.id===b.dataset.open); if(it) setProject(it.project); }); qa('[data-dup]').forEach(b=>b.onclick=()=>{ const l=library(); const it=l.find(x=>x.id===b.dataset.dup); if(it){ const cp=clone(it); cp.id=Date.now().toString(36); cp.title=cp.title+' copia'; cp.updated=Date.now(); l.unshift(cp); saveLibrary(l); renderLibraryModal(); }}); qa('[data-del]').forEach(b=>b.onclick=()=>{ saveLibrary(library().filter(x=>x.id!==b.dataset.del)); renderLibraryModal(); }); }
function showTranspose(){
    const noteOptions = NOTE_NAMES.map(n=>`<option value="${n}">${n}</option>`).join('');
    const body = `<p>Transporta acordes, bajo, notas y melodías/solos de toda la canción a otra tonalidad.</p>
        <div class="v18-form">
            <label>Tono actual</label>
            <select id="v18KeyFrom">${noteOptions}</select>
            <label>Nueva tonalidad</label>
            <select id="v18KeyTo">${noteOptions}</select>
        </div>
        <p style="font-size:.75rem;color:#9fb0ae;">Al aplicar, la página se recarga sola para mostrar la canción ya transportada.</p>
        <div class="v18-actions"><button class="v18-btn primary" id="v18DoTranspose">${T('apply')}</button></div>`;
    openModal('transpose',T('transpose'),body);
    $('v18DoTranspose').onclick=()=>{
        const from = parseRoot($('v18KeyFrom').value);
        const to = parseRoot($('v18KeyTo').value);
        const semi = to - from;
        if(semi) setProject(transposeProject(getProject(),semi));
        else flashStatus('Mismo tono — no hay nada que transportar.');
    };
}
function showScales(){ const p=getProject(); const sec=$('sectionSelect')?.value||'intro'; const solo=p.sectionSolos?.[sec]||{key:'C',scale:'major'}; const notes=scaleNotes(solo.key,solo.scale); const body=`<div class="v18-form"><label>${T('section')}</label><b>${esc(sectionName(sec))}</b><label>${T('key')}</label><input id="v18ScaleKey" value="${esc(solo.key||'C')}"><label>${T('scale')}</label><select id="v18ScaleName">${Object.keys(SCALE_INTERVALS).map(k=>`<option value="${k}" ${k===solo.scale?'selected':''}>${SCALE_LABELS[k]}</option>`).join('')}</select></div><div id="v18ScaleOut" class="v18-notechips">${notes.map(n=>`<span>${n}</span>`).join('')}</div><p class="v18-muted">Estas son notas recomendadas para improvisar o construir melodías sobre la sección.</p>`; openModal('scales',T('scales'),body); const upd=()=>{ $('v18ScaleOut').innerHTML=scaleNotes($('v18ScaleKey').value,$('v18ScaleName').value).map(n=>`<span>${n}</span>`).join(''); }; $('v18ScaleKey').oninput=upd; $('v18ScaleName').onchange=upd; }
function chordVoicing(name){ return MusicTheory.chordVoicing(name); }
function suggestChords(root,mood){ const R=transposeRoot(root||'C',0); const pc=parseRoot(R)||0; const deg=[0,2,4,5,7,9,11].map(i=>pcToName(pc+i)); const map={soft:[`${deg[3]}maj7`,`${deg[5]}m7`,`${deg[1]}m7`,`${deg[4]}7`],epic:[`${deg[0]}add9`,`${deg[3]}maj9`,`${deg[4]}sus4`,`${deg[0]}maj9`],sad:[`${deg[5]}m7`,`${deg[1]}m7`,`${deg[3]}maj7`,`${deg[4]}7`],funk:[`${deg[0]}maj13`,`${deg[4]}6/9`,`${deg[5]}m6`,`${deg[0]}maj7`],jazz:[`${deg[1]}m9`,`${deg[4]}13`,`${deg[0]}maj9`,`${deg[5]}7alt`],resolve:[`${deg[4]}7`,`${deg[0]}maj7`,`${deg[0]}`,`${deg[0]}6/9`]}; return map[mood]||map.soft; }
function showChordAI(){ const current=$('chordName')?.value||'C'; const root=(current.match(/^([A-G](?:#|b)?)/i)||['','C'])[1]; const moods=['soft','epic','sad','funk','jazz','resolve']; const body=`<p>A partir de <b>${esc(current)}</b>, elige una intención y aplica una sugerencia al editor.</p><p class="v18-muted"><b>Nota:</b> este módulo es un asistente armónico offline basado en reglas musicales; no llama a una IA externa. Para OpenAI/Gemini real se necesita backend/API segura.</p><select id="v18Mood">${moods.map(m=>`<option value="${m}">${T(m)}</option>`).join('')}</select><div id="v18ChordSuggestions" class="v18-card-grid"></div>`; openModal('chordAI',T('chordAI'),body); const render=()=>{ $('v18ChordSuggestions').innerHTML=suggestChords(root,$('v18Mood').value).map(c=>`<button class="v18-card" data-chord="${c}"><b>${c}</b><small>${chordVoicing(c)}</small></button>`).join(''); qa('[data-chord]').forEach(b=>b.onclick=()=>{ if($('chordName')) $('chordName').value=b.dataset.chord; if($('bassInput')) $('bassInput').value=(b.dataset.chord.match(/^([A-G](?:#|b)?)/i)||['','C'])[1]+'2'; if($('chordNotes')) $('chordNotes').value=chordVoicing(b.dataset.chord); closeModal(); flash('Sugerencia aplicada al editor. Pulsa Aplicar o Agregar.'); }); }; $('v18Mood').onchange=render; render(); }
let drumCtx=null, drumGain=null, drumOn=false, drumStep=0, drumNext=0, drumTimer=null;
const drumPatterns={funk:{kick:[0,6,10],snare:[4,12],hat:[0,2,4,6,8,10,12,14]},rock:{kick:[0,8,10],snare:[4,12],hat:[0,2,4,6,8,10,12,14]},balada:{kick:[0,8],snare:[12],hat:[0,4,8,12]},bossa:{kick:[0,6,10],snare:[4,12],hat:[2,5,8,11,14]},jazz:{kick:[0,10],snare:[4,12],hat:[0,3,6,9,12,15]},blues:{kick:[0,6,10],snare:[4,12],hat:[0,3,6,9,12,15]},bolero:{kick:[0,8],snare:[4,12],hat:[0,4,8,12]},salsa:{kick:[0,8,10],snare:[4,12],hat:[0,3,6,8,11,14],clave:[0,6,10,14]},cumbia:{kick:[0,8],snare:[4,12],hat:[0,2,4,6,8,10,12,14],conga:[3,7,11,15]},reggae:{kick:[8],snare:[4,12],hat:[2,6,10,14]}};
function ensureDrums(){ if(!drumCtx){ drumCtx=new (window.AudioContext||window.webkitAudioContext)(); drumGain=drumCtx.createGain(); drumGain.gain.value=Number(loadAddon().drumVol||0.35); drumGain.connect(drumCtx.destination); } if(drumCtx.state==='suspended') drumCtx.resume(); }
function drumOsc(freq,dur,type,time,vol){ const o=drumCtx.createOscillator(), g=drumCtx.createGain(); o.type=type; o.frequency.setValueAtTime(freq,time); g.gain.setValueAtTime(vol,time); g.gain.exponentialRampToValueAtTime(0.001,time+dur); o.connect(g); g.connect(drumGain); o.start(time); o.stop(time+dur); }
function drumNoise(dur,time,vol,filter=9000){ const len=Math.max(1,Math.floor(drumCtx.sampleRate*dur)), b=drumCtx.createBuffer(1,len,drumCtx.sampleRate), d=b.getChannelData(0); for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len); const src=drumCtx.createBufferSource(), f=drumCtx.createBiquadFilter(), g=drumCtx.createGain(); f.type='highpass'; f.frequency.value=filter; g.gain.value=vol; src.buffer=b; src.connect(f); f.connect(g); g.connect(drumGain); src.start(time); }
function hitDrum(kind,time){
    // Cambio 446: mismo criterio que playNoteImpl — si el kit de
    // batería real (WebAudioFont) ya está cargado, se usa ese; si no,
    // sigue con el sintetizador de siempre (líneas de abajo, sin tocar).
    const sampleEngine = window.Studio936SampleEngine;
    if (sampleEngine) {
        ensureDrums();
        const vol = kind==='kick' ? .9 : kind==='snare' ? .6 : kind==='hat' ? .35 : kind==='clave' ? .5 : .55;
        const dur = kind==='kick' ? .4 : kind==='snare' ? .25 : kind==='hat' ? .15 : .2;
        if (sampleEngine.playSampledDrum(drumCtx, drumGain, kind, dur, vol, time)) return;
    }
    if(kind==='kick') drumOsc(75,.22,'sine',time,.65); if(kind==='snare') drumNoise(.12,time,.33,1200); if(kind==='hat') drumNoise(.045,time,.13,7000); if(kind==='clave') drumOsc(900,.06,'square',time,.17); if(kind==='conga') drumOsc(180,.12,'triangle',time,.2);
}
function scheduleDrums(){ if(!drumOn) return; const p=getProject(); const pat=drumPatterns[p.style]||drumPatterns.funk; const stepDur=60/(Number($('bpmDisplay')?.textContent)||p.bpm||95)/4; while(drumNext < drumCtx.currentTime + .1){ Object.keys(pat).forEach(k=>{ if(pat[k].includes(drumStep%16)) hitDrum(k,drumNext); }); drumNext+=stepDur; drumStep=(drumStep+1)%16; } drumTimer=requestAnimationFrame(scheduleDrums); }
function toggleDrums(){ ensureDrums(); drumOn=!drumOn; const btn=$('v18DrumBtn'); if(btn) btn.textContent=drumOn?T('drumsOn'):T('drumsOff'); if(drumOn){ drumNext=drumCtx.currentTime; scheduleDrums(); } else cancelAnimationFrame(drumTimer); }
function loadAddon(){ try{return JSON.parse(localStorage.getItem(ADDON_KEY)||'{}')}catch(e){return{}} }
function saveAddon(o){ localStorage.setItem(ADDON_KEY,JSON.stringify({...loadAddon(),...o})); }
function showMixer(){ const a=loadAddon(); openModal('mixer',T('mixer'),`<p>Control rápido para batería v18 y niveles de referencia. El volumen principal del acompañamiento base sigue en el control Groove.</p><div class="v18-mixer"><label>Groove</label><input id="v18MixGroove" type="range" min="1" max="10" value="${$('grooveVol')?.value||7}"><label>Drums</label><input id="v18MixDrums" type="range" min="0" max="100" value="${Math.round((a.drumVol??0.35)*100)}"><label>Click ref.</label><input id="v18MixClick" type="range" min="0" max="100" value="${a.clickVol??65}"><label>Bass ref.</label><input id="v18MixBass" type="range" min="0" max="100" value="${a.bassVol??80}"></div>`); $('v18MixGroove').oninput=e=>{ const g=$('grooveVol'); if(g){g.value=e.target.value; g.dispatchEvent(new Event('input',{bubbles:true}));} }; $('v18MixDrums').oninput=e=>{ const v=Number(e.target.value)/100; saveAddon({drumVol:v}); if(drumGain) drumGain.gain.value=v; }; ['v18MixClick','v18MixBass'].forEach(id=>$(id).oninput=e=>saveAddon({[id==='v18MixClick'?'clickVol':'bassVol']:Number(e.target.value)})); }
let recording=false, recStart=0, activeRec=new Map(), recEvents=[];
function quantDur(ms){ const bpm=Number($('bpmDisplay')?.textContent)||getProject().bpm||95; const stepMs=60000/bpm/4; return Math.max(1,Math.round(ms/stepMs)); }
function startRec(){ recording=true; recStart=performance.now(); recEvents=[]; activeRec.clear(); $('v18RecBtn').textContent=T('recOn'); flash('Grabando idea: toca el teclado virtual o MIDI físico.'); }
function stopRec(){ recording=false; const phrase=recEvents.map(e=>`${midiToNote(e.midi)}:${e.dur}`).join(' '); if(phrase && $('soloPhrase')){ $('soloPhrase').value=phrase; $('applySoloBtn')?.click(); } $('v18RecBtn').textContent=T('recOff'); flash(phrase?'Idea grabada en melodía/solo de esta sección.':'No se capturaron notas.'); }
function toggleRec(){ recording?stopRec():startRec(); }
function recNoteOn(midi){ if(recording&&!activeRec.has(midi)) activeRec.set(midi,performance.now()); activeNotes.add(midi%12); updateDetectedChord(); }
function recNoteOff(midi){ if(recording&&activeRec.has(midi)){ const st=activeRec.get(midi); activeRec.delete(midi); recEvents.push({midi,dur:quantDur(performance.now()-st)}); } setTimeout(()=>{ activeNotes.delete(midi%12); updateDetectedChord(); },80); }
const activeNotes=new Set();
function detectChordFromPcs(pcs){ pcs=[...new Set(pcs)].sort((a,b)=>a-b); if(!pcs.length) return null; const qualities=[['maj13',[0,4,7,11,14,21]],['maj9',[0,4,7,11,14]],['maj7',[0,4,7,11]],['m9',[0,3,7,10,14]],['m7',[0,3,7,10]],['m7b5',[0,3,6,10]],['dim7',[0,3,6,9]],['7',[0,4,7,10]],['6/9',[0,4,7,9,14]],['6',[0,4,7,9]],['m6',[0,3,7,9]],['sus4',[0,5,7]],['sus2',[0,2,7]],['dim',[0,3,6]],['aug',[0,4,8]],['m',[0,3,7]],['',[0,4,7]]]; let best=null; for(const root of pcs){ const rel=pcs.map(p=>(p-root+12)%12); for(const [name,ints] of qualities){ const qpcs=[...new Set(ints.map(i=>i%12))]; const score=rel.filter(x=>qpcs.includes(x)).length - Math.max(0,qpcs.length-rel.length)*.15; if(!best||score>best.score) best={root,name,score}; } } return best?pcToName(best.root)+best.name:null; }
function updateDetectedChord(){ const c=detectChordFromPcs([...activeNotes]); const out=$('v18DetectOut'); if(out) out.textContent=c?`${T('detected')}: ${c}`:T('noChord'); }
function applyDetectedChord(){ const c=detectChordFromPcs([...activeNotes]); if(!c) return; const root=(c.match(/^([A-G](?:#|b)?)/)||['','C'])[1]; if($('chordName')) $('chordName').value=c; if($('bassInput')) $('bassInput').value=root+'2'; if($('chordNotes')) $('chordNotes').value=chordVoicing(c); flash('Acorde detectado aplicado al editor.'); }
function setupKeyboardCapture(){ const piano=$('piano'); if(!piano) return; piano.addEventListener('pointerdown',e=>{ const key=e.target.closest('.key'); if(key?.dataset?.midi) recNoteOn(Number(key.dataset.midi)); },true); ['pointerup','pointerleave','pointercancel'].forEach(ev=>piano.addEventListener(ev,e=>{ const key=e.target.closest('.key'); if(key?.dataset?.midi) recNoteOff(Number(key.dataset.midi)); },true)); piano.addEventListener('contextmenu',e=>e.preventDefault()); }
async function setupMidiIn(){ if(!navigator.requestMIDIAccess){ flash('Este navegador no soporta Web MIDI. Prueba Chrome/Edge.'); return; } try{ const access=await navigator.requestMIDIAccess(); const bindInput=input=>{ input.onmidimessage=ev=>{ const [st,n,v]=ev.data; const cmd=st&0xf0; if(cmd===0x90&&v>0) recNoteOn(n); if(cmd===0x80||(cmd===0x90&&v===0)) recNoteOff(n); }; }; access.inputs.forEach(bindInput); access.onstatechange=()=>access.inputs.forEach(bindInput); flash('MIDI IN activo. Toca tu teclado físico para detectar/grabar notas.'); }catch(e){ flash('No se pudo activar MIDI IN.'); } }
function showTheory(){ const c=$('chordName')?.value||'C'; const notes=parseNotes($('chordNotes')?.value||chordVoicing(c)).map(m=>midiToNote(m)); const root=(c.match(/^([A-G](?:#|b)?)/i)||['','C'])[1]; const body=`<h3>${esc(c)}</h3><p><b>${T('notes')}:</b> ${notes.length?notes.join(' · '):esc(chordVoicing(c))}</p><p><b>${T('scale')} sugerida:</b> ${SCALE_LABELS.lydian} / ${SCALE_LABELS.mixolydian} / pentatónica según color.</p><div class="v18-notechips">${scaleNotes(root,'lydian').map(n=>`<span>${n}</span>`).join('')}</div><p class="v18-muted">Usa esta zona como explicación educativa para músicos: notas, color, función y escala posible.</p>`; openModal('theory',T('theory'),body); }
function showPractice(){ const body=`<div id="v18Practice" class="v18-practice"><div class="big-section">${esc($('currentPartTag')?.textContent||$('sectionLabel')?.textContent||'')}</div><div class="big-chord">${esc($('chordLabel')?.textContent||'')}</div><div class="big-next">${esc($('measureLabel')?.textContent||'')}</div><div class="v18-actions"><button class="v18-btn primary" onclick="document.getElementById('playSongBtn')?.click()">${$('playSongBtn')?.textContent||'Play Song'}</button><button class="v18-btn" onclick="document.getElementById('playBtn')?.click()">${$('playBtn')?.textContent||'Start'}</button></div></div>`; openModal('practice',T('practice'),body); const obs=new MutationObserver(()=>{ const box=$('v18Practice'); if(box){ q('.big-section',box).textContent=$('currentPartTag')?.textContent||$('sectionLabel')?.textContent||''; q('.big-chord',box).textContent=$('chordLabel')?.textContent||''; q('.big-next',box).textContent=$('measureLabel')?.textContent||''; }}); ['currentPartTag','sectionLabel','chordLabel','measureLabel'].forEach(id=>{ const e=$(id); if(e) obs.observe(e,{childList:true,characterData:true,subtree:true}); }); }
function showShare(){ const p=getProject(); const encoded=btoa(unescape(encodeURIComponent(JSON.stringify(p)))); const url=location.href.split('#')[0]+'#studio936='+encoded; openModal('share',T('share'),`<p>Comparte esta canción como enlace. Para proyectos grandes, usa JSON.</p><textarea class="v18-textarea" id="v18ShareUrl">${esc(url)}</textarea><div class="v18-actions"><button class="v18-btn primary" id="v18CopyShare">${T('copy')}</button></div>`); $('v18CopyShare').onclick=async()=>{ await navigator.clipboard.writeText($('v18ShareUrl').value); flash(T('shareCopied')); }; }
function checkHashImport(){ if(location.hash.startsWith('#studio936=')&&!sessionStorage.getItem('studio936HashImported')){ try{ const p=JSON.parse(decodeURIComponent(escape(atob(location.hash.slice(12))))); sessionStorage.setItem('studio936HashImported','1'); localStorage.setItem(STORAGE_KEY,JSON.stringify(normalizeProject(p))); location.hash=''; setTimeout(()=>location.reload(),80); }catch(e){} } }
function inspire(){ const styles=['funk','rock','balada','bossa','jazz','blues','bolero','salsa','cumbia','reggae']; const s=styles[Math.floor(Math.random()*styles.length)]; const p=makeTemplate(s); p.title='Idea '+s.toUpperCase()+' '+new Date().toLocaleDateString(); const keys=['C','D','E','F','G','A','Bb']; const semi=(parseRoot(keys[Math.floor(Math.random()*keys.length)])||0)-(parseRoot('C')||0); setProject(transposeProject(p,semi)); }
function showOnboarding(){ if(localStorage.getItem(ONBOARD_KEY)) return; localStorage.setItem(ONBOARD_KEY,'1'); openModal('onboarding',T('onboardTitle'),`<p>${T('onboardText')}</p><div class="v18-card-grid"><button class="v18-card" id="v18StartDemo"><b>Demo</b><small>Despertar de un Sueño</small></button><button class="v18-card" id="v18StartNew"><b>${T('newSong')}</b><small>Blank project</small></button><button class="v18-card" id="v18StartTemplates"><b>${T('templates')}</b><small>Genre ideas</small></button></div>`); $('v18StartDemo').onclick=closeModal; $('v18StartNew').onclick=()=>{ const p=baseProject(); p.title='Nueva canción'; SONG_ORDER.forEach(k=>{p.lyrics[k]=''; if(k!=='intro')p.sections[k]=[];}); setProject(p); }; $('v18StartTemplates').onclick=showTemplates; }
/* Suite Pro Entry Point Inventory
1) Button creation: #v18Suite is created by addV18Ui() and inserted after .status-bar.
2) Hidden state: panel visibility is controlled only by class toggles (v19-open) via #v19ToolsToggle, toggleSuite(), openPanel(), and closeAll(); default state is closed.
3) DOM dependency: addV18Ui() requires .status-bar and aborts if #v18Suite already exists.
4) Current loaded UI: index.html does not ship #v18Suite markup; it is runtime-injected from js/app.js.
5) Future extraction target: a modern suite-pro.js can isolate (a) addV18Ui creation, (b) show/hide controller logic, and (c) rebind-on-language-change behavior, without re-enabling legacy v18 defaults.
*/
function buildSuiteProContent(suite){ return suite; }
function bindSuiteProHandlers(){ return null; }
function populateSuiteProPanel(suite){ return suite; }
function addV18Ui(){ return null; }
function openModal(name,title,body){ let m=$('v18Modal'); if(!m){ m=document.createElement('div'); m.id='v18Modal'; m.className='v18-modal'; m.innerHTML='<div class="v18-modal-card"><button class="v18-x" id="v18Close">×</button><h2 id="v18ModalTitle"></h2><div id="v18ModalBody"></div></div>'; document.body.appendChild(m); $('v18Close').onclick=closeModal; m.addEventListener('click',e=>{ if(e.target===m) closeModal(); }); } $('v18ModalTitle').textContent=title; $('v18ModalBody').innerHTML=body; m.style.display='flex'; }
function closeModal(){ const m=$('v18Modal'); if(m) m.style.display='none'; }
function addHelp(){ const body=q('#helpModal .help-body'); if(!body||q('.v18-help-block',body)) return; body.insertAdjacentHTML('beforeend', `<div class="help-block wide v18-help-block"><h3>16. Studio 936 Pro Suite v18</h3><p><b>Biblioteca</b> guarda varias canciones dentro del navegador. <b>Plantillas</b> crea ideas por género. <b>Transponer</b> cambia tonalidad de acordes, bajo, notas y melodías. <b>Escalas</b> muestra notas recomendadas para improvisar. <b>Acordes IA</b> sugiere el siguiente acorde por intención. <b>Batería</b> agrega percusión sintética por estilo. <b>REC Idea</b> captura lo que tocas en el teclado virtual o MIDI y lo guarda como melodía de la sección. <b>PDF Lead Sheet</b> exporta un PDF simple para músicos. <b>Modo Práctica</b> muestra acorde y sección en grande.</p></div><div class="help-block v18-help-block"><h3>17. MIDI físico, detección de acordes y compartir</h3><p><b>MIDI IN</b> permite conectar un teclado físico compatible con Web MIDI. Al tocar notas, la app intenta detectar el acorde y puedes aplicarlo al editor. <b>Compartir</b> genera un enlace con el proyecto dentro del hash del navegador; para proyectos grandes sigue siendo mejor usar JSON.</p></div>`); }
function init(){ checkHashImport(); setupKeyboardCapture(); addHelp(); setTimeout(showOnboarding,600); const help=$('helpBtn'); if(help) help.addEventListener('click',()=>setTimeout(addHelp,80)); const langBtn=$('langBtn'); if(langBtn) langBtn.addEventListener('click',()=>setTimeout(()=>{ addHelp(); if(window.Studio936SuitePro?.ensurePanel) window.Studio936SuitePro.ensurePanel(); },140)); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})(); }

/* ---- Script block separator ---- */

// v19 extension: compact tools drawer, automatic guitar/ukulele fretboard, Flow 8 device helper.
(() => {
  'use strict';
  const STORAGE_KEY = 'studio936ComposerV25SongStructure';
  const LANG_KEY = 'pianoComposerUiLangV15';
  const tr = () => ((document.documentElement.lang || localStorage.getItem(LANG_KEY) || 'es').startsWith('en') ? 'en' : 'es');
  const txt = {
    es:{tools:'Herramientas',close:'Cerrar',open:'Abrir herramientas',flow:'Flow 8 / Dispositivo de audio',detect:'Detectar salidas',select:'Salida de audio',none:'No se han detectado salidas todavía.',request:'Para ver nombres de dispositivos, el navegador puede pedir permiso de audio.',ok:'Salida aplicada si el navegador soporta AudioContext.setSinkId.',unsupported:'Tu navegador no permite cambiar salida desde esta página. Selecciona Flow 8 como salida del sistema operativo.'},
    en:{tools:'Tools',close:'Close',open:'Open tools',flow:'Flow 8 / Audio device',detect:'Detect outputs',select:'Audio output',none:'No outputs detected yet.',request:'To reveal device names, the browser may ask for audio permission.',ok:'Output applied if this browser supports AudioContext.setSinkId.',unsupported:'This browser cannot change output from the page. Select Flow 8 as the system output.'}
  };
  const $ = id => document.getElementById(id);
  const q = (s,r=document) => r.querySelector(s);
  function T(k){return (txt[tr()]||txt.es)[k]||k;}
  function load(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}catch(e){return {}}}
  function save(p){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(p))}catch(e){}}
  function ensureToolsDrawer(){
    // Disabled: legacy drawer injected quick Suite Pro buttons into #v18Suite.
    // The active Suite Pro panel is owned by js/suite-pro.js.
    return null;
  }
  function ensureAutoFret(){
    const instrument=$('instrumentSelect'), fret=$('fretModeSelect'), view=$('viewToggleBtn');
    if(!instrument || instrument.dataset.v19AutoFret) return;
    instrument.dataset.v19AutoFret='1';
    instrument.addEventListener('change',()=>{
      const p=load();
      if(instrument.value==='guitar' || instrument.value==='guitarSteel' || instrument.value==='guitarElectric' || instrument.value==='ukulele' || instrument.value==='bass' || instrument.value==='lead' || instrument.value==='drums'){
        p.instrument=instrument.value; p.viewMode='fretboard'; p.fretMode=instrument.value==='ukulele'?'ukulele':instrument.value==='bass'?'bass':'guitar'; save(p);
        if(fret && instrument.value!=='drums') fret.value=p.fretMode;
        const pianoBox=$('pianoContainer');
        if(view && pianoBox && getComputedStyle(pianoBox).display!=='none') view.click();
      }
    }, true);
  }
  function ensureFlowPanel(){
    const prod=q('.prod-panel'); if(!prod || $('v19FlowPanel')) return;
    const panel=document.createElement('div'); panel.id='v19FlowPanel'; panel.className='v19-flow-panel';
    panel.innerHTML=`<h4>${T('flow')}</h4><div class="prod-grid"><div class="wide"><label>${T('select')}</label><select id="v19OutputSelect" class="v19-output-select"><option value="">${T('none')}</option></select></div><button class="mini-btn" id="v19DetectAudio" type="button">${T('detect')}</button></div><div id="v19FlowStatus" class="v19-status">${T('request')}</div>`;
    prod.appendChild(panel);
    if(window.Studio936Flow8 && typeof window.Studio936Flow8.initFlow8==='function'){
      window.Studio936Flow8.initFlow8({
        els:{
          v19DetectAudio:$('v19DetectAudio'),
          v19OutputSelect:$('v19OutputSelect'),
          v19FlowStatus:$('v19FlowStatus')
        },
        audioCtx:window.__studio936AudioCtx
      });
    } else {
      $('v19DetectAudio').onclick=detectOutputs;
      $('v19OutputSelect').onchange=async e=>{
        const id=e.target.value;
        if(!id) return;
        const ctx=window.__studio936AudioCtx;
        const status=$('v19FlowStatus');
        if(ctx && typeof ctx.setSinkId==='function'){
          try{ await ctx.setSinkId(id); status.textContent=T('ok'); status.className='v19-status good'; }
          catch(err){ status.textContent=T('unsupported'); status.className='v19-status warn'; }
        } else { status.textContent=T('unsupported'); status.className='v19-status warn'; }
      };
    }
  }
  async function detectOutputs(){
    if(window.Studio936Flow8 && typeof window.Studio936Flow8.detectOutputs==='function'){
      return window.Studio936Flow8.detectOutputs({
        els:{
          v19FlowStatus:$('v19FlowStatus'),
          v19OutputSelect:$('v19OutputSelect')
        },
        audioCtx:window.__studio936AudioCtx
      });
    }
    const status=$('v19FlowStatus'), select=$('v19OutputSelect');
    if(!navigator.mediaDevices?.enumerateDevices){ status.textContent=T('unsupported'); status.className='v19-status warn'; return; }
    try{
      if(navigator.mediaDevices.getUserMedia){
        try{ const s=await navigator.mediaDevices.getUserMedia({audio:true}); s.getTracks().forEach(t=>t.stop()); }catch(e){}
      }
      const devices=await navigator.mediaDevices.enumerateDevices();
      const outs=devices.filter(d=>d.kind==='audiooutput');
      select.innerHTML=outs.length?outs.map(d=>`<option value="${d.deviceId}">${(d.label||'Audio output').replace(/[<>]/g,'')}</option>`).join(''):`<option value="">${T('none')}</option>`;
      const flow=outs.find(d=>/flow\s*8|behringer|usb audio/i.test(d.label||''));
      if(flow){ select.value=flow.deviceId; status.textContent='Flow 8 detectado: '+flow.label+'. '+T('ok'); status.className='v19-status good'; select.dispatchEvent(new Event('change')); }
      else { status.textContent=outs.length?'Salidas detectadas. Si no ves Flow 8, selecciónalo como salida del sistema o reconecta USB.':T('none'); status.className='v19-status warn'; }
    }catch(e){ status.textContent=T('unsupported'); status.className='v19-status warn'; }
  }
  function patchHelp(){
    const body=q('#helpModal .help-body'); if(!body || q('.v19-help-block',body)) return;
    body.insertAdjacentHTML('beforeend', `<div class="help-block wide v19-help-block"><h3>18. Interfaz v19, diapasón automático y Flow 8</h3><ul><li><b>Herramientas:</b> la suite Pro queda en un panel lateral para liberar el piano. No se quitó nada; solo se organizó mejor.</li><li><b>Diapasón automático:</b> al escoger Guitarra o Ukelele, la app cambia a vista de mástil y usa afinación de guitarra o ukelele. Puedes volver a Vista piano cuando quieras.</li><li><b>Flow 8:</b> el panel detecta salidas de audio cuando el navegador lo permite. En Chrome/Edge desktop puede seleccionar la salida; en iPad/Safari normalmente debes elegir el Flow 8 desde el sistema operativo.</li><li><b>Acordes IA:</b> es un asistente armónico offline basado en reglas musicales. No envía datos a OpenAI/Gemini. Para IA generativa real hace falta un backend seguro para no exponer claves API.</li></ul></div>`);
  }
  function refreshText(){
    const b=$('v19ToolsToggle'); if(b){ b.textContent=$('s936SuitePro')?.classList.contains('is-open')?T('close'):T('tools'); b.title=T('open'); }
    const p=$('v19FlowPanel'); if(p){ q('h4',p).textContent=T('flow'); q('label',p).textContent=T('select'); $('v19DetectAudio').textContent=T('detect'); }
  }
  function init(){ ensureToolsDrawer(); ensureAutoFret(); ensureFlowPanel(); patchHelp(); refreshText(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(init,360)); else setTimeout(init,360);
  document.addEventListener('click',e=>{ if(e.target?.id==='helpBtn') setTimeout(patchHelp,120); if(e.target?.id==='langBtn') setTimeout(()=>{init(); refreshText();},260); });
})();

/* ---- Script block separator ---- */

// v20 producer patch: horizontal tools, current section moved right, automatic return to piano, and compact playable chord shapes for guitar/ukulele/bass.
(() => {
  'use strict';
  const STORAGE_KEY='pianoComposerSongwriterV14';
  const LANG_KEY='pianoComposerUiLangV15';
  const $=id=>document.getElementById(id);
  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const pcNames=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const solfege={do:'C',re:'D',mi:'E',fa:'F',sol:'G',la:'A',si:'B'};
  const tr=()=>((document.documentElement.lang||localStorage.getItem(LANG_KEY)||'es').startsWith('en')?'en':'es');
  const dict={
    es:{tools:'Herramientas',close:'Cerrar',current:'Sección actual',manual:'Modo manual',bar:'Compás',step:'Paso',shape:'Forma sugerida',open:'Abrir herramientas',chordView:'vista de acorde',notesView:'vista de notas',pianoBack:'Vista piano restaurada.',offline:'Acordes IA: asistente armónico offline basado en reglas; no usa nube todavía.'},
    en:{tools:'Tools',close:'Close',current:'Current section',manual:'Manual mode',bar:'Bar',step:'Step',shape:'Suggested shape',open:'Open tools',chordView:'chord view',notesView:'note view',pianoBack:'Piano view restored.',offline:'Chord AI: offline rule-based harmonic assistant; no cloud AI yet.'}
  };
  const T=k=>(dict[tr()]||dict.es)[k]||k;
  function s936EditorSurfaceActive(){
    const owner = document.body?.getAttribute?.('data-s936-surface-owner');
    return owner === 'editor' || document.body?.classList?.contains('s936-editor-guitar-surface') || document.body?.classList?.contains('s936-editor-drum-surface');
  }
  function load(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}catch(e){return {}}}
  function save(p){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(p))}catch(e){}}
  function midiToNote(m){const pc=((m%12)+12)%12; const oct=Math.floor(m/12)-1; return pcNames[pc]+oct;}
  function parseNote(token){
    if(!token) return null; token=String(token).trim().replace(/♯/g,'#').replace(/♭/g,'b');
    if(!token || /^R$/i.test(token)) return null;
    const m=token.match(/^([A-Ga-g](?:#|b)?|Do|Re|Mi|Fa|Sol|La|Si)(-?\d+)?$/i);
    if(!m) return null;
    let name=m[1]; let octave=m[2]!==undefined?Number(m[2]):3;
    const low=name.toLowerCase();
    if(solfege[low]) name=solfege[low];
    name=name[0].toUpperCase()+name.slice(1).replace('b','b');
    const base={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[name[0].toUpperCase()];
    if(base===undefined) return null;
    let pc=base;
    if(name.includes('#')) pc+=1;
    if(name.includes('b')) pc-=1;
    pc=((pc%12)+12)%12;
    return (octave+1)*12+pc;
  }
  function parseNotes(str){return String(str||'').split(/[\s,;]+/).map(x=>x.split(':')[0]).map(parseNote).filter(Number.isFinite)}
  function pcOfMidi(m){return ((m%12)+12)%12}
  function sectionNameFromSelect(){const sel=$('sectionSelect'); return sel?.selectedOptions?.[0]?.textContent?.trim() || $('sectionLabel')?.textContent || ''}
  function updateSuiteTop(){
    const header=q('header'), status=q('.status-bar');
    const top=(header?.offsetHeight||130)+(status?.offsetHeight||80)+10;
    document.documentElement.style.setProperty('--v20-suite-top', Math.max(170, top)+'px');
  }
  function ensureStatusLayout(){
    const status=q('.status-bar'), transport=q('.transport'), right=q('.status-bar .now-box:last-child'), left=q('.status-bar .now-box:first-child');
    if(!status||!transport||!right) return;
    status.classList.add('v20-status');
    if(left && left!==right) left.classList.add('v20-old-section');
    let slot=$('v20ToolSlot');
    if(!slot){slot=document.createElement('div'); slot.id='v20ToolSlot'; status.insertBefore(slot,status.firstElementChild);}
    const btn=$('v19ToolsToggle');
    if(btn && btn.parentElement!==slot) slot.appendChild(btn);
    let info=$('v20CurrentInfo');
    if(!info){
      info=document.createElement('div'); info.id='v20CurrentInfo'; info.className='v20-current-info';
      const tag=$('currentPartTag'); right.insertBefore(info,tag||right.children[2]||null);
    }
    refreshCurrentInfo(); updateSuiteTop();
  }
  function refreshCurrentInfo(){
    const info=$('v20CurrentInfo'); if(!info) return;
    const sec=$('sectionLabel')?.textContent?.trim() || sectionNameFromSelect() || '-';
    const measure=$('measureLabel')?.textContent?.trim() || '';
    info.innerHTML=`<div><div class="v20-info-k">${T('current')}</div><div class="v20-info-v">${escapeHtml(sec)}</div></div><div class="v20-info-measure">${escapeHtml(measure)}</div>`;
  }
  function escapeHtml(s){return String(s||'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
  function ensurePianoReturn(){
    const instrument=$('instrumentSelect'); if(!instrument || instrument.dataset.v20Return) return;
    instrument.dataset.v20Return='1';
    instrument.addEventListener('change',()=>{
      const p=load(); p.instrument=instrument.value;
      if(!['guitar','ukulele','bass','lead','drums'].includes(instrument.value)){
        p.viewMode='piano'; save(p);
        const piano=$('pianoContainer'), fret=$('fretboardContainer'), toggle=$('viewToggleBtn');
        if(piano) piano.style.display='flex';
        if(fret) fret.style.display='none';
        if(toggle) toggle.textContent=tr()==='en'?'Fretboard view':'Vista diapasón';
        setTimeout(updateChordShape,50);
      } else {
        setTimeout(updateChordShape,70);
      }
    }, true);
  }
  function currentStrings(mode){
    if(mode==='bass') return [{name:'G',midi:43},{name:'D',midi:38},{name:'A',midi:33},{name:'E',midi:28}];
    if(mode==='ukulele') return [{name:'A',midi:69},{name:'E',midi:64},{name:'C',midi:60},{name:'G',midi:67}];
    return [{name:'e',midi:64},{name:'B',midi:59},{name:'G',midi:55},{name:'D',midi:50},{name:'A',midi:45},{name:'E',midi:40}];
  }
  function selectedMode(){
    const inst=$('instrumentSelect')?.value || '';
    const fm=$('fretModeSelect')?.value || '';
    if(inst==='ukulele') return 'ukulele';
    if(inst==='guitar' || inst==='guitarSteel' || inst==='guitarElectric') return 'guitar';
    return fm || 'guitar';
  }
  function chordContext(){
    const name=$('chordName')?.value?.trim() || $('chordLabel')?.textContent?.trim() || 'Acorde';
    const notes=parseNotes($('chordNotes')?.value || '');
    const bass=parseNote($('bassInput')?.value || '');
    const pcs=new Set(notes.map(pcOfMidi));
    if(Number.isFinite(bass)) pcs.add(pcOfMidi(bass));
    return {name, notes, bass, pcs:[...pcs]};
  }
  function optionsForString(st,pcs,start,span){
    const opts=[null];
    for(let fret=0;fret<=12;fret++){
      if(fret!==0 && (fret<start || fret>start+span)) continue;
      const pc=pcOfMidi(st.midi+fret);
      if(pcs.includes(pc)) opts.push({fret,midi:st.midi+fret,pc});
    }
    return opts;
  }
  function chooseVoicing(ctx,mode){
    const strings=currentStrings(mode); const span=mode==='ukulele'?4:4; const minUsed=mode==='ukulele'?3:(mode==='bass'?2:4);
    if(!ctx.pcs.length) return null;
    const bassPc=Number.isFinite(ctx.bass)?pcOfMidi(ctx.bass):ctx.pcs[0];
    let best=null;
    for(let start=0;start<=8;start++){
      const all=strings.map(st=>optionsForString(st,ctx.pcs,start,span));
      function rec(i,combo){
        if(i===all.length){
          const used=combo.filter(Boolean); if(used.length<minUsed) return;
          const distinct=[...new Set(used.map(x=>x.pc))]; if(distinct.length<Math.min(3,ctx.pcs.length)) return;
          if(!distinct.includes(bassPc)) return;
          const fretted=used.filter(x=>x.fret>0).map(x=>x.fret);
          const minF=fretted.length?Math.min(...fretted):0, maxF=fretted.length?Math.max(...fretted):0;
          if(maxF-minF>span) return;
          const low=used.slice().sort((a,b)=>a.midi-b.midi)[0];
          const includesAll=ctx.pcs.filter(pc=>distinct.includes(pc)).length;
          let score=distinct.length*28 + used.length*4 + includesAll*8 - combo.filter(x=>!x).length*2 - (fretted.reduce((a,b)=>a+b,0)||0)*.35 - maxF*.6 - (maxF-minF)*5;
          if(low && low.pc===bassPc) score+=22;
          if(start>=1 && start<=5) score+=3;
          if(mode==='ukulele' && used.length===4) score+=6;
          if(!best || score>best.score) best={score,combo,strings,start};
          return;
        }
        for(const opt of all[i]) rec(i+1,combo.concat([opt]));
      }
      rec(0,[]);
    }
    return best;
  }
  function ensureShapeText(){
    const wrap=q('.fretboard-wrap'); if(!wrap) return null;
    wrap.classList.add('v20-chord-mode');
    let el=$('v20FretShapeText');
    if(!el){ el=document.createElement('div'); el.id='v20FretShapeText'; const head=q('.fretboard-head',wrap); head?.insertAdjacentElement('afterend',el); }
    return el;
  }
  function updateChordShape(){
    const owner = document.body?.getAttribute?.('data-s936-surface-owner');
    if(owner === 'editor' || document.body?.classList?.contains('s936-editor-guitar-surface') || document.body?.classList?.contains('s936-editor-drum-surface')) return;
    const fretCont=$('fretboardContainer'); if(!fretCont || getComputedStyle(fretCont).display==='none') return;
    if(fretCont.querySelector('.fret-cell.s936-main-voicing')) return;
    const cells=qa('.fret-cell'); if(!cells.length) return;
    cells.forEach(c=>{c.classList.remove('map-chord','map-bass','v20-shape','v20-root','v20-bass'); const sp=q('span',c); if(sp) sp.removeAttribute('data-finger');});
    qa('.string-label').forEach(s=>s.classList.remove('v20-muted'));
    const ctx=chordContext(); const mode=selectedMode();
    const shape=chooseVoicing(ctx,mode);
    const title=$('fretboardTitle'); if(title){
      const base=mode==='ukulele'?'Diapasón ukelele':mode==='bass'?'Diapasón bajo':'Diapasón guitarra';
      title.textContent=`${base} · ${ctx.name} · ${T('chordView')}`;
    }
    const text=ensureShapeText();
    if(!shape){ if(text) text.textContent=`${T('shape')}: no encontrada con estas notas. Revisa bajo/notas o cambia de inversión.`; return; }
    const bassPc=Number.isFinite(ctx.bass)?pcOfMidi(ctx.bass):null;
    const rootPc=bassPc;
    const shapeDesc=[];
    shape.combo.forEach((opt,si)=>{
      const label=qa('.string-label')[si];
      if(!opt){ label?.classList.add('v20-muted'); shapeDesc.push(`${shape.strings[si].name}:x`); return; }
      const cell=qa(`.fret-cell[data-string="${si}"][data-fret="${opt.fret}"]`)[0];
      if(cell){
        cell.classList.add('v20-shape');
        if(rootPc!==null && opt.pc===rootPc) cell.classList.add('v20-root');
        if(bassPc!==null && opt.pc===bassPc && opt.midi===shape.combo.filter(Boolean).sort((a,b)=>a.midi-b.midi)[0].midi) cell.classList.add('v20-bass');
        const sp=q('span',cell); if(sp) sp.setAttribute('data-finger', opt.fret===0?'0':String(opt.fret));
      }
      shapeDesc.push(`${shape.strings[si].name}:${opt.fret}`);
    });
    if(text) text.textContent=`${T('shape')}: ${ctx.name} · ${shapeDesc.join('  ')}`;
  }
  function patchHelp(){
    const body=q('#helpModal .help-body'); if(!body || q('.v20-help-block',body)) return;
    body.insertAdjacentHTML('beforeend', `<div class="help-block wide v20-help-block"><h3>19. Vista productor v20</h3><ul><li><b>Herramientas horizontal:</b> el botón ya no tapa la sección actual; abre/cierra la suite Pro desde la zona de transporte.</li><li><b>Sección actual:</b> ahora se muestra junto al acorde actual y al mapa de 16 pasos, para saber dónde va la canción sin mirar a la izquierda.</li><li><b>Diapasón por acordes:</b> al elegir Guitarra o Ukelele, la app intenta mostrar una <b>forma tocable</b> del acorde seleccionado, no todas las notas desperdigadas por el mástil.</li><li><b>Volver a piano:</b> al elegir Piano, Piano eléctrico, Órgano, Saxo o Synth, vuelve automáticamente al teclado.</li><li><b>Acordes IA:</b> sigue siendo un asistente offline por reglas musicales. Para IA generativa real conectada a OpenAI/Gemini se necesita backend seguro.</li></ul></div>`);
  }
  function attachObservers(){
    ['sectionLabel','measureLabel','currentPartTag','chordLabel'].forEach(id=>{const e=$(id); if(e) new MutationObserver(()=>{refreshCurrentInfo(); updateSuiteTop();}).observe(e,{childList:true,characterData:true,subtree:true});});
    ['chordName','bassInput','chordNotes','chordSelect','sectionSelect','instrumentSelect','fretModeSelect'].forEach(id=>{const e=$(id); if(e){ e.addEventListener('input',()=>setTimeout(updateChordShape,40),true); e.addEventListener('change',()=>setTimeout(()=>{refreshCurrentInfo(); updateChordShape();},90),true); }});
    const fret=$('fretboardContainer'); if(fret) new MutationObserver(()=>setTimeout(updateChordShape,30)).observe(fret,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});
    const help=$('helpBtn'); if(help) help.addEventListener('click',()=>setTimeout(patchHelp,120));
    const lang=$('langBtn'); if(lang) lang.addEventListener('click',()=>setTimeout(()=>{ensureStatusLayout(); patchHelp(); updateChordShape();},220));
    window.addEventListener('resize',updateSuiteTop);
  }
  function init(){
    document.title='Studio 936 Composer v22 iPad Layout + Touch Fix';
    const small=q('.brand small'); if(small) small.textContent='STUDIO 936 COMPOSER v20 PRODUCER UI';
    setTimeout(()=>{ensureStatusLayout(); ensurePianoReturn(); patchHelp(); attachObservers(); refreshCurrentInfo(); updateChordShape();},620);
    setTimeout(()=>{ensureStatusLayout(); refreshCurrentInfo(); updateChordShape();},1250);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();

/* ---- Script block separator ---- */

(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const q = (s,r=document) => r.querySelector(s);
  const qa = (s,r=document) => Array.from(r.querySelectorAll(s));
  const isTouch = () => ('ontouchstart' in window) || (navigator.maxTouchPoints||0) > 0 || matchMedia('(pointer:coarse)').matches;
  function s936EditorSurfaceActive(){
    const owner = document.body?.getAttribute?.('data-s936-surface-owner');
    return owner === 'editor' || document.body?.classList?.contains('s936-editor-guitar-surface') || document.body?.classList?.contains('s936-editor-drum-surface');
  }

  function markTouch(){ if(isTouch()) document.documentElement.classList.add('v22-touch'); }

  function normalizeViewFromInstrument(){
    if(s936EditorSurfaceActive()) return;
    const inst = $('instrumentSelect')?.value || 'piano';
    const piano = $('pianoContainer');
    const fret = $('fretboardContainer');
    const fretMode = $('fretModeSelect');
    const viewBtn = $('viewToggleBtn');
    const wantsMainSurface = inst === 'guitar' || inst === 'guitarSteel' || inst === 'guitarElectric' || inst === 'ukulele' || inst === 'bass' || inst === 'lead' || inst === 'drums';
    if(wantsMainSurface){
      if(fretMode && inst !== 'drums') fretMode.value = inst === 'ukulele' ? 'ukulele' : inst === 'bass' ? 'bass' : 'guitar';
      if(piano) piano.style.display = 'none';
      if(fret) fret.style.display = 'flex';
      if(viewBtn) viewBtn.textContent = (document.documentElement.lang||'es').startsWith('en') ? 'Piano view' : 'Vista piano';
      try {
        if(inst === 'drums') scheduleMainDrumSurface();
        else renderMainStringSurface(chordIdx,true);
      } catch(_) {}
    } else {
      try { clearMainStringSurface(); clearMainDrumSurface(); resetMainSurfaceClasses(); } catch(_) {}
      if(piano) piano.style.display = 'flex';
      if(fret) fret.style.display = 'none';
      if(viewBtn) viewBtn.textContent = (document.documentElement.lang||'es').startsWith('en') ? 'Fretboard view' : 'Vista diapasón';
    }
  }

  // iOS/Safari sometimes fails to deliver normal click reliably after a touch when complex overlays exist.
  // This sends one explicit click on touchend and suppresses the duplicate native click that may follow.
  function bindTouchButtons(){
    if(!isTouch()) return;
    let lastTouchBtn = null;
    let lastTouchTime = 0;
    document.addEventListener('touchend', ev => {
      const btn = ev.target && ev.target.closest && ev.target.closest('button');
      if(!btn || btn.disabled) return;
      if(btn.closest('.modal-backdrop,.v18-modal') && ev.target.classList.contains('v18-modal')) return;
      ev.preventDefault();
      ev.stopPropagation();
      lastTouchBtn = btn;
      lastTouchTime = Date.now();
      try{
        btn.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
      }catch(e){ try{ btn.click(); }catch(_){} }
    }, {capture:true, passive:false});
    document.addEventListener('click', ev => {
      const btn = ev.target && ev.target.closest && ev.target.closest('button');
      if(btn && btn === lastTouchBtn && ev.isTrusted && Date.now() - lastTouchTime < 750){
        ev.preventDefault();
        ev.stopImmediatePropagation();
      }
    }, {capture:true});
  }

  // Robust piano touch bridge: find the key under each finger and dispatch the same pointerdown that desktop uses.
  function bindPianoTouchBridge(){
    const piano = $('piano');
    if(!piano || piano.dataset.v22TouchBridge) return;
    piano.dataset.v22TouchBridge = '1';
    const recent = new Map();
    const fireKey = (touch, idx=0) => {
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const key = el && el.closest && el.closest('.key');
      if(!key || !key.dataset.midi) return;
      const midi = key.dataset.midi;
      const now = performance.now();
      const last = recent.get(midi) || 0;
      if(now - last < 90) return;
      recent.set(midi, now);
      try{
        if(window.PointerEvent){
          key.dispatchEvent(new PointerEvent('pointerdown',{
            bubbles:true,cancelable:true,pointerId:9000+idx,pointerType:'touch',isPrimary:idx===0,
            clientX:touch.clientX,clientY:touch.clientY,pressure:touch.force || .5
          }));
        } else {
          key.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true,clientX:touch.clientX,clientY:touch.clientY,view:window}));
        }
      }catch(e){
        key.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true,clientX:touch.clientX,clientY:touch.clientY,view:window}));
      }
    };
    piano.addEventListener('touchstart', ev => {
      ev.preventDefault();
      ev.stopPropagation();
      Array.from(ev.changedTouches || []).forEach(fireKey);
    }, {capture:true, passive:false});
    piano.addEventListener('touchmove', ev => {
      ev.preventDefault();
      Array.from(ev.changedTouches || []).forEach(fireKey);
    }, {capture:true, passive:false});
    piano.addEventListener('contextmenu', ev => ev.preventDefault(), {capture:true});
  }

  function bindSelectVisuals(){
    const inst = $('instrumentSelect');
    if(inst && !inst.dataset.v22Visual){
      inst.dataset.v22Visual = '1';
      inst.addEventListener('change', () => setTimeout(normalizeViewFromInstrument, 90), true);
    }
    const view = $('viewToggleBtn');
    if(view && !view.dataset.v22Visual){
      view.dataset.v22Visual = '1';
      view.addEventListener('click', () => setTimeout(normalizeViewFromInstrument, 120), true);
    }
  }

  function fixToolLabel(){
    const btn = $('v19ToolsToggle');
    if(btn){
      btn.style.writingMode = 'horizontal-tb';
      btn.style.transform = 'none';
      if(!btn.textContent.trim()) btn.textContent = (document.documentElement.lang||'es').startsWith('en') ? 'Tools' : 'Herramientas';
    }
  }

  function relayout(){
    markTouch();
    bindPianoTouchBridge();
    bindSelectVisuals();
    normalizeViewFromInstrument();
    fixToolLabel();
  }

  document.addEventListener('DOMContentLoaded', () => setTimeout(relayout, 250));
  window.addEventListener('load', () => setTimeout(relayout, 500));
  window.addEventListener('resize', () => setTimeout(relayout, 150));
  bindTouchButtons();
  setTimeout(relayout, 800);
})();

/* ---- Script block separator ---- */

(() => {
  'use strict';
  const STORAGE_KEY='pianoComposerSongwriterV14';
  const LANG_KEY='pianoComposerUiLangV15';
  const $=id=>document.getElementById(id);
  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const pcNames=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const solfege={do:'C',re:'D',mi:'E',fa:'F',sol:'G',la:'A',si:'B'};
  const tr=()=>((document.documentElement.lang||localStorage.getItem(LANG_KEY)||'es').startsWith('en')?'en':'es');
  const dict={
    es:{zoom:'Tocar Piano',closeZoom:'Cerrar zoom',charts:'Charts de acordes',hint:'Toca un chart para cargar ese acorde en el editor',shape:'Forma',noShape:'Sin forma clara',tools:'Herramientas'},
    en:{zoom:'Play Piano',closeZoom:'Close zoom',charts:'Chord charts',hint:'Tap a chart to load that chord into the editor',shape:'Shape',noShape:'No clear shape',tools:'Tools'}
  };
  const T=k=>{
    if(k==='zoom' && window.Studio936I18nCore) return window.Studio936I18nCore.t('icons.pianoZoom');
    return (dict[tr()]||dict.es)[k]||k;
  };
  function load(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}catch(e){return {}}}
  function save(p){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(p))}catch(e){}}
  function parseNote(token){
    if(!token) return null; token=String(token).trim().replace(/♯/g,'#').replace(/♭/g,'b');
    if(!token || /^R$/i.test(token)) return null;
    const m=token.match(/^([A-Ga-g](?:#|b)?|Do|Re|Mi|Fa|Sol|La|Si)(-?\d+)?$/i);
    if(!m) return null;
    let name=m[1]; let octave=m[2]!==undefined?Number(m[2]):3;
    const low=name.toLowerCase(); if(solfege[low]) name=solfege[low];
    name=name[0].toUpperCase()+name.slice(1);
    const base={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[name[0].toUpperCase()]; if(base===undefined) return null;
    let pc=base; if(name.includes('#')) pc++; if(name.includes('b')) pc--; pc=((pc%12)+12)%12;
    return (octave+1)*12+pc;
  }
  function parseNotes(str){return String(str||'').split(/[\s,;]+/).map(x=>x.split(':')[0]).map(parseNote).filter(Number.isFinite)}
  function pcOfMidi(m){return ((m%12)+12)%12}
  function currentSection(){return $('sectionSelect')?.value || 'intro'}
  function currentIndex(){return Math.max(0,Number($('chordSelect')?.value)||0)}
  function getSeq(){
    const p=load(); const sec=currentSection();
    if(p.sections && Array.isArray(p.sections[sec])) return p.sections[sec];
    // Fallback from the visible selector if localStorage is empty.
    const opts=qa('#chordSelect option'); return opts.map(o=>({name:o.textContent.replace(/^\d+\.\s*/, '').split('·')[0].trim(), bass:$('bassInput')?.value||'C2', notes:$('chordNotes')?.value||'C3 E3 G3', bars:1}));
  }
  function mode(){
    const inst=$('instrumentSelect')?.value || 'piano';
    if(['piano','drums','guitar','ukulele','bass','lead'].includes(inst)) return inst;
    const fm=$('fretModeSelect')?.value || 'guitar';
    return fm==='ukulele'?'ukulele':fm==='bass'?'bass':'guitar';
  }
  function stringsFor(m){
    if(m==='bass') return [{name:'G',midi:43},{name:'D',midi:38},{name:'A',midi:33},{name:'E',midi:28}];
    if(m==='ukulele') return [{name:'A',midi:69},{name:'E',midi:64},{name:'C',midi:60},{name:'G',midi:67}];
    return [{name:'e',midi:64},{name:'B',midi:59},{name:'G',midi:55},{name:'D',midi:50},{name:'A',midi:45},{name:'E',midi:40}];
  }
  function chordCtx(ch){
    const notes=parseNotes(ch?.notes||''); const bass=parseNote(ch?.bass||'');
    const pcs=new Set(notes.map(pcOfMidi)); if(Number.isFinite(bass)) pcs.add(pcOfMidi(bass));
    return {name:ch?.name||'Chord', notes, bass, pcs:[...pcs]};
  }
  function optionsForString(st,pcs,start,span){
    const opts=[null];
    for(let fret=0; fret<=12; fret++){
      if(fret!==0 && (fret<start || fret>start+span)) continue;
      const pc=pcOfMidi(st.midi+fret); if(pcs.includes(pc)) opts.push({fret,midi:st.midi+fret,pc});
    }
    return opts;
  }
  function chooseVoicing(ctx,m){
    if(!ctx.pcs.length) return null;
    const strings=stringsFor(m); const span=m==='bass'?5:4; const minUsed=m==='ukulele'?3:(m==='bass'?2:4);
    const bassPc=Number.isFinite(ctx.bass)?pcOfMidi(ctx.bass):ctx.pcs[0]; let best=null;
    for(let start=0; start<=8; start++){
      const all=strings.map(st=>optionsForString(st,ctx.pcs,start,span));
      function rec(i,combo){
        if(i===all.length){
          const used=combo.filter(Boolean); if(used.length<minUsed) return;
          const distinct=[...new Set(used.map(x=>x.pc))]; if(distinct.length<Math.min(3,ctx.pcs.length)) return;
          const fretted=used.filter(x=>x.fret>0).map(x=>x.fret); const minF=fretted.length?Math.min(...fretted):0, maxF=fretted.length?Math.max(...fretted):0;
          if(maxF-minF>span) return;
          const low=used.slice().sort((a,b)=>a.midi-b.midi)[0];
          let score=distinct.length*28 + used.length*5 - combo.filter(x=>!x).length*3 - maxF*.7 - (maxF-minF)*5;
          if(distinct.includes(bassPc)) score+=18; if(low && low.pc===bassPc) score+=22; if(start>=1 && start<=5) score+=4;
          if(m==='ukulele' && used.length===4) score+=8;
          if(!best || score>best.score) best={score,combo,strings,start}; return;
        }
        for(const opt of all[i]) rec(i+1,combo.concat([opt]));
      }
      rec(0,[]);
    }
    return best;
  }
  function baseFret(shape){
    if(!shape) return 1;
    const frets=shape.combo.filter(Boolean).map(x=>x.fret).filter(f=>f>0);
    if(!frets.length) return 1; const min=Math.min(...frets), max=Math.max(...frets);
    return max<=4 ? 1 : min;
  }
  function chartHtml(ch,idx,active,m){
    const ctx=chordCtx(ch); const shape=chooseVoicing(ctx,m); const strings=stringsFor(m); const base=baseFret(shape); const fretsToShow=4;
    const width=82, height=82, left=9, right=75, top=12, bottom=70;
    const strX = si => left + (right-left)*(si/(Math.max(1,strings.length-1)));
    const fretY = fi => top + (bottom-top)*(fi/fretsToShow);
    let html=`<button class="v23-chart-card ${active?'active':''}" type="button" data-v23-chart="${idx}"><div class="v23-chart-name">${esc(ch.name||'Chord')}</div><div class="v23-mini-chart">`;
    strings.forEach((_,si)=>{html+=`<span class="s" style="left:${strX(si)}px"></span>`});
    for(let f=0; f<=fretsToShow; f++) html+=`<span class="f ${f===0 && base===1?'nut':''}" style="top:${fretY(f)}px"></span>`;
    if(base>1) html+=`<span class="v23-base-fret">${base}fr</span>`;
    if(shape){
      const rootPc=Number.isFinite(ctx.bass)?pcOfMidi(ctx.bass):ctx.pcs[0];
      shape.combo.forEach((opt,si)=>{
        const x=strX(si);
        if(!opt){html+=`<span class="v23-muted-x" style="left:${x}px">×</span>`; return;}
        if(opt.fret===0){html+=`<span class="v23-dot open" style="left:${x}px;top:3px">○</span>`; return;}
        const rel=opt.fret-base+1; if(rel<1 || rel>fretsToShow) return;
        const y=(fretY(rel-1)+fretY(rel))/2;
        html+=`<span class="v23-dot ${opt.pc===rootPc?'root':''}" style="left:${x}px;top:${y}px">${opt.fret}</span>`;
      });
    } else {
      html+=`<span style="position:absolute;left:8px;right:8px;top:35px;text-align:center;color:#aaa;font-size:.55rem;font-weight:900">${T('noShape')}</span>`;
    }
    html+=`</div><div class="v23-chart-meta">${esc(ch.bass||'')} · ${esc(ch.bars||1)} bar</div></button>`;
    return html;
  }
  function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function ensureChartBox(){
    const cont=$('fretboardContainer'); if(!cont) return null;
    let box=$('v23ChordCharts');
    if(!box){ box=document.createElement('div'); box.id='v23ChordCharts'; cont.appendChild(box); }
    return box;
  }
  function s936EditorSurfaceActive(){
    const owner = document.body?.getAttribute?.('data-s936-surface-owner');
    return owner === 'editor' || document.body?.classList?.contains('s936-editor-guitar-surface') || document.body?.classList?.contains('s936-editor-drum-surface') || !!document.querySelector?.('#s936EditorGuitarSurface, #s936EditorDrumPanel, [data-s936-editor-surface="1"]');
  }
  function renderChordCharts(){
    if(s936EditorSurfaceActive()){
      const box=$('v23ChordCharts');
      if(box) box.style.display='none';
      return;
    }
    const cont=$('fretboardContainer'); if(!cont) return;
    const visible=getComputedStyle(cont).display!=='none';
    const box=ensureChartBox(); if(!box) return;
    const seq=getSeq(); const m=mode(); const idx=currentIndex();
    box.style.display = (visible && m === 'guitar') ? 'block' : 'none';
    if(box.style.display==='none') return;
    box.innerHTML=`<div class="v23-chart-head"><span>${T('charts')} · ${m.toUpperCase()}</span><span class="v23-chart-sub">${T('hint')}</span></div><div class="v23-chart-row">${seq.map((ch,i)=>chartHtml(ch,i,i===idx,m)).join('')}</div>`;
    qa('[data-v23-chart]',box).forEach(btn=>{
      btn.addEventListener('click',()=>{
        const i=Number(btn.dataset.v23Chart)||0;
        const sel=$('chordSelect'); if(sel){ sel.value=i; sel.dispatchEvent(new Event('change',{bubbles:true})); }
        setTimeout(()=>{ renderChordCharts(); forceSelectedShape(); },90);
      });
      btn.addEventListener('touchend',ev=>{ ev.preventDefault(); btn.click(); },{passive:false});
    });
  }
  function forceSelectedShape(){
    // Keep fretboard as chord-shape view by reusing the visible editor as source.
    renderChordCharts();
  }
  function setPianoView(){
    const piano=$('pianoContainer'), fret=$('fretboardContainer'), btn=$('viewToggleBtn');
    if(piano) piano.style.display='flex'; if(fret) fret.style.display='none';
    if(btn) btn.textContent=tr()==='en'?'Fretboard view':'Vista diapasón';
    const p=load(); p.viewMode='piano'; save(p);
  }
  let prevView=null;
  function openZoom(){
    prevView = getComputedStyle($('fretboardContainer')||document.body).display !== 'none' ? 'fretboard' : 'piano';
    setPianoView(); document.documentElement.classList.add('v23-zoom-on');
    const btn=$('pianoZoomBtn'); if(btn){btn.classList.add('active'); const sp=btn.querySelector('span'); if(sp) sp.textContent=tr()==='en'?'Close zoom':'Cerrar zoom'; else btn.textContent=tr()==='en'?'Close zoom':'Cerrar zoom';}
  }
  function closeZoom(){
    document.documentElement.classList.remove('v23-zoom-on');
    const btn=$('pianoZoomBtn'); if(btn){btn.classList.remove('active'); const sp=btn.querySelector('span'); if(sp) sp.textContent=T('zoom'); else btn.textContent=T('zoom');}
    const inst=$('instrumentSelect')?.value||'piano';
    if(prevView==='fretboard' && ['guitar','ukulele','bass'].includes(inst)){
      const piano=$('pianoContainer'), fret=$('fretboardContainer'), toggle=$('viewToggleBtn');
      if(piano) piano.style.display='none'; if(fret) fret.style.display='flex'; if(toggle) toggle.textContent=tr()==='en'?'Piano view':'Vista piano';
      renderChordCharts();
    }
  }
  function ensureZoomButton(){
    const transport=q('.transport'); if(!transport || $('pianoZoomBtn')) return;
    const b=document.createElement('button'); b.id='pianoZoomBtn'; b.type='button'; b.className='btn btn-dark img-icon-btn'; b.setAttribute('data-tip', T('zoom'));
    const img=document.createElement('img'); img.src='docs/icon/play_piano_icon.png'; img.alt=T('zoom');
    const fallbackText=document.createElement('span'); fallbackText.style.display='none'; fallbackText.textContent=T('zoom');
    img.onerror=()=>{ img.style.display='none'; fallbackText.style.display='inline'; };
    b.append(img, fallbackText);
    const anchor=$('channelMixerBtn')||$('libraryBtn')||$('saveBtn'); transport.insertBefore(b, anchor || null);
    b.addEventListener('click',()=>{ document.documentElement.classList.contains('v23-zoom-on') ? closeZoom() : openZoom(); });
    b.addEventListener('touchend',ev=>{ev.preventDefault(); b.click();},{passive:false});
    let close=$('v23ZoomClose');
    if(!close){ close=document.createElement('button'); close.id='v23ZoomClose'; close.type='button'; close.textContent=T('closeZoom'); document.body.appendChild(close); }
    close.onclick=closeZoom;
    close.addEventListener('touchend',ev=>{ev.preventDefault(); closeZoom();},{passive:false});
  }
  function ensureUxCleanup(){
    const status=q('.status-bar'); if(status){ status.classList.add('v20-status'); const boxes=qa(':scope > .now-box',status); if(boxes[0]) boxes[0].classList.add('v20-old-section'); }
    const tool=$('v19ToolsToggle'); if(tool){ tool.style.writingMode='horizontal-tb'; tool.style.transform='none'; if(!tool.textContent.trim() || /herramientas|tools/i.test(tool.textContent)) tool.textContent=T('tools'); }
  }
  function forceInstrumentView(){
    if(s936EditorSurfaceActive()) return;
    const inst=$('instrumentSelect')?.value||'piano';
    const piano=$('pianoContainer'), fret=$('fretboardContainer'), toggle=$('viewToggleBtn'), fm=$('fretModeSelect');
    if(['guitar','guitarSteel','guitarElectric','ukulele','bass','lead'].includes(inst)){
      if(fm) fm.value=inst==='ukulele'?'ukulele':inst==='bass'?'bass':'guitar';
      if(piano) piano.style.display='none'; if(fret) fret.style.display='flex';
      if(toggle) toggle.textContent=tr()==='en'?'Piano view':'Vista piano';
      try { renderMainStringSurface(chordIdx,true); } catch(_) {}
      setTimeout(renderChordCharts,80);
    }else if(inst==='drums'){
      if(piano) piano.style.display='none'; if(fret) fret.style.display='flex';
      if(toggle) toggle.textContent=tr()==='en'?'Piano view':'Vista piano';
      try { scheduleMainDrumSurface(); } catch(_) {}
      const box=$('v23ChordCharts'); if(box) box.style.display='none';
    }else if(!document.documentElement.classList.contains('v23-zoom-on')){
      if(piano) piano.style.display='flex'; if(fret) fret.style.display='none';
      if(toggle) toggle.textContent=tr()==='en'?'Fretboard view':'Vista diapasón';
    }
  }
  function patchHelp(){
    const body=q('#helpModal .help-body'); if(!body || q('.v23-help-block',body)) return;
    body.insertAdjacentHTML('beforeend', tr()==='en' ?
      `<div class="help-block wide v23-help-block"><h3>20. v23: Piano zoom and real chord charts</h3><ul><li><b>Piano zoom:</b> opens the piano in a full-screen close-up for iPad or touch screens. Use it when you want larger keys without changing the song.</li><li><b>Chord charts:</b> when Guitar, Ukulele or Bass is selected, the app shows playable chord-shape cards for every chord in the current section. Tap a card to load that chord in the progression editor.</li><li><b>Fretboard:</b> the large fretboard still shows the selected chord; the chart strip shows the full section.</li></ul></div>` :
      `<div class="help-block wide v23-help-block"><h3>20. v23/v25: Zoom de piano, charts y estructura real</h3><ul><li><b>Zoom piano:</b> abre el teclado en primer plano para iPad o pantallas táctiles. Úsalo cuando quieras teclas más grandes sin cambiar la canción.</li><li><b>Charts de acordes:</b> al elegir Guitarra, Ukelele o Bajo, la app muestra tarjetas con formas tocables para cada acorde de la sección actual. Toca un chart para cargar ese acorde en el editor.</li><li><b>Diapasón:</b> el mástil grande sigue mostrando el acorde seleccionado; la franja de charts muestra toda la sección.</li></ul></div>`);
  }
  function bind(){
    ['instrumentSelect','sectionSelect','chordSelect','fretModeSelect'].forEach(id=>{const e=$(id); if(e && !e.dataset.v23){e.dataset.v23='1'; e.addEventListener('change',()=>setTimeout(()=>{forceInstrumentView(); renderChordCharts();},120),true);}});
    ['chordName','bassInput','chordNotes','barsInput'].forEach(id=>{const e=$(id); if(e && !e.dataset.v23){e.dataset.v23='1'; e.addEventListener('input',()=>setTimeout(renderChordCharts,180),true); e.addEventListener('change',()=>setTimeout(renderChordCharts,180),true);}});
    const help=$('helpBtn'); if(help && !help.dataset.v23){help.dataset.v23='1'; help.addEventListener('click',()=>setTimeout(patchHelp,160));}
    const lang=$('langBtn'); if(lang && !lang.dataset.v23){lang.dataset.v23='1'; lang.addEventListener('click',()=>setTimeout(()=>{ const z=$('pianoZoomBtn'); if(z && !z.classList.contains('active')){ const sp=z.querySelector('span'); if(sp) sp.textContent=T('zoom'); else z.textContent=T('zoom'); } const c=$('v23ZoomClose'); if(c) c.textContent=T('closeZoom'); patchHelp(); renderChordCharts(); },220));}
    const fret=$('fretboardContainer'); if(fret && !fret.dataset.v23Obs){fret.dataset.v23Obs='1'; new MutationObserver(()=>setTimeout(renderChordCharts,100)).observe(fret,{attributes:true,childList:true,subtree:false});}
  }
  function init(){
    document.title='Studio 936 Composer v25 Song Structure Builder';
    const small=q('.brand small'); if(small) small.textContent='STUDIO 936 COMPOSER v25 · SONG STRUCTURE BUILDER';
    ensureZoomButton(); ensureUxCleanup(); bind(); forceInstrumentView(); renderChordCharts(); patchHelp();
    setTimeout(()=>{ensureZoomButton(); ensureUxCleanup(); forceInstrumentView(); renderChordCharts();},700);
    setInterval(()=>{ if(getComputedStyle($('fretboardContainer')||document.body).display!=='none') renderChordCharts(); },2000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();

/* ---- Script block separator ---- */

(function(){
  const $=id=>document.getElementById(id), q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  function lang(){return document.documentElement.lang==='en'?'en':'es'}
  function label(k){
    const es={workspace:'Workspace',editor:'Editor',structure:'Estructura',lyrics:'Letra/TAB',export:'Exportar/Flow',suite:'Suite Pro',help:'Ayuda',close:'Cerrar panel',editorTitle:'Editor de progresión y melodía',structureTitle:'Constructor de estructura',exportTitle:'Guardar, compartir, Flow 8 y ritmo'};
    const en={workspace:'Workspace',editor:'Editor',structure:'Structure',lyrics:'Lyrics/TAB',export:'Export/Flow',suite:'Pro Suite',help:'Help',close:'Close panel',editorTitle:'Progression and melody editor',structureTitle:'Song structure builder',exportTitle:'Save, share, Flow 8 and rhythm'};
    return (lang()==='en'?en:es)[k]||k;
  }
  function classifyCards(){
    const ed=q('.editor'); if(!ed) return;
    qa(':scope > .card, :scope > .structure-card',ed).forEach(c=>{
      const h=(q('h3',c)?.textContent||'').toLowerCase();
      c.classList.remove('ux-editor','ux-section','ux-export');
      if(c.classList.contains('structure-card')||h.includes('constructor')) return;
      if(h.includes('editor')||h.includes('progression')) c.classList.add('ux-editor');
      else if(h.includes('sección')||h.includes('section')||h.includes('melod')) c.classList.add('ux-section');
      else if(h.includes('guardar')||h.includes('save')||h.includes('share')||h.includes('ritmo')||h.includes('rhythm')) c.classList.add('ux-export');
    });
  }
  function updateLabels(){
    const bar=$('v25UxBar'); if(!bar) return;
    q('.ux-title',bar).textContent=label('workspace');
    qa('[data-ux-open]',bar).forEach(b=>b.textContent=label(b.dataset.uxOpen));
    const x=$('v25UxClose'); if(x) x.textContent=label('close');
    const ed=q('.editor'); if(ed){const p=ed.dataset.uxPanel||'editor'; ed.dataset.uxTitle=p==='structure'?label('structureTitle'):p==='export'?label('exportTitle'):label('editorTitle');}
  }
  function makeBar(){
    // Cambio 99: la barra "WORKSPACE / ÁREAS" (Estructura/Editor/Letra/Export/
    // Suite Pro/Ayuda) se apaga a pedido explícito — Suite Pro ya cubre Editor
    // y Letra/TAB, Exportar/Flow ya lo cubre Suite Pro, y Ayuda se movió a un
    // botón propio en el header. No se borran las funciones que referencian
    // #v25UxBar (openPanel, closeEditor, touchSafe, etc.) porque todas ya
    // hacen `if(!bar) return` — quedan inertes sin riesgo de romper nada.
    return;
    if($('v25UxBar')) return;
    const status=q('.status-bar'); if(!status) return;
    const bar=document.createElement('section'); bar.id='v25UxBar';
    bar.innerHTML='<span class="ux-title">Workspace</span><button type="button" class="v25ux-btn" data-ux-open="editor">Editor</button><button type="button" class="v25ux-btn" data-ux-open="structure">Estructura</button><button type="button" class="v25ux-btn" data-ux-open="lyrics">Letra/TAB</button><button type="button" class="v25ux-btn" data-ux-open="export">Exportar/Flow</button><button type="button" class="v25ux-btn" data-ux-open="suite">Suite Pro</button><button type="button" class="v25ux-btn" data-ux-open="help">Ayuda</button><span class="ux-spacer"></span><button type="button" class="v25ux-btn close" id="v25UxClose">Cerrar panel</button>';
    status.insertAdjacentElement('afterend',bar);
    bar.addEventListener('click',ev=>{
      const b=ev.target.closest('[data-ux-open]'); if(!b) return;
      ev.preventDefault();
      const p=b.dataset.uxOpen;
      if(p==='lyrics'){ $('lyricsBtn')?.click(); closeEditor(); return; }
      if(p==='help'){ $('helpBtn')?.click(); closeEditor(); return; }
      if(p==='suite'){ toggleSuite(); return; }
      openPanel(p);
    });
    $('v25UxClose').addEventListener('click',closeAll);
  }
  function ensureSuiteProMounted(){
    // Suite Pro is owned by js/suite-pro.js. app.js must not create or populate legacy v18 Suite UI.
    if(window.Studio936SuitePro && typeof window.Studio936SuitePro.ensurePanel === 'function'){
      return window.Studio936SuitePro.ensurePanel();
    }
    return document.getElementById('s936SuitePro');
  }
  window.Studio936EnsureSuiteProMounted=ensureSuiteProMounted;
  window.Studio936DebugSuite=function(){
    const suite=document.getElementById('s936SuitePro');
    const btn=document.querySelector('#v25UxBar [data-ux-open="suite"]');
    const cs=suite?getComputedStyle(suite):null;
    return {
      suiteExists:!!suite,
      suiteClass:suite?suite.className:null,
      buttonExists:!!btn,
      isOpen:!!suite?.classList.contains('is-open'),
      display:cs?cs.display:null,
      visibility:cs?cs.visibility:null,
      text:suite?suite.textContent.slice(0,200):'',
      bodyClass:document.body.className
    };
  };
  function openPanel(p){
    classifyCards();
    const ed=q('.editor'); if(!ed) return;
    ed.dataset.uxPanel=p; ed.dataset.uxTitle=p==='structure'?label('structureTitle'):p==='export'?label('exportTitle'):label('editorTitle');
    ed.classList.add('ux-open');
    qa('#v25UxBar .v25ux-btn').forEach(b=>b.classList.toggle('active',b.dataset.uxOpen===p));
    if(window.Studio936SuitePro?.close) window.Studio936SuitePro.close(); const tb=$('v19ToolsToggle'); if(tb) tb.classList.remove('open');
  }
  function closeEditor(){const ed=q('.editor'); if(ed) ed.classList.remove('ux-open'); qa('#v25UxBar .v25ux-btn').forEach(b=>b.classList.remove('active'));}
  function ensureSuitePanelIntegrity(suite){
    // Suite Pro is owned by js/suite-pro.js. Do not rebuild legacy buttons here.
    return suite || (window.Studio936SuitePro?.ensurePanel ? window.Studio936SuitePro.ensurePanel() : null);
  }
  function toggleSuite(){
    if(window.Studio936SuitePro && typeof window.Studio936SuitePro.toggle === 'function'){
      window.Studio936SuitePro.toggle();
      qa('#v25UxBar .v25ux-btn').forEach(b=>b.classList.toggle('active',b.dataset.uxOpen==='suite'));
      const ed=q('.editor'); if(ed) ed.classList.remove('ux-open');
      return;
    }
    console.warn('Studio936SuitePro no está cargado. Revisa js/suite-pro.js en index.html.');
  }
  function closeAll(){closeEditor(); if(window.Studio936SuitePro?.close) window.Studio936SuitePro.close(); const tb=$('v19ToolsToggle'); if(tb) tb.classList.remove('open');}
  function touchSafe(){qa('#v25UxBar button').forEach(b=>{if(b.dataset.v25uxTouch) return; b.dataset.v25uxTouch='1'; b.addEventListener('touchend',ev=>{ev.preventDefault(); b.click();},{passive:false});});}
  function refresh(){document.body.classList.add('v25ux-clean'); const small=q('.brand small'); if(small) small.textContent='STUDIO 936 COMPOSER v25 UX · CLEAN WORKSPACE'; makeBar(); classifyCards(); updateLabels(); touchSafe();}
  function observe(){const ed=q('.editor'); if(ed&&!ed.dataset.v25uxObs){ed.dataset.v25uxObs='1'; new MutationObserver(()=>classifyCards()).observe(ed,{childList:true,subtree:false});} const lb=$('langBtn'); if(lb&&!lb.dataset.v25ux){lb.dataset.v25ux='1'; lb.addEventListener('click',()=>setTimeout(updateLabels,180));} document.addEventListener('keydown',ev=>{if(ev.key==='Escape')closeAll();});}
  function init(){refresh(); observe(); setTimeout(refresh,450); setTimeout(refresh,1200);}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();

/* ---- Script block separator ---- */

(function(){
  const $=id=>document.getElementById(id), q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  function L(es,en){return document.documentElement.lang==='en'?en:es;}
  function getParts(){try{ if(typeof arrangementParts==='function') return arrangementParts(); }catch(e){} try{ return (project&&Array.isArray(project.arrangement))?project.arrangement:[]; }catch(e){ return []; }}
  function secName(k){try{return sectionNames[k]||k}catch(e){return k}}
  function addPanelClose(){const ed=q('.editor'); if(!ed || $('v25uxPanelClose')) return; const b=document.createElement('button'); b.id='v25uxPanelClose'; b.type='button'; b.className='v25ux-panel-close'; b.textContent=L('Cerrar','Close'); b.addEventListener('click',()=>{ed.classList.remove('ux-open'); qa('#v25UxBar .v25ux-btn').forEach(x=>x.classList.remove('active'));}); b.addEventListener('touchend',ev=>{ev.preventDefault(); b.click();},{passive:false}); ed.insertBefore(b, ed.firstChild);}
  function addSuiteClose(){ return null; }
  function addArrangementSelect(){const bar=$('v25UxBar'); if(!bar) return; let wrap=$('v25uxPartWrap'); if(!wrap){wrap=document.createElement('span'); wrap.id='v25uxPartWrap'; wrap.className='v25ux-part-wrap'; wrap.innerHTML='<label for="v25uxPartSelect">'+L('Orden actual','Current order')+'</label><select id="v25uxPartSelect" aria-label="'+L('Parte del arreglo','Arrangement part')+'"></select>'; const close=$('v25UxClose'); bar.insertBefore(wrap, close || null); $('v25uxPartSelect').addEventListener('change',ev=>{ const idx=Number(ev.target.value)||0; selectArrangementPart(idx); });} refreshArrangementSelect();}
  function refreshArrangementSelect(){const sel=$('v25uxPartSelect'); if(!sel) return; const parts=getParts(); let current=0; try{ current=Number(selectedArrangementIndex)||0; }catch(e){} if(current<0||current>=parts.length) current=0; sel.innerHTML=parts.map((p,i)=>`<option value="${i}">${i+1}. ${(p.label||secName(p.section))} · ${secName(p.section)}</option>`).join(''); sel.value=String(current);}
  function refreshLabels(){const pc=$('v25uxPanelClose'); if(pc) pc.textContent=L('Cerrar','Close'); const sc=$('v25uxSuiteClose'); if(sc) sc.textContent=L('Cerrar','Close'); const lab=q('#v25uxPartWrap label'); if(lab) lab.textContent=L('Orden actual','Current order'); const title=q('#v25UxBar .ux-title'); if(title) title.textContent=L('Workspace de composición','Composition workspace');}
  function patchStructureButtonNames(){const map=[['arrangeAddBtn',L('Añadir sección al arreglo','Add section to arrangement')],['arrangeDupBtn',L('Repetir bloque','Repeat block')],['arrangeNewBtn',L('Crear sección nueva','Create new section')],['arrangeVariationBtn',L('Crear variación independiente','Create independent variation')],['arrangeRenameBtn',L('Cambiar nombre visible','Change visible name')],['arrangeDelBtn',L('Borrar del arreglo','Remove from arrangement')]]; map.forEach(([id,txt])=>{const e=$(id); if(e) e.textContent=txt;});}
  function bindRefreshHooks(){if(document.body.dataset.v25ux2Hooks) return; document.body.dataset.v25ux2Hooks='1'; document.addEventListener('click',ev=>{if(ev.target.closest('#structureBuilderCard') || ev.target.closest('#v25UxBar')) setTimeout(()=>{refreshArrangementSelect(); patchStructureButtonNames();},120);},true); document.addEventListener('change',ev=>{if(ev.target && (ev.target.id==='sectionSelect'||ev.target.id==='langBtn')) setTimeout(()=>{refreshArrangementSelect(); refreshLabels(); patchStructureButtonNames();},120);},true); setInterval(()=>{refreshArrangementSelect();},1000);}
  function init(){addPanelClose(); addSuiteClose(); addArrangementSelect(); refreshLabels(); patchStructureButtonNames(); bindRefreshHooks(); const small=q('.brand small'); if(small) small.textContent='STUDIO 936 COMPOSER v25.1 UX · CLEAN WORKSPACE';}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(init,350)); else setTimeout(init,350); setTimeout(init,900); setTimeout(init,1800);
})();

/* ---- Script block separator ---- */

(function(){
  const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  function syncPanelState(){
    const ed=q('.editor');
    // Cambio 376: se saca la condición de Suite Pro (#s936SuitePro.is-open)
    // de acá. Esta función es del cajón viejo (.editor, previo a Suite
    // Pro) — en algún momento se le agregó también Suite Pro, asumiendo
    // que necesitaba el mismo trato (reservar espacio en .main vía
    // v25ux-panel-open, en css/styles.css). Desde el Cambio 373, Suite
    // Pro/el Chart NUNCA deben reservar espacio entre sí — Suite Pro
    // flota con z-index propio, sin importar su estado (abierto,
    // colapsado a la barra, o expandido con hover). Dejar la condición
    // vieja causaba que, apenas Suite Pro quedaba "is-open" (incluso
    // colapsado a solo la barra angosta), esta función reservara ~439px
    // en .main "para el cajón viejo" — un padding que el Chart heredaba
    // por ser hijo directo de .main, aunque su propio margin-left
    // estuviera en 0. No se toca la línea de abajo (el cajón .editor
    // sigue funcionando igual que siempre, es un tema aparte).
    const open=!!(ed&&ed.classList.contains('ux-open'));
    document.body.classList.toggle('v25ux-panel-open',open);
  }
  function relabel(){
    const pc=document.getElementById('v25uxPanelClose');
    if(pc) pc.textContent=document.documentElement.lang==='en'?'Close':'Cerrar';
    const sc=document.querySelector('#s936SuitePro .s936-suite-pro-close');
    if(sc) sc.textContent=document.documentElement.lang==='en'?'Close':'Cerrar';
    const title=q('#v25UxBar .ux-title');
    if(title) title.textContent=document.documentElement.lang==='en'?'Workspace':'Workspace';
  }
  function patchEvents(){
    if(document.body.dataset.v25ux3) return;
    document.body.dataset.v25ux3='1';
    document.addEventListener('click',()=>setTimeout(syncPanelState,80),true);
    document.addEventListener('touchend',()=>setTimeout(syncPanelState,90),true);
    document.addEventListener('keydown',ev=>{if(ev.key==='Escape')setTimeout(syncPanelState,60);},true);
    const mo=new MutationObserver(()=>{syncPanelState(); relabel();});
    mo.observe(document.body,{attributes:true,subtree:true,attributeFilter:['class','lang']});
  }
  function init(){
    const small=q('.brand small');
    if(small) small.textContent='STUDIO 936 COMPOSER v25.2 UX · INSTRUMENT FIRST';
    relabel(); patchEvents(); syncPanelState();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(init,500)); else setTimeout(init,500);
  setTimeout(init,1200); setTimeout(init,2200);
})();

/* ---- Script block separator ---- */

(function(){
  const q=(s,r=document)=>r.querySelector(s);
  function updateTop(){
    const small=q('.brand small');
    if(small) small.textContent='STUDIO 936 COMPOSER v25.3 UX · LEFT DOCK';
    const title=q('#v25UxBar .ux-title');
    if(title) title.textContent=document.documentElement.lang==='en'?'Workspace':'Workspace';
    const pc=document.getElementById('v25uxPanelClose');
    if(pc) pc.textContent=document.documentElement.lang==='en'?'Close':'Cerrar';
    const sc=document.querySelector('#s936SuitePro .s936-suite-pro-close');
    if(sc) sc.textContent=document.documentElement.lang==='en'?'Close':'Cerrar';
  }
  function setPanelTop(){
    const bar=document.getElementById('v25UxBar');
    const top = bar ? Math.ceil(bar.getBoundingClientRect().bottom + 10) : 228;
    document.documentElement.style.setProperty('--v25-left-panel-top', top+'px');
  }
  function sync(){ updateTop(); setPanelTop(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(sync,400)); else setTimeout(sync,400);
  window.addEventListener('resize',()=>setTimeout(setPanelTop,120));
  document.addEventListener('click',()=>setTimeout(sync,80),true);
  document.addEventListener('touchend',()=>setTimeout(sync,120),true);
  setTimeout(sync,1200); setTimeout(sync,2400);
})();

/* ---- Script block separator ---- */

(function(){
  function q(s,r=document){return r.querySelector(s)}
  function refreshV25_4(){
    const small=q('.brand small');
    if(small) small.textContent='STUDIO 936 COMPOSER v25.4 UX · LEFT DOCK POLISH';
    const bar=document.getElementById('v25UxBar');
    const top=bar?Math.ceil(bar.getBoundingClientRect().bottom+10):228;
    document.documentElement.style.setProperty('--v25-left-panel-top',top+'px');
    const close=document.getElementById('v25uxPanelClose');
    if(close){
      close.textContent=document.documentElement.lang==='en'?'Close':'Cerrar';
      close.title=document.documentElement.lang==='en'?'Close panel':'Cerrar panel';
    }
    const suiteClose=document.getElementById('v25uxSuiteClose');
    if(suiteClose){
      suiteClose.textContent=document.documentElement.lang==='en'?'Close':'Cerrar';
      suiteClose.title=document.documentElement.lang==='en'?'Close panel':'Cerrar panel';
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(refreshV25_4,500)); else setTimeout(refreshV25_4,500);
  window.addEventListener('resize',()=>setTimeout(refreshV25_4,120));
  document.addEventListener('click',()=>setTimeout(refreshV25_4,80),true);
  document.addEventListener('touchend',()=>setTimeout(refreshV25_4,120),true);
  setTimeout(refreshV25_4,1400); setTimeout(refreshV25_4,2600);
})();

/* ---- Script block separator ---- */

(function(){
  const $=id=>document.getElementById(id);
  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const lang=()=>((document.documentElement.lang||localStorage.getItem('pianoComposerUiLangV15')||'es').toLowerCase().startsWith('en')?'en':'es');
  const L=(es,en)=>lang()==='en'?en:es;
  const sectionLabel=(k)=>{try{return (sectionNames&&sectionNames[k])||k}catch(e){return k}};

  function setVersion(){
    const small=q('.brand small');
    if(small) small.textContent=L('STUDIO 936 COMPOSER v25.8 · EDITOR REVIEW','STUDIO 936 COMPOSER v25.8 · EDITOR REVIEW');
  }

  function reorderWorkspace(){
    const bar=$('v25UxBar'); if(!bar) return;
    const title=q('.ux-title',bar);
    const order=['structure','editor','lyrics','export','suite','help'];
    let after=title||bar.firstChild;
    order.forEach(key=>{
      const btn=q(`.v25ux-btn[data-ux-open="${key}"]`,bar);
      if(btn){
        if(key==='structure') btn.textContent=L('Estructura','Structure');
        if(key==='editor') btn.textContent=L('Editor','Editor');
        bar.insertBefore(btn, after && after.nextSibling ? after.nextSibling : bar.firstChild);
        after=btn;
      }
    });
    const ttl=q('.ux-title',bar); if(ttl) ttl.textContent=L('Workspace de composición','Composition workspace');
  }

  function getSectionKeys(){
    try{
      const keys=Object.keys(project.sections||{});
      const preferred=['intro','verse','verse1','verse2','verse3','verse4','prechorus','chorus','bridge','interlude','solo','outro'];
      return [...preferred.filter(k=>keys.includes(k)), ...keys.filter(k=>!preferred.includes(k))];
    }catch(e){return ['intro'];}
  }

  function syncEditorSelector(){
    const sel=$('v258EditorPartSelect'); if(!sel) return;
    const keys=getSectionKeys();
    const current=($('sectionSelect')&&$('sectionSelect').value)||'intro';
    const html=keys.map(k=>`<option value="${String(k).replace(/"/g,'&quot;')}">${sectionLabel(k)}</option>`).join('');
    if(sel.dataset.lastHtml!==html){ sel.innerHTML=html; sel.dataset.lastHtml=html; }
    sel.value=current;
  }

  function addEditorSectionSelector(){
    const badge=$('editorSectionBadge'); if(!badge || $('v258EditorPartWrap')) return;
    const wrap=document.createElement('div');
    wrap.id='v258EditorPartWrap';
    wrap.className='v258-editor-part-wrap';
    wrap.innerHTML=`<label for="v258EditorPartSelect">${L('Editar parte','Edit part')}</label><select id="v258EditorPartSelect" class="select" aria-label="${L('Editar parte','Edit part')}"></select>`;
    badge.insertAdjacentElement('afterend',wrap);
    const sel=$('v258EditorPartSelect');
    sel.addEventListener('change',()=>{
      const top=$('sectionSelect'); if(!top) return;
      try{ if(typeof saveSoloForSection==='function') saveSoloForSection((typeof lastEditorSection!=='undefined'?lastEditorSection:top.value), false); }catch(e){}
      top.value=sel.value;
      top.dispatchEvent(new Event('change',{bubbles:true}));
      setTimeout(()=>{syncEditorSelector(); validateEditorFields(false);},80);
    });
    syncEditorSelector();
  }

  function addEditorHelp(){
    const hint=q('.editor .card .hint'); if(!hint || $('v258EditorHelp')) return;
    const box=document.createElement('div');
    box.id='v258EditorHelp';
    box.className='v258-editor-help';
    box.innerHTML=L(
      '<b>Formato rápido:</b> Acordes usan solo notas: <code>C3 E3 G3</code>, <code>Bb3</code>, <code>F#3</code>, <code>Do3 Mi3 Sol3</code>. El silencio no va en notas del acorde. En <b>Melodía / solo</b> sí puedes usar silencio: <code>C4:2 R:2 G4:4</code>.',
      '<b>Quick format:</b> Chords use notes only: <code>C3 E3 G3</code>, <code>Bb3</code>, <code>F#3</code>, <code>Do3 Mi3 Sol3</code>. Rests do not belong in chord notes. In <b>Melody / solo</b> you can use rests: <code>C4:2 R:2 G4:4</code>.'
    );
    hint.insertAdjacentElement('afterend',box);
    const status=document.createElement('div');
    status.id='v258EditorStatus';
    status.className='v258-editor-status';
    box.insertAdjacentElement('afterend',status);
  }

  function tokens(str){ return String(str||'').split(/[\s,;]+/).map(s=>s.trim()).filter(Boolean); }
  function noteOk(tok){ try{return typeof noteToMidi==='function' && noteToMidi(tok)!==null && Number.isFinite(noteToMidi(tok));}catch(e){return false;} }
  function setStatus(msg,isWarn=false){
    const st=$('v258EditorStatus'); if(!st) return;
    if(!msg){st.textContent=''; st.className='v258-editor-status'; st.style.display='none'; return;}
    st.textContent=msg; st.className='v258-editor-status'+(isWarn?' warn':''); st.style.display='block';
  }
  function validateEditorFields(showOk=true){
    const bass=($('bassInput')?.value||'').trim();
    const notes=($('chordNotes')?.value||'').trim();
    const bars=Number($('barsInput')?.value||0);
    if(!noteOk(bass)) return {ok:false,msg:L('Revisa el bajo: usa una nota con octava, por ejemplo F2, C2, Do2 o Sib2.','Check bass: use a note with octave, for example F2, C2, Do2 or Sib2.')};
    if(!bars || bars<1) return {ok:false,msg:L('Revisa compases: debe ser 1 o más.','Check bars: value must be 1 or higher.')};
    const t=tokens(notes);
    if(!t.length) return {ok:false,msg:L('Revisa notas del acorde: escribe al menos una nota, por ejemplo C3 E3 G3.','Check chord notes: enter at least one note, for example C3 E3 G3.')};
    const bad=[];
    for(const tok of t){
      const base=tok.split(':')[0];
      if(/^R$/i.test(base) || tok.includes(':') || !noteOk(base)) bad.push(tok);
    }
    if(bad.length) return {ok:false,msg:L('En “Notas del acorde” no uses silencios ni duraciones. Revisa: ','In “Chord notes”, do not use rests or durations. Check: ')+bad.join(', ')};
    if(showOk) return {ok:true,msg:L('Formato correcto. Puedes escuchar o aplicar.','Format looks good. You can preview or apply.')};
    return {ok:true,msg:''};
  }

  function patchApplyValidation(){
    if(window.__v258ApplyPatched) return; window.__v258ApplyPatched=true;
    const original=window.applyEditorToProject;
    if(typeof original==='function'){
      window.applyEditorToProject=function(render=true){
        const v=validateEditorFields(false);
        if(!v.ok){ setStatus(v.msg,true); try{ if(render && typeof flashStatus==='function') flashStatus(v.msg); }catch(e){} return false; }
        setStatus('',false);
        return original.call(this,render);
      };
    }
    const apply=$('applyBtn'); if(apply){ apply.onclick=()=>window.applyEditorToProject(true); }
    ['bassInput','chordNotes','barsInput'].forEach(id=>{const el=$(id); if(el&&!el.dataset.v258){el.dataset.v258='1'; el.addEventListener('input',()=>{const v=validateEditorFields(false); if(!v.ok) setStatus(v.msg,true); else setStatus('',false);});}});
    const prev=$('previewBtn'); if(prev&&!prev.dataset.v258){prev.dataset.v258='1'; prev.addEventListener('click',()=>{const v=validateEditorFields(false); if(!v.ok) setStatus(v.msg,true);},true);}
  }

  function updateEditorLabels(){
    const wrap=$('v258EditorPartWrap'); if(wrap){const lab=q('label',wrap); if(lab) lab.textContent=L('Editar parte','Edit part');}
    const help=$('v258EditorHelp');
    if(help) help.innerHTML=L(
      '<b>Formato rápido:</b> Acordes usan solo notas: <code>C3 E3 G3</code>, <code>Bb3</code>, <code>F#3</code>, <code>Do3 Mi3 Sol3</code>. El silencio no va en notas del acorde. En <b>Melodía / solo</b> sí puedes usar silencio: <code>C4:2 R:2 G4:4</code>.',
      '<b>Quick format:</b> Chords use notes only: <code>C3 E3 G3</code>, <code>Bb3</code>, <code>F#3</code>, <code>Do3 Mi3 Sol3</code>. Rests do not belong in chord notes. In <b>Melody / solo</b> you can use rests: <code>C4:2 R:2 G4:4</code>.'
    );
  }

  function patchHelpManual(){
    const body=q('#helpModal .help-body'); if(!body || q('.v258-help-block',body)) return;
    const html= lang()==='en' ? `
      <div class="help-block wide v258-help-block"><h3>v25.8 Editor Review <span class="tag">Updated</span></h3>
        <ul><li>The Workspace order is now <b>Structure → Editor → Lyrics/TAB → Export/Flow → Pro Suite → Help</b>, matching the natural songwriting flow.</li><li>The Editor now includes <b>Edit part</b>, so you can choose the section directly inside the Editor without going back to the top selector.</li><li><b>Chord notes</b> accept notes only: <code>C3 E3 G3</code>, <code>Bb3</code>, <code>F#3</code>, <code>Do3 Mi3 Sol3</code>.</li><li><b>Rests</b> are only for Melody/Solo, using <code>R:2</code>. Example: <code>C4:2 R:2 G4:4</code>.</li><li>The Editor now warns you before saving if a bass note, chord note or bar value is not readable.</li></ul>
      </div>` : `
      <div class="help-block wide v258-help-block"><h3>v25.8 Revisión del Editor <span class="tag">Actualizado</span></h3>
        <ul><li>El orden del Workspace ahora es <b>Estructura → Editor → Letra/TAB → Exportar/Flow → Suite Pro → Ayuda</b>, siguiendo el flujo natural de composición.</li><li>El Editor ahora incluye <b>Editar parte</b>, para elegir la sección directamente dentro del Editor sin volver al selector superior.</li><li><b>Notas del acorde</b> acepta solo notas: <code>C3 E3 G3</code>, <code>Bb3</code>, <code>F#3</code>, <code>Do3 Mi3 Sol3</code>.</li><li>Los <b>silencios</b> son solo para Melodía/Solo, usando <code>R:2</code>. Ejemplo: <code>C4:2 R:2 G4:4</code>.</li><li>El Editor ahora avisa antes de guardar si el bajo, las notas o los compases no se pueden leer.</li></ul>
      </div>`;
    body.insertAdjacentHTML('afterbegin',html);
  }

  function bind(){
    setVersion(); reorderWorkspace(); addEditorSectionSelector(); addEditorHelp(); patchApplyValidation(); updateEditorLabels(); syncEditorSelector();
    const top=$('sectionSelect'); if(top&&!top.dataset.v258){top.dataset.v258='1'; top.addEventListener('change',()=>setTimeout(()=>{syncEditorSelector(); validateEditorFields(false);},120),true);}
    const langBtn=$('langBtn'); if(langBtn&&!langBtn.dataset.v258){langBtn.dataset.v258='1'; langBtn.addEventListener('click',()=>setTimeout(()=>{setVersion(); reorderWorkspace(); updateEditorLabels(); syncEditorSelector(); patchHelpManual();},420),true);}
    const help=$('helpBtn'); if(help&&!help.dataset.v258){help.dataset.v258='1'; help.addEventListener('click',()=>setTimeout(patchHelpManual,620),true);}
  }
  function init(){bind(); setTimeout(bind,500); setTimeout(bind,1200);}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();

/* ---- Script block separator ---- */

(function(){
  const $=id=>document.getElementById(id), q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  function L(es,en){return document.documentElement.lang==='en'?en:es;}
  function panelTitle(ed){const p=ed?.dataset?.uxPanel||'editor'; if(p==='structure') return L('Constructor de estructura','Song structure builder'); if(p==='export') return L('Guardar / compartir / Flow','Save / share / Flow'); return L('Editor de progresión y melodía','Progression and melody editor');}
  function closeEditorPanel(){const ed=q('.editor'); if(ed) ed.classList.remove('ux-open'); qa('#v25UxBar .v25ux-btn').forEach(x=>x.classList.remove('active')); document.body.classList.remove('v25ux-panel-open');}
  function ensureEditorHeader(){const ed=q('.editor'); if(!ed) return; let header=$('v25uxDrawerHeader'); if(!header){header=document.createElement('div'); header.id='v25uxDrawerHeader'; header.className='v25ux-drawer-header'; header.innerHTML='<span class="v25ux-drawer-title" id="v25uxDrawerTitle"></span>'; ed.insertBefore(header, ed.firstChild);} let btn=$('v25uxPanelClose'); if(!btn){btn=document.createElement('button'); btn.id='v25uxPanelClose'; btn.type='button'; btn.className='v25ux-panel-close'; btn.addEventListener('click',closeEditorPanel); btn.addEventListener('touchend',ev=>{ev.preventDefault(); closeEditorPanel();},{passive:false});} if(btn.parentElement!==header) header.appendChild(btn); btn.textContent=L('Cerrar','Close'); btn.title=L('Cerrar panel','Close panel'); const title=$('v25uxDrawerTitle'); if(title) title.textContent=panelTitle(ed);}
  function ensureSuiteHeader(){const btn=$('v25uxSuiteClose'); if(btn){btn.textContent=L('Cerrar','Close'); btn.title=L('Cerrar panel','Close panel');}}
  function refreshV25_5(){const small=q('.brand small'); if(small) small.textContent='STUDIO 936 COMPOSER v25.5 UX · HEADER CLOSE FIX'; ensureEditorHeader(); ensureSuiteHeader();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(refreshV25_5,450)); else setTimeout(refreshV25_5,450);
  document.addEventListener('click',()=>setTimeout(refreshV25_5,80),true); document.addEventListener('touchend',()=>setTimeout(refreshV25_5,100),true); document.addEventListener('change',()=>setTimeout(refreshV25_5,100),true); window.addEventListener('resize',()=>setTimeout(refreshV25_5,120)); setInterval(refreshV25_5,1200);
})();

/* ---- Script block separator ---- */

(function(){
  const $=id=>document.getElementById(id);
  const q=s=>document.querySelector(s);
  const L=(es,en)=>document.documentElement.lang==='en'?en:es;

  function refreshV25_6Labels(){
    const small=q('.brand small');
    if(small) small.textContent='STUDIO 936 COMPOSER v25.6 UX · MODAL / ORDER POLISH';

    const label=q('#v25uxPartWrap label');
    if(label) label.textContent=L('Saltar a parte','Jump to part');

    const sel=$('v25uxPartSelect');
    if(sel){
      sel.title=L('Selecciona una parte del arreglo para editarla o ubicarte rápido','Select an arrangement part to edit it or jump quickly');
      sel.setAttribute('aria-label',L('Saltar a parte del arreglo','Jump to arrangement part'));
      if(!sel.options.length){
        const opt=document.createElement('option');
        opt.value='';
        opt.textContent=L('Sin arreglo definido','No arrangement yet');
        sel.appendChild(opt);
      }
    }

    const close=$('v25uxPanelClose');
    if(close){
      close.textContent=L('Cerrar','Close');
      close.title=L('Cerrar este panel','Close this panel');
    }
    const suiteClose=$('v25uxSuiteClose');
    if(suiteClose){
      suiteClose.textContent=L('Cerrar','Close');
      suiteClose.title=L('Cerrar Suite Pro','Close Pro Suite');
    }
  }

  // Refuerzo no invasivo: si cambia idioma, sección o estructura, refresca etiquetas.
  document.addEventListener('DOMContentLoaded',()=>setTimeout(refreshV25_6Labels,350));
  document.addEventListener('click',()=>setTimeout(refreshV25_6Labels,120),true);
  document.addEventListener('change',()=>setTimeout(refreshV25_6Labels,120),true);
  setTimeout(refreshV25_6Labels,700);
})();

/* ---- Script block separator ---- */

(function(){
  const $ = id => document.getElementById(id);
  const q = sel => document.querySelector(sel);
  const lang = () => ((document.documentElement.lang || localStorage.getItem('pianoComposerUiLangV15') || 'es').toLowerCase().startsWith('en') ? 'en' : 'es');
  const L = (es,en) => lang()==='en' ? en : es;

  function setVersion(){
    const small=q('.brand small');
    if(small) small.textContent=L('STUDIO 936 COMPOSER v25.7 UX · MANUAL ACTUALIZADO','STUDIO 936 COMPOSER v25.7 UX · UPDATED MANUAL');
  }

  function renderManual(){
    const modal=$('helpModal');
    const body=q('#helpModal .help-body');
    const title=q('#helpModal h2');
    const note=q('#helpModal .modal-head .arrangement-note');
    const close=$('closeHelpBtn');
    if(!body) return;
    if(title) title.textContent=L('Manual completo de Studio 936 Composer','Complete Studio 936 Composer manual');
    if(note) note.textContent=L('Guía actualizada del Workspace: Editor, Estructura, Letra/TAB, Exportar/Flow, Suite Pro, práctica, guardado y flujo recomendado.','Updated Workspace guide: Editor, Structure, Lyrics/TAB, Export/Flow, Pro Suite, practice, saving and recommended workflow.');
    if(close) close.textContent=L('Cerrar','Close');
    body.innerHTML = lang()==='en' ? manualEn() : manualEs();
    if(modal) modal.dataset.v257Manual='1';
  }

  function manualEs(){return `
    <div class="help-block wide">
      <h3>0. Ruta recomendada para crear una canción <span class="tag">Workflow</span></h3>
      <div class="help-flow">
        <div class="help-step"><strong>1. Idea</strong>Escribe título, autor, estilo, instrumento guía, tempo y afinación.</div>
        <div class="help-step"><strong>2. Secciones</strong>Crea el material musical: intro, versos, pre-coro, coro, puente, interludio, solo y outro.</div>
        <div class="help-step"><strong>3. Estructura</strong>Ordena la canción real: repite coros, crea BIS, variaciones y finales.</div>
        <div class="help-step"><strong>4. Exporta</strong>Guarda JSON como proyecto maestro. Usa TXT/PDF/MIDI para compartir o producir en DAW.</div>
      </div>
      <div class="help-note"><b>Regla de oro:</b> <b>Guardar local</b> sirve mientras trabajas en el mismo navegador. <b>Bajar JSON</b> es el respaldo real y portable de la canción.</div>
    </div>

    <div class="help-block wide">
      <h3>1. Zona superior: identidad de la canción</h3>
      <div class="help-mini-grid">
        <div class="help-mini"><b>Canción</b>Nombre del proyecto. Sale en TXT, JSON, PDF/Lead Sheet y vista de práctica.</div>
        <div class="help-mini"><b>Autor</b>Compositor, arreglista o creador. También se exporta.</div>
        <div class="help-mini"><b>Estilo</b>Cambia el patrón rítmico de acompañamiento, no cambia tus acordes.</div>
        <div class="help-mini"><b>Instrumento guía</b>Color sonoro para componer. Piano, guitarra, ukelele, órgano, saxo y synth son sonidos sintéticos del navegador, no samples finales.</div>
        <div class="help-mini"><b>Sección</b>Define la parte que estás editando manualmente. Con el arreglo, también puedes saltar a partes de la estructura.</div>
        <div class="help-mini"><b>BPM</b>Velocidad del groove. Usa presets o deslizador.</div>
      </div>
      <div class="help-note">El botón <b>EN/ES</b> cambia la interfaz y esta ayuda. <b>Bajar TXT</b> también respeta el idioma activo.</div>
    </div>

    <div class="help-block">
      <h3>2. Transporte y práctica</h3>
      <ul>
        <li><b>Start Groove:</b> reproduce en loop la sección seleccionada. Ideal para practicar un verso o coro sin escuchar toda la canción.</li>
        <li><b>Escuchar canción:</b> reproduce el arreglo completo según el orden de canción definido en Estructura.</li>
        <li><b>Metrónomo:</b> click audible. El primer pulso marca el compás. En ruteo dividido puede ir a L.</li>
        <li><b>Solo ON/OFF:</b> activa o silencia las melodías/solos guardados por sección.</li>
        <li><b>Acorde ON/OFF:</b> permite armar acordes tocando varias teclas o sumando notas en pantalla táctil.</li>
        <li><b>Zoom Piano:</b> abre el piano en primer plano para iPad/touchscreen.</li>
        <li><b>Guardar local:</b> guarda en el navegador actual; no descarga archivo.</li>
      </ul>
    </div>

    <div class="help-block">
      <h3>3. Bombillitos / mapa de ritmo</h3>
      <p>Representan 16 pasos por compás: <b>1 e &amp; a / 2 e &amp; a / 3 e &amp; a / 4 e &amp; a</b>.</p>
      <span class="help-kpi">Verde: acorde</span><span class="help-kpi">Magenta: bajo</span><span class="help-kpi">Gris: ghost</span><span class="help-kpi">Amarillo: melodía</span><span class="help-kpi">Borde: paso actual</span>
    </div>

    <div class="help-block wide">
      <h3>4. Workspace / Áreas de trabajo</h3>
      <table class="help-table"><tr><th>Área</th><th>Para qué sirve</th><th>Cuándo usarla</th></tr>
        <tr><td><b>Editor</b></td><td>Edita acordes, bajo, notas, compases, volumen groove y melodía/solo de una sección.</td><td>Cuando estás construyendo el material musical.</td></tr>
        <tr><td><b>Estructura</b></td><td>Ordena la canción real: agregar partes, repetir, mover, crear variaciones y nombrar bloques.</td><td>Cuando decides cómo va la canción de principio a fin.</td></tr>
        <tr><td><b>Letra/TAB</b></td><td>Escribe letra por sección y revisa el mapa armónico de la canción.</td><td>Cuando quieres cantar, documentar o preparar un TXT/lead sheet.</td></tr>
        <tr><td><b>Exportar/Flow</b></td><td>Guardar, bajar JSON/TXT/MIDI, importar, copiar y configurar audio/ruteo/Flow 8.</td><td>Cuando vas a respaldar, compartir o producir.</td></tr>
        <tr><td><b>Suite Pro</b></td><td>Herramientas avanzadas: plantillas, transposición, escalas, acordes IA, drums, mixer, MIDI In, práctica, compartir y teoría.</td><td>Cuando quieres acelerar composición o preparar producción.</td></tr>
        <tr><td><b>Ayuda</b></td><td>Abre este manual completo.</td><td>Cuando quieras recordar cómo usar cada función.</td></tr>
      </table>
    </div>

    <div class="help-block wide">
      <h3>5. Editor: progresión, acordes y melodía <span class="tag">Área Editor</span></h3>
      <ol>
        <li>Selecciona una sección arriba o desde <b>Saltar a parte</b>.</li>
        <li>Escoge el acorde en <b>Acorde seleccionado</b>.</li>
        <li><b>Nombre:</b> escribe el cifrado: <code>Fmaj13</code>, <code>Cmaj7</code>, <code>Am6</code>, <code>G6/9</code>.</li>
        <li><b>Bajo:</b> nota grave con octava: <code>F2</code>, <code>C2</code>, <code>A1</code>, <code>Do2</code>.</li>
        <li><b>Notas del acorde:</b> notas reales que toca la app: <code>E3 A3 D4 F4</code>.</li>
        <li><b>Compases:</b> duración del acorde. Si cambia muy rápido, sube a 2 o 4.</li>
        <li><b>Volumen Groove:</b> intensidad relativa de ese acorde en el acompañamiento.</li>
        <li><b>Escuchar:</b> prueba sin guardar. <b>Aplicar:</b> guarda cambios en la sección.</li>
        <li><b>Agregar acorde:</b> añade uno al final. <b>Duplicar:</b> copia el actual. <b>Borrar:</b> elimina el actual.</li>
      </ol>
      <div class="help-note"><b>Mapa de notas:</b> debajo del editor ves todos los acordes de la sección seleccionada. Sirve para verificar que editas la parte correcta.</div>
    </div>

    <div class="help-block">
      <h3>6. Formato de notas</h3>
      <table class="help-table"><tr><th>Tipo</th><th>Ejemplo</th></tr>
        <tr><td>Inglés</td><td><code>C3 E3 G3 Bb3</code></td></tr>
        <tr><td>Solfeo</td><td><code>Do3 Mi3 Sol3 Sib3</code></td></tr>
        <tr><td>Sostenidos</td><td><code>F#3</code> / <code>Fa#3</code></td></tr>
        <tr><td>Bemoles</td><td><code>Bb3</code> / <code>Sib3</code></td></tr>
        <tr><td>Silencio en melodía</td><td><code>R:2</code></td></tr>
      </table>
      <div class="help-note">Usa octavas bajas para bajo y octavas medias para acordes.</div>
    </div>

    <div class="help-block">
      <h3>7. Melodía / solo por sección</h3>
      <ul>
        <li>Cada sección puede tener su propia línea: intro, verso, coro, interludio o solo.</li>
        <li><b>Tonalidad:</b> referencia para sugerencias: <code>C</code>, <code>F</code>, <code>Am</code>.</li>
        <li><b>Escala:</b> mayor, menor, blues, pentatónica, dórica, mixolidia, etc.</li>
        <li><b>Formato:</b> <code>C4:2 Eb4:2 R:2 G4:4</code>. El número es duración en pasos de semicorchea.</li>
        <li><b>Probar solo:</b> escucha la línea sola. <b>Sugerir frase:</b> genera una frase automática offline. <b>Guardar línea:</b> la deja pegada a la sección.</li>
      </ul>
    </div>

    <div class="help-block wide">
      <h3>8. Estructura de canción <span class="tag">Área Estructura</span></h3>
      <p>La app separa <b>sección musical</b> y <b>bloque del arreglo</b>. La sección guarda música; el bloque dice dónde aparece en la canción.</p>
      <table class="help-table"><tr><th>Botón</th><th>Qué hace</th><th>Ejemplo práctico</th></tr>
        <tr><td><b>Añadir sección al arreglo</b></td><td>Agrega al orden una sección existente sin crear música nueva.</td><td>Agregar otro Coro después del Solo.</td></tr>
        <tr><td><b>Repetir bloque</b></td><td>Duplica el bloque seleccionado usando la misma música.</td><td>Coro → Coro BIS con la misma progresión.</td></tr>
        <tr><td><b>Crear sección nueva</b></td><td>Crea una sección musical vacía o base para editar.</td><td>Crear Verso 4, Puente u Outro.</td></tr>
        <tr><td><b>Crear variación independiente</b></td><td>Copia la música actual en una sección nueva independiente.</td><td>Coro final parecido al Coro, pero con acordes extra.</td></tr>
        <tr><td><b>Cambiar nombre visible</b></td><td>Cambia el nombre del bloque en el arreglo sin cambiar la sección original.</td><td>Mostrar “Coro BIS” aunque use la música de Coro.</td></tr>
        <tr><td><b>Mover arriba / abajo</b></td><td>Reordena el bloque dentro de la canción.</td><td>Mover Interludio antes del Verso 3.</td></tr>
        <tr><td><b>Borrar del arreglo</b></td><td>Quita el bloque del orden, pero no necesariamente borra la sección musical.</td><td>Eliminar una repetición del Coro.</td></tr>
      </table>
      <div class="help-note"><b>Escuchar canción</b>, TXT, MIDI y Lead Sheet deben seguir este orden real de canción.</div>
    </div>

    <div class="help-block wide">
      <h3>9. Letra / TAB <span class="tag">Área Letra/TAB</span></h3>
      <ol>
        <li>Abre <b>Letra/TAB</b>.</li>
        <li>Arriba verás el mapa armónico: secciones, acordes, duración y bajos.</li>
        <li>Escribe la letra en la caja de cada sección.</li>
        <li>Pulsa <b>Guardar letra</b>.</li>
        <li>Usa <b>Bajar TXT</b> para exportar un documento con título, autor, estilo, tempo, acordes, notas, bajo, melodía y letra.</li>
      </ol>
      <div class="help-note">La letra no cambia el audio. Sirve para componer, cantar, documentar y compartir la canción.</div>
    </div>

    <div class="help-block wide">
      <h3>10. Exportar / Flow <span class="tag">Área Exportar/Flow</span></h3>
      <table class="help-table"><tr><th>Opción</th><th>Qué hace</th><th>Cuándo usarla</th></tr>
        <tr><td><b>Guardar local</b></td><td>Guarda el estado en el navegador actual.</td><td>Mientras compones en el mismo equipo.</td></tr>
        <tr><td><b>Bajar JSON</b></td><td>Descarga el proyecto maestro editable.</td><td>Siempre que tengas una versión importante.</td></tr>
        <tr><td><b>Importar JSON</b></td><td>Carga un proyecto guardado y reemplaza lo que está en pantalla.</td><td>Para continuar una canción anterior.</td></tr>
        <tr><td><b>Bajar TXT</b></td><td>Exporta documento legible en el idioma activo.</td><td>Para imprimir, compartir o revisar la canción.</td></tr>
        <tr><td><b>Copiar</b></td><td>Copia al portapapeles el contenido textual.</td><td>Para pegar en notas, correo o documento.</td></tr>
        <tr><td><b>Exportar MIDI</b></td><td>Genera un archivo .mid con acordes, bajo y melodía/solo.</td><td>Para abrir en Reaper, FL Studio, Logic, GarageBand, Cakewalk, etc.</td></tr>
        <tr><td><b>PDF Lead Sheet</b></td><td>Genera una guía tipo hoja de acordes/estructura cuando está disponible.</td><td>Para músicos, cantantes o ensayo.</td></tr>
      </table>
      <h4>Flow 8 / dispositivo de audio</h4>
      <ul>
        <li>La app reproduce audio web estéreo. No envía “canales USB separados” por sí sola.</li>
        <li>En Chrome/Edge desktop, algunos navegadores permiten detectar o seleccionar salidas de audio. Si aparece Flow 8/USB Audio, puedes escogerlo.</li>
        <li>En iPad/Safari o al abrir desde iCloud/OneDrive preview, normalmente el navegador no permite seleccionar salida desde la app. Debes abrir el HTML en Edge/Safari real y escoger el dispositivo desde iPadOS o el sistema.</li>
        <li><b>Ruteo L/R:</b> en modo dividido, el metrónomo puede ir a la izquierda y la música a la derecha para ayudarte a rutear con la Flow 8.</li>
      </ul>
      <div class="help-note help-warning"><b>Importante:</b> si no escuchas audio en iPad, toca primero un botón real como Start Groove o Metrónomo. iOS exige una acción del usuario para activar audio.</div>
    </div>

    <div class="help-block wide">
      <h3>11. Suite Pro <span class="tag">Herramientas avanzadas</span></h3>
      <table class="help-table"><tr><th>Herramienta</th><th>Para qué sirve</th><th>Estado / uso recomendado</th></tr>
        <tr><td><b>Biblioteca</b></td><td>Gestionar ideas o canciones locales.</td><td>Usar junto con Guardar local/JSON.</td></tr>
        <tr><td><b>Plantillas</b></td><td>Cargar estructuras o ideas por género.</td><td>Útil para empezar rápido.</td></tr>
        <tr><td><b>Transponer</b></td><td>Cambiar tonalidad de acordes/notas.</td><td>Ideal para adaptar a la voz.</td></tr>
        <tr><td><b>Escalas</b></td><td>Ver notas recomendadas para improvisar.</td><td>Útil para solos y melodías.</td></tr>
        <tr><td><b>Acordes IA</b></td><td>Sugerir acordes por reglas musicales offline.</td><td>No llama OpenAI/Gemini. Para IA real haría falta backend seguro.</td></tr>
        <tr><td><b>Batería</b></td><td>Activa patrón rítmico sintético por estilo.</td><td>Apoyo de composición, no batería final de estudio.</td></tr>
        <tr><td><b>Mixer</b></td><td>Control básico de capas como click, acordes, bajo, melodía y drums.</td><td>Para practicar balance.</td></tr>
        <tr><td><b>Rec Idea</b></td><td>Capturar una idea tocada o generada.</td><td>Útil como bloc musical.</td></tr>
        <tr><td><b>MIDI In</b></td><td>Entrada desde teclado MIDI físico si el navegador lo permite.</td><td>Más probable en Chrome/Edge desktop.</td></tr>
        <tr><td><b>PDF Lead Sheet</b></td><td>Generar documento musical limpio.</td><td>Para compartir con músicos.</td></tr>
        <tr><td><b>Vista Lead Sheet</b></td><td>Vista limpia de acordes/letra sin tantos controles.</td><td>Para ensayo o lectura.</td></tr>
        <tr><td><b>Modo Práctica</b></td><td>Pantalla grande con parte, acorde, próximo acorde y guía.</td><td>Para tocar encima.</td></tr>
        <tr><td><b>Compartir</b></td><td>Preparar enlace o datos del proyecto.</td><td>Para versión web pública futura.</td></tr>
        <tr><td><b>Inspirarme</b></td><td>Generar una idea rápida de progresión/frase.</td><td>Asistente creativo offline.</td></tr>
        <tr><td><b>Teoría</b></td><td>Explica notas, función y color del acorde.</td><td>Modo educativo.</td></tr>
      </table>
    </div>

    <div class="help-block wide">
      <h3>12. Piano, diapasón y charts</h3>
      <ul>
        <li><b>Piano normal:</b> instrumento principal para tocar, probar acordes y componer.</li>
        <li><b>Zoom Piano:</b> close-up para iPad o pantallas táctiles.</li>
        <li><b>Guitarra/Ukelele/Bajo:</b> muestran diapasón y charts de acordes cuando la vista está activa.</li>
        <li><b>Charts:</b> tarjetas de acordes por sección. Tocar un chart carga ese acorde en el editor.</li>
        <li><b>Vista diapasón:</b> ayuda a traducir la armonía al instrumento físico. La sincronización fina del mástil con el acorde actual será revisada en una fase posterior.</li>
      </ul>
    </div>

    <div class="help-block wide">
      <h3>13. Solución de problemas</h3>
      <ul>
        <li><b>No suena en iPad:</b> abre el HTML en navegador real, no en preview de iCloud/OneDrive. Toca Start Groove o Metrónomo para desbloquear audio.</li>
        <li><b>No veo Flow 8:</b> revisa conexión USB, permisos de audio y salida del sistema. En iPad probablemente se elige desde iPadOS, no desde la app.</li>
        <li><b>La canción se perdió:</b> si no bajaste JSON, puede depender del navegador/localStorage. Por eso JSON es el respaldo maestro.</li>
        <li><b>Un acorde cambia muy rápido:</b> sube Compases a 2 o 4 en el Editor.</li>
        <li><b>El TXT sale en otro idioma:</b> cambia EN/ES antes de bajarlo.</li>
      </ul>
    </div>
  `;}

  function manualEn(){return `
    <div class="help-block wide">
      <h3>0. Recommended song-building path <span class="tag">Workflow</span></h3>
      <div class="help-flow">
        <div class="help-step"><strong>1. Idea</strong>Enter title, author, style, guide instrument, tempo and tuning.</div>
        <div class="help-step"><strong>2. Sections</strong>Create the musical material: intro, verses, pre-chorus, chorus, bridge, interlude, solo and outro.</div>
        <div class="help-step"><strong>3. Structure</strong>Build the real song order: repeated choruses, BIS blocks, variations and endings.</div>
        <div class="help-step"><strong>4. Export</strong>Save JSON as the master project. Use TXT/PDF/MIDI to share or produce in a DAW.</div>
      </div>
      <div class="help-note"><b>Golden rule:</b> <b>Save local</b> helps while working in the same browser. <b>Download JSON</b> is the real portable backup of the song.</div>
    </div>

    <div class="help-block wide">
      <h3>1. Top area: song identity</h3>
      <div class="help-mini-grid">
        <div class="help-mini"><b>Song</b>Project title. Exported to TXT, JSON, PDF/Lead Sheet and practice view.</div>
        <div class="help-mini"><b>Author</b>Composer, arranger or creator. Also exported.</div>
        <div class="help-mini"><b>Style</b>Changes the accompaniment rhythm, not your chords.</div>
        <div class="help-mini"><b>Guide instrument</b>Sound color for composing. Piano, guitar, ukulele, organ, sax and synth are browser synth sounds, not final samples.</div>
        <div class="help-mini"><b>Section</b>Defines what you edit manually. With the arrangement, you can also jump to parts of the structure.</div>
        <div class="help-mini"><b>BPM</b>Groove speed. Use presets or slider.</div>
      </div>
      <div class="help-note">The <b>EN/ES</b> button changes the interface and this manual. <b>Download TXT</b> also follows the active language.</div>
    </div>

    <div class="help-block"><h3>2. Transport and practice</h3><ul>
      <li><b>Start Groove:</b> loops the selected section.</li><li><b>Play Full Song:</b> plays the complete arrangement in song order.</li><li><b>Metronome:</b> audible click. In split routing it can go to L.</li><li><b>Solo ON/OFF:</b> enables or mutes saved section melodies/solos.</li><li><b>Chord ON/OFF:</b> lets you build chords on touch screens or by adding notes.</li><li><b>Zoom Piano:</b> opens a close-up piano for iPad/touch screens.</li><li><b>Save Local:</b> saves in this browser; it does not download a file.</li></ul></div>

    <div class="help-block"><h3>3. Rhythm lights</h3><p>They represent 16 steps per bar: <b>1 e &amp; a / 2 e &amp; a / 3 e &amp; a / 4 e &amp; a</b>.</p><span class="help-kpi">Green: chord</span><span class="help-kpi">Magenta: bass</span><span class="help-kpi">Gray: ghost</span><span class="help-kpi">Yellow: melody</span><span class="help-kpi">Border: current step</span></div>

    <div class="help-block wide"><h3>4. Workspace / Work areas</h3><table class="help-table"><tr><th>Area</th><th>Purpose</th><th>When to use it</th></tr>
      <tr><td><b>Editor</b></td><td>Edit chords, bass, notes, bars, groove volume and section melody/solo.</td><td>When building musical material.</td></tr>
      <tr><td><b>Structure</b></td><td>Build the real song order: add parts, repeat, move, create variations and rename blocks.</td><td>When deciding the full arrangement.</td></tr>
      <tr><td><b>Lyrics/TAB</b></td><td>Write lyrics by section and review the harmonic map.</td><td>When singing, documenting or preparing TXT/lead sheet.</td></tr>
      <tr><td><b>Export/Flow</b></td><td>Save, download JSON/TXT/MIDI, import, copy and configure audio/routing/Flow 8.</td><td>When backing up, sharing or producing.</td></tr>
      <tr><td><b>Pro Suite</b></td><td>Advanced tools: templates, transpose, scales, Chord AI, drums, mixer, MIDI In, practice, share and theory.</td><td>When accelerating composition or production prep.</td></tr>
      <tr><td><b>Help</b></td><td>Opens this manual.</td><td>Whenever you need guidance.</td></tr>
    </table></div>

    <div class="help-block wide"><h3>5. Editor: progression, chords and melody <span class="tag">Editor area</span></h3><ol>
      <li>Select a section at the top or from <b>Jump to part</b>.</li><li>Choose the chord in <b>Selected chord</b>.</li><li><b>Name:</b> chord symbol: <code>Fmaj13</code>, <code>Cmaj7</code>, <code>Am6</code>, <code>G6/9</code>.</li><li><b>Bass:</b> low note with octave: <code>F2</code>, <code>C2</code>, <code>A1</code>, <code>Do2</code>.</li><li><b>Chord notes:</b> notes the app plays: <code>E3 A3 D4 F4</code>.</li><li><b>Bars:</b> chord duration. If it changes too fast, raise it to 2 or 4.</li><li><b>Groove volume:</b> relative intensity for that chord.</li><li><b>Preview:</b> test without saving. <b>Apply:</b> saves changes into the section.</li><li><b>Add chord:</b> appends one. <b>Duplicate:</b> copies current. <b>Delete:</b> removes current.</li>
    </ol><div class="help-note"><b>Note map:</b> below the editor you see every chord in the selected section.</div></div>

    <div class="help-block"><h3>6. Note format</h3><table class="help-table"><tr><th>Type</th><th>Example</th></tr><tr><td>English</td><td><code>C3 E3 G3 Bb3</code></td></tr><tr><td>Solfege</td><td><code>Do3 Mi3 Sol3 Sib3</code></td></tr><tr><td>Sharps</td><td><code>F#3</code> / <code>Fa#3</code></td></tr><tr><td>Flats</td><td><code>Bb3</code> / <code>Sib3</code></td></tr><tr><td>Melody rest</td><td><code>R:2</code></td></tr></table><div class="help-note">Use low octaves for bass and middle octaves for chords.</div></div>

    <div class="help-block"><h3>7. Section melody / solo</h3><ul><li>Each section can have its own line: intro, verse, chorus, interlude or solo.</li><li><b>Key:</b> reference for suggestions: <code>C</code>, <code>F</code>, <code>Am</code>.</li><li><b>Scale:</b> major, minor, blues, pentatonic, dorian, mixolydian, etc.</li><li><b>Format:</b> <code>C4:2 Eb4:2 R:2 G4:4</code>. The number is sixteenth-step duration.</li><li><b>Test solo:</b> plays the line alone. <b>Suggest phrase:</b> creates an offline phrase. <b>Save line:</b> attaches it to the section.</li></ul></div>

    <div class="help-block wide"><h3>8. Song structure <span class="tag">Structure area</span></h3><p>The app separates <b>musical section</b> and <b>arrangement block</b>. A section stores music; a block says where it appears in the song.</p><table class="help-table"><tr><th>Button</th><th>What it does</th><th>Example</th></tr>
      <tr><td><b>Add section to arrangement</b></td><td>Adds an existing section to the order without creating new music.</td><td>Add another Chorus after the Solo.</td></tr>
      <tr><td><b>Repeat block</b></td><td>Duplicates the selected block using the same music.</td><td>Chorus → Chorus BIS with the same progression.</td></tr>
      <tr><td><b>Create new section</b></td><td>Creates a new empty/base musical section.</td><td>Create Verse 4, Bridge or Outro.</td></tr>
      <tr><td><b>Create independent variation</b></td><td>Copies the current music into a new independent section.</td><td>Final Chorus similar to Chorus but with extra chords.</td></tr>
      <tr><td><b>Rename visible block</b></td><td>Changes the block label without changing the original section.</td><td>Show “Chorus BIS” while using Chorus music.</td></tr>
      <tr><td><b>Move up/down</b></td><td>Reorders the block inside the song.</td><td>Move Interlude before Verse 3.</td></tr>
      <tr><td><b>Delete from arrangement</b></td><td>Removes the block from the order without necessarily deleting the section.</td><td>Remove one Chorus repeat.</td></tr>
    </table><div class="help-note"><b>Play Full Song</b>, TXT, MIDI and Lead Sheet should follow this real song order.</div></div>

    <div class="help-block wide"><h3>9. Lyrics / TAB <span class="tag">Lyrics/TAB area</span></h3><ol><li>Open <b>Lyrics/TAB</b>.</li><li>At the top you see the harmonic map: sections, chords, duration and bass.</li><li>Write lyrics in each section box.</li><li>Click <b>Save lyrics</b>.</li><li>Use <b>Download TXT</b> to export title, author, style, tempo, chords, notes, bass, melody and lyrics.</li></ol><div class="help-note">Lyrics do not change audio. They document the song and support singing/sharing.</div></div>

    <div class="help-block wide"><h3>10. Export / Flow <span class="tag">Export/Flow area</span></h3><table class="help-table"><tr><th>Option</th><th>What it does</th><th>When to use it</th></tr>
      <tr><td><b>Save Local</b></td><td>Saves state in the current browser.</td><td>While composing on the same device.</td></tr><tr><td><b>Download JSON</b></td><td>Downloads the editable master project.</td><td>Whenever you have an important version.</td></tr><tr><td><b>Import JSON</b></td><td>Loads a saved project and replaces the current screen.</td><td>To continue an older song.</td></tr><tr><td><b>Download TXT</b></td><td>Exports a readable document in the active language.</td><td>To print, share or review.</td></tr><tr><td><b>Copy</b></td><td>Copies textual content to clipboard.</td><td>To paste into notes, email or docs.</td></tr><tr><td><b>Export MIDI</b></td><td>Creates a .mid file with chords, bass and melody/solo.</td><td>To open in Reaper, FL Studio, Logic, GarageBand, Cakewalk, etc.</td></tr><tr><td><b>PDF Lead Sheet</b></td><td>Generates a chord/structure guide when available.</td><td>For musicians, singers or rehearsal.</td></tr>
    </table><h4>Flow 8 / audio device</h4><ul><li>The app plays stereo web audio. It does not directly send separate USB channels by itself.</li><li>In Chrome/Edge desktop, some browsers can detect/select audio outputs. If Flow 8/USB Audio appears, select it.</li><li>On iPad/Safari or iCloud/OneDrive preview, output selection is usually controlled by the OS, not the app. Open the HTML in a real browser.</li><li><b>L/R routing:</b> split mode can place metronome left and music right for Flow 8 routing.</li></ul><div class="help-note help-warning"><b>Important:</b> on iPad, tap Start Groove or Metronome first to unlock browser audio.</div></div>

    <div class="help-block wide"><h3>11. Pro Suite <span class="tag">Advanced tools</span></h3><table class="help-table"><tr><th>Tool</th><th>Purpose</th><th>Status / recommended use</th></tr>
      <tr><td><b>Library</b></td><td>Manage local ideas or songs.</td><td>Use with Save Local/JSON.</td></tr><tr><td><b>Templates</b></td><td>Load genre structures or ideas.</td><td>Useful to start fast.</td></tr><tr><td><b>Transpose</b></td><td>Change key of chords/notes.</td><td>Adapt to voice range.</td></tr><tr><td><b>Scales</b></td><td>See recommended notes for improvising.</td><td>Useful for solos and melodies.</td></tr><tr><td><b>Chord AI</b></td><td>Suggest chords using offline music rules.</td><td>Does not call OpenAI/Gemini. Real AI needs secure backend.</td></tr><tr><td><b>Drums</b></td><td>Activates synthetic rhythm by style.</td><td>Composition support, not final studio drums.</td></tr><tr><td><b>Mixer</b></td><td>Basic control of click, chords, bass, melody and drums layers.</td><td>Practice balance.</td></tr><tr><td><b>Rec Idea</b></td><td>Capture a played or generated idea.</td><td>Musical notebook.</td></tr><tr><td><b>MIDI In</b></td><td>Input from physical MIDI keyboard when browser supports it.</td><td>Most likely in Chrome/Edge desktop.</td></tr><tr><td><b>PDF Lead Sheet</b></td><td>Generate a clean music document.</td><td>Share with musicians.</td></tr><tr><td><b>Lead Sheet View</b></td><td>Clean chords/lyrics view.</td><td>Rehearsal or reading.</td></tr><tr><td><b>Practice Mode</b></td><td>Large screen with part, chord, next chord and guide.</td><td>Play along.</td></tr><tr><td><b>Share</b></td><td>Prepare link or project data.</td><td>Future public web version.</td></tr><tr><td><b>Inspire Me</b></td><td>Generate a quick progression/phrase idea.</td><td>Offline creative assistant.</td></tr><tr><td><b>Theory</b></td><td>Explains notes, function and color of the chord.</td><td>Educational mode.</td></tr>
    </table></div>

    <div class="help-block wide"><h3>12. Piano, fretboard and charts</h3><ul><li><b>Normal piano:</b> main instrument for playing and composing.</li><li><b>Zoom Piano:</b> close-up for iPad/touch screens.</li><li><b>Guitar/Ukulele/Bass:</b> show fretboard and chord charts when active.</li><li><b>Charts:</b> chord cards by section. Tap one to load that chord into the editor.</li><li><b>Fretboard view:</b> helps translate harmony to physical instruments. Fine synchronization with the current chord is scheduled for a later phase.</li></ul></div>

    <div class="help-block wide"><h3>13. Troubleshooting</h3><ul><li><b>No sound on iPad:</b> open the HTML in a real browser, not iCloud/OneDrive preview. Tap Start Groove or Metronome first.</li><li><b>Flow 8 not visible:</b> check USB connection, audio permissions and system output.</li><li><b>Song is lost:</b> without JSON backup, it may depend on browser/localStorage.</li><li><b>Chord changes too fast:</b> raise Bars to 2 or 4 in the Editor.</li><li><b>TXT language is wrong:</b> switch EN/ES before downloading.</li></ul></div>
  `;}

  function bind(){
    setVersion();
    const help=$('helpBtn');
    if(help && !help.dataset.v257){
      help.dataset.v257='1';
      help.addEventListener('click',()=>setTimeout(renderManual,260),true);
    }
    const langBtn=$('langBtn');
    if(langBtn && !langBtn.dataset.v257){
      langBtn.dataset.v257='1';
      langBtn.addEventListener('click',()=>setTimeout(()=>{setVersion(); if($('helpModal')?.style.display==='flex') renderManual();},380),true);
    }
    setTimeout(setVersion,500);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind); else bind();
})();

/* ---- Script block separator ---- */

(function(){
  const $=id=>document.getElementById(id);
  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const lang=()=>((document.documentElement.lang||localStorage.getItem('pianoComposerUiLangV15')||'es').toLowerCase().startsWith('en')?'en':'es');
  const L=(es,en)=>lang()==='en'?en:es;
  function secName(k){try{return (window.sectionNames&&sectionNames[k])||k;}catch(e){return k;}}
  function getCurrentProjectSafe(){
    try{
      if(typeof window.Studio936GetProject === 'function') return window.Studio936GetProject();
    }catch(e){}
    try{
      const raw = localStorage.getItem('studio936ComposerV25SongStructure');
      return raw ? JSON.parse(raw) : null;
    }catch(e){}
    return null;
  }
  function getParts(){
    try{
      if(typeof arrangementParts==='function') return arrangementParts();
      const currentProject=getCurrentProjectSafe();
      if(currentProject && Array.isArray(currentProject.arrangement)) return currentProject.arrangement;
    }catch(e){}
    try{
      const currentProject=getCurrentProjectSafe();
      const sections=currentProject && currentProject.sections ? currentProject.sections : {};
      return Object.keys(sections).map((k,i)=>({id:'sec_'+i,section:k,label:secName(k)}));
    }catch(e){return [{section:'intro',label:'Intro'}];}
  }
  function setBrand(){const small=q('.brand small'); if(small) small.textContent=L('STUDIO 936 COMPOSER v25.9 · EDITOR/STRUCTURE SYNC','STUDIO 936 COMPOSER v25.9 · EDITOR/STRUCTURE SYNC');}
  function stripOldListenerSelect(){
    const old=$('v258EditorPartSelect');
    if(!old || old.dataset.v259Clean==='1') return old;
    const clone=old.cloneNode(false);
    clone.id='v258EditorPartSelect';
    clone.className=old.className;
    clone.setAttribute('aria-label', L('Editar parte del arreglo','Edit arrangement part'));
    clone.dataset.v259Clean='1';
    old.parentNode.replaceChild(clone,old);
    return clone;
  }
  function ensureEditorNote(){
    const wrap=$('v258EditorPartWrap'); if(!wrap) return;
    wrap.classList.add('v259-arrangement-mode');
    let note=$('v259EditorPartNote');
    if(!note){
      note=document.createElement('div');
      note.id='v259EditorPartNote';
      note.className='v259-editor-note';
      wrap.insertAdjacentElement('afterend',note);
    }
    note.innerHTML=L(
      '<b>Editor:</b> aquí eliges qué bloque del arreglo vas a editar. Si eliges “Coro BIS” que usa la sección Coro, editarás la música de Coro. Para una versión independiente usa “Crear variación independiente” en Estructura.',
      '<b>Editor:</b> choose which arrangement block you want to edit. If you choose “Chorus BIS” linked to Chorus, you edit the Chorus music. For an independent version use “Create independent variation” in Structure.'
    );
  }
  function syncArrangementEditorSelector(){
    const wrap=$('v258EditorPartWrap'); if(!wrap) return;
    const label=q('label',wrap); if(label) label.textContent=L('Editar parte del arreglo','Edit arrangement part');
    const sel=stripOldListenerSelect(); if(!sel) return;
    ensureEditorNote();
    const rawParts=getParts();
    if(!Array.isArray(rawParts)) console.warn('Arrangement selector: invalid parts, using empty array', rawParts);
    const parts=Array.isArray(rawParts)?rawParts:[];
    const validParts=parts.filter(p=>p&&p.section);
    const curSec=$('sectionSelect')?.value || 'intro';
    let currentIdx=0;
    try{
      if(typeof selectedArrangementIndex!=='undefined' && validParts[selectedArrangementIndex]) currentIdx=selectedArrangementIndex;
      else currentIdx=Math.max(0,validParts.findIndex(p=>p.section===curSec));
    }catch(e){currentIdx=Math.max(0,validParts.findIndex(p=>p.section===curSec));}
    const html=validParts.map((p,i)=>{
      const label=(p.label||secName(p.section)||p.section);
      const src=secName(p.section)||p.section;
      const currentProject=getCurrentProjectSafe();
      const sections=currentProject && currentProject.sections ? currentProject.sections : {};
      const count=(sections[p.section]&&sections[p.section].length)||0;
      const text=(label===src?label:(label+' → '+src))+' · '+count+' '+L('acorde(s)','chord(s)');
      return '<option value="'+i+'">'+escapeHtmlSafe(text)+'</option>';
    }).join('');
    if(sel.dataset.v259Html!==html){sel.innerHTML=html; sel.dataset.v259Html=html;}
    sel.value=String(currentIdx>=0?currentIdx:0);
    if(!sel.dataset.v259Bound){
      sel.dataset.v259Bound='1';
      sel.addEventListener('change',()=>{
        const idx=Number(sel.value)||0;
        const rawUpdatedParts=getParts();
        if(!Array.isArray(rawUpdatedParts)) console.warn('Arrangement selector: invalid parts, using empty array', rawUpdatedParts);
        const updatedParts=(Array.isArray(rawUpdatedParts)?rawUpdatedParts:[]).filter(part=>part&&part.section);
        if(!updatedParts[idx]) return;
        selectArrangementPart(idx);
        setTimeout(syncArrangementEditorSelector,80);
      });
    }
  }
  function escapeHtmlSafe(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
  function enhanceStructureClicks(){
    if(document.body.dataset.v259StructureClick) return;
    document.body.dataset.v259StructureClick='1';
    document.addEventListener('click',ev=>{
      const part=ev.target.closest('[data-arr-i]');
      if(part){setTimeout(syncArrangementEditorSelector,140);}
    },true);
  }
  function patchHelp(){
    const body=q('#helpModal .help-body'); if(!body || q('.v259-help-block',body)) return;
    body.insertAdjacentHTML('afterbegin', lang()==='en' ? `
      <div class="help-block wide v259-help-block"><h3>v25.9 Editor / Structure clarification <span class="tag">Updated</span></h3>
        <ul><li><b>Structure</b> is only for building the song order: add, repeat, move, rename or create variations.</li><li><b>Editor</b> is where you edit the progression, bass, chord notes, bars and melody.</li><li>The Editor selector now shows the <b>real arrangement order</b>, not just the raw section bank.</li><li>If a block uses the same source section, editing it edits that shared section. Use <b>Create independent variation</b> when you need a different chorus, verse or outro.</li></ul>
      </div>` : `
      <div class="help-block wide v259-help-block"><h3>v25.9 Aclaración Editor / Estructura <span class="tag">Actualizado</span></h3>
        <ul><li><b>Estructura</b> sirve solo para construir el orden de la canción: agregar, repetir, mover, renombrar o crear variaciones.</li><li><b>Editor</b> es donde editas progresión, bajo, notas del acorde, compases y melodía.</li><li>El selector del Editor ahora muestra el <b>orden real del arreglo</b>, no solo el banco interno de secciones.</li><li>Si un bloque usa la misma sección fuente, al editarlo editas esa sección compartida. Usa <b>Crear variación independiente</b> cuando necesites un coro, verso u outro diferente.</li></ul>
      </div>`);
  }
  function refresh(){
    setBrand();
    syncArrangementEditorSelector();
    const hp=$('helpBtn'); if(hp&&!hp.dataset.v259){hp.dataset.v259='1'; hp.addEventListener('click',()=>setTimeout(patchHelp,650),true);}
  }
  function init(){refresh(); enhanceStructureClicks(); setTimeout(refresh,400); setTimeout(refresh,1100); setInterval(refresh,1400);}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();


// Absolute-end MIDI binding reinforcement: keep modular handler as the only active #midiBtn click path.
(function(){
  if(typeof bindFinalMidiExport!=='function') return;
  bindFinalMidiExport();
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bindFinalMidiExport);
  setTimeout(bindFinalMidiExport,0);
  setTimeout(bindFinalMidiExport,500);
  setTimeout(bindFinalMidiExport,1500);
})();
