// Studio 936 Composer — Librería unificada (Cambio 165)
//
// QUÉ ES: reemplaza dos sistemas que antes vivían separados y sin
// hablarse entre sí:
//   1) La "Librería/Rockola" (Cambio 127) — jukebox de MP3/MP4 propios.
//   2) El modal viejo "Guardar/Compartir" (v18, dentro de app.js) — que
//      guardaba tus composiciones (acordes, estructura, letra) pero
//      vivía desconectado de cualquier botón visible del Main actual.
//
// Ahora todo vive en un solo panel, con 5 pestañas:
//   Composiciones · Audios · YouTube · Géneros · Recientes
// y selector de vista Cuadrícula/Lista transversal a todas.
//
// MIGRACIÓN: al cargar por primera vez, importa lo que hubiera guardado
// en los dos sistemas viejos (localStorage), sin perder nada, y no
// vuelve a migrar en cargas futuras (bandera de migración).
//
// LÍMITE TÉCNICO HONESTO (igual que antes): los navegadores no recuerdan
// archivos de audio del disco entre sesiones — solo el título/autor: hay
// que volver a seleccionar el archivo. "Recordar una carpeta" (File
// System Access API) quedó anotado como mejora aparte, no está aquí.
//
// NO incluye: descarga/extracción de audio de YouTube (viola sus
// términos de servicio) — Favoritos de YouTube solo guarda el link,
// título y notas, para procesar más adelante cuando exista ese motor.

(function(){
    'use strict';

    const STORE_KEY = 's936_library_v2';
    const MIGRATION_FLAG = 's936_library_v2_migrated';
    const VIEW_MODE_KEY = 's936_library_view_mode';
    const OLD_COMPOSITIONS_KEY = 'studio936ComposerLibraryV18';
    const OLD_AUDIO_META_KEY = 's936_library_meta_v1';
    const PANEL_ID = 's936LibraryPanel';

    let store = null;             // { compositions:[], audios:[], youtube:[] }
    let activeTab = 'recent';     // recent | compositions | audios | youtube | genres
    let viewMode = localStorage.getItem(VIEW_MODE_KEY) === 'list' ? 'list' : 'grid';
    let activeGenreFilter = null; // cuando estás dentro de una etiqueta desde la pestaña Géneros
    let searchQuery = '';
    let audioObjectURLs = {};     // id -> objectURL (solo en memoria, nunca persiste)
    let currentPlayingId = null;
    let queue = [];
    let audioEl = null;

    // ---------------------------------------------------------------
    // Utilidades
    // ---------------------------------------------------------------
    function uid(prefix){ return (prefix||'s') + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
    function el(tag, className, text){
        const node = document.createElement(tag);
        if(className) node.className = className;
        if(text !== undefined) node.textContent = text;
        return node;
    }
    function esc(str){
        return String(str==null?'':str).replace(/[&<>"']/g, (c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }
    function fmtDate(ts){
        if(!ts) return '';
        try { return new Date(ts).toLocaleDateString(undefined, {day:'2-digit', month:'short', year:'numeric'}); }
        catch(_) { return ''; }
    }

    // ---------------------------------------------------------------
    // Almacenamiento + migración
    // ---------------------------------------------------------------
    function emptyStore(){ return { compositions:[], audios:[], youtube:[] }; }

    function loadStore(){
        try {
            const raw = localStorage.getItem(STORE_KEY);
            const parsed = raw ? JSON.parse(raw) : null;
            const s = parsed && typeof parsed === 'object' ? parsed : emptyStore();
            s.compositions = Array.isArray(s.compositions) ? s.compositions : [];
            s.audios = Array.isArray(s.audios) ? s.audios : [];
            s.youtube = Array.isArray(s.youtube) ? s.youtube : [];
            return s;
        } catch(_) { return emptyStore(); }
    }

    function saveStore(){
        try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch(_) {}
    }

    function migrateOldDataIfNeeded(){
        if(localStorage.getItem(MIGRATION_FLAG)) return;
        try {
            const oldCompsRaw = localStorage.getItem(OLD_COMPOSITIONS_KEY);
            if(oldCompsRaw){
                const oldComps = JSON.parse(oldCompsRaw);
                if(Array.isArray(oldComps)){
                    oldComps.forEach((item) => {
                        if(!item || !item.project) return;
                        store.compositions.push({
                            id: item.id || uid('c'),
                            title: item.title || 'Sin título',
                            author: item.author || '',
                            updated: item.updated || Date.now(),
                            genre: '',
                            project: item.project
                        });
                    });
                }
            }
        } catch(_) {}
        try {
            const oldAudioRaw = localStorage.getItem(OLD_AUDIO_META_KEY);
            if(oldAudioRaw){
                const oldAudio = JSON.parse(oldAudioRaw);
                if(Array.isArray(oldAudio)){
                    oldAudio.forEach((song) => {
                        if(!song) return;
                        store.audios.push({
                            id: song.id || uid('a'),
                            title: song.title || song.fileName || 'Sin título',
                            author: song.author || '',
                            fileName: song.fileName || '',
                            genre: '',
                            addedAt: Date.now()
                        });
                    });
                }
            }
        } catch(_) {}
        saveStore();
        localStorage.setItem(MIGRATION_FLAG, '1');
    }

    // ---------------------------------------------------------------
    // Géneros (transversal a los 3 tipos)
    // ---------------------------------------------------------------
    function allGenres(){
        const set = new Set();
        [...store.compositions, ...store.audios, ...store.youtube].forEach((item) => {
            if(item.genre) set.add(item.genre);
        });
        return Array.from(set).sort((a,b)=>a.localeCompare(b));
    }

    function setGenre(type, id, genre){
        const list = store[type];
        const item = list && list.find(x => x.id === id);
        if(item){ item.genre = genre; saveStore(); }
    }

    // ---------------------------------------------------------------
    // Recientes (mezcla los 3 tipos por fecha)
    // ---------------------------------------------------------------
    function recentItems(limit){
        const all = [
            ...store.compositions.map(x => ({ type:'compositions', sortDate:x.updated||0, item:x })),
            ...store.audios.map(x => ({ type:'audios', sortDate:x.addedAt||0, item:x })),
            ...store.youtube.map(x => ({ type:'youtube', sortDate:x.addedAt||0, item:x }))
        ];
        all.sort((a,b)=>b.sortDate - a.sortDate);
        return all.slice(0, limit||20);
    }

    // ---------------------------------------------------------------
    // Estilos
    // ---------------------------------------------------------------
    function injectStyle(){
        if(document.getElementById(PANEL_ID + 'Style')) return;
        const style = document.createElement('style');
        style.id = PANEL_ID + 'Style';
        style.textContent = `
#${PANEL_ID}Overlay { position:fixed; inset:0; z-index:10000; background:rgba(0,0,0,.6); display:none; align-items:center; justify-content:center; }
#${PANEL_ID}Overlay.is-open { display:flex; }
#${PANEL_ID} { width:min(980px,95vw); height:min(680px,92vh); background:linear-gradient(180deg,#14181a,#0a0d0e); border:1px solid rgba(91,232,201,.25); border-radius:18px; box-shadow:0 20px 60px rgba(0,0,0,.6); display:flex; flex-direction:column; overflow:hidden; font-family:inherit; color:#e8f4f2; }
#${PANEL_ID} .s936lib-header { display:flex; align-items:center; gap:10px; padding:12px 18px; border-bottom:1px solid rgba(255,255,255,.08); background:rgba(255,255,255,.02); }
#${PANEL_ID} .s936lib-header img { height:30px; width:auto; }
#${PANEL_ID} .s936lib-header h2 { margin:0; font-size:1.05rem; color:#5be8c9; flex:1; font-weight:800; letter-spacing:.3px; }
#${PANEL_ID} .s936lib-viewbtn { background:#1c2224; border:1px solid #333; color:#9fb0ae; border-radius:8px; padding:6px 10px; font-size:.7rem; cursor:pointer; font-weight:700; }
#${PANEL_ID} .s936lib-viewbtn.active { background:#5be8c9; color:#04342c; border-color:#5be8c9; }
#${PANEL_ID} .s936lib-closebtn { background:transparent; border:none; color:#9fb0ae; font-size:1.3rem; cursor:pointer; line-height:1; padding:4px 8px; }
#${PANEL_ID} .s936lib-tabs { display:flex; gap:4px; padding:8px 14px 0; border-bottom:1px solid rgba(255,255,255,.06); flex-wrap:wrap; }
#${PANEL_ID} .s936lib-tab { background:transparent; border:none; color:#9fb0ae; padding:9px 13px; font-size:.76rem; font-weight:800; cursor:pointer; border-radius:10px 10px 0 0; border-bottom:2px solid transparent; }
#${PANEL_ID} .s936lib-tab.active { color:#5be8c9; border-bottom-color:#5be8c9; background:rgba(91,232,201,.06); }
#${PANEL_ID} .s936lib-toolbar { display:flex; gap:8px; padding:10px 18px; border-bottom:1px solid rgba(255,255,255,.06); align-items:center; flex-wrap:wrap; }
#${PANEL_ID} .s936lib-search { flex:1; min-width:160px; background:#1c2224; border:1px solid #333; border-radius:8px; padding:7px 10px; color:#e8f4f2; font-size:.8rem; }
#${PANEL_ID} .s936lib-actionbtn { background:rgba(91,232,201,.12); border:1px solid #5be8c9; color:#5be8c9; border-radius:8px; padding:7px 12px; font-size:.76rem; font-weight:700; cursor:pointer; white-space:nowrap; }
#${PANEL_ID} .s936lib-body { flex:1; overflow-y:auto; padding:16px 18px; }
#${PANEL_ID} .s936lib-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:14px; }
#${PANEL_ID} .s936lib-card { display:flex; flex-direction:column; gap:6px; cursor:pointer; padding:10px; border-radius:12px; border:1px solid rgba(255,255,255,.06); background:rgba(255,255,255,.015); }
#${PANEL_ID} .s936lib-card:hover { border-color:rgba(91,232,201,.35); background:rgba(91,232,201,.05); }
#${PANEL_ID} .s936lib-card.playing { border-color:#5be8c9; background:rgba(91,232,201,.1); }
#${PANEL_ID} .s936lib-bubble { width:100%; height:78px; border-radius:10px; background:radial-gradient(circle at 35% 30%,#234b45,#0e1414); display:flex; align-items:center; justify-content:center; font-size:1.5rem; }
#${PANEL_ID} .s936lib-cardtitle { font-size:.76rem; color:#e8f4f2; font-weight:800; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
#${PANEL_ID} .s936lib-cardmeta { font-size:.62rem; color:#9fb0ae; }
#${PANEL_ID} .s936lib-cardactions { display:flex; gap:5px; flex-wrap:wrap; margin-top:2px; }
#${PANEL_ID} .s936lib-mini { background:#1c2224; border:1px solid #333; color:#cfe; border-radius:6px; padding:4px 7px; font-size:.62rem; font-weight:700; cursor:pointer; }
#${PANEL_ID} .s936lib-mini.danger { border-color:rgba(255,90,90,.5); color:#ff9a9a; }
#${PANEL_ID} .s936lib-genretag { font-size:.6rem; background:rgba(255,224,102,.1); color:#ffe066; border:1px solid rgba(255,224,102,.35); border-radius:999px; padding:2px 7px; align-self:flex-start; cursor:pointer; }
#${PANEL_ID} .s936lib-list-row { display:flex; align-items:center; gap:12px; padding:9px 10px; border-radius:8px; cursor:pointer; border-bottom:1px solid rgba(255,255,255,.05); }
#${PANEL_ID} .s936lib-list-row:hover { background:rgba(91,232,201,.05); }
#${PANEL_ID} .s936lib-list-row.playing { background:rgba(91,232,201,.1); }
#${PANEL_ID} .s936lib-list-icon { width:30px; text-align:center; font-size:1.1rem; flex-shrink:0; }
#${PANEL_ID} .s936lib-list-title { flex:1; font-size:.8rem; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
#${PANEL_ID} .s936lib-list-meta { font-size:.68rem; color:#9fb0ae; width:170px; flex-shrink:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
#${PANEL_ID} .s936lib-list-actions { display:flex; gap:5px; flex-shrink:0; }
#${PANEL_ID} .s936lib-empty { text-align:center; color:#9fb0ae; font-size:.85rem; padding:50px 20px; }
#${PANEL_ID} .s936lib-genrechips { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
#${PANEL_ID} .s936lib-chip { background:#1c2224; border:1px solid #333; color:#e8f4f2; border-radius:999px; padding:8px 14px; font-size:.76rem; font-weight:700; cursor:pointer; }
#${PANEL_ID} .s936lib-chip.active { background:#ffe066; color:#3a2f00; border-color:#ffe066; }
#${PANEL_ID} .s936lib-back { background:transparent; border:none; color:#5be8c9; font-size:.76rem; font-weight:800; cursor:pointer; margin-bottom:10px; padding:0; }
#${PANEL_ID} .s936lib-ytform { display:grid; grid-template-columns:1fr; gap:8px; background:rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.08); border-radius:10px; padding:12px; margin-bottom:14px; }
#${PANEL_ID} .s936lib-ytform input, #${PANEL_ID} .s936lib-ytform textarea { background:#1c2224; border:1px solid #333; border-radius:8px; padding:7px 9px; color:#e8f4f2; font-size:.78rem; font-family:inherit; }
#${PANEL_ID} .s936lib-ytform textarea { resize:vertical; min-height:44px; }
#${PANEL_ID} .s936lib-footer { border-top:1px solid rgba(255,255,255,.08); padding:10px 18px; display:flex; align-items:center; gap:10px; background:rgba(255,255,255,.02); }
#${PANEL_ID} .s936lib-nowplaying { flex:1; font-size:.76rem; color:#9fb0ae; }
#${PANEL_ID} .s936lib-nowplaying b { color:#5be8c9; }
#${PANEL_ID} .s936lib-transport button { background:#1c2224; border:1px solid #333; color:#e8f4f2; border-radius:8px; padding:6px 12px; font-size:.76rem; cursor:pointer; font-weight:700; }
`;
        document.head.appendChild(style);
    }

    // ---------------------------------------------------------------
    // Filtro de búsqueda genérico
    // ---------------------------------------------------------------
    function matchesSearch(item, extraFields){
        if(!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const fields = [item.title, item.author, item.genre].concat(extraFields||[]);
        return fields.some(f => (f||'').toLowerCase().includes(q));
    }

    // ---------------------------------------------------------------
    // Render — Composiciones
    // ---------------------------------------------------------------
    function compositionCardActions(item){
        const box = el('div', 's936lib-cardactions');
        const openBtn = el('button', 's936lib-mini', 'Abrir');
        openBtn.onclick = (e) => { e.stopPropagation(); openComposition(item.id); };
        const dupBtn = el('button', 's936lib-mini', 'Duplicar');
        dupBtn.onclick = (e) => { e.stopPropagation(); duplicateComposition(item.id); };
        const delBtn = el('button', 's936lib-mini danger', 'Borrar');
        delBtn.onclick = (e) => { e.stopPropagation(); deleteComposition(item.id); };
        box.append(openBtn, dupBtn, delBtn);
        return box;
    }

    function genreTag(type, item){
        const tag = el('span', 's936lib-genretag', item.genre || '+ género');
        tag.onclick = (e) => {
            e.stopPropagation();
            const value = prompt('Género / etiqueta para "' + item.title + '":', item.genre || '');
            if(value === null) return;
            setGenre(type, item.id, value.trim());
            render();
        };
        return tag;
    }

    function openComposition(id){
        const item = store.compositions.find(x => x.id === id);
        if(!item) return;
        if(!confirm('Se abrirá "' + item.title + '" y se recargará la página (así funciona hoy el motor de carga de proyectos). ¿Continuar?')) return;
        if(window.Studio936AppBridge?.loadProject) window.Studio936AppBridge.loadProject(item.project);
    }

    function duplicateComposition(id){
        const item = store.compositions.find(x => x.id === id);
        if(!item) return;
        const copy = JSON.parse(JSON.stringify(item));
        copy.id = uid('c');
        copy.title = item.title + ' copia';
        copy.updated = Date.now();
        store.compositions.unshift(copy);
        saveStore();
        render();
    }

    function deleteComposition(id){
        const item = store.compositions.find(x => x.id === id);
        if(!item) return;
        if(!confirm('¿Borrar "' + item.title + '"? Esta acción no se puede deshacer.')) return;
        store.compositions = store.compositions.filter(x => x.id !== id);
        saveStore();
        render();
    }

    function saveCurrentComposition(){
        const snapshot = window.Studio936AppBridge?.getProjectSnapshot?.();
        if(!snapshot){ alert('No se pudo leer la composición actual.'); return; }
        store.compositions.unshift({
            id: uid('c'),
            title: snapshot.title || 'Sin título',
            author: snapshot.author || '',
            updated: Date.now(),
            genre: '',
            project: snapshot
        });
        saveStore();
        render();
    }

    function renderCompositions(body){
        const list = store.compositions.filter(x => matchesSearch(x) && (!activeGenreFilter || x.genre === activeGenreFilter));
        if(!list.length){
            body.appendChild(el('div', 's936lib-empty', store.compositions.length ? 'Sin resultados.' : 'Todavía no has guardado ninguna composición. Usa "Guardar composición actual" arriba.'));
            return;
        }
        if(viewMode === 'grid'){
            const grid = el('div', 's936lib-grid');
            list.forEach((item) => {
                const card = el('div', 's936lib-card');
                const bubble = el('div', 's936lib-bubble', '🎼');
                const title = el('div', 's936lib-cardtitle', item.title);
                const meta = el('div', 's936lib-cardmeta', (item.author || 'Sin autor') + ' · ' + fmtDate(item.updated));
                card.append(bubble, title, meta, genreTag('compositions', item), compositionCardActions(item));
                grid.appendChild(card);
            });
            body.appendChild(grid);
        } else {
            list.forEach((item) => {
                const row = el('div', 's936lib-list-row');
                const icon = el('div', 's936lib-list-icon', '🎼');
                const title = el('div', 's936lib-list-title', item.title);
                const meta = el('div', 's936lib-list-meta', (item.author || 'Sin autor') + ' · ' + fmtDate(item.updated));
                const actions = el('div', 's936lib-list-actions');
                actions.append(genreTag('compositions', item), compositionCardActions(item));
                row.append(icon, title, meta, actions);
                body.appendChild(row);
            });
        }
    }

    // ---------------------------------------------------------------
    // Render — Audios (jukebox — misma lógica de antes, adaptada)
    // ---------------------------------------------------------------
    function importAudioFiles(fileList){
        const files = Array.from(fileList || []);
        files.forEach((file) => {
            const id = uid('a');
            audioObjectURLs[id] = URL.createObjectURL(file);
            const nameGuess = file.name.replace(/\.(mp3|mp4|wav|m4a|ogg)$/i, '').replace(/[_-]+/g,' ').trim();
            store.audios.push({ id, title: nameGuess || file.name, author:'', fileName:file.name, genre:'', addedAt:Date.now() });
        });
        saveStore();
        render();
    }

    function playAudio(id){
        const song = store.audios.find(x => x.id === id);
        if(!song) return;
        const objectURL = audioObjectURLs[id];
        if(!objectURL){
            alert('Este audio necesita que vuelvas a seleccionar su archivo (los navegadores no guardan el audio entre sesiones). Usa "Importar" de nuevo con el mismo archivo.');
            return;
        }
        currentPlayingId = id;
        if(!audioEl){ audioEl = new Audio(); audioEl.addEventListener('ended', playNextInQueue); }
        audioEl.src = objectURL;
        audioEl.play().catch(()=>{});
        render();
        updateFooter();
    }

    function toggleQueue(id){
        const idx = queue.indexOf(id);
        if(idx === -1) queue.push(id); else queue.splice(idx,1);
        render();
        updateFooter();
    }

    function playNextInQueue(){
        if(!queue.length){ currentPlayingId = null; updateFooter(); return; }
        playAudio(queue.shift());
    }

    function deleteAudio(id){
        const item = store.audios.find(x => x.id === id);
        if(!item) return;
        if(!confirm('¿Quitar "' + item.title + '" de tus audios?')) return;
        store.audios = store.audios.filter(x => x.id !== id);
        delete audioObjectURLs[id];
        saveStore();
        render();
    }

    function renderAudios(body){
        const list = store.audios.filter(x => matchesSearch(x) && (!activeGenreFilter || x.genre === activeGenreFilter));
        if(!list.length){
            body.appendChild(el('div', 's936lib-empty', store.audios.length ? 'Sin resultados.' : 'Todavía no has importado audios. Usa "Importar MP3/MP4" arriba.'));
            return;
        }
        if(viewMode === 'grid'){
            const grid = el('div', 's936lib-grid');
            list.forEach((song) => {
                const card = el('div', 's936lib-card' + (currentPlayingId === song.id ? ' playing' : ''));
                const bubble = el('div', 's936lib-bubble', '🎧');
                const title = el('div', 's936lib-cardtitle', song.title);
                const meta = el('div', 's936lib-cardmeta', song.author || 'Sin autor');
                const actions = el('div', 's936lib-cardactions');
                const qBtn = el('button', 's936lib-mini', queue.includes(song.id) ? 'En cola ✓' : '+ Cola');
                qBtn.onclick = (e) => { e.stopPropagation(); toggleQueue(song.id); };
                const delBtn = el('button', 's936lib-mini danger', 'Quitar');
                delBtn.onclick = (e) => { e.stopPropagation(); deleteAudio(song.id); };
                actions.append(qBtn, delBtn);
                card.append(bubble, title, meta, genreTag('audios', song), actions);
                card.onclick = () => playAudio(song.id);
                grid.appendChild(card);
            });
            body.appendChild(grid);
        } else {
            list.forEach((song) => {
                const row = el('div', 's936lib-list-row' + (currentPlayingId === song.id ? ' playing' : ''));
                const icon = el('div', 's936lib-list-icon', '🎧');
                const title = el('div', 's936lib-list-title', song.title);
                const meta = el('div', 's936lib-list-meta', song.author || 'Sin autor');
                const actions = el('div', 's936lib-list-actions');
                const qBtn = el('button', 's936lib-mini', queue.includes(song.id) ? 'En cola ✓' : '+ Cola');
                qBtn.onclick = (e) => { e.stopPropagation(); toggleQueue(song.id); };
                const delBtn = el('button', 's936lib-mini danger', 'Quitar');
                delBtn.onclick = (e) => { e.stopPropagation(); deleteAudio(song.id); };
                actions.append(genreTag('audios', song), qBtn, delBtn);
                row.append(icon, title, meta, actions);
                row.onclick = () => playAudio(song.id);
                body.appendChild(row);
            });
        }
    }

    function updateFooter(){
        const panel = document.getElementById(PANEL_ID);
        if(!panel) return;
        const now = panel.querySelector('.s936lib-nowplaying');
        if(!now) return;
        const song = store.audios.find(s => s.id === currentPlayingId);
        now.innerHTML = song ? `Sonando ahora: <b>${esc(song.title)}</b> · ${queue.length} en cola` : `Nada sonando · ${queue.length} en cola`;
    }

    // ---------------------------------------------------------------
    // Render — YouTube (favoritos, solo link + notas, sin descargar nada)
    // ---------------------------------------------------------------
    function addYoutubeFavorite(url, title, notes){
        if(!url || !url.trim()) return;
        store.youtube.unshift({ id: uid('y'), title: (title||'').trim() || url.trim(), url: url.trim(), notes:(notes||'').trim(), genre:'', addedAt:Date.now() });
        saveStore();
        render();
    }

    function deleteYoutube(id){
        const item = store.youtube.find(x => x.id === id);
        if(!item) return;
        if(!confirm('¿Borrar el favorito "' + item.title + '"?')) return;
        store.youtube = store.youtube.filter(x => x.id !== id);
        saveStore();
        render();
    }

    function renderYoutubeForm(body){
        const form = el('div', 's936lib-ytform');
        const urlInput = document.createElement('input');
        urlInput.placeholder = 'Link de YouTube (https://...)';
        const titleInput = document.createElement('input');
        titleInput.placeholder = 'Título (opcional)';
        const notesInput = document.createElement('textarea');
        notesInput.placeholder = 'Notas (opcional) — ej. "para el solo de guitarra", "referencia de groove"...';
        const addBtn = el('button', 's936lib-actionbtn', '+ Agregar favorito');
        addBtn.style.alignSelf = 'flex-start';
        addBtn.onclick = () => {
            if(!urlInput.value.trim()){ urlInput.focus(); return; }
            addYoutubeFavorite(urlInput.value, titleInput.value, notesInput.value);
            urlInput.value = ''; titleInput.value = ''; notesInput.value = '';
        };
        form.append(urlInput, titleInput, notesInput, addBtn);
        body.appendChild(form);
    }

    function renderYoutube(body){
        renderYoutubeForm(body);
        const list = store.youtube.filter(x => matchesSearch(x, [x.notes, x.url]) && (!activeGenreFilter || x.genre === activeGenreFilter));
        if(!list.length){
            body.appendChild(el('div', 's936lib-empty', store.youtube.length ? 'Sin resultados.' : 'Todavía no tienes favoritos de YouTube guardados.'));
            return;
        }
        list.forEach((item) => {
            const row = el('div', 's936lib-list-row');
            const icon = el('div', 's936lib-list-icon', '📺');
            const titleWrap = el('div', 's936lib-list-title');
            const link = document.createElement('a');
            link.href = item.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
            link.style.color = '#5be8c9'; link.style.textDecoration = 'none';
            link.textContent = item.title;
            titleWrap.appendChild(link);
            if(item.notes){
                const notes = el('div', '', item.notes);
                notes.style.cssText = 'font-size:.66rem;color:#9fb0ae;margin-top:2px;';
                titleWrap.appendChild(notes);
            }
            const actions = el('div', 's936lib-list-actions');
            const delBtn = el('button', 's936lib-mini danger', 'Borrar');
            delBtn.onclick = () => deleteYoutube(item.id);
            actions.append(genreTag('youtube', item), delBtn);
            row.append(icon, titleWrap, actions);
            body.appendChild(row);
        });
    }

    // ---------------------------------------------------------------
    // Render — Géneros (chips transversales; clic filtra los 3 tipos)
    // ---------------------------------------------------------------
    const TYPE_ICON = { compositions:'🎼', audios:'🎧', youtube:'📺' };
    const TYPE_LABEL = { compositions:'Composición', audios:'Audio', youtube:'YouTube' };

    function renderGenres(body){
        const genres = allGenres();
        if(activeGenreFilter){
            const back = el('button', 's936lib-back', '← Todas las etiquetas');
            back.onclick = () => { activeGenreFilter = null; render(); };
            body.appendChild(back);
            const items = [
                ...store.compositions.filter(x=>x.genre===activeGenreFilter).map(x=>({type:'compositions',item:x})),
                ...store.audios.filter(x=>x.genre===activeGenreFilter).map(x=>({type:'audios',item:x})),
                ...store.youtube.filter(x=>x.genre===activeGenreFilter).map(x=>({type:'youtube',item:x}))
            ];
            if(!items.length){ body.appendChild(el('div', 's936lib-empty', 'Nada con esta etiqueta todavía.')); return; }
            items.forEach(({type,item}) => {
                const row = el('div', 's936lib-list-row');
                row.append(
                    el('div', 's936lib-list-icon', TYPE_ICON[type]),
                    el('div', 's936lib-list-title', item.title + ' — ' + TYPE_LABEL[type]),
                    el('div', 's936lib-list-meta', item.author || '')
                );
                if(type === 'compositions') row.onclick = () => openComposition(item.id);
                if(type === 'audios') row.onclick = () => playAudio(item.id);
                if(type === 'youtube') row.onclick = () => window.open(item.url, '_blank', 'noopener');
                body.appendChild(row);
            });
            return;
        }
        if(!genres.length){
            body.appendChild(el('div', 's936lib-empty', 'Todavía no le has puesto etiqueta/género a nada. Haz clic en "+ género" desde cualquier tarjeta.'));
            return;
        }
        const chips = el('div', 's936lib-genrechips');
        genres.forEach((g) => {
            const count = [...store.compositions, ...store.audios, ...store.youtube].filter(x=>x.genre===g).length;
            const chip = el('button', 's936lib-chip', g + ' (' + count + ')');
            chip.onclick = () => { activeGenreFilter = g; render(); };
            chips.appendChild(chip);
        });
        body.appendChild(chips);
    }

    // ---------------------------------------------------------------
    // Render — Recientes
    // ---------------------------------------------------------------
    function renderRecent(body){
        const items = recentItems(30).filter(({item}) => matchesSearch(item, [item.notes, item.url]));
        if(!items.length){
            body.appendChild(el('div', 's936lib-empty', 'Todavía no hay nada guardado. Empieza por Composiciones, Audios o YouTube.'));
            return;
        }
        items.forEach(({type, item}) => {
            const row = el('div', 's936lib-list-row');
            row.append(
                el('div', 's936lib-list-icon', TYPE_ICON[type]),
                el('div', 's936lib-list-title', item.title),
                el('div', 's936lib-list-meta', TYPE_LABEL[type] + ' · ' + fmtDate(item.updated || item.addedAt))
            );
            if(type === 'compositions') row.onclick = () => openComposition(item.id);
            if(type === 'audios') row.onclick = () => playAudio(item.id);
            if(type === 'youtube') row.onclick = () => window.open(item.url, '_blank', 'noopener');
            body.appendChild(row);
        });
    }

    // ---------------------------------------------------------------
    // Toolbar contextual (cambia según pestaña activa)
    // ---------------------------------------------------------------
    function renderToolbar(toolbar){
        toolbar.innerHTML = '';
        const search = document.createElement('input');
        search.className = 's936lib-search';
        search.placeholder = 'Buscar...';
        search.value = searchQuery;
        search.oninput = () => { searchQuery = search.value; renderBodyOnly(); };
        toolbar.appendChild(search);

        if(activeTab === 'compositions'){
            const btn = el('button', 's936lib-actionbtn', '💾 Guardar composición actual');
            btn.onclick = saveCurrentComposition;
            toolbar.appendChild(btn);
        } else if(activeTab === 'audios'){
            const btn = el('button', 's936lib-actionbtn', '⬆ Importar MP3/MP4');
            const fileInput = document.createElement('input');
            fileInput.type = 'file'; fileInput.accept = 'audio/*,video/mp4'; fileInput.multiple = true; fileInput.style.display = 'none';
            fileInput.onchange = (e) => importAudioFiles(e.target.files);
            btn.onclick = () => fileInput.click();
            toolbar.append(btn, fileInput);
        }
    }

    // ---------------------------------------------------------------
    // Render principal
    // ---------------------------------------------------------------
    function renderBodyOnly(){
        const panel = document.getElementById(PANEL_ID);
        if(!panel) return;
        const body = panel.querySelector('.s936lib-body');
        body.innerHTML = '';
        if(activeTab === 'recent') renderRecent(body);
        else if(activeTab === 'compositions') renderCompositions(body);
        else if(activeTab === 'audios') renderAudios(body);
        else if(activeTab === 'youtube') renderYoutube(body);
        else if(activeTab === 'genres') renderGenres(body);
        updateFooter();
    }

    function render(){
        const panel = document.getElementById(PANEL_ID);
        if(!panel) return;
        panel.querySelectorAll('.s936lib-tab').forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === activeTab));
        panel.querySelectorAll('.s936lib-viewbtn').forEach((btn) => btn.classList.toggle('active', btn.dataset.view === viewMode));
        const footer = panel.querySelector('.s936lib-footer');
        if(footer) footer.style.display = (activeTab === 'audios') ? 'flex' : 'none';
        renderToolbar(panel.querySelector('.s936lib-toolbar'));
        renderBodyOnly();
    }

    // ---------------------------------------------------------------
    // Construcción del panel
    // ---------------------------------------------------------------
    const TABS = [
        ['recent', '🕐 Recientes'],
        ['compositions', '🎼 Composiciones'],
        ['audios', '🎧 Audios'],
        ['youtube', '📺 YouTube'],
        ['genres', '🏷️ Géneros']
    ];

    function buildPanel(){
        injectStyle();
        const overlay = el('div', '');
        overlay.id = PANEL_ID + 'Overlay';
        const panel = el('div', '');
        panel.id = PANEL_ID;

        const header = el('div', 's936lib-header');
        const icon = document.createElement('img');
        icon.src = 'docs/icon/library_icon_s936.svg';
        icon.alt = 'Librería';
        icon.onerror = () => { icon.style.display = 'none'; };
        const title = el('h2', '', 'Librería — Studio 936');
        const gridBtn = el('button', 's936lib-viewbtn', '⊞');
        gridBtn.dataset.view = 'grid';
        gridBtn.title = 'Vista cuadrícula';
        gridBtn.onclick = () => { viewMode = 'grid'; localStorage.setItem(VIEW_MODE_KEY, 'grid'); render(); };
        const listBtn = el('button', 's936lib-viewbtn', '☰');
        listBtn.dataset.view = 'list';
        listBtn.title = 'Vista lista';
        listBtn.onclick = () => { viewMode = 'list'; localStorage.setItem(VIEW_MODE_KEY, 'list'); render(); };
        const closeBtn = el('button', 's936lib-closebtn', '✕');
        closeBtn.onclick = close;
        header.append(icon, title, gridBtn, listBtn, closeBtn);

        const tabs = el('div', 's936lib-tabs');
        TABS.forEach(([key, label]) => {
            const btn = el('button', 's936lib-tab', label);
            btn.dataset.tab = key;
            btn.onclick = () => { activeTab = key; activeGenreFilter = null; searchQuery = ''; render(); };
            tabs.appendChild(btn);
        });

        const toolbar = el('div', 's936lib-toolbar');
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

        panel.append(header, tabs, toolbar, body, footer);
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
    }
    function close(){
        const overlay = document.getElementById(PANEL_ID + 'Overlay');
        if(overlay) overlay.classList.remove('is-open');
    }
    function toggle(){
        const overlay = document.getElementById(PANEL_ID + 'Overlay');
        if(overlay && overlay.classList.contains('is-open')) close(); else open();
    }

    // ---------------------------------------------------------------
    // Init
    // ---------------------------------------------------------------
    store = loadStore();
    migrateOldDataIfNeeded();

    window.Studio936Library = {
        open, close, toggle,
        importFiles: importAudioFiles,
        addYoutubeFavorite,
        saveCurrentComposition
    };
})();
