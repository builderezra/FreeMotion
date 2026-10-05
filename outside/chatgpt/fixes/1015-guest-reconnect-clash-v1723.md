# #1015 — reconnect edits retain clash checks (v17.23, gate blocked)

Starting commit: `9cec73a1214a48d8180649b5fdc3ad248b3babaf` (stacked on `ssh/main` `b46b47d385f7189486eba0f8e540a3fbf10dcdd4`). Verified sources: REQUESTS.md #1015 and batch2 VERIFIED.md §1b.3. Ported the reviewed `ba6fb835` code onto this base.

Changed files: `js/collab-session.js`, `tests/tests.js`, this report. Reconnect-era guest transactions are queued for host clash checking until catch-up finishes; rejected local echoes are suppressed. The focused edit-and-Undo regression is tagged `{ item: '1015' }`. No cache tag was changed.

Gate blocker: muted Chromium on port 8894 could not consistently initialise the app frame. The reverted run first reported missing `FM` app functions, then reached the test but failed setup with `Cannot set properties of undefined (setting 'innerHTML')`; a fixed-code run again lacked app functions. Those results do not prove the product fix or the test's before/after behavior. Node syntax and Git diff checks passed. Keep this local branch pending a clean focused browser gate; do not land it as verified.
