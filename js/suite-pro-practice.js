// Studio 936 Composer - Suite Pro Practice Module v1
// Scope: Practice tab only. It does not touch app legacy, audio internals, MIDI internals, editor internals or transport internals.
// It reads from Studio936AppBridge and uses existing UI controls through safe clicks/events.
(function () {
  "use strict";

  const STYLE_ID = "s936SuiteProPracticeStyles";
  const STATE_KEY = "s936_suitepro_practice_v1";

  const DEFAULT_STATE = {
    selectedSection: "",
    selectedChordIndex: 0,
    instrumentView: "auto",
    followEditor: true
  };

  function loadState() {
    try { return Object.assign({}, DEFAULT_STATE, JSON.parse(localStorage.getItem(STATE_KEY) || "{}")); }
    catch (error) { return Object.assign({}, DEFAULT_STATE); }
  }

  const state = loadState();

  function saveState() {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (error) {}
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#s936SuitePro .s936-pr-shell { display:grid; gap:12px; }
#s936SuitePro .s936-pr-topbar {
  display:grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap:10px;
}
#s936SuitePro .s936-pr-control {
  border:1px solid rgba(255,255,255,.12);
  border-radius:14px;
  background:rgba(255,255,255,.045);
  padding:10px;
}
#s936SuitePro .s936-pr-label {
  display:block;
  color:#ffe066;
  font-size:.62rem;
  font-weight:950;
  text-transform:uppercase;
  letter-spacing:.7px;
  margin-bottom:6px;
}
#s936SuitePro .s936-pr-select {
  width:100%;
  border:1px solid rgba(255,255,255,.16);
  border-radius:10px;
  background:rgba(0,0,0,.32);
  color:#fff;
  padding:9px;
  font-weight:800;
}
#s936SuitePro .s936-pr-hero {
  display:grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr);
  gap:12px;
}
#s936SuitePro .s936-pr-big {
  border:1px solid rgba(0,255,204,.28);
  border-radius:18px;
  background:linear-gradient(135deg, rgba(0,255,204,.10), rgba(255,255,255,.035));
  padding:14px;
}
#s936SuitePro .s936-pr-now-title {
  margin:0 0 6px;
  color:#8affff;
  text-transform:uppercase;
  font-size:.82rem;
  letter-spacing:.8px;
}
#s936SuitePro .s936-pr-chord {
  color:#fff;
  font-size:2.1rem;
  font-weight:950;
  line-height:1;
  margin:4px 0 6px;
}
#s936SuitePro .s936-pr-sub {
  color:rgba(255,255,255,.72);
  font-size:.78rem;
  line-height:1.45;
}
#s936SuitePro .s936-pr-note-row {
  display:flex;
  flex-wrap:wrap;
  gap:6px;
  margin-top:10px;
}
#s936SuitePro .s936-pr-note {
  border:1px solid rgba(0,255,204,.42);
  border-radius:999px;
  padding:5px 9px;
  background:rgba(0,255,204,.08);
  color:#bfffee;
  font-size:.7rem;
  font-weight:900;
}
#s936SuitePro .s936-pr-note.root {
  border-color:rgba(255,216,77,.75);
  background:rgba(255,216,77,.13);
  color:#ffe066;
}
#s936SuitePro .s936-pr-note.ext {
  border-color:rgba(255,80,230,.65);
  background:rgba(255,80,230,.10);
  color:#ffd4fb;
}
#s936SuitePro .s936-pr-actions {
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  margin-top:10px;
}
#s936SuitePro .s936-pr-btn {
  border:1px solid rgba(0,255,204,.45);
  border-radius:999px;
  background:rgba(0,255,204,.08);
  color:#bfffee;
  padding:8px 11px;
  font-size:.68rem;
  font-weight:950;
  cursor:pointer;
}
#s936SuitePro .s936-pr-btn:hover { background:rgba(0,255,204,.15); }
#s936SuitePro .s936-pr-btn.warn {
  border-color:rgba(255,216,77,.7);
  color:#ffe066;
  background:rgba(255,216,77,.10);
}
#s936SuitePro .s936-pr-btn.danger {
  border-color:rgba(255,90,90,.7);
  color:#ffb5b5;
  background:rgba(255,90,90,.10);
}
#s936SuitePro .s936-pr-lane {
  display:flex;
  gap:8px;
  overflow:auto;
  padding:4px 0 10px;
  scroll-snap-type:x proximity;
}
#s936SuitePro .s936-pr-chord-card {
  min-width:150px;
  scroll-snap-align:start;
  border:1px solid rgba(255,255,255,.13);
  border-radius:14px;
  background:rgba(255,255,255,.04);
  padding:10px;
  cursor:pointer;
}
#s936SuitePro .s936-pr-chord-card.active {
  border-color:rgba(0,255,204,.85);
  background:rgba(0,255,204,.13);
  box-shadow:0 0 0 1px rgba(0,255,204,.18) inset;
}
#s936SuitePro .s936-pr-chord-card .num {
  color:#ffe066;
  font-size:.62rem;
  font-weight:950;
}
#s936SuitePro .s936-pr-chord-card .name {
  color:#fff;
  font-size:1rem;
  font-weight:950;
  margin:4px 0;
}
#s936SuitePro .s936-pr-chord-card .meta {
  color:rgba(255,255,255,.66);
  font-size:.66rem;
  line-height:1.35;
}
#s936SuitePro .s936-pr-visual-grid {
  display:grid;
  grid-template-columns:minmax(0, 1fr) minmax(0, 1fr);
  gap:12px;
}
#s936SuitePro .s936-pr-panel {
  border:1px solid rgba(255,255,255,.12);
  border-radius:18px;
  background:rgba(255,255,255,.04);
  padding:12px;
}
#s936SuitePro .s936-pr-panel h4 {
  margin:0 0 8px;
  color:#8affff;
  text-transform:uppercase;
  font-size:.75rem;
  letter-spacing:.7px;
}
#s936SuitePro .s936-pr-keyboard {
  display:flex;
  align-items:flex-end;
  gap:3px;
  min-height:132px;
  padding:10px;
  border-radius:14px;
  background:rgba(0,0,0,.30);
  overflow:auto;
}
#s936SuitePro .s936-pr-key {
  position:relative;
  min-width:24px;
  height:92px;
  border:1px solid rgba(255,255,255,.25);
  border-radius:0 0 6px 6px;
  background:rgba(255,255,255,.90);
  color:#111;
  font-size:.55rem;
  font-weight:950;
  display:flex;
  align-items:flex-end;
  justify-content:center;
  padding-bottom:5px;
}
#s936SuitePro .s936-pr-key.black {
  height:62px;
  min-width:20px;
  background:#080808;
  color:#fff;
  margin-left:-12px;
  margin-right:-12px;
  z-index:2;
  border-color:rgba(255,255,255,.12);
}
#s936SuitePro .s936-pr-key.on { background:#00ffcc; color:#00221d; box-shadow:0 0 0 2px rgba(0,255,204,.35) inset; }
#s936SuitePro .s936-pr-key.root { background:#ffe066; color:#161000; }
#s936SuitePro .s936-pr-key.ext { background:#ff5bea; color:#220018; }
#s936SuitePro .s936-pr-fret {
  width:100%;
  max-width:340px;
  border-radius:14px;
  background:rgba(0,0,0,.28);
  padding:10px;
}
#s936SuitePro .s936-pr-fret-grid {
  display:grid;
  grid-template-columns: 24px repeat(6, 1fr);
  gap:0;
  border-left:3px solid rgba(255,255,255,.45);
}
#s936SuitePro .s936-pr-uke .s936-pr-fret-grid {
  grid-template-columns: 24px repeat(5, 1fr);
}
#s936SuitePro .s936-pr-string-label {
  color:rgba(255,255,255,.65);
  font-size:.55rem;
  font-weight:950;
  display:flex;
  align-items:center;
  justify-content:center;
  height:22px;
}
#s936SuitePro .s936-pr-fret-cell {
  position:relative;
  height:22px;
  border-top:1px solid rgba(255,255,255,.20);
  border-right:1px solid rgba(255,255,255,.18);
}
#s936SuitePro .s936-pr-dot {
  position:absolute;
  left:50%;
  top:50%;
  width:16px;
  height:16px;
  transform:translate(-50%,-50%);
  border-radius:999px;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:.55rem;
  font-weight:950;
  background:#00ffcc;
  color:#00332b;
}
#s936SuitePro .s936-pr-dot.root { background:#ffe066; color:#161000; }
#s936SuitePro .s936-pr-dot.ext { background:#ff5bea; color:#220018; }
#s936SuitePro .s936-pr-lyrics {
  margin-top:10px;
  padding:10px;
  border-radius:12px;
  background:rgba(255,255,255,.06);
  color:rgba(255,255,255,.82);
  line-height:1.45;
  font-size:.75rem;
}
#s936SuitePro .s936-pr-status {
  margin-top:8px;
  color:#ffe066;
  font-size:.7rem;
  font-weight:800;
}
@media(max-width: 980px){
  #s936SuitePro .s936-pr-topbar,
  #s936SuitePro .s936-pr-hero,
  #s936SuitePro .s936-pr-visual-grid { grid-template-columns:1fr; }
}
`;
    document.head.appendChild(style);
  }

  function register() {
    window.Studio936SuiteProModules = window.Studio936SuiteProModules || {};
    window.Studio936SuiteProPractice = { version: "practice-v1", render };
    window.Studio936SuiteProModules.practice = window.Studio936SuiteProPractice;
  }

  function safe(fn, fallback = null) {
    try { return fn(); } catch (error) { console.warn("Suite Pro Practice:", error); return fallback; }
  }

  function getSnapshot(ctx) {
    return safe(() => ctx.snapshot(), {}) || {};
  }

  function sectionLabel(part, sectionKey) {
    return part?.label || part?.name || sectionKey || "Sección";
  }

  function orderedParts(snap) {
    const arrangement = Array.isArray(snap.arrangement) ? snap.arrangement : [];
    if (arrangement.length) return arrangement.map((part) => ({ section: part.section || part.key || "", label: part.label || part.name || part.section || "" }));
    const sections = snap.sections || {};
    return Object.keys(sections).map((key) => ({ section: key, label: key }));
  }

  function sectionItems(snap, sectionKey) {
    const sections = snap.sections || {};
    const items = Array.isArray(sections[sectionKey]) ? sections[sectionKey] : [];
    return items.map((item, index) => Object.assign({ __index: index }, item || {}));
  }

  function activeSection(snap) {
    const parts = orderedParts(snap);
    const current = snap.currentSection || "";
    if (state.selectedSection && (snap.sections || {})[state.selectedSection]) return state.selectedSection;
    if (current && (snap.sections || {})[current]) return current;
    return parts[0]?.section || Object.keys(snap.sections || {})[0] || "";
  }

  function normalizeChordName(item, ctx, snap) {
    return item?.name || item?.chord || ctx.currentChordName?.() || snap.chordLabel || "Acorde";
  }

  function normalizeNotes(item, ctx, chordName) {
    const raw = String(item?.notes || "").trim();
    let notes = raw ? raw.split(/\s+/).filter(Boolean) : [];
    if (!notes.length && typeof ctx.notesFromChordName === "function") notes = ctx.notesFromChordName(chordName);
    if (!notes.length && typeof ctx.currentChordNotes === "function") notes = ctx.currentChordNotes();
    return notes.filter(Boolean).slice(0, 8);
  }

  function rootOf(chordName, ctx) {
    if (typeof ctx.chordRootName === "function") return ctx.chordRootName(chordName);
    const match = String(chordName || "").match(/^([A-Ga-g])([#b]?)/);
    return match ? match[1].toUpperCase() + (match[2] || "") : "";
  }

  function isExtension(note, root, index) {
    return index > 2 || /7|9|11|13/i.test(String(note || ""));
  }

  function setStatus(ctx, text) {
    const box = ctx.q?.(".s936-pr-status", ctx.content?.()) || document.querySelector("#s936SuitePro .s936-pr-status");
    if (box) box.textContent = text;
  }

  function setSectionInApp(ctx, sectionKey) {
    const select = ctx.byId?.("sectionSelect");
    if (!select || !sectionKey) return false;
    select.value = sectionKey;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function setChordInApp(ctx, index) {
    const select = ctx.byId?.("chordSelect");
    if (!select) return false;
    select.value = String(index);
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function bpmValue(ctx) {
    return Number(ctx.byId?.("bpmSlider")?.value || ctx.byId?.("bpmDisplay")?.textContent || getSnapshot(ctx).bpm || 95);
  }

  function setBpm(ctx, next) {
    const value = Math.max(50, Math.min(180, Number(next) || 95));
    if (typeof window.setBPM === "function") {
      window.setBPM(value);
      return true;
    }
    const slider = ctx.byId?.("bpmSlider");
    if (slider) {
      slider.value = String(value);
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      slider.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const display = ctx.byId?.("bpmDisplay");
    if (display) display.textContent = String(value);
    return true;
  }

  function focusChord(ctx, sectionKey, chordIndex) {
    state.selectedSection = sectionKey;
    state.selectedChordIndex = Number(chordIndex) || 0;
    saveState();
    setSectionInApp(ctx, sectionKey);
    setChordInApp(ctx, state.selectedChordIndex);
    render(ctx);
  }

  function selectedData(ctx) {
    const snap = getSnapshot(ctx);
    const sectionKey = activeSection(snap);
    const items = sectionItems(snap, sectionKey);
    const safeIndex = Math.max(0, Math.min(state.selectedChordIndex || 0, Math.max(0, items.length - 1)));
    const item = items[safeIndex] || {};
    const nextItem = items[(safeIndex + 1) % Math.max(1, items.length)] || {};
    const parts = orderedParts(snap);
    const part = parts.find((p) => p.section === sectionKey) || { section: sectionKey, label: sectionKey };
    const chordName = normalizeChordName(item, ctx, snap);
    const nextName = normalizeChordName(nextItem, ctx, snap);
    const notes = normalizeNotes(item, ctx, chordName);
    const root = rootOf(chordName, ctx);
    return { snap, sectionKey, items, index: safeIndex, item, nextItem, part, chordName, nextName, notes, root };
  }

  function render(ctx) {
    installStyles();
    const c = ctx.clearContent();
    ctx.title(c, "Practice Pro", "Play-along modular: ve sección, acorde actual, siguiente acorde, notas, instrumento y controles de práctica sin inflar suite-pro.js.");

    const shell = ctx.el("div", "s936-pr-shell");
    renderTopbar(ctx, shell);
    renderHero(ctx, shell);
    renderChordLane(ctx, shell);
    renderVisuals(ctx, shell);
    c.appendChild(shell);
  }

  function renderTopbar(ctx, shell) {
    const data = selectedData(ctx);
    const snap = data.snap;
    const parts = orderedParts(snap);
    const topbar = ctx.el("div", "s936-pr-topbar");

    const sectionBox = controlBox(ctx, "Sección para practicar");
    const sectionSelect = ctx.el("select", "s936-pr-select");
    parts.forEach((part) => {
      const option = ctx.el("option", "", sectionLabel(part, part.section));
      option.value = part.section;
      if (part.section === data.sectionKey) option.selected = true;
      sectionSelect.appendChild(option);
    });
    sectionSelect.onchange = () => {
      state.selectedSection = sectionSelect.value;
      state.selectedChordIndex = 0;
      saveState();
      setSectionInApp(ctx, state.selectedSection);
      render(ctx);
    };
    sectionBox.appendChild(sectionSelect);

    const viewBox = controlBox(ctx, "Vista instrumento");
    const viewSelect = ctx.el("select", "s936-pr-select");
    [["auto", "Auto"], ["piano", "Piano"], ["guitar", "Guitarra"], ["ukulele", "Ukelele"]].forEach(([value, label]) => {
      const option = ctx.el("option", "", label);
      option.value = value;
      if (state.instrumentView === value) option.selected = true;
      viewSelect.appendChild(option);
    });
    viewSelect.onchange = () => {
      state.instrumentView = viewSelect.value;
      saveState();
      render(ctx);
    };
    viewBox.appendChild(viewSelect);

    const bpmBox = controlBox(ctx, "Tempo práctica");
    const bpm = bpmValue(ctx);
    const bpmRow = ctx.el("div", "s936-pr-actions");
    [[-10, "-10"], [-5, "-5"], [5, "+5"], [10, "+10"]].forEach(([delta, label]) => {
      const btn = ctx.el("button", "s936-pr-btn", label);
      btn.type = "button";
      btn.onclick = () => {
        setBpm(ctx, bpmValue(ctx) + delta);
        render(ctx);
      };
      bpmRow.appendChild(btn);
    });
    bpmBox.appendChild(ctx.el("div", "s936-pr-sub", bpm + " BPM"));
    bpmBox.appendChild(bpmRow);

    const syncBox = controlBox(ctx, "Acción rápida");
    const row = ctx.el("div", "s936-pr-actions");
    addButton(ctx, row, "Loop sección", () => {
      setSectionInApp(ctx, data.sectionKey);
      ctx.callBridge?.("startGroove", () => ctx.byId?.("playBtn")?.click());
      setStatus(ctx, "Loop de sección iniciado desde Practice.");
    }, "s936-pr-btn warn");
    addButton(ctx, row, "Abrir Editor", () => ctx.callBridge?.("openEditor", () => false));
    syncBox.appendChild(row);

    topbar.append(sectionBox, viewBox, bpmBox, syncBox);
    shell.appendChild(topbar);
  }

  function controlBox(ctx, label) {
    const box = ctx.el("div", "s936-pr-control");
    box.appendChild(ctx.el("span", "s936-pr-label", label));
    return box;
  }

  function addButton(ctx, parent, label, fn, className = "s936-pr-btn") {
    const btn = ctx.el("button", className, label);
    btn.type = "button";
    btn.onclick = fn;
    parent.appendChild(btn);
    return btn;
  }

  function renderHero(ctx, shell) {
    const data = selectedData(ctx);
    const hero = ctx.el("div", "s936-pr-hero");

    const now = ctx.el("article", "s936-pr-big");
    now.appendChild(ctx.el("h4", "s936-pr-now-title", "Ahora"));
    now.appendChild(ctx.el("div", "s936-pr-chord", data.chordName));
    now.appendChild(ctx.el("div", "s936-pr-sub", `${sectionLabel(data.part, data.sectionKey)} · acorde ${data.index + 1}/${Math.max(1, data.items.length)} · ${data.item?.bars || 1} compás(es)`));
    now.appendChild(noteRow(ctx, data.notes, data.root));
    const nowActions = ctx.el("div", "s936-pr-actions");
    addButton(ctx, nowActions, "Cargar en editor", () => focusChord(ctx, data.sectionKey, data.index));
    addButton(ctx, nowActions, "Escuchar acorde", () => {
      focusChord(ctx, data.sectionKey, data.index);
      setTimeout(() => ctx.byId?.("previewBtn")?.click(), 120);
    }, "s936-pr-btn warn");
    now.appendChild(nowActions);

    const next = ctx.el("article", "s936-pr-big");
    next.appendChild(ctx.el("h4", "s936-pr-now-title", "Siguiente"));
    next.appendChild(ctx.el("div", "s936-pr-chord", data.nextName));
    next.appendChild(ctx.el("div", "s936-pr-sub", "Anticipa el próximo cambio armónico antes de tocarlo."));
    next.appendChild(noteRow(ctx, normalizeNotes(data.nextItem, ctx, data.nextName), rootOf(data.nextName, ctx)));
    const controls = ctx.el("div", "s936-pr-actions");
    addButton(ctx, controls, "Start Groove", () => ctx.callBridge?.("startGroove", () => ctx.byId?.("playBtn")?.click()));
    addButton(ctx, controls, "Canción completa", () => ctx.callBridge?.("playFullSong", () => ctx.byId?.("playSongBtn")?.click()));
    addButton(ctx, controls, "Stop", () => ctx.callBridge?.("stopPlayback", () => ctx.byId?.("playBtn")?.click()), "s936-pr-btn danger");
    next.appendChild(controls);
    next.appendChild(ctx.el("div", "s936-pr-status", ""));

    hero.append(now, next);
    shell.appendChild(hero);
  }

  function noteRow(ctx, notes, root) {
    const row = ctx.el("div", "s936-pr-note-row");
    notes.forEach((note, index) => {
      const clean = normalizeNote(note);
      const classes = ["s936-pr-note"];
      if (clean === root || index === 0) classes.push("root");
      else if (isExtension(note, root, index)) classes.push("ext");
      row.appendChild(ctx.el("span", classes.join(" "), note));
    });
    return row;
  }

  function renderChordLane(ctx, shell) {
    const data = selectedData(ctx);
    const panel = ctx.el("section", "s936-pr-panel");
    panel.appendChild(ctx.el("h4", "", "Timeline de práctica"));
    const lane = ctx.el("div", "s936-pr-lane");

    if (!data.items.length) {
      lane.appendChild(ctx.el("p", "s936-pr-sub", "No hay acordes en esta sección todavía."));
    }

    data.items.forEach((item, index) => {
      const name = normalizeChordName(item, ctx, data.snap);
      const card = ctx.el("button", "s936-pr-chord-card" + (index === data.index ? " active" : ""));
      card.type = "button";
      card.onclick = () => focusChord(ctx, data.sectionKey, index);
      card.appendChild(ctx.el("div", "num", String(index + 1).padStart(2, "0")));
      card.appendChild(ctx.el("div", "name", name));
      card.appendChild(ctx.el("div", "meta", `${item?.bars || 1} compás(es)`));
      const notes = normalizeNotes(item, ctx, name);
      const row = ctx.el("div", "s936-pr-note-row");
      notes.slice(0, 4).forEach((n, i) => row.appendChild(ctx.el("span", "s936-pr-note " + (i === 0 ? "root" : ""), n)));
      card.appendChild(row);
      lane.appendChild(card);
    });

    panel.appendChild(lane);
    shell.appendChild(panel);
  }

  function renderVisuals(ctx, shell) {
    const data = selectedData(ctx);
    const visualGrid = ctx.el("div", "s936-pr-visual-grid");

    const instrument = resolveInstrument(ctx, data.snap);
    const visual = ctx.el("section", "s936-pr-panel");
    visual.appendChild(ctx.el("h4", "", instrumentLabel(instrument) + " · voicing guía"));
    if (instrument === "guitar") renderFretboard(ctx, visual, data, ["E", "A", "D", "G", "B", "E"], false);
    else if (instrument === "ukulele") renderFretboard(ctx, visual, data, ["G", "C", "E", "A"], true);
    else renderKeyboard(ctx, visual, data);
    visual.appendChild(ctx.el("p", "s936-pr-sub", "Color: amarillo = raíz/bajo, verde = notas del acorde, fucsia = extensiones. Es guía visual de práctica; el editor mantiene la verdad musical."));

    const detail = ctx.el("section", "s936-pr-panel");
    detail.appendChild(ctx.el("h4", "", "Guía de ejecución"));
    const bass = data.item?.bass || data.root || data.notes[0] || "—";
    const right = data.notes.filter((n) => normalizeNote(n) !== normalizeNote(bass)).join(" · ") || data.notes.join(" · ");
    detail.appendChild(lineLite(ctx, "Mano izquierda / bajo", bass));
    detail.appendChild(lineLite(ctx, "Mano derecha / voicing", right || "—"));
    detail.appendChild(lineLite(ctx, "Siguiente acorde", data.nextName));
    const lyric = lyricForSection(data.snap, data.sectionKey);
    const lyricBox = ctx.el("div", "s936-pr-lyrics", lyric || "Sin letra para esta sección todavía.");
    detail.appendChild(lyricBox);

    visualGrid.append(visual, detail);
    shell.appendChild(visualGrid);
  }

  function lineLite(ctx, label, value) {
    const p = ctx.el("p", "s936-sp-line");
    p.appendChild(ctx.el("strong", "", label + ":"));
    p.appendChild(document.createTextNode(" " + (value || "")));
    return p;
  }

  function lyricForSection(snap, sectionKey) {
    const lyrics = snap.lyrics || {};
    return String(lyrics[sectionKey] || "").trim();
  }

  function resolveInstrument(ctx, snap) {
    const wanted = state.instrumentView || "auto";
    if (wanted !== "auto") return wanted;
    const inst = String(snap.instrument || ctx.byId?.("instrumentSelect")?.value || "piano").toLowerCase();
    if (inst.includes("guitar")) return "guitar";
    if (inst.includes("ukulele") || inst.includes("uke")) return "ukulele";
    return "piano";
  }

  function instrumentLabel(value) {
    if (value === "guitar") return "Guitarra";
    if (value === "ukulele") return "Ukelele";
    return "Piano";
  }

  const NOTE_INDEX = { C:0, "C#":1, Db:1, D:2, "D#":3, Eb:3, E:4, F:5, "F#":6, Gb:6, G:7, "G#":8, Ab:8, A:9, "A#":10, Bb:10, B:11 };
  const NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const OPEN_PITCH = { guitar: { E:40, A:45, D:50, G:55, B:59 }, ukulele: { G:67, C:60, E:64, A:69 } };

  function normalizeNote(value) {
    const text = String(value || "").trim()
      .replace(/^Do/i, "C").replace(/^Re/i, "D").replace(/^Mi/i, "E").replace(/^Fa/i, "F")
      .replace(/^Sol/i, "G").replace(/^La/i, "A").replace(/^Si/i, "B");
    const match = text.match(/^([A-Ga-g])([#b]?)/);
    return match ? match[1].toUpperCase() + (match[2] || "") : "";
  }

  function pitchClass(note) {
    const n = normalizeNote(note);
    return NOTE_INDEX[n];
  }

  function renderKeyboard(ctx, parent, data) {
    const keyboard = ctx.el("div", "s936-pr-keyboard");
    const active = new Map();
    data.notes.forEach((note, index) => {
      const pc = pitchClass(note);
      if (pc !== undefined) active.set(pc, index);
    });
    const start = 48; // C3
    const end = 72;   // C5
    for (let midi = start; midi <= end; midi++) {
      const name = NOTE_NAMES[midi % 12];
      const key = ctx.el("div", "s936-pr-key" + (name.includes("#") ? " black" : ""), name.replace("#", "♯"));
      const idx = active.get(midi % 12);
      if (idx !== undefined) {
        key.classList.add("on");
        if (idx === 0 || normalizeNote(data.notes[idx]) === data.root) key.classList.add("root");
        else if (idx > 2) key.classList.add("ext");
      }
      keyboard.appendChild(key);
    }
    parent.appendChild(keyboard);
  }

  function renderFretboard(ctx, parent, data, strings, isUkulele) {
    const board = ctx.el("div", "s936-pr-fret " + (isUkulele ? "s936-pr-uke" : ""));
    const grid = ctx.el("div", "s936-pr-fret-grid");
    const pcs = data.notes.map(pitchClass).filter((n) => n !== undefined);
    const rootPc = pitchClass(data.root);

    strings.forEach((stringName) => {
      grid.appendChild(ctx.el("div", "s936-pr-string-label", stringName));
      for (let fret = 0; fret <= (isUkulele ? 5 : 6); fret++) {
        const cell = ctx.el("div", "s936-pr-fret-cell");
        const base = OPEN_PITCH[isUkulele ? "ukulele" : "guitar"][stringName] ?? 40;
        const pc = (base + fret) % 12;
        const noteIndex = pcs.indexOf(pc);
        if (noteIndex !== -1) {
          const dot = ctx.el("span", "s936-pr-dot", String(fret));
          if (pc === rootPc || noteIndex === 0) dot.classList.add("root");
          else if (noteIndex > 2) dot.classList.add("ext");
          cell.appendChild(dot);
        }
        grid.appendChild(cell);
      }
    });

    board.appendChild(grid);
    parent.appendChild(board);
  }

  register();
})();
