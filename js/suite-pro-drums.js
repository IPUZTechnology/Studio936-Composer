// Studio 936 Composer - Suite Pro Drums Module v1.2.2
// Scope: Studio > Drums Pro only. It does not touch app.js, Practice, CSS, MIDI, editor or transport internals.
// Loaded before js/suite-pro.js and rendered through Studio936SuiteProModules.drums.
(function () {
  "use strict";

  const STYLE_ID = "s936SuiteProDrumsStyles";
  const STATE_KEY = "s936_suitepro_drums_v1";

  const DEFAULT_STATE = {
    style: "auto",
    syncStyle: true,
    pattern: "groove",
    followStructure: true,
    volume: 0.55,
    swing: 0,
    humanize: 0,
    playing: false,
    step: 0
  };

  const PATTERNS = {
    funk: {
      basic:  { label: "Funk básico", kick:[0, 6, 10], snare:[4, 12], hat:[0,2,4,6,8,10,12,14] },
      groove: { label: "Funk groove", kick:[0, 3, 8, 10, 14], snare:[4, 12], hat:[0,2,3,6,8,10,11,14] },
      chorus: { label: "Funk coro", kick:[0, 3, 8, 10, 13], snare:[4, 12], hat:[0,1,2,3,4,6,8,9,10,11,12,14] },
      build:  { label: "Funk build", kick:[0, 3, 6, 8, 10, 14], snare:[4, 12, 15], hat:[0,2,4,6,8,10,12,14,15] },
      break:  { label: "Funk break", kick:[0, 10], snare:[4, 7, 12, 15], hat:[0,2,6,8,10,14] }
    },
    rock: {
      basic:  { label: "Rock básico", kick:[0, 8], snare:[4, 12], hat:[0,2,4,6,8,10,12,14] },
      groove: { label: "Rock medio", kick:[0, 7, 8, 10], snare:[4, 12], hat:[0,2,4,6,8,10,12,14] },
      chorus: { label: "Rock coro", kick:[0, 3, 8, 10], snare:[4, 12], hat:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15] },
      build:  { label: "Rock build", kick:[0, 6, 8, 10], snare:[4, 12, 14, 15], hat:[0,2,4,6,8,10,12,14] },
      break:  { label: "Rock break", kick:[0, 8, 11], snare:[4, 7, 12, 15], hat:[0,4,8,12] }
    },
    pop: {
      basic:  { label: "Pop básico", kick:[0, 8], snare:[4, 12], hat:[0,2,4,6,8,10,12,14] },
      groove: { label: "Pop groove", kick:[0, 8, 11], snare:[4, 12], hat:[0,2,4,6,8,10,12,14] },
      chorus: { label: "Pop coro", kick:[0, 3, 8, 11], snare:[4, 12], hat:[0,2,4,6,8,10,12,14] },
      build:  { label: "Pop build", kick:[0, 6, 8, 10, 14], snare:[4, 12, 15], hat:[0,2,4,6,8,10,12,14,15] },
      break:  { label: "Pop break", kick:[0, 8], snare:[4, 7, 12], hat:[0,4,8,12,14] }
    },
    ballad: {
      basic:  { label: "Balada básica", kick:[0, 8], snare:[4, 12], hat:[0,4,8,12] },
      groove: { label: "Balada suave", kick:[0, 10], snare:[4, 12], hat:[0,4,8,12,14] },
      chorus: { label: "Balada coro", kick:[0, 6, 10], snare:[4, 12], hat:[0,2,4,6,8,10,12,14] },
      build:  { label: "Balada build", kick:[0, 8, 10], snare:[4, 12, 14, 15], hat:[0,2,4,6,8,10,12,14,15] },
      break:  { label: "Balada break", kick:[0], snare:[4, 12, 15], hat:[0,8,14] }
    },
    jazz: {
      basic:  { label: "Jazz básico", kick:[0, 10], snare:[4, 12], hat:[0,3,6,9,12,15] },
      groove: { label: "Jazz ride", kick:[0, 10], snare:[4, 7, 12], hat:[0,3,6,9,12,15] },
      chorus: { label: "Jazz chorus", kick:[0, 8, 10], snare:[4, 7, 12, 15], hat:[0,3,6,9,12,15] },
      build:  { label: "Jazz build", kick:[0, 6, 10], snare:[4, 7, 12, 14], hat:[0,2,3,6,8,9,12,14,15] },
      break:  { label: "Jazz break", kick:[0], snare:[3, 7, 12, 15], hat:[0,6,12] }
    },
    bossa: {
      basic:  { label: "Bossa básica", kick:[0, 6, 10], snare:[4, 12, 14], hat:[0,2,4,6,8,10,12,14] },
      groove: { label: "Bossa groove", kick:[0, 6, 10, 14], snare:[4, 7, 12], hat:[0,2,4,6,8,10,12,14] },
      chorus: { label: "Bossa coro", kick:[0, 6, 8, 10, 14], snare:[4, 7, 12, 15], hat:[0,2,4,6,8,10,12,14] },
      build:  { label: "Bossa build", kick:[0, 6, 10, 14], snare:[4, 7, 11, 12, 15], hat:[0,2,4,6,8,10,12,14,15] },
      break:  { label: "Bossa break", kick:[0, 10], snare:[4, 7, 12], hat:[0,4,8,12] }
    },
    salsa: {
      basic:  { label: "Salsa guía", kick:[0, 8], snare:[4, 7, 12, 15], hat:[0,2,4,6,8,10,12,14] },
      groove: { label: "Salsa groove", kick:[0, 6, 8], snare:[4, 7, 12, 15], hat:[0,2,4,6,8,10,12,14] },
      chorus: { label: "Salsa coro", kick:[0, 6, 8, 10], snare:[4, 7, 11, 12, 15], hat:[0,2,4,6,8,10,12,14] },
      build:  { label: "Salsa build", kick:[0, 6, 8, 10], snare:[4, 7, 11, 12, 14, 15], hat:[0,2,4,6,8,10,12,14,15] },
      break:  { label: "Salsa break", kick:[0, 8], snare:[3, 4, 7, 12, 15], hat:[0,4,8,12] }
    },
    cumbia: {
      basic:  { label: "Cumbia básica", kick:[0, 8], snare:[4, 12], hat:[0,2,4,6,8,10,12,14] },
      groove: { label: "Cumbia groove", kick:[0, 7, 8], snare:[4, 12], hat:[0,2,4,6,8,10,12,14] },
      chorus: { label: "Cumbia coro", kick:[0, 7, 8, 10], snare:[4, 12], hat:[0,2,4,6,8,10,12,14] },
      build:  { label: "Cumbia build", kick:[0, 6, 8, 10], snare:[4, 12, 15], hat:[0,2,4,6,8,10,12,14,15] },
      break:  { label: "Cumbia break", kick:[0, 8], snare:[4, 7, 12], hat:[0,4,8,12] }
    },
    reggae: {
      basic:  { label: "Reggae offbeat", kick:[8], snare:[4, 12], hat:[2,6,10,14] },
      groove: { label: "Reggae groove", kick:[0, 8], snare:[4, 12], hat:[2,6,10,14] },
      chorus: { label: "Reggae coro", kick:[0, 8, 10], snare:[4, 12], hat:[2,6,8,10,14] },
      build:  { label: "Reggae build", kick:[0, 8, 10], snare:[4, 7, 12, 15], hat:[2,4,6,8,10,12,14] },
      break:  { label: "Reggae break", kick:[8], snare:[4, 7, 12], hat:[2,6,10,14] }
    },
    // Cambio 489: 11 generos electronicos nuevos (mismos de la sesion de
    // hoy en suite-pro-drum-patterns.js) - el patron 'basic' reusa
    // exactamente esos, las otras 4 variantes (groove/coro/build/break)
    // son densidad progresiva, mismo criterio que ya usan Funk/Rock aca.
    trance: {
      basic:  { label: "Trance básico", kick:[0, 4, 8, 12], snare:[4, 12], hat:[0, 2, 4, 6, 8, 10, 12, 14] },
      groove:  { label: "Trance groove", kick:[0, 4, 8, 12], snare:[4, 12], hat:[0, 2, 4, 6, 8, 10, 12, 14] },
      chorus:  { label: "Trance coro", kick:[0, 4, 8, 12], snare:[4, 12], hat:[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
      build:  { label: "Trance build", kick:[0, 4, 8, 10, 12], snare:[4, 12, 15], hat:[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
      break:  { label: "Trance break", kick:[0, 8], snare:[4, 12], hat:[0, 4, 8, 12] },
    },
    eurotrance: {
      basic:  { label: "Eurotrance básico", kick:[0, 4, 8, 12], snare:[4, 12], hat:[0, 2, 4, 6, 8, 10, 12, 14] },
      groove:  { label: "Eurotrance groove", kick:[0, 4, 8, 12], snare:[4, 12], hat:[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
      chorus:  { label: "Eurotrance coro", kick:[0, 4, 8, 12], snare:[4, 12], hat:[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
      build:  { label: "Eurotrance build", kick:[0, 4, 8, 10, 12], snare:[4, 12, 15], hat:[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
      break:  { label: "Eurotrance break", kick:[0, 8], snare:[4, 12], hat:[0, 4, 8, 12] },
    },
    electro: {
      basic:  { label: "Electro (UK) básico", kick:[0, 4, 8, 10, 12], snare:[4, 7, 12, 15], hat:[0, 2, 4, 6, 8, 10, 12, 14] },
      groove:  { label: "Electro (UK) groove", kick:[0, 4, 8, 10, 12], snare:[4, 7, 12, 15], hat:[0, 2, 4, 6, 8, 10, 12, 14] },
      chorus:  { label: "Electro (UK) coro", kick:[0, 4, 8, 10, 12], snare:[4, 7, 12, 15], hat:[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
      build:  { label: "Electro (UK) build", kick:[0, 3, 4, 8, 10, 12], snare:[4, 7, 12, 14, 15], hat:[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
      break:  { label: "Electro (UK) break", kick:[0, 10], snare:[4, 12], hat:[0, 4, 8, 12] },
    },
    house: {
      basic:  { label: "House básico", kick:[0, 4, 8, 12], snare:[4, 12], hat:[2, 6, 10, 14] },
      groove:  { label: "House groove", kick:[0, 4, 8, 12], snare:[4, 12], hat:[2, 6, 10, 14] },
      chorus:  { label: "House coro", kick:[0, 4, 8, 12], snare:[4, 12], hat:[0, 2, 4, 6, 8, 10, 12, 14] },
      build:  { label: "House build", kick:[0, 4, 8, 10, 12], snare:[4, 12, 15], hat:[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
      break:  { label: "House break", kick:[0, 8], snare:[4, 12], hat:[2, 6, 10, 14] },
    },
    techno: {
      basic:  { label: "Techno básico", kick:[0, 4, 8, 12], snare:[], hat:[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
      groove:  { label: "Techno groove", kick:[0, 4, 8, 12], snare:[12], hat:[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
      chorus:  { label: "Techno coro", kick:[0, 4, 8, 12], snare:[12], hat:[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
      build:  { label: "Techno build", kick:[0, 2, 4, 6, 8, 10, 12, 14], snare:[12, 15], hat:[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
      break:  { label: "Techno break", kick:[0, 8], snare:[], hat:[0, 4, 8, 12] },
    },
    dnb: {
      basic:  { label: "Drum & Bass básico", kick:[0, 10], snare:[4, 12], hat:[0, 2, 3, 6, 8, 10, 11, 14] },
      groove:  { label: "Drum & Bass groove", kick:[0, 10], snare:[4, 7, 12, 15], hat:[0, 2, 3, 6, 8, 10, 11, 14] },
      chorus:  { label: "Drum & Bass coro", kick:[0, 6, 10], snare:[4, 7, 9, 12, 15], hat:[0, 2, 3, 6, 8, 10, 11, 14] },
      build:  { label: "Drum & Bass build", kick:[0, 3, 6, 10, 13], snare:[4, 7, 9, 12, 14, 15], hat:[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
      break:  { label: "Drum & Bass break", kick:[0, 10], snare:[4, 12], hat:[0, 8] },
    },
    dubstep: {
      basic:  { label: "Dubstep básico", kick:[0, 6], snare:[8], hat:[2, 4, 6, 10, 12, 14] },
      groove:  { label: "Dubstep groove", kick:[0, 6], snare:[8], hat:[2, 4, 6, 10, 12, 14] },
      chorus:  { label: "Dubstep coro", kick:[0, 6, 10], snare:[8], hat:[0, 2, 4, 6, 8, 10, 12, 14] },
      build:  { label: "Dubstep build", kick:[0, 3, 6, 10], snare:[8, 15], hat:[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
      break:  { label: "Dubstep break", kick:[0], snare:[8], hat:[0, 8] },
    },
    deephouse: {
      basic:  { label: "Deep House básico", kick:[0, 4, 8, 12], snare:[4, 12], hat:[2, 6, 10, 14] },
      groove:  { label: "Deep House groove", kick:[0, 4, 8, 12], snare:[4, 12], hat:[2, 6, 10, 14] },
      chorus:  { label: "Deep House coro", kick:[0, 4, 8, 12], snare:[4, 12], hat:[0, 2, 4, 6, 8, 10, 12, 14] },
      build:  { label: "Deep House build", kick:[0, 4, 8, 10, 12], snare:[4, 12, 15], hat:[0, 2, 4, 6, 8, 10, 12, 14] },
      break:  { label: "Deep House break", kick:[0, 8], snare:[4, 12], hat:[2, 6, 10, 14] },
    },
    afrobeats: {
      basic:  { label: "Afrobeats básico", kick:[0, 3, 6, 10, 13], snare:[8], hat:[0, 2, 4, 6, 8, 10, 12, 14] },
      groove:  { label: "Afrobeats groove", kick:[0, 3, 6, 10, 13], snare:[8], hat:[0, 2, 4, 6, 8, 10, 12, 14] },
      chorus:  { label: "Afrobeats coro", kick:[0, 3, 6, 10, 13], snare:[8], hat:[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
      build:  { label: "Afrobeats build", kick:[0, 3, 6, 9, 10, 13], snare:[8, 15], hat:[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
      break:  { label: "Afrobeats break", kick:[0, 6], snare:[8], hat:[0, 4, 8, 12] },
    },
    dembow: {
      basic:  { label: "Dembow básico", kick:[0, 6, 10], snare:[3, 11], hat:[0, 2, 4, 6, 8, 10, 12, 14] },
      groove:  { label: "Dembow groove", kick:[0, 6, 10], snare:[3, 11], hat:[0, 2, 4, 6, 8, 10, 12, 14] },
      chorus:  { label: "Dembow coro", kick:[0, 6, 10], snare:[3, 11], hat:[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
      build:  { label: "Dembow build", kick:[0, 6, 10, 13], snare:[3, 11, 15], hat:[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
      break:  { label: "Dembow break", kick:[0, 10], snare:[3, 11], hat:[0, 4, 8, 12] },
    },
  };

  let state = loadState();
  let audioCtx = null;
  let timer = null;
  let lastStructureRenderKey = "";

  function loadState() {
    try { return Object.assign({}, DEFAULT_STATE, JSON.parse(localStorage.getItem(STATE_KEY) || "{}")); }
    catch (error) { return Object.assign({}, DEFAULT_STATE); }
  }

  function saveState() {
    try {
      const saved = Object.assign({}, state, { playing: false, step: 0 });
      localStorage.setItem(STATE_KEY, JSON.stringify(saved));
    } catch (error) {}
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#s936SuitePro .s936-dr-shell { display:grid; gap:12px; }
#s936SuitePro .s936-dr-grid { display:grid; grid-template-columns:minmax(260px,.7fr) minmax(0,1.3fr); gap:12px; align-items:start; }
#s936SuitePro .s936-dr-card {
  border:1px solid rgba(255,255,255,.12);
  border-radius:18px;
  background:linear-gradient(135deg, rgba(0,255,204,.08), rgba(255,255,255,.035));
  padding:14px;
}
#s936SuitePro .s936-dr-card.important { border-color:rgba(0,255,204,.34); background:linear-gradient(135deg, rgba(0,255,204,.13), rgba(255,255,255,.035)); }
#s936SuitePro .s936-dr-card h4 {
  margin:0 0 10px;
  color:#8affff;
  text-transform:uppercase;
  font-size:.82rem;
  letter-spacing:.8px;
}
#s936SuitePro .s936-dr-muted { color:rgba(255,255,255,.72); font-size:.78rem; line-height:1.45; margin:7px 0; }
#s936SuitePro .s936-dr-line { margin:8px 0; color:rgba(255,255,255,.86); font-size:.78rem; line-height:1.45; }
#s936SuitePro .s936-dr-line strong { color:#bfffee; }
#s936SuitePro .s936-dr-form { display:grid; gap:9px; }
#s936SuitePro .s936-dr-toggle {
  display:flex;
  align-items:center;
  gap:9px;
  border:1px solid rgba(255,216,77,.28);
  border-radius:12px;
  padding:9px 10px;
  background:rgba(255,216,77,.06);
  color:#ffe066;
  font-size:.68rem;
  font-weight:950;
  text-transform:uppercase;
  letter-spacing:.5px;
  cursor:pointer;
}
#s936SuitePro .s936-dr-toggle input { accent-color:#00ffcc; transform:scale(1.08); }
#s936SuitePro .s936-dr-sync-note {
  margin:6px 0 0;
  color:rgba(255,255,255,.68);
  font-size:.68rem;
  line-height:1.35;
}
#s936SuitePro .s936-dr-field label {
  display:block;
  color:#ffe066;
  font-size:.60rem;
  font-weight:950;
  text-transform:uppercase;
  letter-spacing:.7px;
  margin-bottom:5px;
}
#s936SuitePro .s936-dr-select, #s936SuitePro .s936-dr-range {
  width:100%;
  border:1px solid rgba(255,255,255,.16);
  border-radius:10px;
  background:rgba(0,0,0,.32);
  color:#fff;
  padding:8px 9px;
  font-weight:850;
}
#s936SuitePro .s936-dr-range { accent-color:#00ffcc; padding:0; }
#s936SuitePro .s936-dr-actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
#s936SuitePro .s936-dr-btn {
  border:1px solid rgba(0,255,204,.45);
  border-radius:999px;
  background:rgba(0,255,204,.08);
  color:#bfffee;
  padding:8px 12px;
  font-size:.68rem;
  font-weight:950;
  cursor:pointer;
}
#s936SuitePro .s936-dr-btn:hover { background:rgba(0,255,204,.15); }
#s936SuitePro .s936-dr-btn.warn { border-color:rgba(255,216,77,.72); color:#ffe066; background:rgba(255,216,77,.10); }
#s936SuitePro .s936-dr-btn.danger { border-color:rgba(255,90,90,.7); color:#ffb5b5; background:rgba(255,90,90,.10); }
#s936SuitePro .s936-dr-btn.active { border-color:#00ffcc; color:#001a15; background:#00ffcc; }
#s936SuitePro .s936-dr-status {
  display:inline-flex; align-items:center; gap:7px;
  border:1px solid rgba(174,230,70,.45);
  border-radius:999px;
  padding:6px 10px;
  color:#d7ff72;
  background:rgba(174,230,70,.08);
  font-size:.66rem;
  font-weight:950;
  text-transform:uppercase;
}
#s936SuitePro .s936-dr-led { width:9px; height:9px; border-radius:999px; background:#333; box-shadow:none; }
#s936SuitePro .s936-dr-status.playing .s936-dr-led { background:#00ffcc; box-shadow:0 0 13px rgba(0,255,204,.8); }
#s936SuitePro .s936-dr-sequencer { display:grid; gap:8px; overflow:auto; padding-bottom:4px; }
#s936SuitePro .s936-dr-row { display:grid; grid-template-columns:76px repeat(16, minmax(20px, 1fr)); gap:5px; align-items:center; min-width:720px; }
#s936SuitePro .s936-dr-label {
  color:#ffe066;
  font-size:.68rem;
  font-weight:950;
  text-transform:uppercase;
}
#s936SuitePro .s936-dr-step {
  height:30px;
  border:1px solid rgba(255,255,255,.12);
  border-radius:8px;
  background:rgba(255,255,255,.045);
  position:relative;
  overflow:hidden;
}
#s936SuitePro .s936-dr-step:nth-child(4n+2) { border-left-color:rgba(255,216,77,.45); }
#s936SuitePro .s936-dr-step.on.kick { background:rgba(0,255,204,.20); border-color:rgba(0,255,204,.62); }
#s936SuitePro .s936-dr-step.on.snare { background:rgba(255,216,77,.19); border-color:rgba(255,216,77,.62); }
#s936SuitePro .s936-dr-step.on.hat { background:rgba(255,91,234,.14); border-color:rgba(255,91,234,.45); }
#s936SuitePro .s936-dr-step.play {
  outline:2px solid #fff;
  box-shadow:0 0 18px rgba(255,255,255,.22);
}
#s936SuitePro .s936-dr-step.play::after {
  content:"";
  position:absolute;
  inset:0;
  background:rgba(255,255,255,.18);
}
#s936SuitePro .s936-dr-numbers { display:grid; grid-template-columns:76px repeat(16, minmax(20px, 1fr)); gap:5px; min-width:720px; color:rgba(255,255,255,.55); font-size:.56rem; font-weight:900; text-align:center; }
#s936SuitePro .s936-dr-numbers span:first-child { text-align:left; }
#s936SuitePro .s936-dr-summary { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; margin-top:10px; }
#s936SuitePro .s936-dr-mini {
  border:1px solid rgba(255,255,255,.10);
  border-radius:12px;
  padding:9px;
  background:rgba(0,0,0,.16);
}
#s936SuitePro .s936-dr-mini strong { display:block; color:#fff; font-size:1.1rem; line-height:1; }
#s936SuitePro .s936-dr-mini span { display:block; color:rgba(255,255,255,.65); font-size:.62rem; font-weight:850; text-transform:uppercase; margin-top:3px; }

#s936SuitePro .s936-dr-structure-note {
  margin:8px 0 0;
  color:#d7ff72;
  font-size:.66rem;
  line-height:1.35;
  font-weight:850;
}
#s936SuitePro .s936-dr-select-disabled {
  opacity:.58;
}

@media(max-width: 980px){
  #s936SuitePro .s936-dr-grid { grid-template-columns:1fr; }
  #s936SuitePro .s936-dr-summary { grid-template-columns:repeat(2,minmax(0,1fr)); }
}

#s936SuitePro .s936-dr-select-disabled select {
  opacity: .78;
  pointer-events: none;
}
#s936SuitePro .s936-dr-select-disabled span::after {
  content: " · auto";
  color: #d7ff72;
  font-weight: 950;
}
`;
    document.head.appendChild(style);
  }

  function getBpm(ctx) {
    const snap = ctx.snapshot?.() || {};
    const raw = snap.bpm || ctx.byId?.("bpmDisplay")?.textContent || ctx.byId?.("bpmSlider")?.value || 95;
    return Math.max(40, Math.min(220, Number(raw) || 95));
  }

  function appStyle(ctx) {
    const snap = ctx.snapshot?.() || {};
    const value = String(snap.style || ctx.byId?.("styleSelect")?.value || "funk").toLowerCase();
    return PATTERNS[value] ? value : "pop";
  }

  function appStyleLabel(ctx) {
    const select = ctx.byId?.("styleSelect") || document.getElementById("styleSelect");
    const value = appStyle(ctx);
    const option = select ? Array.from(select.options || []).find((item) => item.value === value) : null;
    return option?.textContent || value;
  }

  function setAppStyle(ctx, style) {
    if (!PATTERNS[style]) return false;
    const select = ctx.byId?.("styleSelect") || document.getElementById("styleSelect");
    if (!select) return false;
    if (select.value !== style) {
      select.value = style;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    return true;
  }

  function syncStyleToApp(ctx) {
    if (state.syncStyle === false) return false;
    const style = selectedStyle(ctx);
    if (!style || !PATTERNS[style]) return false;
    return setAppStyle(ctx, style);
  }

  function selectedStyle(ctx) {
    return state.style === "auto" ? appStyle(ctx) : (PATTERNS[state.style] ? state.style : "pop");
  }


  function normalizeStructureText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function currentStructureLabel(ctx) {
    const snap = ctx.snapshot?.() || {};
    const sectionSelect = ctx.byId?.("sectionSelect") || document.getElementById("sectionSelect");
    const parts = [
      snap.currentSection,
      snap.currentSectionName,
      snap.currentPart,
      sectionSelect?.value,
      sectionSelect?.selectedOptions?.[0]?.textContent,
      document.getElementById("sectionLabel")?.textContent,
      document.getElementById("currentPartTag")?.textContent
    ].filter(Boolean);
    return parts.join(" ");
  }

  function patternKeyForStructure(ctx) {
    const text = normalizeStructureText(currentStructureLabel(ctx));

    if (/pre\s*coro|prechorus|pre chorus|precoro/.test(text)) return "build";
    if (/coro|chorus|hook/.test(text)) return "chorus";
    if (/intro|introduccion|entrada/.test(text)) return "basic";
    if (/puente|bridge|interludio|interlude|break|fill/.test(text)) return "break";
    if (/solo/.test(text)) return "groove";
    if (/outro|final|coda|salida/.test(text)) return "break";
    if (/verso|verse|estrofa|tema a/.test(text)) return "groove";

    return state.pattern || "groove";
  }

  function activePatternKey(ctx) {
    return state.followStructure === false ? (state.pattern || "groove") : patternKeyForStructure(ctx);
  }

  function structureModeLabel(ctx) {
    if (state.followStructure === false) return "Manual";
    const key = activePatternKey(ctx);
    const labels = { basic:"Intro/Basic", groove:"Verso/Groove", chorus:"Coro", build:"Pre-coro/Build", break:"Puente/Break" };
    return labels[key] || key;
  }

  function selectedPattern(ctx) {
    const style = selectedStyle(ctx);
    const group = PATTERNS[style] || PATTERNS.pop;
    const key = activePatternKey(ctx);
    return group[key] || group[state.pattern] || group.groove || group.basic;
  }

  function drumViewSignature(ctx) {
    return [
      selectedStyle(ctx),
      activePatternKey(ctx),
      structureModeLabel(ctx),
      state.followStructure === false ? "manual" : "auto"
    ].join("|");
  }

  function refreshStructureViewIfNeeded(ctx) {
    if (state.followStructure === false) return;
    const nextSignature = drumViewSignature(ctx);
    if (!lastStructureRenderKey) {
      lastStructureRenderKey = nextSignature;
      return;
    }
    if (nextSignature === lastStructureRenderKey) return;

    lastStructureRenderKey = nextSignature;
    const content = ctx.clearContent?.();
    if (content) render(ctx, content);
  }

  function setStatus(text) {
    const node = document.querySelector("#s936SuitePro .s936-dr-live-text");
    if (node) node.textContent = text;
  }

  function render(ctx, container) {
    installStyles();
    const c = container || ctx.clearContent?.();
    if (!c) return;

    ctx.title(c, "Drums Pro", "Batería guía modular para componer, practicar y producir sin inflar Suite Pro.");
    const shell = ctx.el("div", "s936-dr-shell");
    const grid = ctx.el("div", "s936-dr-grid");

    renderControls(ctx, grid);
    renderSequencer(ctx, grid);

    shell.appendChild(grid);
    c.appendChild(shell);
    lastStructureRenderKey = drumViewSignature(ctx);
    paintActiveStep();
  }

  function renderControls(ctx, parent) {
    const card = ctx.el("article", "s936-dr-card important");
    card.appendChild(ctx.el("h4", "", "Control de batería"));

    const status = ctx.el("div", "s936-dr-status" + (state.playing ? " playing" : ""));
    status.appendChild(ctx.el("span", "s936-dr-led"));
    status.appendChild(ctx.el("span", "s936-dr-live-text", state.playing ? "Drums sonando" : "Drums detenido"));
    card.appendChild(status);

    const form = ctx.el("div", "s936-dr-form");
    form.appendChild(selectField(ctx, "Estilo batería", state.style, [
      ["auto", "Auto: " + appStyleLabel(ctx)],
      ["funk", "Funk"],
      ["rock", "Rock"],
      ["pop", "Pop"],
      ["ballad", "Balada"],
      ["jazz", "Jazz"],
      ["bossa", "Bossa"],
      ["salsa", "Salsa"],
      ["cumbia", "Cumbia"],
      ["reggae", "Reggae"],
      // Cambio 489: 11 géneros electrónicos nuevos
      ["trance", "Trance"],
      ["eurotrance", "Eurotrance"],
      ["electro", "Electro (UK)"],
      ["house", "House"],
      ["techno", "Techno"],
      ["dnb", "Drum & Bass"],
      ["dubstep", "Dubstep"],
      ["deephouse", "Deep House"],
      ["afrobeats", "Afrobeats"],
      ["dembow", "Dembow"]
    ], (value) => {
      state.style = value;
      if (state.syncStyle !== false) syncStyleToApp(ctx);
      saveState();
      render(ctx, ctx.clearContent());
    }));

    form.appendChild(toggleField(ctx, "Sync estilo canción", state.syncStyle !== false, (checked) => {
      state.syncStyle = checked;
      if (checked) syncStyleToApp(ctx);
      saveState();
      render(ctx, ctx.clearContent());
    }));
    form.appendChild(toggleField(ctx, "Follow Structure", state.followStructure !== false, (checked) => {
      state.followStructure = checked;
      saveState();
      render(ctx, ctx.clearContent());
    }));
    const effectivePatternKey = activePatternKey(ctx);
    const patternField = selectField(ctx, state.followStructure === false ? "Patrón manual" : "Patrón actual", state.followStructure === false ? state.pattern : effectivePatternKey, [
      ["basic", "Basic"],
      ["groove", "Groove"],
      ["chorus", "Chorus"],
      ["build", "Build"],
      ["break", "Break"]
    ], (value) => {
      if (state.followStructure !== false) return;
      state.pattern = value;
      saveState();
      render(ctx, ctx.clearContent());
    });
    if (state.followStructure !== false) patternField.classList.add("s936-dr-select-disabled");
    form.appendChild(patternField);

    form.appendChild(rangeField(ctx, "Volumen drums", state.volume, 0, 1, 0.01, (value) => {
      state.volume = Number(value);
      saveState();
      updateSummary();
    }));

    form.appendChild(rangeField(ctx, "Swing", state.swing, 0, 0.35, 0.01, (value) => {
      state.swing = Number(value);
      saveState();
      updateSummary();
    }));

    form.appendChild(rangeField(ctx, "Humanize", state.humanize, 0, 0.20, 0.01, (value) => {
      state.humanize = Number(value);
      saveState();
      updateSummary();
    }));

    card.appendChild(form);

    const actions = ctx.el("div", "s936-dr-actions");
    button(ctx, actions, state.playing ? "Stop Drums" : "Start Drums", () => {
      state.playing ? stop(ctx) : start(ctx);
    }, state.playing ? "s936-dr-btn danger" : "s936-dr-btn warn");

    button(ctx, actions, "Groove + Drums", () => {
      syncStyleToApp(ctx);
      ctx.callBridge?.("startGroove", () => ctx.byId?.("playBtn")?.click());
      start(ctx);
    });

    button(ctx, actions, "Stop todo", () => {
      stop(ctx);
      ctx.callBridge?.("stopPlayback", () => ctx.byId?.("playBtn")?.click());
    }, "s936-dr-btn danger");

    card.appendChild(actions);
    parent.appendChild(card);
  }

  function selectField(ctx, label, value, options, onchange) {
    const field = ctx.el("label", "s936-dr-field");
    field.appendChild(ctx.el("span", "", label));
    const select = ctx.el("select", "s936-dr-select");
    options.forEach(([v, text]) => {
      const option = ctx.el("option", "", text);
      option.value = v;
      option.selected = String(v) === String(value);
      select.appendChild(option);
    });
    select.onchange = () => onchange(select.value);
    field.appendChild(select);
    return field;
  }

  function toggleField(ctx, label, checked, onchange) {
    const field = ctx.el("label", "s936-dr-toggle");
    const input = ctx.el("input", "");
    input.type = "checkbox";
    input.checked = !!checked;
    input.onchange = () => onchange(input.checked);
    field.appendChild(input);
    field.appendChild(ctx.el("span", "", label));
    return field;
  }

  function rangeField(ctx, label, value, min, max, step, onchange) {
    const field = ctx.el("label", "s936-dr-field");
    const display = ctx.el("span", "", label + " · " + formatRange(value, max));
    field.appendChild(display);
    const input = ctx.el("input", "s936-dr-range");
    input.type = "range";
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = value;
    input.oninput = () => {
      display.textContent = label + " · " + formatRange(input.value, max);
      onchange(input.value);
    };
    field.appendChild(input);
    return field;
  }

  function formatRange(value, max) {
    if (Number(max) <= 1) return Math.round(Number(value) * 100) + "%";
    return String(value);
  }

  function button(ctx, parent, label, onclick, className = "s936-dr-btn") {
    const btn = ctx.el("button", className, label);
    btn.type = "button";
    btn.onclick = onclick;
    parent.appendChild(btn);
    return btn;
  }

  function renderSequencer(ctx, parent) {
    const card = ctx.el("article", "s936-dr-card");
    const style = selectedStyle(ctx);
    const pattern = selectedPattern(ctx);

    card.appendChild(ctx.el("h4", "", state.followStructure === false ? pattern.label : pattern.label + " · " + structureModeLabel(ctx)));
    card.appendChild(ctx.el("p", "s936-dr-muted", "Matriz de 16 pasos: Kick, Snare y Hat. El cursor blanco muestra el paso activo."));

    const seq = ctx.el("div", "s936-dr-sequencer");
    const nums = ctx.el("div", "s936-dr-numbers");
    nums.appendChild(ctx.el("span", "", style.toUpperCase()));
    for (let i = 0; i < 16; i++) nums.appendChild(ctx.el("span", "", String(i + 1)));
    seq.appendChild(nums);

    [
      ["kick", "Kick"],
      ["snare", "Snare"],
      ["hat", "Hi-Hat"]
    ].forEach(([lane, label]) => {
      const row = ctx.el("div", "s936-dr-row");
      row.appendChild(ctx.el("div", "s936-dr-label", label));
      for (let i = 0; i < 16; i++) {
        const cell = ctx.el("button", "s936-dr-step " + lane + (pattern[lane].includes(i) ? " on" : ""));
        cell.type = "button";
        cell.dataset.step = String(i);
        cell.dataset.lane = lane;
        cell.title = label + " paso " + (i + 1);
        row.appendChild(cell);
      }
      seq.appendChild(row);
    });

    card.appendChild(seq);
    parent.appendChild(card);
  }

  function renderPerformanceSummary(ctx, shell) {
    // Removed in v1.2.2: the lower Uso Musical summary duplicated information already visible above.
  }

  function updateSummary() {
    const text = document.querySelector("#s936SuitePro .s936-dr-live-text");
    if (text) text.textContent = state.playing ? "Drums sonando" : "Drums detenido";
  }

  function ensureAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    audioCtx.resume?.();
    return audioCtx;
  }

  function start(ctx) {
    syncStyleToApp(ctx);
    if (state.playing) return;
    if (!ensureAudio()) {
      setStatus("AudioContext no disponible");
      return;
    }
    state.playing = true;
    state.step = 0;
    schedule(ctx);
    setStatus(state.followStructure === false ? "Drums sonando" : "Drums sonando · Follow Structure ON");
    paintActiveStep();
  }

  function stop(ctx) {
    state.playing = false;
    if (timer) clearTimeout(timer);
    timer = null;
    paintActiveStep();
    setStatus("Drums detenido");
  }

  function schedule(ctx) {
    if (!state.playing) return;
    if (state.step === 0 || state.step === 4 || state.step === 8 || state.step === 12) refreshStructureViewIfNeeded(ctx);
    const bpm = getBpm(ctx);
    const stepMs = (60 / bpm / 4) * 1000;
    playStep(ctx, state.step);
    state.step = (state.step + 1) % 16;
    paintActiveStep();

    const swing = (state.step % 2 ? state.swing : 0) * stepMs;
    const human = (Math.random() * 2 - 1) * state.humanize * stepMs;
    timer = setTimeout(() => schedule(ctx), Math.max(20, stepMs + swing + human));
  }

  function playStep(ctx, step) {
    const pattern = selectedPattern(ctx);
    if (pattern.kick.includes(step)) kick();
    if (pattern.snare.includes(step)) snare();
    if (pattern.hat.includes(step)) hat(step % 4 === 0);
  }

  function paintActiveStep() {
    document.querySelectorAll("#s936SuitePro .s936-dr-step").forEach((cell) => {
      cell.classList.toggle("play", state.playing && Number(cell.dataset.step) === state.step);
    });
  }

  function outGain(amount) {
    const ctx = audioCtx;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(Math.max(0.0001, amount * state.volume), ctx.currentTime);
    gain.connect(ctx.destination);
    return gain;
  }

  function kick() {
    const ctx = audioCtx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(115, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.15);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.72 * state.volume, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.20);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  function snare() {
    const ctx = audioCtx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.13), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1850, t);
    filter.Q.setValueAtTime(0.85, t);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.42 * state.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start(t);
    noise.stop(t + 0.14);
  }

  function hat(accent) {
    const ctx = audioCtx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.045), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(accent ? 5200 : 6500, t);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime((accent ? 0.12 : 0.08) * state.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start(t);
    noise.stop(t + 0.05);
  }

  function register() {
    window.Studio936SuiteProModules = window.Studio936SuiteProModules || {};
    window.Studio936SuiteProDrums = {
      version: "drums-v1.2.2",
      render,
      start,
      stop
    };
    window.Studio936SuiteProModules.drums = window.Studio936SuiteProDrums;
  }

  register();
})();
