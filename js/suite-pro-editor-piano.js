// Studio 936 Composer - Piano Editor Logic v1.0
// Keeps the approved piano UI and adds independent left/right hand voicings.
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
    const mode = ["together","alternate","custom"].includes(left.mode)
      ? left.mode
      : "together";
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
    const pattern = leftMode === "custom"
      ? tokenize(leftPattern)
      : left.slice();
    return {
      leftHand:{
        notes:left,
        mode:["together","alternate","custom"].includes(leftMode) ? leftMode : "together",
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

  return {
    version:"piano-editor-v1",
    modes:MODES,
    tokenize,
    normalize,
    createVoicing,
    legacyFields,
    sequence,
    clone
  };
})();
