# #966 §B26 — Clarity & Dehaze (hunt/fxnew-clarity, refers to #545)

Branch `hunt/fxnew-clarity` (helper clone, local, NOT pushed), worktree `~/fm-helper-wt/fxnew-clarity`, on `6e6f01f7`
(hunt/fxnew-all: the effects landing plus the eight §B branches), so it joins that tree directly. Backlog
`tools/design/plans/2026-09-29-idle-backlog/backlog.md` §B26 (*Controls: Clarity, Texture and Dehaze −100..100, plus Radius 10–200
px (60, unit px). How: a midtone-weighted unsharp and a dark-channel dehaze*). Not built before: no `clarity` / `dehaze` type in
this tree, nothing in REQUESTS.md on ssh/main, and the two POLISH-LOG hits are other things (Liquid Glass's Clarity slider, v3.97;
Sharpen's wide radius called "clarity", v9.08).

**NOTHING WAS RUN.** The API builder was in its lock run and ship, so no node, no python, no browser — not even `node --check`.
Every claim below is from reading the code and from hand arithmetic. The proof is written and waiting:
`scratchpad/agents/fxnew-clarity/prove.sh` (results to `prove-result.txt` beside it), described at the end.

## What was built — one Colouring effect, `clarity`, "Clarity & Dehaze"

One effect rather than two because the three sliders share their machinery (one blur of brightness, one of the darkest channel,
one Radius) and a photo app puts them side by side; as two effects each would carry its own Radius. The sheet asks him (layouts.jpg).

| Row | Range (default) | What it does |
|---|---|---|
| Clarity | −100..100 (**30**) | local contrast: each pixel pushed away from its surroundings' brightness (a tent blur reaching about Radius); +100 is a 2.5x push at a mid grey, −100 pulls it to the surroundings (soft, dreamy) |
| Texture | −100..100 (0) | the same at a sixteenth of Radius — fine detail (bark, grain, skin) |
| Dehaze | −100..100 (0) | above 0 takes a veil of the Haze colour out (dark channel: contrast and colour come back together, 90 % at +100); below 0 lays a veil of it in (flat fog, 75 % at −100) |
| Radius | 10–200 px (60), `unit: 'px'` | how big the detail Clarity works on is (and the veil's neighbourhood) — PROJECT px |
| Keep blacks & whites | 0–100 % (100) | the midtone weight: at 100 pure black and white never move, at 0 every tone takes the full push |
| Protect sky | 0–100 % (50) | holds Dehaze back where the veil is near white (60–90 %), so a pale sky does not go grey; greyed out unless Dehaze > 0 |
| Haze colour | White / Blue / Warm (White) | the air light Dehaze takes out, and the veil it lays below 0 |

How it behaves, by construction (compositor.js, the block before `FM._FX_TABLES`):
- **No crush, no blow-out.** The push goes through a soft clip — darker scales the pixel toward black (L → L²/(L + push)),
  lighter scales its distance from white the same way — so no setting reaches 0 or 255 from a grey, and R, G, B scale together
  (the hue holds). Dehaze holds the veil at or below the pixel's own darkest channel, so no channel can go under black.
- **Never inverts a tone** on a grey ramp — argued in the code comments and swept by a test (240 settings). Both softening sliders
  below 0 together are held to one −100 between them for exactly that reason.
- **Neutral = the input byte for byte** (Clarity, Texture, Dehaze all 0 return before touching anything); a pixel with alpha 0 is
  never written; alpha never changes; deterministic (no randomness, nothing from the clock).
- **Not a point operation**, but **crop-safe** for the same reason Highlights & Shadows' Local radius is: both blurs are exact integer
  arithmetic (`hsBox`'s running sums of integer luma / darkest channel × alpha, exact in Float64 under the 300-px box cap), and
  transparent pixels weigh nothing, so the cropped readback with its 3 × Radius margin draws the full plate's bytes. In `CROP_FX`;
  '692' re-proves every member, and the new catalogue test checks it on a subject in a plate many times its size.
- **The phone's 0.28 plate draws the export shrunk**: the kernel takes `ps` itself and multiplies Radius by it (as Film Damage does),
  so pxToPlate leaves it alone. No ctx.filter (#986 C24 does not arise).
- **Adjustment layers** (`PIXEL_ADJ`, `ADJ_OK`): it grades the snapshot below exactly as the kernel grades that frame. Like Local
  radius it reads past a zoomed slice's 18 % margin, so `FM.adjNeedsFrame` now keeps the preview whole while a shown adjustment
  layer carries it (and holds a supersampled preview under 600 / Radius, the exact-tent limit).
- **Default Clarity 30** is a visible look (the '482 … something visible at its own defaults' rule). On ONE FLAT COLOUR there is no
  detail to lift, so 'no Colouring effect is a silent no-op' (a flat rectangle) lists it for that fixture only, as it does HSL
  Mixer; the inspector's "changes nothing" line says why (NOOP_WHY).
- Search: clarity, dehaze, de-haze, haze, remove haze, fog, defog, mist, structure, punch, local contrast, detail, crisp (not "pop"
  — Pop Art; not "sharpen" — Sharpen and Unsharp Mask). Browser tile on the towers photo (fx-thumbs `PHOTO_OF.towers`, beside Soft
  Glow — a pale, detail-packed aerial with the haze of distance). It leads the NEW row (batch 47, the newest).
- Names: "Clarity", "Texture", "Dehaze" are the photographer's generic slider names; none is an Alight Motion effect name (checked
  against `tools/design/954-effect-names.md` and PARITY.md) and none is a trademark.

Files: js/compositor.js (the block, and `FM.adjNeedsFrame`), js/fx-registry.js (CATEGORY_OF batch 47, ADJ_OK, SEARCH_ALIASES),
js/fx-thumbs.js (PHOTO_OF.towers), js/inspector.js (NOOP_WHY), index.html busters — **compositor 223 → 224, fx-registry 28.35 →
28.36, fx-thumbs 58 → 59, inspector 421 → 422** (each above this tree's, compared as version numbers). **C.SCHEMA_FP / SCHEMA_REV
left alone**: this tree is SCHEMA_REV 11 with its fingerprint still to measure; the new params move it again, and prove.sh stage 6
prints the number to pin in the gap.

## The tests — 7 new, all `'966 B26 …'`, appended before the final `})();`

Each asks `_cgNeed('clarity')` (B18's helper) before measuring anything, so on 6e6f01f7 every one fails with "no registry entry for
clarity — the effect is not built" (the catalogue test through `_cgListed`, which calls it first) — never a TypeError.
1. **In the list**: Colouring, the search words, described, defaults in range, adjustment layer + PIXEL_ADJ, CROP_FX, visible at its
   defaults (the 482 measure), the sanitiser keeps it whole; the seven rows and their defaults; Radius `unit: 'px'` and the only px
   key; the kernel takes `ps`; Protect sky gated by Dehaze > 0; Haze colour White / Blue / Warm; a bare instance draws its defaults;
   `FM._cropIdentity` byte-identical at three settings (CONTROL: the crop is smaller than the plate); leads the NEW row behind only
   newer effects.
2. **Neutral** byte for byte at three Radius / Keep / sky / colour combinations, at the export and the 0.28 plate; at four hard
   settings no transparent pixel written, no alpha changed (CONTROL: the defaults move the plate).
3. **Clarity**: a flat field (opaque and see-through) unmoved byte for byte; beside a soft edge the dark side darkens and the light
   side lightens (≥ 3 levels), ground past the Radius exactly unmoved, −80 brings the sides together; Texture grows a fine ripple
   (≥ 1.3x) and fades it at −100, and leaves a 40-column edge to Clarity; a 20 | 235 edge at full strength stays inside 1..254
   (CONTROL: it reaches < 15 and > 240); black and white never move under a push away, or under any push at Keep 100.
4. **Dehaze**: a washed-out (grey-lifted) picture gains ≥ 1.3x contrast and colour and comes ≥ 40 % nearer the clear one; −60
   flattens, greys and pales a clear one, Blue bluer, Warm warmer; a blue haze comes out better as Blue than as White; Protect sky
   100 moves a pale sky ≤ a quarter as much while the land below is byte-identical (CONTROLS: the unprotected sky moves ≥ 20, the
   land ≥ 10).
5. **Never inverts**: 10 slider combinations × 2 radii × 2 Keeps × 2 skies × 3 colours on a grey ramp (CONTROL: 240 ran, the
   strongest moves the ramp).
6. **Keyframes** (Clarity, Texture, Dehaze, Radius keyed = the evaluated value plain; animates; at its 0 key untouched) and **the
   plates**: the change drawn on a 0.5 and a 0.28 plate of a smooth field against the export's change shrunk, within
   **`B26_PLATE_TOL` = 3 levels — A GUESS, marked TODO: set it from the first run's numbers** (prove.sh 3b prints them), with
   positive controls that must exceed 1.5x the bound and twice the measured error: Radius read in plate pixels (the C5 fault), and
   the plate drawn at another Dehaze.
7. **Adjustment layer and filters**: across B18's patches (48 px here) the adjustment layer and a filter on it equal the kernel run on
   the frame below, byte for byte, at 1 and 0.5; where the effect reaches no other patch (Radius 10) every patch centre gets the
   kernel's own bytes four ways (on each patch, adjustment layer, filter on it, filter on each patch); a flat patch alone is left
   alone by Clarity and Texture while the adjustment layer finds the edges (CONTROL); `FM.adjNeedsFrame` asks for the whole frame
   (maxScale 6 at Radius 100) for a shown layer, not for a hidden one, not for Colour Wheels (CONTROL).

**Shared tests edited** (the merge agents' newest-first form, `clarity` at the front): E1's `LATER` (+ clarity, last), 745's
`NEWEST_FIRST`, 913.8's `NEWER` (now sixteen newer than Snow & Rain — still the "twelve newest, Snow & Rain out" branch), and 'no
Colouring effect is a silent no-op' `KNOWN_NOOP` (+ clarity, for its flat-rectangle fixture; NOT added to 529's app list). 747 needs
nothing (Clarity needs no setting; Match Grade is planted as before). '966 B2 / B15 / B7' already ask "behind only effects
registered after it", so they hold with clarity leading the row (the row reads clarity, audiospectrum, filmdamage, shapewipe,
colorflash, hslmixer, tonecurve, colorwheels, starglow, timeecho, popart, censor — glitter leaves it).

## The sheet — `render-probe.js` (next browser slot)

Through `FM.renderScene`, POSTed to `'http://127.0.0.1:' + window.__recv + '/<name>.jpg'`, a FRESH Image loaded for every tile:
`clarity-clouds-p1/p2.jpg` and `clarity-towers-p1/p2.jpg` (Clarity 30 default, 60, 100, −50, −100, Texture ±60, Radius 20 / 150,
Keep 0, and an alt default Clarity 20 + Texture 20), `dehaze-clouds-p1..p3.jpg` and `dehaze-towers-p1..p3.jpg` (Dehaze 30 / 60 / 100,
Protect sky 0 / 100, Haze colour Blue / Warm, −30 mist, −60 fog in White / Blue / Warm, and two alt defaults with a little Dehaze),
and `layouts.jpg` (one effect with seven rows — built — against two effects). Two tiles across, three down: phone-sized pages.
The tiles are 340-px projects, so Radius 60 there is about a sixth of the frame; on a 1080-px export the same look wants roughly
three times the Radius (worth saying when he picks — or the question below).

## Questions for Ezra (one picture each)

1. **The starting look** — Clarity 30 alone (recommended), Clarity 20 + Texture 20, or Clarity with a little Dehaze? (clarity-*,
   dehaze-* alt tiles)
2. **One effect or two** — "Clarity & Dehaze" with seven rows (built), or a separate Clarity and Dehaze? (layouts.jpg)
3. **Haze colour** — White / Blue / Warm buttons (built), or a full colour row (a swatch, keyframable)? (dehaze-* Blue / Warm tiles)
4. **Protect sky's default** — 50 % (built), 0 or 100? (dehaze-* Protect sky tiles)
5. **Radius in project pixels** (built, the app's rule) means the same number looks smaller on a 4K project than on a phone clip —
   keep, or make Radius a % of the frame's short side?
6. **Dehaze below 0** is a flat fog over everything — fine, or should the fog thicken with brightness (more in the distance, less on
   a dark foreground)? Not built.

## What prove.sh checks (WRITTEN, NOT RUN)

Refuses to start, and stops between stages, while a ship, a lock run (`full-unchanged`) or a live API builder is going.
1. `node --check` every changed js; tests.js parses; the probe parses as an async body; no CRLF; `git diff --check`; no mode change.
2. The 7 new tests on 6e6f01f7's js: 7 FAIL, each naming the missing effect, none a TypeError.
3. The same on this branch: 7 PASS. 3b: the plate test re-run with its bound forced to −1 so it prints every measured number.
4. Neighbours on both trees, the same verdicts: '966 B18/B19/B20/B7', '482 5.', '784', '(queue 264)', 'every effect does something
   visible', 'inert', 'no Colouring effect is a silent no-op', '692:', zero-means-zero, the sanitiser sweep, '793:', E1, 745, 913.8,
   747, '#484:', '733:', the featured-carousel gate (runc.js), and '966 B2' / '966 B15' (looks' runb.js).
5. The three edited shared tests' ORIGINAL bodies on this branch: E1, 745 and the silent no-op test FAIL (why they were edited).
6. The collab fingerprint of both trees (the number to pin; SCHEMA_FP untouched here).
7. `treecheck.py 6e6f01f7 HEAD`, `drops.py 6e6f01f7 HEAD`.

Still owed after it: Chrome at 900 and 380 (`?only=966%20B26`, and 692 / 913.8 / 747 / 745 / the 482 sweeps), the plate bound set
from measurement, the sheets, and the fingerprint pinned with the rest of fxnew-all.

## Unsure / worth a second look

- Nothing ran. Every expected number in the tests' thresholds is hand arithmetic, not measured: the soft-edge ≥ 3 levels, Texture ≥ 1.3x, the hard edge inside 1..254 (that one is guaranteed by the soft clip), the
  Dehaze 1.3x / 0.6x, Protect sky's quarter. If one is red on the first run, read its numbers before touching the kernel.
- The never-inverts proof is careful for each control alone and for the combinations the sweep runs; a mixed Clarity −100 with
  Dehaze +100 is not in the sweep (not proven either way — on a ramp's ends at most).
- Memory: an export frame with Clarity, Texture and Dehaze all on and transparency in the plate holds five Float64 sum buffers
  (about 80 MB at 1080 x 1920). An opaque clip needs three. Pooled, not reallocated per frame. A quarter-resolution blur (the
  backlog's suggestion) would cut that but would break the exact-integer crop safety; worth measuring on his phone.
- Speed is unmeasured (four box passes per blur over the plate; a fixed cost per pixel whatever the Radius).
- The AI vocabulary (ai-manifest effectVocab) gains seven params.
