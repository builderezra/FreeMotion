# INBOX

Append requests below the divider. The building chat drains it: each entry moves into REQUESTS.md with a
number, then `tools/inbox.sh --done` removes only the lines it was shown, so anything added mid-drain stays.
The divider is the line of three dashes below. Keep that exact line out of this header prose: on 20 Sep
the old drain cut the file at the first three dashes in the header, and the inbox was blind for six days.

WHO WRITES HERE: Ezra from his phone, and the LOGGING CHAT (his arrangement, 26 Sep). The logging chat
writes one block per message he sends it:

    ### <date, time AWST> — <short title>
    **His words (verbatim):** …exactly what he typed, typos and all…
    **Logger's plan (not his words):** a READY-TO-BUILD plan: where in the code, the exact change,
    options already drawn/rendered (and his pick, when he has made it in the logging chat),
    measurements already taken, the test that proves it, and any question left (as a `❓ASK:` line).
    Big plans live in tools/design/plans/ and the block links them.

BUILDER: move the WHOLE block into the REQUESTS.md entry. His words go in as the verbatim quote and get
split into his numbered clauses as usual. The plan goes under them, labelled as the logger's plan.
Follow it; if the tree has moved and a step no longer fits, say so in the entry rather than improvising silently. Design requests still get drawn options before anything ships
(#545), and the queue order is unchanged: log it at the bottom and it waits its turn.

---


### 05 Oct 2026, ~17:16 AWST — ChatGPT pile reviewed: land list ready (261 commits on codex/690-reviewed-local)

**His words (verbatim):** "Okay im leaving my laptop now, make sure this gets done properly without needing my input."

**PM's plan (not his words).** Per #1067, the builder lands ChatGPT's verified commits between Simple-mode releases; Simple mode stays first.
Full plan: `tools/design/chatgpt-tasks/pile/LAND-LIST.md` (batches B1–B8, his questions, the drop list, ChatGPT's rules).
Verdicts on the 261 commits: 72 land as-is, 89 land after a fix, 41 wait on his answer, 59 dropped.
The pile does NOT contain the empty-audio export fix (#604/#215). When ChatGPT's fix for it arrives, it lands before B1.

**Already done by the PM (5 Oct):** the pile is copied into our repo, so /private/tmp being wiped loses nothing. `refs/pile/codex-690-reviewed` = `6ed01d4d` (the reviewed tip, which these batches name) and `refs/pile/codex-690` = ChatGPT's live tip (it keeps adding, linearly on top). Never write in ChatGPT's clone. Refresh with `git fetch /private/tmp/freemotion-reviewed-local-20261005 codex/690-reviewed-local:refs/pile/codex-690`.

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

**Two newer ChatGPT commits beyond the reviewed tip are being verified by the PM now:** `f25e15d3` "Guard empty AAC output before MP4 muxing" (the empty-audio-track export defect; may be his no-sound bug #215/#604/#677) and `3170a94c` "Keep panorama canvas within persisted size limits" (batch-2 §1b.2). If they verify, they land FIRST, before B1. A follow-up block will say.

### 05 Oct 2026, ~17:22 AWST — VERIFIED: ChatGPT's f25e15d3 (#1013, empty-audio export guard) and 3170a94c (#1014, panorama) — land together, between Simple-mode releases, before B1

**PM's note (not his words).** Two independent reviewers per commit (correctness, and his-outcome). Full instructions: `tools/design/chatgpt-tasks/pile/FIRST-TWO.md`. Nothing was run in a browser (your ship was in progress), so it was reasoned from the code plus `git merge-tree`.
- **Both: land-after-fix, in ONE release.** They close your existing #1013 (hunt MEDIUM) and #1014 (hunt HIGH), so retag both tests from `'TBD'` to those numbers and claim `queue 1013` and `queue 1014`.
- **Applying:** only `index.html` conflicts (the pile's own ?v= numbering). Bump from main's values instead: `exporter.js?v=126→127`, and `app.js?v=468→469` once. Use the `git show … | git apply -3 --index` route from the land-list block.
- **f25e15d3 fixes** (do them yourself unless ChatGPT's `fix-for f25e15d3` commit is already on `refs/pile/codex-690`):
  - add the "decoded peak" decode-back line to the export report (AudioDecoder, as `aacPriming` already does), so a non-zero frame count of silence is distinguishable;
  - console.warn and a "late AAC" line if a chunk arrives after the track was dropped;
  - in the test, use `new AudioBuffer(...)` instead of an AudioContext that is never closed, stub the toast, and tighten the positive control to about 15 frames;
  - don't claim the `hasAudio` change as independently proven (the "revert to !!mix" mutation survives).
- **3170a94c fixes:**
  - make its round trip a real reopen (autosave, then `FM.storage.load()`, then assert width, height and transform are unchanged);
  - drop or reword the long-side clause/assertion that claims legacy panoramas are detected.
- **What he will see:** a normal export looks the same, but the report line reads "TRACK WRITTEN · N AAC frames · X KB · Ys · decoded peak P". If his phone's encoder ever produces nothing, the card says "NO SOUND — the audio encoder produced no sound frames" instead of the old false "Sound ✓". **Update #215/#604/#677:** this is a guard plus a diagnostic, not a confirmed cure. His next export report decides it (0 frames = his phone's encoder; more than 0 with a peak above 0 = the loss is after the file, in Photos/sharing). New panorama imports keep their shape on reopen.
- **Order:** his words put Simple mode first. Land this pair in the first gap between Simple-mode releases, before B1.

### 05 Oct 2026, ~19:50 AWST — UPDATE to the 17:22 block: ChatGPT's two fix-for commits arrived and are VERIFIED. Land them, do not redo the fixes

**PM's note (not his words).** `refs/pile/codex-690` is refreshed to ChatGPT's tip `ed27177e`. Both follow-ups the 17:22 block asked for are on it, and they cover every fix listed there. I reviewed them by reading only, since your ship was running: no browser. Every helper the new tests call exists on main (`q915aPng`, `FM.storage.settled`, `sleep`, `FM.storage.removeMedia`, `FM.projects.remove`).
- **The release is now four commits, in this order: `f25e15d3 f3109105 3170a94c 3c712a1d`.** Each one goes through the usual `git show --binary --format= <sha> -- . ':(exclude)outside' ':(exclude)index.html' ':(exclude)tests/tests.js' | git apply -3 --index`. Paste the two tests by hand as blocks, taking each test's FINAL version, the one from the fix-for commit. Retag them `1013` and `1014`. Bump `exporter.js` and `app.js` `?v=` once each from main's values.
- **f3109105** (follows f25e15d3): adds `decodedAACPeak()`, which decodes the kept AAC chunks back and records a `decoded peak` line in the export report. It also adds a console.warn and a `late AAC` line for a chunk that arrives after the track was dropped, and updates only this export's saved report. The test uses `new AudioBuffer`, stubs the toast and console.warn, expects 13–17 frames and a decoded peak of at least 0.1, and fires a late callback.
  - **One optional hardening, not a blocker:** `await dec.flush()` has no timeout. A phone decoder that never settles would hang the export on a diagnostic. `aacPriming()` already runs the same unguarded decode on every export, so the risk is not new, but a `Promise.race` with a ~5 s cap returning null ("unavailable") is cheap.
  - **Correction to the 17:22 block:** the peak is its own report line (`decoded peak 0.4xx`), not appended to the `audio` line.
- **3c712a1d** (follows 3170a94c): the test is now a real reopen. It creates a temporary project, imports, autosaves, waits for `settled()`, runs `FM.storage.load()`, and asserts the width, height and transform JSON are unchanged and the photo is still centred. The false "legacy 8000x1000 is detected" claim and its assertion are gone, and the `app.js` comment is reworded to match. It cleans up by reopening the prior project and removing the temp one.
- **Prove:** the 1013 test must fail with exporter.js reverted to main and the 1014 test with app.js and storage at main. If the 1014 one does not fail (main may already reopen panoramas correctly), it is a regression guard. Write `UNPROVABLE: <why>` for it rather than forcing it.
- **Still unverified, so do not land yet:** ChatGPT's newer `ba6fb835` (reconnect clash), `837fca68` (inspector keyboard), `007e0eeb` (Tab focus) and `ed27177e` (storage diagnosis), plus its staged #1019–#1026 branches. Their browser checks are pending until your ship ends. The PM will verify them and send a block.

### 05 Oct 2026, ~22:28 AWST — Test browsers play sound through his speakers: add --mute-audio

**His words (verbatim):** "Also i think when u do testing you play audio noises but for some reason i hear them out of my speakers which means i have to constantly have my pc muted. I dont mind if theres a genuine need for this and no fix but if theres a way for this to stop playing for me then lmk"

**Logger's plan (not his words).** Headless Chrome still plays sound through the Mac's real output device. `tests/_cdp.py`'s `launch()` has no `--mute-audio`, so every suite and ship pass plays test tones aloud.
- **Change:** add `"--mute-audio",` to the flag list in `tests/_cdp.py` `launch()`, beside the two WebRTC flags, with a one-line comment quoting him. Make it AFTER v17.23 lands, never mid-ship: the 380 pass re-launches `_cdp.py`.
- **Measured by the PM, ~22:25, in a standalone headless Chrome:** with `--mute-audio`, a real-time AudioContext reports `running` and its clock advances 1.13–1.15 s over a 1.2 s wait. An AnalyserNode reads RMS 0.704–0.710 off a unit sine, the correct value of 1/√2. OfflineAudioContext renders a peak of 1.0. That was 4 of 4 muted runs, identical to unmuted. One earlier cold-start run had the clock not yet started, in a fresh profile, unrelated to the flag. So the flag mutes the output and leaves what the tests measure alone.
- **Proof before shipping:** run every audio, sound, export-audio and voice test with `?only=` at 900 and 380, and confirm the same results as without the flag. If any `voice:` test depends on the real output device, that would show here. Bring it in with the next release; it is test-harness only, so log it `UNPROVABLE: harness flag, verified by the audio-test pairing`.
- **ChatGPT has been told** to add the same flag to its own Chrome launches.

### 05 Oct 2026, ~22:40 AWST — Move the work to his more powerful laptop (another time, not tonight)

**His words (verbatim):** "also i have a way more powerful laptop with lots of storage, i just havent been using it coz its impractical to bring around, could have a virus ( my computer nerd friend whos really smart found one on my pc recently and got rid of it, might be worth you having a gander). but if we switch to it we can just remote control from this laptop anyways so it wont lose and practicality. What do you say, worth switching? not tonight ofc but another time"

**Logger's plan (not his words). PM's recommendation: yes, worth it. The machine is today's bottleneck.**
- **Measured on this Mac, 5 Oct:**
  - 6 cores and 8 GB RAM, with swap at 5.4 of 6 GB.
  - 8–9 GB of disk free.
  - A suite pass takes 45 min and a ship ~90.
  - Timing-sensitive collab tests flake under load, and seven v17.23 attempts were refused in one evening.
- **Expected on a stronger machine:**
  - Faster passes.
  - The desktop and 380 passes can run side by side instead of one after the other.
  - ChatGPT's browser checks can run during a ship.
  - No disk squeeze.
- **❓ASK (him, when he next has it out):** the model, or a photo of its About / System Information page. Is it Windows or a Mac?
  - The tooling is bash + python with macOS-isms (`stat -f`, `/Applications/Google Chrome.app`, `DEVELOPER_DIR`, the iCloud inbox path). On a Mac it moves as-is. On Windows it runs under WSL2, after a small porting pass the PM will scope first.
- **Virus first, before anything sensitive goes on it** (his GitHub SSH key, which can push to the live site; his logged-in Claude and ChatGPT accounts):
  - Recommended: reset or reinstall the OS fresh. After a known infection that is the only reliable "clean".
  - If he would rather not: the PM does a check when it is set up (startup items, scheduled tasks, unusual processes and network connections, a full plus offline Defender scan), and says plainly that a check is weaker than a fresh install.
- **Remote control:** keep this Mac as the screen.
  - The work runs on the new machine: the Claude desktop app's Remote Control, or Screen Sharing / Chrome Remote Desktop.
  - The new machine must stay awake and on power. A Mac uses `caffeinate` or the app's keep-awake; Windows uses its power settings.
- **Move order (one evening):** fresh OS → Chrome, git, python, Claude app, Codex app → clone from GitHub (not a copy of this disk) → new SSH key added to GitHub → run one full suite to measure it → switch the loop over → retire this Mac's loop.

### 05 Oct 2026, ~22:50 AWST — UPDATE to the powerful-laptop block: it is Windows; he wants to keep his files

**His words (verbatim):** "its a windows laptop, the only reason i dont want to reset is i have some files and stuff on it i dont want to lose, but surely i can put that on an external storage without worries of virus coming through? well the external storage could be infected to as ive used it lots. may be worth reseting the storage drive first as well, but by plugging it in i could be letting a virus get into it."

**Logger's plan (not his words).** ✅ The OS question in the earlier block is answered: **Windows**, so the tooling runs under WSL2 after a porting pass that the PM scopes before the move. His files survive the reset this way:
1. **Scan before copying.** Run a Microsoft Defender full scan, then a Defender Offline scan. Both are built in.
2. **Copy only personal files** (photos, videos, music, PDFs and documents) onto the external drive. Leave out programs and installers (`.exe .msi .bat .cmd .ps1 .vbs .js .scr .lnk .jar .iso`), macro Office files (`.docm .xlsm`), and zips containing those. Programs get reinstalled from the official sites.
3. **Reset** with "Remove everything" plus "Clean the drive", or use a fresh install from Microsoft's USB tool.
4. **Bring the files back.** After the reset, scan the external drive with Defender before opening anything on it, then copy back. Never run a program from the old drive.

On his drive worry: a file on a USB drive does nothing until it is OPENED or RUN. Windows has not auto-run USB drives since Windows 7, and photos and documents are not programs. The Mac is also a safe place to plug the drive in, because Windows viruses cannot run on macOS.

