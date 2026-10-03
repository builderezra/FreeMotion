# B38 Fractal Noise — local build report

Starting commit: `44b15c57a01abf27d12abc6142e3a1c7e092758b` on isolated `chatgpt/690-continuation`. Nothing was pushed or applied to the shared checkout.

Changed files: `js/compositor.js` (effect controls, routing and noise renderer), `js/fx-registry.js` (Generative listing), `index.html` (script cache tags), and `tests/tests.js` (one focused `{ item: 'TBD' }` regression).

Fractal Noise offers Basic, Turbulent, Smooth and Ridged patterns; Scale, 1–6 Octaves, Contrast, animated Evolution, Seed, two colours, Blend and Amount. It can replace a layer's colour to make an organic texture or blend the texture over the source. A reusable grid capped at 320 samples on the long edge limits per-frame noise work; the alpha channel stays untouched. Animated Evolution integrates speed keyframes so slowing it does not rewind the field. Existing Fractal Ridges keeps its original rendering.

Read: B38 at `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1251`, #690 at `REQUESTS.md:27376-27403`, and the existing Fractal Ridges at `js/compositor.js:855-872` and `REQUESTS.md:10750`.

Ran: JavaScriptCore parsed the changed scripts and test source. One focused production-kernel probe confirmed four distinct patterns, animation, held texture at zero Evolution, zero-Amount identity and unchanged alpha. A single 720×1280 Mac JavaScriptCore frame with six octaves took 31 ms; that is not a browser or iPhone measurement. `git diff --check` passed. Browser visual quality, preview/export parity and phone performance remain unverified.
