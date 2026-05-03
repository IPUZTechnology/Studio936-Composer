window.Studio936Transport = (() => {
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

function setup(api){
    function stepOffset(step,style){
        const s = api.styles[style] || api.styles.funk;
        if(!s.swing) return 0;
        const offSteps = [2,6,10,14];
        return offSteps.includes(step%16) ? (60/api.getProject().bpm/4)*s.swing : 0;
    }
    function scheduler(){
        while(api.getIsPlaying() && api.getNextTime() < api.audioCtx.currentTime + .14){
            scheduleStep(api.getNextTime());
            const stepDur = 60 / api.getProject().bpm / 4;
            api.setNextTime(api.getNextTime() + stepDur);
            advanceStep();
        }
        if(api.getIsPlaying()) api.setTimer(requestAnimationFrame(scheduler));
    }
    function scheduleStep(time){
        const item = api.currentItem();
        const section = api.currentSectionKey();
        const stepBar = api.getStepInChord() % 16;
        const barNum = Math.floor(api.getStepInChord()/16) + 1;
        const st = api.styles[api.getProject().style] || api.styles.funk;
        const when = time + stepOffset(stepBar,api.getProject().style);
        const bass = api.noteToMidi(item.bass) ?? 36;
        const notes = api.parseNotes(item.notes);
        const chordNotes = notes.length ? notes : [60,64,67];
        const visualType = {chord:st.chord.includes(stepBar), bass:st.bass.includes(stepBar), ghost:st.ghost.includes(stepBar), solo:false};

        api.setVisual(time,()=>api.updateLiveUI(item,stepBar,barNum,visualType));
        if(api.getMetroEnabled() && stepBar%4===0){ api.playMetronomeClick(stepBar===0,time); api.setVisual(time,()=>api.pulseMetro()); }

        if(st.bass.includes(stepBar)){
            const bassChoice = bassPatternNote(bass,chordNotes,stepBar,api.getProject().style);
            api.playNote(bassChoice,.29,.46,'sine',when);
            if(stepBar===0 || api.getProject().style==='rock' || api.getProject().style==='ballad') api.playNote(Math.max(24,bassChoice-12),.16,.62,'sine',when);
            api.setVisual(when,()=>api.flashKeys([bassChoice, Math.max(24,bassChoice-12)],'active-bass',210));
        }
        if(st.arp){
            const arpSteps = api.getProject().style==='ballad' ? [0,2,4,6,8,10,12,14] : [0,3,6,8,11,14];
            if(arpSteps.includes(stepBar)){
                const m = chordNotes[(Math.floor(stepBar/2)+barNum)%chordNotes.length];
                api.playNote(m,.12,.54,'triangle',when);
                api.setVisual(when,()=>api.flashKeys([m],'active-chord',190));
            }
        }
        if(st.chord.includes(stepBar)) api.strumChord(chordNotes,.13,.35,when,'active-chord');
        if(st.ghost.includes(stepBar)) api.strumChord(thinChord(chordNotes),.055,.18,when,'active-chord');

        if(api.getSoloEnabled()){
            const sectionSolo = api.getSectionSolo(section);
            const solo = api.parseSolo(sectionSolo.phrase || '');
            const event = soloEventAtStep(solo, api.getGlobalStep());
            if(event && event.midi !== null){
                const soloMidi = api.clamp(event.midi,48,84);
                api.playNote(soloMidi,.22,.34,'square',when+.01);
                api.setVisual(when,()=>{ api.flashKeys([soloMidi],'active-solo',240); api.markStepSolo(stepBar); });
            }
        }
    }
    function advanceStep(){
        api.setGlobalStep(api.getGlobalStep()+1);
        api.setStepInChord(api.getStepInChord()+1);
        if(api.getStepInChord() >= api.chordDurationSteps(api.currentItem())){
            api.setStepInChord(0); api.setChordIdx(api.getChordIdx()+1);
            if(api.getChordIdx()>=api.currentSeq().length){
                if(api.getPlayAllMode()){ moveToNextSongSection(); }
                else { api.setChordIdx(0); }
            }
        }
    }
    function moveToNextSongSection(){
        const parts = api.arrangementParts();
        api.setSongSectionIdx(api.getSongSectionIdx()+1);
        if(api.getSongSectionIdx() >= parts.length){ api.stopPlayback(); api.flashStatus('Canción completa reproducida.'); return; }
        const activeSongSection = parts[api.getSongSectionIdx()].section;
        api.setActiveSongSection(activeSongSection);
        api.setActiveSongPartLabel(parts[api.getSongSectionIdx()].label || api.sectionNames[activeSongSection] || activeSongSection);
        api.setSelectedArrangementIndex(api.getSongSectionIdx()); api.renderArrangementBuilder();
        api.setChordIdx(0); api.setStepInChord(0);
    }

    function startStop(){
        api.resumeAudio();
        api.syncProjectFromControls(false); api.saveProject(false);
        if(api.getIsPlaying() && !api.getPlayAllMode()){ stopPlayback(); return; }
        if(api.getIsPlaying()) stopPlayback();
        api.setPlayAllMode(false);
        api.setIsPlaying(true);
        api.els.playBtn.textContent='Stop Groove'; api.els.playBtn.className='btn btn-stop';
        api.els.playSongBtn.textContent='Escuchar canción'; api.els.playSongBtn.classList.remove('active');
        api.setChordIdx(Number(api.els.chordSelect.value)||0); api.setStepInChord(0); api.setGlobalStep(0); api.setNextTime(api.audioCtx.currentTime+.04);
        scheduler();
    }
    function startFullSong(){
        api.resumeAudio();
        api.syncProjectFromControls(false); api.saveProject(false);
        if(api.getIsPlaying() && api.getPlayAllMode()){ stopPlayback(); return; }
        if(api.getIsPlaying()) stopPlayback();
        const parts = api.arrangementParts();
        if(!parts.length){ api.flashStatus('No hay secciones para reproducir.'); return; }
        const activeSongSection = parts[0].section;
        api.setPlayAllMode(true); api.setIsPlaying(true); api.setSongSectionIdx(0); api.setActiveSongSection(activeSongSection); api.setActiveSongPartLabel(parts[0].label || api.sectionNames[activeSongSection] || activeSongSection); api.setSelectedArrangementIndex(0); api.renderArrangementBuilder();
        api.setChordIdx(0); api.setStepInChord(0); api.setGlobalStep(0); api.setNextTime(api.audioCtx.currentTime+.04);
        api.els.playBtn.textContent='Start Groove'; api.els.playBtn.className='btn btn-play';
        api.els.playSongBtn.textContent='Stop canción'; api.els.playSongBtn.classList.add('active');
        scheduler();
    }
    function stopPlayback(){
        api.setIsPlaying(false); api.setPlayAllMode(false); api.setActiveSongSection(api.els.sectionSelect.value); api.setActiveSongPartLabel(api.sectionNames[api.getActiveSongSection()] || api.getActiveSongSection());
        api.els.playBtn.textContent='Start Groove'; api.els.playBtn.className='btn btn-play';
        api.els.playSongBtn.textContent='Escuchar canción'; api.els.playSongBtn.classList.remove('active');
        const timer = api.getTimer();
        if(timer) cancelAnimationFrame(timer);
        api.setTimer(null); api.clearKeys();
        api.getLastVisualTimer().forEach(clearTimeout); api.setLastVisualTimer([]);
        api.els.chordLabel.textContent='Modo manual'; api.updatePartDisplay(); api.updateStepGrid(-1);
    }

    return { startStop, startFullSong, stopPlayback };
}

return { setup, bassPatternNote, thinChord, soloEventAtStep, whileInRange };
})();
