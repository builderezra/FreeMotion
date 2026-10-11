# E1: six new effects for beginners and CapCut users (`hunt/new-effects-1`)

Against `origin/main` 29a5faff (v17.33). **Measured** = I ran it (headless Chromium on Linux, 1280 and 380), **Read** = read the code, **Guess** = not checked. Nothing is merged to main. The picture sheet is the deliverable for Ezra's look before shipping: `tools/design/plans/new-effects-1/sheet.jpg` (1316 x 2070, 360 KB).

## What was built

All six are registered rows in `FM.EFFECTS`, post-fx routed, in a category menu, findable by what a beginner types (`SEARCH_ALIASES`), and have a one-line description.

| effect | menu | what it does | main controls |
|---|---|---|---|
| Colour Cycle (`huecycle`) | Colour | the hue turns round over time (CSS `hue-rotate` matrix) or steps through N colours | Speed, Phase, Style, Steps, Boost |
| Soften Skin (`softskin`) | Blur | edge-keeping smoothing, optionally only on skin tones | Amount, Radius, Keep detail, Only skin |
| Oil Paint (`oilpaint`) | Stylize | Kuwahara painting filter, transparent pixels left alone | Radius, Detail, Punch |
| Glitter (`glitter`) | Stylize | twinkling stars on the bright parts only, deterministic from a hash grid | Spacing, Size, Threshold, Speed, Points, Colour |
| Censor (`censor`) | Blur | pixelate, blur or black out one box or oval that can be keyframed | Style, Shape, Centre X/Y, Width, Height, Strength, Soft edge |
| Pop Art (`popart`) | Colour | 2x2 or 3x3 grid, each cell recoloured (hue shifts, duotone or posterised) | Layout, Style, Gap |

Skipped on purpose: the mover effects (shake, zoom pulse, spin) because the Wiggle/Shake/Pulse family from #482 2.0 already covers what a beginner means by them.

## Proof

- **No existing look changed (Measured).** 410 renders (the 205 existing effects, each on a photo and on text) are hash-identical on main and on this branch: 0 differ (`results/allfx_main.json` vs `results/allfx_e1.json`, `scripts/allfx.js`).
- **Eight E1 tests, green at 1280 and 380 (Measured).** Registry/menus/aliases; one test each for the six effects; and "preview equals export", which draws each effect through the real compositor at 320 wide (plate scale 1) and 160 wide (scale 0.5) and compares the small one with the big one shrunk (full frame mean <= 5 levels, <= 1.2% of pixels off by more than 40, and a second metric over only the pixels the effect touched), then checks the same instant draws the same after another time was rendered in between.
- **Mutations (Measured, `results/e1_mut*.log`)**: hue matrix sign, skin mask dropped, oil paint recolouring transparent pixels, glitter bar removed, censor mask removed, pop art same hue on every cell, fast-bbox slack back in for pop art: all CAUGHT. Glitter ignoring the plate scale is CAUGHT by the touched-pixel metric (29.5 levels against 16.7 correct, threshold 22). **Censor ignoring the plate scale is CAUGHT only by the kernel test** ("at half size the pixelate has 3 blocks across the box where full size has 6"), not by the compositor test: through the compositor on a flat shape or on text over transparent pixels, Pixelate only recolours inside the layer's own alpha, so the same-colour content gives no signal. I tried a stroked text layer and it still did not show. So the compositor test skips the "changes something" check for censor and Soften Skin (flat colour has nothing to hide or smooth); both are covered by the kernel tests and by the existing `482: every effect does something visible at its own defaults` on a photo.
- **Neighbours (Measured, 1280, `results/fin_*` vs `results/main_*`)**: `921 S1` 24/24; `registry` 5/5; `featured` 4/4; `745`, `913.8`, `AI` 9/9, `482: every effect does something visible` (also at 380) green; `effects:` 137/138 and `thumb` 9/11 and `filter` 83/85 (2 not run here) are **identical on main**, same test names (Favourites browser `appendChild`; thumbnail pin 658; export 690 `encode`).

## Things this branch had to touch outside the effects

1. **`E1` grew the registry from 205 to 211 effects, which re-rolled the 300-round `921 S1 convergence fuzz`.** Its fixture picks effects with `reg[(start + i) % reg.length]`, so a longer registry produced a different scenario and the fuzz went red. I froze the fixture to `.slice(0, 205)` and added a `?seed=` seam so I could try other seeds.
2. **That fuzz is fragile on main itself (Measured, a finding for a follow-up hunt).** I ran 36 other seeds on main: **7 fail (23, 28, 30, 32, 38, 39, 43), about 19%**. The pinned seed 20260923 passes only by chance. Failure shapes: a `layers/N/parent` mismatch between a guest and the host; an owner live tree with 21 layers against the host base's 20. After the freeze, seeds 28, 23, 39, 43 still fail the same way as on main; seed 30 passes here and fails on main (not explained). Nothing in this branch is the cause; it is a convergence bug (Guess: parent re-pointing when a layer is deleted during an epoch change) that the pinned seed happens not to reach.
3. **The collab schema fingerprint moved** (category is hashed): `C.SCHEMA_REV` 8 to 9 and `C.SCHEMA_FP` 838238482221358, printed by `921 S1 the schema fingerprint gate`. Two older tests were adjusted: 745 no longer requires `lensdistort` in the featured twelve, and 913.8 now expects `popart` first and `weather` within the first seven.
4. **Pop Art, Censor and Glitter use the exact alpha bbox, like Tiles** (`alphaBBoxFast` has about 12 plate px of slack, which moved the grid by half a cell at half size: 5.8 levels mean in Pop Art, 0.5 with the exact one).

## For INT1 and for whoever lands this (buster and REV collisions, Measured by reading the other branches' `index.html`)

| file | this branch | collides with |
|---|---|---|
| `js/compositor.js` | `?v=213` | `hunt/perf-glow` (213) |
| `js/fx-registry.js` | `?v=25.32` | `hunt/param-aliases` (25.32) |
| `js/collab-core.js` | `?v=24` and `SCHEMA_REV` 9 | P25's patch also takes REV 9 |

Landed together they need distinct numbers; `plans/helper-plans-26-scripts/buster_table.py` lists them. The fingerprint value depends on the effect list, so **re-pin `SCHEMA_FP` after merging anything else that adds an effect, a category or a param**.

## Performance (Measured, 1080 x 1920, after a flush)

Colour Cycle 27 ms, Glitter 22 ms, Pop Art 60 ms, Censor 95 ms, Oil Paint about 0.3 s, Soften Skin about 0.4 s. Oil Paint and Soften Skin are the two heavy ones; both run in strips and neither allocates per pixel, but on a phone they are export-grade, not live-scrub-grade (Guess: a phone is several times slower than this container).

## Honest limits

- **Soften Skin is subtle at its defaults on photos** (max change 8 levels on the dog photo, nearly invisible on the sheet). It passes the "does something at defaults" test on a photo, but the dog is not a face. **Someone needs to judge it on a real portrait before it ships**, and the default Amount may want to go up.
- The sheet shows each effect on a photo, text and a shape at three settings. Colour Cycle, Oil Paint, Glitter, Censor and Pop Art read clearly; Soften Skin barely changes, which is the note above.
- Glitter is deterministic (integer hash, no `Math.random`) and anchored to the layer's bounds, so a seek lands on the same frame as playing to it (tested).

## Scripts and results

`tools/design/plans/new-effects-1/scripts/` (`sheet.js` renders the sheet, `allfx.js` the 410-render comparison, `perf.js`, `quick.js`, mutation drivers `e1_mut*.sh`, `e1_final.sh`) and `results/` (hash tables, mutation logs, slice results).

## ⚠️ Found afterwards (P28 dry run of #1068's batches): Oil Paint collides with ChatGPT's B6

`tools/design/chatgpt-tasks/pile/LAND-LIST.md` B6 includes commit `3728d6f5` "Add Oil Paint stylize effect", and it registers **the same effect id, `oilpaint`** (category `stylize`), as this branch's Oil Paint. Landing both would register one type twice (a second Oil Paint row, and one of the two kernels silently wins). B6 also adds a `cartoon`, `lensmagnifier`, `circlearray`, `laserbeam`, `fractalnoise`, `gradientwipe`, `venetianblinds`, `radiowaves`, `titlewarp`, `odometer`, `spillsuppressor`, `deflicker` and `autograde`; none of those ids is in this branch, so Oil Paint is the only id clash (Measured: ids read from each commit's `fx-registry.js` diff against this branch's six). Decision for whoever lands second: keep one Oil Paint. This branch's one is tested at the kernel and through the compositor (preview equals export) and is hash-neutral to the 205 existing effects; B6's has never run in a browser (LAND-LIST says so for its tests). If B6's wins, drop `oilpaint` from this branch's `E1_ROWS`, `PIXEL_FX.oilpaint`, `fx-registry.js` and the E1 Oil Paint test and keep the other five. Both branches also add a block just before `FM._FX_TABLES` in `compositor.js` and a new batch in `fx-registry.js`, so they conflict textually in those two places whatever is decided.

## E2: two looks for Ezra (sheets: `tools/design/plans/new-effects-1/oil-compare.jpg` and `softskin.jpg`, each about half as tall as wide)

### A bug the Soften Skin sheet found in my own E1 effect (fixed here)
The first sheet render showed the "stronger" settings changing LESS than the default (cat mean change 0.6 at Keep detail 10, against 2.3 at 40). **Keep detail ran the wrong way**: the edge threshold was `4 + keep * 0.9`, so a higher Keep detail smoothed MORE pixels. Measured on an 8 px checker of 40-level contrast, radius 6, Amount 1: variance 400 in, **400 at Keep 0 (untouched), 33 at Keep 100 (flattened)**. The E1 tests never checked the direction (they pinned a hard edge at 40 and a noisy patch). Fix: `4 + (100 - keep) * 0.9`, and the default Keep detail becomes **60** so today's default picture is byte-identical to what the E1 sheet showed (40 in the old formula = 60 in the new). New assertion in the E1 Soften Skin test (red before: 400 / 400 / 33; green after, at 1280 and 380). Because the default value is part of the schema fingerprint, `SCHEMA_FP` is re-pinned to 5698315735221935 (REV stays 9: E1 has not landed). Re-landers: pin once, after everything else that adds an effect.

### Oil Paint, side by side (pick ONE)
Same photo, text and shape pixels through both kernels at project size, three settings each. Mine is the Kuwahara (this branch); B6 is ChatGPT's `3728d6f5` (summed-area tables, four or eight sectors, edge sharpness, optional colour levels, Mix).
- **Look (Read off the sheet):** mine gives rounder, more even daubs, keeps text and shape interiors clean, and has Richer colour to push the palette; B6 shows small white specks inside the letters at Brush 3 and 6 and a blocky smear on the photo at Brush 12 / Edge sharpness 100, but offers Mix, Colour levels and eight brush directions, which mine does not.
- **Speed (Measured here, one run each, noisy):** at 300x300 mine 30 ms, B6 16 ms; at 540x960 150 against 95 ms; at 1080x1920 **775 against 250 ms** (B6 samples every second pixel above 50,000 px). Phones are slower than this container (Guess).
- **Test coverage:** mine is proven (kernel tests, preview equals export, mutations); B6's test "has never run in a browser" per the land list and I did not run it.
- **My lean:** pick by look; if speed matters more, B6's summed-area approach is the cheaper design, and its specks in text are the thing to fix before landing it. Either way keep ONE `oilpaint` id (see the collision note above).

### Soften Skin on the most face-like picture in the repo
**There is no human face in the repo** (I looked through `fx-art`, the launch art and `tools/design`; the only skin-adjacent picture is the cat in `fx-art/cat.jpg`, which an earlier sheet already used as a skin stand-in because the ginger coat is inside the skin-tone range). The sheet shows the cat's face at 2.7x and a drawn, noisy skin patch with spots and a crease (labelled as synthetic) at: the defaults (Everything and Skin tones only) and two stronger settings. Measured mean change per channel over the crop (cat / synthetic patch): defaults 2.3 / 3.7; **A (0.85, 10 px, keep 50, Skin tones) 1.8 / 5.8; B (1.0, 14 px, keep 35, Skin tones) 2.7 / 7.2**, max 17. Spots and the crease survive A and begin to fade at B.
- **Proposed default (NOT applied, needs his yes because it moves the schema fingerprint again): Amount 0.85, Smoothing size 10 px, Keep detail 50, Soften: Everything** (A, but with Everything so it works without a skin match; he can flip it to Skin tones). The current 0.6 / 6 / 60 is almost invisible on a real photo, which is what he saw on the first sheet.
- **Cost (Measured, noisy):** 574 ms at 1080x1920 for Soften Skin, so it is an export-grade effect on a phone, not a live-scrub one.
- **Still unproven:** on a real human face. The numbers above are on a cat and a drawn patch.
