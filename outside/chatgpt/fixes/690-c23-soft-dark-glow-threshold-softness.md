# #690 / C23 — Soft and Dark Glow threshold softness

Starting commit: `a0732c3d9ce9f9aa19fb97892ee1f3d3acfeda50` (`codex/690-reviewed-local`).

Soft and Dark Glow now offer **Threshold softness** (0–100%, default 0). Soft Glow uses a continuous quadratic knee across its highlight threshold; Dark Glow eases the dark extraction across its threshold. Missing or zero values retain the exact saved-project path. This completes the threshold-softness control across Light, Soft, and Dark Glow; smoothness passes, blend choices, and source-colour mode in plan §6.2 remain open.

Changed files: `js/compositor.js` (controls and extraction), `index.html` (compositor cache 312), `tests/tests.js` (one focused `TBD` regression), and this report.

Checks: the real Soft/Dark kernels and registry passed a JavaScriptCore gradient check, including zero-knee byte identity and positive-knee behavior. Default output hashes matched the starting commit for both kernels. Changed-script syntax and `git diff --check` passed. The native Chromium test server could not start because this sandbox denied local socket binding, so the browser regression was not run. The exact #690 brief and C23 §6.2 plan were checked; `audits/*.json` contained no separate threshold-softness finding.

Local checkpoint only. No shared Claude checkout, protected file, push, PR, or deployment was touched.
