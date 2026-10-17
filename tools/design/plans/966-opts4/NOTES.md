# #966 opts4 — a fourth round of more choice on seven effects he already has (hunt/966-opts4)

His standing request #966: *"you can polish other effects just giving them more features and making them work a bit better and
have more customisation … more choices always better … this is the complex version we want as much choice as possible"*.

Branch `hunt/966-opts4`, based on `hunt/v64` b111afe7 (the v17.64 assembly: rounds one, two and three are in). **Code only, 17 Oct,
while v17.64 shipped from the main checkout: nothing was run but `node --check`** (js/compositor.js, js/fx-registry.js,
js/collab-core.js, tests/tests.js — all OK). No browser, no suite, no tools/*.sh runner, no node or python running app or test code.

## 1. Twin check (written before any code)

Picked for what he would SEE in a short phone edit, one of each kind where a thin effect was left: a transition (Radial Wipe), a
text animator (Scramble Text), two looks (Pencil Sketch, Night Vision), two overlay generators (Live Wire, Honeycomb) and a text
style (Change Case). Every candidate was checked six ways — by CONTENT, never by git ancestry:

| Check | How | Result |
|---|---|---|
| 1. Already in the code? | each effect's EFFECTS row and kernel in this worktree; `git grep -n -E "p\.(viewer\|vsize\|thick\|dim\|ahead)\b\|key: '(viewer\|vsize\|thick\|dim\|ahead)'" -- js/` | none of the new keys is on these seven rows or read by their kernels. `dim` exists on Backfill only (line 1744, its own key); `border`, `unit`, `angle`, `fill`, `color`, `color2` are per-effect keys used elsewhere and free here. Change Case had four cases (UPPERCASE, lowercase, Capitalize Words, Sentence case) and no fifth |
| 2. Idle backlog | `tools/design/plans/2026-09-29-idle-backlog/backlog.md`, grep §A, §B and §C for each type id, label and idea (radial wipe, clock wipe, scramble, decoder, settles, sketch, pencil, paper colour, chalk, blueprint, night vision, binocular, scope, live wire, electric, honeycomb, change case, alternating, swap case, thick, dim) | **nothing planned for these controls.** Hits are history or elsewhere: §A 12.3 (Radial Wipe's Direction / Blades / Fit / Invert — built), 12.4 (Scramble's Resolves — built), 12.6 (Find Edges' Line width — another effect), the Pencil filter recipe (§B, uses Sketch at its own settings), §C C6 (Night Vision's scanlines per plate row — fixed v17.14) |
| 3. ChatGPT pile | `/home/ezra/FreeMotion/tools/design/chatgpt-tasks/pile/LAND-LIST.md` and INVENTORY.md | no new control on any of the seven. **Overlaps by position, not by idea:** INVENTORY's 28-fix bug pass has `c5849478` "Fix Electric Edges keyframed speed phase" and `d0aa007a` "Hold Scramble Text pattern when animated Speed stops" — this base already integrates both speeds (`FM.integrateCount` in both kernels); the new code reads that same frame counter, after it |
| 4. POLISH-LOG / REQUESTS | grep /home/ezra/FreeMotion for the same words | only history: v12.18 / queue 799 (Live Wire made visible, Soft edges), v16.51 (Scramble's Scrambles into), v16.67 (Change Case renamed), v16.77 #7 (Honeycomb's preview size), v17.14 C6 (Night Vision scanlines), v9.13 (Night Vision's Scope colours). Nothing asked for or planned on these controls |
| 5. Rounds one to three | tools/design/plans/966-opts/, 966-opts2/, 966-opts3/NOTES.md | none of the seven is in any round (round three's Wipe border is the sibling Radial Wipe now gets, on its own row) |
| 6. Unmerged branches | the seven EFFECTS rows' key lists (whole rows, every line to the next `{ type:`) on `ssh/hunt/1068-b8`, `ssh/hunt/912-filters`, `ssh/hunt/pile-overdrive` and `ssh/plans/482-canvasfx` in /home/ezra/fm-helper, compared with this base; then every ref of both repos — 78 distinct compositor.js blobs in /home/ezra/fm-helper and 77 in /home/ezra/FreeMotion, read-only `git cat-file` — for the new key reads in each kernel's own body (Honeycomb `p.angle`/`p.fill`, Radial Wipe `p.border`, Sketch `p.color`, Live Wire `p.dim`/`p.thick`/`p.width`, Night Vision `p.viewer`/`p.vsize`/`p.scope`, Scramble `p.unit`/`p.ahead`) and for a Change Case option `[4,` | **no twin.** The four named refs carry this base's key lists exactly (1068-b8, 912-filters, pile-overdrive) or OLDER, shorter ones (482-canvasfx: Radial Wipe without dir/blades/fit/invert, Scramble without order; Live Wire under its old name Electric Edges). No blob reads any of the new keys in these kernels and none has a fifth case (a first scan's 34 "Scramble reads unit" hits were Text Reverse's `p.unit` inside a 40-line window; re-scanned body by body: none) |

**Excluded, and why.** The 21 effects of rounds one to three; Bokeh, ASCII Art and the Music cue; Frame Stutter and Time Warp; the
Simple editor and collab files. **The parked pile commit T25 `1ca7ffe5`** (smooth turned Checker / Grid / Stripes edges, waiting on his
question 10) touches exactly three kernels — `checker`, `grid` and `stripes` (`git -C /home/ezra/fm-helper show --stat 1ca7ffe5`: only
js/compositor.js's three hunks, index.html, a tests block and a pile note) — so Grid is left alone too, and nothing here is near them.
Considered and dropped: **every WARP_FX effect** (Taffy Pull, Brick Slide, Tile Spin, Twirl, Squeeze …) — each has a GLSL twin
(`WARP_FX.x.glsl`), so a new control means a shader edit no code-only round can prove, and LAND-LIST B5 rewrites the warp driver;
**Glow** (a CSS composite with a GPU path); **Orbit Streaks' Tint** (its output is one weighted average that includes the pixel
itself, so a tint of the trail alone is not a clean multiply); **Crosshatch on paper** (the same idea as Sketch's Paper, kept to one
this round); **Fill Silhouette's gradient** (Colour Wash already paints a gradient over a layer — a twin); **sound** (the voice presets
are a different system, and an audio default's sample-identity needs an OfflineAudioContext run that a code-only round cannot give).

## 2. What was built — 7 effects, 14 new controls (12 keys and 2 new cases)

| Effect (type) | Key | Label | Range / choices | Default | What it does |
|---|---|---|---|---|---|
| Radial Wipe (`radialwipe`) | `border` | Border width | 0–100 px (unit px: pxToPlate scales it), keyframable | 0 | a band of the Border colour along both edges of the sweep as it turns, on the part still showing (Premiere's Clock Wipe border; the sibling of round three's Wipe border) |
| | `color` | Border colour | colour row, greyed while Border width is 0 (`colorGate` deadAt 0, "0 px") | #ffffff | the band's colour |
| Scramble Text (`textrandomizer`) | `unit` | Settles by | Letter / Word | Letter (0) | Word lands each word whole while its letters scramble (Type-On has Reveal by; Scramble could only settle letter by letter) |
| | `ahead` | Scrambled ahead | 0–20, keyframable | 0 (= all) | only that many scrambled units run ahead of the settled text and the rest is hidden — the decoder look; each hidden letter is a no-break space, so the line keeps about its finished length |
| Pencil Sketch (`sketch`) | `color` | Pencil | colour row | #000000 | the colour of the strokes |
| | `color2` | Paper | colour row | #ffffff | the colour of the paper — white chalk on a board, a blue pencil, sepia on cream |
| Night Vision (`nightvision`) | `viewer` | Viewer | None / Scope / Binoculars | None (0) | blacks out all but one round lens, or a pair of binocular lenses, over a soft rim — night vision seen through the device |
| | `vsize` | Viewer size | 40–100 %, keyframable, live only under Scope / Binoculars (`liveWhen [1, 2]`) | 90 | the lens size across the frame |
| Live Wire (`electricedges`) | `thick` | Thicken lines | 0–8 px (unit px: pxToPlate scales it), keyframable | 0 | each wire grows that many px either side (they were one pixel) |
| | `dim` | Dim the picture | 0–100 %, keyframable | 0 | darkens what is under the wires; at 100 % only the wires show, on black |
| Honeycomb (`hexarray`) | `angle` | Angle | 0–360°, keyframable | 0 | turns the lattice about the middle of the frame (keyframe it for a slow spin) |
| | `fill` | Fill cells | 0–100 %, keyframable | 0 | tints every cell by its own random amount up to this — a hex mosaic under the lines |
| Change Case (`texttransform`) | `mode` | (its one row) | + aLtErNaTiNg (4), + sWAP cASE (5) | UPPERCASE (0), unchanged | lower, upper, lower … counting letters only (the mocking caption); every letter flipped. Each button is spelled the way it writes |

Exact definitions (js/compositor.js; each helper has a suite seam):

- **Border width** (`radialWipe966`, beside `radialWipe12`, seam `FM._radialWipe966`): radialWipe12's cut to the bit — f, how far round
  a pixel sits, folded for Anticlockwise / Blades / Both ways; the wedge keeps f ≤ Progress, hard or over the Edge softness. A shown
  pixel's border distance is its ARC distance into the shown side from the nearer edge, s = sd x (2π r / sectors) (negated under
  Invert), and its weight clamp(bd + 0.5 − s); the alpha is decided first. Both edges of every blade get one; under Both ways only the
  moving edges (the Start line is the middle of the wedge there).
- **Settles by / Scrambled ahead** (`scramble966`, beside TEXT_FX, seam `FM._scramble966`): the kernel's four orders over UNITS —
  characters (spaces count, as they always did) or words (runs of anything but space, tab and newline); n = floor(units x Progress)
  have settled; with k ahead, ranks n..n+k−1 scramble and the rest are U+00A0; the scramble char is the kernel's own hash of the
  character's place and the frame, from the same alphabet.
- **Pencil / Paper** (inline): the grey the sketch draws, v (0 the darkest stroke, 255 bare paper), becomes pencil + (paper − pencil) x
  v / 255, then the old Amount mix.
- **Viewer / Viewer size** (`nightViewer966`, seam `FM._nightViewer966`, a pass after the old loop): Scope a lens of radius size x half
  the shorter side about the middle; Binoculars two lenses of radius size x min(0.28 W, 0.5 H), centres 1.5 radii apart; the rim soft
  over 4 % of the shorter side, centred on the edge; outside, the colour x (1 − Amount x (1 − k)). Pixel centres at x + 0.5.
- **Thicken lines / Dim the picture** (`wire966`, seam `FM._wire966`): the kernel's Sobel / soft-edge magnitude into a reused map,
  dilated r = round(plate px) either way (a square reach, across then down, in place with one line of scratch); then the kernel's own
  crackle hash and screen, over the picture x (1 − dim) first. Only the layer's own pixels are written.
- **Angle / Fill cells** (`honeycomb966`, seam `FM._honeycomb966`): the kernel's nearest-two-centres loop read at the pixel turned about
  the plate's middle; Fill tints the nearest centre's cell by fill x Strength x a hash of (row, column), combined with the line as
  1 − (1 − f)(1 − a).
- **aLtErNaTiNg / sWAP cASE** (inline, two new branches of the kernel), walked by code point so an emoji is never split.

## 3. Why each default is exact (byte-identical pixels / character-identical strings)

- **No `legacy` anywhere, and every `def` IS today's look**, so the render-time fill (queue 784) writing the default into a saved
  project's absent key changes nothing. Each kernel reads its key with a literal fallback equal to `def` — `p.border == null ? 0`,
  `p.unit == null ? 0`, `p.ahead == null ? 0`, `p.viewer==null?0`, `fparam(p,'vsize',90,t)`, `fparam(p, 'thick', 0, t)`,
  `fparam(p, 'dim', 0, t)`, `fparam(p, 'angle', 0, t)`, `fparam(p, 'fill', 0, t)` — the very literal `FM._fxFillValue` reads off the
  source. Colour rows fill to their `defColor` (no numeric literal to read), which is the identity: white Border colour at 0 px, black
  Pencil and white Paper. Change Case's row is unchanged in key, default and stored values; its fill reads `def` 0 as before.
- **Radial Wipe:** the kernel computes Border width after everything it computed before (Progress, Invert and the two early returns,
  Start, Fit to, the pivot, softness, Direction, Blades) and hands off to `radialWipe966` only when Border width > 0; otherwise the old
  routing runs untouched (radialWipe12 for Direction / Blades / Invert, the two inline loops for the rest). `radialWipe966` copies
  radialWipe12's expressions to the operator (`sd * apu / sf + 0.5` with `apu = TAU * sqrt / per` is radialWipe12's
  `sd * (TAU * sqrt / per) / sf + 0.5`; with one sector `/ 1` is exact, so it is the inline soft loop too), and a test runs it with no
  border against the kernel byte for byte. Progress 0 and 1 return before it. `border` has `unit: 'px'` on an arity-5 kernel that
  already had one (Edge softness), so pxToPlate's copy-and-scale is unchanged.
- **Scramble Text:** only `unit === 1 || ahead > 0` calls `scramble966`; Letter and 0 run the old ranking and loop untouched. The helper
  on Letter with 0 is the old loop to the character (a test proves it over 1440 still-Speed cases).
- **Pencil Sketch:** `skInk` is false exactly for black (0, 0, 0) and white (255, 255, 255) — by value, so `#000` / `#fff` count — and
  then the old three assignments run untouched. An absent colour reads as that black and white directly.
- **Night Vision:** Viewer is read before the loop and the loop is not touched; only Scope (1) or Binoculars (2) calls the pass after
  it. Viewer size is never read by the old path.
- **Live Wire:** only `round(thick) > 0 || dim > 0` calls `wire966`; otherwise the old loop. `wire966` copies the old Sobel, soft-edge,
  hash and screen expressions to the operator (same evaluation order), and with r = 0 and dim 0 a test proves it IS the old loop.
  `thick` is `unit: 'px'` on an arity-5 kernel that had no px param before: pxToPlate now copies the params on a reduced plate — the same
  values and keyframe objects — and 0 x ps is 0.
- **Honeycomb:** only a turn that is not a whole number of laps (`((a % 360) + 360) % 360 !== 0`, finite) or Fill > 0 calls
  `honeycomb966`; otherwise the old loop. 360° reads as 0° and takes the old loop (a test). `honeycomb966` unturned and unfilled is the
  old loop to the bit (the per-pixel `Math.round(py / rh)` is the old per-row one; a line write only when a > 0, which the old loop's
  `diff < band` always gives, or writes d x 1 + c x 0 = d) — a test proves it, two configurations.
- **Change Case:** modes 0–3 are the old branches untouched; 4 and 5 are new `else if`s after them; any other number still leaves the
  text alone (a test against a copy of the old kernel).
- **Arity unchanged** for every kernel (radialwipe, sketch, electricedges, hexarray 5; nightvision 6), so pxToPlate's choice and the
  dispatcher's path are the same.
- **CROP_FX / BOUNDED_FX:** none of the seven is a member (all keep the full plate), so no crop re-proof is involved.
- **Not exact by design, off the default only:** the border's inner edge is anti-aliased over one plate px; a thickened wire is a
  square reach (a little boxy on diagonals); hidden Scramble letters are no-break spaces, so a proportional font's line is about — not
  exactly — its finished width.

## 4. The 264, inert and 784 sweeps (reasoned, owed a run)

- **`no effect erases the layer at a single parameter extreme (queue 264)`** — orange #e8a33d 300 x 450 layer over black, 540 x 960
  project, t = 0.5, one param at min or max (segments at their first and last value): **no ALLOWED entry needed.**
  - Radial Wipe Border width 100 paints a white band inside the half still showing (the default 0.5 keeps the half below the pivot,
    which this layer straddles); 0 is the default.
  - Scramble Text's Settles by and Scrambled ahead, and Change Case's last case, are text effects: on this shape they do nothing.
  - Pencil Sketch's two colour rows have no min or max and are not swept.
  - Night Vision Binoculars (the last Viewer) at the default 90 %: two lenses of radius 0.9 x min(0.28 x 540, 480) = 136 about
    (270 ± 102, 480) — inside the layer (x 120–420, y 255–705) — so most of it stays lit. Viewer size 40 and 100 are swept with no
    viewer (one param at a time), where it does nothing.
  - Live Wire Dim the picture 100 turns the flat orange black on the black ground — but the layer's edge is still a wire: the rim
    pixels read a Sobel of 4 x 172 / 1442 = 0.48 (0.63 after Soft edges 70), x 0.6 x 0.45–1 x 3.6 = 0.61–1, the Electric colour over
    black, about 500 rim pixels at the sweep's 180 x 320 read-back (a third of a pixel still clears its 12-level threshold). Thicken
    lines 8 only widens those wires.
  - Honeycomb Angle 360 is 0° to the bit; Fill cells 100 tints the cells teal over the orange.
  - Every min is the default, which the sweep already passes.
- **`effects: no effect slider is completely inert`** (PIXEL_FX ranges at five fractions, five moments, three fixtures, the kernel
  called directly at ps 1): Radial Wipe Border width paints a band along the row through the subject's middle at every fraction above
  0; Night Vision Viewer size is unlocked through `liveWhen` (Viewer set to Scope) and grows the lens; Live Wire Thicken lines (the 0.17
  fraction is 1.36 px → 1) widens the subject's wires and Dim the picture dims every opaque pixel; Honeycomb Angle (61°, 148°, 238°,
  335° — none a whole lap or a multiple of 60° about a centre) and Fill cells move the lattice and the cells. Scramble's slider is a text
  effect's, not a PIXEL_FX kernel's, and is not swept.
- **`784: no effect is switched off by a missing param key`** — a bare `{}` fills every new key to its default (identity), so bare draws
  what the defaults draw.
- Also reasoned: `793` (fill = default for every new row, the literals above), `859` (every pixel effect at its defaults — unchanged),
  `913.5` (defaults), `482: every effect does something visible at its own defaults` (unchanged), `#635` ruler notches (100, 20, 60, 8,
  100, 360 and 100 notches — all under the 400 budget; Honeycomb's 360 matches Checker's Angle), the fx-registry check that every range
  default sits inside its range (90 in 40–100), `482 12.3`'s pinned Radial Wipe hashes and `482 12.4`'s pinned Scramble hashes (their
  `b12Base` takes makeInstance's keys, the new ones at their defaults, which draw the pinned bytes), `no effect option button is
  unreachable on a phone` (Change Case's six buttons wrap like Channel Remap's eight), the alias test (Change Case's two new search
  words, 'alternating case' and 'swap case', each surface it).

## 5. Busters and schema

- `index.html`: `js/compositor.js?v=225 → 226`, `js/fx-registry.js?v=26.36 → 27` (Change Case's description now names the two new cases,
  and its search aliases gained 'alternating case' and 'swap case'), `js/collab-core.js?v=38 → 39`. inspector, fx-thumbs and audio-fx are
  untouched (the registry derives the rows — the colour rows' `colorGate` deadAt, the segment `liveWhen`, the range rows all pass
  through `paramsOf` — and the inspector draws them from it), so their busters stay at 425 / 59 / 22.
- `js/collab-core.js`: `C.SCHEMA_REV = 19` with a Rev 19 note. **`C.SCHEMA_FP` is still rev 18's number (5398151296079833)**, under a
  `/* FP TO PIN (966 opts4) */` marker — the builder measures it with fp.js; `921 S1 the schema fingerprint gate` fails until then.

## 6. Tests (tests/tests.js, one block between `// ── 966 opts4 (hunt/966-opts4) ──` and `// ── end 966 opts4 ──`)

All `{ item: '966', budgetMs: 60000 }`, each failing on b111afe7 on its first line by naming the missing control, case or seam
(`_o4Need`, `_o4CaseNeed`). Per effect: (a) rows, (b) what it does, (c) defaults byte for byte (with the helper-is-the-old-loop check),
(d) a CONTROL. 32 tests:

1. `966 opts4 every new control at its default draws what the effect drew without it — all six effects with new keys through the compositor…` (1:1 and half plate, 0.61 / 1.73 s; CONTROL each changes its layer)
2. `966 opts4 Radial Wipe has Border width (0–100 px, scaled to the preview plate) and a Border colour…` (a; plus `_pxParamKeys`)
3. `966 opts4 Radial Wipe Border width: at Progress 0.25 a red 5 px border runs along both edges of the quarter still showing…` (b; exact rows / columns, 185 / 70 half red, Invert, Both ways, Blades, compositor 10 vs 5)
4. `966 opts4 Radial Wipe at 0 px draws byte for byte… its helper with no border is the old cut to the bit` (c)
5. `966 opts4 Radial Wipe CONTROL: on the fixture Border width moves the picture…` (d)
6. `966 opts4 Scramble Text has Settles by (Letter, Word) and Scrambled ahead (0–20, keyframable)…` (a; sanitiser on a text layer)
7. `966 opts4 Scramble Text Settles by Word: half way through “seven eleven twelve thirteen”…` (b)
8. `966 opts4 Scramble Text Scrambled ahead: at 3, a third of the way through “decoding the text”…` (b; exact strings with U+00A0, the text layer)
9. `966 opts4 Scramble Text on Letter with nothing ahead writes character for character…` (c; 2880 cases, 1440 against the helper)
10. `966 opts4 Scramble Text CONTROL: on the fixture Word and Scrambled ahead each change the text…` (d)
11. `966 opts4 Pencil Sketch has a Pencil colour and a Paper colour…` (a)
12. `966 opts4 Pencil Sketch Pencil and Paper: at full Amount a flat grey becomes the Paper colour exactly…` (b; exact flat and edge, ±1 navy on cream)
13. `966 opts4 Pencil Sketch in black on white draws byte for byte… #000 and #fff draw it too` (c)
14. `966 opts4 Pencil Sketch CONTROL: on the fixture a coloured Pencil and a coloured Paper each move the picture…` (d)
15. `966 opts4 Night Vision has a Viewer (None, Scope, Binoculars) and a Viewer size (40–100 %, keyframable)…` (a; the `liveWhen` gate)
16. `966 opts4 Night Vision Viewer: Scope keeps a round lens in the middle exactly as the plain look…` (b; every pixel classified inside / rim / outside, the binocular notch, portrait, Amount 0.5)
17. `966 opts4 Night Vision with no Viewer draws byte for byte…` (c; incl. reduced plates 0.5 and 0.28)
18. `966 opts4 Night Vision CONTROL: on the fixture Scope and Binoculars each move the picture…` (d)
19. `966 opts4 Live Wire has Thicken lines (0–8 px, scaled to the preview plate) and Dim the picture (0–100 %)…` (a; plus `_pxParamKeys`)
20. `966 opts4 Live Wire Thicken lines: the two-pixel wire of a hard edge grows to eight at 3 px…` (b; exact columns 31–32 / 28–35 / 29–34, Dim exact)
21. `966 opts4 Live Wire at 0 px and 0 % draws byte for byte… its helper… is the old loop to the bit` (c)
22. `966 opts4 Live Wire CONTROL: on the fixture Thicken lines and Dim the picture each move the picture…` (d)
23. `966 opts4 Honeycomb has Angle (0–360°) and Fill cells (0–100 %)…` (a)
24. `966 opts4 Honeycomb Angle: turned 180° the honeycomb is the plain one turned half way round the middle…` (b)
25. `966 opts4 Honeycomb Fill cells: at 100 % every cell is tinted by its own amount…` (b; the border pixel exact)
26. `966 opts4 Honeycomb at 0° and 0 % draws byte for byte… a whole turn (360°) is 0° to the bit…` (c)
27. `966 opts4 Honeycomb CONTROL: on the fixture Angle and Fill cells each move the picture…` (d)
28. `966 opts4 Change Case has six cases…` (a)
29. `966 opts4 Change Case aLtErNaTiNg and sWAP cASE: “Hello, World 2026!” reads…` (b; exact strings, emoji, accents, its own labels)
30. `966 opts4 Change Case on its four old cases writes character for character what it wrote before…` (c; against a copy of the old kernel)
31. `966 opts4 Change Case CONTROL: on the text layer aLtErNaTiNg and sWAP cASE each draw a picture different…` (d)
32. `966 opts4 the seven effects’ editors, new rows and all, fit the inspector…` (phone fit; CONTROL labels Border width, Scrambled ahead, Pencil, Binoculars, Thicken lines, Fill cells, sWAP cASE)

**Bounds — TODO measure on first run** (everything else is exact — `=== 0`, byte for byte, character for character, worked pixel values
±1 for Uint8 rounding, exact column / row lists or counts, each worked in the test's comment):
- Scramble on screen: 3 ahead lights under 0.8 x the pixels 0 ahead lights (8 of 15 letters draw, about 53 %).
- Honeycomb: 30° and 45° ink within 15 % of 0°; 60° about the frame's middle moves at least 300 pixels; Angle 30° at least 300 (d).
- The (d) floors (Radial Wipe border 500, Sketch Pencil 300 / Paper 3000, Night Vision 1000 / 300, Live Wire 200 / 3000, Honeycomb Fill
  2000) are reasoned in each comment, well under the expected counts.
- Probability-based checks: a scrambled 5- to 8-letter word spelling itself (under one in ten million per check); Word vs Letter at
  Progress 0.4 coinciding at two moments of three (under one in a hundred thousand); four of nine Honeycomb cell rolls under 0.03 (about
  one in ten thousand).

**Shared tests edited: none.** Searched tests.js for each type id (`'radialwipe'` 13 hits, `'textrandomizer'` 6, `'sketch'` 4,
`'nightvision'` 6, `'electricedges'` 7, `'hexarray'` 3, `'texttransform'` 4) and each read its own keys or the defaults: the wipes'
q / progress / softness / Fit tests (8363, 62759, 79505, 132971–132982) set their own params on makeInstance; `482 12.3` / `482 12.4`
(132948, 133039) pin hashes over `b12Base` = makeInstance with only their own keys removed (ours at their defaults draw the pins), and
check only their own options' labels; the un-upgraded-instance tables (`effects: the pattern effects…` 49504 for Honeycomb, `effects: the
remaining colour effects…` 49604 for Night Vision, the Sketch row at 55676) stamp makeInstance's keys and compare; `986 C6` (118081)
runs Night Vision with its own params (viewer absent → None); queue 799's Soft edges test (44849) reads `soft` only; the strength sweep
(80392) runs the defaults; `#664` (73306) and `904` (79735) check Change Case's mode 0; the segment-overflow sweep (45104) names Change
Case and checks every button stays on screen and ≥ 24 px — its six buttons wrap as Channel Remap's eight do.

## 7. #545 before/after sheet (owed — for him to pick or veto)

Render through the app (`FM.renderScene` in a tests/ probe), at phone size (≈ 380 px wide frame), each option at 2–3 values beside
today's default, on a fixture where it clearly shows:
- **Radial Wipe** on a full-frame photo over a contrasting clip, as a 4-frame strip (Progress 0.2 / 0.4 / 0.6 / 0.8): Border width 0
  (today) / 6 / 20 px in white; 10 px in yellow with 4 Blades; 8 px with Both ways.
- **Scramble Text** on a bold title, as a 6-frame strip across Progress 0 → 1: Settles by Letter (today) / Word; Scrambled ahead 0
  (today) / 2 / 5 — and the decoder pairing (Left to right, 3 ahead, Match).
- **Pencil Sketch** on a portrait photo: Pencil / Paper black on white (today) / white on #1f4d2b (chalkboard) / #1a237e on #f5e6c8
  (navy on cream) / #5b3a1e on #f3e5c0 (sepia).
- **Night Vision** on dark footage: Viewer None (today) / Scope / Binoculars at 90 %, and Binoculars at 70 % — on a portrait and a
  landscape frame.
- **Live Wire** on a title and on a photo: Thicken lines 0 (today) / 2 / 5 px; Dim the picture 0 (today) / 50 / 100 % (wires only).
- **Honeycomb** over a photo: Angle 0 (today) / 15 / 30°, a 4-frame strip of a keyframed 0 → 60° spin; Fill cells 0 (today) / 40 /
  100 %.
- **Change Case** on a caption: all six cases side by side.
Names to put to him (#954 / "options, recommended next to the best"): Border width, Border colour, Settles by (Letter · Word),
Scrambled ahead, Pencil, Paper, Viewer (None · Scope · Binoculars), Viewer size, Thicken lines, Dim the picture, Angle, Fill cells,
aLtErNaTiNg, sWAP cASE.

## 8. Risks and what is unsure

- **Nothing was run.** Every claim in the tests is reasoned; the first run may move a marked bound or expose a slip in a worked pixel
  (each is worked through in the test's comment, with the arithmetic, so a red can be checked quickly).
- **Scrambled ahead hides with U+00A0.** JavaScript's `\s` matches it, so on a layer with a wrap width (`FM.textLines`) a hidden word
  is a break opportunity and a trailing run of them is trimmed at a line end: a wrapped caption can break differently while it decodes
  than once it has landed. Unwrapped text (the default) keeps its line. If he wants letters that drop out instead (the text grows as it
  types, Type-On style), that is a third choice.
- **Night Vision's viewer scales with Amount**, so a faint look has a faint viewer; if he wants the viewer always fully black, a choice.
- **Thicken lines is a square reach** (cheap: two passes of 2r + 1 per pixel, r ≤ 8 at the export); diagonals read a little boxy at 8.
- **Honeycomb's Angle turns about the plate's middle**, so a keyframed spin turns round the frame's centre, not a cell's — the lattice
  slides past the middle as it turns (any pivot that is not a cell centre does that); 60° is not "the same picture" unless the middle
  is a centre.
- **Change Case's aLtErNaTiNg starts lower case** (the meme's usual form) and counts across words and lines.
- **Collision to note:** the ChatGPT pile's speed fixes for Live Wire (`c5849478`) and Scramble (`d0aa007a`) sit on lines this base
  already carries in its own form; the new code is after them, so a later port of either rebases by hand if it rewrites those lines.

## 9. Owed by the builder

1. First run of the 32 tests at 900 and 380 (`?only=966%20opts4`), set the marked bounds from measurement.
2. Measure and pin `C.SCHEMA_FP` (fp.js) at rev 19, replacing the FP TO PIN marker.
3. Full suite (the sweeps in §4), prove.sh, then the #545 sheet in §7 before the release that ships it.
