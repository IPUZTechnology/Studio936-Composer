// Studio 936 Composer - Fretboard Module
// Builds and updates the guitar/ukulele/bass fretboard view.

window.Studio936Fretboard = (() => {
'use strict';

function stringsForMode(mode){
    if(mode === 'bass'){
        return [{name:'G', midi:43},{name:'D', midi:38},{name:'A', midi:33},{name:'E', midi:28}];
    }
    if(mode === 'ukulele'){
        return [{name:'A', midi:69},{name:'E', midi:64},{name:'C', midi:60},{name:'G', midi:67}];
    }
    return [{name:'e', midi:64},{name:'B', midi:59},{name:'G', midi:55},{name:'D', midi:50},{name:'A', midi:45},{name:'E', midi:40}];
}

function buildFretboard({els, project, fretCells, midiToNote, onCellPlay}){
    if(!els || !els.fretboard || !els.fretMarkers) return fretCells;

    fretCells.length = 0;

    els.fretMarkers.innerHTML =
        '<span></span>' +
        Array.from({length:13},(_,i)=>`<span class="${[3,5,7,9,12].includes(i)?'fret-dot':''}">${i}</span>`).join('');

    const strings = stringsForMode(project.fretMode);
    const labelMap = {
        guitar:'Diapasón guitarra · vista de notas',
        ukulele:'Diapasón ukelele · vista de notas',
        bass:'Diapasón bajo · vista de notas'
    };

    const title = document.getElementById('fretboardTitle');
    if(title) title.textContent = labelMap[project.fretMode] || labelMap.guitar;

    els.fretboard.style.gridTemplateRows = 'repeat('+strings.length+',34px)';
    els.fretboard.innerHTML = '';

    strings.forEach((st,si)=>{
        const row = document.createElement('div');
        row.className = 'fret-row';

        const label = document.createElement('div');
        label.className = 'string-label';
        label.textContent = st.name;
        row.appendChild(label);

        for(let fret=0; fret<=12; fret++){
            const midi = st.midi + fret;
            const cell = document.createElement('div');
            cell.className = 'fret-cell';
            cell.dataset.midi = midi;
            cell.dataset.string = si;
            cell.dataset.fret = fret;
            cell.innerHTML = `<span>${midiToNote(midi).replace(/-?\d+$/,'')}</span>`;

            const play = ev => {
                ev.preventDefault();
                if(typeof onCellPlay === 'function') onCellPlay(midi);
            };

            cell.addEventListener('pointerdown', play, {passive:false});
            cell.addEventListener('contextmenu', e=>e.preventDefault());

            row.appendChild(cell);
            fretCells.push(cell);
        }

        els.fretboard.appendChild(row);
    });

    return fretCells;
}

function setViewMode({mode, project, els, updateFretboardMap}){
    project.viewMode = mode === 'fretboard' ? 'fretboard' : 'piano';

    const pianoBox = document.getElementById('pianoContainer');
    if(pianoBox) pianoBox.style.display = project.viewMode === 'piano' ? 'flex' : 'none';

    if(els.fretboardContainer){
        els.fretboardContainer.style.display = project.viewMode === 'fretboard' ? 'flex' : 'none';
    }

    if(els.viewToggleBtn){
        els.viewToggleBtn.textContent = project.viewMode === 'piano' ? 'Vista diapasón' : 'Vista piano';
    }

    if(typeof updateFretboardMap === 'function') updateFretboardMap();
}

function flashFretboard(fretCells, midis, cls, dur=220){
    if(!fretCells || !fretCells.length) return;

    const set = new Set(midis.filter(Number.isFinite).map(Number));
    const active = [];

    fretCells.forEach(c=>{
        if(set.has(Number(c.dataset.midi))){
            c.classList.add(cls);
            active.push(c);
        }
    });

    setTimeout(()=>active.forEach(c=>c.classList.remove(cls)), dur);
}

function clearFretboardActive(fretCells){
    if(!fretCells) return;
    fretCells.forEach(c=>c.classList.remove('active-chord','active-bass','active-solo'));
}

function updateFretboardMap({fretCells, item, parseNotes, noteToMidi}){
    if(!fretCells || !fretCells.length) return;

    fretCells.forEach(c=>c.classList.remove('map-chord','map-bass'));
    if(!item) return;

    const notes = new Set(parseNotes(item.notes));
    const bass = noteToMidi(item.bass);

    fretCells.forEach(c=>{
        const m = Number(c.dataset.midi);
        if(notes.has(m)) c.classList.add('map-chord');
        if(Number.isFinite(bass) && ((m-bass)%12+12)%12===0) c.classList.add('map-bass');
    });
}

return {
    buildFretboard,
    setViewMode,
    flashFretboard,
    clearFretboardActive,
    updateFretboardMap
};

})();
