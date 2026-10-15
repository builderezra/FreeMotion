# #966 backlog §B41 — Odometer Roll on `hunt/pile-odometer` (15 Oct), ported from the ChatGPT pile

Ported BY HAND from ChatGPT's pile commit **`93dceac1`** ("Add mechanical odometer text effect", on `codex/690-reviewed-local`,
pinned at `refs/pile/codex-690-reviewed`), with the fix LAND-LIST.md's batch B6 prescribes for it: *"single-line only, or lay out
lines with `FM.textLines`; add a two-line test."* Built on `85b71929` (the §B chain tip, hunt/fxnew-drums). Spec:
`tools/design/plans/2026-09-29-idle-backlog/backlog.md` §B41 ("Odometer Roll | Text | M").
**When this lands, the pile commit `93dceac1` is to be DROPPED** — this branch replaces it; landing both would register the effect twice.
**Nothing was run** — no node, no browser, not even `node --check` — because the API builder was live. The proof is written and
waiting: `prove.sh` in the helper's scratchpad (below).

Not built before: `odometer` / "Odometer" appear nowhere in 85b71929, REQUESTS.md or POLISH-LOG.md. The nearest thing is **Number Roll**
(`counter`, queue 904), which counts by swapping the whole number each frame; this one rolls each digit like a mechanical counter.

## The fix: the proper one (multi-line through FM.textLines), not "single-line only"
Chosen because the app already had everything it needed, and it came out SMALLER than the pile:
- The pile drew its own row (`drawOdometerText`): the whole string — label, newline and all — as ONE line of fixed-width columns at
  y = 0, and it needed three special cases so the layer's box agreed with that row (the draw site's caption plate, `layerSize`, and a
  third measuring path). A second line — a typed newline, or a wrap at the border he drags — had its digits painted over the middle.
- Here the counter goes into the STRING (each wheel's resting digit), so FM.textLines lays it out exactly as plain text, and the layer's
  box, wrapping, the caption plate and hit-testing need no special case at all. The painter only changes what is drawn INSIDE a turning
  wheel's character box, on its own line — the same technique Word Highlight (§B9) uses to light a word: the line is drawn by the plain
  path's own two lines under an even-odd clip with a hole per turning wheel, then each hole shows the wheel's digit leaving upwards and
  the next one coming up from below. When nothing turns (every whole number, Progress 0 and 1) the plain path draws the text untouched.

## What was taken from the pile, and what changed

| | The pile (93dceac1) | Here |
|---|---|---|
| Controls | From, To (±99,999,999), Progress 0–1 (0.005 notch, default 0), Minimum digits 1–8 (4), Decimals 0–2 (0), Thousands Off / Commas, Your text Replace / Keep (Keep) | **the same**, same order and defaults; Your text gained Number Roll's note |
| The string | `toFixed` — ROUNDED, so at 9.5 it read "10" while the wheels showed 9 turning to 10 | each wheel's **resting** digit (floor): "09" at 9.5, "10" at 10 — the string is what is drawn whenever nothing turns |
| Layout | its own row at y = 0, fixed columns as wide as the widest digit | **THE FIX**: FM.textLines' lines, the plain path's alignment and line height; each wheel in its own character's advance |
| Carry | a higher column turns over the last tenth of its OWN cycle — the hundreds turned through the whole of 90 → 100 | **a real carry chain**: a wheel turns only while every wheel below it passes 9 → 0, all by the same Roll (0099.5 turns three, 0095.5 one). A judgement call — question 4 |
| The window | `fs × 1.16`, clip widened by the outline | **one font size** — the height of the line's own box, so a turning digit never leaves the layer's measured box (plates, hit area) |
| Sign | a reserved slot measured as wide as "−" | **the same idea**: "−" below zero, a figure space (U+2007) in its place while the count is not below zero, so the digits do not jump |
| Bounds | three extra measuring hunks (draw site, layerSize, a third path) | **none** — the plain layout is the box |
| Curved text, Animate presets | drawn by the normal path without the roll | **the same** (the resting digits, no roll) |
| Registration | spliced into the main table after Number Roll; desc twice (row + DESCRIPTIONS) | pushed **straight after Word Highlight's row** (so the first 205 the 921 fixture freezes, and E1's six, stay put); desc on the row only; search words added |
| Tile | none | `odometer`: two digits counting 0 → 25 across the strip (the sample "Abc" has no number, so Keep makes the counter the text) |
| Busters | compositor 223 → 224, fx-registry 25.43 → 25.44 (ChatGPT's private count) | from this tree, once: compositor 224 → **225**, fx-registry 28.36 → **28.37**, fx-thumbs 59 → **60** |
| Its test | one `{ item: 'TBD' }`: the 09 → 10 carry behind "Score: 0%", on a fake context | folded into `966 B41 the counter at t …` — the same case, now "Score: 09%" with both columns half turned (not the rounded "10%"), and "Score: 10%" at Progress 1 |
| `outside/chatgpt/fixes/690-odometer-roll.md` | its report | not carried (the land list's rule) |

Where it lives — `js/compositor.js`: `TEXT_FX.odometer` (beside Word Highlight's), the block after Word Highlight's catalogue row
(`FM.EFFECTS.push({ type: 'odometer' … })`, `odometerState` = `FM._odometerState`, `odometerLayout` = `FM._odometerLayout`,
`drawOdometerLines` = `FM._drawOdometerLines`), and the still-text draw site (`_odo`, one `else if` after Word Highlight's).
`js/fx-registry.js`: CATEGORY_OF `odometer: 'text'` written beside `wordhighlight` (not a batch line, for the same reason), TEXT_ONLY,
search words. `js/fx-thumbs.js`: the tile.

### The rules it keeps
- **Stateless**: a pure function of the params at t (`fparam`) and the layer's text; no clock of its own — Progress is a value,
  keyframed like any param, so a scrub, the preview and the export agree.
- **Text layers only** (TEXT_ONLY), never in the NEW row (FX_FEATURED skips TEXT_ONLY), no px params (nothing scales with the plate:
  the window is a font size, drawn under the layer's own transform).
- **Precedence on a still frame**: curve → Word Highlight with something lit → Odometer with a wheel turning → plain. An effect AFTER
  it that rewrites the string (Text Reverse, Type-On…) leaves the resting digits with no roll; Type-On's dark-caret line is drawn as
  the plain path draws it. A font with proportional figures shifts by a digit's width difference as the count changes (so does
  Number Roll); most fonts, the usual system sans faces among them, have tabular (equal-width) figures.

Search words: odometer, counter, count up, rolling digits, rolling numbers, digit roll, mechanical counter, flip counter, scoreboard, tally.

## The tests (each fails on 85b71929 on its first line, `_b41need()`: "there is no Odometer Roll in the effects catalogue …")
1. **`966 B41 Odometer Roll is a text effect in the catalogue …`** — Text, text layers only, the seven controls in order with types,
   ranges, defaults and options, Progress keyframable on 0.005, search words reach the tags, described, not in the NEW row, at ≥ 205
   and before E1's six; a bare instance = a new one (fallbacks are the registry's), "Score 7" → "Score 0000" at defaults, junk Progress
   held; the tile override counts across its three probe moments and turns at one of them (where fx-thumbs.js is loaded).
2. **`966 B41 the counter at t …`** — fourteen cases against the formula written in the test from the mechanism (floor of the count in
   its smallest unit; the lowest wheel turns by the fraction; a higher one by the same fraction only while every wheel below rests on
   9): rest, 95.5 (one wheel), 99.5 (three), 9999.25 over eight, the pile's own Score: 0% case at 0.95 and at 1, decimals through a
   carry, commas, $ and decimals with Keep, below zero and the kept sign place, Replace, Keep with no number, Keep across a newline;
   each wheel's index points at its own digit; the carry spelled out (95.5 → [0], 99.5 → [2, 1, 0]). Where glyphs are drawn: a count at
   rest through the real compositor = the plain text of the formula's string, byte for byte (centre, left with commas, right below zero).
3. **`966 B41 THE FIX — a two-line layer …`** — two fixtures half way through a carry: **wrapped** (9999.5 over eight digits, wrapped by
   the border after four: "0000" / "9999" — both lines roll, one wheel on line 1 and four on line 2) and **label** ("Visitors" over
   "0099 today", three turning on line 2), each left / centre / right. (1) The layout the painter uses: every wheel on its own line, at
   the plain text's x for its character (measured in the test) and that line's middle, its box its character's advance, the turning
   counts per line. CONTROL: the pile's one-row layout, replicated in the test, puts line 2's wheels ≥ 5 px (in fact half a line)
   away, so the 0.01 px checks can tell. (2) The painter on a recording context: each line drawn once as the plain path draws it, with
   an even-odd hole exactly at each turning wheel's box; each turning wheel's digit at (x, y − half a window) and next digit at
   (x, y + half a window), left-aligned, each clipped to its own box; nothing else drawn. (3) Where glyphs are drawn: outside the
   turning boxes the picture is the plain text's (≤ 3 levels — label letters and resting digits stay put), and inside each box it is
   FM's own rendering of that wheel's two digits drawn alone at those two places (≤ **`B41_BOX_TOL` = 16, a guess marked TODO(first
   run)**; it should measure ~0).
4. **`966 B41 with no wheel turning it draws the plain text byte for byte …`** (glyphs only) — at rest, Progress 0 and 1, on plain,
   outlined, gradient, wrapped, right-aligned, curved and Pop-in text at two moments; mid-turn, curved and Pop-in draw the resting
   count; Text Reverse after it draws its plain string; CONTROL: mid-turn straight text differs.
5. **`966 B41 stateless and keyframable …`** — keyframed From / To / Progress = the typed values at six moments (state and picture;
   CONTROL: one moment is mid-turn); the two-line fixture drawn forwards, backwards and out of order gives the same bytes; asking other
   moments does not change one.
6. **`966 B41 on a phone's reduced preview plate …`** (glyphs only) — the wrapped fixture at 48 px mid-carry on 0.5 and 0.28 plates vs
   the export shrunk (`_b36shrink` / `_b36mad`), within **`B41_PLATE_TOL` = 4, a guess marked TODO(first run)**; CONTROLS: a fifth of
   a turn behind, and nothing turning, must both be > 1.5 × the bound.
7. **`966 B41 every Odometer Roll slider and choice changes the picture …`** (glyphs only) — From, To, Progress, Minimum digits,
   Decimals across their travel, Thousands on a count past 999, Your text on "Score 0 pts".

## Sweeps, read against it (merge notes)
- **No sweep walks a text effect**: queue 264 and 784 draw a SHAPE layer, where a text effect does nothing (applyTextEffects runs only
  for text), and 793 reads only the defaults — hence test 7. **queue 264 `ALLOWED`: nothing added** (it cannot erase its shape fixture).
  The inert / visible-at-defaults / zero-jump sweeps walk PIXEL_FX / WARP_FX only.
- **E1's `BETWEEN`**: `'odometer'` added after `'wordhighlight'` (the row is pushed between the first 205 and E1's six, like Word
  Highlight's). **745's `NEWEST_FIRST` and 913.8's `NEWER` are NOT edited, and neither is E1's `LATER`**: a text-only effect never joins
  the NEW row, and odometer is not the last registered effect (913.8 reads `all().slice(-1)`), so the brief's "front of the newest-first
  lists" does not apply — Word Highlight's precedent. No `batch NN` line in CATEGORY_OF, so no batch-number merge with the siblings;
  a sibling that adds another TEXT effect the same way adds its id to `BETWEEN` after this one.
- **Busters**: compositor 225, fx-registry 28.37, fx-thumbs 60 — every §B / pile branch from 85b71929 bumps the same three from the
  same values, so the merge takes one number above all of them.
- **C.SCHEMA_FP / SCHEMA_REV left alone** (the new effect moves the fingerprint; prove.sh stage 6 prints the number to pin in the gap).
- Number Roll (`counter`) and Word Highlight (`wordhighlight`) are untouched; the draw site's only change is one `else if` after
  Word Highlight's, reached only while an Odometer Roll wheel is turning.

## The sheet: `render-probe.js` for the next browser slot
How to run it is in its header (tools/serve.sh + `tools/design/plans/fxnew-looks/recv.py` + tools/shot.py). It POSTs each sheet as a
JPEG to `'http://127.0.0.1:' + window.__recv + '/<name>.jpg'` (`?fmrecv=` works too). Every tile is a 1080 x 540 project at a quarter.

| Sheet | What it shows |
|---|---|
| `odometer-rows.jpg` | one row per setting, five moments each: defaults keyed across the clip, a carry 0099 → 0100, Keep "Score: 0 pts", "$0.00" through 9.98 → 10.02, commas through 999,990 → 1,000,010, −5 → 5, two lines (the fix), a number wrapped at the border, right-aligned with an outline |
| `odometer-fix.jpg` | half way through a carry: **as built** beside **ChatGPT's pile** (its painter replicated in the probe from 93dceac1) — two lines centred, wrapped, left, right |

## Questions for Ezra
1. **Should it count by itself?** As built (and as the pile had it) Progress defaults to 0, so a new Odometer Roll shows a still 0000
   until Progress is keyframed. Word Highlight plays on its own; this could too (count from From to To across the clip by default).
2. **Below zero**: keep the blank sign place while the count is positive (built — the digits never jump), or drop it so a counter that
   only touches zero does not carry a blank on its left?
3. **The name**: "Odometer Roll" (the backlog's and the pile's), or something plainer like "Rolling Counter"?
4. **The carry**: built as a real odometer (a wheel moves only while the one below goes 9 → 0); the pile turned higher wheels earlier
   and more slowly (the hundreds through the whole 90s). The sheet's carry rows show the built one.

## What prove.sh checks (`…/scratchpad/agents/pile-odometer/prove.sh` → `prove-result.txt`)
1. It will not start (and stops between stages) inside a ship, a lock run or a live API builder without a helper slot (gapcheck.sh).
2. `node --check` on the three changed js, tests.js parses, the probe parses as an async body; no CRLF, `git diff --check`, no mode change.
3. The seven new tests (runb.js, a glyphless soft canvas): each FAILS on 85b71929 naming the missing effect (not a TypeError); on the
   branch 4 PASS and the 3 picture-only ones are NOT RUN. **3c, the fix proved**: the pile's one-row layout put back in a COPY of this
   branch's js (`const L = lines;` → `const L = [lines.join(' ')];` in odometerLayout) — the two-line test must FAIL on line 2.
   **3d, the carry proved**: the pile's carry rule put back — the counter test must FAIL at 95.5.
4. Word Highlight's catalogue and same-bytes tests, Number Roll's 904, #484, queue 264, 784, 793, E1, 745, 913.8 on both trees — the
   same verdicts. 5. E1's original body fails on the branch (why BETWEEN was edited). 6. The schema fingerprint of both trees.
   7. `treecheck.py` / `drops.py` 85b71929 HEAD.

## Not done here
- The picture halves run only in Chrome: one slice in a browser slot —
  `python3 tests/_cdp.py --port 8777 --url 'http://localhost:8777/tests/run.html?only=966%20B41'` (and at `--width 380`) — and its
  messages print the numbers `B41_BOX_TOL` and `B41_PLATE_TOL` are to be set from.
- The sheet has to be rendered in a browser slot and sent to him (#545); his answers to the questions are one-line changes (the
  Progress default, the figure space, the label).
- SCHEMA_FP still has to be pinned (with the other §B branches, in the gap).
- The pile commit `93dceac1` has to be marked DROPPED in the land list when this lands.
