// Studio 936 Composer - Piano Editor Logic v1.1
// Keeps the approved piano UI and owns left/right hand voicing + preview timing.
window.Studio936SuiteProPianoEditor = (() => {
  "use strict";

  const MODES = [
    ["together","Simultáneo"],
    ["alternate","Alternado"],
    ["custom","Patrón personalizado"]
  ];

  function clone(value){
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function tokenize(text){
    return String(text || "")
      .trim()
      .split(/[\s,;]+/)
      .map(token => token.trim())
      .filter(Boolean);
  }

  function normalizeMode(value){
    return ["together","alternate","custom"].includes(value)
      ? value
      : "together";
  }

  function normalize(item){
    const saved = item?.voicings?.piano || {};
    const left = saved.leftHand || {};
    const right = saved.rightHand || {};
    const leftNotes = Array.isArray(left.notes) && left.notes.length
      ? left.notes.map(String)
      : tokenize(item?.bass || "C2");
    const rightNotes = Array.isArray(right.notes) && right.notes.length
      ? right.notes.map(String)
      : tokenize(item?.notes || "C3 E3 G3");
    const mode = normalizeMode(left.mode);
    const pattern = Array.isArray(left.pattern) && left.pattern.length
      ? left.pattern.map(String)
      : leftNotes.slice();

    return {
      leftHand:{notes:leftNotes,mode,pattern},
      rightHand:{notes:rightNotes}
    };
  }

  function createVoicing({leftNotes,leftMode,leftPattern,rightNotes}){
    const left = tokenize(leftNotes);
    const right = tokenize(rightNotes);
    const mode = normalizeMode(leftMode);
    const pattern = mode === "custom"
      ? tokenize(leftPattern)
      : left.slice();

    return {
      leftHand:{
        notes:left,
        mode,
        pattern:pattern.length ? pattern : left.slice()
      },
      rightHand:{notes:right}
    };
  }

  function legacyFields(voicing){
    const left = voicing?.leftHand?.notes || [];
    const right = voicing?.rightHand?.notes || [];
    return {
      bass:left[0] || "C2",
      notes:right.join(" ")
    };
  }

  function sequence(voicing){
    const left = voicing?.leftHand || {};
    const notes = Array.isArray(left.notes) ? left.notes.slice() : [];
    if(left.mode === "custom" && Array.isArray(left.pattern) && left.pattern.length){
      return left.pattern.slice();
    }
    return notes;
  }

  /*
   * Returns a tempo-aware plan without touching Web Audio or the DOM.
   * together: all left-hand notes at the same instant.
   * alternate: eight eighth-note pulses cycling through the left-hand notes.
   * custom: one eighth-note pulse per written pattern token; R creates a rest.
   */
  function previewPlan(voicing, options = {}){
    const normalized = normalize({voicings:{piano:voicing || {}}});
    const left = normalized.leftHand;
    const rightNotes = normalized.rightHand.notes.slice();
    const bpm = Math.max(40, Math.min(240, Number(options.bpm) || 95));
    const pulseSeconds = 60 / bpm / 2;
    const events = [];

    if(left.mode === "together"){
      if(left.notes.length){
        events.push({at:0, notes:left.notes.slice()});
      }
    }else if(left.mode === "alternate"){
      const notes = left.notes.length ? left.notes : [];
      const pulseCount = Math.max(8, notes.length * 4);
      for(let i=0; i<pulseCount && notes.length; i++){
        events.push({at:i * pulseSeconds, notes:[notes[i % notes.length]]});
      }
    }else{
      const pattern = left.pattern.length ? left.pattern : left.notes;
      pattern.forEach((token,index) => {
        const isRest = /^R(?:EST)?$/i.test(String(token));
        events.push({
          at:index * pulseSeconds,
          notes:isRest ? [] : [String(token)]
        });
      });
    }

    const lastAt = events.length ? events[events.length - 1].at : 0;
    const durationSeconds = Math.max(
      pulseSeconds,
      lastAt + pulseSeconds
    );

    return {
      mode:left.mode,
      pulseSeconds,
      durationSeconds,
      leftEvents:events,
      rightNotes
    };
  }

  return {
    version:"piano-editor-v1.1",
    modes:MODES,
    tokenize,
    normalize,
    createVoicing,
    legacyFields,
    sequence,
    previewPlan,
    clone
  };
})();
