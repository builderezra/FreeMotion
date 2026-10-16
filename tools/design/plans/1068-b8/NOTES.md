# #1068 B8 — C31 still-frame half, ported (branch `hunt/1068-b8`, off v17.57 `06a81ba5`)

Frame Stutter and Time Warp Scan showed the wrong picture after the playhead JUMPED (a seek, a scrub backwards):
Frame Stutter showed the frame at the playhead instead of the start of its hold, and Time Warp Scan refilled its
whole frozen band from the frame at the playhead. On a **shape** or a **still image** (not video) both now draw the
past again and show exactly what playing up to that moment shows.

**Nothing was run except `node --check`** (a v17.58 ship was running on the laptop). Every browser check below is OWED.

## Prerequisite

B2's `fea15508` ("Keep Frame Stutter hold phase through keyed Rate") is IN v17.57: `js/compositor.js` framestutter
integrates a keyed Rate (`FM.integrateProp(p.rate, t - elapsed, t, …) + 1e-9`, the `+ 1e-9` added by land-b3 F1).
B2 landed in v17.44 (#1069's log). Nothing of B2 was re-landed here.

## What landed, per commit (one squashed change; nothing cherry-picked)

The pile commits are interleaved with the video half (T36–T38 video commits b050da19, 93b499ce, … 6ed01d4d) and T22
(worker export). Their shared structure (a `sampleAt` closure, the upstream allowlists, the parent check) was first
written INSIDE video commits, so the port is a hand rebuild of the final shape/still behaviour at `a53aa716`, minus
every video, decoder, worker and resume line. What each listed commit contributed:

| Commit | Took | Dropped, and why |
|---|---|---|
| T36 `097aa3ac` | the stateless Frame Stutter path: `expand.sampleAt` redraws the layer at the hold boundary; keyed Rate inverted by bisection; `jit` hoisted; `rec` only made on the old path; its test | its three rewritten `HEAD482B` shape goldens (fix 1: defaults stay v17.57's) |
| T36 `7f1e3a5a` | upstream "safe" effects may sit above Frame Stutter on a shape; its test | — |
| T36 `69234c60` | Time Warp Scan rebuild: strip-by-strip from each project frame of the sweep, strip-sized sample viewport; `sampleAt` shared by both effects; its test | `resumeRenderer … c31-shape-timewarp-1` (fix 3) and the test's MP4-resume half |
| T36 `d4ef276e` | whole-sweep / same-phase jump detection and Mode/Direction/Repeat change detection; its test lines | `0.34` s → `0.34 * dur` (fix 2); and see "port fix C" |
| T36 `4fa16b3a` | `simpleTemporalParent` (a pure-function-of-time null parent); its test | — |
| T36 `51a2043a` | decoded still images take the Time Warp rebuild; its test | resume tag + resume half of the test |
| T36 `66e23a4d` | a cropped still is allowed (only `_cropEditing` excluded); its test | — |
| T36 `df1572b5` | decoded stills take the Frame Stutter path; its test | its three rewritten `HEAD482B` image goldens (fix 1), resume tag + resume half |
| T36 `df62ae95` | rotating/scaling null parents allowed on whole-plate samples; its test | resume tag |
| T36 `8080c211` | Time Warp under a rotated parent uses the whole plate; its test | resume tag |
| T36 `7e956a1b` | same for stills; its test | resume tag |
| T36 `b28993ca` | — | whole commit: a resume tag only (LAND-LIST §B8, fix 3) |
| T37 `382a4577` `65b06b35` | hard and feathered legacy vector masks allowed under Frame Stutter; their tests | resume tags |
| T37 `81d68d6b` | one MARKED pen mask above Frame Stutter is part of the held picture; its test | resume tag; the fixture's invented `type: 'pen'` (now `FM.masks.make('add')`) |
| T37 `85aef144` `f30a19cd` | hard/feathered vector masks under Time Warp (whole plate); their tests | resume tags |
| T37 `0fbd6cd2` | marked pen mask above Time Warp (whole plate); its test | resume tag; `type: 'pen'` in the fixture |
| T37 `49714393` `d1ce0da9` | masked / feather-masked stills under Time Warp; their tests | resume tags |
| T38 `0ee40ea0` | Brightness above Time Warp on a shape; its test | resume tag |
| T38 `37aea798` | Contrast above Time Warp on a shape (its compositor hunk's shape line) | its `FM.timeWarpVideoPlans` hunk and its test (both video). Fix 4 adds the shape test |
| T38 `c71d0c8b` | Brightness/Contrast above Time Warp on a still; its test | — |
| T38 `904a8aa5` `d3be408e` `913fd481` `29babcd9` | Levels, Gamma, Vibrance, Colour Balance above Frame Stutter; their tests | resume tags; the separate list they widened (fix 5) |
| T38 `5b659a3e` `c0df65e1` `f2143d2a` `7e54fddf` `18a1f4ee` `30412697` `ebb4019f` `bc31aee7` `8e4780a3` `ab907edc` `54c023ef` `e7fceb82` `e8e0f807` `a53aa716` | Levels, Gamma, Saturation, Vibrance, Colour Balance, Exposure, Hue Shift above Time Warp, shapes and stills; their tests | resume tags; the two separate lists they widened (fix 5) |

Dropped across the board: every `_frameStutterSources` / `_frameStutterMediaSource` / `_timeWarpVideoSources` /
`FM.withFrameStutterSources` / `FM.withTimeWarpVideoSources` / `FM.renderTimeWarpVideoSource` /
`FM.frameStutterVideoPlans` / `FM.timeWarpVideoPlans` line, the drawLayer `stutterSource` hunk, `frameStutterClock`
(a video-commit refactor — the live clock code is kept as it is, with land-b3 F1's `+ 1e-9` / `+ 2e-9`),
`createCanvas()` (T22's; `document.createElement('canvas')` here), every js/exporter.js, js/app.js, js/frames.js and
js/export-worker.js hunk (all video, worker or resume), every index.html bump (re-done once below).

## The five fixes, and where

1. **Snap Frame Stutter to the frame grid** — `js/compositor.js` framestutter, `snap = (at, cap) => min(cap, ceil(at·fps − 1e-9)/fps)`,
   fps = `scene.project.fps`. The hold is `snap(atPhase(qLo), t)`. The six `HEAD482B` Frame Stutter goldens in
   tests/tests.js are **v17.57's, untouched** (the pile's six rewritten hashes were never brought in).
2. **Jump threshold `0.34 * dur`** — timewarp `jumped`. Also: the clock and setting tests apply only where the past can
   be redrawn (`rebuild`); every other layer (video above all) keeps v17.57's `jumped` test byte for byte.
3. **No resume tags** — none ported. `js/export-resume.js:83-89` already puts the version label into the signature.
4. **Contrast on a shape** — test `1068 B8 Time Warp Scan cold-seeks a moving shape with keyed upstream Contrast`.
5. **One shared list** — `C31_PIXEL_UPSTREAM` in js/compositor.js (no prototype, frozen), read by `c31Redrawable`
   for both effects, exposed read-only as `FM._c31PixelUpstream`. 14 entries: brightness, contrast, saturate, hue,
   grayscale, sepia, invert, exposure, temperature, tint, levels, gamma, vibrance, colorbalance. Test
   `1068 B8 one shared list - …` proves every entry is pixel-by-pixel (controls: Gaussian Blur and Vignette must be
   caught) and that BOTH effects take every entry (control: Gaussian Blur above them keeps the old path).
   **Consequence:** the pile's Frame Stutter list also allowed `blur` and `vignette`; they are not pixel-by-pixel, so
   Frame Stutter over an upstream Gaussian Blur or Vignette keeps v17.57's history path (not fixed, not changed).
   Time Warp gains grayscale, sepia, invert, temperature and tint, which the pile never proved on it — the shared-list
   test proves each on both effects. **B11 (video) must read this list too.**

## Port fixes beyond the land list (found while porting; say no to any)

- **A. A sweep that ends between two frames.** The pile's rebuild took the last strip of a FINISHED sweep from the
  playhead; playback took it from the first frame after the sweep's end. At 30 fps every slider value (0.1 s steps)
  lands on a frame; at 24 or 25 fps most do not. Now `min(t, (through + 1) / fps)`. Test: `…a sweep that ended between
  two frames…` (24 fps, 0.3 s).
- **B. Frame Stutter's trail is the hold playback showed on the frame before this hold began**, not `q − 1`: a hold
  shorter than a frame (Irregular holds, or Rate above the project fps) never reached the screen, so v17.57's playback
  trailed the one before it; and Phase 1 starts the clip in hold 1, whose trail was empty. Matters for saved
  Hold + Trail projects with Irregular holds.
- **C.** `0.34 * dur`, the time test and the setting-change test only where `expand.sampleAt` exists (see fix 2).
- **D.** An image layer filled with media (`fillMode 'media'`) keeps the old path (the pile excluded it only for shapes).
- **E.** `simpleTemporalParent`'s `wholePlate` argument was always `true` in the final pile; removed.
- **F.** A keyed Rate's bisection uses the count's `+ 1e-9`, like the phase it inverts.

## Busters

| File | v17.57 | now |
|---|---|---|
| js/compositor.js | 221 | 222 |

v17.58 (shipping now) touches js/app.js, js/export-card.js and styles.css only — **re-check at landing** and re-bump if
compositor moved. No other js/css changed. No schema change: no effect parameter, default or `legacy` was added or
altered, nothing feeds `C.schemaFingerprint`; SCHEMA_REV untouched.

## Tests (43, all `{ item: '1068' }`, appended as one block before the final `})();`)

Run them all with `?only=1068%20B8` (replaces the land list's `?only=690%20Frame%20Stutter` / `?only=690%20Time%20Warp`;
`?only=1068%20B8%20Frame%20Stutter` and `?only=1068%20B8%20Time%20Warp` split them). No existing test was dropped,
retitled or edited (no DROPS TEST).

Expected failure on v17.57 (the sentence that throws first). Every jump test fails on v17.57 because a jump refilled the
hold / band from the frame at the playhead:

| Test (`1068 B8 …`) | Fails on v17.57 at |
|---|---|
| Frame Stutter holds the same source frame after a cold seek | 'Frame Stutter cold seek showed the current source at x=… instead of the held boundary source …' |
| Frame Stutter cold-seeks a moving shape with an upstream keyed grade | 'Frame Stutter cold seek used the current graded shape instead of its boundary plate' |
| Time Warp Scan cold seek reconstructs the scanned shape at its crossing frames | 'Freeze cold seek replaced historical shape pixels with the picture at the playhead; …' |
| temporal holds cold-seek a shape driven by a moving null parent | 'Frame Stutter cold seek held the parent at the playhead instead of the hold boundary' |
| Time Warp … keyed upstream Brightness / Contrast (fix 4) / Levels / Gamma / Saturation / Vibrance / Colour Balance / Exposure / Hue Shift — shape and still (17 tests) | 'Freeze keyed <X> … differs after a jump from playing up to it, width 120: …' |
| Time Warp Scan cold-seeks a moving still image at the scanned crossing times | 'Freeze a moving still image differs after a jump …' |
| Time Warp Scan cold-seeks an animated crop on a still image | 'Freeze an animated crop on a still differs after a jump …' |
| Time Warp … rotating and scaling null parent / decoded still beneath a rotating null parent | 'Freeze a shape beneath a rotating parent differs …' / 'Freeze a decoded still beneath a rotating parent differs …' |
| Time Warp … hard / feathered vector mask (shape), keyed pen mask, still through a vector mask, feather-masked still | 'Freeze a hard-masked shape differs …' (and the like) |
| Time Warp Scan holds keyed grades on a cropped still image | 'Freeze keyed grades on a cropped still differs …' |
| Frame Stutter holds a cropped still at the quantum boundary after a cold seek | 'Hold cropped still differs after cold seek at width=120' |
| Frame Stutter … rotating and scaling null parent / hard mask / feathered mask / keyed pen mask / keyed Levels / Gamma / Vibrance / Colour Balance | 'Frame Stutter held <what> as it is at the playhead, not at the 0.5 s boundary, after a jump at width 120: …' |
| Frame Stutter after a jump holds the first project frame at or after each hold boundary… (fix 1) | 'after a jump to frame 1 (Phase 0, shape, width 120) Frame Stutter does not show frame 0 …' — and on the pile's UNSNAPPED port, at frame 4 ('does not show frame 4, … began at 0.1250 s') |
| Time Warp Scan sees a jump of one whole short sweep… (fix 2) | 'a jump of one whole 0.3 s sweep was not seen as a jump …' — also on the pile's 0.34 s |
| Time Warp Scan after a jump past a sweep that ended between two frames… (port fix A) | 'after a jump to 1 s, the sweep that ended at 0.3 s differs from playing up to it …' — also on the pile's port |
| one shared list - … (fix 5) | 'there is no one shared list … (FM._c31PixelUpstream)' |

Controls are in every test (the source moves; the scan is not just the live picture; feathering changes the mask; the
snapped and unsnapped moments differ; the two sweeps froze different bands; Blur and Vignette are caught). Pixel
comparisons are byte-for-byte (both sides are the same renderer at the same times). The one tolerance, the shared-list
test's `TOL = 0`, is marked `TODO(measure after v17.58)`. No stubs. No test should need more than the default 45 s;
the slowest are the shared-list test (~700 small renders) and the fix-1 test (240).

## Byte-identical — what changes and what does not

- **Export of a saved project at the project's own fps:** unchanged by design. Frame Stutter's snapped hold is the frame
  v17.57's capture took; its trail is the hold the frame before showed; Time Warp's incremental strips still come from
  the live plate, and its rebuild at the first frame / a loop wrap draws one strip from `sampleAt(t)`, the same pixels
  as the live plate (integer-offset viewport). The six 482 2.4 goldens are the proof and are owed.
- **Changed on purpose:** the picture after a jump (preview seek/scrub; an export resumed mid-clip).
- **Changed, not intended — measure on the phone:**
  1. *Preview playback, Frame Stutter, off-grid boundaries.* Playback renders at clock time, between project frames. A
     render that lands after a hold boundary but before the next project frame samples at the playhead (the formula's
     `min(t, …)`), and the next frame samples the snapped frame: a one-frame nudge of at most a frame's motion at some
     hold starts (rate 8 at 30 fps: the boundary 1/4 of the way into a frame, about half the time). v17.57 had none (and
     no right answer after a jump). Possible follow-up: quantise the stateless path's hold choice to the project frame
     being shown.
  2. *Export at a custom fps (queue 141) that is not the project's:* the snap is on the PROJECT grid, so a 60 fps export
     of a 30 fps project can nudge at boundaries between project frames. Follow-up if wanted: the exporter publishes its
     fps (`FM._renderFps`) and the snap uses it.
  3. *Keyframed Mode / Direction / Repeat on a Time Warp shape or still* now rebuild the band when they change (d4ef276e).
  4. *Keyframed Phase or Irregular holds:* v17.57's holds depended on the path played; the stateless path uses the values
     at the playhead.
  5. *Float edges:* a keyed-Rate boundary landing exactly on a frame can snap one frame late (28-step bisection); the
     formula's `1e-9` is in frames.
- **Cost:** Frame Stutter on these layers draws the layer once more per frame (twice with Trail). A Time Warp jump draws
  up to `sweep × fps` strips (Sweep 20 s at 30 fps: 600). A PIXEL kernel above it (Levels, Gamma, Vibrance, Colour
  Balance, Exposure, Temperature, Tint) draws a FULL-comp plate per strip (nestedPlate's "slice" rule), so that combination
  is the worst case — measure it on the phone first.

## Checks owed (nothing here was run)

1. `?only=1068%20B8` at 900 and `--width 380`; `?only=482%202.4` (the six Frame Stutter goldens) at 900 and 380 — must be
   byte-identical to v17.57; `?only=Time%20Warp` (resize hole), `?only=794` (ghost-gated probe), `?only=839` (resume
   pre-roll) and `?only=690%20Frame%20Stutter` (the existing land-b3 F1 tests, which call the kernel without `expand` and
   so must be untouched by this).
2. prove.sh: every test above red on HEAD's source, green here.
3. Measure the shared-list test's `TOL` (expect 0) and replace the TODO with the measurement.
4. His phone: scrub BACKWARDS over a Time Warp Scan at Sweep 20 s on a shape (and once with Levels above it); play a
   Frame Stutter shape at the default 8 and watch hold starts for the nudge in (1) above.
5. #545 picture: a before/after strip — v17.57 vs this, a moving shape with Frame Stutter (rate 4) and one with Time Warp
   Scan, each "played to 0.8 s" vs "jumped to 0.8 s"; before shows the jump's wrong frame / band, after shows them equal.
   Rendered through the app at 380 and 1280 — not made here (no browser).

## Unsure

- Whether the preview nudge (1) is visible enough to hold the release for the frame-quantised follow-up.
- The strip viewport's byte equality with the live plate rests on integer-offset rasterisation (the pile's tests claimed
  it at 120 and 60 px); a phone GPU canvas is the place it would show.
