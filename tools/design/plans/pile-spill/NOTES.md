# #966 §B54 — Spill Suppressor, ported from the pile (hunt/pile-spill, refers to #545)

Branch `hunt/pile-spill` (helper clone, local, NOT pushed), worktree `~/fm-helper-wt/pile-spill`, on `85b71929` (the tip of
hunt/fxnew-drums: the effects landing plus every §B branch so far). Source: ChatGPT's pile commit **`36039096`** ("Add standalone spill
suppressor effect"), which LAND-LIST lists with no written fix. **When this lands, DROP `36039096`** — everything worth keeping from it
is here, reworked; its `outside/chatgpt/fixes/690-spill-suppressor.md` report and its `?v=` numbers (compositor 227, fx-registry 25.47,
which count along ChatGPT's private history) were deliberately not taken.

**NOTHING WAS RUN.** The API builder was live, so no node, no python, no browser — not even `node --check`. Every claim below is from
reading the code and from hand arithmetic. The proof is written and waiting: `scratchpad/agents/pile-spill/prove.sh` (results to
`prove-result.txt` beside it), described at the end.

## Does the app already have this? Partly — inside the keys, not as an effect

- **Chroma Key** has a Despill slider (queue 904, v16.56): the key's dominant channel pulled down to the larger of the other two.
- **Chroma Key Pro** has Despill (0.7) and, since #482 12.1, *Despill from* Key colour / Green / Blue (hunt C3 fixed it always pulling green).
- **REQUESTS.md #484 clause 2** designed a *Spill Remover* (Alight Motion's *Key Spill Cleaner*) and did not ship it: it would have been
  **invisible at its default on the tile sample** (#661). Round 13 (v8.98) skipped a spill control on Chroma Key because Pro had one.

Both existing controls only act INSIDE their own key, on the pixels that key keeps. A standalone effect is different and is what §B54
asks for: after either key, on a clip keyed somewhere else (a transparent PNG or video from another app — nothing in the app can take
its rim off today), after a Luma Key, or on an adjustment layer over several keyed layers. Same arithmetic as the keys' Despill at its
Gentle setting, so a shot fixed either way looks the same.

## What was built — one Keying effect, `spillsuppressor`, "Spill Suppressor"

| Row | Range (default) | What it does |
|---|---|---|
| Spill colour | Green / Blue / Key colour (**Green**) | which channel is spill |
| Amount | 0..100 % (**100**), keyframable | how much of the excess goes; 0 = the input byte for byte |
| Method | Gentle / Strong (**Gentle**) | the spill channel pulled down to the LARGER of the other two (Gentle) or their AVERAGE (Strong) |
| Keep brightness | 0..100 % (**0**), keyframable, greyed at Amount 0 | puts the Rec.601 brightness the cut took back, as grey |
| Area | Whole subject / Soft edges only (**Whole subject**) | Soft edges only weights the cut by how see-through the pixel is |
| Key colour | a swatch (**#00c23c**), keyframable, greyed unless Spill colour is Key colour | its strongest channel is the spill channel |

**The formula** (compositor.js, the block before `FM._FX_TABLES`), per pixel with alpha: `v` the spill channel, `x`, `y` the other
two, `lim = max(x, y)` (Gentle) or `(x + y) / 2` (Strong). If `v > lim`: `cut = (v − lim) · Amount · w` (`w` = 1, or
`min(1, 2 · (1 − a/255))` on Soft edges only), `v −= cut`, and with Keep brightness `k` all three channels gain `up = wk · cut · k`
(`wk` the spill channel's Rec.601 weight: 0.587 green, 0.114 blue, 0.299 red).

- **Which despill is it, and is it the standard?** The pile used the **max-of-the-other-two limit** — the standard "Gentle"/limit
  despill, and exactly what both keys' Despill already does here. Strong (the average limit) is the other standard mode in compositing
  apps; it takes more but turns yellows orange (230,235,60 → 230,145,60), which the row's note says. Neither is a desaturate-toward-a-
  replacement-colour method (AE's Advanced Spill Suppressor "Standard"); that one also greys real greens in the subject and needs a
  colour picker, so it was not added.
- A colour whose spill channel does not lead — a grey, a red, a blue (on Green), skin with no cast — is never touched, byte for byte.
- **Keep brightness**: at 100 % the Rec.601 brightness is unchanged within rounding, and the spill stays gone (adding the same to every
  channel keeps the spill channel exactly where the despill put it relative to the others). **Gentle can never clip** doing so (the
  spill channel was the biggest and only came down: `lim + up ≤ v ≤ 255`); Strong can on a bright pixel, held at 255 there.
- **Key colour** reads the colour's strongest channel the way Chroma Key reads its key (ties to green, then blue): the default key
  green behaves as Green to the byte, a blue key as Blue, a teal-green #30c8b0 as Green, a red key pulls red.
- **A point operation**: crop-safe (`CROP_FX`), on adjustment layers (`PIXEL_ADJ`, `ADJ_OK`), inside filters; no setting is in pixels,
  so the phone's 0.5 / 0.28 plates draw the export's very bytes. Never changes alpha, never writes a pixel with alpha 0, deterministic.
- **The default is visible** (the 482 rule, and #484's lesson): on the 482 frame the green-led pixels (the lower middle of its oval, e.g. 128,191,165 → 128,165,165) lose tens of levels; the browser
  tile is the keyshot (half chroma green #18c454, which goes to a dark teal 24,84,84).

## What was taken from the pile, and what was fixed

Taken: the effect and its name, the Keying (`matte`) category, the max-of-the-other-two limit, the key channel picked from a colour,
Soft edges only and its weighting `min(1, 2(1 − a/255))`, alpha never touched, transparent pixels never written, search words
(despill, green spill, blue spill), and its test's four pixels (folded into the third '966 B54' test).

Fixed / changed:
1. **The hue weighting is gone.** The pile scaled the cut by how close the pixel's HUE (CbCr angle) was to the screen's, with a Hue
   range of 50 %. Spill on a warm subject is yellow-green, far from #00c23c's hue, so at the pile's defaults green-spilled skin
   160,180,120 (green 20 over red) lost **1 level of its 20** (cos similarity 0.539 against a 0.49 threshold → weight 0.057). That is
   #484's "invisible at its default" all over again. The plain channel limit is what every compositing app uses, and it already
   leaves every colour whose spill channel does not lead alone. The sheet has a simulated tile of the pile's version beside ours.
2. **Its row sat in the middle of the main table** (just before Fill Silhouette), which renumbers every effect after it — E1's check and
   kitchen921's frozen slice of the first 205 depend on that order — and its CATEGORY_OF entry joined **batch 34** (beside Chroma Key
   Pro), so it could never lead the NEW row. Now pushed after the table in a self-contained block, CATEGORY_OF **batch 48**.
3. **Full-frame only, refused on adjustment layers** ("stays on the full-frame path until crop equivalence is confirmed"). It is a
   point operation: `CROP_FX`, `PIXEL_ADJ`, `ADJ_OK`, proven by `_cropIdentity` and `_cgPlaced` in the tests.
4. **Added Strong and Keep brightness**; **no Mix** — Amount already scales the cut and its brightness restore in a straight line, so
   a Mix slider would be the same slider twice (one more row on a phone for nothing).
5. **Default Amount 100 %, not 60 %** (a suppressor's job is to suppress; Chroma Key Pro's Despill starts at 70 %).
6. Spill colour is a **Green / Blue / Key colour** row, the swatch greyed unless Key colour (the pile always read a colour swatch);
   the kernel's fallbacks equal the registry's defaults (784); NaN from a bad keyframe reads as the default; browser tile on the
   keyshot; `NOOP_WHY`; more search words, including the #484 design's name (spill remover) and Alight Motion's (key spill cleaner),
   as Chroma Key Pro is found by "advanced chroma key".
7. The pile's description said "after keying"; ours says where else it works (a clip keyed elsewhere, an adjustment layer).

Files: js/compositor.js (the block), js/fx-registry.js (CATEGORY_OF batch 48, ADJ_OK, SEARCH_ALIASES), js/fx-thumbs.js (keyshot
subject), js/inspector.js (NOOP_WHY), index.html busters — **compositor 224 → 225, fx-registry 28.36 → 28.37, fx-thumbs 59 → 60,
inspector 422 → 423**. No CSS. **C.SCHEMA_FP / SCHEMA_REV left alone** (pinned once at the top of the chain; the new params move the
fingerprint, so '921 S1 the schema fingerprint gate' is red until then — prove.sh stage 6 prints the number). The row's Method note
was reworded after the first commit (it first said Strong turns yellow-greens pink; measured by hand it turns yellows orange) — that
one-line change rode in the tests commit `c8a5963d`.

## The tests — 7 new, all `'966 B54 …'`, appended after `// ── end 966 B22 ──`

Each asks `_cgNeed('spillsuppressor')` (B18's helper) before measuring anything — the catalogue test through `_cgListed`, which calls
it first — so on 85b71929 every one fails with **"no registry entry for spillsuppressor — the effect is not built"**, never a TypeError.
1. **In the list**: Keying (the `_cgListed` sweep with its Colouring line swapped for Keying), six search words, described, defaults in
   range, adjustment layer + PIXEL_ADJ, CROP_FX, visible at its defaults, the sanitiser keeps it whole; the six rows in order and their
   defaults; Amount / Keep brightness keyframable 0..100 %; Keep brightness greyed at Amount 0; Key colour keyframable and greyed
   unless Spill colour is Key colour; no px keys; a bare instance draws its defaults (CONTROL: the defaults move the plate);
   `_cropIdentity` at three settings (CONTROL: the crop is smaller); registered after Clarity & Dehaze; leads the NEW row.
2. **Amount 0 = the input byte for byte** at four settings × three plates; CONTROL: the defaults move ≥ 200 bytes; no alpha changed and
   no transparent pixel written at five hard settings (CONTROL: the plate HAS transparent green-led and blue-led pixels).
3. **Green**: skin 180,200,140 → 180,180,140 (Gentle), 180,160,140 (Strong), 190 / 180 at Amount 50; a fringe 96,150,80 at alpha 128
   → 96 / 88 with alpha kept; Soft edges only: opaque untouched (CONTROL: Whole subject cuts it), alpha 128 / 64 → 70, alpha 200 → 121;
   grey, pure red, a blue and skin without a cast untouched at Strong + Keep 100; a yellow kept by Gentle, turned orange by Strong;
   a grey ramp untouched at four settings; across a hue ramp green lands on the bound (±0.5) wherever it led and nothing else moves
   (CONTROL: green leads on ≥ 90 hues); the pile's four pixels on Green, Blue and Soft edges only.
4. **Blue and Key colour**: blue-spilled skin 180,150,210 → B 180 / 165; Blue leaves green-spilled skin alone and Green leaves
   blue-spilled skin alone (CONTROL: Green moves green-spilled skin); on the hue ramp Blue never moves red or green and moves blue on ≥ 90
   hues; Key colour = Green for #00c23c and #30c8b0, = Blue for #2040e0; a red key 230,120,110 → 120,120,110; on Green / Blue a red Key
   colour changes nothing (CONTROL: on Key colour it does).
5. **Keep brightness**: five green-led colours at Gentle and Strong: at 100 % brightness within 1 level and green no longer leading
   (≤ 1), at 50 % half the drop (± 1); CONTROL: off, each darkens > 3 levels. The whole hue ramp at Gentle + 100 % within 1 level.
6. **Keyframes and plates**: Amount, Keep brightness and the Key colour (green-led at 0.4 s, blue-led at 1.5 s, through queue 555's
   resolver) keyed = plain; the keyed colour really reaches the kernel; a keyed Amount animates and is the input at its 0 key; the 0.5
   and 0.28 plates equal the export byte for byte at three settings.
7. **Adjustment layer and filters**: `_cgPlaced` on the 12 patches at Green Strong + Keep 60 and Blue Strong + Keep 100 (5 of 12
   patches move in each, above its CONTROL of 4).

**Shared tests edited** (newest-first, as `clarity` was): E1's `LATER` (+ spillsuppressor, last), 745's `NEWEST_FIRST` and 913.8's
`NEWER` (front; NEWER is now seventeen, still the "twelve newest, Snow & Rain out" branch). **Queue 264's `ALLOWED` is NOT edited**: the
effect never touches alpha and its fixture (orange #e8a33d) has green and blue below red, so no extreme changes it at all. The inert
sweep (read, not run): Amount moves green-led pixels on both frames (the subject's lower half, the hue sweep's greens); Keep brightness
is gated `liveAbove` Amount, so the sweep turns Amount to 100 and it moves the same pixels. The zero-jump sweep's star (#7fd6ff) has no
green lead, so it sees nothing either way (not flagged: nothing moves at any value).

## The sheet — `render-probe.js` (next browser slot)

Through `FM.renderScene`; POSTed to `'http://127.0.0.1:' + window.__recv + '/<name>.jpg'`; a FRESH Image for every tile. There is no
green-screen photo in fx-art, so the probe makes one: the dog from dog.jpg cut to a soft oval with a ragged, hair-like rim, its rim lit by
the screen's colour (and a faint cast all over), laid on the screen; keyed by Chroma Key Pro with its own Despill and Edge desaturate at 0
over a warm grey (#6a6058); Spill Suppressor after the key.
- `spill-green-p1/p2.jpg` — the raw shot, keyed with no fix, **defaults (RECOMMENDED)**, Strong, Keep brightness 100 / 50, Soft edges
  only, Amount 50, **today's Chroma Key Pro Despill 0.7** for comparison, Strong + Keep 100, on an adjustment layer, and **the pile's
  version** (its kernel copied into the probe and run on the keyed render — the ground's green never leads, so only the subject moves).
- `spill-zoom.jpg` — the hair edge at 3x for six of those.
- `spill-blue.jpg` — a blue-screen shot: Blue (RECOMMENDED), left on Green (nothing happens — the control), Key colour, Strong + Keep 100.

## Questions for Ezra (one picture each)

1. **Gentle or Strong as the starting Method?** Gentle (recommended) keeps skin and yellows; Strong takes more green off and turns
   yellows orange. (spill-green p1, spill-zoom)
2. **Keep brightness — start at 0 (built), 50 or 100?** Off, the rim goes darker where the green came out; on, it stays as bright but
   greyer. This is the real look question. (spill-green p1, spill-zoom)
3. **Keep Soft edges only?** It is the pile's idea and costs one row; useful when the subject is meant to be green inside. (p2)
4. **No Mix slider** — Amount already does it. Fine?
5. **The name** — "Spill Suppressor" (the backlog's and the pile's, built), "Spill Remover" (what #484 called it), or "Despill"?

## Merge notes

- **Siblings on the same chain** (Black & White Mixer on hunt/fxnew-bwmix took batch 48 from fb24f68b too): CATEGORY_OF's `batch 48`
  will be claimed twice — renumber, and keep the newest-first lists (`LATER`, `NEWEST_FIRST`, `NEWER`) in CATEGORY_OF's order read
  backwards. 913.8 stays on its "twelve newest" branch whatever the count.
- **Busters**: this branch took compositor 225, fx-registry 28.37, fx-thumbs 60, inspector 423 — the same numbers bwmix took; the
  merge needs each one above all of them.
- **fx-registry.js**: CATEGORY_OF (one line after clarity's), ADJ_OK (one line after `clarity: 1`), SEARCH_ALIASES (one entry after
  clarity's) — all three are where bwmix adds its own lines too; take both.
- **fx-thumbs.js**: one line under the keying subjects (`spillsuppressor: 'keyshot'`). **inspector.js**: one `NOOP_WHY` line after
  `clarity` (bwmix adds one there too).
- **compositor.js**: one self-contained block right before `FM._FX_TABLES = …`; it pushes its row and sets POSTFX, PIXEL_ADJ and
  CROP_FX itself, touching no shared line. With bwmix's block in the same place, keep them in batch order.
- **tests.js**: the block after `// ── end 966 B22 ──`, ending `// ── end 966 B54 ──`, plus the three shared-list lines. Never
  union-merge tests.js appends — rebuild by blocks.
- **SCHEMA_FP**: new params; pin once with the rest of the chain.
- **The pile**: drop `36039096` (LAND-LIST line 148) — do not apply it on top; its row placement would move every effect after it.

## What prove.sh checks (WRITTEN, NOT RUN)

Refuses to start, and stops between stages, while a ship, a lock run or a live API builder is going (scratchpad/gapcheck.sh).
1. `node --check` every changed js; tests.js parses; the probe parses as an async body; no CRLF; `git diff --check`; no mode change;
   every changed js has its buster raised.
2. The 7 new tests on 85b71929's js: 7 FAIL, each naming the missing effect, none a TypeError.
3. The same on this branch: 7 PASS.
4. Neighbours on both trees, the same verdicts (kept short): Chroma Key softness, 904, 986 C3 / C4 / C40, 482 12.1, '966 B26 ', 784,
   queue 264, the 482 visible sweep, the inert sweep, zero-jump, the sanitiser sweep, E1, 745, 913.8, the featured-carousel gate.
5. The edited shared tests' ORIGINAL bodies on this branch: E1, 745 and 913.8 FAIL (why they were edited) — 913.8 may be NOT RUN in node.
6. The collab fingerprint of both trees (the number to pin; SCHEMA_FP untouched here).
7. `treecheck.py 85b71929 HEAD`, `drops.py 85b71929 HEAD`.

Still owed after it: Chrome at 900 and 380 (`?only=966%20B54`, and 692 / 913.8 / 745 / the 482 sweeps / queue 264), the sheet, the panel
at 380 px (six rows; three segment rows), and the fingerprint pinned with the rest.

## Unsure / worth a second look

- Nothing ran. Every expected number is hand arithmetic, written beside each check; if one is red on the first run, read its numbers
  before touching the kernel. Uint8ClampedArray rounds halves to even — the Strong bound checks allow ±0.5 for that.
- `_cgListed` is the Colouring helper; test 1 drops only its "not Colouring" line. If that helper's wording changes, the filter must too.
- The probe's shot is synthetic (a dog cut out and lit green by arithmetic); real footage will show more texture. If his phone has a
  green-screen clip, the same settings on it would be a better sheet.
- The zero-jump and 482 sweeps were read, not run; the reasoning for each is above.
