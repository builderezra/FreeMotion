# Plans for the next five after P27 (P28): #215, #604, #677 (with #1013), #1068, then #206, #1072, #352 as no-ops

Against `origin/main` 29a5faff (v17.33). **Measured** = I ran it (headless Chromium on Linux, 1280 and 380), **Read** = read the code or the entry, **Guess** = not checked. Scripts and result files: `tools/design/plans/helper-plans-28-scripts/`. Nothing here touches main.

**Which five.** After P27 the old queue is mostly answered, held or standing notes. The real remaining work is: the no-sound-in-export trio **#215, #604, #677** (one fix serves all three, #1013), **#1068** (ChatGPT's batches B2 to B8, B1 is in P27) and the three entries that need no build (**#206, #1072, #352**), each with the reason.

## #215 / #604 / #677 Exported video has no audio (and #1013)

**Verdict: not reproducible on his device on this build (his own report, 10 Sep); the one real defect found since is the empty-AAC-track export (#1013), and its fix is verified and waiting to land.**
- **Read.** All three entries are "built out, waiting on your answer". His 10 Sep paste (#844) shows TRACK WRITTEN, peak 0.931, none of the six loss paths firing, so they no longer reproduce there. What is left is whether the FILE plays with sound in his Photos app, and the empty-track case (an AAC encoder that returns zero chunks while the report says TRACK WRITTEN and the card shows Sound ✓).
- **Fix to land (Read, #1068 and #1013 notes):** `2ea47a00` "drop empty AAC tracks and report encoded sound" supersedes the older `f25e15d3` pair. It is the first of ChatGPT's 7-commit chain (`2ea47a00 9cec73a1 d8fa4fbb 8c813c78 ba154a37 a22dbc46 13e5b1ea`).
- **Measured.** The chain applies to main 7 of 7 with no source conflict (only `index.html` busters, resolved by rule: `exporter.js` 126 to 127, `app.js` once). Its 7 tests: **6 pass at 1280 and 380; the #1013 test is RED here with `NO_VIDEO_CODEC`**, because this container has no AAC encoder. It is missing its first line `await needsAac();` (the v17.24 convention). With that line added it reports **NOT RUN HERE**, not red, at 1280 (Measured). So **this container cannot prove #1013**; it has to run on the Mac or the laptop with Chrome's real encoder. ship.sh's "export-audio changes need those tests green on the Mac" rule applies.
- **What the builder does:** land the chain (P27's #1069 section shows B1 applies on top, 14 of 14), add `await needsAac();` to the #1013 test, run it on a machine with AAC, then ask him for one more export report. That answer closes #215/#604/#677 or points at the Photos import.
- **Not mine:** I did not rebuild the fix (ChatGPT's lane, per #1067).

## #1068 Land ChatGPT's batches B2 to B8

**Verdict: B2 and B7 are nearly mechanical; B3 to B6 are hand work in `compositor.js` and `fx-registry.js`, exactly where the land list already says by hand. B8 I did not test (a squash of 44 commits, low priority).** Measured with `scripts/dryrun.py`: it cherry-picks each batch's commits in the land list's order on top of main + chain + B1 (`index.html` and `tests.js` resolved by the rule in P27, nothing else), and a commit with a source conflict is skipped and counted.

| batch | commits | apply | source conflicts (all `js/compositor.js` unless noted) |
|---|---|---|---|
| B2 Keyframed Speed stops jumping | 28 listed | 25 | `ceb86cd6` Shake; `8efc6234` Laser Beam and `8516f675` Radio Waves, which the land list says belong to B6 anyway |
| B3 Preview matches export | 12 | 7 | the three glow-buffer commits `a5d76ea7 b1ddcfd9 5dcfed17`, `1e36d1d9` Linear Streaks, `746d53a8` Roughen Edges (the list says apply these by hand) |
| B4 Polish A | 12 | 6 | `746d53a8` (B3's), `e15da085` Wipes, `0f98b861` Border, `427d5af4`, `dd5d4729`, `62c98f5e` Roughen |
| B5 Polish B | 9 | 5 | `7a2ef677` shadows, `0df427eb`, `061581f0`, `a0732c3d` Gaussian Blur |
| B6 New effects | 17 | 3 | 14, mostly `compositor.js` plus `fx-registry.js`: every new effect inserts at the same two places as v17.23's batch, so each needs a hand merge |
| B7 Sound packs | 4 | 4 | none |

- **A caveat on the numbers:** a skipped commit makes its dependants conflict too, so the conflict counts are an upper bound on separate work. Each commit alone against the same base: B2 25 of 28 clean, B3 6 of 12, B4 4 of 12, B5 5 of 9, B6 3 of 17, B7 1 of 4 (B7's later commits need the first; stacked, 4 of 4). Results: `results/dryrun_chain_b1.txt`, `dryrun_independent.txt`.
- **B2's fix-first:** `304f6370` Glow Scan applied clean, but the land list says it re-introduces rate x time in the new Travel/Once/Wait branch: that is a logic fix, not a conflict, so a clean apply hides it.
- **⚠️ Collision with E1 (my `hunt/new-effects-1`):** B6's `3728d6f5` "Add Oil Paint stylize effect" registers the same id `oilpaint` as E1's Oil Paint. Keep only one; see `tools/design/hunts/new-effects-1.md`. Both also insert at `FM._FX_TABLES` and in a new `fx-registry.js` batch, and both bump `SCHEMA_REV`, so whichever lands second re-pins `SCHEMA_FP` (the fingerprint is printed by `921 S1 the schema fingerprint gate`).
- **Order I would use:** chain, B1 with P27's fixes, B7 (no conflicts, sound only), B2 minus the three B6 ones, then decide B3 to B6 with his answers (section 3 of LAND-LIST) and E1's look. B3 to B6 each need their listed fixes before they land; none of that is something to automate.
- **Not run:** the batches' tests (several have never run in a browser). A dry run proves apply, not behaviour.

## #206, #1072, #352: nothing to build

- **#206 shapes need sensible edit points: HELD by his own words** ("asked me not to start it"). Starting it would break his instruction.
- **#1072 second Claude account tutorials: JUMPED**, not the builder's lane (the logging chat drives it and checks each tutorial against the code); only #1082 (show them in the app) is a build, and that waits on his pick.
- **#352 clean up this file: a note, ✅ DONE v11.31, reopened by an audit**; "nothing to build". It stays open only for bookkeeping; tick it with a clause note.
