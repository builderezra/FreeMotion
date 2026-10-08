# H54: glide #715, the release velocity under a slow machine

Branch `hunt/glide-velocity` (off origin/main 842a23de). Files: `js/inspector.js` (`attachGlide`), `tests/tests.js` (one new test).

## The brief is half stale (Read)
"The release velocity is the last pointer sample" was true before #715 and is not true on main. `attachGlide` (js/inspector.js:797) already
reads the travel over `GLIDE_WINDOW = 100` ms and returns 0 when the pointer was still for `GLIDE_REST = 80` ms (:790-791, `releaseV` :812).
What is still wrong is narrower: the stall samples (zero movement, the hand stopping as the button releases) COUNT as the window's end. At 8 ms
spacing two of them cost 16 ms of a 100 ms window and the flick still reads fast. Under load the samples are 24+ ms apart, the two stall samples
fill ~50-75 ms of the window, and the flick reads 0.1 to 0.2 px/ms, under the 0.25 mouse bar (`GLIDE_MIN_FLICK_MOUSE`). That is the red H52 saw.

## Why the existing test is red only inside a full pass (Measured)
`glide (#715): a mouse flick glides` passes ALONE 4/4 here (1280 and 380, 1x and 2x throttle, `results/base_2x_1280.json`); H52 saw it red in 2 of 6
throttled slices. It paces its samples with `setTimeout(8)`; inside a busy page under 2x those become tens of ms. A real-time test is as honest as the clock.

## The fix (js/inspector.js, `attachGlide`, 12 lines)
- `releaseV` ends the window at the last sample that MOVED (`while (m > 0 && tr[m].x === tr[m-1].x) m--`), not at the last sample.
- The parked test is measured from that same sample (`e.timeStamp - last.t > GLIDE_REST`), so zero-movement events cannot keep a parked pointer live.
  This also means a stall of more than 80 ms in total, zero events or none, is "parked", exactly as before.
- The trail prune keeps `GLIDE_WINDOW + GLIDE_REST` ms (it was `GLIDE_WINDOW`), so the moving samples before a trailing stall are still there to read.
- Touch and fine mode: untouched (the touch bar, `cancelDrag` and the fine-mode stop are not read here). Callers of `attachGlide`: three (inspector.js
  :998 the fx scrub strip, :4499 a value box, :4581 a strip), all through `releaseV`, so one place fixes all. The timeline's own momentum
  (js/timeline.js:5487) has a separate velocity and was not in the brief; I did not read it for this.

## The test (tests/tests.js, after the #715 test): `glide (#715) H54 …`
No sleep between samples: every pointer event gets its own `timeStamp` (`Object.defineProperty` on the instance, the only clock `attachGlide` reads), so the
gaps are exact and identical at 1280, 380 and under any throttle. A: eight 10 px moves g ms apart + two zero samples + release, g = 8/16/24/26, must glide.
B: 90 ms of stillness, must not. B2: six zero-movement samples across 90 ms, must not (the guard on the "ignore trailing zeros" change).
The existing real-time #715 test (A, B, C fine mode, D touch) is unchanged and green on the fix.

## Proof (Measured here; `results/`)
| tree | 1280 1x | 380 1x | 1280 2x | 380 2x |
|---|---|---|---|---|
| fix + both #715 tests | green | green | green | green |
| inspector.js reverted to origin/main, same tests | RED: A at 24 and 26 ms | RED same | RED same | RED same |

On the revert only the A cases for 24 and 26 ms fail; B and B2 pass on both trees, which is right: they are guards on the new rule, not detectors of the old bug.
Two things not shown: a real mouse on a real desk (the 2x run is a throttle of this container, not a hand), and the full-suite pass the H52 red came from
(the new test does not use the clock, so it cannot drift there; the old one still can).
