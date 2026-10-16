# #954 — every effect named away from Alight Motion, and our own group order (built 16 Oct, code only)

**Nothing was run.** A release ship was running on the laptop, so no browser, server, python or suite. The only programs
run were `node --check` (compositor.js, fx-registry.js, fx-browser.js, tests/tests.js: all OK), git, grep, sed and awk.
The three new tests have never run; their first run is the proof.

Branch `hunt/954-names`, based on `ssh/hunt/948-review` (v17.54 + the heart + #948 + its review fixes).

## His words and the decision

- 1 Sep (quoted in #484): *"i want every effect to be named different to what it is in alight motion and also have
  different ordering to avoid getting taken down by aligiht motion for copying"*
- 11 Oct (#1130, decided by the PM under his standing rule, he can overrule): *keep the 70 plain names; the 40 renames and
  the new group order are OK as drawn.*

## Source of the 40 and of the order

- `tools/design/954-options.html`: the sheet sent to him on 26 Sep (the 40 renames by category, the 70 plain names, the
  today/proposed order).
- `tools/design/954-effect-names.md`: the same 40 with their type ids and categories (used for the build).
- They agree row for row. AM's names came from PARITY.md plus a third-party list of about 170 (smartmotionapp.com), so
  "ours" means "in neither list", not proven original. AM's own group order is published nowhere reachable.

## The 40 renames (labels only; type ids unchanged)

| type id | old (Alight Motion) | new | category (unchanged) |
|---|---|---|---|
| thermal | Hot Colour | Heat Map | Colouring |
| ripple | Circular Ripple | Pond Rings | Warping |
| lightglow | Light Glow | Highlight Bloom | Colouring |
| longshadow | Long Shadow | Poster Shadow | Colouring |
| halftonelines | Halftone Lines | Engraving | Drawing / Edge |
| darkglow | Dark Glow | Shadow Bloom | Colouring |
| smoothedges | Smooth Edges | Soft Outline | Drawing / Edge |
| edgeglow | Edge Glow | Neon Outline | Drawing / Edge |
| contourlines | Contour Lines | Topo Lines | Drawing / Edge |
| iridescence | Iridescence | Oil Slick | Colouring |
| fractalwarp | Fractal Warp | Noise Warp | Warping |
| innerglow | Inner Glow | Glow Inward | Drawing / Edge |
| linstreaks | Linear Streaks | Light Streaks | Blur |
| blink | Blink | Strobe | Opacity / Visibility |
| blockdissolve | Block Dissolve | Block Fade | Opacity / Visibility |
| gradientoverlay | Gradient Overlay | Colour Wash | Colouring |
| roughenedges | Roughen Edges | Torn Edge | Drawing / Edge |
| electricedges | Electric Edges | Live Wire | Drawing / Edge |
| glowscan | Glow Scan | Light Sweep | Drawing / Edge |
| spinstreaks | Spin Streaks | Orbit Streaks | Blur |
| fractalridges | Fractal Ridges | Rock Noise | Generative |
| smoothbevel | Smooth Bevel | Raised Edge | Drawing / Edge |
| zoomstreaks | Zoom Streaks | Burst Streaks | Blur |
| innerblur | Inner Blur | Blurred Rim | Blur |
| contourstrips | Contour Strips | Topo Bands | Generative |
| innerpinch | Inner Pinch | Centre Squeeze | Warping |
| ellipsoid3d | Ellipsoid | Capsule | 3D |
| hexprism3d | Hexagonal Prism | Hex Column | 3D |
| starprism3d | Star Prism | Star Column | 3D |
| softglow | Soft Glow | Dreamy Bloom | Colouring |
| spotcolor | Spot Colour | Colour Pop | Colouring |
| fourcolor | Four-Colour Gradient | Corner Colours | Colouring |
| spectralmap | Spectral Map | Hue Ramp | Colouring |
| radialshadow | Radial Shadow | Lamp Shadow | Colouring |
| voronoi | Voronoi Cells | Cracked Cells | Generative |
| tunnel | Tunnel | Wormhole | Warping |
| stretchseg | Stretch Segment | Taffy Pull | Warping |
| tileshift | Tile Shift | Brick Slide | Warping |
| tilerotate | Tile Rotate | Tile Spin | Warping |
| lightning | Lightning | Bolts | Generative |

**70 plain craft names kept** (Gaussian Blur, Vignette, Chroma Key, Invert…, the list in 954-effect-names.md §2); 96 were
already ours. None of the 40 is an audio effect or a filter; all live in `js/compositor.js` FM.EFFECTS rows.

## The group order

- Old: Colouring · Blur · Warping · Generative · Stylize · Drawing / Edge · Shakes / Movement · Repetition · Keying ·
  Opacity / Visibility · Text · 3D (`color, blur, distort, proc, stylize, drawing, move, repeat, matte, opacity, text, threed`)
- New: Colouring · Keying · Blur · Stylize · Drawing / Edge · Warping · Shakes / Movement · Repetition · Generative · 3D ·
  Text · Opacity / Visibility (`color, matte, blur, stylize, drawing, distort, move, repeat, proc, threed, text, opacity`)
- One line: `CATEGORY_ORDER` in `js/fx-registry.js`. Everything else derives from it: `FM.FX_CATEGORIES`, the browser's
  category tiles and its ‹ › arrows. Group names unchanged. No effect moved group. The order of effects inside a group
  is unchanged (FM.EFFECTS order); the sheet did not propose one.

## What changed, file by file

- `js/compositor.js` (?v=220 → 221): the 40 `label:` strings. Nothing else.
- `js/fx-registry.js` (?v=26.35 → 26.36): `CATEGORY_ORDER` (with his words); every old name is a SEARCH_ALIASES word
  (36 new keys in a #954 block, plus the old name appended to the 4 that already had a line: smoothedges, stretchseg,
  fractalridges, lightning). British-spelt old names also get the American spelling (hot color, spot color,
  four-color gradient). One comment that described current search behaviour updated (radiowaves: Pond Rings).
- `js/fx-browser.js` (?v=99 → 100): no behaviour change. The search's filter is moved into `searchMatches(q)`, which
  `buildSearchResults` draws, and exposed as the suite seam `FM._fxSearchMatch(q)` (ids in order), so test (a) asks the
  real search instead of a copy of it.
- `tutorials/03-glow-and-shadow.md`: Light Glow → Highlight Bloom (4 places). Step 3 now says to tap the picture with that
  name, because typing Highlight Bloom also shows Lens Blur (see the clashes below). Lessons are fetched with the version
  label, so no buster.
- `index.html`: the three busters above.

### Places checked that needed nothing

- **AI manifest** (`js/ai-manifest.js` effectVocab): emits type ids and param keys only, no labels. ai-ops/ai-chat: no
  labels. Nothing to change.
- **fx-thumbs**: keyed by type id; old names only in comments.
- **Filters / presets** (`js/filters.js`, `js/fx-presets.js`): reference effects by type id. Old names only in comments.
- **Saved projects**: a plain effect stores `{type, enabled, params}`; its row shows `reg.label` (inspector.js 1832). Only a
  filter container stores a `name`, and that is his. So **no migration**: an old project shows the new names at once.
  A preset he saved himself keeps whatever name he typed (the prompt suggested "<label> preset").
- **Comments** in js/ that mention old names (history, e.g. "Edge Glow's radius") were left alone.
- **index.html / styles.css**: no old names in anything shown.

## The collab schema

**Not affected; no SCHEMA_REV bump, no FP to pin.** `C.schemaFingerprint` (js/collab-core.js) hashes the sanitised
fixtures, each effect's TYPE and its params' key/type/default/legacy/min/max/keyframable, the audio defs, the op grammar,
the derived writers, the project fixture and SM_V. No effect label and no category order is in it, and the sanitiser does
not read labels.

## Tests

**Existing tests touched: none.** Every quoted old name in tests/tests.js is in a test TITLE, an error message or a
comment (left alone as told). No test looks an effect up by its display name: they use type ids, `data-fxid`, kernel
tables, or search words that still match (the 995 test types "gradient overlay", which is now an alias of Colour Wash).
No test pins the old group order (they read `categories()` and check names, squareness, fit, count, the first group).
The 1082 tutorial check stays green: "highlight bloom" is a word in the app source.

**Added (appended before the final `})();`, `{ item: '954' }`):**

1. `954 none of the 40 effects that carried an Alight Motion name shows it any more, each is named as drawn and still found
   by typing its old name, and a plain name like Gaussian Blur is unchanged`. CONTROL: Gaussian Blur still reads Gaussian
   Blur; the real search finds Gaussian Blur and finds nothing for a nonsense word. On the base it fails at "40 of the 40
   effects still carry their Alight Motion name…". Also: each new name is one effect, nothing is still called an old
   name, every one stays in its category, and the old and new names both find it (through `FM._fxSearchMatch` where
   fx-browser is loaded, the registry's label and search words otherwise).
2. `954 the effect groups run in our own order, Colouring then Keying, Blur, Stylize, Drawing, Warping, Shakes, Repetition,
   Generative, 3D, Text and Opacity, and not the old one`. CONTROL: the old and new orders are the same twelve groups and
   the comparison tells them apart; the browser lists exactly those twelve. On the base it fails at "the effect groups
   still run in the old order".
3. `954 no lesson tells him to type or tap an effect by the Alight Motion name it no longer carries` (async, fetches
   tutorials/ like the 1082 tests). CONTROL: at least one bold in the lessons is an effect name (lesson 03's Drop Shadow).
   On the base it fails on lesson 03's **Light Glow**. prove.sh's reverted side is HEAD's whole tree, tutorials included.

## Clashes to look at (the sheet checked our effect names and AM's; it did not check filters or sliders)

Built as drawn, because the names were decided. If any should change, it is a one-word edit in compositor.js plus the
test table.

1. **Dreamy Bloom** (was Soft Glow) is also the name of a ready-made FILTER (`js/filters.js` id `dreamy`), and that filter
   is built from Soft Glow and Light Glow. Open the filter and its ingredient list reads Saturation, Highlight Bloom,
   **Dreamy Bloom**, inside a filter called Dreamy Bloom. The strongest case for a second pick.
2. **Highlight Bloom** (was Light Glow): Lens Blur has a slider called "Highlight bloom", and its description says
   "turn up Highlight bloom". Typing Highlight Bloom shows Lens Blur first, then Highlight Bloom. (Lesson 03 says so.)
3. **Bolts** (was Lightning): its own count slider is also called "Bolts", so the Bolts effect has a Bolts slider.
4. **Strobe** (was Blink): Frame Stutter has a Mode called Strobe and a slider "Strobe on-time", and 'strobe' was already
   a search word for Frame Stutter, Colour Cycle and Colour Flash. Typing strobe now finds at least those four.
5. **Noise Warp** (was Fractal Warp) was already a search word for Turbulent Displace (its sibling). Typing noise warp
   finds both. Left as is: they are the same family.
6. The old names are search words, so the effect's hold sheet (the "words it answers to" chips, first 10 tags) can show
   the old AM name for an effect with few controls. Same as the #484 aliases (random displacement, luma stamper…).

## BEFORE-PUBLISHING.md — exact lines to change (not written: that file lives in /home/ezra/FreeMotion)

- Line 7, replace
  `## 🔴 ADDED 1 Sep — THE EFFECT NAMES AND THEIR ORDER (queue 484)`
  with
  `## ✅ DONE in v<VERSION> (#954) — THE EFFECT NAMES AND THEIR ORDER (queue 484)`
- After line 15 (`copied. This is **all ~198 effect names and the category order**.`), add:
  ```
  **Done by #954 (v<VERSION>).** Measured first, as below: of 206 names, 40 were distinctly Alight Motion's and are
  renamed (tools/design/954-effect-names.md has them with their ids), 70 are plain craft names every editor uses and are
  kept (decided 11 Oct, #1130), and 96 were already ours. The groups now run Colouring · Keying · Blur · Stylize ·
  Drawing / Edge · Warping · Shakes / Movement · Repetition · Generative · 3D · Text · Opacity / Visibility (was Colouring ·
  Blur · Warping · Generative · Stylize · Drawing / Edge · Shakes / Movement · Repetition · Keying · Opacity · Text · 3D).
  Every old name is still a search word. Caveat: AM's names came from a third-party list of about 170, so "ours" means
  "in neither list", not proven original, and AM's own group order is published nowhere we could reach.
  ```
- Lines 24–25, replace
  `empties every project he has made. Any renaming pass is a label-only change plus a migration, and that`
  `is why it cannot be done quickly.`
  with
  `empties every project he has made. #954 kept every id, and no migration turned out to be needed: a saved effect`
  `stores its type id and its settings, never its label (only a filter stores a name, and that one is his).`

## #545 — what to send with the release

He saw the sheet on 26 Sep, so the decision is made; the release picture shows it in the app. At 380 px:

1. The effects browser's category tiles (the main grid) in the new order: Colouring, Keying, Blur first.
2. Colouring opened: Heat Map, Highlight Bloom, Poster Shadow, Shadow Bloom, Oil Slick, Colour Wash, Dreamy Bloom,
   Colour Pop, Corner Colours, Hue Ramp, Lamp Shadow tiles with their pictures.
3. Warping opened (Pond Rings, Noise Warp, Centre Squeeze, Wormhole, Taffy Pull, Brick Slide, Tile Spin), or Drawing / Edge.
4. A search for an old name, e.g. "edge glow", finding Neon Outline, and "light glow" finding Highlight Bloom.
5. Worth showing with clash 1: the Dreamy Bloom filter's ingredient list.

## Suggested POLISH-LOG claim

`queue 954` claims all three tests above (each fails on the base at its own sentence). Clause 1 (every effect named away
from AM: the 40 renamed, the 70 plain kept as decided) and clause 2 (the order) are both built.
