# B44 Hum Remover — local build report

Starting commit: `93dceac1b8cdf3d91c5f7a40efeecd8e0e0449f4` on isolated `chatgpt/690-continuation`. Nothing was pushed or applied to the shared checkout.

Changed files: `js/audio-fx.js` (harmonic notch bank and controls), `index.html` (audio script cache tag), and `tests/tests.js` (one focused `{ item: 'TBD' }` regression).

Hum Remover uses 50 Hz by default for Australia and most of Europe, with a 60 Hz choice for North America. It cuts up to eight harmonics with a configurable notch width and dry/wet Amount. Harmonics outside the playable range are bypassed. The existing shared Web Audio chain drives both live preview and offline export.

Read: B44 at `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1257`, the exact #690 request at `REQUESTS.md:27376-27403`, request/audit searches for `hum remover`, and the existing audio graph and Notch effect. Earlier B42 Noise Gate needs a stateful detector and B43 Loudness Match needs programme loudness measurement; neither was substituted with an unrelated effect or marked complete.

Ran: JavaScriptCore parsed the changed script and test source. One focused production-graph probe confirmed eight 60–480 Hz notch nodes, width-to-Q scheduling and live parameter updates; `git diff --check` passed. The saved OfflineAudioContext regression and actual listening/browser behavior remain unverified.
