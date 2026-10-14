# #966 backlog §B30 — Circle Array on `hunt/fxnew-circarray` (15 Oct)

Built on `fb24f68b` (the §B chain tip, hunt/fxnew-drums). Spec: `tools/design/plans/2026-09-29-idle-backlog/backlog.md` §B30 ("count
2–36, radius, start, face centre, scale step, spin, spiral, fade").
**Nothing was run** — no node, no browser, not even `node --check` — because the API builder was live. The proof is written and
waiting: `prove.sh` in the helper's scratchpad (below). His rule (#545) is that he picks the look before anything ships; the build
did not wait, so every choice on the sheet is already an option on the effect. His pick sets defaults; nothing gets rebuilt.

## Why this and not a duplicate (the check the brief asked for first)
- **Ring Array (`radialrepeat`, once "Radial Repeat")** is the only repeater that sounds the same, and its description even says
  "Repeats the layer in a ring around the centre". It is a **pixel warp** (`WARP_FX.radialrepeat`, with a GPU shader): it folds the
  frame into Segments wedges about a hub and every wedge shows what the seed wedge holds — a kaleidoscope. A layer sitting on the hub
  (the usual case) folds into a rosette of its own middle; it never becomes whole copies at a distance. A fold maps each output pixel
  to ONE source pixel, so it cannot overlap copies, fade them, scale them, keep them upright or place them at a radius — no option
  row on it could become this. (queue 264's own note on it says the same: "Ring Array repeats one seed wedge around the hub".)
- **Trail** (`linearrepeat`) lays real copies on a line; **Scatter Array** at seeded random places; **Tile Grid / Mirror Tile** on a
  lattice; **Honeycomb** (`hexarray`) is a hexagon pattern, not copies at all. Nothing lays whole copies round a circle.
- REQUESTS.md / POLISH-LOG.md on ssh/main: "circle array", "radial repeat", "circular repeat", "ring of copies" find only Ring Array's
  own history (its seam fix in v9.02, its speed-ups, its #484 rename) — no earlier attempt at this. So B30 was built.

## What was built

| Where | What |
|---|---|
| `js/compositor.js` (`CA_ROWS`, `CANVAS_FX.circlearray`, `FM._circleArrayCopies`, just before `FM._FX_TABLES`) | type `circlearray`, **Circle Array**, Repetition, beside Trail and Scatter Array |
| `js/fx-registry.js` | CATEGORY_OF **batch 48** (`circlearray: 'repeat'`, last, so it leads the NEW row; clarity's comment no longer claims it), search words |
| `js/fx-thumbs.js` | OVERRIDES `circlearray`: the card at a third of its size and Spin 60 °/s, so the tile shows a turning ring, not a blob |
| `js/inspector.js` | the does-nothing-here reason (every copy lands on the layer: Radius 0 with Face centre Off) |
| `index.html` | busters: compositor 224 → **225**, fx-registry 28.36 → **28.37**, fx-thumbs 59 → **60**, inspector 422 → **423** |
| `tests/tests.js` | nine `966 B30 …` tests; the shared lists (below) |

### Controls (defaults in bold)
- **Copies** 2–36 (**6**), evenly round the circle; the first at Start angle.
- **Radius** 0–100 % (**30**) — of the frame's SHORTER side. ⚠️ **Not px, on purpose**: the ring then means the same on any project
  size, the 0.28 phone plate draws the export's ring shrunk by construction, and scaling the layer down shrinks the copies, not the
  ring (Lens Magnifier's Size and Bulge's Radius follow the same rule). 100 % stops where the queue 264 card still shows its top copy.
- **Start angle** −180–180° (**0**), clockwise; 0 puts the first copy straight up.
- **Face centre** Off / **On** — On turns each copy by its angle so its top points straight out from the middle (the copy at the top
  stays upright, the one at the bottom is upside down); Off keeps every copy upright.
- **Scale step** 50–150 % (**100**) — each copy this size of the one before (copy k = step^k, about its own middle; capped at 64×,
  a copy under 1 % is not drawn).
- **Spin** −360–360 °/s (**0**) — turns the whole ring on the clip's own clock; keyframed it is **integrated** (`FM.integrateProp`,
  batch 2's F1 rule), so a keyed Spin turns on from where the ring is and never jumps it; plain it is Spin × the clip's time.
- **Spiral** −100–100 % (**0**) — how much further out the LAST copy sits, as a share of the frame's shorter side, spread evenly over
  the copies (copy k at Radius + Spiral × k / (Copies − 1)). Below 0 it winds inward; a copy that would pass the middle stops AT it.
- **Fade** 0–100 % (**0**) — copy k at 1 − Fade × k / Copies, so even at 100 % the last copy is faintly there (1 / Copies).
- **Original** **Hidden** / In the middle. Hidden is the default because the ring IS the layer here: Trail and Scatter keep their
  original because their copies grow out of it, but in a ring it would sit on the hub and cover the inner ends of the copies at a small
  Radius. In the middle draws it on top. (Cheap, so it is an option rather than a decision.)

### How it draws (the brief asked to say)
A **canvas** effect like Trail and Scatter Array (copies of the layer drawn with `drawImage` under a transform — no pixel kernel, no
`ctx.filter`): routed by POSTFX, handed the layer's box (NOT in CFX_NO_BBOX — an empty layer has nothing to repeat).
- **The middle** is the layer's EXACT alpha box (`exactBoxOf`, a read-back of the loose box only): the dispatcher's fast box carries
  plate pixels of slack, which would put a half-size preview's ring somewhere other than the export's (Pop Art's measured lesson).
  Where the frame cut the layer off, the box is carried out to the layer's own edge (`layerAABB`, Trail's #986 C27 rule).
- **The source** is `moverSource` (#986 C27): a layer half off the frame repeats whole. Copies wholly off the plate, under 1 % or
  fainter than 1/510 are skipped (and never asked of the expanded plate).
- Deterministic and stateless: nothing carried between frames, no `Math.random`; the clock only through Spin and keyframes.
- A seam, `FM._circleArrayCopies(params, t, tl, cx, cy, short)`, lists where each copy goes (the sheet probe prints the defaults').
- Search words: circle array, circular array, radial array, circle repeat, ring of copies, copies around, around, circular, clone,
  copies, wreath, flower, rosette, mandala. Not 'repeat around' / 'circular repeat' (Ring Array's), not 'kaleidoscope'
  (Kaleidoscope's), not 'petals' (Snow & Rain's).
- **Name**: "Circle Array" is the backlog's name; it is in neither Alight Motion list `tools/design/954-effect-names.md` was built from,
  and is a plain description, not a trademark. ⚠️ It sits close to **Ring Array** (the wedge fold) — see question 2.

## The tests (each fails on fb24f68b on its first line: "no registry entry for circlearray — the effect is not built")
The copies are measured as **blobs** of a small two-colour bar (8 × 24, green top third, red below) on a transparent plate: a blob's
alpha-weighted middle is where its copy sits, its strongest alpha how strong it is, and the line from its red middle to its green
middle which way its top points and (by its length) how big it is. Those hold in Chrome and the soft canvas alike; only the plate bound
is a guess.
1. **`966 B30 Circle Array is in the effects list …`** — Repetition (CONTROL: Scatter Array is), routed, canvas only, not CFX_NO_BBOX,
   search words, description, the nine controls in order with ranges / units / defaults, keyframable sliders, no px control, option
   labels, offered on a shape and not on an adjustment layer, kept whole by the load sanitiser, heads the NEW row behind only newer
   effects, a bare one = a new one, and at its defaults a 60 × 90 card on a 360 × 640 frame changes ≥ 20 000 px (about 37 800 by hand)
   — CONTROL: Radius 0 + Face centre Off changes ≤ 50 (every copy on the card).
2. **`966 B30 Copies n lays n copies evenly …`** — 2, 3 (Start 40), 6, 12 (upright), 5 (Radius 20, Start −90), 7 (Radius 40, Start
   150): exactly n blobs, each within 1 px of centre + R·(sin θ, −cos θ), each the whole 192 px bar (±8 %); on a 300 × 200 frame 30 %
   is 60 px (the shorter side); Hidden leaves the hub clear, In the middle adds the bar there (CONTROL: the plain fixture is one 192 px
   blob at (100, 100)).
3. **`966 B30 Face centre On turns each copy …`** — 8, 5 (Start 45) and 3 (Start −100): On points each copy's top along its angle
   (± 4°), Off straight up (± 2°), red-to-green 12 px ± 1 either way (CONTROL: the plain bar points up, 12 px).
4. **`966 B30 Scale step, Spiral and Fade …`** — Scale step 85 % of five (24, 20.4, 17.3, 14.7, 12.5 px red-to-green on a double bar,
   ± 1) and 120 % of three, every middle still on the ring; Spiral 30 % from 15 % puts copy k at 60 + 24k px, Spiral −50 % from 45 %
   at 180, 113.3, 46.7 and the last AT the middle (not 20 px past it); Fade 60 % of five peaks at 255, 224, 194, 163, 133 and Fade
   100 % of four at 255, 191, 128, 64 (± 3).
5. **`966 B30 Spin …`** — Spin keyed 0 then 180 °/s from 1 s (a hold key): the first copy is turned 0° at 0.99 s, 1.8° at 1.01 s, 90°
   at 1.5 s and 180° at 2 s (Spin(now) × time would give 181.8° and 270° — CONTROL: plain 180 °/s at 1.5 s IS at 270°); −90 °/s turns
   anticlockwise; a clip starting at 2 s draws 3.5 s what a clip starting at 0 draws at 1.5 s, byte for byte (CONTROL: 3.5 s into the
   clip differs); Spin 40 keyed flat = plain 40 (≤ 6 px).
6. **`966 B30 the same instant …`** — 1.6 s after 0.3, 2.7 and 1.1 s is byte-identical with Spin and Radius keyed, in the kernel and
   through FM.renderScene (CONTROL: 1.6 vs 1.7 s differ).
7. **`966 B30 on a phone’s reduced preview plate …`** — through FM.renderScene on a 400 × 300 project (a 40 × 80 card), six facing out,
   and eight upright with Scale step 90, Spiral 20, Fade 50, Spin 40 and the card kept: the 0.5 and 0.28 plates within
   **`B30_PLATE_TOL` = 5, a GUESS marked TODO(first run)** of the export box-averaged down; both CONTROLS (the ring drawn at the export's
   size on the plate; the ring turned half a spacing) must exceed 1.5 × the bound, and the measured numbers lead the failure message
   (prove.sh 3b forces the bound to −1 to print them).
8. **`966 B30 a keyframed Copies, Radius, …`** — each of the six plain sliders keyframed draws at 0.4, 1.0 and 1.7 s exactly (max diff 0)
   what its value there draws plain (CONTROL: 0.4 and 1.7 s differ for each).
9. **`966 B30 every Circle Array slider changes the picture …`** — the canvas twin of the inert sweep: each of the seven sliders,
   across five points of its travel, moves ≥ 20 px on one of 0 / 0.33 / 0.71 s; Face centre and Original each move ≥ 20 px.

## Shared tests touched (the merge notes)
- **E1's `LATER`**: `'circlearray'` appended. **745's `NEWEST_FIRST`** and **913.8's `NEWER`**: `'circlearray'` at the FRONT (913.8:
  seventeen newer than Snow & Rain). B27 (blinds), B28 (radiowaves) and B29 (lensmag) did the same from the same base — merge by hand:
  every id goes in, the newest batch first.
- ⚠️ **MERGE POINT: CATEGORY_OF "batch 48"** — B27, B28 and B29 also wrote batch 48 from fb24f68b. Renumber in merge order (48, 49,
  50, 51…); the line written last leads the NEW row, and only that line should say "The newest". The compositor blocks push onto
  `FM.EFFECTS` in file order, and 913.8 wants the LAST pushed to lead, so the block order must match CATEGORY_OF's.
- **queue 264 `ALLOWED`**: nothing added. On its 300 × 450 card in a 540 × 960 frame (shorter side 540) by reading: Copies 2 / 36,
  Radius 0 (all on the card) and 100 (the first copy's top still on the frame at y −285…165), Start ±180 (the first copy below), Face
  Off / On, Scale step 50 / 150 (the first copy is full size), Spin ±360 (the ring 162 px out, turned), Spiral −100 / 100 (the first
  copy stays at Radius), Fade 100 (the first copy solid), Original either way — every extreme leaves a copy on the frame.
- **Which sweeps walk it**: the inert sweep ('no effect slider is completely inert') and '482: every effect does something visible'
  walk PIXEL_FX only, so neither sees a canvas effect — test 9 is its own sweep. '691b no canvas effect has a pixel-sized setting'
  reads the CANVAS_FX table literal and px-unit rows: this kernel is assigned outside the table and has no px row. queue 264, 784, 793,
  zero-means-zero and the sanitiser sweep walk every registry effect: **784** (bare = defaults) holds by `CA_DEF` being the registry's
  defaults and every fallback in the kernel being `CA_DEF[k]`; **793** for the same reason; **zero-jump**: every key is read through
  `fparam` (`== null`), so Radius 0, Spin 0, Spiral 0, Fade 0 and Start 0 mean zero.
- **Busters**: compositor 225, fx-registry 28.37, fx-thumbs 60, inspector 423 — B27 / B28 / B29 bump the same from the same numbers, so
  the merge takes one number above all of them. **C.SCHEMA_FP left alone** (the new params move it; prove.sh prints the number).
- Same insertion points as the siblings (compositor before `FM._FX_TABLES`; fx-registry CATEGORY_OF and SEARCH_ALIASES after clarity;
  fx-thumbs OVERRIDES after `weather`; inspector's reasons after clarity; tests after "end 966 B22") — keep every block.

## The sheet: `render-probe.js` for the next browser slot
How to run it is in its header (tools/serve.sh + `tools/design/plans/fxnew-looks/recv.py` + tools/shot.py). It POSTs each page as a
JPEG to `'http://127.0.0.1:' + window.__recv + '/<name>.jpg'` (`?fmrecv=` works too), a fresh Image per tile. 9:16 frames on a dark
ground, three subjects: a small photo card (the dog), a thin gold petal, the word WOW. Every page is under 2× as tall as wide.

| Page | What it shows |
|---|---|
| `circlearray-big.jpg` | three big tiles: the defaults on the photo card (**recommended**), on a petal, and Face centre Off |
| `circlearray-count.jpg` | Copies 3, 4, **6**, 8, 12 on the card — and 6, **12**, 18, 24, 36 petals (a sunburst) |
| `circlearray-face.jpg` | Face centre Off / **On**, Off with the original kept, Radius 0 (a rosette), the word WOW — and Spiral **0**, 25, 50, −30 and a 36-petal galaxy |
| `circlearray-steps.jpg` | Fade **0**, 30, 60, 100 and Fade 80 + Scale step 90 — and Scale step **100**, 90, 80, 110, 120 |
| `circlearray-spin.jpg` | Spin 60 °/s at five moments, and a spiral of petals turning at −90 °/s |

## Questions for Ezra
1. **Default look**: six copies, 30 % out, facing out, original hidden — or upright copies (Face centre Off), or the original kept in
   the middle?
2. **Name**: "Circle Array" (the backlog's) sits right beside **Ring Array**, which is the kaleidoscope wedge fold — two names that say
   the same thing for two different effects. Keep it, or call this one **Copy Ring** / **Circle of Copies**, or rename Ring Array to
   something like **Wedge Fold**?
3. **Radius as a share of the frame** (like Lens Magnifier's Size) rather than px — fine?
4. Wanted later? An **Arc** (copies over part of the circle, e.g. 180° for a fan), an **ellipse** (Radius X / Y), copies turned an
   extra fixed amount, or Spin on each copy as well as the ring.

## What prove.sh checks (`…/scratchpad/agents/fxnew-circarray/prove.sh` → `prove-result.txt`)
1. It will not start (and stops between stages) inside a ship, a lock run or a live API builder without a helper slot (gapcheck.sh).
2. `node --check` on the four changed js, tests.js parses, the probe parses as an async body; no CRLF, `git diff --check`, no mode
   change, every buster raised.
3. The nine new tests (fx-c's runc.js): each FAILS on fb24f68b's js naming the missing effect (not a TypeError) and PASSES here; then
   the plate test with the bound forced to −1, for the numbers.
4. Scatter Array, Trail / Tile Grid / Scatter (482 14.5), Honeycomb (913.7), Ring Array's centre (904), #986 C27's movers, 482 11., the
   sweeps (784, queue 264, visible, inert, the pixel-sized setting and 691b's canvas contract, zero, sanitise, 793, 692), the search
   tests (#484), the shared NEW-row tests and Clarity's batch on both trees with this tests.js — the same verdicts; looks' B2 / B15
   through runb.js; then the ORIGINAL E1 and 745 on this js — they fail (why edited).
5. The schema fingerprint of both trees; `treecheck.py fb24f68b HEAD` and `drops.py fb24f68b HEAD`.

## Not done here
- `B30_PLATE_TOL` has to be set from the first run's numbers (prove.sh 3b prints them).
- The sheet has to be rendered in a browser slot, and his pick applied as defaults. Chrome at 900 and 380 (`?only=966%20B30`, and
  913.8 / 745 / 747 / 784 / queue 264) is still owed.
- SCHEMA_FP still has to be pinned (with the other §B branches, in the gap).
- Unmeasured on his phone: each frame reads back the layer's box once (exactBoxOf) and draws Copies `drawImage` calls — 36 copies of
  a full-frame clip is 36 full-plate draws.
