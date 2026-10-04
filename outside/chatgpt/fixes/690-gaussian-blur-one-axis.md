# #690 — Gaussian Blur horizontal and vertical directions

Starting commit: `0df427ebee7842a30976b5095d7ead7b1417f992` on the clean preferred `codex/690-reviewed-local` checkpoint. Isolated branch: `codex/690-c25-gaussian-axis`.

The exact #690 standing brief and the Gaussian Blur §15.7 plan were checked. C25 edge parity was already fixed locally at the starting commit; this increment adds the next requested control. No relevant `audits/*.json` record reports the Gaussian direction finding (the raw C25 hit is an unrelated agent ID).

Changed files: `js/compositor.js`, `js/gl-color.js`, `index.html` (compositor cache 310, colour shader cache 6), `tests/tests.js` (one focused `TBD` regression), and this report. Gaussian Blur now offers Both, Horizontal and Vertical. Only a non-default direction moves to the ordered plate pass; the existing Repeat-edge option can combine with either direction. The WebGL blur skips the unused axis; the CPU fallback runs only that axis. Saved Both/Fade instances keep their original CSS path. The inspector notes that a one-way blur follows effect order.

Checks: the new native Chromium regression passed for both GPU and forced CPU paths: a dot spreads along the chosen axis while staying sharp across the other. It also checked that a one-way blur is omitted from the CSS filter and saved Both still uses it. The prior Gaussian Repeat regression passed alongside it (2/2). JavaScriptCore syntax and `git diff --check` passed. Mix and alternate blending from §15.7 remain open; original-font design quality remains held and reviewed shapes are still local/unreleased.
