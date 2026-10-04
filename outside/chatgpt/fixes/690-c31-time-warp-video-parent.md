# #690 / C31 — Time Warp Scan on video beneath a transforming null parent

Starting commit: `8080c2119251ccc8bcd355fa36bff074a1c7dae1` on clean Codex-only branch `codex/690-c31-video-parent` in an isolated local worktree. The exact #690 brief in `REQUESTS.md:27375-27403` and C31 finding in `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1375` were checked; no matching C31 `audits/*.json` record was found.

A decoded video under a simple animated null parent was excluded from historical Time Warp Scan sampling, so a cold jump filled earlier strips from the current picture. The bounded decoder now accepts that constrained parent and redraws its full source plate at each crossing, preserving project-space rotation and scale. Camera, crop, behaviors, nested/masked parents, extra active effects, and simultaneous video scans retain their gates. MP4 resume identity advances to `c31-video-timewarp-6` so interrupted exports cannot reuse an older prefix.

Changed files: `js/compositor.js`, `js/frames.js`, `js/exporter.js`, `index.html` (changed-script cache tags), `tests/tests.js` (one focused `TBD` regression and existing resume-identity assertions), and this report.

Checks: the new Chromium regression failed before implementation because no historical plan was made. After the fix, Freeze and Reveal cold seeks matched continuous playback at 128/64 px under animated parent rotation and scale; a visible-transform control and the main MP4 frame comparison passed. The adjacent indexed-video scan regression passed. JavaScriptCore parsed the changed scripts and `git diff --check` passed. Local checkpoint only; no shared Claude checkout edit, push, PR or deployment.
