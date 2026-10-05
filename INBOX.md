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


### 01 Oct 2026, ~18:27 AWST — VERIFIED: ChatGPT batch 1 gives 11 confirmed NEW issues (1 HIGH, 10 LOW), plus one #671 leftover to reopen. Log them as hunt items

**Logger's note (not his words).** The full write-up is `tools/design/chatgpt-tasks/reports/VERIFIED.md`: each item has its current file:line, what the user sees, a fix direction and a test idea. It was checked against the current tree (v17.21; the app code had not changed since ChatGPT's snapshot), against `audits/*.json` and against REQUESTS.md. 11/11 of its claimed defects held up, and 0 were wrong.

**Log each as its own numbered item with a hunt header. Details are in VERIFIED.md §1.x:**
- **(hunt HIGH)** §1.1: a stale second tab (or the browser and the installed app open together) writes its old media over a newer replaced file. The project AND the Media library go back to the old clip, and the new one is lost for good.
- **(hunt LOW)** §1.2: an import that throws leaves an empty "Imported project" behind (the same shape #673 fixed).
- **(hunt LOW)** §1.3: one bad edit from a tampered collaborator half-applies on the host's copy and crashes its receive loop for about 1 s, reverting an honest guest's edit (a sanitiser type check, e.g. `fillGradient` as a string).
- **(hunt LOW)** §1.4: Duplicate reports success even when it could not read a clip.
- **(hunt LOW)** §1.5: a project file that will not open gets overwritten with a blank project on switch-away.
- **(hunt LOW)** §1.6: the boot cleanup deletes the media of an unreadable project.
- **(hunt LOW)** §1.7: opening a pre-v2.25 install with a full disk deletes the only scene.
- **(hunt LOW)** §1.8: no size warning when opening a huge project file.
- **(hunt LOW)** §1.9: group rendering rescans the whole scene once per group, every frame.
- **(hunt LOW)** §1.10: image fills from a previous project stay in memory all session.
- **(hunt LOW)** §1.11: the no-GPU blur fallback allocates two big buffers per call.
- **Reopen as a small item:** #671's export-failure leak. `js/exporter.js` ~1494–1498 closes the VideoFrame only on success. Test: make encode throw on frame 3, then assert every VideoFrame was closed and `encoder.state === 'closed'`.

**Design inputs, NOT work items (pointers only):**
- `effects-pack-VETTED.md`: a shortlist for #966's idle work (upgrades first, then two sheets of six effects, then 10 filters). Every one still needs his picture-pick (#545).
- `sound-effects-VETTED.md`: 79/80 CC0. A 24-sound starter set is his decision, and bundling has to fix the sw.js `?v=` caching first.
- `identity-VETTED.md`: held for launch (BEFORE-PUBLISHING.md alternatives and 4 stale statements).

### 01 Oct 2026, ~20:16 AWST — #980: he asked which questions are left and for Stage 2 to be worked on. The logging chat is writing the Phase 2 build plan

**His words (verbatim):** "what questions do i need to answer for the new simple version to be built? and can you work on stage 2?"

**Logger's note (not his words):**
- He was re-shown the six open decisions:
  - D18, D22, D23 and D24 gate step 1.3 (the cog switch he holds);
  - D3 gates only Phase 3's Create-picker item;
  - D14b gates only Phases 4–5.
- "Stage 2" = DESIGN's Phase 2 (editing, clip after clip). The logging chat is writing `tools/design/plans/simple-mode/BUILD-PLAN-PHASE2.md`, rehearsed on a scratch copy on top of Phase 1, then reviewed. A PLAN READY block follows.
- **Observation:** Phase 1 has not started in the app. There is no `js/spine.js`, no FU tooling, and HEAD is v17.21. That is expected under oldest-first, because #980 sits far down the queue. He has been told it waits its turn unless he says to jump it.

### 01 Oct 2026, ~20:18 AWST — VERIFIED: ChatGPT batch 2 gives 19 confirmed new issues, including the likely cause of his NO-SOUND exports (#215/#604/#677). Log them as hunt items

**Logger's note (not his words).** The full write-up is `tools/design/chatgpt-tasks/reports/batch2/VERIFIED.md`: every item has its current file:line, what the user sees, a fix direction and a test idea. There were 47 verdicts: 21 confirmed new (19 distinct), 16 already known, 4 wrong, 6 unverifiable. As in batch 1, its citations are reliable and its severity is not. **The most important finding came from the checkers, not from ChatGPT.**

**Top of the list. Read §1a in full before touching export:**
- **(hunt MEDIUM; attach to #215/#604/#677)** §1a.1: the MP4 export can ship an EMPTY audio track while the export report says "TRACK WRITTEN" and the ready card says "Sound ✓":
  - `js/exporter.js` ~1352–1366: `audioChunks = []`, and only a throw nulls `mix`.
  - ~1372–1378 and ~1536: the muxer declares the audio track whenever `mix` is set, and `if (audioChunks)` is true for an empty array.
  - ~1580: the report line.
  - ~1620: the card's `hasAudio: !!mix`.
  - `vendor/mp4-muxer.js` writes a declared track even with 0 samples.
  - The audio-only M4A path already refuses this (~1114, `no-chunks`).
  - **Every witness the parked entries rely on (TRACK WRITTEN, the mix peak, dropped=no) is measured BEFORE the encode**, and no one has ever counted the iPhone Safari 26 encoder's output. That is the one path matching his "locked on mute" words.
  - **Fix first, before asking him anything:** count the encoded audio chunks and bytes. If there are 0, don't declare the track, and say so honestly ("Sound couldn't be encoded on this device"). Put the real count in the report.
  - Test: stub a silent encoder. The report and card must say no sound, and the muxer gets no audio track. It fails on HEAD.
  - Then his next export report tells whether the loss is in the encoder or in the Photos import. Update the asks on #215/#604/#677 accordingly.
- **(hunt HIGH)** §1b.2: a panorama photo import makes a canvas that changes shape on reopen. `js/app.js` ~3020–3026 caps only the short side, while `js/storage.js` ~1004–1010 caps each side at 7680.
- **(hunt MEDIUM)** §1b.3: a guest's offline edits skip the clash check if they edit again before the host's catch-up reply, and silently overwrite the owner's newer change (`js/collab-session.js` ~287, ~1219, ~350). Reproduced with the real collab code.
- **(hunt MEDIUM)** §1b.4: Volume and Position/Scale/Size/Skew values can't be reached or typed from a keyboard (`js/inspector.js` ~4384–4387, ~4540).

**The rest:** §1b items 5–21, 16 LOW items (accessibility, collab caps, the persist result discarded, GIF never offered the share sheet, one smooth scroll ignoring reduced motion). Log each as hunt LOW, **except #18 (Home search target sizes), which is a taste call: do not queue it unasked.** #17 (long project names) is visual: draw options first.

**Test gaps** (§4, `test-gaps-VETTED.md`): items 2–7 are worth adding as hunt LOW test items. A device-only checklist is listed separately.

**Templates** (§5, `templates-pack-VETTED.md`): 20 recipes are corrected, and the top 6 are to render for his pick (#545). There are decisions for him (how a pack ships; four name clashes). NOT work until he picks.

### 01 Oct 2026, ~21:19 AWST — VERIFIED: ChatGPT batch 3 (12 reports) gives 18 confirmed new issues (2 MEDIUM, 16 LOW). Log them as hunt items

**Logger's note (not his words).** The full write-up is `tools/design/chatgpt-tasks/reports/batch3/VERIFIED.md` §1, items 1–18, each with its current file:line, what the user sees, a fix direction and a test idea. There were 99 verdicts: 45 "confirmed" (mostly correct-behaviour notes), 15 known, 33 wrong, 6 unverifiable. After de-duplicating across reports and against batches 1–2, 18 real issues remain. Four of them were found by the verifiers, not ChatGPT. **ChatGPT's hit rate fell to about 33% this batch, so the verification step is essential.**

Log each as its own item, with the tier given in its heading:
1. **(hunt MEDIUM)** A layer with no `transform` gets through import, breaks the timeline, and after a save makes every launch fail before Home (`js/scene.js` ~562, `js/app.js` ~6847, `js/storage.js` ~1638–1650). Confirmed in a browser up to the load failing.
2. **(hunt MEDIUM)** Three or more nested styled groups draw the wrong picture (the inside comes out too bright and is drawn twice), and the work doubles per level, in both preview and export (`js/compositor.js` ~18402–18408, ~18467).
3–16. **(hunt LOW)**:
   - embedded-font import can lose a font for good;
   - a multi-file pick takes one undo step per file;
   - download filenames drop non-ASCII ("Café" → "Caf");
   - a preset on a full phone says "saved" when nothing was saved;
   - an AI Director delete takes 2+ undos;
   - Mask-first in the Effects sheet makes 2 undo steps;
   - a long unbroken text run freezes the page (quadratic wrap);
   - the boot sweep and delete still fail open on some unreadable indexes and checkpoint reads;
   - recent colours are overwritten across windows;
   - a plain-value `"project"` passes the import gate;
   - two more "false is truthy" sanitiser reads;
   - numeric strings are handled inconsistently across sanitisers;
   - the ? shortcut sheet has gaps (1–5 condition, 1–9 card keys, Ctrl+Y, Backspace);
   - Pixelate's Block aspect and Edges do nothing on an adjustment layer.
17. **(hunt LOW, needs HIS OK first: it changes how existing projects look)** Mosaic's Average mode gives cutout edges a dark fringe. Do not change it unasked.
18. **(hunt LOW, device run first)** Stills are decoded and kept at full resolution with no preview proxy. Measure on a phone before changing anything.

**Design input:** `effect-upgrade-specs-VETTED.md`, the six effect-upgrade specs, corrected (none was buildable as written). They are for #966's idle work, after a before/after picture for him.

### 01 Oct 2026, ~22:18 AWST — VERIFIED: ChatGPT batch 4 gives 4 confirmed new issues + 2 found by the checkers. Log them as hunt items

**Logger's note (not his words).** The full write-up is `tools/design/chatgpt-tasks/reports/batch4/VERIFIED.md`. There were 45 verdicts: 4 new, 26 known, 12 wrong, 3 unverifiable. (Its F6 is batch 3 item 7, already in the block above, so don't log it twice.) **None of these explain the open no-sound, audio-cutting-out, lag or caption-drift bugs.**
1. **(hunt MEDIUM)** Detect speech fails on a silent first clip. It gives up with "Speech detection failed" and never tries the clip with talking in it, and this happens on the default scope too (`js/captions.js` ~522, ~527–533, ~573). Fix: skip clips with no sound, and carry on.
2. **(hunt LOW, but tell him: it affects his OTHER app)** FreeMotion and Listing Kit share the origin `builderezra.github.io`. Each one's service worker deletes the other's offline cache (`sw.js` ~47), and FreeMotion's version chip also switches off Listing Kit's offline copy (`index.html` ~1255–1256). The next launch with no signal shows a browser error. Fix: scope cache names and cleanup to this app's own prefix and path. (Batch 1 noted the same shared origin for localStorage, including the AI key.)
3. **(hunt LOW)** A sharp drop on a hold speed key (10x or more down to 1x) shifts the footage after it by a frame or more, and splitting the clip changes how much (`js/scene.js` ~956–961).
4. **(hunt LOW)** Motion Blur (Footage) in the Pixel Motion style is slightly softer in the preview than in the export: 480 px vs 720 px (`js/compositor.js` ~13354). Measured at about 1.4% of pixels more than 8 levels apart.
5. **(hunt LOW, found by the checkers)** The rotate-handle drag jumps the rotation by 360° when it crosses the left of the pivot (`js/canvas-edit.js` ~682).
6. **(hunt LOW, tooling)** ship.sh's cache-buster gate doesn't cover vendor files, icons, the manifest, the wordmark or the effect thumbnails.

**Yield is falling:** 4 new from 45 rows, against 18 from 99 in batch 3 and 19 from 47 in batch 2. The checkers recommend narrowing, then stopping. He has been given one big day-long job instead (a per-file mechanical audit, an architecture map and a user guide). Its results will come through the logging chat.

### 02 Oct 2026, ~07:01 AWST — PLAN READY (for AFTER Phase 1): Simple Phase 2 (#980), plus four fixes to apply to Phase 1's BUILD-PLAN.md

**Logger's plan (not his words).** `tools/design/plans/simple-mode/BUILD-PLAN-PHASE2.md` is 3,997 lines plus a §14 Review ("ready after fixes" for 2.1 and 2.2).
- **Phase 2 ships as releases 2.1–2.6**, each logged `queue 980 (partial)` and shipped alone, ONLY after Phase 1 has shipped.
  - **2.1** is the engine and keys: `js/spine-edit.js` plus 34 hunks. It covers the runner, the D14 live gate, adoption, D5–D8, D17 B, delete, trims, split, close gap and duplicate.
  - **2.2** is the tools: `js/simple-tools.js` plus 19 hunks. It covers the D10 tray, the Clips · Text · Sound · Overlay row, and D20 A inside the left band on PC.
  - **2.3–2.6** are specified with anchors only. Their code is not written.
- **Rehearsal:** done on a scratch copy of HEAD 28104a3e, re-applied from the plan text alone, giving a byte-identical tree.
  - All 42 Simple tests pass at 1280 and 380.
  - Each release's new tests fail before it (0/14, 0/9).
  - The G1–G4 mutations prove Full is unaffected where 2.1 and 2.2 touch shared code.
  - 2.1 turns two existing tests red (`921 S2` and `921 S0`). Test edits 2.1.T3/T4 are in the plan, NOT re-run, because the Mac was at load 25–65.
  - NOT run: the whole suite at 380, ship.sh/prove.sh, Safari or his iPhone.
- **Apply these to BUILD-PLAN.md (Phase 1) when you build it** (found by the Phase 2 rehearsal; the plan's "Fixes to BUILD-PLAN.md" section has them):
  - the 1.3.6 anchor is `app.js?v=468`;
  - `SCHEMA_FP` measured on v17.21 plus Phase 1 is `1486177182544587` (re-measure at build);
  - T8 must not compare the selection the test itself changes;
  - Open in Full uses `FM.editor.request`.
- **One line he may want to know** (not asked yet): in a project not yet edited in Simple, the first Delete cuts a long Full-made song at the deleted clip, per DESIGN's rule. Under his D17 B ("music never trimmed") he might read that as a trim. Leaving the song whole is a one-line change.

### 02 Oct 2026, ~09:31 AWST — Remove the ? (keyboard shortcuts) help button from mobile

**His words (verbatim):** "quickly log that the question mark help button can be removed from mobile versions"

**Logger's plan (not his words):**
- Mobile's own ? button is `#m-help` (`index.html` ~366, `.m-tbtn`), in the phone top bar, order ver · ? · notes · cog · Export per queue #171. PC's ? is a SEPARATE element, `#btn-help` (~286), which rides the `t-far` row built in `js/app.js` ~7737 — **PC keeps it; his words say "from mobile versions" only.**
- `js/app.js` ~6965 binds the shortcuts-sheet opener to `#btn-help, #m-help` together, and `js/shortcuts.js` ~152/172 look for both ids (phone checks `m-help` first). Removing `#m-help` is safe: both call sites already use a selector list, not a single required id.
- Build: delete the `#m-help` button from `index.html`'s phone top bar (~360–367, including its comment block) and its `.m-tbtn` sizing if nothing else uses that class (grep first — Settings/other mobile toolbars may share `.m-tbtn`). Leave `#btn-help` and all PC code untouched. Check the phone top bar's remaining spacing (ver · notes · cog · Export) still looks balanced — screenshot at 380/440 before shipping.
- ❓ASK (optional, recommended: no): does the shortcuts sheet itself still need a way in on mobile (e.g. from Settings), or is it fine for phone users to simply not have one? Build the removal either way; only add a Settings entry point if he says yes.
- Test: at phone width, `#m-help` is not in the DOM (or is hidden) and the top bar's remaining buttons keep their order. At PC width, `#btn-help` is unchanged. Fails on HEAD.

### 05 Oct 2026, ~15:56 AWST — GO: build Simple mode (#980) now, then the confirmed bug backlog in order, then a first-party deep audit. His remaining 6 decisions answered as RECOMMENDED

**His words (verbatim):** "lets use it to finish simple mode then the rest in order. Let me know how i can make sure that the cloud ussage is actually being used for this, and do i have to run out of usage first? Do i need to start a new cloud chat? Should i switch to the most powerful model? Tell me what to do step by step from here to get what i want" (said after: "Okay so ive been working with chatgpt for this past few days and got a lot done. I also just got $250 worth of claude cloude ussage for free and my limit for you resets in a few hours so we can start work again instead of on chatgpt... lets use it to finish simple mode then the rest in order.")

**Logger's plan (not his words). This is a GO, not just a log — treat it as the order to work in:**
1. **#980 Simple mode, Phase 1 then Phase 2, oldest-first inside the feature:** `tools/design/plans/simple-mode/BUILD-PLAN.md` (Phase 1) then `BUILD-PLAN-PHASE2.md` (Phase 2, already written and rehearsed). Follow the "PLAN READY" blocks already in this file's history for both.
2. **Then the confirmed ChatGPT bug backlog, in the order it was logged** (batches 1–4, all in `tools/design/chatgpt-tasks/reports/`): the export-audio empty-track fix first (it may explain #215/#604/#677), then the rest oldest-batch-first. These are separate, already-diagnosed items — log each with its own number via the usual process if not already numbered, and work them oldest-first alongside whatever else is open, per standing rule.
3. **Then a first-party deep audit**, done by the builder/a workflow directly (not ChatGPT): the same shape as ChatGPT's "big day job" (a per-file mechanical pass, an architecture map, a user guide) but held to this project's own proof standard (prove.sh-style: every finding checked against the real code before it's logged).

**His remaining 6 Simple-mode decisions are answered as RECOMMENDED**, since he is now commissioning full execution (he did not type the words "do recommended" this message, so say so plainly if he ever corrects one):
- **D3** (A): a new project opens in whichever editor this device last used; New project's own dialog is unchanged.
- **D14b** (A): moving clips live while a friend edits waits (held); Full stays untouched meanwhile.
- **D18** (A): Simple's phone play bar is ⋯ · ✂ · (gap) · |◀, with |◀ in Full's own spot.
- **D22** (A): no Settings row; the cog is the only door to the switch.
- **D23** (A): the cog closes after a switch.
- **D24** (B): on a short/sideways phone, the switch sits on the cog's own row; Canvas and Friends are unaffected.
- **Also recommended (Phase 2 review's open note):** the first Delete in an old project leaves a Full-made song whole rather than cutting it, matching his D17 B "music never trimmed" reading.

Record each with "ANSWERED BY EZRA (recommended, via the logging chat) 5 Oct" and his exact words above as the source, then let step 1.3 and Phase 2 proceed.

**On his usage questions** (read `mcp__ccd_session_mgmt__get_usage` for the real numbers — this is NOT something to guess at): his account is Max plan; weekly all-models usage was at 96% with the week resetting within minutes of this message; 5-hour usage was barely touched. `extraUsage.enabled` was **false** — that is almost certainly the "$250 cloud usage": a pay-as-you-go/overage pool that only draws down once the included weekly/5-hour usage is exhausted, and it has to be switched ON by him in his account's billing/usage settings (not exposed to any tool here) before it does anything. He does NOT need a separate "cloud chat" for it — it is account-wide, not tied to where a session runs. Recommended once it's on: run the builder chat on the most capable model (`claude-opus-5-5`) for this push, since token cost is explicitly not the constraint this month.

### 05 Oct 2026, ~16:11 AWST — HANDOFF TO THE BUILDER (read this block FIRST): sync with live, then build Simple mode; ChatGPT's pile is off-limits; only you push

**His words (verbatim):** "my usage reset but actually i dont wanna use this chat to build the other thing i want to use the other chat and leave this one for logging . so give a handoff for the other chat but also chatgpt is still working rn so will it cause issues?" — then: "i want you to projact manage this for a while - you can take control of my computer and make sure my chatgpt and other claude chat are working at the same time and getting good stuff done. Lmk if there's any issues with this or if theres no point"

**Logger's plan (not his words). The logging chat is now also PROJECT MANAGER (his ask): it watches you and ChatGPT, keeps you in separate lanes, verifies ChatGPT's work, and feeds you through this file.**

**STEP 0 — your folder is BEHIND the live app. Do this before ANY ship (measured 5 Oct):**
- Live `ssh/main` = `f7716576` **v17.22 "Home layout from the approved reference"** — pushed by ChatGPT (he approved the look). Your HEAD is still `28104a3e` (v17.21).
- Your uncommitted work is ALSO labelled **v17.22** (POLISH-LOG: "v17.22 — queue 482 (partial) … the sixth polish batch … Vignette Roundness …"; files: `js/compositor.js` +529, `fx-registry.js`, `fx-thumbs.js`, `inspector.js`, `collab-core.js`, `index.html`, `tests/tests.js`, POLISH-LOG.md, REQUESTS.md). **That is a version collision with live.**
- `tools/ship.sh` does NOT check whether you are behind `ssh/main` — it would run the ~90-minute suite and then fail at the push. So: commit your in-progress work to a branch (e.g. `wip/482-batch6`) — **no `git stash`, no `git clean`** — then bring in live (`git pull --rebase ssh main` or merge f7716576), resolve `index.html` (version label + `?v=` busters), POLISH-LOG.md and REQUESTS.md, and renumber your polish batch to **v17.23**. Confirm `git merge-base --is-ancestor f7716576 HEAD` before shipping.
- The logging chat's own files in the dirty tree are plan docs, safe to commit as-is: `INBOX.md` (drain it as usual), `tools/design/plans/**`, `tools/design/chatgpt-tasks/**`.
- **(hunt MEDIUM, tooling — his "safeguards must be structural" rule)** add a gate to `tools/ship.sh`: `git fetch ssh` first and REFUSE before the suite starts if `ssh/main` is not an ancestor of HEAD ("live has moved on: pull first"). This exact trap exists today.

**STEP 1 — finish/ship your batch-6 polish (#482) on top of live, as v17.23,** so nothing of yours is left hanging.

**STEP 2 — #980 Simple mode, his explicit queue jump** ("lets use it to finish simple mode then the rest in order"):
- `tools/design/plans/simple-mode/BUILD-PLAN.md` (Phase 1: the FU "Full unchanged" gate first, then step 1.2 the engine, then step 1.3 the cog switch) with the 4 fixes listed in the Phase 2 plan's "Fixes to BUILD-PLAN.md", then `BUILD-PLAN-PHASE2.md` (2.1, 2.2 written in full; 2.3–2.6 anchors).
- `DESIGN.md` §0.4 is the contract: the ORIGINAL editor must not change in design or function. §17 has every decision answered (the "GO" block above records the last six as recommended).
- Plans were anchored at v17.21: re-anchor on the quoted text against v17.22 + your v17.23.
- Each release logged `queue 980 (partial)` and shipped alone. Show him pictures (the cog block, the D16 icons) before step 1.3 ships.

**STEP 3 — then the rest in order** (the verified ChatGPT batch 1–4 findings logged above as hunt items, the mobile ? button, etc.), oldest-first as usual.

**ChatGPT — what it is doing, and the rules (measured 5 Oct):**
- It works ONLY in its own clones under `/private/tmp/freemotion-*`, on a linear series of ~260 local commits on top of live v17.22 (branches `codex/690-*`, tip `codex/690-reviewed-local`): keyed-effect fixes in Time Warp Scan / Frame Stutter, an open-font catalogue (fonts/open/*, OFL), shape fixes. ~405 files, +29k lines. **None of it is pushed or verified.**
- **Do NOT merge, cherry-pick, pull or rebase onto any `codex/*` or `chatgpt/*` branch.** The logging chat is verifying that pile in batches and will hand you verified, ordered cherry-pick lists here, to integrate between Simple-mode releases.
- **You are the ONLY one who pushes to the live app.** ChatGPT is being told not to push. If live moves anyway, STEP 0's gate catches it.
- Lanes: ChatGPT stays in effects/compositor/fonts; Simple mode is yours. If ChatGPT's pile touches a file you are editing for Simple mode, the logging chat flags it before handing it over.
- CPU: one Mac. Don't run ship.sh while the load is high; the logging chat holds ChatGPT back during your ship runs (it watches `.ship-in-progress`).

**Usage:** you're on `claude-opus-5-5` at xhigh. He has a fresh Max week plus $250 of free cloud credits (he believes they need no switch); `mcp__ccd_session_mgmt__get_usage` shows the plan windows.
