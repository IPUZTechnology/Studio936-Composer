(() => {
  'use strict';

  const BUTTON_KEYS = [
    'library','templates','transpose','scales','chordAI','drums','mixer','record','midiIn','pdf','lead','practice','share','inspire','theory'
  ];

  function $(id){ return document.getElementById(id); }
  function q(sel,root=document){ return root.querySelector(sel); }
  function T(k){ try{ return (typeof window.T==='function' ? window.T(k) : k); }catch(_){ return k; } }

  function ensureSuite(){
    let suite = $('v18Suite');
    if(!suite){
      suite = document.createElement('div');
      suite.id = 'v18Suite';
      suite.className = 'v18-suite';
      const status = q('.status-bar');
      if(status && status.parentNode) status.insertAdjacentElement('afterend', suite);
      else document.body.appendChild(suite);
    }
    return suite;
  }

  function ensureClose(suite){
    let closeBtn = $('b25SuiteClose');
    if(!closeBtn){
      closeBtn = document.createElement('button');
      closeBtn.id = 'b25SuiteClose';
      closeBtn.type = 'button';
      closeBtn.title = 'Close panel';
      closeBtn.textContent = '×';
      suite.appendChild(closeBtn);
    } else if(closeBtn.parentNode !== suite){
      suite.appendChild(closeBtn);
    }
    if(!closeBtn.dataset.boundClose){
      closeBtn.dataset.boundClose = '1';
      closeBtn.addEventListener('click', () => {
        const panel = $('v18Suite');
        if(panel) panel.classList.remove('v19-open');
      });
    }
  }

  function ensureInner(suite){
    let inner = q('.v18-suite-inner', suite);
    if(!inner){
      inner = document.createElement('div');
      inner.className = 'v18-suite-inner';
      suite.appendChild(inner);
    }
    return inner;
  }

  function ensureTitle(inner){
    let title = q('.v18-suite-title', inner);
    if(!title){
      title = document.createElement('div');
      title.className = 'v18-suite-title';
      inner.appendChild(title);
    }
    title.textContent = 'Suite Pro';
  }

  function ensureButtonsWrap(inner){
    let wrap = q('.v18-suite-buttons', inner);
    if(!wrap){
      wrap = document.createElement('div');
      wrap.className = 'v18-suite-buttons';
      inner.appendChild(wrap);
    }
    return wrap;
  }

  function ensureButtons(wrap){
    BUTTON_KEYS.forEach((key) => {
      const id = `v18_${key}`;
      let btn = $(id);
      if(!btn){
        btn = document.createElement('button');
        btn.id = id;
        btn.type = 'button';
        btn.className = 'v18-pill';
        wrap.appendChild(btn);
      } else if(btn.parentNode !== wrap){
        wrap.appendChild(btn);
      }
      btn.textContent = T(key);
    });
  }

  function open(){
    const suite = ensureSuite();
    ensureClose(suite);
    const inner = ensureInner(suite);
    ensureTitle(inner);
    const wrap = ensureButtonsWrap(inner);
    ensureButtons(wrap);
    suite.classList.add('v19-open');
  }

  function close(){
    const suite = $('v18Suite');
    if(suite) suite.classList.remove('v19-open');
  }

  function toggle(){
    const suite = ensureSuite();
    if(!suite.classList.contains('v19-open')) open();
    else close();
  }

  window.Studio936SuitePro = { open, close, toggle };
})();
