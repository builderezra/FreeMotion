# EFFECTS PLAN — the standing build list
Generated 2026-08-06 by two multi-agent audits. **This file is the memory** — the raw
workflow output lived in temp files that get cleaned, so everything needed to continue is here.

## The one rule

**An existing project must render byte-for-byte identically after any of these changes.**
Every new param's fallback must equal the constant currently hardcoded in the implementation,
and the accessor should short-circuit on that value rather than recompute it (see `wCx`/`wCy`/`wR`
in compositor.js, added in v3.87).

### How to verify — do NOT use legacy-vs-explicit-defaults on its own

That test compares the new code against **itself**, so if the upgrade breaks the effect outright
both sides break equally and it reports a false pass. This actually happened in v3.89: `lightglow`
and `darkglow` read the new threshold *above* its own `var` declaration, so it was `undefined`
during the loop, the mask came out all zeros, and both effects rendered nothing at all — while the
identity test happily reported 0 differing bytes.

**Diff against the previous commit instead.** Run this in the browser console with the app open:

```js
// 1. in the repo:  git show HEAD:js/compositor.js > _oldfx.js.txt      (delete it before committing)
const oldSrc = await (await fetch('/_oldfx.js.txt?x=1')).text();
const newSrc = await (await fetch('/js/compositor.js?bust=' + performance.now())).text();
const PRELUDE = `
function hexToRGB(h){h=String(h||'#000000').replace('#','');if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];return [parseInt(h.slice(0,2),16)||0,parseInt(h.slice(2,4),16)||0,parseInt(h.slice(4,6),16)||0];}
function wCx(p,t,W,cx){const v=p.centerx==null?50:FM.evalProp(p.centerx,t);return v===50?cx:W*(v/100);}
function wCy(p,t,H,cy){const v=p.centery==null?50:FM.evalProp(p.centery,t);return v===50?cy:H*(v/100);}
function wR(p,t,maxR){const v=p.radius==null?100:FM.evalProp(p.radius,t);return v===100?maxR:Math.max(1,maxR*(v/100));}`;
const grab = (src, name) => {                       // brace-matched, survives any indentation
  const m = new RegExp('\\n\\s*' + name + ':\\s*function\\s*\\(([^)]*)\\)\\s*\\{').exec(src);
  if (!m) return null;
  let i = src.indexOf('{', m.index + m[0].length - 1), depth = 0, j = i;
  for (; j < src.length; j++) { const c = src[j]; if (c === '{') depth++; else if (c === '}') { depth--; if (!depth) { j++; break; } } }
  return { args: m[1], body: src.slice(i, j) };
};
const mk = (src, n) => { const g = grab(src, n); return g && new Function('FM', PRELUDE + 'return (function(' + g.args + ')' + g.body + ');')(FM); };
const W = 96, H = 96;
const seed = () => { const d = new Uint8ClampedArray(W*H*4); let s = 12345;   // ramp + noise + alpha holes
  for (let i = 0; i < W*H; i++) { s=(s*1103515245+12345)&0x7fffffff; const x=i%W,y=(i/W)|0,r=(x+y)/(W+H)*255;
    d[i*4]=(r*0.9+(s>>7&63))|0; d[i*4+1]=(r+(s>>11&63))|0; d[i*4+2]=(r*1.1+(s>>15&63))|0;
    d[i*4+3]=(x>6&&x<W-6&&y>6&&y<H-6)?255:0; } return d; };
const cnt = (a,b) => { let n=0; for (let i=0;i<a.length;i++) if (a[i]!==b[i]) n++; return n; };
const run = (src,n,p,t) => { const d = seed(); mk(src,n)(d,W,H,p,t==null?0.5:t); return d; };

const LEG = { amount: 0.6 };                        // what a project saved BEFORE the upgrade holds
cnt(run(oldSrc,'myfx',LEG), run(newSrc,'myfx',LEG));          // MUST be 0  — identity vs HEAD
cnt(seed(),  run(newSrc,'myfx',LEG));                         // MUST be >0 — it still does something
cnt(run(newSrc,'myfx',LEG), run(newSrc,'myfx',{...LEG, myNewParam: x}));   // MUST be >0 per control
```

Warp effects use `(x,y,W,H,cx,cy,maxR,p,t)` and return `[x,y]` — sample a grid and require every
point identical rather than diffing bytes.

**Three gates, every effect, every time:** identity vs HEAD = 0 · effect still active > 0 ·
each new control moves pixels > 0. The middle gate is the one that catches this class of bug.

**Watch for degenerate test values** — two v3.89 "failures" were the test, not the code:
`noise` takes amount as **0–100**, not 0–1; and `iridescence`'s hue wraps with period 1.0, so
speed 3 at t=0 vs t=2 is phase 0 vs phase 6 — identical by definition. Use a fractional delta.

## Flagged — do NOT build as proposed

These were disproved by brute-forcing the float maths; the proposals are wrong, not the code.

- **bumpmap `angle` def 225** is NOT legacy-exact: `cos(225°)*SQRT1_2 = -0.5000000000000001`
  but the code hardcodes `-0.5`. Special-case `if (angle === 225) { bmLx = -0.5; bmLy = -0.5; }`.
- **vignette `falloff` on the media path** is not byte-identical — canvas quantises gradient
  stops to 8-bit premultiplied before rasterising, so inserting stops can move a code value.
  Gate it: keep the exact 2-stop path when `falloff === 1`.
- **vignette schema defs change NEW instances.** `fx-registry.js makeInstance` stamps every
  schema `def` into params. Proposed size 45 vs pixel-path legacy 35, falloff 1 vs legacy 1.6.
  Existing projects are safe; a newly added vignette would differ. Decide deliberately.
- **longshadow `angle`** is a rewrite, not a parameterisation (`cos(π/4) !== sin(π/4)`, and it
  re-seeds scanlines along a perpendicular edge). Treat as a from-scratch feature.
- **contrast / grayscale / invert** — proposals rest on an unsound dual-pipeline design. Skip.
- **hextiles `rotation`** — needs a real restructure of a low-impact effect. Skip.

## Genuinely complete with one control (leave alone)

`sepia`, `blur`, `boxblur`, `brightness`, `saturate`, `hue`, `mosaic`, `letterbox`.

## DONE

- v3.87 — twirl, bulge, fisheye, kaleidoscope: centre X/Y + radius (+ phase on kaleidoscope).
- v3.88 — wave (wavelength/phase/vertical), ripple + curl (wavelength/phase/centre),
  rays (x/y/intensity/phase), blocknoise (size/aspect/speed), noise (speed/size/colour).
- v3.89 — lightglow, darkglow, softglow (radius + threshold); clouds (scale/drift/tint);
  iridescence (scale/bands/speed). All of v3.87–v3.89 re-verified against HEAD with the
  harness above: 15 effects, 0 differing bytes each.
- v3.90 — mirror (movable seam, mirror-tiles past the first reflection); vignette (size, each
  path keeping its own legacy fallback 35/45); thermal (6 palettes + low/high); threshold
  (softness + colour either side, and both code paths now share one kernel).
- v3.91 — audio → effect params (see above). Not from the effect list, but it was the
  highest-leverage item in this file.
- v3.92 (round 5) — polarcoords (Direction — the missing polar→rect inverse, verified a true
  inverse: 289 sample points return within 1px), temperature (green↔magenta tint axis +
  preserve-luma), gamma (per-channel R/G/B trims over the master), vibrance, colorize.
- v3.93 (round 6) — spectralmap (span/offset/saturation — the 300–360° hue branch was
  unreachable), exposure (offset + highlight rolloff), colorize (lift + blend mode), duotone.
- v3.94 (round 7) — tint (split-tone), posterize (where the bands fall), gradientmap
  (handover point + dither to kill the banding).
- v4.00 (round 8) — rgbsplit (angle, toward-edges, green shift — written into BOTH the
  per-layer and adjustment-grade paths), pixelate (non-square blocks).
- v4.13 (round 9, the retro-screen family) — scanlines (pitch/line weight/roll), crt (cell
  size + scanline and phosphor-mask split apart), glitch (slices/re-roll Hz/RGB tear),
  dither (cell size, 2x2·4x4·8x8 matrix, mono output). All 12 new defs equal the constants
  they replaced, so makeInstance-seeded NEW instances are byte-identical too — the vignette
  trap flagged above, checked explicitly this round.
- v4.54 (round 10, part 1 — the first NEW effects rather than new params) — **Levels** (#2 on the
  BUILD NEXT table) and **Halation** (#1). Levels is a memoized 256-entry LUT exactly like
  `gradeLUT`, per channel, and is wired into the ADJUSTMENT path too: `applyPixelFx` now falls
  through to `PIXEL_FX` first, which is safe because none of the five existing PIXEL_ADJ types live
  in that map (checked programmatically, not assumed — they all have their own `draw*` functions).
  Halation builds its highlight mask at QUARTER resolution — 130k pixels at 1080p instead of 2M —
  then rides `ctx.filter` for both radii. **Auto-levels from percentiles was dropped**: the param
  schema has no button type to hang a one-tap action on, and a slider labelled "Auto" would be a lie.
  Measured at 1080x1920: Levels 7.98ms, Halation 4.9-7.4ms, against solarize 8.69 / gamma 9.5 /
  vignette 10.3 — both at or below the getImageData floor every effect in that path already pays.
  Identity vs HEAD: 0 differing bytes on the adjustment path and on a mixed pixel/warp/canvas stack.
- v4.55 (round 10, part 2) — **Frame Stutter** (3) and **Shockwave** (4). Frame Stutter keeps its
  held plate in `_mfRec` under a `':fs'` key so it can share a layer with the footage blur without
  either overwriting the other's canvas, and passes onion-skin ghosts straight through. Shockwave
  walks only the annulus bbox. 0.03ms and ~8ms respectively; 0 differing bytes across ten stacks.
- v4.56 (round 10, part 3) — **Speed Lines** (5) and **HSL Bands** (7). Speed Lines needed a change
  from the sketch: the ink cannot be drawn under the layer (a full-frame clip hides it) NOR punched
  straight out of B (that knocks a hole in the picture), so it builds on its own plate and composites
  over — which also makes the Add blend mean "additive against the picture" rather than just against
  itself. HSL Bands' fixed bands are **40 deg wide, not 30**: real skies sit near 215, 25 off the 240
  nominal, and at 30 the default barely moved them. 1.27ms and 6.8ms; 0 differing bytes across
  thirteen stacks.
- v4.57 (round 10, part 4) — **Time Warp Scan** (6) and **Chroma Key Pro** (8). The scan bar needed
  one correction the sketch does not mention: inside the scanned band the frozen frame must REPLACE
  the live one (clearRect then draw), not composite over it — any layer with transparent areas
  otherwise shows its frozen position AND its live one at once, which reads as a ghost. Chroma Key
  Pro is a generic PIXEL_FX, so unlike the shipped Chroma Key it is not media-only. Measured against
  a screen lit 6:1 across the frame: Pro keys 100% of both the lit and the shadowed half while
  keeping 100% of the subject; the RGB-distance key clears the lit half and 0% of the shadowed half
  at its default, and at tolerance 0.75 clears both halves and 100% of the subject with them.
- v4.58 (round 10, part 5) — **Light Wrap** (9). The `_bgSnap` gate is widened as the sketch says,
  but properly: `FM.hasCopyBg` stays what it is (it routes the copybg DRAW branch) and a new
  `FM.needsBgSnap` with a `BG_SNAP_FX` set drives the CAPTURE. Any future backdrop-reading effect
  adds one key. The edge band needs no pixel pass: draw the layer sharp, then subtract a BLURRED copy
  with `destination-out`, which leaves alpha = sharp x (1 - blurred) — zero deep inside, zero outside,
  peaking exactly at the edge. Measured on a dark subject over a warm backdrop: rim luma +56.8,
  core +2.7, outside 0.00; 1.0ms against 0.55ms for the same frame with no effect.
  **NOTE for future canvas effects:** a CANVAS_FX at a no-op setting is NOT byte-identical to having
  no effect at all — Light Wrap at intensity 0 differs by +-1 on 169 antialiased edge pixels, and
  Rounded Corners at radius 0 differs on 192. That is the plate round-trip (rasterise once, then
  blit) and it is inherent to the path, not a bug. Judge a canvas effect's no-op by "confined to the
  antialiased edge, delta <= 1", not by zero.
- v4.60 (round 10, part 6) — **Dispersion** (10) and **VHS Tape** (12). Dispersion needed one thing
  the sketch does not say: do NOT early-out on a transparent source pixel. With that guard the effect
  erodes in place and never blows away — debris has to be allowed to land outside the layer's
  original silhouette, which is the whole difference from Dissolve. Also MIX toward the ember colour
  rather than adding: on a bright subject an additive ember clips all three channels and never
  appears (measured: 0 warm pixels before, 21628 after). VHS's chroma bleed default is 26px, not the
  14 first tried — real colour-under has about a tenth of the luma bandwidth, and 14px at 1080p is
  1.3% of the width, far too subtle to read. 2.25ms and 3.56ms; 0 differing bytes over 19 stacks.
- v4.61 (round 10, part 7 — **the table is CLEARED**) — **Temporal Denoise** (11) and **Compression
  Crunch** (13). Two findings worth keeping:
  * Compression Crunch: flattening the detail INSIDE each tile only softens a gradient. What makes a
    starved encoder band is the DC term losing precision, so the tile MEAN has to snap to a ladder
    too — scaled by flatness so busy tiles keep their true mean. Measured: 172 distinct luma levels
    across a gradient before, 43 after; without the mean quantisation it was 160, i.e. nothing.
  * Temporal Denoise: stash the OUTPUT, not the input. Averaging each frame with the raw previous
    one is a two-tap filter that cannot beat 29% however hard you push it; feeding the result back
    makes it an exponential moving average. Measured 25% grain reduction with zero ghosting, because
    where a block moved its weight is zero and the history contributes nothing. The block-resolution
    mask (a 32-wide grid) is also what makes it cheap — it needs the frame DIFFERENCE, never the
    motion vectors, so it skips the block search entirely.
- v4.62 (round 11, part 1) — **Lens Distortion** and **Pixel Sort**, both off the WORTH DOING LATER
  list. Lens Distortion is written as a PIXEL_FX, not a WARP_FX: the chromatic half needs a different
  sample point PER CHANNEL and the warp path returns one [x,y] for all three. Its `zoom` defaults to
  118 to cover the k1 default — bending a rectangle outward samples from beyond the frame, and
  without the resize the effect lands showing black wedges. Pixel Sort packs brightness into the high
  bits alongside the index and uses the COMPARATOR-LESS TypedArray sort, per this file's perf note;
  verified a sorted row is a pure re-ordering (same colour multiset in and out). 2.5ms each,
  0 differing bytes over 23 stacks.

- v4.63 (round 11, part 2) — **Luma Matte**, plus the pooled scratch this file said to build once.
  The singleton `_dspA/_dspB/_dspM` corruption was REAL and is now measured, not theorised: stacking
  a zero-strength second layer-picker effect changed 5,106 bytes. `dspSlot(W,H)` + `_dspLvl` is the
  fix, same shape as `_pfPool`. **Compound Blur and Match Grade can now be written straight onto it.**
  Luma Matte reads Luma/Alpha/R/G/B with invert, feather and black/white points; a transparent matte
  pixel reads as BLACK, not as "keep", or a small matte shape would keep the whole frame.
  **Warm-up depth matters more than this file said:** ONE throwaway render was not enough for the
  displace path (it allocates three canvases on first use) and reported a false 168-byte difference.
  Warm up 3-4 times on BOTH sides before comparing.

- v4.64 (round 11, part 3) — **Compound Blur** and **Match Grade**, exactly as this file predicted:
  once the pool existed both were straightforward. Compound Blur is a stack of RAMP-masked blur
  levels drawn sharpest-first, not a per-pixel variable-radius kernel; consecutive ramps cross-fade,
  so there is no banding at the level boundaries, and the masks are built at quarter res with the
  bilinear upscale doing the feathering (flag B's fix, and it lands at 2.9ms). Match Grade gathers
  mean/sigma at quarter res — a mean does not need every pixel — and CAPS the contrast gain at 4x so
  a near-flat source cannot explode.
  **Warm-up, again:** cube3d reported a false 162-byte difference at four warm-ups and 0 at six,
  across three passes. Use SIX per side, and re-run any non-zero result before believing it.

  **The BUILD NEXT table is now empty.** All thirteen shipped, v4.54 - v4.61. What remains in this
  file is the "WORTH DOING LATER" list (Luma Matte, Compound Blur, Corner Pin, LUT, Pixel Sort,
  Defocus/Bokeh, Lens Distortion, Match Grade, Stabilize-as-offline-analysis, Curves) and the
  proposal table of per-effect PARAM upgrades, which is where round 11 should start.

## Build order (from the ranking pass)

**Items 2–16 below are all SHIPPED** (v3.87–v3.90) — kept for the exactness notes, which are
the record of why each fallback is byte-identical. Round 9 starts from the proposal table.

2. **wave** — wavelength, phase, vertical. Phase makes the ripple travel; `40/100 === 0.4` exact.
3. **ripple** — wavelength, phase, falloff. Phase marches the rings outward; the point of a ripple.
4. **curl** — wavelength, phase, falloff. Same shape as ripple, near-free once it is done.
5. **mirror** — position. All four branches verified identical at 50% (`2*ax === W`).
6. **vignette** — `size` ONLY this round (see the flag above). Media fallback 45, pixel 35 — they differ today.
7. **rays** — x, y, intensity. `W*0.5 === W/2`. God rays from where the sun actually is.
8. **iridescence** — scale, bands, speed (all in the one expression, compositor.js ~line 1271).
9. **lightglow** — radius, threshold. `60/100*255 === 153` exact. Running-sum box blur, so radius is free.
10. **darkglow** — radius, threshold. `40/100*255 === 102` exact.
11. **softglow** — radius %, threshold. `100/100 === 1`.
12. **noise** — speed, size, colour. `speed 0` freezes the static. Keep grid stride `W` so cell === i>>2 at size 1.
13. **blocknoise** — size, aspect, speed. `aspect 0.15` gives tape-dropout bars.
14. **clouds** — scale, drift, colour. Never reads `t` today. **`p.color || '#ffffff'` is mandatory** — `hexToRGB(undefined)` returns black.
15. **thermal** — palette, low, high. Element 0 of the palette list must stay the exact current STOPS.
16. **threshold** — softness, low colour, high colour. Must be written in BOTH code paths.

Second round: `temperature` (tint axis + preserve luma), `polarcoords` (the Rect→Polar inverse is a
missing half, not a knob), `glow` (stacked drop-shadows for real bloom), `vibrance` (skin/highlight
protection), `gamma` (per-channel), then grid/dots/checker/glass/starfield/grunge/exposure/
gradientmap/colorize/tint/duotone/posterize/rgbsplit/pixelate/bend/squeeze/replacecolor/spotcolor/
lightleak/faded/tealorange/bleachbypass/crossprocess/spectralmap (needs the missing 300-360° hue
branch)/fourcolor/hexarray.

## Full proposal table (all 105 upgrades)

| type | label | impact | what you cannot do today | proposed params |
|---|---|---|---|---|
| `blink` | Blink | high | Every blink in every project is the same hard 50/50 square wave phase-locked to t=0 — you cannot make a short flash, cannot dim instead of vanishing, and two blinking layers can never alternate because there is no phase. | duty (1..99, def 50); phase (0..1, def 0); min (0..100, def 0) |
| `blocknoise` | Block Noise | high | The block is a fixed 6x6 square re-rolled at a fixed 8 Hz — the two numbers that define the glitch are the two you can't touch. | size (1..64, def 6); aspect (0.1..8, def 1); speed (0..60, def 8) |
| `bulge` | Pinch / Bulge | high | The lens is the whole frame, centred — you cannot place a bulge over a subject or size it, which is the only way this effect is ever actually used. | radius (10..200, def 100); centerx (0..100, def 50); centery (0..100, def 50) |
| `bumpmap` | Bump Map | high | The key light is nailed to a single vector (-0.5,-0.5,1) and the relief constant to 4 (js/compositor.js:1267) — I cannot move the light, so every embossed surface in the app is lit from the same top-left corner at the same depth. | angle (0..360, def 225); relief (10..400, def 100); ambient (0..100, def 50) |
| `channelremap` | Channel Remap | high | Completely binary — you get 100% of a channel swap or nothing at all, so it can only ever be a novelty; there is no way to dial in the 25% version that would actually survive into a finished grade. | mix (0..1, def 1); luma (None..None, def 0) [Off, On] |
| `chromakey` | Chroma Key | high | The key is a hard binary cut (dist < tol → alpha 0) with no edge falloff and no spill suppression, so every keyed shot has jagged aliased edges and a green rim — you can only choose how much to cut, never how to cut it. | softness (0..1, def 0); spill (0..1, def 0); match (None..None, def 0) [RGB, Chroma only] |
| `clouds` | Clouds | high | One frozen grey cloud pattern at one fixed size — the noise never moves (t is not even read) and the octave base is hardcoded to 64px. | scale (8..256, def 64); speed (-200..200, def 0); color (None..None, def 0) |
| `crosshatch` | Crosshatch | high | The three hatch tiers fire at hardcoded luminance thresholds of 0.75/0.5/0.25 with 1px strokes on fixed 45°/-45°/0° axes, so the ink density is dictated entirely by the source exposure and the lines vanish at 1080p. | density (0..100, def 50); weight (1..5, def 1); angle (0..90, def 0) |
| `crt` | CRT | high | One 'amount' slider simultaneously drives three unrelated phenomena (scanline darkness 0.45, phosphor mask 0.18, corner vignette 0.55) and the cell size is welded to 1 device pixel, so at 1080p+ the mask is invisible and you can never have scanlines without the colour fringe. | scale (1..8, def 1); scanline (0..1, def 0.45); mask (0..1, def 0.18) |
| `darkglow` | Dark Glow | high | Same fixed geometry as Light Glow — 6px blur radius and a 102 shadow threshold hardcoded at js/compositor.js:1261 — so on anything above SD the halo is too tight to read and the slider just darkens the frame. | radius (1..60, def 6); threshold (0..100, def 40) |
| `dither` | Dither | high | The Bayer cell is locked to one device pixel on a 4×4 matrix in full colour, so at HD+ the pattern vanishes into noise and the iconic 1-bit chunky look is unreachable at any levels setting. | scale (1..16, def 1); matrix (None..None, def 1) [2×2, 4×4, 8×8]; mono (None..None, def 0) [Colour, Mono] |
| `edge` | Find Edges | high | It only ever produces glowing white lines on black at full strength — you cannot invert it to ink-on-paper line art, cannot suppress the grey mush in smooth areas, and cannot lay the edges back over the original image. | polarity (None..None, def 0) [White on black, Black on white]; threshold (0..100, def 0); mix (0..100, def 100) |
| `edgeglow` | Edge Glow | high | The glow's blur radius is hardcoded at 3px, so the halo is always a tight 3px fringe no matter how far you push Amount, and with no threshold every scrap of sensor noise glows along with the real edges. | radius (1..20, def 3); threshold (0..100, def 0) |
| `emboss` | Emboss | high | The light is welded to the top-left at 135° and the kernel runs per channel, so you cannot relight the relief from another direction, cannot get a clean grey metal stamp instead of colour fringing, and cannot emboss the image rather than replace it with grey. | angle (0..360, def 135); mono (None..None, def 0) [Colour, Grey]; blend (0..100, def 100) |
| `fisheye` | Fisheye | high | The lens circle is pinned to the frame's inscribed radius at dead centre, so a fisheye can never be aimed at anything or made into a small glass bubble. | radius (10..200, def 100); centerx (0..100, def 50); centery (0..100, def 50) |
| `fractalwarp` | Fractal Warp | high | The noise field is a fixed-size, fixed-detail pattern that never moves — the one thing a fractal warp is for (organic boiling churn) is impossible, and the feature size cannot be changed. | evolve (0..5, def 0); scale (20..400, def 100); detail (1..3, def 3) |
| `glass` | Glass | high | The jitter is regenerated per individual pixel, which is the one setting where it looks like TV static rather than glass — there is no cell size, no way to reroll the pattern, and no directional (rain-streak) variant. | scale (1..40, def 1); axis (None..None, def 0) [Both, Horizontal, Vertical]; seed (0..999, def 0) |
| `glitch` | Glitch | high | Band count (14), re-roll rate (10 Hz) and RGB split (amount×9) are all hardcoded and welded to one slider, so every glitch in every project is the same 14-slice 10 Hz stutter — you can only make it bigger or smaller. | bands (2..60, def 14); speed (0..30, def 10); split (0..3, def 1) |
| `glow` | Glow | high | It is a SINGLE drop-shadow (js/compositor.js:477), so a wide radius just smears out to nothing — there is no way to make the glow actually bloom, and no way to dial it back short of shrinking it. | intensity (1..6, def 1); opacity (0..100, def 100) |
| `grid` | Grid | high | Line weight is welded to spacing at 6% — a 160px grid is forced to draw 10px-thick lines — and the lines punch in at 100% opacity, axis-aligned only. | thickness (1..50, def 6); mix (0..1, def 1); angle (0..360, def 0) |
| `gridrepeat` | Grid Repeat | high | Rows are welded to columns (always n×n) and every tile is a byte-identical copy butt-joined to its neighbour, so it can only ever make one thing: a square wall of clones. | rows (0..10, def 0); mirror (None..None, def 0) [Off, Mirror X, Mirror Y, Mirror Both]; stagger (0..1, def 0) |
| `grunge` | Grunge | high | The dirt is a single-pixel speckle that always dries to black — at 1080p it looks like compression noise rather than grime, and there's no rust, sepia or soot. | scale (1..24, def 1); darkness (0..1, def 1); color (None..None, def 0) |
| `halftone` | Halftone Dots | high | The screen is locked to a 0° axis-aligned grid with a hardcoded 1.45 dot-gain and forced black-on-white, so you can never get the angled 45° screen every real print halftone uses, never control ink coverage, and never change the dot shape. | angle (0..90, def 0); gain (0.5..2.5, def 1.45); shape (None..None, def 0) [Round, Square, Diamond] |
| `halftonelines` | Halftone Lines | high | The line screen is permanently horizontal with hard-aliased 1-bit edges and a fixed linear tone ramp, so the classic angled/vertical engraving screen and any control over ink weight are simply unreachable. | angle (0..180, def 0); weight (0.2..2.5, def 1); softness (0..4, def 0) |
| `iridescence` | Iridescence | high | The rainbow's band spacing (/120), its cycle count (l*3) and its direction are all constants in one expression (js/compositor.js:1271), and it never moves — so there is exactly one iridescence in the app and the slider only fades it in. | scale (10..600, def 120); bands (0.5..12, def 3); speed (-4..4, def 0) |
| `kaleidoscope` | Kaleidoscope | high | The mirror wedge always starts pointing right from the frame centre, so the pattern cannot be spun (no animated kaleidoscope at all) and the hub cannot be moved onto the subject. | phase (0..360, def 0); centerx (0..100, def 50); centery (0..100, def 50) |
| `lensblur` | Lens Blur | high | It is a flat 16-tap disc AVERAGE — bright points do not bloom into bokeh discs and the aperture is always a perfect circle, so it renders as a slightly nicer Box Blur rather than as a lens. | bloom (0..300, def 0); samples (8..64, def 16); blades (None..None, def 0) [Circle, Hexagon, Pentagon, Square] |
| `lightglow` | Light Glow | high | The blur radius is a flat 6 pixels and the highlight threshold a flat 153 (js/compositor.js:1254) — on a 1080p or 4K frame a 6px bloom is invisible, so the amount slider just brightens the picture rather than glowing it. | radius (1..60, def 6); threshold (0..100, def 60) |
| `lightleak` | Light Leak | high | The leak always enters from the top-right at a fixed size (js/compositor.js:1322 hardcodes 0.85/0.12 and a 1.8 falloff), so it cannot be placed to match where the sun actually is in the shot. | x (0..100, def 85); y (0..100, def 12); size (10..400, def 100) |
| `linearrepeat` | Linear Repeat | high | Hardcoded to the horizontal axis — there is no way to make a vertical or diagonal strip repeat at all, and every copy is an un-mirrored, un-shiftable slab. | angle (0..360, def 0); mirror (None..None, def 0) [Off, On]; phase (0..1, def 0) |
| `longshadow` | Long Shadow | high | The shadow direction is welded to a down-right diagonal by the `lsX++; lsY++` sweep (js/compositor.js:1255) — I cannot throw the shadow left, down, or at any other angle, which is the first thing anyone changes about a long shadow. | angle (0..360, def 45); fade (0..100, def 0) |
| `lumakey` | Luma Key | high | The soft edge is hardcoded to 28 luma units and the key always removes the DARK end, so keying a white/bright background is impossible and a smoke or glow plate cannot get the wide ramp it needs. | softness (0..128, def 28); mode (None..None, def 0) [Remove dark, Remove bright] |
| `mirror` | Mirror | high | The reflection axis is hardcoded to the exact half of the frame, so you cannot choose where the seam falls or get the 4-way mirror that the effect is mostly used for. | position (0..100, def 50); quad (None..None, def 0) [Off, On] |
| `polarcoords` | Polar Coordinates | high | Only the rect-to-polar half of the effect exists — the inverse (polar to rect, the one that unrolls a circle into a strip) is simply missing, and the wrap can neither be rotated nor sized. | mode (None..None, def 0) [Rect → Polar, Polar → Rect]; rotate (0..360, def 0); radius (10..200, def 100) |
| `radialrepeat` | Radial Repeat | high | The fan's seam is nailed to 0° with no way to rotate or animate it, the wedges butt-join instead of mirroring (visible hard seam every segment), and the pattern can only ever be flat. | rotate (-360..360, def 0); mirror (None..None, def 0) [Off, On]; twist (-360..360, def 0) |
| `rays` | Radial Rays | high | The light source is nailed to the exact centre of the frame and the ray strength is a hardcoded 0.6, so the only thing you can change is how many spokes there are. | x (0..1, def 0.5); y (0..1, def 0.5); intensity (0..1, def 0.6) |
| `replacecolor` | Replace Color | high | It only rotates HUE — the To colour's own saturation and brightness are thrown away (js/compositor.js:1333 rebuilds from the SOURCE rcV and rcS), so picking pale pink to replace a saturated red gives me a saturated pink. That is not replacing a colour. | mode (None..None, def 0) [Hue only, Hue + Saturation, Full color]; softness (10..300, def 100) |
| `ripple` | Circular Ripple | high | The 20px ring spacing and zero decay are hardcoded and there is no phase, so the rings never travel outward and never fade — it reads as a static pattern rather than a drop hitting water. | wavelength (2..200, def 20); phase (0..360, def 0); falloff (0..4, def 0) |
| `scanlines` | Scanlines | high | The line pitch is hardcoded to every other row at 1px thick, so at 1080p and above it reads as a flat darkening rather than scanlines, and it can never move. | spacing (2..40, def 2); thickness (1..20, def 1); roll (-20..20, def 0) |
| `sketch` | Pencil Sketch | high | Line darkness is a hardcoded ×510 gain and the paper is always flat 255 white, so Amount can only fade the whole drawing back toward the photo — you cannot make the strokes bolder, cannot clear the grey mud out of smooth areas, and cannot give the paper any tooth. | darkness (100..1200, def 510); threshold (0..100, def 0); tooth (0..100, def 0) |
| `spectralmap` | Spectral Map | high | The spectrum is hardcoded to a 260° sweep starting at red with saturation pinned at full (js/compositor.js:1342) — there is one false-colour map in the app and the slider only fades it, which is useless for the scientific/HUD look it exists for. | span (0..360, def 260); offset (0..360, def 0); saturation (0..100, def 100) |
| `spinblur` | Spin Blur | high | The rotation centre is welded to the frame centre, so you cannot spin the blur around an off-centre wheel, face or logo, and the fixed 9 taps step into discrete ghosts at high amount. | centerx (0..100, def 50); centery (0..100, def 50); samples (3..33, def 9) |
| `spinstreaks` | Spin Streaks | high | The streak centre is welded to the frame centre and the trail falloff is a hardcoded 0.6, so you can neither place the spin on the real subject nor take the streak from a tight ghost to a long comet tail. | centerx (0..100, def 50); centery (0..100, def 50); decay (0..2, def 0.6) |
| `starfield` | Starfield | high | Every star is a single pixel of one flat colour that never changes — at 1080p it reads as sensor dirt and it shimmers to nothing on export. | size (1..8, def 1); twinkle (0..1, def 0); variation (0..1, def 0) |
| `stripes` | Stripes | high | Stripes are locked to a 45° diagonal at a 50% duty cycle mixed at a fixed 0.6 opacity — you can only change how wide they are, never their angle, weight, or solidity. | direction (None..None, def 0) [Diag ↘, Diag ↗, Horizontal, Vertical]; strength (0..1, def 0.6); duty (0.05..0.95, def 0.5) |
| `stroke` | Stroke Color | high | The outline is always outside the shape and always square-cornered (a separable box dilation, i.e. Chebyshev distance), so an inside or centred stroke — the standard choice in every other editor — and a round stroke on curved artwork are both impossible. | position (None..None, def 0) [Outside, Center, Inside]; shape (None..None, def 0) [Square, Round]; softness (0..12, def 0) |
| `temperature` | Color Temperature | high | It only moves the blue↔amber axis (js/compositor.js:1034-1035). Every camera and grading tool pairs that with a green↔magenta tint axis — without it I cannot correct fluorescent or LED footage at all, and warming always brightens the shot. | tint (-100..100, def 0); preserve (None..None, def 0) [Off, On] |
| `textprogress` | Text Progress | high | A typewriter that can only run left-to-right, one code unit at a time, with no caret — you cannot reveal by word (the only sane unit for captions), cannot reveal from the end or the middle, and cannot show a cursor. | dir (None..None, def 0) [Forward, Backward, Centre out]; unit (None..None, def 0) [Characters, Words, Lines]; cursor (None..None, def 0) [None, /, _, ▌] |
| `thermal` | Hot Color | high | One hardcoded six-stop palette (js/compositor.js:1121) and a fixed full-range luma mapping — the amount slider only fades between my footage and that single false-colour look, so every thermal shot in the app is the same image. | palette (None..None, def 0) [Iron, Rainbow, White Hot, Black Hot]; low (0..100, def 0); high (0..100, def 100) |
| `threshold` | Threshold | high | It is hard-wired to pure black and pure white with a 1-pixel aliased step, so any real footage comes out as jagged monochrome you then have to stack a Tint on to colour. | softness (0..1, def 0); color (None..None, def 0); color2 (None..None, def 0) |
| `timecode` | Timecode | high | It can only count up from zero at the clip's start — no start offset (so no 01:00:00:00 broadcast head), no countdown (the single most common use of a timer on social video), and no way to read project time instead of clip time. | offset (0..3600, def 0); dir (None..None, def 0) [Count up, Count down]; source (None..None, def 0) [Clip, Timeline] |
| `twirl` | Twirl | high | The vortex is always centred on the frame and always reaches the far corners, so you cannot spin one small region — e.g. put a twirl on a face. | radius (5..200, def 100); centerx (0..100, def 50); centery (0..100, def 50) |
| `vignette` | Vignette | high | Amount is the only control — the inner radius (0.45 on media, 0.35 on the pixel path), the falloff curve and the shape are all hardcoded, so every vignette in the app is the same ring at a different opacity. | size (0..90, def 45); falloff (0.2..4, def 1); roundness (0..100, def 100) |
| `wave` | Wave | high | One amplitude slider drives a sine whose wavelength (38px), vertical ratio (0.4) and phase are all baked in — you cannot change the wave's size, make it travel, or make it purely horizontal. | wavelength (4..400, def 38); phase (0..360, def 0); vertical (0..200, def 40) |
| `zoomblur` | Zoom Blur | high | The zoom origin is welded to the frame centre, so you cannot aim the rush at the actual subject, and its 9 taps band into visible ghost copies at high amount. | centerx (0..100, def 50); centery (0..100, def 50); samples (4..32, def 9) |
| `zoomstreaks` | Zoom Streaks | high | Rays always emanate from the frame centre and EVERY mid-tone smears, so you get a grey haze over the whole shot instead of light rays coming out of the actual light source. | centerx (0..100, def 50); centery (0..100, def 50); threshold (0..100, def 0) |
| `bend` | Bend | medium | It only bows left/right and the arc always peaks at the vertical midpoint, so you cannot bend a banner up/down or shift where the bow happens. | axis (None..None, def 0) [Horizontal, Vertical]; position (0..100, def 50) |
| `bleachbypass` | Bleach Bypass | medium | The silver-retention desaturation is locked at 0.6 (js/compositor.js:1319), so the amount slider ties colour loss and contrast harshness together — I cannot get the bleached contrast while keeping the colour, which is the whole point of the process. | desat (0..100, def 60); contrast (0..200, def 100) |
| `blur` | Gaussian Blur | medium | Gaussian Blur can only fully REPLACE the picture with a blurred copy — you cannot hold the sharp image and lay softness over it, which is how every diffusion / soft-focus / Orton / bloom look is actually built. | mix (0..100, def 100); blend (None..None, def 0) [Normal, Screen, Lighten] |
| `border` | Border Frame | medium | The frame is welded flush to the very edge of the layer buffer with hard square corners at full opacity, so a matte-style inset frame, a rounded frame, or a subtle translucent one are all unreachable. | inset (0..200, def 0); radius (0..200, def 0); opacity (0..100, def 100) |
| `boxblur` | Box Blur | medium | Box Blur is locked to a perfectly square kernel and a single pass — no horizontal-only smear, no vertical-only smear, and no way to soften its hard boxy falloff. | aspect (0..200, def 100); passes (1..4, def 1) |
| `checker` | Checker | medium | The tint is welded at a 50/50 blend on a perfectly axis-aligned square lattice — no solid checker, no subtle one, no diagonal, no rectangles. | mix (0..1, def 0.5); angle (0..360, def 0); ratio (0.1..4, def 1) |
| `colorize` | Colorize | medium | The tone ramp is hardcoded to `0.25 + 0.75*luma` (js/compositor.js:1246) — the shadow floor and therefore the entire contrast of the wash is fixed — and the colour can only ever replace, never multiply or screen over the image. | lift (0..100, def 25); blend (None..None, def 0) [Tone, Multiply, Screen, Overlay] |
| `contourlines` | Contour Lines | medium | Contours are always hairline-thin black over the untouched image and are traced straight off raw luminance, so a clean topographic map on white is impossible and any real footage shreds into confetti instead of forming contours. | smooth (0..8, def 0); thickness (1..6, def 1); paper (None..None, def 0) [Over image, Lines only] |
| `contourstrips` | Contour Strips | medium | The alternating strong/weak strip opacities (1.0 and 0.4) are hardcoded and the bands always start at pure black, so the recolour is all-or-nothing and always lands in the same places. | mix (0..1, def 1); alternate (0..1, def 0.4); offset (-0.5..0.5, def 0) |
| `contrast` | Contrast | medium | CSS contrast() always hinges on mid-grey and hard-clips, so I can only make the image harsher or flatter — I cannot choose WHERE the contrast pivots or stop the highlights from blowing. | pivot (0..100, def 50); curve (None..None, def 0) [Linear, Filmic S] |
| `crossprocess` | Cross Process | medium | The entire look lives in six hardcoded constants inside `cv()` (js/compositor.js:1321) — amount can only crossfade between my footage and that one fixed C-41 curve. | lift (0..300, def 100); gain (0..300, def 100) |
| `curl` | Curl | medium | The swirl bands are locked to a 40px radial spacing with no phase and no decay, so the pattern can never travel outward or ease off toward the frame edge. | wavelength (5..200, def 40); phase (0..360, def 0); falloff (0..4, def 0) |
| `dissolve` | Dissolve | medium | One static salt-and-pepper pattern, identical in every project and every instance: it always eats the frame uniformly, the holes have hard binary edges, and it never moves. | soft (0..0.5, def 0); direction (None..None, def 0) [Uniform, Left, Right, Up, Down]; speed (0..30, def 0) |
| `dots` | Dots | medium | Dot-to-cell ratio (0.32) and dot opacity (0.85) are both hardcoded, so the only pattern you can make is 'medium dots at 85%', with hard aliased edges. | radius (0.05..0.7, def 0.32); opacity (0..1, def 0.85); softness (0..8, def 0) |
| `duotone` | Duotone | medium | The luma→colour ramp is a straight line (js/compositor.js:2894-2896), so the handover point between shadow colour and highlight colour is fixed — every duotone lands in the same place no matter what the footage looks like. | balance (-100..100, def 0); contrast (0..200, def 100) |
| `exposure` | Exposure | medium | It is a bare multiply (js/compositor.js:1194-1195) that hard-clips at 255, so pushing a stop up smashes the highlights into flat white, and there is no black-point control at all. | offset (-50..50, def 0); rolloff (0..100, def 0) |
| `faded` | Faded Film | medium | One slider drives the black lift, the contrast crush, the desaturation AND the warm cast together (js/compositor.js:1428) — I cannot get milky blacks while keeping the colour, or a faded look that is cool instead of warm. | lift (0..100, def 26); desat (0..100, def 15); tone (-200..200, def 100) |
| `fliplayer` | Flip Layer | medium | It flips in place about the bounds centre and throws the original away, so it can only ever produce 'the same layer, backwards' — it can't hinge a reflection out to one side or build a symmetry composite. | pivotx (0..100, def 50); pivoty (0..100, def 50); keep (None..None, def 0) [Off, On] |
| `fourcolor` | Four-Color Gradient | medium | It lerps the frame straight toward the gradient (js/compositor.js:1339), so at any usable amount it paints over the footage — there is no way to use it as a colour wash on top of an image, which is what a four-colour gradient is for. | blend (None..None, def 0) [Normal, Screen, Multiply, Overlay, Soft Light]; spread (20..300, def 100) |
| `gamma` | Gamma | medium | One master gamma applied to all three channels through a single LUT (js/compositor.js:1029-1031) — I cannot bend the midtones of one channel, which is how every film curve and colour cast is actually built. | red (0.25..4, def 1); green (0.25..4, def 1); blue (0.25..4, def 1) |
| `gradientmap` | Gradient Map | medium | The two colours are joined by a straight line (js/compositor.js:1245), so where the shadow colour hands over to the highlight colour is fixed — and on video the ramp bands visibly with no way to break it up. | midpoint (5..95, def 50); dither (0..100, def 0) |
| `grayscale` | Grayscale | medium | There is exactly ONE black-and-white it can produce — CSS grayscale()'s fixed luma weights (js/compositor.js:474) — so I cannot darken a sky, lighten skin, or separate two colours that happen to share a brightness. | filter (None..None, def 0) [Neutral, Red, Orange, Yellow, Green, Blue] |
| `hexarray` | Hexagon Array | medium | Outline weight is locked to 12% of the cell and the lattice can only sit flat-top and fully opaque, so scaling the hexes always drags the line weight with it. | thickness (0.02..0.5, def 0.12); opacity (0..1, def 1); angle (0..360, def 0) |
| `innerblur` | Inner Blur | medium | Inner Blur drags transparent black in from outside the shape (a dark rim just inside every edge), is stuck on one boxy pass, and can only blur equally on both axes. | edge (None..None, def 0) [Off, On]; passes (1..4, def 1); aspect (0..200, def 100) |
| `innerpinch` | Inner Pinch | medium | The pinch disc is hardcoded at 60% of the frame radius, dead centre, so its size and placement — the only things that matter for a localised pinch — are fixed. | radius (10..150, def 60); centerx (0..100, def 50); centery (0..100, def 50) |
| `letterbox` | Letterbox | medium | It only does black top-and-bottom bars sized by a raw percentage — you cannot ask for 2.39:1, cannot pillarbox a vertical export, and cannot change the bar colour. | aspect (None..None, def 0) [Manual, 2.39:1, 2.35:1, 1.85:1, 16:9, 4:3, 1:1]; bars (None..None, def 0) [Top & Bottom, Left & Right, All sides]; color (None..None, def 0) |
| `mattechoker` | Matte Choker | medium | Erode/dilate runs on whole pixels with a hard square kernel and no post-softening, so a choked matte keeps stair-stepped edges — the standard choke-then-feather workflow needs a second effect stacked on top. | feather (0..20, def 0); contrast (-1..1, def 0) |
| `mattefringe` | Matte Fringe | medium | The fringe is painted as an opaque flat band of colour with a hard inner and outer edge, so it always reads as a pasted-on sticker rather than a rim light. | opacity (0..1, def 1); feather (0..1, def 0) |
| `mirrortile` | Mirror Tile | medium | The mirror seams are welded to the top-left corner of the frame and it always folds on both axes — you cannot choose where the reflection line falls, which is the entire composition of a mirror effect. | offsetx (-400..400, def 0); offsety (-400..400, def 0); axis (None..None, def 0) [Both, Horizontal, Vertical] |
| `mosaic` | Mosaic | medium | Mosaic can only produce square, averaged, gapless blocks — no wide scanline cells, no tile-grid look, and no crisp nearest-neighbour retro pixel sampling. | aspect (25..400, def 100); gap (0..50, def 0); sample (None..None, def 0) [Average, Center] |
| `nightvision` | Night Vision | medium | The tint is hardcoded green (0.2, 1, 0.2) and the sensor noise is a fixed ±30, so every night-vision shot is the same green with the same grain — amber, white-hot or thermal scope looks are impossible. | color (None..None, def 0); noise (0..150, def 60); gain (0.5..3, def 1.3) |
| `noise` | Noise | medium | The static is locked to single pixels re-rolled at exactly 24 Hz in pure greyscale — you cannot freeze it, coarsen it, or get colour snow. | speed (0..60, def 24); size (1..8, def 1); color (0..100, def 0) |
| `posterize` | Posterize | medium | You can only choose how MANY bands — never how strong the effect is, where the bands fall, or whether hue survives the quantise. | mix (0..1, def 1); channels (None..None, def 0) [RGB, Luma]; gamma (0.2..4, def 1) |
| `rgbsplit` | RGB Split | medium | The split is locked to the horizontal axis with green never moving, so you cannot do a vertical/diagonal glitch tear or real lens fringing that grows toward the frame edge. | angle (0..360, def 0); radial (0..100, def 0); green (-40..40, def 0) |
| `sharpen` | Sharpen | medium | Sharpen only ever crunches a 1-pixel halo, at full strength, everywhere — you cannot do wide local-contrast 'clarity', and you cannot stop it amplifying grain in flat sky or skin. | radius (1..8, def 1); threshold (0..64, def 0); mode (None..None, def 0) [RGB, Luma] |
| `smoothedges` | Smooth Edges | medium | Feathering runs as a single symmetric box blur on alpha, so the matte always shrinks into the artwork as you soften it and the falloff is a visibly banded linear ramp — there is no choke to push the edge back out and no smoother quality option. | choke (-100..100, def 0); quality (None..None, def 0) [Linear, Smooth] |
| `softglow` | Soft Glow | medium | The bloom radius is locked to frame/40 and the threshold to a luma of 90 (js/compositor.js:1329), so I can only fade the same diffusion in and out — there is no way to go from a tight sheen to a heavy Vaseline-on-the-lens haze. | radius (10..400, def 100); threshold (0..255, def 90) |
| `solarize` | Solarize | medium | The inversion is a hard per-channel step at full strength — there is no way to soften the flip or dial the effect back, so it is always a 100% harsh colour break. | softness (0..1, def 0); mix (0..1, def 1); mode (None..None, def 0) [RGB, Luma] |
| `spin` | Spin | medium | Speed is the only handle: every spin starts at exactly 0° at the clip's start (two spinning layers can never be offset from each other) and always turns about the bounds centre, so it can't swing a layer around an off-centre pivot. | offset (-360..360, def 0); pivotx (0..100, def 50); pivoty (0..100, def 50) |
| `spotcolor` | Spot Color | medium | Everything outside the kept hue snaps to 100% grey with no partial option, and the kept colour is never boosted (js/compositor.js:1336) — so I can only do the one hard sin-city look, never a subtle partial-desaturate. | desat (0..100, def 100); boost (0..300, def 100); invert (None..None, def 0) [Keep, Remove] |
| `squeeze` | Squeeze | medium | The waist is always at the vertical midpoint and always pinches horizontally, so you cannot squeeze the top of a layer or pinch it along the other axis. | axis (None..None, def 0) [Horizontal, Vertical]; position (0..100, def 50) |
| `tealorange` | Teal & Orange | medium | The split between warm and cool sits permanently at mid-grey (`w=(l-0.5)*2`, js/compositor.js:1320), so whether faces land in the orange half is decided by the footage's exposure, not by me. | pivot (5..95, def 50); spread (10..200, def 100) |
| `textspacing` | Text Spacing | medium | It sets tracking and nothing else, and it always overrides the layer's own spacing rather than offsetting it — word spacing and line height, the other two thirds of typographic control, are unreachable from the effects list. | word (-40..200, def 0); line (-50..200, def 0); mode (None..None, def 0) [Absolute, Add to layer] |
| `tint` | Tint | medium | It washes the WHOLE tonal range toward one colour at once — I cannot tint only the shadows (split-toning) and I cannot shift colour without also flattening the brightness. | range (None..None, def 0) [All, Shadows, Midtones, Highlights]; preserve (None..None, def 0) [Off, On] |
| `tunnel` | Tunnel | medium | The inversion radius is hardcoded at 30% of the frame and the mouth is locked to frame centre, so the tunnel can be neither resized nor aimed at anything. | radius (5..100, def 30); centerx (0..100, def 50); centery (0..100, def 50) |
| `vibrance` | Vibrance | medium | The whole point of vibrance in a real grading tool is that it protects skin tones — this one boosts oranges as hard as everything else (js/compositor.js:1098-1104), so faces go radioactive before the sky is saturated enough. | skin (0..100, def 0); highlights (0..100, def 0) |
| `hextiles` | Hexagon Tiles | low | The hex grid is always pointy-top in a fixed orientation with tiles butted edge to edge, so you cannot get flat-top hexes or the grouted honeycomb/stained-glass look. | rotation (0..90, def 0); gap (0..10, def 0) |
| `invert` | Invert | low | It can only make a full photographic negative — I cannot invert brightness while KEEPING the colours, or invert a single channel. | mode (None..None, def 0) [RGB, Luminance, Red, Green, Blue] |
| `pixelate` | Pixelate | low | Blocks are always square and always hard-edged, so you cannot do wide CRT-style cells or a soft low-res look. | aspect (25..400, def 100); smooth (None..None, def 0) [Blocks, Soft] |

---

# NEW EFFECT IDEAS — triaged

67 raw ideas from six lenses, deduped against the existing 174 effects.

## The highest-leverage change is not an effect — ✅ DONE in v3.91

`audio-react.js:17` — `PROP_OK = {scale, opacity, rotation, x, y}` and `bake()` writes only to
`target.transform[prop]`. Letting it write `layer.effects[i].params[key]` makes a large slice of
the existing 174 effects beat-reactive at once. One function. **Do this first.**

**Shipped.** A bake target is now either a transform prop or `fx:<index>:<key>` (index, not id —
`makeInstance` doesn't stamp ids). The sheet's Property dropdown rebuilds per target layer with an
`<optgroup>` per effect, offering only `keyframable && type === 'range'` controls, and the range/unit
come from the same registry schema the inspector's slider uses. Measured reach: **169 of 174 effects,
365 individual controls.**

## Corrections the judge made

- One lens used a cost model ~3x too pessimistic (double-counted a per-tap figure), which wrongly
  demoted four cheap effects. Corrected: HSL Bands ~4-6ms, VHS Tape ~8-12, Compression Crunch ~8-10,
  Shockwave ~1-2ms.
- **Track mattes are half-shipped already**: masking groups (compositor.js:4206, app.js:1459) plus the
  mask-include/mask-exclude blend modes. Only the LUMA matte, invert-in-group, feather and picking a
  non-adjacent source are genuinely missing.

## Build next

I read the catalogue (174 effects), the four dispatch paths, and the shared machinery the proposals lean on. Findings first, because two of them change the ranking.

---

# What to build, ranked

## Three corrections before the list

**1. "Set Matte" is half-shipped already.** `compositor.js:4206` + `app.js:1459` — a group flagged **"Use as masking group"** takes its top drawable member and clips the rest of the group with `destination-in`. On top of that, the `mask-include` / `mask-exclude` blend modes (`inspector.js:2147`, "Cutout → Stencil / Punch Out") stencil everything below. So *alpha* track mattes exist. What genuinely doesn't exist is the **luma** matte, invert-inside-a-group, feather, and picking a non-adjacent source without restructuring the timeline. Rescoped and demoted accordingly.

**2. Lens 2's cost model is roughly 3× too pessimistic, and it moved four ideas down the list for no reason.** It read the `compositor.js:1273` note ("the per-pixel 9-tap JS loop cost ~28ms/frame at 1080×1920") and then multiplied by another 3 for "phone". But 28ms ÷ 9 taps ≈ 3ms/tap — that comment *is* the phone-ish number, and it matches your 2-6ms/pass calibration. Corrected: HSL Bands ~4-6ms (not 12-18), VHS Tape ~8-12 (not 25), Compression Crunch ~8-10 (not 20), Shockwave ~1-2 (not 3-6). All four are top-tier cheap.

**3. One system change is worth more than any single effect.** `audio-react.js:17` — `PROP_OK = {scale, opacity, rotation, x, y}` and `bake()` writes only to `target.transform[prop]`. Letting it write `layer.effects[i].params[key]` is a change to one function, and it beat-drives Shockwave radius, Dispersion progress, Frame Stutter rate — plus a large slice of the 174 effects you already have. **Do this first. It's half a day.**

---

## BUILD NEXT

Ordered by (impact × cheapness) ÷ risk. Numbers are corrected per-frame cost at 1080×1920 on a phone against a 33ms budget.

| # | Effect | Pitch | Params | Approach | Cost |
|---|---|---|---|---|---|
| 1 | **Halation** | Bright areas bleed a warm red halo — the thing that makes footage read as film instead of video. | amount, threshold, tightness, spread, colour, chroma bias | CANVAS_FX, zero pixel readback. Quarter-res scratch → two self-`multiply` passes isolate near-clipped pixels (L⁴ knee) → `multiply` the halation colour → draw twice under `lighter` with `ctx.filter='blur(r1)'` and `blur(r2)` (~0.008 and 0.05 × minDim, weights 0.65/0.35) → A over the top. The two radii are what `softglow`/`lightglow` structurally can't do. | **2-4ms** |
| 2 | **Levels** | Set a real black and white point per channel — the first move on any flat or washed-out clip. | channel (RGB/R/G/B), in black, in white, gamma, out black, out white | PIXEL_FX, 256-entry LUT memoized on a param signature exactly like `gradeLUT` (`compositor.js:415`). `LUT[v] = outB + (outW-outB)·clamp((v-inB)/(inW-inB))^(1/γ)`. Add one-tap **Auto** seeded from 0.1/99.9 percentiles over every 8th pixel. | **~2ms** |
| 3 | **Frame Stutter** | Choppy 8-12fps stop-motion / anime step — hold each frame, or strobe it on the beat. | rate (1-30), blend, mode (Hold/Strobe/Hold+Trail), duty | CANVAS_FX in `CFX_NO_BBOX`. `q = floor(tl*rate)`; on change, blit A into the hold canvas; output the hold. **Reuse `_mfRec` for the cache** (see the export gotcha below). Rate keyframes through fparam, so 24→6→24 is two keyframes. | **~1ms** |
| 4 | **Shockwave** | A single expanding pressure ring that travels out and leaves frame — the bass drop. | radius, width, strength, rim, chroma, x, y | PIXEL_FX over `d.slice()`. **Iterate only the annulus bbox**, so cost tracks the ring's band, not W×H. `g = exp(-dr²)·(1-dr)` — the asymmetry compresses ahead / stretches behind, which is what reads as pressure. Nothing like `ripple` (an infinite centre-locked standing sine). | **1-2ms** |
| 5 | **Speed Lines** | Tapered manga impact lines from a focal point, with a clear disc around the subject. | count, x, y, inner, length, width, jitter, spin, colour, blend | CANVAS_FX in `CFX_NO_BBOX`, pure path fills. Integer-avalanche hash per line index (same determinism trick as `particles`) → triangle from two base points to one tip; the taper is what makes it ink. Finish with a radial gradient under `destination-out` inside `inner`. `rays` is a per-pixel cosine wash — not remotely this. | **~2ms** |
| 6 | **Time Warp Scan** | A bar sweeps down; everything behind it freezes at the moment it was crossed. | duration, direction, mode, barWidth, barGlow, loop, colour | CANVAS_FX in `CFX_NO_BBOX`, 3 blits + 1 fillRect. Persistent accumulator; on advance, blit **only the strip just crossed** from A. Guard `advance = t > rec.t && (t - rec.t) <= 0.35`, copied from motionflow. | **2-4ms** |
| 7 | **HSL Bands** *(merged: absorbs HSL Secondary)* | Push one colour band's hue, saturation and luminance — the CapCut HSL panel. | band (8 fixed + **Custom**), hue, sat, lum, range; Custom adds centre/width/sat gate/luma gate/show selection | PIXEL_FX, one pass, no slice, no taps. RGB→HSL via max/min. **Early-out `if |dH| > 30·range·1.6 continue`** skips most of the frame. Weight `w = smoothstep(...) · min(1, s·3)` — the saturation term is what keeps skin and neutrals untouched. Folding the Custom band in costs nothing (same pass) and kills the duplicate. | **4-6ms** |
| 8 | **Chroma Key Pro** | A green screen key that survives uneven lighting, with soft edges and no green rim. | key colour (eyedropper), tolerance, softness, despill, edge desat, view matte | PIXEL_FX. Key → YCbCr once outside the loop; per pixel use **chroma-only distance, discard Y** — that alone is why a shadowed screen corner keys like a hotspot, which the shipped RGB-sphere `chromakey` can't do. Two-threshold smoothstep; despill = `G -= (G - max(R,B))·despill`. `FM.eyedropper.pick()` is already wired into the inspector colour control. Leave shrink/grow out — `mattechoker` has it. | **~4ms** |
| 9 | **Light Wrap** | Wraps blurred background light around a keyed subject's edge so it sits *in* the shot. | intensity, radius, reach, mode | CANVAS_FX, all composite ops. Widen the `_bgSnap` gate at `compositor.js:3013`/`4335` to fire for this too, then: blur plate → `destination-in` plate = inner edge band → `source-in` the blurred `_bgSnap` → composite under `lighter`. Every glow you have blooms the layer's *own* pixels; none read the backdrop. | **5-8ms** |
| 10 | **Dispersion** | The layer tears apart and blows away along a noise front with glowing embers — the disintegrate transition. | progress, direction, distance, scale, softness, glow, colour | PIXEL_FX over `d.slice()`. Value noise from the `filmgrain` hash; `e = (progress·(1+soft) − n)/soft`; `e≤0` **continue** (most of the frame early-outs), `e≥1` alpha 0, else displace by `e·distance` and fade. One keyframe pair on `progress` is the whole move. `dissolve`/`blockdissolve` are alpha-only, zero displacement. | **8-12ms avg** |
| 11 | **Temporal Denoise** | Melts grain out of low-light footage where nothing is moving, leaving moving subjects sharp. | strength, motion threshold, spatial, preserve detail | CANVAS_FX. **It only needs `df[]`, not the vectors** — write a cut-down `_mfField` that computes the per-block frame diff and *skips the entire block search*. Build the mask at the block grid's own res (~20×36) and let one `drawImage` bilinear-upscale it; that's the trick that keeps it cheap. Then draw the previous plate at `globalAlpha=strength` through it. | **3-5ms** (see flag D) |
| 12 | **VHS Tape** | Actual tape degradation — colour smears sideways while edges stay sharp, plus a rolling tracking band. | amount, chromaBleed, tracking, trackSpeed, wobble, halo, headSwitch | PIXEL_FX, one row-wise pass over a slice with **O(1) running sums** — no per-pixel taps. The two tells nothing else can make: chroma-only horizontal lag (keep Y at x, take Cb/Cr from a running average offset left) and luma ringing `v += (v − rowAvg5)·halo`. `crt` is a display artifact, `glitch` is digital corruption. | **8-12ms** |
| 13 | **Compression Crunch** | Convincing over-compression — colour degrades into blocks, edges stay razor sharp. | quality, blockSize, chromaBlock, ringing, fry | PIXEL_FX, three linear block passes, no random access. (1) chroma subsample: per tile, mean Cb/Cr + each pixel's **own** Y. (2) luma quantise toward the tile mean, scaled by `(1 − activity/thresh)` so flat areas band and busy areas keep detail. (3) ringing `Y += (Y − tileMean)·ringing`. `mosaic`/`pixelate` destroy luma — the exact opposite of what compression does. | **8-10ms** |

---

## WORTH DOING LATER

| Effect | Why it's bigger |
|---|---|
| **Luma Matte** *(was "Set Matte")* | Alpha mattes already ship as masking groups, so the marginal win is the luma channel + invert + feather + non-adjacent source. Still worth it, but it's no longer the headline gap. **Do not copy `drawDisplaceEffect`'s scratch pattern** — `_dspA/_dspB/_dspM` are module singletons (`compositor.js:1484`), not a depth pool like `_pfPool`. Two layer-picker effects on one layer will corrupt each other. Build the pooled version once and Compound Blur + Match Grade ride it free. |
| **Compound Blur** | Blur by another layer's brightness. Heaviest thing proposed and understated — see flag B. Needs the quarter-res mask fix before it's shippable. |
| **Corner Pin** | The homography solve is 20 lines. The **on-canvas drag handles are the entire job** (`js/point-edit.js` is the pattern), and sliders alone would be unusable. Start the mesh at 8×8, not 12×12 — see flag G. |
| **LUT (.cube)** | The maths is trivial; the cost is a new file-type param, IndexedDB persistence, and a parser eating untrusted text (`storage.js sanitizeImportedLayers` rules apply). A missing LUT id from an imported `.fmproj` must degrade to identity, not throw. |
| **Pixel Sort** | Real look, genuinely expensive, and the sketch's sort is the slow one — see flag E. Burst-use only; ship with density defaulted low. |
| **Liquid Glass** | Hard, and it's the one thing the app's own theme can't reproduce in a comp. Blocked behind the same `_bgSnap` gate as Light Wrap, plus a resolution gotcha — see flag I. Do Light Wrap first; it proves the gate for a quarter of the work. |
| **Defocus / Bokeh** | Correctly diagnosed (`lensblur` averages sRGB, so speculars dissolve), but understated — see flag F. Quarter-res or export-only. |
| **Lens Distortion** | Moderate build, genuinely absent (`fisheye`/`bulge` are ad-hoc, not a k1/k2 polynomial). The radial-CA half also exposes that the shipped `chromaticaberration` fringes frame-centre as hard as the corners, which is physically wrong — but don't "fix" that effect; it would change existing projects. |
| **Match Grade** | The plumbing works, but mean/σ matching disappoints the moment the two shots contain different content (one has sky, one doesn't) — which is most real b-roll. Ship it *after* Levels and HSL Bands, so a bad auto-match has good manual tools to fall back on. |
| **Stabilize** | **Restructure it.** As a live effect it's causal-only with no lookahead, and users will compare it to Warp Stabilizer and find it wanting. As an offline **Analyse** pass over `js/tracker.js`'s frame cache, baking a correction curve, it's a genuinely good feature. Also see flag C — the live version's worst case is exactly its use case. |
| **Curves** | Levels' harder sibling. Needs a whole new curve-editor param type in the registry. Levels gets ~80% of the value with sliders that fit the existing schema. |

---

## NOT WORTH IT

- **Set Matte (alpha channel, as proposed)** — duplicate. Masking groups (`g.maskGroup`) + the Cutout blend modes already do it. Only the luma half survives, above.
- **Posterize Time** — duplicate of Frame Stutter, same mechanism. Also a confusing name collision with the existing `posterize`.
- **HSL Secondary as its own effect** — duplicate of HSL Bands. Same HSV pass, ~70% param overlap; folded in as the "Custom" band for free.
- **Stabilize as a live per-frame effect** — see above; the offline version is the real product.

Nothing in the set is infeasible in 2D canvas. The only true novelty risk is Pixel Sort, and it earns its place as a keyframed burst.

---

## Perf claims I think are wrong

| | Claim | Reality |
|---|---|---|
| **A** | Lens 2: "a bare pixel pass is 15-20ms on a phone" | ~3× over. It double-counted the phone multiplier already baked into the `:1273` measurement. Moves 4 effects up a tier. |
| **B** | Compound Blur "25-30ms" | **Badly understated.** Five full-res alpha buffers = ~40MB of writes + 5 `putImageData` + 5 blurs + 5 masked composites → 60ms+. Fix: build the masks at **1/4 res** and let the bilinear upscale smooth the level boundaries — the same trick `_mfMask` already uses. Lands ~8-12ms. |
| **C** | Stabilize "field cost 8-12ms" | **Understated, and the failure mode is structural.** `_mfField` is affordable *because* `if (d0 <= thrSad) continue` skips static blocks. On handheld footage nothing is static, so all ~700 blocks run the full two-stage search (~20k ops each) ≈ 25-40ms before drawing. Global camera motion doesn't need a ±24 search — write a ±6 field at 96px wide. |
| **D** | Temporal Denoise "10-14ms" | **Overstated — it's cheaper.** It never uses the motion vectors, only `df[]`, which `_mfField` computes *before* the search. A df-only field skips the search entirely: ~3-5ms, less on the static footage it targets. |
| **E** | Pixel Sort "sort with a plain numeric comparator" | Passing a comparator to `TypedArray.sort` drops V8/JSC to the generic slow path. Pack `(255−lum)` for descending and use the **comparator-less** default sort on a `subarray()` — several times faster for free. 25-40ms is otherwise right. |
| **F** | Defocus "15-25ms" | **Understated.** Six skewed DDA walks over a half-res Float32 buffer miss cache on every step, plus two LUT passes and an upsample → 40-70ms. Quarter-res gets near 15ms but chunks the discs. |
| **G** | Corner Pin "5-8ms at 12×12
