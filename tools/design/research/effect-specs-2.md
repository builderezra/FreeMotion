# R4: ten MORE effect specs (#966, "as much choice as possible"), on the corrected R3 method

Against `origin/main` 2e3fd7a9 (v17.25; app code the same as v17.24 for the files cited). Specs only: nothing in the app, tests or tools was changed. **Read** = I read the line on this tree. **Computed** = I ran the arithmetic in Python. **Guess** = not measured. Line numbers are `js/compositor.js` unless a file is named. The touch points (row, `POSTFX`, kernel table, `moverSource`, search words, menu category, tile picture, fingerprint) are exactly the table at the top of `research/effect-specs` (R3, with the QF4 fixes); I do not repeat it, only what is different here.

## Three corrections to R3's method that apply to every spec below
1. **Test 482 does NOT cover `CANVAS_FX`.** R3's touch point 3d says every new type must draw something at its defaults "or 482 goes red". That test (`tests/tests.js:75286`) walks `FM._pixelFx` (the 105 pixel kernels, called `P[type](d, W, H, params, t, 1)` at t = 0, 0.33, 0.71, **no layer**) and `FM._warpFx` (21), then asserts both walks happened. A `CANVAS_FX` kernel (every mover and every effect that draws copies: R3's T1 to T5 and T8, and my S3, S5, S8, S9, S10) is **never visited**, so nothing enforces a visible default for them. Each spec below therefore carries its own default-visibility test built on the suite's `cfxRun` helper (`tests/tests.js:48597`, which calls `f(A, B, W, H, bb, params, 0.5, tl)` with **`layer`, `ps`, `expand`, `scene` all undefined**, so a kernel must treat `ps` as 1 (`ps > 0 ? ps : 1`, as Vignette does at `:12563`) and survive no layer). I recommend a third sweep in 482 over `FM._FX_TABLES.CANVAS_FX` (not done, it is a test change; **one hour**).
2. **A clock-driven effect must not be identity at the moment the test (and a new user) first looks.** 482 samples t = 0, 0.33, 0.71 and `cfxRun` uses `tl = 1` by default. An auto-animating effect whose phase is 0 at `tl = 0` shows nothing in the browser's first frame, which is when a beginner judges it. Every auto-animating spec below has a non-zero starting phase or a visible state at `tl = 0`, stated in its Default line.
3. **The clip clock is `tl = FM.fxLocalTime(layer, t)`** (`js/scene.js:799`: `t - (_clipStart ?? start) + fxTimeOffset`), passed to every `CANVAS_FX` as the 8th argument. For anything that needs the clip's END (S8, S9), the length is `_clipDuration ?? duration`, **unioned across the split lineage** exactly as Frame Stutter's Build-up does (`:7643-7650`, the `fdE` loop over `layer.splitOf`), or a clip cut in two ramps twice. Group proxies carry fake `start`/`duration` (`:18541`), which is why `_clipStart` exists.

## What I checked is NOT already there (so none of these is a duplicate)
Searched `FM.EFFECTS` (206 rows), `FM.EFFECT_PRESETS` (12: five Shake looks, Zoom Hit, Glitch Pop, Focus Pull, Pixel Reveal, Untwist In, Neon Flicker, Chroma Drift, `js/fx-presets.js`), the 46 filter looks (`js/filters.js`) and the text Animate presets (`js/inspector.js:5738`: Fade in, Fade up, Typewriter, Pop, Slide in, ...), and R3's ten. Word searches over `js/*.js` for `oil`, `kuwahara`, `painterly`, `censor`, `soften skin`/`beauty`, `pop art`/`warhol`, `power off`, `glitter`, `punch in`, `colour cycle`: no hits.

**Considered and dropped, with the reason (so nobody re-proposes them):**
| idea | why not |
|---|---|
| Cartoon | the **Comic Ink** filter already is it: contrast, Posterize 5, Find Edges multiplied over (`js/filters.js:147`) |
| Shine / sheen sweep | **Glow Scan** is one (speed, width, angle, Loop/Once, wait between sweeps, "Sweeps across: Layer", `:7971` "the shine lands when the title does") |
| Spotlight | **Vignette** has Centre X/Y, Size, Roundness, Feather, Mode (`:12559`); at Size 15 and Amount 0.9 it is a spotlight. Ship as a preset, not an effect |
| Bokeh | **Particles** has Circle, Add blend, size and opacity ramps; the only gap is a soft-disc shape, which belongs in R3 T8's palette work as one more `shape` option |
| Floor reflection | **Card Flip** with Keep = Yes and the Y pivot at 100% draws the mirrored copy (`:13513-13524`); only fade, gap and ripple are missing, so add them there as params later |
| Underwater, 8-bit game, neon sign | each is a stack of existing effects (Wave + Tint + Ripple; Pixelate + Palette Map; Edge Glow): presets |
| Echo trails | needs the `_mflow` history (`:12249`); R1 already flagged the preview-versus-export risk |

## The ten
Ranked by what a CapCut or Alight Motion beginner reaches for first. Params: `key` range, default, unit. "Px" values are project pixels and are multiplied by the plate scale `ps` (a half-size preview must match the export, R3's scale-invariance test).

**S1. Soften Skin** (`softskin`, `PIXEL_FX`, menu `blur`; CapCut "Smooth", R1 #19)
- Params: `amount` 0-1 def **0.6**; `radius` 1-20 px def **6**; `keep` 0-100 def **40** (how much edge detail survives); `only` options 0 Everything / 1 Skin tones def **0**.
- Kernel (O(N), stateless): blur a copy with three box passes (`boxesForGauss`, `:1914`), then `out = mix(orig, blurred, w)` where `w = amount * (1 - smoothstep(0, thr, |luma(orig) - luma(blurred)|))` and `thr = 4 + keep * 0.9`. Small differences (pores, noise) get the blur, large ones (eyes, lips, hair line) keep the original. With `only = 1`, `w` is also multiplied by a soft skin mask (hue 0-50 degrees, saturation 0.15-0.7, feathered).
- **Trap (Read, `:8319-8330`, the Inner Blur note): never rewrite RGB where alpha is 0.** A neighbourhood kernel writes colour into fully transparent pixels and a later pass picks it up; skip `a == 0` pixels on read and on write, so the outside of a cut-out is bit-for-bit what it was.
- **No face detection exists in the app, so "Everything" is the honest default;** the skin mask is a colour guess and will also soften a wooden table. Say so in the tile's hint.
- Cost **Guess**: one blur plus one pass, about Unsharp Mask's cost (`:7530`); measure at 1080x1920 before shipping and use the 16 MB scratch cap rule (#1010) for the blur copy.
- Tests: gate 3 per control; `amount 0` equals the input within 0 bytes; **alpha-0 pixels unchanged to the byte**; a noisy flat patch loses variance while a hard edge keeps over 80% of its step; scale invariance.

**S2. Censor** (`censor`, `CANVAS_FX`, menu `blur`; "blur a face or a number plate", the commonest beginner privacy need)
- Params: `style` options 0 Pixelate / 1 Blur / 2 Black bar def **0**; `shape` 0 Box / 1 Oval def **0**; `x`,`y` 0-100 % of the layer's box def **50 / 40**; `w`,`h` 5-100 % def **40 / 25**; `strength` 4-80 px def **18** (block size, or blur radius); `feather` 0-40 px def **0**. `x,y,w,h` keyframable so a box can follow a moving face.
- Kernel: build the region inside `bb`, draw `A`, then re-draw only the region from a processed copy (`ctx.clip()` to the box or oval). The pixel grid must be anchored to `bb`, **not to the frame**, or the blocks shimmer when the clip moves (Vignette handles the same plate offsets with `A.__fmOX/__fmOY`, `:12563`). Pixelate through the existing `pixelate` kernel maths (`FM._pixelFx.pixelate`), blur through `drawBlurredNoFilter` (`:1971`, which already has the no-`ctx.filter` fallback).
- Why not a mask: masks (`js/masks.js`) cut the layer, they cannot blur INSIDE a shape, so today it takes duplicate, mask, effect, align (four steps).
- **Guess:** whether a beginner will keyframe the box by hand; the motion tracker (`js/tracker.js`) writes layer keyframes and I did not check it can drive effect params. If not, that is the follow-up that makes this one useful for faces.
- Default visible: a 40x25 % pixelated patch in the middle. Test: pixels outside the region are byte-identical to the input; inside differs; Oval leaves the box corners untouched.

**S3. Hop** (`hop`, `CANVAS_FX`, a mover: **draw from `moverSource`**, `:12400`)
- Params: `height` 0-600 px def **120**; `speed` 0.2-4 Hz def **1**; `rest` 0-0.8 def **0.2** (share of each cycle on the ground); `squash` 0-1 def **0.3**; `repeat` options 0 Loop / 1 Once def **0**; pivot is fixed at the bottom centre of `bb`.
- Motion from `tl`: `u = frac(tl * speed)`; in the air for `u < 1 - rest`, `v = u / (1 - rest)`, rise `h * 4v(1 - v)`; scale `sy = 1 + 0.25 * squash * sin(pi v)` in flight (stretch), and a squash `sy = 1 - 0.5 * squash * w`, `sx = 1 + 0.35 * squash * w` where `w` is a smooth pulse over 8% of the cycle around landing. Once: stop at the first landing.
- At `tl = 0` the layer is on the ground and the first hop starts at once, so `tl = 1` (the test default) is mid-air. Not Squish (that is a wall impact, tags at `:282`), not Pulse's "Bounce" wave (a size pulse, `:1137`), not the keyframe ease "Bounce".
- Tests: peak height equals `height * ps` within a pixel; the layer is back on the ground at every integer cycle; `squash 0` keeps the scale at exactly 1.

**S4. Colour Cycle** (`huecycle`, `PIXEL_FX`, menu `color`; the "rainbow" strobe)
- Params: `speed` 10-720 deg/s def **90**; `phase` 0-360 deg def **60** (rule 2: so the first frame is already shifted); `style` options 0 Smooth / 1 Stepped def **0**; `steps` 2-12 def **6** (Stepped: the hue jumps this many times a revolution, the disco flash); `boost` 0-1 def **0.2** (saturation lift so greys take colour).
- Kernel: `deg = phase + speed * tl` (Stepped: floor to `360 / steps`), then the standard hue-rotate matrix on the pixel buffer (the constants the CSS `hue-rotate()` function defines, written like the saturate matrix in `cpuColourOps`, `:1953-1962`); `boost` as `vibrance` (`:5930`). **Hue Shift has no JS kernel to reuse:** it is a CSS filter string, `hue-rotate(Ndeg)` built at `:2278`, which is also why it cannot be animated by a speed. Pure function of `tl`.
- Hue Shift is one static angle; a loop needs two keyframes plus Loop, which no beginner finds. This is the one-tap version. **Guess:** a flicker-warning note on Stepped above about 3 flashes a second (photosensitivity), as a hint under the control.
- Tests: `speed 0, boost 0` against a canvas drawn with `ctx.filter = 'hue-rotate(<phase>deg)'` on the same source, within 2 levels per channel (the two matrices are the same maths but one is the browser's and one is mine, so not 0 bytes, **Guess** that 2 is enough: measure first); two `tl` one cycle apart give identical pixels.

**S5. Punch In** (`punchin`, `CANVAS_FX`, a mover: `moverSource`)
- Params: `every` 0.5-10 s def **2**; `zoom` 100-300 % def **125**; `snap` 0-0.4 s def **0.08** (0 = a hard jump cut); `pattern` options 0 Alternate (1x, zoom, 1x, zoom) / 1 Climb (each punch bigger, then reset) def **0**; `pivotx`,`pivoty` 0-100 % def **50 / 40** (a talking head's face sits above centre).
- From `tl`: `k = floor(tl / every)`; the zoomed state is `k` odd (Alternate) or `1 + (k mod 4) * (zoom - 1) / 3` (Climb); the change eases over the last `snap` seconds of the previous window, scale about the pivot via `moverSource`.
- The jump-cut punch-in is the standard talking-head edit and nothing here does it: Pulse is a smooth wave (`:14205`, row `:1136`), Zoom Hit is a one-off preset. At `tl = 0` it is 100%, so the visible default depends on `tl >= every`: **the Default line is `every = 2`, first punch at 2 s**; the test uses `tl = 2.5`.
- Tests: scale is exactly 1 for `tl < every - snap` and exactly `zoom/100` mid-window; Climb never exceeds `zoom`; pivot is the fixed point.

**S6. Oil Paint** (`oilpaint`, `PIXEL_FX`, menu `stylize`)
- Params: `radius` 1-8 px def **3**; `detail` 0-1 def **0** (0 = pure painting, 1 = the original back); `punch` 0-1 def **0.3** (saturation lift, paintings are richer).
- Kernel: Kuwahara, four quadrant means and variances per pixel, output the mean of the lowest-variance quadrant. **Trap (Computed):** do not build global integral images in Float32: a 1080x1920 sum of luma squared reaches about 1.3e11 and a Float32 holds 24 bits, so the variance (a difference of two huge sums) is noise; Float64 fixes it and costs **83 MB** (5 tables, Computed) which is the #1095 retention problem again. Use **separable running box sums over each pixel's own (r+1)x(r+1) window** (small numbers, exact in Float32), two scratch rows, no whole-frame tables.
- Cost **Guess**, O(N * r); measure at r 3 and r 8 on 1080x1920 and say so on the tile if over 150 ms. Skip alpha-0 pixels (S1 trap).
- Tests: a flat colour is unchanged; a hard edge stays hard (the Kuwahara property, unlike a blur); `detail 1` equals the input to the byte.

**S7. Glitter** (`glitter`, `CANVAS_FX`, menu `stylize`, `color: true`, `defColor '#ffffff'`)
- Params: `spacing` 20-200 px def **60**; `size` 4-60 px def **14**; `threshold` 0-100 % def **55** (how bright a pixel must be to sparkle); `speed` 0.2-6 Hz def **1.5**; `points` options 0 Four / 1 Six / 2 Eight def **0**.
- Kernel, **stateless**: a hash grid of cells `spacing * ps`; each cell has one candidate point at a hashed offset (the hash of cell coordinates, **never `Math.random`**); it draws only if the layer's luma there exceeds `threshold`; its brightness is `max(0, sin(2 pi (speed * tl + hashPhase)))^3`; draw a star (core dot + two or three thin additive strokes) at a hashed size 0.5 to 1 times `size`. Alpha-0 candidates never draw, so sparkles stay on the subject.
- Not Starfield (random dots filling the frame, `:6972`), not Lens Flare (one light), not Particles (emitted and moving). The gap is sparkle that follows what is BRIGHT in the picture, the glitter filter every beginner app has.
- **Guess:** 55% suits most footage; a dark clip shows nothing, so the tile hint says "lower Threshold on dark shots" (the default test needs a bright patch; `cfxSource`'s orange block is luma about 0.7, enough).
- Tests: deterministic (two renders identical); the same `tl` one cycle apart identical; every star centre sits on a pixel above the threshold; none on alpha 0.

**S8. Pop In/Out** (`popinout`, `CANVAS_FX`, a mover: `moverSource`, menu `opacity`, for non-text layers, text already has Pop at `js/inspector.js:5738`)
- Shared in/out control as R3's transition family (mode Manual / In / Out / In and out def **3**, `dur` def **0.45**, `progress`); R3's clip-end rule applies (`_clipDuration`, split union, rule 3 above). Plus `style` options 0 Pop / 1 Rubber / 2 Drop def **0**; `overshoot` 0-1 def **0.5**.
- Pop: for `u = min(1, t_in / dur)`, scale `s = 1 - e^(-6u) * cos(2 pi (1 + 1.5 * overshoot) u)`, forced to exactly 1 at `u = 1`. **Computed:** overshoot 0 peaks at 1.075, 0.5 at **1.208 (at u 0.24)**, 1 at 1.323; the endpoint is within 0.25% of 1 before the force. Out is the mirror with a small anticipation (grow a little, then drop to 0). Rubber stretches X and Y out of phase; Drop falls from above the frame and lands with one damped bounce.
- At `tl = 0` the mode In and out starts at scale 0, the default is visible (R3's default-mode trick, so the picture is gone at the very first frame, tell him in the hint).
- Distinct from R3's T1 Zoom (zoom plus motion blur, no spring).
- Tests: scale is 0 at the first frame, 1 after `dur`, and for overshoot 0.5 the peak is within 2% of 1.208; Out ends at 0; a clip cut in two does not ramp twice.

**S9. Power Off** (`tvoff`, `CANVAS_FX`, menu `matte`, the retro outro)
- Shared in/out control as S8 (In = Power On, Out = Power Off), `dur` def **0.5**; `glow` 0-1 def **0.7**; `line` 1-12 px def **3**; `color: true`, `defColor '#ffffff'` (the line and dot).
- Phases from `u` (0 = picture, 1 = gone): `u < 0.6`: the picture squashes vertically to a `line`-thick band (`sy` from 1 to `line / bb.h`), brightness lifted by `glow`; `0.6 <= u < 0.9`: the band shortens to a dot; `u >= 0.9`: the dot fades. Draw from `moverSource`, since it scales the layer.
- CRT (`crt`, `:6504`) is the screen look, not the shutdown; nothing in the app turns a clip off like a TV. Default In and out: the first frame is the dot, so it is visible at `tl = 0`.
- Tests: `u = 0` equals the input; the band is exactly `line * ps` tall at `u = 0.6`; the lit area shrinks monotonically with `u`.

**S10. Pop Art Quad** (`popart`, `CANVAS_FX`, menu `color`; the four-colour Warhol grid, a template beginners ask for by name)
- Params: `layout` options 0 Two by two / 1 Three by three def **0**; `style` options 0 Hue shifts / 1 Duotone pairs / 2 Posterised colours def **0**; `gap` 0-30 px def **0**; `contrast` 0-1 def **0.5**.
- Kernel: draw `A` into each cell of `bb` at 1/n scale, then `getImageData` each cell and recolour in JS (per-cell fixed hue offsets 0, 90, 180, 270 degrees using the Hue Shift matrix, or a fixed duotone palette per cell, or posterise plus a palette). **Do not tint with canvas blend modes:** `color`/`hue` blends over a transparent backdrop paint the whole cell, not just the subject (Computed by reading the composite rules, not run: the backdrop alpha is 0 so the result is the source colour), so a cut-out would become a coloured rectangle. A JS recolour keeps alpha untouched.
- Tile Grid (`gridrepeat`) repeats identical copies; Mirror Tile mirrors. Neither recolours per cell.
- Memory: cells are drawn straight into `B` and recoloured in place, **no per-cell scratch canvas**; any scratch must come from the capped pool pattern of #1095, never a new unbounded array.
- Tests: the four cells are unequal in colour and equal in alpha; `layout 1` gives nine; the alpha silhouette of each cell equals the downscaled source silhouette.

## Shared work for all ten
- **One `SCHEMA_REV` bump for the batch** (`js/collab-core.js:44`, now 7), together with R3's if they ship together, and `C.SCHEMA_FP` recomputed (`:243`, by the `921 S1` fingerprint test). `schemaFingerprint` (`:218`) hashes key, type, default, legacy, min, max, keyframable and **not `options`** until H23's patch (`tools/design/plans/fp-options.md`) lands: so after H23 the option lists above are part of the fingerprint and must be final before the first release; before it, any option added later to one of these ten needs a hand-bumped REV or two phones disagree silently.
- Search words (`SEARCH_ALIASES`, `js/fx-registry.js:545`): S1 `beauty smooth face skin retouch`; S2 `blur face hide mosaic privacy plate`; S3 `bounce jump hop`; S4 `rainbow disco strobe colour flash`; S5 `jump cut punch zoom talking`; S6 `painting painterly art`; S7 `sparkle shine glitter star`; S8 `pop in bounce appear spring`; S9 `tv off retro shutdown`; S10 `warhol four colour grid`.
- Tile pictures (`js/fx-thumbs.js:742`): S2 and S10 need an override (the default tile is a whole-frame look); Hop, Punch In, Pop and Power Off animate, so their tiles should not look static (Guess: the tile renderer draws one frame at a fixed time).
- Each spec is held to R3's rules: byte-identical for old projects (all new types, so by construction), preview equals export (pure functions of `tl`, hashes, no state), and the three EFFECTS-PLAN gates.

## Order I would build them in (value for effort)
S4 Colour Cycle (reuses the Hue Shift matrix, one hour), S5 Punch In (short, high use), S8 and S9 (reuse R3's transition control, so build after it), S2 Censor, S3 Hop, S1 Soften Skin, S7 Glitter, S10 Pop Art, S6 Oil Paint last (the one with a real cost question).

## What I did not do
Built, ran or timed anything. All costs are Guesses. I did not run the 46 filters or open the effects browser to look for look-alikes by eye, only read their definitions. The tracker claim in S2 is unverified. The 482 coverage gap is Read from the test source and not demonstrated by adding a CANVAS_FX that fails it.
