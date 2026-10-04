# #690 / C23 — Light and Soft Glow blend modes

Starting commit: `783dad9f9f034ffe18ffda5e2afa82c0558fc9ab` (`codex/690-reviewed-local`).

Light Glow and Soft Glow now offer **Blend** Screen (saved/default), Add, and Soft light. Add applies the glow energy before clipping, so it remains visibly stronger than Screen even with a white glow colour. Soft light uses the existing W3C blend function at glow coverage. Missing/Screen values keep the exact old paths, including the transparent halo and chosen colour. Dark Glow's old plan lists Screen/Add for a black darkening halo, which would erase its effect; that design choice is logged in QUESTIONS.md and Dark Glow remains unchanged.

Changed files: `js/compositor.js` (controls and two kernels), `index.html` (compositor cache 314), `tests/tests.js` (one focused `TBD` regression), and this report.

Checks: actual-kernel JavaScriptCore checks confirmed distinct Add/Screen/Soft light output in both white and tinted glows, and missing versus Screen byte identity. Default-output hashes for both kernels matched the starting commit. Changed-script syntax and `git diff --check` passed. Native Chromium regression remains unrun because this sandbox denied local socket binding; no browser pass is claimed. Exact #690/C23 §6.2 sources were checked; no separate matching audit JSON finding was found.

Local checkpoint only; no shared Claude checkout, protected file, push, PR or deployment was touched.
