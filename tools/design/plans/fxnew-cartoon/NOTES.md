# #966 §B31 — Cartoon (hunt/fxnew-cartoon, refers to #545)

Branch `hunt/fxnew-cartoon` (helper clone, local, NOT pushed), worktree `~/fm-helper-wt/fxnew-cartoon`, on `fb24f68b`
(hunt/fxnew-drums: the effects landing plus every §B branch so far, Clarity & Dehaze the newest effect). Backlog
`tools/design/plans/2026-09-29-idle-backlog/backlog.md` §B31 (*Cartoon — smoothing, shading steps 2–12, edge width, edge threshold,
edge colour, saturation, mix*). Not built before: no `cartoon` type in this tree; on ssh/main REQUESTS.md "cartoon" is only the B4
sound pack, "comic" is the Comic Ink filter (#813) and the comic tails (#548); POLISH-LOG's hits are the same filter and tails.

**How it relates to the Comic Ink filter** (js/filters.js `comic`): that is a ready-made stack of three existing effects — Contrast
1.15, Posterize 5 levels at 0.85 and Find Edges inked over the picture. Cartoon is one effect that does the job properly: it
smooths texture first (so lines follow shapes, not grain), bands BRIGHTNESS only and keeps each colour's hue (Posterize bands each
channel, which shifts hues), draws its lines from the smoothed picture before banding (so the bands never draw lines of their own),
and its line width is project px with the #986 C60 plate rule. The filter is untouched. One question below asks whether Comic Ink
should become Cartoon with a look's settings.

**NOTHING WAS RUN.** The API builder was live, so no node, no python, no browser — not even `node --check`. Every claim below is
from reading the code and hand arithmetic. The proof is written and waiting: `scratchpad/agents/fxnew-cartoon/prove.sh` (results to
`prove-result.txt` beside it), described at the end.

## What was built — one Stylize effect, `cartoon`, "Cartoon"

| Row | Range (default) | What it does |
|---|---|---|
| Smoothing | 0–10 px (**3**), `unit: 'px'` | two passes of a Kuwahara filter, squares reaching about that many PROJECT px: texture flattens, edges stay hard. 0 = none |
| Shading steps | 2–12 (**4**) | the smoothed picture's brightness cut into that many bands, each drawn at the middle of its band (4 → greys 32 / 96 / 159 / 223), hue kept |
| Edge width | 1–12 px, step 0.5 (**3**), `unit: 'px'` | the outline's width in PROJECT px |
| Edge threshold | 0–100 % (**15**) | how big a brightness jump (or a cut-out's silhouette) must be to get a line: 15 % = 38 levels, full ink 24 levels above |
| Edge colour | swatch (**#000000**), keyframable | the line colour |
| Saturation | 0–200 % (**120**) | the colour carried onto each band, 0 = grey bands |
| Mix | 0–100 % (**100**) | the look over the picture; 0 = the picture byte for byte |

How it behaves, by construction (js/compositor.js, the block before `FM._FX_TABLES`):
- **Smoothing** is Oil Paint's Kuwahara idea (each pixel takes the mean colour of the flattest of its four corner squares) but with
  EXACT integer sums — alpha, colour × alpha, luma × alpha, luma² × alpha through `hsBox`'s running sums in Float64, in 64-row
  strips with a halo — so the result does not depend on where the plate starts. Two passes; squares capped at 16 plate px.
- **Shading**: the band is picked by whole-number Rec.601 luma; the colour's difference from its own grey (× Saturation) is laid on
  the band's grey and pulled in only as far as it must be to fit 0..255. So the output brightness IS the band's (within rounding)
  and the hue holds exactly (channel differences only scale). Greys stay grey.
- **Outlines**: a Sobel of luma × alpha and of alpha (so a cut-out's silhouette, text, a sticker, gets an outline — on its inside,
  since transparent pixels are never written), read as the jump in levels; ink = smoothstep from the threshold to 24 levels above
  it (fades in, does not flicker). Lines come from the smoothed picture BEFORE banding. Past the plate's edge the Sobel reads the
  edge pixel itself, so a full-frame clip gets no line round the frame.
- **The #986 C60 plate rule**: a hard step lights 2 plate px. A line of Wp = Edge width × ps plate px is that grown by
  (Wp − 2) / 2 each side (a square max filter, the last fraction drawn at that fraction), or under 2 plate px the same 2 px at
  Wp / 2 strength. Either way a line weighs Wp plate px across: the phone's 0.28 plate draws the export's line SHRUNK (a 3 px line
  is 2 plate px at 42 %), never a 3.5× fatter one. On an aligned straight edge this is exact; the plate test measures the rest.
- Mix 0 returns before touching a byte; a pixel with alpha 0 is never written; alpha never changes; no randomness, nothing from the
  clock (preview = export = scrub); bare instance = defaults (the kernel's fallbacks are the registry defaults).
- **Crop-safe (CROP_FX)** for Clarity's reason: exact integer sums, transparency weighs nothing, the crop margin (3 × (Smoothing +
  Edge width) × ps + 8) covers the reach (about 2 × Smoothing + Edge width / 2 + 2). '692' re-proves it; the catalogue test checks
  `FM._cropIdentity` at three settings on two plate scales with a control.
- **NOT on adjustment layers** (not in ADJ_OK / PIXEL_ADJ): it is a look, not a grade, and it would need `FM.adjNeedsFrame` work
  like Clarity's. Question 4 asks.
- Memory on a 1080 × 1920 export frame: two RGBA copies, a Uint16 and two Float32 planes (about 36 MB), pooled, plus six strip
  planes (under 5 MB). Speed unmeasured (two Kuwahara passes, one Sobel, two max-filter passes, one colour pass — all linear in
  pixels; the max filter costs Edge width × ps reads per pixel per direction).
- Search: cartoon, cartoonify, comic, comic book, toon, cel, cel shading, anime, animated, ink, inked, outline, outlines, drawing.
  Browser tile on the cat photo (fx-thumbs `PHOTO_OF.cat`: one clear animal with a clean outline, and not the dog its Stylize
  neighbours fall back to). Batch 48 in CATEGORY_OF: it leads the NEW row.
- Names: "Cartoon" and the row names are generic words; none is in `tools/design/954-effect-names.md` (no Alight Motion name) and
  none is a trade mark.

Files: js/compositor.js (the block), js/fx-registry.js (CATEGORY_OF batch 48, SEARCH_ALIASES), js/fx-thumbs.js (PHOTO_OF.cat),
index.html busters — **compositor 224 → 225, fx-registry 28.36 → 28.37, fx-thumbs 59 → 60** (each above this tree's, compared as
version numbers). **C.SCHEMA_FP / SCHEMA_REV left alone** (pinned once at the top of the chain); the new params move the
fingerprint, and prove.sh stage 6 prints the number.

## The looks — documented starting settings for his sheet (#545: he picks before it ships)

| Look | Smoothing | Steps | Edge width | Threshold | Edge colour | Saturation |
|---|---|---|---|---|---|---|
| Default as built (RECOMMENDED) | 3 | 4 | 3 | 15 | #000000 | 120 |
| Soft comic | 4 | 6 | 2 | 20 | #2b2b2b | 115 |
| Bold ink | 3 | 4 | 5 | 10 | #000000 | 135 |
| Flat cel | 6 | 3 | 3 | 15 | #000000 | 140 |
| Sketchy | 1 | 8 | 1.5 | 5 | #3b2f2a | 60 |

They are settings of the one effect, not code: whichever he picks becomes the defaults (or a row of looks — question 2).

## The sheet — `render-probe.js` (next browser slot)

Through `FM.renderScene`, POSTed to `'http://127.0.0.1:' + window.__recv + '/<name>.jpg'`, a FRESH Image for every tile:
`cartoon-looks-cat.jpg`, `cartoon-looks-dog.jpg`, `cartoon-looks-shore.jpg` (the photo, the default, the four looks) and
`cartoon-controls-cat-p1/p2.jpg` (Shading steps 2 / 8, Edge width 1.5 / 6, Edge threshold 5 / 40, Smoothing 0 / 8, Saturation
60 / 180, a deep-blue Edge colour, Mix 60). Two tiles across, three down: phone-sized pages. The tiles are 340-px projects, so a
3 px line there is about what 10 px is on a 1080 export — said on each page.

## The tests — 7 new, all `'966 B31 …'`, appended before the final `})();`

Each asks `_cgNeed('cartoon')` (B18's helper) before it measures anything, so on fb24f68b every one fails with "no registry entry
for cartoon — the effect is not built" — never a TypeError.
1. **In the list**: Stylize, the eight search words, described, defaults in range and as listed, the seven rows (Smoothing and
   Edge width 'px', the only px keys; Shading steps 2–12 in whole steps; Edge colour a black swatch), the kernel takes `ps`, visible
   at its defaults (the 482 measure), the sanitiser keeps it whole, a bare one draws its defaults, `FM._cropIdentity` byte-identical
   at three settings on a 1 and a 0.5 plate (CONTROL: the crop is smaller), leads the NEW row behind only newer effects.
2. **Mix 0** byte for byte at three settings on 1 / 0.5 / 0.28 plates (CONTROL: the defaults move the plate); at four settings on two
   plates no alpha changes and no transparent pixel is written.
3. **Shading**: Shading steps n gives exactly n greys on a grey ramp for n = 2..12, rising, grey; on a hue ramp the hue holds within
   4° and every pixel's brightness lands within 1 of a band; Saturation 0 is grey, 200 ≥ 1.5× the colour of 100 (muted ramp);
   Mix 50 lies between the picture and the look (CONTROL: strictly between on 1000+ values).
4. **Outlines**: a 120 | 230 edge draws black in exactly the two columns beside it and nothing else moves off its flat band, the
   frame border included; Edge colour #e02020 draws 224,32,32 there; a flat field draws no line at threshold 0, 15 or 60 (CONTROL:
   its band moved it); a cut-out disc's rim is inked (≥ 95 %), its middle one colour, the outside untouched; a 40-level edge is
   lined at threshold 5 and not at 40.
5. **Edge width**: across the 120 | 230 edge the ink (1 − level / band level) sums to the width within 0.1 for 1, 2, 3.5, 6, 10,
   split evenly either side, growing.
6. **The plates**: on flat rectangles with every edge on a multiple of 50 project px (aligned at 200, 100 and 56 px), the 0.5 and
   0.28 plates against the export shrunk by exact area, for four settings, within **`B31_PLATE_TOL` = 2 — A GUESS, marked TODO: set
   it from the first run's numbers** (prove.sh 3b prints them), with positive controls that must exceed 1.5× the bound and twice the
   measured error: Edge width read in plate pixels (the C5 fault) and the plate at Shading steps 8. CONTROL: the fixture has lines.
7. **Deterministic**: the same picture twice, and again after a bigger frame and a phone plate in between (pooled buffers carry
   nothing) (CONTROL: another width is another picture); a keyframed Smoothing, Steps, Width, Threshold, Saturation, Mix or Edge
   colour draws what its value draws plain.

Every slider moves something on the inert sweep's frames (read, not run — this tree's sweep has TWO frames, the subject and the hue
sweep; there is no hazy frame here): Smoothing shifts the hue sweep's bands and hues (Kuwahara on a gradient takes the up-left
square's mean — h = 0, 1, 2, 3, 5 across the sweep); Shading steps re-bands; Edge width widens the silhouette's line (the subject's
ellipse and its opaque bottom strip on transparency); Edge threshold 0 inks the gradients faintly and 93 thins the silhouette's
ink; Saturation and Mix move every pixel.

**Shared tests edited** (the merge agents' form): E1's `LATER` (+ cartoon, last), 745's `NEWEST_FIRST` and 913.8's `NEWER`
(cartoon at the front; NEWER is now seventeen — still the "twelve newest, Snow & Rain out" branch). '966 B26 / B7 / B2 / B15'
already ask "behind only effects registered after it", so they hold with cartoon leading the row (cartoon, clarity, audiospectrum,
filmdamage, shapewipe, colorflash, hslmixer, tonecurve, colorwheels, starglow, timeecho, popart).

## Questions for Ezra (one picture each)

1. **The starting look** — the default as built (recommended), or Soft comic / Bold ink / Flat cel / Sketchy? (cartoon-looks-*)
2. **Looks as a row** — keep the looks as starting points he dials himself (built: one set of defaults), or add a Look row
   (Soft comic / Bold ink / Flat cel / Sketchy) that sets the sliders? Not built.
3. **Comic Ink** — leave the Comic Ink filter as it is (built), or rebuild it as Cartoon with one look's settings?
4. **Adjustment layers** — should Cartoon also work on an adjustment layer (cartoon the whole frame below)? Not built.
5. **Band greys** — each band is drawn at its middle (4 steps: 32 / 96 / 159 / 223), so white becomes a light grey and black a dark
   one, which keeps colour in the darkest and lightest bands. Or should the end bands reach pure black and white? (controls sheet)
6. **Edge width in project pixels** (the app's rule) means the same number draws a thinner-looking line on a 4K project than on a
   phone clip — keep, or make it a share of the frame?

## What prove.sh checks (WRITTEN, NOT RUN)

Refuses to start, and stops between stages, while a ship, a lock run (`full-unchanged`) or a live API builder is going (the shared
`scratchpad/gapcheck.sh`, its `busy()` copied exactly from fxnew-clarity's).
1. `node --check` every changed js; tests.js parses; the probe parses as an async body; no CRLF; `git diff --check`; no mode change;
   every changed js's `?v=` raised (as version numbers).
2. The 7 new tests on fb24f68b's js: 7 FAIL, each naming the missing effect, none a TypeError.
3. The same on this branch: 7 PASS. 3b: the plate test re-run with `B31_PLATE_TOL` forced to −1 so it prints every measured number.
4. Neighbours on both trees, the same verdicts: '966 B26' / '966 B7', E1 Oil Paint / Pop Art / preview-equals-export, '482 12.6' /
   '482 12.7' / '986 C60' (Find Edges, Emboss), '784', '(queue 264)', 'every effect does something visible', 'inert', 691's
   pixel-sized setting, '692:', zero-means-zero, the sanitiser sweep, '793:', E1's catalogue, 745, 913.8, 747, '#484:', '733:', the
   featured-carousel gate (runc.js), and '966 B2' / '966 B15' (looks' runb.js).
5. The two edited shared tests' ORIGINAL bodies on this branch: E1 and 745 FAIL (why they were edited); 913.8 needs the DOM.
6. The collab fingerprint of both trees (the number to pin; SCHEMA_FP untouched here).
7. `treecheck.py fb24f68b HEAD`, `drops.py fb24f68b HEAD`.

Still owed after it: Chrome at 900 and 380 (`?only=966%20B31`, and 692 / 913.8 / 747 / 745 / the 482 sweeps), the plate bound set
from measurement, the sheets, and the fingerprint pinned with the rest.

## Merge notes (another agent built a different effect from the same base at the same time)

- **CATEGORY_OF**: both branches add a "batch 48" line after `clarity`. Keep both, one after the other, renumber the later one to 49,
  and move "The newest, so it leads the NEW row" to whichever line is last. Order decides the NEW row.
- **The shared lists** (E1 `LATER`, 745 `NEWEST_FIRST`, 913.8 `NEWER`): both put their id at the front (LATER: at the end). The
  merged lists must follow CATEGORY_OF's final order — newest first — or 745 fails.
- **913.8**: `newest = FM.fxRegistry.all().slice(-1)` is the LAST `FM.EFFECTS.push` in compositor.js. The two blocks both sit just
  before `FM._FX_TABLES`; the one placed second must be the one whose CATEGORY_OF line is last.
- **Busters**: both raise compositor to 225 and fx-registry to 28.37; the merge takes one bump above both (226 / 28.38) unless the
  other branch touched neither. fx-thumbs 60 likewise if the other changed it.
- **tests.js**: both append before the final `})();` — rebuild by blocks (the parallel-worktrees lesson), never a union merge.
- If B32 (Oil Paint's summed-area Kuwahara) lands later, `ctKuwahara` could be shared; nothing here depends on that.

## Unsure / worth a second look

- Nothing ran. The plate bound is a guess; the hue (4°) and band (±1 level) bounds and the 0.1 px ink bounds are hand arithmetic
  on byte rounding. If one is red on the first run, read its numbers before touching the kernel.
- Kuwahara's tie-break (the up-left square on an even gradient) shifts a smooth gradient by up to Smoothing / 2 px toward the
  lower right. Invisible on a gradient, but it is a bias; a symmetric tie-break (mean of the tied squares) would remove it at a
  small cost. Not done, so the sums stay exact and simple.
- On a reduced plate a SOFT edge reads a bigger jump than at the export (a plate pixel spans more of the ramp), so the phone may
  show a few more faint lines than the export. Hard edges match. Find Edges has the same limit (#986 batch 2 review).
- The silhouette outline is drawn inside the cut-out only (half the band), so a cut-out's outline looks half as wide as an inner
  line of the same width.
- Speed and memory unmeasured on his phone.
