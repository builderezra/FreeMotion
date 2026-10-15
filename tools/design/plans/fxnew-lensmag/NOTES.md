# #966 backlog §B29 — Lens Magnifier on `hunt/fxnew-lensmag` (15 Oct)

Built on `fb24f68b` (the §B chain tip, hunt/fxnew-drums). Spec: `tools/design/plans/2026-09-29-idle-backlog/backlog.md` §B29 ("x, y,
size, zoom 1–8×, shape, feather, border + colour, shadow").
**Nothing was run** — no node, no browser, not even `node --check` — because the API builder was live. The proof is written and
waiting: `prove.sh` in the helper's scratchpad (below). His rule (#545) is that he picks the look before anything ships; the build
did not wait, so every choice on the sheet is already an option on the effect. His pick sets defaults; nothing gets rebuilt.

## Why this and not a duplicate (the check the brief asked for first)
- **Backdrop Lens (`magnifybg`, once "Magnify Background")** is a Copy-Background sibling: the layer's own picture is thrown away
  and its whole footprint fills with the scene BEHIND it, scaled about the layer's anchor. One control (Zoom); no position, no
  edge, no rim, no shadow, and nothing of the layer's own pixels. No option row could make it read its own layer — it never has
  the layer's pixels at all (drawCopyBg). So B29 is a different effect, not a variant of it.
- **Pinch / Bulge** magnifies by a smooth falloff with no edge; inside this lens the zoom is uniform and the edge is a real edge.
- Nothing in REQUESTS.md / POLISH-LOG.md (ssh/main and here) for "lens magnifier", "magnifying glass", "zoom circle"; "loupe" is
  only the eyedropper's (a UI magnifier, not an effect). So B29 was built and B30 (Circle Array) was not touched.

## What was built

| Where | What |
|---|---|
| `js/compositor.js` (`LM_ROWS`, `PIXEL_FX.lensmag`, just before `FM._FX_TABLES`) | type `lensmag`, **Lens Magnifier**, Warping, beside Pinch / Bulge |
| `js/fx-registry.js` | CATEGORY_OF **batch 48** (`lensmag: 'distort'`, last, so it leads the NEW row; clarity's comment no longer claims it), search words |
| `js/fx-thumbs.js` | OVERRIDES `lensmag`: Centre X keyframed 28 → 72 % over 1.65 s, so the tile shows a lens passing over the photo |
| `js/inspector.js` | the does-nothing-here reason (no Border, no Shadow, over one flat colour) |
| `index.html` | busters: compositor 224 → **225**, fx-registry 28.36 → **28.37**, fx-thumbs 59 → **60**, inspector 422 → **423** |
| `tests/tests.js` | four `966 B29 …` tests; the shared lists (below) |

### Controls (defaults in bold)
- **Centre X / Y** 0–100 % (**50 / 50**), shares of the plate — Pinch / Bulge's and Shape Wipe's rule (zoomed in, the plate is the
  whole comp, queue 913.5, so it is a share of the frame). No on-canvas handle: no effect centre has one in this app.
- **Size** 2–150 % (**40**) — across the lens, as a share of the frame's SHORTER side. ⚠️ **Not px, on purpose, against the brief**:
  any px lens big enough to be a default (300–400 px) covers the inert sweep's whole 96 × 72 frame, where Border, Shadow strength
  and Shape would all read as dead ('effects: no effect slider is completely inert' fails), and its nudge retry raises Size, not
  lowers it. A share also matches Bulge's Radius and Vignette's Size, and scales with the plate by construction. Easy to flip if
  the PM wants px (then the inert sweep needs an answer for Border and Shadow strength).
- **Zoom** 1–8× (**2**), step 0.1, unit `×` (Backdrop Lens's).
- **Shape** **Circle** / Rounded square (corners 35 % of the half-size) / Square.
- **Feather** 0–100 % (**0**) of the lens radius, INSIDE the edge (the lens never grows). 0 is a hard edge antialiased over one
  plate pixel.
- **Border width** 0–80 px (**6**), project px (`unit: 'px'`; pxToPlate scales it — the kernel declares five arguments on purpose).
  The rim lies inside the edge, box-filtered (a sub-pixel rim on the 0.28 plate keeps its ink). **Border colour** (**white**), greyed
  out at Border 0 (colorGate deadAt, Hexagon Tiles' grout).
- **Shadow** Off / **On**, **Shadow strength** 0–100 % (**50**, live only when On): the lens shape dropped 3 % of its Size right and
  5 % down, softened over 10 % of it, black, under the glass — so it shows only round the lens.
- Rim and shadow belong to the glass, so they draw over transparent pixels too (the lens is an object lying on the layer).

### How it samples (the brief asked to say)
Not drawImage with a scaled source rect: that is the cheap route on a canvas, but the feather, the square's signed-distance edge
and the Zoom 1 identity all need a per-pixel mask anyway, and every §B pixel effect is a pixel pass. So: a lens pixel at offset
d from the centre reads the layer at offset d / Zoom **bilinearly, in premultiplied alpha** (no dark fringe at a see-through edge),
from a copy of the rows the lens reads (so nothing it has written is read back). A sample within 1e-6 px of a pixel centre IS that
pixel, so Zoom 1 with no Border and no Shadow returns the layer byte for byte. Off the plate reads as transparent.
Pure: no state, no Math.random, the clock only through keyframes. Only the lens's box (plus the shadow's reach) is visited.
**Not in CROP_FX** (placed from the plate; its rim and shadow can lie where the layer has no pixels — a cropped buffer would cut
them off). **Not in PIXEL_ADJ** (a zoomed preview's snapshot is only the slice on screen). Search words: magnifier, magnifying glass,
magnify, loupe, lens, zoom circle, zoom in, enlarge, zoom lens, close up, spyglass. Name: "Lens Magnifier" is generic, in neither
Alight Motion list `tools/design/954-effect-names.md` was built from, not a trademark.

## The tests (each fails on fb24f68b on its first line: "no registry entry for lensmag — the effect is not built")
1. **`966 B29 Lens Magnifier is in the registry …`** — Warping (CONTROL: Pinch / Bulge is), routed, not in CROP_FX or PIXEL_ADJ, no
   second kernel, label, description, search words, the nine controls in order with options / ranges / units / defaults, the Border
   colour row and its gate, Shadow strength's gate, Border the only px control (20 → 5.6 on the 0.28 plate; Size, Zoom, Centre
   untouched), a bare one = its defaults, plain to see at its defaults, after Clarity, the head of the New row, a tile that moves.
2. **`966 B29 Lens Magnifier — inside the lens a pixel at offset d …`** — a 201-px ramp (red = x, green = y) read back: every pixel
   wholly inside shows the ramp at centre + d / Zoom within **`B29_SAMPLE_TOL` = 1 (TODO(first run))**, at Zoom 2, 3.5, 8 centred
   and 1.5, 2 off-centre (CONTROL: the unmagnified ramp is ≥ 10× the bound away); outside the lens byte for byte (each shape, hard,
   feathered, with a rim, half off the plate); Zoom 1 + no Border + no Shadow = the layer exactly over 36 combinations of shape,
   feather, size and place, on a layer with clear, part-clear and opaque pixels and colour under the clear ones (CONTROL: Zoom 1.5
   is not); the same input → the same output after another call.
3. **`966 B29 Lens Magnifier — Square and Circle agree …`** — on the centre row and column Circle = Square exactly; in the four
   corners the Square magnifies and the Circle does not, the Rounded square magnifies near its corner (48 px) and not at its tip
   (57 px); Feather 50 % is a monotone ramp inside the edge with ≥ 20 blended pixels and the lens not moved (CONTROL: the hard edge
   is black to 58 px, white from 63, ≤ 2 blended); the rim is exactly Border colour 1–6 px inside the edge on all four axes, absent
   15–20 px in and outside, and drawn on a clear layer; the shadow darkens just past the edge down-right and straight down, not
   up-left or straight up, 50 % sits between 0 and 100 %, never shows through the lens, and darkens a clear layer (CONTROL:
   strength 0 and Shadow Off leave a white layer exactly white).
4. **`966 B29 Lens Magnifier through the real compositor …`** — the 0.5 and 0.28 plates = the export box-averaged down, within
   **`B29_PLATE_TOL` = 4, a guess marked TODO(first run)**; the measured numbers lead the failure message (prove.sh 3b forces both
   bounds to −1 to print them); CONTROL: the 24-px rim left at plate px. Then stateless through renderScene (a keyed Centre X), and
   keyframed Centre X / Y / Zoom = those values plain at three times (CONTROL: 0.3 s and 1.7 s differ).
Every hard fact in 2 and 3 was worked by hand against the kernel (the pixel coordinates are chosen so offsets are whole pixels and
the edge never sits on a pixel centre); the two bounds are the only guesses.

## Shared tests touched (the merge notes)
- **E1's `LATER`**: `'lensmag'` appended. **745's `NEWEST_FIRST`** and **913.8's `NEWER`**: `'lensmag'` at the FRONT (913.8:
  seventeen newer than Snow & Rain). B27 (blinds) and B28 (radiowaves) did the same from the same base — merge by hand: every id
  goes in, the newest batch first.
- ⚠️ **MERGE POINT: CATEGORY_OF "batch 48"** — B27 and B28 also wrote batch 48 from fb24f68b. Renumber in merge order (48, 49, 50…);
  the line written last leads the NEW row, and only that line should say "The newest".
- **queue 264 `ALLOWED`**: nothing added — no single extreme erases the layer on its 300 × 450 card (Size 2 % is a speck of lens;
  150 % covers the card magnified; Zoom 8 shows the card's middle; Border 80 fills the lens with white; X 0 puts the lens on the
  card's left edge; the card outside the lens is always untouched).
- **The inert sweep** (read, not run; it walks PIXEL_FX only, which this is): at the defaults on its 96 × 72 frames the lens is
  28.8 px across at the middle, so Centre X and Y (move it), Size (2 → 150 %), Zoom (blows up the gradient and checker), Feather
  (blends the interior), Border width (0 → the whole lens) and Shadow strength (Shadow On by default; a ring on the opaque subject
  and on the hue sweep) all move pixels on both frames. Shape and Shadow are option rows (not swept).
- **784** (bare = defaults) holds by `LM_DEF` being the registry's defaults; **793** (shown = rendered for an absent key) holds
  for the same reason — every fallback in the kernel is `LM_DEF[k]`, no literal of its own to disagree; **zero-jump**: Centre X 0, Border 0 and Shadow strength 0 each draw differently from their defaults.
- **Busters**: compositor 225, fx-registry 28.37, fx-thumbs 60, inspector 423 — B27 / B28 bump the same from the same numbers
  (B28 inspector to 423 too), so the merge takes one number above all of them. **C.SCHEMA_FP left alone** (the new params move it;
  prove.sh prints the number).
- Same insertion points as B27 / B28 (compositor before `FM._FX_TABLES`; fx-registry CATEGORY_OF and SEARCH_ALIASES after
  clarity; fx-thumbs OVERRIDES after `weather`; inspector's reasons after clarity; tests after "end 966 B22") — keep every block.

## The sheet: `render-probe.js` for the next browser slot
How to run it is in its header (tools/serve.sh + `tools/design/plans/fxnew-looks/recv.py` + tools/shot.py). It POSTs each page as a
JPEG to `'http://127.0.0.1:' + window.__recv + '/<name>.jpg'` (`?fmrecv=` works too), a fresh Image per tile. The towers aerial
(Warping's photo, detail to blow up), 9:16, Border scaled to the tile as on a 1080-wide export. Every page is under 2× as tall as wide.

| Page | What it shows |
|---|---|
| `lensmag-big.jpg` | three big tiles at the defaults: **Circle (recommended)**, Rounded square, Square |
| `lensmag-zoom.jpg` | Zoom 1.5, **2**, 3, 5, 8 × — and Size 20, 30, **40**, 60, 90 % |
| `lensmag-look.jpg` | rims and shadows: none, **white 6 px + shadow**, black ring 14 px, thin gold 4 px + deep shadow, dark loupe ring 26 px — and Feather **0**, 15, 40, 100 %, 40 % with no rim or shadow |
| `lensmag-move.jpg` | Centre X / Y keyframed corner to corner at five moments, and Zoom keyframed 1 → 6 |

## Questions for Ezra
1. **Default look**: a round lens, Zoom 2, 40 % of the width, a thin white rim and a soft shadow — or one of the other rows (a black
   ring, a gold rim, plain glass with no rim and no shadow)?
2. **Name**: "Lens Magnifier", or the plainer "Magnifying Glass"? (Backdrop Lens is the one that magnifies what is BEHIND a layer.)
3. **Size as a share of the frame** (like Bulge's Radius) rather than px — fine? (px makes the sweep call Border and Shadow dead.)
4. **On an adjustment layer** — magnify everything below it? Not built: an adjustment layer's zoomed-preview snapshot is only the
   slice on screen, so it needs the frame's geometry handed in first (the reason Shape Wipe is not there either).
5. Wanted later? A glass **highlight/glare**, or a little **bulge at the rim** (real lenses bend the picture at the edge).

## What prove.sh checks (`…/scratchpad/agents/fxnew-lensmag/prove.sh` → `prove-result.txt`)
1. It will not start (and stops between stages) inside a ship, a lock run or a live API builder without a helper slot (gapcheck.sh).
2. `node --check` on the four changed js, tests.js parses, the probe parses as an async body; no CRLF, `git diff --check`, no mode
   change, every buster raised.
3. The four new tests (fx-c's runc.js): each FAILS on fb24f68b's js naming the missing effect (not a TypeError) and PASSES here;
   then the read-back and plate tests with both bounds forced to −1, for the numbers.
4. Magnify Background / Clarity's batch / 482 11. / the sweeps (784, queue 264, inert, visible, 691, 692, zero, sanitise, 793, the
   Colouring no-op list) / the shared NEW-row tests on both trees with this tests.js — the same verdicts; looks' B2 / B15 through
   runb.js; then the ORIGINAL E1 and 745 on this js — they fail (why edited). (No test title names Lens Distortion or Pinch / Bulge.)
5. The schema fingerprint of both trees; `treecheck.py fb24f68b HEAD` and `drops.py fb24f68b HEAD`.

## Not done here
- `B29_SAMPLE_TOL` and `B29_PLATE_TOL` have to be set from the first run's numbers (prove.sh 3b prints them).
- The sheet has to be rendered in a browser slot, and his pick applied as defaults.
- SCHEMA_FP still has to be pinned (with the other §B branches, in the gap).
