# #966 opts2 — a second round of more choice on seven effects he already has (hunt/966-opts2)

His standing request #966: *"you can polish other effects just giving them more features and making them work a bit better and
have more customisation … more choices always better … this is the complex version we want as much choice as possible"*.

Branch `hunt/966-opts2`, based on `hunt/966-opts` ea1a70c3 (v17.60 + the unshipped hunt/966-new batch + round one, the `966 opts`
block). **Code only, 17 Oct, while a release shipped from the main checkout: nothing was run but `node --check`.** No browser, no
suite, no tools/*.sh runner, no node or python running app or test code.

## 1. Twin check (done before any code)

Effects were picked for being visible in short phone edits — two transitions, a strobe, a colour look, a lens look, a light
streak and a gradient generator — and thin next to AE / Premiere / CapCut / Alight Motion / DaVinci. Every candidate option was
checked six ways:

| Check | How | Result |
|---|---|---|
| 1. Already in the code? | the EFFECTS row and the kernel of each effect in this worktree; `git grep` for each new key on that effect's row | none of the new keys exists on these seven rows (the key names are per effect; `grain`, `burn`, `feather`, `soft`, `darken`, `fringe`, `spin`, `dir`, `centerx/centery` and `color`/`color2` are all free on them) |
| 2. Idle backlog | `tools/design/plans/2026-09-29-idle-backlog/backlog.md` — grep for each type id and label in §A (batches 1–15, all built and shipped), §B and §C | **none of the seven is in §A, §B or §C.** The only hits: Type-On's own `blink` (12.4, a different effect), §A 5.1 adding `spotcolor` to adjustment layers (done, fx-registry ADJ list) and §A 5.1's note that `fourcolor` stays off adjustment layers (it is drawn from where a pixel is — untouched here) |
| 3. ChatGPT pile | `tools/design/chatgpt-tasks/pile/LAND-LIST.md` (and INVENTORY.md's 39 themes) | no new controls on any of the seven. **Overlap to note:** LAND-LIST B2 `10040332` ("Keep Dissolve boil in place when keyframed speed stops") touches Dissolve's `dsFr` line — this base already integrates it; the new Dissolve code sits beside that line, not in it |
| 4. POLISH-LOG / REQUESTS | grep each label and type in /home/ezra/FreeMotion | only history: #904 [D] Block Fade's Order and Pattern (v16.57, "Boil not added — a keyframed Pattern does it"), #798 Chromatic Aberration's Toward edges (v15.83), #904 [C] Strobe's true Rate (`hz`), queue 904 Burst Streaks' Quality and Amount-0-is-off, the v4.60 note that Dispersion (not Dissolve) glows at its leading edge. Nothing planned for these options; Zoom Streaks "at 1.9 is left open" (weak at its default) is untouched — the defaults do not move |
| 5. Round one's NOTES.md | tools/design/plans/966-opts/NOTES.md | none of the seven is in round one (Zoom Blur, Spin Blur, Neon Outline, Glow Inward, Sunburst, Number Roll, Breathe, Spin) |
| 6. Unmerged branches | the EFFECTS row and the kernel of all seven (plus Wormhole and Squeeze, considered and dropped) on **every ref of both repos** — /home/ezra/fm-helper (626 refs: every `ssh/hunt/*` incl. 1068-b8, 912-filters, pile-overdrive, `ssh/plans/*` incl. 482-canvasfx, `ssh/codex/*`, `ssh/chatgpt/*`, `ssh/wip/*`) and /home/ezra/FreeMotion (852 refs, incl. the pinned pile) — read-only `git cat-file`, 76 distinct compositor.js blobs | **every ref carries this base's rows, or an OLDER one** (fewer controls: Block Dissolve without Order/Pattern, Blink without `hz`, Zoom Streaks without Quality, the one-param shorthands). No ref has any control on these seven that this base lacks — no twin. Kernel differences on `codex/*` are the pile's own older kernels (T16 boil integration on Dissolve) |

Considered and dropped: **Wormhole** and **Squeeze** (warps; LAND-LIST B5 `b2ce43ae` adds Edges/Smooth sampling to every warp in
the driver and the GL path, so anything there would collide), **Twirl / Pinch / Fisheye** (same), **Letter Spread / Text Curve**
(the text renderer, risky to keep byte-identical code-only), **audio** (the bypass-pair rule needs an OfflineAudioContext proof
that only a run can give; nothing thin and visible enough left after §A batches 3, 7, 8 and 9).

## 2. What was built — 7 effects, 16 new controls (the plan, written before the code, and built as planned)

| Effect (type) | Key | Label | Range / choices | Default | What it does |
|---|---|---|---|---|---|
| Dissolve (`dissolve`) | `grain` | Grain size | 1–40 px (unit px: pxToPlate scales it), keyframable | 1 | the holes come in square grains this big instead of single pixels |
| | `burn` | Burn edge | 0–100 %, keyframable | 0 | the edge glows as it eats in: what is about to go turns the Burn colour, fading back to the picture further in — burning paper |
| | `color` | Burn colour | colour row, greyed while Burn edge is 0 | #ff7a1a | the glow's colour |
| Block Fade (`blockdissolve`) | `aspect` | Block height | 25–400 %, keyframable | 100 | tall or wide blocks (AE's Block Width / Block Height) |
| | `feather` | Feather | 0–100 %, keyframable | 0 | each block fades out instead of vanishing at once (AE's Feather) |
| Strobe (`blink`) | `soft` | Softness | 0–100 %, keyframable | 0 | the strobe fades on and off instead of switching — at 100 a smooth pulse |
| Colour Pop (`spotcolor`) | `darken` | Darken the rest | 0–100 %, keyframable | 0 | the drained part also goes darker, so the kept colour pops harder (the Sin City look) |
| | `color2` | Rest colour | colour row, greyed while Drain the rest is 0 | #808080 (any grey = none) | the drained part takes this colour's tint at its own brightness — a sepia or blue world round the red coat |
| Chromatic Aberration (`chromaticaberration`) | `fringe` | Fringes | Red / blue · Green / pink · Yellow / blue | Red / blue (0) | which colours split: today's red and blue to either side, or green against magenta, or yellow against blue (real lenses' purple and green fringing) |
| | `centerx` / `centery` | Centre X / Centre Y | 0–100 %, keyframable, live only above Toward edges 0 | 50 / 50 | where the lens's middle is (nothing fringes there) |
| Burst Streaks (`zoomstreaks`) | `dir` | Streaks | Outward / Inward | Outward (0) | Inward draws the bright parts in towards the centre instead of out |
| | `color` | Tint | colour row | #ffffff (white = none) | colours the streaks (Light Streaks' Tint) |
| Corner Colours (`fourcolor`) | `spin` | Spin speed | −360–360 °/s, keyframable (integrated) | 0 | the four colours travel round the corners — an animated gradient background |
| | `centerx` / `centery` | Centre X / Centre Y | 0–100 %, keyframable | 50 / 50 | where the four colours meet |

16 new controls on seven effects. Exact definitions (all in js/compositor.js, helpers beside `wCx` after round one's, each with a
suite seam):

- **Grain size** (inline in the kernel): the hash is of the grain's column and row, `floor(x / grain)`, `floor(y / grain)`,
  with grain already in plate px (pxToPlate, the kernel keeps arity 5). Below one plate pixel it is pixel-fine.
- **Burn edge** (`dissolveBurn966`, seam `FM._dissolveBurn966`): band B = Burn % x 0.3 of the roll above the bar A; weight
  g = clamp(1 − (r − A) / B) x min(1, A / B); colour lerped to the Burn colour by g; the alpha is decided first, by the kernel's own
  expressions.
- **Block height / Feather** (`blockFade966`, seam `FM._blockFade966`): blocks Block Size wide and round(Block Size x %) tall; Feather
  f = % / 200 of the roll, alpha x (1 − clamp((Amount x (1 + f) − r) / f)).
- **Softness** (`strobeSoft966`, seam `FM._strobeSoft966`): smoothstep across each switch of half-width h = s x min(D, 1 − D) / 2; the
  layer's alpha x (v + (1 − v) x Dims to) part-way.
- **Darken the rest / Rest colour** (`colourPop966`, seam `FM._colourPop966`): the drain target is a black → rest colour → white ramp at
  the pixel's own brightness (luma kept exactly, in reals); then x (1 − Darken x (1 − kept)).
- **Fringes / Centre** (inline): the +/− taps are the old ones; Green / pink takes G from +, R and B from −; Yellow / blue takes B from +,
  R and G from −. The radial reach is the distance to the farthest corner from the lens's middle.
- **Streaks / Tint** (inline): Inward negates each tap's fraction; the #692 bound scales the box by 1/(1 + strength) instead of
  1/(1 − strength). The tint multiplies the clamped streak.
- **Spin speed / Centre** (`cornerSpin966`, `cornerMid966`, seams `FM._cornerSpin966`, `FM._cornerMid966`): q = turn / 90 corners;
  each corner lerps from ring[j − floor q] to ring[j − floor q − 1] by frac q (ring TL, TR, BR, BL); the centre bends u and v in two
  straight pieces so 0.5 lands on it, before Spread. A keyframed speed is `FM.integrateProp(p.spin, 0, t)`, as Sunburst's Spin speed.

## 3. Why each default is exact (byte-identical pixels)

- **No `legacy` anywhere, and every `def` IS today's look**, so the render-time fill (queue 784) writing the default into a saved
  project's absent key changes nothing. Each kernel reads its key with a literal fallback equal to `def` (`p.grain==null?1`,
  `p.aspect == null ? 100`, `fparam(p,'spin',0,t)` …) — the literal `FM._fxFillValue` reads off the source — and colour rows fill to
  their `defColor`, which is the identity (orange Burn colour at Burn 0, grey Rest colour, white Tint). Test 793 holds for every row.
- **Dissolve:** at Grain 1 `dsHx`/`dsHy` ARE `dsX`/`dsY` (the same integers), so the hash line is the old one; `dsPlain` gains
  `&& dsBurn===0`, true exactly when it was; at Burn 0 the old alpha lines run (the burn branch is a `continue` before them).
  Adding `unit:'px'` to `grain` makes pxToPlate copy the params object on a reduced plate (it used to hand it back): the copy carries the
  same values and keyframe objects, so the kernel reads the same numbers.
- **Block Fade:** the kernel hands off to `blockFade966` only when Block height ≠ 100 or Feather > 0, before the old loop; at the
  defaults the old loop runs untouched. The helper copies the old hash, Pattern and Order expressions to the operator, and a test proves
  it IS the old loop with square blocks and no feather.
- **Strobe:** at Softness 0 the three old branches decide `blkOn` (the duty-50 shortcut gains `&& blkSoft === 0`, true exactly when it
  was), and the new part-way loop only runs for 0 < blkOn < 1, which the old branches never produce.
- **Colour Pop:** a grey Rest colour (any r = g = b) and Darken 0 run the old loop; the helper is entered only off that. A test proves
  the helper with no darken and a grey rest is the old loop byte for byte, at the defaults and at an inverted, boosted, part-drained setting.
- **Chromatic Aberration:** at 50 % `wCx` returns `W/2` itself (round one's guarantee), and the reach is then computed by the old
  expression `Math.hypot(caCx, caCy)` (an explicit branch, not the farthest-corner formula, though they agree there); Red / blue writes
  the old three channel assignments.
- **Burst Streaks:** Outward leaves `zs_sc = 1/(1 - zs_strength)` and the tap fraction untouched (`if(zs_in)` negates only for Inward);
  a white tint skips the multiply.
- **Corner Colours:** a turn of exactly 0 (Spin 0, or t = 0) never calls `cornerSpin966`, and a centre of exactly 50 % never calls
  `cornerMid966`; the loop's own lines are the old ones with a gated statement before each Spread line. A whole lap (q a multiple of 4)
  returns the very colour arrays read, so it is byte for byte the still gradient.
- **Arity unchanged** for every kernel (dissolve and blink 5, blockdissolve 6, the rest 5 named), so pxToPlate's choice is the same.
- **CROP_FX:** Strobe and Colour Pop take the cropped readback; both new controls are point operations (alpha, colour per pixel), so a
  cropped buffer draws the same picture — the #692 crop re-proof at every range param's maximum should stay green (owed: a run).
- **Not exact by design, off the default only:** Burst Streaks Inward reads the clamped frame border like Outward does (the same reason
  the bound is not taken for a layer on an edge); Strobe Softness on a keyframed `hz` fades on the integrated phase (correct, but a new
  behaviour); the Rest colour ramp keeps luma exactly in reals and within a level after rounding.

## 4. Busters and schema

- `index.html`: `js/compositor.js?v=224 → 225`, `js/collab-core.js?v=37 → 38`. fx-registry, inspector, fx-thumbs and audio-fx are
  untouched (the registry derives the rows — colour gates `colorGate`/`color2Gate` with `deadAt` and range `liveAbove` already pass
  through `paramsOf` — and the inspector draws them from it), so their busters stay at 27 / 426 / 60 / 22.
- `js/collab-core.js`: `C.SCHEMA_REV = 18` with a Rev 18 note. **`C.SCHEMA_FP` is still rev 17's number (5703583655858754)**, under a
  `/* FP TO PIN (966 opts2) */` marker — the builder measures it with fp.js; `921 S1 the schema fingerprint gate` fails until then.

## 5. Tests (tests/tests.js, one block between `// ── 966 opts2 (hunt/966-opts2) ──` and `// ── end 966 opts2 ──`)

All `{ item: '966', budgetMs: 60000 }`, each failing on ea1a70c3 on its first line by naming the missing control or seam (`_o2Need`).
Per effect: (a) rows, (b) what it does, (c) defaults byte for byte, (d) a CONTROL that every new control moves (c)'s fixtures and a gated
one does nothing where the panel greys it.

1. `966 opts2 every new control at its default draws what the effect drew without it — all seven effects through the compositor…` (1:1 and half plate, 0.61 / 1.73 s; CONTROL each changes its layer)
2. `966 opts2 Dissolve has Grain size (1–40 px, scaled to the preview plate) and Burn edge (0–100 %)…` (a; plus `_pxParamKeys`)
3. `966 opts2 Dissolve Grain size: at 8 px every 8 x 8 grain goes whole…` (b; plus the half-size plate through the compositor)
4. `966 opts2 Dissolve Burn edge: on a sweep from the left the edge glows the Burn colour…` (b)
5. `966 opts2 Dissolve at 1 px and 0 % draws byte for byte…` (c)
6. `966 opts2 Dissolve CONTROL: on the fixture the defaults hold still…` (d)
7. `966 opts2 Block Fade has Block height (25–400 %) and Feather (0–100 %)…` (a)
8. `966 opts2 Block Fade Block height: at 200 % every 16 x 32 block goes whole…` (b)
9. `966 opts2 Block Fade Feather: at 100 % blocks fade out one alpha each…` (b)
10. `966 opts2 Block Fade at 100 % and 0 % draws byte for byte… its helper is the old loop to the bit` (c)
11. `966 opts2 Block Fade CONTROL: on the fixture the defaults hold still…` (d)
12. `966 opts2 Strobe has Softness (0–100 %, keyframable)…` (a)
13. `966 opts2 Strobe Softness: at 100 % the blink is a smooth pulse…` (b; worked alphas 255 / 0 / 128 / 215 / 40 / 200 / 102 / 178)
14. `966 opts2 Strobe at 0 % draws byte for byte…` (c; 36 cases incl. the saved half-rate Rate)
15. `966 opts2 Strobe CONTROL: Softness moves the picture on a switch…` (d)
16. `966 opts2 Colour Pop has Darken the rest (0–100 %, keyframable) and a Rest colour…` (a)
17. `966 opts2 Colour Pop Darken the rest: at 50 % the drained part sinks…` (b)
18. `966 opts2 Colour Pop Rest colour: a sienna drains the rest to sienna shades…` (b)
19. `966 opts2 Colour Pop at 0 % and grey draws byte for byte… its helper is the old loop to the bit` (c)
20. `966 opts2 Colour Pop CONTROL: on the hue sweep…` (d)
21. `966 opts2 Chromatic Aberration has Fringes (Red / blue, Green / pink, Yellow / blue) and Centre X / Y…` (a)
22. `966 opts2 Chromatic Aberration Fringes: on a white bar…` (b; exact colours at five columns per choice)
23. `966 opts2 Chromatic Aberration Centre X / Y: the lens’s middle moves…` (b; exact pixels)
24. `966 opts2 Chromatic Aberration on Red / blue at 50 % / 50 % draws byte for byte…` (c)
25. `966 opts2 Chromatic Aberration CONTROL: on the fixture both new Fringes…` (d)
26. `966 opts2 Burst Streaks has Streaks (Outward, Inward) and a Tint…` (a)
27. `966 opts2 Burst Streaks Streaks and Tint: Outward smears a bright dot away from the centre…` (b; worked 19 / 17)
28. `966 opts2 Burst Streaks with Inward or a Tint: skipping what the streaks cannot reach…` (b; the #692 bound, 48 runs)
29. `966 opts2 Burst Streaks Outward and white draws byte for byte…` (c; incl. a bounded run)
30. `966 opts2 Burst Streaks CONTROL: on the lights Inward and a Tint each move the picture…` (d)
31. `966 opts2 Corner Colours has Spin speed (−360–360 °/s) and Centre X / Y…` (a)
32. `966 opts2 Corner Colours Spin speed: at 90 °/s the four colours move one corner clockwise a second…` (b; incl. a keyframed hold)
33. `966 opts2 Corner Colours Centre X / Y: at 25 % across the colours meet a quarter of the way in…` (b)
34. `966 opts2 Corner Colours still at the middle draws byte for byte…` (c)
35. `966 opts2 Corner Colours CONTROL: on the fixture Spin speed (after a moment)…` (d)
36. `966 opts2 the seven effects’ editors, new rows and all, fit the inspector…` (phone fit; CONTROL labels Burn edge, Feather, Softness, Darken the rest, Fringes, Inward, Spin speed)

**Bounds — MEASURED on the first run (17 Oct, the builder; 1280 and 380 gave identical numbers):**
- Dissolve half-plate neighbour pairs: Grain 8 at 0.1148 (bound 0.3, and under 0.6 × Grain 1's), Grain 1 at 0.5049 (CONTROL bound 0.35).
- Burn edge glow shares: sweep 255 of 586 kept front pixels (44 %, floor 30 %), green 257 (floor 30 %), Everywhere 690 of 2037 (34 %, floor 20 %). The strongest is exactly rgb(255, 122, 26).
- Dissolve (d): Burn 50 % moves 1044 px, a green Burn colour 1044, Burn 80 % on a sweep 562 (floors 500 / 500 / 250).
- Burst Streaks bound CONTROL: 48 of 48 runs move (floor 90 %).
- Keyframed Spin: 0 levels off (±1).

Everything else is exact (`=== 0`, byte for byte, or worked pixel values ±1 for Uint8 rounding). First run: '966 opts2' 36/36, the fingerprint gate, 482 visible, the inert sweep, 784 and 913.5 all green at 1280 and 380. SCHEMA_FP is pinned at 2163435686490402 (fp.js, rev 18).

**Shared tests edited: none.** Searched tests.js for each type id and label: no test pins these seven effects' param lists, slider
counts or labels — `effects: the pattern effects still render an un-upgraded instance` (Dissolve), `effects: Dissolve can sweep…`, the
fourcolor/spotcolor/zoomstreaks legacy tables (~49464, 49557, 49575, 55987), the shared-scratch leak test (75452), `904 Blink …` (its
`inst.rate === 2 && !('hz' in inst)`, `seg904` AI checks and the open panel's single Rate row all still hold with `soft`), and the #954
rename table (152220) all read their own keys. Sweeps the new rows enter, reasoned through: `effects: no effect slider is completely
inert` (each new slider moves one of its fixtures at one of its five moments; CA's centre is unlocked through `liveAbove`), `793`
(every new numeric row fills to its default), the `0 renders exactly as its default` sweep (12207: CA and Corner Colours' centres take
0 without `||`), `482: every effect does something visible at its own defaults`, `784`, the ruler-notch limit (Spin speed's 144 notches
equal round one's Sunburst), and the #692 crop re-proof for Strobe and Colour Pop (CROP_FX).

## 6. #545 before/after sheet (owed — for him to pick or veto)

Render through the app (`FM.renderScene` in a tests/ probe), at phone size (≈ 380 px wide frame), each option at 2–3 values beside
today's default:
- **Dissolve** on a title over footage, Sweeps From the left, as a 4-frame strip (Amount 0.2 / 0.4 / 0.6 / 0.8): Grain size 1 / 6 / 16;
  Burn edge 0 / 40 / 100 % in orange, and 100 % in cyan.
- **Block Fade** on a photo at Amount 0.5: Block height 50 / 100 / 300 %; Feather 0 / 50 / 100 % as a 4-frame strip.
- **Strobe** at 2 Hz: a 1-second opacity graph per Softness 0 / 50 / 100 %, plus 4 frames each.
- **Colour Pop** on a photo with a red subject: Darken the rest 0 / 40 / 80 %; Rest colour grey (today) / sienna / navy.
- **Chromatic Aberration** on a high-contrast title, Amount 10: Fringes Red / blue / Green / pink / Yellow / blue; Centre 50 / 50 vs
  25 / 30.
- **Burst Streaks** on night lights: Outward / Inward; Tint white / orange / cyan.
- **Corner Colours** behind a title: Spin speed as a 4-frame strip (0, 0.5, 1, 1.5 s at 90 °/s); Centre 50 / 50, 25 / 25, 75 / 60.
Names to put to him (#954 / "options, recommended next to the best"): Grain size, Burn edge, Burn colour, Block height, Feather,
Softness, Darken the rest, Rest colour, Fringes (Red / blue · Green / pink · Yellow / blue), Streaks (Outward · Inward), Tint, Spin speed.

## 7. Risks and what is unsure

- **Nothing was run.** Every claim in the tests is reasoned; the first run may move a marked bound or expose a reasoning slip in a
  worked pixel (each is worked through in the test's comment so a red can be checked quickly).
- **The half-plate grain check** assumes the plate is blitted back 1:1 at rs 0.5; if the blit softens a grain's edge the neighbour share
  rises (slack is in the bound, and Grain 1's share is the control).
- **Segment widths at 380 px:** Fringes' three labels ("Yellow / blue", "Green / pink") are about the length of Spin Blur's
  "Anticlockwise" row, which fits; the phone-fit test checks it.
- **Burn edge on Everywhere** speckles the glow (each roll is its own); with Grain size above a few px it reads as burning blocks. He may
  want the glow only on sweeps — logged here, not built.
- **Rest colour** is a black → colour → white ramp: a very dark or very saturated colour cannot keep a bright pixel's brightness in that
  hue and rides up toward white — the honest result of keeping luma.
- **Corner Colours' spin** blends colours between corners (each corner passes through the mix of two neighbours), not a geometric
  rotation of the gradient (that would clamp outside the square). If he wants a true rotation, a new control.
- **Chromatic Aberration's Fringes** keep today's total split; a two-colour fringe therefore reads about twice as wide as each half of
  today's three-colour one.
- **LAND-LIST B2** (pile `10040332`) touches Dissolve's boil line beside the new Grain/Burn code; whoever lands second rebases by hand.

## 8. Owed by the builder

1. First run of the 36 tests at 900 and 380 (`?only=966%20opts2`), set the marked bounds from measurement.
2. Measure and pin `C.SCHEMA_FP` (fp.js), replacing the FP TO PIN marker.
3. Full suite (the sweeps in §5), prove.sh, then the #545 sheet in §6 before the release that ships it.
