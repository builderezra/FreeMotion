# FreeMotion — effects and looks expansion

Design report only, 1 October 2026. Base: `28104a3e83e01ac3880db3fac604a7444c7235aa` (v17.21). Branch: `chatgpt/effects-pack`. No implementation, existing-file edits or release changes.

## Scope, originality and reading

This is **20 new effects, 15 new filter looks, and 10 upgrades**, ranked within each group by estimated creator usefulness. This is a design task, not a defect audit: **severity is low / no existing defect alleged for every proposal**. Each proposal is **UNVERIFIED**: visual quality, performance and creator demand have not been tested. Confidence below means confidence in the proposed implementation approach, not proof of appearance. Names were coined for this report and checked against the supplied project inventories; worldwide name uniqueness is not claimed.

Compared the `EFFECTS` catalogue in `js/compositor.js:51–1556`, filter recipes in `js/filters.js:73–495`, the complete headings/candidates and relevant control batches of `tools/design/plans/2026-09-29-idle-backlog/backlog.md`, the naming inventory `tools/design/954-effect-names.md`, and feature/name searches in `REQUESTS.md` and `audits/*.json`. No previously logged bugs are relisted as upgrade opportunities.

Excluded the backlog's Echo, Star Glow, Film Damage, Bokeh Lights, karaoke captions, Audio Spectrum, Skin Smooth, Shape Wipe, Datamosh, Colour Wheels, Curves, HSL Mixer, Clarity/Dehaze, Venetian Blinds, Radio Waves, Lens Magnifier, Oil Paint, Corner Pin and LUT import. Excluded its eight filter recipes and the ten #912 looks awaiting a decision. Existing colour grading, halos, spatial RGB offsets, particle fields and simple repeated layers are not renamed here and counted as inventions. Related techniques are explicitly distinguished below.

The report does not select or implement a UI option from the backlog's approval workflow. These are candidates for that later design stage.

## Shared specification

- Control notation is **`key | label | min..max | default | unit`**. Ranges are inclusive. Integer counts/seeds use step 1; continuous controls use an appropriate fine slider step. References use N/A bounds because they are layer IDs, not numbers.
- Every **new effect E01–E20** additionally has `mix | Mix | 0..1 | 1 | ratio`. Mix 0 bypasses without allocating. Every item lists all its other controls. Numeric appearance controls can be keyframed unless stated otherwise; selectors/seeds/reference IDs change discretely. “Animates” distinguishes motion built into time from animation requiring keyframes.
- Pseudocode is architectural, **not callable application code**. `v(key)` means `FM.evalProp(p[key], t)` with catalogue defaults; `src` is the input plate at the current stack position. Helpers such as `traceAlpha` and `sampleEarlier` are proposed work, not existing APIs. A `PIXEL` sketch corresponds to `function(d,W,H,p,t)`; `CANVAS` sketches use bounded pooled plates and project-space geometry. Preserve input alpha unless explicitly making a matte/reveal; premultiply for filtering and composite correctly.
- All px values are **project pixels**, converted through the existing plate-scale conventions. Never assume viewport pixels equal export pixels. Procedural fields use deterministic hashes and absolute/local clip time, not accumulating frame state or `Math.random()`.
- Costs: **cheap** = one small geometry pass or pointwise mapping; **medium** = a bounded neighbourhood pass, cell aggregation or moderate geometry; **heavy** = multiple source renders, iterative image processing or large mesh/contour work. These are rough relative costs at equal dimensions, **UNVERIFIED**, not milliseconds. Heavy effects need bounded working resolution and user-visible quality tradeoffs if preview differs.
- Cache only immutable/derived work; key it by source revision, dimensions, scale, parameters and sampled time as applicable. Bound memory and clear on project departure. Source-reference effects must refuse self/cyclic references and pass through with a useful message if the source is missing.
- Upgrade defaults must take the exact existing rendering branch. New filter recipes must use the original children unchanged unless their new controls are explicitly set. `js/filters.js:510–524` validates through the schema: `const inst = FM.fxRegistry.makeInstance(def.type);` and `if (!pd) return;`. Register/schema/sanitizer/adjustment-layer support must therefore accompany future implementation; merely pasting these recipes into filters.js would not work.

## A — 20 new effects, ranked

### E01 · Borrowed Grain (`borrowedgrain`)

Transfers the fine surface texture of another image onto the current clip while retaining the current clip's broad colour and lighting. Useful for putting real paper, fabric or stone texture onto titles and product footage.

Controls: `source | Texture layer | N/A..N/A | none | layer ID`; `radius | Detail scale | 1..80 | 12 | px`; `amount | Texture depth | 0..100 | 35 | %`; `balance | Light/dark balance | -100..100 | 0 | %`.

Sketch: `CANVAS: donor=renderReference(source,t); detail=logLuma(donor)-blur(logLuma(donor),radius); out=src.rgb*exp(amount*.01*asymmetric(detail,balance)); preserveAlpha(src); mixResult();`

Animates: keyframe scale/depth/balance; moving reference follows time. Cost **heavy**. Confidence **medium**. Distinct from global statistical Match Grade: reference `js/compositor.js:1538`, `{ type: 'matchgrade', label: 'Match Grade', layer: true, ... }`; this transfers spatial high frequencies, not average colour/contrast.

### E02 · Edge Accord (`edgeaccord`)

Makes opposite borders meet smoothly so a texture can repeat without a visible hard seam. Useful before Tile Grid, with a visible tradeoff between seam removal and changes near the borders.

Controls: `band | Blend border | 0..40 | 12 | %`; `axis | Join edges | 0..2 | 0 | enum: 0 both,1 left/right,2 top/bottom`; `detail | Keep fine detail | 0..100 | 70 | %`.

Sketch: `PIXEL: low=blur(src,bandDerivedRadius); matched=periodicBoundaryBlend(low,band,axis); out=matched+detail*.01*(src-low); retainAlpha(); mixResult();` Cache the correction for still sources; compute horizontal and vertical correction with a corner-consistent periodic blend.

Animates: keyframed border/detail; no autonomous motion. Cost **medium**. Confidence **medium**. Anchor `js/compositor.js:668`, `{ type: 'gridrepeat', label: 'Tile Grid', ... }`. It repairs the source tile's boundary; it does not add another repetition generator or the backlog's edge sampling mode.

### E03 · Ink Arrival (`inkarrival`)

Reveals a title or photo through branching capillary channels, like ink travelling through paper. The edge forks around dry islands instead of moving as a straight wipe.

Controls: `progress | Spread | 0..100 | 45 | %`; `grain | Fibre size | 4..100 | 24 | px`; `branch | Branching | 0..100 | 65 | %`; `seed | Pattern | 0..9999 | 17 | integer`.

Sketch: `CANVAS: field=cachedShortestPathArrival(hashResistanceGrid(seed,grain,branch),centreSeed); matte=smoothstep(progress-eps,progress+eps,1-normalise(field)); out=src*matte;` Cap the field at 256×256; no evolving simulation history.

Animates: keyframe Spread 0→100; explicitly return transparent/original at endpoints. Cost **medium** after field generation. Confidence **medium**. Anchor `js/compositor.js:654`, `{ type: 'wipe', label: 'Wipe', ... }`. Unlike planned Gradient Wipe, it generates a branching travel-time field internally rather than reading a supplied map.

### E04 · Rainheld Glass (`rainheldglass`)

Shows the clip through curved water beads on a pane, with small inverted/reflected highlights. Beads remain attached to the pane while the scene moves behind them.

Controls: `density | Beads | 0..100 | 35 | %`; `size | Bead diameter | 3..100 | 24 | px`; `bend | Refraction | 0..100 | 55 | %`; `slide | Downward travel | 0..200 | 0 | px/s`; `seed | Pattern | 0..9999 | 8 | integer`.

Sketch: `WARP: cell=seededBeadCell(projectXY,seed,size,density); normal=sphericalCapNormal(cell,absoluteSlide(t)); uv+=normal.xy*bend; sampleBilinear(src,uv); shadeThinRim();` Use a bounded neighbouring-cell search and wrap bead travel deterministically.

Animates: optional downward travel; all appearance values keyframeable. Cost **medium**. Confidence **medium**. Anchor `js/compositor.js:1398`, `{ type: 'weather', label: 'Snow & Rain', ... }`. This refracts source imagery through attached lenses; weather particles do not.

### E05 · Threadmark (`threadmark`)

Sews a dashed thread around a cutout or title silhouette, including inner holes. It looks like a stitched badge rather than a smooth outline.

Controls: `length | Stitch length | 2..40 | 9 | px`; `gap | Stitch gap | 1..30 | 5 | px`; `width | Thread width | 1..12 | 3 | px`; `hue | Thread hue | 0..360 | 42 | degrees`; `progress | Sewn | 0..100 | 100 | %`.

Sketch: `CANVAS: paths=traceAlpha(src,.5); resampleArcLength(paths); drawTangentStitches(length,gap,width,hue,progress); compositeOver(src);` Bound contour point count; include holes and deterministic contour ordering.

Animates: keyframe Sewn for a write-on; no automatic clock. Cost **heavy** on changing silhouettes, **medium** with cached contours. Confidence **medium**. Anchor `js/compositor.js:432`, `{ type: 'stroke', label: 'Stroke Colour', ... }`. Different from the planned rectangular Border Frame dash/draw-on controls: this follows arbitrary alpha contours.

### E06 · Paper Hinges (`paperhinges`)

Folds the picture along several creases, alternating raised and recessed panels. A flat poster can open like a folded leaflet without becoming separate layers.

Controls: `folds | Creases | 1..12 | 3 | count`; `depth | Fold amount | 0..80 | 28 | degrees`; `angle | Crease direction | 0..180 | 90 | degrees`; `shade | Fold shading | 0..100 | 35 | %`.

Sketch: `CANVAS: mesh=splitQuadAtParallelCreases(folds,angle); hingeAlternatePanels(mesh,depth); projectWithFixedPerspective(); textureTriangles(src); shadeNormals(shade);` Zero fold amount bypasses; retain a padded projected bound.

Animates: keyframe fold amount/direction; crease count discrete. Cost **heavy**. Confidence **medium**. Anchor `js/compositor.js:996`, `{ type: 'pagecurl', label: 'Page Curl', ... }`. Multiple articulated hinges differ from a single curling page or the planned single-quad Card Flip.

### E07 · Pocket Puzzle (`pocketpuzzle`)

An image assembles from recognisable interlocking puzzle pieces. Pieces translate and turn into their original positions, leaving actual gaps until they arrive.

Controls: `progress | Assemble | 0..100 | 60 | %`; `columns | Pieces across | 2..12 | 5 | count`; `travel | Scatter distance | 0..800 | 160 | px`; `turn | Scatter rotation | 0..180 | 35 | degrees`; `seed | Layout | 0..9999 | 4 | integer`.

Sketch: `CANVAS: pieces=cachedSharedEdgePuzzlePaths(columns,aspect,seed); for each piece: clipSharedTabPath(); transform(hashScatter(piece)*(1-progress)); drawSourceRegion();` Neighbouring tabs share the same curve; cap total pieces at 144 and antialias clipped edges.

Animates: keyframe Assemble; endpoints fully absent/assembled. Cost **heavy**. Confidence **medium**. Anchor `js/compositor.js:636`, `{ type: 'blockdissolve', label: 'Block Dissolve', ... }`. Interlocking rigid pieces with rotation are not block alpha thresholding.

### E08 · Time Prism (`timeprism`)

Splits motion into coloured moments: red, green and blue show slightly different times while their spatial alignment remains unchanged. Static images remain unchanged at equal channel gains.

Controls: `redtime | Red delay | 0..250 | 70 | ms`; `greentime | Green delay | 0..250 | 0 | ms`; `bluetime | Blue delay | 0..250 | 130 | ms`.

Sketch: `TEMPORAL: R=sampleEarlier(t-redtime/1000); G=sampleEarlier(t-greentime/1000); B=sampleEarlier(t-bluetime/1000); out.rgb=(R.r,G.g,B.b); out.a=currentAlpha;` Sample the upstream stack only; prevent recursion and clamp source times to clip bounds. Needs an explicit bounded temporal-sampling path, not seeking the live playback video three times.

Animates: yes with moving footage or upstream animation; delays keyframeable. Cost **heavy**. Confidence **low** until temporal access is designed. Anchor `js/compositor.js:81`, `{ type: 'rgbsplit', label: 'RGB Split', ... }`. RGB Split is spatial; this is channel-specific time sampling, not the backlog's whole-image Echo copies.

### E09 · Typefield (`typefield`)

Rebuilds the image from small characters whose ink coverage follows brightness. It can make footage look like a moving terminal print without changing actual text-layer content.

Controls: `cell | Character size | 6..48 | 14 | px`; `colour | Source colour | 0..100 | 100 | %`; `invert | Light characters | 0..1 | 0 | toggle`; `ramp | Glyph family | 0..2 | 0 | enum: 0 punctuation,1 digits,2 blocks`.

Sketch: `CANVAS: atlas=coverageSortedGlyphAtlas(bundledFont,ramp); per cell: mean=integralRGBA(src); glyph=coverageLookup(mean.luma,invert); tintGlyph(mean.rgb,colour);` Cache atlas by font readiness/scale; use area averages, not one unstable sample.

Animates: source-driven; cell/colour keyframeable, ramp discrete. Cost **medium**. Confidence **high**. Anchor `js/compositor.js:194`, `{ type: 'halftone', label: 'Halftone Dots', ... }`. Glyph-shape coverage is a different visual primitive from circles or palette dither.

### E10 · Foil Current (`foilcurrent`)

Adds a brushed foil reflection that bends along a chosen grain direction. It is intended for packaging, logo and jewellery-like title treatments, rather than a rainbow wash over the whole frame.

Controls: `angle | Brush direction | 0..180 | 25 | degrees`; `rough | Roughness | 1..100 | 40 | %`; `light | Light position | 0..360 | 120 | degrees`; `metal | Foil amount | 0..100 | 65 | %`.

Sketch: `PIXEL: tangent=orientedFineGrain(projectXY,angle); spec=anisotropicLobe(tangent,light,rough); out=metallicReflectance(src,spec,metal); preserveAlpha();` No alpha expansion; use a deterministic cached grain tile.

Animates: keyframe Light position for a sweep; no built-in motion. Cost **medium**. Confidence **medium**. Anchor `js/compositor.js:557`, `{ type: 'iridescence', label: 'Iridescence', ... }`. Brush-oriented specular reflection differs from angle-dependent rainbow colour; it is also not a star-shaped highlight streak.

### E11 · Woven Memory (`wovenmemory`)

Turns the picture into interlaced coloured warp and weft threads. Alternate thread crossings cast tiny shadows so the image reads as fabric rather than lines drawn over a photograph.

Controls: `pitch | Thread spacing | 3..32 | 9 | px`; `weave | Crossing pattern | 0..2 | 0 | enum: 0 plain,1 twill,2 basket`; `relief | Thread relief | 0..100 | 35 | %`; `fray | Edge fibres | 0..100 | 12 | %`.

Sketch: `PIXEL: cell=projectXY/pitch; over=weaveParity(cell,weave); colour=areaSampleSourceThread(over); shadeCylindricalThread(relief); addSeedlessCoordinateFibres(fray);` Respect source coverage rather than filling transparent areas.

Animates: keyframe spacing/relief; source-driven. Cost **medium**. Confidence **medium**. Anchor `js/compositor.js:831`, `{ type: 'crosshatch', label: 'Crosshatch', ... }`. This constructs over/under coloured surfaces, not luminance-dependent ink hatching.

### E12 · Water Lantern (`waterlantern`)

Projects moving networks of bright pool-light caustics onto the picture. The picture itself stays in place; only the illumination changes.

Controls: `scale | Light-cell size | 10..400 | 90 | px`; `focus | Light concentration | 0..100 | 65 | %`; `speed | Flow | 0..2 | .25 | cycles/s`; `amount | Light amount | 0..100 | 30 | %`.

Sketch: `PIXEL: phase=integral(speed,t); J=analyticWaterRayJacobian(projectXY/scale,phase); light=boundedInverseDeterminant(J,focus); out=screenLinear(src,light*amount);` Use a finite analytic wave field and cap singular peaks.

Animates: autonomous deterministic flow; speed 0 freezes. Cost **medium**. Confidence **medium**. Anchor `js/compositor.js:208`, `{ type: 'ripple', label: 'Circular Ripple', ... }`. It modulates illumination through ray concentration rather than warping the source with rings.

### E13 · Pigment Shore (`pigmentshore`)

Paints the image as wet washes with dark pigment collecting at colour boundaries. Soft pools keep their irregular edges rather than turning into a generic blur.

Controls: `spread | Wash spread | 1..40 | 10 | px`; `rim | Pigment rim | 0..100 | 40 | %`; `paper | Paper resistance | 0..100 | 30 | %`; `seed | Paper pattern | 0..9999 | 3 | integer`.

Sketch: `PIXEL: coarse=downsamplePremul(src); repeat fixed 6 passes: anisotropicDiffuse(coarse,resistance(seed,paper),spread); rimField=boundedPigmentAccumulation(coarse); upsampleAndBlend(rim);` Recompute from source, never from the previous output frame.

Animates: source-driven and keyframes; seed discrete. Cost **heavy**. Confidence **low** until visual prototype. Anchor `js/compositor.js:972`, `{ type: 'sketch', label: 'Pencil Sketch', ... }`. Wet pigment transport is different from Pencil Sketch and the planned sector-averaging Oil Paint.

### E14 · Turning Portrait (`turningportrait`)

Combines two images in a lenticular print that switches as the virtual viewing angle changes. Fine ribs separate the views during the transition.

Controls: `source | Second picture | N/A..N/A | none | layer ID`; `view | Viewing angle | -90..90 | -25 | degrees`; `pitch | Lens rib width | 2..40 | 8 | px`; `bleed | View overlap | 0..100 | 12 | %`.

Sketch: `CANVAS: B=renderReference(source,t); rib=fract(projectX/pitch); aperture=lenticularAperture(rib,view,bleed); out=lerpPremul(src,B,aperture);` Fixed layer-relative bounds; no device-orientation permissions.

Animates: keyframe Viewing angle; both sources may move. Cost **heavy**. Confidence **medium**. Anchor `js/compositor.js:1248`, `{ type: 'displacemap', label: 'Displacement Map', ... }`. This composites two optical views, not one displaced picture or a reveal to transparency.

### E15 · Facet Ledger (`facetledger`)

Approximates the image with uneven triangles that become denser near detail. It keeps important features more recognisable than a uniform mosaic.

Controls: `count | Facets | 32..1200 | 280 | count`; `detail | Follow detail | 0..100 | 65 | %`; `shade | Facet shading | 0..100 | 15 | %`; `seed | Tessellation | 0..9999 | 11 | integer`.

Sketch: `CANVAS: points=seededFeatureWeightedSamples(referenceFrame,count,detail); mesh=Delaunay(points); cacheTopologyForSourceRevision(); each triangle: fill(areaMean(currentSource),normalShade(shade));` Fix topology from the clip's first available frame so it does not flicker; live topology regeneration is out of v1.

Animates: colours follow video; count/detail/seed are discrete rebuild controls, shade animates. Cost **heavy**. Confidence **medium**. Anchor `js/compositor.js:362`, `{ type: 'mosaic', label: 'Mosaic', ... }`. Adaptive triangles and stable feature-guided topology differ from square/hex/Voronoi cells.

### E16 · Flow Etch (`flowetch`)

Draws fine engraved lines that curve along the shapes inside the image. Faces and fabric gain directional strokes instead of a fixed crosshatch grid.

Controls: `length | Stroke reach | 2..60 | 18 | px`; `spacing | Line spacing | 2..20 | 5 | px`; `contrast | Ink contrast | 0..100 | 60 | %`; `smooth | Direction smoothing | 0..20 | 4 | px`.

Sketch: `PIXEL: tangent=smoothedStructureTensor(src,smooth); paper=deterministicNoise(projectXY,spacing); ink=boundedLineIntegral(paper,tangent,length,maxTaps=16); out=inkWeightedBySourceLuma(contrast);` Resolve the tangent's sign consistently and retain source alpha.

Animates: source-driven; all controls keyframeable. Cost **heavy**. Confidence **medium**. Anchor `js/compositor.js:831`, `{ type: 'crosshatch', label: 'Crosshatch', ... }`. Unlike Crosshatch, the local line direction follows image structure.

### E17 · Drift Cutout (`driftcutout`)

Makes pixels transparent when they match an earlier frame, leaving changing parts visible. Useful for locked-camera movement overlays; camera movement also becomes visible and is not automatically removed.

Controls: `lag | Compare earlier | 20..500 | 100 | ms`; `threshold | Change needed | 0..100 | 12 | %`; `softness | Matte softness | 0..100 | 20 | %`; `expand | Matte expansion | -10..20 | 1 | px`.

Sketch: `TEMPORAL: ref=sampleEarlier(t-lag/1000); delta=linearRGBDistance(src,ref); matte=smoothThreshold(delta,threshold,softness); matte=morphology(matte,expand); out.a*=matte;` Use exact earlier-time sampling, no stateful frame cache dependency.

Animates: inherent with changing footage; parameters keyframeable. Cost **heavy**. Confidence **low** until the temporal source path exists. Anchor `js/compositor.js:1522`, `{ type: 'lumamatte', label: 'Luma Matte', ... }`. This extracts temporal change; it is not luminance keying or a promised AI subject cutout.

### E18 · Detail Duet (`detailduet`)

Colours fine texture separately from broad forms, so hair or lettering can carry one tint while large surfaces carry another. Unlike ordinary duotone, two equally bright areas can get different colours if their detail differs.

Controls: `radius | Detail scale | 1..80 | 14 | px`; `fineHue | Fine-detail hue | 0..360 | 195 | degrees`; `broadHue | Broad-form hue | 0..360 | 32 | degrees`; `colour | Tint amount | 0..100 | 35 | %`.

Sketch: `PIXEL: low=blur(src,radius); energy=abs(luma(src)-luma(low)); w=softNormalise(energy); tint=lerpHue(broadHue,fineHue,w); out=preserveLumaChromaTint(src,tint,colour);` No sharpening or automatic haze removal.

Animates: keyframes and source-driven texture. Cost **medium**. Confidence **medium**. Anchor `js/compositor.js:119`, `{ type: 'duotone', label: 'Duotone', ... }`. Distinct from planned Clarity/Dehaze: separates where colour is applied, not local contrast.

### E19 · Scatter Ink (`scatterink`)

Draws the image using irregularly placed ink dots, with more dots in darker areas. There is no square halftone screen or repeating ordered-dither tile.

Controls: `spacing | Average spacing | 2..30 | 6 | px`; `dot | Ink diameter | 1..12 | 2 | px`; `detail | Dark-area density | 0..100 | 70 | %`; `seed | Dot layout | 0..9999 | 5 | integer`.

Sketch: `CANVAS: candidates=cachedPoissonCandidates(spacing,seed,bounds); each candidate: opacity=smoothAccept(1-localMeanLuma(src),hashRank,detail); drawCoverageDot(dot,opacity);` Fix candidate locations over time and vary coverage smoothly; cap dots at 50,000.

Animates: source-driven; spacing/seed discrete rebuilds, dot/detail animatable. Cost **heavy**. Confidence **medium**. Anchor `js/compositor.js:194`, `{ type: 'halftone', label: 'Halftone Dots', ... }`. Irregular point placement and source-dependent density distinguish it from the planned CMYK cell averages and blue-noise quantization dither.

### E20 · Focus Beacon (`focusbeacon`)

Marks fine, high-contrast detail with a coloured overlay so a creator can inspect which areas are sharp. It is an image diagnostic, not autofocus or proof that a subject is in focus.

Controls: `sensitivity | Detail sensitivity | 0..100 | 55 | %`; `width | Mark width | 1..6 | 2 | px`; `hue | Mark hue | 0..360 | 110 | degrees`; `opacity | Mark opacity | 0..100 | 80 | %`.

Sketch: `PIXEL: energy=multiscaleHighFrequency(src); mark=thresholdEnergy(energy,sensitivity); mark=dilate(mark,width); compositeConstantHueOverOriginal(mark,opacity);` Label explicitly that this is an effect and therefore exports if left enabled; no hidden preview-only state.

Animates: follows footage; controls keyframeable. Cost **medium**. Confidence **high**. Anchor `js/compositor.js:228`, `{ type: 'edge', label: 'Find Edges', ... }`. The new purpose is thresholded focus inspection over the intact image, using multiscale fine detail rather than a full edge-map replacement.

## B — 15 new filters / looks, ranked

These are **proposed recipes dependent on A**, not claims of 15 ready-to-add library entries. Each is a normal editable filter container. `recipe(...)` means `effects:[{type,params},...]`; named effect IDs refer to A. Each filter inherits `strength | Strength | 0..1 | .7 | ratio`. Other controls below are **existing child controls exposed by opening that child**, not a proposal for new macro-control UI; `child.key` identifies the exact child. All are UNVERIFIED, severity low/no defect, confidence **medium** unless noted. For every filter, the integration anchor is `js/filters.js:7–10`: “A filter here is DATA, not code” and “becomes an ordinary filter container”.

### F01 · Linen Daybook
Soft printed fabric colour for travel clips and simple titles, with visible interlacing and gentle contrast. Controls: `wovenmemory.pitch | Thread spacing | 3..32 | 10 | px`; `wovenmemory.relief | Relief | 0..100 | 18 | %`. Sketch: `recipe(contrast{amount:1.06}, wovenmemory{pitch:10,relief:18,weave:0,fray:5})`. Animates with source/keyframes; **medium**.

### F02 · Poolside Letter
Clean lettering or product footage lit by slow reflections from water, with a restrained cool/warm separation in fine detail. Controls: `waterlantern.amount | Water light | 0..100 | 18 | %`; `waterlantern.speed | Flow | 0..2 | .18 | cycles/s`; `detailduet.colour | Colour split | 0..100 | 12 | %`. Sketch: `recipe(detailduet{radius:18,fineHue:195,broadHue:35,colour:12}, waterlantern{scale:120,amount:18,speed:.18})`. Autonomous light flow; **heavy** combined passes.

### F03 · Parcel Foil
A warm brushed-metal print that catches a narrow moving reflection, suited to packaging and logo reveals. Controls: `foilcurrent.light | Reflection | 0..360 | 125 | degrees`; `foilcurrent.metal | Metal | 0..100 | 45 | %`. Sketch: `recipe(contrast{amount:1.08}, foilcurrent{angle:20,rough:55,light:125,metal:45})`. Keyframe reflection; **medium**.

### F04 · Window Keepsake
A photo seen through still condensation, with enough refraction to feel tactile without turning into a rainstorm. Controls: `rainheldglass.density | Beads | 0..100 | 22 | %`; `rainheldglass.bend | Refraction | 0..100 | 25 | %`. Sketch: `recipe(saturate{amount:.92}, rainheldglass{density:22,size:34,bend:25,slide:0,seed:8})`. Source-driven or keyframed; **medium**.

### F05 · Ink Postcard
Soft pigment pools and darker edges turn stills into a printed travel illustration, without the pencil outlines of the planned Pencil look. Controls: `pigmentshore.spread | Wash | 1..40 | 7 | px`; `pigmentshore.rim | Pigment edge | 0..100 | 28 | %`. Sketch: `recipe(saturate{amount:.9}, pigmentshore{spread:7,rim:28,paper:24,seed:3})`. Source-driven; **heavy**, confidence **low** until E13 is rendered.

### F06 · Wound Badge
A colourful sewn border around a cutout with a subtle cloth face. Controls: `threadmark.width | Thread width | 1..12 | 3 | px`; `threadmark.hue | Thread hue | 0..360 | 42 | degrees`; `wovenmemory.relief | Cloth relief | 0..100 | 12 | %`. Sketch: `recipe(wovenmemory{pitch:6,relief:12,fray:0,mix:.25}, threadmark{length:9,gap:5,width:3,hue:42,progress:100})`. Sewn progress can animate inside E05; **heavy** on changing alpha. Requires a cutout/title to show the border clearly.

### F07 · Terminal Orchard
Colourful moving character art, retaining more of the source palette than a monochrome terminal. Controls: `typefield.cell | Character size | 6..48 | 13 | px`; `typefield.colour | Source colour | 0..100 | 75 | %`. Sketch: `recipe(contrast{amount:1.1}, typefield{cell:13,colour:75,invert:0,ramp:0})`. Source-driven; **medium**. Not the backlog's green four-colour pixel look.

### F08 · Quiet Coppercut
Warm monochrome engraved strokes that follow the scene's forms, with calmer broad shapes. Controls: `flowetch.length | Stroke reach | 2..60 | 14 | px`; `flowetch.contrast | Ink | 0..100 | 48 | %`; `detailduet.colour | Copper tint | 0..100 | 28 | %`. Sketch: `recipe(flowetch{length:14,spacing:5,contrast:48,smooth:4}, detailduet{radius:12,fineHue:25,broadHue:35,colour:28})`. Source-driven; **heavy**. Different construction from the existing Copperplate colour recipe, not another sepia treatment.

### F09 · Facet Almanac
Large coloured facets with extra detail around features, suitable for poster-like music visuals. Controls: `facetledger.count | Facets | 32..1200 | 220 | count`; `facetledger.detail | Detail priority | 0..100 | 75 | %`. Sketch: `recipe(saturate{amount:1.12}, facetledger{count:220,detail:75,shade:8,seed:11})`. Stable topology, changing source colours; **heavy**.

### F10 · Chromatic Footfall
Restrained coloured time separation around moving subjects with otherwise natural colour. Controls: `timeprism.redtime | Red delay | 0..250 | 35 | ms`; `timeprism.bluetime | Blue delay | 0..250 | 65 | ms`. Sketch: `recipe(timeprism{redtime:35,greentime:0,bluetime:65,mix:.45})`. Inherent temporal motion; **heavy**, confidence **low** until E08's temporal path exists. Different from Nightdrive's spatial glitch/chromatic recipe.

### F11 · Rainlit Foil
A metallic surface viewed through sparse water beads, like a reflective label photographed after rain. Controls: `foilcurrent.metal | Metal | 0..100 | 30 | %`; `rainheldglass.bend | Water bend | 0..100 | 20 | %`. Sketch: `recipe(foilcurrent{rough:65,metal:30,angle:15,light:110}, rainheldglass{density:15,size:26,bend:20,slide:0,seed:21})`. Keyframe reflection, source-driven beads; **heavy** combined passes.

### F12 · Puncture Press
Loose irregular ink dots form a monochrome print with soft tonal transitions. Controls: `scatterink.spacing | Dot spacing | 2..30 | 5 | px`; `scatterink.dot | Ink size | 1..12 | 2 | px`; `scatterink.detail | Dark density | 0..100 | 60 | %`. Sketch: `recipe(grayscale{amount:1}, scatterink{spacing:5,dot:2,detail:60,seed:5})`. Source-driven coverage; **heavy**. Not fixed-grid Newsprint or binary ordered dither.

### F13 · Paperlight Fold
An image on a gently folded print, with a faint pigment edge that makes it feel physically printed. Controls: `paperhinges.depth | Fold | 0..80 | 12 | degrees`; `pigmentshore.rim | Print pooling | 0..100 | 15 | %`. Sketch: `recipe(pigmentshore{spread:3,rim:15,paper:12,seed:3,mix:.35}, paperhinges{folds:2,depth:12,angle:90,shade:18})`. Keyframe Fold; **heavy**, confidence **low** until pigment/mesh preview.

### F14 · Woven Neon Note
Bright fine-detail colour is woven into a darker cloth-like picture, for graphic performance clips. Controls: `detailduet.fineHue | Detail hue | 0..360 | 290 | degrees`; `detailduet.colour | Tint | 0..100 | 48 | %`; `wovenmemory.pitch | Threads | 3..32 | 8 | px`. Sketch: `recipe(contrast{amount:1.12}, detailduet{radius:10,fineHue:290,broadHue:195,colour:48}, wovenmemory{pitch:8,weave:1,relief:20,fray:0,mix:.45})`. Source-driven; **heavy**. Colour is selected by detail frequency, not the existing Neon Night palette alone.

### F15 · Sandglass Type
Warm character art interrupted by small refracting beads, like a digital poster behind textured glass. Controls: `typefield.cell | Type size | 6..48 | 18 | px`; `rainheldglass.bend | Glass bend | 0..100 | 15 | %`; `detailduet.colour | Warm detail | 0..100 | 18 | %`. Sketch: `recipe(typefield{cell:18,colour:30,ramp:1,invert:0}, detailduet{radius:8,fineHue:32,broadHue:42,colour:18}, rainheldglass{density:12,size:20,bend:15,slide:0,seed:2})`. Source-driven; **heavy**. Start below full filter Strength for readable faces.

All recipes list CSS-family effects first where used, matching `js/filters.js:14–19`: “CSS-FILTER EFFECTS ARE LISTED FIRST.” Unspecified child values take the proposed A defaults. Any filter's opacity animation uses its existing Strength, not an unimplemented extra container macro. Future visual comparison must use several real clips and text/alpha examples; names alone do not establish that two looks are distinguishable.

## C — 10 upgrades, ranked

These are **new control groups**, not replacement names for existing effects. All remain UNVERIFIED, severity low/no defect. Controls listed here are additions; existing controls stay. At all new defaults the old kernel must run unchanged, so existing projects, built-in looks and exported renders retain their current appearance. Confidence **high** means the added control is a small well-defined operation, not that it was tested.

### U01 · Block Silhouette — Pixelate upgrade
Keep the silhouette crisp while pixelating the picture inside it, useful for logos and portrait cutouts. Add `keepalpha | Original silhouette | 0..100 | 0 | %`. Sketch: `old=pixelate(src); out.rgb=old.rgb; out.a=lerp(old.a,src.a,keepalpha/100);` Use premultiplied colour correction, not a raw alpha swap. Animates: keyframeable; **cheap** incremental cost; confidence **high**. Anchor `js/compositor.js:87–90`: `{ key: 'smooth', label: 'Edges', def: 0, options: [[0, 'Blocks'], [1, 'Soft']] }`. This separates silhouette coverage from the existing block-edge softness and planned warp sampling.

### U02 · Band Dial — Posterize upgrade
Move tonal band boundaries without changing the number or spacing of bands, allowing deliberate alignment with a face or sky. Add `phase | Band phase | -50..50 | 0 | %`. Sketch: `if phase==0: oldKernel(); else quantiseWithShiftedThresholds(src,levels,gamma,phase/100,channels); preserveEndpoints();`. Animates: keyframeable, stepped tone changes intentional; **cheap**; confidence **high**. Anchor `js/compositor.js:96`: `{ key: 'gamma', label: 'Band spacing', min: 0.2, max: 4, step: 0.05, def: 1 }`. Phase shifts thresholds; it does not duplicate the spacing control or planned Tone Curve editor.

### U03 · Relief Quiet — Bump Map upgrade
Choose how much fine texture contributes to the apparent relief so compression noise does not become tiny bumps. Add `normalblur | Smooth relief input | 0..20 | 0 | px`; `detailmix | Original fine relief | 0..100 | 0 | %`. Sketch: `height=lerp(blur(luma(src),normalblur),luma(src),detailmix/100); normal=gradient(height); existingLighting(normal);` Only use the new branch when normalblur>0. Animates: keyframeable; **medium**; confidence **high**. Anchor `js/compositor.js:509`: `{ key: 'relief', label: 'Relief depth', min: 10, max: 400, step: 5, def: 100, unit: '%' }`. This is normal-field smoothing, not another depth or ambient slider.

### U04 · Raised Tiles — Mosaic upgrade
Give each existing mosaic tile a small lit rim, making it read as a ceramic surface. Add `bevel | Rim width | 0..12 | 0 | px`; `relief | Rim contrast | 0..100 | 0 | %`; `light | Rim light angle | 0..360 | 225 | degrees`. Sketch: `base=oldMosaic(); edge=cellSignedDistance(); rimNormal=gradient(edgeProfile(bevel)); shadeOnlyTileRim(base,rimNormal,relief,light);`. Animates: keyframeable; **medium**; confidence **high**. Anchor `js/compositor.js:365`: `{ key: 'gap', label: 'Gap', min: 0, max: 50, step: 1, def: 0, unit: '%' }`. Bevel shading differs from increasing empty gaps or the planned Hexagon Tiles grout.

### U05 · Colour Threshold Trio — Solarize upgrade
Let colours turn over at different brightnesses for controlled photographic colour reversals. Add `redshift | Red threshold offset | -50..50 | 0 | %`; `greenshift | Green threshold offset | -50..50 | 0 | %`; `blueshift | Blue threshold offset | -50..50 | 0 | %`. Sketch: `thresholdRGB=clamp(threshold+offsetRGB/100); oldSolarizePerChannelWithThresholds(thresholdRGB);` Offsets apply only in Each colour mode; disable them in Brightness mode. Animates: keyframeable; **cheap**; confidence **high**. Anchor `js/compositor.js:133`: `{ key: 'mode', label: 'Flips on', def: 0, options: [[0, 'Each colour'], [1, 'Brightness']] }`. Adds independently located reversals, not another global threshold.

### U06 · Survey Lines — Grid upgrade
Emphasise every fifth or tenth line to make graph-paper and technical-layout treatments. Add `majorEvery | Major line interval | 0..20 | 0 | count, 0 off`; `majorWeight | Major line multiplier | 1..5 | 2 | ratio`. Sketch: `base=oldGrid(); if majorEvery>0: major=(cellIndex % majorEvery==0); weight=major?thickness*majorWeight:thickness; drawGrid(weight);`. Animates: weight keyframeable, interval discrete; **cheap**; confidence **high**. Anchor `js/compositor.js:357`: `{ key: 'thickness', label: 'Line weight', min: 1, max: 50, step: 1, def: 6, unit: '%' }`. Different from the backlog's antialiasing fix: this supplies hierarchical spacing.

### U07 · Offset Beads — Dots upgrade
Offset alternate dot rows and stretch each dot into an oval, for more varied patterned backgrounds. Add `rowshift | Alternate row offset | 0..100 | 0 | % of spacing`; `dotAspect | Dot width/height | 25..400 | 100 | %`. Sketch: `uv.x-=oddRow*rowshift*spacing/100; sdf=ellipseDistance(localCell, radius*dotAspect/100,radius); oldSoftDot(sdf);`. Animates: both keyframeable; **cheap**; confidence **high**. Anchor `js/compositor.js:376`: `{ key: 'radius', label: 'Dot size', min: 0.05, max: 0.7, step: 0.01, def: 0.32 }`. No new particle system or source-dependent halftone mode.

### U08 · Contour Accents — Contour Lines upgrade
Make selected brightness contours heavier, as on a topographic map. Add `accentEvery | Accent interval | 0..12 | 0 | count, 0 off`; `accentWidth | Accent multiplier | 1..4 | 2 | ratio`. Sketch: `band=contourBand(luma,levels); width=thickness*(accentEvery>0&&band%accentEvery==0?accentWidth:1); existingContourKernel(width);`. Animates: width keyframeable, interval discrete; **cheap**; confidence **high**. Anchor `js/compositor.js:527`: `{ key: 'thickness', label: 'Line weight', min: 1, max: 6, step: 1, def: 1, unit: 'px' }`. This varies contour importance, not the existing uniform thickness or palette.

### U09 · Clear Rim — Inner Blur upgrade
Keep a narrow strip of original detail next to the silhouette while blurring the interior, useful for lettering and graphic cutouts. Add `rim | Clear edge width | 0..40 | 0 | px`; `falloff | Edge transition | 0..20 | 0 | px`. Sketch: `blurred=oldInnerBlur(); dist=distanceInsideAlpha(src); w=smoothstep(rim,rim+falloff,dist); out=lerp(src,blurred,w);` At rim=falloff=0 use old output directly. Animates: keyframeable; **heavy** when alpha changes, **medium** with cached distance field; confidence **medium**. Anchor `js/compositor.js:806`: `{ key: 'edge', label: 'Ignore outside', def: 0, options: [[0, 'Off'], [1, 'On']] }`. That controls sampling outside the layer; this preserves an explicit inside rim, without changing the existing hidden-colour/bleed contract.

### U10 · Corkscrew Mouth — Tunnel upgrade
Twist only the inward part of the tunnel while keeping the outside image in place. Add `twist | Interior turn | -360..360 | 0 | degrees`; `reach | Twist falloff | 10..100 | 60 | %`. Sketch: `uv=oldTunnelMap(xy); theta+=twist*pow(clamp(1-r/mouthRadius),100/reach); sampleWithExistingEdgePolicy(src,polarToXY(r,theta));`. Animates: keyframeable; **cheap** incremental warp cost; confidence **medium**. Anchor `js/compositor.js:1194`: `{ key: 'radius', label: 'Mouth size', min: 5, max: 100, step: 1, def: 30, unit: '%' }`. Different from a standalone Twirl: the falloff lives in the tunnel's mapped interior and preserves its outer frame.

## Recommended delivery order

Creator-value ranking is a design judgment, not user research. Start with a small visible choice sheet: **E01 Borrowed Grain, E03 Ink Arrival, E05 Threadmark, E04 Rainheld Glass**, plus **F01 Linen Daybook, F03 Parcel Foil, F07 Terminal Orchard** as representative finished looks. F01/F03/F07 require E11/E10/E09 respectively, so they cannot precede those dependencies in implementation.

For inexpensive upgrades, start **U01, U02, U03, U05**. Keep **E08/E17** behind a proper deterministic temporal-source design, and **E13** behind a visual proof that pigment transport looks good. No design should be described as built or scheduled merely because it is listed here. Before implementation, repeat the inventory comparison against the then-current branch because the other sessions continue adding controls.
