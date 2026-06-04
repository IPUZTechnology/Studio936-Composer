// Studio 936 Composer - Suite Pro Recorder Module v1.1 Library Link
// Scope: Studio > REC Idea only. It does not touch app.js, Practice, Drums, Mixer, CSS, MIDI, editor or transport internals.
// Loaded before js/suite-pro.js and rendered through Studio936SuiteProModules.recorder.
(function () {
  "use strict";

  const STYLE_ID = "s936SuiteProRecorderStyles";
  const META_KEY = "s936_suitepro_recorder_ideas_v1";
  const SUITE_LIBRARY_KEY = "studio936_suitepro_library_v3";
  const DRAFT_KEY = "s936_suitepro_recorder_draft_v1";
  const DB_NAME = "s936_suitepro_recorder_db_v1";
  const DB_STORE = "takes";

  const DEFAULT_DRAFT = {
    title: "",
    type: "idea",
    section: "",
    tags: "",
    html: ""
  };

  let stream = null;
  let mediaRecorder = null;
  let chunks = [];
  let currentBlob = null;
  let currentBlobUrl = "";
  let currentMime = "";
  let recordStart = 0;
  let recordTimer = null;
  let recordSeconds = 0;

  function register() {
    window.Studio936SuiteProModules = window.Studio936SuiteProModules || {};
    window.Studio936SuiteProRecorder = {
      version: "recorder-v1.1-library",
      render,
      getAudioById: getAudio,
      downloadAudioById
    };
    window.Studio936SuiteProModules.recorder = window.Studio936SuiteProRecorder;
  }

  function safe(fn, fallback = null) {
    try { return fn(); } catch (error) { console.warn("Suite Pro Recorder:", error); return fallback; }
  }

  function loadDraft() {
    return Object.assign({}, DEFAULT_DRAFT, safe(() => JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}"), {}));
  }

  function saveDraft(draft) {
    safe(() => localStorage.setItem(DRAFT_KEY, JSON.stringify(Object.assign({}, DEFAULT_DRAFT, draft || {}))));
  }

  function loadIdeas() {
    return safe(() => JSON.parse(localStorage.getItem(META_KEY) || "[]"), []);
  }

  function saveIdeas(items) {
    safe(() => localStorage.setItem(META_KEY, JSON.stringify((items || []).slice(0, 80))));
  }

  function loadSuiteLibrary() {
    return safe(() => JSON.parse(localStorage.getItem(SUITE_LIBRARY_KEY) || "[]"), []);
  }

  function saveSuiteLibrary(items) {
    safe(() => localStorage.setItem(SUITE_LIBRARY_KEY, JSON.stringify((items || []).slice(0, 160))));
  }

  function ideaInSuiteLibrary(ideaId) {
    return loadSuiteLibrary().some((item) => item && item.kind === "recIdea" && item.recIdeaId === ideaId);
  }

  function ideaLibraryPayload(idea) {
    return {
      id: "lib-rec-" + (idea.id || Date.now()),
      kind: "recIdea",
      recIdeaId: idea.id,
      title: "REC · " + (idea.title || typeLabel(idea.type) || "Idea"),
      author: idea.songAuthor || "",
      bpm: idea.bpm || "",
      style: idea.style || "",
      createdAt: idea.createdAt || new Date().toISOString(),
      fullText: ideaToText(idea),
      projectJson: "",
      recIdea: {
        id: idea.id,
        title: idea.title || "",
        type: idea.type || "idea",
        sectionKey: idea.sectionKey || "",
        sectionLabel: idea.sectionLabel || "",
        tags: idea.tags || "",
        html: idea.html || "",
        text: idea.text || "",
        songTitle: idea.songTitle || "",
        songAuthor: idea.songAuthor || "",
        bpm: idea.bpm || "",
        style: idea.style || "",
        audioId: idea.audioId || "",
        audioMime: idea.audioMime || "",
        createdAt: idea.createdAt || new Date().toISOString()
      }
    };
  }

  function sendIdeaToSuiteLibrary(ctx, idea) {
    if (!idea || !idea.id) return toast("Idea no válida.");
    const items = loadSuiteLibrary().filter((item) => !(item.kind === "recIdea" && item.recIdeaId === idea.id));
    items.unshift(ideaLibraryPayload(idea));
    saveSuiteLibrary(items);
    toast("Idea enviada a Library.");
    render(ctx, ctx.clearContent());
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#s936SuitePro .s936-rec-shell {
  display:grid;
  gap:12px;
}
#s936SuitePro .s936-rec-grid {
  display:grid;
  grid-template-columns:minmax(420px, 1.25fr) minmax(320px, .75fr);
  gap:12px;
  align-items:start;
}
#s936SuitePro .s936-rec-card {
  border:1px solid rgba(255,255,255,.13);
  border-radius:18px;
  background:linear-gradient(135deg, rgba(0,255,204,.08), rgba(255,255,255,.035));
  padding:14px;
}
#s936SuitePro .s936-rec-card h4 {
  margin:0 0 10px;
  color:#8affff;
  text-transform:uppercase;
  letter-spacing:.7px;
  font-size:.78rem;
}
#s936SuitePro .s936-rec-form {
  display:grid;
  grid-template-columns:1.15fr .75fr .75fr;
  gap:8px;
  margin-bottom:10px;
}
#s936SuitePro .s936-rec-field {
  display:grid;
  gap:4px;
}
#s936SuitePro .s936-rec-field.wide {
  grid-column:1 / -1;
}
#s936SuitePro .s936-rec-label {
  color:#ffe066;
  text-transform:uppercase;
  letter-spacing:.7px;
  font-size:.58rem;
  font-weight:950;
}
#s936SuitePro .s936-rec-input,
#s936SuitePro .s936-rec-select {
  width:100%;
  border:1px solid rgba(255,255,255,.16);
  border-radius:11px;
  background:rgba(0,0,0,.32);
  color:#fff;
  padding:9px 10px;
  font:inherit;
  font-weight:800;
}
#s936SuitePro .s936-rec-toolbar {
  display:flex;
  gap:6px;
  flex-wrap:wrap;
  padding:8px;
  border:1px solid rgba(255,255,255,.10);
  border-radius:13px 13px 0 0;
  background:rgba(0,0,0,.22);
}
#s936SuitePro .s936-rec-tool {
  border:1px solid rgba(255,255,255,.14);
  border-radius:999px;
  background:rgba(255,255,255,.055);
  color:#fff;
  min-width:34px;
  padding:6px 9px;
  cursor:pointer;
  font-size:.64rem;
  font-weight:950;
}
#s936SuitePro .s936-rec-tool:hover {
  color:#00ffcc;
  border-color:rgba(0,255,204,.50);
  background:rgba(0,255,204,.10);
}
#s936SuitePro .s936-rec-editor {
  min-height:160px;
  max-height:280px;
  overflow:auto;
  padding:14px;
  border:1px solid rgba(255,255,255,.12);
  border-top:0;
  border-radius:0 0 13px 13px;
  background:rgba(0,0,0,.22);
  color:#f8fbff;
  line-height:1.55;
  outline:none;
}
#s936SuitePro .s936-rec-editor:empty::before {
  content:attr(data-placeholder);
  color:rgba(255,255,255,.45);
}
#s936SuitePro .s936-rec-editor b,
#s936SuitePro .s936-rec-editor strong { color:#fff4b8; }
#s936SuitePro .s936-rec-editor i,
#s936SuitePro .s936-rec-editor em { color:#bfffee; }
#s936SuitePro .s936-rec-editor ul,
#s936SuitePro .s936-rec-editor ol { padding-left:22px; }
#s936SuitePro .s936-rec-actions {
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  margin-top:10px;
}
#s936SuitePro .s936-rec-btn {
  border:1px solid rgba(0,255,204,.45);
  border-radius:999px;
  background:rgba(0,255,204,.08);
  color:#bfffee;
  padding:8px 12px;
  font-size:.68rem;
  font-weight:950;
  cursor:pointer;
}
#s936SuitePro .s936-rec-btn.warn {
  border-color:rgba(255,216,77,.75);
  color:#ffe066;
  background:rgba(255,216,77,.10);
}
#s936SuitePro .s936-rec-btn.danger {
  border-color:rgba(255,90,90,.70);
  color:#ffb5b5;
  background:rgba(255,90,90,.10);
}
#s936SuitePro .s936-rec-btn.secondary {
  border-color:rgba(255,255,255,.18);
  color:#fff;
  background:rgba(255,255,255,.06);
}
#s936SuitePro .s936-rec-recorder {
  display:grid;
  gap:10px;
}
#s936SuitePro .s936-rec-meter {
  height:12px;
  border-radius:999px;
  background:rgba(255,255,255,.10);
  overflow:hidden;
  border:1px solid rgba(255,255,255,.10);
}
#s936SuitePro .s936-rec-meter span {
  display:block;
  height:100%;
  width:var(--level, 0%);
  background:linear-gradient(90deg, #00ffcc, #ffe066);
  transition:width .1s linear;
}
#s936SuitePro .s936-rec-status {
  display:flex;
  align-items:center;
  gap:8px;
  color:rgba(255,255,255,.78);
  font-size:.74rem;
  line-height:1.4;
}
#s936SuitePro .s936-rec-led {
  width:11px;
  height:11px;
  border-radius:999px;
  background:rgba(255,255,255,.20);
}
#s936SuitePro .s936-rec-status.live .s936-rec-led {
  background:#ff5b5b;
  box-shadow:0 0 16px rgba(255,91,91,.75);
}
#s936SuitePro .s936-rec-timer {
  font-size:2rem;
  line-height:1;
  font-weight:950;
  color:#fff;
}
#s936SuitePro .s936-rec-audio {
  width:100%;
  margin-top:2px;
}
#s936SuitePro .s936-rec-list {
  display:grid;
  grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));
  gap:10px;
}
#s936SuitePro .s936-rec-idea {
  border:1px solid rgba(255,255,255,.12);
  border-radius:16px;
  background:rgba(255,255,255,.045);
  padding:12px;
}
#s936SuitePro .s936-rec-idea h5 {
  margin:0 0 6px;
  color:#fff;
  font-size:.95rem;
}
#s936SuitePro .s936-rec-meta {
  display:flex;
  flex-wrap:wrap;
  gap:6px;
  color:rgba(255,255,255,.66);
  font-size:.62rem;
  margin-bottom:8px;
}
#s936SuitePro .s936-rec-pill {
  border:1px solid rgba(0,255,204,.25);
  border-radius:999px;
  background:rgba(0,255,204,.07);
  color:#bfffee;
  padding:4px 7px;
  font-weight:850;
}
#s936SuitePro .s936-rec-preview {
  max-height:130px;
  overflow:auto;
  border-radius:12px;
  background:rgba(0,0,0,.18);
  border:1px solid rgba(255,255,255,.08);
  padding:10px;
  color:rgba(255,255,255,.86);
  line-height:1.45;
  font-size:.82rem;
}
#s936SuitePro .s936-rec-empty {
  color:rgba(255,255,255,.65);
  line-height:1.5;
}
#s936SuitePro .s936-rec-hint {
  color:rgba(255,255,255,.66);
  font-size:.70rem;
  line-height:1.45;
}
@media(max-width: 1040px) {
  #s936SuitePro .s936-rec-grid { grid-template-columns:1fr; }
  #s936SuitePro .s936-rec-form { grid-template-columns:1fr; }
}
`;
    document.head.appendChild(style);
  }

  function render(ctx, container) {
    installStyles();
    const c = container || ctx.clearContent?.();
    if (!c) return;

    ctx.title(c, "REC Idea Pro", "Captura texto, letra, riff, arreglo y toma rápida de micrófono/guitarra sin tocar app.js.");
    const shell = ctx.el("div", "s936-rec-shell");

    const grid = ctx.el("div", "s936-rec-grid");
    renderComposerPad(ctx, grid);
    renderAudioCapture(ctx, grid);
    shell.appendChild(grid);

    renderIdeaLibrary(ctx, shell);
    c.appendChild(shell);
  }

  function renderComposerPad(ctx, parent) {
    const draft = loadDraft();
    const s = ctx.snapshot?.() || {};
    const card = ctx.el("article", "s936-rec-card");
    card.appendChild(ctx.el("h4", "", "Nueva idea"));

    const form = ctx.el("div", "s936-rec-form");

    const titleField = field(ctx, "Título");
    const title = ctx.el("input", "s936-rec-input");
    title.placeholder = "Ej: Coro alterno, riff intro, puente emocional...";
    title.value = draft.title || "";
    title.oninput = () => updateDraftFromUI();
    titleField.appendChild(title);

    const typeField = field(ctx, "Tipo");
    const type = ctx.el("select", "s936-rec-select");
    [
      ["idea", "Idea general"],
      ["letra", "Letra"],
      ["riff", "Riff"],
      ["groove", "Groove"],
      ["arreglo", "Arreglo"],
      ["produccion", "Producción"],
      ["mezcla", "Mezcla"]
    ].forEach(([value, label]) => {
      const opt = ctx.el("option", "", label);
      opt.value = value;
      if ((draft.type || "idea") === value) opt.selected = true;
      type.appendChild(opt);
    });
    type.onchange = () => updateDraftFromUI();
    typeField.appendChild(type);

    const sectionField = field(ctx, "Sección");
    const section = ctx.el("select", "s936-rec-select");
    section.appendChild(option(ctx, "", "Sección actual"));
    sectionOptions(s).forEach((item) => {
      const opt = option(ctx, item.value, item.label);
      if ((draft.section || "") === item.value) opt.selected = true;
      section.appendChild(opt);
    });
    section.onchange = () => updateDraftFromUI();
    sectionField.appendChild(section);

    const tagsField = field(ctx, "Tags", "wide");
    const tags = ctx.el("input", "s936-rec-input");
    tags.placeholder = "voz, guitarra, bridge, energía, pendiente...";
    tags.value = draft.tags || "";
    tags.oninput = () => updateDraftFromUI();
    tagsField.appendChild(tags);

    form.append(titleField, typeField, sectionField, tagsField);
    card.appendChild(form);

    const toolbar = ctx.el("div", "s936-rec-toolbar");
    [
      ["bold", "B"],
      ["italic", "I"],
      ["insertUnorderedList", "• Lista"],
      ["formatBlock:p", "P"],
      ["formatBlock:h3", "Título"],
      ["removeFormat", "Limpiar formato"]
    ].forEach(([cmd, label]) => {
      const btn = ctx.el("button", "s936-rec-tool", label);
      btn.type = "button";
      btn.onclick = () => applyEditorCommand(cmd);
      toolbar.appendChild(btn);
    });
    card.appendChild(toolbar);

    const editor = ctx.el("div", "s936-rec-editor");
    editor.contentEditable = "true";
    editor.dataset.placeholder = "Escribe aquí la idea con formato: letra, riff, intención, arreglo, producción...";
    editor.innerHTML = sanitizeHtml(draft.html || "");
    editor.oninput = () => updateDraftFromUI();
    card.appendChild(editor);

    const actions = ctx.el("div", "s936-rec-actions");
    addButton(ctx, actions, "Guardar idea", () => saveTextIdea(ctx), "s936-rec-btn warn");
    addButton(ctx, actions, "Guardar idea + toma", () => saveTextIdea(ctx, true), "s936-rec-btn");
    addButton(ctx, actions, "Limpiar editor", () => {
      saveDraft(DEFAULT_DRAFT);
      render(ctx, ctx.clearContent());
    }, "s936-rec-btn secondary");
    addButton(ctx, actions, "Exportar ideas TXT", () => exportIdeasTxt(ctx), "s936-rec-btn secondary");
    card.appendChild(actions);

    parent.appendChild(card);

    function updateDraftFromUI() {
      saveDraft({
        title: title.value,
        type: type.value,
        section: section.value,
        tags: tags.value,
        html: sanitizeHtml(editor.innerHTML || "")
      });
    }
  }

  function renderAudioCapture(ctx, parent) {
    const card = ctx.el("article", "s936-rec-card");
    card.appendChild(ctx.el("h4", "", "Micrófono / guitarra"));

    const box = ctx.el("div", "s936-rec-recorder");
    const live = !!mediaRecorder && mediaRecorder.state === "recording";
    const status = ctx.el("div", "s936-rec-status" + (live ? " live" : ""));
    status.appendChild(ctx.el("span", "s936-rec-led"));
    status.appendChild(ctx.el("span", "", live ? "Grabando toma rápida..." : (currentBlob ? "Toma lista para guardar." : "Micrófono listo bajo permiso del navegador.")));
    box.appendChild(status);

    box.appendChild(ctx.el("div", "s936-rec-timer", formatTime(recordSeconds)));
    const meter = ctx.el("div", "s936-rec-meter");
    meter.appendChild(ctx.el("span", ""));
    box.appendChild(meter);

    if (currentBlobUrl) {
      const audio = ctx.el("audio", "s936-rec-audio");
      audio.controls = true;
      audio.src = currentBlobUrl;
      box.appendChild(audio);
    }

    const actions = ctx.el("div", "s936-rec-actions");
    addButton(ctx, actions, stream ? "Mic activo" : "Habilitar mic", () => requestMic(ctx), "s936-rec-btn secondary");
    addButton(ctx, actions, live ? "Grabando..." : "REC", () => startAudioRecording(ctx), "s936-rec-btn warn");
    addButton(ctx, actions, "Stop REC", () => stopAudioRecording(ctx), "s936-rec-btn danger");
    addButton(ctx, actions, "Guardar toma", () => saveAudioOnly(ctx), "s936-rec-btn");
    addButton(ctx, actions, "Descartar toma", () => clearCurrentTake(ctx), "s936-rec-btn secondary");
    box.appendChild(actions);

    box.appendChild(ctx.el("p", "s936-rec-hint", "Usa entrada de micrófono, interfaz USB o guitarra conectada al sistema. El audio queda guardado localmente en este navegador."));

    card.appendChild(box);
    parent.appendChild(card);
    animateMeter(meter);
  }

  function renderIdeaLibrary(ctx, shell) {
    const ideas = loadIdeas();
    const card = ctx.el("section", "s936-rec-card");
    card.appendChild(ctx.el("h4", "", "Banco de ideas"));

    if (!ideas.length) {
      card.appendChild(ctx.el("p", "s936-rec-empty", "Todavía no hay ideas guardadas. Escribe una idea o graba una toma rápida para crear tu bitácora creativa."));
      shell.appendChild(card);
      return;
    }

    const list = ctx.el("div", "s936-rec-list");
    ideas.slice(0, 24).forEach((idea) => {
      const item = ctx.el("article", "s936-rec-idea");
      item.appendChild(ctx.el("h5", "", idea.title || typeLabel(idea.type) || "Idea"));

      const meta = ctx.el("div", "s936-rec-meta");
      meta.appendChild(ctx.el("span", "s936-rec-pill", typeLabel(idea.type)));
      if (idea.sectionLabel) meta.appendChild(ctx.el("span", "s936-rec-pill", idea.sectionLabel));
      meta.appendChild(ctx.el("span", "s936-rec-pill", new Date(idea.createdAt).toLocaleString()));
      if (idea.audioId) meta.appendChild(ctx.el("span", "s936-rec-pill", "Audio"));
      item.appendChild(meta);

      const preview = ctx.el("div", "s936-rec-preview");
      preview.innerHTML = sanitizeHtml(idea.html || escapeHtml(idea.text || ""));
      item.appendChild(preview);

      if (idea.tags) item.appendChild(ctx.el("p", "s936-rec-hint", "Tags: " + idea.tags));

      if (idea.audioId) {
        const audio = ctx.el("audio", "s936-rec-audio");
        audio.controls = true;
        loadAudioUrl(idea.audioId).then((url) => {
          if (url) audio.src = url;
        });
        item.appendChild(audio);
      }

      const actions = ctx.el("div", "s936-rec-actions");
      addButton(ctx, actions, "Copiar texto", () => copyIdeaText(ctx, idea), "s936-rec-btn secondary");
      addButton(ctx, actions, "TXT", () => downloadIdeaTxt(ctx, idea), "s936-rec-btn secondary");
      if (idea.audioId) addButton(ctx, actions, "Bajar audio", () => downloadAudio(idea), "s936-rec-btn");
      addButton(ctx, actions, ideaInSuiteLibrary(idea.id) ? "En Library" : "Enviar a Library", () => sendIdeaToSuiteLibrary(ctx, idea), ideaInSuiteLibrary(idea.id) ? "s936-rec-btn secondary" : "s936-rec-btn warn");
      addButton(ctx, actions, "Pack", () => downloadIdeaPack(ctx, idea), "s936-rec-btn secondary");
      addButton(ctx, actions, "Borrar", () => deleteIdea(ctx, idea.id), "s936-rec-btn danger");
      item.appendChild(actions);

      list.appendChild(item);
    });

    card.appendChild(list);
    shell.appendChild(card);
  }

  function field(ctx, label, extra = "") {
    const wrap = ctx.el("label", "s936-rec-field " + extra);
    wrap.appendChild(ctx.el("span", "s936-rec-label", label));
    return wrap;
  }

  function option(ctx, value, label) {
    const opt = ctx.el("option", "", label);
    opt.value = value;
    return opt;
  }

  function sectionOptions(snapshot) {
    const arrangement = Array.isArray(snapshot?.arrangement) ? snapshot.arrangement : [];
    if (arrangement.length) {
      return arrangement.map((part) => ({
        value: part.section || part.key || "",
        label: part.label || part.name || part.section || "Sección"
      })).filter((item) => item.value);
    }
    const sections = snapshot?.sections || {};
    return Object.keys(sections).map((key) => ({ value: key, label: key }));
  }

  function selectedSectionLabel(ctx, sectionKey) {
    const s = ctx.snapshot?.() || {};
    const found = sectionOptions(s).find((item) => item.value === sectionKey);
    return found?.label || s.currentSectionName || s.currentSection || "Actual";
  }

  function addButton(ctx, parent, label, fn, className = "s936-rec-btn") {
    const btn = ctx.el("button", className, label);
    btn.type = "button";
    btn.onclick = fn;
    parent.appendChild(btn);
    return btn;
  }

  function applyEditorCommand(command) {
    const parts = String(command).split(":");
    const cmd = parts[0];
    const value = parts[1] || null;
    document.execCommand(cmd, false, value);
    const editor = document.querySelector("#s936SuitePro .s936-rec-editor");
    if (editor) {
      editor.focus();
      saveDraft(Object.assign(loadDraft(), { html: sanitizeHtml(editor.innerHTML || "") }));
    }
  }

  function saveTextIdea(ctx, attachAudio = false) {
    const draft = loadDraft();
    const html = sanitizeHtml(draft.html || "");
    const text = htmlToPlainText(html);
    if (!text && !(attachAudio && currentBlob)) return ctx.callBridge?.("flashStatus", () => false) || toast("Escribe una idea o graba una toma.");
    const idea = baseIdea(ctx, draft, html, text);

    if (attachAudio && currentBlob) {
      const audioId = "audio-" + Date.now();
      storeAudio(audioId, currentBlob).then(() => {
        idea.audioId = audioId;
        idea.audioMime = currentMime || currentBlob.type || "audio/webm";
        commitIdea(idea);
        clearCurrentTake(ctx, false);
        saveDraft(DEFAULT_DRAFT);
        toast("Idea + toma guardadas.");
        render(ctx, ctx.clearContent());
      });
      return;
    }

    commitIdea(idea);
    saveDraft(DEFAULT_DRAFT);
    toast("Idea guardada.");
    render(ctx, ctx.clearContent());
  }

  function saveAudioOnly(ctx) {
    if (!currentBlob) return toast("No hay toma de audio para guardar.");
    const draft = loadDraft();
    const audioId = "audio-" + Date.now();
    const html = sanitizeHtml(draft.html || "");
    const text = htmlToPlainText(html);
    const idea = baseIdea(ctx, draft, html, text || "Toma de audio");
    idea.type = draft.type || "riff";
    idea.title = draft.title || "Toma " + new Date().toLocaleTimeString();

    storeAudio(audioId, currentBlob).then(() => {
      idea.audioId = audioId;
      idea.audioMime = currentMime || currentBlob.type || "audio/webm";
      commitIdea(idea);
      clearCurrentTake(ctx, false);
      saveDraft(DEFAULT_DRAFT);
      toast("Toma guardada.");
      render(ctx, ctx.clearContent());
    });
  }

  function baseIdea(ctx, draft, html, text) {
    const s = ctx.snapshot?.() || {};
    const sectionKey = draft.section || s.currentSection || "";
    return {
      id: "idea-" + Date.now() + "-" + Math.floor(Math.random() * 9999),
      title: draft.title || defaultIdeaTitle(draft.type),
      type: draft.type || "idea",
      sectionKey,
      sectionLabel: selectedSectionLabel(ctx, sectionKey),
      tags: draft.tags || "",
      html,
      text,
      createdAt: new Date().toISOString(),
      songTitle: s.title || "",
      songAuthor: s.author || "",
      bpm: s.bpm || "",
      style: s.style || "",
      snapshot: {
        title: s.title || "",
        author: s.author || "",
        bpm: s.bpm || "",
        style: s.style || "",
        currentSection: s.currentSection || "",
        currentSectionName: s.currentSectionName || ""
      }
    };
  }

  function commitIdea(idea) {
    const ideas = loadIdeas();
    ideas.unshift(idea);
    saveIdeas(ideas);
  }

  function deleteIdea(ctx, id) {
    const ideas = loadIdeas();
    const item = ideas.find((idea) => idea.id === id);
    if (!window.confirm("¿Borrar esta idea?")) return;
    saveIdeas(ideas.filter((idea) => idea.id !== id));
    if (item?.audioId) deleteAudio(item.audioId);
    toast("Idea borrada.");
    render(ctx, ctx.clearContent());
  }

  function defaultIdeaTitle(type) {
    const label = typeLabel(type || "idea");
    return label + " " + new Date().toLocaleTimeString();
  }

  function typeLabel(type) {
    return ({
      idea: "Idea",
      letra: "Letra",
      riff: "Riff",
      groove: "Groove",
      arreglo: "Arreglo",
      produccion: "Producción",
      mezcla: "Mezcla"
    })[type] || "Idea";
  }

  function toast(message) {
    const api = window.Studio936AppBridge;
    if (api && typeof api.flashStatus === "function") safe(() => api.flashStatus(message));
    else console.info("Suite Pro Recorder:", message);
  }

  function sanitizeHtml(html) {
    const doc = document.implementation.createHTMLDocument("");
    doc.body.innerHTML = String(html || "");
    doc.body.querySelectorAll("script, style, iframe, object, embed").forEach((node) => node.remove());
    doc.body.querySelectorAll("*").forEach((node) => {
      Array.from(node.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        const value = String(attr.value || "");
        if (name.startsWith("on") || /javascript:/i.test(value)) node.removeAttribute(attr.name);
      });
    });
    return doc.body.innerHTML;
  }

  function escapeHtml(text) {
    return String(text || "").replace(/[&<>"']/g, (ch) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[ch]));
  }

  function htmlToPlainText(html) {
    const div = document.createElement("div");
    div.innerHTML = sanitizeHtml(html || "");
    return (div.innerText || div.textContent || "").trim();
  }

  async function copyIdeaText(ctx, idea) {
    const text = ideaToText(idea);
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      toast("Idea copiada.");
    } else {
      ctx.downloadText?.("studio936-idea.txt", text);
    }
  }

  function downloadIdeaTxt(ctx, idea) {
    ctx.downloadText?.(slug(idea.title || "idea") + ".txt", ideaToText(idea));
  }

  function downloadIdeaPack(ctx, idea) {
    downloadIdeaTxt(ctx, idea);
    if (idea.audioId) {
      setTimeout(() => downloadAudio(idea), 250);
      toast("Pack descargando: TXT + audio.");
    } else {
      toast("Pack descargado: TXT. Esta idea no tiene audio.");
    }
  }

  async function downloadAudioById(audioId, title = "take") {
    if (!audioId) return toast("Audio no encontrado.");
    const idea = { audioId, title };
    return downloadAudio(idea);
  }

  function exportIdeasTxt(ctx) {
    const ideas = loadIdeas();
    if (!ideas.length) return toast("No hay ideas para exportar.");
    const text = ideas.map(ideaToText).join("\n\n---\n\n");
    ctx.downloadText?.("studio936-rec-ideas.txt", text);
  }

  function ideaToText(idea) {
    return [
      "Studio 936 · REC Idea",
      "Título: " + (idea.title || ""),
      "Tipo: " + typeLabel(idea.type),
      "Sección: " + (idea.sectionLabel || ""),
      "Tags: " + (idea.tags || ""),
      "Fecha: " + new Date(idea.createdAt).toLocaleString(),
      "Canción: " + (idea.songTitle || ""),
      "",
      idea.text || htmlToPlainText(idea.html || ""),
      idea.audioId ? "\nAudio: " + idea.audioId : ""
    ].join("\n");
  }

  function slug(text) {
    return String(text || "studio936")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "studio936";
  }

  async function requestMic(ctx) {
    if (!navigator.mediaDevices?.getUserMedia) return toast("Este navegador no permite grabación de micrófono.");
    if (stream) return toast("Micrófono ya está activo.");
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      toast("Micrófono habilitado.");
      render(ctx, ctx.clearContent());
    } catch (error) {
      toast("No se pudo habilitar el micrófono.");
    }
  }

  async function startAudioRecording(ctx) {
    if (!stream) await requestMic(ctx);
    if (!stream) return;
    if (!window.MediaRecorder) return toast("MediaRecorder no disponible en este navegador.");
    if (mediaRecorder && mediaRecorder.state === "recording") return;

    chunks = [];
    currentBlob = null;
    clearCurrentBlobUrl();

    const options = preferredMime();
    mediaRecorder = options ? new MediaRecorder(stream, options) : new MediaRecorder(stream);
    currentMime = mediaRecorder.mimeType || options?.mimeType || "audio/webm";

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size) chunks.push(event.data);
    };
    mediaRecorder.onstop = () => {
      currentBlob = new Blob(chunks, { type: currentMime || "audio/webm" });
      currentBlobUrl = URL.createObjectURL(currentBlob);
      stopTimer();
      toast("Toma capturada.");
      render(ctx, ctx.clearContent());
    };

    recordSeconds = 0;
    recordStart = Date.now();
    mediaRecorder.start();
    startTimer(ctx);
    toast("Grabando...");
    render(ctx, ctx.clearContent());
  }

  function stopAudioRecording(ctx) {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      toast("Deteniendo grabación...");
      return;
    }
    stopTimer();
    render(ctx, ctx.clearContent());
  }

  function clearCurrentTake(ctx, rerender = true) {
    currentBlob = null;
    chunks = [];
    recordSeconds = 0;
    clearCurrentBlobUrl();
    if (rerender) render(ctx, ctx.clearContent());
  }

  function clearCurrentBlobUrl() {
    if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = "";
  }

  function preferredMime() {
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus"
    ];
    const found = types.find((type) => window.MediaRecorder?.isTypeSupported?.(type));
    return found ? { mimeType: found } : undefined;
  }

  function startTimer(ctx) {
    stopTimer();
    recordTimer = setInterval(() => {
      recordSeconds = Math.max(0, Math.floor((Date.now() - recordStart) / 1000));
      const timer = document.querySelector("#s936SuitePro .s936-rec-timer");
      if (timer) timer.textContent = formatTime(recordSeconds);
      const meter = document.querySelector("#s936SuitePro .s936-rec-meter");
      animateMeter(meter);
    }, 250);
  }

  function stopTimer() {
    if (recordTimer) clearInterval(recordTimer);
    recordTimer = null;
  }

  function formatTime(seconds) {
    const s = Math.max(0, Number(seconds) || 0);
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return mm + ":" + ss;
  }

  function animateMeter(meter) {
    if (!meter) return;
    const bar = meter.querySelector("span");
    if (!bar) return;
    const live = mediaRecorder && mediaRecorder.state === "recording";
    const level = live ? (35 + Math.round(Math.random() * 55)) : (currentBlob ? 100 : 0);
    bar.style.setProperty("--level", level + "%");
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE, { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function storeAudio(id, blob) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).put({ id, blob, createdAt: new Date().toISOString() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getAudio(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readonly");
      const req = tx.objectStore(DB_STORE).get(id);
      req.onsuccess = () => resolve(req.result?.blob || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteAudio(id) {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  }

  async function loadAudioUrl(id) {
    const blob = await getAudio(id).catch(() => null);
    return blob ? URL.createObjectURL(blob) : "";
  }

  async function downloadAudio(idea) {
    const blob = await getAudio(idea.audioId).catch(() => null);
    if (!blob) return toast("Audio no encontrado.");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ext = mimeToExt(idea.audioMime || blob.type || "");
    a.href = url;
    a.download = slug(idea.title || "take") + "." + ext;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function mimeToExt(mime) {
    if (/mp4|m4a/i.test(mime)) return "m4a";
    if (/ogg/i.test(mime)) return "ogg";
    return "webm";
  }

  register();
})();
