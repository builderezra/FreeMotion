# #690 / C50 — Vignette roundness

Starting commit: `75b4f2fdcaa933300f8481230c0f06ee51fea0ea` (`codex/690-reviewed-local`).

The C50 plan found that the circular Vignette leaves top and bottom bands on a 9:16 frame. Vignette now has **Roundness** (0–100%, default 100). At zero, its gradient fits the frame as an ellipse; intermediate values blend the ellipse's radii with the existing circle. Missing/default 100 takes the original canvas draw path exactly, preserving saved projects and filter looks. The #986 unified Vignette renderer is retained. The remaining 6.1 controls are separate work.

Changed files: `js/compositor.js` (control and canvas gradient), `index.html` (compositor cache 306), `tests/tests.js` (one focused `TBD` regression), this report.

Checks: the new 9:16 equal-inset/legacy-parity regression and existing #986 media/shape Vignette compatibility regression passed 2/2 in native Chromium. JavaScriptCore syntax for changed scripts and `git diff --check` passed. The exact #690 request and C50/6.1 plan were checked; audit JSON hits were unrelated IDs and other findings.
