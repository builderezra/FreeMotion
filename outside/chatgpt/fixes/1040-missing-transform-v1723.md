# #1040 — repair imported layers without a transform (v17.23)

Starting commit: `8c813c787db31227e7c99a512de7c52dfb8e6199` (stacked on `ssh/main` `b46b47d385f7189486eba0f8e540a3fbf10dcdd4`). Verified sources: REQUESTS.md #1040 and batch3 VERIFIED.md §1 item 1; no matching `audits/*.json` record. Ported the reviewed sanitizer change from `ac3e436c`. The v17.23 boot path already catches a failed `storage.load()` and opens Home, so no second boot edit was needed.

Changed files: `js/storage.js`, `tests/tests.js`, this report. Shared load/import/history/collaboration sanitization now gives a missing, null, array or non-plain transform the layer type's normal default. The focused `{ item: '1040' }` regression imports missing and null transforms, saves, reopens, and exercises the timeline/render path. No cache tag was changed.

With the product change reverted, the focused muted Chromium test failed 0/1 during the corrupt import (`Cannot set properties of undefined (setting 'innerHTML')`); with the change restored, it passed 1/1 on port 8894 at 5 Oct 18:56 UTC. One initial app-frame setup failure was discarded. Node syntax and Git diff checks passed. Local Codex branch only; landing remains with the builder.
