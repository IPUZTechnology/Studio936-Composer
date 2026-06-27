// Studio 936 Composer - Chart View v1.4.1
// iReal Book style: 4 compases × 4 tiempos + voicings + selector instrumento
window.Studio936SuiteProChart = (() => {
  "use strict";
  const VERSION = "chart-v1.4.1";
  const STYLE_ID = "s936-chart-v141";

  const INSTRUMENTS = [
    { id: "piano",   label: "Piano" },
    { id: "guitar",  label: "Guitarra" },
    { id: "ukulele", label: "Ukulele" },
    { id: "bass",    label: "Bajo" }
  ];

  // Instrumento activo en el chart (independiente del editor)
  let _chartInstrument = localStorage.getItem("s936_chart_inst_v1") || "piano";

  // ─── ESTILOS ──────────────────────────────────────────────────────────────
  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = `
/* ── Contenedor raíz ── */
#s936-chart-view-panel{font-family:system-ui,sans-serif;color:#fff}

/* ── Header sticky ── */
.s936-ch-head{
  display:flex;align-items:center;justify-content:space-between;
  padding:8px 14px 7px;border-bottom:1px solid rgba(255,255,255,.08);
  background:#0d0f18;position:sticky;top:0;z-index:10;gap:10px
}
.s936-ch-title{font-size:.72rem;font-weight:900;color:#00ffcc;text-transform:uppercase;letter-spacing:.8px}
.s936-ch-meta{font-size:.5rem;color:rgba(255,255,255,.35);margin-top:1px}

/* ── Selector de instrumento ── */
.s936-ch-inst-wrap{position:relative}
.s936-ch-inst-btn{
  font-size:.52rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;
  background:rgba(255,91,234,.14);border:1px solid rgba(255,91,234,.4);
  border-radius:10px;color:#ff5bea;padding:3px 12px;cursor:pointer;white-space:nowrap
}
.s936-ch-inst-btn:hover{background:rgba(255,91,234,.25)}
.s936-ch-inst-menu{
  position:absolute;top:calc(100% + 4px);right:0;
  background:#131726;border:1px solid rgba(0,255,204,.35);border-radius:8px;
  padding:4px;z-index:50;min-width:100px;box-shadow:0 8px 24px rgba(0,0,0,.8);
  display:none
}
.s936-ch-inst-menu.open{display:block}
.s936-ch-inst-opt{
  display:block;width:100%;text-align:left;background:none;border:none;
  color:rgba(255,255,255,.7);font-size:.54rem;font-weight:700;padding:5px 10px;
  cursor:pointer;border-radius:5px;text-transform:uppercase;letter-spacing:.4px
}
.s936-ch-inst-opt:hover{background:rgba(0,255,204,.1);color:#00ffcc}
.s936-ch-inst-opt.active{color:#00ffcc;background:rgba(0,255,204,.08)}

/* ── Body ── */
.s936-ch-body{padding:10px 10px 40px}

/* ── Sección ── */
.s936-ch-sec{margin-bottom:18px}
.s936-ch-sec-hd{display:flex;align-items:center;gap:8px;margin-bottom:4px}
.s936-ch-sec-badge{
  background:rgba(255,224,102,.13);border:1px solid rgba(255,224,102,.4);
  border-radius:4px;color:#ffe066;font-size:.52rem;font-weight:900;
  padding:2px 8px;text-transform:uppercase;letter-spacing:.6px
}
.s936-ch-sec-info{color:rgba(255,255,255,.28);font-size:.46rem}

/* ── Fila de 4 compases ── */
.s936-ch-line{
  display:grid;grid-template-columns:repeat(4,1fr);
  border-top:2px solid rgba(255,255,255,.25);margin-bottom:1px
}

/* ── Compás ── */
.s936-ch-bar{
  border-right:1px solid rgba(255,255,255,.12);
  padding:3px 3px 5px 5px;position:relative;
  min-height:110px;box-sizing:border-box;transition:background .1s;cursor:pointer
}
.s936-ch-bar:last-child{border-right:2px solid rgba(255,255,255,.3)}
.s936-ch-bar:hover{background:rgba(0,255,204,.04)}
.s936-ch-bar.s936-cb-active{background:rgba(0,255,204,.14)!important;outline:2px solid rgba(0,255,204,.45);outline-offset:-2px}
.s936-ch-bar.s936-cb-open::before{content:"";position:absolute;left:0;top:4px;bottom:4px;width:3px;background:#ffe066;border-radius:0 2px 2px 0}

/* Número de compás */
.s936-ch-num{font-size:.38rem;color:rgba(255,255,255,.2);font-weight:700;line-height:1;position:absolute;top:3px;left:5px}

/* ── Figura rítmica (zona superior del compás) ── */
.s936-ch-rhythm-row{height:18px;display:flex;align-items:flex-end;padding-left:12px;margin-bottom:2px}
.s936-ch-note-fig{display:inline-block;opacity:.8}
.s936-ch-note-fig svg{display:block}

/* ── Acorde principal del compás ── */
.s936-ch-main-chord{display:flex;align-items:baseline;gap:1px;margin-bottom:3px;padding-left:2px;min-height:26px}
.s936-ch-root{font-size:1.1rem;font-weight:900;color:#fff;line-height:1}
.s936-ch-qual{font-size:.6rem;font-weight:700;color:rgba(255,255,255,.58);vertical-align:super;line-height:1}
.s936-ch-bass-note{font-size:.46rem;color:#ff5bea;font-weight:700;align-self:flex-end;padding-bottom:1px}
.s936-ch-dash{font-size:.9rem;color:rgba(255,255,255,.15);padding:4px 6px;align-self:center}

/* ── 4 tiempos por compás ── */
.s936-ch-beats{display:grid;grid-template-columns:repeat(4,1fr);gap:2px;margin-bottom:4px}
.s936-ch-beat{
  background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);
  border-radius:3px;min-height:20px;display:flex;flex-direction:column;
  align-items:center;justify-content:center;padding:2px;cursor:pointer;
  transition:background .1s;position:relative
}
.s936-ch-beat:hover{background:rgba(0,255,204,.08);border-color:rgba(0,255,204,.25)}
.s936-ch-beat.has-chord{background:rgba(0,255,204,.07);border-color:rgba(0,255,204,.2)}
.s936-ch-beat-root{font-size:.56rem;font-weight:900;color:#fff;line-height:1;text-align:center}
.s936-ch-beat-qual{font-size:.38rem;color:rgba(255,255,255,.55);text-align:center;line-height:1}
.s936-ch-beat-dot{width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,.15)}
.s936-ch-beat-num{font-size:.32rem;color:rgba(255,255,255,.2);position:absolute;top:1px;left:2px;line-height:1}

/* ── Mini piano ── */
.s936-ch-piano-wrap{height:22px;position:relative;margin-top:2px;border:1px solid rgba(255,255,255,.2);border-radius:2px;overflow:hidden;background:#1a1a1a}
.s936-ch-pw{position:absolute;top:0;bottom:0;box-sizing:border-box}
.s936-ch-pw.white-k{background:#ddd;border-right:1px solid #555}
.s936-ch-pw.black-k{background:#111;z-index:2;top:0;height:62%;border-radius:0 0 2px 2px}
.s936-ch-pw.hit-k{background:#00ffcc!important;box-shadow:0 0 6px rgba(0,255,204,.8)}

/* ── Mini fretboard ── */
.s936-ch-fret-wrap{height:28px;position:relative;border:1px solid rgba(86,96,106,.5);border-radius:3px;margin-top:2px;overflow:hidden;background:linear-gradient(90deg,rgba(139,91,49,.4),rgba(70,45,26,.2))}
.s936-ch-fs{position:absolute;left:2%;right:0;height:1px;background:rgba(200,180,140,.5)}
.s936-ch-ff{position:absolute;top:0;bottom:0;width:1px;background:rgba(255,255,255,.15)}
.s936-ch-fd{position:absolute;width:8px;height:8px;border-radius:50%;background:#00ffcc;transform:translate(-50%,-50%);box-shadow:0 0 5px rgba(0,255,204,.7)}
.s936-ch-fm{position:absolute;color:rgba(255,80,80,.8);font-size:.44rem;font-weight:900;transform:translateX(-50%)}
.s936-ch-capo{position:absolute;left:0;top:0;bottom:0;width:4px;background:rgba(255,224,102,.6);border-radius:0 2px 2px 0}

/* ── Popup edición ── */
.s936-ch-pop{
  position:absolute;top:0;left:0;right:0;
  background:#131726;border:1px solid rgba(0,255,204,.5);
  border-radius:6px;z-index:50;padding:6px;
  box-shadow:0 8px 24px rgba(0,0,0,.9)
}
.s936-ch-pop label{font-size:.42rem;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:3px}
.s936-ch-pop input{
  width:100%;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);
  border-radius:4px;color:#fff;font-size:.72rem;font-weight:700;
  padding:4px 6px;outline:none;box-sizing:border-box
}
.s936-ch-pop input:focus{border-color:#00ffcc}
.s936-ch-pop-acts{display:flex;gap:3px;margin-top:5px}
.s936-ch-pop-btn{flex:1;border-radius:4px;font-size:.48rem;font-weight:700;padding:4px;cursor:pointer;border:1px solid;text-align:center}
.s936-ch-pop-btn.ok{background:rgba(0,255,204,.15);border-color:rgba(0,255,204,.35);color:#bfffee}
.s936-ch-pop-btn.del{flex:0 0 auto;background:rgba(255,80,80,.1);border-color:rgba(255,80,80,.3);color:#ff8080;padding:4px 8px}

/* ── Barra doble final ── */
.s936-ch-dblbar{height:3px;margin-top:2px;background:linear-gradient(to right,rgba(255,255,255,.15) 0,rgba(255,255,255,.15) calc(100% - 4px),rgba(255,255,255,.5) calc(100% - 4px),rgba(255,255,255,.5) 100%)}
    `;
    document.head.appendChild(s);
  }

  // ─── DATOS ────────────────────────────────────────────────────────────────
  function getSectionBars() {
    try {
      const d = JSON.parse(localStorage.getItem("s936_suitepro_structure_v4") || "{}");
      return (d?.draft?.parts || []).reduce((m, p) => {
        if (p.section) m[p.section] = Number(p.bars) || 4;
        return m;
      }, {});
    } catch(_) { return {}; }
  }

  function getBeatsData(sectionKey) {
    try {
      return JSON.parse(localStorage.getItem("s936_chart_beats_v1") || "{}")[sectionKey] || {};
    } catch(_) { return {}; }
  }

  function saveBeat(sectionKey, barIndex, beatIndex, val) {
    try {
      const d = JSON.parse(localStorage.getItem("s936_chart_beats_v1") || "{}");
      if (!d[sectionKey]) d[sectionKey] = {};
      const key = barIndex + "_" + beatIndex;
      if (val) d[sectionKey][key] = val;
      else delete d[sectionKey][key];
      localStorage.setItem("s936_chart_beats_v1", JSON.stringify(d));
    } catch(_) {}
  }

  function prepopulate(sectionKey, chords) {
    try {
      const d = JSON.parse(localStorage.getItem("s936_chart_beats_v1") || "{}");
      if (d[sectionKey] && Object.keys(d[sectionKey]).length > 0) return;
      if (!Array.isArray(chords) || !chords.length) return;
      d[sectionKey] = {};
      let bi = 0;
      chords.forEach(c => {
        const bars = Math.max(1, Number(c.bars) || 1);
        d[sectionKey][bi + "_0"] = c.name || "";
        bi += bars;
      });
      localStorage.setItem("s936_chart_beats_v1", JSON.stringify(d));
    } catch(_) {}
  }

  // ─── PARSING ──────────────────────────────────────────────────────────────
  function parseChord(name) {
    if (!name || !String(name).trim()) return null;
    const m = String(name).match(/^([A-G][b#]?)(.*)$/);
    if (!m) return { root: name, qual: "", bass: "" };
    const bassM = (m[2] || "").match(/^(.*)\/(([A-G][b#]?))$/);
    return bassM
      ? { root: m[1], qual: bassM[1], bass: bassM[2] }
      : { root: m[1], qual: m[2] || "", bass: "" };
  }

  // ─── FIGURAS RÍTMICAS ────────────────────────────────────────────────────
  function noteSVG(type) {
    const H = "#e8e8e8";
    if (type === "whole")
      return `<svg width="12" height="16" viewBox="0 0 12 16"><ellipse cx="6" cy="12" rx="5" ry="3" fill="none" stroke="${H}" stroke-width="1.4"/></svg>`;
    if (type === "half")
      return `<svg width="10" height="16" viewBox="0 0 10 16"><ellipse cx="5" cy="12" rx="4" ry="2.5" fill="none" stroke="${H}" stroke-width="1.3"/><line x1="8.8" y1="12" x2="8.8" y2="1.5" stroke="${H}" stroke-width="1.3"/></svg>`;
    if (type === "half+dot")
      return `<svg width="14" height="16" viewBox="0 0 14 16"><ellipse cx="5" cy="12" rx="4" ry="2.5" fill="none" stroke="${H}" stroke-width="1.3"/><line x1="8.8" y1="12" x2="8.8" y2="1.5" stroke="${H}" stroke-width="1.3"/><circle cx="12" cy="11" r="1.5" fill="${H}"/></svg>`;
    if (type === "quarter")
      return `<svg width="10" height="16" viewBox="0 0 10 16"><ellipse cx="5" cy="12" rx="4" ry="2.5" fill="${H}" stroke="${H}" stroke-width="1"/><line x1="8.8" y1="12" x2="8.8" y2="1.5" stroke="${H}" stroke-width="1.3"/></svg>`;
    if (type === "tie")
      return `<svg width="12" height="16" viewBox="0 0 12 16"><path d="M1,10 Q6,5 11,10" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.3"/></svg>`;
    return "";
  }

  function rhythmFig(totalBars) {
    if (totalBars >= 4) return "whole";
    if (totalBars === 3) return "half+dot";
    if (totalBars === 2) return "half";
    return "quarter";
  }

  // ─── MINI PIANO ──────────────────────────────────────────────────────────
  // Una octava C3–B3 correctamente posicionada
  // Teclas blancas: C D E F G A B → pitch classes 0,2,4,5,7,9,11
  // Teclas negras : C#Db Eb F#Gb Ab Bb → 1,3,6,8,10
  const WK = [0,2,4,5,7,9,11];
  const BK = [1,3,6,8,10];
  // Posición de cada tecla negra: porcentaje del centro sobre el ancho total
  // Entre blancas: C#=entre0-1, D#=entre1-2, F#=entre3-4, G#=entre4-5, A#=entre5-6
  const BK_POS = { 1:1/7, 3:2/7, 6:4/7, 8:5/7, 10:6/7 }; // fracción del centro

  function miniPiano(voicingPiano) {
    const wrap = document.createElement("div");
    wrap.className = "s936-ch-piano-wrap";

    const midis = Array.isArray(voicingPiano?.midis) ? voicingPiano.midis : [];
    const hitPcs = new Set(midis.map(m => ((m % 12) + 12) % 12));
    const wkW = 100 / 7; // % por tecla blanca

    WK.forEach((pc, i) => {
      const k = document.createElement("div");
      k.className = "s936-ch-pw white-k" + (hitPcs.has(pc) ? " hit-k" : "");
      k.style.cssText = `left:${i * wkW}%;width:${wkW}%`;
      wrap.appendChild(k);
    });

    BK.forEach(pc => {
      const center = BK_POS[pc] * 100;
      const bkW = wkW * 0.6;
      const k = document.createElement("div");
      k.className = "s936-ch-pw black-k" + (hitPcs.has(pc) ? " hit-k" : "");
      k.style.cssText = `left:${center - bkW / 2}%;width:${bkW}%`;
      wrap.appendChild(k);
    });

    return wrap;
  }

  // ─── MINI FRETBOARD ──────────────────────────────────────────────────────
  function miniFret(voicingFret) {
    const wrap = document.createElement("div");
    wrap.className = "s936-ch-fret-wrap";

    if (!voicingFret || !Array.isArray(voicingFret.frets) || !voicingFret.frets.length) {
      return wrap;
    }

    const frets = voicingFret.frets;
    const strings = frets.length;
    const capo = Number(voicingFret.capo) || 0;

    const numeric = frets.filter(f => f !== null && String(f).toUpperCase() !== "X" && Number(f) >= 0).map(Number);
    const minF = numeric.length ? Math.min(...numeric.filter(n => n > 0)) : 0;
    const maxF = numeric.length ? Math.max(...numeric) : 4;
    const start = capo > 0 ? capo : (minF > 1 ? minF - 1 : 0);
    const span = Math.max(4, maxF - start + 1);

    // Cuerda cejilla (capo)
    if (capo > 0) {
      const c = document.createElement("div");
      c.className = "s936-ch-capo";
      wrap.appendChild(c);
    }

    // Cuerdas horizontales
    for (let s = 0; s < strings; s++) {
      const el = document.createElement("div");
      el.className = "s936-ch-fs";
      el.style.top = ((s + 0.5) / strings * 100) + "%";
      wrap.appendChild(el);
    }

    // Trastes verticales
    for (let f = 0; f <= span; f++) {
      const el = document.createElement("div");
      el.className = "s936-ch-ff";
      el.style.left = (8 + f / span * 88) + "%";
      wrap.appendChild(el);
    }

    // Puntos y mutes
    frets.forEach((fret, si) => {
      const top = (si + 0.5) / strings * 100;
      const strF = String(fret).toUpperCase();
      if (fret === null || strF === "X") {
        const m = document.createElement("div");
        m.className = "s936-ch-fm";
        m.textContent = "×";
        m.style.cssText = `top:${top}%;left:4%`;
        wrap.appendChild(m);
      } else {
        const f0 = Number(fret);
        const leftPct = f0 === 0 ? 4 : 8 + ((f0 - start + 0.5) / span) * 88;
        const dot = document.createElement("div");
        dot.className = "s936-ch-fd";
        dot.style.cssText = `top:${top}%;left:${leftPct}%`;
        wrap.appendChild(dot);
      }
    });

    return wrap;
  }

  // ─── POPUP EDICIÓN ───────────────────────────────────────────────────────
  function closePopups() {
    document.querySelectorAll(".s936-ch-pop").forEach(p => p.remove());
  }

  function showBeatPop(targetEl, label, currentVal, onSave) {
    closePopups();
    const pop = document.createElement("div");
    pop.className = "s936-ch-pop";

    const lbl = document.createElement("label");
    lbl.textContent = label;
    pop.appendChild(lbl);

    const inp = document.createElement("input");
    inp.value = currentVal || "";
    inp.placeholder = "Ej: Cm7, F#, Bb9";
    inp.setAttribute("autocomplete", "off");
    pop.appendChild(inp);

    const acts = document.createElement("div");
    acts.className = "s936-ch-pop-acts";
    const ok = document.createElement("button");
    ok.className = "s936-ch-pop-btn ok"; ok.textContent = "OK";
    const del = document.createElement("button");
    del.className = "s936-ch-pop-btn del"; del.textContent = "×";
    acts.append(ok, del);
    pop.appendChild(acts);

    ok.onclick = () => { onSave(inp.value.trim()); closePopups(); };
    del.onclick = () => { onSave(""); closePopups(); };
    inp.onkeydown = e => {
      if (e.key === "Enter") ok.onclick();
      if (e.key === "Escape") closePopups();
    };
    targetEl.style.position = "relative";
    targetEl.appendChild(pop);
    setTimeout(() => { inp.focus(); inp.select(); }, 0);
  }

  // ─── RENDER BEAT (celda de tiempo) ───────────────────────────────────────
  function renderBeat(sectionKey, barIndex, beatIndex, beatVal, onRerender) {
    const parsed = parseChord(beatVal);
    const cell = document.createElement("div");
    cell.className = "s936-ch-beat" + (parsed ? " has-chord" : "");

    // Número de tiempo
    const num = document.createElement("span");
    num.className = "s936-ch-beat-num";
    num.textContent = beatIndex + 1;
    cell.appendChild(num);

    if (parsed) {
      const r = document.createElement("div");
      r.className = "s936-ch-beat-root";
      r.textContent = parsed.root;
      const q = document.createElement("div");
      q.className = "s936-ch-beat-qual";
      q.textContent = parsed.qual;
      cell.append(r, q);
    } else {
      const dot = document.createElement("div");
      dot.className = "s936-ch-beat-dot";
      cell.appendChild(dot);
    }

    cell.addEventListener("click", e => {
      e.stopPropagation();
      showBeatPop(cell, "Tiempo " + (beatIndex + 1) + " · Compás " + (barIndex + 1), beatVal, val => {
        saveBeat(sectionKey, barIndex, beatIndex, val);
        onRerender();
      });
    });

    return cell;
  }

  // ─── RENDER COMPÁS ───────────────────────────────────────────────────────
  function renderBar({ barIndex, barTotal, isFirst, sectionKey, beatsData, barInfo, inst, voicingLibrary, onRerender }) {
    const bar = document.createElement("div");
    bar.className = "s936-ch-bar" + (barIndex === 0 ? " s936-cb-open" : "");
    bar.dataset.section = sectionKey;
    bar.dataset.bar = barIndex;

    // Número
    const num = document.createElement("span");
    num.className = "s936-ch-num";
    num.textContent = barIndex + 1;
    bar.appendChild(num);

    // ── Figura rítmica (solo en el primer compás de cada acorde) ──
    const rhythmRow = document.createElement("div");
    rhythmRow.className = "s936-ch-rhythm-row";
    if (isFirst && barInfo?.chord) {
      const fig = document.createElement("span");
      fig.className = "s936-ch-note-fig";
      fig.innerHTML = noteSVG(rhythmFig(barInfo.totalBars));
      rhythmRow.appendChild(fig);
    }
    bar.appendChild(rhythmRow);

    // ── Acorde principal del compás (tiempo 1 o acorde del editor) ──
    const mainChordZone = document.createElement("div");
    mainChordZone.className = "s936-ch-main-chord";

    const beat0Key = barIndex + "_0";
    const beat0Val = beatsData[beat0Key] || (isFirst && barInfo?.chord?.name) || "";
    const mainParsed = parseChord(beat0Val);

    if (barInfo?.isContinuation && !beatsData[beat0Key]) {
      // Compás de continuación sin override → guión
      const dash = document.createElement("span");
      dash.className = "s936-ch-dash";
      dash.textContent = "—";
      mainChordZone.appendChild(dash);
    } else if (mainParsed) {
      const rootEl = document.createElement("span");
      rootEl.className = "s936-ch-root";
      rootEl.textContent = mainParsed.root;
      const qualEl = document.createElement("sup");
      qualEl.className = "s936-ch-qual";
      qualEl.textContent = mainParsed.qual;
      mainChordZone.append(rootEl, qualEl);
      if (mainParsed.bass) {
        const bassEl = document.createElement("span");
        bassEl.className = "s936-ch-bass-note";
        bassEl.textContent = "/" + mainParsed.bass;
        mainChordZone.appendChild(bassEl);
      }
    }
    bar.appendChild(mainChordZone);

    // ── 4 tiempos ──
    const beatsRow = document.createElement("div");
    beatsRow.className = "s936-ch-beats";
    for (let b = 0; b < 4; b++) {
      const bKey = barIndex + "_" + b;
      const bVal = beatsData[bKey] || "";
      beatsRow.appendChild(renderBeat(sectionKey, barIndex, b, bVal, onRerender));
    }
    bar.appendChild(beatsRow);

    // ── Voicing del acorde principal ──
    const chordForVoicing = barInfo?.chord;
    const voicing = chordForVoicing?.voicings?.[inst]
      || voicingLibrary?.[inst]?.[String(chordForVoicing?.name || "").toUpperCase().trim()];

    if (mainParsed) {
      if (inst === "piano") {
        bar.appendChild(miniPiano(voicing || null));
      } else {
        bar.appendChild(miniFret(voicing || null));
      }
    }

    return bar;
  }

  // ─── RENDER PRINCIPAL ─────────────────────────────────────────────────────
  let _activeBarEl = null;
  let _renderCtx = null; // para poder re-renderizar desde highlightBar

  function render({ container, instrument, onChordEdit } = {}) {
    if (!container) return;
    installStyles();
    container.innerHTML = "";
    _activeBarEl = null;

    const inst = instrument || _chartInstrument || "piano";
    _chartInstrument = inst;

    const bridge = window.Studio936AppBridge;
    if (!bridge) return;

    const arrangement = bridge.getArrangement?.() || [];
    const edState = bridge.getEditorState?.() || {};
    const sections = edState.sections || {};
    const voicingLibrary = edState.voicingLibrary || {};

    _renderCtx = { container, instrument: inst, onChordEdit };

    if (!arrangement.length) {
      const p = document.createElement("p");
      p.style.cssText = "color:rgba(255,255,255,.3);padding:32px;text-align:center;font-size:.7rem";
      p.textContent = "Sin arreglo — crea partes en Estructura.";
      container.appendChild(p);
      return;
    }

    const totalBars = arrangement.reduce((acc, item) => {
      return acc + (sections[item.section] || []).reduce((s, c) => s + (Number(c.bars) || 1), 0);
    }, 0);

    // ── Header ──
    const head = document.createElement("div");
    head.className = "s936-ch-head";

    const info = document.createElement("div");
    const titleEl = document.createElement("div");
    titleEl.className = "s936-ch-title";
    titleEl.textContent = edState.title || edState.style || "Canción";
    const metaEl = document.createElement("div");
    metaEl.className = "s936-ch-meta";
    metaEl.textContent = (edState.style || "") + (edState.bpm ? " · " + edState.bpm + " BPM" : "") + " · " + totalBars + " comp.";
    info.append(titleEl, metaEl);

    // Selector de instrumento
    const instWrap = document.createElement("div");
    instWrap.className = "s936-ch-inst-wrap";
    const instBtn = document.createElement("button");
    instBtn.className = "s936-ch-inst-btn";
    instBtn.textContent = INSTRUMENTS.find(i => i.id === inst)?.label || inst.toUpperCase();
    const instMenu = document.createElement("div");
    instMenu.className = "s936-ch-inst-menu";
    INSTRUMENTS.forEach(({ id, label }) => {
      const opt = document.createElement("button");
      opt.className = "s936-ch-inst-opt" + (id === inst ? " active" : "");
      opt.textContent = label;
      opt.onclick = (e) => {
        e.stopPropagation();
        _chartInstrument = id;
        localStorage.setItem("s936_chart_inst_v1", id);
        instMenu.classList.remove("open");
        render({ container, instrument: id, onChordEdit });
      };
      instMenu.appendChild(opt);
    });
    instBtn.onclick = (e) => { e.stopPropagation(); instMenu.classList.toggle("open"); };
    document.addEventListener("click", () => instMenu.classList.remove("open"), { once: false });
    instWrap.append(instBtn, instMenu);
    head.append(info, instWrap);
    container.appendChild(head);

    // ── Body ──
    const body = document.createElement("div");
    body.className = "s936-ch-body";
    const sectionBars = getSectionBars();
    const COLS = 4;

    arrangement.forEach(item => {
      const chords = sections[item.section] || [];
      const totalMeasures = sectionBars[item.section]
        || chords.reduce((s, c) => s + (Number(c.bars) || 1), 0)
        || 4;

      prepopulate(item.section, chords);
      const beatsData = getBeatsData(item.section);

      // Mapa barIndex → { chord, totalBars, isFirst, isContinuation }
      const barMap = {};
      let bi = 0;
      chords.forEach(chord => {
        const bars = Math.max(1, Number(chord.bars) || 1);
        for (let k = 0; k < bars; k++) {
          barMap[bi + k] = { chord, totalBars: bars, isFirst: k === 0, isContinuation: k > 0 };
        }
        bi += bars;
      });

      const sec = document.createElement("div");
      sec.className = "s936-ch-sec";

      const hd = document.createElement("div");
      hd.className = "s936-ch-sec-hd";
      const badge = document.createElement("span");
      badge.className = "s936-ch-sec-badge";
      badge.textContent = item.label || item.section;
      const sinfo = document.createElement("span");
      sinfo.className = "s936-ch-sec-info";
      sinfo.textContent = chords.length + " acordes · " + totalMeasures + " comp.";
      hd.append(badge, sinfo);
      sec.appendChild(hd);

      const onRerender = () => render({ container, instrument: inst, onChordEdit });

      for (let i = 0; i < totalMeasures; i += COLS) {
        const line = document.createElement("div");
        line.className = "s936-ch-line";

        for (let j = 0; j < COLS; j++) {
          const barIndex = i + j;
          if (barIndex >= totalMeasures) {
            const empty = document.createElement("div");
            empty.style.cssText = "border-right:1px solid rgba(255,255,255,.07);min-height:110px";
            line.appendChild(empty);
            continue;
          }
          const barInfo = barMap[barIndex];
          const barEl = renderBar({
            barIndex, isFirst: barInfo?.isFirst ?? true,
            sectionKey: item.section, beatsData, barInfo,
            inst, voicingLibrary, onRerender
          });
          line.appendChild(barEl);
        }
        sec.appendChild(line);
      }

      sec.appendChild(Object.assign(document.createElement("div"), { className: "s936-ch-dblbar" }));
      body.appendChild(sec);
    });

    container.appendChild(body);
    container.addEventListener("click", () => closePopups());
    return { ok: true, version: VERSION };
  }

  // ─── HIGHLIGHT PLAYBACK ───────────────────────────────────────────────────
  function highlightBar(sectionKey, barIndex) {
    if (_activeBarEl) _activeBarEl.classList.remove("s936-cb-active");
    const el = document.querySelector(`.s936-ch-bar[data-section="${sectionKey}"][data-bar="${barIndex}"]`);
    if (el) {
      el.classList.add("s936-cb-active");
      _activeBarEl = el;
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  // ─── MOUNT / UNMOUNT ─────────────────────────────────────────────────────
  let _savedFretDisplay = null;
  let _savedPianoDisplay = null;
  let _chartActive = false;

  function mountInRightPanel({ onChordEdit } = {}) {
    const fretContainer = document.getElementById("fretboardContainer");
    const pianoContainer = document.getElementById("pianoContainer");
    if (!fretContainer) return { ok: false };

    try { window.Studio936InstrumentSurfaceManager?.stopObserver?.(); } catch(_) {}

    _savedFretDisplay = fretContainer.style.display;
    _savedPianoDisplay = pianoContainer ? pianoContainer.style.display : null;
    fretContainer.style.display = "none";
    if (pianoContainer) pianoContainer.style.display = "none";

    const prev = document.getElementById("s936-chart-view-panel");
    if (prev) prev.remove();

    const chartEl = document.createElement("div");
    chartEl.id = "s936-chart-view-panel";

    function applyPos() {
      const panel = document.getElementById("s936-chart-view-panel");
      if (!panel) return;
      const suiteEl = document.getElementById("s936SuitePro");
      const isMax = suiteEl?.classList.contains("is-max");
      if (isMax) {
        if (panel.parentElement !== suiteEl) suiteEl.appendChild(panel);
        const r = suiteEl.getBoundingClientRect();
        panel.style.cssText = [
          "position:absolute","top:104px","right:0",
          "width:" + Math.round(r.width / 2) + "px","bottom:0",
          "overflow-y:auto","background:#090b11",
          "border-left:1px solid rgba(0,255,204,.18)",
          "border-radius:0 22px 22px 0","z-index:2"
        ].join(";");
      } else {
        if (panel.parentElement !== document.body) document.body.appendChild(panel);
        const main = document.querySelector("main");
        const mr = main ? main.getBoundingClientRect() : { top:0, height:window.innerHeight, left:0 };
        const sr = suiteEl ? suiteEl.getBoundingClientRect() : { right:0, width:0 };
        const left = Math.max(sr.right, mr.left) + 4;
        panel.style.cssText = [
          "position:fixed",
          "top:" + Math.round(mr.top) + "px",
          "left:" + Math.round(left) + "px",
          "width:" + Math.round(window.innerWidth - left) + "px",
          "height:" + Math.round(mr.height) + "px",
          "overflow-y:auto","background:#090b11","z-index:200"
        ].join(";");
      }
    }

    const suiteEl = document.getElementById("s936SuitePro");
    if (suiteEl?.classList.contains("is-max")) suiteEl.appendChild(chartEl);
    else document.body.appendChild(chartEl);

    applyPos();
    setTimeout(applyPos, 100);
    setTimeout(applyPos, 400);
    chartEl._resizeHandler = applyPos;
    window.addEventListener("resize", applyPos);

    const edState = window.Studio936AppBridge?.getEditorState?.() || {};
    render({ container: chartEl, instrument: _chartInstrument || edState.instrument, onChordEdit });
    _chartActive = true;
    return { ok: true };
  }

  function unmountFromRightPanel() {
    _chartActive = false;
    _activeBarEl = null;
    try { window.Studio936InstrumentSurfaceManager?.startObserver?.(); } catch(_) {}
    const chartEl = document.getElementById("s936-chart-view-panel");
    if (chartEl) {
      if (chartEl._resizeHandler) window.removeEventListener("resize", chartEl._resizeHandler);
      chartEl.remove();
    }
    const fc = document.getElementById("fretboardContainer");
    const pc = document.getElementById("pianoContainer");
    if (fc && _savedFretDisplay !== null) { fc.style.display = _savedFretDisplay; _savedFretDisplay = null; }
    if (pc && _savedPianoDisplay !== null) { pc.style.display = _savedPianoDisplay; _savedPianoDisplay = null; }
  }

  return { version: VERSION, render, mountInRightPanel, unmountFromRightPanel, highlightBar, isActive: () => _chartActive };
})();
