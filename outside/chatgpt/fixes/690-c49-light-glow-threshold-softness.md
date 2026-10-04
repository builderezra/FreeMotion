# #690 / C49 — Light Glow threshold softness

Starting commit: `cbd3fd4ddd67787337ad3e6d009d582d5dccd3d7` (`codex/690-reviewed-local`).

The C49 plan found a hard Light Glow extraction step that produces a visible contour across a gradient. Light Glow now offers **Threshold softness** (0–100%, default 0). Positive values use a smooth transition around the threshold while keeping full highlights unchanged. Missing or zero values run the original exact comparison, preserving saved projects. This is the C49 increment; the broader C23 multi-glow controls remain open.

Changed files: `js/compositor.js` (control and kernel), `index.html` (compositor cache 305), `tests/tests.js` (one focused `TBD` regression), this report.

Checks: the new gradient/legacy-parity regression and existing #904 glow-colour regression passed 2/2 in native Chromium. JavaScriptCore syntax for both changed scripts and `git diff --check` passed. The only `audits/*.json` search hits for C49 were coincidental agent IDs and unrelated filter examples; the exact #690 request and C49 plan were verified before the fix.
