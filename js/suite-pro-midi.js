// Studio 936 Composer - Suite Pro MIDI IN Module v1
// Scope: Studio > MIDI IN only. It does not touch app.js, Practice, Drums, Mixer, Recorder, CSS, editor or transport internals.
// Loaded before js/suite-pro.js and rendered through Studio936SuiteProModules.midi.
(function () {
  "use strict";

  const STYLE_ID = "s936SuiteProMidiStyles";
  const MIDI_STATE_KEY = "s936_suitepro_midi_v1";
  const MIDI_CAPTURES_KEY = "s936_suitepro_midi_captures_v1";

  const NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const NOTE_INDEX = { C:0, "C#":1, Db:1, D:2, "D#":3, Eb:3, E:4, F:5, "F#":6, Gb:6, G:7, "G#":8, Ab:8, A:9, "A#":10, Bb:10, B:11 };

  const DEFAULT_STATE = {
    selectedInputId: "",
    selectedOutputId: "",
    selectedAudioInputId: "",
    selectedAudioOutputId: "",
    monitorEnabled: false,
    captureEnabled: false
  };

  function loadState() {
    try { return Object.assign({}, DEFAULT_STATE, JSON.parse(localStorage.getItem(MIDI_STATE_KEY) || "{}")); }
    catch (error) { return Object.assign({}, DEFAULT_STATE); }
  }

  const state = loadState();
  let midiAccess = null;
  let activeMidiInput = null;
  let lastMessages = [];
  let activeNotes = new Map();
  let captureStartedAt = 0;
  let captureEvents = [];

  let audioDevices = [];
  let audioStream = null;
  let audioContext = null;
  let analyser = null;
  let meterTimer = null;

  function saveState() {
    try { localStorage.setItem(MIDI_STATE_KEY, JSON.stringify(state)); } catch (error) {}
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#s936SuitePro .s936-midi-shell { display:grid; gap:12px; }
#s936SuitePro .s936-midi-grid {
  display:grid;
  grid-template-columns:repeat(3, minmax(220px, 1fr));
  gap:12px;
}
#s936SuitePro .s936-midi-grid.two {
  grid-template-columns:minmax(280px,.86fr) minmax(360px,1.14fr);
}
#s936SuitePro .s936-midi-card {
  border:1px solid rgba(255,255,255,.13);
  border-radius:18px;
  background:linear-gradient(135deg, rgba(0,255,204,.08), rgba(255,255,255,.035));
  padding:13px;
  min-width:0;
}
#s936SuitePro .s936-midi-card.primary {
  border-color:rgba(0,255,204,.35);
  background:linear-gradient(135deg, rgba(0,255,204,.13), rgba(255,255,255,.04));
}
#s936SuitePro .s936-midi-card.warn {
  border-color:rgba(255,216,77,.36);
  background:linear-gradient(135deg, rgba(255,216,77,.10), rgba(255,255,255,.035));
}
#s936SuitePro .s936-midi-card h4 {
  margin:0 0 7px;
  color:#8affff;
  font-size:.80rem;
  text-transform:uppercase;
  letter-spacing:.7px;
}
#s936SuitePro .s936-midi-card.warn h4 { color:#ffe066; }
#s936SuitePro .s936-midi-sub {
  color:rgba(255,255,255,.72);
  font-size:.72rem;
  line-height:1.42;
  margin:4px 0 10px;
}
#s936SuitePro .s936-midi-line {
  margin:5px 0;
  color:rgba(255,255,255,.84);
  font-size:.74rem;
  line-height:1.35;
}
#s936SuitePro .s936-midi-line strong {
  color:#ffe066;
  font-weight:950;
}
#s936SuitePro .s936-midi-row {
  display:flex;
  flex-wrap:wrap;
  align-items:center;
  gap:8px;
  margin-top:10px;
}
#s936SuitePro .s936-midi-btn {
  border:1px solid rgba(0,255,204,.45);
  border-radius:999px;
  background:rgba(0,255,204,.08);
  color:#bfffee;
  padding:7px 10px;
  font-size:.64rem;
  font-weight:950;
  cursor:pointer;
}
#s936SuitePro .s936-midi-btn:hover { background:rgba(0,255,204,.15); }
#s936SuitePro .s936-midi-btn.warn {
  border-color:rgba(255,216,77,.70);
  color:#ffe066;
  background:rgba(255,216,77,.10);
}
#s936SuitePro .s936-midi-btn.danger {
  border-color:rgba(255,90,90,.72);
  color:#ffb5b5;
  background:rgba(255,90,90,.10);
}
#s936SuitePro .s936-midi-btn.secondary {
  border-color:rgba(255,255,255,.18);
  color:#fff;
  background:rgba(255,255,255,.06);
}
#s936SuitePro .s936-midi-select {
  width:100%;
  border:1px solid rgba(255,255,255,.15);
  border-radius:12px;
  background:rgba(0,0,0,.28);
  color:#fff;
  padding:8px 10px;
  font-size:.72rem;
  font-weight:800;
}
#s936SuitePro .s936-midi-field {
  display:grid;
  gap:5px;
  margin-top:9px;
}
#s936SuitePro .s936-midi-field label {
  color:#ffe066;
  text-transform:uppercase;
  font-size:.58rem;
  font-weight:950;
  letter-spacing:.7px;
}
#s936SuitePro .s936-midi-pill-row {
  display:flex;
  flex-wrap:wrap;
  gap:6px;
  margin-top:8px;
}
#s936SuitePro .s936-midi-pill {
  border:1px solid rgba(0,255,204,.42);
  border-radius:999px;
  padding:5px 8px;
  background:rgba(0,255,204,.08);
  color:#bfffee;
  font-size:.66rem;
  font-weight:900;
}
#s936SuitePro .s936-midi-pill.root {
  border-color:rgba(255,216,77,.72);
  color:#ffe066;
  background:rgba(255,216,77,.10);
}
#s936SuitePro .s936-midi-pill.bad {
  border-color:rgba(255,90,90,.72);
  color:#ffb5b5;
  background:rgba(255,90,90,.10);
}
#s936SuitePro .s936-midi-pill.good {
  border-color:rgba(0,255,204,.72);
  color:#00ffcc;
  background:rgba(0,255,204,.12);
}
#s936SuitePro .s936-midi-meter {
  height:12px;
  border-radius:999px;
  background:rgba(255,255,255,.14);
  overflow:hidden;
  margin-top:8px;
}
#s936SuitePro .s936-midi-meter span {
  display:block;
  height:100%;
  width:var(--level, 0%);
  background:linear-gradient(90deg, #00ffcc, #ffe066);
  transition:width .08s linear;
}
#s936SuitePro .s936-midi-log {
  display:grid;
  gap:5px;
  max-height:170px;
  overflow:auto;
  padding:6px;
  border:1px solid rgba(255,255,255,.10);
  border-radius:12px;
  background:rgba(0,0,0,.18);
}
#s936SuitePro .s936-midi-event {
  display:grid;
  grid-template-columns:70px 1fr 55px 55px;
  gap:8px;
  color:rgba(255,255,255,.84);
  font-size:.66rem;
  padding:5px 6px;
  border-radius:8px;
  background:rgba(255,255,255,.04);
}
#s936SuitePro .s936-midi-event.note-on { color:#bfffee; }
#s936SuitePro .s936-midi-event.note-off { color:rgba(255,255,255,.58); }
#s936SuitePro .s936-midi-event.cc { color:#ffe066; }
#s936SuitePro .s936-midi-status {
  color:#ffe066;
  font-size:.70rem;
  font-weight:800;
  margin-top:8px;
  min-height:18px;
}
#s936SuitePro .s936-midi-device-list {
  display:grid;
  gap:6px;
  margin-top:8px;
}
#s936SuitePro .s936-midi-device {
  display:flex;
  justify-content:space-between;
  gap:8px;
  border:1px solid rgba(255,255,255,.10);
  border-radius:10px;
  padding:7px 9px;
  background:rgba(255,255,255,.04);
  color:rgba(255,255,255,.84);
  font-size:.68rem;
}
#s936SuitePro .s936-midi-device strong { color:#fff; }
#s936SuitePro .s936-midi-device .tag {
  color:#00ffcc;
  font-weight:950;
  text-transform:uppercase;
  font-size:.56rem;
}
#s936SuitePro .s936-midi-device.flow {
  border-color:rgba(255,216,77,.38);
  background:rgba(255,216,77,.08);
}
#s936SuitePro .s936-midi-mini-keyboard {
  display:flex;
  align-items:flex-end;
  gap:2px;
  min-height:78px;
  padding:7px;
  border-radius:12px;
  background:rgba(0,0,0,.25);
  overflow:auto;
}
#s936SuitePro .s936-midi-key {
  position:relative;
  min-width:18px;
  height:58px;
  border:1px solid rgba(255,255,255,.24);
  border-radius:0 0 5px 5px;
  background:rgba(255,255,255,.90);
  color:#111;
  font-size:.46rem;
  font-weight:950;
  display:flex;
  justify-content:center;
  align-items:flex-end;
  padding-bottom:4px;
}
#s936SuitePro .s936-midi-key.black {
  min-width:14px;
  height:40px;
  background:#080808;
  color:#fff;
  margin-left:-8px;
  margin-right:-8px;
  z-index:2;
}
#s936SuitePro .s936-midi-key.on {
  background:#00ffcc;
  color:#00221d;
  box-shadow:0 0 0 2px rgba(0,255,204,.35) inset;
}
#s936SuitePro .s936-midi-key.chord {
  box-shadow:0 0 0 2px rgba(255,216,77,.38) inset;
}
@media(max-width: 1100px){
  #s936SuitePro .s936-midi-grid,
  #s936SuitePro .s936-midi-grid.two { grid-template-columns:1fr; }
  #s936SuitePro .s936-midi-event { grid-template-columns:60px 1fr 45px 45px; }
}
`;
    document.head.appendChild(style);
  }

  function register() {
    window.Studio936SuiteProModules = window.Studio936SuiteProModules || {};
    window.Studio936SuiteProMidi = { version: "midi-v1", render };
    window.Studio936SuiteProModules.midi = window.Studio936SuiteProMidi;
  }

  function safe(fn, fallback = null) {
    try { return fn(); } catch (error) { console.warn("Suite Pro MIDI:", error); return fallback; }
  }

  function render(ctx, container) {
    installStyles();
    const c = container || ctx.clearContent();
    ctx.title(c, "MIDI IN Pro", "Centro de conexión: MIDI, audio devices, Flow 8, monitor de notas y captura MIDI.");
    const shell = ctx.el("div", "s936-midi-shell");

    renderOverview(ctx, shell);
    renderMidiDevices(ctx, shell);
    renderAudioDevices(ctx, shell);
    renderMonitor(ctx, shell);
    renderCaptures(ctx, shell);

    c.appendChild(shell);
    setTimeout(() => updateLiveDom(ctx), 30);
  }

  function renderOverview(ctx, shell) {
    const snap = ctx.snapshot?.() || {};
    const grid = ctx.el("div", "s936-midi-grid");

    const midiCard = ctx.el("article", "s936-midi-card primary");
    midiCard.appendChild(ctx.el("h4", "", "MIDI"));
    line(ctx, midiCard, "Web MIDI", hasWebMidi() ? "disponible" : "no disponible");
    line(ctx, midiCard, "Entradas", getMidiInputs().length ? String(getMidiInputs().length) : "sin detectar");
    line(ctx, midiCard, "Salidas", getMidiOutputs().length ? String(getMidiOutputs().length) : "sin detectar");
    line(ctx, midiCard, "Monitor", state.monitorEnabled ? "ON" : "OFF");
    const midiRow = ctx.el("div", "s936-midi-row");
    addButton(ctx, midiRow, "Detectar MIDI", () => detectMidi(ctx), "s936-midi-btn warn");
    addButton(ctx, midiRow, state.monitorEnabled ? "Monitor OFF" : "Monitor ON", () => toggleMonitor(ctx));
    addButton(ctx, midiRow, "Exportar MIDI real", () => ctx.callBridge?.("exportMidi"), "s936-midi-btn secondary");
    midiCard.appendChild(midiRow);

    const audioCard = ctx.el("article", "s936-midi-card");
    audioCard.appendChild(ctx.el("h4", "", "Audio / Interface"));
    line(ctx, audioCard, "MediaDevices", navigator.mediaDevices?.enumerateDevices ? "disponible" : "no disponible");
    line(ctx, audioCard, "Entradas audio", countDevices("audioinput"));
    line(ctx, audioCard, "Salidas audio", countDevices("audiooutput"));
    line(ctx, audioCard, "Flow / interface", detectNamedAudioDevice() || "pendiente de permiso");
    const audioRow = ctx.el("div", "s936-midi-row");
    addButton(ctx, audioRow, "Detectar audio", () => detectAudioDevices(ctx), "s936-midi-btn warn");
    addButton(ctx, audioRow, "Test input", () => startAudioTest(ctx));
    addButton(ctx, audioRow, "Stop test", () => stopAudioTest(ctx), "s936-midi-btn danger");
    audioCard.appendChild(audioRow);
    audioCard.appendChild(meter(ctx, "s936-midi-audio-meter"));

    const songCard = ctx.el("article", "s936-midi-card warn");
    songCard.appendChild(ctx.el("h4", "", "Link canción / práctica"));
    line(ctx, songCard, "Canción", snap.title || "—");
    line(ctx, songCard, "Sección", snap.currentSectionName || snap.currentSection || "—");
    line(ctx, songCard, "Acorde actual", ctx.currentChordName?.() || snap.chordLabel || "—");
    const row = ctx.el("div", "s936-midi-pill-row");
    const notes = ctx.currentChordNotes?.() || [];
    if (notes.length) notes.slice(0, 8).forEach((n, i) => row.appendChild(ctx.el("span", "s936-midi-pill" + (i === 0 ? " root" : ""), n)));
    else row.appendChild(ctx.el("span", "s936-midi-pill", "Sin notas"));
    songCard.appendChild(row);
    songCard.appendChild(ctx.el("div", "s936-midi-status s936-midi-match-status", "Toca notas MIDI para comparar con el acorde actual."));

    grid.append(midiCard, audioCard, songCard);
    shell.appendChild(grid);
  }

  function renderMidiDevices(ctx, shell) {
    const grid = ctx.el("div", "s936-midi-grid two");

    const control = ctx.el("article", "s936-midi-card");
    control.appendChild(ctx.el("h4", "", "Dispositivos MIDI"));
    control.appendChild(ctx.el("p", "s936-midi-sub", "Selecciona entrada/salida. El monitor muestra notas en vivo y compara contra el acorde actual."));

    const inputField = field(ctx, "Entrada MIDI activa");
    const inputSelect = ctx.el("select", "s936-midi-select");
    const inputs = getMidiInputs();
    addOption(ctx, inputSelect, "", inputs.length ? "Elige entrada MIDI" : "Sin entradas MIDI detectadas");
    inputs.forEach((input) => addOption(ctx, inputSelect, input.id, input.name || input.manufacturer || input.id, state.selectedInputId === input.id));
    inputSelect.onchange = () => {
      state.selectedInputId = inputSelect.value;
      saveState();
      attachMidiInput(ctx);
      ctx.render?.();
    };
    inputField.appendChild(inputSelect);

    const outputField = field(ctx, "Salida MIDI activa");
    const outputSelect = ctx.el("select", "s936-midi-select");
    const outputs = getMidiOutputs();
    addOption(ctx, outputSelect, "", outputs.length ? "Elige salida MIDI" : "Sin salidas MIDI detectadas");
    outputs.forEach((output) => addOption(ctx, outputSelect, output.id, output.name || output.manufacturer || output.id, state.selectedOutputId === output.id));
    outputSelect.onchange = () => {
      state.selectedOutputId = outputSelect.value;
      saveState();
      ctx.render?.();
    };
    outputField.appendChild(outputSelect);

    control.append(inputField, outputField);
    const row = ctx.el("div", "s936-midi-row");
    addButton(ctx, row, "Refrescar MIDI", () => detectMidi(ctx));
    addButton(ctx, row, "Enviar nota test", () => sendTestNote(ctx), "s936-midi-btn secondary");
    control.appendChild(row);
    control.appendChild(ctx.el("div", "s936-midi-status s936-midi-device-status", ""));

    const listCard = ctx.el("article", "s936-midi-card");
    listCard.appendChild(ctx.el("h4", "", "Lista detectada"));
    const list = ctx.el("div", "s936-midi-device-list");
    if (!inputs.length && !outputs.length) {
      list.appendChild(ctx.el("div", "s936-midi-device", "Pulsa Detectar MIDI para solicitar permisos."));
    } else {
      inputs.forEach((input) => list.appendChild(deviceRow(ctx, "IN", input.name || input.manufacturer || input.id, input.state || "connected", state.selectedInputId === input.id)));
      outputs.forEach((output) => list.appendChild(deviceRow(ctx, "OUT", output.name || output.manufacturer || output.id, output.state || "connected", state.selectedOutputId === output.id)));
    }
    listCard.appendChild(list);

    grid.append(control, listCard);
    shell.appendChild(grid);
  }

  function renderAudioDevices(ctx, shell) {
    const grid = ctx.el("div", "s936-midi-grid two");

    const control = ctx.el("article", "s936-midi-card");
    control.appendChild(ctx.el("h4", "", "Audio Devices / Flow 8"));
    control.appendChild(ctx.el("p", "s936-midi-sub", "Aquí vive el diagnóstico de tarjetas e interfaces. Flow 8, Maono o micrófonos aparecen después de dar permiso al navegador."));

    const inputs = audioDevices.filter((d) => d.kind === "audioinput");
    const outputs = audioDevices.filter((d) => d.kind === "audiooutput");

    const inputField = field(ctx, "Entrada de audio");
    const inputSelect = ctx.el("select", "s936-midi-select");
    addOption(ctx, inputSelect, "", inputs.length ? "Elige entrada de audio" : "Sin entradas detectadas");
    inputs.forEach((device, index) => addOption(ctx, inputSelect, device.deviceId, device.label || ("Entrada " + (index + 1)), state.selectedAudioInputId === device.deviceId));
    inputSelect.onchange = () => {
      state.selectedAudioInputId = inputSelect.value;
      saveState();
    };
    inputField.appendChild(inputSelect);

    const outputField = field(ctx, "Salida de audio");
    const outputSelect = ctx.el("select", "s936-midi-select");
    addOption(ctx, outputSelect, "", outputs.length ? "Elige salida de audio" : "Sin salidas detectadas");
    outputs.forEach((device, index) => addOption(ctx, outputSelect, device.deviceId, device.label || ("Salida " + (index + 1)), state.selectedAudioOutputId === device.deviceId));
    outputSelect.onchange = () => {
      state.selectedAudioOutputId = outputSelect.value;
      saveState();
    };
    outputField.appendChild(outputSelect);

    control.append(inputField, outputField);
    const row = ctx.el("div", "s936-midi-row");
    addButton(ctx, row, "Permiso + detectar", () => detectAudioDevices(ctx), "s936-midi-btn warn");
    addButton(ctx, row, "Test entrada", () => startAudioTest(ctx));
    addButton(ctx, row, "Stop test", () => stopAudioTest(ctx), "s936-midi-btn danger");
    control.appendChild(row);
    control.appendChild(meter(ctx, "s936-midi-audio-meter-2"));
    control.appendChild(ctx.el("div", "s936-midi-status s936-midi-audio-status", ""));

    const listCard = ctx.el("article", "s936-midi-card");
    listCard.appendChild(ctx.el("h4", "", "Interfaces encontradas"));
    const list = ctx.el("div", "s936-midi-device-list");
    if (!audioDevices.length) {
      list.appendChild(ctx.el("div", "s936-midi-device", "Pulsa Permiso + detectar para listar entradas y salidas."));
    } else {
      audioDevices
        .filter((d) => d.kind === "audioinput" || d.kind === "audiooutput")
        .forEach((device, index) => list.appendChild(audioRow(ctx, device, index)));
    }
    listCard.appendChild(list);

    grid.append(control, listCard);
    shell.appendChild(grid);
  }

  function renderMonitor(ctx, shell) {
    const grid = ctx.el("div", "s936-midi-grid two");

    const now = ctx.el("article", "s936-midi-card primary");
    now.appendChild(ctx.el("h4", "", "Monitor de notas"));
    now.appendChild(ctx.el("p", "s936-midi-sub", "Las notas activas se iluminan y se comparan contra el acorde actual. Ideal para práctica y diagnóstico de teclado/controlador."));
    const active = ctx.el("div", "s936-midi-pill-row s936-midi-active-notes");
    now.appendChild(active);
    const keyboard = ctx.el("div", "s936-midi-mini-keyboard s936-midi-live-keyboard");
    now.appendChild(keyboard);
    const row = ctx.el("div", "s936-midi-row");
    addButton(ctx, row, state.captureEnabled ? "Captura MIDI ON" : "Capturar MIDI", () => toggleCapture(ctx), state.captureEnabled ? "s936-midi-btn warn" : "s936-midi-btn");
    addButton(ctx, row, "Guardar captura", () => saveCapture(ctx), "s936-midi-btn secondary");
    addButton(ctx, row, "Limpiar monitor", () => {
      activeNotes.clear();
      lastMessages = [];
      captureEvents = [];
      updateLiveDom(ctx);
    }, "s936-midi-btn danger");
    now.appendChild(row);
    now.appendChild(ctx.el("div", "s936-midi-status s936-midi-capture-status", state.captureEnabled ? "Grabando eventos MIDI..." : ""));

    const logCard = ctx.el("article", "s936-midi-card");
    logCard.appendChild(ctx.el("h4", "", "Eventos MIDI"));
    const log = ctx.el("div", "s936-midi-log s936-midi-log-box");
    logCard.appendChild(log);

    grid.append(now, logCard);
    shell.appendChild(grid);
  }

  function renderCaptures(ctx, shell) {
    const card = ctx.el("article", "s936-midi-card");
    card.appendChild(ctx.el("h4", "", "Capturas MIDI guardadas"));
    const captures = loadCaptures();
    if (!captures.length) {
      card.appendChild(ctx.el("p", "s936-midi-sub", "Todavía no hay capturas. Activa Capturar MIDI, toca una idea, y guárdala."));
    } else {
      const list = ctx.el("div", "s936-midi-device-list");
      captures.slice(0, 8).forEach((cap) => {
        const row = ctx.el("div", "s936-midi-device");
        const left = ctx.el("div", "");
        left.appendChild(ctx.el("strong", "", cap.title || "Idea MIDI"));
        left.appendChild(ctx.el("div", "", `${new Date(cap.createdAt).toLocaleString()} · ${cap.events?.length || 0} eventos · ${cap.songTitle || "Sin canción"}`));
        const actions = ctx.el("div", "s936-midi-row");
        addButton(ctx, actions, "TXT", () => downloadMidiCaptureText(cap), "s936-midi-btn secondary");
        addButton(ctx, actions, "JSON", () => downloadMidiCaptureJson(cap), "s936-midi-btn warn");
        addButton(ctx, actions, "Borrar", () => deleteCapture(ctx, cap.id), "s936-midi-btn danger");
        row.append(left, actions);
        list.appendChild(row);
      });
      card.appendChild(list);
    }
    shell.appendChild(card);
  }

  function line(ctx, parent, label, value) {
    const p = ctx.el("p", "s936-midi-line");
    p.appendChild(ctx.el("strong", "", label + ":"));
    p.appendChild(document.createTextNode(" " + (value || "—")));
    parent.appendChild(p);
  }

  function field(ctx, label) {
    const wrap = ctx.el("label", "s936-midi-field");
    wrap.appendChild(ctx.el("span", "", label));
    return wrap;
  }

  function addOption(ctx, select, value, label, selected) {
    const option = ctx.el("option", "", label);
    option.value = value;
    if (selected) option.selected = true;
    select.appendChild(option);
  }

  function addButton(ctx, parent, label, fn, className = "s936-midi-btn") {
    const btn = ctx.el("button", className, label);
    btn.type = "button";
    btn.onclick = fn;
    parent.appendChild(btn);
    return btn;
  }

  function meter(ctx, className) {
    const box = ctx.el("div", "s936-midi-meter " + className);
    const bar = ctx.el("span", "");
    box.appendChild(bar);
    return box;
  }

  function deviceRow(ctx, kind, name, status, active) {
    const row = ctx.el("div", "s936-midi-device" + (isInterfaceName(name) ? " flow" : ""));
    const left = ctx.el("div", "");
    left.appendChild(ctx.el("strong", "", name || "Dispositivo"));
    left.appendChild(ctx.el("div", "", status || ""));
    const tag = ctx.el("span", "tag", active ? kind + " activo" : kind);
    row.append(left, tag);
    return row;
  }

  function audioRow(ctx, device, index) {
    const label = device.label || (device.kind + " " + (index + 1));
    const row = ctx.el("div", "s936-midi-device" + (isInterfaceName(label) ? " flow" : ""));
    const left = ctx.el("div", "");
    left.appendChild(ctx.el("strong", "", label));
    left.appendChild(ctx.el("div", "", device.kind === "audioinput" ? "Entrada" : "Salida"));
    row.append(left, ctx.el("span", "tag", isInterfaceName(label) ? "Studio" : "Audio"));
    return row;
  }

  function hasWebMidi() {
    return typeof navigator !== "undefined" && typeof navigator.requestMIDIAccess === "function";
  }

  async function detectMidi(ctx) {
    if (!hasWebMidi()) {
      toast(ctx, "Web MIDI no disponible en este navegador.");
      return;
    }
    try {
      midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      midiAccess.onstatechange = () => ctx.render?.();
      const inputs = getMidiInputs();
      const outputs = getMidiOutputs();
      if (!state.selectedInputId && inputs[0]) state.selectedInputId = inputs[0].id;
      if (!state.selectedOutputId && outputs[0]) state.selectedOutputId = outputs[0].id;
      saveState();
      attachMidiInput(ctx);
      toast(ctx, `MIDI detectado: ${inputs.length} IN · ${outputs.length} OUT`);
      ctx.render?.();
    } catch (error) {
      toast(ctx, "No se pudo acceder a MIDI: " + (error?.message || error));
    }
  }

  function getMidiInputs() {
    if (!midiAccess) return [];
    return Array.from(midiAccess.inputs.values());
  }

  function getMidiOutputs() {
    if (!midiAccess) return [];
    return Array.from(midiAccess.outputs.values());
  }

  function attachMidiInput(ctx) {
    if (activeMidiInput) {
      try { activeMidiInput.onmidimessage = null; } catch (error) {}
      activeMidiInput = null;
    }
    if (!midiAccess || !state.monitorEnabled) return;
    const input = getMidiInputs().find((item) => item.id === state.selectedInputId) || getMidiInputs()[0];
    if (!input) return;
    activeMidiInput = input;
    activeMidiInput.onmidimessage = (event) => handleMidiMessage(ctx, event);
  }

  function toggleMonitor(ctx) {
    state.monitorEnabled = !state.monitorEnabled;
    saveState();
    attachMidiInput(ctx);
    toast(ctx, state.monitorEnabled ? "Monitor MIDI ON" : "Monitor MIDI OFF");
    ctx.render?.();
  }

  function handleMidiMessage(ctx, event) {
    const data = Array.from(event.data || []);
    const status = data[0] || 0;
    const command = status & 0xf0;
    const channel = (status & 0x0f) + 1;
    const noteNumber = data[1] || 0;
    const velocity = data[2] || 0;
    const type = command === 0x90 && velocity > 0 ? "note-on"
      : (command === 0x80 || (command === 0x90 && velocity === 0)) ? "note-off"
      : command === 0xb0 ? "cc"
      : "midi";

    const noteName = midiNoteName(noteNumber);
    if (type === "note-on") {
      activeNotes.set(noteNumber, { noteNumber, noteName, velocity, channel, time: Date.now() });
    } else if (type === "note-off") {
      activeNotes.delete(noteNumber);
    }

    const message = {
      type,
      noteNumber,
      noteName,
      velocity,
      channel,
      controller: command === 0xb0 ? noteNumber : null,
      value: command === 0xb0 ? velocity : null,
      at: Date.now()
    };
    lastMessages.unshift(message);
    lastMessages = lastMessages.slice(0, 40);

    if (state.captureEnabled) {
      captureEvents.push(Object.assign({}, message, { t: Date.now() - captureStartedAt }));
    }

    updateLiveDom(ctx);
  }

  function updateLiveDom(ctx) {
    updateActiveNotes(ctx);
    updateLiveKeyboard(ctx);
    updateLog(ctx);
    updateMatch(ctx);
  }

  function updateActiveNotes(ctx) {
    const box = document.querySelector("#s936SuitePro .s936-midi-active-notes");
    if (!box) return;
    box.textContent = "";
    const notes = Array.from(activeNotes.values()).sort((a, b) => a.noteNumber - b.noteNumber);
    if (!notes.length) {
      box.appendChild(ctx.el("span", "s936-midi-pill", "Sin notas activas"));
      return;
    }
    const chordPcs = currentChordPitchClasses(ctx);
    notes.forEach((note) => {
      const good = chordPcs.includes(note.noteNumber % 12);
      box.appendChild(ctx.el("span", "s936-midi-pill " + (good ? "good" : "bad"), `${note.noteName} · v${note.velocity}`));
    });
  }

  function updateLiveKeyboard(ctx) {
    const keyboard = document.querySelector("#s936SuitePro .s936-midi-live-keyboard");
    if (!keyboard) return;
    keyboard.textContent = "";
    const chordPcs = currentChordPitchClasses(ctx);
    const activePcs = new Set(Array.from(activeNotes.values()).map((n) => n.noteNumber % 12));
    const start = 48;
    const end = 72;
    for (let midi = start; midi <= end; midi += 1) {
      const name = NOTE_NAMES[midi % 12];
      const key = ctx.el("div", "s936-midi-key" + (name.includes("#") ? " black" : ""), name.replace("#", "♯"));
      if (chordPcs.includes(midi % 12)) key.classList.add("chord");
      if (activePcs.has(midi % 12)) key.classList.add("on");
      keyboard.appendChild(key);
    }
  }

  function updateLog(ctx) {
    const log = document.querySelector("#s936SuitePro .s936-midi-log-box");
    if (!log) return;
    log.textContent = "";
    if (!lastMessages.length) {
      log.appendChild(ctx.el("div", "s936-midi-event", "Sin eventos MIDI todavía."));
      return;
    }
    lastMessages.slice(0, 24).forEach((m) => {
      const row = ctx.el("div", "s936-midi-event " + m.type);
      row.appendChild(ctx.el("span", "", m.type));
      row.appendChild(ctx.el("span", "", m.type === "cc" ? `CC ${m.controller} = ${m.value}` : `${m.noteName} (${m.noteNumber})`));
      row.appendChild(ctx.el("span", "", "v " + m.velocity));
      row.appendChild(ctx.el("span", "", "ch " + m.channel));
      log.appendChild(row);
    });
  }

  function updateMatch(ctx) {
    const status = document.querySelector("#s936SuitePro .s936-midi-match-status");
    if (!status) return;
    const notes = Array.from(activeNotes.values());
    if (!notes.length) {
      status.textContent = "Toca notas MIDI para comparar con el acorde actual.";
      return;
    }
    const chordPcs = currentChordPitchClasses(ctx);
    const good = notes.filter((n) => chordPcs.includes(n.noteNumber % 12));
    const bad = notes.filter((n) => !chordPcs.includes(n.noteNumber % 12));
    status.textContent = bad.length
      ? `Fuera del acorde: ${bad.map((n) => n.noteName).join(" · ")}`
      : `Dentro del acorde: ${good.map((n) => n.noteName).join(" · ")}`;
  }

  async function detectAudioDevices(ctx) {
    if (!navigator.mediaDevices?.enumerateDevices) {
      toast(ctx, "MediaDevices no disponible.");
      return;
    }
    try {
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch (permissionError) {
        // Some browsers still enumerate partial info without permission.
      }
      audioDevices = await navigator.mediaDevices.enumerateDevices();
      if (stream) stream.getTracks().forEach((track) => track.stop());

      const inputs = audioDevices.filter((d) => d.kind === "audioinput");
      const outputs = audioDevices.filter((d) => d.kind === "audiooutput");
      if (!state.selectedAudioInputId && inputs[0]) state.selectedAudioInputId = inputs[0].deviceId;
      if (!state.selectedAudioOutputId && outputs[0]) state.selectedAudioOutputId = outputs[0].deviceId;
      saveState();
      toast(ctx, `Audio detectado: ${inputs.length} entradas · ${outputs.length} salidas`);
      ctx.render?.();
    } catch (error) {
      toast(ctx, "No se pudo detectar audio: " + (error?.message || error));
    }
  }

  async function startAudioTest(ctx) {
    stopAudioTest(ctx, false);
    if (!navigator.mediaDevices?.getUserMedia) {
      toast(ctx, "getUserMedia no disponible.");
      return;
    }
    try {
      const constraints = state.selectedAudioInputId
        ? { audio: { deviceId: { exact: state.selectedAudioInputId } }, video: false }
        : { audio: true, video: false };
      audioStream = await navigator.mediaDevices.getUserMedia(constraints);
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(audioStream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.fftSize);
      meterTimer = setInterval(() => {
        if (!analyser) return;
        analyser.getByteTimeDomainData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i += 1) {
          const v = (buffer[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buffer.length);
        const level = Math.min(100, Math.round(rms * 260));
        setMeterLevel(level);
      }, 80);
      toast(ctx, "Test de entrada activo.");
    } catch (error) {
      toast(ctx, "No se pudo iniciar test: " + (error?.message || error));
    }
  }

  function stopAudioTest(ctx, showToast = true) {
    if (meterTimer) clearInterval(meterTimer);
    meterTimer = null;
    if (audioStream) audioStream.getTracks().forEach((track) => track.stop());
    audioStream = null;
    if (audioContext) safe(() => audioContext.close(), null);
    audioContext = null;
    analyser = null;
    setMeterLevel(0);
    if (showToast && ctx) toast(ctx, "Test de entrada detenido.");
  }

  function setMeterLevel(level) {
    document.querySelectorAll("#s936SuitePro .s936-midi-meter span").forEach((bar) => {
      bar.style.setProperty("--level", Math.max(0, Math.min(100, Number(level) || 0)) + "%");
    });
  }

  function countDevices(kind) {
    const count = audioDevices.filter((d) => d.kind === kind).length;
    return count ? String(count) : "sin detectar";
  }

  function detectNamedAudioDevice() {
    const names = audioDevices.map((d) => d.label).filter(Boolean);
    const found = names.find(isInterfaceName);
    return found || "";
  }

  function isInterfaceName(name) {
    return /flow|behringer|maono|focusrite|scarlett|presonus|steinberg|zoom|rode|ssl|apollo|m-audio/i.test(String(name || ""));
  }

  function toggleCapture(ctx) {
    state.captureEnabled = !state.captureEnabled;
    if (state.captureEnabled) {
      captureStartedAt = Date.now();
      captureEvents = [];
    }
    saveState();
    toast(ctx, state.captureEnabled ? "Captura MIDI iniciada." : "Captura MIDI detenida.");
    ctx.render?.();
  }

  function saveCapture(ctx) {
    if (!captureEvents.length) {
      toast(ctx, "No hay eventos MIDI para guardar.");
      return;
    }
    const snap = ctx.snapshot?.() || {};
    const capture = {
      id: "midi-" + Date.now(),
      title: (snap.title || "Canción") + " · MIDI idea",
      songTitle: snap.title || "",
      section: snap.currentSection || "",
      chord: ctx.currentChordName?.() || snap.chordLabel || "",
      bpm: snap.bpm || "",
      createdAt: new Date().toISOString(),
      events: captureEvents.slice()
    };
    const captures = loadCaptures();
    captures.unshift(capture);
    localStorage.setItem(MIDI_CAPTURES_KEY, JSON.stringify(captures.slice(0, 50)));
    state.captureEnabled = false;
    saveState();
    captureEvents = [];
    toast(ctx, "Captura MIDI guardada.");
    ctx.render?.();
  }

  function loadCaptures() {
    try { return JSON.parse(localStorage.getItem(MIDI_CAPTURES_KEY) || "[]"); }
    catch (error) { return []; }
  }

  function deleteCapture(ctx, id) {
    const captures = loadCaptures().filter((cap) => cap.id !== id);
    localStorage.setItem(MIDI_CAPTURES_KEY, JSON.stringify(captures));
    toast(ctx, "Captura borrada.");
    ctx.render?.();
  }

  function downloadMidiCaptureJson(cap) {
    downloadText(slug(cap.title || cap.id) + ".midi-capture.json", JSON.stringify(cap, null, 2), "application/json;charset=utf-8");
  }

  function downloadMidiCaptureText(cap) {
    const lines = [
      "Studio 936 MIDI Capture",
      "Título: " + (cap.title || ""),
      "Canción: " + (cap.songTitle || ""),
      "Sección: " + (cap.section || ""),
      "Acorde: " + (cap.chord || ""),
      "BPM: " + (cap.bpm || ""),
      "Fecha: " + (cap.createdAt || ""),
      "",
      "Eventos:",
      ...(cap.events || []).map((e) => `${e.t || 0}ms · ${e.type} · ${e.noteName || ""} · note ${e.noteNumber || ""} · vel ${e.velocity || ""} · ch ${e.channel || ""}`)
    ];
    downloadText(slug(cap.title || cap.id) + ".midi-capture.txt", lines.join("\n"), "text/plain;charset=utf-8");
  }

  function sendTestNote(ctx) {
    if (!midiAccess) {
      toast(ctx, "Primero detecta MIDI.");
      return;
    }
    const output = getMidiOutputs().find((item) => item.id === state.selectedOutputId) || getMidiOutputs()[0];
    if (!output) {
      toast(ctx, "No hay salida MIDI seleccionada.");
      return;
    }
    try {
      output.send([0x90, 60, 90]);
      setTimeout(() => output.send([0x80, 60, 0]), 450);
      toast(ctx, "Nota test enviada: C4.");
    } catch (error) {
      toast(ctx, "No se pudo enviar nota test.");
    }
  }

  function currentChordPitchClasses(ctx) {
    const notes = ctx.currentChordNotes?.() || [];
    const pcs = notes.map((n) => pitchClass(n)).filter((pc) => pc !== undefined);
    if (pcs.length) return Array.from(new Set(pcs));
    const fallback = ctx.notesFromChordName?.(ctx.currentChordName?.() || "") || [];
    return Array.from(new Set(fallback.map((n) => pitchClass(n)).filter((pc) => pc !== undefined)));
  }

  function pitchClass(value) {
    const note = normalizeNote(value);
    return NOTE_INDEX[note];
  }

  function normalizeNote(value) {
    const text = String(value || "").trim()
      .replace(/^Do/i, "C").replace(/^Re/i, "D").replace(/^Mi/i, "E").replace(/^Fa/i, "F")
      .replace(/^Sol/i, "G").replace(/^La/i, "A").replace(/^Si/i, "B");
    const match = text.match(/^([A-Ga-g])([#b]?)/);
    return match ? match[1].toUpperCase() + (match[2] || "") : "";
  }

  function midiNoteName(noteNumber) {
    const n = Number(noteNumber) || 0;
    const name = NOTE_NAMES[((n % 12) + 12) % 12];
    const octave = Math.floor(n / 12) - 1;
    return name + octave;
  }

  function toast(ctx, message) {
    if (typeof ctx?.bridge === "function") {
      const api = ctx.bridge();
      if (api && typeof api.flashStatus === "function") {
        try { api.flashStatus(message); } catch (error) {}
      }
    }
    const status = document.querySelector("#s936SuitePro .s936-midi-device-status") ||
      document.querySelector("#s936SuitePro .s936-midi-audio-status") ||
      document.querySelector("#s936SuitePro .s936-midi-status");
    if (status) status.textContent = message;
  }

  function downloadText(filename, text, type) {
    const blob = new Blob([String(text || "")], { type: type || "text/plain;charset=utf-8" });
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
    return String(text || "studio936-midi").toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "studio936-midi";
  }

  register();
})();
