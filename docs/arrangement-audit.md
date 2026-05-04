# Arrangement / Song Structure Audit (post-refactor)

## Scope
Audit target: `project.arrangement` lifecycle and its usage across representation, rendering, selection, playback, and export.

Reviewed files:
- `js/song-model.js`
- `js/arrangement.js`
- `js/app.js`
- `js/midi-export.js`

---

## 1) Current architecture

### 1.1 Data representation (`project.arrangement`)
- Arrangement is persisted as an array of **parts**:
  - `{ id, section, label }`
- `section` points to a key in `project.sections` (actual musical content).
- `label` is a display name for that arrangement block (can diverge from section source name).

### 1.2 Defaults and normalization
- `defaultArrangement()` in `song-model` defines canonical initial song order and labels.
- `normalizeArrangement(raw, prj)` behavior:
  - Uses `defaultArrangement()` when raw is missing/empty.
  - Accepts string items (legacy shape) and converts to part objects.
  - Drops invalid entries whose `section` does not exist in `prj.sections`.
  - If everything is dropped, creates a 1-part fallback from first non-empty section.
- `normalizeProject()` always runs `normalizeArrangement(p.arrangement, merged)`.

### 1.3 Arrangement module boundary (`js/arrangement.js`)
- `Studio936Arrangement.setup(helpers)` owns:
  - `arrangementParts()` = reads/normalizes/mutates `project.arrangement` in-place.
  - `arrangementOrder()` = `arrangementParts().map(p=>p.section)` filtered to existing non-empty sections.
  - `renderArrangementBuilder()` and structure CRUD (add/dup/move/delete/rename/create variation).
- `app.js` delegates to this module via wrappers:
  - `arrangementParts()` -> `Arrangement.arrangementParts()`
  - `arrangementOrder()` -> `Arrangement.arrangementOrder()`
  - `renderArrangementBuilder()` -> `Arrangement.renderArrangementBuilder()`

### 1.4 Consumption path summary
- **UI structure panel**: `renderArrangementBuilder()` renders card + list and updates selected index.
- **Selection state**: global `selectedArrangementIndex`, plus section selector sync (`sectionSelect`).
- **Playback full song**: uses `arrangementParts()` for section traversal order.
- **TXT-like map/export text**: uses `arrangementOrder()` / `arrangementParts()`.
- **MIDI export**: modular export consumes `helpers.arrangementParts()` first; falls back to section keys.

---

## 2) Exact functions involved

### In `js/song-model.js`
- `defaultArrangement()`
- `normalizeArrangement(raw, prj)`
- `normalizeProject(p, styles, instruments)` (calls normalizeArrangement)

### In `js/arrangement.js`
- `setup(helpers)`
- `arrangementParts()`
- `arrangementOrder()`
- `renderArrangementBuilder()`
- Structure mutators:
  - `addArrangementPart()`
  - `duplicateArrangementPart()`
  - `moveArrangementPart(dir)`
  - `deleteArrangementPart()`
  - `renameArrangementPart()`
  - `createNewSection(asVariation)`
- Interaction router:
  - `handleArrangementClick(ev)`

### In `js/app.js` (direct arrangement touchpoints)
- Wrapper functions:
  - `arrangementParts()`
  - `arrangementOrder()`
  - `renderArrangementBuilder()`
- Playback:
  - `moveToNextSongSection()`
  - `startFullSong()`
  - `stopPlayback()`
  - `updatePartDisplay()` / `updateLiveUI()` (visual part labels)
- Export:
  - Export text builders using `arrangementOrder()` / `arrangementParts()`
  - `midiExportHelpers()` passes `arrangementParts` into modular MIDI exporter
  - `exportMidi()` delegates to modular path when available
- UI legacy/UX overlays (IIFE blocks near file tail) that still read/write arrangement context:
  - `getParts()` fallbacks
  - `addArrangementSelect()` and selector change handler
  - `syncArrangementEditorSelector()` and injected selector logic

### In `js/midi-export.js`
- `buildMidiBytes(project, helpers)`
  - Attempts `helpers.arrangementParts()` first.
  - Falls back to `Object.keys(project.sections)` if no valid arrangement parts.
- `exportMidi(project, helpers)`

---

## 3) Legacy blocks in `app.js` still touching arrangement

Observed at end-of-file UX enhancement IIFEs:
- Multiple post-core script blocks independently re-bind arrangement-related selectors and labels.
- These blocks include defensive fallbacks (read from localStorage / global functions) and direct writes to:
  - `selectedArrangementIndex`
  - `activeSongSection`
  - `activeSongPartLabel`
  - `sectionSelect` (dispatching `change`)
  - `renderArrangementBuilder()`
- They also use periodic refresh loops (`setInterval`) and event-based delayed sync (`setTimeout`), creating extra synchronization layers over core arrangement flow.

Why this matters:
- Arrangement is no longer consumed from a single path; multiple compatibility overlays can race or overwrite selection state.

---

## 4) UI pieces that depend on arrangement

### 4.1 Structure panel
- Owned by `arrangement.js` (`ensureArrangementCard`, `renderArrangementBuilder`, `handleArrangementClick`).
- Source of truth for arrangement list UI and block mutation actions.

### 4.2 Arrangement builder
- `renderArrangementBuilder()` redraws source select + arrangement list + active item.
- Selection is index-based (`selectedArrangementIndex`).

### 4.3 Editor section selector
- Core: selecting arrangement part updates `sectionSelect` (thus editing source section).
- Additional legacy overlays add separate “edit arrangement part” selectors and sync logic.

### 4.4 `currentPartTag`
- Driven by playback mode:
  - Groove mode: section name.
  - Full song mode: arrangement part label + “Canción completa”.
- Updated in `updatePartDisplay()` and indirectly by selection/playback transitions.

### 4.5 Full song playback
- `startFullSong()` seeds from `arrangementParts()[0]`.
- `moveToNextSongSection()` iterates arrangement by index.
- End condition tied to arrangement length.

### 4.6 MIDI export
- Modular MIDI path uses arrangement part order when available.
- If arrangement resolves empty/invalid, exporter falls back to section key order and emits error/status only when no chord data exists.

---

## 5) Messages and arrangement wording inventory

Found arrangement-related messages/strings:
- `Sin arreglo definido` / `No arrangement yet` (UX selector fallback option in `app.js` legacy block).
- `arreglo` appears in multiple statuses/prompts/help texts:
  - renaming block prompt: `Nombre del bloque en el arreglo:`
  - status messages for add/dup/delete and explanation notes
  - help/manual sections describing structure vs arrangement semantics
- English `arrangement` appears in labels/help/aria text across legacy UX blocks.

Exact phrase checks:
- `No hay arreglo definido`: not found as exact string.
- `sin arreglo definido`: found as `Sin arreglo definido`.

---

## 6) Risk points

1. **Shared mutable selection state across modules and legacy overlays**
   - `selectedArrangementIndex`, `activeSongSection`, and `sectionSelect` are updated from core and multiple IIFEs.

2. **Index-based selection can drift after mutation/normalization**
   - Arrangement CRUD and normalization can change array length/order; stale indices are frequently clamped/recomputed.

3. **Normalization is mutative and opportunistic**
   - `arrangementParts()` rewrites `project.arrangement` during reads.
   - Can silently drop invalid parts, changing behavior depending on when read occurs.

4. **Dual-source fallback logic in legacy blocks**
   - Some blocks use `arrangementParts()` if available; otherwise localStorage or raw project fallback.
   - Potential mismatch between in-memory project and storage snapshot.

5. **Playback/export dependency on arrangement integrity**
   - Full-song playback assumes non-empty normalized arrangement.
   - MIDI export has fallback behavior that may not match intended song order when arrangement is invalid.

6. **Repeated event rebinding / polling loops**
   - Tail IIFEs use `setInterval` + many delayed refreshes; increases race and non-determinism risk in selection UI.

---

## 7) Likely causes of arrangement-related bugs

- Competing selector sync mechanisms (core + legacy overlays).
- State races between section change events and arrangement list redraw.
- Silent normalization dropping parts that reference missing/renamed sections.
- Re-entrant UI refreshes (`change` dispatch -> render -> delayed sync -> render).
- Export/playback reading arrangement at different times than UI selector synchronization.

---

## 8) Recommended fix plan (no behavior change in this audit)

### Phase 1: observability and contracts
1. Define a single arrangement state contract (`parts`, `selectedIndex`, `selectedSection`).
2. Add non-invasive debug instrumentation points (dev-only logs/hooks) around:
   - arrangement normalization
   - selected index updates
   - section selector writes
   - full-song playback part transitions
   - export part resolution source

### Phase 2: consolidate read/write ownership
3. Make `arrangement.js` the only owner for arrangement selection mutation.
4. In `app.js`, route all arrangement selection writes through one API (`setSelectedArrangementIndex + selectPartByIndex`).
5. Decommission duplicated selector-sync IIFEs incrementally (feature flags / guarded removal).

### Phase 3: normalize deterministically
6. Run normalization at project load/save boundaries, not opportunistically during read paths.
7. Keep explicit reporting when parts are dropped (instead of silent loss) to aid debugging.

### Phase 4: playback/export alignment
8. Ensure playback and MIDI export share one `resolvePlayableArrangement()` helper with identical fallback policy.
9. Add regression checks (even lightweight script-level checks) for:
   - duplicated blocks
   - renamed section keys
   - empty/missing arrangement
   - section variation creation and immediate playback/export.

### Phase 5: UI hardening
10. Remove polling-based selector refresh where event-driven sync already exists.
11. Keep a single editor arrangement selector implementation (avoid parallel legacy clones).

---

## Bottom line
Arrangement is conceptually modularized (`song-model` + `arrangement` module), but `app.js` still contains significant legacy compatibility/sync layers that continue to mutate arrangement-related state. Most likely regressions are synchronization/race issues, not core data-shape issues.
