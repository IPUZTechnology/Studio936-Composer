(function(){
  function setup(helpers){
    const H = helpers || {};
    function getProject(){ return H.project; }
    function setProject(v){ H.project = v; }
    function getSelected(){ return Number(H.getSelectedArrangementIndex ? H.getSelectedArrangementIndex() : 0) || 0; }
    function setSelected(v){ if(H.setSelectedArrangementIndex) H.setSelectedArrangementIndex(Number(v)||0); }
    function normalizeArrangement(arr){ return H.normalizeArrangement ? H.normalizeArrangement(arr, getProject()) : arr; }
    function arrangementParts(){
      const project = getProject();
      if(!project.arrangement || !Array.isArray(project.arrangement)) project.arrangement = normalizeArrangement(null);
      project.arrangement = normalizeArrangement(project.arrangement);
      return project.arrangement;
    }
    function arrangementOrder(){
      const project = getProject();
      return arrangementParts().map(p => p.section).filter(k => Array.isArray(project.sections[k]) && project.sections[k].length);
    }
    function getArrangementState(){
      const parts = arrangementParts();
      const rawIndex = getSelected();
      if(!parts.length){
        return { parts, selectedIndex:0, selectedPart:null, selectedSection:null, isValid:false, reason:'empty_parts' };
      }
      const selectedIndex = Math.max(0, Math.min(rawIndex, parts.length - 1));
      const selectedPart = parts[selectedIndex] || null;
      const selectedSection = selectedPart ? selectedPart.section : null;
      const isValid = rawIndex === selectedIndex && !!selectedPart;
      const reason = isValid ? 'ok' : (rawIndex < 0 ? 'index_below_range' : 'index_above_range');
      return { parts, selectedIndex, selectedPart, selectedSection, isValid, reason };
    }
    function selectArrangementPart(index){
      const parts = arrangementParts();
      if(!parts.length){
        setSelected(0);
        return { parts, selectedIndex:0, selectedPart:null, selectedSection:null, isValid:false, reason:'empty_parts' };
      }
      const rawIndex = Number(index);
      const safeRawIndex = Number.isFinite(rawIndex) ? rawIndex : 0;
      const selectedIndex = Math.max(0, Math.min(safeRawIndex, parts.length - 1));
      setSelected(selectedIndex);
      const selectedPart = parts[selectedIndex] || null;
      const selectedSection = selectedPart ? selectedPart.section : null;
      const isValid = safeRawIndex === selectedIndex && !!selectedPart;
      const reason = isValid ? 'ok' : (safeRawIndex < 0 ? 'index_below_range' : 'index_above_range');
      return { parts, selectedIndex, selectedPart, selectedSection, isValid, reason };
    }
    function sectionChordCount(k){ const project = getProject(); return (project.sections[k]||[]).length; }
    function ensureSectionOption(key){
      if(!H.els.sectionSelect || H.els.sectionSelect.querySelector(`option[value="${CSS.escape(key)}"]`)) return;
      const o=document.createElement('option'); o.value=key; o.textContent=H.sectionNames[key] || key; H.els.sectionSelect.appendChild(o);
    }
    function renderSectionOptions(){ Object.keys(getProject().sections || {}).forEach(k=>ensureSectionOption(k)); }
    function uniqueSectionKey(base){ const project=getProject(); base=String(base||'section').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')||'section'; let k=base, n=2; while(project.sections[k]) k=base+'_'+(n++); return k; }
    function ensureArrangementCard(){
      let card=document.getElementById('structureBuilderCard'); if(card) return card;
      const editor=document.querySelector('.editor'); if(!editor) return null;
      card=document.createElement('div'); card.className='card structure-card'; card.id='structureBuilderCard';
      card.innerHTML=`<h3>Constructor de estructura <span class="structure-badge">v25</span></h3><div class="structure-toolbar"><select id="arrangeSourceSelect" class="select"></select><button class="mini-btn primary" id="arrangeAddBtn">Agregar parte</button><button class="mini-btn" id="arrangeDupBtn">Duplicar</button><button class="mini-btn" id="arrangeUpBtn">↑</button><button class="mini-btn" id="arrangeDownBtn">↓</button><button class="mini-btn danger" id="arrangeDelBtn">Borrar</button></div><div class="button-row"><button class="mini-btn warn" id="arrangeNewBtn">Crear nueva sección</button><button class="mini-btn" id="arrangeVariationBtn">Copiar como variación</button><button class="mini-btn" id="arrangeRenameBtn">Renombrar bloque</button></div><div id="arrangementList" class="arrangement-list"></div><div class="structure-help"><b>Banco de secciones:</b> define acordes/letra/melodía. <b>Orden de canción:</b> repite o reordena bloques sin copiar toda la música. “Escuchar canción”, TXT y MIDI usan este orden real.</div>`;
      editor.insertBefore(card, editor.firstElementChild);
      card.addEventListener('click', handleArrangementClick);
      return card;
    }
    function renderArrangementBuilder(){
      const project=getProject();
      renderSectionOptions(); const card=ensureArrangementCard(); if(!card) return;
      const src=document.getElementById('arrangeSourceSelect'); const list=document.getElementById('arrangementList'); if(!src||!list) return;
      const cur=src.value || H.els.sectionSelect.value || 'intro';
      src.innerHTML=''; Object.keys(project.sections||{}).forEach(k=>{ const o=document.createElement('option'); o.value=k; o.textContent=(H.sectionNames[k]||k)+` · ${sectionChordCount(k)} acordes`; src.appendChild(o); });
      src.value = project.sections[cur] ? cur : 'intro';
      const parts=arrangementParts(); let selectedArrangementIndex=getSelected(); if(selectedArrangementIndex>=parts.length) selectedArrangementIndex=Math.max(0,parts.length-1); setSelected(selectedArrangementIndex);
      list.innerHTML=parts.map((p,i)=>`<div class="arrange-part ${i===selectedArrangementIndex?'active':''}" data-arr-i="${i}"><div class="arrange-num">${i+1}</div><div class="arrange-label">${H.escapeHtml(p.label||H.sectionNames[p.section]||p.section)}</div><div class="arrange-src">${H.escapeHtml(H.sectionNames[p.section]||p.section)}</div><div class="arrange-meta">${sectionChordCount(p.section)} acorde(s) · click para editar</div></div>`).join('');
    }
    function addArrangementPart(){ const project=getProject(); const src=document.getElementById('arrangeSourceSelect')?.value || H.els.sectionSelect.value || 'intro'; const label=H.sectionNames[src] || src; const idx=Math.min(getSelected()+1, arrangementParts().length); project.arrangement.splice(idx,0,{id:'p'+Date.now(),section:src,label}); setSelected(idx); renderArrangementBuilder(); H.saveProject(false); H.flashStatus('Parte agregada al orden de canción.'); }
    function duplicateArrangementPart(){ const project=getProject(); const parts=arrangementParts(); const p=parts[getSelected()]; if(!p) return; const copy={id:'p'+Date.now(),section:p.section,label:(p.label||H.sectionNames[p.section]||p.section)+' BIS'}; project.arrangement.splice(getSelected()+1,0,copy); setSelected(getSelected()+1); renderArrangementBuilder(); H.saveProject(false); H.flashStatus('Bloque duplicado en el arreglo.'); }
    function moveArrangementPart(dir){ const project=getProject(); const parts=arrangementParts(); const i=getSelected(), j=i+dir; if(j<0||j>=parts.length) return; [project.arrangement[i],project.arrangement[j]]=[project.arrangement[j],project.arrangement[i]]; setSelected(j); renderArrangementBuilder(); H.saveProject(false); }
    function deleteArrangementPart(){ const project=getProject(); const parts=arrangementParts(); if(parts.length<=1){ H.flashStatus('La canción debe tener al menos una parte.'); return; } project.arrangement.splice(getSelected(),1); setSelected(Math.max(0,getSelected()-1)); renderArrangementBuilder(); H.saveProject(false); H.flashStatus('Parte borrada del arreglo. La sección original no se borró.'); }
    function renameArrangementPart(){ const p=arrangementParts()[getSelected()]; if(!p) return; const name=prompt('Nombre del bloque en el arreglo:', p.label || H.sectionNames[p.section] || p.section); if(!name) return; p.label=name.trim(); renderArrangementBuilder(); H.saveProject(false); }
    function createNewSection(asVariation){ const project=getProject(); const current=H.els.sectionSelect.value||'intro'; const source=asVariation ? current : (document.getElementById('arrangeSourceSelect')?.value || current); const baseName=asVariation ? ((H.sectionNames[source]||source)+' variación') : 'Nueva sección'; const name=prompt(asVariation?'Nombre de la nueva variación:':'Nombre de la nueva sección:', baseName); if(!name) return; const key=uniqueSectionKey(name); project.sections[key]=JSON.parse(JSON.stringify(project.sections[source]||[H.chord('C','C2','C3 E3 G3',1)])); H.sectionNames[key]=name.trim(); project.lyrics=project.lyrics||{}; project.lyrics[key]=asVariation?(project.lyrics[source]||''):''; project.sectionSolos=project.sectionSolos||{}; project.sectionSolos[key]=JSON.parse(JSON.stringify(project.sectionSolos[source]||{key:'C',scale:'major',phrase:''})); ensureSectionOption(key); project.arrangement.splice(getSelected()+1,0,{id:'p'+Date.now(),section:key,label:name.trim()}); setSelected(getSelected()+1); H.els.sectionSelect.value=key; H.els.sectionSelect.dispatchEvent(new Event('change',{bubbles:true})); renderArrangementBuilder(); H.saveProject(false); H.flashStatus('Nueva sección creada y agregada al arreglo.'); }
    function handleArrangementClick(ev){
      const part=ev.target.closest('[data-arr-i]'); if(part){ const idx=Number(part.dataset.arrI)||0; if(typeof H.selectArrangementPart==='function'){ H.selectArrangementPart(idx); }else{ setSelected(idx); const p=arrangementParts()[getSelected()]; if(p){ H.els.sectionSelect.value=p.section; H.els.sectionSelect.dispatchEvent(new Event('change',{bubbles:true})); H.onPartSelected(p); } renderArrangementBuilder(); } return; }
      const id=ev.target.id; if(!id) return;
      if(id==='arrangeAddBtn') addArrangementPart();
      if(id==='arrangeDupBtn') duplicateArrangementPart();
      if(id==='arrangeUpBtn') moveArrangementPart(-1);
      if(id==='arrangeDownBtn') moveArrangementPart(1);
      if(id==='arrangeDelBtn') deleteArrangementPart();
      if(id==='arrangeRenameBtn') renameArrangementPart();
      if(id==='arrangeNewBtn') createNewSection(false);
      if(id==='arrangeVariationBtn') createNewSection(true);
    }
    return { arrangementParts, arrangementOrder, renderArrangementBuilder, setSelectedArrangementIndex:setSelected, getSelectedArrangementIndex:getSelected, getArrangementState, selectArrangementPart };
  }
  window.Studio936Arrangement = { setup };
})();
