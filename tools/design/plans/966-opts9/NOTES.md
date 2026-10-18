# #966 opts9 — a ninth round of more choice on six effects he already has (hunt/966-opts9)

His standing request #966: *"you can polish other effects just giving them more features and making them work a bit better and
have more customisation … more choices always better … this is the complex version we want as much choice as possible"*.

Branch `hunt/966-opts9`, based on 2d250808 (rounds six, seven and eight on the v17.66 code; six and seven measured, eight written but
not yet tested). **Code only, 18 Oct, while a release shipped from the main checkout: nothing was run but `node --check`**
(js/compositor.js, js/fx-registry.js, js/collab-core.js, tests/tests.js — all OK). No browser, no suite, no tools/*.sh, no node or python
running app or test code. Read-only `git`, `grep`, `sed -n` and `awk` over the refs and the docs for the twin check. Rounds six's,
seven's and eight's code, tests and NOTES are untouched.

## 1. Twin check (written before any code)

Picked for what he would SEE on a phone and to spread the categories: a light / sparkle (Glitter), a colour tool (Replace Colour), a
stylize (Speed Lines), a repeat (Trail), a text effect (Letter Spread) and a retro screen (CRT). Every candidate was checked by CONTENT:

| Check | How | Result |
|---|---|---|
| 1. Already in the code? | each effect's EFFECTS row and kernel in this worktree | none of the new keys is on these rows or read by their kernels: Glitter's brightness was always the full `sin³` pulse, its colour always `p.color`, its lattice hash unkeyed; Replace Colour's weight was always `1 − d / window` and it had no view; Speed Lines filled every line with the one Ink and composited it at alpha 1; Trail drew every copy `source-over`, untinted, and had no colour row; Letter Spread's spacing had no time term; CRT had no band of any kind (its `flicker` dims the whole frame) |
| 2. Idle backlog | `tools/design/plans/2026-09-29-idle-backlog/backlog.md` for each type id, label and idea | **nothing planned for these controls.** 2.5 Speed Lines planned (and shipped) Boil, Parallel and Clear zone shape; 13.2 CRT planned (and shipped) Tube curvature, Mask type, Bloom, Flicker; Replace Colour appears only in the adjustment-layer point-op list (line 364); Glitter, Trail and Letter Spread are not in it |
| 3. ChatGPT pile | `/home/ezra/FreeMotion/tools/design/chatgpt-tasks/pile/LAND-LIST.md` and `INVENTORY.md` | **0 hits** for glitter, replacecolor / Replace Colour, speedlines / Speed Lines, linearrepeat / Trail, textspacing / Letter Spread, crt, and for the ideas (roll bar, show selection, rainbow, copy tint). T16's keyed-speed list (Chunk Noise … Scanlines) names none of the six |
| 4. POLISH-LOG / REQUESTS | grep /home/ezra/FreeMotion for the type ids, labels and ideas (roll bar, ink opacity, rainbow with speed lines, trail tint, spread speed / tracking animation, replace colour strength / selection, glitter colour / pattern / twinkle) | history only: Glitter's birth (E1, #1114); Replace Colour's v4.x birth, its hue-only bug fix and its "Needs a setting" tile (#793 sweep); Speed Lines' v4.56 birth and #482 polish 2.5 (v17.19); Trail's queue 123 rebuild, v16.52's 35 % spacing, #482 14.5; Letter Spread's queue 904 / v16.41 "does nothing here" pill; CRT's queue 904 Vignette and #482 13.2. The two "roll bar" hits are macOS scroll bars. **Nothing asked for or planned on these controls** |
| 5. Plans | every `tools/design/plans/*/NOTES.md` in this worktree | none of the six is in any round. **Glitter's Spin was set aside twice** — opts5 and opts6: *"its stars are 14 px, a Spin would not read on a phone"* — so it is NOT built here; Twinkle, Star colour and Pattern instead (a colour and a still / twinkling texture read at any size). opts2 dropped Letter Spread / Text Curve as "the text renderer, risky to keep byte-identical code-only" — taken here because Spread speed touches one number of the text STATE (`st.letterSpacing`), never a painter, and only off its default |
| 6. Unmerged branches | every ref of this repo (660 refs, 496 distinct commits: heads, the `ssh/*` remotes and the pile ref), 83 distinct `js/compositor.js` blobs, read-only `git cat-file`; each of the six rows cut out whole (from its `{ type:` to the next) and searched for `key: 'twinkle'` / `'from'` / `'seed'` / `From the picture` / `Star colour` / `Pattern` (Glitter), `key: 'strength'` / `'amount'` / `'mix'` / `'view'` / `Show selection` / `Strength` (Replace Colour), `key: 'opacity'` / `'inkmode'` / `Rainbow` / `Opacity` / `Line colours` (Speed Lines), `key: 'blend'` / `'tint'` / `color: true` / `Tint` / `Screen` (Trail), `key: 'speed'` / `Spread speed` / `px/s` (Letter Spread), `key: 'roll'` / `Roll bar` / `rollspeed` / `Roll speed` (CRT); and every blob for `p.twinkle`, `p.inkmode`, `p.rollspeed`, `p.roll`, and the five helper names | **no twin: 0 hits on every row** (Glitter's row is in 55 blobs, the others in all 83). CONTROLS (the cut works): the same cut finds Glitter's `Brightness bar` in 55, Replace Colour's `Match width` in 82, Speed Lines' `Clear zone shape` in 76, Trail's `Time offset` in 47, Letter Spread's `Line height` in 81, CRT's `Tube curvature` in 47. `p.roll` (83 blobs) is Scanlines' Roll and `p.twinkle` (82) Starfield's `sf_p.twinkle` — other effects' keys; `p.inkmode`, `p.rollspeed` and the helper names are in no blob. /home/ezra/FreeMotion's own refs were not scanned — nothing may run in that checkout during this ship — but its branches are pushed to the same `ssh` remote these refs mirror |

**Excluded, and why.** The 56 effects of rounds one to eight; the `checker`, `grid` and `stripes` kernels (the parked pile commit T25
`1ca7ffe5`); every WARP_FX effect; everything the pile still carries a fix or a control for (T16's keyed-speed list — VHS, Glow Scan,
Breathe, Chunk Noise, Live Wire, Orbit, Rock Noise, Spin, Noise, Glitch, Dissolve, Clouds, Oil Slick, Bolts, Scramble, Pulse, Swing,
Flicker, Wiggle, Shake, Frame Stutter, Laser Beam, Particles, Radio Waves, Cracked Cells, Flash, Scanlines; T07; T08's glows; T23 the
wipes; T25 Halftone; T26 Border Frame; T27–T35; T36 / T37 Time Warp Scan; T38's grades — Brightness, Contrast, Levels, Gamma, Vibrance,
Saturation, Colour Balance, Exposure, Hue Shift); and these, each considered and dropped:
- **Glitter's Spin** — rejected twice before (above).
- **Text Reverse "letters in each word"** — a twin by stacking: Characters then Words already spells each word backwards in place.
- **CRT Phosphor (green / amber monochrome)** — a twin by stacking: Colourize at Shadow lift 0 after a CRT is luma x the colour.
- **Box Blur's Repeat edges** — the same idea is parked for Directional and Gaussian Blur (T34).
- **Halation's Halo only / Blend** — niche, and its picture is two canvas `filter` blurs a code-only round cannot pin.
- **Emboss, Starfield, Find Edges, Letterbox, Light Leak, Snow & Rain, Pixel Sort, VHS** — each already carries a #482 polish batch of
  four to nine controls, or a reduced-plate path (Emboss) too wide to prove code-only.
- **Fill Silhouette** — a one-slider shorthand row (a params list would change its shape) and its gradient is a Colour Wash twin (opts4).

## 2. What was built — 6 effects, 13 new controls (13 keys, one of them a colour row)

| Effect (type) | Key | Label | Range / choices | Default | What it does |
|---|---|---|---|---|---|
| Glitter (`glitter`) | `twinkle` | Twinkle | 0–100 %, keyframable | 100 | how much each star fades in and out: 0 keeps every star lit, a still glitter texture; Twinkle speed greys out at 0 |
| | `from` | Star colour | Chosen colour (0) / From the picture (1) | Chosen | lights each star in the colour of the pixel it sits on — a gold dress sparkles gold; the Colour row greys out under From the picture (`colorGate` when 0) |
| | `seed` | Pattern | 0–999, keyframable | 0 | lays the stars on another lattice, so two Glitter layers stop sparkling alike |
| Replace Colour (`replacecolor`) | `strength` | Strength | 0–100 %, keyframable | 100 | takes the matched colour only part of the way to the new one — a shirt nudged toward blue rather than dyed |
| | `view` | Show selection | Off (0) / On (1) | Off | paints what the match catches, white = all of the swap, black = none, for setting Tolerance (HSL Bands' Show selection); it shows in the export too, and its note says so |
| Speed Lines (`speedlines`) | `opacity` | Ink opacity | 0–100 %, keyframable | 100 | lets the picture show through the lines — a light touch of speed over a face |
| | `inkmode` | Line colours | Ink (0) / Rainbow (1) | Ink | runs the lines through the colours — round the fan for Radial, across the panel for Parallel; the Ink row greys out under Rainbow (`colorGate` when 0) |
| Trail (`linearrepeat`) | `blend` | Blend | Normal (0) / Add (1) / Screen (2) | Normal | lays each copy on as light, so where copies cross they glow; the layer itself is always drawn normally (Scatter Array's Blend, for the trail) |
| | `tint` | Copy tint | 0–100 %, keyframable | 0 | fades the copies into the Tint colour, a step more each copy — the furthest takes all of it (Time Echo's Tint, for Trail) |
| | `color` | Tint colour | colour row, greyed while Copy tint is 0 (`colorGate` deadAt 0, "0%") | #3dc8ff | the colour the copies fade into |
| Letter Spread (`textspacing`) | `speed` | Spread speed | −50–50 px/s, keyframable, `needs: 'letter'` | 0 | the letters keep spreading apart on their own from the clip's start — the slow tracking-out of a film title; below 0 they close up (never past −20 px); a keyframed speed is integrated |
| CRT (`crt`) | `roll` | Roll bar | 0–1, keyframable | 0 | the soft dark band that rolls up a TV filmed on a camera |
| | `rollspeed` | Roll speed | −2–2 /s, keyframable, greyed while Roll bar is 0 (`liveAbove` 0) | 0.25 | how many screens a second the bar climbs; below 0 it rolls down; integrated when keyframed |

Exact definitions (js/compositor.js; each helper has a suite seam):

- **Twinkle** (inline in `CANVAS_FX.glitter`): br = br₀ at 100 %, else (1 − T) + T x br₀ (T = Twinkle / 100, held to 0..1, NaN 100),
  br₀ the kernel's `sin³`. **Star colour** (inline, `glitterCol966`): the kernel's `col` in the pixel's own colour (`img[o..o+2]`).
  **Pattern** (inline): the cell's key `k` XORed with `Math.imul(Pattern, 0x2c1b3c6d) | 0` (0 for Pattern 0), held to 0..999.
- **Strength / Show selection** (`replaceColour966`, seam `FM._replaceColour966`): the kernel's loop with the weight `(1 − d / window) x
  Strength`; under Show selection the weight painted as a grey (`w x 255`), black for a pixel the match skips; alpha untouched.
- **Ink opacity** (inline): `B.globalAlpha = Ink opacity / 100` before the ink plate's one `drawImage`, only off 100. **Rainbow**
  (`slHue966`, seam `FM._slHue966`): line i of n filled `hsl(360 i / n, 100 %, 55 %)` on the ink plate.
- **Blend / Copy tint** (inline in `CANVAS_FX.linearrepeat`, `trailTint966`, seam `FM._trailTint966`): only off Normal and 0 % a second
  copy loop — the old loop's draws, each inside its own save at 'lighter' / 'screen', each copy first laid on a scratch plate with the
  Tint colour `source-atop` at Copy tint x k / (n − 1) (copy k of n − 1).
- **Spread speed** (`letterSpread966`, seam `FM._letterSpread966`): spacing + speed x the clip's seconds (`info.localT`), or the speed's
  integral over them when keyframed (on the project clock), the speed held to ±50; closing never below −20 (a spacing already below is
  left), growth capped at +4000 px.
- **Roll bar / Roll speed** (`crtRoll966`, `crtRollPhase966`, seams `FM._crtRoll966`, `FM._crtRollPhase966`): a pass after the kernel's
  loop (or crt13): phase = Roll speed x t, or ∫ from 0 when keyframed (held to ±2, NaN / absent 0.25); the band's middle at
  H x (1 − frac(phase)), a raised cosine H / 6 either side, wrapping top to bottom, each row x (1 − 0.7 x Roll bar x ½(1 + cos(π dy /
  (H / 6)))), rows measured at their centres as a share of H.

## 3. Why each default is exact (byte-identical pixels / identical call lists)

- **No `legacy` anywhere, and every `def` IS today's look**, so the render-time fill (queue 784) writing the default into a saved
  project's absent key changes nothing. Each kernel reads its key with a literal fallback equal to `def` — `p.twinkle == null ? 100`,
  `fparam(p, 'from', 0, t)`, `p.seed == null ? 0`, `p.strength==null?100`, `p.view==null?0`, `p.opacity == null ? 100`,
  `p.inkmode == null ? 0`, `fparam(p, 'blend', 0, t)`, `fparam(p, 'tint', 0, t)`, `p.speed == null ? 0`, `p.roll == null ? 0` — which
  is what `FM._fxFillValue` reads (the rows tests check it); Roll speed has no literal (it is only read by `crtRollPhase966`) so the fill
  takes its `def` 0.25, which is also what the helper reads for an absent key — and it is never reached while Roll bar is 0. The colour
  row fills to `defColor` #3dc8ff, read only when Copy tint is above 0.
- **Glitter:** at 100 % `br` is `br0` itself (the old expression, one name later); Chosen colour makes `pc` the old `col`, so every
  colour string is the old string; Pattern 0's key is 0 and `k ^ 0` is `k` (both are int32). A recorder test compares the whole call
  list, gradient stops and all.
- **Replace Colour:** 100 % and Off never reach the helper; the old loop runs. (The helper at Strength 1 multiplies by one — exact — and a
  test holds it to the old loop byte for byte on the whole hue wheel in all three modes.)
- **Speed Lines:** Ink never sets a per-line fillStyle (the one Ink fill stands), and 100 % never sets `globalAlpha` — the recorder test
  holds the call list, and the ink plate is checked pixel for pixel.
- **Trail:** Normal and 0 % never enter the new loop; the old loop runs, call for call (recorder test; and 482 14.5's pinned Trail
  pictures `b14Pinned` cover it through the compositor).
- **Letter Spread:** a speed of 0 (the default, and absent) skips the line; a speed that integrates to 0 hands the spacing back untouched.
- **CRT:** Roll bar 0 (or below, or NaN) never calls the pass, after either loop; Roll speed alone changes nothing (a test holds it).
- **Arity unchanged** for every kernel (crt and replacecolor 5; the canvas kernels' 8 / 10 / 12; textspacing now names its 4th argument
  `info`, which applyTextEffects always passed), so pxToPlate treats each as before — CRT's Cell size is still scaled for it.
- **Not exact by design, off the default only:** Twinkle below 100 % lights stars that were dark; the Rainbow's hsl colours are rounded
  by the canvas; a tinted copy is composited once more on a scratch plate (8-bit premultiplied, so a half-clear copy's colour can move by
  a level).

## 4. The sweeps (reasoned, owed a run)

- **`no effect erases the layer at a single parameter extreme (queue 264)`** — orange 300 x 450 layer over black, 540 x 960, t = 0.5,
  one param at min or max (choices at their last index; colour rows are not swept). **One ALLOWED entry added:
  `'replacecolor:view=max'`** — hslbands:view's twin: the default From is red (hue 0°, a 30° window), this fixture is orange (hue
  35.8°), so nothing is caught and the matte is black on a black ground. The rest keep the layer:
  - Glitter Twinkle 0 / 100, Star colour From the picture, Pattern 0 / 999: stars added to the layer, never taken away.
  - Replace Colour Strength 0 / 100: the orange is outside the window either way — the layer as it is.
  - Speed Lines Ink opacity 0: the picture is drawn, the ink is not; 100 and Rainbow: lines over the picture.
  - Trail Blend Screen, Copy tint 0 / 100: the layer itself is always drawn as it is.
  - Letter Spread: a text effect on a shape does nothing.
  - CRT Roll bar 1 at 0.5 s (phase 0.125, the band's middle at 87.5 % of the height): a band at 30 % brightness at worst, 232 x 0.3 =
    70 against black — visible; Roll speed ±2 at Roll bar 0: nothing.
- **`effects: no effect slider is completely inert`** (PIXEL_FX ranges at five fractions, five moments, three fixtures): Replace Colour
  Strength — the `hues` frame has red at both ends, so 0, 17, 41, 66, 93 % each swap more of it; CRT Roll bar — at t = 0 the band sits
  on the bottom edge and wraps to the top, so each fraction darkens those rows more; CRT Roll speed — its `liveAbove` gate makes the sweep
  set Roll bar to its maximum, and at 0.23 s the five speeds put the band in five places. The canvas and text effects are not swept here.
- **`784: no effect is switched off by a missing param key`** — a bare `{}` fills every new key to its default (identity).
- **`793: every param shows in the inspector what an absent key renders`** — the literals above equal each `def` (twinkle 100, from 0,
  seed 0, strength 100, view 0, opacity 100, inkmode 0, blend 0, tint 0, speed 0, roll 0; rollspeed has no literal, so the def 0.25).
- **`859: every pixel effect draws the same picture on the preview plate as in the export`** — defaults only: unchanged.
- **`482: every effect does something visible at its own defaults`** — unchanged (Replace Colour stays in the "needs a setting" set).
- Also reasoned: 482 13.2's CRT catalogue and pins (`b13Pinned`, the `crt` filter recipe — new keys at defaults, so the old pictures);
  482 14.5's Trail catalogue and pins (`b14Pinned`); 482 2.5's Speed Lines catalogue, pictures and panel tests (Angle still greyed under
  Radial, Clear zone shape still gated); 904's Letter Spread "does nothing here" test (the new row carries `needs: 'letter'`, so on a
  browser that cannot space letters it wears the same pill — the test reads only its three rows); E1's Glitter tests (they set spacing,
  size, threshold and speed only); the phone option-button sweep (Star colour's two short phrases, Off / On, Ink / Rainbow, Normal / Add /
  Screen); CROP_FX: Replace Colour stays a member (Strength and the selection are per-pixel, point ops) — a test runs `FM._cropIdentity`
  with each on; CRT was never a member; adjustment layers: Replace Colour is PIXEL_ADJ, and Show selection there paints the matte over
  what is below, as HSL Bands' does; fx-thumbs: new instances at their defaults draw the old tiles — no buster.

## 5. Busters and schema

- `index.html`: `js/compositor.js?v=230 → 231`, `js/fx-registry.js?v=31 → 32` (the descriptions of CRT, Replace Colour, Trail and
  Letter Spread name the new choices; Glitter's and Speed Lines' live in their `desc` in compositor.js), `js/collab-core.js?v=43 → 44`.
  fx-thumbs (59) and inspector (426) are untouched — the registry derives the rows, `colorGate` (when / deadAt) and `liveAbove` on a
  range are existing gates markOverridden already judges; no label became wrong, so there is no alias.
- `js/collab-core.js`: `C.SCHEMA_REV = 24` with a Rev 24 note. **`C.SCHEMA_FP` is untouched** (round eight's FP TO PIN comment left as it
  is), under a new one-line `/* FP TO PIN (966 opts9) */` comment — the builder measures rev 24 with fp.js; `921 S1 the schema fingerprint
  gate` (and the 63068 fingerprint check) fail until then.

## 6. Tests (tests/tests.js, one block between `// ── 966 opts9 (hunt/966-opts9) ──` and `// ── end 966 opts9 ──`)

All `{ item: '966', budgetMs: 60000 }`, each failing on 2d250808 on its first line by naming the missing control or seam (`_o9Need`).
The block's helpers are its own (`_o9…`, including a recording 2D context with gradients, `_o9Rec`, and Glitter's lattice copied
from the kernel, `_o9Stars`, whose every use carries a CONTROL that the predicted places are lit); it uses only `test`, `sleep` and E1
from the rest of the file. 26 tests:

1. `966 opts9 every new control at its default draws what the effect drew without it — Glitter, Replace Colour, Speed Lines, Trail and CRT through the compositor…` (1:1 and half plate, 0.61 / 1.73 s, grey ground; CONTROL each changes the picture)
2. `966 opts9 Glitter has Twinkle (0–100 %…), Star colour (…) and Pattern (0–999…); Twinkle speed greys out at Twinkle 0 and the Colour row under From the picture…` (a)
3. `966 opts9 Glitter Twinkle: at 0 % every star is lit at every moment and the picture holds still…` (b; 0 / 50 / 100 %, keyed, held)
4. `966 opts9 Glitter Star colour From the picture: every star on the gold half shines gold…` (b; CONTROL white; Colour row ignored)
5. `966 opts9 Glitter Pattern: Pattern 7 lays the stars in other places…` (b; CONTROL Pattern 0's lattice; held)
6. `966 opts9 Glitter at Twinkle 100 %, Chosen colour and Pattern 0 makes the old calls, call for call…` (c; recorder and pixels, five configs; CONTROL each)
7. `966 opts9 Replace Colour has Strength (…) and Show selection (…)…` (a)
8. `966 opts9 Replace Colour Strength: pure red swaps to (0, 132, 255) at 100 % and half way at 50 %…` (b; worked pixels, the straight line, keyed, held; the helper = the old loop in all three modes)
9. `966 opts9 Replace Colour Show selection: what the match catches turns white…` (b; six pixels, Strength-scaled, the whole wheel; CONTROL Off)
10. `966 opts9 Replace Colour at Strength 100 % and Show selection Off draws byte for byte…` (c; eight cases; crop identity with each on; CONTROL)
11. `966 opts9 Speed Lines has Ink opacity (…) and Line colours (Ink or Rainbow…), and its Ink row greys out under Rainbow…` (a)
12. `966 opts9 Speed Lines Ink opacity: where the ink was solid it is 40 % there at Ink opacity 40…` (b; alpha 102, 82 over grey, recorder alphas, keyed, held)
13. `966 opts9 Speed Lines Line colours Rainbow: round the fan every line takes the hue of its own angle…` (b; radial and parallel; CONTROL Ink; Ink ignored)
14. `966 opts9 Speed Lines at Ink opacity 100 % and Ink makes the old calls, call for call…` (c; seven configs; CONTROL)
15. `966 opts9 Trail has Blend (…), Copy tint (…) and a Tint colour (#3dc8ff) greyed while Copy tint is 0…` (a)
16. `966 opts9 Trail Blend: Add and Screen draw every copy as light — never the layer…` (b; recorder ops and depths, 120 / 106 / 60, Behind; CONTROL Normal)
17. `966 opts9 Trail Copy tint: at 90 % blue the three copies of a red block go 30 %, 60 % and 90 % of the way to blue…` (b; shape, alpha, 100 %, keyed, Behind; CONTROL 0 %)
18. `966 opts9 Trail at Normal and Copy tint 0 % makes the old calls, call for call…` (c; six configs; CONTROL)
19. `966 opts9 Letter Spread has Spread speed (−50 to 50 px/s…, needing a browser that can space letters…)…` (a)
20. `966 opts9 Letter Spread Spread speed: at 10 px a second the spacing is 24 + 10 x the clip’s own seconds…` (b; 14 cases at the text effect, the seam, applyTextEffects)
21. `966 opts9 Letter Spread at Spread speed 0 draws byte for byte… and at 10 px a second the line of text grows wider as the clip plays…` (c and b through the compositor; CONTROL no speed keeps its width)
22. `966 opts9 CRT has Roll bar (0–1…) and Roll speed (−2 to 2 /s…, greyed while Roll bar is 0)…` (a)
23. `966 opts9 CRT Roll bar: a soft dark band across the screen, darkest at its middle — 61 of 200 at Roll bar 1, 130 at 0.5 —…` (b; worked rows at 0 / 1 / 2 s, rolling down, keyed, held, half plate 63, over the whole CRT = the seam; CONTROL Amount 0)
24. `966 opts9 CRT at Roll bar 0 draws byte for byte…` (c; nine cases; CONTROL Roll bar and its speed)
25. `966 opts9 the gates in the inspector: Glitter’s Twinkle speed greys out at Twinkle 0…` (the five gates in the panel, each greyed and woken)
26. `966 opts9 the six effects’ editors, new rows and all, fit the inspector…` (phone fit; CONTROL labels Star colour, Show selection, Line colours, Copy tint, Spread speed, Roll bar)

**MEASURE placeholders (generous bounds; the builder measures at 1280 and 380 and tightens):**
- test 4: a gold star's blue and a cyan star's red at its centre under From the picture — bound ≤ 160 each; reasoned about 84 (30 +
  30 x (0.9 glow + 0.9 ray)), up to ~140 where a neighbour's ray crosses.
- test 5: pixels Pattern 7 moves against Pattern 0 at Twinkle 0 — bound ≥ 500; expected thousands (about 16 stars of ~700 px each).
- test 6: pixels From the picture moves on the default settings, the most of four moments — bound ≥ 30; expected hundreds.
- test 13: radial rainbow pixels more than 10° off their angle's hue — bound ≤ 2 %, reasoned 0 (a line is at most 6.8° either side);
  parallel rainbow pixels on their line's hue — bound ≥ 200, expected thousands.
- test 21: the text's width at 10 px a second — bound +20 px at 0.5 s against no speed (expected ~50: about 10 gaps x 5 px) and +50 px
  from 0.5 s to 1.5 s (expected ~100).
- Reasoned floors (not MEASURE, but worth a look): test 1's 50; test 9's 300 lit (reasoned ~1150); test 10's 300 / 1000; test 12's 500
  solid ink pixels; test 13's 500 / 500; test 14's 500 / 500; test 18's 100 / 100; test 24's 500 / 500. Worked values with a ±1 / ±1.5 /
  ±2 tolerance: tests 8, 9, 12 (82 ±2), 16, 17 (±2), 23; test 23's keyed Roll speed is allowed ±1 for the integral's float.

**Shared test edited: one entry in queue 264** (`no effect erases the layer at a single parameter extreme (queue 264)`):
`'replacecolor:view=max': 1` with its reason (above). On 2d250808 it is never reached (Replace Colour has no `view`), so prove.sh will
read that test DEAD — the right reading for an ALLOWED entry, as round seven's was. Searched tests.js for each type id — `'glitter'`
(E1's kernel test, the half-size test, the NEW-row lists), `'replacecolor'` (the KNOWN_NOOP lists, the adjustment point-op list),
`'speedlines'` (482 2.5's catalogue, pictures and panel tests), `'linearrepeat'` (queue 123, v16.52's spacing, 986's C27, 482 14.5's
catalogue and pins), `'textspacing'` (the text-state tests, 904's pill test, opts4's tests), `'crt'` (the px-param list, the filter
list, 482 13.2's catalogue, pins and recipe) — every one reads its own keys or the defaults.

## 7. #545 before/after sheet (owed — for him to pick or veto)

Render through the app (`FM.renderScene` in a tests/ probe), at phone size (≈ 380 px wide frame), each option at 2–4 values beside
today's default, on a fixture where it clearly shows:
- **Glitter** on a sequinned or gold-and-blue photo (Star size 20): Twinkle 100 (today) / 40 / 0 (a 4-frame strip each); Star colour
  Chosen white (today) / From the picture; Pattern 0 (today) / 7 side by side.
- **Replace Colour** on a red car or a red shirt, To blue: Strength 100 (today) / 60 / 30; Show selection On at Tolerance 0.25 and 0.5.
- **Speed Lines** on a face: Ink opacity 100 (today) / 50 / 25; Line colours Rainbow, Radial and Parallel; Rainbow with Blend Add over a
  dark frame.
- **Trail** on a title sliding across black (Spacing 35, 6 copies): Blend Normal (today) / Add / Screen; Copy tint 0 (today) / 60 / 100
  in cyan and in magenta.
- **Letter Spread** on "FREE MOTION": a 4-frame strip over 2 s at Spread speed 0 (today) / 10 / 25, and −8 (closing up).
- **CRT** on a photo: Roll bar 0 (today) / 0.4 / 0.8, a 4-frame strip at Roll speed 0.25 and −0.5.
Names to put to him (#954 / "options, recommended next to the best"): Twinkle, Star colour (Chosen colour / From the picture), Pattern,
Strength, Show selection, Ink opacity, Line colours (Ink / Rainbow), Blend (Add / Screen), Copy tint, Tint colour, Spread speed, Roll
bar, Roll speed.

## 8. Risks and what is unsure

- **Nothing was run.** Every claim in the tests is reasoned; the first run may move a marked bound or expose a slip in a worked pixel
  (each is worked in the test's comment, so a red can be checked quickly).
- **Two new rows start greyed on a freshly added effect, honestly:** Trail's **Tint colour** (deadAt Copy tint 0 — there is no tint to
  colour; the Copy tint note says the row wakes above 0) and CRT's **Roll speed** (liveAbove Roll bar 0 — there is no bar to move; its
  note says it needs a Roll bar above 0). Each default had to be today's look, so neither controller can start on. If he wants them live
  from the start, that is a `sets` on the controller (moving Copy tint or Roll bar does nothing more), not a default.
- **Glitter's Twinkle speed (an OLD row) gained a gate**: it greys out at Twinkle 0, and is live at the default 100 — only its panel
  state changes, never a picture.
- **Glitter's Star colour samples the one pixel under each star's centre** (the kernel already reads it for the brightness bar), so on a
  busy photo neighbouring stars take different colours — the point; on a white highlight it is white, the same as the default.
- **Glitter's Twinkle 0** keeps every star at full size and brightness — a still texture. The stars on the bar's edge stay where the
  picture is bright enough, as before.
- **The roll bar's shape is fixed**: a raised cosine a third of the screen tall, its middle at 1 − 0.7 x Roll bar (30 % at 1). Its
  height or softness would be the next control. It does not scale with Amount (as Flicker does not).
- **Speed Lines' Rainbow** is fixed at full saturation and 55 % lightness; with Blend Add over a white picture the lines vanish (they are
  light) — the same as a white Ink under Add.
- **Show selection shows in the export too** (its note says so, HSL Bands' wording); on an adjustment layer it paints the matte over
  everything below, as HSL Bands' does.
- **Letter Spread's Spread speed resizes the text layer as it plays** (layerSize reruns applyTextEffects), exactly as keyframed spacing
  does — the selection box grows with it. The test's width bounds assume the text is not wrapped by a fixed box (MEASURE).
- **Trail's Copy tint goes through a scratch plate per copy** (one canvas, reused and drawn at once); for timed copies (Time offset) the
  pooled plate is copied before tinting, never tinted in place.
- **Trail's colour row is new to Trail** (it had none): anything that lists Trail's rows by count sees one more (no test does).
- The descriptions grew a clause each; no test pins their text (searched).

## 9. Owed by the builder

1. First run of the 26 tests at 1280 and 380 (`?only=966%20opts9`), set the MEASURE bounds from measurement, and run the edited queue
   264 sweep (`?only=no%20effect%20erases`).
2. Measure and pin `C.SCHEMA_FP` (fp.js) at rev 24 — round eight's rev 23 was never pinned either, so one measurement on the assembled
   tree covers both — replacing both FP TO PIN comments.
3. Full suite (the sweeps in §4, 482 13.2's CRT pins, 482 14.5's Trail pins, 482 2.5's Speed Lines tests, 904's Letter Spread pill, E1's
   Glitter tests), prove.sh (the 264 edit reads DEAD there, by design), then the #545 sheet in §7 before the release that ships it.
