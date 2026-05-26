// Studio 936 Composer - Clean Suite Pro module
// Scope: Suite Pro only. No MIDI, transport, playback, audio, arrangement, editor, or export changes.
(function () {
  "use strict";

  const TOOLS = [
    { key: "library", id: "v18_library", label: "Library", title: "Library / Biblioteca" },
    { key: "templates", id: "v18_templates", label: "Templates", title: "Templates / Plantillas" },
    { key: "transpose", id: "v18_transpose", label: "Transpose", title: "Transpose / Transponer" },
    { key: "scales", id: "v18_scales", label: "Scales", title: "Scales / Escalas" },
    { key: "chordAI", id: "v18_chordAI", label: "Chord AI", title: "Chord AI / Acordes IA" },
    { key: "drums", id: "v18_drums", label: "Drums", title: "Drums / Bateria" },
    { key: "mixer", id: "v18_mixer", label: "Mixer", title: "Mixer / Mezcla" },
    { key: "record", id: "v18_record", label: "REC Idea", title: "REC Idea" },
    { key: "midiIn", id: "v18_midiIn", label: "MIDI IN", title: "MIDI IN" },
    { key: "pdf", id: "v18_pdf", label: "PDF", title: "PDF" },
    { key: "lead", id: "v18_lead", label: "Lead Sheet", title: "Lead Sheet" },
    { key: "practice", id: "v18_practice", label: "Practice", title: "Practice / Practica" },
    { key: "share", id: "v18_share", label: "Share", title: "Share / Compartir" },
    { key: "inspire", id: "v18_inspire", label: "Inspire", title: "Inspire / Inspirar" },
    { key: "theory", id: "v18_theory", label: "Theory", title: "Theory / Teoria" }
  ];

  const NOTE_INDEX = {
    C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5,
    "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11
  };

  const SHARP_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const FLAT_NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  const FLAT_KEYS = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"]);

  const SCALE_INTERVALS = {
    major: [0, 2, 4, 5, 7, 9, 11],
    naturalMinor: [0, 2, 3, 5, 7, 8, 10],
    minorPentatonic: [0, 3, 5, 7, 10]
  };

  const SONG_TEMPLATES = [
    {
      key: "pop",
      name: "Pop",
      use: "Cancion directa, clara y facil de recordar.",
      energy: "Media / luminosa",
      parts: ["Intro", "Verso 1", "Pre-coro", "Coro", "Verso 2", "Pre-coro", "Coro", "Puente", "Coro final", "Outro"],
      progression: ["I", "V", "vi", "IV"]
    },
    {
      key: "worship",
      name: "Worship",
      use: "Construccion emocional con crecimiento hacia el coro.",
      energy: "Contemplativa / expansiva",
      parts: ["Intro", "Verso 1", "Verso 2", "Pre-coro", "Coro", "Interludio", "Puente", "Coro final", "Outro"],
      progression: ["I", "V", "vi", "IV"]
    },
    {
      key: "balada",
      name: "Balada",
      use: "Cancion emotiva para voz principal y desarrollo lirico.",
      energy: "Intima / emocional",
      parts: ["Intro", "Verso 1", "Coro", "Verso 2", "Coro", "Solo", "Puente", "Coro final", "Outro"],
      progression: ["vi", "IV", "I", "V"]
    },
    {
      key: "rock",
      name: "Rock",
      use: "Estructura con energia, riff y coro fuerte.",
      energy: "Alta / directa",
      parts: ["Intro riff", "Verso 1", "Coro", "Riff", "Verso 2", "Coro", "Solo", "Coro final", "Outro"],
      progression: ["I", "IV", "V", "IV"]
    },
    {
      key: "urbano",
      name: "Urbano",
      use: "Hook rapido, repeticion fuerte y espacio para flow.",
      energy: "Ritmica / moderna",
      parts: ["Intro", "Hook", "Verso 1", "Hook", "Verso 2", "Bridge", "Hook final", "Outro"],
      progression: ["vi", "IV", "I", "V"]
    },
    {
      key: "jazz",
      name: "Jazz basico",
      use: "Base armonica para colores suaves y rearmonizacion.",
      energy: "Sofisticada / flexible",
      parts: ["Intro", "Tema A", "Tema A", "Tema B", "Solo", "Tema A final", "Coda"],
      progression: ["ii", "V", "I", "vi"]
    }
  ];

  const ROMAN_TO_DEGREE = {
    I: 0,
    ii: 1,
    iii: 2,
    IV: 3,
    V: 4,
    vi: 5,
    viio: 6,
    vii: 6
  };


  function byId(id) {
    return document.getElementById(id);
  }

  function make(tagName, className, text) {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function normalizeKey(rawKey) {
    const value = String(rawKey || "").trim();
    const match = value.match(/^([A-Ga-g])([#b]?)/);
    if (!match) return "C";
    return match[1].toUpperCase() + (match[2] || "");
  }

  function detectCurrentKey() {
    const soloKey = byId("soloKey")?.value;
    const chordName = byId("chordName")?.value;
    let projectKey = "";

    if (typeof window.getProject === "function") {
      try {
        const project = window.getProject();
        projectKey = project?.soloKey || project?.key || project?.tonality || "";
      } catch (error) {
        projectKey = "";
      }
    }

    return normalizeKey(soloKey || projectKey || chordName || "C");
  }

  function preferFlats(key) {
    return key.includes("b") || FLAT_KEYS.has(key);
  }

  function localScaleNotes(key, scaleName) {
    const normalizedKey = normalizeKey(key);
    const root = NOTE_INDEX[normalizedKey];
    const intervals = SCALE_INTERVALS[scaleName] || SCALE_INTERVALS.major;
    const names = preferFlats(normalizedKey) ? FLAT_NOTES : SHARP_NOTES;

    if (root === undefined) return localScaleNotes("C", scaleName);
    return intervals.map((interval) => names[(root + interval) % 12]);
  }

  function externalScaleNotes(key, mode) {
    const theory = window.Studio936MusicTheory;
    if (!theory || typeof theory.scaleNotes !== "function") return null;

    try {
      const notes = theory.scaleNotes(key, mode);
      return Array.isArray(notes) && notes.length ? notes : null;
    } catch (error) {
      return null;
    }
  }

  function getScaleNotes(key, mode) {
    const external = externalScaleNotes(key, mode);
    if (external && external.length) return external;

    if (mode === "minor" || mode === "naturalMinor" || mode === "natural minor") {
      return localScaleNotes(key, "naturalMinor");
    }

    if (mode === "minorPentatonic" || mode === "minor pentatonic" || mode === "pentatonic") {
      return localScaleNotes(key, "minorPentatonic");
    }

    return localScaleNotes(key, "major");
  }

  function diatonicChordsFromMajorScale(notes) {
    const quality = ["", "m", "m", "", "", "m", "dim"];
    return notes.slice(0, 7).map((note, index) => note + quality[index]);
  }

  function chordsForRomanProgression(key, progression) {
    const majorNotes = getScaleNotes(key, "major").slice(0, 7);
    const chords = diatonicChordsFromMajorScale(majorNotes);

    return progression.map((degree) => {
      const index = ROMAN_TO_DEGREE[degree];
      return index === undefined ? degree : chords[index];
    });
  }

  function formatTemplateSummary(template, key) {
    const chords = chordsForRomanProgression(key, template.progression);
    return [
      "Studio 936 Composer - " + template.name,
      "Uso: " + template.use,
      "Energia: " + template.energy,
      "Tonalidad: " + key,
      "Estructura: " + template.parts.join(" / "),
      "Progresion: " + template.progression.join(" - "),
      "Acordes sugeridos: " + chords.join(" - ")
    ].join("\n");
  }

  function setStatus(content, message) {
    let status = content.querySelector(".s936-suite-status");
    if (!status) {
      status = make("p", "s936-suite-status");
      content.appendChild(status);
    }
    status.textContent = message;
  }

  function copyText(textToCopy, content) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(textToCopy)
        .then(() => setStatus(content, "Plantilla copiada al portapapeles."))
        .catch(() => setStatus(content, "No se pudo copiar automaticamente. Selecciona el texto manualmente."));
      return;
    }

    setStatus(content, "Portapapeles no disponible. Selecciona el texto manualmente.");
  }


  function removeLegacySuiteNodes(panel) {
    panel.querySelectorAll("#v18SuiteClose, #v25uxSuiteClose, .legacy-suite-close").forEach((node) => {
      node.remove();
    });
  }

  function ensureContent(panel) {
    let content = panel.querySelector("#v18SuiteContent");
    if (!content) {
      content = make("section", "v18-suite-content s936-suite-content");
      content.id = "v18SuiteContent";
      const body = panel.querySelector(".s936-suite-body") || panel;
      body.appendChild(content);
    }
    return content;
  }

  function setActiveTool(key) {
    document.querySelectorAll("#v18Suite .v18-pill").forEach((button) => {
      button.classList.toggle("active", button.dataset.v18Tool === key);
    });
  }

  function clearContent(panel, activeKey) {
    const content = ensureContent(panel);
    content.textContent = "";
    if (activeKey) setActiveTool(activeKey);
    return content;
  }

  function addLine(parent, label, value) {
    const row = make("p", "s936-suite-line");
    const strong = make("strong", "", label);
    const span = make("span", "", value);
    row.appendChild(strong);
    row.appendChild(document.createTextNode(" "));
    row.appendChild(span);
    parent.appendChild(row);
  }

  function renderWelcome(panel) {
    const content = clearContent(panel, "");
    const title = make("h3", "v18-suite-content-title", "Suite Pro");
    const text = make("p", "s936-suite-muted", "Selecciona una herramienta para abrir su modulo dentro de Suite Pro.");
    content.appendChild(title);
    content.appendChild(text);
  }

  function renderComingSoon(panel, tool) {
    const content = clearContent(panel, tool.key);
    content.appendChild(make("h3", "v18-suite-content-title", tool.title));
    content.appendChild(make("p", "s936-suite-muted", "Modulo conectado. Funcionalidad avanzada pendiente de implementar."));
    addLine(content, "Estado:", "connection ready");
    addLine(content, "Siguiente paso:", "definir contrato, entradas, salidas y prueba minima.");
  }


  function renderTemplates(panel) {
    const key = detectCurrentKey();
    const content = clearContent(panel, "templates");

    content.appendChild(make("h3", "v18-suite-content-title", "Templates / Plantillas"));
    content.appendChild(make("p", "s936-suite-muted", "Elige una estructura para empezar rapido. Por ahora no altera la cancion automaticamente: te entrega una plantilla lista para copiar y usar."));

    const list = make("div", "s936-template-list");

    SONG_TEMPLATES.forEach((template) => {
      const chords = chordsForRomanProgression(key, template.progression);
      const card = make("article", "s936-template-card");

      card.appendChild(make("h4", "s936-template-title", template.name));
      addLine(card, "Uso:", template.use);
      addLine(card, "Energia:", template.energy);
      addLine(card, "Estructura:", template.parts.join(" / "));
      addLine(card, "Progresion:", template.progression.join(" - "));
      addLine(card, "En " + key + ":", chords.join(" - "));

      const copyButton = make("button", "s936-template-copy", "Copiar plantilla");
      copyButton.type = "button";
      copyButton.onclick = function () {
        copyText(formatTemplateSummary(template, key), content);
      };

      card.appendChild(copyButton);
      list.appendChild(card);
    });

    content.appendChild(list);
  }

  function renderTheory(panel) {
    const key = detectCurrentKey();
    const major = getScaleNotes(key, "major").slice(0, 7);
    const chords = diatonicChordsFromMajorScale(major);
    const content = clearContent(panel, "theory");

    content.appendChild(make("h3", "v18-suite-content-title", "Theory / Teoria"));
    addLine(content, "Key / Tonalidad:", key);
    addLine(content, "Major scale / Escala mayor:", major.join(" "));
    addLine(content, "Diatonic chords / Acordes diatonicos:", chords.join(", "));
    content.appendChild(make("p", "s936-suite-muted", "Lectura armonica basica para orientar composicion, arreglo y transposicion."));
  }

  function renderScales(panel) {
    const key = detectCurrentKey();
    const major = getScaleNotes(key, "major");
    const naturalMinor = getScaleNotes(key, "naturalMinor");
    const minorPentatonic = getScaleNotes(key, "minorPentatonic");
    const content = clearContent(panel, "scales");

    content.appendChild(make("h3", "v18-suite-content-title", "Scales / Escalas"));
    addLine(content, "Key / Tonalidad:", key);
    addLine(content, "Major / Mayor:", major.join(" "));
    addLine(content, "Natural minor / Menor natural:", naturalMinor.join(" "));
    addLine(content, "Minor pentatonic / Pentatonica menor:", minorPentatonic.join(" "));
  }

  function bindToolButtons(panel) {
    TOOLS.forEach((tool) => {
      const button = panel.querySelector("#" + tool.id);
      if (!button) return;

      button.onclick = function () {
        const currentPanel = ensurePanel();

        if (tool.key === "theory") {
          renderTheory(currentPanel);
          return;
        }

        if (tool.key === "scales") {
          renderScales(currentPanel);
          return;
        }

        if (tool.key === "templates") {
          renderTemplates(currentPanel);
          return;
        }

        renderComingSoon(currentPanel, tool);
      };
    });
  }

  function buildPanel(panel) {
    const wasOpen = panel.classList.contains("v19-open");

    panel.textContent = "";
    panel.classList.add("v18-suite", "s936-suite");
    panel.dataset.s936SuiteClean = "1";

    const shell = make("div", "v18-suite-inner s936-suite-shell");
    const header = make("div", "s936-suite-header");
    const title = make("h2", "s936-suite-title", "Suite Pro");
    const closeButton = make("button", "b25SuiteClose v25ux-suite-close s936-suite-close", "CERRAR");

    closeButton.id = "b25SuiteClose";
    closeButton.type = "button";
    closeButton.title = "Cerrar Suite Pro";
    closeButton.onclick = close;

    header.appendChild(title);
    header.appendChild(closeButton);

    const body = make("div", "s936-suite-body");
    const grid = make("div", "v18-suite-buttons s936-suite-grid");

    TOOLS.forEach((tool) => {
      const button = make("button", "v18-pill s936-suite-tool", tool.label);
      button.id = tool.id;
      button.type = "button";
      button.dataset.v18Tool = tool.key;
      grid.appendChild(button);
    });

    const content = make("section", "v18-suite-content s936-suite-content");
    content.id = "v18SuiteContent";

    body.appendChild(grid);
    body.appendChild(content);
    shell.appendChild(header);
    shell.appendChild(body);
    panel.appendChild(shell);

    if (wasOpen) panel.classList.add("v19-open");

    bindToolButtons(panel);
    renderWelcome(panel);
  }

  function ensurePanel() {
    let panel = byId("v18Suite");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "v18Suite";
      document.body.appendChild(panel);
    }

    removeLegacySuiteNodes(panel);
    panel.classList.add("v18-suite", "s936-suite");

    const isClean = panel.dataset.s936SuiteClean === "1";
    const hasGrid = !!panel.querySelector(".s936-suite-grid");
    const hasContent = !!panel.querySelector("#v18SuiteContent");
    const hasClose = !!panel.querySelector("#b25SuiteClose");

    if (!isClean || !hasGrid || !hasContent || !hasClose) {
      buildPanel(panel);
    } else {
      bindToolButtons(panel);
      const closeButton = panel.querySelector("#b25SuiteClose");
      if (closeButton) {
        closeButton.textContent = "CERRAR";
        closeButton.onclick = close;
      }
    }

    return panel;
  }

  function open() {
    const panel = ensurePanel();
    panel.classList.add("v19-open");
    return panel;
  }

  function close() {
    const panel = byId("v18Suite");
    if (panel) panel.classList.remove("v19-open");

    const legacyToggle = byId("v19ToolsToggle");
    if (legacyToggle) legacyToggle.classList.remove("open");

    document.querySelectorAll("#v25UxBar .v25ux-btn").forEach((button) => {
      if (button.dataset.uxOpen === "suite") button.classList.remove("active");
    });
  }

  function toggle() {
    const panel = ensurePanel();
    if (panel.classList.contains("v19-open")) {
      close();
    } else {
      open();
    }
    return panel;
  }

  function install() {
    ensurePanel();
  }

  window.Studio936SuitePro = {
    open,
    close,
    toggle,
    ensurePanel,
    ensureMounted: ensurePanel
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install);
  } else {
    install();
  }
})();
