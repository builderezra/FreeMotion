# PRE2: cloud pre-flight of wip/v17.38-tree 797ea31a (Simple 2.1)

**It will not work as pushed: two script tags are missing from `index.html`, so `FM.editor` and `FM.spine.edit` never load. Measured, and the one-hunk fix is measured too.**

Tree: `797ea31a` (`git diff 8878582a 797ea31a`, 25 files). Driver: the tree's own `tests/_cdp.py` (one line added in a copy so parallel runs do not reap each other's Chrome), headless Chromium on Linux, full suite in slices, 2364 tests at 1280 AND at 380; the red sets are identical at both widths.

## 1. The defect (new on this tree)
`git diff 8878582a 797ea31a -- index.html` line 73:
```
-  <script src="js/editor-mode.js?v=1"></script>   <!-- Simple mode P1: FM.editor — the one door the cog uses … before app.js -->
-  <script src="js/app.js?v=471"></script>
+  <script src="js/app.js?v=472"></script>
```
The hand-merge of `index.html` dropped the `editor-mode.js` line (v17.37 and main both have it at line 1128), and nothing in the tree has a tag for `js/spine-edit.js` at all (`grep spine-edit index.html tests/run.html` finds nothing; the file is in `js/`). So on this tree:
- **`FM.editor` is undefined: the whole Simple switch is dead.** 15 tests go red with `FM.editor / FM.simpleTimeline are missing — js/editor-mode.js or js/simple-timeline.js did not load` (every `simple P1`, `980 cog T*`, `980 review R*`, S4a, S4d), at both widths; run ALONE `simple P1 · off means off…` is red on 797ea31a and green on 8878582a.
- **`FM.spine.edit` is undefined: every Simple 2.1 command is dead.** 21 `simple P2.1 · …` tests go red with `FM.spine.edit is missing — js/spine-edit.js did not load`, and the behavioural ones fail on their own claim (`the title on B was not deleted with it (D5)`, `no gap chip for the 1.2 s gap`, `S did not split the clip and its twin`).
- AU24-1 (`FM.editor is not on this build`) is red for the same reason.

**The fix, measured:** on a copy of 797ea31a I added `<script src="js/editor-mode.js?v=1">` before `app.js` and `<script src="js/spine-edit.js?v=1">` after `simple-timeline.js`. The last 53 tests of the suite (`simple P1` … `simple P2.1 review`, indexes 2310 to 2362) go **53 of 53 green** at 1280 (`Regression 53/53 ✓`). The `?v=` for `spine-edit.js` should be whatever the release convention says; I used 1.

## 2. Two more things in the same tree
- **`storage.js` buster goes backwards: `?v=60` (v17.37) becomes `?v=59`.** Any device that cached `storage.js?v=59` from before gets the OLD file. It needs a number above 60 (the same diff bumps history.js 38→39 correctly, so this one looks like a merge slip too).
- **`suite: no test name can truncate its own failure report` is RED** (new on this tree, absent on main): the test name `AU24-1 … (§6.1: "a timeline or canvas drag live")` has straight double quotes. That is my test; the fix (curly quotes) is on `hunt/audit-simple-13` at `0d532745`, tests.js line 59929 on v17.37's tree.

## 3. Counts (full suite, both widths)
2364 tests ran at 1280 and 2364 at 380 (the tree has 2362 `test(` calls). **102 red at 1280 and the SAME 102 red at 380** (no width-only red), **96 / 95 NOT RUN HERE** (real touch emulation, AAC and H.264 cannot be driven by headless Chromium on Linux), **2 tests hang the driver** (below). Triage at 1280 (the red sets are identical at 380, so 380 alone/paired was not repeated, except where stated).

| class | reds | what it means |
|---|---|---|
| A. dead because the two script tags are missing | 50 | all of `simple P1`, `980 cog T*`, `980 review R*`, S4a, S4d, AU24-1 and every `simple P2.1`; green on a copy with the two tags added (53 of 53 in the tail) |
| B. test name with straight double quotes | 1 | `suite: no test name can truncate…` — my AU24-1 name; fixed on `hunt/audit-simple-13` |
| C. red on main (v17.36) ALONE too | 44 | environment, not this tree (no H.264/H.265, no real camera for the QR, a 4× CPU throttle the driver cannot give, background-tab export); same first message on main |
| D. red only inside the full pass, green alone, green paired with its predecessor, green on main | 5 | order- or state-dependent; NOT bisected yet (see 5) |
| hang | 2 | the driver stalls inside the test, at both widths (see 6) |

## 4. Class A, by group

- `simple P1 · …` (8), `980 cog T1…T15` (14), `980 review R1…R4` (4), `S4a`, `S4d`: first message `FM.editor / FM.simpleTimeline are missing — js/editor-mode.js or js/simple-timeline.js did not load`. Each one ALONE on 797ea31a is red; each is green on main (and `simple P1 · off means off` on 8878582a).
- `AU24-1 …` : `FM.editor is not on this build`.
- `simple P2.1 · …` (about 25): `FM.spine.edit is missing — js/spine-edit.js did not load`, or, for the behavioural ones, their own claim (`the title on B was not deleted with it (D5)`, `B did not close up onto A: 5`, `S did not split the clip and its twin`, `no gap chip for the 1.2 s gap`, `the copy is not right after A with B after it`).

## 5. Class D — green alone, green paired, green on main, red in the full pass (both widths)

| test | full pass | alone | paired with predecessor | main alone | first message |
|---|---|---|---|---|---|
| home push: the press answers the tap, survives the wait, and hands over without a pop | RED | ok | ok | ok | the parked editor sits at x=40 in a 900px viewport (transform matrix(1, 0, 0, 1, 39.9424, 0), classes "fm-push |
| playhead: a rebuild during the return-to-home pop keeps --tl-panel-left honest | RED | ok | ok | ok | --tl-panel-left drifted 17.0px during the pop (truth -17.0) — the playhead will sit that far off for the rest  |
| 921 S3 Stop sharing revokes the code that was handed out — the offer is closed, and the ne | RED | ok | ok | ok | the module is not holding the offer whose code is on screen, so this test cannot see whether it is revoked |
| keyboard can edit numeric Volume and Position values and effect inputs have names (batch2  | RED | ok | ok | test not on main | Position X is not keyboard reachable |
| 981 review: with less motion the add menu arrives on its plain 220 ms slide, and its cards | RED | ok | ok | ok | CONTROL: the menu is not arriving on the 220 ms reduced-motion slide (fm-hinge-up) |

Notes. (i) `keyboard can edit numeric Volume…` (#1016): the builder's FYI says the tilt-keyframe test (`a tilt keyframe cannot turn the rotate diamond into a delete button (queue 419)`, index 883) left `FM._mtMode` on Rotate and Transform opened 240 tests later (index 1122) with no Position X. That is exactly this red (`Position X is not keyboard reachable`), and it is still there on this tree in my environment. **A likely reason it is environment-only:** that tilt test needs real touch emulation, which this driver cannot give, so it is NOT RUN HERE and may leave early without restoring `FM._mtMode`; on the laptop it runs to its end. I have NOT proved that; the bisect (`after=<test before 883>&upto=<keyboard test>`, then halve) is queued behind the lock rehearsal because the builder asked for no second heavy job. (ii) `home push`, `playhead … --tl-panel-left`, `921 S3`, `981 review reduced motion` fail the same way every pass here; each is green alone and on main. Same bisect.

## 6. The two hangs

`690 swiping the share sheet away after Save keeps the Export ready card…` (index 1933) and `690 an export holds the screen awake while it renders…` (index 1934) stall the driver at both widths: its progress file stops for over 90 s inside the test and the run has to be killed. Both are export tests; headless Chromium here has no H.264 encoder, so I believe this is the environment (the NO_VIDEO_CODEC family), but I have not run either on main, so I do not call it "same". They were skipped and counted as red-by-hang, the rest of the tail ran around them.

## 7. Method, and what I could not measure

- Driver: each tree's own `tests/_cdp.py`. (My first attempt used an older private copy; it hung in the touch tests, so every number above comes from the re-run with the tree's own driver.) One added line in a copy: `FM_NO_REAP`, so two runs on one machine do not kill each other's Chrome.
- Full suite = four slices (the tail in chunks of 40 with a 90 s stall watchdog), each width. Reds alone = `?only=<name>`; paired = `?after=<predecessor>&upto=<name>`; main = `origin/main` f7ec250c, v17.36, alone.
- NOT measured here: every NOT RUN HERE test (real finger, AAC, H.264); H.264 export correctness; the 2 hangs. None of those is counted as same.
- Not done yet: bisect of class D; the two hangs on main; the lock rehearsal (LR1) is running now, its report is a section 8 to be added.
