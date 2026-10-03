# B33 Black & White Mixer — local build report

Starting commit: `3728d6f58cf6ce01f6aaf5922e5f79c2078f0836` on isolated `chatgpt/690-continuation`. Nothing was pushed or applied to the shared checkout.

Changed files: `js/compositor.js` (catalogue and shared pixel kernel), `js/fx-registry.js` (Colouring listing), `index.html` (both script cache tags), and `tests/tests.js` (one focused `{ item: 'TBD' }` regression).

The effect converts six source colour ranges to adjustable monochrome brightness, with Neutral/Red/Orange/Yellow/Green/Blue/Infrared filter presets, optional colour tint, contrast and Mix. Presets shift the range sliders so individual adjustments still apply. Grey source pixels use their luminance because they belong to no colour range. The existing post-effect route makes the kernel available to ordinary and adjustment layers.

Read: B33 at `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1241`, #690 at `REQUESTS.md:27376-27403`, and existing Grayscale, Channel Remap and HSL Mixer implementations. Exact request/audit searches found no recorded Black & White Mixer implementation or finding on the starting snapshot; Grayscale is a distinct fixed-weight effect.

Ran: JavaScriptCore parsed the three changed JavaScript files. One focused production-kernel probe confirmed the routing, neutral grey output, independent colour weights, zero-Mix identity, preset/slider response, tint response and unchanged alpha. `git diff --check` passed. Browser visual quality remains unverified.
