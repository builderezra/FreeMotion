# Effects pack, vetted against the current code (1 Oct 2026)

What this vets: `effects-pack.md` (ChatGPT, written against snapshot 28104a3e / v17.21), which proposes 20 effects, 15 filters and 10 upgrades.
Tree checked: HEAD is still `28104a3e` and `js/` has no uncommitted changes, so every line number below is current.
Checked against:
- the 206 `EFFECTS` entries in `js/compositor.js:51–1556`;
- the 56 library filters in `js/filters.js:73–495`;
- the ten #912 looks on branch `fm912-filters`: Sepia, Digicam, Portrait Film, Moody, Cyberpunk, Tungsten, Airy, Colour Splash, Cyanotype, HDR;
- the idle backlog (`tools/design/plans/2026-09-29-idle-backlog/backlog.md`, sections A, B and C);
- REQUESTS.md #966, #912 and #954 (`tools/design/954-effect-names.md`);
- Alight Motion's ~170 effect names, re-fetched today from smartmotionapp.com/effects-list.

**This file is a design record, not a build order.** Every new effect and new filter below still needs his picture-pick under #545 before it ships: draw it, show it at the size it ships at, and let him choose. The upgrades are polish on existing effects, so under #966 each can ship with a before/after picture.

## 0. ChatGPT's anchors and claims: what held up and what did not

Held up:
- Every `file:line` anchor it cited (Wipe 654, Mosaic 362, Tunnel 1194, Inner Blur 806 and the rest) points at the right line in the current tree.
- No name it coined matches an Alight Motion name or one of our own labels.

Wrong or missing, and corrected in the shortlist:
1. **It treats temporal effects as having no path yet. They do have one.** E08 and E17 are marked "confidence low until temporal access is designed". In fact four shipped effects already keep frame history in `_mfRec` (`js/compositor.js:11925`): Motion Blur (Footage), Frame Stutter, Time Warp Scan (12384) and Temporal Denoise (1490). They follow a fixed set of rules:
   - Pass the frame straight through when `FM._mfGhost` is set. That flag is on for previews, the onion skin and the browser tiles (12385, 12681).
   - Reset when the playhead jumps more than 0.35 s or goes backwards.
   - The exporter clears all history with `FM.resetMotionFlowCache`.
   - The effect's description says it only appears during forward playback and export.
   
   A truly stateless "sample an earlier time" needs C31's `drawLayer(q/rate)` hold, which B3 Echo is also waiting for. A history-based version can be built today. `_mfField` (11960) already measures how much each block changed between frames, which is most of E17.
2. **The `mix` values in its filter recipes would be dropped without any warning.** `saneChild` (`js/filters.js:~510–524`) drops any param the child effect does not declare (`if (!pd) return;`). F06, F10, F13 and F14 set `mix` on children whose proposed schemas do not all have one. So either give the effect a `mix` key or leave it out of the recipe. It also means a recipe that names an effect not yet built quietly loses that child, so **a filter can only ship after the effects it uses.**
3. **Layer references are written wrong.** It writes them as a param (`source | N/A`). The house pattern is a registry flag, `layer: true, layerLabel: '…'`, as on Displacement Map (1248), Luma Matte (1522) and Match Grade (1538).
4. **Pixel sizes must declare `unit: 'px'`.** That is how `pxToPlate` (3841) scales them to the preview plate. Without it, a kernel that does not take `ps` draws 3.5× coarse on the 0.28 phone plate, which is bug C5 again.
5. **Seeds should run 0–999 (or 0–99), not 0..9999.** The house control is labelled "Pattern" (Glass 389, Flicker 618). Every seed below uses that.
6. **Warps should be `WARP_FX` with a GLSL body**, so the GPU chain (8887) runs them on the phone. E04 and E06 do not need the heavy mesh ChatGPT gives them (§A, items 5 and 10).
7. **Its names are too poetic for this app.** Our labels are plain ("Pencil Sketch", "Light Leak"), and he reads them on a phone. Names like "Woven Memory", "Pocket Puzzle", "Chromatic Footfall" and "Puncture Press" are replaced below.
8. **Clashes inside our own app that it missed:**
   - "Drift Cutout" would sit next to the existing Drift effect (1061).
   - "Ink Postcard" next to the "Ink" filter (filters.js:271).
   - "Woven Neon Note" next to "Neon Night".
   - "Facet Ledger" next to Glass's "Facet size" control.
9. **New effects must state whether they work on adjustment layers** (`ADJ_OK`, `js/fx-registry.js:171`). Geometry and reveal effects should not.

## 1. Verdict on all 45 items

### Effects (E01–E20)

| # | ChatGPT name | Verdict | Why |
|---|---|---|---|
| E01 | Borrowed Grain | **NEAR-DUPLICATE** | A texture layer set to Overlay or Soft Light blend (`js/blend-modes.js`) does the same job, and Grunge (530) covers the dirt case. Frequency separation adds little for its heavy cost. Dropped. |
| E02 | Edge Accord | **NEAR-DUPLICATE** | Tile Grid's Mirror X/Y/Both (670) and Mirror Tile (702) already make seamless joins. Niche. Dropped. |
| E03 | Ink Arrival | **NEW** | Dissolve (629) is a noise threshold and Wipe/Radial Wipe are geometric. Nothing grows along branches. Shortlisted as **Ink Seep**. |
| E04 | Rainheld Glass | **NEW** | Glass (389) is noise facets, Liquid Glass (443) is a frosted panel, and Snow & Rain (1398) is particles that do not refract. Shortlisted as **Rain on Glass**. |
| E05 | Threadmark | **NEW (near Stroke Colour)** | Stroke Colour (432) is a solid line. Backlog 12.5 adds dashes to Border Frame, but only for rectangles. Shortlisted as **Stitched Outline**. |
| E06 | Paper Hinges | **NEW** | Page Curl (996) is one curl and Card Flip (997) is one flip. Shortlisted as **Paper Fold**, built as a cheaper warp. |
| E07 | Pocket Puzzle | **NEW** | Block Dissolve (636) fades squares. "Puzzle" exists only as a SHAPE (compositor.js:15071, addmenu.js:142), not an effect. Shortlisted as **Jigsaw**. |
| E08 | Time Prism | **NEW** | RGB Split (81) and Chromatic Aberration offset channels in space, and Echo (B3) delays the whole picture. Nothing delays each colour separately in time. Shortlisted as **Colour Delay**, built on history (item 1 above). |
| E09 | Typefield | **NEW** | There is no ASCII or character art anywhere (grep for ascii/glyph in the effects finds nothing). Shortlisted as **Character Art**. |
| E10 | Foil Current | **NEW (near Glow Scan / Iridescence)** | Glow Scan (755) is a sweeping band and Iridescence (557) is a rainbow. Neither does brushed, directional highlights. Shortlisted as **Brushed Metal**. |
| E11 | Woven Memory | **NEW** | Weave appears only as comments about Tile Rotate (10604, 11011). Cheap, but less useful to him than the twelve shortlisted. **Reserve.** |
| E12 | Water Lantern | **NEW** | No caustics exist. Circular Ripple (208) warps the picture, it does not light it. Shortlisted as **Water Light**. |
| E13 | Pigment Shore | **NEW look; shares its core with B32** | Different from Pencil Sketch (972) and Crosshatch, but should share B32 Oil Paint's summed-area Kuwahara rather than ChatGPT's 6-pass diffusion. Shortlisted as **Watercolour**. |
| E14 | Turning Portrait | **NEW** | A lenticular print. Needs a second layer and is niche. **Reserve.** |
| E15 | Facet Ledger | **NEW** | Mosaic (362), Hexagon Tiles, Honeycomb and Voronoi Cells (1182) never triangulate. Shortlisted as **Low Poly**. |
| E16 | Flow Etch | **NEAR-DUPLICATE** | Same idea as Halftone Lines (402), which #954 proposes renaming "Engraving", and as Crosshatch (831) and Pencil Sketch. Line-integral convolution is heavy on a phone. Better as a later "Follow shapes" option on Halftone Lines. Dropped. |
| E17 | Drift Cutout | **NEAR-DUPLICATE + NAME-CLASH** | `_mfField` already gives per-block frame difference, and Luma Matte covers keying. Only works with a locked-off camera. Its name sits beside Drift (1061). Dropped. |
| E18 | Detail Duet | **Weak / near Duotone** | Colouring by detail frequency is hard to explain and is about stacking Duotone over Unsharp Mask. Little value. Dropped. |
| E19 | Scatter Ink | **NEW (near Halftone / Dither)** | Halftone (194) is a regular screen, and Dither (188), even with 13.6's blue noise, thresholds single pixels. Neither draws placed dots. Shortlisted as **Stipple**. |
| E20 | Focus Beacon | **NEAR-DUPLICATE** | Find Edges (228) already has "Ignore below" and Mix. It is a camera aid, and as an effect it would end up in his export. If wanted, it belongs as a preview-only view toggle. Dropped. |

### Filters (F01–F15)

Every one depends on a new effect, so it can only ship after that effect (§0 item 2).

- **Dropped with their missing dependency:**
  - F01, F06 as written, and F14: these use Weave or Detail Duet.
  - F08: uses Flow Etch and Detail Duet.
  - F11 and F15: three heavy passes stacked, and F15 needs Detail Duet.
- **F02:** reworked without Detail Duet.
- **F06:** reworked around Stitched Outline plus the existing Stroke Colour and Drop Shadow.
- **All 15 of ChatGPT's names were replaced** (§B).
- **Checked against our names:** none of the ten names in §B match the 56 shipped filters, the #912 ten, or backlog B8's eight (Game Boy, X-Ray, CCTV, Pencil, Autumn, Green Code, Sky Grad, Solarised).

### Upgrades (U01–U10)

| # | Verdict |
|---|---|
| U01 Pixelate keep outline | **NEW.** Shortlisted. |
| U02 Posterize phase | **NEW.** Contour Strips already has the same idea as `offset` "Band offset" (822). Shortlisted, reusing that key and label. |
| U03 Bump Map smoothing | **NEW, low value.** Not shortlisted. |
| U04 Mosaic bevel | **NEW.** It is the same shading backlog 10.7 adds to Hexagon Tiles, so build one helper. Shortlisted. |
| U05 Solarize per-channel | **NEW, niche.** Reserve. |
| U06 Grid major lines | **NEW.** Shortlisted, but ship it together with C33's anti-aliasing fix (backlog 12.5). |
| U07 Dots row offset and oval | **NEW.** Shortlisted, using the house keys `stagger` and `aspect`. |
| U08 Contour accent lines | **NEW.** Shortlisted. |
| U09 Inner Blur clear rim | **NEW, but costly.** Inner Blur already cannot be bounded (8003 comment), and a distance field on top makes it worse. Not shortlisted. |
| U10 Tunnel twist | **NEAR-DUPLICATE.** Twirl (215) has a centre and a radius, so stacking Twirl after Tunnel gives the same result. Dropped. |

### Name clashes

**Against Alight Motion's list (fetched today): no clashes**, for ChatGPT's names or for any name proposed below.
**CapCut's catalogue could not be checked from here.** Three of the proposed names are generic craft terms that CapCut may also use: "Low Poly", "Watercolour" and "Jigsaw". That is the same tier as #954 section 2 ("Gaussian Blur" and the like), which #954 recommends keeping. Check CapCut before shipping.

## A. Effects: the best 12, ranked by value to his edits

The order puts beat-driven, overlay and transition looks for his Tuff edits first, then cheap wins.
Notation follows the registry: `key` Label range (default) unit. Every control with a `px` unit declares `unit:'px'`, and every seed is "Pattern" 0–999.

**1. Colour Delay** (`colourdelay`, from E08). Category: Glitch / Time. Cost: medium. Works on adjustment layers: no.
- Controls:
  - `red` "Red delay" 0–10 (2) frames.
  - `green` "Green delay" 0–10 (0) frames.
  - `blue` "Blue delay" 0–10 (4) frames.
  - `mix` "Strength" 0–1 (1).
- What it does: each colour channel trails the picture by its own number of frames, so moving things split into red, green and blue ghosts. Still footage stays clean.
- How to build it: a CANVAS_FX with a ring of past frames on its `_mfRec` record. Delays are counted in project frames, the same as Frame Stutter's `fps` unit (1351), not in ms.
  - Store only the channels that are actually delayed, as Uint8Array planes at plate size.
  - Cap the ring at 10 frames. At export size (1080×1920) that is about 2 MB per plane per frame, so two delayed channels at the cap is around 40 MB. Free it with the cache.
  - Follow the house rules: `FM._mfGhost` passes straight through, a jump or a backwards seek shows the frame undelayed and clears the ring, and export starts from `resetMotionFlowCache`.
  - `desc` must say it only shows during playback and export, the way Temporal Denoise's does.

**2. Character Art** (`charart`, from E09). Category: Stylize. Cost: cheap to medium. Works on adjustment layers: no.
- Controls:
  - `cell` "Character size" 4–64 (12) px.
  - `set` "Characters": Classic ` .:-=+*#%@` / Blocks `░▒▓█` / Digits / Binary 0-1.
  - `paint` "Colour from": Picture / Ink & paper (color "Ink" #33ff66, color2 "Paper" #000000).
  - `paper` "Background": Transparent / Paper.
  - `invert` "Light characters": Off/On.
  - `contrast` "Contrast" 50–200 (100) %.
  - `boil` "Re-roll" 0–30 (0) Hz. Swaps between characters of equal density; this is the edit look.
- How to build it (corrected): no bundled font is needed. Draw the glyphs once with a monospace system font into an alpha atlas, sorted by measured ink coverage, and cache it by (set, cell × ps). For the cell averages, shrink the plate with one `drawImage` to (W/cell × H/cell) with `imageSmoothingQuality:'high'`, then read it once with `getImageData`. The render itself is a single PIXEL pass in O(N): pixel → cell → glyph → atlas alpha × cell colour. Do not make 10,000 per-cell `drawImage` calls, which would be needed to tint each cell.

**3. Jigsaw** (`jigsaw`, from E07). Category: Transition / Opacity. Cost: medium. Works on adjustment layers: no.
- Controls:
  - `progress` "Assemble" 0–1, step 0.005 with `q` 0.005 like the wipes (559) (0.6).
  - `columns` "Pieces across" 2–12 (5). Rows follow the layer's aspect ratio.
  - `scatter` "Scatter distance" 0–800 (200) px.
  - `turn` "Scatter turn" 0–180 (35) °.
  - `from` "Pieces come from": Everywhere / Above / Below / Sides.
  - `stagger` "One by one" 0–100 (40) %.
  - `shadow` "Piece shadow" 0–1 (0.3).
  - `seed` "Pattern" 0–999.
- How to build it: a CANVAS_FX fitted to `bb` (the layer's box, not the frame).
  - Build a Path2D per piece. Neighbours share their tab signs through hash(seed, edge). Cache the paths by (columns, rows, bb size, seed).
  - For each piece: save, translate/rotate by the hashed scatter × (1 − eased progress), clip, `drawImage(A)`, restore.
  - Cap at 144 pieces. At progress ≥ 1, return the input byte-identical.
  - ChatGPT rated it heavy. It is medium: 25 clipped draws per frame.

**4. Ink Seep** (`inkseep`, from E03). Category: Transition / Matte. Cost: cheap per frame once cached. Works on adjustment layers: no.
- Controls:
  - `progress` "Spread" 0–1, step/q 0.005 (0.5).
  - `grain` "Fibre size" 4–100 (24) px.
  - `branch` "Branching" 0–100 (65) %.
  - `soft` "Edge softness" 0–40 (4) px.
  - `origin` "Starts from": Centre point / Left / Bottom / Scattered spots, with `centerx`/`centery` 0–100 % (50/50).
  - `rim` "Wet edge" 0–1 (0), with color "Edge" #1a1a1a.
  - `invert` "Hide instead": Off/On.
  - `seed` "Pattern" 0–999.
- How to build it: compute an arrival-time field once, with Dijkstra or fast marching over a hashed resistance grid of at most 256×256. Cache it by (seed, grain, branch, origin, aspect). Each frame does one bilinear lookup and a smoothstep against `progress`, multiplied into alpha. Progress 0 and 1 are exact (fully hidden and untouched).

**5. Rain on Glass** (`rainglass`, from E04). Category: Distort / Overlay. Cost: cheap on GPU, medium on CPU. Works on adjustment layers: no.
- Controls:
  - `density` "Drops" 0–100 (35) %.
  - `size` "Drop size" 3–100 (24) px.
  - `bend` "Refraction" 0–100 (55) %.
  - `fog` "Fog between drops" 0–20 (0) px. This is the condensation look and the biggest win of the controls.
  - `slide` "Running drops" 0–200 (0) px/s.
  - `shine` "Highlights" 0–100 (40) %.
  - `seed` "Pattern" 0–999.
- How to build it:
  - **The refraction is a `WARP_FX` with a GLSL body**: hashed drop per cell, a 3×3 neighbour search, a spherical-cap normal and a uv offset. The GPU chain (8887) then runs it on the phone, with the CPU path as a fallback.
  - The rim highlight is a small PIXEL pass after the warp.
  - Fog needs a blurred copy that shows only between the drops. Run that blur through the GPU fallback when `!ctxFilterOK()`; backlog §0.2 lists five effects already broken that way.
  - Running drops use absolute time, wrap deterministically, and leave a short trail.

**6. Water Light** (`waterlight`, from E12). Category: Light / Generate. Cost: cheap. Works on adjustment layers: yes, if it is applied in frame space.
- Controls:
  - `scale` "Light size" 10–400 (90) px.
  - `sharp` "Sharpness" 0–100 (65) %.
  - `speed` "Flow" 0–2 (0.25) cycles/s. Uses `FM.integrateProp` when keyframed, like backlog 10.2.
  - `amount` "Amount" 0–100 (30) %.
  - color "Light" #cff6ff.
  - `blend` "Blend": Screen / Add / Overlay.
  - `angle` "Flow direction" 0–360 (0) °.
- How to build it (corrected): drop ChatGPT's analytic Jacobian. Use the standard iterated-sine caustic field (about 5 iterations) evaluated at ¼ plate resolution into a small pooled canvas. Scale it up with `drawImage`, then composite it `source-atop` so the layer's alpha is kept. The light is low-frequency, so the quarter-resolution field looks the same as full resolution.

**7. Low Poly** (`lowpoly`, from E15). Category: Stylize. Cost: medium. Works on adjustment layers: no.
- Controls:
  - `count` "Triangles" 32–2000 (300).
  - `jitter` "Randomness" 0–1 (0.8).
  - `shade` "Facet shading" 0–100 (10) %.
  - `lines` "Edge lines" 0–3 (0) px, with color "Lines" #ffffff.
  - `sample` "Colour from": Average / Centre (the same choice Mosaic offers, 366).
  - `seed` "Pattern" 0–999.
- How to build it (corrected):
  - Use stable jittered stratified points with Bowyer–Watson Delaunay. Caching by (count, jitter, seed, bb) is enough; even rebuilding it costs about 1–3 ms for 2000 points.
  - ChatGPT's "topology from the clip's first frame" is wrong for video. Feature-weighted point placement can be a later option. If added, it must hold its points still or the triangles flicker.
  - Take each triangle's colour from a downscaled plate (area averages for free).
  - Fill one Path2D per triangle, plus a 0.5 px stroke in the same colour to hide hairline seams.

**8. Stipple** (`stipple`, from E19). Category: Stylize. Cost: cheap to medium. Works on adjustment layers: no.
- Controls:
  - `spacing` "Dot spacing" 2–30 (6) px.
  - `dot` "Dot size" 0.5–12 (2) px.
  - `density` "Dark-area density" 0–100 (70) %.
  - `paint` "Colour from": Ink & paper (color "Ink" #111111, color2 "Paper" #f4efe4) / Picture.
  - `boil` "Re-roll" 0–30 (0) Hz.
  - `seed` "Pattern" 0–999.
- How to build it (corrected): not 50,000 canvas arcs. Write it as a PIXEL pass over a jittered grid with one candidate dot per cell and a hashed rank. Each pixel checks the 3×3 neighbouring cells. A dot is drawn when rank < darkness of that cell, read from a downscaled plate. Use distance-based anti-aliasing. Dot positions are fixed in project space, so they do not crawl when the picture moves.

**9. Watercolour** (`watercolour`, from E13). Category: Stylize. Cost: medium. Works on adjustment layers: no.
- Controls:
  - `wash` "Wash size" 1–40 (8) px.
  - `rim` "Pigment edges" 0–100 (40) %.
  - `paper` "Paper texture" 0–100 (30) %.
  - `bleed` "Colour bleed" 0–20 (4) px.
  - `sat` "Saturation" 0–200 (100) %.
  - `mix` "Strength" 0–1 (1). This is what lets the Folded Print recipe dial it down.
  - `seed` "Pattern" 0–999.
- How to build it (corrected): not ChatGPT's six diffusion passes. One pass at half resolution, in this order:
  1. Summed-area Kuwahara, shared with B32 Oil Paint, so build B32 first or build them together.
  2. Edge darkening from the gradient of the smoothed luma, which is pigment collecting at the edges.
  3. A seeded, project-space paper noise multiplied in.
  4. A small blur for bleed.
  
  Because ChatGPT gave this one "confidence low", draw it on real clips before anything else is decided.

**10. Paper Fold** (`paperfold`, from E06). Category: Distort / 3D. Cost: cheap. Works on adjustment layers: no.
- Controls:
  - `folds` "Creases" 1–12 (3).
  - `fold` "Fold amount" 0–80 (28) °.
  - `angle` "Crease direction" 0–180 (90) °.
  - `persp` "Perspective" 0–100 (30).
  - `shade` "Fold shading" 0–100 (35) %.
- How to build it (corrected): no triangle mesh is needed. Because the creases are parallel, each panel is a strip.
  - The inverse map is 1-D and piecewise across the creases: x′ = panel start + (x − projected start) / cos θ.
  - Add a per-panel vertical scale for the zig-zag depth, and centre the folded width.
  - Write it as a `WARP_FX` (GLSL-capable), with transparent outside, plus a PIXEL multiply by each panel's light. At fold 0 it must return the input byte-identical.

**11. Stitched Outline** (`stitch`, from E05). Category: Edge. Cost: medium when cached, heavy on moving alpha. Works on adjustment layers: no.
- Controls:
  - `length` "Stitch length" 2–40 (9) px.
  - `gap` "Gap" 1–30 (5) px.
  - `width` "Thread width" 1–12 (3) px.
  - color "Thread" #f2c14e.
  - `offset` "Distance from edge" −20..40 (6) px.
  - `style` "Stitch": Running / Cross / Zigzag.
  - `progress` "Sewn" 0–100 (100) %.
  - `depth` "Thread shadow" 0–1 (0.4).
- How to build it:
  1. Grow or shrink the outline by Offset with Matte Choker's morphology (657).
  2. Trace it with marching squares at a working resolution of 512 px or less, holes included, in a fixed contour order.
  3. Resample by arc length and draw a short stroke per stitch.
  
  Cache the contours by layer content. Text and shapes are static, so that is the common case. Video layers re-trace every frame with a capped point count. It works on any outline, which is what backlog 12.5 (Border Frame dashes, rectangles only) cannot do.

**12. Brushed Metal** (`brushedmetal`, from E10). Category: Colour / Light. Cost: cheap. Works on adjustment layers: no.
- Controls:
  - `angle` "Brush direction" 0–180 (0) °.
  - `rough` "Roughness" 1–100 (40) %.
  - `light` "Light position" 0–360 (120) °. Keyframe it for a sweep.
  - `sweep` "Auto sweep" 0–2 (0) Hz.
  - `metal` "Amount" 0–100 (65) %.
  - color "Metal" #d9d9d9 (gold is #e6c36a).
- How to build it: a PIXEL pass.
  - The grain is a cached 256² tile of 1-D hashed noise blurred along the brush direction, keyed by (angle, rough). It is sampled in project space with `ps` so it does not crawl when you zoom.
  - Specular = pow(max(0, cos(φ − light)), k(rough)) × grain.
  - out = mix(src, src × metal colour + specular, amount). Alpha is kept.

**Reserves** (new, but below the cut):
- E11 Weave: cheap PIXEL, a good fabric look.
- E14 Lenticular: needs `layer:true` and is cheap per pixel once the reference is rendered, using the Displacement Map plumbing.

## B. Filters: 10, each after the effect(s) it needs

Every name is checked against the 56 shipped, the #912 ten and B8's eight. Effects using CSS filters go first (`js/filters.js:14`), and each filter fades with the container's existing Strength.
**Before shipping, every one must pass:**
- queue 675's distance test;
- 858's every-ingredient-alive test;
- 565's dots test;
- the mono filters must stay distinct from each other on luma.

| Filter | Section | Needs | Recipe (real keys; new-effect keys from §A) |
|---|---|---|---|
| **Terminal** | stylised | Character Art | contrast 1.1 · charart{cell 12, paint Picture, contrast 120} |
| **Colour Lag** | tuff | Colour Delay | contrast 1.1 · saturate 1.15 · colourdelay{red 1, blue 3, mix 0.6} |
| **Rainy Window** | cinematic | Rain on Glass | saturate 0.9 · temperature{amount −15} · rainglass{density 25, size 30, bend 30, fog 6} · vignette{amount 0.3, size 40} |
| **Pool Light** | glow | Water Light | saturate 1.05 · temperature{amount −20} · waterlight{scale 120, amount 22, speed 0.18} (was F02; Detail Duet dropped) |
| **Gold Foil** | vivid | Brushed Metal | contrast 1.08 · brushedmetal{metal 55, rough 50, light 125, colour #e6c36a} |
| **Shards** | stylised | Low Poly | saturate 1.12 · lowpoly{count 220, shade 8} |
| **Dotwork** | mono | Stipple | grayscale 1 · contrast 1.1 · stipple{spacing 5, dot 2, density 60} |
| **Postcard** | stylised | Watercolour | saturate 0.9 · watercolour{wash 7, rim 28, paper 25} · vignette{amount 0.2, size 45} |
| **Folded Print** | retro | Paper Fold + Watercolour | temperature{amount 10} · watercolour{wash 3, rim 15, paper 20, mix 0.35} · paperfold{folds 3, fold 14, shade 18} |
| **Patch** | stylised | Stitched Outline | stroke{width 10, position Outside} (white) · stitch{offset −4, width 3} · dropshadow{distance 6, softness 4, opacity 50}. This is F06 rebuilt. It needs a cutout or text; on a full-frame clip the outline is the frame edge, so say that in the `desc`. |

## C. Upgrades: 6, every default renders byte-identical

The rule is backlog §0.3: a new key's `def` must reproduce today's picture, otherwise all 56 filters move and queue 675 fires. Add `legacy` wherever the shown default differs.

1. **Pixelate: keep the outline** (U01, `js/compositor.js:87`).
   - Control: `keepalpha` "Keep outline" 0–100 (0) %.
   - Blend the block alpha toward the source alpha. Weight the block colour by alpha so edge blocks do not darken.
   - Pixelate is in PIXEL_ADJ, so hide the control on adjustment layers (no alpha there) with `liveWhen` or a note.
   - Cheap.
2. **Mosaic: raised tiles** (U04, 362).
   - Controls: `bevel` "Tile bevel" 0–12 (0) px; `relief` "Bevel contrast" 0–100 (50) % and `light` "Light angle" 0–360 (225) °, both only live when bevel > 0.
   - The distance to the cell edge is analytic for rectangles, so this is cheap, not medium as ChatGPT said.
   - Share the shading helper with backlog 10.7 (Hexagon Tiles "Edge shade").
3. **Dots: offset rows and oval dots** (U07, 374).
   - Controls: `stagger` "Row offset" 0–1 (0); `aspect` "Dot shape" 25–400 (100) %.
   - These reuse the existing key names from Tile Grid (671) and Pixelate (89).
   - Cheap.
4. **Grid: major lines** (U06, 355).
   - Controls: `major` "Bold line every" 0–20 (0, Off); `majorweight` "Bold line weight" 1–5 (2) ×.
   - Ship it in the same release as C33's anti-aliasing fix, so the thicker lines do not stair-step.
   - Cheap.
5. **Contour Lines: accent lines** (U08, 524).
   - Controls: `accent` "Bold line every" 0–12 (0, Off); `accentweight` "Bold line weight" 1–4 (2) ×.
   - Keep the v12.02 fix that sizes the loops by the frame, not the shared buffer.
   - This suits the #954 rename "Topo Lines".
   - Cheap.
6. **Posterize: band offset** (U02, 92).
   - Control: `offset` "Band offset" −0.5..0.5 (0), the same key and label as Contour Strips (822).
   - Shifts the thresholds in both RGB and Luma-only modes. At 0 the old kernel runs unchanged.
   - Already on adjustment layers via PIXEL_ADJ.
   - Cheap.

Not taken:
- U03: low value.
- U05: niche; reserve.
- U09: Inner Blur is already unboundable, and a distance field on top makes it slower.
- U10: Twirl stacked after Tunnel already does it.

## Suggested order

1. **The six upgrades first.** They need no picture-pick, so each ships with a before/after, and they are all cheap.
2. **Draw one #545 options sheet of the first six effects** (Colour Delay, Character Art, Jigsaw, Ink Seep, Rain on Glass, Water Light), rendered through the app on real clips at phone size, and let him pick.
3. **Draw a second sheet for effects 7–12.**
4. **Build each filter only after its effects ship,** and show the filters beside the unpicked #912 ten and backlog B8.
5. **Check CapCut for "Low Poly", "Watercolour" and "Jigsaw"** before they ship.
