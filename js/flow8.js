// Studio 936 Flow 8 helper module
(() => {
  'use strict';

  function tr(){
    const lang = document.documentElement.lang || localStorage.getItem('pianoComposerUiLangV15') || 'es';
    return String(lang).startsWith('en') ? 'en' : 'es';
  }

  const txt = {
    es:{ none:'No se han detectado salidas todavía.', ok:'Salida aplicada si el navegador soporta AudioContext.setSinkId.', unsupported:'Tu navegador no permite cambiar salida desde esta página. Selecciona Flow 8 como salida del sistema operativo.', detectedNoFlow:'Salidas detectadas. Si no ves Flow 8, selecciónalo como salida del sistema o reconecta USB.', flowDetectedPrefix:'Flow 8 detectado: ' },
    en:{ none:'No outputs detected yet.', ok:'Output applied if this browser supports AudioContext.setSinkId.', unsupported:'This browser cannot change output from the page. Select Flow 8 as the system output.', detectedNoFlow:'Outputs detected. If Flow 8 is missing, select it as your system output or reconnect USB.', flowDetectedPrefix:'Flow 8 detected: ' }
  };

  function T(key){ return (txt[tr()] || txt.es)[key] || key; }
  function getEls(helpers){ return helpers?.els || {}; }
  function getAudioCtx(helpers){ return helpers?.audioCtx || window.__studio936AudioCtx; }

  function applyStatus(statusEl, message, cls){
    if(!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = cls;
  }

  async function applyOutputDevice(deviceId, helpers){
    const els = getEls(helpers);
    const status = els.v19FlowStatus || document.getElementById('v19FlowStatus');
    if(!deviceId) return;
    const ctx = getAudioCtx(helpers);
    if(ctx && typeof ctx.setSinkId === 'function'){
      try{
        await ctx.setSinkId(deviceId);
        applyStatus(status, T('ok'), 'v19-status good');
      }catch(err){
        applyStatus(status, T('unsupported'), 'v19-status warn');
      }
    } else {
      applyStatus(status, T('unsupported'), 'v19-status warn');
    }
  }

  async function detectOutputs(helpers){
    const els = getEls(helpers);
    const status = els.v19FlowStatus || document.getElementById('v19FlowStatus');
    const select = els.v19OutputSelect || document.getElementById('v19OutputSelect');
    if(!select) return;
    if(!navigator.mediaDevices?.enumerateDevices){
      applyStatus(status, T('unsupported'), 'v19-status warn');
      return;
    }
    try{
      if(navigator.mediaDevices.getUserMedia){
        try{
          const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
          stream.getTracks().forEach(t => t.stop());
        }catch(e){}
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      const outs = devices.filter(d => d.kind === 'audiooutput');
      select.innerHTML = outs.length
        ? outs.map(d => `<option value="${d.deviceId}">${(d.label || 'Audio output').replace(/[<>]/g,'')}</option>`).join('')
        : `<option value="">${T('none')}</option>`;
      const flow = outs.find(d => /flow\s*8|behringer|usb audio/i.test(d.label || ''));
      if(flow){
        select.value = flow.deviceId;
        applyStatus(status, T('flowDetectedPrefix') + flow.label + '. ' + T('ok'), 'v19-status good');
        select.dispatchEvent(new Event('change'));
      } else {
        applyStatus(status, outs.length ? T('detectedNoFlow') : T('none'), 'v19-status warn');
      }
    }catch(e){
      applyStatus(status, T('unsupported'), 'v19-status warn');
    }
  }

  function initFlow8(helpers){
    const els = getEls(helpers);
    const detectBtn = els.v19DetectAudio || document.getElementById('v19DetectAudio');
    const select = els.v19OutputSelect || document.getElementById('v19OutputSelect');
    if(detectBtn) detectBtn.onclick = () => detectOutputs(helpers);
    if(select) select.onchange = e => applyOutputDevice(e.target.value, helpers);
  }

  window.Studio936Flow8 = { initFlow8, detectOutputs, applyOutputDevice };
})();
