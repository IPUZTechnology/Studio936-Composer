// Studio 936 Composer - Fretboard Module
// Builds and updates the guitar/ukulele/bass fretboard view.
// v0.7.1.4 · SuperGuitarra 936 Base: exact voicing first, live main surface.

window.Studio936Fretboard = (() => {
'use strict';

const FALLBACK_PROFILES = {
    guitar:{
        id:'guitar',
        label:'Guitarra',
        maxFret:24,
        strings:[
            {number:6,label:'E',open:'E2',midi:40},
            {number:5,label:'A',open:'A2',midi:45},
            {number:4,label:'D',open:'D3',midi:50},
            {number:3,label:'G',open:'G3',midi:55},
            {number:2,label:'B',open:'B3',midi:59},
            {number:1,label:'e',open:'E4',midi:64}
        ]
    },
    ukulele:{
        id:'ukulele',
        label:'Ukelele',
        maxFret:20,
        strings:[
            {number:4,label:'G',open:'G4',midi:67},
            {number:3,label:'C',open:'C4',midi:60},
            {number:2,label:'E',open:'E4',midi:64},
            {number:1,label:'A',open:'A4',midi:69}
        ]
    },
    bass:{
        id:'bass',
        label:'Bajo eléctrico',
        maxFret:24,
        strings:[
            {number:4,label:'E',open:'E1',midi:28},
            {number:3,label:'A',open:'A1',midi:33},
            {number:2,label:'D',open:'D2',midi:38},
            {number:1,label:'G',open:'G2',midi:43}
        ]
    }
};

function normalizeMode(mode){
    return ['guitar','ukulele','bass'].includes(mode) ? mode : 'guitar';
}

function profileForMode(mode){
    const key = normalizeMode(mode);
    return window.Studio936StringInstruments?.profile?.(key) || FALLBACK_PROFILES[key] || FALLBACK_PROFILES.guitar;
}

function stringsForMode(mode){
    const profile = profileForMode(mode);
    return profile.strings.map((string, profileIndex) => ({
        name:string.label || string.open || String(string.number),
        midi:Number(string.midi),
        number:string.number,
        open:string.open,
        profileIndex
    })).reverse();
}

function currentMode(project){
    const instrument = project?.instrument;
    if(['guitar','ukulele','bass'].includes(instrument)) return instrument;
    return normalizeMode(project?.fretMode || 'guitar');
}

function titleForMode(mode){
    if(mode === 'ukulele') return 'SuperUkelele 936';
    if(mode === 'bass') return 'SuperBajo 936';
    return 'SuperGuitarra 936';
}

function clamp(n,a,b){
    const value = Number(n);
    return Math.max(a,Math.min(b,Number.isFinite(value) ? value : a));
}

function normalizeFret(value,maxFret=24){
    if(value === null || value === undefined) return null;
    const text = String(value).trim().toUpperCase();
    if(!text || text === 'X' || text === 'M') return null;
    return clamp(Number(text)||0,0,maxFret);
}

function getVoicing(item,mode){
    const profile = profileForMode(mode);
    const voicing = item?.voicings?.[mode] || item?.voicings?.[profile.id];
    if(!voicing || !Array.isArray(voicing.frets) || voicing.frets.length !== profile.strings.length) return null;
    const capo = profile.allowCapo ? clamp(Number(voicing.capo)||0,0,profile.capoMax || 12) : 0;
    const frets = voicing.frets.map(value => normalizeFret(value,profile.maxFret || 24));
    const fingers = Array.isArray(voicing.fingers) ? voicing.fingers.map(value => String(value ?? '')) : [];
    const strings = profile.strings.map((string,index) => {
        const fret = frets[index];
        if(fret === null) {
            return {
                index,
                number:string.number,
                label:string.label,
                midi:null,
                fret:null,
                physicalFret:null,
                finger:fingers[index] || '',
                muted:true
            };
        }
        const physicalFret = capo + fret;
        return {
            index,
            number:string.number,
            label:string.label,
            midi:Number(string.midi) + physicalFret,
            fret,
            physicalFret,
            finger:fingers[index] || (fret === 0 ? '0' : ''),
            muted:false
        };
    });
    const sounded = strings.filter(string => Number.isFinite(string.midi));
    return {
        profile,
        capo,
        frets,
        fingers,
        strings,
        midis:Array.isArray(voicing.midis) && voicing.midis.length
            ? voicing.midis.map(Number).filter(Number.isFinite)
            : sounded.map(string => string.midi),
        bass:sounded.reduce((lowest,current) => !lowest || current.midi < lowest.midi ? current : lowest, null)
    };
}

function ensureShapeText(){
    const wrap = document.querySelector('.fretboard-wrap');
    if(!wrap) return null;
    wrap.classList.add('v20-chord-mode','s936-super-guitar-main');
    let el = document.getElementById('v20FretShapeText');
    if(!el){
        el = document.createElement('div');
        el.id = 'v20FretShapeText';
        const head = document.querySelector('.fretboard-head');
        head?.insertAdjacentElement('afterend',el);
    }
    return el;
}

function clearMapState(fretCells){
    (fretCells || []).forEach(cell => {
        cell.classList.remove(
            'map-chord','map-bass','v20-shape','v20-root','v20-bass',
            's936-main-voicing','s936-main-open','s936-main-hit'
        );
        const span = cell.querySelector('span');
        if(span){
            span.removeAttribute('data-finger');
            span.removeAttribute('data-note-role');
        }
    });
    document.querySelectorAll('.string-label').forEach(label => {
        label.classList.remove('v20-muted','s936-main-muted','s936-main-string-on');
    });
}

function describeVoicing(voicing,mode,item){
    if(!voicing) return '';
    const label = titleForMode(mode);
    const chordName = item?.name || 'Acorde';
    const shape = voicing.strings
        .map(string => string.muted ? `${string.label}:×` : `${string.label}:${string.fret}`)
        .reverse()
        .join('  ');
    return `${label} · ${chordName} · ${shape}`;
}

function buildFretboard({els, project, fretCells, midiToNote, onCellPlay}){
    if(!els || !els.fretboard || !els.fretMarkers) return fretCells;

    fretCells.length = 0;

    els.fretMarkers.innerHTML =
        '<span></span>' +
        Array.from({length:13},(_,i)=>`<span class="${[3,5,7,9,12].includes(i)?'fret-dot':''}">${i}</span>`).join('');

    const mode = currentMode(project);
    const strings = stringsForMode(mode);
    const labelMap = {
        guitar:'SuperGuitarra 936 · manual / follow',
        ukulele:'SuperUkelele 936 · manual / follow',
        bass:'SuperBajo 936 · manual / follow'
    };

    const title = document.getElementById('fretboardTitle');
    if(title) title.textContent = labelMap[mode] || labelMap.guitar;
    const hint = document.getElementById('fretboardHint');
    if(hint) hint.textContent = 'Toca cuerda/traste para escuchar · el acorde activo ilumina una digitación real';

    els.fretboard.style.gridTemplateRows = 'repeat('+strings.length+',34px)';
    els.fretboard.innerHTML = '';

    strings.forEach((st,si)=>{
        const row = document.createElement('div');
        row.className = 'fret-row';
        row.dataset.profileIndex = String(st.profileIndex);

        const label = document.createElement('div');
        label.className = 'string-label';
        label.textContent = st.name;
        label.dataset.profileIndex = String(st.profileIndex);
        label.title = `Cuerda ${st.number || st.name} · ${st.open || ''}`;
        row.appendChild(label);

        for(let fret=0; fret<=12; fret++){
            const midi = st.midi + fret;
            const cell = document.createElement('button');
            cell.type = 'button';
            cell.className = 'fret-cell';
            cell.dataset.midi = String(midi);
            cell.dataset.string = String(si);
            cell.dataset.profileIndex = String(st.profileIndex);
            cell.dataset.fret = String(fret);
            cell.dataset.mode = mode;
            cell.innerHTML = `<span>${midiToNote(midi).replace(/-?\d+$/,'')}</span>`;
            cell.title = `${titleForMode(mode)} · cuerda ${st.number || st.name} · traste ${fret} · ${midiToNote(midi)}`;

            const play = ev => {
                ev.preventDefault();
                cell.classList.add('s936-main-hit');
                setTimeout(()=>cell.classList.remove('s936-main-hit'),180);
                if(typeof onCellPlay === 'function') onCellPlay(midi,{mode,stringIndex:st.profileIndex,displayIndex:si,fret});
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

    const set = new Set((midis || []).filter(Number.isFinite).map(n => Math.round(Number(n))));
    const active = [];

    fretCells.forEach(c=>{
        if(set.has(Number(c.dataset.midi))){
            c.classList.add(cls);
            c.classList.add('s936-main-hit');
            active.push(c);
        }
    });

    setTimeout(()=>active.forEach(c=>{
        c.classList.remove(cls);
        c.classList.remove('s936-main-hit');
    }), dur);
}

function clearFretboardActive(fretCells){
    if(!fretCells) return;
    fretCells.forEach(c=>c.classList.remove('active-chord','active-bass','active-solo','s936-main-hit'));
}

function updateFretboardMap({fretCells, item, parseNotes, noteToMidi, project}){
    if(!fretCells || !fretCells.length) return;

    const mode = currentMode(project || {});
    clearMapState(fretCells);
    if(!item) return;

    const title = document.getElementById('fretboardTitle');
    const text = ensureShapeText();
    const voicing = getVoicing(item,mode);

    if(voicing){
        const lowestMidi = voicing.bass?.midi ?? null;
        voicing.strings.forEach(string => {
            const label = document.querySelector(`.string-label[data-profile-index="${string.index}"]`);
            if(string.muted){
                label?.classList.add('s936-main-muted','v20-muted');
                return;
            }
            label?.classList.add('s936-main-string-on');
            const physicalFret = Number(string.physicalFret);
            if(!Number.isFinite(physicalFret) || physicalFret < 0 || physicalFret > 12) return;
            const cell = document.querySelector(`.fret-cell[data-profile-index="${string.index}"][data-fret="${physicalFret}"]`);
            if(!cell) return;
            const isBass = Number.isFinite(lowestMidi) && string.midi === lowestMidi;
            cell.classList.add('map-chord','v20-shape','s936-main-voicing');
            if(string.fret === 0) cell.classList.add('s936-main-open');
            if(isBass) cell.classList.add('map-bass','v20-bass');
            const span = cell.querySelector('span');
            if(span){
                span.setAttribute('data-finger', string.finger || (string.fret === 0 ? '0' : '•'));
                span.setAttribute('data-note-role', isBass ? 'bass' : 'chord');
            }
        });
        if(title) title.textContent = `${titleForMode(mode)} · ${item.name || 'Acorde'} · digitación real`;
        if(text) text.textContent = describeVoicing(voicing,mode,item);
        return;
    }

    const notes = new Set(typeof parseNotes === 'function' ? parseNotes(item.notes) : []);
    const bass = typeof noteToMidi === 'function' ? noteToMidi(item.bass) : null;

    fretCells.forEach(c=>{
        const m = Number(c.dataset.midi);
        if(notes.has(m)) c.classList.add('map-chord','s936-main-voicing');
        if(Number.isFinite(bass) && m === bass) c.classList.add('map-bass','v20-bass');
    });
    if(title) title.textContent = `${titleForMode(mode)} · ${item.name || 'Acorde'} · mapa temporal`;
    if(text) text.textContent = `Forma sugerida: guarda una digitación en el Editor para que el Main use la guitarra real.`;
}

return {
    version:'fretboard-v0.7.1.4-super-guitar-base',
    buildFretboard,
    setViewMode,
    flashFretboard,
    clearFretboardActive,
    updateFretboardMap,
    getVoicing
};

})();
