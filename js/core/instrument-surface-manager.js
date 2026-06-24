// Studio 936 Composer - Instrument Surface Manager v0.7.2 Instrument Surfaces Core
// Single owner for Main/Editor instrument surface visibility and lifecycle.
window.Studio936InstrumentSurfaceManager = (() => {
  "use strict";

  const VALID_EDITOR_INSTRUMENTS = new Set(["piano", "guitar", "ukulele", "bass", "lead", "drums"]);
  const state = {
    configured: false,
    active: false,
    editorInstrument: "piano",
    snapshot: null,
    observer: null,
    enforcing: false,
    enforceQueued: false,
    lastStringRender: null,
    lastDrumRender: null,
    options: {}
  };

  function resolve(value) {
    return typeof value === "function" ? value() : value;
  }

  function elements() {
    return {
      piano: resolve(state.options.pianoContainer) || document.getElementById("pianoContainer"),
      fretboard: resolve(state.options.fretboardContainer) || document.getElementById("fretboardContainer")
    };
  }

  function stringSurface() {
    return resolve(state.options.stringSurface) || window.Studio936StringSurface || null;
  }

  function drumSurface() {
    return resolve(state.options.drumSurface) || window.Studio936DrumSurface || null;
  }

  function normalizeInstrument(instrument) {
    const value = String(instrument || "").trim().toLowerCase();
    if (value === "uke" || value === "ukelele" || value === "ukulele") return "ukulele";
    if (value === "guitarra" || value === "guitar") return "guitar";
    if (value === "guitar-lead" || value === "guitarra-lead" || value === "g.lead" || value === "glead") return "lead";
    if (value === "bajo" || value === "bass") return "bass";
    if (value === "drum" || value === "drums" || value === "bateria" || value === "batería") return "drums";
    return VALID_EDITOR_INSTRUMENTS.has(value) ? value : "piano";
  }

  function readDisplay(element) {
    return element ? element.style.display : "";
  }

  function captureSnapshot() {
    if (state.snapshot) return state.snapshot;
    const { piano, fretboard } = elements();
    state.snapshot = {
      pianoDisplay: readDisplay(piano),
      fretboardDisplay: readDisplay(fretboard),
      mainInstrument: resolve(state.options.getMainInstrument) || null
    };
    return state.snapshot;
  }

  function setDisplay(element, value) {
    if (element && element.style.display !== value) element.style.display = value;
  }

  function debugSwitch(label, extra = {}) {
    try {
      const enabled = window.S936_SURFACE_DEBUG !== false;
      if (!enabled) return;
      console.log("[S936 Surface]", label, {
        editorInstrument: state.editorInstrument,
        active: state.active,
        enforcing: state.enforcing,
        enforceQueued: state.enforceQueued,
        hasObserver: !!state.observer,
        ...extra
      });
    } catch (_) {}
  }

  function removeEditorStringSurfaceNodes() {
    document.querySelectorAll("#s936EditorGuitarSurface").forEach(node => node.remove());
    document.querySelectorAll(".s936-finger-pop").forEach(node => node.remove());
  }

  function removeEditorDrumSurfaceNodes() {
    document.querySelectorAll("#s936EditorDrumSurface").forEach(node => node.remove());
  }

  function setAttributeIfChanged(element, name, value) {
    if (!element) return;
    if (element.getAttribute(name) !== String(value)) {
      element.setAttribute(name, String(value));
    }
  }

  function removeAttributeIfPresent(element, name) {
    if (element?.hasAttribute?.(name)) element.removeAttribute(name);
  }

  function toggleClassIfNeeded(element, className, enabled) {
    if (!element) return;
    const has = element.classList.contains(className);
    if (enabled && !has) element.classList.add(className);
    if (!enabled && has) element.classList.remove(className);
  }

  function removeEditorMarkers() {
    const { fretboard } = elements();
    toggleClassIfNeeded(fretboard, "s936-editor-surface-active", false);
    removeAttributeIfPresent(fretboard, "data-s936-editor-surface");
    toggleClassIfNeeded(document.body, "s936-editor-guitar-surface", false);
    toggleClassIfNeeded(document.body, "s936-editor-drum-surface", false);
    removeAttributeIfPresent(document.body, "data-s936-editor-instrument");
    removeAttributeIfPresent(document.body, "data-s936-surface-owner");
  }

  function applyEditorMarkers(instrument) {
    const { fretboard } = elements();
    setAttributeIfChanged(document.body, "data-s936-editor-instrument", instrument);
    setAttributeIfChanged(document.body, "data-s936-surface-owner", "editor");
    const isStringInstrument = ["guitar","ukulele","bass","lead"].includes(instrument);
    const isDrumInstrument = instrument === "drums";
    const hasEditorSurface = isStringInstrument || isDrumInstrument;
    toggleClassIfNeeded(fretboard, "s936-editor-surface-active", hasEditorSurface);
    toggleClassIfNeeded(document.body, "s936-editor-guitar-surface", isStringInstrument);
    toggleClassIfNeeded(document.body, "s936-editor-drum-surface", isDrumInstrument);
    if (hasEditorSurface) {
      setAttributeIfChanged(fretboard, "data-s936-editor-surface", instrument);
    } else {
      removeAttributeIfPresent(fretboard, "data-s936-editor-surface");
    }
  }

  function enforce() {
    if (!state.active || state.enforcing) return;
    state.enforcing = true;
    const startedAt = performance?.now?.() || Date.now();
    try {
      const { piano, fretboard } = elements();
      const instrument = state.editorInstrument;
      debugSwitch("enforce:start", { instrument });
      applyEditorMarkers(instrument);
      debugSwitch("enforce:markers-applied", { instrument });

      if (instrument === "piano") {
        debugSwitch("enforce:piano:before-string-clear");
        stringSurface()?.clear?.();
        debugSwitch("enforce:piano:after-string-clear");

        debugSwitch("enforce:piano:before-drum-clear");
        drumSurface()?.clear?.();
        debugSwitch("enforce:piano:after-drum-clear");

        debugSwitch("enforce:piano:before-remove-nodes");
        removeEditorStringSurfaceNodes();
        removeEditorDrumSurfaceNodes();
        debugSwitch("enforce:piano:after-remove-nodes");

        debugSwitch("enforce:piano:before-display");
        setDisplay(fretboard, "none");
        setDisplay(piano, "flex");
        debugSwitch("enforce:piano:after-display");
      } else if (instrument === "drums") {
        debugSwitch("enforce:drums:before-string-clear");
        stringSurface()?.clear?.();
        debugSwitch("enforce:drums:after-string-clear");

        removeEditorStringSurfaceNodes();
        setDisplay(piano, "none");
        setDisplay(fretboard, "flex");
        const exact = document.getElementById("s936EditorDrumSurface");
        if (!exact && state.lastDrumRender) {
          debugSwitch("enforce:drums:before-render");
          const renderer = state.lastDrumRender.renderer || drumSurface();
          renderer?.render?.(state.lastDrumRender.options);
          debugSwitch("enforce:drums:after-render");
        }
      } else {
        debugSwitch("enforce:strings:before-drum-clear", { instrument });
        drumSurface()?.clear?.();
        debugSwitch("enforce:strings:after-drum-clear", { instrument });

        removeEditorDrumSurfaceNodes();
        setDisplay(piano, "none");
        setDisplay(fretboard, "flex");
        const exact = document.getElementById("s936EditorGuitarSurface");
        if (!exact && state.lastStringRender) {
          debugSwitch("enforce:strings:before-render", { instrument });
          const renderer = state.lastStringRender.renderer || stringSurface();
          renderer?.render?.(state.lastStringRender.options);
          debugSwitch("enforce:strings:after-render", { instrument });
        }
      }
    } finally {
      state.enforcing = false;
      debugSwitch("enforce:done", { ms: Math.round(((performance?.now?.() || Date.now()) - startedAt) * 10) / 10 });
    }
  }

  function scheduleEnforce() {
    if (!state.active || state.enforcing || state.enforceQueued) return;
    state.enforceQueued = true;
    queueMicrotask(() => {
      state.enforceQueued = false;
      enforce();
    });
  }

  function startObserver() {
    stopObserver();
    const { piano, fretboard } = elements();
    if (typeof MutationObserver !== "function") return;
    state.observer = new MutationObserver(scheduleEnforce);
    [piano, fretboard].filter(Boolean).forEach(element => {
      state.observer.observe(element, {
        attributes: true,
        attributeFilter: ["style", "class", "data-s936-editor-surface"],
        childList: true
      });
    });
    // Do not observe <body> markers: the manager writes those markers itself.
    // Observing them created a self-triggering MutationObserver loop in v0.7.0.
  }

  function stopObserver() {
    state.observer?.disconnect?.();
    state.observer = null;
    state.enforceQueued = false;
  }

  function configure(options = {}) {
    state.options = { ...state.options, ...options };
    state.configured = true;
    return api;
  }

  function beginEditorSession(instrument = state.editorInstrument) {
    captureSnapshot();
    clearEditorStrings();
    clearEditorDrums();
    removeEditorMarkers();
    state.active = true;
    state.editorInstrument = normalizeInstrument(instrument);
    state.lastStringRender = null;
    state.lastDrumRender = null;
    startObserver();
    enforce();
    return getState();
  }

  function showEditorInstrument(instrument) {
    const value = normalizeInstrument(instrument);

    // v0.7.4.7 — Diagnóstico de congelamiento Piano/Batería.
    // Mantiene el cambio de v0.7.4.6: observer apagado durante el switch.
    debugSwitch("show:start", { requested: instrument, value });
    stopObserver();
    debugSwitch("show:observer-stopped", { value });

    try {
      if (!state.active) {
        debugSwitch("show:begin-session-lite", { value });
        captureSnapshot();
        removeEditorMarkers();
        state.active = true;
      }

      const previous = state.editorInstrument;
      debugSwitch("show:previous", { previous, value });

      if (previous !== value) {
        debugSwitch("show:before-clear-previous", { previous, value });
        clearEditorStrings();
        debugSwitch("show:after-clear-strings", { previous, value });
        clearEditorDrums();
        debugSwitch("show:after-clear-drums", { previous, value });
      }

      if (value === "piano") {
        debugSwitch("show:piano:before-clear");
        clearEditorStrings();
        debugSwitch("show:piano:after-clear-strings");
        clearEditorDrums();
        debugSwitch("show:piano:after-clear-drums");
        state.lastStringRender = null;
        state.lastDrumRender = null;
      } else if (value === "drums") {
        debugSwitch("show:drums:before-clear-strings");
        clearEditorStrings();
        debugSwitch("show:drums:after-clear-strings");
      } else {
        debugSwitch("show:strings:before-clear-drums", { value });
        clearEditorDrums();
        debugSwitch("show:strings:after-clear-drums", { value });
      }

      state.editorInstrument = value;
      debugSwitch("show:before-enforce", { value });
      enforce();
      debugSwitch("show:after-enforce", { value });
      return { ok: true, instrument: value, owner: "editor" };
    } finally {
      debugSwitch("show:finally-before-observer", { value });
      if (state.active) startObserver();
      debugSwitch("show:done", { value });
    }
  }

  function renderEditorStrings({
    instrument,
    data,
    profiles,
    sectionNames = {},
    renderer = stringSurface()
  } = {}) {
    const value = normalizeInstrument(instrument || data?.instrument);
    if (!["guitar","ukulele","bass","lead"].includes(value)) {
      return { ok: false, message: "La superficie de cuerdas requiere Guitarra, Ukelele o Bajo." };
    }
    clearEditorDrums();
    showEditorInstrument(value);
    const { fretboard } = elements();
    if (!fretboard || !renderer?.render) {
      return { ok: false, message: "No está disponible la superficie instrumental." };
    }
    const options = {
      container: fretboard,
      owner: "editor",
      readOnly: false,
      data: { ...data, instrument: value, surfaceOwner: "editor" },
      profiles,
      sectionNames
    };
    state.lastStringRender = { renderer, options };
    let result = { ok: true };
    try {
      // v0.7.1.8.6: render de cuerdas sin observer activo.
      // Evita reentradas cuando Main ya tenía una SuperGuitarra montada.
      stopObserver();
      result = renderer.render(options) || { ok: true };
    } catch (error) {
      console.error("Instrument Surface Manager · String render falló:", error);
      result = { ok:false, message:error?.message || "No se pudo montar la superficie de cuerdas." };
    } finally {
      startObserver();
      enforce();
    }
    return result;
  }

  function renderEditorDrums({
    pattern = {},
    sectionName = "Sección",
    renderer = drumSurface(),
    onLaneSelect = null,
    onLaneTrigger = null
  } = {}) {
    clearEditorStrings();
    showEditorInstrument("drums");
    const { fretboard } = elements();
    if (!fretboard || !renderer?.render) {
      return { ok: false, message: "No está disponible la superficie visual de batería." };
    }
    const options = { container:fretboard, pattern, sectionName, onLaneSelect, onLaneTrigger };
    state.lastDrumRender = { renderer, options };
    let result = { ok:true };
    try {
      stopObserver();
      result = renderer.render(options) || { ok:true };
    } catch (error) {
      console.error("Instrument Surface Manager · Drum render falló:", error);
      result = { ok:false, message:error?.message || "No se pudo montar la superficie de batería." };
    } finally {
      startObserver();
      enforce();
    }
    return result;
  }

  function flashEditorDrumLane(laneId, velocity=.82, duration=160) {
    const renderer = state.lastDrumRender?.renderer || drumSurface();
    return !!renderer?.flashLane?.(laneId, velocity, duration);
  }

  function selectEditorDrumLane(laneId) {
    const renderer = state.lastDrumRender?.renderer || drumSurface();
    return !!renderer?.selectLane?.(laneId,false);
  }

  function clearEditorStrings() {
    state.lastStringRender = null;
    stringSurface()?.clear?.();
    removeEditorStringSurfaceNodes();
  }

  function clearEditorDrums() {
    state.lastDrumRender = null;
    drumSurface()?.clear?.();
    removeEditorDrumSurfaceNodes();
  }

  function restoreSnapshot() {
    const { piano, fretboard } = elements();
    const snapshot = state.snapshot;
    if (!snapshot) return;
    setDisplay(piano, snapshot.pianoDisplay);
    setDisplay(fretboard, snapshot.fretboardDisplay);

    fretboard?.classList.remove("s936-editor-surface-active");
    fretboard?.removeAttribute("data-s936-editor-surface");
    document.body?.classList.remove("s936-editor-guitar-surface");
    document.body?.classList.remove("s936-editor-drum-surface");
    document.body?.removeAttribute("data-s936-editor-instrument");
    document.body?.removeAttribute("data-s936-surface-owner");
  }

  function endEditorSession({ restore = true } = {}) {
    stopObserver();
    clearEditorStrings();
    clearEditorDrums();
    removeEditorMarkers();
    state.active = false;
    if (restore) restoreSnapshot();
    const result = getState();
    state.snapshot = null;
    state.lastStringRender = null;
    state.lastDrumRender = null;
    return { ...result, ok: true };
  }

  function getState() {
    const { piano, fretboard } = elements();
    return {
      version: "instrument-surface-manager-v0.7.4.7-piano-freeze-diagnostics",
      configured: state.configured,
      active: state.active,
      owner: state.active ? "editor" : "main",
      editorInstrument: state.editorInstrument,
      mainInstrument: resolve(state.options.getMainInstrument) || null,
      pianoDisplay: piano ? getComputedStyle(piano).display : "missing",
      fretboardDisplay: fretboard ? getComputedStyle(fretboard).display : "missing",
      exactSurfaceExists: !!document.getElementById("s936EditorGuitarSurface"),
      drumSurfaceExists: !!document.getElementById("s936EditorDrumSurface"),
      snapshot: state.snapshot ? { ...state.snapshot } : null
    };
  }

  const api = {
    version: "instrument-surface-manager-v0.7.4.7-piano-freeze-diagnostics",
    configure,
    beginEditorSession,
    showEditorInstrument,
    renderEditorStrings,
    renderEditorDrums,
    flashEditorDrumLane,
    selectEditorDrumLane,
    clearEditorStrings,
    clearEditorDrums,
    stopObserver,
    startObserver,
    endEditorSession,
    getState
  };

  window.Studio936DebugSurfaceManager = getState;
  return api;
})();
