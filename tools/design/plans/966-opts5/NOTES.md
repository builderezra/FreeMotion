# #966 opts5 — a fifth round of more choice on seven effects he already has (hunt/966-opts5)

His standing request #966: *"you can polish other effects just giving them more features and making them work a bit better and
have more customisation … more choices always better … this is the complex version we want as much choice as possible"*.

Branch `hunt/966-opts5`, based on 07d1859f (the v17.65 assembly: rounds one to four are in). **Code only, 18 Oct, while v17.65
shipped from the main checkout: nothing was run but `node --check`** (js/compositor.js, js/fx-registry.js, js/collab-core.js,
tests/tests.js — all OK). No browser, no suite, no tools/*.sh, no node or python running app or test code.

## 1. Twin check (written before any code)

Picked for what he would SEE on a phone, one of each kind where an effect was left thin: a transition (Shape Wipe), two looks
(Topo Bands, Engraving), two of the six beginner effects (Pop Art, Censor), a colour effect (Colour Cycle) and a text effect (Text
Pad). Every candidate was checked six ways — by CONTENT, never by git ancestry:

| Check | How | Result |
|---|---|---|
| 1. Already in the code? | each effect's EFFECTS row and kernel in this worktree | none of the new keys is on these rows or read by their kernels: Shape Wipe had no `border` / colour, Topo Bands no time term at all, Engraving no colour (it writes grey), Pop Art two grids and still colours, Censor an upright box and a `'#000'` bar, Colour Cycle one turn for the whole frame, Text Pad four characters and two sides |
| 2. Idle backlog | `tools/design/plans/2026-09-29-idle-backlog/backlog.md` §A, §B, §C for each type id, label and idea (shape wipe, iris, border, topo, contour, flow, engraving, halftone lines, ink, pop art, warhol, censor, angle, bar, colour cycle, rainbow, text pad, centre) | **nothing planned for these controls.** B15 (Shape Wipe) lists exactly the controls it shipped with — no border; the rest have no entry beyond their landing |
| 3. ChatGPT pile | `/home/ezra/FreeMotion/tools/design/chatgpt-tasks/pile/LAND-LIST.md` and INVENTORY.md | **0 hits** for Topo Bands / contourstrips, Engraving / halftonelines, Pop Art, Censor, Text Pad, Colour Cycle / huecycle, Shape Wipe |
| 4. POLISH-LOG / REQUESTS | grep /home/ezra/FreeMotion for the same words | history only: the E1 batch landing (#1114: Colour Cycle, Censor, Pop Art …), B15's landing, Text Pad's birth as a new text effect, queue 261 / 902 (Engraving's period floor and supersampling), the sweeps' Text Pad notes ("pads to a fixed width of 3"). Nothing asked for or planned on these controls |
| 5. Plans | every `tools/design/plans/*/NOTES.md` and *.md in this worktree, the 966-opts..opts4 rounds and the B-numbered items (B9, B41, B49 …) | none of the seven is in any round. Pop Art and Censor appear only in the "registered after" lists of fxnew-radiowaves, fxnew-cartoon and pile-fractalnoise (and Censor in the backlog as the *Censor bleep* sound); Shape Wipe in those lists and as the wipes' sibling in 929-heart, fxnew-blinds, fxnew-lensmag, pile-gradientwipe and stack50 — grepped with border / rim / outline / ring / stroke, the one hit is the eye-icon plan's "iris ring". Topo Bands, Engraving, Text Pad and Colour Cycle: no plan mentions them. opts4 dropped "Crosshatch on paper" — not taken here either |
| 6. Unmerged branches | every ref of this repo (644: heads and the `ssh/*` remotes), 79 distinct `js/compositor.js` blobs, read-only `git cat-file`; each of the seven rows cut out whole (to the next `{ type:`) and searched for `border` (Shape Wipe), `flow`/`speed`/`scroll`/`cycle`/`drift` (Topo Bands), `color: true`/`ink`/`paper` (Engraving), `Four by`/`cycle`/`swap` (Pop Art), `angle`/`rotation`/`color: true`/`Bar colour` (Censor), `Both`/`Underscore`/`Star` (Text Pad), `spread`/`across`/`gradient` (Colour Cycle) | **no twin.** (A first pass with a fixed 6–12-line window had false hits from the NEXT row — Clouds' `color: true` after Engraving, "four (or nine)" in Pop Art's own description; re-cut row by row: none.) /home/ezra/FreeMotion's own refs were not scanned — nothing may run in that checkout during this ship — but its branches are pushed to the same `ssh` remote these refs mirror |

**Excluded, and why.** The 28 effects of rounds one to four; the `checker`, `grid` and `stripes` kernels (the parked pile commit T25
`1ca7ffe5`); every WARP_FX effect (each has a GLSL twin a code-only round cannot prove); **Chunk Noise** (pile `90c78228` rewrites its
speed lines — LAND-LIST and INVENTORY both list it); **Raised Edge** (pile T15 keeps a ps-aware `smoothbevel`); **Oil Paint** and
**Venetian Blinds** (LAND-LIST / INVENTORY hits and their own plans); **Glitter** (its stars are 14 px: a Spin would not read on a
phone — a later round); **Hexagon Tiles' Angle** (Honeycomb's Angle landed last round — one of the pair per round); **Text Repeat's
separators** (one text effect a round; Text Pad's sides are the bigger gap); **a Rainbow palette on Topo Bands** (a twin of Hue Ramp
under Posterize — Flow speed instead).

## 2. What was built — 7 effects, 13 new controls (9 keys, and 4 new choices on existing rows)

| Effect (type) | Key | Label | Range / choices | Default | What it does |
|---|---|---|---|---|---|
| Shape Wipe (`shapewipe`) | `border` | Border width | 0–100 px (unit px: pxToPlate scales it), keyframable | 0 | a band of the Border colour along the edge of the opening, on the part still showing — the iris's rim, a heart outlined as it grows (the sibling of Wipe's and Radial Wipe's borders) |
| | `color` | Border colour | colour row, greyed while Border width is 0 (`colorGate` deadAt 0, "0 px") | #ffffff | the band's colour |
| Topo Bands (`contourstrips`) | `flow` | Flow speed | −10 to 10 /s (bands a second), keyframable | 0 | the bands keep moving through the tones, the first coming round after the last — the flowing contour map, AE's Colorama cycle; + moves them from the darks towards the lights; integrated when keyframed |
| Engraving (`halftonelines`) | `color` | Ink | colour row | #000000 | the colour of the lines |
| | `color2` | Paper | colour row | #ffffff | the colour of the paper — banknote green on cream, white on navy, gold on black |
| Pop Art (`popart`) | `layout` | Grid | + Four by four (2) | Two by two (0), unchanged | sixteen squares |
| | `cycle` | Colour swap | 0–10 /s, keyframable | 0 | the squares pass their colours along this many times a second, on the clip's own clock — the flashing Warhol grid on the beat; integrated when keyframed |
| Censor (`censor`) | `angle` | Angle | −180 to 180°, keyframable | 0 | turns the box or oval about its centre (+ clockwise) — a number plate on a slope, a head on one side |
| | `color` | Bar colour | colour row, live only under Black bar (`colorGate` by style, when 2) | #000000 | the Black bar in any colour |
| Colour Cycle (`huecycle`) | `spread` | Rainbow across | 0–720°, keyframable | 0 | the turn spreads over the frame: the colours run through that many degrees from one side to the other, the middle keeping the cycle's own colour — a rainbow that sweeps across as it cycles |
| | `sangle` | Rainbow angle | 0–360°, live only while Rainbow across > 0 (`liveAbove` 0) | 0 | which way the rainbow runs (0° left to right, 90° top to bottom) |
| Text Pad (`textpad`) | `side` | Side | + Both sides (2) | Before (0), unchanged | centres the text in its width, the odd one over after it: `--TITLE---` |
| | `ch` | Pad with | + Underscores (4), + Stars (5) | Zeros (0), unchanged | a fill-in line (`Name____`) and the redacted card number (`****1234`) |

Exact definitions (js/compositor.js; each helper has a suite seam):

- **Border width** (`shapeWipe966`, right after the kernel, seam `FM._shapeWipe966`): the kernel's loop to the operator — each pixel's
  signed distance sd to the opening's edge (negative inside; plate px; exact for circle, box, diamond, star, heart, close for the
  ellipse; measured in the stretched frame under Stretch) and its alpha, decided first exactly as the kernel decides it. A pixel still
  showing within bd px of the edge — s = −sd into the shown side (+sd under Invert) — takes the Border colour by clamp(bd + 0.5 − s).
- **Flow speed** (`topoShift966` + `topoFlow966`, beside the opts4 helpers): s = speed x t (project time, as Stripes' Scroll), or the
  integral from 0 for a keyframed speed, taken round into [0, Strips); the strip is floor(clamp((luma + Band offset) x Strips, 0, L) − s)
  taken round, and its colour and strong/weak mix are the kernel's expressions.
- **Ink / Paper** (`engrave966`, a pass after either branch): every covered pixel's grey v becomes ink + (paper − ink) x v / 255.
- **Four by four / Colour swap** (inline, and `popSwap966` beside the kernel): n = 4 for Grid 2; swaps = floor(rate x clip time + 1e-9),
  or FM.integrateCount from the clip's start for a keyframed rate; square k0 (reading order) wears square k0 − swaps's palette.
- **Angle / Bar colour** (inline): only an angle off a whole half turn turns (`turn`); the region is the turned shape's bounding box and
  the mask is the turned rectangle (a path) or a turned ellipse, at full size; the bar is `'rgb(r,g,b)'`, or `'#000'` for black.
- **Rainbow across / angle** (`hueSpread966`, beside the kernel, seam `FM._hueSpread966`): the kernel's turn deg (Speed, Start colour,
  Stepped in it) plus spread x u, u = ((x + 0.5 − W/2) cos a + (y + 0.5 − H/2) sin a) / (|W cos a| + |H sin a|), in −0.5..0.5; the
  matrix is e1HueM read from a table every eighth of a degree; Colour boost is the kernel's line.
- **Both sides / Underscores / Stars** (inline): the pad split floor-before, rest after; `_` and `*`.

## 3. Why each default is exact (byte-identical pixels / character-identical strings)

- **No `legacy` anywhere, and every `def` IS today's look**, so the render-time fill (queue 784) writing the default into a saved
  project's absent key changes nothing. Each kernel reads its key with a literal fallback equal to `def` — `p.flow==null?0`,
  `fparam(p, 'angle', 0, t)`, `p.cycle == null ? 0`, `fparam(p, 'spread', 0, t)`, `fparam(p, 'sangle', 0, t)`, `b966N(p, 'border', 0, t)`
  — which is what `FM._fxFillValue` reads (or, for `b966N`, the schema default 0). Colour rows fill to `defColor` / `defColor2`.
- **Shape Wipe:** `bd` is read after everything the kernel computed (Progress, the two early returns, Fit, centre, shape, rotation,
  Stretch, softness, size, rho); only bd > 0 hands off to `shapeWipe966`; at 0 the old loop runs untouched. Progress 0 and 1 return
  before it. `border` has `unit: 'px'` on an arity-5 kernel that already had one (Edge softness), so pxToPlate's copy-and-scale is
  unchanged for softness.
- **Topo Bands:** `topoShift966` returns 0 for no flow, at t = 0, and after a whole number of turns (s ≡ 0 mod Strips), and the old loop
  runs untouched; `topoFlow966` at s = 0 is that loop's band to the bit (the clamp to [0, L − 1e-9] then floor is the old floor-and-clamp;
  a test hands it the kernel's numbers and compares byte for byte). Tone and time only, so its CROP_FX membership (a cropped buffer draws
  the same) is untouched.
- **Engraving:** `htlInk` is false exactly for black ink on white paper (by value, so `#000` / `#fff` count), and then neither branch
  is touched; a saved engraving has neither colour, read as that black and white directly.
- **Pop Art:** Grid 0 and 1 are n = 2 and 3 as before, and any other value but 2 is still 2 (the old `=== 1 ? 3 : 2`); `swaps` is 0 for
  no Colour swap, a rate of 0, or before the first beat, and then `k` is the old `k`.
- **Censor:** an angle that is a whole number of half turns (0, ±180, 360) takes `turn` false, and then ex = rw / 2, ey = rh / 2 make
  the four region lines the old ones and the mask the old rect / ellipse; black is the old `'#000'`.
- **Colour Cycle:** only spread > 0 calls `hueSpread966`; at 0 the old loop runs untouched and Rainbow angle is never read.
- **Text Pad:** characters 0–3 and sides 0–1 run the old expressions (any other character still pads zeros, any other side still pads
  before); a test checks it against a copy of the old kernel.
- **Arity unchanged** for every kernel (shapewipe, contourstrips, huecycle 5; halftonelines 6; popart, censor 7; textpad 3).
- **Not exact by design, off the default only:** the Shape Wipe border is anti-aliased over one plate px on its inner side; a turned
  Censor box's edge is the canvas path's anti-aliasing; Rainbow across reads its matrix every eighth of a degree.

## 4. The sweeps (reasoned, owed a run)

- **`no effect erases the layer at a single parameter extreme (queue 264)`** — orange 300 x 450 layer over black, 540 x 960, t = 0.5,
  one param at min or max (segments at their last index): **no ALLOWED entry needed.**
  - Shape Wipe Border width 100 (33 plate px on the 1/3 plate) paints white inside the default half-open circle, whose 275 px radius
    passes the layer's corners (270 px out) — the corners get white; nothing is erased. 0 is the default.
  - Topo Bands Flow −10 / 10 at 0.5 s is 5 bands — a whole turn of the 5 strips, so it IS the default picture (s ≡ 0).
  - Pop Art Four by four (index 2) tiles the layer in 16; Colour swap 10 at the layer's clip time 0.5 s is 5 swaps — a recolour.
  - Censor Angle ±180 is the unturned box (old path). Colour rows are not swept.
  - Colour Cycle Rainbow across 720 recolours across the layer; Rainbow angle 0 / 360 with Rainbow across 0 does nothing (the default).
  - Text Pad's last choices (Stars, Both sides) are a text effect's: on this shape they do nothing.
- **`effects: no effect slider is completely inert`** (PIXEL_FX ranges at five fractions, five moments, three fixtures, the kernel at
  ps 1): Shape Wipe Border width (0 → 17 px paints a band; 41, 66, 93 all fill the 30 px circle — still alive across the run); Topo
  Bands Flow speed (−10 … 8.6 at 0.23 s is −2.3 … 2.0 bands, 2.7 / 3.5 / 4.6 / 0.7 / 2.0 round the five — every fraction a different
  strip pattern); Colour Cycle Rainbow across
  and Rainbow angle (unlocked by `liveAbove`: the sweep sets Rainbow across to its max, 720). Pop Art and Censor are CANVAS_FX, not swept.
- **`784: no effect is switched off by a missing param key`** — a bare `{}` fills every new key to its default (identity).
- **`793: every param shows in the inspector what an absent key renders`** — the literals above: flow 0, angle 0, cycle 0, spread 0,
  sangle 0 (border: no literal, schema default 0); colours are not compared.
- **`859: every pixel effect draws the same picture on the preview plate as in the export`** — defaults only: unchanged. (Engraving is
  INHERENT there.)
- **`482: every effect does something visible at its own defaults`** — unchanged.
- Also reasoned: `#635` ruler notches (Border 100, Flow 200, Swap 20, Angle 360, Rainbow across 144, Rainbow angle 360 — all under
  400), every range default inside its range, the segment-overflow sweep (Pop Art's three Grid buttons and Text Pad's six Pad with
  buttons wrap as Change Case's six do), queue 692's crop fixtures (Topo Bands stays a member; its new param is position-free).

## 5. Busters and schema

- `index.html`: `js/compositor.js?v=226 → 227`, `js/fx-registry.js?v=27 → 28` (Topo Bands', Engraving's and Text Pad's descriptions
  name the new choices), `js/collab-core.js?v=39 → 40`. inspector, fx-thumbs and audio-fx are untouched (the registry derives the rows
  — colour gates, `liveAbove`, the new segment choices all pass through `paramsOf`), so their busters stay at 425 / 59 / 22.
- `js/collab-core.js`: `C.SCHEMA_REV = 20` with a Rev 20 note. **`C.SCHEMA_FP` is still rev 19's number (5316265556894241)**, under a
  `/* FP TO PIN (966 opts5) */` line — the builder measures it with fp.js; `921 S1 the schema fingerprint gate` fails until then.

## 6. Tests (tests/tests.js, one block between `// ── 966 opts5 (hunt/966-opts5) ──` and `// ── end 966 opts5 ──`)

All `{ item: '966', budgetMs: 60000 }`, each failing on 07d1859f on its first line by naming the missing control, choice or seam
(`_o5Need`, `_o5OptNeed`). 30 tests:

1. `966 opts5 every new control at its default draws what the effect drew without it — Shape Wipe, Topo Bands, Engraving, Pop Art, Censor and Colour Cycle through the compositor…` (1:1 and half plate, 0.61 / 1.73 s, a gradient rect; CONTROL each changes it)
2. `966 opts5 Shape Wipe has Border width (0–100 px, scaled to the preview plate) and a Border colour…` (a; `_pxParamKeys`, 20 px → 5.6 on 0.28)
3. `966 opts5 Shape Wipe Border width: on an 81 x 81 grey plate the circle half open has a red 5 px border…` (b; four rays, exact pixels j = 0–3 / ≥ 6, the band sums to 5, Invert outside, soft feather, every shape, Progress 0 / 1, compositor 10 vs 5)
4. `966 opts5 Shape Wipe at 0 px draws byte for byte…` (c; 11 cases)
5. `966 opts5 Shape Wipe CONTROL…` (d)
6. `966 opts5 Topo Bands has Flow speed…` (a; stays in CROP_FX)
7. `966 opts5 Topo Bands Flow speed: on a grey ramp with five black-to-white strips…` (b; exact per pixel at s = 1.25, 3.75, keyframed 2.25, held 3.375, weak strips 0.75)
8. `966 opts5 Topo Bands at Flow 0 draws byte for byte…` (c; 0 s and whole turns; helper at s = 0 is the old loop; `_topoShift966` values)
9. `966 opts5 Topo Bands CONTROL…` (d)
10. `966 opts5 Engraving has an Ink colour and a Paper colour…` (a)
11. `966 opts5 Engraving Ink and Paper: every pixel is the black-and-white engraving’s grey laid between the two…` (b; ±1 at ps 1 and 0.5, clear pixels, keyframed Ink)
12. `966 opts5 Engraving in black on white draws byte for byte…` (c; #000 / #fff too)
13. `966 opts5 Engraving CONTROL…` (d)
14. `966 opts5 Pop Art has a Grid of Two by two, Three by three or Four by four… and Colour swap…` (a)
15. `966 opts5 Pop Art Four by four: sixteen squares of 30 px…` (b; middles opaque, corners clear, 16 hues, palettes 10–16 repeat 1–7, touching posterised squares differ)
16. `966 opts5 Pop Art Colour swap: the colours travel along the squares on the clip’s clock…` (b; square-for-square pixel equality, 0.99 s, keyframed = integrated, `_popSwap966` values)
17. `966 opts5 Pop Art at Colour swap 0 draws byte for byte…` (c; unknown Grid value, before the first beat, half plate)
18. `966 opts5 Censor has Angle (−180 to 180°, keyframable) and a Bar colour live only under Black bar…` (a)
19. `966 opts5 Censor Angle and Bar colour: a 96 x 24 Black bar in green…` (b; every pixel 1.5 px inside / outside the turned box and oval, clockwise, half turns, the clear strip, the pixel grid)
20. `966 opts5 Censor at 0° and a black bar draws byte for byte…` (c; ps 1 and 0.5, #000)
21. `966 opts5 Censor CONTROL…` (d)
22. `966 opts5 Colour Cycle has Rainbow across (0–720°, keyframable) and a Rainbow angle…` (a; the `liveAbove` gate)
23. `966 opts5 Colour Cycle Rainbow across: 360° across a 72-px frame gives each column the plain cycle at its own Start colour…` (b; exact per column / row at 0°, 90°, 180°, Stepped + boost, a 36-wide plate, the clear pixel)
24. `966 opts5 Colour Cycle with no Rainbow across draws byte for byte…` (c)
25. `966 opts5 Colour Cycle CONTROL…` (d)
26. `966 opts5 Text Pad pads with Zeros, Spaces, Dots, Dashes, Underscores or Stars… on the Side Before, After or Both sides…` (a; sanitiser on a text layer)
27. `966 opts5 Text Pad Both sides, Underscores and Stars: “TITLE” to 9 in dashes on both sides reads “--TITLE--”…` (b; 12 exact strings)
28. `966 opts5 Text Pad with its four old characters on either old side writes character for character what it wrote before…` (c; against a copy of the old kernel)
29. `966 opts5 Text Pad CONTROL…` (d; through the compositor)
30. `966 opts5 the seven effects’ editors, new rows and all, fit the inspector…` (phone fit; CONTROL labels Border width, Flow speed, Paper, Four by four, Angle, Rainbow across, Both sides)

**MEASURE placeholders (generous bounds; the builder measures at 1280 and 380 and tightens):**
- test 3: pure-red border pixels per shape (Ellipse, Rectangle, Diamond, Star, Heart) at 5 px on 81 x 81 — bound ≥ 150 (the circle's
  ring is ~4.5 x 180 ≈ 800).
- test 11: solid-ink (v = 0) and bare-paper (v = 255) pixel counts at ps 1 and 0.5 — bound ≥ 200 each.
- test 15: the closest pair of the sixteen hue-shifted squares' middles — bound ≥ 6 (sum of |ΔR| + |ΔG| + |ΔB|); squares 10–16 against
  1–7 — bound ≤ 2, expected 0.
- test 16: a swapped square against the square whose colours it wears — bound ≤ 2, expected 0.
- Reasoned floors (not MEASURE, but worth a look): test 3's 20 feather pixels; test 5's 500; test 9's 1000; test 13's 1000; test 19's
  300 well-inside pixels; test 21's 300 / 1500; test 23's 300 of 432 and ±1 (expected 0); test 25's 2000; test 29's 20.

**Shared test edited: one line.** `966 B15 Shape Wipe is in the registry…` asserted `FM._pxParamKeys('shapewipe').join() === 'softness'`;
Border width is a second px control, so it now asserts `'softness,border'` (with a comment). On 07d1859f that assertion fails (only
`softness` there), so prove.sh can catch it. Searched tests.js for each type id — `'shapewipe'` 28 hits, `'popart'` 7, `'censor'` 10,
`'huecycle'` 11, `'textpad'` 2, `'contourstrips'` 2, `'halftonelines'` 3 — every other one reads its own keys or the defaults: E1's
Colour Cycle / Censor / Pop Art kernel tests and preview-equals-export (defaults, and Grid 0 / 1), B15's kernel and plate tests (Border
0 by default), the queue 261 / 264 / 784 / 793 / 859 sweeps, the un-upgraded-instance tables (49432 Topo Bands, 55672 Engraving: they
stamp makeInstance's keys, ours at their defaults), Text Pad's 73322 strings (Zeros Before, unchanged), and the registry-order tests
(no type moved).

## 7. #545 before/after sheet (owed — for him to pick or veto)

Render through the app (`FM.renderScene` in a tests/ probe), at phone size (≈ 380 px wide frame), each option at 2–4 values beside
today's default, on a fixture where it clearly shows:
- **Shape Wipe** on a full-frame photo over a contrasting clip, a 4-frame strip (Progress 0.2 / 0.4 / 0.6 / 0.8): Circle with Border
  0 (today) / 8 / 24 px white; Heart with 12 px pink (#ff4f8b); Star with 10 px gold (#ffd23f); Circle inverted with 8 px.
- **Topo Bands** on a portrait photo, a 4-frame strip over one second: Flow 0 (today) / 1 / 3 / −2 bands a second.
- **Engraving** on a portrait: Ink / Paper black on white (today) / #1f6f43 on #f3e5c0 (banknote) / #ffffff on #1a237e (white on navy)
  / #d4a017 on #111111 (gold on black).
- **Pop Art** on a face: Grid Two by two (today) / Three by three / Four by four; and a 4-frame strip of Colour swap 2 a second on three
  by three.
- **Censor** on a photo with a tilted number plate: Angle 0 (today) / 15 / −25°; Black bar in black (today) / white / brand pink.
- **Colour Cycle** on a photo and on a title: Rainbow across 0 (today) / 180 / 360 / 720°, and 360° at Rainbow angle 90° and 45°, plus a
  4-frame strip at Speed 90.
- **Text Pad** on a caption: Before / After / Both sides with Dashes, and Underscores / Stars beside Zeros.
Names to put to him (#954 / "options, recommended next to the best"): Border width, Border colour, Flow speed, Ink, Paper, Four by
four, Colour swap, Angle, Bar colour, Rainbow across, Rainbow angle, Both sides, Underscores, Stars.

## 8. Risks and what is unsure

- **Nothing was run.** Every claim in the tests is reasoned; the first run may move a marked bound or expose a slip in a worked pixel
  (each is worked in the test's comment, so a red can be checked quickly).
- **Pop Art's square-for-square equalities (tests 15, 16) assume every square is resampled identically** — the same source rect drawn
  to the same size at a whole-pixel offset. That should be exact; ±2 is allowed in case Chrome's high-quality resampling is not
  translation-invariant. If it is far off, compare the squares' mean colours instead.
- **Shape Wipe's border under Stretch** is measured in the stretched frame (as Edge softness already is), so a stretched shape's border
  is wider along the stretch; the ellipse's SDF is approximate, so its border is close, not exact.
- **Censor's label "Black bar"** stays although the bar can now be any colour — a naming question for the sheet ("Solid bar"?). The
  label was kept so nothing he knows moves.
- **Censor turned while half off the layer:** the turned box or oval is drawn at full size (clipped by the region), where the unturned
  oval shrinks to the clipped box, as before — the two differ at the layer's edge only off the default.
- **Pop Art Four by four has nine palettes for sixteen squares** (squares 10–16 repeat 1–7, never touching their twin). Sixteen
  palettes of its own would be a taste call for the sheet. Colour swap runs forward in reading order; backwards is one character.
- **Topo Bands' Flow runs on project time** (as Stripes' Scroll does), Pop Art's Colour swap on the clip's own clock (as Colour Flash's
  beats do, so the first swap is one beat into the clip). If he wants them alike, either is one line.
- **Colour Cycle's Rainbow across is relative to the frame**, so a small title shows a sliver of the rainbow; "Fit to Layer" (Radial
  Wipe's choice) would be a later control.
- **Text Pad's Both sides** counts the width in UTF-16 units like the old pad, so an emoji counts two — as it always did.

## 9. Owed by the builder

1. First run of the 30 tests at 1280 and 380 (`?only=966%20opts5`), set the MEASURE bounds from measurement, and run the edited B15 test
   (`?only=966%20B15`).
2. Measure and pin `C.SCHEMA_FP` (fp.js) at rev 20, replacing the FP TO PIN line.
3. Full suite (the sweeps in §4, E1's tests, queue 692's crop fixtures), prove.sh, then the #545 sheet in §7 before the release that
   ships it.
