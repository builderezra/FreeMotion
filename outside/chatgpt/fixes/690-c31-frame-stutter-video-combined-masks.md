# #690 / C31 — Frame Stutter on decoded video with combined masks

Starting commit: `cbacbcb8013096ba84a16629dbfa815e300aa3c4` on isolated `codex/690-c31-stutter-video-combined-mask`.

The decoded-video cold-seek planner previously excluded a clip with both an upstream pen-mask marker and an enabled legacy vector mask. It now prepares the historical video frame for that combination, then redraws both stencils on the whole hold-boundary plate. Other unsupported pen-mask stacks retain the prior path.

Changed files: `js/compositor.js` (remove the combined-stencil gate); `js/exporter.js` (video boundary resume identity 5); `index.html` (compositor/exporter cache tags 337/155); `tests/tests.js` (one new `TBD` regression and prior renderer-identity expectations); this report.

The new Chromium regression failed before the planner change because no boundary source was prepared. It passed after the fix at 128 and 64 px: cold and sequential frames matched, disabling either mask changed visible held pixels, and a one-frame main-thread MP4 export completed with the new renderer identity. The adjacent keyed pen-mask video/MP4 regression passed. JavaScriptCore syntax and `git diff --check` passed. One unrelated test-frame script omission was retried. This does not assert Worker export or arbitrary additional mask stacks.

Local only; no shared Claude checkout edit, push, PR, deployment or release.
