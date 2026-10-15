# #966 backlog §B38 — Fractal Noise on `hunt/pile-fractalnoise` (15 Oct), ported from the ChatGPT pile

Ported BY HAND from ChatGPT's pile commit **`fcda7fd2`** ("Add animated Fractal Noise effect", on `codex/690-reviewed-local`, pinned at
`refs/pile/codex-690-reviewed`), with the fix LAND-LIST.md's batch B6 prescribes for it: **grid spacing from the finest octave**. Built on
`85b71929` (the §B chain tip, hunt/fxnew-drums). Spec: `tools/design/plans/2026-09-29-idle-backlog/backlog.md` §B38 ("Basic / Turbulent /
Smooth / Ridged, contrast, octaves, evolution", Generative).
**When this lands, the pile commit `fcda7fd2` is to be DROPPED** — this branch replaces it; landing both would register the effect twice.
**Nothing was run** — no node, no browser, not even `node --check` — because the API builder was live. Every number below is hand
arithmetic. The proof is written and waiting: `prove.sh` in the helper's scratchpad (below). His rule (#545) is that he picks the look
before anything ships; the build did not wait, so every choice on the sheet is already an option on the effect.

## Not built before — checked
- `fractalnoise` is in neither ssh/main's nor 85b71929's `js/compositor.js` (only Fractal Warp and Fractal Ridges, different effects).
- `git show ssh/main:REQUESTS.md | grep -i "fractal noise"`: nothing. POLISH-LOG on ssh/main: only Fractal Ridges / Fractal Warp entries.
- LAND-LIST's T15 note ("keep both `fractalnoise` and the ps-aware `smoothbevel`") is about the pile's own merge commit `7bc6c9ab`, which
  carries the pile's copy; nothing of it is on main.

## What the pile did wrong, plainly (the fix)
The pile drew the noise on a grid of **at most 320 samples along the plate's long edge**, then stretched that grid over the plate with
straight-line (bilinear) blending. The grid's size came from the PLATE, not from the noise. On his 1080 x 1350 frame that is one sample
every ~4.2 **project** px — and it is the same on every plate: the export, a desktop preview and the 0.28 phone plate (a 378 px tall plate
still gets 320 rows). A noise octave needs at least two samples across each of its squares to be drawn at all; every octave whose square
is under ~8 project px was sampled less often than that, so it came out **aliased** — its fine pattern replaced by random ~4 px blotches —
and then smeared by the stretch. At the default Scale 100 that is the 5th and 6th octaves (6.25 and 3.1 px squares); at Scale 16 it is
every octave from the 2nd down. So raising Octaves past ~3 added mush, never finer detail, in the preview and the export alike — the finest
detail the slider promises was never drawn anywhere. (The phone was not worse than the export: both sampled ~4.2 project px apart.)

**The fix:** the grid's step now comes from the **finest drawn octave** — an eighth of its square (`FN_PER_CELL = 8`, so the straight lines
between samples never show), never under one plate pixel. At the defaults that is a sample every 1.6 px of the export and every pixel of
the phone plate; at Scale 16 every pixel everywhere. Two companions make it hold on every plate:
- **An octave finer than the plate can show is left out instead of aliasing**: drawn whole down to a 2 plate px square, faded out linearly
  by 1 px, and every finer one gone with it (the sum is renormalised over what is drawn). On the 0.28 plate that leaves out exactly what the
  export, shrunk to that plate, averages away — so the preview is the export shrunk. (At Scale 16 with 6 octaves the 5th and 6th squares
  are 1 and 0.5 px: under a pixel even in the export, so they are never drawn — they could only ever have been noise on noise.)
- **Grid nodes sit at fixed plate places** (`k x step` from the corner) and the noise is read at each plate pixel's **centre** in project
  px, where the pile stretched its grid to the plate's size and read the corner — so a sample's place no longer depends on the plate size.

## What was taken from the pile, and what changed

| | The pile (fcda7fd2) | Here |
|---|---|---|
| Controls | Pattern Basic / Turbulent / Smooth / Ridged; Scale 16–400 px (100); Octaves 1–6 (4); Contrast 0–300 % (100); Evolution −4–4 /s (0.5); Seed 0–999 (0); Blend Normal / Multiply / Screen / Overlay; Amount 0–100 % (100); Dark #000000 / Light #ffffff | **the same**, same order, same defaults |
| The noise | value noise, smoothstep, the pile's Math.imul hash and per-octave salt (seed + 1013 x octave); Smooth = finer octaves x0.25 instead of x0.5 | **the same** functions (`fnHash`, `fnValue`) |
| The grid | ≤ 320 samples on the long edge, stretched to the plate, read at pixel corners | **the fix** (above): step from the finest drawn octave, fixed node places, pixel centres; sub-pixel octaves faded out |
| Ridged | `1 − |2v − 1|` — exactly Turbulent's negative (the sum is linear, so Ridged = 1 − Turbulent at every pixel: two of the four patterns were one picture and its inverse, and swapping Dark and Light gave the other) | `(1 − |2v − 1|)²` — the ridged-noise standard: the square narrows the bright ridges and widens the dark valleys, so it is its own look. **Question 2** |
| Evolution | a speed (/s); each octave slides through its lattice at its own rate (0.7 + 0.21 o, −0.9 − 0.17 o lattice units per unit), integrated when keyed — from the PROJECT's 0 | **the same motion**, on **the clip's own clock** (`FM.fxLocalTime`, integrated from the clip's first moment — a split or trimmed clip keeps its texture). **Question 1** asks whether he wants AE's churn-in-place instead |
| Registration | spliced into the main table after Fractal Ridges' neighbour, `fractalnoise: 1` in the batch-17 POSTFX line, CATEGORY_OF batch 17, desc twice | **batch 48** at the end (`FN_ROWS`, just before `FM._FX_TABLES`), so it leads the NEW row; desc on the row only; search words added |
| Tile | none | `fractalnoise: scale 24` in fx-thumbs OVERRIDES (the default 100 is one soft blob on a 96-unit tile) |
| Busters | compositor 220 → 221, fx-registry 25.40 → 25.41 (ChatGPT's private count) | from this tree, once: compositor 224 → **225**, fx-registry 28.36 → **28.37**, fx-thumbs 59 → **60** |
| Its test | one, `{ item: 'TBD' }`, 40 x 40: patterns differ, alpha kept, Evolution 0 holds / 0.5 moves, Amount 0 identity | folded into seven `966 B38 …` tests (below) |
| `outside/chatgpt/fixes/690-fractal-noise.md` | its report | not carried (the land list's rule) |

Where it lives: `js/compositor.js` — the block `FN_ROWS` / `fnPlan` / `fnStep` / `fnPhase` / `fnHash` / `fnValue` / `PIXEL_FX.fractalnoise`
/ `FM._fractalNoisePlan` (a seam: the octaves a plate draws and the grid's step) just before `FM._FX_TABLES`. `js/fx-registry.js` —
CATEGORY_OF batch 48 `fractalnoise: 'proc'` (the comment "The newest, so it leads the NEW row" moved off clarity's line onto it) and
search words. `js/fx-thumbs.js` — the tile.

### The rules it keeps
- **A pixel kernel** routed through POSTFX, six named arguments (it takes `ps` itself, so pxToPlate leaves Scale alone), the layer as
  `arguments[7]` for the clip clock. Not in CROP_FX (the lattice is anchored to the plate's corner, so a cropped readback would draw it
  shifted), not in PIXEL_ADJ / ADJ_OK (a generator, not a grade), not BOUNDED, no ctx.filter.
- **Only where the layer is**: a transparent pixel is never written, alpha never changes (as Clouds).
- **Stateless**: the pooled grid is rewritten whole before it is read; no Math.random; the clock only through Evolution.
- **Every fallback is the registry default** (`fparam` with `== null`, so a 0 stays 0; 793 reads `amount`, `contrast`, `seed`, `blend`
  from the kernel's own `fparam(` literals and the rest from the defs — all equal).

Search words: fractal noise, fractal, noise, perlin, perlin noise, value noise, turbulent, turbulence, ridged, smoke, marble, organic,
texture. Fractal Ridges keeps its own `fractal noise` alias, so typing that finds both. Not `clouds` (the Clouds effect's name).

## The tests — 7 new, all `'966 B38 …'`, appended before the final `})();`
Each asks `_b38Need()` first, so on 85b71929 every one fails with **"no registry entry for fractalnoise — Fractal Noise is not built"** —
never a TypeError. Most drive the kernel itself on an opaque plate with Dark black / Light white, where the red byte IS 255 x the value.
1. **Catalogue**: Generative, POSTFX, six-argument kernel, not canvas/warp, not CROP_FX, not PIXEL_ADJ; search words; description; the ten
   rows in order, defaults, ranges, units (`scale` the only px key), keyframable sliders, option labels, Dark / Light; offered on a shape,
   not an adjustment layer; the sanitiser keeps a fresh one whole; leads the NEW row behind only newer effects; through the compositor
   the defaults repaint ≥ 80 % of a blue frame, and a bare instance draws byte-for-byte what a new one draws.
2. **Patterns, by their defining property** (one octave, an 8 plate px square so the grid samples every pixel): Turbulent = |2 x Basic −
   255| within 2 levels and Ridged = (255 − |2 x Basic − 255|)² / 255 within 3 (the identities ARE the definitions; the bounds are two
   bytes' rounding); Smooth = Basic byte for byte on one octave. Then what each looks like: Basic centred (mean 0.5 ± 0.05) with dips and
   humps alike (row-extreme sharpness ratio 0.6–1.67); **Turbulent folded** — mean ≤ 0.44 and its darkest fifth ≥ 25 % of pixels and ≥ 3x
   Basic's (by hand ~36 % against ~8 %) — with **sharp minima** (the second difference summed at strict row minima ≥ 2x that at maxima:
   a fold makes a V, by hand ~4x); **Ridged sharp ridges** (maxima ≥ 3x minima, by hand ~15x). Four octaves: Smooth's fine detail (mean
   pixel step / standard deviation) ≤ Basic's / 1.25 (by hand Basic carries ~1.56x); all four pictures differ by ≥ 6 levels on average.
   Why these statistics: the creases are the visible character of both folded patterns and a crease is exactly a large second difference
   at an extreme; a smooth extreme has a small one — on a grid that samples every pixel this cannot come from the drawing.
3. **THE FIX**: on a 1280 x 64 full-size plate (the pile's grid: one sample every 4 px), Basic, Scale 16 (squares 16, 8, 4, 2 px), Contrast
   150 %: Octaves n and n − 1 share their first layers exactly, so `sum_n − sum_(n−1)` (undone through Contrast, clipped pixels left out)
   is the n-th octave ALONE. Its pixel swing per unit weight must rise 2nd < 3rd < 4th with the 4th ≥ 1.4x the 3rd (by hand 0.038, 0.075,
   0.14), and the 4th's 1-to-4 ratio (mean |lag 1| / mean |lag 4|) ≥ 0.4 and ≥ 1.5x the coarse octave's (CONTROL: the 16 px octave ≤ 0.33,
   a smooth field ~0.25). **With the pile's spacing** the 4th octave is sampled once every two squares and drawn straight across 4 px:
   swing ≈ 0.06, no more than the 3rd's, ratio ≈ 0.26 — all three checks fail; prove.sh 3c puts that spacing back to show it. The phone:
   on a 0.28 plate Octaves 6 draws byte-for-byte what Octaves 4 draws (the 4th–6th are under a plate pixel and left out; CONTROL: at full
   size Octaves 4 ≠ 3).
4. **Contrast / Amount / Blend / colours / alpha**: Contrast 0 one flat 127.5 grey; spread 50 % ≈ half of 100 % (0.42–0.58), 200 % nearly
   twice (1.6–2.05), centred at all three; Amount 0 untouched, 50 % halfway (± 1); Multiply never lightens, Screen never darkens, Overlay
   differs from Normal / Multiply / Screen on half the frame; Dark red / Light blue: green 0, red + blue = 255 ± 1; transparent pixels never
   written, alpha never changed (CONTROL: the half-transparent half is painted).
5. **Evolution**: across a hold key 0.5 → 3 /s at 1 s the picture moves no further than plain 3 /s moves in the same 0.02 s (CONTROL:
   reading speed x time jumps ≥ 8 levels and ≥ 4x); a ramp 0 → 2 /s over 2 s lands where 1 /s for 2 s does (≤ 1 level; CONTROL: 2 /s for
   2 s is elsewhere); a flat key = the plain value; 0 holds still, 0.5 /s moves (the pile's checks); a clip starting at 2 s draws at 2.5 s
   what one starting at 0 draws at 0.5 s, byte for byte, and keyed 2 → 4 s = keyed 0 → 2 s (CONTROL: the two clips differ at the same 2.5 s).
6. **Stateless**: 1.6 s after 0.3, 2.7 (on a bigger plate, which resizes the pooled grid) and 1.1 s is byte-identical with Evolution,
   Scale and Octaves keyed, in the kernel and through FM.renderScene (CONTROL: 1.6 vs 1.7 s differ); every slider keyed flat = plain (± 1).
7. **The plates**: on a 400 x 300 project, Basic (Scale 40, 4 octaves) and Turbulent (Scale 60, 6 octaves, 150 %) at 0.5 and 0.28 within
   **`B38_PLATE_TOL` = 8 levels — A GUESS, marked TODO: set it from the first run's numbers** (prove.sh 3b prints them) of the export shrunk
   by area; positive controls must exceed 1.5x the bound: Scale drawn in plate pixels, and the texture half a second late.

## Shared tests touched, and the sweeps (the merge notes)
- **E1's `LATER`**: `'fractalnoise'` appended. **745's `NEWEST_FIRST`** and **913.8's `NEWER`**: `'fractalnoise'` at the FRONT (913.8:
  seventeen newer than Snow & Rain — still the "twelve newest, Snow & Rain out" branch). The NEW row becomes fractalnoise, clarity,
  audiospectrum, filmdamage, shapewipe, colorflash, hslmixer, tonecurve, colorwheels, starglow, timeecho, popart (censor leaves). Clarity's
  own row check and 747 ask "behind only effects registered after it", so they hold.
- **Batch 48 is also Gradient Wipe's number** (hunt/pile-gradientwipe) and Radio Waves' (hunt/fxnew-radiowaves), and other §B / pile
  branches from the same base add theirs the same way: merge by hand — every id goes in, the batches renumbered in landing order (49,
  50…), the CATEGORY_OF lines in batch order, only the last one saying "The newest, so it leads the NEW row"; the `*_ROWS` blocks before
  `FM._FX_TABLES` in the same order (the block pushed LAST onto FM.EFFECTS is 913.8's "newest registered effect"); the three shared lists
  unioned newest batch first; SEARCH_ALIASES and fx-thumbs OVERRIDES appended.
- **queue 264 — no ALLOWED entry.** No single extreme erases the layer on its orange fixture: Contrast 0 is a flat mid grey, 300 % half
  white; Amount 0 is the layer; Ridged's mean is about the middle; Overlay over orange shows; Scale / Octaves / Evolution / Seed at either
  end still paint a grey noise over the black ground (only a value under ~0.02 would match it).
- **Which sweeps walk it**: it is a PIXEL kernel, so unlike Radio Waves (a canvas effect) the inert sweep ('no effect slider is completely
  inert', `FM._pixelFx`) and 482's visible-at-defaults DO walk it — no "every slider moves" test of its own is needed: by reading, Scale,
  Octaves, Contrast, Seed and Amount move it at t = 0, Evolution at t = 0.23 (every sweep moment after 0). 784 holds (fallbacks = defaults),
  793 holds (above), zero-means-zero holds (`== null` everywhere; 0 Contrast / Amount / Evolution stay 0), **913.5 now walks it** (the
  zoomed slice gets the whole comp's plate, and the lattice is anchored to the plate's corner and read at plate centres in project px,
  so it should hold — `ZOOM=1` in prove.sh runs it).
- Busters: compositor 225, fx-registry 28.37, fx-thumbs 60 — every §B branch from 85b71929 bumps from the same values, so the merge takes
  one number above all of them. **C.SCHEMA_FP / SCHEMA_REV left alone** (the new params move it; prove.sh stage 6 prints the number to pin
  in the gap, with the other §B branches).

## The sheet: `render-probe.js` for the next browser slot
How to run it is in its header (tools/serve.sh + `tools/design/plans/fxnew-looks/recv.py` + tools/shot.py). It POSTs each page as a JPEG
to `'http://127.0.0.1:' + window.__recv + '/<name>.jpg'` (`?fmrecv=` works too), a fresh Image per photo tile. 1080 x 1080 tiles drawn at
a quarter, each row a strip of 0 / 0.6 / 1.2 / 1.8 s. Every page is under 2.5x as tall as wide.

| Page | What it shows |
|---|---|
| `fractalnoise-patterns.jpg` | the defaults (**recommended**), Turbulent, Smooth, Ridged, Scale 40 / 260, Octaves 1 / 6, Contrast 50 / 220, Evolution 2 and −1 /s — white on black |
| `fractalnoise-looks.jpg` | over his clouds photo: Normal, **Overlay 70 % (recommended for texture)**, Multiply, Screen; on a dark frame: smoke, fire, marble, sky |
| `fractalnoise-fix.jpg` | **the fix** at the export's own size (plate 1): this branch's kernel against a COPY of the pile's (in the probe only, never registered), Scale 16 / 40 / 100 with 6 octaves and the defaults, a 270 px crop at 1:1 and a 90 px crop at 3x without smoothing |

The probe also returns, for the defaults and for Scale 16 / 6 octaves, the grid's step and the octaves drawn at plate 1, 0.5 and 0.28
(`FM._fractalNoisePlan`), and the slowest rows in ms.

## Questions for Ezra
1. **Evolution's motion**: the pile's (kept) slides each layer of detail at its own speed, so the texture drifts diagonally as it churns
   — smoke on the wind. After Effects' Evolution instead churns the shapes **in place** without travelling. Keep the drift, add "churn in
   place" as a choice (a third noise dimension, about twice the cost), or switch to churn only? Recommended: add it as a choice, churn as
   the default — it is what "evolution" means in every other app.
2. **Ridged**: built as the ridged-noise standard (thin bright ridges, broad dark valleys). The pile's version was Turbulent's exact
   negative. Keep the built one? (Recommended.)
3. **The default look**: white-on-black noise that replaces the layer (Normal, Amount 100 %), or Overlay at 70 % so it reads as a texture
   on whatever it is put on? Recommended: keep Normal — the browser tile and a new layer show the noise itself; Overlay is one tap away.

## What prove.sh checks (`…/scratchpad/agents/pile-fractalnoise/prove.sh` → `prove-result.txt`) — WRITTEN, NOT RUN
1. It will not start (and stops between stages) inside a ship, a lock run or a live API builder without a helper slot (gapcheck.sh).
2. `node --check` on the three changed js, tests.js parses, the probe parses as an async body; no CRLF, `git diff --check`, no mode change;
   the kernel's step line is where 3c expects it.
3. The seven new tests (runb.js): each FAILS on 85b71929's js naming the missing effect (not a TypeError) and PASSES here; 3b the plate
   test with the bound forced to −1, for the numbers (and the fix test's own swing / ratio numbers); **3c, the fix proved**: the pile's
   `Math.max(1, Math.max(W, H) / 320)` put back as the step in a COPY of this branch's js — the fix test must FAIL on the finest octave.
4. Clouds, Starfield (482 11.3 / 11.4, 986 C7, 690 Clouds, the twinkle test), Clarity's row check, queue 264, 784, inert, visible,
   zero-means-zero, 793, E1, 745, 913.8 on both trees with this tests.js — the same verdicts (`ZOOM=1` adds 913.5); 5. the ORIGINAL E1 and
   745 on this js — they fail (why edited); 6. the schema fingerprint of both trees; 7. `treecheck.py 85b71929 HEAD`, `drops.py 85b71929 HEAD`.

## Unsure / worth a second look
- **Nothing ran.** Every expected number is hand arithmetic from the noise's own statistics (lattice values uniform, smoothstep
  interpolation: σ ≈ 0.21 for one octave). If a test is red on its first run, read its numbers before touching the kernel. The least sure:
  Turbulent's minima-vs-maxima sharpness (by hand ~4, bound 2) and the fix test's swing ratio (by hand ~1.9, bound 1.4).
- **Cost, unmeasured.** At the defaults the grid is ~600 k samples x 4 octaves on a 1080 x 1350 export or desktop preview (the pile:
  ~82 k), and on the 0.28 phone plate ~114 k (the pile ~82 k — about the same). At Scale 16 every pixel of every plate is sampled.
  `FN_PER_CELL` is the knob: 4 would quarter the samples at the cost of faint straight-line facets on one or two octaves at high Contrast.
  Time a phone frame at the defaults and at Scale 16 / 6 octaves before shipping.
- The lattice is anchored to the plate's corner, as Clouds' is — fine for the comp-sized plates every route uses today (913.5's zoomed slice
  included); a route that handed the kernel a cropped plate would shift it, which is why it stays out of CROP_FX.
- `B38_PLATE_TOL` = 8 is a guess; Turbulent with six octaves at 150 % is the case most likely to need more.
- The pile commit `fcda7fd2` has to be marked DROPPED in the land list when this lands.
