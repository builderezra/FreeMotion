# LOOP.md — what the work loop does, and where things stand

The cron prompt is one line: *"Continue the FreeMotion loop — read LOOP.md first."* Everything else
lives here, because a prompt cannot be edited as the work moves and this file can. The loop's state was
inside the cron prompt twice and was stale within one release both times — it claimed v11.25 and an
in-flight #382 that had already shipped. **Keep the STATE section below current as you go.**

## The rules

1. **FIRST, ALWAYS: `./tools/next.sh`.** If it refuses because `INBOX.md` is non-empty, that is Ezra
   talking. Log every line VERBATIM into `REQUESTS.md` with a number, clear below the `---` in
   `INBOX.md`, answer him, and do nothing else that tick.
2. **Take the LOWEST-NUMBERED open item** (unnumbered first — they are oldest). Oldest-first is his
   rule, not a preference. Do not pick what looks interesting.
3. **Read the file the entry names BEFORE building.** On 20 Aug three "open" entries turned out to be
   already done. An entry records what was ASKED, not what is still missing.
4. **Blocked on a decision from him?** Say so in the entry and move to the next-oldest. Blocked is not
   done. An entry carrying "ANSWERED BY EZRA" is no longer blocked — `next.sh` knows this now.
5. **Ship properly:** bump the version label in `index.html` AND the `?v=` cache-buster for EVERY file
   touched (a missed buster reads as "the fix does not work" — it has), add a plain-language
   `POLISH-LOG.md` entry, tick the `REQUESTS.md` entry with its version, then
   `tools/ship.sh "message"`. Never commit around ship.sh.
6. **Suite in the FOREGROUND with `timeout: 500000`** — and **`timeout: 900000` for `tools/ship.sh`**,
   which runs the suite twice (desktop + 380px) on any shipped source change. Never background-and-poll.
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
   cron. If the queue looks empty for several ticks running, that is a signal to AUDIT THE CLASSIFIER
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

## STATE

### 🎯 22 Aug — HIS STEER, AND IT CHANGES WHAT THIS LOOP SHOULD SPEND TICKS ON
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


### 📍 CURRENT STATE — keep this short; the history lives in [LOOP-HISTORY.md](LOOP-HISTORY.md)
**v12.03, 886 tests green, tree clean, `HEAD == ssh/main`.**
**⚠️ THE "EVERYTHING IS BLOCKED ON EZRA" READING WAS WRONG, and rule 8b called it.** That audit concluded
every open entry needed a word from him. On 23 Aug a 60-agent adversarial review of the week's own work
produced **14 confirmed defects**, every one verified against an independent attempt to refute it, and every
one buildable without him — logged as **485–496**. An empty queue is a hypothesis; that is the second time
checking it has found real work. **When the queue looks blocked, attack the shipped code instead.**
Shipped since: v12.02 (Contour Lines walking a grow-only buffer — 3.1x on every frame, invisible because the
picture was identical), v12.03 (queue 480, the add-row drag, wrong for the THIRD time — row indices written
into a layer index).
**Next: 481 (PC effects browser layout), then 489/491/493 — the lag report's own faults.**
⛔ **Do not ask him to tap the lag toast until 489/491/493 are fixed.** That tap unblocks five entries and
the report it produces is currently wrong in three places; spending it on a broken gauge wastes the one
measurement only his phone can take.
**Two campaigns closed, do not restart them:**
· **Effect speed** — eight wins (tiltshift 10.5×, spinstreaks 7×, the shared frame buffer, turbulent
  displace 1.93×, wave 2.3×, cross process 9×, lens flare 2×, twelve kernels off their own frame copy),
  one measured rejection (zoomstreaks). All of the top five have been READ; none of the rest is
  reducible by these techniques.
· **Diagnostics** — every message whose absence would be silent was mutated away one at a time; three
  holes found and closed. New diagnostics still need this treatment; the old ones have had it.
**What would unblock the most:** one tap from him on the "what's slow" toast. Five entries (95, 125,
148, 202, 387) wait on that single report.
**The block he reads now opens with THREE actions, not a 20-row table** (23 Aug). He had ~15 open
questions and answered none for many ticks; a wall of pick-ones is a wall however well written. It
leads with the toast tap (unblocks five entries), "got it" for #406, and the feature name — everything
else is explicitly marked not urgent. **If a request for a decision goes unanswered for days, suspect
the ASK before the person.**
**Nine tests could SKIP their own assertions and report a pass — fixed 23 Aug.** Audited all 880 for
vacuous passes. None lacks a `throw` (good), but **24 could `return` before reaching one**, and ten of
those skipped because THE THING UNDER TEST WAS MISSING — `FM.buildMaskAlpha` gone, `FM.timeline.rebuild`
gone, `FM.sfx.open` gone, the timeline drawing no clip for a layer the test had just created. Delete the
feature and those tests go GREEN. Nine now throw and name what vanished; the suite is still 880/880 at
BOTH widths, so not one of those guards had ever been firing — they were dead valves that would only
have mattered at the moment they hid something.
⚠️ **Fourteen other early returns are legitimate and were left alone** — viewport gates (`matchMedia`),
codec support, loop control. **The rule: a test may skip for an ENVIRONMENT reason, never because the
thing it tests has disappeared.**
**The vacuous-pass audit is FINISHED — three classes checked, do not re-run it.** (1) tests with no
`throw` at all: **none**. (2) loops that `continue` past every case without counting what ran:
**none** — every one already has an "exercised" counter. (3) tests whose only assertion sits inside a
DOM-query loop, which pass when the selector returns nothing: **one candidate, read, and sound** (its
loop is over a literal array and its main assertion is unconditional). Only class (1)-adjacent early
returns were real, and those nine are fixed.
✅ **TWO OF THIS WEEK'S HAND-VERIFICATIONS ARE NOW TESTS (882 green).** A one-off check in a browser is
a hope; the repo's own rule is that a safeguard must be structural. So the two most valuable became
permanent tests, each mutation-checked with a mutation the EXISTING suite could not see:
· **file round-trip through the real import path** — dropping a layer in `applyScene` is caught
  ("the import produced 1 layers, not 2 — a shared file is losing work"). The old round-trip test
  compares only layer IDs and never calls `applyScene`, so it saw nothing.
· **undo over a long chain** — shrinking the 120-entry cap to 6 is caught ("only 5 undos were available
  after 30 committed edits"). The single-edit fidelity test cannot see a cap change at all.
⚠️ **The storage-full behaviour was deliberately NOT made a test** — it needs `localStorage.setItem`
stubbed globally, and the suite harness itself writes there mid-run, so the test would be more likely to
break the suite than to catch a regression. Verified by hand instead, and that limitation is the reason.
**A shared project file round-trips losslessly — verified 23 Aug.** He shares work as `.fmotion.json`
(templates, elements, whole projects), so "does anything fall out on the way back in" is a real
question about his data. Built a scene with two effects, an opacity keyframe track with easing, a blend
mode, bold/aligned text and non-zero start times; serialised it TO TEXT and parsed it back exactly as an
import does; applied it. **Identical apart from the layer ids, which are regenerated on purpose** (an
imported file carries the ids of the project it came from, and reusing them would collide with that
project in the shared media store). Effects, keyframes, blend mode, text, bold, start times: all kept.
⚠️ **My first run reported "import produces ZERO layers" — total data loss — and it was the HARNESS.**
`serializeScene` hands back an object that can still reference the live layers array, so my
`layers.length = 0` emptied the exported data too. A real import parses from TEXT, which severs that.
**Serialise through a string before wiping anything, or you are testing your own probe.**
**Undo survives a LONG chain, and the 120-cap degrades correctly — soaked 23 Aug.** The suite covers
single-edit fidelity (*"one edit then undo puts the document back exactly, for every kind of edit"*);
what it did not cover is a long run, which is where index bookkeeping and stack pruning interact.
| | |
|---|---|
| 30 edits, under the cap | 30 undos, **byte-identical round trip to the start** |
| 150 edits, past the cap | **exactly 119 undos possible** (120-entry stack → 119 steps back), all layers intact, no duplicate ids, and it correctly does NOT reach the start |
Losing the oldest history past the cap is by design — it is what bounds memory. **The property that
matters is that it degrades by losing REACH, never by corrupting the document, and it does.**
**A full phone does NOT cost him work — simulated and verified, 23 Aug.** His storage is one budget
shared with the video in IndexedDB, so "what happens when it fills mid-edit" is a real question about
his data. Stubbed `localStorage.setItem` to throw `QuotaExceededError` on every project write, then
edited six times:
| | |
|---|---|
| saves blocked | 6 |
| the last good save | **intact — 813 bytes before and after, layer still present** |
| toasts shown | **exactly 1**, not 6 (autosave runs every 600ms; the anti-spam works) |
| what it said | *"Storage full — autosave paused. Use ⚙ → Save project file to keep your work."* |
| after space frees | **autosave resumes and persists** the next edit |
Nothing truncated, nothing corrupted, told once, given a route out. `localStorage.setItem` is atomic —
it throws or it writes — so the previous value always survives; and `storage.js` separately catches the
nastier case where a write REPORTS success and silently did nothing, by comparing a revision.
✅ **AND THE LOCAL-ONLY PROMISE IS NOW A TEST TOO (884 green).** "Nothing leaves the device" is the
premise the whole app rests on — no backend, media in IndexedDB, cloud TTS left as HIS decision. One
added `fetch` to an analytics or CDN host would break it **silently**: nothing would look different and
no test would fail. A source scan now asserts the app names exactly **two** hosts in code —
`api.anthropic.com` (the one outbound call, his key, his choice) and a link to fetch that key — and
fails on anything else, with the message that a new host is **a decision for Ezra, not a code change**.
Mutation-checked by planting a `fetch('https://analytics.example.com/collect')`: caught by file and line.
⚠️ Comment lines are skipped deliberately — the codebase documents the attacks it defends against
(`https://attacker/beacon`), and flagging prose would make the guard noise. The test proves both halves
of that: it SEES a planted fetch and does NOT see a URL in a comment.
✅ **AND THE innerHTML RULE IS NOW A TEST (883 green), not a habit.** The pass below found the code
clean, but "clean today" rots the moment someone writes `el.innerHTML = layer.name` — and his app holds
his own words plus files other people have shared with him. A source scan now fails the suite if user
text is ever written as HTML. **Mutation-checked with the real regression**: switching a caption's own
text from `textContent` to `innerHTML` is caught by file and line.
⚠️ **The denylist is deliberately NARROW** — `.name`/`.text`/`.caption` are user input in this codebase;
`.label` is a UI constant (the add-menu TABS list), and including it would fail on a fixed literal list
that was read and is safe. **A guard that cries wolf gets deleted.** The test carries its own control:
it first proves it can SEE a planted violation and does NOT flag a plain icon constant.
**Security pass against the three risks CLAUDE.md names, 23 Aug — all clean.** Never done before, and
it needed no decision from him:
· **No user-controlled string reaches `innerHTML`.** 104 writes; the sixteen whose expression mentions
  a name/label/title all resolve to module constants (the add-menu TABS list, the blend-mode table) or
  icon literals. The convention holds — the code says so out loud in several places
  (*"element/template/file names are USER input — textContent, never innerHTML"*).
· **No hardcoded secrets** — no key-shaped literal anywhere in `js/` or `index.html`.
· **Exactly ONE outbound network call in the whole app**: `js/ai.js` → `api.anthropic.com`, which is
  where a BYOK key is supposed to go and the only place it can. Everything else is local by
  construction.
· **And the untrusted-parser risk is already hardened**: an imported `.fmotion.json` may only rehydrate
  real `data:` URIs — `storage.js` rejects anything else so an attacker cannot embed
  `https://…/beacon` and have it fetched on open. Someone thought about this before me.
**Every ship.sh gate test-fired, 23 Aug — they all still refuse.** The gates are the loop's guarantees
and each encodes a real past failure, but nothing had ever CHECKED that they still fire; a gate that
quietly stopped working is the same silent-absence class as a missing diagnostic. Deliberately tripped
each: **cache-buster not bumped** ✅ refused (named the file and its `?v=`), **mutation in progress** ✅,
**backtick in the commit message** ✅, **POLISH-LOG claiming an OPEN queue item is closed** ✅. The rest
(stale REQUESTS stamp, classifier self-test, red suite, phone pass, push verification) have all fired
naturally during recent ticks. **All gates run BEFORE the 4-minute suite, so re-testing them is cheap —
worth repeating if one is ever edited.**
**Delivery path verified live, 23 Aug** — the service worker is registered and controlling on the real
Pages origin, the silent-downgrade marker (queue 306) has never fired, and the cache is exactly ONE
build: all 71 versioned URLs the page names are present and **zero files are cached at two versions**,
which is queue 430's pruner working. **So a release does reach his phone.** Nothing to fix; re-check
only if he reports an old build again.

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

- **#406 — he asked to be REMINDED to acknowledge.** His words: *"don't stop until I reply acknowledging
  it, remind me to acknowledge as well"*. The thing to acknowledge is the answer to his question — the
  difference between the three preset savers (one effect · effects-only · whole look, which is the only
  one that carries ANIMATION). **He has not acknowledged it since 19 Aug, and I stopped reminding him
  after the first reply — the exact failure he pre-empted in the request.**


**▶️ LOOP RUNNING — every minute, and it stays that way (rule 8b: never pause it).**

**📌 STANDING AUDIT POINTERS (the findings, not the narrative — full accounts in LOOP-HISTORY.md).**
Two hand audits on 22 Aug, run because he said *"you did not meet every task i believe"* and was right:
· **`tools/.buildable-audit.json`** — the open entries that had real buildable work when the classifier
  said zero. **`tools/_classify.py` IS A HINT, NEVER A PROOF: when it says 0, audit by hand.**
· **`tools/.dropped-clause-audit.json`** — clauses ticked DONE without being built.
⚠️ **Both lists are now PARTLY STALE and must be re-checked against the code before being worked** —
e.g. they name #141's custom export frame-rate as "never built", and it shipped at v11.55 as #141b
(verified in `index.html`). Treat every line in them as a lead, not a fact.
