// Studio 936 Composer - Suite Pro module
// New isolated module. Owns only #s936SuitePro.
// Does not touch MIDI, transport, playback, audio engine, arrangement, editor, or exports.
(function () {
  "use strict";

  const PANEL_ID = "s936SuitePro";
  const STYLE_ID = "s936SuiteProStyles";
  const STORAGE_KEY = "studio936_suite_library_snapshots_v1";

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

  function byId(id) {
    return document.getElementById(id);
  }

  function make(tag, className, text) {
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

    return normalizeKey(
      byId("soloKey")?.value ||
      projectKey ||
      byId("chordName")?.value ||
      "C"
    );
  }

  function useFlats(key) {
    return key.includes("b") || FLAT_KEYS.has(key);
  }

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
      try {
        project = window.getProject() || {};
      } catch (error) {
        project = {};
      }
    }

    return {
      title: byId("songTitle")?.value || project.title || "Untitled Song",
      author: byId("songAuthor")?.value || project.author || "Studio 936",
      key: currentKey(),
      bpm: byId("bpmDisplay")?.textContent || project.bpm || "",
      style: byId("styleSelect")?.value || project.style || "",
      section: byId("sectionSelect")?.value || project.activeSection || "",
      createdAt: new Date().toISOString()
    };
  }

  function installStyles() {
    if (byId(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID} {
        position: fixed;
        inset: 72px 18px 18px 18px;
        z-index: 10050;
        display: none;
        color: #fff;
        background: linear-gradient(180deg, #0d1424, #05070c);
        border: 1px solid rgba(0, 255, 204, 0.35);
        border-radius: 22px;
        box-shadow: 0 30px 100px rgba(0, 0, 0, 0.82);
        overflow: hidden;
      }

      #${PANEL_ID}.s936-suite-pro-open {
        display: block;
      }

      #${PANEL_ID} .s936-sp-shell {
        height: 100%;
        display: grid;
        grid-template-rows: auto minmax(0, 1fr);
      }

      #${PANEL_ID} .s936-sp-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        padding: 16px 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      }

      #${PANEL_ID} .s936-sp-title {
        margin: 0;
        color: #f8fbff;
        font-size: 1.4rem;
        line-height: 1;
        font-weight: 950;
        letter-spacing: 0.02em;
      }

      #${PANEL_ID} .s936-sp-close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 92px;
        border: 1px solid rgba(255, 216, 77, 0.85);
        border-radius: 999px;
        background: rgba(255, 216, 77, 0.1);
        color: #ffe066;
        padding: 9px 16px;
        font-weight: 950;
        cursor: pointer;
      }

      #${PANEL_ID} .s936-sp-body {
        min-height: 0;
        display: grid;
        grid-template-columns: 220px minmax(0, 1fr);
        gap: 16px;
        padding: 16px;
        overflow: hidden;
      }

      #${PANEL_ID} .s936-sp-tools {
        display: grid;
        grid-template-columns: 1fr;
        gap: 8px;
        align-content: start;
        overflow: auto;
        padding-right: 4px;
      }

      #${PANEL_ID} .s936-sp-tool {
        width: 100%;
        min-height: 38px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.17);
        background: rgba(255, 255, 255, 0.07);
        color: #fff;
        text-align: left;
        padding: 10px 12px;
        font-size: 0.72rem;
        font-weight: 900;
        text-transform: uppercase;
        cursor: pointer;
      }

      #${PANEL_ID} .s936-sp-tool.active,
      #${PANEL_ID} .s936-sp-tool:hover {
        border-color: rgba(0, 255, 204, 0.8);
        background: rgba(0, 255, 204, 0.12);
        color: #00ffcc;
      }

      #${PANEL_ID} .s936-sp-content {
        min-width: 0;
        min-height: 0;
        overflow: auto;
        padding: 18px;
        border-radius: 18px;
        border: 1px solid rgba(255, 255, 255, 0.13);
        background: rgba(255, 255, 255, 0.045);
      }

      #${PANEL_ID} .s936-sp-content h3 {
        margin: 0 0 12px;
        color: #8affff;
        font-size: 1.08rem;
        text-transform: uppercase;
      }

      #${PANEL_ID} .s936-sp-line {
        margin: 8px 0;
        line-height: 1.45;
        color: rgba(255, 255, 255, 0.9);
      }

      #${PANEL_ID} .s936-sp-line strong {
        color: #bfffee;
      }

      #${PANEL_ID} .s936-sp-muted {
        color: rgba(255, 255, 255, 0.72);
        line-height: 1.55;
      }

      #${PANEL_ID} .s936-sp-card-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 12px;
        margin-top: 12px;
      }

      #${PANEL_ID} .s936-sp-card {
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 16px;
        background: rgba(0, 0, 0, 0.18);
        padding: 14px;
      }

      #${PANEL_ID} .s936-sp-card h4 {
        margin: 0 0 8px;
        font-size: 0.95rem;
        color: #fff;
        text-transform: uppercase;
      }

      #${PANEL_ID} .s936-sp-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 12px;
      }

      #${PANEL_ID} .s936-sp-action {
        border: 1px solid rgba(255, 216, 77, 0.75);
        border-radius: 999px;
        background: rgba(255, 216, 77, 0.1);
        color: #ffe066;
        padding: 8px 12px;
        font-weight: 900;
        cursor: pointer;
      }

      #${PANEL_ID} .s936-sp-select,
      #${PANEL_ID} .s936-sp-textarea {
        width: 100%;
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 12px;
        background: rgba(0, 0, 0, 0.35);
        color: #fff;
        padding: 10px;
        margin: 6px 0 12px;
        font: inherit;
      }

      #${PANEL_ID} .s936-sp-textarea {
        min-height: 110px;
        resize: vertical;
      }

      #${PANEL_ID} .s936-sp-preview {
        white-space: pre-wrap;
        background: rgba(0, 0, 0, 0.25);
        border: 1px solid rgba(255, 255, 255, 0.13);
        border-radius: 14px;
        padding: 12px;
        margin-top: 10px;
        line-height: 1.5;
      }

      @media (max-width: 760px) {
        #${PANEL_ID} {
          inset: 8px;
        }

        #${PANEL_ID} .s936-sp-body {
          grid-template-columns: 1fr;
          grid-template-rows: auto minmax(0, 1fr);
        }

        #${PANEL_ID} .s936-sp-tools {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          max-height: 190px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function line(parent, label, value) {
    const row = make("p", "s936-sp-line");
    row.appendChild(make("strong", "", label));
    row.appendChild(document.createTextNode(" " + value));
    parent.appendChild(row);
  }

  function contentPanel(activeKey) {
    const panel = ensurePanel();
    const content = panel.querySelector("[data-s936-suite-content]");
    content.textContent = "";

    panel.querySelectorAll("[data-s936-suite-tool]").forEach((button) => {
      button.classList.toggle("active", button.dataset.s936SuiteTool === activeKey);
    });

    return content;
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

  function copyText(text, parent) {
    const msg = make("p", "s936-sp-muted", "");
    parent.appendChild(msg);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        msg.textContent = "Copiado al portapapeles.";
      }).catch(() => {
        msg.textContent = "No se pudo copiar automaticamente. Usa Descargar TXT.";
      });
    } else {
      msg.textContent = "Portapapeles no disponible. Usa Descargar TXT.";
    }
  }

  function addActions(parent, filename, textOrFn) {
    const actions = make("div", "s936-sp-actions");
    const copy = make("button", "s936-sp-action", "Copiar");
    const download = make("button", "s936-sp-action", "Descargar TXT");

    function getText() {
      return typeof textOrFn === "function" ? textOrFn() : textOrFn;
    }

    copy.type = "button";
    download.type = "button";
    copy.onclick = () => copyText(getText(), parent);
    download.onclick = () => downloadText(filename, getText());

    actions.appendChild(copy);
    actions.appendChild(download);
    parent.appendChild(actions);
  }

  function renderWelcome() {
    const c = contentPanel("");
    c.appendChild(make("h3", "", "Suite Pro"));
    c.appendChild(make("p", "s936-sp-muted", "Herramientas rápidas para componer: plantillas, transposición, inspiración, lead sheet, biblioteca, teoría y escalas."));
  }

  function renderTheory() {
    const key = currentKey();
    const major = scale(key, "major");
    const chords = majorChords(key);
    const c = contentPanel("theory");

    c.appendChild(make("h3", "", "Theory / Teoría"));
    line(c, "Tonalidad:", key);
    line(c, "Escala mayor:", major.join(" "));
    line(c, "Acordes diatónicos:", chords.join(", "));
    line(c, "Uso:", "elige acordes de la tonalidad para versos, coros, puentes y solos coherentes.");
  }

  function renderScales() {
    const key = currentKey();
    const c = contentPanel("scales");

    c.appendChild(make("h3", "", "Scales / Escalas"));
    line(c, "Mayor:", scale(key, "major").join(" "));
    line(c, "Menor natural:", scale(key, "naturalMinor").join(" "));
    line(c, "Pentatónica menor:", scale(key, "minorPentatonic").join(" "));
    line(c, "Uso:", "melodías, bajos, solos y respuestas instrumentales.");
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
    const key = currentKey();
    const c = contentPanel("templates");

    c.appendChild(make("h3", "", "Templates / Plantillas"));
    c.appendChild(make("p", "s936-sp-muted", "Elige una plantilla para salir de la pantalla en blanco. Copia o descarga la estructura."));

    const grid = make("div", "s936-sp-card-grid");
    TEMPLATES.forEach((template) => {
      const text = templateText(template, key);
      const card = make("article", "s936-sp-card");
      card.appendChild(make("h4", "", template.name));
      line(card, "Uso:", template.mood);
      line(card, "Forma:", template.parts.join(" / "));
      line(card, "Progresión:", template.progression.join(" - "));
      line(card, "En " + key + ":", romanToChords(key, template.progression).join(" - "));
      addActions(card, "studio936-template-" + template.name.toLowerCase().replace(/\s+/g, "-") + ".txt", text);
      grid.appendChild(card);
    });
    c.appendChild(grid);
  }

  function renderTranspose() {
    const fromKey = currentKey();
    const c = contentPanel("transpose");

    c.appendChild(make("h3", "", "Transpose / Transponer"));
    line(c, "Tonalidad actual:", fromKey);

    const select = make("select", "s936-sp-select");
    ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"].forEach((key) => {
      const option = make("option", "", key);
      option.value = key;
      if (key === fromKey) option.selected = true;
      select.appendChild(option);
    });

    const preview = make("div", "s936-sp-preview");

    function update() {
      const toKey = select.value;
      preview.textContent = [
        "Transposition Preview",
        "From: " + fromKey,
        "To: " + toKey,
        "Scale: " + scale(toKey, "major").join(" "),
        "Diatonic chords: " + majorChords(toKey).join(", "),
        "Fast pop progression: " + romanToChords(toKey, ["I", "V", "vi", "IV"]).join(" - ")
      ].join("\n");
    }

    select.onchange = update;
    c.appendChild(select);
    c.appendChild(preview);
    update();
    addActions(c, "studio936-transpose.txt", () => preview.textContent);
  }

  function renderInspire() {
    const key = currentKey();
    const ideas = [
      ["Título", "Luz en la ventana"],
      ["Tema", "volver a empezar con calma y fuerza"],
      ["Primera línea", "Abro la puerta y vuelve a respirar mi voz"],
      ["Imagen", "amanecer sobre una ciudad silenciosa"],
      ["Progresión", romanToChords(key, ["I", "V", "vi", "IV"]).join(" - ")],
      ["Groove", "medio tiempo, pulso estable, percusión suave"]
    ];
    const text = ideas.map((item) => item[0] + ": " + item[1]).join("\n");
    const c = contentPanel("inspire");

    c.appendChild(make("h3", "", "Inspire / Inspirar"));
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

    c.appendChild(make("h3", "", "Lead Sheet"));
    c.appendChild(make("pre", "s936-sp-preview", text));
    addActions(c, "studio936-lead-sheet.txt", text);
  }

  function loadLibrary() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (error) {
      return [];
    }
  }

  function saveLibrary(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function renderLibrary() {
    const c = contentPanel("library");

    c.appendChild(make("h3", "", "Library / Biblioteca"));
    c.appendChild(make("p", "s936-sp-muted", "Guarda una captura rápida de la idea actual para no perderla."));

    const save = make("button", "s936-sp-action", "Guardar snapshot");
    save.type = "button";
    save.onclick = function () {
      const items = loadLibrary();
      items.unshift(snapshot());
      saveLibrary(items.slice(0, 30));
      renderLibrary();
    };

    const actions = make("div", "s936-sp-actions");
    actions.appendChild(save);
    c.appendChild(actions);

    const items = loadLibrary();
    if (!items.length) {
      c.appendChild(make("p", "s936-sp-muted", "No hay snapshots guardados todavía."));
      return;
    }

    const grid = make("div", "s936-sp-card-grid");
    items.forEach((item, index) => {
      const text = [
        "Snapshot",
        "Title: " + item.title,
        "Key: " + item.key,
        "BPM: " + item.bpm,
        "Style: " + item.style,
        "Date: " + item.createdAt
      ].join("\n");

      const card = make("article", "s936-sp-card");
      card.appendChild(make("h4", "", item.title || "Untitled"));
      line(card, "Key:", item.key || "C");
      line(card, "BPM:", item.bpm || "");

      const cardActions = make("div", "s936-sp-actions");
      const copy = make("button", "s936-sp-action", "Copiar");
      const down = make("button", "s936-sp-action", "TXT");
      const del = make("button", "s936-sp-action", "Borrar");

      copy.type = down.type = del.type = "button";
      copy.onclick = () => copyText(text, card);
      down.onclick = () => downloadText("studio936-snapshot.txt", text);
      del.onclick = () => {
        const next = loadLibrary();
        next.splice(index, 1);
        saveLibrary(next);
        renderLibrary();
      };

      cardActions.appendChild(copy);
      cardActions.appendChild(down);
      cardActions.appendChild(del);
      card.appendChild(cardActions);
      grid.appendChild(card);
    });

    c.appendChild(grid);
  }

  function renderShare() {
    const text = textFromSnapshot();
    const c = contentPanel("share");
    c.appendChild(make("h3", "", "Share / Compartir"));
    c.appendChild(make("pre", "s936-sp-preview", text));
    addActions(c, "studio936-share.txt", text);
  }

  function renderPdf() {
    const text = textFromSnapshot() + "\n\nTip: usa Imprimir del navegador y guardar como PDF.";
    const c = contentPanel("pdf");
    c.appendChild(make("h3", "", "PDF"));
    c.appendChild(make("pre", "s936-sp-preview", text));
    addActions(c, "studio936-pdf-source.txt", text);
  }

  function renderRecord() {
    const c = contentPanel("record");
    const area = make("textarea", "s936-sp-textarea");
    const save = make("button", "s936-sp-action", "Guardar idea");

    c.appendChild(make("h3", "", "REC Idea"));
    area.placeholder = "Escribe una idea antes de que se escape: frase, melodía, groove, producción...";
    c.appendChild(area);

    save.type = "button";
    save.onclick = () => {
      const items = loadLibrary();
      items.unshift({
        title: "Idea rápida",
        author: "Studio 936",
        key: currentKey(),
        bpm: "",
        style: area.value,
        section: "idea",
        createdAt: new Date().toISOString()
      });
      saveLibrary(items.slice(0, 30));
      area.value = "";
      c.appendChild(make("p", "s936-sp-muted", "Idea guardada en Library."));
    };

    const actions = make("div", "s936-sp-actions");
    actions.appendChild(save);
    c.appendChild(actions);
  }

  function renderChordAI() {
    const key = currentKey();
    const c = contentPanel("chordAI");
    const sets = [
      ["Emocional", ["vi", "IV", "I", "V"]],
      ["Luminoso", ["I", "V", "vi", "IV"]],
      ["Puente", ["IV", "V", "vi", "V"]],
      ["Final", ["I", "IV", "V", "I"]]
    ];

    c.appendChild(make("h3", "", "Chord AI / Acordes IA"));
    sets.forEach((set) => line(c, set[0] + ":", romanToChords(key, set[1]).join(" - ")));
  }

  function renderSimple(key, title, lines) {
    const c = contentPanel(key);
    c.appendChild(make("h3", "", title));
    lines.forEach((item) => line(c, item[0] + ":", item[1]));
  }

  function route(toolKey) {
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
      drums: () => renderSimple("drums", "Drums / Batería", [["Uso", "elige groove antes de tocar audio"], ["Sugerencia", "Pop 4/4, Worship lento, Rock medio, Urbano simple"], ["Estado", "guía de producción; audio real después"]]),
      mixer: () => renderSimple("mixer", "Mixer / Mezcla", [["Uso", "balance mental de capas"], ["Capas", "voz, acordes, bajo, drums, melodía"], ["Estado", "no toca motor de audio"]]),
      midiIn: () => renderSimple("midiIn", "MIDI IN", [["Uso", "entrada desde teclado MIDI"], ["Estado", "pendiente de permisos Web MIDI"], ["Seguro", "no toca MIDI real todavía"]]),
      practice: () => renderSimple("practice", "Practice / Práctica", [["Plan", "elige sección, baja tempo, repite"], ["Hoy", "practica verso y coro con progresión base"], ["Estado", "sin tocar transport"]])
    };

    (routes[toolKey] || renderWelcome)();
  }

  function buildPanel(panel) {
    panel.textContent = "";
    panel.className = "s936-suite-pro";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Suite Pro");

    const shell = make("div", "s936-sp-shell");
    const header = make("div", "s936-sp-header");
    const title = make("h2", "s936-sp-title", "Suite Pro");
    const closeButton = make("button", "s936-sp-close", "CERRAR");

    closeButton.type = "button";
    closeButton.onclick = close;

    header.appendChild(title);
    header.appendChild(closeButton);

    const body = make("div", "s936-sp-body");
    const tools = make("nav", "s936-sp-tools");
    const content = make("section", "s936-sp-content");

    content.dataset.s936SuiteContent = "1";

    TOOLS.forEach(([key, label]) => {
      const button = make("button", "s936-sp-tool", label);
      button.type = "button";
      button.dataset.s936SuiteTool = key;
      button.onclick = () => route(key);
      tools.appendChild(button);
    });

    body.appendChild(tools);
    body.appendChild(content);
    shell.appendChild(header);
    shell.appendChild(body);
    panel.appendChild(shell);
  }

  function ensurePanel() {
    installStyles();

    let panel = byId(PANEL_ID);
    if (!panel) {
      panel = document.createElement("div");
      panel.id = PANEL_ID;
      document.body.appendChild(panel);
      buildPanel(panel);
    } else if (!panel.querySelector("[data-s936-suite-content]")) {
      buildPanel(panel);
    }

    return panel;
  }

  function setWorkspaceButton(active) {
    document.querySelectorAll("#v25UxBar .v25ux-btn").forEach((button) => {
      if (button.dataset.uxOpen === "suite") button.classList.toggle("active", !!active);
      else if (active) button.classList.remove("active");
    });
  }

  function open() {
    const panel = ensurePanel();
    panel.classList.add("s936-suite-pro-open");
    document.body.classList.add("v25ux-panel-open");
    setWorkspaceButton(true);
    if (!panel.dataset.s936SuiteVisited) {
      panel.dataset.s936SuiteVisited = "1";
      renderWelcome();
    }
    return panel;
  }

  function close() {
    const panel = byId(PANEL_ID);
    if (panel) panel.classList.remove("s936-suite-pro-open");
    setWorkspaceButton(false);

    const editorOpen = document.querySelector(".editor.ux-open");
    if (!editorOpen) document.body.classList.remove("v25ux-panel-open");
  }

  function toggle() {
    const panel = ensurePanel();
    if (panel.classList.contains("s936-suite-pro-open")) close();
    else open();
    return panel;
  }

  function isOpen() {
    return !!byId(PANEL_ID)?.classList.contains("s936-suite-pro-open");
  }

  function init() {
    ensurePanel();
  }

  window.Studio936SuitePro = {
    open,
    close,
    toggle,
    ensurePanel,
    ensureMounted: ensurePanel,
    isOpen
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
