# Follow-up for the empty AAC export guard

Starting commit: `837fca6800e6ef94c278f444c179001abeec58d3` on isolated `codex/690-fixfor-empty-aac`. This follows verified fix `f25e15d3` for batch2 §1a / #1013.

The export report now decodes the AAC chunks that will enter the MP4 and records their actual peak. A nonzero AAC frame count paired with a zero decoded peak identifies encoded silence; an audible peak shows that sound reached the file. If an encoder emits a chunk after the track has been dropped, the callback warns and adds a `late AAC` line to this export's report, including if the report was already saved.

Changed: `js/exporter.js`, `index.html` (exporter cache 186→187), and the focused `{ item: 'TBD' }` regression in `tests/tests.js`. The regression now uses a standalone `AudioBuffer`, stubs the toast, expects about 15 AAC frames and an audible decoded peak in the positive control, and checks a late callback after a zero-chunk export.

Node syntax and diff checks passed. The focused muted Chromium regression later passed (1/1) with the ship lock absent. It checked audible decoded AAC peak and frame count, a zero-chunk MP4 without an audio track, ready-card/report honesty, and the late callback warning. Temporary mute-driver edit was restored.

Local only; no shared Claude checkout edit, push, PR or deployment.
