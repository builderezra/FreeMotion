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
**v12.35, 923 tests green, tree clean, `HEAD == ssh/main`.** (No version bump this tick — verification
work, nothing user-visible changed, so no POLISH-LOG entry either.)
**Last tick worked #47, the OLDEST numbered item, and closed its "backgrounding" ground.** That entry had
said for weeks that backgrounding mid-export needed a real device. **Rule 11 again: it was a claim with a
date, not a fact.** "Backgrounded" is two imposable effects — rAF stops, setTimeout clamps ~84x — so it
stages fine. Audited: no rAF anywhere in the export path, and the per-frame yield is MessageChannel.
Proved with a real 30-frame export under both conditions; mutating the yield back to `setTimeout` takes it
to **30,106 ms** and the test catches it.
⚠️ Left deliberately: the 1500ms stale-seek `setTimeout`. Throttling makes it fire LATER, i.e. it waits
longer for a real `seeked` — safer, not wrong.
**What is left in #47:** (b) the OffscreenCanvas worker move, and an export interrupted by a phone call
(genuinely needs a device — an OS interruption, not a page-visibility state).
**NEXT: `./tools/next.sh`** — #95 is the next numbered item after 47.
**v12.35: the Media/Audio menus on PC (#542).** The add menu was never held to the inspector panel — body
ran y=203→302 in a 231px box. That panel is `overflow: visible` ON PURPOSE (the resize handle lives above
its top edge), so the spill was clipped by #app: unreachable, not merely ugly. The rule that set it
carried a safety argument — "planGrid sizes the tiles to the panel, and the body scrolls when it cannot"
— and BOTH halves had silently stopped being true. Restored, plus two real side-faults: perPage was
computed for 4 columns while the CSS draws 5, and the row count came from a 390px-phone measurement.
⚠️ **THREE process lessons, all expensive this tick.**
1. **My first diagnosis was confidently wrong** and I only caught it by measuring the REAL inspector
   instead of the synthetic host I had been testing in. *Measure the layout you ship to.*
2. **A CSS comment I wrote had no `/*`** — the parser dropped the whole rule block and the fix "did
   nothing" for three rounds. `styles.css` comment balance is worth checking when a rule mysteriously
   fails to apply.
3. **My first version of the 542 test was DEAD and reported green.** It silently `return`ed when the add
   menu was absent, and it never seeded a media library — an empty library shows 3 tiles and hides the
   bug completely. A mutation deleting the whole containment survived it. **Both guards are loud now.**
**NEXT: oldest-first from `./tools/next.sh`.** #47 is the oldest numbered item still open.
**v12.34: the template icon (#546, closing #432 and #510).** He chose the STAMP — dashed master, solid
copy — from five drawn options. Fourth attempt at this icon, first one he picked, and the difference is
that he could SEE them: #432 "put four options to him" in words while the drawings sat in a local file he
cannot open from a phone.
🔒 **STANDING RULE ADDED (#545, and it is in CLAUDE.md + memory too): use Claude Design for every design
request.** In practice that means DRAW OPTIONS AND SEND HIM A PICTURE before anything visual ships. There
is now a **FreeMotion Design System** project on claude.ai (id `8c7114b7-9b3b-488b-92ae-afc0e6753f92`)
holding `icons/template-icon.html`. ⚠️ Do NOT hand-copy the app's icon set into it — a design system that
drifts from the code is worse than none; it has to be generated from `js/addmenu.js`.
⚠️ **Two lessons from building it.** (1) I first hid the master behind a copy filled with `var(--panel-2)`
— correct only on a tile that happens to be that colour. **An icon that is only right against one
background is a bug waiting for a theme.** (2) An old test asserted #375's frame+crossbar+block as
anatomy; retired, exactly like #384's identical-＋ test. **A test encoding a design he has since replaced
is noise, not protection.**
**NEXT: #542**, diagnosed and ready — `if (isLib) perPage = Math.max(1, 3 * COLS)` forces Media/Audio to
three rows whatever the height, and three was measured on a 390px phone.
⏸️ **PAUSED FOR DESIGN WORK AT HIS REQUEST (#544).** He picked the icons (#543) and both shipped in
v12.33. Ask him what is next before resuming the oldest-first list.
**v12.33: the Add menu's two odd tiles.** AI Scene was the ONLY `emoji:` entry in the menu; now a drawn
sparkle pair. Sample clip's "lines going through it" was endpoints, not artwork — the crossbar spanned
`x=4→20`, the box's own edges, and ico()'s ROUND linecap grew every end 0.9px past them.
⚠️ **Two process notes from this one.** (1) The browser served a CACHED `addmenu.js` and the new icon
read as missing — the `?v=` bump is what fixed it, exactly as CLAUDE.md warns. (2) My first test demanded
viewBox+stroke-width from EVERY tile and went red on 47: the SHAPE tiles use icoPoly at each shape's own
aspect ON PURPOSE (queue 159). **A test asserting a rule the app never had is not a safeguard.**
**NEXT once he says go: #542**, the Media and Audio menus broken on PC.
⏸️ **THE LOOP IS PAUSED AT HIS REQUEST — he asked to do design work together (#544).** Not stopped, not
cron-deleted (rule 8b): waiting on him to say WHICH things. Resume the oldest-first list after that.
**v12.32: the timeline froze mid-drag (queue 541)** — a ≡ reorder whose pointer was LOST left the rows
carrying their parting transforms (exactly one row height, so rows stacked) AND `rebuild()` refuses every
rebuild while a gesture flag is set, so nothing cleared them, for the whole session. Fixed by making a
REFUSED REBUILD notice a gesture that has gone quiet, which covers all five drag types rather than the
one way in I found. ⚠️ My first version cancelled on `buttons === 0` and reddened two trim tests; I did
NOT edit those tests to suit it — bending a passing test to fit new code, on an assumption about input
devices, would have risked killing trimming for him.
**NEXT: #542**, the Media and Audio menus broken on PC — logged, reproduced only from his screenshot.
**v12.31: Text Spacing gained word spacing + line height** — named "still open" in the oldest entry and
left for months because it is a layout change, not a slider. Both default to a no-op so old projects do
not move. Follow-ons that mattered: the wrap cache is keyed on word spacing; curved text adds the gaps
back by hand (a LONE space does not pick up word spacing — measured); and a missing param now reads as
absent rather than 0, which had collapsed the line height of every existing instance.
⚠️ **mutate.sh gained a fourth gate: it refuses when the mutation changed NOTHING.** It had reported
"SURVIVED — the assertion is DEAD" about a healthy test, because `$(cat …)` truncates at a NUL byte and
both strings collapsed to the same prefix. **A false SURVIVED is as expensive as a false CAUGHT** — it
sends you to rewrite working code.
**v12.30: Turbulent Displace 151.3 → 35.8 ms (4.2x)** — the last effect over 150 ms, and the only thing
still actionable in the OLDEST entry ("editing lags"). Field built on a coarse lattice once a frame,
read back with Catmull-Rom. ⚠️ **My first version used LINEAR interpolation and was out by 9.9 px** — the
dev probe `tests/_tdbench.html` caught it, the suite did not, because the suite compared the two paths
against a bound I had reasoned my way to instead of measured. **Reason about smoothness, then measure it.**
**Last tick: #456 + #507 shipped** — the two rainbow ＋ buttons are now cool (home, hue-drifting) vs warm
(in-project, turning AND breathing on a different period). They had been the identical ramp and the home
one was not animated at all.
⚠️ **A test I had written demanded they be IDENTICAL, and that is part of why this sat four days.** Queue
384 said "siblings"; I encoded that as *the same conic gradient*, which is an inference, not his words —
and it then guarded against what he asked for on 21 Aug. **Lesson now recorded in #507: a test that
encodes MY reading of a word must say so in its comment**, or the next session reads it as his instruction.
Still open on the ＋: option A as pitched was "warm + counter-sweep"; the counter-sweep needs a third layer
(disc and specular already own `::before`/`::after`), so I shipped warm + breathe. If he says it still just
spins, the counter-sweep is a small follow-up, not a redesign.
**✅ LIVE DEPLOY RE-VERIFIED END TO END, 24 Aug at v12.20** (the previous claim was v11.50, twenty releases
stale). On the real Pages URL at 380px: boots, service worker controlling, all 71 assets served from cache,
running version matches the HTML, renders a layer WITH an effect, and produces a real MP4 — `3 KB · 0:01 ·
320x400 · 24 fps` with a correct poster — in about a second. Localhost behaves identically.
**⚠️ THE "EVERYTHING IS BLOCKED ON EZRA" READING WAS WRONG, and rule 8b called it.** That audit concluded
every open entry needed a word from him. On 23 Aug a 60-agent adversarial review of the week's own work
produced **14 confirmed defects**, every one verified against an independent attempt to refute it, and every
one buildable without him — logged as **485–496**. An empty queue is a hypothesis; that is the second time
checking it has found real work. **When the queue looks blocked, attack the shipped code instead.**
Shipped since: v12.02 (Contour Lines walking a grow-only buffer — 3.1x on every frame, invisible because the
picture was identical), v12.03 (queue 480, the add-row drag, wrong for the THIRD time — row indices written
into a layer index), v12.04 (queue 481, the PC
effects browser dressed for a wide screen while docked in a 346px column).
**⚡ 24 AUG: EZRA SENT 26 REQUESTS IN ONE SITTING (498-523).** Log every one VERBATIM as it lands — he asked
twice. Work them OLDEST-FIRST; he said *"don't actually do a straight away"*. **Workflows are authorised
for any task that needs one** (his words, #516). 498-504 done. **505: the ELEMENTS half shipped v12.26 and his acceptance test passes** (tap, change, come
back — one element updated in place, no project, no workspace left). Design B won because A would have let
the boot orphan-sweep DELETE every element's media — that sweep keeps only files reachable from `fm.proj.*`.
**505 STAYS OPEN FOR TEMPLATES**, which still mint a project and still mint-then-patch on save back.
⚠️ **When discarding a workspace, switch away FIRST** — `discardDraft` refuses to delete the current doc, and
`remove()` would mint an Untitled instead. The test catches both orders. **The white-chrome look (501+503) is gated on `WHITE_CHROME` in js/app.js —
he asked to be able to undo it in one move, so keep 503 on that same switch.**
**ALL 14 REVIEW FINDINGS ARE CLOSED (485-496), plus 497.** `next.sh` now reports 1 actionable and 22 blocked.
**That is not a reason to idle — rule 8b.** Audited the blocked list by hand on 24 Aug: 425, 96 and the rest
genuinely do need a word from him. **The standing work that needs nothing from him is 482's MECHANICAL half**
(round 1 = dead slider range, round 2 = silent at defaults). Keep running rounds on new axes: Round 3 (v12.19) found that rounds 1-2 swept only
`FM._pixelFx` (105) and had never touched `FM._warpFx` (21) — **when sweeping 'every effect', walk BOTH
tables.** Both other round-3 axes came back clean: clipping-at-defaults (9, all hard-edged graphics by
design) and defaults-at-max (31, almost all Mix/Amount blends). Do not repeat those two. the lag report is now SOUND (489 v12.10, 491 v12.12, 493 v12.14) and the ask to him has flipped from 'hold off' to 'please tap it' —
that
block the one measurement only his phone can take, so they matter more than their numbers suggest.**
⚠️ **485 taught the general lesson again: a test that compares two runs is worth nothing until you can say
what would make them differ.** Its two runs were identical by construction. Before trusting any A/B
assertion, name the mutation it would catch — and then actually run it.
⚠️ **486 is the same lesson from the other side: A TEST THAT ASKS THE REAL ENVIRONMENT ONLY WORKS WHERE THAT
ENVIRONMENT DIFFERS.** Its first version probed the actual browser for H.265 — but the suite runs headless
with no H.265 at all, so every branch sat idle and a mutation restoring the bug SURVIVED. When a decision
depends on the platform, split the decision out and hand the test a fake platform. Both directions.
⚠️ **487: WHEN THE BUG IS A MISSING CALL, ASSERT THE CALL SITE, NOT JUST THE BEHAVIOUR.** The oversize warning
worked perfectly and was simply never asked on the boot path. A behavioural test would have passed against
the one caller that did exist. Three of the review's 14 findings are this shape — logic that is right and
unreachable — so for those, scan the source for the call as well.
⚠️ **CHECK COMPLETION WHERE THE APP SIGNALS IT, NOT WHERE YOU EXPECT IT.** Verifying the live export, I
watched `#export-overlay` and `URL.createObjectURL` and concluded — twice, on two origins — that export
HUNG at 'Encoding video 100%'. It had succeeded every time. The MP4 path deliberately ends on the
`#export-ready` card (queue 141) and creates no blob URL until Save is pressed, and `_exporting` stays true
while that card is up, by design. I nearly reported 'export is broken on the live site'. **The control that
saved it was running the same flow on localhost** — identical behaviour meant it was my probe, not the
deploy. Read the completion path before instrumenting it.
⚠️ **ONE TIMER, TWO QUESTIONS — queue 250.** The wheel path used a single 130ms constant for both "this
pull is stale" and "this flick already slammed". Tuning one retuned the other, and 130ms is shorter than a
mouse wheel's notch gap, so the easter egg was unreachable with a mouse for eight days while working fine
on a trackpad. **When one constant serves two purposes, name them separately before tuning either.** Also:
**test the input device he actually uses** — every previous check used trackpad-cadence events.
⚠️ **THE CLASSIFIER WAS READING ITS OWN STAMP — 14 ITEMS WERE UNREACHABLE (24 Aug).** `tools/status.sh`
writes a STATUS line into each entry FROM `classify()`'s verdict, and the blocked stamp it writes
("waiting on your answer") matches BLOCKED. So a blocked item stayed blocked forever regardless of what
was written under it — #456 stayed hidden even after Ezra chased it. Two fixes, both self-tested:
`classify()` now STRIPS `**STATUS:` lines before matching, and an explicit `UNBLOCKED` in the BODY beats
both the prose and `WAITING ON EZRA`. **Put such markers in the body, never in the status line — that
line is stripped.** ACTIONABLE went 13 → 27. `next.sh` saying "blocked" is a claim to audit, not a fact.
⚠️ **497: TWO BUGS CAN HIDE EACH OTHER, AND A LOOKUP THAT FINDS NOTHING REPORTS NOTHING.** A cleanup helper
closed `#cv-dialog`, which does not exist (`#canvas-dialog` does), so it left the dialog open over the editor
for the rest of every run — and a second test's stray inline `display:none` on that same dialog covered it up
while causing its own 0x0 mystery. Neither had a symptom until something unrelated failed. There is now a
check that every id the suite reaches for exists somewhere, with an explained allowlist for the ones
deliberately asserted absent. **When a cleanup helper 'works', confirm it changed something.**
⚠️ **496: A LEAKED CAPTURE-PHASE LISTENER LOOKS LIKE A BROKEN FEATURE.** The toast's Enter handler worked
perfectly in a browser and did nothing in the suite. Cause: a test removed the audio-reactive sheet's NODE
instead of closing it, leaving its `window` keydown listener — which calls stopPropagation on everything —
installed for the rest of the run. Every key in every later test was swallowed. **When a DOM event does not
arrive, look for a capture-phase listener above it before doubting your own handler**, and never tear down
a panel by deleting its element when it registered anything globally.
⚠️ **494: WHEN THE FRAME SIZE IS NOT YOURS TO SET, REPRODUCE THE CONDITION INSTEAD.** The suite's iframe
ignores an attempt to set its HEIGHT (innerHeight stayed 760), so 'check it at 375x553' cannot be tested
directly. Squeezing the CARD's max-height reproduces overflow on any screen and asserts the same property.
Pair it with a computed-style check for the thing the squeeze cannot see (here, the max-height itself).
AND: the numbers said the fix worked while the SCREENSHOT showed settings bleeding through the pinned bar.
**For anything about layout, look at it.**
⚠️ **491: IF THE TEST DOES NOT CALL THE APP'S OWN CODE, IT IS TESTING ITSELF.** The first 491 test pushed
samples into `playbackStats.errs` with its own inline copy of the collector's logic — so restoring the old
first-600 cap changed nothing it could see. Extracting `FM._noteSyncError` and driving THAT caught it at
once. The review flagged this same shape in queue 129, so it is a habit: **before writing a fixture that
manipulates state directly, look for the function the app uses and call that instead.**
⚠️ **490: WHEN A TEST FAILS IN THE SUITE BUT NOT IN THE BROWSER, SUSPECT LEFTOVER STATE — AND MAKE THE
ASSERTION SAY WHY.** `#cv-oversize` measured 0x0 only in the suite. Two earlier tests hide `#canvas-dialog`
with an INLINE `style.display='none'` that nothing clears (the app only toggles a class), so by the time a
later test opens it the element reports `hidden=false` and has no box. I lost a pass guessing. What ended it
was making the throw walk up the ancestors and name the one that is `display:none` — a diagnostic in the
assertion beat any amount of re-reading. Logged as queue 497, including the overlay leak it is masking.
⚠️ **488: A FIXTURE BUILT ON ASSUMED NUMBERS FAILS LIKE A BROKEN FIX.** Three separate own-goals in one item:
the blank-card check asked about ALPHA when the canvas paints an opaque background (so it never fires); the
test placed a 600px shape at 540,960 in a project a fraction of that size (off-canvas, looked like the fix
had failed); and it set `opacity` on the layer when opacity lives on `layer.transform`. **Read the project's
real dimensions and the real property names out of the running app — never assume phone-sized coordinates.**
All three were caught by mutation, none by reading.
**482 is a STANDING round-based project, not a blocker.** Round 1 (v12.05) swept all 345 sliders for dead range
and found two effects whose slider was locked in its own mode. `tools/fx-sweep.js` is the probe; its header lists
the four ways it lied on the first run. Only the SUBJECTIVE half (does it look good) needs a word from him.
✅ **The lag toast is now worth tapping** (489/491/493 all fixed). It unblocks five entries — 95, 125, 148,
202, 387 — on a measurement only his phone can take. Ask for it; do not let it drop off the summary.
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
