# #929 clauses 2 and 3 — the heart (hunt/929-heart, on v17.53 a1cb1861)

Code only. **Nothing was run**: no browser, no server, no python, no suite, no slice. The only programs run were
`node --check` (compositor.js, addmenu.js, tests.js: all OK), git, grep, sed and awk. The numbers below come from awk,
using the same curve formula as `FM.pointCtrl` / `FM.buildSubPath`. Neither new test has run. Both carry
`TODO(first run)`.

## His words and the decision

24 Sep: *"the heart, um, in its little icon picture, like before you add it, the like it doesn't look the same as when you
actually add it, and it's also got like these little lines that look funny. Like I don't know how to explain it, but it's
like basically like the line bulges out near the bottom of the heart and doesn't look good."*

- Clause 2: the heart's ICON in the shape picker looks the same as the heart that is actually added.
- Clause 3: the heart's outline has no odd lines and no bulge near the bottom point. A clean heart.

Decided 11 Oct by the PM under #1130: "keep today's heart, with an outline menu picture". That is option A of the 30 Sep
sheet: *today's heart with the bulge fixed (recommended)*, with its tile drawn as an OUTLINE. The geometry used is option A
exactly as drawn: branch `refs/mac-backup/2026-10-07/heads/fm-design-929`, `tools/design/929/hearts.json` → `options.fixed`
(`hearts.py fixed_shipped(0.09)`).

## The bulge, precisely

The heart is eight anchors: tip (0.5, 1), lower flank (0.155, 0.66), widest (0, 0.297), crown (0.297, 0), notch (0.5, 0.18),
then the same mirrored. The fault was in one place: the handle on each **lower-flank anchor**.

- **Old handle:** (-0.02, -0.028). It was 0.034 long, about a fourteenth of the 0.48 run from the tip that it ends. It also
  pointed 54.5 degrees from horizontal, while the line from the tip runs at 44.6, so it was 10 degrees too steep.
- **What that did to the curve:**
  - The side left the tip nearly straight (half-width growing 1.04 per unit of height).
  - Right at the anchor (y = 0.66, 34% of the way up) it turned hard. The tightest bend there is a circle **0.026 of the
    heart's height** across, against about 0.27 on the lobes. Design-sheet figure: curvature 45 against 3.7. That turn is
    a **knee**.
  - Just above it, the curvature changes sign. Going up, the widening slows to 0.72 and then speeds up again to 0.77
    (by 35% of the height), before the side rounds into the lobe.
  - The side therefore pokes out at the knee, has a shallow dent above it, and then swells. That is "the line bulges out
    near the bottom".
  - The old comment above `S.heart` had already seen the dent and called it "a faint flat patch at large sizes".
- **The fix:** each lower-flank handle becomes (-0.0641, -0.0632). The right handle is (-0.0641, +0.0632), because
  traversal reverses on that side. The new handle is 0.09 long and lies along the line from the tip (it is 0.013 degrees off,
  from 4-decimal rounding, and that error bends the convex way).
  - The side now runs dead straight from the tip, then only ever slows as it turns into the lobe: no knee, no sign flip.
  - The tightest bend on the side is now 0.48 of the height.
  - Every anchor, every other handle, the lobes and the notch are unchanged. Proportions are the same: still 1:1, still
    eight points, so Edit Points behaves as before.
- **Half-width check.** The brief's literal test ("the half-width never shrinks going up") passes on BOTH hearts. The old
  side never narrows; it widens unevenly. So test (a) keeps that check and adds the two that actually separate old from
  new: the widening must never speed up again, and the side must never bend tighter than 0.15 of the height.

## The "little lines"

This is **not a seam**. I checked each thing that could make one:

- `FM.buildSubPath` draws the heart as one closed subpath: moveTo at the tip, eight curves, and the last curve lands exactly
  on the tip before closePath. There is no doubled segment and no self-intersection.
- Every shape border in `drawUnit` (js/compositor.js) uses `lineJoin = 'round'`, in the outside, centre and inside
  branches, so there is no miter spike at the notch either.
- The tile uses `ico()`, which also has round joins.

The lines are the same fault as the bulge, seen in two places:

1. **On the added heart:** the knee at y = 0.66 on each side is a crease you can see. A bend 0.026 of the height across is
   about 9 px on a default 360 px heart. With a border, any border wider than about twice that radius folds its inner edge
   over at the knee. That is plausible but not measured.
2. **On the tile:** the tile was a typed-in path with vertical handles at (5.45, 15.04). Each side arrives vertical at the
   flank anchor and then S-bends out to the widest point, which at 1.8 to 2.05 stroke on a 34 px tile reads as a little
   tick. The design sheet calls it "a HAND-TYPED tile path with an S-bend".

## The icon

- Before: `addmenu.js` had a typed-in `d` string. Its comment said it was "GENERATED … Regenerate this the same way if
  S.heart moves again". S.heart did move: its flank handles were tilted from vertical to (-0.02, -0.028). The tile kept the
  vertical handles, so it drifted from the heart beside it by 0.80% of its height. The only thing holding them together
  was a note.
- Now: `{ label: 'Heart', get icon() { return ico('<path d="' + polyD('heart') + '"/>'); } }`.
  - `polyD` is the path-data half of `icoPoly`, split out unchanged. It walks `FM.SHAPE_POLYS.heart` through
    `FM.pointCtrl` into the 18-unit box at (3, 3) in the 24-unit viewBox. That is the same curve the canvas draws, so the
    tile can never drift again.
  - It is a getter, like the library tiles, so it reads the geometry when the menu is drawn.
- **Outline, wrapped in `ico()` on purpose.** `icoPoly(kind, true)` puts `stroke-width="1.8"` on the `<path>`. The PC rule
  `.addmenu-card--ico .addmenu-ic svg { stroke-width: 2.05 }` (styles.css, min-width 701px) sets the width on the `<svg>`,
  and a width on the path beats one inherited from the svg. So `icoPoly` outlines stay at 1.8 on a PC while their
  `ico()` neighbours draw at 2.05. Through `ico()`, the heart keeps exactly the stroke it had: 1.8 on the phone, 2.05 on
  a PC, round caps and joins, the same as Star, Hexagon and the rest.
- The **Squircle** tile already uses `icoPoly(…, true)`, so it is the one outline tile still at 1.8 on a PC. I left it
  alone because it is outside this item. If the thinner Squircle beside Square ever looks wrong to him, that is the cause.
- The box shrinks slightly: the old typed path filled 19 units, `polyD` fills 18, the same as the Star.

## Saved projects

Hearts render from `layer.shape === 'heart'` through `FM.SHAPE_POLYS.heart`, so **every saved project's hearts get the
clean heart**. That is intended: "old projects do not matter" for a cleanup like this.

The exception: a heart that **Edit Points** has already turned into its own path keeps its old shape.
`js/point-edit.js:433` and `js/app.js:1112` set `shape: 'path'` with a copy of the points. It is his drawing now, and it is
not touched. I did not check exactly when that conversion happens (on opening Edit Points, or on the first drag).

The other two hearts in the app are separate geometry and unchanged:
- the 3D Heart effect, `heartPts` in compositor.js;
- Shape Wipe's heart, `b966Heart`.

## Collab schema

**The fingerprint does not move.** `C.schemaFingerprint` (js/collab-core.js) hashes:
- the sanitiser's output on `SCHEMA_FIXTURE` (a text layer);
- the effect and audio-effect parameter tables;
- the op grammar;
- the derived-writer fixture (a rect-default shape and a camera, through `normalizeDerived`);
- the project fixture, `SCHEMA_REV` and `SM_V`.

Shape geometry is not in any of these. So there is no `/* FP TO PIN (929) */`, and fp.js was not run. Two devices on
different builds would draw a heart slightly differently, which is cosmetic: the document is identical.

## Tests (tests/tests.js, appended, both `{ item: '929' }`)

Shared helpers sit just above them:
- `HEART929_OLD`: the v17.53 heart as numbers;
- `rec929`: a canvas stand-in that records the path;
- `flat929`: samples the recorded path;
- `flank929`: measures one lower side;
- `haus929`: the farthest one outline strays from the other.

(a) **`929 the heart has no knee and no bulge on its lower sides …`**
- It traces the heart through `FM.traceShapePath` in its spawn box (`figSpawnBox`) at 400 samples per curve. It walks each
  side from the bottom point to its widest row and checks three things:
  - the half-width never shrinks;
  - the widening never speeds up again: `recover` at most 0.005;
  - the tightest bend is at least 0.15 of the height.
- **CONTROL:** `HEART929_OLD`, sent through `FM.buildSubPath`, must fail both the bulge check and the knee check.
  Otherwise the test throws `CONTROL:`.
- awk estimates:

  | | recover | tightest bend |
  |---|---|---|
  | v17.53 | 0.057 at 35% | 0.026 at 34% |
  | fix | 0 | 0.48 |

- **On ssh/main**, the control is caught and then the app's own heart (the same numbers) fails with "the left side bulges
  … | … has a knee …".

(b) **`929 the Heart tile in the Shape menu is an outline of the heart you actually get …`**
- It renders the real Add menu, opens Shape, and reads the Heart and Star tiles.
- It checks that the Heart tile is an outline: computed `fill: none` and a stroke.
- It samples the tile and the traced heart with `getPointAtLength` (600 points each). Both are centred and scaled to their
  own height, and it takes the farthest distance between them, from each point to the nearest segment, both ways.
- The limit is 0.2%. **CONTROL:** the Star tile must be more than 5% away.
- awk estimates:
  - fix: 0.016%, which is `toFixed(2)` rounding;
  - v17.53: 0.80% (the typed tile against the heart it sat beside);
  - Star: 32%.
- **On ssh/main** it fails with "the Heart tile is not the heart you get: its outline strays 0.80% …". The outline check
  passes there, because the old tile was also an outline.

(c) **Skipped, on purpose.** The brief asked for a test that renders a stroked heart through `FM.renderScene` and finds
stray stroke pixels inside the fill, written so it could fail on today's heart if the lines were a seam. They are not a
seam (see above):
- one closed subpath;
- round joins on every border branch;
- no doubled segment.

With round joins, every stroke pixel lies within half the border width of the outline, by construction. That holds even
where a wide border folds over at the old knee. So no stroke pixel ever sits deeper inside the fill than half the border,
on either heart, and the test would pass on ssh/main. That breaks "each test must fail on ssh/main", and prove.sh would
refuse it. The real fault, the knee and the dent, is a curvature fault, and (a) measures it directly.

Also changed: `index.html` busters `compositor.js?v=219 → 220` and `addmenu.js?v=83 → 84`. sw.js does not list them.
There is no version label or POLISH-LOG entry; the release that lands this adds those.

## What to send him with the release (#545)

He saw option A as a drawing on the 30 Sep sheet. The release should still carry one picture of the real app's output, in
two rows:
- **Row 1, the heart large:** about 600 px, rendered through `FM.renderScene`, v17.53 on the left and the fix on the right.
  Show it filled AND with a white centre border of about 12 px, so the knee at the lower sides is visible on the left and
  gone on the right. A red tick at y = 0.66 on each side of the left heart would help him see where to look.
- **Row 2, the tile at the size it ships:** the real Shape tab's Heart tile at 34 px (PC, 2.05 stroke) and at the phone's
  size (380 wide, 1.8 stroke), old and new, beside its Star and Hexagon neighbours.

Render both through the app (memory: "render the sheet through the app, then show him"), and keep the image under three
times as tall as it is wide, so it reaches his phone.

## Unsure / follow-ups (not done)

- The two thresholds in each test are estimates from awk, not browser measurements. The margins are wide (10 times or more
  on each side), but the first run should confirm them and write the measured numbers into the comments.
- The design sheet also proposed doing the same for the other data-shape tiles that are still typed in (Triangle, Plus,
  Arrow, Chevron, Trapezoid, Parallelogram), with a test that fails if any shape tile is hand-drawn again. That is outside
  clauses 2 and 3, so it is not done here.
- REQUESTS.md was not touched: clauses 2 and 3 are ticked by the loop when this lands.
