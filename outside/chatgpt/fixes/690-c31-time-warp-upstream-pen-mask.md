# #690/C31 — Time Warp Scan cold-seeks an upstream pen mask

Starting commit: `f30a19cdc320fe3b0f31acd839f40d1da5ab3700` on the clean Codex-only preferred checkpoint. The exact #690 request and C31 plan row were checked; no `audits/*.json` record names this C31 finding.

A keyed pen mask placed before Time Warp Scan belongs to each historical source strip. The previous cold-seek path excluded every pen mask and could show the current mask in frozen regions. A single enabled mask with its matching upstream effect marker now redraws at each crossing time. It uses a whole plate so the stencil edge matches sequential playback. Unmarked, extra and downstream masks retain their current effect-order path.

Changed files: `js/compositor.js` (narrow mask eligibility and historical whole-plate redraw), `js/exporter.js` (shape Time Warp MP4 resume identity version 4), `index.html` (compositor/exporter caches 326/144), `tests/tests.js` (one focused `{ item: 'TBD' }` regression), and this report.

The new native Chromium regression failed before the change and passed after it at full and half preview sizes, checking cold versus sequential pixels and a moving-mask control. The adjacent mask/effect-order regression passed. Two unrelated app-script bootstrap omissions reached no assertions and were retried. JavaScriptCore syntax and Git diff checks passed. No push, PR, deployment, protected-file edit or shared Claude checkout edit.
