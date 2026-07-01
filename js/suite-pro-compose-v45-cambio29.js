// Studio 936 Composer - Suite Pro Compose Coordinator v4.5 Cambio 29
// Scope: Compose tab only. It does not write to app.js, editor, transport, drums, practice or studio modules.
// Product goal: coordinador modular de Composición: Plantillas, Inspiración, Transponer, Estructura, Editor, Acordes IA, Teoría y Escalas.
(function () {
  "use strict";

  const STYLE_ID = "s936SuiteProComposeStylesCambio29";
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
    window.Studio936SuiteProCompose = { version: "compose-v3.3-cambio-17", render };
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

`;
    document.head.appendChild(style);
  }

  function safe(fn, fallback = null) {
    try { return fn(); } catch (error) { console.warn("Suite Pro Compose:", error); return fallback; }
  }

  function render(ctx) {
    installStyles();
    const c = ctx.clearContent();
    ctx.title(c, "Composición Pro", "");
    const shell = ctx.el("div", "s936-cmp-shell");

    const banner = ctx.el("div", "s936-cmp-change-banner", "Cambio número 29 · Escenario alto + play superior unificado");
    shell.appendChild(banner);

    const tools = [
      ["structure","Estructura"],
      ["editor","Editor"],
      ["scales","Escalas"],
      ["tabpro","Tab Pro"],
      ["theory","Teoría"],
    ];

    const nav = ctx.toolNav(tools, ctx.state.composeTool || state.tool || "structure", (v) => {
      ctx.state.composeTool = v;
      state.tool = v;
      saveState();
    });
    shell.appendChild(nav);

    // Cambio 5: el shell entra a pantalla ANTES de renderizar el módulo.
    // Si Estructura o Chart lanzan un error, ya no queda la vista "quieta" solo con el menú.
    c.appendChild(shell);

    let active = ctx.state.composeTool || state.tool || "structure";
    if (active === "songDNA") active = "structure";
    // redirigir tools movidos a sus nuevos tabs padre
    if (active === "templates" || active === "inspire") active = "structure";
    if (active === "chordAI" || active === "transpose") active = "theory";
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
      chordAI: renderChordAI,
      theory: renderTheory,
      scales: renderScales,
      tabpro: renderTabPro
    };

    try {
      (map[active] || renderStructureModule)(ctx, shell);
    } catch (error) {
      console.error("Suite Pro Compose Cambio 24 render error:", error);
      const box = ctx.el("section", "s936-cmp-render-error");
      box.innerHTML = "<b>Cambio número 29 · Estructura no pudo renderizar.</b><br>El error queda visible en pantalla. Revisa la primera línea roja de consola.";
      const code = ctx.el("code", "", String(error && (error.stack || error.message) || error));
      box.appendChild(code);
      shell.appendChild(box);
    }
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
})();
