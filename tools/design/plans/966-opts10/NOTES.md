# #966 opts10 — a tenth round of more choice on seven effects he already has (hunt/966-opts10)

His standing request #966: *"you can polish other effects just giving them more features and making them work a bit better and
have more customisation … more choices always better … this is the complex version we want as much choice as possible"*.

Branch `hunt/966-opts10`, based on 143987b7 (rounds six to nine on the v17.66 code; six to eight measured, nine written but not yet
tested). **Code only, 18 Oct, while a release shipped from the main checkout: nothing was run but `node --check`** (js/compositor.js,
js/fx-registry.js, js/collab-core.js, tests/tests.js — all OK after every edit batch). No browser, no suite, no tools/*.sh, no node or
python running app or test code. Read-only `git` (rev-list, rev-parse, cat-file, diff), `grep` and `awk` over this worktree's refs for
the twin check; /home/ezra/FreeMotion read with Read / Grep only. Rounds six to nine's code, tests and NOTES are untouched.

## 1. Twin check (written before any code)

Picked for what he would SEE on a phone and to spread the categories: a heat-map stylize (Heat Map), a 3D transition (Page Curl), two
grades (Bleach Bypass, Colourize), a beauty tool (Soften Skin), a split grade (Split Toning) and a repeat (Tiles). Every candidate was
checked by CONTENT:

| Check | How | Result |
|---|---|---|
| 1. Already in the code? | each effect's EFFECTS row and kernel in this worktree | none of the new keys is on these rows or read by their kernels: Heat Map always REPLACED the picture (`d += (c − d) x Amount`) and its palette position was the pixel's brightness alone; Page Curl handed renderMesh no `back`, so its far side was always the mirrored, shaded texture; Bleach Bypass overlaid the plain brightness `l` and had no colour row or skin guard; Colourize's tint was always swatch x f; Soften Skin only smoothed; Split Toning's h was always `smoothstep(l^γ)` across the whole range; Tiles' Extend loop drew every copy at full strength in both directions |
| 2. Idle backlog | `tools/design/plans/2026-09-29-idle-backlog/backlog.md` for each type id, label and idea | **nothing planned for these controls.** Heat Map, Bleach Bypass and Colourize appear only in 5.1's adjustment-layer point-op list; Page Curl only in 14.6's 3D-solids context (Perspective / Auto-spin, built for the solids, not the page); Tiles, Soften Skin and Split Toning are not in it |
| 3. ChatGPT pile | `/home/ezra/FreeMotion/tools/design/chatgpt-tasks/pile/LAND-LIST.md` and `INVENTORY.md` | **0 hits** for thermal / Heat Map / Hot Colour, pagecurl / Page Curl, bleach, colorize / Colourize, softskin / Soften Skin, splittone / Split Toning, and Tiles as an effect (the two "tiles" hits are the effects browser's tiles). None of the seven is in a theme's effect list (T02's grades are Colour Wheels, HSL Mixer, Clarity, B&W Mixer, Channel Mixer, Auto Grade and the log converters; T35's "Curl" is the warp, not Page Curl) |
| 4. POLISH-LOG / REQUESTS | grep /home/ezra/FreeMotion for the type ids, the labels and the ideas (blend / cycle / flow / colorama with Heat Map; back / paper with Page Curl; tint / silver / skin with Bleach; saturation / lightness with Colourize; brighten / whiten / show with Soften Skin; blending with Split Toning; sideways / fade with Tiles) | history only: Heat Map's v3.90 six palettes and Low / High, queue 262's crossed sliders, the #954 rename from Hot Colour; Page Curl's queue 904 Light from (v16.72); Bleach Bypass's round 23 (v9.09) split of Colour loss and Harshness; Soften Skin's E1 birth (#1114) and #1116 stronger defaults; Split Toning's v17.50 birth (#966 B49); Tiles' queue 904 gates and v4.82 Whole clip. **Nothing asked for or planned on these controls** |
| 5. Plans | every `tools/design/plans/*/NOTES.md` in this worktree | none of the seven is in any round's built list. Two things a round said, both answered here: **opts7 set "Page Curl's back colour" aside** — *"the back is drawn by the 3D mesh renderer, which a code-only round cannot prove"*. Taken here because the renderer's far-side path already exists and is measured (#482 14.7, Card Flip's Back: `o.back` 1 / 2, `o.backColor`, '482 14.7 Card Flip…'), so this round adds no renderer code at all — Page Curl hands renderMesh the same two options Card Flip does, and Mirror passes the old options object unchanged; the proof owed is the builder's first run (§9). **opts7 set Hue Ramp's Flow / cycle speed aside as a twin by stacking** (Hue Ramp under Colour Cycle already does it): Heat Map's Cycle speed is NOT that twin — Hue Ramp maps brightness to HUE, so turning the hue is the same as flowing its ramp, but Heat Map's palettes are not hue rotations (Iron runs black → purple → red → yellow → white, White hot and Black hot are greys), so Colour Cycle after a Heat Map turns Iron's purple green instead of moving the heat along the picture, and the fold at the ends (§2) has no stacking equivalent. opts8 set Heat Map's Steps / Reverse aside (twins by stacking): not built. `fxnew-splittone/NOTES.md` has no open question on a crossover; Teal & Orange's Crossover is the same idea on another effect (its two colours fixed), not a twin |
| 6. Unmerged branches | every ref of this repo (664 refs, 4439 commits, 784 distinct `js/compositor.js` blobs), read-only `git cat-file`; each of the seven rows cut out whole (from its `{ type:` to the next, at most 60 lines) and searched for `key: 'blend'` / `'cycle'` / `Cycle speed` (Heat Map), `key: 'back'` / `'color'` / `Back colour` / `Transparent` (Page Curl), `key: 'skin'` / `'tint'` / `color: true` / `Silver` / `Protect skin` (Bleach Bypass), `key: 'sat'` / `'light'` / `'saturation'` / `'lightness'` / `Saturation` / `Lightness` (Colourize), `key: 'brighten'` / `'view'` / `'whiten'` / `Brighten` / `Show` (Soften Skin), `key: 'blending'` / `'crossover'` / `Blending` / `Crossover` (Split Toning), `key: 'axis'` / `'fade'` / `'fill'` / `'dir'` / `Fade copies` / `Sideways` / `Fills` (Tiles); and every blob for the helper names and `p.cycle`, `p.brighten`, `p.blending` | **no twin: 0 hits on every row** (Heat Map's row is in 780 blobs, Page Curl's 753, Bleach Bypass's 755, Colourize's 775, Soften Skin's 143, Split Toning's 39, Tiles' 753). CONTROLS (the cut works): the same cut finds Heat Map's `White hot` in 695, Page Curl's `Light from` in 411, Bleach Bypass's `Harshness` in 580, Colourize's `Shadow lift` in 693, Soften Skin's `Keep detail` in 143, Split Toning's `Keep brightness` in 39, Tiles' `Whole clip` in 674. The helper names and `p.brighten` / `p.blending` are in no blob; `p.cycle` (6 blobs) is Pop Art's Colour swap (opts5). /home/ezra/FreeMotion's own refs were not scanned — nothing may run in that checkout during this ship — but its branches are pushed to the same `ssh` remote these refs mirror |

**Excluded, and why.** The 62 effects of rounds one to nine; the `checker`, `grid` and `stripes` kernels (the parked pile commit T25
`1ca7ffe5`); every WARP_FX effect; everything the pile still carries a fix or a control for (T16's keyed-speed list; T07 Shake, Backdrop
Clone, Soft Outline, Light Streaks, Torn Edge, RGB Split, Raised Edge; T08's glows — Highlight Bloom, Dreamy Bloom, Shadow Bloom; T09 /
T10 Unsharp Mask; T23 the wipes; T25 Halftone; T26 Border Frame; T27 Light Sweep; T28 Bolts; T29 Torn Edge / Cracked Cells; T30 Lens
Flare; T31 Lamp / Poster Shadow; T32 Tilt Shift; T33 Vignette; T34 Directional / Gaussian Blur; T35 Card Flip and the warps; T36–T38
Frame Stutter, Time Warp Scan and the grades Brightness, Contrast, Levels, Gamma, Vibrance, Saturation, Colour Balance, Exposure, Hue
Shift; T02 and T03's new effects); and these, each considered and dropped:
- **Glow's Glow only** — a CSS `drop-shadow()` composite with a GPU fallback (opts7's reason).
- **Luma Key's Show matte** — it runs on the media path with a repaint memo (`lumaKey`, slot n), far from the kernel tables; too wide to
  prove code-only. Chroma Key's would be Chroma Key Pro's View, a twin.
- **Backdrop Lens' blur / tint** — a copy-background sibling with its own path, and T07 touches Backdrop Clone's.
- **Compression Crunch's block crawl** — no clear editor equivalent; motion-only.
- **Tiles' Scroll** — Tile Grid's Scroll across / down, a twin.
- **Solarize's Flips below** — Invert → Solarize → Invert, a twin by stacking.
- **Colourize's hue cycle** — Colour Cycle after it, a twin by stacking.
- **Soften Skin's Warmth** — Colour Temperature with Affects, nearly a twin; Brighten (masked by the softening) is not.
- **Split Toning's Midtones colour** — Colour Wheels' gamma wheel (T02 / the built Colour Wheels) is that.
- **CRT's roll bar height / softness and Bump Map's Gloss** (opts9 §8 / opts8 §8 "the next control") — both live inside a measured or
  tested earlier round's helper (`crtRoll966`, `bumpLit966`) and their call sites; building them would edit an earlier round's code.
- **Music Visualiser, Datamosh Bloom, Temporal Denoise, Motion Blur (Object), Light Wrap** — nothing to see without sound, motion or a
  backdrop on the fixture, so nothing a code-only round can pin.
- **Star Shine, Time Echo, Film Damage, Colour Flash, Film Grain, Drop Shadow, Highlights & Shadows, Teal & Orange, Faded Film,
  Starfield, Snow & Rain, Pixel Sort, Emboss, Find Edges, Letterbox, Light Leak** — each already carries eight or more controls from a
  #482 polish batch or its own build.

## 2. What was built — 7 effects, 13 new controls (13 keys, two of them colour rows)

| Effect (type) | Key | Label | Range / choices | Default | What it does |
|---|---|---|---|---|---|
| Heat Map (`thermal`) | `blend` | Blend | Normal (0) / Multiply (1) / Screen (2) / Overlay (3) / Soft light (4) / Colour (8) / Luminosity (9) — Gradient Map's seven, numbers and all | Normal | lays the heat colours over the picture instead of replacing it: Soft light keeps the detail under a heat cast, Colour gives the heat's hue at the picture's own brightness |
| | `cycle` | Cycle speed | −2–2 /s, keyframable | 0 | sets the palette flowing through the picture, that many palette lengths a second on the clip's clock; it folds back at the hot and the cold end, so no seam ever crosses the picture; integrated when keyframed |
| Page Curl (`pagecurl`) | `back` | Back | Mirror (0) / Solid colour (1) / Transparent (2) — Card Flip's three | Mirror | what the curled-over part shows: the picture reversed (today), a paper back, or nothing (only the front shows) |
| | `color` | Back colour | colour row (`swatch`), greyed except under Solid colour | #ffffff | the paper's colour |
| Bleach Bypass (`bleachbypass`) | `color` | Silver tint | colour row, live | #ffffff | colours the silver the process lays over the picture — steel blue, sepia; black and white stay black and white |
| | `skin` | Protect skin | 0–100 %, keyframable | 0 | holds skin-coloured pixels back from the process (Vibrance's wedge), so a face keeps its warmth while the rest goes silver |
| Colourize (`colorize`) | `sat` | Saturation | 0–200 %, keyframable | 100 | how much colour the tint carries: 0 a grey tone, above 100 % richer than the swatch (Photoshop's Colorize Saturation) |
| | `light` | Lightness | −100–100, keyframable | 0 | lifts the tint toward white or sinks it toward black (Photoshop's Colorize Lightness) |
| Soften Skin (`softskin`) | `brighten` | Brighten | 0–100 %, keyframable, greyed under Show selection (`liveWhen` 0) | 0 | lifts each pixel toward white as far as it is smoothed — skin brightens, eyes, brows, hair and edges stay (every beauty app's Whiten) |
| | `view` | Show selection | Off (0) / On (1) | Off | paints how much each pixel is softened, white all, black none, for setting Keep detail and Skin tones; it shows in the export too, and its note says so |
| Split Toning (`splittone`) | `blending` | Blending | 0–100 %, keyframable | 100 | how widely the two colours overlap (Lightroom's Color Grading Blending): lower narrows the crossover about the Balance point, 0 a hard split |
| Tiles (`tiles`) | `axis` | Fills | All round (0) / Sideways (1) / Up and down (2), greyed under Grid (`liveWhen` 0 on Layout) | All round | Extend's copies in one row (a portrait clip filling a landscape frame) or one column |
| | `fade` | Fade copies | 0–100 %, keyframable, greyed under Grid | 0 | each ring of copies that much fainter than the one inside it; 100 % leaves the clip alone |

Exact definitions (js/compositor.js; each helper has a suite seam):

- **Blend / Cycle speed** (`thermalLoop10`, `thermalPhase10`, seams `FM._thermalLoop10`, `FM._thermalPhase10`): the kernel's loop — the
  same brightness and Low / High window — then, off 0, the palette position folded: u = (l + phase) mod 2, l = 2 − u past 1; then, off
  Normal, `fxBlendRGB(mode, heat, picture)`; Amount mixes as before. phase = speed x the clip's own seconds (`FM.fxLocalTime(layer, t)`,
  the layer the dispatcher hands over as the 8th argument; the project clock without one), or ∫ over them when keyframed, held to ±2,
  NaN 0, 0 before the clip starts.
- **Back / Back colour** (inline in `CANVAS_FX.pagecurl`): Solid colour or Transparent sets `o.back` / `o.backColor` on renderMesh's
  options, exactly as Card Flip does; renderMesh's far-side path (14.7) fills a triangle seen from behind with the colour, or skips it.
- **Silver tint / Protect skin** (`bleach10`, seam `FM._bleach10`): the kernel's loop with the overlay's second argument l x tint / 255
  channel by channel, and Amount x (1 − Protect skin x wedge) where Vibrance's wedge (red the largest, blue the smallest) is
  1 − |(g − b) / (r − b) − 0.45| / 0.55; a grey (r = g = b) is never in it.
- **Saturation / Lightness** (`colorize10`, seam `FM._colorize10`): the kernel's loop with the tint T = swatch x f taken to
  Y + (T − Y) x Saturation (Y the tint's Rec.601 grey), then T + (255 − T) x L above 0 or T x (1 + L) below, held to 0..255, before the
  Blend.
- **Brighten / Show selection** (`softSkin10`, seam `FM._softSkin10`, beside the kernel): the kernel's steps, then the softened pixel
  + (255 − it) x Brighten x w / 2, or under Show selection w x 255 as a grey (w the softening weight, Amount included).
- **Blending** (`stSplit10`, seam `FM._stSplit10`, beside `stSplit`): the split table with x' = ½ + (x − ½) / b (held to 0..1, b ≥ 0.02)
  before the smoothstep; its own table and cache.
- **Fills / Fade copies** (`tilesExtend10`, seam `FM._tilesExtend10`): Extend's loop with j held to 0 (Sideways) or i to 0 (Up and down)
  and each copy drawn at (1 − Fade)^max(|i|, |j|) of the context's alpha, inside its own save; the kernel draws the clip last.

## 3. Why each default is exact (byte-identical pixels / identical call lists)

- **No `legacy` anywhere, and every `def` IS today's look**, so the render-time fill (queue 784) writing the default into a saved
  project's absent key changes nothing. Each kernel reads its key with a literal fallback equal to `def` — `p.blend == null ? 0`,
  `p.cycle == null ? 0`, `fparam(p, 'back', 0, t)`, `fparam(p,'skin',0,t)`, `p.sat==null?100`, `p.light==null?0`, `fparam(p, 'brighten',
  0, t)`, `fparam(p, 'view', 0, t)`, `fparam(p, 'blending', 100, t)`, `fparam(p, 'axis', 0, t)`, `fparam(p, 'fade', 0, t)` — which is
  what `FM._fxFillValue` reads (the rows tests check it). The colour rows fill to `#ffffff` (Bleach Bypass's row default, Page Curl's
  swatch `def`), and an absent colour is white in both kernels.
- **Heat Map:** Normal and no flow (Cycle 0, or the clip's first instant) never reach `thermalLoop10`; the old loop runs.
- **Page Curl:** Mirror (and absent) leaves the options object exactly as the old literal built it — same keys, same values, same
  order of evaluation — so renderMesh makes the old calls (a recorder test holds the call list).
- **Bleach Bypass:** a white tint and 0 % never reach `bleach10`; the old loop runs. (`bleach10` at white and 0 % is the old loop byte
  for byte — a test holds it.)
- **Colourize:** 100 % and 0 never reach `colorize10`. (At them `colorize10` is the old loop byte for byte in all four Blends — a test
  holds it; its extra clamp before the Blend is a no-op there, since swatch x f never leaves 0..255 when Shadow lift + range is 1.)
- **Soften Skin:** 0 and Off take the old lines from their first statement; `softSkin10` at 0 / Off is the old kernel byte for byte (a
  test holds it on a busy skin picture, Everything and Skin tones).
- **Split Toning:** at 100 % (and absent, and anything held to 100) the kernel calls `stSplit(balance)` itself, the old table.
- **Tiles:** All round and 0 % never reach `tilesExtend10`; the old loop runs (recorder test).
- **Arity unchanged** for every kernel (thermal, colorize, bleachbypass, softskin, splittone 5; pagecurl 7; tiles 11), so pxToPlate
  treats each as before — Soften Skin's Smoothing size is still scaled for it. Heat Map reads `arguments[7]` (the layer) without
  declaring it, as Star Shine does.
- **Not exact by design, off the default only:** Heat Map's blended colour is unrounded before the blend (a level against blending a
  rounded map); a Solid-colour page back is one flat colour, unshaded (renderMesh's far-side fill, as Card Flip's is).

## 4. The sweeps (reasoned, owed a run)

- **`no effect erases the layer at a single parameter extreme (queue 264)`** — orange (232, 163, 61) 300 x 450 layer over black, t = 0.5,
  one param at min or max (a choice at its last INDEX; colour rows are not swept). **One ALLOWED entry added: `'colorize:light=min'`** —
  Lightness −100 sinks the tint to black at the default Tone and Amount 1, black on this black ground (brightness:amount=min's twin).
  The rest keep the layer:
  - Heat Map Blend at index 6 (read as fxBlendPx's Add) and Normal; Cycle ±2 at 0.5 s (a whole length: the orange, l 0.675, reads Iron at
    0.325 — (79, 0, 155)).
  - Page Curl Back Transparent: the flat page is drawn; only the turned-over corner goes.
  - Bleach Bypass Protect skin 0 / 100: the process held back or not — the layer stays.
  - Colourize Saturation 0 (a grey of 106) / 200; Lightness 100 (white).
  - Soften Skin Brighten 100; Show selection On (the flat orange's weight 0.85: a grey of 217).
  - Split Toning Blending 0: the orange is above the split, so it takes the highlight push.
  - Tiles Fills Up and down, Fade copies 100: the clip itself is always drawn.
- **`effects: no effect slider is completely inert`** (PIXEL_FX ranges at five fractions, five moments, three fixtures, no layer — so
  the project clock): Heat Map Cycle speed — at 0.23, 0.61, 1.4 and 2.7 s the five speeds move the palette (at 0 s it has not flowed);
  Bleach Bypass Protect skin — the subject frame's warm cells (red over green over blue) are in the wedge; Colourize Saturation and
  Lightness — every fraction changes the tint; Soften Skin Brighten — its gate (`liveWhen` 0 on Show selection) is the default, and
  the subject's smooth gradient is softened, so it lifts; Split Toning Blending — the subject's grey strip moves with the crossover.
- **`784: no effect is switched off by a missing param key`** — a bare `{}` fills every new key to its default (identity).
- **`793: every param shows in the inspector what an absent key renders`** — the literals above equal each `def` (blend 0, cycle 0, back
  0, skin 0, sat 100, light 0, brighten 0, view 0, blending 100, axis 0, fade 0).
- **`859: every pixel effect draws the same picture on the preview plate as in the export`** — defaults only: unchanged.
- **`482: every effect does something visible at its own defaults`** — unchanged.
- Also reasoned: 'Hot Colour survives its Low and High sliders crossing (queue 262)' (no Blend, no Cycle); the colour grades'
  un-upgraded-instance test (Bleach Bypass's new instance carries white and 0 — the old path); 904 [B]'s Page Curl light (Mirror);
  queue 904's Tiles gates (`rowFor('Tiles')` / `'Repeat'` — the new rows' labels start with neither) and the v4.82 off-canvas Tiles test
  (All round); E1 / #1116's Soften Skin tests (they pass `{}` or the four old keys); #966 B49's Split Toning tests (`_cgPlaced`,
  `_cgListed` — a point op still, no px key); the phone option-button sweep (Heat Map's seven Blend buttons are Gradient Map's seven;
  Back, Fills, Off / On); CROP_FX: Heat Map, Colourize, Bleach Bypass and Split Toning stay members (all point ops — tests run
  `FM._cropIdentity` with the new controls on); adjustment layers: the four are PIXEL_ADJ (the dispatcher hands no layer, so Heat Map
  flows on the project clock there); filters.js (Thermal Camera, the bleach filters): their instances carry none of the new keys —
  the defaults; fx-thumbs: new instances at their defaults draw the old tiles — no buster.

## 5. Busters and schema

- `index.html`: `js/compositor.js?v=231 → 232`, `js/fx-registry.js?v=32 → 33` (Heat Map's, Page Curl's, Bleach Bypass's, Colourize's and
  Tiles' descriptions name the new choices; Soften Skin's and Split Toning's live in their `desc` in compositor.js),
  `js/collab-core.js?v=44 → 45`. fx-thumbs (59) and inspector (426) are untouched — the registry derives the rows, and a swatch row's
  `overriddenBy` / `liveWhen`, a range's `overriddenBy` / `liveWhen` on a segment and a segment's on a segment are gates markOverridden
  already judges (Card Flip, Tiles' Repeat). No label became wrong, so there is no alias.
- `js/collab-core.js`: `C.SCHEMA_REV = 25` with a Rev 25 note. **`C.SCHEMA_FP` is untouched** (round nine's FP TO PIN comment left as it
  is), under a new one-line `/* FP TO PIN (966 opts10) */` comment — the builder measures rev 25 with fp.js; `921 S1 the schema
  fingerprint gate` fails until then.

## 6. Tests (tests/tests.js, one block between `// ── 966 opts10 (hunt/966-opts10) ──` and `// ── end 966 opts10 ──`)

All `{ item: '966', budgetMs: 60000 }`, each failing on 143987b7 on its first line by naming the missing control or seam (`_o10Need`).
The block's helpers are its own (`_o10…`, including a recording 2D context, `_o10Rec`, a row checker that reads a choice's stored
numbers, `_o10Rows` with `vals`, and the fixed `<label>`-reading grey test, `_o10Greyed`); it uses only `test`, `sleep` and E1 from the
rest of the file. 26 tests:

1. `966 opts10 every new control at its default draws what the effect drew without it — Heat Map, Page Curl, Bleach Bypass, Colourize, Soften Skin, Split Toning and Tiles through the compositor…` (1:1 and half plate, 0.61 / 1.73 s, grey ground; CONTROL each effect changes the picture — Soften Skin excepted, as E1's own test does — and each new control off its default moves it through the compositor)
2. `966 opts10 Heat Map has Blend (… Gradient Map’s seven, storing its 0–4, 8 and 9 …) and Cycle speed (−2 to 2 /s…)…` (a; the very options Gradient Map's Blend has)
3. `966 opts10 Heat Map Blend: each mode lays the heat colours over the picture exactly as Gradient Map’s Blend does…` (b; every mode against FM._fxBlendRGB, Colour keeps brightness, Multiply / Screen, Amount; CONTROL Normal)
4. `966 opts10 Heat Map Cycle speed: at 0.4 a second, half a second in, every grey takes the colour the still map gives the grey 51 levels hotter…` (b; fold, negative, keyed, clip clock, before the start, held; CONTROL Cycle 0)
5. `966 opts10 Heat Map at Normal and Cycle 0 draws byte for byte…` (c; twelve cases; crop identity; CONTROL)
6. `966 opts10 Page Curl has Back (… Card Flip’s three …) and a Back colour (white), greyed except under Solid colour…` (a)
7. `966 opts10 Page Curl Back: Solid colour paints the curled-over part in the Back colour… Transparent leaves the flat page under it showing…` (b; CONTROLS Mirror)
8. `966 opts10 Page Curl on Mirror makes the old calls, call for call…` (c; recorder and pixels, five configs; CONTROL fills / draws)
9. `966 opts10 Bleach Bypass has Protect skin (0–100 %…) and a Silver tint colour (white)…` (a)
10. `966 opts10 Bleach Bypass Silver tint: a steel-blue tint casts every grey blue — grey 128 reads (61.5, 83.9, 106.3)…` (b; seven greys against the formula, warm, black / white, keyed colour; CONTROL white)
11. `966 opts10 Bleach Bypass Protect skin: a skin-coloured patch is held back by the wedge’s 0.824…` (b; blue and grey untouched, keyed; CONTROL)
12. `966 opts10 Bleach Bypass at white and Protect skin 0 % draws byte for byte…` (c; seam = old loop; crop identity; CONTROL)
13. `966 opts10 Colourize has Saturation (0–200 %…) and Lightness (−100 to 100…)…` (a)
14. `966 opts10 Colourize Saturation and Lightness: at Saturation 0 every grey becomes the tint’s own grey…` (b; 0 / 200 / ±50, Multiply white, keyed, held; CONTROL 100)
15. `966 opts10 Colourize at Saturation 100 % and Lightness 0 draws byte for byte…` (c; seam = old loop in all four Blends; crop identity; CONTROL)
16. `966 opts10 Soften Skin has Brighten (… greyed under Show selection) and Show selection (Off or On…)…` (a)
17. `966 opts10 Soften Skin Brighten: every pixel lifts toward white exactly as far as it is softened…` (b; worked middle at 100 / 50, every pixel against Show selection's weight, Skin tones, keyed; CONTROL)
18. `966 opts10 Soften Skin Show selection: what the softening takes turns white in proportion…` (b; middles 217, edges black, Skin tones, Amount 0, alpha and clear pixels, Brighten ignored; CONTROL Off)
19. `966 opts10 Soften Skin at Brighten 0 and Show selection Off draws byte for byte…` (c; ten cases; seam = old kernel; CONTROL)
20. `966 opts10 Split Toning has Blending (0–100 %…): at 20 % the darks take none of the highlight colour…` (a and b; split point, Balance, 99 %, keyed, held, the table seam; CONTROL 100 %)
21. `966 opts10 Split Toning at Blending 100 % draws byte for byte…` (c; eight cases; crop identity; CONTROL)
22. `966 opts10 Tiles has Fills (…) and Fade copies (…), both live under Extend and greyed under Grid…` (a)
23. `966 opts10 Tiles Fills and Fade copies: Sideways keeps only the clip’s own row of copies…` (b; four copy middles, ring alphas, Fade 100, Grid, keyed, held; CONTROL All round)
24. `966 opts10 Tiles at All round and Fade 0 % makes the old calls, call for call…` (c; seven configs incl. a clip at the corner and Grid; CONTROL 80 / 8 / 8 copy draws, Fade's saves and alphas)
25. `966 opts10 the gates in the inspector: Page Curl’s Back colour is greyed until Solid colour, Soften Skin’s Brighten greys out under Show selection, and Tiles’ Fills and Fade copies grey out under Grid…` (the four gates in the panel, read by each row's own `<label>`)
26. `966 opts10 the seven effects’ editors, new rows and all, fit the inspector…` (phone fit; CONTROL labels Cycle speed, Back colour, Protect skin, Lightness, Show selection, Blending, Fade copies)

**MEASURE placeholders (generous bounds; the builder measures at 1280 and 380 and tightens):**
- test 1: pixels each new control off its default moves through the compositor on the 100 x 70 rect — bound ≥ 50 each; reasoned in the
  hundreds or more (Tiles' Sideways ~8000, Page Curl's Transparent the flap, a few hundred).
- test 7: pixels the Back colour paints under Solid colour — bound ≥ 300, reasoned about 2000 (the turned-over corner, a triangle about
  77 px across and 39 deep, and the roll's far half, perspective 1.14); flat-page pixels short of the fold (x + y ≤ 200) the reversed back
  covers under Mirror — bound ≥ 300, reasoned about 1300.
- test 8: faces Solid colour fills — bound ≥ 20, reasoned in the hundreds (back faces of the 26 x 26 page).
- test 12: pixels Protect skin 100 % moves on the busy picture — bound ≥ 100, reasoned over a thousand (its warm cells).
- test 17: Show selection's untouched (w 0) pixels — bound > 100, reasoned 500–800 (a band along the skin patch's edge only: the blue
  patch is only ~42 levels off the ground, under Keep detail 50's threshold of 49) — and its softened (w > 0.8) pixels — bound > 2000,
  reasoned over 10000.
- Reasoned floors (not MEASURE, but worth a look): tests 5, 12, 15, 19, 21's 500 moved pixels; test 11's 20 levels; test 20's 50 of 71
  levels; test 3's 30 % of pixels moved over 10 by Normal. Worked values with a ±1 / ±1.5 / ±2 tolerance: tests 3 (±2 against
  fxBlendRGB, ±1.5 Amount), 4 (±1), 10 (±1), 11 (±1), 14 (±1), 17 (±1, ±1.5), 18 (±1), 20 (±3 at the split point, ±2 at 99 %), 23 (±2
  ring alphas).

**Shared test edited: one entry in queue 264** (`no effect erases the layer at a single parameter extreme (queue 264)`):
`'colorize:light=min': 1` with its reason (above). On 143987b7 it is never reached (Colourize has no `light`), so prove.sh will read
that test DEAD — the right reading for an ALLOWED entry, as rounds seven's and nine's were. Searched tests.js for each type id —
`'thermal'` (queue 262, the 5.1 adjustment list, the filter names, the #954 rename row), `'pagecurl'` (904 [B]'s light, the
keyframed-Shading gate), `'bleachbypass'` (the colour grades' un-upgraded test, the adjustment list), `'colorize'` (the adjustment
list), `'softskin'` (#1116, E1's kernel and compositor tests, the NEW-row lists), `'splittone'` (#966 B49's block, the NEW-row lists),
`'tiles'` (v4.82's off-canvas test, queue 904's gates, the dead-here test, the shake + tiles test) — every one reads its own keys or the
defaults.

## 7. #545 before/after sheet (owed — for him to pick or veto)

Render through the app (`FM.renderScene` in a tests/ probe), at phone size (≈ 380 px wide frame), each option at 2–4 values beside
today's default, on a fixture where it clearly shows:
- **Heat Map** on a face or a street photo: Blend Normal (today) / Soft light / Colour / Overlay; Cycle speed 0 (today) / 0.5 / −1 as a
  4-frame strip over 2 s (Iron and Spectrum).
- **Page Curl** on a photo, Curl 0.55: Back Mirror (today) / Solid colour white / Solid colour cream #f3ead6 / Transparent over a second
  photo underneath (and a 4-frame strip of Curl 0 → 1 with a white back — the page turn).
- **Bleach Bypass** on a portrait: Silver tint white (today) / steel #9fb4c8 / sepia #d8b48c; Protect skin 0 (today) / 60 / 100.
- **Colourize** on a photo in the default blue: Saturation 100 (today) / 40 / 160; Lightness 0 (today) / +40 / −40.
- **Soften Skin** on a face (the cat and a drawn skin patch are what the repo has — #1116's sheet): Brighten 0 (today) / 40 / 80 on
  Skin tones; Show selection On on Everything and on Skin tones.
- **Split Toning** on a landscape: Blending 100 (today) / 50 / 20 / 0, and Blending 20 with Balance ±50.
- **Tiles** on a portrait clip in a 16:9 project: Fills All round (today) / Sideways / Up and down; Fade copies 0 (today) / 40 / 80.
Names to put to him (#954 / "options, recommended next to the best"): Blend (the seven), Cycle speed, Back (Mirror / Solid colour /
Transparent), Back colour, Silver tint, Protect skin, Saturation, Lightness, Brighten, Show selection, Blending, Fills (All round /
Sideways / Up and down), Fade copies.

## 8. Risks and what is unsure

- **Nothing was run.** Every claim in the tests is reasoned; the first run may move a marked bound or expose a slip in a worked pixel
  (each is worked in the test's comment, so a red can be checked quickly).
- **Page Curl's back is opts7's set-aside idea** (§1): the renderer path is Card Flip's and measured there, but whether every
  turned-over triangle of the curl winds the other way on screen (renderMesh's far-side test) at every Curl / Angle / Radius is what
  test 7's first run proves. A Solid-colour back is flat (unshaded) while the front keeps its shading — Card Flip's back is the same; a
  shaded paper back would need renderMesh's far-side fill to take the face's shade, a change to shared code left for him to want.
- **One new row starts greyed on a freshly added effect, honestly:** Page Curl's **Back colour** (Mirror has no colour to pick, the
  established Card Flip pattern). Tiles' two rows are live on a new one (Extend) and grey out on a saved Grid one.
- **Heat Map's Cycle folds at the ends** (out to the hot end and back) rather than wrapping (Colorama's way, a hard white-to-black seam
  that travels). A wrap would be one more choice if he wants the harsher look.
- **Heat Map flows on the project clock on an adjustment layer** (the adjustment path hands no layer); on a clip it is the clip's clock.
- **Bleach Bypass's Protect skin skips greys** — Vibrance's own wedge lets a grey through at 0.18 (harmless there, since vibrance does
  nothing to a grey); here it would hold greys back, so a grey (r = g = b) is never in the wedge.
- **Colourize's Lightness −100 is black** at Tone and Amount 1 (Photoshop's end stop) — hence the queue 264 ALLOWED entry.
- **Soften Skin's Brighten scales with Amount** (it lifts by half of Brighten x w, and w carries Amount): at the default 0.85 the most a
  pixel lifts is 42.5 % of the way to white.
- **Split Toning's Blending default sits at the top of its range** (100 % = today's widest crossover); it cannot overlap the colours more
  than they already do.
- **Tiles' Fade copies counts rings from the clip** (Chebyshev distance), so the four diagonal neighbours fade as much as the four
  straight ones.
- **Round nine's own gate test** (`966 opts9 the gates in the inspector…`) still uses the old "the row's text starts with the label"
  `grey()` for Trail's Tint colour and Glitter's Colour (both colour rows, which start with their ◆) — the very bug opts8's Mosaic fix
  names. Not edited here (an earlier round's test); worth checking on its first run.
- The descriptions grew a clause each; no test pins their text (searched).

## 9. Owed by the builder

1. First run of the 26 tests at 1280 and 380 (`?only=966%20opts10`), set the MEASURE bounds from measurement, and run the edited queue
   264 sweep (`?only=no%20effect%20erases`).
2. Measure and pin `C.SCHEMA_FP` (fp.js) at rev 25 — rounds eight's and nine's rev 23 / 24 FP TO PIN comments may still be waiting too,
   so one measurement on the assembled tree covers them — replacing the FP TO PIN comments.
3. Full suite (the sweeps in §4, queue 262, the colour grades' un-upgraded test, 904 [B], queue 904's Tiles gates, E1 / #1116, #966 B49),
   prove.sh (the 264 edit reads DEAD there, by design), then the #545 sheet in §7 before the release that ships it.
