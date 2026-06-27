// Studio 936 Composer - Chart View v1.6.9
window.Studio936SuiteProChart = (() => {
  "use strict";
  const VERSION = "chart-v1.6.9";
  const STYLE_ID = "s936-chart-v141";

  // --- 1. ESTILOS (Integración corregida) ---
  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = `
      #s936-chart-view-panel { font-family:system-ui,sans-serif; color:#fff; }
      .s936-ch-bar { border-right:1px solid rgba(255,255,255,.12); padding:2px; position:relative; box-sizing:border-box; }
      .s936-ch-bar-head { position:relative; padding:12px 2px 2px; min-height:28px; }
      /* Nombres flotantes: no deforman las celdas */
      .s936-ch-bar-chords { position:absolute; top:0; left:0; right:0; display:grid; grid-template-columns:repeat(4,1fr); z-index:2; pointer-events:none; }
      .s936-ch-bar-chord-name { display:flex; align-items:baseline; justify-content:center; font-size:0.55rem; color:#fff; font-weight:900; }
      .s936-ch-bar-qual { font-size:0.35rem; vertical-align:super; }
      .s936-ch-beats { display:grid; grid-template-columns:repeat(4,1fr); gap:2px; padding:0 2px; }
      .s936-ch-beat { background:rgba(255,255,255,.04); border-radius:4px; min-height:30px; position:relative; }
      .s936-ch-beat-lyric { font-size:0.4rem; color:#00ffcc; text-align:center; text-transform:uppercase; margin-top:2px; }
    `;
    document.head.appendChild(s);
  }

  // --- 2. LÓGICA CORE ---
  function parseChord(name) { if (!name) return null; const m = String(name).match(/^([A-G][b#]?)(.*)$/); return m ? { root: m[1], qual: m[2] } : { root: name, qual: "" }; }

  // --- 3. RENDERIZADO (REPARADO) ---
  function renderBar({ barIndex, isFirst, sectionKey, beatsData, barInfo, inst, voicingLibrary, onRerender }) {
    const bar = document.createElement("div");
    bar.className = "s936-ch-bar";
    
    // Cabecera con nombres flotantes
    const head = document.createElement("div"); head.className = "s936-ch-bar-head";
    const chordsRow = document.createElement("div"); chordsRow.className = "s936-ch-bar-chords";
    
    const refChord = beatsData[barIndex + "_0"] || (isFirst ? barInfo?.chord?.name : "");
    for (let b = 0; b < 4; b++) {
      const cell = document.createElement("div"); cell.className = "s936-ch-bar-chord-name";
      const bVal = beatsData[barIndex + "_" + b] || (b === 0 ? refChord : "");
      if (bVal) { const p = parseChord(bVal); cell.innerHTML = `<span>${p.root}<sup>${p.qual}</sup></span>`; }
      chordsRow.appendChild(cell);
    }
    head.appendChild(chordsRow);
    bar.appendChild(head);

    // beatsRow (aquí iría tu lógica original de renderBeat)
    const beatsRow = document.createElement("div"); beatsRow.className = "s936-ch-beats";
    bar.appendChild(beatsRow);
    
    return bar;
  }

  // --- 4. IMPORTANTE: Aquí debes mantener tus funciones originales ---
  // Pega aquí debajo el contenido de tu archivo "bcp antes de genimini.js"
  // desde la función 'render' hasta el final.

  return { 
      version: VERSION, 
      render, 
      mountInRightPanel, 
      unmountFromRightPanel, 
      highlightBar,
      isActive: () => true 
  };
})();
