# #966 backlog §B53 — Deflicker on `hunt/pile-deflicker` (15 Oct), ported from the ChatGPT pile

Ported BY HAND from ChatGPT's pile commit **`0cdc6732`** ("Add temporal exposure deflicker effect", pinned at
`refs/pile/codex-690-reviewed`), with the fix LAND-LIST.md's batch B6 prescribes for it — *"port only `5a5c0391`'s dispatcher line that
passes `fx`; without it Deflicker is a silent no-op. Add it to the 482 sweep's `KNOWN_THIN`. Drive the test through `FM.renderScene`."*
Built on `85b71929` (the §B chain tip, hunt/fxnew-drums). Spec: backlog §B53 (Blur / temporal — evens out frame-to-frame brightness flicker).
**When this lands, the pile commit `0cdc6732` AND `5a5c0391`'s dispatcher line are to be DROPPED** — this branch replaces both; landing
the pile's as well would register the effect twice (and `5a5c0391` itself is Auto Grade, a separate item: only its one line came here).
**Nothing was run** — no node, no browser, not even `node --check` — because the API builder was live. The proof is written and waiting:
`prove.sh` in the helper's scratchpad (below). His rule (#545) is that he sees the look before anything ships; the sheet is ready for the
next browser slot, and every row on it is an option of the effect as built, so his pick sets defaults — no rebuild.

## Why this and not a duplicate (checked first)
`ssh/main` REQUESTS.md / POLISH-LOG.md: "deflicker" finds nothing; "flicker" finds only the Flicker / Flash (darken) / Breathe effects (which
MAKE flicker), the home-card film grain, and UI flicker bugs. The registry on 85b71929 has no deflicker or temporal brightness effect:
Temporal Denoise averages grain away where nothing moves; it does not touch brightness from frame to frame. So B53 was ported.

## What was taken from the pile, and what changed

| | The pile (0cdc6732, + 5a5c0391's line) | Here |
|---|---|---|
| Controls | Smoothing 0.1–2 s (0.5), Strength 0–100 % (100), Maximum correction 0.25–2 stops (1) | **the same** keys, ranges, steps and defaults; Maximum correction's unit is `' EV'` (Exposure's own; the pile wrote `'stops'` with no space) |
| Measure | mean luma of up to ~4,096 opaque pixels (alpha ≥ 32), and an 8 × 8 pattern of cell ÷ mean | **the same** |
| Cut rule | pattern change ≥ 0.45 (or < 8 cells to compare) restarts the history | **the same** |
| Seek rule | same instant: keep (if the mean is within 0.5); 0 < dt ≤ 0.35 s: smooth; else restart | **the same**, plus a **ghost render** (`FM._mfGhost`) passes through and leaves the history alone (Temporal Denoise's rule) |
| **The smoother** | ONE exponential average toward the mean | **Brown's double exponential smoothing** (two averages in a row, level = 2·S1 − S2) — see "the fix to the look" below |
| History key | the effect object only (a WeakMap), reset when W × H changes | effect object → **layer id AND plate size** (one record each, up to 6 per effect, newest kept): the phone's preview plate and a full-size render never share or thrash one (Temporal Denoise's rule) |
| Export | a fresh history when `FM._exporting` flips | **the same**, and `FM.resetMotionFlowCache()` (the exporter calls it before every export) now clears it too |
| Strength 0 | returned BEFORE recording history | history is recorded at any Strength (Strength only mixes what is shown), so a keyframed Strength reveals a correction that has been tracking all along — Datamosh Bloom's rule |
| The dispatcher | `5a5c0391` added `, fx` to BOTH the crop-readback call and the full-plate call | **only the full-plate call** (`drawPixelEffect`, the line Deflicker actually goes through: it is not in CROP_FX). The crop-readback call is left as it is — the land list says one line, and Deflicker never takes that path |
| Registration | spliced into the main table after Auto Grade (not in this tree), POSTFX by hand, `deflicker: 'blur'` | **batch 48** at the end (`DF_ROWS`, just before `FM._FX_TABLES`, after Clarity), so it leads the NEW row; desc on the row only; search words added |
| Resumed export | not handled (a resume would start the correction cold mid-file) | **TEMPORAL_FX** in js/export-resume.js, pre-roll **6 × Smoothing** (90 frames at the default and 30 fps, 360 at 2 s; the slowest if keyframed; never under 25) |
| Effects browser | nothing | **a still photo, shape or text with nothing on it** is badged "Nothing on this layer changes brightness from frame to frame, so there is no flicker to even out" (short label "nothing flickers here"); **GHOST_GATED** in fx-thumbs so the "changes nothing" probe never calls it dead on a video |
| Tile | none | `fx-thumbs` OVERRIDES: an Exposure under it stepping 0 / −0.7 stops on every tile frame, Smoothing 1 s — without it the tile pulses, with it it holds steadier |
| Adjustment layers | not offered (ADJ_OK) | **the same, and now for a stated reason**: the adjustment path (`applyPixelFx`) calls kernels without their effect, so there it would do nothing (question 3) |
| Its test | one, `{ item: 'TBD' }`, calling the kernel by hand with a made-up `{}` effect | ten `966 B53 …` tests through `FM.renderScene`, in order (below) — its four claims are all in them |
| `outside/chatgpt/fixes/690-deflicker.md` | its report | not carried (the land list's rule) |

### The fix to the look — why the smoother changed (the brief: "a real slow brightness ramp is kept, not flattened")
The pile's single exponential average runs behind any steady change by Smoothing × its rate. On a fade-in of 60 levels a second at the
default 0.5 s that is about **26 levels too dark at the fade's end**, and the picture then keeps brightening for a second after the fade
stopped — a real fade is flattened and smeared. Two averages in a row (Brown's double exponential smoothing) follow a steady ramp with **no
lag at all**; only its bends show, at most about rate × Smoothing ÷ e (**about 11 levels** on that fade, at the bend where it starts, and
the same overshoot at the end), gone within about three Smoothings. The cost: it passes about 7 % of a flicker that alternates every frame
(at 30 fps and 0.5 s) where the single average passed about 3 %. Both are far under the 25 % the test allows. Same controls, same
defaults; a one-function change back if he prefers the pile's (question 2). All of these numbers are from the arithmetic, not a run.

### Scrub vs export (labelled in the description: "It works frame by frame, so play from a little before to see what exports; after a jump it settles again over about the Smoothing time")
- **Export / in-order playback**: built frame by frame; the same frames in give the same bytes out; each export starts fresh.
- **The first frame it sees, a jump back, a jump forward of more than 0.35 s, a new plate size, or a cut** draws the picture as it is,
  and the correction starts again from that frame's brightness — so after a jump onto a dark flicker frame the next frames are held near
  THAT brightness and drift to the average over about Smoothing. A scrub's picture is therefore not the export's.
- **A forward step of up to 0.35 s** keeps correcting (the phone dropping frames during playback still corrects).
- **The same instant drawn again** (a paused repaint, a Luma Matte's second render of its source) reuses the stored level; a Strength
  change while paused shows at once; an edit that changes the picture while paused restarts it.
- **Ghost renders** (onion skin, the "changes nothing" probe) pass the picture through and leave the history alone.

## The tests (each fails on 85b71929 on its first line, `_b53Need()`: "Deflicker is missing from this build: no registry entry for deflicker")
All through `FM.renderScene` (`_986shot`), frame by frame in order at 30 fps (`_b53Run`). The fixture is a still picture — a warm
rectangle (200, 160, 120) filling 160 × 90 — under an Exposure whose Stops are keyed on every frame, so its brightness flickers by a
known amount (Stops 0 / −0.5 on alternate frames: luma ≈ 165.6 / 116.9). Exposure's own default is +0.8 stops, so Stops is always given.
1. **catalogue** — Blur (CONTROL: Temporal Denoise is), label, the description names "frame by frame" and "jump", search words (and not bare
   "flicker"), the three rows exactly, no px keys, POSTFX, not BOUNDED / CROP_FX / PIXEL_ADJ, not offered on an adjustment layer (CONTROL: a
   shape takes it), the sanitiser keeps a fresh one whole, leads the NEW row, export-resume TEMPORAL_FX and its pre-roll (90 / 360 / 25 /
   270 keyframed / 180 at 60 fps / 90 without fps; CONTROL: an Exposure alone asks for 0).
2. **the flicker evened out** — the swing ≤ 25 % of the picture's over 60 frames; the level held between the bright and dark frames; the
   first frame is the picture as it is; **Strength 0 = the picture byte for byte on every frame**; Strength 50 % leaves 30–75 %.
3. **THE FIX** — a spy on the kernel through the real dispatcher: the 10th argument is the layer's own effect; twelve frames in order are
   evened out (the pile's no-op would leave them byte for byte); CONTROL: called the old way (nine arguments) the kernel leaves the picture
   alone and does not throw. **prove.sh 3c removes the `, fx` in a copy and this test must fail on it.**
4. **a real fade is kept** — 60 levels over 1 s then a hold: within **`B53_FADE_TOL` = 15** of the picture on every frame (from the
   arithmetic: ~11 here, ~26 for the pile's smoother — TODO(first run): write the measured number beside it), within 12 at the fade's end,
   within 2 by 2.5 s later; CONTROL: the same fade with the flicker on top is evened out.
5. **history per effect, layer and plate** — the same 20 frames twice, after `FM.resetMotionFlowCache`, and on a JSON copy: identical; an
   export (FM._exporting flipped) one frame after preview frames is the picture as it is (the pile's own check); two half-frame layers side by
   side = each alone (CONTROL: the flickering one is corrected); one layer at 1 and 0.5 interleaved = each alone.
6. **the scrub rule** — back to 5 = the picture; then 6 = a twin that started at 5, ≠ the in-order 6; +0.4 s = the picture; +0.3 s keeps
   correcting; the same instant again = the same bytes; Strength 0 there = the picture; Strength 100 again = the same bytes; a ghost render
   = the picture, and frame 28 after it = a twin that never had the ghost or the repaints.
7. **a cut is not flicker** — the subject jumps to the other half and is a stop darker from frame 10: frame 10 on is the picture as it is;
   CONTROL: the same darkening without the jump is lifted by > 10 levels.
8. **plates** — the 0.5 and 0.28 plates within **`B53_PLATE_TOL` = 4, a GUESS marked TODO(first run)** of the export at frames 1, 9, 21, 39;
   CONTROL: the picture as it is must be > 1.5 × the bound away; prove.sh 3b forces the bound to −1 to print the numbers. The fixture is
   flat, so this proves the history runs and agrees per plate; the sampling stride differs per plate and a textured fixture would test that.
9. **every slider moves the picture** — on a 1.5-stop flicker, Smoothing 0.1 / 2, Strength 0 / 100, Maximum correction 0.25 / 2 each move
   frame 31 by ≥ 5 levels (the inert sweep's in-order twin).
10. **dead-here and the tile** (Chrome only — it drives the effects browser): a still photo with nothing on it is badged and the reason names
    flicker (CONTROL: Gaussian Blur is not); with an Exposure on it, quiet; on a video, quiet; the tile played as `generate()` plays it swings
    ≤ 60 % of the tile without it (fixture control: that one swings > 8). In node it fails on the tip with "this cannot be observed
    (FM._fxDeadHereWhy is not loaded …)"; prove.sh expects exactly that.

## Shared tests touched (the merge notes)
- **E1's `LATER`**: `'deflicker'` appended. **745's `NEWEST_FIRST`** and **913.8's `NEWER`**: `'deflicker'` at the FRONT (913.8: seventeen
  newer than Snow & Rain). Deflicker joins the NEW row (a Blur effect, not text-only), so it is in all three, exactly as Clarity was.
- ⚠️ **MERGE POINT: CATEGORY_OF "batch 48"** — Datamosh Bloom (B17), Venetian Blinds (B27), Radio Waves (B28), Lens Magnifier (B29), Circle
  Array (B30), Gradient Wipe (B39) and the other §B / pile branches also wrote batch 48 from the same base. Renumber in merge order (48, 49,
  50…); the line written last leads the NEW row, and only that line says "The newest". The compositor blocks push onto `FM.EFFECTS` in
  file order and 913.8 wants the LAST pushed to lead, so the block order (`DF_ROWS` after Clarity, before `FM._FX_TABLES`) must match.
- **482 "every effect does something visible"**: `deflicker` in **KNOWN_THIN** with the why (LAND-LIST's instruction): that sweep draws each
  frame alone and calls the kernel without its effect, where the picture as it is is the right answer.
- **"effects: no effect slider is completely inert"**: a new `ACROSS_FRAMES = { deflicker: 1 }` skip, with the why — the same reason; its
  in-order twin is test 9. (Temporal Denoise never needed this: it is a canvas effect and that sweep walks PIXEL_FX only. Deflicker is a
  PIXEL_FX kernel because the land list's fix is the PIXEL_FX dispatcher's — so both PIXEL_FX sweeps see it.)
- **queue 264 `ALLOWED`**: nothing added. Single frames on fresh layers are the picture as it is at every extreme; it never erases.
- **Read, not run** — 784 (bare = defaults = the picture on a single frame), zero-means-zero (single frames: never "swallowed"), 793 (the
  kernel's `fparam(p, 'smooth', 0.5` / `'strength', 100` / `'limit', 1` = the registry defaults), the sanitiser sweep, 692's crop probe (not in
  CROP_FX), 474's scratch tests (named kernels), "no Colouring effect is a silent no-op" (Colouring only), 794 (four named ghost-gated
  effects; a fifth changes nothing there), "export resume: the join warms up …" (every TEMPORAL_FX member must ask for a pre-roll: 90 here).
  **913.5 (zoom)** renders every effect whole and zoomed: on a single frame each is the picture as it is, except that a zoomed render on the
  SAME plate size at the same instant with a mean within 0.5 of the whole frame's reuses the whole frame's level (a gain within ~0.4 %) —
  prove.sh runs it with `ZOOM=1`.
- **921 S1 the schema fingerprint** will be red on this branch (the new params move it), as on every §B branch: **C.SCHEMA_FP / SCHEMA_REV
  left alone**, prove.sh stage 6 prints the number to pin in the gap.
- **Busters**: compositor 224 → **225**, fx-registry 28.36 → **28.37**, fx-thumbs 59 → **60**, fx-browser 98 → **99**, export-resume 7 → **8** — the
  §B siblings bump the same from the same numbers, so the merge takes one number above all of them.
- Insertion points: compositor — the dispatcher line in `drawPixelEffect`, `FM.resetMotionFlowCache` (calls `dfReset()`), and the block after
  Clarity's kernel, before `FM._FX_TABLES`; fx-registry CATEGORY_OF after clarity (clarity's line no longer says "The newest") and
  SEARCH_ALIASES after clarity; fx-thumbs OVERRIDES after `temporaldenoise` and the GHOST_GATED line; fx-browser `STEADY_FX` after
  NEEDS_FOOTAGE_FX, its check after the footage check, and one `deadShortLabel` line; export-resume TEMPORAL_FX and a branch after Time
  Warp Scan's; tests after "end 966 B22". Keep every block.

## The sheet: `render-probe.js` for the next browser slot
How to run it is in its header (tools/serve.sh + `tools/design/plans/fxnew-looks/recv.py` + tools/shot.py). It POSTs each page as a JPEG to
`'http://127.0.0.1:' + window.__recv + '/<name>.jpg'` (`?fmrecv=` works too). **Every row is played IN ORDER**, frame 0 to 119, one layer
each: the dog photo, still, its brightness flickering irregularly by up to ±16 % (a seeded hash per frame), and a real fade to 45 % from
frame 70 to 95 that the effect must keep.

| Page | What it shows |
|---|---|
| `deflicker-strip.jpg` | frames 20–25 in a row: the clip, the defaults (**recommended**), Smoothing 0.2 s, Smoothing 1.5 s |
| `deflicker-graph.jpg` | the brightness of every frame for the clip, the defaults, Smoothing 0.2 / 1.5 s and Strength 50 %, with the real fade shaded |

The summary it returns gives each row's swing before the fade and the share of the real fade it keeps (a check that the sheet does not
show an effect that did nothing, or one that flattened the fade).

## Questions for Ezra
1. **Defaults**: Smoothing 0.5 s (recommended — evens out a time-lapse flicker within a few frames and follows a fade with only a small bend),
   or slower (1–1.5 s: steadier, but slower to settle after a jump)? Maximum correction 1 EV (twice / half as bright at most)?
2. **The smoother**: kept the pile's three controls but follows a steady fade with no lag (double exponential). The pile's single average
   flattens fades by Smoothing × rate. Keep the new one (recommended)?
3. **On an adjustment layer** — deflicker everything below it at once (how most editors do it)? Not offered today: the adjustment path does
   not hand a kernel its effect, so it would do nothing. It needs `applyPixelFx` to pass `fx` too — one more line, and a history keyed on the
   adjustment layer. Worth doing?
4. Name: **Deflicker** (the trade's word; the pile's). Search also finds it by "flicker fix", "remove flicker", "timelapse".

## What prove.sh checks (`…/scratchpad/agents/pile-deflicker/prove.sh` → `prove-result.txt`)
1. It will not start (and stops between stages) inside a ship, a lock run or a live API builder without a helper slot (gapcheck.sh).
2. `node --check` on the five changed js, tests.js parses, the probe parses as an async body; no CRLF, `git diff --check`, no mode change,
   every buster raised.
3. The ten new tests through the datamosh branch's `rund.js` (fx-c's runc.js + js/export-resume.js): each FAILS on 85b71929's js naming
   the missing effect (not a TypeError); on this branch nine PASS and the Chrome-only dead-here test fails for its own stated reason. **3b**:
   the plate and fade tests with their bounds forced to −1, for the numbers. **3c, THE FIX proved**: the dispatcher's `, fx` removed in a
   COPY of this branch's js — '966 B53 THE FIX' must FAIL naming the 10th argument, every in-order test must FAIL, the catalogue still PASSES.
4. Temporal Denoise's neighbours, 794 / 906, the export-resume pre-roll test, the sweeps (482 visible, inert, 784, queue 264, zero,
   sanitise, 793), the search test, the shared NEW-row tests and Clarity's batch, on both trees with this tests.js — the same verdicts
   (`ZOOM=1` adds 913.5); then the ORIGINAL E1, 745, 482-visible and inert on this js — they fail (why edited).
5. The schema fingerprint of both trees; `treecheck.py 85b71929 HEAD` and `drops.py 85b71929 HEAD`.

## Not done here, and what I am unsure of
- **Never run, never seen.** Every number above is arithmetic. If a test's own CONTROL fails, suspect the fixture first (the
  rectangle's edges, Exposure's arithmetic, or the shape's keyed position in the cut test).
- `B53_PLATE_TOL` and `B53_FADE_TOL` have to be set from the first run's numbers (prove.sh 3b prints them).
- Chrome at 900 and 380 is owed: `?only=966%20B53` (the dead-here test only runs there), and 913.8 / 745 / 747 / 913.5 / 794.
- SCHEMA_FP still has to be pinned (with the other §B branches, in the gap).
- Unmeasured on his phone: one pass over ~4,096 sampled pixels and one multiply over every pixel of the plate per frame — cheap next to
  any blur, but an export at 1080 × 1920 still walks 2M pixels a frame.
- The cut rule is the pile's heuristic: a new shot with nearly the same layout of light and dark is smoothed for a moment, and big subject
  motion inside one shot can restart the history. A layer covering fewer than 8 of the 64 cells (a small sticker) never smooths at all.
- A shape whose FILL colour is keyframed to flash is badged "nothing flickers" though Deflicker would work on it — the badge only reads the
  layer type and the effect count (rare enough to name rather than guess at).
