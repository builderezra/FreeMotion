# #966 backlog §B39 — Gradient Wipe on `hunt/pile-gradientwipe` (15 Oct), ported from the ChatGPT pile

Ported BY HAND from ChatGPT's pile commit **`3e591a41`** ("Add map-driven Gradient Wipe effect", on `codex/690-reviewed-local`,
pinned at `refs/pile/codex-690-reviewed`), with the fix LAND-LIST.md's batch B6 prescribes for it. Built on `85b71929` (the §B chain
tip, hunt/fxnew-drums), which holds B15 Shape Wipe; Venetian Blinds (B27, hunt/fxnew-blinds) is the sibling built to the same rules.
Spec: `tools/design/plans/2026-09-29-idle-backlog/backlog.md` §B39 ("map layer, progress, softness, channel, invert").
**When this lands, the pile commit `3e591a41` is to be DROPPED** — this branch replaces it; landing both would register the effect twice.
**Nothing was run** — no node, no browser, not even `node --check` — because the API builder was live. The proof is written and
waiting: `prove.sh` in the helper's scratchpad (below). His rule (#545) is that he picks the look before anything ships; the build did
not wait, so every choice on the sheet is already an option on the effect. His pick sets defaults; nothing gets rebuilt.

## What was taken from the pile, and what changed

| | The pile (3e591a41) | Here |
|---|---|---|
| Controls | Wipe map picker, Progress 0–1 (0.005 notch, 0.5), Softness 0–100 % (10), Read Luma / Alpha / Red / Green / Blue, Invert | **the same**, in the same order, same defaults |
| Route | its own draw function beside Luma Matte: a `dspSlot` pool slot, `nestedPlate`, the target and the map drawn on plates, the map at full opacity with its own Gradient Wipes stripped, read × the map's alpha | **the same** (`drawGradientWipe`), parameters read through `b966N` so the fallbacks are the registry's defaults |
| The edge | `edge = 1 − progress` — **pops**: at Softness 20 % the map's brightest pixels show at ~51 % one notch after 0 and its darkest are ~49 % hidden one notch before 1, then the early returns snap them | **the fix**: `edge = (1 + s/2) − progress × (1 + s)`, so alpha `(v − 1 + progress (1 + s)) / s` is 0 for every map value at 0 and 1 at 1, and continuous into both early returns at any Softness |
| No map picked | the layer drawn untouched at any Progress (Luma Matte's rule) | **the layer's own brightness** (After Effects' default; the picker's own empty choice already reads "This layer (self)"); `layerOptional`, so no "Needs a setting" badge. A one-line change back if he prefers the pile's — **question 1** |
| Registration | spliced into the main table between Radial Wipe and Venetian Blinds; desc twice (row + DESCRIPTIONS) | **batch 48** at the end (`GW_ROWS`, just before `FM._FX_TABLES`), so it leads the NEW row; desc on the row only; search words added |
| Tile | none | `gradientwipe: kf01('progress')` — with no map the tile wipes the photo by its own brightness |
| Busters | compositor 221 → 222, fx-registry 25.41 → 25.42 (ChatGPT's private count) | from this tree, once: compositor 224 → **225**, fx-registry 28.36 → **28.37**, fx-thumbs 59 → **60** |
| Its test | one, `{ item: 'TBD' }`: a two-half map, and three exact values of the formula | folded into four `966 B39 …` tests (below); its two-half map became a ramp; its exact `=== 0.5` became a 1e-9 tolerance — the fixed edge `(1 + 0.1) − 0.5 × 1.2` is 0.5 plus one ulp in floats, so the exact check would have failed for a reason that is not a bug |
| `outside/chatgpt/fixes/690-gradient-wipe.md` | its report | not carried (the land list's rule: ChatGPT's reports stay out) |

Where it lives: `js/compositor.js` — the dispatcher line beside Luma Matte's (`if (fx.type === 'gradientwipe') return drawGradientWipe(…)`)
and the block `GW_ROWS` / `gradientWipeAlpha` (= `FM._gradientWipeAlpha`) / `drawGradientWipe` just before `FM._FX_TABLES`.
`js/fx-registry.js` — CATEGORY_OF batch 48 `gradientwipe: 'matte'` (the comment "The newest, so it leads the NEW row" moved off
clarity's line onto it) and search words. `js/fx-thumbs.js` — the tile.

### The rules it keeps (the wipes' and Venetian Blinds')
- **Progress** is how much is revealed: 0 nothing, 1 the layer untouched, exactly (early returns). A value, not a speed; nothing integrated.
- **Only alpha changes**; a transparent pixel is never touched. **Stateless**: no Math.random, the clock only through keyframes.
- **Softness is not px**: a share of the map's range, so nothing scales with the plate (no `unit: 'px'`, `FM._pxParamKeys` is empty) and
  the preview, the 0.28 phone plate and the export agree.
- **Not a PIXEL_FX kernel and not in CROP_FX** (it reads another layer, so it takes Luma Matte's route), **not on adjustment layers**
  (not in ADJ_OK). Fit to Frame / Layer does not apply — the map is the geometry.
- Map pixels read × the map's alpha: a transparent map pixel reads as black and opens last (Luma Matte's rule). An empty or
  off-clip map therefore makes the wipe a plain fade — honest, and what the arithmetic says.

Search words: gradient wipe, luma wipe, luminance wipe, brightness wipe, map wipe, custom wipe, texture wipe, transition, reveal.
Not "gradient" alone (Gradient Overlay's, Gradient Map's, the fill gradient's).

## The tests (each fails on 85b71929 on its first line, `_b39Need()`: "Gradient Wipe is missing from this build…")
All through `FM.renderScene` (`_986shot`) — there is no pixel kernel to call — mostly on a black-to-white ramp map filling the frame.
1. **`966 B39 Gradient Wipe is in the registry …`** — Keying (CONTROL: Shape Wipe is), routed, not a pixel kernel / CROP_FX / ADJ_OK,
   description, search words (and not bare "gradient"), the five controls in order, the Wipe map picker first and empty,
   `layerOptional` and — where fx-browser.js is loaded — not "Needs a setting" (CONTROL: Luma Matte is), options, ranges, the 0.005
   notch, defaults, no px control, after Clarity and Shape Wipe at the head of the New row, a tile that sweeps Progress and moves.
2. **`… Progress 0 shows nothing and 1 the layer untouched, EXACTLY …`** — byte for byte over 20 combinations (Softness 0/10/20/50/100,
   Invert, ramp map / own brightness; CONTROL: 0.5 is neither end). **No pop**: one notch in at Softness 20 %, the brightest pixels
   show ≤ 13 of 255 and one notch from 1 the darkest ≥ 242 (CONTROL: ten notches in it shows > 40; the pile's formula, kept as
   `_b39PileAlpha`, gives ~129 and ~126 at the same pixels). The formula notch by notch: no step moves alpha more than the edge's own
   slope `(1 + s)/s` per unit (CONTROL: the pile's formula breaks it). The pile's own three checks.
3. **`… the map decides which pixels open first …`** — hard edge at x ≈ (1 − Progress) × 200 for 0.25 / 0.5 / 0.8, Invert from the dark
   end; Read on a black-to-red ramp (Red its bright half, Alpha all, Green / Blue none, Luma none at 0.5 and from x ≈ 134 at 0.8 —
   0.2 / 0.299 of the way); no map = the ramp target's own bright half, byte for byte; Softness 0 / 10 / 25 / 50 / 100 % feathers
   strictly more each step and keeps the half point at x ≈ 100 (CONTROL: the hard edge has no partial pixel); only alpha changes
   (a #e8d8b0 target keeps its proportions).
4. **`… through the real compositor …`** — the 0.5 and 0.28 plates = the export box-averaged down, by a radial map and by the layer's
   own brightness, within **`B39_PLATE_TOL` = 5, a guess marked TODO(first run)**; CONTROL: the same wipe 0.08 further on (Softness
   is not px, so Venetian Blinds' "feather at plate px" twin does not exist; a wrong plate would put the edge somewhere else, which
   is what this control is). Stateless; a keyframed Progress = that value plain at three times; bare (no params) = defaults, and the
   defaults are half done by the layer's own brightness.

## Shared tests touched (the merge notes)
- **E1's `LATER`**: `'gradientwipe'` appended. **745's `NEWEST_FIRST`** and **913.8's `NEWER`**: `'gradientwipe'` at the FRONT (913.8:
  seventeen newer than Snow & Rain). **Batch 48 is also Venetian Blinds' number** on hunt/fxnew-blinds (and other §B / pile branches
  from the same base add theirs the same way): merge by hand — every id goes in, the batches renumbered in landing order (49, 50…),
  the CATEGORY_OF lines in batch order, and only the last one says "The newest, so it leads the NEW row".
- **queue 264 `ALLOWED`**: `'gradientwipe:progress=min'` (wipe:progress=min's twin) and, because the fixture is one flat orange read
  by its OWN brightness (no map), `invert=max` (reads 0.325) and `channel=max` (Blue reads 0.239) — both under the half-open edge at
  0.5, so nothing of the layer is reached yet. The comment carries the arithmetic. Softness 0 / 100, Progress 1 and Read Luma keep it.
  If he picks the pile's no-map rule (question 1), the last two entries go (the layer is then untouched with no map).
- Read, not run: the **inert sweep** and **482's visible-at-defaults** walk only PIXEL_FX / WARP_FX, so they skip it (as they skip
  Luma Matte); tests 2–4 above are its own sweep. **784** holds by the fallbacks being the registry's (b966N). **793** reads the
  defs (no `fparam(` literal). **zero-jump**: Progress 0 draws nothing, unlike its default; Softness reads `p.softness == null ? 10`
  (b966N), never `|| 10`, so a 0 stays 0 (on that test's flat star, 0 and 10 may draw alike — the test only flags that when half the
  default draws differently). **913.5** (zoom) DOES now cover it — it skips "Needs a setting" effects, and with no map this one
  is not — so prove.sh has `ZOOM=1` for it; it is per-pixel on Luma Matte's plates, so it should hold, but nothing has run it.
- Busters: compositor 225, fx-registry 28.37, fx-thumbs 60 — every §B branch from 85b71929 (and Venetian Blinds from fb24f68b, which
  has the same three numbers) bumps them from the same values, so the merge takes one number above all of them.
  **C.SCHEMA_FP / SCHEMA_REV left alone** (the new params move it; prove.sh stage 6 prints the number to pin in the gap).

## The sheet: `render-probe.js` for the next browser slot
How to run it is in its header (tools/serve.sh + `tools/design/plans/fxnew-looks/recv.py` + tools/shot.py). It POSTs each page as a
JPEG to `'http://127.0.0.1:' + window.__recv + '/<name>.jpg'` (`?fmrecv=` works too), a fresh Image per tile. Clouds over city, 9:16;
a map is a layer at Opacity 0 in the same frame. Every page is under 2× as tall as wide.

| Page | What it shows |
|---|---|
| `gradwipe-big.jpg` | three big tiles half done: no map, the clouds' own brightness (**recommended**); a radial map (an iris); a photo map (bush) |
| `gradwipe-maps.jpg` | strips over Progress 0.1 → 0.9: no map; a left-to-right ramp; radial; angular (a fan); a photo; no map + Invert |
| `gradwipe-soft.jpg` | strips on the radial map: Softness 0, **10**, 30, 60, 100 % |
| `gradwipe-read.jpg` | strips on a colour photo map (shore): Read **Luma**, Alpha, Red, Green, Blue |
| `gradwipe-ends.jpg` | **the fix**, at Progress 0 · 0.005 · 0.02 · 0.5 · 0.98 · 0.995 · 1, Softness 30 %: as built vs ChatGPT's formula — drawn by the app itself, since the pile's edge is exactly the built one at Progress (p + s/2) / (1 + s) |

## Questions for Ezra
1. **With no map picked**: wipe by the layer's own brightness (built — works the moment it is added, as in After Effects), or leave
   the layer untouched until a map is picked (ChatGPT's choice, and Luma Matte's)?
2. **Default look**: no map, Softness 10 % — or a softer default (30 %) that reads more like a dissolve on photos?
3. **Read** keeps all five choices (Luma / Alpha / Red / Green / Blue) — fine, or just Luma and Alpha?

## What prove.sh checks (`…/scratchpad/agents/pile-gradientwipe/prove.sh` → `prove-result.txt`)
1. It will not start (and stops between stages) inside a ship, a lock run or a live API builder without a helper slot (gapcheck.sh).
2. `node --check` on the three changed js, tests.js parses, the probe parses as an async body; no CRLF, `git diff --check`, no mode change.
3. The four new tests (runb.js): each FAILS on 85b71929's js naming the missing effect (not a TypeError) and PASSES here; then the
   plate test with the bound forced to −1, for the numbers; then **3c, the fix proved**: the pile's `edge = 1 − progress` put back in
   a COPY of this branch's js — the pop test must FAIL on the pop, the other three still pass.
4. Wipe / Radial Wipe / Shape Wipe / Clarity's row check / queue 264 / 784 / inert / visible / zero-jump / 793 / E1 / 745 / 913.8 on
   both trees with this tests.js — the same verdicts (`ZOOM=1` adds 913.5); then the ORIGINAL E1, 745 and queue 264 on this js — they
   fail (why edited).
5. The schema fingerprint of both trees; `treecheck.py 85b71929 HEAD` and `drops.py 85b71929 HEAD`.

## Not done here
- `B39_PLATE_TOL` has to be set from the first run's numbers (prove.sh 3b prints them).
- The sheet has to be rendered in a browser slot, and his picks applied as defaults (question 1 is a one-line change either way:
  `drawGradientWipe`'s no-map case and `layerOptional`, plus the two queue 264 entries and test 3's own-brightness checks).
- SCHEMA_FP still has to be pinned (with the other §B branches, in the gap).
- The pile commit `3e591a41` has to be marked DROPPED in the land list when this lands.
