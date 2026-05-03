// Studio 936 Composer - basic music theory helpers
(() => {
'use strict';

const SongModel = window.Studio936SongModel || {};
const noteNames = SongModel.noteNames || ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const solfege = SongModel.solfege || {DO:'C',RE:'D',MI:'E',FA:'F',SOL:'G',LA:'A',SI:'B'};
const enharmonic = SongModel.enharmonic || {DB:'C#',EB:'D#',GB:'F#',AB:'G#',BB:'A#'};

function noteToMidi(token){
    if(token === null || token === undefined) return null;
    token = String(token).trim();
    if(!token || /^R$/i.test(token)) return null;
    token = token.replace(/♯/g,'#').replace(/♭/g,'b');
    const m = token.match(/^([A-Ga-g]|Do|Re|Mi|Fa|Sol|La|Si)(#|b|s|S|♯|♭)?(-?\d)$/i);
    if(!m) return null;
    let root = m[1].toUpperCase();
    if(solfege[root]) root = solfege[root];
    let acc = m[2] || '';
    if(acc.toLowerCase()==='s') acc = '#';
    let name = root + acc;
    name = enharmonic[name.toUpperCase()] || name.toUpperCase();
    const semis = {'C':0,'C#':1,'DB':1,'D':2,'D#':3,'EB':3,'E':4,'F':5,'F#':6,'GB':6,'G':7,'G#':8,'AB':8,'A':9,'A#':10,'BB':10,'B':11};
    if(semis[name] === undefined) return null;
    const oct = Number(m[3]);
    return (oct+1)*12 + semis[name];
}

function midiToNote(m){ return noteNames[((m%12)+12)%12] + (Math.floor(m/12)-1); }
function parseNotes(str){ return String(str||'').split(/[ ,;]+/).map(noteToMidi).filter(n=>Number.isFinite(n)); }

window.Studio936MusicTheory = { noteToMidi, midiToNote, parseNotes };
})();
