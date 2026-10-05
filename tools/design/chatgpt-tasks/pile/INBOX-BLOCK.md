### 05 Oct 2026 — ChatGPT pile reviewed: land list ready (261 commits on codex/690-reviewed-local)

**His words (verbatim):** "Okay im leaving my laptop now, make sure this gets done properly without needing my input."

**PM's plan (not his words).** Per #1067, the builder lands ChatGPT's verified commits between Simple-mode releases; Simple mode stays first.
Full plan: `tools/design/chatgpt-tasks/pile/LAND-LIST.md` (batches B1–B8, his questions, the drop list, ChatGPT's rules).
Verdicts on the 261 commits: 72 land as-is, 89 land after a fix, 41 wait on his answer, 59 dropped.
The pile does NOT contain the empty-audio export fix (#604/#215). When ChatGPT's fix for it arrives, it lands before B1.

**Do this once, now (after the running ship.sh finishes):** /private/tmp can be wiped, so copy the pile into our repo.
`git fetch /private/tmp/freemotion-reviewed-local-20261005 codex/690-reviewed-local:refs/pile/codex-690`
Then check that `git rev-parse refs/pile/codex-690` is `6ed01d4df0235d8b9f921a783dbe7deb74ff45ae`.
Never write in ChatGPT's clone.

**First batch to land, after the current Simple-mode release: B1, "saving, importing, offline and small app fixes" (14 commits).**
This batch does not touch compositor.js or collab-core and needs no schema bump. Land it before Simple Phase 2, which rewrites history.commit() and FM.replaceMedia.
Apply in this order:
`52843cc2 9cd5923c a4de4183 e808c3c2 b48cb48f f1ac5fa8 e987e4f3 2e5e0cf0 70797f4c 1fdd128b 5e8337da b69c5795 5cf39d11 d662aa35`
Apply each one uncommitted with:
`git show --binary --format= <sha> -- . ':(exclude)outside' ':(exclude)index.html' ':(exclude)tests/tests.js' | git apply -3 --index`
Paste each test into tests.js as a block (never union-merge). Bump each touched file's ?v= once from live.
Fixes required before shipping B1:
- 2e5e0cf0: exportFile must fall back to IndexedDB, or "no longer stored" is sometimes false.
- 70797f4c: buildBackup must cap fonts at _backupEmbedLimit, not Infinity (iPhone memory). Keep #1038 open.
- f1ac5fa8: add a rejecting-fetch test case. Keep #1042 open.
- b69c5795: fix before landing. Do not resync across a split (the song goes silent after the cut). Remap keyframes only on a speed change or a move. Add split, trim and move tests. Bump audio-tools ?v= from live 7.
- d662aa35: leave out the sw.js?v=1 register change (the exclude above already does).
- Every test is tagged item 'TBD'. Log B1 as one hunt-tagged REQUESTS entry and use its number. 9cd5923c+a4de4183 close #1051. They do NOT close #1040.
Tests: the batch's own tests, plus 888, 915, 1051, SW 306/430 and the karaoke tests, at 900 and --width 380. Then ship.sh.
What he sees: honest warnings when a file is missing footage or fonts; broken project files refused cleanly; Remove Vocals stays in sync.

**After B1:**
- B2: keyframed Speed stops jumping. 26 commits; needs v17.23 shipped. Fix Glow Scan's travel branch first.
- B3: preview matches export, plus effect memory. 12 commits; Unsharp Protect colour must default to 0.
- B4 and B5: opt-in controls on existing effects. Before/after sheets.
- B6: 13 new effects, picture sheet.
- B7: 4 sound packs, listening page.
- B8: C31 stills half, squashed, low priority.
Fonts, worker export, shapes and the other new features wait on his answers in LAND-LIST.md §3.
Drop all of T08, T14, T27, T30, T33 and T39, plus the merges. v17.23 or live already has them, or they are only notes.

❓ASK (his questions, recommended answers in LAND-LIST.md §3; none blocks B1–B5):
- Fonts: yes, but keep old titles unchanged.
- ChatGPT's 12 drawn fonts: none until he has seen a sheet.
- Shapes: keep today's.
- Worker export: after #604.
- Colour pack, audio tools, audio effects, Filter layer tile, Overdrive sun, Stripes smoothing, Poster Print.
