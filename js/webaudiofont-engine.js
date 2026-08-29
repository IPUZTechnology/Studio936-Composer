// Studio 936 — Motor de sonido real (Cambio 446)
//
// QUÉ ES: capa nueva, independiente, que reemplaza los osciladores
// sintéticos de app.js (playNoteImpl / hitDrum) por samples reales de
// instrumentos vía WebAudioFont — sin tocar la lógica de CUÁNDO suena
// cada nota (eso sigue en app.js/suite-pro-chart, sin cambios). Esto
// solo cambia QUÉ SE OYE.
//
// POR QUÉ UN ARCHIVO APARTE: app.js y audio-engine.js son archivos
// protegidos (requieren aprobación explícita — ya la tenemos para esta
// tarea puntual). Meter toda la complejidad nueva acá, en un archivo
// chico y autosuficiente, deja el diff en esos dos archivos protegidos
// mínimo: unas pocas líneas que preguntan "¿está listo el motor de
// samples?" y, si no, siguen usando el sintetizador de siempre.
//
// CARGA PEREZOSA: no se descarga nada hasta el primer sonido real que
// se pida — así no se penaliza el tiempo de carga de la página para
// alguien que todavía no tocó Play.
//
// RED DE SEGURIDAD: si un archivo de sonido no carga (red lenta, CDN
// caído, nombre de archivo que cambió), esa voz puntual sigue sonando
// con el sintetizador viejo de app.js en vez de quedar en silencio —
// ver isReady()/hasSample() más abajo, se consultan antes de cada nota.

(function (global) {
  const WAF_PLAYER_URL = 'https://surikov.github.io/webaudiofont/npm/dist/WebAudioFontPlayer.js';
  const WAF_DATA_BASE = 'https://surikov.github.io/webaudiofontdata/sound/';

  // Cambio 446: números de programa General MIDI — esto es un estándar
  // fijo, no depende de qué soundfont se use. Mapea cada instrumento de
  // Studio 936 (instruments.js) a su equivalente GM más cercano.
  // CONFIRMADO con ejemplos reales de la documentación de WebAudioFont.
  const GM_PROGRAM_BY_INSTRUMENT = {
    piano: 0,     // Acoustic Grand Piano
    epiano: 4,    // Electric Piano 1
    guitar: 24,   // Nylon Acoustic Guitar
    ukulele: 24,  // Reusa el mismo sample que guitarra — instruments.js
                  // ya transpone +12 semitonos para ukulele (transpose:12
                  // en su perfil), así que no hace falta un sample aparte.
    bass: 33,     // Electric Bass (finger)
    lead: 29,     // Overdriven Guitar
    organ: 19,    // Church Organ
    sax: 66,      // Tenor Sax
    synth: 81     // Lead 2 (sawtooth) — el synth más parecido en el set GM
  };

  // Cambio 446 — AVISO IMPORTANTE: este nombre de archivo de batería NO
  // está confirmado con documentación real (a diferencia del mapeo de
  // arriba, que sí). Es la mejor suposición siguiendo el patrón conocido
  // (NNNN_FluidR3_GM_sf2_file.js, banco 128 = percusión GM). Si al
  // probar la consola muestra un error 404 acá, la batería sigue sonando
  // con el sintetizador de siempre (ver hasSample/fallback en app.js) —
  // no rompe nada, pero avisa a Val para confirmar el nombre correcto
  // antes de considerar la batería "ya resuelta".
  const DRUM_KIT_FILE = '0128_1_FluidR3_GM_sf2_file';

  // Cambio 446: mapa de golpes de batería de Studio 936 (los mismos
  // "kind" que ya usa hitDrum() en app.js) a nota MIDI de percusión GM
  // estándar — esto SÍ es estándar fijo (no depende del soundfont).
  const DRUM_NOTE_BY_KIND = {
    kick: 36,   // Bass Drum 1
    snare: 38,  // Acoustic Snare
    hat: 42,    // Closed Hi-Hat
    clave: 75,  // Claves
    conga: 63   // Open High Conga
  };

  const loadedInstruments = {}; // instrumentId -> WebAudioFont preset object | 'loading' | 'failed'
  let drumKit = null; // WebAudioFont preset object | 'loading' | 'failed'
  let player = null;
  let playerLoadStarted = false;
  const playerReadyCallbacks = [];

  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      const existing = Array.from(document.scripts || []).find(s => s.src === src);
      if (existing) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('No se pudo cargar ' + src));
      document.body.appendChild(s);
    });
  }

  function ensurePlayer() {
    if (player) return Promise.resolve(player);
    if (!playerLoadStarted) {
      playerLoadStarted = true;
      loadScriptOnce(WAF_PLAYER_URL).then(() => {
        try {
          player = new window.WebAudioFontPlayer();
          playerReadyCallbacks.forEach(cb => cb(player));
          playerReadyCallbacks.length = 0;
        } catch (err) {
          console.warn('Studio936 SampleEngine: WebAudioFontPlayer no disponible tras cargar', err);
        }
      }).catch(err => {
        console.warn('Studio936 SampleEngine: no se pudo cargar WebAudioFontPlayer — se sigue usando el sintetizador de siempre', err);
      });
    }
    return new Promise(resolve => {
      if (player) { resolve(player); return; }
      playerReadyCallbacks.push(resolve);
    });
  }

  // Cambio 446: cada instrumento se carga UNA sola vez y se cachea en
  // memoria (loadedInstruments) — instrumentos ya usados no vuelven a
  // pedirse por red.
  function ensureInstrumentLoaded(ctx, instrumentId) {
    const gmProgram = GM_PROGRAM_BY_INSTRUMENT[instrumentId];
    if (gmProgram == null) return Promise.resolve(null); // instrumento sin mapeo GM (no debería pasar, pero no romper si pasa)
    if (loadedInstruments[instrumentId] && loadedInstruments[instrumentId] !== 'loading') {
      return Promise.resolve(loadedInstruments[instrumentId] === 'failed' ? null : loadedInstruments[instrumentId]);
    }
    if (loadedInstruments[instrumentId] === 'loading') {
      // Ya se está cargando (otra nota lo pidió un instante antes) — no
      // duplicar el pedido de red, esperar al mismo resultado.
      return new Promise(resolve => {
        const check = () => {
          if (loadedInstruments[instrumentId] === 'loading') { setTimeout(check, 50); return; }
          resolve(loadedInstruments[instrumentId] === 'failed' ? null : loadedInstruments[instrumentId]);
        };
        check();
      });
    }
    loadedInstruments[instrumentId] = 'loading';
    const fileBase = String(gmProgram).padStart(4, '0') + '_FluidR3_GM_sf2_file';
    const varName = '_tone_' + fileBase;
    return ensurePlayer().then(p => {
      return new Promise(resolve => {
        p.loader.startLoad(ctx, WAF_DATA_BASE + fileBase + '.js', varName);
        p.loader.waitLoad(() => {
          try {
            const preset = window[varName];
            if (preset) {
              p.loader.decodeAfterLoading(ctx, varName);
              loadedInstruments[instrumentId] = preset;
              resolve(preset);
            } else {
              loadedInstruments[instrumentId] = 'failed';
              resolve(null);
            }
          } catch (err) {
            console.warn('Studio936 SampleEngine: fallo decodificando ' + instrumentId, err);
            loadedInstruments[instrumentId] = 'failed';
            resolve(null);
          }
        });
      });
    }).catch(err => {
      console.warn('Studio936 SampleEngine: fallo cargando ' + instrumentId, err);
      loadedInstruments[instrumentId] = 'failed';
      return null;
    });
  }

  function ensureDrumKitLoaded(ctx) {
    if (drumKit && drumKit !== 'loading') return Promise.resolve(drumKit === 'failed' ? null : drumKit);
    if (drumKit === 'loading') {
      return new Promise(resolve => {
        const check = () => {
          if (drumKit === 'loading') { setTimeout(check, 50); return; }
          resolve(drumKit === 'failed' ? null : drumKit);
        };
        check();
      });
    }
    drumKit = 'loading';
    const varName = '_tone_' + DRUM_KIT_FILE;
    return ensurePlayer().then(p => {
      return new Promise(resolve => {
        p.loader.startLoad(ctx, WAF_DATA_BASE + DRUM_KIT_FILE + '.js', varName);
        p.loader.waitLoad(() => {
          try {
            const preset = window[varName];
            if (preset) {
              p.loader.decodeAfterLoading(ctx, varName);
              drumKit = preset;
              resolve(preset);
            } else {
              drumKit = 'failed';
              console.warn('Studio936 SampleEngine: el archivo de batería (' + DRUM_KIT_FILE + ') no devolvió datos válidos — la batería sigue con el sintetizador de siempre. Avisar a Val para confirmar el nombre correcto de archivo.');
              resolve(null);
            }
          } catch (err) {
            drumKit = 'failed';
            console.warn('Studio936 SampleEngine: fallo cargando el kit de batería — la batería sigue con el sintetizador de siempre.', err);
            resolve(null);
          }
        });
      });
    }).catch(err => {
      drumKit = 'failed';
      console.warn('Studio936 SampleEngine: no se pudo pedir el archivo de batería por red — la batería sigue con el sintetizador de siempre.', err);
      return null;
    });
  }

  // Cambio 446: dispara la carga de un instrumento SIN bloquear — se usa
  // para "precalentar" apenas arranca la práctica, así la primera nota
  // real no tiene que esperar la descarga entera.
  function warmUp(ctx, instrumentId) {
    ensureInstrumentLoaded(ctx, instrumentId);
  }

  // Cambio 446: true si ESTE instrumento puntual ya tiene su sample
  // listo para sonar — app.js consulta esto antes de decidir si usa el
  // sample real o el sintetizador de respaldo.
  function hasSample(instrumentId) {
    const v = loadedInstruments[instrumentId];
    return !!v && v !== 'loading' && v !== 'failed';
  }
  function hasDrumKit() {
    return !!drumKit && drumKit !== 'loading' && drumKit !== 'failed';
  }

  // Cambio 446: toca una nota con el sample real. Dispara la carga si
  // todavía no estaba lista (para la PRÓXIMA vez que se toque esta nota
  // — esta llamada en particular, si el sample no está listo YA, avisa
  // con return false para que app.js use el sintetizador de respaldo
  // en este golpe puntual, sin esperar).
  function playSampledNote(ctx, destination, instrumentId, midi, duration, volume, time) {
    warmUp(ctx, instrumentId);
    if (!hasSample(instrumentId) || !player) return false;
    try {
      player.queueWaveTable(ctx, destination, loadedInstruments[instrumentId], time, midi, duration, volume);
      return true;
    } catch (err) {
      console.warn('Studio936 SampleEngine: fallo reproduciendo nota de ' + instrumentId, err);
      return false;
    }
  }

  function playSampledDrum(ctx, destination, kind, duration, volume, time) {
    ensureDrumKitLoaded(ctx);
    const note = DRUM_NOTE_BY_KIND[kind];
    if (note == null || !hasDrumKit() || !player) return false;
    try {
      player.queueWaveTable(ctx, destination, drumKit, time, note, duration, volume);
      return true;
    } catch (err) {
      console.warn('Studio936 SampleEngine: fallo reproduciendo golpe de batería ' + kind, err);
      return false;
    }
  }

  global.Studio936SampleEngine = {
    warmUp,
    hasSample,
    hasDrumKit,
    playSampledNote,
    playSampledDrum
  };
})(window);
