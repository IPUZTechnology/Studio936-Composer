// Studio 936 — Pentagrama (notación tradicional) por sección, integrado a Vista Continua.
//
// Owner: Val trajo un prototipo aparte ("Studio936 DAW - Master Edition") con un
// pentagrama real dibujado en canvas (clave de sol, plicas, corcheas con corchete,
// líneas adicionales, barras de repetición), un algoritmo matemático de Auto-Acordes,
// y un "Oído IA" que transcribe voz/guitarra grabada a notas+acordes+secciones vía
// Gemini. Pidió mantener EXACTAMENTE ese diseño visual, pero puesto DEBAJO de Chart
// y de la letra/karaoke en Vista Continua, y HORIZONTAL a lo largo del tiempo real de
// la canción (el prototipo original lo dibujaba en sistemas verticales, como una
// partitura impresa) -- no como una página aparte con su propio estado, sino leyendo
// y escribiendo la sección REAL de la canción (misma instanceKey que ya usa
// track-recorder.js para Voz, para que "Coro"/"Coro BIS" no compartan pentagrama sin
// querer).
//
// Este es el PASO 1 (el más grande y la base de todo lo demás): el dibujo del
// pentagrama + poner notas a mano con clic, igual que el prototipo. Auto-Acordes y
// Oído IA llegan en commits siguientes, sobre esta misma base de datos.
(function () {
  'use strict';

  const PENTAGRAM_KEY = 's936_section_pentagram_v1';
  // Owner: BUG DE RAÍZ encontrado al verificar Auto-Acordes -- escribir
  // acordes solo en project.sections (vía el bridge) no bastaba, porque el
  // Chart (readStructureDraftSnapshot, mismo archivo que ya arregló el
  // Cambio 422) usa SIEMPRE el borrador de Estructura como fuente
  // PRIMARIA de acordes en cuanto existe (draft.clones[sección].items) --
  // project.sections queda como último recurso. Sin escribir acá también,
  // "Auto-Acordes" guardaba bien pero no se veía en pantalla. Se escribe
  // en los dos lugares para que se vea siempre, exista o no un borrador.
  const STRUCTURE_DRAFT_KEY = 's936_suitepro_structure_v4';
  const PX_PER_BAR = 320; // mismo ancho por compás que ya usa toda Vista Continua
  const LINE_GAP = 8;
  const TOP_PAD = 30;
  const WHITE_KEYS = [48,50,52,53,55,57,59,60,62,64,65,67,69,71,72,74,76,77,79,81,83,84,86,88,89,91,93,95,96];

  function readStore() {
    try { return JSON.parse(localStorage.getItem(PENTAGRAM_KEY) || '{}'); } catch (_) { return {}; }
  }
  function writeStore(store) {
    try { localStorage.setItem(PENTAGRAM_KEY, JSON.stringify(store)); } catch (_) {}
  }
  function getNotes(sectionKey) {
    const store = readStore();
    return (store[sectionKey] && Array.isArray(store[sectionKey].notes)) ? store[sectionKey].notes : [];
  }
  function setNotes(sectionKey, notes) {
    const store = readStore();
    store[sectionKey] = Object.assign({}, store[sectionKey], { notes, updatedAt: Date.now() });
    writeStore(store);
  }

  let selectedDuration = 1; // negra, igual que el prototipo (empieza en ♩)

  function getMidiYOffset(midi) {
    let closest = WHITE_KEYS.reduce((prev, curr) => Math.abs(curr - midi) < Math.abs(prev - midi) ? curr : prev);
    return WHITE_KEYS.indexOf(closest);
  }

  // Owner: mismo motor matemático de Auto-Acordes del prototipo (analiza qué notas
  // hay en un compás, pesa cada clase de tono por su duración, y arma el símbolo del
  // acorde según qué intervalos detecta contra la raíz). Se deja acá, listo para el
  // próximo commit que lo conecte al acorde real del Chart.
  function calculateChordForNotes(notes) {
    if (!notes || !notes.length) return '';
    const rootNames = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    const pitchWeights = {};
    notes.forEach(n => { const pc = n.midi % 12; pitchWeights[pc] = (pitchWeights[pc] || 0) + n.duration; });
    let rootPc = -1, maxWeight = -1;
    for (const pc in pitchWeights) { if (pitchWeights[pc] > maxWeight) { maxWeight = pitchWeights[pc]; rootPc = parseInt(pc); } }
    if (rootPc === -1) return '';
    const rootName = rootNames[rootPc];
    const hasInterval = (semi) => !!pitchWeights[(rootPc + semi) % 12];
    const min3 = hasInterval(3), maj3 = hasInterval(4), dim5 = hasInterval(6), min7 = hasInterval(10);
    const sus4 = hasInterval(5) && !min3 && !maj3, sus2 = hasInterval(2) && !min3 && !maj3;
    if (sus4) return rootName + 'sus4';
    if (sus2) return rootName + 'sus2';
    if (min3 && dim5) return rootName + 'dim';
    if (min3) return rootName + (min7 ? 'm7' : 'm');
    if (maj3) return rootName + (min7 ? '7' : 'maj7');
    return rootName + 'maj7';
  }

  // Owner: paso 2/3 -- toma las notas ya puestas a mano en el pentagrama de
  // ESTA sección (una repetición concreta, ej. "Coro BIS"), las agrupa por
  // compás, corre calculateChordForNotes() en cada uno, y arma la secuencia
  // de acordes final: un compás sin notas sostiene el acorde del compás
  // anterior (silencio = sigue sonando lo mismo), y compases consecutivos
  // con el mismo acorde se funden en una sola entrada más larga (igual que
  // ya hace el Chart con `bars` en cada acorde real).
  function computeChordsForSection(sectionKey, totalBars) {
    const notes = getNotes(sectionKey);
    if (!notes.length) return null;
    const midiToNote = (window.Studio936MusicTheory || {}).midiToNote || (m => 'C4');
    const perBar = [];
    for (let bar = 0; bar < totalBars; bar++) {
      const barNotes = notes.filter(n => n.bar === bar);
      perBar.push({ name: calculateChordForNotes(barNotes), barNotes });
    }
    let lastName = '';
    perBar.forEach(b => { if (b.name) lastName = b.name; else b.name = lastName || 'C'; });
    const chords = [];
    perBar.forEach(b => {
      const prev = chords[chords.length - 1];
      if (prev && prev.name === b.name) { prev.bars += 1; return; }
      const midis = b.barNotes.map(n => n.midi).sort((x, y) => x - y);
      const bass = midis.length ? midiToNote(midis[0]) : '';
      const notesStr = midis.length ? midis.map(midiToNote).join(' ') : '';
      chords.push({ name: b.name, bass, notes: notesStr, bars: 1 });
    });
    return chords;
  }

  // Owner: el pentagrama está guardado por instanceKey (cada repetición,
  // "Coro"/"Coro BIS", tiene sus propias notas), pero los acordes reales de
  // la canción se guardan por TIPO de sección compartido entre repeticiones
  // -- así ya funcionan Chart/Structure hoy (BIS secciones), así que
  // Auto-Acordes sigue esa misma regla en vez de inventar una nueva.
  function baseSectionType(instanceKey) {
    return String(instanceKey || '').split('__occ')[0];
  }

  function writeChordsIntoStructureDraft(sectionKey, chords) {
    try {
      const raw = JSON.parse(localStorage.getItem(STRUCTURE_DRAFT_KEY) || '{}');
      if (!raw.draft || typeof raw.draft !== 'object') return false;
      if (!raw.draft.clones || typeof raw.draft.clones !== 'object') raw.draft.clones = {};
      const prevSource = (raw.draft.clones[sectionKey] && raw.draft.clones[sectionKey].source) || '';
      raw.draft.clones[sectionKey] = {
        source: prevSource,
        items: chords.map(c => ({ name: c.name, bars: c.bars, bass: c.bass || '', notes: c.notes || '' })),
        createdAt: new Date().toISOString()
      };
      localStorage.setItem(STRUCTURE_DRAFT_KEY, JSON.stringify(raw));
      return true;
    } catch (_) { return false; }
  }

  function playPreviewNote(midi, durationSec) {
    try {
      const ctx = window.__studio936AudioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const osc1 = ctx.createOscillator(), osc2 = ctx.createOscillator();
      const gain = ctx.createGain(), filter = ctx.createBiquadFilter();
      osc1.type = 'sine'; osc2.type = 'triangle';
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      osc1.frequency.value = freq; osc2.frequency.value = freq * 1.003;
      filter.type = 'lowpass'; filter.frequency.value = 1400;
      osc1.connect(filter); osc2.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(durationSec, 0.3));
      osc1.start(now); osc2.start(now);
      osc1.stop(now + Math.max(durationSec, 0.3)); osc2.stop(now + Math.max(durationSec, 0.3));
    } catch (_) {}
  }

  function installStyles() {
    if (document.getElementById('s936pg-styles')) return;
    const style = document.createElement('style');
    style.id = 's936pg-styles';
    style.textContent = `
      .s936pg-wrap{position:relative;background:#0a0b10;border-top:1px solid rgba(255,255,255,.06);}
      .s936pg-canvas{display:block;height:96px;cursor:crosshair;}
      .s936pg-toolbar{position:fixed;z-index:9998;display:flex;align-items:center;gap:4px;background:rgba(10,11,16,.95);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:5px 8px;box-shadow:0 8px 24px rgba(0,0,0,.5);backdrop-filter:blur(6px);}
      .s936pg-toolbar-label{font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;opacity:.7;color:#c5c6c7;margin-right:2px;}
      .s936pg-figbtn{background:none;border:none;color:#c5c6c7;font-size:18px;padding:3px 6px;border-radius:5px;cursor:pointer;line-height:1;}
      .s936pg-figbtn:hover{background:rgba(255,255,255,.08);}
      .s936pg-figbtn.is-active{background:#2563eb;color:#fff;}
      .s936pg-drag{cursor:move;color:#7fa8a0;font-size:11px;padding:0 4px;}
      .s936pg-autochords{position:absolute;top:2px;left:2px;z-index:2;background:rgba(37,99,235,.85);color:#fff;border:none;border-radius:5px;font-size:10px;font-weight:700;letter-spacing:.02em;padding:2px 7px;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.35);}
      .s936pg-autochords:hover{background:#2563eb;}
      .s936pg-autochords.is-busy{opacity:.6;pointer-events:none;}
    `;
    document.head.appendChild(style);
  }

  function drawLedgerLines(g, midi, nx, c4Y, staffTop) {
    if (midi <= 60) {
      g.beginPath(); g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 1;
      g.moveTo(nx - 8, c4Y); g.lineTo(nx + 8, c4Y); g.stroke();
    } else if (midi >= 81) {
      const topLedger = staffTop - LINE_GAP;
      g.beginPath(); g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 1;
      g.moveTo(nx - 8, topLedger); g.lineTo(nx + 8, topLedger); g.stroke();
    }
  }

  function drawIndividualNotes(g, group, barStartX, c4Y, bottomLineY, staffTop) {
    group.forEach((note) => {
      const stepOffset = getMidiYOffset(note.midi);
      const nx = barStartX + note.beat * (PX_PER_BAR / 4) + 18;
      const ny = c4Y - stepOffset * (LINE_GAP / 2);
      drawLedgerLines(g, note.midi, nx, c4Y, staffTop);
      g.beginPath();
      if (note.duration >= 2) {
        g.ellipse(nx, ny, 5, 3.5, -0.2, 0, Math.PI * 2);
        g.strokeStyle = '#e2e8f0'; g.lineWidth = 2; g.stroke();
      } else {
        g.ellipse(nx, ny, 5, 3.5, -0.2, 0, Math.PI * 2);
        g.fillStyle = '#e2e8f0'; g.fill();
      }
      if (note.duration === 3 || note.duration === 1.5) {
        g.beginPath(); g.arc(nx + 10, ny, 2.5, 0, Math.PI * 2); g.fillStyle = '#e2e8f0'; g.fill();
      }
      if (note.duration < 4) {
        const stemsUp = note.midi < 71;
        const stemX = stemsUp ? nx + 4.5 : nx - 4.5;
        const stemYEnd = stemsUp ? ny - 25 : ny + 25;
        g.beginPath(); g.strokeStyle = '#e2e8f0'; g.lineWidth = 1.5;
        g.moveTo(stemX, ny); g.lineTo(stemX, stemYEnd); g.stroke();
      }
      if (note.syllable) {
        g.textAlign = 'center'; g.fillStyle = '#93c5fd'; g.font = 'bold 11px Inter, sans-serif';
        g.fillText(note.syllable, nx, bottomLineY + 26);
      }
    });
  }

  function drawBeamedGroup(g, group, barStartX, c4Y, bottomLineY, staffTop) {
    const avgMidi = group.reduce((sum, n) => sum + n.midi, 0) / group.length;
    const stemsUp = avgMidi < 71;
    const stemDir = stemsUp ? -1 : 1;
    const stemXOff = stemsUp ? 4.5 : -4.5;
    const beamHeight = 22;
    const beamPoints = [];
    let firstNx = 0, lastNx = 0;
    group.forEach((note, idx) => {
      const stepOffset = getMidiYOffset(note.midi);
      const nx = barStartX + note.beat * (PX_PER_BAR / 4) + 18;
      if (idx === 0) firstNx = nx;
      if (idx === group.length - 1) lastNx = nx;
      const ny = c4Y - stepOffset * (LINE_GAP / 2);
      drawLedgerLines(g, note.midi, nx, c4Y, staffTop);
      g.beginPath();
      g.ellipse(nx, ny, 5, 3.5, -0.2, 0, Math.PI * 2);
      g.fillStyle = '#e2e8f0'; g.fill();
      const stemEnd = ny + beamHeight * stemDir;
      g.beginPath(); g.strokeStyle = '#e2e8f0'; g.lineWidth = 1.5;
      g.moveTo(nx + stemXOff, ny); g.lineTo(nx + stemXOff, stemEnd); g.stroke();
      beamPoints.push({ x: nx + stemXOff, y: stemEnd });
    });
    g.beginPath(); g.strokeStyle = '#e2e8f0'; g.lineWidth = 4;
    g.moveTo(beamPoints[0].x, beamPoints[0].y);
    g.lineTo(beamPoints[beamPoints.length - 1].x, beamPoints[beamPoints.length - 1].y);
    g.stroke();
    const first = group[0];
    if (first.syllable) {
      g.textAlign = 'center'; g.fillStyle = '#93c5fd'; g.font = 'bold 11px Inter, sans-serif';
      g.fillText(first.syllable, (firstNx + lastNx) / 2, bottomLineY + 26);
    }
  }

  // Owner: dibuja el pentagrama en UNA sola fila horizontal a lo largo de TODA la
  // sección (a diferencia del prototipo original, que lo partía en sistemas
  // verticales de 4 compases -- acá tiene que alinear con Chart/Lyric/Voz, que ya
  // son horizontales, 320px por compás).
  function drawPentagram(canvas, notes, totalBars) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const g = canvas.getContext('2d');
    g.scale(dpr, dpr);
    g.clearRect(0, 0, w, h);

    const staffTop = TOP_PAD;
    const bottomLineY = staffTop + 4 * LINE_GAP;
    const c4Y = bottomLineY + LINE_GAP;

    g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 1;
    g.beginPath();
    for (let i = 0; i < 5; i++) { const ly = staffTop + i * LINE_GAP; g.moveTo(0, ly); g.lineTo(w, ly); }
    g.stroke();

    g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '26px serif'; g.textAlign = 'left';
    g.fillText('𝄞', 2, bottomLineY + 4);

    g.strokeStyle = 'rgba(255,255,255,.12)';
    for (let b = 0; b <= totalBars; b++) {
      const x = b * PX_PER_BAR;
      g.beginPath(); g.moveTo(x, staffTop); g.lineTo(x, bottomLineY); g.stroke();
    }

    for (let bar = 0; bar < totalBars; bar++) {
      const barNotes = notes.filter(n => n.bar === bar);
      const beats = { 0: [], 1: [], 2: [], 3: [] };
      barNotes.forEach(n => { const bi = Math.floor(n.beat); if (bi >= 0 && bi <= 3) beats[bi].push(n); });
      const barStartX = bar * PX_PER_BAR;
      for (let b = 0; b < 4; b++) {
        const group = beats[b].sort((a, c) => a.beat - c.beat);
        if (!group.length) continue;
        const needsBeaming = group.length > 1 && group.every(n => n.duration < 1);
        if (needsBeaming) drawBeamedGroup(g, group, barStartX, c4Y, bottomLineY, staffTop);
        else drawIndividualNotes(g, group, barStartX, c4Y, bottomLineY, staffTop);
      }
    }
  }

  function attachClickHandler(canvas, sectionKey, totalBars, redraw) {
    canvas.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      const bar = Math.floor(x / PX_PER_BAR);
      if (bar < 0 || bar >= totalBars) return;
      const xInBar = x - bar * PX_PER_BAR;
      const exactBeat = xInBar / (PX_PER_BAR / 4);
      const snap = selectedDuration;
      const beat = Math.floor(exactBeat / snap) * snap;
      if (beat + snap > 4) return;

      const staffTop = TOP_PAD, bottomLineY = staffTop + 4 * LINE_GAP, c4Y = bottomLineY + LINE_GAP;
      const spaceOffset = (c4Y - y) / (LINE_GAP / 2);
      let midiIdx = Math.round(spaceOffset);
      midiIdx = Math.max(0, Math.min(midiIdx, WHITE_KEYS.length - 1));
      const midi = WHITE_KEYS[midiIdx];

      let notes = getNotes(sectionKey).slice();
      const clickedIdx = notes.findIndex(n => n.bar === bar && exactBeat >= n.beat && exactBeat <= (n.beat + n.duration) && Math.abs(midi - n.midi) <= 2);
      if (clickedIdx !== -1) {
        notes.splice(clickedIdx, 1);
      } else {
        let preservedSyllable = '';
        const beatSlot = Math.floor(beat);
        const matched = notes.find(n => n.bar === bar && Math.floor(n.beat) === beatSlot);
        if (matched) preservedSyllable = matched.syllable || '';
        notes = notes.filter(n => !(n.bar === bar && beat < n.beat + n.duration && beat + snap > n.beat));
        const totalD = notes.filter(n => n.bar === bar).reduce((s, n) => s + n.duration, 0);
        if (totalD + snap <= 4) {
          notes.push({ bar, beat, duration: snap, midi, syllable: preservedSyllable });
          playPreviewNote(midi, Math.min(snap * 0.4, 1));
        }
      }
      setNotes(sectionKey, notes);
      redraw();
    });
  }

  // Owner: una sola barra de figuras global (igual que el prototipo), flotante,
  // arrastrable, para no repetirla en cada sección -- selecciona qué duración usa
  // el próximo clic en CUALQUIER pentagrama de la canción.
  let _toolbarEl = null;
  function ensureFiguresToolbar() {
    if (_toolbarEl) return;
    installStyles();
    const bar = document.createElement('div');
    bar.className = 's936pg-toolbar';
    bar.style.top = '96px';
    bar.style.right = '24px';
    const drag = document.createElement('span');
    drag.className = 's936pg-drag';
    drag.textContent = '⠿';
    const label = document.createElement('span');
    label.className = 's936pg-toolbar-label';
    label.textContent = 'Figura:';
    bar.append(drag, label);
    const figures = [
      { d: 4, glyph: '𝅝', title: 'Redonda' },
      { d: 2, glyph: '𝅗𝅥', title: 'Blanca' },
      { d: 3, glyph: '𝅗𝅥.', title: 'Blanca con puntillo' },
      { d: 1, glyph: '♩', title: 'Negra' },
      { d: 1.5, glyph: '♩.', title: 'Negra con puntillo' },
      { d: 0.5, glyph: '♪', title: 'Corchea' },
      { d: 0.333, glyph: '3♪', title: 'Tresillo' },
      { d: 0.25, glyph: '♬', title: 'Semicorchea' }
    ];
    figures.forEach(f => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 's936pg-figbtn' + (f.d === selectedDuration ? ' is-active' : '');
      b.textContent = f.glyph;
      b.title = f.title;
      b.onclick = () => {
        selectedDuration = f.d;
        bar.querySelectorAll('.s936pg-figbtn').forEach(x => x.classList.remove('is-active'));
        b.classList.add('is-active');
      };
      bar.appendChild(b);
    });
    document.body.appendChild(bar);
    _toolbarEl = bar;

    let dragging = false, startX = 0, startY = 0, barStartLeft = 0, barStartTop = 0;
    drag.addEventListener('pointerdown', (e) => {
      dragging = true; drag.setPointerCapture(e.pointerId);
      startX = e.clientX; startY = e.clientY;
      const r = bar.getBoundingClientRect();
      barStartLeft = r.left; barStartTop = r.top;
    });
    drag.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      bar.style.right = 'auto';
      bar.style.left = Math.max(0, barStartLeft + (e.clientX - startX)) + 'px';
      bar.style.top = Math.max(0, barStartTop + (e.clientY - startY)) + 'px';
    });
    drag.addEventListener('pointerup', () => { dragging = false; });
  }

  function renderSectionPentagram(block, sectionKey, opts) {
    try {
      if (!block || !sectionKey) return;
      installStyles();
      const totalBars = Number(opts && opts.totalMeasures) || 0;
      if (!(totalBars > 0)) return;
      const wrap = document.createElement('div');
      wrap.className = 's936pg-wrap';
      const canvas = document.createElement('canvas');
      canvas.className = 's936pg-canvas';
      canvas.style.width = (PX_PER_BAR * totalBars) + 'px';
      canvas.title = 'Pentagrama — clic para poner/quitar una nota';
      const autoBtn = document.createElement('button');
      autoBtn.type = 'button';
      autoBtn.className = 's936pg-autochords';
      autoBtn.textContent = '🎼 Auto-Acordes';
      autoBtn.title = 'Calcular acordes a partir de las notas de este pentagrama y aplicarlos a la sección';
      autoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (autoBtn.classList.contains('is-busy')) return;
        const chords = computeChordsForSection(sectionKey, totalBars);
        const label = autoBtn.textContent;
        if (!chords) {
          autoBtn.textContent = 'Sin notas';
        } else {
          const target = baseSectionType(sectionKey);
          const draftWritten = writeChordsIntoStructureDraft(target, chords);
          const result = window.Studio936AppBridge?.applyPentagramChords?.(target, chords);
          const bridgeOk = !result || result.ok !== false;
          autoBtn.textContent = (draftWritten || bridgeOk) ? '✓ Aplicado' : '⚠ ' + (result?.message || 'Error');
          try { window.dispatchEvent(new CustomEvent('studio936:section-chords-updated', { detail: { sectionKey: target } })); } catch (_) {}
        }
        autoBtn.classList.add('is-busy');
        setTimeout(() => { autoBtn.textContent = label; autoBtn.classList.remove('is-busy'); }, 1400);
      });
      wrap.append(canvas, autoBtn);
      block.appendChild(wrap);
      function redraw() { drawPentagram(canvas, getNotes(sectionKey), totalBars); }
      attachClickHandler(canvas, sectionKey, totalBars, redraw);
      redraw();
      ensureFiguresToolbar();
    } catch (e) {
      console.error('[Pentagrama] renderSectionPentagram falló:', e);
    }
  }

  window.Studio936Pentagram = {
    renderSectionPentagram,
    getNotes,
    setNotes,
    calculateChordForNotes
  };
})();
