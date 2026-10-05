# #1038 — custom font travels with project and template files

- Starting commit: `c956448db433ad57838c58ec9efbda443e4cf469`; branch `codex/690-custom-font-share-coverage` in the existing isolated Codex worktree.
- Source: shared `REQUESTS.md` #1038 and batch2 `VERIFIED.md` §4 item 7. The existing template test checked only an empty fonts map; the prior omitted-font test checked a small font in a serialized project but not the template download/reopen route. Shared audit JSON and local branches/reports had no exact duplicate.
- Changed: `tests/tests.js` only. Existing real font fixture `tests/fixtures/fonts/LiberationSans-Regular.ttf` is reused. No product script changed, so no cache tag changed.
- One focused `{ item: 'TBD' }` regression imports the font, uses it on a text layer, downloads both project and template files, checks each carries the matching font bytes, removes the sender's local font, then reopens the template file and verifies the font record, stored file and text face are restored.
- Checks: focused muted Chromium passed (1/1); JavaScript syntax and diff checks passed. The first browser attempt failed app-frame readiness and was discarded. Temporary mute-driver edit was restored.
- Local only; not promoted, pushed or released.
