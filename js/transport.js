// Studio 936 Composer transport/playback module
(() => {
'use strict';

const state = {
  isPlaying:false, metroEnabled:false, soloEnabled:true, playAllMode:false,
  activeSongSection:'intro', activeSongPartLabel:'Introducción', songSectionIdx:0,
  chordIdx:0, stepInChord:0, globalStep:0, soloCursor:0, timer:null, nextTime:0, lastVisualTimer:[]
};
let H = null;

function setup(helpers){ H = helpers; }
function getState(){ return state; }
function isPlaying(){ return state.isPlaying; }

function setVisual(time,fn){
  const delay = Math.max(0,(time-H.audioCtx.currentTime)*1000);
  state.lastVisualTimer.push(setTimeout(fn,delay));
}
function currentSectionKey(){ return state.playAllMode ? state.activeSongSection : H.editorSectionKey(); }
function currentSeq(){return H.project().sections[currentSectionKey()] || H.project().sections.intro;}
function currentItem(){ const seq=currentSeq(); return seq[Math.min(state.chordIdx,seq.length-1)] || H.fallbackChord(); }
function chordDurationSteps(item){ return Math.max(1,Number(item.bars)||1) * 16; }
function stepOffset(step,style){
  const s = H.styles[style] || H.styles.funk;
  if(!s.swing) return 0;
  return [2,6,10,14].includes(step%16) ? (60/H.project().bpm/4)*s.swing : 0;
}
function scheduler(){
  while(state.isPlaying && state.nextTime < H.audioCtx.currentTime + .14){
    scheduleStep(state.nextTime);
    const stepDur = 60 / H.project().bpm / 4;
    state.nextTime += stepDur;
    advanceStep();
  }
  if(state.isPlaying) state.timer = requestAnimationFrame(scheduler);
}
function scheduleStep(time){
  const item = currentItem();
  const section = currentSectionKey();
  const stepBar = state.stepInChord % 16;
  const barNum = Math.floor(state.stepInChord/16) + 1;
  const project = H.project();
  const st = H.styles[project.style] || H.styles.funk;
  const when = time + stepOffset(stepBar,project.style);
  const bass = H.noteToMidi(item.bass) ?? 36;
  const notes = H.parseNotes(item.notes);
  const chordNotes = notes.length ? notes : [60,64,67];
  const visualType = {chord:st.chord.includes(stepBar), bass:st.bass.includes(stepBar), ghost:st.ghost.includes(stepBar), solo:false};

  setVisual(time,()=>H.updateLiveUI(item,stepBar,barNum,visualType,state.playAllMode,state.activeSongPartLabel,currentSectionKey()));
  if(state.metroEnabled && stepBar%4===0){ H.playTick(stepBar===0,time); setVisual(time,()=>H.pulseMetro()); }

  if(st.bass.includes(stepBar)){
    const bassChoice = H.bassPatternNote(bass,chordNotes,stepBar,project.style);
    H.playChordNow(bassChoice,.29,.46,'sine',when);
    if(stepBar===0 || project.style==='rock' || project.style==='ballad') H.playChordNow(Math.max(24,bassChoice-12),.16,.62,'sine',when);
    setVisual(when,()=>H.flashKeys([bassChoice, Math.max(24,bassChoice-12)],'active-bass',210));
  }
  if(st.arp){
    const arpSteps = project.style==='ballad' ? [0,2,4,6,8,10,12,14] : [0,3,6,8,11,14];
    if(arpSteps.includes(stepBar)){
      const m = chordNotes[(Math.floor(stepBar/2)+barNum)%chordNotes.length];
      H.playChordNow(m,.12,.54,'triangle',when);
      setVisual(when,()=>H.flashKeys([m],'active-chord',190));
    }
  }
  if(st.chord.includes(stepBar)) H.strumChord(chordNotes,.13,.35,when,'active-chord');
  if(st.ghost.includes(stepBar)) H.strumChord(H.thinChord(chordNotes),.055,.18,when,'active-chord');

  if(state.soloEnabled){
    const sectionSolo = H.getSectionSolo(section);
    const solo = H.parseSolo(sectionSolo.phrase || '');
    const event = H.soloEventAtStep(solo, state.globalStep);
    if(event && event.midi !== null){
      const soloMidi = H.clamp(event.midi,48,84);
      H.playSoloTick(soloMidi,.22,.34,'square',when+.01);
      setVisual(when,()=>{ H.flashKeys([soloMidi],'active-solo',240); H.markStepSolo(stepBar); });
    }
  }
}
function advanceStep(){
  state.globalStep++; state.stepInChord++;
  if(state.stepInChord >= chordDurationSteps(currentItem())){
    state.stepInChord=0; state.chordIdx++;
    if(state.chordIdx>=currentSeq().length){
      if(state.playAllMode){ moveToNextSongSection(); }
      else { state.chordIdx=0; }
    }
  }
}
function moveToNextSongSection(){
  const parts = H.arrangementParts(); state.songSectionIdx++;
  if(state.songSectionIdx >= parts.length){ stopPlayback(); H.flashStatus('Canción completa reproducida.'); return; }
  state.activeSongSection = parts[state.songSectionIdx].section;
  state.activeSongPartLabel = parts[state.songSectionIdx].label || H.sectionName(state.activeSongSection) || state.activeSongSection;
  H.setSelectedArrangementIndex(state.songSectionIdx); H.renderArrangementBuilder();
  state.chordIdx = 0; state.stepInChord = 0;
}
function updatePlayButtons(){
  H.els.playBtn.textContent = state.isPlaying && !state.playAllMode ? 'Stop Groove' : 'Start Groove';
  H.els.playBtn.className = state.isPlaying && !state.playAllMode ? 'btn btn-stop' : 'btn btn-play';
  H.els.playSongBtn.textContent = state.isPlaying && state.playAllMode ? 'Stop canción' : 'Escuchar canción';
  H.els.playSongBtn.classList.toggle('active', state.isPlaying && state.playAllMode);
}
function stopTransportVisuals(){
  if(state.timer) cancelAnimationFrame(state.timer); state.timer=null; H.clearKeys();
  state.lastVisualTimer.forEach(clearTimeout); state.lastVisualTimer=[];
  H.els.chordLabel.textContent='Modo manual'; H.updatePartDisplay(state.playAllMode,state.activeSongPartLabel,currentSectionKey()); H.updateStepGrid(-1);
}
function startPlayback(all){
  H.resumeAudio(); H.syncProjectFromControls(false); H.saveProject(false);
  if(state.isPlaying && state.playAllMode===!!all){ stopPlayback(); return; }
  if(state.isPlaying) stopPlayback();
  if(all){
    const parts = H.arrangementParts();
    if(!parts.length){ H.flashStatus('No hay secciones para reproducir.'); return; }
    state.playAllMode=true; state.isPlaying=true; state.songSectionIdx=0; state.activeSongSection=parts[0].section;
    state.activeSongPartLabel = parts[0].label || H.sectionName(state.activeSongSection) || state.activeSongSection;
    H.setSelectedArrangementIndex(0); H.renderArrangementBuilder();
  } else {
    state.playAllMode=false; state.isPlaying=true;
    state.chordIdx = Number(H.els.chordSelect.value)||0;
  }
  state.stepInChord=0; state.globalStep=0; state.nextTime=H.audioCtx.currentTime+.04;
  updatePlayButtons(); scheduler();
}
function stopPlayback(){
  state.isPlaying=false; state.playAllMode=false; state.activeSongSection=H.els.sectionSelect.value;
  state.activeSongPartLabel = H.sectionName(state.activeSongSection) || state.activeSongSection;
  updatePlayButtons(); stopTransportVisuals();
}
function togglePlay(){ startPlayback(false); }
function togglePlaySong(){ startPlayback(true); }
function toggleMetro(){
  state.metroEnabled=!state.metroEnabled;
  H.els.metroBtn.textContent=state.metroEnabled?'Metrónomo ON 🔊':'Metrónomo OFF';
  H.els.metroBtn.classList.toggle('active',state.metroEnabled);
  if(state.metroEnabled){ H.previewMetronome(); H.flashStatus('Metrónomo activado: escucharás el click junto con Start Groove o Escuchar canción.'); } else H.flashStatus('Metrónomo apagado.');
}
function toggleSolo(){
  state.soloEnabled=!state.soloEnabled;
  const p=H.project(); p.soloOn=state.soloEnabled; H.setProject(p);
  H.els.soloBtn.textContent=state.soloEnabled?'Solo ON':'Solo OFF'; H.els.soloBtn.classList.toggle('active',state.soloEnabled); H.saveProject(false);
}
window.Studio936Transport = { setup,startPlayback,stopPlayback,togglePlay,togglePlaySong,toggleMetro,toggleSolo,isPlaying,getState,playTick:(...a)=>H.playTick(...a),stepVisual:setVisual,updateNowBars:advanceStep,setCurrentLabels:()=>H.updatePartDisplay(state.playAllMode,state.activeSongPartLabel,currentSectionKey()),stopTransportVisuals,updatePlayButtons };
})();
