# #690/C31 — Frame Stutter holds feathered vector masks

Starting commit: `382a457752cfd10149ec9623fc60cdf6eadf60cb` on the clean Codex-only preferred checkpoint.

The exact-boundary Frame Stutter path still excluded a moving shape with a feathered legacy vector mask, so a cold seek cached the live masked picture. The full-plate historical redraw already supports the feathered mask's existing offscreen pass. It now samples that pass at the hold boundary. Drawn pen masks remain excluded because they wrap the entire effect stack.

Changed files: `js/compositor.js` (feather-mask eligibility), `js/exporter.js` (shape Frame Stutter resume identity 4), `index.html` (compositor cache 321, exporter cache 139), `tests/tests.js` (one focused `{ item: 'TBD' }` regression), and this report.

The new native Chromium regression first failed on the old path, then passed after the change. Normal and inverted feathered ellipse masks retain a soft edge and produce identical cold-seek, sequential, and exact 0.5-second boundary pixels at full/half preview size. The adjacent hard-mask regression passed. JavaScriptCore syntax and `git diff --check` passed. No release or shared Claude checkout edit.
