# #1041 — nested styled groups render once per level (v17.23)

Starting commit: `ba154a377cc3d668605fff3eea60d4453f0840bd` (stacked on `ssh/main` `b46b47d385f7189486eba0f8e540a3fbf10dcdd4`). Verified sources: REQUESTS.md #1041 and batch3 VERIFIED.md §1 item 2; no matching `audits/*.json` record. Ported the reviewed compositor fix from `368df604`.

Changed files: `js/compositor.js`, `tests/tests.js`, this report. Each styled group now draws its immediate styled child once, retaining intermediate opacity/effects instead of routing leaves straight to the deepest group. The focused `{ item: '1041' }` pixel test covers one through four nested levels in both scene orders and counts flattened builds. No cache tag was changed.

With the product change reverted, muted Chromium failed 0/1: three half-opacity groups rendered red 80 instead of 32. With the fix restored, the same test passed 1/1 on port 8894 at 5 Oct 18:59 UTC. Node syntax and Git diff checks passed. Local Codex branch only; landing remains with the builder.
