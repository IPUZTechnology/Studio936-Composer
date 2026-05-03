// Studio 936 Composer - editor module scaffold (v25)
(() => {
'use strict';

const Editor = {
  setup(host){ this.host = host; return this; },
  editorSectionKey(){ return this.host.els.sectionSelect.value || 'intro'; },
  editorSeq(){ return this.host.project.sections[this.editorSectionKey()] || this.host.project.sections.intro; },
  renderSectionList(){
    const { els, escapeHtml } = this.host;
    const seq = this.editorSeq();
    els.sectionList.innerHTML='';
    seq.forEach((c,i)=>{
      const row=document.createElement('div'); row.className='chord-row' + (i===Number(els.chordSelect.value)?' active':'');
      row.innerHTML = `<div class="index-pill">${i+1}</div><div><div class="row-title">${escapeHtml(c.name)}</div><div class="row-sub">Bajo ${escapeHtml(c.bass)} · ${escapeHtml(c.notes)}</div></div><div class="bars-pill">${c.bars||1} comp.</div>`;
      row.onclick=()=>{ els.chordSelect.value=i; this.loadEditorFromSelected(); this.renderSectionList(); };
      els.sectionList.appendChild(row);
    });
  },
  loadEditorFromSelected(){
    const { els, updateFretboardMap } = this.host;
    const item = this.editorSeq()[Number(els.chordSelect.value)||0] || this.editorSeq()[0];
    if(!item) return;
    els.chordName.value = item.name || '';
    els.bassInput.value = item.bass || 'C2';
    els.chordNotes.value = item.notes || '';
    els.barsInput.value = item.bars || 1;
    updateFretboardMap();
  },
  applyEditorToProject(render=true){
    const { els, noteToMidi, parseNotes, chord, clamp, renderChordSelect, updateSectionNoteMap, updateFretboardMap, saveProject, flashStatus } = this.host;
    const seq = this.editorSeq(); const idx = Number(els.chordSelect.value)||0; if(!seq[idx]) return false;
    const bass = els.bassInput.value.trim(); const notes = els.chordNotes.value.trim();
    if(noteToMidi(bass) === null || parseNotes(notes).length === 0){ if(render) flashStatus('Revisa bajo/notas: no pude leer alguna nota.'); return false; }
    seq[idx] = chord(els.chordName.value.trim() || 'Acorde', bass, notes, clamp(Number(els.barsInput.value)||1,1,16));
    if(render){ renderChordSelect(); els.chordSelect.value=idx; this.renderSectionList(); updateSectionNoteMap(); updateFretboardMap(); saveProject(false); flashStatus('Acorde aplicado.'); }
    return true;
  },
  addChord(){
    const { els, chord, renderChordSelect, updateSectionNoteMap, updateFretboardMap, saveProject } = this.host;
    const seq=this.editorSeq(); const idx=Number(els.chordSelect.value)||0; const base=seq[idx] || chord('C','C2','C3 E3 G3',1);
    seq.splice(idx+1,0,{...base,name:base.name+' copy'}); renderChordSelect(); els.chordSelect.value=idx+1; this.loadEditorFromSelected(); this.renderSectionList(); updateSectionNoteMap(); updateFretboardMap(); saveProject(false);
  },
  duplicateChord(){ this.addChord(); },
  deleteChord(){
    const { els, renderChordSelect, updateSectionNoteMap, updateFretboardMap, saveProject, flashStatus } = this.host;
    const seq=this.editorSeq(); if(seq.length<=1){ flashStatus('La sección debe conservar al menos un acorde.'); return; }
    const idx=Number(els.chordSelect.value)||0; seq.splice(idx,1); renderChordSelect(); els.chordSelect.value=Math.max(0,idx-1); this.loadEditorFromSelected(); this.renderSectionList(); updateSectionNoteMap(); updateFretboardMap(); saveProject(false); flashStatus('Acorde borrado.');
  },
  resetSection(){
    const { defaultProject, setChordIdx, setStepInChord, renderChordSelect, updateSectionNoteMap, updateFretboardMap, saveProject, flashStatus } = this.host;
    const def=defaultProject(); const k=this.editorSectionKey(); this.host.project.sections[k]=JSON.parse(JSON.stringify(def.sections[k])); setChordIdx(0); setStepInChord(0); renderChordSelect(); this.loadEditorFromSelected(); this.renderSectionList(); updateSectionNoteMap(); updateFretboardMap(); saveProject(false); flashStatus('Sección restaurada.');
  }
};

window.Studio936Editor = Editor;
})();
