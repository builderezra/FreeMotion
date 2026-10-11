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
