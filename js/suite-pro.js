// Studio 936 Composer - Suite Pro modular panel
// New isolated module. It does not use #v18Suite or v18 legacy classes.
(function () {
  "use strict";

  const PANEL_ID = "s936SuitePro";
  const STYLE_ID = "s936SuiteProStyles";
  const STORAGE_KEY = "studio936_suite_pro_library_v1";

  const NOTES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const NOTES_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  const NOTE_INDEX = { C:0, "C#":1, Db:1, D:2, "D#":3, Eb:3, E:4, F:5, "F#":6, Gb:6, G:7, "G#":8, Ab:8, A:9, "A#":10, Bb:10, B:11 };
  const FLAT_KEYS = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb"]);
  const INTERVALS = {
    major: [0,2,4,5,7,9,11],
    naturalMinor: [0,2,3,5,7,8,10],
    minorPentatonic: [0,3,5,7,10]
  };
  const ROMAN_INDEX = { I:0, ii:1, iii:2, IV:3, V:4, vi:5, vii:6 };

  const TOOLS = [
    ["library", "Library"],
    ["templates", "Templates"],
    ["transpose", "Transpose"],
    ["scales", "Scales"],
    ["chordAI", "Chord AI"],
    ["drums", "Drums"],
    ["mixer", "Mixer"],
    ["record", "REC Idea"],
    ["midiIn", "MIDI IN"],
    ["pdf", "PDF"],
    ["lead", "Lead Sheet"],
    ["practice", "Practice"],
    ["share", "Share"],
    ["inspire", "Inspire"],
    ["theory", "Theory"]
  ];

  const TEMPLATES = [
    { name:"Pop", mood:"Claro, directo, memorable.", parts:["Intro","Verse 1","Pre-Chorus","Chorus","Verse 2","Pre-Chorus","Chorus","Bridge","Final Chorus","Outro"], progression:["I","V","vi","IV"] },
    { name:"Worship", mood:"Crecimiento emocional y coro expansivo.", parts:["Intro","Verse 1","Verse 2","Pre-Chorus","Chorus","Interlude","Bridge","Final Chorus","Outro"], progression:["I","V","vi","IV"] },
    { name:"Balada", mood:"Íntima, vocal, lírica.", parts:["Intro","Verse 1","Chorus","Verse 2","Chorus","Solo","Bridge","Final Chorus","Outro"], progression:["vi","IV","I","V"] },
    { name:"Rock", mood:"Energía, riff, coro fuerte.", parts:["Intro Riff","Verse 1","Chorus","Riff","Verse 2","Chorus","Solo","Final Chorus","Outro"], progression:["I","IV","V","IV"] },
    { name:"Urbano", mood:"Hook rápido y espacio para flow.", parts:["Intro","Hook","Verse 1","Hook","Verse 2","Bridge","Final Hook","Outro"], progression:["vi","IV","I","V"] },
    { name:"Jazz básico", mood:"Color armónico y forma flexible.", parts:["Intro","Tema A","Tema A","Tema B","Solo","Tema A final","Coda"], progression:["ii","V","I","vi"] }
  ];

  function bridge() {
    return window.Studio936AppBridge || null;
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function normalizeKey(value) {
    const raw = String(value || "").trim();
    const match = raw.match(/^([A-Ga-g])([#b]?)/);
    if (!match) return "C";
    return match[1].toUpperCase() + (match[2] || "");
  }

  function snapshot() {
    const api = bridge();
    if (api && typeof api.getSongSnapshot === "function") {
      try { return api.getSongSnapshot(); } catch (error) { console.warn(error); }
    }
    return {
      title: byId("songTitle")?.value || "Untitled Song",
      author: byId("songAuthor")?.value || "Studio 936",
      bpm: byId("bpmDisplay")?.textContent || "",
      style: byId("styleSelect")?.value || "",
      instrument: byId("instrumentSelect")?.value || "",
      key: byId("soloKey")?.value || "C",
      currentSection: byId("sectionSelect")?.value || "",
      chordLabel: byId("chordLabel")?.textContent || "",
      arrangement: [],
      sections: {},
      lyrics: {},
      project: {}
    };
  }

  function fullSongText() {
    const api = bridge();
    if (api && typeof api.getFullSongText === "function") {
      try { return api.getFullSongText(); } catch (error) { console.warn(error); }
    }
    const s = snapshot();
    return [
      "Studio 936 Composer",
      "Title: " + (s.title || ""),
      "Author: " + (s.author || ""),
      "Key: " + (s.key || "C"),
      "BPM: " + (s.bpm || ""),
      "Style: " + (s.style || "")
    ].join("\n");
  }

  function preferFlats(key) {
    return String(key || "").includes("b") || FLAT_KEYS.has(key);
  }

  function scale(key, type) {
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

  function installStyles() {
    if (byId(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#${PANEL_ID} {
  position: fixed;
  inset: 72px 16px 16px 16px;
  z-index: 10050;
  display: none;
  color: #f6fbff;
  background: linear-gradient(180deg, #101827, #070910);
  border: 1px solid rgba(0,255,204,.38);
  border-radius: 22px;
  box-shadow: 0 30px 100px rgba(0,0,0,.84);
  overflow: hidden;
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
#${PANEL_ID}.is-open { display: block; }
#${PANEL_ID} * { box-sizing: border-box; }
#${PANEL_ID} .s936-suite-pro-shell {
  height: 100%;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
}
#${PANEL_ID} .s936-suite-pro-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 22px;
  border-bottom: 1px solid rgba(255,255,255,.12);
}
#${PANEL_ID} .s936-suite-pro-title {
  margin: 0;
  font-size: 1.32rem;
  line-height: 1;
  font-weight: 950;
  letter-spacing: -.02em;
}
#${PANEL_ID} .s936-suite-pro-sub {
  margin: 6px 0 0;
  color: rgba(255,255,255,.58);
  font-size: .78rem;
}
#${PANEL_ID} .s936-suite-pro-close {
  border: 1px solid rgba(255,216,77,.88);
  border-radius: 999px;
  background: rgba(255,216,77,.1);
  color: #ffe066;
  padding: 10px 18px;
  min-width: 96px;
  font-weight: 950;
  text-transform: uppercase;
  cursor: pointer;
}
#${PANEL_ID} .s936-suite-pro-body {
  min-height: 0;
  display: grid;
  grid-template-columns: 230px minmax(0, 1fr);
  gap: 16px;
  padding: 16px;
}
#${PANEL_ID} .s936-suite-pro-tools {
  min-height: 0;
  overflow: auto;
  display: grid;
  align-content: start;
  gap: 8px;
  padding-right: 4px;
}
#${PANEL_ID} .s936-suite-pro-tool {
  width: 100%;
  min-height: 39px;
  border: 1px solid rgba(255,255,255,.18);
  border-radius: 12px;
  background: rgba(255,255,255,.07);
  color: #fff;
  padding: 10px 12px;
  text-align: left;
  font-size: .72rem;
  font-weight: 900;
  text-transform: uppercase;
  cursor: pointer;
}
#${PANEL_ID} .s936-suite-pro-tool:hover,
#${PANEL_ID} .s936-suite-pro-tool.is-active {
  border-color: rgba(0,255,204,.88);
  background: rgba(0,255,204,.12);
  color: #00ffcc;
}
#${PANEL_ID} .s936-suite-pro-content {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: 18px;
  border: 1px solid rgba(255,255,255,.13);
  border-radius: 18px;
  background: rgba(255,255,255,.045);
}
#${PANEL_ID} h3 {
  margin: 0 0 14px;
  color: #8affff;
  font-size: 1.05rem;
  text-transform: uppercase;
  letter-spacing: .03em;
}
#${PANEL_ID} h4 {
  margin: 0 0 8px;
  font-size: .93rem;
  text-transform: uppercase;
}
#${PANEL_ID} p { line-height: 1.5; }
#${PANEL_ID} .muted { color: rgba(255,255,255,.68); }
#${PANEL_ID} .line { margin: 8px 0; line-height: 1.45; }
#${PANEL_ID} .line strong { color: #bfffee; }
#${PANEL_ID} .grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 12px;
}
#${PANEL_ID} .card {
  border: 1px solid rgba(255,255,255,.14);
  border-radius: 16px;
  background: rgba(0,0,0,.18);
  padding: 14px;
}
#${PANEL_ID} .actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
#${PANEL_ID} .action {
  border: 1px solid rgba(255,216,77,.75);
  border-radius: 999px;
  background: rgba(255,216,77,.1);
  color: #ffe066;
  padding: 8px 12px;
  font-weight: 900;
  cursor: pointer;
}
#${PANEL_ID} .action.primary {
  border-color: rgba(0,255,204,.8);
  background: rgba(0,255,204,.13);
  color: #8affff;
}
#${PANEL_ID} .select,
#${PANEL_ID} .textarea {
  width: 100%;
  border: 1px solid rgba(255,255,255,.18);
  border-radius: 12px;
  background: rgba(0,0,0,.35);
  color: #fff;
  padding: 10px;
  margin: 6px 0 12px;
  font: inherit;
}
#${PANEL_ID} .textarea { min-height: 110px; resize: vertical; }
#${PANEL_ID} .preview {
  white-space: pre-wrap;
  background: rgba(0,0,0,.25);
  border: 1px solid rgba(255,255,255,.13);
  border-radius: 14px;
  padding: 12px;
  margin-top: 10px;
  line-height: 1.5;
}
#${PANEL_ID} .dashboard {
  display: grid;
  grid-template-columns: minmax(260px, .8fr) minmax(320px, 1.2fr);
  gap: 14px;
}
@media (max-width: 900px) {
  #${PANEL_ID} { inset: 8px; }
  #${PANEL_ID} .s936-suite-pro-body {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
  }
  #${PANEL_ID} .s936-suite-pro-tools {
    grid-template-columns: repeat(2, minmax(0,1fr));
    max-height: 220px;
  }
  #${PANEL_ID} .dashboard { grid-template-columns: 1fr; }
}
`;
    document.head.appendChild(style);
  }

  function ensurePanel() {
    installStyles();
    let panel = byId(PANEL_ID);
    if (!panel) {
      panel = document.createElement("section");
      panel.id = PANEL_ID;
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-label", "Suite Pro");
      document.body.appendChild(panel);
    }
    if (panel.dataset.ready !== "1") buildPanel(panel);
    return panel;
  }

  function buildPanel(panel) {
    panel.textContent = "";
    panel.className = "s936-suite-pro";
    panel.dataset.ready = "1";

    const shell = el("div", "s936-suite-pro-shell");
    const header = el("header", "s936-suite-pro-header");
    const titleWrap = el("div");
    const title = el("h2", "s936-suite-pro-title", "Suite Pro");
    const subtitle = el("p", "s936-suite-pro-sub", "Cabina profesional de composición Studio 936");
    const closeButton = el("button", "s936-suite-pro-close", "CERRAR");
    closeButton.type = "button";
    closeButton.onclick = close;

    titleWrap.appendChild(title);
    titleWrap.appendChild(subtitle);
    header.appendChild(titleWrap);
    header.appendChild(closeButton);

    const body = el("div", "s936-suite-pro-body");
    const tools = el("nav", "s936-suite-pro-tools");
    TOOLS.forEach(([key, label]) => {
      const button = el("button", "s936-suite-pro-tool", label);
      button.type = "button";
      button.dataset.tool = key;
      button.onclick = () => renderTool(key);
      tools.appendChild(button);
    });

    const content = el("section", "s936-suite-pro-content");
    content.id = "s936SuiteProContent";

    body.appendChild(tools);
    body.appendChild(content);
    shell.appendChild(header);
    shell.appendChild(body);
    panel.appendChild(shell);

    renderDashboard();
  }

  function content(activeKey) {
    const panel = ensurePanel();
    const node = panel.querySelector("#s936SuiteProContent");
    node.textContent = "";
    panel.querySelectorAll(".s936-suite-pro-tool").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.tool === activeKey);
    });
    return node;
  }

  function line(parent, label, value) {
    const p = el("p", "line");
    p.appendChild(el("strong", "", label));
    p.appendChild(document.createTextNode(" " + (value ?? "")));
    parent.appendChild(p);
  }

  function actions(parent, items) {
    const row = el("div", "actions");
    items.forEach((item) => {
      const button = el("button", "action" + (item.primary ? " primary" : ""), item.label);
      button.type = "button";
      button.onclick = item.onClick;
      row.appendChild(button);
    });
    parent.appendChild(row);
  }

  function status(parent, msg) {
    parent.appendChild(el("p", "muted", msg));
  }

  function download(filename, text, type = "text/plain;charset=utf-8") {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function copy(text, parent) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API no disponible");
      await navigator.clipboard.writeText(text);
      status(parent, "Copiado al portapapeles.");
    } catch (error) {
      status(parent, "No se pudo copiar automáticamente. Usa Descargar TXT.");
    }
  }

  function callBridge(method, parent, fallbackMessage) {
    const api = bridge();
    if (!api || typeof api[method] !== "function") {
      status(parent, fallbackMessage || "Bridge no disponible todavía.");
      return false;
    }
    try {
      api[method]();
      return true;
    } catch (error) {
      console.warn(error);
      status(parent, "No se pudo ejecutar la acción. Revisa consola.");
      return false;
    }
  }

  function renderDashboard() {
    const s = snapshot();
    const c = content("");
    c.appendChild(el("h3", "", "Dashboard / Cabina"));

    const wrap = el("div", "dashboard");
    const info = el("article", "card");
    info.appendChild(el("h4", "", "Canción actual"));
    line(info, "Título:", s.title || "-");
    line(info, "Autor:", s.author || "-");
    line(info, "BPM:", s.bpm || "-");
    line(info, "Estilo:", s.style || "-");
    line(info, "Instrumento:", s.instrument || "-");
    line(info, "Tonalidad:", s.key || "C");
    line(info, "Sección:", s.currentSectionName || s.currentSection || "-");

    const quick = el("article", "card");
    quick.appendChild(el("h4", "", "Acciones rápidas"));
    quick.appendChild(el("p", "muted", "Estas acciones llaman a la app principal. Suite Pro no duplica el motor musical."));
    actions(quick, [
      { label:"Start Groove", primary:true, onClick:()=>callBridge("startGroove", quick) },
      { label:"Escuchar canción", primary:true, onClick:()=>callBridge("playFullSong", quick) },
      { label:"Stop", onClick:()=>callBridge("stopPlayback", quick) },
      { label:"Editor", onClick:()=>callBridge("openEditor", quick) },
      { label:"Estructura", onClick:()=>callBridge("openStructure", quick) },
      { label:"Letra/TAB", onClick:()=>callBridge("openLyrics", quick) },
      { label:"Bajar TXT real", onClick:()=>callBridge("exportTxt", quick) },
      { label:"Bajar JSON real", onClick:()=>callBridge("exportJson", quick) },
      { label:"Exportar MIDI real", onClick:()=>callBridge("exportMidi", quick) }
    ]);

    wrap.appendChild(info);
    wrap.appendChild(quick);
    c.appendChild(wrap);
  }

  function templateText(template, key) {
    return [
      "Studio 936 Template: " + template.name,
      "Tonalidad: " + key,
      "Uso: " + template.mood,
      "Forma: " + template.parts.join(" / "),
      "Progresión: " + template.progression.join(" - "),
      "Acordes: " + romanToChords(key, template.progression).join(" - ")
    ].join("\n");
  }

  function renderTemplates() {
    const s = snapshot();
    const key = normalizeKey(s.key || "C");
    const c = content("templates");
    c.appendChild(el("h3", "", "Templates / Plantillas"));
    c.appendChild(el("p", "muted", "Plantillas rápidas para iniciar una canción. Seguro: no modifica la estructura real todavía."));

    const grid = el("div", "grid");
    TEMPLATES.forEach((template) => {
      const text = templateText(template, key);
      const card = el("article", "card");
      card.appendChild(el("h4", "", template.name));
      line(card, "Uso:", template.mood);
      line(card, "Forma:", template.parts.join(" / "));
      line(card, "Progresión:", template.progression.join(" - "));
      line(card, "En " + key + ":", romanToChords(key, template.progression).join(" - "));
      actions(card, [
        { label:"Copiar", onClick:()=>copy(text, card) },
        { label:"Descargar TXT", onClick:()=>download("studio936-template-" + template.name.toLowerCase().replace(/\s+/g, "-") + ".txt", text) }
      ]);
      grid.appendChild(card);
    });
    c.appendChild(grid);
  }

  function renderTranspose() {
    const s = snapshot();
    const fromKey = normalizeKey(s.key || "C");
    const c = content("transpose");
    c.appendChild(el("h3", "", "Transpose / Transponer"));
    line(c, "Tonalidad actual:", fromKey);

    const select = el("select", "select");
    ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"].forEach((key) => {
      const option = el("option", "", key);
      option.value = key;
      if (key === fromKey) option.selected = true;
      select.appendChild(option);
    });

    const preview = el("pre", "preview");
    function update() {
      const toKey = select.value;
      preview.textContent = [
        "Transposition Preview",
        "From: " + fromKey,
        "To: " + toKey,
        "Major scale: " + scale(toKey, "major").join(" "),
        "Diatonic chords: " + majorChords(toKey).join(", "),
        "I-V-vi-IV: " + romanToChords(toKey, ["I","V","vi","IV"]).join(" - ")
      ].join("\n");
    }
    select.onchange = update;
    c.appendChild(select);
    c.appendChild(preview);
    update();
    actions(c, [
      { label:"Copiar preview", onClick:()=>copy(preview.textContent, c) },
      { label:"Descargar TXT", onClick:()=>download("studio936-transpose.txt", preview.textContent) }
    ]);
  }

  function renderScales() {
    const key = normalizeKey(snapshot().key || "C");
    const c = content("scales");
    c.appendChild(el("h3", "", "Scales / Escalas"));
    line(c, "Tonalidad:", key);
    line(c, "Mayor:", scale(key, "major").join(" "));
    line(c, "Menor natural:", scale(key, "naturalMinor").join(" "));
    line(c, "Pentatónica menor:", scale(key, "minorPentatonic").join(" "));
    line(c, "Uso:", "melodías, bajos, solos, arreglos y respuestas instrumentales.");
  }

  function renderTheory() {
    const key = normalizeKey(snapshot().key || "C");
    const c = content("theory");
    c.appendChild(el("h3", "", "Theory / Teoría"));
    line(c, "Tonalidad:", key);
    line(c, "Escala mayor:", scale(key, "major").join(" "));
    line(c, "Acordes diatónicos:", majorChords(key).join(", "));
    line(c, "Función:", "I tónica · IV subdominante · V dominante · vi relativo menor.");
  }

  function renderChordAI() {
    const key = normalizeKey(snapshot().key || "C");
    const c = content("chordAI");
    c.appendChild(el("h3", "", "Chord AI / Acordes IA"));
    const ideas = [
      ["Luminoso", ["I","V","vi","IV"]],
      ["Emocional", ["vi","IV","I","V"]],
      ["Puente", ["IV","V","vi","V"]],
      ["Final", ["I","IV","V","I"]],
      ["Suspenso suave", ["ii","V","I","vi"]]
    ];
    ideas.forEach(([name, prog]) => line(c, name + ":", romanToChords(key, prog).join(" - ")));
  }

  function renderInspire() {
    const key = normalizeKey(snapshot().key || "C");
    const ideas = [
      ["Título", "Luz en la ventana"],
      ["Tema", "volver a empezar con calma y fuerza"],
      ["Primera línea", "Abro la puerta y vuelve a respirar mi voz"],
      ["Imagen", "amanecer sobre una ciudad silenciosa"],
      ["Progresión", romanToChords(key, ["I","V","vi","IV"]).join(" - ")],
      ["Groove", "medio tiempo, pulso estable, percusión suave"]
    ];
    const text = ideas.map(([a,b]) => a + ": " + b).join("\n");
    const c = content("inspire");
    c.appendChild(el("h3", "", "Inspire / Inspirar"));
    ideas.forEach(([a,b]) => line(c, a + ":", b));
    actions(c, [
      { label:"Copiar idea", onClick:()=>copy(text, c) },
      { label:"Descargar TXT", onClick:()=>download("studio936-inspire.txt", text) }
    ]);
  }

  function renderLeadSheet() {
    const text = fullSongText();
    const c = content("lead");
    c.appendChild(el("h3", "", "Lead Sheet / Hoja guía"));
    c.appendChild(el("p", "muted", "Esta vista usa el texto completo de la canción real cuando el bridge está disponible."));
    c.appendChild(el("pre", "preview", text));
    actions(c, [
      { label:"Copiar hoja", onClick:()=>copy(text, c) },
      { label:"Descargar Lead Sheet TXT", onClick:()=>download("studio936-lead-sheet.txt", text) },
      { label:"Bajar TXT real", primary:true, onClick:()=>callBridge("exportTxt", c) }
    ]);
  }

  function renderPdf() {
    const text = fullSongText();
    const c = content("pdf");
    c.appendChild(el("h3", "", "PDF / Print"));
    c.appendChild(el("p", "muted", "Para PDF final: descarga TXT real o usa imprimir/guardar como PDF desde el navegador."));
    c.appendChild(el("pre", "preview", text));
    actions(c, [
      { label:"Bajar TXT real", primary:true, onClick:()=>callBridge("exportTxt", c) },
      { label:"Descargar fuente TXT", onClick:()=>download("studio936-pdf-source.txt", text) },
      { label:"Imprimir navegador", onClick:()=>window.print() }
    ]);
  }

  function renderShare() {
    const s = snapshot();
    const text = fullSongText();
    const c = content("share");
    c.appendChild(el("h3", "", "Share / Compartir"));
    line(c, "Canción:", s.title || "-");
    line(c, "Autor:", s.author || "-");
    c.appendChild(el("pre", "preview", text));
    actions(c, [
      { label:"Copiar canción completa", onClick:()=>copy(text, c) },
      { label:"Bajar TXT real", primary:true, onClick:()=>callBridge("exportTxt", c) },
      { label:"Bajar JSON real", primary:true, onClick:()=>callBridge("exportJson", c) },
      { label:"Exportar MIDI real", primary:true, onClick:()=>callBridge("exportMidi", c) }
    ]);
  }

  function loadLibrary() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
    catch (error) { return []; }
  }

  function saveLibrary(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function renderLibrary() {
    const c = content("library");
    c.appendChild(el("h3", "", "Library / Biblioteca"));
    c.appendChild(el("p", "muted", "Guarda snapshots rápidos de la canción actual. Para respaldo maestro usa Bajar JSON real."));

    actions(c, [
      { label:"Guardar snapshot", primary:true, onClick:()=>{
          const items = loadLibrary();
          items.unshift({ snapshot: snapshot(), text: fullSongText(), createdAt: new Date().toISOString() });
          saveLibrary(items.slice(0, 30));
          renderLibrary();
        }
      },
      { label:"Bajar JSON real", onClick:()=>callBridge("exportJson", c) }
    ]);

    const items = loadLibrary();
    if (!items.length) {
      status(c, "Todavía no hay snapshots guardados.");
      return;
    }

    const grid = el("div", "grid");
    items.forEach((item, index) => {
      const snap = item.snapshot || {};
      const text = item.text || JSON.stringify(item, null, 2);
      const card = el("article", "card");
      card.appendChild(el("h4", "", snap.title || "Snapshot"));
      line(card, "Fecha:", item.createdAt || "");
      line(card, "Key:", snap.key || "C");
      line(card, "BPM:", snap.bpm || "");
      actions(card, [
        { label:"Copiar", onClick:()=>copy(text, card) },
        { label:"TXT", onClick:()=>download("studio936-snapshot.txt", text) },
        { label:"Borrar", onClick:()=>{ const next = loadLibrary(); next.splice(index, 1); saveLibrary(next); renderLibrary(); } }
      ]);
      grid.appendChild(card);
    });
    c.appendChild(grid);
  }

  function renderRecord() {
    const c = content("record");
    c.appendChild(el("h3", "", "REC Idea"));
    c.appendChild(el("p", "muted", "Captura texto rápido: frase, melodía, groove, producción. No usa micrófono todavía."));
    const area = el("textarea", "textarea");
    area.placeholder = "Escribe una idea antes de que se escape...";
    c.appendChild(area);
    actions(c, [
      { label:"Guardar en Library", primary:true, onClick:()=>{
          const items = loadLibrary();
          items.unshift({ snapshot: snapshot(), text: area.value || "(idea vacía)", createdAt: new Date().toISOString() });
          saveLibrary(items.slice(0, 30));
          area.value = "";
          status(c, "Idea guardada en Library.");
        }
      }
    ]);
  }

  function renderPractice() {
    const c = content("practice");
    c.appendChild(el("h3", "", "Practice / Práctica"));
    c.appendChild(el("p", "muted", "Controla la reproducción real de la app principal."));
    actions(c, [
      { label:"Start Groove", primary:true, onClick:()=>callBridge("startGroove", c) },
      { label:"Escuchar canción", primary:true, onClick:()=>callBridge("playFullSong", c) },
      { label:"Stop", onClick:()=>callBridge("stopPlayback", c) },
      { label:"Abrir Editor", onClick:()=>callBridge("openEditor", c) },
      { label:"Abrir Estructura", onClick:()=>callBridge("openStructure", c) }
    ]);
  }

  function renderSimple(key, title, lines) {
    const c = content(key);
    c.appendChild(el("h3", "", title));
    lines.forEach(([a,b]) => line(c, a + ":", b));
  }

  function renderTool(key) {
    const routes = {
      library: renderLibrary,
      templates: renderTemplates,
      transpose: renderTranspose,
      scales: renderScales,
      chordAI: renderChordAI,
      drums: () => renderSimple("drums", "Drums / Batería", [["Uso", "guía de groove para producción"], ["Estado", "no toca audio todavía"], ["Sugerencia", "Pop 4/4, Worship lento, Rock medio, Urbano simple"]]),
      mixer: () => renderSimple("mixer", "Mixer / Mezcla", [["Uso", "balance mental de capas"], ["Capas", "voz, acordes, bajo, drums, melodía"], ["Estado", "no toca motor de audio"]]),
      record: renderRecord,
      midiIn: () => renderSimple("midiIn", "MIDI IN", [["Uso", "entrada desde teclado MIDI"], ["Estado", "pendiente de permisos Web MIDI"], ["Seguro", "no toca MIDI real todavía"]]),
      pdf: renderPdf,
      lead: renderLeadSheet,
      practice: renderPractice,
      share: renderShare,
      inspire: renderInspire,
      theory: renderTheory
    };
    (routes[key] || renderDashboard)();
  }

  function open() {
    const panel = ensurePanel();
    panel.classList.add("is-open");
    renderDashboard();
    document.body.classList.add("s936-suite-pro-open");
    return panel;
  }

  function close() {
    const panel = byId(PANEL_ID);
    if (panel) panel.classList.remove("is-open");
    document.body.classList.remove("s936-suite-pro-open");
    document.querySelectorAll("#v25UxBar .v25ux-btn").forEach((button) => {
      if (button.dataset.uxOpen === "suite") button.classList.remove("active");
    });
  }

  function toggle() {
    const panel = ensurePanel();
    if (panel.classList.contains("is-open")) close();
    else open();
    return panel;
  }

  window.Studio936SuitePro = {
    open,
    close,
    toggle,
    ensurePanel
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensurePanel);
  } else {
    ensurePanel();
  }
})();
