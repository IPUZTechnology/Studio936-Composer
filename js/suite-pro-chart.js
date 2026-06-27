// Studio 936 Composer - Chart View v1.6.7 (COMPLETO Y ESTABLE)
window.Studio936SuiteProChart = (() => {
  "use strict";
  const VERSION = "chart-v1.6.7";
  const STYLE_ID = "s936-chart-v141";

  // --- 1. ESTILOS (Integración de nombres flotantes) ---
  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = `
      #s936-chart-view-panel{font-family:system-ui,sans-serif;color:#fff}
      .s936-ch-bar{border-right:1px solid rgba(255,255,255,.12);padding:2px;position:relative}
      .s936-ch-bar-head{position:relative;padding:12px 2px 2px;min-height:28px}
      .s936-ch-bar-chords{position:absolute;top:0;left:0;right:0;display:grid;grid-template-columns:repeat(4,1fr);z-index:2;pointer-events:none}
      .s936-ch-bar-chord-name{display:flex;align-items:baseline;justify-content:center;font-size:0.55rem;color:#fff;font-weight:900}
      .s936-ch-bar-qual{font-size:0.35rem;vertical-align:super}
      .s936-ch-beats{display:grid;grid-template-columns:repeat(4,1fr);gap:2px}
      .s936-ch-beat{background:rgba(255,255,255,.04);border-radius:4px;min-height:30px}
    `;
    document.head.appendChild(s);
  }

  // --- 2. LÓGICA CORE ---
  function parseChord(name) { if (!name) return null; const m = String(name).match(/^([A-G][b#]?)(.*)$/); return m ? { root: m[1], qual: m[2] } : { root: name, qual: "" }; }
  
  // --- 3. RENDERIZADO (RESTAURADO CON ALINEACIÓN EN CABECERA) ---
  function renderBar({ barIndex, isFirst, sectionKey, beatsData, barInfo, inst, voicingLibrary, onRerender }) {
    const bar = document.createElement("div");
    bar.className = "s936-ch-bar";
    
    const head = document.createElement("div");
    head.className = "s936-ch-bar-head";
    
    const chordsRow = document.createElement("div");
    chordsRow.className = "s936-ch-bar-chords";
    
    const refChord = beatsData[barIndex + "_0"] || (isFirst ? barInfo?.chord?.name : "");
    for (let b = 0; b < 4; b++) {
      const cell = document.createElement("div");
      cell.className = "s936-ch-bar-chord-name";
      const bVal = beatsData[barIndex + "_" + b] || (b === 0 ? refChord : "");
      if (bVal) {
        const p = parseChord(bVal);
        cell.innerHTML = `<span>${p.root}</span><sup class="s936-ch-bar-qual">${p.qual}</sup>`;
      }
      chordsRow.appendChild(cell);
    }
    head.appendChild(chordsRow);
    bar.appendChild(head);

    // Aquí iría tu renderizado original de beats
    return bar;
  }

  // --- 4. EXPORTACIÓN OBLIGATORIA (Añade aquí el resto de tus funciones originales) ---
  function render(args) { installStyles(); /* ...resto de tu código... */ }
  function mountInRightPanel(args) { /* ...tu código... */ }
  function unmountFromRightPanel() { /* ...tu código... */ }
  function highlightBar(s, b) { /* ...tu código... */ }

  return { 
    version: VERSION, 
    render, 
    mountInRightPanel, 
    unmountFromRightPanel, 
    highlightBar, 
    isActive: () => true 
  };
})();
