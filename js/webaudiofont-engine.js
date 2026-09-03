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

  // Cambio 449 — CORRECCIÓN IMPORTANTE: la fórmula original (número de
  // programa GM directo, tipo "0024" para guitarra) estaba MAL. Val
  // probó y confirmó con HTTP real: piano (0000) daba 200 ✅, pero
  // guitarra (0024) y batería daban 404 ❌. Investigando el catálogo
  // real de WebAudioFont (vía GitHub API, ver bitácora) encontré el
  // patrón verdadero: el número de archivo es
  // (programa GM × 10) + variante, no el programa GM directo. Acá cada
  // instrumento tiene su NOMBRE DE ARCHIVO EXPLÍCITO en vez de calcularse
  // con una fórmula — algunos confirmados con evidencia real, otros
  // deducidos con la fórmula correcta pero todavía sin probar con HTTP.
  const INSTRUMENT_FILES = {
    // CONFIRMADOS (HTTP 200 real, o citados en la documentación oficial
    // de WebAudioFont):
    piano:   { file: '0000_FluidR3_GM_sf2_file',    gm: 0,  confirmado: true },  // Val lo probó: HTTP 200 ✅
    guitar:  { file: '0241_GeneralUserGS_sf2_file', gm: 24, confirmado: true },  // catálogo real: "MIDI: 24. Acoustic Guitar (nylon)"
    // Cambio 456: Val necesita distinguir nailon / cuerdas de metal /
    // eléctrica — antes solo había "guitar" (nailon). "guitarSteel"
    // confirmado con evidencia real (tiene página propia en el catálogo
    // de WebAudioFont). "guitarElectric" deducido con la formula
    // programa×10+variante (igual que organ/sax/synth) — todavia sin
    // probar con HTTP real, cae al sintetizador si falla.
    guitarSteel:    { file: '0253_Acoustic_Guitar_sf2_file', gm: 25, confirmado: true },  // catálogo real: "MIDI: 25. Acoustic Guitar (steel)"
    guitarElectric: { file: '0260_GeneralUserGS_sf2_file',   gm: 26, confirmado: false }, // Electric Guitar (jazz) — deducido, sin confirmar
    // Cambio 454: WebAudioFont no tiene ukelele bajo NINGUN nombre en su
    // catalogo (confirmado revisando el catalogo completo, categoria por
    // categoria: ni en Guitar ni en Ethnic aparece 'Ukulele'). El parche
    // viejo (reusar guitarra +12 semitonos) sonaba mal (Val: 'como
    // marimba') porque transponer una grabacion real una octava entera
    // le cambia el timbre, no solo el tono. Se reemplaza por Banjo real
    // (mismo archivo que la entrada 'banjo' de abajo) sin transponer -
    // no es un ukelele autentico, pero es un sample real de un
    // instrumento de cuerdas cortas pellizcadas, mucho mas cercano que
    // una guitarra estirada. Pendiente real: conseguir/convertir un
    // soundfont de ukelele de verdad (existe uno gratuito de HedSound,
    // investigar aparte, no es de este Cambio).
    ukulele: { file: '1050_GeneralUserGS_sf2_file', gm: 105, confirmado: true },
    // Cambio 454: Banjo — instrumento nuevo, sample real confirmado en
    // el catalogo (categoria Ethnic, GM 105).
    banjo:   { file: '1050_GeneralUserGS_sf2_file', gm: 105, confirmado: true },
    bass:    { file: '0330_JCLive_sf2_file',        gm: 33, confirmado: true },  // catálogo real: "MIDI: 33. Electric Bass (finger)"
    lead:    { file: '0290_Aspirin_sf2_file',       gm: 29, confirmado: true },  // Overdriven Guitar — citado en la documentación oficial de WebAudioFont
    violin:  { file: '0400_GeneralUserGS_sf2_file', gm: 40, confirmado: true },  // catálogo real: "MIDI: 40. Violin: Strings"
    trumpet: { file: '0560_GeneralUserGS_sf2_file', gm: 56, confirmado: true },  // catálogo real: "MIDI: 56. Trumpet: Brass"
    cello:   { file: '0421_GeneralUserGS_sf2_file', gm: 42, confirmado: true },  // catálogo real: "MIDI: 42. Cello: Strings"
    // Cambio 451: epiano pasa de "deducido" a CONFIRMADO — el valor
    // anterior (0040_FluidR3_GM) era una suposición con la fórmula, sin
    // probar. Este nuevo (0041_GeneralUserGS) sí está confirmado por el
    // catálogo real: "MIDI: 4. Electric Piano 1" (el Fender Rhodes que
    // pidió Val).
    epiano:  { file: '0041_GeneralUserGS_sf2_file', gm: 4,  confirmado: true },
    // DEDUCIDOS con la fórmula correcta (programa×10 + variante 0,
    // soundfont FluidR3_GM) — más confiables que antes, pero
    // TODAVÍA NO probados con HTTP real. Si alguno da 404, cae al
    // sintetizador de siempre (no rompe nada) — avisar para confirmar.
    organ:   { file: '0190_FluidR3_GM_sf2_file', gm: 19, confirmado: false }, // Church Organ
    sax:     { file: '0660_FluidR3_GM_sf2_file', gm: 66, confirmado: false }, // Tenor Sax
    synth:   { file: '0810_FluidR3_GM_sf2_file', gm: 81, confirmado: true },  // Lead 2 (sawtooth) — confirmado: tiene página propia en el catálogo
    // Cambio 466: Pad sostenido de fondo para los ritmos electrónicos —
    // confirmado real (tiene página propia en el catálogo, igual criterio
    // que el resto de instrumentos "confirmado:true" de este proyecto).
    pad:     { file: '0891_GeneralUserGS_sf2_file', gm: 89, confirmado: true },  // Pad 2 (warm): Synth Pad
    // Cambio 472: batería real — CONFIRMADO con la evidencia más sólida
    // posible: son los mismos 4 archivos que usa el ejemplo OFICIAL
    // "realtime.html" del propio repositorio de WebAudioFont (ver
    // github.com/surikov/webaudiofont/blob/master/examples/realtime.html).
    // A diferencia de los instrumentos melódicos, la batería NO es un
    // "kit" único con varias notas — cada pieza es su PROPIO archivo,
    // pensado para sonar siempre con la misma nota MIDI fija (la nota
    // de percusión GM estándar de esa pieza). Por eso cada entrada tiene
    // "midi" (la nota fija a usar) y "varPrefix": "_drum_" — el nombre
    // de la variable global que carga este tipo de archivo empieza con
    // "_drum_", no "_tone_" como los instrumentos melódicos.
    // Todavía sin sample real: platillos (crash/ride), toms y
    // percusión — quedan con el sintetizador de siempre por ahora.
    drum_kick:      { file: '12836_6_JCLive_sf2_file', varPrefix: '_drum_', midi: 36, confirmado: true },  // Bass Drum 1
    drum_snare:     { file: '12840_6_JCLive_sf2_file', varPrefix: '_drum_', midi: 40, confirmado: true },  // Electric Snare
    drum_hatClosed: { file: '12842_6_JCLive_sf2_file', varPrefix: '_drum_', midi: 42, confirmado: true },  // Closed Hi-Hat
    drum_hatOpen:   { file: '12846_6_JCLive_sf2_file', varPrefix: '_drum_', midi: 46, confirmado: true }   // Open Hi-Hat
  };

  // Cambio 448: mapa de golpes de batería a nota MIDI de percusión GM
  // estándar. Ampliado — el groove REAL de práctica usa
  // playSongDrumLane() en app.js (kick/snare/hatClosed/hatOpen/toms/
  // platillos/percusión), un sistema más completo que el hitDrum()
  // original que se había cubierto en el Cambio 446. Los nombres de acá
  // coinciden con los "laneId" que ya usa playSongDrumLane.
  const DRUM_NOTE_BY_KIND = {
    kick: 36,        // Bass Drum 1
    snare: 38,       // Acoustic Snare
    hatClosed: 42,   // Closed Hi-Hat
    hatOpen: 46,      // Open Hi-Hat
    tomHigh: 50,      // High Tom
    tomMid: 47,       // Low-Mid Tom
    tomLow: 41,       // Low Floor Tom
    crash: 49,        // Crash Cymbal 1
    ride: 51,         // Ride Cymbal 1
    percussion: 54,   // Tambourine (aproximado — playSongDrumLane varía
                       // este golpe según "kit"; se deja fijo acá para
                       // no sobrecomplicar el mapeo)
    // Cambio 446 (compatibilidad): nombres viejos de hitDrum(), por si
    // algún llamador viejo todavía los usa con esta forma.
    hat: 42,
    clave: 75,
    conga: 63
  };

  const loadedInstruments = {}; // instrumentId -> WebAudioFont preset object | 'loading' | 'failed'
  const pendingInstrumentPromises = {}; // instrumentId -> Promise (mientras está en la fila o cargando)
  // Cambio 472: la variable "drumKit" única ya no existe — cada pieza de
  // batería se carga como su propio instrumento (drum_kick, drum_snare,
  // etc.) en loadedInstruments, igual que los instrumentos melódicos.
  let pendingDrumPromise = null;
  let player = null;
  let playerLoadStarted = false;
  const playerReadyCallbacks = [];

  // Cambio 446 (corrección): WebAudioFontPlayer.loader.startLoad/waitLoad
  // NO admite varios pedidos en paralelo — Val probó y solo el piano
  // (el primer instrumento pedido) cargaba bien; bajo/batería/etc.
  // se pisaban entre sí porque salían casi al mismo tiempo apenas
  // arranca la práctica. loadQueue fuerza que TODOS los pedidos de
  // carga (instrumentos Y batería) pasen de a uno, en fila — recién
  // cuando termina el anterior (con éxito o error) arranca el
  // siguiente.
  let loadQueue = Promise.resolve();
  function enqueueLoad(taskFn) {
    const result = loadQueue.then(taskFn, taskFn);
    loadQueue = result.catch(() => {}); // una carga fallida no debe trabar la fila para las siguientes
    return result;
  }

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
  // pedirse por red. Cambio 446 (corrección): la carga real pasa por
  // enqueueLoad() para no competir con otros instrumentos/la batería
  // por el mismo loader compartido.
  function ensureInstrumentLoaded(ctx, instrumentId) {
    const entry = INSTRUMENT_FILES[instrumentId];
    if (!entry) return Promise.resolve(null); // instrumento sin mapeo (no debería pasar, pero no romper si pasa)
    if (loadedInstruments[instrumentId] && loadedInstruments[instrumentId] !== 'loading') {
      return Promise.resolve(loadedInstruments[instrumentId] === 'failed' ? null : loadedInstruments[instrumentId]);
    }
    if (pendingInstrumentPromises[instrumentId]) return pendingInstrumentPromises[instrumentId]; // ya en la fila — devolver la MISMA promesa, no pedir de nuevo
    loadedInstruments[instrumentId] = 'loading';
    const fileBase = entry.file;
    // Cambio 472: los archivos de batería individuales usan el prefijo
    // "_drum_" en vez de "_tone_" — ver INSTRUMENT_FILES más arriba.
    const varName = (entry.varPrefix || '_tone_') + fileBase;
    const promise = enqueueLoad(() => ensurePlayer().then(p => new Promise(resolve => {
      p.loader.startLoad(ctx, WAF_DATA_BASE + fileBase + '.js', varName);
      p.loader.waitLoad(() => {
        try {
          const preset = window[varName];
          if (preset) p.loader.decodeAfterLoading(ctx, varName);
          resolve(preset || null);
        } catch (err) {
          console.warn('Studio936 SampleEngine: fallo decodificando ' + instrumentId, err);
          resolve(null);
        }
      });
    }))).then(preset => {
      loadedInstruments[instrumentId] = preset || 'failed';
      delete pendingInstrumentPromises[instrumentId];
      if (!preset) console.warn('Studio936 SampleEngine: "' + instrumentId + '" (archivo ' + fileBase + '.js, ' + (entry.confirmado ? 'confirmado' : 'SIN confirmar') + ') no cargó — sigue con el sintetizador de siempre.');
      return preset;
    }).catch(err => {
      console.warn('Studio936 SampleEngine: fallo cargando ' + instrumentId, err);
      loadedInstruments[instrumentId] = 'failed';
      delete pendingInstrumentPromises[instrumentId];
      return null;
    });
    pendingInstrumentPromises[instrumentId] = promise;
    return promise;
  }

  // Cambio 472: qué "instrumento" de INSTRUMENT_FILES usar para cada
  // golpe de batería — reusa exactamente el mismo pipeline de carga
  // que los instrumentos melódicos (ensureInstrumentLoaded/hasSample),
  // en vez de un sistema de "kit único" aparte. Los golpes sin entrada
  // acá (crash, ride, toms, percusión) devuelven undefined — hasSample
  // da false para ellos y caen al sintetizador de siempre, sin romper
  // nada.
  const DRUM_INSTRUMENT_BY_KIND = {
    kick: 'drum_kick',
    snare: 'drum_snare',
    hatClosed: 'drum_hatClosed',
    hatOpen: 'drum_hatOpen',
    hat: 'drum_hatClosed' // Cambio 446 (compatibilidad): nombre viejo de hitDrum()
  };

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
  // Cambio 472: hasDrumKit() queda como sinónimo de "¿el kick real ya
  // está listo?" — algunos llamadores viejos todavía la consultan antes
  // de decidir si vale la pena intentar la batería real en absoluto.
  function hasDrumKit() {
    return hasSample('drum_kick');
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

  // Cambio 472: reescrito por completo — antes esto SIEMPRE devolvía
  // false a propósito (ver comentario viejo del Cambio 449, no se había
  // encontrado el archivo real todavía). Ahora usa los 4 samples reales
  // confirmados (kick/snare/hatClosed/hatOpen) vía el mismo pipeline que
  // los instrumentos melódicos. Golpes sin sample real todavía (crash,
  // ride, toms, percusión) devuelven false acá y caen al sintetizador
  // de siempre en app.js — sin romper nada.
  function playSampledDrum(ctx, destination, kind, duration, volume, time) {
    const instrumentId = DRUM_INSTRUMENT_BY_KIND[kind];
    if (!instrumentId) return false;
    const entry = INSTRUMENT_FILES[instrumentId];
    warmUp(ctx, instrumentId);
    if (!entry || !hasSample(instrumentId) || !player) return false;
    try {
      player.queueWaveTable(ctx, destination, loadedInstruments[instrumentId], time, entry.midi, duration, volume);
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
