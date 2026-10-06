# Rules audit: what is slowing FreeMotion down (6 Oct)

## 1. For Ezra

- **How ships get started. The builder fixes this; nothing needed from you.** Four of the written instructions (CLAUDE.md, LOOP.md, tick.sh and the top of REQUESTS.md) still describe the old 4-to-8-minute ship. A ship now takes about 90 minutes or more, so a session that follows them gets its ship killed at 10 minutes. That happened on 5 Oct. The working method is only in a memory note. The fix is one small launcher script and one two-line rule in every place. "Shipped" will mean the ship's own log says it pushed. "The commit is on GitHub" is not proof, because that is also true when a ship refused.
- **The builder sits idle while a ship runs. The builder fixes this.** The written rule says "don't touch the code during a ship". With 90-minute ships that means an hour and a half of doing nothing (5 Oct, your "wtf bruh"). The fix: before each ship, the builder opens a separate copy of the code for the next item and works there. It merges that work back only after the ship has landed. The protection stays the same.
- **YOUR DECISION: when ChatGPT's fixes land.** You said "finish simple mode then the rest in order". The PM read that as "land ChatGPT's fixes between Simple steps". As things stand, the ship script will refuse every landing while Simple mode is still open. Its error message also suggests a workaround that would quietly drop Simple mode out of the queue. **Should ChatGPT's checked fixes land between Simple releases, or only after Simple mode is finished?** The builder fixes the misleading error message now either way. The rest waits for your answer.
- **YOUR HANDS, about 30 seconds: Spotlight.** The Mac's search indexing has overloaded the machine during ships (a stalled ship on 21 Sep, and load 15 on 5 Oct). Nobody needs search inside these folders. Go to System Settings → Spotlight → Search Privacy and add `~/Claude/FreeMotion`, `~/.codex` and `~/Library/Application Support/Claude`. You can undo it any time. It is not proven to stop every spike, but it is cheap. The builder will also make the ship wait for the machine to calm down before the phone-size test run.
- **YOUR DECISION: the unblock list.** Its link has been dead since 21 Sep, but it is still the first thing at the top of REQUESTS.md. **Publish it again at a new private link: yes or no?** If yes, the builder publishes the existing page. If no, the builder removes it and the rules about it.
- **NEEDS YOUR YES: your global notes file.** `~/.claude/CLAUDE.md` says "nothing leaves the device". That is false for FreeMotion: Work-with-friends sends data through public relays, so that code needs the security review. The same file also lists folders that have moved (`~/Buckets` is now `~/Claude/Buckets`, for example). And an old copy of FreeMotion in `~/Claude/Slot game/FreeMotion` could get edited by mistake. Say yes and a session will fix it.

## 2. Changes, by who makes them

### Changes the PM can make now

1. **`tools/design/pm/PM-STATE.md:12` (the ChatGPT row in the lane table).** Replace it with:
   > ChatGPT | `~/.codex/worktrees/freemotion-codex-recovery/FreeMotion` (a git worktree of THIS repo; its codex/* and chatgpt/* branches are already in refs/heads) | VERIFIED bug lists + fix-fors the PM names. C31, fonts, shapes and new effects are parked on Ezra's LAND-LIST §3 answers. Tests tagged with the real REQUESTS number. Never `git stash`. Never pushes.

   Add underneath: *"PM and builder cleanup only ever touches worktrees under `.claude/worktrees`, and never deletes `refs/heads/codex/*` or `chatgpt/*`."*
2. **`PM-STATE.md` tick step 4.** Replace the browser rule and the load line with the text below. Leave the dated log line at :59 as it is.
   > **No browser during a ship** from ChatGPT or the PM while `.ship-in-progress` exists. The reason is the 8 GB of memory (swap 5.6/6 GB, two Jetsam kills, the 23:46 reboot) and the 20/26 Sep contention reds. It is NOT the 19:35 coincidence: attempt 4 went red with zero ChatGPT Chromes.
   > **After a ship lands, one heavy job at a time:** ChatGPT's gate batch (one muted Chrome), PM cleanup or backup, a builder Workflow or fan-out (at most 2 agents), or the PM's 380px review, which checks the lock first. Light work (coding, reading, git) never waits.
   > Count test Chromes with `pgrep -f fm-cdp- | wc -l`. The old `port=88..` grep cannot see them.
   > If load is above 12 during a ship, record `ps -Ao pcpu,comm | sort -rn | head -3`. If Spotlight still shows up after Ezra's exclusion, tell him once.
   > If a ship goes red, the builder runs the red test alone (on the tree and on HEAD) and reads its state dump before blaming load or the environment.
3. **`tools/design/chatgpt-tasks/pile/LAND-LIST.md:35-38`.** Replace the `/private/tmp/...` fetch line with: *"The branches are already in this repo: `git log main..codex/<branch>`."* In **§5 A (~:253)**, replace the two-full-suites rule with: *"Focused tests only, each shown failing with the fix reverted; never a full suite. The builder's landing ship is the full-suite gate."*
4. **Append to `INBOX.md` for the builder:**
   > PM → builder (6 Oct): (1) #1065: JUMPED. Already built by ChatGPT as 57a745ea. Land it after its browser check and 380px check; do not rebuild it. (2) #1068's fetch line points at /private/tmp, which the reboot emptied. The branches are already in refs/heads/codex/*. (3) Before each land ship, run ChatGPT's still-pending focused tests as one `?only=` slice.
5. **Save the two bundles before the next reboot wipes them:** `mkdir -p ~/FreeMotion-backups && mv /private/tmp/freemotion-2026-10-05-*.bundle ~/FreeMotion-backups/`
6. **Memory `chatgpt-prompts-one-block.md:11`.** Replace the clone clause with:
   > ChatGPT works only in ~/.codex/worktrees (a git worktree of the main repo, reused across tasks via `git switch -c chatgpt/<task>`). No new clone directories, never /private/tmp, NEVER `git stash` (refs/stash is shared with the builder's checkout), no `git worktree prune/gc`, no ref moves outside chatgpt/* and codex/*, nothing pushed, report at outside/chatgpt/<task>.md.

   In **`chatgpt-codex-interlude-shipped-nothing.md`**: keep "check 'ChatGPT broke X' before agreeing" (shown right again on 5 Oct). Delete "nothing to pick up / do not go looking for half-finished Codex work", because LAND-LIST.md holds the pile. Delete the dead `[[freemotion-request-queue-system]]` link.
7. **When Ezra is back**, ask him once, one line each: the landing-order question, the unblock-list yes/no, and the yes for his global CLAUDE.md.

### Changes for the builder

**B1. Ship launch (the highest cost).**
- **New tracked file `tools/ship-bg.sh`.** It refuses if a ship is already running, meaning `.ship-in-progress` exists and the pid inside it is alive. Otherwise it runs `mkdir -p .claude/ship` and then:
  `nohup bash -c 'tools/ship.sh -F .claude/ship/msg.txt > .claude/ship/ship.log 2>&1; echo "SHIP EXIT $?" >> .claude/ship/ship.log' </dev/null >/dev/null 2>&1 & disown`
  It then prints `LAUNCHED - NOT shipped yet; success is only "pushed and verified" in .claude/ship/ship.log` and exits **3**. It must never exit 0, which would repeat the 20 Sep "refusal read as exit 0" failure. Do not use `setsid`, which does not exist on this Mac. `.claude/` is already gitignored, so `git add -A` cannot sweep in the log or the message file.
- **`tools/ship.sh`:**
  - **Before `trap _verdict EXIT INT TERM` (line 40):** if `.ship-in-progress` holds a live pid, refuse with "a ship is already running". If it holds a dead pid, print "previous ship was KILLED" and continue.
  - **After the trap:** write `RUNNING <pid> <version> <epoch>` to `.last-ship`.
  - Make `.ship-in-progress` contain `pid=<n> phase=<prove|desktop|phone|push> since=<epoch>`, and update the phase as the ship moves on.
- **Put the same two-line rule in all five places:** `CLAUDE.md:223-255` (replace the whole section), `LOOP.md` rule 6 (lines 23-30), `tools/tick.sh:104`, `REQUESTS.md:53-62` (the block that says `/tmp/ship.log`, "~8 minutes" and "HEAD == ssh/main"), and memory `suite-needs-long-timeout.md` (delete its `run_in_background` lines at :22 and :27, and make its description point at `tools/.suite-seconds` instead of "~35 min"):
  > **Ships:** write the message to `.claude/ship/msg.txt`, run `tools/ship-bg.sh` (exit 3 means launched, NOT shipped), then Monitor `.claude/ship/ship.log` until `SHIP EXIT` appears or `kill -0` on the pid in `.ship-in-progress` fails. **Shipped** = the log says `pushed and verified` AND `.last-ship` is `PUSHED <hash>` with hash == `git rev-parse --short HEAD`. HEAD == ssh/main alone proves nothing. `RUNNING` with no live pid means a KILLED ship: re-ship it.
  > **Suites:** a full suite may use `run_in_background` with timeout = 1.6 × `tools/.suite-seconds` × 1000 (at most 7200000). Only `?only=` slices run in the foreground (timeout ≤ 600000). Never write minutes into prose.
- `tick.sh`'s `.last-ship` case gains a RUNNING branch and a KILLED branch.

**B2. Build during ships (LOOP.md rule 15, ~108-127).** Replace the rule with:
> While ship.sh runs, do not touch THIS tree: the phone pass reloads from disk, and `git add -A` commits whatever is here at the end. Instead, BEFORE starting the ship, create one worktree under `.claude/worktrees/` for the next-oldest item and write code there while the ship runs. Mid-ship, reuse an existing worktree (`git switch -c <branch> <base>`) instead of adding a new one. Code only: no suite, no browser, no Workflow or agents. Merge it into this tree as UNCOMMITTED changes (so prove.sh runs) only when `.ship-in-progress` is gone, no ship.sh is alive, and the ship's log shows `pushed and verified`. If the ship REFUSED, keep the worktree separate until the re-ship lands.

Also:
- Replace the "~946 tests / ~9 minutes" sums with "lengths: `tools/.suite-seconds`".
- Change the IN FLIGHT banner in `tick.sh` to *"…do not edit THIS tree; keep building in your worktree (created before the ship)"*.
- Rewrite memory **`build-while-ship-runs.md:10`** as:
  > Prefer creating the next worktree before the ship starts. Mid-ship, reuse an existing one (`git switch -c`). Whether creating a worktree triggers Spotlight is unproven (5 Oct). If load passes 10 during a phone pass, check `ps -axo pcpu,command | grep -E "[m]ds|[m]dworker"` before blaming anything.

  Drop the "235 worktrees / 15 GB" claim and the garbled "How to apply". Keep the "merge back as UNCOMMITTED" point.
- Never put a worktree in a new top-level folder, because `git add -A` would sweep it into a release.

**B3. The queue gate, before the first land ship (`land-1013` is ready now).** Edit the refusal text in `tools/ship.sh` (~360-399) to add: *"Never JUMP an item in his own words (e.g. #980) just to get a land release through. Ask him."*

After Ezra answers, and only if he says "between":
- Exempt a closed item whose own entry carries a `JUMPED:` line that is already in HEAD's REQUESTS.md, not one added in this release's diff.
- Log every land-batch entry from #1069 onwards with that line.
- Add three self-tests to `tools/_classify.py`: a JUMPED lane item may close while #980 is next up; an un-JUMPED hunt item may not; a JUMPED line added in the same diff does not exempt.

**B4. `tools/mutate.sh`, before the next landing.** This one is urgent because `FIRST-TWO.md` tells that landing to run three mutations. Today the tool cannot finish: it is capped at 1800 s, and a full pass takes 2697 s. Keep all four existing gates and add:
- Cap = max(3600, 1.6 × `tools/.suite-seconds`).
- Check for `did not finish within` first, and report `TIMED OUT - nothing proven either way` with exit 8, never "SURVIVED" or "NO TESTS".
- Refuse while `.ship-in-progress` or `.spotcheck-in-progress` exists. Find them in the main checkout via `git rev-parse --git-common-dir`.
- New `--only '<titles>'` mode that reuses prove.sh's slice machinery (`tests/_cdp.py --timeout 600`, judged per title by `tools/_spotjudge.py`):
  - Baseline: every named title must PASS on the unmutated tree, otherwise refuse.
  - Mutated run: CAUGHT only if a named title FAILS, SURVIVED only if it ran and PASSED, and NORUN means refuse.
  - Skip `test_floor_check` in this mode.
  - Never read or write `tools/.mutate-green`; key any cache on sources-hash plus titles.
  - Serve the tree that holds the mutated file on its own free port.
  - Make the 4th argument required in this mode.
- Detach full-suite runs the same way as ship.sh, because a harness kill skips the restore trap.
- Add `.mutation-in-progress` to `.gitignore`.
- Fix the minute figures in `CLAUDE.md:172-188`.

**B5. First-message step 3 (`CLAUDE.md:19-21`).** Replace it with:
> 3. **Check for an unshipped release.** Read tick.sh's `UNSHIPPED RELEASE:` line. If it says yes, ship that first. A dirty tree on its own is normal: INBOX.md, tools/design/pm/ and tools/design/plans/ belong to the logging chat, and uncommitted code with no version bump is the previous batch in progress, so continue it.

`tick.sh` prints **YES** when index.html's version label is newer than `git show ssh/main:index.html`'s, or when `.ship-in-progress` exists and its pid is dead. Otherwise it prints NO, whatever `.last-ship` says; `.last-ship` only explains why.

**B6. ship.sh guards. None of these weaken proof; some add proof.**
- **Just before `git add -A` (line 769):**
  - Re-check `.mutation-in-progress`.
  - prove.sh records a hash of the app source plus tests it proved; refuse if that hash has changed. This closes the hole where edits made mid-ship get swept into the release.
  - Only then, and only if prove printed its pass (never on the UNPROVABLE path or the no-app-source path), append `<date> <version> PROVEN-at-ship` to `tools/.spotcheck.log`.
  - `tick.sh` PROOF DEBT then matches releases by subject version or hash, and lists only merges, commits made outside ship.sh, and releases shipped on a declaration. Change `LOOP.md:159` from "An idle tick pays proof debt" to "An idle tick follows the #966 idle steer (rule 8b)".
- **Before the phone pass (~:740):** wait up to 20 minutes for the 1-minute load to fall below 1.6 × cores, printing `_whyslow` evidence. Then **proceed regardless**: never refuse after a green desktop pass.
- **`tests/_cdp.py`:** end a run as STALLED, which counts as a failed pass with the evidence printed, when `page_silent_s` > 600 or one test has been current for more than 900 s. The largest declared budget is 420 s.
- **On a red pass:** run each failing test alone and print PASSES-ALONE or FAILS-ALONE. This is diagnosis only; the ship still refuses. On the next attempt you may print the earlier reds' slice result first, as advice only, never as a refusal.
- **Own server:** ship.sh starts `tools/serve.sh <freeport> "$PWD"` for both passes, using `http://localhost:<port>` so the `*.localhost` collab frames keep working, and kills it in `_verdict()`. `serve.sh` sends `X-FM-Root: <realpath>`, and `_cdp.py` refuses when that differs from its own repo root. This protects slices run from worktrees.
- Add to `CLAUDE.md` beside the suite rules: *"Load spikes during a ship are often Spotlight (mds/mdworker). Check `ps -axo pcpu,command | grep -E '[m]ds|[m]dworker'` before blaming code."*

**B7. Docs-only fast path (ship.sh).** If every changed path matches this list:
- `*.md`, `tools/design/**`, `tools/unblock/**`, `tools/.spotcheck.log`, `tools/.weak-proofs.log`, `tools/_classify.py`, `tools/next.sh`, `tools/tick.sh`, `tools/inbox.sh`, `tools/status.sh`

then run all the instant gates (DROPS REQUEST, DROPS TEST, summary stamp, POLISH-LOG duplicates, NUL, the `_classify.py` self-test). Grep `tests/` for each changed file's basename and run those tests as one `?only=` slice. Stage with an explicit pathspec of those paths, refuse if anything else is staged, and push. Any other path gets the full suite as now.

Also:
- Delete the 12-minute BATCH gate.
- Add no git hook. A `core.hooksPath` hook would also run on ChatGPT's commits and break `rollback.sh`.
- Why this matters: 163 lines of his own words in REQUESTS.md exist only on a Mac that rebooted last night.

**B8. A cheaper one-minute tick (keep his cadence).**
- **Cron prompt in `CLAUDE.md:14-16`:** *"Continue the FreeMotion loop — run ./tools/tick.sh, follow the rules at the top of LOOP.md, then work the oldest actionable item."* Re-arm in this order: CronCreate the new one, CronDelete the old one, then CronList and confirm exactly one is armed.
- **LOOP.md:**
  - Append lines ~168-1850 (the STATE narrative) to the existing `LOOP-HISTORY.md`. Keep rules 1-18, a short "what the work taught", and the SAY section, which tick.sh parses.
  - Delete line 6's "Keep the STATE section below current as you go."
  - Change rule 1 to tick.sh.
  - Make line 1862's "never pause it" match rule 8b's 20 Sep amendment.
  - Delete the **#406** line from the SAY list (closed 1 Sep).
- **tick.sh:**
  - Warn when LOOP.md is over 400 lines (`move narrative to LOOP-HISTORY.md`).
  - For each SAY `#NNN` whose REQUESTS header is `- [x]`, print `#NNN closed — delete from LOOP.md's SAY list`.
  - Run next.sh once into a variable and print both slices from it.
  - Drop the duplicate fetch at :44.
  - Cache PROOF DEBT by HEAD in a gitignored file.
  - While `.ship-in-progress` exists, print only IN FLIGHT, INBOX and the ship's phase.
- **tools/inbox.sh:** when the remote is ahead and the tree is dirty, do not exit. Print the remote's added lines from `git diff HEAD ssh/main -- INBOX.md` and say the pull is deferred.

**B9. Inbox wording.** In `CLAUDE.md:389-391`, at :376 ("one writer each way"), and in LOOP rule 1, use:
> Drain with `tools/inbox.sh` (it fetches and pulls), move each block verbatim into REQUESTS.md, then run `tools/inbox.sh --done`. Never edit or clear INBOX.md by hand: the logging chat may be appending at the same moment.

**B10. Unblock list.** Replace `REQUESTS.md` lines 7-9 (the dead link and "Everything below is on that page…") with:
> **Unblock list link is dead. Republish at a new private link? yes/no**

Do not change the rule about its source; it is cheap and already idle. On a yes, publish the existing source after checking it against next.sh's "built out — waiting on him" bucket. On a no, close #777 and delete the CLAUDE.md section and the memory.

**B11. Memory edits.**
- **One merged `no-agents-beside-ship.md`.** Delete the copies at `orphan-chrome-poisons-a-run.md:31-32` (including its stale "~35 min") and at `build-while-ship-runs.md:10`, and point them here:
  > While .ship-in-progress exists: no browser or Chrome runs from anyone (builder, ChatGPT, PM), no second suite, and no agent fan-out. This is an 8 GB Mac: a phone pass stalled beside a 5-agent workflow on 20 Sep; on 26 Sep all three reds overlapped a workflow; on 5 Oct swap hit 5.6/6 GB and the Mac rebooted. At most ONE light read-only agent (no tests/tests.js greps) beside the DESKTOP pass, and only when 1-min load < 6. Nothing beside the phone pass. If a ship goes red, run the red test alone on the tree and on HEAD, check the _cdp.py mDNS flags and read its state dump, then re-ship. Never re-ship blind. Revisit on the Windows laptop.
- **`loops-use-cron-not-schedulewakeup.md`:**
  > Loops run on a recurring CronCreate, never on ScheduleWakeup alone (14 Aug: a 1h48m silent gap). Cadence and prompt are in repo CLAUDE.md step 2. Run CronList FIRST and create one only if none is listed; a duplicate doubles every tick (24 Sep).

  Remove `*/7`, the sentinel example and "double-firing is harmless".
- **`ezra-loop-and-quota-decision.md`:**
  - Keep "cadence and fan-out are his call; do not re-raise them or quietly slow down."
  - Scope "stop asking me for permision and just do everything" to what it answered (#872/#882, the ship.sh suite length).
  - Add "direction and real tradeoffs: decide with him (global CLAUDE.md)."
  - Add "one browser-running agent at a time; none started above load 10 or with swap near full."
  - Remove the dead link.
  - No hash-skip of LOOP.md.

**B12. Windows port, before the first ship on the laptop** (`move-to-windows-laptop.md` step 6). Every gate must refuse rather than silently skip:
- Parse check: `jsc`, else `node --check`, else REFUSE with "no JS parser on this machine — install node".
- Load: `sysctl`, else `/proc/loadavg` + `nproc`, else REFUSE unless `FM_SHIP_IGNORE_LOAD=1`.
- `_whyslow`: fall back to `top -b -n1`.
- `tests/_cdp.py:30` and `tests/_kbdevice.py:45`: use `FM_CHROME`, else the first Chrome path that exists.
- Orphan reaper at ship.sh:109: widen the pattern to `'(Google Chrome|chrome|chromium).*fm-cdp-'`.
- Fix the jsc hint in `_testfloor.sh` and the iCloud path in `inbox.sh`.
- Re-measure the 1.6 × cores load bar on the laptop.
- Date-stamp or drop the "8–9 GB free" figure (41 GiB free today).

**B13. After Ezra's yes: `~/.claude/CLAUDE.md`.**
- Lines 15-16:
  > Persistence is **localStorage / IndexedDB**, no backend. **Exception: FreeMotion's Work-with-friends sends project data peer-to-peer and through public relays (peerjs, emqx, hivemq)**, so treat `js/collab-*.js` as network code for `/security-review`.
- Projects list:
  - `~/Claude/FreeMotion/`: FreeMotion, its own repo, a vanilla-JS PWA video editor. `~/Claude/Slot game/FreeMotion/` is an OLD copy; never edit it.
  - `~/Claude/Slot game/`: Slovo, Position Roulette, experiments.
  - `~/Claude/Buckets/`
  - `~/Listing Kit/`
  - Drop `~/earth-castle-edit/`; the folder is gone.

### Changes for ChatGPT (the PM edits the heartbeat prompt in `~/.codex/automations/continue-freemotion-oldest-first/automation.toml`)

1. **Replace the prompt; do not append to it.** Rename the automation to "FreeMotion verified-list fixes". Delete these clauses: "fresh isolated local clones", "oldest workable item first, with #690 as the standing brief", "after the current C31 commit", "many distinct original fonts…", "tagged item TBD", "bump changed script cache tags in index.html", and the "(withdrawn 19:35 …)" note. Use:
   > FreeMotion: verified-list fixes. These rules override any rule in STATE.md or TASKS.md.
   > **WHERE:** only ~/.codex/worktrees/freemotion-codex-recovery/FreeMotion, one branch per fix (`git switch -c chatgpt/<task>`). Never a new clone, never /private/tmp. NEVER `git stash` (it is shared with the Claude builder). No `git worktree prune/gc`; touch no refs outside chatgpt/* and codex/*. Never push, merge, open a PR or deploy. Never edit REQUESTS.md, INBOX.md, POLISH-LOG.md, tools/ or index.html `?v=` tags (the builder bumps those from live). If work is stuck, record it in the land-ready table and a GATE BLOCKER line; never push or merge to move it.
   > **WHAT, in order:** (1) any remaining visible items on tools/design/chatgpt-tasks/reports/*/VERIFIED.md; (2) the land list's B1 fix-fors, one commit per original sha, subject "fix-for <sha>: …"; (3) VERIFIED LOWs and ARIA/test-only items. Do B2–B6 fix-fors only after the PM gives you a v17.23 base. Never take a REQUESTS entry in Ezra's own words, even a small one; write one line for the PM instead. Fonts, shapes and new effects wait on Ezra's LAND-LIST §3 answers. When nothing is left, write one line for the PM and end the turn. Do not fall back to #690.
   > **BASE:** start your next fix from current ssh/main (v17.23) and keep stacking later fixes in one line on it. Leave the ed27177e chain as it is. A fix that needs code from the old chain says which sha.
   > **TESTS:** focused tests only, never a full suite. Tag each test with the REQUESTS number you checked (`{ item: '1055' }`). Use 'hunt-pending' only when no number exists, and say so. Never 'TBD', and never a test name starting '690 '. Each report says how the test failed with the fix reverted, or says "test-only coverage" so the builder marks it UNPROVABLE.
   > **SHIP LOCK:** no browser or Chromium test of any kind while /Users/ezrasmith/Claude/FreeMotion/.ship-in-progress exists (8 GB Mac: memory, and the 20/26 Sep contention reds). Re-check the lock before EACH single test and stop when it appears. Never end a turn just to report the lock; start the next fix instead. Use your own port, never 8777, and --mute-audio.
   > **RECORD:** after each fix, add a row to the land-ready table at the end of STATE.md: sha | queue item | test | gate result (count, port, time). If a check fails twice for a setup reason (e.g. the app frame is not ready), write `GATE BLOCKER: <test> <symptom>` as the last line of STATE.md and keep fixing. Keep the per-fix bundle.
2. **One-time task for ChatGPT itself** (it stays the only writer of its files): move the STATE.md history from before 6 Oct into `STATE-ARCHIVE-2026-10.md`, and keep a short "Current state" block plus the land-ready table at the end. Fix the stale lines at STATE.md:3 ("isolated clones only") and :26 (the old /private/tmp ownership path), and at TASKS.md:9.

## 3. Keep: these look slow but earn their place

- **The 380px phone pass, prove.sh, and the load check at the start of a ship.** Queue 431 shipped a phone-only bug through three desktop passes. prove.sh is about a minute of slice runs, not what makes ships long; the two full passes are. The load gate refuses in one second at a bar that was measured.
- **Only the builder pushes, and every landing goes through the full suite.** Attempt 5 was refused for a scene leak that only a full pass catches. Of the pile, 59 commits were dropped and 89 needed fixes, and ChatGPT once pushed v17.22 to live. An optional structural lock is a shared `.git/hooks/pre-push` that refuses any push from a worktree under `~/.codex`. That is Ezra's call.
- **No browser runs beside a ship** (keep the rule, but give memory as the reason).
- **ChatGPT runs focused tests only, never full suites, each proven against the reverted fix.**
- **Mutation checks and all four mutate.sh gates.** Fix the tool's timeout, not the gates.
- **The memory "a flaky test may be a real race".** Attempt 5's red was a real leak, and the mDNS cause is still unproven.
- **ChatGPT's single linear chain of fixes.** Separate branches would conflict on storage.js, and the builder applies commits one at a time anyway.
- **The one-minute loop (his call), CronList-first, ChatGPT's never-idle rule, and the per-fix bundles** (about 0.5 MB each; they saved the work after the reboot).

## 4. Overstated, or not acted on

- **"ChatGPT turns delay steering by up to an hour."** The rollout log shows turns of 10-34 min, and the DISK+SOUND prompt was delivered about 5 min after it was written. No change, and no separate PM-RULES.md: the prompt is the channel that has been shown to work.
- **"ChatGPT makes a clone per task (37 GB)."** Already fixed at 00:05 on 6 Oct (it now works in one ~/.codex worktree). Only the memory text was stale. A third persistent clone with PM fetches was not adopted.
- **"ChatGPT's browser ban starves verification."** ChatGPT closed 7 gates in the gap after 00:56. The pending gates were its own fixture fault, and nothing on main is the landing schedule, not the ban. The swap-free ≥ 1.5 GB metric was already tried and dropped by ship.sh.
- **"No agents beside a ship was disproven by mDNS."** The mDNS cause itself is unproven, and the 20 and 26 Sep contention cases still stand. Ships were not back to back: there was a 44 h gap before v17.23.
- **"Worktree creation causes Spotlight storms", and "worktrees aren't indexed".** Neither is proven. The fix is to reuse an existing worktree mid-ship.
- **"Spotlight is a recurring high cost."** Two storms are documented, and attempt 7's phone pass went green at load 15. The exclusion is still worth his 30 seconds.
- **A ship.sh that detaches itself and exits 0.** Rejected: it brings back the 20 Sep failure where a refusal read as success. The launcher exits 3 instead.
- **Reusing a pass that was green in an earlier attempt.** Dropped: the suite is not deterministic (attempt 5 found a real leak on nearly identical code), and it is close to the re-run shortcut he declined on 5 Oct.
- **Refusing a ship on earlier reds' slice result.** Made advice only: those reds passed when run alone.
- **Running the 1280 and 380 passes in parallel.** Two suites at once already cost a ship (test 699). Only after measured green parallel runs on the new machine.
- **A GATES-RUNNING lock that ship.sh would obey.** Not adopted, because it ties the two lanes together. Revisit only if ChatGPT's gates starve for more than one ship.
- **Separate branches for every ChatGPT fix off main, and strict alternation of land and Simple ships.** Conflicts, and possibly about 45 ships. Alternation is folded into his landing question.
- **"Nothing has landed in ~33 h."** It was about 9.5 h, and land-1013 is already prepared.
- **"Proof debt is a high cost."** No proof-debt work has been done since 26 Sep. The narrower hash-checked fix in B6 is used instead.
- **"Port 8777 is shared with ChatGPT."** ChatGPT already uses its own ports. The real risk was the builder's own worktrees, which the root check in B6 covers.
- **"tick.sh costs a lot of CPU."** It is about 1-2 CPU-seconds a minute. The real cost is tokens and stale, contradictory steers (B8).
- **A hash-skip on reading LOOP.md.** Rejected: a fresh session would never read the rules.
- **A pre-commit hook via core.hooksPath.** Skipped: it would run on ChatGPT's commits and break rollback.sh.
- **A `.noindex` worktree folder at the top level of the repo.** Rejected: `git add -A` would commit it. Worktrees stay under `.claude/`.
- **"A dirty-tree ship costs 90-110 min."** It is about 45 min (no phone pass), and the `_cdp.py` mute edit is complete, not half-done. Fixed anyway via B5.
- **"The cron memory causes duplicate loops."** The auto-loaded CLAUDE.md wins over it. The memory is still rewritten in B11 because it is cheap.
- **"Stop maintaining the unblock source."** It has been idle since 30 Sep anyway; the real harm was the dead link at the top of REQUESTS.md (B10).
- **Rewording PM-STATE.md:59.** It is a dated log entry. The counterweight goes into tick step 4 instead (PM item 2).
- **"mutate.sh is a current drain."** No one has used it since 8 Sep. It is still fixed first (B4), because the next landing is told to run it.