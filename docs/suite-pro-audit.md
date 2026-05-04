# Suite Pro Visibility & Publication Audit

## Scope
- Repository: `IPUZTechnology/Studio936-Composer`
- Branch: `refactor/js-modules`
- Date: 2026-05-04 (UTC)
- Constraints respected: report-only (no behavior changes), no MIDI/transport/arrangement edits.

## Executive summary
Suite Pro **is present and loaded at runtime**, but it is **not statically present in `index.html`**. It is dynamically created by `addV18Ui()` in `js/app.js`, starts in a **closed/hidden state**, and requires a toggle path (`#v19ToolsToggle` and/or v25 workspace “Suite Pro” action) to be visible. In the v25 UX mode (`body.v25ux-clean`), the legacy side toggle button is explicitly hidden by CSS, so visibility relies on workspace controls and Suite-close/open state synchronization.

## 1) Where Suite Pro code lives

### Primary runtime implementation
- `js/app.js`
  - `addV18Ui()` dynamically builds and mounts `#v18Suite` and all Suite buttons.
  - `init()` calls `addV18Ui()` at startup and re-creates it after language changes.
  - v19 tools toggle creation/open-close behavior is managed around `#v19ToolsToggle`.
  - v25 workspace mode includes `toggleSuite()`, `closeAll()`, `addSuiteClose()`, and bar button wiring.

### Styling / visibility rules
- `css/styles.css`
  - Base Suite panel geometry and hidden-open transforms for `#v18Suite`.
  - Toggle button geometry and open state for `#v19ToolsToggle`.
  - v25 UX overrides, including hiding `#v19ToolsToggle` and repositioning Suite panel.

### Legacy mirror/reference
- `legacy/studio936_composer_ Modular.html`
  - Contains legacy inline counterparts of Suite logic and styles; useful for parity checks but not primary runtime in modular app.

## 2) Whether Suite UI exists in HTML or is dynamic
- `index.html` does **not** ship `#v18Suite` static markup.
- Suite panel is created in JS only, via `document.createElement('div')`, `bar.id='v18Suite'`, and `status.insertAdjacentElement('afterend', bar)`.
- Therefore, Suite visibility depends on:
  1. `.status-bar` existing at init time.
  2. `addV18Ui()` running successfully.
  3. Open/close class state (`.v19-open`) and related toggles.

## 3) Exact HTML elements / selectors involved

### Core panel and controls
- Panel container: `#v18Suite` with class `.v18-suite`.
- Title: `.v18-suite-title`.
- Button container: `.v18-suite-buttons`.
- Tool buttons: `.v18-pill` with generated IDs:
  - `#v18_library`, `#v18_templates`, `#v18_transpose`, `#v18_scales`, `#v18_chordAI`, `#v18_drums`, `#v18_mixer`, `#v18_record` (renamed to `#v18RecBtn`), `#v18_midiIn`, `#v18_pdf`, `#v18_lead`, `#v18_practice`, `#v18_share`, `#v18_inspire`, `#v18_theory`.
- Detection strip:
  - `#v18DetectOut`, `#v18ApplyDetected`, `#v18DrumBtn`.

### Toggle / open-close controllers
- Legacy/progressive toggle button: `#v19ToolsToggle`.
- Open class on suite: `#v18Suite.v19-open`.
- Toggle button open class: `#v19ToolsToggle.open`.
- v25 workspace bar action: `[data-ux-open="suite"]` routed to `toggleSuite()`.
- v25 Suite close button appended inside panel: `#v25uxSuiteClose` with class `.v25ux-suite-close`.

## 4) CSS classes/rules that hide or show Suite Pro

### Default hidden state
- `#v18Suite` is placed off-canvas via:
  - `transform: translateX(calc(-100% - 18px));`

### Visible/open state
- `#v18Suite.v19-open`:
  - `transform: translateX(0);`

### Toggle visibility behavior
- `#v19ToolsToggle` is the visible control in v19/v20 flows.
- `#v19ToolsToggle.open` changes position/appearance when Suite is open.

### v25 clean UX special case
- `body.v25ux-clean #v19ToolsToggle { display:none !important; }`
  - This removes the legacy external toggle from view.
- Suite remains present (`body.v25ux-clean #v18Suite ...`) and must be opened through workspace interaction (`toggleSuite()`) rather than the hidden toggle.

## 5) JS functions that create/open/close/update Suite Pro

### Creation and binding
- `addV18Ui()`
  - Creates `#v18Suite` dynamically.
  - Injects all Suite controls.
  - Wires handlers to existing feature functions (library/templates/transpose/scales/chordAI/etc.).

### Lifecycle
- `init()`
  - Calls `addV18Ui()`.
  - Rebuilds Suite after language switch (`q('#v18Suite')?.remove(); addV18Ui();`).

### Open/close controllers
- v19 tooling block creates/updates `#v19ToolsToggle` and toggles `.v19-open`.
- `toggleSuite()` (v25 workspace path) toggles `#v18Suite.v19-open` and syncs workspace active-state UI.
- `closeAll()` closes suite and removes toggle open state.
- `addSuiteClose()` appends an internal close button (`#v25uxSuiteClose`) to close Suite panel in v25 UX.

## 6) Why Suite Pro is not visible in UI (root cause analysis)
Primary visibility causes (non-mutually-exclusive):
1. **Expected default closed behavior**: Suite starts hidden until a toggle action adds `.v19-open`.
2. **Dynamic-only mount**: if `addV18Ui()` does not run or cannot find `.status-bar`, no Suite DOM exists.
3. **v25 UX hides legacy toggle**: when `body.v25ux-clean` is active, `#v19ToolsToggle` is hard-hidden, so users relying on that control will think Suite is unavailable.
4. **UX discoverability gap**: activation path is shifted to workspace controls (`Suite Pro` button), not the old side toggle.

## 7) Loaded-but-hidden vs missing-from-UX-bar
- In current architecture, Suite is generally **loaded but hidden** (off-canvas) unless opened.
- In v25 mode, Suite is **not missing**, but the **legacy opener is missing by design** (`display:none`), replaced by workspace action routing.
- If workspace bar fails to render or route `suite`, Suite becomes practically inaccessible despite being mounted.

## 8) Legacy dependency assessment
- Suite Pro logic in `js/app.js` still reflects legacy v18/v19 naming and coupling (e.g., `addV18Ui`, `v19ToolsToggle`, `v19-open`).
- The codebase itself contains an inline legacy mirror in `legacy/...Modular.html`; current modular app appears to have ported these blocks rather than fully decoupled module boundaries.
- This means activation/publish work should treat Suite as a **legacy-integrated feature surface** and avoid partial extraction without controller parity.

## 9) Risk points (safe publication concerns)
1. **State sync risk**: multiple control paths (`#v19ToolsToggle`, workspace suite button, internal close button) must stay in sync for classes/text/active states.
2. **Language refresh rebuild**: Suite DOM is destroyed/recreated on language change; external references to old nodes can break.
3. **Dependency-on-presence risk**: `addV18Ui()` silently returns if `.status-bar` missing or suite already exists.
4. **UX-mode divergence**: v25 hides legacy toggle; if workspace wiring regresses, Suite appears unpublished.
5. **Legacy naming coupling**: v18/v19 IDs/classes are hard-coded in CSS/JS; accidental rename breaks visibility.

## 10) Recommended activation plan (without enabling now)
1. **Documented toggle contract**
   - Define one canonical “suite open state” contract (`#v18Suite.v19-open`) and required UI synchronizations.
2. **Instrumentation pass (no behavior change)**
   - Add temporary diagnostics (or debug notes) around Suite mount and toggle routing to validate open path in each UX mode.
3. **v25 discoverability validation**
   - Confirm workspace “Suite Pro” button always renders and calls `toggleSuite()` when `body.v25ux-clean` is active.
4. **Controller parity checklist**
   - Verify parity of open/close from: side toggle (where visible), workspace button, internal Suite close button, and `closeAll()`.
5. **Only then activation flagging**
   - Introduce publish/enable decision behind a controlled feature gate once all paths are validated.

## 11) Post-activation test plan
(Recommended tests after explicit activation work; not executed in this audit.)

### Visibility and access
- Suite mounts on app init and after language toggle.
- Suite opens/closes correctly from every entry point.
- v25 mode: Suite accessible without `#v19ToolsToggle`.

### UI sync
- Toggle labels/states (`open/close/tools/suite`) stay consistent.
- Workspace “Suite Pro” button active-state reflects panel state.

### Regression boundaries (per current constraints)
- No regressions in MIDI handlers.
- No regressions in transport controls.
- No regressions in arrangement workflows.

### Responsive checks
- Desktop, tablet, and small-screen breakpoints for Suite position and open state.

## 12) Conclusion
Suite Pro is implemented and loaded, but discoverability and publish perception are constrained by hidden-by-default behavior and v25 toggle-hiding rules. Safe publication should focus on access-path reliability and state-sync hardening, not feature creation.
