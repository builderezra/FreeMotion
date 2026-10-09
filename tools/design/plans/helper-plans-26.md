# Plans for the next five after P25 (P26): #1105, #1106, #1107, #1108, #1109

Against `origin/main` 29a5faff (v17.33). **Measured** = I ran it here (headless Chromium on Linux, 1280 and 380), **Read** = read the code, **Guess** = not checked. Nothing outside `tools/design/plans/helper-plans-26-scripts/` and this file is on this branch; the source edit behind #1105 is a test patch.

**Which five.** #1105 is a new item; #1106 to #1109 are my own audit branches (AU3, AU1, AU2, AU4 to AU7) filed as "ready". So for four of the five the plan is the thing the builder cannot easily do: **land all seven branches together, on today's main, and prove every one still holds.** I did that in a throwaway worktree (`integrate.sh`, seconds, nothing pushed; I re-ran it from scratch and got byte-identical `js/`, `index.html` and `tests/tests.js`).

## Read this first: what the seven branches do to each other on main today
- **Source files do not conflict, at all.** Merging all seven audit branches, and separately each of my seven other branches from this session (PF1, AU17, AU19, PF2, PL1, AU20, AU21), onto main touches `js/*.js` and `styles.css` without one textual conflict. Two files conflict every time, and both are mechanical: `tests/tests.js` (every branch appends its tests at the same spot) and `index.html` (the `?v=` numbers).
- **`tests/tests.js`: use `merge_tests.py`, do not resolve by hand.** It appends each branch's new tests, in order, in front of `async function run()`. A git merge resolved by keeping both sides **does not parse** (Measured: `Unexpected token ')'` at the end of a 121,000-line file); the script's output does (`node --check`).
- **Five (branch, file) pairs over three files set a `?v=` that main already holds (Measured, `results/buster_table.txt`).** Branches written against an older main reached a number main has since reached, so landed as they are they would NOT make a phone fetch the new file, and `tools/ship.sh` would refuse: `storage.js` (AU3 and PF1 set 59, main is 59), `app.js` (AU1 and AU4 set 469, main is 469) and `scene.js` (AU1 sets 119, main is 119). In one release the right numbers are **`app.js` 470, `scene.js` 120, `storage.js` 60**, which `integrate.sh` sets. Landed as separate releases, each file goes up by one per release.
- **My other seven branches are each one above main already** (`compositor.js` 213, `fx-registry.js` 25.32, `fx-presets.js` 13, `inspector.js` 411, `styles.css` 755, `collab-media.js` 6, `timeline.js` 262) **but they share numbers with each other and with the audit branches**: `inspector.js` 411 (AU2 and AU20), `timeline.js` 262 (AU1 and AU19), `storage.js` 60 (PL1 and the integration above), `fx-presets.js` 13 (AU17 and PL1). Both of a pair in one release is one bump; in two releases the second needs one more.

## #1105 A mouse flick that stalls just before release does not glide

**Verdict: not a product bug. Measured and computed; what changed with the CPU is the test.**
- **Measured.** The shipped #715 test (`glide (#715): a mouse flick glides…`) passes at 1x and 2x here and **fails at 4x** (`FM_BASE_CPU=4`) with the item's message. The item saw it at 2x on the laptop; I can only say it is the same failure at a bigger throttle.
- **Cause (Read + computed, `glide_math.js`, run with node).** The release velocity is already the pointer's travel over the last 100 ms (`GLIDE_WINDOW`), not the last sample: the fix the item asks for has been in main since #715. The test paces its samples with `sleep(8)`, so under a throttle the whole flick stretches with the machine. Through the shipped arithmetic: at 1x (10 ms between samples) the flick is 1.0 px/ms and releases at 0.80; at 2x it is 0.5 px/ms and releases at 0.30 (over the 0.25 mouse bar); **at 3x it is 0.33 px/ms with 60 of the 100 ms window taken by the two stall samples, releasing at 0.11: no glide; at 4x it releases at 0**. A real pointer's `timeStamp` is the input device's clock, not the page's, so a busy page does not slow a hand down. On real timestamps, a 0.5 px/ms flick followed by a pointer still for anything from 0 to 79 ms **still glides** (v = -0.5 each time), and one still for 90 ms does not: that is `GLIDE_REST` (80 ms) doing what #715 said.
- **Patch (test only).** `p26-1105-test.patch` adds `P26 #1105 glide (#715) on the pointer's own timestamps…`: the same four cases (A flick then a two-sample stall, B parked 160 ms, C fine mode, D a slow touch drag), but each event carries its own `timeStamp` (8 ms apart, set on the event) and all are dispatched at once, so the verdict does not depend on the CPU. **Green at 1x, 4x and 6x.** Mutation CAUGHT for the window shrunk to 8 ms (case A: "the release velocity is still the last sample"). The other two mutations (rest 400, touch bar 0.2) are caught by the test's constant guards rather than by cases B and D, which is a weaker proof (`results/p26_mut.log`).
- **If you want the product to change anyway.** The item's idea (ignore a final zero-movement sample when reading the window) would let a stall up to `GLIDE_REST` glide at the pre-stall speed, which the 0 to 79 ms rows above already do for a quiet pointer. That is a feel call for Ezra, not a bug fix, so I did not write it. **Suggest the builder takes the test patch, keeps the old test as the unthrottled one, and closes the item as "test timing".**
- The side notes in the item: "a previewed Invert changed nothing" and `fxBounds 29.2 ms` I did not reproduce (the second is its own budget under a throttle); `921 S3 Stop sharing` I did not run.

## #1106 Saving and opening (AU3, `hunt/audit-storage`)  ·  #1107 Timeline (AU1, `hunt/audit-timeline`)  ·  #1108 Inspector (AU2, `hunt/audit-inspector`)  ·  #1109 Undo, collab, export, swipes (AU4 to AU7)

**Still true on v17.33, all of it (Measured, `results/main_AU*` against `results/int_AU*`).** I ran the union of the seven branches' tests against main's own source and against the merged source:

| item | branch | tests | on main v17.33 | on the integration tree |
|---|---|---|---|---|
| #1106 | `hunt/audit-storage` (AU3) | `AU3-1`, `1b`, `2`, `2b`, `3`, `4` | **6 red** at 1280 and 380 | **6/6 green** at both |
| #1107 | `hunt/audit-timeline` (AU1) | `AU1-1`, `AU1-2` | **2 red** at both | **2/2 green** at both |
| #1108 | `hunt/audit-inspector` (AU2) | `AU2-1` to `AU2-4` | **4 red** at both | **4/4 green** at both |
| #1109 | `hunt/audit-scene` (AU4) | `AU4-1`, `AU4-2`; `AU4-3` is the fuzz | 2 red at both; the fuzz is green on main by design (a guard) | 3/3 at both |
| #1109 | `hunt/audit-collab` (AU5) | `AU5-2`; `AU5-1` is the 6-seed fuzz | `AU5-2` red; the fuzz green on main by design | 2/2 at 1280 (100-round fuzz, 1280 only) |
| #1109 | `hunt/audit-exporter` (AU6) | `AU6-1`, `AU6-2`; `AU6-3` is arithmetic | 2 red at both; `AU6-3` green on main by design | 3/3 at both |
| #1109 | `hunt/audit-mobile` (AU7) | `AU7-1`, `AU7-2` (touch and mouse), `AU7-1f` | the four red at both; `AU7-1f` NOT RUN | 4/4 at both; **`AU7-1f` is the real-finger test and reports NOT RUN in this container, so it has to run on the laptop's finger pass** |

- **What each changes** (`git diff --stat origin/main...<branch> -- js`): AU3 `js/storage.js` +24/-6; AU1 `js/timeline.js`, `js/scene.js`, `js/app.js` (+22/-11 together); AU2 `js/inspector.js` +24/-13; AU4 `js/history.js` and `js/app.js` (+12/-3); AU5 `js/collab-session.js` +28; AU6 `js/exporter.js` +17/-8; AU7 `js/mobile.js` +16/-4. Small, one file each except AU1.
- **#1106 touches `js/storage.js`, so the "review before shipping storage" rule applies.** I did not re-review AU3's diff for this plan beyond running its tests; each of its six was red on main before its fix and mutation-caught when it was written.
- **Held, not mine:** #1106's ask (an older build, after `tools/rollback.sh`, throws away effects a newer one added) is measured and unfixed in `audit-storage.md`; it is **not** what PL1's alias table covers (PL1 is a renamed name; this is a name the old build has never heard of). #1109's "reload through a host snapshot" needs a design call, held by the PM.
- **Also in #1109 (`plans/helper-22`, #1085 to #1089, patch plus test each):** not re-run here; P22 already carries them.

## Order and one command
1. Take `p26-1105-test.patch` (tests only).
2. For the seven audit branches in one release: `bash integrate.sh <dir>` gives the exact tree I tested (merge order storage, timeline, inspector, scene, collab, exporter, mobile). Read the `storage.js` hunk, run the `AU*` slices at 1280 and 380, then the laptop's finger pass for `AU7-1f` and the export slice on the laptop or Mac (the AU6 tests run against a VP9/Opus spy here, not real H.264/AAC).
3. Then my other seven branches (no source conflicts): bump by the table above.

## Not covered
The full suite on the integration tree (about 90 minutes; I ran the seven slices only, plus whatever each branch's own report names); AU5's fuzz at 380; real H.264/AAC export; a real finger; and whether Ezra wants the #1105 feel change.
