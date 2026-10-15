# #966 backlog §B51 — Auto Grade on `hunt/pile-autograde` (15 Oct), ported from the ChatGPT pile

Ported BY HAND from ChatGPT's pile commit **`5a5c0391`** ("Add temporally smoothed Auto Grade effect", T02 — the colour-grading pack;
LAND-LIST §3 Q5 recommends "yes to … Auto Grade"). Built on `85b71929` (the §B chain tip, hunt/fxnew-drums). Spec: backlog §B51
"Auto Levels / Contrast / Colour with temporal smoothing" — the same thing (the pile's own report names B51).
**When this lands, the pile commit `5a5c0391` is to be DROPPED whole** — this branch replaces it; landing it as well would register
the effect twice. Its one dispatcher line (`, fx` in drawPixelEffect) is ALSO in hunt/pile-deflicker, byte for byte (see merge notes);
its `outside/chatgpt/fixes/690-auto-grade.md` report is not carried (the land list's rule).
**Nothing was run** — no node, no browser, not even `node --check` — because a release ship was live in /home/ezra/FreeMotion. The proof
is written and waiting: `prove.sh` in the helper's scratchpad (`agents/pile-autograde/`, below). His rule (#545) is that he sees the look
before anything ships: **no sheet was drawn here** (it is owed — question 6).

## Why this and not a duplicate (checked first)
`ssh/main` REQUESTS.md: "autograde" finds only the land-list relay ("T02's autograde" still pile-only); "auto level" finds only Distortion's
*auto level* (an audio control). POLISH-LOG.md: nothing. The registry on 85b71929 AND on ssh/hunt/stack50 has no auto-levels / auto-colour /
white-balance effect that measures the frame: Levels is manual, Colour Temperature's "White balance" is a manual Method, Match Grade matches
ANOTHER layer, Exposure is manual. So B51 was ported.

## What was taken from the pile, and what changed

| | The pile (5a5c0391) | Here |
|---|---|---|
| Controls | Correct (Levels / Contrast / Colour), Clip ends 0–10 % (1), Temporal smoothing 0–2 s (0.25), Strength 0–100 % (100) | **the same** keys and ranges; Smoothing renamed (Deflicker's word) and its default **0.5 s** (question 2) |
| The three modes | Levels: R, G, B percentiles each; Contrast: luma percentiles; Colour: luma + grey-world gains (0.5–2) | **the same three**, Colour's balance rebuilt (below) |
| **Measurement** | every n-th pixel (n from the plate's size), percentiles of single pixels in a 256-bin histogram | a **48 x 48 grid laid on the frame**, each cell the alpha-weighted mean of every pixel in it (a straddling pixel split by area), **weighted percentiles over the cells, interpolated** — the same on every plate |
| **The stretch** | skipped any range under 16 levels; at 16 jumped to 4x | slope min(4, 255 ÷ range); under the cap it is **4x about the point where the full stretch would cross the picture** — continuous, a flat colour is its own fixed point |
| **Colour balance** | grey-world over every pixel | each cell weighted by (1 − saturation ÷ 0.5)² (none at 50 % or more), gains make the near-greys' mean a grey of its own brightness, faded out under 5 % of the picture's worth of grey |
| History key | the effect object (a WeakMap), reset on a size change | effect → **layer id AND plate size** (up to 6 records, newest kept) — Temporal Denoise's / Deflicker's rule |
| **A cut** | not detected: a new shot was graded with the old one's levels for ~Smoothing (the pump) | **starts again**: an 8 x 8 block pattern (colour ÷ frame brightness) compared with the last frame's, mean change ≥ 0.45 (Deflicker's rule, with colour) |
| Jumps | dt ≤ 0.35 s smoothed; else raw | **the same**; a jump back or > 0.35 s forward starts again |
| **The same instant again** | the same raw: kept; a different picture: started again | the same measurement: the same bytes; **a different picture steps from the record before this instant** (a paused edit, and the TWO renders a part-strength filter makes each frame — the pile's rule threw the history away every frame there) |
| Ghost renders | advanced the history (onion skin at ±0.2 s reset it every paint) | **graded from their own frame, history untouched** (onion skin, the "changes nothing" probe, the browser's live tiles) |
| Strength 0 | returned before recording history | the picture byte for byte, **history kept building** (a keyframed Strength reveals a grade that has been tracking) |
| Export | a fresh history when `FM._exporting` flips | **the same**, and `FM.resetMotionFlowCache()` clears it too |
| Resumed export | not handled | **TEMPORAL_FX**, pre-roll **5 x Smoothing** (75 frames at the default and 30 fps, 300 at 2 s; the slowest if keyed; ≥ 25; none at Smoothing 0) |
| **Adjustment layers** | not offered | **offered** (PIXEL_ADJ / ADJ_OK): `applyPixelFx` now hands kernels their effect too (one line); `FM.adjNeedsFrame` keeps a zoomed preview whole while one is shown |
| Crop readback | — | **not in CROP_FX** (a crop would lay the grid on the crop) |
| Tile | the stock photo (already well exposed — a picture of nothing) | fx-thumbs OVERRIDES: a Levels (output 50–185) and a Colour Temperature (+60) under it — flat and orange without it, restored with it |
| Inspector | — | NOOP_WHY: one flat colour has no range to stretch |
| Registration | spliced into the main table after Channel Mixer (not in this tree) | **batch 48** at the end (`AG_ROWS`, just before `FM._FX_TABLES`, after Clarity), so it leads the NEW row; desc on the row; search words |
| Its test | one (`{ item: 'TBD' }`), the kernel by hand on a 16 x 16 two-tone frame with a made-up `{}` effect | **13** `966 B51 …` tests (below) — its three claims are all in them |

### The look and the two scrub rules (in the description: "play from a little before to see what exports")
- In order (export, playback): frame by frame, the same frames in give the same bytes out; each export starts fresh.
- The first frame, a jump back, > 0.35 s forward, a new plate size, a new Correct, or a cut: graded from that frame alone, then smoothed on.
- Up to 0.35 s forward: smoothing goes on (the phone dropping frames still smooths).

## The tests (each fails on 85b71929 on its first line, `_b51Need()`: "Auto Grade is missing from this build: no registry entry for autograde")
Single-frame and history tests run the kernel through **`FM._applyPixelFx`** (the adjustment path, which now hands the effect in) on
pictures built as bytes (`_b51Pic`: a dark half and a bright half, each a soft ramp, so the darkest and brightest are known) — the same
bytes on every OS; the clip-path tests go through **`FM.renderScene`** (`_986shot`) on a rect carrying a Gradient Overlay ramp 80–168.
1. **catalogue** — Colouring, label, desc (frame by frame / cut / jump), aliases (not bare 'auto', not 'white balance'), the four rows, no px
   keys, POSTFX, PIXEL_ADJ, ADJ_OK (CONTROL: shape), not BOUNDED / CROP_FX, FM.adjNeedsFrame (CONTROL: Levels alone asks nothing), sanitiser,
   leads the NEW row, TEMPORAL_FX and its pre-roll (75 / 300 / 25 / 225 keyed / 150 at 60 fps / 75 without fps / 0 at Smoothing 0; CONTROL).
2. **the stretch** — 80..170 to ≤ 6 / ≥ 249 (1st / 99th luma percentiles) in all three modes, the middle in proportion (~76); a 2..253 frame
   moves ≤ 1.5 mean / 4 max (control); 15.9- and 16.1-level ranges within 2 levels (the pile's jump; CONTROL: 16 is stretched ≥ 8).
3. **colour** — a +15 % / −15 % cast to within 3 levels (CONTROL: Contrast keeps it); a green lawn stays green (fixture control: the pile's
   gains on it are 30 %+ off 1).
4. **Strength 0 and never inverting** — byte for byte on single frames and through a 10-frame run (CONTROL: 100 % grades it); a grey ramp
   row read across 60 settings (5 pictures x 3 modes x clip 0/10 x strength 35/100): no channel falls; alpha kept; alpha-0 never written.
5. **the measurement on every plate** — `FM._autoGradeStats` (a suite seam) on a grainy tinted 384 x 216 and its exact 2x / 4x area shrinks,
   all nine numbers within **`B51_STAT_TOL` = 1, a guess (TODO(first run))**; CONTROL: single-pixel 1st percentiles move ≥ 8 levels.
6. **a cut** — frames from the cut = a fresh Auto Grade on them, byte for byte; CONTROL: the same new range with the layout kept is eased in
   (frame 10 ≥ 3 levels from fresh) and settles (≤ 1.5 by 2.3 s).
7. **a steady shot** — the dark half steps 12 levels every frame; the steady half moves ≤ 1 level a frame (and < a sixth of Smoothing 0's);
   CONTROL: Smoothing 0 moves it ≥ 4.
8. **history and scrub** — replay / reset / copy = same bytes; export never inherits; two plates interleaved = each alone; jump back, +0.4 s =
   fresh; +0.3 s smooths; repaint = same bytes; Strength 0 / 100 while paused; ghost = fresh and untouched; an edit while paused steps from
   the frame before (CONTROL: not a fresh grade).
9. **THE DISPATCHERS** — a spy: the 10th argument is the effect itself on a clip (drawPixelEffect) AND on an adjustment layer (applyPixelFx);
   frame 1 after frame 0 through the real compositor is smoothed, not fresh; CONTROL: nine arguments = graded on its own, no throw.
   **prove.sh 3c removes both `, fx` in a copy: this test must fail naming the 10th argument, and the history tests with it.**
10. **adjustment layer = on the clip** (and inside a filter on the adjustment layer), 6 frames in order, at 1 and 0.5, within 1 level
    (CONTROL: it grades ≥ 30 somewhere).
11. **plates through the compositor** — 0.5 and 0.28 of a 480 x 270 project, eight bands within **`B51_PLATE_TOL` = 3, a guess
    (TODO(first run))** of the export at frames 1, 9, 19; CONTROL: ungraded is > 1.5 x the bound away.
12. **every control moves the picture in order** — Smoothing 0/2, Clip 0/10, Strength 0/100, the three Corrects pairwise (on blue-lifted
    blacks, where Levels and Colour differ), frame 12 by ≥ 3 levels (the inert sweep's twin for Smoothing).
13. **the tile** — previewScene carries levels, temperature, autograde; with vs without ≥ 8 mean and ≥ 36 max (the fx-thumb floors). If
    `FM.fxThumbs` is not loaded (node) it says "this cannot be observed … run it in Chrome".

## Shared tests touched (the merge notes)
- **E1's `LATER`**: `'autograde'` appended. **745's `NEWEST_FIRST`** and **913.8's `NEWER`**: `'autograde'` at the FRONT (913.8: seventeen
  newer than Snow & Rain). Exactly as Clarity / Deflicker / B&W Mixer did.
- **'no Colouring effect is a silent no-op'**: `'autograde'` added to `KNOWN_NOOP` with the why — its fixture is ONE flat #8fd4ff rectangle,
  a range of nought per channel, and a flat colour is the stretch's fixed point. Not added to 529's app list (it grades any picture).
- **the inert sweep**: skips `autograde`'s **Smoothing only** (single frames, no effect handed in: Smoothing rightly does nothing); Clip ends
  and Strength stay swept. Its in-order twin is test 12. (Deflicker skips its whole effect with an `ACROSS_FRAMES` const two lines above —
  a different line, so the two merge.)
- **482 visible: NOT touched.** Without its effect the kernel grades the frame on its own (its "first frame"), and on that fixture (r 42–253,
  g 1–245) Levels stretches by 1.2x — visible (arithmetic, not run; stage 4 shows it).
- **queue 264 `ALLOWED`: nothing added** — the orange rect is flat (identity in Levels / Contrast) and 74 % saturated (no balance in Colour);
  it never erases at any extreme.
- **Read, not run** — 784 (bare = defaults: the kernel's fparam fallbacks are the registry defaults), zero-means-zero (strength 0 is the
  picture; clip and smooth do not change the star), 793, the sanitiser sweep, 913.5 (a zoomed per-layer plate is the comp: the same grid;
  each render there is a fresh JSON copy, so a fresh first frame), 794 (not ghost-gated: it grades on ghosts), #484 (aliases reach tags).
- **921 S1 the schema fingerprint** will be red on this branch (a new effect moves it), as on every §B branch: **C.SCHEMA_FP / SCHEMA_REV
  left alone** — LAND-LIST's "the schema bump" is the release's, in the gap; prove.sh stage 6 prints the number to pin.
- **Busters**: compositor 224 → **225**, fx-registry 28.36 → **28.37**, fx-thumbs 59 → **60**, inspector 422 → **423**, export-resume
  7 → **8** — the §B siblings bump the same from the same numbers, so the merge takes one number above all of them.

### ⚠️ MERGE POINTS (with hunt/pile-deflicker, hunt/fxnew-bwmix and the rest of stack50)
- **drawPixelEffect's `, fx` line**: written **byte-identical** to hunt/pile-deflicker's hunk (comment and all — both are ports of 5a5c0391's
  one line), so the two merge with no conflict. Its comment names Deflicker; if Auto Grade lands WITHOUT Deflicker, add "and Auto Grade".
- **`FM.resetMotionFlowCache`**: Deflicker appends `dfReset();`, this appends `agReset();` to the same line — keep both calls.
- **export-resume `TEMPORAL_FX`**: both append to the same line — keep both ids; both pre-roll branches go after Time Warp Scan's (keep both).
- **CATEGORY_OF "batch 48"**: every §B / pile branch wrote batch 48 from the same base. Renumber in merge order; only the line written last
  says "The newest", and the compositor block pushed LAST must be that one (913.8 wants the last pushed to lead).
- **Insertion points**: compositor — the block after Clarity's kernel, before `FM._FX_TABLES` (Deflicker and B&W Mixer insert there too:
  keep every block); `applyPixelFx`'s PIXEL_FX line (only this branch); `FM.adjNeedsFrame` after Clarity's branch. fx-registry — CATEGORY_OF,
  ADJ_OK (B&W Mixer adds `bwmixer: 1` there too), SEARCH_ALIASES, all after clarity. inspector NOOP_WHY after clarity (B&W Mixer too).
  fx-thumbs OVERRIDES at its END (after radialshadow). tests after "end 966 B22" (keep every block).
- **stack50 rewrote the NEW-row tests** ("NEW-row membership tests allow older effects to roll off"): on the stack, put `'autograde'` into
  ITS versions of LATER / NEWEST_FIRST / NEWER, not these lines.
- `applyPixelFx` now passes `(…, t, S, undefined, undefined, undefined, fx)`: Deflicker's question 3 ("deflicker on an adjustment layer?")
  then needs only its ADJ_OK / PIXEL_ADJ entries and a history key — this line is already there.

## Questions for Ezra (each with a recommendation)
1. **Default Correct.** The pile starts on **Levels** (each colour stretched on its own — fixes a cast in the blacks and whites, but on a
   sunset it stretches the weak blue too and cools it). **Colour** fixes casts more gently (on the near-greys only) and keeps a sunset warm.
   Kept the pile's Levels; **recommended: Colour** once he has seen the three side by side.
2. **Smoothing default**: 0.5 s here (steadier; the cut rule removes the main cost of a slower setting), the pile had 0.25 s. **Recommended:
   0.5 s.**
3. **Fades in the footage.** Like every auto-levels, a fade to black BAKED INTO a clip is lifted (up to 4x) until the picture is nearly black —
   a fade made with FreeMotion's own opacity or transitions is NOT (the effect measures the clip before its opacity). On an adjustment layer
   over an edit, a fade of the layers below IS lifted. Accept (recommended for now), or add a "keep fades" choice later?
4. **Names**: "Auto Grade", with Correct = Levels / Contrast / Colour (the pile's; "Levels" is also the manual Levels effect's name). Keep?
5. **The 4x cap** is fixed (the pile's). A "Most boost" slider is possible — **recommended: not until he asks.**
6. **He has not seen it** (#545). A sheet is owed: the same dull / tinted / sunset / grainy clips through Levels, Contrast and Colour, and a
   cut with and without the rule — through FM.renderScene in a tests/ probe, at the next browser slot. Nothing ships before that.

## What prove.sh checks (`…/scratchpad/agents/pile-autograde/prove.sh` → `prove-result.txt`)
1. It will not start (and stops between stages) inside a ship, a lock run or a live API builder without a helper slot (gapcheck.sh).
2. `node --check` on the five changed js, tests.js parses; no CRLF, `git diff --check`, no mode change, every buster raised, no \u escapes.
3. The 13 new tests through the datamosh branch's `rund.js`: each FAILS on 85b71929's js naming the missing effect (not a TypeError); on
   this branch all PASS (the tile test may fail in node only with "cannot be observed"). **3b**: the measurement and plate tests with their
   bounds forced to −1, for the numbers. **3c**: both dispatchers' `, fx` removed in a COPY — THE DISPATCHERS and the four history tests
   FAIL, the five single-frame tests still PASS.
4. The sweeps, the export-resume pre-roll, 794, #484, the NEW-row tests, the tile floors and the adjustment-path tests (B18–B20, B26,
   986 C1, fx-c's Pixelate) on both trees with this tests.js — the same verdicts (`ZOOM=1` adds 913.5); then the ORIGINAL E1, 745,
   Colouring no-op and inert sweep on this js — they fail (why edited).
5. The schema fingerprint of both trees; `treecheck.py 85b71929 HEAD` and `drops.py 85b71929 HEAD`.

## Not done here, and what I am unsure of
- **Never run, never seen.** Every number above is arithmetic. If a test's own CONTROL fails, suspect the fixture first (the Gradient
  Overlay ramp drawn at plate pixel corners, Exposure's arithmetic, the box shrink).
- `B51_STAT_TOL` and `B51_PLATE_TOL` have to be set from the first run (prove.sh 3b prints them). Chrome at 900 and 380 is owed:
  `?only=966%20B51` (the tile test there), and 913.8 / 745 / 913.5 / 794.
- **The grid is 48 x 48 only on a plate at least 48 px each way**; a smaller plate (a tiny project's 0.28 preview) uses one cell per pixel
  and measures slightly differently. Real plates (1080 x 1920 at 0.28 = 302 x 538) and the 96-px tiles are above it.
- **Renders at other times of the SAME layer in one frame** (Time Echo's echoes of a layer carrying Auto Grade) move backwards, which starts
  the history again each frame: per-frame grading there, no smoothing (no flicker beyond the picture's own). Deflicker has the same edge.
- A part-strength filter on an adjustment layer that ALSO carries a top-level Auto Grade renders it twice a frame on two pictures; that is
  stepped, not restarted — unless the filter changes the picture's LAYOUT enough to read as a cut, which would restart it every frame.
- Colour weights skin (20–40 % saturation) as near-grey: a close-up face with nothing grey in the shot is pulled toward grey by up to the
  0.5–2 gains. Strength and Levels / Contrast are the way out; a skin guard is possible if he sees it.
- Cost on his phone: two passes over the plate per frame (measure, then the curves) plus one sort of ≤ 2,304 cells per channel — cheap at
  the 0.28 plate; an export at 1080 x 1920 walks 2M pixels twice a frame (unmeasured).
- The cut rule is Deflicker's heuristic: a new shot with nearly the same layout of light and colour is smoothed for a moment, and big motion
  inside one shot can start it again (then that frame is graded on its own — no worse than the pile's per-frame grade).
