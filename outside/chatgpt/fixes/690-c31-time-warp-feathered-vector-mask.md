# #690/C31 — Time Warp Scan cold-seeks a feather-masked shape

Starting commit: `85aef144f1d4284e4e2d17f6c2561a8301a5b0dc` on the clean Codex-only preferred checkpoint. The exact #690 brief in `REQUESTS.md` and C31 plan row were checked; no `audits/*.json` record names the C31 finding.

Time Warp Scan's cold seek used the current picture for a moving shape with a feathered legacy vector mask. The existing whole-plate historical redraw can evaluate that mask at each crossing time, as it already does for hard masks. This change admits feathered shape masks through the same narrow gate. Pen masks, media masks, masked media and other excluded stacks retain their existing behavior. Only cold seeks pay for the whole-plate reconstruction; sequential playback stays on its old path.

Changed files: `js/compositor.js` (feathered vector-mask eligibility), `js/exporter.js` (shape Time Warp main MP4 resume identity 3), `index.html` (compositor cache 325, exporter cache 143), `tests/tests.js` (one focused `{ item: 'TBD' }` regression), and this report.

The new native Chromium regression failed before the change, then passed after it with the adjacent hard-mask regression (2/2). It checks normal and inverted feathered ellipses at full and half preview sizes, cold versus sequential pixels, and controls that feathering and the historical scan actually alter the image. One startup before the baseline and one after the fix omitted app scripts; those attempts reached no assertions and were retried. JavaScriptCore syntax and Git diff checks passed. No push, PR, deployment, protected-file edit or shared Claude checkout edit.
