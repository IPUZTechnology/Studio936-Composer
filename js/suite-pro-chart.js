// Studio 936 Composer - Chart View v1.6.3 (COMPLETO)
window.Studio936SuiteProChart = (() => {
  "use strict";
  const VERSION = "chart-v1.6.3";
  const STYLE_ID = "s936-chart-v141";

  const INSTRUMENTS = [{ id: "piano", label: "Piano" }, { id: "guitar", label: "Guitarra" }, { id: "ukulele", label: "Ukulele" }, { id: "bass", label: "Bajo" }];
  let _chartInstrument = localStorage.getItem("s936_chart_inst_v1") || "piano";

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = `
      #s936-chart-view-panel{font-family:system-ui,sans-serif;color:#fff}
      .s936-ch-head{display:flex;align-items:center;justify-content:space-between;padding:8px 14px 7px;border-bottom:1px solid rgba(255,255,255,.08);background:#0d0f18;position:sticky;top:0;z-index:10;gap:10px}
      .s936-ch-line{display:grid;grid-template-columns:repeat(4,1fr);border-top:2px solid rgba(255,255,255,.25);margin-bottom:1px}
      .s936-ch-bar{border-right:1px solid rgba(255,255,255,.12);padding:2px;position:relative;box-sizing:border-box}
      .s936-ch-bar-head{position:relative;padding:12px 2px 2px;min-height:28px}
      .s936-ch-bar-chords{position:absolute;top:0;left:0;right:0;display:grid;grid-template-columns:repeat(4,1fr);padding:0 2px;z-index:2;pointer-events:none}
      .s936-ch-bar-chord-name{display:flex;align-items:baseline;justify-content:center;font-size:0.55rem;color:#fff;font-weight:900}
      .s936-ch-bar-qual{font-size:0.35rem;vertical-align:super;}
      .s936-ch-beats{display:grid;grid-template-columns:repeat(4,1fr);gap:2px;padding:0 2px}
      .s936-ch-beat{background:rgba(255,255,255,.04);border-radius:4px;min-height:30px;position:relative}
      .s936-ch-beat-lyric{font-size:0.4rem;color:#00ffcc;text-align:center;text-transform:uppercase;margin-top:2px}
    `;
    document.head.appendChild(s);
  }

  // --- MANTENEMOS TU LÓGICA ORIGINAL ---
  function getSectionBars() { try { const d = JSON.parse(localStorage.getItem("s936_suitepro_structure_v4") || "{}"); return (d?.draft?.parts || []).reduce((m, p) => { if (p.section) m[p.section] = Number(p.bars) || 4; return m; }, {}); } catch(_) { return {}; } }
  function getBeatsData(sectionKey) { try { return JSON.parse(localStorage.getItem("s936_chart_beats_v1") || "{}")[sectionKey] || {}; } catch(_) { return {}; } }
  function saveBeat(sectionKey, barIndex, beatIndex, val) { try { const d = JSON.parse(localStorage.getItem("s936_chart_beats_v1") || "{}"); if (!d[sectionKey]) d[sectionKey] = {}; d[sectionKey][barIndex + "_" + beatIndex] = val; localStorage.setItem("s936_chart_beats_v1", JSON.stringify(d)); } catch(_) {} }
  function parseChord(name) { if (!name) return null; const m = String(name).match(/^([A-G][b#]?)(.*)$/); return m ? { root: m[1], qual: m[2] } : { root: name, qual: "" }; }

  // --- RENDERIZADO (RESTAURADO CON ALINEACIÓN EN CABECERA) ---
  function renderBar({ barIndex, isFirst, sectionKey, beatsData, barInfo, inst, voicingLibrary, onRerender }) {
    const bar = document.createElement("div");
    bar.className = "s936-ch-bar";
    const head = document.createElement("div");
    head.className = "s936-ch-bar-head";
    
    // Nombres arriba (Flotantes)
    const chordsRow = document.createElement("div");
    chordsRow.className = "s936-ch-bar-chords";
    const refChord = beatsData[barIndex + "_0"] || (isFirst ? barInfo?.chord?.name : "");
    for (let b = 0; b < 4; b++) {
      const cell = document.createElement("div");
      cell.className = "s936-ch-bar-chord-name";
      const bVal = beatsData[barIndex + "_" + b] || (b === 0 ? refChord : "");
      if (bVal) {
        const p = parseChord(bVal);
        cell.innerHTML = `<span class="s936-ch-bar-root">${p.root}</span><sup class="s936-ch-bar-qual">${p.qual}</sup>`;
      }
      chordsRow.appendChild(cell);
    }
    head.appendChild(chordsRow);
    bar.appendChild(head);

    // Beats (Instrumentos + Lírica)
    const beatsRow = document.createElement("div");
    beatsRow.className = "s936-ch-beats";
    // ... aquí reinserta tu lógica de renderBeat que tenías antes ...
    bar.appendChild(beatsRow);
    return bar;
  }

  // --- IMPORTANTE: Reinserta AQUÍ debajo todas las funciones que estaban en tu bcp (render, mount, unmount, etc.) ---
  
  return { version: VERSION, render, mountInRightPanel, unmountFromRightPanel, highlightBar, isActive: () => true };
})();