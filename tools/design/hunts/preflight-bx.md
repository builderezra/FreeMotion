# BX1, BX2, BX3: three questions from the v17.39–v17.44 pre-flights

Same container and method as `preflight-v17.38.md` sections 7 and 9 (each tree's own `tests/_cdp.py`, headless Chromium on Linux, `?after=<test>&upto=<test>` slices, "slice" = the tests after `after` up to and including `upto`). Everything on copies; the trees were restored byte for byte after each experiment.

## BX1: the five Simple 2.4 tests that are red only in the full pass (v17.43 and v17.44)

**Named: the polluter is `AU25-1 a mouse release that never arrives does not leave a canvas drag live: the layer stops following, the editor switch is allowed` (my test, from `hunt/audit-simple-13`, carried in by v17.40). It makes all five red, on both trees, and what it leaves behind comes from the editor SWITCH it does, not from its mouse events.**

The five: `simple P2.4 · T3 Reorder with a trimmed camera…`, `simple P2.4 · T3 a link whose two ends the plan moves…`, `simple P2.4 · T2 Keep on the music…`, `simple P2.4b · S7 the camera's hull after Do it anyway…`, `simple P2.4b · S7 the tail fit counts (couplingsBroken)…`.

Bisect (v17.44, target `simple P2.4 · T3 Reorder with a trimmed camera…`, test #1241): red from the start of the range, red after #1120, #1180, #1210, #1225, #1228, #1229; **green after #1230** — so the slice is red when `AU25-1` (#1230) is in it and green when it is not (the 3 tests before it, `1069 B1 …Remove Vocals…`, are innocent: the slice after #1228 is red only because AU25-1 is still in it).

Confirmed for all five, on BOTH v17.44 and v17.43, at 1280: the slice from AU25-1 through the target is RED; the same slice starting one test later (AU25-1 left out) is green.

What in AU25-1 (on v17.43, the slice AU25-1 … `simple P2.4 · T3 Reorder…`, copies of `tests.js`):
- **the mode switch is the cause:** with the two `FM.editor.request(...)` lines of AU25-1 removed (pointer events kept) the target is GREEN; with the pointer events removed and the switch kept the target stays RED.
- not the per-device memory: also clearing `fm.editor.last` / `fm.editor.hint` in `au25Restore` changes nothing (RED).
- not a simple "needs a repaint or a rebuild": adding `FM.refreshAll()` + 200 ms, or re-opening the open project, or resetting `FM.simpleTimeline` / `FM.spine` in `au25Restore`: all five stay RED.

**I did not find WHAT the round trip leaves.** The five all drive Simple's say-line (`Do it anyway`, `Why? ›`), so whatever a Full→Simple→Full switch leaves in Simple's own state is the place to look (`js/editor-mode.js`, `js/simple-timeline.js`). The shortest ways out that I know: move AU25-1 and AU25-2 (which do the same) after the P2.4 tests, or give `au25Restore` a real reset of the Simple side. The AU25-1 test is mine; it was green alone and only the pairing with the later tests shows it.

## BX2: what do `…microphone is open…` and `…phone storage full… Stay (a real tap)…` leave behind that breaks `690 replacing a clip twice then undoing twice…` (v17.41)?

**Only the second one matters, and it is the NOT RUN half. I could not name the residue.**
- Slices on v17.41 (target = test #1818): `[microphone, storage, target]` RED; `[storage, target]` RED; `[target]` green. So the `…microphone is open…` test is not needed.
- The storage test stops at its `needsTouch924()` (real finger, NOT RUN HERE) after its setup: in this container its real-tap half never runs. The target's text is byte-identical on v17.39 and v17.41 (same md5), and the same pair is green on v17.39 and on main, so it is something v17.41's own code does differently when this predecessor has run.
- A state dump taken right before the target, with the storage test in front versus without it, differs only in: the real-input channel (`window.__fmWantInput`, `__fmInputDone`, `__fmInputErr`, `__fmInputSeq`, `__fmSlow` are left set), two lazily made keys on `FM` (`selectMode` = false, `_trimArmMs` = 300) and one extra child of `<body>`. Same in both: `localStorage.setItem` and `Storage.prototype.setItem` (native, no own property), `FM.ask`, the project list, `FM.storage.flushSync()` (true), the editor mode, the open project's layers.
- Deleting the real-input globals before the target: still RED. Resetting `FM.selectMode` and `FM._trimArmMs`: still RED. So neither is the cause. **The extra `<body>` child was not identified**, and I did not trim the storage test itself to find the step that matters (the next step: bisect inside that test by returning early at each of its `__fmStep` markers).
- On the laptop that predecessor runs to its end (real finger), so it may leave nothing there; the pair being green on main and v17.39 says the leftover only matters to v17.41's Replace code.

## BX3: is the tray-B overflow at 960×700 on v17.39 only with the container's fallback font?

**Yes, among the four fonts I could try: it overflows with DejaVu Sans (what `sans-serif` resolves to here) and passes with every other.** The app's stack is `-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Inter, sans-serif`; none of the first four exists in the container, so `fc-match sans-serif` = DejaVu Sans, a wide face. Test `simple P2.2 · tray B at 1280×800, 1280×720 and 960×700 …` on v17.39 (44ba5f10) at 1280, with a `<style>` forcing the font family on the app frame before the test:

| font forced | result |
|---|---|
| (none = DejaVu Sans) | RED: `960×700: [5,4] duplicateClip lies outside the band (240–301 in 0–300) · delete lies outside the band (240–301 in 0–300) · the tray scrolls sideways (301 px in 299)` |
| DejaVu Sans | RED, the same message |
| Liberation Sans (Arial metrics) | **ok** |
| FreeSans (Helvetica metrics) | **ok** |
| Loma | **ok** |

SF Pro (the Mac's face) is nearer Helvetica/Arial in width than DejaVu Sans, which is why I read this as a fallback-font artifact, not a layout bug: the 2 px overflow comes from DejaVu's wider glyphs. SF Pro itself I cannot test here. (An earlier note of mine said the fallback was "narrower in some strings"; the suite's own font probe prints 446.45 for this container against 450.9 for the Mac, a different string; this table is the direct test.)

DONE: preflight-bx — BX1: AU25-1's editor switch is the polluter of all five Simple 2.4 tests (v17.43 and v17.44; what it leaves not found); BX2: only the storage-full test is needed, residue not found (ruled out: stubs, ask, storage, input globals, selectMode); BX3: tray B overflows only with DejaVu Sans, passes with Liberation Sans, FreeSans and Loma.

---

# BX1b and BX2b (the builder's follow-ups)

## BX1b: `hunt/bx1-v17.44` 4b0e3d46 (AU25's setup/restore now snapshot and put back `FM.scene.project`): **the five 2.4 tests are STILL RED**

Slice `AU25-1 … simple P2.4b · S7 the tail fit counts` (31 tests, #1230 to #1260) on 4b0e3d46, at 1280 AND 380:
- `AU25-1`: ok, ok. `AU25-2`: ok, ok. (They stay green.)
- `simple P2.4 · T3 Reorder with a trimmed camera…`, `simple P2.4 · T3 a link whose two ends…`, `simple P2.4 · T2 Keep on the music…`, `simple P2.4b · S7 the camera's hull…`, `simple P2.4b · S7 the tail fit counts…`: **RED, RED** (all five, both widths).

So the project snapshot is not the cause. The state diff you asked for, taken just before AU25-1 and just after AU25-2 on that tip (1280):
- **`FM.scene.project`: NO difference** (your restore works; it is not in the diff at all).
- localStorage: `fm.editor.last` undefined → `"full"`, `fm.editor.hint` undefined → `"1"`, `fm.projects` (the project's `modified` stamp moved), `fm.variantLog` (one `clapper.timing` entry added), `fm.lastError` (a `ResizeObserver loop completed with undelivered notifications` report), and one `fm.proj.*` document written (0 → 1 project keys).
- `FM.scene`: a `selectedIds` property appears (`[]`, absent before).
- Lazily created `FM` keys appear (the Simple/Full UI is built once): `selectMode`, `_fxPreview`, `_mtEasing`, `_volEasing`, `_spdEasing`, `_opaEasing`, `_fxEasing`, `_cropEasing`, `_camTab`, `_trimArmMs`.
- **The DOM: +108 elements and the Simple timeline is still in the page after the switch back**: `#ed-live`, `#loading-dot`, `.sm-secstack` 0→1, `.sm-lane` 0→1, `.sm-item` 0→4, `.sm-clip` 0→3, `.sm-strip`, `.sm-band`, `.sm-tray-2`, `.sm-tool` 0→13, `.sm-grip` 0→2, `.sm-tick` 0→14, `.sm-pin`, `.sm-vh` 1→2, `.sb-rot-in`, `.vb-na`.

Things I changed in `au25Restore` on copies, each run over the same 31-test slice (the five stayed RED every time): delete `FM.scene.selectedIds` when it did not exist before; remove every localStorage key AU25 created; delete the ten lazily made `FM` keys; (earlier, on v17.43) clear `fm.editor.last`/`hint`, `FM.refreshAll()` + 200 ms, re-open the open project, reset `FM.simpleTimeline`/`FM.spine`. And removing the Simple DOM nodes outright makes it WORSE (8 reds: `simple P2.3 · S9 option E …` x2 and `simple P2.4b · S7 Follow clips…` join the five), because the Simple UI is built once and reused.
**What is left is the Simple DOM and its internal state, built once from AU25's own scene (3 clips, 4 items) and left standing in Full.** The five tests all work through the say line (`Do it anyway`, `Why? ›`, the tray); I could not show which node or field they read stale. The shortest practical fix I know is still to run AU25-1/2 after the 2.4 tests (or in a page of their own), not to restore more state.

## BX2b: bisect INSIDE `690 with the phone storage full, leaving the project asks first — Stay (a real tap)…` on v17.41 (09358fd9)

Pair `[storage test, 690 replacing a clip twice then undoing twice…]`, with the storage test cut short by a `throw` at each step (the real exit here is `needsTouch924()`, NOT RUN HERE):

| the storage test stops… | target |
|---|---|
| natural (at `needsTouch924()`, after "back to A with new unsaved work") | RED |
| after A and B are created and opened, before the full store | ok |
| after the full store and the no-ask control, **before** "1 open → Leave anyway" | ok |
| after "1 open → Leave anyway", before "back to A with new unsaved work" | **RED** |
| after "back to A with new unsaved work" | RED |

**The step that does it is `690 storage: 1 open → Leave anyway`**, and inside it, **the real mouse click** (`realInput924` mouseMove / mouseDown / mouseUp on the app's own `Leave anyway`): with that one call replaced by a synthetic `okb.click()` the target is GREEN. What I checked on the way:
- storage and project state after that step are identical with and without it (a dump of every non-function `FM.storage` property, the open project, its layers, `fm.projects`, `fm.currentProject`, the `fm.proj.*` count): only the ids differ.
- parking the real mouse afterwards (a real move to (2,2), or to the middle of the preview): still RED. So it is not where the mouse is left.
- the one thing a dump of the page shows differently after the real click is **`document.hasFocus()` / the top window's: true after the real click, false after the synthetic one** (the active element, selection, hover, the frame's offsets, viewport size, pointer/hover media queries and the Ask dialog are the same).
- I could NOT confirm focus as the cause: a stray real click on its own (placed in a hook before the target) did not give the page focus here and itself changed what the target saw (`setup: after two replaces the clip shows q915a-hfORIGINAL-….png, not the third file`), so that experiment says nothing.
So: the leftover is "the page is the focused window after a real click", or something else a real click does that a synthetic one does not; the same pair is green on main and on v17.39 (the target's text is byte-identical there), so what reads it is v17.41's own Replace-media code. A grep for `focus` handlers in what 2.3 changed around Replace would be the next step.

## BX3 (fixed by the builder, 0d34502e): not re-run.

DONE: preflight-bx BX1b/BX2b — 4b0e3d46: the five stay RED at both widths, AU25-1/2 green, `FM.scene.project` is identical before and after (not the cause), what is left is the Simple DOM built from AU25's scene; BX2b: the step is "1 open → Leave anyway", its real mouse click (synthetic click = green), the visible difference is page focus.

---

# BX2c: the Replace test and the `stillCurrent()` guard (v17.41 09358fd9, v17.42 0ea7e93a)

**The guard theory does not hold: no "Media was not replaced" toast fires, v17.41 has no such guard at all, and keying the guard on `layer.id` on a tree that does have it changes nothing.**

Method as before (own `_cdp.py` copy, 380 and 1280, slice `after=<microphone test>&upto=<690 replacing a clip twice…>` = `[storage-full test, target]`). Everything on copies of `tests/tests.js` / `js/app.js`, restored byte for byte (`git status` clean afterwards). FM.toast is wrapped at the START of the storage test and every call is recorded. The suite driver strips `<…>` and cuts failure text at ~300 characters, so the data is carried out through extra tests `Z0…Z13` placed after the target (each throws a 230-character slice, `<`/`>` swapped for `{`/`}`).

**(1) The exact failure message (380, identical at 1280, identical on v17.41 and v17.42):**
`control: ONE undo of a replace (the queue 829 case) no longer brings the previous file back — it shows q915a-hfORIGINAL-<timestamp>.png`
Everything before it passed, including `setup: after two replaces the clip shows the third file`, so BOTH replaces landed. The break is at the first undo: it goes back to the ORIGINAL, not the second pick. (Earlier I saw the `setup:` message only in an experiment that changed what the target saw; the real red is this one.)

**Every toast recorded (storage test start → target failure):** exactly one, `Storage full — autosave paused. Use ⚙ → Save project file to keep your work.` (from the storage test). Nothing during the target.

**(2) Did "Media was not replaced — the project changed while it was opening" fire? NO.** Neither did the other guard toast (`…while the picker was open`), nor `Could not load that file`, on either tree.

**Also: v17.41 (09358fd9) does not contain the guard.** `git grep stillCurrent` finds nothing in its `js/`; the guard (B1, `5e8337da`) is in v17.40 (f74966dd) and v17.42/43/44, not in v17.41's chain (2.3 sits on 2.2, not on the Full batch). So the pair is red on a tree without the code the theory blames. It is red identically on v17.42, which has it. Target alone (instrumented) is green on v17.42.

**(3) The extra `<body>` children (taken against the body's children at the start of the storage test):** two, not one.
- `DIV`, id `fm-ask`, class `hidden`: `<div class="hidden" id="fm-ask"><div class="fm-ask-card" aria-modal="true" aria-labelledby="fm-ask-title" aria-describedby="fm-ask-msg" role="alertdialog"><div class="fm-ask-title" id="fm-ask-title">` (200 chars, the app's own Ask dialog, built lazily the first time an ask is shown).
- `DIV`, id `loading-dot`, no class: `<div id="loading-dot" aria-live="polite"><svg viewBox="0 0 24 24" aria-hidden="true"><circle class="ld-track" cx="12" cy="12" r="9"></circle><circle class="ld-arc" cx="12" cy="12" r="9"></circle></svg` (200 chars, the loading spinner).
These are ordinary lazily built UI, hidden; I have no evidence they are the cause (the earlier note that there was one extra child was a count from a different baseline).

**(4) Keying the guard on `layer.id` (v17.42, the tree that has it):** both `FM.layerById(FM.scene, id) === layer` became `!!FM.layerById(FM.scene, id)`. The pair is **still RED**, same message, same toasts (380). Not pushed as a fix and not a fix.

**What this leaves:** the storage test's real mouse click (BX2b) changes something that makes the first undo after two Replaces land on the original; the Replace guard is not involved. The thing to look at is the UNDO side of replace (the one-slot-per-layer stash from queue 829, `FM.history`), and whether the two replaces were recorded as two history entries when the pair runs. I did not measure the history depth; that is the next cheap step if the builder wants it.

DONE: preflight-bx BX2c — the failure is the first-undo control (`ONE undo of a replace … shows q915a-hfORIGINAL`), not a refusal; NO "Media was not replaced" toast fires (only the storage-full toast is recorded), v17.41 has no such guard, keying it on layer.id on v17.42 stays RED, extra body children are `#fm-ask.hidden` and `#loading-dot` (both ordinary lazy UI).

---

# BX2d and BX1d (both are test-environment artifacts at the root; BX1d also found one REAL bug)

## BX2d (v17.41, 09358fd9): "after a real click, two Replaces become ONE undo step": NOT reachable by a user; the app's Replace code is fine

**What merges them: nothing merges. The FIRST replace never happens.** `FM.history._steps()` and the layer's `mediaRev` after each step of the 690 replace test, on the pair `[storage-full test, target]` at 380 (v17.41 and v17.42 identical):

| after | history | mediaRev | clip shows |
|---|---|---|---|
| start | len 2, index 1 | none | ORIGINAL |
| replace #1 (`fB`) | **len 2, index 1 (no step)** | **none** | **ORIGINAL (unchanged)** |
| replace #2 (`fC`) | len 3, index 2 | 1 | THIRD |
| undo #1 | len 3, index 1 | none | THIRD, then ORIGINAL |

So replace #2 is the only one that lands, there is exactly one step to undo, and one undo goes straight to the original. That is what the test's control line reported ("ONE undo… shows ORIGINAL"). The setup line (`after two replaces the clip shows the third file`) passes because replace #2 did land.

**Why #1 is lost** (instrumented `pickReplacement`, on a copy): before the first `input.click()`, `navigator.userActivation.isActive` is **true** (left over from the storage test's real mouse click), before the second it is **false**. With activation, `input.click()` really opens the native file chooser; the test assigns `input.files = [SECOND]` and fires `change` (the app loads it: `CHANGE files=1`, `loaded=true`), but the driver then closes the open chooser, which fires a SECOND `change` with `files=0` (log: `CHANGE files=1`, `load file=SECOND`, `CHANGE files=0`, `load file=undefined`, `loaded=false`, `loaded=true`). The empty one settles `picked` with `null` first; `replaceMedia` then does nothing (`swapIn` never runs for #1), and the genuine load's result is ignored. No `cancel` event is involved (I logged it: none).

**Can a user hit it? No.** A person's file arrives only through the chooser, one `change` with the file in it; the test's "assign files by hand while a real chooser is open" is what produces the second, empty `change`. The app already treats an empty `change` as a cancel (`load()` returns null on no file), which is the right thing. I did not change `app.js`.

**Test-side fix (pushed as `hunt/bx2d`, 78215e84, test only, on a copy of 09358fd9):** the 690 replace test keeps `HTMLInputElement.prototype.click` shut for file inputs for its duration and restores it in `finally`. The pair `[storage-full test, target]` goes from RED to **green at 380 and 1280** (the storage test's own line stays `NOT RUN HERE`), the target alone stays green, and the same patch makes the pair green on v17.42 too (380). Red-first is the unpatched pair above; reverting the stub is the mutation and brings the red back.

## BX1d (v17.42, 0ea7e93a): the Simple surface left standing, and what a user can hit

I drove it the way he would (Simple, back to Full, change something, Simple again) and compared the tray with a forced refill, the Simple items with `FM.spine.read`, and the say line. Seven Full-side changes (delete a clip, speed, volume to 0, trim shorter, add a text, select another clip, deselect all) plus opening a different project:

- **The timeline (items), the say line and Do it anyway are NOT stale for a user.** The Simple timeline is rebuilt on every entry (`apply` → `timeline.rebuild` → `simpleTimeline.rebuild`), the items always matched the scene, the say line was empty after the round trip, and any pointer press outside the line (the cog tap that switches editors) clears the line anyway, so a line with Do it anyway cannot survive a pointer switch. Its retry also re-plans from the current scene.
- **The tray IS stale in one real case: add a TEXT (any item made in Full) and enter Simple: the tray shows the previous selection's tools.** Repro (380 and 1280): three pictures, select the second, enter Simple, back to Full, `addTextLayer`, enter Simple: the tray reads `into, crop, forward, backward, stay, more, delete` (the picture's tools) under a selected text; it should read `Edit words, Stay put, More, Delete`. Calling `FM.refreshAll()` does not fix it. Cause: `FM.simpleTools.sync()` redraws only when its signature changes. `apply()` runs the tray (via `syncSelectionChrome`) BEFORE the timeline is rebuilt, so it draws from the PREVIOUS Simple read (`R`), which has never heard of the new text; the rebuild then computes the same signature (the text is not on the main row, and the signature held neither the item's kind nor its row), so no redraw. A user can reach it by adding or selecting anything new in Full and switching back.
- **Fix (app, `js/simple-tools.js`, `?v=6` → `7`; branch `hunt/bx1d`):** the signature now also carries the layer's type and `audioOnly`, and the selected item's unit kind, host and main/overlay (what `trayFor` actually reads from `R`). Red-first test `BX1d the tray on entering Simple belongs to what is selected NOW…`: RED on 0ea7e93a (380 and 1280) with the message above, GREEN with the fix (380 and 1280). Reverting the fix is the mutation: red again. The whole `simple ` family (130 tests) is green at 380 with the fix.

**And the five 2.4 full-pass reds (BX1/BX1b) were NOT this.** With the tray fix alone the AU25-1…target slice (31 tests) is still RED for the same five. What they read stale is **the say line's "is a finger down" flag**: Simple's say line (`ptrDown` in `js/simple-timeline.js`) is set by every `pointerdown` on the document and cleared by `pointerup`/`pointercancel` on the document, and its Do it anyway / Why? › buttons ignore every press until that flag is false. AU25-1/2 fire pointerdowns on the canvas and pointerups/cancels on `window` (which never pass through the document's capture listeners), so after them the flag stays true. Proof: a say line with a button raised right after AU25 is still `aria-disabled="true"` after 700 ms and its click does not fire (`fired after click=0`); this is exactly what the five tests press (`Do it anyway`, `Why? ›`). **One line in `au25Restore`** (dispatch `pointerup` and `pointercancel` on the document) makes the 31-test slice **31/31 green at 380** (also run at 1280 with the new test inside it: 32/32). It is the first commit on `hunt/bx1d`.
**Can a user hit the stuck flag? No:** a real press ends in `pointerup`/`pointercancel` delivered through the document, and the very next tap anywhere clears it, so the buttons only stay dead for as long as no real pointer event happens, which is true in a test and never for a finger.

DONE: preflight-bx BX2d/BX1d — BX2d: the first Replace never lands because leftover user activation opens a real file chooser whose empty `change` cancels it (not user-reachable; test-side fix on `hunt/bx2d` 78215e84, pair green at 380 and 1280). BX1d: timeline, say line and Do it anyway are not stale for a user; the five 2.4 reds were AU25 leaving the say line's `ptrDown` true (one line in `au25Restore`, slice 31/31); and one REAL bug found, the tray stays on the old selection's tools after Full adds a text (fix in `simple-tools.js` signature, red-first test, `hunt/bx1d`).
