// Studio 936 Composer - Suite Pro Structure / ADN Module v2.0
// Scope: Compose > Estructura only. No toca app.js, Practice, Drums, Mixer, Recorder ni MIDI.
// Product goal: reemplazar gradualmente el constructor externo de estructura con un módulo propio y seguro.
(function () {
  "use strict";

  const STYLE_ID = "s936SuiteProStructureStylesV2";
  const STATE_KEY = "s936_suitepro_structure_v2";
  const APP_STORAGE_KEY = "studio936ComposerV25SongStructure";
  const BACKUP_KEY = "studio936_structure_backups_v2";

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
    ["outro", "Outro"]
  ];

  const DEFAULT_STATE = {
    draft: null,
    addExistingSection: "",
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
    window.Studio936SuiteProStructure = { version: "structure-v2.0", render };
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
    if (!state.draft || !Array.isArray(state.draft.parts) || !state.draft.parts.length) {
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
    renderSectionBank(ctx, root, s, parts);
    renderDiagnosis(ctx, root, s, parts);

    shell.appendChild(root);
  }

  function renderHeader(ctx, root, s, parts) {
    const card = ctx.el("section", "s936-struct-card main");
    card.appendChild(ctx.el("h4", "", "Estructura / ADN de canción"));
    line(ctx, card, "Objetivo", "crear la forma completa desde Suite Pro: arreglo, secciones reutilizables, variaciones independientes y nombres visibles.");
    const score = ctx.el("div", "s936-struct-score");
    metric(ctx, score, parts.length || "—", "bloques");
    metric(ctx, score, totalBars(parts) || "—", "compases");
    metric(ctx, score, uniqueSectionCount(parts) || "—", "secciones");
    metric(ctx, score, cloneCount() || "—", "variaciones");
    card.appendChild(score);

    const flow = ctx.el("div", "s936-struct-flow");
    parts.slice(0, 16).forEach((p, i) => flow.appendChild(ctx.el("span", "s936-struct-chip " + (p.independent || hasClone(p.section) ? "gold" : ""), `${String(i + 1).padStart(2, "0")} · ${p.label}`)));
    card.appendChild(flow);

    const actions = ctx.el("div", "s936-struct-actions");
    button(ctx, actions, "Aplicar estructura", () => applyDraft(ctx), "s936-struct-btn warn");
    button(ctx, actions, "Releer canción", () => { state.draft = { createdAt: new Date().toISOString(), parts: readArrangement(snap(ctx)), clones: {}, notes: {} }; saveState(); renderAgain(ctx); }, "s936-struct-btn secondary");
    button(ctx, actions, "Borrador base", () => { state.draft = { createdAt: new Date().toISOString(), parts: defaultParts(), clones: {}, notes: {} }; saveState(); renderAgain(ctx); }, "s936-struct-btn secondary");
    button(ctx, actions, "Vaciar arreglo", () => clearDraft(ctx), "s936-struct-btn danger");
    card.appendChild(actions);
    root.appendChild(card);
  }

  function renderBuilder(ctx, root, s, parts) {
    const grid = ctx.el("div", "s936-struct-grid");

    const listCard = ctx.el("section", "s936-struct-card");
    listCard.appendChild(ctx.el("h4", "", "Arreglo de la canción"));
    listCard.appendChild(ctx.el("p", "s936-struct-muted", "Esto reemplaza los botones viejos: añadir al arreglo, repetir bloque, mover, borrar, crear variación y cambiar nombre visible."));
    const list = ctx.el("div", "s936-struct-list");
    parts.forEach((part, index) => list.appendChild(partRow(ctx, s, parts, part, index)));
    listCard.appendChild(list);
    grid.appendChild(listCard);

    const toolCard = ctx.el("section", "s936-struct-card gold");
    toolCard.appendChild(ctx.el("h4", "", "Acciones de estructura"));
    const tools = ctx.el("div", "s936-struct-toolgrid");

    tools.appendChild(renderAddExisting(ctx, s, parts));
    tools.appendChild(renderCreateNew(ctx, s, parts));
    tools.appendChild(renderCompositionRules(ctx));

    toolCard.appendChild(tools);
    grid.appendChild(toolCard);
    root.appendChild(grid);
  }

  function renderAddExisting(ctx, s, parts) {
    const card = ctx.el("section", "s936-struct-card");
    card.appendChild(ctx.el("h4", "", "Añadir sección al arreglo"));
    card.appendChild(ctx.el("p", "s936-struct-muted", "Usa una sección existente sin copiar sus acordes. Ideal para repetir un coro o volver al interludio."));
    const form = ctx.el("div", "s936-struct-form two");
    const fieldSec = field(ctx, "Sección existente");
    const select = ctx.el("select", "s936-struct-select");
    const keys = allKnownSections(s, parts);
    if (!state.addExistingSection && keys.length) state.addExistingSection = keys[0];
    keys.forEach((key) => {
      const option = ctx.el("option", "", displaySectionLabel(s, parts, key));
      option.value = key;
      if (key === state.addExistingSection) option.selected = true;
      select.appendChild(option);
    });
    select.onchange = () => { state.addExistingSection = select.value; saveState(); };
    fieldSec.appendChild(select);

    const fieldBars = field(ctx, "Compases");
    const bars = ctx.el("input", "s936-struct-input");
    bars.type = "number";
    bars.min = "1";
    bars.max = "32";
    bars.value = String(suggestedBars(state.addExistingSection || keys[0]));
    fieldBars.appendChild(bars);

    form.append(fieldSec, fieldBars);
    card.appendChild(form);

    const actions = ctx.el("div", "s936-struct-actions");
    button(ctx, actions, "Añadir al arreglo", () => {
      const section = select.value || keys[0];
      if (!section) return toast(ctx, "No hay secciones disponibles.");
      const label = displaySectionLabel(s, parts, section);
      parts.push({ section, label, bars: Math.max(1, Number(bars.value) || inferredBars(s, section)), independent:false });
      state.draft.parts = parts;
      saveState();
      renderAgain(ctx);
    }, "s936-struct-btn warn");
    card.appendChild(actions);
    return card;
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
    const tag = hasClone(part.section) ? " · variación independiente" : "";
    info.appendChild(ctx.el("span", "", `${part.section} · ${part.bars || inferredBars(s, part.section)} compases · ${chords.slice(0, 4).join(" → ") || "sin acordes todavía"}${tag}`));
    row.appendChild(info);

    const actions = ctx.el("div", "s936-struct-mini-actions");
    mini(ctx, actions, "↑", () => move(parts, index, -1, ctx));
    mini(ctx, actions, "↓", () => move(parts, index, 1, ctx));
    mini(ctx, actions, "Repetir", () => repeatBlock(parts, index, ctx), false, "warn");
    mini(ctx, actions, "Variación", () => createIndependentVariation(ctx, s, parts, index), false, "warn");
    mini(ctx, actions, "Nombre", () => renameVisible(ctx, parts, index));
    mini(ctx, actions, "Borrar", () => deleteFromArrangement(ctx, parts, index), true, "danger");
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
    const card = ctx.el("section", "s936-struct-card");
    card.appendChild(ctx.el("h4", "", "Diagnóstico de forma"));
    const hasChorus = parts.some((p) => /chorus|coro/i.test(p.section + " " + p.label));
    const hasVerse = parts.some((p) => /verse|verso/i.test(p.section + " " + p.label));
    const hasBridge = parts.some((p) => /bridge|puente/i.test(p.section + " " + p.label));
    line(ctx, card, "Estado", structureDiagnosis(parts, hasVerse, hasChorus, hasBridge));
    line(ctx, card, "Siguiente paso", !hasChorus ? "agrega un coro claro." : !hasBridge ? "considera un puente o interludio para contraste." : "pasa al Editor para refinar acordes y compases.");
    const actions = ctx.el("div", "s936-struct-actions");
    button(ctx, actions, "Ir a Editor", () => { ctx.state.composeTool = "editor"; renderAgain(ctx); }, "s936-struct-btn secondary");
    button(ctx, actions, "Ir a Plantillas", () => { ctx.state.composeTool = "templates"; renderAgain(ctx); }, "s936-struct-btn secondary");
    card.appendChild(actions);
    root.appendChild(card);
  }

  function structureDiagnosis(parts, hasVerse, hasChorus, hasBridge) {
    if (!parts.length) return "Todavía no hay forma definida.";
    if (!hasVerse || !hasChorus) return "La forma necesita al menos verso y coro para funcionar como canción.";
    if (parts.length < 5) return "Hay una base funcional; puede necesitar intro, repetición o cierre.";
    if (!hasBridge) return "Forma sólida; un puente/interludio puede dar contraste antes del final.";
    return "Forma completa y lista para trabajar acordes, letra y arreglo.";
  }

  function repeatBlock(parts, index, ctx) {
    const original = parts[index];
    if (!original) return;
    parts.splice(index + 1, 0, Object.assign({}, original));
    state.draft.parts = parts;
    saveState();
    renderAgain(ctx);
  }

  function createIndependentVariation(ctx, s, parts, index) {
    const original = parts[index];
    if (!original) return;
    const baseSection = original.section || "verse";
    const newKey = uniqueSectionKey(s, parts, baseSection);
    const name = window.prompt("Nombre visible de la variación independiente:", variationLabel(original.label || labelFor(baseSection)));
    if (name === null) return;
    const sourceItems = draftOrLiveItems(s, baseSection);
    const clonedItems = cloneItems(sourceItems.length ? sourceItems : defaultChordsFor(baseSection, projectKey(s), original.bars));
    state.draft.clones = state.draft.clones || {};
    state.draft.clones[newKey] = { source: baseSection, items: clonedItems, createdAt: new Date().toISOString() };
    parts.splice(index + 1, 0, {
      section: newKey,
      label: (name || variationLabel(original.label || labelFor(baseSection))).trim(),
      bars: original.bars || inferredBars(s, baseSection),
      independent: true
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
    const next = window.prompt("Nuevo nombre visible:", part.label || labelFor(part.section));
    if (next === null) return;
    part.label = (next || part.label || labelFor(part.section)).trim();
    state.draft.parts = parts;
    saveState();
    renderAgain(ctx);
  }

  function deleteFromArrangement(ctx, parts, index) {
    const part = parts[index];
    if (!part) return;
    if (!window.confirm("Borrar este bloque del arreglo?\n\nNo borra la sección musical, solo la quita de la forma de la canción.")) return;
    parts.splice(index, 1);
    state.draft.parts = parts;
    saveState();
    renderAgain(ctx);
  }

  function clearDraft(ctx) {
    if (!window.confirm("Vaciar el borrador de arreglo?\n\nNo toca la canción hasta que uses Aplicar estructura.")) return;
    state.draft = { createdAt: new Date().toISOString(), parts: [], clones: {}, notes: {} };
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
