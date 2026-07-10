// Studio 936 — Núcleo central de idiomas (Cambio 159)
//
// Un solo punto de verdad por idioma. Cualquier módulo (Main, Compose,
// Chart, Librería, Mixer, MIDI, Estructura) puede pedir su texto llamando
// a window.Studio936I18nCore.t('ruta.a.la.clave') — sin necesitar saber
// nada de cómo funciona el sistema de idiomas por dentro.
//
// AGREGAR UN IDIOMA NUEVO = agregar una entrada más a DICT (ej. fr, zh)
// con las mismas claves que 'es'/'en'. No hay que tocar NINGÚN otro
// archivo del proyecto para eso — esa es la idea de este módulo.
//
// Alcance de este primer paso (Cambio 159): el "menú principal" — barra
// superior, selects de Estilo/Instrumento/Sección, tooltips de los
// íconos principales, y las etiquetas de los botones Play/Metrónomo.
// El resto (editor de acordes, ayuda, hints, descripciones de estilo,
// y los módulos de Suite Pro: Compose/Chart/Librería/Mixer/MIDI/
// Estructura) todavía NO está conectado aquí — se migra en pasos
// siguientes, uno por uno, cada uno como su propio cambio.
(function(){
  'use strict';

  // Mismo nombre de key que ya usaban los módulos viejos (i18n.js), para
  // no perder la preferencia de idioma que el usuario ya tenía guardada.
  const LANG_KEY = 'pianoComposerUiLangV15';

  // Lista de idiomas disponibles. Agregar 'fr', 'zh', etc. aquí cuando se
  // sume su diccionario correspondiente en DICT, más abajo.
  const AVAILABLE_LANGS = ['es', 'en'];

  const DICT = {
    es: {
      app: {
        htmlLang: 'es',
        title: 'Studio 936 Composer - MIDI + Diapasón + Routing + Afinación',
        version: 'v25 · MIDI · Diapasón · Routing · Afinación'
      },
      lang: { cycleLabel: 'EN' },
      song: {
        titleAria: 'Nombre de la canción',
        authorAria: 'Autor de la canción',
        authorPlaceholder: 'Autor / Compositor'
      },
      select: {
        style: {
          title: 'Tipo de música',
          options: { funk:'Funk', rock:'Rock', ballad:'Balada', bossa:'Bossa Nova', jazz:'Jazz', blues:'Blues', pop:'Pop', bolero:'Bolero', salsa:'Salsa', cumbia:'Cumbia', reggae:'Reggae' }
        },
        instrument: {
          title: 'Instrumento guía',
          options: { piano:'Piano', epiano:'Piano eléctrico', guitar:'Guitarra', ukulele:'Ukelele', organ:'Órgano', sax:'Saxo guía', synth:'Synth' }
        },
        section: {
          title: 'Sección de la canción',
          fullSong: 'Canción completa',
          options: { intro:'Introducción', verse:'Verso', verse1:'Verso 1', verse2:'Verso 2', verse3:'Verso 3', prechorus:'Pre-coro', chorus:'Coro', interlude:'Interludio', solo:'Solo' }
        }
      },
      buttons: {
        start: 'Start Groove', stop: 'Stop Groove',
        playSong: 'Escuchar canción', stopSong: 'Stop canción',
        metroOn: 'Metrónomo ON 🔊', metroOff: 'Metrónomo OFF'
      },
      icons: {
        compose: 'Componer', studio: 'Studio 936', chart: 'Tocar-Partitura',
        mixer: 'Mezclador', library: '936 Player', pianoZoom: 'Tocar Piano'
      },
      play: {
        section: { play: 'Tocar Sección', stop: 'Parar Sección' },
        song: { play: 'Tocar canción', stop: 'Parar Canción' }
      },
      transpose: { keyPrefix: 'Clave' }
    },
    en: {
      app: {
        htmlLang: 'en',
        title: 'Studio 936 Composer - MIDI + Fretboard + Routing + Tuning',
        version: 'v25 · MIDI · Fretboard · Routing · Tuning'
      },
      lang: { cycleLabel: 'ES' },
      song: {
        titleAria: 'Song title',
        authorAria: 'Song author',
        authorPlaceholder: 'Author / Composer'
      },
      select: {
        style: {
          title: 'Music style',
          options: { funk:'Funk', rock:'Rock', ballad:'Ballad', bossa:'Bossa Nova', jazz:'Jazz', blues:'Blues', pop:'Pop', bolero:'Bolero', salsa:'Salsa', cumbia:'Cumbia', reggae:'Reggae' }
        },
        instrument: {
          title: 'Guide instrument',
          options: { piano:'Piano', epiano:'Electric piano', guitar:'Guitar', ukulele:'Ukulele', organ:'Organ', sax:'Sax guide', synth:'Synth' }
        },
        section: {
          title: 'Song section',
          fullSong: 'Full Song',
          options: { intro:'Introduction', verse:'Verse', verse1:'Verse 1', verse2:'Verse 2', verse3:'Verse 3', prechorus:'Pre-chorus', chorus:'Chorus', interlude:'Interlude', solo:'Solo' }
        }
      },
      buttons: {
        start: 'Start Groove', stop: 'Stop Groove',
        playSong: 'Play full song', stopSong: 'Stop song',
        metroOn: 'Metronome ON 🔊', metroOff: 'Metronome OFF'
      },
      icons: {
        compose: 'Compose', studio: 'Studio 936', chart: 'Play-Score',
        mixer: 'Mixer', library: '936 Player', pianoZoom: 'Play Piano'
      },
      play: {
        section: { play: 'Play Session', stop: 'Stop Session' },
        song: { play: 'Play Song', stop: 'Stop Song' }
      },
      transpose: { keyPrefix: 'Key' }
    }
  };

  function getLang(){
    const stored = localStorage.getItem(LANG_KEY);
    return AVAILABLE_LANGS.indexOf(stored) !== -1 ? stored : 'es';
  }

  function setLang(code){
    if(AVAILABLE_LANGS.indexOf(code) === -1) return getLang();
    localStorage.setItem(LANG_KEY, code);
    return code;
  }

  function cycleLang(){
    const idx = AVAILABLE_LANGS.indexOf(getLang());
    return setLang(AVAILABLE_LANGS[(idx + 1) % AVAILABLE_LANGS.length]);
  }

  function dictFor(code){
    return DICT[code] || DICT.es;
  }

  // Lee una clave por ruta con puntos, ej. t('icons.compose').
  // Si el idioma actual no tiene esa clave (traducción incompleta), cae a
  // español; si tampoco existe ahí, devuelve la ruta misma (nunca undefined,
  // para que nunca se vea un botón vacío por una clave que falte).
  function t(path){
    const walk = (obj) => String(path).split('.').reduce(
      (node, key) => (node && node[key] !== undefined) ? node[key] : undefined,
      obj
    );
    const value = walk(dictFor(getLang()));
    if(value !== undefined) return value;
    const fallback = walk(DICT.es);
    return fallback !== undefined ? fallback : path;
  }

  window.Studio936I18nCore = {
    LANG_KEY,
    availableLangs: () => AVAILABLE_LANGS.slice(),
    getLang,
    setLang,
    cycleLang,
    dictFor,
    t,
    dict: DICT
  };
})();
