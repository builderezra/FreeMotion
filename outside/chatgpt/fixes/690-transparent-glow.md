# #690 — Glow extends beyond transparent text and stickers

Starting commit: `d446114423a4baab4e23e28eadfc9e64402e6e0e` on isolated `chatgpt/690-continuation`.

The effect review at `REQUESTS.md:32074-32079` records that Light Glow skips fully transparent pixels and therefore cannot form a halo beyond text. Soft Glow used the same skip. Both kernels already blurred a brightness mask beyond the source, but discarded its result wherever source alpha was zero. They now write the blurred glow colour and intensity into those transparent pixels. Existing opaque pixels still take their previous colour path, so the change targets transparent artwork such as text and stickers. The brightness threshold continues to suppress glow from dark sources.

Changed `js/compositor.js`, its cache tag in `index.html`, one focused `{ item: 'TBD' }` regression in `tests/tests.js`, and this report. A production-kernel probe of a white 5×5 mark on a transparent 25×25 plate produced a coloured halo at the formerly empty pixel `(17,12)` with alpha 24 for Light Glow and 25 for Soft Glow; source alpha stayed 255, distant pixels stayed transparent, and threshold 100 removed the halo. JavaScriptCore syntax and `git diff --check` passed. Real text rendering, visual falloff and iPhone performance remain UNVERIFIED.
