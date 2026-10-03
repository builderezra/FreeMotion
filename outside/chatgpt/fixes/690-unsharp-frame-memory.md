# #690 — Reduce Unsharp Mask frame allocation

Starting commit: `b5ed0efb1b8d2a3bd559bf23232f18e6ccd99b84` on isolated `chatgpt/690-continuation`.

Unsharp Mask allocated two full-frame, three-channel `Float32Array`s per render: one for the horizontal pass and another for the completed blur. The vertical pass now sharpens each pixel as its blur is calculated, retaining only a three-value scratch array for that pass. At 1080×1920, this removes one 24,883,200-byte allocation per rendered frame. It does not change the controls or intended output.

Changed `js/compositor.js`, its cache tag in `index.html`, one focused `{ item: 'TBD' }` regression in `tests/tests.js`, and this report. A JavaScriptCore comparison against the starting production kernel found zero different bytes on a 31×19 multicolour/alpha fixture under legacy, thresholded colour-safe, and mixed-protection settings. The saved regression's two golden outputs and script syntax passed; `git diff --check` passed. Frame-time improvement and browser/iPhone memory behaviour remain UNVERIFIED.
