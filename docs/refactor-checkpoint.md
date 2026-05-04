# Refactor Checkpoint (post PR #42)

## Scope of this checkpoint
This document records the current JavaScript modularization status after PR #42.
It is a reporting checkpoint only (no code movement, no behavior changes).

## 1) Current modules loaded by `index.html`
Current script load order:

1. `js/instruments.js`
2. `js/rhythm-engine.js`
3. `js/song-model.js`
4. `js/storage.js`
5. `js/piano.js`
6. `js/fretboard.js`
7. `js/editor.js`
8. `js/export-text.js`
9. `js/lyrics-tab.js`
10. `js/help.js`
11. `js/lead-sheet.js`
12. `js/midi-export.js`
13. `js/flow8.js`
14. `js/i18n.js`
15. `js/arrangement.js`
16. `js/music-theory.js`
17. `js/audio-engine.js`
18. `js/transport.js`
19. `js/ui-bindings.js`
20. `js/app.js`

## 2) What has already been extracted
The following areas are already extracted into dedicated modules:

- song model (`js/song-model.js`)
- storage (`js/storage.js`)
- instruments (`js/instruments.js`)
- rhythm engine (`js/rhythm-engine.js`)
- audio engine (`js/audio-engine.js`)
- piano (`js/piano.js`)
- fretboard (`js/fretboard.js`)
- editor (`js/editor.js`)
- arrangement (`js/arrangement.js`)
- lead sheet (`js/lead-sheet.js`)
- midi export (`js/midi-export.js`)
- flow8 (`js/flow8.js`)
- ui bindings (`js/ui-bindings.js`)

## 3) What still remains in `js/app.js`
Based on the in-file inventory, `js/app.js` still carries orchestration and legacy glue responsibilities, including:

- bootstrap/init and startup wiring
- shared project state and persistence orchestration
- global DOM map and cross-module UI/state helpers
- editor wrappers/glue (section/chord/solo/lyrics coordination)
- arrangement glue integration
- transport/playback integration that is still inline or partially wrapped
- legacy enhancement blocks
- Suite Pro integration code
- export wrapper handoff logic (TXT/JSON/MIDI helper composition)

## 4) Known risks
- Browser cache can keep serving older JS bundles/files after deploys.
- Transport extraction is high risk and sensitive to hidden coupling.
- Legacy enhancement blocks still exist and increase complexity.
- Editor/arrangement coupling is sensitive and can regress easily.

## 5) Recommendation
**Stop refactor for now.**

Stabilize and test functional behavior before extracting more modules.
This checkpoint suggests prioritizing reliability and regression control over additional modular splits in the next step.

## Testing
No runtime behavior changes were introduced in this checkpoint.
