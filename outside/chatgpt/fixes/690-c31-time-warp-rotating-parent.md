# #690 / C31 — Time Warp Scan under a rotating or scaling null parent

Starting commit: `cfa3859e5afb4fb366712e758ac8dea15b62c6dd` on isolated `codex/690-c31-rotating-timewarp`. The exact #690 request in `REQUESTS.md:27375-27403` and C31 finding in `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1375` were checked; no matching C31 `audits/*.json` record was found.

Cold-seeking Time Warp Scan on a shape under an animated rotation or scale used the current transformed picture across earlier scan strips. The historical shape renderer now accepts the existing simple null-parent constraint and redraws the full source plate at each crossing. The still and decoded-video parent gates remain unchanged. MP4 resume identity advances to `c31-shape-timewarp-grade-6` so an interrupted export cannot reuse an older prefix.

Changed files: `js/compositor.js`, `js/exporter.js`, `index.html` (changed-script cache tags), `tests/tests.js` (one focused `TBD` regression and the existing resume-identity expectation), and this report.

Checks: the new Chromium regression failed before implementation (1,551 mismatched channels in Freeze at 120 px), then Freeze and Reveal cold seeks matched continuous playback at 120 and 60 px. The adjacent moving-null-parent temporal regression passed. One browser fixture failed to initialize and passed on retry. JavaScript syntax and `git diff --check` passed. Local Codex-only checkpoint; no push, PR, deployment or shared Claude checkout edit.
