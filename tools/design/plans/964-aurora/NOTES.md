# #964 — Aurora only, the outline from the bottom middle (branch hunt/964-aurora, base ssh/hunt/948-review d61c591e)

CODE ONLY. Nothing was run: no browser, no server, no python, no suite, no prove, no mutate. A release ship was running
on the laptop. The only checks were `node --check` on js/timeline.js, js/variant.js and tests/tests.js (all OK), a CR-byte
grep (none) and greps for leftovers.

## The decision this follows

REQUESTS.md #964, the line under the entry (verbatim):

> ✅ **UNBLOCKED 11 Oct, ~10:05 AWST — decided by the PM under his standing rule (#1130: "Go through each one and see where it's an obvious yes"); he can overrule:** Aurora, with the outline starting at the bottom middle; the other variants are removed.

His 28 Sep answer under #974 was *"make them all happen in the app but it's just random which one"*, and #974's plan says
that when he decides, "the chosen one becomes fixed and the losers are DELETED (not left in behind a flag)". This branch is
that deletion. #981 (the menu opens at once, the lights run round its edges) is kept whole; only its "every colour, both
starts" parts went.

## What changed

- `js/timeline.js`
  - Colour: `areaPress` is now Aurora itself (the old `pressAurora` body, unchanged). `pressRings` (B) and `pressKeys`
    (C, the canvas and its `_fxDraw` seam) are deleted. No `FM.variant('emptytap.colour', …)` call, no `dataset.variant`.
  - Outline: `fxHalves(g)` only builds the bottom-middle halves (the exact arcs it always drew for 'bottom').
    `fxRimPoints` and the nearest-edge walk are deleted. `areaPulse(a)` no longer calls `FM.variant('emptytap.start', …)`
    and no longer sets `dataset.start`.
  - The menu's rim (#981): `menuRim(sheet)` always starts at the bottom-middle. `fxLastPress` existed only to hand the
    press's start and finger position to the rim, so it is gone, with its write in `areaFx` and its read in `openFromArea`.
  - Kept as they were: Aurora, the travelling lap (`fxLap`), the add menu's rim and its arrival guard, the 3-layer cap,
    the timer teardowns, and reduced motion (`areaCalm`; the rim still stays off).
  - The comments now say what was decided, when, and by whom, and where the deleted code still lives (git v17.55, and
    `tools/design/plans/2026-09-26-emptytap/prod-press-BC.js`).
- `js/variant.js`: header only. The clapper (#957) is the one animation still asking. #947 and #964 are listed as
  decided, with a note that old `emptytap.*` entries may still sit in a phone's `fm.variantLog` (nothing writes new ones,
  and nothing reads them; left alone rather than adding a migration).
- `index.html`: `js/variant.js?v=2 → 3`, `js/timeline.js?v=264 → 265`. **Re-check both against main when landing.** If
  v17.56 bumped either, bump once more from main's number.
- `styles.css`: nothing. B and C had no CSS of their own (inline styles only), and `.tl-areafx--press > div` is Aurora's too.

## Tests

| Test | What happened |
|---|---|
| `974 the empty area's tap colour: A Aurora, B Rings and sparks and C Key ripple each play when chosen, and 60 real presses play all three` | **DROPPED.** Asserts the random choice that was retired. The new 964 test replaces it. |
| `974 option B, Rings and sparks: its rings sweep the WHOLE area out from the finger` | **DROPPED.** B is deleted. |
| `974 option C, Key ripple: its wave of keys lights the WHOLE area out from the finger` | **DROPPED.** C is deleted. |
| `974 the outline's other start: from the edge nearest the finger, both ways round, meeting on the far side` | **DROPPED.** The nearest-edge start is deleted. |
| `981 a real tap on the empty area opens the add menu at once - every colour, both outline starts - and the colour keeps playing under it` | **RETARGETED + RETITLED** to `981 a real tap on the empty area opens the add menu at once - and its Aurora colour keeps playing under it`. It is still a real finger with the same timing checks, now two plain taps with the menu shut in between. It checks the colour under the menu by what it draws (six curtains, no ring, spark or canvas), not by a label. Budget 60 s → 30 s. |
| `981 the glowing lines run round the add menu's own edges as it opens, …` | **EDITED, same title.** The nearest-edge section is removed. The `dataset.start` label check became a geometric one: seeked to t=0, both lights sit at the menu's bottom-middle. The keyboard path checks only that the lights are there (it read the label). |
| `964 clauses 1 5 6 …`, `964 clauses 3 4 …`, `981 review: Enter on the empty add row …` | **EDITED, same titles.** The `FM.variant.force('emptytap.*', …)` lines are gone, because there is nothing left to force. |
| helpers `onEmptyArea964`, `onEmpty981` | Their `finally` no longer clears the `emptytap.*` forces. |
| **NEW** `964 the empty-area tap always plays Aurora with the outline starting at the bottom middle — no other colour or start is chosen` `{ item: '964' }` | **ADDED** (after `964 clause 6`). See below. |

The `974 FM.variant picks at random…` test and the clapper's 974 tests are untouched, because variant.js still serves #957.

### The new test

17 presses on the empty area, each judged by WHAT IT DRAWS:
- Aurora is six moving `.fx-curtain` and no `.fx-ring`, `.fx-spark` or `canvas`.
- The start is both `path.fx-core` lights seeked to t=0. They must be within 6px of the area's bottom-centre x, and in its
  bottom 40px.

How the presses are made:
- **The old seam**: `FM.variant.force` set to each retired option, B+nearest, C+nearest, B+bottom, C+bottom and A+nearest.
  Nothing it says may reach the press.
- **The dice**: `Math.random` held for exactly one press at each of (k+0.5)/12, k = 0…11. That hits every bucket of any
  2- or 3-way chooser, so a chooser that is still there is made to pick each option. It is restored in a `finally` each time.
- Every press point is near an edge and asserted to be more than 100px from the bottom-centre, so a start that followed
  the finger would begin elsewhere.

CONTROLS:
- (a) The press points are asserted, as above.
- (b) Each press: the same light read, seeked to the END of the lap, must find both lights at the top-centre. That
  proves the read reads where the lights are, rather than echoing the bottom.
- (c) The colour classifier, shown B's and C's own markup as v17.55 built it, must name them B and C, and must name
  Aurora's markup Aurora. B is `.fx-tint`, three `.fx-curtain.fx-ring`, thirty `.fx-spark` and `.fx-core`. C is
  `canvas.fx-keys`. This is the honest control now that the real B and C no longer exist in the tree.

**Expected on the base (prove's reverted side), not run:** press 1 forces B+nearest, which on v17.55 plays B, so it
fails at its own sentence:
`press 1 (the old chooser forced to B with the nearest start, by the left edge) played B, Rings and sparks - #964 was decided on 11 Oct: Aurora on every press, the other colours removed`.
The dice half would fail on the base too, at k=4 (Math.random 0.375 → B) even without the seam.

On prove's reverted side, the edited tests (964 clauses 1 5 6 / 3 4, the two 981 tests, 981 review Enter) may read DEAD
(they pass on HEAD too, since their forces are gone and HEAD may pick bottom/A by chance) or CAUGHT. Both are acceptable
to prove.sh; only the new 964 test is the proof.

## For the release that lands this

- **DROPS TEST lines for msg.txt** (ship.sh's name gate):
  - `DROPS TEST: the four #974 tests of #964's retired variants ("974 the empty area's tap colour: A Aurora, B Rings and sparks and C Key ripple each play when chosen…", "974 option B, Rings and sparks…", "974 option C, Key ripple…", "974 the outline's other start: from the edge nearest the finger…") — #964 decided 11 Oct (Aurora, from the bottom middle, the other variants removed), so they went with the code; "964 the empty-area tap always plays Aurora…" holds the decision.`
  - `DROPS TEST: "981 a real tap on the empty area opens the add menu at once - every colour, both outline starts - and the colour keeps playing under it" — retitled, not removed: there is one colour and one start now, so it is "981 a real tap on the empty area opens the add menu at once - and its Aurora colour keeps playing under it".`
- **tools/.test-floor must go down by 3** (written `test('` lines: 3084 → 3081 on this base: four dropped, one added).
  I did not touch it, because main's number may have moved by landing time. `floor_ahead_check` prints the exact line in
  a second.
- POLISH-LOG: the line can claim `queue 964`, and the new test is its catching proof. Whether #964 closes is the
  builder's call. Its clauses 1–6 were built in v17.12/v17.13, and clause 7 (#545) is the sheet below.
- **#545 picture:** nothing new to draw. Aurora is option A on the sheet he was sent in the logging chat,
  `tools/design/plans/2026-09-26-emptytap/send-pick-and-timing.jpg` (A alone: `sheet-3-A.png`, `sheet-3b-A-corner.png`;
  the lap: `sheet-2-pulse.png`). If anything is sent with the release, send `sheet-3-A.png` with one line: "the tap
  colour is now always this one (A, Aurora), and the lights always start at the bottom middle; say if you want another
  back."
- Browser checks still owed (none were done): a press on the empty project at 380 and 440, several times, at the
  edges and the middle. It should be Aurora every time, the lap should start bottom-middle, and the add menu's rim should
  start bottom-middle too. Also check reduced motion (calm fade, menu at once, no rim).

## Unsure

- The new test stubs `Math.random` around a synchronous `pointerdown`/`pointerup` pair. Anything else listening to those
  events that drew random numbers would get the constant for that one press. I found nothing in the empty-area path
  that does.
- I removed the `data-start` / `data-variant` labels rather than keep them as constants. No CSS or tool reads them.
  `tools/design/974/render.py` and `tools/design/981/strip.js` still call `FM.variant.force('emptytap.*')`. That is now
  a harmless no-op, but those design scripts would render Aurora/bottom for every "variant".
