# H41: test pollution census on main (2e3fd7a9, v17.25), plus a report-only patch that names the polluter

Labels: **Measured** = run in my container (Chromium 141 headless, software GL), **Reproduced** = a slice that goes red with the polluter and green without it, **Guess** = not run. All numbers are the same at 1280 and 380 unless a row says otherwise.

## What I ran
- A **scratch** after-each hook in a copy of `tests/tests.js` (never pushed; `scripts/h41_patch.py` re-applies it): before and after every test it records `FM.time`, `FM._tlPxPerSec()` (zoom x lane width), project duration, project size, layer count and ids, selection, which of the add sheet / effects browsers / context menu / export overlay / `.panel.open` / Home are showing, `#tl-inner`'s width against what a fresh rebuild gives, the scene object itself, `body` classes. One line per test streamed out of the page (`scripts/h41_obs.py`), so a hang loses nothing. Full suite, **1280 and 380**, main 2e3fd7a9. Raw: `census_1280.csv`, `census_380.csv` (every event, with the number of later tests that inherit it).
- **Three tests are not in the census, because they hang this container's renderer** and I skipped them (Measured): `690 swiping the share sheet away…` and `690 an export holds the screen awake…` (an `alert()` about no H.264 encoder, see the H37 section of `980-r3-precheck.md`), and `every tile in the browser picks instead of applying, and Done adds what you picked (queue 333)` (the page stopped answering DevTools at that test, at both widths, twice; I did not find out why; it ran to the end in the H33 slices on r3, so this may be load or a leak, **Guess**).
- 2,285 tests ran per width; the suite ended `2134/2285` with 94 (1280) and 92 (380) NOT RUN HERE. **Those NOT RUN tests are a hole in this census:** the laptop runs them, so a polluter among them cannot show here.

## The size of it (Measured)
**158 distinct tests leave something different from what they found** (220 events, identical at both widths), 94 of them leave a value that is not the run's normal one for that field:

| field | tests that change it | notes |
|---|---|---|
| `FM.time` | 63 | most put it back; 14 leave it moved for later tests |
| project duration | 37 | |
| selection | 36 | |
| `body` classes (cv-up, text-editing, home-open, hm-selecting) | 28 | |
| `#tl-inner` sized for another project (`tlStale`) | 17 | the width measured against `scrollport + duration x pxPerSec`; 0 = fresh |
| Home open/closed, sheets | 11 | |
| project size | 8 | 1080x1920, 640x640, 400x300, 320x240, 64x48 all get left behind |
| layer count | 8 | |
| scene object replaced | 8 | |
| pxPerSec (zoom or lane width) | 4 | |
| playing, window width, fx-sheet preview, isolate | 0 | the existing `sceneLeaks` already covers the last two |

## Ranked by how many later tests start with what it left (Measured; "inherits" = consecutive tests whose starting value equals the value left, a lower bound; only values that are not the run's normal one)

| # | test | field | found -> left | later tests that inherit it |
|---|---|---|---|---|
| 1734 | `869: a backup carries every project…` | layers | 4 -> 1 | 550 |
| 791 | `the home + catches taps well outside itself…` | project size | 640x640 -> 320x240 | 371 (and layers 0 -> 4: 943 to the next change) |
| 489 | `onion skin has exactly one door…` | project size, `#tl-inner` | 1080x1920 -> 320x240; tlStale 6.05 -> 0 | 300 |
| 238 | `undo / redo grey out when there is nothing behind or ahead` | duration, layers, selection | 0 -> 5, 0 -> 1, none -> a layer | 227 |
| 1372 | `#648: a tap selects even when no click follows the pointerup` | Home open | closed -> open | 214 |
| 734 | `921 S7 review: "Earlier versions…" opens from the project's ⋯ on Home…` | Home open | closed -> open | 130 |
| **373** | `easing editor: the whole panel fits, and every rail button is really on screen` | **`FM.time`** | 0 -> 2 | **92** |
| **1095** | `the sheet previews the picked effects over the whole comp… (queue 277 + 390)` | **`FM.time`** | 0 -> 1 | **66** (it is tonight's victim AND a polluter) |
| 242 | `Select all on a non-project tab ticks THAT tab…` | Home open | closed -> open | 46 |
| 1215 | `the onion-skin ghost plate is target-sized…` | `FM.time` | 0 -> 1 | 30 |
| 1543 | `725: double-clicking a marker no longer opens a rename box…` | `FM.time` | 2 -> 1.5 | 28 |
| 1161 | `play: holding the Play button plays…` | `FM.time` | 1 -> 1.033 | 21 |
| 2246 | `482 5.1 Adjustment layer - zoomed in…` | `FM.time` | 0 -> 0.5 | 16 |
| 1324 | `scrubbing into the tail and pressing play does not leave the s…` | `FM.time` | 0 -> 3 | 14 |

Other `#tl-inner` polluters (value left, tests that inherit it): `#254 editor key shortcuts cannot reach the project under a full-screen overlay` (+5 s, and `FM.time` 0 -> 1), `#373` (+5 s), `#275/#276` (1.3 s), `#487 desktop text editor…` (+6.05 s), `#985`, `#1001`, `#2011`, `#2070`, `#2071`, `#2014`: all in `census_*.csv`, field `tlstale`.

## Tonight's reds, one by one (all Measured, `only=<polluter>\n<victim>`; the slice runs the two tests in suite order with nothing between them)

1. **`the timeline sizes its scroll range from itself, not from the window`: Reproduced, deterministic.** Alone it is green 3 of 3. After any of `#254`, `#373`, `#275`, `#276`, `#487`, `#985`, `#1001` it is red 3 of 3 at 1280 and at 380: *"the scroll range pads by 1096px where the timeline is only 600px wide — a 496px difference"* (496 px = 5 s of timeline at 99.2 px/s). Those tests change the project's duration or swap the scene and never rebuild the timeline, so `#tl-inner` stays sized for a project 5 s longer (tlStale +5). `#254` and `#373` also leave `FM.time` moved. This is the "#tl-inner left sized for an old scene" shape.
2. **`the Presets card renders a live tile per applicable preset…`: Reproduced, deterministic.** Alone green 3 of 3. After `#789 a template does not carry its notes into a new project` it is red 3 of 3 at both widths: *"the Presets card rendered no rows at all"*. `#789` leaves the project at 640x640 where it found 1080x1920 (and no layers).
3. **`a vertical swipe that starts ON a clip scrolls the timeline`: red in the full run at both widths (#506), but I cannot attribute it.** It is **flaky alone**: 1 red in 3 solo runs, and 0 to 1 red in 3 after each of the 12 candidate polluters I re-ran serially (`#478`, `#487`, `#489`, `#496`, `#113`, `#276`…), against 12 of 28 red when I ran 3 pairs at a time. Red message: *"a horizontal drag on a clip no longer scrubs — the axis lock ate the primary gesture"*. In the full run `FM.time` was 0 at its start, so "FM.time left past the clips" is not what hit it here. **Guess:** timing (the gesture is synthetic and depends on how fast the page runs) plus a layer selected from before; I cannot say more without the laptop's polluter.
4. **`the sheet previews the picked effects over the whole comp… (queue 277 + 390)`: not reproduced.** Green in the full run, and green after all 63 earlier tests that change anything. Its own leftover (`FM.time` 0 -> 1, inherited by 66 tests) is real. The "shapes left in the scene" half of tonight's red did not occur here; **Guess:** the polluter is one of the 94 tests that are NOT RUN in this container.

## The patch: extend the existing `sceneLeaks` report (PM's decision: report, do not reset)
`state-leaks-report.patch` (tests/tests.js +~70, tests/_cdp.py +9; applies clean with `git apply` on a fresh worktree of 2e3fd7a9, syntax checked). After every test the runner now compares, against what the test found: scene object, `FM.time`, playing, pxPerSec, duration, project size, layer count, selection, which sheets/panels are open, Home, and `#tl-inner` against a fresh rebuild (tlStale, in seconds of project; 0 = fresh). Every difference is listed as `{test, field, was, now}` in `window.__fmStateLeaks`, charged to the test that left it, and the driver prints it as `stateLeaks` next to `sceneLeaks`. **Nothing is reset and nothing turns red for it.**

- **Runs on the reproduced slices** (patched driver, `repro-slices.json`): `tlw` after `#254` prints `time 0 -> 1` and `tlStale 0 -> 5` against `editor key shortcuts…`; after `#276` prints `tlStale 0 -> 5` against `isolate cycles three ways…`; after `#487` prints `scene 1 -> 2, duration 0 -> 5, selected '' -> layer…, tlStale 0 -> 6.05`. The Presets slice prints `size 1080x1920 -> 640x640` against `#789`. (Before I added `size` and `layers` to the report, the Presets slice printed nothing, because `sceneLeaks` only lists layers ADDED; that is why they are in.)
- **A catching test is in the patch:** `H41 fixture: moves the playhead and leaves it there` leaves `FM.time` and the duration changed on purpose, and `H41 the runner charges a playhead left moved…` asserts the runner listed exactly that, by field, with the values, and did NOT reset them, then puts both back. Green at 1280 and 380. **Mutations (Measured):** hook never records, no before-snapshot, `time` not read: all three red. Renaming `home` out of the snapshot stays green, because the fixture only covers time, duration and tlStale; **`home`, the open-sheet list, selection, size and layers are covered by the census run but not by a catching test.**
- **Not run:** the whole suite with the patch (it only adds a read after each test; I ran the two H41 tests at both widths and the reproduction slices).

## How to repeat
- Census: `scripts/h41_patch.py <worktree>` (scratch hook), `scripts/h41_run.sh <width> <port> <debug-port>`, `scripts/h41_an.py <width>`; slices: `scripts/h41_pairs.py <width> swipe tlw presets sheet`.
- One slice by hand: `python3 tests/_cdp.py --width 1280 --url 'http://localhost:PORT/tests/run.html?only=<polluter name>%0A<victim name>'` (a newline-separated list of name fragments; the tests run in suite order with nothing between).
