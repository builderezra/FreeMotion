# #1029 — Long Home card names

Starting commit: `7d4e164b1398a7be27e4a781cfbae217a76ace19` (`codex/690-batch2-rotate-studio`). Exact sources: `REQUESTS.md` #1029 and batch2 `VERIFIED.md` §1b item 17. The `audits/*.json` long-name search found no matching finding; the one textual hit in `941-hunt.json` concerns a version-label tooltip. The shared Claude checkout was read only.

The comparison in [1029-options.png](assets/1029-options.png) draws the current one-line card beside a two-line card at a phone-like width. The second exposes more of a long name without moving the thumbnail or actions. The branch uses that option, with the complete name also available in a desktop tooltip. This is a design mockup; exact browser layout must still be checked at 380 and 440 px after the ship lock clears.

Changed files: `styles.css` clamps Home names to two lines and wraps an unbroken word; `js/home.js` gives the project, template, element and draft cards their full-name title; `index.html` advances the changed CSS/Home cache tags; `tests/tests.js` has one `{ item: 'TBD' }` regression for a long phone-width project name; this report and the design comparison were added.

Checks: the focused production-helper/CSS Node check passed; both changed JavaScript files passed syntax checks and `git diff --check` passed. The focused muted Chromium regression later passed (1/1), checking the two-line clamp on a 340 px card and the full-name tooltip. The requested real 380/440 px visual review remains pending; keep it staged until that review. Temporary mute-driver edit was restored.
