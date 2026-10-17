# #966 opts3 — a third round of more choice on six effects he already has (hunt/966-opts3)

His standing request #966: *"you can polish other effects just giving them more features and making them work a bit better and
have more customisation … more choices always better … this is the complex version we want as much choice as possible"*.

Branch `hunt/966-opts3`, based on `hunt/v62f` 3987cbfa (release v17.62: v17.61 + round two + the 921 clamp-echo fix). **Code only,
17 Oct, while v17.62 shipped from the main checkout: nothing was run but `node --check`.** No browser, no suite, no tools/*.sh
runner, no node or python running app or test code.

## 1. Twin check (done before any code)

Picked for what he would SEE in a short phone edit and for being thin next to AE / Premiere / CapCut / Alight Motion / DaVinci: a
transition (Wipe), an opacity look (Flicker), a looping motion (Wrap Shift) and three background generators (Stripes, Checker,
Dots). Every candidate control was checked six ways — by CONTENT, never by git ancestry:

| Check | How | Result |
|---|---|---|
| 1. Already in the code? | the EFFECTS row and kernel of each effect in this worktree; `git grep -n "key: '<key>'" -- js/` for every new key | none of the new keys is on these six rows. The names exist elsewhere on other effects only (`scrollx`/`scrolly` on Tile Grid, `stagger` on Tile Grid and Venetian Blinds, `smooth`/`border`/`split`/`shape` on others) — per-effect keys, free here |
| 2. Idle backlog | `tools/design/plans/2026-09-29-idle-backlog/backlog.md`, grep for each type id, label and idea (wipe, flicker, wrap shift, stripes, checker, dots, polka, stagger, barn, border, scroll) in §A, §B and §C | **nothing planned for these controls.** Hits are history or elsewhere: §A 12.3 Wipes (Fit to, Invert, Radial's Direction and Blades — all on this base), §A 13.2's CRT `flicker` and 1.x's Film `flicker` (other effects), 14.5's Tile Grid `scrollx`/`scrolly` (another effect, built), §C C33 "Checker, Grid and Stripes are aliased" (anti-aliasing, see 3), C36 (Wipe fit, built) |
| 3. ChatGPT pile | `/home/ezra/FreeMotion/tools/design/chatgpt-tasks/pile/LAND-LIST.md` and INVENTORY.md | no new control on any of the six. **Overlaps to note, both by position not by idea:** (a) INVENTORY T25 `1ca7ffe5` "Smooth turned pattern edges in Checker Grid and Stripes" — parked on his question 10 ("put it behind a Smooth edges switch, off by default") — rewrites the rotated paths of the Checker and Stripes kernels that the new scroll code sits beside; whoever lands second rebases by hand. (b) LAND-LIST B2 `5673c230` "Keep Flicker phase continuous through keyed Speed" — this base already integrates Flicker's keyed Speed (`FM.integrateCount`), and the new Flicker code reads that same clock, after it |
| 4. POLISH-LOG / REQUESTS | grep in /home/ezra/FreeMotion for barn door, wipe border, from the middle, candle, smooth flicker, wrap shift scroll, moving stripes / checker, barber, polka, stagger | only unrelated history (home-card grain, UI staggers). Nothing asked for or planned on these six |
| 5. Rounds one and two | tools/design/plans/966-opts/NOTES.md, tools/design/plans/966-opts2/NOTES.md | none of the six is in either round (round one's Neon Outline `flicker` is another effect's control) |
| 6. Unmerged branches | the six EFFECTS rows' key lists compared with this base's on **every ref of both repos** — /home/ezra/fm-helper (636 refs, incl. ssh/hunt/1068-b8 15c19964, ssh/hunt/912-filters e4ff12c3, ssh/hunt/pile-overdrive 44e7cb8b, ssh/plans/482-canvasfx 7683b198, every `codex/*`, `wip/*`, `pile-*`, `fxnew-*`) and /home/ezra/FreeMotion (857 refs) — 77 distinct compositor.js blobs, read-only `git cat-file`; plus a grep of the six kernels and the Wrap Shift prep on every blob for `p.border/split/scroll*/stagger/smooth/steady` | **no ref has any control on these six that this base lacks** (every ref carries this base's rows or an older, shorter list), and no kernel on any ref reads any of the new keys — no twin |

Considered and dropped: **Tile Spin / Brick Slide** spin and slide speeds (their CPU kernels read every param per pixel with no
prep, so a keyframed speed would integrate per pixel — a prep would change the driver path for them), **Grid** scroll (the same
idea as Checker's, and the same T25 collision), **audio** (the bypass-pair rule needs an OfflineAudioContext run to prove, as
round two found), **text** effects (the renderer, hard to keep byte-identical code-only), **CSS colour effects** (Invert,
Hue Shift … — a new control would have to move them off the canvas filter, Gaussian Blur's plate dance).

## 2. What was built — 6 effects, 12 new controls

| Effect (type) | Key | Label | Range / choices | Default | What it does |
|---|---|---|---|---|---|
| Wipe (`wipe`) | `split` | Opens | One side / From middle | One side (0) | From middle opens both ways at once from a line through the centre (Premiere's Barn Doors); with Invert it closes in to that line |
| | `border` | Border width | 0–100 px (unit px: pxToPlate scales it), keyframable | 0 | a band of the Border colour along the edge as it travels, on the part still showing (Premiere's Wipe border) |
| | `color` | Border colour | colour row, greyed while Border width is 0 (`colorGate` deadAt 0, "0 px") | #ffffff | the band's colour |
| Flicker (`flicker`) | `smooth` | Smoothness | 0–100 %, keyframable | 0 | glides from each level to the next over the last part of the step instead of jumping — at 100 % it never jumps (a candle, not a faulty bulb) |
| | `steady` | Stays lit | 0–95 %, keyframable | 0 | about that share of the steps stay fully on; the rest still dip as deep as Amount (a light that mostly holds and now and then drops) |
| Wrap Shift (`wrapshift`) | `scrollx` | Scroll across | −200–200 %/s, keyframable (integrated) | 0 | keeps the picture sliding by that share of the frame a second, on the clip's own clock — a seamless loop or a ticker with no keyframes |
| | `scrolly` | Scroll down | −200–200 %/s, keyframable (integrated) | 0 | the same, vertically |
| Stripes (`stripes`) | `scroll` | Scroll speed | −400–400 px/s, keyframable (integrated) | 0 | the stripes keep moving across their own direction — a barber pole, hazard tape, a candy-stripe background |
| Checker (`checker`) | `scrollx` | Scroll across | −400–400 px/s, keyframable (integrated) | 0 | the board slides along its own rows (straight across at Angle 0) |
| | `scrolly` | Scroll down | −400–400 px/s, keyframable (integrated) | 0 | …and down its own columns |
| Dots (`dots`) | `stagger` | Layout | Grid / Staggered | Grid (0) | Staggered slides every other row half a dot along — polka dots |
| | `shape` | Dot shape | Round / Square / Diamond | Round (0) | squares or diamonds of the same Dot size (half-width of a square, half-diagonal of a diamond), with the same Edge softness |

Exact definitions (js/compositor.js; helpers beside round two's after `cornerMid966`, each with a suite seam):

- **Opens / Border width** (`wipe966`, seam `FM._wipe966`): the kernel's own `proj` (0 at the start edge, 1 at the far one, `den` px
  long). One side reads v = proj over E = den — the old cut; From middle reads v = |proj − 0.5| x 2 over E = den / 2. Hard: gone when
  v > Progress (v ≤ Progress under Invert); soft: c = (Progress x (E + sf) − v x E) / sf, 1 − c under Invert. Border: a shown pixel s px
  into the shown side from the edge's half-way line, s = Progress x (E + sf) − v x E − sf / 2 (negated under Invert), takes the Border
  colour by clamp(bd + 0.5 − s, 0, 1); the alpha is decided first and never touched by the border.
- **Smoothness / Stays lit** (`flicker966` and `flickerRoll966`, seams `FM._flicker966`, `FM._flickerRoll966`): Stays lit st turns each
  roll n into a dip, n ≤ st → 0, else (n − st) / (1 − st); Smoothness s glides from this step's dip to the next step's over the last s
  of the step on a smoothstep, w = (f − (1 − s)) / s. The next step's roll is the kernel's own hash at the (Pattern-shifted) step + 1;
  the fraction f is read off the very clock the step came from (rate x t, or the keyframed integral + 1e-9 that `integrateCount`
  floors).
- **Scroll across / down on Wrap Shift** (inline in `WARP_FX.wrapshift.prep`, which is also the shader's uniforms): `wClipIntegral`
  (Wave speed's helper: rate x clip time, or the integral over the clip when keyframed) modulo 100 %, added to Shift X / Y before the
  prep's own rounding. The GLSL is untouched; it reads the same `dx`, `dy`.
- **Scroll speed / Scroll across / down on the patterns** (`patternScroll966`, `stripes966`, `checkerScroll966`, seams
  `FM._patternScroll966`, `FM._stripes966`, `FM._checkerScroll966`): the speed held to ±400, x t (or integrated from 0 when keyframed),
  x ps (plate px), modulo the pattern's period (Stripes' period; two cells for each Checker axis). Stripes draw from (value − off);
  Checker from (u − ox, v − oy) in the board's own (turned) axes.
- **Layout / Dot shape** (`dots966`, seam `FM._dots966`): the old loop, with odd cell rows read half a cell along (x + Spacing / 2),
  and the dot measured by max(|dx|, |dy|) (Square) or |dx| + |dy| (Diamond) instead of the circle, through the same hard and soft
  branches.

## 3. Why each default is exact (byte-identical pixels)

- **No `legacy` anywhere, and every `def` IS today's look**, so the render-time fill (queue 784) writing the default into a saved
  project's absent key changes nothing. Each kernel reads its key with a literal fallback equal to `def` (`p.split == null ? 0`,
  `p.border == null ? 0`, `p.smooth == null ? 0`, `p.steady == null ? 0`, `p.scroll==null?0`, `p.scrollx==null?0`, `p.stagger==null?0`,
  `p.shape==null?0`) — the literal `FM._fxFillValue` reads off the source. Wrap Shift's reads are in its prep, not its kernel, so the
  fill falls through to `def` (0) — the same number. The Border colour fills to its `defColor` (white), and is unused at 0 px.
- **Wipe:** the kernel computes Opens and Border width after everything it computed before (Progress, Invert and the two early returns,
  angle, Fit to, den, softness) and hands off to `wipe966` only when Opens is From middle or Border width > 0; otherwise its two old
  branches run untouched. `wipe966` copies those branches' expressions to the bit (`proj`, the hard comparison, the soft c and its
  `c >= 1` / `c <= 0` handling), so with One side and no border it IS the old cut — a test runs it on the kernel's own numbers and
  compares byte for byte. Progress 0 and 1 return before either path. `border` has `unit: 'px'` on an arity-5 kernel, so pxToPlate now
  copies the params on a reduced plate (it already did, for Edge softness): the same values, and 0 x ps is 0.
- **Flicker:** Smoothness and Stays lit are read after the roll; only `fl_sm > 0 || fl_st > 0` replaces `fl_n`, so at 0 / 0 the dip,
  `fl_k` and the alpha loop are the old ones. Smoothness exactly on a step (f = 0) and in the first (1 − s) of it returns this step's
  roll unchanged.
- **Wrap Shift:** absent keys give 0 directly; a 0 speed makes `wClipIntegral` return exactly 0 (its own `s !== 0` guard), and a whole
  lap gives 0 or −0 after `% 100`; the prep adds only when the value `!== 0` (−0 included), so `px`, `py`, and the rounded `dx`, `dy` —
  the CPU loop's and the shader's only inputs — are the old ones.
- **Stripes / Checker:** `patternScroll966` returns exactly 0 for a 0 speed, for t = 0, and after a whole number of periods (−0 folded
  to 0), and the kernels branch to their scroll loops only on a non-zero offset; at 0 the old loops run untouched. Each scroll loop with a
  0 offset is also the old loop to the bit (Math.floor is the old `|0` on non-negative plate coordinates; u − 0 is u), and a test proves
  it on the kernel's own numbers.
- **Dots:** Grid and Round never call `dots966`; `dots966` on Grid and Round is the old loop to the bit (x + 0 is x; the same `q <= r2`
  and soft branch expressions), and a test proves it, hard and soft.
- **Arity unchanged** (wipe and flicker 5, stripes / checker / dots 6, the wrapshift kernel 11 and its prep now names its 9th, `tl`,
  which drawWarpEffect has always passed), so pxToPlate's choice and the driver's path are the same as before.
- **CROP_FX:** Flicker takes the cropped readback; both new controls change one scalar for the whole plate, so a cropped buffer draws
  the same picture — the #692 crop re-proof at every range param's maximum should stay green (owed: a run). The other five are not crop
  members.
- **Not exact by design, off the default only:** the patterns' scroll offsets are fractional plate px (a hard bar edge moves in
  sub-pixel steps, as it is drawn hard); a keyframed speed's integral can land a last bit over a whole number, which can tip the rows or
  columns on a pattern edge (the tests bound it).

## 4. The 264, inert and 784 sweeps (reasoned, owed a run)

- **`no effect erases the layer at a single parameter extreme (queue 264)`** — orange 300 x 450 layer over black, t = 0.5, one param at
  min or max: **no ALLOWED entry needed.** Wipe Opens From middle keeps |x − 270| ≤ 135 of the 540-wide frame (the layer spans
  120–420); Border width 100 paints a white band inside the kept left half; Flicker Smoothness 100 still dims by at most Amount 0.7
  (alpha ≥ 30 %) and Stays lit 95 mostly leaves it whole; Wrap Shift ±200 %/s at 0.5 s is ±100 % — the 25 % shift again, and a wrap keeps
  every pixel anyway; Stripes and Checker scrolls only move a 60 % / 50 % black pattern over the layer; Dots Staggered and Diamond draw
  white dots over it. Every min is the default, which the sweep already passes.
- **`effects: no effect slider is completely inert`** (PIXEL_FX ranges at five fractions, five moments, three fixtures): Wipe Border
  width paints a white band left of x = 48 on the subject frame's opaque parts at every fraction above 0; Flicker Smoothness moves the
  alpha mid-step at 0.23 s (93 %) and 0.61 s (66 %, 93 %); Stays lit zeroes the dip of any roll under its fraction at five steps; Stripes
  and Checker scrolls slide the pattern by different offsets at 0.23 s and later. Wrap Shift is a warp, not swept. Segments are not
  swept.
- **`784: no effect is switched off by a missing param key`** — a bare `{}` fills every new key to its default (identity), so bare draws
  what the defaults draw.
- Also reasoned: `793` (fill = default for every new row), `859` (every pixel effect at its defaults — unchanged), `913.5` (defaults),
  `482: every effect does something visible at its own defaults` (unchanged), `#635` ruler notches (100, 95, 80 and 160 notches, all
  whole multiples of the step, under the 400 cap).

## 5. Busters and schema

- `index.html`: `js/compositor.js?v=224 → 225`, `js/collab-core.js?v=37 → 38`. fx-registry, inspector, fx-thumbs and audio-fx are
  untouched (the registry derives the rows — the colour row's `colorGate` deadAt, segment and range rows all pass through `paramsOf` —
  and the inspector draws them from it), so their busters stay at 26.36 / 425 / 59 / 22.
- `js/collab-core.js`: `C.SCHEMA_REV = 18` with a Rev 18 note. **`C.SCHEMA_FP` is still rev 17's number (7869720651737680)**, under a
  `/* FP TO PIN (966 opts3) */` marker — the builder measures it with fp.js; `921 S1 the schema fingerprint gate` fails until then.

## 6. Tests (tests/tests.js, one block between `// ── 966 opts3 (hunt/966-opts3) ──` and `// ── end 966 opts3 ──`)

All `{ item: '966', budgetMs: 60000 }`, each failing on 3987cbfa on its first line by naming the missing control or seam (`_o3Need`).
Per effect: (a) rows, (b) what it does, (c) defaults byte for byte (with the helper-is-the-old-loop check), (d) a CONTROL.

1. `966 opts3 every new control at its default draws what the effect drew without it — all six effects through the compositor…` (1:1 and half plate, 0.61 / 1.73 s; CONTROL each changes its layer at either moment)
2. `966 opts3 Wipe has Opens (One side, From middle), Border width (0–100 px, scaled to the preview plate) and a Border colour…` (a; plus `_pxParamKeys`)
3. `966 opts3 Wipe Opens From middle: at Progress 0.5 the middle half of the frame shows…` (b; exact columns on a 128-wide plate; soft alphas 128 / 191)
4. `966 opts3 Wipe Border width: a red 10 px border runs along the edge…` (b; exact columns, Invert, From middle, soft, half-size plate 5 vs 10)
5. `966 opts3 Wipe on One side at 0 px draws byte for byte… its helper on One side with no border is the old cut to the bit` (c)
6. `966 opts3 Wipe CONTROL: on the fixture Opens and Border width each move the picture…` (d)
7. `966 opts3 Flicker has Smoothness (0–100 %) and Stays lit (0–95 %)…` (a)
8. `966 opts3 Flicker Smoothness: at 100 % the level glides from one step’s to the next…` (b; exact on a step, ±1 mid-step, never jumps, keyframed Speed)
9. `966 opts3 Flicker Stays lit: at 60 % about three steps in five stay fully on…` (b)
10. `966 opts3 Flicker at 0 % and 0 % draws byte for byte…` (c; 24 cases)
11. `966 opts3 Flicker CONTROL: on the fixture Smoothness moves the picture inside a step and not exactly on one…` (d)
12. `966 opts3 Wrap Shift has Scroll across and Scroll down (−200–200 %/s, keyframable)…` (a)
13. `966 opts3 Wrap Shift Scroll across and Scroll down keep the picture sliding…` (b; the prep's dx / dy worked, the clip clock, laps, keyframes; compositor byte-identity with the still shift reached)
14. `966 opts3 Wrap Shift still draws byte for byte…` (c; 25 prep cases + compositor)
15. `966 opts3 Wrap Shift CONTROL: a scroll moves the picture once time has passed…` (d)
16. `966 opts3 Stripes has Scroll speed (−400–400 px/s, keyframable)…` (a)
17. `966 opts3 Stripes Scroll speed: the stripes slide along their own direction…` (b; byte-identical slides in four directions, half plate, keyframed)
18. `966 opts3 Stripes at 0 px/s draws byte for byte… its helper with no scroll is the old loop to the bit` (c)
19. `966 opts3 Stripes CONTROL: on the fixture Scroll speed moves the picture once time has passed…` (d)
20. `966 opts3 Checker has Scroll across and Scroll down (−400–400 px/s, keyframable)…` (a)
21. `966 opts3 Checker Scroll across and Scroll down: the board slides along its own rows and columns…` (b)
22. `966 opts3 Checker still draws byte for byte… its helper with no scroll is the old loop to the bit, square and turned` (c)
23. `966 opts3 Checker CONTROL: on the fixture Scroll across and Scroll down each move the picture…` (d)
24. `966 opts3 Dots has Layout (Grid, Staggered) and Dot shape (Round, Square, Diamond)…` (a)
25. `966 opts3 Dots Layout Staggered slides every other row half a dot along — polka dots…` (b)
26. `966 opts3 Dots Dot shape: Square fills 121 pixels of each 16 px cell, Round 89 and Diamond 61…` (b; exact lattice counts, corners, soft 188)
27. `966 opts3 Dots on Grid and Round draws byte for byte… its helper on Grid and Round is the old loop to the bit, hard and soft` (c)
28. `966 opts3 Dots CONTROL: on the fixture Staggered, Square and Diamond each move the picture…` (d)
29. `966 opts3 the six effects’ editors, new rows and all, fit the inspector…` (phone fit; CONTROL labels Border width, Smoothness, Scroll across, Scroll speed, Scroll down, Dot shape)

**Bounds — MEASURED on the first run (17 Oct, the builder; 1280 and 380 gave identical numbers)** (everything else is exact — `=== 0`,
byte for byte, worked pixel values ±1 for Uint8 rounding, or exact lattice counts):
- Wipe Border: 10 red pixels at 1:1 and exactly 5 on a half-size plate.
- Flicker Stays lit 60 %: 53 of 96 steps fully on (bound 40–75); the plain flicker 0; the worst step 1.25 levels off its roll; the deepest dip 80.
- Checker turned 90°: 0 of 8064 pixels off a pure slide (bound 1 % kept for cos 90°'s last bit).
- Keyframed scroll: Stripes 0 px off (bound tightened to one row, 64 px; 4096 from the still stripes); Checker 288 of 9216 off (3.1 %, bound 5 %; 8928 from the still board).
- First run: '966 opts3' 29/29, the fingerprint gate, 482 visible, the inert sweep, 784, 913.5 and the queue-264 sweep all green at 1280 and 380; SCHEMA_FP pinned 5398151296079833 (fp.js, rev 18).
- Probability-based CONTROLs (a jump over a quarter of 255 among 16 rolls; a roll that is not ~0 at one of two or five moments) — each
  under one chance in a thousand to miss.

**Shared tests edited: none.** Searched tests.js for each type id and label: the wipe tests (`queue 559`'s q check at 8363, the progress
0/1 and softness tests at 62729 / 79475, #482 12.3's `b12Catalogue` / `b12Pinned` hashes at 132917 — their configs get the new keys at
their defaults from makeInstance, which draw the pinned bytes), Flicker's #904 Pattern test (79444), the pattern overlays' legacy tables
(`effects: the pattern overlays still render an un-upgraded instance exactly as they did`, 55742, and the Dots row at 49473 — both stamp
makeInstance's keys and compare), Stripes' directions (55799), Wrap Shift's registered / no-Edges / no-Smooth / prepped-reference checks
(74958, 134047, 83313) all read their own keys or the defaults.

## 7. #545 before/after sheet (owed — for him to pick or veto)

Render through the app (`FM.renderScene` in a tests/ probe), at phone size (≈ 380 px wide frame), each option at 2–3 values beside
today's default, on a fixture where it clearly shows:
- **Wipe** on a full-frame photo over a contrasting clip, as a 4-frame strip (Progress 0.2 / 0.4 / 0.6 / 0.8): Opens One side (today) /
  From middle, and From middle with Invert; Border width 0 (today) / 8 / 24 px in white, and 12 px in yellow over a soft 30 px edge.
- **Flicker** on a bright title over dark footage: a 2-second opacity graph per Smoothness 0 (today) / 50 / 100 % and per Stays lit 0
  (today) / 50 / 85 %, plus a 6-frame strip each.
- **Wrap Shift** on a wide photo or a title: a 4-frame strip (0, 0.25, 0.5, 0.75 s) at Scroll across 0 (today) / 50 / −100 %/s, and
  Scroll down 40 %/s.
- **Stripes** as a full-frame background: a 4-frame strip at Scroll speed 0 (today) / 60 / −200 px/s, Across, Down and ↘.
- **Checker** as a full-frame background: a 4-frame strip at Scroll across 0 (today) / 40 px/s, Scroll down 40, and both at 30° Angle.
- **Dots** as a full-frame background: Grid (today) / Staggered × Round (today) / Square / Diamond — six stills — plus one soft (4 px).
Names to put to him (#954 / "options, recommended next to the best"): Opens (One side · From middle), Border width, Border colour,
Smoothness, Stays lit, Scroll across, Scroll down, Scroll speed, Layout (Grid · Staggered), Dot shape (Round · Square · Diamond).

## 8. Risks and what is unsure

- **Nothing was run.** Every claim in the tests is reasoned; the first run may move a marked bound or expose a slip in a worked pixel
  (each is worked through in the test's comment, with the exact arithmetic, so a red can be checked quickly).
- **Wipe's border sits on the shown side only** (inside the layer's own pixels) — it never paints over what is behind, so a border on a
  title is drawn on the title, not across the frame. If he wants Premiere's border that also covers the incoming clip, a new choice.
- **Wipe From middle with an angle** opens from a line through the centre at that angle; with Fit to Layer, through the layer's middle.
- **Flicker Stays lit at 95 %** dips rarely by design; the slider stops at 95 so it can never switch the flicker off entirely.
- **Wrap Shift's scroll** runs on the clip's own clock (as Tile Grid's Scroll and every warp speed do), so splitting or trimming a clip
  carries it on (fxTimeOffset); the patterns' scrolls run on the clock their kernels already use for everything else (as Sunburst's and
  Corner Colours' Spin speed do).
- **Checker's scroll on a turned board** slides along the turned rows (not straight across the screen) — a choice; straight-on-screen
  would make the period inexact under the turn.
- **Collision to note:** the ChatGPT pile's T25 `1ca7ffe5` (smooth Checker / Grid / Stripes edges, parked on his question 10) rewrites
  the turned paths of the Checker and Stripes kernels beside the new scroll branches; whoever lands second rebases by hand.

## 9. Owed by the builder

1. First run of the 29 tests at 900 and 380 (`?only=966%20opts3`), set the marked bounds from measurement.
2. Measure and pin `C.SCHEMA_FP` (fp.js) at rev 18, replacing the FP TO PIN marker.
3. Full suite (the sweeps in §4, the #692 crop re-proof for Flicker), prove.sh, then the #545 sheet in §7 before the release that
   ships it.
