// Studio 936 Composer - Chart View v1.6.1
// iReal Book style: 4 compases × 4 tiempos + voicings + selector instrumento
window.Studio936SuiteProChart = (() => {
  "use strict";
  const VERSION = "chart-v1.6.1";
  const STYLE_ID = "s936-chart-v141";

  const INSTRUMENTS = [
    { id: "piano",   label: "Piano" },
    { id: "guitar",  label: "Guitarra" },
    { id: "ukulele", label: "Ukulele" },
    { id: "bass",    label: "Bajo" }
  ];

  let _chartInstrument = localStorage.getItem("s936_chart_inst_v1") || "piano";

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = `
#s936-chart-view-panel{font-family:system-ui,sans-serif;color:#fff}
.s936-ch-head{display:flex;align-items:center;justify-content:space-between;padding:8px 14px 7px;border-bottom:1px solid rgba(255,255,255,.08);background:#0d0f18;position:sticky;top:0;z-index:10;gap:10px}
.s936-ch-title{font-size:.72rem;font-weight:900;color:#00ffcc;text-transform:uppercase;letter-spacing:.8px}
.s936-ch-meta{font-size:.5rem;color:rgba(255,255,255,.35);margin-top:1px}
.s936-ch-inst-wrap{position:relative}
.s936-ch-inst-btn{font-size:.52rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;background:rgba(255,91,234,.14);border:1px solid rgba(255,91,234,.4);border-radius:10px;color:#ff5bea;padding:3px 12px;cursor:pointer;white-space:nowrap}
.s936-ch-inst-btn:hover{background:rgba(255,91,234,.25)}
.s936-ch-inst-menu{position:absolute;top:calc(100% + 4px);right:0;background:#131726;border:1px solid rgba(0,255,204,.35);border-radius:8px;padding:4px;z-index:50;min-width:100px;box-shadow:0 8px 24px rgba(0,0,0,.8);display:none}
.s936-ch-inst-menu.open{display:block}
.s936-ch-inst-opt{display:block;width:100%;text-align:left;background:none;border:none;color:rgba(255,255,255,.7);font-size:.54rem;font-weight:700;padding:5px 10px;cursor:pointer;border-radius:5px;text-transform:uppercase;letter-spacing:.4px}
.s936-ch-inst-opt:hover{background:rgba(0,255,204,.1);color:#00ffcc}
.s936-ch-inst-opt.active{color:#00ffcc;background:rgba(0,255,204,.08)}
.s936-ch-body{padding:10px 10px 40px}
.s936-ch-sec{margin-bottom:18px}
.s936-ch-sec-hd{display:flex;align-items:center;gap:8px;margin-bottom:4px}
.s936-ch-sec-badge{background:rgba(255,224,102,.13);border:1px solid rgba(255,224,102,.4);border-radius:4px;color:#ffe066;font-size:.52rem;font-weight:900;padding:2px 8px;text-transform:uppercase;letter-spacing:.6px}
.s936-ch-sec-info{color:rgba(255,255,255,.28);font-size:.46rem}
.s936-ch-line{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:2px solid rgba(255,255,255,.25);margin-bottom:1px}
.s936-ch-bar{border-right:1px solid rgba(255,255,255,.12);padding:2px 2px 4px 2px;position:relative;box-sizing:border-box;transition:background .1s}
.s936-ch-bar:last-child{border-right:2px solid rgba(255,255,255,.3)}
.s936-ch-bar:hover{background:rgba(0,255,204,.03)}
.s936-ch-bar.s936-cb-active{background:rgba(0,255,204,.13)!important;outline:2px solid rgba(0,255,204,.45);outline-offset:-2px}
.s936-ch-bar.s936-cb-open::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:#ffe066;border-radius:0 2px 2px 0}
.s936-ch-bar-head{position:relative;padding:12px 2px 2px;min-height:28px}
.s936-ch-num{position:absolute;top:1px;left:4px;font-size:.38rem;color:rgba(255,255,255,.22);font-weight:700;line-height:1}
.s936-ch-bar-fig{position:absolute;top:1px;right:4px;display:flex;align-items:flex-end;height:16px;opacity:.75}
.s936-ch-bar-fig svg{display:block}
.s936-ch-bar-chords{position:absolute;top:0;left:0;right:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:2px;padding:0 2px;pointer-events:none;z-index:2}
.s936-ch-bar-chord-name{display:flex;align-items:baseline;gap:1px;white-space:nowrap;min-height:16px}
.s936-chord-label-wrp{display:flex;align-items:baseline;background:#0d0f18;padding:0 2px}
.s936-ch-bar-root{font-size:1.1rem;font-weight:900;color:#fff;line-height:1}
.s936-ch-bar-qual{font-size:.56rem;font-weight:700;color:rgba(255,255,255,.55);vertical-align:super;line-height:1}
.s936-ch-bar-bass{font-size:.42rem;color:#ff5bea;font-weight:700;align-self:flex-end}
.s936-ch-beats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:2px;padding:0 2px}
.s936-ch-beat{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:4px;display:flex;flex-direction:column;padding:4px 3px 3px;cursor:pointer;position:relative;min-width:0}
.s936-ch-beat-num{font-size:.34rem;color:rgba(255,255,255,.28);font-weight:700;line-height:1;margin-bottom:2px}
.s936-ch-beat-lyric{font-size:0.42rem;color:#00ffcc;font-weight:700;text-align:center;margin-top:2px;min-height:8px;text-transform:uppercase;}
.s936-ch-pop{position:absolute;top:0;left:0;right:0;background:#131726;border:1px solid rgba(0,255,204,.5);border-radius:6px;z-index:50;padding:6px;box-shadow:0 8px 24px rgba(0,0,0,.9)}
.s936-ch-dblbar{height:3px;margin-top:2px;background:linear-gradient(to right,rgba(255,255,255,.15) 0,rgba(255,255,255,.15) calc(100% - 4px),rgba(255,255,255,.5) calc(100% - 4px),rgba(255,255,255,.5) 100%)}
    `;
    document.head.appendChild(s);
  }

  // (Funciones helper: getSectionBars, getBeatsData, saveBeat, prepopulate, parseChord, etc. - SE MANTIENEN IGUALES)
  // ... [El resto de las funciones de lógica y render se mantienen igual] ...

  function renderBeat(sectionKey, barIndex, beatIndex, beatVal, repeatRef, inst, voicingLibrary, onRerender) {
    const parsed = parseChord(beatVal);
    const lyricsData = JSON.parse(localStorage.getItem("s936_chart_lyrics_v1") || "{}");
    const lyricVal = lyricsData[sectionKey]?.[barIndex + "_" + beatIndex] || "";

    const cell = document.createElement("div");
    cell.className = "s936-ch-beat" + (parsed ? " has-chord" : "");
    cell.dataset.beat = beatIndex;

    const num = document.createElement("span");
    num.className = "s936-ch-beat-num";
    num.textContent = beatIndex + 1;
    cell.appendChild(num);

    if (parsed) {
      const voicingChordName = parsed.root + parsed.qual;
      const savedVoicing = voicingLibrary?.[inst]?.[voicingChordName.toUpperCase().trim()];
      if (inst === "piano") cell.appendChild(miniPiano(savedVoicing || null, voicingChordName));
      else cell.appendChild(miniFret(savedVoicing || calcFretVoicing(voicingChordName, inst)));
    }

    const lyricBox = document.createElement("div");
    lyricBox.className = "s936-ch-beat-lyric";
    lyricBox.textContent = lyricVal || "";
    cell.appendChild(lyricBox);

    cell.addEventListener("click", e => {
      e.stopPropagation();
      if (e.altKey) {
        const newLyric = prompt("Ingresa lírica:", lyricVal);
        if (newLyric !== null) {
          const d = JSON.parse(localStorage.getItem("s936_chart_lyrics_v1") || "{}");
          if (!d[sectionKey]) d[sectionKey] = {};
          d[sectionKey][barIndex + "_" + beatIndex] = newLyric;
          localStorage.setItem("s936_chart_lyrics_v1", JSON.stringify(d));
          onRerender();
        }
      } else {
        showBeatPop(cell, "Tiempo " + (beatIndex + 1), beatVal, val => {
          saveBeat(sectionKey, barIndex, beatIndex, val);
          onRerender();
        });
      }
    });
    return cell;
  }

  function renderBar({ barIndex, isFirst, sectionKey, beatsData, barInfo, inst, voicingLibrary, onRerender }) {
    const bar = document.createElement("div");
    bar.className = "s936-ch-bar";
    bar.dataset.section = sectionKey; bar.dataset.bar = barIndex;

    const head = document.createElement("div");
    head.className = "s936-ch-bar-head";
    const num = document.createElement("span"); num.className = "s936-ch-num"; num.textContent = barIndex + 1;
    head.appendChild(num);

    // Cabecera flotante de acordes
    const chordsRow = document.createElement("div");
    chordsRow.className = "s936-ch-bar-chords";
    const refChordName = beatsData[barIndex + "_0"] || (isFirst && barInfo?.chord?.name) || "";
    for (let b = 0; b < 4; b++) {
      const cell = document.createElement("div");
      let bVal = beatsData[barIndex + "_" + b] || (b === 0 ? refChordName : "");
      if (bVal && (b === 0 || bVal !== beatsData[barIndex + "_" + (b-1)])) {
        const p = parseChord(bVal);
        if (p) {
          const wrp = document.createElement("div"); wrp.className = "s936-chord-label-wrp";
          const r = document.createElement("span"); r.className = "s936-ch-bar-root"; r.textContent = p.root;
          const q = document.createElement("sup"); q.className = "s936-ch-bar-qual"; q.textContent = p.qual;
          wrp.append(r, q);
          cell.appendChild(wrp);
        }
      }
      chordsRow.appendChild(cell);
    }
    head.appendChild(chordsRow);
    bar.appendChild(head);

    const beatsRow = document.createElement("div");
    beatsRow.className = "s936-ch-beats";
    for (let b = 0; b < 4; b++) {
      beatsRow.appendChild(renderBeat(sectionKey, barIndex, b, beatsData[barIndex + "_" + b] || (b === 0 ? refChordName : ""), "", inst, voicingLibrary, onRerender));
    }
    bar.appendChild(beatsRow);
    return bar;
  }

  // ... (Resto de funciones: mountInRightPanel, unmountFromRightPanel, render, etc.) ...
  return { version: VERSION, render, mountInRightPanel, unmountFromRightPanel, highlightBar, isActive: () => _chartActive };
})();