# #690 — Protect Overdrive's neutral highlights

Starting commit: `ca35afb30ea15f4d9915308aab87cac7237ad79f` on isolated `chatgpt/690-continuation`.

The filter review in `audits/912-audit.json` recorded a lavender sun in Overdrive from channel-by-channel Unsharp Mask sharpening. The new colour-protection control did not change existing filter recipes automatically, so Overdrive still used the old path. Its Unsharp Mask ingredient now sets `coloursafe: 100`. This changes newly applied Overdrive filters; already saved filter instances keep their parameters.

Changed `js/filters.js`, its cache tag in `index.html`, one focused `{ item: 'TBD' }` regression in `tests/tests.js`, and this report. A JavaScriptCore probe created a real Overdrive instance, ran its Unsharp Mask over a red/grey edge, and measured the adjacent neutral pixel as `(255,255,255,255)`. JavaScriptCore syntax and `git diff --check` passed. The complete filter look on a real photo and browser playback remain UNVERIFIED.
