// Studio 936 Composer - Suite Pro Professional v3.11 Modular Core + Practice + Drums + Mixer + Recorder
// Product goal: professional composition cockpit, not a duplicate of the main app.
// Scope: this file only owns #s936SuitePro. It does not use #v18Suite and does not touch app legacy.
// Cambio 85 (autorizado explícitamente por el usuario): el panel se fijaba
// con top+bottom a la vez, forzando su altura a llenar casi toda la pantalla
// sin importar el contenido — dejaba un hueco vacío grande abajo cuando el
// dashboard de herramientas era corto. Ahora usa height:auto + max-height,
// ajustándose a su contenido real. El modo "MAX" (.is-max) sigue llenando
// la pantalla a propósito, ya que es su función explícita.
// Cambio 86: se agrega openStudioTool(toolName) — permite que otros módulos
// (ej. el dashboard de Zoom sección en structure.js) abran directamente una
// herramienta real de Studio, como "MIDI IN", sin tener que navegar
// manualmente por las pestañas.
// Cambio 87: en pantallas más chicas (laptop), el panel podía mostrar DOS
// barras de scroll casi pegadas dentro de sí mismo (el panel exterior y su
// contenido interno .s936-sp-content, ambos scrolleables a la vez). Se fuerza
// overflow:hidden en el panel exterior para que solo el contenido interno
// pueda scrollear — nunca el panel completo.
// Cambio 88: se agrega un badge de versión visible ("DOCK CAMBIO XX") junto
// al título "Suite Pro" — este archivo no tenía ningún indicador de versión,
// a diferencia de Ly Letra y el Chart, lo que hacía imposible confirmar de
// un vistazo si un cambio a este archivo específico ya estaba desplegado.
// Cambio 89 (HOTFIX): con el badge ya confirmado corriendo, se detectó que
// la doble barra de scroll seguía apareciendo porque structure.js trae
// reglas CSS viejas (Cambio 39/44) que ponen "#s936SuitePro{overflow-y:
// auto!important}" — eso le ganaba al overflow:hidden del Cambio 87 por no
// tener !important. Se agrega !important para que gane definitivamente.
// Cambio 90 (HOTFIX): la doble barra seguía en modo MAX específicamente —
// se le agregó overflow:hidden!important también a la regla .is-max (antes
// solo estaba en el estado normal). Además, se encontraron 4 reglas viejas
// en structure.js que fijaban el ANCHO del panel con !important sin excluir
// el modo MAX, impidiendo que se expandiera de verdad al maximizar.
// Cambio 92: barra de scroll con estilo propio de la consola (teal con
// brillo dorado sutil), en vez de la gris genérica del navegador.
// Cambio 95: el borde derecho redimensionable (que separa el dock del
// Chart) ahora tiene un brillo tipo consola (degradado teal/dorado con
// glow), en vez de una línea plana — visible solo en modo normal; en modo
// MAX se oculta, ya que ahí no hace falta redimensionar.
(function () {
  "use strict";

  const PANEL_ID = "s936SuitePro";
  const STYLE_ID = "s936SuiteProV3Styles";
  const ROOT_VARS_STYLE_ID = "s936DockGeometryVars";

  // Cambio 371: variables CSS — ÚNICA fuente de verdad para la geometría
  // real del rail colapsado y del panel Docker expandido. El Chart (en
  // suite-pro-chart-v260-cambio100.js) las usa con calc() para calcular
  // su margen como el COMPLEMENTO exacto, en vez de números fijos
  // adivinados. Esto se instala YA, apenas carga el archivo — NO puede
  // esperar a installStyles()/ensurePanel() (que solo corren cuando el
  // usuario abre Suite Pro por primera vez), porque el Chart necesita
  // estas variables desde el primer render de la página, con Suite Pro
  // todavía cerrado.
  function installDockGeometryVars() {
    if (document.getElementById(ROOT_VARS_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = ROOT_VARS_STYLE_ID;
    style.textContent = `
:root{
  --s936-rail-left: 12px;
  --s936-rail-w: 56px;
  --s936-rail-gap: 10px;   /* separación entre el borde del rail y el Chart, en reposo */
  --s936-dock-left: 76px;
  --s936-dock-w: min(430px, 92vw);  /* debe ser IDÉNTICO al width real de #s936SuitePro */
  --s936-dock-gap: 8px;    /* separación entre el borde del panel y el Chart, expandido */
}`;
    document.head.appendChild(style);
  }
  installDockGeometryVars();
  const LIBRARY_KEY = "studio936_suitepro_library_v3";
  const IDEA_KEY = "studio936_suitepro_ideas_v3";
  const APP_STORAGE_KEY = "studio936ComposerV25SongStructure";

  const NOTES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const NOTES_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  const NOTE_INDEX = { C:0, "C#":1, Db:1, D:2, "D#":3, Eb:3, E:4, F:5, "F#":6, Gb:6, G:7, "G#":8, Ab:8, A:9, "A#":10, Bb:10, B:11 };
  const FLAT_KEYS = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb"]);
  const INTERVALS = {
    major: [0,2,4,5,7,9,11],
    naturalMinor: [0,2,3,5,7,8,10],
    minorPentatonic: [0,3,5,7,10],
    majorPentatonic: [0,2,4,7,9]
  };
  const ROMAN_INDEX = { I:0, ii:1, iii:2, IV:3, V:4, vi:5, vii:6 };

  const AREAS = [
    ["compose", "Compose"],
    ["command", "Mapa Maestro"]
    // studio: quitado del tab principal (Cambio 354, a pedido de Val).
    // arrange, practice, export: ocultos temporalmente v0.8.1
  ];

  const TEMPLATES = [
    {
      name: "Pop",
      style: "pop",
      bpm: 100,
      intent: "Canción clara con coro recordable.",
      parts: [["intro", "Intro"], ["verse", "Verso 1"], ["prechorus", "Pre-coro"], ["chorus", "Coro"], ["verse2", "Verso 2"], ["prechorus", "Pre-coro 2"], ["chorus", "Coro 2"], ["bridge", "Puente"], ["chorus", "Coro final"], ["outro", "Outro"]],
      progressions: { verse:["I","V","vi","IV"], prechorus:["IV","V","vi","V"], chorus:["I","V","vi","IV"], bridge:["vi","IV","I","V"] }
    },
    {
      name: "Worship",
      style: "ballad",
      bpm: 76,
      intent: "Construcción lenta hacia coro grande.",
      parts: [["intro","Intro"], ["verse","Verso 1"], ["verse2","Verso 2"], ["prechorus","Pre-coro"], ["chorus","Coro"], ["interlude","Interludio"], ["bridge","Puente"], ["chorus","Coro final"], ["outro","Outro"]],
      progressions: { verse:["I","V","vi","IV"], prechorus:["IV","V","I","V"], chorus:["I","V","vi","IV"], bridge:["vi","IV","I","V"] }
    },
    {
      name: "Balada",
      style: "ballad",
      bpm: 84,
      intent: "Voz al frente, emoción y desarrollo lírico.",
      parts: [["intro","Intro"], ["verse","Verso 1"], ["chorus","Coro"], ["verse2","Verso 2"], ["chorus","Coro 2"], ["solo","Solo"], ["bridge","Puente"], ["chorus","Coro final"], ["outro","Outro"]],
      progressions: { verse:["vi","IV","I","V"], chorus:["IV","I","V","vi"], bridge:["ii","IV","V","V"] }
    },
    {
      name: "Rock",
      style: "rock",
      bpm: 112,
      intent: "Riff, energía, coro fuerte.",
      parts: [["intro","Intro riff"], ["verse","Verso 1"], ["chorus","Coro"], ["interlude","Riff"], ["verse2","Verso 2"], ["chorus","Coro 2"], ["solo","Solo"], ["chorus","Coro final"], ["outro","Outro"]],
      progressions: { verse:["I","IV","V","IV"], chorus:["I","V","IV","I"], bridge:["vi","V","IV","V"] }
    },
    {
      name: "Urbano",
      style: "pop",
      bpm: 96,
      intent: "Hook rápido y espacio para flow.",
      parts: [["intro","Intro"], ["chorus","Hook"], ["verse","Verso 1"], ["chorus","Hook 2"], ["verse2","Verso 2"], ["bridge","Bridge"], ["chorus","Hook final"], ["outro","Outro"]],
      progressions: { verse:["vi","IV","I","V"], chorus:["vi","IV","I","V"], bridge:["IV","V","vi","V"] }
    },
    {
      name: "Jazz básico",
      style: "jazz",
      bpm: 110,
      intent: "Forma flexible con color armónico.",
      parts: [["intro","Intro"], ["verse","Tema A"], ["verse2","Tema A 2"], ["bridge","Tema B"], ["solo","Solo"], ["verse","Tema A final"], ["outro","Coda"]],
      progressions: { verse:["ii","V","I","vi"], chorus:["ii","V","I","I"], bridge:["iii","vi","ii","V"] }
    }
  ];

  const INSPIRE_SEEDS = [
    {
      title: "Luz sobre el vidrio",
      theme: "volver a respirar después de una etapa pesada",
      firstLine: "Hoy la ventana aprendió mi nombre",
      chorusHook: "No vuelvo atrás, camino en luz",
      image: "un amanecer reflejado en el piano",
      progression: ["I","V","vi","IV"],
      groove: "medio tiempo, bombo simple, hats suaves"
    },
    {
      title: "Ciudad de agua",
      theme: "memoria, viaje y reconciliación",
      firstLine: "La lluvia escribió lo que no pude decir",
      chorusHook: "Déjame volver donde empezó la voz",
      image: "luces nocturnas moviéndose en el río",
      progression: ["vi","IV","I","V"],
      groove: "balada con pulso interno y bajo cálido"
    },
    {
      title: "Fuego tranquilo",
      theme: "fuerza interior sin rabia",
      firstLine: "No grito, pero arde mi verdad",
      chorusHook: "Soy fuego tranquilo, raíz y canción",
      image: "una vela firme en una habitación oscura",
      progression: ["I","IV","V","vi"],
      groove: "rock/pop con caja marcada y guitarras abiertas"
    }
  ];

  const DRUM_PATTERNS = {
    pop:   { kick:[0,8,11], snare:[4,12], hat:[0,2,4,6,8,10,12,14], label:"Pop 4/4" },
    rock:  { kick:[0,7,8,10], snare:[4,12], hat:[0,2,4,6,8,10,12,14], label:"Rock medio" },
    ballad:{ kick:[0,8], snare:[4,12], hat:[0,4,8,12], label:"Balada lenta" },
    jazz:  { kick:[0,10], snare:[4,12], hat:[0,3,6,9,12,15], label:"Jazz guide" },
    bossa: { kick:[0,6,10], snare:[4,12,14], hat:[0,2,4,6,8,10,12,14], label:"Bossa guide" },
    funk:  { kick:[0,3,8,10], snare:[4,12], hat:[0,2,3,6,8,10,11,14], label:"Funk guide" },
    salsa: { kick:[0,8], snare:[4,7,12,15], hat:[0,2,4,6,8,10,12,14], label:"Salsa guide" },
    cumbia:{ kick:[0,8], snare:[4,12], hat:[0,2,4,6,8,10,12,14], label:"Cumbia guide" },
    reggae:{ kick:[8], snare:[4,12], hat:[2,6,10,14], label:"Reggae offbeat" }
  };

  const state = {
    open: false,
    mode: localStorage.getItem("s936_suite_mode_v3") || "dock",
    area: localStorage.getItem("s936_suite_area_v3") || "command",
    harmonicView: localStorage.getItem("s936_suite_harmonic_view_v33") || localStorage.getItem("s936_suite_harmonic_view_v32") || "auto",
    fretPosition: localStorage.getItem("s936_suite_fret_position_v33") || "open",
    fretPositions: (() => {
      try { return JSON.parse(localStorage.getItem("s936_suite_fret_positions_v34") || "{}"); }
      catch (error) { return {}; }
    })(),
    composeTool: "templates",
    arrangeTool: "lead",
    studioTool: "drums",
    exportTool: "center",
    drum: { playing:false, timer:null, step:0, ctx:null, volume:0.55 }
  };

  function bridge() { return window.Studio936AppBridge || null; }
  function byId(id) { return document.getElementById(id); }
  function q(sel, root=document) { return root.querySelector(sel); }
  function qa(sel, root=document) { return Array.from(root.querySelectorAll(sel)); }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function safe(fn, fallback=null) {
    try { return fn(); } catch (error) { console.warn("Suite Pro safe call:", error); return fallback; }
  }

  function callBridge(method, fallback) {
    const api = bridge();
    if (api && typeof api[method] === "function") return safe(() => api[method](), false);
    if (typeof fallback === "function") return safe(fallback, false);
    return false;
  }

  function snapshot() {
    const api = bridge();
    if (api && typeof api.getSongSnapshot === "function") {
      const data = safe(() => api.getSongSnapshot(), null);
      if (data) return data;
    }
    return {
      title: byId("songTitle")?.value || "Canción sin título",
      author: byId("songAuthor")?.value || "",
      bpm: byId("bpmDisplay")?.textContent || byId("bpmSlider")?.value || "",
      style: byId("styleSelect")?.value || "",
      instrument: byId("instrumentSelect")?.value || "",
      key: byId("soloKey")?.value || "C",
      currentSection: byId("sectionSelect")?.value || "",
      currentSectionName: byId("sectionSelect")?.selectedOptions?.[0]?.textContent || "",
      currentPart: byId("currentPartTag")?.textContent || "",
      chordLabel: byId("chordLabel")?.textContent || "",
      arrangement: [],
      sections: {},
      lyrics: {},
      sectionSolos: {},
      project: {}
    };
  }

  function fullSongText() {
    const api = bridge();
    if (api && typeof api.getFullSongText === "function") {
      const text = safe(() => api.getFullSongText(), "");
      if (text) return text;
    }
    const s = snapshot();
    return [
      "Studio 936 Composer",
      "Canción: " + (s.title || ""),
      "Autor: " + (s.author || ""),
      "BPM: " + (s.bpm || ""),
      "Estilo: " + (s.style || ""),
      "Instrumento: " + (s.instrument || ""),
      "Tonalidad: " + (s.key || "C")
    ].join("\n");
  }

  function projectJson() {
    const api = bridge();
    if (api && typeof api.getProjectJson === "function") {
      const json = safe(() => api.getProjectJson(), "");
      if (json) return json;
    }
    const s = snapshot();
    return JSON.stringify(s.project || s, null, 2);
  }

  function normalizeKey(value) {
    const raw = String(value || "").trim();
    const match = raw.match(/^([A-Ga-g])([#b]?)/);
    if (!match) return "C";
    return match[1].toUpperCase() + (match[2] || "");
  }

  function preferFlats(key) {
    return String(key || "").includes("b") || FLAT_KEYS.has(key);
  }

  function scale(key, type="major") {
    const cleanKey = normalizeKey(key);
    const root = NOTE_INDEX[cleanKey];
    const intervals = INTERVALS[type] || INTERVALS.major;
    const names = preferFlats(cleanKey) ? NOTES_FLAT : NOTES_SHARP;
    if (root === undefined) return scale("C", type);
    return intervals.map((step) => names[(root + step) % 12]);
  }

  function majorChords(key) {
    const notes = scale(key, "major");
    const quality = ["", "m", "m", "", "", "m", "dim"];
    return notes.map((note, index) => note + quality[index]);
  }

  function romanToChords(key, progression) {
    const chords = majorChords(key);
    return progression.map((roman) => {
      const index = ROMAN_INDEX[roman];
      return index === undefined ? roman : chords[index];
    });
  }

  function allSectionItems(s=snapshot()) {
    const sections = s.sections || {};
    return Object.keys(sections).flatMap((key) => {
      const list = Array.isArray(sections[key]) ? sections[key] : [];
      return list.map((item) => ({ section:key, item }));
    });
  }

  function chordCount(s=snapshot()) {
    return allSectionItems(s).length;
  }

  function lyricCount(s=snapshot()) {
    const lyrics = s.lyrics || {};
    return Object.values(lyrics).filter((v) => String(v || "").trim().length > 0).length;
  }

  function soloCount(s=snapshot()) {
    const solos = s.sectionSolos || {};
    return Object.values(solos).filter((v) => String(v?.phrase || "").trim().length > 0).length;
  }

  function arrangementCount(s=snapshot()) {
    return Array.isArray(s.arrangement) ? s.arrangement.length : 0;
  }

  function currentChordNotes() {
    const raw = byId("chordNotes")?.value || "";
    const notes = raw.split(/\s+/).filter(Boolean).slice(0, 8);
    return notes.length ? notes : majorChords(snapshot().key || "C").slice(0, 3);
  }

  function currentChordName() {
    return byId("chordName")?.value || snapshot().chordLabel || "Acorde actual";
  }

function normalizeNoteName(value) {
    let text = String(value || "").trim();
    if (!text) return "";
    text = text
      .replace(/^Do/i, "C")
      .replace(/^Re/i, "D")
      .replace(/^Mi/i, "E")
      .replace(/^Fa/i, "F")
      .replace(/^Sol/i, "G")
      .replace(/^La/i, "A")
      .replace(/^Si/i, "B");
    const match = text.match(/^([A-Ga-g])([#b]?)/);
    if (!match) return "";
    return match[1].toUpperCase() + (match[2] || "");
  }

  function notePitchClass(value) {
    const note = normalizeNoteName(value);
    return NOTE_INDEX[note];
  }

  function chordRootName(name) {
    const match = String(name || "").trim().match(/^([A-Ga-g])([#b]?)/);
    if (!match) return normalizeKey(snapshot().key || "C");
    return match[1].toUpperCase() + (match[2] || "");
  }

  function chordPitchClassesFromName(name) {
    const rootName = chordRootName(name);
    const root = NOTE_INDEX[rootName];
    if (root === undefined) return [0, 4, 7];

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

    return Array.from(new Set(intervals.map((n) => (root + n + 120) % 12)));
  }

  function notesFromChordName(name) {
    const root = chordRootName(name);
    const pcs = chordPitchClassesFromName(name);
    const noteNames = FLAT_KEYS.has(root) || root.includes("b") ? NOTES_FLAT : NOTES_SHARP;
    return pcs.map((pc) => noteNames[((pc % 12) + 12) % 12]);
  }

  function itemPitchClasses(item) {
    const raw = String(item?.notes || "").trim();
    const pcs = raw.split(/\s+/)
      .map((token) => token.replace(/[:].*$/, ""))
      .map(notePitchClass)
      .filter((pc) => pc !== undefined);
    if (pcs.length) return Array.from(new Set(pcs));
    return chordPitchClassesFromName(item?.name || currentChordName());
  }

  function chordEntries(s=snapshot(), limit=12) {
    const parts = commandParts(s);
    const source = parts.length
      ? parts.flatMap((part) => sectionItems(s, sectionKey(part)))
      : allSectionItems(s).map((x) => x.item);

    const seen = new Set();
    const entries = [];
    source.forEach((item) => {
      const name = String(item?.name || "").trim();
      if (!name || seen.has(name)) return;
      seen.add(name);
      entries.push({
        name,
        notes: itemPitchClasses(item),
        rawNotes: String(item?.notes || "").trim(),
        bars: Math.max(1, Number(item?.bars) || 1),
        bass: item?.bass || "",
        root: chordRootName(name)
      });
    });

    if (!entries.length) {
      const name = currentChordName();
      entries.push({
        name,
        notes: chordPitchClassesFromName(name),
        rawNotes: currentChordNotes().join(" "),
        bars: 1,
        bass: "",
        root: chordRootName(name)
      });
    }

    return entries.slice(0, limit);
  }

  function instrumentViewForSnapshot(s) {
    const instrument = String(s.instrument || "").toLowerCase();
    if (instrument.includes("ukulele") || instrument.includes("ukelele")) return "ukulele";
    if (instrument.includes("guitar") || instrument.includes("guitarra")) return "guitar";
    if (instrument.includes("piano") || instrument.includes("epiano")) return "piano";
    return "piano";
  }

  function activeHarmonicView(s) {
    const selected = state.harmonicView === "auto" ? instrumentViewForSnapshot(s) : state.harmonicView;
    return selected === "chips" ? "piano" : selected;
  }

  function renderHarmonicViewControls(parent, s) {
    const wrap = el("div", "s936-sp-view-toggle");
    const options = [
      ["auto", "Auto"],
      ["piano", "Piano"],
      ["guitar", "Guitarra"],
      ["ukulele", "Ukelele"]
    ];
    const active = state.harmonicView || "auto";
    options.forEach(([key, label]) => {
      const btn = el("button", "", label);
      btn.type = "button";
      btn.classList.toggle("active", key === active);
      btn.title = key === "auto" ? "Auto usa el instrumento actual: " + (s.instrument || "—") : "Vista " + label;
      btn.onclick = () => {
        state.harmonicView = key;
        localStorage.setItem("s936_suite_harmonic_view_v33", key);
        render();
      };
      wrap.appendChild(btn);
    });
    parent.appendChild(wrap);
  }

  function renderCommandHarmonicView(parent, s) {
    const entries = chordEntries(s, state.mode === "max" ? 14 : 8);
    const mode = activeHarmonicView(s);
    renderHarmonicViewControls(parent, s);

    const legend = el("p", "s936-sp-muted");
    legend.textContent = mode === "guitar"
      ? "Vista de voicings en guitarra. Cambia posición por traste para buscar colores abiertos, medios o jazz."
      : mode === "ukulele"
        ? "Vista de voicings en ukelele. Cambia posición por traste para encontrar digitaciones más cómodas."
        : "Vista de notas en piano: fucsia = raíz/bajo, verde = cuerpo del acorde, dorado = extensiones sugeridas.";
    parent.appendChild(legend);

    if (mode === "piano") {
      renderPianoLegend(parent);
      renderPianoChordGallery(parent, entries);
      return;
    }

    if (mode === "guitar" || mode === "ukulele") {
      renderFretPositionControls(parent);
      renderFretChordGallery(parent, entries, mode);
      return;
    }

    renderPianoLegend(parent);
    renderPianoChordGallery(parent, entries);
  }

  function pcName(pc) {
    return NOTES_FLAT[(Number(pc) + 120) % 12] || "C";
  }

  function renderPianoLegend(parent) {
    const legend = el("div", "s936-sp-piano-legend");
    [
      ["root", "Raíz / bajo"],
      ["active", "Notas del acorde"],
      ["tension", "Extensiones 7 · 9 · 11 · 13"]
    ].forEach(([cls, label]) => {
      const item = el("span", "");
      item.appendChild(el("i", cls, ""));
      item.appendChild(document.createTextNode(label));
      legend.appendChild(item);
    });
    parent.appendChild(legend);
  }

  function chordExtensions(name) {
    const text = String(name || "").toLowerCase();
    const list = [];
    if (/maj7|m7|[^a-z]7|7/.test(text)) list.push("7");
    if (/9/.test(text)) list.push("9");
    if (/11/.test(text)) list.push("11");
    if (/13|6/.test(text)) list.push(text.includes("13") ? "13" : "6");
    return list.length ? list.join(" · ") : "triada/base";
  }

  function noteRoleClass(entry, pc) {
    const root = notePitchClass(entry.root);
    if (pc === root) return "root";
    const extensions = new Set();
    const name = String(entry.name || "").toLowerCase();
    const rootPc = Number.isFinite(root) ? root : 0;
    if (/7|maj7|m7/.test(name)) extensions.add((rootPc + 10) % 12), extensions.add((rootPc + 11) % 12);
    if (/9/.test(name)) extensions.add((rootPc + 2) % 12);
    if (/11/.test(name)) extensions.add((rootPc + 5) % 12);
    if (/13|6/.test(name)) extensions.add((rootPc + 9) % 12);
    return extensions.has(pc) ? "tension" : "active";
  }

  function renderPianoChordGallery(parent, entries) {
    const grid = el("div", "s936-sp-harmony-gallery piano");
    entries.forEach((entry) => {
      const card = el("article", "s936-sp-harmony-card piano-card");
      card.appendChild(el("h5", "", entry.name));
      const keys = el("div", "s936-sp-piano-mini");
      const sequence = [
        ["C", 0, "white"], ["C#", 1, "black"], ["D", 2, "white"], ["D#", 3, "black"],
        ["E", 4, "white"], ["F", 5, "white"], ["F#", 6, "black"], ["G", 7, "white"],
        ["G#", 8, "black"], ["A", 9, "white"], ["A#", 10, "black"], ["B", 11, "white"]
      ];
      sequence.forEach(([label, pc, kind]) => {
        const isActive = entry.notes.includes(pc);
        const role = isActive ? noteRoleClass(entry, pc) : "";
        const key = el("span", "s936-sp-piano-key " + kind, label);
        key.classList.toggle("active", isActive && role === "active");
        key.classList.toggle("root", isActive && role === "root");
        key.classList.toggle("tension", isActive && role === "tension");
        keys.appendChild(key);
      });
      card.appendChild(keys);
      card.appendChild(el("small", "", "Raíz: " + (entry.root || "—") + " · Ext: " + chordExtensions(entry.name)));
      card.appendChild(el("small", "", "Notas: " + entry.notes.map(pcName).join(" · ")));
      grid.appendChild(card);
    });
    parent.appendChild(grid);
  }

  function stringTunings(instrument) {
    if (instrument === "ukulele") {
      return [
        { label:"G", pc:7 },
        { label:"C", pc:0 },
        { label:"E", pc:4 },
        { label:"A", pc:9 }
      ];
    }
    return [
      { label:"E", pc:4 },
      { label:"A", pc:9 },
      { label:"D", pc:2 },
      { label:"G", pc:7 },
      { label:"B", pc:11 },
      { label:"E", pc:4 }
    ];
  }

  function fretBaseFromPosition(position) {
    const raw = position || "open";
    return raw === "open" ? 0 : Math.max(0, Number(raw) || 0);
  }

  function currentFretBase() {
    return fretBaseFromPosition(state.fretPosition || "open");
  }

  function fretPositionLabel(position=state.fretPosition) {
    return position === "open" ? "Abierta" : "Traste " + position;
  }

  function fretCardKey(entry, instrument) {
    return instrument + "::" + slug(entry.name || "chord");
  }

  function cardFretPosition(entry, instrument) {
    const key = fretCardKey(entry, instrument);
    return state.fretPositions[key] || state.fretPosition || "open";
  }

  function setCardFretPosition(entry, instrument, position) {
    const key = fretCardKey(entry, instrument);
    state.fretPositions[key] = position;
    localStorage.setItem("s936_suite_fret_positions_v34", JSON.stringify(state.fretPositions));
  }

  function renderFretPositionControls(parent) {
    const wrap = el("div", "s936-sp-fret-position");
    wrap.appendChild(el("span", "", "Posición"));
    [
      ["open", "Abierta"],
      ["3", "Traste 3"],
      ["5", "Traste 5"],
      ["7", "Traste 7"],
      ["9", "Traste 9"],
      ["12", "Traste 12"]
    ].forEach(([value, label]) => {
      const btn = el("button", "", label);
      btn.type = "button";
      btn.classList.toggle("active", String(state.fretPosition || "open") === value);
      btn.onclick = () => {
        state.fretPosition = value;
        localStorage.setItem("s936_suite_fret_position_v33", value);
        render();
      };
      wrap.appendChild(btn);
    });
    parent.appendChild(wrap);
  }

  function findFretForString(openPc, chordPcs, baseFret) {
    let best = null;
    const from = baseFret > 0 ? baseFret : 0;
    const to = baseFret > 0 ? baseFret + 4 : 5;
    for (let fret = from; fret <= to; fret += 1) {
      const pc = (openPc + fret) % 12;
      if (chordPcs.includes(pc)) {
        const score = chordPcs.indexOf(pc) + (baseFret > 0 ? Math.abs(fret - baseFret) * 0.25 : fret * 0.2);
        if (best === null || score < best.score) best = { fret, pc, score };
      }
    }
    return best;
  }

  function renderFretChordGallery(parent, entries, instrument) {
    const grid = el("div", "s936-sp-harmony-gallery fret");
    entries.forEach((entry) => {
      const card = el("article", "s936-sp-harmony-card fret-card");
      card.appendChild(el("h5", "", entry.name));

      const position = cardFretPosition(entry, instrument);
      const baseFret = fretBaseFromPosition(position);
      const chart = el("div", "s936-sp-fret-mini " + instrument);
      const tuning = stringTunings(instrument);
      const stringCount = tuning.length;
      const rootPc = notePitchClass(entry.root);
      const used = new Set();

      if (baseFret > 0) {
        const base = el("span", "base-fret", String(baseFret));
        chart.appendChild(base);
      }

      for (let fret = 0; fret <= 5; fret += 1) {
        const line = el("span", "fret-line");
        line.style.top = (14 + fret * 17) + "%";
        chart.appendChild(line);
      }

      tuning.forEach((string, index) => {
        const stringLine = el("span", "string-line");
        stringLine.style.left = (stringCount === 1 ? 50 : 8 + index * (84 / (stringCount - 1))) + "%";
        chart.appendChild(stringLine);

        const choice = findFretForString(string.pc, entry.notes, baseFret);
        if (choice) {
          used.add(choice.pc);
          const displayFret = baseFret > 0 ? choice.fret - baseFret + 1 : choice.fret;
          const role = noteRoleClass(entry, choice.pc);
          const dot = el("span", "note-dot " + role, choice.fret === 0 ? "○" : String(used.size));
          dot.classList.toggle("root", choice.pc === rootPc);
          dot.title = string.label + " string · fret " + choice.fret + " · " + pcName(choice.pc);
          dot.style.left = (stringCount === 1 ? 50 : 8 + index * (84 / (stringCount - 1))) + "%";
          dot.style.top = (choice.fret === 0 ? 8 : 14 + (displayFret - .5) * 17) + "%";
          chart.appendChild(dot);
        } else {
          const mute = el("span", "mute-x", "×");
          mute.style.left = (stringCount === 1 ? 50 : 8 + index * (84 / (stringCount - 1))) + "%";
          chart.appendChild(mute);
        }
      });

      const labels = el("div", "s936-sp-fret-labels");
      tuning.forEach((string) => labels.appendChild(el("span", "", string.label)));
      card.appendChild(chart);
      card.appendChild(labels);
      card.appendChild(el("small", "", fretPositionLabel(position) + " · Raíz: " + (entry.root || "—") + " · Ext: " + chordExtensions(entry.name)));
      card.appendChild(el("small", "", "Notas: " + entry.notes.map(pcName).join(" · ")));

      const chooser = el("label", "s936-sp-card-position-wrap");
      chooser.appendChild(el("span", "", "Posición de este acorde"));
      const select = el("select", "s936-sp-card-position");
      [
        ["open", "Abierta"],
        ["3", "Traste 3"],
        ["5", "Traste 5"],
        ["7", "Traste 7"],
        ["9", "Traste 9"],
        ["12", "Traste 12"]
      ].forEach(([value, label]) => {
        const option = el("option", "", label);
        option.value = value;
        if (String(position) === value) option.selected = true;
        select.appendChild(option);
      });
      select.onchange = () => {
        setCardFretPosition(entry, instrument, select.value);
        render();
      };
      chooser.appendChild(select);
      card.appendChild(chooser);

      grid.appendChild(card);
    });
    parent.appendChild(grid);
  }


    async function copyText(text, message="Copiado.") {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(String(text || ""));
      toast(message);
      return true;
    }
    toast("Portapapeles no disponible. Usa descargar TXT.");
    return false;
  }

  function downloadText(filename, text, type="text/plain;charset=utf-8") {
    const blob = new Blob([String(text || "")], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function slug(text) {
    return String(text || "studio936").toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "studio936";
  }

  function toast(message) {
    const panel = ensurePanel();
    let box = q(".s936-sp-toast", panel);
    if (!box) {
      box = el("div", "s936-sp-toast");
      panel.appendChild(box);
    }
    box.textContent = message;
    box.classList.add("show");
    clearTimeout(box._timer);
    box._timer = setTimeout(() => box.classList.remove("show"), 2200);
    const api = bridge();
    if (api && typeof api.flashStatus === "function") safe(() => api.flashStatus(message), null);
  }

  function installStyles() {
    if (byId(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#${PANEL_ID} {
  position: fixed;
  /* Cambio 357: se corre de 12px a 76px — la barra de íconos con hover
     (Cambio 356) vive en left:12px con 56px de ancho; sin este ajuste,
     ambas se superponían. 76px = 12 (margen) + 56 (ancho de la barra) +
     8 (separación). Al expandirse con hover, la barra flota por encima
     del borde del panel un momento — aceptable, es el mismo patrón que
     un cajón/flyout normal.
     Cambio 371: ahora lee de la variable --s936-dock-left en vez de un
     78px suelto, para que sea la MISMA fuente que usa el cálculo del
     Chart (ver bloque :root arriba). */
  left: var(--s936-dock-left);
  /* Cambio 363: tercer ajuste fino (120px -> 108px). */
  top: 108px;
  /* Cambio 85: antes "bottom:12px" fijaba el panel entre top Y bottom a la
     vez, forzando su altura a llenar casi toda la pantalla sin importar
     cuánto contenido tuviera adentro — de ahí el hueco oscuro vacío al
     final. Ahora se ajusta con height:auto a su contenido real, con un
     tope máximo para no salirse nunca de la ventana. */
  height: auto;
  max-height: calc(100vh - 144px);  /* Cambio 87: el panel exterior NUNCA debe tener su propio scroll — solo el
     contenido interno (.s936-sp-content) debe scrollear. En pantallas más
     chicas (laptop), la combinación de height:auto + max-height podía dejar
     que el navegador también le pusiera scroll al panel exterior, dando dos
     barras casi pegadas dentro del mismo panel. overflow:hidden aquí lo
     evita por completo, sin depender de cómo lo interprete cada navegador.
     Cambio 89 (HOTFIX): se le agrega !important — se encontró que
     structure.js trae reglas viejas (Cambio 39/44) que ponen
     "#s936SuitePro{ overflow-y:auto!important }", y sin !important aquí,
     esas reglas viejas seguían ganando y devolvían la segunda barra. */
  overflow: hidden !important;
  /* Cambio 371: antes "min(430px, 92vw)" suelto acá Y otro número (600px)
     adivinado en el Chart para dejarle espacio — ahora ambos leen de
     --s936-dock-w, así son matemáticamente imposibles de desalinear. */
  width: var(--s936-dock-w);
  /* Cambio 95: borde derecho con brillo tipo consola (en vez de una línea
     plana/dura) — marca visualmente el límite redimensionable del panel de
     forma elegante. Solo se ve en modo normal; en modo MAX se oculta (ver
     regla .is-max más abajo), ya que ahí no hace falta redimensionar. */
  border-right: 2px solid transparent;
  border-image: linear-gradient(180deg,
    transparent, rgba(0,255,204,.55), rgba(255,224,102,.4), rgba(0,255,204,.55), transparent) 1;
  filter: drop-shadow(0 0 5px rgba(0,255,204,.35));
  z-index: 10060;
  display: none;
  color: #f7fbff;
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
#${PANEL_ID}.is-open { display: block; }
/* Cambio 361: con is-open Y esta clase juntas, el Docker completo queda
   oculto — solo se ve mientras el mouse está sobre la barra de íconos o
   sobre el propio panel (ver showDockOnHover/scheduleHideDockOnHover).
   !important porque gana sobre ".is-open{display:block}" de arriba. */
#${PANEL_ID}.is-open.s936-dock-collapsed { display: none !important; }
#${PANEL_ID}.is-max {
  left: 18px;
  right: 18px;
  top: 72px;
  bottom: 18px;
  height: auto;
  max-height: none;
  width: auto;
  /* Cambio 90: el modo MAX usa top+bottom a la vez (igual patrón que el bug
     original del Cambio 85), y aunque el overflow:hidden del estado normal
     debería heredarse, se hace explícito aquí también para no depender de
     herencia entre selectores — así, ni en modo normal NI en modo MAX el
     panel exterior puede tener su propio scroll; solo .s936-sp-content. */
  overflow: hidden !important;
  /* Cambio 95: se oculta el brillo del borde redimensionable en modo MAX —
     ahí el panel no se redimensiona a mano, así que ese acento visual no
     aplica y se vería como un elemento decorativo sin función. */
  border-right: none;
  filter: none;
}
#${PANEL_ID} * { box-sizing: border-box; }
#${PANEL_ID} .s936-sp-shell {
  height: 100%;
  display: grid;
  /* Cambio 347: 2 filas en vez de 3 — el header (marca/SYNC/DOCK/CERRAR)
     se quitó del shell por completo. Si se deja "auto auto minmax(0,1fr)"
     con solo 2 hijos reales (tabs, contenido), el contenido cae en la fila
     "auto" en vez de la última "minmax(0,1fr)", y deja de expandirse para
     llenar el panel. */
  grid-template-rows: auto minmax(0, 1fr);
  background:
    radial-gradient(circle at 20% 0%, rgba(0,255,204,.14), transparent 26%),
    linear-gradient(180deg, rgba(13,18,28,.98), rgba(5,7,12,.97));
  border: 1px solid rgba(0,255,204,.34);
  border-radius: 22px;
  box-shadow: 0 30px 90px rgba(0,0,0,.72);
  overflow: hidden;
  backdrop-filter: blur(12px);
}
#${PANEL_ID} .s936-sp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 13px 14px;
  border-bottom: 1px solid rgba(255,255,255,.10);
}
#${PANEL_ID} .s936-sp-brand {
  min-width: 0;
}
#${PANEL_ID} .s936-sp-kicker {
  color: #00ffcc;
  font-size: .60rem;
  font-weight: 950;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}
#${PANEL_ID} .s936-sp-title {
  margin: 2px 0 0;
  font-size: 1.05rem;
  line-height: 1.05;
  font-weight: 950;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
#${PANEL_ID} .s936-sp-version-badge {
  display: inline-block;
  margin-top: 4px;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid rgba(0,255,204,.35);
  background: rgba(0,255,204,.08);
  color: #7dffe0;
  font-size: .56rem;
  font-weight: 900;
  letter-spacing: .3px;
  text-transform: uppercase;
}
#${PANEL_ID} .s936-sp-header-actions {
  display: flex;
  gap: 6px;
  flex: 0 0 auto;
}
#${PANEL_ID} .s936-sp-icon {
  min-width: 42px;
  border: 1px solid rgba(255,255,255,.14);
  border-radius: 999px;
  padding: 8px 10px;
  background: rgba(255,255,255,.06);
  color: #eafdf8;
  font-size: .66rem;
  font-weight: 950;
  cursor: pointer;
}
#${PANEL_ID} .s936-sp-icon:hover {
  color: #00ffcc;
  border-color: rgba(0,255,204,.55);
  background: rgba(0,255,204,.10);
}
#${PANEL_ID} .s936-sp-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  padding: 10px;
  border-bottom: 1px solid rgba(255,255,255,.08);
}
#${PANEL_ID}.is-max .s936-sp-tabs {
  grid-template-columns: repeat(6, 1fr);
}
#${PANEL_ID} .s936-sp-tab {
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 12px;
  padding: 8px 6px;
  background: rgba(255,255,255,.05);
  color: rgba(255,255,255,.82);
  font-size: .64rem;
  font-weight: 950;
  letter-spacing: .5px;
  text-transform: uppercase;
  cursor: pointer;
}
#${PANEL_ID} .s936-sp-tab.active,
#${PANEL_ID} .s936-sp-tab:hover {
  border-color: rgba(0,255,204,.7);
  color: #00ffcc;
  background: rgba(0,255,204,.12);
}
#${PANEL_ID} .s936-sp-content {
  min-height: 0;
  overflow: auto;
  padding: 12px;
  /* Cambio 92: barra de scroll con look de consola en vez de la gris
     genérica del navegador (Firefox). El estilo real (con brillo) va abajo
     vía ::-webkit-scrollbar para Chrome/Edge/Safari. */
  scrollbar-width: thin;
  scrollbar-color: rgba(0,255,204,.55) rgba(255,255,255,.04);
}
#${PANEL_ID}.is-max .s936-sp-content {
  padding: 18px;
}
/* Cambio 92 · barra de scroll temática (Chrome/Edge/Safari) — teal con
   brillo dorado sutil, a tono con la consola, en vez del gris genérico. */
#${PANEL_ID} .s936-sp-content::-webkit-scrollbar,
#${PANEL_ID} .s936-struct-arrangement-full::-webkit-scrollbar {
  width: 9px;
}
#${PANEL_ID} .s936-sp-content::-webkit-scrollbar-track,
#${PANEL_ID} .s936-struct-arrangement-full::-webkit-scrollbar-track {
  background: rgba(255,255,255,.03);
  border-radius: 999px;
}
#${PANEL_ID} .s936-sp-content::-webkit-scrollbar-thumb,
#${PANEL_ID} .s936-struct-arrangement-full::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(0,255,204,.75), rgba(255,224,102,.55));
  box-shadow: 0 0 6px rgba(0,255,204,.45);
  border: 2px solid transparent;
  background-clip: padding-box;
}
#${PANEL_ID} .s936-sp-content::-webkit-scrollbar-thumb:hover,
#${PANEL_ID} .s936-struct-arrangement-full::-webkit-scrollbar-thumb:hover {
  background:
    linear-gradient(180deg, rgba(0,255,204,.95), rgba(255,224,102,.75));
  box-shadow: 0 0 10px rgba(0,255,204,.65);
}
#${PANEL_ID} .s936-sp-section-title {
  margin: 0 0 5px;
  color: #fff;
  font-size: 1.05rem;
  font-weight: 950;
}
#${PANEL_ID} .s936-sp-subtitle {
  margin: 0 0 12px;
  color: rgba(255,255,255,.68);
  line-height: 1.42;
  font-size: .78rem;
}
#${PANEL_ID} .s936-sp-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}
#${PANEL_ID}.is-max .s936-sp-grid.two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
#${PANEL_ID}.is-max .s936-sp-grid.three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
#${PANEL_ID} .s936-sp-card {
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 16px;
  padding: 12px;
  background: rgba(255,255,255,.045);
}
#${PANEL_ID} .s936-sp-card.important {
  border-color: rgba(255,216,77,.28);
  background: rgba(255,216,77,.055);
}
#${PANEL_ID} .s936-sp-card h4 {
  margin: 0 0 8px;
  font-size: .82rem;
  color: #8affff;
  text-transform: uppercase;
  letter-spacing: .7px;
}
#${PANEL_ID} .s936-sp-line {
  margin: 5px 0;
  color: rgba(255,255,255,.88);
  line-height: 1.42;
  font-size: .78rem;
}
#${PANEL_ID} .s936-sp-line strong { color: #ffe066; }
#${PANEL_ID} .s936-sp-muted {
  color: rgba(255,255,255,.66);
  line-height: 1.45;
  font-size: .76rem;
}
#${PANEL_ID} .s936-sp-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 10px;
}
#${PANEL_ID} .s936-sp-btn {
  border: 1px solid rgba(0,255,204,.35);
  border-radius: 999px;
  padding: 8px 11px;
  background: rgba(0,255,204,.08);
  color: #bfffee;
  font-size: .68rem;
  font-weight: 950;
  cursor: pointer;
}
#${PANEL_ID} .s936-sp-btn.secondary {
  border-color: rgba(255,255,255,.16);
  background: rgba(255,255,255,.055);
  color: rgba(255,255,255,.86);
}
#${PANEL_ID} .s936-sp-btn.warn {
  border-color: rgba(255,216,77,.55);
  background: rgba(255,216,77,.09);
  color: #ffe066;
}
#${PANEL_ID} .s936-sp-btn.gold {
  border-color: rgba(255,216,77,.75);
  background: linear-gradient(180deg, rgba(255,216,77,.18), rgba(255,216,77,.07));
  color: #ffe066;
  box-shadow: 0 0 16px rgba(255,216,77,.08);
}
#${PANEL_ID} .s936-sp-btn.danger {
  border-color: rgba(255,92,92,.55);
  background: rgba(255,92,92,.08);
  color: #ffadad;
}
#${PANEL_ID} .s936-sp-btn:disabled {
  opacity: .45;
  cursor: not-allowed;
}
#${PANEL_ID} .s936-sp-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.08);
}
#${PANEL_ID} .s936-sp-mini-nav {
  display: flex;
  gap: 7px;
  overflow-x: auto;
  padding-bottom: 8px;
  margin-bottom: 10px;
}
#${PANEL_ID} .s936-sp-mini-tab {
  flex: 0 0 auto;
  border: 1px solid rgba(255,255,255,.13);
  border-radius: 999px;
  padding: 7px 10px;
  background: rgba(255,255,255,.05);
  color: rgba(255,255,255,.8);
  font-size: .66rem;
  font-weight: 950;
  text-transform: uppercase;
  cursor: pointer;
}
#${PANEL_ID} .s936-sp-mini-tab.active {
  border-color: rgba(0,255,204,.65);
  background: rgba(0,255,204,.12);
  color: #00ffcc;
}
#${PANEL_ID} .s936-sp-health {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
#${PANEL_ID}.is-max .s936-sp-health {
  grid-template-columns: repeat(4, 1fr);
}
#${PANEL_ID} .s936-sp-health-item {
  border: 1px solid rgba(255,255,255,.10);
  border-radius: 14px;
  padding: 10px;
  background: rgba(0,0,0,.16);
}
#${PANEL_ID} .s936-sp-health-item b {
  display: block;
  font-size: 1.35rem;
  color: #fff;
}
#${PANEL_ID} .s936-sp-health-item span {
  display: block;
  margin-top: 3px;
  color: rgba(255,255,255,.62);
  font-size: .66rem;
  text-transform: uppercase;
  letter-spacing: .5px;
}
#${PANEL_ID} .s936-sp-preview {
  white-space: pre-wrap;
  max-height: 360px;
  overflow: auto;
  padding: 11px;
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 14px;
  background: rgba(0,0,0,.24);
  color: rgba(255,255,255,.87);
  line-height: 1.42;
  font-size: .76rem;
}
#${PANEL_ID} .s936-sp-select,
#${PANEL_ID} .s936-sp-textarea,
#${PANEL_ID} .s936-sp-input,
#${PANEL_ID} .s936-sp-range {
  width: 100%;
  margin: 6px 0 10px;
}
#${PANEL_ID} .s936-sp-select,
#${PANEL_ID} .s936-sp-textarea,
#${PANEL_ID} .s936-sp-input {
  border: 1px solid rgba(255,255,255,.16);
  border-radius: 12px;
  background: rgba(0,0,0,.26);
  color: #fff;
  padding: 9px 10px;
  font: inherit;
  font-size: .78rem;
}
#${PANEL_ID} .s936-sp-textarea {
  min-height: 96px;
  resize: vertical;
}
#${PANEL_ID} .s936-sp-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin: 8px 0;
}
#${PANEL_ID} .s936-sp-chip {
  border: 1px solid rgba(255,255,255,.14);
  border-radius: 999px;
  padding: 6px 9px;
  background: rgba(255,255,255,.06);
  color: #fff;
  font-size: .68rem;
  font-weight: 850;
}
#${PANEL_ID} .s936-sp-chip.root {
  border-color: rgba(255,216,77,.62);
  color: #ffe066;
}
#${PANEL_ID} .s936-sp-drum-grid {
  display: grid;
  grid-template-columns: repeat(16, 1fr);
  gap: 3px;
  margin: 10px 0;
}
#${PANEL_ID} .s936-sp-step {
  height: 22px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
}
#${PANEL_ID} .s936-sp-step.kick { background: rgba(0,255,204,.45); }
#${PANEL_ID} .s936-sp-step.snare { background: rgba(255,216,77,.48); }
#${PANEL_ID} .s936-sp-step.hat { box-shadow: inset 0 -4px 0 rgba(255,255,255,.34); }
#${PANEL_ID} .s936-sp-step.play { outline: 2px solid #fff; }
#${PANEL_ID} .s936-sp-toast {
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 16px;
  pointer-events: none;
  opacity: 0;
  transform: translateY(8px);
  transition: .18s ease;
  border: 1px solid rgba(0,255,204,.38);
  border-radius: 14px;
  padding: 10px 12px;
  background: rgba(0,0,0,.82);
  color: #bfffee;
  font-size: .78rem;
  font-weight: 800;
}
#${PANEL_ID} .s936-sp-toast.show {
  opacity: 1;
  transform: translateY(0);
}
/* v3.1 Command Center visual song map */
#${PANEL_ID} .s936-sp-command-block {
  margin-top: 12px;
  border: 1px solid rgba(255,255,255,.11);
  border-radius: 18px;
  padding: 13px;
  background: rgba(255,255,255,.035);
}
#${PANEL_ID} .s936-sp-command-block h4 {
  margin: 0 0 5px;
  color: #fff;
  font-size: .88rem;
  letter-spacing: .7px;
  text-transform: uppercase;
}
#${PANEL_ID} .command-hero {
  overflow: hidden;
}
#${PANEL_ID} .s936-sp-timeline {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(150px, 1fr);
  gap: 10px;
  overflow-x: auto;
  padding: 6px 2px 4px;
  -webkit-overflow-scrolling: touch;
}
#${PANEL_ID}.is-max .s936-sp-timeline {
  grid-auto-columns: minmax(180px, 1fr);
}
#${PANEL_ID} .s936-sp-section-tile {
  min-height: 124px;
  border: 1px solid rgba(0,255,204,.22);
  border-radius: 16px;
  padding: 11px;
  background: linear-gradient(180deg, rgba(0,255,204,.075), rgba(255,255,255,.028));
}
#${PANEL_ID} .s936-sp-section-tile.warn {
  border-color: rgba(255,216,77,.32);
  background: linear-gradient(180deg, rgba(255,216,77,.075), rgba(255,255,255,.025));
}
#${PANEL_ID} .s936-sp-section-tile.empty {
  min-width: 260px;
}
#${PANEL_ID} .s936-sp-section-tile small {
  display: inline-flex;
  margin-bottom: 6px;
  color: #ffd84d;
  font-size: .58rem;
  font-weight: 950;
  letter-spacing: 1px;
}
#${PANEL_ID} .s936-sp-section-tile b {
  display: block;
  color: #fff;
  font-size: .82rem;
  line-height: 1.15;
  text-transform: uppercase;
}
#${PANEL_ID} .s936-sp-section-tile span {
  display: block;
  margin-top: 4px;
  color: rgba(255,255,255,.66);
  font-size: .68rem;
}
#${PANEL_ID} .s936-sp-section-chords {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
}
#${PANEL_ID} .s936-sp-section-chords em {
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 999px;
  padding: 4px 7px;
  background: rgba(0,0,0,.25);
  color: #bfffee;
  font-style: normal;
  font-size: .62rem;
  font-weight: 900;
}
#${PANEL_ID} .s936-sp-section-flags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
}
#${PANEL_ID} .s936-sp-section-flags i {
  border: 1px solid rgba(255,255,255,.10);
  border-radius: 999px;
  padding: 3px 6px;
  color: rgba(255,255,255,.48);
  font-style: normal;
  font-size: .56rem;
  font-weight: 800;
}
#${PANEL_ID} .s936-sp-section-flags i.ok {
  border-color: rgba(0,255,204,.35);
  color: #00ffcc;
}
#${PANEL_ID} .s936-sp-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 8px;
}
#${PANEL_ID} .s936-sp-chip {
  border: 1px solid rgba(0,255,204,.28);
  border-radius: 999px;
  padding: 7px 10px;
  background: rgba(0,255,204,.07);
  color: #bfffee;
  font-size: .72rem;
  font-weight: 950;
}
#${PANEL_ID} .s936-sp-keystrip {
  display: flex;
  gap: 5px;
  margin-top: 12px;
  padding: 8px;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 14px;
  background: rgba(0,0,0,.18);
}
#${PANEL_ID} .s936-sp-key {
  flex: 1;
  min-width: 26px;
  border: 1px solid rgba(255,255,255,.10);
  border-radius: 8px;
  padding: 9px 4px;
  background: rgba(255,255,255,.05);
  color: rgba(255,255,255,.48);
  text-align: center;
  font-size: .68rem;
  font-weight: 950;
}
#${PANEL_ID} .s936-sp-key.active {
  border-color: rgba(255,216,77,.55);
  background: rgba(255,216,77,.12);
  color: #ffd84d;
  box-shadow: 0 0 18px rgba(255,216,77,.08);
}


#${PANEL_ID} .s936-sp-view-toggle {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 10px 0 8px;
}
#${PANEL_ID} .s936-sp-view-toggle button {
  border: 1px solid rgba(255,255,255,.16);
  background: rgba(255,255,255,.055);
  color: rgba(255,255,255,.76);
  border-radius: 999px;
  padding: 7px 10px;
  font-size: .66rem;
  font-weight: 900;
  text-transform: uppercase;
  cursor: pointer;
}
#${PANEL_ID} .s936-sp-view-toggle button.active,
#${PANEL_ID} .s936-sp-view-toggle button:hover {
  border-color: rgba(0,255,204,.75);
  background: rgba(0,255,204,.13);
  color: #00ffcc;
}
#${PANEL_ID} .s936-sp-harmony-gallery {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}
#${PANEL_ID} .s936-sp-harmony-gallery.fret {
  grid-template-columns: repeat(auto-fit, minmax(136px, 1fr));
}
#${PANEL_ID} .s936-sp-harmony-gallery.piano {
  grid-template-columns: repeat(auto-fit, minmax(185px, 1fr));
}
#${PANEL_ID} .s936-sp-harmony-card {
  border: 1px solid rgba(255,255,255,.13);
  border-radius: 16px;
  padding: 12px;
  background: rgba(0,0,0,.18);
  min-width: 0;
}
#${PANEL_ID} .s936-sp-harmony-card h5 {
  margin: 0 0 9px;
  color: #fff;
  font-size: .78rem;
  letter-spacing: .5px;
  text-transform: uppercase;
}
#${PANEL_ID} .s936-sp-harmony-card small {
  display: block;
  margin-top: 8px;
  color: rgba(255,255,255,.66);
  font-size: .65rem;
  line-height: 1.35;
}
#${PANEL_ID} .s936-sp-piano-mini {
  position: relative;
  display: grid;
  grid-template-columns: repeat(12, minmax(16px, 1fr));
  gap: 3px;
  align-items: end;
  min-height: 70px;
  padding: 8px;
  border-radius: 12px;
  background: rgba(0,0,0,.26);
  border: 1px solid rgba(255,255,255,.10);
}
#${PANEL_ID} .s936-sp-piano-key {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  min-height: 56px;
  padding: 4px 0;
  border-radius: 0 0 7px 7px;
  background: rgba(245,245,245,.88);
  color: #111;
  font-size: .52rem;
  font-weight: 950;
}
#${PANEL_ID} .s936-sp-piano-key.black {
  min-height: 38px;
  background: #101010;
  color: rgba(255,255,255,.75);
  border: 1px solid rgba(255,255,255,.20);
}
#${PANEL_ID} .s936-sp-piano-key.active {
  background: #00ffcc;
  color: #00110d;
  box-shadow: 0 0 16px rgba(0,255,204,.36);
}
#${PANEL_ID} .s936-sp-piano-key.root {
  background: #ff4dff;
  color: #fff;
  box-shadow: 0 0 18px rgba(255,77,255,.42);
}
#${PANEL_ID} .s936-sp-fret-mini {
  position: relative;
  height: 124px;
  border-radius: 13px;
  background:
    linear-gradient(90deg, rgba(255,255,255,.055), rgba(255,255,255,0)),
    linear-gradient(180deg, rgba(70,45,24,.62), rgba(14,10,8,.95));
  border: 1px solid rgba(255,216,77,.22);
  overflow: hidden;
}
#${PANEL_ID} .s936-sp-fret-mini .string-line {
  position: absolute;
  top: 8%;
  bottom: 10%;
  width: 1px;
  background: rgba(255,255,255,.43);
  transform: translateX(-50%);
}
#${PANEL_ID} .s936-sp-fret-mini .fret-line {
  position: absolute;
  left: 6%;
  right: 6%;
  height: 1px;
  background: rgba(255,255,255,.22);
}
#${PANEL_ID} .s936-sp-fret-mini .fret-line:first-child {
  height: 3px;
  background: rgba(255,240,210,.86);
}
#${PANEL_ID} .s936-sp-fret-mini .note-dot {
  position: absolute;
  width: 19px;
  height: 19px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: #00ffcc;
  color: #00110d;
  font-size: .58rem;
  font-weight: 950;
  box-shadow: 0 0 14px rgba(0,255,204,.36);
}
#${PANEL_ID} .s936-sp-fret-mini .note-dot.root {
  background: #ff4dff;
  color: #fff;
  box-shadow: 0 0 15px rgba(255,77,255,.44);
}
#${PANEL_ID} .s936-sp-fret-mini .mute-x {
  position: absolute;
  top: 2px;
  color: #ff6b6b;
  font-size: .74rem;
  font-weight: 950;
  transform: translateX(-50%);
}
#${PANEL_ID} .s936-sp-fret-labels {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 2px;
  margin-top: 5px;
  color: rgba(255,255,255,.56);
  font-size: .58rem;
  font-weight: 800;
  text-align: center;
}
#${PANEL_ID} .s936-sp-fret-mini.ukulele + .s936-sp-fret-labels {
  grid-template-columns: repeat(4, 1fr);
}


#${PANEL_ID} .s936-sp-subhead {
  margin: 12px 0 8px;
  color: #8affff;
  font-size: .70rem;
  letter-spacing: 1px;
  text-transform: uppercase;
}
#${PANEL_ID} .s936-sp-song-ribbon {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 8px 0 2px;
  scrollbar-width: thin;
}
#${PANEL_ID} .s936-sp-song-node {
  flex: 0 0 118px;
  min-height: 72px;
  border: 1px solid rgba(0,255,204,.28);
  border-radius: 15px;
  background: linear-gradient(180deg, rgba(0,255,204,.10), rgba(0,0,0,.22));
  color: #eafffb;
  padding: 9px;
  text-align: left;
  cursor: pointer;
}
#${PANEL_ID} .s936-sp-song-node small {
  display: block;
  color: #ffd84d;
  font-size: .58rem;
  font-weight: 950;
}
#${PANEL_ID} .s936-sp-song-node b {
  display: block;
  margin-top: 5px;
  font-size: .72rem;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
#${PANEL_ID} .s936-sp-song-node span {
  display: block;
  margin-top: 5px;
  color: rgba(255,255,255,.68);
  font-size: .61rem;
  font-weight: 800;
}
#${PANEL_ID} .s936-sp-song-ribbon .more,
#${PANEL_ID} .s936-sp-song-ribbon .empty {
  align-self: stretch;
  display: inline-flex;
  align-items: center;
  border: 1px dashed rgba(255,255,255,.18);
  border-radius: 14px;
  padding: 10px 12px;
  color: rgba(255,255,255,.68);
  font-size: .70rem;
  font-weight: 800;
}
#${PANEL_ID} .s936-sp-piano-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 8px 0 10px;
  color: rgba(255,255,255,.76);
  font-size: .66rem;
  font-weight: 800;
}
#${PANEL_ID} .s936-sp-piano-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
#${PANEL_ID} .s936-sp-piano-legend i {
  display: inline-block;
  width: 11px;
  height: 11px;
  border-radius: 999px;
  background: #00ffcc;
}
#${PANEL_ID} .s936-sp-piano-legend i.root { background: #ff4dff; }
#${PANEL_ID} .s936-sp-piano-legend i.tension { background: #ffd84d; }
#${PANEL_ID} .s936-sp-piano-key.tension {
  background: #ffd84d !important;
  color: #1b1300 !important;
  box-shadow: 0 0 10px rgba(255,216,77,.35);
}
#${PANEL_ID} .s936-sp-fret-position {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin: 10px 0;
}
#${PANEL_ID} .s936-sp-fret-position span {
  color: #ffd84d;
  font-size: .64rem;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: .8px;
}
#${PANEL_ID} .s936-sp-fret-position button {
  border: 1px solid rgba(255,255,255,.14);
  border-radius: 999px;
  background: rgba(255,255,255,.055);
  color: rgba(255,255,255,.78);
  padding: 6px 9px;
  font-size: .62rem;
  font-weight: 900;
  cursor: pointer;
}
#${PANEL_ID} .s936-sp-fret-position button.active,
#${PANEL_ID} .s936-sp-fret-position button:hover {
  border-color: rgba(0,255,204,.62);
  color: #00ffcc;
  background: rgba(0,255,204,.10);
}
#${PANEL_ID} .s936-sp-fret-mini .base-fret {
  position: absolute;
  left: 0;
  top: 20%;
  transform: translateX(-105%);
  color: #ffd84d;
  font-size: .58rem;
  font-weight: 950;
}
#${PANEL_ID} .s936-sp-fret-mini .note-dot.tension {
  background: #ffd84d !important;
  color: #1b1300 !important;
  box-shadow: 0 0 12px rgba(255,216,77,.38);
}
#${PANEL_ID} .s936-sp-card-position {
  width: 100%;
  margin-top: 7px;
  border: 1px solid rgba(255,255,255,.13);
  border-radius: 10px;
  background: rgba(0,0,0,.28);
  color: rgba(255,255,255,.82);
  padding: 6px 7px;
  font-size: .64rem;
  font-weight: 800;
}

/* v3.4 Mapa Maestro refinado */
#${PANEL_ID} .s936-sp-health {
  gap: 6px;
  margin-bottom: 10px;
}
#${PANEL_ID}.is-max .s936-sp-health {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}
#${PANEL_ID} .s936-sp-health-item {
  border-radius: 12px;
  padding: 7px 9px;
}
#${PANEL_ID} .s936-sp-health-item b {
  font-size: .98rem;
  line-height: 1.05;
}
#${PANEL_ID} .s936-sp-health-item span {
  margin-top: 2px;
  font-size: .54rem;
}
#${PANEL_ID} .command-hero {
  padding: 14px;
}
#${PANEL_ID}.is-max .command-hero {
  min-height: 260px;
}
#${PANEL_ID} .s936-sp-song-ribbon.lyric-map {
  gap: 10px;
  padding: 10px 0 4px;
}
#${PANEL_ID} .s936-sp-song-ribbon.lyric-map .s936-sp-song-node {
  flex: 0 0 218px;
  min-height: 154px;
  display: flex;
  flex-direction: column;
}
#${PANEL_ID}.is-max .s936-sp-song-ribbon.lyric-map .s936-sp-song-node {
  flex-basis: 245px;
}
#${PANEL_ID} .s936-sp-song-node .meta {
  display: block;
  margin-top: 4px;
  color: rgba(255,255,255,.68);
  font-size: .61rem;
  font-weight: 800;
}
#${PANEL_ID} .s936-sp-song-lyric {
  flex: 1;
  margin: 8px 0 8px;
  padding: 8px;
  border-radius: 11px;
  background: rgba(255,255,255,.065);
  border: 1px solid rgba(255,255,255,.10);
  color: #f4fbff;
  font-size: .72rem;
  line-height: 1.35;
  text-transform: none;
  overflow: hidden;
}
#${PANEL_ID} .s936-sp-song-lyric.empty {
  color: rgba(255,255,255,.45);
  font-style: italic;
}
#${PANEL_ID} .s936-sp-song-mini-chords {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  margin-top: auto;
}
#${PANEL_ID} .s936-sp-song-mini-chords em {
  border: 1px solid rgba(0,255,204,.24);
  border-radius: 999px;
  padding: 3px 6px;
  background: rgba(0,0,0,.25);
  color: #bfffee;
  font-size: .56rem;
  font-style: normal;
  font-weight: 900;
}
#${PANEL_ID} .s936-sp-actions-card {
  margin-top: 12px;
}
#${PANEL_ID} .s936-sp-card-position-wrap {
  display: block;
  margin-top: 8px;
}
#${PANEL_ID} .s936-sp-card-position-wrap span {
  display: block;
  margin-bottom: 4px;
  color: rgba(255,216,77,.82);
  font-size: .56rem;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: .6px;
}

/* v3.5 Mapa Maestro limpio */
#${PANEL_ID} .command-hero-v35 {
  padding: 12px 14px 14px;
}
#${PANEL_ID}.is-max .command-hero-v35 {
  min-height: 0;
}
#${PANEL_ID} .command-hero-v35 h4 {
  margin: 0;
  text-align: center;
  color: #8affff;
  font-size: 1.02rem;
  letter-spacing: .8px;
  text-transform: uppercase;
}
#${PANEL_ID} .s936-sp-master-meta {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 2px 7px;
  margin: 8px auto 4px;
  color: rgba(255,255,255,.78);
  font-size: .70rem;
  line-height: 1.35;
  text-align: center;
}
#${PANEL_ID} .s936-sp-master-meta strong {
  color: #ffd84d;
}
#${PANEL_ID} .command-hero-v35 .s936-sp-subhead {
  text-align: center;
  margin-top: 12px;
}
#${PANEL_ID} .command-hero-v35 .s936-sp-song-ribbon.lyric-map .s936-sp-song-node {
  flex-basis: 240px;
  min-height: 162px;
}
#${PANEL_ID}.is-max .command-hero-v35 .s936-sp-song-ribbon.lyric-map .s936-sp-song-node {
  flex-basis: 276px;
}
#${PANEL_ID} .s936-sp-song-mini-chords em.repeat {
  border-color: rgba(255,216,77,.28);
  color: #ffe066;
  background: rgba(255,216,77,.08);
}
#${PANEL_ID} .command-harmony-v35 {
  margin-top: 14px;
}

@media(max-width: 760px) {
  #${PANEL_ID} {
    left: 8px;
    right: 8px;
    top: 8px;
    bottom: 8px;
    width: auto;
  }
  #${PANEL_ID} .s936-sp-tabs {
    grid-template-columns: repeat(2, 1fr);
  }
}
`;
    document.head.appendChild(style);
  }

  function ensurePanel() {
    installStyles();
    let panel = byId(PANEL_ID);
    if (!panel) {
      panel = el("aside", "");
      panel.id = PANEL_ID;
      panel.setAttribute("aria-label", "Suite Pro");
      document.body.appendChild(panel);
      // Cambio 361: el panel también debe "mantenerse abierto" mientras
      // el mouse está sobre él — si solo escucháramos hover en la barra
      // de íconos, mover el cursor desde la barra hacia adentro del
      // Docker lo cerraría a mitad de camino.
      panel.addEventListener("mouseenter", showDockOnHover);
      panel.addEventListener("mouseleave", scheduleHideDockOnHover);
    }
    if (!panel.dataset.ready) buildShell(panel);
    applyMode(panel);
    return panel;
  }

  function buildShell(panel) {
    panel.textContent = "";
    panel.dataset.ready = "1";

    const shell = el("div", "s936-sp-shell");
    // Cambio 347: Val pidió quitar el header completo (marca "Studio 936
    // / Suite Pro", badge de versión, y los botones SYNC/DOCK/CERRAR) —
    // era el panel flotante con controles de "ventana" que no encajaba
    // con la idea de barra lateral fija. Se confirmó que es seguro
    // quitarlo: app.js YA tiene su propio botón independiente
    // (v19ToolsToggle) que llama a window.Studio936SuitePro.toggle()/
    // .close() directamente — no depende del botón CERRAR de aquí adentro
    // para poder cerrar el panel. Las funciones close()/toggle()/
    // applyMode() se dejan intactas (no se borraron), solo se dejó de
    // construir los botones que las disparaban desde este header.

    const tabs = el("nav", "s936-sp-tabs");
    // Cambio 360: se quita la pestaña "Compose" de aquí — Val pidió
    // eliminarla porque era un título repetido (la barra de íconos con
    // hover, Cambio 356, ya cubre esa navegación llamando a setArea()
    // directamente). AREAS en sí no se toca (por si algo más la usa),
    // solo se filtra al construir los botones visibles.
    AREAS.filter(([key]) => key !== "compose").forEach(([key, label]) => {
      const btn = el("button", "s936-sp-tab", label);
      btn.type = "button";
      btn.dataset.area = key;
      btn.onclick = () => setArea(key);
      tabs.appendChild(btn);
    });

    const content = el("section", "s936-sp-content");
    content.id = "s936SuiteProContent";

    shell.append(tabs, content);
    panel.appendChild(shell);
    render();
  }

  function applyMode(panel=ensurePanel()) {
    panel.classList.toggle("is-max", state.mode === "max");
    const btn = q("[data-role='mode']", panel);
    if (btn) btn.textContent = state.mode === "max" ? "DOCK" : "MAX";
    // v0.8.6: reubicar chart cuando cambia el modo MAX/DOCK
    // Dos intentos: 80ms para que el CSS .is-max ya esté computado, 300ms para el layout final
    const chartEl = document.getElementById("s936-chart-view-panel");
    if (chartEl && chartEl._resizeHandler) {
      setTimeout(chartEl._resizeHandler, 80);
      setTimeout(chartEl._resizeHandler, 300);
    }
  }

  function setArea(area) {
    state.area = area;
    localStorage.setItem("s936_suite_area_v3", area);
    render();
  }

  function content() {
    return q("#s936SuiteProContent", ensurePanel());
  }

  function clearContent() {
    const c = content();
    c.textContent = "";
    qa(".s936-sp-tab", ensurePanel()).forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.area === state.area);
    });
    return c;
  }

  function title(c, heading, subtitle) {
    c.appendChild(el("h3", "s936-sp-section-title", heading));
    if (subtitle) c.appendChild(el("p", "s936-sp-subtitle", subtitle));
  }

  function line(parent, label, value) {
    const p = el("p", "s936-sp-line");
    p.appendChild(el("strong", "", label + ":"));
    p.appendChild(document.createTextNode(" " + (value ?? "")));
    parent.appendChild(p);
  }

  function action(parent, label, fn, className="s936-sp-btn") {
    const btn = el("button", className, label);
    btn.type = "button";
    btn.onclick = fn;
    parent.appendChild(btn);
    return btn;
  }

  function actions(parent) {
    const box = el("div", "s936-sp-actions");
    parent.appendChild(box);
    return box;
  }

  function render() {
    const map = {
      command: renderCommand,
      compose: renderCompose,
      arrange: renderArrange,
      practice: renderPractice,
      studio: renderStudio,
      export: renderExport
    };
    (map[state.area] || renderCommand)();
  }


  function sectionDisplayName(part) {
    if (!part) return "Parte";
    return part.label || part.name || part.sectionName || part.section || "Parte";
  }

  function sectionKey(part) {
    return part?.section || part?.key || part?.id || "";
  }

  function sectionItems(s, key) {
    const sections = s.sections || {};
    const list = sections[key];
    return Array.isArray(list) ? list : [];
  }

  function sectionBars(items) {
    return items.reduce((sum, item) => sum + Math.max(1, Number(item?.bars) || 1), 0);
  }

  function sectionPatternNames(items, limit=4) {
    const seen = new Set();
    const names = [];
    (items || []).forEach((item) => {
      const name = String(item?.name || "").trim();
      if (name && !seen.has(name)) {
        seen.add(name);
        names.push(name);
      }
    });
    return names.slice(0, limit);
  }

  function sectionPatternSummary(items) {
    const pattern = sectionPatternNames(items, 4);
    const bars = sectionBars(items);
    if (!items || !items.length) return "Pendiente";
    if (!pattern.length) return bars + " compases";
    return bars + " compases · patrón de " + pattern.length + " acorde" + (pattern.length === 1 ? "" : "s");
  }

  function sectionExtraEvents(items, visibleCount) {
    const total = Array.isArray(items) ? items.length : 0;
    const extra = total - visibleCount;
    return extra > 0 ? extra : 0;
  }

  function sectionLyric(s, key) {
    return String((s.lyrics || {})[key] || "").trim();
  }

  function lyricExcerpt(s, key, max=135) {
    const raw = sectionLyric(s, key).replace(/\s+/g, " ").trim();
    if (!raw) return "Sin letra todavía";
    return raw.length > max ? raw.slice(0, max - 1).trim() + "…" : raw;
  }

  function hasSectionLyric(s, key) {
    return sectionLyric(s, key).length > 0;
  }

  function hasSectionSolo(s, key) {
    return String((s.sectionSolos || {})[key]?.phrase || "").trim().length > 0;
  }

  function commandParts(s) {
    const arr = Array.isArray(s.arrangement) ? s.arrangement.filter(Boolean) : [];
    if (arr.length) return arr;
    const sections = s.sections || {};
    return Object.keys(sections)
      .filter((key) => Array.isArray(sections[key]) && sections[key].length)
      .map((key) => ({ section:key, label:key }));
  }

  function uniqueChordNames(s, limit=18) {
    const seen = new Set();
    const names = [];
    const parts = commandParts(s);
    const source = parts.length ? parts.flatMap((part) => sectionItems(s, sectionKey(part))) : allSectionItems(s).map((x) => x.item);
    source.forEach((item) => {
      const name = String(item?.name || "").trim();
      if (name && !seen.has(name)) {
        seen.add(name);
        names.push(name);
      }
    });
    return names.slice(0, limit);
  }

  function commandRecommendation(s) {
    const parts = commandParts(s);
    const missingSections = parts.filter((part) => sectionItems(s, sectionKey(part)).length === 0);
    if (!s.title || /sin título|untitled/i.test(s.title)) return "Define un título definitivo para fijar identidad.";
    if (!parts.length) return "Crea o abre la estructura de canción.";
    if (chordCount(s) < 4) return "Construye una progresión mínima para verso o coro.";
    if (missingSections.length) return "Completa acordes en: " + missingSections.slice(0, 3).map(sectionDisplayName).join(", ") + ".";
    if (lyricCount(s) === 0) return "Escribe una primera letra o guía vocal en Letra/TAB.";
    if (soloCount(s) === 0) return "Crea una línea melódica guía para intro, solo o coro.";
    return "Ya hay base sólida: crea Lead Sheet y exporta JSON de respaldo.";
  }

  function renderMasterSongRibbon(parent, s) {
    const parts = commandParts(s);
    const ribbon = el("div", "s936-sp-song-ribbon lyric-map");
    if (!parts.length) {
      ribbon.appendChild(el("span", "empty", "Sin forma detectada · abre Arrange para crear estructura"));
      parent.appendChild(ribbon);
      return;
    }

    const limit = state.mode === "max" ? 14 : 7;
    parts.slice(0, limit).forEach((part, index) => {
      const key = sectionKey(part);
      const items = sectionItems(s, key);
      const pattern = sectionPatternNames(items, 4);
      const extra = sectionExtraEvents(items, pattern.length);
      const node = el("button", "s936-sp-song-node lyric-node", "");
      node.type = "button";
      node.title = [
        sectionDisplayName(part),
        sectionBars(items) + " compases",
        items.length + " eventos armónicos guardados",
        pattern.length ? "Patrón: " + pattern.join(" → ") : "Sin patrón"
      ].join(" · ");
      node.onclick = () => { state.area = "arrange"; state.arrangeTool = "lyrics"; setArea("arrange"); };
      node.appendChild(el("small", "", String(index + 1).padStart(2, "0")));
      node.appendChild(el("b", "", sectionDisplayName(part)));
      node.appendChild(el("span", "meta", sectionPatternSummary(items)));
      const lyric = el("p", "s936-sp-song-lyric", lyricExcerpt(s, key));
      lyric.classList.toggle("empty", !hasSectionLyric(s, key));
      node.appendChild(lyric);

      const chordLine = el("div", "s936-sp-song-mini-chords");
      pattern.forEach((name) => chordLine.appendChild(el("em", "", name || "—")));
      if (extra > 0) chordLine.appendChild(el("em", "repeat", "repite +" + extra));
      if (!pattern.length) chordLine.appendChild(el("em", "", "pendiente"));
      node.appendChild(chordLine);
      ribbon.appendChild(node);
    });

    if (parts.length > limit) {
      ribbon.appendChild(el("span", "more", "+" + (parts.length - limit) + " partes"));
    }

    parent.appendChild(ribbon);
  }

  function renderCommandTimeline(parent, s) {
    const parts = commandParts(s);
    const wrap = el("div", "s936-sp-timeline");
    if (!parts.length) {
      const empty = el("article", "s936-sp-section-tile empty");
      empty.appendChild(el("b", "", "Sin estructura detectada"));
      empty.appendChild(el("span", "", "Abre Arrange → Estructura para ordenar la canción."));
      wrap.appendChild(empty);
      parent.appendChild(wrap);
      return;
    }

    parts.forEach((part, index) => {
      const key = sectionKey(part);
      const items = sectionItems(s, key);
      const tile = el("article", "s936-sp-section-tile");
      if (!items.length) tile.classList.add("warn");

      tile.appendChild(el("small", "", String(index + 1).padStart(2, "0")));
      tile.appendChild(el("b", "", sectionDisplayName(part)));
      tile.appendChild(el("span", "", items.length + " acordes · " + sectionBars(items) + " compases"));

      const chordLine = el("div", "s936-sp-section-chords");
      items.slice(0, 4).forEach((item) => chordLine.appendChild(el("em", "", item?.name || "—")));
      if (items.length > 4) chordLine.appendChild(el("em", "", "+" + (items.length - 4)));
      if (!items.length) chordLine.appendChild(el("em", "", "pendiente"));
      tile.appendChild(chordLine);

      const flags = el("div", "s936-sp-section-flags");
      flags.appendChild(el("i", hasSectionLyric(s, key) ? "ok" : "", hasSectionLyric(s, key) ? "Letra" : "Sin letra"));
      flags.appendChild(el("i", hasSectionSolo(s, key) ? "ok" : "", hasSectionSolo(s, key) ? "Solo" : "Sin solo"));
      tile.appendChild(flags);

      wrap.appendChild(tile);
    });
    parent.appendChild(wrap);
  }


  function printableEscape(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function printableDate() {
    try {
      return new Date().toLocaleString("es-CO", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (error) {
      return new Date().toISOString();
    }
  }

  function printableSectionCard(part, s, index) {
    const key = sectionKey(part);
    const items = sectionItems(s, key);
    const pattern = sectionPatternNames(items, 5);
    const extra = sectionExtraEvents(items, pattern.length);
    const lyric = lyricExcerpt(s, key, 155);
    const hasLyric = hasSectionLyric(s, key);
    const patternHtml = pattern.length
      ? pattern.map((name) => "<span>" + printableEscape(name) + "</span>").join("")
      : "<span class=\"empty\">pendiente</span>";
    const extraHtml = extra ? "<span class=\"repeat\">repite +" + extra + "</span>" : "";
    return [
      "<article class=\"part-card\">",
      "<div class=\"part-top\"><b>" + String(index + 1).padStart(2, "0") + "</b><strong>" + printableEscape(sectionDisplayName(part)) + "</strong></div>",
      "<div class=\"part-meta\">" + printableEscape(sectionPatternSummary(items)) + "</div>",
      "<p class=\"lyric" + (hasLyric ? "" : " empty") + "\">" + printableEscape(lyric) + "</p>",
      "<div class=\"chords\">" + patternHtml + extraHtml + "</div>",
      "</article>"
    ].join("");
  }

  function printableChordCard(entry) {
    const root = chordRootName(entry.name || "");
    const noteNames = (entry.notes || []).map(pcName);
    const tensionNames = noteNames.filter((note) => normalizeKey(note) !== normalizeKey(root));
    return [
      "<article class=\"chord-card\">",
      "<h4>" + printableEscape(entry.name || "Acorde") + "</h4>",
      "<div><b>Raíz:</b> " + printableEscape(root || "—") + "</div>",
      "<div><b>Notas:</b> " + printableEscape(noteNames.join(" · ") || "—") + "</div>",
      "<div><b>Color:</b> " + printableEscape(tensionNames.slice(0, 5).join(" · ") || "triada/base") + "</div>",
      "</article>"
    ].join("");
  }


  function printableInstrumentModeLabel(mode) {
    if (mode === "guitar") return "Guitarra";
    if (mode === "ukulele") return "Ukelele";
    return "Piano";
  }

  function printablePianoChart(entry) {
    const sequence = [
      ["C", 0, "white"], ["C#", 1, "black"], ["D", 2, "white"], ["D#", 3, "black"],
      ["E", 4, "white"], ["F", 5, "white"], ["F#", 6, "black"], ["G", 7, "white"],
      ["G#", 8, "black"], ["A", 9, "white"], ["A#", 10, "black"], ["B", 11, "white"]
    ];
    const keys = sequence.map(([label, pc, kind]) => {
      const isActive = entry.notes.includes(pc);
      const role = isActive ? noteRoleClass(entry, pc) : "";
      const cls = "pkey " + kind + (isActive ? " on " + role : "");
      return "<span class=\"" + cls + "\"><b>" + printableEscape(label) + "</b></span>";
    }).join("");
    return [
      "<article class=\"print-chart piano-chart\">",
      "<h4>" + printableEscape(entry.name || "Acorde") + "</h4>",
      "<div class=\"piano-strip\">" + keys + "</div>",
      "<div class=\"chart-meta\">Raíz: " + printableEscape(entry.root || "—") + " · Ext: " + printableEscape(chordExtensions(entry.name)) + "</div>",
      "<div class=\"chart-notes\">Notas: " + printableEscape(entry.notes.map(pcName).join(" · ") || "—") + "</div>",
      "</article>"
    ].join("");
  }

  function printableFretChart(entry, instrument) {
    const position = cardFretPosition(entry, instrument);
    const baseFret = fretBaseFromPosition(position);
    const tuning = stringTunings(instrument);
    const stringCount = tuning.length;
    const rootPc = notePitchClass(entry.root);
    const used = new Set();

    const lines = [];
    if (baseFret > 0) {
      lines.push("<span class=\"base-fret\">" + printableEscape(baseFret) + "</span>");
    }

    for (let fret = 0; fret <= 5; fret += 1) {
      lines.push("<span class=\"fret-line\" style=\"top:" + (14 + fret * 17) + "%\"></span>");
    }

    tuning.forEach((string, index) => {
      const left = stringCount === 1 ? 50 : 8 + index * (84 / (stringCount - 1));
      lines.push("<span class=\"string-line\" style=\"left:" + left + "%\"></span>");

      const choice = findFretForString(string.pc, entry.notes, baseFret);
      if (choice) {
        used.add(choice.pc);
        const displayFret = baseFret > 0 ? choice.fret - baseFret + 1 : choice.fret;
        const role = noteRoleClass(entry, choice.pc);
        const marker = choice.fret === 0 ? "○" : String(used.size);
        const top = choice.fret === 0 ? 8 : 14 + (displayFret - .5) * 17;
        lines.push(
          "<span class=\"note-dot " + role + (choice.pc === rootPc ? " root" : "") + "\" style=\"left:" + left + "%;top:" + top + "%\" title=\"" +
          printableEscape(string.label + " · traste " + choice.fret + " · " + pcName(choice.pc)) + "\">" + printableEscape(marker) + "</span>"
        );
      } else {
        lines.push("<span class=\"mute-x\" style=\"left:" + left + "%\">×</span>");
      }
    });

    const labels = tuning.map((string) => "<span>" + printableEscape(string.label) + "</span>").join("");

    return [
      "<article class=\"print-chart fret-chart-card\">",
      "<h4>" + printableEscape(entry.name || "Acorde") + "</h4>",
      "<div class=\"fret-chart " + printableEscape(instrument) + "\">" + lines.join("") + "</div>",
      "<div class=\"string-labels\">" + labels + "</div>",
      "<div class=\"chart-meta\">" + printableEscape(fretPositionLabel(position)) + " · Raíz: " + printableEscape(entry.root || "—") + " · Ext: " + printableEscape(chordExtensions(entry.name)) + "</div>",
      "<div class=\"chart-notes\">Notas: " + printableEscape(entry.notes.map(pcName).join(" · ") || "—") + "</div>",
      "</article>"
    ].join("");
  }

  function printableInstrumentMapHtml(s, entries) {
    const mode = activeHarmonicView(s);
    if (!entries.length) return "<p class=\"empty-block\">Sin acordes para dibujar.</p>";
    if (mode === "guitar" || mode === "ukulele") {
      return entries.slice(0, 12).map((entry) => printableFretChart(entry, mode)).join("");
    }
    return entries.slice(0, 12).map(printablePianoChart).join("");
  }


  function masterMapPrintableHtml(s) {
    const parts = commandParts(s);
    const entries = chordEntries(s, 16);
    const partsHtml = parts.length
      ? parts.map((part, index) => printableSectionCard(part, s, index)).join("")
      : "<p class=\"empty-block\">Sin forma detectada.</p>";
    const chordsHtml = entries.length
      ? entries.map(printableChordCard).join("")
      : "<p class=\"empty-block\">Sin mapa armónico detectado.</p>";
    const instrumentMode = activeHarmonicView(s);
    const instrumentHtml = printableInstrumentMapHtml(s, entries);

    return "<!doctype html><html lang=\"es\"><head><meta charset=\"utf-8\"><title>Mapa Maestro - " + printableEscape(s.title || "Studio 936") + "</title>" +
      "<style>" +
      "@page{size:A4 landscape;margin:10mm;}" +
      "*{box-sizing:border-box;}" +
      "body{margin:0;background:#f6f3ea;color:#151515;font-family:Inter,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;}" +
      ".page{padding:18px;}" +
      ".brand{font-size:10px;letter-spacing:1.6px;text-transform:uppercase;color:#008b76;font-weight:900;}" +
      "header{display:grid;grid-template-columns:1.4fr 1fr;gap:16px;align-items:end;border-bottom:3px solid #00b894;padding-bottom:10px;margin-bottom:12px;}" +
      "h1{margin:4px 0 2px;font-size:27px;line-height:1;text-transform:uppercase;}" +
      ".sub{font-size:12px;color:#444;line-height:1.4;}" +
      ".metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}" +
      ".metric{border:1px solid #bbb;border-radius:12px;padding:8px;background:#fff;}" +
      ".metric b{display:block;font-size:19px;color:#111;}" +
      ".metric span{display:block;font-size:8px;text-transform:uppercase;color:#666;font-weight:800;letter-spacing:.7px;}" +
      "section{margin-top:12px;}" +
      "h2{font-size:13px;margin:0 0 8px;text-transform:uppercase;letter-spacing:.8px;color:#006b5d;}" +
      ".parts{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;}" +
      ".part-card{min-height:126px;border:1px solid #009b82;border-radius:12px;background:#fff;padding:9px;overflow:hidden;}" +
      ".part-top{display:flex;gap:6px;align-items:center;margin-bottom:5px;}" +
      ".part-top b{font-size:9px;color:#d5a100;}" +
      ".part-top strong{font-size:12px;text-transform:uppercase;}" +
      ".part-meta{font-size:9px;color:#555;margin-bottom:6px;font-weight:800;}" +
      ".lyric{min-height:39px;margin:0 0 7px;background:#eef3ef;border-radius:8px;padding:7px;font-size:9px;line-height:1.25;}" +
      ".lyric.empty{color:#888;font-style:italic;}" +
      ".chords{display:flex;flex-wrap:wrap;gap:4px;}" +
      ".chords span{border:1px solid #00a98f;border-radius:999px;padding:2px 6px;font-size:8px;font-weight:900;background:#ecfffb;}" +
      ".chords .repeat{border-color:#999;background:#f2f2f2;color:#555;}" +
      ".chords .empty{border-color:#ccc;background:#eee;color:#777;}" +
      ".harmonic{display:grid;grid-template-columns:repeat(8,1fr);gap:7px;}" +
      ".chord-card{border:1px solid #b8b8b8;border-radius:10px;background:#fff;padding:8px;min-height:74px;}" +
      ".chord-card h4{margin:0 0 5px;font-size:11px;color:#111;}" +
      ".chord-card div{font-size:8.5px;line-height:1.28;color:#333;}" +
      ".instrument-head{display:flex;justify-content:space-between;align-items:end;gap:12px;}" +
      ".instrument-note{font-size:9px;color:#555;font-weight:700;}" +
      ".instrument-map{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;}" +
      ".print-chart{break-inside:avoid;border:1px solid #27313c;border-radius:12px;background:#111820;color:#fff;padding:8px;min-height:150px;overflow:hidden;}" +
      ".print-chart h4{margin:0 0 6px;font-size:10px;text-transform:uppercase;color:#fff;letter-spacing:.4px;}" +
      ".chart-meta,.chart-notes{font-size:7.5px;line-height:1.25;color:#d7e1e4;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
      ".piano-strip{display:grid;grid-template-columns:repeat(12,1fr);gap:2px;height:72px;align-items:stretch;}" +
      ".pkey{position:relative;display:flex;align-items:flex-end;justify-content:center;border:1px solid #4a5662;border-radius:5px;padding-bottom:4px;background:#f9f9f4;color:#20242a;font-size:6px;font-weight:900;}" +
      ".pkey.black{height:48px;background:#151515;color:#eee;z-index:2;}" +
      ".pkey.on.active{background:#00ffcc;color:#07100e;border-color:#00ffcc;}" +
      ".pkey.on.root{background:#ff4fd8;color:#fff;border-color:#ff4fd8;}" +
      ".pkey.on.tension{background:#ffd84d;color:#181300;border-color:#ffd84d;}" +
      ".fret-chart{position:relative;height:96px;margin:2px 0 3px;background:linear-gradient(90deg,rgba(139,91,49,.42),rgba(70,45,26,.22));border:1px solid #56606a;border-radius:8px;}" +
      ".fret-chart.ukulele{height:92px;}" +
      ".fret-line{position:absolute;left:5%;right:5%;height:1px;background:rgba(255,255,255,.38);}" +
      ".string-line{position:absolute;top:8%;bottom:8%;width:1px;background:rgba(255,255,255,.55);}" +
      ".base-fret{position:absolute;left:4px;top:4px;z-index:3;color:#ffd84d;font-size:8px;font-weight:900;}" +
      ".note-dot{position:absolute;transform:translate(-50%,-50%);width:16px;height:16px;border-radius:999px;display:flex;align-items:center;justify-content:center;background:#00ffcc;color:#06100e;font-size:8px;font-weight:950;z-index:4;}" +
      ".note-dot.root{background:#ff4fd8;color:#fff;}" +
      ".note-dot.tension{background:#ffd84d;color:#151000;}" +
      ".mute-x{position:absolute;top:2px;transform:translateX(-50%);font-size:8px;color:#b5b5b5;}" +
      ".string-labels{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;text-align:center;font-size:7px;color:#cfd9dd;}" +
      ".empty-block{padding:14px;border:1px dashed #bbb;border-radius:12px;background:#fff;color:#777;}" +
      "footer{display:flex;justify-content:space-between;align-items:center;margin-top:12px;border-top:1px solid #ccc;padding-top:8px;font-size:9px;color:#555;}" +
      "@media print{.no-print{display:none!important;}body{background:#fff;}.page{padding:0;}}" +
      "</style></head><body><div class=\"page\">" +
      "<header>" +
      "<div><div class=\"brand\">Studio 936 · Mapa Maestro</div><h1>" + printableEscape(s.title || "Canción sin título") + "</h1><div class=\"sub\">" +
      printableEscape(s.author || "Sin autor") + " · " + printableEscape(s.instrument || "instrumento") + " · Tonalidad " + printableEscape(s.key || "C") + " · " + printableEscape(s.style || "estilo") +
      "</div></div>" +
      "<div class=\"metrics\">" +
      "<div class=\"metric\"><b>" + printableEscape(s.bpm || "—") + "</b><span>BPM</span></div>" +
      "<div class=\"metric\"><b>" + printableEscape(chordCount(s)) + "</b><span>Eventos armónicos</span></div>" +
      "<div class=\"metric\"><b>" + printableEscape(parts.length) + "</b><span>Partes</span></div>" +
      "<div class=\"metric\"><b>" + printableEscape(lyricCount(s)) + "</b><span>Letras</span></div>" +
      "<div class=\"metric\"><b>" + printableEscape(soloCount(s)) + "</b><span>Solos</span></div>" +
      "<div class=\"metric\"><b>" + printableEscape(printableDate().replace(/,.*$/, "")) + "</b><span>Versión</span></div>" +
      "</div>" +
      "</header>" +
      "<section><h2>Forma de canción · letra y patrón armónico</h2><div class=\"parts\">" + partsHtml + "</div></section>" +
      "<section><h2>Mapa armónico resumido</h2><div class=\"harmonic\">" + chordsHtml + "</div></section>" +
      "<section><div class=\"instrument-head\"><h2>Mapa instrumental · " + printableEscape(printableInstrumentModeLabel(instrumentMode)) + "</h2><div class=\"instrument-note\">Imprime los voicings visibles del Mapa Maestro: raíz, extensiones, notas y posición por acorde.</div></div><div class=\"instrument-map\">" + instrumentHtml + "</div></section>" +
      "<footer><span>Generado desde Suite Pro · " + printableEscape(printableDate()) + "</span><span>Que todo suene luz.</span></footer>" +
      "</div><script>setTimeout(function(){window.focus();window.print();},450);<\/script></body></html>";
  }

  function exportMasterMapPdf() {
    const s = snapshot();
    const html = masterMapPrintableHtml(s);
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1400,height=900");
    if (!printWindow) {
      downloadText("studio936-mapa-maestro-" + slug(s.title) + ".html", html, "text/html;charset=utf-8");
      toast("El navegador bloqueó la ventana. Bajé un HTML imprimible; ábrelo y guarda como PDF.");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    toast("Mapa Maestro listo para imprimir o guardar como PDF.");
  }


  function renderCommand() {
    const s = snapshot();
    const c = clearContent();
    title(c, "Mapa Maestro", "Vista de arreglista: forma, letra, patrón armónico e instrumento. SYNC actualiza esta lectura con la canción real.");

    const parts = commandParts(s);
    const health = el("div", "s936-sp-health");
    [
      [s.bpm || "—", "BPM"],
      [s.style || "—", "Estilo"],
      [chordCount(s), "Eventos armónicos"],
      [parts.length, "Partes"],
      [lyricCount(s), "Letras"],
      [soloCount(s), "Solos"]
    ].forEach(([num, label]) => {
      const item = el("div", "s936-sp-health-item");
      item.appendChild(el("b", "", String(num)));
      item.appendChild(el("span", "", label));
      health.appendChild(item);
    });
    c.appendChild(health);

    const hero = el("article", "s936-sp-card important command-hero command-hero-v35");
    hero.appendChild(el("h4", "", s.title || "Canción sin título"));

    const meta = el("p", "s936-sp-master-meta", "");
    [
      ["Autor", s.author || "Sin autor"],
      ["Instrumento", s.instrument || "—"],
      ["Tonalidad", s.key || "C"],
      ["BPM", s.bpm || "—"],
      ["Estilo", s.style || "—"],
      ["Sección", s.currentSectionName || s.currentSection || "—"]
    ].forEach(([label, value], index) => {
      if (index) meta.appendChild(document.createTextNode(" · "));
      const strong = el("strong", "", label + ":");
      meta.appendChild(strong);
      meta.appendChild(document.createTextNode(" " + value));
    });
    hero.appendChild(meta);

    hero.appendChild(el("h5", "s936-sp-subhead", "Forma de canción · letra y patrón armónico"));
    renderMasterSongRibbon(hero, s);
    c.appendChild(hero);

    const harmony = el("section", "s936-sp-command-block command-harmony-v35");
    harmony.appendChild(el("h4", "", "Mapa armónico / vista instrumental"));
    renderCommandHarmonicView(harmony, s);
    c.appendChild(harmony);

    const actionsCard = el("article", "s936-sp-card s936-sp-actions-card");
    actionsCard.appendChild(el("h4", "", "Acciones útiles"));
    const box = actions(actionsCard);
    action(box, "Ir a Arrange", () => { state.area = "arrange"; setArea("arrange"); });
    action(box, "Lead Sheet", () => { state.area = "arrange"; state.arrangeTool = "lead"; setArea("arrange"); }, "s936-sp-btn secondary");
    action(box, "Export Center", () => { state.area = "export"; state.exportTool = "center"; setArea("export"); }, "s936-sp-btn secondary");
    action(box, "Exportar Mapa PDF", exportMasterMapPdf, "s936-sp-btn gold");
    c.appendChild(actionsCard);
  }

  function toolNav(tools, active, setter) {
    const nav = el("div", "s936-sp-mini-nav");
    tools.forEach(([key, label]) => {
      const btn = el("button", "s936-sp-mini-tab", label);
      btn.type = "button";
      btn.classList.toggle("active", key === active);
      btn.onclick = () => { setter(key); render(); };
      nav.appendChild(btn);
    });
    return nav;
  }

  function renderCompose() {
    const mod = window.Studio936SuiteProModules?.compose || window.Studio936SuiteProCompose;
    if (mod && typeof mod.render === "function") {
      return mod.render(createModuleContext());
    }

    const tools = [
      ["templates", "Templates"],
      ["inspire", "Inspire"],
      ["transpose", "Transpose"],
      ["chordAI", "Chord AI"],
      ["theory", "Theory"],
      ["scales", "Scales"]
    ];
    const c = clearContent();
    c.appendChild(toolNav(tools, state.composeTool, (v) => state.composeTool = v));
    const map = {
      templates: renderTemplates,
      inspire: renderInspire,
      transpose: renderTranspose,
      chordAI: renderChordAI,
      theory: renderTheory,
      scales: renderScales
    };
    (map[state.composeTool] || renderTemplates)(c);
  }

  function renderTemplates(c) {
    const s = snapshot();
    const key = normalizeKey(s.key || "C");
    title(c, "Templates", "Plantillas de composición. Hoy generan mapa y material listo; aplicar directo a la canción queda como fase segura con bridge de escritura.");

    const grid = el("div", "s936-sp-grid two");
    TEMPLATES.forEach((tpl) => {
      const card = el("article", "s936-sp-card");
      card.appendChild(el("h4", "", tpl.name));
      line(card, "Objetivo", tpl.intent);
      line(card, "Estilo sugerido", tpl.style + " · " + tpl.bpm + " BPM");
      line(card, "Forma", tpl.parts.map((p) => p[1]).join(" / "));
      const prog = tpl.progressions.chorus || tpl.progressions.verse;
      line(card, "Coro en " + key, romanToChords(key, prog).join(" - "));
      const text = templateText(tpl, key);
      const box = actions(card);
      action(box, "Copiar", () => copyText(text, "Plantilla copiada."));
      action(box, "TXT", () => downloadText("studio936-template-" + slug(tpl.name) + ".txt", text), "s936-sp-btn secondary");
      const apply = action(box, "Aplicar a canción", () => {
        toast("Aplicar plantilla requiere bridge de escritura. Lo haremos como siguiente fase segura.");
      }, "s936-sp-btn warn");
      apply.title = "Pendiente: aplicar sin romper estructura/editor.";
      grid.appendChild(card);
    });
    c.appendChild(grid);
  }

  function templateText(tpl, key) {
    const lines = [
      "Studio 936 Template: " + tpl.name,
      "Tonalidad: " + key,
      "Objetivo: " + tpl.intent,
      "Estilo: " + tpl.style + " · " + tpl.bpm + " BPM",
      "Forma: " + tpl.parts.map((p) => p[1]).join(" / ")
    ];
    Object.keys(tpl.progressions).forEach((section) => {
      lines.push(section + ": " + tpl.progressions[section].join(" - ") + " = " + romanToChords(key, tpl.progressions[section]).join(" - "));
    });
    return lines.join("\n");
  }

  function renderInspire(c) {
    const s = snapshot();
    const key = normalizeKey(s.key || "C");
    title(c, "Inspire", "Genera material usable: título, primera línea, hook, progresión y color de producción.");

    const seed = INSPIRE_SEEDS[Math.floor(Date.now() / 1000) % INSPIRE_SEEDS.length];
    const text = [
      "Título: " + seed.title,
      "Tema: " + seed.theme,
      "Primera línea: " + seed.firstLine,
      "Hook de coro: " + seed.chorusHook,
      "Imagen: " + seed.image,
      "Progresión en " + key + ": " + romanToChords(key, seed.progression).join(" - "),
      "Groove: " + seed.groove
    ].join("\n");

    const card = el("article", "s936-sp-card important");
    card.appendChild(el("h4", "", seed.title));
    line(card, "Tema", seed.theme);
    line(card, "Primera línea", seed.firstLine);
    line(card, "Hook", seed.chorusHook);
    line(card, "Progresión", romanToChords(key, seed.progression).join(" - "));
    line(card, "Groove", seed.groove);
    const box = actions(card);
    action(box, "Nueva idea", () => render());
    action(box, "Copiar", () => copyText(text, "Idea copiada."));
    action(box, "Guardar idea", () => { saveIdea(text); toast("Idea guardada en REC Idea / Library."); }, "s936-sp-btn warn");
    c.appendChild(card);
  }

  function renderTranspose(c) {
    const s = snapshot();
    const fromKey = normalizeKey(s.key || "C");
    title(c, "Transpose", "Vista previa de transposición. No altera la canción hasta activar bridge de escritura seguro.");

    const card = el("article", "s936-sp-card");
    line(card, "Tonalidad actual", fromKey);
    const select = el("select", "s936-sp-select");
    ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"].forEach((k) => {
      const opt = el("option", "", k);
      opt.value = k;
      if (k === fromKey) opt.selected = true;
      select.appendChild(opt);
    });
    const preview = el("pre", "s936-sp-preview");
    function update() {
      const toKey = select.value;
      preview.textContent = [
        "From: " + fromKey,
        "To: " + toKey,
        "Escala mayor: " + scale(toKey, "major").join(" "),
        "Acordes diatónicos: " + majorChords(toKey).join(", "),
        "Pop rápido: " + romanToChords(toKey, ["I","V","vi","IV"]).join(" - "),
        "Emocional: " + romanToChords(toKey, ["vi","IV","I","V"]).join(" - ")
      ].join("\n");
    }
    select.onchange = update;
    card.appendChild(select);
    card.appendChild(preview);
    update();
    const box = actions(card);
    action(box, "Copiar", () => copyText(preview.textContent, "Transposición copiada."));
    action(box, "TXT", () => downloadText("studio936-transpose.txt", preview.textContent), "s936-sp-btn secondary");
    c.appendChild(card);
  }

  function renderChordAI(c) {
    const key = normalizeKey(snapshot().key || "C");
    title(c, "Chord AI", "Sugerencias armónicas locales para componer sin bloquearte.");
    const grid = el("div", "s936-sp-grid two");
    [
      ["Verso estable", ["I","V","vi","IV"], "Base clara para contar historia."],
      ["Pre-coro con tensión", ["IV","V","vi","V"], "Empuja hacia el coro."],
      ["Coro luminoso", ["I","V","IV","I"], "Resolución fuerte y recordable."],
      ["Puente emocional", ["vi","IV","I","V"], "Cambio de energía antes del final."]
    ].forEach(([name, prog, use]) => {
      const card = el("article", "s936-sp-card");
      card.appendChild(el("h4", "", name));
      line(card, "Uso", use);
      line(card, "Grados", prog.join(" - "));
      line(card, "En " + key, romanToChords(key, prog).join(" - "));
      const text = name + "\n" + use + "\n" + romanToChords(key, prog).join(" - ");
      action(actions(card), "Copiar", () => copyText(text, "Progresión copiada."));
      grid.appendChild(card);
    });
    c.appendChild(grid);
  }

  function renderTheory(c) {
    const key = normalizeKey(snapshot().key || "C");
    const chords = majorChords(key);
    title(c, "Theory para componer", "No es teoría abstracta: usa funciones armónicas para decidir qué hace cada parte de la canción.");
    const card = el("article", "s936-sp-card");
    card.appendChild(el("h4", "", "Mapa funcional en " + key));
    line(card, "Tónica / descanso", chords[0] + " y " + chords[5] + " · ideal para empezar verso o cerrar coro");
    line(card, "Subdominante / apertura", chords[3] + " y " + chords[1] + " · abre emoción y prepara movimiento");
    line(card, "Dominante / tensión", chords[4] + " y " + chords[6] + " · empuja al siguiente bloque");
    line(card, "Verso", "menos tensión, frases con aire, progresión estable");
    line(card, "Pre-coro", "aumenta tensión con IV/V/vi para levantar al coro");
    line(card, "Coro", "resuelve claro en I o IV, melodía más alta y frase repetible");
    c.appendChild(card);
  }

  function renderScales(c) {
    const key = normalizeKey(snapshot().key || "C");
    title(c, "Scales aplicadas", "Escalas explicadas como herramientas de melodía, bajo y solo.");
    const grid = el("div", "s936-sp-grid");
    [
      ["Mayor", scale(key, "major"), "melodía principal, coro luminoso, arreglos claros"],
      ["Menor natural", scale(key, "naturalMinor"), "verso emocional, puente introspectivo"],
      ["Pentatónica menor", scale(key, "minorPentatonic"), "solo seguro, riff, respuesta de guitarra"],
      ["Pentatónica mayor", scale(key, "majorPentatonic"), "melodías simples y cantables"]
    ].forEach(([name, notes, use]) => {
      const card = el("article", "s936-sp-card");
      card.appendChild(el("h4", "", name));
      const chips = el("div", "s936-sp-chips");
      notes.forEach((n, i) => chips.appendChild(el("span", "s936-sp-chip " + (i === 0 ? "root" : ""), n)));
      card.appendChild(chips);
      line(card, "Uso", use);
      grid.appendChild(card);
    });
    c.appendChild(grid);
  }

  function renderArrange() {
    const c = clearContent();
    const tools = [
      ["lead", "Lead Sheet"],
      ["structure", "Estructura"],
      ["lyrics", "Letra/TAB"],
      ["editor", "Editor"]
    ];
    c.appendChild(toolNav(tools, state.arrangeTool, (v) => state.arrangeTool = v));

    if (state.arrangeTool === "structure") return renderStructure(c);
    if (state.arrangeTool === "lyrics") return renderLyricsPanel(c);
    if (state.arrangeTool === "editor") return renderEditorPanel(c);
    return renderLeadSheet(c);
  }

  function renderLeadSheet(c) {
    title(c, "Lead Sheet real", "Usa el texto completo de la canción desde el motor principal.");
    const text = fullSongText();
    const pre = el("pre", "s936-sp-preview", text);
    c.appendChild(pre);
    const box = actions(c);
    action(box, "Copiar", () => copyText(text, "Lead Sheet copiado."));
    action(box, "TXT", () => downloadText("studio936-lead-sheet.txt", text), "s936-sp-btn secondary");
  }

  function renderStructure(c) {
    const s = snapshot();
    title(c, "Estructura real", "Resumen de la estructura actual. El editor completo sigue en el módulo real.");
    const grid = el("div", "s936-sp-grid");
    const arr = Array.isArray(s.arrangement) ? s.arrangement : [];
    if (!arr.length) {
      const card = el("article", "s936-sp-card");
      card.appendChild(el("h4", "", "Sin arreglo detectado"));
      card.appendChild(el("p", "s936-sp-muted", "Abre Estructura para ordenar partes de la canción."));
      action(actions(card), "Abrir Estructura", () => callBridge("openStructure", () => byId("structureBtn")?.click()));
      grid.appendChild(card);
    } else {
      arr.forEach((part, i) => {
        const card = el("article", "s936-sp-card");
        card.appendChild(el("h4", "", String(i + 1).padStart(2, "0") + " · " + (part.label || part.section || "Parte")));
        line(card, "Sección", part.section || "");
        grid.appendChild(card);
      });
    }
    c.appendChild(grid);
    action(actions(c), "Abrir módulo Estructura", () => callBridge("openStructure"), "s936-sp-btn warn");
  }

  function renderLyricsPanel(c) {
    const s = snapshot();
    title(c, "Letra / TAB", "Suite Pro no duplica el editor de letras: resume estado y abre el módulo real.");
    const card = el("article", "s936-sp-card");
    card.appendChild(el("h4", "", "Estado de letras"));
    line(card, "Secciones con letra", lyricCount(s));
    line(card, "Uso recomendado", "escribe letra por sección y exporta desde Export Center.");
    const box = actions(card);
    action(box, "Abrir Letra/TAB", () => callBridge("openLyrics"), "s936-sp-btn warn");
    c.appendChild(card);
  }

  function renderEditorPanel(c) {
    title(c, "Editor", "El editor real sigue siendo el lugar para escribir acordes, bajo, notas y compases.");
    const card = el("article", "s936-sp-card");
    card.appendChild(el("h4", "", "Acorde actual"));
    line(card, "Nombre", currentChordName());
    line(card, "Notas", currentChordNotes().join(" · "));
    line(card, "Compases", byId("barsInput")?.value || "—");
    line(card, "Qué hacer aquí", "abre el editor real para cambiar notas y compases sin duplicar controles.");
    action(actions(card), "Abrir Editor real", () => callBridge("openEditor"), "s936-sp-btn warn");
    c.appendChild(card);
  }

  function createModuleContext() {
    return {
      version: "3.14",
      state,
      clearContent,
      title,
      el,
      line,
      action,
      actions,
      toolNav,
      byId,
      q,
      qa,
      bridge,
      callBridge,
      snapshot,
      fullSongText,
      projectJson,
      currentChordName,
      currentChordNotes,
      normalizeKey,
      normalizeNoteName,
      chordRootName,
      notesFromChordName,
      notePitchClass,
      majorChords,
      allSectionItems,
      chordCount,
      lyricCount,
      soloCount,
      arrangementCount,
      downloadText,
      setArea,
      render,
      toggleDrums,
      stateDrum: state.drum
    };
  }

  function renderPractice() {
    const mod = window.Studio936SuiteProModules?.practice || window.Studio936SuiteProPractice;
    if (mod && typeof mod.render === "function") {
      return mod.render(createModuleContext());
    }
    return renderPracticeFallback();
  }

  function renderPracticeFallback() {
    const c = clearContent();
    title(c, "Practice / Play Along", "Módulo Practice no cargado. Carga js/suite-pro-practice.js antes de js/suite-pro.js para activar la práctica modular.");

    const grid = el("div", "s936-sp-grid two");
    const now = el("article", "s936-sp-card important");
    now.appendChild(el("h4", "", "Ahora"));
    line(now, "Sección", snapshot().currentSectionName || snapshot().currentSection || "—");
    line(now, "Acorde", currentChordName());
    const chips = el("div", "s936-sp-chips");
    currentChordNotes().forEach((n, i) => chips.appendChild(el("span", "s936-sp-chip " + (i === 0 ? "root" : ""), n)));
    now.appendChild(chips);
    grid.appendChild(now);

    const controls = el("article", "s936-sp-card");
    controls.appendChild(el("h4", "", "Control básico"));
    const box = actions(controls);
    action(box, "Start Groove", () => callBridge("startGroove", () => byId("playBtn")?.click()));
    action(box, "Canción completa", () => callBridge("playFullSong", () => byId("playSongBtn")?.click()), "s936-sp-btn secondary");
    action(box, "Stop", () => callBridge("stopPlayback", () => byId("playBtn")?.click()), "s936-sp-btn danger");
    grid.appendChild(controls);
    c.appendChild(grid);
  }

  function renderStudio() {
    const tools = [
      ["drums", "Drums"],
      ["mixer", "Mixer"],
      ["record", "REC Idea"],
      ["midi", "MIDI IN"]
    ];
    const c = clearContent();
    c.appendChild(toolNav(tools, state.studioTool, (v) => state.studioTool = v));
    if (state.studioTool === "mixer") {
      const mod = window.Studio936SuiteProModules?.mixer || window.Studio936SuiteProMixer;
      if (mod && typeof mod.render === "function") {
        return mod.render(createModuleContext(), c);
      }
      return renderMixer(c);
    }
    if (state.studioTool === "record") {
      const mod = window.Studio936SuiteProModules?.recorder || window.Studio936SuiteProRecorder;
      if (mod && typeof mod.render === "function") {
        return mod.render(createModuleContext(), c);
      }
      return renderRecord(c);
    }
    if (state.studioTool === "midi") {
      const mod = window.Studio936SuiteProModules?.midi || window.Studio936SuiteProMidi;
      if (mod && typeof mod.render === "function") {
        return mod.render(createModuleContext(), c);
      }
      return renderMidi(c);
    }

    const mod = window.Studio936SuiteProModules?.drums || window.Studio936SuiteProDrums;
    if (mod && typeof mod.render === "function") {
      return mod.render(createModuleContext(), c);
    }
    return renderDrums(c);
  }

  function stylePattern() {
    const style = snapshot().style || "pop";
    return DRUM_PATTERNS[style] || DRUM_PATTERNS.pop;
  }

  function renderDrums(c) {
    const s = snapshot();
    const pattern = stylePattern();
    title(c, "Drums", "Batería guía propia de Suite Pro. Puede sonar junto al groove, pero todavía no está sincronizada al motor principal compás por compás.");

    const card = el("article", "s936-sp-card important");
    card.appendChild(el("h4", "", pattern.label));
    line(card, "Estilo actual", s.style || "—");
    line(card, "BPM", s.bpm || "—");
    line(card, "Estado", state.drum.playing ? "Drums guía sonando" : "Drums guía detenido");
    const grid = el("div", "s936-sp-drum-grid");
    for (let i = 0; i < 16; i++) {
      const step = el("div", "s936-sp-step");
      if (pattern.kick.includes(i)) step.classList.add("kick");
      if (pattern.snare.includes(i)) step.classList.add("snare");
      if (pattern.hat.includes(i)) step.classList.add("hat");
      if (state.drum.playing && i === state.drum.step) step.classList.add("play");
      grid.appendChild(step);
    }
    card.appendChild(grid);
    const box = actions(card);
    action(box, state.drum.playing ? "Stop Drums" : "Start Drums", () => toggleDrums());
    action(box, "Groove + Drums", () => { callBridge("startGroove", () => byId("playBtn")?.click()); startDrums(); }, "s936-sp-btn warn");
    action(box, "Stop todo", () => { stopDrums(); callBridge("stopPlayback", () => {}); }, "s936-sp-btn danger");
    c.appendChild(card);
  }

  function renderMixer(c) {
    title(c, "Mixer", "Controla lo que existe hoy de forma real. Más adelante se separan buses: chords, bass, solo, drums y click.");
    const card = el("article", "s936-sp-card");
    card.appendChild(el("h4", "", "Controles disponibles"));
    const groove = byId("grooveVol");
    if (groove) {
      line(card, "Groove volume", groove.value + " / 10");
      const slider = el("input", "s936-sp-range");
      slider.type = "range";
      slider.min = groove.min || "1";
      slider.max = groove.max || "10";
      slider.value = groove.value || "7";
      slider.oninput = () => {
        groove.value = slider.value;
        groove.dispatchEvent(new Event("change", { bubbles:true }));
        renderMixer(c);
      };
      card.appendChild(slider);
    } else {
      line(card, "Groove volume", "no disponible");
    }
    const box = actions(card);
    action(box, "Metrónomo", () => byId("metroBtn")?.click(), "s936-sp-btn secondary");
    action(box, "Solo ON/OFF", () => byId("soloBtn")?.click(), "s936-sp-btn secondary");
    action(box, "Start Groove", () => callBridge("startGroove", () => byId("playBtn")?.click()));
    action(box, "Stop", () => callBridge("stopPlayback", () => {}), "s936-sp-btn danger");
    c.appendChild(card);
  }

  function renderRecord(c) {
    title(c, "REC Idea", "Captura textual rápida. Grabación de micrófono/guitarra queda como módulo futuro s936-recorder.js.");
    const area = el("textarea", "s936-sp-textarea");
    area.placeholder = "Idea de letra, riff, groove, arreglo, producción...";
    const card = el("article", "s936-sp-card");
    card.appendChild(el("h4", "", "Nueva idea"));
    card.appendChild(area);
    const box = actions(card);
    action(box, "Guardar idea", () => {
      if (!area.value.trim()) return toast("Escribe una idea primero.");
      saveIdea(area.value.trim());
      area.value = "";
      toast("Idea guardada.");
    }, "s936-sp-btn warn");
    c.appendChild(card);

    const ideas = loadIdeas();
    if (ideas.length) {
      const list = el("div", "s936-sp-grid");
      ideas.slice(0, 6).forEach((idea) => {
        const item = el("article", "s936-sp-card");
        item.appendChild(el("h4", "", new Date(idea.createdAt).toLocaleString()));
        item.appendChild(el("p", "s936-sp-muted", idea.text));
        action(actions(item), "Copiar", () => copyText(idea.text, "Idea copiada."));
        list.appendChild(item);
      });
      c.appendChild(list);
    }
  }

  function loadIdeas() {
    return safe(() => JSON.parse(localStorage.getItem(IDEA_KEY) || "[]"), []);
  }

  function saveIdea(text) {
    const ideas = loadIdeas();
    ideas.unshift({ text, createdAt: new Date().toISOString(), snapshot: snapshot() });
    localStorage.setItem(IDEA_KEY, JSON.stringify(ideas.slice(0, 50)));
  }

  function renderMidi(c) {
    title(c, "MIDI IN", "Diagnóstico MIDI y exportación. Entrada MIDI real requiere permisos del navegador.");
    const card = el("article", "s936-sp-card");
    card.appendChild(el("h4", "", "MIDI"));
    line(card, "Web MIDI", navigator.requestMIDIAccess ? "disponible" : "no disponible en este navegador");
    const box = actions(card);
    action(box, "Detectar MIDI", async () => {
      if (!navigator.requestMIDIAccess) return toast("Web MIDI no disponible.");
      const access = await navigator.requestMIDIAccess();
      const names = Array.from(access.inputs.values()).map((i) => i.name).join(" · ") || "Sin dispositivos";
      toast("MIDI: " + names);
    });
    action(box, "Exportar MIDI real", () => callBridge("exportMidi"), "s936-sp-btn warn");
    c.appendChild(card);
  }

  function renderExport() {
    const tools = [
      ["center", "Export Center"],
      ["library", "Library"],
      ["share", "Share/PDF"]
    ];
    const c = clearContent();
    c.appendChild(toolNav(tools, state.exportTool, (v) => state.exportTool = v));
    if (state.exportTool === "library") return renderLibrary(c);
    if (state.exportTool === "share") return renderSharePdf(c);
    return renderExportCenter(c);
  }

  function renderExportCenter(c) {
    title(c, "Export Center", "Centro de exportación real. Aquí deben vivir TXT, JSON, MIDI, PDF y Flow cuando movamos la UI con cuidado.");
    const card = el("article", "s936-sp-card important");
    card.appendChild(el("h4", "", "Exportaciones reales"));
    line(card, "TXT", "usa el exportador completo de la app");
    line(card, "JSON", "respaldo editable de proyecto");
    line(card, "MIDI", "exportación musical a DAW");
    const box = actions(card);
    action(box, "Bajar TXT", () => callBridge("exportTxt"), "s936-sp-btn warn");
    action(box, "Bajar JSON", () => callBridge("exportJson"), "s936-sp-btn warn");
    action(box, "Exportar MIDI", () => callBridge("exportMidi"), "s936-sp-btn warn");
    action(box, "Copiar canción completa", () => {
      const api = bridge();
      if (api?.copyFullSongText) return safe(() => api.copyFullSongText(), null);
      return copyText(fullSongText(), "Canción copiada.");
    }, "s936-sp-btn secondary");
    c.appendChild(card);
  }

  function renderSharePdf(c) {
    title(c, "Share / PDF", "Prepara texto completo para compartir o imprimir. PDF real puede venir como módulo futuro.");
    const text = fullSongText();
    const pre = el("pre", "s936-sp-preview", text);
    c.appendChild(pre);
    const box = actions(c);
    action(box, "Copiar", () => copyText(text, "Texto copiado."));
    action(box, "TXT", () => downloadText("studio936-song.txt", text), "s936-sp-btn secondary");
    action(box, "Imprimir / PDF", () => window.print(), "s936-sp-btn warn");
  }

  function renderLibrary(c) {
    title(c, "Library", "Guarda snapshots reales de la canción e ideas REC vinculadas a canción/sección.");
    const box = actions(c);
    action(box, "Guardar snapshot real", () => {
      const items = loadLibrary();
      const s = snapshot();
      items.unshift({
        id: "snap-" + Date.now(),
        kind: "snapshot",
        title: s.title || "Sin título",
        author: s.author || "",
        bpm: s.bpm || "",
        style: s.style || "",
        createdAt: new Date().toISOString(),
        snapshot: s,
        fullText: fullSongText(),
        projectJson: projectJson()
      });
      saveLibrary(items.slice(0, 80));
      renderLibrary(c);
      toast("Snapshot guardado.");
    }, "s936-sp-btn warn");

    const items = loadLibrary();
    if (!items.length) {
      c.appendChild(el("p", "s936-sp-muted", "No hay snapshots ni ideas todavía."));
      return;
    }
    const grid = el("div", "s936-sp-grid");
    items.forEach((item) => {
      const card = el("article", "s936-sp-card");
      const isRecIdea = item.kind === "recIdea";
      card.appendChild(el("h4", "", item.title || (isRecIdea ? "REC Idea" : "Snapshot")));
      line(card, "Tipo", isRecIdea ? "REC Idea" : "Snapshot canción");
      line(card, "Fecha", new Date(item.createdAt).toLocaleString());
      if (isRecIdea) {
        line(card, "Canción", item.recIdea?.songTitle || "—");
        line(card, "Sección", item.recIdea?.sectionLabel || "—");
        line(card, "Tags", item.recIdea?.tags || "—");
        if (item.recIdea?.audioId) line(card, "Audio", "Disponible");
        const preview = el("div", "s936-sp-muted");
        preview.style.marginTop = "8px";
        preview.textContent = (item.recIdea?.text || "").slice(0, 180) || "Idea de audio sin texto.";
        card.appendChild(preview);
      } else {
        line(card, "BPM", item.bpm || "—");
        line(card, "Estilo", item.style || "—");
      }

      const act = actions(card);
      if (!isRecIdea) {
        action(act, "Cargar", () => loadSnapshotIntoApp(item), "s936-sp-btn warn");
        action(act, "TXT", () => downloadText(slug(item.title) + ".txt", item.fullText || ""), "s936-sp-btn secondary");
        action(act, "JSON", () => downloadText(slug(item.title) + ".json", item.projectJson || "{}", "application/json;charset=utf-8"), "s936-sp-btn secondary");
      } else {
        action(act, "TXT", () => downloadText(slug(item.recIdea?.title || item.title || "rec-idea") + ".txt", item.fullText || recIdeaLibraryText(item)), "s936-sp-btn secondary");
        if (item.recIdea?.audioId) {
          action(act, "Bajar audio", () => downloadLibraryRecAudio(item), "s936-sp-btn warn");
        }
      }
      action(act, "Borrar", () => {
        saveLibrary(loadLibrary().filter((x) => x.id !== item.id));
        renderLibrary(c);
      }, "s936-sp-btn danger");
      grid.appendChild(card);
    });
    c.appendChild(grid);
  }

  function recIdeaLibraryText(item) {
    const idea = item.recIdea || {};
    return [
      "Studio 936 · REC Idea",
      "Título: " + (idea.title || item.title || ""),
      "Tipo: " + (idea.type || ""),
      "Canción: " + (idea.songTitle || ""),
      "Sección: " + (idea.sectionLabel || ""),
      "Tags: " + (idea.tags || ""),
      "Fecha: " + new Date(item.createdAt || Date.now()).toLocaleString(),
      "",
      idea.text || ""
    ].join("\n");
  }

  function downloadLibraryRecAudio(item) {
    const api = window.Studio936SuiteProRecorder;
    const audioId = item.recIdea?.audioId;
    if (api && typeof api.downloadAudioById === "function" && audioId) {
      return api.downloadAudioById(audioId, item.recIdea?.title || item.title || "rec-idea");
    }
    toast("Audio no disponible. Abre REC Idea para descargarlo desde el banco local.");
    return false;
  }

  function loadLibrary() {
    return safe(() => JSON.parse(localStorage.getItem(LIBRARY_KEY) || "[]"), []);
  }

  function saveLibrary(items) {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(items));
  }

  function loadSnapshotIntoApp(item) {
    if (!item.projectJson) return toast("Este snapshot no tiene JSON de proyecto.");
    const ok = window.confirm("Cargar este snapshot reemplazará la canción actual en este navegador y recargará la app. ¿Continuar?");
    if (!ok) return;
    localStorage.setItem(APP_STORAGE_KEY, item.projectJson);
    window.location.reload();
  }

  function startDrums() {
    if (state.drum.playing) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return toast("AudioContext no disponible.");
    if (!state.drum.ctx) state.drum.ctx = new AC();
    state.drum.ctx.resume?.();
    state.drum.playing = true;
    state.drum.step = 0;
    scheduleDrumLoop();
    toast("Drums guía activado.");
  }

  function stopDrums() {
    state.drum.playing = false;
    if (state.drum.timer) clearTimeout(state.drum.timer);
    state.drum.timer = null;
    render();
  }

  function toggleDrums() {
    if (state.drum.playing) stopDrums(); else startDrums();
  }

  function scheduleDrumLoop() {
    if (!state.drum.playing) return;
    const s = snapshot();
    const bpm = Math.max(40, Math.min(220, Number(s.bpm) || 95));
    const stepMs = (60 / bpm / 4) * 1000;
    playDrumStep(state.drum.step);
    state.drum.step = (state.drum.step + 1) % 16;
    renderIfStudioDrums();
    state.drum.timer = setTimeout(scheduleDrumLoop, stepMs);
  }

  function renderIfStudioDrums() {
    if (state.open && state.area === "studio" && state.studioTool === "drums") {
      const c = content();
      if (c) renderStudio();
    }
  }

  function playDrumStep(step) {
    const pattern = stylePattern();
    if (pattern.kick.includes(step)) kick();
    if (pattern.snare.includes(step)) snare();
    if (pattern.hat.includes(step)) hat();
  }

  function kick() {
    const ctx = state.drum.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.13);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.7 * state.drum.volume, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  function snare() {
    const ctx = state.drum.ctx;
    const t = ctx.currentTime;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1800, t);
    filter.Q.setValueAtTime(0.7, t);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.45 * state.drum.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start(t);
    noise.stop(t + 0.13);
  }

  function hat() {
    const ctx = state.drum.ctx;
    const t = ctx.currentTime;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(6000, t);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12 * state.drum.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start(t);
    noise.stop(t + 0.05);
  }

  // Cambio 109: el selector de instrumento (#instrumentSelect) es COMPARTIDO
  // entre Main y el Chart — si cambias de instrumento mientras editas en el
  // Chart, ese cambio se queda pegado en Main incluso después de cerrar
  // Suite Pro (porque es el mismo control, no hay uno "del Chart" aparte).
  // Se captura el instrumento activo al abrir, y se restaura al cerrar —
  // así "entrar a editar" nunca deja un efecto secundario permanente en Main.
  let _instrumentBeforeSuitePro = null;

  function open() {
    const panel = ensurePanel();
    if (!state.open) {
      try { _instrumentBeforeSuitePro = document.getElementById("instrumentSelect")?.value || null; } catch(_) { _instrumentBeforeSuitePro = null; }
    }
    state.open = true;
    panel.classList.add("is-open");
    // Cambio 361: por defecto arranca colapsado (solo la barra de íconos
    // visible) — se muestra completo únicamente con el hover sobre la
    // barra o sobre el propio panel (showDockOnHover).
    panel.classList.add("s936-dock-collapsed");
    // Cambio 371: defensivo — si el atributo quedó pegado en "on" de una
    // apertura/cierre anterior, al reabrir (que siempre arranca
    // colapsado) hay que limpiarlo, si no el Chart nace corrido.
    clearChartDockFlex();
    render();
    // Cambio 356: mostrar la barra de íconos junto con el panel — es
    // aditiva, no reemplaza las pestañas COMPOSE/Mapa Maestro de arriba
    // (Val pidió explícitamente NO desactivar lo anterior todavía, tener
    // "doble barra" mientras se decide qué hacer con la principal).
    ensureHoverRail();
    const rail = document.getElementById("s936HoverRail");
    if (rail) rail.style.display = "flex";
    return panel;
  }

  // Cambio 371: helper único para sacarle al Chart el atributo que lo
  // corre a la derecha. Antes esto SOLO pasaba dentro de
  // scheduleHideDockOnHover() (el camino "sacar el mouse despacito").
  // Si el panel se cerraba por cualquier otro camino (ej. close() de
  // abajo, disparado por un botón), el atributo se quedaba pegado en
  // "on" para siempre y el Chart quedaba corrido aunque el panel ya no
  // se viera — este era el bug real que reportó Val (captura con la
  // barra colapsada pero el Chart lejos, como si el panel siguiera
  // expandido). Ahora TODOS los caminos que puedan ocultar el panel
  // pasan por acá.
  function clearChartDockFlex() {
    const chartPanel = document.getElementById("s936-chart-view-panel") || document.querySelector(".s936-chart-main-panel");
    if (chartPanel) chartPanel.removeAttribute("data-s936-dock-flex");
  }

  function close() {
    const panel = byId(PANEL_ID);
    state.open = false;
    if (panel) panel.classList.remove("is-open");
    // Cambio 371: ver comentario en clearChartDockFlex() — sin esta
    // línea, cerrar Suite Pro con el mouse todavía sobre el panel
    // dejaba el Chart corrido para siempre.
    clearChartDockFlex();
    // v0.8.5: desmontar chart al cerrar Suite Pro
    try { window.Studio936SuiteProChart?.unmountFromRightPanel?.(); } catch(_) {}
    // Cambio 109: restaurar el instrumento que estaba activo antes de entrar.
    if (_instrumentBeforeSuitePro) {
      try { window.Studio936AppBridge?.setInstrument?.(_instrumentBeforeSuitePro); } catch(_) {}
      _instrumentBeforeSuitePro = null;
    }
    // Cambio 356: ocultar la barra de íconos junto con el panel.
    const rail = document.getElementById("s936HoverRail");
    if (rail) rail.style.display = "none";
    // Cambio 361: limpiar cualquier temporizador de ocultar pendiente —
    // si no, podría dispararse después de cerrar y afectar la próxima
    // apertura.
    if (_hoverHideTimer) { clearTimeout(_hoverHideTimer); _hoverHideTimer = null; }
  }

  // Cambio 356: barra de íconos con hover-expandir — Val la pidió como
  // pieza ADICIONAL, coexistiendo con las pestañas COMPOSE/Mapa Maestro
  // actuales (no las reemplaza todavía). Reutiliza setArea(), la misma
  // función que ya usan esas pestañas — así, elegir "Compose" aquí hace
  // exactamente lo mismo que tocar la pestaña de arriba, sin lógica
  // duplicada. Vive como elemento propio en <body> (no dentro del grid
  // del panel) para no tocar en absoluto el layout existente.
  //
  // Cambio 361: CORRECCIÓN — antes, al pasar el mouse, solo la barrita se
  // ensanchaba un poco y quedaba ENCIMA del panel grande (2 piezas
  // compitiendo por espacio). Val aclaró que quería lo contrario: con el
  // mouse afuera, se ve SOLO el ícono (todo lo demás oculto, dejando ver
  // la canción completa detrás); al pasar el mouse sobre el ícono, se
  // muestra el Docker COMPLETO (panel entero, no solo la barra). Se usa
  // un pequeño retraso (250ms) al salir del hover para que mover el mouse
  // de la barra hacia el panel grande no lo cierre de golpe.
  let _hoverHideTimer = null;

  function showDockOnHover() {
    if (_hoverHideTimer) { clearTimeout(_hoverHideTimer); _hoverHideTimer = null; }
    const panel = ensurePanel();
    panel.classList.remove("s936-dock-collapsed");
    // Cambio 370: correr el Chart hacia la derecha para dejarle espacio
    // real al Docker — completa la pieza que el Cambio 40 dejó a medias
    // (la regla CSS ya existía, pero nadie la activaba nunca).
    const chartPanel = document.getElementById("s936-chart-view-panel") || document.querySelector(".s936-chart-main-panel");
    if (chartPanel) chartPanel.setAttribute("data-s936-dock-flex", "on");
  }

  function scheduleHideDockOnHover() {
    if (_hoverHideTimer) clearTimeout(_hoverHideTimer);
    _hoverHideTimer = setTimeout(() => {
      const panel = byId(PANEL_ID);
      if (panel) panel.classList.add("s936-dock-collapsed");
      // Cambio 370/371: correr el Chart de vuelta hacia la izquierda al
      // ocultarse el Docker, para ocupar el espacio que queda libre.
      clearChartDockFlex();
      _hoverHideTimer = null;
    }, 250);
  }

  function ensureHoverRail() {
    let rail = document.getElementById("s936HoverRail");
    if (rail) return rail;

    rail = document.createElement("div");
    rail.id = "s936HoverRail";
    rail.style.cssText = `
      position: fixed;
      left: var(--s936-rail-left);
      top: 108px;
      width: var(--s936-rail-w);
      z-index: 10062;
      display: none;
      flex-direction: column;
      align-items: stretch;
      gap: 6px;
      padding: 10px 0;
      background: linear-gradient(180deg, rgba(13,18,28,.98), rgba(5,7,12,.97));
      border: 1px solid rgba(0,255,204,.34);
      border-radius: 14px;
      box-shadow: 0 20px 60px rgba(0,0,0,.5);
      overflow: hidden;
    `;

    const ITEMS = [
      { area: "compose", label: "Compose", icon: "🎵" },
      { area: "studio", label: "Studio", icon: "🎚" },
    ];

    ITEMS.forEach((it) => {
      const b = document.createElement("button");
      b.type = "button";
      // Cambio 363: !important en border/background/box-shadow — la barra
      // vive fuera de #s936SuitePro (está pegada directo a <body>), así
      // que no hereda los resets de botón de ese panel; algo más (estilo
      // por defecto del navegador o del sitio) le estaba poniendo un
      // marco negro visible a cada ícono, dándole aspecto de "cajita"
      // separada en vez de verse integrado a la barra.
      b.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        width: 100%;
        padding: 10px 8px;
        border: none !important;
        outline: none !important;
        background: transparent !important;
        box-shadow: none !important;
        border-radius: 10px;
        color: #e6edf3;
        cursor: pointer;
        white-space: nowrap;
        overflow: visible;
        font-size: .68rem;
        font-weight: 800;
      `;
      const iconSpan = el("span", "", it.icon);
      iconSpan.style.cssText = "font-size:20px;flex-shrink:0;line-height:1;";
      b.appendChild(iconSpan);
      b.title = it.label; // Cambio 361: el nombre queda como tooltip — ya no hay texto que se expande al lado, el Docker completo hace las veces de "expandir".
      b.onmouseenter = () => { b.style.setProperty("background", "rgba(0,255,204,.14)", "important"); };
      b.onmouseleave = () => { b.style.setProperty("background", "transparent", "important"); };
      b.onclick = () => {
        setArea(it.area);
        open();
        showDockOnHover();
      };
      rail.appendChild(b);
    });

    // Cambio 361: hover de la BARRA muestra el Docker completo.
    rail.addEventListener("mouseenter", showDockOnHover);
    rail.addEventListener("mouseleave", scheduleHideDockOnHover);

    document.body.appendChild(rail);
    return rail;
  }

  function toggle() {
    const panel = ensurePanel();
    if (panel.classList.contains("is-open")) close(); else open();
    return panel;
  }

  // Cambio 86: permite que OTROS módulos (ej. el dashboard de la consola de
  // Zoom sección, en structure.js) abran directamente una herramienta real
  // de Studio — por ahora usada para "MIDI / Teclado", que ya existe de
  // verdad en js/suite-pro-midi.js (Studio > MIDI IN). No inventa audio/MIDI
  // nuevo: solo navega hacia el módulo real que ya funciona.
  function openStudioTool(toolName) {
    state.area = "studio";
    if (toolName) state.studioTool = toolName;
    try { localStorage.setItem("s936_suite_area_v3", "studio"); } catch(_) {}
    open();
  }

  // Cambio 112: abre Suite Pro directo en un área específica (compose,
  // studio, command) — usada por los íconos nuevos del Main que
  // reemplazan al botón genérico "Suite Pro".
  function openArea(area) {
    state.area = area;
    try { localStorage.setItem("s936_suite_area_v3", area); } catch(_) {}
    open();
  }

  window.Studio936SuitePro = {
    version: "professional-v3.14-cambio-361-dock-hover-completo",
    open,
    close,
    toggle,
    openStudioTool,
    openArea,
    ensurePanel
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensurePanel);
  } else {
    ensurePanel();
  }
})();
