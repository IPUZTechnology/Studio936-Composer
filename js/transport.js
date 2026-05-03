(() => {
'use strict';

function whileInRange(n,min,max){ while(n<min)n+=12; while(n>max)n-=12; return n; }
function thinChord(notes){ if(notes.length<=2) return notes; return [notes[0], notes[notes.length-1]]; }
function soloEventAtStep(events,step){
    if(!events.length) return null;
    const total = events.reduce((a,e)=>a+e.dur,0);
    let pos = step % total;
    for(const e of events){ if(pos===0) return e; pos -= e.dur; if(pos<0) return null; }
    return null;
}
function bassPatternNote(bass,chordNotes,step,style){
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

window.Studio936Transport = {
    whileInRange,
    thinChord,
    soloEventAtStep,
    bassPatternNote
};
})();
