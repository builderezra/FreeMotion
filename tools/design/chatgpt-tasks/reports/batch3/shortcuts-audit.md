# Keyboard shortcut audit

Snapshot: `28104a3e83e01ac3880db3fac604a7444c7235aa`

Source review of the app's global key handler and the shortcut sheet. The sheet is assembled in `js/shortcuts.js`; the global handler is in `js/app.js`. No source files were changed and no browser/device behavior was executed.

## Confirmed findings

### 1. Tab is captured as a layer-selection shortcut, blocking ordinary keyboard focus navigation

**Severity:** High  
**Confidence:** High (source path confirmed; impact follows from the standard Tab key behavior)

**Evidence:** `js/app.js:8795-8796` excludes only input, select, textarea and contentEditable targets from global shortcuts:

> const inEdit = !!(tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'SELECT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable));

Then `js/app.js:8956` prevents Tab's default action regardless of which ordinary button/link has focus:

> else if (e.code === 'Tab') { e.preventDefault(); const ls = FM.scene.layers; if (ls.length) { const i = ls.findIndex(l => l.id === FM.scene.selectedId); const n = ((i < 0 ? 0 : i + (e.shiftKey ? -1 : 1)) + ls.length) % ls.length; FM.selectLayer(ls[n].id); } }

The help sheet advertises the custom behavior at `js/shortcuts.js:50`:

> ['Tab / ⇧Tab', 'Select next / previous layer'],

**Trigger:** Open a project on PC, focus a normal toolbar/menu button (not a text field), then press Tab or Shift+Tab. The handler consumes the key before the browser can move focus to the next/previous control; with layers present it selects a layer instead. When there are no layers, it still prevents focus movement.

**Impact:** Keyboard-only users cannot use the normal Tab sequence through editor controls while this handler is active. The custom layer-selection behavior and browser navigation share the same unmodified key.

### 2. The help sheet omits supported redo and deletion shortcuts

**Severity:** Low  
**Confidence:** High

**Evidence:** The help list shows undo and Shift+Cmd/Ctrl+Z redo at `js/shortcuts.js:48-49`:

> ['⌘/Ctrl + Z', 'Undo'],  
> ['⌘/Ctrl + ⇧ + Z', 'Redo'],

But the global handler also handles Cmd/Ctrl+Y at `js/app.js:8859`:

> if (mod && (e.key === 'y' || e.key === 'Y')) { if (inEdit) return; e.preventDefault(); if (FM.history) FM.history.redo(); return; }

And it handles Backspace as well as Delete at `js/app.js:9020`:

> else if (e.code === 'Backspace' || e.code === 'Delete') { e.preventDefault(); FM.deleteSelected(); }

Neither Cmd/Ctrl+Y nor Backspace appears in the help array at `js/shortcuts.js:29-53`.

**Trigger:** Open the ? shortcut sheet and inspect redo/delete; both working alternatives are undiscoverable from the in-app list.

**Impact:** Users who expect Ctrl/Cmd+Y for redo or Backspace for deletion may miss supported actions. This is a documentation mismatch, not a shortcut execution failure.

## Shortcut inventory checked

The help sheet covers play/pause; dynamic Add-menu keys; layer nudging and frame stepping; start/end; Add-marker movement; loop-region keys; marker; timeline zoom; clip A/S/D actions; delete; duplicate/copy/paste/select-all; undo/redo; layer selection; Escape and help. The global handler additionally accepts Backspace and Ctrl/Cmd+Y, and exposes category shortcuts 1–9 when a layer is selected. The specialized text editor, Home project-name editor, Ask dialog, settings and inspector fields register their own Enter/Escape handlers; those were reviewed as contextual handlers rather than global editor shortcuts.

## Scope and exclusions

This is a source review only; behavior should be confirmed with a keyboard on PC and phone-size layout. Previously recorded overlay-specific keyboard failures and drawing-mode undo are omitted here as already recorded in `audits/*.json` / `REQUESTS.md`.
