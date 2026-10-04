# #690 / C43 — Long Shadow reach and angled edges

Starting commit: `38954ff2300fb6bb4632987fbfb4577b3cc30b12` on isolated `codex/690-c43-longshadow`.

The exact #690 standing brief and C43 row in `tools/design/plans/2026-09-29-idle-backlog/backlog.md` were checked. No `audits/*.json` record matches C43 or Long Shadow. #904 already supplied Angle, so this fixes its remaining 80 px limit and jagged non-45° path without duplicating that work.

Changed `js/compositor.js`: Length now reaches 400 px. Other-than-45° angles scan major-axis rays with subpixel interpolation, replacing the old per-pixel/per-length rounded search. The original 45° walk is retained so saved looks at the old range remain byte-identical. `index.html` bumps the compositor tag to 303. `tests/tests.js` adds one `TBD` regression for 120 px reach, angled partial-alpha edges, and saved 45° parity. `outside/chatgpt/fixes/690-c43-long-shadow-visual.png` is a native browser sample at 23° and 333°.

Checks: focused new regression and existing #904 angle/opacity regression passed 2/2. At 1280×720, a 400 px 23° shadow over a 600×350 rectangle took 13–15 ms in local headless Chrome. JavaScriptCore syntax and `git diff --check` passed. The visual sample was inspected at native size. No broad suite, push, PR, deploy, or shared Claude checkout edit.
