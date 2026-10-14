# #966 §B28 — Radio Waves (hunt/fxnew-radiowaves, refers to #545)

Branch `hunt/fxnew-radiowaves` (helper clone, local, NOT pushed), worktree `~/fm-helper-wt/fxnew-radiowaves`, on `fb24f68b`
(hunt/fxnew-drums, the §B chain tip). Backlog `tools/design/plans/2026-09-29-idle-backlog/backlog.md` §B28: *x, y, rate, speed,
lifetime, width, fade, shape Circle / Square / Polygon + sides, spin, colour, blend*.

**NOTHING WAS RUN.** The API builder was live, so no node, no python, no browser — not even `node --check`. Every claim below is
from reading the code and from hand arithmetic. The proof is written and waiting: `scratchpad/agents/fxnew-radiowaves/prove.sh`
(results to `prove-result.txt` beside it), described at the end.

## Not built before — checked

- `git show ssh/main:REQUESTS.md | grep -i "radio wave\|ripple rings\|concentric\|pulse rings"`: nothing. POLISH-LOG on ssh/main: only
  unrelated hits (the word "concentric" in old entries). No `radiowaves` type anywhere in `js/` on this tree.
- **ChatGPT's pile has one** (`tools/design/chatgpt-tasks/pile/LAND-LIST.md` §B6): `410a34d1` *Add Radio Waves generative effect*, with
  `1b80bf41` (keep it anchored when the preview is cropped) and `8516f675` (keep ring births across a keyed Rate). Never landed. It was
  read for reference only; this build is fresh and **supersedes all three — drop them when the pile's B6 batch is landed.** Differences
  that matter: the pile multiplied Speed by age (a keyed Speed jumps every ring), drew with `stroke()` (the soft canvas cannot draw it),
  had no Start full, no Draw modes, and its Rate fix searched with a fixed 20-step bisection.
- **Not Shockwave.** Shockwave (batch 32, Warping) is ONE pressure ring that *bends the picture under it* (displacement + rim light +
  chroma split) and moves only when you keyframe its Radius. Radio Waves *draws its own rings*, a new one every 1 / Rate seconds, by
  itself, and bends nothing. Different job, different category; the search words keep `shockwave` for Shockwave.

## What was built — one Generative canvas effect, `radiowaves`, "Radio Waves"

| Row | Range (default) | What it does |
|---|---|---|
| Centre X / Centre Y | 0–100 % of the frame (50 / 50) | where the rings come from |
| Waves per second | 0–10 /s (1.5), keyframable | how often a ring leaves; **0 sends one ring, at the clip's start** |
| Speed | 0–1000 px/s (200), keyframable | how fast each ring travels (its corners, for a polygon) — project px |
| Lifetime | 0.1–10 s (3) | how long each ring lives |
| Width | 1–200 px (10), `unit: 'px'` | the outline's width — project px; greyed for Filled |
| Fade out | 0–100 % (100) | the share of its life a ring spends fading out (100 = fades all the way, 0 = full strength, then gone) |
| Waves | Outlines / Filled | rings, or solid discs/shapes (newest on top) |
| Shape | Circle / Square / Polygon | Square is flat-sided; a Polygon stands on a corner (first corner straight up) |
| Sides | 3–12 (6) | Polygon only |
| Rotation | −180–180° (0) | Square / Polygon only |
| Spin | −360–360 °/s (0), keyframable | Square / Polygon only — **each ring turns as it travels** (After Effects' generator does the same) |
| Colour | One colour / Rainbow | Rainbow: each ring its own hue, 40° on from the one before (not used by Cut from the layer) |
| Wave colour | #39c6ff (a bright sky blue) | One colour only |
| Blend | Normal / Add / Screen | Over the layer only |
| Draw | Over the layer / Behind the layer / Instead of the layer / Cut from the layer | where the rings go; Cut from shows the layer only inside the rings |
| First frame | Empty / **Already full** | Already full (default): the emitter has been running before the clip, so it opens with rings already out |

How it behaves, by construction (`js/compositor.js`, the block before `FM._FX_TABLES`):

- **Stateless and integrated.** Ring n leaves when the emitter's count ∫ Rate (from the clip's first moment) reaches n; it has travelled
  ∫ Speed since; it has turned ∫ Spin since. Keyframed, each is integrated (`FM.integrateProp`, batch 2's F1 rule), so a keyed Rate never
  re-times or inserts a ring already out, a keyed Speed never jumps one, and a Rate keyed to 0 lets the rings already sent fly on. The
  keyed birth moment is found by bisection to a nanosecond (a flat stretch at exactly n must give its START, which Newton can miss). Plain
  values are the closed forms n / Rate and Speed × age, byte-stable. Nothing carries between frames; no `Math.random`.
- **The clip's own clock** (`FM.fxLocalTime`): a split or trimmed clip keeps its rhythm. Already full holds Rate and Speed at their
  first-frame values for the time before the clip.
- **Project px, scaled to the plate**: Width and Speed × the plate scale; the centre is a share of the FRAME placed through the plate's
  own origin (`__fmOX/__fmOY`), so the 0.28 phone plate draws the export shrunk, padded plates keep the rings in place and a zoomed preview
  draws them where the export does (913.5).
- **Fills only**: an outline is outer shape minus inner shape, filled even-odd — for a polygon exactly the mitred stroke of its centre
  line. No `stroke()`, no `ctx.filter`, no `roundRect`.
- **Runs whatever the layer covers** (`CFX_NO_BBOX`): on a transparent layer, or one off the frame, the rings still draw.
- Search words: radio waves, radio, rings, ripple rings, pulse, pulse rings, signal, sonar, radar, ping, concentric, circles, broadcast,
  wifi, heartbeat. Browser tile: the Generative plate, Speed 30 / Width 3 / 1.2 a second (fx-thumbs OVERRIDES — the real defaults are
  for a 1080 frame and would leave a 96 px tile in a third of a second). Inspector "changes nothing" reason (NOOP_WHY). A seam,
  `FM._radioWaveRings(params, t, t0)`, lists the live rings (the sheet probe prints them).
- Files: js/compositor.js, js/fx-registry.js (CATEGORY_OF batch 48, SEARCH_ALIASES), js/fx-thumbs.js (OVERRIDES), js/inspector.js
  (NOOP_WHY), index.html busters — **compositor 224 → 225, fx-registry 28.36 → 28.37, fx-thumbs 59 → 60, inspector 422 → 423**.
  **C.SCHEMA_FP / SCHEMA_REV left alone**: the new params move the fingerprint, so `921 S1 the schema fingerprint gate` is red on this
  branch until it is re-pinned in the gap; prove.sh stage 6 prints the number.

## Names (#954)

"Radio Waves" is not in either Alight Motion list (`tools/design/954-effect-names.md`) and is not a trademark — it is a plain
description. **But it is also the name of After Effects' own generator** (Generate → Radio Waves). The Time Echo precedent avoided
plain "Echo" partly for that reason. Kept, because it is the backlog's name and the plain phrase for the thing; alternatives are in
the questions. The type id `radiowaves` never shows. Not "Pond Rings" (#954's proposed rename for Circular Ripple).

## Departures from the backlog line, and why

- **Added**: Rotation (a static square or diamond needs it — Spin alone cannot hold one still at 45°), Waves Outlines / Filled (the
  "fills" variants), Draw (four places, Lightning's "Draw on" idea grown up — a logo with waves coming out from behind it is the
  classic use), First frame (asked for), Colour One / Rainbow.
- **Spin is per ring** (each ring turns as it travels), not the whole pattern; the whole pattern turns with a keyframed Rotation.
- **Speed is the corners' speed** for a Square or Polygon (the ring's corner distance is Speed × age), so every shape reaches the same
  Speed × Lifetime and a Square's sides sit at that × cos 45°.

## The tests — 9 new, all `'966 B28 …'`, appended before the final `})();`

Each asks `_b28Need()` first (registry entry, then `FM._FX_TABLES.CANVAS_FX.radiowaves`), so on fb24f68b every one fails with
"no registry entry for radiowaves — the effect is not built" — never a TypeError. The rings are measured along RAYS out of the centre
(each crossing's weighted middle and its peak), which holds in Chrome's antialiased canvas and the node soft canvas alike.

1. **In the list**: Generative, POSTFX, CFX_NO_BBOX, not a pixel kernel; search words; described; the 17 rows in order and their
   defaults; ranges and units (Width the only px key); every gate (Width by Waves, Sides / Rotation / Spin by Shape, Colour by Draw,
   Blend by Draw, Wave colour by Colour); every option label; offered on a shape, not on an adjustment layer; the load sanitiser keeps a
   fresh one whole; leads the NEW row behind only newer effects; on a 360 × 640 frame's FIRST frame the defaults change > 3000 px and a
   bare instance draws byte-for-byte what a new one draws (CONTROL: First frame Empty changes only the centre dot, 1–399 px).
2. **Radii**: 2 a second, 100 px/s, 2 s life, 1.3 s in → crossings at 30, 80, 130 and 180 px along 0°, 90°, 180°, 270° and 200°;
   along the diagonal nothing at 230 (past its life); Empty → 30, 80, 130; Speed 50 → 15, 40, 65, 90; 1 a second → 30, 130; Rate 0
   → one ring at 130 (and at 50, 0.5 s in); Centre 25 % / 75 % moves them round (100, 300); a clip starting at 2 s draws at 3.3 s what
   one starting at 0 draws at 1.3 s.
3. **Fade and Lifetime**: Fade 100 → peaks 85, 60, 35, 10 % of 255 (±8), strictly fainter outward; Fade 50 → 100, 100, 70, 20 %;
   Lifetime 1 s → only 30 and 80 (CONTROL: Fade 0 reads ≥ 245 on all four).
4. **Shape**: one ring with corners at 150 px — Circle 150 at five angles; Square C45 across its sides at 0°, 90°, −90° and 150 on the
   diagonals; Rotation 45 makes a diamond; hexagon corner up (150 at −90° and 30°, 129.9 at −60° and 0°), turned 30°; triangle (75 across
   its flat sides); Filled circle and square solid from the centre to 150 / 106.1.
5. **Keyframes** (hold keys at 1 s): Speed 100 → 300: 0.99 s → 49 … 299, 1.01 s → 53 … 253 (every ring 4 px on), 1.5 s → 150, 200, 250,
   300; Rate 2 → 4: 1.6 s → 10, 35, 60, 110, 160, 210, 260 (n / rate(now) would show 85 and 135), 0.99 / 1.01 s continuous; Rate 2 → 0:
   the sent rings fly on (60 … 260); Spin keyed 0 → 180 °/s at 0.25 s turns a square 45° by 0.5 s (corner at 50 px; CONTROLS: plain 90 °/s
   gives the same, plain 0 gives 35.4); Rate, Speed and Spin keyed FLAT draw within 6 pixels of the plain numbers.
6. **Stateless**: 1.6 s after 0.3, 2.7 and 1.1 s is byte-identical, kernel and compositor, with Rate, Speed and Spin keyed (CONTROL: 1.6
   vs 1.7 s differ).
7. **The plates**: on a 400 × 300 project, circles and spinning pentagons at 0.5 and 0.28 — every ring crosses where the export's does
   (within 0.75 / scale + 0.5 project px) and the picture is within **`B28_PLATE_TOL` = 5 levels — A GUESS, marked TODO: set it from the
   first run's numbers** (prove.sh 3b prints them) of the export shrunk by area; positive controls must exceed 1.5 × the bound: a plate
   that drew Speed and Width in plate pixels, and the plate half a ring-spacing late.
8. **Draw, Blend, Colour**: on a half-red layer, the four Draw modes at four points (on / between rings, over red / over nothing); Add
   (249, 246, 255) and Screen (206, 209, 255) against Normal's colour over red; Wave colour green; Rainbow neighbours differ, solid.
9. **Every slider moves something** — the canvas twin of 'no effect slider is completely inert' (which walks only PIXEL_FX): each of the
   ten sliders, unlocked by its own gate, changes ≥ 20 px across its travel on one of three moments.

**Shared tests edited** (the merge agents' newest-first form, `radiowaves` at the front): E1's `LATER` (+ radiowaves, last), 745's
`NEWEST_FIRST`, 913.8's `NEWER` (now seventeen newer than Snow & Rain — still the "twelve newest, Snow & Rain out" branch). The NEW row
becomes radiowaves, clarity, audiospectrum, filmdamage, shapewipe, colorflash, hslmixer, tonecurve, colorwheels, starglow, timeecho, popart
(censor leaves). 747, '966 B2 / B15 / B7 / B26' need nothing: they ask "behind only effects registered after it".

**The sweeps, read against it (not run)**: queue 264 — no extreme erases the layer (the layer is always drawn under Over; Instead of
and Cut from both draw rings at t = 0.5 on that fixture), so **no ALLOWED entry**. 784 — a bare instance is its defaults. Zero means zero
— every key read through `fparam` (`== null`). 913.5 — the plate is the comp, the centre placed through the plate origin. The inert and
482-visible sweeps walk only PIXEL_FX / WARP_FX, so they never see a canvas effect: test 9 is its own sweep. **Every slider moves
something on one of the three moments 0 / 0.33 / 0.71 s** by reading: x, y (the centre moves); Rate (ring count); Speed (radii);
Lifetime (which rings live, and their fade); Width (Outlines); Fade; Sides (Polygon); Rotation and Spin (Square — the Already full rings
have different ages, so Spin shows even at 0 s).

## The sheet — `render-probe.js` (next browser slot)

Through `FM.renderScene`, each tile a 1080 × 1080 project drawn at a quarter (the phone's own reduced-plate path), each row one setting
as a strip of four moments (0, 0.4, 0.8, 1.2 s), POSTed to `'http://127.0.0.1:' + window.__recv + '/<name>.jpg'`, a FRESH Image for
every photo tile:
- `radiowaves-rings.jpg` — defaults (recommended), First frame Empty, slow / fast, thick / hairline, Fade 0 / 40, a single wave,
  Filled, Rainbow, centre low.
- `radiowaves-shapes.jpg` — square, diamond, spinning square, triangle, hexagon (recommended for a polygon), octagon, 12 sides,
  spinning hexagon, spinning thick triangle, filled rainbow pentagon, rainbow squares, filled squares.
- `radiowaves-layers.jpg` — over his clouds photo: Normal (recommended), Add, Screen, white Add; a round logo with the waves over it and
  Behind it; Instead of; Cut from the layer (outlines, filled, hexagons).

## Questions for Ezra (one picture each)

1. **The starting look** — the defaults row (recommended), or another row of `radiowaves-rings.jpg`? (Rate, Speed, Width, Fade.)
2. **First frame** — Already full (recommended: a clip never opens on an empty frame) or Empty (the first wave leaves the centre)?
3. **The name** — Radio Waves (built; also After Effects' name for its generator), **Signal Rings**, or **Sonar Rings**?
4. **Draw's four choices** — keep all four (built), or fold Cut from the layer away to keep the panel short?
5. **Colour default** — sky blue #39c6ff (built), or white?
6. **Follow the layer?** The centre is a share of the FRAME, like Shockwave's and Lens Flare's. Should there be a "Centre on: the layer"
   choice, so waves follow a moving logo by themselves? Not built (it would need the layer's world position at each moment).

## What prove.sh checks (WRITTEN, NOT RUN)

Refuses to start, and stops between stages, while a ship, a lock run or a live API builder is going (scratchpad `gapcheck.sh`). Node at
nice 19 only; python only for the two tree checks.
1. `node --check` every changed js; tests.js parses; the probe parses as an async body; no CRLF; `git diff --check`; no mode change.
2. The 9 new tests on fb24f68b's js: 9 FAIL, each naming the missing effect, none a TypeError.
3. The same on this branch: 9 PASS. 3b: the plate test with `B28_PLATE_TOL` forced to −1, printing every measured number.
4. Neighbours on both trees, the same verdicts: the generators (Starfield, Clouds, Lightning, `482 11.`, `986 C7`, `690 Clouds`,
   `690 Lightning`, `966 B11 `), Shockwave's raised-ceiling sweep, 784, queue 264, 482 visible, inert, zero-means-zero, the sanitiser
   sweep, 793, the featured-carousel gate, E1, 745, 913.8, 913.5 and the `966 B26 ` tests (all with this branch's tests.js).
5. The three edited shared tests' ORIGINAL bodies on this branch's js: E1 and 745 FAIL (why they were edited; 913.8 needs the DOM, so it
   is FAIL / NOT RUN in node on both trees whatever).
6. The collab fingerprint of both trees (the number to pin; SCHEMA_FP untouched here).
7. `treecheck.py fb24f68b HEAD`, `drops.py fb24f68b HEAD`.

Still owed after it: Chrome at 900 and 380 (`?only=966%20B28`, and 913.5 / 913.8 / 745 / 747 / 784 / queue 264), the plate bound set from
measurement, the sheets, and the fingerprint pinned with the rest.

## Merge notes (other §B agents built from the same base)

- `index.html`: every §B branch bumps compositor / fx-registry / fx-thumbs / inspector from 224 / 28.36 / 59 / 422 — re-bump once above
  all of them when merging.
- `fx-registry.js` CATEGORY_OF: each branch appends its batch after clarity's line and moves "The newest, so it leads the NEW row" to its
  own; number the batches in merge order and keep `filter: 'stylize'` last. SEARCH_ALIASES: append.
- `tests.js`: the E1 / 745 / 913.8 lists — union by hand, newest batch first; the B28 block is self-contained (helpers `_b28*`,
  `B28_PLATE_TOL`).
- `compositor.js`: the B28 block sits after clarity's, before `FM._FX_TABLES`; it pushes onto `FM.EFFECTS` — the effect pushed LAST
  leads 913.8's "newest registered effect", so the merge order of the blocks must match CATEGORY_OF's.
- The pile's `410a34d1`, `1b80bf41`, `8516f675` are superseded by this — drop them from LAND-LIST §B6.

## Unsure / worth a second look

- Nothing ran. Every expected number in the tests is hand arithmetic. If one is red on the first run, read its numbers before touching
  the kernel; the ray measures carry ±0.25 px of sampling bias by design (tolerance 1.5).
- `B28_PLATE_TOL` = 5 is a guess (soft canvas aliasing ≈ 3 levels at 0.28 by hand); the two controls are estimated at 30+ levels.
- The keyed-flat test allows 6 stray pixels (AA rounding at a 1e-7 px edge shift); if Chrome shows more, read the max level first.
- Cost: one even-odd fill per ring (at most ~100 at 10 a second × 10 s); a keyed Rate adds ~34 short integrations per ring. Unmeasured
  on his phone.
- The Draw segment's four long labels wrap to two lines of buttons on a phone (`.fx-seg` wraps) — check at 380.
