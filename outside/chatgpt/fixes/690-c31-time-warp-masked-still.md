# #690/C31 — Time Warp Scan cold-seeks a hard-masked still

Starting commit: `0fbd6cd2869c594c728c3872f32a2e0496a51f34` on the clean Codex-only preferred checkpoint. The exact #690 request and C31 plan row were checked; no `audits/*.json` record names the C31 finding.

A moving still image with a legacy vector mask used the current picture after a Time Warp Scan cold seek. A decoded still is synchronously available, and the existing whole-plate historical redraw applies its hard mask at each strip crossing. This change admits that narrow case. Feathered still masks, video masks and more complex media paths retain their gate.

Changed files: `js/compositor.js` (hard-masked decoded-still eligibility), `js/exporter.js` (image Time Warp MP4 resume identity 2), `index.html` (compositor/exporter caches 327/145), `tests/tests.js` (one focused `{ item: 'TBD' }` regression), and this report.

The new native Chromium regression failed before and passed after the change. It covers normal and inverted ellipses at full and half preview sizes, cold versus sequential pixels and a moving-image control. The adjacent animated-crop still regression passed. JavaScriptCore syntax and Git diff checks passed. No push, PR, deployment, protected-file edit or shared Claude checkout edit.
