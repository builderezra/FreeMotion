# #690 B43 — Loudness Match

Starting commit: `c63db8ef2b20d5ddfe0d9f1e3d7f4eddda88797f` on isolated `chatgpt/690-continuation`.

Built a local Loudness Match audio effect with −23, −16, −14 and −9 LUFS targets, a sample-peak guard and an adjustable peak ceiling. The programme analysis uses K weighting, 400 ms windows at 75% overlap, and the absolute and relative gates from [ITU-R BS.1770-5](https://www.itu.int/dms_pubrec/itu-r/rec/bs/R-REC-BS.1770-5-202311-I!!PDF-E.pdf). The same measured result feeds the existing Web Audio effect chain in live preview and export. Preview starts dry while analysis is pending and rebuilds the chain when it finishes; export waits for analysis. Reversed preview restarts its audio voice after analysis. Changes are local only.

Changed: `js/audio-fx.js`, `js/audio-fx-live.js`, `js/exporter.js`, `index.html` cache tags, one focused `{ item: 'TBD' }` regression in `tests/tests.js`, and this report.

Checks: JavaScriptCore compiled the four changed scripts; a 48 kHz 997 Hz half-scale sine measured −9.0308 LUFS with peak 0.5, and a focused production-graph probe set the −16 LUFS gain to 0.44827. `git diff --check` passed. A headless Chrome render could not be confirmed: sandboxed Chrome exited −6, and the approved local run timed out while waiting for its virtual-time render. The saved OfflineAudioContext regression and iPhone listening remain unrun.

Limits: source-region analysis does not time-weight speed-ramped playback; very short clips use their whole window instead of a full 400 ms block. Files over 64 MB or clips over three minutes need an already decoded buffer; a decoded segment over ten minutes stays unchanged. A peak guard can prevent the selected LUFS target, and its ceiling applies at this effect's position, so later effects may raise the output. It is a sample-peak guard, not an oversampled true-peak meter. No project or media bytes leave the device.
