// Studio 936 Composer - Suite Pro Compose Coordinator v6.6 Cambio 50
// Scope: Compose tab only. It does not write to app.js, editor, transport, drums, practice or studio modules.
// Product goal: coordinador modular de Composición: Plantillas, Inspiración, Transponer, Estructura, Editor, Acordes IA, Teoría y Escalas.
(function () {
  "use strict";

  const STYLE_ID = "s936SuiteProComposeStylesCambio50";
  const STATE_KEY = "s936_suitepro_compose_v1";

  const NOTE_INDEX = { C:0, "C#":1, Db:1, D:2, "D#":3, Eb:3, E:4, F:5, "F#":6, Gb:6, G:7, "G#":8, Ab:8, A:9, "A#":10, Bb:10, B:11 };
  const SHARP = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const FLAT = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
  const FLAT_KEYS = new Set(["F","Bb","Eb","Ab","Db","Gb"]);
  const SCALE_INTERVALS = {
    major: [0,2,4,5,7,9,11],
    naturalMinor: [0,2,3,5,7,8,10],
    minorPent: [0,3,5,7,10],
    majorPent: [0,2,4,7,9],
    blues: [0,3,5,6,7,10],
    dorian: [0,2,3,5,7,9,10],
    mixolydian: [0,2,4,5,7,9,10]
  };
  const ROMAN = { I:0, ii:1, iii:2, IV:3, V:4, vi:5, vii:6 };

  const DEFAULT_STATE = {
    tool: "structure",
    targetKey: "G",
    selectedTemplate: "Studio Pop",
    previewTemplate: "studio-pop",
    inspireMood: "luminosa",
    inspireEnergy: "crecimiento",
    chordGoal: "coro",
    scaleRoot: "",
    scaleType: "major"
  };

  const TEMPLATES = [
    {
      id: "studio-pop",
      name: "Studio Pop",
      style: "pop",
      bpm: 100,
      vibe: "claro, moderno, coro recordable",
      form: [["intro","Intro"],["verse","Verso 1"],["prechorus","Pre-coro"],["chorus","Coro"],["verse2","Verso 2"],["prechorus","Pre-coro 2"],["chorus","Coro 2"],["bridge","Puente"],["chorus","Coro final"],["outro","Outro"]],
      sections: {
        intro: ["I","V"],
        verse: ["I","V","vi","IV"],
        prechorus: ["IV","V","vi","V"],
        chorus: ["I","V","vi","IV"],
        bridge: ["vi","IV","I","V"]
      },
      lyric: "Verso íntimo · pre-coro levanta tensión · coro con frase corta y repetible."
    },
    {
      id: "worship-rise",
      name: "Worship Rise",
      style: "ballad",
      bpm: 76,
      vibe: "expansivo, espiritual, crecimiento emocional",
      form: [["intro","Intro"],["verse","Verso 1"],["verse2","Verso 2"],["prechorus","Pre-coro"],["chorus","Coro"],["interlude","Interludio"],["bridge","Puente"],["chorus","Coro final"],["outro","Outro"]],
      sections: {
        intro: ["I","V"],
        verse: ["I","V","vi","IV"],
        prechorus: ["IV","V","I","V"],
        chorus: ["I","V","vi","IV"],
        bridge: ["vi","IV","I","V"]
      },
      lyric: "Versos simples · coro abierto · puente como mantra ascendente."
    },
    {
      id: "funk-light",
      name: "Funk Light",
      style: "funk",
      bpm: 95,
      vibe: "groove elegante, bajo activo, acordes con color",
      form: [["intro","Intro groove"],["verse","Verso"],["prechorus","Pre-coro"],["chorus","Coro"],["interlude","Interludio"],["verse2","Verso 2"],["chorus","Coro final"],["outro","Outro vamp"]],
      sections: {
        intro: ["Imaj7","Imaj7","IVmaj7","V7"],
        verse: ["Imaj7","IVmaj7","Imaj7","V9"],
        prechorus: ["ii7","V7","iii7","vi7"],
        chorus: ["IVmaj7","V7","Imaj7","vi7"],
        bridge: ["ii7","V7","Imaj7","Imaj7"]
      },
      lyric: "Letra con frases cortas, respiración y respuesta rítmica."
    },
    {
      id: "rock-anthem",
      name: "Rock Anthem",
      style: "rock",
      bpm: 112,
      vibe: "riff, energía, coro poderoso",
      form: [["intro","Intro riff"],["verse","Verso"],["chorus","Coro"],["interlude","Riff"],["verse2","Verso 2"],["chorus","Coro 2"],["solo","Solo"],["chorus","Coro final"],["outro","Outro"]],
      sections: {
        intro: ["I","IV","V","IV"],
        verse: ["I","IV","V","IV"],
        prechorus: ["vi","IV","V","V"],
        chorus: ["I","V","IV","I"],
        bridge: ["vi","V","IV","V"]
      },
      lyric: "Verso narrativo · coro con afirmación fuerte · solo antes del último coro."
    },
    {
      id: "latin-coro",
      name: "Latin Coro",
      style: "salsa",
      bpm: 104,
      vibe: "cuerpo, llamada y respuesta, energía de banda",
      form: [["intro","Intro"],["verse","Verso"],["prechorus","Subida"],["chorus","Coro"],["interlude","Montuno"],["solo","Solo"],["chorus","Coro final"],["outro","Cierre"]],
      sections: {
        intro: ["i","iv","V7","i"],
        verse: ["i","iv","V7","i"],
        prechorus: ["VI","VII","V7","V7"],
        chorus: ["i","VII","VI","V7"],
        bridge: ["iv","i","V7","i"]
      },
      lyric: "Coro-respuesta, frase corta, repetición con variación rítmica."
    },
    {
      id: "jazz-color",
      name: "Jazz Color",
      style: "jazz",
      bpm: 110,
      vibe: "armonía con extensión, forma flexible",
      form: [["intro","Intro"],["verse","Tema A"],["verse2","Tema A2"],["bridge","Tema B"],["solo","Solo"],["verse","Tema A final"],["outro","Coda"]],
      sections: {
        intro: ["ii7","V7","Imaj7","vi7"],
        verse: ["ii7","V7","Imaj7","vi7"],
        prechorus: ["iii7","vi7","ii7","V7"],
        chorus: ["ii7","V7","Imaj7","Imaj7"],
        bridge: ["IVmaj7","iv7","iii7","VI7"]
      },
      lyric: "Melodía con espacio, tensión suave y cadencias ii-V-I."
    }
  ];

  const INSPIRE = {
    luminosa: [
      ["Despertar de un Sueño", "La primera luz abre una puerta interna.", "Hoy la ventana aprendió mi nombre", "No vuelvo atrás, camino en luz", ["I","V","vi","IV"]],
      ["Mapa de Estrellas", "Encontrar dirección en medio del cambio.", "Guardé una estrella debajo de la voz", "Sigo la señal que nace en mí", ["vi","IV","I","V"]]
    ],
    intima: [
      ["Carta al Silencio", "Decir lo que quedó guardado.", "El cuarto sabe cosas que no dije", "Te hablo bajito para volver a mí", ["vi","IV","I","V"]],
      ["Piano de Agua", "Memoria, calma y reconciliación.", "La lluvia tocó mi nombre en el cristal", "Déjame sanar donde empezó la voz", ["I","iii","IV","V"]]
    ],
    energia: [
      ["Fuego Tranquilo", "Fuerza sin rabia, determinación limpia.", "No grito, pero arde mi verdad", "Soy fuego tranquilo, raíz y canción", ["I","IV","V","vi"]],
      ["Motor del Alma", "Movimiento, groove y decisión.", "Prendí la noche con un bajo interior", "Voy encendido, voy en dirección", ["i","VII","VI","V"]]
    ]
  };

  const CHORD_GOALS = {
    verso: {
      label: "Verso estable",
      intent: "mantener historia y espacio para la voz",
      romans: [["I","V","vi","IV"],["vi","IV","I","V"],["I","iii","IV","V"]]
    },
    precoro: {
      label: "Pre-coro con tensión",
      intent: "subir energía antes del coro",
      romans: [["IV","V","vi","V"],["ii","IV","V","V"],["vi","V","IV","V"]]
    },
    coro: {
      label: "Coro abierto",
      intent: "resolver fuerte y hacer memorable el hook",
      romans: [["I","V","vi","IV"],["IV","I","V","vi"],["I","V","IV","I"]]
    },
    puente: {
      label: "Puente contraste",
      intent: "cambiar color sin perder identidad",
      romans: [["vi","IV","I","V"],["ii","V","iii","vi"],["IV","iv","I","V"]]
    },
    jazz: {
      label: "Color Jazz",
      intent: "agregar 7mas, dominantes y movimiento ii-V",
      romans: [["ii7","V7","Imaj7","vi7"],["iii7","vi7","ii7","V7"],["IVmaj7","iv7","iii7","VI7"]]
    }
  };

  function loadState() {
    try { return Object.assign({}, DEFAULT_STATE, JSON.parse(localStorage.getItem(STATE_KEY) || "{}")); }
    catch (error) { return Object.assign({}, DEFAULT_STATE); }
  }

  const state = loadState();

  function saveState() {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (error) {}
  }

  function register() {
    window.Studio936SuiteProModules = window.Studio936SuiteProModules || {};
    window.Studio936SuiteProCompose = { version: "compose-v5.4-cambio-38", render };
    window.Studio936SuiteProModules.compose = window.Studio936SuiteProCompose;
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#s936SuitePro .s936-cmp-shell{display:grid;gap:12px}
#s936SuitePro .s936-cmp-hero{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:12px}
#s936SuitePro .s936-cmp-card{border:1px solid rgba(255,255,255,.12);border-radius:18px;background:rgba(255,255,255,.045);padding:13px}
#s936SuitePro .s936-cmp-card.important{border-color:rgba(0,255,204,.36);background:linear-gradient(135deg,rgba(0,255,204,.10),rgba(255,255,255,.035))}
#s936SuitePro .s936-cmp-card.gold{border-color:rgba(255,216,77,.44);background:linear-gradient(135deg,rgba(255,216,77,.10),rgba(255,255,255,.035))}
#s936SuitePro .s936-cmp-card h4{margin:0 0 8px;color:#8affff;font-size:.82rem;text-transform:uppercase;letter-spacing:.8px}
#s936SuitePro .s936-cmp-card h5{margin:0 0 7px;color:#fff;font-size:.88rem}
#s936SuitePro .s936-cmp-line{margin:6px 0;color:rgba(255,255,255,.80);font-size:.72rem;line-height:1.42}
#s936SuitePro .s936-cmp-line strong{color:#ffe066}
#s936SuitePro .s936-cmp-muted{color:rgba(255,255,255,.62);font-size:.68rem;line-height:1.45}
#s936SuitePro .s936-cmp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(245px,1fr));gap:10px}
#s936SuitePro .s936-cmp-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}
#s936SuitePro .s936-cmp-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
#s936SuitePro .s936-cmp-btn{border:1px solid rgba(0,255,204,.45);border-radius:999px;background:rgba(0,255,204,.08);color:#bfffee;padding:7px 11px;font-size:.64rem;font-weight:950;cursor:pointer;text-transform:uppercase}
#s936SuitePro .s936-cmp-btn:hover{background:rgba(0,255,204,.16)}
#s936SuitePro .s936-cmp-btn.warn{border-color:rgba(255,216,77,.65);background:rgba(255,216,77,.10);color:#ffe066}
#s936SuitePro .s936-cmp-btn.secondary{border-color:rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:#fff}
#s936SuitePro .s936-cmp-select,#s936SuitePro .s936-cmp-input{width:100%;border:1px solid rgba(255,255,255,.16);border-radius:12px;background:rgba(0,0,0,.26);color:#fff;padding:8px 10px;font-size:.75rem;font-weight:800}
#s936SuitePro .s936-cmp-toolbar{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:8px}
#s936SuitePro .s936-cmp-subnav{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,.08)}
#s936SuitePro .s936-cmp-subtab{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:20px;color:rgba(255,255,255,.65);font-size:.62rem;font-weight:700;padding:5px 14px;cursor:pointer;text-transform:uppercase;letter-spacing:.5px;transition:all .15s}
#s936SuitePro .s936-cmp-subtab.active{background:rgba(0,255,204,.15);border-color:#00ffcc;color:#bfffee}
#s936SuitePro .s936-cmp-subtab:hover:not(.active){background:rgba(255,255,255,.1);color:#fff}
#s936SuitePro .s936-cmp-field label{display:block;color:#ffe066;font-size:.58rem;font-weight:950;text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px}
#s936SuitePro .s936-cmp-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
#s936SuitePro .s936-cmp-chip{border:1px solid rgba(0,255,204,.38);border-radius:999px;background:rgba(0,255,204,.08);color:#bfffee;padding:5px 8px;font-size:.62rem;font-weight:900}
#s936SuitePro .s936-cmp-chip.root{border-color:rgba(255,216,77,.75);background:rgba(255,216,77,.12);color:#ffe066}
#s936SuitePro .s936-cmp-chip.tension{border-color:rgba(255,91,234,.65);background:rgba(255,91,234,.10);color:#ffd4fb}
#s936SuitePro .s936-cmp-form{display:flex;gap:5px;align-items:center;flex-wrap:wrap;margin:8px 0}
#s936SuitePro .s936-cmp-flow{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
#s936SuitePro .s936-cmp-part{border:1px solid rgba(255,255,255,.13);border-radius:13px;background:rgba(0,0,0,.18);padding:8px;min-width:96px;flex:1}
#s936SuitePro .s936-cmp-part b{display:block;color:#fff;font-size:.66rem;text-transform:uppercase;margin-bottom:4px}
#s936SuitePro .s936-cmp-part span{display:block;color:#bfffee;font-size:.62rem;line-height:1.35}
#s936SuitePro .s936-cmp-score{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
#s936SuitePro .s936-cmp-score .metric{border:1px solid rgba(255,255,255,.11);border-radius:14px;background:rgba(0,0,0,.18);padding:9px;text-align:center}
#s936SuitePro .s936-cmp-score .metric b{display:block;color:#00ffcc;font-size:1.1rem}
#s936SuitePro .s936-cmp-score .metric span{display:block;color:rgba(255,255,255,.62);font-size:.58rem;text-transform:uppercase;font-weight:900}
#s936SuitePro .s936-cmp-piano{display:flex;align-items:flex-end;gap:3px;overflow:auto;border-radius:14px;background:rgba(0,0,0,.24);padding:10px;min-height:100px}
#s936SuitePro .s936-cmp-key{position:relative;min-width:22px;height:78px;border:1px solid rgba(255,255,255,.26);border-radius:0 0 6px 6px;background:rgba(255,255,255,.90);color:#111;font-size:.50rem;font-weight:950;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px}
#s936SuitePro .s936-cmp-key.black{height:52px;min-width:18px;background:#090909;color:#fff;margin-left:-11px;margin-right:-11px;z-index:2;border-color:rgba(255,255,255,.12)}
#s936SuitePro .s936-cmp-key.on{background:#00ffcc;color:#00221d;box-shadow:0 0 0 2px rgba(0,255,204,.30) inset}
#s936SuitePro .s936-cmp-key.root{background:#ffe066;color:#151000}
#s936SuitePro .s936-cmp-key.tension{background:#ff5bea;color:#270020}

#s936SuitePro .s936-cmp-btn.danger{border-color:rgba(255,90,90,.70);background:rgba(255,90,90,.10);color:#ffb9b9}
#s936SuitePro .s936-cmp-preview{border:1px solid rgba(255,216,77,.34);border-radius:16px;background:rgba(255,216,77,.07);padding:12px;margin-top:10px}
#s936SuitePro .s936-cmp-preview pre{white-space:pre-wrap;margin:8px 0 0;color:#f8fbff;background:rgba(0,0,0,.22);border-radius:12px;padding:10px;font-size:.70rem;line-height:1.42;max-height:260px;overflow:auto}
#s936SuitePro .s936-cmp-structure-table{display:grid;gap:7px;margin-top:10px}
#s936SuitePro .s936-cmp-structure-row{display:grid;grid-template-columns:34px minmax(80px,.8fr) minmax(140px,1.2fr) minmax(80px,.55fr);gap:7px;align-items:center;border:1px solid rgba(255,255,255,.11);border-radius:12px;background:rgba(0,0,0,.18);padding:8px}
#s936SuitePro .s936-cmp-structure-row b{color:#ffe066;font-size:.62rem}
#s936SuitePro .s936-cmp-structure-row span{color:rgba(255,255,255,.82);font-size:.65rem;line-height:1.35}

#s936SuitePro .s936-cmp-toast{position:absolute;left:18px;right:18px;bottom:18px;border:1px solid rgba(0,255,204,.35);border-radius:14px;background:rgba(0,0,0,.80);color:#bfffee;padding:10px 12px;font-size:.72rem;font-weight:900;opacity:0;pointer-events:none;transform:translateY(8px);transition:.16s ease;z-index:5}
#s936SuitePro .s936-cmp-toast.show{opacity:1;transform:translateY(0)}
@media(max-width:1100px){#s936SuitePro .s936-cmp-hero,#s936SuitePro .s936-cmp-grid.two{grid-template-columns:1fr}#s936SuitePro .s936-cmp-score{grid-template-columns:repeat(2,1fr)}}
#s936SuitePro .s936-cmp-change-banner{
  display:inline-flex;align-items:center;justify-content:flex-start;gap:6px;
  width:max-content;max-width:100%;
  border:1px solid rgba(0,255,204,.30);
  border-radius:999px;
  background:rgba(0,255,204,.10);
  color:#bfffee;
  padding:4px 9px;
  margin:0 0 8px;
  font-size:.52rem;
  font-weight:900;
  letter-spacing:.55px;
  text-transform:uppercase;
  box-shadow:0 0 12px rgba(0,255,204,.05);
}
#s936SuitePro .s936-cmp-render-error{
  border:1px solid rgba(255,90,90,.42);
  border-radius:16px;
  background:rgba(255,90,90,.08);
  color:#ffdada;
  padding:14px;
  font-size:.76rem;
  line-height:1.45;
}
#s936SuitePro .s936-cmp-render-error b{color:#fff}
#s936SuitePro .s936-cmp-render-error code{
  display:block;
  margin-top:8px;
  white-space:pre-wrap;
  color:#ffb5b5;
  font-size:.64rem;
}


/* Cambio 34 · Dock limpio: sin banners temporales; menú de canción en nivel Compose */
#s936SuitePro .s936-cmp-shell{gap:8px!important}
#s936SuitePro .s936-cmp-change-banner{display:none!important}
#s936SuitePro .s936-cmp-songbar{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
  min-height:28px;
  margin:0 0 2px;
}
#s936SuitePro .s936-cmp-songbar-title{
  color:rgba(255,255,255,.45);
  font-size:.54rem;
  font-weight:900;
  text-transform:uppercase;
  letter-spacing:.7px;
}
#s936SuitePro .s936-cmp-songbar-right{display:flex;align-items:center;gap:6px}
#s936SuitePro .s936-cmp-song-menu-wrap{position:relative;display:inline-flex}
#s936SuitePro .s936-cmp-song-menu-btn{
  border:1px solid rgba(255,224,102,.42);
  border-radius:999px;
  background:rgba(255,224,102,.08);
  color:#ffe066;
  padding:5px 10px;
  font-size:.58rem;
  font-weight:950;
  letter-spacing:.45px;
  text-transform:uppercase;
  cursor:pointer;
}
#s936SuitePro .s936-cmp-song-menu-btn:hover{
  background:rgba(255,224,102,.14);
  border-color:rgba(255,224,102,.7);
}
#s936SuitePro .s936-cmp-song-menu-dd{
  display:none;
  position:absolute;
  top:calc(100% + 6px);
  right:0;
  z-index:9999;
  min-width:190px;
  padding:6px;
  border:1px solid rgba(0,255,204,.35);
  border-radius:12px;
  background:rgba(10,13,22,.98);
  box-shadow:0 18px 46px rgba(0,0,0,.88);
}
#s936SuitePro .s936-cmp-song-menu-dd.open{display:block}
#s936SuitePro .s936-cmp-song-menu-item{
  width:100%;
  display:block;
  border:0;
  border-radius:8px;
  background:transparent;
  color:rgba(255,255,255,.78);
  text-align:left;
  padding:7px 10px;
  font-size:.66rem;
  font-weight:850;
  cursor:pointer;
}
#s936SuitePro .s936-cmp-song-menu-item:hover{background:rgba(0,255,204,.10);color:#00ffcc}
#s936SuitePro .s936-cmp-song-menu-item.warn{color:#ffe066}

/* Cambio 34 · Menú principal como tercer item junto a COMPOSE / STUDIO */
#s936SuitePro .s936-cmp-songbar:not(.is-fallback){display:none!important}
#s936SuitePro .s936-compose-top-menu-host{
  display:flex!important;
  align-items:center!important;
  gap:6px!important;
}
#s936SuitePro .s936-compose-top-menu-wrap{
  position:relative;
  display:inline-flex;
  align-items:center;
  flex:0 0 auto;
}
#s936SuitePro .s936-compose-top-menu-btn{
  min-height:34px;
  padding:0 18px;
  border-radius:12px;
  border:1px solid rgba(255,224,102,.34);
  background:linear-gradient(180deg,rgba(255,224,102,.10),rgba(255,224,102,.045));
  color:#ffe066;
  font-size:.62rem;
  font-weight:950;
  letter-spacing:.55px;
  text-transform:uppercase;
  cursor:pointer;
  box-shadow:0 0 0 1px rgba(0,0,0,.24) inset;
}
#s936SuitePro .s936-compose-top-menu-btn:hover{
  border-color:rgba(255,224,102,.70);
  background:rgba(255,224,102,.13);
}
#s936SuitePro .s936-compose-top-menu-dd{
  display:none;
  position:absolute;
  top:calc(100% + 6px);
  right:0;
  z-index:10050;
  width:230px;
  padding:7px;
  border:1px solid rgba(0,255,204,.34);
  border-radius:13px;
  background:rgba(9,12,20,.98);
  box-shadow:0 18px 48px rgba(0,0,0,.90);
}
#s936SuitePro .s936-compose-top-menu-dd.open{display:block}
#s936SuitePro .s936-compose-top-menu-head{
  color:rgba(0,255,204,.75);
  font-size:.50rem;
  font-weight:950;
  text-transform:uppercase;
  letter-spacing:.7px;
  padding:5px 7px 3px;
}
#s936SuitePro .s936-compose-top-menu-item{
  width:100%;
  display:block;
  border:0;
  border-radius:8px;
  background:transparent;
  color:rgba(255,255,255,.76);
  text-align:left;
  padding:7px 9px;
  font-size:.64rem;
  font-weight:850;
  cursor:pointer;
}
#s936SuitePro .s936-compose-top-menu-item:hover{background:rgba(0,255,204,.10);color:#00ffcc}
#s936SuitePro .s936-compose-top-menu-item.strong{color:#ffe066}
#s936SuitePro .s936-compose-top-menu-item.warn{color:#ffd27a}

/* Cambio 37 · Dock más limpio: sin título interno y submenús más compactos */
#s936SuitePro .s936-cmp-shell{margin-top:0!important;padding-top:0!important}
#s936SuitePro .s936-cmp-shell > h3,
#s936SuitePro .s936-cmp-shell > .s936-title,
#s936SuitePro .s936-cmp-shell > .s936-section-title{display:none!important}
#s936SuitePro .s936-tool-nav,
#s936SuitePro .s936-cmp-shell nav{margin-top:0!important}

`;
    style.textContent += `
/* Cambio 37 · Menú superior como trio premium COMPOSE / STUDIO / MENÚ */
#s936SuitePro .s936-compose-top-menu-host{
  display:grid!important;
  grid-template-columns:repeat(3,minmax(0,1fr))!important;
  gap:6px!important;
  align-items:center!important;
  padding:5px!important;
  border:1px solid rgba(0,255,204,.22)!important;
  border-radius:15px!important;
  background:
    linear-gradient(180deg,rgba(0,255,204,.055),rgba(255,224,102,.025)),
    rgba(8,12,18,.72)!important;
  box-shadow:
    0 0 0 1px rgba(0,0,0,.22) inset,
    0 10px 24px rgba(0,0,0,.28)!important;
}
#s936SuitePro .s936-compose-top-menu-host > button,
#s936SuitePro .s936-compose-top-menu-host > [role="button"],
#s936SuitePro .s936-compose-top-menu-host .s936-compose-top-menu-wrap{
  width:100%!important;
  min-width:0!important;
}
#s936SuitePro .s936-compose-top-menu-host > button,
#s936SuitePro .s936-compose-top-menu-host > [role="button"],
#s936SuitePro .s936-compose-top-menu-btn{
  height:34px!important;
  min-height:34px!important;
  justify-content:center!important;
  text-align:center!important;
  border-radius:11px!important;
  border:1px solid rgba(255,255,255,.14)!important;
  background:linear-gradient(180deg,rgba(255,255,255,.075),rgba(255,255,255,.025))!important;
  color:rgba(255,255,255,.82)!important;
  font-size:.62rem!important;
  font-weight:950!important;
  letter-spacing:.55px!important;
  text-transform:uppercase!important;
  box-shadow:0 0 0 1px rgba(0,0,0,.25) inset!important;
  transition:transform .12s ease, border-color .12s ease, background .12s ease, color .12s ease, box-shadow .12s ease!important;
}
#s936SuitePro .s936-compose-top-menu-host > button:hover,
#s936SuitePro .s936-compose-top-menu-host > [role="button"]:hover,
#s936SuitePro .s936-compose-top-menu-btn:hover{
  transform:translateY(-1px)!important;
  border-color:rgba(255,224,102,.55)!important;
  color:#ffe066!important;
  background:linear-gradient(180deg,rgba(255,224,102,.13),rgba(255,224,102,.045))!important;
  box-shadow:0 0 14px rgba(255,224,102,.08)!important;
}
#s936SuitePro .s936-compose-top-menu-host > button.active,
#s936SuitePro .s936-compose-top-menu-host > button[aria-pressed="true"],
#s936SuitePro .s936-compose-top-menu-host > [role="button"].active{
  border-color:rgba(0,255,204,.58)!important;
  color:#00ffcc!important;
  background:linear-gradient(180deg,rgba(0,255,204,.15),rgba(0,255,204,.05))!important;
}
#s936SuitePro .s936-compose-top-menu-btn{
  color:#ffe066!important;
  border-color:rgba(255,224,102,.36)!important;
}
#s936SuitePro .s936-compose-top-menu-dd{
  width:260px!important;
  border-radius:14px!important;
  border-color:rgba(255,224,102,.28)!important;
  background:
    radial-gradient(circle at 20% 0%,rgba(255,224,102,.10),transparent 40%),
    rgba(7,10,16,.985)!important;
}
#s936SuitePro .s936-compose-top-menu-item{
  border-radius:9px!important;
  padding:8px 10px!important;
}
`;

    style.textContent += `
/* Cambio 37 · Submenú Compose como barra digital, no como cápsulas grandes */
#s936SuitePro .s936-compose-subrail,
#s936SuitePro .s936-cmp-shell > nav.s936-compose-subrail{
  display:flex!important;
  flex-wrap:nowrap!important;
  gap:0!important;
  align-items:center!important;
  min-height:31px!important;
  padding:2px 4px!important;
  margin:2px 0 6px!important;
  border:1px solid rgba(0,255,204,.18)!important;
  border-radius:10px!important;
  background:
    linear-gradient(180deg,rgba(0,255,204,.045),rgba(255,255,255,.012)),
    rgba(3,7,12,.55)!important;
  box-shadow:
    inset 0 -1px 0 rgba(0,255,204,.10),
    inset 0 1px 0 rgba(255,255,255,.04)!important;
  overflow-x:auto!important;
  scrollbar-width:thin;
}
#s936SuitePro .s936-compose-subrail::-webkit-scrollbar{height:4px}
#s936SuitePro .s936-compose-subrail button,
#s936SuitePro .s936-compose-subrail [role="button"]{
  position:relative!important;
  flex:0 0 auto!important;
  min-height:25px!important;
  height:25px!important;
  padding:0 10px!important;
  border:0!important;
  border-radius:7px!important;
  background:transparent!important;
  color:rgba(255,255,255,.58)!important;
  font-size:.55rem!important;
  font-weight:900!important;
  line-height:25px!important;
  letter-spacing:.32px!important;
  text-transform:uppercase!important;
  box-shadow:none!important;
}
#s936SuitePro .s936-compose-subrail button::after,
#s936SuitePro .s936-compose-subrail [role="button"]::after{
  content:"";
  position:absolute;
  left:9px;
  right:9px;
  bottom:2px;
  height:2px;
  border-radius:999px;
  background:transparent;
  transition:background .15s, box-shadow .15s, opacity .15s;
}
#s936SuitePro .s936-compose-subrail button:hover,
#s936SuitePro .s936-compose-subrail [role="button"]:hover{
  color:#bfffee!important;
  background:rgba(0,255,204,.055)!important;
}
#s936SuitePro .s936-compose-subrail button:hover::after,
#s936SuitePro .s936-compose-subrail [role="button"]:hover::after{
  background:rgba(0,255,204,.45);
}
#s936SuitePro .s936-compose-subrail button.active,
#s936SuitePro .s936-compose-subrail button.is-active,
#s936SuitePro .s936-compose-subrail button[aria-pressed="true"],
#s936SuitePro .s936-compose-subrail [role="button"].active,
#s936SuitePro .s936-compose-subrail [role="button"].is-active,
#s936SuitePro .s936-compose-subrail [role="button"][aria-pressed="true"]{
  color:#00ffcc!important;
  background:linear-gradient(180deg,rgba(0,255,204,.105),rgba(0,255,204,.025))!important;
}
#s936SuitePro .s936-compose-subrail button.active::after,
#s936SuitePro .s936-compose-subrail button.is-active::after,
#s936SuitePro .s936-compose-subrail button[aria-pressed="true"]::after,
#s936SuitePro .s936-compose-subrail [role="button"].active::after,
#s936SuitePro .s936-compose-subrail [role="button"].is-active::after,
#s936SuitePro .s936-compose-subrail [role="button"][aria-pressed="true"]::after{
  background:#00ffcc;
  box-shadow:0 0 12px rgba(0,255,204,.55);
}
#s936SuitePro .s936-compose-top-menu-host{
  margin-bottom:5px!important;
}

`;
    style.textContent += `
/* Cambio 39 · Dock Compose flexible y submenú sin scroll horizontal */
#s936SuitePro{
  resize:horizontal!important;
  overflow-x:hidden!important;
  overflow-y:auto!important;
  min-width:330px!important;
  max-width:min(560px,46vw)!important;
  width:clamp(360px,25vw,470px)!important;
}
#s936SuitePro, #s936SuitePro *{
  box-sizing:border-box;
}
#s936SuitePro .s936-cmp-shell,
#s936SuitePro .s936-cmp-card,
#s936SuitePro .s936-cmp-subnav{
  max-width:100%!important;
  overflow-x:hidden!important;
}
#s936SuitePro .s936-cmp-subnav{
  display:grid!important;
  grid-template-columns:repeat(6,minmax(0,1fr))!important;
  gap:0!important;
  margin:2px 0 8px!important;
  padding:3px!important;
  border:1px solid rgba(0,255,204,.16)!important;
  border-radius:9px!important;
  background:linear-gradient(90deg,rgba(0,255,204,.060),rgba(255,224,102,.035),rgba(0,0,0,.08))!important;
}
#s936SuitePro .s936-cmp-subtab{
  min-width:0!important;
  width:100%!important;
  border-radius:6px!important;
  border:0!important;
  background:transparent!important;
  padding:6px 3px!important;
  font-size:.49rem!important;
  line-height:1!important;
  letter-spacing:.35px!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
  white-space:nowrap!important;
}
#s936SuitePro .s936-cmp-subtab.active{
  background:linear-gradient(180deg,rgba(0,255,204,.20),rgba(0,255,204,.055))!important;
  box-shadow:inset 0 -2px 0 rgba(0,255,204,.85),0 0 12px rgba(0,255,204,.08)!important;
}
#s936SuitePro .s936-cmp-subtab:hover:not(.active){
  background:rgba(255,224,102,.065)!important;
  color:#ffe066!important;
}
@media(max-width:380px){
  #s936SuitePro .s936-cmp-subtab{
    font-size:.44rem!important;
    letter-spacing:.2px!important;
    padding-left:2px!important;
    padding-right:2px!important;
  }
}
`;

    style.textContent += `
/* Cambio 44 · Subnav estable sin romper escenario Chart: conserva Mapa Maestro y deja Tab Pro discreto si aún no tiene módulo real */
#s936SuitePro .s936-compose-subrail{
  max-width:100%!important;
  overflow-x:hidden!important;
}
#s936SuitePro .s936-compose-subrail button,
#s936SuitePro .s936-compose-subrail [role="button"]{
  padding-left:8px!important;
  padding-right:8px!important;
  font-size:.52rem!important;
}
#s936SuitePro .s936-compose-subrail button[data-tool="tabpro"],
#s936SuitePro .s936-compose-subrail [data-tool="tabpro"]{
  opacity:.72!important;
}
`;


    style.textContent += `
/* Cambio 44 · Top menu estable y subnav sin invadir ni generar scroll horizontal */
html, body{
  overflow-x:hidden!important;
}
#s936SuitePro{
  box-sizing:border-box!important;
}
#s936SuitePro .s936-compose-top-menu-host{
  min-height:42px!important;
  padding:5px!important;
  gap:6px!important;
}
#s936SuitePro .s936-compose-top-menu-host > button,
#s936SuitePro .s936-compose-top-menu-host > [role="button"],
#s936SuitePro .s936-compose-top-menu-btn{
  min-height:32px!important;
  height:32px!important;
  border-radius:11px!important;
  font-size:.62rem!important;
}
#s936SuitePro .s936-compose-subrail,
#s936SuitePro .s936-cmp-shell > nav.s936-compose-subrail{
  overflow-x:hidden!important;
  scrollbar-width:none!important;
  min-height:28px!important;
  height:28px!important;
  padding:2px 4px!important;
  margin:3px 0 5px!important;
}
#s936SuitePro .s936-compose-subrail::-webkit-scrollbar{display:none!important}
#s936SuitePro .s936-compose-subrail button,
#s936SuitePro .s936-compose-subrail [role="button"]{
  flex:1 1 0!important;
  min-width:0!important;
  padding:0 4px!important;
  height:24px!important;
  line-height:24px!important;
  font-size:.48rem!important;
}
`;

    document.head.appendChild(style);
  }

  function safe(fn, fallback = null) {
    try { return fn(); } catch (error) { console.warn("Suite Pro Compose:", error); return fallback; }
  }

  // ---------------------------------------------------------------
  // Cambio 236: Modal "Nueva canción" — título, autor, álbum y plantilla
  // ---------------------------------------------------------------
  function openNewSongModal() {
    // Limpiar modal previo si existe
    document.getElementById('s936-newsong-modal')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 's936-newsong-modal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;display:flex;align-items:center;justify-content:center;';

    const modal = document.createElement('div');
    modal.style.cssText = 'background:#0d1a17;border:1px solid #1e3530;border-radius:16px;padding:28px 24px;width:360px;max-width:95vw;display:flex;flex-direction:column;gap:12px;box-shadow:0 8px 40px rgba(0,0,0,.6);';

    // Título del modal
    const title = document.createElement('div');
    title.style.cssText = 'font-size:1rem;font-weight:800;color:#00ffcc;letter-spacing:.04em;margin-bottom:4px;';
    title.textContent = '✦ Nueva canción';
    modal.appendChild(title);

    function field(placeholder, value = '') {
      const inp = document.createElement('input');
      inp.placeholder = placeholder;
      inp.value = value;
      inp.style.cssText = 'background:#1c2224;border:1px solid #2a3a37;border-radius:10px;padding:9px 12px;color:#e8f4f2;font-size:.82rem;font-family:inherit;width:100%;box-sizing:border-box;outline:none;';
      return inp;
    }
    function label(text) {
      const l = document.createElement('div');
      l.style.cssText = 'font-size:.68rem;color:#9fb0ae;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:-6px;';
      l.textContent = text;
      return l;
    }
    function select(options, defaultVal = '') {
      const s = document.createElement('select');
      s.style.cssText = 'background:#1c2224;border:1px solid #2a3a37;border-radius:10px;padding:9px 12px;color:#e8f4f2;font-size:.82rem;font-family:inherit;width:100%;box-sizing:border-box;';
      options.forEach(([val, txt]) => {
        const o = document.createElement('option');
        o.value = val; o.textContent = txt;
        if(val === defaultVal) o.selected = true;
        s.appendChild(o);
      });
      return s;
    }

    // Nombre de la canción
    const snap = window.Studio936AppBridge?.getProjectSnapshot?.();
    modal.appendChild(label('Título'));
    const titleInp = field('Nombre de la canción', snap?.title || '');
    modal.appendChild(titleInp);

    // Autor — sugiere el nombre del usuario logeado
    const user = window.Studio936Library?.getCurrentUser?.();
    modal.appendChild(label('Autor'));
    const authorInp = field('Autor', snap?.author || user?.name || '');
    modal.appendChild(authorInp);

    // Álbum — lista los álbumes existentes
    const albums = window.Studio936Library?.getAlbums?.() || [];
    modal.appendChild(label('Álbum'));
    const albumOpts = [['', 'Sin álbum'], ...albums.map(a => [a.id, a.name])];
    const albumSel = select(albumOpts, '');
    modal.appendChild(albumSel);

    // Punto de partida: en blanco o desde plantilla
    modal.appendChild(label('¿Cómo quieres empezar?'));
    const startOpts = [['blank', 'En blanco'], ...TEMPLATES.map(t => [t.id, t.name + ' — ' + t.vibe])];
    const startSel = select(startOpts, 'blank');
    modal.appendChild(startSel);

    // Botones
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;margin-top:8px;';
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.style.cssText = 'flex:1;background:transparent;border:1px solid #2a3a37;color:#9fb0ae;border-radius:10px;padding:10px;font-size:.82rem;cursor:pointer;';
    cancelBtn.onclick = () => overlay.remove();

    const createBtn = document.createElement('button');
    createBtn.textContent = 'Crear canción';
    createBtn.style.cssText = 'flex:2;background:rgba(0,255,204,.15);border:1px solid #00ffcc;color:#00ffcc;border-radius:10px;padding:10px;font-size:.82rem;font-weight:800;cursor:pointer;';
    createBtn.onclick = () => {
      const tpl = TEMPLATES.find(t => t.id === startSel.value);
      const title = titleInp.value.trim() || 'Nueva canción';
      const author = authorInp.value.trim();

      overlay.remove();

      // 1. Limpiar el editor con newSong pasando título y autor
      window.Studio936AppBridge?.newSong?.(title, author);

      // 2. Aplicar título, autor, estilo y BPM de la plantilla
      setTimeout(() => {
        // Actualizar el título en la barra superior si existe
        const titleEl = document.querySelector('#songTitle,#song-title,[data-field="title"],input[name="title"]');
        if(titleEl){ titleEl.value = title; titleEl.dispatchEvent(new Event('input', {bubbles:true})); titleEl.dispatchEvent(new Event('change', {bubbles:true})); }
        if(tpl){
          window.Studio936AppBridge?.setBPM?.(tpl.bpm);
        }
        // Guardar en Librería como nuevo borrador
        const snap = window.Studio936AppBridge?.getProjectSnapshot?.();
        if(snap){
          snap.title = title;
          snap.author = author;
          snap.status = 'draft';
          if(window.Studio936Library?.saveOrUpdateCurrent){
            window.Studio936Library.setCurrentOpenCompositionId?.(null);
            window.Studio936Library.saveOrUpdateCurrent(snap);
          }
        }
        // 3. Si eligió plantilla, guardar en sessionStorage para abrirla
        // después del reload que hace newSong (location.reload no mantiene
        // el estado en memoria).
        if(tpl){
          sessionStorage.setItem('s936_open_template', tpl.name);
        }
      }, 200);
    };
    btnRow.append(cancelBtn, createBtn);
    modal.appendChild(btnRow);

    overlay.appendChild(modal);
    overlay.addEventListener('click', (e) => { if(e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    setTimeout(() => titleInp.focus(), 50);
  }

  function render(ctx) {
    installStyles();
    const c = ctx.clearContent();
    // Cambio 37: sin título interno "Composición Pro"; el modo ya vive en la pestaña COMPOSE.
    const shell = ctx.el("div", "s936-cmp-shell");

    // Cambio 37: el menú queda como herramienta de Compose; Mapa Maestro vuelve a subnav.
    renderComposeSongMenu(ctx, shell);

    const tools = [
      ["structure","Estructura"],
      ["editor","Editor"],
      ["mastermap","Mapa Maestro"],
      ["scales","Escalas"],
      ["tabpro","Tab Pro"],
      ["theory","Teoría"],
    ];

    const nav = ctx.toolNav(tools, ctx.state.composeTool || state.tool || "structure", (v) => {
      ctx.state.composeTool = v;
      state.tool = v;
      saveState();
    });
    try {
      nav.classList.add("s936-compose-subrail");
      nav.setAttribute("aria-label", "Herramientas de Compose");
    } catch(_) {}
    try {
      Array.from(nav.querySelectorAll("button,[role='button']")).forEach((btn, i) => {
        if (tools[i]) btn.dataset.tool = tools[i][0];
      });
    } catch(_) {}
    shell.appendChild(nav);

    // Cambio 5: el shell entra a pantalla ANTES de renderizar el módulo.
    // Si Estructura o Chart lanzan un error, ya no queda la vista "quieta" solo con el menú.
    c.appendChild(shell);

    let active = ctx.state.composeTool || state.tool || "structure";
    if (active === "songDNA") active = "structure";
    // Cambio 37: herramientas históricas vuelven al menú Compose sin perderse.
    // Plantillas / Inspiración / Transponer / Acordes IA pueden abrirse desde el menú compacto.
    if (active !== "editor") {
      safe(() => window.Studio936AppBridge?.deactivateEditorSurface?.(), null);
    }
    // v0.8.3: desmontar chart del panel derecho cuando no estamos en Estructura
    if (active !== "structure") {
      try { window.Studio936SuiteProChart?.unmountFromRightPanel?.(); } catch(_) {}
    }
    const map = {
      templates: renderTemplates,
      inspire: renderInspire,
      transpose: renderTranspose,
      structure: renderStructureModule,
      editor: renderEditorModule,
      mastermap: renderMasterMap,
      chordAI: renderChordAI,
      theory: renderTheory,
      scales: renderScales,
      tabpro: renderTabPro,
      library: renderLibrarySettings,
      settings: renderLibrarySettings
    };

    try {
      (map[active] || renderStructureModule)(ctx, shell);
    } catch (error) {
      console.error("Suite Pro Compose Cambio 24 render error:", error);
      const box = ctx.el("section", "s936-cmp-render-error");
      box.innerHTML = "<b>Cambio número 45 · Estructura no pudo renderizar.</b><br>El error queda visible en pantalla. Revisa la primera línea roja de consola.";
      const code = ctx.el("code", "", String(error && (error.stack || error.message) || error));
      box.appendChild(code);
      shell.appendChild(box);
    }
  }


  function renderComposeSongMenu(ctx, shell) {
    // Cambio 37: el menú queda como herramienta de Compose; no reemplaza Mapa Maestro.
    // Mapa Maestro vuelve al subnav junto a Estructura/Editor/Escalas.
    setTimeout(() => {
      try {
        mountComposeTopMenu();
        scheduleMasterMapRelocation();
      } catch (err) {
        console.warn("Cambio 37 menú Compose:", err);
        // Fallback visual dentro del shell si no se encuentra la barra superior.
        if (!document.getElementById("s936-compose-top-menu-fallback")) {
          const fallback = document.createElement("div");
          fallback.id = "s936-compose-top-menu-fallback";
          fallback.className = "s936-cmp-songbar is-fallback";
          fallback.appendChild(buildComposeMenuWrap());
          shell.insertBefore(fallback, shell.firstChild || null);
        }
      }
    }, 30);
  }

  function buildComposeMenuWrap() {
    const wrap = document.createElement("div");
    wrap.id = "s936-compose-top-menu-wrap";
    wrap.className = "s936-compose-top-menu-wrap";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "s936-compose-top-menu-btn";
    btn.title = "Menú principal";
    btn.innerHTML = "☰ MENÚ";

    const dd = document.createElement("div");
    dd.className = "s936-compose-top-menu-dd";

    const header = (label) => {
      const h = document.createElement("div");
      h.className = "s936-compose-top-menu-head";
      h.textContent = label;
      return h;
    };
    const item = (label, fn, cls="") => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "s936-compose-top-menu-item " + cls;
      b.textContent = label;
      b.onclick = (e) => {
        e.stopPropagation();
        dd.classList.remove("open");
        try { fn?.(); } catch(err) { console.warn(err); }
      };
      return b;
    };

    dd.appendChild(header("Compose"));
    const openTool = (tool) => {
      try {
        const root = document.getElementById("s936SuitePro") || document;
        const navBtn = Array.from(root.querySelectorAll(".s936-cmp-subtab,button,[role='button']")).find(el => {
          const t = String(el.dataset?.tool || "");
          const label = String(el.textContent || "").trim().toLowerCase();
          return t === tool || label === tool.toLowerCase();
        });
        if (navBtn) { navBtn.click(); return; }
        state.tool = tool;
        saveState();
        const composeBtn = Array.from(root.querySelectorAll("button,[role='button']")).find(el => /^compose$/i.test(String(el.textContent || "").trim()));
        composeBtn?.click?.();
      } catch(_) {}
    };
    dd.appendChild(item("Plantillas", () => openTool("templates"), "strong"));
    dd.appendChild(item("Inspiración", () => openTool("inspire")));
    dd.appendChild(item("Transponer", () => openTool("transpose")));
    dd.appendChild(item("Acordes IA", () => openTool("chordAI")));
    dd.appendChild(item("Librería / sonidos", () => openTool("library")));
    dd.appendChild(item("Configuración", () => openTool("settings")));
    dd.appendChild(item("Nueva canción", () => window.S936OpenNewSongModal?.()));
    dd.appendChild(item("Guardar local", () => window.Studio936AppBridge?.saveLocal?.() || window.Studio936AppBridge?.save?.()));
    dd.appendChild(item("Guardar en Librería", () => {
      // Cambio 235: guarda la canción actual como borrador en la Librería
      // nueva (Studio936Library) — aparece en Composiciones bajo "Borradores"
      // y se sincroniza con la nube si hay sesión activa.
      const snap = window.Studio936AppBridge?.getProjectSnapshot?.();
      if(snap && window.Studio936Library?.saveOrUpdateCurrent) {
        snap.status = 'draft';
        window.Studio936Library.saveOrUpdateCurrent(snap);
      } else {
        // Fallback: si no hay snapshot disponible, guardar local
        window.Studio936AppBridge?.saveLocal?.();
      }
    }, "warn"));
    dd.appendChild(item("Exportar / imprimir", () => window.Studio936ExportEngine?.open?.() || window.print?.(), "warn"));
    dd.appendChild(header("Studio"));
    dd.appendChild(item("Abrir Studio", () => {
      const btns = Array.from(document.querySelectorAll("button,[role='button'],.s936-tab,.s936-suite-tab"));
      const target = btns.find(el => /^studio$/i.test(String(el.textContent || "").trim()));
      if (target) target.click();
    }));

    btn.onclick = (e) => {
      e.stopPropagation();
      document.querySelectorAll(".s936-compose-top-menu-dd.open").forEach(d => { if (d !== dd) d.classList.remove("open"); });
      dd.classList.toggle("open");
    };
    document.addEventListener("click", () => dd.classList.remove("open"));

    wrap.append(btn, dd);
    return wrap;
  }

  function mountComposeTopMenu() {
    document.getElementById("s936-compose-top-menu-wrap")?.remove();

    const root = document.getElementById("s936SuitePro") || document;
    const controls = Array.from(root.querySelectorAll("button,[role='button']"))
      .filter(el => !el.closest?.(".s936-compose-top-menu-wrap") && !el.closest?.(".s936-cmp-songbar"));

    const composeBtn = controls.find(el => /^compose$/i.test(String(el.textContent || "").trim()));
    const studioBtn = controls.find(el => /^studio$/i.test(String(el.textContent || "").trim()));
    const anchor = studioBtn || composeBtn;

    const wrap = buildComposeMenuWrap();

    if (anchor?.parentElement) {
      anchor.insertAdjacentElement("afterend", wrap);
      anchor.parentElement.classList.add("s936-compose-top-menu-host");
      return true;
    }

    const shell = document.querySelector("#s936SuitePro .s936-cmp-shell");
    if (shell) {
      const fallback = document.createElement("div");
      fallback.className = "s936-cmp-songbar is-fallback";
      fallback.appendChild(wrap);
      shell.insertBefore(fallback, shell.firstChild || null);
      return true;
    }

    return false;
  }

  function scheduleMasterMapRelocation() {
    setTimeout(() => {
      try {
        const root = document.getElementById("s936SuitePro") || document;
        const candidates = Array.from(root.querySelectorAll("button,[role='button'],.s936-suite-tab,.s936-tab"));
        const master = candidates.find(el => {
          if (el.closest?.(".s936-cmp-shell")) return false;
          if (el.closest?.(".s936-compose-top-menu-wrap")) return false;
          if (el.dataset?.tool === "mastermap") return false;
          const text = String(el.textContent || "").trim();
          return /^mapa\s+maestro$/i.test(text) || /mapa\s+maestro/i.test(text);
        });
        if (!master) return;
        window.Studio936OpenMasterMap = () => master.click();
        master.dataset.s936MovedToComposeMenu = "true";
        master.style.display = "none";
        master.setAttribute("aria-hidden", "true");
      } catch(_) {}
    }, 120);
  }


  function snap(ctx) { return safe(() => ctx.snapshot(), {}) || {}; }
  function keyOf(ctx) { return normalizeKey(snap(ctx).key || ctx.byId?.("soloKey")?.value || "C"); }
  function useFlats(key) { return String(key || "").includes("b") || FLAT_KEYS.has(key); }
  function namesFor(key) { return useFlats(key) ? FLAT : SHARP; }

  function normalizeKey(value) {
    if (typeof value !== "string") value = String(value || "");
    const match = value.trim().match(/^([A-Ga-g])([#b]?)/);
    return match ? match[1].toUpperCase() + (match[2] || "") : "C";
  }

  function pcName(pc, key="C") {
    const names = namesFor(key);
    return names[((Number(pc) % 12) + 12) % 12] || "C";
  }

  function scaleNotes(key, type) {
    const root = NOTE_INDEX[normalizeKey(key)];
    const intervals = SCALE_INTERVALS[type] || SCALE_INTERVALS.major;
    return intervals.map((n) => pcName(root + n, key));
  }

  function majorChords(key) {
    const notes = scaleNotes(key, "major");
    const quality = ["", "m", "m", "", "", "m", "dim"];
    return notes.map((n, i) => n + quality[i]);
  }

  function romanToChord(key, roman) {
    const clean = String(roman || "").trim();
    const ext = clean.replace(/^(I|ii|iii|IV|V|vi|vii|i|iv|VI|VII)/, "");
    const baseRoman = clean.match(/^(I|ii|iii|IV|V|vi|vii|i|iv|VI|VII)/)?.[0] || clean;
    const major = majorChords(key);
    const rootMap = { I:0, ii:1, iii:2, IV:3, V:4, vi:5, vii:6, i:0, iv:3, VI:5, VII:6 };
    const idx = rootMap[baseRoman];
    if (idx === undefined) return clean;
    let chord = major[idx] || clean;
    if (baseRoman === "i" && !/m/.test(chord)) chord += "m";
    if (baseRoman === "iv" && !/m/.test(chord)) chord += "m";
    if (ext) chord = chord.replace(/m?dim?$/, "") + ext;
    return chord;
  }

  function romanListToChords(key, list) { return (list || []).map((r) => romanToChord(key, r)); }

  function allItems(ctx) {
    const s = snap(ctx);
    const sections = s.sections || {};
    return Object.keys(sections).flatMap((section) => (Array.isArray(sections[section]) ? sections[section] : []).map((item) => ({ section, item })));
  }

  function uniqueChords(ctx) {
    const seen = new Set();
    const out = [];
    allItems(ctx).forEach(({ item }) => {
      const name = String(item?.name || item?.chord || "").trim();
      if (!name || seen.has(name)) return;
      seen.add(name);
      out.push({ name, notes: String(item?.notes || "").trim(), bars: Number(item?.bars) || 1 });
    });
    if (!out.length) out.push({ name: ctx.currentChordName?.() || "C", notes: (ctx.currentChordNotes?.() || []).join(" "), bars: 1 });
    return out;
  }

  function sectionSummary(ctx) {
    const s = snap(ctx);
    const sections = s.sections || {};
    const arrangement = Array.isArray(s.arrangement) ? s.arrangement : [];
    const parts = arrangement.length
      ? arrangement.map((p) => ({ key: p.section || p.key, label: p.label || p.name || p.section || p.key }))
      : Object.keys(sections).map((key) => ({ key, label: key }));
    return parts.map((part) => {
      const items = Array.isArray(sections[part.key]) ? sections[part.key] : [];
      const chords = items.map((i) => String(i?.name || i?.chord || "").trim()).filter(Boolean);
      return { label: part.label || part.key, key: part.key, chords, bars: items.reduce((sum, i) => sum + Math.max(1, Number(i?.bars) || 1), 0) };
    }).filter((p) => p.chords.length || p.bars);
  }

  function line(ctx, parent, label, value) {
    const p = ctx.el("p", "s936-cmp-line");
    p.appendChild(ctx.el("strong", "", label + ":"));
    p.appendChild(document.createTextNode(" " + (value || "—")));
    parent.appendChild(p);
  }

  function actions(ctx, parent) {
    const box = ctx.el("div", "s936-cmp-actions");
    parent.appendChild(box);
    return box;
  }

  function btn(ctx, parent, label, fn, cls="s936-cmp-btn") {
    const b = ctx.el("button", cls, label);
    b.type = "button";
    b.onclick = fn;
    parent.appendChild(b);
    return b;
  }

  function copyText(ctx, text, message="Copiado.") {
    const value = String(text || "");
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(value).then(() => toast(ctx, message)).catch(() => downloadTxt(ctx, "studio936-compose.txt", value));
    } else downloadTxt(ctx, "studio936-compose.txt", value);
  }

  function downloadTxt(ctx, filename, text) {
    if (typeof ctx.downloadText === "function") ctx.downloadText(filename, text);
    else {
      const blob = new Blob([String(text || "")], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    }
    toast(ctx, "Descarga preparada.");
  }

  function toast(ctx, message) {
    const panel = ctx.byId?.("s936SuitePro") || document.getElementById("s936SuitePro");
    if (!panel) return;
    let box = panel.querySelector(".s936-cmp-toast");
    if (!box) {
      box = ctx.el ? ctx.el("div", "s936-cmp-toast") : document.createElement("div");
      box.className = "s936-cmp-toast";
      panel.appendChild(box);
    }
    box.textContent = message;
    box.classList.add("show");
    clearTimeout(box._timer);
    box._timer = setTimeout(() => box.classList.remove("show"), 2200);
  }


  function renderMasterMap(ctx, shell) {
    const card = ctx.el("section", "s936-cmp-master-card");
    card.appendChild(ctx.el("h4", "", "Mapa Maestro / Mapa de canción"));
    const p = ctx.el("p", "", "El mapa maestro se conserva como herramienta de composición: vista global de la forma, partes, ruta de la canción y arquitectura general. No se elimina; ahora vive junto a Estructura, Editor, Escalas, Tab Pro y Teoría.");
    p.style.cssText = "margin:0;color:rgba(255,255,255,.62);font-size:.70rem;line-height:1.45";
    card.appendChild(p);

    const grid = ctx.el("div", "s936-cmp-master-grid");
    const b1 = ctx.el("button", "s936-cmp-mini-menu-btn", "Abrir Mapa Maestro");
    b1.onclick = () => {
      if (window.Studio936OpenMasterMap) return window.Studio936OpenMasterMap();
      const btns = Array.from(document.querySelectorAll("button,[role='button'],.s936-tab,.s936-suite-tab"));
      const target = btns.find(el => /mapa\s+maestro/i.test(String(el.textContent || "")) && !el.closest?.(".s936-cmp-shell"));
      if (target) target.click();
      else toast(ctx, "Mapa Maestro preparado; no se encontró el módulo visual original en esta carga.");
    };
    const b2 = ctx.el("button", "s936-cmp-mini-menu-btn", "Volver a Estructura");
    b2.onclick = () => {
      const root = document.getElementById("s936SuitePro") || document;
      const target = Array.from(root.querySelectorAll(".s936-cmp-subtab,button")).find(el => String(el.dataset?.tool || "") === "structure" || /^estructura$/i.test(String(el.textContent || "").trim()));
      target?.click?.();
    };
    grid.append(b1, b2);
    card.appendChild(grid);
    shell.appendChild(card);
  }

  function renderLibrarySettings(ctx, shell) {
    const card = ctx.el("section", "s936-cmp-master-card");
    card.appendChild(ctx.el("h4", "", "Librería / configuración"));
    const p = ctx.el("p", "", "Acceso reservado para librería de sonidos, presets, plantillas, preferencias de Compose y configuración del flujo musical. Se conserva como opción del menú sin invadir el Chart.");
    p.style.cssText = "margin:0;color:rgba(255,255,255,.62);font-size:.70rem;line-height:1.45";
    card.appendChild(p);
    shell.appendChild(card);
  }

  function renderTemplates(ctx, shell) {
    const key = keyOf(ctx);
    const head = ctx.el("section", "s936-cmp-hero");
    const summary = ctx.el("article", "s936-cmp-card important");
    summary.appendChild(ctx.el("h4", "", "Template cockpit"));
    line(ctx, summary, "Tonalidad actual", key);
    line(ctx, summary, "Uso real", "elige plantilla, revisa preview y aplícala con respaldo automático.");
    line(ctx, summary, "Seguridad", "antes de reemplazar la canción, Compose guarda un backup local.");
    const box = actions(ctx, summary);
    btn(ctx, box, "Abrir Estructura", () => ctx.callBridge?.("openStructure", () => false), "s936-cmp-btn secondary");
    btn(ctx, box, "Abrir Editor", () => ctx.callBridge?.("openEditor", () => false), "s936-cmp-btn secondary");
    head.appendChild(summary);

    const current = ctx.el("article", "s936-cmp-card gold");
    current.appendChild(ctx.el("h4", "", "Canción actual"));
    const sections = sectionSummary(ctx);
    line(ctx, current, "Partes detectadas", sections.length || "—");
    line(ctx, current, "Acordes únicos", uniqueChords(ctx).map((c) => c.name).slice(0, 6).join(" · "));
    line(ctx, current, "Aplicar template", "reemplaza forma + secciones + progresiones; conserva título, autor, instrumento y ajustes.");
    head.append(summary, current);
    shell.appendChild(head);

    const selected = TEMPLATES.find((tpl) => tpl.id === state.previewTemplate) || TEMPLATES[0];
    renderTemplatePreview(ctx, shell, selected, key);

    const grid = ctx.el("div", "s936-cmp-grid");
    TEMPLATES.forEach((tpl) => {
      const card = ctx.el("article", "s936-cmp-card" + (selected.id === tpl.id ? " gold" : ""));
      card.appendChild(ctx.el("h4", "", tpl.name));
      line(ctx, card, "Vibe", tpl.vibe);
      line(ctx, card, "Estilo/BPM", `${tpl.style} · ${tpl.bpm} BPM`);
      line(ctx, card, "Forma", tpl.form.map((p) => p[1]).join(" → "));
      const chorus = romanListToChords(key, tpl.sections.chorus || tpl.sections.verse);
      line(ctx, card, "Coro en " + key, chorus.join(" → "));
      const chips = ctx.el("div", "s936-cmp-chips");
      chorus.forEach((ch, i) => chips.appendChild(ctx.el("span", "s936-cmp-chip " + (i === 0 ? "root" : ""), ch)));
      card.appendChild(chips);
      const text = templateText(tpl, key);
      const actionBox = actions(ctx, card);
      btn(ctx, actionBox, "Preview", () => {
        state.previewTemplate = tpl.id;
        state.selectedTemplate = tpl.name;
        saveState();
        render(ctx);
      }, "s936-cmp-btn warn");
      btn(ctx, actionBox, "Copiar", () => copyText(ctx, text, "Template copiado."));
      btn(ctx, actionBox, "TXT", () => downloadTxt(ctx, "studio936-template-" + slug(tpl.name) + ".txt", text), "s936-cmp-btn secondary");
      btn(ctx, actionBox, "Aplicar", () => applyTemplateToSong(ctx, tpl, key), "s936-cmp-btn danger");
      grid.appendChild(card);
    });
    shell.appendChild(grid);
  }

  function templateText(tpl, key) {
    const lines = [
      "Studio 936 · Compose Template",
      "Template: " + tpl.name,
      "Key: " + key,
      "Style: " + tpl.style,
      "BPM: " + tpl.bpm,
      "Vibe: " + tpl.vibe,
      "",
      "FORM:",
      tpl.form.map((p, i) => `${String(i+1).padStart(2,"0")}. ${p[1]} [${p[0]}]`).join("\n"),
      "",
      "HARMONY:"
    ];
    Object.keys(tpl.sections).forEach((section) => {
      lines.push(section + ": " + romanListToChords(key, tpl.sections[section]).join(" → "));
    });
    lines.push("", "LYRIC/ARRANGE:", tpl.lyric);
    return lines.join("\n");
  }

  function renderTemplatePreview(ctx, shell, tpl, key) {
    const preview = ctx.el("section", "s936-cmp-card important");
    preview.appendChild(ctx.el("h4", "", "Preview aplicable · " + tpl.name));
    line(ctx, preview, "Resultado", `${tpl.style} · ${tpl.bpm} BPM · ${tpl.form.length} partes`);
    line(ctx, preview, "Intención", tpl.lyric);
    const table = ctx.el("div", "s936-cmp-structure-table");
    tpl.form.forEach((part, index) => {
      const section = part[0];
      const label = part[1];
      const progression = romanListToChords(key, templateSectionRomans(tpl, section));
      const row = ctx.el("div", "s936-cmp-structure-row");
      row.appendChild(ctx.el("b", "", String(index + 1).padStart(2, "0")));
      row.appendChild(ctx.el("span", "", label));
      row.appendChild(ctx.el("span", "", progression.join(" → ")));
      row.appendChild(ctx.el("span", "", suggestedBarsForSection(section) + " compases"));
      table.appendChild(row);
    });
    preview.appendChild(table);
    const actionBox = actions(ctx, preview);
    btn(ctx, actionBox, "Copiar preview", () => copyText(ctx, templateText(tpl, key), "Preview copiado."));
    btn(ctx, actionBox, "Aplicar con backup", () => applyTemplateToSong(ctx, tpl, key), "s936-cmp-btn danger");
    shell.appendChild(preview);
  }

  function templateSectionRomans(tpl, sectionKey) {
    if (tpl.sections[sectionKey]) return tpl.sections[sectionKey];
    if (/verse/i.test(sectionKey)) return tpl.sections.verse || tpl.sections.chorus || ["I","V","vi","IV"];
    if (/pre/i.test(sectionKey)) return tpl.sections.prechorus || tpl.sections.verse || ["IV","V","vi","V"];
    if (/chorus|hook/i.test(sectionKey)) return tpl.sections.chorus || tpl.sections.verse || ["I","V","vi","IV"];
    if (/bridge|puente/i.test(sectionKey)) return tpl.sections.bridge || tpl.sections.prechorus || ["vi","IV","I","V"];
    if (/solo|interlude|intro|outro/i.test(sectionKey)) return tpl.sections.intro || tpl.sections.chorus || tpl.sections.verse || ["I","V"];
    return tpl.sections.verse || tpl.sections.chorus || ["I","V","vi","IV"];
  }

  function suggestedBarsForSection(sectionKey) {
    if (/intro|outro|interlude/i.test(sectionKey)) return 4;
    if (/prechorus|bridge|solo/i.test(sectionKey)) return 8;
    return 8;
  }

  function chordBassForName(name) {
    const slash = String(name || "").match(/\/\s*([A-Ga-g])([#b]?)/);
    const root = slash ? slash[1].toUpperCase() + (slash[2] || "") : normalizeKey(name);
    return root + "2";
  }

  function chordNotesForName(name, key) {
    const rootName = normalizeKey(name);
    const root = NOTE_INDEX[rootName];
    if (root === undefined) return ["C3","E3","G3"];
    const lower = String(name || "").toLowerCase();
    let intervals = [0, 4, 7];
    if (/dim|°/.test(lower)) intervals = [0, 3, 6];
    else if (/aug|\+5/.test(lower)) intervals = [0, 4, 8];
    else if (/sus2/.test(lower)) intervals = [0, 2, 7];
    else if (/sus4|sus/.test(lower)) intervals = [0, 5, 7];
    else if (/(^|[^a-z])m(?!aj)|min|minor/.test(lower)) intervals = [0, 3, 7];
    if (/maj7|ma7|Δ/.test(lower)) intervals.push(11);
    else if (/(^|[^0-9])7|9|11|13/.test(lower)) intervals.push(10);
    if (/6|13/.test(lower)) intervals.push(9);
    if (/9/.test(lower)) intervals.push(2);
    if (/11/.test(lower)) intervals.push(5);

    const pcs = Array.from(new Set(intervals.map((n) => (root + n + 120) % 12))).slice(0, 5);
    const names = namesFor(key || rootName);
    return pcs.map((pc, index) => {
      const octave = index < 3 ? 3 : 4;
      return names[((pc % 12) + 12) % 12] + octave;
    });
  }

  function buildTemplateProject(ctx, tpl, key) {
    const s = snap(ctx);
    const current = safe(() => JSON.parse(JSON.stringify(s.project || {})), {}) || {};
    const sections = {};
    const lyrics = {};
    const sectionSolos = {};
    const sectionSeen = new Set();

    tpl.form.forEach(([sectionKey, label]) => {
      if (sectionSeen.has(sectionKey)) return;
      sectionSeen.add(sectionKey);
      const chords = romanListToChords(key, templateSectionRomans(tpl, sectionKey));
      const bars = suggestedBarsForSection(sectionKey);
      sections[sectionKey] = chords.map((name) => ({
        name,
        bass: chordBassForName(name),
        notes: chordNotesForName(name, key).join(" "),
        bars: Math.max(1, Math.round(bars / Math.max(1, chords.length)))
      }));
      lyrics[sectionKey] = "";
      sectionSolos[sectionKey] = { key, scale: "major", phrase: "" };
    });

    return Object.assign({}, current, {
      title: s.title || current.title || "Canción sin nombre",
      author: s.author || current.author || "Autor no definido",
      style: tpl.style,
      bpm: tpl.bpm,
      instrument: current.instrument || s.instrument || "piano",
      soloKey: key,
      key,
      sections,
      arrangement: tpl.form.map(([section, label]) => ({ section, label })),
      lyrics: Object.assign({}, lyrics),
      sectionSolos: Object.assign({}, current.sectionSolos || {}, sectionSolos),
      updatedAt: new Date().toISOString()
    });
  }

  function backupCurrentProject(ctx, reason) {
    const s = snap(ctx);
    const key = "studio936_compose_template_backups_v1";
    const list = safe(() => JSON.parse(localStorage.getItem(key) || "[]"), []) || [];
    list.unshift({
      id: "backup_" + Date.now(),
      reason,
      title: s.title || "Canción",
      createdAt: new Date().toISOString(),
      project: s.project || s
    });
    localStorage.setItem(key, JSON.stringify(list.slice(0, 20)));
  }

  function applyTemplateToSong(ctx, tpl, key) {
    const msg = [
      "Esto reemplazará estructura, secciones y progresiones de la canción actual.",
      "",
      "Se guardará un backup local antes de aplicar.",
      "",
      "¿Aplicar template " + tpl.name + "?"
    ].join("\n");
    if (!window.confirm(msg)) return;
    const project = buildTemplateProject(ctx, tpl, key);
    backupCurrentProject(ctx, "Antes de aplicar template " + tpl.name);
    localStorage.setItem("studio936ComposerV25SongStructure", JSON.stringify(project));
    toast(ctx, "Template aplicado. Recargando canción...");
    setTimeout(() => window.location.reload(), 450);
  }



  function renderInspire(ctx, shell) {
    const s = snap(ctx);
    const key = keyOf(ctx);
    const top = ctx.el("section", "s936-cmp-card important");
    top.appendChild(ctx.el("h4", "", "Inspiración · idea inmediata"));
    const toolbar = ctx.el("div", "s936-cmp-toolbar");

    const mood = field(ctx, "Ambiente");
    const moodSelect = select(ctx, [["luminosa","Luminosa"],["intima","Íntima"],["energia","Energía"]], state.inspireMood);
    moodSelect.onchange = () => { state.inspireMood = moodSelect.value; saveState(); render(ctx); };
    mood.appendChild(moodSelect);

    const energy = field(ctx, "Energía");
    const energySelect = select(ctx, [["calma","Calma"],["crecimiento","Crecimiento"],["explosion","Explosión"]], state.inspireEnergy);
    energySelect.onchange = () => { state.inspireEnergy = energySelect.value; saveState(); render(ctx); };
    energy.appendChild(energySelect);

    toolbar.append(mood, energy);
    top.appendChild(toolbar);

    const seed = pickInspire(state.inspireMood, s.title || "");
    line(ctx, top, "Título sugerido", seed[0]);
    line(ctx, top, "Concepto", seed[1]);
    line(ctx, top, "Primera línea", seed[2]);
    line(ctx, top, "Hook de coro", seed[3]);
    line(ctx, top, "Progresión", romanListToChords(key, seed[4]).join(" → "));
    const box = actions(ctx, top);
    const text = inspireText(seed, key, state.inspireEnergy);
    btn(ctx, box, "Copiar idea", () => copyText(ctx, text, "Idea copiada."));
    btn(ctx, box, "TXT", () => downloadTxt(ctx, "studio936-inspire-" + slug(seed[0]) + ".txt", text), "s936-cmp-btn secondary");
    btn(ctx, box, "Nueva chispa", () => { state.inspireMood = nextMood(state.inspireMood); saveState(); render(ctx); }, "s936-cmp-btn warn");
    shell.appendChild(top);

    const grid = ctx.el("div", "s936-cmp-grid two");
    const lyric = ctx.el("article", "s936-cmp-card");
    lyric.appendChild(ctx.el("h4", "", "Borrador de letra"));
    lyric.appendChild(ctx.el("p", "s936-cmp-muted", `${seed[2]}\n\n${seed[3]}\n${seed[3].replace(/ luz| voz| canción| mí/gi, " verdad")}`));
    grid.appendChild(lyric);

    const arrangement = ctx.el("article", "s936-cmp-card");
    arrangement.appendChild(ctx.el("h4", "", "Arreglo sugerido"));
    line(ctx, arrangement, "Verso", "menos densidad, deja respirar a la voz");
    line(ctx, arrangement, "Pre-coro", "sube hi-hat o tensión armónica");
    line(ctx, arrangement, "Coro", "abre registro, repite hook, batería completa");
    line(ctx, arrangement, "Studio", "graba una REC Idea con guitarra o voz para capturar emoción");
    grid.appendChild(arrangement);
    shell.appendChild(grid);
  }

  function pickInspire(mood, title) {
    const list = INSPIRE[mood] || INSPIRE.luminosa;
    const idx = Math.abs(hash(String(title || "") + mood + state.inspireEnergy)) % list.length;
    return list[idx];
  }

  function nextMood(mood) {
    const keys = ["luminosa","intima","energia"];
    return keys[(keys.indexOf(mood) + 1) % keys.length] || "luminosa";
  }

  function inspireText(seed, key, energy) {
    return [
      "Studio 936 · Inspire",
      "Title: " + seed[0],
      "Key: " + key,
      "Energy: " + energy,
      "Concept: " + seed[1],
      "First line: " + seed[2],
      "Chorus hook: " + seed[3],
      "Progression: " + romanListToChords(key, seed[4]).join(" → ")
    ].join("\n");
  }

  function renderTranspose(ctx, shell) {
    const currentKey = keyOf(ctx);
    if (!state.targetKey) state.targetKey = currentKey === "C" ? "G" : "C";
    const card = ctx.el("section", "s936-cmp-card important");
    card.appendChild(ctx.el("h4", "", "Transpose · preview seguro"));
    const toolbar = ctx.el("div", "s936-cmp-toolbar");
    const from = field(ctx, "Desde");
    from.appendChild(ctx.el("div", "s936-cmp-chip root", currentKey));
    const to = field(ctx, "Hacia");
    const targetSelect = select(ctx, SHARP.concat(["Bb","Eb","Ab","Db"]).map((n) => [n,n]), state.targetKey);
    targetSelect.onchange = () => { state.targetKey = targetSelect.value; saveState(); render(ctx); };
    to.appendChild(targetSelect);
    toolbar.append(from, to);
    card.appendChild(toolbar);

    const entries = uniqueChords(ctx);
    const preview = entries.map((entry) => ({ from: entry.name, to: transposeChordName(entry.name, currentKey, state.targetKey) }));
    const chips = ctx.el("div", "s936-cmp-chips");
    preview.slice(0, 12).forEach((p) => chips.appendChild(ctx.el("span", "s936-cmp-chip", `${p.from} → ${p.to}`)));
    card.appendChild(chips);

    const text = [
      "Studio 936 · Transpose Preview",
      "From: " + currentKey,
      "To: " + state.targetKey,
      "",
      preview.map((p) => `${p.from} -> ${p.to}`).join("\n")
    ].join("\n");
    const box = actions(ctx, card);
    btn(ctx, box, "Copiar preview", () => copyText(ctx, text, "Preview de transposición copiado."));
    btn(ctx, box, "TXT", () => downloadTxt(ctx, `studio936-transpose-${currentKey}-to-${state.targetKey}.txt`, text), "s936-cmp-btn secondary");
    btn(ctx, box, "Aplicar seguro", () => toast(ctx, "Aplicar transposición a la canción requiere bridge de escritura. Lo hacemos en fase v1.1."), "s936-cmp-btn warn");
    shell.appendChild(card);

    const grid = ctx.el("div", "s936-cmp-grid two");
    const vocal = ctx.el("article", "s936-cmp-card");
    vocal.appendChild(ctx.el("h4", "", "Uso vocal"));
    line(ctx, vocal, "Subir tono", "más brillo, más tensión vocal");
    line(ctx, vocal, "Bajar tono", "más cómodo, más íntimo");
    line(ctx, vocal, "Recomendación", "prueba 2 tonos arriba/abajo antes de grabar voz definitiva");
    grid.appendChild(vocal);
    const inst = ctx.el("article", "s936-cmp-card");
    inst.appendChild(ctx.el("h4", "", "Uso instrumental"));
    line(ctx, inst, "Guitarra", "elige tonalidades con cuerdas abiertas si quieres resonancia");
    line(ctx, inst, "Piano", "piensa en registro de la melodía y mano izquierda");
    line(ctx, inst, "Ukelele", "tonalidades simples ayudan a cantar mejor");
    grid.appendChild(inst);
    shell.appendChild(grid);
  }

  function transposeChordName(name, fromKey, toKey) {
    const text = String(name || "");
    const match = text.match(/^([A-Ga-g])([#b]?)(.*)$/);
    if (!match) return text;
    const root = match[1].toUpperCase() + (match[2] || "");
    const from = NOTE_INDEX[normalizeKey(fromKey)];
    const to = NOTE_INDEX[normalizeKey(toKey)];
    const pc = NOTE_INDEX[root];
    if (from === undefined || to === undefined || pc === undefined) return text;
    const diff = to - from;
    const next = pcName(pc + diff, toKey);
    return next + (match[3] || "");
  }


  function renderStructureModule(ctx, shell) {
    // v0.8.1: Estructura absorbe Plantillas e Inspiración como subtabs
    // v0.8.2: siempre arrancar en "song" salvo que el usuario haya clickeado Plantillas/Inspiración
    const subtool = ctx.state.structureSubtool || "song";
    // limpiar después de renderizar para que la próxima entrada sea siempre Estructura
    if (subtool === "templates") {
      ctx.state.structureSubtool = "song";
      return renderTemplates(ctx, shell);
    }
    if (subtool === "inspire") {
      ctx.state.structureSubtool = "song";
      return renderInspire(ctx, shell);
    }

    const mod = window.Studio936SuiteProStructure || window.Studio936SuiteProModules?.structure;
    if (mod && typeof mod.render === "function") {
      return mod.render(ctx, shell);
    }
    return renderSongDNA(ctx, shell);
  }

  function renderSongDNA(ctx, shell) {
    const s = snap(ctx);
    const sections = sectionSummary(ctx);
    const chords = uniqueChords(ctx);
    const totalBars = sections.reduce((sum, x) => sum + x.bars, 0);
    const hasLyrics = Object.values(s.lyrics || {}).filter((x) => String(x || "").trim()).length;
    const repeated = mostCommonChord(chords);

    const card = ctx.el("section", "s936-cmp-card important");
    card.appendChild(ctx.el("h4", "", "Estructura DNA · constructor de canción"));
    const score = ctx.el("div", "s936-cmp-score");
    metric(ctx, score, sections.length || "—", "partes");
    metric(ctx, score, chords.length || "—", "acordes");
    metric(ctx, score, totalBars || "—", "compases");
    metric(ctx, score, hasLyrics || "—", "letras");
    card.appendChild(score);
    line(ctx, card, "Centro tonal", keyOf(ctx));
    line(ctx, card, "Estilo", s.style || "—");
    line(ctx, card, "Acorde dominante visual", repeated || "—");
    line(ctx, card, "Diagnóstico", dnaDiagnosis(ctx));
    const topActions = actions(ctx, card);
    btn(ctx, topActions, "Abrir estructura", () => ctx.callBridge?.("openStructure", () => false), "s936-cmp-btn warn");
    btn(ctx, topActions, "Abrir editor", () => ctx.callBridge?.("openEditor", () => false), "s936-cmp-btn secondary");
    btn(ctx, topActions, "Plantillas", () => { ctx.state.composeTool = "structure"; ctx.state.structureSubtool = "templates"; state.tool = "structure"; saveState(); render(ctx); }, "s936-cmp-btn secondary");
    shell.appendChild(card);

    const grid = ctx.el("div", "s936-cmp-grid two");
    const form = ctx.el("article", "s936-cmp-card");
    form.appendChild(ctx.el("h4", "", "Forma actual"));
    if (!sections.length) {
      form.appendChild(ctx.el("p", "s936-cmp-muted", "No hay estructura útil todavía. Empieza por Templates o abre Estructura."));
    } else {
      const table = ctx.el("div", "s936-cmp-structure-table");
      sections.slice(0, 16).forEach((p, i) => {
        const row = ctx.el("div", "s936-cmp-structure-row");
        row.appendChild(ctx.el("b", "", String(i + 1).padStart(2, "0")));
        row.appendChild(ctx.el("span", "", p.label));
        row.appendChild(ctx.el("span", "", p.chords.slice(0, 4).join(" → ") || "—"));
        row.appendChild(ctx.el("span", "", p.bars + " compases"));
        table.appendChild(row);
      });
      form.appendChild(table);
    }
    grid.appendChild(form);

    const next = ctx.el("article", "s936-cmp-card gold");
    next.appendChild(ctx.el("h4", "", "Qué construir ahora"));
    line(ctx, next, "Si empiezas de cero", "usa Templates y aplica una forma base con backup.");
    line(ctx, next, "Si falta sección", "abre Estructura para ordenar intro, verso, coro y puente.");
    line(ctx, next, "Si faltan acordes", "abre Editor o usa Chord AI para generar una progresión.");
    line(ctx, next, "Si falta interpretación", "usa Practice y Studio para probar con voz, piano, guitarra y drums.");
    grid.appendChild(next);
    shell.appendChild(grid);
  }

  function metric(ctx, parent, value, label) {
    const box = ctx.el("div", "metric");
    box.appendChild(ctx.el("b", "", String(value)));
    box.appendChild(ctx.el("span", "", label));
    parent.appendChild(box);
  }

  function mostCommonChord(chords) {
    return chords.length ? chords[0].name : "";
  }

  function dnaDiagnosis(ctx) {
    const sections = sectionSummary(ctx);
    if (!sections.length) return "Empieza por Templates o crea acordes en el editor.";
    if (sections.length < 4) return "La canción tiene base; conviene completar forma: verso, coro, puente/outro.";
    if (uniqueChords(ctx).length < 4) return "Armonía simple; puede estar bien, o puedes agregar contraste en pre-coro/puente.";
    return "Canción con estructura utilizable. Trabaja letras, dinámica y arreglo.";
  }

  
  
  function renderEditorModule(ctx, shell) {
    const mod = window.Studio936SuiteProEditor || window.Studio936SuiteProModules?.editor;
    if (mod && typeof mod.render === "function") {
      return mod.render(ctx, shell);
    }
    return renderEditorGateway(ctx, shell);
  }

function renderEditorGateway(ctx, shell) {
    const s = snap(ctx);
    const sectionName = s.currentSectionName || s.currentSection || "Sección actual";
    const chordName = ctx.currentChordName?.() || s.chordLabel || "Acorde actual";
    const notes = typeof ctx.currentChordNotes === "function" ? ctx.currentChordNotes() : [];

    const card = ctx.el("section", "s936-cmp-card important");
    card.appendChild(ctx.el("h4", "", "Editor de composición"));
    line(ctx, card, "Objetivo", "crear y corregir acordes, bajo, notas y compases sin salir del flujo creativo.");
    line(ctx, card, "Sección activa", sectionName);
    line(ctx, card, "Acorde activo", chordName);
    const chips = ctx.el("div", "s936-cmp-chips");
    notes.forEach((n, i) => chips.appendChild(ctx.el("span", "s936-cmp-chip " + (i === 0 ? "root" : ""), n)));
    card.appendChild(chips);
    const box = actions(ctx, card);
    btn(ctx, box, "Abrir Editor real", () => ctx.callBridge?.("openEditor", () => false), "s936-cmp-btn warn");
    btn(ctx, box, "Abrir Estructura", () => ctx.callBridge?.("openStructure", () => false), "s936-cmp-btn secondary");
    btn(ctx, box, "Letra / TAB", () => ctx.callBridge?.("openLyrics", () => false), "s936-cmp-btn secondary");
    shell.appendChild(card);

    const grid = ctx.el("div", "s936-cmp-grid two");
    const workflow = ctx.el("article", "s936-cmp-card");
    workflow.appendChild(ctx.el("h4", "", "Flujo recomendado"));
    line(ctx, workflow, "1", "define forma en Estructura DNA o Templates.");
    line(ctx, workflow, "2", "entra al Editor y ajusta acordes/bajo/notas por sección.");
    line(ctx, workflow, "3", "valida en Practice con letra, instrumento y timeline.");
    line(ctx, workflow, "4", "produce en Studio con drums, mixer y REC Idea.");
    grid.appendChild(workflow);

    const why = ctx.el("article", "s936-cmp-card gold");
    why.appendChild(ctx.el("h4", "", "Por qué vive en Compose"));
    line(ctx, why, "Estructura", "decide la forma musical.");
    line(ctx, why, "Editor", "escribe la armonía real.");
    line(ctx, why, "Chord AI", "propone opciones si te falta color.");
    line(ctx, why, "Scales", "te da material melódico sobre lo que escribes.");
    grid.appendChild(why);
    shell.appendChild(grid);
  }

function renderChordAI(ctx, shell) {
    const key = keyOf(ctx);
    const card = ctx.el("section", "s936-cmp-card important");
    card.appendChild(ctx.el("h4", "", "Chord AI · sugeridor armónico"));
    const toolbar = ctx.el("div", "s936-cmp-toolbar");
    const goalField = field(ctx, "Objetivo");
    const goalSelect = select(ctx, Object.keys(CHORD_GOALS).map((k) => [k, CHORD_GOALS[k].label]), state.chordGoal);
    goalSelect.onchange = () => { state.chordGoal = goalSelect.value; saveState(); render(ctx); };
    goalField.appendChild(goalSelect);
    toolbar.appendChild(goalField);
    card.appendChild(toolbar);

    const goal = CHORD_GOALS[state.chordGoal] || CHORD_GOALS.coro;
    line(ctx, card, "Intención", goal.intent);
    const grid = ctx.el("div", "s936-cmp-grid");
    goal.romans.forEach((romans, idx) => {
      const suggestion = ctx.el("article", "s936-cmp-card");
      suggestion.appendChild(ctx.el("h5", "", `Opción ${idx + 1}`));
      const chords = romanListToChords(key, romans);
      line(ctx, suggestion, "Romanos", romans.join(" → "));
      line(ctx, suggestion, "En " + key, chords.join(" → "));
      const chips = ctx.el("div", "s936-cmp-chips");
      chords.forEach((ch, i) => chips.appendChild(ctx.el("span", "s936-cmp-chip " + (i === 0 ? "root" : ""), ch)));
      suggestion.appendChild(chips);
      const box = actions(ctx, suggestion);
      const text = `Chord AI · ${goal.label}\nKey: ${key}\n${chords.join(" → ")}\nUso: ${goal.intent}`;
      btn(ctx, box, "Copiar", () => copyText(ctx, text, "Progresión copiada."));
      btn(ctx, box, "Enviar a REC Idea", () => saveComposeIdea(ctx, "Chord AI", text), "s936-cmp-btn secondary");
      btn(ctx, box, "Aplicar", () => toast(ctx, "Aplicar progresión al editor será fase segura v1.1."), "s936-cmp-btn warn");
      grid.appendChild(suggestion);
    });
    card.appendChild(grid);
    shell.appendChild(card);
  }

  function renderTheory(ctx, shell) {
    // v0.8.1: Teoría absorbe Escalas y Acordes IA como subtabs
    const subtool = ctx.state.theorySubtool || "theory";
    const subtabs = [
      ["theory", "Teoría"],
      ["scales", "Escalas"],
      ["chordAI", "Acordes IA"]
    ];
    const subnav = ctx.el("div", "s936-cmp-subnav");
    subtabs.forEach(([key, label]) => {
      const btn = ctx.el("button", "s936-cmp-subtab" + (subtool === key ? " active" : ""), label);
      btn.type = "button";
      btn.onclick = () => { ctx.state.theorySubtool = key; render(ctx); };
      subnav.appendChild(btn);
    });
    shell.appendChild(subnav);

    if (subtool === "scales") return renderScales(ctx, shell);
    if (subtool === "chordAI") return renderChordAI(ctx, shell);

    const key = keyOf(ctx);
    const grid = ctx.el("div", "s936-cmp-grid two");
    [
      ["Verso", "Estabilidad", "Cuenta la historia. Usa I, vi, IV y V con poca densidad.", "Menos notas, más espacio."],
      ["Pre-coro", "Tensión", "Prepara el salto. Usa IV→V, ii→V o dominante sostenido.", "Aumenta ritmo, hi-hat, registro."],
      ["Coro", "Resolución", "Hook claro. Resuelve a I o abre con IV para sensación grande.", "Frase repetible, melodía alta."],
      ["Puente", "Contraste", "Cambia color: relativo menor, iv prestado, ii-V.", "Nuevo punto de vista de la letra."]
    ].forEach(([name, role, harmony, arrange]) => {
      const card = ctx.el("article", "s936-cmp-card");
      card.appendChild(ctx.el("h4", "", name + " · " + role));
      line(ctx, card, "Armonía", harmony);
      line(ctx, card, "Arreglo", arrange);
      line(ctx, card, "En " + key, theoryExample(name, key));
      grid.appendChild(card);
    });
    shell.appendChild(grid);

    const card = ctx.el("section", "s936-cmp-card gold");
    card.appendChild(ctx.el("h4", "", "Regla de oro Studio 936"));
    card.appendChild(ctx.el("p", "s936-cmp-muted", "La emoción manda: si una progresión suena simple pero canta verdad, es mejor que una progresión compleja sin alma. Usa teoría para dirigir la emoción, no para encerrarla."));
    shell.appendChild(card);
  }

  function theoryExample(name, key) {
    const map = {
      Verso: ["I","V","vi","IV"],
      "Pre-coro": ["IV","V","vi","V"],
      Coro: ["I","V","vi","IV"],
      Puente: ["vi","IV","I","V"]
    };
    return romanListToChords(key, map[name] || map.Coro).join(" → ");
  }

  function renderScales(ctx, shell) {
    const s = snap(ctx);
    const currentRoot = state.scaleRoot || keyOf(ctx);
    const card = ctx.el("section", "s936-cmp-card important");
    card.appendChild(ctx.el("h4", "", "Scales · mapa melódico"));
    const toolbar = ctx.el("div", "s936-cmp-toolbar");
    const rootField = field(ctx, "Raíz");
    const rootSelect = select(ctx, SHARP.concat(["Bb","Eb","Ab","Db"]).map((n) => [n,n]), currentRoot);
    rootSelect.onchange = () => { state.scaleRoot = rootSelect.value; saveState(); render(ctx); };
    rootField.appendChild(rootSelect);
    const typeField = field(ctx, "Escala");
    const typeSelect = select(ctx, [
      ["major","Mayor"],
      ["naturalMinor","Menor natural"],
      ["minorPent","Pentatónica menor"],
      ["majorPent","Pentatónica mayor"],
      ["blues","Blues"],
      ["dorian","Dórica"],
      ["mixolydian","Mixolidia"]
    ], state.scaleType);
    typeSelect.onchange = () => { state.scaleType = typeSelect.value; saveState(); render(ctx); };
    typeField.appendChild(typeSelect);
    toolbar.append(rootField, typeField);
    card.appendChild(toolbar);

    const notes = scaleNotes(currentRoot, state.scaleType);
    const chips = ctx.el("div", "s936-cmp-chips");
    notes.forEach((n, i) => chips.appendChild(ctx.el("span", "s936-cmp-chip " + (i === 0 ? "root" : ""), n)));
    card.appendChild(chips);
    renderPiano(ctx, card, notes, currentRoot);
    line(ctx, card, "Uso composición", scaleUse(state.scaleType));
    line(ctx, card, "Sobre acorde actual", "prueba notas largas en raíz/tercera/quinta y usa tensiones como paso.");
    const text = `Studio 936 · Scales\nRoot: ${currentRoot}\nScale: ${state.scaleType}\nNotes: ${notes.join(" · ")}\nUse: ${scaleUse(state.scaleType)}`;
    const box = actions(ctx, card);
    btn(ctx, box, "Copiar escala", () => copyText(ctx, text, "Escala copiada."));
    btn(ctx, box, "TXT", () => downloadTxt(ctx, "studio936-scale-" + slug(currentRoot + "-" + state.scaleType) + ".txt", text), "s936-cmp-btn secondary");
    shell.appendChild(card);

    const grid = ctx.el("div", "s936-cmp-grid two");
    const melody = ctx.el("article", "s936-cmp-card");
    melody.appendChild(ctx.el("h4", "", "Cómo usarla"));
    line(ctx, melody, "Inicio frase", notes[0] + " o " + (notes[2] || notes[1]));
    line(ctx, melody, "Tensión", notes[3] || notes[1]);
    line(ctx, melody, "Reposo", notes[0] + " / " + (notes[4] || notes[2]));
    line(ctx, melody, "Consejo", "canta primero, luego busca la nota.");
    grid.appendChild(melody);

    const current = ctx.el("article", "s936-cmp-card");
    current.appendChild(ctx.el("h4", "", "Contexto actual"));
    line(ctx, current, "Canción", s.title || "—");
    line(ctx, current, "Estilo", s.style || "—");
    line(ctx, current, "Acorde", ctx.currentChordName?.() || s.chordLabel || "—");
    grid.appendChild(current);
    shell.appendChild(grid);
  }

  function renderTabPro(ctx, shell) {
    const card = ctx.el("section", "s936-cmp-card");
    card.style.cssText = "text-align:center;padding:32px 20px;";
    const icon = ctx.el("div", "", "🎸");
    icon.style.cssText = "font-size:2.5rem;margin-bottom:12px;opacity:.6;";
    const title = ctx.el("h4", "", "Tab Pro");
    title.style.cssText = "color:#00ffcc;margin-bottom:8px;font-size:1rem;";
    const sub = ctx.el("p", "s936-struct-muted", "Editor de tablatura y partitura por sección. Próximamente en Studio 936.");
    sub.style.cssText = "max-width:240px;margin:0 auto 16px;line-height:1.6;";
    const badge = ctx.el("span", "", "En construcción");
    badge.style.cssText = "display:inline-block;background:rgba(180,100,255,.15);border:1px solid rgba(180,100,255,.4);border-radius:20px;color:#cc99ff;font-size:.62rem;font-weight:900;padding:4px 14px;text-transform:uppercase;letter-spacing:.6px;";
    card.append(icon, title, sub, badge);
    shell.appendChild(card);
  }

  function renderPiano(ctx, parent, notes, root) {
    const active = new Set(notes.map((n) => NOTE_INDEX[normalizeKey(n)]).filter((pc) => pc !== undefined));
    const rootPc = NOTE_INDEX[normalizeKey(root)];
    const keyboard = ctx.el("div", "s936-cmp-piano");
    const seq = [
      ["C",0,"white"],["C#",1,"black"],["D",2,"white"],["D#",3,"black"],["E",4,"white"],["F",5,"white"],
      ["F#",6,"black"],["G",7,"white"],["G#",8,"black"],["A",9,"white"],["A#",10,"black"],["B",11,"white"],
      ["C",0,"white"],["C#",1,"black"],["D",2,"white"],["D#",3,"black"],["E",4,"white"],["F",5,"white"],
      ["F#",6,"black"],["G",7,"white"],["G#",8,"black"],["A",9,"white"],["A#",10,"black"],["B",11,"white"]
    ];
    seq.forEach(([label, pc, kind], i) => {
      const key = ctx.el("span", "s936-cmp-key " + kind, label.replace("#","♯"));
      if (active.has(pc)) key.classList.add("on");
      if (pc === rootPc && active.has(pc)) key.classList.add("root");
      if (active.has(pc) && i > 12 && pc !== rootPc) key.classList.add("tension");
      keyboard.appendChild(key);
    });
    parent.appendChild(keyboard);
  }

  function scaleUse(type) {
    const map = {
      major: "luz, resolución, melodía clara",
      naturalMinor: "melancolía, introspección, narrativa",
      minorPent: "guitarra, rock, blues, frases seguras",
      majorPent: "pop, worship, melodía dulce",
      blues: "tensión expresiva, guitarra, voz con carácter",
      dorian: "menor con esperanza, funk/jazz",
      mixolydian: "dominante, rock, gospel, latin y groove"
    };
    return map[type] || "melodía y solo";
  }

  function field(ctx, label) {
    const div = ctx.el("div", "s936-cmp-field");
    div.appendChild(ctx.el("label", "", label));
    return div;
  }

  function select(ctx, options, value) {
    const sel = ctx.el("select", "s936-cmp-select");
    options.forEach(([v, label]) => {
      const opt = ctx.el("option", "", label);
      opt.value = v;
      if (String(v) === String(value)) opt.selected = true;
      sel.appendChild(opt);
    });
    return sel;
  }

  function saveComposeIdea(ctx, type, text) {
    const key = "studio936_compose_ideas_v1";
    const list = safe(() => JSON.parse(localStorage.getItem(key) || "[]"), []);
    list.unshift({ id: "cmp_" + Date.now(), type, text, title: snap(ctx).title || "Canción", section: snap(ctx).currentSection || "", createdAt: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(list.slice(0, 80)));
    toast(ctx, "Idea Compose guardada localmente.");
  }

  function hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    return h;
  }

  function slug(text) {
    return String(text || "studio936")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "studio936";
  }

  register();

  // Cambio 240: al cargar la página, aplicar título/autor/plantilla
  // pendientes del sessionStorage (guardados antes del reload de newSong).
  setTimeout(() => {
    const pendingTitle = sessionStorage.getItem('s936_new_title');
    const pendingAuthor = sessionStorage.getItem('s936_new_author');
    const pendingTemplate = sessionStorage.getItem('s936_open_template');
    if(pendingTitle || pendingAuthor || pendingTemplate){
      if(pendingTitle) sessionStorage.removeItem('s936_new_title');
      if(pendingAuthor) sessionStorage.removeItem('s936_new_author');
      if(pendingTemplate) sessionStorage.removeItem('s936_open_template');
      // Actualizar título en la barra superior
      const titleField = document.querySelector('#songTitle,input[name="title"],[data-field="title"],input[placeholder*="ítulo"],input[placeholder*="itle"]');
      if(titleField && pendingTitle){ titleField.value = pendingTitle; titleField.dispatchEvent(new Event('input',{bubbles:true})); titleField.dispatchEvent(new Event('change',{bubbles:true})); }
      // Abrir Template Cockpit si hay plantilla pendiente
      if(pendingTemplate){
        setTimeout(() => {
          window.S936SetTemplate?.(pendingTemplate);
          window.S936OpenTool?.('templates');
        }, 500);
      }
    }
  }, 1500);

  // Cambio 236: exponer funciones globalmente para que los callbacks
  // de botones puedan llamarlas sin problemas de scope del IIFE.
  window.S936OpenNewSongModal = openNewSongModal;
  window.S936SetTemplate = (name) => { state.selectedTemplate = name; };
  window.S936OpenTool = (tool) => {
    const root = document.getElementById("s936SuitePro") || document;
    const navBtn = Array.from(root.querySelectorAll(".s936-cmp-subtab,button,[role='button']")).find(el => {
      const t = String(el.dataset?.tool || "");
      const label = String(el.textContent || "").trim().toLowerCase();
      return t === tool || label === tool.toLowerCase();
    });
    if(navBtn){ navBtn.click(); return; }
    state.tool = tool;
    saveState();
    const composeBtn = Array.from(root.querySelectorAll("button,[role='button']")).find(el => /^compose$/i.test(String(el.textContent || "").trim()));
    composeBtn?.click?.();
  };
})();
