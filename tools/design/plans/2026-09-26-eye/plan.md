# Plan — #962 the Eye shape

For the builder. Measured against HEAD `a741b71c` (v17.03); re-checked by the reviewer against HEAD `6eeab60a` (v17.04), where every
quoted line below still matches (only index.html line numbers and app.js's buster moved). `js/compositor.js`, `js/addmenu.js` and
`js/app.js` are unmodified in the working tree; `index.html` and `tests/tests.js` carry another session's uncommitted edits, so
anchor on the quoted TEXT, not the line numbers.
Nothing in the repo was edited to make this plan.
Files next to this plan: `img/` (four pictures), `build.py` (makes the option arrays), `work/` (the probes and raw frames behind
every number here). **Where it lives in the repo:** copy `plan.md`, `build.py` and `img/` to `tools/design/plans/2026-09-26-eye/`
(the path #962's entry names, and the path the §5 source comment cites). `work/` is scratch and stays out of the repo.

**In one line:** replace `S.eye` with a traced pictogram (recommended **B, Bootstrap "eye-fill" almond with a catchlight**). In the
same release, make the Shape-menu icons lazy in `js/addmenu.js`. Measured: the menu has never drawn any shape at its
`SHAPE_ASPECT`, so queue 159's fix never reached the real menu. Change only the eye and its menu icon comes out **taller than it is
wide** (`img/eye-3-menu-pc.png`, last row), which looks worse than today.

---

## 1. His words and his clauses (verbatim, REQUESTS.md #962 / INBOX 26 Sep ~17:43)

> "the eye shape needs to be heavily improved. Also remember your job in this chat is to actually plan these things, not just
> log them. So actually, so when the other chat gets up to it, it actually has a plan that's ready to go and doesn't have to
> come up with everything itself."

His clauses:
1. The Eye shape needs to be heavily improved.
2. (Standing, for the logging chat) Actually plan each request, don't just log it, so the builder has a plan ready to go and
   doesn't have to come up with everything itself. This file is that plan, so clause 2 has nothing to build.

---

## 2. What exists now (quoted from the tree)

`js/compositor.js:13460–13463`, the shape:
```js
    // eye: a lens outline (ring) with a solid pupil — a filled almond alone reads as a leaf
    S.eye = [[[0.055,0.5],[0.5,0.155,1],[0.945,0.5],[0.5,0.845,1]],
             holeS([[0.145,0.5],[0.5,0.235,1],[0.855,0.5],[0.5,0.765,1]]),
             circleS(0.5, 0.5, 0.17, 0.17, 10)];
```
`js/app.js:3135`, the box it spawns in. **This plan leaves it unchanged.**
```js
    squircle: [1, 1], crown: [1.3, 0.85], eye: [1.5, 0.9], pin: [0.82, 1.1],
```
`js/addmenu.js:132`, its place in Add → Shape (unchanged):
```js
    ['gear', 'Gear'], ['crown', 'Crown'], ['eye', 'Eye'], ['note', 'Music note'],
```
`js/addmenu.js:82`: the icon reads the aspect table.
```js
    var asp = (FM.SHAPE_ASPECT && FM.SHAPE_ASPECT[kind]) || [1, 1];
```
`js/addmenu.js:351`: but the Shape tab's options are an array literal, built once when the file loads.
```js
    ].concat(LIB_SHAPES.map(function (s) { return { label: s[1], icon: icoPoly(s[0]), add: shp(s[0], { name: s[1] }) }; })) },
```
`index.html` (HEAD `6eeab60a` lines 1060 / 1066 / 1108; working tree 1061 / 1067 / 1109 — anchor on the text). addmenu.js loads **before** app.js, and app.js is
where `FM.SHAPE_ASPECT` is defined (`js/app.js:3117`):
```html
  <script src="js/compositor.js?v=194"></script>
  <script src="js/addmenu.js?v=80"></script>
  <script src="js/app.js?v=458"></script>
```
`card()` (`js/addmenu.js:1049`) is the only reader of `item.icon`, and it reads it at render time, at line 1067 (line 1591 reads
`t.icon`, which is the TAB's own icon, not an option's):
`ic.innerHTML = item.emoji ? … : item.icon;`

Point format (`FM.pointCtrl`, `js/compositor.js:13493`):
- `[x,y]` is a corner. Both controls sit ON the point.
- `[x,y,1]` is smooth, with the automatic tangent `(next−prev)/6`.
- `[x,y,1,hx,hy]` is smooth, with a MANUAL symmetric handle: `out = p+h`, `in = p−h`, **in the direction of travel**.

So **`holeS()` must not be used on manual-handle points.** It reverses the point order but not the handles, so every handle would
point backwards. The options below are written out already wound: the body runs clockwise (positive shoelace with y down) and the
holes run anticlockwise, the same way `S.car` and `S.person` are written.

---

## 3. Findings (measured)

How the numbers were taken: `FM.traceShapePath` → `fill()` in the running app, which is the same call `figMask` makes in
`tests/tests.js`. Pixels count as ink at alpha > 127, and parts are 4-connected. Runs went through `tools/shot.py` with the probe
`work/probe_head.js` (`eyeStats`). "Spawn box" means 512×307, which is what `figSpawnBox('eye')` gives for
`SHAPE_ASPECT.eye = [1.5, 0.9]`.

**F1: the pupil is not round, and the white around it is not a ring.** The pupil is `circleS(0.5,0.5,0.17,0.17)` in the UNIT box,
and the box is 5:3, so on the canvas it is an ellipse.

| spawn box 512×307 | ink parts / enclosed whites | pupil px | pupil aspect | white above pupil | white beside pupil | beside ÷ above | lid ink above the white |
|---|---|---|---|---|---|---|---|
| **Now** | 2 / 1 | 174×105 | **1.657** | 29 | 94 | **3.24** | 24 |
| A Classic | 2 / 1 | 116×115 | 1.009 | 39 | 38 | 0.97 | 48 |
| B Almond + catchlight | 2 / **2** | 132×131 | 1.008 | 26 | 26 | 1.00 | 53 |
| C Lashes | 3 / 2 | 108×107 | 1.009 | 21 | 21 | 1.00 | 93 (a lash) |

At the menu-icon box drawn at the eye's own aspect (51×31 device px):
- Now: pupil 17×11, whites 3 above and 9 beside.
- A: 11×11, 4 and 4.
- B: 13×13, 3 and 3, and its catchlight still counts as a separate enclosed white.
- C: 11×11, 2 and 2.

C's third "part" at 512 is one lash tip that anti-aliases into a detached pixel (see Risks).

**F2: the Shape menu has never drawn a shape at its aspect, so queue 159's fix never reached the real menu.** The probe compared
each real tile's path `d` with a copy of `icoPoly` fed `{}` (square) and with one fed the real table. At 440 wide on the phone and
at 1280 on PC, **all 16 tiles probed matched the SQUARE copy**, including the 13 whose `SHAPE_ASPECT` is not square (`work/p440.out`, `work/pc.out`,
`drawnIn`). The Eye tile's path starts `M3.99 12.00 C3.99 12.00 9.33 5.79 12.00 5.79`. Its top is at y 5.79 and its bottom at
18.21, which puts the eye in an 18×18 box. Drawn at its own aspect, the same path would be `… 12.00 8.27 …` in an 18×10.8 box.

The cause, read from the tree: the Shape tab's `options` is an array literal (`addmenu.js:351`), built when addmenu.js loads, before
app.js has defined `FM.SHAPE_ASPECT`. `icoPoly` therefore falls back to `[1, 1]`. It has been like this since the #159 release
itself: `git show 0f29035d:index.html` has the same load order and the same eager array. `tests/_shapedrift.html`, the page that
"measured" #159, re-implements `icoPoly` with its own aspect table and never loads addmenu.js or app.js. It measured the copy, not
the menu.

Measured icon-ink / spawned-ink aspect for each tile on HEAD (1.000 = right):
Check 0.811, Cloud 0.676, Thumbs up 0.921, Pointing hand 1.139, Banner 0.437, Silk ribbon 0.438, **Key 2.056**, Envelope 0.559,
Map pin 1.341, Lock 1.139, Crown 0.656, **Eye 0.598**, Music note 1.112. Gear is 1.000 (square on purpose; the control).
With the §5 step 2 fix simulated, all 14 fall between 0.995 and 1.006.

What this means here: if only `S.eye` changes, the menu squeezes the new eye (drawn for a 5:3 box) into a square. Measured on PC,
B then draws **24×28 px, taller than it is wide**, with a 13×21 pupil in the 51×51 phone box (`work/pc.out`, `sq.eyeB`). So the
lazy-icon fix belongs to this change. It is not an optional extra.

**F3: the icon size, measured on the frames (white ink of the Eye tile's icon):**

| | phone 380 & 440 (34 px svg), CSS px | PC 1280 (40 px svg, 1x) |
|---|---|---|
| Now (drawn square today) | 22 × 17 | 26 × 20 |
| Now, at its real aspect | 22 × 10 | 24 × 12 |
| A | 21 × 14 | 24 × 16 |
| **B** | **20.5 × 14** | **24 × 16** |
| C | 17 × 12.5 | 20 × 13 |
| B with no menu fix | (13×21 pupil at 51×51) | 24 × **28** |

**F4: licences.**
- Google Material Icons `visibility`: Apache-2.0.
- Bootstrap Icons `eye-fill`: MIT.
- Fluent Emoji `Eye`: MIT. Only the catchlight's position comes from it.

None of these needs attribution in the app's UI; the source comment records where each shape came from. The sources were read from
the published packages on jsdelivr: `@material-design-icons/svg@0.14.13/filled/visibility.svg`,
`bootstrap-icons@1.11.3/icons/eye-fill.svg`, and `gh/microsoft/fluentui-emoji/assets/Eye/Flat/eye_flat.svg`.

I checked Material, Bootstrap, Lucide, Tabler, Phosphor, Heroicons, Ionicons and MDI: none has a permissively licensed OPEN eye with
lashes. C's lashes are therefore our own drawing on top of B's traced lid, and the comment says so.

**F5: the trace is faithful.**
- **B is exact** in the app's format. Bootstrap's lids leave the corners with no handle (its `s` command has nothing to reflect), so
  its corners are true `[x,y]` corners and its tops carry the SVG's own `(±5, 0)` handles.
- **A needed a refit.** Material's lids leave the corners along a handle, and a corner point here cannot carry one. I refitted it
  with one top handle (a Nelder-Mead fit on the quarter curve). The worst deviation is 0.057 of 22 units, **0.26 % of the eye's
  width**. Adding a middle anchor per quarter did not help (0.060), so A stays at four anchors.

---

## 4. Options

All three keep `SHAPE_ASPECT.eye = [1.5, 0.9]` and fill 94 % of the box's limiting side; the old eye used 89 % of its width. Each
is drawn so its iris and pupil are true circles in the spawned box. The app rendered every picture: the big ones through
`FM.traceShapePath`, the small ones as the real Add-menu tile with its real neighbours.

| Picture | What it shows | Size |
|---|---|---|
| `img/eye-1-big-220px.png` | Now / A / B / C at 220 px wide (2x), B marked Recommended | 760×1330 |
| `img/eye-2-menu-phone.png` | The phone Shape page holding the Eye (Map pin, Lock, Gear, Crown beside it), device pixels. **380 rows:** only the Eye tile swapped, drawn at its real aspect; its neighbours are as the menu draws them today. **440 rows (his phone):** every icon after the §5 step 2 fix, so "440 Now" is today's eye at its real aspect, not what he sees today | 1170×1368 |
| `img/eye-3-menu-pc.png` | The same on PC (inspector Add panel, 1x, shown 2x), including "B with no menu fix" | 920×1044 |
| `img/eye-4-shape-tab-before-after.png` | The §5 step 2 fix on every aspect shape: today (square) vs the proportions they spawn at | 1180×1104 |

**A: Classic.** Google Material Icons `visibility`, Apache-2.0. A solid almond with blunt tips, a wide white iris ring and a solid
pupil. It is the most familiar eye glyph there is ("show password"). Its ring is 9 % of the eye's width, so it holds up best at 1x
on PC. It reads more as a UI icon than as a drawing.

**B: Almond + catchlight (Recommended).** Bootstrap Icons `eye-fill`, MIT, with the catchlight placed the way Fluent Emoji `Eye`
(MIT) places its highlight. Why it is recommended:
- It is the only option whose lids come to real points, which is what tapered lids means.
- It is an exact trace, with zero fitting error.
- The catchlight makes it look like an eye rather than a glyph when it is big, and the catchlight still shows as its own white at
  34 px (2 enclosed whites at 51×31, measured).
- It has 16 points in four sub-paths (lids, iris, pupil, catchlight), and each is a part someone would actually grab in Edit Points.

Its white ring is the thinnest of the three: 6 % of the width, which works out from the geometry to about 2.6 device px on the phone icon (computed, not measured). It stayed open at every size
measured.

**C: Lashes.** B plus five curved lashes, drawn by us. It is the most decorative option and the most like a person's eye. The lashes
cost it width, though. Its ink is 1.19:1, so in the same box the eye itself is about 20 % smaller than B (17 against 20.5 px wide on
the phone icon). At 34 px the lashes read as a fringe of spikes, which looks a lot like the Crown next to it. It has 31 points in
nine sub-paths, which is heavier to point-edit.

B against A: A is the better *icon*, but B is the better *shape*. People put this in a video and scale it up, and B is the one that
still looks drawn at 1080 px.

B against C: C's lashes make the eye smaller and busier at the menu size. It is also easier for him to add lashes with the draw tool
than to remove them from a shape.

---

## 5. The exact change

Two app files, plus the busters in `index.html`. **Ship steps 1 and 2 in the same release.** Step 1 on its own makes the menu icon
worse (F2).

### Step 1: `js/compositor.js`, replace the eye (option B)

Anchor, the exact current text at lines 13460–13463:
```js
    // eye: a lens outline (ring) with a solid pupil — a filled almond alone reads as a leaf
    S.eye = [[[0.055,0.5],[0.5,0.155,1],[0.945,0.5],[0.5,0.845,1]],
             holeS([[0.145,0.5],[0.5,0.235,1],[0.855,0.5],[0.5,0.765,1]]),
             circleS(0.5, 0.5, 0.17, 0.17, 10)];
```
Replace it with:
```js
    /* EYE — redrawn (queue 962). His words, 26 Sep: *"the eye shape needs to be heavily improved."* The old one was a thin almond
       ring around a pupil drawn as a circle in the UNIT box — and the box it spawns in is 1.5 x 0.9, so the "round" pupil rendered as
       a 1.66:1 ellipse and the white beside it was 3.2x wider than the white above it (measured at 512x307).
       Traced from Bootstrap Icons "eye-fill" (MIT, github.com/twbs/icons): a pointed almond whose lids leave the corners with no
       handle — so the corners are true corners here and the tops carry the SVG's own (±5, 0) handles, exactly — a white iris ring
       (r 3.5 of a 16-wide eye) and a solid pupil (r 2.5). The catchlight is ours, up-left of the pupil where Fluent Emoji's "Eye"
       (MIT, github.com/microsoft/fluentui-emoji) puts its highlight. Option B of three; plan and build.py in tools/design/plans/2026-09-26-eye/.
       Drawn in the reference's own units, then mapped into the 5:3 box with x scaled by 0.6 against y, so every circle is a circle
       in the SPAWNED box; SHAPE_ASPECT.eye is unchanged, so eyes already in projects keep their proportions.
       Each sub-path is written already wound — lids clockwise, iris ring anticlockwise, pupil clockwise, catchlight anticlockwise —
       because holeS() reverses the ORDER of points but not a manual handle's direction, which would turn every handle backwards. */
    S.eye = [
      [[0.0898,0.5],[0.5,0.03,1,0.2564,0.0],[0.9102,0.5],[0.5,0.97,1,-0.2564,0.0]],                                                // lids
      [[0.5,0.2009,1,-0.0991,0.0],[0.3205,0.5,1,0.0,0.1652],[0.5,0.7991,1,0.0991,0.0],[0.6795,0.5,1,0.0,-0.1652]],                  // iris ring (hole)
      [[0.5,0.2864,1,0.0708,0.0],[0.6282,0.5,1,0.0,0.118],[0.5,0.7136,1,-0.0708,0.0],[0.3718,0.5,1,0.0,-0.118]],                    // pupil
      [[0.4615,0.3654,1,-0.0234,0.0],[0.4192,0.4359,1,0.0,0.0389],[0.4615,0.5064,1,0.0234,0.0],[0.5038,0.4359,1,0.0,-0.0389]],      // catchlight (hole)
    ];
```
If he picks **A**, use the array below. Then delete the catchlight line (`if (s.topo.holes < 2) …`) from test 1, because A has no
catchlight. The comment should say: Google Material Icons "visibility", Apache-2.0, github.com/google/material-design-icons; lids
refitted to one top handle, worst deviation 0.26 % of the width.
```js
    S.eye = [
      [[0.0864,0.5],[0.5,0.03,1,0.3102,0.0],[0.9136,0.5],[0.5,0.97,1,-0.3102,0.0]],
      [[0.5,0.1867,1,-0.1038,0.0],[0.312,0.5,1,0.0,0.173],[0.5,0.8133,1,0.1038,0.0],[0.688,0.5,1,0.0,-0.173]],
      [[0.5,0.312,1,0.0623,0.0],[0.6128,0.5,1,0.0,0.1038],[0.5,0.688,1,-0.0623,0.0],[0.3872,0.5,1,0.0,-0.1038]],
    ];
```
If he picks **C**:
```js
    S.eye = [
      [[0.1645,0.5856],[0.5,0.2012,1,0.2097,0.0],[0.8355,0.5856],[0.5,0.97,1,-0.2097,0.0]],
      [[0.5,0.341,1,-0.0811,0.0],[0.3532,0.5856,1,0.0,0.1351],[0.5,0.8302,1,0.0811,0.0],[0.6468,0.5856,1,0.0,-0.1351]],
      [[0.5,0.4109,1,0.0579,0.0],[0.6048,0.5856,1,0.0,0.0965],[0.5,0.7603,1,-0.0579,0.0],[0.3952,0.5856,1,0.0,-0.0965]],
      [[0.4686,0.4755,1,-0.0191,0.0],[0.434,0.5332,1,0.0,0.0318],[0.4686,0.5909,1,0.0191,0.0],[0.5031,0.5332,1,0.0,-0.0318]],
      [[0.299,0.3967],[0.2574,0.3426,1],[0.2189,0.273],[0.2706,0.307,1],[0.3259,0.343]],
      [[0.3848,0.2972],[0.3574,0.2051,1],[0.3362,0.1031],[0.3796,0.1814,1],[0.424,0.2635]],
      [[0.478,0.2501],[0.4868,0.1401,1],[0.5,0.03],[0.5132,0.1401,1],[0.522,0.2501]],
      [[0.576,0.2635],[0.6204,0.1814,1],[0.6638,0.1031],[0.6426,0.2051,1],[0.6152,0.2972]],
      [[0.6741,0.343],[0.7294,0.307,1],[0.7811,0.273],[0.7426,0.3426,1],[0.701,0.3967]],
    ];
```
`build.py` (in this folder) generates all three arrays: `python3 build.py`. It prints A's fit error and every sub-path's winding
sign, and writes `opts.json`. Keep it with this plan so the arrays can be regenerated, the same way the people had theirs.

### Step 2: `js/addmenu.js`, build the Shape icons when the menu renders, not when the file loads

Anchor, the exact current text at line 351:
```js
    ].concat(LIB_SHAPES.map(function (s) { return { label: s[1], icon: icoPoly(s[0]), add: shp(s[0], { name: s[1] }) }; })) },
```
Replace it with:
```js
    ].concat(LIB_SHAPES.map(function (s) {
      /* A GETTER, or #159 never reaches the menu (queue 962). This array is built when addmenu.js loads, and index.html loads
         addmenu.js BEFORE app.js — which is where FM.SHAPE_ASPECT is defined — so icoPoly read undefined, fell back to [1, 1],
         and every shape icon was drawn in a SQUARE from the day #159 shipped: the Eye tile measured "M3.99 12.00 … 12.00 5.79",
         an 18x18 box, against the 18x10.8 its own aspect gives (Key was 2.06x too tall, Banner 0.44x too thin). The probe that
         checked #159 (tests/_shapedrift.html) re-implements icoPoly instead of reading the menu, so it never saw this.
         card() reads item.icon at render time, long after app.js has run. */
      return { label: s[1], get icon() { return icoPoly(s[0]); }, add: shp(s[0], { name: s[1] }) };
    })) },
```
Nothing else reads an option's `icon` (grep finds only `card()`'s line `js/addmenu.js:1067`; the Shape tab's options are read only
through `render()` at line 1219, and by the suite's `_tabs()` walks, which read `.label`), so the getter changes nothing except when the
icon is built. The LIB_SHAPES table itself is untouched, and the #484 ribbon test greps its source text, so keep it that way. The
Squircle tile (`icoPoly('squircle', true)`, line 324) is square anyway and stays as it is.

### Step 3: `index.html` cache-busters (ship.sh refuses without them)
- `js/compositor.js?v=194` → `?v=195`, or the current value + 1 if it has moved.
- `js/addmenu.js?v=80` → `?v=81`, or the current value + 1.
- The version label, the POLISH-LOG line and the REQUESTS summary stamp as usual.
- In the POLISH-LOG line, write `queue 962` and nothing else as `queue NNN`. Write #159 as `#159`: ship.sh's queue-claim gate treats
  `queue 159` as a claim this release closes, and that would demand a proving test for #159.

---

## 6. The proving tests

Append these just before the final `})();` of `tests/tests.js`. They use the suite's own helpers (`figMask`, `figTopo`,
`figSpawnBox`, `offscreen`, `sleep`), the same way the #929 people tests do. The same code is in `work/test_final.js`.

```js
  /* ═══ QUEUE 962 — THE EYE, TRACED FROM A REAL PICTOGRAM, AND THE SHAPE MENU AT ITS REAL PROPORTIONS ════════════════════════
     His words, 26 Sep: *"the eye shape needs to be heavily improved."* The old eye was a thin almond ring around a pupil drawn as a
     circle in the UNIT box — and the box it spawns in is 1.5 x 0.9 (SHAPE_ASPECT.eye), so the pupil rendered as a 1.66:1 ellipse and
     the white beside it was 3.2x wider than the white above it (512x307: pupil 174x105, white 94px beside vs 29px above). Now it is
     Bootstrap Icons' "eye-fill" (MIT) with a catchlight, drawn so that its circles are circles in the SPAWNED box.
     The menu half: the Shape tab's icons were built when addmenu.js loads, before app.js defines FM.SHAPE_ASPECT, so every shape icon
     was drawn in a square (queue 159 never reached the real menu). The new eye, drawn for 5:3, would have come out TALL there. */
  function eyeParts(w, h) {
    const f = figMask('eye', w, h), m = f.m, N = w * h, lab = new Int32Array(N), st = new Int32Array(N), boxes = [];
    for (let i = 0; i < N; i++) {
      if (!m[i] || lab[i]) continue;
      const id = boxes.length + 1, b = { x0: w, y0: h, x1: -1, y1: -1 };
      let sp = 0; st[sp++] = i; lab[i] = id;
      while (sp) {
        const p = st[--sp], x = p % w, y = (p - x) / w;
        if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y;
        [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1].forEach(function (q) {
          if (q >= 0 && m[q] && !lab[q]) { lab[q] = id; st[sp++] = q; }
        });
      }
      boxes.push(b);
    }
    // the pupil is the SMALLEST ink part whose box holds the centre of the shape's box
    const holding = boxes.filter(function (b) { return b.x0 <= w / 2 && b.x1 >= w / 2 && b.y0 <= h / 2 && b.y1 >= h / 2; })
      .sort(function (a, b) { return (a.x1 - a.x0) * (a.y1 - a.y0) - (b.x1 - b.x0) * (b.y1 - b.y0); });
    const P = holding.length > 1 ? holding[0] : null, topo = figTopo(f);
    if (!P) return { topo: topo, P: null };
    const cx = Math.round((P.x0 + P.x1) / 2), cy = Math.round((P.y0 + P.y1) / 2);
    let y = P.y0 - 1; while (y >= 0 && !m[y * w + cx]) y--;
    let x = P.x1 + 1; while (x < w && !m[cy * w + x]) x++;
    return { topo: topo, P: P, pw: P.x1 - P.x0 + 1, ph: P.y1 - P.y0 + 1, gapTop: P.y0 - 1 - y, gapSide: x - P.x1 - 1 };
  }

  test('962 the eye has a round pupil in an even white ring, with a catchlight — in the box it spawns and at the menu-icon size', { item: '962' }, function () {
    const box = figSpawnBox('eye');
    /* The icon: the Shape tab's svg is 34px and icoPoly draws the eye in 18 of its 24 units at SHAPE_ASPECT, so at the phone's 2x
       the eye's box is 51x31 device pixels (measured 26 Sep: svg 34x34 at 380 and 440 wide). Tolerances from measurement:
       the new eye reads 1.008:1 and 1.00x at the spawn box and exactly 1:1 / 1.0x at 51x31; the old one 1.657:1 / 3.24x and 1.55:1 / 3.0x. */
    [[box.w, box.h, 'a ' + box.w + 'x' + box.h + ' render of the ' + box.raw + ' box it spawns in', 0.05, 1.3], [51, 31, 'the 51x31 menu icon', 0.2, 1.6]].forEach(function (c) {
      const s = eyeParts(c[0], c[1]), where = c[2];
      // POSITIVE CONTROL: a pupil standing clear of the lids inside an enclosed white. Without it the ratios below could pass on a
      // drawing that has no pupil at all.
      if (s.topo.components < 2 || s.topo.holes < 1 || !s.P) throw new Error('at ' + where + ' the eye renders ' + s.topo.components + ' ink part(s) and ' + s.topo.holes + ' enclosed white(s) — the pupil does not stand clear of the lids');
      const asp = s.pw / s.ph;
      if (Math.abs(asp - 1) > c[3]) throw new Error('at ' + where + ' the pupil renders ' + s.pw + 'x' + s.ph + ' (' + asp.toFixed(2) + ':1) — an ellipse, so it was drawn round in the unit box and stretched by SHAPE_ASPECT.eye');
      if (!(s.gapTop > 0) || s.gapSide / s.gapTop > c[4]) throw new Error('at ' + where + ' the white beside the pupil is ' + s.gapSide + 'px and above it ' + s.gapTop + 'px (' + (s.gapSide / Math.max(1, s.gapTop)).toFixed(2) + 'x) — the iris is not an even ring');
      // B: the catchlight is a second enclosed white, and it survives at the icon size (measured: 2 holes at 51x31)
      if (s.topo.holes < 2) throw new Error('at ' + where + ' the eye has ' + s.topo.holes + ' enclosed white(s) — the catchlight in the pupil is missing or has closed up');
    });
  });

  test('962 every Shape-menu icon is drawn at the proportions its shape spawns at — the #159 aspect reaches the real menu', { item: '962' }, async function () {
    /* Measured 26 Sep: the real Eye tile's path began "M3.99 12.00 C3.99 12.00 9.33 5.79 12.00 5.79" — mapped into an 18x18 SQUARE,
       because addmenu.js built the Shape tab's icons when it loaded, before app.js had defined FM.SHAPE_ASPECT. The labels below are
       the library shapes whose SHAPE_ASPECT is not square; Gear is square on purpose — THE CONTROL, which agrees before and after,
       so a disagreement elsewhere is the menu and not this measurement. */
    const KIND = { 'Banner': 'banner', 'Silk ribbon': 'ribbon', 'Cloud': 'cloud', 'Check': 'check', 'Thumbs up': 'thumbsup',
      'Pointing hand': 'pointhand', 'Envelope': 'envelope', 'Key': 'key', 'Crown': 'crown', 'Eye': 'eye', 'Map pin': 'pin',
      'Lock': 'lock', 'Music note': 'note', 'Gear': 'gear' };
    const inkAsp = function (draw, w, h) {
      const c = offscreen(w, h), g = c.getContext('2d'); draw(g);
      const d = g.getImageData(0, 0, w, h).data; let x0 = w, x1 = -1, y0 = h, y1 = -1;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 127) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      return x1 < 0 ? NaN : (x1 - x0 + 1) / (y1 - y0 + 1);
    };
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-10000px;top:0;width:340px;height:620px';
    document.body.appendChild(host);
    const bad = [], seen = [];
    try {
      FM.addMenu.render(host, { variant: 'panel' });
      await sleep(80);
      const tb = host.querySelector('.addmenu-tab[data-key="shape"]');
      if (!tb) throw new Error('the Add menu has no Shape tab to read');
      tb.click(); await sleep(80);
      [].slice.call(host.querySelectorAll('button')).forEach(function (b) {
        const kind = KIND[b.title]; if (!kind) return;
        const path = b.querySelector('.addmenu-ic svg path'); if (!path) return;
        // 40x: a thin icon (Banner is 41px tall at 10x) quantises by up to 5% at 10x; at 40x it is under 1.5%
        const icon = inkAsp(function (g) { g.scale(40, 40); g.fill(new Path2D(path.getAttribute('d'))); }, 960, 960);
        const box = figSpawnBox(kind);
        const real = inkAsp(function (g) { FM.traceShapePath(g, { shape: kind }, 0, 0, box.w, box.h); g.fillStyle = '#000'; g.fill(); }, box.w, box.h);
        seen.push(b.title);
        // 3%: measured 26 Sep, at their aspect every icon agrees within 0.6%; the nearest wrong one (Thumbs up, drawn square) is 7.9% off
        if (!(Math.abs(icon / real - 1) <= 0.03)) bad.push(b.title + ' (icon ' + icon.toFixed(2) + ':1, spawns ' + real.toFixed(2) + ':1)');
      });
    } finally { host.remove(); }
    if (seen.length < 12 || seen.indexOf('Eye') < 0 || seen.indexOf('Gear') < 0) throw new Error('only found ' + seen.length + ' of the shape tiles (' + seen.join(', ') + ') — the labels moved, so this is not measuring the menu');
    if (bad.some(function (s) { return /^Gear /.test(s); })) throw new Error('the CONTROL disagrees — Gear is square both ways, so the measurement is broken, not the menu: ' + bad.join(' | '));
    if (bad.length) throw new Error('these Shape-menu icons are not drawn at the proportions the shape spawns at: ' + bad.join(' | '));
  });
```

**Why they fail on HEAD and pass after: checked in the app, not argued.** `work/probe_dry.js` loads the four helpers exactly as they
appear in `tests/tests.js`, registers both tests as written above, and runs them in five states. The menu fix was simulated at
runtime with the same getter placed on the live `FM.addMenu._tabs()` options. The source edit itself has not been run.

| state | test 1 (the eye) | test 2 (menu aspect) |
|---|---|---|
| **HEAD** | **FAIL**: "…the pupil renders 174x105 (1.66:1) — an ellipse…" | **FAIL**: 13 shapes off, from 0.437 (Banner) to 2.056 (Key); Gear control 1.000 |
| B shape only | PASS | **FAIL** (the same 13) |
| **B + menu fix** | **PASS** | **PASS**; every ratio between 0.995 and 1.006 |
| A + menu fix | fails only on the catchlight line (expected; delete that line for A) | PASS |
| C + menu fix | PASS | PASS |
| old eye + menu fix | FAIL (pupil 1.66:1) | PASS |

The two tests are independent: each one is caught only by its own half of the change. So `tools/prove.sh`, which reverts both
source files to HEAD, sees both fail for the right reason. The tolerances come from measurement:
- Test 2 uses **3 %**: after the fix the measured spread is ≤ 0.6 %, and the nearest wrong icon on HEAD (Thumbs up) is 7.9 % off.
- Test 1's pupil-aspect limit is **5 %** at the spawn box: B measures 1.008 and HEAD measures 1.657.

One problem was caught while writing this: a first draft of test 2 put a `// comment` in the middle of the line that pushes to
`bad`, which silently deleted the push. The table above comes from the corrected text, re-run.

---

## 7. Verification

1. **Suite:** `?only=962` at desktop and at `--width 380`, then the full suite through ship.sh as usual. Test 2 calls `figSpawnBox`
   14 times. I did not time it on its own; both tests, in all five dry-run states, finished inside one `shot.py` call.
2. **Phone, 380×900 and his 440×956:**
   - Open `#add-fab`, go to the Shape tab, and scroll to the last page.
   - The Eye tile should show the almond with its ring and catchlight at 5:3, not stretched tall.
   - Compare with `img/eye-2-menu-phone.png` (440 rows).
   - The other aspect shapes should now be at their real proportions. Compare with `img/eye-4-shape-tab-before-after.png`.
   - Tap Eye: the layer should land with a round pupil.
3. **PC, 1280, nothing selected:** in the inspector Add panel's Shape tab, check that the Eye icon's ring is still open at 1x
   (`img/eye-3-menu-pc.png`, the B row).
4. **Light and dark:** the icon is `currentColor` on the tile tint, so it follows the theme. Check the Shape tab once in each theme on
   the phone. The big shape takes the layer's own fill, so it needs no theme work.
5. **Edit Points on a new Eye:** it should show 16 handles (4 each for the lids, iris, pupil and catchlight). Drag the top lid's
   handle: the curve should follow and the holes should stay holes.
6. **An eye saved before this release:** make one on HEAD, then reload on the new build. It should keep the same box and show the new
   drawing with a round pupil, because `SHAPE_ASPECT.eye` did not change.

---

## 8. Risks, and tests that could move

- **Every existing Eye layer changes how it looks on reload.** There is no legacy switch, as with the car (v5.33) and the people
  (#929) redraws. Its box is unchanged, so nothing is distorted. A layer he has already converted with Edit Points keeps its own
  path and does not change.
- **Step 2 changes 13 menu icons at once:** Banner, Silk ribbon, Cloud, Check, Thumbs up, Pointing hand, Envelope, Key, Crown, Eye,
  Map pin, Lock and Music note. Boat and Car are square and stay the same. This is what #159 said it already did, so it restores his
  own request rather than inventing a new look. It is still a visual change he has not seen, so `img/eye-4…` goes to him with the
  eye options (his rule: never ship a visual he has not seen).
- **Wide shapes get smaller icons:** a 5:3 shape now fills 18×10.8 of the 24-unit box instead of 18×18. Measured on the phone's Eye
  tile, B's ink is 20.5×14 CSS px against 22×17 for today's squashed eye (F3). If Banner or Ribbon look too thin, the lever is
  icoPoly's `18`, which would be a separate item. The aspect is not the lever.
- **Existing tests.** Grep finds none that pin the eye (`grep -n "SHAPE_POLYS.eye" tests/tests.js`: nothing; the `.th-eye` hits
  are the timeline's visibility button). Tests that read Add-menu icons are all unaffected:
  - `every Add-menu tile is a DRAWN icon, never an emoji (queue 543)` checks for svg vs emoji, and only checks geometry on AI Scene
    and Sample clip.
  - `shape tiles keep their big icons; only the labelled cards are trimmed` measures the svg element's box, not the path.
  - The #484 ribbon test reads `FM.SHAPE_ASPECT.ribbon` and greps addmenu.js for
    `"['banner', 'Banner'], ['ribbon', 'Silk ribbon']"`. That table text stays intact.
  - `tests/tests.js:13499` calls `t.options()` inside a try/catch. The Shape tab's options stay an array, so its behaviour does not
    change.
- **C only:** at some sizes one lash tip anti-aliases into a detached pixel (3 ink parts at 512 wide). Test 1 asserts `≥ 2` parts,
  so this does not make it flaky. **Decided: if C is picked, ship the C array exactly as given** — one sub-pixel speck at a lash tip
  is invisible at any size he uses, and re-drawing the lash tips would be an unmeasured change the plan did not render for him.
- **Manual handles in Edit Points:** manual-handle circles are already used by the person and woman heads and by the car's wheels.
  Edit Points and keyframed point sets already handle `[x,y,1,hx,hy]`, so no new code path is involved.
- **`tests/_shapedrift.html` stays misleading:** it still measures a copy of icoPoly. **Decided: in this same release, add one HTML
  comment as the first line inside its `<head>`:** `<!-- ⚠️ queue 962: this page measures its OWN copy of icoPoly, never the real
  menu — it is how #159's miss went unseen. The real check is the "962 every Shape-menu icon…" test in tests/tests.js. -->`
  It is a dev-only page (no `?v=`, no gate), so the comment costs nothing; making it load the real menu is not worth doing, because
  test 2 now measures the real menu.

---

## 9. Questions for Ezra

- ❓ASK: Which eye: **A** Classic, **B** Almond + catchlight, or **C** Lashes? *(Recommended: **B**. It has pointed lids, a
  catchlight that still shows at menu size, and it is an exact trace.)* All three arrays are in §5. If he is asleep or has not
  answered when the item comes up, the builder decides under LOOP.md rule 16 ("when he is asleep, decide"): ship B and send
  `img/eye-1…` and `img/eye-4…` with A and C named as the alternatives.
- Not a question, but send it with the picture: the Shape menu will now show every shape at its real proportions. #159 promised this
  and it never reached the menu (`img/eye-4-shape-tab-before-after.png`). His #159 words, "make them 1-1", already decide it.

---

## Review (skeptical pass, 26 Sep, against HEAD `6eeab60a` v17.04)

Checked, and it holds:
- Every quoted source line exists verbatim: `S.eye` (compositor.js 13460–13463), `SHAPE_ASPECT` (app.js 3117, eye at 3135), the
  LIB_SHAPES row (addmenu.js 132), `icoPoly`'s aspect read (82), the eager Shape-tab map (351), `card()`'s icon line (1067), the
  Squircle tile (324), the #484 grep string (tests.js 83410) and the try/catch'd `t.options()` (tests.js 13499).
- The B array was re-derived by hand from Bootstrap's `eye-fill` path: corners, ±5 top handles, iris r 3.5, pupil r 2.5, catchlight,
  the 0.6 x-scale, every handle's direction of travel and every sub-path's winding (nonzero: lids +1, ring −1, pupil +1, catchlight −1,
  so the catchlight is white). It matches `opts.json` from `build.py`.
- All five snippets (B, A, C, the step 2 getter, both tests) parse in JavaScriptCore; the getter returns `icoPoly(kind)` at read time.
- The tests' helpers are in scope where they are appended: one IIFE (tests.js 14 → the final `})();`), `offscreen` 31, `figMask`
  13877, `figTopo` 13885, `figSpawnBox` 14026, and a top-level function `sleep` at 22585 (hoisted). The plan's test text is identical
  to `work/test_final.js`, the text that was dry-run.
- Fail-on-HEAD / pass-after reasoning holds from the code: HEAD's pupil is `circleS` in the unit box → 1.66:1 in the 5:3 spawn box
  (test 1 fails on the aspect line, after its positive control passes); HEAD's menu builds every icon before `FM.SHAPE_ASPECT` exists
  (test 2 fails on 13 shapes while its Gear control agrees). Each test is caught only by its own half of the change.
- Images: all four open, are ≤1200 wide and under 2× tall, and show what the plan says.

Changed in this file:
1. Header: HEAD has moved to `6eeab60a` (v17.04); said so, and that every quoted line still matches.
2. index.html: line numbers corrected (HEAD 1060/1066/1108, working tree 1061/1067/1109) and `app.js?v=457` → `?v=458`.
3. `card()` is at addmenu.js:1049 (1067 is its icon line); `FM.pointCtrl` is at compositor.js:13493 (was "~13490"); noted line
   1591's `t.icon` is the tab's icon so the "only reader" claim stays true.
4. Said where the plan must land in the repo (`tools/design/plans/2026-09-26-eye/`: plan.md, build.py, img/), because the §5 source
   comment cites that path and nothing told the builder to put it there.
5. `img/eye-2` description: the 380 rows swap only the Eye (neighbours as today); the 440 rows are after the menu fix, so "440 Now"
   is not what he sees today.
6. Two open choices decided: C ships as given (no re-drawn lash tips); `tests/_shapedrift.html` gets a one-line warning comment in
   this release, with the exact text.
7. The ❓ASK fallback now names LOOP.md rule 16 correctly ("when he is asleep, decide") and says which pictures go with it.

Not covered by this plan (flagged, not fixed): the message that triggered this run is **#963** (PC Add menu + inspector shrinking,
five clauses). This plan is #962 only; #963 needs its own plan before anyone builds it.
