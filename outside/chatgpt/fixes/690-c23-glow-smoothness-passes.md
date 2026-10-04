# #690 / C23 — Glow smoothness passes

Starting commit: `2cea7b62c6fe6e35a986624145d6ed30bbc9c10a` (`codex/690-reviewed-local`).

Light, Soft and Dark Glow now offer **Smoothness** 1–3 passes. One is the unchanged saved-project path. Extra separable box passes extend the halo and smooth its falloff; the Light/Dark cropped-readback margin expands with the selected reach so the new tails are not cut off. The remaining §6.2 blend and source-colour options stay open.

Changed files: `js/compositor.js` (controls, shared extra-pass blur and crop margin), `index.html` (compositor cache 313), `tests/tests.js` (one focused `TBD` regression), and this report.

Checks: the real three kernels and registry passed a direct JavaScriptCore point-source test: three-pass halos descend beyond the original one-pass reach, and omitted versus explicit one-pass output is byte-identical. Default-output hashes for all three kernels matched the starting commit. Changed-script syntax and `git diff --check` passed. Native Chromium regression remains unrun because this sandbox denied local socket binding at the previous attempt; no browser pass is claimed. Exact #690/C23 §6.2 sources were checked, with no separate matching `audits/*.json` threshold/smoothness finding.

Local checkpoint only; no shared Claude checkout, protected file, push, PR or deployment was touched.
