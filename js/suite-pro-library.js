// Studio 936 Composer — Librería / Rockola (Cambio 127)
//
// QUÉ ES: panel de librería personal — importas tus propios MP3/MP4,
// se organizan en tarjetas (vista cuadrícula, con carátula tipo burbuja
// "936") o en lista (vista lista, por autor/tema), y se pueden poner en
// cola para reproducir en orden, como una rockola real.
//
// LÍMITE TÉCNICO HONESTO: los navegadores no permiten que una página
// recuerde archivos del computador entre sesiones por seguridad — cada
// vez que recargues, hay que volver a seleccionar los MP3/MP4. Lo que
// SÍ persiste (en localStorage) es la lista con título/autor/carátula,
// para no perder la organización.
//
// NO incluye: extracción de audio de YouTube/Spotify (viola sus
// términos de servicio) — eso queda como proyecto aparte, ya anotado.

(function(){
    'use strict';

    const STORAGE_KEY = 's936_library_meta_v1';
    const PANEL_ID = 's936LibraryPanel';
    let library = [];   // {id, title, author, fileName, objectURL (solo en memoria)}
    let queue = [];     // array de ids en orden
    let currentId = null;
    let viewMode = 'grid'; // 'grid' | 'list'
    let audioEl = null;

    function loadMeta(){
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if(!raw) return [];
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr : [];
        } catch(_) { return []; }
    }
    function saveMeta(){
        try {
            const meta = library.map(s => ({ id:s.id, title:s.title, author:s.author, fileName:s.fileName }));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
        } catch(_) {}
    }

    function uid(){ return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

    function el(tag, className, text){
        const node = document.createElement(tag);
        if(className) node.className = className;
        if(text !== undefined) node.textContent = text;
        return node;
    }

    function injectStyle(){
        if(document.getElementById(PANEL_ID + 'Style')) return;
        const style = document.createElement('style');
        style.id = PANEL_ID + 'Style';
        style.textContent = `
#${PANEL_ID}Overlay {
  position: fixed; inset: 0; z-index: 10000;
  background: rgba(0,0,0,.6);
  display: none;
  align-items: center; justify-content: center;
}
#${PANEL_ID}Overlay.is-open { display: flex; }
#${PANEL_ID} {
  width: min(920px, 94vw);
  height: min(640px, 90vh);
  background: linear-gradient(180deg,#14181a,#0a0d0e);
  border: 1px solid rgba(91,232,201,.25);
  border-radius: 18px;
  box-shadow: 0 20px 60px rgba(0,0,0,.6);
  display: flex; flex-direction: column;
  overflow: hidden;
  font-family: inherit;
  color: #e8f4f2;
}
#${PANEL_ID} .s936lib-header {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255,255,255,.08);
  background: rgba(255,255,255,.02);
}
#${PANEL_ID} .s936lib-header h2 {
  margin: 0; font-size: 1.1rem; color: #5be8c9; flex: 1;
  font-weight: 800; letter-spacing: .3px;
}
#${PANEL_ID} .s936lib-viewbtn {
  background: #1c2224; border: 1px solid #333; color: #9fb0ae;
  border-radius: 8px; padding: 6px 10px; font-size: .72rem; cursor: pointer;
  font-weight: 700;
}
#${PANEL_ID} .s936lib-viewbtn.active { background: #5be8c9; color: #04342c; border-color: #5be8c9; }
#${PANEL_ID} .s936lib-closebtn {
  background: transparent; border: none; color: #9fb0ae; font-size: 1.3rem;
  cursor: pointer; line-height: 1; padding: 4px 8px;
}
#${PANEL_ID} .s936lib-toolbar {
  display: flex; gap: 8px; padding: 10px 18px;
  border-bottom: 1px solid rgba(255,255,255,.06);
  align-items: center; flex-wrap: wrap;
}
#${PANEL_ID} .s936lib-search {
  flex: 1; min-width: 160px; background: #1c2224; border: 1px solid #333;
  border-radius: 8px; padding: 7px 10px; color: #e8f4f2; font-size: .8rem;
}
#${PANEL_ID} .s936lib-importbtn {
  background: rgba(91,232,201,.12); border: 1px solid #5be8c9; color: #5be8c9;
  border-radius: 8px; padding: 7px 12px; font-size: .78rem; font-weight: 700;
  cursor: pointer;
}
#${PANEL_ID} .s936lib-body {
  flex: 1; overflow-y: auto; padding: 16px 18px;
}
#${PANEL_ID} .s936lib-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 14px;
}
#${PANEL_ID} .s936lib-card {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  cursor: pointer; padding: 8px; border-radius: 12px;
  border: 1px solid transparent;
}
#${PANEL_ID} .s936lib-card:hover { border-color: rgba(91,232,201,.3); background: rgba(91,232,201,.05); }
#${PANEL_ID} .s936lib-card.playing { border-color: #5be8c9; background: rgba(91,232,201,.1); }
#${PANEL_ID} .s936lib-bubble {
  width: 84px; height: 84px; border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #3a4a48, #0e1414);
  display: flex; align-items: center; justify-content: center;
  font-size: .6rem; font-weight: 900; color: #5be8c9; letter-spacing: .5px;
  border: 2px solid rgba(91,232,201,.25);
  text-align: center; overflow: hidden;
}
#${PANEL_ID} .s936lib-cardtitle { font-size: .72rem; text-align: center; color: #e8f4f2; font-weight: 700; }
#${PANEL_ID} .s936lib-cardauthor { font-size: .62rem; text-align: center; color: #9fb0ae; }
#${PANEL_ID} .s936lib-list-row {
  display: flex; align-items: center; gap: 12px;
  padding: 9px 10px; border-radius: 8px; cursor: pointer;
  border-bottom: 1px solid rgba(255,255,255,.05);
}
#${PANEL_ID} .s936lib-list-row:hover { background: rgba(91,232,201,.05); }
#${PANEL_ID} .s936lib-list-row.playing { background: rgba(91,232,201,.1); }
#${PANEL_ID} .s936lib-list-bubble {
  width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
  background: radial-gradient(circle at 35% 30%, #3a4a48, #0e1414);
  border: 1px solid rgba(91,232,201,.25);
}
#${PANEL_ID} .s936lib-list-title { flex: 1; font-size: .8rem; font-weight: 700; }
#${PANEL_ID} .s936lib-list-author { font-size: .7rem; color: #9fb0ae; width: 140px; }
#${PANEL_ID} .s936lib-empty { text-align: center; color: #9fb0ae; font-size: .85rem; padding: 40px 20px; }
#${PANEL_ID} .s936lib-queuebtn {
  background: rgba(255,224,102,.1); border: 1px solid #ffe066; color: #ffe066;
  border-radius: 6px; padding: 3px 8px; font-size: .62rem; font-weight: 700; cursor: pointer;
}
#${PANEL_ID} .s936lib-footer {
  border-top: 1px solid rgba(255,255,255,.08);
  padding: 10px 18px; display: flex; align-items: center; gap: 10px;
  background: rgba(255,255,255,.02);
}
#${PANEL_ID} .s936lib-nowplaying { flex: 1; font-size: .78rem; color: #9fb0ae; }
#${PANEL_ID} .s936lib-nowplaying b { color: #5be8c9; }
#${PANEL_ID} .s936lib-transport button {
  background: #1c2224; border: 1px solid #333; color: #e8f4f2;
  border-radius: 8px; padding: 6px 12px; font-size: .78rem; cursor: pointer; font-weight: 700;
}
`;
        document.head.appendChild(style);
    }

    function filteredLibrary(query){
        if(!query) return library;
        const q = query.toLowerCase();
        return library.filter(s => (s.title||'').toLowerCase().includes(q) || (s.author||'').toLowerCase().includes(q));
    }

    function bubbleInitials(title){
        return (title || '?').trim().slice(0,2).toUpperCase();
    }

    function render(){
        const panel = document.getElementById(PANEL_ID);
        if(!panel) return;
        const body = panel.querySelector('.s936lib-body');
        const query = panel.querySelector('.s936lib-search')?.value || '';
        const list = filteredLibrary(query);
        body.innerHTML = '';

        if(!list.length){
            const empty = el('div', 's936lib-empty',
                library.length ? 'No hay resultados para esa búsqueda.' : 'Tu librería está vacía. Usa "Importar MP3/MP4" para empezar.');
            body.appendChild(empty);
            return;
        }

        if(viewMode === 'grid'){
            const grid = el('div', 's936lib-grid');
            list.forEach(song => {
                const card = el('div', 's936lib-card' + (currentId === song.id ? ' playing' : ''));
                const bubble = el('div', 's936lib-bubble', bubbleInitials(song.title));
                bubble.title = 'Studio 936';
                const title = el('div', 's936lib-cardtitle', song.title);
                const author = el('div', 's936lib-cardauthor', song.author || 'Sin autor');
                card.append(bubble, title, author);
                card.onclick = () => playSong(song.id);
                grid.appendChild(card);
            });
            body.appendChild(grid);
        } else {
            list.forEach(song => {
                const row = el('div', 's936lib-list-row' + (currentId === song.id ? ' playing' : ''));
                const bubble = el('div', 's936lib-list-bubble');
                const title = el('div', 's936lib-list-title', song.title);
                const author = el('div', 's936lib-list-author', song.author || 'Sin autor');
                const qBtn = el('button', 's936lib-queuebtn', queue.includes(song.id) ? 'En cola ✓' : '+ Cola');
                qBtn.onclick = (e) => { e.stopPropagation(); toggleQueue(song.id); };
                row.append(bubble, title, author, qBtn);
                row.onclick = () => playSong(song.id);
                body.appendChild(row);
            });
        }
    }

    function toggleQueue(id){
        const idx = queue.indexOf(id);
        if(idx === -1) queue.push(id); else queue.splice(idx,1);
        render();
        updateFooter();
    }

    function playSong(id){
        const song = library.find(s => s.id === id);
        if(!song) return;
        if(!song.objectURL){
            alert('Este tema necesita que vuelvas a seleccionar su archivo (los navegadores no guardan el audio entre sesiones). Usa "Importar" de nuevo con el mismo archivo.');
            return;
        }
        currentId = id;
        if(!audioEl){
            audioEl = new Audio();
            audioEl.addEventListener('ended', playNextInQueue);
        }
        audioEl.src = song.objectURL;
        audioEl.play().catch(()=>{});
        render();
        updateFooter();
    }

    function playNextInQueue(){
        if(!queue.length) { currentId = null; updateFooter(); return; }
        const nextId = queue.shift();
        playSong(nextId);
    }

    function updateFooter(){
        const panel = document.getElementById(PANEL_ID);
        if(!panel) return;
        const now = panel.querySelector('.s936lib-nowplaying');
        const song = library.find(s => s.id === currentId);
        now.innerHTML = song ? `Sonando ahora: <b>${song.title}</b> — ${song.author || 'Sin autor'} · ${queue.length} en cola` : `Nada sonando · ${queue.length} en cola`;
    }

    function importFiles(fileList){
        const files = Array.from(fileList || []);
        files.forEach(file => {
            const objectURL = URL.createObjectURL(file);
            const nameGuess = file.name.replace(/\.(mp3|mp4|wav|m4a|ogg)$/i, '').replace(/[_-]+/g,' ').trim();
            library.push({
                id: uid(),
                title: nameGuess || file.name,
                author: '',
                fileName: file.name,
                objectURL
            });
        });
        saveMeta();
        render();
    }

    function buildPanel(){
        injectStyle();
        const overlay = el('div', '');
        overlay.id = PANEL_ID + 'Overlay';

        const panel = el('div', '');
        panel.id = PANEL_ID;

        const header = el('div', 's936lib-header');
        const title = el('h2', '', '📚 Librería — Studio 936');
        const gridBtn = el('button', 's936lib-viewbtn active', '⊞ Cuadrícula');
        const listBtn = el('button', 's936lib-viewbtn', '☰ Lista');
        gridBtn.onclick = () => { viewMode='grid'; gridBtn.classList.add('active'); listBtn.classList.remove('active'); render(); };
        listBtn.onclick = () => { viewMode='list'; listBtn.classList.add('active'); gridBtn.classList.remove('active'); render(); };
        const closeBtn = el('button', 's936lib-closebtn', '✕');
        closeBtn.onclick = close;
        header.append(title, gridBtn, listBtn, closeBtn);

        const toolbar = el('div', 's936lib-toolbar');
        const search = document.createElement('input');
        search.className = 's936lib-search';
        search.placeholder = 'Buscar por título o autor...';
        search.oninput = render;
        const importBtn = el('button', 's936lib-importbtn', '⬆ Importar MP3/MP4');
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'audio/*,video/mp4';
        fileInput.multiple = true;
        fileInput.style.display = 'none';
        fileInput.onchange = (e) => importFiles(e.target.files);
        importBtn.onclick = () => fileInput.click();
        toolbar.append(search, importBtn, fileInput);

        const body = el('div', 's936lib-body');

        const footer = el('div', 's936lib-footer');
        const nowPlaying = el('div', 's936lib-nowplaying', 'Nada sonando · 0 en cola');
        const transport = el('div', 's936lib-transport');
        const playPauseBtn = el('button', '', '⏯');
        playPauseBtn.onclick = () => { if(audioEl){ audioEl.paused ? audioEl.play() : audioEl.pause(); } };
        const nextBtn = el('button', '', '⏭ Siguiente');
        nextBtn.onclick = playNextInQueue;
        transport.append(playPauseBtn, nextBtn);
        footer.append(nowPlaying, transport);

        panel.append(header, toolbar, body, footer);
        overlay.appendChild(panel);
        overlay.addEventListener('click', (e) => { if(e.target === overlay) close(); });
        document.body.appendChild(overlay);
        return overlay;
    }

    function open(){
        let overlay = document.getElementById(PANEL_ID + 'Overlay');
        if(!overlay) overlay = buildPanel();
        overlay.classList.add('is-open');
        render();
        updateFooter();
    }
    function close(){
        const overlay = document.getElementById(PANEL_ID + 'Overlay');
        if(overlay) overlay.classList.remove('is-open');
    }
    function toggle(){
        const overlay = document.getElementById(PANEL_ID + 'Overlay');
        if(overlay && overlay.classList.contains('is-open')) close(); else open();
    }

    // Cargar metadatos guardados (sin audio — hay que reimportar el archivo)
    library = loadMeta();

    window.Studio936Library = { open, close, toggle, importFiles };
})();
