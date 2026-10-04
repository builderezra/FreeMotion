# #690 / C26 — geometric warp edge and smooth sampling controls

Starting commit: `101522534c7e5ade2fee0326c9f420e271333cbf` on a fresh isolated `codex/690-c26-warp-sampling` clone. The original #690 request is at `REQUESTS.md:27375`; the exact C26 finding and specification are at `tools/design/plans/2026-09-29-idle-backlog/backlog.md:677` and `:1371`. No C26-specific `audits/*.json` record was found.

All registered geometric warps now offer **Edges** (Stretch, Transparent, Wrap, Mirror) and **Smooth sampling** (Off, On). Both defaults retain the previous nearest/clamped rendering of saved projects. The shared CPU sampler and WebGL shader apply the same coordinates, edge policies and premultiplied-alpha bilinear blend; chained GPU warps receive per-effect choices. No individual warp map was changed.

Changed files: `js/compositor.js`, `js/gl-warp.js`, `index.html` (cache tags 341/5), `tests/tests.js` (one `TBD` regression). This report is local-only.

Checks: focused Chromium C26 regression passed 1/1 after testing all four CPU edges, opaque and transparent bilinear samples, GPU colour interpolation and GPU transparent/wrap/mirror samples. Existing stacked-GPU-warp and all-ported-warp default-parity regressions passed 1/1 each. Changed JavaScript syntax and `git diff --check` passed. The isolated tests use synthetic plates; they do not claim a visual review of every named warp or a released build.
