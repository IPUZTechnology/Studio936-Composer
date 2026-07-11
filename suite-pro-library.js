// Studio 936 Composer — Librería / "936 Player" (Cambio 167)
//
// QUÉ ES: el mismo módulo unificado del Cambio 165/166 (Composiciones,
// Audios, YouTube, Géneros, Recientes — con migración de los dos
// sistemas viejos que nunca se hablaban entre sí), ahora con el diseño
// real de reproductor retro (LCD + ecualizador animado + transporte)
// que se mostró como prototipo — ya no es solo la lógica de por debajo,
// es la piel completa.
//
// Nombre: el botón de la barra sigue diciendo "Librería" (el concepto
// de "aquí guardo mis cosas" no se pierde) — al abrirlo, el panel
// revela "936 PLAYER" como la sorpresa/identidad del reproductor.
//
// LÍMITE TÉCNICO HONESTO (sigue igual): los navegadores no recuerdan
// archivos de audio del disco entre sesiones — solo el título/autor.
// "Recordar una carpeta" (File System Access API) sigue anotado como
// mejora aparte.
//
// NO incluye: descarga/extracción de audio de YouTube (viola sus
// términos de servicio) — Favoritos de YouTube se ve embebido con el
// reproductor OFICIAL de YouTube (iframe), nunca se procesa el audio.

(function(){
    'use strict';

    const STORE_KEY = 's936_library_v2';
    const MIGRATION_FLAG = 's936_library_v2_migrated';
    const VIEW_MODE_KEY = 's936_library_view_mode';
    const OLD_COMPOSITIONS_KEY = 'studio936ComposerLibraryV18';
    const OLD_AUDIO_META_KEY = 's936_library_meta_v1';
    const PANEL_ID = 's936LibraryPanel';

    let store = null;
    let activeTab = 'recent';
    let viewMode = localStorage.getItem(VIEW_MODE_KEY) === 'list' ? 'list' : 'grid';
    let activeGenreFilter = null;
    let searchQuery = '';
    let audioObjectURLs = {};
    let currentPlayingId = null;   // id de audio sonando (de store.audios)
    let currentPlayingComp = null; // id de composición cuyo preview está sonando (mismo audio, distinta procedencia)
    let currentYoutubeId = null;   // favorito mostrado en el embed
    let queue = [];
    let audioEl = null;
    let eqTimer = null;

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
    function fmtTime(sec){
        if(!isFinite(sec) || sec == null) return '--:--';
        sec = Math.max(0, Math.floor(sec));
        const m = Math.floor(sec/60), s = sec%60;
        return m + ':' + String(s).padStart(2,'0');
    }
    function youtubeVideoId(url){
        try {
            const u = new URL(url);
            let id = u.searchParams.get('v');
            if(!id && u.hostname.includes('youtu.be')) id = u.pathname.slice(1);
            return id || null;
        } catch(_) { return null; }
    }
    function youtubeEmbedUrl(url){
        const id = youtubeVideoId(url);
        return id ? 'https://www.youtube.com/embed/' + id : null;
    }
    function youtubeThumbUrl(url){
        const id = youtubeVideoId(url);
        return id ? 'https://img.youtube.com/vi/' + id + '/mqdefault.jpg' : null;
    }

    // ---------------------------------------------------------------
    // Almacenamiento + migración (idéntico a Cambio 165/166)
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
                            genre: item.project.style || '',
                            previewAudioId: null,
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
    // Géneros
    // ---------------------------------------------------------------
    function genreLabel(rawStyle){
        if(!rawStyle) return '';
        const core = window.Studio936I18nCore;
        if(!core) return rawStyle;
        const options = core.dict?.[core.getLang()]?.select?.style?.options;
        return (options && options[rawStyle]) || rawStyle;
    }

    function allGenres(){
        const set = new Set();
        store.compositions.forEach((item) => { const g = itemGenreLabel('compositions', item); if(g) set.add(g); });
        store.audios.forEach((item) => { if(item.genre) set.add(item.genre); });
        store.youtube.forEach((item) => { if(item.genre) set.add(item.genre); });
        return Array.from(set).sort((a,b)=>a.localeCompare(b));
    }

    function itemGenreLabel(type, item){
        return type === 'compositions' ? genreLabel(item.genre) : (item.genre || '');
    }

    function setGenre(type, id, genre){
        const list = store[type];
        const item = list && list.find(x => x.id === id);
        if(item){ item.genre = genre; saveStore(); }
    }

    // ---------------------------------------------------------------
    // Recientes
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
    // Estilos — piel de reproductor retro (LCD + ecualizador + transporte)
    // ---------------------------------------------------------------
    function injectStyle(){
        if(document.getElementById(PANEL_ID + 'Style')) return;
        const style = document.createElement('style');
        style.id = PANEL_ID + 'Style';
        style.textContent = `
#${PANEL_ID}Overlay { position:fixed; inset:0; z-index:10000; background:rgba(0,0,0,.65); display:none; align-items:center; justify-content:center; }
#${PANEL_ID}Overlay.is-open { display:flex; }
#${PANEL_ID} { width:min(1000px,96vw); height:min(720px,93vh); background:linear-gradient(180deg,#14181a,#0a0d0e); border:1px solid rgba(91,232,201,.3); border-radius:18px; box-shadow:0 30px 90px rgba(0,0,0,.7), 0 0 40px rgba(0,255,204,.05); display:flex; flex-direction:column; overflow:hidden; font-family:inherit; color:#e8f4f2; }

#${PANEL_ID} .s936lib-header { display:flex; align-items:center; gap:12px; padding:12px 18px; border-bottom:1px solid rgba(255,255,255,.08); background:rgba(255,255,255,.02); }
#${PANEL_ID} .s936lib-headertext { flex:1; }
#${PANEL_ID} .s936lib-eyebrow { font-size:.6rem; letter-spacing:2px; color:#9fb0ae; text-transform:uppercase; margin-bottom:2px; }
#${PANEL_ID} .s936lib-header h2 { margin:0; font-size:1.15rem; color:#00ffcc; font-weight:900; letter-spacing:1.5px; text-shadow:0 0 16px rgba(0,255,204,.4); }
#${PANEL_ID} .s936lib-viewbtn { background:#1c2224; border:1px solid #333; color:#9fb0ae; border-radius:8px; padding:6px 10px; font-size:.7rem; cursor:pointer; font-weight:700; }
#${PANEL_ID} .s936lib-viewbtn.active { background:#00ffcc; color:#04342c; border-color:#00ffcc; }
#${PANEL_ID} .s936lib-closebtn { background:transparent; border:none; color:#9fb0ae; font-size:1.3rem; cursor:pointer; line-height:1; padding:4px 8px; }

#${PANEL_ID} .s936lib-tabs { display:flex; gap:4px; padding:8px 14px 0; border-bottom:1px solid rgba(255,255,255,.06); flex-wrap:wrap; }
#${PANEL_ID} .s936lib-tab { background:transparent; border:none; color:#9fb0ae; padding:9px 13px; font-size:.76rem; font-weight:800; cursor:pointer; border-radius:10px 10px 0 0; border-bottom:2px solid transparent; }
#${PANEL_ID} .s936lib-tab.active { color:#5be8c9; border-bottom-color:#5be8c9; background:rgba(91,232,201,.06); }

#${PANEL_ID} .s936lib-lcdwrap { padding:12px 16px 0; }
#${PANEL_ID} .s936lib-lcd { background:#020805; border:1px solid rgba(0,255,204,.35); border-radius:10px; padding:10px 16px; box-shadow:inset 0 0 20px rgba(0,255,204,.06); }
#${PANEL_ID} .s936lib-lcd .row1 { display:flex; justify-content:space-between; align-items:baseline; gap:10px; }
#${PANEL_ID} .s936lib-nowtitle { font-size:.92rem; font-weight:800; color:#00ffcc; text-shadow:0 0 10px rgba(0,255,204,.5); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
#${PANEL_ID} .s936lib-nowtime { font-family:monospace; color:#5be8c9; font-size:.76rem; flex-shrink:0; }
#${PANEL_ID} .s936lib-nowsub { color:#9fb0ae; font-size:.66rem; margin-top:2px; }
#${PANEL_ID} .s936lib-bars { display:flex; gap:2px; align-items:flex-end; height:20px; margin-top:10px; padding-bottom:10px; border-bottom:1px solid rgba(0,255,204,.12); }
#${PANEL_ID} .s936lib-bars i { width:4px; background:linear-gradient(180deg,#00ffcc,#0a3d33); border-radius:2px; height:3px; display:block; }
#${PANEL_ID} .s936lib-progress { height:6px; background:#111; border-radius:3px; margin-top:12px; overflow:hidden; }
#${PANEL_ID} .s936lib-progress b { display:block; height:100%; width:0%; background:#00ffcc; box-shadow:0 0 8px #00ffcc; transition:width .2s linear; }

#${PANEL_ID} .s936lib-transport { display:flex; align-items:center; gap:8px; padding:10px 16px; }
#${PANEL_ID} .s936lib-transport button { background:#1c2224; border:1px solid #333; color:#e8f4f2; border-radius:10px; width:36px; height:32px; cursor:pointer; font-size:.9rem; }
#${PANEL_ID} .s936lib-transport button.s936lib-playbtn { background:#00ffcc; color:#04342c; border-color:#00ffcc; width:48px; box-shadow:0 0 14px rgba(0,255,204,.35); }
#${PANEL_ID} .s936lib-vol { margin-left:auto; display:flex; align-items:center; gap:6px; color:#9fb0ae; font-size:.72rem; }
#${PANEL_ID} .s936lib-vol input[type=range] { accent-color:#00ffcc; width:80px; }

#${PANEL_ID} .s936lib-toolbar { display:flex; gap:8px; padding:10px 18px; border-bottom:1px solid rgba(255,255,255,.06); align-items:center; flex-wrap:wrap; }
#${PANEL_ID} .s936lib-search { flex:1; min-width:160px; background:#1c2224; border:1px solid #333; border-radius:8px; padding:7px 10px; color:#e8f4f2; font-size:.8rem; }
#${PANEL_ID} .s936lib-actionbtn { background:rgba(0,255,204,.12); border:1px solid #00ffcc; color:#00ffcc; border-radius:8px; padding:7px 12px; font-size:.76rem; font-weight:700; cursor:pointer; white-space:nowrap; }

#${PANEL_ID} .s936lib-body { flex:1; overflow-y:auto; padding:14px 18px; }
#${PANEL_ID} .s936lib-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:14px; }
#${PANEL_ID} .s936lib-card { display:flex; flex-direction:column; gap:6px; cursor:pointer; padding:10px; border-radius:12px; border:1px solid rgba(255,255,255,.06); background:rgba(255,255,255,.015); }
#${PANEL_ID} .s936lib-card:hover { border-color:rgba(0,255,204,.4); background:rgba(0,255,204,.05); }
#${PANEL_ID} .s936lib-card.playing { border-color:#00ffcc; background:rgba(0,255,204,.1); box-shadow:0 0 16px rgba(0,255,204,.15); }
#${PANEL_ID} .s936lib-bubble { width:100%; height:76px; border-radius:10px; background:radial-gradient(circle at 30% 25%,#1c5a4f,#0a1614 70%); display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden; }
#${PANEL_ID} .s936lib-bubble::after { content:''; position:absolute; width:44px; height:44px; border-radius:50%; border:2px solid rgba(91,232,201,.35); box-shadow:0 0 0 6px rgba(91,232,201,.08), inset 0 0 12px rgba(0,255,204,.15); }
#${PANEL_ID} .s936lib-bubble span { position:relative; z-index:1; font-size:1.3rem; color:#5be8c9; }
#${PANEL_ID} .s936lib-cardtitle { font-size:.76rem; color:#e8f4f2; font-weight:800; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
#${PANEL_ID} .s936lib-cardmeta { font-size:.62rem; color:#9fb0ae; }
#${PANEL_ID} .s936lib-cardactions { display:flex; align-items:center; gap:6px; margin-top:2px; }
#${PANEL_ID} .s936lib-mini { background:#1c2224; border:1px solid #333; color:#cfe; border-radius:6px; padding:4px 7px; font-size:.62rem; font-weight:700; cursor:pointer; }
#${PANEL_ID} .s936lib-mini.play { color:#00ffcc; border-color:rgba(0,255,204,.4); flex:1; }
#${PANEL_ID} .s936lib-mini.danger { border-color:rgba(255,90,90,.5); color:#ff9a9a; }
#${PANEL_ID} .s936lib-iconbtn { background:transparent; border:1px solid #2c3234; color:#9fb0ae; border-radius:6px; width:24px; height:24px; flex-shrink:0; cursor:pointer; font-size:.72rem; display:flex; align-items:center; justify-content:center; }
#${PANEL_ID} .s936lib-iconbtn:hover { border-color:#5be8c9; color:#5be8c9; }
#${PANEL_ID} .s936lib-iconbtn.danger:hover { border-color:#ff9a9a; color:#ff9a9a; }
#${PANEL_ID} .s936lib-iconbtn.active { background:rgba(0,255,204,.15); border-color:#00ffcc; color:#00ffcc; }
#${PANEL_ID} .s936lib-genretag { font-size:.58rem; background:rgba(91,232,201,.08); color:#7fe9d2; border:1px solid rgba(91,232,201,.25); border-radius:999px; padding:2px 8px; align-self:flex-start; font-weight:600; }

#${PANEL_ID} .s936lib-addtile { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; cursor:pointer; padding:10px; border-radius:12px; border:1.5px dashed rgba(0,255,204,.35); background:rgba(0,255,204,.02); min-height:150px; color:#5be8c9; font-size:.76rem; font-weight:800; text-align:center; }
#${PANEL_ID} .s936lib-addtile:hover { border-color:#00ffcc; background:rgba(0,255,204,.06); }
#${PANEL_ID} .s936lib-addtile .plus { font-size:1.8rem; line-height:1; }

#${PANEL_ID} .s936lib-listwrap { max-height:100%; }
#${PANEL_ID} .s936lib-list-row { display:flex; align-items:center; gap:12px; padding:9px 10px; border-radius:8px; cursor:pointer; border-bottom:1px solid rgba(255,255,255,.05); }
#${PANEL_ID} .s936lib-list-row:hover { background:rgba(0,255,204,.05); }
#${PANEL_ID} .s936lib-list-row.playing { background:rgba(0,255,204,.1); }
#${PANEL_ID} .s936lib-list-icon { width:24px; text-align:center; font-size:.85rem; flex-shrink:0; color:#9fb0ae; }
#${PANEL_ID} .s936lib-list-row.playing .s936lib-list-icon { color:#00ffcc; }
#${PANEL_ID} .s936lib-list-title { flex:1; font-size:.8rem; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
#${PANEL_ID} .s936lib-list-row.playing .s936lib-list-title { color:#5be8c9; }
#${PANEL_ID} .s936lib-list-meta { font-size:.68rem; color:#9fb0ae; width:170px; flex-shrink:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
#${PANEL_ID} .s936lib-list-actions { display:flex; gap:5px; flex-shrink:0; align-items:center; }

#${PANEL_ID} .s936lib-empty { text-align:center; color:#9fb0ae; font-size:.85rem; padding:50px 20px; }
#${PANEL_ID} .s936lib-genrechips { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
#${PANEL_ID} .s936lib-chip { background:#1c2224; border:1px solid #333; color:#e8f4f2; border-radius:999px; padding:8px 14px; font-size:.76rem; font-weight:700; cursor:pointer; }
#${PANEL_ID} .s936lib-chip.active { background:#ffe066; color:#3a2f00; border-color:#ffe066; }
#${PANEL_ID} .s936lib-back { background:transparent; border:none; color:#00ffcc; font-size:.76rem; font-weight:800; cursor:pointer; margin-bottom:10px; padding:0; }

#${PANEL_ID} .s936lib-ytform { display:grid; grid-template-columns:1fr; gap:8px; background:rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.08); border-radius:10px; padding:12px; margin-bottom:14px; }
#${PANEL_ID} .s936lib-ytform input, #${PANEL_ID} .s936lib-ytform textarea { background:#1c2224; border:1px solid #333; border-radius:8px; padding:7px 9px; color:#e8f4f2; font-size:.78rem; font-family:inherit; }
#${PANEL_ID} .s936lib-ytform textarea { resize:vertical; min-height:44px; }
#${PANEL_ID} .s936lib-ytembed { width:100%; aspect-ratio:16/9; background:#000; border-radius:10px; border:1px solid #333; margin-bottom:14px; }
#${PANEL_ID} .s936lib-ytembed iframe { width:100%; height:100%; border:none; border-radius:10px; }
#${PANEL_ID} .s936lib-ytplaceholder { width:100%; aspect-ratio:16/9; background:#000; border-radius:10px; border:1px solid #333; margin-bottom:14px; display:flex; align-items:center; justify-content:center; color:#9fb0ae; font-size:.8rem; text-align:center; padding:20px; }
#${PANEL_ID} .s936lib-ytsearchbar { display:flex; align-items:center; gap:10px; width:100%; background:#1c2224; border:1px solid #333; border-radius:999px; padding:11px 18px; margin-bottom:16px; }
#${PANEL_ID} .s936lib-ytsearchbar:focus-within { border-color:#00ffcc; box-shadow:0 0 0 2px rgba(0,255,204,.15); }
#${PANEL_ID} .s936lib-ytsearchbar .mag { color:#9fb0ae; font-size:1rem; flex-shrink:0; }
#${PANEL_ID} .s936lib-ytsearchbar input { flex:1; background:transparent; border:none; color:#e8f4f2; font-size:.88rem; outline:none; }
#${PANEL_ID} .s936lib-ytgrid { display:flex; flex-direction:column; gap:10px; }
#${PANEL_ID} .s936lib-ytcard { cursor:pointer; display:flex; gap:10px; border-radius:10px; padding:6px; border:1px solid transparent; }
#${PANEL_ID} .s936lib-ytcard:hover { background:rgba(255,255,255,.04); }
#${PANEL_ID} .s936lib-ytcard.active { border-color:#00ffcc; background:rgba(0,255,204,.08); }
#${PANEL_ID} .s936lib-ytthumb { width:168px; flex-shrink:0; aspect-ratio:16/9; border-radius:8px; overflow:hidden; background:#000 center/cover no-repeat; position:relative; }
#${PANEL_ID} .s936lib-ytthumb .ph { width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#9fb0ae; font-size:.65rem; background:#111; }
#${PANEL_ID} .s936lib-ytthumb .playicon { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:1.4rem; color:#fff; background:rgba(0,0,0,.15); opacity:0; transition:opacity .15s ease; }
#${PANEL_ID} .s936lib-ytcard:hover .playicon { opacity:1; }
#${PANEL_ID} .s936lib-ytcardbody { padding:2px 4px; flex:1; min-width:0; display:flex; flex-direction:column; }
#${PANEL_ID} .s936lib-ytcardtitle { font-size:.76rem; font-weight:800; color:#e8f4f2; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
#${PANEL_ID} .s936lib-ytcardnotes { font-size:.64rem; color:#9fb0ae; margin-top:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
#${PANEL_ID} .s936lib-ytcardactions { display:flex; align-items:center; gap:8px; margin-top:auto; padding-top:6px; }
`;
        document.head.appendChild(style);
    }

    // ---------------------------------------------------------------
    // Ecualizador animado — solo corre mientras algo esté sonando
    // ---------------------------------------------------------------
    function startEqAnimation(){
        stopEqAnimation();
        eqTimer = setInterval(() => {
            const panel = document.getElementById(PANEL_ID);
            if(!panel) return;
            panel.querySelectorAll('.s936lib-bars i').forEach((bar) => {
                bar.style.height = (3 + Math.random()*17) + 'px';
            });
        }, 380);
    }
    function stopEqAnimation(){
        if(eqTimer){ clearInterval(eqTimer); eqTimer = null; }
        const panel = document.getElementById(PANEL_ID);
        if(panel) panel.querySelectorAll('.s936lib-bars i').forEach((bar) => { bar.style.height = '3px'; });
    }

    // ---------------------------------------------------------------
    // Búsqueda genérica
    // ---------------------------------------------------------------
    function matchesSearch(item, extraFields){
        if(!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const fields = [item.title, item.author, item.genre].concat(extraFields||[]);
        return fields.some(f => (f||'').toLowerCase().includes(q));
    }

    // ---------------------------------------------------------------
    // Composiciones
    // ---------------------------------------------------------------
    function compositionCardActions(item, compact){
        const box = el('div', 's936lib-cardactions');
        const isPlaying = currentPlayingComp === item.id;
        const playBtn = el('button', 's936lib-mini play', isPlaying ? '⏸ Sonando' : '▶ Play');
        playBtn.onclick = (e) => { e.stopPropagation(); previewComposition(item.id); };
        box.appendChild(playBtn);
        if(compact){
            const openBtn = el('button', 's936lib-iconbtn', '⏏');
            openBtn.title = 'Abrir';
            openBtn.onclick = (e) => { e.stopPropagation(); openComposition(item.id); };
            const dupBtn = el('button', 's936lib-iconbtn', '⧉');
            dupBtn.title = 'Duplicar';
            dupBtn.onclick = (e) => { e.stopPropagation(); duplicateComposition(item.id); };
            const delBtn = el('button', 's936lib-iconbtn danger', '✕');
            delBtn.title = 'Borrar';
            delBtn.onclick = (e) => { e.stopPropagation(); deleteComposition(item.id); };
            box.append(openBtn, dupBtn, delBtn);
        } else {
            const openBtn = el('button', 's936lib-mini', 'Abrir');
            openBtn.onclick = (e) => { e.stopPropagation(); openComposition(item.id); };
            const dupBtn = el('button', 's936lib-mini', 'Duplicar');
            dupBtn.onclick = (e) => { e.stopPropagation(); duplicateComposition(item.id); };
            const delBtn = el('button', 's936lib-mini danger', 'Borrar');
            delBtn.onclick = (e) => { e.stopPropagation(); deleteComposition(item.id); };
            box.append(openBtn, dupBtn, delBtn);
        }
        return box;
    }

    function genreTag(type, item){
        if(type === 'compositions'){
            const tag = el('span', 's936lib-genretag', genreLabel(item.genre) || 'Sin estilo');
            tag.title = 'Viene del estilo elegido en la barra principal al guardar.';
            return tag;
        }
        const tag = el('span', 's936lib-genretag', item.genre || '+ género');
        tag.style.cursor = 'pointer';
        tag.onclick = (e) => {
            e.stopPropagation();
            const value = prompt('Género / etiqueta para "' + item.title + '":', item.genre || '');
            if(value === null) return;
            setGenre(type, item.id, value.trim());
            render();
        };
        return tag;
    }

    function previewComposition(id){
        const item = store.compositions.find(x => x.id === id);
        if(!item) return;
        if(item.previewAudioId && audioObjectURLs[item.previewAudioId]){
            currentPlayingComp = id;
            playAudio(item.previewAudioId, item.title, genreLabel(item.genre) || 'Composición');
            return;
        }
        if(!store.audios.length){
            alert('Todavía no tienes ningún audio importado en la pestaña Audios para usar como referencia de "' + item.title + '". Importa uno ahí primero.');
            return;
        }
        const options = store.audios.map((a, i) => (i+1) + ') ' + a.title).join('\n');
        const choice = prompt('¿Cuál audio de tus Audios quieres usar como referencia de "' + item.title + '"?\n' + options + '\n\nEscribe el número:');
        const idx = parseInt(choice, 10) - 1;
        if(isNaN(idx) || !store.audios[idx]) return;
        item.previewAudioId = store.audios[idx].id;
        saveStore();
        currentPlayingComp = id;
        playAudio(item.previewAudioId, item.title, genreLabel(item.genre) || 'Composición');
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
            genre: snapshot.style || '',
            previewAudioId: null,
            project: snapshot
        });
        saveStore();
        render();
    }

    function renderCompositions(body){
        const list = store.compositions.filter(x => matchesSearch(x) && (!activeGenreFilter || itemGenreLabel('compositions',x) === activeGenreFilter));
        if(!list.length){
            body.appendChild(el('div', 's936lib-empty', store.compositions.length ? 'Sin resultados.' : 'Todavía no has guardado ninguna composición. Usa "Guardar composición actual" arriba.'));
            return;
        }
        if(viewMode === 'grid'){
            const grid = el('div', 's936lib-grid');
            list.forEach((item) => {
                const card = el('div', 's936lib-card' + (currentPlayingComp === item.id ? ' playing' : ''));
                const bubble = el('div', 's936lib-bubble');
                bubble.appendChild(el('span', '', '🎼'));
                const title = el('div', 's936lib-cardtitle', item.title);
                const meta = el('div', 's936lib-cardmeta', (item.author || 'Sin autor') + ' · ' + fmtDate(item.updated));
                card.append(bubble, title, meta, genreTag('compositions', item), compositionCardActions(item, true));
                grid.appendChild(card);
            });
            body.appendChild(grid);
        } else {
            const listWrap = el('div', 's936lib-listwrap');
            list.forEach((item) => {
                const isPlaying = currentPlayingComp === item.id;
                const row = el('div', 's936lib-list-row' + (isPlaying ? ' playing' : ''));
                const icon = el('div', 's936lib-list-icon', isPlaying ? '▶' : '🎼');
                const title = el('div', 's936lib-list-title', item.title);
                const meta = el('div', 's936lib-list-meta', (item.author || 'Sin autor') + ' · ' + fmtDate(item.updated));
                const actions = el('div', 's936lib-list-actions');
                actions.append(genreTag('compositions', item), compositionCardActions(item));
                row.append(icon, title, meta, actions);
                row.onclick = () => previewComposition(item.id);
                listWrap.appendChild(row);
            });
            body.appendChild(listWrap);
        }
    }

    // ---------------------------------------------------------------
    // Audios
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

    function playAudio(id, titleOverride, subOverride){
        const song = store.audios.find(x => x.id === id);
        if(!song) return;
        const objectURL = audioObjectURLs[id];
        if(!objectURL){
            alert('Este audio necesita que vuelvas a seleccionar su archivo (los navegadores no guardan el audio entre sesiones). Usa "Importar" de nuevo con el mismo archivo.');
            return;
        }
        currentPlayingId = id;
        if(!titleOverride) currentPlayingComp = null;
        if(!audioEl){
            audioEl = new Audio();
            audioEl.addEventListener('ended', playNextInQueue);
            audioEl.addEventListener('timeupdate', updateLcd);
            audioEl.addEventListener('loadedmetadata', updateLcd);
        }
        audioEl.src = objectURL;
        audioEl.play().catch(()=>{});
        startEqAnimation();
        updateLcd(null, titleOverride || song.title, subOverride || (song.author || 'Audio'));
        render();
    }

    function togglePlayPause(){
        if(!audioEl || !audioEl.src) return;
        if(audioEl.paused){ audioEl.play().catch(()=>{}); startEqAnimation(); }
        else { audioEl.pause(); stopEqAnimation(); }
        updateLcd();
    }

    function toggleQueue(id){
        const idx = queue.indexOf(id);
        if(idx === -1) queue.push(id); else queue.splice(idx,1);
        render();
    }

    function playNextInQueue(){
        stopEqAnimation();
        if(!queue.length){ currentPlayingId = null; currentPlayingComp = null; updateLcd(); render(); return; }
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

    function buildImportTile(){
        const tile = el('div', 's936lib-addtile');
        tile.appendChild(el('div', 'plus', '+'));
        tile.appendChild(el('div', '', 'Importar MP3/MP4'));
        const fileInput = document.createElement('input');
        fileInput.type = 'file'; fileInput.accept = 'audio/*,video/mp4'; fileInput.multiple = true; fileInput.style.display = 'none';
        fileInput.onchange = (e) => importAudioFiles(e.target.files);
        tile.onclick = () => fileInput.click();
        tile.appendChild(fileInput);
        return tile;
    }

    function renderAudios(body){
        const list = store.audios.filter(x => matchesSearch(x) && (!activeGenreFilter || x.genre === activeGenreFilter));
        if(!list.length){
            if(viewMode === 'grid' && !store.audios.length){
                const grid = el('div', 's936lib-grid');
                grid.appendChild(buildImportTile());
                body.appendChild(grid);
                return;
            }
            body.appendChild(el('div', 's936lib-empty', store.audios.length ? 'Sin resultados.' : 'Todavía no has importado audios. Usa "Importar MP3/MP4" arriba.'));
            return;
        }
        if(viewMode === 'grid'){
            const grid = el('div', 's936lib-grid');
            grid.appendChild(buildImportTile());
            list.forEach((song) => {
                const isPlaying = currentPlayingId === song.id && !currentPlayingComp;
                const card = el('div', 's936lib-card' + (isPlaying ? ' playing' : ''));
                const bubble = el('div', 's936lib-bubble');
                bubble.appendChild(el('span', '', isPlaying ? '▶' : '🎧'));
                const title = el('div', 's936lib-cardtitle', song.title);
                const meta = el('div', 's936lib-cardmeta', song.author || 'Sin autor');
                const actions = el('div', 's936lib-cardactions');
                const playBtn = el('button', 's936lib-mini play', isPlaying ? '⏸ Sonando' : '▶ Play');
                playBtn.onclick = (e) => { e.stopPropagation(); playAudio(song.id); };
                const qBtn = el('button', 's936lib-iconbtn' + (queue.includes(song.id) ? ' active' : ''), '➕');
                qBtn.title = queue.includes(song.id) ? 'En cola — quitar' : 'Agregar a la cola';
                qBtn.onclick = (e) => { e.stopPropagation(); toggleQueue(song.id); };
                const delBtn = el('button', 's936lib-iconbtn danger', '✕');
                delBtn.title = 'Quitar';
                delBtn.onclick = (e) => { e.stopPropagation(); deleteAudio(song.id); };
                actions.append(playBtn, qBtn, delBtn);
                card.append(bubble, title, meta, genreTag('audios', song), actions);
                card.onclick = () => playAudio(song.id);
                grid.appendChild(card);
            });
            body.appendChild(grid);
        } else {
            const listWrap = el('div', 's936lib-listwrap');
            list.forEach((song) => {
                const isPlaying = currentPlayingId === song.id && !currentPlayingComp;
                const row = el('div', 's936lib-list-row' + (isPlaying ? ' playing' : ''));
                const icon = el('div', 's936lib-list-icon', isPlaying ? '▶' : '🎧');
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
                listWrap.appendChild(row);
            });
            body.appendChild(listWrap);
        }
    }

    // ---------------------------------------------------------------
    // LCD — "ahora suena" persistente (visible en cualquier pestaña)
    // ---------------------------------------------------------------
    function updateLcd(_evt, titleOverride, subOverride){
        const panel = document.getElementById(PANEL_ID);
        if(!panel) return;
        const titleEl = panel.querySelector('.s936lib-nowtitle');
        const timeEl = panel.querySelector('.s936lib-nowtime');
        const subEl = panel.querySelector('.s936lib-nowsub');
        const progressBar = panel.querySelector('.s936lib-progress b');
        const playBtn = panel.querySelector('.s936lib-playbtn');
        if(!titleEl) return;
        if(titleOverride){
            titleEl.textContent = titleOverride;
            if(subEl) subEl.textContent = subOverride || 'Sonando ahora';
        } else if(!audioEl || !audioEl.src){
            titleEl.textContent = 'Nada sonando';
            if(subEl) subEl.textContent = queue.length ? queue.length + ' en cola' : 'Elige algo en Audios o Composiciones';
        }
        if(audioEl && timeEl) timeEl.textContent = fmtTime(audioEl.currentTime) + ' / ' + fmtTime(audioEl.duration);
        if(audioEl && progressBar && audioEl.duration) progressBar.style.width = ((audioEl.currentTime/audioEl.duration)*100) + '%';
        if(playBtn) playBtn.textContent = (audioEl && !audioEl.paused) ? '⏸' : '⏵';
    }

    // ---------------------------------------------------------------
    // YouTube
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
        if(currentYoutubeId === id) currentYoutubeId = null;
        saveStore();
        render();
    }

    function renderYoutubeAddForm(body){
        const form = el('div', 's936lib-ytform');
        const urlInput = document.createElement('input');
        urlInput.placeholder = 'Pegar link de YouTube para agregarlo a tu lista (https://...)';
        const titleInput = document.createElement('input');
        titleInput.placeholder = 'Título (opcional)';
        const notesInput = document.createElement('textarea');
        notesInput.placeholder = 'Notas (opcional) — ej. "para el solo de guitarra"...';
        const addBtn = el('button', 's936lib-actionbtn', '+ Agregar a mi lista');
        addBtn.style.alignSelf = 'flex-start';
        addBtn.onclick = () => {
            if(!urlInput.value.trim()){ urlInput.focus(); return; }
            addYoutubeFavorite(urlInput.value, titleInput.value, notesInput.value);
            urlInput.value = ''; titleInput.value = ''; notesInput.value = '';
        };
        form.append(urlInput, titleInput, notesInput, addBtn);
        body.appendChild(form);
    }

    // Cambio 169: "mini YouTube" — busca DENTRO de tus favoritos guardados
    // manualmente (título/notas), con la estética de un buscador de
    // YouTube. No es búsqueda en vivo de todo YouTube (eso necesitaría la
    // API oficial de Google) — es tu lista curada, sin basura, como
    // pediste.
    function renderYoutubeSearchBar(body){
        const bar = el('div', 's936lib-ytsearchbar');
        bar.appendChild(el('span', 'mag', '🔍'));
        const input = document.createElement('input');
        input.placeholder = 'Buscar en tu lista de YouTube...';
        input.value = searchQuery;
        input.oninput = () => { searchQuery = input.value; renderBodyOnly(); };
        bar.appendChild(input);
        body.appendChild(bar);
    }

    function renderYoutube(body){
        renderYoutubeSearchBar(body);

        const current = store.youtube.find(x => x.id === currentYoutubeId) || store.youtube[0];
        if(current){
            const embedUrl = youtubeEmbedUrl(current.url);
            if(embedUrl){
                const wrap = el('div', 's936lib-ytembed');
                const iframe = document.createElement('iframe');
                iframe.src = embedUrl;
                iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
                iframe.allowFullscreen = true;
                wrap.appendChild(iframe);
                body.appendChild(wrap);
            } else {
                body.appendChild(el('div', 's936lib-ytplaceholder', 'No se pudo reconocer el link como un video de YouTube: ' + current.title));
            }
        }

        const list = store.youtube.filter(x => matchesSearch(x, [x.notes, x.url]) && (!activeGenreFilter || x.genre === activeGenreFilter));
        const grid = el('div', 's936lib-ytgrid');
        list.forEach((item) => {
            const card = el('div', 's936lib-ytcard' + (currentYoutubeId === item.id ? ' active' : ''));
            const thumbUrl = youtubeThumbUrl(item.url);
            const thumb = el('div', 's936lib-ytthumb');
            if(thumbUrl) thumb.style.backgroundImage = `url('${thumbUrl}')`;
            else thumb.appendChild(el('div', 'ph', 'Sin miniatura'));
            thumb.appendChild(el('div', 'playicon', '▶'));
            const cardBody = el('div', 's936lib-ytcardbody');
            cardBody.appendChild(el('div', 's936lib-ytcardtitle', item.title));
            if(item.notes) cardBody.appendChild(el('div', 's936lib-ytcardnotes', item.notes));
            const actions = el('div', 's936lib-ytcardactions');
            actions.append(genreTag('youtube', item));
            const delBtn = el('button', 's936lib-iconbtn danger', '✕');
            delBtn.title = 'Borrar de mi lista';
            delBtn.onclick = (e) => { e.stopPropagation(); deleteYoutube(item.id); };
            actions.appendChild(delBtn);
            cardBody.appendChild(actions);
            card.append(thumb, cardBody);
            card.onclick = () => { currentYoutubeId = item.id; render(); };
            grid.appendChild(card);
        });
        body.appendChild(grid);

        renderYoutubeAddForm(body);

        if(!list.length){
            body.appendChild(el('div', 's936lib-empty', store.youtube.length ? 'Sin resultados en tu lista.' : 'Todavía no tienes favoritos de YouTube guardados — pega un link abajo para empezar tu mini lista.'));
        }
    }

    // ---------------------------------------------------------------
    // Géneros
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
                ...store.compositions.filter(x=>itemGenreLabel('compositions',x)===activeGenreFilter).map(x=>({type:'compositions',item:x})),
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
                if(type === 'compositions') row.onclick = () => previewComposition(item.id);
                if(type === 'audios') row.onclick = () => playAudio(item.id);
                if(type === 'youtube') row.onclick = () => { activeTab = 'youtube'; currentYoutubeId = item.id; render(); };
                body.appendChild(row);
            });
            return;
        }
        if(!genres.length){
            body.appendChild(el('div', 's936lib-empty', 'Todavía no le has puesto etiqueta a ningún Audio o favorito de YouTube — o no has guardado ninguna Composición (su género sale solo del estilo elegido).'));
            return;
        }
        const chips = el('div', 's936lib-genrechips');
        genres.forEach((g) => {
            const count = [...store.compositions.filter(x=>itemGenreLabel('compositions',x)===g), ...store.audios.filter(x=>x.genre===g), ...store.youtube.filter(x=>x.genre===g)].length;
            const chip = el('button', 's936lib-chip', g + ' (' + count + ')');
            chip.onclick = () => { activeGenreFilter = g; render(); };
            chips.appendChild(chip);
        });
        body.appendChild(chips);
    }

    // ---------------------------------------------------------------
    // Recientes
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
            if(type === 'compositions') row.onclick = () => previewComposition(item.id);
            if(type === 'audios') row.onclick = () => playAudio(item.id);
            if(type === 'youtube') row.onclick = () => { activeTab = 'youtube'; currentYoutubeId = item.id; render(); };
            body.appendChild(row);
        });
    }

    // ---------------------------------------------------------------
    // Toolbar contextual
    // ---------------------------------------------------------------
    function renderToolbar(toolbar){
        toolbar.innerHTML = '';
        if(activeTab === 'youtube'){
            // Cambio 169: YouTube tiene su propio buscador de línea completa
            // (estilo "mini YouTube"), no el genérico compartido — se oculta
            // toda la barra de herramientas para esta pestaña.
            toolbar.style.display = 'none';
            return;
        }
        toolbar.style.display = '';
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
    }

    function render(){
        const panel = document.getElementById(PANEL_ID);
        if(!panel) return;
        panel.querySelectorAll('.s936lib-tab').forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === activeTab));
        panel.querySelectorAll('.s936lib-viewbtn').forEach((btn) => btn.classList.toggle('active', btn.dataset.view === viewMode));
        renderToolbar(panel.querySelector('.s936lib-toolbar'));
        renderBodyOnly();
        updateLcd();
    }

    // ---------------------------------------------------------------
    // Construcción del panel
    // ---------------------------------------------------------------
    const TABS = [
        ['recent', 'Recientes'],
        ['compositions', 'Composiciones'],
        ['audios', 'Audios'],
        ['youtube', 'YouTube'],
        ['genres', 'Géneros']
    ];

    function buildPanel(){
        injectStyle();
        const overlay = el('div', '');
        overlay.id = PANEL_ID + 'Overlay';
        const panel = el('div', '');
        panel.id = PANEL_ID;

        const header = el('div', 's936lib-header');
        const headerText = el('div', 's936lib-headertext');
        const eyebrow = el('div', 's936lib-eyebrow', 'Librería');
        const title = el('h2', '', '936 PLAYER');
        headerText.append(eyebrow, title);
        const gridBtn = el('button', 's936lib-viewbtn', '⊞');
        gridBtn.dataset.view = 'grid'; gridBtn.title = 'Vista cuadrícula';
        gridBtn.onclick = () => { viewMode = 'grid'; localStorage.setItem(VIEW_MODE_KEY, 'grid'); render(); };
        const listBtn = el('button', 's936lib-viewbtn', '☰');
        listBtn.dataset.view = 'list'; listBtn.title = 'Vista lista';
        listBtn.onclick = () => { viewMode = 'list'; localStorage.setItem(VIEW_MODE_KEY, 'list'); render(); };
        const closeBtn = el('button', 's936lib-closebtn', '✕');
        closeBtn.onclick = close;
        header.append(headerText, gridBtn, listBtn, closeBtn);

        const tabs = el('div', 's936lib-tabs');
        TABS.forEach(([key, label]) => {
            const btn = el('button', 's936lib-tab', label);
            btn.dataset.tab = key;
            btn.onclick = () => { activeTab = key; activeGenreFilter = null; searchQuery = ''; render(); };
            tabs.appendChild(btn);
        });

        const lcdWrap = el('div', 's936lib-lcdwrap');
        const lcd = el('div', 's936lib-lcd');
        const row1 = el('div', 'row1');
        const nowTitle = el('div', 's936lib-nowtitle', 'Nada sonando');
        const nowTime = el('div', 's936lib-nowtime', '--:-- / --:--');
        row1.append(nowTitle, nowTime);
        const nowSub = el('div', 's936lib-nowsub', 'Elige algo en Audios o Composiciones');
        const bars = el('div', 's936lib-bars');
        for(let i=0;i<32;i++) bars.appendChild(el('i'));
        const progress = el('div', 's936lib-progress');
        progress.appendChild(el('b'));
        lcd.append(row1, nowSub, bars, progress);
        lcdWrap.appendChild(lcd);

        const transport = el('div', 's936lib-transport');
        const prevBtn = el('button', '', '⏮');
        prevBtn.title = 'Antes en la cola';
        prevBtn.onclick = () => { if(queue.length) playNextInQueue(); };
        const playBtn = el('button', 's936lib-playbtn', '⏵');
        playBtn.onclick = togglePlayPause;
        const nextBtn = el('button', '', '⏭');
        nextBtn.title = 'Siguiente en la cola';
        nextBtn.onclick = playNextInQueue;
        const vol = el('div', 's936lib-vol', '🔊');
        const volSlider = document.createElement('input');
        volSlider.type = 'range'; volSlider.min = '0'; volSlider.max = '100'; volSlider.value = '80';
        volSlider.oninput = () => { if(audioEl) audioEl.volume = volSlider.value/100; };
        vol.appendChild(volSlider);
        transport.append(prevBtn, playBtn, nextBtn, vol);

        const toolbar = el('div', 's936lib-toolbar');
        const body = el('div', 's936lib-body');

        panel.append(header, tabs, lcdWrap, transport, toolbar, body);
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
