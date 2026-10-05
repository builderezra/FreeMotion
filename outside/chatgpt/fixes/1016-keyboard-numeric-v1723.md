# #1016 — keyboard numeric controls (v17.23, gate blocked)

Starting commit: `d8fa4fbbc0ec8a916d4ceecf0cacc18f0342a108` (stacked on `ssh/main` `b46b47d385f7189486eba0f8e540a3fbf10dcdd4`). Verified sources: REQUESTS.md #1016 and batch2 VERIFIED.md §1b.4. Ported the reviewed `837fca68` change, preserving v17.23's `p.min` effect input bound at the one context conflict.

Changed files: `js/inspector.js`, `styles.css`, `tests/tests.js`, this report. Numeric Volume and Position boxes become keyboard reachable, support Enter to edit and arrows to step, and expose their value. Effect inputs receive names. The focused keyboard edit regression is tagged `{ item: '1016' }`. No cache tag was changed.

Gate blocker: two muted Chromium runs on port 8894 with the product edit reverted could not initialise the app frame (`FM` missing core app functions). There is no valid before/after result on this v17.23 branch. Node syntax and Git diff checks passed. Keep this local branch pending a clean focused browser gate; do not land it as verified.
