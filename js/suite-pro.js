// Studio 936 Composer - Suite Pro Professional Command Center v2
// Isolated module. Uses #s936SuitePro only. Does not touch #v18Suite.
// Scope: Suite Pro UI + safe bridge calls. No direct audio engine, MIDI engine, transport internals, editor internals, or arrangement internals.
(function () {
  "use strict";

  const PANEL_ID = "s936SuitePro";
  const STYLE_ID = "s936SuiteProProStyles";
  const STORAGE_KEY = "studio936_suite_pro_library_v2";

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

  const TOOL_GROUPS = [
    {
      title: "Command",
      tools: [
        ["dashboard", "Dashboard"],
        ["practice", "Practice"],
        ["export", "Export Center"]
      ]
    },
    {
      title: "Compose",
      tools: [
        ["templates", "Templates"],
        ["inspire", "Inspire"],
        ["chordAI", "Chord AI"],
        ["transpose", "Transpose"],
        ["theory", "Theory"],
        ["scales", "Scales"]
      ]
    },
    {
      title: "Arrange",
      tools: [
        ["lead", "Lead Sheet"],
        ["lyrics", "Letra / TAB"],
        ["structure", "Estructura"],
        ["editor", "Editor"]
      ]
    },
    {
      title: "Studio",
      tools: [
        ["drums", "Drums"],
        ["mixer", "Mixer"],
        ["record", "REC Idea"],
        ["midiIn", "MIDI IN"],
        ["library", "Library"]
      ]
    }
  ];

  const TEMPLATES = [
    { name:"Pop", style:"pop", mood:"Claro, directo, memorable.", parts:["Intro","Verso 1","Pre-coro","Coro","Verso 2","Pre-coro","Coro","Puente","Coro final","Outro"], progression:["I","V","vi","IV"] },
    { name:"Worship", style:"ballad", mood:"Crecimiento emocional, coro expansivo.", parts:["Intro","Verso 1","Verso 2","Pre-coro","Coro","Interludio","Puente","Coro final","Outro"], progression:["I","V","vi","IV"] },
    { name:"Balada", style:"ballad", mood:"Íntima, vocal, lírica.", parts:["Intro","Verso 1","Coro","Verso 2","Coro","Solo","Puente","Coro final","Outro"], progression:["vi","IV","I","V"] },
    { name:"Rock", style:"rock", mood:"Energía, riff, coro fuerte.", parts:["Intro riff","Verso 1","Coro","Riff","Verso 2","Coro","Solo","Coro final","Outro"], progression:["I","IV","V","IV"] },
    { name:"Urbano", style:"pop", mood:"Hook rápido y espacio para flow.", parts:["Intro","Hook","Verso 1","Hook","Verso 2","Bridge","Hook final","Outro"], progression:["vi","IV","I","V"] },
    { name:"Jazz básico", style:"jazz", mood:"Color armónico y forma flexible.", parts:["Intro","Tema A","Tema A","Tema B","Solo","Tema A final","Coda"], progression:["ii","V","I","vi"] }
  ];

  const CHORD_SETS = [
    ["Luminosa", ["I","V","vi","IV"], "Coro abierto, pop, worship."],
    ["Emocional", ["vi","IV","I","V"], "Verso íntimo o balada."],
    ["Ascendente", ["I","ii","IV","V"], "Construcción hacia coro."],
    ["Puente", ["IV","V","vi","V"], "Tensión antes del final."],
    ["Resolución", ["I","IV","V","I"], "Cierre claro y estable."],
    ["Jazz suave", ["ii","V","I","vi"], "Movimiento armónico elegante."]
  ];

  const STYLE_LABELS = {
    funk: "Funk",
    rock: "Rock",
    ballad: "Balada",
    bossa: "Bossa Nova",
    jazz: "Jazz",
    blues: "Blues",
    pop: "Pop",
    bolero: "Bolero",
    salsa: "Salsa",
    cumbia: "Cumbia",
    reggae: "Reggae"
  };

  const FALLBACK_RHYTHMS = {
    funk: { bass:[0,6,8,14], chord:[2,4,10,12], ghost:[3,7,11,15], help:"Bajo sincopado y ghost chords." },
    rock: { bass:[0,4,8,12], chord:[0,4,8,12], ghost:[], help:"Golpes fuertes y base directa." },
    ballad: { bass:[0,8], chord:[0,6,10,14], ghost:[], arp:true, help:"Arpegio suave y espacio para voz." },
    bossa: { bass:[0,8], chord:[3,6,11,14], ghost:[], help:"Bajo alternado y síncopa suave." },
    jazz: { bass:[0,4,8,12], chord:[2,5,10,13], ghost:[7,15], swing:.16, help:"Comping con color y movimiento." },
    blues: { bass:[0,6,10,14], chord:[0,4,8,12], ghost:[3,11], help:"Shuffle simplificado." },
    pop: { bass:[0,8], chord:[0,4,8,12], ghost:[], help:"Pulso estable para componer rápido." },
    bolero: { bass:[0,8], chord:[4,10,14], ghost:[], help:"Romántico, lento, con aire." },
    salsa: { bass:[0,7,10,14], chord:[3,6,11,14], ghost:[], help:"Tumbao simplificado y sincopado." },
    cumbia: { bass:[0,4,8,12], chord:[2,6,10,14], ghost:[], help:"Pulso bailable y estable." },
    reggae: { bass:[0,8], chord:[4,12], ghost:[], help:"Off-beat relajado." }
  };

  let activeTool = "dashboard";
  let isMax = false;

  function bridge() {
    return window.Studio936AppBridge || null;
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function el(tagName, className, text) {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function button(className, text, onClick) {
    const b = el("button", className, text);
    b.type = "button";
    b.onclick = onClick;
    return b;
  }

  function normalizeKey(value) {
    const raw = String(value || "").trim();
    const match = raw.match(/^([A-Ga-g])([#b]?)/);
    if (!match) return "C";
    return match[1].toUpperCase() + (match[2] || "");
  }

  function currentKeyFromDom() {
    return normalizeKey(byId("soloKey")?.value || byId("chordName")?.value || "C");
  }

  function safeBridge(name, fallback) {
    const api = bridge();
    try {
      if (api && typeof api[name] === "function") return api[name]();
    } catch (error) {
      console.warn("[Suite Pro bridge]", name, error);
      showToast("Bridge error: " + name);
    }
    if (typeof fallback === "function") return fallback();
    return null;
  }

  function snapshot() {
    const data = safeBridge("getSongSnapshot", null);
    if (data && typeof data === "object") return data;

    return {
      title: byId("songTitle")?.value || "Untitled Song",
      author: byId("songAuthor")?.value || "Studio 936",
      bpm: byId("bpmDisplay")?.textContent || "",
      style: byId("styleSelect")?.value || "",
      instrument: byId("instrumentSelect")?.value || "",
      key: currentKeyFromDom(),
      currentSection: byId("sectionSelect")?.value || "",
      currentSectionName: byId("sectionSelect")?.selectedOptions?.[0]?.textContent || "",
      currentPart: byId("currentPartTag")?.textContent || "",
      chordLabel: byId("chordLabel")?.textContent || "",
      arrangement: [],
      sections: {},
      lyrics: {},
      project: {}
    };
  }

  function fullSongText() {
    const text = safeBridge("getFullSongText", null);
    if (typeof text === "string" && text.trim()) return text;
    const s = snapshot();
    return [
      "STUDIO 936 COMPOSER",
      "Title: " + (s.title || ""),
      "Author: " + (s.author || ""),
      "Key: " + (s.key || "C"),
      "BPM: " + (s.bpm || ""),
      "Style: " + (s.style || ""),
      "Instrument: " + (s.instrument || ""),
      "Section: " + (s.currentSectionName || s.currentSection || "")
    ].join("\n");
  }

  function projectJson() {
    const json = safeBridge("getProjectJson", null);
    if (typeof json === "string" && json.trim()) return json;
    return JSON.stringify(snapshot().project || snapshot(), null, 2);
  }

  function preferFlats(key) {
    return String(key || "").includes("b") || FLAT_KEYS.has(key);
  }

  function scale(key, type) {
    const clean = normalizeKey(key);
    const root = NOTE_INDEX[clean];
    const intervals = INTERVALS[type] || INTERVALS.major;
    const names = preferFlats(clean) ? NOTES_FLAT : NOTES_SHARP;
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

  function downloadText(filename, text, mime) {
    const blob = new Blob([text], { type: mime || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("Descargado: " + filename);
  }

  async function copyText(text) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API no disponible");
      await navigator.clipboard.writeText(text);
      showToast("Copiado al portapapeles");
    } catch (error) {
      console.warn(error);
      showToast("No se pudo copiar. Usa Descargar TXT.");
    }
  }

  function applyStyle(styleKey) {
    const select = byId("styleSelect");
    if (!select) {
      showToast("Selector de estilo no encontrado");
      return;
    }
    select.value = styleKey;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    showToast("Estilo aplicado: " + (STYLE_LABELS[styleKey] || styleKey));
    renderCurrentTool();
  }

  function clickById(id) {
    const node = byId(id);
    if (node && typeof node.click === "function") {
      node.click();
      return true;
    }
    return false;
  }

  function toggleMetronome() {
    if (!clickById("metroBtn")) showToast("Metrónomo no disponible");
  }

  function toggleSolo() {
    if (!clickById("soloBtn")) showToast("Solo no disponible");
  }

  function startGroove() {
    safeBridge("startGroove", () => clickById("playBtn"));
  }

  function playFullSong() {
    safeBridge("playFullSong", () => clickById("playSongBtn"));
  }

  function stopPlayback() {
    safeBridge("stopPlayback", () => {
      const play = byId("playBtn");
      const song = byId("playSongBtn");
      if (play && /stop/i.test(play.textContent || "")) play.click();
      if (song && /stop/i.test(song.textContent || "")) song.click();
    });
  }

  function exportRealTxt() {
    safeBridge("exportTxt", () => clickById("txtBtn"));
  }

  function exportRealJson() {
    safeBridge("exportJson", () => clickById("jsonBtn"));
  }

  function exportRealMidi() {
    safeBridge("exportMidi", () => clickById("midiBtn"));
  }

  function openWorkspace(kind) {
    const map = {
      editor: "openEditor",
      structure: "openStructure",
      export: "openExport",
      lyrics: "openLyrics",
      help: "openHelp"
    };
    const fallbackId = {
      lyrics: "lyricsBtn",
      help: "helpBtn"
    };
    safeBridge(map[kind], () => {
      if (fallbackId[kind]) clickById(fallbackId[kind]);
      else showToast("Panel no disponible: " + kind);
    });
  }

  function showToast(message) {
    const panel = byId(PANEL_ID);
    if (!panel) return;
    let toast = panel.querySelector(".s936sp-toast");
    if (!toast) {
      toast = el("div", "s936sp-toast");
      panel.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function installStyles() {
    const previous = byId(STYLE_ID);
    if (previous) previous.remove();

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#${PANEL_ID} {
  position: fixed;
  right: 16px;
  top: 92px;
  bottom: 16px;
  width: min(560px, calc(100vw - 32px));
  z-index: 10080;
  display: none;
  color: #f6fbff;
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  pointer-events: auto;
}
#${PANEL_ID}.open { display: block; }
#${PANEL_ID}.max {
  left: 16px;
  right: 16px;
  top: 68px;
  bottom: 16px;
  width: auto;
}
#${PANEL_ID} * { box-sizing: border-box; }
#${PANEL_ID} button, #${PANEL_ID} select, #${PANEL_ID} textarea, #${PANEL_ID} input {
  font-family: inherit;
}
#${PANEL_ID} .s936sp-shell {
  height: 100%;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid rgba(0,255,204,.32);
  border-radius: 22px;
  background:
    radial-gradient(circle at top left, rgba(0,255,204,.14), transparent 34%),
    linear-gradient(180deg, rgba(10,16,27,.98), rgba(3,5,9,.985));
  box-shadow: 0 28px 90px rgba(0,0,0,.78);
  backdrop-filter: blur(10px);
}
#${PANEL_ID} .s936sp-header {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.035);
}
#${PANEL_ID} .s936sp-brand {
  min-width: 0;
}
#${PANEL_ID} .s936sp-kicker {
  color: #00ffcc;
  font-size: .62rem;
  letter-spacing: .16em;
  font-weight: 950;
  text-transform: uppercase;
}
#${PANEL_ID} .s936sp-title {
  margin: 2px 0 0;
  color: #fff;
  font-size: 1.05rem;
  line-height: 1.05;
  font-weight: 950;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
#${PANEL_ID} .s936sp-subtitle {
  margin-top: 4px;
  color: rgba(255,255,255,.58);
  font-size: .7rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
#${PANEL_ID} .s936sp-window-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
#${PANEL_ID} .s936sp-icon,
#${PANEL_ID} .s936sp-close {
  border: 1px solid rgba(255,255,255,.18);
  background: rgba(255,255,255,.07);
  color: #fff;
  border-radius: 12px;
  padding: 8px 10px;
  min-height: 36px;
  font-size: .7rem;
  font-weight: 950;
  cursor: pointer;
  text-transform: uppercase;
}
#${PANEL_ID} .s936sp-close {
  border-color: rgba(255,216,77,.62);
  color: #ffe066;
}
#${PANEL_ID} .s936sp-body {
  min-height: 0;
  display: grid;
  grid-template-columns: 158px minmax(0, 1fr);
  gap: 12px;
  padding: 12px;
  overflow: hidden;
}
#${PANEL_ID}.max .s936sp-body {
  grid-template-columns: 230px minmax(0, 1fr);
}
#${PANEL_ID} .s936sp-nav {
  min-height: 0;
  overflow: auto;
  padding-right: 2px;
}
#${PANEL_ID} .s936sp-group {
  margin-bottom: 12px;
}
#${PANEL_ID} .s936sp-group-title {
  color: rgba(255,255,255,.46);
  font-size: .58rem;
  font-weight: 950;
  letter-spacing: .14em;
  text-transform: uppercase;
  margin: 0 0 6px 2px;
}
#${PANEL_ID} .s936sp-tool {
  width: 100%;
  display: block;
  margin: 0 0 6px;
  border: 1px solid rgba(255,255,255,.13);
  background: rgba(255,255,255,.055);
  color: rgba(255,255,255,.86);
  border-radius: 13px;
  padding: 9px 10px;
  text-align: left;
  font-size: .66rem;
  font-weight: 920;
  text-transform: uppercase;
  letter-spacing: .03em;
  cursor: pointer;
}
#${PANEL_ID} .s936sp-tool:hover,
#${PANEL_ID} .s936sp-tool.active {
  color: #00ffcc;
  border-color: rgba(0,255,204,.72);
  background: rgba(0,255,204,.11);
}
#${PANEL_ID} .s936sp-content {
  min-height: 0;
  overflow: auto;
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 18px;
  background: rgba(255,255,255,.04);
  padding: 16px;
}
#${PANEL_ID} .s936sp-section-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}
#${PANEL_ID} .s936sp-section-head h3 {
  margin: 0;
  color: #8affff;
  font-size: 1.02rem;
  letter-spacing: .08em;
  text-transform: uppercase;
}
#${PANEL_ID} .s936sp-section-head p {
  margin: 5px 0 0;
  color: rgba(255,255,255,.62);
  font-size: .78rem;
  line-height: 1.45;
}
#${PANEL_ID} .s936sp-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
#${PANEL_ID}.max .s936sp-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
#${PANEL_ID} .s936sp-card {
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 16px;
  background: rgba(0,0,0,.18);
  padding: 12px;
  min-width: 0;
}
#${PANEL_ID} .s936sp-card.feature {
  background: linear-gradient(180deg, rgba(0,255,204,.08), rgba(0,0,0,.16));
  border-color: rgba(0,255,204,.18);
}
#${PANEL_ID} .s936sp-card h4 {
  margin: 0 0 8px;
  color: #fff;
  font-size: .86rem;
  text-transform: uppercase;
  letter-spacing: .06em;
}
#${PANEL_ID} .s936sp-line {
  margin: 6px 0;
  color: rgba(255,255,255,.84);
  font-size: .78rem;
  line-height: 1.42;
}
#${PANEL_ID} .s936sp-line strong {
  color: #bfffee;
}
#${PANEL_ID} .s936sp-muted {
  color: rgba(255,255,255,.66);
  font-size: .78rem;
  line-height: 1.5;
}
#${PANEL_ID} .s936sp-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
#${PANEL_ID} .s936sp-action {
  border: 1px solid rgba(0,255,204,.42);
  background: rgba(0,255,204,.08);
  color: #8affff;
  border-radius: 999px;
  padding: 8px 11px;
  font-size: .67rem;
  font-weight: 950;
  cursor: pointer;
  text-transform: uppercase;
}
#${PANEL_ID} .s936sp-action.gold {
  border-color: rgba(255,216,77,.7);
  background: rgba(255,216,77,.1);
  color: #ffe066;
}
#${PANEL_ID} .s936sp-action.danger {
  border-color: rgba(255,80,80,.62);
  color: #ff9c9c;
  background: rgba(255,80,80,.08);
}
#${PANEL_ID} .s936sp-preview,
#${PANEL_ID} .s936sp-textarea {
  width: 100%;
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 14px;
  background: rgba(0,0,0,.22);
  color: rgba(255,255,255,.9);
  padding: 12px;
  font-size: .78rem;
  line-height: 1.55;
}
#${PANEL_ID} .s936sp-preview {
  white-space: pre-wrap;
  max-height: 340px;
  overflow: auto;
}
#${PANEL_ID} .s936sp-textarea {
  min-height: 118px;
  resize: vertical;
}
#${PANEL_ID} .s936sp-select,
#${PANEL_ID} .s936sp-input,
#${PANEL_ID} .s936sp-range {
  width: 100%;
  border: 1px solid rgba(255,255,255,.16);
  border-radius: 12px;
  background: rgba(0,0,0,.26);
  color: #fff;
  padding: 9px 10px;
  min-height: 38px;
}
#${PANEL_ID} .s936sp-meter {
  display: grid;
  grid-template-columns: repeat(16, minmax(0, 1fr));
  gap: 4px;
  margin: 10px 0;
}
#${PANEL_ID} .s936sp-step {
  min-height: 34px;
  border-radius: 9px;
  border: 1px solid rgba(255,255,255,.1);
  background: rgba(255,255,255,.055);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,.55);
  font-size: .58rem;
  font-weight: 950;
}
#${PANEL_ID} .s936sp-step.bass {
  color: #ff99ff;
  border-color: rgba(255,0,255,.38);
  background: rgba(255,0,255,.1);
}
#${PANEL_ID} .s936sp-step.chord {
  color: #00ffcc;
  border-color: rgba(0,255,204,.38);
  background: rgba(0,255,204,.1);
}
#${PANEL_ID} .s936sp-step.ghost {
  color: #ffe066;
  border-color: rgba(255,216,77,.38);
  background: rgba(255,216,77,.09);
}
#${PANEL_ID} .s936sp-status-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}
#${PANEL_ID} .s936sp-stat {
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 14px;
  padding: 10px;
  background: rgba(0,0,0,.16);
}
#${PANEL_ID} .s936sp-stat b {
  display: block;
  color: #fff;
  font-size: .82rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
#${PANEL_ID} .s936sp-stat span {
  display: block;
  color: rgba(255,255,255,.52);
  font-size: .58rem;
  text-transform: uppercase;
  letter-spacing: .1em;
  margin-top: 4px;
}
#${PANEL_ID} .s936sp-toast {
  position: absolute;
  right: 16px;
  bottom: 16px;
  max-width: 320px;
  opacity: 0;
  transform: translateY(10px);
  transition: .16s ease;
  border: 1px solid rgba(0,255,204,.4);
  background: rgba(0,0,0,.78);
  color: #bfffee;
  border-radius: 999px;
  padding: 9px 12px;
  font-size: .72rem;
  font-weight: 850;
  pointer-events: none;
}
#${PANEL_ID} .s936sp-toast.show {
  opacity: 1;
  transform: translateY(0);
}
@media (max-width: 960px) {
  #${PANEL_ID} {
    left: 10px;
    right: 10px;
    top: 82px;
    bottom: 10px;
    width: auto;
  }
  #${PANEL_ID} .s936sp-body {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
  }
  #${PANEL_ID} .s936sp-nav {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    max-height: 210px;
  }
  #${PANEL_ID} .s936sp-group { margin-bottom: 0; }
  #${PANEL_ID} .s936sp-group-title { display: none; }
  #${PANEL_ID} .s936sp-grid,
  #${PANEL_ID}.max .s936sp-grid {
    grid-template-columns: 1fr;
  }
  #${PANEL_ID} .s936sp-status-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
`;
    document.head.appendChild(style);
  }

  function ensurePanel() {
    installStyles();

    let panel = byId(PANEL_ID);
    if (!panel) {
      panel = el("aside", "s936-suite-pro");
      panel.id = PANEL_ID;
      document.body.appendChild(panel);
    }

    if (panel.dataset.version !== "professional-v2") {
      buildPanel(panel);
    }

    panel.classList.toggle("max", isMax);
    return panel;
  }

  function buildPanel(panel) {
    panel.textContent = "";
    panel.dataset.version = "professional-v2";

    const shell = el("div", "s936sp-shell");
    const header = el("header", "s936sp-header");
    const brand = el("div", "s936sp-brand");
    brand.appendChild(el("div", "s936sp-kicker", "Studio 936 Command Center"));
    brand.appendChild(el("h2", "s936sp-title", "Suite Pro"));
    brand.appendChild(el("div", "s936sp-subtitle", "Composición · arreglo · práctica · exportación"));

    const headerActions = el("div", "s936sp-window-actions");
    headerActions.appendChild(button("s936sp-icon", isMax ? "Dock" : "Max", () => {
      isMax = !isMax;
      ensurePanel().classList.toggle("max", isMax);
      const b = qs(".s936sp-window-actions .s936sp-icon", ensurePanel());
      if (b) b.textContent = isMax ? "Dock" : "Max";
    }));
    headerActions.appendChild(button("s936sp-close", "CERRAR", close));

    header.appendChild(brand);
    header.appendChild(headerActions);

    const body = el("div", "s936sp-body");
    const nav = el("nav", "s936sp-nav");
    nav.id = "s936SuiteProNav";

    TOOL_GROUPS.forEach((group) => {
      const wrap = el("div", "s936sp-group");
      wrap.appendChild(el("div", "s936sp-group-title", group.title));
      group.tools.forEach(([key, label]) => {
        const tool = button("s936sp-tool", label, () => renderTool(key));
        tool.dataset.tool = key;
        wrap.appendChild(tool);
      });
      nav.appendChild(wrap);
    });

    const content = el("main", "s936sp-content");
    content.id = "s936SuiteProContent";

    body.appendChild(nav);
    body.appendChild(content);
    shell.appendChild(header);
    shell.appendChild(body);
    panel.appendChild(shell);

    renderTool(activeTool || "dashboard");
  }

  function content() {
    const panel = ensurePanel();
    const c = byId("s936SuiteProContent");
    c.textContent = "";
    document.querySelectorAll("#" + PANEL_ID + " .s936sp-tool").forEach((item) => {
      item.classList.toggle("active", item.dataset.tool === activeTool);
    });
    return c;
  }

  function head(parent, title, description) {
    const h = el("div", "s936sp-section-head");
    const left = el("div");
    left.appendChild(el("h3", "", title));
    if (description) left.appendChild(el("p", "", description));
    h.appendChild(left);
    parent.appendChild(h);
  }

  function line(parent, label, value) {
    const p = el("p", "s936sp-line");
    p.appendChild(el("strong", "", label));
    p.appendChild(document.createTextNode(" " + (value ?? "")));
    parent.appendChild(p);
  }

  function actions(parent, items) {
    const row = el("div", "s936sp-actions");
    items.forEach((item) => {
      const b = button("s936sp-action" + (item.gold ? " gold" : "") + (item.danger ? " danger" : ""), item.label, item.onClick);
      row.appendChild(b);
    });
    parent.appendChild(row);
    return row;
  }

  function statusStrip(parent) {
    const s = snapshot();
    const strip = el("div", "s936sp-status-strip");
    [
      ["Canción", s.title || "Sin título"],
      ["BPM", s.bpm || "—"],
      ["Estilo", STYLE_LABELS[s.style] || s.style || "—"],
      ["Sección", s.currentSectionName || s.currentSection || "—"]
    ].forEach(([label, value]) => {
      const box = el("div", "s936sp-stat");
      box.appendChild(el("b", "", String(value)));
      box.appendChild(el("span", "", label));
      strip.appendChild(box);
    });
    parent.appendChild(strip);
  }

  function renderDashboard() {
    const c = content();
    const s = snapshot();
    head(c, "Dashboard", "Cabina central: lee la canción real y controla los módulos que ya funcionan.");
    statusStrip(c);

    const grid = el("div", "s936sp-grid");

    const session = el("section", "s936sp-card feature");
    session.appendChild(el("h4", "", "Sesión actual"));
    line(session, "Título:", s.title || "Sin título");
    line(session, "Autor:", s.author || "—");
    line(session, "Tonalidad:", s.key || currentKeyFromDom());
    line(session, "Instrumento:", s.instrument || "—");
    line(session, "Acorde actual:", s.chordLabel || "—");
    actions(session, [
      { label:"Start Groove", gold:true, onClick:startGroove },
      { label:"Escuchar canción", onClick:playFullSong },
      { label:"Stop", danger:true, onClick:stopPlayback }
    ]);
    grid.appendChild(session);

    const compose = el("section", "s936sp-card");
    compose.appendChild(el("h4", "", "Composición rápida"));
    line(compose, "Siguiente paso:", "elige una plantilla, inspira una idea o transponla.");
    actions(compose, [
      { label:"Templates", onClick:() => renderTool("templates") },
      { label:"Inspire", onClick:() => renderTool("inspire") },
      { label:"Transpose", onClick:() => renderTool("transpose") }
    ]);
    grid.appendChild(compose);

    const arrange = el("section", "s936sp-card");
    arrange.appendChild(el("h4", "", "Arreglo real"));
    line(arrange, "Objetivo:", "abrir los módulos reales sin duplicarlos.");
    actions(arrange, [
      { label:"Editor", onClick:() => openWorkspace("editor") },
      { label:"Estructura", onClick:() => openWorkspace("structure") },
      { label:"Letra/TAB", onClick:() => openWorkspace("lyrics") }
    ]);
    grid.appendChild(arrange);

    const exportCard = el("section", "s936sp-card");
    exportCard.appendChild(el("h4", "", "Exportación real"));
    line(exportCard, "Usa:", "los exportadores de la app principal.");
    actions(exportCard, [
      { label:"TXT", onClick:exportRealTxt },
      { label:"JSON", onClick:exportRealJson },
      { label:"MIDI", onClick:exportRealMidi }
    ]);
    grid.appendChild(exportCard);

    c.appendChild(grid);
  }

  function templateText(template) {
    const key = snapshot().key || currentKeyFromDom();
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
    const c = content();
    head(c, "Templates", "Plantillas de composición. No pisan tu arreglo: sirven para iniciar, copiar o descargar.");
    const grid = el("div", "s936sp-grid");

    TEMPLATES.forEach((template) => {
      const card = el("section", "s936sp-card");
      const text = templateText(template);
      card.appendChild(el("h4", "", template.name));
      line(card, "Uso:", template.mood);
      line(card, "Forma:", template.parts.join(" / "));
      line(card, "Progresión:", template.progression.join(" - "));
      line(card, "Acordes:", romanToChords(snapshot().key || currentKeyFromDom(), template.progression).join(" - "));
      actions(card, [
        { label:"Copiar", onClick:() => copyText(text) },
        { label:"TXT", onClick:() => downloadText("studio936-template-" + template.name.toLowerCase().replace(/\s+/g, "-") + ".txt", text) },
        { label:"Aplicar estilo", gold:true, onClick:() => applyStyle(template.style) },
        { label:"Abrir estructura", onClick:() => openWorkspace("structure") }
      ]);
      grid.appendChild(card);
    });

    c.appendChild(grid);
  }

  function renderTranspose() {
    const c = content();
    const from = snapshot().key || currentKeyFromDom();
    head(c, "Transpose", "Vista previa segura. No cambia la canción hasta que tú edites/apliques acordes en el editor.");

    const card = el("section", "s936sp-card feature");
    card.appendChild(el("h4", "", "Nueva tonalidad"));
    const select = el("select", "s936sp-select");
    ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"].forEach((key) => {
      const opt = el("option", "", key);
      opt.value = key;
      if (key === from) opt.selected = true;
      select.appendChild(opt);
    });

    const preview = el("pre", "s936sp-preview");
    function update() {
      const to = select.value;
      preview.textContent = [
        "TRANSPOSE PREVIEW",
        "De: " + from,
        "A: " + to,
        "",
        "Escala mayor: " + scale(to, "major").join(" "),
        "Acordes diatónicos: " + majorChords(to).join(", "),
        "Pop rápido: " + romanToChords(to, ["I","V","vi","IV"]).join(" - "),
        "Emocional: " + romanToChords(to, ["vi","IV","I","V"]).join(" - ")
      ].join("\n");
    }
    select.onchange = update;
    card.appendChild(select);
    card.appendChild(preview);
    update();

    actions(card, [
      { label:"Copiar", onClick:() => copyText(preview.textContent) },
      { label:"Descargar TXT", onClick:() => downloadText("studio936-transpose.txt", preview.textContent) },
      { label:"Abrir Editor", gold:true, onClick:() => openWorkspace("editor") }
    ]);
    c.appendChild(card);
  }

  function renderInspire() {
    const c = content();
    const key = snapshot().key || currentKeyFromDom();
    const style = snapshot().style || byId("styleSelect")?.value || "pop";
    const ideas = [
      ["Título", "Luz en la ventana"],
      ["Tema", "volver a empezar con calma y fuerza"],
      ["Primera línea", "Abro la puerta y vuelve a respirar mi voz"],
      ["Imagen", "amanecer sobre una ciudad silenciosa"],
      ["Color sonoro", (STYLE_LABELS[style] || style) + " · " + key],
      ["Progresión", romanToChords(key, ["I","V","vi","IV"]).join(" - ")],
      ["Producción", "voz al frente, base simple, final expansivo"]
    ];
    const text = ideas.map((i) => i[0] + ": " + i[1]).join("\n");

    head(c, "Inspire", "Generador local de chispa creativa para empezar o desbloquear.");
    const card = el("section", "s936sp-card feature");
    card.appendChild(el("h4", "", "Idea inmediata"));
    ideas.forEach((item) => line(card, item[0] + ":", item[1]));
    actions(card, [
      { label:"Copiar", onClick:() => copyText(text) },
      { label:"TXT", onClick:() => downloadText("studio936-inspire.txt", text) },
      { label:"Usar en Templates", gold:true, onClick:() => renderTool("templates") }
    ]);
    c.appendChild(card);
  }

  function renderChordAI() {
    const c = content();
    const key = snapshot().key || currentKeyFromDom();
    head(c, "Chord AI", "Sugerencias armónicas locales basadas en la tonalidad actual.");
    const grid = el("div", "s936sp-grid");

    CHORD_SETS.forEach(([name, degrees, use]) => {
      const chords = romanToChords(key, degrees);
      const text = name + "\n" + degrees.join(" - ") + "\n" + chords.join(" - ") + "\nUso: " + use;
      const card = el("section", "s936sp-card");
      card.appendChild(el("h4", "", name));
      line(card, "Grados:", degrees.join(" - "));
      line(card, "En " + key + ":", chords.join(" - "));
      line(card, "Uso:", use);
      actions(card, [
        { label:"Copiar", onClick:() => copyText(text) },
        { label:"Editor", gold:true, onClick:() => openWorkspace("editor") }
      ]);
      grid.appendChild(card);
    });

    c.appendChild(grid);
  }

  function renderTheory() {
    const c = content();
    const key = snapshot().key || currentKeyFromDom();
    const chords = majorChords(key);
    head(c, "Theory", "Lectura musical rápida para decidir acordes y funciones armónicas.");
    const card = el("section", "s936sp-card feature");
    line(card, "Tonalidad:", key);
    line(card, "Escala mayor:", scale(key, "major").join(" "));
    line(card, "Acordes:", chords.join(", "));
    line(card, "Funciones:", "I tónica · IV subdominante · V dominante · vi relativa menor");
    line(card, "Uso práctico:", "versos con vi/IV, coros con I/V, puentes con IV/V.");
    c.appendChild(card);
  }

  function renderScales() {
    const c = content();
    const key = snapshot().key || currentKeyFromDom();
    head(c, "Scales", "Notas para melodía, bajo, solos y respuestas instrumentales.");
    const card = el("section", "s936sp-card feature");
    line(card, "Mayor:", scale(key, "major").join(" "));
    line(card, "Menor natural:", scale(key, "naturalMinor").join(" "));
    line(card, "Pentatónica mayor:", scale(key, "majorPentatonic").join(" "));
    line(card, "Pentatónica menor:", scale(key, "minorPentatonic").join(" "));
    line(card, "Tip:", "usa pentatónica para melodías rápidas y mayor/menor para líneas más cantables.");
    c.appendChild(card);
  }

  function currentRhythm() {
    const style = byId("styleSelect")?.value || snapshot().style || "pop";
    const rhythms = window.Studio936Rhythms || {};
    return {
      style,
      label: STYLE_LABELS[style] || style,
      data: rhythms[style] || FALLBACK_RHYTHMS[style] || FALLBACK_RHYTHMS.pop
    };
  }

  function renderRhythmMeter(parent, rhythm) {
    const data = rhythm.data || {};
    const meter = el("div", "s936sp-meter");
    for (let i = 0; i < 16; i++) {
      const step = el("div", "s936sp-step", String(i + 1));
      if ((data.bass || []).includes(i)) {
        step.classList.add("bass");
        step.textContent = "B";
      }
      if ((data.chord || []).includes(i)) {
        step.classList.add("chord");
        step.textContent = step.textContent === "B" ? "B+C" : "C";
      }
      if ((data.ghost || []).includes(i)) {
        step.classList.add("ghost");
        step.textContent = step.textContent === String(i + 1) ? "G" : step.textContent + "+G";
      }
      meter.appendChild(step);
    }
    parent.appendChild(meter);
  }

  function renderDrums() {
    const c = content();
    const rhythm = currentRhythm();
    head(c, "Drums", "No es texto muerto: lee el estilo activo y lo convierte en mapa rítmico de producción.");

    const card = el("section", "s936sp-card feature");
    card.appendChild(el("h4", "", rhythm.label + " · " + (snapshot().bpm || "") + " BPM"));
    line(card, "Uso:", rhythm.data.help || "Patrón de acompañamiento del estilo activo.");
    line(card, "Bass steps:", (rhythm.data.bass || []).map((n) => n + 1).join(", ") || "—");
    line(card, "Chord steps:", (rhythm.data.chord || []).map((n) => n + 1).join(", ") || "—");
    line(card, "Ghost steps:", (rhythm.data.ghost || []).map((n) => n + 1).join(", ") || "—");
    renderRhythmMeter(card, rhythm);
    actions(card, [
      { label:"Probar Groove", gold:true, onClick:startGroove },
      { label:"Stop", danger:true, onClick:stopPlayback },
      { label:"Editar estilo", onClick:() => openWorkspace("editor") }
    ]);
    c.appendChild(card);

    const presets = el("section", "s936sp-card");
    presets.appendChild(el("h4", "", "Cambiar estilo"));
    const row = el("div", "s936sp-actions");
    Object.keys(STYLE_LABELS).forEach((styleKey) => {
      row.appendChild(button("s936sp-action", STYLE_LABELS[styleKey], () => applyStyle(styleKey)));
    });
    presets.appendChild(row);
    c.appendChild(presets);
  }

  function renderMixer() {
    const c = content();
    const s = snapshot();
    head(c, "Mixer", "Control de superficie: usa controles reales de la app sin entrar al motor de audio.");

    const card = el("section", "s936sp-card feature");
    card.appendChild(el("h4", "", "Balance de sesión"));
    line(card, "Instrumento:", s.instrument || "—");
    line(card, "Estilo:", STYLE_LABELS[s.style] || s.style || "—");
    line(card, "BPM:", s.bpm || "—");

    const grooveInput = byId("grooveVol");
    if (grooveInput) {
      const label = el("p", "s936sp-line");
      label.appendChild(el("strong", "", "Volumen groove:"));
      label.appendChild(document.createTextNode(" " + grooveInput.value));
      const range = el("input", "s936sp-range");
      range.type = "range";
      range.min = grooveInput.min || "1";
      range.max = grooveInput.max || "10";
      range.value = grooveInput.value || "7";
      range.oninput = () => {
        grooveInput.value = range.value;
        label.lastChild.textContent = " " + range.value;
        grooveInput.dispatchEvent(new Event("change", { bubbles: true }));
      };
      card.appendChild(label);
      card.appendChild(range);
    } else {
      line(card, "Volumen groove:", "no disponible");
    }

    actions(card, [
      { label:"Metrónomo", onClick:toggleMetronome },
      { label:"Solo ON/OFF", onClick:toggleSolo },
      { label:"Start Groove", gold:true, onClick:startGroove },
      { label:"Stop", danger:true, onClick:stopPlayback }
    ]);
    c.appendChild(card);
  }

  function renderPractice() {
    const c = content();
    const s = snapshot();
    head(c, "Practice", "Modo ensayo conectado a controles reales: sección, canción completa, metrónomo y stop.");
    statusStrip(c);

    const card = el("section", "s936sp-card feature");
    card.appendChild(el("h4", "", "Ensayo actual"));
    line(card, "Sección:", s.currentSectionName || s.currentSection || "—");
    line(card, "Acorde:", s.chordLabel || "—");
    line(card, "Parte:", s.currentPart || "—");
    actions(card, [
      { label:"Start Groove", gold:true, onClick:startGroove },
      { label:"Escuchar canción", onClick:playFullSong },
      { label:"Metrónomo", onClick:toggleMetronome },
      { label:"Solo ON/OFF", onClick:toggleSolo },
      { label:"Stop", danger:true, onClick:stopPlayback }
    ]);
    c.appendChild(card);
  }

  function renderLeadSheet() {
    const c = content();
    const text = fullSongText();
    head(c, "Lead Sheet", "Hoja guía generada desde la canción real actual.");
    const pre = el("pre", "s936sp-preview", text);
    c.appendChild(pre);
    actions(c, [
      { label:"Copiar", onClick:() => copyText(text) },
      { label:"Descargar TXT", gold:true, onClick:() => downloadText("studio936-lead-sheet.txt", text) },
      { label:"Letra/TAB", onClick:() => openWorkspace("lyrics") }
    ]);
  }

  function renderExport() {
    const c = content();
    head(c, "Export Center", "Centraliza los exportadores reales de la app: TXT, JSON y MIDI.");
    const card = el("section", "s936sp-card feature");
    card.appendChild(el("h4", "", "Exportación real"));
    line(card, "TXT:", "documento completo legible.");
    line(card, "JSON:", "proyecto editable completo.");
    line(card, "MIDI:", "archivo musical para DAW.");
    actions(card, [
      { label:"Bajar TXT", gold:true, onClick:exportRealTxt },
      { label:"Bajar JSON", onClick:exportRealJson },
      { label:"Exportar MIDI", onClick:exportRealMidi },
      { label:"Copiar canción", onClick:() => safeBridge("copyFullSongText", () => copyText(fullSongText())) }
    ]);
    c.appendChild(card);

    const preview = el("pre", "s936sp-preview", fullSongText());
    c.appendChild(preview);
  }

  function renderShare() {
    renderExport();
  }

  function renderPdf() {
    const c = content();
    const text = fullSongText();
    head(c, "PDF / Print", "Prepara una vista imprimible. El PDF final se guarda desde Imprimir del navegador.");
    const card = el("section", "s936sp-card feature");
    card.appendChild(el("h4", "", "Vista imprimible"));
    card.appendChild(el("pre", "s936sp-preview", text));
    actions(card, [
      { label:"Abrir impresión", gold:true, onClick:() => openPrintable(text) },
      { label:"Descargar fuente TXT", onClick:() => downloadText("studio936-print-source.txt", text) }
    ]);
    c.appendChild(card);
  }

  function openPrintable(text) {
    const win = window.open("", "_blank");
    if (!win) {
      showToast("Popup bloqueado. Usa Descargar TXT.");
      return;
    }
    win.document.write("<!doctype html><html><head><title>Studio 936 Lead Sheet</title><style>body{font-family:Georgia,serif;padding:36px;line-height:1.45}pre{white-space:pre-wrap}</style></head><body><pre></pre></body></html>");
    win.document.querySelector("pre").textContent = text;
    win.document.close();
    setTimeout(() => win.print(), 250);
  }

  function renderLibrary() {
    const c = content();
    head(c, "Library", "Guarda snapshots reales de la canción actual en este navegador.");
    const text = fullSongText();
    const json = projectJson();

    const saveCard = el("section", "s936sp-card feature");
    saveCard.appendChild(el("h4", "", "Snapshot actual"));
    line(saveCard, "Canción:", snapshot().title || "Sin título");
    line(saveCard, "BPM:", snapshot().bpm || "—");
    actions(saveCard, [
      { label:"Guardar snapshot", gold:true, onClick:() => {
        const items = loadLibrary();
        items.unshift({
          createdAt: new Date().toISOString(),
          title: snapshot().title || "Untitled Song",
          text,
          json
        });
        saveLibrary(items.slice(0, 40));
        showToast("Snapshot guardado");
        renderLibrary();
      }},
      { label:"Descargar JSON", onClick:() => downloadText("studio936-project.json", json, "application/json;charset=utf-8") }
    ]);
    c.appendChild(saveCard);

    const items = loadLibrary();
    if (!items.length) {
      c.appendChild(el("p", "s936sp-muted", "No hay snapshots guardados todavía."));
      return;
    }

    const grid = el("div", "s936sp-grid");
    items.forEach((item, index) => {
      const card = el("section", "s936sp-card");
      card.appendChild(el("h4", "", item.title || "Snapshot"));
      line(card, "Fecha:", new Date(item.createdAt).toLocaleString());
      actions(card, [
        { label:"TXT", onClick:() => downloadText("studio936-snapshot.txt", item.text || "") },
        { label:"JSON", onClick:() => downloadText("studio936-snapshot.json", item.json || "{}", "application/json;charset=utf-8") },
        { label:"Copiar", onClick:() => copyText(item.text || "") },
        { label:"Borrar", danger:true, onClick:() => {
          const next = loadLibrary();
          next.splice(index, 1);
          saveLibrary(next);
          renderLibrary();
        }}
      ]);
      grid.appendChild(card);
    });
    c.appendChild(grid);
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

  function renderRecord() {
    const c = content();
    head(c, "REC Idea", "Captura texto rápido sin tocar permisos de micrófono ni motor de audio.");
    const card = el("section", "s936sp-card feature");
    const area = el("textarea", "s936sp-textarea");
    area.placeholder = "Idea de letra, melodía, groove, arreglo, producción...";
    card.appendChild(area);
    actions(card, [
      { label:"Guardar en Library", gold:true, onClick:() => {
        const items = loadLibrary();
        const idea = area.value.trim();
        if (!idea) {
          showToast("Escribe una idea primero");
          return;
        }
        items.unshift({
          createdAt: new Date().toISOString(),
          title: "Idea rápida · " + (snapshot().title || "Studio 936"),
          text: idea,
          json: JSON.stringify({ type:"idea", idea, snapshot: snapshot() }, null, 2)
        });
        saveLibrary(items.slice(0, 40));
        area.value = "";
        showToast("Idea guardada");
      }},
      { label:"Copiar", onClick:() => copyText(area.value || "") }
    ]);
    c.appendChild(card);
  }

  function renderMidiIn() {
    const c = content();
    head(c, "MIDI IN", "Diagnóstico seguro de MIDI del navegador. No toca exportación ni motor musical.");
    const card = el("section", "s936sp-card feature");
    card.appendChild(el("h4", "", "Estado MIDI"));
    const status = el("p", "s936sp-muted", "Pulsa detectar para consultar dispositivos MIDI disponibles.");
    card.appendChild(status);
    actions(card, [
      { label:"Detectar MIDI", gold:true, onClick:async () => {
        if (!navigator.requestMIDIAccess) {
          status.textContent = "Este navegador no soporta Web MIDI.";
          return;
        }
        try {
          const access = await navigator.requestMIDIAccess();
          const inputs = Array.from(access.inputs.values()).map((input) => input.name || "MIDI input");
          status.textContent = inputs.length ? "Entradas: " + inputs.join(", ") : "No hay entradas MIDI conectadas.";
        } catch (error) {
          status.textContent = "Permiso MIDI denegado o no disponible.";
        }
      }},
      { label:"Exportar MIDI real", onClick:exportRealMidi }
    ]);
    c.appendChild(card);
  }

  function renderLyricsAccess() {
    const c = content();
    head(c, "Letra / TAB", "No duplico el editor de letra: abro el módulo real que ya funciona.");
    const card = el("section", "s936sp-card feature");
    line(card, "Acción:", "abrir editor real de Letra/TAB.");
    actions(card, [
      { label:"Abrir Letra/TAB", gold:true, onClick:() => openWorkspace("lyrics") },
      { label:"Lead Sheet", onClick:() => renderTool("lead") }
    ]);
    c.appendChild(card);
  }

  function renderStructureAccess() {
    const c = content();
    head(c, "Estructura", "Abre el módulo real de estructura en la app principal.");
    const card = el("section", "s936sp-card feature");
    line(card, "Acción:", "editar estructura/arreglo real.");
    actions(card, [
      { label:"Abrir Estructura", gold:true, onClick:() => openWorkspace("structure") },
      { label:"Templates", onClick:() => renderTool("templates") }
    ]);
    c.appendChild(card);
  }

  function renderEditorAccess() {
    const c = content();
    head(c, "Editor", "Abre el editor real de progresión. Suite Pro no duplica lo que ya funciona.");
    const card = el("section", "s936sp-card feature");
    line(card, "Acción:", "editar acordes, bajo, notas y compases.");
    actions(card, [
      { label:"Abrir Editor", gold:true, onClick:() => openWorkspace("editor") },
      { label:"Chord AI", onClick:() => renderTool("chordAI") }
    ]);
    c.appendChild(card);
  }

  function renderTool(key) {
    activeTool = key || "dashboard";
    const routes = {
      dashboard: renderDashboard,
      templates: renderTemplates,
      transpose: renderTranspose,
      scales: renderScales,
      theory: renderTheory,
      chordAI: renderChordAI,
      inspire: renderInspire,
      drums: renderDrums,
      mixer: renderMixer,
      record: renderRecord,
      midiIn: renderMidiIn,
      pdf: renderPdf,
      lead: renderLeadSheet,
      practice: renderPractice,
      share: renderShare,
      export: renderExport,
      library: renderLibrary,
      lyrics: renderLyricsAccess,
      structure: renderStructureAccess,
      editor: renderEditorAccess
    };
    const renderer = routes[activeTool] || renderDashboard;
    renderer();
  }

  function renderCurrentTool() {
    renderTool(activeTool);
  }

  function open() {
    const panel = ensurePanel();
    panel.classList.add("open");
    renderCurrentTool();
    return panel;
  }

  function close() {
    const panel = byId(PANEL_ID);
    if (panel) panel.classList.remove("open");
    document.querySelectorAll("#v25UxBar .v25ux-btn").forEach((btn) => {
      if (btn.dataset.uxOpen === "suite") btn.classList.remove("active");
    });
  }

  function toggle() {
    const panel = ensurePanel();
    if (panel.classList.contains("open")) close();
    else open();
    return panel;
  }

  window.Studio936SuitePro = {
    open,
    close,
    toggle,
    ensurePanel,
    ensureMounted: ensurePanel,
    renderTool
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensurePanel);
  } else {
    ensurePanel();
  }
})();
