# #1041 — Keep every nested group's visual treatment

Starting commit: `ac3e436cee856938cab63ac179a8a3e1bcc0b598` (`codex/690-batch3-missing-transform`). Sources checked: exact `REQUESTS.md` #1041 and batch3 `VERIFIED.md` §1 item 2. The matching words in `audits/938-hunt.json` and `audits/939-hunt.json` concern other group/effect findings, not this three-level routing defect.

The compositor used one global deepest-owner lookup for every nesting level. An outer styled group therefore skipped its immediate child group's opacity/effects and could draw the same leaf again. Each unit now maps its members to the nearest child unit in that unit's own ancestry. The outer render dispatch still chooses the shallowest unit. Plain transform-only groups between styled groups remain transparent to that routing.

Changed files: `js/compositor.js`, `index.html` (compositor cache tag 376→377), `tests/tests.js` (one `{ item: 'TBD' }` regression), and this report. The regression checks one through four 50%-opacity levels in both scene orders, expected centre pixels, and exactly one flattened unit per level.

Checks: a focused Node VM check of the production collector passed the four-level immediate-child chain in both scene orders; changed JavaScript syntax and `git diff --check` passed. The rendered-pixel browser regression is **pending** because `.ship-in-progress` exists and the PM prohibits all browser/Chromium runs during a ship. Keep this branch staged until it passes in a ship gap.
