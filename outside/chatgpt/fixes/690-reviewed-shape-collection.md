# #690 — reviewed shape collection (local checkpoint)

Starting commit: `f19e9e90ccdd462e1bdcf783817792a65b88e619` on the isolated `codex/690-shape-v4-integration` clone. No shared Claude checkout, protected request/log, `tools/`, remote, PR or release was changed.

Ported the contours of Speech bubble, Spiral, Puzzle, Flame, Umbrella, Bomb, Thumbs up, Crown and Music note from the separately held v4 drawing study. The crown's natural aspect is `1.25:0.94`, matching its reviewed silhouette. Both frozen production-rendered full-fifteen sheets (34 px picker and 300 px canvas) are byte-identical after integration to the sheets passed by two new no-history critics. Their independent verdict and the frozen SHA-256 hashes are in `evidence/shape-thumb-v4-blind-20261004/REVIEW.md` in the takeover; the integration capture fixture and PNGs are under `outside/chatgpt/shape-review/2026-10-04-six-integrated/`.

Changed files: `js/compositor.js`, `js/app.js`, `index.html` (compositor cache 300, app cache 475), `tests/tests.js` (one `TBD` regression replacing two tests that asserted the rejected candidate's path structure), this report, and the integration capture fixture/PNGs.

Checks: full-set 34/300 px PNG byte hashes match the independently reviewed sheets; focused Bomb/Thumbs-up/Crown and existing Flame raster regressions passed 2/2 in native Chrome; JavaScriptCore syntax and `git diff --check` passed. The visual verdict is for these exact local pixels, not a claim that the app has been released.
