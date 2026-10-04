# #690/C31 — Time Warp Scan cold seeks with an animated still-image crop

Starting commit: `8bc9d0475eb608e9425414b52c266ab63d847a70` on the clean Codex-only preferred checkpoint.

Time Warp Scan could reconstruct a moving still image after a cold seek only when it had no crop. A decoded still is synchronously available, and `drawLayer` already evaluates its crop at the sampled historical time. The stateless scan path now admits a cropped still while the crop editor is closed; opening that editor keeps its whole-frame preview on the existing path. Video, active effects, masks, and complex parents retain their current eligibility gates.

Changed files: `js/compositor.js` (eligibility), `index.html` (compositor cache 316), `tests/tests.js` (one focused `{ item: 'TBD' }` regression), and this report.

The new native Chromium regression passed 1/1 with animated crop position and size, moving image, Freeze and Reveal, full and half preview size, plus controls showing the crop and historical Freeze matter. The adjacent existing moving-still regression passed 1/1. JavaScriptCore syntax and `git diff --check` passed. C31 complex media and effect stacks remain open; this is a local fix, not a release.
