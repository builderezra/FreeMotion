# #966 §B33 — Black & White Mixer (hunt/fxnew-bwmix, refers to #545)

Branch `hunt/fxnew-bwmix` (helper clone, local, NOT pushed), worktree `~/fm-helper-wt/fxnew-bwmix`, on `fb24f68b`
(hunt/fxnew-drums: the effects landing plus every §B branch so far). Backlog `tools/design/plans/2026-09-29-idle-backlog/backlog.md`
§B33: *Reds/Yellows/Greens/Cyans/Blues/Magentas −200..300 (Photoshop 40/60/40/60/20/80), filter preset
Neutral/Red/Orange/Yellow/Green/Blue/Infrared, tint + amount, contrast*, and its structural note: *"Grayscale is CSS-only with fixed
weights, so all 7 mono filters share one channel mix. B33 is the answer."* Not built before: no `bwmixer` (or any mixer) type in this
tree; on ssh/main REQUESTS.md's hits for "black and white" / "b&w" are the #579 / #593 / #603 / #645 complaints that the mono
FILTERS did not desaturate (fixed long ago), and "channel mixer" / "mono mixer" do not appear; POLISH-LOG.md's hits are other
things (Slip's black-and-white filmstrip v3.61, Levels v4.54, the #603 dead-tile reason v13.53).

**NOTHING WAS RUN.** The API builder was live (lock runs / ships), so no node, no python, no browser — not even `node --check`.
Every claim below is from reading the code and from hand arithmetic. The proof is written and waiting:
`scratchpad/agents/fxnew-bwmix/prove.sh` (results to `prove-result.txt` beside it), described at the end.

## What was built — one Colouring effect, `bwmixer`, "Black & White Mixer"

| Row | Range (default) | What it does |
|---|---|---|
| Colour filter | Neutral / Red / Orange / Yellow / Green / Blue / Infrared (**Neutral**) | a tap WRITES the six sliders below (the table further down); the kernel reads nothing from the row |
| Reds, Yellows, Greens, Cyans, Blues, Magentas | −200..300 % (**40 / 60 / 40 / 60 / 20 / 80**, Photoshop's default mix) | how bright that colour turns in grey |
| Contrast | −100..100 (0) | a curve through black and white: an S above 0, its reverse below; never inverts, never clips |
| Tint | 0..100 % (0) | how much of the Tint colour is laid over the greys |
| Tint colour | a swatch (**#c09060**, a warm sepia), keyframable | greyed out ("Not used when Tint is 0%") while Tint is 0 |

**The grey** (compositor.js, the block before `FM._FX_TABLES`), the way a photo editor's black-and-white mix takes it: of a pixel's
three channels the smallest stays; the step to the middle one is weighted by the SECONDARY colour the two biggest make (yellow, cyan,
magenta), the step from the middle to the biggest by the PRIMARY the biggest is (red, green, blue):

    grey = min + (mid − min) · secondary + (max − mid) · primary

By construction:
- **Each slider reaches only the hues within 60° of its colour**, fading in a straight line to nothing at each neighbour (pure yellow
  is all Yellows; orange half Reds, half Yellows). The grey is a **continuous** function of the colour — no step anywhere on the wheel,
  so a gradient across two colours cannot band. Where two channels tie, both readings give the same grey.
- **A grey has no hue to weight** (min = mid = max), so a grey comes out byte for byte at EVERY setting, not only Neutral.
- With a pixel's two weights inside 0..100 % its grey stays between its own smallest and biggest channel; outside that the grey is
  held to 0..255 — −200 can take a colour to black and 300 to white, which is what those ends are for.
- **Contrast**: above 0, x + c·(S(S(x)) − x) with S the smoothstep (the middle up to 2.25x as steep); below 0, x + |c|·(x − S(x))
  (the middle down to half as steep). Both hold 0, 255 and (within a level) 128, and both rise everywhere.
- **Tint** adds the Tint colour's difference from its own Rec.601 brightness (a difference with no brightness in it), scaled down
  wherever it would leave 0..255 — so every grey keeps its brightness, black and white stay black and white, a grey as bright as the
  colour becomes the colour at 100 %, and Tint 50 is exactly half of Tint 100.
- **A point operation**: crop-safe (`CROP_FX`), on adjustment layers (`PIXEL_ADJ`, `ADJ_OK`), inside filters; no setting is in pixels,
  so the phone's 0.28 plate draws the export's very bytes. Never writes a pixel with alpha 0, never changes alpha, deterministic.
- **The default is visible** (colours turn grey) — the 482 rule. On one flat COLOURED rectangle it is not a no-op (the silent-no-op
  test's #8fd4ff = 143,212,255 turns grey 193: red moves 50), so it is NOT in that test's `KNOWN_NOOP`. On a layer that is already
  grey it does nothing at Contrast 0 and Tint 0; the inspector says why (`NOOP_WHY`).

**The Colour filter** — what each glass does on black-and-white film (Neutral is the backlog's Photoshop default; the other six are
mine, designed from the filters' physics, not copied from any app):

| Filter | Reds | Yellows | Greens | Cyans | Blues | Magentas | Why |
|---|---|---|---|---|---|---|---|
| Neutral | 40 | 60 | 40 | 60 | 20 | 80 | the defaults |
| Red | 120 | 110 | −10 | −50 | −50 | 120 | passes red, stops blue and green: black skies, light skin, dark leaves |
| Orange | 90 | 100 | 25 | −10 | −30 | 85 | between Red and Yellow |
| Yellow | 60 | 90 | 60 | 30 | −10 | 50 | stops only blue: a gentle sky, everything else a touch lighter |
| Green | −20 | 90 | 120 | 60 | −10 | −30 | lightens leaves, darkens reds and lips (its complement, magenta, darkest) |
| Blue | −30 | −20 | 30 | 110 | 120 | 60 | a white sky and haze, darker skin (freckles show) |
| Infrared | −40 | 200 | 150 | −60 | −10 | −100 | leaves glow white (the Wood effect), the sky goes dark |

Measured by hand on four landscape colours (the grey each turns into): a blue sky 120,170,230 → Neutral 162, Yellow 129, Orange 97,
Red 65, Blue 247, Infrared 84; skin 220,170,140 → Neutral 178, Yellow 197, Orange 215, Red 233, Blue 119; leaves 70,120,50 → Neutral
82, Green 128, Infrared 165; a red 200,40,50 → Neutral 108, Green 7. The tests hold the ORDER and the direction of each (not exact
numbers).

**`sets` reaches visual effects now** (js/fx-registry.js `paramsOf`): inspector `fxSegment` already applied a segment's `sets` (#482
polish 7.4, Telephone's Style), but only through the audio bridge — the visual registry's segment copy is a whitelist and dropped
it, so without one line here a tap on "Red" would have lit the button and left the sliders where they were (the whitelist-drift
lesson). Only rows that declare `sets` carry it; every other segment row is unchanged.

Also: search words black and white, black & white, b&w, mono, monochrome, grayscale, greyscale, infrared, channel mixer, bw mixer,
colour/color filter, red filter (not "bw" — two letters match inside too many words; not "noir" — the Noir filter's name). Browser
tile on the clouds photo (fx-thumbs `PHOTO_OF.clouds`: a blue sky over water and trees — the picture a black-and-white mix is for;
Clarity, the tile before it, is on towers). It leads the NEW row (batch 48, the newest). Name: "Black & White Mixer" is the backlog's;
"black and white", "mixer" and the filter colours are generic words, none is an Alight Motion effect name (checked against
`tools/design/954-effect-names.md` — it has Grayscale, Sepia, Tint, Colourize, Channel Remap; nothing like this), and none is a
trademark. A category title may not carry "&" (queue 287/288) but effect names do (Clarity & Dehaze, Teal & Orange, Snow & Rain).

Files: js/compositor.js (the block), js/fx-registry.js (CATEGORY_OF batch 48, ADJ_OK, SEARCH_ALIASES, `sets` in paramsOf),
js/fx-thumbs.js (PHOTO_OF.clouds), js/inspector.js (NOOP_WHY), index.html busters — **compositor 224 → 225, fx-registry 28.36 →
28.37, fx-thumbs 59 → 60, inspector 422 → 423** (each above this tree's, compared as version numbers). No CSS. **C.SCHEMA_FP /
SCHEMA_REV left alone** (pinned once at the top of the chain before landing); the new params move the fingerprint and prove.sh stage 6
prints the number.

## The tests — 7 new, all `'966 B33 …'`, appended before the final `})();`

Each asks `_cgNeed('bwmixer')` (B18's helper) before measuring anything — the catalogue test through `_cgListed`, which calls it
first — so on fb24f68b every one fails with **"no registry entry for bwmixer — the effect is not built"**, never a TypeError.
1. **In the list**: Colouring, the eight search words, described, defaults in range, adjustment layer + PIXEL_ADJ, CROP_FX, visible at
   its defaults (the 482 measure), the sanitiser keeps it whole; the ten rows in order and their defaults; the six −200..300 %
   keyframable; Colour filter's seven names; Tint colour keyframable and greyed at Tint 0; no px keys; a bare instance draws its
   defaults; `FM._cropIdentity` byte-identical at two settings (CONTROL: the crop is smaller than the plate); leads the NEW row behind
   only newer effects.
2. **Greys**: with Tint 0, at every filter, every slider at −200 / at 300 / alternating, and Contrast ±100, every pixel with alpha on a
   busy plate and on a hue ramp is R = G = B; a grey ramp is byte for byte at every filter and at both slider ends (CONTROL: Contrast 50
   does move it); no alpha changed, no transparent pixel written — also under a full magenta Tint.
3. **Own hues only**: Reds 140 takes pure red from 102 to white and leaves pure blue at 51; on a pure-hue ramp each slider +20 raises
   its own colour by 51 (±1), lightens every hue within 50°, leaves every hue 60° or more away byte for byte; and round the whole
   wheel (359° → 0° included) no neighbouring degrees differ by more than 255/60·d + d + 2 (d = the biggest difference between two
   neighbouring sliders) — at the defaults 6 levels, where a nearest-colour pick would jump 153 (CONTROL: the defaults' greys span ≥ 100).
4. **The filters as named**: the row carries `sets` (or it says the whitelist dropped it); each writes exactly the table's six and
   nothing else; Neutral writes the defaults; a simulated tap (fxSegment's two statements) over a moved Reds draws the filter's six; and
   on the four landscape colours: sky Red < Orange < Yellow < Neutral and skin the reverse (≥ 8 levels apart), Green leaves +25 and a
   red −25, Blue sky +40 and skin −25, Infrared leaves +50 and sky −40 (CONTROL: the four Neutral greys differ).
5. **Contrast and Tint**: Contrast −100..100 by 10 holds 0 and 255 and never inverts; +100 takes 64 / 192 to ≤ 54 / ≥ 202, −100 to
   ≥ 74 / ≤ 182, 128 stays within 1. Tint 100: grey 153 → #c09060 within 1, black and white untouched, every grey's Rec.601 brightness
   within 1, Tint 50 half of Tint 100 within 2, ≥ 200 greys visibly warm (CONTROL), a blue and a red Tint colour the middle grey
   their way; at Tint 0 a red Tint colour changes nothing.
6. **Keyframes and plates**: Reds, Blues, Contrast, Tint and the Tint colour keyed = the evaluated value plain (the colour through
   queue 555's resolver); a keyed Reds and a keyed colour animate; the 0.5 and 0.28 plates equal the export byte for byte at three
   settings.
7. **Adjustment layer and filters**: B18's `_cgPlaced` on the 12 solid patches — on each patch, on an adjustment layer, in a filter on
   the adjustment layer, in a filter on each patch — the kernel's own bytes at 1 and 0.5, at the defaults and at Blue + Contrast 40 +
   a blue Tint 60.

**Shared tests edited** (the merge agents' newest-first form, `bwmixer` at the front): E1's `LATER` (+ bwmixer, last), 745's
`NEWEST_FIRST`, 913.8's `NEWER` (now seventeen newer than Snow & Rain — still the "twelve newest, Snow & Rain out" branch), and
**'no effect erases the layer at a single parameter extreme (queue 264)'** `ALLOWED` (+ `bwmixer:reds=min`, `bwmixer:yellows=min`):
its fixture is ORANGE #e8a33d, half Reds and half Yellows, so Reds −200 gives 61 + 69·−2 + 102·0.6 = −16 and Yellows −200 gives −115,
both held at 0 — black on a black ground; crushed to black by design, the slider's job at that end (the list's own comment names
"crushed to black" as a reason). 'no Colouring effect is a silent no-op' needs nothing (see above). The inert sweep: the hue frame moves
all six sliders, both frames move Contrast, and Tint moves on both with its default sepia (it is not gated; only the colour row is).

## The sheet — `render-probe.js` (next browser slot)

Through `FM.renderScene`, POSTed to `'http://127.0.0.1:' + window.__recv + '/<name>.jpg'`, a FRESH Image for every tile; the filter
numbers are read from the effect's own row, so the sheet shows what a tap writes. Two tiles across, three down (phone-sized pages):
- `bw-filters-{clouds,bush,shore,dog}-p1/p2.jpg` — the photo, **today's Grayscale beside it**, Neutral (RECOMMENDED), Red, Orange,
  Yellow, Green, Blue, Infrared, then Neutral + Contrast 40, Red + Contrast 30, Neutral + Tint 40.
- `bw-sliders-clouds-p1/p2.jpg` — Blues −100 / 200, Cyans −100, Greens 200, Reds 200 + Yellows 150, only-blue-survives, Contrast −60
  / 100, and three alternative defaults: **today's Grayscale weights as a mix (21 / 93 / 72 / 79 / 7 / 28)**, Neutral + Contrast 20,
  Yellow.
- `bw-tints-dog.jpg` — sepia at 20 / 50 / 100, a blue cyanotype, a gold, sepia with Contrast.
- `layouts.jpg` — A (built): the filter row with the six sliders always there; B: the six only after picking Custom.

## Questions for Ezra (one picture each)

1. **The starting look** — Neutral (recommended; Photoshop's mix, skies a little darker than Grayscale gives), today's Grayscale
   weights, Neutral + Contrast 20, or Yellow? (bw-sliders-clouds p2, and the Grayscale tile beside Neutral on every filters page)
2. **The filters** — keep all six? Any too strong or too weak on his photos? Each is six numbers, so a pick is an edit, not a rebuild.
   (bw-filters-*)
3. **The panel** — A (built) or B? (layouts.jpg)
4. **After he moves a slider the filter button stays lit** (exactly as Telephone's Style does today). Fine, or should a button light
   only while the sliders still hold its numbers? That is a small inspector change, and it would change Telephone's row too.
5. **The Tint colour's default** — the sepia #c09060, or another? (bw-tints-dog.jpg)
6. **The name** — "Black & White Mixer" (the backlog's, built), "B&W Mixer", or just "Black & White"?

## The seven mono filters — should they move onto it? (NOT done; his call)

Silver, Noir, Platinum, Ink, Fog, Newsprint and Photocopy (and Solarised, the eighth in the mono section) all start with
`e('grayscale', { amount: 1 })` — CSS `grayscale(1)`, the Rec.709 weights 0.2126 / 0.7152 / 0.0722. **Recommendation: not now, and not
silently.** Moving them changes every saved project and look that uses them, moves the filter-distance measures (#675) and any pinned
filter renders, and swaps a GPU colour matrix (gl-color.js) for a CPU pass per frame per filter. What the mixer makes possible instead:
- **The Rec.709 weights ARE a mix**: Reds 21, Yellows 93, Greens 72, Cyans 79, Blues 7, Magentas 28 reproduce grayscale() in this
  formula (each 60° sector is linear, and those six put back exactly 0.2126 R + 0.7152 G + 0.0722 B, to within the sliders' whole-
  number step). So a filter COULD move onto the mixer with no visible change (to be measured in Chrome, since the GPU path may round
  differently) — and only then take a colour filter as a deliberate, sheet-approved look change (e.g. Noir on Red for black skies).
- Or, better first: **add new mono filters built on it** (a red-filter Noir, an infrared mono) and leave the seven exactly as they are.

## Merge notes

- **Other §B branches from the same base** (cartoon and geq were being built at the same time): CATEGORY_OF's `batch 48` line may be
  claimed twice — renumber, and keep the newest-first lists (`LATER`, `NEWEST_FIRST`, `NEWER`) in CATEGORY_OF's order read backwards.
  913.8 stays on its "twelve newest" branch whatever the count.
- **Busters**: this branch took compositor 225, fx-registry 28.37, fx-thumbs 60, inspector 423 — a sibling branch from fb24f68b
  will likely take the same numbers; the merge needs each one above all of them.
- **fx-registry.js**: CATEGORY_OF (one line after clarity's), ADJ_OK (one line after `clarity: 1`), SEARCH_ALIASES (one entry after
  clarity's), and the one-field `sets` addition on the paramsOf segment line — a long line other branches may also touch (take both).
- **fx-thumbs.js**: `PHOTO_OF.clouds` gains `bwmixer`. **inspector.js**: one `NOOP_WHY` line after `clarity`.
- **compositor.js**: one self-contained block right before `FM._FX_TABLES = …`; it pushes its row and sets POSTFX, PIXEL_ADJ and
  CROP_FX itself, touching no shared line.
- **tests.js**: the block after `// ── end 966 B22 ──`, ending `// ── end 966 B33 ──`; the four shared-test edits above (one line or
  two each). Never union-merge tests.js appends — rebuild by blocks.
- **"channel mixer"** is in the search words because the backlog's B33 brief names it; if the separate Channel Mixer effect
  (INVENTORY T02) is built, that word belongs to it — take it off this one then.

## What prove.sh checks (WRITTEN, NOT RUN)

Refuses to start, and stops between stages, while a ship, a lock run or a live API builder is going (scratchpad/gapcheck.sh).
1. `node --check` every changed js; tests.js parses; the probe parses as an async body; no CRLF; `git diff --check`; no mode change.
2. The 7 new tests on fb24f68b's js: 7 FAIL, each naming the missing effect, none a TypeError.
3. The same on this branch: 7 PASS.
4. Neighbours on both trees, the same verdicts: '966 B18/B19/B20/B26', '482 5.', '784', '(queue 264)', 'every effect does something
   visible', 'inert', 'no Colouring effect is a silent no-op', '692:', zero-means-zero, the sanitiser sweep, '793:', E1, 745, 913.8,
   747, '#484:', '733:', the featured-carousel gate.
5. The edited shared tests' ORIGINAL bodies on this branch: E1, 745 and queue 264 FAIL (why they were edited).
6. The collab fingerprint of both trees (the number to pin; SCHEMA_FP untouched here).
7. `treecheck.py fb24f68b HEAD`, `drops.py fb24f68b HEAD`.

Still owed after it: Chrome at 900 and 380 (`?only=966%20B33`, and 692 / 913.8 / 747 / 745 / the 482 sweeps / queue 264), the
sheets, the panel at 380 px (ten rows, the seven filter buttons wrapping to two lines), and the fingerprint pinned with the rest.

## Unsure / worth a second look

- Nothing ran. Every expected number in the tests is hand arithmetic from the formula, written beside each check; if one is red on the
  first run, read its numbers before touching the kernel.
- The filter numbers are designed, not measured on his photos — the sheet is where they get judged.
- `Object.assign(params, sets[n])` on a tap overwrites a KEYFRAMED slider with a plain number (Telephone's row does the same). Worth a
  word in the panel later, or a confirm; not built.
- The inert sweep in this tree has two frames (subject, hues); if a third (hazy) frame lands with another branch, nothing here depends
  on it.
- The AI vocabulary (ai-manifest effectVocab) gains the new sliders; Colour filter's `sets` is not in it (the AI writes the six
  directly).
