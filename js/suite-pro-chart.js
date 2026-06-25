// Studio 936 Composer - Chart View v1.0.0
// Lead sheet visual estilo iReal Book — compases, secciones, acordes, símbolos de repetición
window.Studio936SuiteProChart = (() => {
  "use strict";

  const VERSION = "chart-v1.0.0";

  // ── Estilos ──────────────────────────────────────────────────────────────
  const STYLE_ID = "s936-chart-styles";
  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
.s936-chart-view{background:#0a0c12;border-radius:16px;padding:16px;font-family:system-ui,sans-serif;color:#fff;overflow:auto;max-height:calc(100vh - 200px)}
.s936-chart-toolbar{display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap}
.s936-chart-toolbar-title{font-size:.72rem;font-weight:900;color:#00ffcc;text-transform:uppercase;letter-spacing:1px;flex:1}
.s936-chart-btn{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:20px;color:rgba(255,255,255,.75);font-size:.58rem;font-weight:700;padding:5px 12px;cursor:pointer;text-transform:uppercase;letter-spacing:.5px;transition:all .15s}
.s936-chart-btn:hover{background:rgba(0,255,204,.15);border-color:#00ffcc;color:#bfffee}
.s936-chart-btn.active{background:rgba(0,255,204,.18);border-color:#00ffcc;color:#bfffee}
.s936-chart-section{margin-bottom:18px}
.s936-chart-section-header{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.s936-chart-section-label{background:rgba(0,255,204,.15);border:1px solid rgba(0,255,204,.35);border-radius:6px;color:#00ffcc;font-size:.58rem;font-weight:900;padding:3px 8px;text-transform:uppercase;letter-spacing:.8px}
.s936-chart-section-bars{color:rgba(255,255,255,.35);font-size:.52rem}
.s936-chart-row{display:flex;flex-wrap:wrap;gap:0;border-top:2px solid rgba(255,255,255,.25);margin-bottom:2px}
.s936-chart-bar{flex:0 0 auto;width:calc(25% - 1px);min-width:80px;border-right:1px solid rgba(255,255,255,.18);padding:8px 6px 6px;cursor:pointer;position:relative;transition:background .12s;box-sizing:border-box}
.s936-chart-bar:hover{background:rgba(0,255,204,.06)}
.s936-chart-bar.active{background:rgba(0,255,204,.12);border-right-color:rgba(0,255,204,.4)}
.s936-chart-bar.repeat-start::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:#ffe066;border-radius:0 2px 2px 0}
.s936-chart-bar.repeat-end::after{content:"";position:absolute;right:0;top:0;bottom:0;width:4px;background:#ffe066;border-radius:2px 0 0 2px}
.s936-chart-chord-name{font-size:.82rem;font-weight:900;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2}
.s936-chart-chord-bass{font-size:.52rem;color:#ff5bea;font-weight:700;margin-top:1px}
.s936-chart-chord-bars{font-size:.46rem;color:rgba(255,255,255,.38);margin-top:3px}
.s936-chart-repeat{font-size:.68rem;color:#ffe066;font-weight:900;position:absolute;top:4px;right:5px}
.s936-chart-slash{color:rgba(255,255,255,.3);font-size:.72rem;font-weight:300;padding:8px 6px}
.s936-chart-empty{color:rgba(255,255,255,.2);font-size:.62rem;text-align:center;padding:24px;border:1px dashed rgba(255,255,255,.1);border-radius:12px;margin:8px 0}
.s936-chart-sym{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border:1px solid #ffe066;border-radius:3px;color:#ffe066;font-size:.5rem;font-weight:900;cursor:pointer;margin-left:4px;vertical-align:middle}
.s936-chart-sym:hover{background:rgba(255,224,102,.15)}
    `;
    document.head.appendChild(style);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function getChartData() {
    const bridge = window.Studio936AppBridge;
    if (!bridge) return null;
    const arrangement = bridge.getArrangement?.() || [];
    const edState = bridge.getEditorState?.() || {};
    const sections = edState.sections || {};
    return { arrangement, sections };
  }

  // ── Render de un compás ──────────────────────────────────────────────────
  function renderBar(chord, barIndex, totalBars, opts = {}) {
    const { isRepeatStart, isRepeatEnd, isSlash, activeChordKey } = opts;
    if (isSlash) {
      return el("div", "s936-chart-slash", "/ / / /");
    }
    const bar = el("div", "s936-chart-bar" +
      (isRepeatStart ? " repeat-start" : "") +
      (isRepeatEnd ? " repeat-end" : "") +
      (activeChordKey === chord?._key ? " active" : "")
    );
    if (chord) {
      const name = el("div", "s936-chart-chord-name", chord.name || "—");
      bar.appendChild(name);
      if (chord.bass && chord.bass !== chord.name?.split("/")?.[0]) {
        const bass = el("div", "s936-chart-chord-bass", "/" + chord.bass.replace(/\d/, ""));
        bar.appendChild(bass);
      }
      if (chord.bars > 1 && barIndex === 0) {
        const barsLabel = el("div", "s936-chart-chord-bars", chord.bars + " comp.");
        bar.appendChild(barsLabel);
      }
    }
    if (isRepeatEnd) {
      const sym = el("span", "s936-chart-repeat", "𝄇");
      bar.appendChild(sym);
    }
    return bar;
  }

  // ── Expandir acordes en compases individuales ────────────────────────────
  function expandToMeasures(chords) {
    const measures = [];
    chords.forEach((chord, ci) => {
      const bars = Math.max(1, Number(chord.bars) || 1);
      for (let b = 0; b < bars; b++) {
        measures.push({
          chord: b === 0 ? chord : null,
          isSlash: b > 0,
          chordIndex: ci,
          barInChord: b
        });
      }
    });
    return measures;
  }

  // ── Render de una sección ────────────────────────────────────────────────
  function renderSection(label, chords, opts = {}) {
    const { onChordClick, activeChordKey } = opts;
    const section = el("div", "s936-chart-section");
    const header = el("div", "s936-chart-section-header");
    header.appendChild(el("span", "s936-chart-section-label", label));
    const measures = expandToMeasures(chords);
    header.appendChild(el("span", "s936-chart-section-bars", measures.length + " comp."));
    section.appendChild(header);

    // Organizar en filas de 4
    const COLS = 4;
    for (let i = 0; i < measures.length; i += COLS) {
      const row = el("div", "s936-chart-row");
      for (let j = 0; j < COLS; j++) {
        const m = measures[i + j];
        if (!m) break;
        const isRepeatStart = i + j === 0;
        const isRepeatEnd = i + j === measures.length - 1;
        const bar = renderBar(m.chord, m.barInChord, measures.length, {
          isRepeatStart: isRepeatStart && measures.length > 1,
          isRepeatEnd: false,
          isSlash: m.isSlash,
          activeChordKey
        });
        if (m.chord && onChordClick) {
          bar.addEventListener("click", () => onChordClick(m.chordIndex, m.chord));
        }
        row.appendChild(bar);
      }
      section.appendChild(row);
    }
    return section;
  }

  // ── Render principal ─────────────────────────────────────────────────────
  function render({ container, onChordClick } = {}) {
    if (!container) return;
    installStyles();
    container.innerHTML = "";

    const data = getChartData();
    if (!data || !data.arrangement.length) {
      container.appendChild(el("div", "s936-chart-empty", "No hay arreglo. Crea partes en Estructura y aplica."));
      return;
    }

    const view = el("div", "s936-chart-view");

    // Toolbar
    const toolbar = el("div", "s936-chart-toolbar");
    toolbar.appendChild(el("span", "s936-chart-toolbar-title", "Chart · " + (window.Studio936AppBridge?.getEditorState?.()?.sectionName || "Canción")));
    view.appendChild(toolbar);

    // Secciones
    data.arrangement.forEach(item => {
      const chords = data.sections[item.section];
      if (!Array.isArray(chords) || !chords.length) return;
      const section = renderSection(item.label || item.section, chords, {
        onChordClick: (chordIndex, chord) => {
          if (typeof onChordClick === "function") onChordClick(item.section, chordIndex, chord);
        }
      });
      view.appendChild(section);
    });

    container.appendChild(view);
    return { ok: true };
  }

  return {
    version: VERSION,
    render
  };
})();
