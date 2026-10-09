# AU12 compositor: preview equals export, 20 most-used effects

Branch `hunt/audit-compositor`. Claims are labelled Measured / Read / Guess.

## What was run
Probe: a 320x240 textured image layer (gradient, two shapes, 4 px black stripes), one effect at its **defaults**, t = 0.5, through `FM.renderScene` into offscreen canvases. Scripts and raw numbers are in `audit-compositor-scripts/` (`au12_all.js` scans all 178 effects, `au12_all.json` is its output, `au12_hyp.js` the follow-ups, `au12_sheet.png` a picture sheet).

**Which 20:** my judgement, there is no usage telemetry in the repo (Guess): blur, glow, dropshadow, vignette, brightness, contrast, saturate, hue, grayscale, invert, rgbsplit, pixelate, filmgrain, sharpen, wave, glitch, zoomblur, tiltshift, chromaticaberration, tint.

## Jitter and path equality (Measured)
- **Jitter is 0.** Two identical renders are byte-identical for all 178 effects, so the tolerance is not set by noise.
- **Preview path vs export path at the same scale** (`__fmRS` = 1, `_exporting` false vs true): byte-identical for all 178 effects (MAD 0, 0 % of pixels past 8). Image layers only. **Not run:** video layers (the hold-frame path), `_exporting` with a real exporter, audio.

## Tolerance (Measured)
The phone preview draws on a smaller plate (RS 0.75 / 0.5 / 0.25), so the real comparison is "small plate" against "export plate scaled down". Even a pure per-pixel effect differs there, from resampling alone. The floor, taken from the pure per-pixel effects (brightness, contrast, saturate, hue, grayscale, invert, tint, gamma, sepia, posterize):

| RS | max MAD | max % of pixels with a channel diff > 8 |
|---|---|---|
| 0.75 | 2.01 | 12.1 |
| 0.5 | 2.20 | 13.0 |
| 0.25 | 4.21 | 24.4 |

Threshold used: 2x the floor, i.e. flagged at RS 0.5 when MAD > 4.4 or > 26 % of pixels.

## The 20 at RS 0.5 (MAD / % pixels > 8; 0.75 in brackets)
blur 2.7/1.4 (0.5/0), glow 0/0 (0.5/0.2), dropshadow 0/0 (0.5/0.2), vignette 0.2/0 (0.5/0.1), brightness 0.5/2.5, contrast 1.0/5.7, saturate 0.2/0.3, hue 0.2/0, grayscale 0.1/0, invert 0.7/0, rgbsplit 0.0/0, pixelate 1.7/3.0, filmgrain 0.1/0.04 (2.9/4.8), tint 0.1/0, zoomblur 3.2/20 (2.5/12), chromaticaberration 3.2/16 (2.9/16), **sharpen 10.3/19 (5.9/14)**, **wave 5.2/11 (4.0/10)**, **glitch 30.4/73 (23.9/55)**, **tiltshift 10.0/58.7 (4.7/32)**.

Honest caveats: glow and dropshadow read 0 at RS 0.5, which means that at their defaults on this image they changed nothing visible (Read from the numbers, Guess as to why), so the pair is not exercised; they need a probe with non-default strength. zoomblur and chromaticaberration are inside the 2x floor on MAD but at 16 to 20 % of pixels, so I call them borderline, not fine.

## Result for the 20: what differs beyond the floor and why
1. **tiltshift: a real bug, fixed here.** Read: `tsR = Math.max(1, Math.round(8 * tsAmt))` is a fixed 8 plate px, not scaled by plate scale, so a half-scale preview blurs ~2x as much as the export (in project terms). Fix: `tsR = ...Math.round(8 * tsAmt * tsPs)` with `tsPs = arguments[5]` (arity stays 5, bounds pad uses `tsR` so it follows). Measured after: 10.0 -> 0.98 MAD and 58.7 % -> 0 % at RS 0.5, 4.7 -> 0.6 at RS 0.75; blur 0.25x at 0.5: 6.9/27.8 -> 1.26/6.1. RS 1 output is unchanged byte for byte (control in the test, and the neighbouring `692`, `904`, `Tilt` slices are green).
2. **sharpen: inherent (Read).** The radius is an integer, so radius 1 at half scale still rounds to 1 plate px = 2 project px. Not fixable without changing the algorithm; radius 2 and 4 still differ (5.7 and 6.2 MAD).
3. **wave: probably inherent (Guess).** The wavelength is scaled by `ps` correctly (Read); the remaining difference looks like warp resampling. Borderline at 0.75.
4. **glitch: partly a real bug, found and NOT fixed on this branch.** The slice shift scales with the plate width, but the RGB fringe `cs = round(amt * 9 * split)` is a fixed plate-px count (Read), so the preview fringe is 2x as wide at RS 0.5. Measured: with the fringe scaled, the default drops from 30.4/73 % to 22.2/48.7 % at RS 0.5, and with slice counts that divide the plate (bands 12/10/2) from 24 to 7.1/7.4/7.7 MAD. The rest (about 22 MAD at the default) is whole-pixel slice offsets on a stripe texture, which is quantisation (Guess; not isolated).
   **Why not shipped:** the fringe change moves pictures that tests pin byte for byte (`482 2.7 Glitch...` and 5 sibling `482` pins, 6 reds, vs 3 reds that are already on main). Those pins say "a look he already has must not move", and it moves only for preview plates below 1. Whether to re-pin is a call for the owner. A ready patch is `audit-compositor-scripts/glitch-fringe-plate-scale.patch` and its test is `AU12-2-glitch-fringe.test.js` (red on main at both widths, green with the patch, 3 of 3 mutations caught, but it is not in `tests/tests.js` because it would be red without the patch).

## All 178 effects (Measured, scan in `au12_all.json`)
47 of 178 are past the 2x floor at RS 0.5: bend, bulge, contourlines, crt, curl, displacemap, dissolve, dither, dots, edge, electricedges, emboss, fisheye, fractalwarp, glass, glitch, gridrepeat, grunge, halftone, hexarray, hextiles, iridescence, kaleidoscope, lensdistort, mirrortile, nightvision, noise, palettemap, polarcoords, polardisplace, radialrepeat, ripple, scanlines, sharpen, sketch, squeeze, stripes, threshold, tilerotate, tiltshift, tunnel, turbulentdisplace, twirl, unsharpmask, vhstape, voronoi, wave. Most are pixel-structured or warp effects where a small plate cannot match a downscale (Guess). **I did not classify these 27 beyond the 20**; only tiltshift was proven to be a bug.

## Proof for the fix (AU12-1)
- Test `AU12-1 Tilt-Shift blurs a half-scale preview as much as the export, not twice as much`: controls (full-scale preview and export byte-identical; brightness at half scale inside its measured floor), then blur 1x at RS 0.5, 1x at 0.75 and 2x at 0.5 within 2.5 MAD / 5 % of pixels.
- Red on main at 1280 and 380 (`blur 1x at render scale 0.5 is 10.01 MAD / 59.0 %`), green with the fix at both.
- Mutations, all CAUGHT: drop the scaling, hard-code `tsPs=1`, square the scaling.
- Neighbours: `Tilt`, `692`, `904` slices green at 1280 and 380. The `482` slice has the same 3 reds on main and on this branch.
- Cache buster: `compositor.js?v=211` -> `212`.
- The full suite was NOT run (35 minutes); only these slices were.

## Not read
Video hold-frame and `_exporting` paths, per-effect behaviour with non-default params (except where listed), audio, anything outside `compositor.js`'s effect kernels, the render-quality ladder.
