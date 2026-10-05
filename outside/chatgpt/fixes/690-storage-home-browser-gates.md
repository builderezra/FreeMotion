# #1018 and #1029 — focused browser gates

- Starting commit: `b737427713be508d37c8717c065dd7c816551458`; branch `codex/690-storage-home-gates` in the existing isolated Codex worktree.
- Sources: shared `REQUESTS.md` #1018/#1029, batch2 `VERIFIED.md` §1b items 6/17, and their staged reports. Product fixes and one `{ item: 'TBD' }` regression each already existed; no duplicate implementation was made.
- Changed: the two existing fix reports and this checkpoint report only. No product script, test or cache tag changed.
- Checks: with the ship lock absent, each focused muted Chromium regression passed (1/1). #1018's first app frame lacked `FM.settings`; its retry passed. #1029's test checks a 340 px card; real 380/440 px visual review remains pending. Temporary mute-driver edit was restored; report diff checked.
- Local only; not promoted, pushed or released.
