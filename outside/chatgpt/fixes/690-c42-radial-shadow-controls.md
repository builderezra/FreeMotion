# C42: Radial Shadow quality and opacity

Starting commit: clean `ad9bf79d5a51cef0f54e44d1635603d16a3fb528` on fresh isolated branch `codex/690-c42-radial-shadow`. Verified #690's standing polish brief in `REQUESTS.md:27375-27399`, C42 in the design backlog, and the `audits/*.json` inventory; there is no separate Radial Shadow audit record.

Radial Shadow now offers Quality (4–32 taps, default 10) and Opacity (0–100%). The old kernel's fixed 10 taps and 200/255 alpha ceiling remain exact for previously saved instances whose new controls are absent. New instances start at ten taps and 100% opacity, so they can produce a fully opaque shadow; increasing Quality fills the former fixed sample spacing. Zero Opacity paints nothing.

Changed files: `js/compositor.js`, `index.html` (compositor cache tag 290→291), `tests/tests.js` (one focused `{ item: 'TBD' }` regression), and this report.

Checks: the new focused browser regression passed 1/1 after a transient incomplete app-frame boot and one retry. It covers saved-instance byte identity, full-opacity output, changed 32-tap sampling and zero opacity. JavaScriptCore syntax and diff checks passed. No shared Claude/protected-file edit, push, PR, deployment or release.

Integrated as `0876018f` on the reviewed local branch. Its tree is byte-identical to the checked isolated commit; the integrated diff check passed.
