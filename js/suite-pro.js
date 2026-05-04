// Studio 936 Composer v18 Pro Suite extension (extracted module)
(() => {
  'use strict';
  function $(id){ return document.getElementById(id); }
  function q(sel,root=document){ return root.querySelector(sel); }

  function getTextFn(){ return typeof window.T === 'function' ? window.T : (k => ({suite:'Suite Pro',noChord:'Toca notas para detectar el acorde',applyDetected:'Aplicar acorde detectado',drumsOff:'Batería OFF',library:'library',templates:'templates',transpose:'transpose',scales:'scales',chordAI:'chordAI',drums:'drums',mixer:'mixer',record:'record',midiIn:'midiIn',pdf:'pdf',lead:'lead',practice:'practice',share:'share',inspire:'inspire',theory:'theory'})[k]||k); }

  function buildSuiteProContent(suite){
    const T=getTextFn();
    const buttons=[['library','library'],['templates','templates'],['transpose','transpose'],['scales','scales'],['chordAI','chordAI'],['drums','drums'],['mixer','mixer'],['record','record'],['midiIn','midiIn'],['pdf','pdf'],['lead','lead'],['practice','practice'],['share','share'],['inspire','inspire'],['theory','theory']];
    suite.innerHTML=`<div class="v18-suite-title">${T('suite')}</div><div class="v18-suite-buttons">${buttons.map(([id,label])=>`<button class="v18-pill" id="v18_${id}">${T(label)}</button>`).join('')}</div><div class="v18-detect"><span id="v18DetectOut">${T('noChord')}</span><button class="v18-mini" id="v18ApplyDetected">${T('applyDetected')}</button><button class="v18-mini" id="v18DrumBtn">${T('drumsOff')}</button></div>`;
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
