# 690 / C31 — legacy vector masks on decoded-video Frame Stutter

Starting commit: `c5eb2137be08b8c1ebe435238775bc4a443f5314` (`codex/690-reviewed-local`).

Frame Stutter's decoded-video boundary planner excluded any legacy vector mask, so a cold seek could use the live frame inside a feathered stencil. The historical source redraw already renders a whole plate with the layer's mask at the hold boundary; the redundant exclusion is removed. Pen-mask stacks remain gated until their effect-marker order is proved. MP4 resume renderer identity advances from `c31-video-boundary-2` to `-3` to keep interrupted exports from reusing an older prefix.

Changed files: `js/compositor.js`, `js/exporter.js`, `index.html` (compositor/exporter cache tags), `tests/tests.js` (one focused `TBD` regression), and this report.

Checks: new Chromium regression failed before because the masked plan was excluded. After the fix, full/half-size feathered-video cold seeks matched sequential playback, disabling the vector mask visibly changed the held frame, and a one-frame main MP4 completed. The adjacent decoded-video/Worker/MP4 regression passed. JavaScriptCore parsed changed scripts and `git diff --check` passed. Intermittent unrelated test-frame script omissions required bounded retries; the new test checks the renderer marker when the optional export-resume helper loads, so that marker was not conclusively exercised in every passing run.

Local Codex-only checkpoint; no shared Claude checkout edit, push, PR or deployment.
