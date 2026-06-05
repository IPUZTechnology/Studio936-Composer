// Studio 936 Composer - Suite Pro Structure / ADN Module v3.0
// Scope: Compose > Estructura only. No toca app.js, Practice, Drums, Mixer, Recorder ni MIDI.
// Product goal: constructor claro de forma musical, sin controles repetidos y con edición segura sobre el proyecto central.
(function () {
  "use strict";

  const STYLE_ID = "s936SuiteProStructureStylesV3";
  const STATE_KEY = "s936_suitepro_structure_v3";
  const APP_STORAGE_KEY = "studio936ComposerV25SongStructure";
  const BACKUP_KEY = "studio936_structure_backups_v3";

  const PART_OPTIONS = [
    ["intro", "Intro"],
    ["verse", "Verso"],
    ["verse1", "Verso 1"],
    ["verse2", "Verso 2"],
    ["verse3", "Verso 3"],
    ["verse4", "Verso 4"],
    ["prechorus", "Pre-coro"],
    ["chorus", "Coro"],
    ["bridge", "Puente"],
    ["interlude", "Interludio"],
    ["solo", "Solo"],
    ["outro", "Outro"],
    ["custom", "Personalizada"]
  ];

  const DEFAULT_STATE = {
    draft: null,
    addMode: "existing",
    addExistingSection: "",
    existingLabel: "",
    variationSource: "",
    variationLabel: "",
    newType: "verse",
    newLabel: "",
    newBars: 8
  };

  const state = loadState();

  function loadState() {
    try { return Object.assign({}, DEFAULT_STATE, JSON.parse(localStorage.getItem(STATE_KEY) || "{}")); }
    catch (error) { return Object.assign({}, DEFAULT_STATE); }
  }

  function saveState() {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (error) {}
  }

  function register() {
    window.Studio936SuiteProModules = window.Studio936SuiteProModules || {};
    window.Studio936SuiteProStructure = { version: "structure-v3.0", render };
    window.Studio936SuiteProModules.structure = window.Studio936SuiteProStructure;
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#s936SuitePro .s936-struct-shell{display:grid;gap:12px}
#s936SuitePro .s936-struct-card{border:1px solid rgba(255,255,255,.12);border-radius:18px;background:rgba(255,255,255,.045);padding:13px}
#s936SuitePro .s936-struct-card.main{border-color:rgba(0,255,204,.36);background:linear-gradient(135deg,rgba(0,255,204,.10),rgba(255,255,255,.035))}
#s936SuitePro .s936-struct-card.gold{border-color:rgba(255,216,77,.42);background:linear-gradient(135deg,rgba(255,216,77,.10),rgba(255,255,255,.035))}
#s936SuitePro .s936-struct-card.dangerzone{border-color:rgba(255,90,90,.32);background:linear-gradient(135deg,rgba(255,90,90,.08),rgba(255,255,255,.035))}
#s936SuitePro .s936-struct-card h4{margin:0 0 8px;color:#8affff;font-size:.82rem;text-transform:uppercase;letter-spacing:.8px}
#s936SuitePro .s936-struct-card h5{margin:0 0 7px;color:#fff;font-size:.88rem}
#s936SuitePro .s936-struct-line{margin:6px 0;color:rgba(255,255,255,.80);font-size:.72rem;line-height:1.42}
#s936SuitePro .s936-struct-line strong{color:#ffe066}
#s936SuitePro .s936-struct-muted{color:rgba(255,255,255,.62);font-size:.68rem;line-height:1.45}
#s936SuitePro .s936-struct-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}
#s936SuitePro .s936-struct-btn{border:1px solid rgba(0,255,204,.45);border-radius:999px;background:rgba(0,255,204,.08);color:#bfffee;padding:7px 11px;font-size:.64rem;font-weight:950;cursor:pointer;text-transform:uppercase}
#s936SuitePro .s936-struct-btn.warn{border-color:rgba(255,216,77,.70);background:rgba(255,216,77,.10);color:#ffe066}
#s936SuitePro .s936-struct-btn.danger{border-color:rgba(255,90,90,.70);background:rgba(255,90,90,.10);color:#ffb5b5}
#s936SuitePro .s936-struct-btn.secondary{border-color:rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:#fff}
#s936SuitePro .s936-struct-score{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:8px}
#s936SuitePro .s936-struct-score .metric{border:1px solid rgba(255,255,255,.11);border-radius:14px;background:rgba(0,0,0,.18);padding:9px;text-align:center}
#s936SuitePro .s936-struct-score .metric b{display:block;color:#00ffcc;font-size:1.1rem}
#s936SuitePro .s936-struct-score .metric span{display:block;color:rgba(255,255,255,.62);font-size:.58rem;text-transform:uppercase;font-weight:900}
#s936SuitePro .s936-struct-grid{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(330px,.92fr);gap:12px}
#s936SuitePro .s936-struct-form{display:grid;grid-template-columns:minmax(120px,.8fr) minmax(120px,1fr) minmax(90px,.45fr);gap:8px;align-items:end}
#s936SuitePro .s936-struct-form.two{grid-template-columns:minmax(160px,1fr) minmax(120px,.55fr)}
#s936SuitePro .s936-struct-field label{display:block;color:#ffe066;font-size:.58rem;font-weight:950;text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px}
#s936SuitePro .s936-struct-select,#s936SuitePro .s936-struct-input{width:100%;border:1px solid rgba(255,255,255,.16);border-radius:12px;background:rgba(0,0,0,.26);color:#fff;padding:8px 10px;font-size:.75rem;font-weight:800}
#s936SuitePro .s936-struct-list{display:grid;gap:8px;margin-top:10px}
#s936SuitePro .s936-struct-part{display:grid;grid-template-columns:38px minmax(0,1fr) auto;gap:8px;align-items:center;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(0,0,0,.18);padding:9px}
#s936SuitePro .s936-struct-part.independent{border-color:rgba(255,216,77,.28);background:linear-gradient(135deg,rgba(255,216,77,.07),rgba(0,0,0,.18))}
#s936SuitePro .s936-struct-num{color:#ffe066;font-size:.66rem;font-weight:950;text-align:center}
#s936SuitePro .s936-struct-part b{display:block;color:#fff;font-size:.80rem}
#s936SuitePro .s936-struct-part span{display:block;color:rgba(255,255,255,.65);font-size:.62rem;line-height:1.35;margin-top:2px}
#s936SuitePro .s936-struct-mini-actions{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}
#s936SuitePro .s936-struct-mini{border:1px solid rgba(255,255,255,.14);border-radius:999px;background:rgba(255,255,255,.05);color:#fff;padding:5px 8px;font-size:.58rem;font-weight:950;cursor:pointer}
#s936SuitePro .s936-struct-mini:hover{border-color:rgba(0,255,204,.55);color:#00ffcc}
#s936SuitePro .s936-struct-mini.warn{border-color:rgba(255,216,77,.42);color:#ffe066}
#s936SuitePro .s936-struct-mini.danger{border-color:rgba(255,90,90,.42);color:#ffb5b5}
#s936SuitePro .s936-struct-flow{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
#s936SuitePro .s936-struct-chip{border:1px solid rgba(0,255,204,.35);border-radius:999px;background:rgba(0,255,204,.08);color:#bfffee;padding:5px 8px;font-size:.62rem;font-weight:900}
#s936SuitePro .s936-struct-chip.gold{border-color:rgba(255,216,77,.55);background:rgba(255,216,77,.12);color:#ffe066}
#s936SuitePro .s936-struct-toolgrid{display:grid;grid-template-columns:1fr;gap:10px}
#s936SuitePro .s936-struct-section-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:7px;margin-top:10px}
#s936SuitePro .s936-struct-section-card{border:1px solid rgba(255,255,255,.11);border-radius:13px;background:rgba(0,0,0,.18);padding:8px}
#s936SuitePro .s936-struct-section-card b{display:block;color:#fff;font-size:.70rem;text-transform:uppercase}
#s936SuitePro .s936-struct-section-card span{display:block;color:rgba(255,255,255,.63);font-size:.60rem;margin-top:3px}
@media(max-width:1100px){#s936SuitePro .s936-struct-grid,#s936SuitePro .s936-struct-form,#s936SuitePro .s936-struct-form.two{grid-template-columns:1fr}#s936SuitePro .s936-struct-score{grid-template-columns:repeat(2,1fr)}#s936SuitePro .s936-struct-part{grid-template-columns:28px minmax(0,1fr)}#s936SuitePro .s936-struct-mini-actions{grid-column:1/-1;justify-content:flex-start}}

#s936SuitePro .s936-struct-diagnosis{margin:10px 0 0;padding:8px 10px;border-left:3px solid rgba(0,255,204,.55);background:rgba(0,255,204,.055);color:rgba(255,255,255,.76);font-size:.68rem;line-height:1.4}
#s936SuitePro .s936-struct-empty{border:1px dashed rgba(255,255,255,.18);border-radius:14px;padding:16px;color:rgba(255,255,255,.62);font-size:.72rem;text-align:center}
#s936SuitePro .s936-struct-add{display:grid;gap:10px}
#s936SuitePro .s936-struct-mode-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
#s936SuitePro .s936-struct-mode{border:1px solid rgba(255,255,255,.14);border-radius:12px;background:rgba(255,255,255,.055);color:#fff;padding:8px 7px;font-size:.60rem;font-weight:950;cursor:pointer;text-transform:uppercase}
#s936SuitePro .s936-struct-mode.active{border-color:rgba(0,255,204,.70);background:rgba(0,255,204,.12);color:#00ffcc}
#s936SuitePro .s936-struct-add-panel{display:grid;gap:9px;border:1px solid rgba(255,255,255,.10);border-radius:14px;background:rgba(0,0,0,.15);padding:10px}
#s936SuitePro .s936-struct-help{margin:0;color:rgba(255,255,255,.66);font-size:.66rem;line-height:1.42}
#s936SuitePro .s936-struct-available{display:flex;flex-wrap:wrap;gap:5px}
#s936SuitePro .s936-struct-advanced{border:1px solid rgba(255,255,255,.11);border-radius:16px;background:rgba(255,255,255,.035);overflow:hidden}
#s936SuitePro .s936-struct-advanced summary{cursor:pointer;padding:11px 13px;color:#ffe066;font-size:.68rem;font-weight:950;text-transform:uppercase;letter-spacing:.7px}
#s936SuitePro .s936-struct-advanced-body{padding:0 13px 13px;border-top:1px solid rgba(255,255,255,.08)}
@media(max-width:760px){#s936SuitePro .s936-struct-mode-tabs{grid-template-columns:1fr}}

`;
    document.head.appendChild(style);
  }

  function safe(fn, fallback = null) {
    try { return fn(); } catch (error) { console.warn("Suite Pro Structure:", error); return fallback; }
  }

  function snap(ctx) { return safe(() => ctx.snapshot(), {}) || {}; }

  function sectionItems(s, key) {
    const sections = s.sections || {};
    return Array.isArray(sections[key]) ? sections[key] : [];
  }

  function cloneItems(items) {
    return JSON.parse(JSON.stringify(Array.isArray(items) ? items : []));
  }

  function readArrangement(s) {
    const arrangement = Array.isArray(s.arrangement) ? s.arrangement : [];
    if (arrangement.length) {
      return arrangement.map((p) => ({
        section: p.section || p.key || "verse",
        label: p.label || p.name || labelFor(p.section || p.key || "verse"),
        bars: Number(p.bars) || inferredBars(s, p.section || p.key),
        independent: false
      }));
    }
    const sections = s.sections || {};
    return Object.keys(sections).map((key) => ({
      section: key,
      label: labelFor(key),
      bars: inferredBars(s, key),
      independent: false
    }));
  }

  function ensureDraft(ctx) {
    const s = snap(ctx);
    const current = readArrangement(s);
    if (!state.draft || !Array.isArray(state.draft.parts)) {
      state.draft = { createdAt: new Date().toISOString(), parts: current.length ? current : defaultParts(), clones: {}, notes: {} };
      saveState();
    }
    if (!state.draft.clones) state.draft.clones = {};
    if (!state.draft.notes) state.draft.notes = {};
    return state.draft.parts;
  }

  function defaultParts() {
    return [
      { section:"intro", label:"Intro", bars:4 },
      { section:"verse1", label:"Verso 1", bars:8 },
      { section:"prechorus", label:"Pre-coro", bars:4 },
      { section:"chorus", label:"Coro", bars:8 },
      { section:"verse2", label:"Verso 2", bars:8 },
      { section:"chorus", label:"Coro final", bars:8 },
      { section:"outro", label:"Outro", bars:4 }
    ];
  }

  function labelFor(key) {
    const found = PART_OPTIONS.find(([value]) => value === key);
    return found ? found[1] : humanizeKey(key);
  }

  function humanizeKey(key) {
    return String(key || "Sección").replace(/[-_]+/g, " ").replace(/\b\w/g, (x) => x.toUpperCase());
  }

  function inferredBars(s, key) {
    const items = sectionItems(s, key);
    return items.reduce((sum, item) => sum + Math.max(1, Number(item?.bars) || 1), 0) || suggestedBars(key);
  }

  function suggestedBars(key) {
    const k = String(key || "").toLowerCase();
    if (k.includes("intro") || k.includes("outro") || k.includes("pre")) return 4;
    if (k.includes("bridge") || k.includes("puente") || k.includes("interlude") || k.includes("solo")) return 8;
    return 8;
  }

  function allKnownSections(s, parts) {
    const keys = new Set();
    Object.keys(s.sections || {}).forEach((key) => keys.add(key));
    (parts || []).forEach((part) => { if (part.section) keys.add(part.section); });
    return Array.from(keys).sort((a, b) => labelFor(a).localeCompare(labelFor(b), "es"));
  }

  function uniqueSectionKey(s, parts, base) {
    const used = new Set(allKnownSections(s, parts));
    const clean = String(base || "section").toLowerCase().replace(/[^a-z0-9]+/g, "") || "section";
    if (!used.has(clean)) return clean;
    for (let i = 2; i < 99; i += 1) {
      const candidate = clean + i;
      if (!used.has(candidate)) return candidate;
    }
    return clean + Date.now();
  }

  function render(ctx, shell) {
    installStyles();
    const root = ctx.el("div", "s936-struct-shell");
    const s = snap(ctx);
    const parts = ensureDraft(ctx);

    renderHeader(ctx, root, s, parts);
    renderBuilder(ctx, root, s, parts);
    renderDiagnosis(ctx, root, s, parts);

    shell.appendChild(root);
  }

  function renderHeader(ctx, root, s, parts) {
    const card = ctx.el("section", "s936-struct-card main");
    card.appendChild(ctx.el("h4", "", "ADN de la canción"));
    card.appendChild(ctx.el("p", "s936-struct-muted", "La franja muestra la forma completa en orden, incluidas las secciones repetidas. Edita abajo y aplica cuando estés conforme."));

    const score = ctx.el("div", "s936-struct-score");
    metric(ctx, score, parts.length || "0", "partes");
    metric(ctx, score, totalBars(parts) || "0", "compases");
    metric(ctx, score, uniqueSectionCount(parts) || "0", "secciones");
    metric(ctx, score, cloneCount() || "0", "variaciones");
    card.appendChild(score);

    const flow = ctx.el("div", "s936-struct-flow");
    if (!parts.length) {
      flow.appendChild(ctx.el("span", "s936-struct-chip", "Estructura vacía · usa Añadir parte"));
    } else {
      parts.forEach((p, i) => {
        const linked = parts.filter((x) => x.section === p.section).length > 1 && !hasClone(p.section);
        const cls = p.independent || hasClone(p.section) ? "gold" : "";
        const suffix = hasClone(p.section) ? " · variación" : linked ? " · repetida" : "";
        flow.appendChild(ctx.el("span", "s936-struct-chip " + cls, `${String(i + 1).padStart(2, "0")} · ${p.label}${suffix}`));
      });
    }
    card.appendChild(flow);

    const actions = ctx.el("div", "s936-struct-actions");
    button(ctx, actions, "Aplicar estructura", () => applyDraft(ctx), "s936-struct-btn warn");
    const reread = button(ctx, actions, "Releer canción", () => {
      if (!window.confirm("¿Descartar los cambios del borrador y volver a leer la estructura actual de la canción?")) return;
      state.draft = { createdAt: new Date().toISOString(), parts: readArrangement(snap(ctx)), clones: {}, notes: {} };
      saveState();
      renderAgain(ctx);
    }, "s936-struct-btn secondary");
    reread.title = "Descarta cambios todavía no aplicados y vuelve a leer el proyecto central.";
    card.appendChild(actions);

    const status = structureStatus(parts);
    card.appendChild(ctx.el("p", "s936-struct-diagnosis", status));
    root.appendChild(card);
  }

  function renderBuilder(ctx, root, s, parts) {
    const grid = ctx.el("div", "s936-struct-grid");

    const listCard = ctx.el("section", "s936-struct-card");
    listCard.appendChild(ctx.el("h4", "", "Arreglo de la canción"));
    listCard.appendChild(ctx.el("p", "s936-struct-muted", "Cada fila es una aparición dentro de la canción. Repetir reutiliza la misma sección; Variación crea una copia independiente para editar después."));
    const list = ctx.el("div", "s936-struct-list");
    if (!parts.length) {
      list.appendChild(ctx.el("div", "s936-struct-empty", "Todavía no hay partes. Usa “Añadir parte” para comenzar."));
    } else {
      parts.forEach((part, index) => list.appendChild(partRow(ctx, s, parts, part, index)));
    }
    listCard.appendChild(list);
    grid.appendChild(listCard);

    const toolCard = ctx.el("section", "s936-struct-card gold");
    toolCard.appendChild(ctx.el("h4", "", "Añadir parte"));
    toolCard.appendChild(ctx.el("p", "s936-struct-muted", "Elige una sola acción: insertar una sección existente, crear una nueva o crear una variación independiente."));
    toolCard.appendChild(renderAddPart(ctx, s, parts));
    grid.appendChild(toolCard);

    root.appendChild(grid);
  }

  function renderAddPart(ctx, s, parts) {
    const wrap = ctx.el("div", "s936-struct-add");

    const modes = ctx.el("div", "s936-struct-mode-tabs");
    [
      ["existing", "Insertar existente"],
      ["new", "Crear nueva"],
      ["variation", "Crear variación"]
    ].forEach(([value, label]) => {
      const btn = ctx.el("button", "s936-struct-mode" + (state.addMode === value ? " active" : ""), label);
      btn.type = "button";
      btn.onclick = () => {
        state.addMode = value;
        saveState();
        renderAgain(ctx);
      };
      modes.appendChild(btn);
    });
    wrap.appendChild(modes);

    const keys = allKnownSections(s, parts);
    const panel = ctx.el("div", "s936-struct-add-panel");

    if (state.addMode === "new") {
      const form = ctx.el("div", "s936-struct-form");
      const typeField = field(ctx, "Tipo musical");
      const typeSelect = ctx.el("select", "s936-struct-select");
      PART_OPTIONS.forEach(([value, label]) => {
        const option = ctx.el("option", "", label);
        option.value = value;
        if (value === state.newType) option.selected = true;
        typeSelect.appendChild(option);
      });
      typeSelect.onchange = () => {
        state.newType = typeSelect.value;
        if (!state.newLabel || state.newLabel === labelFor(state.newType)) state.newLabel = "";
        state.newBars = suggestedBars(typeSelect.value);
        saveState();
      };
      typeField.appendChild(typeSelect);

      const nameField = field(ctx, "Nombre visible");
      const nameInput = ctx.el("input", "s936-struct-input");
      nameInput.value = state.newLabel || "";
      nameInput.placeholder = typeSelect.value === "custom" ? "Ej. Nube instrumental" : "Ej. Coro final";
      nameInput.oninput = () => { state.newLabel = nameInput.value; saveState(); };
      nameField.appendChild(nameInput);

      const barsField = field(ctx, "Compases");
      const barsInput = ctx.el("input", "s936-struct-input");
      barsInput.type = "number";
      barsInput.min = "1";
      barsInput.max = "32";
      barsInput.value = String(state.newBars || suggestedBars(state.newType));
      barsInput.oninput = () => { state.newBars = Math.max(1, Number(barsInput.value) || 8); saveState(); };
      barsField.appendChild(barsInput);
      form.append(typeField, nameField, barsField);
      panel.appendChild(form);

      panel.appendChild(ctx.el("p", "s936-struct-help", "Crea una sección musical nueva con acordes guía y la inserta al final del arreglo."));
      const actions = ctx.el("div", "s936-struct-actions");
      button(ctx, actions, "Crear y añadir", () => {
        const type = typeSelect.value || "verse";
        const visible = (nameInput.value || (type === "custom" ? "Sección nueva" : labelFor(type))).trim();
        const keyBase = type === "custom" ? visible : type;
        const section = uniqueSectionKey(s, parts, keyBase);
        const bars = Math.max(1, Number(barsInput.value) || suggestedBars(type));
        parts.push({ section, label: visible, bars, independent:true });
        state.draft.parts = parts;
        state.draft.clones = state.draft.clones || {};
        state.draft.clones[section] = { source:"", items:defaultChordsFor(type, projectKey(s), bars), createdAt:new Date().toISOString() };
        state.newLabel = "";
        saveState();
        renderAgain(ctx);
      }, "s936-struct-btn warn");
      panel.appendChild(actions);
    } else {
      if (!keys.length) {
        panel.appendChild(ctx.el("div", "s936-struct-empty", "No hay secciones disponibles. Primero crea una sección nueva."));
        wrap.appendChild(panel);
        return wrap;
      }

      const sourceField = field(ctx, state.addMode === "variation" ? "Sección de origen" : "Sección existente");
      const select = ctx.el("select", "s936-struct-select");
      const selectedKey = state.addMode === "variation"
        ? (state.variationSource || keys[0])
        : (state.addExistingSection || keys[0]);
      keys.forEach((key) => {
        const option = ctx.el("option", "", displaySectionLabel(s, parts, key));
        option.value = key;
        if (key === selectedKey) option.selected = true;
        select.appendChild(option);
      });
      select.onchange = () => {
        if (state.addMode === "variation") state.variationSource = select.value;
        else state.addExistingSection = select.value;
        saveState();
      };
      sourceField.appendChild(select);

      const nameField = field(ctx, "Nombre visible");
      const nameInput = ctx.el("input", "s936-struct-input");
      const defaultName = state.addMode === "variation"
        ? (state.variationLabel || variationLabel(displaySectionLabel(s, parts, selectedKey)))
        : (state.existingLabel || displaySectionLabel(s, parts, selectedKey));
      nameInput.value = defaultName;
      nameInput.placeholder = state.addMode === "variation" ? "Ej. Coro final" : "Ej. Coro 2";
      nameInput.oninput = () => {
        if (state.addMode === "variation") state.variationLabel = nameInput.value;
        else state.existingLabel = nameInput.value;
        saveState();
      };
      nameField.appendChild(nameInput);

      const barsField = field(ctx, "Compases");
      const barsInput = ctx.el("input", "s936-struct-input");
      barsInput.type = "number";
      barsInput.min = "1";
      barsInput.max = "32";
      barsInput.value = String(inferredBars(s, selectedKey));
      barsField.appendChild(barsInput);

      const form = ctx.el("div", "s936-struct-form");
      form.append(sourceField, nameField, barsField);
      panel.appendChild(form);

      const help = state.addMode === "variation"
        ? "Copia los acordes de la sección de origen a una sección nueva. Luego podrás editarla sin cambiar la original."
        : "Inserta otra aparición de una sección existente. Ambas apariciones comparten acordes y letra.";
      panel.appendChild(ctx.el("p", "s936-struct-help", help));

      const chips = ctx.el("div", "s936-struct-available");
      keys.slice(0, 12).forEach((key) => chips.appendChild(ctx.el("span", "s936-struct-chip", displaySectionLabel(s, parts, key))));
      panel.appendChild(chips);

      const actions = ctx.el("div", "s936-struct-actions");
      if (state.addMode === "variation") {
        button(ctx, actions, "Crear variación y añadir", () => {
          const source = select.value || keys[0];
          const originalPart = parts.find((p) => p.section === source);
          const newKey = uniqueSectionKey(s, parts, source);
          const visible = (nameInput.value || variationLabel(displaySectionLabel(s, parts, source))).trim();
          const bars = Math.max(1, Number(barsInput.value) || inferredBars(s, source));
          const sourceItems = draftOrLiveItems(s, source);
          state.draft.clones = state.draft.clones || {};
          state.draft.clones[newKey] = {
            source,
            items: cloneItems(sourceItems.length ? sourceItems : defaultChordsFor(source, projectKey(s), bars)),
            createdAt: new Date().toISOString()
          };
          parts.push({ section:newKey, label:visible, bars, independent:true });
          state.draft.parts = parts;
          state.variationLabel = "";
          saveState();
          renderAgain(ctx);
        }, "s936-struct-btn warn");
      } else {
        button(ctx, actions, "Insertar en el arreglo", () => {
          const section = select.value || keys[0];
          const label = (nameInput.value || displaySectionLabel(s, parts, section)).trim();
          const bars = Math.max(1, Number(barsInput.value) || inferredBars(s, section));
          parts.push({ section, label, bars, independent:hasClone(section) });
          state.draft.parts = parts;
          state.existingLabel = "";
          saveState();
          renderAgain(ctx);
        }, "s936-struct-btn warn");
      }
      panel.appendChild(actions);
    }

    wrap.appendChild(panel);
    return wrap;
  }

  function renderCreateNew(ctx, s, parts) {
    const card = ctx.el("section", "s936-struct-card");
    card.appendChild(ctx.el("h4", "", "Crear sección nueva"));
    card.appendChild(ctx.el("p", "s936-struct-muted", "Crea una sección musical nueva con acordes propios. No es lo mismo que añadir una sección existente al arreglo."));
    const form = ctx.el("div", "s936-struct-form");
    const sectionField = field(ctx, "Tipo");
    const sectionSelect = ctx.el("select", "s936-struct-select");
    PART_OPTIONS.forEach(([value, label]) => {
      const option = ctx.el("option", "", label);
      option.value = value;
      if (value === state.newType) option.selected = true;
      sectionSelect.appendChild(option);
    });
    sectionSelect.onchange = () => {
      state.newType = sectionSelect.value;
      if (!state.newLabel) state.newLabel = labelFor(sectionSelect.value);
      state.newBars = suggestedBars(sectionSelect.value);
      saveState();
      renderAgain(ctx);
    };
    sectionField.appendChild(sectionSelect);

    const labelField = field(ctx, "Nombre visible");
    const labelInput = ctx.el("input", "s936-struct-input");
    labelInput.value = state.newLabel || labelFor(state.newType);
    labelInput.placeholder = "Verso 3, Coro final...";
    labelInput.oninput = () => { state.newLabel = labelInput.value; saveState(); };
    labelField.appendChild(labelInput);

    const barsField = field(ctx, "Compases");
    const barsInput = ctx.el("input", "s936-struct-input");
    barsInput.type = "number";
    barsInput.min = "1";
    barsInput.max = "32";
    barsInput.value = String(state.newBars || suggestedBars(state.newType));
    barsInput.oninput = () => { state.newBars = Math.max(1, Number(barsInput.value) || 8); saveState(); };
    barsField.appendChild(barsInput);

    form.append(sectionField, labelField, barsField);
    card.appendChild(form);

    const actions = ctx.el("div", "s936-struct-actions");
    button(ctx, actions, "Crear y añadir", () => {
      const base = sectionSelect.value || "verse";
      const section = uniqueSectionKey(s, parts, base);
      const label = (labelInput.value || labelFor(section)).trim();
      const bars = Math.max(1, Number(barsInput.value) || suggestedBars(base));
      parts.push({ section, label, bars, independent:true });
      state.draft.parts = parts;
      state.draft.clones = state.draft.clones || {};
      state.draft.clones[section] = { source: "", items: defaultChordsFor(base, projectKey(s), bars), createdAt: new Date().toISOString() };
      state.newLabel = "";
      saveState();
      renderAgain(ctx);
    }, "s936-struct-btn warn");
    button(ctx, actions, "Exportar borrador TXT", () => downloadDraft(ctx, parts), "s936-struct-btn secondary");
    card.appendChild(actions);
    return card;
  }

  function renderCompositionRules(ctx) {
    const card = ctx.el("section", "s936-struct-card");
    card.appendChild(ctx.el("h4", "", "Regla de composición"));
    line(ctx, card, "Añadir", "pone una sección existente en la forma.");
    line(ctx, card, "Repetir", "duplica el bloque usando la misma sección y los mismos acordes.");
    line(ctx, card, "Variación", "copia los acordes a una sección nueva editable sin dañar la original.");
    line(ctx, card, "Nombre visible", "cambia cómo se ve la parte sin cambiar la clave interna.");
    return card;
  }

  function partRow(ctx, s, parts, part, index) {
    const row = ctx.el("div", "s936-struct-part" + (part.independent || hasClone(part.section) ? " independent" : ""));
    row.appendChild(ctx.el("div", "s936-struct-num", String(index + 1).padStart(2, "0")));

    const info = ctx.el("div", "");
    info.appendChild(ctx.el("b", "", part.label || labelFor(part.section)));
    const items = draftOrLiveItems(s, part.section);
    const chords = items.map((i) => String(i?.name || i?.chord || "").trim()).filter(Boolean);
    const occurrences = parts.filter((p) => p.section === part.section).length;
    const relation = hasClone(part.section)
      ? "variación independiente"
      : occurrences > 1 ? "sección reutilizada" : "sección única";
    info.appendChild(ctx.el("span", "", `${part.bars || inferredBars(s, part.section)} compases · ${chords.slice(0, 4).join(" → ") || "sin acordes"} · ${relation}`));
    row.appendChild(info);

    const actions = ctx.el("div", "s936-struct-mini-actions");
    mini(ctx, actions, "↑", () => move(parts, index, -1, ctx));
    mini(ctx, actions, "↓", () => move(parts, index, 1, ctx));
    const repeat = mini(ctx, actions, "Repetir", () => repeatBlock(parts, index, ctx), false, "warn");
    repeat.title = "Inserta otra aparición vinculada a la misma sección.";
    const variation = mini(ctx, actions, "Variación", () => createIndependentVariation(ctx, s, parts, index), false, "warn");
    variation.title = "Crea una sección nueva copiando los acordes para editarla de forma independiente.";
    mini(ctx, actions, "Renombrar", () => renameVisible(ctx, parts, index));
    mini(ctx, actions, "Quitar", () => deleteFromArrangement(ctx, parts, index), true, "danger");
    row.appendChild(actions);
    return row;
  }

  function renderSectionBank(ctx, root, s, parts) {
    const card = ctx.el("section", "s936-struct-card");
    card.appendChild(ctx.el("h4", "", "Banco de secciones"));
    card.appendChild(ctx.el("p", "s936-struct-muted", "Secciones disponibles para añadir al arreglo. Las variaciones independientes aparecen marcadas en dorado."));
    const grid = ctx.el("div", "s936-struct-section-list");
    allKnownSections(s, parts).forEach((key) => {
      const items = draftOrLiveItems(s, key);
      const p = parts.find((part) => part.section === key);
      const box = ctx.el("article", "s936-struct-section-card");
      box.appendChild(ctx.el("b", "", displaySectionLabel(s, parts, key)));
      box.appendChild(ctx.el("span", "", `${key} · ${items.length} acorde(s)${hasClone(key) ? " · variación" : ""}`));
      const actions = ctx.el("div", "s936-struct-actions");
      button(ctx, actions, "Añadir", () => {
        parts.push({ section:key, label:displaySectionLabel(s, parts, key), bars:p?.bars || inferredBars(s, key), independent:hasClone(key) });
        state.draft.parts = parts;
        saveState();
        renderAgain(ctx);
      }, "s936-struct-btn secondary");
      box.appendChild(actions);
      grid.appendChild(box);
    });
    card.appendChild(grid);
    root.appendChild(card);
  }

  function renderDiagnosis(ctx, root, s, parts) {
    const details = ctx.el("details", "s936-struct-advanced");
    const summary = ctx.el("summary", "", "Herramientas avanzadas");
    details.appendChild(summary);

    const body = ctx.el("div", "s936-struct-advanced-body");
    body.appendChild(ctx.el("p", "s936-struct-muted", "Estas acciones no son necesarias para ordenar normalmente la canción. Úsalas solo para diagnóstico, respaldo o comenzar un borrador desde cero."));
    line(ctx, body, "Diagnóstico", structureStatus(parts));

    const actions = ctx.el("div", "s936-struct-actions");
    button(ctx, actions, "Verificar borrador", () => verifyDraft(ctx, s, parts), "s936-struct-btn secondary");
    button(ctx, actions, "Exportar borrador TXT", () => downloadDraft(ctx, parts), "s936-struct-btn secondary");
    button(ctx, actions, "Vaciar solo el borrador", () => clearDraft(ctx), "s936-struct-btn danger");
    body.appendChild(actions);
    details.appendChild(body);
    root.appendChild(details);
  }

  function structureDiagnosis(parts, hasVerse, hasChorus, hasBridge) {
    if (!parts.length) return "Todavía no hay forma definida.";
    if (!hasVerse || !hasChorus) return "La forma necesita al menos verso y coro para funcionar como canción.";
    if (parts.length < 5) return "Hay una base funcional; puede necesitar intro, repetición o cierre.";
    if (!hasBridge) return "Forma sólida; un puente o interludio puede aportar contraste.";
    return "Forma completa y lista para trabajar acordes, letra y arreglo.";
  }

  function structureStatus(parts) {
    const hasChorus = parts.some((p) => /chorus|coro/i.test((p.section || "") + " " + (p.label || "")));
    const hasVerse = parts.some((p) => /verse|verso/i.test((p.section || "") + " " + (p.label || "")));
    const hasBridge = parts.some((p) => /bridge|puente|interlude|interludio/i.test((p.section || "") + " " + (p.label || "")));
    return structureDiagnosis(parts, hasVerse, hasChorus, hasBridge);
  }

  function verifyDraft(ctx, s, parts) {
    const issues = [];
    if (!parts.length) issues.push("El borrador no tiene partes.");
    parts.forEach((part, index) => {
      if (!part.section) issues.push(`Parte ${index + 1}: falta la clave de sección.`);
      if (!String(part.label || "").trim()) issues.push(`Parte ${index + 1}: falta nombre visible.`);
      if (!Number(part.bars) || Number(part.bars) < 1) issues.push(`Parte ${index + 1}: compases inválidos.`);
      const items = draftOrLiveItems(s, part.section);
      if (!items.length) issues.push(`${part.label || part.section}: todavía no tiene acordes.`);
    });
    if (!issues.length) {
      toast(ctx, "Verificación correcta: no se encontraron problemas básicos.");
      return;
    }
    window.alert("Verificación del borrador:\n\n• " + issues.join("\n• "));
  }

  function repeatBlock(parts, index, ctx) {
    const original = parts[index];
    if (!original) return;
    parts.splice(index + 1, 0, Object.assign({}, original, { independent:hasClone(original.section) }));
    state.draft.parts = parts;
    saveState();
    renderAgain(ctx);
  }

  function createIndependentVariation(ctx, s, parts, index) {
    const original = parts[index];
    if (!original) return;
    const baseSection = original.section || "verse";
    const suggested = variationLabel(original.label || labelFor(baseSection));
    const name = window.prompt(
      "Nombre visible de la variación independiente:\n\nSe copiarán los acordes actuales a una sección nueva. Luego podrás editarla sin modificar la original.",
      suggested
    );
    if (name === null) return;
    const newKey = uniqueSectionKey(s, parts, baseSection);
    const sourceItems = draftOrLiveItems(s, baseSection);
    const clonedItems = cloneItems(sourceItems.length ? sourceItems : defaultChordsFor(baseSection, projectKey(s), original.bars));
    state.draft.clones = state.draft.clones || {};
    state.draft.clones[newKey] = { source:baseSection, items:clonedItems, createdAt:new Date().toISOString() };
    parts.splice(index + 1, 0, {
      section:newKey,
      label:(name || suggested).trim(),
      bars:original.bars || inferredBars(s, baseSection),
      independent:true
    });
    state.draft.parts = parts;
    saveState();
    renderAgain(ctx);
  }

  function variationLabel(label) {
    const clean = String(label || "Sección").trim();
    if (/variación/i.test(clean)) return clean;
    return clean + " variación";
  }

  function renameVisible(ctx, parts, index) {
    const part = parts[index];
    if (!part) return;
    const next = window.prompt("Nuevo nombre visible de esta aparición:\n\nNo cambia la clave interna ni los acordes.", part.label || labelFor(part.section));
    if (next === null) return;
    part.label = (next || part.label || labelFor(part.section)).trim();
    state.draft.parts = parts;
    saveState();
    renderAgain(ctx);
  }

  function deleteFromArrangement(ctx, parts, index) {
    const part = parts[index];
    if (!part) return;
    if (!window.confirm(`¿Quitar “${part.label || labelFor(part.section)}” del arreglo?\n\nSolo quita esta aparición de la forma. No borra los acordes ni la letra de la sección.`)) return;
    parts.splice(index, 1);
    state.draft.parts = parts;
    saveState();
    renderAgain(ctx);
  }

  function clearDraft(ctx) {
    const message = [
      "¿Vaciar solo el borrador de estructura?",
      "",
      "Esta acción quita todas las partes del borrador para comenzar desde cero.",
      "No borra acordes, letras ni secciones del proyecto central.",
      "La canción no cambia hasta que vuelvas a construir y uses Aplicar estructura."
    ].join("\n");
    if (!window.confirm(message)) return;
    state.draft = { createdAt:new Date().toISOString(), parts:[], clones:{}, notes:{} };
    saveState();
    renderAgain(ctx);
  }

  function draftOrLiveItems(s, section) {
    const clone = state.draft?.clones?.[section];
    if (clone && Array.isArray(clone.items)) return clone.items;
    return sectionItems(s, section);
  }

  function hasClone(section) {
    return !!(state.draft && state.draft.clones && state.draft.clones[section]);
  }

  function cloneCount() {
    return Object.keys(state.draft?.clones || {}).length;
  }

  function displaySectionLabel(s, parts, key) {
    const found = (parts || []).find((part) => part.section === key);
    return found?.label || labelFor(key);
  }

  function applyDraft(ctx) {
    const s = snap(ctx);
    const parts = ensureDraft(ctx).slice();
    if (!parts.length) return toast(ctx, "No hay estructura para aplicar.");
    const msg = [
      "Esto aplicará la estructura del borrador a la canción actual.",
      "",
      "Conserva acordes existentes.",
      "Crea secciones nuevas.",
      "Convierte variaciones independientes en secciones reales.",
      "Guarda backup local antes de aplicar.",
      "",
      "¿Aplicar estructura?"
    ].join("\n");
    if (!window.confirm(msg)) return;

    const current = safe(() => JSON.parse(JSON.stringify(s.project || s)), {}) || {};
    backup(ctx, current);

    const sections = Object.assign({}, current.sections || s.sections || {});
    const lyrics = Object.assign({}, current.lyrics || s.lyrics || {});
    const sectionSolos = Object.assign({}, current.sectionSolos || s.sectionSolos || {});
    const key = projectKey(s, current);

    const clones = state.draft?.clones || {};
    Object.keys(clones).forEach((section) => {
      sections[section] = cloneItems(clones[section].items || []);
      if (lyrics[section] === undefined) lyrics[section] = "";
      if (!sectionSolos[section]) sectionSolos[section] = { key, scale: "major", phrase: "" };
    });

    parts.forEach((part) => {
      if (!Array.isArray(sections[part.section]) || !sections[part.section].length) {
        sections[part.section] = defaultChordsFor(part.section, key, part.bars);
      }
      if (lyrics[part.section] === undefined) lyrics[part.section] = "";
      if (!sectionSolos[part.section]) sectionSolos[part.section] = { key, scale: "major", phrase: "" };
    });

    const project = Object.assign({}, current, {
      title: current.title || s.title || "Canción sin nombre",
      author: current.author || s.author || "Autor no definido",
      sections,
      lyrics,
      sectionSolos,
      arrangement: parts.map((p) => ({
        section: p.section,
        label: p.label || labelFor(p.section),
        bars: Math.max(1, Number(p.bars) || suggestedBars(p.section))
      })),
      updatedAt: new Date().toISOString()
    });

    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(project));
    toast(ctx, "Estructura aplicada. Recargando canción...");
    setTimeout(() => window.location.reload(), 450);
  }

  function defaultChordsFor(section, key, bars) {
    const map = {
      intro: ["I", "V"],
      verse: ["I", "V", "vi", "IV"],
      verse1: ["I", "V", "vi", "IV"],
      verse2: ["I", "V", "vi", "IV"],
      verse3: ["I", "V", "vi", "IV"],
      verse4: ["I", "V", "vi", "IV"],
      prechorus: ["IV", "V", "vi", "V"],
      chorus: ["I", "V", "vi", "IV"],
      bridge: ["vi", "IV", "I", "V"],
      interlude: ["I", "IV"],
      solo: ["I", "V", "vi", "IV"],
      outro: ["I", "V"]
    };
    const base = baseType(section);
    const romans = map[section] || map[base] || ["I", "V", "vi", "IV"];
    const chordNames = romans.map((r) => romanToChord(key, r));
    const per = Math.max(1, Math.round((Number(bars) || suggestedBars(section)) / Math.max(1, chordNames.length)));
    return chordNames.map((name) => ({ name, bass: chordBass(name), notes: chordNotes(name, key).join(" "), bars: per }));
  }

  function baseType(section) {
    const k = String(section || "").toLowerCase();
    if (k.includes("intro")) return "intro";
    if (k.includes("pre")) return "prechorus";
    if (k.includes("chorus") || k.includes("coro")) return "chorus";
    if (k.includes("bridge") || k.includes("puente")) return "bridge";
    if (k.includes("interlude")) return "interlude";
    if (k.includes("solo")) return "solo";
    if (k.includes("outro")) return "outro";
    return "verse";
  }

  const NOTE_INDEX = { C:0, "C#":1, Db:1, D:2, "D#":3, Eb:3, E:4, F:5, "F#":6, Gb:6, G:7, "G#":8, Ab:8, A:9, "A#":10, Bb:10, B:11 };
  const SHARP = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const FLAT = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
  const FLAT_KEYS = new Set(["F","Bb","Eb","Ab","Db","Gb"]);
  const ROMAN = { I:0, ii:1, iii:2, IV:3, V:4, vi:5, vii:6 };

  function normalizeKey(value) {
    const m = String(value || "").trim().match(/^([A-Ga-g])([#b]?)/);
    return m ? m[1].toUpperCase() + (m[2] || "") : "C";
  }

  function projectKey(s, current) {
    return normalizeKey(current?.key || current?.soloKey || s?.key || s?.soloKey || "C");
  }

  function namesFor(key) { return String(key || "").includes("b") || FLAT_KEYS.has(key) ? FLAT : SHARP; }

  function majorChords(key) {
    const root = NOTE_INDEX[normalizeKey(key)] ?? 0;
    const names = namesFor(key);
    const quality = ["", "m", "m", "", "", "m", "dim"];
    return [0,2,4,5,7,9,11].map((step, i) => names[(root + step) % 12] + quality[i]);
  }

  function romanToChord(key, roman) {
    const chords = majorChords(key);
    const idx = ROMAN[roman];
    return idx === undefined ? roman : chords[idx];
  }

  function chordBass(name) {
    const m = String(name || "").match(/^([A-Ga-g])([#b]?)/);
    return (m ? m[1].toUpperCase() + (m[2] || "") : "C") + "2";
  }

  function chordNotes(name, key) {
    const rootName = normalizeKey(name);
    const root = NOTE_INDEX[rootName] ?? 0;
    const lower = String(name || "").toLowerCase();
    let intervals = [0,4,7];
    if (/(^|[^a-z])m(?!aj)|min|minor/.test(lower)) intervals = [0,3,7];
    if (/maj7/.test(lower)) intervals.push(11);
    else if (/7|9|11|13/.test(lower)) intervals.push(10);
    if (/9/.test(lower)) intervals.push(2);
    const names = namesFor(key || rootName);
    return Array.from(new Set(intervals)).slice(0, 5).map((n, i) => names[(root + n) % 12] + (i < 3 ? "3" : "4"));
  }

  function backup(ctx, project) {
    const list = safe(() => JSON.parse(localStorage.getItem(BACKUP_KEY) || "[]"), []) || [];
    list.unshift({ id:"structure_" + Date.now(), createdAt:new Date().toISOString(), title:project.title || "Canción", project });
    localStorage.setItem(BACKUP_KEY, JSON.stringify(list.slice(0, 20)));
  }

  function downloadDraft(ctx, parts) {
    const s = snap(ctx);
    const text = [
      "Studio 936 · Borrador de estructura",
      "Canción: " + (s.title || ""),
      "Autor: " + (s.author || ""),
      "",
      parts.map((p, i) => `${String(i+1).padStart(2,"0")}. ${p.label} [${p.section}] · ${p.bars || suggestedBars(p.section)} compases${hasClone(p.section) ? " · variación independiente" : ""}`).join("\n")
    ].join("\n");
    const blob = new Blob([text], { type:"text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "studio936-estructura-" + Date.now() + ".txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function renderAgain(ctx) {
    const content = ctx.content?.() || document.querySelector("#s936SuitePro .s936-sp-content");
    if (content) {
      content.textContent = "";
      const shell = ctx.el("div", "s936-cmp-shell");
      render(ctx, shell);
      content.appendChild(shell);
    } else if (typeof ctx.render === "function") {
      ctx.render();
    }
  }

  function totalBars(parts) { return parts.reduce((sum, p) => sum + Math.max(1, Number(p.bars) || suggestedBars(p.section)), 0); }
  function uniqueSectionCount(parts) { return new Set(parts.map((p) => p.section)).size; }

  function field(ctx, label) {
    const wrap = ctx.el("div", "s936-struct-field");
    wrap.appendChild(ctx.el("label", "", label));
    return wrap;
  }

  function line(ctx, parent, label, value) {
    const p = ctx.el("p", "s936-struct-line");
    p.appendChild(ctx.el("strong", "", label + ":"));
    p.appendChild(document.createTextNode(" " + (value || "")));
    parent.appendChild(p);
  }

  function metric(ctx, parent, value, label) {
    const box = ctx.el("div", "metric");
    box.appendChild(ctx.el("b", "", String(value)));
    box.appendChild(ctx.el("span", "", label));
    parent.appendChild(box);
  }

  function button(ctx, parent, label, fn, className = "s936-struct-btn") {
    const b = ctx.el("button", className, label);
    b.type = "button";
    b.onclick = fn;
    parent.appendChild(b);
    return b;
  }

  function mini(ctx, parent, label, fn, danger=false, extraClass="") {
    const b = ctx.el("button", "s936-struct-mini " + extraClass, label);
    b.type = "button";
    if (danger) b.classList.add("danger");
    b.onclick = fn;
    parent.appendChild(b);
    return b;
  }

  function move(parts, index, delta, ctx) {
    const next = index + delta;
    if (next < 0 || next >= parts.length) return;
    const [item] = parts.splice(index, 1);
    parts.splice(next, 0, item);
    state.draft.parts = parts;
    saveState();
    renderAgain(ctx);
  }

  function toast(ctx, message) {
    if (ctx.toast) return ctx.toast(message);
    const box = document.createElement("div");
    box.textContent = message;
    box.style.cssText = "position:fixed;right:18px;bottom:18px;background:#111;color:#00ffcc;border:1px solid #00ffcc;border-radius:12px;padding:10px 12px;z-index:99999;font-weight:900";
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 2200);
  }

  register();
})();
