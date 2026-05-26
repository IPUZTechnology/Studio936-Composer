// Studio 936 Composer - Suite Pro Composer Tools
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
    minorPentatonic: [0, 3, 5, 7, 10],
    majorPentatonic: [0, 2, 4, 7, 9],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    mixolydian: [0, 2, 4, 5, 7, 9, 10]
  };

  const ROMAN_TO_DEGREE = {
    I: 0,
    ii: 1,
    iii: 2,
    IV: 3,
    V: 4,
    vi: 5,
    "vii": 6,
    "vii°": 6,
    viio: 6
  };

  const SONG_TEMPLATES = [
    {
      key: "pop",
      name: "Pop",
      use: "Cancion directa, clara y facil de recordar.",
      energy: "Media / luminosa",
      parts: ["Intro", "Verso 1", "Pre-coro", "Coro", "Verso 2", "Pre-coro", "Coro", "Puente", "Coro final", "Outro"],
      progression: ["I", "V", "vi", "IV"],
      writingPrompt: "Escribe un verso con imagen concreta y un coro con una frase corta que se pueda repetir."
    },
    {
      key: "worship",
      name: "Worship",
      use: "Construccion emocional con crecimiento hacia el coro.",
      energy: "Contemplativa / expansiva",
      parts: ["Intro", "Verso 1", "Verso 2", "Pre-coro", "Coro", "Interludio", "Puente", "Puente", "Coro final", "Outro"],
      progression: ["I", "V", "vi", "IV"],
      writingPrompt: "Deja que el verso sea intimo, el pre-coro levante, y el coro sea declarativo."
    },
    {
      key: "balada",
      name: "Balada",
      use: "Cancion emotiva para voz principal y desarrollo lirico.",
      energy: "Intima / emocional",
      parts: ["Intro", "Verso 1", "Coro", "Verso 2", "Coro", "Solo", "Puente", "Coro final", "Outro"],
      progression: ["vi", "IV", "I", "V"],
      writingPrompt: "Empieza con una confesion simple y reserva la frase mas fuerte para el coro."
    },
    {
      key: "rock",
      name: "Rock",
      use: "Estructura con energia, riff y coro fuerte.",
      energy: "Alta / directa",
      parts: ["Intro riff", "Verso 1", "Coro", "Riff", "Verso 2", "Coro", "Solo", "Coro final", "Outro"],
      progression: ["I", "IV", "V", "IV"],
      writingPrompt: "Usa verbos fuertes, frases cortas y un coro que golpee desde la primera linea."
    },
    {
      key: "urbano",
      name: "Urbano",
      use: "Hook rapido, repeticion fuerte y espacio para flow.",
      energy: "Ritmica / moderna",
      parts: ["Intro", "Hook", "Verso 1", "Hook", "Verso 2", "Bridge", "Hook final", "Outro"],
      progression: ["vi", "IV", "I", "V"],
      writingPrompt: "Construye el hook primero. El verso debe responder o contrastar con el hook."
    },
    {
      key: "jazz",
      name: "Jazz basico",
      use: "Base armonica para colores suaves y rearmonizacion.",
      energy: "Sofisticada / flexible",
      parts: ["Intro", "Tema A", "Tema A", "Tema B", "Solo", "Tema A final", "Coda"],
      progression: ["ii", "V", "I", "vi"],
      writingPrompt: "Piensa en melodia cantable, espacios, y final con color mayor 7 o menor 9."
    }
  ];

  const PROGRESSION_IDEAS = [
    { name: "Himno luminoso", emotion: "esperanza", roman: ["I", "V", "vi", "IV"] },
    { name: "Balada profunda", emotion: "nostalgia", roman: ["vi", "IV", "I", "V"] },
    { name: "Movimiento clasico", emotion: "resolucion", roman: ["I", "vi", "IV", "V"] },
    { name: "Puente ascendente", emotion: "crecimiento", roman: ["IV", "V", "vi", "V"] },
    { name: "Color suave", emotion: "introspeccion", roman: ["ii", "V", "I", "vi"] },
    { name: "Coro abierto", emotion: "expansion", roman: ["IV", "I", "V", "vi"] }
  ];

  const INSPIRE_SEEDS = [
    {
      title: "Ventana al amanecer",
      theme: "renacer despues de una noche pesada",
      line: "Abro la ventana y vuelve mi voz",
      image: "luz tibia entrando sobre una habitacion en silencio",
      groove: "balada pop 72-84 BPM"
    },
    {
      title: "Agua clara",
      theme: "limpiar el pasado y caminar liviano",
      line: "Lo que pesaba se fue con el rio",
      image: "agua moviendose sobre piedras pequenas",
      groove: "worship / pop 78-92 BPM"
    },
    {
      title: "Ciudad encendida",
      theme: "seguir el llamado en medio del ruido",
      line: "Entre mil luces te pude escuchar",
      image: "neon, lluvia y pasos decididos",
      groove: "urbano suave 88-102 BPM"
    },
    {
      title: "Raiz y cielo",
      theme: "volver a lo esencial sin perder la vision",
      line: "Mis raices cantan mirando al cielo",
      image: "arbol firme bajo viento limpio",
      groove: "folk rock 90-110 BPM"
    },
    {
      title: "Noches de fuego",
      theme: "energia, decision y liberacion",
      line: "Esta noche no vuelvo a apagarme",
      image: "escenario oscuro con una luz dorada",
      groove: "rock / pop 112-128 BPM"
    }
  ];

  const STORAGE_KEY = "studio936:suitePro:snapshots";
  const IDEA_KEY = "studio936:suitePro:ideas";

  function byId(id) {
    return document.getElementById(id);
  }

  function make(tagName, className, text) {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function getValue(selectors) {
    for (const selector of selectors) {
      const node = document.querySelector(selector);
      if (!node) continue;
      const value = "value" in node ? node.value : node.textContent;
      if (value && String(value).trim()) return String(value).trim();
    }
    return "";
  }

  function getProjectSafe() {
    if (typeof window.getProject !== "function") return null;
    try {
      return window.getProject();
    } catch (error) {
      return null;
    }
  }

  function normalizeKey(rawKey) {
    const value = String(rawKey || "").trim();
    const match = value.match(/^([A-Ga-g])([#b]?)/);
    if (!match) return "C";
    return match[1].toUpperCase() + (match[2] || "");
  }

  function detectCurrentKey() {
    const project = getProjectSafe();
    const soloKey = byId("soloKey")?.value;
    const chordName = byId("chordName")?.value;
    const domKey = getValue(["#songKey", "#keySelect", "[name='key']", "[data-song-key]"]);
    const projectKey = project?.soloKey || project?.key || project?.tonality || project?.root || "";
    return normalizeKey(soloKey || projectKey || domKey || chordName || "C");
  }

  function detectBpm() {
    const project = getProjectSafe();
    return String(project?.bpm || project?.tempo || getValue(["#bpmDisplay", "#bpm", "#bpmSlider"]) || "90");
  }

  function detectTitle() {
    const project = getProjectSafe();
    return project?.title || getValue(["#songTitle", "#songTitleInput", ".song-title-input", "[name='title']"]) || "Untitled Studio 936 Song";
  }

  function detectAuthor() {
    const project = getProjectSafe();
    return project?.author || getValue(["#songAuthor", "#authorInput", ".author-input", "[name='author']"]) || "Studio 936";
  }

  function detectStyle() {
    const project = getProjectSafe();
    return project?.style || project?.groove || getValue(["#styleSelect", "#songStyle", ".style-select", "[name='style']"]) || "Libre";
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

    if (mode === "majorPentatonic" || mode === "major pentatonic") {
      return localScaleNotes(key, "majorPentatonic");
    }

    if (mode === "dorian") {
      return localScaleNotes(key, "dorian");
    }

    if (mode === "mixolydian") {
      return localScaleNotes(key, "mixolydian");
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

  function filenameSafe(value) {
    return String(value || "studio936")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "studio936";
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

  function copyText(textToCopy, content) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(textToCopy)
        .then(() => setStatus(content, "Copiado al portapapeles."))
        .catch(() => setStatus(content, "No se pudo copiar automaticamente. Selecciona el texto manualmente."));
      return;
    }

    const helper = document.createElement("textarea");
    helper.value = textToCopy;
    helper.setAttribute("readonly", "readonly");
    helper.style.position = "fixed";
    helper.style.left = "-9999px";
    document.body.appendChild(helper);
    helper.select();

    try {
      document.execCommand("copy");
      setStatus(content, "Copiado al portapapeles.");
    } catch (error) {
      setStatus(content, "No se pudo copiar automaticamente. Selecciona el texto manualmente.");
    }

    helper.remove();
  }

  function loadJsonList(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function saveJsonList(key, list) {
    localStorage.setItem(key, JSON.stringify(list));
  }

  function getSongSnapshot() {
    const project = getProjectSafe();
    return {
      title: detectTitle(),
      author: detectAuthor(),
      key: detectCurrentKey(),
      bpm: detectBpm(),
      style: detectStyle(),
      savedAt: new Date().toISOString(),
      project: project || null
    };
  }

  function snapshotText(snapshot) {
    return [
      "Studio 936 Composer Snapshot",
      "Titulo: " + snapshot.title,
      "Autor: " + snapshot.author,
      "Tonalidad: " + snapshot.key,
      "BPM: " + snapshot.bpm,
      "Estilo: " + snapshot.style,
      "Guardado: " + snapshot.savedAt,
      "",
      "JSON:",
      JSON.stringify(snapshot.project || snapshot, null, 2)
    ].join("\n");
  }

  function getProjectParts() {
    const project = getProjectSafe();
    const candidates = [
      project?.arrangement?.parts,
      project?.arrangement,
      project?.parts,
      window.projectArrangement?.parts,
      window.projectArrangement
    ];

    for (const value of candidates) {
      if (Array.isArray(value) && value.length) {
        return value.map((part, index) => {
          if (typeof part === "string") return { label: part, section: part };
          return {
            label: part.label || part.name || part.title || ("Parte " + (index + 1)),
            section: part.section || part.type || part.key || "",
            chords: part.chords || part.progression || null,
            lyrics: part.lyrics || ""
          };
        });
      }
    }

    return [];
  }

  function fallbackParts() {
    return ["Intro", "Verso 1", "Pre-coro", "Coro", "Verso 2", "Coro", "Puente", "Coro final", "Outro"]
      .map((label) => ({ label, section: label }));
  }

  function makeLeadSheetText() {
    const title = detectTitle();
    const author = detectAuthor();
    const key = detectCurrentKey();
    const bpm = detectBpm();
    const style = detectStyle();
    const parts = getProjectParts();
    const safeParts = parts.length ? parts : fallbackParts();
    const basicChords = chordsForRomanProgression(key, ["I", "V", "vi", "IV"]);

    const lines = [
      title,
      "Autor: " + author,
      "Tonalidad: " + key + " | BPM: " + bpm + " | Estilo: " + style,
      "",
      "Forma / Lead Sheet",
      "-------------------"
    ];

    safeParts.forEach((part, index) => {
      const label = part.label || ("Parte " + (index + 1));
      const chords = Array.isArray(part.chords) && part.chords.length ? part.chords.join(" - ") : basicChords.join(" - ");
      lines.push((index + 1) + ". " + label + "  |  " + chords);
      if (part.lyrics) lines.push("   Letra: " + part.lyrics);
    });

    lines.push("");
    lines.push("Notas del arreglista:");
    lines.push("- Mantener el coro con la frase mas fuerte.");
    lines.push("- Revisar si el puente debe subir intensidad o bajar a intimidad.");
    lines.push("- Probar final con repeticion del ultimo coro.");

    return lines.join("\n");
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
      "Acordes sugeridos: " + chords.join(" - "),
      "Prompt de escritura: " + template.writingPrompt
    ].join("\n");
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

  function setStatus(content, message) {
    let status = content.querySelector(".s936-suite-status");
    if (!status) {
      status = make("p", "s936-suite-status");
      content.appendChild(status);
    }
    status.textContent = message;
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

  function addActions(parent, actions) {
    const row = make("div", "s936-suite-actions");
    actions.forEach((action) => {
      const button = make("button", "s936-suite-action", action.label);
      button.type = "button";
      button.onclick = action.onClick;
      row.appendChild(button);
    });
    parent.appendChild(row);
    return row;
  }

  function addPreview(parent, text) {
    const pre = make("pre", "s936-suite-preview", text);
    parent.appendChild(pre);
    return pre;
  }

  function renderWelcome(panel) {
    const content = clearContent(panel, "");
    content.appendChild(make("h3", "v18-suite-content-title", "Suite Pro"));
    content.appendChild(make("p", "s936-suite-muted", "Herramientas rapidas para componer, organizar y exportar ideas sin salir del flujo."));
    content.appendChild(make("p", "s936-suite-muted", "Empieza por Templates, Inspire, Transpose o Lead Sheet."));
  }

  function renderComingSoon(panel, tool) {
    const content = clearContent(panel, tool.key);
    content.appendChild(make("h3", "v18-suite-content-title", tool.title));
    content.appendChild(make("p", "s936-suite-muted", "Modulo conectado y reservado para una fase avanzada."));
    addLine(content, "Uso previsto:", tool.title + " ayudara al flujo de composicion cuando el nucleo este estable.");
    addLine(content, "Estado:", "pendiente de implementacion profunda.");
  }

  function renderLibrary(panel) {
    const content = clearContent(panel, "library");
    const snapshots = loadJsonList(STORAGE_KEY);

    content.appendChild(make("h3", "v18-suite-content-title", "Library / Biblioteca"));
    content.appendChild(make("p", "s936-suite-muted", "Guarda snapshots rapidos de tu cancion sin tocar el sistema principal de guardado. Ideal para versiones, ideas y borradores."));

    addActions(content, [
      {
        label: "Guardar snapshot",
        onClick: function () {
          const list = loadJsonList(STORAGE_KEY);
          const snapshot = getSongSnapshot();
          snapshot.id = Date.now();
          list.unshift(snapshot);
          saveJsonList(STORAGE_KEY, list.slice(0, 25));
          renderLibrary(panel);
        }
      },
      {
        label: "Descargar snapshot actual",
        onClick: function () {
          const snapshot = getSongSnapshot();
          downloadText(filenameSafe(snapshot.title) + "-snapshot.txt", snapshotText(snapshot));
        }
      }
    ]);

    if (!snapshots.length) {
      content.appendChild(make("p", "s936-suite-muted", "Todavia no hay snapshots guardados."));
      return;
    }

    const list = make("div", "s936-template-list");
    snapshots.forEach((snapshot) => {
      const card = make("article", "s936-template-card");
      card.appendChild(make("h4", "s936-template-title", snapshot.title || "Sin titulo"));
      addLine(card, "Key:", snapshot.key || "C");
      addLine(card, "BPM:", snapshot.bpm || "-");
      addLine(card, "Estilo:", snapshot.style || "-");
      addLine(card, "Fecha:", new Date(snapshot.savedAt).toLocaleString());

      addActions(card, [
        {
          label: "Copiar",
          onClick: function () {
            copyText(snapshotText(snapshot), content);
          }
        },
        {
          label: "Descargar",
          onClick: function () {
            downloadText(filenameSafe(snapshot.title) + "-snapshot.txt", snapshotText(snapshot));
          }
        },
        {
          label: "Borrar",
          onClick: function () {
            const next = loadJsonList(STORAGE_KEY).filter((item) => item.id !== snapshot.id);
            saveJsonList(STORAGE_KEY, next);
            renderLibrary(panel);
          }
        }
      ]);

      list.appendChild(card);
    });

    content.appendChild(list);
  }

  function renderTemplates(panel) {
    const key = detectCurrentKey();
    const content = clearContent(panel, "templates");

    content.appendChild(make("h3", "v18-suite-content-title", "Templates / Plantillas"));
    content.appendChild(make("p", "s936-suite-muted", "Elige una estructura para componer rapido. No altera la cancion automaticamente: copia o descarga la plantilla y usala como mapa de trabajo."));

    const list = make("div", "s936-template-list");

    SONG_TEMPLATES.forEach((template) => {
      const chords = chordsForRomanProgression(key, template.progression);
      const summary = formatTemplateSummary(template, key);
      const card = make("article", "s936-template-card");

      card.appendChild(make("h4", "s936-template-title", template.name));
      addLine(card, "Uso:", template.use);
      addLine(card, "Energia:", template.energy);
      addLine(card, "Estructura:", template.parts.join(" / "));
      addLine(card, "Progresion:", template.progression.join(" - "));
      addLine(card, "En " + key + ":", chords.join(" - "));
      addLine(card, "Escritura:", template.writingPrompt);

      addActions(card, [
        {
          label: "Copiar",
          onClick: function () {
            copyText(summary, content);
          }
        },
        {
          label: "Descargar TXT",
          onClick: function () {
            downloadText("template-" + filenameSafe(template.name) + "-" + key + ".txt", summary);
          }
        }
      ]);

      list.appendChild(card);
    });

    content.appendChild(list);
  }

  function renderTranspose(panel) {
    const currentKey = detectCurrentKey();
    const content = clearContent(panel, "transpose");
    content.appendChild(make("h3", "v18-suite-content-title", "Transpose / Transponer"));
    content.appendChild(make("p", "s936-suite-muted", "Vista previa segura para adaptar una idea a otra tonalidad sin modificar la cancion todavia."));

    const controls = make("div", "s936-suite-controls");
    const label = make("label", "s936-suite-control-label", "Nueva tonalidad");
    const select = make("select", "s936-suite-select");
    const keys = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

    keys.forEach((key) => {
      const option = make("option", "", key);
      option.value = key;
      if (key === currentKey) option.selected = true;
      select.appendChild(option);
    });

    controls.appendChild(label);
    controls.appendChild(select);
    content.appendChild(controls);

    const output = make("div", "s936-suite-box");
    content.appendChild(output);

    function updatePreview() {
      output.textContent = "";
      const targetKey = select.value;
      const major = getScaleNotes(targetKey, "major").slice(0, 7);
      const chords = diatonicChordsFromMajorScale(major);
      const progression = chordsForRomanProgression(targetKey, ["I", "V", "vi", "IV"]);
      const text = [
        "Transposicion segura",
        "Actual: " + currentKey,
        "Destino: " + targetKey,
        "Escala mayor: " + major.join(" "),
        "Acordes diatonicos: " + chords.join(", "),
        "Progresion base I-V-vi-IV: " + progression.join(" - ")
      ].join("\n");

      addLine(output, "Actual:", currentKey);
      addLine(output, "Destino:", targetKey);
      addLine(output, "Escala:", major.join(" "));
      addLine(output, "I-V-vi-IV:", progression.join(" - "));
      addPreview(output, text);

      addActions(output, [
        {
          label: "Copiar preview",
          onClick: function () {
            copyText(text, content);
          }
        },
        {
          label: "Descargar TXT",
          onClick: function () {
            downloadText("transpose-" + currentKey + "-to-" + targetKey + ".txt", text);
          }
        }
      ]);
    }

    select.onchange = updatePreview;
    updatePreview();
  }

  function renderScales(panel) {
    const key = detectCurrentKey();
    const content = clearContent(panel, "scales");
    const major = getScaleNotes(key, "major");
    const naturalMinor = getScaleNotes(key, "naturalMinor");
    const minorPentatonic = getScaleNotes(key, "minorPentatonic");
    const majorPentatonic = getScaleNotes(key, "majorPentatonic");
    const dorian = getScaleNotes(key, "dorian");
    const mixolydian = getScaleNotes(key, "mixolydian");

    content.appendChild(make("h3", "v18-suite-content-title", "Scales / Escalas"));
    addLine(content, "Key / Tonalidad:", key);
    addLine(content, "Major / Mayor:", major.join(" "));
    addLine(content, "Natural minor / Menor natural:", naturalMinor.join(" "));
    addLine(content, "Minor pentatonic / Pentatonica menor:", minorPentatonic.join(" "));
    addLine(content, "Major pentatonic / Pentatonica mayor:", majorPentatonic.join(" "));
    addLine(content, "Dorian / Dorico:", dorian.join(" "));
    addLine(content, "Mixolydian / Mixolidio:", mixolydian.join(" "));
    content.appendChild(make("p", "s936-suite-muted", "Para solo rapido: empieza con pentatonica, aterriza en notas del acorde y usa la mayor para resolver."));
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
    addLine(content, "Funciones:", "I tonica, IV subdominante, V dominante, vi relativo menor.");
    addLine(content, "Movimiento fuerte:", "I - V - vi - IV / vi - IV - I - V / ii - V - I.");
    content.appendChild(make("p", "s936-suite-muted", "Usa I para casa, V para tension, IV para apertura y vi para emocion."));
  }

  function renderChordAI(panel) {
    const key = detectCurrentKey();
    const content = clearContent(panel, "chordAI");
    content.appendChild(make("h3", "v18-suite-content-title", "Chord AI / Acordes IA"));
    content.appendChild(make("p", "s936-suite-muted", "Sugerencias locales de progresion. No usa IA externa todavia, pero sirve para salir del bloqueo."));

    const list = make("div", "s936-template-list");
    PROGRESSION_IDEAS.forEach((idea) => {
      const chords = chordsForRomanProgression(key, idea.roman);
      const text = idea.name + "\nEmocion: " + idea.emotion + "\n" + idea.roman.join(" - ") + "\n" + chords.join(" - ");
      const card = make("article", "s936-template-card");
      card.appendChild(make("h4", "s936-template-title", idea.name));
      addLine(card, "Emocion:", idea.emotion);
      addLine(card, "Romanos:", idea.roman.join(" - "));
      addLine(card, "En " + key + ":", chords.join(" - "));
      addActions(card, [
        {
          label: "Copiar",
          onClick: function () {
            copyText(text, content);
          }
        }
      ]);
      list.appendChild(card);
    });

    content.appendChild(list);
  }

  function renderDrums(panel) {
    const content = clearContent(panel, "drums");
    content.appendChild(make("h3", "v18-suite-content-title", "Drums / Bateria"));
    content.appendChild(make("p", "s936-suite-muted", "Mapa rapido de grooves para decidir energia antes de producir."));
    [
      ["Balada 6/8", "68-78 BPM", "Kick suave, snare en 4, platillos abiertos en coro."],
      ["Pop 4/4", "92-112 BPM", "Kick estable, clap/snare en 2 y 4, hats con variacion."],
      ["Worship lento", "70-86 BPM", "Build por capas: pad, bombo, toms, coro abierto."],
      ["Rock medio", "105-126 BPM", "Backbeat fuerte y fills antes del coro."],
      ["Urbano suave", "86-102 BPM", "Kick sincopado, clap seco, percusion minimal."]
    ].forEach((row) => {
      const card = make("article", "s936-template-card");
      card.appendChild(make("h4", "s936-template-title", row[0]));
      addLine(card, "Tempo:", row[1]);
      addLine(card, "Idea:", row[2]);
      content.appendChild(card);
    });
  }

  function renderMixer(panel) {
    const content = clearContent(panel, "mixer");
    content.appendChild(make("h3", "v18-suite-content-title", "Mixer / Mezcla"));
    content.appendChild(make("p", "s936-suite-muted", "Checklist de mezcla para maqueta. No toca el motor de audio todavia."));
    [
      ["Voz / melodia", "Debe sentirse al frente."],
      ["Acordes", "Bajar si compiten con la voz."],
      ["Bajo", "Debe sostener raiz sin tapar el bombo."],
      ["Drums", "Subir solo si empuja la emocion."],
      ["Master", "Dejar margen. No aplastar la maqueta."]
    ].forEach((item) => addLine(content, item[0] + ":", item[1]));
  }

  function renderRecord(panel) {
    const content = clearContent(panel, "record");
    content.appendChild(make("h3", "v18-suite-content-title", "REC Idea"));
    content.appendChild(make("p", "s936-suite-muted", "Captura rapida de idea en texto. Audio real se deja para una fase posterior."));

    const textarea = make("textarea", "s936-suite-textarea");
    textarea.placeholder = "Ej: coro con frase 'vuelvo a respirar', ritmo balada, subir a Bb en coro final...";
    content.appendChild(textarea);

    addActions(content, [
      {
        label: "Guardar idea",
        onClick: function () {
          const value = textarea.value.trim();
          if (!value) {
            setStatus(content, "Escribe una idea primero.");
            return;
          }

          const ideas = loadJsonList(IDEA_KEY);
          ideas.unshift({
            id: Date.now(),
            text: value,
            title: detectTitle(),
            key: detectCurrentKey(),
            createdAt: new Date().toISOString()
          });
          saveJsonList(IDEA_KEY, ideas.slice(0, 50));
          textarea.value = "";
          renderRecord(panel);
        }
      }
    ]);

    const ideas = loadJsonList(IDEA_KEY);
    if (!ideas.length) return;

    const list = make("div", "s936-template-list");
    ideas.slice(0, 8).forEach((idea) => {
      const card = make("article", "s936-template-card");
      card.appendChild(make("h4", "s936-template-title", new Date(idea.createdAt).toLocaleString()));
      card.appendChild(make("p", "s936-suite-muted", idea.text));
      addActions(card, [
        {
          label: "Copiar",
          onClick: function () {
            copyText(idea.text, content);
          }
        },
        {
          label: "Borrar",
          onClick: function () {
            saveJsonList(IDEA_KEY, loadJsonList(IDEA_KEY).filter((item) => item.id !== idea.id));
            renderRecord(panel);
          }
        }
      ]);
      list.appendChild(card);
    });
    content.appendChild(list);
  }

  function renderMidiIn(panel) {
    const content = clearContent(panel, "midiIn");
    content.appendChild(make("h3", "v18-suite-content-title", "MIDI IN"));
    const available = !!navigator.requestMIDIAccess;
    addLine(content, "Web MIDI:", available ? "disponible en este navegador" : "no disponible en este navegador");
    content.appendChild(make("p", "s936-suite-muted", "Fase segura: diagnostico solamente. La captura real de acordes se conecta despues para no tocar transport ni editor."));
  }

  function renderPdf(panel) {
    const content = clearContent(panel, "pdf");
    content.appendChild(make("h3", "v18-suite-content-title", "PDF / Documento"));
    content.appendChild(make("p", "s936-suite-muted", "Salida segura en TXT por ahora. PDF real se puede hacer despues con flujo de impresion."));
    const leadText = makeLeadSheetText();

    addActions(content, [
      {
        label: "Descargar TXT",
        onClick: function () {
          downloadText(filenameSafe(detectTitle()) + "-chart.txt", leadText);
        }
      },
      {
        label: "Copiar",
        onClick: function () {
          copyText(leadText, content);
        }
      },
      {
        label: "Imprimir navegador",
        onClick: function () {
          window.print();
        }
      }
    ]);

    addPreview(content, leadText);
  }

  function renderLeadSheet(panel) {
    const content = clearContent(panel, "lead");
    const leadText = makeLeadSheetText();

    content.appendChild(make("h3", "v18-suite-content-title", "Lead Sheet"));
    content.appendChild(make("p", "s936-suite-muted", "Hoja guia rapida para tocar o ensayar. Usa arreglo si esta disponible; si no, crea una forma base."));
    addActions(content, [
      {
        label: "Copiar",
        onClick: function () {
          copyText(leadText, content);
        }
      },
      {
        label: "Descargar TXT",
        onClick: function () {
          downloadText(filenameSafe(detectTitle()) + "-lead-sheet.txt", leadText);
        }
      }
    ]);
    addPreview(content, leadText);
  }

  function renderPractice(panel) {
    const content = clearContent(panel, "practice");
    const bpm = detectBpm();
    const parts = getProjectParts();
    const safeParts = parts.length ? parts : fallbackParts();

    content.appendChild(make("h3", "v18-suite-content-title", "Practice / Practica"));
    content.appendChild(make("p", "s936-suite-muted", "Plan rapido de ensayo sin tocar transport."));
    addLine(content, "Tempo actual:", bpm + " BPM");
    addLine(content, "Calentar:", "tocar progresion I-V-vi-IV a " + Math.max(50, Number(bpm) - 15 || 70) + " BPM.");
    addLine(content, "Repetir:", "coro 5 veces, cada vez con mas claridad vocal.");
    addLine(content, "Secciones:", safeParts.map((part) => part.label).join(" / "));
  }

  function renderShare(panel) {
    const content = clearContent(panel, "share");
    const snapshot = getSongSnapshot();
    const text = snapshotText(snapshot);

    content.appendChild(make("h3", "v18-suite-content-title", "Share / Compartir"));
    content.appendChild(make("p", "s936-suite-muted", "Paquete rapido para enviar a otro musico o guardar fuera de la app."));
    addActions(content, [
      {
        label: "Copiar resumen",
        onClick: function () {
          copyText(text, content);
        }
      },
      {
        label: "Descargar TXT",
        onClick: function () {
          downloadText(filenameSafe(snapshot.title) + "-share.txt", text);
        }
      },
      {
        label: "Descargar JSON",
        onClick: function () {
          downloadText(filenameSafe(snapshot.title) + "-share.json", JSON.stringify(snapshot, null, 2));
        }
      }
    ]);
    addPreview(content, text);
  }

  function renderInspire(panel) {
    const key = detectCurrentKey();
    const content = clearContent(panel, "inspire");
    content.appendChild(make("h3", "v18-suite-content-title", "Inspire / Inspirar"));

    const box = make("div", "s936-suite-box");
    content.appendChild(box);

    function generate() {
      box.textContent = "";
      const seed = INSPIRE_SEEDS[Math.floor(Math.random() * INSPIRE_SEEDS.length)];
      const progression = PROGRESSION_IDEAS[Math.floor(Math.random() * PROGRESSION_IDEAS.length)];
      const chords = chordsForRomanProgression(key, progression.roman);
      const text = [
        "Titulo: " + seed.title,
        "Tema: " + seed.theme,
        "Frase inicial: " + seed.line,
        "Imagen: " + seed.image,
        "Groove: " + seed.groove,
        "Tonalidad: " + key,
        "Progresion: " + progression.roman.join(" - "),
        "Acordes: " + chords.join(" - ")
      ].join("\n");

      addLine(box, "Titulo:", seed.title);
      addLine(box, "Tema:", seed.theme);
      addLine(box, "Frase:", seed.line);
      addLine(box, "Imagen:", seed.image);
      addLine(box, "Groove:", seed.groove);
      addLine(box, "Acordes:", chords.join(" - "));
      addActions(box, [
        {
          label: "Copiar idea",
          onClick: function () {
            copyText(text, content);
          }
        },
        {
          label: "Descargar TXT",
          onClick: function () {
            downloadText("inspire-" + filenameSafe(seed.title) + ".txt", text);
          }
        }
      ]);
    }

    addActions(content, [
      {
        label: "Nueva idea",
        onClick: generate
      }
    ]);

    generate();
  }

  const RENDERERS = {
    library: renderLibrary,
    templates: renderTemplates,
    transpose: renderTranspose,
    scales: renderScales,
    chordAI: renderChordAI,
    drums: renderDrums,
    mixer: renderMixer,
    record: renderRecord,
    midiIn: renderMidiIn,
    pdf: renderPdf,
    lead: renderLeadSheet,
    practice: renderPractice,
    share: renderShare,
    inspire: renderInspire,
    theory: renderTheory
  };

  function bindToolButtons(panel) {
    TOOLS.forEach((tool) => {
      const button = panel.querySelector("#" + tool.id);
      if (!button) return;

      button.onclick = function () {
        const currentPanel = ensurePanel();
        const renderer = RENDERERS[tool.key] || renderComingSoon;
        renderer(currentPanel, tool);
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
