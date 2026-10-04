# #690/C31 — Time Warp Scan cold-seeks a feather-masked still

Starting commit: `497143936074d92ec0106952181694b270dbbfe7` on the clean Codex-only preferred checkpoint. The exact #690 request and C31 plan row were checked; no `audits/*.json` record names the C31 finding.

A moving decoded still with a feathered legacy vector mask used its current picture after a Time Warp Scan cold seek. The whole-plate historical path added for hard-masked stills also evaluates feathered masks at each crossing time, so this change admits that case. Video masks and other complex media paths retain their gate.

Changed files: `js/compositor.js` (feather-masked decoded-still eligibility), `js/exporter.js` (image Time Warp MP4 resume identity 3), `index.html` (compositor/exporter caches 328/146), `tests/tests.js` (one focused `{ item: 'TBD' }` regression), and this report.

The new native Chromium regression failed before and passed after the change. It covers normal and inverted feathered ellipses at full and half preview sizes, cold versus sequential pixels, and controls for movement, feathering and frozen history. The adjacent hard-mask still regression passed after one unrelated app-script bootstrap omission was retried. JavaScriptCore syntax and Git diff checks passed. No push, PR, deployment, protected-file edit or shared Claude checkout edit.
