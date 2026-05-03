(function(){
    'use strict';

    function buildLyricsModal(project, helpers){
        if(!project.lyrics) project.lyrics = helpers.defaultLyrics();
        helpers.renderLyricsMap();
        if(!helpers.els.lyricsGrid) return;
        helpers.els.lyricsGrid.innerHTML='';
        helpers.songOrder.forEach(k=>{
            const box=document.createElement('div'); box.className='lyric-box';
            const label=document.createElement('label'); label.textContent=helpers.sectionNames[k];
            const miniMap=document.createElement('div'); miniMap.className='lyric-section-map'; miniMap.innerHTML=helpers.sectionChordMapHtml(k,true);
            const ta=document.createElement('textarea'); ta.dataset.lyricSection=k; ta.placeholder=`Letra para ${helpers.sectionNames[k]}...`; ta.value=project.lyrics[k] || '';
            box.appendChild(label); box.appendChild(miniMap); box.appendChild(ta); helpers.els.lyricsGrid.appendChild(box);
        });
    }

    function openLyricsModal(project, helpers){
        helpers.syncProjectFromControls(false);
        buildLyricsModal(project, helpers);
        if(helpers.els.lyricsModal) helpers.els.lyricsModal.style.display='flex';
    }

    function closeLyricsModal(project, helpers){
        if(helpers.els.lyricsModal) helpers.els.lyricsModal.style.display='none';
    }

    function syncLyricsFromModal(project, helpers, save){
        if(!project.lyrics) project.lyrics = helpers.defaultLyrics();
        if(!helpers.els.lyricsGrid) return;
        helpers.els.lyricsGrid.querySelectorAll('[data-lyric-section]').forEach(ta=>{ project.lyrics[ta.dataset.lyricSection] = ta.value; });
        if(save){ helpers.saveProject(false); helpers.flashStatus('Letra guardada y lista para exportar TXT.'); closeLyricsModal(project, helpers); }
    }

    function saveLyricsModal(project, helpers){
        syncLyricsFromModal(project, helpers, true);
    }

    window.Studio936LyricsTab = {
        buildLyricsModal,
        openLyricsModal,
        closeLyricsModal,
        syncLyricsFromModal,
        saveLyricsModal
    };
})();
