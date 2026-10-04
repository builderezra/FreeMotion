# #690 / C31 — decoded still image beneath a transforming null parent

Starting commit: `44abd233be95697f26950d9a09e47ad44c52b4fb` on the clean Codex-only branch `codex/690-c31-still-parent`. The exact #690 brief in `REQUESTS.md:27375-27403` and C31 finding in `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1375` were checked; no matching C31 `audits/*.json` record was found.

Time Warp Scan reconstructed historical strips for a decoded still image only when its null parent had no rotation or scale. A moving parent therefore left a cold seek with the current transformed picture in earlier bands. The synchronous still-image sampler now accepts the existing constrained null parent and redraws each crossing on a whole project plate. This keeps rotation and scale in project coordinates. Nested, masked or behavior-driven parents, crop editing, and unproved effect stacks retain their gates. The still-image MP4 resume identity advances so an interrupted export cannot splice in a prior renderer's prefix.

Changed files: `js/compositor.js`, `js/exporter.js`, `index.html` (changed-script cache tags 347/160), `tests/tests.js` (one new focused `TBD` regression and prior resume-identity expectation), and this report.

Checks: the new Chromium regression failed before the fix with 3,041 differing channels in Freeze at 120 px. Afterward, Freeze and Reveal cold seeks matched continuous playback at 120 and 60 px, with a visible-parent-motion control. The adjacent moving-still scan and MP4-resume regression passed. JavaScriptCore parsed all changed scripts and `git diff --check` passed. Local checkpoint only; no shared Claude checkout edit, push, PR or deployment.
