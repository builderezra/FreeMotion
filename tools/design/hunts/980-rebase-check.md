# H31: did the builder's rebase of Simple mode (#980) onto v17.24 lose or change anything?

Read-only, plus one 10-second test run. Base for "main" is `origin/main` 470ee20e (v17.24 plus the Linux baselines). **Answer: no hunk was dropped, duplicated or changed by the rebase in any of the five steps.** The only differences from a faithful re-application are the ones the builder reported, plus two small ones he reported only in prose (listed below), and one deliberate last commit.

## What was rebased, as the commits say (one correction to the backlog's list)
| step | old (source) | new (rebased) | new parent |
|---|---|---|---|
| 1 | `fu-lock-r5` f0e6e8dd, diff taken against `b46b47d3` | `fu-lock-r6` c6bac13b | main 470ee20e |
| 2 | `980-s12` 31205790 against `b46b47d3` | `980-s12-r2` 9b4197ce | `fu-lock-r6` |
| 3 | `980-phase1` 0f044c59 against `980-s12` (tip to tip) | `980-phase1-r2` 2ef57028 | `980-s12-r2` |
| 4 | **`980-p21-fix` 31679477** against `980-phase1` (13 commits) | `980-p21-r2` 9c32adc3 | `980-phase1-r2` |
| 5 | **`980-p22-trayb2` a7000c6f** against `980-p21-fix` (32 commits) | `980-p22-r2` 3d420fdb, then 4e433adb | `980-p21-r2` |
Corrections to the task text: **there is no `980-p21` on origin** (the source is `980-p21-fix`, 31679477, an ancestor of trayb2), and the last step's source is **`980-p22-trayb2`** (his pick B), not `980-p22` bda3802e (an ancestor of trayb2). I checked ancestry with `git merge-base --is-ancestor`: s12 is in phase1, phase1 in p21-fix, p21-fix in trayb2; `fu-lock-r5` is **not** in `980-s12` (the lock is a separate line, which is why step 1 is its own base).

## Method 1: every hunk, old against new (Measured; `980-rebase-check-scripts/hunk-compare.py`)
For each step I took the OLD branch's own diff (against its own parent in the old chain) and the NEW branch's diff (against its new parent), both `git diff -U0 --no-renames`, and compared the hunks by content (file, removed lines, added lines), as multisets, so a missing hunk, a doubled hunk and an altered hunk all show:
| step | old hunks | new hunks | in old, not in new | in new, not in old | files |
|---|---|---|---|---|---|
| 1 lock | 25 | 26 | 2 | 3 | 9 / 9 |
| 2 engine (s12) | 39 | 39 | **0** | **0** | 10 / 10 |
| 3 phase1 | 64 | 64 | **0** | **0** | 14 / 14 |
| 4 p21-fix | 63 | 63 | **0** | **0** | 14 / 14 |
| 5 trayb2 | 44 | 44 | **0** | **0** | 11 / 11 |
| 6 `4e433adb` (extra commit) | none | 2 | 0 | 2 | 1 |
**Step 1, the 2 + 3 that differ, read line by line:**
1. `tools/_fu_gate.py`: one old hunk (the new file, 1391 lines) against a new one of 1394. The difference is exactly the fix the builder reported: `prove = code.find('tools/prove.sh')` replaced by a regex that finds where `prove.sh` RUNS (4 lines for 1), because v17.24's `ship.sh` now names it in test-port's trigger list. Nothing else in the 1391 lines differs.
2. `tools/ship.sh`: the lock block and the commit-time re-check are both present, identical line for line, **plus** one comment line ("the phase marker goes BEFORE the re-check below…") and one blank line. This is the reported "`ship_phase push` moved above it": in the rebased file the order is `ship_phase push`, the comment, the re-check, `git add -A` (`tools/ship.sh` 1018 to 1034), where main's v17.24 has `ship_phase push` immediately above `git add -A` (`:992`-`:993`). The first lock block sits between the DROPS-REQUEST check and `ship_phase prove`, as stated.
**Step 6:** the two `(SCHEMA_REV 7)` comments at `js/collab-core.js:172` and `:176` now say 8, which is what H9 asked for.
**Not in the builder's own conflict list** (the PM's list names only the `tests.js` appends and the `_cdp.py` `media` line): the `ship.sh` and `_fu_gate.py` changes above are in the commit message of step 1 but not in that list; I list them so they are on one page. Neither drops anything.

## Method 2: an independent merge, which does not trust the rebase at all (Measured)
`git merge-tree --write-tree` of main with `980-p22-trayb2` (merge base `b46b47d3`), then that result with `fu-lock-r5` (same base), gives a tree built by git's own merge. I diffed it against the rebased tip's tree:
- **27 of the 32 changed files are byte-identical** to the independent merge (every file except the 5 below), so the placement of every non-conflicting hunk is the same, not only the content.
- The 5 that differ: `js/collab-core.js` (the two comments, step 6); `tools/_fu_gate.py` (the regex fix, +4/-1); `tools/ship.sh` (+2: the comment and the blank line); `tests/_cdp.py` (the independent merge's conflict region, see below); `tests/tests.js` (conflict region).
- For the three conflicted files I removed conflict markers and compared line multisets: **`tests/tests.js` differs in 0 lines** (nothing lost or added); `tests/_cdp.py` differs in 2 lines that only the independent merge has: the old `inp = {... "mouse_down": False}` line (the rebased file has the lock's version with `"touch_base"`, which is the intent) and `sys.exit(main())` (the rebased file has v17.24's did-not-run wrapper instead).
- **`tests/_cdp.py` semantics:** the SIGTERM handler (`:902-911`) is installed before the wrapper (`:916-922`), as the commit says; `media = [False]` (step 3's reduced-motion state) and the lock's `"touch_base"` are both in the input channel's state (`:472`, `:473`).
- **`tests/tests.js` by name:** main 2286 tests + 102 added by trayb2 + 4 added by the lock = **2392 expected, 2392 in the rebased tip**, 0 duplicate names, 0 missing, 0 unexpected; the lock's four come first in the appended tail, then Simple's, in that order.

## One run, since the point of a rebase is that it still holds
`921 S1 the schema fingerprint gate` on the rebased tip (`980-p22-r2`, `SCHEMA_REV 8`, `SCHEMA_FP 8673617696742561`): **1/1 pass**. So the fingerprint pinned on the v17.23 base is still right on v17.24. Nothing else was run.

## What this does NOT cover
- **Behaviour.** No full suite, no 980 tests, no phone. The commit messages say "Not yet run here" for steps 2 to 5, and I did not change that beyond the one gate.
- A hunk that is identical in content but wrong in meaning because v17.24 changed the code around it would show as byte-identical to git's own merge (Method 2) and so would not be caught by either method. The only such risk here is in the three conflicted files, which I read (above).
- Binary files and renames: the file sets of old and new are equal (32 files), and the comparison used `--no-renames`.
- `fu-lock-r5` was compared to `fu-lock-r6` as a diff against `b46b47d3`; the lock's later fixes after r5 (if any exist outside these branches) are out of scope.
