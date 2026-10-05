# #690 / C31 — Time Warp Scan with keyed Gamma on a moving shape

Starting commit: clean Codex-only preferred `35ff442eecfa74230aae25846e9902761f947873`; isolated branch `codex/690-c31-gamma-boundary`. The standing #690 brief is `REQUESTS.md:27375-27403`, and C31 is `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1375`. No `audits/*.json` record names Time Warp Scan, Frame Stutter or C31.

Gamma is a source-local lookup table, including its keyed master and per-channel values. A shape with Gamma before Time Warp Scan previously failed the historical-sample gate: after a cold jump, frozen bands came from the current grade instead of the colour at each bar crossing. The shape-only historical path now admits Gamma. It still excludes unproved upstream effects, and still-image/video gates are separate.

Changed files: `js/compositor.js`, `index.html` (compositor cache 350), `tests/tests.js` (one focused `TBD` regression), and this report. The new regression failed before the change (Freeze, cold 0 vs played 139), then passed at full/half preview sizes in Freeze/Reveal with a keyed master Gamma and blue trim. The adjacent Levels checks also passed; filtered browser result 3/3. Node syntax checks for changed JavaScript and `git diff --check` passed. No shared Claude checkout, protected-file edit, push, PR, deployment or release.
