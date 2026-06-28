// Studio 936 Composer - Chart View v1.5.5 (FIXED GUITAR/UKULELE)
window.Studio936SuiteProChart = (() => {
  "use strict";
  const VERSION = "chart-v1.5.5";
  const STYLE_ID = "s936-chart-v155";

  const INSTRUMENTS = [
    { id: "piano",   label: "Piano" },
    { id: "guitar",  label: "Guitarra" },
    { id: "ukulele", label: "Ukulele" },
    { id: "bass",    label: "Bajo" }
  ];

  let _chartInstrument = localStorage.getItem("s936_chart_inst_v1") || "piano";
  let _activeBeatEl = null;
  let _activeBarEl = null;

  // ─── ESTILOS ──────────────────────────────────────────────────────────────
  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = `
#s936-chart-view-panel{font-family:system-ui,sans-serif;color:#fff;isolation:isolate}

.s936-ch-head{
  display:flex;align-items:center;justify-content:space-between;
  padding:8px 14px 7px;border-bottom:1px solid rgba(255,255,255,.08);
  background:#0d0f18;position:sticky;top:0;z-index:10;gap:10px
}
.s936-ch-title{font-size:.72rem;font-weight:900;color:#00ffcc;text-transform:uppercase;letter-spacing:.8px}
.s936-ch-meta{font-size:.5rem;color:rgba(255,255,255,.35);margin-top:1px}

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

.s936-ch-body{padding:10px 10px 40px}

.s936-ch-sec{margin-bottom:18px}
.s936-ch-sec-hd{display:flex;align-items:center;gap:8px;margin-bottom:4px}
.s936-ch-sec-badge{
  background:rgba(255,224,102,.13);border:1px solid rgba(255,224,102,.4);
  border-radius:4px;color:#ffe066;font-size:.52rem;font-weight:900;
  padding:2px 8px;text-transform:uppercase;letter-spacing:.6px
}
.s936-ch-sec-info{color:rgba(255,255,255,.28);font-size:.46rem}

.s936-ch-line{
  display:grid;grid-template-columns:repeat(4,1fr);
  border-top:2px solid rgba(255,255,255,.25);margin-bottom:1px
}

.s936-ch-bar{
  border-right:1px solid rgba(255,255,255,.12);
  padding:2px 2px 4px 2px;position:relative;
  box-sizing:border-box;transition:background .1s;
  min-height:140px;
}
.s936-ch-bar:last-child{border-right:2px solid rgba(255,255,255,.3)}
.s936-ch-bar:hover{background:rgba(0,255,204,.03)}
.s936-ch-bar.s936-cb-active{background:rgba(0,255,204,.13)!important;outline:2px solid rgba(0,255,204,.45);outline-offset:-2px}
.s936-ch-bar.s936-cb-open::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:#ffe066;border-radius:0 2px 2px 0}

.s936-ch-num{font-size:.38rem;color:rgba(255,255,255,.22);font-weight:700;line-height:1;padding-left:4px;display:block}

.s936-ch-bar-head{
  padding:2px 4px 4px;
  min-height:20px;
  display:flex;
  align-items:center;
  justify-content:space-between;
}

.s936-ch-beats{display:grid;grid-template-columns:repeat(4,1fr);gap:3px;padding:0 2px}
.s936-ch-beat{
  background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);
  border-radius:4px;display:flex;flex-direction:column;
  padding:4px 3px 3px;cursor:pointer;
  transition:background .1s,border-color .1s;position:relative;min-width:0;
  min-height:120px;
}
.s936-ch-beat:hover{background:rgba(0,255,204,.1);border-color:rgba(0,255,204,.35)}
.s936-ch-beat.has-chord{background:rgba(0,255,204,.08);border-color:rgba(0,255,204,.28)}
.s936-ch-beat.active-beat{
  background:rgba(0,255,204,.25)!important;
  border-color:rgba(0,255,204,.8)!important;
  box-shadow:0 0 20px rgba(0,255,204,.3);
}

.s936-ch-beat-num{
  font-size:.34rem;
  color:rgba(255,255,255,.28);
  font-weight:700;
  line-height:1;
  margin-bottom:3px;
  text-align:center;
}

.s936-ch-beat-chord{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:1px;
  min-height:24px;
  margin-bottom:3px;
  padding:0 2px;
}
.s936-ch-beat-root{
  font-size:.85rem;
  font-weight:900;
  color:#fff;
  line-height:1.2;
}
.s936-ch-beat-qual{
  font-size:.48rem;
  font-weight:700;
  color:rgba(255,255,255,.6);
  vertical-align:super;
  line-height:1;
}
.s936-ch-beat-bass{
  font-size:.4rem;
  color:#ff5bea;
  font-weight:700;
}
.s936-ch-beat-empty-label{
  font-size:.6rem;
  color:rgba(255,255,255,.15);
  font-weight:400;
  text-align:center;
}

.s936-ch-beat-voicing{
  flex:1;
  display:flex;
  align-items:center;
  justify-content:center;
  min-height:40px;
  margin-top:2px;
  padding:2px 0;
  width:100%;
}

.s936-ch-piano-mini{
  height:40px;
  width:100%;
  position:relative;
  border:1px solid rgba(255,255,255,.2);
  border-radius:3px;
  overflow:hidden;
  background:#1e1e1e;
}
.s936-ch-pw{position:absolute;top:0;bottom:0;box-sizing:border-box}
.s936-ch-pw.white-k{
  background:#ccc;
  border-right:1px solid #666;
}
.s936-ch-pw.black-k{
  background:#1a1a1a;
  z-index:2;
  top:0;
  height:60%;
  border-radius:0 0 2px 2px;
  border:1px solid #555;
}
.s936-ch-pw.hit-k{
  background:#00ffcc!important;
  box-shadow:0 0 8px rgba(0,255,204,.9);
}

.s936-ch-fret-mini{
  height:40px;
  width:100%;
  position:relative;
  border:1px solid rgba(86,96,106,.5);
  border-radius:3px;
  overflow:hidden;
  background:linear-gradient(90deg,rgba(139,91,49,.4),rgba(70,45,26,.2));
}
.s936-ch-fs{position:absolute;left:2%;right:0;height:1px;background:rgba(200,180,140,.5)}
.s936-ch-ff{position:absolute;top:0;bottom:0;width:1px;background:rgba(255,255,255,.15)}
.s936-ch-fd{
  position:absolute;
  width:8px;
  height:8px;
  border-radius:50%;
  background:#00ffcc;
  transform:translate(-50%,-50%);
  box-shadow:0 0 6px rgba(0,255,204,.7);
  z-index:3;
}
.s936-ch-fm{position:absolute;color:rgba(255,80,80,.8);font-size:.5rem;font-weight:900;transform:translateX(-50%)}
.s936-ch-capo{position:absolute;left:0;top:0;bottom:0;width:3px;background:rgba(255,224,102,.6);border-radius:0 2px 2px 0}

/* ── POPUP ── */
.s936-ch-pop{
  position:fixed !important;
  background:#0e1320;
  border:1px solid rgba(0,255,204,.45);
  border-radius:10px;
  padding:10px;
  box-shadow:0 12px 40px rgba(0,0,0,.95);
  z-index:9999;
  width:220px;
  max-height:90vh;
  overflow-y:auto;
}
.s936-ch-pop label{font-size:.42rem;color:rgba(0,255,204,.6);text-transform:uppercase;letter-spacing:.6px;font-weight:700;display:block;margin-bottom:3px}
.s936-picker-preview{
  font-size:1.1rem;
  font-weight:900;
  color:#00ffcc;
  text-align:center;
  padding:6px;
  background:rgba(0,255,204,.08);
  border-radius:5px;
  margin-bottom:6px;
  min-height:32px;
  display:flex;
  align-items:center;
  justify-content:center;
  border:1px solid rgba(0,255,204,.3);
}
.s936-picker-preview.empty{color:rgba(255,255,255,.25);border-color:rgba(255,255,255,.1)}
.s936-picker-roots{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:4px}
.s936-picker-btn{
  background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);
  border-radius:4px;color:rgba(255,255,255,.75);font-size:.58rem;font-weight:700;
  padding:4px 2px;cursor:pointer;text-align:center;transition:all .1s
}
.s936-picker-btn:hover{background:rgba(0,255,204,.14);border-color:rgba(0,255,204,.4);color:#00ffcc}
.s936-picker-btn.sel{background:rgba(0,255,204,.22);border-color:#00ffcc;color:#00ffcc}
.s936-picker-acc{display:flex;gap:3px;margin-bottom:5px}
.s936-picker-acc .s936-picker-btn{flex:1;font-size:.52rem}
.s936-picker-quals{display:grid;grid-template-columns:repeat(4,1fr);gap:2px;margin-bottom:5px}
.s936-picker-quals .s936-picker-btn{font-size:.48rem;padding:4px 2px}
.s936-picker-acts{display:flex;gap:4px}
.s936-picker-ok{
  flex:1;background:rgba(0,255,204,.18);border:1px solid rgba(0,255,204,.4);
  border-radius:5px;color:#bfffee;font-size:.55rem;font-weight:700;padding:6px;cursor:pointer
}
.s936-picker-del{
  background:rgba(255,80,80,.12);border:1px solid rgba(255,80,80,.35);
  border-radius:5px;color:#ff8080;font-size:.55rem;font-weight:700;padding:6px 10px;cursor:pointer
}
#s936-ch-pop-overlay{
  position:fixed;
  inset:0;
  z-index:9998;
}

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

  const PC = {C:0,"C#":1,DB:1,D:2,"D#":3,EB:3,E:4,FB:4,"E#":5,F:5,"F#":6,GB:6,G:7,"G#":8,AB:8,A:9,"A#":10,BB:10,B:11,CB:11,"B#":0};
  function chordPitchClasses(chordName) {
    if (!chordName) return new Set();
    const MT = window.Studio936MusicTheory;
    if (MT?.chordVoicing) {
      try {
        const notes = MT.chordVoicing(chordName);
        const pcs = new Set(
          notes.split(" ").map(n => {
            const m2 = n.match(/^([A-G][b#]?)/i);
            if (!m2) return -1;
            return PC[m2[1].toUpperCase().replace("b","B")] ?? -1;
          }).filter(p => p >= 0)
        );
        return pcs;
      } catch(_) {}
    }
    const m = String(chordName).match(/^([A-G][b#]?)(.*)/);
    if (!m) return new Set();
    const rootPc = PC[m[1].toUpperCase().replace("b","B")] ?? 0;
    const qual = m[2].toLowerCase();
    let ints = [0, 4, 7];
    if (qual.includes("m") && !qual.includes("maj")) ints = [0, 3, 7];
    if (qual.includes("dim")) ints = [0, 3, 6];
    if (qual.includes("aug")) ints = [0, 4, 8];
    if (qual.includes("sus4")) ints = [0, 5, 7];
    if (qual.includes("sus2")) ints = [0, 2, 7];
    if (qual.includes("7")) ints.push(qual.includes("maj") ? 11 : 10);
    if (qual.includes("9")) ints.push(2);
    if (qual.includes("11")) ints.push(5);
    if (qual.includes("13")) ints.push(9);
    if (qual.includes("6") && !qual.includes("13")) ints.push(9);
    return new Set(ints.map(i => ((rootPc + i) % 12 + 12) % 12));
  }

  // ─── VOICINGS ─────────────────────────────────────────────────────────────
  const GUITAR_SHAPES = {
    "C":[null,3,2,0,1,0],"C#":[null,4,3,1,2,1],"DB":[null,4,3,1,2,1],
    "D":[null,null,0,2,3,2],"D#":[null,null,1,3,4,3],"EB":[null,null,1,3,4,3],
    "E":[0,2,2,1,0,0],"F":[1,3,3,2,1,1],"F#":[2,4,4,3,2,2],"GB":[2,4,4,3,2,2],
    "G":[3,2,0,0,0,3],"G#":[4,3,1,1,1,4],"AB":[4,3,1,1,1,4],
    "A":[null,0,2,2,2,0],"A#":[null,1,3,3,3,1],"BB":[null,1,3,3,3,1],
    "B":[null,2,4,4,4,2],
    "Cm":[null,3,2,0,1,0],"C#m":[null,4,2,1,2,0],"Dbm":[null,4,2,1,2,0],
    "Dm":[null,null,0,2,3,1],"D#m":[null,null,1,3,4,2],"Ebm":[null,null,1,3,4,2],
    "Em":[0,2,2,0,0,0],"Fm":[1,3,3,1,1,1],"F#m":[2,4,4,2,2,2],"Gbm":[2,4,4,2,2,2],
    "Gm":[3,5,5,3,3,3],"G#m":[4,3,1,1,0,4],"Abm":[4,3,1,1,0,4],
    "Am":[null,0,2,2,1,0],"A#m":[null,1,3,3,2,1],"Bbm":[null,1,3,3,2,1],
    "Bm":[null,2,4,4,3,2],
    "C7":[null,3,2,3,1,0],"D7":[null,null,0,2,1,2],"E7":[0,2,0,1,0,0],
    "F7":[1,3,1,2,1,1],"G7":[3,2,0,0,0,1],"A7":[null,0,2,0,2,0],"B7":[null,2,1,2,0,2],
    "Cm7":[null,3,2,3,1,3],"Dm7":[null,null,0,2,1,1],"Em7":[0,2,0,0,0,0],
    "Fm7":[1,3,1,1,1,1],"Gm7":[3,2,0,0,3,1],"Am7":[null,0,2,0,1,0],"Bm7":[null,2,4,2,3,2],
    "Cmaj7":[null,3,2,0,0,0],"Dmaj7":[null,null,0,2,2,2],"Emaj7":[0,2,1,1,0,0],
    "Fmaj7":[null,null,3,2,1,0],"Gmaj7":[3,2,0,0,0,2],"Amaj7":[null,0,2,1,2,0],"Bmaj7":[null,2,4,3,4,2],
    "Csus2":[null,3,0,0,1,3],"Dsus2":[null,null,0,2,3,0],"Gsus2":[3,0,0,2,3,3],
    "Asus2":[null,0,2,2,0,0],"Csus4":[null,3,3,0,1,1],"Dsus4":[null,null,0,2,3,3],
    "Esus4":[0,2,2,2,0,0],"Gsus4":[3,3,0,0,1,3],"Asus4":[null,0,2,2,3,0],
    "Cadd9":[null,3,2,0,3,0],"Dadd9":[null,null,0,4,3,0],"Gadd9":[3,0,0,0,3,3],
    "Eadd9":[0,2,2,1,0,0],"Aadd9":[null,0,2,4,2,0],
    "C6":[null,3,2,0,0,0],"D6":[null,null,0,2,0,2],"E6":[0,2,2,1,2,0],
    "G6":[3,2,0,0,0,0],"A6":[null,0,2,2,2,2],
    "Cdim":[null,3,2,3,1,3],"Gdim":[3,2,3,0,3,1],
    "Caug":[null,3,2,1,1,0],"Eaug":[0,3,2,1,0,0],"Gaug":[3,2,1,0,3,0],
  };

  const UKU_SHAPES = {
    "C":[0,0,0,3],"D":[2,2,2,0],"E":[4,4,4,2],"F":[2,0,1,0],"G":[0,2,3,2],
    "A":[2,1,0,0],"B":[4,3,2,2],
    "Cm":[0,3,3,3],"Dm":[2,2,1,0],"Em":[0,4,3,2],"Fm":[1,0,1,3],"Gm":[0,2,3,1],
    "Am":[2,0,0,0],"Bm":[4,2,2,2],
    "C7":[0,0,0,1],"D7":[2,2,2,3],"E7":[1,2,0,2],"F7":[2,3,1,3],"G7":[0,2,1,2],
    "A7":[0,1,0,0],"B7":[2,3,2,2],
    "Cmaj7":[0,0,0,2],"Fmaj7":[2,4,1,3],"Gmaj7":[0,2,2,2],"Amaj7":[1,1,0,0],
    "Cm7":[0,3,3,3],"Dm7":[2,2,1,3],"Em7":[0,2,0,2],"Fm7":[1,0,1,1],"Am7":[0,0,0,0],
  };

  function bassShape(chordName) {
    const PC2 = {C:0,"C#":1,DB:1,D:2,"D#":3,EB:3,E:4,F:5,"F#":6,GB:6,G:7,"G#":8,AB:8,A:9,"A#":10,BB:10,B:11};
    const m = String(chordName).match(/^([A-G][b#]?)/i);
    if (!m) return null;
    const rootPc = PC2[m[1].toUpperCase().replace("b","B")] ?? 0;
    const openMidis = [28, 33, 38, 43];
    const frets = openMidis.map(open => {
      let f = ((rootPc - (open % 12) + 12) % 12);
      if (f > 7) f -= 12;
      return f < 0 ? f + 12 : f;
    });
    const best = frets.reduce((bi, f, i) => f <= 4 && (bi === -1 || f < frets[bi]) ? i : bi, -1);
    return frets.map((f, i) => i === best ? f : (f <= 4 ? f : null));
  }

  // ─── PARCHE: calcFretVoicing MEJORADO ────────────────────────────────────
  function calcFretVoicing(chordName, inst) {
    if (!chordName) return null;
    
    let cleanName = String(chordName).toUpperCase().trim().replace(/\s+/g, "");
    
    if (cleanName.includes('/')) {
      cleanName = cleanName.split('/')[0];
    }
    
    const normalizeMap = {
      'MAJ': 'MAJ7',
      'MIN': 'M',
      'MIN7': 'M7',
      'MINOR': 'M',
      'MAJOR': 'MAJ7',
      'DIM': 'DIM',
      'AUG': 'AUG',
      'SUS': 'SUS'
    };
    
    for (const [key, val] of Object.entries(normalizeMap)) {
      if (cleanName.includes(key) && !cleanName.includes('M7') && !cleanName.includes('MAJ7')) {
        cleanName = cleanName.replace(key, val);
      }
    }
    
    let baseName = cleanName.replace(/[0-9]/g, '');
    if (baseName.endsWith('M') && !baseName.endsWith('M7') && baseName.length > 1) {
      baseName = baseName.slice(0, -1) + 'MAJ7';
    }
    
    if (inst === "guitar") {
      let shape = GUITAR_SHAPES[cleanName];
      if (!shape) shape = GUITAR_SHAPES[baseName];
      if (!shape) {
        const simple = cleanName.replace(/[#b]/g, '');
        shape = GUITAR_SHAPES[simple];
      }
      if (!shape) {
        const rootMatch = cleanName.match(/^[A-G][#b]?/);
        if (rootMatch) {
          shape = GUITAR_SHAPES[rootMatch[0]];
        }
      }
      if (!shape) {
        const root = cleanName.match(/^[A-G][#b]?/);
        if (root) {
          const defaultShapes = {
            'C': [null,3,2,0,1,0], 'D': [null,null,0,2,3,2], 'E': [0,2,2,1,0,0],
            'F': [1,3,3,2,1,1], 'G': [3,2,0,0,0,3], 'A': [null,0,2,2,2,0],
            'B': [null,2,4,4,4,2], 'C#': [null,4,3,1,2,1], 'F#': [2,4,4,3,2,2],
            'G#': [4,3,1,1,1,4], 'A#': [null,1,3,3,3,1]
          };
          shape = defaultShapes[root[0]];
        }
      }
      return shape ? { frets: shape } : null;
    }
    
    if (inst === "ukulele") {
      let shape = UKU_SHAPES[cleanName];
      if (!shape) shape = UKU_SHAPES[baseName];
      if (!shape) {
        const simple = cleanName.replace(/[#b]/g, '');
        shape = UKU_SHAPES[simple];
      }
      if (!shape) {
        const rootMatch = cleanName.match(/^[A-G][#b]?/);
        if (rootMatch) {
          shape = UKU_SHAPES[rootMatch[0]];
        }
      }
      if (!shape) {
        const root = cleanName.match(/^[A-G][#b]?/);
        if (root) {
          const defaultShapes = {
            'C': [0,0,0,3], 'D': [2,2,2,0], 'E': [4,4,4,2], 'F': [2,0,1,0],
            'G': [0,2,3,2], 'A': [2,1,0,0], 'B': [4,3,2,2]
          };
          shape = defaultShapes[root[0]];
        }
      }
      return shape ? { frets: shape } : null;
    }
    
    if (inst === "bass") {
      const shape = bassShape(chordName);
      return shape ? { frets: shape } : null;
    }
    return null;
  }

  // ─── FIGURAS ──────────────────────────────────────────────────────────────
  function noteSVG(type) {
    const H = "#e8e8e8";
    if (type === "whole")
      return `<svg width="12" height="16" viewBox="0 0 12 16"><ellipse cx="6" cy="12" rx="5" ry="3" fill="none" stroke="${H}" stroke-width="1.4"/></svg>`;
    if (type === "half")
      return `<svg width="10" height="16" viewBox="0 0 10 16"><ellipse cx="5" cy="12" rx="4" ry="2.5" fill="none" stroke="${H}" stroke-width="1.3"/><line x1="8.8" y1="12" x2="8.8" y2="1.5" stroke="${H}" stroke-width="1.3"/></svg>`;
    if (type === "quarter")
      return `<svg width="10" height="16" viewBox="0 0 10 16"><ellipse cx="5" cy="12" rx="4" ry="2.5" fill="${H}" stroke="${H}" stroke-width="1"/><line x1="8.8" y1="12" x2="8.8" y2="1.5" stroke="${H}" stroke-width="1.3"/></svg>`;
    return "";
  }

  function rhythmFig(totalBars) {
    if (totalBars >= 4) return "whole";
    if (totalBars === 3) return "half";
    if (totalBars === 2) return "half";
    return "quarter";
  }

  // ─── MINI PIANO ──────────────────────────────────────────────────────────
  const WK = [0,2,4,5,7,9,11];
  const BK = [1,3,6,8,10];
  const BK_POS = { 1:1/7, 3:2/7, 6:4/7, 8:5/7, 10:6/7 };

  function miniPiano(voicingPiano, chordName) {
    const wrap = document.createElement("div");
    wrap.className = "s936-ch-piano-mini";

    let hitPcs;
    if (Array.isArray(voicingPiano?.midis) && voicingPiano.midis.length > 0) {
      hitPcs = new Set(voicingPiano.midis.map(m => ((m % 12) + 12) % 12));
    } else if (chordName) {
      hitPcs = chordPitchClasses(chordName);
    } else {
      hitPcs = new Set();
    }

    const wkW = 100 / 7;

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
    wrap.className = "s936-ch-fret-mini";

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

    if (capo > 0) {
      const c = document.createElement("div");
      c.className = "s936-ch-capo";
      wrap.appendChild(c);
    }

    for (let s = 0; s < strings; s++) {
      const el = document.createElement("div");
      el.className = "s936-ch-fs";
      el.style.top = ((s + 0.5) / strings * 100) + "%";
      wrap.appendChild(el);
    }

    for (let f = 0; f <= span; f++) {
      const el = document.createElement("div");
      el.className = "s936-ch-ff";
      el.style.cssText = `left:${8 + f / span * 88}%;z-index:1`;
      wrap.appendChild(el);
    }

    frets.forEach((fret, si) => {
      const top = (si + 0.5) / strings * 100;
      const strF = String(fret).toUpperCase();
      if (fret === null || strF === "X") {
        const m = document.createElement("div");
        m.className = "s936-ch-fm";
        m.textContent = "×";
        m.style.cssText = `top:${top}%;left:4%;z-index:2`;
        wrap.appendChild(m);
      } else {
        const f0 = Number(fret);
        const leftPct = f0 === 0 ? 4 : 8 + ((f0 - start + 0.5) / span) * 88;
        const dot = document.createElement("div");
        dot.className = "s936-ch-fd";
        dot.style.cssText = `top:${top}%;left:${leftPct}%;z-index:3`;
        wrap.appendChild(dot);
      }
    });

    return wrap;
  }

  // ─── POPUP ────────────────────────────────────────────────────────────────
  function closePopups() {
    document.querySelectorAll(".s936-ch-pop").forEach(p => p.remove());
    const ov = document.getElementById("s936-ch-pop-overlay");
    if (ov) ov.remove();
  }

  function showBeatPop(targetEl, label, currentVal, onSave) {
    closePopups();

    const ROOTS = ["C","D","E","F","G","A","B"];
    const ACCS  = ["♮","#","b"];
    const QUALS = [
      ["",      "Mayor"],
      ["m",     "Menor"],
      ["7",     "Dom 7"],
      ["m7",    "m7"],
      ["maj7",  "Maj7"],
      ["m7b5",  "m7b5"],
      ["dim",   "Dim"],
      ["dim7",  "Dim7"],
      ["aug",   "Aug"],
      ["sus4",  "Sus4"],
      ["sus2",  "Sus2"],
      ["9",     "9"],
      ["m9",    "m9"],
      ["maj9",  "Maj9"],
      ["11",    "11"],
      ["13",    "13"],
      ["add9",  "add9"],
      ["6",     "6"],
      ["m6",    "m6"],
      ["5",     "5 (power)"],
    ];

    const initM = currentVal ? String(currentVal).match(/^([A-G])(#|b)?(.*)$/) : null;
    let selRoot = initM ? initM[1] : "C";
    let selAcc  = initM ? (initM[2] || "♮") : "♮";
    let selQual = initM ? (initM[3] || "") : "";

    const overlay = document.createElement("div");
    overlay.id = "s936-ch-pop-overlay";
    overlay.onclick = () => { overlay.remove(); pop.remove(); };

    const pop = document.createElement("div");
    pop.className = "s936-ch-pop";
    const rect = targetEl.getBoundingClientRect();
    const popW = 220;
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - popW - 8);
    const top = rect.bottom + 4 < window.innerHeight - 300 ? rect.bottom + 4 : rect.top - 280;
    pop.style.cssText = `left:${left}px;top:${top}px;width:${popW}px;`;
    pop.onclick = (e) => e.stopPropagation();

    const lbl = document.createElement("div");
    lbl.className = "s936-picker-label";
    lbl.textContent = label;
    pop.appendChild(lbl);

    const preview = document.createElement("div");
    preview.className = "s936-picker-preview";
    pop.appendChild(preview);

    function buildChordName() {
      if (!selRoot) return "";
      const acc = selAcc === "♮" ? "" : selAcc;
      return selRoot + acc + selQual;
    }

    function refreshPreview() {
      const name = buildChordName();
      preview.textContent = name || "—";
      preview.className = "s936-picker-preview" + (name ? " has-chord" : " empty");
    }

    const rootLbl = document.createElement("div");
    rootLbl.className = "s936-picker-label";
    rootLbl.textContent = "Nota";
    pop.appendChild(rootLbl);

    const rootGrid = document.createElement("div");
    rootGrid.className = "s936-picker-roots";
    const rootBtns = {};
    ROOTS.forEach(r => {
      const btn = document.createElement("button");
      btn.className = "s936-picker-btn" + (r === selRoot ? " sel" : "");
      btn.textContent = r;
      btn.onclick = (e) => {
        e.stopPropagation();
        selRoot = r;
        Object.values(rootBtns).forEach(b => b.classList.remove("sel"));
        btn.classList.add("sel");
        refreshPreview();
      };
      rootBtns[r] = btn;
      rootGrid.appendChild(btn);
    });
    pop.appendChild(rootGrid);

    const accLbl = document.createElement("div");
    accLbl.className = "s936-picker-label";
    accLbl.textContent = "Alteración";
    pop.appendChild(accLbl);

    const accRow = document.createElement("div");
    accRow.className = "s936-picker-acc";
    const accBtns = {};
    ACCS.forEach(a => {
      const btn = document.createElement("button");
      btn.className = "s936-picker-btn" + (a === selAcc ? " sel" : "");
      btn.textContent = a === "♮" ? "Natural" : (a === "#" ? "#" : "b");
      btn.onclick = (e) => {
        e.stopPropagation();
        selAcc = a;
        Object.values(accBtns).forEach(b => b.classList.remove("sel"));
        btn.classList.add("sel");
        refreshPreview();
      };
      accBtns[a] = btn;
      accRow.appendChild(btn);
    });
    pop.appendChild(accRow);

    const qualLbl = document.createElement("div");
    qualLbl.className = "s936-picker-label";
    qualLbl.textContent = "Calidad";
    pop.appendChild(qualLbl);

    const qualGrid = document.createElement("div");
    qualGrid.className = "s936-picker-quals";
    const qualBtns = {};
    QUALS.forEach(([q, lbTxt]) => {
      const btn = document.createElement("button");
      btn.className = "s936-picker-btn" + (q === selQual ? " sel" : "");
      btn.textContent = lbTxt;
      btn.onclick = (e) => {
        e.stopPropagation();
        selQual = q;
        Object.values(qualBtns).forEach(b => b.classList.remove("sel"));
        btn.classList.add("sel");
        refreshPreview();
      };
      qualBtns[q] = btn;
      qualGrid.appendChild(btn);
    });
    pop.appendChild(qualGrid);

    const acts = document.createElement("div");
    acts.className = "s936-picker-acts";
    const okBtn = document.createElement("button");
    okBtn.className = "s936-picker-ok";
    okBtn.textContent = "✓ Aplicar";
    const delBtn = document.createElement("button");
    delBtn.className = "s936-picker-del";
    delBtn.textContent = "Borrar";
    acts.append(okBtn, delBtn);
    pop.appendChild(acts);

    refreshPreview();

    const doSave = (val) => { overlay.remove(); pop.remove(); onSave(val); };
    okBtn.onclick = (e) => { e.stopPropagation(); doSave(buildChordName()); };
    delBtn.onclick = (e) => { e.stopPropagation(); doSave(""); };

    document.addEventListener("keydown", function esc(e) {
      if (e.key === "Escape") { overlay.remove(); pop.remove(); document.removeEventListener("keydown", esc); }
    });

    document.body.appendChild(overlay);
    document.body.appendChild(pop);
  }

  // ─── RENDER BEAT ──────────────────────────────────────────────────────────
  function renderBeat(sectionKey, barIndex, beatIndex, beatVal, inst, voicingLibrary, onRerender) {
    const parsed = parseChord(beatVal);
    const cell = document.createElement("div");
    cell.className = "s936-ch-beat" + (parsed ? " has-chord" : "");
    cell.dataset.section = sectionKey;
    cell.dataset.bar = barIndex;
    cell.dataset.beat = beatIndex;

    const num = document.createElement("span");
    num.className = "s936-ch-beat-num";
    num.textContent = beatIndex + 1;
    cell.appendChild(num);

    const chordRow = document.createElement("div");
    chordRow.className = "s936-ch-beat-chord";
    
    if (parsed) {
      const r = document.createElement("span");
      r.className = "s936-ch-beat-root";
      r.textContent = parsed.root;
      const q = document.createElement("sup");
      q.className = "s936-ch-beat-qual";
      q.textContent = parsed.qual;
      chordRow.append(r, q);
      if (parsed.bass) {
        const b = document.createElement("span");
        b.className = "s936-ch-beat-bass";
        b.textContent = "/" + parsed.bass;
        chordRow.appendChild(b);
      }
    } else {
      const empty = document.createElement("span");
      empty.className = "s936-ch-beat-empty-label";
      empty.textContent = "—";
      chordRow.appendChild(empty);
    }
    cell.appendChild(chordRow);

    // ─── VOICING ────────────────────────────────────────────────────────────
    const voicingContainer = document.createElement("div");
    voicingContainer.className = "s936-ch-beat-voicing";

    if (parsed) {
      const chordName = parsed.root + parsed.qual;
      const nameUpper = chordName.toUpperCase().trim();
      
      if (inst === "piano") {
        const savedVoicing = voicingLibrary?.[inst]?.[nameUpper] || null;
        voicingContainer.appendChild(miniPiano(savedVoicing, chordName));
      } else {
        // Buscar en librería guardada
        let savedVoicing = voicingLibrary?.[inst]?.[nameUpper];
        let fretVoicing = null;
        
        if (savedVoicing) {
          fretVoicing = savedVoicing;
        } else {
          // Calcular con la función mejorada
          fretVoicing = calcFretVoicing(chordName, inst);
        }
        voicingContainer.appendChild(miniFret(fretVoicing));
      }
    }
    cell.appendChild(voicingContainer);

    cell.addEventListener("click", e => {
      e.stopPropagation();
      const label = beatVal ? "Editar acorde" : "Añadir acorde";
      showBeatPop(cell, label + " · Tiempo " + (beatIndex + 1), beatVal, val => {
        saveBeat(sectionKey, barIndex, beatIndex, val);
        onRerender();
      });
    });

    return cell;
  }

  // ─── RENDER COMPÁS ───────────────────────────────────────────────────────
  function renderBar({ barIndex, sectionKey, beatsData, barInfo, inst, voicingLibrary, onRerender }) {
    const bar = document.createElement("div");
    bar.className = "s936-ch-bar" + (barIndex === 0 ? " s936-cb-open" : "");
    bar.dataset.section = sectionKey;
    bar.dataset.bar = barIndex;

    const head = document.createElement("div");
    head.className = "s936-ch-bar-head";
    const num = document.createElement("span");
    num.className = "s936-ch-num";
    num.textContent = barIndex + 1;
    head.appendChild(num);

    if (barInfo?.isFirst && barInfo?.chord) {
      const fig = document.createElement("span");
      fig.className = "s936-ch-bar-fig";
      fig.innerHTML = noteSVG(rhythmFig(barInfo.totalBars));
      head.appendChild(fig);
    }
    bar.appendChild(head);

    const beatsRow = document.createElement("div");
    beatsRow.className = "s936-ch-beats";

    for (let b = 0; b < 4; b++) {
      const bKey = barIndex + "_" + b;
      let bVal = beatsData[bKey] || "";
      
      if (b === 0 && !bVal && barInfo?.isFirst) {
        bVal = barInfo.chord?.name || "";
      }
      
      beatsRow.appendChild(renderBeat(
        sectionKey, barIndex, b, bVal, inst, voicingLibrary, onRerender
      ));
    }
    bar.appendChild(beatsRow);

    return bar;
  }

  // ─── RENDER PRINCIPAL ─────────────────────────────────────────────────────
  function render({ container, instrument, onChordEdit } = {}) {
    if (!container) return;
    installStyles();
    container.innerHTML = "";
    _activeBarEl = null;
    _activeBeatEl = null;

    const inst = instrument || _chartInstrument || "piano";
    _chartInstrument = inst;

    const bridge = window.Studio936AppBridge;
    if (!bridge) return;

    const arrangement = bridge.getArrangement?.() || [];
    const edState = bridge.getEditorState?.() || {};
    const sections = edState.sections || {};
    const voicingLibrary = edState.voicingLibrary || {};

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

    // Header
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

      prepopulate(item.section, chords);
      let beatsData = getBeatsData(item.section);

      // PATCH: Herencia de acordes
      if (Object.keys(beatsData).length === 0 && chords.length > 0) {
        beatsData = {};
        chords.forEach((chord, idx) => {
          const bars = Math.max(1, Number(chord.bars) || 1);
          beatsData[idx + "_0"] = chord.name || "";
        });
        try {
          const d = JSON.parse(localStorage.getItem("s936_chart_beats_v1") || "{}");
          d[item.section] = beatsData;
          localStorage.setItem("s936_chart_beats_v1", JSON.stringify(d));
        } catch(_) {}
      }

      const barMap = {};
      let bi = 0;
      chords.forEach(chord => {
        const bars = Math.max(1, Number(chord.bars) || 1);
        for (let k = 0; k < bars; k++) {
          barMap[bi + k] = { chord, totalBars: bars, isFirst: k === 0 };
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
            barIndex,
            sectionKey: item.section,
            beatsData,
            barInfo,
            inst,
            voicingLibrary,
            onRerender
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

  // ─── HIGHLIGHT PLAYBACK ──────────────────────────────────────────────────
  function highlightBeat(sectionKey, barIndex, beatIndex) {
    if (_activeBeatEl) {
      _activeBeatEl.classList.remove("active-beat");
    }
    if (_activeBarEl) {
      _activeBarEl.classList.remove("s936-cb-active");
    }

    const selector = `.s936-ch-beat[data-section="${sectionKey}"][data-bar="${barIndex}"][data-beat="${beatIndex}"]`;
    const beatEl = document.querySelector(selector);
    
    if (beatEl) {
      beatEl.classList.add("active-beat");
      _activeBeatEl = beatEl;
      
      const barEl = beatEl.closest(".s936-ch-bar");
      if (barEl) {
        barEl.classList.add("s936-cb-active");
        _activeBarEl = barEl;
        barEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }

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
    chartEl.style.isolation = "isolate";

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
          "border-radius:0 22px 22px 0","z-index:2",
          "isolation:isolate"
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
          "overflow-y:auto","background:#090b11","z-index:200",
          "isolation:isolate"
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
    _activeBeatEl = null;
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

  function downloadFile() {
    const content = document.getElementById("s936-chart-view-panel")?.outerHTML || "";
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "studio936-chart.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  window.highlightChartBeat = (section, bar, beat) => {
    const el = document.querySelector(
      `.s936-ch-beat[data-section="${section}"][data-bar="${bar}"][data-beat="${beat}"]`
    );
    if (el) {
      document.querySelectorAll('.s936-ch-beat.active-beat').forEach(b => b.classList.remove('active-beat'));
      el.classList.add('active-beat');
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  };

  return { 
    version: VERSION, 
    render, 
    mountInRightPanel, 
    unmountFromRightPanel, 
    highlightBar,
    highlightBeat,
    isActive: () => _chartActive,
    downloadFile 
  };
})();