# #966 §B: B3 Time Echo and B6 Star Shine (`hunt/fxnew-echo`, from `8004fa16`)

Two new effects from the idle backlog (`tools/design/plans/2026-09-29-idle-backlog/backlog.md` §B3 and §B6). His #545 rule is that he
picks the LOOK before anything ships, but the code does not wait for it. So each effect is built with every variant the sheet shows
as one of its own options. His pick sets the defaults; nothing gets rebuilt.

**Nothing was run in the session that built this: no node, no browser, not even `node --check`.** The API builder was shipping, and
extra CPU load can turn its 2-hour ship red. Everything below "Measured" is still to be done by `prove.sh` (scratchpad
`agents/fxnew-echo/prove.sh`) and by the sheet probe in the next browser slot. Every number in this file is reasoned, not measured.

## What was built

### B3 Time Echo (`timeecho`, Repetition, a CANVAS_FX)

Copies of the layer as it looked a moment ago (or will look a moment ahead) are drawn behind it or over it. Each copy is fainter
than the one before.

- **Stateless.** Echo k is the layer re-rendered at t ± k × Echo time. It uses the plate Trail's Time offset already uses
  (`expand.at`, which calls `renderShiftedPlate`), with every other effect applied. Nothing is remembered between frames, so a
  scrub, the preview and the export agree (#986 C31).
- **Only moments the clip existed.** An echo before the clip's start or past its end is not drawn. It is not held at the first
  frame, as Trail does, because that would stack copies on the layer at the start.
- **Video.** A video shows other moments only from its decoded frame cache (`_mgOff`, the cache Reverse and Match Grade use).
  - Until the frames exist, its echoes are left out. They are asked for in the preview (`mgAsk`).
  - They are decoded before an export: `FM.matchGradeFrameLayers` now names video layers that have a Time Echo.
- **Groups.** Not offered on a group (`supportsLayer`). A group reaches the stack as one flattened picture of now, so every echo
  would be the same picture. A saved one on a group passes the picture through.
- **Two Time Echoes on one layer.** Inside an echo's own plate, another Time Echo draws only its layer (`_echoDepth`). The cost is
  n + n plates, not n × n.
- **Not gated on `FM._mfGhost`.** The four effects with history pass the picture through when that flag is set. Time Echo has no
  history to protect, and onion skin, the "this changes nothing" probe and the preset previews should all show the echoes.
- **Box and pixel sizes.** It is in `CFX_NO_BBOX`, so a layer that has just left the frame still leaves echoes where it was. It
  has no pixel lengths, because the plates arrive at the plate scale.
- **Defaults are a no-op where they should be.** At 0 echoes, Strength 0 or Decay 0 it draws the layer byte for byte and renders
  no other moment.

| control | range (default) | notes |
|---|---|---|
| Echoes | 0–12 (4) | |
| Echo time | 0.02–2 s (0.1) | |
| Echoes show | Where it was / Where it is going | |
| Strength | 0–100 % (100) | |
| Decay | 0–100 % (60) | echo k = Strength × Decay^k, so 0.6, 0.36, 0.22, 0.13 |
| Echoes sit | Behind / In front | |
| Blend | Normal / Add / Screen / Lighten / Multiply / Difference | |
| Tint | None / Colour / Rainbow | Colour washes the oldest echo most; Rainbow gives each echo its own hue |
| Tint strength | 0–100 % (70) | |
| Tint colour | #3dc8ff | |

### B6 Star Shine (`starglow`, Colouring, a PIXEL_FX)

This is the photographer's star (cross-screen) filter. Every pixel brighter than Threshold throws thin two-sided rays along 2, 3
or 4 axes, fading with distance, and Screen lays them over the picture.

- **How the rays are made.** Each axis is a recursive exponential smear along the rasterised line through every pixel. Those
  lines cover the plate exactly, so the cost is O(pixels) per axis whatever the Ray length.
  - It is not a tap walk: from one bright pixel, a tap walk draws dots.
  - A ray is a sum in project px of weight × e^(−3d/length), shown as 1 − e^(−Strength × sum). A point light's rays fade out, and
    a big bright area saturates to white.
- **Weight.** How far above Threshold, squared, × alpha.
- **Past the layer's edges.** The rays spread into the empty pixels round the layer, as a halo under the layer's own pixels. This
  is glow6's "Glow past the edges" rule.
- **Phone plate.** Ray length is `unit: 'px'` (five declared parameters, so `pxToPlate` scales it). The sparkle cells are 48
  project px.
- **Time.** Spin and Sparkle speed are rates on the clip's own clock. When keyframed they are integrated (`FM.integrateProp`,
  batch 2's F1 rule). Sparkle is a smooth value noise of hashes, never `Math.random`.
- **No `ctx.filter`.** The fallback rule (#986 C24) is met by construction. It is not in CROP_FX: the line raster and the cells
  are laid from the plate's corner.
- **Defaults are a no-op where they should be.** Strength 0, or nothing above Threshold, returns the plate untouched, byte for
  byte.

| control | range (default) |
|---|---|
| Threshold | 0–100 % (70) |
| Rays | Four / Six / Eight |
| Ray length | 5–400 px (60) |
| Rotation | 0–360° (45) |
| Strength | 0–2 (1) |
| Ray colour | From the light / Chosen colour / Spectrum |
| Colour | #ffffff, only for Chosen colour |
| Sparkle | 0–100 % (0) |
| Sparkle speed | 0.1–10 Hz (2), only live with Sparkle |
| Sparkle pattern | 0–999, only live with Sparkle |
| Spin | −360–360 °/s (0) |

### Also touched

- **fx-registry.js.** New batch 42, search aliases, and the group gate.
- **fx-thumbs.js.**
  - The Time Echo tile gets an orbit under it, the Frame Stutter / Time Warp trick, because a still tile has no past.
  - Star Shine uses `dusk.jpg`, the lamps on a dark street.
- **inspector.js.** Each effect gets its own reason for "This is on, but it changes nothing" (NOOP_WHY).
- **Busters.**
  - `compositor.js` ?v=220
  - `fx-registry.js` ?v=28.33. The whole number moved because the scratchpad `treecheck.py` compares integers.
  - `fx-thumbs.js` ?v=56
  - `inspector.js` ?v=419
- **Collab fingerprint.** New registry params move it. `C.SCHEMA_FP` is left alone and is re-pinned in the gap, so
  **`921 S1 the schema fingerprint gate` is red on this branch until then.**
- **Existing tests moved, and why.** The NEW row is newest-first by rule (CATEGORY_OF read backwards):
  - `913.8` now expects Star Shine then Time Echo to lead, and Snow & Rain within the first nine.
  - `745` no longer requires `pixelsort`, because batch 38's oldest two leave the twelve.
  - E1's "the six are the newest six" now allows #966 §B's effects after the six.

## The sheet (`render-probe.js`, the next browser slot)

The probe POSTs three JPEGs to `'http://127.0.0.1:' + window.__recv + '/<name>.jpg'`:

- **`echo-strips.jpg`.** One row per Time Echo setting, each at four moments of a spinning star swooping across a dark frame. The
  rows are:
  - the effect off
  - defaults (recommended)
  - 8 echoes at 0.05 s
  - 3 echoes at 0.25 s
  - 12 echoes at Decay 85 %
  - Where it is going
  - In front + Screen
  - Add (light painting)
  - Tint Colour
  - Tint Rainbow
  - Difference
  - Strength 50 %
- **`starshine-dusk.jpg` and `starshine-clouds.jpg`.** Star Shine on his lamps photo and his clouds photo. The tiles are:
  - the photo
  - defaults (recommended)
  - 6 rays
  - 8 rays
  - Rotation 0
  - length 140 and length 25
  - Threshold 85 and Threshold 55
  - Strength 0.5 and Strength 2
  - gold
  - Spectrum
  - Sparkle at two moments
  - Spin

## Names (#954)

#954's rule is labels different from Alight Motion's; the 70 generic craft names stay. Neither name below is in
`tools/design/954-effect-names.md`, and neither clashes with one of ours.

- **"Time Echo", not "Echo".**
  - "Echo / Delay" is already the sound effect in the audio list.
  - "echo" already finds Trail.
  - Plain "Echo" is After Effects' own name for the effect.
  - "Time Echo" says what it does: echoes in time, not in space as Trail's copies are.
  - Alternatives if he prefers: **Afterimage**, **Ghost Trail**. Ghost Trail is already a search word for Motion Blur (Object), so
    it would confuse.
- **"Star Shine", not "Star Glow".**
  - "Starglow" is a plugin's product name (Trapcode Starglow). The #484 lesson is that no other company's mark goes in the UI.
  - Glitter (E1) already does twinkling points, and Sunburst (AM's "Star") already exists.
  - Alternatives: **Star Filter**, **Cross Star**.
  - The type id stays `starglow`, after the backlog item. Ids are never shown.

## Where it departs from the backlog spec, and why

- **Echo, `time` −2..2 s.** Split into Echo time (0.02–2 s) plus Echoes show (Where it was / Where it is going). On a phone, a
  slider that passes through a dead zero is harder to use than a direction switch.
- **Echo, Blend list.**
  - Maximum was dropped. On a canvas, Lighten is Maximum for opaque pixels, and a true per-pixel max costs a readback per echo.
  - Multiply and Difference were added. They are free with canvas composite modes.
- **Star, `falloff`.** Dropped. The fall-off shape is fixed (5 % at Ray length), so Ray length alone sets the reach.
- **Star, `rainbow` 0–1.** Became the Ray colour choice Spectrum.
- **Star, added controls.** Sparkle, Sparkle speed, Sparkle pattern, Spin and From the light were added, as the task asked.

## Questions for Ezra (on the sheet)

1. **Pick the defaults** from the sheets. "Recommended" marks the build's defaults.
2. **The names.** Time Echo or Afterimage? Star Shine, Star Filter or Cross Star?
3. **Time Echo on a video in an export.** The echoes are drawn from the preview-size frame cache, at most 640 px on the long side,
   so a 1080p clip's echoes are slightly soft. They are faded copies, so this is probably fine. Or should the export decode them
   at full size? That costs memory on his phone.
4. **Star Shine on a bright sky** (the clouds sheet) blooms into big crosses at Threshold 70 %. Should the default Threshold be 85 %?
5. **Time Echo is not offered on groups**, only on the clips inside them. OK?

## Tests (`tests/tests.js`, at the end)

Each test asks for the registry entry (`_986fx` gives "no registry entry for …") or the kernel (`_b36k` gives
"FM._FX_TABLES.….timeecho does not exist — the effect is not built") before it measures anything. So on 8004fa16 every one fails
naming what is missing, not with a TypeError.

**B3 Time Echo:**

1. **Registry.** Repetition, POSTFX, found by "afterimage", has a description, defaults in range, not on a group. At its defaults a
   moving square leaves fading copies where it was and none ahead (CONTROL: the plain square is alone).
2. **Identity and moments.** 0 echoes, Strength 0 and Decay 0 give the layer byte for byte and ask for no other moment (CONTROL:
   the defaults ask for 1.6, 1.7, 1.8, 1.9 s and change pixels). It asks for exactly its own moments, furthest first, and never one
   outside the clip.
3. **Same instant, same picture.** 1.0 s drawn after 0.3, 1.7 and 0.95 s is identical (CONTROL: 1.3 s differs).
4. **Earlier moments.** Three echoes 0.2 s apart sit at x 136/112/88 at red 120/60/30. Where it is going puts them at 184/208/232.
   Nothing is drawn from before the clip began.
5. **Tint.** Colour makes the oldest echo the colour itself and the nearer one half-washed. Rainbow gives two different hues. The
   layer itself is never tinted.
6. **Phone plate.** At 0.5 and 0.28, against the export shrunk by area, the difference is ≤ 3 × the plain square's own difference
   + 1.5 levels (CONTROL: echoes at the wrong spacing exceed it).

**B6 Star Shine:**

1. **Registry.** Colouring, POSTFX, found by "star filter", has a description, defaults in range, Ray length in px. The default
   rays run down both diagonals of a light and nowhere else.
2. **Identity.** Strength 0, Threshold 100, and a dim picture each give the input byte for byte (CONTROL: the defaults change a
   picture with bright parts).
3. **Rays and Rotation.** A ring round a light crosses 4, 6 and 8 rays. Rotation 30 puts them at 30, 120, 210 and 300. A ring
   round where no light is crosses none.
4. **Ray colour.** From the light makes an orange lamp's ray orange. Chosen colour #00ff00 makes it green. Spectrum is white near
   the light, and red outreaches blue.
5. **Sparkle and Spin.** Same instant, same picture whatever was drawn before. It moves with the clock with Sparkle and Spin, and
   stays still without them. Sparkle speed keyframed flat equals the plain rate within 1 level (∫ of a constant).
6. **Phone plate.** At 0.5 and 0.28, the difference is ≤ 3 × the plain picture's own + 3 levels (CONTROL: a Ray length as long in
   plate px as the export's, which is the bug `pxToPlate` prevents, exceeds it).
7. **No ctx.filter.** With `FM._forceNoCtxFilter` it still shines and draws the same stars (CONTROL: with the filter it changes
   200+ px).

**Not measured.** The phone-plate bounds (B3 6 and B6 6) are reasoned from the plain fixture's own preview/export difference.
`prove.sh` prints every number, so if a bound is wrong it will say by how much. The sweeps that cover every effect were read, not
run, against both new effects:

- queue 264 (extremes)
- 482 visible at its defaults
- the inert-slider sweep
- 784 (missing keys)
- 793 (fallbacks)
- 913.5 (zoomed slice)
- the sanitiser fixed points

No queue 264 ALLOWED entry was needed. Time Echo always draws the layer itself, and Star Shine at its extremes only brightens or
does nothing.

## What prove.sh checks (written, not run)

prove.sh exits at once if `/home/ezra/FreeMotion/.ship-in-progress` exists. Otherwise, all under `nice`:

1. `node --check` on every changed js. The probe is checked as an async function body, and `tests.js` as a script.
2. Every `966 B3` and `966 B6` test on 8004fa16's js: each must FAIL, and no failure may be a TypeError.
3. The same tests on this tree: each must PASS.
4. The neighbouring tests on both trees, verdict for verdict:
   - Trail, Scatter and Tile Grid (482 14.5)
   - Time Warp, Frame Stutter
   - the glow family (482 6.x, 904 [B], 990, 986 C24/C27)
   - Lens Flare
   - 784, 793, 794
   - queue 264
   - the inert-slider and visible-at-defaults sweeps
   - 913.5, 913.8, 745
   - E1
   - the sanitiser sweeps

   They must agree except for the lines this branch meant to move.
5. The schema fingerprint: the fx-land control first (1856346714373782, match true), then 8004fa16 and this tree.
6. `treecheck.py 8004fa16 HEAD` and `drops.py 8004fa16 HEAD`.

Everything goes to `agents/fxnew-echo/prove-result.txt`.

## Honest limits

- **Performance is unmeasured.**
  - Time Echo costs one layer render per echo per frame at the plate scale: 4 by default, up to 12.
  - Star Shine costs 2–4 line passes per channel (×3 for From the light and Spectrum) plus one tone pass. Guess: under 15 ms at the
    0.28 plate, about 100 ms at 1080 × 1920 for export.
- **Small lights on the phone plate.** A light smaller than about 4 project px can fall under Threshold on the 0.28 plate, because
  the plate averages it with its dark surround. It then shines in the export but not in the preview. Light Glow has the same limit.
  The phone-plate test uses 16 px lights for that reason.
- **Echoes and later effects.** Echo plates include every other effect on the layer, including ones after it in the stack. That is
  how Trail's Time offset plates are built (`renderShiftedPlate` filters only itself).
