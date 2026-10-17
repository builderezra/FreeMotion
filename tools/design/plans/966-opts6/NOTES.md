# #966 opts6 — a sixth round of more choice on seven effects he already has (hunt/966-opts6)

His standing request #966: *"you can polish other effects just giving them more features and making them work a bit better and
have more customisation … more choices always better … this is the complex version we want as much choice as possible"*.

Branch `hunt/966-opts6`, based on da12a813 (the v17.66 assembly: rounds one to five are in). **Code only, 18 Oct, while a release
shipped from the main checkout: nothing was run but `node --check`** (js/compositor.js, js/fx-registry.js, js/collab-core.js,
js/inspector.js, tests/tests.js — all OK). No browser, no suite, no tools/*.sh, no node or python running app or test code. Read-only `git` and
`grep` / `awk` over the refs for the twin check.

## 1. Twin check (written before any code)

Picked for what he would SEE on a phone and to spread the categories: a generator (Laser Beam), a 3D look (Depth Push), a stylize /
mosaic (Hexagon Tiles), a text effect (Text Repeat), a colour effect (Palette Map), a texture (Grunge) and a distortion (Shockwave).
Every candidate was checked by CONTENT, never by git ancestry:

| Check | How | Result |
|---|---|---|
| 1. Already in the code? | each effect's EFFECTS row and kernel in this worktree | none of the new keys is on these rows or read by their kernels: Laser Beam drew Start → End whole with a literal `'#ffffff'` core; Depth Push filled `'rgba(0,0,0,…)'` and drew every copy full size; Hexagon Tiles had level rows and the centre pixel's colour only; Text Repeat had four separators and one line; Palette Map's Your colours had only the nearest-colour loop; Grunge hashed only the cell; Shockwave's Radius had no time term |
| 2. Idle backlog | `tools/design/plans/2026-09-29-idle-backlog/backlog.md` for each type id, label and idea | **nothing planned for these controls.** 10.7 (Hexagon Tiles) lists exactly the Grout / Edge shade it shipped with; B37 (Laser Beam) only its landing; Palette Map appears only in the Game Boy filter recipe |
| 3. ChatGPT pile | `/home/ezra/FreeMotion/tools/design/chatgpt-tasks/pile/LAND-LIST.md` and `INVENTORY.md` | **0 hits** for Depth Push / rasterextrude, Hexagon Tiles / hextiles, Text Repeat, Palette Map, Grunge, Shockwave. Laser Beam: only `44b15c57` / `8efc6234`, both already ported (B37) — neither has Draw on or a core colour |
| 4. POLISH-LOG / REQUESTS | grep /home/ezra/FreeMotion for the same words | history only: Text Repeat's birth (v14.01, with Text Reverse and Text Pad), Palette Map's #904 rework (v16.68, Your colours), Grunge's EFFECTS-PLAN round 19 (v9.04: grain size, darkness, colour), Hexagon Tiles' plate-scale and #692 bounding (v5.32, v14.80), Depth Push's #908 full-frame note (v16.28) and plate scaling, Shockwave's raised Strength ceiling (#482), Laser Beam's landing (v17.50). Nothing asked for or planned on these controls |
| 5. Plans | every `tools/design/plans/*/NOTES.md` in this worktree (the 966-opts…opts5 rounds and the B-numbered items) | none of the seven is in any round. opts5 left **Hexagon Tiles' Angle** "for a later round" (Honeycomb's Angle landed in round four — one of the pair per round): taken here. `pile-laser/NOTES.md` asks him "Follow the layer?" and "a smooth glow falloff?" — neither is built here (they are his calls); Draw on and Core colour are not among its questions. `fxnew-radiowaves/NOTES.md` keeps Radio Waves (many rings) apart from Shockwave (one ring that bends the picture) — Expand speed keeps it one ring |
| 6. Unmerged branches | every ref of this repo (650: heads and the `ssh/*` remotes), 80 distinct `js/compositor.js` blobs, read-only `git cat-file`; each of the seven rows cut out whole (from its `{ type:` to the next) and searched for `key: 'draw'` / `color2` / `Core` (Laser Beam), `taper` / `color: true` / `Side colour` (Depth Push), `key: 'angle'` / `key: 'sample'` (Hexagon Tiles), `perline` / `Comma` / `Slash` / `'Bar'` / `Dash` (Text Repeat), `key: 'match'` / `Brightness` (Palette Map), `key: 'seed'` / `boil` / `Pattern` (Grunge), `key: 'expand'` / `key: 'speed'` / `travel` / `rings` / `grow` (Shockwave), and the Shockwave kernel in every blob for `p.expand` / `p.speed` / `p.rings` | **no twin.** (A first Shockwave pass matched "expands" in its own description — re-cut on `key: '…'`: none.) /home/ezra/FreeMotion's own refs were not scanned — nothing may run in that checkout during this ship — but its branches are pushed to the same `ssh` remote these refs mirror |

**Excluded, and why.** The 35 effects of rounds one to five; the `checker`, `grid` and `stripes` kernels (the parked pile commit T25
`1ca7ffe5`); every WARP_FX effect (each has a GLSL twin a code-only round cannot prove — so not Tile Spin, Brick Slide or Squeeze);
everything pile T16 still carries a fix for (Chunk Noise, Electric Edges, Orbit, Fractal Ridges, Spin, VHS, Glow Scan, Breathe,
Noise, Glitch, Dissolve, Clouds, Iridescence, Lightning, Scramble, Pulse, **Swing** — `eec3a0d6` rewrites its keyed-speed phase —
Flicker, Wiggle, Shake, Frame Stutter, Particles, Voronoi, Flash Random, Scanlines); **a Dither on Palette Map** (position-dependent:
Palette Map is a CROP_FX member and an adjustment-layer grade, and Gradient Map's dither already needed `FM.adjNeedsFrame` to stop a
zoomed slice crawling — Match by Brightness, a point op, instead); **Crosshatch on paper** (a third Paper row in three rounds — a
later round); **Gradient Wipe's border** (its own plate path, and its pile NOTES still has his questions open); **Glitter** (opts5:
its stars are 14 px, a Spin would not read on a phone).

## 2. What was built — 7 effects, 12 new controls (11 keys, two of them colour rows, and four new choices on Text Repeat's Separated by)

| Effect (type) | Key | Label | Range / choices | Default | What it does |
|---|---|---|---|---|---|
| Laser Beam (`laserbeam`) | `draw` | Draw on | 0–100 %, keyframable | 100 | the beam reaches from Start this share of the way to End (glow and core with it); keyframe 0 → 100 and it shoots across, like a saber or a scanner |
| | `color2` | Core colour | colour row | #ffffff | the colour of the white-hot core — a red beam with a yellow core, a blue one with cyan |
| Depth Push (`rasterextrude`) | `color` | Side colour | colour row, greyed while Side shade is 0 (`colorGate` deadAt 0) | #000000 | what the sides shade toward: gold sides on a logo, a white bevel, a 3D title in any colour. The `darken` row's label "Side Darken" is **"Side shade"** now (same key, range, default); "side darken" stays a search word |
| | `taper` | Taper | 0–90 %, keyframable | 0 | the back of the slab this much smaller than the front, about the layer's middle — the extrusion in perspective |
| Hexagon Tiles (`hextiles`) | `angle` | Angle | 0–360°, keyframable | 0 | turns the tiles about the middle of the frame (keyframe it for a slow spin) — Honeycomb's Angle's sibling |
| | `sample` | Sample | Centre (0) / Cell average (1) | Centre | Cell average colours each tile with its whole cell's mean (alpha-weighted), so a tile no longer flickers when its middle pixel does — Halftone Dots' Sample |
| Text Repeat (`textrepeat`) | `sep` | Separated by | + Comma (4), + Slash (5), + Bar (6), + Dash (7) | Space (0), unchanged | `Paris, Paris`, `NAME / TITLE`, `NAME \| TITLE`, `go — go` |
| | `perline` | Per line | 0–20, keyframable, greyed under New line (`liveWhen` [0, 2–7]) | 0 | a line break after every that many copies — the wall of repeated words, three to a line |
| Palette Map (`palettemap`) | `match` | Match by | Nearest colour (0) / Brightness (1), live only under Your colours (`liveWhen` 1) | Nearest colour | Brightness lays the palette over the picture's tones, darkest on the shadows, whatever the hue — four greens give the Game Boy look |
| Grunge (`grunge`) | `seed` | Pattern | 0–999, keyframable | 0 | another set of blotches (two dirty layers stop matching) |
| | `boil` | Boil | 0–30 Hz, keyframable | 0 | deals new dirt this many times a second — grime that crawls like dirt on a film print; integrated when keyframed |
| Shockwave (`shockwave`) | `expand` | Expand speed | 0–200 %/s, keyframable | 0 | the ring travels out by itself, this much of Radius a second on the clip's own clock (integrated when keyframed) — drop it on a cut and it fires |

Exact definitions (js/compositor.js; each helper has a suite seam):

- **Draw on / Core colour** (inline in `CANVAS_FX.laserbeam`): `draw` = Draw on / 100 held in 0..1; the bands run from (x1, y1) to
  (ex, ey) = (x2, y2) at 1, else (x1 + (x2 − x1) d, y1 + (y2 − y1) d); at 0 no band is drawn. The core band's fill is `p.color2`, or
  `LB_DEF.color2` = `'#ffffff'`.
- **Side colour** (inline): the old `'rgba(0,0,0,' + dk + ')'` source-atop fill, replaced by `'rgba(r,g,b,' + dk + ')'` only when the
  colour is not black. **Taper** (`extrudeTaper966`, seam `FM._extrudeTaper966`): copy i of `steps` drawn at s = 1 − tp · i / steps
  about the layer box's middle, moved i steps along the angle; the front is the kernel's own last drawImage.
- **Angle / Sample** (`hexTiles966`, seam `FM._hexTiles966`): the kernel's loop to the operator in the grid's own frame — pixel
  (x, y) is read at (mx + ux cos a + uy sin a, my − ux sin a + uy cos a) about the plate's middle (honeycomb966's convention), the
  nearest centre is turned back before it is sampled; Grout / Edge shade use the same bisector distances. Cell average: a first pass
  sums r·a, g·a, b·a, a per cell over the kernel's bounded region; a tile takes sum / Σa when its centre's alpha is above 0, and keeps
  its centre's alpha (a clear centre keeps the clear centre, colour and all, as under Centre).
- **Separators / Per line** (inline in `TEXT_FX.textrepeat`): `', '`, `' / '`, `' | '`, `' — '`; Per line p (0 < p < copies, and not
  New line) puts `'\n'` instead of the separator before every copy k with k mod p = 0.
- **Match by Brightness** (`paletteLuma966`, seam `FM._paletteLuma966`): the palette colour whose 0.299 / 0.587 / 0.114 brightness is
  nearest the pixel's, the first of equals; the kernel's mix line.
- **Pattern / Boil** (`grunge966`, seam `FM._grunge966`): key = imul(Pattern, 0x27d4eb2d) + imul(deals, 0x165667b1), deals =
  floor(t · Boil) on project time (Dissolve's Boil), or `FM.integrateCount` from 0 when keyframed; the key is XORed into the kernel's
  first cell hash and `imul(key, 0x9E3779B1)` into the second.
- **Expand speed** (`shockTravel966`, seam `FM._shockTravel966`): travel = speed · tl (tl the clip's own time, `FM.fxLocalTime` of the
  layer the dispatcher hands as `arguments[7]`), or ∫ speed from the clip's first moment when keyframed; Radius + travel.

## 3. Why each default is exact (byte-identical pixels / character-identical strings)

- **No `legacy` anywhere, and every `def` IS today's look**, so the render-time fill (queue 784) writing the default into a saved
  project's absent key changes nothing. Each kernel reads its key with a literal fallback equal to `def` — `fparam(p, 'angle', 0, t)`,
  `p.sample==null?0`, `fparam(p, 'taper', 0, t)`, `p.perline == null ? 0`, `p.match==null?0`, `gr_p.seed==null?0`, `gr_p.boil==null?0`,
  `p.expand == null ? 0` — which is what `FM._fxFillValue` reads (Laser Beam's `draw` has no literal, so the fill uses the schema default
  100, which is `LB_DEF.draw`, the kernel's own fallback). Colour rows fill to `defColor` / `defColor2`.
- **Laser Beam:** at Draw on 100 the end point is the variables `x2, y2` themselves (no arithmetic), and the core fill is the literal
  `'#ffffff'`; the four `lbBand` calls are the old calls with the same numbers. (`#FFFFFF` parses to the same fill: a test holds it.)
- **Depth Push:** black keeps the old fill string (the new one is only assigned for a non-black colour); `tp > 0` alone reaches
  extrudeTaper966, so Taper 0 (or below, or NaN) runs the old loop untouched.
- **Hexagon Tiles:** only an angle off a whole turn (`((a % 360) + 360) % 360 !== 0`) or Sample 1 calls hexTiles966; 0° with Centre
  runs the old loop. hexTiles966 is the loop to the operator (same guess, search order, first-of-equals, rounding and clamping, the same
  5 x 5 bisector expressions), so 0° with Cell average has the old geometry and the old silhouette.
- **Text Repeat:** the old `sep` expression stays; values 4–7 (which were a space) are re-set after it; any other value is still a space;
  Per line 0 / ≥ copies / under New line runs the old loop line for line (a test compares against a copy of the old kernel).
- **Palette Map:** Match by 1 alone reaches paletteLuma966 — and only inside the Your colours branch; Levels never reads it.
- **Grunge:** a key of 0 (Pattern 0 and no deal yet — every saved Grunge) runs the old loop; `x ^ 0` is `x` anyway.
- **Shockwave:** travel 0 leaves `swR` the old Radius expression and `rad = swR / 100 * maxR` is the old arithmetic, operation for
  operation; `p.radius == null ? 40` is still the literal 793's fill reads.
- **Arity unchanged** for every kernel (hextiles 7 — it scales its own tile size; grunge and palettemap 5; shockwave 6; the canvas
  kernels' signatures; textrepeat 3), so pxToPlate treats each as before.
- **Not exact by design, off the default only:** a tapered copy is resampled by the canvas (smoothed edges); Cell average writes
  sum / Σa rounded by the byte; a turned lattice reads its grid at cos 90° = 6e-17, not 0.

## 4. The sweeps (reasoned, owed a run)

- **`no effect erases the layer at a single parameter extreme (queue 264)`** — orange 300 x 450 layer over black, 540 x 960, t = 0.5,
  one param at min or max (segments at their last index): **no ALLOWED entry needed.**
  - Laser Beam Draw on 0 draws no beam, but the layer is drawn first (`B.drawImage(A)`): visible. 100 is the default. Colour rows are not swept.
  - Depth Push Taper 0 / 90: the front is drawn last at full size — visible.
  - Hexagon Tiles Angle 0 / 360 is a whole turn (the old loop); Sample Cell average on a flat orange is the orange.
  - Text Repeat's choices and Per line are a text effect's: on this shape they do nothing.
  - Palette Map Match by Brightness under the new instance's Your colours: #e8a33d is as bright as 172.0, nearest the amber (172.7) — visible.
  - Grunge Pattern 0 / 999, Boil 0 / 30: dirt over the layer, as at the defaults.
  - Shockwave Expand 200 at the layer's 0.5 s: Radius 40 + 100 = 140 % of the half-diagonal, the ring off the frame, the layer untouched.
- **`effects: no effect slider is completely inert`** (PIXEL_FX ranges at five fractions, five moments, three fixtures, the kernel at
  ps 1 with no layer, so project time): Hexagon Tiles Angle (0 / 61 / 148 / 238 / 335° turn the tiles over the busy subject — alive);
  Grunge Pattern (every value deals other dirt); Grunge Boil (at 0.23 s floor(0.23 x {0, 5.1, 12.3, 19.8, 27.9}) = 0, 1, 2, 4, 6 —
  five different deals); Shockwave Expand speed (at 0.23 s Radius 40 + {0, 7.8, 18.9, 30.4, 42.8} — the ring moves). Laser Beam and
  Depth Push are CANVAS_FX, not swept here; **B37's canvas twin of this sweep now walks Draw on too** (its key list edited, below).
- **`784: no effect is switched off by a missing param key`** — a bare `{}` fills every new key to its default (identity).
- **`793: every param shows in the inspector what an absent key renders`** — the literals above: angle 0, sample 0, taper 0, perline 0,
  match 0, seed 0, boil 0, expand 0 (draw: no literal, schema default 100); colours are not compared.
- **`859: every pixel effect draws the same picture on the preview plate as in the export`** — defaults only: unchanged.
- **`482: every effect does something visible at its own defaults`** — unchanged.
- Also reasoned: the ruler notches (Pattern's 999 is the existing Pattern rows' — Film Grain, Glitch, Starfield; the rest ≤ 360), every
  range default inside its range, the option-button phone sweep (`no effect option button is unreachable on a phone`: Text Repeat's eight
  short buttons wrap as Channel Remap's eight longer ones do), queue 692's crop fixtures (Palette Map stays a CROP_FX member — Brightness
  is a point op; Hexagon Tiles stays BOUNDED_FX and a test holds bounded == unbounded with the new controls on), adjustment layers
  (Palette Map is PIXEL_ADJ; Brightness is a point op, so a zoomed slice needs no `adjNeedsFrame`), `#484` aliases ('side darken'
  reaches the tags), the `fx-atmos` Grunge table (old keys only; a new instance with Pattern 0 / Boil 0 is the old picture).

## 5. Busters and schema

- `index.html`: `js/compositor.js?v=227 → 228`, `js/fx-registry.js?v=28 → 29` (Hexagon Tiles', Text Repeat's, Palette Map's,
  Grunge's and Depth Push's descriptions name the new choices; the `rasterextrude: ['side darken']` alias), `js/collab-core.js?v=40 → 41`,
  `js/inspector.js?v=425 → 426` (one string: Laser Beam's "does nothing here" reason now names Draw on 0 beside Intensity 0 — no test pins
  it). fx-thumbs (59) and audio-fx are untouched — the registry derives the rows (the colour gate, `liveWhen`, the new segment choices
  and `color2` all pass through `paramsOf`).
- `js/collab-core.js`: `C.SCHEMA_REV = 21` with a Rev 21 note. **`C.SCHEMA_FP` is still rev 20's number (1671566249102525)**, under a
  `/* FP TO PIN (966 opts6) */` comment on its own line — the builder measures it with fp.js; `921 S1 the schema fingerprint gate`
  fails until then.

## 6. Tests (tests/tests.js, one block between `// ── 966 opts6 (hunt/966-opts6) ──` and `// ── end 966 opts6 ──`)

All `{ item: '966', budgetMs: 60000 }`, each failing on da12a813 on its first line by naming the missing control, choice or seam
(`_o6Need`, `_o6OptNeed`). 29 tests:

1. `966 opts6 every new control at its default draws what the effect drew without it — Laser Beam, Depth Push, Hexagon Tiles, Palette Map, Grunge and Shockwave through the compositor…` (1:1 and half plate, 0.61 / 1.73 s; CONTROL each changes the picture)
2. `966 opts6 Laser Beam has Draw on (0–100 %, keyframable) and a Core colour…` (a; sanitiser keeps / holds 250 at 100 / drops `url(x)`; px keys still `width`)
3. `966 opts6 Laser Beam Draw on: at 50 % a 20 px beam … lit from 30 to 210…` (b; 25 %, 0 % clear and painted, keyed = plain at 0.5 s, glow ends at 260, half plate 15..105)
4. `966 opts6 Laser Beam Core colour: over black the middle of a white-cored beam is white, a cyan core makes it (204, 255, 255)…` (b)
5. `966 opts6 Laser Beam at Draw on 100 % with a white core draws byte for byte…` (c; five cases incl. cropped and `#FFFFFF`; kernel clamps; CONTROL)
6. `966 opts6 Depth Push has Taper (0–90 %, keyframable) and a Side colour greyed while Side shade is 0…` (a; label, alias, clamps)
7. `966 opts6 Depth Push Side colour: on a red square pushed 20 px right…` (b; exact at full shade, half blue, black and saved = old darkening, front, below, dead at 0)
8. `966 opts6 Depth Push Taper: at 50 % a red square pushed 40 px right narrows…` (b; row end 130 vs 140, column 120 ≈ 26 vs 40, centred, front untouched, clamps)
9. `966 opts6 Depth Push at Taper 0 % with black sides draws byte for byte…` (c; seven cases incl. half plate; CONTROL)
10. `966 opts6 Hexagon Tiles has Angle (0–360°, keyframable) and Sample (Centre or Cell average)…` (a; clamps)
11. `966 opts6 Hexagon Tiles Angle: at 90° the grout … is the unturned grout turned a quarter about the middle, pixel for pixel…` (b; 360° = 0°; colour locality on a self-spelling picture)
12. `966 opts6 Hexagon Tiles Sample Cell average: on red and blue 1-px stripes every averaged tile is a purple…` (b; Centre pure; turned; block on clear and half-alpha flat exact)
13. `966 opts6 Hexagon Tiles at 0° and Centre draws byte for byte … and with the new controls on the bounded fast path is still only a skip` (c; #692 bounded == unbounded; CONTROL)
14. `966 opts6 Text Repeat is Separated by a Space, New line, Dot, Nothing, Comma, Slash, Bar or Dash (storing 0–7) and has Per line…` (a; on a text layer; clamps)
15. `966 opts6 Text Repeat’s new separators and Per line: “Paris” three times with Commas reads “Paris, Paris, Paris”…` (b; 16 exact strings + a keyed Per line)
16. `966 opts6 Text Repeat with its four old separators writes character for character what it wrote before…` (c; against a copy of the old kernel)
17. `966 opts6 Text Repeat CONTROL: on a text layer Comma draws a picture different from Space…` (d; through the compositor)
18. `966 opts6 Palette Map has Match by (Nearest colour or Brightness), live only under Your colours…` (a)
19. `966 opts6 Palette Map Match by Brightness: with its four starting colours a grey ramp steps navy → red at 78, → amber at 149 and → cream at 207…` (b; pure red → navy vs red, Amount 0.5, Colours 2, clear pixels, Levels)
20. `966 opts6 Palette Map on Nearest colour draws byte for byte…` (c; CONTROL)
21. `966 opts6 Grunge has Pattern (0–999) and Boil (0–30 Hz)…` (a; clamps)
22. `966 opts6 Grunge Pattern: on a flat grey plate Pattern 7 deals different dirt…` (b; as much dirt, 8 px grain uniform, Rust only on dirt)
23. `966 opts6 Grunge Boil: at 4 a second the dirt at 0.1 s is the still Grunge byte for byte…` (b; deals, frozen at 0, keyed = integral)
24. `966 opts6 Grunge at Pattern 0 and Boil 0 draws byte for byte…` (c; CONTROL)
25. `966 opts6 Shockwave has Expand speed (0–200 %/s, keyframable)…` (a; clamps)
26. `966 opts6 Shockwave Expand speed: Radius 40 with Expand 40 %/s half a second in draws Radius 60’s ring byte for byte…` (b; 0 s, keyed ramp, stopped, clamp, the seam's numbers incl. a clip at 0.25 s)
27. `966 opts6 Shockwave Expand speed runs on the clip’s own clock…` (b; through the compositor at 1:1 and half plate; CONTROL Radius 70)
28. `966 opts6 Shockwave at Expand 0 draws byte for byte…` (c; CONTROL)
29. `966 opts6 the seven effects’ editors, new rows and all, fit the inspector…` (phone fit; CONTROL labels Draw on, Taper, Cell average, Per line, Match by, Boil, Expand speed)

**MEASURE placeholders (generous bounds; the builder measures at 1280 and 380 and tightens):**
- test 8: the lit run down column 120 at Taper 50 % — bound 22..30, reasoned 26 (copy 28's rows 67..93).
- test 11: pixels whose 90° grout differs from the unturned grout a quarter turn away — bound ≤ 2 %, expected 0; distinct tile colours
  at 37° on 96 x 96 — bound 15..80, reasoned about 45.
- test 12: an averaged tile's red on the stripes (interior) — bound 64..191, reasoned near 128.
- test 22: dirt pixels at Pattern 7 against Pattern 0 — bound ±15 %, expected a few %.
- test 26: the keyed-ramp ring against Radius 80, and the stopped ring against Radius 60 — bound ≤ 1 % of the pixels each, expected 0.
- Reasoned floors (not MEASURE, but worth a look): test 5's 500 / 300; test 9's 300 / 300; test 13's 1000 / 1000; test 11's 2000; test
  20's 500; test 19's 20 greys; test 22's 2000 / 200; test 23's 2000; test 24's 1000 / 1000; test 26's 200; test 27's 200; test 28's
  300; test 17's 20.

**Shared test edited: two lines in B37** (`966 B37 Laser Beam is in the effects list…` and `966 B37 every Laser Beam slider changes the
picture across its travel…`): their exact key lists gain `draw` (and `color2` for the first) — `'x1,y1,x2,y2,width,glow,intensity,pulse,draw,color,color2'`
and the sliders `'…,pulse,draw'` (the sweep's message now says "nine"). On da12a813 both assertions fail (no `draw` there), so prove.sh
can catch them. Searched tests.js for each type id — `'laserbeam'` (B37's block, E1's LATER, 745 / 913.8's lists), `'rasterextrude'`
(#484's renamed keys, 908's dead-here), `'hextiles'` (482 10.7's rows and old-kernel copy, #692's bounded test, both at the defaults),
`'textrepeat'` (73320's strings, Space), `'palettemap'` (Your colours by default), `'grunge'` (fx-atmos's old-keys table), `'shockwave'`
(the raised-ceiling list) — every other one reads its own keys or the defaults.

## 7. #545 before/after sheet (owed — for him to pick or veto)

Render through the app (`FM.renderScene` in a tests/ probe), at phone size (≈ 380 px wide frame), each option at 2–4 values beside
today's default, on a fixture where it clearly shows:
- **Laser Beam** over a dark photo, a 4-frame strip of Draw on 0 → 100 (25 / 50 / 75 / 100 %), and Core colour white (today) / yellow
  (#ffe14d on the red beam) / cyan (#7df9ff on a blue #2f6bff beam) / black (no core).
- **Depth Push** on a title or logo half the frame: Side colour black (today) / gold (#d4a017) / white at Side shade 0.55 and 1; Taper 0
  (today) / 30 / 60 / 90 %, Depth 60 at 225°.
- **Hexagon Tiles** on a face, Tile size 24: Angle 0 (today) / 15 / 30 / 45°; Sample Centre vs Cell average on a 4-frame strip of moving
  video (the flicker it cures shows only in motion — a GIF strip, or two frames side by side).
- **Text Repeat** on a caption: Comma / Slash / Bar / Dash beside Space and Dot; Per line 0 (today) / 2 / 3 with 9 copies of "LOOP".
- **Palette Map** on a colourful photo: Nearest colour (today) vs Brightness with the default four colours, and with four Game Boy greens
  (#0f380f #306230 #8bac0f #9bbc0f — the Game Boy filter's).
- **Grunge** on a clean title: Pattern 0 / 7 / 300; a 4-frame strip at Boil 8.
- **Shockwave** on a photo, a 4-frame strip over one second at Expand 0 (today) / 60 / 120 %/s from Radius 0.
Names to put to him (#954 / "options, recommended next to the best"): Draw on, Core colour, Side colour, Side shade (renamed), Taper,
Angle, Sample / Cell average, Comma, Slash, Bar, Dash, Per line, Match by, Pattern, Boil, Expand speed.

## 8. Risks and what is unsure

- **Nothing was run.** Every claim in the tests is reasoned; the first run may move a marked bound or expose a slip in a worked pixel
  (each is worked in the test's comment, so a red can be checked quickly).
- **Laser Beam's core over a CLEAR plate adds opacity** ('lighter' adds alpha too), so a black core on a transparent layer is not
  invisible there — the test measures over an opaque black layer, where black is "no core". If he wants "no core" to mean that on a
  clear layer too, the core band would be skipped for black; not built.
- **Depth Push's Taper resamples the copies** (canvas smoothing), so a tapered slab's edges are soft by a pixel; the front is exact. The
  copies shrink about the layer's own middle, not toward a vanishing point at the frame's centre — the simpler "perspective"; a Vanishing
  point control would be a later round. A full-frame layer still hides its slab (#908's note still holds).
- **Hexagon Tiles' Angle turns about the plate's middle**, as Honeycomb's does; on a cropped preview plate the middle moves with the crop
  (Hexagon Tiles keeps the full plate — it is not CROP_FX — so the preview and the export agree). Cell average's cells at the plate's
  edge are averaged over the part inside the plate.
- **Grunge's Boil runs on project time** (as Dissolve's and Film Grain's do), Shockwave's Expand on the clip's own clock (as Laser Beam's
  Pulse does) — a ring is an event that starts with its clip; dirt is not.
- **Text Repeat's Per line** counts copies, not width: long copies can still wrap inside the text box as before.
- **"Side shade"** is a label change on a shipped row (the key is untouched, so no project moves); if he prefers the old name it is one
  string. The old words are a search alias either way.

## 9. Owed by the builder

1. First run of the 29 tests at 1280 and 380 (`?only=966%20opts6`), set the MEASURE bounds from measurement, and run the two edited B37
   tests (`?only=966%20B37`).
2. Measure and pin `C.SCHEMA_FP` (fp.js) at rev 21, replacing the FP TO PIN comment.
3. Full suite (the sweeps in §4, 482 10.7, #692's bounded hextiles test, fx-atmos, 73320), prove.sh, then the #545 sheet in §7 before
   the release that ships it.
