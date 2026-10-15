# #966 §B49 — Split Toning (hunt/fxnew-splittone, refers to #545)

Branch `hunt/fxnew-splittone` (helper clone, local, NOT pushed), worktree `~/fm-helper-wt/fxnew-splittone`, on `85b71929`
(hunt/fxnew-drums: the effects landing plus every §B branch so far). Backlog `tools/design/plans/2026-09-29-idle-backlog/backlog.md`
§B49: *Split Toning · Colour · S*.

**NOTHING WAS RUN.** The API builder was live, so no node, no python, no browser — not even `node --check`. Every claim below is
from reading the code and from hand arithmetic. The proof is written and waiting: `scratchpad/agents/fxnew-splittone/prove.sh`
(results to `prove-result.txt` beside it), described at the end.

## Is it a duplicate? Checked first — no, but it is close to three things he already has

- ChatGPT's pile (`ssh/main:tools/design/chatgpt-tasks/pile/LAND-LIST.md`): no split tone, tint or toning effect.
- `ssh/main:REQUESTS.md`: "split ton" only in passing (#349's tile notes on Teal & Orange; Copperplate's "no split-tone look existed").
  POLISH-LOG v3.94: Tint gained Range + Keep brightness and "two Tints on one layer now give you a real split-tone".
- `tools/design/954-effect-names.md`: "Split Toning" is not one of Alight Motion's names; it is the photo editors' generic term.
- The registry, read row and kernel:

| Effect | What it does | Why Split Toning is not it |
|---|---|---|
| **Duotone** | maps brightness onto two colours; Blend Soft light / Overlay / Colour lays that map over the picture | **replaces** the picture's colour with the map (Colour keeps brightness but takes the map's hue); Soft light / Overlay change brightness; one Amount for both colours |
| **Teal & Orange** | a brightness split, warm above / cool below, Split point, Crossover, Balance, Keep brightness | the **same idea with its two colours fixed** (+42/+8/−42 and back) — no other look is possible |
| **Tint** ×2 | Range Shadows / Highlights + Keep brightness, one colour per instance | two effects, fixed bands, no Balance between them |
| **Colour Wheels** (B18) | lift / gamma / gain, hue + amount per wheel; its default is teal shadows and warm highlights | lift and gain **move black and white themselves** (black turns slightly teal) and, per channel, change a coloured pixel's brightness; colours are hue sliders |

So: **one effect, any two colours (keyframable swatches), each with its own strength, a Balance, and the picture's own colours AND
brightness kept exactly** (black stays black, white stays white). Built on that reading. The sheet puts Teal & Orange, Colour Wheels
and Duotone (Colour) beside it at their defaults, so he can judge "different enough" with his own eyes (question 1).

## What was built — one Colouring effect, `splittone`, "Split Toning"

| Row | Range (default) | What it does |
|---|---|---|
| Shadows | 0..100 % (**50**) | how much of the Shadows colour the darks take |
| Highlights | 0..100 % (**50**) | how much of the Highlights colour the lights take |
| Balance | −100..100 (**0**) | where the shadows end and the highlights begin: −100 most of the picture counts as shadow, +100 as highlight |
| Keep brightness | 0..100 % (**100**) | 100: a pure colour move, no pixel's brightness changes; 0: the colours bring their own brightness (a faded-film look) |
| Mix | 0..100 % (**100**) | how much of the result; 50 is exactly half the change |
| Shadows colour | swatch, **#1e90a0** (a teal), keyframable | greyed out ("Not used when Shadows is 0%") while Shadows is 0 |
| Highlights colour | swatch, **#ffa04a** (an orange), keyframable | greyed out while Highlights is 0 |

**The formula** (compositor.js, the block before `FM._FX_TABLES`):
- **The split.** h — how much of a pixel counts as highlight — is `smoothstep(l^γ)` of its Rec.601 brightness l (0.299 / 0.587 /
  0.114: the weights the app uses everywhere — Teal & Orange, Colourize, Clarity, the B33 tint, the suite's `_cgLuma`). 0 at black,
  1 at white, ½ at the split point q = 0.5 − 0.4 · Balance/100 (so 0.9 … 0.1), γ = ln ½ / ln q. Read from a 257-entry table with a
  linear blend: continuous, so a ramp cannot band; and for any l it rises with Balance, so Balance moves the split monotonically.
- **The push.** `(1 − h) · Shadows · S' + h · Highlights · H'`, where S' = S − Y(S) — the colour less its own brightness, which has
  no brightness in it (Y is linear and its weights sum to 1). So at Keep brightness 100 no pixel's brightness moves. Below 100,
  S' = S − (κ·Y(S) + (1 − κ)·l·255): at 0 a pixel's grey moves toward the colour itself and the pixel keeps its own colour on top
  (blacks lift toward the teal, whites settle toward the orange). At Keep 0 with both amounts 100 a grey becomes the two-colour map.
- **The fit.** The whole push is scaled down — never clipped channel by channel — wherever it would leave 0..255, so its hue holds and
  the brightness is kept exactly: **black and white have no room for a colour without brightness and stay black and white**; the
  colour fades in smoothly toward them. Mix multiplies after the fit, so Mix 50 is exactly half of Mix 100 (before rounding).
- **A point operation**: crop-safe (`CROP_FX`), on adjustment layers (`PIXEL_ADJ`, `ADJ_OK`), inside filters; nothing is in pixels, so
  the phone's 0.28 plate draws the export's very bytes. Never writes a pixel with alpha 0, never changes alpha, deterministic.
  Shadows and Highlights both 0, or Mix 0, return before touching a byte (the input, byte for byte).
- **Visible at its defaults** (teal and orange at half strength) — the 482 rule. Hand numbers: grey 64 → 38,75,74; grey 192 →
  218,187,151; the silent-no-op fixture #8fd4ff → about 171,206,213. Not in `KNOWN_NOOP`. On a pure black, pure white or full-strength
  layer (e.g. pure yellow) it does nothing at Keep brightness 100 — `NOOP_WHY` says why.

Also: `fx-registry.js` color2Gate can now be **dead at a slider value** (`deadAt`), as colorGate could (one guarded line; every other
second-colour row unchanged). Search words: split toning, split tone, split-tone, tint, teal and orange, grade, colour grade, color
grade, shadows highlights colour/color, warm and cool, cinematic (not "sepia" or "cross process": effects of their own). Tile photo:
**dog** (the strongest tonal structure — big darks and big lights; cat already carries Teal & Orange and Colour Wheels). Leads the
NEW row (batch 48, the newest). Name "Split Toning" is the backlog's and the generic photo term; not an AM name, not a trademark.

Files: js/compositor.js (the block), js/fx-registry.js (CATEGORY_OF batch 48, ADJ_OK, SEARCH_ALIASES, color2Gate deadAt),
js/fx-thumbs.js (PHOTO_OF.dog), js/inspector.js (NOOP_WHY), index.html busters — **compositor 224 → 225, fx-registry 28.36 → 28.37,
fx-thumbs 59 → 60, inspector 422 → 423**. No CSS. **C.SCHEMA_FP / SCHEMA_REV left alone**; prove.sh stage 6 prints the new number.

## The looks for his sheet (#545) — `render-probe.js`, next browser slot

Through `FM.renderScene`, POSTed to `'http://127.0.0.1:' + window.__recv + '/<name>.jpg'`, a FRESH Image per tile. Two across, three down:
- `st-looks-{dog,cat,bay}-p1/p2.jpg` — the photo; **Teal & orange, the default (RECOMMENDED)**; **Warm / cool** (blue #3a64d8 /
  gold #ffc65a, 45/45); **Sepia shadows** (#7a4a1e at 70 / cream #fff0c8 at 30, Balance −20); **Cross-process** (green #1f9e6e /
  yellow #f2dc3a, 60/60, Balance +20); teal & orange at 100/100; **Faded film** (Keep brightness 0); Balance −60 / +60; then
  **today's Teal & Orange, Colour Wheels and Duotone (Colour) at their defaults** for comparison.
- `st-defaults-dog.jpg` — strength 30 / 50 (built) / 70, pure teal #008080 + dark orange #ff8c00, blue-teal #2a7fb8 + amber #ffb347,
  Balance +20.
- `layouts.jpg` — A (built): the amounts first, both colours at the bottom (where the registry puts colour rows today); B: each colour
  right above its amount (RECOMMENDED, not built — needs colour rows placed among the sliders, a small registry change).

## Questions for Ezra (one picture each)

1. **Keep it?** Is it different enough from Teal & Orange, Colour Wheels and Duotone to be its own effect (st-looks-*, last three
   tiles)? The alternative is colour swatches on Teal & Orange — but that effect's name says its colours.
2. **The starting look** — teal & orange at 50/50 (built), 30, 70, or another pair? (st-defaults-dog)
3. **The panel** — A (built) or B (each colour above its amount)? (layouts.jpg)
4. **One-tap looks** — should Warm / cool, Sepia shadows and Cross-process become filters (or a Look row that writes the colours,
   as Black & White Mixer's Colour filter writes its sliders)? Not built.

## Merge notes

- **Other §B branches from the same base** (Black & White Mixer `hunt/fxnew-bwmix` took batch 48 too): CATEGORY_OF's `batch 48`
  line is a known merge point — renumber one of them (49), and keep the newest-first lists (`LATER`, `NEWEST_FIRST`, `NEWER`) in
  CATEGORY_OF's order read backwards (the later batch first in NEWEST_FIRST / NEWER, last in LATER). 913.8 stays on its "twelve
  newest" branch whatever the count (seventeen with this alone).
- **Busters**: this branch took compositor 225, fx-registry 28.37, fx-thumbs 60, inspector 423 — exactly what bwmix took; the merge
  needs each one above all of them.
- **fx-registry.js**: CATEGORY_OF (two lines after clarity's), ADJ_OK (two lines after `clarity: 1`), SEARCH_ALIASES (three lines
  after clarity's), the color2Gate line in paramsOf (bwmix touches the segment line a little above it — both apply).
- **fx-thumbs.js**: `PHOTO_OF.dog` becomes `['grayscale', 'splittone']` with its comment on the line above. **inspector.js**: one
  `NOOP_WHY` entry (and its comment) after `clarity`.
- **compositor.js**: one self-contained block right before `FM._FX_TABLES = …`; it pushes its row and sets POSTFX, PIXEL_ADJ and
  CROP_FX itself, touching no shared line. With bwmix both blocks sit there — keep both, order = batch order.
- **tests.js**: the block after `// ── end 966 B22 ──`, ending `// ── end 966 B49 ──`; the three shared-test edits above (one or two
  lines each). Queue 264's `ALLOWED` and `KNOWN_NOOP` are NOT touched by this branch. Never union-merge tests.js appends — rebuild
  by blocks.
- **Inert sweep** (two frames here: subject, hues): Shadows, Highlights, Balance, Keep brightness and Mix all move the subject frame
  (it has colour and a grey ramp) from the defaults; the colour rows are not swept. **Queue 264** (orange #e8a33d on black): no single
  extreme can erase it — at Keep 100 its brightness is kept, at Keep 0 it becomes about 246,155,23; nothing needed in `ALLOWED`.

## What prove.sh checks (WRITTEN, NOT RUN)

Refuses to start, and stops between stages, while a ship, a lock run or a live API builder is going (scratchpad/gapcheck.sh).
1. `node --check` every changed js; tests.js parses; the probe parses as an async body; no CRLF; `git diff --check`; no mode change;
   every changed js's buster raised.
2. The 6 new tests on 85b71929's js: 6 FAIL, each naming the missing effect, none a TypeError.
3. The same on this branch: 6 PASS.
4. Neighbours on both trees, the same verdicts (kept short): '482 5.3/5.4/5.5' (Teal & Orange, Tint, Duotone), '482 5.5 Duotone',
   '784:', '(queue 264)', the inert and visible sweeps, the silent no-op, '692:', '793:', E1, 745, 913.8, '#484:' aliases.
5. The edited shared tests' ORIGINAL bodies on this branch: E1 and 745 FAIL (why they were edited); 913.8 needs Chrome.
6. The collab fingerprint of both trees (the number to pin; SCHEMA_FP untouched here).
7. `treecheck.py 85b71929 HEAD`, `drops.py 85b71929 HEAD`.

Still owed after it: Chrome at 900 and 380 (`?only=966%20B49`, and 913.8 / 745 / the 482 sweeps / queue 264), the sheets, the panel
at 380 px (seven rows; both colour rows greying at amount 0), and the fingerprint pinned with the rest.

## Unsure / worth a second look

- Nothing ran. Every expected number in the tests is hand arithmetic from the formula, written beside each check; if one is red on
  the first run, read its numbers before touching the kernel. The tightest are the hue windows (20°) at greys 65–70 (about 7–10° off,
  where a little orange already mixes in) and the split counts per Balance step (gaps of about 50 against a floor of 20).
- The colour-row gate for the SECOND colour (`deadAt` on color2) is new: the inspector's `markOverridden` reads `deadAt` from any
  row, and colorGate's deadAt works on the first colour (Hexagon Tiles, B33), so it should — check the Highlights colour row greys
  at Highlights 0 in Chrome.
- The tile photo (dog) is chosen from the PHOTO_OF notes, not looked at — the sheet will show whether cat or bay reads better.
