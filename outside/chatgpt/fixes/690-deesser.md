# B45 De-esser — local build report

Starting commit: `2e1e8ed18df73f2c22728a61ddf5fde28622ed30` on isolated `chatgpt/690-continuation`. Nothing was pushed or applied to the shared checkout.

Changed files: `js/audio-fx.js` (band-split de-esser signal chain), `index.html` (audio script cache tag), and `tests/tests.js` (one focused `{ item: 'TBD' }` regression).

De-esser isolates the 3–10 kHz band and compresses it above a threshold. It subtracts an aligned copy of that band from the full signal, then adds the compressed band back; lower voice frequencies stay in place. Reduction controls the compression ratio, Mix blends against a latency-matched dry path, and Listen plays only the detected band for tuning. The shared graph serves preview and offline export.

Read: B45 at `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1258`, exact #690 at `REQUESTS.md:27376-27403`, request/audit searches for de-esser and sibilance, and the existing compressor/delay/bypass graph.

Ran: JavaScriptCore parsed the changed script and test source. One focused production-graph probe confirmed the 6 kHz high-pass, compressor settings, matched delays and live parameter scheduling; `git diff --check` passed. The saved OfflineAudioContext regression, actual sound and iPhone/browser behavior remain unverified.
