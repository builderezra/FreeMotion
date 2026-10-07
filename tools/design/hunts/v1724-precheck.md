# H13 partial note: v17.24 pre-check (SUPERSEDED, stopped by the PM)

Status: **stopped on the PM's instruction** because the laptop ships v17.24 itself. This is a partial note from results already
saved. No further runs were made. Do not treat it as a full pre-check.

## What ran (Measured)
- Tree: `release/v17.24` at ca8eb537, Chromium 141 (`/opt/pw-browsers/chromium-1194`), headless, software GL, no H.264/AAC.
- Scratch change, NOT in the repo: three tests that do a real MP4 export were switched to `notRunHere(...)` because they hang in this
  container (they sit at tests.js lines 98313, 98387 and 98483 of that copy). They are the 3 "patched in the scratch copy" entries below.
- The suite was run as four ordered slices (`?upto=` / `?after=`) per width. Slice sizes 572 + 572 + 573 + 571 = 2288 test slots.
- **1280: all four slices finished.** **380: slices 1-3 finished, slice 4 (about the last 570 tests) was killed, so it has no result.**
- **Caveat on the 380 pass (Guess, not checked):** its slices 1-3 gave the same failures as 1280, down to the first error line, and the
  driver was launched with `--width 380`. I did not verify the app really saw a phone-width window (one failure text says "900px viewport").
  Until someone checks `innerWidth` in that run, treat 380 as unconfirmed.

## Totals, 1280 (Measured)
| slice | result | red | NOT RUN HERE |
|---|---|---|---|
| 1 | 567/572 | 5 | 0 |
| 2 | 565/572 | 5 | 2 |
| 3 | 546/573 | 25 | 2 |
| 4 | 432/571 | 24 | 115 |
| all | 2110/2288 | 59 | 119 |

380 slices 1-3: 567/572, 565/572, 546/573 with the same 5, 5 and 25 reds. Slice 4 not run.

## NOT RUN HERE (slice 4, 1280): 115
- 88: need real touch emulation (`REAL_TOUCH_VIA_EMULATION`, `tests/_platform.py`). This is the H17 problem, so **none of the 88
  real-finger tests ran**, and no release gate can see them on Linux.
- 13: no Linux pictures baseline recorded (`tools/record-baselines.sh` has to be run on Linux).
- 3: the scratch MP4 patch above.
- 2: no AAC encoder in this Chromium (slice 4; slices 2 and 3 each also report 2 NOT RUN, reason not looked at).
- 9 others: reasons not tallied (88+13+3+2 = 106 of 115); the list is in the saved JSON, which is not in the repo.

## Reds that are container limits (Measured cause in the error text)
- No H.264 / MP4 decode or encode: every `NO_VIDEO_CODEC`, `Could not load video`, `splash.mp4 did not decode`, `VideoEncoder ... closed codec`
  failure, the H.265 probe (486), the intro-film tests (776, 783), the 690 video group, `915.5Br`, `921 S4`, `an export survives the tab being
  backgrounded`, `47 ... resumed export`, `671`.
- CPU timing: `921 S8 ... 4x CPU throttle` (commit diff median about 54 ms against a 30 ms bar, this box is slower than the Mac).
- `the hoisted curl / fractal-warp / tunnel kernels`: twirl 97 of 1170 points, bar is 94. Looks like a software-GL rounding difference. Guess.

## Reds that look REAL or need a human look (not diagnosed, error line only)
Cannot say they are real, only that no container reason shows in the text:
- `home push: ... parked editor sits at x=40 in a 900px viewport` and `playhead: --tl-panel-left drifted 17.0px during the pop`
- `a vertical swipe that starts ON a clip scrolls the timeline ... the axis lock ate the primary gesture`
- `play: holding the Play button plays ... a slow press on Play did nothing at all`
- `a trim grip needs a hold on touch ... the grip ON SCREEN is not armed (queue 336)`
- `dragging the add row into the edge scrolls the timeline ... by 0px`
- `#632 inside a group the layer heads ... x=8 against x=4`
- `650 --hm-ring-hi is not set on .hm-scroll`, `658 the thumbnail pin turns the playhead blue`, `624 holding a layer head to multi-select`
- `every tile in the browser picks instead of applying (queue 333)`: timed out after 420 s. This is the same test as H19 / #1095.
- Presets 330 / 331 (three tests: "no layer to work from"): setup failure, probably an earlier test left no layer, so a knock-on, not a feature bug. Guess.
- 957 / 964 / 974 / 947 / 981 / 988 (clapper and add-menu animation tests): these are slice 4 and several fail on "control" lines
  ("this focus reads as a KEYBOARD focus in this runner", "the menu is not arriving on the 220 ms"), which is the runner, not the app. Guess.
- 482 `6.7 Glow Scan`: `{"loop":1}` measured as unknown.
- 921 S3 / S6: the S6 re-offer came 3021 ms after `here`, S3 "module is not holding the offer". These two are timing-sensitive collab tests,
  and the machine was shared with other work for part of the run, so rerun alone before believing them. Guess.

## sceneLeaks (1280 slice 1)
One: `undo / redo grey out when there is nothing behind or ahead` left `shape "Shape"` behind.

## Bottom line
In this container the suite cannot give a clean green for v17.24. The reds split into video/codec limits and about 15 that need a person
to look. Nothing here should hold the laptop's ship. The one thing worth taking from it is that **88 real-finger tests do not run on Linux**
(H17).
