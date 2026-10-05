# #690/C31 — Frame Stutter holds upstream keyed Gamma

Starting commit: `cdf694b347cbe525f47ecd73400a35ef467c365b` on clean Codex-only `codex/690-reviewed-local`.

Gamma is a source-local, history-free pixel lookup. A keyed Gamma effect before Frame Stutter must be evaluated at the held frame's time. Previously the cold seek fell back to the current-time grade. The safe upstream gate now includes Gamma; the existing restrictions for nonlocal and downstream effects remain. Main-renderer MP4 resume identities for video, shape and image Frame Stutter advance because these projects can now render different pixels at the same timestamp.

Changed files: `js/compositor.js`, `js/exporter.js`, `index.html` (compositor cache 354, exporter cache 164), `tests/tests.js` (one new focused `{ item: 'TBD' }` regression plus existing resume identity assertions), and this report.

The new native Chromium regression failed before the fix with current-time Gamma at 120 px. It passed after, proving cold-seek and sequential playback match the exact 0.5-second held plate at 120 and 60 px. The adjacent keyed Levels hold regression passed. JavaScriptCore parsed all three changed scripts; `git diff --check` passed. Gamma on decoded image and video layers was not separately exercised in this increment.
