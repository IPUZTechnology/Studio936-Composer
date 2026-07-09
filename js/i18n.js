(function(){
    'use strict';
    const LANG_KEY = 'pianoComposerUiLangV15';
    let lang = localStorage.getItem(LANG_KEY) || 'es';

    const sectionEsToEn = {
        'Introducción':'Introduction','Verso':'Verse','Verso 1':'Verse 1','Verso 2':'Verse 2','Verso 3':'Verse 3','Pre-coro':'Pre-chorus','Coro':'Chorus','Interludio':'Interlude','Solo':'Solo'
    };
    const sectionEnToEs = Object.fromEntries(Object.entries(sectionEsToEn).map(([k,v])=>[v,k]));

    const texts = {
        es: {
            toggle:'EN', htmlLang:'es', title:'Studio 936 Composer - MIDI + Diapasón + Routing + Afinación',
            version:'v25 · MIDI · Diapasón · Routing · Afinación',
            songAria:'Nombre de la canción', authorAria:'Autor de la canción', authorPlaceholder:'Autor / Compositor',
            styleTitle:'Tipo de música', instrumentTitle:'Instrumento guía', sectionTitle:'Sección de la canción',
            labels:{currentSection:'Sección actual', currentChord:'Acorde actual', selectedChord:'Acorde seleccionado', name:'Nombre', bass:'Bajo', chordNotes:'Notas del acorde', bars:'Compases', grooveVol:'Volumen groove', selectedNoteMap:'Mapa de notas de la sección seleccionada', key:'Tonalidad de esta sección', scale:'Escala', melody:'Melodía / solo de esta sección'},
            cardTitles:['Editor de progresión','Sección y melodía / solo','Guardar / compartir','Mapa de ritmos'],
            buttons:{start:'Start Groove', stop:'Stop Groove', playSong:'Escuchar canción', stopSong:'Stop canción', metroOn:'Metrónomo ON 🔊', metroOff:'Metrónomo OFF', soloOn:'Solo ON', soloOff:'Solo OFF', chordOn:'Acorde ON', chordOff:'Acorde OFF', save:'Guardar local', saved:'Guardado ✓', preview:'Escuchar', apply:'Aplicar', add:'Agregar acorde', dup:'Duplicar', del:'Borrar', resetSection:'Reset sección', resetAll:'Reset total', previewSolo:'Probar solo', generateSolo:'Sugerir frase', applySolo:'Guardar línea', clearSolo:'Limpiar línea', txt:'Bajar TXT', json:'Bajar JSON', copy:'Copiar', import:'Importar JSON', lyrics:'Letra / TAB', help:'Ayuda', saveLyrics:'Guardar letra', close:'Cerrar'},
            options:{
                styles:{funk:'Funk',rock:'Rock',ballad:'Balada',bossa:'Bossa Nova',jazz:'Jazz',blues:'Blues',pop:'Pop',bolero:'Bolero',salsa:'Salsa',cumbia:'Cumbia',reggae:'Reggae'},
                instruments:{piano:'Piano',epiano:'Piano eléctrico',guitar:'Guitarra',ukulele:'Ukelele',organ:'Órgano',sax:'Saxo guía',synth:'Synth'},
                sections:{intro:'Introducción',verse:'Verso',verse1:'Verso 1',verse2:'Verso 2',verse3:'Verso 3',prechorus:'Pre-coro',chorus:'Coro',interlude:'Interludio',solo:'Solo'},
                scales:{minorPent:'Pentatónica menor',majorPent:'Pentatónica mayor',blues:'Blues',dorian:'Dórica',mixolydian:'Mixolidia',major:'Mayor',minor:'Menor natural'}
            },
            hints:{
                editor:'Notas: usa inglés o solfeo. Ejemplos: <b>C3 E3 G3 Bb3</b> o <b>Do3 Mi3 Sol3 Sib3</b>. Cada acorde puede durar 1, 2, 4 o más compases.',
                solo:'Cada sección tiene su propia melodía/solo. Formato: <b>C4:2</b> = nota C4 durante 2 semicorcheas. <b>R:2</b> = silencio. Sin número dura 2 semicorcheas.',
                save:'Auto-guardado local activo. Botón Guardar local = navegador actual. Respaldo real = Bajar JSON.'
            },
            styleHelp:{
                funk:'Funk: semicorcheas, contratiempos, ghost chords y bajo sincopado. Ideal para sentir acompañamiento rítmico.',
                rock:'Rock: pulso fuerte en negras/corcheas, bajo sólido y acordes más directos.',
                ballad:'Balada: acompañamiento abierto con arpegio. Menos golpes, más aire y sostén armónico.',
                bossa:'Bossa Nova: bajo alternado y acordes en síncopas suaves, tipo guitarra/piano brasileño.',
                jazz:'Jazz: comping con swing, walking bass simplificado y acordes desplazados.',
                blues:'Blues: sensación shuffle, bajo repetido y golpes de acorde con respuesta.',
                pop:'Pop: patrón estable, claro para componer melodías y probar progresiones rápido.',
                bolero:'Bolero: bajo lento con acordes suaves en contratiempo. Útil para balada latina, canción romántica y acompañamiento cantable.',
                salsa:'Salsa: tumbao simplificado para piano, con bajo anticipado y acordes sincopados. No reemplaza una clave completa, pero da el sabor para componer.',
                cumbia:'Cumbia: pulso bailable, bajo estable y acordes en respuesta. Muy útil para progresiones latinas sencillas.',
                reggae:'Reggae: acordes en off-beat, bajo con mucho espacio y sensación relajada.'
            },
            instrumentGuide:'Instrumento guía',
            modal:{lyricsTitle:'Letra + TAB de la canción', lyricsNote:'Escribe la letra por sección. El mapa armónico aparece arriba para ubicarte mientras compones.', helpTitle:'Manual completo de Studio 936 Composer', helpNote:'Guía práctica para componer, practicar, escuchar, escribir letra, crear solos y guardar una canción completa.'}
        },
        en: {
            toggle:'ES', htmlLang:'en', title:'Studio 936 Composer - MIDI + Fretboard + Routing + Tuning',
            version:'v25 · MIDI · Fretboard · Routing · Tuning',
            songAria:'Song title', authorAria:'Song author', authorPlaceholder:'Author / Composer',
            styleTitle:'Music style', instrumentTitle:'Guide instrument', sectionTitle:'Song section',
            labels:{currentSection:'Current section', currentChord:'Current chord', selectedChord:'Selected chord', name:'Name', bass:'Bass', chordNotes:'Chord notes', bars:'Bars', grooveVol:'Groove volume', selectedNoteMap:'Note map of selected section', key:'Key of this section', scale:'Scale', melody:'Melody / solo for this section'},
            cardTitles:['Progression editor','Section and melody / solo','Save / share','Rhythm map'],
            buttons:{start:'Start Groove', stop:'Stop Groove', playSong:'Play full song', stopSong:'Stop song', metroOn:'Metronome ON 🔊', metroOff:'Metronome OFF', soloOn:'Solo ON', soloOff:'Solo OFF', chordOn:'Chord ON', chordOff:'Chord OFF', save:'Save local', saved:'Saved ✓', preview:'Preview', apply:'Apply', add:'Add chord', dup:'Duplicate', del:'Delete', resetSection:'Reset section', resetAll:'Reset all', previewSolo:'Test solo', generateSolo:'Suggest phrase', applySolo:'Save line', clearSolo:'Clear line', txt:'Download TXT', json:'Download JSON', copy:'Copy', import:'Import JSON', lyrics:'Lyrics / TAB', help:'Help', saveLyrics:'Save lyrics', close:'Close'},
            options:{
                styles:{funk:'Funk',rock:'Rock',ballad:'Ballad',bossa:'Bossa Nova',jazz:'Jazz',blues:'Blues',pop:'Pop',bolero:'Bolero',salsa:'Salsa',cumbia:'Cumbia',reggae:'Reggae'},
                instruments:{piano:'Piano',epiano:'Electric piano',guitar:'Guitar',ukulele:'Ukulele',organ:'Organ',sax:'Sax guide',synth:'Synth'},
                sections:{intro:'Introduction',verse:'Verse',verse1:'Verse 1',verse2:'Verse 2',verse3:'Verse 3',prechorus:'Pre-chorus',chorus:'Chorus',interlude:'Interlude',solo:'Solo'},
                scales:{minorPent:'Minor pentatonic',majorPent:'Major pentatonic',blues:'Blues',dorian:'Dorian',mixolydian:'Mixolydian',major:'Major',minor:'Natural minor'}
            },
            hints:{
                editor:'Notes: use English names or solfege. Examples: <b>C3 E3 G3 Bb3</b> or <b>Do3 Mi3 Sol3 Sib3</b>. Each chord can last 1, 2, 4 or more bars.',
                solo:'Each section has its own melody/solo. Format: <b>C4:2</b> = C4 for 2 sixteenth-note steps. <b>R:2</b> = rest. Without a number, the app uses a short default duration.',
                save:'Local autosave is active. Save local = this browser only. Real backup = Download JSON.'
            },
            styleHelp:{
                funk:'Funk: sixteenth-note feel, syncopation, ghost chords and syncopated bass. Great for rhythmic comping.',
                rock:'Rock: strong pulse, solid bass and direct chord hits.',
                ballad:'Ballad: open arpeggio feel. Fewer hits, more space and harmonic support.',
                bossa:'Bossa Nova: alternating bass and soft syncopated chords, close to Brazilian guitar/piano comping.',
                jazz:'Jazz: swung comping, simplified walking bass and displaced chord hits.',
                blues:'Blues: shuffle feel, repeated bass and call-response chord hits.',
                pop:'Pop: stable pattern for quickly testing melodies and progressions.',
                bolero:'Bolero: slow bass with soft off-beat chords. Useful for Latin ballads and romantic songs.',
                salsa:'Salsa: simplified piano tumbao with anticipated bass and syncopated chord hits. It is not a full clave engine, but it gives you the flavor for writing.',
                cumbia:'Cumbia: danceable stable pulse, steady bass and response chords. Useful for simple Latin progressions.',
                reggae:'Reggae: off-beat chords, spacious bass and relaxed feel.'
            },
            instrumentGuide:'Guide instrument',
            modal:{lyricsTitle:'Song lyrics + TAB', lyricsNote:'Write lyrics per section. The harmonic map appears above so you can stay oriented while composing.', helpTitle:'Complete Studio 936 Composer manual', helpNote:'Practical guide to compose, practice, listen, write lyrics, create solos and save a full song.'}
        }
    };

    function el(id){ return document.getElementById(id); }
    function q(sel, root=document){ return root.querySelector(sel); }
    function qa(sel, root=document){ return [...root.querySelectorAll(sel)]; }
    function T(){ return texts[lang] || texts.es; }
    function optionText(selectId, map){
        const s = el(selectId); if(!s) return;
        [...s.options].forEach(o => { if(map[o.value]) o.textContent = map[o.value]; });
    }
    function ensureLangButton(){
        if(el('langBtn')) return;
        const btn = document.createElement('button');
        btn.id = 'langBtn'; btn.type = 'button'; btn.className = 'lang-btn';
        btn.title = 'English / Español';
        const brand = q('.brand');
        if(brand) brand.appendChild(btn);
        btn.addEventListener('click', () => {
            lang = lang === 'es' ? 'en' : 'es';
            localStorage.setItem(LANG_KEY, lang);
            applyLanguage();
        });
    }
    function hasIconChild(node){ return !!(node && node.querySelector && (node.querySelector('img') || node.querySelector('svg'))); }
    function isIconOnlyBtn(node){ return !!(node && node.classList && (node.classList.contains('icon-btn') || node.classList.contains('img-icon-btn'))); }
    function setTextById(id, value){ const node = el(id); safeText(node, value); }
    function safeText(node, value){
        if(!node) return;
        // Cambio 121/138: los botones que muestran un ícono (imagen o SVG:
        // Compose, Studio 936, Chart, Metrónomo, Play Piano, Start Groove,
        // Escuchar canción) o que son puramente decorativos (Ayuda) no
        // deben perder su ícono cada vez que este sistema de traducción
        // "reaplica" texto. Se actualiza solo su <span class="btn-label">
        // (o el primer <span> de respaldo si no tiene esa clase) — nunca
        // se toca el ícono.
        if(hasIconChild(node)){
            const sp = node.querySelector('.btn-label') || node.querySelector('span');
            if(sp && sp.textContent !== value) sp.textContent = value;
            return;
        }
        if(isIconOnlyBtn(node)) return;
        if(node.textContent !== value) node.textContent = value;
    }
    function setButtonState(){
        const t = T().buttons;
        const playBtn = el('playBtn');
        if(playBtn) safeText(playBtn, playBtn.classList.contains('btn-stop') ? t.stop : t.start);
        const playSongBtn = el('playSongBtn');
        if(playSongBtn) safeText(playSongBtn, playSongBtn.classList.contains('active') ? t.stopSong : t.playSong);
        const metroBtn = el('metroBtn');
        if(metroBtn) safeText(metroBtn, metroBtn.classList.contains('active') ? t.metroOn : t.metroOff);
        const soloBtn = el('soloBtn');
        if(soloBtn) safeText(soloBtn, soloBtn.classList.contains('active') ? t.soloOn : t.soloOff);
        const chordBtn = el('chordHoldBtn');
        if(chordBtn) safeText(chordBtn, chordBtn.classList.contains('active') ? t.chordOn : t.chordOff);
        const saveBtn = el('saveBtn');
        if(saveBtn) safeText(saveBtn, /✓/.test(saveBtn.textContent) ? t.saved : t.save);
        const map = {previewBtn:t.preview, applyBtn:t.apply, addBtn:t.add, dupBtn:t.dup, deleteBtn:t.del, resetSectionBtn:t.resetSection, resetAllBtn:t.resetAll, previewSoloBtn:t.previewSolo, generateSoloBtn:t.generateSolo, applySoloBtn:t.applySolo, clearSoloBtn:t.clearSolo, txtBtn:t.txt, jsonBtn:t.json, copyBtn:t.copy, importBtn:t.import, lyricsBtn:t.lyrics, helpBtn:t.help, saveLyricsBtn:t.saveLyrics, closeLyricsBtn:t.close, closeHelpBtn:t.close};
        Object.entries(map).forEach(([id,txt])=>setTextById(id,txt));
    }
    function translateStaticAreas(){
        const t = T();
        document.documentElement.lang = t.htmlLang;
        document.title = t.title;
        const version = q('.brand small'); if(version) version.textContent = t.version;
        const btn = el('langBtn'); if(btn) btn.textContent = t.toggle;
        const title = el('songTitle'); if(title) title.setAttribute('aria-label', t.songAria);
        const author = el('songAuthor'); if(author){ author.setAttribute('aria-label', t.authorAria); author.placeholder = t.authorPlaceholder; }
        const style = el('styleSelect'); if(style) style.title = t.styleTitle;
        const instr = el('instrumentSelect'); if(instr) instr.title = t.instrumentTitle;
        const section = el('sectionSelect'); if(section) section.title = t.sectionTitle;
        const playBtnTip = el('playBtn'); if(playBtnTip) playBtnTip.setAttribute('data-tip', lang === 'en' ? 'Play Session' : 'Tocar Sección');
        const playSongBtnTip = el('playSongBtn'); if(playSongBtnTip) playSongBtnTip.setAttribute('data-tip', lang === 'en' ? 'Play Song' : 'Tocar Canción');
        optionText('styleSelect', t.options.styles);
        optionText('instrumentSelect', t.options.instruments);
        optionText('sectionSelect', t.options.sections);
        optionText('soloScale', t.options.scales);

        const smalls = qa('.label-small');
        if(smalls[0]) smalls[0].textContent = t.labels.currentSection;
        if(smalls[1]) smalls[1].textContent = t.labels.currentChord;
        const cards = qa('.editor > .card');
        if(cards[0]){
            const h = q('h3', cards[0]); if(h) h.textContent = t.cardTitles[0];
            const labels = qa('.field label', cards[0]);
            [t.labels.selectedChord,t.labels.name,t.labels.bass,t.labels.chordNotes,t.labels.bars,t.labels.grooveVol].forEach((txt,i)=>{ if(labels[i]) labels[i].textContent=txt; });
            const hint = q('.hint', cards[0]); if(hint) hint.innerHTML = t.hints.editor;
            const noteLabel = q('.note-map-box .label-small', cards[0]); if(noteLabel) noteLabel.textContent = t.labels.selectedNoteMap;
        }
        if(cards[1]){
            const h = q('h3', cards[1]); if(h) h.textContent = t.cardTitles[1];
            const labels = qa('.field label', cards[1]);
            [t.labels.key,t.labels.scale,t.labels.melody].forEach((txt,i)=>{ if(labels[i]) labels[i].textContent=txt; });
            const hint = q('.hint', cards[1]); if(hint) hint.innerHTML = t.hints.solo;
        }
        if(cards[2]){
            const h3 = qa('h3', cards[2]);
            if(h3[0]) h3[0].textContent = t.cardTitles[2];
            if(h3[1]) h3[1].textContent = t.cardTitles[3];
            const saveStatus = el('saveStatus'); if(saveStatus && /Auto|Local autosave|auto-guardado/i.test(saveStatus.textContent)) saveStatus.textContent = t.hints.save;
        }
        const lyricsTitle = q('#lyricsModal h2'); if(lyricsTitle) lyricsTitle.textContent = t.modal.lyricsTitle;
        const lyricsNote = q('#lyricsModal .arrangement-note'); if(lyricsNote) lyricsNote.textContent = t.modal.lyricsNote;
        const helpTitle = q('#helpModal h2'); if(helpTitle) helpTitle.textContent = t.modal.helpTitle;
        const helpNote = q('#helpModal .arrangement-note'); if(helpNote) helpNote.textContent = t.modal.helpNote;
        setButtonState();
        renderHelp();
        translateDynamicText();
        refreshStyleHelp();
    }
    function translateWordBlocks(s){
        if(!s) return s;
        const from = lang === 'en' ? sectionEsToEn : sectionEnToEs;
        Object.entries(from).forEach(([a,b]) => { s = s.replaceAll(a,b); });
        if(lang === 'en'){
            return s
                .replaceAll('Parte:', 'Part:')
                .replaceAll('Canción completa', 'Full song')
                .replaceAll('Compás', 'Bar')
                .replaceAll('Paso', 'Step')
                .replaceAll('Mostrando:', 'Showing:')
                .replaceAll('acorde(s)', 'chord(s)')
                .replaceAll('Bajo', 'Bass')
                .replaceAll('Notas', 'Notes')
                .replaceAll('compás(es)', 'bar(s)')
                .replaceAll('compases', 'bars')
                .replaceAll('comp.', 'bar(s)')
                .replaceAll('Modo manual', 'Manual mode')
                .replaceAll('Acorde', 'Chord');
        }
        return s
            .replaceAll('Part:', 'Parte:')
            .replaceAll('Full song', 'Canción completa')
            .replaceAll('Bar', 'Compás')
            .replaceAll('Step', 'Paso')
            .replaceAll('Showing:', 'Mostrando:')
            .replaceAll('chord(s)', 'acorde(s)')
            .replaceAll('Bass', 'Bajo')
            .replaceAll('Notes', 'Notas')
            .replaceAll('bar(s)', 'comp.')
            .replaceAll('Manual mode', 'Modo manual')
            .replaceAll('Chord', 'Acorde');
    }
    function translateDynamicText(){
        ['sectionLabel','measureLabel','chordLabel','currentPartTag','editorSectionBadge'].forEach(id=>{
            const n = el(id); if(n){ const v = translateWordBlocks(n.textContent); safeText(n, v); }
        });
        qa('.row-sub,.bars-pill,.map-line,.lyric-box label').forEach(n => { const v = translateWordBlocks(n.textContent); safeText(n, v); });
        qa('.lyric-box textarea').forEach(ta => {
            const section = ta.dataset.lyricSection;
            if(section && T().options.sections[section]) ta.placeholder = (lang === 'en' ? 'Lyrics for ' : 'Letra para ') + T().options.sections[section] + '...';
        });
        const mapTitle = q('#lyricsMap h3');
        if(mapTitle) mapTitle.textContent = lang === 'en' ? 'Harmonic / note map of the song' : 'Mapa armónico / notas de la canción';
    }
    function refreshStyleHelp(){
        const styleSelect = el('styleSelect'); const instrumentSelect = el('instrumentSelect'); const help = el('styleHelp');
        if(!styleSelect || !instrumentSelect || !help) return;
        const st = styleSelect.value || 'funk'; const inst = instrumentSelect.value || 'piano';
        help.textContent = (T().styleHelp[st] || T().styleHelp.funk) + ' · ' + T().instrumentGuide + ': ' + (T().options.instruments[inst] || inst) + '.';
    }
    function renderHelp(){
        const body = q('#helpModal .help-body'); if(!body) return;
        body.innerHTML = lang === 'en' ? helpEn() : helpEs();
    }
    function helpEs(){ return `
        <div class="help-block wide"><h3>Flujo recomendado para crear una canción</h3><div class="help-flow"><div class="help-step"><strong>1. Define la idea</strong>Escribe título, autor, estilo, instrumento guía y tempo.</div><div class="help-step"><strong>2. Construye secciones</strong>Selecciona Intro, Verso, Pre-coro, Coro, Interludio o Solo y edita sus acordes.</div><div class="help-step"><strong>3. Prueba el arreglo</strong>Usa Start Groove para una sección o Escuchar canción para toda la estructura.</div><div class="help-step"><strong>4. Guarda respaldo</strong>Usa Guardar local mientras trabajas y Bajar JSON para conservar el proyecto editable.</div></div><div class="help-note"><b>Regla de oro:</b> cada versión importante debe guardarse con <b>Bajar JSON</b>. Ese archivo es portable y se puede importar después.</div></div>
        <div class="help-block"><h3>1. Zona superior</h3><ul><li><b>Nombre:</b> título de la canción.</li><li><b>Autor:</b> compositor o creador. Sale en TXT y JSON.</li><li><b>Estilo:</b> cambia el patrón rítmico, no tus acordes.</li><li><b>Instrumento guía:</b> cambia el color sonoro para componer. No son samples profesionales.</li><li><b>Sección:</b> decide qué parte estás editando.</li><li><b>BPM:</b> velocidad del groove.</li><li><b>EN/ES:</b> cambia toda la interfaz y esta ayuda entre español e inglés.</li></ul></div>
        <div class="help-block"><h3>2. Ritmos</h3><table class="help-table"><tr><th>Ritmo</th><th>Uso</th></tr><tr><td>Funk</td><td>Contratiempos, ghost chords y bajo sincopado.</td></tr><tr><td>Rock</td><td>Golpes fuertes y directos.</td></tr><tr><td>Balada / Pop</td><td>Base estable para componer melodías.</td></tr><tr><td>Bossa / Jazz / Blues</td><td>Síncopas, swing o shuffle.</td></tr><tr><td>Bolero / Salsa / Cumbia / Reggae</td><td>Patrones latinos y off-beat para probar acompañamientos.</td></tr></table></div>
        <div class="help-block wide"><h3>3. Editor de progresión</h3><ol><li>Escoge una sección arriba.</li><li>Selecciona un acorde existente.</li><li><b>Nombre:</b> escribe el cifrado, por ejemplo <code>Fmaj13</code>.</li><li><b>Bajo:</b> escribe la nota grave con octava, por ejemplo <code>F2</code> o <code>Do2</code>.</li><li><b>Notas del acorde:</b> escribe las notas reales que tocará la app, por ejemplo <code>E3 A3 D4 F4</code>.</li><li><b>Compases:</b> define duración. Si cambia muy rápido, sube a 2 o 4.</li><li><b>Escuchar:</b> prueba sin guardar. <b>Aplicar:</b> guarda en la sección.</li></ol><div class="help-note">Debajo del editor aparece el mapa de notas de la sección seleccionada. Ahí verificas que estás editando la parte correcta.</div></div>
        <div class="help-block"><h3>4. Botones del editor</h3><ul><li><b>Agregar acorde:</b> añade uno nuevo.</li><li><b>Duplicar:</b> copia el acorde actual.</li><li><b>Borrar:</b> elimina el acorde seleccionado.</li><li><b>Reset sección:</b> restaura solo esa parte.</li><li><b>Reset total:</b> vuelve a la canción base.</li></ul></div>
        <div class="help-block"><h3>5. Formato de notas</h3><p>Acepta inglés y solfeo:</p><table class="help-table"><tr><th>Tipo</th><th>Ejemplo</th></tr><tr><td>Inglés</td><td><code>C3 E3 G3 Bb3</code></td></tr><tr><td>Solfeo</td><td><code>Do3 Mi3 Sol3 Sib3</code></td></tr><tr><td>Sostenidos</td><td><code>F#3</code> / <code>Fa#3</code></td></tr><tr><td>Bemoles</td><td><code>Bb3</code> / <code>Sib3</code></td></tr></table></div>
        <div class="help-block wide"><h3>6. Melodía / solo por sección</h3><p>Cada sección puede tener su propia frase. Con <b>Solo ON</b>, esa melodía suena encima de la progresión de la sección actual.</p><ol><li>Elige sección.</li><li>Define tonalidad y escala.</li><li>Escribe la frase: <code>C4:2 Eb4:2 R:2 G4:4</code>.</li><li><b>Probar solo:</b> escucha la frase sola.</li><li><b>Sugerir frase:</b> crea una idea automática.</li><li><b>Guardar línea:</b> la deja pegada a esa sección.</li></ol><div class="help-note"><code>R:2</code> significa silencio; el número representa pasos de semicorchea.</div></div>
        <div class="help-block"><h3>7. Reproducción</h3><ul><li><b>Start Groove:</b> loop de la sección seleccionada.</li><li><b>Escuchar canción:</b> reproduce la estructura completa.</li><li><b>Metrónomo:</b> click audible; el primer golpe marca el compás.</li><li><b>Acorde ON:</b> permite armar acordes tocando varias teclas o sumando notas.</li></ul><div class="help-note">En v15 se bloqueó el menú de clic derecho/long press en el teclado táctil para que no interrumpa los acordes.</div></div>
        <div class="help-block"><h3>8. Bombillitos</h3><ul><li><b>Verde:</b> acorde fuerte.</li><li><b>Magenta:</b> bajo.</li><li><b>Gris:</b> ghost chord.</li><li><b>Amarillo:</b> melodía/solo.</li><li><b>Borde blanco:</b> paso actual.</li></ul></div>
        <div class="help-block wide"><h3>9. Letra / TAB</h3><ol><li>Abre Letra / TAB.</li><li>Escribe letra por sección.</li><li>Usa el mapa armónico superior para ubicar acordes.</li><li>Guarda letra.</li><li>Baja TXT para tener documento con letra, acordes, bajos, notas y melodías. El idioma del documento sigue el botón EN/ES.</li></ol></div>
        <div class="help-block"><h3>10. Guardar y compartir</h3><ul><li><b>Guardar local:</b> guarda en este navegador.</li><li><b>Bajar JSON:</b> proyecto maestro editable.</li><li><b>Importar JSON:</b> carga un proyecto guardado.</li><li><b>Bajar TXT:</b> documento legible. Sale en el idioma activo: español si la interfaz está en ES, inglés si está en EN.</li><li><b>Copiar:</b> copia el TXT al portapapeles.</li></ul></div>
        <div class="help-block"><h3>11. Consejos rápidos</h3><ul><li>Empieza con Intro + Verso + Coro.</li><li>Usa pocos acordes y compases claros.</li><li>Para una melodía, deja silencios.</li><li>Para publicar audio final, produce luego en un DAW con instrumentos reales.</li></ul></div>
    `; }
    function helpEn(){ return `
        <div class="help-block wide"><h3>Recommended workflow to create a song</h3><div class="help-flow"><div class="help-step"><strong>1. Define the idea</strong>Write title, author, style, guide instrument and tempo.</div><div class="help-step"><strong>2. Build sections</strong>Select Intro, Verse, Pre-chorus, Chorus, Interlude or Solo and edit chords.</div><div class="help-step"><strong>3. Test the arrangement</strong>Use Start Groove for one section or Play full song for the whole structure.</div><div class="help-step"><strong>4. Save a backup</strong>Use Save local while working and Download JSON to preserve the editable project.</div></div><div class="help-note"><b>Golden rule:</b> every important version should be saved with <b>Download JSON</b>. That file is portable and can be imported later.</div></div>
        <div class="help-block"><h3>1. Top area</h3><ul><li><b>Song title:</b> project title.</li><li><b>Author:</b> composer or creator. It is exported to TXT and JSON.</li><li><b>Style:</b> changes the rhythmic pattern, not your chords.</li><li><b>Guide instrument:</b> changes the sound color for composing. These are not professional samples.</li><li><b>Section:</b> decides which part you are editing.</li><li><b>BPM:</b> groove speed.</li><li><b>EN/ES:</b> switches the UI and this manual between English and Spanish.</li></ul></div>
        <div class="help-block"><h3>2. Rhythms</h3><table class="help-table"><tr><th>Rhythm</th><th>Use</th></tr><tr><td>Funk</td><td>Syncopation, ghost chords and syncopated bass.</td></tr><tr><td>Rock</td><td>Strong direct hits.</td></tr><tr><td>Ballad / Pop</td><td>Stable base for writing melodies.</td></tr><tr><td>Bossa / Jazz / Blues</td><td>Syncopation, swing or shuffle.</td></tr><tr><td>Bolero / Salsa / Cumbia / Reggae</td><td>Latin and off-beat patterns to test accompaniments.</td></tr></table></div>
        <div class="help-block wide"><h3>3. Progression editor</h3><ol><li>Choose a section at the top.</li><li>Select an existing chord.</li><li><b>Name:</b> write the chord symbol, for example <code>Fmaj13</code>.</li><li><b>Bass:</b> write the low note with octave, for example <code>F2</code> or <code>Do2</code>.</li><li><b>Chord notes:</b> write the actual notes the app will play, for example <code>E3 A3 D4 F4</code>.</li><li><b>Bars:</b> duration. If it changes too fast, increase it to 2 or 4.</li><li><b>Preview:</b> test without saving. <b>Apply:</b> saves it into the section.</li></ol><div class="help-note">Below the editor you will see the note map of the selected section. Use it to confirm you are editing the right part.</div></div>
        <div class="help-block"><h3>4. Editor buttons</h3><ul><li><b>Add chord:</b> adds a new chord.</li><li><b>Duplicate:</b> copies the current chord.</li><li><b>Delete:</b> removes the selected chord.</li><li><b>Reset section:</b> restores only that part.</li><li><b>Reset all:</b> returns to the base song.</li></ul></div>
        <div class="help-block"><h3>5. Note format</h3><p>The app accepts English note names and solfege:</p><table class="help-table"><tr><th>Type</th><th>Example</th></tr><tr><td>English</td><td><code>C3 E3 G3 Bb3</code></td></tr><tr><td>Solfege</td><td><code>Do3 Mi3 Sol3 Sib3</code></td></tr><tr><td>Sharps</td><td><code>F#3</code> / <code>Fa#3</code></td></tr><tr><td>Flats</td><td><code>Bb3</code> / <code>Sib3</code></td></tr></table></div>
        <div class="help-block wide"><h3>6. Melody / solo per section</h3><p>Each section can have its own phrase. With <b>Solo ON</b>, that melody plays over the progression of the current section.</p><ol><li>Choose a section.</li><li>Set key and scale.</li><li>Write the phrase: <code>C4:2 Eb4:2 R:2 G4:4</code>.</li><li><b>Test solo:</b> plays the phrase alone.</li><li><b>Suggest phrase:</b> creates an automatic idea.</li><li><b>Save line:</b> attaches it to that section.</li></ol><div class="help-note"><code>R:2</code> means rest; the number represents sixteenth-note steps.</div></div>
        <div class="help-block"><h3>7. Playback</h3><ul><li><b>Start Groove:</b> loops the selected section.</li><li><b>Play full song:</b> plays the full structure.</li><li><b>Metronome:</b> audible click; the first click marks the bar.</li><li><b>Chord ON:</b> lets you build chords by touching multiple keys or adding notes one by one.</li></ul><div class="help-note">In v15 the right-click/long-press menu is blocked on the touch keyboard so it does not interrupt chord playing.</div></div>
        <div class="help-block"><h3>8. Rhythm lights</h3><ul><li><b>Green:</b> strong chord hit.</li><li><b>Magenta:</b> bass.</li><li><b>Gray:</b> ghost chord.</li><li><b>Yellow:</b> melody/solo.</li><li><b>White border:</b> current step.</li></ul></div>
        <div class="help-block wide"><h3>9. Lyrics / TAB</h3><ol><li>Open Lyrics / TAB.</li><li>Write lyrics by section.</li><li>Use the harmonic map at the top to follow the chords.</li><li>Save lyrics.</li><li>Download TXT to get a document with lyrics, chords, bass, notes and melodies.</li></ol></div>
        <div class="help-block"><h3>10. Save and share</h3><ul><li><b>Save local:</b> saves in this browser.</li><li><b>Download JSON:</b> editable master project.</li><li><b>Import JSON:</b> loads a saved project.</li><li><b>Download TXT:</b> readable document. It follows the active language: Spanish in ES mode, English in EN mode.</li><li><b>Copy:</b> copies the TXT to the clipboard.</li></ul></div>
        <div class="help-block"><h3>11. Quick tips</h3><ul><li>Start with Intro + Verse + Chorus.</li><li>Use a few clear chords and bars.</li><li>For a melody, leave rests.</li><li>For final audio, produce it later in a DAW with real instruments.</li></ul></div>
    `; }

    function preventTouchContextMenu(){
        const block = e => {
            if(e.target && e.target.closest && e.target.closest('.keyboard,.key,#pianoContainer')){
                e.preventDefault();
            }
        };
        document.addEventListener('contextmenu', block, {capture:true});
        document.addEventListener('selectstart', block, {capture:true});
        document.addEventListener('dragstart', block, {capture:true});
        document.addEventListener('gesturestart', block, {capture:true});
        document.addEventListener('pointerdown', e => {
            if(e.pointerType !== 'mouse' && e.target && e.target.closest && e.target.closest('.keyboard,.key,#pianoContainer')) e.preventDefault();
        }, {capture:true});
    }

    function applyRuntimeText(){ setButtonState(); translateDynamicText(); refreshStyleHelp(); }
    let scheduled = false;
    let applying = false;
    function scheduleApply(){
        if(scheduled || applying) return;
        scheduled = true;
        requestAnimationFrame(()=>{ scheduled = false; applying = true; applyRuntimeText(); applying = false; });
    }
    function attachReapplyHooks(){
        ['sectionSelect','styleSelect','instrumentSelect','chordSelect','playBtn','playSongBtn','metroBtn','soloBtn','chordHoldBtn','lyricsBtn','helpBtn'].forEach(id=>{
            const n = el(id); if(n) ['click','change','input'].forEach(evt=>n.addEventListener(evt,()=>setTimeout(scheduleApply,40)));
        });
        const target = q('.status-bar');
        if(target && 'MutationObserver' in window){
            new MutationObserver(()=>scheduleApply()).observe(target,{childList:true,subtree:true,characterData:true});
        }
    }
    function applyLanguage(){ applying = true; translateStaticAreas(); applying = false; }

    function bindLanguage(helpers){
        void helpers;
        ensureLangButton();
        preventTouchContextMenu();
        attachReapplyHooks();
        setTimeout(applyLanguage, 80);
    }

    window.Studio936I18n = {
        currentLang: () => lang,
        applyLanguage: (helpers) => { void helpers; applyLanguage(); },
        cycleLanguage: (helpers) => {
            void helpers;
            lang = lang === 'es' ? 'en' : 'es';
            localStorage.setItem(LANG_KEY, lang);
            applyLanguage();
        },
        bindLanguage
    };
})();
