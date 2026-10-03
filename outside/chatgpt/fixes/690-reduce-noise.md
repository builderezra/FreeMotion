# B24 Reduce Noise — local build report

Starting commit: `30a759618150e82d47c684b193e25883e2e3e161` on isolated `chatgpt/690-continuation`. Nothing was pushed or applied to the shared checkout.

Changed files: `js/noise-reduction.js` (new local STFT gate and reversible WAV twin), `js/audio-tools.js` (reuse its existing media decoder), `js/inspector.js` (Volume controls and removed-noise audition), `index.html` (load new script and bump changed script tags), `tests/tests.js` (one focused `{ item: 'TBD' }` regression).

The tool learns a noise spectrum from `FM.detectSpeech` non-speech frames, attenuates it with amount/reduction/sensitivity controls, optionally protects speech frames, and can audition the removed component. Applying creates an audio-only twin with matching trim, reverse, speed, volume, fades and audio effects; pressing again deletes the twin and restores the original mute state. Mono and stereo source tracks up to two minutes are supported. The length cap prevents a much larger whole-track decode + output + WAV allocation on phones; longer files receive a clear error and remain unchanged. This is a DSP gate, not AI source separation, and it may leave noise or colour voices.

Read: B24 recipe in `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1208-1216`, `FM.detectSpeech` in `js/captions-vad.js`, the existing reversible Remove Vocals tool in `js/audio-tools.js`, and Volume tool wiring in `js/inspector.js`. Search found no exact duplicate feature in `REQUESTS.md` or `audits/*.json` on this snapshot.

Ran: JavaScriptCore compiled all changed scripts and `tests/tests.js`; focused DSP probe measured a learned 192 Hz hum at 0.745 of its source amplitude while a 1024 Hz voice tone remained at 1.000; focused twin probe verified creation, timing/mix copy, and restoration. `git diff --check` passed. Browser UI, actual iPhone processing time/memory, and auditory quality on real recordings remain unverified.
