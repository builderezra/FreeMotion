# Preview vs export mismatch audit

Against `origin/main` b46b47d (v17.23). Report only; nothing in the app or tests was changed or run for this section.
**Verified** = I read the line. **Heuristic** = a script over the source text; its limits are stated. **Guess** = needs a real device or a render to settle.

## Corrections (7 Oct, after the PM check; the report below is left as written)

1. **M2 (ranked HIGH), the premise is wrong; the mechanism stands.** Confirmed: Motion Flow advances once per render (`js/compositor.js:13235`), Echo uses a constant persist (`:13272`), Frame Blend a constant alpha (`:13260`), Temporal Denoise advances at `:12724` with a fixed 0.5×strength blend at `:12790`, nothing scaled by the time step. **Wrong:** the preview does not render at 60 or 120 Hz. `tick()` draws at most one canvas frame per project frame (`fno = floor(t·fps)`, `js/app.js:2484-2486`), and video `seeked` repaints are suppressed during play (`:3075`). In steady playback the preview takes the same number of steps as an export at "Same as project". **The real divergences:** (a) frames dropped on a slow phone (counted at `js/app.js:2486`), each a missing step and a wider gap; (b) an export frame rate different from the project's (`index.html:891`); (c) preview times off the frame grid by up to one frame (minor). The proposed fix ("advance only when the project frame number changes") is what playback already does and fixes neither (a) nor (b). The 1/30 versus 1/60 test models a case that does not occur. **Better fix:** scale each step by the real time step (Echo fade = persist^(dt·fpsRef), Frame Blend alpha and Denoise weight likewise; a gap well beyond a frame counts as a drop). **Better test:** render 2 s at 30 fps once with every frame and once with every other frame skipped, plus once with export fps 24 on a 30 fps project, and compare the last frame within a measured tolerance.
2. **Frame Stutter is misclassified:** it re-captures only when its clock-derived quantum changes (`if (rec.t !== q)`, `js/compositor.js:13193`), so its only difference is which moment the first render of a hold captures. **Downgrade to LOW-MEDIUM.** Time Warp Scan's strips (`:12900-12906`) differ only under (a) or (b).
3. **M4 is not the analysis width.** The branch is as cited (`const WW = Math.min(FM._exporting ? 720 : 480, W)`, `js/compositor.js:13354`), but the motion field is block-matched at `FW = 160` in both preview and export (`:12285`, via `_mfField` `:13302`). 480 versus 720 is the working size the Pixel Motion blur is drawn at before being stretched back; blur length is kept in step (`vScale`), so the difference is softness and detail, not length, and only when the plate is wider than 480. I measured nothing to back "visible". **Reword:** "Pixel Motion blur is drawn at 480 px in preview versus 720 px in export (the motion analysis is 160 px in both)". **Rate it LOW-MEDIUM** until a render comparison of a 1080-wide plate shows a difference. If it does, scaling the preview cap with `plateScale` is better than forcing 720 in the preview (cost) or 480 in the export (quality). The other `_exporting` branches are where I said (`:2094`, `:17677`, `:17692`, `:18862`, `:19018`).
4. **M3 has an off-by-one.** Eviction runs only when `keys.length > 12` before inserting (`js/compositor.js:12258`), so the cache holds **13** records and thrashing starts at the **14th** instance. Confirmed: Motion Flow keys on the bare layer id (`:13223-13224`) while the others add `:dn`, `:tw`, `:fs`, so two Motion Flow effects on one layer share a record; a size change resets every record (`:12268`). **This matters more than I wrote:** on a phone the adaptive quality ladder changes the plate size during playback, so every tier change wipes trails and denoise history in the preview only (the exporter clears all records before it starts, `js/exporter.js:1052`). **Fix:** key each record per effect instance (layer id plus effect index or uid), make eviction loud, and resample the stored canvases on a tier change rather than clearing them.


## 1. Answer first

- All **206 effects** in `FM.EFFECTS` (`js/compositor.js:50-1647`) were classified: 178 LOW, 16 LOW-MEDIUM, 8 MEDIUM, **4 HIGH**. The table is in §5.
- The one class of mismatch the suite does **not** guard is **effects that remember the previous rendered frame**. Four effects do: Motion Flow, Time Warp (scan), Frame Stutter and Temporal Denoise. Their state moves **once per rendered frame, with no allowance for how far apart the frames are**, and the preview and the export render at different rates. This is verified in code (§2, M2) and I found no test that compares the two rates.
- The resolution class (a reduced preview plate vs the export) is well guarded: a structural conversion for every pixel-sized parameter, a sweep test over every pixel kernel, a structural test over every canvas kernel, and about 40 named tests (§3). The remaining resolution differences are declared and accepted in the suite itself (§3, `INHERENT`).
- Nothing in the compositor uses randomness: every `Math.random` hit is a comment saying not to (`js/compositor.js:2990`, `:3047`, `:8903`, `:12952`, `:13181`, `:13857`, `:14321`). There are no Web Workers in the app (`new Worker` is absent from `js/`), and the GPU code (`js/gl-color.js`, `js/gl-warp.js`) never reads `FM._exporting`, so the preview and the export take the same GPU/CPU route on a given device.

## 2. The mechanisms by which the two can differ

**M1. Resolution (reduced preview plate, zoom, supersampling).** The preview canvas is often smaller than the project, and effect plates follow it (`plateScale`, `js/compositor.js:3880-3899`, "capped at 1"). Pixel-sized parameters are multiplied by the plate scale by `pxToPlate` (`js/compositor.js:3929-3942`) unless the kernel declares itself self-scaling (a signature with 6 or more arguments, `:3931`). The compositor itself says what this costs: "effects measured in PIXELS (grain size, scanline pitch, tile size) … read slightly differently in a reduced preview … it never reaches the export" (`js/compositor.js:3893-3897`). Export always renders at project size, then scales to the output size (`js/exporter.js:1141-1150`).

**M2. Time sampling, and state that follows it (the gap).**
- Export renders frame *f* at exactly `t = start + f / fps` (`js/exporter.js:1468`, `:1477`; the GIF and frames paths do the same, `:1719`, `:1788`).
- Preview playback is **continuous**: "Playback itself stays smooth (tick bypasses setTime)" (`js/app.js:1716`). A paused preview is snapped to the project frame grid (`FM.snapFrame`). So during play the preview renders at the display's rate (60 or 120 times a second on a phone) with times that are not on the grid.
- Four effects keep a record in `_mflow` through `_mfRec` (`js/compositor.js:12249-12270`; callers `:12723` Temporal Denoise, `:12888` Time Warp, `:13177` Frame Stutter, `:13224` Motion Flow). Each advances that record **once per rendered frame** whenever time moved forward by under 0.35 s (`advance`: `:13235`, `:12724`).
- **No step is scaled by the time between renders.** A search of lines 13200-13460 for `fps` or a time delta finds nothing. Concretely:
  - Motion Flow, Echo trails: each step multiplies the trail by `persist = min(0.96, 0.35 + amount × 0.3)` (`js/compositor.js:13272`). The trail's length in *seconds* is therefore the number of renders per second times a constant. A 60-step preview and a 30-step export decay at different speeds.
  - Motion Flow, Frame blend: blends with the previous rendered frame at a fixed alpha (`:13258-13261`); the previous frame is 1/60 s away in the preview and 1/30 s in the export.
  - Motion Flow, Smear/Pixel motion: the flow is measured between the current and previous rendered frame (`:13353-13420`), so its length depends on that gap.
  - Temporal Denoise: a recursive filter, one blend per step (`:12718-12760`).
  - Time Warp (Scan): fills the revealed strip from whichever frames were rendered while the bar crossed it (`:12900-12912`); a coarser export grid gives a different staircase.
  - Frame Stutter: captures the frame shown at the *first render inside each hold* (`:13193-13200`). Scrub into the middle of a hold and the preview captures the frame at the scrub time; the export always captures the hold's first frame.
- **Smallest fix:** make the state advance only when the **project frame number** changes (`Math.round(t × fps)`), so extra renders at the same frame are repaints, as they already are for identical times (`repaint`, `:13236`). That makes a 60 Hz preview step like a 30 fps export. If the export frame rate differs from the project's (the Export box allows it, `index.html:891`), also scale each step's factor by `dt` against a reference rate.
- **Test:** render 2 s of a moving subject through each of the four effects twice through `FM.renderScene`: once with `t` advancing by 1/30 and once by 1/60 (taking the same final time); the last frame must match within a tolerance. It fails today for Echo and Frame blend.

**M3. State is reset by things that happen only in the preview.**
- A preview resolution change resets every record (`js/compositor.js:12268`; the Time Warp hole this caused is test `10099`).
- The records are one shared cache of **12** entries (`:12257-12258`); each of the four effects on a layer uses its own key, so 13 stateful effect instances in a project evict each other **every frame**, in the preview and in the export alike.
- Motion Flow's key is the bare layer id (`:13223`), so two Motion Flow effects on one layer share one record.
- The exporter clears all records before it starts (`js/exporter.js:1052`, `resetMotionFlowCache`, `js/compositor.js:12253`) and warms them back up after a resume (`js/exporter.js:1464-1475`, `XR.prerollFrames`), so an export is internally consistent. The preview is the side that is not.

**M4. Branches on `FM._exporting` in the compositor** (all of them): `:2094` (an effect preview never renders into an export), `:13354` (**Motion Flow pixel-motion analysis width is 480 px in the preview, 720 px in the export**: a visible difference for that style), `:17677` and `:17692` (the preview's stand-in for a video frame that is still seeking; the export refuses a stale frame), `:18862` (isolate), `:19018` (crop editing).

**M5. The video frame itself.** The preview reads the `<video>` element's current frame and, while it seeks, shows the last good one (`js/compositor.js:17670-17692`). The export seeks to the exact time first (`js/exporter.js:1478`, `seekAllVideos`, `:263`). Reversed or frame-blended clips use a **downscaled** frame cache in the preview (640/960 px longest side, `js/app.js:1687-1699`, `js/frames.js:163`); the export rebuilds it at full size (`js/exporter.js:1018-1032`).

**M6. Text and fonts (guess).** Imported fonts are registered after an asynchronous load (`js/storage.js:3652`). I found no wait for fonts in the exporter, compositor or app (`document.fonts` appears only at `js/storage.js:3644-3652`). An export started immediately after a reload could draw a fallback font in the export while the preview had already re-rendered with the real one.

**M7. Output scaling (guess).** Export draws the project-size canvas into the output canvas with the default smoothing (`js/exporter.js:1148-1149`; no `imageSmoothingQuality` is set anywhere in the file). A 720p export of a 1080p project is therefore a bilinear downscale that the preview never shows.

**M8. Checked and clean:** no Math.random in the compositor (above); no Workers; no `_exporting` in the GPU code; the filter-colour keyframe path (`resolveFxColors`) is shared by every dispatcher (test `81052`).

## 3. What the suite already covers (so it need not be rebuilt)

- `tests/tests.js:74418` "859: every pixel effect draws the same picture on the preview plate as in the export": sweeps every pixel kernel at plate scale 1 and 0.28. **It tolerates a contrast ratio from 0.5× to 2.2× and a mean gap of 55** (`LO`, `HI`, `MEAN_GAP`), so a 2× error passes. Eight kernels are declared INHERENT with reasons: Emboss, Find Edges (`edge`), Sharpen, Clouds, Grunge, Halftone Lines, Halftone, Crosshatch.
- `tests/tests.js:82262` "no canvas effect has a pixel-sized setting it never scales to the plate"; `:82191` Motion Blur and Raster Extrude fixes.
- About 40 named tests, listed beside each effect in §5 (for example `22933` Edge Glow, `25405` Squish, `25735` Particles, `73766` Halftone Lines/Crosshatch/Dots, `74020` Honeycomb/Grid/Glow Scan, `112409` Film Grain, `113448` Clouds/Starfield, `114999` Glitch, `115391` Frame Stutter).
- Export resume: `59014`, `59195` (Time Warp warm-up).

## 4. Smallest fixes, in order of value

1. **M2** (HIGH, four effects): advance state on project-frame boundaries; scale by `dt` when the export rate differs. One helper used by `_mfRec` callers. Test as in §2.
2. **M4 Motion Flow width:** use the same analysis width (720) in both, or 480 in both; cost is a measured trade the authors already made (`:13354`).
3. **M3 cap:** raise the 12-entry cap, or key it per effect instance and make eviction loud (a toast) instead of silent.
4. **M6/M7:** await the fonts before the first export frame (`document.fonts.ready`), and set `imageSmoothingQuality = 'high'` on the output blit. Both need a real device to confirm the symptom first.
5. Tighten `859`'s tolerance and move the INHERENT effects to a stricter bound of their own.

## 5. Every effect

Legend. **Why:** W1p = pixel kernel, pixel-sized params converted by `pxToPlate` and swept by `859`. W1c = canvas draw kernel, scales itself, structurally tested at `:82262`. W1w = warp: geometry from W, H and the plate scale. W1o = explicit draw function; scale handled at its call site (`js/compositor.js:3835-3869`). W2 = remembers the previous rendered frame (see M2). W3 = declared INHERENT on a reduced plate (see §3). W5 = reads the layers below or the video frame (M5). W6 = text, depends on fonts (M6). W7 = `ctx.filter` effect, lengths scaled by the render scale, device support probed at boot (`js/compositor.js:1848-1862`). W8 = container.
**Test idea:** T0 = nothing needed beyond what exists. T1 = add to an `859`-style sweep (it has no case for these). T2 = render at 60 and 30 steps per second and compare the same final time. T3 = already swept; tighten the tolerance. T5 = scrub fast, export that frame, compare source frames. T6 = export right after reload with an imported font and compare glyph widths.
The "px params" column counts parameters declared in `px` in the effect's definition. The classification is a script over the source (heuristic); the HIGH rows were each confirmed by reading the code; "none found by name" means no test whose title names the effect and mentions preview or export, which does not exclude a sweep that covers it.

| Effect (type) | Family | px params | Risk | Why | Existing parity test (line in tests/tests.js) | Test idea |
|---|---|---|---|---|---|---|
| Gaussian Blur (`blur`) | ctx.filter (CSS_FX) | 1 | LOW | W7 | none found by name | T0 |
| Brightness (`brightness`) | ctx.filter (CSS_FX) | 0 | LOW | W7 | none found by name | T0 |
| Contrast (`contrast`) | ctx.filter (CSS_FX) | 0 | LOW | W7 | none found by name | T0 |
| Saturation (`saturate`) | ctx.filter (CSS_FX) | 0 | LOW | W7 | none found by name | T0 |
| Hue Shift (`hue`) | ctx.filter (CSS_FX) | 0 | LOW | W7 | none found by name | T0 |
| Grayscale (`grayscale`) | ctx.filter (CSS_FX) | 0 | LOW | W7 | none found by name | T0 |
| Sepia (`sepia`) | ctx.filter (CSS_FX) | 0 | LOW | W7 | none found by name | T0 |
| Invert (`invert`) | ctx.filter (CSS_FX) | 0 | LOW | W7 | none found by name | T0 |
| Glow (`glow`) | ctx.filter (CSS_FX) | 1 | LOW | W7 | none found by name | T0 |
| Vignette (`vignette`) | canvas draw | 0 | LOW | W1c | 118547 | T0 |
| Chroma Key (`chromakey`) | reads other pixels | 0 | LOW-MEDIUM | W5 | none found by name | T5 |
| Luma Key (`lumakey`) | reads other pixels | 0 | LOW-MEDIUM | W5 | none found by name | T5 |
| RGB Split (`rgbsplit`) | own draw fn | 2 | LOW | W1o | 82412 | T1 |
| Pixelate (`pixelate`) | own draw fn | 1 | LOW | W1o | 89065 | T1 |
| Posterize (`posterize`) | own draw fn | 0 | LOW | W1o | none found by name | T1 |
| Mirror (`mirror`) | own draw fn | 0 | LOW | W1o | none found by name | T1 |
| Tint (`tint`) | own draw fn | 0 | LOW | W1o | none found by name | T1 |
| Threshold (`threshold`) | own draw fn | 0 | LOW | W1o | none found by name | T1 |
| Duotone (`duotone`) | own draw fn | 0 | LOW | W1o | none found by name | T1 |
| Solarize (`solarize`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Gamma (`gamma`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Colour Temperature (`temperature`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Noise (`noise`) | pixel kernel | 1 | LOW | W1p | none found by name | T1 |
| Scanlines (`scanlines`) | pixel kernel | 2 | LOW | W1p | none found by name | T1 |
| Vibrance (`vibrance`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Sharpen (`sharpen`) | pixel kernel | 1 | MEDIUM | W3 | none found by name | T3 |
| Hot Colour (`thermal`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Dither (`dither`) | pixel kernel | 1 | LOW | W1p | none found by name | T1 |
| Halftone Dots (`halftone`) | pixel kernel | 1 | MEDIUM | W3 | 73766 | T3 |
| Wave (`wave`) | warp | 2 | LOW | W1w | none found by name | T0 |
| Circular Ripple (`ripple`) | warp | 2 | LOW | W1w | none found by name | T0 |
| Twirl (`twirl`) | warp | 0 | LOW | W1w | none found by name | T0 |
| Pinch / Bulge (`bulge`) | warp | 0 | LOW | W1w | none found by name | T0 |
| Find Edges (`edge`) | pixel kernel | 0 | MEDIUM | W3 | 113580 | T3 |
| Emboss (`emboss`) | pixel kernel | 0 | MEDIUM | W3 | 113580 | T3 |
| Exposure (`exposure`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Fisheye (`fisheye`) | warp | 0 | LOW | W1w | none found by name | T0 |
| Squish (`squish`) | own draw fn | 1 | LOW | W1o | 25405 | T1 |
| Kaleidoscope (`kaleidoscope`) | warp | 0 | LOW | W1w | none found by name | T0 |
| Glitch (`glitch`) | pixel kernel | 0 | LOW | W1p | 114999 | T1 |
| Zoom Blur (`zoomblur`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| CRT (`crt`) | pixel kernel | 1 | LOW | W1p | none found by name | T1 |
| Box Blur (`boxblur`) | pixel kernel | 1 | LOW | W1p | none found by name | T1 |
| Spin Blur (`spinblur`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Gradient Map (`gradientmap`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Colourize (`colorize`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Checker (`checker`) | pixel kernel | 1 | LOW | W1p | none found by name | T1 |
| Grid (`grid`) | pixel kernel | 1 | LOW | W1p | 74020 | T1 |
| Mosaic (`mosaic`) | pixel kernel | 1 | LOW | W1p | none found by name | T1 |
| Lens Blur (`lensblur`) | pixel kernel | 1 | LOW | W1p | none found by name | T1 |
| Dots (`dots`) | pixel kernel | 2 | LOW | W1p | none found by name | T1 |
| Polar Coordinates (`polarcoords`) | warp | 0 | LOW | W1w | none found by name | T0 |
| Bend (`bend`) | warp | 0 | LOW | W1w | none found by name | T0 |
| Glass (`glass`) | warp | 2 | LOW | W1w | none found by name | T0 |
| Light Glow (`lightglow`) | pixel kernel | 1 | LOW | W1p | none found by name | T1 |
| Long Shadow (`longshadow`) | pixel kernel | 1 | LOW | W1p | none found by name | T1 |
| Halftone Lines (`halftonelines`) | pixel kernel | 2 | MEDIUM | W3 | 73766 | T3 |
| Clouds (`clouds`) | pixel kernel | 0 | MEDIUM | W3 | 113448 | T3 |
| Sunburst (`rays`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Stripes (`stripes`) | pixel kernel | 1 | LOW | W1p | none found by name | T1 |
| Dark Glow (`darkglow`) | pixel kernel | 1 | LOW | W1p | none found by name | T1 |
| Stroke Colour (`stroke`) | pixel kernel | 3 | LOW | W1p | none found by name | T1 |
| Smooth Edges (`smoothedges`) | pixel kernel | 1 | LOW | W1p | none found by name | T1 |
| Liquid Glass (`liquidglass`) | canvas draw | 2 | LOW | W1c | 82319 | T0 |
| Squircle Corners (`roundcorners`) | canvas draw | 1 | LOW | W1c | none found by name | T0 |
| Film Grain (`filmgrain`) | pixel kernel | 1 | LOW | W1p | 112409 | T1 |
| Chunk Noise (`blocknoise`) | pixel kernel | 1 | LOW | W1p | none found by name | T1 |
| Starfield (`starfield`) | pixel kernel | 1 | LOW | W1p | 113448 | T1 |
| Curl (`curl`) | warp | 1 | LOW | W1w | none found by name | T0 |
| Bump Map (`bumpmap`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Edge Glow (`edgeglow`) | pixel kernel | 1 | LOW | W1p | 22933 | T1 |
| Contour Lines (`contourlines`) | pixel kernel | 2 | LOW | W1p | none found by name | T1 |
| Grunge (`grunge`) | pixel kernel | 1 | MEDIUM | W3 | none found by name | T3 |
| Iridescence (`iridescence`) | pixel kernel | 1 | LOW | W1p | none found by name | T1 |
| Fractal Warp (`fractalwarp`) | warp | 1 | LOW | W1w | none found by name | T0 |
| Directional Blur (`motionblur`) | canvas draw | 1 | LOW | W1c | 82191 | T0 |
| Colour Balance (`colorbalance`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Highlights & Shadows (`highlightsshadows`) | pixel kernel | 1 | LOW | W1p | none found by name | T1 |
| Tilt Shift (`tiltshift`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Drop Shadow (`dropshadow`) | pixel kernel | 2 | LOW | W1p | none found by name | T1 |
| Chromatic Aberration (`chromaticaberration`) | pixel kernel | 1 | LOW | W1p | none found by name | T1 |
| Inner Glow (`innerglow`) | pixel kernel | 1 | LOW | W1p | none found by name | T1 |
| Unsharp Mask (`unsharpmask`) | pixel kernel | 1 | LOW | W1p | none found by name | T1 |
| Hexagon Tiles (`hextiles`) | pixel kernel | 1 | LOW | W1p | 74020 | T1 |
| Linear Streaks (`linstreaks`) | pixel kernel | 1 | LOW | W1p | none found by name | T1 |
| Blink (`blink`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Flicker (`flicker`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Flash (darken) (`flashdark`) | pixel kernel | 0 | LOW | W1p | 115316 | T1 |
| Breathe (`pulseopacity`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Dissolve (`dissolve`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Block Dissolve (`blockdissolve`) | pixel kernel | 1 | LOW | W1p | none found by name | T1 |
| Wipe (`wipe`) | pixel kernel | 1 | LOW | W1p | none found by name | T1 |
| Radial Wipe (`radialwipe`) | pixel kernel | 1 | LOW | W1p | none found by name | T1 |
| Fill Silhouette (`solidmatte`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Matte Choker (`mattechoker`) | pixel kernel | 2 | LOW | W1p | none found by name | T1 |
| Edge Halo (`mattefringe`) | pixel kernel | 1 | LOW | W1p | none found by name | T1 |
| Tile Grid (`gridrepeat`) | warp | 0 | LOW | W1w | none found by name | T0 |
| Trail (`linearrepeat`) | canvas draw | 0 | LOW | W1c | none found by name | T0 |
| Scatter Array (`scatterarray`) | canvas draw | 0 | LOW | W1c | none found by name | T0 |
| Ring Array (`radialrepeat`) | warp | 0 | LOW | W1w | none found by name | T0 |
| Mirror Tile (`mirrortile`) | warp | 3 | LOW | W1w | none found by name | T0 |
| Channel Remap (`channelremap`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Gradient Overlay (`gradientoverlay`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Lens Flare (`lensflare`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Roughen Edges (`roughenedges`) | pixel kernel | 2 | LOW | W1p | none found by name | T1 |
| Honeycomb (`hexarray`) | pixel kernel | 1 | LOW | W1p | none found by name | T1 |
| Electric Edges (`electricedges`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Glow Scan (`glowscan`) | pixel kernel | 1 | LOW | W1p | 74020 | T1 |
| Spin Streaks (`spinstreaks`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Fractal Ridges (`fractalridges`) | pixel kernel | 1 | LOW | W1p | none found by name | T1 |
| Smooth Bevel (`smoothbevel`) | pixel kernel | 1 | LOW | W1p | none found by name | T1 |
| Zoom Streaks (`zoomstreaks`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Inner Blur (`innerblur`) | pixel kernel | 1 | LOW | W1p | none found by name | T1 |
| Contour Strips (`contourstrips`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Inner Pinch (`innerpinch`) | warp | 0 | LOW | W1w | none found by name | T0 |
| Crosshatch (`crosshatch`) | pixel kernel | 2 | MEDIUM | W3 | 73766 | T3 |
| Number Roll (`counter`) | text | 0 | LOW-MEDIUM | W6 | none found by name | T6 |
| Type-On (`textprogress`) | text | 0 | LOW-MEDIUM | W6 | none found by name | T6 |
| Scramble Text (`textrandomizer`) | text | 0 | LOW-MEDIUM | W6 | none found by name | T6 |
| Text Curve (`textcurve`) | text | 0 | LOW-MEDIUM | W6 | none found by name | T6 |
| Text Reverse (`textreverse`) | text | 0 | LOW-MEDIUM | W6 | none found by name | T6 |
| Text Repeat (`textrepeat`) | text | 0 | LOW-MEDIUM | W6 | none found by name | T6 |
| Text Pad (`textpad`) | text | 0 | LOW-MEDIUM | W6 | none found by name | T6 |
| Letter Spread (`textspacing`) | text | 2 | LOW-MEDIUM | W6 | none found by name | T6 |
| Change Case (`texttransform`) | text | 0 | LOW-MEDIUM | W6 | none found by name | T6 |
| Timecode (`timecode`) | text | 0 | LOW-MEDIUM | W6 | none found by name | T6 |
| Bleach Bypass (`bleachbypass`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Teal & Orange (`tealorange`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Cross Process (`crossprocess`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Light Leak (`lightleak`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Letterbox (`letterbox`) | pixel kernel | 1 | LOW | W1p | none found by name | T1 |
| Border Frame (`border`) | pixel kernel | 3 | LOW | W1p | none found by name | T1 |
| Faded Film (`faded`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Night Vision (`nightvision`) | pixel kernel | 0 | LOW | W1p | 112467 | T1 |
| Pencil Sketch (`sketch`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Cube (`cube3d`) | canvas draw | 0 | LOW | W1c | none found by name | T0 |
| Box (`box3d`) | canvas draw | 0 | LOW | W1c | none found by name | T0 |
| Cylinder (`cylinder3d`) | canvas draw | 0 | LOW | W1c | none found by name | T0 |
| Spherize (`sphere3d`) | canvas draw | 0 | LOW | W1c | none found by name | T0 |
| Ellipsoid (`ellipsoid3d`) | canvas draw | 0 | LOW | W1c | none found by name | T0 |
| Torus (`torus3d`) | canvas draw | 0 | LOW | W1c | none found by name | T0 |
| Ring (`ring3d`) | canvas draw | 0 | LOW | W1c | none found by name | T0 |
| Pyramid (`pyramid3d`) | canvas draw | 0 | LOW | W1c | none found by name | T0 |
| Octahedron (`octahedron3d`) | canvas draw | 0 | LOW | W1c | none found by name | T0 |
| Hexagonal Prism (`hexprism3d`) | canvas draw | 0 | LOW | W1c | none found by name | T0 |
| Star Prism (`starprism3d`) | canvas draw | 0 | LOW | W1c | none found by name | T0 |
| Spiked Star (`starpoly3d`) | canvas draw | 0 | LOW | W1c | none found by name | T0 |
| Heart (`heart3d`) | canvas draw | 0 | LOW | W1c | none found by name | T0 |
| Open Box (`hollowbox3d`) | canvas draw | 0 | LOW | W1c | none found by name | T0 |
| Cross Beam (`axiscross3d`) | canvas draw | 0 | LOW | W1c | none found by name | T0 |
| Page Curl (`pagecurl`) | canvas draw | 0 | LOW | W1c | none found by name | T0 |
| Card Flip (`fliplayer`) | canvas draw | 0 | LOW | W1c | none found by name | T0 |
| Depth Push (`rasterextrude`) | canvas draw | 1 | LOW | W1c | 82191 | T0 |
| Wiggle (`wiggle`) | canvas draw | 2 | LOW | W1c | none found by name | T0 |
| Shake (`shake`) | canvas draw | 1 | LOW | W1c | none found by name | T0 |
| Swing (`swing`) | canvas draw | 0 | LOW | W1c | none found by name | T0 |
| Spin (`spin`) | canvas draw | 0 | LOW | W1c | none found by name | T0 |
| Pulse (`pulse`) | canvas draw | 0 | LOW | W1c | none found by name | T0 |
| Drift (`drift`) | canvas draw | 0 | LOW | W1c | none found by name | T0 |
| Orbit (`orbit`) | canvas draw | 1 | LOW | W1c | none found by name | T0 |
| Squeeze (`squeeze`) | warp | 0 | LOW | W1w | none found by name | T0 |
| Tiles (`tiles`) | canvas draw | 0 | LOW | W1c | none found by name | T0 |
| Motion Blur (Footage) (`motionflow`) | canvas draw | 0 | HIGH | W2 | none found by name | T2 |
| Motion Blur (Object) (`objectblur`) | reads other pixels | 0 | LOW-MEDIUM | W5 | 115450 | T5 |
| Soft Glow (`softglow`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Replace Colour (`replacecolor`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Spot Colour (`spotcolor`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Four-Colour Gradient (`fourcolor`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Spectral Map (`spectralmap`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Radial Shadow (`radialshadow`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Voronoi Cells (`voronoi`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Tunnel (`tunnel`) | warp | 0 | LOW | W1w | none found by name | T0 |
| Turbulent Displace (`turbulentdisplace`) | warp | 1 | LOW | W1w | none found by name | T0 |
| Stretch Segment (`stretchseg`) | warp | 0 | LOW | W1w | none found by name | T0 |
| Tile Shift (`tileshift`) | warp | 1 | LOW | W1w | none found by name | T0 |
| Tile Rotate (`tilerotate`) | warp | 1 | LOW | W1w | none found by name | T0 |
| Wrap Shift (`wrapshift`) | warp | 0 | LOW | W1w | none found by name | T0 |
| Palette Map (`palettemap`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Lightning (`lightning`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Displacement Map (`displacemap`) | own draw fn | 1 | LOW | W1o | none found by name | T1 |
| Polar Displacement (`polardisplace`) | own draw fn | 1 | LOW | W1o | none found by name | T1 |
| Remove Object (`touchup`) | pixel kernel | 1 | LOW | W1p | none found by name | T1 |
| Backdrop Clone (`copybg`) | reads other pixels | 0 | LOW-MEDIUM | W5 | none found by name | T5 |
| Backdrop Lens (`magnifybg`) | reads other pixels | 0 | LOW-MEDIUM | W5 | none found by name | T5 |
| Backfill (`fillbehind`) | reads other pixels | 1 | LOW-MEDIUM | W5 | 27908 | T5 |
| Particles (`particles`) | canvas draw | 2 | LOW | W1c | 25735 | T0 |
| Levels (`levels`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Halation (`halation`) | canvas draw | 0 | LOW | W1c | none found by name | T0 |
| Frame Stutter (`framestutter`) | canvas draw | 0 | HIGH | W2 | 115391 (preview only) | T2 |
| Shockwave (`shockwave`) | pixel kernel | 1 | LOW | W1p | none found by name | T1 |
| Speed Lines (`speedlines`) | canvas draw | 1 | LOW | W1c | 114930 | T0 |
| Snow & Rain (`weather`) | canvas draw | 2 | LOW | W1c | none found by name | T0 |
| HSL Bands (`hslbands`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Time Warp Scan (`timewarp`) | canvas draw | 1 | HIGH | W2 | 10099, 59195 | T2 |
| Chroma Key Pro (`chromakeypro`) | pixel kernel | 0 | LOW | W1p | 113484 | T1 |
| Light Wrap (`lightwrap`) | canvas draw | 2 | LOW | W1c | none found by name | T0 |
| Dispersion (`dispersion`) | pixel kernel | 2 | LOW | W1p | none found by name | T1 |
| VHS Tape (`vhstape`) | pixel kernel | 2 | LOW | W1p | none found by name | T1 |
| Compression Crunch (`compresscrunch`) | pixel kernel | 2 | LOW | W1p | none found by name | T1 |
| Temporal Denoise (`temporaldenoise`) | canvas draw | 1 | HIGH | W2 | none found by name | T2 |
| Lens Distortion (`lensdistort`) | pixel kernel | 0 | LOW | W1p | none found by name | T1 |
| Pixel Sort (`pixelsort`) | pixel kernel | 1 | LOW | W1p | none found by name | T1 |
| Luma Matte (`lumamatte`) | own draw fn | 1 | LOW | W1o | none found by name | T1 |
| Compound Blur (`compoundblur`) | own draw fn | 1 | LOW | W1o | none found by name | T1 |
| Match Grade (`matchgrade`) | own draw fn | 0 | LOW | W1o | none found by name | T1 |
| Filter (`filter`) | container | 0 | LOW | W8 | none found by name | T0 |
