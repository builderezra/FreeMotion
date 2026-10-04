# #690/C31 — Time Warp Scan shape cold seeks

Starting commit: `e9bf3c90471704bab8ffc9c0c71d5d5c065e0702` (`codex/690-reviewed-local`).

The scan's frozen band used the current picture after a jump, so seeking to a moving shape changed pixels that playback had frozen earlier. For an isolated vector shape, a cold seek now rebuilds Freeze from the output frames where the bar crossed each strip; Reveal samples the first frame of the current sweep. A cropped source viewport keeps long-sweep reconstruction bounded to the narrow strips. A 20 s, 60 fps, 1080×1920 cold Freeze on the local headless renderer fell from 854 ms with full-plate historical redraws to 40 ms with cropped redraws; that is a development-machine measurement, not a phone benchmark. Continuous playback and ineligible media or complex stacks keep their existing path. The main MP4 resume identity changes for shape Time Warp Scan; Worker identity includes the changed compositor asset tag.

Changed files: `js/compositor.js` (safe shape sampling and strip reconstruction), `js/exporter.js` (main MP4 renderer token), `index.html` (compositor 292 and exporter 132 cache tags), `tests/tests.js` (one focused `{ item: 'TBD' }` regression).

Checks: the new browser regression passed for Freeze, Reveal, a looped horizontal sweep, half-size preview, and main MP4 resume identity. Existing Time Warp Scan export warm-up and shared Frame Stutter shape-boundary regressions passed. JavaScriptCore syntax and `git diff --check` passed. Several initial browser launches missed unrelated app scripts; complete-boot retries passed.

Remaining C31 work: Time Warp Scan on video, upstream/downstream effects, parented/masked/behavior-driven shapes, plus Frame Stutter complex stacks. This is a partial C31 fix and does not establish phone performance or release readiness.
