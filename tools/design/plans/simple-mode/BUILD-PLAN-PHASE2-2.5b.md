# Release 2.5b: closing 2.5's gaps (S8)

Branch: `hunt/simple-2.5b` (on top of `hunt/simple-2.5`). Patches and scripts: `scripts-2.5b/`. Labels: Verified = ran it here (Chromium 141, Linux container), Read = read in code, Guess = not checked.

## 1. The three gaps, and what happened to each

### (a) Grips for non-main items: DESIGN says yes, built
DESIGN §sound row (Read, `DESIGN.md:2548`): "The selected sound draws on top at full height until the selection clears, and its trim grips (≥ 24 px) work on that drawing." And the gestures bullet (`DESIGN.md:2556`): "…moves an item in time … edge grips trim with a length readout and a live preview". So grips on selected text, overlays and sounds are in the design; 2.5 only drew them for main clips.
- `S.canArrange(id, o)` takes `{look:true}`: as a LOOK, a friend who can edit hides a main clip's grips (trimming ripples, which waits) but not an item's (trimming an item moves nothing else). Viewers see none.
- `S.planTrimItem` / `S.cmd.trimItem`: one step, writes nothing before the release.
- `js/simple-timeline.js`: `gateOf(id, look)`, `drawGrips` generalised (called after the sound row is built, otherwise the sound grips were drawn under it), `onGripDown` entry/node for items, commit routed to `trimItem`.
- Tests (Verified): `S8a` x2 (grips, drag = one step, nothing else moved, Viewer none, friend in: item keeps, clip loses). Red on the 2.5 tip (Title has 0 grips), green on 2.5b, 1280 and 380.

### (b) Brakes 3 and 4: tests written, and the first version of the brake 3 test was DEAD
`S8b brake 3` and `brake 4` drive the real mouse to the edge and call the loop's own frame by hand 400 times.
**Finding (Measured):** mutations B1 (remove the `Math.min(limit, …)`) and B2 (far limit read live) both SURVIVED the first test. Cause: that test dragged a MAIN clip, which becomes the last slot after ~216 px of scroll and brake 4 stops the strip, so brake 3 was never reached. Fixed by dragging an overlay (not pinned by brake 4). Now B1, B2 and B3 (pin off) are all caught: "the strip scrolled to 21600, past the far limit 630".
Both tests pass on the 2.5 tip too, as they should: the brakes were copied in 2.5, the tests are coverage.

### (c) Finger version of the click-swallow mutation: runs HERE
**Correction to the 2.5 doc (§3, §5 "NOT RUN HERE"): the finger tests DO run in this container.** `FM_TOUCH_PAGE=1 python3 tests/_cdp.py ...` (what `tests/_touch_pass.py` does) opens a browser of its own with real touch emulation, one finger test per browser (a second one reports "this page already ran a finger test"). Verified, 1280 and 380: S3's hold/swipe test, S3's pinch test and S8c all PASS for real. Mutation N6 (`if (false) { swallowUntil = 0;`, the swallow removed) is red under the finger test; on a mouse it survives because Chromium sends the click to the row, not the clip (that was the 2.5 finding).
Run: `scripts-2.5b/s8_touch.sh <tree> <port> <width> <label> <only>` (needs a server on the port, `sh tools/serve.sh <port>`).

## 2. What was run (Measured)
| run | result |
|---|---|
| new tests on the 2.5 tip (`wt-s8red`) | S8a x2 RED (0 grips), S8b x2 pass (coverage) |
| new tests on 2.5b, 1280 and 380 | all green |
| `?only=simple`, 2.5b, 1280 | 125/128 + 3 finger tests NOT RUN in the plain pass |
| `?only=simple`, 2.5b, 380 | 125/128 + the same 3 |
| the 3 finger tests, `FM_TOUCH_PAGE=1`, one browser each, 1280 and 380 | 6/6 pass |
| mutations (`scripts-2.5b/s8_mut.sh`) | B1 B2 B3 A1 A2 A3 A4 all CAUGHT (B1 and B2 only after the test fix above); N6 caught in touch mode |

## 3. Traps for whoever runs this
- A server left on a port keeps serving the OLD tree: the first "red-first" run reported 4/4 green on the 2.5 tip because a leftover server on the port was serving 2.5b. Use a fresh port per tree.
- `mutate.sh --only` needs `FM_CHROME` exported and the expected title among the named titles.
- Guess: the item grips on a very short item (under 0.2 s) have no room for two 24 px hits; not tested.
