# #690 / C31 — keyed Saturation before Time Warp Scan on decoded video

Starting commit: clean preferred Codex-only `30412697e7a409a407576bdf7af3d92505d209cc`; isolated branch `codex/690-c31-video-saturation`. Exact standing #690 is `REQUESTS.md:27375-27403`; C31 is `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1375`. Neither `audits/912-audit.json` nor `audits/938-hunt.json` names Time Warp Scan, Frame Stutter or C31.

A keyed Saturation before Time Warp Scan was excluded from the decoded-video historical sampler, so a cold seek/export could use the current frame rather than the graded frame at each scan crossing. The video gate now admits source-local Saturation, using its existing historical redraw. The main MP4 resume renderer identity advances from 8 to 9 so an interrupted export cannot join an older prefix. Shape and still-image gates were fixed in the preceding checkpoints and are unchanged here.

Changed files: `js/compositor.js`, `js/exporter.js`, `index.html` (both changed script cache tags), `tests/tests.js` (one focused `item: 'TBD'` regression), and this report. The new regression failed before the fix (`keyed Saturation video plan was excluded`) and passed after it. Adjacent keyed Gamma video-scan regression passed. Node syntax checks for all changed JavaScript, `git diff --check`, and branch cleanliness checks passed.
