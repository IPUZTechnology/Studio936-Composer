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

  const LIB_KEY = 'studio936ComposerLibraryV18';

  function $(id){ return document.getElementById(id); }
  function q(sel,root=document){ return root.querySelector(sel); }
  function qa(sel,root=document){ return Array.from(root.querySelectorAll(sel)); }
  function esc(s){
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function T(k){
    const map = {
      save: 'Guardar',
      newSong: 'Nueva canción',
      open: 'Abrir',
      duplicate: 'Duplicar',
      delete: 'Borrar',
      library: 'Biblioteca',
      templates: 'Plantillas',
      libraryEmpty: 'No hay canciones guardadas todavía.',
      practice: 'Modo Práctica'
    };
    return map[k] || k;
  }

  function openModal(name,title,body){
    let m = $('v18Modal');
    if(!m){
      m = document.createElement('div');
      m.id = 'v18Modal';
      m.className = 'v18-modal';
      m.innerHTML = '<div class="v18-modal-card"><button class="v18-x" id="v18Close">×</button><h2 id="v18ModalTitle"></h2><div id="v18ModalBody"></div></div>';
      document.body.appendChild(m);
      $('v18Close').onclick = closeModal;
      m.addEventListener('click', (e) => { if(e.target === m) closeModal(); });
    }
    $('v18ModalTitle').textContent = title;
    $('v18ModalBody').innerHTML = body;
    m.style.display = 'flex';
  }

  function closeModal(){
    const m = $('v18Modal');
    if(m) m.style.display = 'none';
  }

  function showMissingLegacyHelper(helperName, featureName){
    openModal(featureName, featureName, `<p>Helper legacy faltante: <b>${esc(helperName)}</b>.</p><p>Módulo pendiente hasta portar ese helper real.</p>`);
  }

  function showTemplates(){
    const styles=['funk','rock','balada','bossa','jazz','blues','bolero','salsa','cumbia','reggae'];
    const canBuild = typeof window.makeTemplate === 'function';
    const cardHtml = styles.map((s)=>{
      const bpm = canBuild ? (window.makeTemplate(s)?.bpm ?? '---') : '---';
      return `<button class="v18-card" data-template="${s}"><b>${s.toUpperCase()}</b><small>${bpm} BPM</small></button>`;
    }).join('');
    openModal('templates', T('templates'), `<p>Elige una plantilla para cargar estructura, acordes, tempo y estilo.</p><div class="v18-card-grid">${cardHtml}</div>`);
    qa('[data-template]').forEach((b)=>b.onclick=()=>{
      if(typeof window.makeTemplate !== 'function') return showMissingLegacyHelper('makeTemplate', 'Templates');
      if(typeof window.setProject !== 'function') return showMissingLegacyHelper('setProject', 'Templates');
      window.setProject(window.makeTemplate(b.dataset.template));
    });
  }

  function showLibrary(){ renderLibraryModal(); }
  function library(){ try{return JSON.parse(localStorage.getItem(LIB_KEY)||'[]');}catch(e){return [];} }
  function saveLibrary(list){ localStorage.setItem(LIB_KEY, JSON.stringify(list)); }
  function renderLibraryModal(){
    const list = library();
    const body = `<div class="v18-actions"><button class="v18-btn" id="v18SaveLib">${T('save')} actual</button><button class="v18-btn" id="v18NewBlank">${T('newSong')}</button></div>${list.length?`<div class="v18-list">${list.map(x=>`<div class="v18-list-row"><div><b>${esc(x.title)}</b><small>${esc(x.author||'')} · ${new Date(x.updated).toLocaleString()}</small></div><div><button class="v18-mini" data-open="${x.id}">${T('open')}</button><button class="v18-mini" data-dup="${x.id}">${T('duplicate')}</button><button class="v18-mini danger" data-del="${x.id}">${T('delete')}</button></div></div>`).join('')}</div>`:`<p>${T('libraryEmpty')}</p>`}`;
    openModal('library', T('library'), body);
    $('v18SaveLib').onclick = ()=>{
      if(typeof window.getProject !== 'function') return showMissingLegacyHelper('getProject', 'Library');
      const p = window.getProject();
      const l = library();
      l.unshift({id:Date.now().toString(36),title:p.title,author:p.author,updated:Date.now(),project:p});
      saveLibrary(l.slice(0,60));
      renderLibraryModal();
    };
    $('v18NewBlank').onclick = ()=>showMissingLegacyHelper('baseProject + setProject', 'Library');
    qa('[data-open]').forEach((b)=>b.onclick=()=>{
      if(typeof window.setProject !== 'function') return showMissingLegacyHelper('setProject', 'Library');
      const it = library().find(x=>x.id===b.dataset.open);
      if(it) window.setProject(it.project);
    });
    qa('[data-dup]').forEach((b)=>b.onclick=()=>{
      const l = library();
      const it = l.find(x=>x.id===b.dataset.dup);
      if(it){
        const cp = JSON.parse(JSON.stringify(it));
        cp.id = Date.now().toString(36);
        cp.title = cp.title + ' copia';
        cp.updated = Date.now();
        l.unshift(cp);
        saveLibrary(l);
        renderLibraryModal();
      }
    });
    qa('[data-del]').forEach((b)=>b.onclick=()=>{ saveLibrary(library().filter(x=>x.id!==b.dataset.del)); renderLibraryModal(); });
  }

  function showPractice(){
    const body=`<div id="v18Practice" class="v18-practice"><div class="big-section">${esc($('currentPartTag')?.textContent||$('sectionLabel')?.textContent||'')}</div><div class="big-chord">${esc($('chordLabel')?.textContent||'')}</div><div class="big-next">${esc($('measureLabel')?.textContent||'')}</div><div class="v18-actions"><button class="v18-btn primary" onclick="document.getElementById('playSongBtn')?.click()">${$('playSongBtn')?.textContent||'Play Song'}</button><button class="v18-btn" onclick="document.getElementById('playBtn')?.click()">${$('playBtn')?.textContent||'Start'}</button></div></div>`;
    openModal('practice', T('practice'), body);
    const obs = new MutationObserver(()=>{
      const box = $('v18Practice');
      if(box){
        q('.big-section',box).textContent = $('currentPartTag')?.textContent||$('sectionLabel')?.textContent||'';
        q('.big-chord',box).textContent = $('chordLabel')?.textContent||'';
        q('.big-next',box).textContent = $('measureLabel')?.textContent||'';
      }
    });
    ['currentPartTag','sectionLabel','chordLabel','measureLabel'].forEach((id)=>{ const e=$(id); if(e) obs.observe(e,{childList:true,characterData:true,subtree:true}); });
  }



  function showLibraryReady(){
    alert('Studio 936 Library module: connection ready.');
  }

  function showTemplatesReady(){
    alert('Studio 936 Templates module: connection ready.');
  }

  function showTransposeReady(){
    alert('Studio 936 Transpose module: connection ready.');
  }

  function showChordAIReady(){
    alert('Studio 936 Chord AI module: connection ready.');
  }

  function showDrumsReady(){
    alert('Studio 936 Drums module: connection ready.');
  }

  function showMixerReady(){
    alert('Studio 936 Mixer module: connection ready.');
  }

  function showRecordReady(){
    alert('Studio 936 REC Idea module: connection ready.');
  }

  function showMidiInReady(){
    alert('Studio 936 MIDI IN module: connection ready.');
  }

  function showPdfReady(){
    alert('Studio 936 PDF module: connection ready.');
  }

  function showLeadSheetReady(){
    alert('Studio 936 Lead Sheet module: connection ready.');
  }

  function showPracticeReady(){
    alert('Studio 936 Practice module: connection ready.');
  }

  function showShareReady(){
    alert('Studio 936 Share module: connection ready.');
  }

  function showTheory(){
    alert('Studio 936 Theory module: basic theory view is connected.');
  }

  function showScales(){
    alert('Studio 936 Scales module: basic scales view is connected.');
  }

  function showInspire(){
    alert('Studio 936 Inspire module: creative inspiration view is connected.');
  }

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

  function runSuiteAction(name, candidates){
    for(const candidate of candidates){
      const fn = window[candidate];
      if(typeof fn === 'function'){
        try {
          fn();
          return;
        } catch(err){
          console.error('[Suite Pro] Error en módulo ' + name + ':', err);
          return;
        }
      }
    }

    console.warn('Módulo pendiente: ' + name);
    alert('Módulo pendiente: ' + name);
  }

  function bindSuiteProHandlers(){
    const actions = {
      v18_library: ['openLibrary','showLibrary','libraryOpen'],
      v18_templates: ['openTemplates','showTemplates','templatesOpen'],
      v18_transpose: ['openTranspose','showTranspose','transposeOpen'],
      v18_scales: ['openScales','showScales','scalesOpen'],
      v18_chordAI: ['openChordAI','showChordAI','chordAIOpen'],
      v18_drums: ['openDrums','showDrums','drumsOpen'],
      v18_mixer: ['openMixer','showMixer','mixerOpen'],
      v18_record: ['openRecord','showRecord','recordOpen'],
      v18_midiIn: ['openMidiIn','showMidiIn','midiInOpen'],
      v18_pdf: ['openPdf','showPdf','pdfOpen'],
      v18_lead: ['openLead','showLead','leadOpen'],
      v18_practice: ['openPractice','showPractice','practiceOpen'],
      v18_share: ['openShare','showShare','shareOpen'],
      v18_inspire: ['openInspire','showInspire','inspireOpen'],
      v18_theory: ['openTheory','showTheory','theoryOpen']
    };

    Object.keys(actions).forEach((id) => {
      const button = document.getElementById(id);
      if(!button) return;
      const name = button.textContent || id;
      if(id === 'v18_library') button.onclick = showLibraryReady;
      else if(id === 'v18_templates') button.onclick = showTemplatesReady;
      else if(id === 'v18_transpose') button.onclick = showTransposeReady;
      else if(id === 'v18_chordAI') button.onclick = showChordAIReady;
      else if(id === 'v18_drums') button.onclick = showDrumsReady;
      else if(id === 'v18_mixer') button.onclick = showMixerReady;
      else if(id === 'v18_record') button.onclick = showRecordReady;
      else if(id === 'v18_midiIn') button.onclick = showMidiInReady;
      else if(id === 'v18_pdf') button.onclick = showPdfReady;
      else if(id === 'v18_lead') button.onclick = showLeadSheetReady;
      else if(id === 'v18_practice') button.onclick = showPracticeReady;
      else if(id === 'v18_share') button.onclick = showShareReady;
      else if(id === 'v18_scales') button.onclick = showScales;
      else if(id === 'v18_inspire') button.onclick = showInspire;
      else if(id === 'v18_theory') button.onclick = showTheory;
      else button.onclick = () => runSuiteAction(name, actions[id]);
    });
  }


  function ensureTheoryHandler(){
    const theoryButton = document.getElementById('v18_theory');
    if(theoryButton) theoryButton.onclick = showTheory;
  }
  function ensureScalesHandler(){
    const scalesButton = document.getElementById('v18_scales');
    if(scalesButton) scalesButton.onclick = showScales;
  }
  function ensureInspireHandler(){
    const inspireButton = document.getElementById('v18_inspire');
    if(inspireButton) inspireButton.onclick = showInspire;
  }
  function open(){
    const suite = ensurePanel();
    bindSuiteProHandlers();
    ensureTheoryHandler();
    ensureScalesHandler();
    ensureInspireHandler();
    suite.classList.add('v19-open');
    return suite;
  }

  function close(){
    const suite = document.getElementById('v18Suite');
    if(suite) suite.classList.remove('v19-open');
  }

  function toggle(){
    const suite = ensurePanel();
    ensureTheoryHandler();
    ensureScalesHandler();
    ensureInspireHandler();
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
