# AU14 the unclassified effects, and video layers

Branch `hunt/audit-compositor-2`, against main fba44ca8 (v17.32). Labels: Measured / Read / Guess. Scripts and raw JSON: `audit-compositor-2-scripts/`. Same 320x240 textured test image as AU12 (`stat.js`).

## Which effects
AU12 listed 47 effects past its floor at render scale 0.5. Four of them it had already classified (glitch, sharpen, tiltshift, wave), which leaves **43** here, not 27 (the PM's count was lower; I did all 43 and say so).

## Method: what the numbers can and cannot tell apart (Measured)
Plain MAD cannot separate "the preview draws something different" from "a half-size plate cannot show the same pixels". So for each effect at RS 0.5 and 0.25 (reference = the RS 1 render scaled down) I took three more numbers:
- **low-frequency MAD**: both pictures averaged in 8x8 (RS 0.5) or 4x4 (RS 0.25) blocks first, so one-pixel structure drops out and only a change in WHERE things are, or how bright they are, remains;
- **gradient energy ratio**: mean absolute neighbour difference, preview over reference (1.0 = the same amount of fine structure);
- the full MAD, for comparison with AU12.

Controls (so the thresholds mean something): the pure per-pixel effects (brightness, contrast, saturate, hue, grayscale, invert, tint, filmgrain) sit at low-freq 0.04 to 0.8 and energy 1.00. **The one AU12 bug I know is real, Tilt Shift, reads low-freq 6.2 and energy 0.85, sharpen 4.3 and 1.49, glitch 9.8 and 1.24**, so a number above about 3 low-frequency or an energy outside 0.8 to 1.25 is "something other than resampling". Both controls and the 43 are in the table at the end.

## Result: no new bug proven among the 43
Each of the 43 falls in one of four classes. The class comes from the number AND from reading the kernel (Read), and I name which.

**A. Warps whose sampling grid is resolution relative, difference is resampling (energy 0.96 to 1.11, low-freq 1.2 to 3.6).** bend, bulge, curl, displacemap, fisheye, fractalwarp, kaleidoscope, lensdistort, polarcoords, polardisplace, radialrepeat, ripple, squeeze, tilerotate, tunnel, turbulentdisplace, twirl, mirrortile, gridrepeat, iridescence, unsharpmask, hexarray. Their lengths are percentages or `unit:'px'` parameters that `pxToPlate` scales (diag.json lists each effect's px parameters). They re-sample the source, and a bilinear sample of a half-size plate cannot equal a downscale of the full-size result around the 4 px stripes in the test image. Borderline on the table: displacemap 3.56, gridrepeat 3.62, mirrortile 3.44, all at RS 0.5; I would not call them bugs without a better probe image (Guess).

**B. Per-pixel hash grain or pattern at the plate's own resolution: preview CANNOT match, whatever the code does.** dissolve, noise, grunge, glass, sketch (its tooth), dither, scanlines, crt, vhstape, nightvision, stripes, dots. Their texture is drawn on plate pixels; at RS 0.5 one plate pixel is two project pixels, so the preview grain is coarser (or a 1 to 2 px line is drawn as one crisp plate pixel while the downscaled reference averages it grey: that is why scanlines, crt and dither have energy 2.3 to 6.9 and low-freq 0.1 to 0.8). The ps-aware ones (dots, stripes, hextiles, halftone, vhstape, nightvision, edge, emboss) multiply their sizes by the plate scale, verified by reading (`halftone`: `size * (ps || 1)`, `hextiles`: `hxSize * (ps || 1)`) and by `diag.js` (the kernel output changes with its plate-scale argument); the non-ps ones either have a `unit:'px'` size parameter scaled for them or have no size at all. A finer-than-plate preview is impossible, so this is inherent. A fix that is possible in principle, putting the hash in project space, would change export bytes and the pinned looks (not proven safe, not done).

**C. Nonlinear per-pixel or per-region maps that do not commute with resampling (low-freq 3 to 15).** threshold (4.3), palettemap (3.05), sketch (15.5), contourlines (9.7, grows to 28 at RS 0.25), voronoi (6.6, 31 at 0.25), hextiles (5.85), halftone (11.7), electricedges (8.9), edge (6.5, energy 0.60). Banding, thresholding, cell membership and edge detection on a half-size picture are not the half-size version of the same on the full picture: the same effect would differ in the same way on any pair of resolutions. The cell and band effects scale their size (above). Contourlines, electricedges and edge are the ones I would want a second look at on a real clip: they show the largest low-frequency gaps and their thickness is clamped to a minimum of one plate pixel (`clTh >= 1`, 3x3 Sobel in electricedges), which IS a preview-only coarsening (Read). Not a defect I can prove: the export is right and the preview cannot be finer than its plate.

**D. Needs a real clip, not this image.** None left in this class; but the whole 43 was measured on ONE test image at ONE moment and default parameters. An effect that misbehaves only at a non-default setting is not covered, and AU12's own caveat (glow and dropshadow at defaults draw nothing here) applies to the defaults of several of these.

So: nothing of the 43 behaves like Tilt Shift (a size that stays fixed in plate pixels while the image shrinks, which shows as a large low-frequency gap AND an energy ratio below 1 on a smooth effect). The closest in shape is **edge** (energy 0.60) and I read it: it is ps-aware (arity 6, `ps` argument), so the lower energy is the min-1-pixel edge width in the smaller plate.

## Video layers (Measured, with limits)
- **Decode:** this container records and decodes **WebM/VP9** (`MediaRecorder` and `<video>`); the clip is 30 frames of a moving gradient with a frame counter, made in the page, loaded through `FM.loadVideoFile`. **It cannot decode H.264 or AAC**, so no MP4 was tried.
- **Check:** for each of the 20 AU12 effects plus none, at three moments (0.2, 0.9, 1.4 s), render the video layer through the preview path (playhead set, element seeked with the app's own `FM.frameSeekTarget`) and through the export path (`FM._exporting = true`, the element re-seeked from somewhere else first so the seek is genuine). **Result: byte-identical for all 21 cases at all three moments** (MAD 0, 0 % past 8). A sanity check shows the frames really differ between the three moments and are not blank.
- **Why that is expected (Read):** `compositor.js` 17660 to 17730 differs between preview and export only in the mid-seek hold-frame (preview holds the last good frame while a seek lands, export never substitutes), and the preview and the exporter both seek with `FM.frameSeekTarget`.
- **Could not / did not:** (1) the **mid-seek hold-frame** path itself (needs a seek in flight; not driven); (2) **reversed clips and the frame cache**; (3) speed ramps; (4) video at **render scale below 1** (video and image share the effect path after the source is acquired, so I expect AU12's image result to carry over, which is a Guess); (5) H.264 and any real phone-recorded clip; (6) the exporter itself (frames pulled by `FM.exporter.run`), which needs an H.264 encoder here.

## No code change
Nothing in this branch changes the app. The branch holds the report, the scripts and the data.

## Table (Measured, one image, default parameters)
| effect | full MAD | low-freq MAD | gradient energy ratio | at RS 0.25: low-freq / energy |
|---|---|---|---|---|
| brightness | 0.50 | 0.42 | 1.00 | 1.10 / 1.00 |
| contrast | 1.05 | 0.77 | 1.00 | 2.16 / 1.10 |
| saturate | 0.14 | 0.06 | 1.00 | 0.07 / 1.00 |
| hue | 0.16 | 0.10 | 1.00 | 0.14 / 1.00 |
| grayscale | 0.08 | 0.06 | 1.00 | 0.07 / 1.00 |
| invert | 0.71 | 0.70 | 1.00 | 1.28 / 1.00 |
| tint | 0.08 | 0.04 | 1.00 | 0.10 / 1.00 |
| blur | 2.63 | 1.75 | 0.90 | 0.39 / 0.98 |
| zoomblur | 3.14 | 1.19 | 1.04 | 3.39 / 0.99 |
| tiltshift | 9.83 | 6.18 | 0.85 | 10.81 / 0.73 |
| sharpen | 10.22 | 4.33 | 1.49 | 11.09 / 2.26 |
| wave | 5.10 | 1.35 | 1.02 | 3.91 / 1.04 |
| glitch | 21.26 | 9.75 | 1.24 | 12.27 / 1.32 |
| pixelate | 1.61 | 1.40 | 1.00 | 2.39 / 1.00 |
| filmgrain | 0.11 | 0.04 | 1.00 | 1.19 / 1.15 |
| bend | 5.24 | 1.25 | 1.03 | 3.59 / 1.04 |
| bulge | 5.03 | 1.67 | 1.06 | 4.43 / 1.06 |
| contourlines | 11.86 | 9.71 | 1.10 | 28.26 / 1.16 |
| crt | 19.06 | 0.57 | 3.31 | 0.78 / 2.51 |
| curl | 5.71 | 1.90 | 1.03 | 5.16 / 0.99 |
| displacemap | 8.94 | 3.56 | 1.07 | 9.58 / 0.99 |
| dissolve | 55.50 | 6.37 | 1.71 | 12.94 / 2.81 |
| dither | 17.59 | 0.79 | 2.28 | 2.02 / 2.77 |
| dots | 6.36 | 1.91 | 0.97 | 3.66 / 1.27 |
| edge | 21.91 | 6.53 | 0.60 | 18.24 / 0.68 |
| electricedges | 9.89 | 8.86 | 1.06 | 12.04 / 2.01 |
| emboss | 10.20 | 1.91 | 0.71 | 4.11 / 0.65 |
| fisheye | 5.77 | 2.05 | 1.02 | 5.42 / 0.96 |
| fractalwarp | 5.58 | 1.76 | 1.02 | 5.02 / 0.99 |
| glass | 30.17 | 4.41 | 1.50 | 8.48 / 2.45 |
| gridrepeat | 13.14 | 3.62 | 1.14 | 12.96 / 1.22 |
| grunge | 24.95 | 3.53 | 1.43 | 6.21 / 1.87 |
| halftone | 27.83 | 11.73 | 1.16 | 28.90 / 2.96 |
| hexarray | 3.04 | 0.77 | 1.12 | 3.97 / 1.23 |
| hextiles | 7.20 | 5.85 | 1.04 | 18.88 / 1.02 |
| iridescence | 4.03 | 1.64 | 1.08 | 4.33 / 1.12 |
| kaleidoscope | 7.11 | 2.18 | 1.03 | 6.57 / 0.97 |
| lensdistort | 5.12 | 2.18 | 0.99 | 5.36 / 0.97 |
| mirrortile | 7.64 | 3.44 | 1.06 | 10.38 / 1.09 |
| nightvision | 9.13 | 1.13 | 1.01 | 2.13 / 1.22 |
| noise | 13.98 | 1.60 | 1.47 | 3.16 / 1.60 |
| palettemap | 4.09 | 3.05 | 1.02 | 8.03 / 1.16 |
| polarcoords | 7.06 | 2.24 | 1.06 | 5.61 / 1.03 |
| polardisplace | 8.16 | 2.78 | 1.11 | 5.84 / 1.13 |
| radialrepeat | 6.81 | 1.81 | 1.03 | 5.52 / 0.98 |
| ripple | 6.00 | 1.70 | 1.06 | 5.12 / 1.02 |
| scanlines | 42.45 | 0.12 | 6.86 | 0.55 / 4.56 |
| sketch | 15.59 | 15.47 | 1.16 | 23.96 / 1.98 |
| squeeze | 4.83 | 1.39 | 1.07 | 3.94 / 1.11 |
| stripes | 5.33 | 0.14 | 1.01 | 0.41 / 1.03 |
| threshold | 6.26 | 4.29 | 1.00 | 11.95 / 1.17 |
| tilerotate | 5.62 | 2.13 | 1.02 | 5.69 / 0.96 |
| tunnel | 5.92 | 1.84 | 1.05 | 5.47 / 0.93 |
| turbulentdisplace | 6.20 | 1.95 | 1.06 | 5.31 / 1.09 |
| twirl | 6.22 | 1.70 | 1.04 | 4.87 / 1.04 |
| unsharpmask | 5.05 | 1.42 | 1.07 | 4.35 / 1.43 |
| vhstape | 16.79 | 2.72 | 1.24 | 7.81 / 1.24 |
| voronoi | 10.33 | 6.64 | 1.05 | 31.34 / 0.96 |
