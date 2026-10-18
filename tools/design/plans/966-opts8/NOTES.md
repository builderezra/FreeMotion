# #966 opts8 — an eighth round of more choice on seven effects he already has (hunt/966-opts8)

His standing request #966: *"you can polish other effects just giving them more features and making them work a bit better and
have more customisation … more choices always better … this is the complex version we want as much choice as possible"*.

Branch `hunt/966-opts8`, based on baff9747 (rounds six and seven on the v17.66 code; round six measured, round seven written but not
yet tested). **Code only, 18 Oct, while a release shipped from the main checkout: nothing was run but `node --check`** (js/compositor.js,
js/fx-registry.js, js/collab-core.js, tests/tests.js — all OK). No browser, no suite, no tools/*.sh, no node or python running app or
test code. Read-only `git` and `grep` / `awk` over the refs for the twin check. Rounds six's and seven's code, tests and NOTES are
untouched.

## 1. Twin check (written before any code)

Picked for what he would SEE on a phone and to spread the categories: a colour wash (Colour Wash), a light / 3D look (Bump Map), a
stylize (Mosaic), a shape mask (Squircle Corners), a repeat (Scatter Array), an edge / matte effect (Edge Halo) and a text effect (Text
Curve). Every candidate was checked by CONTENT:

| Check | How | Result |
|---|---|---|
| 1. Already in the code? | each effect's EFFECTS row and kernel in this worktree | none of the new keys is on these rows or read by their kernels: Colour Wash's centre was `W / 2, H / 2` for every shape; Bump Map multiplied by one grey factor and had no colour row; Mosaic's gap always showed the picture and it had no colour row; Squircle Corners made one `roundRect(x, y, w, h, r)` (every corner, round); Scatter Array drew the layer first and every copy `source-over`; Edge Halo painted its band flat, all round; Text Curve's painters always `rotate(sign * a)` |
| 2. Idle backlog | `tools/design/plans/2026-09-29-idle-backlog/backlog.md` for each type id, label and idea | **nothing planned for these controls.** 6.6 planned Orbit Streaks' Only above / Direction (shipped; not touched here); gradientoverlay appears only as an adjustment-layer `frameGeo` note (line 365) and the Sky Grad filter recipe; Scatter Array only in C27 (its expand plate, fixed v17.14) |
| 3. ChatGPT pile | `/home/ezra/FreeMotion/tools/design/chatgpt-tasks/pile/LAND-LIST.md` and `INVENTORY.md` | **0 hits** for gradientoverlay / Colour Wash, bumpmap / Bump Map, Mosaic, roundcorners / Squircle, scatterarray / Scatter Array, mattefringe / Edge Halo / Matte Fringe, textcurve / Text Curve. "Rounded Corners" appears only as T26 — Border Frame's smooth rounded corners, a different effect and kernel |
| 4. POLISH-LOG / REQUESTS | grep /home/ezra/FreeMotion for the type ids, the labels and the ideas (centre / position / radial; grout / gap colour; which / each / top / chamfer / inverted corners; upright / perpendicular) | history only: Colour Wash's queue 537 controls and #482 Amount, its Radial-Angle gate fix; Bump Map's EFFECTS-PLAN round 16 (v9.01, light angle / relief / ambient); Mosaic's plate scaling (v5.32) and #1056 alpha-weighted mean; Squircle Corners' #484 rename, #621 layer-space mask (v14.19), #793; Scatter Array's #484 birth (v14.18) and C27; Edge Halo's round 25 (v9.12) and #910's clean Matte judgement; Text Curve's #664 (v14.01), queue 800's negative curve, queue 904's animated curve. **Nothing asked for or planned on these controls** |
| 5. Plans | every `tools/design/plans/*/NOTES.md` in this worktree | none of the seven is in any round. opts2 dropped Letter Spread / Text Curve as "the text renderer, risky to keep byte-identical code-only" — taken here because Stay upright touches ONE argument of ONE call in each curved painter (a guarded `rotate`), and a recorder test holds the call list; Colour Wash appears only as the reason Fill Silhouette got no gradient (opts4, opts7); Mosaic only as a word for Hexagon Tiles (opts4, opts6); Scatter Array only beside Circle Array (fxnew-circarray). No open question to him on these controls |
| 6. Unmerged branches | every ref of this repo (656: heads, the `ssh/*` remotes and the pile ref), 82 distinct `js/compositor.js` blobs, read-only `git cat-file`; each of the seven rows cut out whole (from its `{ type:` to the next) and searched for `key: 'centerx'` / `'centery'` / `Centre` / `key: 'x'` (Colour Wash), `key: 'shine'` / `'gloss'` / `Shine` / `Specular` / `color: true` (Bump Map), `key: 'gapfill'` / `Grout` / `Gap colour` / `color: true` / `Brick` (Mosaic), `key: 'corners'` / `'cshape'` / `Chamfer` / `Scoop` / `'Cut'` / `'Top'` / `Inverted` (Squircle Corners), `key: 'order'` / `'blend'` / `Behind` / `In front` / `Screen` (Scatter Array), `key: 'blend'` / `'side'` / `Screen` / `Multiply` / `'Top'` / `Rim` (Edge Halo), `key: 'upright'` / `Upright` / `Perpendicular` (Text Curve); and every blob for `p.gapfill`, `p.cshape`, `p.upright`, `p.shine`, `curveUpright` anywhere | **no twin: 0 of 82 blobs on every row**, and none of those five names in any blob. CONTROLS (the cut works): the same cut finds Burst Streaks' `'Inward'` in 7 blobs, Mosaic's `Block size` in 81, Squircle's `Continuous curve` in 80, Text Curve's `'Replaces'` in 80, Scatter Array's `Size vary` in 80, Edge Halo's `Softness` in 81, Bump Map's `Ambient` in 81, Colour Wash's `Midpoint` in 80. /home/ezra/FreeMotion's own refs were not scanned — nothing may run in that checkout during this ship — but its branches are pushed to the same `ssh` remote these refs mirror |

**Excluded, and why.** The 49 effects of rounds one to seven; the `checker`, `grid` and `stripes` kernels (the parked pile commit T25
`1ca7ffe5`); every WARP_FX effect (each has a GLSL twin a code-only round cannot prove — Wave, Pond Rings, Twirl, Pinch / Bulge,
Fisheye, Kaleidoscope, Polar Coordinates, Bend, Glass, Curl, Noise Warp, Wormhole, Tile Grid, Ring Array, Mirror Tile, Centre Squeeze,
Squeeze, Turbulent Displace, Taffy Pull, Brick Slide, Tile Spin, Title Warp); everything the pile still carries a fix or a control for
(T16's keyed-speed list; T07 Smooth Edges / Linear Streaks / RGB Split / Smooth Bevel / Shake; T08 the glows; T23 the wipes; T25
Halftone; T26 Border Frame; T27 Light Sweep; T28 Bolts; T29 Torn Edge / Cracked Cells; T30 Lens Flare; T31 Lamp / Poster Shadow; T32
Tilt Shift; T33 Vignette; T34 Directional / Gaussian Blur; T35 Card Flip and the warps; T09 Unsharp Mask; T38's grades); **Orbit Streaks'
Tint** (an averaging smear: a tint on its taps tints the whole layer, not the trail — no clean "trail" to colour); **Orbit Streaks' Both
ways** (that is Spin Blur, round one's Smears); **Heat Map's Steps / Reverse** (twins by stacking — Posterize Luma only and Invert
before it do the same); **Number Roll** (round one); **Fractal Noise's drift** (its plan's open question 1 is exactly how it moves);
**Word Highlight's dimmed upcoming words** and **Type-On's random order** (both need the clip-painters' layout, not a string — too much
unproven painter code for a code-only round); **Threshold, Pixelate, Posterize, Duotone, Tint, Mirror** (drawn by their own draw*
functions with a GL path); **Drift's Bounce** (a mover: the bbox, near-test and expand-plate logic would all need it); **Stroke
Colour's Opacity** (also the text layer's own outline, `_mediaOutline`, built fresh each frame — too wide a reach to prove code-only).

## 2. What was built — 7 effects, 13 new controls (13 keys, two of them colour rows)

| Effect (type) | Key | Label | Range / choices | Default | What it does |
|---|---|---|---|---|---|
| Colour Wash (`gradientoverlay`) | `centerx` | Centre X | 0–100 %, keyframable, live under Radial / Conic (`liveWhen` [1, 2]) | 50 | the middle of a Radial or Conic wash across the frame — a glow of colour off one corner (After Effects' Gradient Ramp has a Start of Ramp point); a moved Radial runs from Start at its centre to End at the farthest corner |
| | `centery` | Centre Y | 0–100 %, keyframable, same gate | 50 | …and down it |
| Bump Map (`bumpmap`) | `color` | Light colour | colour row | #ffffff | tints the key light (warm lamp, cold moonlight — AE Lighting Effects' Light Color); the ambient fill stays neutral |
| | `shine` | Shine | 0–100 %, keyframable | 0 | a glossy Blinn highlight where the surface faces the light, in the light's colour — wet paint, a plastic logo |
| Mosaic (`mosaic`) | `gapfill` | Gap shows | Picture (0) / Colour (1) / Clear (2), live above Gap 0 (`liveAbove` 0 — a choice row may carry it now) | Picture | Colour fills the gap with grout, Clear cuts it out so the tiles float |
| | `color` | Gap colour | colour row, live under Colour (`colorGate` when 1) | #000000 | the grout's colour (Hexagon Tiles' Grout colour, for square tiles) |
| Squircle Corners (`roundcorners`) | `corners` | Corners | All (0) / Top (1) / Bottom (2) / Left (3) / Right (4) / Diagonal (5: top left and bottom right), greyed while Continuous curve is on | All | which corners are shaped — a tab, a card on the bottom edge, a leaf |
| | `cshape` | Corner shape | Round (0) / Cut (1) / Scoop (2), same gate | Round | Cut chamfers straight across, Scoop bites a quarter circle out — Illustrator's Round / Chamfer / Inverted Round (the ticket, the ticket stub) |
| Scatter Array (`scatterarray`) | `order` | Copies sit | In front (0) / Behind (1) | In front | Behind keeps the layer itself in front of its copies (Trail's own Behind) |
| | `blend` | Blend | Normal (0) / Add (1) / Screen (2) | Normal | lays each copy on as light, so crossing copies glow — the layer itself is always drawn normally |
| Edge Halo (`mattefringe`) | `blend` | Blend | Normal (0) / Screen (1) / Multiply (2) | Normal | Screen: the band as light (a rim light), Multiply: as shade (an inked inner edge) |
| | `side` | Rim on | All round (0) / Top (1) / Right (2) / Bottom (3) / Left (4) | All round | the band only on the edge facing that way — a rim light from one side |
| Text Curve (`textcurve`) | `upright` | Letters | Follow the curve (0) / Stay upright (1) | Follow | each letter stands straight where it sits on the arc (AE text on a path, Perpendicular To Path off) — still and animated |

Exact definitions (js/compositor.js; each helper has a suite seam):

- **Centre X / Y** (inline in `PIXEL_FX.gradientoverlay`): for Radial and Conic only, `ocx` = W x X / 100 (held to 0..100) and `ocy`
  likewise — the old `cx` / `cy` themselves at 50; a moved Radial's maxR is the distance to the farthest corner (which at the middle is
  the old half-diagonal). Linear reads neither.
- **Light colour / Shine** (`bumpLit966`, seam `FM._bumpLit966`): the kernel's loop with each channel shaded amb + key x (c / 255) and
  Shine x 255 x (n . h)^64 x (c / 255) added, h the half vector between the light and the viewer (0, 0, 1).
- **Gap shows / Gap colour** (`mosaic966`, seam `FM._mosaic966`): the kernel's block loop, then each block's margin (what the old loop
  leaves as the picture) filled with the colour at the tile's own alpha, or cleared.
- **Corners / Corner shape** (`cornerPath966`, seam `FM._cornerPath966`, called in both of the kernel's rounded-rectangle paths — the
  layer-space one and the axis-aligned fallback): Round is `roundRect` with per-corner radii `[tl, tr, br, bl]`, the unchosen ones 0;
  Cut a straight line from r along one edge to r along the other; Scoop an `arc` of radius r centred on the corner, anticlockwise.
- **Copies sit / Blend** (inline in `CANVAS_FX.scatterarray`): Behind skips the first `drawImage(A, 0, 0)` and makes it after the
  copies; Add / Screen set `globalCompositeOperation` 'lighter' / 'screen' inside each copy's own save.
- **Blend / Rim on** (`fringe966`, seam `FM._fringe966`): the band (the kernel's own All round, or one-sided: a layer pixel with a clear
  pixel within Width straight that way, clamped at the plate's edge as the erosion is), the kernel's feather copied, Strength, then
  Normal / Screen / Multiply mixed in by coverage, never outside the layer.
- **Letters** (TEXT_FX.textcurve sets `st.curveUpright`; `drawArcLine` skips its `rotate`; `drawAnimatedText` turns each letter back by
  its unit's turn, `rotate(-sign x U.a)` in place of `rotate(sign x (C.a − U.a))`). Seam `FM._drawArcLine`.

## 3. Why each default is exact (byte-identical pixels / identical call lists)

- **No `legacy` anywhere, and every `def` IS today's look**, so the render-time fill (queue 784) writing the default into a saved
  project's absent key changes nothing. Each kernel reads its key with a literal fallback equal to `def` — `p.centerx == null ? 50`,
  `p.centery == null ? 50`, `p.shine==null?0`, `p.gapfill==null?0`, `fparam(p, 'corners', 0, t)`, `fparam(p, 'cshape', 0, t)`,
  `fparam(p, 'order', 0, t)`, `fparam(p, 'blend', 0, t)` (Scatter Array), `p.blend==null?0` and `p.side==null?0` (Edge Halo),
  `p.upright == null ? 0` — which is what `FM._fxFillValue` reads (the rows tests check `FM._fxFillValue` itself). The colour rows fill
  to `defColor` (#ffffff Bump Map, #000000 Mosaic), and an absent colour is that colour in the kernel too.
- **Colour Wash:** Linear never reads the centre; at 50 / 50 `ocx` / `ocy` ARE `cx` / `cy` (no arithmetic) and maxR is not touched, so
  `ry = y − ocy` and `rx = x − ocx` are the old subtractions.
- **Bump Map:** white and 0 % (or below, or NaN) run the old loop untouched; the helper at white and 0 is the old loop anyway (amb + key
  x 1 is amb + key — a test holds it byte for byte on a busy picture).
- **Mosaic:** Picture, or any margin of 0 (Gap 0 — the default), runs the old loop untouched.
- **Squircle Corners:** All and Round make the old `roundRect(x, y, w, h, r)` call itself, in both paths; Continuous curve is untouched.
  A recorder test compares the whole call list.
- **Scatter Array:** In front and Normal make the old calls in the old order (`fparam` reads are not calls) — the recorder holds the
  call list, and 482 14.5's pinned call hashes (`b14Pinned`) cover it too.
- **Edge Halo:** Normal and All round take the two old paths (fast and feathered) untouched; the gate is read after the old band is
  built, so nothing before it moves.
- **Text Curve:** Follow never sets `st.curveUpright`, so `_cUp` is false, `drawArcLine` makes its `rotate(sign * a)` and the animated
  path its `rotate(sign * (C.a − U.a))` — the same expression, operation for operation.
- **Arity unchanged** for every kernel (gradientoverlay, bumpmap 5; mosaic, mattefringe 6; the canvas kernels' 12; textcurve 3), so
  pxToPlate treats each as before — Mosaic and Edge Halo still scale their own px controls.
- **Not exact by design, off the default only:** a moved Radial is normalised to its farthest corner; Shine adds a little light to a flat
  surface (11.7 levels at 100 % under the default light — a real Blinn highlight on a surface lit 35° off straight on); in the animated
  upright path a letter is turned and turned back (a matrix product, ~1e-16 off the identity).

## 4. The sweeps (reasoned, owed a run)

- **`no effect erases the layer at a single parameter extreme (queue 264)`** — orange 300 x 450 layer over black, 540 x 960, t = 0.5,
  one param at min or max (choices at their last index; colour rows are not swept). **No ALLOWED entry needed:**
  - Colour Wash Centre 0 / 100 at the default Linear: Linear ignores the centre — the old wash.
  - Bump Map Shine 0 / 100: light added, the layer still there.
  - Mosaic Gap shows Clear at the default Gap 0: nothing to clear — the old mosaic.
  - Squircle Corners Diagonal / Scoop at the default Continuous curve on: dead — the squircle.
  - Scatter Array Behind / Screen: the layer is drawn either way.
  - Edge Halo Multiply / Rim on Left: a 3 px band changes; the layer's interior is untouched.
  - Text Curve Stay upright: a text effect on a shape does nothing.
- **`effects: no effect slider is completely inert`** (PIXEL_FX ranges): Colour Wash Centre X / Y — the sweep sets their controller to
  `liveWhen[0]` = Radial, where moving the centre moves the wash; Bump Map Shine — 0, 17, 41, 66, 93 % each add more highlight on the
  subject's edges (and ~2–11 levels on its flats). The other new controls are choices or colours, not swept.
- **`784: no effect is switched off by a missing param key`** — a bare `{}` fills every new key to its default (identity).
- **`793: every param shows in the inspector what an absent key renders`** — the literals above equal each `def` (centerx 50, centery 50,
  shine 0, gapfill 0, corners 0, cshape 0, order 0, blend 0, blend 0, side 0, upright 0); the colours are not compared.
- **`859: every pixel effect draws the same picture on the preview plate as in the export`** — defaults only: unchanged.
- **`482: every effect does something visible at its own defaults`** — unchanged.
- Also reasoned: the legacy-keys tests (`the pattern effects still render an un-upgraded instance` — Mosaic; `the relief effects …` —
  Bump Map; the matte-cleanup one — Edge Halo): each stamps a NEW instance and compares with a bare one — the new keys at their defaults
  draw the old picture. 482 14.5's Scatter Array pins: `b14Base` keeps the new keys at their defaults, which make the old calls, so the
  hashes hold. Queue 621's rounded-corner area tests, 904 textcurve (animated = still at rest) and 800 (negative curve) run at Follow.
  The phone option-button sweep (`no effect option button is unreachable on a phone`): Corners' six one-word buttons and Rim on's five
  wrap like Channel Remap's eight; Letters' two are short phrases. CROP_FX: Bump Map and Edge Halo stay members (per-pixel over the same
  3 x 3 / Width neighbourhood; a one-sided band reads a subset of the old reach, inside the crop margin of 3 x Width + 8) — two tests run
  `FM._cropIdentity` with the new controls on; Colour Wash, Mosaic were never members. Adjustment layers: none of the seven is PIXEL_ADJ.
  fx-thumbs: new instances at their defaults draw the old tiles — no buster.

## 5. Busters and schema

- `index.html`: `js/compositor.js?v=229 → 230`, `js/fx-registry.js?v=30 → 31` (the seven descriptions name the new choices; a choice
  row's `liveAbove` survives `paramsOf`), `js/collab-core.js?v=42 → 43`. fx-thumbs (59) and inspector (426) are untouched — the
  registry derives the rows, and markOverridden already reads `liveAbove` on any row (segment rows included, and `regate` re-judges them
  when Gap moves); no label became wrong, so there is no alias. (Squircle Corners' toggle note now names Corners and Corner shape — a
  note, not a label; no test pins it.)
- `js/collab-core.js`: `C.SCHEMA_REV = 23` with a Rev 23 note. **`C.SCHEMA_FP` is still rev 21's number** (round seven's FP TO PIN comment
  left as it is), under a new one-line `/* FP TO PIN (966 opts8) */` comment — the builder measures rev 23 with fp.js; `921 S1 the schema
  fingerprint gate` fails until then.

## 6. Tests (tests/tests.js, one block between `// ── 966 opts8 (hunt/966-opts8) ──` and `// ── end 966 opts8 ──`)

All `{ item: '966', budgetMs: 60000 }`, each failing on baff9747 on its first line by naming the missing control or seam (`_o8Need`).
The block's helpers are its own (`_o8…`, including a recording 2D context, `_o8Rec`); it uses only `test`, `sleep` and E1 from the rest
of the file. 27 tests:

1. `966 opts8 every new control at its default draws what the effect drew without it — Colour Wash, Bump Map, Mosaic, Squircle Corners, Scatter Array and Edge Halo through the compositor…` (1:1 and half plate, 0.61 / 1.73 s, grey ground; CONTROL each changes the picture)
2. `966 opts8 Colour Wash has Centre X and Centre Y (0–100 %…` (a; gate [1, 2], clamps, no px keys)
3. `966 opts8 Colour Wash Centre: a Radial wash at (25 %, 50 %) is black at (50, 50), mirrored about it, runs to the farthest corner…` (b; 193.5 at (170, 50), Conic 0 / 63.75 / 127.5, Linear ignores it, keyed, held; CONTROL the middle radial)
4. `966 opts8 Colour Wash at Centre 50 / 50 draws byte for byte…` (c; eight cases; CONTROL Radial and Conic move)
5. `966 opts8 Bump Map has Shine (0–100 %…) and a Light colour (white)…` (a)
6. `966 opts8 Bump Map Light colour: a flat grey lit white reads 139 as before, lit #4080c0 it reads (83, 102, 121)…` (b; red light, neutral ambient, the helper = the old loop byte for byte)
7. `966 opts8 Bump Map Shine: a flat grey gains 11.7 at 100 % (139 → 151)…` (b; 50 %, cyan light keeps red at 64, facing vs away)
8. `966 opts8 Bump Map at a white light and Shine 0 % draws byte for byte…` (c; crop identity lit and shining; CONTROL)
9. `966 opts8 Mosaic has Gap shows (Picture, Colour or Clear…) and a Gap colour (black)…` (a; the `liveAbove` gate on a choice row)
10. `966 opts8 Mosaic Gap shows: at Gap 30 % with 16 px blocks every 2 px gap pixel is exactly the Gap colour…` (b; Clear, tiles untouched, cut-out grout, 0.5 plate; CONTROL Picture)
11. `966 opts8 Mosaic on Picture draws byte for byte…` (c; Colour / Clear at Gap 0 are the old picture; CONTROL)
12. `966 opts8 Mosaic’s Gap shows greys out in the inspector while Gap is 0 and wakes above it…` (the gate in the panel; Gap colour wakes under Colour)
13. `966 opts8 Squircle Corners has Corners (…) and Corner shape (…)…` (a; gated by the curve toggle)
14. `966 opts8 Squircle Corners Corners and Corner shape: on a 100 x 80 box at Radius 30 a Cut takes (22, 22) and keeps (28, 28)…` (b; 18 shape x set cases, four corners each)
15. `966 opts8 Squircle Corners through the compositor: Top keeps a rect’s bottom-left corner square…` (b; layer-space path, 1:1 and half plate; CONTROL)
16. `966 opts8 Squircle Corners at All and Round makes the old calls, call for call…` (c; recorder and pixels; CONTROL Top's `[30, 30, 0, 0]` call, Cut / Scoop paths)
17. `966 opts8 Scatter Array has Copies sit (…) and Blend (…)…` (a)
18. `966 opts8 Scatter Array Copies sit and Blend: Behind draws the very same copies and the layer last…` (b; recorder order and ops, pixels, Add ≥ Screen ≥ Normal; CONTROL In front)
19. `966 opts8 Scatter Array at In front and Normal makes the old calls, call for call…` (c; CONTROL Behind, Add)
20. `966 opts8 Edge Halo has Blend (…) and Rim on (…)…` (a)
21. `966 opts8 Edge Halo Rim on and Blend: Top keeps the 3 px band to the top rows 20–22…` (b; four sides, Screen (200, 235, 255), Multiply (0, 79, 40), half plate 2 rows, Softness; CONTROL All round)
22. `966 opts8 Edge Halo at Normal and All round draws byte for byte…` (c; crop identity one-sided and screened; CONTROL)
23. `966 opts8 Text Curve has Letters (Follow the curve or Stay upright…)` (a)
24. `966 opts8 Text Curve Stay upright: the curved painter puts every letter of “HELLO” in the very same places on the arc with no turn at all…` (b; recorder at 60° / −60°, `st.curveUpright`, the last Text Curve deciding, applyTextEffects)
25. `966 opts8 Text Curve Stay upright through the compositor: a 120° curve stands its letters upright, still and animated…` (b; animated at rest = still)
26. `966 opts8 Text Curve following the curve draws byte for byte…` (c; still, downward, added, animated, 1:1 and half; CONTROL)
27. `966 opts8 the seven effects’ editors, new rows and all, fit the inspector…` (phone fit; CONTROL labels Centre X, Light colour, Gap shows, Corner shape, Copies sit, Rim on, Stay upright)

**MEASURE placeholders (generous bounds; the builder measures at 1280 and 380 and tightens):**
- test 7: the shine at an inner pixel of a grey ramp facing the light vs the same ramp facing away (Relief 400) — bound face ≥ away + 8
  and face ≥ 2 x away; reasoned about 22 and 6.
- test 18: pixels of the layer the copies change under In front — bound ≥ 100 of 1200, expected several hundred; the brightest layer
  pixel under Add on the grey block — bound ≥ 100, expected 100–200.
- test 25: the animated (by character and by word) upright text at rest against the still upright text — bound mad < 0.5, expected
  about 0; Stay upright against Follow on the still text — bound mad > 2, expected a few units ('904 textcurve' measured 8.47–11.28 for
  a 60° bend).
- Reasoned floors (not MEASURE, but worth a look): test 1's 50; tests 4, 8, 11's 1000; test 19's 100 / 100; test 22's 50 / 50; test
  26's 20; test 21's Softness row-24 reach (2 / 7 coverage).

**Shared test edited: none.** Searched tests.js for each type id — `'gradientoverlay'` (queue 537's tests, the keyframed-colour test, #484's
renames, 986 C-series fixtures — all on Linear or the middle), `'bumpmap'` and `'mosaic'` and `'mattefringe'` (the legacy-keys rows:
they stamp a new instance, whose new keys are the old look; the plate-scale row), `'roundcorners'` (queue 621's area tests, at All /
Round), `'scatterarray'` (482 14.5's catalogue and pinned call hashes, its Drift / Spin test, the repeat category), `'textcurve'` (904,
800, opts4's spacing test) — every one reads its own keys or the defaults.

## 7. #545 before/after sheet (owed — for him to pick or veto)

Render through the app (`FM.renderScene` in a tests/ probe), at phone size (≈ 380 px wide frame), each option at 2–4 values beside
today's default, on a fixture where it clearly shows:
- **Colour Wash** on a photo, Radial, Screen, magenta → transparent-ish blue: Centre (50, 50) (today) / (20, 25) / (80, 75); a Conic one
  at (30, 70).
- **Bump Map** on an embossed title or a logo: Light colour white (today) / warm #ffb060 / cold #6080ff; Shine 0 (today) / 50 / 100 %
  (Relief 200 so the highlight reads).
- **Mosaic** on a photo, Block 24, Gap 20: Picture (today) / Colour black / white / Clear over a coloured ground.
- **Squircle Corners** on a photo card, Continuous curve OFF, Radius 60: All Round (today) / Top / Diagonal; Cut / Scoop.
- **Scatter Array** on a logo over black: In front (today) / Behind; Normal (today) / Add / Screen.
- **Edge Halo** on a cut-out subject, Width 6: All round Normal (today) / Top Screen in warm white (the rim light) / Multiply black.
- **Text Curve** "FREE MOTION" at 120°: Follow the curve (today) / Stay upright, and a Fade-in strip of each.
Names to put to him (#954 / "options, recommended next to the best"): Centre X / Y, Light colour, Shine, Gap shows (Picture / Colour /
Clear), Gap colour, Corners (All / Top / Bottom / Left / Right / Diagonal), Corner shape (Round / Cut / Scoop), Copies sit, Blend (Add /
Screen), Blend (Screen / Multiply), Rim on, Letters (Follow the curve / Stay upright).

## 8. Risks and what is unsure

- **Nothing was run.** Every claim in the tests is reasoned; the first run may move a marked bound or expose a slip in a worked pixel
  (each is worked in the test's comment, so a red can be checked quickly).
- **A choice row can now carry `liveAbove`** (fx-registry `paramsOf`'s segment copy names it). Every other choice row carries it as
  `undefined`, so its JSON is unchanged; anything that lists a row's own keys (Object.keys) sees one more name. The collab fingerprint may
  hash it — it is re-measured at rev 23 anyway.
- **Mosaic's Gap colour cannot show at the effect's own defaults** (Gap is 0 — there is no gap, and the row is greyed): its test shows the
  colour exactly, (40, 200, 120) against the default black in every channel, at Gap 30 with Gap shows Colour — the fewest settings off
  their defaults that give the colour somewhere to go. The grout's alpha is the tile's own, so a cut-out's empty frame stays empty.
- **Squircle Corners' two rows only work with Continuous curve OFF** — and a NEW Squircle Corners has it ON (`def 1`), so both rows start
  greyed and say "Overridden by Continuous curve". That is the honest gate (the squircle has no corners to choose), but on the sheet he
  should see it off; if he wants Corners to switch the curve off by itself, that is a `sets` on the row.
- **Diagonal is top left and bottom right only.** The other diagonal is one more button if he wants it.
- **Bump Map's Shine is a fixed exponent (64).** At 100 % a flat surface under the default light gains 11.7 levels (the light is 35°
  off straight on, so a flat surface catches a little of the highlight); a strong edge facing the light gains up to ~145. A Gloss slider
  (the exponent) would be the next control. Like the relief itself, the highlight is computed on plate pixels, so a reduced preview's
  edges are a little steeper — the existing trade, not a new one.
- **Bump Map's Light colour tints only the key light**; the ambient half stays the picture's own colour (After Effects lights work that
  way; a fully coloured picture is Colourize's job).
- **Colour Wash's moved Radial reaches End at the farthest corner**, so moving the centre also stretches the ramp; at the middle that
  distance is the old half-diagonal, so the change is continuous.
- **Edge Halo's one-sided band** is a straight-line test (a clear pixel within Width straight up for Top): on a round subject the rim is
  Width deep measured vertically, thinner across the sides — a light from above, as intended. With Softness the feather can carry a
  little colour round the corner onto the side edges near the top.
- **Text Curve's Stay upright** keeps the arc places, so at a steep curve the end letters crowd (as in other apps). In the animated path a
  letter is turned and turned back, which is ~1e-16 off identical — test 25's bound is generous for that.
- **Scatter Array's Blend applies to the copies only**; Add over the empty frame is the copy itself (nothing under it to add to).
- The descriptions grew a clause each; no test pins their text.

## 9. Owed by the builder

1. First run of the 27 tests at 1280 and 380 (`?only=966%20opts8`), set the MEASURE bounds from measurement.
2. Measure and pin `C.SCHEMA_FP` (fp.js) at rev 23 — round seven's rev 22 was never pinned either, so one measurement on the assembled
   tree covers both — replacing both FP TO PIN comments.
3. Full suite (the sweeps in §4, the legacy-keys rows, 482 14.5's Scatter Array pins, queue 621, 904 / 800 textcurve, the phone option
   buttons), prove.sh, then the #545 sheet in §7 before the release that ships it.
