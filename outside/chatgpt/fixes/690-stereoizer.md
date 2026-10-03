# B47 Stereoizer — local build report

Starting commit: `e74415e2e81839e24d0178f0249ebf742f01e2de` on isolated `chatgpt/690-continuation`. Nothing was pushed or applied to the shared checkout.

Changed files: `js/audio-fx.js` (safe mid/side and optional Haas paths), `index.html` (audio script cache tag), and `tests/tests.js` (one focused `{ item: 'TBD' }` regression).

Stereoizer adds Width, Delay, Fold-down safe and Side low cut controls. Its default mode generates side information from delayed, high-passed mid audio and adds it with opposite signs to left and right. This makes mono input wider while its left/right average stays equal to the original centre. Optional Haas mode delays only the right channel's high frequencies and warns that its mono fold-down can colour the sound. Both use the shared preview/export audio graph.

Read: B47 at `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1260`, exact #690 at `REQUESTS.md:27376-27403`, request/audit searches for stereo widening, and existing Stereo Width/Channel Utility graphs.

Ran: JavaScriptCore parsed the changed script and test source. One focused production-graph probe confirmed the safe and Haas graph nodes, default delay/low-cut, and live parameter updates; `git diff --check` passed. The saved OfflineAudioContext fold-down regression and actual browser/iPhone listening remain unverified.
