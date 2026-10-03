# HSL Mixer, local continuation

Starting commit: `7e8c030723b7afa236fa13a884801ea1afe6ee37` on local branch `chatgpt/690-continuation`.

`tools/design/plans/2026-09-29-idle-backlog/backlog.md:1196-1198` calls for eight independent colour ranges across Hue, Saturation and Luminance. The shipped HSL Bands effect edits one band at a time; HSL Mixer provides all 24 keyframeable values in one effect. Its View selector shows eight sliders at once. A circular 360-entry hue lookup blends neighbouring ranges and reduces the effect on low-saturation pixels. All-zero values leave bytes unchanged. It uses the same pixel kernel on clips and adjustment layers and preserves alpha.

Changed: `js/compositor.js`, `js/fx-registry.js`, `js/inspector.js`, `index.html` cache tags, and one `tests/tests.js` regression tagged `TBD`.

Checks run: JavaScriptCore syntax parse, a focused execution of the production kernel confirming neutral identity, independent hue/luminance/saturation controls, preserved grey and alpha, and `git diff --check`. Browser inspector interaction and preview/export visual comparison remain unverified in this sandbox.

This is local and unpushed; the shared Claude checkout and live app are unchanged.
