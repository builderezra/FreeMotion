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
**v12.58, 946 tests green, tree clean, `HEAD == ssh/main`.**
**v12.58 did #528** — the effects sheet re-pins to the canvas bottom when the canvas moves.
⚠️ **MEASURING FIRST IS WHAT STOPPED THIS BEING CLOSED AS "ALREADY FIXED".** At the moment of opening,
the sheet already sat **0.17–0.35px** under the canvas — at 380px AND his own 440px, on 1:1, 9:16, 16:9
and 4:5, both browsers. On that evidence "something fixed it in the last 32 releases" looked right and
was **wrong**. The gap opens when the CANVAS MOVES while the sheet is up, because the pin was computed
once and never again: 9:16 → 16:9 with the sheet open moved the canvas bottom 424.8 → 364.5 while the
sheet stayed at 425 — **60.53px**. A window `resize` did not fix it either.
**A "cannot reproduce" is a statement about the state you tried, not about the bug.**
Fixed with a ResizeObserver on the canvas (not a resize listener — the canvas changes shape without the
window doing anything, which is the 60.53px case) plus `FM.screen.watch`, torn down with the sheet, in
`FM.fxSheet` so all three browsers get it. Pin also floors instead of rounding: rounding leaves a
hairline half the time, flooring makes a gap **impossible** (seven shapes measured, −0.47 to −0.89).

🐛 **A CROSS-TEST LEAK I CAUSED, AND THE ISOLATION IS THE LESSON.** My first version of the test opened
the real browser inside a phone-width block — that starts the thumbnail machinery, and tiles baked at
the phone tile scale outlived it, so the NEXT test comparing a tile to its subject reported six effects
as "indistinguishable". Nothing was wrong in the effects. **Isolated by bisection rather than guessed:**
green at clean HEAD → still red with the ResizeObserver disabled → green with only the test BODY
neutered. That sequence pinned it on the test, not the fix; two earlier guesses (a stale thumbnail cache,
then the observer) were both wrong and cost a run each.
**When a new test turns an unrelated test red, neuter the test body before theorising.**
⚠️ It drives `FM.fxSheet` directly now and asserts `--fxb-top`, so it touches only the code the fix lives
in and drags no machinery with it.
⚠️ **And a phantom:** the first draft measured against the canvas at the harness's DESKTOP default and
reported a 21.13px "gap" — on PC the sheet pins to the INSPECTOR column (#397), so that compared two
unrelated boxes. It runs at phone width and asserts it is not in inspector mode.

**📥 #565 logged mid-tick** (25 Aug): *"Make it obvious that you can scroll on filter rows to show more,
like do the little dots at the bottom or sum"*. Design request → #545 applies. **The add menu already
pages sideways with dots (v2.39) — check that first and reuse it** rather than inventing a second
vocabulary. Waits its turn.
**v12.57 did #527** — removed *"No audio effects yet — add one to shape this clip's sound."*, which sat
directly above a button reading **+ Add Audio Effect**. Two lines, one fact.
✅ **The entry's "ask him before removing all three" resolved itself by CHECKING.** The Visual section has
no such line at all, and Behaviors carries a code note saying its own two explanation lines went for this
same reason at queue 346/378. Audio was the odd one out — removing it makes the three AGREE rather than
making it the exception, so there was nothing to ask.
⚠️ **Two hints elsewhere deliberately KEPT, recorded so a later sweep does not bin them as "the same
thing":** *"This filter is empty"* and *"Nothing on this cue yet"* say **where the effect will land** —
into this filter, onto this one cue — which their buttons do not. They carry information; the audio one
repeated its button. **Redundant ≠ short.**
⚠️ **The control is the load-bearing half:** "the text is gone" is trivially true of a panel that failed
to render, so the test proves the **+ Add Audio Effect** button is present in the same breath, and that
the stack is genuinely empty (the only state the line ever appeared in). Mutation-proven by putting the
line back.
**v12.56 did #526** — the play pill's outline now sits on the same lines as the buttons beside it.
MEASURED first: every `.tbtn` is a 34x34 box, 8px radius, border width **ZERO** — an invisible box —
while the pill was **24.5px** with a VISIBLE 1px border, so the only outline you can see was inset
4.8/4.7px from the boxes either side. Fix is the HEIGHT, not the border. After: **0.00px** top and
bottom at 380, 320 and 1280; digits centred both ways; desktop pill 0.00px off screen centre.
⚠️ **HEIGHT, NEVER WIDTH** — the CSS records that pinning a width pushed the desktop play control 3px
off centre and broke a v4.97 assertion. Mutation-proven (removing it → 17px pill, test names it).
⚠️ **One judgement call, put to him rather than buried:** "the lines on all the other buttons" could
mean their BOXES (34px, what I matched) or their ICON STROKES (a 21px band, measured). Went with boxes
because that is the entry's own contemporaneous reading of his screenshot and the only rectangular
target — and told him it is a one-number change if he meant the icons.

⚠️ **MY OWN TEST FAILED TWICE FOR THE WRONG REASON, and both are worth remembering:**
· It required EVERY `.tbtn` to share a top edge. In the harness the app boots wide and is then
  narrowed, and one control lands on a second line — real, noted in the entry, **not** queue 526. Now
  it measures against the buttons on the PILL'S OWN line.
· It asserted the pill shrink-wraps at phone width and failed at **226.6px** — which is EXACTLY the
  number the CSS comment already records from queue 509. Pre-existing, documented, and the reason
  `text-align: center` is in that rule. **The test was inventing a requirement nobody asked for.**
  Before adding a control, check whether the thing it forbids is already documented behaviour.
🐛 **And a landmine in my #525 test, fixed before it bit:** `projects.create()` OPENS what it creates,
and that test deliberately opens a third project so `discardDraft` is allowed — so it left the suite in
a different project with a different scene. It did NOT turn the suite red, which is exactly what makes
it worth fixing now. It restores `currentId()` in its finally.
**v12.55 did #525** — element drafts can be binned by hand, and the card says which kind it is. Uses
`discardDraft`, NOT `remove`: remove() opens another project or CREATES an "Untitled" when you delete
the current one, which would manufacture the very stray project #505 was about. The refusal on the
current project now speaks instead of reading as a dead tap.
⚠️ **The label deliberately does NOT claim to spot orphans, and that CORRECTS the entry's own wording.**
It asked to tell orphans from real edits — but a brand-new "Build a new one…" draft is created with
`{ elementDraft: true }` and no element id, *exactly* like a pre-v12.26 orphan. They are not
distinguishable. The honest line is "editing an element" vs "a draft", and both can now be thrown away.
**An entry's instructions are a hypothesis about the code, not a fact about it.**
🐛 The card was a `<button>` that needed to contain one — invalid nesting browsers resolve by dropping
one of the two. Now a `div` with `role="button"`, the same fix elementCard/projectCard already carry.
🔒 **ship.sh's open-item gate earned its keep:** the POLISH-LOG entry MENTIONED "queue 505" in
explanatory prose and the gate read that as a closure claim and refused. Reworded to "#505". Worth
knowing when writing a log entry that references a still-open item — say `#N`, not `queue N`.

**🟠 #524 IS REPRODUCED AND IS NOW A PICK-ONE FOR HIM — do not guess it.** Dragging a clip right
**CLAMPS**: measured with a 4s clip in a 4s project, `start` goes 1.51 → 2.93 → **4.00 and sits there
for seventeen more moves** while the finger keeps going; the project grows to 8s only on RELEASE.
⚠️ **The ceiling exists BECAUSE HE ASKED FOR IT** — `groupDragCeil` came from his earlier report *"when
you drag a layer to the right too far it breaks the project timeline… it just keeps going past the
timeline"*. **Two of his instructions disagree and they cannot both be fully satisfied**, so three
options with a recommendation are in the entry and in the summary he reads. Also measured: the per-move
path is deliberately cheap (sets `clip.style.left`, never rebuilds), so growing the project mid-drag
means moving the ruler and scroll width every frame — real work the current design avoids on purpose.
**v12.54 did #523** — the text edit screen closes the moment its layer stops being selected. A LIFETIME
bug, not a missing button: the editor binds to one layer and never noticed the selection move on, so it
sat orphaned, still demanding the blue tick (*"and it's kinda glitchy"*). Commits rather than discards —
tapping off already commits, and losing his typing would be a worse bug than the one being fixed; he
asked for the SCREEN to go, not the text.
⚠️ **THE LESSON IS THE SECOND HOOK.** `FM.selectLayer` is the named API and the obvious place — it is
where the crop tool and Isolate already self-close for exactly this reason. But **every layer CREATOR**
(`addAdjustmentLayer`, `addCamera`, a dozen more) writes `FM.scene.selectedId` DIRECTLY and then calls
`refreshAll()`, never touching `selectLayer`. A fix hooked only to the obvious API passes every deselect
case and still strands the editor the moment you add a layer while it is open. **When wiring a
"self-close on X" behaviour, grep for the direct writes before trusting the named setter.** Both hooks
mutation-proven, the second caught by exactly the creator case that argued for it.
⚠️ Two CONTROLS carry that test and matter as much as the closes: re-selecting the SAME layer, and a
plain `refreshAll()`, must both leave the editor open — otherwise a build that tore it down on every
refresh passes, and that is unusable.
**v12.53 did #522** — on a phone the ≡ reorder handle is no longer built while a layer is selected. His
own reasoning was the implementation note: `soloLayerId()` already means "phone, exactly one layer
selected", and in that state exactly ONE row is drawn, so the handle has nothing to reorder against.
Measured at 380px: nothing selected → 3 rows/3 handles; selected → 1 row/**0 handles**. Desktop asserted
UNCHANGED, because *"this was only mobile"* is his scoping. Mutation-proven.
⚠️ Not hidden with CSS: a `display:none` handle still carries a live pointerdown listener whose gesture
reasons about `statics`, which in solo view is empty — the one case that code calls out as having
nowhere to drop. Not creating it removes the state instead of covering it.

🔧 **AND A SAFEGUARD THAT WAS STRUCTURALLY INCAPABLE OF FIRING — worth reading, because it is the exact
failure mode this project's culture is built to prevent.** v12.53's own commit message shipped with
*"reasons about , which"*: a word in backticks was executed by the CALLING shell as a command
substitution and deleted. ship.sh has had a backtick gate for months, written after this exact accident
— and it stayed silent, because **the substitution happens before the script is invoked**. By the time
the text reaches `$1` there is nothing left to detect. It only ever caught backticks that survived
quoting, which is not how the mistake happens.
**A gate that reads like protection and cannot fire is worse than none, because it stops you being
careful.** Fixed by removing the shell from the path entirely: `tools/ship.sh -F <file>` (or `-F -`)
reads the message as bytes. The gate now applies only to the argument form — on the `-F` path a backtick
is an ordinary code quote and refusing it would break the safe route. Proven by shipping the fix through
it with backticks in the message and confirming they survived.
**v12.52 worked #215** — the export that comes out silent. ⚠️ **AND IT CORRECTED THIS ENTRY'S OWN
CONCLUSION.** His "no message" answer, plus reasoning stated three separate times in the entry, said
*neither toast + silent file = THE MUXER*. Measured (`tests/_q215mux.html`, which walks the MP4 box tree
and then DECODES the audio back): the muxer is healthy — a normal export writes 22 audio samples peaking
at 0.4038. **The inference was sound and the conclusion was wrong.**
**SAMPLES ARE NOT SOUND** was the missing question. Every check in the mixer asks whether a clip reached
the mix; none asked whether the mix makes a NOISE. A `muted` layer, or one at volume 0, passes all of
them — not hidden, decodes, overlaps — so AAC encodes a full track of which every sample is zero.
Measured peak 0.0000 against the control's 0.4038. Worst of the three: **soloing a SHAPE** silences every
soundtrack in the project, because solo is project-wide and a shape has no audio to solo.
All three now name themselves; the healthy control still toasts nothing, which is what stops a diagnostic
becoming the noise that gets ignored. Both new assertions mutation-proven (✅ CAUGHT ×2).
🐛 **Nearly shipped a contradiction:** the AAC probe's success branch does `_audioTrackDropped = null` and
runs AFTER `buildAudioMix`, clearing the new flag one line before anything could read it — while the toast
still fired. Screen saying one thing, flag saying another.
⚠️ **#215 is deliberately NOT ticked.** Three real paths fixed, none PROVEN to be his. Ticking it would
claim something unsupported. It is back to NEEDS-YOU on one line: *export something with sound — does a
message appear?* Silence with still no message is genuinely new evidence.
⚠️ **A cache trap that cost a cycle:** the diagnostic reported IDENTICAL output before and after a real
fix, because the iframe loads `../index.html` and a CACHED index.html pins every module to the previous
`?v=`. The fix was on disk; the page ran the old code. Harnesses that load index.html must bust it.
**v12.51 did #521** — dropping a layer BELOW the add row on PC. **The interesting part is why three
earlier fixes missed it: #357, #443 and #480 were ALL measured at 380px**, the one width where the add
row is a full-height track row and the drag's uniform-`slotH` arithmetic is correct. On PC it is a 7px
LINE, so it was handed a 43px slot it does not draw and every row below it sat ~34px above where the
model put it. Measured at 1280px, marker after 2 of 4 layers: the whole band from the line down through
three quarters of the next row dropped the layer ABOVE the marker; landing below it needed the finger
two rows lower. Rows carry their own measured pitch now, and the drop applies the same marker index
`FM.dragAddAt` had shown live since #438 — the switch read 1 while the drop wrote 2, so the preview and
the result had been disagreeing on screen the whole time.
⚠️ **The lesson generalises further than the fix: a test pinned to one width can only defend that width.**
The old guard asserted `atPhoneWidth(…, 380)`. The new one uses a new `atWideWidth` helper and **refuses
to run if it finds the add row full-height**, so it cannot quietly measure the wrong layout.
🐛 **It exposed a latent bug too**: the new geometry makes a cancelled drag cross a gap it previously did
not, opening a live order preview that `cleanup()` cleared without asking for a repaint — the canvas kept
showing the order you almost dropped into. Fixed, mutation-proven (✅ CAUGHT).
🔧 **Tooling, and this one cost 40 minutes today:** `tests/_cdp.py` does NOT start a server, it assumes
one is on the port — stated only in a docstring. Point it at a dead port and it hangs for the ENTIRE
timeout, then reports `"ok": false` with no failures, which reads as a broken suite. It HTTP-probes first
now and fails in 0.1s naming the reason. `ship.sh`/`mutate.sh` got real headroom (the suite has outgrown
the old 600s default), and ship.sh distinguishes **"the suite did not run"** from **"a test failed"**
instead of printing SUITE IS RED with an empty list beneath it.
⚠️ **Also: I nearly destroyed this file.** A regex meant to replace this block matched to the next `###`
heading — 46KB below — and deleted the lot. `git checkout` restored it. This section is a running LOG,
not a short block; edit it with exact anchors, never a range match.

*(history below)*  **v12.50 — 937 tests green.**
**v12.50 did #520** — PC font list. Before: rail 538px wide holding **987px** of cards (~450px hidden off
the right) with **244px of window empty below**. After: grid, 11 fonts over 3 rows, no sideways scroll,
popover 90→220px so only 12px empty, scrolls vertically. **Phone asserted UNCHANGED** (still flex, one
row) — "only for PC" is his scoping and a silent phone reflow would be a regression.
⚠️ The height cap lives in JS beside the "Aa" sheet's, because the room below depends on where the card
landed. That code's comment said Aa was the ONLY popover safe to cap — true until now — so the comment
was updated rather than left contradicting the code.
✅ **#215 IS UNBLOCKED — he answered on 25 Aug:** *"I don't think I got a message saying no audio"*.
**No toast.** That kills the memory theory (a mix that OOM'd would have thrown and spoken) and rules out
all five previously-fixed causes. Neither toast + a silent file is defined three times in that entry as
exactly one thing: **the MUXER**, the only part of the path with no witness.
**⚠️ THE READY QUEUE IS THIN AND THAT IS A REAL FINDING, not a reason to stop (rule 8b).** Audited by
hand this tick: all three UNNUMBERED items are NEEDS-YOU / NOTE / HELD, and every numbered item from 47
to 469 is BIG, NEEDS-YOU, a NOTE or HELD — **sixteen waiting on him**. #95 was re-read in full to check
the classifier was not over-blocking: it is genuinely blocked (it needs a perf number from HIS phone, and
v11.83 made the app offer to produce one). #474 classifies as READY but is a standing STEER, not a build
item. **So the first buildable numbered item was #522, and after it: 523, 524, 525, 526 …**
**NEXT: #529** (multi-selecting effects worked once and is broken again) — #524 is parked on his pick,
not skipped.

**Previously — #215** — was the oldest genuinely-ready item, CHECKED rather than assumed: `next.sh` lists
everything ahead of it (47, 95, 96, 98, 125, 129, 148, 202, 206) but each is BIG, NEEDS-YOU, a NOTE or
HELD. First move is a NORMAL-sized export whose muxer output is inspected directly, **not** a reproduction
at his heavy 2160/60 settings, which is what the entry used to say and is now known to be the wrong end.

**🎨 #564 LOGGED 25 Aug and OPTIONS ARE WITH HIM** — the Outline & Shadows sub-panel: *"The function of
this section is good it's just the form I hate, make it actually look good"*. Five bare checkboxes with a
big empty area under them. Three options drawn at 380px in the app's palette and sent
(`scratchpad/564-options.html`): **A** cards with a glyph + plain-English hint + toggle (recommended),
**B** compact list with a preview tile, **C** two-column tiles. **His pick is the blocker — nothing ships
without it (#545).** The BUILD waits its turn; only the decision was pulled forward, because he was at the
keyboard and #545 requires the pick to come from him.
⚠️ **Scope trap noted in the entry:** those rows come from the SHARED `checkRow()` (15 call sites), so the
new row type must be ADDITIVE or ten unrelated panels change without him asking.
**v12.49 fixed #519.** `body.text-editing #inspector-panel { display:none }` existed ONLY in the phone
media block; PC never had it, so 9 cards sat live behind the editor (measured at 1280x820). Now 0 while
editing, restored after, inspector column collapsed so the timeline widens. **Checked FIRST that the
editor is not inside that panel** (`.te-panel` floats at 360,430) — the test asserts the editor survives.
🔴 **#215 (export with NO AUDIO) HAS HIS EXACT SETTINGS NOW** — MP4 / 2160 / 60fps / High / whole project
/ all layers, on his PHONE. Heaviest export the app offers, which is the ground v11.67 predicted.
**ONE QUESTION DECIDES THE FIX AND IT IS ASKED IN THE STAMP: did he see the "exporting WITHOUT SOUND"
toast?** No toast → audio lost on a path that still reports success (the drop report is lying). Toast →
the mix is OOMing at 2160p/60 and it is a memory fix. **Do not guess; they are opposite fixes.**
**📝 Also logged: #562** (sound-effect previews silent — suspect an AudioContext created before a user
gesture, so it starts suspended), **#563** (add a bell — do it with 562, since testing it means playing it).
**NEXT: #520** (PC font list should fill the space below and scroll vertically).
**v12.48 closed #518.** Half of it was #517 (shipped v12.47). The rest: the card grid solves row height as
`(band − 88 chrome) / 3`, and TEXT is the one type with an extra 48px `.tts-row` — uncounted, so the grid
overflowed **46px at every band height**. Now `--insp-extra` (named, not folded into the constant); text
fits from band 260 up (cards 41→55→68) and at the floor band it scrolls rather than hiding anything.
⚠️ **First attempt used `:has(#tts-row)` — it is a CLASS not an id, so it matched nothing.** Caught by
re-measuring instead of assuming the fix landed. Mutation reproduces the 46px exactly.
⚠️ **The test walks EVERY layer type on purpose** — the bug was a constant going stale when the panel
gained a row, so the guard must catch the NEXT such row, not this one.
**NEXT: #519** — while the text editor is open, the option cards behind it should not be there at all
(he says tapping one bugs it out). Same panel, same screenshot as 518.
**v12.47 fixed #517** — and "clipping" was literal. `.cat-card` had `overflow: hidden` (so long labels
could not stretch the tile) while its colour ring is a `::before` at `inset: -1px` — a DESCENDANT one
pixel outside the padding box, so the card clipped its own ring; radius 11px against a 10px clip sliced
the CORNERS square while the edges survived, which is why it looked like a render fault. Crop moved to
`.cat-label`; long labels still crop (70-char label → tile unchanged at 48px). Mutation-checked.
⚠️ **His diagnosis was half right:** the two glows are on DIFFERENT pseudo-elements (`::after` = cursor
ring, `::before` = colour ring), so they never overwrote each other, and the blue gradient already fades
~220px from the pointer. The clipping was what made it look like a fight.
⚠️ **Could NOT verify the blue ring moving** — its opacity is a CSS TRANSITION and the preview pane does
not advance transitions (same limitation as the Director panel's slide). Said so in the entry; that half
stays open if he still sees it.
**NEXT: #518** (the menu shown when text is selected is bugged).
**v12.46 did #516** — the selection group's black slab became a hairline outline over a 4% lift, and the
bin is neutral at rest / red on hover+press. Both chosen by HIM from pictures rendered with the REAL
buttons (#545 working exactly as intended — he also asked me to explain the slab question again, so the
second pass pointed at it in a screenshot of the app).
⚠️ **BOTH REVERSE HIS OWN EARLIER INSTRUCTIONS, and THREE existing tests went red defending them:** the
slab was dark because he asked for darker (and #425's "too subtle"); the bin was red because of #232
("red by default … so it's obvious"). **All three tests were RESTATED, not deleted** — each keeps the
half that was never about colour (the group must read as ONE container by fill OR outline; the bin must
still carry a warning colour somewhere).
⚠️ **The PHONE bin moved too although he only named PC** — a test said "one red for one action across two
layouts" and it was right; split behaviour is worse than either. **One line reverts either, on both.**
**NEXT: #517** (PC glow outlines look glitched under the buttons).
**v12.45 built #515** — paint-drag across the eyes. Key constraint: the old handler REBUILT the timeline
per toggle, which destroys the element the pointer is captured on; eyes are repainted in place and the
rebuild happens once. Paints one intent (not per-row toggle) and commits ONE history entry.
⚠️ **Three flaws in my own test, all caught before shipping:** (1) assumed `eyes[i] === layers[i]` — the
timeline lists layers TOP-FIRST, i.e. reversed; (2) dispatched at rows scrolled out of the timeline
viewport, unreachable by any real finger — it now asks `elementFromPoint` which rows are actually
hittable; (3) the Undo assertion rewound past the fixture, because the test pushed layers straight into
the scene — it commits a baseline snapshot first.
**📝 Logged today: 549-559** (11 requests). Two are one job: **#555 colours should keyframe** + **#557
Opacity has ◆ but no curve** → **the keyframe controls are applied unevenly; audit which rows have ◆ and
which have the curve, in one pass.** Also #553 (project-open glitch, ties to #508), #554 (filter preview),
#556 (delete should select nothing), #558 (lens flare colour), #559 (wipe sliders too coarse — MEASURE
where the visible change happens before retuning).
⚠️ #508 still needs a visible preview pane (rule 11).
**v12.44 did #513 + #535** (one pass, as #535's entry instructed). Toolbar was pinned to the window
bottom, 268px below the canvas. Real cause: drawing hides the timeline/inspector but the Studio grid
still RESERVED their 232px row — stage 628 of 860. Collapsed it; canvas 578px → 746px tall, bar docked
14px under it via `--fm-canvas-bottom` published from syncOverlay.
⚠️ **AN EXISTING ERASER TEST BROKE AND IT WAS NOT A REGRESSION.** `eraseAt`'s bite is
`stroke/2 + 14/dispScale()`, so a BIGGER canvas = smaller reach in project units = the eraser SPLITS a
stroke instead of swallowing it, and the count goes UP ("took -1 strokes"). Splitting is deliberate. The
test carried an unstated dependency on canvas size; it now widens the brush so it holds at any scale.
⚠️ **My own 513 test was DEAD once** — it compared `#stage` height to `window.innerHeight`, which the
harness page never satisfies, so restoring the reserved row survived it. Now asserts the GRID TEMPLATE.
**📊 List: 468 logged, 413 done, 55 open — 32 ready, 17 waiting on him, 4 notes, 2 unmarked.**
**📝 Logged this tick: #553** — leaving/re-opening a project leaves home AND the editor on screen at once
plus a black bar; almost certainly the two-phase push never completing. **Ties to #508.**
⚠️ #508 still needs a visible preview pane (rule 11).
**v12.43 fixed #514** (taken ahead of #513, same feature: #514 is an unusable-feature bug, #513 is a
layout redesign needing drawn options). Strokes after the first called `refitPathLayer` — pure data
mutation — plus a timeline rebuild, and **never asked the canvas to repaint**; the overlay is wiped on
commit, so the stroke was on screen nowhere until Done. One line: `FM.requestRender()`.
⚠️ **MY FIRST TEST WAS DEAD AND THE MUTATION CAUGHT IT.** I counted lit pixels via my own
`FM.renderScene` call — which repaints regardless of what the app did, i.e. measuring the MODEL. **The
data was always right here; that is why the bug survived.** Rewritten to watch the repaint REQUEST. Its
control then caught a second flaw: `addPathLayer` calls the LOCAL `refreshAll()`, invisible to a spy on
`FM.refreshAll`, so counting moved to the compositor.
**📝 Logged this tick: 549** (layer invisible at its exact end — inclusive/exclusive boundary; CHECK THE
EXPORTER AGREES), **550/551** (add-row outline should stop at the divider; row should end at project
end), **552** (continue a drawing + progression slider + keyframes = write-on).
**NEXT: #513** (sketching menu PC layout — design, needs options) or **#549**, which is a sharp bug.
⚠️ #508 still needs a visible preview pane (rule 11).
**#511 IS CLOSED (v12.38–v12.42).** "Inconsistent and random" was THREE bugs, all found by DRIVING the
drag through orderings rather than reading it: two ceilings 82px apart (v12.38); a raised menu stuck
floating with its handle hidden on selection (v12.39); and **either handle continuing to resize on stray
mouse moves after its pointer was lost** (v12.42) — the panel followed the cursor, 432→492→232px.
⚠️ That last guard is scoped to `pointerType === 'mouse'` ON PURPOSE — queue 541's blanket `buttons===0`
test reddened two trim tests and would have risked killing real touch drags.
**+ #547 (v12.42):** the Director panel sat at `top: 50px`, clearance for a `#topbar` that is
`display: none` on PC. Now `top: 0`; the "cut off" half measured fine at bands 150/232/560 — it scrolls.
**📝 #548 logged (design):** the four transport menus should pop OUT of their buttons with comic-style
tails + per-menu open animations, notepad getting its own. **#545 applies — draw options, send a picture.**
⚠️ #508 still needs a visible preview pane (rule 11).
**v12.40 worked #511 clause 3.** The Director panel was a full-height fixed rail **covering 38.7% of the
timeline** at 1280x820 — a lid over the track he works in. Its bottom is `--tl-h` now, so it stops at the
band and follows it when either resizer moves. Mutation: the full-height rail covers 62.7%.
✅ **Clause 4 shipped v12.41 — he chose PRISM**, the bold one, over the aurora I recommended. Three
options were screenshotted in the REAL panel first (#545). ⚠️ Two lessons: a conic gradient's
`transparent` stop drew a hard diagonal SEAM across a 376px panel — radials only, and there is a test
refusing conic here. And **he overrode my recommendation**, which is the argument for drawing options
rather than describing them: he could see it.
**Also open in #511:** clause 2's remaining sweep (interrupted drags, phone layout).
⚠️ #508 still needs a visible preview pane (rule 11).
**v12.39 worked #511 clauses 1-2** (the sweep he asked for). Drove the inspector drag through ORDERINGS
with invariants after each step instead of reading it. Found: 🔴 a raised add menu stays floating when you
select a layer — showing the wrong contents, handle hidden, **no way to lower it**; the rule was already
in the code but only enforced for resize/layout, not selection. Fixed on inspector.refresh, the one path
every selection runs through. Also deleted `fm_am_h`, written every drag and **read by nothing**.
✅ The sweep also CLEARED things: path independence holds (1 drag or 3 → 590px), a 10px nudge moves 10px,
clamps never violated. ⚠️ **One thing looked like a bug and is his own spec** (queue 244): dragging the
timeline past a raised menu re-couples them. Recorded so nobody "fixes" it.
**Still open in #511:** clause 3/4 — the AI director menu doesn't fit the PC layout and wants a
distinctive background. Clause 2 left: orderings with an INTERRUPTED drag, and the phone layout.
⚠️ #508 still needs a visible preview pane (rule 11).
**v12.38 worked #512** (taken ahead of #511 clause 1 because it is the same gesture family and names a
precise defect). **He was exactly right:** dragging the inspector alone capped at 508px while dragging it
with the timeline reached 590px — 82px apart on an 820px window. Two ceilings written down separately
(timeline 0.72vh, add menu 0.62vh) and the panel's FLOOR is `--tl-h`, applied with max() AFTER the
ceiling's min() — so raising the timeline first carried the panel past its own limit. Fixed by tying the
panel's ceiling to `FM.clampTimelineH` rather than copying the number. Mutation: 76px split returns.
**#511 is now partly explained** — clause 1's "inconsistent and random" has at least this concrete cause.
Clauses 2 (exhaustive sweep of the drag state machine), 3 and 4 (the AI director menu on PC) are open.
⚠️ **#508 still blocked on a visible preview pane** (rule 11 — check with a control before any timing work).
**NEXT: #511** clauses 2-4, or #513/#514 (sketching) if the pane is still hidden.
**v12.37 worked #509** — the timecode digits. He hedged ("not 100% sure") and the hedge was the accurate
part: on PC dead centre both ways; at 380px the pill stretches to 226.6px and the digits sat **71.1px
left** of it, because `#time-readout` had no `text-align` and inherited `start`. Fixed with
`text-align: center`, NOT a width — the note there records a pinned width once shoving the desktop play
control 3px off centre. Test asserts the property (widen the pill → digits stay centred) because I could
not get the stretched state back on demand; mutation reproduces it at **−70.81px** vs the **−71.11px**
measured live, i.e. the same mechanism to a third of a pixel.
⛔ **#508 SKIPPED, DELIBERATELY, AND IT IS THE MORE IMPORTANT NOTE.** It is a smoothness item and the
preview pane was HIDDEN: `document.hidden` true, rAF 0 frames in 1.6s, control animation never advanced.
**Rule 11 updated** — v11.68 measured hidden FALSE, 24 Aug measured TRUE, so the pane VARIES and the rule
is the control, not either answer. When it comes back hidden, skip the timing work and say so.
**Queue reading, since three of the four oldest are blocked on him:** #47 (worker move + a phone call
interrupt), #95 and #125 (both want the lag readout tapped once on his phone), #96 (wants the mp3),
#98 (wants a photo of the iOS keyboard bar). 33 of 59 open items are READY; oldest actionable now #511.
**v12.36 worked #96** (after #47 last tick and #95, which is genuinely blocked on a number from his phone).
**A THIRD cause for "the song won't play at all": the clip could be born with duration 0.** The import's
bogus-length branch (element says Infinity/NaN/0) was written for phone recordings and applied their
seek-to-the-end trick to audio too; when it lands nothing it recorded 0, so the clip had no length and
play did nothing. Audio now asks the DECODER first — already known to be 24x faster and righter (queue 72:
26.384s in 25ms vs 13.453s in 600ms), just never wired in here. Video keeps the old route, with a control.
⚠️ **The test fakes the ELEMENT, deliberately.** Chromium recovers a correct 3s from every malformed WAV
buildable in-browser (data size 0 and 0xFFFFFFFF both tried), so no synthesised file can provoke the lie.
The FILE is real and goes through the real decoder. Mutation-checked: removing decode-first returns 0s.
**Still open in #96:** cannot prove it was HIS bug — the file itself is still the useful thing.
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
