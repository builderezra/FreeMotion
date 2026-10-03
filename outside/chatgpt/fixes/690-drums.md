# Drums sound category, local continuation

Starting commit: `ccfd69e2fa417341cd33242f41be899dbf6e959c` on local branch `chatgpt/690-continuation`.

`tools/design/plans/2026-09-29-idle-backlog/backlog.md:1204` calls for a Drums category. Added six locally synthesized sounds: Kick, Snare, Clap, Hi-hat, Ba-dum-tss and Drumroll. Reusable kick, snare and hi-hat voices keep the fill sounds consistent with their one-shots. They use the existing deterministic noise, offline render, normalization, preview, WAV and timeline insertion paths; no downloaded sound files or licence assumptions are introduced.

Changed: `js/sfx.js`, its `index.html` cache tag, and one `tests/tests.js` regression tagged `TBD` that renders and checks all six in the browser suite.

Checks run: JavaScriptCore syntax parse, a focused production-recipe scheduling probe with a Web Audio mock (all six definitions and 37 scheduled sources), and `git diff --check`. Actual audio rendering/listening and the browser regression remain unverified in this sandbox.

This is local and unpushed; the shared Claude checkout and live app are unchanged.
