# Explosion and Thunder sounds, local continuation

Starting commit: `b72dfd543a94d62f500a7c55817fca6c30873033` on local branch `chatgpt/690-continuation`.

`tools/design/plans/2026-09-29-idle-backlog/backlog.md:1206` asks for Explosion and Thunder with Size, Length and Variation. Added two synthesized sounds to the existing Impact and Nature groups. Each has Small/Big, 0.8–5.0-second length and four variations in the sound picker. The chosen options make a distinct cache key and are captured before preview or Add, so both paths use the same rendered audio. Favourites retain the options when the list redraws; copies in Favourites and their category share the visible values.

Changed: `js/sfx.js`, `styles.css`, `index.html` cache tags, and one focused `tests/tests.js` regression tagged `TBD`.

Checks run: JavaScriptCore syntax parse, a focused production-recipe scheduling probe for two option sets of each sound, and `git diff --check`. Actual listening and the browser regression remain unverified in this sandbox.

This is local and unpushed; the shared Claude checkout and live app are unchanged.
