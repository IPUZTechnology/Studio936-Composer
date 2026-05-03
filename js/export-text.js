// Studio 936 Composer text/json export module.
(() => {
'use strict';

function slug(s){
    return String(s||'cancion').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'cancion';
}

function makeTxt(project, helpers){
    return helpers.projectText(project);
}

function makeJson(project, helpers){
    return JSON.stringify(project,null,2);
}

function downloadFile(filename,content,type,helpers){
    helpers.download(filename, content, type);
}

function exportTxt(project, helpers){
    downloadFile(slug(project.title)+'-progresion.txt', makeTxt(project, helpers), 'text/plain;charset=utf-8', helpers);
}

function exportJson(project, helpers){
    helpers.syncProjectFromControls(false);
    helpers.syncLyricsFromModal(false);
    downloadFile(slug(project.title)+'-proyecto.json', makeJson(project, helpers), 'application/json;charset=utf-8', helpers);
}

async function copyText(project, helpers){
    try{ await navigator.clipboard.writeText(makeTxt(project, helpers)); helpers.flashStatus('Progresión copiada al portapapeles.'); }
    catch(e){ helpers.flashStatus('No pude copiar; usa Bajar TXT.'); }
}

function importFromFile(file, helpers){
    if(!file) return;
    helpers.readJsonFile(file)
        .then(text => {
            try{
                const nextProject = helpers.modelNormalizeProject(JSON.parse(text), helpers.styles, helpers.instruments);
                helpers.setProject(nextProject);
                helpers.renderAll();
                helpers.saveProject(false);
                helpers.flashStatus('Proyecto importado correctamente.');
            }catch(e){ helpers.flashStatus('JSON inválido.'); }
        })
        .catch(() => helpers.flashStatus('No pude leer el archivo JSON.'));
}

window.Studio936ExportText = { makeTxt, makeJson, exportTxt, exportJson, copyText, importFromFile };
})();
