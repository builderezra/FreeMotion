# AU1: audit of js/timeline.js on main v17.31 (5,907 lines)

Against `origin/main` 7125ecff. Branch `hunt/audit-timeline`. **Measured** = I ran it here (headless Chromium, the suite's own driver, 1280 and 380), **Read** = I read the code, **Guess** = I did not check.

## Result: two bugs survived, both on a REVERSED clip's head, both proven red on main and green patched

| # | Where | What he sees | Repro test | Fix | Proof |
|---|---|---|---|---|---|
| AU1-1 | `js/timeline.js` `applyTrimAt` left edge, the `rev` branch (about :4380) | Trimming the head of a **reversed** clip with the grip makes every time-driven effect on it (Drift, Spin, Orbit, Wiggle, Shake) jump: the clock `fxTimeOffset` is not carried. Measured 0.400 s at a fixed time on a 40 px drag. The forward grip (`:4423`), the A key (`clipTrimStart`) and Extend (`extendClipTo`) all carry it. | `AU1-1` | one line: write `L.fxTimeOffset = fx0 + delta` in the `rev` branch too | red on main at 1280 and 380 (control: the forward clip is steady), green patched at both; mutation A1 CAUGHT |
| AU1-2 | `js/timeline.js:4377` (left grip, `rev`) and `js/app.js:4880` (`extendClipTo`, the D key), same formula | **Pulling the head of a reversed clip with a speed ramp earlier runs the clip off the end of its source.** The cap was `(srcDur - trimStart) / sp`, and `sp` is 1 for any ramp, so the curve was ignored: on a 3x to 0.5x ramp in a 20 s file the first frame read **29.5 s** (flat speed is fine). A forward clip's tail is capped on the curve (`maxDurForSource`), a reversed tail too (`speedAdvanceSolve`); this was the one side left on a flat guess. | `AU1-2` (grip AND extend, both reported) | new `FM.revHeadGrowLimit` in `js/scene.js` (beside `speedAdvanceSolve`) bisects the real curve; both editors call it | red on main at 1280 and 380 for both entry points (29.50 s of a 20 s file), green patched at both; mutations B1 (grip back to the flat cap), B2 (extend back), B3 (limit ignores the curve) all CAUGHT |

Both fixes: `patches` are in `hunt/audit-timeline` itself (the app files on that branch carry them) and as `audit-timeline-scripts/au1-fixes.patch` against main. `index.html` busters for `scene.js`, `app.js`, `timeline.js` are bumped in the same diff. Tests: `audit-timeline-scripts/au1-tests.js` (append before `async function run()`; `?only=AU1`). Results: `au1_patched_{1280,380}.txt`, `au1_mut.log`.

AU1-2 reaches outside timeline.js (the D key's body is in `app.js`), but the keys are `FM.timeline.clipKey`, so it is reachable from this file's own handlers; the shared helper lives in `scene.js` because two files needed one cap.

## What I read, and how closely (honest coverage)

Read line by line: the clip operations behind A / S / D and the phone buttons (30 to 215), snapping and keyframe slots, delete / copy / paste keyframes (626 to 840), the colour and waveform helpers (840 to 1070), the lane maths and ruler (1082 to 1250), `buildLane`'s clip drawing and pointerdown paths (2026 to 2300), both trim grips' arming and `applyTrimAt` in full (2300 to 2420, 4296 to 4440), shift cues / fx clock / head trim (4440 to 4500), the clip-move maths and ceiling and floor (4513 to 4700), momentum and the scrub probe (4023 to 4200), and `rebuild` and the exported API (5700 to 5760).

**Not read closely** (skimmed only for patterns, so no claim either way): the track-head builder (1344 to 1612), the reorder drag handle (1614 to 2025), the empty-start and add-row effects (2813 to 3895), `buildTracks` (3895 to 4020), and the window-level pointer handlers 4700 to 5700. They are gesture code with many `queue` comments, and I found no way to drive them red without a real finger; a second pass with the finger harness is the honest next step.

## Candidates I tried to refute and dropped (so nobody re-hunts them)

- `FM.trimLayerHead` skips the `reversed` check that `clipTrimStart` has: **Read**, and it has no caller outside the tests (`grep`), so nothing reaches it.
- `groupDragFloor` / `groupDragCeil` with a member already past the project end: the comment says the ceiling can only be ahead of where the clip started, and the code does that.
- `pasteKfAtPlayhead` into a static property replaces the static value with one key: by design (paste creates the animation); not logged.
- `tc()` with a non-integer fps would print fractions, but every path that writes `project.fps` rounds to an integer (`storage.js:1015`, `app.js:8688`, `ai-ops.js:187`).
- Keyframe drag clamps to `[0, project.duration]` and `dedupDraggedKfs` removes a key under the drop: both documented (queue 625).
- A clip dragged across a gap while multi-selected jumps the block (`clipMoveToPlayhead`, playhead in a gap between selected clips): consistent with `clipToolSide`, left alone.
