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

window.Studio936UiBindings = { bindStaticActions };
})();
