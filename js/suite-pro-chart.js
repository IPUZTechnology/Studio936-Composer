// Studio 936 Composer - Chart View v1.1.0
// Lead sheet iReal Book style — panel derecho, 4 compases por línea
window.Studio936SuiteProChart = (() => {
  "use strict";
  const VERSION = "chart-v1.1.0";
  const STYLE_ID = "s936-chart-styles-v11";

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = `
.s936-chart-wrap{background:#0b0d14;height:100%;overflow-y:auto;padding:0;font-family:system-ui,sans-serif}
.s936-chart-head{display:flex;align-items:center;justify-content:space-between;padding:10px 16px 8px;border-bottom:1px solid rgba(255,255,255,.08);position:sticky;top:0;background:#0b0d14;z-index:10}
.s936-chart-song-title{font-size:.78rem;font-weight:900;color:#00ffcc;text-transform:uppercase;letter-spacing:1px}
.s936-chart-song-meta{font-size:.58rem;color:rgba(255,255,255,.4);margin-top:2px}
.s936-chart-view-btns{display:flex;gap:5px}
.s936-chart-vbtn{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:14px;color:rgba(255,255,255,.6);font-size:.52rem;font-weight:700;padding:4px 10px;cursor:pointer;text-transform:uppercase;letter-spacing:.4px;transition:all .12s}
.s936-chart-vbtn.active,.s936-chart-vbtn:hover{background:rgba(0,255,204,.15);border-color:#00ffcc;color:#bfffee}
.s936-chart-body{padding:10px 12px 24px}
/* Sección */
.s936-chart-section{margin-bottom:20px}
.s936-chart-sec-header{display:flex;align-items:center;gap:8px;margin-bottom:4px}
.s936-chart-sec-badge{background:rgba(255,224,102,.15);border:1px solid rgba(255,224,102,.4);border-radius:4px;color:#ffe066;font-size:.54rem;font-weight:900;padding:2px 8px;text-transform:uppercase;letter-spacing:.6px}
.s936-chart-sec-info{color:rgba(255,255,255,.3);font-size:.5rem}
/* Línea de 4 compases */
.s936-chart-line{display:grid;grid-template-columns:repeat(4,1fr);border-top:2px solid rgba(255,255,255,.3);margin-bottom:0}
.s936-chart-line:last-child .s936-chart-bar{border-bottom:1px solid rgba(255,255,255,.12)}
/* Compás */
.s936-chart-bar{border-right:1px solid rgba(255,255,255,.2);padding:8px 8px 6px;cursor:pointer;position:relative;min-height:68px;transition:background .1s;box-sizing:border-box}
.s936-chart-bar:hover{background:rgba(0,255,204,.05)}
.s936-chart-bar.s936-cb-active{background:rgba(0,255,204,.1);border-right-color:rgba(0,255,204,.5)}
.s936-chart-bar.s936-cb-repeat-open::before{content:"";position:absolute;left:0;top:6px;bottom:6px;width:3px;background:#ffe066;border-radius:0 2px 2px 0}
.s936-chart-bar.s936-cb-repeat-open::after{content:"";position:absolute;left:5px;top:6px;bottom:6px;width:1px;background:rgba(255,224,102,.5)}
.s936-chart-bar.s936-cb-repeat-close{border-right:3px solid #ffe066}
.s936-chart-bar.s936-cb-section-end{border-right:2px solid rgba(255,255,255,.5)}
/* Número de compás */
.s936-chart-bar-num{position:absolute;top:3px;left:5px;font-size:.44rem;color:rgba(255,255,255,.2);font-weight:700}
/* Acorde */
.s936-chart-chord{margin-top:6px}
.s936-chart-chord-root{font-size:1.08rem;font-weight:900;color:#fff;line-height:1;letter-spacing:-.5px}
.s936-chart-chord-quality{font-size:.62rem;font-weight:700;color:rgba(255,255,255,.7);vertical-align:super;margin-left:1px}
.s936-chart-chord-bass{font-size:.54rem;color:#ff5bea;font-weight:700;margin-top:1px}
.s936-chart-chord-beats{font-size:.44rem;color:rgba(255,255,255,.3);margin-top:2px}
/* Slash — compás de repetición */
.s936-chart-slash{display:flex;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,.25);font-size:1.1rem;font-weight:300;padding-top:14px}
/* Compás vacío */
.s936-chart-bar-empty{border-right:1px solid rgba(255,255,255,.1);min-height:68px}
/* Doble barra final */
.s936-chart-double-bar{grid-column:1/-1;height:2px;background:rgba(255,255,255,.2);margin-top:0}
/* Edit overlay */
.s936-chart-edit-pop{position:absolute;top:0;left:0;right:0;background:#131520;border:1px solid rgba(0,255,204,.4);border-radius:8px;z-index:20;padding:8px;box-shadow:0 8px 24px rgba(0,0,0,.6)}
.s936-chart-edit-input{width:100%;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);border-radius:6px;color:#fff;font-size:.72rem;font-weight:700;padding:5px 8px;outline:none;box-sizing:border-box}
.s936-chart-edit-input:focus{border-color:#00ffcc}
.s936-chart-edit-actions{display:flex;gap:4px;margin-top:6px}
.s936-chart-edit-btn{flex:1;background:rgba(0,255,204,.15);border:1px solid rgba(0,255,204,.3);border-radius:6px;color:#bfffee;font-size:.52rem;font-weight:700;padding:4px;cursor:pointer;text-transform:uppercase}
.s936-chart-edit-btn:hover{background:rgba(0,255,204,.25)}
.s936-chart-edit-btn.cancel{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.15);color:rgba(255,255,255,.5)}
/* Modo instrumento */
.s936-chart-inst-badge{font-size:.5rem;background:rgba(255,91,234,.12);border:1px solid rgba(255,91,234,.3);border-radius:10px;color:#ff5bea;padding:2px 8px;text-transform:uppercase;font-weight:700;letter-spacing:.4px}
    `;
    document.head.appendChild(s);
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  // Parsear nombre de acorde en root + quality
  function parseChordName(name) {
    if (!name) return { root: "—", quality: "" };
    const m = name.match(/^([A-G][b#]?)(.*)/);
    if (!m) return { root: name, quality: "" };
    return { root: m[1], quality: m[2] || "" };
  }

  // Expandir acordes en compases individuales
  function expandMeasures(chords) {
    const measures = [];
    let barNum = 1;
    chords.forEach((chord, ci) => {
      const bars = Math.max(1, Number(chord.bars) || 1);
      for (let b = 0; b < bars; b++) {
        measures.push({
          chord: b === 0 ? chord : null,
          isSlash: b > 0,
          chordIndex: ci,
          barInChord: b,
          barNum: barNum++
        });
      }
    });
    return measures;
  }

  // Render de un compás
  function renderBar(m, opts = {}) {
    const { isFirst, isLast, activeChordKey, onEdit } = opts;
    const bar = el("div", "s936-chart-bar" +
      (isFirst ? " s936-cb-repeat-open" : "") +
      (isLast ? " s936-cb-section-end" : "") +
      (activeChordKey !== undefined && m.chordIndex === activeChordKey ? " s936-cb-active" : "")
    );

    // Número de compás
    const num = el("span", "s936-chart-bar-num", String(m.barNum));
    bar.appendChild(num);

    if (m.isSlash) {
      bar.appendChild(el("div", "s936-chart-slash", "////"));
    } else if (m.chord) {
      const chord = m.chord;
      const parsed = parseChordName(chord.name);
      const chordEl = el("div", "s936-chart-chord");
      const nameEl = el("div", "");
      const rootEl = el("span", "s936-chart-chord-root", parsed.root);
      const qualEl = el("span", "s936-chart-chord-quality", parsed.quality);
      nameEl.append(rootEl, qualEl);
      chordEl.appendChild(nameEl);
      if (chord.bass && !chord.name?.endsWith("/" + chord.bass?.replace(/\d/, ""))) {
        const bassNote = chord.bass.replace(/\d/, "");
        chordEl.appendChild(el("div", "s936-chart-chord-bass", "/" + bassNote));
      }
      if (chord.bars > 1) {
        chordEl.appendChild(el("div", "s936-chart-chord-beats", chord.bars + " comp."));
      }
      bar.appendChild(chordEl);

      // Click para editar
      if (onEdit) {
        bar.addEventListener("click", (e) => {
          e.stopPropagation();
          onEdit(bar, m.chordIndex, chord);
        });
      }
    }
    return bar;
  }

  // Render de una sección como bloque de líneas de 4
  function renderSection(label, chords, opts = {}) {
    const { onEdit, activeSection, activeChordIndex, sectionKey } = opts;
    const section = el("div", "s936-chart-section");
    const header = el("div", "s936-chart-sec-header");
    header.appendChild(el("span", "s936-chart-sec-badge", label));
    const measures = expandMeasures(chords);
    header.appendChild(el("span", "s936-chart-sec-info", chords.length + " acordes · " + measures.length + " comp."));
    section.appendChild(header);

    const COLS = 4;
    for (let i = 0; i < measures.length; i += COLS) {
      const line = el("div", "s936-chart-line");
      for (let j = 0; j < COLS; j++) {
        const m = measures[i + j];
        if (!m) {
          line.appendChild(el("div", "s936-chart-bar-empty"));
          continue;
        }
        const isFirst = i + j === 0;
        const isLast = i + j === measures.length - 1;
        const bar = renderBar(m, {
          isFirst,
          isLast,
          activeChordKey: (activeSection === sectionKey) ? activeChordIndex : undefined,
          onEdit: onEdit ? (barEl, ci, chord) => onEdit(barEl, sectionKey, ci, chord) : null
        });
        line.appendChild(bar);
      }
      section.appendChild(line);
    }
    // doble barra al final de sección
    section.appendChild(el("div", "s936-chart-double-bar"));
    return section;
  }

  // Popup de edición inline
  function showEditPopup(barEl, sectionKey, chordIndex, chord, onSave) {
    // Cerrar cualquier popup existente
    document.querySelectorAll(".s936-chart-edit-pop").forEach(p => p.remove());

    const pop = el("div", "s936-chart-edit-pop");
    const input = el("input", "s936-chart-edit-input");
    input.value = chord.name || "";
    input.placeholder = "Ej: Cmaj7, Dm7, G7";
    input.setAttribute("autocomplete", "off");
    pop.appendChild(input);

    const acts = el("div", "s936-chart-edit-actions");
    const saveBtn = el("button", "s936-chart-edit-btn", "Guardar");
    const cancelBtn = el("button", "s936-chart-edit-btn cancel", "Cancelar");
    acts.append(saveBtn, cancelBtn);
    pop.appendChild(acts);

    saveBtn.onclick = () => {
      const newName = input.value.trim();
      if (newName && onSave) onSave(sectionKey, chordIndex, newName);
      pop.remove();
    };
    cancelBtn.onclick = () => pop.remove();
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") saveBtn.onclick();
      if (e.key === "Escape") cancelBtn.onclick();
    });

    barEl.style.position = "relative";
    barEl.appendChild(pop);
    setTimeout(() => input.focus(), 0);
  }

  // Render principal
  function render({ container, onChordSelect, onChordEdit } = {}) {
    if (!container) return;
    installStyles();
    container.innerHTML = "";

    const bridge = window.Studio936AppBridge;
    if (!bridge) {
      container.appendChild(el("div", "s936-chart-wrap", "Bridge no disponible."));
      return;
    }

    const arrangement = bridge.getArrangement?.() || [];
    const edState = bridge.getEditorState?.() || {};
    const sections = edState.sections || {};
    const meta = edState;

    if (!arrangement.length) {
      const empty = el("div", "s936-chart-wrap");
      empty.style.cssText = "display:flex;align-items:center;justify-content:center;height:200px";
      empty.appendChild(el("p", "", "Sin arreglo. Crea partes en Estructura y aplica."));
      container.appendChild(empty);
      return;
    }

    const wrap = el("div", "s936-chart-wrap");

    // Header
    const head = el("div", "s936-chart-head");
    const headInfo = el("div", "");
    headInfo.appendChild(el("div", "s936-chart-song-title", edState.title || "Canción"));
    headInfo.appendChild(el("div", "s936-chart-song-meta",
      (edState.style || "") + (edState.bpm ? " · " + edState.bpm + " BPM" : "") +
      " · " + arrangement.length + " secciones"
    ));
    head.appendChild(headInfo);

    const instBadge = el("span", "s936-chart-inst-badge", (edState.instrument || "piano").toUpperCase());
    head.appendChild(instBadge);

    wrap.appendChild(head);

    // Body con secciones
    const body = el("div", "s936-chart-body");
    arrangement.forEach(item => {
      const chords = sections[item.section];
      if (!Array.isArray(chords) || !chords.length) return;
      const section = renderSection(item.label || item.section, chords, {
        sectionKey: item.section,
        activeSection: edState.sectionKey,
        activeChordIndex: edState.chordIndex,
        onEdit: (barEl, sectionKey, chordIndex, chord) => {
          showEditPopup(barEl, sectionKey, chordIndex, chord, (sk, ci, newName) => {
            if (typeof onChordEdit === "function") onChordEdit(sk, ci, newName);
          });
        }
      });
      // Click en sección → seleccionar en editor
      if (onChordSelect) {
        section.querySelectorAll(".s936-chart-bar").forEach(bar => {
          // ya tiene handler de edición, no agregar otro click
        });
      }
      body.appendChild(section);
    });

    wrap.appendChild(body);
    container.appendChild(wrap);
    return { ok: true, version: VERSION };
  }

  // Montar en el panel derecho (fretboardContainer)
  function mountInRightPanel({ onChordEdit } = {}) {
    const bridge = window.Studio936AppBridge;
    const fretContainer = document.getElementById("fretboardContainer");
    const pianoContainer = document.getElementById("pianoContainer");
    if (!fretContainer) return { ok: false };

    // Crear contenedor del chart si no existe
    let chartEl = document.getElementById("s936ChartContainer");
    if (!chartEl) {
      chartEl = document.createElement("div");
      chartEl.id = "s936ChartContainer";
      chartEl.style.cssText = "width:100%;height:100%;overflow:hidden;position:absolute;top:0;left:0;z-index:5";
      fretContainer.style.position = "relative";
      fretContainer.appendChild(chartEl);
    }
    chartEl.style.display = "block";

    render({
      container: chartEl,
      onChordEdit: (sectionKey, chordIndex, newName) => {
        if (typeof onChordEdit === "function") onChordEdit(sectionKey, chordIndex, newName);
        // Re-render después de edición
        setTimeout(() => render({ container: chartEl, onChordEdit: arguments.callee }), 100);
      }
    });

    return { ok: true };
  }

  function unmountFromRightPanel() {
    const chartEl = document.getElementById("s936ChartContainer");
    if (chartEl) chartEl.style.display = "none";
  }

  return {
    version: VERSION,
    render,
    mountInRightPanel,
    unmountFromRightPanel
  };
})();
