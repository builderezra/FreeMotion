# #690 / C45 — Tilt Shift sharp band and blur quality

Starting commit: `7a2ef677e643b307419308a45ebd6c1e6ce3e349` on fresh isolated `codex/690-c45-tiltshift`.

The exact #690 standing brief and C45 plan row were checked; no matching `audits/*.json` finding. The earlier #904 Blur amount and Angle controls already exist and were retained.

Changed `js/compositor.js`: new Sharp band (0–0.3 of frame height) leaves a real strip of full original detail around the focus line, including when angled. New Blur quality (1–3 passes) offers a smoother, Gaussian-like defocus; each pass uses a shorter box radius so overall spread stays roughly comparable. Both controls default to the old result (band 0, quality 1), and the existing single-pass loop keeps its arithmetic. The crop halo grows only when extra passes need it. `index.html` bumps the compositor cache tag to 304. One `TBD` test in `tests/tests.js` checks the band, the wider smooth blur response and old defaults.

Checks: new behavior and #904 Angle checks passed 2/2; new behavior and the repository's original 17-tap byte-identity reference passed 2/2. JavaScriptCore syntax and `git diff --check` passed. At 1280×720, optional quality 3 took about 118–130 ms in local headless Chrome; quality 1 remains the default for interactive work. No broad suite, push, PR, deploy, or shared Claude checkout edit.
