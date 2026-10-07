# H39: make "every effect does something visible at its own defaults" cover CANVAS_FX

Base `origin/main` 2e3fd7a9 (v17.25). Plan plus a tested patch (`482-canvasfx-defaults.patch`, tests/tests.js only, +67 lines, applies clean with `git apply` on main). Nothing under js/ is changed. Labels: **Verified** = read in the code at the line given; **Measured** = run in my container (Chromium 141 headless, software GL, 1280 and 380 px); **Guess** = not run.

## 1. The hole (Verified)
- The test is `482: every effect does something visible at its own defaults` (tests/tests.js:75286). It walks `R.all()` and keeps only effects that have a kernel in `FM._pixelFx` (tests.js:75344, `if (!P[fx.type] ...) return`), then `FM._warpFx` (tests.js:75369). The control (`all.length < 90`, `warpSwept < 15`) says nothing about a third table.
- `FM._FX_TABLES.CANVAS_FX` (js/compositor.js:12534, exported at compositor.js:17808) holds **41** effects: the eight movers Wiggle, Shake, Swing, Spin, Pulse, Drift, Orbit (the "Move" category, defaults at compositor.js:1092, 1109, 1125, 1127, 1136, 1143, 1148) and Particles (:1399); the repeaters Trail, Scatter Array, Tiles; 15 3D solids and Page Curl, Card Flip, Depth Push; Vignette, Halation, Liquid Glass, Squircle Corners, Directional Blur, Speed Lines, Snow & Rain, Time Warp Scan, Frame Stutter, Motion Blur (Footage), Temporal Denoise, Light Wrap.
- None of them has a kernel in either table walked above, so a mover registered with `def: 0` for its only active parameter passes the sweep. **Measured:** with Spin's Speed default set to 0 (compositor.js:1128), then Drift X, Wiggle Amount, Pulse Amount, Swing Angle, Orbit Radius and Shake Amount each set to 0 in turn, the existing test stayed **green all 7 times**.

## 2. How to drive a canvas kernel at its defaults (Verified, then Measured)
A canvas kernel is not callable like the other two tables. `drawCanvasEffect` (compositor.js:11765) builds a plate pair, finds the layer's bounding box and only then calls `fn(_cfA, bctx, W, H, bbox, params, t, FM.fxLocalTime(layer, t), layer, ps, expand, scene)` (compositor.js:11828); an empty bbox skips the call (`else bctx.drawImage(_cfA, 0, 0)`), and the kernels need `t`, the local time and the layer. Faking those arguments would test the harness. So **drive it through the real render path**, as the Spin test (tests.js, "690 a Spin added at the start…") already does:
1. one shape layer (`FM.makeLayer('shape', {shape:'rect', x:540, y:960, shapeW:540, shapeH:540, fill:'#ffffff', start:0, duration:6})`) with `effects = [FM.fxRegistry.makeInstance(type)]` (the registry's own defaults, the state he sees when he taps it);
2. `FM.renderScene(g, {project, layers, selectedId:null, selectedIds:[]}, t)` onto a 270x480 plate (`__fmRS = 0.25`, `__fmCrop = true`), the same on the same layer with `effects = []`;
3. count pixels where any channel differs by more than 24.

## 3. What "visible" means for a mover (the decision)
**At some t in a spread of moments, at least 100 of the 129,600 plate pixels differ from the un-moved picture by more than 24.** Reasons, all Measured:
- **t = 0 alone is wrong.** At t = 0 Spin, Swing, Pulse and Drift differ by **0 pixels** (they are where they started), and Particles by 0 (nothing emitted yet). A t = 0 check would flag four healthy movers.
- **The moments must not be multiples of a default period.** The list `0, 0.13, 0.29, 0.5, 0.71, 0.97, 1.3, 1.7, 2.1, 2.6, 3.1, 3.7, 4.3, 5.0` (s) hits every mover; the first moment that passes ends the search, so the test costs **1.4 s** for all 41 (Measured, 1280 and 380).
- **Floor 100.** The weakest healthy effects measured: Motion Blur (Footage) 272, Particles 379, Snow & Rain 698 (172 on the full-frame subject), Liquid Glass 529. Anything dead measures 0. A floor between them leaves room both ways.

## 4. Four things the sweep must know, each one cost me a false "dead" while measuring (Measured)
1. **Layer order: `layers[0]` is the TOP layer.** Light Wrap wraps the layers *under* the layer; I first put the backdrop first and measured 0, which looked like a dead effect and was my scene. Use `[effectLayer, backdrop]`. `BG_SNAP_FX` (compositor.js:15156) lists the effects that need a backdrop (only `lightwrap` is in CANVAS_FX), so the test reads that table instead of naming it.
2. **A subject that cannot show the effect.** Vignette is 0 on a 540 px box in the middle of a 1080x1920 frame (the box never reaches the darkened rim) and 78,938 on a full-frame layer; Speed Lines 87 on the box and 10,927 full-frame; Halation 0 on a mid-tone box or a flat full-frame light layer and 4,812 on a white box. So the test tries two subjects, a **white box** then a **full-frame light layer**, and passes on the best.
3. **History effects need a moving subject and the same layer object each frame.** Temporal Denoise, Frame Stutter and Motion Blur (Footage) read the previous frame, cached per layer id (compositor.js:12723, 13177, 13224; `FM.resetMotionFlowCache`, :12253). They measure 0 on a still box (correctly) and 1,066 / 4,348 / 272 on a box moving 250 to 830 px in 1 s rendered in order, **but only if the same layer object is rendered every frame**: my first version built a fresh layer (new id) per frame and read 0 for two of them, which would have shipped a red test over healthy effects.
4. **The test iterates `Object.keys(CANVAS_FX)`, not a list**, so a mover added next month is covered without anyone remembering. The control requires at least 35 swept and names the eight movers, so the table cannot empty or lose one silently.

## 5. Which existing movers would fail today (Measured)
**None.** All 41 pass, at 1280 and at 380. Best pixel counts (white box / full-frame, over the 14 moments), movers first:

| mover | white box | full-frame | first moment ≥ 100 |
|---|---|---|---|
| Wiggle | 4,490 | 5,674 | 0.13 s region (t=0: 2,148) |
| Shake | 9,876 | 9,014 | t = 0 already moves (5,942) |
| Swing | 7,195 | 31,052 | 0.13 s (t=0: 0) |
| Spin | 6,939 | 56,844 | 0.13 s (t=0: 0) |
| Pulse | 8,447 | 46,656 | 0.13 s (t=0: 0) |
| Drift | 26,928 | 72,718 | 0.13 s (t=0: 0) |
| Orbit | 7,967 | 11,379 | t = 0 already moves (5,712) |
| Particles | 379 | 351 | 1.7 s (t=0: 0) |

The weakest in the whole table: Motion Blur (Footage) 272 (moving subject only), Particles 379 / 351, Liquid Glass 529 / 749, Snow & Rain 698 / 172, Time Warp Scan 1,350. Everything else is above 1,000. The complete 41-row table is in the test's own failure message format if any ever goes quiet (it prints label, best count, subject and moment).

## 6. Proof the new test goes red where the old one is blind (Measured, 1280)
Each row: one default set to 0 in a scratch copy of js/compositor.js, then the old test and the new test run alone (`?only=`); the file was restored with `git checkout` after each.

| mutation (default → 0) | old `482: every effect does something…` | new test |
|---|---|---|
| Spin Speed 90 | green | **red**: `Spin (best 0 px changed)` |
| Drift Speed X 120 | green | **red**: `Drift (best 0 px changed)` |
| Wiggle Amount 40 | green | **red**: `Wiggle (best 0 px changed)` |
| Pulse Amount 0.2 | green | **red**: `Pulse (best 0 px changed)` |
| Swing Angle 15 | green | **red**: `Swing (best 0 px changed)` |
| Orbit Radius 80 | green | **red**: `Orbit (best 0 px changed)` |
| Shake Amount 120 | green | green (see below) |

Shake stays green with Amount at 0 because Shake's other defaults (Twist 10°, Speed 14 Hz, compositor.js:1110-1112) still move the picture, so its default is not "on and does nothing". That is correct behaviour, not a hole; to catch a dead Shake you would zero Twist as well (not run).

## 7. The patch
`tools/design/plans/482-canvasfx-defaults.patch`: one new test, `482: every canvas effect (movers, repeaters, 3D solids) does something visible at its own defaults`, inserted straight after the existing 482 sweep (after the Electric Edges control, tests.js:75447 on main). It has its own comment block, so the reasons in sections 3 and 4 live next to the code. Apply with `git apply tools/design/plans/482-canvasfx-defaults.patch`.
- **Measured:** green on main alone at 1280 and 380 (1.4 s each); red under the six mutations above; `git apply --check` clean on a fresh worktree of origin/main.
- **Not run:** the whole suite with the new test in it, and the other 482 tests. I ran only the new test and the old sweep, alone.

## 8. Shipping notes for whoever builds it
- `tools/prove.sh` wants every changed test to FAIL against HEAD's source. This test passes on HEAD by design (nothing is broken today), so the release line needs the visible **`UNPROVABLE: new sweep over unchanged source; red under mutations of Spin/Drift/Wiggle/Pulse/Swing/Orbit defaults`** wording, or run `tools/mutate.sh js/compositor.js "<old>" "<new>" "482: every canvas effect"` for one of the rows above and quote it. (Guess: that is how the gate reads it; I did not run ship.sh.)
- The test is deliberately **not** a ranking: the floor is a silence floor. Do not tighten it when a gentle new effect scores low; add a subject to `SUBJECTS` if the effect needs a different picture to act on, as Light Wrap, Halation and the history three do.
- A new canvas effect that needs something the three subjects do not give (a backdrop, a second layer, a camera) will go red with its label and best count; the fix is a named recipe next to `BACKING`, with the reason, not a lower floor.
