// Studio 936 Composer - Suite Pro Compose Pro Module v1
// Scope: Compose tab only. It does not write to app.js, editor, transport, drums, practice or studio modules.
// Product goal: creative cockpit for Templates, Inspire, Transpose, Song DNA, Chord AI, Theory and Scales.
(function () {
  "use strict";

  const STYLE_ID = "s936SuiteProComposeStyles";
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
    tool: "templates",
    targetKey: "G",
    selectedTemplate: "Studio Pop",
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
    window.Studio936SuiteProCompose = { version: "compose-v1", render };
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
#s936SuitePro .s936-cmp-toast{position:absolute;left:18px;right:18px;bottom:18px;border:1px solid rgba(0,255,204,.35);border-radius:14px;background:rgba(0,0,0,.80);color:#bfffee;padding:10px 12px;font-size:.72rem;font-weight:900;opacity:0;pointer-events:none;transform:translateY(8px);transition:.16s ease;z-index:5}
#s936SuitePro .s936-cmp-toast.show{opacity:1;transform:translateY(0)}
@media(max-width:1100px){#s936SuitePro .s936-cmp-hero,#s936SuitePro .s936-cmp-grid.two{grid-template-columns:1fr}#s936SuitePro .s936-cmp-score{grid-template-columns:repeat(2,1fr)}}
`;
    document.head.appendChild(style);
  }

  function safe(fn, fallback = null) {
    try { return fn(); } catch (error) { console.warn("Suite Pro Compose:", error); return fallback; }
  }

  function render(ctx) {
    installStyles();
    const c = ctx.clearContent();
    ctx.title(c, "Compose Pro", "Centro creativo: plantilla, inspiración, transposición, ADN, acordes, teoría y escalas.");
    const shell = ctx.el("div", "s936-cmp-shell");

    const tools = [
      ["templates","Templates"],
      ["inspire","Inspire"],
      ["transpose","Transpose"],
      ["songDNA","Song DNA"],
      ["chordAI","Chord AI"],
      ["theory","Theory"],
      ["scales","Scales"]
    ];

    const nav = ctx.toolNav(tools, ctx.state.composeTool || state.tool, (v) => {
      ctx.state.composeTool = v;
      state.tool = v;
      saveState();
    });
    shell.appendChild(nav);

    const active = ctx.state.composeTool || state.tool || "templates";
    const map = {
      templates: renderTemplates,
      inspire: renderInspire,
      transpose: renderTranspose,
      songDNA: renderSongDNA,
      chordAI: renderChordAI,
      theory: renderTheory,
      scales: renderScales
    };
    (map[active] || renderTemplates)(ctx, shell);

    c.appendChild(shell);
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
    line(ctx, summary, "Uso", "elige estructura + progresión; copia/descarga; aplicar directo queda para bridge seguro.");
    const flow = ctx.el("div", "s936-cmp-flow");
    ["Intro","Verso","Pre-coro","Coro","Puente","Outro"].forEach((p) => {
      const part = ctx.el("div", "s936-cmp-part");
      part.appendChild(ctx.el("b", "", p));
      part.appendChild(ctx.el("span", "", p === "Coro" ? "hook + resolución" : p === "Pre-coro" ? "tensión" : "color/forma"));
      flow.appendChild(part);
    });
    summary.appendChild(flow);

    const current = ctx.el("article", "s936-cmp-card gold");
    current.appendChild(ctx.el("h4", "", "Canción actual"));
    const sections = sectionSummary(ctx);
    line(ctx, current, "Partes detectadas", sections.length || "—");
    line(ctx, current, "Acordes únicos", uniqueChords(ctx).map((c) => c.name).slice(0, 6).join(" · "));
    line(ctx, current, "Siguiente acción", "escoge template y úsalo como mapa de arreglo o coro.");
    head.append(summary, current);
    shell.appendChild(head);

    const grid = ctx.el("div", "s936-cmp-grid");
    TEMPLATES.forEach((tpl) => {
      const card = ctx.el("article", "s936-cmp-card");
      card.appendChild(ctx.el("h4", "", tpl.name));
      line(ctx, card, "Vibe", tpl.vibe);
      line(ctx, card, "Estilo/BPM", `${tpl.style} · ${tpl.bpm} BPM`);
      line(ctx, card, "Forma", tpl.form.map((p) => p[1]).join(" → "));
      const chorus = romanListToChords(key, tpl.sections.chorus || tpl.sections.verse);
      line(ctx, card, "Coro en " + key, chorus.join(" → "));
      const chips = ctx.el("div", "s936-cmp-chips");
      chorus.forEach((ch, i) => chips.appendChild(ctx.el("span", "s936-cmp-chip " + (i === 0 ? "root" : ""), ch)));
      card.appendChild(chips);
      const box = actions(ctx, card);
      const text = templateText(tpl, key);
      btn(ctx, box, "Copiar", () => copyText(ctx, text, "Template copiado."));
      btn(ctx, box, "TXT", () => downloadTxt(ctx, "studio936-template-" + slug(tpl.name) + ".txt", text), "s936-cmp-btn secondary");
      btn(ctx, box, "Preview", () => toast(ctx, tpl.name + " listo como guía. Aplicación directa será fase segura."), "s936-cmp-btn warn");
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

  function renderInspire(ctx, shell) {
    const s = snap(ctx);
    const key = keyOf(ctx);
    const top = ctx.el("section", "s936-cmp-card important");
    top.appendChild(ctx.el("h4", "", "Inspire · idea inmediata"));
    const toolbar = ctx.el("div", "s936-cmp-toolbar");

    const mood = field(ctx, "Mood");
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

  function renderSongDNA(ctx, shell) {
    const s = snap(ctx);
    const sections = sectionSummary(ctx);
    const chords = uniqueChords(ctx);
    const totalBars = sections.reduce((sum, x) => sum + x.bars, 0);
    const hasLyrics = Object.values(s.lyrics || {}).filter((x) => String(x || "").trim()).length;
    const repeated = mostCommonChord(chords);
    const card = ctx.el("section", "s936-cmp-card important");
    card.appendChild(ctx.el("h4", "", "Song DNA · identidad musical"));
    const score = ctx.el("div", "s936-cmp-score");
    metric(ctx, score, sections.length || "—", "partes");
    metric(ctx, score, chords.length || "—", "acordes");
    metric(ctx, score, totalBars || "—", "compases");
    metric(ctx, score, hasLyrics || "—", "letras");
    card.appendChild(score);
    line(ctx, card, "Centro tonal", keyOf(ctx));
    line(ctx, card, "Estilo", s.style || "—");
    line(ctx, card, "Instrumento guía", s.instrument || "—");
    line(ctx, card, "Acorde dominante visual", repeated || "—");
    line(ctx, card, "Diagnóstico", dnaDiagnosis(ctx));
    shell.appendChild(card);

    const grid = ctx.el("div", "s936-cmp-grid two");
    const form = ctx.el("article", "s936-cmp-card");
    form.appendChild(ctx.el("h4", "", "Forma detectada"));
    const flow = ctx.el("div", "s936-cmp-flow");
    sections.slice(0, 12).forEach((p) => {
      const part = ctx.el("div", "s936-cmp-part");
      part.appendChild(ctx.el("b", "", p.label));
      part.appendChild(ctx.el("span", "", `${p.bars} compases`));
      part.appendChild(ctx.el("span", "", p.chords.slice(0,3).join(" → ")));
      flow.appendChild(part);
    });
    form.appendChild(flow);
    grid.appendChild(form);

    const next = ctx.el("article", "s936-cmp-card gold");
    next.appendChild(ctx.el("h4", "", "Próximo movimiento"));
    line(ctx, next, "Si falta letra", "abre REC Idea o Letra/TAB y captura una frase real");
    line(ctx, next, "Si falta impacto", "usa Chord AI: coro abierto o pre-coro con tensión");
    line(ctx, next, "Si falta comodidad vocal", "usa Transpose preview");
    line(ctx, next, "Si falta color", "usa Scales sobre el acorde activo");
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
