# B42 Noise Gate — local build report

Starting commit: `0cdc6732240836c918eeed088f2f14be32a4fa92` on isolated `chatgpt/690-continuation`. Nothing was pushed or applied to the shared checkout.

Changed files: `js/audio-fx.js` (effect definition and shared preview/export graph), `index.html` (script cache tag), and `tests/tests.js` (one focused `{ item: 'TBD' }` regression).

Noise Gate has Threshold, Floor, Release, Lookahead and Hysteresis controls. A rectified, smoothed mono detector drives a threshold comparator. Delayed feedback provides hysteresis, while separate fast and slow control paths open quickly and release gradually. The audio path waits by the requested lookahead so the detector can open before an onset. The same native Web Audio graph is built for live playback and offline export, without a timer or separate export algorithm.

Read: B42 at `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1259`, the standing #690 request at `REQUESTS.md:27376-27403`, the existing compressor/de-esser/Auto-Wah graphs, and a search of `REQUESTS.md` and `audits/*.json` for a prior Noise Gate implementation.

Ran: JavaScriptCore parsed `js/audio-fx.js` and `tests/tests.js`; `git diff --check` passed. A focused headless Chrome OfflineAudioContext check rendered 0.6 seconds of quiet/loud/quiet tone through the actual production graph: with Floor 0%, quiet RMS was 0 and loud RMS 0.212; with Floor 50%, quiet RMS was 0.000707 and loud RMS 0.212. Headless Chrome did not finish two sequential offline renders in one temporary page under virtual time, so the saved regression uses one render; the two individual browser renders both completed. Hysteresis/release timing, live listening and iPhone behavior remain unverified.
