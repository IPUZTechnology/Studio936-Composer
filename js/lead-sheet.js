// Studio 936 Lead Sheet module
(() => {
'use strict';

function escHtml(s){
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function pdfSafe(s){ return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[–—]/g,'-').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/[^\x09\x0A\x0D\x20-\x7E]/g,''); }
function escPdf(s){ return pdfSafe(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)'); }

function makePdf(lines){
  const max=48, pages=[];
  for(let i=0;i<lines.length;i+=max) pages.push(lines.slice(i,i+max));
  const objects=[]; const pageObjs=[]; const contentObjs=[]; const fontObj=3; let next=4;
  pages.forEach(()=>{ pageObjs.push(next++); contentObjs.push(next++); });
  objects[1]='1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  objects[2]=`2 0 obj\n<< /Type /Pages /Kids [${pageObjs.map(n=>n+' 0 R').join(' ')}] /Count ${pages.length} >>\nendobj\n`;
  objects[fontObj]='3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';
  pages.forEach((pl,idx)=>{
    const pObj=pageObjs[idx], cObj=contentObjs[idx];
    const content=['BT','/F1 10 Tf','40 800 Td','14 TL'];
    pl.forEach((line,j)=>{ content.push(`(${escPdf(line).slice(0,105)}) Tj`); if(j<pl.length-1) content.push('T*'); });
    content.push('ET');
    const stream=content.join('\n');
    objects[pObj]=`${pObj} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${cObj} 0 R >>\nendobj\n`;
    objects[cObj]=`${cObj} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`;
  });
  let out='%PDF-1.4\n'; const offsets=[0];
  for(let i=1;i<objects.length;i++){ offsets[i]=out.length; out+=objects[i]||''; }
  const xref=out.length;
  out+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for(let i=1;i<objects.length;i++) out+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
  out+=`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return out;
}

function buildLeadSheet(project, helpers={}){
  const songOrder = helpers.songOrder || ['intro','verse','verse1','verse2','verse3','prechorus','chorus','interlude','solo'];
  const sectionName = helpers.sectionName || (k=>k);
  return `<div class="v18-lead-sheet"><h1>${escHtml(project.title)}</h1><h2>${escHtml(project.author)}</h2><p><b>BPM:</b> ${escHtml(project.bpm)} · <b>Style:</b> ${escHtml(project.style)} · <b>A4:</b> ${escHtml(project.tuningHz||440)} Hz</p>${songOrder.map(k=>{ const sec=project.sections?.[k]||[]; if(!sec.length) return ''; return `<section><h3>${escHtml(sectionName(k))}</h3><div class="v18-chordline">${sec.map(c=>`<span>${escHtml(c.name)}</span>`).join(' ')}</div>${project.lyrics?.[k]?`<pre>${escHtml(project.lyrics[k])}</pre>`:''}${project.sectionSolos?.[k]?.phrase?`<p><b>Solo:</b> ${escHtml(project.sectionSolos[k].phrase)}</p>`:''}</section>`; }).join('')}</div>`;
}

function openLeadSheet(project, helpers={}){
  const leadHtml = buildLeadSheet(project, helpers);
  const t = helpers.translate || (k=>k);
  const openModal = helpers.openModal;
  if(typeof openModal !== 'function') return;
  openModal('lead', t('lead'), leadHtml + `<div class="v18-actions"><button class="v18-btn" id="v18PrintLead">Print / PDF</button><button class="v18-btn" id="v18ExportPdf2">${t('pdf')}</button></div>`);
  const byId = helpers.byId || (id => document.getElementById(id));
  const printBtn = byId('v18PrintLead');
  if(printBtn) printBtn.onclick = () => window.print();
  const exportBtn = byId('v18ExportPdf2');
  if(exportBtn) exportBtn.onclick = () => exportLeadSheetPdf(project, helpers);
}

function closeLeadSheet(project, helpers={}){ // kept for API completeness
  const closeModal = helpers.closeModal;
  if(typeof closeModal === 'function') closeModal();
}

function exportLeadSheetPdf(project, helpers={}){
  const projectLines = helpers.projectText;
  const lines = typeof projectLines === 'function' ? projectLines(project) : [];
  const slug = helpers.slug || (s => String(s||'song'));
  const download = helpers.download;
  if(typeof download === 'function') download(slug(project.title)+'-lead-sheet.pdf', makePdf(lines), 'application/pdf');
  if(typeof helpers.flashStatus === 'function') helpers.flashStatus((helpers.translate||((k)=>k))('pdfDone'));
}

window.Studio936LeadSheet = { buildLeadSheet, openLeadSheet, closeLeadSheet, exportLeadSheetPdf };
})();
