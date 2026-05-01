// Studio 936 Composer - Storage Module
// Handles local persistence and file import/export helpers.

window.Studio936Storage = (() => {
    'use strict';

    function loadProject(key, fallbackFactory, normalizeFn){
        try{
            const raw = localStorage.getItem(key);
            if(!raw) return fallbackFactory();
            const parsed = JSON.parse(raw);
            return normalizeFn(parsed);
        }catch(e){
            return fallbackFactory();
        }
    }

    function saveProject(key, project){
        localStorage.setItem(key, JSON.stringify(project));
    }

    function clearProject(key){
        localStorage.removeItem(key);
    }

    function download(filename, content, type){
        const blob = new Blob([content], {type});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    function readJsonFile(file){
        return new Promise((resolve, reject) => {
            if(!file){ reject(new Error('No file provided.')); return; }
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error || new Error('Could not read file.'));
            reader.readAsText(file);
        });
    }

    return {
        loadProject,
        saveProject,
        clearProject,
        download,
        readJsonFile
    };
})();
