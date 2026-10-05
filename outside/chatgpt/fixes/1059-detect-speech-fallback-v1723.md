# #1059 — speech detection continues past silent clips (v17.23)

Starting commit: `a22dbc4638d865edc21bd4f03bf2a1dc507e0c3c` (stacked on `ssh/main` `b46b47d385f7189486eba0f8e540a3fbf10dcdd4`). Verified sources: REQUESTS.md #1059 and batch4 VERIFIED.md §1 item 1; no matching `audits/*.json` record. Ported the reviewed `fa323416` fix. The old-chain test fixture called `detectRow` on the detector; this v17.23 test calls the actual `FM.captionsEditor.detectRow` method.

Changed files: `js/captions.js`, `tests/tests.js`, this report. Known-silent sources are skipped, a decode failure no longer aborts later candidates, and selecting a silent source gives a plain explanation. The focused `{ item: '1059' }` regression covers default, project and explicit-source scopes. No cache tag was changed.

With the product change reverted, the corrected muted Chromium test failed 0/1: default scope did not reach the talking clip after silent B-roll. With the fix restored, it passed 1/1 on port 8894 at 5 Oct 19:04 UTC. One initial app-frame setup failure and the old fixture's nonexistent-method failure were resolved before that proof. Node syntax and Git diff checks passed. Local Codex branch only; landing remains with the builder.
