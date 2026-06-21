// Studio 936 Composer - Instrument Surface Manager v0.7.1.4 · SuperGuitarra 936 Base
// Single owner for Main/Editor instrument surface visibility and lifecycle.
window.Studio936InstrumentSurfaceManager = (() => {
  "use strict";

  const VALID_EDITOR_INSTRUMENTS = new Set(["piano", "guitar", "ukulele", "bass", "drums"]);
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
    return VALID_EDITOR_INSTRUMENTS.has(instrument) ? instrument : "piano";
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
    const isStringInstrument = ["guitar","ukulele","bass"].includes(instrument);
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
    try {
      const { piano, fretboard } = elements();
      const instrument = state.editorInstrument;
      applyEditorMarkers(instrument);
      if (instrument === "piano") {
        stringSurface()?.clear?.();
        drumSurface()?.clear?.();
        setDisplay(fretboard, "none");
        setDisplay(piano, "flex");
      } else if (instrument === "drums") {
        stringSurface()?.clear?.();
        setDisplay(piano, "none");
        setDisplay(fretboard, "flex");
        const exact = document.getElementById("s936EditorDrumSurface");
        if (!exact && state.lastDrumRender) {
          const renderer = state.lastDrumRender.renderer || drumSurface();
          renderer?.render?.(state.lastDrumRender.options);
        }
      } else {
        drumSurface()?.clear?.();
        setDisplay(piano, "none");
        setDisplay(fretboard, "flex");
        const exact = document.getElementById("s936EditorGuitarSurface");
        if (!exact && state.lastStringRender) {
          const renderer = state.lastStringRender.renderer || stringSurface();
          renderer?.render?.(state.lastStringRender.options);
        }
      }
    } finally {
      state.enforcing = false;
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
    if (!state.active) beginEditorSession(value);
    const previous = state.editorInstrument;
    if (previous !== value) {
      clearEditorStrings();
      clearEditorDrums();
    }
    state.editorInstrument = value;
    if (value === "piano") {
      state.lastStringRender = null;
      state.lastDrumRender = null;
    }
    enforce();
    return { ok: true, instrument: value, owner: "editor" };
  }

  function renderEditorStrings({
    instrument,
    data,
    profiles,
    sectionNames = {},
    onCellPlay = null,
    renderer = stringSurface()
  } = {}) {
    const value = normalizeInstrument(instrument || data?.instrument);
    if (!["guitar","ukulele","bass"].includes(value)) {
      return { ok: false, message: "La superficie de cuerdas requiere Guitarra, Ukelele o Bajo." };
    }
    showEditorInstrument(value);
    const { fretboard } = elements();
    if (!fretboard || !renderer?.render) {
      return { ok: false, message: "No está disponible la superficie instrumental." };
    }
    const options = { container: fretboard, data: { ...data, instrument: value }, profiles, sectionNames, onCellPlay };
    state.lastStringRender = { renderer, options };
    const result = renderer.render(options) || { ok: true };
    enforce();
    return result;
  }

  function renderEditorDrums({
    pattern = {},
    sectionName = "Sección",
    renderer = drumSurface(),
    onLaneSelect = null,
    onLaneTrigger = null
  } = {}) {
    showEditorInstrument("drums");
    const { fretboard } = elements();
    if (!fretboard || !renderer?.render) {
      return { ok: false, message: "No está disponible la superficie visual de batería." };
    }
    const options = { container:fretboard, pattern, sectionName, onLaneSelect, onLaneTrigger };
    state.lastDrumRender = { renderer, options };
    const result = renderer.render(options) || { ok:true };
    enforce();
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
    document.querySelectorAll(".s936-finger-pop").forEach(node => node.remove());
  }

  function clearEditorDrums() {
    state.lastDrumRender = null;
    drumSurface()?.clear?.();
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
      version: "instrument-surface-manager-v0.7.1.4-super-guitar-base",
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
    version: "instrument-surface-manager-v0.7.1.4-super-guitar-base",
    configure,
    beginEditorSession,
    showEditorInstrument,
    renderEditorStrings,
    renderEditorDrums,
    flashEditorDrumLane,
    selectEditorDrumLane,
    clearEditorStrings,
    clearEditorDrums,
    endEditorSession,
    getState
  };

  window.Studio936DebugSurfaceManager = getState;
  return api;
})();
