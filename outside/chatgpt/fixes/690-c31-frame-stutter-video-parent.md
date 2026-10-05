# #690 / C31 — Frame Stutter on decoded video beneath a transforming null parent

Starting commit: `90df58bf0e09204093f0833bf7c291b7c5b72414` on isolated Codex-only branch `codex/690-c31-stutter-video-parent`. The exact #690 brief in `REQUESTS.md:27375-27403` and C31 finding in `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1375` were checked; no matching `audits/*.json` record was found.

A video child of a simple animated null parent was excluded from the stateless hold planner, so a cold seek could show the playhead picture instead of the 0.5 s held picture. The planner now accepts the same constrained parent that the whole-plate historical renderer already supports. Nested, masked, behavioral and other unproved parents remain excluded.

Changed files: `js/compositor.js` (planner eligibility), `js/exporter.js` (MP4 resume renderer identity 7→8), `index.html` (compositor/exporter cache tags 349/162), `tests/tests.js` (one new `TBD` regression and existing identity assertions), and this report.

The new focused Chromium regression failed before the fix because no decoded boundary plan existed, then passed at 128 and 64 px: the cold frame matched both the continuous hold and the parent-transformed boundary frame, and one-frame main MP4 used the new renderer identity. The adjacent feather-masked decoded-video regression passed. Several separate attempts loaded an incomplete app test frame and were discarded, not counted as failures or passes. JavaScriptCore parsed changed scripts and `git diff --check` passed. This is a local checkpoint, not a release; other complex C31 stacks remain open.
