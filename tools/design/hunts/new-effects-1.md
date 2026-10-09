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
