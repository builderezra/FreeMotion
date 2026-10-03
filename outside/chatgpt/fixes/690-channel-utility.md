# B46 Channel Utility — local build report

Starting commit: `081ee145d45b21226648044defc3266278837cd5` on isolated `chatgpt/690-continuation`. Nothing was pushed or applied to the shared checkout.

Changed files: `js/audio-fx.js` (four-route stereo matrix and controls), `index.html` (audio script cache tag), and `tests/tests.js` (one focused `{ item: 'TBD' }` regression).

Channel Utility adds Stereo, Mono, Left to both, Right to both and Swap modes, independent left/right phase inversion, and a center-preserving Balance control. The graph uses explicit speaker upmixing for mono input, as the existing Stereo Width effect does. Live route changes smooth over a short interval; the same graph serves preview and offline export.

Read: B46 at `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1259`, exact #690 at `REQUESTS.md:27376-27403`, request/audit searches for channel routing, and existing Stereo Width/Pan graphs.

Ran: JavaScriptCore parsed the changed script and test source. One focused production-graph probe passed all five matrices, phase inversion and full-right balance; `git diff --check` passed. The saved OfflineAudioContext regression and actual browser/iPhone listening remain unverified.
