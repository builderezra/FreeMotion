# #690/C31 — Frame Stutter holds shapes with hard vector masks

Starting commit: `df62ae95f8a239b9c1f6783e1609b6f02742cff1` on the clean Codex-only preferred checkpoint.

The exact-boundary Frame Stutter redraw excluded every masked shape. A hard vector mask is a deterministic local clip applied by the existing layer renderer, so the whole-plate historical sample can reconstruct it at the hold boundary. This change admits only that case. Feathered masks use a separate offscreen pass, while pen masks and other complex stacks retain their prior gate.

Changed files: `js/compositor.js` (narrow hard-mask eligibility), `js/exporter.js` (shape Frame Stutter resume identity 3), `index.html` (compositor cache 320, exporter cache 138), `tests/tests.js` (one focused `{ item: 'TBD' }` regression), and this report.

The native Chromium regression passed normal and inverted ellipse masks at full/half preview size: cold-seek and sequential output both matched the un-effected exact 0.5-second boundary rather than the 0.7-second live shape. The adjacent rotating-null-parent regression passed. JavaScriptCore syntax and `git diff --check` passed. No release or shared Claude checkout edit.
