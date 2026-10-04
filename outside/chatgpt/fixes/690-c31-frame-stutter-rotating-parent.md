# #690/C31 — Frame Stutter holds rotating and scaling null rigs

Starting commit: `df1572b5e376a8400dd699844a9b9abc7d0cdb19` on the clean Codex-only preferred checkpoint.

Frame Stutter's whole-frame historical redraw can reconstruct a shape beneath a rotating or scaling null parent at the exact hold boundary. The shared eligibility check previously excluded both transforms to protect Time Warp Scan's cropped-strip sampling. This change admits them only for Frame Stutter; Time Warp Scan retains the narrow translating-parent gate. Parent behaviors, masks, nested/split parents and other complex cases remain excluded.

Changed files: `js/compositor.js` (whole-plate parent gate), `js/exporter.js` (new shape Frame Stutter resume identity), `index.html` (compositor cache 319, exporter cache 137), `tests/tests.js` (one focused `{ item: 'TBD' }` regression), and this report.

The new native Chromium regression passed at full and half preview size: animated rotation and scale visibly move the child, while cold-seek and sequential Frame Stutter pixels both equal the exact 0.5-second hold-boundary frame. The adjacent moving-null-parent regression passed. JavaScriptCore syntax and `git diff --check` passed. No release or shared Claude checkout edit.
