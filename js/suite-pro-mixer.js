// Studio 936 Composer - Suite Pro Mixer Module v1
// Scope: Studio > Mixer only. It does not touch app.js, Practice, Drums internals, CSS, MIDI, editor or transport internals.
// Loaded before js/suite-pro.js and rendered through Studio936SuiteProModules.mixer.
(function () {
  "use strict";

  const STYLE_ID = "s936SuiteProMixerStyles";
  const MIXER_STATE_KEY = "s936_suitepro_mixer_v1";
  const DRUMS_STATE_KEY = "s936_suitepro_drums_v1";

  const DEFAULT_STATE = {
    grooveMuted: false,
    grooveBeforeMute: 7
  };

  function loadState() {
    try { return Object.assign({}, DEFAULT_STATE, JSON.parse(localStorage.getItem(MIXER_STATE_KEY) || "{}")); }
    catch (error) { return Object.assign({}, DEFAULT_STATE); }
  }

  const state = loadState();

  function saveState() {
    try { localStorage.setItem(MIXER_STATE_KEY, JSON.stringify(state)); } catch (error) {}
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#s936SuitePro .s936-mx-shell { display:grid; gap:12px; }
#s936SuitePro .s936-mx-board {
  display:grid;
  grid-template-columns:repeat(4,minmax(170px,1fr));
  gap:12px;
}
#s936SuitePro .s936-mx-strip {
  min-width:0;
  border:1px solid rgba(255,255,255,.13);
  border-radius:18px;
  background:linear-gradient(180deg, rgba(255,255,255,.055), rgba(0,0,0,.16));
  padding:13px;
}
#s936SuitePro .s936-mx-strip.primary {
  border-color:rgba(0,255,204,.35);
  background:linear-gradient(135deg, rgba(0,255,204,.12), rgba(255,255,255,.04));
}
#s936SuitePro .s936-mx-strip h4 {
  margin:0 0 4px;
  color:#8affff;
  text-transform:uppercase;
  font-size:.78rem;
  letter-spacing:.7px;
}
#s936SuitePro .s936-mx-sub {
  color:rgba(255,255,255,.68);
  font-size:.68rem;
  line-height:1.35;
  min-height:34px;
}
#s936SuitePro .s936-mx-value {
  margin:11px 0 7px;
  color:#ffe066;
  font-size:.80rem;
  font-weight:950;
}
#s936SuitePro .s936-mx-range {
  width:100%;
  accent-color:#00ffcc;
}
#s936SuitePro .s936-mx-actions {
  display:flex;
  flex-wrap:wrap;
  gap:7px;
  margin-top:12px;
}
#s936SuitePro .s936-mx-btn {
  border:1px solid rgba(0,255,204,.45);
  border-radius:999px;
  background:rgba(0,255,204,.08);
  color:#bfffee;
  padding:7px 10px;
  font-size:.64rem;
  font-weight:950;
  cursor:pointer;
}
#s936SuitePro .s936-mx-btn:hover { background:rgba(0,255,204,.15); }
#s936SuitePro .s936-mx-btn.warn {
  border-color:rgba(255,216,77,.70);
  color:#ffe066;
  background:rgba(255,216,77,.10);
}
#s936SuitePro .s936-mx-btn.danger {
  border-color:rgba(255,90,90,.72);
  color:#ffb5b5;
  background:rgba(255,90,90,.10);
}
#s936SuitePro .s936-mx-btn.secondary {
  border-color:rgba(255,255,255,.18);
  color:#fff;
  background:rgba(255,255,255,.06);
}
#s936SuitePro .s936-mx-meter {
  height:8px;
  border-radius:999px;
  overflow:hidden;
  background:rgba(255,255,255,.14);
  margin-top:9px;
}
#s936SuitePro .s936-mx-meter > span {
  display:block;
  height:100%;
  width:var(--level,50%);
  background:linear-gradient(90deg, rgba(0,255,204,.95), rgba(255,216,77,.9));
}
#s936SuitePro .s936-mx-status {
  display:grid;
  grid-template-columns:repeat(4,minmax(120px,1fr));
  gap:8px;
}
#s936SuitePro .s936-mx-stat {
  border:1px solid rgba(255,255,255,.10);
  border-radius:14px;
  background:rgba(255,255,255,.035);
  padding:10px;
}
#s936SuitePro .s936-mx-stat strong {
  display:block;
  color:#fff;
  font-size:1.05rem;
  line-height:1;
}
#s936SuitePro .s936-mx-stat span {
  display:block;
  margin-top:4px;
  color:rgba(255,255,255,.62);
  font-size:.58rem;
  font-weight:950;
  text-transform:uppercase;
  letter-spacing:.7px;
}
#s936SuitePro .s936-mx-mini-note {
  margin:10px 0 0;
  color:rgba(255,255,255,.66);
  font-size:.65rem;
  line-height:1.4;
}
@media(max-width:1180px){
  #s936SuitePro .s936-mx-board { grid-template-columns:repeat(2,minmax(160px,1fr)); }
  #s936SuitePro .s936-mx-status { grid-template-columns:repeat(2,minmax(120px,1fr)); }
}
@media(max-width:720px){
  #s936SuitePro .s936-mx-board,
  #s936SuitePro .s936-mx-status { grid-template-columns:1fr; }
}
`;
    document.head.appendChild(style);
  }

  function safe(fn, fallback = null) {
    try { return fn(); } catch (error) { console.warn("Suite Pro Mixer:", error); return fallback; }
  }

  function readDrumsState() {
    return safe(() => JSON.parse(localStorage.getItem(DRUMS_STATE_KEY) || "{}"), {}) || {};
  }

  function numberValue(node, fallback = 0) {
    const value = Number(node?.value);
    return Number.isFinite(value) ? value : fallback;
  }

  function setRangeValue(input, value) {
    if (!input) return false;
    input.value = String(value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function buttonIsOn(button) {
    if (!button) return false;
    return button.classList.contains("active") || /ON|Activo|ON\/OFF/i.test(button.textContent || "");
  }

  function render(ctx, host) {
    installStyles();
    const c = host || ctx.clearContent();
    ctx.title(c, "Mixer Pro", "Centro de niveles y transporte rápido. Controla en vivo lo que el motor principal expone sin tocar app.js.");

    const shell = ctx.el("div", "s936-mx-shell");
    renderStatus(ctx, shell);
    const board = ctx.el("div", "s936-mx-board");
    renderGrooveStrip(ctx, board);
    renderDrumsStrip(ctx, board);
    renderClickStrip(ctx, board);
    renderSoloStrip(ctx, board);
    shell.appendChild(board);
    c.appendChild(shell);
  }

  function renderStatus(ctx, shell) {
    const snap = ctx.snapshot ? ctx.snapshot() : {};
    const groove = ctx.byId?.("grooveVol");
    const drumsState = readDrumsState();
    const stats = ctx.el("div", "s936-mx-status");
    addStat(ctx, stats, String(snap.bpm || ctx.byId?.("bpmDisplay")?.textContent || "—"), "BPM");
    addStat(ctx, stats, String(snap.style || ctx.byId?.("styleSelect")?.value || "—"), "Estilo");
    addStat(ctx, stats, String(groove?.value || "—") + " / 10", "Groove");
    addStat(ctx, stats, Math.round(Number(drumsState.volume ?? 0.55) * 100) + "%", "Drums ref");
    shell.appendChild(stats);
  }

  function addStat(ctx, parent, value, label) {
    const item = ctx.el("div", "s936-mx-stat");
    item.appendChild(ctx.el("strong", "", value));
    item.appendChild(ctx.el("span", "", label));
    parent.appendChild(item);
  }

  function renderGrooveStrip(ctx, board) {
    const groove = ctx.byId?.("grooveVol");
    const card = strip(ctx, "Groove / instrumento", "Volumen real del acompañamiento principal.", true);
    const current = numberValue(groove, 7);
    const shown = ctx.el("div", "s936-mx-value", "Nivel: " + current + " / 10");
    card.appendChild(shown);

    const slider = ctx.el("input", "s936-mx-range");
    slider.type = "range";
    slider.min = groove?.min || "1";
    slider.max = groove?.max || "10";
    slider.step = groove?.step || "1";
    slider.value = groove?.value || "7";
    slider.oninput = () => {
      shown.textContent = "Nivel: " + slider.value + " / 10";
      setRangeValue(groove, slider.value);
      updateMeter(card, (Number(slider.value) / 10) * 100);
    };
    card.appendChild(slider);
    card.appendChild(meter(ctx, (current / 10) * 100));

    const actions = ctx.el("div", "s936-mx-actions");
    addButton(ctx, actions, state.grooveMuted ? "Restaurar" : "Mute suave", () => {
      const now = numberValue(groove, 7);
      if (!state.grooveMuted) {
        state.grooveBeforeMute = now;
        state.grooveMuted = true;
        setRangeValue(groove, groove?.min || 1);
      } else {
        state.grooveMuted = false;
        setRangeValue(groove, state.grooveBeforeMute || 7);
      }
      saveState();
      if (ctx.render) ctx.render();
    }, "s936-mx-btn warn");
    addButton(ctx, actions, "Start Groove", () => ctx.callBridge?.("startGroove", () => ctx.byId?.("playBtn")?.click()));
    addButton(ctx, actions, "Stop", () => ctx.callBridge?.("stopPlayback", () => ctx.byId?.("playBtn")?.click()), "s936-mx-btn danger");
    card.appendChild(actions);
    board.appendChild(card);
  }

  function renderDrumsStrip(ctx, board) {
    const drumsState = readDrumsState();
    const level = Math.round(Number(drumsState.volume ?? 0.55) * 100);
    const card = strip(ctx, "Drums Pro", "Arranque/parada del módulo de batería. El volumen fino sigue en Drums Pro.", false);
    card.appendChild(ctx.el("div", "s936-mx-value", "Referencia: " + level + "%"));
    card.appendChild(meter(ctx, level));
    const actions = ctx.el("div", "s936-mx-actions");
    addButton(ctx, actions, "Start Drums", () => {
      const mod = window.Studio936SuiteProModules?.drums || window.Studio936SuiteProDrums;
      if (mod && typeof mod.start === "function") return mod.start(ctx);
    });
    addButton(ctx, actions, "Stop Drums", () => {
      const mod = window.Studio936SuiteProModules?.drums || window.Studio936SuiteProDrums;
      if (mod && typeof mod.stop === "function") return mod.stop();
    }, "s936-mx-btn danger");
    addButton(ctx, actions, "Abrir Drums", () => {
      ctx.state.studioTool = "drums";
      ctx.render();
    }, "s936-mx-btn secondary");
    card.appendChild(actions);
    board.appendChild(card);
  }

  function renderClickStrip(ctx, board) {
    const metro = ctx.byId?.("metroBtn");
    const on = buttonIsOn(metro);
    const card = strip(ctx, "Click / metrónomo", "Control real del metrónomo principal.", false);
    card.appendChild(ctx.el("div", "s936-mx-value", on ? "Estado: ON" : "Estado: OFF"));
    card.appendChild(meter(ctx, on ? 100 : 0));
    const actions = ctx.el("div", "s936-mx-actions");
    addButton(ctx, actions, on ? "Metrónomo OFF" : "Metrónomo ON", () => {
      metro?.click();
      setTimeout(() => ctx.render(), 80);
    }, on ? "s936-mx-btn warn" : "s936-mx-btn secondary");
    board.appendChild(card);
    card.appendChild(actions);
  }

  function renderSoloStrip(ctx, board) {
    const solo = ctx.byId?.("soloBtn");
    const on = buttonIsOn(solo);
    const card = strip(ctx, "Solo / melodía", "Control real del solo/melodía guía de la app.", false);
    card.appendChild(ctx.el("div", "s936-mx-value", on ? "Estado: ON" : "Estado: OFF"));
    card.appendChild(meter(ctx, on ? 100 : 0));
    const actions = ctx.el("div", "s936-mx-actions");
    addButton(ctx, actions, on ? "Solo OFF" : "Solo ON", () => {
      solo?.click();
      setTimeout(() => ctx.render(), 80);
    }, on ? "s936-mx-btn warn" : "s936-mx-btn secondary");
    addButton(ctx, actions, "Canción completa", () => ctx.callBridge?.("playFullSong", () => ctx.byId?.("playSongBtn")?.click()));
    board.appendChild(card);
    card.appendChild(actions);
  }

  function strip(ctx, title, subtitle, primary) {
    const card = ctx.el("article", "s936-mx-strip" + (primary ? " primary" : ""));
    card.appendChild(ctx.el("h4", "", title));
    card.appendChild(ctx.el("div", "s936-mx-sub", subtitle));
    return card;
  }

  function meter(ctx, percent) {
    const box = ctx.el("div", "s936-mx-meter");
    const bar = ctx.el("span", "");
    bar.style.setProperty("--level", Math.max(0, Math.min(100, Number(percent) || 0)) + "%");
    box.appendChild(bar);
    return box;
  }

  function updateMeter(card, percent) {
    const bar = card.querySelector(".s936-mx-meter > span");
    if (bar) bar.style.setProperty("--level", Math.max(0, Math.min(100, Number(percent) || 0)) + "%");
  }

  function addButton(ctx, parent, label, fn, className = "s936-mx-btn") {
    const btn = ctx.el("button", className, label);
    btn.type = "button";
    btn.onclick = fn;
    parent.appendChild(btn);
    return btn;
  }

  function register() {
    window.Studio936SuiteProModules = window.Studio936SuiteProModules || {};
    window.Studio936SuiteProMixer = {
      version: "mixer-v1",
      render
    };
    window.Studio936SuiteProModules.mixer = window.Studio936SuiteProMixer;
  }

  register();
})();
