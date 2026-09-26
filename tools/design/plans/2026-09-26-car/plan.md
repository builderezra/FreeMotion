# Plan: the Car shape (INBOX 26 Sep ~17:42)

Planned 26 Sep 2026 by the planning chat, for the builder. Everything in the output dir came from this plan's own tooling:
`/Users/ezrasmith/Claude/FreeMotion/tools/design/plans/2026-09-26-car/`
(called `$PLAN` below). No repo file was edited.

**Short version.** Three cars traced from published pictograms and converted into `FM.SHAPE_POLYS` format. The data is
checked against its source and has been rendered by the app itself, big and at the menu's 34px. **A** is recommended:
the Material Design Icons side view. Build the one he picks by replacing `S.car` in `js/compositor.js` (paste-ready
blocks in §5). Leave `SHAPE_ASPECT.car` at `[1, 1]`. The two old car tests get retuned and one new proving test is
added (§6). If he is asleep when it comes up, build A under LOOP.md rule 16 and send the sheet with B and C named.

---

## 1. His words and his clauses

**Verbatim (now REQUESTS.md #961, moved there from INBOX.md by the drain):** "The car shape needs to be improved."

| # | Clause | Covered by |
|---|---|---|
| 1 | The car shape needs to be improved. | §4 options A/B/C, §5 the change, §6 the proof |

Standing rules that apply: #545 (draw real options, render them big and at the size they ship at, mark one
Recommended, never ship a visual he has not seen, and send the picture), and #929's lesson (trace from real published
pictograms, not from scratch). He did not say *what* is wrong with the current car. The options don't depend on the
answer, so there is no ask about it.

## 2. What exists now (verified against the working tree, 26 Sep 18:2x)

- **`js/compositor.js:13370`** starts the car's comment, `/* CAR — redrawn v5.33. Ezra had rejected it twice ...`. The same
  comment records the weak point at 13391–13393:
  > `Known weak point, recorded rather than papered over: the tyre-to-arch gap is 0.023 normalised, sub-pixel below about 60px, so at the 34px icon the arches close up and the wheels read as hub dots on the body.`
- **`js/compositor.js:13394`** `S.car = [` runs to **13422** `    ];`, which is followed at 13423 by `    // ---- squircle + additions ----`.
  It has 7 sub-paths and 84 points: a 36-point body, 2 windows, 2 separate tyre rings and 2 hubs, each of those 8 points.
  The tyres are separate rings and the arches are cut into the body.
- **`js/compositor.js:13493`** `FM.pointCtrl` works like this. `[u,v]` is a corner and both of its controls sit on the
  point. `[u,v,1]` is an auto Catmull-Rom point. `[u,v,1,hx,hy]` carries a **symmetric** manual handle: `out = p + h`,
  `in = p − h`. A segment between two corners is a straight line. `FM.buildSubPath` (13592) draws with these, and the
  fill is nonzero.
- **`js/compositor.js:12991`** `holeS` only reverses point order and does **not** negate manual handles. So a hole that
  carries `[x,y,1,hx,hy]` points must be written already wound the right way, as literal data. The blocks in §5 are.
- **`js/addmenu.js:130`** `['rocket', 'Rocket'], ['envelope', 'Envelope'], ['woman', 'Woman'], ['car', 'Car'],` is in
  `LIB_SHAPES`, and its neighbours in the menu are Rocket / Envelope / Woman / **Car** / Cross.
- **`js/addmenu.js:82–85`** icon box: `var k = 18 / Math.max(asp[0], asp[1]);` The longer side of the shape's aspect
  fills 18 of the icon's 24-unit viewBox.
- **`js/addmenu.js:351`** `].concat(LIB_SHAPES.map(function (s) { return { label: s[1], icon: icoPoly(s[0]), ...`
  **builds every shape icon ONCE, at load.** Changing `FM.SHAPE_POLYS.car` at runtime does not reach the tile until a
  reload. That's fine for shipping, but it matters for anyone prototyping (see §3).
- **`styles.css:5562`** `.addmenu-card--ico .addmenu-ic svg, .addmenu-card--ico .addmenu-ic { width: 34px; height: 34px; }`
- **`js/app.js:3124–3131`** `// CAR IS NOT ONE OF THEM ANY MORE — it must stay SQUARE. ...` then `car: [1, 1],`. The
  drawing carries its own proportion inside the unit box. **Every Car layer already in a saved project has a square box**,
  so the new car must also sit at its own proportion inside the unit square, or old projects' cars will stretch. All
  three options do that.
- **`tests/tests.js:15826–15862`** `test('the car shape is car-shaped: level wheels, open holes, nothing below the ground line', { item: 'car-shape' }, ...)`
- **`tests/tests.js:20215–20278`** `test('shapes: an added Car renders with ROUND wheels', { item: 'car-aspect' }, ...)`
  This test expects exactly 3 ink blobs (body + 2 separate tyres).
- **`BEFORE-PUBLISHING.md:139–152`** §8 still lists `car` among the six "traced from stock images" shapes. That was
  stale since v5.33, and it needs a line once this ships (§5d).
- **`index.html:1061`** `<script src="js/compositor.js?v=194"></script>`, and **`index.html:1109`** `js/app.js?v=458`.
  Re-checked by the review at HEAD v17.04 with v17.05 shipping: both are the SAME in HEAD and the working tree
  (compositor 194, app 458), so neither is bumped yet by anything in flight.

## 3. Findings and measurements

**How the numbers were taken.** All in-app numbers come from `tools/shot.py` runs against the dev server on :8777
(working tree at v17.03-in-progress, `S.car` unchanged from HEAD). The probe is `$PLAN/probe.js`, generated by
`$PLAN/gen_probe.py`. It installs each option with `FM.SHAPE_POLYS.car = ...` and draws it with **`FM.renderScene`** on
a 34×34 canvas at 1x, with the shape box at the icon's own 25.5px (18/24 of 34). To show the option in the **real** menu
tile, the probe redraws the tile with a copy of `icoPoly`. That copy reproduces the menu's own path string **exactly**
for the current car (`mirrorMatchesMenu: true`), so each tile shows what a reload with the new data would show.

**At the menu's 34px (measured at 1x in Chrome with FM.renderScene):**

| | hub / headlight across | open area per hub | tyre ink around the hub | wheel hangs below the body | points |
|---|---|---|---|---|---|
| **now (v17.02)** | 2.19 px | **4.13 px²** | 0.76 / 0.72 | 2 px | 84 |
| **A** MDI side | 3.34 px | **7.94 / 7.97 px²** | 0.96 | 4 px | 40 |
| **B** Phosphor side | 3.06 px | **7.09 / 7.11 px²** | 0.94 | 2 px | 35 |
| **C** AIGA front | 3.42 px (headlights) | **8.98 px²** | 1.00 | 4 px (feet) | 39 |

- **The current car's arch gap at 34px** was measured with my local rasteriser (`$PLAN/raster.py`, nonzero, 16×
  supersampled, same bezier walk). In the pixel column through the front wheel's centre, the gap row is **0.41 ink**, so
  59% of the background shows through as a grey line. The tyre row next to it is 1.0 and the body above is 1.0. The
  tyre ring runs into the body, and the hub (2.19 px) is what's left to read as a wheel. That's the "hub dots" the
  comment describes.
- **The menu icon's real size:** **34×34 CSS px on the phone at 380×800**, with the Car on page 4 of 5 of the Shape tab.
  It is **40×40 CSS px on PC at 1280×900** (page 6 of 7). His 440×956 phone was **not measured**: the builder's ship lock was held for the rest of the planning window. §7 step 2 measures it.
- **Conversion fidelity** (`$PLAN/build.py`) is the largest distance between the S-format curve, as `FM.buildSubPath`
  draws it, and the source's own curve, both sides, 16 samples per segment. It is 0.33% of the long side for A, 0.31%
  for B and 0.31% for C, which comes to 0.7 px at 220 px.
  How it converts:
  - SVG arcs are split into equal pieces of at most 90°, so a smooth point's handle is the same on both sides.
  - A node where the tangent turns more than 10° stays a corner.
  - Any segment that strays past 0.4% is subdivided at t = 0.5 and re-checked.
  - Holes are re-wound against the body, with their handles negated.
  - The drawing is placed at its own proportion, longest side 0.96, centred in the unit square. That matches the current
    car's 0.9576 width, so the on-screen size barely moves.
- **Old tests against the options** (run in the page for each option with `$PLAN/probe_tests.js`):
  - "the car shape is car-shaped…" fails on A with `the tyres do not reach below the body — they are discs laid on a slab`.
    On B and C it fails with `…missing or too simple`, because B and C have 4 sub-paths and the test wants 5.
  - "shapes: an added Car renders with ROUND wheels" fails on A, B and C with `expected 3 ink blobs (body + 2 tyres), got 1`.
  - Both encode the old construction (separate tyre rings). That's why they are retuned in §6, not deleted.
- **New tests against the options:** all three pass on A and B. On C the 34px test and the retuned car-aspect test pass,
  and the side-view structural test fails as designed (`the car is 0.96 wide by 0.73 tall`), so C uses the variant in
  §6c. **On HEAD's car:** the 34px test FAILS (`the rear wheel's hub is 4.1px² of open space…`), the retuned
  structural test FAILS (`the rear tyre is not part of the silhouette: the body reaches y 0.541 under its hub against
  0.710 between the wheels`), and the retuned car-aspect test PASSES (prove.sh reports that one as DEAD, which it allows).
  The C-variant structural test (§6c) was checked by replicating its logic in Python on the data, not in the browser. It PASSES on C and FAILS on v17.02 (`14 body points have no mirror partner`).
- **Sources tried and not offered** (each fetched 26 Sep):
  - Microsoft Fluent `vehicle_car_profile_ltr_24_filled` (MIT): a side view, but its ink is 1.29:1, tall and toy-like.
    The v5.33 comment records the rejected old car as a "bubble-van blob" with a square ink box, so I did not offer it.
  - Google Material `directions_car` (Apache-2.0) and Mapbox Maki `car` (CC0): both front views, near-duplicates of
    AIGA's. AIGA is the one in his chosen family.
  - IBM Carbon `car` (Apache-2.0): an outline drawing, not a fill.
  - Lucide `car` (ISC): a stroke icon.
  - Fluent Emoji High Contrast `automobile` (MIT): a line-art side view.
  - **No permissively licensed single-colour front-¾ car pictogram was found** in any of these sets. So the brief's
    "one front-¾ view" is not met. The front view (C) stands in for it.

## 4. Options, rendered by the app

**Sheet:** `$PLAN/car-options-A-B-C.png` (1160×1158, phone-readable). Each row shows:
- 220 px on light and on dark (FM.renderScene)
- the 34px icon at 1x, blown up 4×
- the real phone Add → Shape row at 380 px (Rocket / Envelope / Woman / **Car** / Cross)

Other pictures:
- PC tiles: `$PLAN/shots/pc-tiles.png`
- phone rows: `$PLAN/shots/menu-rows.png`
- full phone frames: `$PLAN/shots/phone380-{800,2200,3700,5200}.png` (now/A/B/C)
- full PC frames: `$PLAN/shots/pc1280-{800,2200,3700,5200,6600}.png` (6600 is the raw renderScene sheet, 1280 wide —
  for his phone send `$PLAN/shots/renderscene-sheet.png`, the same picture cropped to 760×900)

- **A — Side view, Pictogrammers Material Design Icons `car-side`. Apache-2.0.** **Recommended.** It is a classic
  two-window car with bonnet and hatch. The tyres are bold round bumps with 3.3 px hubs, so it reads at 34 px where the
  current one doesn't. A side view is also what you can *drive across the frame*, which is how a car shape gets used in a
  motion editor. Its proportion is 1.833:1, almost exactly the current 1.841:1, so saved projects' cars keep their
  footprint. It has 40 points against 84, so Edit Points on a car is half the handles. The honest cost: its roof and
  pillar corners are sharp, pictogram-style, where the current car had fillets.
- **B — Side view, Phosphor Icons `car-profile` (fill). MIT.** A longer, sleeker estate with one long side window and
  no pillar. It reads at 34 px (7.1 px² hubs), but its wheels only stand 2 px proud, the same as today, so it looks a
  little flatter in the tile.
- **C — Front view, the AIGA / US DOT transport sign's car (Car Rental / Taxi, 1974). Public domain.** It is the same
  sign family as the people he picked in #929 ("Do the airport sign"). It has the strongest presence in the tile (20 px
  tall against about 13), but it's a front view, so it can't drive across the screen.

The **front-¾** requested in the brief isn't here (see §3).

## 5. The exact change

The queue number is **961** (the inbox drain numbered it: REQUESTS.md `- [ ] **961 — The Car shape needs to be improved**`).
It is already filled in everywhere below and in the `$PLAN` patch/test files (the review replaced the old three-letter
placeholder; nothing else in those files changed). Replace `__PICK__` with his letter, or with
`A (decided under rule 16 while he was asleep — say "car B" or "car C" to change it)`.

### 5a. `js/compositor.js`: replace the whole car block

**Anchor:** from the line `    /* CAR — redrawn v5.33. Ezra had rejected it twice ("you did such a shit job on the wheels for the`
(13370) through the `    ];` that closes `S.car` (13422). The line after it, `    // ---- squircle + additions ----`,
stays. **Paste the block for the chosen option.** The files are `$PLAN/patch-A.js`, `patch-B.js` and `patch-C.js`, and
the same text is below. Each block's data was checked equal to the converter's output, and all three were rendered in the app.

**Option A (recommended):**

```js
    /* CAR — rebuilt from a published pictogram (queue 961). His words, 26 Sep: *"The car shape needs to be improved."*
       The v5.33 car was drawn from named landmarks with its tyres as separate rings sitting in arches, and its own comment
       recorded the flaw: the tyre-to-arch gap was 0.023 of the box, 0.59px at the Add menu's 34px icon, so the ring ran
       into the body and the wheels read as dots. Done the way the people finally landed (#929): traced from a real
       pictogram rather than drawn — Pictogrammers Material Design Icons `car-side` (Apache-2.0,
       https://pictogrammers.com/library/mdi/icon/car-side/), his pick __PICK__ of three on the options sheet (A this, B
       Phosphor `car-profile`, C the AIGA transport sign). Converted by the plan's build.py: every arc is split into equal
       pieces so a smooth point's handle is the same both sides (FM.pointCtrl handles are symmetric), a kink stays a corner,
       and the drawing sits at its own 1.833:1 proportion centred in the unit box — so SHAPE_ASPECT.car stays [1, 1] and
       every Car already in a saved project keeps round wheels.
       Like every published car pictogram the tyre is PART of the silhouette, a round bump below the body, and the hub is
       the hole: nothing can close up at icon size. Measured through FM.renderScene at 1x in the icon's 25.5px box: hubs
       3.34px across (were 2.19), 7.9px² open each (were 4.1), wheels 4px below the body (were 2). 40 points, was 84.
       The body winds clockwise and every hole anticlockwise, so nonzero fill leaves the windows and hubs open. */
    S.car = [
      // body — roof, windscreen, bonnet, nose, front wheel, sill, rear wheel, tail, rear screen (the tyres are the bumps)
      [
        [0.6745,0.2382],[0.8055,0.4127],[0.8927,0.4127,1,0.0484,0],[0.98,0.5,1,0,0.0484],[0.98,0.6309],[0.8927,0.6309],
        [0.8824,0.6819,1,-0.0066,0.0157],[0.8544,0.7235,1,-0.0178,0.0178],[0.7618,0.7618,1,-0.0361,0],
        [0.6693,0.7235,1,-0.0178,-0.0178],[0.6412,0.6819,1,-0.0066,-0.0157],[0.6309,0.6309],[0.3691,0.6309],
        [0.3588,0.6819,1,-0.0066,0.0157],[0.3307,0.7235,1,-0.0178,0.0178],[0.2382,0.7618,1,-0.0361,0],
        [0.1456,0.7235,1,-0.0178,-0.0178],[0.1176,0.6819,1,-0.0066,-0.0157],[0.1073,0.6309],[0.02,0.6309],
        [0.02,0.5,1,0,-0.0242],[0.0455,0.4382,1,0.0158,-0.0158],[0.1073,0.4127],[0.2382,0.2382],
      ],
      // rear side window (hole — winds opposite the body so nonzero fill leaves it open)
      [
        [0.4345,0.3036],[0.2709,0.3036],[0.1884,0.4127],[0.4345,0.4127],
      ],
      // front side window (hole)
      [
        [0.5,0.3036],[0.5,0.4127],[0.7243,0.4127],[0.6418,0.3036],
      ],
      // rear hub (hole)
      [
        [0.2382,0.5655,1,-0.0361,0],[0.1727,0.6309,1,0,0.0361],[0.2382,0.6964,1,0.0361,0],[0.3036,0.6309,1,0,-0.0361],
      ],
      // front hub (hole)
      [
        [0.7618,0.5655,1,-0.0361,0],[0.6964,0.6309,1,0,0.0361],[0.7618,0.6964,1,0.0361,0],[0.8273,0.6309,1,0,-0.0361],
      ],
    ];
```

<details><summary>Option B</summary>

```js
    /* CAR — rebuilt from a published pictogram (queue 961). His words, 26 Sep: *"The car shape needs to be improved."*
       Traced from Phosphor Icons `car-profile` (fill weight, MIT, https://phosphoricons.com), his pick __PICK__ of three
       (A Material Design Icons `car-side`, B this, C the AIGA transport sign), the way the people landed (#929). Converted
       by the plan's build.py; the drawing sits at its own 1.777:1 proportion centred in the unit box, so SHAPE_ASPECT.car
       stays [1, 1]. The tyre is part of the silhouette and the hub is the hole, so nothing closes up at the Add menu's 34px:
       hubs 3.06px across (were 2.19), 7.1px² open each (were 4.1). 35 points, was 84. Holes wind against the body. */
    S.car = [
      // body — nose, front wheel, sill, rear wheel, tail, rear slope, roof, windscreen, bonnet
      [
        [0.98,0.4699,1,0,0.0331],[0.98,0.6199,1,0,0.0331],[0.92,0.6799,1,-0.0331,0],[0.8562,0.6799],
        [0.8136,0.7449,1,-0.0205,0.0159],[0.74,0.7701,1,-0.0274,0],[0.6664,0.7449,1,-0.0205,-0.0159],[0.6238,0.6799],
        [0.3763,0.6799],[0.3336,0.7449,1,-0.0205,0.0159],[0.26,0.7701,1,-0.0274,0],[0.1864,0.7449,1,-0.0205,-0.0159],
        [0.1438,0.6799],[0.08,0.6799,1,-0.0331,0],[0.02,0.6199,1,0,-0.0331],[0.02,0.4399,1,0,-0.0059],
        [0.025,0.4232,1,0.0033,-0.0049],[0.1363,0.2566,1,0.0111,-0.0166],[0.1861,0.2299,1,0.02,0],
        [0.6076,0.2299,1,0.0159,-0.0001],[0.65,0.2475,1,0.0112,0.0113],[0.8124,0.4099],[0.92,0.4099,1,0.0331,0],
      ],
      // the side window (hole — winds opposite the body so nonzero fill leaves it open)
      [
        [0.1063,0.4099],[0.7276,0.4099],[0.6076,0.2899],[0.1861,0.2899],
      ],
      // rear hub (hole)
      [
        [0.32,0.6499,1,0,-0.0331],[0.26,0.5899,1,-0.0331,0],[0.2,0.6499,1,0,0.0331],[0.26,0.7099,1,0.0331,0],
      ],
      // front hub (hole)
      [
        [0.8,0.6499,1,0,-0.0331],[0.74,0.5899,1,-0.0331,0],[0.68,0.6499,1,0,0.0331],[0.74,0.7099,1,0.0331,0],
      ],
    ];
```
</details>

<details><summary>Option C</summary>

```js
    /* CAR — rebuilt from a published pictogram (queue 961). His words, 26 Sep: *"The car shape needs to be improved."*
       The AIGA / US DOT transport sign's car (Car Rental and Taxi, 1974, public domain) — the same family as the people he
       picked in #929 ("Do the airport sign") — his pick __PICK__ of three (A Material Design Icons `car-side`, B Phosphor
       `car-profile`, C this). A FRONT view: windscreen and two headlights are the holes, the wheels are the two feet below
       the bumper. Converted by the plan's build.py; it sits at its own 1.207:1 proportion centred in the unit box, so
       SHAPE_ASPECT.car stays [1, 1]. At the Add menu's 34px the headlights are 3.42px across, 9.0px² open each. */
    S.car = [
      // body — roof, windscreen pillar, wing, bumper, right foot, under-bumper, left foot, wing, pillar
      [
        [0.4997,0.1024],[0.5929,0.1025],[0.7068,0.1042,1,0.043,-0.0015],[0.8096,0.1666,1,0.0229,0.05],[0.8923,0.3732],
        [0.9582,0.4141,1,0.0142,0.0175],[0.98,0.4694,1,0.0007,0.0179],[0.98,0.7401],[0.9007,0.7401],
        [0.9007,0.8312,1,0.0038,0.0868],[0.7591,0.8304,1,-0.0032,-0.0911],[0.7574,0.741],[0.2427,0.741],
        [0.241,0.8305,1,-0.0032,0.0911],[0.0993,0.8313,1,0.0038,-0.0868],[0.0993,0.7401],[0.02,0.7401],
        [0.02,0.4694,1,0.0007,-0.0179],[0.0418,0.4141,1,0.0142,-0.0175],[0.1077,0.3733],[0.1904,0.1666,1,0.0229,-0.05],
        [0.2933,0.1042,1,0.043,0.0015],[0.4072,0.1025],
      ],
      // windscreen (hole — winds opposite the body so nonzero fill leaves it open)
      [
        [0.3028,0.176],[0.2702,0.1829,1,-0.009,0.0054],[0.2496,0.2132,1,-0.0046,0.0156],[0.1908,0.3691],[0.81,0.3699],
        [0.7505,0.2096,1,-0.0145,-0.0323],[0.6873,0.1774,1,-0.0342,0.0008],[0.314,0.1762,1,-0.0038,-0.0002],
      ],
      // left headlight (hole)
      [
        [0.1057,0.5171,1,0,0.037],[0.1727,0.5842,1,0.037,0],[0.2398,0.5171,1,0,-0.037],[0.1727,0.4501,1,-0.037,0],
      ],
      // right headlight (hole)
      [
        [0.764,0.5171,1,0,0.037],[0.831,0.5842,1,0.037,0],[0.8981,0.5171,1,0,-0.037],[0.831,0.4501,1,-0.037,0],
      ],
    ];
```
</details>

### 5b. `js/app.js`: the SHAPE_ASPECT comment (the value `car: [1, 1]` does NOT change)

Replace lines 3124–3130 (from `    // CAR IS NOT ONE OF THEM ANY MORE — it must stay SQUARE.` through
`    // To draw a BIGGER car, scale both numbers together (e.g. [1.4, 1.4]); never one of them.`) with the version below.
For **B**, use `Phosphor \`car-profile\``, `0.9600 x 0.5402` and `1.777:1`. For **C**, use
`the AIGA transport sign's front view`, `0.9600 x 0.7952` and `1.207:1`, and `the headlights` for `the hubs`.

```js
    // CAR IS NOT ONE OF THEM — it must stay SQUARE. Since queue 961 the car is traced from Material Design
    // Icons `car-side`, but it is placed at its OWN proportion INSIDE the unit box (ink 0.9600 x 0.5236 of
    // it, i.e. 1.833:1) with the hubs as true circles there — the v5.33 car did the same at 1.841:1, which is
    // why every Car already saved in a project keeps round wheels. The box only SCALES that drawing, so
    // anything but 1:1 turns every wheel into an ellipse by exactly the box ratio. The stale 1.76 x 0.57
    // left from the v3.96 trace is 3.093:1, which stretched the car to 5.695:1 of ink and the wheels to
    // 3.1:1 — Ezra: "really wide and streched out".
    // To draw a BIGGER car, scale both numbers together (e.g. [1.4, 1.4]); never one of them.
```

### 5c. `index.html`: cache-busters (ship.sh refuses without them)

- `js/compositor.js?v=194` → **`?v=195`**, or HEAD's value + 1 if it has moved by build time.
- `js/app.js?v=458` → **`?v=459`** (5b changes app.js, and ship.sh refuses a changed `js/*.js` without its buster). If
  HEAD's value has moved by build time, use HEAD's value + 1 — compare with `git show HEAD:index.html | grep app.js?v=`.
- `js/addmenu.js` and `styles.css` do not change. The menu icon rebuilds from the new data on load.

### 5d. `BEFORE-PUBLISHING.md` §8: after the paragraph starting `**What "done" looks like:**` (line 150)

```md
**The car is no longer one of them (queue 961).** It was redrawn from landmarks in v5.33 and is now traced from
Pictogrammers Material Design Icons `car-side`, **Apache License 2.0**: free to ship, but a public release must carry
the notice — "Material Design Icons by Pictogrammers, Apache License 2.0" plus the licence text, in the app's
credits/about or a NOTICE file. (B instead: Phosphor Icons `car-profile`, **MIT** — the copyright line from
Phosphor's LICENSE file and the MIT text. C instead: AIGA/US DOT symbol signs, public domain — nothing owed,
the same as the people from #929.)
```

Keep only the sentence for the option that shipped.

### 5e. POLISH-LOG line (so prove.sh counts exactly one item)

`- v17.xx — queue 961: the Car is traced from a real pictogram — his pick __PICK__ (Material Design Icons car-side); at the 34px menu icon the wheels read (hubs 3.34px, were 2.19; 7.9px² open, were 4.1), 40 points (were 84). Proof: the new 34px test fails on the v5.33 car (unchanged through v17.05).`

**Commit message: include `DROPS TEST:`**, e.g. `DROPS TEST: 'the car shape is car-shaped: level wheels, open holes, nothing
below the ground line' is retuned under a new title (…the wheels part of the silhouette) — the new car has no separate
tyre rings.` The §6 retune RENAMES that test, and ship.sh's *no test may vanish* gate compares titles against HEAD and
refuses an undeclared rename — v17.04 lost an hour to exactly this. (The car-aspect test keeps its title, so it needs nothing.)

## 6. The proving tests

**Where:** replace the old `car-shape` test (tests.js:15826–15862, anchor its title
`the car shape is car-shaped: level wheels, open holes, nothing below the ground line`) with the helper + the new test
+ the retuned `car-shape` test (the first three blocks below). Replace the old `car-aspect` test (tests.js:20215–20278,
title `shapes: an added Car renders with ROUND wheels`) with the retuned one (the last block). `carHubs` does not clash
(`grep -c carHubs tests/tests.js` = 0). The file is `$PLAN/tests_new.js`, and it is the exact code that was run in-page.

**Why it fails on HEAD (measured, see §3):**
- `961 — the Car reads as a car at the Shape menu's 34px…` gives `the rear wheel's hub is 4.1px² of open space at the
  menu's 34px (2.19px across)…`. The line is 6px², drawn between v17.02's 4.1 and A's 7.9 (B 7.1, C 9.0). It has a
  **control**: the hub must be ringed by ink (≥0.5), or a hub located off the car would read as wide open and pass for
  nothing.
- `the car shape is car-shaped: …the wheels part of the silhouette` gives `the rear tyre is not part of the silhouette:
  the body reaches y 0.541 under its hub against 0.710 between the wheels`.
- `shapes: an added Car renders with ROUND wheels` (retuned) **passes on HEAD**. It's a retune, and prove.sh lists it as
  DEAD, which it allows. It carries its own **control**: the same car stretched to 600×400 must measure elliptical hubs
  (|w−h| ≥ 4 px), or the roundness check proves nothing.
- prove.sh wants one CAUGHT test per `queue 961` in the log line. It gets two.

### 6a/6b. A or B: paste as-is

```js
  /* ---- the Car, rebuilt from a published pictogram (queue 961) ---------------------------------------------------
     Ezra, 26 Sep: "The car shape needs to be improved." Rebuilt the way the people finally landed (#929): traced from a
     real published pictogram instead of drawn from landmarks — Pictogrammers Material Design Icons `car-side`,
     Apache-2.0 — through the plan's converter into this format. Three tests: the new proof (the wheels read at the
     menu's 34px), and the two older car tests retuned to the new construction, where the tyre is PART of the
     silhouette and the hub is the hole, exactly as every published car pictogram draws it. ---- */

  // Shared by the three: the car's two wheel hubs, found in the DATA — the round holes in the lower half.
  function carHubs(car) {
    const bbox = sub => sub.reduce((a, p) => ({
      x0: Math.min(a.x0, p[0]), x1: Math.max(a.x1, p[0]), y0: Math.min(a.y0, p[1]), y1: Math.max(a.y1, p[1]),
    }), { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 });
    const area = sub => {   // signed — the sign IS the winding, which decides whether a hole fills in
      let s = 0;
      for (let i = 0; i < sub.length; i++) { const a = sub[i], b = sub[(i + 1) % sub.length]; s += a[0] * b[1] - b[0] * a[1]; }
      return s / 2;
    };
    const body = bbox(car[0]), wind = Math.sign(area(car[0])), midY = (body.y0 + body.y1) / 2;
    const hubs = car.slice(1).filter(sub => Math.sign(area(sub)) !== wind).map(bbox)
      .filter(b => Math.abs((b.x1 - b.x0) - (b.y1 - b.y0)) < 0.01 && (b.y0 + b.y1) / 2 > midY)
      .map(b => ({ cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2, r: (b.x1 - b.x0) / 2 }))
      .sort((a, b) => a.cx - b.cx);
    return { body: body, hubs: hubs, holes: car.slice(1).filter(sub => Math.sign(area(sub)) !== wind).length };
  }

  test('961 — the Car reads as a car at the Shape menu\'s 34px: open hubs, wheels below the body', { item: '961' }, function () {
    /* The v17.02 car's own comment named its weak point: the tyre-to-arch gap is 0.023 of the box, 0.59px at the
       menu's icon, so the tyre ring runs into the body and the wheels read as small dots. Measured for the plan,
       FM.renderScene at 1x into the icon's own 25.5px box: the v17.02 hubs are 2.19px across, 4.1px² of open area
       each; the MDI car's are 3.34px, 7.9px². 6px² sits between them. Measured at 1x on purpose — at arm's length a
       CSS pixel is about what an eye resolves, whatever the screen's DPR. */
    const car = FM.SHAPE_POLYS && FM.SHAPE_POLYS.car;
    if (!car || !FM.renderScene || !FM.makeLayer) throw new Error('seams missing: SHAPE_POLYS.car / renderScene / makeLayer');
    // The menu icon's box, as js/addmenu.js icoPoly builds it: the longer side of SHAPE_ASPECT fills 18 of the
    // 24-unit viewBox, and the tile shows that viewBox at 34px.
    const asp = (FM.SHAPE_ASPECT && FM.SHAPE_ASPECT.car) || [1, 1];
    const S = 34, k = (18 / Math.max(asp[0], asp[1])) * S / 24, bw = asp[0] * k, bh = asp[1] * k;
    const ox = (S - bw) / 2, oy = (S - bh) / 2;
    const c = offscreen(S, S), x = c.getContext('2d', { willReadFrequently: true });
    const L = FM.makeLayer('shape', { shape: 'car', name: 'Car', x: S / 2, y: S / 2, shapeW: bw, shapeH: bh, fill: '#ffffff', start: 0, duration: 5 });
    FM.renderScene(x, scene([L], { project: { width: S, height: S, fps: 30, duration: 5, background: '#000000' } }), 0);
    const d = x.getImageData(0, 0, S, S).data, ink = (px, py) => d[(py * S + px) * 4] / 255;
    let total = 0;
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) total += ink(px, py);
    if (total < 60) throw new Error('the car drew only ' + total.toFixed(1) + 'px² of ink at 34px — nothing to measure');
    const H = carHubs(car);
    if (H.hubs.length !== 2) throw new Error('expected two round wheel hubs (holes in the lower half of the car), found ' + H.hubs.length);
    const bottom = col => { let b = -1; for (let py = 0; py < S; py++) if (ink(col, py) >= 0.5) b = py; return b + 1; };
    const mid = Math.floor(ox + ((H.hubs[0].cx + H.hubs[1].cx) / 2) * bw);
    H.hubs.forEach((h, j) => {
      const cx = ox + h.cx * bw, cy = oy + h.cy * bh, r = h.r * bw, which = j ? 'front' : 'rear';
      let open = 0, ring = 0, ringN = 0;
      for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
        const dist = Math.hypot(px + 0.5 - cx, py + 0.5 - cy);
        if (dist <= r + 0.75) open += 1 - ink(px, py);
        else if (dist <= r + 1.4) { ring += ink(px, py); ringN++; }
      }
      // CONTROL: the hole must be IN ink. A hub located off the car would read as wide open and pass for nothing.
      if (!ringN || ring / ringN < 0.5) throw new Error('the ' + which + ' hub is not surrounded by tyre at 34px (ring ink ' + (ringN ? (ring / ringN).toFixed(2) : 'none') + ') — the measurement is not looking at a wheel');
      if (open < 6) throw new Error('the ' + which + ' wheel\'s hub is ' + open.toFixed(1) + 'px² of open space at the menu\'s 34px (' + (2 * r).toFixed(2) + 'px across) — it reads as a dot, not a wheel; 6px² is the line (v17.02 measured 4.1, the MDI car 7.9)');
      const hang = bottom(Math.floor(cx)) - bottom(mid);
      if (hang < 2) throw new Error('the ' + which + ' wheel hangs ' + hang + 'px below the body at 34px — the wheels have to stand proud of the underside to read (v17.02: 2, the MDI car: 4)');
    });
  });

  test('the car shape is car-shaped: level wheels, open holes, the wheels part of the silhouette', { item: 'car-shape' }, function () {
    // v5.33, retuned for queue 961. Still pins the properties that were actually wrong in the car he rejected
    // twice (a square blob, rings printed on a body, a floor line through the tyres) — but the tyres are no longer
    // separate rings sitting in arches. Every published car pictogram draws the tyre AS PART OF the silhouette, a
    // round bump below the body, with the hub as the hole: that is what keeps the wheel legible at icon size, where
    // the old 0.023 arch gap closed up.
    const car = FM.SHAPE_POLYS && FM.SHAPE_POLYS.car;
    if (!car || car.length < 4) throw new Error('FM.SHAPE_POLYS.car is missing or too simple');
    const H = carHubs(car), b = H.body;
    if ((b.x1 - b.x0) < (b.y1 - b.y0) * 1.4) {
      throw new Error('the car is ' + (b.x1 - b.x0).toFixed(2) + ' wide by ' + (b.y1 - b.y0).toFixed(2) + ' tall — a car in profile is a WIDE shape; this is the blob the old one was');
    }
    if (H.holes < 3) throw new Error('only ' + H.holes + ' sub-paths wind against the body — the windows/hubs would fill in solid');
    if (H.hubs.length !== 2) throw new Error('could not find two round wheel hubs in the shape (found ' + H.hubs.length + ')');
    const [w1, w2] = H.hubs;
    if (Math.abs(w1.cy - w2.cy) > 0.005) throw new Error('the wheels are not level (hub centres at y ' + w1.cy.toFixed(3) + ' and ' + w2.cy.toFixed(3) + ')');
    if (Math.abs(w1.r - w2.r) > 0.005) throw new Error('the two wheels are different sizes');
    if (w1.cx - w1.r < b.x0 || w2.cx + w2.r > b.x1) throw new Error('a wheel pokes outside the body outline');
    // The tyre is the silhouette: under each hub the BODY outline reaches well below where it runs between the wheels.
    // (read off the outline's on-curve points joined straight — plenty for "is the bottom here or there")
    const lowestAt = xq => {
      let m = -1;
      const o = car[0];
      for (let i = 0; i < o.length; i++) {
        const p = o[i], q = o[(i + 1) % o.length];
        if (p[0] === q[0] || (p[0] - xq) * (q[0] - xq) > 0) continue;
        m = Math.max(m, p[1] + (q[1] - p[1]) * (xq - p[0]) / (q[0] - p[0]));
      }
      return m;
    };
    const between = lowestAt((w1.cx + w2.cx) / 2);
    [w1, w2].forEach((w, j) => {
      const under = lowestAt(w.cx);
      if (!(under - between > w.r)) throw new Error('the ' + (j ? 'front' : 'rear') + ' tyre is not part of the silhouette: the body reaches y ' + under.toFixed(3) + ' under its hub against ' + between.toFixed(3) + ' between the wheels — a separate ring in an arch, which closes up at icon size');
    });
  });

  test('shapes: an added Car renders with ROUND wheels', { item: 'car-aspect' }, function () {
    // v5.65, retuned for queue 961. SHAPE_ASPECT.car must stay [1, 1]: the drawing carries its own proportion
    // inside the unit box, so any other box stretches the wheels by exactly the box ratio ("really wide and
    // streched out"). The v5.33 car's tyres were separate ink blobs; the rebuilt car's tyre is part of the
    // silhouette, so the wheel is measured by its HUB — the round hole — off the rendered image.
    var savedScene = FM.scene, commit = FM.history.commit, autosave = FM.storage.autosave,
        save = FM.storage.save, dirty = FM.storage.markDirty;
    FM.history.commit = function () {}; FM.storage.autosave = function () {};
    FM.storage.save = function () {}; FM.storage.markDirty = function () {};
    var L;
    try {
      FM.scene = { project: { width: 1080, height: 1080, fps: 30, duration: 5, background: '#000000' }, layers: [], selectedId: null, selectedIds: [] };
      FM.addShapeLayer('car', { name: 'Car' });
      L = FM.scene.layers[0];
    } finally {
      FM.scene = savedScene;
      FM.history.commit = commit; FM.storage.autosave = autosave; FM.storage.save = save; FM.storage.markDirty = dirty;
    }
    if (!L || L.shape !== 'car') throw new Error('FM.addShapeLayer("car") did not add a car layer');
    var S = 680;
    function hubsAt(w, h) {
      // position lives in layer.transform, NOT on the layer - a top-level x/y here is silently ignored
      var cl = Object.assign({}, L, { start: 0, duration: 5, fill: '#ffffff',
        transform: Object.assign({}, L.transform, { x: S / 2, y: S / 2 }), shapeW: w, shapeH: h });
      var c = offscreen(S, S), x = c.getContext('2d', { willReadFrequently: true });
      FM.renderScene(x, scene([cl], { project: { width: S, height: S, fps: 30, duration: 5, background: '#000000' } }), 0);
      var d = x.getImageData(0, 0, S, S).data, n = S * S, bg = new Uint8Array(n), i;
      for (i = 0; i < n; i++) bg[i] = d[i * 4] <= 127 ? 1 : 0;
      for (i = 0; i < S; i++) {
        if (!bg[i] || !bg[(S - 1) * S + i] || !bg[i * S] || !bg[i * S + S - 1])
          throw new Error('the car render touches the canvas edge at ' + w + 'x' + h + ' - it is clipped, refusing to measure it');
      }
      // the HOLES: background not reachable from the border
      var lab = new Int32Array(n).fill(-1), st = new Int32Array(n), sp = 0, holes = [], id, p, q, qx, qy;
      var flood = function (seed, tag, rec) {
        sp = 0; st[sp++] = seed; lab[seed] = tag;
        while (sp > 0) {
          q = st[--sp]; qx = q % S; qy = (q / S) | 0;
          if (rec) { rec.n++; if (qx < rec.x0) rec.x0 = qx; if (qx > rec.x1) rec.x1 = qx; if (qy < rec.y0) rec.y0 = qy; if (qy > rec.y1) rec.y1 = qy; }
          if (qx > 0     && bg[q - 1] && lab[q - 1] < 0) { lab[q - 1] = tag; st[sp++] = q - 1; }
          if (qx < S - 1 && bg[q + 1] && lab[q + 1] < 0) { lab[q + 1] = tag; st[sp++] = q + 1; }
          if (qy > 0     && bg[q - S] && lab[q - S] < 0) { lab[q - S] = tag; st[sp++] = q - S; }
          if (qy < S - 1 && bg[q + S] && lab[q + S] < 0) { lab[q + S] = tag; st[sp++] = q + S; }
        }
      };
      flood(0, 0, null);
      for (p = 0; p < n; p++) {
        if (!bg[p] || lab[p] >= 0) continue;
        var rec = { n: 0, x0: 1e9, y0: 1e9, x1: -1, y1: -1 };
        flood(p, holes.length + 1, rec);
        if (rec.n > 40) holes.push({ n: rec.n, x0: rec.x0, w: rec.x1 - rec.x0 + 1, h: rec.y1 - rec.y0 + 1, cy: (rec.y0 + rec.y1) / 2 });
      }
      // the hubs are the two holes lowest in the picture (the windows are above them)
      return holes.sort(function (a, b) { return b.cy - a.cy; }).slice(0, 2).sort(function (a, b) { return a.x0 - b.x0; });
    }
    var k = 600 / Math.max(L.shapeW, L.shapeH);
    var hubs = hubsAt(Math.round(L.shapeW * k), Math.round(L.shapeH * k));
    if (hubs.length !== 2) throw new Error('could not find the two wheel hubs as holes in the rendered car');
    hubs.forEach(function (hb, j) {
      if (Math.abs(hb.w - hb.h) > 1)
        throw new Error((j ? 'front' : 'rear') + ' hub is ' + hb.w + 'x' + hb.h + 'px (' + (hb.w / hb.h).toFixed(2) +
          ':1), not a circle - SHAPE_ASPECT.car must stay square, but a Car spawned at ' + L.shapeW + 'x' + L.shapeH);
    });
    // CONTROL: the same measure on a car deliberately stretched 3:2 must SEE the ellipse, or the check above proves nothing.
    var bad = hubsAt(600, 400);
    if (bad.length !== 2 || Math.abs(bad[0].w - bad[0].h) < 4)
      throw new Error('control failed: a car stretched to 600x400 still measured round hubs (' + (bad[0] ? bad[0].w + 'x' + bad[0].h : 'none') + ') — this measurement cannot see a stretched wheel');
  });
```

**For B only**, three text edits and no code edits:
- In the header comment, change `Pictogrammers Material Design Icons \`car-side\`, Apache-2.0` to `Phosphor Icons \`car-profile\`, MIT`.
- In the 34px test's comment, change `the MDI car's are 3.34px, 7.9px²` to `the Phosphor car's are 3.06px, 7.1px²`.
- In its messages, change `the MDI car 7.9` to `the Phosphor car 7.1` and `the MDI car: 4` to `the Phosphor car: 2`.
- Know that B sits EXACTLY on the hang floor (measured 2px against `hang < 2`), with no margin — the same as v17.02, so
  the hang check is a guard there, not part of the proof (the 6px² hub area is the proof). Leave the floor at 2; if that
  line ever goes red on B, this is why, not a regression.

### 6c. C only: replace the first two tests of 6a with these (carHubs and the car-aspect retune stay)

File: `$PLAN/tests_C.js`. Its 34px test is the verified §6a test with only its wording changed. Its structural test was checked in Python on the data, not in the browser: it PASSES on C and FAILS on v17.02. Run the slice in §7 before shipping it.

```js
  /* ONLY IF HE PICKS C (the AIGA front view). Replaces the first two blocks of tests_new.js; carHubs() and the
     'car-aspect' retune stay exactly as they are (verified: both pass on C). A front view has no hubs — its two round
     holes in the lower half are the HEADLIGHTS, and its wheels are the two feet below the bumper. */
  test('961 — the Car reads as a car at the Shape menu\'s 34px: open headlights, feet below the bumper', { item: '961' }, function () {
    /* Measured for the plan, FM.renderScene at 1x in the icon's own 25.5px box: the v17.02 car's round holes (its hubs)
       are 2.19px across, 4.1px² open; the AIGA car's headlights 3.42px, 9.0px², and its feet hang 4px below the bumper. */
    const car = FM.SHAPE_POLYS && FM.SHAPE_POLYS.car;
    if (!car || !FM.renderScene || !FM.makeLayer) throw new Error('seams missing: SHAPE_POLYS.car / renderScene / makeLayer');
    const asp = (FM.SHAPE_ASPECT && FM.SHAPE_ASPECT.car) || [1, 1];
    const S = 34, k = (18 / Math.max(asp[0], asp[1])) * S / 24, bw = asp[0] * k, bh = asp[1] * k;
    const ox = (S - bw) / 2, oy = (S - bh) / 2;
    const c = offscreen(S, S), x = c.getContext('2d', { willReadFrequently: true });
    const L = FM.makeLayer('shape', { shape: 'car', name: 'Car', x: S / 2, y: S / 2, shapeW: bw, shapeH: bh, fill: '#ffffff', start: 0, duration: 5 });
    FM.renderScene(x, scene([L], { project: { width: S, height: S, fps: 30, duration: 5, background: '#000000' } }), 0);
    const d = x.getImageData(0, 0, S, S).data, ink = (px, py) => d[(py * S + px) * 4] / 255;
    let total = 0;
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) total += ink(px, py);
    if (total < 60) throw new Error('the car drew only ' + total.toFixed(1) + 'px² of ink at 34px — nothing to measure');
    const H = carHubs(car);
    if (H.hubs.length !== 2) throw new Error('expected two round headlights (holes in the lower half of the car), found ' + H.hubs.length);
    const bottom = col => { let b = -1; for (let py = 0; py < S; py++) if (ink(col, py) >= 0.5) b = py; return b + 1; };
    const mid = Math.floor(ox + ((H.hubs[0].cx + H.hubs[1].cx) / 2) * bw);
    H.hubs.forEach((h, j) => {
      const cx = ox + h.cx * bw, cy = oy + h.cy * bh, r = h.r * bw, which = j ? 'right' : 'left';
      let open = 0, ring = 0, ringN = 0;
      for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
        const dist = Math.hypot(px + 0.5 - cx, py + 0.5 - cy);
        if (dist <= r + 0.75) open += 1 - ink(px, py);
        else if (dist <= r + 1.4) { ring += ink(px, py); ringN++; }
      }
      if (!ringN || ring / ringN < 0.5) throw new Error('the ' + which + ' headlight is not surrounded by body at 34px (ring ink ' + (ringN ? (ring / ringN).toFixed(2) : 'none') + ') — the measurement is not looking at a headlight');
      if (open < 6) throw new Error('the ' + which + ' headlight is ' + open.toFixed(1) + 'px² of open space at the menu\'s 34px — it reads as a speck; 6px² is the line (v17.02\'s hubs 4.1, the AIGA headlights 9.0)');
      const hang = bottom(Math.floor(cx)) - bottom(mid);
      if (hang < 2) throw new Error('the ' + which + ' foot hangs ' + hang + 'px below the bumper at 34px — a front view needs its wheels to show (AIGA: 4)');
    });
  });

  test('the car shape is car-shaped: a symmetric front view, open windscreen and headlights, feet below the bumper', { item: 'car-shape' }, function () {
    // v5.33, retuned for queue 961 when the car became the AIGA transport sign's front view.
    const car = FM.SHAPE_POLYS && FM.SHAPE_POLYS.car;
    if (!car || car.length < 4) throw new Error('FM.SHAPE_POLYS.car is missing or too simple');
    const H = carHubs(car), b = H.body, mx = (b.x0 + b.x1) / 2;
    const lopsided = car[0].filter(p => !car[0].some(q => Math.abs((2 * mx - p[0]) - q[0]) < 0.005 && Math.abs(p[1] - q[1]) < 0.005));
    if (lopsided.length) throw new Error(lopsided.length + ' body points have no mirror partner — a front view leans, e.g. [' + lopsided[0].slice(0, 2).join(', ') + ']');
    if (H.holes < 3) throw new Error('only ' + H.holes + ' sub-paths wind against the body — the windscreen/headlights would fill in solid');
    if (H.hubs.length !== 2) throw new Error('could not find two round headlights in the shape (found ' + H.hubs.length + ')');
    const [w1, w2] = H.hubs;
    if (Math.abs(w1.cy - w2.cy) > 0.005) throw new Error('the headlights are not level');
    if (Math.abs(w1.r - w2.r) > 0.005) throw new Error('the two headlights are different sizes');
    const lowestAt = xq => {
      let m = -1;
      const o = car[0];
      for (let i = 0; i < o.length; i++) {
        const p = o[i], q = o[(i + 1) % o.length];
        if (p[0] === q[0] || (p[0] - xq) * (q[0] - xq) > 0) continue;
        m = Math.max(m, p[1] + (q[1] - p[1]) * (xq - p[0]) / (q[0] - p[0]));
      }
      return m;
    };
    const between = lowestAt(mx);
    [w1, w2].forEach((w, j) => {
      if (!(lowestAt(w.cx) - between > 0.05)) throw new Error('no ' + (j ? 'right' : 'left') + ' foot below the bumper under its headlight — a front-view car stands on its wheels');
    });
  });
```

## 7. Verification (the builder, after the change)

Set `PLAN=/Users/ezrasmith/Claude/FreeMotion/tools/design/plans/2026-09-26-car` first.

1. **Suite slice, both widths**:
   ```bash
   python3 tests/_cdp.py --url 'http://localhost:8777/tests/run.html?only=the%20car%20shape%20is%0Aan%20added%20Car%0Athe%20Car%20reads' --width 1280
   python3 tests/_cdp.py --url 'http://localhost:8777/tests/run.html?only=the%20car%20shape%20is%0Aan%20added%20Car%0Athe%20Car%20reads' --width 380
   ```
   Expect 3 green. Then run the full suite as usual through ship.sh.
2. **Phone, 380 and his 440×956.** `$PLAN/verify-car.js` adds a big Car, opens Add → Shape on the Car's page, outlines
   the tile, and returns the icon size.
   ```bash
   python3 tools/shot.py --width 380 --height 800 --js-file $PLAN/verify-car.js --out /tmp/car-380.png
   python3 tools/shot.py --width 440 --height 956 --js-file $PLAN/verify-car.js --out /tmp/car-440.png
   ```
   Look for three things. The car on the stage has two windows and two round hubs, with the wheels as bumps below the
   sill. The tile's car is white on its plate with both hubs open. And `carPoints` is 40 (A), 35 (B) or 39 (C), with
   `aspect` still [1, 1].
3. **PC, 1280×900**: `python3 tools/shot.py --width 1280 --height 900 --js-file $PLAN/verify-car.js --out /tmp/car-pc.png`
   (the icon is 40px there).
4. **Light / dark:** the car has no theme of its own. The editor stage and the Add tiles look the same under either
   Home look, and the sheet's 220px renders already show it on light (`#f4f6fa`) and dark (`#161a21`). There's nothing
   more to check.
5. **Edit Points:** `python3 tools/shot.py --width 380 --height 800 --js-file $PLAN/verify-points.js --wait 900 --out /tmp/car-points-380.png`
   adds a big Car and enters Edit Points with `FM.pointEdit.start` (the call `js/inspector.js` makes). Expect
   `{active: true, layer: true, points: 40}` (A), and in the picture every handle ON the outline with no stray loops at
   the wheel bumps. Not measured in the plan, and the script was written by the review but NOT run (ship.sh was running).
6. **Send him the picture** (#545): `$PLAN/car-options-A-B-C.png` before building if he's awake, or the shipped car plus
   the sheet if built under rule 16. It's 1160×1158, under the 3:1 limit, so it goes as one page.

## 8. Risks and the tests that will break

- **Existing projects change look.** Every unedited Car layer draws from `FM.SHAPE_POLYS.car` at render time, so saved
  projects show the new car. Their box stays square and the new drawing keeps its own proportion inside it (1.833:1
  against 1.841:1 for A), so nothing stretches and the footprint barely moves. A Car he has already point-edited is
  stored in the layer (`layer.subs`) and keeps its old drawing. Both are correct.
- **Tests that break without §6:**
  - `the car shape is car-shaped: level wheels, open holes, nothing below the ground line` (tests.js:15826, item car-shape)
  - `shapes: an added Car renders with ROUND wheels` (tests.js:20215, item car-aspect)
  Both were measured failing on A, B and C (§3). Nothing else in tests.js reads the car (grep of `SHAPE_POLYS.car`,
  `'car'`, `"Car"`, `shape: 'car'`). The `figures: the pictogram head is a true circle…` test only mentions the car in
  a comment.
- **Line numbers will drift.** The builder's tree is moving (tests.js, app.js and index.html were already modified at
  planning time). Anchor on the quoted titles and lines, not the numbers.
- **The menu icon is built once at load** (addmenu.js:351). After shipping, the new tile shows on the next load, which
  the PWA update gives anyway. Anyone prototyping a shape at runtime must redraw the tile; `$PLAN/gen_probe.py` has a
  verified copy of icoPoly for that.
- **Licence.** A is Apache-2.0 and B is MIT. Both are fine to ship, and both need a notice in a *public* release, which
  §5d writes down. C is public domain.
- **A side view is wide**, so at 34px the car is about 25 × 13 px in its tile, smaller-looking than square neighbours.
  That's inherent to a car in profile, and it's the same today. C (front view) is 20 px tall if he prefers presence to
  motion.

## 9. Open questions for Ezra

❓ASK: Car — **A**, **B** or **C**? (Recommended **A**: a side view that can drive across the frame, with wheels that read at the menu's 34px. The sheet is `car-options-A-B-C.png`.) If there is no answer when this item comes up, build A under rule 16 and send the sheet with B and C named.

## Review (26 Sep, plan reviewer — no repo file touched)

Checked against the tree at HEAD v17.04 while v17.05's ship.sh was running (so nothing was run in a browser here).

**Changed in this file / `$PLAN`:**
- **Queue number decided: 961** (REQUESTS.md `961 — The Car shape needs to be improved`). The placeholder was replaced in
  plan.md, `patch-{A,B,C}.js`, `tests_new.js` and `tests_C.js`; the plan's code blocks were re-checked byte-equal to
  those files afterwards. §1 now cites REQUESTS.md #961 (INBOX.md:147 no longer exists — the drain moved it).
- **Line references corrected:** the weak-point comment is 13391–13393 (was 13388–13392); `styles.css:5562` (was
  5488); `index.html:1061` / `1109` (were 1040 / 1088). **app.js is 458 in BOTH HEAD and the tree** (the plan said
  457 vs 456, already bumped) — so §5c now says bump it to 459 when 5b is applied. compositor stays 194 → 195.
  Everything else (13370, 13394–13422/13423, 12991 holeS, 13493 pointCtrl, 13592 buildSubPath, addmenu 82–85/130/351,
  app.js 3124–3131, tests.js 15826–15862 and 20215–20278, BEFORE-PUBLISHING 139–152) was confirmed as quoted.
- **Added a missing gate:** the car-shape retune RENAMES a test, and ship.sh's *no test may vanish* gate refuses that
  without `DROPS TEST:` in the commit message (§5e now says so, with a line to use).
- **Edit Points step made concrete:** new `$PLAN/verify-points.js` (enters Edit Points via `FM.pointEdit.start`, the
  call inspector.js makes). Written, NOT run.
- **B's hang floor:** B measures exactly the 2px floor, noted in §6 so a red there is understood, not chased.
- **Image:** `shots/pc1280-6600.png` is 1280 wide (over the 1200 phone limit), so a 760×900 crop
  `shots/renderscene-sheet.png` was added and §4 points his phone at it. The other three images open, are ≤1200 wide and
  under 3:1, and show what their captions say.
- `verify-car.js`'s header comment claimed it returned the 34px numbers; it does not — comment corrected.
- §5b: for C, also swap "the hubs" for "the headlights".

**Independently re-derived (Python on the data, not the browser):** point/sub-path counts (84 now; 40/35/39), winding
(every body positive, every hole negative), the ink boxes and ratios (A 0.9600×0.5236 = 1.833:1, B 0.5402 = 1.777:1,
C 0.7952 = 1.208:1, now 0.9576×0.5200 = 1.841:1 — all matching the plan once the bezier bulge of C's feet is sampled),
the retuned side-view structural test (PASS on A and B; FAIL on HEAD with the plan's exact 0.541 / 0.710 message; fails
on C as the blob check, as the plan says), and the C variant (PASS on C, FAIL on HEAD with "14 body points have no mirror
partner"). The 34px pixel numbers and the car-aspect test's results remain the planner's in-browser measurements; the
review could not re-run them beside ship.sh. Makes sense on reading: HEAD's hub r = 0.043 × 25.5 = 1.10px → 2.19px
across, matching §3.

**Not this plan's job, but flagged:** the workflow was triggered by his #963 message (the Add menu and layer inspector
shrinking on PC). This plan is for #961 (the Car) only and does not touch #963; that request needs its own plan. And
REQUESTS.md #961 tells the builder to wait for a plan at `tools/design/plans/2026-09-26-<name>/plan.md`. This plan is in
a /private/tmp scratchpad, so whoever hands it over must put it (and `$PLAN`'s patch/test/verify files) where the
builder is told to look.

