# LOOP.md — what the work loop does, and where things stand

The cron prompt is one line: *"Continue the FreeMotion loop — run ./tools/tick.sh, follow the rules at the top of LOOP.md, then work the oldest actionable item."* (RULES-AUDIT B8, 8 Oct).
Everything else lives here, because a prompt cannot be edited as the work moves and this file can. The LIVE state is
what `tools/tick.sh` computes every tick — nothing in this file has to be kept current by hand any more; the narrative
that used to sit under STATE (1,600 lines by 8 Oct) is in [LOOP-HISTORY.md](LOOP-HISTORY.md). tick.sh warns when this
file passes 400 lines.

## The rules

1. **FIRST, ALWAYS: `./tools/tick.sh`** (it runs next.sh and says whether INBOX.md has lines). Lines in `INBOX.md` are
   Ezra (or the logging chat) talking. Drain with `tools/inbox.sh` (it fetches and pulls), move each block VERBATIM into
   `REQUESTS.md` with a number, then run `tools/inbox.sh --done` — never edit or clear INBOX.md by hand: the logging chat
   may be appending at the same moment. Answer him, and do nothing else that tick.
2. **Take the LOWEST-NUMBERED open item** (unnumbered first — they are oldest). Oldest-first is his
   rule, not a preference. Do not pick what looks interesting.
3. **Read the file the entry names BEFORE building.** On 20 Aug three "open" entries turned out to be
   already done. An entry records what was ASKED, not what is still missing.
4. **Blocked on a decision from him?** Say so in the entry and move to the next-oldest. Blocked is not
   done. An entry carrying "ANSWERED BY EZRA" is no longer blocked — `next.sh` knows this now.
5. **Ship properly:** bump the version label in `index.html` AND the `?v=` cache-buster for EVERY file
   touched (a missed buster reads as "the fix does not work" — it has), add a plain-language
   `POLISH-LOG.md` entry, tick the `REQUESTS.md` entry with its version, then
   ship it with `tools/ship-bg.sh` (rule 6). Never commit around ship.sh.
6. **Ships and suites — the same two lines as CLAUDE.md ("SHIPS AND SUITES") and tools/tick.sh (6 Oct, RULES-AUDIT B1):**
   **Ships:** write the message to `.claude/ship/msg.txt`, run `tools/ship-bg.sh` (exit 3 means launched, NOT shipped), then Monitor `.claude/ship/ship.log` until a line starts with `SHIP EXIT` or `kill -0` on the pid in `.ship-in-progress` fails. **Shipped** = a log line starts with `✅ pushed and verified: HEAD == ssh/main` AND `.last-ship` is `PUSHED <hash>` with hash == `git rev-parse --short HEAD`. HEAD == ssh/main alone proves nothing, nor do those words elsewhere in the log. `RUNNING` with no live pid means a KILLED ship: re-ship it.
   **Suites:** a full suite may use `run_in_background` with timeout = 1.6 × `tools/.suite-seconds` × 1000 (at most 7200000). Only `?only=` slices run in the foreground (timeout ≤ 600000). Never write minutes into prose.
   (This rule used to say "foreground, `timeout: 600000`" — written for a ship a fraction of today's length. On 5 Oct a
   ship started that way was killed at the harness's 10-minute limit.)
7. **Mobile-first:** verify at ~380px before calling any UI change done.
8. **Surface every open question in the reply.** 28 questions once piled up unasked. Never block
   silently, and never re-ask something he has already answered.
8b. **⛔ NEVER PAUSE OR DELETE THE CRON. THE LOOP IS UNSTOPPABLE — this is his explicit priority.**
   On 22 Aug I stopped it after 16 ticks of "0 actionable", reasoning that firing every minute with an
   empty queue burned his quota for nothing. He overruled it immediately: *"why would you stop? you did
   not meet every task i believe, double check again and make sure ur unstoppable as a high priority."*
   **Two things were wrong with that call, and both matter more than the tokens:**
   · **"Nothing actionable" was MY CLASSIFIER'S opinion, not a fact.** It is a pile of regexes over prose
     that I wrote. Trusting it to conclude "there is no work left" is exactly the kind of confident
     wrongness this file exists to prevent. An empty queue is a hypothesis to be CHECKED, not a result.
   · **Stopping is never mine to choose.** He asked for a loop that does not stop. If a tick has nothing,
     the answer is one line — not switching off the thing he asked for.
   If a tick ever genuinely has nothing: say so in ONE LINE and let the next tick fire. Do not touch the
   cron. ⚠️ **But since 26 Sep (#966) "nothing" has a standing answer in his own words:** next.sh prints an
   IDLE STEER whenever nothing is ACTIONABLE — new effects, filters, sound effects, and more options on
   existing effects ("more choices always better … this is the complex version"). Work that before calling a tick empty. If the queue looks empty for several ticks running, that is a signal to AUDIT THE CLASSIFIER
   ⚠️ **AMENDED 20 Sep, by him, and this half is NEWER than everything above it (queue #877, #880).** He
   said, unprompted, at the end of the restart brief: *"you can stop the loop if you truely run out of
   productive things to do."* That REVERSES "stopping is never mine to choose". It does NOT reverse the
   rest of 8b, and the distinction is the whole point: **"truly out of productive things" is still not
   the classifier's opinion** — 24 items are parked on his answers and 8 are actionable as of today, so
   the queue is nowhere near empty and this clause does not apply yet. It applies when the ACTIONABLE
   list is genuinely dry and the only thing left is waiting on him. Then: say so, and stop — do not
   manufacture work, and do not keep firing an empty cron at his quota.
   ⚠️ **The one-minute cadence is CONFIRMED, 20 Sep.** Asked directly whether to slow it down given that
   he ran out of quota in an evening on 19 Sep, he said: *"That was on chatgpt, u dont do that. so its
   fine."* The blowout was Codex's. One minute stands; do not re-litigate it.
   (re-read the entries by hand), not a signal to stop.
9. **A green run proves nothing unless the probe exercised the code.** Every new assertion carries a
   control that fails if the thing being measured was not happening. Mutation-check both directions
   where a lazy fix would be wrong.
10. **Measure where the thing you are testing actually does something.** A correct metric pointed at
    the wrong moment is a dead assertion — a low-pass mutation survived a midpoint check twice because
    at that point the filter had not closed far enough to touch the test signal at all.
11. **CHECK `document.hidden` BEFORE BELIEVING ANY TIMING MEASUREMENT — and check it, do not assume
    the answer.** This rule used to state flatly that the preview pane reports `document.hidden: true`
    even when fronted. **Measured at v11.68: it reports FALSE.** So the rule as written would have sent
    a session either to distrust a perfectly good measurement, or — worse — to believe it had staged a
    backgrounded-tab test (queue 47 needs one) by measuring in the pane, which it had not.
    The original observation was real: a slam animation sampled at six points returned the same frozen
    transform every time and looked exactly like a bug. Throttling happens. It is just not a constant
    of the pane, so it has to be read at the moment of measuring.
    ⚠️ **AND ON 24 AUG IT REPORTED `true` AGAIN** — rAF fired 0 frames in 1.6s and a control animation
    never advanced, so queue 508 (a smoothness item) could not be worked at all that tick. So the pane's
    visibility VARIES between sessions: v11.68 measured false, 24 Aug measured true. Neither is the rule.
    **The rule is the control.** If it comes back hidden, the honest move is to skip the timing work and
    say so — not to pick an easing curve by eye and call it smoother.
    Check `document.hidden` before believing any timing measurement — and CHECK IT WITH A CONTROL:
    run a throwaway `element.animate()` and confirm it actually advances. Queue 250 was blocked on this
    for two separate sessions, both of which recorded "motion cannot be timed here"; at v11.71 the pane
    reported hidden:false AND a control animation ran 0 → 45.9 → 100, so the slam's motion was measured
    for the first time. **A blocker written in an entry is a claim with a date on it, not a fact.**
13. **⏱️ A WORKFLOW GETS A HARD STEP BUDGET AND A WAIT LIMIT — his instruction, from watching one
    freeze.** His words (queue 353): *"make sure you don't wait too long to wait for one of the work
    flow people to reply because sometimes they freeze and you just do nothing for hours, so make it so
    you only wait for a certain amount of time … make sure no workflow agents get stuck in a never
    ending loop like last time"*. So: bounded rounds, never `while (true)`, and **if an agent has not
    come back, carry on with the work rather than waiting on it** — an hour of nothing is worse than a
    thinner answer. This lived only in REQUESTS.md until 22 Aug, i.e. nowhere that would be read at the
    moment a workflow was actually being launched, which is the whole point of this file.

14. **A REDUCED RASTER MAKES ITS OWN DIFFERENCES — SO "DO ANY PIXELS DIFFER" IS NEVER THE QUESTION.**
    Enabling an effect routes a layer through an offscreen plate, and at any reduced raster the layer's
    boundary lands on a fraction of a pixel, so the plate path and the direct path disagree on the
    boundary rows. Measured on queue 477: **50 of 9,768 pixels, two rows, up to 10 levels** — and
    **exactly zero at full project resolution**, where the boundary falls on integers.
    So compare with a THRESHOLD, never with equality: boundary noise is ~0.5% of pixels, a real effect
    ~15%. **⚠️ AND I GOT THIS WRONG ONCE ALREADY** — I first blamed my own probe squashing 9:16 into a
    square, which WAS an artefact, and then claimed it explained the real fault too. It did not:
    `rasterFor` scales uniformly. **Proving your instrument was faulty does not prove it was the only
    fault.**

12. **A picture assertion cannot police a cost.** Sixteen identical renders average back to the same
    image — that mutation survived until the expensive path was counted. If a fix has a cost, measure
    the cost, not the output.

15. **⚡ BATCH THE WORK, SHIP ONCE — his instruction, 25 Aug, and the reason is arithmetic.**
    *"cant you have the test suite run while u move on to the next thing? … i want more progress faster
    but not at the quality cost … if u notice that the testers actually notice a lot of good stuff dont
    get rid of them."*
    **He is right about the bottleneck.** One item was costing up to FOUR suite passes — one to check, two
    inside ship.sh, one or two for a mutation (lengths: `tools/.suite-seconds`) — of idle waiting for a change
    that often takes two minutes to write. 33 releases in 36 hours, almost all of it watching a progress bar.
    **So: work 3–5 queue items, then ONE ship covering them all.** Same tests, same gates, a quarter of
    the waiting.
    ⚠️ **Build during ships (6 Oct, RULES-AUDIT B2).** While ship.sh runs, do not touch THIS tree: the phone pass reloads from disk, and `git add -A` commits whatever is here at the end. Instead, BEFORE starting the ship, create one worktree under `.claude/worktrees/` for the next-oldest item and write code there while the ship runs. Mid-ship, reuse an existing worktree (`git switch -c <branch> <base>`) instead of adding a new one. Code only: no suite, no browser, no Workflow or agents. Merge it into this tree as UNCOMMITTED changes (so prove.sh runs) only when `.ship-in-progress` is gone, no ship.sh is alive, and the ship SHIPPED by rule 6's two-part test: a log line starts with `✅ pushed and verified: HEAD == ssh/main` AND `.last-ship` is `PUSHED <hash>` with hash == `git rev-parse --short HEAD`. The words alone prove nothing: a ship that touched the launcher prints its self-tests into the same log before any suite. If the ship REFUSED, keep the worktree separate until the re-ship lands.
    Never put a worktree in a new top-level folder: `git add -A` would sweep it into a release. Worktrees live
    under `.claude/` (gitignored).
    ⚠️ **KEEP the mutation checks.** He singled them out — they have caught something real every single
    time, including two of my own dead tests and a cross-test leak. Batch them too: mutate once per
    batch on the riskiest assertion, not once per item.
    ⚠️ **And his sharpest line, which is fair: *"u constantly dont do stuff i ask or just fail at it and
    dont even realise"*.** The 25 Aug audit found #418 and #352 ticked DONE with unticked clauses inside
    — invisible to `next.sh`, which reads the top-level checkbox only. **Re-run that audit at the end of
    every batch**, not once: a DONE entry carrying an unticked clause is the shape that hides work.

16. **🌙 WHEN HE IS ASLEEP, DECIDE — do not park work on a question.** His words, 25 Aug:
    *"im off to bed now so dont ask me anything just do, based on all this info and ur own smarts"*.
    This **overrides #545's "show him options first" for the duration** — pick the option I would
    recommend, ship it, and show him the picture in the morning with the alternatives named so he can
    change it in one word. A visual he can see and reject beats a tick spent waiting.

17. **🧪 A TEST THAT OPENS THE REAL EFFECTS BROWSER LEAKS — it has now cost two items.**
    `FM.fxBrowser.open()` starts the thumbnail machinery, and the next test that compares an effect tile
    against its subject then reports SIX effects as *"indistinguishable from their subject"* — with
    nothing wrong in the effects at all. Queue 528 and queue 538 hit it with **byte-identical numbers**.
    **Drive `FM.fxSheet(root, true)` instead** when what you need is "the menu is on screen"; open the
    real browser only when the thing under test is the browser itself, and then restore before handing on.
    ⚠️ **And the meta-rule, which I broke twice in one night: when a NEW test turns an UNRELATED test red,
    neuter the new test's body FIRST.** One run gives you the answer. I theorised about a stale thumbnail
    cache, then about the adaptive-quality ladder, and was wrong both times — three runs spent to learn
    what one bisection would have told me. Identical failure numbers across attempts is the tell that your
    changes are not touching the cause.

18. **🔒 A FIX SHIPS WITH A TEST THAT FAILS WITHOUT IT — and ship.sh now measures that instead of reading it.**
    His words, 5 Sep, coming back after a fortnight away: *"dont assume fixes will work, do research … i think there
    could be a lot of delusion and lack of effort."* Every POLISH-LOG line said "mutation caught" and nothing could
    re-check it. Three tools now, all structural:
    · **`tools/prove.sh`** — run by `tools/ship.sh` before the suite. It serves HEAD's source with the working tree's
      tests and requires every test this release added or changed to FAIL there and PASS here — one Chrome run per
      side, all changed tests in one pass (`?only=` takes several titles separated by newlines). One CAUGHT test per
      queue item named in the log line, or it refuses. The escape hatch is a declaration he can read:
      **`UNPROVABLE: <why>`** in the newest POLISH-LOG line. "WEAK" in its output means the test fails on a missing
      seam rather than on behaviour — accepted, but a behavioural assertion is better.
    · **`tools/spotcheck.sh <commit>`** — the same proof, after the fact, for any past release, in a throwaway
      worktree on its own port. It logs to `tools/.spotcheck.log`; **`tools/tick.sh` lists the releases never checked
      (PROOF DEBT) and the ones whose proof FAILED.** An idle tick follows the #966 idle steer (rule 8b) instead of inventing work. (8 Oct, RULES-AUDIT B6: ship.sh now
      logs PROVEN-at-ship for every release it proved, so PROOF DEBT lists only merges, commits made outside ship.sh and
      declared UNPROVABLEs — paying it is no longer the idle default.)
      First run (5 Sep): 3 of the first 5 releases proven, 1 weak, **v15.53 NOT-PROVEN** — one of its two changed
      tests still passes with the fix reverted.
    · **`tools/tick.sh`** — the one command a tick runs first. It COMPUTES what a tick needs (mutation lock, live
      suites, INBOX, HEAD vs ssh/main, queue, stale asks, proof debt, the say-every-reply list) so no rule has to be
      remembered across a context reset. The cron prompt points at it.
    ⚠️ Editing a script that agents are RUNNING corrupts their run — bash reads a script as it executes. Write the
    new version to a temp file and `mv` it into place; the running copies keep their old inode.

## STATE — computed, not written

`tools/tick.sh` prints it every tick: what is in flight, the inbox, the remote, the queue, the proof debt, the SAY list.
The history that used to live here is in [LOOP-HISTORY.md](LOOP-HISTORY.md) (moved 8 Oct, RULES-AUDIT B8).
## 🎯 22 Aug — HIS STEER, AND IT CHANGES WHAT THIS LOOP SHOULD SPEND TICKS ON
*"make sure youre doing either work i ask for or good important work. i dont know what ur doing as i just
leave u on all day coz im busy and i just hope u make the project better for me, working on the lag being
fixed for mobile would also be good"*.
**Taken as a correction, because it is one.** The last several ticks were queue HYGIENE — closing entries
already done, turning open questions into pick-ones, showing him options that had only been described.
All of it real, all of it unblocking, **and none of it makes the app better from where he sits.** He
cannot see the difference between a good tick and a tidy one.
**So: MOBILE LAG is the work, and shipping improvements outranks tidying the list.** Hygiene is fine when
it falls out of doing the work; it is not a tick of its own unless it is blocking something.
**Workflows are authorised** (his words), bounded by rule 13.


## WHAT THE WORK TAUGHT — the durable rules, distilled from 33 ticks
*(Each line cost something. The full account of any of them is in LOOP-HISTORY.md.)*

**On measuring**
1. **Check the instrument before the code.** Four readings-through-a-broken-lens in one week — a
   truncated grep, a too-narrow regex, a guessed selector, a mis-split parser — each of which looked
   exactly like a real finding. None reached him, because each was checked first.
2. **When a guard blocks a change, check the guard before the change.** One was watching 52 of 170
   kernels and going green. A structural guard needs a sanity check calibrated to the REAL population.
3. **Single-shot timings decide nothing.** A 2% "win" reversed under seven runs. Rank with a sample;
   quote from a full run; keep or reject on a median.
4. **Growth measured entirely inside a cap is indistinguishable from a leak.** Find the cap first.
5. **A no-op result on a synthetic subject proves nothing about the code.** A flat opaque fill made four
   working effects look dead. Test on something the code can act on, THEN on his subject, and say both.
6. **Any fast-path-vs-reference test needs a control that the effect DID something** — empty params make
   most effects no-ops, and two untouched images compare equal.

**On testing**
7. **Testing the repair is not testing the wiring.** A seam exposed as `FM._x = x` does NOT intercept
   internal callers of `x`. Drive the outermost real entry point you can reach. (Bit three times.)
8. **A diagnostic's absence is silent, so its CALL SITE needs the test more than its logic does.**
9. **An old test that goes red on a deliberate reversal is usually a previous complaint of his wearing a
   test's clothes.** Read what it protects, then update it WITH the reversal recorded — never delete it.

**On the queue**
10. **Audit by "is this waiting on HIM or on ME?"** — not by the status field. That question found a 🚨
    entry whose next step had been mine for two days.
11. **A ticked entry is not evidence.** When he repeats a report, reproduce it before reading the
    history. Two entries claimed #480 was fixed; he was right and they were wrong.
12. **When two entries "fixed" the same thing and he still complains, suspect their SHARED premise**,
    not a regression in either.
13. **A parked "separate, real question" inside an entry is queue work, not a footnote.**
14. **A "next thing to do" written in entry A does not get updated when entry B does the work.** Verify
    against the code before believing any pointer.
15. **When he adds a clue after a failed investigation, RE-RUN it** — the clue is usually the state
    nobody tried.

**On what to build**
16. **The recurring bug is the app knowing something and not saying it where he can read it** — a
    console.warn, a fix in a text file, a feature named but not linked. When the app tells him what to
    do, ask whether it can just DO it.
17. **Ask how EARLY a failure could speak.** A message that arrives after the cost is paid is a receipt,
    not a warning.
18. **When his report is a comparison ("X is fine but Y is bad"), the instrument must compare.** A
    pooled median is the one number that cannot see an asymmetry.
19. **For a slow per-pixel kernel, ask how much of the expensive expression actually varies per pixel.**
    Separable axes, a 0-255 input domain, six fixed rays — none of those vary. Eight wins came from that
    question. **But hoisting only pays for EXPENSIVE work** (a trig call, a pow, an allocation); the JIT
    already hoists cheap arithmetic, and a typed-array load is not cheaper than a multiply.
20. **Verify the LIVE deploy BOOTS after any release that changes the file list.** `curl | grep version`
    proves the HTML deployed, not that the app runs.


### ⚠️ SAY THESE IN EVERY REPLY UNTIL HE ANSWERS — he asked for it explicitly
Not a courtesy: a standing instruction that has been dropped for days, which is why it is a LIST here
rather than something to remember. Delete a line the moment he answers it.

(none open — #406 was answered and closed on 1 Sep; add a line here the moment he asks to be reminded of something)


**▶️ LOOP RUNNING — every minute, and it stays that way (rule 8b: the cron stays armed and is never paused or deleted; the one-minute cadence is his, confirmed 20 Sep).**

**📌 STANDING AUDIT POINTERS (the findings, not the narrative — full accounts in LOOP-HISTORY.md).**
Two hand audits on 22 Aug, run because he said *"you did not meet every task i believe"* and was right:
· **`tools/.buildable-audit.json`** — the open entries that had real buildable work when the classifier
  said zero. **`tools/_classify.py` IS A HINT, NEVER A PROOF: when it says 0, audit by hand.**
· **`tools/.dropped-clause-audit.json`** — clauses ticked DONE without being built.
⚠️ **Both lists are now PARTLY STALE and must be re-checked against the code before being worked** —
e.g. they name #141's custom export frame-rate as "never built", and it shipped at v11.55 as #141b
(verified in `index.html`). Treat every line in them as a lead, not a fact.
