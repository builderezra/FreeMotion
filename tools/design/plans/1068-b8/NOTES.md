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
| js/compositor.js | 221 | 222 (223 after the strip-only grade, 17 Oct) |

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

## Strip-only grade (17 Oct)

**Nothing was run except `node --check`** (a release ship was running on the laptop). Every number below is expected,
not measured; the measurements are owed.

**The problem (measured by the builder, 17 Oct, 4× throttle, 380×676, probe `b8perf.js`).** A cold jump into a Sweep 20 s
Time Warp Scan on a moving shape with keyed Levels above it: **1854 / 1022 / 2043 ms** at 15 / 10 / 19.5 s on bdb4360b,
against 65 / 105 / 21 on v17.57, and 51 / 35 on bdb4360b with no Levels. Risk 4 above, confirmed: every strip of the rebuild
(450 at 15 s) drew and graded a WHOLE frame, because the strip's viewport does not cover the frame and nestedPlate answers
such a target with a comp-sized plate.

**What changed (js/compositor.js, buster 222 → 223).**
1. `c31BandPlate(ctx, type)` (beside `C31_PIXEL_UPSTREAM`). When the TARGET is a band canvas (`__fmC31Band`) and the effect is
   on the shared list, the plate is the target's own extent, origin and scale — nestedPlate's own answer for a target that
   covers what it draws — instead of a whole frame. `drawPixelEffect` (Levels, Gamma, Temperature, Vibrance, Exposure, Colour
   Balance) and `drawTint` (Tint) take it, each on band canvases of its own (`_pfPool[d].SA/SB`, `_tiSA/_tiSB`, made by
   `c31Canvas()`, marked, `willReadFrequently`), so the pool's own full-frame plates are never resized by a jump and the
   steady path never meets the mark. A band plate made by one list effect is itself marked, so a list effect inside another
   (Levels inside Tint) is banded too.
2. On a band, `drawPixelEffect` reads the band back whole instead of taking the #692 crop path (three halvings + a copy cost
   more than they save on 8 rows). Every list kernel is in `CROP_FX`, i.e. admitted because cropped and whole give the same
   picture (test 692 re-proves each), so this changes no pixel. `FM._cropStats` is not counted for bands.
3. `sampleAt`: a strip has its own canvas, `'strip'`, sized EXACTLY to the viewport rounded up to whole 8 px (a Sweep 20 s
   strip is 6–7 rows + margin → 8; no realloc per strip). It used to share `'held'` with whole-plate samples, and `'held'` only
   grew — so after one whole-plate sample at that pool depth (Frame Stutter, Reveal, a masked layer) every strip cleared a
   whole plate and drew the layer across all of it: the second full-frame cost on the jump path, now gone.
4. Seams: `FM._c31FullPlate` (default false) puts the whole-frame strips back exactly as bdb4360b drew them (`'held'`, grow-only
   sizing, no band); `FM._c31Stats.bands` counts band plates made.

**Why it is exact.** Every entry on the list is pixel-by-pixel (the shared-list test). The band plate is drawn with the very
transform the strip viewport is drawn with — the same transform the no-Levels strips already use — and is a sub-rectangle of
the plate the whole-frame path drew, at an integer offset; the kernel sees the same input pixels and writes the same output
pixels; the band is laid back at offset exactly 0 (the whole-frame path laid its plate back at ≈ −cy). Untouched: anything
else drawn inside a strip (3D tilt, fog, outline, legacy motion blur, the GPU colour pass where ctx.filter does not run)
still gets nestedPlate's whole frame, because it may read where in the frame it is; masked / pen-masked / parented layers
still take whole-plate samples; Frame Stutter, Reveal, steady playback and export from frame 0 never draw a strip. No cap and
no cache — none was needed.

**Expected numbers (estimated from per-strip canvas calls, NOT measured).** The plain strip costs ~0.11 ms at 4× (51 ms / 450);
the band grade adds about as many calls again on an 8-row canvas. Levels jump ≈ 2–2.5× the plain jump: roughly **100–220 ms**
at 15 / 10 / 19.5 s (against 1854 / 1022 / 2043), plain unchanged (51 / 35). Steady playback, Frame Stutter (with Blur or
Vignette above) and the plain jump: unchanged from bdb4360b.

**Tests (tests/tests.js, end of the B8 block, `{ item: '1068' }`).**
- `1068 B8 Time Warp Scan grades each rebuilt strip on its own rows - a jump under keyed Levels, Tint or both is byte for
  byte the picture the whole-frame strips drew` — cold jumps at 0.4 / 1.25 (between frames) / 1.9 s (after the 1.5 s sweep
  reached the bottom), widths 120 / 60 / 100 (100 = a non-power-of-two plate scale like the phone's 380/1080), under keyed
  Levels, keyed Tint, and Levels inside Tint; strip-only vs `FM._c31FullPlate`, byte for byte. Fixture: a 40×100 still taller
  than the frame, every row its own colour. Controls: no two neighbouring rows of the scan are equal; the scan is not the
  live picture; each of the three grades changes the rebuilt strips; the seam made no band; the strip-only side made bands
  (`FM._c31Stats`, read only where it exists). **On bdb4360b it PASSES** (a guard: no seam there, both sides are the old
  path) — prove.sh will call it DEAD; that is expected. **Its catch, by mutation (OWED)** — with T = the full title above:
  - `tools/mutate.sh --only "$T" js/compositor.js "plateScale(ctx), W = cv.width, H = cv.height;" "plateScale(ctx), W = cv.width, H = cv.height - 1;" "$T"`
    (the band one row short) → expect CAUGHT at 1.9 s, width 120: at the frame's bottom edge the strip viewport has no
    margin (sampleAt clips it: `ch = H − cy`), so the band's last row IS frame row 79.
  - `tools/mutate.sh --only "$T" js/compositor.js "OY: cv.__fmOY || 0, W: W" "OY: (cv.__fmOY || 0) + 1 / ps, W: W" "$T"`
    (the band one row low) → expect CAUGHT at 0.4 s: the top strip's viewport starts at frame row 0 (`cy = 0`), so a band one
    row low leaves row 0 ungraded (transparent).
  Both old strings are unique in js/compositor.js (grep-checked). Known only by reading the code: neither could be run.
- `1068 B8 Time Warp Scan under keyed Levels - a cold jump into a 20 s sweep costs a small multiple of the same jump with
  nothing above the scan, under a 4× CPU throttle` — the probe's own case (1080×1920, shape 300×600 moving, keyed Levels,
  Sweep 20 s, drawn at 380×676), cold jumps at 15 / 10 / 19.5 s with Levels and without, the cheaper of two each, after a
  real GC. Must hold `levels ≤ B8JUMP_FACTOR × plain + B8JUMP_SLACK` at every time. Prints `[1068 B8 cost] …` with every
  number, pass or fail. NOT RUN HERE without tests/_cdp.py (the throttle). Controls: the jump is not the live picture; Levels
  changes the rebuilt scan. **On bdb4360b it FAILS at:** *'a cold jump into a Sweep 20 s Time Warp Scan under keyed Levels
  costs more than 4 × the same jump with no Levels + 60 ms at 15 s, 10 s, 19.5 s - the strip-by-strip rebuild is grading far
  more than its strips: 15 s: ~1854 ms with Levels, ~51 ms without (budget ~264); …'* — the catching test for prove.sh.

**Placeholders to measure — `TODO(measure after v17.59)`:** `B8JUMP_FACTOR = 4`, `B8JUMP_SLACK = 60` (ms). Reasoning: the
expected ratio is 2–2.5×, so 4 leaves room for that estimate being wrong by half; 60 ms covers the one WHOLE-frame Levels a
jump still draws for the live picture beside the scan (v17.57's whole cold jump with Levels was 65 ms against 8 without).
Measure: run the test 3× at 900 and 380 (`?only=1068%20B8%20Time%20Warp%20Scan%20under%20keyed%20Levels`), read the
`[1068 B8 cost]` lines, then set FACTOR to the worst measured ratio × 1.5 (not below 2) and SLACK to 60 unless a plain jump
under 20 ms makes the ratio noisy. Also re-run `b8perf.js`: expect `twJumpLevels` in the low hundreds, everything else as on
bdb4360b.

**Checks owed.** `?only=1068%20B8` at 900 and 380 (all 45, the existing jump-vs-play tests included — they are the proof the
band also matches PLAYBACK); `?only=692` (crop admission, which the band's whole read-back leans on); prove.sh; the two
mutations above; the probe. His phone: scrub backwards over a Sweep 20 s Time Warp with Levels above it — it should no
longer stall.

**Risks.**
- GPU vs CPU raster. The band canvases are CPU (`willReadFrequently`); the playback path's Levels plate (`_pfPool[d].A`,
  default context) is GPU-backed until Chrome demotes a canvas that is read back every frame. While it is GPU-backed, an
  antialiased edge could land one level apart between a jump and playback. The old strips shared that canvas with playback,
  so they could not differ this way. The suite's Chrome is CPU at these sizes; the phone check is the real test.
- The GPU colour pass (Brightness … Invert on a device where ctx.filter does not run) is NOT banded: its 1:1 LINEAR texture
  blit at a different texture size is not exact by construction, and it cannot be tested here. On such a device those seven
  above a Time Warp still cost a whole frame per strip. Follow-up only if his phone is such a device (queue 645 says it was;
  Safari 18+ runs ctx.filter).
- Inside a plate that reaches past the frame (a padded Squish / group plate), the old strips cut the graded layer at the
  frame edge while playback did not; the band follows the viewport, i.e. playback. Different from bdb4360b there, on purpose,
  not tested.
- Masked, pen-masked and parented layers still draw a whole plate per strip (B8's own rule for antialiasing); with Levels
  above, those are still slow on a long sweep. Not changed.
