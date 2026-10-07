# H47: can a USER hit the stale #tl-inner width that H41 found in four tests?

Base `origin/main` 2e3fd7a9 (v17.25). **Measured** = I ran it (headless Chromium, 380 px, real `Input.dispatchTouchEvent` taps and drags, no `FM.*` calls to change anything; `FM.*` only to READ). **Read** = I read the line.

**Short answer: no path I could find or drive leaves a user with a wrong scroll range. The four tests pollute because they write `FM.scene = …` directly; the one piece of APP code that does leave the strip stale is a test seam (`_dragTrace`). One transient (+58 px for as long as a finger drags a clip past the end) is real, harmless and self-correcting.**

## The four, and the exact call (all in tests.js, not in the app)
| test | what it does | line |
|---|---|---|
| `#254 editor key shortcuts cannot reach the project under a full-screen overlay` | `overlayKeyRig().reset(n)` swaps in a fresh scene with `duration: 5` and sets `FM.time = 1`; `restore()` puts the old scene back; nothing calls `FM.timeline.rebuild()` after either | tests.js:14813, 14829 |
| `#373 easing editor: the whole panel fits…` | `FM.scene = { project: {…, duration: 5}, layers: [] … }`, `FM.time = 2` | tests.js:20777 |
| `#276 isolate cycles three ways…` | `FM.scene = { project: {…, duration: 5} … }`, restored in `finally` with a bare `FM.scene = savedScene` | tests.js:15838, 15869 |
| `#487 desktop text editor: the Aa options do not cover the canvas…` | `FM.scene = scene([])` (5 s project), then 1080 x 1920 | tests.js:27117 |
The H41 census found the strip 5 s too long (or 6.05 s for #487) after each: `#tl-inner` keeps the width of the project that was open, and the next test that reads it (`the timeline sizes its scroll range from itself`, red 3 of 3 after any of them) fails. In the app, `FM.scene` is assigned once, at boot (js/app.js:6); the only other assignment is collab-core.js:210-212, which swaps a fixture in for a moment to compute derived writes and puts the real scene and playhead back in a `finally`. **No app code replaces the scene the way the tests do.**

## Every app write to project duration, and what follows it (Read)
- `autoFitDuration` (app.js:908-921, the one rule for project length) is called from `refreshAll` (app.js:935 region) and from collab `normalizeDerived` (collab-bridge.js:132). `refreshAll` rebuilds the timeline.
- Growth sites that rebuild themselves: addMediaLayer (app.js:3102, then `refreshAll`), app.js:4298 (`refreshAll` follows), Replace media (app.js:5285, `FM.timeline.rebuild()` follows), the Speed card (inspector.js:5996 and :6047, `FM.timeline.rebuild()` follows).
- The AI path (ai-ops.js:24, 169, 188, 242, 469) says in its header that it "does NOT commit history or refreshAll; the orchestrator owns that"; I drove the no-key demo run on a fresh project at 380 px and the strip matched the rule at every sample for 20 s.
- The two sites that do not rebuild: **timeline.js:4624** (the project grows while a clip is dragged past the end; it widens `#tl-inner` by hand, below) and **collab normalizeDerived** (a no-op for a local edit, because the local edit's own `refreshAll` already fitted the duration; for a remote edit the bridge schedules a throttled rebuild, collab-bridge.js:360-365).

## Reaching it through the real UI at 380 px (Measured; "diff" = strip width minus `scrollport + duration x pxPerSec`, after a 0.6 to 1 s settle)
Import a 6 s clip: 0. Select it (panel opens): 0. Speed card, type 50: project 12 s, 0. Type 200: project 3 s, 0. Undo, undo, redo: 0, 0, 0. Slide the playhead and tap Split: 0. Delete the clip (trash): project 0 s, strip 380, 0. Undo the delete: 0. Pinch-zoom the timeline: pxPerSec 62.8 to 188.4, 0. Viewport 380 to 560 and back: 0 and 0. Back to Home and reopen the project: 0. Drag the clip right past the end and release: 0. The same drag cancelled with a `touchCancel`: duration and start restored, 0. The AI demo run: 0. **Fourteen actions, no stale strip.**

## The one thing that is not zero: +58 px while the finger is down (Measured, harmless)
Dragging a clip past the end grows the project while the finger is still down (queue 524, timeline.js:4617-4630) and widens the strip itself with `PAD + duration x pxPerSec + laneViewW()` instead of `applyInnerWidth()`'s `laneViewW + HEAD_W + content`. At 380 px `PAD - HEAD_W` is 58 px, so mid-drag the strip is **1192 px against the rule's 1134 (58 px, 0.9 s, too long)**; the release rebuild puts it to 1134 (Measured). I tried the obvious fix (call `applyInnerWidth()` there) and **it is worse**: that call happens only when the whole second changes, so between boundaries the strip then LAGS the dragged clip's end by up to 36 px (Measured: -36, 0, -22, 0 at four samples) and the user could not scroll to the clip's end while auto-scrolling. The 58 px of slack is accidentally the safer side. **Not a bug; I left it alone.**

## The one real stale-strip source in app code: the drag seam
`FM.timeline._dragTrace` (timeline.js:4852-4876) drives the real `applyClipMoveAt`, which widens the strip, then restores the clip starts and the duration and **not the strip**. Measured: a 4 s project's strip was 996.8 px; after `_dragTrace([0,1.2,2.4,3.6,4.8,6], 4)` it stays at **1295.92 px** with the duration back to 4. `_dragTrace` is called by the 8695-region tests (the queue 524 ones, tests.js:8705, 8729, 8736), so any of them leaves the next test with a wrong strip. Not a user path (the seam is for the suite).
**Patch** (`stale-timeline-width/drag-seam-restores-strip.patch`, 43 lines, applies clean): one line in the seam's `finally`: `applyInnerWidth();`. **Test** `H47 the drag seam leaves #tl-inner the width it found…`: **red on main at 1280 and 380 ("left #tl-inner at 1295.92 px; it was 996.8 px before"), green with the patch.** CONTROL: the driven drag really grew the project.

## What to do about the four tests (not patched: the PM chose report-only for H41)
They each need a `FM.timeline.rebuild()` after they restore the scene; the structural version is a helper that swaps scenes and rebuilds on the way in and out. H41's `stateLeaks` report names each of them when they leave `tlStale` different, so a new one cannot hide.

## Not covered
A real collaborator's edit over a real network (this container has none; the code path is read, not driven); the PC layout (this was the 380 px pass); a clip dragged past the end with the zoom changed mid-drag.
