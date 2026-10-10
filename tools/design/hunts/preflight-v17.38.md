# PRE2: cloud pre-flight of wip/v17.38-tree 797ea31a (Simple 2.1) — HEADLINE, pushed early

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

Counts, reds alone and paired, and the same reds on main follow in the full report (still running). Headline pushed now because the first two items change what the builder should do next.
