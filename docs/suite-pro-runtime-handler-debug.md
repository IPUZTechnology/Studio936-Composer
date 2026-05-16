# Suite Pro Runtime Handler Debug (Theory button / PR #67 alert path)

## Scope checked

- `index.html`
- `js/app.js`
- `js/pro-suite.js`
- `css/styles.css` (Suite Pro selectors only)
- `docs/suite-pro-button-actions-audit.md`

## Executive diagnosis

The Theory button is being created and rebound by **two different runtimes** (`app.js` and `pro-suite.js`) against the same `#v18Suite`/`#v18_theory` IDs. The final behavior depends on whichever binder runs last after mount/toggle/re-open. In the failing path, the click reaches a **legacy/fallback modal path** instead of the intended PR #67 Theory alert path.

Primary cause: duplicate ownership of Suite Pro panel lifecycle + handler binding.

---

## 1) Which script actually creates `#v18Suite` at runtime?

### Main creation path (normal startup)

- `index.html` does **not** include static markup for `#v18Suite`.
- `index.html` loads `js/app.js` first, then `js/pro-suite.js`.
- `js/app.js` calls `init()`, and that `init()` calls `addV18Ui()`.
- `addV18Ui()` creates `<div id="v18Suite">`, populates buttons, binds handlers, and inserts it after `.status-bar`.

So in normal load, `app.js` is the initial creator.

### Secondary creation path (open/toggle fallback)

- `js/pro-suite.js` defines `ensurePanel()` which also creates `#v18Suite` if missing and appends to `body`.
- `window.Studio936SuitePro.open()` and `.toggle()` call `ensurePanel()`.

So if `#v18Suite` is missing/recreated later, `pro-suite.js` can become creator.

---

## 2) Whether `#v18_theory` exists once or multiple times

Inside one mounted `#v18Suite`, both builders guard against duplicates before appending each button, so only one `#v18_theory` is intended in that container.

- `app.js` builder (`buildSuiteProContent`) reuses existing `#v18_theory` if present.
- `pro-suite.js` builder (`ensurePanel`) skips add if `#v18_theory` already exists.

Conclusion: expected runtime is **single `#v18_theory` element**, but with **multiple rebinds** on that same element across modules.

---

## 3) Which function binds click handler to `#v18_theory`

Two independent binders do this:

- `js/app.js` → `bindSuiteProHandlers()` assigns:
  - `$('v18_theory').onclick = showTheory;`
  - where `showTheory()` opens `openModal(...)` with chord/scale details.

- `js/pro-suite.js` → `bindSuiteProHandlers()` assigns:
  - `button.onclick = showTheory` for `id === 'v18_theory'`
  - where `showTheory()` does `alert('Studio 936 Theory module: basic theory view is connected.');`

So the same DOM node can have handler overwritten from either module depending on lifecycle order.

---

## 4) Whether `app.js` overwrites handler after `pro-suite.js` binds it

Yes, it can happen both ways. There is no single owner.

- `app.js` binds during startup mount (`addV18Ui()` -> `populateSuiteProPanel()` -> `bindSuiteProHandlers()`).
- Later, other flows can call `populateSuiteProPanel(suite)` again from `ensureSuiteProMounted()` / integrity checks, rebinding app handlers.
- `pro-suite.js` can bind again via `Studio936SuitePro.open()` (calls `bindSuiteProHandlers()` explicitly).

Net: whichever bind function runs last sets the live `onclick` for `#v18_theory`.

---

## 5) Whether top Suite Pro button calls `window.Studio936SuitePro.open()`, `toggleSuite()`, `addV18Ui()`, or legacy path

Top Workspace “Suite Pro” button goes to `toggleSuite()` in `app.js`.

Inside `toggleSuite()`:

- If `window.Studio936SuitePro.toggle` exists, it delegates to that (`pro-suite.js` path) and returns.
- Otherwise it toggles `#v18Suite` directly.

Because `pro-suite.js` is loaded after `app.js`, `window.Studio936SuitePro` normally exists, so top button usually enters the `pro-suite.js` toggle path.

This is the key split: UI may be initially created by `app.js`, but interaction toggle is delegated to `pro-suite.js` runtime controller.

---

## 6) Why clicking Theory opens legacy/blank modal (or “no arreglo definido”) instead of expected alert

Diagnosis from code topology:

1. Suite Pro has dual owners (`app.js` + `pro-suite.js`) for the same panel IDs and same buttons.
2. Non-Theory actions in `pro-suite.js` use `runSuiteAction(...)` fallback candidates (`openX/showX/xOpen`). If not found, it shows pending alerts/modals. This is legacy behavior.
3. `app.js` has its own richer modal system and action handlers.
4. Since both modules can rebind at different times, runtime can end up on mismatched handler set vs expected PR #67 test expectation.

For the specific Theory mismatch, there are two plausible observable outcomes from this branch:

- If `pro-suite.js` Theory binding is active: simple alert (`Studio 936 Theory module...`).
- If `app.js` Theory binding is active: in-app theory modal via `openModal('theory', ...)`.

The reported “blank legacy modal / no arreglo definido” indicates session drift into mixed legacy/fallback execution path (not single canonical theory handler ownership), consistent with duplicated Suite controller architecture already flagged in `docs/suite-pro-button-actions-audit.md`.

---

## 7) Smallest safe fix for next PR (documentation recommendation only)

Do **not** rewrite Suite Pro. Do **not** touch MIDI/transport/playback/audio/arrangement/editor.

Smallest safe change:

1. Make one canonical binder for `#v18_*` actions (prefer `app.js` existing handler map).
2. In `js/pro-suite.js`, stop rebinding per-button actions when panel already mounted by app runtime:
   - keep only open/close/toggle shell behavior, or
   - call shared binder exported by app instead of local fallback binder.
3. For Theory specifically, hard-map `#v18_theory` to one handler only (PR #67 expected handler), and remove alternate local `showTheory` ambiguity.
4. Add one debug assertion utility that logs current owner of `#v18_theory.onclick` after mount/toggle to prevent regressions.

This is minimal risk because it changes only event wiring ownership, not feature logic.

---

## CSS check note

`css/styles.css` contains visual/layout rules for `#v18Suite` and button styling only; no click-handler behavior is defined there.
