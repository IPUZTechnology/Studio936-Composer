// Studio 936 Composer - Suite Pro hard reset module
// Replace js/pro-suite.js with this file.
// Scope: Suite Pro only. It does not touch MIDI, transport, audio, arrangement, editor, or exports.
(function () {
  "use strict";

  const VERSION = "hard-reset-v1";
  const STORAGE_KEY = "studio936_suite_library_snapshots";

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

  const NOTE_INDEX = {
    C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5,
    "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11
  };

  const SHARP_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const FLAT_NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  const FLAT_KEYS = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"]);
  const INTERVALS = {
    major: [0, 2, 4, 5, 7, 9, 11],
    naturalMinor: [0, 2, 3, 5, 7, 8, 10],
    minorPentatonic: [0, 3, 5, 7, 10]
  };
  const ROMAN_INDEX = { I: 0, ii: 1, iii: 2, IV: 3, V: 4, vi: 5, vii: 6 };

  const TEMPLATES = [
    {
      name: "Pop",
      mood: "Claro, directo, memorable.",
      parts: ["Intro", "Verse 1", "Pre-Chorus", "Chorus", "Verse 2", "Pre-Chorus", "Chorus", "Bridge", "Final Chorus", "Outro"],
      progression: ["I", "V", "vi", "IV"]
    },
    {
      name: "Worship",
      mood: "Crecimiento emocional y coro expansivo.",
      parts: ["Intro", "Verse 1", "Verse 2", "Pre-Chorus", "Chorus", "Interlude", "Bridge", "Final Chorus", "Outro"],
      progression: ["I", "V", "vi", "IV"]
    },
    {
      name: "Balada",
      mood: "Intima, vocal, lirica.",
      parts: ["Intro", "Verse 1", "Chorus", "Verse 2", "Chorus", "Solo", "Bridge", "Final Chorus", "Outro"],
      progression: ["vi", "IV", "I", "V"]
    },
    {
      name: "Rock",
      mood: "Energia, riff, coro fuerte.",
      parts: ["Intro Riff", "Verse 1", "Chorus", "Riff", "Verse 2", "Chorus", "Solo", "Final Chorus", "Outro"],
      progression: ["I", "IV", "V", "IV"]
    },
    {
      name: "Urbano",
      mood: "Hook rapido y espacio para flow.",
      parts: ["Intro", "Hook", "Verse 1", "Hook", "Verse 2", "Bridge", "Final Hook", "Outro"],
      progression: ["vi", "IV", "I", "V"]
    },
    {
      name: "Jazz basico",
      mood: "Color armonico y forma flexible.",
      parts: ["Intro", "Tema A", "Tema A", "Tema B", "Solo", "Tema A final", "Coda"],
      progression: ["ii", "V", "I", "vi"]
    }
  ];

  function id(name) { return document.getElementById(name); }

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

  function currentKey() {
    let projectKey = "";
    if (typeof window.getProject === "function") {
      try {
        const project = window.getProject() || {};
        projectKey = project.soloKey || project.key || project.tonality || "";
      } catch (error) {
        projectKey = "";
      }
    }
    return normalizeKey(id("soloKey")?.value || projectKey || id("chordName")?.value || "C");
  }

  function useFlats(key) { return key.indexOf("b") > -1 || FLAT_KEYS.has(key); }

  function scale(key, type) {
    const cleanKey = normalizeKey(key);
    const root = NOTE_INDEX[cleanKey];
    const names = useFlats(cleanKey) ? FLAT_NOTES : SHARP_NOTES;
    const intervals = INTERVALS[type] || INTERVALS.major;
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

  function snapshot() {
    let project = {};
    if (typeof window.getProject === "function") {
      try { project = window.getProject() || {}; } catch (error) { project = {}; }
    }

    const title = id("songTitle")?.value || id("titleInput")?.value || project.title || "Untitled Song";
    const author = id("authorInput")?.value || project.author || "Studio 936";
    const bpm = id("bpmInput")?.value || id("bpmDisplay")?.textContent || project.bpm || "";
    const style = id("styleSelect")?.value || project.style || "";
    const key = currentKey();
    const section = id("sectionSelect")?.value || project.activeSection || "";

    return { title, author, key, bpm, style, section, createdAt: new Date().toISOString() };
  }

  function textFromSnapshot() {
    const data = snapshot();
    return [
      "Studio 936 Composer",
      "Title: " + data.title,
      "Author: " + data.author,
      "Key: " + data.key,
      "BPM: " + data.bpm,
      "Style: " + data.style,
      "Section: " + data.section
    ].join("\n");
  }

  function installStyles() {
    const old = id("s936-suite-hard-reset-style");
    if (old) old.remove();

    const style = document.createElement("style");
    style.id = "s936-suite-hard-reset-style";
    style.textContent = [
      "#v18Suite.s936-suite{position:fixed!important;left:18px!important;right:18px!important;top:72px!important;bottom:18px!important;width:auto!important;max-width:none!important;max-height:none!important;display:none!important;padding:0!important;z-index:10020!important;border:1px solid rgba(0,255,204,.35)!important;border-radius:22px!important;background:linear-gradient(180deg,#0d1424,#05070c)!important;box-shadow:0 30px 100px rgba(0,0,0,.82)!important;overflow:hidden!important;transform:none!important;}",
      "#v18Suite.s936-suite.v19-open{display:block!important;}",
      "#v18Suite .s936-shell{height:100%!important;display:grid!important;grid-template-rows:auto minmax(0,1fr)!important;}",
      "#v18Suite .s936-header{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:14px!important;padding:16px 20px!important;border-bottom:1px solid rgba(255,255,255,.12)!important;}",
      "#v18Suite .s936-title{margin:0!important;color:#f8fbff!important;font-size:1.45rem!important;line-height:1!important;font-weight:950!important;}",
      "#v18Suite .s936-close{position:static!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;min-width:92px!important;border:1px solid rgba(255,216,77,.85)!important;border-radius:999px!important;background:rgba(255,216,77,.1)!important;color:#ffe066!important;padding:9px 16px!important;font-weight:950!important;cursor:pointer!important;writing-mode:horizontal-tb!important;transform:none!important;}",
      "#v18Suite .s936-body{min-height:0!important;display:grid!important;grid-template-columns:220px minmax(0,1fr)!important;gap:16px!important;padding:16px!important;overflow:hidden!important;}",
      "#v18Suite .s936-tools{display:grid!important;grid-template-columns:1fr!important;gap:8px!important;align-content:start!important;overflow:auto!important;padding-right:4px!important;}",
      "#v18Suite .s936-tool{width:100%!important;min-height:38px!important;border-radius:12px!important;border:1px solid rgba(255,255,255,.17)!important;background:rgba(255,255,255,.07)!important;color:#fff!important;text-align:left!important;padding:10px 12px!important;font-size:.72rem!important;font-weight:900!important;text-transform:uppercase!important;cursor:pointer!important;}",
      "#v18Suite .s936-tool.active,#v18Suite .s936-tool:hover{border-color:rgba(0,255,204,.8)!important;background:rgba(0,255,204,.12)!important;color:#00ffcc!important;}",
      "#v18Suite .s936-content{min-width:0!important;min-height:0!important;overflow:auto!important;padding:18px!important;border-radius:18px!important;border:1px solid rgba(255,255,255,.13)!important;background:rgba(255,255,255,.045)!important;color:#fff!important;}",
      "#v18Suite .s936-content h3{margin:0 0 12px!important;color:#8affff!important;font-size:1.08rem!important;text-transform:uppercase!important;}",
      "#v18Suite .s936-line{margin:8px 0!important;line-height:1.45!important;color:rgba(255,255,255,.9)!important;}",
      "#v18Suite .s936-line strong{color:#bfffee!important;}",
      "#v18Suite .s936-muted{color:rgba(255,255,255,.72)!important;line-height:1.55!important;}",
      "#v18Suite .s936-card-grid{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))!important;gap:12px!important;margin-top:12px!important;}",
      "#v18Suite .s936-card{border:1px solid rgba(255,255,255,.14)!important;border-radius:16px!important;background:rgba(0,0,0,.18)!important;padding:14px!important;}",
      "#v18Suite .s936-card h4{margin:0 0 8px!important;font-size:.95rem!important;color:#fff!important;text-transform:uppercase!important;}",
      "#v18Suite .s936-actions{display:flex!important;flex-wrap:wrap!important;gap:8px!important;margin-top:12px!important;}",
      "#v18Suite .s936-action{border:1px solid rgba(255,216,77,.75)!important;border-radius:999px!important;background:rgba(255,216,77,.1)!important;color:#ffe066!important;padding:8px 12px!important;font-weight:900!important;cursor:pointer!important;}",
      "#v18Suite .s936-select,#v18Suite .s936-textarea{width:100%!important;border:1px solid rgba(255,255,255,.18)!important;border-radius:12px!important;background:rgba(0,0,0,.35)!important;color:#fff!important;padding:10px!important;margin:6px 0 12px!important;font:inherit!important;}",
      "#v18Suite .s936-textarea{min-height:110px!important;resize:vertical!important;}",
      "#v18Suite .s936-preview{white-space:pre-wrap!important;background:rgba(0,0,0,.25)!important;border:1px solid rgba(255,255,255,.13)!important;border-radius:14px!important;padding:12px!important;margin-top:10px!important;line-height:1.5!important;}",
      "@media(max-width:760px){#v18Suite.s936-suite{left:8px!important;right:8px!important;top:8px!important;bottom:8px!important;}#v18Suite .s936-body{grid-template-columns:1fr!important;grid-template-rows:auto minmax(0,1fr)!important;}#v18Suite .s936-tools{grid-template-columns:repeat(2,minmax(0,1fr))!important;max-height:190px!important;}}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function clear(node) { node.textContent = ""; }

  function line(parent, label, value) {
    const row = el("p", "s936-line");
    row.appendChild(el("strong", "", label));
    row.appendChild(document.createTextNode(" " + value));
    parent.appendChild(row);
  }

  function setActive(key) {
    document.querySelectorAll("#v18Suite .s936-tool").forEach((button) => {
      button.classList.toggle("active", button.dataset.tool === key);
    });
  }

  function contentPanel(activeKey) {
    const panel = ensurePanel();
    const content = panel.querySelector("#v18SuiteContent");
    clear(content);
    setActive(activeKey || "");
    return content;
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function copyText(text, content) {
    const message = el("p", "s936-muted", "");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        message.textContent = "Copiado al portapapeles.";
      }).catch(() => {
        message.textContent = "No se pudo copiar automaticamente. Usa Descargar TXT.";
      });
    } else {
      message.textContent = "Portapapeles no disponible. Usa Descargar TXT.";
    }
    content.appendChild(message);
  }

  function addActions(parent, filename, text) {
    const actions = el("div", "s936-actions");
    const copy = el("button", "s936-action", "Copiar");
    const down = el("button", "s936-action", "Descargar TXT");
    copy.type = "button";
    down.type = "button";
    copy.onclick = () => copyText(text, parent);
    down.onclick = () => downloadText(filename, text);
    actions.appendChild(copy);
    actions.appendChild(down);
    parent.appendChild(actions);
  }

  function renderWelcome() {
    const c = contentPanel("");
    c.appendChild(el("h3", "", "Suite Pro"));
    c.appendChild(el("p", "s936-muted", "Herramientas rapidas para componer: plantillas, transposicion, inspiracion, lead sheet y biblioteca."));
  }

  function renderTheory() {
    const key = currentKey();
    const major = scale(key, "major");
    const chords = majorChords(key);
    const c = contentPanel("theory");
    c.appendChild(el("h3", "", "Theory / Teoria"));
    line(c, "Tonalidad:", key);
    line(c, "Escala mayor:", major.join(" "));
    line(c, "Acordes diatonicos:", chords.join(", "));
    line(c, "Uso:", "elige acordes de la tonalidad para versos, coros, puentes y solos coherentes.");
  }

  function renderScales() {
    const key = currentKey();
    const c = contentPanel("scales");
    c.appendChild(el("h3", "", "Scales / Escalas"));
    line(c, "Mayor:", scale(key, "major").join(" "));
    line(c, "Menor natural:", scale(key, "naturalMinor").join(" "));
    line(c, "Pentatonica menor:", scale(key, "minorPentatonic").join(" "));
    line(c, "Uso:", "melodias, bajos, solos y respuestas instrumentales.");
  }

  function templateText(template, key) {
    return [
      "Studio 936 Template: " + template.name,
      "Tonalidad: " + key,
      "Uso: " + template.mood,
      "Forma: " + template.parts.join(" / "),
      "Progresion: " + template.progression.join(" - "),
      "Acordes: " + romanToChords(key, template.progression).join(" - ")
    ].join("\n");
  }

  function renderTemplates() {
    const key = currentKey();
    const c = contentPanel("templates");
    c.appendChild(el("h3", "", "Templates / Plantillas"));
    c.appendChild(el("p", "s936-muted", "Elige una plantilla para salir de la pantalla en blanco. Copia o descarga la estructura."));

    const grid = el("div", "s936-card-grid");
    TEMPLATES.forEach((template) => {
      const text = templateText(template, key);
      const card = el("article", "s936-card");
      card.appendChild(el("h4", "", template.name));
      line(card, "Uso:", template.mood);
      line(card, "Forma:", template.parts.join(" / "));
      line(card, "Progresion:", template.progression.join(" - "));
      line(card, "En " + key + ":", romanToChords(key, template.progression).join(" - "));
      addActions(card, "studio936-template-" + template.name.toLowerCase().replace(/\s+/g, "-") + ".txt", text);
      grid.appendChild(card);
    });
    c.appendChild(grid);
  }

  function renderTranspose() {
    const fromKey = currentKey();
    const c = contentPanel("transpose");
    c.appendChild(el("h3", "", "Transpose / Transponer"));
    line(c, "Tonalidad actual:", fromKey);

    const select = el("select", "s936-select");
    ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"].forEach((key) => {
      const option = el("option", "", key);
      option.value = key;
      if (key === fromKey) option.selected = true;
      select.appendChild(option);
    });

    const preview = el("div", "s936-preview");
    function update() {
      const toKey = select.value;
      const text = [
        "Transposition Preview",
        "From: " + fromKey,
        "To: " + toKey,
        "Scale: " + scale(toKey, "major").join(" "),
        "Diatonic chords: " + majorChords(toKey).join(", "),
        "Fast pop progression: " + romanToChords(toKey, ["I", "V", "vi", "IV"]).join(" - ")
      ].join("\n");
      preview.textContent = text;
    }
    select.onchange = update;
    c.appendChild(select);
    c.appendChild(preview);
    update();
    addActions(c, "studio936-transpose.txt", () => preview.textContent);
  }

  function addActions(parent, filename, textOrFn) {
    const actions = el("div", "s936-actions");
    const copy = el("button", "s936-action", "Copiar");
    const down = el("button", "s936-action", "Descargar TXT");
    function text() { return typeof textOrFn === "function" ? textOrFn() : textOrFn; }
    copy.type = "button";
    down.type = "button";
    copy.onclick = () => copyText(text(), parent);
    down.onclick = () => downloadText(filename, text());
    actions.appendChild(copy);
    actions.appendChild(down);
    parent.appendChild(actions);
  }

  function renderInspire() {
    const key = currentKey();
    const ideas = [
      ["Titulo", "Luz en la ventana"],
      ["Tema", "volver a empezar con calma y fuerza"],
      ["Primera linea", "Abro la puerta y vuelve a respirar mi voz"],
      ["Imagen", "amanecer sobre una ciudad silenciosa"],
      ["Progresion", romanToChords(key, ["I", "V", "vi", "IV"]).join(" - ")],
      ["Groove", "medio tiempo, pulso estable, percusion suave"]
    ];
    const text = ideas.map((item) => item[0] + ": " + item[1]).join("\n");
    const c = contentPanel("inspire");
    c.appendChild(el("h3", "", "Inspire / Inspirar"));
    ideas.forEach((item) => line(c, item[0] + ":", item[1]));
    addActions(c, "studio936-inspire.txt", text);
  }

  function renderLeadSheet() {
    const data = snapshot();
    const text = [
      data.title,
      "Author: " + data.author,
      "Key: " + data.key + "    BPM: " + data.bpm + "    Style: " + data.style,
      "",
      "FORM",
      "Intro / Verse / Chorus / Verse / Chorus / Bridge / Final Chorus / Outro",
      "",
      "CHORD MAP",
      "Verse: " + romanToChords(data.key, ["I", "V", "vi", "IV"]).join(" | "),
      "Chorus: " + romanToChords(data.key, ["IV", "I", "V", "vi"]).join(" | "),
      "Bridge: " + romanToChords(data.key, ["vi", "V", "IV", "V"]).join(" | ")
    ].join("\n");
    const c = contentPanel("lead");
    c.appendChild(el("h3", "", "Lead Sheet"));
    c.appendChild(el("pre", "s936-preview", text));
    addActions(c, "studio936-lead-sheet.txt", text);
  }

  function loadLibrary() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch (error) { return []; }
  }

  function saveLibrary(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function renderLibrary() {
    const c = contentPanel("library");
    c.appendChild(el("h3", "", "Library / Biblioteca"));
    c.appendChild(el("p", "s936-muted", "Guarda una captura rapida de la idea actual para no perderla."));

    const save = el("button", "s936-action", "Guardar snapshot");
    save.type = "button";
    save.onclick = function () {
      const items = loadLibrary();
      items.unshift(snapshot());
      saveLibrary(items.slice(0, 30));
      renderLibrary();
    };
    c.appendChild(el("div", "s936-actions")).appendChild(save);

    const items = loadLibrary();
    if (!items.length) {
      c.appendChild(el("p", "s936-muted", "No hay snapshots guardados todavia."));
      return;
    }

    const grid = el("div", "s936-card-grid");
    items.forEach((item, index) => {
      const text = ["Snapshot", "Title: " + item.title, "Key: " + item.key, "BPM: " + item.bpm, "Style: " + item.style, "Date: " + item.createdAt].join("\n");
      const card = el("article", "s936-card");
      card.appendChild(el("h4", "", item.title || "Untitled"));
      line(card, "Key:", item.key || "C");
      line(card, "BPM:", item.bpm || "");
      const actions = el("div", "s936-actions");
      const copy = el("button", "s936-action", "Copiar");
      const down = el("button", "s936-action", "TXT");
      const del = el("button", "s936-action", "Borrar");
      copy.onclick = () => copyText(text, card);
      down.onclick = () => downloadText("studio936-snapshot.txt", text);
      del.onclick = () => { const next = loadLibrary(); next.splice(index, 1); saveLibrary(next); renderLibrary(); };
      actions.appendChild(copy); actions.appendChild(down); actions.appendChild(del);
      card.appendChild(actions);
      grid.appendChild(card);
    });
    c.appendChild(grid);
  }

  function renderShare() {
    const text = textFromSnapshot();
    const c = contentPanel("share");
    c.appendChild(el("h3", "", "Share / Compartir"));
    c.appendChild(el("pre", "s936-preview", text));
    addActions(c, "studio936-share.txt", text);
  }

  function renderPdf() {
    const text = textFromSnapshot() + "\n\nTip: usa Imprimir del navegador y guardar como PDF.";
    const c = contentPanel("pdf");
    c.appendChild(el("h3", "", "PDF"));
    c.appendChild(el("pre", "s936-preview", text));
    addActions(c, "studio936-pdf-source.txt", text);
  }

  function renderRecord() {
    const c = contentPanel("record");
    c.appendChild(el("h3", "", "REC Idea"));
    const area = el("textarea", "s936-textarea");
    area.placeholder = "Escribe una idea antes de que se escape: frase, melodia, groove, produccion...";
    c.appendChild(area);
    const save = el("button", "s936-action", "Guardar idea");
    save.onclick = () => {
      const items = loadLibrary();
      items.unshift({ title: "Idea rapida", author: "Studio 936", key: currentKey(), bpm: "", style: area.value, section: "idea", createdAt: new Date().toISOString() });
      saveLibrary(items.slice(0, 30));
      area.value = "";
      c.appendChild(el("p", "s936-muted", "Idea guardada en Library."));
    };
    c.appendChild(el("div", "s936-actions")).appendChild(save);
  }

  function renderChordAI() {
    const key = currentKey();
    const c = contentPanel("chordAI");
    c.appendChild(el("h3", "", "Chord AI / Acordes IA"));
    const sets = [
      ["Emocional", ["vi", "IV", "I", "V"]],
      ["Luminoso", ["I", "V", "vi", "IV"]],
      ["Puente", ["IV", "V", "vi", "V"]],
      ["Final", ["I", "IV", "V", "I"]]
    ];
    sets.forEach((set) => line(c, set[0] + ":", romanToChords(key, set[1]).join(" - ")));
  }

  function renderSimple(key, title, lines) {
    const c = contentPanel(key);
    c.appendChild(el("h3", "", title));
    lines.forEach((item) => line(c, item[0] + ":", item[1]));
  }

  function route(toolKey) {
    const panel = ensurePanel();
    const routes = {
      library: renderLibrary,
      templates: renderTemplates,
      transpose: renderTranspose,
      scales: renderScales,
      chordAI: renderChordAI,
      record: renderRecord,
      pdf: renderPdf,
      lead: renderLeadSheet,
      share: renderShare,
      inspire: renderInspire,
      theory: renderTheory,
      drums: () => renderSimple("drums", "Drums / Bateria", [["Uso", "elige groove antes de tocar audio"], ["Sugerencia", "Pop 4/4, Worship lento, Rock medio, Urbano simple"], ["Estado", "guia de produccion; audio real despues"]]),
      mixer: () => renderSimple("mixer", "Mixer / Mezcla", [["Uso", "balance mental de capas"], ["Capas", "voz, acordes, bajo, drums, melodia"], ["Estado", "no toca motor de audio"]]),
      midiIn: () => renderSimple("midiIn", "MIDI IN", [["Uso", "entrada desde teclado MIDI"], ["Estado", "pendiente de permisos Web MIDI"], ["Seguro", "no toca MIDI real todavia"]]),
      practice: () => renderSimple("practice", "Practice / Practica", [["Plan", "elige seccion, baja tempo, repite"], ["Hoy", "practica verso y coro con progresion base"], ["Estado", "sin tocar transport"]])
    };
    (routes[toolKey] || renderWelcome)(panel);
  }

  function buildPanel(panel) {
    panel.textContent = "";
    panel.className = "v18-suite s936-suite";
    panel.dataset.s936SuiteVersion = VERSION;

    const shell = el("div", "s936-shell");
    const header = el("div", "s936-header");
    const title = el("h2", "s936-title", "Suite Pro");
    const closeButton = el("button", "s936-close", "CERRAR");
    closeButton.id = "b25SuiteClose";
    closeButton.type = "button";
    closeButton.onclick = close;
    header.appendChild(title);
    header.appendChild(closeButton);

    const body = el("div", "s936-body");
    const tools = el("nav", "s936-tools");
    TOOLS.forEach(([key, label]) => {
      const button = el("button", "s936-tool", label);
      button.id = "v18_" + key;
      if (key === "chordAI") button.id = "v18_chordAI";
      if (key === "midiIn") button.id = "v18_midiIn";
      button.type = "button";
      button.dataset.tool = key;
      button.onclick = () => route(key);
      tools.appendChild(button);
    });

    const content = el("section", "s936-content");
    content.id = "v18SuiteContent";

    body.appendChild(tools);
    body.appendChild(content);
    shell.appendChild(header);
    shell.appendChild(body);
    panel.appendChild(shell);
    renderWelcome();
  }

  function ensurePanel() {
    installStyles();
    let panel = id("v18Suite");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "v18Suite";
      document.body.appendChild(panel);
    }
    if (panel.dataset.s936SuiteVersion !== VERSION) buildPanel(panel);
    return panel;
  }

  function open() {
    const panel = ensurePanel();
    panel.classList.add("v19-open");
    return panel;
  }

  function close() {
    const panel = id("v18Suite");
    if (panel) panel.classList.remove("v19-open");
    const legacyToggle = id("v19ToolsToggle");
    if (legacyToggle) legacyToggle.classList.remove("open");
    document.querySelectorAll("#v25UxBar .v25ux-btn").forEach((button) => {
      if (button.dataset.uxOpen === "suite") button.classList.remove("active");
    });
  }

  function toggle() {
    const panel = ensurePanel();
    if (panel.classList.contains("v19-open")) close(); else open();
    return panel;
  }

  window.Studio936SuitePro = {
    open,
    close,
    toggle,
    ensurePanel,
    ensureMounted: ensurePanel
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensurePanel);
  } else {
    ensurePanel();
  }
})();
