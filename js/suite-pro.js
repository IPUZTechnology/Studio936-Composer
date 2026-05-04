// Studio 936 Composer v18 Pro Suite extension (extracted module)
(() => {
  'use strict';
  function $(id){ return document.getElementById(id); }
  function q(sel,root=document){ return root.querySelector(sel); }

  function getTextFn(){ return typeof window.T === 'function' ? window.T : (k => ({suite:'Suite Pro',noChord:'Toca notas para detectar el acorde',applyDetected:'Aplicar acorde detectado',drumsOff:'Batería OFF',library:'library',templates:'templates',transpose:'transpose',scales:'scales',chordAI:'chordAI',drums:'drums',mixer:'mixer',record:'record',midiIn:'midiIn',pdf:'pdf',lead:'lead',practice:'practice',share:'share',inspire:'inspire',theory:'theory'})[k]||k); }

  function buildSuiteProContent(suite){
    const T=getTextFn();
    const buttons=[['library','library'],['templates','templates'],['transpose','transpose'],['scales','scales'],['chordAI','chordAI'],['drums','drums'],['mixer','mixer'],['record','record'],['midiIn','midiIn'],['pdf','pdf'],['lead','lead'],['practice','practice'],['share','share'],['inspire','inspire'],['theory','theory']];

    let title=suite.querySelector('.v18-suite-title');
    if(!title){ title=document.createElement('div'); title.className='v18-suite-title'; suite.appendChild(title); }
    title.textContent=T('suite');

    let buttonsWrap=suite.querySelector('.v18-suite-buttons');
    if(!buttonsWrap){ buttonsWrap=document.createElement('div'); buttonsWrap.className='v18-suite-buttons'; suite.appendChild(buttonsWrap); }
    buttons.forEach(([id,label])=>{
      const bid='v18_'+id;
      let b=buttonsWrap.querySelector('#'+bid);
      if(!b){ b=document.createElement('button'); b.id=bid; b.className='v18-pill'; b.type='button'; buttonsWrap.appendChild(b); }
      b.classList.add('v18-pill');
      b.type='button';
      b.textContent=T(label);
    });

    let detect=suite.querySelector('.v18-detect');
    if(!detect){ detect=document.createElement('div'); detect.className='v18-detect'; suite.appendChild(detect); }

    let out=detect.querySelector('#v18DetectOut');
    if(!out){ out=document.createElement('span'); out.id='v18DetectOut'; detect.appendChild(out); }
    out.textContent=T('noChord');

    let apply=detect.querySelector('#v18ApplyDetected');
    if(!apply){ apply=document.createElement('button'); apply.id='v18ApplyDetected'; apply.className='v18-mini'; apply.type='button'; detect.appendChild(apply); }
    apply.textContent=T('applyDetected');

    let drum=detect.querySelector('#v18DrumBtn');
    if(!drum){ drum=document.createElement('button'); drum.id='v18DrumBtn'; drum.className='v18-mini'; drum.type='button'; detect.appendChild(drum); }
    drum.textContent=T('drumsOff');
  }

  function bindSuiteProHandlers(){
    const map={library:'showLibrary',templates:'showTemplates',transpose:'showTranspose',scales:'showScales',chordAI:'showChordAI',drums:'toggleDrums',mixer:'showMixer',midiIn:'setupMidiIn',pdf:'exportPdf',lead:'showLeadSheet',practice:'showPractice',share:'showShare',inspire:'inspire',theory:'showTheory'};
    Object.entries(map).forEach(([id,fn])=>{ const el=$("v18_"+id); const cb=window[fn]; if(el && typeof cb==='function') el.onclick=cb; });
    const rec=$('v18_record'); if(rec){ rec.id='v18RecBtn'; if(typeof window.toggleRec==='function') rec.onclick=window.toggleRec; }
    if($('v18ApplyDetected') && typeof window.applyDetectedChord==='function') $('v18ApplyDetected').onclick=window.applyDetectedChord;
    if($('v18DrumBtn') && typeof window.toggleDrums==='function') $('v18DrumBtn').onclick=window.toggleDrums;
  }

  function populateSuiteProPanel(suite){
    if(!suite) return null;
    buildSuiteProContent(suite);
    bindSuiteProHandlers();
    return suite;
  }

  function addV18Ui(){
    const status=q('.status-bar');
    if(!status || $('v18Suite')) return $('v18Suite');
    const bar=document.createElement('div');
    bar.id='v18Suite';
    bar.className='v18-suite';
    populateSuiteProPanel(bar);
    status.insertAdjacentElement('afterend',bar);
    return bar;
  }

  function ensureSuiteProMounted(){
    const existing=$('v18Suite');
    return existing || addV18Ui();
  }

  window.Studio936SuitePro={ addV18Ui, buildSuiteProContent, populateSuiteProPanel, bindSuiteProHandlers, ensureSuiteProMounted };
})();
