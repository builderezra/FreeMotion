# #966 backlog §B37 — Laser Beam on `hunt/pile-laser` (15 Oct), ported from the ChatGPT pile

Ported BY HAND from ChatGPT's pile (`codex/690-reviewed-local`, pinned at `refs/pile/codex-690-reviewed`): **`44b15c57`** "Add
generative Laser Beam effect", with **`8efc6234`** "Keep Laser Beam pulse phase through keyed rate" — the land list's "Laser keyed
pulse" (`tools/design/chatgpt-tasks/pile/LAND-LIST.md` §B6, and §B2's note that both "need B6's effects"). Built on `85b71929` (the §B
chain tip, hunt/fxnew-drums). The model is Radio Waves (`hunt/fxnew-radiowaves`, a generator built to the same rules).
**When this lands, the pile commits `44b15c57` and `8efc6234` are to be DROPPED** — this branch replaces both; landing either would
register the effect twice or re-introduce the jump.
**Nothing was run** — no node, no browser, not even `node --check` — because the API builder was live. Every expected number in the
tests is hand arithmetic. The proof is written and waiting: `prove.sh` in the helper's scratchpad (below). His rule (#545) is that he
picks the look before anything ships; the build did not wait, so every look on the sheet is already an option of the effect.

## Not built before — checked

`git show ssh/main:REQUESTS.md | grep -i laser`: one hit, #954's rename list (*"Energy Beam → Laser Beam"* — Alight Motion's Energy Beam,
to be called Laser Beam here). POLISH-LOG: nothing. No `laserbeam` type in `js/` on 85b71929; the only "laser" there was a search word on
**Lightning** (`'energy beam', 'laser beam'`), standing in for want of this effect, and the Game sound pack's Laser (sfx.js, a sound).
Lightning is a different thing: jagged branching bolts, a pixel kernel. This is one straight beam between two points.

## What was taken from the pile, and what changed

| | The pile (44b15c57 + 8efc6234) | Here |
|---|---|---|
| Controls | Start X/Y, End X/Y (% of the frame), Beam width 1–60 px, Glow %, Intensity %, Pulse 0–10 Hz, Beam colour #ff4055 | **the same**, same order, labels and defaults; Pulse gets a note ("Beats a second; 0 keeps the beam steady") |
| The look | four `stroke()`s with round caps, added (`lighter`): Glow 6 widths across at 0.08, 2.6 widths at 0.22, the beam at 0.8, a white core 0.22 of the width (at least 1 px) at 0.95 | **the same four bands, as FILLS**: each is the round-capped stroke of the segment drawn as the shape it is (a half circle round each end joined along both sides). Same pixels in Chrome; the suite's soft canvas cannot `stroke()` |
| Placement | % of the project frame through the plate origin `__fmOX/__fmOY`, times the plate scale | **the same** (it was right; the pile's own cropped-plate test became part of test 2) |
| The pulse (44b15c57) | `0.7 + 0.3 sin(2π × Pulse(now) × clip time)` — the CURRENT Pulse times all the time since the clip began, so a keyed Pulse jumps the beat at every key | — |
| The pulse (8efc6234) | integrated when keyed, **but** `pulse ? beat : 1` reads the CURRENT Pulse: the moment a keyed Pulse reaches 0 the beam snaps from wherever the beat was to steady full — a jump the fix was meant to remove; and a plain Pulse near 0 beats around 0.7 while 0 is 1.0 | **the fix finished**: beats = ∫ Pulse from the clip's first moment (FM.integrateProp when keyed, Pulse × clip time when plain), beat = **0.7 + 0.3 cos(2π beats)**: full at the start and at every whole beat, 0.4 half a beat on. Pulse 0 is just "no beats" = full and steady, so there is no special case left to jump to; a Pulse keyed down to 0 holds the beam at the brightness its beat stopped at |
| Clock | `tl`, the dispatcher's FM.fxLocalTime, clamped ≥ 0 | the same clip clock (t0 = t − tl); before the clip's first moment, no beats |
| Registration | spliced into the main table beside Radio Waves / Lens Magnifier; desc in the row and in DESCRIPTIONS | **batch 48** at the end (`LB_ROWS`, just before `FM._FX_TABLES`), so it leads the NEW row; desc on the row only |
| Search | none | laser, laser beam, beam, energy beam, light beam, neon line, glowing line, sci-fi — **'energy beam' and 'laser beam' moved off Lightning** (it keeps 'bolt') |
| Extras | none | fx-thumbs tile (Width 2, corner to corner, ⅔ beat a second so the 1.5 s loop holds one beat), an inspector "changes nothing" reason (Intensity 0, or a white layer: the beam adds light), a seam `FM._laserBeamBeat(params, t, t0)` |
| Busters | compositor 266 → 267 etc. (ChatGPT's private count) | from this tree, once: compositor 224 → **225**, fx-registry 28.36 → **28.37**, fx-thumbs 59 → **60**, inspector 422 → **423** |
| Its tests | two `{ item: 'TBD' }` tests with a mock context that records `stroke()` calls | folded into eight `966 B37 …` tests that measure real pixels (below) |
| `outside/chatgpt/fixes/690-laser-*.md` | its reports | not carried (the land list's rule) |

**Why cos and not the pile's sin** (a quarter-beat shift of the same wave): with sin the beat starts at 0.7, so "no pulse" (1.0) and
"a very slow pulse" (≈0.7) are different pictures and the only way to make Pulse 0 steady is a special case — which is exactly what
jumped. With cos, Pulse → 0 slides continuously into the steady beam, keyed or not. On a plain Pulse the only visible difference from
the pile is that the beat starts bright instead of half way.

## The fix, in numbers (test 4)

Pulse 1 a second, held, then 2.5 from 1 s. As built: 1.2 s in, 1 + 0.2 × 2.5 = **1.5 beats** → 0.4 of full (alpha 81.6 at the measured
pixel). The pile's first formula: 2.5 × 1.2 = **3 beats** → full (204). Across the key (0.99 → 1.01 s) as built: 203.9 → 203.2; the
first formula: 203.9 → 82.3. A ramp 0 → 4 a second over 2 s is t² beats (the first formula: 2t²) — checked at 40 moments. Pulse 1
keyed down to 0 at 1.5 s: as built it stops at half a beat (81.6) and stays; 8efc6234 snapped to 204.

## The tests — 8, all `'966 B37 …'`, appended before the final `})();`

Each asks `_b37Need()` first (registry entry, then `FM._FX_TABLES.CANVAS_FX.laserbeam`), so on 85b71929 every one fails with "no
registry entry for laserbeam — the effect is not built" — never a TypeError. They call the kernel on a real canvas (`_b37Run`) or go
through `FM.renderScene` (`_986shot`), and measure runs of lit pixels along and across the beam, and the alpha at one pixel in its
colour band: no pinned bytes, so they hold in Chrome (antialiased) and the node soft canvas (aliased) alike.
1. **In the list** — label, Generative, POSTFX, CFX_NO_BBOX, not a pixel kernel; five search words in aliases and tags, and Lightning no
   longer answers 'laser beam' / 'energy beam'; described; the nine rows in order, labels, ranges, units, defaults, keyframable, the
   Beam colour picker; Width the only px key; on a shape, not an adjustment layer; the sanitiser keeps a fresh one whole; leads the NEW
   row behind only newer effects; on a 360 × 640 frame's FIRST frame the defaults change > 3000 px (≈ 11 000 by hand), Intensity 0
   changes none, a bare instance draws byte-for-byte what a new one draws.
2. **Geometry** — a 20 px beam from 10 % to 90 % of a 400 frame: lit along its row 30 → 370 (round ends), 20 px across, its middle at
   200, the white core 4.4 px (green > 200), the colour (255, 64, 85, 204) off the core / green / white on it; Glow 100's bands 120 and
   52 px across, alpha 20.4 and 76.5 (CONTROL: Glow 0 = 20 px); a cropped plate (origin at project 40, 80): 150 → 330 along row 120,
   110 → 130 down column 240; a half plate: 15 → 185, 10 px; a diagonal: 10 px either side across, 151.4 along each way.
3. **Pulse** — the alpha at (200, 192) is 204 × Intensity × (0.7 + 0.3 cos 2π Pulse t) ± 2: Pulse 0 steady, five fixed points, the
   formula every 0.1 s at 1.7 a second, Intensity 50 %, the clip's own clock (a clip starting at 0.4 s); Intensity 0 leaves a painted
   layer byte-identical (CONTROL: 100 changes > 1000 px).
4. **THE FIX** — above. CONTROL first: 1.5 beats and 3 beats read 81.6 and 204, so the measure separates them.
5. **Keyed flat = plain** — all eight rows keyframed flat draw what the plain numbers draw (≤ 1 level) at three moments (CONTROL: a flat
   Pulse of 1.9 against 1.7 changes > 200 px).
6. **Stateless** — 1.6 s after 0.3, 2.7 and 1.1 s is byte-identical, kernel and compositor, Pulse and Start keyed (CONTROL: 1.6 vs 1.7 s).
7. **The plates** — a white beam and a red pulsing one the other way on a 400 × 300 project at 0.5 and 0.28: the beam's middle down
   the column at x 200 is on its line in project px (within 0.75 / scale + 0.5), and the picture is within **`B37_PLATE_TOL` = 5 levels
   — A GUESS, marked TODO: set it from the first run's numbers** (prove.sh 3b prints them) of the export shrunk by area; positive
   controls must exceed 1.5 × the bound: a plate that drew Width in plate pixels (≈ 40 levels by hand), the beam 6 % lower (≈ 10–14).
8. **Every slider moves the picture** — the canvas twin of the inert sweep (which walks only PIXEL_FX): each of the eight sliders
   changes ≥ 20 px across its travel at 0.33 or 0.71 s (never 0 s: no beat has played there whatever Pulse is).

**Shared tests edited** (newest-first, `laserbeam` at the front): E1's `LATER` (+ laserbeam, last), 745's `NEWEST_FIRST`, 913.8's
`NEWER` (seventeen newer than Snow & Rain — still the "twelve newest, Snow & Rain out" branch).

**The sweeps, read against it (not run)**: queue 264 — no extreme erases the layer (it is always drawn first; the beam only ADDS
light; Intensity 0 leaves it untouched), so **no ALLOWED entry**. 784 — a bare instance is its defaults (LB_DEF is both the row's
defaults and the kernel's fallbacks). Zero means zero — every key through `fparam` (`== null`). 913.5 — placed through the plate
origin like Radio Waves. The inert and 482-visible sweeps walk only PIXEL_FX / WARP_FX: test 8 is its own sweep.

## The sheet — `render-probe.js` (next browser slot)

Through `FM.renderScene`, each tile a 1080 × 1080 project drawn at a quarter (the phone's reduced-plate path), POSTed to
`'http://127.0.0.1:' + window.__recv + '/<name>.jpg'`, a FRESH Image for every photo tile; how to run it is in its header.
- `laserbeam-looks.jpg` — defaults (recommended), hairline, thick, no glow, big glow, green, sky blue, white, Intensity 50 %, corner to
  corner; each over a dark frame, his clouds photo and a round logo the beam crosses.
- `laserbeam-pulse.jpg` — Pulse 0 (recommended), 1, 2.5 and 8 a second as strips of five moments; **the fix**: a Pulse keyed 1 → 2.5
  at 1 s as built vs the pile's first formula (drawn by the app itself as a plain Pulse equal to the keyed value at each moment, which
  IS that formula), and Pulse keyed down to 0 as built vs 8efc6234's snap to full. The summary prints the beat of both at each moment.

## Questions for Ezra (one picture each)

1. **The look** — the defaults row (recommended), or another row of `laserbeam-looks.jpg` (Width, Glow, colour)?
2. **Default colour** — red #ff4055 (the pile's; a classic laser), or green / blue / white?
3. **Pulse 0 by default** (steady, recommended) — or a gentle pulse out of the box?
4. **Glow** is two soft steps (the pile's look). Keep it, or a smooth falloff (not built — a gradient across the beam; one more look on
   the sheet if he wants it)?
5. **Follow the layer?** Start and End are shares of the FRAME, like Radio Waves' centre and Lens Flare's. Should there be a "Points on:
   the layer" choice, so a beam fired from a moving logo follows it? Not built.
6. **Search** — 'energy beam' and 'laser beam' now find Laser Beam instead of Lightning. Fine?

## What prove.sh checks (`…/scratchpad/agents/pile-laser/prove.sh` → `prove-result.txt`; WRITTEN, NOT RUN)

1. It will not start (and stops between stages) inside a ship, a lock run or a live API builder without a helper slot (gapcheck.sh).
2. `node --check` on the four changed js, tests.js parses, the probe parses as an async body; no CRLF, `git diff --check`, no mode change.
3. The eight new tests: each FAILS on 85b71929's js naming the missing effect (not a TypeError) and PASSES here; 3b the plate test with
   the bound forced to −1, for the numbers; **3c the fix proved**: the pile's first formula (Pulse now × clip time) put back in a COPY
   of this branch's js — THE FIX test must FAIL on the jump, the other seven still pass.
4. Lightning, `482 11.`, 784, queue 264 and the shared E1 / 745 / 913.8 on both trees with this tests.js — the same verdicts; then the
   ORIGINAL E1 and 745 on this js — they fail (why edited).
5. The schema fingerprint of both trees; `treecheck.py 85b71929 HEAD` and `drops.py 85b71929 HEAD`.

Still owed after it: Chrome at 900 and 380 (`?only=966%20B37`, and 913.5 / 913.8 / 745 / 747 / 784 / queue 264), the plate bound set
from measurement, the sheets for his pick, and the collab fingerprint pinned with the rest (`C.SCHEMA_FP` / `SCHEMA_REV` are left
alone here: the new params move it, so `921 S1 the schema fingerprint gate` is red on this branch until it is re-pinned in the gap).

## Merge notes (other §B / pile branches built from the same base)

- `index.html`: every §B branch bumps compositor / fx-registry / fx-thumbs / inspector from 224 / 28.36 / 59 / 422 — re-bump once above
  all of them when merging.
- `fx-registry.js` CATEGORY_OF: **batch 48 is also Radio Waves' and Gradient Wipe's number** (and others' from this base) — every id goes
  in, the batches renumbered in landing order, and only the last line says "The newest, so it leads the NEW row". SEARCH_ALIASES:
  append; the Lightning line changed here (two words moved off it).
- `tests.js`: the E1 / 745 / 913.8 lists — union by hand, newest batch first; the B37 block is self-contained (helpers `_b37*`,
  `B37_PLATE_TOL`) and uses the shared `_b36cv/_b36px/_b36shrink/_b36mad`, `_986shot/_986fx` and `E1`.
- `compositor.js`: the B37 block sits after Clarity's, before `FM._FX_TABLES`; it pushes onto `FM.EFFECTS` — the effect pushed LAST
  leads 913.8's "newest registered effect", so the merge order of the blocks must match CATEGORY_OF's.
- LAND-LIST §B6: mark `44b15c57` and `8efc6234` DROPPED (superseded by this), as Radio Waves did for `410a34d1` / `1b80bf41` / `8516f675`.

## Unsure / worth a second look

- Nothing ran. If a test is red on the first run, read its numbers before touching the kernel: the run measures carry ±0.5 px of
  sampling bias by design (tolerances 1.5–2 px, ±2 levels on the pulse pixel).
- `B37_PLATE_TOL` = 5 is a guess; the core's one-pixel floor (the pile's) makes a thin beam's core a little brighter on the 0.28 plate
  than the export shrunk — small by hand, but it is the likeliest thing to show in that number.
- A Pulse keyed down to 0 freezes the beam at whatever brightness the beat had (0.4–1) — continuous, but if he keys it to stop at a
  trough the beam stays dim. That is the honest integral; the alternative (fading the beat's depth with the rate) is not built.
- Cost: four filled shapes a frame, a keyed Pulse adds one short integration. Unmeasured on his phone, but far below Radio Waves.
