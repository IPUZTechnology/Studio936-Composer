// Studio 936 Composer — Librería / "936 Player" (Cambio 215)
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
    // Cambio 219: al entrar al Mini Player se muestra la fuente que de
    // verdad está activa (Rockola, MP3 o Composición), aunque el usuario
    // hubiera navegado a Recientes. Al restaurar vuelve a su pestaña previa.
    let tabBeforeMini = null;
    let viewMode = localStorage.getItem(VIEW_MODE_KEY) === 'list' ? 'list' : 'grid';
    let activeGenreFilter = null;
    let activePlaylistFilter = null;
    let activeAlbumFilter = null; // Cambio 188: solo aplica en la pestaña Composiciones
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
    // Cambio 210 (Fase 2): análisis real de audio — un solo AudioContext y
    // un solo AnalyserNode para TODO el reproductor, conectados una única
    // vez al mismo <audio> que ya existe. Nunca se crea uno nuevo por
    // tarjeta ni por canción — sería carísimo y no es lo que se pidió.
    let s936AudioCtx = null;
    let s936Analyser = null;
    let s936AnalyserSource = null;
    let s936FreqData = null;
    let s936NextHintTimer = null;
    // Cambio 209: estado del LCD contextual — "cargando" y "error" son
    // momentos breves detectados por eventos reales del <audio>, nunca
    // inventados.
    let lcdLoading = false;
    let lcdError = false;

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

    // Cambio 212: solo para PRESENTACIÓN — nunca modifica song.title en el
    // store ni el archivo. Quita prefijos de número de pista comunes
    // ("02 ", "02. ", "02 - ", "02) ") del principio del título mostrado.
    function displayAudioTitle(title){
        return String(title || '').replace(/^\s*\d{1,3}\s*[.\-\)]?\s+/, '') || title || '';
    }

    // Cambio 200: reemplaza confirm()/alert() nativos del navegador (se
    // veían pegados arriba, con el nombre del sitio, fuera del look de la
    // app) por un modal propio, con el mismo estilo suave del resto del
    // 936 Player. Ambos devuelven una Promesa — se usan con "await".
    function s936ModalBase(message, buttons){
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(10,13,14,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:16px;';
            const modal = document.createElement('div');
            modal.style.cssText = 'background:linear-gradient(180deg,#161b1d,#0d1112);border:1px solid rgba(91,232,201,.25);border-radius:16px;width:100%;max-width:380px;padding:20px;box-shadow:0 24px 70px rgba(0,0,0,.55), 0 0 30px rgba(0,255,204,.04);';
            const text = document.createElement('div');
            text.textContent = message;
            text.style.cssText = 'color:#e8f4f2;font-size:.84rem;line-height:1.5;margin-bottom:18px;white-space:pre-line;';
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;';
            const finish = (result) => { overlay.remove(); resolve(result); };
            buttons.forEach(({label, value, primary}) => {
                const btn = document.createElement('button');
                btn.textContent = label;
                btn.style.cssText = primary
                    ? 'background:rgba(0,255,204,.12);border:1px solid #00ffcc;color:#00ffcc;border-radius:8px;padding:8px 16px;font-size:.76rem;font-weight:700;cursor:pointer;'
                    : 'background:transparent;border:1px solid rgba(255,255,255,.15);color:#9fb0ae;border-radius:8px;padding:8px 16px;font-size:.76rem;font-weight:700;cursor:pointer;';
                btn.onclick = () => finish(value);
                row.appendChild(btn);
            });
            overlay.onclick = (e) => { if(e.target === overlay) finish(false); };
            modal.append(text, row);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
        });
    }
    function s936Confirm(message){
        return s936ModalBase(message, [
            { label:'Cancelar', value:false, primary:false },
            { label:'Confirmar', value:true, primary:true }
        ]);
    }
    function s936Alert(message){
        return s936ModalBase(message, [{ label:'Entendido', value:true, primary:true }]);
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
    // Cambio 215: estado REAL del motor YouTube. El LCD y el transporte
    // dejan de depender de la pestaña visible o del último botón pulsado.
    let youtubeStatus = 'idle'; // idle | loading | playing | paused | ended | error
    let ytClockTimer = null;
    // Cambio 219: vigilancia ligera del estado real de YouTube. Algunos
    // embeds pueden empezar a reproducir sin que el último callback deje
    // actualizado el LCD; este único timer reconcilia PLAYING/BUFFERING/
    // PAUSED para que nunca quede "CARGANDO" mientras el video ya suena.
    let ytStateWatchTimer = null;
    let playerVolume = 80;
    // Cambio 212: cuál fue la última fuente que arrancó de verdad — sin
    // esto, si dejas un MP3 pausado (con audioEl.src aún puesto) y luego
    // reproduces YouTube, el LCD seguía pensando que el MP3 era lo activo.
    let lastActiveSource = null; // 'local' | 'youtube'

    // Cambio 216: una pista local puede seguir seleccionada y conservar su
    // posición aunque YouTube haya tomado el control. Eso NO significa que
    // siga sonando. Esta función separa el ítem recordado del estado real.
    function isLocalAudioActuallyPlaying(id){
        return !!(
            lastActiveSource === 'local' &&
            currentPlayingId === id &&
            !currentPlayingComp &&
            audioEl && audioEl.src &&
            !audioEl.paused && !audioEl.ended
        );
    }

    // Mantiene las filas/tarjetas MP3 visibles sincronizadas sin reconstruir
    // toda la pestaña ni perder el scroll. Al iniciar Rockola, el antiguo MP3
    // deja inmediatamente de verse como activo o con botón de pausa.
    function syncVisibleAudioPlaybackState(){
        const panel = document.getElementById(PANEL_ID);
        if(!panel) return;
        panel.querySelectorAll('[data-s936-audio-id]').forEach((node) => {
            const id = node.dataset.s936AudioId;
            const playing = isLocalAudioActuallyPlaying(id);
            node.classList.toggle('active', playing && node.classList.contains('s936lib-ytcard'));
            node.classList.toggle('playing', playing && node.classList.contains('s936lib-list-row'));
            const thumb = node.querySelector('.s936sc-wrap');
            if(thumb) thumb.classList.toggle('is-active', playing);
            const btn = node.querySelector('.s936lib-mini.play');
            if(btn){
                btn.textContent = node.classList.contains('s936lib-ytcard')
                    ? (playing ? '⏸ Sonando' : '▶ Play')
                    : (playing ? '⏸' : '▶');
            }
        });
    }

    function currentLocalLcdMeta(){
        if(currentPlayingComp){
            const comp = store?.compositions?.find(x => x.id === currentPlayingComp);
            if(comp){
                const albumName = getAlbum(comp.albumId)?.name || '';
                return { title: comp.title || 'Composición', sub: comp.author || albumName || '' };
            }
        }
        const song = currentPlayingId ? store?.audios?.find(x => x.id === currentPlayingId) : null;
        if(!song) return null;
        const linkedComp = audioLinkedComposition(song.id);
        const albumName = linkedComp ? (getAlbum(linkedComp.albumId)?.name || '') : '';
        return {
            title: displayAudioTitle(song.title),
            sub: song.author || linkedComp?.author || albumName || ''
        };
    }
    function startYoutubeClock(){
        stopYoutubeClock();
        ytClockTimer = setInterval(updateLcd, 500);
    }
    function stopYoutubeClock(){
        if(ytClockTimer){ clearInterval(ytClockTimer); ytClockTimer = null; }
    }
    function stopYoutubeStateWatch(){
        if(ytStateWatchTimer){ clearInterval(ytStateWatchTimer); ytStateWatchTimer = null; }
    }
    function startYoutubeStateWatch(){
        stopYoutubeStateWatch();
        ytStateWatchTimer = setInterval(() => {
            if(!ytPlayer || !window.YT || typeof ytPlayer.getPlayerState !== 'function') return;
            let realState;
            try { realState = ytPlayer.getPlayerState(); } catch(_) { return; }
            const expected = realState === window.YT.PlayerState.PLAYING ? 'playing'
                : realState === window.YT.PlayerState.BUFFERING ? 'loading'
                : realState === window.YT.PlayerState.PAUSED ? 'paused'
                : realState === window.YT.PlayerState.ENDED ? 'ended'
                : (realState === window.YT.PlayerState.CUED || realState === window.YT.PlayerState.UNSTARTED)
                    ? (currentYoutubeId ? 'paused' : 'idle')
                    : youtubeStatus;
            if(expected !== youtubeStatus || (expected === 'playing' && !isYoutubePlaying)){
                handleYtStateChange({ data: realState });
            } else if(expected === 'playing' && !ytClockTimer){
                // Asegura que tiempo y progreso sigan vivos incluso si un
                // callback anterior detuvo temporalmente el reloj.
                startYoutubeClock();
            }
        }, 700);
    }
    function handleYtStateChange(event){
        if(!window.YT) return;
        const state = event.data;
        if(state === window.YT.PlayerState.PLAYING){
            isYoutubePlaying = true;
            youtubeStatus = 'playing';
            lastActiveSource = 'youtube';
            // Sonido exclusivo: YouTube toma el control y pausa el motor local.
            if(audioEl && !audioEl.paused) audioEl.pause();
            startEqAnimation();
            startYoutubeClock();
        } else if(state === window.YT.PlayerState.BUFFERING){
            isYoutubePlaying = false;
            youtubeStatus = 'loading';
            stopEqAnimation();
            stopYoutubeClock();
        } else if(state === window.YT.PlayerState.PAUSED){
            isYoutubePlaying = false;
            youtubeStatus = 'paused';
            stopEqAnimation();
            stopYoutubeClock();
        } else if(state === window.YT.PlayerState.ENDED){
            isYoutubePlaying = false;
            youtubeStatus = 'ended';
            stopEqAnimation();
            stopYoutubeClock();
        } else if(state === window.YT.PlayerState.CUED || state === window.YT.PlayerState.UNSTARTED){
            isYoutubePlaying = false;
            youtubeStatus = currentYoutubeId ? 'paused' : 'idle';
            stopEqAnimation();
            stopYoutubeClock();
        }
        syncVisibleAudioPlaybackState();
        updateLcd();
        renderTransportState();
    }
    function handleYtError(){
        isYoutubePlaying = false;
        youtubeStatus = 'error';
        stopEqAnimation();
        stopYoutubeClock();
        syncVisibleAudioPlaybackState();
        updateLcd();
        renderTransportState();
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
    // Cambio 188: modelo "Álbum" tipo Spotify — el compositor (Val) saca
    // álbumes uno tras otro, trabaja en UNO activo a la vez ("álbum de
    // trabajo"), cada álbum tiene su propia carátula diseñada por él.
    // Es DISTINTO de .playlists (muchos-a-muchos, libre): una composición
    // pertenece a UN álbum a la vez (o a ninguno), como un lanzamiento real.
    function emptyStore(){ return { compositions:[], audios:[], youtube:[], radio:[], albums:[], activeAlbumId:null }; }

    // Cambio 186: cada ítem ahora también tiene .playlists (array de
    // nombres) — muchos-a-muchos, distinto de .genre (un solo valor,
    // musical). Esta función asegura que TODO ítem existente tenga el
    // campo, sin importar si vino de antes de este cambio.
    function ensurePlaylistsField(list){
        (list || []).forEach((item) => { if(!Array.isArray(item.playlists)) item.playlists = []; });
    }

    // Cambio 188: toda composición existente (guardada antes de que
    // existiera el concepto de álbum) queda con albumId=null — "Sin álbum",
    // no se le inventa uno.
    function ensureAlbumIdField(list){
        (list || []).forEach((item) => { if(item.albumId === undefined) item.albumId = null; });
    }

    function loadStore(){
        try {
            const raw = localStorage.getItem(STORE_KEY);
            const parsed = raw ? JSON.parse(raw) : null;
            const s = parsed && typeof parsed === 'object' ? parsed : emptyStore();
            s.compositions = Array.isArray(s.compositions) ? s.compositions : [];
            s.audios = Array.isArray(s.audios) ? s.audios : [];
            s.youtube = Array.isArray(s.youtube) ? s.youtube : [];
            s.radio = Array.isArray(s.radio) ? s.radio : [];
            s.albums = Array.isArray(s.albums) ? s.albums : [];
            s.activeAlbumId = s.activeAlbumId || null;
            ensurePlaylistsField(s.compositions);
            ensurePlaylistsField(s.audios);
            ensurePlaylistsField(s.youtube);
            ensurePlaylistsField(s.radio);
            ensureAlbumIdField(s.compositions);
            return s;
        } catch(_) { return emptyStore(); }
    }

    function saveStore(){
        try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch(_) {}
    }

    function allPlaylists(){
        const set = new Set();
        [...store.compositions, ...store.audios, ...store.youtube, ...store.radio].forEach((item) => {
            (item.playlists || []).forEach((p) => { if(p) set.add(p); });
        });
        return Array.from(set).sort((a,b)=>a.localeCompare(b));
    }

    // Cambio 203: listas usadas SOLO por un tipo de ítem (ej. solo tus MP3)
    // — para que el filtro de Audio MP3 no mezcle listas creadas desde
    // Mini Rockola o Composiciones.
    function playlistsUsedBy(list){
        const set = new Set();
        (list || []).forEach((item) => { (item.playlists || []).forEach((p) => { if(p) set.add(p); }); });
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
    // Álbumes (Cambio 188)
    // ---------------------------------------------------------------
    function allAlbums(){ return store.albums; }
    function getAlbum(id){ return id ? store.albums.find(a => a.id === id) || null : null; }
    function getActiveAlbum(){ return getAlbum(store.activeAlbumId); }

    // Comprime cualquier imagen que subas a un tamaño razonable antes de
    // guardarla como texto (data URL) en localStorage — una carátula sin
    // comprimir podría pesar varios MB y comerse la cuota de espacio ella
    // sola. 480px de lado más largo + JPEG calidad .82 da un buen balance.
    function resizeImageToDataUrl(file, maxDim, cb){
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                let w = img.width, h = img.height;
                if(w > h && w > maxDim){ h = Math.round(h * maxDim / w); w = maxDim; }
                else if(h > maxDim){ w = Math.round(w * maxDim / h); h = maxDim; }
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                try { cb(canvas.toDataURL('image/jpeg', 0.82)); }
                catch(_) { cb(null); }
            };
            img.onerror = () => cb(null);
            img.src = reader.result;
        };
        reader.onerror = () => cb(null);
        reader.readAsDataURL(file);
    }

    // Cambio 189: la carátula del álbum puede ser un video corto (loop),
    // no solo una foto. Igual que TODO lo demás que se importa/graba hoy
    // en la app, el video vive como blob: en memoria — se pierde al cerrar
    // la pestaña, hasta que exista storage real (carpeta/nube). La FOTO sí
    // persiste (queda comprimida como texto en localStorage).
    let albumVideoURLs = {};

    function createAlbum(name, coverFile, cb){
        const album = { id: uid('al'), name: name || 'Álbum sin nombre', cover: null, createdAt: Date.now() };
        const finish = () => {
            store.albums.unshift(album);
            store.activeAlbumId = album.id;
            saveStore();
            if(cb) cb(album);
        };
        if(coverFile && coverFile.type.startsWith('video/')){
            albumVideoURLs[album.id] = URL.createObjectURL(coverFile);
            finish();
        } else if(coverFile){
            resizeImageToDataUrl(coverFile, 480, (cover) => { album.cover = cover || null; finish(); });
        } else {
            finish();
        }
    }

    function setActiveAlbum(id){ store.activeAlbumId = id || null; saveStore(); render(); }

    function renameAlbum(id, name){
        const a = getAlbum(id);
        if(!a || !name || !name.trim()) return;
        a.name = name.trim();
        saveStore();
    }

    function updateAlbumCover(id, coverFile, cb){
        const a = getAlbum(id);
        if(!a || !coverFile) return;
        if(coverFile.type.startsWith('video/')){
            albumVideoURLs[id] = URL.createObjectURL(coverFile);
            saveStore();
            if(cb) cb();
            return;
        }
        resizeImageToDataUrl(coverFile, 480, (cover) => {
            if(cover){ a.cover = cover; delete albumVideoURLs[id]; saveStore(); }
            if(cb) cb();
        });
    }

    async function deleteAlbum(id){
        const a = getAlbum(id);
        if(!a) return;
        if(!await s936Confirm('¿Borrar el álbum "' + a.name + '"? Las composiciones que estaban ahí quedan sin álbum (no se borran).')) return;
        store.albums = store.albums.filter(x => x.id !== id);
        store.compositions.forEach((c) => { if(c.albumId === id) c.albumId = null; });
        if(store.activeAlbumId === id) store.activeAlbumId = null;
        delete albumVideoURLs[id];
        saveStore();
        render();
    }

    function moveCompositionToAlbum(compId, albumId){
        const item = store.compositions.find(x => x.id === compId);
        if(!item) return;
        item.albumId = albumId || null;
        saveStore();
        render();
    }

    // Cambio 189: si el álbum tiene un video de carátula cargado en esta
    // misma sesión, tiene prioridad sobre la foto fija.
    function albumVideoUrl(albumId){ return albumId ? (albumVideoURLs[albumId] || null) : null; }

    function compositionCoverUrl(item){
        const album = getAlbum(item.albumId);
        return album && album.cover ? album.cover : null;
    }

    // ---------------------------------------------------------------
    // Recientes
    // ---------------------------------------------------------------
    function recentItems(limit){
        const all = [
            ...store.compositions.map(x => ({ type:'compositions', sortDate:x.updated||0, item:x })),
            ...store.audios.map(x => ({ type:'audios', sortDate:x.addedAt||0, item:x })),
            ...store.youtube.map(x => ({ type:'youtube', sortDate:x.addedAt||0, item:x })),
            ...store.radio.map(x => ({ type:'radio', sortDate:x.addedAt||0, item:x }))
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
/* Cambio 187: el panel en estado normal ya no tiene una altura fija de
   720px siempre — ahora crece hacia abajo con el contenido real (menos
   ítems = ventana más compacta) hasta un tope de min(720px,93vh); pasado
   ese tope, deja de crecer y el cuerpo (.s936lib-body) es lo único que
   hace scroll interno. min-height evita que se vea demasiado angosta
   con listas muy cortas o vacías. */
#${PANEL_ID} { width:min(1000px,96vw); height:auto; min-height:420px; max-height:min(720px,93vh); background:linear-gradient(180deg,#14181a,#0a0d0e); border:1px solid rgba(91,232,201,.3); border-radius:18px; box-shadow:0 30px 90px rgba(0,0,0,.7), 0 0 40px rgba(0,255,204,.05); display:flex; flex-direction:column; overflow:hidden; font-family:inherit; color:#e8f4f2; }
/* Cambio 217: maximizado REAL dentro de la ventana de la app.
   Antes el panel seguía limitado por max-height:720px y el overlay lo
   centraba, por eso quedaban grandes franjas negras arriba y abajo. */
#${PANEL_ID}Overlay.s936lib-state-maximized {
    background:#0a0d0e;
    align-items:stretch;
    justify-content:stretch;
}
#${PANEL_ID}.s936lib-state-maximized {
    position:fixed;
    inset:0;
    width:100vw;
    height:100vh;
    height:100dvh;
    min-height:0;
    max-height:none;
    max-width:none;
    margin:0;
    border:0;
    border-radius:0;
    box-shadow:none;
}
/* Cambio 218: maximizado = Modo Práctica.
   La ventana completa deja de comportarse como biblioteca ampliada:
   quedan únicamente encabezado, LCD, transporte/buscador y el contenido
   multimedia. Las pestañas, vistas y listas permanentes desaparecen. */
#${PANEL_ID}.s936lib-state-maximized .s936lib-header { padding:6px 14px; flex:0 0 auto; }
#${PANEL_ID}.s936lib-state-maximized .s936lib-viewbtn,
#${PANEL_ID}.s936lib-state-maximized .s936lib-tabs { display:none !important; }
#${PANEL_ID}.s936lib-state-maximized .s936lib-lcdwrap { padding:4px 12px 0; flex:0 0 auto; }
#${PANEL_ID}.s936lib-state-maximized .s936lib-lcd { padding:4px 11px; }
#${PANEL_ID}.s936lib-state-maximized .s936lib-nowtitle { font-size:.78rem; }
#${PANEL_ID}.s936lib-state-maximized .s936lib-eqrow { margin-top:3px; padding-bottom:3px; gap:8px; }
#${PANEL_ID}.s936lib-state-maximized .s936lib-eqbrand { display:block; font-size:.66rem; letter-spacing:2.4px; }
#${PANEL_ID}.s936lib-state-maximized .s936lib-eqside { height:12px; gap:1px; }
#${PANEL_ID}.s936lib-state-maximized .s936lib-eqside i { width:3px; }
#${PANEL_ID}.s936lib-state-maximized .s936lib-progress { margin-top:3px; height:12px; }
#${PANEL_ID}.s936lib-state-maximized .s936lib-controlrow { padding:5px 12px; flex:0 0 auto; }
#${PANEL_ID}.s936lib-state-maximized .s936lib-body {
    flex:1 1 auto;
    min-height:0;
    max-height:none;
    overflow:hidden;
}

/* Mini Rockola maximizada: el iframe llena TODO el espacio disponible.
   La lista de videos no ocupa una franja permanente. */
#${PANEL_ID}.s936lib-state-maximized.s936lib-active-youtube .s936lib-body {
    position:relative;
    display:block;
    padding:0;
    overflow:hidden;
    background:#000;
}
#${PANEL_ID}.s936lib-state-maximized.s936lib-active-youtube #s936lib-yt-embed-slot {
    position:absolute;
    inset:0;
    width:100%;
    height:100%;
    min-height:0;
    margin:0;
}
#${PANEL_ID}.s936lib-state-maximized.s936lib-active-youtube .s936lib-ytembed {
    width:100%;
    height:100%;
    max-height:none;
    aspect-ratio:auto;
    margin:0;
    border:0;
    border-radius:0;
    background:#000;
}
#${PANEL_ID}.s936lib-state-maximized.s936lib-active-youtube .s936lib-ytembed iframe {
    width:100%;
    height:100%;
    border-radius:0;
}
#${PANEL_ID}.s936lib-state-maximized.s936lib-active-youtube #s936lib-yt-list-slot {
    display:none;
}

/* En Modo Práctica solo queda visible el buscador de la toolbar.
   Filtro de listas y botón + siguen disponibles al restaurar la ventana
   mediana, pero no ocupan espacio sobre el video maximizado. */
#${PANEL_ID}.s936lib-state-maximized.s936lib-active-youtube .s936lib-toolbar > .s936lib-iconbtn {
    display:none !important;
}

/* Mientras el usuario escribe, los resultados aparecen como una bandeja
   TEMPORAL superpuesta al video. No reducen su tamaño y desaparecen al
   seleccionar un resultado o limpiar la búsqueda. */
#${PANEL_ID}.s936lib-state-maximized.s936lib-active-youtube.s936lib-max-search-open #s936lib-yt-list-slot {
    display:block;
    position:absolute;
    z-index:8;
    top:12px;
    left:50%;
    transform:translateX(-50%);
    width:min(1100px, calc(100% - 32px));
    max-height:min(48vh, 520px);
    overflow:auto;
    padding:12px;
    border:1px solid rgba(91,232,201,.28);
    border-radius:14px;
    background:rgba(10,15,16,.94);
    box-shadow:0 18px 55px rgba(0,0,0,.58), 0 0 30px rgba(0,255,204,.06);
    backdrop-filter:blur(12px);
    -webkit-backdrop-filter:blur(12px);
}
#${PANEL_ID}.s936lib-state-maximized.s936lib-active-youtube.s936lib-max-search-open #s936lib-yt-list-slot .s936lib-ytgrid {
    display:grid;
    grid-template-columns:repeat(auto-fill,minmax(220px,1fr));
    gap:10px;
}
#${PANEL_ID}.s936lib-state-maximized.s936lib-active-youtube.s936lib-max-search-open #s936lib-yt-list-slot .s936lib-ytcard {
    min-width:0;
}
/* Cambio 219: Mini Player común para Rockola, MP3 y Composiciones.
   Importante: estas reglas NO modifican el Modo Práctica maximizado. */
#${PANEL_ID}Overlay.s936lib-state-mini { z-index:2147483000; }
#${PANEL_ID}.s936lib-state-mini {
    position:fixed;
    z-index:2147483001;
    width:320px;
    height:auto;
    min-height:0;
    max-height:calc(100dvh - 16px);
    pointer-events:auto;
    border-radius:14px;
    box-shadow:0 20px 50px rgba(0,0,0,.68), 0 0 30px rgba(0,255,204,.15);
}
#${PANEL_ID}.s936lib-state-mini .s936lib-tabs,
#${PANEL_ID}.s936lib-state-mini .s936lib-toolbar,
#${PANEL_ID}.s936lib-state-mini #s936lib-yt-list-slot,
#${PANEL_ID}.s936lib-state-mini .s936lib-viewbtn { display:none !important; }

/* Encabezado compacto: LIBRERÍA MÚSICA, sin repetir 936 PLAYER. */
#${PANEL_ID}.s936lib-state-mini .s936lib-header {
    cursor:grab;
    padding:6px 9px;
    flex:0 0 auto;
    gap:6px;
}
#${PANEL_ID}.s936lib-state-mini .s936lib-header:active { cursor:grabbing; }
#${PANEL_ID}.s936lib-state-mini .s936lib-headertext { gap:5px; align-items:center; min-width:0; }
#${PANEL_ID}.s936lib-state-mini .s936lib-eyebrow { font-size:.48rem; letter-spacing:1.1px; }
#${PANEL_ID}.s936lib-state-mini .s936lib-header h2 { font-size:.72rem; letter-spacing:1px; }
#${PANEL_ID}.s936lib-state-mini .s936lib-winbtn,
#${PANEL_ID}.s936lib-state-mini .s936lib-closebtn { padding:3px 6px; }

/* LCD mini: estado/título separados del mixer. La marca vuelve al centro
   como 936 + STUDIO 936, tal como se definió para el mini. */
#${PANEL_ID}.s936lib-state-mini .s936lib-lcdwrap { padding:5px 8px 0; flex:0 0 auto; }
#${PANEL_ID}.s936lib-state-mini .s936lib-lcd { padding:6px 8px 4px; }
#${PANEL_ID}.s936lib-state-mini .s936lib-lcdstatus { font-size:.54rem; letter-spacing:.25px; }
#${PANEL_ID}.s936lib-state-mini .s936lib-nowtitle { font-size:.72rem; margin-top:2px; }
#${PANEL_ID}.s936lib-state-mini .s936lib-nowtime { font-size:.58rem; }
#${PANEL_ID}.s936lib-state-mini .s936lib-nowsub { display:none !important; }
#${PANEL_ID}.s936lib-state-mini .s936lib-eqrow {
    margin-top:7px;
    padding-bottom:4px;
    gap:5px;
    min-height:18px;
}
#${PANEL_ID}.s936lib-state-mini .s936lib-eqbrand {
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    min-width:43px;
    font-size:.62rem;
    line-height:1;
    letter-spacing:2.2px;
    opacity:.9;
}
#${PANEL_ID}.s936lib-state-mini .s936lib-eqbrand::after {
    content:'STUDIO 936';
    margin-top:2px;
    font-size:.36rem;
    font-weight:700;
    letter-spacing:.55px;
    color:#9fb0ae;
    text-shadow:none;
    opacity:.8;
}
#${PANEL_ID}.s936lib-state-mini .s936lib-eqside { height:13px; gap:1px; }
#${PANEL_ID}.s936lib-state-mini .s936lib-eqside i { width:3px; }

/* Barra visualmente fina, pero con área de interacción cómoda. */
#${PANEL_ID}.s936lib-state-mini .s936lib-progress { height:10px; margin-top:2px; }
#${PANEL_ID}.s936lib-state-mini .s936lib-progress::before,
#${PANEL_ID}.s936lib-state-mini .s936lib-progress b { height:3px; }
#${PANEL_ID}.s936lib-state-mini .s936lib-progress b { box-shadow:0 0 3px rgba(0,255,204,.45); }
#${PANEL_ID}.s936lib-state-mini .s936lib-progress b::after { width:7px; height:7px; right:-3px; }

/* Transporte mínimo: anterior, play/pausa, siguiente y volumen. */
#${PANEL_ID}.s936lib-state-mini .s936lib-controlrow {
    padding:5px 8px;
    gap:6px;
    flex:0 0 auto;
}
#${PANEL_ID}.s936lib-state-mini .s936lib-controlrow > button {
    width:25px;
    height:23px;
    font-size:.66rem;
    border-radius:7px;
}
#${PANEL_ID}.s936lib-state-mini .s936lib-controlrow > button.s936lib-playbtn { width:42px; }
#${PANEL_ID}.s936lib-state-mini .s936lib-vol { margin-left:auto; }

/* El cuerpo deja de heredar la altura mínima de la biblioteca. Termina
   exactamente donde termina el video o la carátula. */
#${PANEL_ID}.s936lib-state-mini .s936lib-body {
    flex:0 0 auto;
    width:100%;
    height:auto;
    min-height:0;
    max-height:none;
    padding:0;
    overflow:hidden;
}
#${PANEL_ID}.s936lib-state-mini .s936lib-body > *:not(.s936lib-mini-keep) { display:none !important; }
#${PANEL_ID}.s936lib-state-mini #s936lib-yt-embed-slot {
    width:100%;
    height:auto;
    min-height:0;
    margin:0;
}
#${PANEL_ID}.s936lib-state-mini .s936lib-ytembed,
#${PANEL_ID}.s936lib-state-mini .s936lib-compvisual {
    width:100%;
    height:auto;
    aspect-ratio:16/9;
    max-height:none;
    margin:0;
    border:0;
    border-radius:0 0 13px 13px;
    overflow:hidden;
}
#${PANEL_ID}.s936lib-state-mini .s936lib-ytembed iframe { border-radius:0 0 13px 13px; }
#${PANEL_ID}.s936lib-state-mini .s936lib-compvisual-media { object-fit:contain; background:#000; }
#${PANEL_ID}.s936lib-state-mini .s936lib-compvisual-hint { font-size:.66rem; }
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
#${PANEL_ID} .s936lib-lcd {
    background:
        radial-gradient(circle at 50% 100%, rgba(0,230,195,.08), transparent 55%),
        linear-gradient(180deg, #020b09 0%, #001410 100%);
    border:1px solid rgba(0,255,204,.35);
    border-radius:10px;
    padding:7px 14px;
    box-shadow: inset 0 0 22px rgba(0,230,195,.05), inset 0 1px 0 rgba(255,255,255,.035);
}
#${PANEL_ID} .s936lib-lcd .row1 { display:flex; justify-content:space-between; align-items:baseline; gap:10px; }
#${PANEL_ID} .s936lib-lcdstatus { font-size:.62rem; font-weight:800; letter-spacing:.5px; color:#5be8c9; opacity:.85; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
#${PANEL_ID} .s936lib-nowtitle { font-size:.92rem; font-weight:800; color:#00ffcc; text-shadow:0 0 10px rgba(0,255,204,.5); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px; }
#${PANEL_ID} .s936lib-nowtime { font-family:monospace; color:#5be8c9; font-size:.76rem; flex-shrink:0; }
#${PANEL_ID} .s936lib-nowsub { color:#9fb0ae; font-size:.66rem; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
#${PANEL_ID} .s936lib-eqrow { display:flex; align-items:center; justify-content:center; gap:14px; margin-top:6px; padding-bottom:6px; border-bottom:1px solid rgba(0,255,204,.12); }
#${PANEL_ID} .s936lib-eqside { display:flex; gap:3px; align-items:flex-end; height:24px; flex:1; min-width:0; justify-content:center; }
#${PANEL_ID} .s936lib-eqside.left { justify-content:flex-end; }
#${PANEL_ID} .s936lib-eqside.right { justify-content:flex-start; }
#${PANEL_ID} .s936lib-eqside i { flex:0 0 auto; width:6px; border-radius:2px; height:3px; display:block; transition:height .3s ease; }
/* Cambio 209: marca central reducida a "936" chico — deja de competir con
   el título mientras suena algo (el "936 PLAYER" grande solo aparece como
   título cuando el reproductor está inactivo). */
#${PANEL_ID} .s936lib-eqbrand { font-size:.72rem; font-weight:900; letter-spacing:3px; color:#5be8c9; text-shadow:0 0 10px rgba(0,255,204,.45); white-space:nowrap; flex-shrink:0; text-align:center; opacity:.75; }
/* Cambio 209: barra de progreso funcional — más delgada visualmente pero
   con una zona de clic/arrastre bastante más grande (padding transparente
   arriba y abajo), como pide la especificación. */
#${PANEL_ID} .s936lib-progress { position:relative; height:16px; margin-top:10px; cursor:pointer; }
#${PANEL_ID} .s936lib-progress::before { content:''; position:absolute; left:0; right:0; top:50%; height:5px; transform:translateY(-50%); background:#111; border-radius:3px; }
#${PANEL_ID} .s936lib-progress b { position:absolute; left:0; top:50%; transform:translateY(-50%); display:block; height:5px; width:0%; background:#00ffcc; box-shadow:0 0 4px rgba(0,255,204,.65); border-radius:3px; transition:width .2s linear; pointer-events:none; }
#${PANEL_ID} .s936lib-progress b::after { content:''; position:absolute; right:-4px; top:50%; width:9px; height:9px; border-radius:50%; background:#00ffcc; transform:translateY(-50%); box-shadow:0 0 6px rgba(0,255,204,.7); opacity:0; transition:opacity .15s ease; }
#${PANEL_ID} .s936lib-progress:hover b::after, #${PANEL_ID} .s936lib-progress.is-dragging b::after { opacity:1; }

/* Estados del LCD (Cambio 209) — idle: respiración lenta; cargando: pulso
   horizontal; pausado: ecualizador congelado; error: sin animación. */
#${PANEL_ID} .s936lib-lcd.is-idle .s936lib-eqbrand { animation:s936LcdBreathe 3.2s ease-in-out infinite; }
#${PANEL_ID} .s936lib-lcd.is-loading .s936lib-eqrow { animation:s936LcdLoadingPulse 1.2s ease-in-out infinite; }
#${PANEL_ID} .s936lib-lcd.is-paused .s936lib-eqside i { height:3px !important; }
#${PANEL_ID} .s936lib-lcd.is-error .s936lib-nowtitle { color:#ff8a8a; text-shadow:none; }
#${PANEL_ID} .s936lib-lcd.is-error .s936lib-lcdstatus { color:#ff8a8a; }
@keyframes s936LcdBreathe { 0%, 100% { opacity:.5; } 50% { opacity:.95; } }
@keyframes s936LcdLoadingPulse { 0%, 100% { opacity:.5; } 50% { opacity:1; } }
@media (prefers-reduced-motion: reduce) {
  #${PANEL_ID} .s936lib-lcd.is-idle .s936lib-eqbrand,
  #${PANEL_ID} .s936lib-lcd.is-loading .s936lib-eqrow { animation:none; }
}

#${PANEL_ID} .s936lib-controlrow { display:flex; align-items:center; gap:10px; padding:10px 18px; border-bottom:1px solid rgba(255,255,255,.06); }
#${PANEL_ID} .s936lib-controlrow > button { background:#1c2224; border:1px solid #333; color:#e8f4f2; border-radius:10px; width:34px; height:32px; cursor:pointer; font-size:.9rem; flex-shrink:0; }
#${PANEL_ID} .s936lib-controlrow > button.s936lib-playbtn { background:#00ffcc; color:#04342c; border-color:#00ffcc; width:44px; box-shadow:0 0 14px rgba(0,255,204,.35); }
#${PANEL_ID} .s936lib-vol { margin-left:auto; display:flex; align-items:center; gap:6px; color:#9fb0ae; font-size:.72rem; }
#${PANEL_ID} .s936lib-volicon { cursor:pointer; font-size:.95rem; padding:4px; }
#${PANEL_ID} .s936lib-vol input[type=range] { accent-color:#00ffcc; width:0; opacity:0; overflow:hidden; transition:width .15s ease, opacity .15s ease; }
#${PANEL_ID} .s936lib-vol.open input[type=range] { width:80px; opacity:1; }

#${PANEL_ID} .s936lib-toolbar { display:flex; gap:8px; align-items:center; flex-wrap:wrap; flex:1; min-width:0; }
#${PANEL_ID} .s936lib-search { flex:1; min-width:160px; background:#1c2224; border:1px solid #333; border-radius:8px; padding:7px 10px; color:#e8f4f2; font-size:.8rem; }
#${PANEL_ID} .s936lib-actionbtn { background:rgba(0,255,204,.12); border:1px solid #00ffcc; color:#00ffcc; border-radius:8px; padding:7px 12px; font-size:.76rem; font-weight:700; cursor:pointer; white-space:nowrap; }

#${PANEL_ID} .s936lib-body { flex:1; min-height:0; overflow-y:auto; padding:14px 18px; scrollbar-width:thin; scrollbar-color:rgba(0,255,204,.35) transparent; }
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

.s936lib-linkaudio-list { display:flex; flex-direction:column; gap:4px; max-height:180px; overflow-y:auto; }
.s936lib-linkaudio-row { text-align:left; background:#1c2224; border:1px solid #333; color:#e8f4f2; border-radius:8px; padding:7px 10px; font-size:.76rem; cursor:pointer; }
.s936lib-linkaudio-row:hover { border-color:#00ffcc; color:#00ffcc; }

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
#${PANEL_ID} #s936lib-yt-embed-slot.s936-yt-hidden { position:absolute; width:640px; height:360px; overflow:hidden; margin:0; pointer-events:none; top:0; left:-10000px; opacity:.001; }
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

/* Cambio 208: "936 Sonic Cover" — carátula generada para canciones sin
   foto/video. Estática por defecto (sin costo de CPU); solo la que está
   sonando de verdad (.is-active) anima su espectro/anillos/núcleo y
   muestra el anillo de progreso. El hover es puramente CSS. Respeta
   prefers-reduced-motion. */
#${PANEL_ID} .s936sc-wrap { background:#071512; display:flex; align-items:center; justify-content:center; }
#${PANEL_ID} .s936sc-svg { width:100%; height:100%; display:block; }
#${PANEL_ID} .s936sc-core { transition:filter .4s ease; }
#${PANEL_ID} .s936sc-wrap:hover .s936sc-core { filter:drop-shadow(0 0 4px rgba(0,230,195,.55)); }
#${PANEL_ID} .s936sc-bar { opacity:.35; transform-box:fill-box; transform-origin:center; }
#${PANEL_ID} .s936sc-progressring { opacity:0; transition:opacity .3s ease; }
#${PANEL_ID} .s936sc-wrap.is-active .s936sc-progressring { opacity:1; }
#${PANEL_ID} .s936sc-wrap.is-active .s936sc-bar { opacity:.85; animation:s936ScBars 1.1s ease-in-out infinite; }
#${PANEL_ID} .s936sc-wrap.is-active .s936sc-ring { animation:s936ScRingPulse 2.4s ease-in-out infinite; }
#${PANEL_ID} .s936sc-wrap.is-active .s936sc-core { animation:s936ScCorePulse 2.4s ease-in-out infinite; transform-box:fill-box; transform-origin:center; }
@keyframes s936ScBars { 0%, 100% { transform:scaleY(.7); } 50% { transform:scaleY(1.25); } }
@keyframes s936ScRingPulse { 0%, 100% { opacity:.4; } 50% { opacity:.8; } }
@keyframes s936ScCorePulse { 0%, 100% { transform:scale(1); } 50% { transform:scale(1.04); } }
@media (prefers-reduced-motion: reduce) {
  #${PANEL_ID} .s936sc-wrap.is-active .s936sc-bar,
  #${PANEL_ID} .s936sc-wrap.is-active .s936sc-ring,
  #${PANEL_ID} .s936sc-wrap.is-active .s936sc-core { animation:none; }
}
#${PANEL_ID} .s936lib-list-thumb { width:38px; height:38px; border-radius:7px; flex-shrink:0; background-position:center; background-size:cover; background-color:#0a1614; }

/* Cambio 193: espacio grande de "video/carátula" al reproducir, mismo
   espíritu que el embed de Mini Rockola. */
#${PANEL_ID} .s936lib-compvisual { width:100%; aspect-ratio:16/9; max-height:min(62vh,540px); border-radius:10px; overflow:hidden; margin-bottom:14px; position:relative; background:#000; display:flex; align-items:center; justify-content:center; }
#${PANEL_ID}.s936lib-state-maximized .s936lib-compvisual { max-height:72vh; }
#${PANEL_ID} .s936lib-compvisual-media { width:100%; height:100%; object-fit:contain; }
#${PANEL_ID} .s936lib-compvisual-zoom { background-size:contain; background-repeat:no-repeat; background-position:center; }
#${PANEL_ID} .s936lib-compvisual-hint { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:#9fb0ae; font-size:.8rem; background:rgba(0,0,0,.35); text-align:center; padding:0 20px; }
`;
        document.head.appendChild(style);
    }

    // Cambio 210 (Fase 2): conecta el analizador real UNA sola vez — si ya
    // existe, lo reutiliza. `createMediaElementSource` solo se puede llamar
    // una vez por elemento <audio> en toda su vida, por eso se cachea.
    function ensureAudioAnalyser(){
        if(!audioEl) return null;
        if(s936Analyser) return s936Analyser;
        try {
            s936AudioCtx = s936AudioCtx || new (window.AudioContext || window.webkitAudioContext)();
            s936AnalyserSource = s936AudioCtx.createMediaElementSource(audioEl);
            s936Analyser = s936AudioCtx.createAnalyser();
            s936Analyser.fftSize = 64;
            s936AnalyserSource.connect(s936Analyser);
            s936Analyser.connect(s936AudioCtx.destination);
            s936FreqData = new Uint8Array(s936Analyser.frequencyBinCount);
        } catch(_) { /* navegador sin soporte, o ya conectado — cae al procedimental */ }
        return s936Analyser;
    }

    // ---------------------------------------------------------------
    // Ecualizador animado — solo corre mientras algo esté sonando
    // ---------------------------------------------------------------
    function startEqAnimation(){
        stopEqAnimation();
        if(s936AudioCtx && s936AudioCtx.state === 'suspended') s936AudioCtx.resume().catch(()=>{});
        ensureAudioAnalyser();
        eqTimer = setInterval(() => {
            const panel = document.getElementById(PANEL_ID);
            if(!panel) return;
            const bars = panel.querySelectorAll('.s936lib-eqside i');
            // Cambio 216: los dos lados quedan ENCONTRADOS. En ambos, las
            // barras pequeñas miran al 936 y las de mayor energía crecen
            // hacia afuera. El lado derecho invierte el orden espectral; ya
            // no avanza en la misma dirección visual que el izquierdo.
            const barGeometry = (bar) => {
                const side = bar.parentElement;
                const children = Array.from(side.children);
                const localIndex = Math.max(0, children.indexOf(bar));
                const total = Math.max(1, children.length);
                const isRight = side.classList.contains('right');
                const spectrumIndex = isRight ? (total - 1 - localIndex) : localIndex;
                const outward = isRight
                    ? (localIndex / Math.max(1, total - 1))
                    : ((total - 1 - localIndex) / Math.max(1, total - 1));
                return { spectrumIndex, outward, total };
            };

            // Cambio 210: si hay audio LOCAL sonando (composición/MP3) y el
            // analizador está conectado, usa datos REALES del espectro.
            if(s936Analyser && audioEl && audioEl.src && !audioEl.paused){
                s936Analyser.getByteFrequencyData(s936FreqData);
                const n = s936FreqData.length;
                bars.forEach((bar) => {
                    const { spectrumIndex, outward, total } = barGeometry(bar);
                    const bin = 1 + Math.floor((spectrumIndex / Math.max(1, total - 1)) * (n - 1) * 0.7);
                    const v = s936FreqData[Math.min(bin, n - 1)] / 255;
                    const shape = 0.42 + outward * 0.58;
                    bar.style.height = (3 + v * 19 * shape) + 'px';
                });
            } else {
                // YouTube no expone su audio al analizador. Conserva una
                // animación procedural, pero con la misma geometría encontrada:
                // pequeña junto al 936 y más amplia hacia los extremos.
                bars.forEach((bar) => {
                    const { outward } = barGeometry(bar);
                    const shape = 0.32 + outward * 0.68;
                    bar.style.height = (3 + Math.random() * 19 * shape) + 'px';
                });
            }
        }, 110);
    }
    function stopEqAnimation(){
        if(eqTimer){ clearInterval(eqTimer); eqTimer = null; }
        const panel = document.getElementById(PANEL_ID);
        if(panel) panel.querySelectorAll('.s936lib-eqside i').forEach((bar) => { bar.style.height = '3px'; });
    }

    // ---------------------------------------------------------------
    // Búsqueda genérica
    // ---------------------------------------------------------------
    function normalizeSearchText(value){
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
    function matchesSearch(item, extraFields){
        if(activePlaylistFilter && !(item.playlists || []).includes(activePlaylistFilter)) return false;
        if(!searchQuery) return true;
        const q = normalizeSearchText(searchQuery);
        const fields = [item.title, item.name, item.author, item.genre, ...(item.playlists || [])].concat(extraFields || []);
        return fields.some((field) => normalizeSearchText(field).includes(q));
    }

    function buildPlaylistFilterButton(scopeList){
        const options = scopeList ? playlistsUsedBy(scopeList) : allPlaylists();
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
            options.forEach((name) => {
                const chip = el('button', 's936lib-gpchip' + (activePlaylistFilter === name ? ' active' : ''), name);
                chip.type = 'button';
                chip.onclick = (ev) => { ev.preventDefault(); activePlaylistFilter = name; closeGenrePlaylistPopover(); renderBodyOnly(); };
                chips.appendChild(chip);
            });
            if(!options.length) chips.appendChild(el('div', 's936lib-gpempty', 'Todavía no tienes listas creadas.'));
            pop.appendChild(chips);
            pop.addEventListener('click', (ev) => ev.stopPropagation());
            document.body.appendChild(pop);
            positionFloatingPopover(pop, btn);
            genrePlaylistPopoverEl = pop;
        };
        return btn;
    }

    // Cambio 194: la flecha de Composiciones ahora es un filtro rápido por
    // álbum (mismo patrón que el de listas), en vez de abrir el modal de
    // configuración completo — ese quedó en su propio botón aparte.
    function buildAlbumFilterButton(){
        const activeAlbum = activeAlbumFilter && activeAlbumFilter !== 'none' ? getAlbum(activeAlbumFilter) : null;
        const label = activeAlbumFilter === 'none' ? 'Sin álbum' : (activeAlbum ? activeAlbum.name : null);
        const btn = el('button', 's936lib-iconbtn' + (activeAlbumFilter ? ' active' : ''), '⏷');
        btn.title = label ? ('Filtrando: ' + label) : 'Filtrar por álbum';
        btn.style.cssText = 'width:32px;height:32px;font-size:.85rem;flex-shrink:0;';
        btn.onclick = (e) => {
            e.stopPropagation();
            if(genrePlaylistPopoverEl){ closeGenrePlaylistPopover(); return; }
            const pop = el('div', 's936lib-ytform s936lib-ytform-floating s936lib-gppopover');
            pop.appendChild(el('div', 's936lib-gptitle', 'Filtrar por álbum'));
            const chips = el('div', 's936lib-gpchips');
            const allBtn = el('button', 's936lib-gpchip' + (!activeAlbumFilter ? ' active' : ''), 'Todos');
            allBtn.type = 'button';
            allBtn.onclick = (ev) => { ev.preventDefault(); activeAlbumFilter = null; closeGenrePlaylistPopover(); renderBodyOnly(); };
            chips.appendChild(allBtn);
            const noAlbumCount = store.compositions.filter(x => !x.albumId).length;
            if(noAlbumCount){
                const noneBtn = el('button', 's936lib-gpchip' + (activeAlbumFilter === 'none' ? ' active' : ''), 'Sin álbum');
                noneBtn.type = 'button';
                noneBtn.onclick = (ev) => { ev.preventDefault(); activeAlbumFilter = 'none'; closeGenrePlaylistPopover(); renderBodyOnly(); };
                chips.appendChild(noneBtn);
            }
            allAlbums().forEach((a) => {
                const chip = el('button', 's936lib-gpchip' + (activeAlbumFilter === a.id ? ' active' : ''), a.name);
                chip.type = 'button';
                chip.onclick = (ev) => { ev.preventDefault(); activeAlbumFilter = a.id; closeGenrePlaylistPopover(); renderBodyOnly(); };
                chips.appendChild(chip);
            });
            if(!allAlbums().length) chips.appendChild(el('div', 's936lib-gpempty', 'Todavía no tienes álbumes — créalos con el botón ⚙ de aquí al lado.'));
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
        const isPlaying = currentPlayingComp === item.id && !!audioEl && !audioEl.paused;
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
        // Cambio 214: sugerencias de listas limitadas al mismo tipo — antes
        // mezclaba listas de MP3, Composiciones y YouTube todas juntas.
        const suggestedPlaylists = opts.scopeType ? playlistsUsedBy(store[opts.scopeType]) : allPlaylists();
        function renderChips(){
            chipsWrap.innerHTML = '';
            suggestedPlaylists.forEach((name) => {
                const chip = el('button', 's936lib-gpchip' + (selected.has(name) ? ' active' : ''), name);
                chip.type = 'button';
                chip.onclick = (e) => {
                    e.preventDefault();
                    if(selected.has(name)) selected.delete(name); else selected.add(name);
                    renderChips();
                };
                chipsWrap.appendChild(chip);
            });
            if(!suggestedPlaylists.length){
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

    // Cambio 204: separados de verdad — clic en la etiqueta de género abre
    // SOLO el género (nada de listas); "Agregar/Editar listas" en el menú
    // ⋮ abre SOLO las listas (nada de género). Antes ambos abrían la misma
    // ventana combinada, lo cual confundía.
    function openEditGenreOnlyPopover(type, item){
        if(genrePlaylistPopoverEl) closeGenrePlaylistPopover();
        const pop = el('div', 's936lib-ytform s936lib-ytform-floating s936lib-gppopover');
        pop.appendChild(el('div', 's936lib-gptitle', 'Género de "' + (item.title || item.name) + '"'));
        const input = document.createElement('input');
        input.value = item.genre || '';
        input.placeholder = 'Género / estilo (ej. Rock, Bolero...)';
        input.style.cssText = 'background:#1c2224; border:1px solid #333; border-radius:8px; padding:7px 9px; color:#e8f4f2; font-size:.78rem; font-family:inherit;';
        const saveBtn = el('button', 's936lib-actionbtn', 'Guardar');
        saveBtn.style.alignSelf = 'flex-start';
        saveBtn.onclick = (e) => {
            e.stopPropagation();
            setGenre(type, item.id, input.value.trim());
            closeGenrePlaylistPopover();
            render();
        };
        pop.append(input, saveBtn);
        pop.addEventListener('click', (e) => e.stopPropagation());
        document.body.appendChild(pop);
        positionFloatingPopover(pop, null);
        genrePlaylistPopoverEl = pop;
    }

    function openEditPlaylistsOnlyPopover(type, item){
        if(genrePlaylistPopoverEl) closeGenrePlaylistPopover();
        const pop = el('div', 's936lib-ytform s936lib-ytform-floating s936lib-gppopover');
        pop.appendChild(el('div', 's936lib-gptitle', 'Listas de "' + (item.title || item.name) + '"'));
        const gp = buildGenrePlaylistFields({ playlists: item.playlists || [], scopeType: type });
        const saveBtn = el('button', 's936lib-actionbtn', 'Guardar cambios');
        saveBtn.style.alignSelf = 'flex-start';
        saveBtn.onclick = (e) => {
            e.stopPropagation();
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

    function openEditGenrePlaylistPopover(type, item){
        if(genrePlaylistPopoverEl) closeGenrePlaylistPopover();
        const pop = el('div', 's936lib-ytform s936lib-ytform-floating s936lib-gppopover');
        pop.appendChild(el('div', 's936lib-gptitle', 'Editar "' + (item.title || item.name) + '"'));
        const gp = buildGenrePlaylistFields({ genre: item.genre || '', genreEditable: type !== 'compositions', playlists: item.playlists || [], scopeType: type });
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
            // Cambio 197: ya no abre popup al hacer clic — confundía, porque
            // el género no se puede editar aquí (viene del estilo elegido
            // al guardar) y el popup solo mostraba listas, no género. Para
            // corregir un género equivocado hay que editarlo donde se
            // compone. "Editar listas" se movió al menú ⋮.
            const tag = el('span', 's936lib-genretag', genreLabel(item.genre) || 'Sin estilo');
            tag.title = 'El género viene del estilo elegido al componer la canción.';
            return tag;
        }
        const tag = el('span', 's936lib-genretag', item.genre || '+ género');
        tag.style.cursor = 'pointer';
        tag.title = 'Clic para editar el género';
        tag.onclick = (e) => { e.stopPropagation(); openEditGenreOnlyPopover(type, item); };
        return tag;
    }

    let linkAudioPopoverEl = null;
    function closeLinkAudioPopover(){
        if(linkAudioPopoverEl){ linkAudioPopoverEl.remove(); linkAudioPopoverEl = null; }
    }
    document.addEventListener('click', (e) => {
        if(linkAudioPopoverEl && !e.target.closest('.s936lib-linkaudio')) closeLinkAudioPopover();
    });

    // Cambio 191: en vez de un prompt() con números (incómodo, como bien
    // notaste), un popover real — elegir un audio ya importado, O
    // importar uno nuevo y quedar vinculado en el mismo clic, sin ir a la
    // pestaña Audio MP3 primero. Esa es la gracia de tenerlos juntos.
    function openLinkAudioPopover(item, anchorEl){
        if(linkAudioPopoverEl){ closeLinkAudioPopover(); return; }
        const pop = el('div', 's936lib-ytform s936lib-ytform-floating s936lib-gppopover s936lib-linkaudio');
        pop.appendChild(el('div', 's936lib-gptitle', 'Vincular audio a "' + item.title + '"'));

        const linkAndPlay = (audioId) => {
            item.previewAudioId = audioId;
            saveStore();
            tryWriteCompositionJsonToConfiguredFolder(item);
            closeLinkAudioPopover();
            currentPlayingComp = item.id;
            playAudio(audioId, item.title, item.author || 'Artista sin definir');
            showCompositionContextHint(item);
        };

        if(store.audios.length){
            const list = el('div', 's936lib-linkaudio-list');
            store.audios.forEach((a) => {
                const row = el('button', 's936lib-linkaudio-row', a.title);
                row.type = 'button';
                row.onclick = (e) => { e.stopPropagation(); linkAndPlay(a.id); };
                list.appendChild(row);
            });
            pop.appendChild(list);
            pop.appendChild(el('div', 's936lib-gplabel', 'o importa uno nuevo:'));
        } else {
            pop.appendChild(el('div', 's936lib-gpempty', 'Todavía no tienes ningún audio importado.'));
        }

        const importBtn = el('button', 's936lib-actionbtn', '⬆ Importar y vincular');
        importBtn.style.alignSelf = 'flex-start';
        const fileInput = document.createElement('input');
        fileInput.type = 'file'; fileInput.accept = 'audio/*,video/mp4'; fileInput.style.display = 'none';
        fileInput.onchange = (e) => {
            const file = e.target.files?.[0];
            if(!file) return;
            const id = uid('a');
            audioObjectURLs[id] = URL.createObjectURL(file);
            const nameGuess = file.name.replace(/\.(mp3|mp4|wav|m4a|ogg)$/i, '').replace(/[_-]+/g,' ').trim();
            store.audios.push({ id, title: nameGuess || file.name, author:'', fileName:file.name, genre:'', playlists:[], addedAt:Date.now() });
            saveStore();
            linkAndPlay(id);
        };
        importBtn.onclick = (e) => { e.stopPropagation(); fileInput.click(); };
        pop.append(importBtn, fileInput);

        pop.addEventListener('click', (e) => e.stopPropagation());
        document.body.appendChild(pop);
        positionFloatingPopover(pop, anchorEl);
        linkAudioPopoverEl = pop;
    }

    // Cambio 192: si esta canción ya tenía un audio vinculado en una
    // sesión anterior y se copió a la carpeta configurada, se trae de
    // vuelta solo (sin pedir nada) usando el nombre que quedó anotado en
    // song.diskFileName — esto es lo que le da sentido real a tener JSON
    // y MP3 "enganchados" en la misma carpeta.
    async function tryRestoreAudioFromDisk(audioId){
        const song = store.audios.find(x => x.id === audioId);
        if(!song || !song.diskFileName) return false;
        if(audioObjectURLs[audioId]) return true; // ya está en memoria, nada que hacer
        try {
            const structureMod = window.Studio936SuiteProStructure;
            if(!structureMod || typeof structureMod.getLibraryAudioDirHandle !== 'function') return false;
            const audioDirHandle = await structureMod.getLibraryAudioDirHandle();
            if(!audioDirHandle) return false;
            const fh = await audioDirHandle.getFileHandle(song.diskFileName);
            const file = await fh.getFile();
            audioObjectURLs[audioId] = URL.createObjectURL(file);
            return true;
        } catch(_) { return false; }
    }

    // Cambio 211: BPM/tonalidad reales de la composición — aparecen unos
    // segundos al empezar a sonar y luego vuelven al autor, igual que el
    // aviso de "Siguiente" en la cola. bpm viene de project.bpm (fiable);
    // la tonalidad viene de project.soloKey (la herramienta "Solo") — si
    // esa herramienta nunca se usó en esta canción, puede no reflejar la
    // tonalidad real, por eso solo se agrega si existe y no se inventa.
    function showCompositionContextHint(item){
        const bpm = item.project?.bpm;
        const key = item.project?.soloKey;
        if(!bpm) return;
        const parts = [bpm + ' BPM'];
        if(key) parts.push(key);
        const text = parts.join(' · ');
        setTimeout(() => {
            const panel = document.getElementById(PANEL_ID);
            const subEl = panel?.querySelector('.s936lib-nowsub');
            if(subEl) subEl.textContent = text;
            clearTimeout(s936NextHintTimer);
            s936NextHintTimer = setTimeout(() => {
                if(subEl) subEl.textContent = item.author || 'Artista sin definir';
            }, 3500);
        }, 300);
    }

    async function previewComposition(id, anchorEl){
        const item = store.compositions.find(x => x.id === id);
        if(!item) return;
        if(item.previewAudioId && audioObjectURLs[item.previewAudioId]){
            currentPlayingComp = id;
            playAudio(item.previewAudioId, item.title, item.author || 'Artista sin definir');
            showCompositionContextHint(item);
            return;
        }
        if(item.previewAudioId){
            const restored = await tryRestoreAudioFromDisk(item.previewAudioId);
            if(restored){
                currentPlayingComp = id;
                playAudio(item.previewAudioId, item.title, item.author || 'Artista sin definir');
                showCompositionContextHint(item);
                return;
            }
        }
        openLinkAudioPopover(item, anchorEl);
    }

    // Cambio 201: cuál composición quedó "actual" (la que se abrió por
    // última vez) — se guarda para cuando el guardado real del editor
    // (todavía pendiente de limpiar del otro lado, según nos dijiste)
    // decida actualizar esta misma en vez de crear una copia nueva.
    const CURRENT_OPEN_KEY = 's936_library_current_open_id';
    function setCurrentOpenCompositionId(id){
        try { localStorage.setItem(CURRENT_OPEN_KEY, id || ''); } catch(_) {}
    }
    function getCurrentOpenCompositionId(){
        try { return localStorage.getItem(CURRENT_OPEN_KEY) || null; } catch(_) { return null; }
    }

    // Cambio 201: guarda o actualiza — si hay una composición marcada como
    // "actual" (se abrió con Abrir), actualiza ESA en vez de crear una
    // nueva. Pensado para que el botón de guardar real (del lado del
    // editor, todavía pendiente de conectar) lo use en vez de duplicar
    // canciones cada vez que guardas la misma.
    function saveOrUpdateCurrent(snapshot){
        if(!snapshot) return null;
        const openId = getCurrentOpenCompositionId();
        const existing = openId ? store.compositions.find(x => x.id === openId) : null;
        if(existing){
            existing.project = snapshot;
            existing.title = snapshot.title || existing.title;
            existing.author = snapshot.author || existing.author;
            existing.genre = snapshot.style || existing.genre;
            existing.updated = Date.now();
            saveStore();
            tryWriteCompositionJsonToConfiguredFolder(existing);
            render();
            return existing.id;
        }
        const entry = {
            id: uid('c'),
            title: snapshot.title || 'Sin título',
            author: snapshot.author || '',
            updated: Date.now(),
            genre: snapshot.style || '',
            playlists: [],
            albumId: store.activeAlbumId || null,
            previewAudioId: null,
            project: snapshot
        };
        store.compositions.unshift(entry);
        saveStore();
        tryWriteCompositionJsonToConfiguredFolder(entry);
        setCurrentOpenCompositionId(entry.id);
        render();
        return entry.id;
    }

    async function openComposition(id){
        const item = store.compositions.find(x => x.id === id);
        if(!item) return;
        if(!await s936Confirm('¿Abrir "' + item.title + '" en el editor? Se reemplaza lo que tengas ahí ahora mismo sin guardar (si no lo has guardado, se pierde).')) return;
        const ok = window.Studio936AppBridge?.loadProject?.(item.project);
        if(ok === false){ await s936Alert('No se pudo abrir esta composición — el proyecto guardado parece dañado o incompleto.'); return; }
        setCurrentOpenCompositionId(id);
        close();
        // Cambio 199: sin esto, los datos se actualizaban por detrás pero
        // nunca se veía nada — falta llamar a openArea('compose') para que
        // el panel de Suite Pro se vuelva a dibujar con la canción nueva.
        window.Studio936SuitePro?.openArea?.('compose');
    }

    function renameComposition(id){
        const item = store.compositions.find(x => x.id === id);
        if(!item) return;
        const value = prompt('Nuevo nombre para esta composición:', item.title);
        if(value === null || !value.trim()) return;
        item.title = value.trim();
        saveStore();
        render();
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

    async function deleteComposition(id){
        const item = store.compositions.find(x => x.id === id);
        if(!item) return;
        if(!await s936Confirm('¿Borrar "' + item.title + '"? Esta acción no se puede deshacer.')) return;
        store.compositions = store.compositions.filter(x => x.id !== id);
        if(getCurrentOpenCompositionId() === id) setCurrentOpenCompositionId(null);
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
    // Cambio 189: el volumen se despliega con clic en la bocina (como
    // YouTube) — se cierra al hacer clic en cualquier otro lado.
    document.addEventListener('click', (e) => {
        document.querySelectorAll('.s936lib-vol.open').forEach((v) => { if(!e.target.closest('.s936lib-vol')) v.classList.remove('open'); });
    });

    // Cambio 188: reutiliza el módulo de Structure (carpeta configurada vía
    // File System Access) en vez de construir un segundo sistema de carpeta
    // — "Conecte el módulo de configuración existente". Si no hay carpeta
    // configurada o el navegador no soporta la API, no hace nada (el
    // guardado en localStorage ya ocurrió antes de llamar esto, así que
    // nunca se pierde la composición por esto).
    async function tryWriteCompositionJsonToConfiguredFolder(entry){
        try {
            const structureMod = window.Studio936SuiteProStructure;
            if(!structureMod || typeof structureMod.getLibraryDirHandle !== 'function') return;
            const dirHandle = await structureMod.getLibraryDirHandle();
            if(!dirHandle || !window.FileSystemFileHandle) return;
            const slug = String(entry.title || 'cancion').toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
                .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') || 'cancion';
            // Cambio 192: el audio va en su propia subcarpeta "audio/" (no
            // mezclado con los JSON), y su nombre se anota en el propio
            // registro del audio en la Librería (song.diskFileName) — así,
            // la próxima vez que abras la app, se puede traer de vuelta
            // solo desde esa carpeta, sin volver a pedírtelo (Cambio 192
            // también hizo que la carpeta misma se recuerde entre
            // sesiones — antes ni eso pasaba).
            let audioFile = null;
            if(entry.previewAudioId && audioObjectURLs[entry.previewAudioId]){
                try {
                    const song = store.audios.find(x => x.id === entry.previewAudioId);
                    const ext = (song && song.fileName && song.fileName.match(/\.[a-z0-9]+$/i)?.[0]) || '.mp3';
                    audioFile = 'studio936-' + slug + '-audio' + ext;
                    const audioDirHandle = (typeof structureMod.getLibraryAudioDirHandle === 'function')
                        ? await structureMod.getLibraryAudioDirHandle()
                        : dirHandle;
                    const resp = await fetch(audioObjectURLs[entry.previewAudioId]);
                    const blob = await resp.blob();
                    const audioFh = await audioDirHandle.getFileHandle(audioFile, { create:true });
                    const audioWritable = await audioFh.createWritable();
                    await audioWritable.write(blob);
                    await audioWritable.close();
                    if(song){ song.diskFileName = audioFile; saveStore(); }
                } catch(_) { audioFile = null; }
            }
            const payload = audioFile ? Object.assign({}, entry, { audioFile: 'audio/' + audioFile }) : entry;
            const filename = 'studio936-' + slug + '-composicion.json';
            const fh = await dirHandle.getFileHandle(filename, { create:true });
            const writable = await fh.createWritable();
            await writable.write(JSON.stringify(payload, null, 2));
            await writable.close();
        } catch(_) { /* silencioso: la copia en localStorage ya está a salvo */ }
    }

    // Cambio 188: modal de gestión de álbumes — modelo tipo Spotify (el
    // compositor saca álbumes uno tras otro, trabaja en uno "actual" a la
    // vez). Vive fuera del panel (igual que los menús ⋮), por eso usa sus
    // propios estilos inline en vez de las clases con scope de #PANEL_ID.
    function openAlbumConfig(){
        document.getElementById('s936-album-config-overlay')?.remove();

        const overlay = document.createElement('div');
        overlay.id = 's936-album-config-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(10,13,14,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;';

        const modal = document.createElement('div');
        modal.style.cssText = 'background:linear-gradient(180deg,#161b1d,#0d1112);border:1px solid rgba(91,232,201,.22);border-radius:18px;width:100%;max-width:420px;max-height:85vh;overflow-y:auto;box-shadow:0 24px 70px rgba(0,0,0,.55), 0 0 30px rgba(0,255,204,.04);';

        const head = document.createElement('div');
        head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.06);background:rgba(0,255,204,.03);position:sticky;top:0;border-radius:18px 18px 0 0;';
        head.innerHTML = '<span style="font-size:.82rem;font-weight:700;color:#00ffcc;">💿 Álbumes</span>';
        const closeX = document.createElement('button');
        closeX.innerHTML = '✕';
        closeX.style.cssText = 'background:none;border:none;color:rgba(255,255,255,.5);cursor:pointer;font-size:.9rem;';
        closeX.onclick = () => overlay.remove();
        head.appendChild(closeX);
        modal.appendChild(head);

        const body = document.createElement('div');
        body.style.cssText = 'padding:16px;display:flex;flex-direction:column;gap:14px;';
        modal.appendChild(body);

        function paintThumb(node, albumId, cover){
            const vidUrl = albumVideoUrl(albumId);
            node.innerHTML = '';
            if(vidUrl){
                node.style.background = '#0a1614';
                const v = document.createElement('video');
                v.src = vidUrl; v.autoplay = true; v.loop = true; v.muted = true; v.playsInline = true;
                v.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:inherit;';
                node.appendChild(v);
            } else {
                node.style.background = cover ? `url('${cover}') center/cover` : 'radial-gradient(circle at 30% 25%,#1c5a4f,#0a1614 70%)';
            }
        }

        function renderAlbumBody(){
            body.innerHTML = '';

            const active = getActiveAlbum();
            const activeBox = document.createElement('div');
            activeBox.style.cssText = 'display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:10px;padding:10px 12px;';
            const activeThumb = document.createElement('div');
            activeThumb.style.cssText = 'width:44px;height:44px;border-radius:8px;flex-shrink:0;overflow:hidden;';
            if(active) paintThumb(activeThumb, active.id, active.cover);
            const activeText = document.createElement('div');
            activeText.style.cssText = 'font-size:.72rem;color:rgba(255,255,255,.65);line-height:1.4;';
            activeText.innerHTML = active
                ? `<span style="color:#00ffcc;">✓ Álbum de trabajo actual:</span><br><span style="color:#fff;font-weight:700;">${esc(active.name)}</span>`
                : '<span style="color:rgba(255,255,255,.4);">Sin álbum activo — las composiciones que guardes no quedarán en ningún álbum.</span>';
            activeBox.append(activeThumb, activeText);
            body.appendChild(activeBox);

            if(allAlbums().length){
                const list = document.createElement('div');
                list.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
                allAlbums().forEach((a) => {
                    const row = document.createElement('div');
                    row.style.cssText = 'display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.02);border:1px solid ' + (a.id === store.activeAlbumId ? 'rgba(0,255,204,.4)' : 'rgba(255,255,255,.08)') + ';border-radius:10px;padding:7px 9px;';
                    const thumb = document.createElement('div');
                    thumb.style.cssText = 'width:32px;height:32px;border-radius:6px;flex-shrink:0;cursor:pointer;overflow:hidden;';
                    paintThumb(thumb, a.id, a.cover);
                    thumb.title = 'Cambiar carátula (foto o video)';
                    const coverInput = document.createElement('input');
                    coverInput.type = 'file'; coverInput.accept = 'image/*,video/*'; coverInput.style.display = 'none';
                    coverInput.onchange = (e) => { const f = e.target.files?.[0]; if(f) updateAlbumCover(a.id, f, renderAlbumBody); };
                    thumb.onclick = () => coverInput.click();
                    const name = document.createElement('div');
                    name.textContent = a.name;
                    name.style.cssText = 'flex:1;font-size:.76rem;font-weight:700;color:#e8f4f2;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
                    name.title = 'Clic para renombrar';
                    name.onclick = () => { const v = prompt('Nuevo nombre del álbum:', a.name); if(v && v.trim()){ renameAlbum(a.id, v); renderAlbumBody(); } };
                    const useBtn = document.createElement('button');
                    useBtn.textContent = a.id === store.activeAlbumId ? 'Activo' : 'Usar';
                    useBtn.disabled = a.id === store.activeAlbumId;
                    useBtn.style.cssText = 'background:' + (a.id === store.activeAlbumId ? 'rgba(0,255,204,.15)' : 'transparent') + ';border:1px solid rgba(0,255,204,.4);color:#00ffcc;border-radius:8px;padding:5px 9px;font-size:.66rem;font-weight:700;cursor:pointer;flex-shrink:0;';
                    useBtn.onclick = () => { setActiveAlbum(a.id); renderAlbumBody(); };
                    const delBtn = document.createElement('button');
                    delBtn.textContent = '🗑';
                    delBtn.style.cssText = 'background:transparent;border:1px solid rgba(255,90,90,.4);color:#ff9a9a;border-radius:8px;padding:5px 8px;font-size:.7rem;cursor:pointer;flex-shrink:0;';
                    delBtn.onclick = () => { deleteAlbum(a.id); renderAlbumBody(); };
                    row.append(thumb, coverInput, name, useBtn, delBtn);
                    list.appendChild(row);
                });
                body.appendChild(list);
            }

            const sep1 = document.createElement('div');
            sep1.style.cssText = 'border-top:1px solid rgba(255,255,255,.07);padding-top:12px;display:flex;flex-direction:column;gap:8px;';
            const newTitle = document.createElement('div');
            newTitle.textContent = '+ Nuevo álbum';
            newTitle.style.cssText = 'font-size:.68rem;text-transform:uppercase;letter-spacing:.6px;color:#9fb0ae;';
            const newHint = document.createElement('div');
            newHint.textContent = 'Carátula opcional: foto o video corto. La foto se guarda de verdad; el video se pierde al recargar la página hasta que tengamos guardado real en la nube.';
            newHint.style.cssText = 'font-size:.6rem;color:#7a8785;font-style:italic;';
            const nameInput = document.createElement('input');
            nameInput.placeholder = 'Nombre del álbum (ej. Fantasía Musical)';
            nameInput.style.cssText = 'background:#1c2224;border:1px solid #333;border-radius:8px;padding:8px 10px;color:#e8f4f2;font-size:.78rem;font-family:inherit;';
            let selectedCoverFile = null;
            const coverRow = document.createElement('div');
            coverRow.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;';
            const coverStatus = document.createElement('span');
            coverStatus.textContent = 'Sin carátula';
            coverStatus.style.cssText = 'font-size:.64rem;color:#7a8785;';
            function makeCoverPickBtn(label, accept){
                const pickBtn = document.createElement('button');
                pickBtn.type = 'button';
                pickBtn.textContent = label;
                pickBtn.style.cssText = 'background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.14);color:#e8f4f2;border-radius:8px;padding:6px 11px;font-size:.68rem;font-weight:700;cursor:pointer;';
                const hiddenInput = document.createElement('input');
                hiddenInput.type = 'file'; hiddenInput.accept = accept; hiddenInput.style.display = 'none';
                hiddenInput.onchange = (e) => {
                    const f = e.target.files?.[0];
                    if(f){ selectedCoverFile = f; coverStatus.textContent = '✓ ' + f.name; }
                };
                pickBtn.onclick = () => hiddenInput.click();
                coverRow.append(pickBtn, hiddenInput);
            }
            makeCoverPickBtn('📷 Elegir foto', 'image/*');
            makeCoverPickBtn('🎥 Elegir video', 'video/*');
            coverRow.appendChild(coverStatus);
            const createBtn = document.createElement('button');
            createBtn.textContent = '💿 Crear álbum';
            createBtn.style.cssText = 'background:rgba(0,255,204,.12);border:1px solid #00ffcc;color:#00ffcc;border-radius:8px;padding:8px 12px;font-size:.74rem;font-weight:700;cursor:pointer;align-self:flex-start;';
            createBtn.onclick = () => {
                const name = nameInput.value.trim();
                if(!name){ nameInput.focus(); return; }
                createAlbum(name, selectedCoverFile, () => { renderAlbumBody(); render(); });
            };
            sep1.append(newTitle, newHint, nameInput, coverRow, createBtn);
            body.appendChild(sep1);

            const sep2 = document.createElement('div');
            sep2.style.cssText = 'border-top:1px solid rgba(255,255,255,.07);padding-top:12px;';
            const folderBtn = document.createElement('button');
            const structureMod = window.Studio936SuiteProStructure;
            folderBtn.textContent = '📁 Configurar carpeta de guardado';
            folderBtn.style.cssText = 'background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.1);color:#cdd8d6;border-radius:10px;padding:9px 12px;font-size:.72rem;font-weight:700;cursor:pointer;width:100%;';
            folderBtn.disabled = !structureMod || typeof structureMod.openLibraryConfig !== 'function';
            if(folderBtn.disabled) folderBtn.title = 'El módulo de Estructura todavía no cargó en esta página.';
            folderBtn.onclick = () => structureMod.openLibraryConfig({});
            sep2.appendChild(folderBtn);
            body.appendChild(sep2);
        }

        renderAlbumBody();
        overlay.appendChild(modal);
        overlay.onclick = (e) => { if(e.target === overlay) overlay.remove(); };
        document.body.appendChild(overlay);
    }

    async function saveCurrentComposition(anchorBtn){
        const snapshot = window.Studio936AppBridge?.getProjectSnapshot?.();
        if(!snapshot){ await s936Alert('No se pudo leer la composición actual.'); return; }
        if(genrePlaylistPopoverEl){ closeGenrePlaylistPopover(); return; }
        const pop = el('div', 's936lib-ytform s936lib-ytform-floating s936lib-gppopover');
        pop.appendChild(el('div', 's936lib-gptitle', 'Guardar "' + (snapshot.title || 'Sin título') + '"'));
        // Cambio 186: el género NO se pregunta aquí — ya viene automático
        // del estilo elegido en la barra principal (decisión ya tomada
        // antes, sigue vigente). Solo se piden las listas.
        const gp = buildGenrePlaylistFields({ genre: snapshot.style || '', genreEditable:false, playlists:[], scopeType:'compositions' });
        const saveBtn = el('button', 's936lib-actionbtn', '💾 Guardar composición');
        saveBtn.style.alignSelf = 'flex-start';
        saveBtn.onclick = (e) => {
            e.stopPropagation();
            const entry = {
                id: uid('c'),
                title: snapshot.title || 'Sin título',
                author: snapshot.author || '',
                updated: Date.now(),
                genre: snapshot.style || '',
                playlists: gp.getPlaylists(),
                // Cambio 188: se pega solo el álbum de trabajo actual — no
                // se pregunta nada, tal como pediste.
                albumId: store.activeAlbumId || null,
                previewAudioId: null,
                project: snapshot
            };
            store.compositions.unshift(entry);
            saveStore();
            tryWriteCompositionJsonToConfiguredFolder(entry);
            setCurrentOpenCompositionId(entry.id);
            closeGenrePlaylistPopover();
            render();
        };
        pop.append(gp.wrap, saveBtn);
        pop.addEventListener('click', (e) => e.stopPropagation());
        document.body.appendChild(pop);
        positionFloatingPopover(pop, anchorBtn);
        genrePlaylistPopoverEl = pop;
    }

    // Cambio 188: carátula de la tarjeta de composición — usa la del álbum
    // al que pertenece si tiene una; si no, un ícono animado (ondas SVG)
    // que se ve "vivo" en vez de un emoji estático, ya que son canciones
    // que todavía no tienen su forma final.
    // ---------------------------------------------------------------
    // "936 Sonic Cover" (Cambio 208) — carátula generada para canciones sin
    // foto/video propia. Determinística: la MISMA canción siempre recibe
    // el mismo diseño (círculos, ángulo de degradado, partículas), pero
    // canciones distintas no se ven idénticas entre sí. Reemplaza el
    // ícono de ondas simple de antes.
    //
    // Simplificaciones honestas respecto al pedido original:
    // - No reacciona a datos reales de análisis de frecuencia (Web Audio
    //   AnalyserNode) — el motor de audio de hoy no expone eso todavía.
    //   En su lugar, el espectro radial "respira" con una animación CSS
    //   mientras suena, que es lo más cercano que se puede dar hoy.
    // - No usa IntersectionObserver para pausar tarjetas fuera de vista —
    //   como la animación es 100% CSS (no timers de JS por tarjeta), el
    //   navegador ya la pausa solo cuando la pestaña no está visible, así
    //   que el costo real de CPU es bajo sin necesidad de esa pieza extra.
    // - Respeta prefers-reduced-motion (ver CSS).
    function s936Hash(str){
        let h = 2166136261;
        for(let i=0; i<str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
        return h >>> 0;
    }
    function s936SeededRandom(str){
        let seed = s936Hash(str) || 1;
        return function(){
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return seed / 4294967296;
        };
    }
    const SONIC_TYPE_ICON = { compositions:'♫', audios:'〜', youtube:'▶', recording:'🎙', radio:'📻' };

    function buildSonicCoverSvg(item, typeKey){
        const seedStr = String(item.id || '') + '|' + String(item.title || '');
        const rand = s936SeededRandom(seedStr);
        const uid = 'sc' + s936Hash(seedStr);
        const ringCount = 3 + Math.floor(rand() * 3);
        const gradAngle = Math.floor(rand() * 360);
        const baseAlpha = 0.45 + rand() * 0.3;
        const monoRotate = Math.floor(rand() * 16) - 8;
        const monoX = 10 + rand() * 25;

        let particles = '';
        const particleCount = 6 + Math.floor(rand() * 6);
        for(let i = 0; i < particleCount; i++){
            const px = (rand() * 180 + 10).toFixed(1);
            const py = (rand() * 180 + 10).toFixed(1);
            const pr = (0.6 + rand() * 1.3).toFixed(1);
            const po = (0.12 + rand() * 0.22).toFixed(2);
            particles += `<circle cx="${px}" cy="${py}" r="${pr}" fill="#53D6C0" opacity="${po}" />`;
        }

        let rings = '';
        for(let i = 0; i < ringCount; i++){
            const r = 28 + i * 13;
            const o = Math.max(0.12, baseAlpha - i * 0.11).toFixed(2);
            rings += `<circle class="s936sc-ring" cx="100" cy="100" r="${r}" fill="none" stroke="#00E6C3" stroke-width="1.1" opacity="${o}" />`;
        }

        let bars = '';
        const barCount = 28;
        for(let i = 0; i < barCount; i++){
            const angle = (i / barCount) * 360;
            const barH = (5 + rand() * 12).toFixed(1);
            bars += `<g transform="rotate(${angle.toFixed(1)} 100 100) translate(100 100)"><rect class="s936sc-bar" x="-1" y="-${(36 + parseFloat(barH)).toFixed(1)}" width="2" height="${barH}" fill="#00E6C3" /></g>`;
        }

        const circumference = 2 * Math.PI * 42;
        const icon = SONIC_TYPE_ICON[typeKey] || '♫';

        return `<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" class="s936sc-svg">
            <defs>
                <linearGradient id="${uid}" gradientTransform="rotate(${gradAngle} 0.5 0.5)">
                    <stop offset="0%" stop-color="#071512" />
                    <stop offset="100%" stop-color="#123B34" />
                </linearGradient>
            </defs>
            <rect x="0" y="0" width="200" height="200" fill="url(#${uid})" />
            <text x="${monoX.toFixed(0)}" y="150" transform="rotate(${monoRotate} ${monoX.toFixed(0)} 150)" font-size="120" font-weight="900" fill="#0f2a25" opacity="0.55" font-family="inherit">936</text>
            ${particles}
            <g class="s936sc-bars">${bars}</g>
            ${rings}
            <circle class="s936sc-progressring" cx="100" cy="100" r="42" fill="none" stroke="#00E6C3" stroke-width="2" stroke-dasharray="${circumference.toFixed(1)}" stroke-dashoffset="${circumference.toFixed(1)}" data-circumference="${circumference.toFixed(1)}" transform="rotate(-90 100 100)" />
            <circle class="s936sc-core" cx="100" cy="100" r="24" fill="#0d1f1c" stroke="#53D6C0" stroke-width="1.3" />
            <text x="100" y="104" text-anchor="middle" font-size="12" font-weight="800" fill="#eef7f5" font-family="inherit">936</text>
            <text x="12" y="186" font-size="15" fill="#cfeee7" opacity="0.85">${icon}</text>
        </svg>`;
    }

    // isActive: si esta es la que está sonando ahora mismo — activa el
    // anillo de progreso y la animación del espectro; las demás quedan
    // completamente estáticas (sin costo de CPU).
    function buildSonicCover(item, typeKey, className, isActive){
        const thumb = el('div', className + ' s936sc-wrap' + (isActive ? ' is-active' : ''));
        thumb.innerHTML = buildSonicCoverSvg(item, typeKey);
        return thumb;
    }

    function buildCompositionThumb(item, className, isActive){
        const thumb = el('div', className);
        const videoUrl = albumVideoUrl(item.albumId);
        const coverUrl = compositionCoverUrl(item);
        if(videoUrl){
            const video = document.createElement('video');
            video.src = videoUrl; video.autoplay = true; video.loop = true; video.muted = true; video.playsInline = true;
            video.style.cssText = 'width:100%;height:100%;object-fit:cover;';
            thumb.appendChild(video);
        } else if(coverUrl){
            thumb.style.backgroundImage = `url('${coverUrl}')`;
        } else {
            thumb.classList.add('s936sc-wrap');
            if(isActive) thumb.classList.add('is-active');
            thumb.innerHTML = buildSonicCoverSvg(item, 'compositions');
        }
        return thumb;
    }

    // Popover chico para reasignar el álbum de una composición — reutiliza
    // el mismo patrón visual que el filtro de listas.
    function openMoveToAlbumPopover(item, anchorBtn){
        if(genrePlaylistPopoverEl){ closeGenrePlaylistPopover(); return; }
        const pop = el('div', 's936lib-ytform s936lib-ytform-floating s936lib-gppopover');
        pop.appendChild(el('div', 's936lib-gptitle', 'Mover "' + item.title + '" a álbum'));
        const chips = el('div', 's936lib-gpchips');
        const noneChip = el('button', 's936lib-gpchip' + (!item.albumId ? ' active' : ''), 'Sin álbum');
        noneChip.type = 'button';
        noneChip.onclick = (e) => { e.preventDefault(); moveCompositionToAlbum(item.id, null); closeGenrePlaylistPopover(); };
        chips.appendChild(noneChip);
        allAlbums().forEach((a) => {
            const chip = el('button', 's936lib-gpchip' + (item.albumId === a.id ? ' active' : ''), a.name);
            chip.type = 'button';
            chip.onclick = (e) => { e.preventDefault(); moveCompositionToAlbum(item.id, a.id); closeGenrePlaylistPopover(); };
            chips.appendChild(chip);
        });
        if(!allAlbums().length) chips.appendChild(el('div', 's936lib-gpempty', 'Todavía no tienes álbumes — créalos con el botón "💿 Álbumes".'));
        pop.appendChild(chips);
        pop.addEventListener('click', (e) => e.stopPropagation());
        document.body.appendChild(pop);
        positionFloatingPopover(pop, anchorBtn);
        genrePlaylistPopoverEl = pop;
    }

    // Cambio 193: espacio grande tipo "pantalla de video", igual espíritu
    // que el embed de Mini Rockola — si la composición que suena tiene un
    // álbum con video, se ve el video; si solo tiene foto, la foto hace un
    // zoom lento (Ken Burns); si no tiene nada, el ícono de ondas grande.
    function buildCompositionsVisual(){
        const wrap = el('div', 's936lib-compvisual s936lib-mini-keep');
        const playingItem = currentPlayingComp ? store.compositions.find(x => x.id === currentPlayingComp) : null;
        const isActuallyPlaying = !!(playingItem && audioEl && !audioEl.paused);
        const videoUrl = playingItem ? albumVideoUrl(playingItem.albumId) : null;
        const coverUrl = playingItem ? compositionCoverUrl(playingItem) : null;
        if(videoUrl){
            const video = document.createElement('video');
            video.src = videoUrl; video.autoplay = true; video.loop = true; video.muted = true; video.playsInline = true;
            video.className = 's936lib-compvisual-media';
            wrap.appendChild(video);
        } else if(coverUrl){
            const bg = el('div', 's936lib-compvisual-media s936lib-compvisual-zoom');
            bg.style.backgroundImage = `url('${coverUrl}')`;
            wrap.appendChild(bg);
        } else if(playingItem){
            wrap.classList.add('s936sc-wrap');
            if(isActuallyPlaying) wrap.classList.add('is-active');
            wrap.innerHTML = buildSonicCoverSvg(playingItem, 'compositions');
        } else {
            wrap.classList.add('s936sc-wrap');
            wrap.innerHTML = buildSonicCoverSvg({ id:'s936-empty-comp', title:'' }, 'compositions');
        }
        if(!playingItem) wrap.appendChild(el('div', 's936lib-compvisual-hint', 'Elige "▶ Play" en una composición para verla aquí'));
        return wrap;
    }

    function renderCompositions(body){
        body.appendChild(buildCompositionsVisual());

        const list = store.compositions.filter(x => {
            if(!matchesSearch(x)) return false;
            if(activeGenreFilter && itemGenreLabel('compositions',x) !== activeGenreFilter) return false;
            if(activeAlbumFilter === 'none' && x.albumId) return false;
            if(activeAlbumFilter && activeAlbumFilter !== 'none' && x.albumId !== activeAlbumFilter) return false;
            return true;
        });
        if(!list.length){
            body.appendChild(el('div', 's936lib-empty', store.compositions.length ? 'Sin resultados.' : 'Todavía no has guardado ninguna composición. Se guardan desde donde estás componiendo.'));
            return;
        }
        if(viewMode === 'grid'){
            const grid = el('div', 's936lib-ytgrid');
            list.forEach((item) => {
                const isPlaying = currentPlayingComp === item.id && !!audioEl && !audioEl.paused;
                const card = el('div', 's936lib-ytcard' + (isPlaying ? ' active' : ''));
                const thumb = buildCompositionThumb(item, 's936lib-ytthumb', isPlaying);
                thumb.appendChild(el('div', 'playicon', isPlaying ? '⏸' : '▶'));
                const cardBody = el('div', 's936lib-ytcardbody');
                cardBody.appendChild(el('div', 's936lib-ytcardtitle', item.title));
                const album = getAlbum(item.albumId);
                cardBody.appendChild(el('div', 's936lib-ytcardnotes', (album ? album.name + ' · ' : '') + (item.author || 'Sin autor') + ' · ' + fmtDate(item.updated)));
                const actions = el('div', 's936lib-ytcardactions');
                const playBtn = el('button', 's936lib-mini play', isPlaying ? '⏸ Sonando' : '▶ Play');
                playBtn.onclick = (e) => { e.stopPropagation(); previewComposition(item.id, playBtn); };
                actions.append(playBtn, genreTag('compositions', item));
                const kebab = buildKebabMenu([
                    { icon:'⏏', label:'Abrir', onClick: () => openComposition(item.id) },
                    { icon:'✎', label:'Cambiar nombre', onClick: () => renameComposition(item.id) },
                    { icon:'🏷', label:'Editar listas', onClick: () => openEditPlaylistsOnlyPopover('compositions', item) },
                    { icon:'⧉', label:'Duplicar', onClick: () => duplicateComposition(item.id) },
                    { icon:'💿', label:'Mover a álbum', onClick: () => openMoveToAlbumPopover(item, kebab.querySelector('.s936lib-kebab')) },
                    { icon:'✕', label:'Borrar', danger:true, onClick: () => deleteComposition(item.id) }
                ]);
                actions.appendChild(kebab);
                cardBody.appendChild(actions);
                card.append(thumb, cardBody);
                card.onclick = () => previewComposition(item.id, card);
                grid.appendChild(card);
            });
            body.appendChild(grid);
        } else {
            const listWrap = el('div', 's936lib-listwrap');
            list.forEach((item) => {
                const isPlaying = currentPlayingComp === item.id && !!audioEl && !audioEl.paused;
                const row = el('div', 's936lib-list-row' + (isPlaying ? ' playing' : ''));
                const thumb = buildCompositionThumb(item, 's936lib-list-thumb', isPlaying);
                const title = el('div', 's936lib-list-title', item.title);
                const album = getAlbum(item.albumId);
                const meta = el('div', 's936lib-list-meta', (album ? album.name + ' · ' : '') + (item.author || 'Sin autor') + ' · ' + fmtDate(item.updated));
                const actions = el('div', 's936lib-list-actions');
                const playBtn = el('button', 's936lib-mini play', isPlaying ? '⏸' : '▶');
                playBtn.onclick = (e) => { e.stopPropagation(); previewComposition(item.id, playBtn); };
                actions.append(playBtn, genreTag('compositions', item));
                const kebab = buildKebabMenu([
                    { icon:'⏏', label:'Abrir', onClick: () => openComposition(item.id) },
                    { icon:'✎', label:'Cambiar nombre', onClick: () => renameComposition(item.id) },
                    { icon:'🏷', label:'Editar listas', onClick: () => openEditPlaylistsOnlyPopover('compositions', item) },
                    { icon:'⧉', label:'Duplicar', onClick: () => duplicateComposition(item.id) },
                    { icon:'💿', label:'Mover a álbum', onClick: () => openMoveToAlbumPopover(item, kebab.querySelector('.s936lib-kebab')) },
                    { icon:'✕', label:'Borrar', danger:true, onClick: () => deleteComposition(item.id) }
                ]);
                actions.appendChild(kebab);
                row.append(thumb, title, meta, actions);
                row.onclick = () => previewComposition(item.id, row);
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
        const gp = buildGenrePlaylistFields({ genre:'', genreEditable:true, playlists:[], scopeType:'audios' });
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

    function toggleAudioFromLibrary(id){
        const sameLoadedTrack = !!(
            currentPlayingId === id &&
            !currentPlayingComp &&
            audioEl && audioEl.src
        );

        if(isLocalAudioActuallyPlaying(id)){
            audioEl.pause();
            return;
        }

        // Si era el MP3 anterior que YouTube pausó, vuelve a tomar el control
        // y continúa desde la posición guardada, sin reiniciar el archivo.
        if(sameLoadedTrack && audioEl.paused){
            lastActiveSource = 'local';
            lcdLoading = false;
            lcdError = false;
            if(ytPlayer && typeof ytPlayer.pauseVideo === 'function'){
                try { ytPlayer.pauseVideo(); } catch(_) {}
            }
            const meta = currentLocalLcdMeta();
            audioEl.play().catch(() => { updateLcd(); });
            updateLcd(null, meta?.title, meta?.sub);
            syncVisibleAudioPlaybackState();
            return;
        }

        playAudio(id);
    }

    async function playAudio(id, titleOverride, subOverride){
        const song = store.audios.find(x => x.id === id);
        if(!song) return;
        const objectURL = audioObjectURLs[id];
        if(!objectURL){
            await s936Alert('Este audio necesita que vuelvas a seleccionar su archivo (los navegadores no guardan el audio entre sesiones). Usa "Importar" de nuevo con el mismo archivo.');
            return;
        }
        currentPlayingId = id;
        lastActiveSource = 'local';
        // Cambio 212: el sonido debe ser único — si YouTube estaba
        // sonando, se pausa al arrancar un MP3/composición.
        if(ytPlayer && typeof ytPlayer.pauseVideo === 'function'){ try { ytPlayer.pauseVideo(); } catch(_) {} }
        if(!titleOverride) currentPlayingComp = null;
        lcdError = false;
        lcdLoading = true;
        if(!audioEl){
            audioEl = new Audio();
            audioEl.volume = playerVolume / 100;
            audioEl.addEventListener('ended', () => {
                stopEqAnimation();
                syncVisibleAudioPlaybackState();
                playNextInQueue();
            });
            audioEl.addEventListener('timeupdate', updateLcd);
            audioEl.addEventListener('loadedmetadata', updateLcd);
            audioEl.addEventListener('loadstart', () => { lcdLoading = true; updateLcd(); });
            audioEl.addEventListener('canplay', () => { lcdLoading = false; updateLcd(); });
            audioEl.addEventListener('playing', () => {
                lastActiveSource = 'local';
                lcdLoading = false;
                lcdError = false;
                startEqAnimation();
                syncVisibleAudioPlaybackState();
                updateLcd();
                renderTransportState();
            });
            audioEl.addEventListener('pause', () => {
                if(lastActiveSource === 'local') stopEqAnimation();
                syncVisibleAudioPlaybackState();
                updateLcd();
                renderTransportState();
            });
            audioEl.addEventListener('error', () => {
                lcdLoading = false;
                lcdError = true;
                stopEqAnimation();
                syncVisibleAudioPlaybackState();
                updateLcd();
                renderTransportState();
            });
        }
        audioEl.src = objectURL;
        audioEl.play().catch(() => {
            lcdLoading = false;
            updateLcd();
        });
        // Cambio 212: subtítulo real (artista, o álbum de la composición
        // vinculada si la tiene) — nunca el texto genérico "Audio". Si no
        // hay ningún dato útil, se oculta en vez de mostrar un relleno.
        const linkedCompForSub = audioLinkedComposition(id);
        const resolvedSub = subOverride || song.author || (linkedCompForSub && linkedCompForSub.author) || (linkedCompForSub && getAlbum(linkedCompForSub.albumId)?.name) || '';
        updateLcd(null, titleOverride || displayAudioTitle(song.title), resolvedSub);
        render();
        // Cambio 210: si hay algo en cola, lo muestra unos segundos y luego
        // vuelve al subtítulo normal — información contextual, temporal,
        // tal como se pidió (no permanente). Va DESPUÉS de render() porque
        // render() llama a updateLcd() y pisaría este texto si fuera antes.
        if(queue.length && !titleOverride){
            const nextSong = store.audios.find(x => x.id === queue[0]);
            if(nextSong){
                clearTimeout(s936NextHintTimer);
                const panel = document.getElementById(PANEL_ID);
                const subEl = panel?.querySelector('.s936lib-nowsub');
                if(subEl) subEl.textContent = 'Siguiente: ' + nextSong.title;
                s936NextHintTimer = setTimeout(() => {
                    if(subEl) subEl.textContent = song.author || 'Audio';
                }, 4000);
            }
        }
    }

    // ---------------------------------------------------------------
    // Radio — estaciones online, reutilizan el mismo <audio> que MP3
    // ---------------------------------------------------------------
    let currentPlayingRadioId = null; // id de la estación de radio sonando (mismo audio, distinta procedencia)
    let radioPlayToken = 0;

    function addRadioStation(station){
        if(!station || !station.streamUrl) return;
        store.radio.unshift({
            id: uid('r'),
            name: (station.name || 'Estación de radio').trim(),
            streamUrl: station.streamUrl.trim(),
            homepage: station.homepage || '',
            favicon: station.favicon || '',
            country: station.country || '',
            tags: station.tags || '',
            genre: '',
            playlists: [],
            addedAt: Date.now()
        });
        saveStore();
        render();
    }

    function renameRadio(id){
        const item = store.radio.find(x => x.id === id);
        if(!item) return;
        const value = prompt('Nuevo nombre para esta radio:', item.name);
        if(value === null || !value.trim()) return;
        item.name = value.trim();
        saveStore();
        render();
    }

    async function deleteRadio(id){
        const item = store.radio.find(x => x.id === id);
        if(!item) return;
        if(!await s936Confirm('¿Borrar la radio "' + item.name + '" de tu lista?')) return;
        store.radio = store.radio.filter(x => x.id !== id);
        if(currentPlayingRadioId === id){ currentPlayingRadioId = null; if(audioEl) audioEl.pause(); }
        saveStore();
        render();
    }

    // Radio Browser (radio-browser.info) — base de datos pública, gratis,
    // sin llave, dominio público, con más de 60,000 emisoras reales. Si el
    // servicio falla o no hay internet, devuelve una lista vacía en vez de
    // romper nada.
    async function searchRadioStations(query){
        if(!query || !query.trim()) return [];
        try {
            // Cambio 221: pedir solo streams https — tu sitio corre en
            // https:// (GitHub Pages), y el navegador bloquea en SILENCIO
            // cualquier audio http:// desde una página https:// (esto es
            // "contenido mixto" — la causa más común de "dice reproduciendo
            // pero no suena" con radios online).
            const url = 'https://de1.api.radio-browser.info/json/stations/search?name=' + encodeURIComponent(query.trim()) + '&limit=25&hidebroken=true&order=clickcount&reverse=true';
            const resp = await fetch(url);
            if(!resp.ok) return [];
            const data = await resp.json();
            return (Array.isArray(data) ? data : []).map((s) => ({
                name: s.name,
                streamUrl: s.url_resolved || s.url,
                homepage: s.homepage,
                favicon: s.favicon,
                country: s.country,
                tags: s.tags
            })).filter((s) => s.streamUrl && s.streamUrl.toLowerCase().startsWith('https://'));
        } catch(_) { return []; }
    }

    // Cambio 221: algunas emisoras devuelven un archivo de LISTA de
    // reproducción (.pls/.m3u), no el audio en sí — un <audio> no puede
    // reproducir eso directamente, hay que leer el archivo de texto y
    // sacar la URL real de adentro.
    async function resolveRadioStreamUrl(url){
        const lower = url.toLowerCase().split('?')[0];
        if(!lower.endsWith('.pls') && !lower.endsWith('.m3u')) return url;
        try {
            const resp = await fetch(url);
            if(!resp.ok) return url;
            const text = await resp.text();
            if(lower.endsWith('.pls')){
                const match = text.match(/File\d*\s*=\s*(\S+)/i);
                if(match && match[1]) return match[1].trim();
            } else {
                const line = text.split(/\r?\n/).find((l) => l.trim() && !l.trim().startsWith('#'));
                if(line) return line.trim();
            }
        } catch(_) { /* si falla, se intenta con la URL original de todas formas */ }
        return url;
    }

    let radioAddPopoverEl = null;
    function closeRadioAddPopover(){
        if(radioAddPopoverEl){ radioAddPopoverEl.remove(); radioAddPopoverEl = null; }
    }
    function openAddRadioPopover(anchorEl){
        if(radioAddPopoverEl){ closeRadioAddPopover(); return; }
        const pop = el('div', 's936lib-ytform s936lib-ytform-floating s936lib-gppopover');
        pop.style.width = '340px';
        pop.appendChild(el('div', 's936lib-gptitle', 'Agregar radio'));

        pop.appendChild(el('div', 's936lib-gplabel', 'Buscar estaciones (ej. "jazz", "Colombia", "rock")'));
        const searchRow = el('div', '');
        searchRow.style.cssText = 'display:flex;gap:6px;';
        const searchInput = document.createElement('input');
        searchInput.placeholder = 'Nombre, país o género...';
        searchInput.style.cssText = 'flex:1;background:#1c2224;border:1px solid #333;border-radius:8px;padding:7px 9px;color:#e8f4f2;font-size:.78rem;font-family:inherit;';
        const searchBtn = el('button', 's936lib-actionbtn', 'Buscar');
        searchRow.append(searchInput, searchBtn);
        pop.appendChild(searchRow);
        const resultsWrap = el('div', '');
        resultsWrap.style.cssText = 'display:flex;flex-direction:column;gap:6px;max-height:220px;overflow-y:auto;margin-top:6px;';
        pop.appendChild(resultsWrap);

        const doSearch = async () => {
            resultsWrap.innerHTML = '';
            resultsWrap.appendChild(el('div', 's936lib-gpempty', 'Buscando...'));
            const results = await searchRadioStations(searchInput.value);
            resultsWrap.innerHTML = '';
            if(!results.length){
                resultsWrap.appendChild(el('div', 's936lib-gpempty', 'Sin resultados — prueba con otro nombre, país o género.'));
                return;
            }
            results.forEach((s) => {
                const row = el('div', '');
                row.style.cssText = 'display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:6px 8px;';
                const info = el('div', '');
                info.style.cssText = 'flex:1;min-width:0;';
                const nameEl = el('div', '', s.name);
                nameEl.style.cssText = 'font-size:.76rem;font-weight:700;color:#e8f4f2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
                const metaEl = el('div', '', [s.country, s.tags].filter(Boolean).join(' · '));
                metaEl.style.cssText = 'font-size:.62rem;color:#9fb0ae;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
                info.append(nameEl, metaEl);
                const addBtn = el('button', 's936lib-gpaddbtn', '+ Agregar');
                addBtn.onclick = () => { addRadioStation(s); addBtn.textContent = '✓'; addBtn.disabled = true; };
                row.append(info, addBtn);
                resultsWrap.appendChild(row);
            });
        };
        searchBtn.onclick = doSearch;
        searchInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') doSearch(); });

        const sep = el('div', '');
        sep.style.cssText = 'border-top:1px solid rgba(255,255,255,.08);margin-top:10px;padding-top:10px;display:flex;flex-direction:column;gap:6px;';
        sep.appendChild(el('div', 's936lib-gplabel', 'O pega tu propio enlace de transmisión'));
        const nameInput = document.createElement('input');
        nameInput.placeholder = 'Nombre de la emisora';
        nameInput.style.cssText = 'background:#1c2224;border:1px solid #333;border-radius:8px;padding:7px 9px;color:#e8f4f2;font-size:.78rem;font-family:inherit;';
        const urlInput = document.createElement('input');
        urlInput.placeholder = 'https://... (enlace directo del stream)';
        urlInput.style.cssText = 'background:#1c2224;border:1px solid #333;border-radius:8px;padding:7px 9px;color:#e8f4f2;font-size:.78rem;font-family:inherit;';
        const addManualBtn = el('button', 's936lib-actionbtn', '+ Agregar enlace');
        addManualBtn.style.alignSelf = 'flex-start';
        addManualBtn.onclick = () => {
            if(!urlInput.value.trim()) return;
            addRadioStation({ name: nameInput.value, streamUrl: urlInput.value });
            closeRadioAddPopover();
        };
        sep.append(nameInput, urlInput, addManualBtn);
        pop.appendChild(sep);

        pop.addEventListener('click', (e) => e.stopPropagation());
        document.body.appendChild(pop);
        positionFloatingPopover(pop, anchorEl);
        radioAddPopoverEl = pop;
    }
    document.addEventListener('click', (e) => {
        if(radioAddPopoverEl && !e.target.closest('.s936lib-gppopover') && !e.target.closest('[data-radio-add-btn]')) closeRadioAddPopover();
    });

    // Radio reutiliza el MISMO <audio> que Composiciones/MP3 — una
    // transmisión de radio es audio continuo, no necesita un motor aparte.
    // Por eso hereda gratis: ecualizador reactivo real, modo mini, volumen.
    async function playRadioStation(id){
        const station = store.radio.find(x => x.id === id);
        if(!station || !station.streamUrl) return;
        currentPlayingRadioId = id;
        currentPlayingComp = null;
        currentPlayingId = null;
        lastActiveSource = 'local';
        lcdError = false;
        lcdLoading = true;
        if(ytPlayer && typeof ytPlayer.pauseVideo === 'function'){ try { ytPlayer.pauseVideo(); } catch(_) {} }
        if(!audioEl){
            audioEl = new Audio();
            audioEl.volume = playerVolume / 100;
            audioEl.addEventListener('ended', () => { stopEqAnimation(); syncVisibleAudioPlaybackState?.(); playNextInQueue(); });
            audioEl.addEventListener('timeupdate', updateLcd);
            audioEl.addEventListener('loadedmetadata', updateLcd);
            audioEl.addEventListener('loadstart', () => { lcdLoading = true; updateLcd(); });
            audioEl.addEventListener('canplay', () => { lcdLoading = false; updateLcd(); });
            audioEl.addEventListener('playing', () => {
                lastActiveSource = 'local';
                lcdLoading = false; lcdError = false;
                startEqAnimation();
                syncVisibleAudioPlaybackState?.();
                updateLcd();
                renderTransportState?.();
            });
            audioEl.addEventListener('pause', () => {
                if(lastActiveSource === 'local') stopEqAnimation();
                syncVisibleAudioPlaybackState?.();
                updateLcd();
                renderTransportState?.();
            });
            audioEl.addEventListener('error', () => {
                lcdLoading = false; lcdError = true;
                stopEqAnimation();
                syncVisibleAudioPlaybackState?.();
                updateLcd();
                renderTransportState?.();
            });
        }
        // Cambio 221: si el enlace es una LISTA de reproducción (.pls/.m3u),
        // se resuelve a la URL de audio real antes de asignarla — un
        // <audio> no puede reproducir el archivo de lista directamente.
        // El "token" evita que, si cambias de emisora rápido, una
        // resolución vieja termine sonando encima de la nueva.
        const myToken = ++radioPlayToken;
        const resolvedUrl = await resolveRadioStreamUrl(station.streamUrl);
        if(myToken !== radioPlayToken) return; // elegiste otra radio mientras tanto
        audioEl.src = resolvedUrl;
        audioEl.play().catch(() => { lcdLoading = false; updateLcd(); });
        updateLcd(null, station.name, station.country || station.tags || '');
        render();
        // Cambio 221: si a los 8 segundos NO empezó a sonar de verdad
        // (evento 'playing' real), se marca como error en vez de dejar el
        // LCD diciendo "reproduciendo" para siempre sin sonido — causa
        // típica: la emisora bloquea reproducción externa o el stream
        // quedó caído.
        setTimeout(() => {
            if(myToken !== radioPlayToken) return;
            if(currentPlayingRadioId === id && audioEl && audioEl.paused){
                lcdLoading = false;
                lcdError = true;
                updateLcd();
            }
        }, 8000);
    }

    function buildRadioVisual(){
        const wrap = el('div', 's936lib-compvisual s936lib-mini-keep');
        const playingStation = currentPlayingRadioId ? store.radio.find(x => x.id === currentPlayingRadioId) : null;
        if(playingStation && playingStation.favicon){
            const bg = el('div', 's936lib-compvisual-media s936lib-compvisual-zoom');
            bg.style.backgroundImage = `url('${playingStation.favicon}')`;
            wrap.appendChild(bg);
        } else if(playingStation){
            wrap.classList.add('s936sc-wrap');
            if(audioEl && !audioEl.paused) wrap.classList.add('is-active');
            wrap.innerHTML = buildSonicCoverSvg(playingStation, 'radio');
        } else {
            wrap.classList.add('s936sc-wrap');
            wrap.innerHTML = buildSonicCoverSvg({ id:'s936-empty-radio', title:'' }, 'radio');
        }
        if(!playingStation) wrap.appendChild(el('div', 's936lib-compvisual-hint', 'Elige "▶ Play" en una radio para verla aquí'));
        return wrap;
    }

    function buildRadioThumb(station, className){
        const thumb = el('div', className);
        if(station.favicon){
            thumb.style.backgroundImage = `url('${station.favicon}')`;
        } else {
            thumb.classList.add('s936sc-wrap');
            thumb.innerHTML = buildSonicCoverSvg(station, 'radio');
        }
        return thumb;
    }

    function renderRadio(body){
        if(!searchQuery) body.appendChild(buildRadioVisual());
        const list = store.radio.filter(x => matchesSearch(x, [x.country, x.tags]));
        if(!list.length){
            body.appendChild(el('div', 's936lib-empty', store.radio.length ? 'Sin resultados.' : 'Todavía no tienes radios agregadas. Usa el botón "+ Agregar radio" arriba.'));
            return;
        }
        if(viewMode === 'grid'){
            const grid = el('div', 's936lib-ytgrid');
            list.forEach((station) => {
                const isPlaying = currentPlayingRadioId === station.id && !!audioEl && !audioEl.paused;
                const card = el('div', 's936lib-ytcard' + (isPlaying ? ' active' : ''));
                const thumb = buildRadioThumb(station, 's936lib-ytthumb');
                thumb.appendChild(el('div', 'playicon', isPlaying ? '⏸' : '▶'));
                const cardBody = el('div', 's936lib-ytcardbody');
                cardBody.appendChild(el('div', 's936lib-ytcardtitle', station.name));
                cardBody.appendChild(el('div', 's936lib-ytcardnotes', [station.country, station.tags].filter(Boolean).join(' · ') || 'Radio online'));
                const actions = el('div', 's936lib-ytcardactions');
                const playBtn = el('button', 's936lib-mini play', isPlaying ? '⏸ Sonando' : '▶ Play');
                playBtn.onclick = (e) => { e.stopPropagation(); playRadioStation(station.id); };
                actions.append(playBtn, genreTag('radio', station));
                const kebabItems = [
                    { icon:'✎', label:'Cambiar nombre', onClick: () => renameRadio(station.id) },
                    { icon:'🏷', label:'Agregar a lista', onClick: () => openEditPlaylistsOnlyPopover('radio', station) }
                ];
                if(station.homepage) kebabItems.push({ icon:'↗', label:'Abrir página de la emisora', onClick: () => window.open(station.homepage, '_blank', 'noopener') });
                kebabItems.push({ icon:'⧉', label:'Copiar enlace', onClick: () => { navigator.clipboard?.writeText(station.streamUrl); } });
                kebabItems.push({ icon:'✕', label:'Borrar', danger:true, onClick: () => deleteRadio(station.id) });
                actions.appendChild(buildKebabMenu(kebabItems));
                cardBody.appendChild(actions);
                card.append(thumb, cardBody);
                card.onclick = () => playRadioStation(station.id);
                grid.appendChild(card);
            });
            body.appendChild(grid);
        } else {
            const listWrap = el('div', 's936lib-listwrap');
            list.forEach((station) => {
                const isPlaying = currentPlayingRadioId === station.id && !!audioEl && !audioEl.paused;
                const row = el('div', 's936lib-list-row' + (isPlaying ? ' playing' : ''));
                const thumb = buildRadioThumb(station, 's936lib-list-thumb');
                const title = el('div', 's936lib-list-title', station.name);
                const meta = el('div', 's936lib-list-meta', [station.country, station.tags].filter(Boolean).join(' · ') || 'Radio online');
                const actions = el('div', 's936lib-list-actions');
                const playBtn = el('button', 's936lib-mini play', isPlaying ? '⏸' : '▶');
                playBtn.onclick = (e) => { e.stopPropagation(); playRadioStation(station.id); };
                actions.append(playBtn, genreTag('radio', station));
                const kebabItems = [
                    { icon:'✎', label:'Cambiar nombre', onClick: () => renameRadio(station.id) },
                    { icon:'🏷', label:'Agregar a lista', onClick: () => openEditPlaylistsOnlyPopover('radio', station) }
                ];
                if(station.homepage) kebabItems.push({ icon:'↗', label:'Abrir página de la emisora', onClick: () => window.open(station.homepage, '_blank', 'noopener') });
                kebabItems.push({ icon:'⧉', label:'Copiar enlace', onClick: () => { navigator.clipboard?.writeText(station.streamUrl); } });
                kebabItems.push({ icon:'✕', label:'Borrar', danger:true, onClick: () => deleteRadio(station.id) });
                actions.appendChild(buildKebabMenu(kebabItems));
                row.append(thumb, title, meta, actions);
                row.onclick = () => playRadioStation(station.id);
                listWrap.appendChild(row);
            });
            body.appendChild(listWrap);
        }
    }

    function togglePlayPause(){
        if(lastActiveSource === 'youtube' && ytPlayer){
            try {
                if(isYoutubePlaying) ytPlayer.pauseVideo();
                else ytPlayer.playVideo();
            } catch(_) {}
            return;
        }
        if(!audioEl || !audioEl.src) return;
        if(audioEl.paused) audioEl.play().catch(()=>{});
        else audioEl.pause();
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

    async function deleteAudio(id){
        const item = store.audios.find(x => x.id === id);
        if(!item) return;
        if(!await s936Confirm('¿Quitar "' + item.title + '" de tus audios?')) return;
        store.audios = store.audios.filter(x => x.id !== id);
        if(audioObjectURLs[id]){ try { URL.revokeObjectURL(audioObjectURLs[id]); } catch(_) {} }
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

    // Cambio 202: si este MP3 ya está vinculado como audio de referencia de
    // alguna composición, se considera "de Studio 936" — hereda su
    // carátula/autor en vez de mostrar el ícono genérico.
    function audioLinkedComposition(audioId){
        return store.compositions.find(c => c.previewAudioId === audioId) || null;
    }

    function buildAudioThumb(song, className, isActive){
        const thumb = el('div', className);
        const linkedComp = audioLinkedComposition(song.id);
        const videoUrl = linkedComp ? albumVideoUrl(linkedComp.albumId) : null;
        const coverUrl = linkedComp ? compositionCoverUrl(linkedComp) : null;
        if(videoUrl){
            const video = document.createElement('video');
            video.src = videoUrl; video.autoplay = true; video.loop = true; video.muted = true; video.playsInline = true;
            video.style.cssText = 'width:100%;height:100%;object-fit:cover;';
            thumb.appendChild(video);
        } else if(coverUrl){
            thumb.style.backgroundImage = `url('${coverUrl}')`;
        } else {
            thumb.classList.add('s936sc-wrap');
            if(isActive) thumb.classList.add('is-active');
            thumb.innerHTML = buildSonicCoverSvg(song, 'audios');
        }
        return thumb;
    }

    // Cambio 202: pantalla grande de "ahora suena" para Audio MP3, mismo
    // espíritu que la de Composiciones — carátula/video de la composición
    // vinculada, o el ícono de ondas si no hay ninguna.
    function buildAudioVisual(){
        const wrap = el('div', 's936lib-compvisual s936lib-mini-keep');
        const playingSong = (currentPlayingId && !currentPlayingComp) ? store.audios.find(x => x.id === currentPlayingId) : null;
        const isActuallyPlaying = !!(playingSong && audioEl && !audioEl.paused);
        const linkedComp = playingSong ? audioLinkedComposition(playingSong.id) : null;
        const videoUrl = linkedComp ? albumVideoUrl(linkedComp.albumId) : null;
        const coverUrl = linkedComp ? compositionCoverUrl(linkedComp) : null;
        if(videoUrl){
            const video = document.createElement('video');
            video.src = videoUrl; video.autoplay = true; video.loop = true; video.muted = true; video.playsInline = true;
            video.className = 's936lib-compvisual-media';
            wrap.appendChild(video);
        } else if(coverUrl){
            const bg = el('div', 's936lib-compvisual-media s936lib-compvisual-zoom');
            bg.style.backgroundImage = `url('${coverUrl}')`;
            wrap.appendChild(bg);
        } else if(playingSong){
            wrap.classList.add('s936sc-wrap');
            if(isActuallyPlaying) wrap.classList.add('is-active');
            wrap.innerHTML = buildSonicCoverSvg(playingSong, 'audios');
        } else {
            wrap.classList.add('s936sc-wrap');
            wrap.innerHTML = buildSonicCoverSvg({ id:'s936-empty-audio', title:'' }, 'audios');
        }
        if(!playingSong) wrap.appendChild(el('div', 's936lib-compvisual-hint', 'Elige "▶ Play" en un audio para verlo aquí'));
        return wrap;
    }

    function renderAudios(body){
        // En la ventana normal, una búsqueda prioriza los resultados. En
        // Mini Player la carátula/fallback es obligatoria aunque hubiera
        // quedado una búsqueda activa antes de minimizar.
        if(windowState === 'mini' || (!searchQuery && !activePlaylistFilter && !activeGenreFilter)) body.appendChild(buildAudioVisual());
        const list = store.audios.filter(x => matchesSearch(x, [x.fileName]) && (!activeGenreFilter || x.genre === activeGenreFilter));
        if(!list.length){
            if(viewMode === 'grid' && !store.audios.length){
                const grid = el('div', 's936lib-ytgrid');
                grid.appendChild(buildImportTile());
                body.appendChild(grid);
                return;
            }
            body.appendChild(el('div', 's936lib-empty', store.audios.length ? 'Sin resultados.' : 'Todavía no has importado audios. Usa "Importar MP3/MP4" arriba.'));
            return;
        }
        if(viewMode === 'grid'){
            const grid = el('div', 's936lib-ytgrid');
            grid.appendChild(buildImportTile());
            list.forEach((song) => {
                const isPlaying = isLocalAudioActuallyPlaying(song.id);
                const linkedComp = audioLinkedComposition(song.id);
                const card = el('div', 's936lib-ytcard' + (isPlaying ? ' active' : ''));
                card.dataset.s936AudioId = song.id;
                const thumb = buildAudioThumb(song, 's936lib-ytthumb', isPlaying);
                thumb.appendChild(el('div', 'playicon', isPlaying ? '⏸' : '▶'));
                const cardBody = el('div', 's936lib-ytcardbody');
                cardBody.appendChild(el('div', 's936lib-ytcardtitle', displayAudioTitle(song.title)));
                cardBody.appendChild(el('div', 's936lib-ytcardnotes', (linkedComp ? '🎼 ' + linkedComp.title + ' · ' : '') + ((linkedComp && linkedComp.author) || song.author || 'Sin autor')));
                const actions = el('div', 's936lib-ytcardactions');
                const playBtn = el('button', 's936lib-mini play', isPlaying ? '⏸ Sonando' : '▶ Play');
                playBtn.onclick = (e) => { e.stopPropagation(); toggleAudioFromLibrary(song.id); };
                const qBtn = el('button', 's936lib-iconbtn' + (queue.includes(song.id) ? ' active' : ''), '➕');
                qBtn.title = queue.includes(song.id) ? 'En cola — quitar' : 'Agregar a la cola';
                qBtn.onclick = (e) => { e.stopPropagation(); toggleQueue(song.id); };
                actions.append(playBtn, qBtn, genreTag('audios', song));
                const kebab = buildKebabMenu([
                    { icon:'✎', label:'Cambiar nombre', onClick: () => renameAudio(song.id) },
                    { icon:'🏷', label:'Agregar a lista', onClick: () => openEditPlaylistsOnlyPopover('audios', song) },
                    { icon:'✕', label:'Quitar', danger:true, onClick: () => deleteAudio(song.id) }
                ]);
                actions.appendChild(kebab);
                cardBody.appendChild(actions);
                card.append(thumb, cardBody);
                card.onclick = () => toggleAudioFromLibrary(song.id);
                grid.appendChild(card);
            });
            body.appendChild(grid);
        } else {
            const listWrap = el('div', 's936lib-listwrap');
            list.forEach((song) => {
                const isPlaying = isLocalAudioActuallyPlaying(song.id);
                const linkedComp = audioLinkedComposition(song.id);
                const row = el('div', 's936lib-list-row' + (isPlaying ? ' playing' : ''));
                row.dataset.s936AudioId = song.id;
                const thumb = buildAudioThumb(song, 's936lib-list-thumb', isPlaying);
                const title = el('div', 's936lib-list-title', displayAudioTitle(song.title));
                const meta = el('div', 's936lib-list-meta', (linkedComp ? '🎼 ' + linkedComp.title + ' · ' : '') + ((linkedComp && linkedComp.author) || song.author || 'Sin autor'));
                const actions = el('div', 's936lib-list-actions');
                const playBtn = el('button', 's936lib-mini play', isPlaying ? '⏸' : '▶');
                playBtn.onclick = (e) => { e.stopPropagation(); toggleAudioFromLibrary(song.id); };
                const qBtn = el('button', 's936lib-iconbtn' + (queue.includes(song.id) ? ' active' : ''), '➕');
                qBtn.title = queue.includes(song.id) ? 'En cola — quitar' : 'Agregar a la cola';
                qBtn.onclick = (e) => { e.stopPropagation(); toggleQueue(song.id); };
                actions.append(playBtn, qBtn, genreTag('audios', song));
                const kebab = buildKebabMenu([
                    { icon:'✎', label:'Cambiar nombre', onClick: () => renameAudio(song.id) },
                    { icon:'🏷', label:'Agregar a lista', onClick: () => openEditPlaylistsOnlyPopover('audios', song) },
                    { icon:'✕', label:'Quitar', danger:true, onClick: () => deleteAudio(song.id) }
                ]);
                actions.appendChild(kebab);
                row.append(thumb, title, meta, actions);
                row.onclick = () => toggleAudioFromLibrary(song.id);
                listWrap.appendChild(row);
            });
            body.appendChild(listWrap);
        }
    }

    // ---------------------------------------------------------------
    // LCD — "ahora suena" persistente (visible en cualquier pestaña)
    // ---------------------------------------------------------------
    // Cambio 209: qué tipo de contenido está sonando ahora mismo — se
    // deduce de datos ya reales (nunca inventados): si el <audio> tiene
    // fuente, es composición o audio MP3 según currentPlayingComp; si no,
    // puede ser YouTube (lcdYoutubeTitle); si nada de eso, está inactivo.
    function lcdContentType(){
        if(lastActiveSource === 'youtube' && lcdYoutubeTitle) return 'youtube';
        if(lastActiveSource === 'local' && audioEl && audioEl.src && currentPlayingRadioId) return 'radio';
        if(lastActiveSource === 'local' && audioEl && audioEl.src && currentPlayingId) return currentPlayingComp ? 'compositions' : 'audios';
        // Compatibilidad si por alguna razón el rastreador no se llegó a
        // fijar (ej. sesión ya abierta antes de este cambio).
        if(audioEl && audioEl.src && currentPlayingRadioId) return 'radio';
        if(audioEl && audioEl.src && currentPlayingId) return currentPlayingComp ? 'compositions' : 'audios';
        if(lcdYoutubeTitle) return 'youtube';
        return null;
    }
    function lcdStatusLabel(type){
        if(type === 'youtube') {
            if(youtubeStatus === 'loading') return '◌ MINI ROCKOLA · CARGANDO';
            if(youtubeStatus === 'playing') return '▶ MINI ROCKOLA · REPRODUCIENDO';
            if(youtubeStatus === 'paused') return 'Ⅱ MINI ROCKOLA · PAUSADO';
            if(youtubeStatus === 'ended') return 'MINI ROCKOLA · FINALIZADO';
            if(youtubeStatus === 'error') return 'MINI ROCKOLA · ERROR';
            return 'MINI ROCKOLA';
        }
        if(!type) return '';
        const typeLabel = type === 'compositions' ? 'COMPOSICIÓN' : type === 'radio' ? 'RADIO' : 'AUDIO MP3';
        const icon = type === 'compositions' ? '◆' : type === 'radio' ? '📻' : '〜';
        let state = 'REPRODUCIENDO';
        if(lcdError) state = 'ERROR';
        else if(lcdLoading) state = 'CARGANDO';
        else if(audioEl && audioEl.paused) state = 'PAUSADO';
        return icon + ' ' + typeLabel + ' · ' + state;
    }

    function updateLcd(_evt, titleOverride, subOverride){
        const panel = document.getElementById(PANEL_ID);
        if(!panel) return;
        const lcdEl = panel.querySelector('.s936lib-lcd');
        const statusEl = panel.querySelector('.s936lib-lcdstatus');
        const titleEl = panel.querySelector('.s936lib-nowtitle');
        const timeEl = panel.querySelector('.s936lib-nowtime');
        const subEl = panel.querySelector('.s936lib-nowsub');
        const progressBar = panel.querySelector('.s936lib-progress b');
        const playBtn = panel.querySelector('.s936lib-playbtn');
        if(!titleEl) return;

        if(titleOverride){
            titleEl.title = titleOverride;
            titleEl.textContent = titleOverride;
            if(subEl){
                if(subOverride){ subEl.textContent = subOverride; subEl.style.display = ''; }
                else { subEl.textContent = ''; subEl.style.display = 'none'; }
            }
            lcdYoutubeTitle = null;
        } else if(lastActiveSource === 'youtube' && lcdYoutubeTitle){
            // YouTube es la última fuente activa — su título manda aunque
            // quede un audio local pausado y preparado para continuar.
            titleEl.title = lcdYoutubeTitle;
            titleEl.textContent = lcdYoutubeTitle;
            if(subEl){ subEl.textContent = ''; subEl.style.display = 'none'; }
            if(timeEl) timeEl.textContent = '';
        } else if(lastActiveSource === 'local' && audioEl && audioEl.src){
            // Cambio 216: el LCD vuelve a derivar título y subtítulo del
            // motor local real. Evita combinaciones incorrectas como estado
            // AUDIO MP3 con el título anterior de YouTube al reanudar.
            const meta = currentLocalLcdMeta();
            if(meta){
                titleEl.title = meta.title || '';
                titleEl.textContent = meta.title || '936 PLAYER';
                if(subEl){
                    subEl.textContent = meta.sub || '';
                    subEl.style.display = meta.sub ? '' : 'none';
                }
            }
        } else if(!audioEl || !audioEl.src || !currentPlayingId){
            // Cambio 172: si no hay audio sonando pero sí un video de
            // YouTube seleccionado, el LCD muestra su título — antes se
            // quedaba fijo en "Nada sonando" sin importar qué estuvieras
            // viendo.
            if(lcdYoutubeTitle){
                titleEl.title = lcdYoutubeTitle;
                titleEl.textContent = lcdYoutubeTitle;
                if(subEl){ subEl.textContent = ''; subEl.style.display = 'none'; }
                // Cambio 175: no hay forma de leer el tiempo real de un
                // iframe de YouTube — mostrar "--:-- / --:--" ahí se veía
                // como un reloj roto. Se deja en blanco en vez de un
                // placeholder que nunca se llena.
                if(timeEl) timeEl.textContent = '';
            } else {
                // Cambio 209: "936 PLAYER" vuelve a ser la identidad
                // central solo cuando no hay nada activo — mientras suena
                // algo, el protagonista es el título, no la marca.
                titleEl.title = '';
                titleEl.textContent = '936 PLAYER';
                if(subEl){ subEl.textContent = queue.length ? queue.length + ' en cola' : 'Selecciona música para comenzar'; subEl.style.display = ''; }
                if(timeEl) timeEl.textContent = '';
            }
        }

        const type = lcdContentType();
        if(statusEl) statusEl.textContent = lcdStatusLabel(type);
        if(lcdEl) lcdEl.classList.toggle('is-idle', !type);

        if(lastActiveSource === 'youtube' && ytPlayer){
            let current = 0, duration = 0;
            try { current = Number(ytPlayer.getCurrentTime?.() || 0); duration = Number(ytPlayer.getDuration?.() || 0); } catch(_) {}
            if(timeEl) timeEl.textContent = duration > 0 ? (fmtTime(current) + ' / ' + fmtTime(duration)) : '';
            if(progressBar) progressBar.style.width = duration > 0 ? ((current / duration) * 100) + '%' : '0%';
            if(playBtn) playBtn.textContent = isYoutubePlaying ? '⏸' : '⏵';
        } else {
            if(audioEl && timeEl && audioEl.src) timeEl.textContent = fmtTime(audioEl.currentTime) + ' / ' + fmtTime(audioEl.duration);
            if(progressBar) progressBar.style.width = (audioEl && audioEl.duration) ? ((audioEl.currentTime/audioEl.duration)*100) + '%' : '0%';
            if(playBtn) playBtn.textContent = (audioEl && audioEl.src && !audioEl.paused) ? '⏸' : '⏵';
        }

        // Cambio 209: estados visuales del ecualizador — cargando, error,
        // pausado — sin agregar temporizadores nuevos, solo clases CSS.
        if(lcdEl){
            const activeLoading = lastActiveSource === 'youtube' ? youtubeStatus === 'loading' : lcdLoading;
            const activeError = lastActiveSource === 'youtube' ? youtubeStatus === 'error' : lcdError;
            const activePaused = lastActiveSource === 'youtube'
                ? (youtubeStatus === 'paused' || youtubeStatus === 'ended')
                : !!(audioEl && audioEl.src && audioEl.paused && !lcdLoading && !lcdError);
            lcdEl.classList.toggle('is-loading', activeLoading);
            lcdEl.classList.toggle('is-error', activeError);
            lcdEl.classList.toggle('is-paused', activePaused);
        }
        if((lastActiveSource === 'local' && lcdError) || (lastActiveSource === 'youtube' && youtubeStatus === 'error')){
            titleEl.title = '';
            titleEl.textContent = 'NO SE PUDO REPRODUCIR';
            if(subEl){ subEl.textContent = 'Intenta nuevamente'; subEl.style.display = ''; }
        }

        // Cambio 208: anillo de progreso de la "936 Sonic Cover" activa —
        // solo se actualiza la que está sonando (tarjeta/fila activa o el
        // visual grande), nunca las demás carátulas del listado.
        if(audioEl && audioEl.duration){
            const pct = audioEl.currentTime / audioEl.duration;
            panel.querySelectorAll('.s936lib-ytcard.active .s936sc-progressring, .s936lib-list-row.playing .s936sc-progressring, .s936lib-compvisual .s936sc-progressring').forEach((ring) => {
                const c = parseFloat(ring.dataset.circumference || '289');
                ring.style.strokeDashoffset = String(c * (1 - pct));
            });
        }
    }

    // Cambio 209: la barra de progreso ahora es funcional de verdad — clic
    // o arrastre para saltar a una posición. Solo aplica cuando hay un
    // <audio> real con duración conocida (no YouTube — no tocamos ese
    // reproductor, tal como se pidió).
    function seekToPointerEvent(e, progressEl){
        const rect = progressEl.getBoundingClientRect();
        const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        if(lastActiveSource === 'youtube' && ytPlayer){
            try {
                const duration = Number(ytPlayer.getDuration?.() || 0);
                if(duration > 0) ytPlayer.seekTo(pct * duration, true);
            } catch(_) {}
            updateLcd();
            return;
        }
        if(!audioEl || !audioEl.duration) return;
        audioEl.currentTime = pct * audioEl.duration;
        updateLcd();
    }
    function wireProgressSeek(progressEl){
        let dragging = false;
        progressEl.addEventListener('mousedown', (e) => { dragging = true; progressEl.classList.add('is-dragging'); seekToPointerEvent(e, progressEl); });
        document.addEventListener('mousemove', (e) => { if(dragging) seekToPointerEvent(e, progressEl); });
        document.addEventListener('mouseup', () => { dragging = false; progressEl.classList.remove('is-dragging'); });
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
        if(windowState === 'maximized') searchQuery = '';
        currentYoutubeId = item.id;
        lcdYoutubeTitle = item.title;
        ytAutoplayNext = true;
        lastActiveSource = 'youtube';
        youtubeStatus = 'loading';
        isYoutubePlaying = false;
        // Sonido exclusivo: la selección de Rockola pausa el motor local.
        if(audioEl && !audioEl.paused) audioEl.pause();
        syncVisibleAudioPlaybackState();
        stopEqAnimation();
        stopYoutubeClock();
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

    async function deleteYoutube(id){
        const item = store.youtube.find(x => x.id === id);
        if(!item) return;
        if(!await s936Confirm('¿Borrar el favorito "' + item.title + '"?')) return;
        store.youtube = store.youtube.filter(x => x.id !== id);
        if(currentYoutubeId === id){
            currentYoutubeId = null;
            lcdYoutubeTitle = null;
            youtubeStatus = 'idle';
            isYoutubePlaying = false;
            stopEqAnimation();
            stopYoutubeClock();
        }
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
        const gp = buildGenrePlaylistFields({ genre:'', genreEditable:true, playlists:[], scopeType:'youtube' });
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
        if(ytPlayer){
            stopYoutubeStateWatch();
            try { ytPlayer.destroy(); } catch(_) {}
            ytPlayer = null;
        }
        embedSlot.innerHTML = '';
        if(!current){ stopYoutubeStateWatch(); lcdYoutubeTitle = null; updateLcd(); return; }
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
            ytPlayer = new window.YT.Player(iframeId, {
                events: {
                    onReady: (event) => {
                        try { event.target.setVolume(playerVolume); } catch(_) {}
                        startYoutubeStateWatch();
                    },
                    onStateChange: handleYtStateChange,
                    onError: handleYtError
                }
            });
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
                { icon:'🏷', label:'Editar listas', onClick: () => openEditPlaylistsOnlyPopover('youtube', item) },
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

    // Cambio 214: el arreglo anterior (mover el embed a un contenedor
    // oculto) SÍ cortaba el sonido — reubicar un iframe entre distintos
    // padres en el DOM hace que el navegador lo trate como si se
    // recargara. Ahora el embed se inserta en el cuerpo UNA sola vez y ya
    // nunca se mueve de ahí — solo se oculta con visibility (nunca
    // display:none, que también puede suspender el iframe), quedándose
    // exactamente en el mismo lugar del árbol del DOM para siempre.
    let ytEmbedSlotEl = null;

    function renderYoutube(body){
        if(!ytEmbedSlotEl){
            ytEmbedSlotEl = el('div', 's936lib-mini-keep');
            ytEmbedSlotEl.id = 's936lib-yt-embed-slot';
        }
        if(ytEmbedSlotEl.parentNode !== body) body.insertBefore(ytEmbedSlotEl, body.firstChild || null);
        // Al volver desde Audio/Composiciones/Recientes, retirar el DOM de
        // esa pestaña. Antes quedaba debajo de Rockola y parecía que sus
        // MP3 pertenecían a la lista de YouTube. El iframe nunca se toca.
        Array.from(body.children).forEach((child) => {
            if(child !== ytEmbedSlotEl && child.id !== 's936lib-yt-list-slot') child.remove();
        });
        ytEmbedSlotEl.classList.remove('s936-yt-hidden');
        let listSlot = body.querySelector('#s936lib-yt-list-slot');
        if(!listSlot){
            listSlot = el('div', ''); listSlot.id = 's936lib-yt-list-slot';
            body.appendChild(listSlot);
        }
        const current = store.youtube.find(x => x.id === currentYoutubeId) || store.youtube[0];
        renderYoutubeEmbed(ytEmbedSlotEl, current);
        renderYoutubeList(listSlot);
    }

    // ---------------------------------------------------------------
    // Géneros
    // ---------------------------------------------------------------
    const TYPE_ICON = { compositions:'🎼', audios:'🎧', youtube:'📺', radio:'📻' };
    const TYPE_LABEL = { compositions:'Composición', audios:'Audio', youtube:'YouTube', radio:'Radio' };

    // Cambio 205: Géneros se retiró (confirmado que no aportaba nada útil)
    // — este es el espacio reservado para "Comunidad", la idea de que los
    // compositores puedan publicar sus canciones públicamente, tipo mini
    // red social. Todavía no hace nada real: necesita cuentas de usuario y
    // storage real (el mismo backend que sigue pausado aparte) antes de
    // que esto pueda funcionar de verdad. El key interno sigue siendo
    // 'genres' para no romper nada de lo guardado.
    function renderGenres(body){
        const isEn = stageTabLabel() === 'Stage';
        const wrap = el('div', '');
        wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:60px 24px;gap:14px;color:#9fb0ae;';
        const icon = el('div', '', '🎤');
        icon.style.cssText = 'font-size:2.4rem;opacity:.7;';
        const title = el('div', '', isEn ? 'Stage — Coming soon' : 'Escenario — Próximamente');
        title.style.cssText = 'color:#5be8c9;font-size:1rem;font-weight:800;';
        const desc = el('div', '', isEn
            ? 'A place for composers and musicians to publish their songs and share them with others — like a mini social network for Studio 936.'
            : 'Un espacio para que compositores y músicos publiquen sus canciones y las compartan con otros — como una mini red social de Studio 936.');
        desc.style.cssText = 'font-size:.8rem;max-width:420px;line-height:1.6;';
        const note = el('div', '', isEn
            ? "Doesn't work yet: needs real user accounts and cloud storage, still pending separately."
            : 'Todavía no funciona: necesita cuentas de usuario y almacenamiento real en la nube, que sigue pendiente aparte.');
        note.style.cssText = 'font-size:.68rem;font-style:italic;color:#7a8785;max-width:380px;line-height:1.5;';
        wrap.append(icon, title, desc, note);
        body.appendChild(wrap);
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
        if(viewMode === 'grid'){
            const grid = el('div', 's936lib-ytgrid');
            items.forEach(({type, item}) => {
                const card = el('div', 's936lib-ytcard');
                let thumb;
                if(type === 'compositions') thumb = buildCompositionThumb(item, 's936lib-ytthumb');
                else if(type === 'audios') thumb = buildAudioThumb(item, 's936lib-ytthumb');
                else if(type === 'radio') thumb = buildRadioThumb(item, 's936lib-ytthumb');
                else {
                    thumb = el('div', 's936lib-ytthumb');
                    const thumbUrl = youtubeThumbUrl(item.url);
                    if(thumbUrl) thumb.style.backgroundImage = `url('${thumbUrl}')`;
                    else thumb.appendChild(el('div', 'ph', 'Sin miniatura'));
                }
                thumb.appendChild(el('div', 'playicon', '▶'));
                const cardBody = el('div', 's936lib-ytcardbody');
                cardBody.appendChild(el('div', 's936lib-ytcardtitle', item.title || item.name));
                cardBody.appendChild(el('div', 's936lib-ytcardnotes', TYPE_LABEL[type] + ' · ' + fmtDate(item.updated || item.addedAt)));
                card.append(thumb, cardBody);
                if(type === 'compositions') card.onclick = () => previewComposition(item.id, card);
                if(type === 'audios') card.onclick = () => playAudio(item.id);
                if(type === 'youtube') card.onclick = () => { activeTab = 'youtube'; selectYoutubeVideo(item); };
                if(type === 'radio') card.onclick = () => { activeTab = 'radio'; playRadioStation(item.id); };
                grid.appendChild(card);
            });
            body.appendChild(grid);
        } else {
            items.forEach(({type, item}) => {
                const row = el('div', 's936lib-list-row');
                row.append(
                    el('div', 's936lib-list-icon', TYPE_ICON[type]),
                    el('div', 's936lib-list-title', item.title || item.name),
                    el('div', 's936lib-list-meta', TYPE_LABEL[type] + ' · ' + fmtDate(item.updated || item.addedAt))
                );
                if(type === 'compositions') row.onclick = () => previewComposition(item.id, row);
                if(type === 'audios') row.onclick = () => playAudio(item.id);
                if(type === 'youtube') row.onclick = () => { activeTab = 'youtube'; selectYoutubeVideo(item); };
                if(type === 'radio') row.onclick = () => { activeTab = 'radio'; playRadioStation(item.id); };
                body.appendChild(row);
            });
        }
    }

    // ---------------------------------------------------------------
    // Toolbar contextual
    // ---------------------------------------------------------------
    function renderToolbar(toolbar){
        toolbar.innerHTML = '';
        toolbar.style.display = '';
        if(activeTab === 'genres'){
            // Cambio 205: "Comunidad" es un espacio reservado por ahora —
            // sin barra de búsqueda/filtros hasta que haya algo real que
            // buscar ahí.
            toolbar.style.display = 'none';
            return;
        }
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
            input.oninput = () => {
                searchQuery = input.value;
                syncMaximizedSearchOverlay();
                renderBodyOnly();
            };
            input.onkeydown = (e) => {
                if(e.key !== 'Escape') return;
                searchQuery = '';
                input.value = '';
                syncMaximizedSearchOverlay();
                renderBodyOnly();
            };
            bar.appendChild(input);
            const addBtn = el('button', 's936lib-iconbtn' + (ytFormOpen ? ' active' : ''), '+');
            addBtn.title = 'Agregar un video a tu lista';
            addBtn.style.cssText = 'width:34px;height:32px;font-size:1.1rem;flex-shrink:0;';
            addBtn.onclick = (e) => { e.stopPropagation(); toggleYoutubeAddPopover(addBtn); };
            toolbar.append(bar, buildPlaylistFilterButton(store.youtube), addBtn);
            return;
        }
        const search = document.createElement('input');
        search.className = 's936lib-search';
        search.placeholder = 'Buscar...';
        search.value = searchQuery;
        search.oninput = () => { searchQuery = search.value; renderBodyOnly(); };
        toolbar.appendChild(search);
        // Cambio 189: en Composiciones ya no se usa el filtro de "listas"
        // (playlists) — el álbum es el concepto de agrupación aquí, y ya
        // tiene sus propios chips debajo. Se evita el control redundante.
        if(activeTab !== 'compositions') toolbar.appendChild(buildPlaylistFilterButton(activeTab === 'audios' ? store.audios : activeTab === 'radio' ? store.radio : null));

        if(activeTab === 'compositions'){
            // Cambio 194: dos botones separados — la flecha filtra rápido
            // por álbum (mismo patrón que listas), y un botón aparte de
            // configuración (⚙) abre el modal completo (crear álbum,
            // carátula/video, carpeta).
            const configBtn = el('button', 's936lib-iconbtn', '⚙');
            configBtn.title = 'Configurar álbumes';
            configBtn.style.cssText = 'width:32px;height:32px;font-size:.85rem;flex-shrink:0;';
            configBtn.onclick = (e) => { e.stopPropagation(); openAlbumConfig(); };
            toolbar.append(buildAlbumFilterButton(), configBtn);
        } else if(activeTab === 'audios'){
            const btn = el('button', 's936lib-iconbtn', '⬆');
            btn.title = 'Subir MP3/MP4';
            btn.style.cssText = 'width:32px;height:32px;font-size:.85rem;flex-shrink:0;';
            const fileInput = document.createElement('input');
            fileInput.type = 'file'; fileInput.accept = 'audio/*,video/mp4'; fileInput.multiple = true; fileInput.style.display = 'none';
            fileInput.onchange = (e) => importAudioFiles(e.target.files, btn);
            btn.onclick = () => fileInput.click();
            toolbar.append(btn, fileInput);
        } else if(activeTab === 'radio'){
            const btn = el('button', 's936lib-iconbtn', '+');
            btn.title = 'Agregar radio';
            btn.setAttribute('data-radio-add-btn', '1');
            btn.style.cssText = 'width:32px;height:32px;font-size:1rem;flex-shrink:0;';
            btn.onclick = (e) => { e.stopPropagation(); openAddRadioPopover(btn); };
            toolbar.appendChild(btn);
        }
    }

    // ---------------------------------------------------------------
    // Render principal
    // ---------------------------------------------------------------
    // Cambio 218: la lista de YouTube en maximizado solo aparece como
    // resultados temporales cuando existe texto de búsqueda.
    function syncMaximizedSearchOverlay(){
        const panel = document.getElementById(PANEL_ID);
        if(!panel) return;
        panel.classList.toggle(
            's936lib-max-search-open',
            windowState === 'maximized' && activeTab === 'youtube' && Boolean(searchQuery.trim())
        );
    }

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
        // Cambio 214: si el embed de YouTube ya existe y sigue sonando, NO
        // se destruye ni se mueve de sitio — solo se oculta con una clase
        // (visibility), y se limpia todo lo demás del cuerpo a su
        // alrededor sin tocarlo.
        if(ytEmbedSlotEl && ytEmbedSlotEl.parentNode === body){
            ytEmbedSlotEl.classList.add('s936-yt-hidden');
            Array.from(body.children).forEach((child) => { if(child !== ytEmbedSlotEl) child.remove(); });
        } else {
            body.innerHTML = '';
        }
        if(activeTab === 'recent') renderRecent(body);
        else if(activeTab === 'compositions') renderCompositions(body);
        else if(activeTab === 'audios') renderAudios(body);
        else if(activeTab === 'radio') renderRadio(body);
        else if(activeTab === 'genres') renderGenres(body);
    }

    function renderTransportState(){
        const panel = document.getElementById(PANEL_ID);
        if(!panel) return;
        const playBtn = panel.querySelector('.s936lib-playbtn');
        const vol = panel.querySelector('.s936lib-vol');
        if(playBtn){
            playBtn.style.display = '';
            playBtn.disabled = lastActiveSource === 'youtube' ? !ytPlayer : !(audioEl && audioEl.src);
            playBtn.textContent = lastActiveSource === 'youtube'
                ? (isYoutubePlaying ? '⏸' : '⏵')
                : ((audioEl && audioEl.src && !audioEl.paused) ? '⏸' : '⏵');
        }
        if(vol) vol.style.display = '';
    }

    function render(){
        const panel = document.getElementById(PANEL_ID);
        if(!panel) return;
        closeAnyOpenMenu();
        closeYoutubeAddPopover();
        closeRadioAddPopover();
        panel.querySelectorAll('.s936lib-tab').forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === activeTab));
        panel.querySelectorAll('.s936lib-viewbtn').forEach((btn) => btn.classList.toggle('active', btn.dataset.view === viewMode));
        renderTransportState();
        const isYoutube = activeTab === 'youtube';
        panel.classList.toggle('s936lib-active-youtube', isYoutube);
        syncMaximizedSearchOverlay();
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
    // Cambio 206: "Escenario" en español, "Stage" en inglés — mismo sistema
    // de idioma (i18n-core) que ya usa la app para el género, por ejemplo.
    function stageTabLabel(){
        const core = window.Studio936I18nCore;
        const lang = core?.getLang?.() || 'es';
        return lang === 'en' ? 'Stage' : 'Escenario';
    }

    const TABS = [
        ['recent', 'Recientes'],
        ['compositions', 'Composiciones'],
        ['audios', 'Audio MP3'],
        ['youtube', 'Mini Rockola'],
        ['radio', 'Radio'],
        ['genres', stageTabLabel]
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
        const title = el('h2', '', 'MÚSICA');
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
            const btn = el('button', 's936lib-tab', typeof label === 'function' ? label() : label);
            btn.dataset.tab = key;
            btn.onclick = () => { activeTab = key; activeGenreFilter = null; activePlaylistFilter = null; activeAlbumFilter = null; searchQuery = ''; render(); };
            tabs.appendChild(btn);
        });

        const lcdWrap = el('div', 's936lib-lcdwrap');
        const lcd = el('div', 's936lib-lcd is-idle');
        const row1 = el('div', 'row1');
        const nowStatus = el('div', 's936lib-lcdstatus', '');
        const nowTime = el('div', 's936lib-nowtime', '');
        row1.append(nowStatus, nowTime);
        const nowTitle = el('div', 's936lib-nowtitle', '936 PLAYER');
        const nowSub = el('div', 's936lib-nowsub', 'Selecciona música para comenzar');
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
        // Cambio 209: la marca central se reduce a "936" (chico) mientras
        // suena algo — "936 PLAYER" (grande) ya es el título cuando no hay
        // nada activo, no hace falta repetirlo aquí también.
        const eqBrand = el('div', 's936lib-eqbrand', '936');
        eqRow.append(eqLeft, eqBrand, eqRight);
        const progress = el('div', 's936lib-progress');
        progress.appendChild(el('b'));
        wireProgressSeek(progress);
        lcd.append(row1, nowTitle, nowSub, eqRow, progress);
        lcdWrap.appendChild(lcd);

        const controlRow = el('div', 's936lib-controlrow');
        const prevBtn = el('button', '', '⏮');
        prevBtn.title = 'Antes en la cola';
        prevBtn.onclick = () => { lastActiveSource === 'youtube' ? youtubeListNav(-1) : (queue.length && playNextInQueue()); };
        const playBtn = el('button', 's936lib-playbtn', '⏵');
        playBtn.onclick = togglePlayPause;
        const nextBtn = el('button', '', '⏭');
        nextBtn.title = 'Siguiente en la cola';
        nextBtn.onclick = () => { lastActiveSource === 'youtube' ? youtubeListNav(1) : playNextInQueue(); };
        const toolbar = el('div', 's936lib-toolbar');
        const vol = el('div', 's936lib-vol');
        const volIcon = el('span', 's936lib-volicon', '🔊');
        volIcon.title = 'Volumen';
        const volSlider = document.createElement('input');
        volSlider.type = 'range'; volSlider.min = '0'; volSlider.max = '100'; volSlider.value = String(playerVolume);
        volSlider.oninput = () => {
            playerVolume = Number(volSlider.value);
            if(audioEl) audioEl.volume = playerVolume / 100;
            if(ytPlayer && typeof ytPlayer.setVolume === 'function'){ try { ytPlayer.setVolume(playerVolume); } catch(_) {} }
        };
        volIcon.onclick = (e) => { e.stopPropagation(); vol.classList.toggle('open'); };
        vol.append(volIcon, volSlider);
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
    function miniSourceTab(){
        if(lastActiveSource === 'youtube' && lcdYoutubeTitle) return 'youtube';
        if(lastActiveSource === 'local' && currentPlayingComp) return 'compositions';
        if(lastActiveSource === 'local' && currentPlayingId) return 'audios';
        return activeTab;
    }

    function setWindowState(newState){
        const panel = document.getElementById(PANEL_ID);
        const overlay = document.getElementById(PANEL_ID + 'Overlay');
        if(!panel || !overlay) return;
        const previousState = windowState;
        let mustRender = false;

        panel.classList.remove('s936lib-state-maximized', 's936lib-state-mini');
        overlay.classList.remove('s936lib-state-mini', 's936lib-state-maximized');
        windowState = newState;

        if(newState === 'maximized'){
            panel.classList.add('s936lib-state-maximized');
            overlay.classList.add('s936lib-state-maximized');
            panel.style.left = ''; panel.style.top = '';
            // Modo Práctica del Cambio 218: se conserva exactamente.
            if(document.fullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
            if(previousState === 'mini') tabBeforeMini = null;
            mustRender = true;
        } else if(newState === 'mini'){
            if(previousState !== 'mini') tabBeforeMini = activeTab;
            const sourceTab = miniSourceTab();
            if(sourceTab !== activeTab){
                activeTab = sourceTab;
                activeGenreFilter = null;
                activePlaylistFilter = null;
                activeAlbumFilter = null;
                searchQuery = '';
            }
            panel.classList.add('s936lib-state-mini');
            overlay.classList.add('s936lib-state-mini');
            const pos = miniPos || { left: window.innerWidth - 380, top: window.innerHeight - 320 };
            panel.style.left = Math.max(8, pos.left) + 'px';
            panel.style.top = Math.max(8, pos.top) + 'px';
            if(document.fullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
            mustRender = true;
        } else {
            if(previousState === 'mini' && tabBeforeMini){
                activeTab = tabBeforeMini;
                tabBeforeMini = null;
            }
            panel.style.left = ''; panel.style.top = '';
            if(document.fullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
            mustRender = true;
        }

        syncMaximizedSearchOverlay();
        if(mustRender) render();
    }

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
        saveCurrentComposition,
        // Cambio 201: para cuando se conecte el guardado real del lado del
        // editor (pendiente, según Val) — guarda o actualiza según cuál
        // composición esté marcada como "actual" (la última que se abrió).
        saveOrUpdateCurrent,
        getCurrentOpenCompositionId,
        setCurrentOpenCompositionId
    };
})();
