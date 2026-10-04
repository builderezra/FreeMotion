# 690 / C31 — combined keyed pen and vector masks on scanned video

Starting commit: `c0df65e18b0b663934c9207980e3309a2df9bca6` (`codex/690-reviewed-local`).

Time Warp Scan's decoded-video historical sampler rejected a clip with both one identified upstream pen mask and an enabled legacy vector mask. The existing whole-plate redraw handles their order and mask edges; the extra exclusion has been removed for this already constrained stack. Other unmarked, additional and downstream pen masks remain excluded. MP4 resume renderer identity advances from 4 to 5 so interrupted exports cannot reuse a previous prefix.

Changed files: `js/compositor.js`, `js/exporter.js`, `index.html` (compositor/exporter cache tags), `tests/tests.js` (one focused `TBD` regression and current resume assertions), and this report.

Checks: the new Chromium test failed before because the combined-mask plan was excluded; after the fix it passed continuous-versus-cold sampling at 128/64 px for hard/feathered vector masks, an explicit vector-mask effect control, and a one-frame main MP4 export. Adjacent keyed pen-mask video/MP4 regression passed after one unrelated app-script bootstrap omission. JavaScriptCore syntax and `git diff --check` passed.

This is a local Codex-only checkpoint. It does not prove arbitrary extra masks or downstream effects. No shared Claude checkout edit, push, PR or deployment.
