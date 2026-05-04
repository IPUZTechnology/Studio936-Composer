// Studio 936 Composer - safe static UI bindings

(() => {
'use strict';

function bindStaticActions(api){
    const {
        els,
        saveProject,
        exportTxt,
        exportJson,
        copyText,
        importJson,
        openLyrics,
        closeLyrics,
        saveLyricsModal,
        flashStatus
    } = api || {};
    if(!els) return;

    if(els.saveBtn) els.saveBtn.onclick = () => saveProject?.(true);
    if(els.txtBtn) els.txtBtn.onclick = exportTxt;
    if(els.jsonBtn) els.jsonBtn.onclick = exportJson;
    if(els.copyBtn) els.copyBtn.onclick = copyText;
    if(els.importBtn && els.importFile) els.importBtn.onclick = () => els.importFile.click();
    if(els.importFile) els.importFile.onchange = e => importJson?.(e.target.files[0]);

    if(els.lyricsBtn) els.lyricsBtn.onclick = openLyrics;
    if(els.closeLyricsBtn) els.closeLyricsBtn.onclick = closeLyrics;
    if(els.saveLyricsBtn) els.saveLyricsBtn.onclick = saveLyricsModal;
    if(els.lyricsModal) els.lyricsModal.onclick = e => { if(e.target === els.lyricsModal) closeLyrics?.(); };

    if(window.Studio936Help?.bindHelp){
        window.Studio936Help.bindHelp({ els, flashStatus });
    }
}


function bindEditorActions(api){
    const {
        els,
        previewChord,
        applyEditorToProject,
        addChord,
        duplicateChord,
        deleteChord,
        resetSection,
        resetAll,
        generateSolo,
        previewSolo,
        saveSolo,
        clearSoloForSection
    } = api || {};
    if(!els) return;

    if(els.previewBtn) els.previewBtn.onclick = previewChord;
    if(els.applyBtn) els.applyBtn.onclick = () => applyEditorToProject?.(true);
    if(els.addBtn) els.addBtn.onclick = addChord;
    if(els.dupBtn) els.dupBtn.onclick = duplicateChord;
    if(els.deleteBtn) els.deleteBtn.onclick = deleteChord;
    if(els.resetSectionBtn) els.resetSectionBtn.onclick = resetSection;
    if(els.resetAllBtn) els.resetAllBtn.onclick = resetAll;
    if(els.generateSoloBtn) els.generateSoloBtn.onclick = generateSolo;
    if(els.previewSoloBtn) els.previewSoloBtn.onclick = previewSolo;
    if(els.applySoloBtn) els.applySoloBtn.onclick = saveSolo;
    if(els.clearSoloBtn) els.clearSoloBtn.onclick = clearSoloForSection;
}

window.Studio936UiBindings = { bindStaticActions, bindEditorActions };
})();
