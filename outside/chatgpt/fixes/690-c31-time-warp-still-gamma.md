# #690 / C31 — Time Warp Scan with keyed Gamma on a moving still

Starting commit: clean preferred `f2143d2a186bc2f1e4342f1404b49bf30301732e`; isolated Codex-only branch `codex/690-c31-gamma-still`. The standing brief is `REQUESTS.md:27375-27403`; the C31 historical-frame finding is `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1375`. No `audits/*.json` record names C31, Time Warp Scan or Frame Stutter.

Keyed Gamma before Time Warp Scan changed a moving still image's frozen bands after a cold seek. The still-image historical-redraw gate now admits this source-local per-channel lookup table, evaluating it at each crossing time. Other unproved still-image stacks and decoded video remain gated.

Changed files: `js/compositor.js`, `index.html` (compositor cache 351), `tests/tests.js` (one `TBD` regression), and this report. The new browser regression failed before the fix (Freeze, cold 0 vs played 61), then passed full/half-size Freeze/Reveal; adjacent keyed Levels still-image check also passed (2/2 filtered). Two unrelated incomplete app bootstraps were discarded. Node syntax for changed scripts and `git diff --check` passed. Local only: no shared Claude checkout, protected-file edit, push, PR, deployment or release.
