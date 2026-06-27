// Studio 936 Composer - Chart View v1.4.0
// Lead sheet iReal Book — ritmo + voicings + playback highlight
window.Studio936SuiteProChart = (() => {
  "use strict";
  const VERSION = "chart-v1.4.0";
  const STYLE_ID = "s936-chart-v14";

  // ─── ESTILOS ───────────────────────────────────────────────────────────────
  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = `
#s936ChartContainer{position:absolute;inset:0;z-index:5;background:#090b11;overflow-y:auto;font-family:system-ui,sans-serif}
/* Header */
.s936-ch-head{display:flex;align-items:center;justify-content:space-between;padding:10px 16px 8px;border-bottom:1px solid rgba(255,255,255,.08);background:#0d0f18;position:sticky;top:0;z-index:10}
.s936-ch-title{font-size:.75rem;font-weight:900;color:#00ffcc;text-transform:uppercase;letter-spacing:1px}
.s936-ch-meta{font-size:.54rem;color:rgba(255,255,255,.38);margin-top:1px}
.s936-ch-inst{font-size:.5rem;background:rgba(255,91,234,.12);border:1px solid rgba(255,91,234,.3);border-radius:10px;color:#ff5bea;padding:2px 10px;text-transform:uppercase;font-weight:700;letter-spacing:.4px;cursor:pointer}
.s936-ch-body{padding:10px 12px 32px}
/* Sección */
.s936-ch-sec{margin-bottom:20px}
.s936-ch-sec-hd{display:flex;align-items:center;gap:8px;margin-bottom:5px}
.s936-ch-sec-badge{background:rgba(255,224,102,.12);border:1px solid rgba(255,224,102,.35);border-radius:4px;color:#ffe066;font-size:.52rem;font-weight:900;padding:2px 9px;text-transform:uppercase;letter-spacing:.7px}
.s936-ch-sec-info{color:rgba(255,255,255,.28);font-size:.48rem}
/* Línea de 4 compases */
.s936-ch-line{display:grid;grid-template-columns:repeat(4,1fr);border-top:2px solid rgba(255,255,255,.22);margin-bottom:2px}
/* Compás */
.s936-ch-bar{border-right:1px solid rgba(255,255,255,.12);padding:4px 4px 4px 4px;position:relative;min-height:96px;box-sizing:border-box;transition:background .12s}
.s936-ch-bar:last-child{border-right:2px solid rgba(255,255,255,.3)}
.s936-ch-bar:hover{background:rgba(0,255,204,.04)}
.s936-ch-bar.s936-cb-active{background:rgba(0,255,204,.13)!important;outline:2px solid rgba(0,255,204,.4);outline-offset:-2px}
.s936-ch-bar.s936-cb-open::before{content:"";position:absolute;left:0;top:4px;bottom:4px;width:4px;background:#ffe066;border-radius:0 2px 2px 0}
/* Número de compás */
.s936-ch-num{font-size:.4rem;color:rgba(255,255,255,.18);font-weight:700;position:absolute;top:3px;left:6px;line-height:1}
/* Zona acorde principal */
.s936-ch-chord-zone{margin-top:10px;margin-bottom:4px;min-height:28px;display:flex;align-items:flex-end;gap:2px}
.s936-ch-root{font-size:1.08rem;font-weight:900;color:#fff;line-height:1}
.s936-ch-qual{font-size:.58rem;font-weight:700;color:rgba(255,255,255,.6);vertical-align:super}
.s936-ch-bass{font-size:.48rem;color:#ff5bea;font-weight:700;margin-top:2px}
/* Figuras rítmicas */
.s936-ch-rhythm{display:flex;gap:2px;align-items:flex-end;height:16px;margin-bottom:3px}
.s936-ch-note{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;cursor:pointer;opacity:.7;transition:opacity .1s}
.s936-ch-note:hover{opacity:1}
.s936-ch-note.filled{opacity:1}
.s936-ch-note svg{display:block}
/* Mini piano de voicing */
.s936-ch-piano-mini{display:flex;height:20px;border:1px solid rgba(255,255,255,.18);border-radius:2px;overflow:hidden;margin-top:2px;position:relative}
.s936-ch-pkey{flex:1;border-right:1px solid rgba(255,255,255,.1);box-sizing:border-box}
.s936-ch-pkey.white{background:rgba(255,255,255,.08)}
.s936-ch-pkey.black{background:rgba(0,0,0,.85);position:absolute;top:0;width:8px;height:12px;border-radius:0 0 2px 2px;border:1px solid rgba(255,255,255,.12);z-index:2}
.s936-ch-pkey.hit{background:#00ffcc!important;box-shadow:0 0 5px rgba(0,255,204,.7)}
/* Mini fretboard */
.s936-ch-fret-mini{position:relative;height:30px;background:linear-gradient(90deg,rgba(139,91,49,.35),rgba(70,45,26,.18));border:1px solid rgba(86,96,106,.5);border-radius:4px;margin-top:3px;overflow:hidden}
.s936-ch-fret-string{position:absolute;left:0;right:0;background:rgba(200,180,140,.45);height:1px}
.s936-ch-fret-line{position:absolute;top:0;bottom:0;width:1px;background:rgba(255,255,255,.12)}
.s936-ch-fret-dot{position:absolute;width:7px;height:7px;border-radius:50%;background:#00ffcc;transform:translate(-50%,-50%);box-shadow:0 0 4px rgba(0,255,204,.6)}
.s936-ch-fret-mute{position:absolute;color:rgba(255,80,80,.7);font-size:.45rem;font-weight:900;transform:translateX(-50%)}
/* Barra final de sección */
.s936-ch-dblbar{height:3px;background:linear-gradient(to right,rgba(255,255,255,.15) 0,rgba(255,255,255,.15) calc(100% - 4px),rgba(255,255,255,.45) calc(100% - 4px),rgba(255,255,255,.45) 100%);margin-top:2px}
/* Popup edición */
.s936-ch-pop{position:absolute;top:0;left:0;right:0;background:#131726;border:1px solid rgba(0,255,204,.5);border-radius:6px;z-index:30;padding:6px;box-shadow:0 8px 24px rgba(0,0,0,.8)}
.s936-ch-pop-inp{width:100%;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);border-radius:4px;color:#fff;font-size:.72rem;font-weight:700;padding:4px 6px;outline:none;box-sizing:border-box}
.s936-ch-pop-inp:focus{border-color:#00ffcc}
.s936-ch-pop-acts{display:flex;gap:3px;margin-top:5px}
.s936-ch-pop-btn{flex:1;border-radius:4px;font-size:.48rem;font-weight:700;padding:4px;cursor:pointer;border:1px solid;text-align:center}
.s936-ch-pop-btn.ok{background:rgba(0,255,204,.15);border-color:rgba(0,255,204,.35);color:#bfffee}
.s936-ch-pop-btn.del{flex:0 0 auto;background:rgba(255,80,80,.1);border-color:rgba(255,80,80,.3);color:#ff8080;padding:4px 6px}
    `;
    document.head.appendChild(s);
  }

  // ─── DATOS ────────────────────────────────────────────────────────────────
  function getSectionBars() {
    try {
      const d = JSON.parse(localStorage.getItem("s936_suitepro_structure_v4") || "{}");
      const parts = d?.draft?.parts || [];
      const map = {};
      parts.forEach(p => { if (p.section) map[p.section] = Number(p.bars) || 4; });
      return map;
    } catch(_) { return {}; }
  }

  function getBeatsData(sectionKey) {
    try {
      const d = JSON.parse(localStorage.getItem("s936_chart_beats_v1") || "{}");
      return d[sectionKey] || {};
    } catch(_) { return {}; }
  }

  function saveBeatsData(sectionKey, barIndex, value) {
    try {
      const d = JSON.parse(localStorage.getItem("s936_chart_beats_v1") || "{}");
      if (!d[sectionKey]) d[sectionKey] = {};
      if (value) d[sectionKey][barIndex + "_0"] = value;
      else delete d[sectionKey][barIndex + "_0"];
      localStorage.setItem("s936_chart_beats_v1", JSON.stringify(d));
    } catch(_) {}
  }

  function prepopulateFromEditor(sectionKey, chords) {
    try {
      const d = JSON.parse(localStorage.getItem("s936_chart_beats_v1") || "{}");
      if (d[sectionKey] && Object.keys(d[sectionKey]).length > 0) return;
      if (!Array.isArray(chords) || !chords.length) return;
      if (!d[sectionKey]) d[sectionKey] = {};
      let barIndex = 0;
      chords.forEach(chord => {
        const bars = Math.max(1, Number(chord.bars) || 1);
        d[sectionKey][barIndex + "_0"] = chord.name || "";
        barIndex += bars;
      });
      localStorage.setItem("s936_chart_beats_v1", JSON.stringify(d));
    } catch(_) {}
  }

  // ─── PARSING ──────────────────────────────────────────────────────────────
  function parseChord(name) {
    if (!name) return null;
    const m = String(name).match(/^([A-G][b#]?)(.*)$/);
    if (!m) return { root: name, qual: "", bass: "" };
    const qual = m[2] || "";
    const bassMatch = qual.match(/^(.*)\/(([A-G][b#]?))$/);
    if (bassMatch) return { root: m[1], qual: bassMatch[1], bass: bassMatch[2] };
    return { root: m[1], qual, bass: "" };
  }

  // ─── FIGURAS RÍTMICAS ────────────────────────────────────────────────────
  // Detecta duración a partir de cuántos compases dura el acorde
  function rhythmFigure(bars) {
    // Devuelve array de figuras SVG para representar la duración
    if (bars >= 4) return ["whole","whole","whole","whole"].slice(0, bars).map((_,i) => i === 0 ? "whole" : "tie");
    if (bars === 3) return ["half+dot"];
    if (bars === 2) return ["half"];
    return ["quarter"]; // 1 compás = negra por defecto
  }

  function noteSVG(type, filled = false) {
    const w = 10, h = 16;
    const headFill = filled ? "#fff" : "none";
    const headStroke = "#fff";
    let svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`;
    if (type === "whole") {
      svg += `<ellipse cx="5" cy="12" rx="4" ry="2.5" fill="${headFill}" stroke="${headStroke}" stroke-width="1.2"/>`;
    } else if (type === "half") {
      svg += `<ellipse cx="5" cy="12" rx="4" ry="2.5" fill="none" stroke="${headStroke}" stroke-width="1.2"/>`;
      svg += `<line x1="8.8" y1="12" x2="8.8" y2="2" stroke="${headStroke}" stroke-width="1.2"/>`;
    } else if (type === "half+dot") {
      svg += `<ellipse cx="4" cy="12" rx="3.5" ry="2.2" fill="none" stroke="${headStroke}" stroke-width="1.2"/>`;
      svg += `<line x1="7.3" y1="12" x2="7.3" y2="3" stroke="${headStroke}" stroke-width="1.2"/>`;
      svg += `<circle cx="9.5" cy="11" r="1.2" fill="${headStroke}"/>`;
    } else if (type === "quarter") {
      svg += `<ellipse cx="5" cy="12" rx="4" ry="2.5" fill="${headStroke}" stroke="${headStroke}" stroke-width="1"/>`;
      svg += `<line x1="8.8" y1="12" x2="8.8" y2="2" stroke="${headStroke}" stroke-width="1.2"/>`;
    } else if (type === "tie") {
      svg += `<path d="M1,8 Q5,4 9,8" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="1.2"/>`;
    } else if (type === "eighth") {
      svg += `<ellipse cx="5" cy="12" rx="4" ry="2.5" fill="${headStroke}" stroke="${headStroke}" stroke-width="1"/>`;
      svg += `<line x1="8.8" y1="12" x2="8.8" y2="2" stroke="${headStroke}" stroke-width="1.2"/>`;
      svg += `<path d="M8.8,2 Q12,5 9,8" fill="none" stroke="${headStroke}" stroke-width="1.2"/>`;
    }
    svg += "</svg>";
    return svg;
  }

  function renderRhythm(bars) {
    const wrap = document.createElement("div");
    wrap.className = "s936-ch-rhythm";
    const figures = rhythmFigure(bars);
    figures.forEach(type => {
      const n = document.createElement("span");
      n.className = "s936-ch-note filled";
      n.innerHTML = noteSVG(type, true);
      wrap.appendChild(n);
    });
    return wrap;
  }

  // ─── MINI PIANO ──────────────────────────────────────────────────────────
  // Notas: C C# D D# E F F# G G# A A# B
  const WHITE_KEYS = [0,2,4,5,7,9,11]; // pitch classes en octava
  const BLACK_KEYS = [1,3,6,8,10];
  const BLACK_OFFSETS = { 1:1, 3:2, 6:4, 8:5, 10:6 }; // posición relativa entre las blancas

  function midiToPc(midi) { return ((midi % 12) + 12) % 12; }

  function miniPiano(voicingPiano) {
    const wrap = document.createElement("div");
    wrap.className = "s936-ch-piano-mini";
    wrap.style.position = "relative";

    const midis = Array.isArray(voicingPiano?.midis) ? voicingPiano.midis : [];
    const hitPcs = new Set(midis.map(midiToPc));

    const keyWidth = 100 / 7; // % por tecla blanca

    // Teclas blancas
    WHITE_KEYS.forEach((pc, i) => {
      const k = document.createElement("div");
      k.className = "s936-ch-pkey white" + (hitPcs.has(pc) ? " hit" : "");
      k.style.cssText = `position:absolute;left:${i * keyWidth}%;width:${keyWidth}%;top:0;bottom:0;border-right:1px solid rgba(255,255,255,.1);box-sizing:border-box`;
      wrap.appendChild(k);
    });

    // Teclas negras
    BLACK_KEYS.forEach(pc => {
      const pos = BLACK_OFFSETS[pc]; // posición: cuántas blancas a la izquierda
      const k = document.createElement("div");
      k.className = "s936-ch-pkey black" + (hitPcs.has(pc) ? " hit" : "");
      const leftPct = pos * keyWidth - 3;
      k.style.cssText = `position:absolute;left:${leftPct}%;width:${keyWidth * 0.55}%;top:0;height:60%;z-index:2;border-radius:0 0 2px 2px;box-sizing:border-box`;
      wrap.appendChild(k);
    });

    return wrap;
  }

  // ─── MINI FRETBOARD ───────────────────────────────────────────────────────
  function miniFret(voicingFret, instrument) {
    const wrap = document.createElement("div");
    wrap.className = "s936-ch-fret-mini";

    if (!voicingFret || !Array.isArray(voicingFret.frets)) return wrap;

    const frets = voicingFret.frets;
    const stringCount = frets.length;
    if (!stringCount) return wrap;

    const nonNull = frets.filter(f => f !== null && f !== "x");
    const minFret = nonNull.length ? Math.min(...nonNull.filter(f => f > 0)) : 0;
    const maxFret = nonNull.length ? Math.max(...nonNull) : 4;
    const fretSpan = Math.max(4, maxFret - (minFret > 0 ? minFret - 1 : 0));
    const startFret = minFret > 1 ? minFret - 1 : 0;

    // Cuerdas horizontales
    for (let s = 0; s < stringCount; s++) {
      const line = document.createElement("div");
      line.className = "s936-ch-fret-string";
      const topPct = ((s + 0.5) / stringCount) * 100;
      line.style.cssText = `top:${topPct}%;left:8%;right:4%`;
      wrap.appendChild(line);
    }

    // Líneas de traste verticales (4 trastes visibles)
    for (let f = 0; f <= fretSpan; f++) {
      const line = document.createElement("div");
      line.className = "s936-ch-fret-line";
      const leftPct = 8 + (f / fretSpan) * 88;
      line.style.left = leftPct + "%";
      wrap.appendChild(line);
    }

    // Puntos de nota y mutes
    frets.forEach((fret, si) => {
      const topPct = ((si + 0.5) / stringCount) * 100;
      if (fret === null || fret === "x" || String(fret).toUpperCase() === "X") {
        const m = document.createElement("div");
        m.className = "s936-ch-fret-mute";
        m.textContent = "×";
        m.style.cssText = `top:${topPct}%;left:3%;transform:translate(-50%,-50%)`;
        wrap.appendChild(m);
      } else {
        const relFret = fret === 0 ? 0 : fret - startFret;
        const leftPct = fret === 0 ? 6 : 8 + ((relFret - 0.5) / fretSpan) * 88;
        const dot = document.createElement("div");
        dot.className = "s936-ch-fret-dot";
        dot.style.cssText = `top:${topPct}%;left:${leftPct}%`;
        wrap.appendChild(dot);
      }
    });

    return wrap;
  }

  // ─── POPUP EDICIÓN ───────────────────────────────────────────────────────
  function closePopups() {
    document.querySelectorAll(".s936-ch-pop").forEach(p => p.remove());
  }

  function showBarEditor(barEl, sectionKey, barIndex, currentVal, onSave) {
    closePopups();
    const pop = document.createElement("div");
    pop.className = "s936-ch-pop";

    const label = document.createElement("div");
    label.style.cssText = "font-size:.44rem;color:rgba(255,255,255,.4);margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px";
    label.textContent = "Compás " + (barIndex + 1);
    pop.appendChild(label);

    const inp = document.createElement("input");
    inp.className = "s936-ch-pop-inp";
    inp.value = currentVal || "";
    inp.placeholder = "Ej: Cm7";
    inp.setAttribute("autocomplete", "off");
    pop.appendChild(inp);

    const acts = document.createElement("div");
    acts.className = "s936-ch-pop-acts";

    const ok = document.createElement("button");
    ok.className = "s936-ch-pop-btn ok";
    ok.textContent = "OK";

    const del = document.createElement("button");
    del.className = "s936-ch-pop-btn del";
    del.textContent = "×";

    acts.append(ok, del);
    pop.appendChild(acts);

    ok.onclick = () => { onSave(inp.value.trim()); closePopups(); };
    del.onclick = () => { onSave(""); closePopups(); };
    inp.onkeydown = e => {
      if (e.key === "Enter") ok.onclick();
      if (e.key === "Escape") closePopups();
    };

    barEl.style.position = "relative";
    barEl.appendChild(pop);
    setTimeout(() => { inp.focus(); inp.select(); }, 0);
  }

  // ─── RENDER PRINCIPAL ─────────────────────────────────────────────────────
  let _activeBarEl = null; // referencia al compás activo para highlight playback

  function render({ container, instrument, onChordEdit } = {}) {
    if (!container) return;
    installStyles();
    container.innerHTML = "";
    _activeBarEl = null;

    const bridge = window.Studio936AppBridge;
    if (!bridge) return;

    const arrangement = bridge.getArrangement?.() || [];
    const edState = bridge.getEditorState?.() || {};
    const sections = edState.sections || {};
    const voicingLibrary = edState.voicingLibrary || {};
    const inst = instrument || edState.instrument || "piano";

    if (!arrangement.length) {
      const p = document.createElement("p");
      p.style.cssText = "color:rgba(255,255,255,.3);padding:32px;text-align:center;font-size:.7rem";
      p.textContent = "Sin arreglo — crea partes en Estructura.";
      container.appendChild(p);
      return;
    }

    // Header
    const head = document.createElement("div");
    head.className = "s936-ch-head";
    const info = document.createElement("div");
    const titleEl = document.createElement("div");
    titleEl.className = "s936-ch-title";
    titleEl.textContent = edState.title || "Canción";
    const metaEl = document.createElement("div");
    metaEl.className = "s936-ch-meta";
    const totalBars = arrangement.reduce((acc, item) => {
      const ch = sections[item.section] || [];
      return acc + ch.reduce((s, c) => s + (Number(c.bars) || 1), 0);
    }, 0);
    metaEl.textContent = (edState.style || "") + (edState.bpm ? " · " + edState.bpm + " BPM" : "") + " · " + totalBars + " comp.";
    info.append(titleEl, metaEl);
    const instBadge = document.createElement("span");
    instBadge.className = "s936-ch-inst";
    instBadge.textContent = inst.toUpperCase();
    head.append(info, instBadge);
    container.appendChild(head);

    // Body
    const body = document.createElement("div");
    body.className = "s936-ch-body";

    const sectionBars = getSectionBars();
    const COLS = 4;

    arrangement.forEach(item => {
      const chords = sections[item.section] || [];
      const totalMeasures = sectionBars[item.section]
        || chords.reduce((s, c) => s + (Number(c.bars) || 1), 0)
        || 4;

      prepopulateFromEditor(item.section, chords);
      const beatsData = getBeatsData(item.section);

      // Construir mapa compás→acorde desde el editor
      const barChordMap = {}; // barIndex → { chord, voicing }
      let bi = 0;
      chords.forEach(chord => {
        const bars = Math.max(1, Number(chord.bars) || 1);
        const voicing = chord?.voicings?.[inst]
          || voicingLibrary?.[inst]?.[String(chord.name || "").toUpperCase().trim()];
        for (let k = 0; k < bars; k++) {
          barChordMap[bi + k] = {
            chord,
            voicing,
            isFirst: k === 0,
            totalBars: bars,
            isContinuation: k > 0
          };
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

      // Filas de 4 compases
      for (let i = 0; i < totalMeasures; i += COLS) {
        const line = document.createElement("div");
        line.className = "s936-ch-line";

        for (let j = 0; j < COLS; j++) {
          const barIndex = i + j;
          if (barIndex >= totalMeasures) {
            const empty = document.createElement("div");
            empty.style.cssText = "border-right:1px solid rgba(255,255,255,.08);min-height:96px";
            line.appendChild(empty);
            continue;
          }

          const barInfo = barChordMap[barIndex];
          const beatKey = barIndex + "_0";
          const beatVal = beatsData[beatKey] || barInfo?.chord?.name || "";
          const parsed = parseChord(beatVal);

          const bar = document.createElement("div");
          bar.className = "s936-ch-bar" + (barIndex === 0 ? " s936-cb-open" : "");
          bar.dataset.section = item.section;
          bar.dataset.bar = barIndex;

          // Número
          const num = document.createElement("span");
          num.className = "s936-ch-num";
          num.textContent = barIndex + 1;
          bar.appendChild(num);

          // ── Zona de acorde ──
          if (parsed && !barInfo?.isContinuation) {
            // Figura rítmica
            if (barInfo?.totalBars) {
              bar.appendChild(renderRhythm(barInfo.totalBars));
            }

            // Nombre del acorde
            const chordZone = document.createElement("div");
            chordZone.className = "s936-ch-chord-zone";
            const rootEl = document.createElement("span");
            rootEl.className = "s936-ch-root";
            rootEl.textContent = parsed.root;
            const qualEl = document.createElement("sup");
            qualEl.className = "s936-ch-qual";
            qualEl.textContent = parsed.qual;
            chordZone.append(rootEl, qualEl);
            if (parsed.bass) {
              const bassEl = document.createElement("div");
              bassEl.className = "s936-ch-bass";
              bassEl.textContent = "/" + parsed.bass;
              chordZone.appendChild(bassEl);
            }
            bar.appendChild(chordZone);

            // ── Voicing mini ──
            if (barInfo?.voicing) {
              if (inst === "piano") {
                bar.appendChild(miniPiano(barInfo.voicing));
              } else {
                bar.appendChild(miniFret(barInfo.voicing, inst));
              }
            } else if (parsed.root) {
              // Sin voicing guardado → piano vacío o fret vacío como placeholder
              if (inst === "piano") {
                bar.appendChild(miniPiano(null));
              }
            }
          } else if (barInfo?.isContinuation) {
            // Compás de continuación — dash de ligadura
            const dash = document.createElement("div");
            dash.style.cssText = "margin-top:24px;font-size:1.4rem;color:rgba(255,255,255,.18);text-align:center;letter-spacing:4px";
            dash.textContent = "—";
            bar.appendChild(dash);
          } else if (parsed) {
            // Acorde editado manualmente (override en beatsData)
            const chordZone = document.createElement("div");
            chordZone.className = "s936-ch-chord-zone";
            chordZone.style.marginTop = "14px";
            const rootEl = document.createElement("span");
            rootEl.className = "s936-ch-root";
            rootEl.style.fontSize = ".9rem";
            rootEl.textContent = parsed.root;
            const qualEl = document.createElement("sup");
            qualEl.className = "s936-ch-qual";
            qualEl.textContent = parsed.qual;
            chordZone.append(rootEl, qualEl);
            bar.appendChild(chordZone);
          }

          // Click → editar acorde del compás
          bar.addEventListener("click", e => {
            if (e.target.closest(".s936-ch-pop")) return;
            e.stopPropagation();
            showBarEditor(bar, item.section, barIndex, beatVal, val => {
              saveBeatsData(item.section, barIndex, val);
              render({ container, instrument: inst, onChordEdit });
            });
          });

          line.appendChild(bar);
        }
        sec.appendChild(line);
      }

      const dbl = document.createElement("div");
      dbl.className = "s936-ch-dblbar";
      sec.appendChild(dbl);
      body.appendChild(sec);
    });

    container.appendChild(body);
    container.addEventListener("click", closePopups);
    return { ok: true, version: VERSION };
  }

  // ─── HIGHLIGHT DE PLAYBACK ───────────────────────────────────────────────
  function highlightBar(sectionKey, barIndex) {
    if (_activeBarEl) _activeBarEl.classList.remove("s936-cb-active");
    const el = document.querySelector(
      `.s936-ch-bar[data-section="${sectionKey}"][data-bar="${barIndex}"]`
    );
    if (el) {
      el.classList.add("s936-cb-active");
      _activeBarEl = el;
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  // ─── ESTADO INTERNO ──────────────────────────────────────────────────────
  let _savedFretDisplay = null;
  let _savedPianoDisplay = null;
  let _chartActive = false;

  // ─── MOUNT / UNMOUNT ─────────────────────────────────────────────────────
  function mountInRightPanel({ onChordEdit } = {}) {
    // v1.4.0: estrategia dual DOCK/MAX
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

    function applyChartPosition() {
      const chartPanel = document.getElementById("s936-chart-view-panel");
      if (!chartPanel) return;

      const suiteEl = document.getElementById("s936SuitePro");
      const isMax = suiteEl && suiteEl.classList.contains("is-max");

      if (isMax) {
        if (chartPanel.parentElement !== suiteEl) suiteEl.appendChild(chartPanel);
        const suiteRect = suiteEl.getBoundingClientRect();
        const halfWidth = Math.round(suiteRect.width / 2);
        chartPanel.style.cssText = [
          "position:absolute",
          "top:104px",
          "right:0",
          "width:" + halfWidth + "px",
          "bottom:0",
          "overflow-y:auto",
          "background:#090b11",
          "border-left:1px solid rgba(0,255,204,.18)",
          "border-radius:0 22px 22px 0",
          "z-index:2"
        ].join(";");
      } else {
        if (chartPanel.parentElement !== document.body) document.body.appendChild(chartPanel);
        const mainEl = document.querySelector("main");
        const mainRect = mainEl ? mainEl.getBoundingClientRect() : { top: 0, height: window.innerHeight, left: 0 };
        const suiteRight = (suiteEl && suiteEl.getBoundingClientRect().width > 50)
          ? suiteEl.getBoundingClientRect().right : 0;
        const left = Math.max(suiteRight, mainRect.left) + 4;
        chartPanel.style.cssText = [
          "position:fixed",
          "top:" + Math.round(mainRect.top) + "px",
          "left:" + Math.round(left) + "px",
          "width:" + Math.round(window.innerWidth - left) + "px",
          "height:" + Math.round(mainRect.height) + "px",
          "overflow-y:auto",
          "background:#090b11",
          "z-index:200"
        ].join(";");
      }
    }

    const suiteEl = document.getElementById("s936SuitePro");
    if (suiteEl && suiteEl.classList.contains("is-max")) {
      suiteEl.appendChild(chartEl);
    } else {
      document.body.appendChild(chartEl);
    }

    applyChartPosition();
    setTimeout(applyChartPosition, 100);
    setTimeout(applyChartPosition, 400);

    chartEl._resizeHandler = () => applyChartPosition();
    window.addEventListener("resize", chartEl._resizeHandler);

    const edState = window.Studio936AppBridge?.getEditorState?.() || {};
    render({ container: chartEl, instrument: edState.instrument, onChordEdit });
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
    const fretContainer = document.getElementById("fretboardContainer");
    const pianoContainer = document.getElementById("pianoContainer");
    if (fretContainer && _savedFretDisplay !== null) {
      fretContainer.style.display = _savedFretDisplay;
      _savedFretDisplay = null;
    }
    if (pianoContainer && _savedPianoDisplay !== null) {
      pianoContainer.style.display = _savedPianoDisplay;
      _savedPianoDisplay = null;
    }
  }

  return {
    version: VERSION,
    render,
    mountInRightPanel,
    unmountFromRightPanel,
    highlightBar,
    isActive: () => _chartActive
  };
})();
