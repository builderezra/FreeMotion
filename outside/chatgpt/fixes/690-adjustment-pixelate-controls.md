# #1055 — adjustment Pixelate respects Block aspect and Edges

- Starting commit: `98feaadfbf205268deff9ef18bd98245ed86ac37` (`codex/690-shortcut-sheet-accuracy`); new branch `codex/690-adjustment-pixelate-controls` in the existing isolated Codex worktree.
- Source: shared `REQUESTS.md` #1055 and batch3 `VERIFIED.md` §1 item 16. Shared audits #934/#939 discuss the separate zoom-grid alignment problem, already fixed in this chain; no exact duplicate of these two inert controls was found.
- Changed: `js/compositor.js`, `index.html`, `tests/tests.js`.
- Adjustment Pixelate now uses Block aspect when counting rows and Edges when enlarging blocks, including cropped previews on the frame grid. Its separate geometry pass remains separate from `PIXEL_ADJ`, avoiding a double application. The clip renderer was unchanged.
- Checks: focused production grid check passed for aspect-dependent row count and soft-edge interpolation; changed JavaScript syntax and diff checks passed. The focused muted Chromium render regression passed (1/1), including adjustment settings and the clip control, after a fixture cleanup correction.
- Local only; not promoted, pushed or released.
