# PF2: stacked Glows as separate draws

Branch `hunt/perf-glow`, based on main v17.33. Labels: **Measured** = ran it, **Read** = read the code, **Guess** = not verified.

## Result in one paragraph
A layer with N Glow passes is drawn through ONE `ctx.filter` list with N `drop-shadow()` stages, and Chrome's cost for that list grows roughly with the cube of N. Drawing the same N stages as N single-filter draws is linear and gives the same picture. It is in `js/compositor.js` (`drawGlowSplit`, called from `drawLayer` just before the old `ctx.filter = effectFilter(...)` line), with no setting. The old one-list path stays as the fallback for every case it does not cover. **Measured:** 16 glows on a shape went from 3.5 s to 0.33 s per frame, on a photo from 34.7 s to 0.45 s, 20 glows on text from 10.7 s to 0.30 s, and 100 layers with 20 glows each now draw a phone-size frame in 2.3 s.

## What changed in the picture: nothing you can see
Compared against the old one-list filter with `FM._glowSplitOff` (the suite's control, not a setting), on a 605 x 1075 canvas, 4 to 20 glows:

| case | result |
|---|---|
| text and shape, in the middle, at the edge, hanging half off the frame, N = 2, 4, 8, 16 | **0 differing bytes** everywhere, except a shape that touches the frame edge: up to 10 of 255 on under 150 pixels (0.02 % of the frame) |
| photo (a media layer), centre and filling the frame, N = 4, 8, 16 | up to 5 of 255 on about 1,100 pixels at most (0.17 %), rounding between stages; never over 8 |
| N = 20 text and shape, 3 layers x 20 glows | 0 differing bytes |
| with the layer's Shadow and an opacity, a Hue Shift and a Blur after the glows, a Blur before them, a shape wholly off the frame whose light reaches in | 0 differing bytes in the test's cases (`PF2 a stack of Glows…`) |

The chain itself is deterministic (two renders, 0 differing bytes), so these are real differences, not noise. The residual on a shape that touches the frame is not a padding problem: raising the padding from 2 to 5 reaches did not change it (Measured).

Three things the first prototype got wrong, found by comparing and fixed (each is now in the test and was mutation-caught):
- **A plate the size of the frame loses light that left the frame and would have come back** (4,482 to 14,461 bytes up to 255 on a full-frame shape; my PF1 note predicted it). The plate now grows only on the sides where the content is closer to the edge than the stack's reach, by that reach. Stacked stages spread in quadrature (N stages of radius r reach like r x sqrt(N)), so the pad is 3 x sqrt(sum of r squared), not 3 x N x r; with the linear sum the 16-glow photo needed a 13x plate and gave up.
- **Opacity is applied BEFORE the filter list, not after** (Measured in `order2.js`: blit at the opacity differs by up to 103 of 255 on 62,000 pixels; baking the opacity into the plate matches at 0). So the layer draws into the plate at its own opacity and the final blit is at 1.
- **The Shadow is cast from the filtered result** (Measured in `order.js`), so it is applied on the final blit, and the whole padded plate is blitted so a Shadow can pull spilled light back in. A shape wholly off the frame still lights it: the layer's own box (`layerAABB`) says how far it overhangs.

## Where it does NOT run (these draw exactly as before, through the one-list filter)
- fewer than 2 glow stages (nothing to gain: 1 stage is the same cost)
- a vector mask on the layer, Copy Background, a colour grade with hue or saturation, any camera in the scene (a camera moves what the layer's own box says)
- glows that are not one run among the CSS effects (a Blur between two Glows)
- a padded plate that would be more than 9x the frame's area
- the frame-filling photo with 16+ glows at a supersampled 1.89x canvas used to be this last case; with the quadrature reach it now runs (34.7 s to 0.59 s).

## Speed (Measured, flushed with a readback, 605 x 1075 canvas, ms per frame)
| glows | text one-list / separate | shape | photo (centre) |
|---|---|---|---|
| 1 | 19 / 17 | 15 / 15 | 18 / 18 |
| 4 | 126 / 62 | 118 / 57 | 198 / 91 |
| 8 | 512 / 126 | 535 / 108 | 1,104 / 156 |
| 16 | 3,434 / 362 | 3,515 / 333 | 34,698 / 454 |
| 20 | 10,734 / 300 | 10,774 / 255 | not run |

Photo, filling the frame (padded plate): 8 glows 1,067 / 229, 16 glows 34,371 / 589.
Layers: 3 layers x 20 glows 4,343 / 172 ms with 0 differing bytes; 10 layers x 20: 618 ms separate (one-list not run, about 108 s by extrapolation, **Guess**); **100 layers x 20 glows: 2,326 ms separate** at phone size. That is the freeze PF1 could not finish.
Cost at 1 stage is the same, so nothing gets slower.

## Proof
- **Test** `PF2 a stack of Glows never puts more than one drop-shadow in a filter list, draws the same picture as the one-list filter, and is faster` (tests/tests.js): RED on main (`a filter list held 4 drop-shadows`, and the same for every case) at 1280 and 380, GREEN with the change at 1280 and 380. It checks three things: no `ctx.filter` assignment holds more than one `drop-shadow(`; 24 text and shape cases (12 set-ups x 4 and 8 glows) (edge, off-frame, Shadow, opacity, effects before and after) match the one-list picture within 16 of 255 on 0.1 % of the frame; and 12 glows are at least 40 % faster as a ratio on the machine running it (measured 79 % faster at 8 glows and 90 % at 16).
- **Pinned pictures:** the 482 slice is 112/115 at 1280 and 380, with the same three reds as main (`482 2.6 Motion Blur (Object)`, `482 3.0 Echo and Reverb`, `482 6.7 Glow Scan`). The `Glow` slice is 23/23 with the change and 22/23 on main (the PF2 test). The `effects:` slice is 137/138 at 1280 and 380 on both, the same red on both (`effects: the Favourites browser sorts by recency, type and A-Z, each invertible`). Results are in `perf-glow-scripts/results/`.
- **Mutations**, `tools/mutate.sh --only` against the PF2 test: never split (`GLOW_SPLIT_MIN` 99) CAUGHT; no padding (`GLOW_REACH` 0) CAUGHT (shape at the edge 24 to 35 of 255 on about 3,000 pixels); post-glow effects dropped CAUGHT; opacity applied after CAUGHT; Shadow dropped CAUGHT; off-frame early exit CAUGHT. One mutation SURVIVED and the code it mutated was removed: a "Blur before the glows widens the reach" term. Measured: with it out, the picture still matches (max 1 of 255), because a blurred layer that spills into the frame is seen by the plate's own readback. Dead code, deleted (`pf2_mut.log`, `pf2_mut2.log`).

## Not covered
- A phone. Everything was measured in a headless Chrome here; the ratio will hold on a phone, the seconds will not.
- Export at 1080 x 1920 with 16 stacked glows near the frame edge: the plate can be up to 9x the frame (about 18 M pixels x two canvases), which I did not measure for memory. The cap is a constant (`GLOW_SPLIT_MAX_AREA`).
- The Glow effect on a layer with a camera in the scene (falls back to the one-list filter).
- The GPU fallback path for devices where `ctx.filter` does nothing: untouched.

## Not changed
No look. The one-list filter is still what draws every case listed under "Where it does NOT run".
Files: `js/compositor.js`, `index.html` (`compositor.js?v=213`), `tests/tests.js`, this report and `perf-glow-scripts/`.
