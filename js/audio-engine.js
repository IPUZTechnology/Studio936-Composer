(function(global){
  const state = { helpers:null };
  function h(){ return state.helpers || {}; }

  function setup(helpers){ state.helpers = helpers || {}; return api; }
  function resumeAudio(){ const ctx=h().audioCtx; if(ctx && ctx.state==='suspended') return ctx.resume(); }
  function playNote(midi,dur=.18,vol=.45,type='triangle',when){
    const playImpl = h().playNoteImpl;
    if(typeof playImpl === 'function') return playImpl(midi,dur,vol,type,when);
  }
  function strumChord(notes,dur,vol,when,cls='active-chord'){
    const hh=h();
    const delay = typeof hh.getStrumDelay === 'function' ? hh.getStrumDelay() : .012;
    (notes||[]).forEach((m,i)=>playNote(m,dur,vol,'triangle',(when ?? hh.audioCtx?.currentTime) + i*delay));
    if(typeof hh.setVisual === 'function' && typeof hh.flashKeys === 'function') hh.setVisual(when ?? hh.audioCtx?.currentTime,()=>hh.flashKeys(notes,cls,230));
  }
  function playMetronomeClick(accent=false,when){
    const hh=h(); const ctx=hh.audioCtx; if(!ctx) return;
    const now = Math.max(when ?? ctx.currentTime, ctx.currentTime);
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type='square';
    osc.frequency.setValueAtTime(accent ? 1760 : 1175, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(accent ? 0.24 : 0.17, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (accent ? 0.08 : 0.06));
    osc.connect(gain);
    if(typeof hh.connectOut === 'function') hh.connectOut(gain,'click'); else gain.connect(ctx.destination);
    osc.start(now); osc.stop(now+0.1);
  }
  function previewMetronome(){
    const hh=h(); const ctx=hh.audioCtx; const p = typeof hh.getProject==='function' ? hh.getProject() : hh.project;
    if(!ctx || !p) return;
    resumeAudio();
    const beatDur = 60 / p.bpm;
    const start = ctx.currentTime + 0.04;
    for(let i=0;i<4;i++){
      const t = start + i*beatDur;
      playMetronomeClick(i===0,t);
      if(typeof hh.setVisual==='function' && typeof hh.pulseMetro==='function') hh.setVisual(t,()=>hh.pulseMetro());
    }
  }

  const api = { setup,resumeAudio,playNote,strumChord,playMetronomeClick,previewMetronome };
  global.Studio936AudioEngine = api;
})(window);
