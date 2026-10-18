# #966 opts7 — a seventh round of more choice on seven effects he already has (hunt/966-opts7)

His standing request #966: *"you can polish other effects just giving them more features and making them work a bit better and
have more customisation … more choices always better … this is the complex version we want as much choice as possible"*.

Branch `hunt/966-opts7`, based on 73551c15 (round six, written but not yet tested, on the v17.66 assembly). **Code only, 18 Oct, while
a release shipped from the main checkout: nothing was run but `node --check`** (js/compositor.js, js/fx-registry.js,
js/collab-core.js, tests/tests.js — all OK). No browser, no suite, no tools/*.sh, no node or python running app or test code.
Read-only `git` and `grep` / `awk` over the refs for the twin check. Round six's code, tests and NOTES are untouched.

## 1. Twin check (written before any code)

Picked for what he would SEE on a phone and to spread the categories: two drawing effects (Topo Lines, Crosshatch), a text effect
(Timecode), a light / shadow (Lamp Shadow), a distortion that is not a WARP_FX (Lens Distortion), a transition (Dispersion) and a
colour effect (Hue Ramp). Every candidate was checked by CONTENT:

| Check | How | Result |
|---|---|---|
| 1. Already in the code? | each effect's EFFECTS row and kernel in this worktree | none of the new keys is on these rows or read by their kernels: Topo Lines banded with no time term and traced every line at one weight; Crosshatch only wrote ink over the picture; Timecode read the clip clock at 1× and always `tpad`ded the first field; Lamp Shadow's fade was the welded `1 − (n − 1)/taps` and it never wrote a layer pixel; Lens Distortion's centre was `W / 2, H / 2`; Dispersion had one `cellN` hash and one `ux, uy`; Hue Ramp only `(1 − L) × span` |
| 2. Idle backlog | `tools/design/plans/2026-09-29-idle-backlog/backlog.md` for each type id and label | **nothing planned for these controls.** Timecode appears only as 12.4's shipped HH:MM:SS:FF / Frames / MM:SS / Decimals; spectralmap only in the adjustment-layer point-op list |
| 3. ChatGPT pile | `/home/ezra/FreeMotion/tools/design/chatgpt-tasks/pile/LAND-LIST.md` and `INVENTORY.md` | **0 hits** for contourlines / Topo Lines, crosshatch, radialshadow / Lamp Shadow / Radial Shadow, lensdistort / Lens Distortion, dispersion, spectralmap / Hue Ramp. "timecode" appears only as T07's `d4461144` (Backdrop Clone's timecode FOOTPRINT, a different kernel). LAND-LIST's "threshold" hits are T08's glow family |
| 4. POLISH-LOG / REQUESTS | grep /home/ezra/FreeMotion for the type ids and labels, and for the ideas (flow / index / bold, paper, speed / time-lapse / leading zero, fade / shadow only / soft, centre, seed / pattern / scatter, reverse) next to them | history only: Topo Lines' queue 904 colours (v16.49); Crosshatch's #890 / #902 plate fixes; Lamp Shadow's #1068 B5 Quality and Opacity (and its 264 / 482 sweep notes); Lens Distortion's and Dispersion's #482 range raises; Timecode's #482 12.4 formats. **Nothing asked for or planned on these controls** (the two POLISH "timecode … speed" hits are the transport's play-speed chip and a thumbnail badge) |
| 5. Plans | every `tools/design/plans/*/NOTES.md` in this worktree (966-opts … opts6 and the B-numbered / pile items) | none of the seven is in any round. **"Crosshatch on paper" was left for a later round twice** — opts4 ("the same idea as Sketch's Paper, kept to one this round") and opts6 ("a third Paper row in three rounds — a later round") — so it is taken here, with no Paper row in round six before it. Hue Ramp is named in opts5 only as the reason Topo Bands got no Rainbow palette. No plan has an open question to him on these controls (Lens Magnifier's "a little bulge at the rim?", Circle Array's "an Arc?" and Odometer's four questions are his calls — not built here) |
| 6. Unmerged branches | every ref of this repo (652: heads and the `ssh/*` remotes), 81 distinct `js/compositor.js` blobs, read-only `git cat-file`; each of the seven rows cut out whole (from its `{ type:` to the next) and searched for `key: 'flow'` / `'index'` / `'speed'` / `'bold'` (Topo Lines), `key: 'paper'` / `color2` / `Paper` (Crosshatch), `key: 'speed'` / `'lead'` / `'rate'` / `Leading` (Timecode), `key: 'fade'` / `'shadowonly'` / `'soft'` / `Shadow only` (Lamp Shadow), `key: 'centerx'` / `'centery'` / `'x'` / `Centre` (Lens Distortion), `key: 'seed'` / `'scatter'` / `'spread'` / `Pattern` / `Scatter` (Dispersion), `key: 'reverse'` / `Reverse` (Hue Ramp); and every blob for `p.lead` and `p.scatter` anywhere | **no twin: 0 of 81 blobs on every row**; `p.lead` and `p.scatter` appear in no blob. (`p.flow`, `p.index`, `p.paper`, `p.shadowonly` and `p.reverse` are other effects' keys — Topo Bands, Topo Lines' own Draws, Drop Shadow, Gradient Map.) /home/ezra/FreeMotion's own refs were not scanned — nothing may run in that checkout during this ship — but its branches are pushed to the same `ssh` remote these refs mirror |

**Excluded, and why.** The 42 effects of rounds one to six; the `checker`, `grid` and `stripes` kernels (the parked pile commit T25
`1ca7ffe5`); every WARP_FX effect (each has a GLSL twin a code-only round cannot prove — so not Bend, Glass, Polar Coordinates,
Centre Squeeze, Tile Grid, Ring Array, Mirror Tile); everything pile T16 still carries a fix for (opts6's list); **Raised Edge**
(pile T15's merge keeps a ps-aware `smoothbevel` — opts5's reason, and T07's `f3455117` touches its depth); **Glow** (a CSS composite
with a GPU path); **Fill Silhouette's gradient** (a Colour Wash twin, opts4); **Oil Paint, Venetian Blinds, Cartoon** (pile hits and
their own plans); **Lens Magnifier's bulge or glare, Circle Array's arc, Odometer's easing** (open questions to him in their plans);
**Page Curl's back colour** (the back is drawn by the 3D mesh renderer, which a code-only round cannot prove); **Hue Ramp's Flow /
cycle speed** (Hue Ramp under Colour Cycle already does it — a twin by stacking; Reverse instead, which no offset can give);
**Poster Shadow's fade** (its Edges default is still waiting on his #545 look); **Light Streaks** (T07's `1e36d1d9`, applied by hand
in v17.23, is on the same line).

## 2. What was built — 7 effects, 13 new controls (13 keys, one of them a colour row)

| Effect (type) | Key | Label | Range / choices | Default | What it does |
|---|---|---|---|---|---|
| Topo Lines (`contourlines`) | `flow` | Flow speed | −10–10 /s, keyframable | 0 | the contour lines keep moving through the tones, + from the darks toward the lights; integrated when keyframed — the animated topographic map (Topo Bands' Flow speed, round five, for its lines) |
| | `index` | Bold every | 0–12, keyframable | 0 | every that-many-th line (counted from the darks) one Line weight heavier — the index lines of a real map; with Flow the bold ones travel with the lines |
| Crosshatch (`crosshatch`) | `paper` | Paper | 0–100 %, keyframable | 0 | the picture between the strokes taken that far toward the Paper colour — 100 % is pen and ink on a clean sheet; the strokes are the same strokes |
| | `color2` | Paper colour | colour row, greyed while Paper is 0 (`color2Gate` deadAt 0) | #ffffff | cream for an old sketchbook, black with white ink for a scraperboard |
| Timecode (`timecode`) | `speed` | Clock speed | 0–600 ×, keyframable | 1 | the time-lapse clock: 60 runs a minute a second, 0 stops it; before Start at and Counts (a countdown runs down at that speed); a keyframed speed integrated on the project's clock over the clip's (or the timeline's) seconds |
| | `lead` | Leading zero | Keep (0) / Drop (1), live in the padded formats (`liveWhen` [0, 1, 2, 4, 6]) | Keep | Drop writes 0:05 for 00:05, 0:00:12 for 00:00:12 — the first number only |
| Lamp Shadow (`radialshadow`) | `fade` | Fade | 0–100 %, keyframable | 100 | how much the shadow fades as it falls away: 100 % the old fade, 0 % solid to its end |
| | `shadowonly` | Shadow only | Off (0) / On (1) | Off | hides the layer and keeps its shadow, the layer's own footprint shadowed too (After Effects' Radial Shadow has a Shadow Only) |
| Lens Distortion (`lensdistort`) | `centerx` | Centre X | 0–100 %, keyframable | 50 | the middle of the lens across the frame — a bulge off to one side, one corner of a wide shot straightened (After Effects' Optics Compensation has a View Center) |
| | `centery` | Centre Y | 0–100 %, keyframable | 50 | …and down it |
| Dispersion (`dispersion`) | `seed` | Pattern | 0–999, keyframable | 0 | another noise front: two dispersing layers stop tearing alike |
| | `scatter` | Scatter | 0–100 %, keyframable | 0 | each piece flies off its own way, up to that far either side of Direction (100 % every way) — a shatter rather than a gust; the tear itself is unchanged |
| Hue Ramp (`spectralmap`) | `reverse` | Reverse | Off (0) / On (1) | Off | the spectrum the other way round: the darks take the lights' hue and the lights the darks' (a mirror of the wheel, which no Hue offset can give) |

Exact definitions (js/compositor.js; each helper has a suite seam):

- **Flow speed / Bold every** (`topoLines966`, seam `FM._topoLines966`): s = `topoShift966(flow, t, N or 1)` (Topo Bands' shift —
  speed × t, or its integral from 0 when keyframed, held to ±10 /s — taken round into Bold every's N bands, or one band). With
  s = si + sf, a pixel's band is the kernel's floor of luma × L / 255, held in 0..L−1, when sf = 0, else floor(luma × L / 255 − sf);
  less si. A line is the kernel's test (band ≠ the right or lower neighbour's); it is BOLD where a boundary k in (lo, hi] has
  k ≡ 0 (mod N). Thickening: plain lines a square of half-side Line weight − 1 (the kernel's dilation), bold ones Line weight.
- **Paper** (`crosshatch966`, seam `FM._crosshatch966`): both kernel loops to the operator; the base is r + (paper − r) × pp, then a
  stroke is ink (export) or the base mixed toward ink by the covered share (reduced plate). A pixel above every tier is base alone.
- **Clock speed** (`timecodeClock966`, seam `FM._timecodeClock966`): lt → speed × lt (speed held to 0..600, NaN runs at 1), or
  `FM.integrateProp(speed, t − lt, t)` when keyframed. **Leading zero** (inline): Drop strips one `^0(?=\d)` off the finished text.
- **Fade / Shadow only** (`lampShadow966`, seam `FM._lampShadow966`): the kernel's loop over the same box and taps; hit =
  a × (1 − fade × (n − 1) / taps); with Shadow only the layer's own pixels are walked too — shadow where a tap lands back on the layer,
  cleared where none does. Shadow only is read before the Reach-0 and Opacity-0 early returns, so Reach 0 is the black silhouette and
  Opacity 0 leaves nothing.
- **Centre X / Y** (inline): cx = W / 2 at 50, else round(W × X / 50) / 2 (held to 0..100, a half plate pixel); maxR is
  `Math.hypot(W / 2, H / 2)` whatever the centre.
- **Pattern / Scatter** (`dispersion966`, seams `FM._dispersion966`, `FM._dispersionCell966`): keys from `Math.imul`; the tear's cell
  hash is the kernel's with key 1 XORed in before the mix (Pattern 0's key is 0); Scatter reads a second hash (multiplier 668265263,
  key 2) eased across the cells like the tear, and turns each piece by (m − 0.5) × 2 × Scatter × 180°.
- **Reverse** (inline): H = L × span instead of (1 − L) × span.

## 3. Why each default is exact (byte-identical pixels / character-identical strings)

- **No `legacy` anywhere, and every `def` IS today's look**, so the render-time fill (queue 784) writing the default into a saved
  project's absent key changes nothing. Each kernel reads its key with a literal fallback equal to `def` — `p.flow==null?0`,
  `p.index==null?0`, `p.paper==null?0`, `p.speed == null ? 1`, `p.lead == null ? 0`, `fparam(p, 'fade', 100, t)`,
  `p.shadowonly==null?0`, `p.centerx == null ? 50`, `p.centery == null ? 50`, `p.seed == null ? 0`, `p.scatter == null ? 0`,
  `p.reverse==null?0` — which is what `FM._fxFillValue` reads (the rows tests also check `FM._fxFillValue` itself). The colour row
  fills to `defColor2` '#ffffff'.
- **Topo Lines:** `clO7` (Flow off a whole band, or Bold every > 0) alone reaches topoLines966; otherwise the old banding, trace and
  thickening run, the thickening's guard now `clTh>1&&!clO7` (true exactly when it was before). A whole band of flow (2 /s at 0.5 s)
  is shift 0 — the old loops (a test holds it).
- **Crosshatch:** Paper 0 (or below, or NaN) runs both old loops untouched.
- **Timecode:** speed 1 skips the line; Keep (0) skips the replace. A test compares 1050 strings against a copy of the old kernel.
- **Lamp Shadow:** Fade 100 % (or above, or NaN) with Off runs the old loop; the two early returns gained `&&!rsOnly`, false when Off.
- **Lens Distortion:** `lcx === 50` gives `W / 2` itself (no arithmetic), and `Math.hypot(W / 2, H / 2)` is the old
  `Math.hypot(cx, cy)` at the old centre.
- **Dispersion:** Pattern 0 and Scatter 0 run the old loop; at Pattern 0 the helper's hash is the old one anyway (`x ^ 0` is x — a
  test holds 441 cells).
- **Hue Ramp:** Off keeps the expression `(1-smL)*smSpan`, operation for operation.
- **Arity unchanged** for every kernel (contourlines, lensdistort, spectralmap, radialshadow 5; crosshatch, dispersion 6; timecode's
  four), so pxToPlate treats each as before — Topo Lines' Line weight is still scaled for it, Crosshatch and Dispersion still scale
  themselves.
- **Not exact by design, off the default only:** a moved lens centre is snapped to a half plate pixel; Paper on a reduced plate mixes
  the covered share over the paper (rounded by the byte, as the old mix is).

## 4. The sweeps (reasoned, owed a run)

- **`no effect erases the layer at a single parameter extreme (queue 264)`** — orange 300 x 450 layer over black, 540 x 960, t = 0.5,
  one param at min or max (choices at their last index). **One ALLOWED entry added: `'radialshadow:shadowonly=max'`** —
  dropshadow:shadowonly's twin: the default light (50 %, 35 %) is inside this convex layer, so every footprint pixel's first tap lands
  back on it and the whole silhouette is black shadow on a black ground. The rest keep the layer:
  - Topo Lines Flow ±10 at 0.5 s is ±5 bands, a whole number: the old map; Bold every 12 at 8 levels bolds nothing.
  - Crosshatch Paper 100: #e8a33d is brightness 0.675, under the first tier only, so a seventh of it is ink and the rest white paper.
  - Timecode is a text effect: on this shape it does nothing.
  - Lamp Shadow Fade 0 / 100: the layer is never written.
  - Lens Distortion Centre 0 / 100 (X or Y): the middle of the layer samples within it (in project px, at X 0 the pixel (270, 480)
    reads about column 236; at Y 0, about row 447 — both inside the layer's 120..420 x 255..705) — mostly visible.
  - Dispersion Pattern 999 / Scatter 100 at the default Progress 0.45: the same share of the layer torn as at Pattern 0 (Scatter never
    moves the tear).
  - Hue Ramp Reverse: hue 175 at three quarters' brightness — visible.
- **`effects: no effect slider is completely inert`** (PIXEL_FX ranges at five fractions, five moments, three fixtures, the kernel at
  ps 1 with no layer): Flow speed (still at t = 0, alive at 0.23 s: −2.3, −1.5, −0.4, 0.7, 2.0 bands, five line positions); Bold every
  (0, 2, 5, 8, 11 — 0 → 2 → 5 → 8 all differ at 8 levels); Paper (the picture between the strokes moves); Fade (the subject's shadow
  rim beyond the first tap); Centre X / Y (the k1 0.18 default bends about another point); Pattern; Scatter (debris mid-tear moves).
  Clock speed is TEXT_FX, not swept here.
- **`784: no effect is switched off by a missing param key`** — a bare `{}` fills every new key to its default (identity).
- **`793: every param shows in the inspector what an absent key renders`** — the literals above equal each `def` (flow 0, index 0,
  paper 0, speed 1, lead 0, fade 100, shadowonly 0, centerx 50, centery 50, seed 0, scatter 0, reverse 0); the colour is not compared.
- **`859: every pixel effect draws the same picture on the preview plate as in the export`** — defaults only: unchanged.
- **`482: every effect does something visible at its own defaults`** — unchanged.
- Also reasoned: the ruler notches (#635: Clock speed's 6000 steps get a quantum that is a whole multiple of 0.1; Pattern's 999 is the
  existing Pattern rows'); every default inside its range; the phone option-button sweep (Keep / Drop, Off / On — short); CROP_FX:
  Topo Lines and Hue Ramp stay members (tone and time only — two tests run `FM._cropIdentity` with the new controls on); Lens
  Distortion, Dispersion, Crosshatch and Lamp Shadow were never members; Lamp Shadow stays BOUNDED_FX and a test holds the bounded run
  == the full plate's with Shadow only on; adjustment layers (Hue Ramp is PIXEL_ADJ; Reverse is a point op, so no `adjNeedsFrame`);
  the 1068 B5 Lamp Shadow test (its kernel calls carry no fade / shadowonly, so they take the old path); 482 12.4's Timecode pins (new
  keys absent, filled or present all write the old text); fx-thumbs (new instances at their defaults — no buster).

## 5. Busters and schema

- `index.html`: `js/compositor.js?v=228 → 229`, `js/fx-registry.js?v=29 → 30` (the descriptions of Topo Lines, Crosshatch, Timecode,
  Lamp Shadow and Hue Ramp name the new choices; Lens Distortion's and Dispersion's live in their `desc` in compositor.js),
  `js/collab-core.js?v=41 → 42`. fx-thumbs (59) and inspector (426) are untouched — the registry derives the rows (`color2Gate`,
  `liveWhen` on a segment and the new rows all pass through `paramsOf`), and no label became wrong, so there is no alias.
- `js/collab-core.js`: `C.SCHEMA_REV = 22` with a Rev 22 note. **`C.SCHEMA_FP` is still rev 20's number** (round six's FP TO PIN
  comment left as it is), under a new one-line `/* FP TO PIN (966 opts7) */` comment — the builder measures rev 22 with fp.js;
  `921 S1 the schema fingerprint gate` fails until then.

## 6. Tests (tests/tests.js, one block between `// ── 966 opts7 (hunt/966-opts7) ──` and `// ── end 966 opts7 ──`)

All `{ item: '966', budgetMs: 60000 }`, each failing on 73551c15 on its first line by naming the missing control or seam (`_o7Need`).
The block's helpers are its own (`_o7…`); it uses only `test`, `sleep` and E1 from the rest of the file. 28 tests:

1. `966 opts7 every new control at its default draws what the effect drew without it — Topo Lines, Crosshatch, Lamp Shadow, Lens Distortion, Dispersion and Hue Ramp through the compositor…` (1:1 and half plate, 0.61 / 1.73 s, grey ground; CONTROL each changes the picture)
2. `966 opts7 Timecode at Clock speed 1 and Leading zero Keep draws through the compositor what it drew without them…` (text layer; CONTROL 2×)
3. `966 opts7 Topo Lines has Flow speed (−10–10 /s) and Bold every (0–12)…` (a; fill value, clamps, px keys)
4. `966 opts7 Topo Lines Flow speed: on a grey ramp at 8 levels the lines at 31, 63 … 223 move a quarter band…` (b; six exact line sets, a whole band byte-identical)
5. `966 opts7 Topo Lines Bold every: …Bold every 2 draws 63, 127 and 191 three columns wide…` (b; Bold 5, weight 2, with Flow at 0.5 / 1.5 / 2.5 s, the hold at 24 levels)
6. `966 opts7 Topo Lines at Flow 0 and Bold every 0 draws byte for byte…` (c; six cases; crop identity with both on; CONTROL)
7. `966 opts7 Crosshatch has Paper (0–100 %…) and a Paper colour (white) greyed while Paper is 0…` (a)
8. `966 opts7 Crosshatch Paper: a light flat no stroke reaches turns wholly to the paper…` (b; exact white / cream / (238, 228, 218); same ink pixels; the half-plate share map 40→255, 34→195, 28→136, 22→76, 16→16)
9. `966 opts7 Crosshatch at Paper 0 draws byte for byte…` (c; incl. 0.5 and 0.28 plates; CONTROL)
10. `966 opts7 Timecode has Clock speed (0–600 ×…) and Leading zero (Keep or Drop…)` (a; the gate)
11. `966 opts7 Timecode Clock speed: at 2× 12.5 s reads 00:25:00…` (b; 12 exact strings incl. keyed, stopped, clip clock; the seam)
12. `966 opts7 Timecode Leading zero Drop writes 0:12:15…` (b; 12 formats × Keep / Drop)
13. `966 opts7 Timecode at Clock speed 1 and Keep writes character for character what it wrote before…` (c; 1050 strings against a copy of the old kernel; CONTROL)
14. `966 opts7 Lamp Shadow has Fade (0–100 %…) and Shadow only (Off or On…)` (a)
15. `966 opts7 Lamp Shadow Fade: at 0 %, 50 % and 100 % the kernel is the old kernel with its fade made that number…` (b; 1068 B5's fixture and copy; solid at 0; keyed; held)
16. `966 opts7 Lamp Shadow Shadow only: off the caster the picture is the plain shadow byte for byte…` (b; lit top row cleared, (32, 31) = (0, 0, 0, 200); Reach 0 silhouette; Opacity 0 nothing; bounded == full)
17. `966 opts7 Lamp Shadow at Fade 100 % and Shadow only Off draws byte for byte…` (c; CONTROL)
18. `966 opts7 Lens Distortion has Centre X and Centre Y (0–100 %…)` (a)
19. `966 opts7 Lens Distortion Centre: a lens centred at 35 % of a 160 px frame draws exactly what the middle lens draws on the picture slid 24 columns right…` (b; three lens settings; CONTROL; held)
20. `966 opts7 Lens Distortion at Centre 50 / 50 draws byte for byte…` (c; CONTROL each axis)
21. `966 opts7 Dispersion has Pattern (0–999) and Scatter (0–100 %)…` (a; px keys)
22. `966 opts7 Dispersion Pattern: the cell noise at Pattern 0 is the kernel’s own hash…` (b; 441 cells; the tear predicted byte for byte from the seam's noise, CONTROL at Pattern 0)
23. `966 opts7 Dispersion Scatter: sideways at Scatter 0 every piece keeps its own row…` (b; the alpha byte-identical; held)
24. `966 opts7 Dispersion at Pattern 0 and Scatter 0 draws byte for byte…` (c; CONTROL)
25. `966 opts7 Hue Ramp has Reverse (Off or On…)` (a)
26. `966 opts7 Hue Ramp Reverse: the darkest grey turns red at a quarter brightness (64, 0, 0)…` (b; the green / blue mirror over the whole wheel; not a 180° offset)
27. `966 opts7 Hue Ramp at Reverse Off draws byte for byte…` (c; crop identity reversed; CONTROL)
28. `966 opts7 the seven effects’ editors, new rows and all, fit the inspector…` (phone fit; CONTROL labels Bold every, Paper colour, Clock speed, Shadow only, Centre X, Scatter, Reverse)

**MEASURE placeholders (generous bounds; the builder measures at 1280 and 380 and tightens):**
- test 6: pixels Flow 3 /s at 0.5 s moves, and Bold every 2 moves, on the busy 96 x 72 — bound ≥ 100 each, expected several hundred.
- test 17: pixels Fade 0 % moves on a long shadow (Reach 90 from (20 %, 80 %)) — bound ≥ 50, expected hundreds.
- test 19: pixels where the lens at 35 % and the middle lens on the slid picture part — bound ≤ 0.5 %, expected 0.
- test 22: pixels gone at Pattern 7 against Pattern 0 (Grain 8) — bound ±50 %, expected within a few tens of %.
- test 23: mid-tear pixels drawn from another row at Scatter 100 — bound ≥ 50, expected hundreds.
- test 24: pixels Scatter 100 moves on the busy picture — bound ≥ 200, expected hundreds.
- Reasoned floors (not MEASURE, but worth a look): test 1's 50; test 2's 20; test 9's, 20's, 27's 1000; test 17's 1000 (Shadow only on
  a 2000 px block); test 24's 500 (Pattern); test 19's 30 % CONTROL; test 22's 200 gone and 500 moved; test 23's 200 debris; test 26's
  100 / 100; test 13's 100 / 100.

**Shared test edited: one entry in queue 264** (`no effect erases the layer at a single parameter extreme (queue 264)`):
`'radialshadow:shadowonly=max': 1` with its reason (above). On 73551c15 it is never reached (there is no `shadowonly` on Lamp Shadow),
so prove.sh will read that test DEAD — the right reading for an ALLOWED entry, as for a rename. Searched tests.js for each type id —
`'contourlines'` (its queue-904 legacy-keys row, the paper test, #484's renamed labels), `'crosshatch'` (its legacy-keys row and angle
test), `'timecode'` (482 12.4's catalogue and pins, 62472's Backdrop Clone, 86727), `'radialshadow'` (1068 B5, #484), `'lensdistort'`
and `'dispersion'` (the #482 range-raise list, the NEW-row order), `'spectralmap'` (#484, the adjustment point-op list) — every one
reads its own keys or the defaults.

## 7. #545 before/after sheet (owed — for him to pick or veto)

Render through the app (`FM.renderScene` in a tests/ probe), at phone size (≈ 380 px wide frame), each option at 2–4 values beside
today's default, on a fixture where it clearly shows:
- **Topo Lines** on a portrait or a landscape photo (Smooth first 3, Lines only): a 4-frame strip over one second at Flow 0 (today) /
  1 / 3 /s; Bold every 0 (today) / 4 / 5 at 12 levels.
- **Crosshatch** on a face: Paper 0 (today) / 50 / 100 % white; 100 % cream (#f4ecd8); 100 % black paper with white ink.
- **Timecode** as a caption: 2× / 60× / 600× strips (four frames each); Leading zero Keep (today) vs Drop in MM:SS:FF, HH:MM:SS, MM:SS.
- **Lamp Shadow** on a logo over a light ground, light at (80 %, 85 %): Fade 100 (today) / 50 / 0 %; Shadow only Off (today) / On.
- **Lens Distortion** on a grid or a city shot, Barrel 0.6: Centre (50, 50) (today) / (25, 50) / (75, 25) / (50, 90).
- **Dispersion** on a title, Progress 0.5: Pattern 0 (today) / 7 / 300; Scatter 0 (today) / 40 / 100 % (a 4-frame strip of Progress
  0.3 → 0.9 for each — the scatter reads in motion).
- **Hue Ramp** on a photo: Reverse Off (today) / On, at span 260 and 360.
Names to put to him (#954 / "options, recommended next to the best"): Flow speed, Bold every, Paper, Paper colour, Clock speed, Leading
zero (Keep / Drop), Fade, Shadow only, Centre X / Y, Pattern, Scatter, Reverse.

## 8. Risks and what is unsure

- **Nothing was run.** Every claim in the tests is reasoned; the first run may move a marked bound or expose a slip in a worked pixel
  or string (each is worked in the test's comment, so a red can be checked quickly).
- **Bold every is one weight heavier in PLATE px** (radius + 1): on the phone's 0.28 preview a 1 px line is already 3.6 project px
  (an existing trade, #691), and its bold line is 3 plate px — about 10.7 project px against the export's 3. The ratio of bold to plain
  is the same on both; the absolute widths differ as the plain ones already do. A ps-aware bold weight would need the kernel's arity
  changed, which would stop pxToPlate scaling Line weight — not done.
- **Shadow only at Opacity 0 is empty and at Reach 0 is the silhouette** (Shadow only is read before those two early returns); with it
  Off both still return early as before. The layer's own lit pixels are cleared to (0, 0, 0, 0), colour and all.
- **Lens Distortion's centre snaps to a half plate pixel** (so a lens at no strength lands each pixel on itself); on the phone plate that
  is ±0.9 project px. The strength stays measured against the frame's half-diagonal — so a lens in a corner bends its far side harder
  than its near one, as a real off-axis lens does. Zoom is about the moved centre.
- **Dispersion's Scatter field is smooth** (eased across the grain cells like the tear), so neighbouring pieces fly similar ways — a
  swirl, not confetti; at 100 % some fly backward against Direction. The two Pattern keys come from `Math.imul` constants (a seam
  exposes the cell noise).
- **Timecode's Clock speed integrates keyframes on the project's clock** (where they are stored) over the clock's own seconds; Leading
  zero only ever strips a single zero, so 00:00:05 in HH:MM:SS reads 0:00:05, not 5.
- **Crosshatch's Paper** is a slider with a separate colour (rather than a Picture / Paper choice), so it can fade the picture half
  way — the paper colour row greys at 0 %. If he wants it simpler that is one row.
- The descriptions grew a clause each; no test pins their text.

## 9. Owed by the builder

1. First run of the 28 tests at 1280 and 380 (`?only=966%20opts7`), set the MEASURE bounds from measurement, and run the edited queue
   264 sweep (`?only=no%20effect%20erases`).
2. Measure and pin `C.SCHEMA_FP` (fp.js) at rev 22 — round six's rev 21 was never pinned either, so one measurement on the assembled
   tree covers both — replacing both FP TO PIN comments.
3. Full suite (the sweeps in §4, 1068 B5, 482 12.4's Timecode pins, the legacy-keys rows), prove.sh (the 264 edit reads DEAD there, by
   design), then the #545 sheet in §7 before the release that ships it.
