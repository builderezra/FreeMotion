# B48 Auto-Wah — local build report

Starting commit: `01297a19f53ed3bd7b3890b411da5645b3d67f71` on isolated `chatgpt/690-continuation`. Nothing was pushed or applied to the shared checkout.

Changed files: `js/audio-fx.js` (Auto-Wah signal graph, controls and search terms), `index.html` (audio script cache tag), and `tests/tests.js` (one focused `{ item: 'TBD' }` regression).

Auto-Wah adds an LFO sweep and an envelope-following sweep, with Base, Range, Resonance, Rate, Sensitivity and Mix. Its envelope path downmixes stereo for detection, rectifies and smooths the signal, then modulates a bandpass filter's frequency through native Web Audio nodes. Both modes use the same graph for preview and offline export. Base and Range remain independent keyframeable controls.

Read: B48 at `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1261`, exact #690 at `REQUESTS.md:27376-27403`, request/audit searches for Auto-Wah, and the existing audio registry/LFO graph.

Ran: JavaScriptCore parsed the changed script and test source. One focused production-graph probe checked registration, detector downmix, initial bandpass values, LFO presence and control scheduling; `git diff --check` passed. The saved OfflineAudioContext acoustic regression and browser/iPhone listening remain unverified.
