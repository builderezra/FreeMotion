# #1040 — Repair a missing layer transform before rendering

Starting commit: `ed0a3a3d84c2cde076d9d6131a5e5dc76b71a90d` (`codex/690-batch2-long-names`). Sources checked: exact `REQUESTS.md` #1040 and batch3 `VERIFIED.md` §1 item 1; transform hits in `audits/912-audit.json` and `audits/937-hunt.json` concern other transform defects. The existing boot `load().catch` already opens Home, so it did not need another copy.

`sanitizeUnsafeValues` now replaces a missing, null, array or other non-plain transform with the layer constructor's own default. That sanitizer already runs at project load and on file/template imports, history restore and host validation, so the timeline cannot reach `Object.keys(layer.transform)` with those values. Existing valid transform values are preserved.

Changed files: `js/storage.js`, `index.html` (storage cache tag 71→72), `tests/tests.js` (one `{ item: 'TBD' }` regression), and this report. The regression imports both absent and null transforms, checks the timeline path, then saves and reopens each project.

Checks: a focused production-sanitizer Node VM check passed missing/null/array repair and preservation of a valid transform; changed JavaScript syntax and `git diff --check` passed. The browser import/save/reopen regression is **pending** because the Claude `.ship-in-progress` lock is present. This branch is staged only; do not promote it until the browser check passes in a ship gap.
