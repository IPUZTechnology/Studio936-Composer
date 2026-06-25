// Studio 936 Composer - Chart View v1.2.0
// Lead sheet iReal Book — panel derecho completo
window.Studio936SuiteProChart = (() => {
  "use strict";
  const VERSION = "chart-v1.2.0";
  const STYLE_ID = "s936-chart-v12";

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = `
#s936ChartContainer{position:absolute;inset:0;z-index:5;background:#090b11;overflow-y:auto;font-family:system-ui,sans-serif}
.s936-ch-head{display:flex;align-items:center;justify-content:space-between;padding:10px 16px 8px;border-bottom:1px solid rgba(255,255,255,.08);background:#0d0f18;position:sticky;top:0;z-index:10}
.s936-ch-title{font-size:.75rem;font-weight:900;color:#00ffcc;text-transform:uppercase;letter-spacing:1px}
.s936-ch-meta{font-size:.54rem;color:rgba(255,255,255,.38);margin-top:1px}
.s936-ch-inst{font-size:.5rem;background:rgba(255,91,234,.12);border:1px solid rgba(255,91,234,.3);border-radius:10px;color:#ff5bea;padding:2px 10px;text-transform:uppercase;font-weight:700;letter-spacing:.4px;cursor:pointer}
.s936-ch-body{padding:12px 14px 32px}
/* Sección */
.s936-ch-sec{margin-bottom:22px}
.s936-ch-sec-hd{display:flex;align-items:center;gap:8px;margin-bottom:5px}
.s936-ch-sec-badge{background:rgba(255,224,102,.12);border:1px solid rgba(255,224,102,.35);border-radius:4px;color:#ffe066;font-size:.52rem;font-weight:900;padding:2px 9px;text-transform:uppercase;letter-spacing:.7px}
.s936-ch-sec-info{color:rgba(255,255,255,.28);font-size:.48rem}
/* Línea de 4 compases */
.s936-ch-line{display:grid;grid-template-columns:repeat(4,1fr);border-top:2px solid rgba(255,255,255,.25)}
/* Compás */
.s936-ch-bar{border-right:1px solid rgba(255,255,255,.15);padding:7px 8px 6px;cursor:pointer;position:relative;min-height:72px;transition:background .1s;box-sizing:border-box}
.s936-ch-bar:last-child{border-right:2px solid rgba(255,255,255,.35)}
.s936-ch-bar:hover{background:rgba(0,255,204,.05)}
.s936-ch-bar.s936-cb-hit{background:rgba(0,255,204,.1)}
.s936-ch-bar.s936-cb-open::before{content:"";position:absolute;left:0;top:4px;bottom:4px;width:4px;background:#ffe066;border-radius:0 2px 2px 0}
.s936-ch-bar.s936-cb-open::after{content:"";position:absolute;left:6px;top:4px;bottom:4px;width:1px;background:rgba(255,224,102,.4)}
/* Número */
.s936-ch-num{font-size:.42rem;color:rgba(255,255,255,.2);font-weight:700;position:absolute;top:3px;left:6px}
/* Nombre del acorde */
.s936-ch-root{font-size:1.05rem;font-weight:900;color:#fff;line-height:1;margin-top:6px}
.s936-ch-qual{font-size:.58rem;font-weight:700;color:rgba(255,255,255,.65);vertical-align:super;margin-left:1px}
.s936-ch-bass{font-size:.5rem;color:#ff5bea;font-weight:700;margin-top:1px}
.s936-ch-dur{font-size:.42rem;color:rgba(255,255,255,.28);margin-top:2px}
/* Slash */
.s936-ch-slash{display:flex;align-items:flex-end;justify-content:flex-start;padding:8px 6px 6px;color:rgba(255,255,255,.2);font-size:.85rem;font-weight:300;letter-spacing:2px;min-height:72px}
/* Diagrama mini de instrumento */
.s936-ch-diag{margin-top:4px}
.s936-ch-piano-mini{display:flex;gap:0;height:22px;border:1px solid rgba(255,255,255,.2);border-radius:2px;overflow:hidden}
.s936-ch-pkey{flex:1;border-right:1px solid rgba(255,255,255,.15);position:relative}
.s936-ch-pkey.white{background:rgba(255,255,255,.1)}
.s936-ch-pkey.black{background:rgba(0,0,0,.7);flex:0 0 6px;margin:0 -3px;z-index:1;height:13px;border-radius:0 0 2px 2px}
.s936-ch-pkey.hit{background:#00ffcc!important;box-shadow:0 0 4px rgba(0,255,204,.6)}
/* Double bar final */
.s936-ch-dblbar{height:3px;background:linear-gradient(to right,rgba(255,255,255,.2) 0,rgba(255,255,255,.2) calc(100% - 4px),rgba(255,255,255,.5) calc(100% - 4px),rgba(255,255,255,.5) 100%);margin-bottom:0}
/* Edit popup */
.s936-ch-pop{position:absolute;top:0;left:0;right:0;background:#131726;border:1px solid rgba(0,255,204,.5);border-radius:8px;z-index:30;padding:8px;box-shadow:0 8px 28px rgba(0,0,0,.7)}
.s936-ch-pop input{width:100%;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);border-radius:6px;color:#fff;font-size:.75rem;font-weight:700;padding:5px 8px;outline:none;box-sizing:border-box}
.s936-ch-pop input:focus{border-color:#00ffcc}
.s936-ch-pop-acts{display:flex;gap:4px;margin-top:6px}
.s936-ch-pop-btn{flex:1;border-radius:6px;font-size:.52rem;font-weight:700;padding:5px;cursor:pointer;text-transform:uppercase;border:1px solid}
.s936-ch-pop-btn.ok{background:rgba(0,255,204,.15);border-color:rgba(0,255,204,.4);color:#bfffee}
.s936-ch-pop-btn.cancel{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.15);color:rgba(255,255,255,.45)}
    `;
    document.head.appendChild(s);
  }

  // Leer compases por sección desde el draft de estructura
  function getSectionBars() {
    try {
      const d = JSON.parse(localStorage.getItem('s936_suitepro_structure_v4') || '{}');
      const parts = d?.draft?.parts || [];
      const map = {};
      parts.forEach(p => { if (p.section) map[p.section] = Number(p.bars) || 4; });
      return map;
    } catch(_) { return {}; }
  }

  function parseChord(name) {
    if (!name) return { root: "—", qual: "" };
    const m = name.match(/^([A-G][b#]?)(.*)$/);
    return m ? { root: m[1], qual: m[2] || "" } : { root: name, qual: "" };
  }

  // Mini piano diagram
  function miniPiano(notes) {
    const wrap = document.createElement("div");
    wrap.className = "s936-ch-piano-mini";
    const noteNames = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
    const blacks = new Set([1,3,6,8,10]);
    const hitSet = new Set((notes || "").split(" ").map(n => n.replace(/\d/,"")));
    // Show one octave C3-B3
    noteNames.forEach((n, i) => {
      const k = document.createElement("div");
      k.className = "s936-ch-pkey " + (blacks.has(i) ? "black" : "white") + (hitSet.has(n) ? " hit" : "");
      wrap.appendChild(k);
    });
    return wrap;
  }

  // Leer beats guardados por sección/compás
  function getBeatsData(sectionKey) {
    try {
      const d = JSON.parse(localStorage.getItem('s936_chart_beats_v1') || '{}');
      return d[sectionKey] || {};
    } catch(_) { return {}; }
  }

  function saveBeatsData(sectionKey, barIndex, beatIndex, value) {
    try {
      const d = JSON.parse(localStorage.getItem('s936_chart_beats_v1') || '{}');
      if (!d[sectionKey]) d[sectionKey] = {};
      const key = barIndex + "_" + beatIndex;
      if (value) d[sectionKey][key] = value;
      else delete d[sectionKey][key];
      localStorage.setItem('s936_chart_beats_v1', JSON.stringify(d));
    } catch(_) {}
  }

  // Pre-poblar beats desde acordes del Editor si no hay datos guardados
  function prepopulateFromEditor(sectionKey, chords) {
    try {
      const d = JSON.parse(localStorage.getItem('s936_chart_beats_v1') || '{}');
      // Solo pre-poblar si la sección no tiene beats guardados
      if (d[sectionKey] && Object.keys(d[sectionKey]).length > 0) return;
      if (!Array.isArray(chords) || !chords.length) return;
      if (!d[sectionKey]) d[sectionKey] = {};
      let barIndex = 0;
      chords.forEach(chord => {
        const bars = Math.max(1, Number(chord.bars) || 1);
        // Poner el acorde en el tiempo 1 del primer compás
        d[sectionKey][barIndex + "_0"] = chord.name || "";
        barIndex += bars;
      });
      localStorage.setItem('s936_chart_beats_v1', JSON.stringify(d));
    } catch(_) {}
  }

  // Construir compases desde totalBars definido en estructura
  function buildMeasures(totalBars) {
    const measures = [];
    for (let i = 0; i < totalBars; i++) {
      measures.push({ barNum: i + 1, barIndex: i });
    }
    return measures;
  }

  function closePopups() {
    document.querySelectorAll(".s936-ch-pop").forEach(p => p.remove());
  }

  function showBeatEditor(beatEl, sectionKey, barIndex, beatIndex, currentVal, onSave) {
    closePopups();
    const pop = document.createElement("div");
    pop.className = "s936-ch-pop";
    pop.style.cssText = "position:absolute;top:0;left:0;right:0;background:#131726;border:1px solid rgba(0,255,204,.5);border-radius:6px;z-index:30;padding:6px;box-shadow:0 8px 24px rgba(0,0,0,.8);min-width:80px";

    const label = document.createElement("div");
    label.style.cssText = "font-size:.44rem;color:rgba(255,255,255,.4);margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px";
    label.textContent = "Tiempo " + (beatIndex + 1);
    pop.appendChild(label);

    const inp = document.createElement("input");
    inp.className = "s936-ch-pop-inp";
    inp.style.cssText = "width:100%;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);border-radius:4px;color:#fff;font-size:.72rem;font-weight:700;padding:4px 6px;outline:none;box-sizing:border-box";
    inp.value = currentVal || "";
    inp.placeholder = "Ej: Cm7";
    inp.setAttribute("autocomplete","off");
    pop.appendChild(inp);

    const acts = document.createElement("div");
    acts.style.cssText = "display:flex;gap:3px;margin-top:5px";

    const ok = document.createElement("button");
    ok.style.cssText = "flex:1;background:rgba(0,255,204,.15);border:1px solid rgba(0,255,204,.35);border-radius:4px;color:#bfffee;font-size:.48rem;font-weight:700;padding:4px;cursor:pointer";
    ok.textContent = "OK";

    const del = document.createElement("button");
    del.style.cssText = "flex:0 0 auto;background:rgba(255,80,80,.1);border:1px solid rgba(255,80,80,.3);border-radius:4px;color:#ff8080;font-size:.48rem;font-weight:700;padding:4px 6px;cursor:pointer";
    del.textContent = "×";

    acts.append(ok, del);
    pop.appendChild(acts);

    ok.onclick = () => { const v = inp.value.trim(); onSave(v); closePopups(); };
    del.onclick = () => { onSave(""); closePopups(); };
    inp.onkeydown = e => { if (e.key === "Enter") ok.onclick(); if (e.key === "Escape") closePopups(); };

    beatEl.style.position = "relative";
    beatEl.appendChild(pop);
    setTimeout(() => { inp.focus(); inp.select(); }, 0);
  }

  function render({ container, instrument, onChordEdit } = {}) {
    if (!container) return;
    installStyles();
    container.innerHTML = "";

    const bridge = window.Studio936AppBridge;
    if (!bridge) return;
    const arrangement = bridge.getArrangement?.() || [];
    const edState = bridge.getEditorState?.() || {};
    const sections = edState.sections || {};
    const inst = instrument || edState.instrument || "piano";

    if (!arrangement.length) {
      const p = document.createElement("p");
      p.style.cssText = "color:rgba(255,255,255,.3);padding:32px;text-align:center;font-size:.7rem";
      p.textContent = "Sin arreglo — crea partes en Estructura y aplica.";
      container.appendChild(p);
      return;
    }

    // Header
    const head = document.createElement("div");
    head.className = "s936-ch-head";
    const info = document.createElement("div");
    const title = document.createElement("div");
    title.className = "s936-ch-title";
    title.textContent = edState.title || "Canción";
    const meta = document.createElement("div");
    meta.className = "s936-ch-meta";
    const totalBars = arrangement.reduce((acc, item) => {
      const ch = sections[item.section] || [];
      return acc + ch.reduce((s, c) => s + (Number(c.bars) || 1), 0);
    }, 0);
    meta.textContent = (edState.style || "") + (edState.bpm ? " · " + edState.bpm + " BPM" : "") + " · " + totalBars + " comp. totales";
    info.append(title, meta);
    const instBadge = document.createElement("span");
    instBadge.className = "s936-ch-inst";
    instBadge.textContent = inst.toUpperCase();
    head.append(info, instBadge);
    container.appendChild(head);

    // Body
    const body = document.createElement("div");
    body.className = "s936-ch-body";

    const sectionBars = getSectionBars();

    arrangement.forEach(item => {
      const chords = sections[item.section];
      const totalMeasures = sectionBars[item.section] || (Array.isArray(chords) ? chords.reduce((s,c)=>s+(Number(c.bars)||1),0) : 4);
      // Pre-poblar desde Editor si no hay beats guardados
      prepopulateFromEditor(item.section, chords);
      const beatsData = getBeatsData(item.section);
      const measures = buildMeasures(totalMeasures);

      const sec = document.createElement("div");
      sec.className = "s936-ch-sec";

      // Header de sección
      const hd = document.createElement("div");
      hd.className = "s936-ch-sec-hd";
      const badge = document.createElement("span");
      badge.className = "s936-ch-sec-badge";
      badge.textContent = item.label || item.section;
      const sinfo = document.createElement("span");
      sinfo.className = "s936-ch-sec-info";
      sinfo.textContent = chords.length + " acordes · " + totalMeasures + " comp.";
      // Mostrar si hay compases definidos vs usados
      if (sectionBars[item.section] && sectionBars[item.section] !== measures.length - (totalMeasures - measures.length)) {
        // ya está correcto
      }
      hd.append(badge, sinfo);
      sec.appendChild(hd);

      // Filas de 4 compases, cada compás con 4 beats
      const COLS = 4;
      for (let i = 0; i < measures.length; i += COLS) {
        const line = document.createElement("div");
        line.className = "s936-ch-line";

        for (let j = 0; j < COLS; j++) {
          const m = measures[i + j];
          if (!m) {
            const empty = document.createElement("div");
            empty.style.cssText = "border-right:1px solid rgba(255,255,255,.1);min-height:88px";
            line.appendChild(empty);
            continue;
          }

          const bar = document.createElement("div");
          bar.className = "s936-ch-bar" + (i + j === 0 ? " s936-cb-open" : "");
          bar.style.padding = "4px 4px 4px";

          // Número de compás
          const num = document.createElement("span");
          num.className = "s936-ch-num";
          num.textContent = m.barNum;
          bar.appendChild(num);

          // 4 subceldas de beats
          const beatsRow = document.createElement("div");
          beatsRow.style.cssText = "display:grid;grid-template-columns:repeat(4,1fr);gap:2px;margin-top:14px";

          for (let b = 0; b < 4; b++) {
            const beatKey = m.barIndex + "_" + b;
            const beatVal = beatsData[beatKey] || "";
            const beat = document.createElement("div");
            beat.style.cssText = "background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:3px;min-height:44px;cursor:pointer;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2px;transition:background .1s";
            beat.title = "Tiempo " + (b+1);

            if (beatVal) {
              const parsed = parseChord(beatVal);
              const rEl = document.createElement("div");
              rEl.style.cssText = "font-size:.62rem;font-weight:900;color:#fff;line-height:1;text-align:center";
              rEl.textContent = parsed.root;
              const qEl = document.createElement("div");
              qEl.style.cssText = "font-size:.42rem;color:rgba(255,255,255,.6);text-align:center";
              qEl.textContent = parsed.qual;
              beat.append(rEl, qEl);
              beat.style.background = "rgba(0,255,204,.08)";
              beat.style.borderColor = "rgba(0,255,204,.25)";
            } else {
              const plus = document.createElement("span");
              plus.textContent = "+";
              plus.style.cssText = "font-size:.7rem;color:rgba(255,255,255,.15)";
              beat.appendChild(plus);
            }

            beat.addEventListener("click", (e) => {
              e.stopPropagation();
              showBeatEditor(beat, item.section, m.barIndex, b, beatVal, (val) => {
                saveBeatsData(item.section, m.barIndex, b, val);
                render({ container, instrument, onChordEdit });
              });
            });

            beatsRow.appendChild(beat);
          }
          bar.appendChild(beatsRow);
          line.appendChild(bar);
        }
        sec.appendChild(line);
      }

      // Doble barra al final
      const dbl = document.createElement("div");
      dbl.className = "s936-ch-dblbar";
      sec.appendChild(dbl);
      body.appendChild(sec);
    });

    container.appendChild(body);

    // Cerrar popups al click fuera
    container.addEventListener("click", closePopups);
    return { ok: true, version: VERSION };
  }

  let _savedFretDisplay = null;
  let _savedPianoDisplay = null;
  let _chartActive = false; // true solo cuando montado intencionalmente desde Estructura

  function mountInRightPanel({ onChordEdit } = {}) {
    // v1.2.4: montar dentro de fretboardContainer con position:absolute
    // Usar ID único que no sea tocado por el CSS del app
    const fretContainer = document.getElementById("fretboardContainer");
    const pianoContainer = document.getElementById("pianoContainer");
    if (!fretContainer) return { ok: false };

    // Guardar y ocultar instrumentos
    _savedFretDisplay = fretContainer.style.display;
    _savedPianoDisplay = pianoContainer ? pianoContainer.style.display : null;
    if (pianoContainer) pianoContainer.style.display = "none";

    // Asegurar que fretboard sea visible y relative
    fretContainer.style.display = "block";
    fretContainer.style.position = "relative";
    fretContainer.style.overflow = "hidden";

    // Limpiar y crear chart con ID que el app no conoce
    const old = document.getElementById("s936-chart-view-panel");
    if (old) old.remove();
    const chartEl = document.createElement("div");
    chartEl.id = "s936-chart-view-panel";
    chartEl.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;overflow-y:auto;background:#090b11;z-index:10";
    fretContainer.appendChild(chartEl);

    const edState = window.Studio936AppBridge?.getEditorState?.() || {};
    render({ container: chartEl, instrument: edState.instrument, onChordEdit });
    _chartActive = true;
    return { ok: true };
  }

  function unmountFromRightPanel() {
    _chartActive = false;
    const chartEl = document.getElementById("s936-chart-view-panel");
    if (chartEl) chartEl.remove();
    // También limpiar el ID viejo si existe
    const oldChart = document.getElementById("s936ChartContainer");
    if (oldChart) oldChart.remove();
    const fretContainer = document.getElementById("fretboardContainer");
    const pianoContainer = document.getElementById("pianoContainer");
    if (fretContainer && _savedFretDisplay !== null) {
      fretContainer.style.display = _savedFretDisplay;
      fretContainer.style.position = "";
      fretContainer.style.overflow = "";
      _savedFretDisplay = null;
    }
    if (pianoContainer && _savedPianoDisplay !== null) {
      pianoContainer.style.display = _savedPianoDisplay;
      _savedPianoDisplay = null;
    }
  }

  return { version: VERSION, render, mountInRightPanel, unmountFromRightPanel, isActive: () => _chartActive };
})();