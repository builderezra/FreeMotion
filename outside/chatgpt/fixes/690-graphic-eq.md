# B34 Graphic EQ — local build report

Starting commit: `91632a27fedb6cccb3c3cc33168b606acd63e9b1` on isolated `chatgpt/690-continuation`. Nothing was pushed or applied to the shared checkout.

Changed files: `js/audio-fx.js` (ten-band signal graph, output and presets), `js/inspector.js` (named audio preset selector), `index.html` (script cache tags), and `tests/tests.js` (one focused `{ item: 'TBD' }` rendered-audio regression).

Graphic EQ offers bands centred at 31 Hz through 16 kHz, each adjustable from −12 to +12 dB, plus Output from −24 to +12 dB. Six named presets shift the current ten-band settings without erasing slider values. The same Web Audio chain builder supplies live playback and offline export. At lower sample rates, band centres above Nyquist are capped to a valid frequency.

Read: B34 at `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1242`, #690 at `REQUESTS.md:27376-27403`, existing 3-Band EQ and the shared preview/export audio chain. Exact request/audit searches found no recorded Graphic EQ implementation or finding on the starting snapshot.

Ran: JavaScriptCore parsed the changed audio, inspector and test scripts. One focused production-graph probe checked the ten neutral bands, preset changes and live band refinement; `git diff --check` passed. The saved regression renders a tone through Flat, Bass lift and reduced Output, but a browser run and actual listening remain unverified.
