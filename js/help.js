// Studio 936 Composer help modal module
(() => {
'use strict';

function openHelp(helpers={}){
    const {els} = helpers;
    if(!els?.helpModal) return;
    els.helpModal.style.display = 'flex';
}

function closeHelp(helpers={}){
    const {els} = helpers;
    if(!els?.helpModal) return;
    els.helpModal.style.display = 'none';
}

function bindHelp(helpers={}){
    const {els} = helpers;
    if(!els) return;
    if(els.helpBtn){
        els.helpBtn.onclick = () => openHelp(helpers);
    }
    if(els.closeHelpBtn){
        els.closeHelpBtn.onclick = () => closeHelp(helpers);
    }
    if(els.helpModal){
        els.helpModal.onclick = e => {
            if(e.target === els.helpModal) closeHelp(helpers);
        };
    }
}

window.Studio936Help = { openHelp, closeHelp, bindHelp };
})();
