# #690 / C31 — Frame Stutter on decoded video with a keyed pen mask

Starting commit: `79c3a7f62103c0d09b9251e1fbf449cd9172cf88` on isolated `codex/690-c31-stutter-video-penmask`.

Frame Stutter's cold-seek decoder skipped every video carrying a pen mask. A video with one enabled, identified pen mask and its matching marker before Frame Stutter can now prepare the historical frame and redraw the keyed stencil at the exact hold boundary. Unmarked, extra, downstream and combined legacy/pen mask stacks retain the previous path until separately proved.

Changed files: `js/compositor.js` (narrow planner gate); `js/exporter.js` (video boundary resume identity 4); `index.html` (compositor/exporter cache tags 336/154); `tests/tests.js` (one new `TBD` regression and prior resume-identity expectation); this report.

The new browser regression first failed because the pen-masked video was excluded. After the fix it passed at 128 and 64 px: a cold seek matched sequential playback, while the mask cut visible decoded pixels, including a marker-only control. A one-frame main-thread MP4 export completed with the updated renderer identity. The adjacent feathered legacy-mask video/MP4 regression passed. JavaScriptCore syntax and `git diff --check` passed. The test harness intermittently omitted unrelated app scripts at startup; those incomplete runs were retried. No Worker export or combined-mask claim is made here.

Local only; no shared Claude checkout edit, push, PR, deployment or release.
