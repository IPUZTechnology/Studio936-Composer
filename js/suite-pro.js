// Studio 936 Composer - Suite Pro Professional v3
// Product goal: professional composition cockpit, not a duplicate of the main app.
// Scope: this file only owns #s936SuitePro. It does not use #v18Suite and does not touch app legacy.
(function () {
  "use strict";

  const PANEL_ID = "s936SuitePro";
  const STYLE_ID = "s936SuiteProV3Styles";
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
    ["command", "Command"],
    ["compose", "Compose"],
    ["arrange", "Arrange"],
    ["practice", "Practice"],
    ["studio", "Studio"],
    ["export", "Export"]
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
  left: 12px;
  top: 112px;
  bottom: 12px;
  width: min(430px, 92vw);
  z-index: 10060;
  display: none;
  color: #f7fbff;
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
#${PANEL_ID}.is-open { display: block; }
#${PANEL_ID}.is-max {
  left: 18px;
  right: 18px;
  top: 72px;
  bottom: 18px;
  width: auto;
}
#${PANEL_ID} * { box-sizing: border-box; }
#${PANEL_ID} .s936-sp-shell {
  height: 100%;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
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
}
#${PANEL_ID}.is-max .s936-sp-content {
  padding: 18px;
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
    }
    if (!panel.dataset.ready) buildShell(panel);
    applyMode(panel);
    return panel;
  }

  function buildShell(panel) {
    panel.textContent = "";
    panel.dataset.ready = "1";

    const shell = el("div", "s936-sp-shell");
    const header = el("header", "s936-sp-header");
    const brand = el("div", "s936-sp-brand");
    brand.appendChild(el("div", "s936-sp-kicker", "Studio 936"));
    brand.appendChild(el("h2", "s936-sp-title", "Suite Pro"));
    const actions = el("div", "s936-sp-header-actions");

    const refreshBtn = el("button", "s936-sp-icon", "SYNC");
    refreshBtn.type = "button";
    refreshBtn.onclick = () => render();

    const modeBtn = el("button", "s936-sp-icon", state.mode === "max" ? "DOCK" : "MAX");
    modeBtn.type = "button";
    modeBtn.dataset.role = "mode";
    modeBtn.onclick = () => {
      state.mode = state.mode === "max" ? "dock" : "max";
      localStorage.setItem("s936_suite_mode_v3", state.mode);
      applyMode(panel);
    };

    const closeBtn = el("button", "s936-sp-icon", "CERRAR");
    closeBtn.type = "button";
    closeBtn.onclick = close;

    actions.append(refreshBtn, modeBtn, closeBtn);
    header.append(brand, actions);

    const tabs = el("nav", "s936-sp-tabs");
    AREAS.forEach(([key, label]) => {
      const btn = el("button", "s936-sp-tab", label);
      btn.type = "button";
      btn.dataset.area = key;
      btn.onclick = () => setArea(key);
      tabs.appendChild(btn);
    });

    const content = el("section", "s936-sp-content");
    content.id = "s936SuiteProContent";

    shell.append(header, tabs, content);
    panel.appendChild(shell);
    render();
  }

  function applyMode(panel=ensurePanel()) {
    panel.classList.toggle("is-max", state.mode === "max");
    const btn = q("[data-role='mode']", panel);
    if (btn) btn.textContent = state.mode === "max" ? "DOCK" : "MAX";
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

  function hasSectionLyric(s, key) {
    return String((s.lyrics || {})[key] || "").trim().length > 0;
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

  function renderMiniChordKeyboard(parent, chordNames) {
    const board = el("div", "s936-sp-keystrip");
    const notes = ["C", "D", "E", "F", "G", "A", "B"];
    notes.forEach((note) => {
      const key = el("span", "s936-sp-key", note);
      const active = chordNames.some((name) => String(name).toUpperCase().startsWith(note));
      key.classList.toggle("active", active);
      board.appendChild(key);
    });
    parent.appendChild(board);
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

  function renderCommand() {
    const s = snapshot();
    const c = clearContent();
    title(c, "Command Center", "Vista ejecutiva de la canción: estructura, mapa armónico, estado creativo y siguiente acción.");

    const parts = commandParts(s);
    const chords = uniqueChordNames(s, 16);
    const health = el("div", "s936-sp-health");
    [
      [s.bpm || "—", "BPM"],
      [s.style || "—", "Estilo"],
      [chordCount(s), "Acordes"],
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

    const hero = el("article", "s936-sp-card important command-hero");
    hero.appendChild(el("h4", "", s.title || "Canción sin título"));
    line(hero, "Autor", s.author || "Sin autor");
    line(hero, "Instrumento", s.instrument || "—");
    line(hero, "Tonalidad guía", s.key || "C");
    line(hero, "Sección activa", s.currentSectionName || s.currentSection || "—");
    line(hero, "Acorde en pantalla", s.chordLabel || currentChordName());
    renderMiniChordKeyboard(hero, chords);
    c.appendChild(hero);

    const structure = el("section", "s936-sp-command-block");
    structure.appendChild(el("h4", "", "Estructura visual"));
    structure.appendChild(el("p", "s936-sp-muted", "Mapa rápido para ver toda la canción sin abrir el editor profundo."));
    renderCommandTimeline(structure, s);
    c.appendChild(structure);

    const harmony = el("section", "s936-sp-command-block");
    harmony.appendChild(el("h4", "", "Mapa armónico"));
    if (chords.length) {
      const chips = el("div", "s936-sp-chip-row");
      chords.forEach((name) => chips.appendChild(el("span", "s936-sp-chip", name)));
      harmony.appendChild(chips);
    } else {
      harmony.appendChild(el("p", "s936-sp-muted", "Todavía no hay acordes detectados."));
    }
    c.appendChild(harmony);

    const grid = el("div", "s936-sp-grid two");
    const next = el("article", "s936-sp-card");
    next.appendChild(el("h4", "", "Siguiente movimiento"));
    line(next, "Recomendación", commandRecommendation(s));
    line(next, "Filosofía", "Command mira; Arrange edita; Compose crea; Studio produce; Export entrega.");
    grid.appendChild(next);

    const actionsCard = el("article", "s936-sp-card");
    actionsCard.appendChild(el("h4", "", "Acciones útiles"));
    const box = actions(actionsCard);
    action(box, "Ir a Arrange", () => { state.area = "arrange"; setArea("arrange"); });
    action(box, "Lead Sheet", () => { state.area = "arrange"; state.arrangeTool = "lead"; setArea("arrange"); }, "s936-sp-btn secondary");
    action(box, "Export Center", () => { state.area = "export"; state.exportTool = "center"; setArea("export"); }, "s936-sp-btn secondary");
    grid.appendChild(actionsCard);
    c.appendChild(grid);
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

  function renderPractice() {
    const c = clearContent();
    title(c, "Practice / Play Along", "Modo de práctica contextual: acordes, notas y acompañamiento. Aquí sí tienen sentido controles de reproducción.");

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
    controls.appendChild(el("h4", "", "Control de práctica"));
    controls.appendChild(el("p", "s936-sp-muted", "Usa esto cuando quieres practicar encima del groove. No reemplaza el editor: acompaña tu interpretación."));
    const box = actions(controls);
    action(box, "Start Groove", () => callBridge("startGroove", () => byId("playBtn")?.click()));
    action(box, "Canción completa", () => callBridge("playFullSong", () => byId("playSongBtn")?.click()), "s936-sp-btn secondary");
    action(box, "Stop", () => callBridge("stopPlayback", () => byId("playBtn")?.click()), "s936-sp-btn danger");
    action(box, state.drum.playing ? "Stop Drums" : "Drums guía", () => toggleDrums(), "s936-sp-btn warn");
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
    if (state.studioTool === "mixer") return renderMixer(c);
    if (state.studioTool === "record") return renderRecord(c);
    if (state.studioTool === "midi") return renderMidi(c);
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
    title(c, "Library", "Guarda snapshots reales de la canción. Puedes cargar un snapshot reemplazando la canción actual con recarga controlada.");
    const box = actions(c);
    action(box, "Guardar snapshot real", () => {
      const items = loadLibrary();
      const s = snapshot();
      items.unshift({
        id: "snap-" + Date.now(),
        title: s.title || "Sin título",
        author: s.author || "",
        bpm: s.bpm || "",
        style: s.style || "",
        createdAt: new Date().toISOString(),
        snapshot: s,
        fullText: fullSongText(),
        projectJson: projectJson()
      });
      saveLibrary(items.slice(0, 40));
      renderLibrary(c);
      toast("Snapshot guardado.");
    }, "s936-sp-btn warn");

    const items = loadLibrary();
    if (!items.length) {
      c.appendChild(el("p", "s936-sp-muted", "No hay snapshots todavía."));
      return;
    }
    const grid = el("div", "s936-sp-grid");
    items.forEach((item) => {
      const card = el("article", "s936-sp-card");
      card.appendChild(el("h4", "", item.title || "Snapshot"));
      line(card, "Fecha", new Date(item.createdAt).toLocaleString());
      line(card, "BPM", item.bpm || "—");
      line(card, "Estilo", item.style || "—");
      const act = actions(card);
      action(act, "Cargar", () => loadSnapshotIntoApp(item), "s936-sp-btn warn");
      action(act, "TXT", () => downloadText(slug(item.title) + ".txt", item.fullText || ""), "s936-sp-btn secondary");
      action(act, "JSON", () => downloadText(slug(item.title) + ".json", item.projectJson || "{}", "application/json;charset=utf-8"), "s936-sp-btn secondary");
      action(act, "Borrar", () => {
        saveLibrary(loadLibrary().filter((x) => x.id !== item.id));
        renderLibrary(c);
      }, "s936-sp-btn danger");
      grid.appendChild(card);
    });
    c.appendChild(grid);
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

  function open() {
    const panel = ensurePanel();
    state.open = true;
    panel.classList.add("is-open");
    render();
    return panel;
  }

  function close() {
    const panel = byId(PANEL_ID);
    state.open = false;
    if (panel) panel.classList.remove("is-open");
  }

  function toggle() {
    const panel = ensurePanel();
    if (panel.classList.contains("is-open")) close(); else open();
    return panel;
  }

  window.Studio936SuitePro = {
    version: "professional-v3",
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
