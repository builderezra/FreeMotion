# #1014 — panorama canvas survives reopen (v17.23)

Starting commit: `2ea47a003a52dc059edfeda7e26b43641e73b79d` (stacked on `ssh/main` `b46b47d385f7189486eba0f8e540a3fbf10dcdd4`). Verified sources: REQUESTS.md #1014 and batch2 VERIFIED.md §1b.2. Ported the reviewed `3170a94c` and `3c712a1d` app changes onto this base.

Changed files: `js/app.js`, `tests/tests.js`, this report. First import now limits both the short and long canvas sides while preserving the photo's aspect ratio. The oversize warning uses the same limits. The focused regression saves each of two panoramic imports, reopens from storage, and checks canvas size, transform and centring. Its tag is `{ item: '1014' }`. No cache tag was changed.

Check: with the product change reverted, the regression failed 0/1 on `16000×4000 made a canvas 8640×2160 that storage will reshape on reopen`. With the fix restored, it passed 1/1 in muted Chromium on port 8894, 5 Oct 18:13 UTC. One initial app-frame setup failure preceded the meaningful reverted run. `node --check` and Git diff checks passed. This is a local Codex branch only; the builder handles landing.
