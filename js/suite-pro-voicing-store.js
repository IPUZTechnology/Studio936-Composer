// Studio 936 Composer - Voicing Store v1.0
// Persists reusable voicings per song and per instrument.
window.Studio936VoicingStore = (() => {
  "use strict";
  const INSTRUMENTS = ["piano","guitar","ukulele","bass"];

  function clone(value){
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function canonicalName(name){
    return String(name || "Acorde")
      .trim()
      .replace(/\s+/g," ")
      .toUpperCase();
  }

  function ensure(project){
    if(!project || typeof project !== "object") return null;
    if(!project.voicingLibrary || typeof project.voicingLibrary !== "object"){
      project.voicingLibrary = {};
    }
    INSTRUMENTS.forEach(instrument => {
      if(!project.voicingLibrary[instrument] || typeof project.voicingLibrary[instrument] !== "object"){
        project.voicingLibrary[instrument] = {};
      }
    });
    return project.voicingLibrary;
  }

  function remember(project,instrument,name,voicing){
    const library = ensure(project);
    if(!library || !INSTRUMENTS.includes(instrument) || !voicing) return false;
    library[instrument][canonicalName(name)] = clone(voicing);
    return true;
  }

  function recall(project,instrument,name){
    const library = ensure(project);
    if(!library || !INSTRUMENTS.includes(instrument)) return null;
    return clone(library[instrument][canonicalName(name)] || null);
  }

  function rememberChord(project,chord,instrument){
    const voicing = chord?.voicings?.[instrument];
    if(!voicing) return false;
    return remember(project,instrument,chord.name,voicing);
  }

  function hydrateChord(project,chord,instrument){
    if(!chord || chord?.voicings?.[instrument]) return chord;
    const saved = recall(project,instrument,chord.name);
    if(!saved) return chord;
    chord.voicings = chord.voicings && typeof chord.voicings === "object" ? chord.voicings : {};
    chord.voicings[instrument] = saved;
    return chord;
  }

  function rebuildFromSections(project){
    ensure(project);
    Object.values(project?.sections || {}).forEach(section => {
      if(!Array.isArray(section)) return;
      section.forEach(chord => {
        INSTRUMENTS.forEach(instrument => rememberChord(project,chord,instrument));
      });
    });
    return project.voicingLibrary;
  }

  function normalizeLibrary(raw){
    const out = {};
    INSTRUMENTS.forEach(instrument => {
      out[instrument] = {};
      const source = raw?.[instrument];
      if(source && typeof source === "object"){
        Object.entries(source).forEach(([name,voicing]) => {
          if(voicing && typeof voicing === "object"){
            out[instrument][canonicalName(name)] = clone(voicing);
          }
        });
      }
    });
    return out;
  }

  return {
    version:"voicing-store-v1",
    instruments:INSTRUMENTS.slice(),
    canonicalName,
    ensure,
    remember,
    recall,
    rememberChord,
    hydrateChord,
    rebuildFromSections,
    normalizeLibrary,
    clone
  };
})();
