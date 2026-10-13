# #966 §B18–B20 — Colour Wheels, Tone Curve, HSL Mixer (hunt/fxnew-colour)

Branch `hunt/fxnew-colour`, from `8004fa16` (hunt/fx-land-on-fb2). Three new Colouring effects from the idle backlog
(`tools/design/plans/2026-09-29-idle-backlog/backlog.md` §B18–B20), built so his pick on the sheet sets defaults and layout —
a deletion or a number change, not a rebuild (#545: he picks the look before anything ships; the code does not wait).

**Nothing was run** — no node, no browser, no suite: the API builder was shipping. Every claim below is from reading the code
and from hand arithmetic. `prove.sh` (scratchpad, `agents/fxnew-colour/`) runs all of it when the machine is free.

## What was built

All three are **point operations** (a pixel's new colour comes from its own colour only), so each is:
- in `PIXEL_FX` (CPU — like Levels and HSL Bands; the GPU path `gl-color.js` only runs the CSS colour-matrix effects),
- on adjustment layers (`PIXEL_ADJ` in compositor.js, `ADJ_OK` in fx-registry.js) and inside filters (#986 C1's path),
- crop-safe (`CROP_FX`), so a zoomed preview reads back only what it needs,
- byte-exact between the phone's reduced plate and the export (no px params; the kernel never looks at position),
- keyframable (every slider; the option rows are not, as everywhere else),
- never writes a pixel with alpha 0.

Every control has a **neutral** value, and an all-neutral instance returns before touching a byte. The **defaults are a visible
look**, not neutral: the browser previews an effect on tap, and `482: every effect does something visible at its own defaults`
refuses a silent one (the PM's 7 Oct note on #966 said the same about Colour Wheels).

| Effect (type) | Panel on the phone | Default look | Maths |
|---|---|---|---|
| **Colour Wheels** (`colorwheels`) | **Wheel** row (Shadows / Midtones / Highlights) + that wheel's **Hue** 0–360°, **Amount** 0–100 %, **Brightness** −100..100; then **Balance**, **Blending**, **Keep brightness** — 7 rows | teal shadows (Hue 190, Amount 30), warm highlights (Hue 35, Amount 25), Keep brightness 100 | per channel: lift `x + L(1−x)^a`, gamma `y^(2^−M)`, gain `y + K·y^b`, each clamped; the wheel colour is a zero-sum push `(2/3)cos(hue − 0/120/240°)`, its Rec.601 brightness removed at Keep 100; Blending/Balance set the reaches `a`, `b` (0.5–2). Bounded so no setting inverts a tone. A Hue row greys out while its Amount is 0. |
| **Tone Curve** (`tonecurve`) | **Channel** row (RGB / Red / Green / Blue) + that channel's **Blacks, Shadows, Midtones, Highlights, Whites** (the level each tone at 0/25/50/75/100 % comes out at) + **Amount** — 7 rows | RGB a gentle S (20 / 80); Red, Green, Blue straight | monotone cubic (Hermite, Fritsch–Butland slopes, inside Fritsch–Carlson's region) → 256-entry tables; each channel's curve, then RGB's; crossing points pool to their average, so it can never invert or overshoot |
| **HSL Mixer** (`hslmixer`) | **Adjust** row (Hue / Saturation / Brightness) + **Red, Orange, Yellow, Green, Aqua, Blue, Purple, Magenta** −100..100 — 9 rows | opens on Saturation: Blue +40, Aqua +30, Green +20 | three 361-entry hue tables, each slider fading linearly to its neighbours' centres (HSL Bands' centres); Hue turns a colour at most half the gap to its nearer neighbour (15/30/20°) so hues never reorder; weighted by the pixel's own saturation like HSL Bands, so greys never move |

Also: search words (lift, gamma, gain; curves, tone curve; hsl, colour mixer …), browser tiles on the cat / ramp / clouds photos
(fx-thumbs `PHOTO_OF`), and the inspector's "does nothing here" reason for HSL Mixer on a layer with none of the moved colours.

Names: **Colour Wheels, Tone Curve, HSL Mixer** are generic grading names, not Alight Motion's (`Color Tune`, `Color Curves` in
PARITY.md rows 130–131) — checked against `tools/design/954-effect-names.md`.

## The sheet — `render-probe.js` (next browser slot)

Through the app's own `FM.renderScene`, POSTed to `'http://127.0.0.1:' + window.__recv + '/<name>.jpg'`:
`colourwheels-clouds.jpg`, `colourwheels-pair.jpg`, `tonecurve-clouds.jpg` (each tile carries the curve it actually draws, measured
from the kernel), `hslmixer-clouds.jpg`, `hslmixer-shore.jpg`, and **`layouts.jpg`** — the control-layout question as phone-width
mock-ups. Every tile is a setting of the effect as built, so a pick is a defaults change. fx-art/ has **no portrait**, so skin
tones cannot be judged on this sheet (pair.jpg is a sunset with silhouettes; shore.jpg carries the vivid red band).

## Questions for Ezra (one picture each — no lists of names; REQUESTS.md asks for pictures)

1. **The starting look of each** (the RECOMMENDED tile on each sheet, or another tile). The "starts doing nothing" tile is there
   too: that would need the effect added to `KNOWN_THIN` in the 482 test, and a tap in the browser would show no change.
2. **The panel layout** (`layouts.jpg`): A is built for all three; B and C are the alternatives —
   - Colour Wheels: A Hue + Amount + Brightness per wheel · B Red/Green/Blue offsets per wheel · C all twelve rows, no Wheel row.
     (A colour swatch per wheel instead of a Hue slider is possible too — the app has swatch rows.)
   - Tone Curve: A five level sliders · **B a curve you drag (a NEW control, a day or more — this is the long-waiting "Curves"
     question from the EFFECTS-PLAN entry, now with a picture)** · C −100..100 offsets instead of levels.
   - HSL Mixer: A Adjust picks the eight · B a Colour row picks one, three sliders (HSL Bands' shape) · C all 24 rows.
3. **Is Tone Curve enough for "Curves"**, or does he still want the drag-the-curve editor (layout B)?

## What prove.sh checks

1. `node --check` on every changed js; tests.js and the probe parse; no CRLF; `git diff --check`.
2. The 18 new tests (`966 B18 …`, `966 B19 …`, `966 B20 …`, six each) on 8004fa16's js: all FAIL, each naming the missing effect.
3. The same on this branch: all PASS (soft-canvas harness, `agents/fx-c/runc.js`).
4. Existing grading / adjustment-layer / filter / catalogue-sweep tests on both trees: the same verdicts.
5. The three edited tests' original bodies on this branch: E1 and 745 fail (why they were edited).
6. The collab fingerprint: fx-land control matches 1856346714373782; this branch does not (expected).
7. `treecheck.py 8004fa16 HEAD`, `drops.py 8004fa16 HEAD`.

The new tests, per effect: in the list (Colouring, search words, description, defaults in range, adjustment layer, PIXEL_ADJ,
CROP_FX, visible at defaults by the 482 measure, kept whole by the load sanitiser) and the option row shows only its own set;
neutral = the input byte for byte and transparency never written; each control moves the right tones (lift moves darks not white,
gain lights not black, gamma the middle; a curve point moves its own tones — Shadows nothing above 75 %, Highlights nothing below
25 %, Blacks and Whites only their end; an HSL slider only its
hue range, greys never); never inverts (4096 slider corners + 600 random for the wheels, 2000 random incl. crossing points for the
curve, hue order and lightness order for the mixer); keyframes draw what the evaluated value draws; the 0.5 and 0.28 preview
plates equal the export; and through `FM.renderScene` on a 4×3 grid of solid patches, the effect on each patch, on an adjustment
layer, in a filter on the adjustment layer and in a filter on each patch all give the kernel's own bytes, at full and half scale.

## Merge notes (merged by hand with the other §B branches)

- **NEW row tests.** E1's "newest six" (tests.js ~62540), **745** and **913.8** were edited, the same kind of change as
  hunt/fxnew-echo, but written to survive the merge: E1's follower list and 745's / 913.8's `NEWEST_FIRST` / `NEWER` lists
  already carry echo's `starglow, timeecho` AND this branch's `hslmixer, tonecurve, colorwheels`, filtered by what exists. They
  assume CATEGORY_OF puts echo's batch 42 line before this branch's batch 43 line; if the merge orders them the other way, swap
  the first five of `NEWEST_FIRST` / `NEWER`. With both branches in, 11 effects are newer than Snow & Rain and squish leaves the
  row; 913.8's squish control already allows for that (it only applies while fewer than 11 are newer).
- **Busters** (all above 8004fa16): compositor 220, fx-registry 27.33, fx-thumbs 56, inspector 419. hunt/fxnew-echo used
  compositor 220, fx-registry 28.33, fx-thumbs 56, inspector 419 — the merge needs each one above both (e.g. 221, 28.34, 57, 420).
- **fx-registry.js**: CATEGORY_OF gains a `batch 43` line; `ADJ_OK` gains a line; `SEARCH_ALIASES` gains three entries after
  `popart` (echo adds two there too — keep both).
- **fx-thumbs.js**: `PHOTO_OF.cat`, `.ramp` and `.clouds` each gain one id (echo edited `.dusk`).
- **inspector.js**: one `NOOP_WHY` line after `matchgrade` (echo adds two there — keep all).
- **compositor.js**: one self-contained block before `FM._FX_TABLES = …`; it pushes its rows to FM.EFFECTS and sets POSTFX,
  PIXEL_ADJ and CROP_FX itself, so it touches no shared line.
- **Collab fingerprint**: new registry params move `schemaFingerprint()`; `C.SCHEMA_FP` / `SCHEMA_REV` were left alone — set
  them once on the merged tree (the `921 S1` gate prints the number).

## Unsure / worth a second look

- Nothing was run. The arithmetic in the tests' comments (e.g. "about 102", "16 levels at Balance 0") is by hand from the formulas.
- Keep brightness holds brightness exactly only on greys and only while no channel clips (below about a fifth grey a yellow push
  cannot keep black's brightness — blue would have to go under 0). The test checks greys from a quarter up.
- Balance and Blending shape the Shadows and Highlights reach only; the Midtones wheel (a gamma) ignores them.
- The AI vocabulary (`ai-manifest.js` effectVocab) lists every param, so the prompt grows by about 70 params.
- Panel fit at 390 px is not covered by a DOM test here: the rows are the app's standard slider and option rows, short labels;
  Tone Curve's Channel note wraps to two lines. The 482 5.x panel tests are the model if he wants one.
- The brief asked for "every default is the input byte for byte"; that conflicts with the 482 visible-defaults test (and the PM's
  note on #966), so defaults are a visible look and the byte-for-byte claim is made for the neutral settings instead.
