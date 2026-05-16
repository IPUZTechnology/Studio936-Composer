# Suite Pro Button Actions Audit

- Repository: `IPUZTechnology/Studio936-Composer`
- Branch baseline: `refactor/js-modules`
- References reviewed: PR #57, PR #58 (context), existing docs and code in current branch
- Audit date: 2026-05-16 (UTC)
- Scope: documentation only; no behavior changes.

## Method

This audit cross-checked current Suite Pro wiring in:

- `js/app.js` (runtime Suite Pro creation and bindings)
- `js/pro-suite.js` (separate Suite Pro module with fallback/legacy runner)
- `js/music-theory.js`, `js/lead-sheet.js`, `js/storage.js`, `js/midi-export.js`, `js/mixer.js`, `js/rhythm-engine.js`, `js/ui-bindings.js`
- `legacy/` snapshots for legacy-dependency context
- existing `docs/` audits

> Note: `js/suite-pro.js` does not exist in this branch. The active file appears to be `js/pro-suite.js`, while `js/app.js` also contains an embedded Suite Pro implementation. That split is a primary blocker and explains why visible buttons can remain non-functional in real runtime paths.

## Current architecture finding (root blocker)

Suite Pro currently has **two parallel implementations**:

1. **Inline implementation in `js/app.js`** that builds buttons (`v18_*`) and binds direct handlers (`showLibrary`, `showTemplates`, etc.).
2. **Module implementation in `js/pro-suite.js`** that binds each button to `runSuiteAction(...)`, which attempts global fallback function names (`openX`, `showX`, `xOpen`) and otherwise only warns/alerts "Módulo pendiente".

Because of this split, runtime behavior depends on which implementation owns the mounted DOM and whether expected globals are available on `window`. In the failing path, buttons are present but resolve to placeholder/legacy-dependent fallbacks.

---

## 15-button action map

| # | Visible label | DOM id / selector / key | Current click handler | Technical state | Expected user action | Reusable function/module | Related files | Missing dependency / blocker | Risk | Smallest safe next PR for this button |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Library | `#v18_library` / `data-v18-tool="library"` | `showLibrary` in `app.js`; fallback chain `openLibrary/showLibrary/libraryOpen` in `pro-suite.js` | **Disconnected / legacy-dependent** in module path | Open song library modal, save/open/duplicate/delete projects | `showLibrary`, `renderLibraryModal`, `storage.js` local persistence | `js/app.js`, `js/pro-suite.js`, `js/storage.js`, `legacy/` | Single source-of-truth missing for Suite action registry; module expects globals not guaranteed | Low | Add explicit action map in one module (`suiteActions.library = appShowLibrary`) and bind `#v18_library` only through it |
| 2 | Templates | `#v18_templates` / `data-v18-tool="templates"` | `showTemplates` or fallback `openTemplates/showTemplates/templatesOpen` | **Disconnected / legacy-dependent** | Open templates modal and apply selected style project | `makeTemplate`, `setProject`, `showTemplates` | `js/app.js`, `js/pro-suite.js`, `legacy/` | Dependency on global `makeTemplate` + `setProject` in module path | Low | Register a deterministic templates action that directly calls existing `makeTemplate` + `setProject` via imported/local refs |
| 3 | Transpose | `#v18_transpose` / `data-v18-tool="transpose"` | `showTranspose` or fallback `openTranspose/showTranspose/transposeOpen` | **Disconnected / placeholder path** | Open transpose modal and apply semitone transform | `transposeProject`, `showTranspose` | `js/app.js`, `js/pro-suite.js`, `js/music-theory.js` | Action ownership split; handler may not be bound from active owner | Medium | Route transpose button to one owned handler and add no-op guard if project state unavailable |
| 4 | Scales | `#v18_scales` / `data-v18-tool="scales"` | `showScales` or fallback `openScales/showScales/scalesOpen` | **Disconnected / placeholder path** | Show scale notes for current section/key/scale | `showScales`, `scaleNotes`, `SCALE_INTERVALS` | `js/app.js`, `js/pro-suite.js`, `js/music-theory.js` | Module-global lookup instead of direct module linkage | Low | Wire `#v18_scales` to `showScales` from one canonical Suite controller |
| 5 | Chord AI | `#v18_chordAI` / `data-v18-tool="chordAI"` | `showChordAI` or fallback `openChordAI/showChordAI/chordAIOpen` | **Disconnected / legacy-dependent** | Suggest chord options by mood and apply to editor | `showChordAI`, `suggestChords` | `js/app.js`, `js/pro-suite.js`, `js/music-theory.js` | Handler exists but not reliably attached in failing runtime path | Medium | Stabilize binding by exporting one `showChordAI` endpoint and removing fallback name probing for this button |
| 6 | Drums | `#v18_drums` / `data-v18-tool="drums"` | `toggleDrums` or fallback `openDrums/showDrums/drumsOpen` | **Placeholder/incorrect mapping risk** | Toggle suite drums accompaniment on/off | `toggleDrums`, rhythm helpers | `js/app.js`, `js/pro-suite.js`, `js/rhythm-engine.js` | Fallback expects modal-style names, while real action is toggle-style; mismatch causes pending state | Medium | Add explicit `drums` action mapping to `toggleDrums` (no fallback probing) |
| 7 | Mixer | `#v18_mixer` / `data-v18-tool="mixer"` | `showMixer` or fallback `openMixer/showMixer/mixerOpen` | **Disconnected / legacy-dependent** | Open Suite mixer modal and set groove/drum/reference levels | `showMixer`, addon storage helpers | `js/app.js`, `js/pro-suite.js`, `js/mixer.js`, `js/storage.js` | Mixed storage access path and non-canonical binding owner | Medium | Define one `showMixer` action in Suite registry and ensure `#v18_mixer` always binds after panel mount |
| 8 | Record | `#v18_record` then renamed to `#v18RecBtn` | `toggleRec` via id rename in `app.js`; fallback `openRecord/showRecord/recordOpen` in module | **High-risk disconnected** | Toggle idea recording from virtual/MIDI input into solo phrase | `toggleRec`, `startRec`, `stopRec` | `js/app.js`, `js/pro-suite.js` | ID mutation (`v18_record` -> `v18RecBtn`) can break secondary binders expecting old id | High | Stop mutating id; keep stable `#v18_record` and attach `toggleRec` directly |
| 9 | MIDI In | `#v18_midiIn` / `data-v18-tool="midiIn"` | `setupMidiIn` or fallback `openMidiIn/showMidiIn/midiInOpen` | **Disconnected / permissions-sensitive** | Request Web MIDI access and bind note input listeners | `setupMidiIn` | `js/app.js`, `js/pro-suite.js` | Fallback names do not match actual function; runtime permissions add uncertainty | High | Map directly to `setupMidiIn` and add user-visible unsupported-browser message path only |
| 10 | PDF | `#v18_pdf` / `data-v18-tool="pdf"` | `exportPdf` or fallback `openPdf/showPdf/pdfOpen` | **Disconnected / naming drift risk** | Export lead sheet PDF | `exportPdf`, `lead-sheet.js` helpers | `js/app.js`, `js/pro-suite.js`, `js/lead-sheet.js` | Action may be modal/open in fallback but actual implementation is immediate export | Medium | Bind `#v18_pdf` to `exportPdf` explicitly in canonical action registry |
| 11 | Lead Sheet | `#v18_lead` / `data-v18-tool="lead"` | `showLeadSheet` or fallback `openLead/showLead/leadOpen` | **Disconnected / legacy-dependent** | Open lead sheet view modal and provide print/PDF actions | `showLeadSheet`, `Studio936LeadSheet.openLeadSheet` | `js/app.js`, `js/pro-suite.js`, `js/lead-sheet.js` | Global lookup fallback may miss modular `window.Studio936LeadSheet` integration path | Medium | Canonicalize to `showLeadSheet` and keep plugin/modular fallback internal to that function only |
| 12 | Practice | `#v18_practice` / `data-v18-tool="practice"` | `showPractice` or fallback `openPractice/showPractice/practiceOpen` | **Disconnected / legacy-dependent** | Open large practice view synced to current section/chord/measure | `showPractice` | `js/app.js`, `js/pro-suite.js` | Dual-implementation ownership produces silent no-op in wrong path | Low | Bind directly to existing `showPractice` in a single suite action map |
| 13 | Share | `#v18_share` / `data-v18-tool="share"` | `showShare` or fallback `openShare/showShare/shareOpen` | **Disconnected / clipboard-dependent** | Build share URL and copy to clipboard | `showShare`, hash import/export helpers | `js/app.js`, `js/pro-suite.js`, `js/storage.js` | Fallback function discovery + clipboard permission behavior | Medium | Explicit bind to `showShare`, keep clipboard failure toast handling local |
| 14 | Inspire | `#v18_inspire` / `data-v18-tool="inspire"` | `inspire` or fallback `openInspire/showInspire/inspireOpen` | **Disconnected / legacy-dependent** | Generate randomized template + key idea and load project | `inspire`, `makeTemplate`, `transposeProject` | `js/app.js`, `js/pro-suite.js`, `js/music-theory.js` | Handler name mismatch with fallback (`inspire` vs `showInspire`) | Medium | Add direct mapping for `inspire` key; remove fallback candidate list for this action |
| 15 | Theory | `#v18_theory` / `data-v18-tool="theory"` | `showTheory` or fallback `openTheory/showTheory/theoryOpen` | **Disconnected / legacy-dependent** | Show chord notes and suggested scales in educational modal | `showTheory`, `chordVoicing`, `scaleNotes` | `js/app.js`, `js/pro-suite.js`, `js/music-theory.js` | Depends on canonical handler attachment + consistent chord inputs | Low | Bind `#v18_theory` to `showTheory` in single controller and keep parser fallback inside function |

---

## Recommended implementation order (safest -> riskiest)

1. Library
2. Templates
3. Scales
4. Practice
5. Theory
6. Transpose
7. Chord AI
8. PDF
9. Lead Sheet
10. Share
11. Inspire
12. Mixer
13. Drums
14. Record
15. MIDI In

### Ordering rationale

- **Safest first**: modal/display-centric actions that mostly read/update existing project state and have clear, already-implemented functions.
- **Medium**: actions with export/clipboard/state-transform side effects.
- **Riskiest**: actions involving timing/input devices/stateful toggles (`drums`, `record`, `midiIn`), especially where id mutation or browser API permission gates exist.

## Minimal cross-button remediation strategy (for future PRs)

Without refactoring `app.js` or rewriting Suite Pro, the smallest stable path is:

1. Create a single **Suite action registry** (documentation-aligned API) that maps each `v18_*` id to one explicit function reference.
2. Remove per-button fallback probing (`openX/showX/XOpen`) for buttons that already have concrete handlers.
3. Keep button ids stable (avoid dynamic id rename from `v18_record` to `v18RecBtn`).
4. Bind once after mount and after language rebuild, from one owner only.

This approach can be executed one button per PR, matching the table above.

## Implementation note (2026-05-16)

- Theory (`#v18_theory`) is now the first implemented Suite Pro action in the module path (`js/pro-suite.js`) with a minimal in-app modal that uses current song key when available and a safe default when not.
