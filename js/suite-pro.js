// Suite Pro v18 legacy panel ported from legacy/suite_pro_v18_extract_REAL.json (source-only, no runtime JSON).
(() => {
  'use strict';

  const BUTTONS = [
    ['library','v18_library'],['templates','v18_templates'],['transpose','v18_transpose'],['scales','v18_scales'],['chordAI','v18_chordAI'],
    ['drums','v18_drums'],['mixer','v18_mixer'],['record','v18_record'],['midiIn','v18_midiIn'],['pdf','v18_pdf'],
    ['lead','v18_lead'],['practice','v18_practice'],['share','v18_share'],['inspire','v18_inspire'],['theory','v18_theory']
  ];

  function $(id){ return document.getElementById(id); }
  function q(sel,root=document){ return root.querySelector(sel); }
  function T(k){ try{ return (typeof window.T==='function' ? window.T(k) : k); }catch(_){ return k; } }

  function ensureStyle(){
    if($('suiteProLegacyStyle')) return;
    const css = `
#v18Suite.v18-suite{position:fixed;right:14px;top:154px;bottom:14px;width:min(620px,94vw);display:none;z-index:76;overflow:auto;border:1px solid rgba(0,255,204,.24);border-radius:19px;background:linear-gradient(180deg,rgba(18,18,18,.985),rgba(6,6,6,.98));box-shadow:0 22px 75px rgba(0,0,0,.76);padding:16px}
#v18Suite.v18-suite.v19-open{display:block}
#v18Suite .v18-suite-title{color:#ffd84d;font-size:.9rem;font-weight:900;letter-spacing:.8px;text-transform:uppercase;margin-bottom:10px}
#v18Suite .v18-suite-buttons{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
#v18Suite .v18-pill{border:1px solid #353535;background:#1b1b1b;color:#ddd;border-radius:10px;padding:9px 8px;font-size:.66rem;font-weight:900;letter-spacing:.35px;text-transform:uppercase;cursor:pointer}
#v18Suite .v18-pill:hover{border-color:#00ffcc;color:#00ffcc;background:rgba(0,255,204,.09)}
#v18Suite .v18-detect{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px;color:#bbb;font-size:.62rem}
#v18Suite .v18-mini{border:1px solid #333;background:#101010;color:#ddd;border-radius:999px;padding:5px 9px;font-size:.6rem;font-weight:800}
#b25SuiteClose{position:sticky;top:0;float:right;border:1px solid rgba(255,216,77,.35);background:#171717;color:#ffd84d;border-radius:999px;padding:4px 10px;cursor:pointer;font-weight:900}
`;
    const s=document.createElement('style');
    s.id='suiteProLegacyStyle';
    s.textContent=css;
    document.head.appendChild(s);
  }

  function ensureCloseButton(suite){
    let closeBtn = q('#b25SuiteClose', suite);
    if(!closeBtn){
      closeBtn = document.createElement('button');
      closeBtn.id = 'b25SuiteClose';
      closeBtn.type = 'button';
      closeBtn.title = 'Close panel';
      closeBtn.textContent = '×';
      suite.appendChild(closeBtn);
    }
    if(!closeBtn.dataset.boundClose){
      closeBtn.dataset.boundClose = '1';
      closeBtn.addEventListener('click', close);
    }
    return closeBtn;
  }

  function ensurePanel(){
    ensureStyle();

    let suite = $('v18Suite');
    if(!suite){
      suite = document.createElement('div');
      suite.id = 'v18Suite';
      suite.className = 'v18-suite';
      const status = q('.status-bar');
      if(status && status.parentNode) status.insertAdjacentElement('afterend', suite);
      else document.body.appendChild(suite);
    }

    let inner = q('.v18-suite-inner', suite);
    if(!inner){
      inner = document.createElement('div');
      inner.className = 'v18-suite-inner';
      suite.appendChild(inner);
    }

    if(!inner.dataset.v18Built){
      inner.innerHTML = '<div class="v18-suite-title">Suite Pro</div><div class="v18-suite-buttons"></div><div class="v18-detect"><span id="v18DetectOut"></span><button id="v18ApplyDetected" class="v18-mini" type="button"></button><button id="v18DrumBtn" class="v18-mini" type="button"></button></div>';
      inner.dataset.v18Built = '1';
    }

    ensureCloseButton(suite);

    const title = q('.v18-suite-title', inner);
    if(title) title.textContent = 'Suite Pro';

    const wrap = q('.v18-suite-buttons', inner);
    BUTTONS.forEach(([labelKey,id]) => {
      let b = $(id);
      if(!b){
        b = document.createElement('button');
        b.id = id;
        b.type = 'button';
        b.className = 'v18-pill';
        if(wrap) wrap.appendChild(b);
      }
      b.textContent = T(labelKey);
    });

    const out = $('v18DetectOut'); if(out) out.textContent = T('noChord');
    const apply = $('v18ApplyDetected'); if(apply) apply.textContent = T('applyDetected');
    const drum = $('v18DrumBtn'); if(drum) drum.textContent = T('drumsOff');

    return suite;
  }


  function open(){ ensurePanel().classList.add('v19-open'); }
  function close(){ const p=$('v18Suite'); if(p) p.classList.remove('v19-open'); }
  function toggle(){ const p=ensurePanel(); p.classList.toggle('v19-open'); }

  window.Studio936SuitePro = { open, close, toggle, ensurePanel };
})();
