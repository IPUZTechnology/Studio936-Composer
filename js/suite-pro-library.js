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
    let activePlaylistFilter = null;
    let searchQuery = '';
    let audioObjectURLs = {};
    let currentPlayingId = null;   // id de audio sonando (de store.audios)
    let currentPlayingComp = null; // id de composición cuyo preview está sonando (mismo audio, distinta procedencia)
    let currentYoutubeId = null;   // favorito mostrado en el embed
    let ytAutoplayNext = false;    // si el próximo embed debe iniciar sonando (solo tras elegir a mano)
    let windowState = 'normal';    // normal | maximized | mini
    let miniPos = null;            // {left, top} recordada mientras está en modo mini
    let lcdYoutubeTitle = null;    // título a mostrar en el LCD mientras no suene audio
    let ytFormOpen = false;        // si el mini-formulario de "+ agregar" está abierto
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
    function youtubeEmbedUrl(url, autoplay){
        const id = youtubeVideoId(url);
        if(!id) return null;
        const origin = typeof location !== 'undefined' ? encodeURIComponent(location.origin) : '';
        return 'https://www.youtube.com/embed/' + id + '?enablejsapi=1&origin=' + origin + (autoplay ? '&autoplay=1' : '');
    }
    // Cambio 176: API oficial de YouTube (postMessage, la misma que
    // provee YouTube para integraciones — no hay nada indebido aquí) para
    // que el ecualizador reaccione al Play/Pausa REAL del video, sea que
    // lo actives desde nuestra lista o desde los controles propios de
    // YouTube encima del video.
    let ytPlayer = null;
    let ytApiCallbacks = [];
    function ensureYoutubeApi(cb){
        if(window.YT && window.YT.Player){ cb(); return; }
        ytApiCallbacks.push(cb);
        if(window.__s936YtApiLoading) return;
        window.__s936YtApiLoading = true;
        const prevReady = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            if(typeof prevReady === 'function') prevReady();
            ytApiCallbacks.forEach((fn) => fn());
            ytApiCallbacks = [];
        };
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
    }
    let isYoutubePlaying = false;
    function handleYtStateChange(event){
        if(window.YT && event.data === window.YT.PlayerState.PLAYING){ isYoutubePlaying = true; startEqAnimation(); }
        else { isYoutubePlaying = false; stopEqAnimation(); }
    }
    // Cambio 172: cada barra del ecualizador se colorea interpolando entre
    // azul y verde según su posición — el lado izquierdo va de azul
    // (afuera) a verde (junto a la marca central), el derecho al revés,
    // como pediste ("degradan del azul al verde").
    const EQ_BLUE = [59, 160, 255];
    const EQ_GREEN = [0, 255, 204];
    function lerpBarColor(index, total, reversed){
        const t = total <= 1 ? 0 : index / (total - 1);
        const ratio = reversed ? (1 - t) : t;
        const r = Math.round(EQ_BLUE[0] + (EQ_GREEN[0]-EQ_BLUE[0]) * ratio);
        const g = Math.round(EQ_BLUE[1] + (EQ_GREEN[1]-EQ_BLUE[1]) * ratio);
        const b = Math.round(EQ_BLUE[2] + (EQ_GREEN[2]-EQ_BLUE[2]) * ratio);
        return `rgb(${r},${g},${b})`;
    }
    function youtubeThumbUrl(url){
        const id = youtubeVideoId(url);
        return id ? 'https://img.youtube.com/vi/' + id + '/mqdefault.jpg' : null;
    }

    // ---------------------------------------------------------------
    // Almacenamiento + migración (idéntico a Cambio 165/166)
    // ---------------------------------------------------------------
    function emptyStore(){ return { compositions:[], audios:[], youtube:[] }; }

    // Cambio 186: cada ítem ahora también tiene .playlists (array de
    // nombres) — muchos-a-muchos, distinto de .genre (un solo valor,
    // musical). Esta función asegura que TODO ítem existente tenga el
    // campo, sin importar si vino de antes de este cambio.
    function ensurePlaylistsField(list){
        (list || []).forEach((item) => { if(!Array.isArray(item.playlists)) item.playlists = []; });
    }

    function loadStore(){
        try {
            const raw = localStorage.getItem(STORE_KEY);
            const parsed = raw ? JSON.parse(raw) : null;
            const s = parsed && typeof parsed === 'object' ? parsed : emptyStore();
            s.compositions = Array.isArray(s.compositions) ? s.compositions : [];
            s.audios = Array.isArray(s.audios) ? s.audios : [];
            s.youtube = Array.isArray(s.youtube) ? s.youtube : [];
            ensurePlaylistsField(s.compositions);
            ensurePlaylistsField(s.audios);
            ensurePlaylistsField(s.youtube);
            return s;
        } catch(_) { return emptyStore(); }
    }

    function saveStore(){
        try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch(_) {}
    }

    function allPlaylists(){
        const set = new Set();
        [...store.compositions, ...store.audios, ...store.youtube].forEach((item) => {
            (item.playlists || []).forEach((p) => { if(p) set.add(p); });
        });
        return Array.from(set).sort((a,b)=>a.localeCompare(b));
    }

    function setItemPlaylists(type, id, playlists){
        const list = store[type];
        const item = list && list.find(x => x.id === id);
        if(item){ item.playlists = playlists.filter(Boolean); saveStore(); }
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
/* Cambio 180: en modo mini/flotante, el fondo deja de oscurecer y de
   bloquear clics — así se puede seguir trabajando en el Studio 936 de
   atrás mientras el video/audio sigue sonando en la ventanita. */
#${PANEL_ID}Overlay.s936lib-state-mini { background:transparent; pointer-events:none; align-items:flex-start; justify-content:flex-start; }
#${PANEL_ID} { width:min(1000px,96vw); height:min(720px,93vh); background:linear-gradient(180deg,#14181a,#0a0d0e); border:1px solid rgba(91,232,201,.3); border-radius:18px; box-shadow:0 30px 90px rgba(0,0,0,.7), 0 0 40px rgba(0,255,204,.05); display:flex; flex-direction:column; overflow:hidden; font-family:inherit; color:#e8f4f2; }
#${PANEL_ID}.s936lib-state-maximized { width:100vw; height:100vh; border-radius:0; }
/* Cambio 182: en maximizado el video debe ser el protagonista — se
   achica todo el "cromado" alrededor (pestañas ocultas, LCD delgado sin
   ecualizador, controles compactos en una sola línea angosta) para que
   quede la mayor parte de la pantalla real para el video. */
#${PANEL_ID}.s936lib-state-maximized .s936lib-tabs { display:none !important; }
/* Cambio 184: mismo concepto de "mini mixer" del modo mini, aplicado
   también a maximizado — barras chiquitas junto al título, sin repetir
   el texto "936 PLAYER" (ya está en el header). */
#${PANEL_ID}.s936lib-state-maximized .s936lib-eqrow { margin-top:3px; padding-bottom:3px; gap:8px; }
#${PANEL_ID}.s936lib-state-maximized .s936lib-eqbrand { display:none; }
#${PANEL_ID}.s936lib-state-maximized .s936lib-eqside { height:12px; gap:1px; }
#${PANEL_ID}.s936lib-state-maximized .s936lib-eqside i { width:3px; }
#${PANEL_ID}.s936lib-state-maximized .s936lib-header { padding:5px 14px; }
#${PANEL_ID}.s936lib-state-maximized .s936lib-lcdwrap { padding:4px 14px 0; }
#${PANEL_ID}.s936lib-state-maximized .s936lib-lcd { padding:4px 12px; }
#${PANEL_ID}.s936lib-state-maximized .s936lib-nowtitle { font-size:.78rem; }
#${PANEL_ID}.s936lib-state-maximized .s936lib-progress { margin-top:4px; }
#${PANEL_ID}.s936lib-state-maximized .s936lib-controlrow { padding:5px 14px; }
#${PANEL_ID}.s936lib-state-maximized #s936lib-yt-list-slot { max-height:120px; }
#${PANEL_ID}.s936lib-state-maximized .s936lib-body { flex:1; min-height:0; }
#${PANEL_ID}.s936lib-state-maximized .s936lib-ytembed { height:calc(100vh - 180px); max-height:none; }
#${PANEL_ID}.s936lib-state-maximized .s936lib-ytembed iframe { height:100%; }
#${PANEL_ID}.s936lib-state-mini { position:fixed; width:300px; height:auto; max-height:none; pointer-events:auto; box-shadow:0 20px 50px rgba(0,0,0,.6), 0 0 30px rgba(0,255,204,.15); }
#${PANEL_ID}.s936lib-state-mini .s936lib-tabs,
#${PANEL_ID}.s936lib-state-mini .s936lib-toolbar,
#${PANEL_ID}.s936lib-state-mini #s936lib-yt-list-slot { display:none !important; }
/* Cambio 183: en mini, el ecualizador ya no se oculta del todo — se
   convierte en un mini-mixer chiquitito junto al título (sin repetir el
   texto "936 PLAYER", que ya está arriba en el header). */
#${PANEL_ID}.s936lib-state-mini .s936lib-eqrow { margin-top:3px; padding-bottom:3px; gap:6px; }
#${PANEL_ID}.s936lib-state-mini .s936lib-eqbrand { display:none; }
#${PANEL_ID}.s936lib-state-mini .s936lib-eqside { height:11px; gap:1px; }
#${PANEL_ID}.s936lib-state-mini .s936lib-eqside i { width:3px; }
#${PANEL_ID}.s936lib-state-mini .s936lib-lcdwrap { padding:6px 10px 0; }
#${PANEL_ID}.s936lib-state-mini .s936lib-lcd { padding:6px 10px; }
#${PANEL_ID}.s936lib-state-mini .s936lib-nowtitle { font-size:.72rem; }
#${PANEL_ID}.s936lib-state-mini .s936lib-nowtime { font-size:.6rem; }
#${PANEL_ID}.s936lib-state-mini .s936lib-nowsub { font-size:.62rem; }
#${PANEL_ID}.s936lib-state-mini .s936lib-progress { margin-top:5px; }
#${PANEL_ID}.s936lib-state-mini .s936lib-controlrow { padding:5px 10px; gap:6px; }
#${PANEL_ID}.s936lib-state-mini .s936lib-controlrow > button { width:24px; height:22px; font-size:.68rem; border-radius:7px; }
#${PANEL_ID}.s936lib-state-mini .s936lib-body { padding:0; max-height:none; }
#${PANEL_ID}.s936lib-state-mini #s936lib-yt-embed-slot { margin:0; }
#${PANEL_ID}.s936lib-state-mini .s936lib-ytembed { margin:0; border-radius:0 0 16px 16px; }
#${PANEL_ID}.s936lib-state-mini .s936lib-header { cursor:grab; padding:6px 10px; }
#${PANEL_ID}.s936lib-state-mini .s936lib-header:active { cursor:grabbing; }
#${PANEL_ID}.s936lib-state-mini .s936lib-header h2 { font-size:.8rem; }
#${PANEL_ID} .s936lib-winbtn { background:transparent; border:none; color:#9fb0ae; font-size:1rem; cursor:pointer; line-height:1; padding:4px 8px; border-radius:6px; }
#${PANEL_ID} .s936lib-winbtn:hover { background:rgba(255,255,255,.08); color:#e8f4f2; }

#${PANEL_ID} .s936lib-header { display:flex; align-items:center; gap:12px; padding:8px 16px; border-bottom:1px solid rgba(255,255,255,.08); background:rgba(255,255,255,.02); }
#${PANEL_ID} .s936lib-headertext { display:flex; align-items:baseline; gap:8px; }
#${PANEL_ID} .s936lib-eyebrow { font-size:.58rem; letter-spacing:1.5px; color:#9fb0ae; text-transform:uppercase; }
#${PANEL_ID} .s936lib-header h2 { margin:0; font-size:.95rem; color:#00ffcc; font-weight:900; letter-spacing:1.2px; text-shadow:0 0 12px rgba(0,255,204,.4); }
#${PANEL_ID} .s936lib-headertext { flex:1; }
#${PANEL_ID} .s936lib-viewbtn { background:#1c2224; border:1px solid #333; color:#9fb0ae; border-radius:8px; padding:6px 10px; font-size:.7rem; cursor:pointer; font-weight:700; }
#${PANEL_ID} .s936lib-viewbtn.active { background:#00ffcc; color:#04342c; border-color:#00ffcc; }
#${PANEL_ID} .s936lib-closebtn { background:transparent; border:none; color:#9fb0ae; font-size:1.3rem; cursor:pointer; line-height:1; padding:4px 8px; }

#${PANEL_ID} .s936lib-tabs { display:flex; gap:4px; padding:5px 14px 0; border-bottom:1px solid rgba(255,255,255,.06); flex-wrap:wrap; }
#${PANEL_ID} .s936lib-tab { background:transparent; border:none; color:#9fb0ae; padding:6px 12px; font-size:.74rem; font-weight:800; cursor:pointer; border-radius:10px 10px 0 0; border-bottom:2px solid transparent; }
#${PANEL_ID} .s936lib-tab.active { color:#5be8c9; border-bottom-color:#5be8c9; background:rgba(91,232,201,.06); }

#${PANEL_ID} .s936lib-lcdwrap { padding:8px 16px 0; }
#${PANEL_ID} .s936lib-lcd { background:#020805; border:1px solid rgba(0,255,204,.35); border-radius:10px; padding:7px 14px; box-shadow:inset 0 0 20px rgba(0,255,204,.06); }
#${PANEL_ID} .s936lib-lcd .row1 { display:flex; justify-content:space-between; align-items:baseline; gap:10px; }
#${PANEL_ID} .s936lib-nowtitle { font-size:.92rem; font-weight:800; color:#00ffcc; text-shadow:0 0 10px rgba(0,255,204,.5); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
#${PANEL_ID} .s936lib-nowtime { font-family:monospace; color:#5be8c9; font-size:.76rem; flex-shrink:0; }
#${PANEL_ID} .s936lib-nowsub { color:#9fb0ae; font-size:.66rem; margin-top:2px; }
#${PANEL_ID} .s936lib-eqrow { display:flex; align-items:center; justify-content:center; gap:14px; margin-top:6px; padding-bottom:6px; border-bottom:1px solid rgba(0,255,204,.12); }
#${PANEL_ID} .s936lib-eqside { display:flex; gap:3px; align-items:flex-end; height:24px; flex:1; min-width:0; justify-content:center; }
#${PANEL_ID} .s936lib-eqside.left { justify-content:flex-end; }
#${PANEL_ID} .s936lib-eqside.right { justify-content:flex-start; }
#${PANEL_ID} .s936lib-eqside i { flex:0 0 auto; width:6px; border-radius:2px; height:3px; display:block; }
#${PANEL_ID} .s936lib-eqbrand { font-size:1.05rem; font-weight:900; letter-spacing:4px; color:#5be8c9; text-shadow:0 0 14px rgba(0,255,204,.55); white-space:nowrap; flex-shrink:0; text-align:center; }
#${PANEL_ID} .s936lib-progress { height:6px; background:#111; border-radius:3px; margin-top:12px; overflow:hidden; }
#${PANEL_ID} .s936lib-progress b { display:block; height:100%; width:0%; background:#00ffcc; box-shadow:0 0 8px #00ffcc; transition:width .2s linear; }

#${PANEL_ID} .s936lib-controlrow { display:flex; align-items:center; gap:10px; padding:10px 18px; border-bottom:1px solid rgba(255,255,255,.06); }
#${PANEL_ID} .s936lib-controlrow > button { background:#1c2224; border:1px solid #333; color:#e8f4f2; border-radius:10px; width:34px; height:32px; cursor:pointer; font-size:.9rem; flex-shrink:0; }
#${PANEL_ID} .s936lib-controlrow > button.s936lib-playbtn { background:#00ffcc; color:#04342c; border-color:#00ffcc; width:44px; box-shadow:0 0 14px rgba(0,255,204,.35); }
#${PANEL_ID} .s936lib-vol { margin-left:auto; display:flex; align-items:center; gap:6px; color:#9fb0ae; font-size:.72rem; }
#${PANEL_ID} .s936lib-vol input[type=range] { accent-color:#00ffcc; width:80px; }

#${PANEL_ID} .s936lib-toolbar { display:flex; gap:8px; align-items:center; flex-wrap:wrap; flex:1; min-width:0; }
#${PANEL_ID} .s936lib-search { flex:1; min-width:160px; background:#1c2224; border:1px solid #333; border-radius:8px; padding:7px 10px; color:#e8f4f2; font-size:.8rem; }
#${PANEL_ID} .s936lib-actionbtn { background:rgba(0,255,204,.12); border:1px solid #00ffcc; color:#00ffcc; border-radius:8px; padding:7px 12px; font-size:.76rem; font-weight:700; cursor:pointer; white-space:nowrap; }

#${PANEL_ID} .s936lib-body { flex:1; overflow-y:auto; padding:14px 18px; scrollbar-width:thin; scrollbar-color:rgba(0,255,204,.35) transparent; }
#${PANEL_ID} .s936lib-body::-webkit-scrollbar { width:7px; }
#${PANEL_ID} .s936lib-body::-webkit-scrollbar-track { background:transparent; }
#${PANEL_ID} .s936lib-body::-webkit-scrollbar-thumb { background:rgba(0,255,204,.28); border-radius:10px; }
#${PANEL_ID} .s936lib-body::-webkit-scrollbar-thumb:hover { background:rgba(0,255,204,.5); }
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
#${PANEL_ID} .s936lib-kebabwrap { position:relative; margin-left:auto; }
#${PANEL_ID} .s936lib-kebab { background:transparent; border:none; color:#9fb0ae; cursor:pointer; font-size:1rem; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
#${PANEL_ID} .s936lib-kebab:hover { background:rgba(255,255,255,.08); color:#e8f4f2; }
#${PANEL_ID} .s936lib-menu { position:absolute; right:0; top:100%; z-index:20; min-width:190px; background:#181e20; border:1px solid rgba(255,255,255,.1); border-radius:10px; box-shadow:0 12px 30px rgba(0,0,0,.5); padding:6px; display:none; }
.s936lib-menu-floating { position:fixed !important; z-index:2147483000; min-width:190px; background:#181e20; border:1px solid rgba(255,255,255,.1); border-radius:10px; box-shadow:0 12px 30px rgba(0,0,0,.5); padding:6px; display:none; }
.s936lib-menu-floating.open { display:block; }
.s936lib-menu-floating .s936lib-menu-item { display:flex; align-items:center; gap:9px; width:100%; background:transparent; border:none; color:#e8f4f2; text-align:left; padding:8px 10px; border-radius:7px; font-size:.76rem; cursor:pointer; }
.s936lib-menu-floating .s936lib-menu-item:hover { background:rgba(0,255,204,.08); }
.s936lib-menu-floating .s936lib-menu-item.danger { color:#ff9a9a; }
.s936lib-menu-floating .s936lib-menu-item .ic { width:16px; text-align:center; flex-shrink:0; }
#${PANEL_ID} .s936lib-menu.open { display:block; }
#${PANEL_ID} .s936lib-menu-item { display:flex; align-items:center; gap:9px; width:100%; background:transparent; border:none; color:#e8f4f2; text-align:left; padding:8px 10px; border-radius:7px; font-size:.76rem; cursor:pointer; }
#${PANEL_ID} .s936lib-menu-item:hover { background:rgba(0,255,204,.08); }
#${PANEL_ID} .s936lib-menu-item.danger { color:#ff9a9a; }
#${PANEL_ID} .s936lib-menu-item .ic { width:16px; text-align:center; flex-shrink:0; }
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

.s936lib-gpfields { display:flex; flex-direction:column; gap:6px; }
.s936lib-gptitle { font-size:.8rem; font-weight:800; color:#e8f4f2; margin-bottom:4px; }
.s936lib-gplabel { font-size:.62rem; text-transform:uppercase; letter-spacing:.6px; color:#9fb0ae; margin-top:4px; }
.s936lib-gpgenre-input { background:#1c2224; border:1px solid #333; border-radius:8px; padding:7px 9px; color:#e8f4f2; font-size:.78rem; font-family:inherit; }
.s936lib-gpgenre-readonly { background:rgba(91,232,201,.08); border:1px solid rgba(91,232,201,.25); border-radius:8px; padding:6px 9px; color:#7fe9d2; font-size:.78rem; font-weight:700; }
.s936lib-gpchips { display:flex; flex-wrap:wrap; gap:6px; }
.s936lib-gpchip { background:#1c2224; border:1px solid #333; color:#9fb0ae; border-radius:999px; padding:5px 12px; font-size:.7rem; font-weight:700; cursor:pointer; }
.s936lib-gpchip.active { background:rgba(0,255,204,.15); border-color:#00ffcc; color:#00ffcc; }
.s936lib-gpempty { font-size:.68rem; color:#7a8785; font-style:italic; }
.s936lib-gpnewrow { display:flex; gap:6px; }
.s936lib-gpnewrow input { flex:1; background:#1c2224; border:1px solid #333; border-radius:8px; padding:6px 9px; color:#e8f4f2; font-size:.74rem; font-family:inherit; }
.s936lib-gpaddbtn { background:transparent; border:1px solid #00ffcc; color:#00ffcc; border-radius:8px; padding:6px 12px; font-size:.7rem; font-weight:700; cursor:pointer; white-space:nowrap; }

#${PANEL_ID} .s936lib-ytform { display:grid; grid-template-columns:1fr; gap:8px; background:rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.08); border-radius:10px; padding:12px; margin-bottom:14px; }
.s936lib-ytform-floating { position:fixed !important; z-index:2147483000; width:min(320px,90vw); display:grid; grid-template-columns:1fr; gap:8px; background:#181e20; border:1px solid rgba(0,255,204,.3); border-radius:12px; padding:14px; box-shadow:0 16px 40px rgba(0,0,0,.55); }
.s936lib-ytform-floating input, .s936lib-ytform-floating textarea { background:#1c2224; border:1px solid #333; border-radius:8px; padding:7px 9px; color:#e8f4f2; font-size:.78rem; font-family:inherit; }
.s936lib-ytform-floating textarea { resize:vertical; min-height:44px; }
.s936lib-ytform-floating .s936lib-actionbtn { background:rgba(0,255,204,.12); border:1px solid #00ffcc; color:#00ffcc; border-radius:8px; padding:7px 12px; font-size:.76rem; font-weight:700; cursor:pointer; }
#${PANEL_ID} .s936lib-ytform input, #${PANEL_ID} .s936lib-ytform textarea { background:#1c2224; border:1px solid #333; border-radius:8px; padding:7px 9px; color:#e8f4f2; font-size:.78rem; font-family:inherit; }
#${PANEL_ID} .s936lib-ytform textarea { resize:vertical; min-height:44px; }
#${PANEL_ID} .s936lib-ytembed { width:100%; max-width:100%; aspect-ratio:16/9; max-height:min(52vh,480px); margin:0 auto 16px; background:#000; border-radius:10px; border:1px solid #333; }
/* Cambio 184: el video usa casi todo el ancho real del panel en vista
   normal — contrarresta el padding del body con márgenes negativos, en
   vez de dejar franjas oscuras a los lados solo para verlo completo sin
   tener que maximizar. */
#${PANEL_ID} #s936lib-yt-embed-slot { margin:-14px -18px 0; }
#${PANEL_ID} #s936lib-yt-embed-slot .s936lib-ytembed { border-radius:0; border-left:none; border-right:none; }
#${PANEL_ID} .s936lib-ytembed iframe { width:100%; height:100%; border:none; border-radius:10px; }
#${PANEL_ID} .s936lib-ytplaceholder { width:100%; aspect-ratio:16/9; background:#000; border-radius:10px; border:1px solid #333; margin-bottom:14px; display:flex; align-items:center; justify-content:center; color:#9fb0ae; font-size:.8rem; text-align:center; padding:20px; }
#${PANEL_ID} .s936lib-ytsearchbar { display:flex; align-items:center; gap:8px; width:100%; background:#1c2224; border:1px solid #333; border-radius:999px; padding:6px 14px; margin-bottom:0; }
#${PANEL_ID} .s936lib-ytsearchbar input { font-size:.8rem; }
#${PANEL_ID} .s936lib-ytsearchbar:focus-within { border-color:#00ffcc; box-shadow:0 0 0 2px rgba(0,255,204,.15); }
#${PANEL_ID} .s936lib-ytsearchbar .mag { color:#5be8c9; flex-shrink:0; display:flex; align-items:center; opacity:.85; }
#${PANEL_ID} .s936lib-ytsearchbar input { flex:1; background:transparent; border:none; color:#e8f4f2; font-size:.88rem; outline:none; }
#${PANEL_ID} .s936lib-ytgrid { display:grid; grid-template-columns:repeat(auto-fill,minmax(190px,1fr)); gap:14px; }
#${PANEL_ID} .s936lib-ytcard { cursor:pointer; display:flex; flex-direction:column; border-radius:10px; padding:0; border:1px solid transparent; overflow:hidden; }
#${PANEL_ID} .s936lib-ytcard:hover { background:rgba(255,255,255,.04); }
#${PANEL_ID} .s936lib-ytcard.active { border-color:#00ffcc; background:rgba(0,255,204,.08); }
#${PANEL_ID} .s936lib-ytthumb { width:100%; flex-shrink:0; aspect-ratio:16/9; border-radius:8px; overflow:hidden; background:#000 center/cover no-repeat; position:relative; }
#${PANEL_ID} .s936lib-ytthumb .ph { width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#9fb0ae; font-size:.65rem; background:#111; }
#${PANEL_ID} .s936lib-ytthumb .playicon { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:1.4rem; color:#fff; background:rgba(0,0,0,.15); opacity:0; transition:opacity .15s ease; }
#${PANEL_ID} .s936lib-ytcard:hover .playicon { opacity:1; }
#${PANEL_ID} .s936lib-ytcardbody { padding:8px 2px; flex:1; min-width:0; display:flex; flex-direction:column; }
#${PANEL_ID} .s936lib-ytcardtitle { font-size:.8rem; font-weight:700; color:#e8f4f2; line-height:1.3; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
#${PANEL_ID} .s936lib-ytcardnotes { font-size:.68rem; color:#9fb0ae; margin-top:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
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
            panel.querySelectorAll('.s936lib-eqside i').forEach((bar) => {
                bar.style.height = (3 + Math.random()*19) + 'px';
            });
        }, 380);
    }
    function stopEqAnimation(){
        if(eqTimer){ clearInterval(eqTimer); eqTimer = null; }
        const panel = document.getElementById(PANEL_ID);
        if(panel) panel.querySelectorAll('.s936lib-eqside i').forEach((bar) => { bar.style.height = '3px'; });
    }

    // ---------------------------------------------------------------
    // Búsqueda genérica
    // ---------------------------------------------------------------
    function matchesSearch(item, extraFields){
        if(activePlaylistFilter && !(item.playlists || []).includes(activePlaylistFilter)) return false;
        if(!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const fields = [item.title, item.author, item.genre].concat(extraFields||[]);
        return fields.some(f => (f||'').toLowerCase().includes(q));
    }

    function buildPlaylistFilterButton(){
        const btn = el('button', 's936lib-iconbtn' + (activePlaylistFilter ? ' active' : ''), '⏷');
        btn.title = activePlaylistFilter ? ('Filtrando: ' + activePlaylistFilter) : 'Filtrar por lista';
        btn.style.cssText = 'width:32px;height:32px;font-size:.85rem;flex-shrink:0;';
        btn.onclick = (e) => {
            e.stopPropagation();
            if(genrePlaylistPopoverEl){ closeGenrePlaylistPopover(); return; }
            const pop = el('div', 's936lib-ytform s936lib-ytform-floating s936lib-gppopover');
            pop.appendChild(el('div', 's936lib-gptitle', 'Filtrar por lista'));
            const chips = el('div', 's936lib-gpchips');
            const allBtn = el('button', 's936lib-gpchip' + (!activePlaylistFilter ? ' active' : ''), 'Todas');
            allBtn.type = 'button';
            allBtn.onclick = (ev) => { ev.preventDefault(); activePlaylistFilter = null; closeGenrePlaylistPopover(); renderBodyOnly(); };
            chips.appendChild(allBtn);
            allPlaylists().forEach((name) => {
                const chip = el('button', 's936lib-gpchip' + (activePlaylistFilter === name ? ' active' : ''), name);
                chip.type = 'button';
                chip.onclick = (ev) => { ev.preventDefault(); activePlaylistFilter = name; closeGenrePlaylistPopover(); renderBodyOnly(); };
                chips.appendChild(chip);
            });
            if(!allPlaylists().length) chips.appendChild(el('div', 's936lib-gpempty', 'Todavía no tienes listas creadas.'));
            pop.appendChild(chips);
            pop.addEventListener('click', (ev) => ev.stopPropagation());
            document.body.appendChild(pop);
            positionFloatingPopover(pop, btn);
            genrePlaylistPopoverEl = pop;
        };
        return btn;
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

    // Cambio 174: menú de tres puntos genérico — igual patrón que el "..."
    // de YouTube, reutilizable en cualquier tarjeta. Solo un menú abierto
    // a la vez (se cierra al abrir otro o al hacer clic afuera).
    let openMenuEl = null;
    function closeAnyOpenMenu(){
        if(openMenuEl){ openMenuEl.classList.remove('open'); openMenuEl = null; }
    }
    document.addEventListener('click', (e) => {
        if(openMenuEl && !e.target.closest('.s936lib-kebabwrap') && !e.target.closest('.s936lib-menu-floating')) closeAnyOpenMenu();
    });
    function buildKebabMenu(items){
        const wrap = el('div', 's936lib-kebabwrap');
        const btn = el('button', 's936lib-kebab', '⋮');
        const menu = el('div', 's936lib-menu s936lib-menu-floating');
        items.forEach(({icon, label, danger, onClick}) => {
            const item = el('button', 's936lib-menu-item' + (danger ? ' danger' : ''));
            item.appendChild(el('span', 'ic', icon || ''));
            item.appendChild(el('span', '', label));
            item.onclick = (e) => { e.stopPropagation(); closeAnyOpenMenu(); onClick(); };
            menu.appendChild(item);
        });
        // Cambio 178: el menú se agrega directo a <body> con position:fixed
        // (no dentro de la tarjeta) — así el scroll de la lista nunca lo
        // recorta ni lo tapa, igual que el tooltip global (Cambio 162).
        document.body.appendChild(menu);
        btn.onclick = (e) => {
            e.stopPropagation();
            if(openMenuEl === menu){ closeAnyOpenMenu(); return; }
            closeAnyOpenMenu();
            const rect = btn.getBoundingClientRect();
            menu.style.left = '0px';
            menu.style.top = '0px';
            menu.classList.add('open');
            // Medir después de mostrarlo para saber su tamaño real y no
            // salirse de la pantalla por abajo o por la derecha.
            const menuRect = menu.getBoundingClientRect();
            let left = rect.right - menuRect.width;
            let top = rect.bottom + 4;
            if(top + menuRect.height > window.innerHeight - 8) top = rect.top - menuRect.height - 4;
            if(left < 8) left = 8;
            menu.style.left = left + 'px';
            menu.style.top = top + 'px';
            openMenuEl = menu;
        };
        wrap.appendChild(btn);
        return wrap;
    }

    // Cambio 186: componente reutilizable de "género + listas", usado al
    // agregar/guardar en los 3 lados (Composiciones, Audio MP3, YouTube)
    // y también al editar después. El género es un solo valor musical
    // (editable solo si genreEditable=true — en Composiciones viene
    // automático del estilo, no se pregunta de nuevo); las listas son
    // muchas-a-muchas, siempre editables: casillas de las que ya existen
    // + un campo para crear una nueva sobre la marcha.
    function buildGenrePlaylistFields(opts){
        const wrap = el('div', 's936lib-gpfields');
        let genreInput = null;
        if(opts.genreEditable){
            wrap.appendChild(el('label', 's936lib-gplabel', 'Género'));
            genreInput = document.createElement('input');
            genreInput.className = 's936lib-gpgenre-input';
            genreInput.placeholder = 'Género / estilo (ej. Rock, Bolero...)';
            genreInput.value = opts.genre || '';
            wrap.appendChild(genreInput);
        } else if(opts.genre !== undefined){
            wrap.appendChild(el('label', 's936lib-gplabel', 'Género'));
            const badge = el('div', 's936lib-gpgenre-readonly', genreLabel(opts.genre) || 'Sin estilo');
            wrap.appendChild(badge);
        }

        wrap.appendChild(el('label', 's936lib-gplabel', 'Listas'));
        const chipsWrap = el('div', 's936lib-gpchips');
        const selected = new Set(opts.playlists || []);
        function renderChips(){
            chipsWrap.innerHTML = '';
            allPlaylists().forEach((name) => {
                const chip = el('button', 's936lib-gpchip' + (selected.has(name) ? ' active' : ''), name);
                chip.type = 'button';
                chip.onclick = (e) => {
                    e.preventDefault();
                    if(selected.has(name)) selected.delete(name); else selected.add(name);
                    renderChips();
                };
                chipsWrap.appendChild(chip);
            });
            if(!allPlaylists().length){
                chipsWrap.appendChild(el('div', 's936lib-gpempty', 'Todavía no tienes listas — crea la primera abajo.'));
            }
        }
        renderChips();
        wrap.appendChild(chipsWrap);

        const newRow = el('div', 's936lib-gpnewrow');
        const newInput = document.createElement('input');
        newInput.placeholder = '+ Nueva lista (ej. Guitarra, Karaoke...)';
        const newBtn = el('button', 's936lib-gpaddbtn', '+ Crear');
        newBtn.type = 'button';
        newBtn.onclick = (e) => {
            e.preventDefault();
            const name = newInput.value.trim();
            if(!name) return;
            selected.add(name);
            newInput.value = '';
            renderChips();
        };
        newRow.append(newInput, newBtn);
        wrap.appendChild(newRow);

        return {
            wrap,
            getGenre: () => genreInput ? genreInput.value.trim() : (opts.genre || ''),
            getPlaylists: () => Array.from(selected)
        };
    }

    function openEditGenrePlaylistPopover(type, item){
        if(genrePlaylistPopoverEl) closeGenrePlaylistPopover();
        const pop = el('div', 's936lib-ytform s936lib-ytform-floating s936lib-gppopover');
        pop.appendChild(el('div', 's936lib-gptitle', 'Editar "' + item.title + '"'));
        const gp = buildGenrePlaylistFields({ genre: item.genre || '', genreEditable: type !== 'compositions', playlists: item.playlists || [] });
        const saveBtn = el('button', 's936lib-actionbtn', 'Guardar cambios');
        saveBtn.style.alignSelf = 'flex-start';
        saveBtn.onclick = (e) => {
            e.stopPropagation();
            if(type !== 'compositions') setGenre(type, item.id, gp.getGenre());
            setItemPlaylists(type, item.id, gp.getPlaylists());
            closeGenrePlaylistPopover();
            render();
        };
        pop.append(gp.wrap, saveBtn);
        pop.addEventListener('click', (e) => e.stopPropagation());
        document.body.appendChild(pop);
        positionFloatingPopover(pop, null);
        genrePlaylistPopoverEl = pop;
    }

    function genreTag(type, item){
        if(type === 'compositions'){
            const tag = el('span', 's936lib-genretag', genreLabel(item.genre) || 'Sin estilo');
            tag.title = 'El género viene del estilo elegido al guardar. Clic para editar las listas.';
            tag.style.cursor = 'pointer';
            tag.onclick = (e) => { e.stopPropagation(); openEditGenrePlaylistPopover('compositions', item); };
            return tag;
        }
        const tag = el('span', 's936lib-genretag', item.genre || '+ género');
        tag.style.cursor = 'pointer';
        tag.onclick = (e) => { e.stopPropagation(); openEditGenrePlaylistPopover(type, item); };
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

    let genrePlaylistPopoverEl = null;
    function closeGenrePlaylistPopover(){
        if(genrePlaylistPopoverEl){ genrePlaylistPopoverEl.remove(); genrePlaylistPopoverEl = null; }
    }
    document.addEventListener('click', (e) => {
        if(genrePlaylistPopoverEl && !e.target.closest('.s936lib-gppopover')) closeGenrePlaylistPopover();
    });

    function saveCurrentComposition(anchorBtn){
        const snapshot = window.Studio936AppBridge?.getProjectSnapshot?.();
        if(!snapshot){ alert('No se pudo leer la composición actual.'); return; }
        if(genrePlaylistPopoverEl){ closeGenrePlaylistPopover(); return; }
        const pop = el('div', 's936lib-ytform s936lib-ytform-floating s936lib-gppopover');
        pop.appendChild(el('div', 's936lib-gptitle', 'Guardar "' + (snapshot.title || 'Sin título') + '"'));
        // Cambio 186: el género NO se pregunta aquí — ya viene automático
        // del estilo elegido en la barra principal (decisión ya tomada
        // antes, sigue vigente). Solo se piden las listas.
        const gp = buildGenrePlaylistFields({ genre: snapshot.style || '', genreEditable:false, playlists:[] });
        const saveBtn = el('button', 's936lib-actionbtn', '💾 Guardar composición');
        saveBtn.style.alignSelf = 'flex-start';
        saveBtn.onclick = (e) => {
            e.stopPropagation();
            store.compositions.unshift({
                id: uid('c'),
                title: snapshot.title || 'Sin título',
                author: snapshot.author || '',
                updated: Date.now(),
                genre: snapshot.style || '',
                playlists: gp.getPlaylists(),
                previewAudioId: null,
                project: snapshot
            });
            saveStore();
            closeGenrePlaylistPopover();
            render();
        };
        pop.append(gp.wrap, saveBtn);
        pop.addEventListener('click', (e) => e.stopPropagation());
        document.body.appendChild(pop);
        positionFloatingPopover(pop, anchorBtn);
        genrePlaylistPopoverEl = pop;
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
    function importAudioFiles(fileList, anchorEl){
        const files = Array.from(fileList || []);
        if(!files.length) return;
        const staged = files.map((file) => {
            const id = uid('a');
            audioObjectURLs[id] = URL.createObjectURL(file);
            const nameGuess = file.name.replace(/\.(mp3|mp4|wav|m4a|ogg)$/i, '').replace(/[_-]+/g,' ').trim();
            return { id, title: nameGuess || file.name, fileName: file.name };
        });
        if(genrePlaylistPopoverEl) closeGenrePlaylistPopover();
        const pop = el('div', 's936lib-ytform s936lib-ytform-floating s936lib-gppopover');
        pop.appendChild(el('div', 's936lib-gptitle', staged.length > 1 ? ('Importar ' + staged.length + ' archivos') : ('Importar "' + staged[0].title + '"')));
        const gp = buildGenrePlaylistFields({ genre:'', genreEditable:true, playlists:[] });
        const importBtn = el('button', 's936lib-actionbtn', '⬆ Importar');
        importBtn.style.alignSelf = 'flex-start';
        importBtn.onclick = (e) => {
            e.stopPropagation();
            const genre = gp.getGenre();
            const playlists = gp.getPlaylists();
            staged.forEach((s) => {
                store.audios.push({ id:s.id, title:s.title, author:'', fileName:s.fileName, genre, playlists, addedAt:Date.now() });
            });
            saveStore();
            closeGenrePlaylistPopover();
            render();
        };
        pop.append(gp.wrap, importBtn);
        pop.addEventListener('click', (e) => e.stopPropagation());
        document.body.appendChild(pop);
        positionFloatingPopover(pop, anchorEl);
        genrePlaylistPopoverEl = pop;
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

    function renameAudio(id){
        const item = store.audios.find(x => x.id === id);
        if(!item) return;
        const value = prompt('Nuevo nombre para este MP3:', item.title);
        if(value === null || !value.trim()) return;
        item.title = value.trim();
        saveStore();
        render();
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
        fileInput.onchange = (e) => importAudioFiles(e.target.files, tile);
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
                const editBtn = el('button', 's936lib-iconbtn', '✎');
                editBtn.title = 'Editar nombre';
                editBtn.onclick = (e) => { e.stopPropagation(); renameAudio(song.id); };
                const qBtn = el('button', 's936lib-iconbtn' + (queue.includes(song.id) ? ' active' : ''), '➕');
                qBtn.title = queue.includes(song.id) ? 'En cola — quitar' : 'Agregar a la cola';
                qBtn.onclick = (e) => { e.stopPropagation(); toggleQueue(song.id); };
                const delBtn = el('button', 's936lib-iconbtn danger', '✕');
                delBtn.title = 'Quitar';
                delBtn.onclick = (e) => { e.stopPropagation(); deleteAudio(song.id); };
                actions.append(playBtn, editBtn, qBtn, delBtn);
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
                const editBtn = el('button', 's936lib-iconbtn', '✎');
                editBtn.title = 'Editar nombre';
                editBtn.onclick = (e) => { e.stopPropagation(); renameAudio(song.id); };
                const qBtn = el('button', 's936lib-mini', queue.includes(song.id) ? 'En cola ✓' : '+ Cola');
                qBtn.onclick = (e) => { e.stopPropagation(); toggleQueue(song.id); };
                const delBtn = el('button', 's936lib-mini danger', 'Quitar');
                delBtn.onclick = (e) => { e.stopPropagation(); deleteAudio(song.id); };
                actions.append(genreTag('audios', song), editBtn, qBtn, delBtn);
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
            lcdYoutubeTitle = null;
        } else if(!audioEl || !audioEl.src){
            // Cambio 172: si no hay audio sonando pero sí un video de
            // YouTube seleccionado, el LCD muestra su título — antes se
            // quedaba fijo en "Nada sonando" sin importar qué estuvieras
            // viendo.
            if(lcdYoutubeTitle){
                titleEl.textContent = lcdYoutubeTitle;
                if(subEl) subEl.textContent = '';
                // Cambio 175: no hay forma de leer el tiempo real de un
                // iframe de YouTube — mostrar "--:-- / --:--" ahí se veía
                // como un reloj roto. Se deja en blanco en vez de un
                // placeholder que nunca se llena.
                if(timeEl) timeEl.textContent = '';
            } else {
                titleEl.textContent = 'Nada sonando';
                if(subEl) subEl.textContent = queue.length ? queue.length + ' en cola' : 'Elige algo en Audios o Composiciones';
                if(timeEl) timeEl.textContent = '';
            }
        }
        if(audioEl && timeEl) timeEl.textContent = fmtTime(audioEl.currentTime) + ' / ' + fmtTime(audioEl.duration);
        if(audioEl && progressBar && audioEl.duration) progressBar.style.width = ((audioEl.currentTime/audioEl.duration)*100) + '%';
        if(playBtn) playBtn.textContent = (audioEl && !audioEl.paused) ? '⏸' : '⏵';
    }

    function youtubeFilteredList(){
        return store.youtube.filter(x => matchesSearch(x, [x.notes, x.url]) && (!activeGenreFilter || x.genre === activeGenreFilter));
    }
    function youtubeListNav(step){
        const list = youtubeFilteredList();
        if(!list.length) return;
        const idx = list.findIndex(x => x.id === currentYoutubeId);
        const nextIdx = idx === -1 ? 0 : (idx + step + list.length) % list.length;
        selectYoutubeVideo(list[nextIdx]);
    }

    function selectYoutubeVideo(item){
        currentYoutubeId = item.id;
        lcdYoutubeTitle = item.title;
        ytAutoplayNext = true;
        startEqAnimation();
        render();
    }

    // ---------------------------------------------------------------
    // YouTube
    // ---------------------------------------------------------------
    function addYoutubeFavorite(url, title, genre, playlists){
        if(!url || !url.trim()) return;
        store.youtube.unshift({ id: uid('y'), title: (title||'').trim() || 'Video de YouTube', url: url.trim(), notes:'', genre:(genre||'').trim(), playlists:(playlists||[]).filter(Boolean), addedAt:Date.now() });
        saveStore();
        render();
    }

    function renameYoutube(id){
        const item = store.youtube.find(x => x.id === id);
        if(!item) return;
        const value = prompt('Nuevo nombre para este video:', item.title);
        if(value === null || !value.trim()) return;
        item.title = value.trim();
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

    let ytAddPopoverEl = null;
    function closeYoutubeAddPopover(){
        if(ytAddPopoverEl){ ytAddPopoverEl.remove(); ytAddPopoverEl = null; }
        ytFormOpen = false;
    }
    function positionFloatingPopover(pop, anchorBtn){
        const popRect = pop.getBoundingClientRect();
        if(!anchorBtn){
            pop.style.left = ((window.innerWidth - popRect.width) / 2) + 'px';
            pop.style.top = ((window.innerHeight - popRect.height) / 2) + 'px';
            return;
        }
        const rect = anchorBtn.getBoundingClientRect();
        let left = rect.right - popRect.width;
        let top = rect.bottom + 6;
        if(top + popRect.height > window.innerHeight - 8) top = rect.top - popRect.height - 6;
        if(left < 8) left = 8;
        pop.style.left = left + 'px';
        pop.style.top = top + 'px';
    }

    function toggleYoutubeAddPopover(anchorBtn){
        if(ytAddPopoverEl){ closeYoutubeAddPopover(); return; }
        ytFormOpen = true;
        const pop = el('div', 's936lib-ytform s936lib-ytform-floating');
        const urlInput = document.createElement('input');
        urlInput.placeholder = 'Pegar link de YouTube (https://...)';
        const titleInput = document.createElement('input');
        titleInput.placeholder = 'Título (recomendado)';
        // Cambio 186: el campo de "notas" se convierte en género + listas
        // — se elige/crea sobre la marcha, en el mismo paso de agregar.
        const gp = buildGenrePlaylistFields({ genre:'', genreEditable:true, playlists:[] });
        const addBtn = el('button', 's936lib-actionbtn', '+ Agregar a mi lista');
        addBtn.style.alignSelf = 'flex-start';
        addBtn.onclick = (e) => {
            e.stopPropagation();
            if(!urlInput.value.trim()){ urlInput.focus(); return; }
            addYoutubeFavorite(urlInput.value, titleInput.value, gp.getGenre(), gp.getPlaylists());
            closeYoutubeAddPopover();
        };
        pop.append(urlInput, titleInput, gp.wrap, addBtn);
        pop.addEventListener('click', (e) => e.stopPropagation());
        document.body.appendChild(pop);
        positionFloatingPopover(pop, anchorBtn);
        ytAddPopoverEl = pop;
        urlInput.focus();
    }
    document.addEventListener('click', (e) => {
        if(ytAddPopoverEl && !e.target.closest('.s936lib-ytform-floating') && !e.target.closest('.s936lib-iconbtn[title="Agregar un video a tu lista"]')){
            closeYoutubeAddPopover();
        }
    });

    // Cambio 169: "mini YouTube" — busca DENTRO de tus favoritos guardados
    // manualmente (título/notas), con la estética de un buscador de
    // YouTube. No es búsqueda en vivo de todo YouTube (eso necesitaría la
    // API oficial de Google) — es tu lista curada, sin basura, como
    // pediste. Cambio 175: el buscador se movió a la fila fusionada de
    // transporte (renderToolbar) para liberar una línea de alto.
    // Cambio 176: el embed y la lista viven en dos contenedores separados
    // y persistentes — antes TODO el body se limpiaba y reconstruía en
    // cada tecla del buscador, lo que recargaba el video de YouTube desde
    // cero mientras escribías. Ahora el embed solo se toca si el video
    // seleccionado realmente cambió.
    let lastEmbeddedYoutubeId = undefined;
    function renderYoutubeEmbed(embedSlot, current){
        if((current ? current.id : null) === lastEmbeddedYoutubeId) return;
        lastEmbeddedYoutubeId = current ? current.id : null;
        if(ytPlayer){ try { ytPlayer.destroy(); } catch(_) {} ytPlayer = null; }
        embedSlot.innerHTML = '';
        if(!current){ lcdYoutubeTitle = null; updateLcd(); return; }
        // Cambio 179: el LCD debe reflejar el video que de verdad está en
        // pantalla — antes solo se actualizaba cuando elegías uno a mano
        // (selectYoutubeVideo); el video mostrado por defecto (el primero
        // de la lista) nunca avisaba al LCD, y se quedaba diciendo "Nada
        // sonando" aunque ya se viera/sonara algo.
        lcdYoutubeTitle = current.title;
        updateLcd();
        const embedUrl = youtubeEmbedUrl(current.url, ytAutoplayNext);
        ytAutoplayNext = false;
        if(!embedUrl){
            embedSlot.appendChild(el('div', 's936lib-ytplaceholder', 'No se pudo reconocer el link como un video de YouTube: ' + current.title));
            return;
        }
        const wrap = el('div', 's936lib-ytembed');
        const iframeId = 's936libYtIframe';
        const iframe = document.createElement('iframe');
        iframe.id = iframeId;
        iframe.src = embedUrl;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        wrap.appendChild(iframe);
        embedSlot.appendChild(wrap);
        ensureYoutubeApi(() => {
            if(!document.getElementById(iframeId)) return;
            ytPlayer = new window.YT.Player(iframeId, { events: { onStateChange: handleYtStateChange } });
        });
    }

    function renderYoutubeList(listSlot){
        // Cambio 178: los menús de tres puntos viven en <body>, no dentro
        // de la tarjeta — si no se limpian antes de reconstruir la lista,
        // se van acumulando huérfanos en el fondo de la página.
        document.querySelectorAll('.s936lib-menu-floating').forEach((m) => m.remove());
        openMenuEl = null;
        listSlot.innerHTML = '';
        const list = youtubeFilteredList();
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
            cardBody.appendChild(el('div', 's936lib-ytcardnotes', item.notes || ('Agregado a tu lista · ' + fmtDate(item.addedAt))));
            const actions = el('div', 's936lib-ytcardactions');
            actions.append(genreTag('youtube', item));
            const kebab = buildKebabMenu([
                { icon:'▶', label:'Reproducir aquí', onClick: () => selectYoutubeVideo(item) },
                { icon:'↗', label:'Abrir en YouTube', onClick: () => window.open(item.url, '_blank', 'noopener') },
                { icon:'⧉', label:'Copiar link', onClick: () => { navigator.clipboard?.writeText(item.url); } },
                { icon:'✎', label:'Editar nombre', onClick: () => renameYoutube(item.id) },
                { icon:'🏷', label:'Editar género y listas', onClick: () => openEditGenrePlaylistPopover('youtube', item) },
                { icon:'✕', label:'Borrar de mi lista', danger:true, onClick: () => deleteYoutube(item.id) }
            ]);
            actions.appendChild(kebab);
            cardBody.appendChild(actions);
            card.append(thumb, cardBody);
            card.onclick = () => selectYoutubeVideo(item);
            grid.appendChild(card);
        });
        listSlot.appendChild(grid);

        if(!list.length){
            listSlot.appendChild(el('div', 's936lib-empty', store.youtube.length ? 'Sin resultados en tu lista.' : 'Todavía no tienes favoritos de YouTube guardados — pega un link abajo para empezar tu mini lista.'));
        }
    }

    function renderYoutube(body){
        let embedSlot = body.querySelector('#s936lib-yt-embed-slot');
        let listSlot = body.querySelector('#s936lib-yt-list-slot');
        if(!embedSlot || !listSlot){
            body.innerHTML = '';
            embedSlot = el('div', ''); embedSlot.id = 's936lib-yt-embed-slot';
            listSlot = el('div', ''); listSlot.id = 's936lib-yt-list-slot';
            body.append(embedSlot, listSlot);
        }
        const current = store.youtube.find(x => x.id === currentYoutubeId) || store.youtube[0];
        renderYoutubeEmbed(embedSlot, current);
        renderYoutubeList(listSlot);
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
                if(type === 'youtube') row.onclick = () => { activeTab = 'youtube'; selectYoutubeVideo(item); };
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
            if(type === 'youtube') row.onclick = () => { activeTab = 'youtube'; selectYoutubeVideo(item); };
            body.appendChild(row);
        });
    }

    // ---------------------------------------------------------------
    // Toolbar contextual
    // ---------------------------------------------------------------
    function renderToolbar(toolbar){
        toolbar.innerHTML = '';
        toolbar.style.display = '';
        if(activeTab === 'youtube'){
            // Cambio 175: el buscador de YouTube ahora vive en la misma
            // fila fusionada (transporte + búsqueda + volumen), en vez de
            // tener su propia línea aparte — libera una línea entera de
            // alto para que se vea más pantalla del video.
            const bar = el('div', 's936lib-ytsearchbar');
            bar.style.flex = '1';
            const magIcon = el('span', 'mag');
            magIcon.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="6.5"/><line x1="19" y1="19" x2="15" y2="15"/></svg>';
            bar.appendChild(magIcon);
            const input = document.createElement('input');
            input.placeholder = 'Buscar en tu lista de YouTube...';
            input.value = searchQuery;
            input.oninput = () => { searchQuery = input.value; renderBodyOnly(); };
            bar.appendChild(input);
            const addBtn = el('button', 's936lib-iconbtn' + (ytFormOpen ? ' active' : ''), '+');
            addBtn.title = 'Agregar un video a tu lista';
            addBtn.style.cssText = 'width:34px;height:32px;font-size:1.1rem;flex-shrink:0;';
            addBtn.onclick = (e) => { e.stopPropagation(); toggleYoutubeAddPopover(addBtn); };
            toolbar.append(bar, buildPlaylistFilterButton(), addBtn);
            return;
        }
        const search = document.createElement('input');
        search.className = 's936lib-search';
        search.placeholder = 'Buscar...';
        search.value = searchQuery;
        search.oninput = () => { searchQuery = search.value; renderBodyOnly(); };
        toolbar.appendChild(search);
        toolbar.appendChild(buildPlaylistFilterButton());

        if(activeTab === 'compositions'){
            const btn = el('button', 's936lib-actionbtn', '💾 Guardar composición actual');
            btn.onclick = (e) => { e.stopPropagation(); saveCurrentComposition(btn); };
            toolbar.appendChild(btn);
        } else if(activeTab === 'audios'){
            const btn = el('button', 's936lib-actionbtn', '⬆ Importar MP3/MP4');
            const fileInput = document.createElement('input');
            fileInput.type = 'file'; fileInput.accept = 'audio/*,video/mp4'; fileInput.multiple = true; fileInput.style.display = 'none';
            fileInput.onchange = (e) => importAudioFiles(e.target.files, btn);
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
        if(activeTab === 'youtube'){
            // Cambio 176: YouTube maneja su propio DOM persistente (el
            // embed no debe recrearse en cada tecla del buscador) — no se
            // limpia el body aquí, eso ya lo hace renderYoutube solo
            // cuando de verdad hace falta.
            renderYoutube(body);
            return;
        }
        body.innerHTML = '';
        if(activeTab === 'recent') renderRecent(body);
        else if(activeTab === 'compositions') renderCompositions(body);
        else if(activeTab === 'audios') renderAudios(body);
        else if(activeTab === 'genres') renderGenres(body);
    }

    function render(){
        const panel = document.getElementById(PANEL_ID);
        if(!panel) return;
        closeAnyOpenMenu();
        closeYoutubeAddPopover();
        panel.querySelectorAll('.s936lib-tab').forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === activeTab));
        panel.querySelectorAll('.s936lib-viewbtn').forEach((btn) => btn.classList.toggle('active', btn.dataset.view === viewMode));
        // Cambio 176: en YouTube, Play y Volumen no controlan nada real
        // (el video vive en un iframe aparte, y YouTube ya trae su propio
        // play/pausa y volumen encima del video) — se ocultan para no
        // confundir con botones que no hacen nada.
        const playBtn = panel.querySelector('.s936lib-playbtn');
        const vol = panel.querySelector('.s936lib-vol');
        const isYoutube = activeTab === 'youtube';
        if(playBtn) playBtn.style.display = isYoutube ? 'none' : '';
        if(vol) vol.style.display = isYoutube ? 'none' : '';
        // Cambio 177: el toggle cuadrícula/lista no aplica en YouTube — esa
        // pestaña siempre usa su propio mosaico, no hay elección real ahí.
        const gridBtnEl = panel.querySelector('.s936lib-viewbtn[data-view="grid"]');
        const listBtnEl = panel.querySelector('.s936lib-viewbtn[data-view="list"]');
        if(gridBtnEl) gridBtnEl.style.display = isYoutube ? 'none' : '';
        if(listBtnEl) listBtnEl.style.display = isYoutube ? 'none' : '';
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
        ['audios', 'Audio MP3'],
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
        const minimizeBtn = el('button', 's936lib-winbtn', '—');
        minimizeBtn.title = 'Minimizar a ventana flotante';
        minimizeBtn.onclick = () => setWindowState(windowState === 'mini' ? 'normal' : 'mini');
        const maximizeBtn = el('button', 's936lib-winbtn', '⛶');
        maximizeBtn.title = 'Maximizar';
        maximizeBtn.onclick = () => setWindowState(windowState === 'maximized' ? 'normal' : 'maximized');
        const closeBtn = el('button', 's936lib-closebtn', '✕');
        closeBtn.onclick = close;
        header.append(headerText, gridBtn, listBtn, minimizeBtn, maximizeBtn, closeBtn);

        const tabs = el('div', 's936lib-tabs');
        TABS.forEach(([key, label]) => {
            const btn = el('button', 's936lib-tab', label);
            btn.dataset.tab = key;
            btn.onclick = () => { activeTab = key; activeGenreFilter = null; activePlaylistFilter = null; searchQuery = ''; render(); };
            tabs.appendChild(btn);
        });

        const lcdWrap = el('div', 's936lib-lcdwrap');
        const lcd = el('div', 's936lib-lcd');
        const row1 = el('div', 'row1');
        const nowTitle = el('div', 's936lib-nowtitle', 'Nada sonando');
        const nowTime = el('div', 's936lib-nowtime', '--:-- / --:--');
        row1.append(nowTitle, nowTime);
        const nowSub = el('div', 's936lib-nowsub', 'Elige algo en Audios o Composiciones');
        const eqRow = el('div', 's936lib-eqrow');
        const eqLeft = el('div', 's936lib-eqside left');
        const eqRight = el('div', 's936lib-eqside right');
        const BAR_COUNT = 16;
        for(let i=0;i<BAR_COUNT;i++){
            const leftBar = el('i');
            leftBar.style.background = lerpBarColor(i, BAR_COUNT, false);
            eqLeft.appendChild(leftBar);
            const rightBar = el('i');
            rightBar.style.background = lerpBarColor(i, BAR_COUNT, true);
            eqRight.appendChild(rightBar);
        }
        const eqBrand = el('div', 's936lib-eqbrand', '936 PLAYER');
        eqRow.append(eqLeft, eqBrand, eqRight);
        const progress = el('div', 's936lib-progress');
        progress.appendChild(el('b'));
        lcd.append(row1, nowSub, eqRow, progress);
        lcdWrap.appendChild(lcd);

        const controlRow = el('div', 's936lib-controlrow');
        const prevBtn = el('button', '', '⏮');
        prevBtn.title = 'Antes en la cola';
        prevBtn.onclick = () => { activeTab === 'youtube' ? youtubeListNav(-1) : (queue.length && playNextInQueue()); };
        const playBtn = el('button', 's936lib-playbtn', '⏵');
        playBtn.onclick = togglePlayPause;
        const nextBtn = el('button', '', '⏭');
        nextBtn.title = 'Siguiente en la cola';
        nextBtn.onclick = () => { activeTab === 'youtube' ? youtubeListNav(1) : playNextInQueue(); };
        const toolbar = el('div', 's936lib-toolbar');
        const vol = el('div', 's936lib-vol', '🔊');
        const volSlider = document.createElement('input');
        volSlider.type = 'range'; volSlider.min = '0'; volSlider.max = '100'; volSlider.value = '80';
        volSlider.oninput = () => { if(audioEl) audioEl.volume = volSlider.value/100; };
        vol.appendChild(volSlider);
        controlRow.append(prevBtn, playBtn, nextBtn, toolbar, vol);

        const body = el('div', 's936lib-body');

        panel.append(header, tabs, lcdWrap, controlRow, body);
        enableDrag(panel, header);
        overlay.appendChild(panel);
        overlay.addEventListener('click', (e) => { if(e.target === overlay) close(); });
        document.body.appendChild(overlay);
        return overlay;
    }

    // Cambio 180: tres estados de ventana. "mini" quita el fondo oscuro y
    // el bloqueo de clics del overlay para poder seguir trabajando en
    // Studio 936 de fondo mientras el video/audio sigue sonando — el
    // panel NUNCA se destruye ni se reconstruye al cambiar de estado, solo
    // se redimensiona/reposiciona, así el iframe de YouTube nunca se
    // interrumpe.
    function setWindowState(newState){
        const panel = document.getElementById(PANEL_ID);
        const overlay = document.getElementById(PANEL_ID + 'Overlay');
        if(!panel || !overlay) return;
        panel.classList.remove('s936lib-state-maximized', 's936lib-state-mini');
        overlay.classList.remove('s936lib-state-mini');
        windowState = newState;
        if(newState === 'maximized'){
            panel.classList.add('s936lib-state-maximized');
            panel.style.left = ''; panel.style.top = '';
            // Cambio 182: pantalla completa real del navegador (sin barra
            // de pestañas ni nada) cuando el navegador lo permita — si no,
            // se queda con el "maximizado" normal (100vw/100vh), que
            // sigue funcionando bien de todos modos.
            const request = overlay.requestFullscreen || overlay.webkitRequestFullscreen;
            if(request) request.call(overlay).catch?.(() => {});
        } else if(newState === 'mini'){
            panel.classList.add('s936lib-state-mini');
            overlay.classList.add('s936lib-state-mini');
            const pos = miniPos || { left: window.innerWidth - 380, top: window.innerHeight - 320 };
            panel.style.left = Math.max(8, pos.left) + 'px';
            panel.style.top = Math.max(8, pos.top) + 'px';
            if(document.fullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
        } else {
            panel.style.left = ''; panel.style.top = '';
            if(document.fullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
        }
    }

    document.addEventListener('fullscreenchange', () => {
        if(!document.fullscreenElement && windowState === 'maximized'){
            const panel = document.getElementById(PANEL_ID);
            if(panel){ windowState = 'normal'; panel.classList.remove('s936lib-state-maximized'); }
        }
    });

    function enableDrag(panel, headerEl){
        let dragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;
        headerEl.addEventListener('mousedown', (e) => {
            if(windowState !== 'mini') return;
            if(e.target.closest('button')) return; // no arrastrar al hacer clic en un botón del header
            dragging = true;
            startX = e.clientX; startY = e.clientY;
            const rect = panel.getBoundingClientRect();
            startLeft = rect.left; startTop = rect.top;
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if(!dragging) return;
            const left = startLeft + (e.clientX - startX);
            const top = startTop + (e.clientY - startY);
            panel.style.left = Math.max(4, left) + 'px';
            panel.style.top = Math.max(4, top) + 'px';
        });
        document.addEventListener('mouseup', () => {
            if(!dragging) return;
            dragging = false;
            const rect = panel.getBoundingClientRect();
            miniPos = { left: rect.left, top: rect.top };
        });
    }

    function open(){
        let overlay = document.getElementById(PANEL_ID + 'Overlay');
        if(!overlay) overlay = buildPanel();
        overlay.classList.add('is-open');
        render();
    }
    function close(){
        // Cambio 181: si algo sigue sonando (audio propio o YouTube), la X
        // ya no cierra del todo — pasa a modo mini para que sigas teniendo
        // un control a mano. Solo cierra de verdad cuando no suena nada.
        const somethingPlaying = (audioEl && !audioEl.paused) || isYoutubePlaying;
        if(somethingPlaying && windowState !== 'mini'){
            setWindowState('mini');
            return;
        }
        const overlay = document.getElementById(PANEL_ID + 'Overlay');
        if(overlay) overlay.classList.remove('is-open');
        document.querySelectorAll('.s936lib-menu-floating').forEach((m) => m.remove());
        openMenuEl = null;
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
