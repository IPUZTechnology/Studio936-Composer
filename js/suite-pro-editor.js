// Studio 936 Composer - Suite Pro Editor v0.1
// Scope: Editor tab inside Compose. Uses the explicit Studio936AppBridge.
// It does not replace or delete the legacy editor.
(function () {
  "use strict";

  const STYLE_ID = "s936SuiteProEditorStyles";
  const VERSION = "editor-v0.1-main-instrument";
  const state = {
    sectionKey: "",
    chordIndex: null,
    instrument: ""
  };

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#s936SuitePro .s936-ed-shell{display:grid;gap:10px}
#s936SuitePro .s936-ed-card{border:1px solid rgba(255,255,255,.13);border-radius:16px;background:rgba(255,255,255,.045);padding:12px}
#s936SuitePro .s936-ed-card.primary{border-color:rgba(0,255,204,.38);background:linear-gradient(135deg,rgba(0,255,204,.09),rgba(255,255,255,.035))}
#s936SuitePro .s936-ed-title{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:9px}
#s936SuitePro .s936-ed-title h4{margin:0;color:#8affff;font-size:.82rem;text-transform:uppercase;letter-spacing:.8px}
#s936SuitePro .s936-ed-version{color:rgba(255,255,255,.48);font-size:.56rem;font-weight:900}
#s936SuitePro .s936-ed-note{margin:0;color:rgba(255,255,255,.67);font-size:.66rem;line-height:1.42}
#s936SuitePro .s936-ed-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
#s936SuitePro .s936-ed-field.full{grid-column:1/-1}
#s936SuitePro .s936-ed-field label{display:block;color:#ffe066;font-size:.56rem;font-weight:950;text-transform:uppercase;letter-spacing:.65px;margin:0 0 4px}
#s936SuitePro .s936-ed-input,#s936SuitePro .s936-ed-select{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.17);border-radius:11px;background:rgba(0,0,0,.34);color:#fff;padding:8px 9px;font-size:.72rem;font-weight:800}
#s936SuitePro .s936-ed-input:focus,#s936SuitePro .s936-ed-select:focus{outline:none;border-color:rgba(0,255,204,.72);box-shadow:0 0 0 2px rgba(0,255,204,.10)}
#s936SuitePro .s936-ed-instruments{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:9px 0}
#s936SuitePro .s936-ed-inst{border:1px solid rgba(255,255,255,.16);border-radius:12px;background:rgba(255,255,255,.05);color:#fff;padding:8px 6px;font-size:.61rem;font-weight:950;text-transform:uppercase;cursor:pointer}
#s936SuitePro .s936-ed-inst.active{border-color:#00ffcc;background:rgba(0,255,204,.14);color:#bfffee}
#s936SuitePro .s936-ed-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
#s936SuitePro .s936-ed-btn{border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(255,255,255,.06);color:#fff;padding:7px 10px;font-size:.59rem;font-weight:950;text-transform:uppercase;cursor:pointer}
#s936SuitePro .s936-ed-btn.primary{border-color:rgba(0,255,204,.60);background:rgba(0,255,204,.12);color:#bfffee}
#s936SuitePro .s936-ed-btn.warn{border-color:rgba(255,216,77,.65);background:rgba(255,216,77,.10);color:#ffe066}
#s936SuitePro .s936-ed-btn.danger{border-color:rgba(255,90,90,.65);background:rgba(255,90,90,.10);color:#ffb9b9}
#s936SuitePro .s936-ed-status{min-height:16px;margin-top:8px;color:#bfffee;font-size:.62rem;font-weight:800;line-height:1.35}
#s936SuitePro .s936-ed-map{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}
#s936SuitePro .s936-ed-chip{border:1px solid rgba(0,255,204,.35);border-radius:999px;background:rgba(0,255,204,.08);color:#bfffee;padding:4px 7px;font-size:.58rem;font-weight:900}
#s936SuitePro .s936-ed-chip.bass{border-color:rgba(255,91,234,.55);background:rgba(255,91,234,.10);color:#ffd4fb}
#s936SuitePro .s936-ed-visual-note{border-left:3px solid #ffe066;padding-left:9px;margin-top:10px;color:rgba(255,255,255,.72);font-size:.62rem;line-height:1.45}
@media(max-width:760px){#s936SuitePro .s936-ed-grid{grid-template-columns:1fr}#s936SuitePro .s936-ed-field.full{grid-column:auto}}
`;
    document.head.appendChild(style);
  }

  function bridge(name, ...args) {
    const api = window.Studio936AppBridge;
    if (!api || typeof api[name] !== "function") {
      console.warn("Suite Pro Editor: bridge method unavailable:", name);
      return null;
    }
    try {
      return api[name](...args);
    } catch (error) {
      console.error("Suite Pro Editor bridge error:", name, error);
      return null;
    }
  }

  function el(ctx, tag, className, text) {
    if (ctx && typeof ctx.el === "function") return ctx.el(tag, className || "", text);
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function field(ctx, label, control, full) {
    const wrap = el(ctx, "div", "s936-ed-field" + (full ? " full" : ""));
    wrap.appendChild(el(ctx, "label", "", label));
    wrap.appendChild(control);
    return wrap;
  }

  function makeInput(ctx, type, value) {
    const input = el(ctx, "input", "s936-ed-input");
    input.type = type || "text";
    input.value = value ?? "";
    return input;
  }

  function makeSelect(ctx, options, value) {
    const select = el(ctx, "select", "s936-ed-select");
    (options || []).forEach(([v, label]) => {
      const option = document.createElement("option");
      option.value = v;
      option.textContent = label;
      select.appendChild(option);
    });
    if (value !== undefined && value !== null) select.value = String(value);
    return select;
  }

  function button(ctx, label, className, handler) {
    const btn = el(ctx, "button", "s936-ed-btn " + (className || ""), label);
    btn.type = "button";
    btn.addEventListener("click", handler);
    return btn;
  }

  function humanize(key) {
    const known = {
      intro: "Introducción",
      verse: "Verso",
      verse1: "Verso 1",
      verse2: "Verso 2",
      verse3: "Verso 3",
      verse4: "Verso 4",
      prechorus: "Pre-coro",
      chorus: "Coro",
      bridge: "Puente",
      interlude: "Interludio",
      solo: "Solo",
      outro: "Outro"
    };
    return known[key] || String(key || "Sección").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }

  function parseNoteTokens(text) {
    return String(text || "").trim().split(/\s+/).filter(Boolean);
  }

  function currentPayload(controls) {
    return {
      sectionKey: controls.section.value,
      chordIndex: Number(controls.chord.value) || 0,
      name: controls.name.value.trim() || "Acorde",
      bass: controls.bass.value.trim(),
      notes: controls.notes.value.trim(),
      bars: Math.max(1, Math.min(16, Number(controls.bars.value) || 1)),
      instrument: state.instrument || "piano"
    };
  }

  function setStatus(node, message, isError) {
    node.textContent = message || "";
    node.style.color = isError ? "#ffb9b9" : "#bfffee";
  }

  function getEditorState() {
    return bridge("getEditorState") || {
      sectionKey: "intro",
      chordIndex: 0,
      instrument: "piano",
      sections: {},
      sectionOptions: []
    };
  }

  function render(ctx, host) {
    installStyles();
    const mount = el(ctx, "div", "s936-ed-module");
    host.appendChild(mount);
    paint(ctx, mount);
  }

  function paint(ctx, host) {
    installStyles();
    const data = getEditorState();
    const sections = data.sections || {};
    const sectionKeys = Object.keys(sections);
    if (!sectionKeys.length) {
      host.appendChild(el(ctx, "section", "s936-ed-card", "No hay secciones disponibles en el proyecto."));
      return;
    }

    state.sectionKey = sections[state.sectionKey] ? state.sectionKey : (data.sectionKey || sectionKeys[0]);
    state.chordIndex = state.chordIndex === null ? (Number(data.chordIndex) || 0) : (Number(state.chordIndex) || 0);
    state.instrument = state.instrument || data.instrument || "piano";

    const seq = Array.isArray(sections[state.sectionKey]) ? sections[state.sectionKey] : [];
    if (state.chordIndex >= seq.length) state.chordIndex = Math.max(0, seq.length - 1);
    const item = seq[state.chordIndex] || { name: "C", bass: "C2", notes: "C3 E3 G3", bars: 1 };

    const shell = el(ctx, "div", "s936-ed-shell");
    const card = el(ctx, "section", "s936-ed-card primary");
    const title = el(ctx, "div", "s936-ed-title");
    title.appendChild(el(ctx, "h4", "", "Editor Pro · Acordes"));
    title.appendChild(el(ctx, "span", "s936-ed-version", VERSION));
    card.appendChild(title);
    card.appendChild(el(ctx, "p", "s936-ed-note", "Edita aquí y conserva visible el piano, la guitarra o el ukelele principal. El acorde seleccionado se refleja sobre el instrumento grande."));

    const instruments = el(ctx, "div", "s936-ed-instruments");
    [
      ["piano", "Piano"],
      ["guitar", "Guitarra"],
      ["ukulele", "Ukelele"]
    ].forEach(([key, label]) => {
      const btn = el(ctx, "button", "s936-ed-inst" + (state.instrument === key ? " active" : ""), label);
      btn.type = "button";
      btn.addEventListener("click", () => {
        const result = bridge("setEditorInstrument", key);
        if (result && result.ok === false) return;
        state.instrument = key;
        renderModule(ctx, host);
      });
      instruments.appendChild(btn);
    });
    card.appendChild(instruments);

    const sectionOptions = (data.sectionOptions || sectionKeys.map(k => [k, humanize(k)]))
      .filter(entry => Array.isArray(entry) && sections[entry[0]])
      .map(entry => [entry[0], entry[1] || humanize(entry[0])]);

    const sectionSelect = makeSelect(ctx, sectionOptions, state.sectionKey);
    const chordSelect = makeSelect(
      ctx,
      seq.map((ch, index) => [String(index), `${index + 1}. ${ch.name || "Acorde"} · ${ch.bars || 1} comp.`]),
      state.chordIndex
    );
    const nameInput = makeInput(ctx, "text", item.name || "");
    const bassInput = makeInput(ctx, "text", item.bass || "C2");
    const notesInput = makeInput(ctx, "text", item.notes || "");
    const barsInput = makeInput(ctx, "number", item.bars || 1);
    barsInput.min = "1";
    barsInput.max = "16";

    const grid = el(ctx, "div", "s936-ed-grid");
    grid.appendChild(field(ctx, "Sección", sectionSelect, true));
    grid.appendChild(field(ctx, "Acorde seleccionado", chordSelect, true));
    grid.appendChild(field(ctx, "Nombre", nameInput, false));
    grid.appendChild(field(ctx, "Bajo", bassInput, false));
    grid.appendChild(field(ctx, state.instrument === "piano" ? "Notas del voicing" : "Notas sonoras del acorde", notesInput, true));
    grid.appendChild(field(ctx, "Compases", barsInput, false));
    card.appendChild(grid);

    const chips = el(ctx, "div", "s936-ed-map");
    if (item.bass) chips.appendChild(el(ctx, "span", "s936-ed-chip bass", "Bajo " + item.bass));
    parseNoteTokens(item.notes).forEach(note => chips.appendChild(el(ctx, "span", "s936-ed-chip", note)));
    card.appendChild(chips);

    const status = el(ctx, "div", "s936-ed-status");
    const controls = {
      section: sectionSelect,
      chord: chordSelect,
      name: nameInput,
      bass: bassInput,
      notes: notesInput,
      bars: barsInput
    };

    sectionSelect.addEventListener("change", () => {
      state.sectionKey = sectionSelect.value;
      state.chordIndex = 0;
      bridge("selectEditorSection", state.sectionKey);
      renderModule(ctx, host);
    });

    chordSelect.addEventListener("change", () => {
      state.chordIndex = Number(chordSelect.value) || 0;
      bridge("selectEditorChord", state.sectionKey, state.chordIndex);
      renderModule(ctx, host);
    });

    const showDraft = () => {
      const result = bridge("showEditorChordVisual", currentPayload(controls));
      if (result && result.ok === false) setStatus(status, result.message || "No se pudo visualizar el acorde.", true);
      else setStatus(status, "Acorde mostrado sobre el instrumento principal.", false);
    };
    notesInput.addEventListener("change", showDraft);
    bassInput.addEventListener("change", showDraft);

    const actionBox = el(ctx, "div", "s936-ed-actions");
    actionBox.appendChild(button(ctx, "Escuchar", "warn", () => {
      const result = bridge("previewEditorChord", currentPayload(controls));
      setStatus(status, result?.message || (result?.ok === false ? "No se pudo escuchar." : "Escuchando acorde."), result?.ok === false);
    }));
    actionBox.appendChild(button(ctx, "Aplicar", "primary", () => {
      const result = bridge("applyEditorChord", currentPayload(controls));
      if (result?.ok === false) {
        setStatus(status, result.message || "No se pudo aplicar el acorde.", true);
        return;
      }
      setStatus(status, result?.message || "Acorde aplicado.", false);
      renderModule(ctx, host);
    }));
    actionBox.appendChild(button(ctx, "Agregar", "", () => {
      const result = bridge("addEditorChord", currentPayload(controls));
      if (result?.ok === false) return setStatus(status, result.message || "No se pudo agregar.", true);
      state.chordIndex = Number(result?.chordIndex) || 0;
      renderModule(ctx, host);
    }));
    actionBox.appendChild(button(ctx, "Duplicar", "", () => {
      const result = bridge("duplicateEditorChord", state.sectionKey, state.chordIndex);
      if (result?.ok === false) return setStatus(status, result.message || "No se pudo duplicar.", true);
      state.chordIndex = Number(result?.chordIndex) || 0;
      renderModule(ctx, host);
    }));
    actionBox.appendChild(button(ctx, "Borrar", "danger", () => {
      if (!window.confirm("¿Borrar este acorde de la sección?")) return;
      const result = bridge("deleteEditorChord", state.sectionKey, state.chordIndex);
      if (result?.ok === false) return setStatus(status, result.message || "No se pudo borrar.", true);
      state.chordIndex = Number(result?.chordIndex) || 0;
      renderModule(ctx, host);
    }));
    card.appendChild(actionBox);
    card.appendChild(status);

    const visualText = state.instrument === "piano"
      ? "Piano: las alturas y el bajo se iluminan en el teclado completo."
      : state.instrument === "guitar"
        ? "Guitarra v0.1: el diapasón completo muestra las posiciones posibles de las notas. La digitación exacta cuerda/traste y TAB llegará en la siguiente fase."
        : "Ukelele v0.1: el diapasón completo muestra las posiciones posibles de las notas. La digitación exacta de cuatro cuerdas llegará en la siguiente fase.";
    card.appendChild(el(ctx, "div", "s936-ed-visual-note", visualText));
    shell.appendChild(card);
    host.appendChild(shell);

    setTimeout(() => {
      bridge("selectEditorChord", state.sectionKey, state.chordIndex);
      bridge("showEditorChordVisual", {
        sectionKey: state.sectionKey,
        chordIndex: state.chordIndex,
        name: item.name,
        bass: item.bass,
        notes: item.notes,
        bars: item.bars,
        instrument: state.instrument
      });
    }, 0);
  }

  function renderModule(ctx, host) {
    if (!host) return;
    while (host.firstChild) host.removeChild(host.firstChild);
    paint(ctx, host);
  }

  function register() {
    window.Studio936SuiteProModules = window.Studio936SuiteProModules || {};
    window.Studio936SuiteProEditor = {
      version: VERSION,
      render
    };
    window.Studio936SuiteProModules.editor = window.Studio936SuiteProEditor;
  }

  register();
})();
