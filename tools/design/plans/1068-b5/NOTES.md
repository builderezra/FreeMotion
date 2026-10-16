# #1068 B5 remnant: Radial Shadow Quality/Opacity and Long Shadow reach/edges

Branch `hunt/1068-b5`, based on `ssh/hunt/948-review` (d61c591e). It has two commits, one per pile commit.

**Nothing was run.** A release ship was running on the laptop, so this is code only. `node --check` passed on
js/compositor.js, js/collab-core.js and tests/tests.js. Nothing else ran: no browser, no suite, no prove, no mutate, no fp.js.

## Where the pile commits were

Both are in this repo's object store (`git log --all`): `0876018f` "Expose Radial Shadow quality and opacity" and
`7a2ef677` "Polish long shadow reach and angled edges". Neither is an ancestor of 948-review. Both were ported by hand. The
compositor line numbers had moved a long way, and the land list's fixes change the code anyway. Left out: ChatGPT's
`outside/` reports and its index.html `?v=` numbers. Its tests were rewritten to the repo's conventions rather than pasted.

## 1. Radial Shadow Quality and Opacity (0876018f) → commit a39bfd4c

- **New controls:** Quality (`samples`, 4–32 taps, default 10) and Opacity (`opacity`, 0–100 %, default **78**).
- **Byte-identical, as the land list requires.** Its line: "Set the Opacity default to today's 78%, so a new shadow does not
  get darker unseen". The pile's own default was 100.
  - Each default is exactly the old welded-in value, so a new shadow and a saved one (no keys) draw byte for byte as before.
  - No `legacy:` was needed, because the default is the old look.
  - The render-time fill (`fxFillValue`, which reads `fparam(p, 'opacity', 78`) gives an absent key 10 and 78.
- **The one judgement call: Opacity is read as a share of 256, clamped at 255.** That puts 78 % exactly on the old cap of
  200 (78 × 2.55 = 198.9 → 199, one level lighter than today), and 100 % is still fully opaque.
  - The other options were a fractional default (78.43 on a step-1 slider) or a special case for absent keys. Both are worse.
- **Kernel:**
  - `rsTaps` comes from Quality: clamped 4–32, and NaN falls back to 10.
  - Opacity 0 returns before any work.
  - The #692 skip box does not depend on the number of taps: F runs between 1/(1 + rsK) and 1 whatever the count.

## 2. Long Shadow reach and smooth edges (7a2ef677) → commit 508a9d98

- **Reach:** Length max 80 → 400, and the kernel clamp too. A saved Length can't exceed 80: the import sanitiser clamps
  numbers to the old max.
- **Edges (new, `edges`, Hard / Smooth, `def: 1`, `legacy: 0`). This deviates from the pile on purpose.**
  - The pile replaced the angled march outright, which changed every saved non-45° shadow. The rule for this landing was
    "old projects must render byte-identical, use `legacy:`", so the old march stays as **Hard**.
  - Every saved shadow (no key) stays on Hard.
  - A new shadow gets **Smooth**: the pile's ray model, with the fixes below.
  - At 45° (the diagonal walk), at right angles and on the diagonals, the two are the same picture.
- **The land list's required fixes, each tested:**
  - **The crossed pixel only.** A ray marks a hit only on the one pixel its centre crosses (`floor(pos + 0.5)`, the same
    rounding as the march), never "either neighbour". The neighbour test painted the lit-side halo.
  - **The slope snaps within 1e-9** (to 0 or ±1). Unsnapped, cos 90° = 6e-17 painted a stray band.
  - **Lit-side and cardinal-parity tests:** see below.
- **One more fix the land list did not name: strictly earlier.**
  - A pixel takes shadow only from what its rays crossed on EARLIER lines. Each step paints first and then updates the
    rays, which is the march's k = 1..Length.
  - The pile did it the other way round, so a ray grazing the layer on the same line painted the lit face at up to half
    strength, even with the crossed-pixel fix.
- **Cost:** Smooth is linear in the frame: about (minor + throw + 5) × 2 + minor operations per major step, and one
  Int32Array per call. The old march was frame × Length.

### Known limits (say them with the picture)

- **Shallow angles.** Even with both fixes, the ray model's ±0.5 px feather leaves a faint trace on the ONE line of pixels
  beside a lit face that runs along the throw's major axis.
  - Its worst case is 255 × (0.5 − |slope|): about 19 at 23° and 67°, about 83 at 10°, and about 105 at 5°.
  - It is 0 from about 26.6° off an axis onward, and exactly 0 at right angles.
  - The lit-face test checks the 23°/67° family (LIT1068 = 24). If the picture shows the line at shallow angles, the cure is
    more rays per pixel (2× halves it) or an exact face clip. It is a follow-up, not done here.
- **Hard + a long Length is slow.** The march is O(frame × Length): about 5× today's worst case at 400, and only for someone
  who picks Hard.
  - A safe speed-up exists and is not done: restrict k to the layer's alpha box along the major axis. It is byte-identical,
    because Q leaves the frame monotonically in both axes, so the skipped k can never hit.
- Edges does nothing at 45°, at right angles or on the diagonals. The row still shows there.

## Collab schema

- `C.SCHEMA_REV` 14 → **15**, with a REV note naming both effects' new keys.
- **`C.SCHEMA_FP` is NOT re-measured.** The marker `/* FP TO PIN (1068 B5) */` sits above it. Until it is pinned,
  `921 S1 the schema fingerprint gate` will be red.
- Pin it with fp.js on this tree, or from that test's printout.
- If another unshipped branch also claims rev 15, whichever lands second takes 16 and re-measures.

## Busters

`js/compositor.js?v=220 → 221` and `js/collab-core.js?v=34 → 35`, once for the batch. fx-registry, inspector and styles are
untouched: the rows come from the catalog.

## Tests (all `{ item: '1068' }`, appended to tests/tests.js; the shared helpers are `b5*`, `TOL1068`, `TOL1068A`, `LIT1068`)

| Title | Fails on the base at |
|---|---|
| `1068 B5 Radial Shadow has a Quality and an Opacity, a new one is the shadow it always was, and a saved one is untouched` | "Radial Shadow has no Quality control …" |
| `1068 B5 Long Shadow reaches 400 px, and a saved hard shadow is the old march byte for byte` | "Long Shadow Length still stops at 80 px …" |
| `1068 B5 Long Shadow smooth edges - a new slanted shadow is feathered, its lit faces stay clear, and at right angles and diagonals it is the hard march exactly` | "Long Shadow has no Edges control …" |

- **Every test has controls:** the fixture casts, the caster renders crisp, an 80 px shadow falls short where 150 reaches,
  and Hard has no part-dark pixel.
- **Exact checks run on the kernel,** against the OLD kernel and the OLD march written out in the test (`b5OldMarch`). The
  parity check uses a coloured shadow, so a stray write at alpha 0 still shows.
- **Pixel checks go through `FM.renderScene`** on a white ground, with these tolerances:
  - `TOL1068 = 0`
  - `TOL1068A = 2`
  - `LIT1068 = 24`
  - All three are marked `TODO(first run): measure`.

**Mutations to run** (each with `--only` on the test named):

- `rsCap=Math.min(255,Math.round(Math.max(0,Math.min(100,rsOp))*2.56))` → `…*2.55))`. Expected: the Radial Shadow test, at
  "a saved Radial Shadow (no Quality, no Opacity) no longer draws as the old kernel did" (cap 199, not 200).
- `fparam(p, 'opacity', 78, t)` → `fparam(p, 'opacity', 100, t)`. Expected: "a saved Radial Shadow … no longer draws as the
  old kernel did".
- `if(Math.abs(lsSlope)<1e-9)lsSlope=0; else ` → `` (drop the zero snap). Expected: the smooth-edges test, at
  "at 90 degrees a Smooth Long Shadow is not the hard march" (or at 180).
  - With the crossed-pixel fix, an unsnapped slope only blends a ray 1e-15 away. It writes the colour at alpha 0 where the
    march writes nothing, on the rows where the float drift crosses a pixel boundary (x 50, rows 59-71 of the fixture).
  - So this one depends on float spacing. If it SURVIVES, the snap is belt-and-braces for this kernel rather than dead
    code, and the test comment should say so.
- `var lsA0=lsStep-lsLast[lsIdx]<=lsLen?1:0` with the update loop moved before the paint loop (the pile's order). Expected:
  "the line beside the lit top face … is N dark". Easier as a by-hand revert than a mutate.sh string.
- `{ key: 'edges', label: 'Edges', def: 1, legacy: 0,` → `{ key: 'edges', label: 'Edges', def: 1,`. Expected: "Edges is
  made at 1 with legacy undefined".

## #545: the picture owed before this ships (LAND-LIST: "Send a before/after sheet")

Render through the app, at shipped size and at 2×:

- **Radial Shadow:** Opacity 78 next to 100, and Quality 10 next to 32.
- **Long Shadow:** Hard next to Smooth at 23° and at a shallow angle (5–10°, the known-limit line), plus a 300 px reach.

## Not checked here

The other seven B5 commits (`1db725a6 0df427eb 061581f0 a0732c3d b2ce43ae b986fcc4 cfa3859e`) were not re-audited. The
brief said only these two never landed.

## First run (16 Oct, the builder) — green, then HELD from v17.58

All three tests pass at 1280 and 380 on v17.57 + this branch (fp pinned there at rev 15: 8869560244714722; rev 14 on the same
tree 7476315404611160). Measured through FM.renderScene: jitter 0 everywhere; the lit-face line 13 at 23/67/113/337 degrees,
12 at 157/203, 16 at 247/293.

HELD because the pictures show what the 23/67 family cannot: at a SHALLOW angle (8 degrees, Length 300, a 1080x1920 project,
380 phone, `first-run-zoom.jpg`, x4 nearest from the app's own canvas) Smooth leaves
1. a dotted grey row along the shadow's far END (where Length runs out) — Hard's end is a clean edge;
2. a faint dotted line along the box's lit TOP face (the trace the notes predicted: about 255 x (0.5 - slope), ~90 at 8 degrees).
Smooth is the default for every NEW shadow, so both would be on screen for him. Fix both, add a test at 5-10 degrees that reads
the end cap and the lit face (fails on a39bfd4c..211eaa22 at its own sentence), then land with a before/after sheet (#545).

## Smooth-edge fix (17 Oct, a code-only helper) — NOTHING WAS RUN

A ship was running, and the builder's correction arrived before any measurement. So no node script was run, not even on the
kernel. The only commands were git, grep and `node --check`, which passed on js/compositor.js, tests/tests.js and the script
below. **Every number in this section was worked out by hand from the kernel's arithmetic. None is a measurement.** The real
numbers come from:

    node tools/design/plans/1068-b5/measure-shallow.js <(git show bf1d95a5:js/compositor.js) js/compositor.js

It cuts the longshadow kernel out of each file and runs it on a plain array. It prints these, before and after:

- per angle, the far-end row, its spread, its largest neighbour step, its direction flips, and how far it sits from the march
  averaged over 64 heights per pixel;
- the line beside the lit face, the corner just past it, and anything beyond the lit faces;
- the right-angle parity on the test plate;
- one 1080x1920 timing.

The angles are 5, 8, 10 and 23 degrees, each in all eight orientations.

### The cause

Smooth casts one ray per line of pixels along the throw. A pixel's height spans two gaps between rays: one from the ray below its
centre, one from the ray above. The old blend let each ray's state cover the gap up to its MIDDLE. That is right only for an
edge parallel to the throw, which is what the slanted sides are. The far END and the face turned to the light run a few
degrees off the throw. Against them the gap's middle drifts from pixel to pixel, so the blend saw a sawtooth.

- **Lit face.** The ray just inside the box's top row had crossed the box one line earlier, so the blend gave the pixel above
  up to 0.5 − slope of its strength.
- **Far end.** Each ray runs out of Length at its own quantised step, so the end row took (1 − f) where f is the ray
  lattice's phase. At 5 degrees f goes round a full turn every 11 steps.

### The fix (kernel only, `js/compositor.js`, the Smooth branch of `longshadow`)

- On each line, the gap between two rays is cut by exactly one pixel-row boundary (`lsBeta`). Below the cut, the rays crossing
  the gap shared the lower ray's pixel on that line; above it, the upper ray's.
- So the lit share of a gap with one ray lit reaches as far as the furthest cut among that ray's crossings inside Length. That
  is precisely what the march, averaged over the pixel's height, would shade. (Gaps with both rays lit or both dark are as
  before.)
- Each ray now keeps three more integers:
  - `lsRow`: the row of its last crossing;
  - `lsSeg`: where its current unbroken run in that row began;
  - `lsPrev`: its last crossing in an earlier row.
- From those, `lsOld` (the oldest crossing still inside Length) and `lsNew` (the last crossing, and the one before the row
  changed) give the furthest cut. Which one applies depends on the slope's sign, because within one row the cut moves one way.
- The direction of the brief: neither "clip each ray at the length" nor "stop blending across a lit face". It does both, by
  placing the split where the layer put it.
- **For a rectangle this is exact.** The end row is ONE strength, `255 × (c − row + ½)` with `c = bottom + ½ + slope × Length`.
  The line beside a lit face is 0, past the corner too, because the slanted side edge is exact now. Worked by hand at 5
  degrees: steps 150, 151 and 155 of the test frame each give 0.4986 on the end row, the lit line gives max(0, −slope) = 0,
  and the side edge's start gives slope × 5 = 0.4374 at step 25. The same was worked at 185 degrees (negative slope, the
  reversed march): 0.4986 again.
- **Unchanged:**
  - **Hard** (`edges: 0`, and every saved shadow) is a different code path, not touched.
  - **45 degrees** runs the diagonal walk, not touched.
  - **Right angles and diagonals:** every cut is exactly ½ and every pixel sits exactly on a ray, so the formula collapses to the
    old blend, which is the march. The existing parity test is unchanged.
  - **The slope snap** is kept.
  - **The `cov > 0` write rule** is kept, so a stray colour at alpha 0 still shows to the snap test.
- **Schema:** no param, default or legacy changed, so there is nothing to pin for this fix. `SCHEMA_REV` stays 15, and the
  `/* FP TO PIN (1068 B5) */` from the batch is untouched.
- **Buster:** `js/compositor.js?v=221 → 222` in this worktree. The landing re-bumps over main.
- **Cost:**
  - three more Int32Arrays per call, the size of the existing one;
  - one more ray read per pixel;
  - a closure call only on pixels where neighbouring rays disagree, which means edges.

### Before and after (worked by hand on the test's frame, NOT measured)

The frame is a 40 x 40 box at (20..59, 20..59) on 200 x 120, Length 120, read over the end's interior steps 142..177.

| angle | slope | end row (c) | end row BEFORE (bf1d95a5) | end row AFTER | lit line BEFORE | lit line AFTER |
|---|---|---|---|---|---|---|
| 5 | 0.0875 | 70 (69.999) | sawtooth about 0-22 up to 232-255 | 127 everywhere | about 105 | 0 |
| 8 | 0.1405 | 76 (76.365) | 93-ish up to 255 | 221 everywhere | about 92 | 0 |
| 10 | 0.1763 | 81 (80.659) | 0 up to about 168 | 41 everywhere | about 83 | 0 |
| 23 | 0.4245 | 110 (110.437) | about 111 up to 255 | 239 everywhere | about 19 | 0 |

The 23 degree end was dotted too. Nothing looked at it, because the existing checks read only the lit faces there.

### The new test and its expected failure on bf1d95a5

`1068 B5 Long Shadow smooth edges at shallow angles - the far end is one even row and nothing lies beside a lit face`

- **What it reads:** the kernel, exactly, at 5, 8 and 10 degrees, each in all eight orientations (both axes, all four
  quadrants), in the throw's own frame.
- **Controls:**
  - the read brackets the far end: full two rows inside, clear two rows past;
  - Hard's end, read the same way, is even;
  - the spread read can see a ramp, on the row past the shadow face where the lower edge leaves the corner;
  - the line beside the shadow face is full shadow.
- **Claims:**
  - every row across the end holds one strength, within `CAP1068`;
  - strength never rises going outward;
  - the line beside the lit face (all of it) and the line beside the face the throw leaves from are at most `LITLOW1068`;
  - nothing lies beyond them.
- **Thresholds:** `CAP1068 = 1` and `LITLOW1068 = 0` are placeholders marked `TODO(measure after v17.58)`. By hand the fix
  gives 0 and 0, and bf1d95a5 gives about 230 and about 105 at 5 degrees.
- **Expected failure on bf1d95a5** (by hand, the controls all pass there):
  `at 5 degrees the far end of a Smooth Long Shadow is dotted: along row 70 of its end the strength runs L..H, where the Hard end is one even row`,
  with L about 0-22 and H about 232-255.
- **The existing smooth-edges test:** title and expectations unchanged (`LIT1068 = 24` still holds; the kernel now leaves 0).
  Only its comments now say so. `LIT1068` can drop to `TOL1068A` once a renderScene run confirms it.

**Mutations to run (each `--only` on the new test). The expected results are hand predictions:**

- `var lsTop=lsDown?lsOld(j,st):lsNew(j,st,1);` → `var lsTop=0.5;`, and `var lsBot=lsDown?lsNew(j+1,st,0):lsOld(j+1,st);`
  → `var lsBot=0.5;` (the old blend back).
  - Expected: "at 5 degrees the far end of a Smooth Long Shadow is dotted".
- `var lsBot=lsDown?lsNew(j+1,st,0):lsOld(j+1,st);` → `var lsBot=lsDown?lsOld(j+1,st):lsNew(j+1,st,0);`
  - Expected: the end goes uneven in an orientation where the slope is negative in the kernel's own axes (185, 355, 95 or 265),
    not at 5.
  - At 5 degrees this swap only pulls the upper slanted edge in, and the new test does not read slanted edges.

### Unsure, and the risks

- **Curved shapes.** Per ray only the latest unbroken run in a row and the last crossing in the row before are kept.
  - Where a ray met the layer in more places inside Length (two shapes, a curve it grazes), the split uses fewer crossings than
    the march would. So it only ever shades LESS in that gap, never more.
  - Near the point where a slanted side edge leaves a circle or a letter, that edge may sit up to about a pixel inside where
    the averaged march puts it.
  - None of this was looked at. A circle and a line of text at 8 degrees belong on the sheet.
- **The slanted side edges move slightly.** They are now where the layer's pixel edges put them, not halfway between rays.
  Against bf1d95a5 each slanted edge can sit up to half a pixel differently. The feather is still about one pixel wide.
- **Performance** was not measured. The script prints a 1080x1920, 8 degree, Length 300 timing for the old and new kernel.

### Still owed in the browser (after the ship; #545)

- The script's numbers, and then real values for `CAP1068` and `LITLOW1068`.
- The new test at 1280 and 380, the three existing 1068 tests, and the mutations above.
- A renderScene sheet, before (bf1d95a5) and after:
  - Hard next to Smooth at 5, 8, 10 and 23 degrees, at phone (380) and PC width;
  - the first run's case (8 degrees, Length 300, 1080x1920) zoomed x4 like `first-run-zoom.jpg`;
  - a circle and some text at 8 degrees.
  Send it to him before this lands.
