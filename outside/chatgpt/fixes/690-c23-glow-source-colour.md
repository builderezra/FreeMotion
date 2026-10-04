# #690 / C23 — Light and Soft Glow source colour

Starting commit: `8bf9ee641408332f873a8f4b8ee65f40bef037f6` (`codex/690-reviewed-local`).

Light and Soft Glow now offer **Colour from**: Chosen colour (saved/default) or Source colour. Source mode carries the bright source pixels' own RGB through the same blur and smoothness passes as glow intensity, so red and blue artwork casts corresponding coloured halos instead of one swatch colour. The three extra colour planes are allocated only when Source colour is selected and share the existing short-lived glow scratch lifetime. Saved Chosen-colour paths remain unchanged.

Changed files: `js/compositor.js` (two controls, opt-in colour planes/compositing), `index.html` (compositor cache 315), `tests/tests.js` (one focused `TBD` regression), and this report.

Checks: actual-kernel JavaScriptCore checks showed separate red/blue transparent halos in both effects, also at three Smoothness passes, with default-versus-explicit Chosen-colour byte identity. Default-output hashes matched the starting commit for both kernels. Changed-script syntax and `git diff --check` passed. Native Chromium regression was not run because this sandbox denied local test-server socket binding; no browser pass is claimed. Exact #690/C23 §6.2 sources were checked and no separate matching `audits/*.json` finding appeared.

Local checkpoint only. Dark Glow blend semantics remain an input-dependent question in QUESTIONS.md; no shared Claude checkout, protected file, push, PR or deployment was touched.
