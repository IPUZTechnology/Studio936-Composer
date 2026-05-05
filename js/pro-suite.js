// Studio 936 Composer - Suite Pro UI restoration
// UI only. No MIDI / transport / arrangement / playback / editor.

(function(){
  'use strict';

  const BUTTONS = [
    ['library','v18_library','Library'],
    ['templates','v18_templates','Templates'],
    ['transpose','v18_transpose','Transpose'],
    ['scales','v18_scales','Scales'],
    ['chordAI','v18_chordAI','Chord AI'],
    ['drums','v18_drums','Drums'],
    ['mixer','v18_mixer','Mixer'],
    ['record','v18_record','Record'],
    ['midiIn','v18_midiIn','MIDI In'],
    ['pdf','v18_pdf','PDF'],
    ['lead','v18_lead','Lead Sheet'],
    ['practice','v18_practice','Practice'],
    ['share','v18_share','Share'],
    ['inspire','v18_inspire','Inspire'],
    ['theory','v18_theory','Theory']
  ];

  function ensurePanel(){
    let suite = document.getElementById('v18Suite');
    if(!suite){
      suite = document.createElement('div');
      suite.id = 'v18Suite';
      document.body.appendChild(suite);
    }
    suite.classList.add('v18-suite');

    let close = document.getElementById('b25SuiteClose');
    if(!close || close.parentElement !== suite){
      close = document.createElement('button');
      close.id = 'b25SuiteClose';
      close.className = 'b25SuiteClose';
      close.type = 'button';
      close.title = 'Close panel';
      close.textContent = '×';
      suite.insertBefore(close, suite.firstChild);
    }
    close.onclick = () => suite.classList.remove('v19-open');

    let inner = suite.querySelector('.v18-suite-inner');
    if(!inner){
      inner = document.createElement('div');
      inner.className = 'v18-suite-inner';
      suite.appendChild(inner);
    }

    let title = inner.querySelector('.v18-suite-title');
    if(!title){
      title = document.createElement('div');
      title.className = 'v18-suite-title';
      title.textContent = 'Suite Pro';
      inner.appendChild(title);
    }

    let wrap = inner.querySelector('.v18-suite-buttons');
    if(!wrap){
      wrap = document.createElement('div');
      wrap.className = 'v18-suite-buttons';
      inner.appendChild(wrap);
    }

    BUTTONS.forEach(([key,id,label]) => {
      if(wrap.querySelector('#' + CSS.escape(id))) return;
      const btn = document.createElement('button');
      btn.id = id;
      btn.className = 'v18-pill';
      btn.type = 'button';
      btn.dataset.v18Tool = key;
      btn.textContent = label;
      wrap.appendChild(btn);
    });

    return suite;
  }

  function open(){
    const suite = ensurePanel();
    suite.classList.add('v19-open');
    return suite;
  }

  function close(){
    const suite = document.getElementById('v18Suite');
    if(suite) suite.classList.remove('v19-open');
  }

  function toggle(){
    const suite = ensurePanel();
    suite.classList.toggle('v19-open');
    return suite;
  }

  window.Studio936SuitePro = {
    open,
    close,
    toggle,
    ensureMounted: ensurePanel
  };
})();
