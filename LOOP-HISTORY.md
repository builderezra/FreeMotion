# LOOP-HISTORY.md — the tick-by-tick record, moved out of LOOP.md

**Why this file exists.** LOOP.md is read at the START OF EVERY TICK. It had grown to 124 KB / 1,439
lines, 33 of those entries being a narrative of one day's work — so every tick was re-reading a day of
history to find a handful of rules. The durable lessons were distilled into LOOP.md's
"WHAT THE WORK TAUGHT" list; the full accounts live here, unedited, because the reasoning behind a rule
is often worth more than the rule.

**Nothing here is deleted, and nothing here needs reading to work the loop.** Come here when a rule in
LOOP.md looks wrong or arbitrary and you want to know what it cost to learn.

### 23 Aug — the phone sweep and the lag soak both came back CLEAN, and that is the finding
Two negative results, both worth not repeating:
1. **Phone-width layout sweep, 380x820**, over home / editor / layer-selected / all five ADD tabs /
   export dialog, looking for controls off the edge (the #431 class of bug). **Zero genuine hits.**
   Every apparent hit was the INSTRUMENT: elements inside horizontal scrollers (the shape pager
   is *supposed* to have its next page off-screen), and a stale DOM driven through many clicks.
   **The trap worth knowing: there are TWO `.addmenu` nodes** — the live one under `#add-sheet`
   and a by-design copy under `#inspector` — so a bare `document.querySelector('.addmenu')` grabs
   the off-screen one and every measurement taken from it is a lie. It cost several probes here.
   (App and suite code are clean: every real lookup is scoped to a host. Only ad-hoc probes are at
   risk.) Open/close x6 leaves the node count EXACTLY flat, so the second node is not a leak.
2. **"Editing lags, and gets bad fast" — no third accumulation exists.** Numbers in REQUESTS.md
   under that entry. Tap cost flat at 2.3 ms out to 40 layers, heap flat at ~9 MB, zero node growth
   over a 40-round soak. The editing path is not the lag; per-effect compositor cost on real video
   is, which is where v11.72-v11.78 already went.
**So the remaining lag work is effect kernels, not the editor.** `turbulentdisplace` (~157 ms) is
the last real hog. Do not re-soak the editing path — it has been measured.

### 23 Aug, v11.83 — the four lag entries were never blocked on measurement, they were blocked on TAPS
#95, #125, #202 and the unnumbered editing-lag item all end on the same sentence: *needs a number from
HIS phone*. The tool that produces that number (`js/perf-probe.js`) has existed for weeks, is well
built, and had **never been run** — because it sits inside App settings, four taps deep, behind a cog
that opens a canvas dialog first. Nobody was ever going to find it mid-lag.
**The lesson worth keeping: an entry that says "waiting on him" is a claim about HIM, and it is worth
checking whether it is actually a claim about the UI.** Rule 3 says read the file before building; this
is the same rule pointed at a different thing — read what already SHIPPED before believing an entry.
v11.83 has the app offer the measurement itself when the quality ladder is spent and frames are still
late (once per session, playing only, sustained). **What is now genuinely outstanding is one tap from
him**, and that is a much smaller ask than the one that has been sitting there since 14 August.

### 23 Aug, v11.84 — the lag family has no effect over 150ms left
turbulentdisplace 148 → 76.8ms (1.93×), which was the last one the #474 sweep left standing. The idea
that worked is worth reusing on any per-pixel kernel: **check whether the expensive term is separable
before assuming it is per-pixel.** Half of this one's noise depended on the column and the row
independently, so the angle-addition identities turn eight transcendental calls per pixel into five
numbers per column and five per row. `drawWarpEffect` now supports an optional `mapFn.prep` for exactly
this; the other 28 warps ignore it.
**The remaining top-of-list effects are 50–100ms of genuinely per-pixel work**, where the honest answer
is the quality ladder (which #202 verified works), not another rewrite. So this family is done until
his phone reading says otherwise — which is what v11.83's toast is for.

### 23 Aug, v11.85 — GREP THE SOURCE BEFORE RE-ASKING HIM TO CONFIRM ANYTHING
#179 sat in his "waiting on you" pile for a week asking him to confirm a bug that had **already been
fixed**, and the fix was in `js/draw-tool.js` in a comment carrying HIS OWN QUOTE and the queue number:
*"STOP FIRST, THEN ADD (queue 179)"*. The entry's own guess (v7.35, a shared CSS rule) was wrong; the
real mechanism was that the docked panel anchors under the last timeline row, and `body.drawing` hides
the timeline, so the anchor collapsed to the top of the screen.
**This is rule 3 pointed one step further: an entry records what was ASKED, and the SOURCE often records
what was done.** Re-verified on the real route (tap points → Done) at 380x820 before closing.
⚠️ **I checked whether this could be made structural and it cannot, honestly** — 17 of 26 open entries
are named in some source comment, so an automatic "the code mentions this" flag would be ~65% false
positives, and a gate that cries wolf gets ignored (the exporter's own diagnostics note says the same).
So it stays a habit with a one-line cost: `grep -rn "queue <n>" js/` before re-asking him.

### 23 Aug, v11.86 — WHEN AN ENTRY IS BLOCKED ON HIM, CHECK WHETHER PART OF IT IS BLOCKED ON ME
#129 (a screen recording that lands on the timeline with no picture) is genuinely waiting on one
observation from him. But re-reading it turned up a half that was never his: v7.62 diagnosed the file
correctly and put the sentence that HELPS — *re-export as H.264, or open it in Safari* — in
`console.warn`. **He reported it from a phone, twice.** The app worked the answer out and wrote it
where he could never read it, which is the original complaint one level up.
**So the pattern to run on every 🟠 NEEDS YOU entry: separate what needs his ANSWER from what merely
needs his CONFIRMATION.** The second kind usually has buildable work hiding in it.
v11.86 names H.265 at import instead of after 15s of silence, and puts the fix one tap away on the
toast. It fires only when the browser says it cannot decode HEVC AND the bytes carry `hvc1`/`hev1` —
three of the five assertions are controls, because **a confident wrong diagnosis on screen is worse
than the silence it replaces**. Reusing v11.83's tappable toast made this small; that is twice now
that the toast action has paid for itself.

### 23 Aug, v11.87 — A PARKED "SEPARATE, REAL QUESTION" IS A TODO, NOT A FOOTNOTE
#98 ended with *"whether that fallback SHOULD be aspect-aware for templates/elements is a separate,
real question — noted, not guessed at."* Not guessing was right; leaving it there was not. Followed up
this tick and it was a live bug: the default text size existed in TWO copies (Add Text computed
`min(W,H)/6.75`, the constructor fell back to a flat 96), and **"Reset Text" is implemented as a paste
from a pristine layer**, so the reset button was wired to the smaller copy — 96 instead of 160 on his
portrait projects, 96 instead of 320 on a 2880 comp.
**The general shape, worth checking for elsewhere: one value written down twice, where only one copy is
obviously reachable.** The unreachable-looking copy is the one that rots, and it surfaces through some
path nobody connected to it (here, reset-as-paste). Fixed by deleting the second copy rather than
syncing it — `FM.defaultTextSize()` is now the only definition and both callers use it.
**So: when an entry parks a question in its own text, that question is queue work.** Three ticks
running, the buildable half was sitting inside an entry marked 🟠 NEEDS YOU.

### 23 Aug, v11.88 — FOUR TICKS RUNNING, AND THE PATTERN NOW HAS A NAME
Every one of the last four ticks found real work inside an entry marked 🟠 NEEDS YOU, and three of them
were **the same bug in different clothes: the app worked something out and then failed to say it where
he could read it.**
· #129 — diagnosed an undecodable H.265 file, put the fix in `console.warn`. He reported it from a phone.
· #202 Finding 1 — his 12.2-megapixel project. The cap (v9.27) and the repair (v9.28) both shipped; the
  instruction to use them lived in REQUESTS.md, a file he does not read.
· #95/#125 — the "what's slow" readout existed for weeks, four taps deep, and had never been run.
**So the check to run on any entry that looks blocked: does the app already KNOW this, and is it only
failing to tell him?** That is not a question about him, and it is always buildable.
The delivery mechanism is the same each time — the tappable toast from v11.83, now used three times.
And each one keeps the same guard: **fire only when certain, once, never mid-export**, with the controls
outnumbering the happy path, because a confident wrong message is worse than silence.

### 23 Aug, v11.89 — the same pattern, now pointed at the REPORT rather than a toast
#148 has twice ended on a question only his ears could answer (is the scratchiness our rate controller
or the decoder?) while the "what's slow" report — the thing that now offers itself automatically —
covered frames, quality, canvas, project and device and **said nothing about audio**, with three of his
open reports being about sound. The number that settles it was already computed and simply not kept:
real WRITES to `playbackRate`, which is NOT trim decisions (`preservesPitch` makes a write a pitch
change). The report carries and INTERPRETS it now.
⚠️ **And the tick's real lesson: my first test was dead.** It injected `FM.playbackStats` to check the
report's wording, so deleting the counter left it green — it proved the report READS numbers and
nothing about anything WRITING them. **Injecting the state you are meant to be producing is the easiest
way to write a test that cannot fail.** The fix was a second test driving the real controller and
holding our counter against the element's own write count — non-zero, and never higher.
**So when a change adds a MEASUREMENT, there are always two claims: the thing is measured, and the
measurement is reported. One test cannot cover both, and the reporting one is the easy one to write.**

### 23 Aug, v11.90 — WHEN A FAILURE SPEAKS, ASK HOW EARLY IT COULD HAVE SPOKEN
#215 (a silent export) was already diagnosed and already speaking: v7.91 toasts *"this browser cannot
encode AAC"*. The gap was WHEN. It speaks during the export, so he finds out by having already waited
out a render. And the entry's own key sentence hands over the fix: **AAC support belongs to the BROWSER,
not to the project or the settings** — so it is knowable the moment the dialog opens, before he has
committed anything. The warning is a block in the export card now, not a toast, because a toast about a
render he has not started is gone by the time he presses the button.
**Generalising the last five ticks: the question is not only "does the app say it" but "does it say it
while he can still act on it".** A message that arrives after the cost has been paid is closer to a
receipt than a warning.
⚠️ **Two guards worth keeping in mind here, both from this tick:** the condition needs BOTH halves (a
browser that refuses AAC *and* a project with sound to lose), or every silent animation gets warned
about audio it never had — and audio rides the `'video'` layer type, so the natural `type === 'audio'`
check finds nothing, ever. Both mutation-checked.
*(The suite's no-double-quotes-in-test-names gate fired on me this tick and was right to — the name
would have truncated its own FAIL line in ship.sh. A structural guard paying for itself.)*

### 23 Aug, v11.92 — #478 fixed, and "oldest-first" resolved itself without a queue-jump
He reported three bugs mid-tick (478 black bar, 479 undo arrowheads, 480 dragging onto the add row).
All three were logged verbatim immediately and left at the bottom per the rule. **Then the rule picked
one anyway**: every item numbered below 478 is 🟠 NEEDS YOU / ⏸️ HELD / 📌 NOTE / 🔵 BIG, so **478 was
the oldest ACTIONABLE item.** Worth remembering — oldest-first means oldest among items that can be
worked, and when the top of the list is entirely blocked on him a fresh report can be next legitimately.
**The bug:** a raised add menu floats, pinned to the grid column measured at POINTERDOWN, and nothing
re-pinned on window resize — widening leaves bare `#app` showing (his black bar), narrowing overlaps the
timeline. The existing comment already knew the column moves on resize and had solved it for the wrong
moment.
⚠️ **Two dead-assertion mistakes in one tick, same family as the last one:**
· A mutation SURVIVED because the line I mutated (an explicit layout flush) was redundant —
  `getBoundingClientRect` already forces layout. **A surviving mutation can mean the CODE is
  redundant, not that the test is weak.** Deleted the line rather than leave it looking load-bearing.
· My first test called `FM._amRepin()` directly, so unhooking the resize listener passed it. **Testing
  the repair is not testing the wiring** — it fires a real `resize` event now. That is exactly the
  queue-148 counter mistake one tick earlier, so it is now written here rather than re-learned.

### 23 Aug, v11.93 — #479 done, and an OLD TEST stopped me shipping a new version of an old bug
His undo/redo arrowheads were 3.6 units against a 14-unit ring — 3.1px at the 21px these draw at. Made
them 5.4 (39% of the ring). **The suite then went red on queue 410's guard**, which exists because of
HIS OWN earlier report that *"the undoredo arrows are off… way too low down"*: growing the head upward
moved the glyph's ink centre to 11.18 against a viewBox centred on 12.
**So the fix was two changes, not one** — a bigger head AND the whole glyph shifted down 0.45 to keep it
centred. It now sits 0.37 off centre, slightly BETTER than the icon it replaces.
**The general point: when a visual change trips an old guard, the guard is usually a previous complaint
from him wearing a test's clothes.** Read what it is protecting before working around it — here,
"just make the arrow bigger" would have re-created a bug he had already reported once.
The new floor is written as a FRACTION of the ring, not an absolute unit count, so a later re-draw at a
different scale cannot silently drop under it.

### 23 Aug, v11.94 — #480, and the most useful lesson in weeks: TWO GOOD FIXES CAN COMPOSE INTO A BUG
He said *"I said this ages ago but you still cant drag stuff on top of the add layer it just teleports
it back under"*, and #357 (v10.05) and #443 (v10.82) were both ticked for exactly that. **Neither had
regressed.** 357 decided a drop on the marker means the boundary below it; 443 then made the visible gap
agree with that so the preview stopped lying. Each repaired what it was looking at, and TOGETHER they
made the position he wants unreachable — measured, both slots produced the identical order.
**The shared premise was the bug:** *"six gap positions have to map to five real boundaries"*. The add
row is itself movable, so the sixth position is real and is expressed by the MARKER moving, not by the
layer order changing. The case that looked completely dead — dragging the row directly below the marker
onto it — changes no layer order at all, so `moveLayers` no-ops by design and the row springs back.
**Three things to carry forward:**
1. **A ticked entry is not evidence.** He was right and two DONE entries said otherwise. When he repeats
   a report, reproduce it before reading the history — the history is a warning, not an answer.
2. **When two entries "fixed" the same thing and he still complains, suspect their shared assumption**,
   not a regression in either.
3. **An old test that goes red on a deliberate reversal gets UPDATED with the reversal and his quote in
   it, never deleted** (#443's test here, the same way #473 handled #358). What it protects — *what you
   see is where it goes* — survived; only the thing it measures against changed.

### 23 Aug, v11.95 — WHEN HIS REPORT IS A COMPARISON, THE INSTRUMENT MUST COMPARE
#387's lead is *"a video will playback fine when scrubbing but actually pressing play is a buggy mess"*
— an ASYMMETRY, and the strongest clue in any of his performance reports, because both paths draw the
same frames through the same compositor. The "what's slow" report was pooling play and scrub frames into
one median: the single number guaranteed not to show it. Split by context now, with the verdict written
out rather than left as arithmetic.
**The general form, and it applies to the whole 🟠 pile: read what SHAPE his complaint is.** "X is fine
but Y is bad" needs an instrument that measures X and Y separately; "it gets bad fast" needs one that
samples over time; "it's slow" needs a threshold. Three of the last ticks were spent making the app
report something it already knew, and this one is the same move applied to the report itself.
**Blocked-on-him status is worth re-reading after every one of these.** #387 clause 2 said it needed
*"a clip off his own phone or a screen recording"*; it now needs one tap, because the measurement moved
onto his device instead of asking him to reproduce it for mine.

### 23 Aug, v11.96 — IF A MESSAGE NAMES THE FIX, CHECK WHETHER THE FIX IS ALREADY BUILT
#392's text-to-speech panel is honest about its wall — the browser speaks but gives no way to record, so
the voice cannot be trimmed or exported. Its note ends *"or to record a voiceover yourself"*. **That
feature already exists** (`FM.voiceRec`, Add ▸ Audio ▸ Record voice…) and the panel did not link to it.
So the app described the solution and left him to go and find it, which is queue 129's console.warn and
202's fix-in-a-text-file wearing a third disguise.
**The check that keeps finding work: when the app tells him what to do, can it just DO it?** Three
separate entries now. It costs one button and pre-empts no decision, because pointing at something
already built is navigation, not a new feature — worth saying explicitly in the entry so a reader does
not think the pending choice was quietly made for him.

### 23 Aug, v11.97 — THE NUMBERED QUEUE IS GENUINELY BLOCKED, so the tick went to the bottleneck
Surveyed 395, 425, 429, 469 this tick looking for buildable halves and found none — they are real
decisions (469 in particular: growing the ◆ target risks taps meant for Back CREATING a keyframe, which
is his call and correctly refused). 425's "background too subtle" half already shipped at v10.63.
⚠️ **And one of my own readings was wrong before it was right**: I grepped the export dialog's formats,
saw only mp4/gif/frames, and nearly wrote up "audio export is unreachable" — the grep had truncated the
list and both WAV and M4A are there. Checked before acting, which is the only reason it is not in the
file as a finding.
**So the tick went at the BOTTLENECK instead: five entries (95, 125, 148, 202, 387) now wait on one
action — him tapping the toast and sending the report — and the last step of that was four taps deep in
App settings.** The comment defending that was half right: an AUTOMATIC clipboard write ten seconds
after the tap is refused for want of a user gesture. **A tappable toast IS the gesture**, so it copies
directly now, with the old route named as the fallback rather than failing silently.
**Worth generalising: when several entries queue behind one action, the highest-value work is removing
friction from that action, not the entries.**

### 23 Aug — DRIVING MY OWN CHAIN END TO END FOUND A HOLE THREE TESTS HAD MISSED
The queue is fully blocked, so the tick went to verifying the thing five entries now depend on, with
NOTHING stubbed, at 375px: sustained bad frames → offer toast → tap → a real ten-second sample →
"Measurement ready — tap to copy it" → 1,032 chars stored. It works.
⚠️ **The clipboard write is the one link that cannot be verified from here**, and the reason is worth
keeping: a script-driven `.click()` is `isTrusted: false`, so it confers NO user activation and the
browser refuses the write. The fallback fired and named the settings route, which is exactly its job. A
real finger tap does confer activation. **Do not "fix" a clipboard refusal seen from a synthetic tap.**
🐛 **And it exposed a real hole:** the offer test called `FM._maybeOfferPerfProbe`, which is a SEPARATE
REFERENCE from the one `notePlaybackCost` calls — so the call site was uncovered, and deleting it left
every assertion green while the app silently stopped offering to measure itself. Now driven through
`FM._notePlaybackCost` (the real function containing the call) and mutation-checked on that exact line.
**THIRD TIME for this shape** — queue 148's counter, 478's resize listener, this one. So, as a rule:
**a seam exposed as `FM._x = x` does not intercept internal callers of `x`. Testing through it tests the
function, never the wiring. Drive the outermost real entry point you can reach.**

### 23 Aug — I AUDITED MY OWN WEEK FOR THAT HOLE AND FOUND TWO MORE (both now closed)
Having written the rule above three times, the obvious next move was to check whether I had done it
again. I had, twice, in features shipped this same week:
· **v11.90's "this export will have no sound"** — test drove `FM._checkExportAudioSupport()`. Deleting
  the call from `showExportDialog` left it GREEN while the warning stopped appearing.
· **v11.88's "this project is 12.2 megapixels"** — test drove `FM.warnOversizeProject()`. Deleting the
  call from `projects.open()` left it GREEN while the app never warned him again.
Both proved by mutation BEFORE fixing, both now driven through the real entry point (open the dialog and
read the DOM; create two projects and open one), both re-mutated to confirm they bite.
**The distinction worth keeping, because it decides how to write the test:**
· a call through a PUBLIC property (`FM.warnOversizeProject()`) CAN be intercepted by a spy;
· a call to a MODULE-LOCAL function (`checkExportAudioSupport()`, `maybeOfferPerfProbe()`) cannot — the
  only honest observation is the effect (a DOM change, a counter, a toast).
**And the general lesson: a new warning/diagnostic is exactly the kind of feature whose absence is
silent.** Nothing breaks when it stops firing, so its call site needs the test more than its logic does.

### 23 Aug — audited the app's DIAGNOSTICS the same way, and #215's triad had a hole
Extending yesterday's audit outward: most of the app's "could not…" toasts sit on user actions he would
see fail anyway, so their absence is not silent. **The exception is the export triad**, which is the
whole of #215's diagnostic value — clip-naming toast = mixer, AAC toast = no encoder, neither + a silent
file = MUXER. Silenced each in turn:
· mixer toast — caught ✅ · AAC toast — caught ✅ · **encode-failure toast — SURVIVED** ❌
**Why that one matters more than an ordinary gap:** if it stopped firing, an encode failure would look
like "neither toast plus a silent file", i.e. the muxer — so a regression would not just lose a message,
it would misdirect the next investigation of his most serious open bug. Covered now by a real export
against an encoder that claims support and fails on configure.
**The heuristic that found it, worth reusing: rank diagnostics by whether their ABSENCE is visible.** A
failure message on a button he pressed is self-policing — he sees nothing happen. A message that
explains an outcome he cannot otherwise interpret (a silent file, a blank clip, a slow app) is the kind
that has to be tested, because losing it is indistinguishable from the problem not occurring.

### 23 Aug — THE DIAGNOSTIC AUDIT IS FINISHED. Result: 3 holes, all closed; the rest were sound.
Ran the whole sweep to its end so nobody repeats it. Every diagnostic whose absence would be SILENT,
mutated away one at a time and the suite run:
| diagnostic | verdict |
|---|---|
| struggle offer reaching the real cost path (95/125/148/202/387) | ❌ hole → fixed |
| "this export will have no sound" call site (215) | ❌ hole → fixed |
| "this project is N megapixels" call site (202) | ❌ hole → fixed |
| soundtrack **encode** failure (215's third leg) | ❌ hole → fixed |
| soundtrack **mix** failure (215) | ✅ caught |
| **no AAC encoder** (215) | ✅ caught |
| decode watchdog / first-frame repaint (129) | ✅ caught |
| every path that creates a video record wires the watchdog | ✅ all six do — checked, not assumed |
**Four holes in the app's ability to explain itself, three of them in features shipped this same week.**
⚠️ **One hypothesis of mine here was WRONG and checking beat assuming:** two call sites looked like they
attached a `seeked` listener WITHOUT wiring the watchdog — they both wire it, the lines were just
truncated in my grep output. Second time this week a truncated grep nearly became a finding (the export
format list was the other). **Read the whole line before believing a gap.**
**The audit is complete — do not re-run it. New diagnostics are what need this treatment now**, and the
rule for them is above: if its absence is indistinguishable from the problem not happening, the CALL
SITE needs a test, not just the logic.

### 23 Aug — #476's "could not reproduce" fell to ONE WORD of his that arrived after the investigation
The v11.77 pass looked hard and honestly failed to reproduce the intermittent card-sizing fault. His
follow-up sentence — *"when the timeline and add menu are split, only for when ur editing a layer"* —
names a state that pass never entered: it cycled the add menu OPEN and CLOSED, but never SPLIT it and
then selected a layer. Those are different states, and only the second leaves the panel floating on a
pinned width while the category grid is laid out from that width. Stale the pin by the 54px queue 478
measured and the cards go 99.7 → 81.7px: *"doesnt show the buttons at the right size"*, exactly.
**Two things worth carrying:**
1. **When he adds a clue after a failed investigation, re-run the investigation — do not assume the
   earlier "not reproduced" still stands.** The clue is usually the state nobody tried.
2. **A fix can close an entry it was never aimed at.** v11.92 was built for the black bar (#478) and
   removed #476's mechanism as a side effect. Worth checking recent fixes against stale
   "could not reproduce" notes before asking him for another screenshot.
⚠️ Reported at the confidence I actually have: I reproduced the MECHANISM by staling the pin directly,
not that user sequence end to end — a real resize collapses the raise here, so the panel un-floats and
the fault does not arise on that path. Said so in the entry rather than claiming a clean repro.

### 23 Aug — SEVEN open entries rest on "could not reproduce". Worked the best one; it held.
Listed them (96, 95, 148, 202, 361, 387, 429) and took #96, because its start-of-playback race had
never been soaked and the path has changed twice since (v11.70's warm-up gate, v11.89). Built a real
WAV in the browser and a real M4A via the app's own `encodeM4A`, then 40 attempts across four regimes —
including fresh-import-then-play-immediately, which is the race the entry predicts. **0 failures.**
**The finding is what it does NOT cover, and it is a genuine lead:** both my files decode promptly. His
"song" was almost certainly an MP3, and #96 already documents that a VBR mp3's `el.duration` is
UNSTABLE (11.210 → 15.752 → 20.297 in one second). A start race is far likelier against a length the
element is still revising. **And no browser can encode MP3 (that is all of queue 395), so the app cannot
manufacture the one file type most likely to fail — reproducing it needs his file.**
**Generalisable: when a soak comes back clean, the useful output is the list of conditions it could not
create.** A clean soak reported as "cannot reproduce" is nearly worthless; reported as "ruled out X, Y
and Z, and here is the one input I cannot manufacture" it hands the next session, or him, a concrete
next step.

### 23 Aug — the media sweep is BOUNDED, proven over 90 import/delete cycles
BUG-HUNT.md is at zero open items and the queue is blocked, so the tick went at the oldest entry's
remaining unmeasured half: "gets bad fast" as a MEMORY claim. The v8.44/v8.46 leak fixes had tests but
nothing checked they hold over a long session. Ninety cycles of import → place → delete → commit, with
real files: media held plateaus at exactly **60** and stays there (heap flat ~9 MB).
**60 is the right number, not a coincidence** — the undo stack caps at 120 entries, each cycle commits
twice, so 60 deletions are still undoable and keeping their media is DELIBERATE (freeing it makes an
undone delete come back blank, which is what made v8.44 hard).
⚠️ **The soak nearly reported a leak at cycle 32.** Records grew 1:1 with cycles — 16, 24, 32 — and that
looks exactly like unbounded growth. It was simply below the 120-commit cap; the plateau only appears
past it. **A growth curve measured entirely inside a cap is indistinguishable from a leak — find the
cap before calling it.** Same family as the truncated greps: measure past the boundary, or don't claim.

### 23 Aug, v11.98 — SEPARABILITY IS THE RECURRING WIN. Check for it before anything else.
Declined to start Corner Pin or LUT unasked — both are genuinely multi-tick, and the plan itself says
Corner Pin *"sliders alone would be unusable"*, so a half-build contradicts its own judgement. Went back
to his named priority instead, re-ranked the 21 warps, and the top one (Wave) was separable: its x shift
depends only on y, its y shift only on x. Two tables → **2.3× and BYTE-IDENTICAL**.
**That is now FIVE wins from one idea** (tiltshift, spinstreaks, the shared scratch buffer,
turbulentdisplace, wave). **So the first question about any slow per-pixel kernel is: does each
expensive term depend on only one coordinate?** If yes the win is exact and free; if it needs an
identity (spinstreaks, turbulentdisplace) it is close but not exact and needs a bounded assertion; only
if neither holds is it genuinely per-pixel work for the quality ladder to manage.
⚠️ **And my ranking sweep OVER-STATED the absolutes** — it sampled every third pixel and multiplied by
9, putting Wave at ~130ms when it is ~25ms. The ordering was sound and the sweep did its job, but the
numbers were not publishable. **Rank with a sample; quote from a full run.**

### 23 Aug, v11.99 — the sweep had only ever covered 21 of 126 kernels
The warp ranking covered WARP_FX. **PIXEL_FX — 105 more kernels — had never been ranked**, and that is
where the real cost was: Cross Process at 61.6ms for what is only a colour grade. Its curve does a
`Math.sin` AND a `Math.pow`, three times per pixel — **4.4 million transcendental calls a frame to
produce at most 768 distinct answers**, because the curve's only input is an integer 0-255. Three
256-entry tables → **9× and byte-identical**.
**Two things to carry:**
1. **Check the SHAPE of a kernel's input domain, not just its coordinates.** Separability (wave) is one
   case of a general question: how many distinct answers can this expensive expression actually have?
   If the answer is "256 per channel", it is a table. Six wins now come from that one question.
2. **When a sweep finds nothing, check what the sweep COVERED.** Mine had been ranking 21 kernels out
   of 126 for several ticks while I concluded "nothing over 150ms remains".
⚠️ **The empty-params dead control caught me a THIRD time** (turbulentdisplace, the element thumbnail,
now this): with `{}` params `evalProp` returns 0, the effect no-ops, and two untouched images compare
equal. **Any test that compares a fast path against a reference must assert the effect DID something.**

### 23 Aug, v12.00 — I called Lens Flare "genuinely per-pixel geometry" ONE TICK before halving it
That verdict was written into REQUESTS.md from the timing numbers alone, without reading the kernel.
Reading it took two minutes: **for every pixel it looped all six flare rays**, wrapped each angle with
two `while` loops and took a cosine, to find the ray the pixel aligns with. The rays are 60° apart, so
the nearest one IS the best — a single rounding. Six cosines → one. Then `pow(b,32)` → five squarings.
**71.2 → 36.0ms, byte-identical.**
**The lesson is narrow and useful: a timing number tells you WHICH kernel to read, never whether it can
be improved.** I have now written "the answer here is the quality ladder, not another rewrite" twice and
been wrong about a specific kernel both times. Rank by measurement; decide by reading.
**Seven wins from the same question now**, and the question generalises past separability: *how much of
this expression actually varies per pixel?* Six fixed rays do not. A 0-255 channel value does not. A
row index does not.
⏭️ zoomstreaks (67ms) and lensdistort (67ms) are next — and per the above, do not take my word that
they are irreducible without opening them.

### 23 Aug, v12.01 — A GUARD CAN BE WATCHING A THIRD OF THE FILE AND STILL GO GREEN
Opened lensdistort expecting per-pixel geometry and found its FIRST LINE was `d.slice()` — it had never
been in v11.76's sweep. Twelve kernels were in the same position, each allocating 5.6 MB per call. All
verified single-copy and read-only, then converted (Lens Distort 66.8 → 52.4ms, Edge 31.6 → 23.2,
Voronoi 34 → 30). Glitch stays off: two live copies.
🐛 **The interesting part is that the guard REFUSED the change, and was wrong.** Its scan required
`function(d,W,H,p,t)` with no spaces, so **it saw 52 of the file's 170 kernels** and attributed the
others' bodies to whichever kernel it had last matched — which made converting lensdistort look like
`timecode` held two copies. Its own sanity check was `if (ks.length < 20)`, which a 52-of-170 match
sails through.
**Two rules out of this:**
1. **A structural guard needs a sanity check calibrated to the REAL population, not to zero.** "Did I
   match at least 20?" is not a check, it is a formality. It is 120 now, and restoring the old regex
   fails that test by name.
2. **When a guard blocks a change, check the guard before the change.** The instinct is to assume the
   code is wrong — here the code was right and the instrument had been mis-parsing the file for weeks.
   Same family as the truncated greps, one level up: this time the faulty reader was a TEST.

### 23 Aug — THE STREAK ENDS HONESTLY: zoomstreaks hoisted, measured, REVERTED
Ninth application of the same idea, and the first that did not pay. Its ten taps recomputed two
constants each — twenty divisions per pixel, 29 million a frame, for ten distinct pairs. Hoisted them
into tables; **byte-identical**, as predicted. Then measured properly: **75.6ms with the tables against
68.4ms with the arithmetic inline.** Reverted.
**The boundary of the technique, now known:** hoisting pays when the hoisted thing is EXPENSIVE — a
`Math.sin`, a `Math.pow`, a 5.6 MB allocation. That is what all eight wins removed. **Cheap arithmetic
is already free: the JIT hoists loop-invariants itself, and a Float64Array load is not cheaper than a
multiply.** Do not hoist divisions and multiplies on the theory that fewer operations must be faster.
⚠️ **And the measurement lesson, which nearly shipped this:** the first reading was a SINGLE run,
67.2 → 66.0, which looks like a small win. Seven runs said the opposite. **A single-shot timing cannot
distinguish a 2% win from noise — and 2% is exactly the size of result that gets shipped without
scrutiny.** Median of several, always, before keeping or rejecting.

### 23 Aug — two kernels READ and found already correct, and the list of what is still unopened
Applied the boundary rule (hoist only EXPENSIVE work) to the next two candidates and found nothing to
do — which is the right outcome to record rather than to keep poking:
· **bumpmap** — its `cos`/`sin` of the light angle and the light vector's `sqrt` are all in the SETUP,
  before the pixel loop. The only per-pixel `sqrt` normalises the surface normal, which is real work.
· **fractalridges** — its one `Math.pow` is genuinely per-pixel AND guarded by `if (fr_sh !== 1)`, so
  the default path skips it. The comment there already explains the guard exists for byte-identity.
**Re-timed all 105 pixel effects at his size: median 10.8ms, 24 over 25ms.** ⚠️ Not comparable to the
8.57ms recorded after v11.78 — different params, different harness. **Per-effect before/after numbers
in this file are like-for-like; the medians are not, and should not be quoted against each other.**
**Still never opened: lensblur (69.6ms), linstreaks (65.6), clouds (49.6).** Those are the next tick's
candidates, and per the rule above the only way to know is to read them.

### 23 Aug — CAMPAIGN CLOSED, and the LIVE app verified for the first time
Read all three remaining hogs. **None is reducible:** lensblur, linstreaks and clouds have ZERO
transcendental calls inside their pixel loops (all the trig is already in the setup; clouds has none),
and linstreaks weights each tap by THE SAMPLED PIXEL'S OWN brightness — a non-linear filter, so the
sliding-window trick behind Tilt Shift's 10.5× cannot apply. Their cost is real gathers with
data-dependent weights.
**Final tally: eight wins, one measured rejection, vein empty. Do not re-rank the effects hoping for
another — the whole top five has been read.**
🌐 **AND A GAP IN MY OWN PRACTICE, closed:** every check for weeks has been against `localhost:8777`.
**The thing he actually loads is `https://builderezra.github.io/FreeMotion/`, and I had never once
tested it.** Did so at 375px: boots clean, v12.01, home screen and tabs and FAB all correct, **zero
console errors, nothing off-screen, no sideways scroll**, and every feature shipped this week present
(struggle offer, oversize warning, HEVC sniff, defaultTextSize, 105 pixel + 21 warp kernels).
**Worth repeating after any release that changes the file list** — a cache-buster or a missing file is
invisible on localhost and fatal on Pages. `curl | grep version` only proves the HTML deployed, not
that the app BOOTS.

### 23 Aug — the LIVE app now has a full end-to-end pass, not just a boot check
Went further than "it boots" on `https://builderezra.github.io/FreeMotion/` at 375px, because every
check for weeks had been against localhost:
| step | result |
|---|---|
| home screen, tabs, FAB | ✅ renders, no console errors, nothing off-screen |
| tap a project card | ✅ opens the editor (body class clears, timeline appears) |
| add a layer + renderScene | ✅ 53,398 non-black pixels |
| **run a real export** | ✅ **1,677-byte MP4, `ftypisom`, video track present, no audio track (correct — no audio in the project), 317ms, no errors** |
| editor at 375px | ✅ screenshot correct, v12.01, v11.93's bigger undo/redo arrows visible |
**The export is the one that matters** — queue 215 is the most serious open item and its whole subject
is the OUTPUT being wrong. It had never been run against the deployed build.
⚠️ **One false alarm, and it was mine:** my first "tap the project card" used `.proj-card`, which does
not exist — the class is `.hm-card` — so it clicked nothing and looked like the live app refusing to
open a project. **Found the element by its TEXT instead, and it worked first time.** Guessing a
selector is the same failure as the truncated grep and the too-narrow regex: three flavours of reading
the app through a broken lens in one week. When a basic interaction appears broken, check the selector
before the app.

### 23 Aug — the rule-8b AUDIT found a mis-classified entry, and it was a 🚨 one
Swept all 28 open entries asking "is this REALLY waiting on him?". **#460 was not.** It is marked
🟠 NEEDS YOU, but its own last line is *"NEXT STEP: instrument the four implementations"* — my step, not
his. Did it, and **the four 'genuinely dead' effects all work**: lightglow 1,575 changed pixels,
longshadow 2,370, channelremap 1,575, radialshadow 1,353 on ordinary artwork.
**My 21 Aug measurement was wrong for the reason that entry itself had already written down**, one step
further along: the shadows cast into TRANSPARENT space (a frame-filling rectangle leaves nowhere for a
shadow), and channelremap's default swaps RED and BLUE — on his `#cc22cc` magenta those are the SAME
NUMBER, so the swap is a no-op by arithmetic.
**And the suite had been disagreeing with that entry the whole time**: its no-op-at-defaults test lists
a DIFFERENT four (darkglow, replacecolor, hslbands, matchgrade). Nobody reconciled the two.
**Three rules out of this:**
1. **Run rule 8b's audit as "is this waiting on HIM, or on ME?" — not "is there a status field".** One
   pass over 28 entries found a 🚨 item whose next step was mine for two days.
2. **When a test and an entry disagree about the same effects, one of them is wrong and it is worth ten
   minutes to find out which.** The suite was right.
3. **A no-op result on a synthetic subject proves nothing about the effect.** I built a flat opaque
   magenta fill because it matched his screenshot — and reproduced his complaint AND the wrong
   diagnosis. Test on artwork the effect can act on, then on his subject, and report both.

### 23 Aug — audit finished: the queue IS genuinely blocked, and one stale pointer corrected
Ran the "waiting on him or on me?" sweep over every open entry with the tails correctly attributed.
**After #460 closed, every remaining open item genuinely waits on Ezra**, or is a standing note/held
item. So the loop is not hiding work behind a bad classifier — it is waiting, correctly.
**One correction found:** closed entry #471 ends *"a Custom rung on the export frame-rate list is still
genuinely not built and is the next thing to do here."* **It shipped at v11.55 as #141b.** Verified in
`index.html` (`#exp-custom-fps`, `#exp-fps-num`) rather than trusting the tick. **A "next thing to do"
written inside ENTRY A does not get updated when ENTRY B does the work** — so a finished job kept
advertising itself as outstanding for weeks.
⚠️ **AND MY OWN SCAN MISATTRIBUTED HALF OF IT FIRST — the fourth broken lens this week.** I split
REQUESTS.md on `- [ ] **` only, so each open entry's "tail" ran through every CLOSED entry after it. It
handed me a scrollbar-gutter fix as #342's next step (it belongs to #187) and the custom-fps note as
#387's (it belongs to #471). **Splitting on open headers only is not parsing the file, it is parsing
every other entry.** Redone splitting on ALL headers before acting on any of it.
**That is: truncated grep, too-narrow regex, guessed selector, and now a mis-split parser — four
readings-through-a-broken-lens in one week, none of which reached him because each was checked before
acting. The check is the habit that matters, not the instrument.**


---

# Earlier narrative, moved out of LOOP.md on 23 Aug (same reason)


**⚠️ 22 Aug — HE WAS RIGHT TWICE, AND BOTH CORRECTIONS MATTER MORE THAN ANY FEATURE HERE.**
*"you did not meet every task i believe, double check again"* and *"just check extra hard theres no
leftovers coz looking through uve missed a lot"*. Two independent audits (39 agents each, every claim put
through an adversarial refutation pass) proved him right on both counts.

**AUDIT 1 — the 34 OPEN entries: 19 have real buildable work.** My classifier said ZERO, for sixteen
ticks. It is regexes over prose; it cannot tell "clause 3 needs Ezra" from "the entry is blocked".
**`tools/_classify.py` IS A HINT, NEVER A PROOF. When it says 0, audit by hand.**
Full first-steps: `tools/.buildable-audit.json`.

**AUDIT 2 — the 243 CLOSED multi-part requests: 17 clauses were ticked DONE without being built**, 12 of
them buildable with no input from him. Full detail: `tools/.dropped-clause-audit.json`. This is the exact
failure he named himself — *"how do you leave all this out"*. The confirmed ones:
**141** (a Custom rung on the EXPORT frame-rate list — never built; the canvas dialog has one, export
does not), **142** (the default shape colour never reaches freehand/vector drawing, though the entry
claims it does), **118**, **121**, **154**, **165.3**, **257**, **338**, **363**, **386** (a media
Outline never reaches the frame — probe already written at `tests/_q386audit.html`), **419** (the rail
diamond's REMOVE is still shared), and draw-on keyframes never registering as layer keyframes.
Needing him: 184, 204, 285, 378, 461.

**✅ v11.66 — #472, AND IT WAS NOT A FLAKY TEST. It was a real bug in the app.**
The entry was filed as "our own safety net is unreliable"; it turned out the net was fine and it had been
reporting a genuine defect all along, which nobody believed because it went green on the re-run.
**Reproduced before touching anything** (the entry demanded it, and demanded the tolerance NOT be widened):
20 flicks, 2 dead, release velocity 1.83 px/ms against a 0.02 threshold, `scrollTop` frozen for all 90
frames. `scrollTop` snaps to half a pixel, so a first frame landing a fraction of a millisecond after the
fling is armed steps sub-pixel, the write rounds straight back, and the loop's "the write did not move it →
we are at the end, stop" check killed the glide on frame one. **About one real flick in five did nothing.**
**The lesson worth keeping: an intermittent test failure is a hypothesis about the app, not about the test.**
Two earlier ticks re-ran it, saw green and moved on. The re-run IS the trap the entry warned about.
**And a statistical bug needs a seam, not a gesture.** Driven through the UI the test is a coin flip and
proves nothing on the runs where the frame lands late, so the step became a pure function
(`FM._tlMomentumStep`) the suite drives frame by frame with a deliberately sub-pixel first frame.
Deterministic, mutation-checked, and both ends asserted so "never stop" cannot pass as a fix.

**✅ v11.67 — #47's safety half, and it turned up a real silent-data-loss bug.**
#47 half (a) crash-resume was done; half (b) is ANSWERED — *"if there's a thing to make exporting safer
then do it, currently I've barely done many exports anyway so the current system may not be safe"*. The
entry itself names the right next step: work the UNTESTED GROUND (long exports, backgrounding, low
storage, an interrupted export), not the 11,700-line OffscreenCanvas move.
**Found by reading that untested ground: one audio clip that will not decode destroyed the ENTIRE
soundtrack.** `FM.decodeAudio` was awaited unguarded — a file resolving to nothing was handled and always
had been, but a corrupt file THROWS, and that threw straight out of the mixer past every other clip, into
a caller that swallowed it to a `console.warn` and shipped a mute file. Measured: good song + one bad file
→ mix `null`. Guarded per clip now, plus the fifth (and broadest) silent audio loss made to speak.
**The lesson: the handled case next door is what made this invisible.** The line under the decode reads
`if (!m.audioBuffer) { dropped.push('would not decode') }` — so the failure LOOKED covered, and the
reject path went past it unseen. When a guard exists, check which failure shape it actually catches.
**Also worth keeping: a mutation that breaks SYNTAX proves nothing.** Removing `try {` left a dangling
`catch`, the file did not parse, four unrelated tests went red with "not reachable" and it reported
CAUGHT. A real mutation has to leave the file valid and change only the behaviour.

**✅ v11.68 — #47 again (its safety half is a seam of real bugs, not a checklist).**
`seekVideo` waits 1500ms for a clip to reach a frame and then resolves ANYWAY — so the compositor draws
whatever the element still shows: a DUPLICATE of the previous frame, in the file, presented as footage,
with nothing recorded. The code's own history says it happens — the wait was raised from 250ms because it
"dropped frames on big 4K seeks". Misses are counted and named now.
**THE PART WORTH REMEMBERING: a mutation SURVIVED, and it was right to.** Making the counter fire
unconditionally changed nothing any test could see — because a landed seek never cancelled its 1500ms
timer, so the push happened AFTER the tally was taken. That was a real bug in my own change (a leftover
timer from one export can fire during the next and warn about repeats on a clean render). **A surviving
mutation is not always a weak test; sometimes it is the code telling you something you did not know.**
Do not reach for a stronger assertion until you understand WHY it survived.

**✅ v11.69 — #47's long-render ground: the save cap was DELETING the render, not just stopping the save.**
Crash-resume caps persistence at 512 MB so a phone's storage does not fill. But `load()` also refused any
CAPPED job — so passing the cap threw away every chunk already saved, on the longest renders, which are
the dearest to redo and the likeliest to be killed. Measured: capped job, 5 good parts on disk, load()
answering null, against a control under the cap that resumed fine.
**THE PART WORTH REMEMBERING: an existing test asserted the OPPOSITE, and its reasoning had never been
measured.** It said a capped resume would "produce a file with a gap in the middle". Resume restarts from
the SAVED seam, not from where the dead run reached, so there is no gap. Proved end to end before
touching it — 150 frames, capped at 60, killed at 100, resumed: exactly 90 frames rendered, 5s file,
pixel-identical to a clean export at ten timestamps across the seam.
**A red test blocking a change is a claim to CHECK, not an obstacle to route around and not an authority
to obey.** `mutate.sh` refused to run against the red tree, which is what forced the question — the gate
did its job. The test was corrected, not deleted: its first half was right.
**And measure with an instrument that can see the thing.** I tried `performance.memory` on the audio mix
first; AudioBuffers live off the JS heap, so 10s and 30s both read 0 MB growth. Those numbers were
discarded rather than reported. A reading of zero is a reading about the instrument.

**✅ 22 Aug — #96: a suspected bug closed by MEASUREMENT, and an audit prescription proved impossible.**
The buildable-audit said the song may "stop dead at 13.453" on scrub-into-tail-then-play, and prescribed
replacing the mock-element test with a real-file one. Neither survived contact:
· The stall does not reproduce — the real `liar.mp3` runs past its header claim to 19s+, never muted.
· **13.453 was real and was not a stall.** `el.duration` IS NOT STABLE for a VBR mp3 — Chrome says
  11.210s at loadedmetadata then refines it upward as it decodes: measured 11.210 → 15.752 → 20.297 in
  one second. 13.456 reproduces exactly, as a decode boundary.
· **A real-element test CANNOT catch this regression on Chrome.** The claim races ahead of the playhead,
  so the gate is never crossed. I wrote it, mutation-checked it, **watched it pass against the defect,
  and deleted it.** A test that goes green against its own bug is worse than none.
**THE LESSON: a mock is not automatically the weaker instrument.** The audit's reasoning — "a stub cannot
end, so it could prove the gate falsely" — sounds right and is backwards here: the stub's inability to
drift is the only thing that holds the value still long enough to ask the question.
**And: `tools/.buildable-audit.json` is a lead list, not a work order.** Its firstStep for this entry was
wrong. Check the prescription before following it — the same way an entry records what was ASKED, not
what is still missing.
What shipped instead: the scrub-into-tail-then-play RESUME branch now has a test (nothing covered it),
caught alone by deleting the `play()` call on that branch.

**✅ v11.70 — #148: the artefact an earlier pass wrote down as "noted, not fixed" was still there.**
*"playback pitches up to +9.6% and back over four audible steps at the start"* — re-measured on a real
mp3: **+5.9%, about a semitone, on EVERY press of play.** Cause: the controller seeds its output-latency
estimate from the FIRST sample of a pass, taken before the element has spun up — measured seed 48ms
against ~87ms settled, EMA only reaching 51.6ms by 850ms — so it carried a phantom ~37ms of error and
leaned on the throttle, and `preservesPitch` makes that a PITCH change. Now it waits 0.25s of the
element's OWN playback before learning. After: 0 rate writes, and sync error 13ms median — TIGHTER than
before, because it is no longer chasing an error that did not exist.
**TWO LESSONS, both about the test rather than the fix:**
· **A fake that is too clean cannot fail.** The suite's element reports a CONSTANT latency; the bug lives
  entirely in the latency RAMP. That is why the existing latency test stayed green through all of this.
  When a defect survives a test that seems to cover it, suspect the fixture's fidelity.
· **The natural way to drive a test can hide the bug.** My first version went through `FM.play()` and its
  mutation SURVIVED — that path opens with a seek, which reseeds the bias, so the defect never appears.
  Driving `_syncMediaToClock()` directly reproduces it. Both times the mutation check was the only thing
  that said so.
**And "noted, not fixed" in an entry is a lead, not a closed door.** Re-measure those before assuming a
later release swept them up: two of #148's costs had been fixed by other work, this one had not.

**✅ 22 Aug — #202: the quality ladder is NOT broken, and two measuring traps nearly said it was.**
Measured end to end in the real app with a pixel-scaled cost: **tier 0 → 1 → 2 → 3, 497k → 130k pixels,
frame gap 101ms → 32.6ms.** His tier-0-at-10.7fps sample is the other diagnosis v10.18 named — the ladder
never being ASKED — not a ladder that refuses to act.
**TRAP 1: state that persists across measurements.** The payoff latch (`_locked`) lives for the life of
the page, so my second probe inherited it from my first and read "the ladder never steps down". That is a
bug that was not there. **A second measurement in one page session is not independent — check for carried
state before believing a negative result.**
**TRAP 2: an instrument that cannot show the effect.** A flat burn does not shrink when pixels are shed,
so the ladder is RIGHT to revert — a test built on one reports a defect that does not exist. Same family
as v11.70's too-clean fake and #96's mock: **when a measurement says "broken", check the instrument
before the code.**
**And check for an existing test before writing one.** A test already pinned the DECISION (and better —
it drives `_notePlaybackCost` directly rather than playing for real). Mine survived only because it
answers a different question: is the ladder WIRED? Cutting the play loop's one feeding line leaves the
existing test green and is caught by the new one alone. I proved that with a mutation before shipping it,
and DELETED my second test, which was both redundant and timing-flaky.
**`tools/.test-floor` caught the deletion** — a removed test reads as green because nothing failed. Lower
it deliberately (`echo N > tools/.test-floor`) or the gate refuses.

**✅ 22 Aug — #215: the two gaps the entry NAMED and left open are now measured.**
An entry that says *"known gap, stated rather than papered over"* is a work item, not a disclaimer. Both
of #215's were buildable without Ezra, and they guarded the worst failure in the file: an MP4 whose moov
advertises an audio track that was never fed — silent in one player, REFUSED by another.
Measured from the output BYTES rather than by asking the code: `soun`/`mp4a` present on a healthy export,
absent (with the video track intact) when AAC is unavailable. v7.91 + v9.43 are correct end to end.
**THE LESSON: an assertion nothing has ever made fail is not yet a test.** My first mutation WAS caught —
but by the flag assertion, not the file one, because the encode-before-mux ordering still saved the file
(defence in depth working). The assertion I actually cared about was still unproven. A second, targeted
mutation — declare the audio track unconditionally — fired it exactly. **When a mutation is caught by a
DIFFERENT assertion than the one you wrote, you have not yet tested the thing you meant to.**

**✅ 22 Aug — #250: the entry's own BLOCKER was stale, and the slam is fine on PC.**
Twice this entry recorded "the motion cannot be timed here — the pane reports document.hidden". That
stopped two sessions from ever checking the thing he complained about. `document.hidden` is FALSE now,
and a control animation confirmed frames genuinely advance, so the slam was driven through the real
trackpad wheel path at 1440x900 and sampled: **18 distinct transforms, never scales, settles clean**, and
frozen mid-shake nothing is clipped and no editor shows through.
**A false alarm that would have read as #144 reopening:** `elementFromPoint` at the top edge returns
`stage` — the editor — mid-shake. It is wrong. The cover is a `::before` at `inset:-8%`, and a
pseudo-element PAINTS past its host's box without extending the host's HIT area. The pixels are right;
the hit test is not the instrument. Screenshot settled it.
**THE LESSON: a blocker recorded in an entry is a claim with a date on it.** Re-test it before inheriting
it — especially one about the environment, which changes underneath the note.

**✅ 22 Aug — #342: the entry was blocked on a BADLY-ASKED QUESTION, not on Ezra.**
He declined clause 3 twice — *"idk what could it ask"* — and both times what he was handed was an OPEN
question ("what do you try to do that you can't?"). His standing instruction of 21 Aug is explicit:
*"I just want options. Yu can just say recommended next to the best option"*. The entry had even written
down "put these to him as options rather than an open question" — and then left the open question in the
block he actually reads. Re-asked as A–E with A recommended, and with E ("nothing, it's fine") offered as
a real answer rather than a cop-out, because clauses 1–2 shipped and were verified end to end.
**THE LESSON: "waiting on Ezra" is a claim to audit, exactly like a stale blocker.** Before counting an
entry as blocked, check that what he was actually asked is answerable in one word. A question he has
declined twice is evidence about the QUESTION.
**Three rows in the top block are still open questions (387, 391, 215)** — flagged there in writing as a
defect in how I asked, to be fixed as each comes up the list rather than in a sweep that jumps the queue.

**🔴 22 Aug — HE RAISED #431 AGAIN, ANGRY, AND HE WAS RIGHT. Fixed in v11.71.**
*"I asked for you to fix the audio and media menus so many times and nothings happened."* Three earlier
passes at this entry measured the tab row, found a healthy 64.1px, and concluded it "only looks shorter
next to a dense grid". **It genuinely crushes to 20.9px with 0 of 5 labels** — but ONLY with a POPULATED
library in a SHORT sheet. With an empty library there is no pinned split, nothing competes for the
height, and the row measures perfectly.
**THE LESSON: reproduce with HIS data, not a fresh project.** Every earlier check used an empty library
— the thing that causes the bug was the thing left out of the repro. My own first TEST made the same
mistake one level up (a tall container) and its mutation SURVIVED.
Cause was one missing line: `.addmenu-tabs` had no flex property so defaulted to shrinkable, while
`.addmenu-pinned` — the very next rule in the file — already carried `flex: 0 0 auto`.
**Also worth keeping: three ticks in a row I have counted an entry as "waiting on him" when it was not.**
#250's blocker was stale, #342's question was badly asked, #431 was reproducible all along with the right
data. **"NEEDS YOU" is a claim to audit before trusting.**

**✅ v11.71 also — #343 clauses 3 and 4.** Clause 3 (people can create templates) was ALREADY TRUE, like
clause 1. Clause 4 shipped: "Save template file…" writes the same `.fmotion.json` a project writes, so
the existing importer reads it and the app stays local-only — the route he chose himself.
`embedFonts` was EXTRACTED rather than copied so the two exporters cannot drift.

**✅ 22 Aug — a THIRD shape of unreachable entry, found by the tick it wasted.**
#343 had all four clauses ticked and its own checkbox left at `[ ]`, so it sat at the top of oldest-first
looking like work — and I opened this tick by re-reading a finished entry. Added the mirror of the
existing "ticked [x] but says STAYS OPEN" detector to `tools/next.sh`: **an open entry whose every
numbered clause is ticked**. It only fires on entries that HAVE clauses, so prose entries cannot cry wolf.
**It found THREE on its first run, and only one was the one I knew about:**
· **343** — genuinely finished. Closed.
· **395** — MP3 is still his call, but that sentence lived inside a TICKED clause. Now clause 3, with
  options and a recommendation.
· **425** — a real CONFLICT between two of his own instructions (copy on the left vs the group on the
  right) was sitting inside a ticked clause too. Now clause 3, with options.
**THE LESSON: the queue can lie in both directions, and the cheap direction hides better.** "Ticked but
not done" loses work and gets found eventually. "Done but not ticked" only costs time — so nothing ever
raises it, and it re-costs that time every single pass. Both are now detected rather than trusted.
**Note for later: next.sh's detectors have no self-tests**, unlike `_classify.py`. This one proved itself
by finding three real cases on its first run, but the same "the symptom is silence" argument applies.

**✅ v11.72 — #473, the library grid goes to three rows. HE REVERSED HIS OWN #358 AND THAT IS SAID OUT LOUD.**
#358 asked for TWO rows in his words; this asks for three. Honoured as a change of mind, not a slip,
because he gave a REASON (*"since you made the pictures smaller"*) and because what 358 actually ruled
out was scrolling DOWN — which is untouched: rows stay locked in, spill-over still pages sideways.
**Two existing tests asserted two rows.** UPDATED with the reversal and his reason recorded in both,
never deleted — a guard that encodes one of his instructions must not be quietly flipped, and the next
session has to be able to see that he changed his mind rather than that I overrode him.
**A THIRD test broke on its own CONTROL, and that is the control working.** Its 9-clip fixture no longer
overflowed a page, so "every import is still reachable" would have stopped exercising paging entirely and
gone green while testing nothing. Raised to 13, sized to overflow whatever the row count is.
**THE LESSON: a fixture is sized to a layout, so a layout change can silently retire a test.** When a
behaviour changes, check what the OLD fixtures were calibrated against — the tests that keep passing are
the dangerous ones.

**✅ #353 clause 3 — THE SUITE NOW RUNS AT PHONE WIDTH, and it is green there: 843/843 at 380px.**
`tests/_cdp.py --width 380` was documented in the runner's own header and **nothing had ever called it**,
on a mobile-first app, while #431 — a phone-layout bug — shipped and survived three desktop-width passes.
`ship.sh` runs a second pass at 380px and refuses on a red, naming it as a phone-only layout bug. Skipped
when no shipped source changed (`styles.css` / `index.html` / `js/`): a docs- or tests-only commit cannot
move a layout, and paying five minutes to prove that every time is how a gate gets switched off. NOT an
allowlist of UI files — that goes stale by the next module.
**⚠️ AND A CORRECTION TO MY OWN PREVIOUS ENTRY HERE, which claimed the 380px suite "did NOT finish in
600s".** It finishes fine. I had passed `--port 8779`; `--port` is the DEV SERVER port, not a debug port,
so that run was aimed at nothing. **I wrote a wrong finding into this file and the next session would
have inherited it as fact** — which is precisely what rule 11's "a blocker is a claim with a date on it"
is about, committed by me one tick after writing it. **When a measurement says broken, check the
instrument before the code**, and that includes your own command line.

**✅ 22 Aug — #353 CLOSED. A standing instruction of his had been sitting in the request list, not in
the rules, for five days — and one clause had NO structural home at all.**
His four clauses: oldest-first, a workflow step/wait limit, quality-test everything, and never block on a
question. Three had been absorbed into these rules months ago. **Clause 2 — the workflow budget — had
not, and nothing noticed because no workflow has been launched since he asked.** It is rule 13 now.
That is the exact shape of failure this file exists to remove: the constraint was written down in the
one place that would NOT be read at the moment it applies. He wrote it after watching a workflow freeze
and cost him hours.
**THE LESSON: a standing instruction in REQUESTS.md is a hope; in LOOP.md it is a rule.** When an entry
turns out to be an instruction rather than a task, its home is the rules file — and then the entry closes
instead of holding the queue forever. #353 had been re-read at the top of the list for several ticks.
Also ticked #473, whose checkbox I had left open while writing "DONE v11.72" in its body — the very shape
the new next.sh detector was added for, committed by me two ticks after adding it. The gate caught it.

**✅ 22 Aug — #387: the question in his block was one HE HAD ALREADY ANSWERED, in the report itself.**
The row asked *"is scrubbing fine and playback bad, or are both bad?"* — and his original words are
*"a video will playback fine when scrubbing but actually pressing play is a buggy mess"*. So the thing
called "waiting on Ezra" was waiting for a sentence he had already written. **Third time this pattern has
appeared** (250 stale blocker, 342 badly-asked question, now 387 redundant question). Replaced with a
question only he can answer: does play still feel wrong at v11.70+?
**And a real lead recorded: v11.70 fits the asymmetry exactly.** The latency-bias fix removed a ~6%
pitch-up on the first ~600ms of EVERY play plus rate churn — something playback does and scrubbing never
does, which is precisely the split this entry says to treat as the lead.
**THE AUDIT'S PRESCRIPTION WAS REFUSED HERE, on purpose — second time.** It wanted an old screen
recording's reading written in as verified fact ("the accent pill was lit at 2.0/4.0/6.0s"). The cited
line numbers have moved AND the app has no coloured pill — the play button swaps its ICON. Unverifiable,
so it stayed out. **`tools/.buildable-audit.json` is a lead list; check its evidence before copying it.**
What came out of checking: a cleaner discriminator for any future recording — **two bars = playing, a
triangle = stopped** — which settles it from the picture with no inference at all.

**✅ 22 Aug — #391 merged into #98, and #98's last open clause SETTLED BY MEASUREMENT.**
He had already answered #391 with *"i think we already discussed"* — and he was right. The entry claimed
"no entry covers the Edit Text menu specifically"; #98 covers exactly it. **FOURTH consecutive tick where
"waiting on Ezra" was wrong** (250 stale blocker, 342 badly-asked, 387 already-answered, 391 duplicate).
#98 clause (c) said: *"either the pt value is not what is being drawn or the readout is lying — measure
which"*. **Neither.** Ink height scales 2.03× for 2× the font and 4.00× for 4×, so the renderer is exact
and the readout is honest. The text looks small because the default is `min(W,H)/6.75` = 160, which is
8.3% of a 1920-tall frame — a taste call, now a pick-one in his block with a recommendation.
**THE TRAP, and it nearly became a bug report: `FM.makeLayer('text')` reports a default of 96 in EVERY
project size**, which reads exactly like "the aspect-aware default was never wired up". It is a bare
fallback in `js/scene.js`; the real Add Text path passes the 6.75 figure explicitly. **The constructor
and the app path disagree, so probing the constructor measures nothing about the app.** Check which entry
point the user actually presses before believing a default.

**✅ 22 Aug — #392: the entry's OWN admission was the work.** It ends with *"`/security-review` was NOT
run — said plainly rather than implied"*, on a feature that puts his text into the DOM, which CLAUDE.md
requires a review for. Done: `textContent` everywhere for user text; the three `innerHTML` uses are static
SVG literals; the one raw-SVG sink in reach takes a BOOLEAN choosing between two literal paths; no
network, keys or `eval`; saved rate/pitch clamped and the voice name matched against the browser's own
list. **Clean, nothing to fix** — and recorded so nobody re-runs it.
**THE LESSON: an honest "not done" written into an entry is a work item, not a disclaimer.** Same shape as
#215's two "known gap, stated rather than papered over" notes, which were also real work sitting in plain
sight. **Grep the file for these admissions rather than waiting to trip over them.**
**And #392 is one where "waiting on Ezra" IS correct** — after four ticks where it was not. Clause 4 is
explicitly conditional on his verdict of the shipped version (*"if it's really bad maybe just leave it as
an effect"*), and the export-voice choice costs a key, a bill and the local-only rule. Saying so plainly
matters as much as catching the false ones: auditing the claim is the rule, not disbelieving it.

**🔴 22 Aug — #406: I HAD BEEN DROPPING AN EXPLICIT INSTRUCTION FOR THREE DAYS.**
His request contained *"don't stop until I reply acknowledging it, remind me to acknowledge as well"* —
he PRE-EMPTED exactly the failure that then happened: I answered once, on 19 Aug, and never mentioned it
again. An instruction to repeat something cannot be honoured by remembering to; it needs a list.
**So there is now a "SAY THESE IN EVERY REPLY UNTIL HE ANSWERS" block at the top of STATE**, with the
line deleted the moment he answers. Same principle as every other gate here: the safeguard is the
structure, not the intention.
**And clause 1 was a guess waiting to happen.** *"Get rid of saving presets from this menu"* — no
screenshot, and there turn out to be THREE savers in three different places (layer ⋯, an effect row's ⋯,
the Effects card button). Deleting the wrong one costs him a feature, so it is a pick-one with a
recommendation instead. The entry had warned about this and was right.

**✅ v11.73 — #418, the undo/redo circular arrows. FIFTH stale "waiting on you" this week.**
The STATUS line said waiting on him; **his reference image arrived on 21 Aug** and the entry describes it
in enough detail to build from (a ~300° ring, solid triangular head, mirror pair). Nobody re-read past the
status line. Built: 300° sweep, 60° gap at the top, filled head, undo anticlockwise / redo clockwise,
stroke left at 1.8 to match the row — his "skinnier" was relative to his reference, which is drawn heavy.
**THE FIRST ATTEMPT WAS WRONG AND ONLY MEASURING CAUGHT IT.** SVG arc flags pick between the TWO circle
centres that fit the same endpoints and radius: `sweep=0` centred the ring at y≈-0.12 instead of 12, so
the icon was a clipped band across the top of the box — and it looked plausible in source. Swept all four
flag combinations and measured the ink box each time. `large=1 sweep=1` is the one that centres.
**Do not reason about arc flags — render them and measure.** The pane also downscales screenshots, so a
24px glyph cannot be judged by eye there; the numbers are the only honest check at that size.
**✅ AND THE PHONE GATE FIRED FOR THE FIRST TIME** (index.html changed, so it was not skipped):
843/843 at 1280 AND 843/843 at 380. The gate added for #353 clause 3 works end to end.

**✅ 22 Aug — #429: an open question turned into a pick-one, and a 30-second phone check surfaced.**
Clause 1 (*"after this cut off point I don't want the lines or special colouring"*) had FOUR candidates
named in the entry and was still being put to him as "tell me which" — homework, against his standing
instruction. Now A–D with A recommended (the ruler's notches, the only one of the four that is not an
affordance he asked for; D is queue 417, HIS request, so picking it would undo that — said in the option
rather than discovered afterwards).
Clause 2 is the opposite case and worth keeping as a model: **five probes found nothing, and the sixth
reproduced it** by growing the viewport mid-swipe the way iOS does when its toolbar hides. Mechanism
bisected to `--stage-h: 40vh`, fix shipped at v10.67 (`svh`), and **the harness physically cannot verify
it** — headless Chrome has no chrome, so `svh`/`lvh`/`vh` all resolve the same. That is stated in the
entry rather than glossed, and it is now a 30-second ask in his block instead of buried.
**THE LESSON: "I cannot test this here" is a thing to SURFACE, not a thing to sit on.** It had been true
and recorded since 20 Aug, and he was never actually asked the one question that settles it.

**✅ 22 Aug — a SECOND "done but not ticked" shape, found by the tick it wasted (again).**
#431 was fixed at v11.71, he confirmed it in a screenshot, and the entry still read `[ ]` — so it kept
surfacing as the next job. The clause detector added three ticks earlier **could not see it**: that one
only fires on entries WITH numbered clauses, and #431 has none. `tools/next.sh` now also flags **an open
entry whose body claims a versioned FIX/DONE**. Measured before shipping: exactly ONE match across the
whole file, so it needs no cleverness to avoid crying wolf — and deliberately no "unless it also says
something is outstanding" suppression, because that would have suppressed #431 itself (its STATUS line
was stale and said NEEDS YOU).
**⚠️ AND A REAL MISTAKE OF MY OWN IN THE SAME TICK, recorded rather than tidied away.** I chained the
close and the ship in one command without a guard: the close FAILED (an assertion — `status.sh` had
rewritten the line I was matching on) and **the ship ran anyway**, publishing the detector while the
entry it was written for was still open. Shell `;` between a fallible edit and a ship is a gate with a
hole in it. **Check the edit landed before shipping it — or join them with `&&`.**

**🔴 22 Aug — #432: HE NEVER ANSWERED BECAUSE HE HAD NEVER SEEN THE OPTIONS.**
Four template-icon candidates were drawn on 21 Aug into `tests/_tmplicon.html` — a local file he cannot
open from his phone — and then "put to him" **in words**. Asking someone to choose between five icons by
description is not asking a question; it is asking them to imagine one. It sat for a day and read as
"waiting on Ezra".
Rendered and screenshotted into the chat: all five at real 24px, at 4×, beside the family they sit in.
**RULE: A VISUAL CHOICE CANNOT BE OFFERED IN PROSE. If it was drawn for him to pick from, it has to reach
him as an IMAGE.** Same class of failure as his own *"maybe my images arent going through"* — running the
other way. Check for this whenever an entry says options were "put to him": were they SHOWN?
Also ticked clause 1, which was a standing instruction rather than a task (same resolution as #353) and
was making the entry look like it had two open jobs when it had one.

**🔗 22 Aug — #454 and #406 were being asked SEPARATELY, and one of them would have deleted the other's
answer.** #406 is his own question about the difference between the preset savers; the answer is that the
whole-look one is the ONLY way to carry an ANIMATION between layers. #454 is his rule — *"presets are just
for effects not anything else"* — which applied literally DELETES that saver. Neither entry mentioned the
other, so he would have been choosing to lose the capability without being told it existed.
Now one question, with the cost of each option stated: **A** delete it (his literal words), **B**
recommended — keep it, rename it out of "preset" so the word means one thing, which is the goal he
actually stated. Nothing is deleted until he picks.
**THE LESSON: two entries can be individually well-written and jointly misleading.** Both were honest;
the harm was in the gap between them. **Before offering a destructive option, check what else in the file
depends on the thing being destroyed** — a grep for the feature's name across REQUESTS.md would have
found it, and that costs seconds.

**✅ v11.74 — THE FIRST REAL RESULT ON MOBILE LAG, which is what he asked for. Tilt Shift 776ms → 74ms.**
Timed ALL 179 effects at 1080x1350 — his own slow reading's exact size. **Median 14.85ms EACH**; 9 shape
layers with no effects cost 0.05ms. 24 median effects = 356ms against his measured 294.69ms: **the numbers
agree, so his lag was never a mystery** — effects are per-pixel JS and a dozen cannot hit 60fps on any
phone by tuning. That is what the quality ladder is for, and #202 proved the ladder works.
**The outlier was real and fixable: Tilt Shift at 775.75ms, 5x the next worst and 52x the median** — a
radius-8 box blur done with 17 taps per pixel per channel, twice (~198M adds a frame). A box blur needs a
sliding window, not taps. 10.5x, and **byte-identical**, which is the assertion that matters: a faster
kernel drawing a different picture silently edits every project that used it. The old kernel lives in the
test as the reference so it cannot drift back into the app.
**MEASURE THE WHOLE SET BEFORE OPTIMISING ANY OF IT.** The ranking is the finding — without it, tiltshift
looks like one effect among many, and the 52x outlier is invisible. Next: spinstreaks 320, turbulentdisplace
240, zoomstreaks 173, lensblur 158.
**⚠️ AND A CORRECTION TO HOW THIS LOOP HAS BEEN SPENDING TICKS.** He said: *"i dont know what ur doing as i
just leave u on all day … i just hope u make the project better for me"*. The preceding several ticks were
queue hygiene — all real, all unblocking, none of it visible to him as improvement. **Shipping beats
tidying; tidy only what falls out of the work.**

**✅ v11.75 — spinstreaks 320ms → 46ms (7x). Second of the effect sweep he asked for.**
Same shape as tiltshift, bigger: **22 trig calls per pixel** (~32M a frame). Every tap is the pixel's own
offset rotated by a fixed angle, and rotating a known vector is the angle-addition identity — ten cos/sin
pairs precomputed once per frame, then pure arithmetic. sqrt and atan2 vanish too, because dx and dy
ALREADY are R·cosA and R·sinA.
**NOT byte-identical, and that is stated rather than implied.** Exact in real arithmetic; the float orders
differ in the last bits and the sample index is a TRUNCATION, so a coordinate landing exactly on a pixel
can truncate the other way. Measured: coordinates agree to 5.7e-14, picture ≤2/255 on real content.
**When byte-identity is not reachable, assert the MATHS instead** — the coordinate check is
content-independent and far stronger than any picture comparison; the picture check then only has to be a
bound. And where the two differ, the NEW one is the more accurate: the old path round-tripped through
sqrt/atan2, which is the thing that drifts.
**⚠️ A NEAR-MISS: my first edit replaced to END OF LINE, and in this file the entire pixel loop lives on
one line — it silently deleted the loop.** `git checkout` restored it (the file was committed at v11.74).
**In a minified-style file, replace exact substrings, never to end-of-line**, and check the edit landed
before running anything.

**✅ v11.76 — THE BIGGEST LAG WIN, and it was a SHARED fault, not another single effect.**
Sixteen kernels opened with `d.slice()` — a fresh 5.6 MB array per invocation, **133 MB of garbage a
frame** at 24 effects. On a phone that is collected in PAUSES, which fits *"playback is a buggy mess while
scrubbing is fine"* far better than steady slowness. One reused buffer, refilled: **zoomstreaks 173→59,
lensblur 158→52, tiltshift 74→37, spinblur 102→70 — three of which I had never touched.**
**THE LESSON: after fixing two instances of a cost, look for the SHARED one.** Two single-effect wins
(tiltshift, spinstreaks) were worth ~975ms between them; this one change beat both, across effects I had
not read. **Ask what every kernel does on its first line before optimising any of them individually.**
**⚠️ AND THE NEAR-MISS THAT IS NOW A TEST.** The bulk edit matched a bare variable name (`s=d.slice()`)
and converted one of `sketch`'s THREE copies — a kernel that holds several live snapshots cannot share one
buffer, and the picture would have been wrong in a way no single-kernel test would notice. Caught by
counting copies per kernel afterwards. There is now a SOURCE test that fails if any multi-copy kernel is
put on the scratch, mutation-checked by re-making exactly that edit.
**When a bulk edit uses a short identifier, verify per-site afterwards — `git checkout` is cheap, a silent
corruption is not.**

**📊 23 Aug — re-measured all 179 effects after the scratch fix: median 14.85ms → 8.57ms, 70 effects
over 25ms → 42, and his 294ms case is now ~206ms of the same work.** Re-measuring first is what found the
next target; the old ranking was stale the moment v11.76 landed.

**❌ AND A REJECTION, which is the more useful half.** The new top 15 is 11 WARPS, and every warp kernel
returns a freshly allocated `[sx, sy]` **per pixel** — 1.46M allocations per warp per frame, exactly the
v11.76 fault one level down. Built the shared-pair fix (29 sites): gains were real but modest, 10-30%.
**Then four existing tests went red, and they were right.** They hold TWO warp results at once to compare
mappings across parameters, and a shared mutable pair makes those the same object — every comparison reads
"moves no points". **The contract becomes "read the answer before calling again", and any caller that does
not gets identical values with NOTHING failing.** Reverted.
**THE LESSON: an optimisation that changes an API from value-returning to shared-mutable is a footgun,
and the cost of the footgun is not paid by the code you are looking at.** A 10-30% gain on effects the
quality ladder already manages does not buy that. **The tests that broke are the reason not to ship it —
do not "fix" tests that are correctly describing the new hazard.**
Also worth keeping: this is the first time a measured, working optimisation has been thrown away here.
Recording the numbers AND the reason means nobody rebuilds it in a month.

**✅ v11.77 — #476, one of the two bugs he reported yesterday. The cards were never the wrong SIZE.**
Measured at 1600px: all eight cards 112.3px, identical. The fault was POSITION — a short last row was
centred, sitting 60.7px off the columns above it, so two identical cards read as wrong. `flex-start` only
affects short rows, so nothing was resized and his earlier "make the two extra big ones smaller" is not
reopened.
**THE LESSON: he described a SIZE problem and the sizes were perfect. Measure the thing he named, then
measure its neighbours** — the complaint is a symptom, not a diagnosis. A width-only assertion would have
passed on the broken layout, which is why this survived; the test pins ALIGNMENT for that reason.
**⚠️ AND THE HALF THAT DID NOT REPRODUCE IS SAID PLAINLY IN HIS FILE, not glossed.** He said "sometimes"
and "if you play around with it a bunch"; the misalignment is CONSTANT. Driven at two widths with the add
menu cycled four times, the cards never varied within a layout. So this may be only part of what he saw,
and the entry says so and asks for a screenshot at the moment it happens rather than claiming the fix.

**✅ v11.78 — #475, the second of the two things he asked for on 22 Aug. Gradients on the PC add cards.**
Put on the card's own BACKGROUND, not a new pseudo-element: both slots are taken on this family
(`::after` = 286's cursor ring, `--multi::before` = 344's four-colour ring), and the entry warned that
v9.87 already overwrote 286 once by reusing one. Uses each card's existing `--am-tint`, so no second
palette exists to drift.
**⚠️ A REAL MISTAKE CAUGHT BEFORE SHIPPING, now a test: I first placed it inside
`@media (… ) and (prefers-reduced-motion: no-preference)`** — the block that gates the cursor ring, which
moves. A static gradient has nothing to do with motion, so that would have **silently withheld the
feature from every user with reduced motion switched on**, with nothing on screen to explain it.
**CHECK WHAT A MEDIA QUERY IS FOR BEFORE ADDING A RULE TO IT.** An `@media` block is a REASON, not a
convenient bucket of selectors — landing in the nearest one that matches the width is how an accessibility
setting silently removes an unrelated feature. A second test now fails if the rule drifts back in.

**💡 23 Aug — #460: "43 of 43 work" was TRUE and USELESS, and that is the finding.**
He has reported the Colouring effects doing nothing THREE times. A prior session measured all 43 and
proved every one works — and then told him that, which answers nothing for a man who has watched nothing
happen. Reading the measurements together says something he can actually use: **his test subject cannot
show several of them.** On his flat `#cc22cc` rectangle on a black background — Channel Remap swaps red
and blue, which are BOTH 204 in that colour; Halation blooms around highlights a flat mid-tone has none
of; Long Shadow's default BLACK shadow lands on a black background. All correct behaviour, all
indistinguishable from a broken button.
**THE LESSON: "it works" is not an answer to "it does nothing".** When a measurement contradicts what he
sees, the job is not finished at proving him wrong — the remaining question is *what is he seeing*, and
the answer is usually in the conditions the measurement had to control for. The evidence was sitting in
that entry for two days as a list of probe caveats.
**Also: the plain-render path is CLEAN** — 0.03ms/frame and ZERO heap growth with shapes or text at
1080x1920. So "one simple video layer lags" is not the compositor, and further effect micro-optimisation
will not touch it.
**Logged #477 rather than half-building it:** the app should SAY when an applied effect changes nothing
on this layer. The detection machinery exists (`contributes`/`lrender` in fx-thumbs); the hard part is not
crying wolf, and a bad version is worse than none.

**✅ v11.79 — #477 built the day it was logged, because #460 is THREE reports old.**
The app now says, on the open effect row, when an effect is ON and measurably changes nothing on this
layer — with the reason where queue 460 MEASURED one. Verified on his exact case: a flat `#cc22cc`
rectangle flags channelremap, halation and longshadow, and stays silent for grayscale/invert/brightness.
**THE RISK WAS CRYING WOLF AND IT HAS THREE CONTROLS, NOT ONE:** the same effect on an ORANGE fill is not
flagged (so the hint is about the SUBJECT, not the effect); working effects are not flagged; a switched-
OFF effect is never flagged. A hint that fires on a working effect would teach him to distrust the ones
that are fine — worse than the silence it replaces. Both directions mutation-checked.
**THE LESSON: when the answer to a complaint is "you are testing it wrong", the fix is not to tell him
that — it is to make the app say it at the moment it happens.** #460 had the whole explanation sitting in
it for two days as probe caveats, and he would have hit the same wall the next time regardless.
**Also: I said last tick this was "a feature, not a fix, and a bad version is worse than none" and logged
it rather than half-building it. That was right — and then it was built properly the next tick.** Logging
a thing to do it properly is not deferral, provided the next tick actually picks it up.

**🔴 v11.80 — I WITHDREW v11.79, ONE TICK AFTER SHIPPING IT. Found by hunting my own work.**
The no-op hint's DETECTION was right and stayed right. The DELIVERY was not: **the hint vanished the
instant a parameter changed** — the moment you touch a slider, which is exactly when you would read it.
Measured: settled → correctly true; immediately after changing `mix` → false, and it stayed false, while
the effect demonstrably still does nothing (0 pixels differ between mix 0.4 and 1.0).
**My first fix was a GUESS and measuring killed it.** I assumed a transient wrong answer was being cached
and cached only "yes". No better — the recompute itself answers false after a change. The cause is deeper
(the two renders disagree while the compositor's per-layer state is mid-invalidation; `sceneWith()`
deep-clones the layer, which may be what confuses it). **Unknown cause + shipped feature = withdraw.**
**THE LESSONS, and the first is the one that matters:**
· **HUNT YOUR OWN WORK FIRST.** His standing instruction #260 says hunt when the queue is done; the most
  productive place was the thing I shipped yesterday, not the oldest code in the repo.
· **A VACUOUS MEASUREMENT ALMOST HID IT.** My first timing probe reported the cache-miss path costing the
  SAME as the hit — impossible — because the Effects view was not open and the check never ran. I only
  caught it because the numbers were identical, which they had no business being. **When two numbers that
  should differ come out equal, suspect the probe before the code.**
· **A diagnostic that disappears while you interact is the INVERSE of crying wolf and just as corrosive.**
  It teaches him the feature is unreliable, which is worse than the silence it replaced.
· **Withdrawing beats shipping with a known flaw**, and the honest POLISH-LOG entry says so plainly rather
  than quietly reverting.

**🔬 23 Aug — chased #477's withdrawal cause. NOT SOLVED, and the tick's real value is what got RETRACTED.**
ESTABLISHED: it is not my feature and not `fx-thumbs`. A plain `FM.renderScene` reproduces it — enabled
vs disabled differ by 308 bytes after a param change, and it persists. Setting the same value BEFORE the
first render gives 0. So the trigger is the CHANGE, not the value.
**TWO OF MY OWN FOLLOW-UP PROBES WERE INVALID AND ARE WITHDRAWN — both would have been believed:**
· the "is it the antialiased edge?" probe set the param before rendering, so it measured the HEALTHY case
  and returned 0 differing pixels;
· the "is the cache keyed on layer id?" probe swept brightness **1.3 → 2.2, and both saturate to 255** on
  that fill, so the two renders were identical for a reason with nothing to do with caching.
**RULE: A PARAMETER SWEEP ACROSS A CLIPPED RANGE MEASURES NOTHING.** Check the fixture actually moves the
output before drawing any conclusion from two values — the same shape as the "does the effect do anything"
control this file already demands of tests, applied to throwaway probes, which is where it keeps slipping.
**AND: three probes in one tick disagreed with each other. That is the signal to STOP and report**, not to
run a fourth. Recorded what is established, what is retracted, and the one narrow next step (bisect the
gap between "set before render" and "changed after render", which reproduces on demand).

**✅ 23 Aug — #477's mystery SOLVED, and the culprit was MY PROBE. Two ticks of chasing a phantom.**
The bisect, done properly in one run with controls: value set before render → 0 bytes; changed after a
render → 308; same scene twice → 0 (renders are deterministic); persistent across further renders. Then
located: **all 103 differing pixels on ONE ROW, y=90, the full width of the shape, 25 levels off.** A
single-scanline seam — exactly what a resample produces. **The probe rendered a 1080x1920 project into a
160x160 SQUARE canvas.** At full resolution: **zero.**
**THE USEFUL HALF: this also explains the original feature fault.** `effectDoesNothing` compared two
renders through `fx-thumbs`' reduced raster, and that comparison is not safe at a resampling scale. The
detection LOGIC was right; the SURFACE it measured on was wrong. That is what the rebuild has to change —
now written in the entry, so v11.79's withdrawal ends with an answer rather than a shrug.
**Now rule 14.** Also eliminated on the way (both plausible, both wrong): rendering writes no cache keys
onto the layer or effect, and the two scene clones are byte-identical apart from `clipColor`.
**Worth noticing about the shape of this:** every wrong turn in the last three ticks was a measurement
artefact, never the app — a saturating parameter range, a panel that was not open, a squashed canvas.
**When a bug is deterministic, persistent and convincing but nobody has reported it, weigh the instrument
first.** He has never once mentioned a seam.

**🔴 23 Aug — I WITHDREW MY OWN "SOLVED" FROM THE PREVIOUS TICK. It was over-claimed.**
Last tick I proved my probe squashed a 9:16 project into a square canvas, found the difference vanished at
full resolution, and then wrote *"this also explains the original feature fault"*. **It does not.**
`rasterFor` uses `Math.min(TW/w, TH/h)` — a UNIFORM scale. `fx-thumbs` never squashed anything, so the
artefact I found was never on the real path. I fixed a phantom and announced it as the answer, in his file
and to his face.
**PROVING YOUR INSTRUMENT WAS FAULTY DOES NOT PROVE IT WAS THE ONLY FAULT.** Two bugs can wear the same
symptom, and finding one is the moment you are most likely to stop looking.
✅ **The real cause, re-run on a uniform 74x132 raster and located properly:** 50 differing pixels, all
solid interior, on exactly **two rows — the shape's top and bottom boundary**, up to 10 levels. Enabling
an effect routes the layer through an offscreen plate; at a reduced raster the boundary falls on a
fraction of a pixel and the plate path disagrees with the direct path on those rows. **Zero at full
resolution**, where the boundary lands on integers — which is exactly why the full-res check misled me.
**Rule 14 rewritten accordingly, with the retraction kept in it**, because the wrong version of that rule
would have told the next session to compare at full resolution — expensive, and not the actual fix.
The rebuild is a THRESHOLD, and the calibration is measured: boundary noise ~0.5% of pixels, a real effect
~15%. Still to confirm: that a genuinely SUBTLE effect clears the threshold.

**❌ 23 Aug — #477: MEASURED THE PLANNED FIX BEFORE BUILDING IT, AND IT IS DEAD. Best outcome of the tick.**
Last tick's plan was a THRESHOLD (noise ~0.5% of pixels, a real effect ~15%, "an order of magnitude of
headroom"). That headroom only exists for effects that act on EVERY pixel. Measured against effects that
act on PART of a layer:
· vignette **115 px** against a **50 px** noise floor — 2.3×, not 47×;
· longshadow, radialshadow, dropshadow — **exactly 50, identical to the noise**, because their shadow
  falls outside the layer and is black on black (queue 460's finding, again).
**No threshold can separate "invisible because it matches the background" from "boundary rounding" when
both produce the same number.** Erosion does not rescue it either — all 50 noise pixels survive a 2px
erode, since the boundary rows are fully opaque with opaque neighbours.
✅ **The one viable design, now evidence-based: compare at FULL project resolution, where measured noise
is exactly ZERO** — and pay for it by DEBOUNCING off the interaction path, not by shrinking the raster.
That also fixes the original symptom for free: the hint vanished while dragging precisely because it
recomputed on every refresh.
**THE LESSON: a calibration that separates cleanly on the cases you thought of is not a calibration.**
I had numbers, a 47× gap, and a plan — and the first deliberately awkward case (an effect that touches
only part of the layer) collapsed it to 2.3×, with three effects landing exactly ON the floor.
**Measuring the plan cost one tick; building it would have shipped something that calls every shadow
effect dead.**

**✅ v11.81 — #477 SHIPPED ON THE SECOND ATTEMPT. Every design decision was forced by a measurement.**
Full project resolution (reduced-raster noise is 50px, vignette is 115, three shadow effects are exactly
50 — no threshold works; at full size noise is ZERO). Measured only after a 400ms settle, never on a row
build. Painted IN PLACE. A 45ms budget, and silence rather than a stutter when it blows.
**THE SUITE CAUGHT THE ONE I DID NOT SEE COMING:** the settle timer called `FM.inspector.refresh()`, which
REBUILDS the row — and 400ms after a change lands squarely inside a press-and-hold, cancelling the drag
that was arming. *"an OPEN effect row can still be dragged to reorder"* went red. **An async callback that
rebuilds UI will land inside a gesture; update in place instead.**
**AND A MUTATION SURVIVED FOR A GOOD REASON, which changed the test.** Making the row compute inline again
passed — because with a stable full-res answer there is no flicker left to detect. The real cost of
computing inline is two FULL renders per slider step, so the test now COUNTS CALLS and asserts zero.
**When a mutation survives, ask what the fix actually bought:** the old symptom was gone, so the old
assertion had nothing to see, and the right assertion was about cost, not appearance.
**Four ticks on one feature, and it was worth it:** attempt one shipped a plausible-looking check that
was wrong in a way only real use exposed. The measurements that killed the threshold design (vignette at
2.3x the floor) would never have shown up in a test written to confirm the design.

**🔎 v11.82 — BUG HUNT (his standing #260, queue empty). Found one, in MY OWN CODE ONE TICK OLD.**
The no-op check is two FULL-RESOLUTION renders on a 400ms timer and had **no guard for playback or
export** — change a slider, press play inside that window, and both renders land on the main thread
during the frames he is watching. **A stutter, in the app whose most frequent complaint is stutter, spent
on a hint nobody is reading at that moment.** Deferred rather than dropped; the test asserts both halves.
**HUNT YOUR NEWEST CODE FIRST — twice now that is where the bug was.** #477's withdrawal and this both came
from turning the hunt on work I had just shipped, not on the oldest code in the repo. New code has had the
least real use; old code has survived months of it.
**And a corollary worth keeping: a feature can be correct and still be a performance regression.** Every
assertion about this check passed at v11.81. Nothing was wrong with what it computed — only with WHEN.
**TWO DATA-LOSS HUNTS CAME BACK CLEAN, recorded so nobody re-runs them:**
· storage full mid-edit — no throw, work kept in memory, he is told, and the next save after space frees
  writes everything;
· a save in flight while the project switches — no cross-contamination, each project kept its own layers.

**✅ SHIPPED FROM THE AUDITS ALREADY (three, and two were destroying settings silently):**
- **v11.51** — dead `cvCurrentCfg` / "Canvas presets" code removed (his *"presets are just for effects"*).
- **v11.52 — 🚨 THE BIG ONE. Every export was silently 30 fps.** `#exp-fps` carried TWO `selected`
  attributes; HTML takes the last, so a 60/50/25/15/120 fps project opened Export on "30 fps" and rendered
  at 30 with nothing saying so. One word deleted. It survived months because the comment above it
  described the CORRECT behaviour — the prose was right and the markup was not.
- **v11.53 — 🚨 opening Canvas settings on a 24 fps project rewrote it to 30.** #118's dropdowns changed
  as he asked; a hardcoded MIRROR of the old list in js/app.js did not. A 24 fps project matched the stale
  list, `fpsSel.value = '24'` hit a row that no longer exists, the box rendered BLANK, and Apply read `''`
  → `|| 30`. Looking at the settings destroyed the setting. The mirror is deleted — the dialog reads the
  live control now, so it cannot drift from index.html again.

**⚠️ ALSO FIXED: `#426` was ticked `[x]` DONE while its own header read "⚠️ STAYS OPEN"** — invisible to
every queue tool for weeks. Reopened; `next.sh` now detects that contradiction.

**⚠️ NEW GATE: `tools/mutate.sh` REFUSES AN AMBIGUOUS MUTATION.** It already refused a MISSING old
string; this is the blind twin. `<option value="30">30 fps</option>` exists in BOTH the new-project and
export dialogs, the replace hit the first, the control under test was never touched — and the green run
looked exactly like a dead new test. Two suite runs lost. **A green run after an ambiguous mutation proves
nothing, same as after a missing one.**

**✅ v11.54 — #121 done.** Export now inherits BOTH fps and resolution from the project on every open. The
fps reset was guarded by `if (!onLadder)` so it skipped every common rate; the resolution remembered a
SCALE, so a 720p pick on a 1080×1920 project re-applied to a 2160×3840 project as "1440p". Verified in a
real browser, both halves mutation-proven (the resolution one only after I noticed MY mutation was invalid
— the real defect reads the old value BEFORE the list is rebuilt).

**✅ v11.55 — #141 done.** A `Custom…` rung on the export frame-rate list with a typed value, clamped
1–120, seeded from the project, hidden for audio-only, and not remembered between opens (#121's rule).
Two things only the mutation check caught: the input was 22px against every other control's 34px (a bare
`<input>` misses `.exp-custom`, the wrapper carrying the dialog's styling), and **the first test was DEAD
and looked alive** — it reimplemented the fps branches inside the test file, so deleting the app's custom
branch left it green. The rate now resolves in ONE place, `FM._exportFps()`, which both sides call.

**⚠️ A THIRD MUTATION LESSON, and the most important: A TEST THAT RE-DERIVES THE LOGIC IT IS TESTING CAN
ONLY EVER AGREE WITH ITSELF.** Drive the app's own function. If there isn't one to drive, extract it —
that is what the `FM._…` seams in this codebase are for.

**✅ v11.56 — #142 done.** The default shape colour now reaches freehand and vector drawing; before, an
add-menu shape took `#cc22cc` while a drawing came out `#ffffff`, though the entry claimed otherwise.
`'random'` still leaves the tool white and a hand-picked colour still wins — a default is a starting point.

**⚠️ MY OWN EDIT LANDED IN THE WRONG FUNCTION.** `sessionLayerId = null; …` appears in BOTH `stop()` and
`startDraw()`, the replace hit the first, and the seed ran when the tool CLOSED — the colour applied one
session late. **`mutate.sh` refuses ambiguous strings now, but HAND EDITS DO NOT GO THROUGH IT.** Anchor on
a string proven unique (`grep -c`) before replacing, and check which function the edit ended up in.

**⚠️ 22 Aug — A WHOLE REQUEST OF HIS WAS UNREACHABLE FOR EIGHT DAYS. #153 had NO HEADER**: his verbatim
words, a screenshot and a two-part spec ("trimming should show the numbers and the frame notches, like
Alight Motion") sat inside **#154's body**, an unrelated entry about a black bar. The numbering jumped
152 → 154 and nothing noticed. **Fifth distinct cause of the unreachable-entry family** — after unnumbered
items, the `[0-9]` grep, a malformed line, and an entry ticked `[x]` while saying "STAYS OPEN".
**#153 now has its own header and is ACTIONABLE.** The feature itself is the next build: a live readout
(Start · End · Duration / In · Out · Change) plus a frame-notch strip with the landing notch filled in.
His reasoning is the load-bearing part: *"the notches are frames and the whole thing has to actually line
up with the notches"* — so **check first whether the trim already quantises to whole frames**; if it does
not, the strip would draw a promise the trim does not keep and the quantising is the real work.

**⚠️ NEW GATE in `tools/next.sh`: a NUMBER WITH NO ENTRY is reported.** Silent on the 24 known gaps (mostly
numbers merged into a neighbour, e.g. "119 + 120"; 90/91 are unexplained with no recoverable text), fires
on any new hole. **A "dated His words line buried deep in a block" detector was tried FIRST and rejected**
— measured, legitimate entries carry that line up to 22 lines into their body (#303, #305), so it cried
wolf, and a detector that cries wolf stops being read.

**✅ v11.57 — #153's HARD HALF is done.** The entry warned: *"worth checking first whether our trim
already quantises to frames — if it does not, the strip would be drawing a promise the trim does not
keep, and the quantising is the real work."* It was right. The DELTA was quantised; the RESULT was not,
and an imported clip's duration is never a frame boundary, so an edge could only ever land between
notches. The edge is rounded now — real grip drags land on frame 85 / frame 25 exactly, snapping still
wins when active, and the untouched edge stays put.
**STILL TO BUILD for #153 — the visible half:** the six-value readout (`Start · End · Duration` /
`In · Out · Change`, Change signed) and the notch strip with the landing notch filled and coloured
in/out marks. It can be honest now, because the trim really does land where the strip would say.

**⚠️ PROBE TRAP: pointer events on the CLIP BODY perform a MOVE, not a trim** — both edges shift together
and it reads exactly like the fix failing. Drive `.clip-grip.left` / `.clip-grip.right`, and assert the
UNTOUCHED edge did not move; that is what tells a trim from a move.

**✅ v11.58 — #153 IS COMPLETE.** The readout (Start · End · Duration over In · Out · Change, Change
signed) and the frame-notch strip with the landing notch lit. A shape shows a dash for In/Out rather than
inventing numbers. `pointer-events: none`, asserted.
**⚠️ THE STRIP HAD TO BE A WINDOW, NOT THE WHOLE CLIP — and the entry's own wording pointed the wrong
way.** Drawn across the clip's span (what #153 literally describes), the dragged edge is ALWAYS at one end
of the strip, so "the exact notch it will land on" carries no information, and an 18s clip thinned 551
ticks into a block. **Build what the request MEANS when the literal reading cannot work — and say so.**

**✅ v11.59 — #165.3 done, and it was a BUG not just a gap.** A two-finger pinch while drawing did not
merely fail to zoom — the second finger ran the ordinary drawing path and **committed a stroke**, so every
attempt to zoom left ink (measured: viewport unchanged, layers 0 → 1). Two fingers now pan and zoom
anchored on the midpoint, the in-flight stroke is discarded, and the KEEP=90 clamp is SHARED with the
wheel pan rather than copied. The control that matters most — one finger still draws — is asserted.

**⚠️ A REAL FLAKE, NOW SEEN TWICE — it has earned its own item.** "a vertical flick on the timeline keeps
gliding" failed once on 22 Aug and again while shipping v11.64, both times reporting *a fling WAS armed
(v≈1.8) but the list did not move: 150 → 150*, and both times passing on the immediate re-run. It is not
caused by either change (one was the drawing overlay, one the transform panel). **A red suite that goes
green on a re-run is the worst kind of test**: it trains you to re-run instead of read. Filed as a thing
to fix rather than tolerated — see the queue.

**✅ v11.60 — #257 done, and it is the most instructive one yet.** The white gradient ring shipped
correctly at v8.36, then **queue 286 broke it on desktop** by claiming the same `::after` on every panel
card. The PC card had NO visible outline for weeks — its border is transparent on purpose, because the
ring IS the edge. 257 now owns `::before`, 286 keeps `::after`, both draw.
🚨 **257 HAD A TEST AND IT STAYED GREEN THE WHOLE TIME.** It is scoped to `.addmenu--sheet` — the PHONE
instance — which 286 never touches. **There are TWO add-menu instances in the DOM (BUG-HUNT §2), and a
test that only ever looks at one will pass while the other is visibly broken.** The new test asserts both
and REFUSES TO PASS if it never saw the panel one. **Apply that shape wherever a component renders twice.**

**⚠️ FIFTH INSTANCE OF THE SAME ROOT CAUSE: two things sharing one slot.** A stray `selected` (#471), a
stale fps mirror (#118), a dead preset block (#454), a duplicated clamp (#165.3, pre-empted), and now two
CSS features on one pseudo-element. **When adding an effect to an element, check what already owns that
slot.**

**✅ v11.61 — #338 done, and it is the SAME SHAPE as #257: one complaint, two places, fixed in one.**
The move/extend icons were redrawn twice (queue 235 desktop, v9.86 phone) and both fixes touched only the
SINGLE-clip pair; the multi-clip pair still carried the exact art he complained about. `ab()` could not
express a filled shape (`svgIcon()` hard-codes `fill="none"`), which is probably why it was skipped — it
now takes the same `{ html }` hatch `qbtn` had.

**⚠️ A PATTERN NOW WORTH CHECKING EVERY TIME: A FIX APPLIED TO ONE OF TWO PLACES.**
#257 (phone kept the ring, PC lost it), #338 (single-clip fixed, multi-clip not), #142 (add menu honoured
the colour, drawing did not), #118 (dropdowns updated, the code's mirror not). **When closing a request,
ask WHERE ELSE this behaviour lives — the phone/PC pair, the single/multi pair, the menu/tool pair.**
The test for it must assert STRUCTURE, not strings: two icons can differ character by character and still
look identical, which is the complaint itself.

**✅ v11.62 — #363 done. Same shape again: a rename applied to the Add menu and not to the other four
places.** The timeline's right-click menu, two refusal messages in the effects browser, and the shortcuts
sheet all still said "null". The internal `type === 'null'` is untouched and the test asserts that too —
a green run must mean "the word moved", not "the word vanished everywhere".

**⚠️ TWO GENERAL SCANNERS FAILED BEFORE THE NAMED-STRING TEST WORKED, and both failure modes generalise:**
1. A line filter excluding `null,` (to skip code like `f(a, null, b)`) also skipped the PROSE
   "…adjustment layer, null, or sample" — restoring that exact string left the suite GREEN.
2. A string-literal extractor matched apostrophes inside COMMENTS ("don't", "it's") and paired them across
   whole functions, reporting chunks of code as offending strings.
**A scanner over source text is far harder than it looks. When the sites are known and finite, NAME THEM**
— precise, cannot misfire, and a new site has to be added deliberately.

**✅ v11.63 — #386 done. The Outline card on videos/images offered a toggle, colour, size and position
and drew NOTHING.** The translation into the alpha stroke effect was correct since v10.64; its one
render-path caller only opened for caption tracks and live effect previews, so for an ordinary clip the
merged list was computed nowhere. Measured: 3600 red pixels, **0 green**. Now 1584 green at 6px, 4144 at
14px, 0 when off.

**🚨 A SEAM-ONLY TEST WOULD HAVE PASSED THE ENTIRE TIME.** "effectiveFx returns a stroke effect" was true
throughout — the translation was always right, nothing consumed it. **When a feature is "compute a thing
then render it", test the PIXELS, not the computation.** With a control asserting the picture is on screen
at all, so "nothing drawn" cannot pass for the wrong reason.

**✅ v11.64 — #419 done, and the POLISH-LOG had told him it was already fixed.** The rail diamond judged
add-vs-remove across ALL THREE rotate channels, so a tilt key under the playhead flipped it into REMOVE
and one press destroyed the tilt animation without ever keying rotation. It now judges on the channels it
is ABOUT; what it acts on is unchanged. The existing #419 test pressed the rail three times and every
press was an ADD — which is exactly why nothing caught it.

**✅ v11.65 — the LAST dropped clause from the closed-request audit is done.** A drawing's draw-on
keyframes were registered by neither collector, so moving a clip left them behind (transform 1,4 → 3,6;
draw-on stayed at 1,4). Registered now, GATED to a shape's open path — on a video the same `trimStart`
means SECONDS of source and is read as a bare number by the exporter and the audio player, so the gate is
asserted harder than the feature itself.

**🏁 THE DROPPED-CLAUSE AUDIT IS FULLY DRAINED — 12 of 12 buildable items shipped** (118, 121, 141, 142,
153/154, 165.3, 257, 338, 363, 386, 419, 227). Five remain that genuinely need Ezra: 184, 204, 285, 378,
461. The other audit (19 buildable OPEN entries, `tools/.buildable-audit.json`) is now the queue — plus
**#472**, the flaky flick test, which is ours not his and should not be left to rot.

**⚠️ 22 Aug — I REOPENED #426 IN ERROR AND HAVE RE-CLOSED IT. My mistake, and the lesson generalises.**
The new `next.sh` detector (entry ticked `[x]` whose body says it is still open) fired on #426 correctly
— that phrase WAS in its header. I resolved it by UNTICKING without reading to the end of the entry,
where **Ezra had already answered *"fixed"*** and it had been properly closed. So I put a done item back
on his queue and reported it as outstanding.
**A checkbox/prose contradiction can be resolved EITHER WAY, and which way is only knowable by reading the
whole entry, newest note last.** The detector says "these disagree", never "the checkbox is wrong".
**And the detector then fired on my own EXPLANATION of the phrase** — the "a note about the problem is
mistaken for the problem" trap the malformed-entry check above already guards against. It strips
backtick-quoted spans now, same treatment, same reason: a detector that cries wolf stops being read.

**NEXT, oldest first — from `tools/.buildable-audit.json` and the open queue:** **#472** (the flaky
vertical-flick test — ours, not his) is now the oldest actionable, then the 19 open-entry audit items. (a Custom rung on the export frame-rate list — never
built; every pattern it needs already exists in the canvas dialog), then 142, 154, 165.3, 257, 338, 363,
386, 419, and draw-on keyframes.
**⚠️ TWO PATTERNS WORTH NAMING, both earned this session:**
1. **A SECOND COPY of a list or a default** — three of the five bugs so far: the export list's stray
   `selected`, the canvas dialog's hardcoded FPS mirror, the dead canvas-preset block. **When a fix
   "updates the list", go looking for another copy before ticking it.**
2. **THE PROSE WAS RIGHT AND THE CODE WAS NOT** — #471's comment said "Same as project is the default",
   #121's comment said "They come from the project every time", #118's entry promised "Custom still
   reaches 24". All three were true sentences sitting above false code, and each survived review because
   the reader checked the sentence. **Verify the behaviour, never the comment.**

**⚠️ AND A MUTATION LESSON, twice in two ticks: a surviving mutation is not proof the test is dead.**
Once it hit an identical line in a DIFFERENT dialog (mutate.sh now refuses ambiguous strings); once it
restored the defect at only ONE of its two sites, so it re-applied nothing. **Check the mutation actually
reintroduces the defect before believing the test is the problem.**

**392's wall, so no future tick re-litigates it:** `speechSynthesis` speaks to the speakers and exposes no
stream, media element, or graph node. There is NO supported capture route in any browser. No capture → no
audio layer → nothing in an export. The only two real routes are BYOK cloud TTS or record/import a
voiceover, and **both are decisions only Ezra can make.**



---

## Moved out of LOOP.md on 26 Aug (v12.79) — the v12.55 → v12.68 stretch narratives
LOOP.md's CURRENT STATE section says "keep this short" and had grown back to ~810 lines, most of it a
per-release account of a day's work that every tick then re-read. Same regrowth this file was created
for. The durable lessons stayed in LOOP.md; the accounts are below, unedited.
⚠️ One of them is SUPERSEDED and is kept only as a record of how the conclusion moved: the #539 note
below says "it is NOT two walls fighting — the entry's own theory is ruled out". That was wrong. The
seam added at v12.65 showed Squish runs fully in a corner and cancels to identity because limX and limY
both clamp to 1, and v12.72 fixed it on exactly that reading.

**⚡ BATCHED SHIPPING IS ON (rule 15), on his instruction.** Six releases this stretch — v12.59 → v12.64 —
closing **#529, #530, #531, #533, #534, #536, #537, #538, #540**. Nine items, ~20 clauses.
· **#529** the whole multi-select path verified end to end (it works); the real cause is FOUR effects that
  render nothing at their defaults, now marked *"Needs a setting"*.
· **#531** same root cause as #523 — creators bypass `FM.selectLayer`. **That pattern has now bitten
  twice; grep for direct `scene.selectedId` writes before trusting the named setter.**
· **#536** four clauses; the bookmark lines were a hardcoded `320px`.
· **#537** Gradient Overlay: 8 blend modes, radial/conic, midpoint, dither. Defaults reproduce the old
  render exactly.
· **#540** motion blur measured BEFORE changing: linear to the old max, so the ceiling was the slider.
  4 → 12 shutter, 32 → 48 samples. 3.2× the unblurred width.

⚠️ **THREE OF MY OWN FAILURES THIS STRETCH, all the same shape — I trusted something instead of checking:**
· A helper inserted INSIDE an object literal broke the whole app. The **browser console** named it in one
  line; the suite had not been run yet. **Open the page after touching the compositor.**
· The #538 tap listener silently never fired, TWICE — bound to `#preview`, then to `#canvas-wrap`. That
  area is rebuilt, so any node captured at load is dead by the time the feature runs, **and that is the
  only state it runs in**. Document-level capture is the answer.
· #540 cost FOUR wrong measurements because `layer.x` is not what moves a layer — it is
  **`layer.transform.x`**. `evalProp` returns the right numbers for `layer.x` and the picture never moves.
  Worse, my "control" compared the smear WIDTH at two times, which is identical whether it moved or not.
  **A control that cannot fail is not a control.**

**📌 #539 (Squish) MEASURED BUT DELIBERATELY NOT BUILT — read this before starting it.**
· **Clause 1's premise is largely WRONG.** With a Shake on, Squish acted on **10 of 13 sampled frames**;
  the three misses are exactly when the shake pulled the ball off the wall. Queue 323's fix works. What is
  real is the FEEL — it pops in and out and the height jumps 158→234→183→288 frame to frame. **That is a
  damping design decision, not a composition bug.**
· **Clause 4 is real and worse than reported: the corner is a COMPLETE no-op** (125×125 → 125×125), and
  the right wall's squish FADES as the ball merely approaches the floor (236 → 230 → 210 → 160 → dead).
· **The decisive clue: dead in the corner in EVERY wall mode, including `Sides`, which excludes the
  floor.** So it is NOT two walls fighting — the entry's own theory is ruled out. Points at the padded
  plate or the alpha-bbox scan in `drawSquish`.
· Clauses 2/3 (layer picker) not started — arbitrary-shape collision, and it should not be rushed in
  behind an open corner bug.
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
**NEXT: #554** (filters do not preview on the canvas), then #556 onward.

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

---

## The STATE narrative, moved here from LOOP.md on 8 Oct 2026 (RULES-AUDIT B8)

LOOP.md kept the rules, what the work taught and the SAY list; tools/tick.sh computes the live state every tick.


📍 **STATE, 5 Sep, v15.57 — 1227 tests green, live on Pages. Ezra is back; the loop runs `tools/tick.sh` every minute.**
He came back after a fortnight and said he suspected *"delusion and lack of effort"*. He was right. Re-proving the last
27 releases found three that claimed what they did not do (#779 v15.53, #780 v15.54, #781 v15.44 — fixed in v15.57)
and 55 more unrefuted leads, all in **`tools/audit-2026-09-05.md`**. Of 33 "waiting on him" items audited, the reader
judged none as genuinely blocked; #570 had his answer in the entry for ten days under a re-ask. **What changed
structurally (rule 18):** `ship.sh` now refuses a release whose tests pass with the fix reverted (`prove.sh`);
`spotcheck.sh` re-proves any past release; `tick.sh` computes the tick; the classifier credits his reply formats and
shouts when a re-ask sits under an answer. **The refutation stage of the audit never ran (session limit) — verify
every digest lead against the code before acting, exactly as #779–#781 were.** Work the digest oldest-first.


📍 **STATE, 29 Aug, v14.16 — 1065 tests green, live on Pages. The loop is running on a one-minute cron.**

🟢 **THE OLDEST ITEM'S LAST ARCHITECTURAL PIECE IS DONE (v14.12).** *"Editing lags, and gets bad fast"*
had written its own next step down as a plan: *"a chain of warps does not yet stay on the GPU."* It does
now — one upload, one shader pass per effect ping-ponging between two framebuffers, one blit. Three
stacked warps at his 1080x1350: **117.0 ms → 3.3 ms**, byte-identical (0 of 1,458,000 pixels differ).
🔑 **AND THE NUMBER THAT MATTERS IS NOT A SPEEDUP.** At 6x CPU throttle (`tools/_chainphone.py`, new) the
old path went **291.6 → 1642.1 ms** and the chained path went **5.5 → 5.1 ms — not slower at all.** The
drawing is off the processor, so processor speed has stopped mattering. ⚠️ Chrome throttles the CPU, not
the GPU, and that GPU is this Mac's — so 5.1 ms is NOT a prediction about his phone, only proof the work
moved off the part of a phone that is slow.

🔊 **THREE REPORTS NOW COME FROM HIS DEVICE INSTEAD OF FROM A QUESTION** — Settings, each with Copy:
*Your last playback* (v14.13, #95/#96/#663), *Your last export* (v14.04, #215/#662), *A clip with no
picture* (v14.14, #129). **All three entries had ended for weeks on "this needs a number from HIS phone."**

🚨 **THE SAME SHAPE HIT FIVE TIMES, AND IT GREW A TWIN — read this before hunting any unreproducible bug.**
The app works out the answer and writes it where he cannot read it (#129's extension and canPlayType went
to an 8-second toast and a console.warn, on a bug he reported from a phone TWICE). **THE TWIN IS A WARNING
THAT OUTLIVES ITS BUG:** `cssFxUnavailable()` still reported the nine colour effects dead after v14.02 made
them work, so the browser painted "these will do nothing here" over a page where they had just started
working — and `perf-probe` printed "looks healthy" four lines above its own "rendering at 28% scale".
**A wrong reassurance and a wrong warning are one bug.** When you fix a capability, grep for who still
REPORTS on it.

🧮 **TWELVE ITEMS IN ONE DAY WERE PARKED ON AN ANSWER THAT WAS NEVER NEEDED** — six misclassified, six more
marked "NEEDS YOU" while naming no question at all. `tools/asks.sh` flags that second kind now. A question
asked once is not a question that still needs asking.

⚠️ **APPLE'S TRADE MARK WAS IN THE EFFECTS UI UNTIL v14.15** — "Rounded Corners / Apple style", plus its
toggle and its browser description. #484 called that exact string "the worst one, needs no debate" and
then renamed the 22 Alight Motion labels and never looked at ours. Now *Squircle Corners*, with a sweep
asserting no effect label, param or description carries any company's name. **Publishing blocker, not
tidying.**

🧪 **AND THE CRITIQUE STAGE EARNED ITS KEEP (v14.16).** Four new effects were designed for #484 clause 2;
**only one shipped.** Duplicate Array was largely already there as `linearrepeat` ("Trail"); Spill Remover
and Sway would both have been **invisible at their defaults** on the sample the tiles render against —
which is #661 exactly. **Check a new effect against the existing 199 and against the thumbnail sample
BEFORE writing it.**

📍 **(previous) STATE, 28 Aug, v14.05 — 1052 tests green.**

🔴 **HIS BIGGEST ISSUE IS #661 AND IT IS BUILT, BUT NOT CONFIRMED.** *"These effects still don't work on
mobile, this is probably the biggest issue you still haven't solved."* Seven tiles badged "no change at
this value" on a RED square. **The badge was lying and refutes itself** — grayscale can only reach that
wording on a non-grey pixel, and grayscale on a non-grey pixel must change it. The only way both happen
is `ctx.filter` never applying. **All nine CSS effects now render through a GPU shader when it does not**
(js/gl-color.js, v13.95–v14.02), exact against the real filter, exercised via `FM._forceNoCtxFilter` so
the path his phone takes is testable HERE.
⚠️ **AND THE HONEST COST: effects that did nothing were FREE.** Drawing them costs **1.19x** per frame.
Not a regression — they were broken, not cheap — but say it rather than selling the fix as free.

🔑 **THE ONE SENTENCE THAT CHANGED EVERYTHING TODAY:** *"The export issues I have were on mobile, I don't
got my pc rn but I've exported pc before just fine."* **#604's header says the bug being on BOTH devices
"kills any 'his phone is odd' theory" — that is now withdrawn.** Every measurement in #604 and #215 was
taken on the device that works. **Settings → "Your last export" → Copy** now answers it from his phone.

🚨 **FOUR TIMES TODAY THE APP HAD WORKED OUT THE ANSWER AND WRITTEN IT SOMEWHERE HE COULD NEVER READ IT.**
#129 (the H.265 sniff never ran on Safari), #215 (all five audio warnings painted behind the export
overlay), #661 (perf-probe has said "THIS DEVICE CANNOT RUN CANVAS FILTERS" for weeks), #662 (every export
value had no readers outside the suite). **When a report is unreproducible, check whether the app is
already saying the answer somewhere invisible before hunting for a new cause.**

🧪 **THE TOOLS CAUGHT ME THREE TIMES AND I WOULD HAVE SHIPPED ALL THREE:**
· a **half-pixel** error across every warp kernel, which I had already written up as expected resample
  noise, citing rule 14. **A tolerance chosen to accommodate a difference hides its cause.**
· **two dead tests** that passed with their own fix removed (the quality ladder, and the contrast sweep —
  the second because a broader selector still cannot see an element that was never rendered).
· **queued GPU work timed as finished work**, three times in three disguises, including a "cliff at six
  effects" that did not exist. **Every GPU timing needs a fence the driver cannot defer past.**

🛑 **AND I DELETED FOUR TESTS WITH A TEXT EDIT AND THE SUITE WENT GREEN.** Found only by diffing test
NAMES against HEAD by hand. **ship.sh now refuses that** (declare with `DROPS TEST:`). The test-FLOOR
check does not cover it — it compares counts, so deletions and additions net out.

🔥 **READ #645 FIRST — AND THE CAUSE IS NOW ALMOST CERTAINLY KNOWN. IT IS MOBILE-ONLY.**
His words, after three sessions of desktop testing found nothing: *"I noticed that on pc the effects i
say that dont work like saturation actually work, its mobile they dont"*.
✅ **EVERY DESKTOP PATH IS PROVEN CLEAN BY MEASUREMENT** — mono filters on a shape (spread 0.0), on real
footage (200 → 0.0), the browser TILES (0.0, with a colour control at 71.8), container strength
(perfectly linear 0/50/100/150/200), editing child params, saturate/brightness inside containers, and the
registry defaults. **Nothing is wrong with the maths or with any render path I can reach from a desktop.**
🎯 **PRIME SUSPECT: canvas `ctx.filter` is NOT SUPPORTED on his mobile browser.** The nine effects folded
into that one property (`FM.CSS_FX`, compositor.js:1458) are blur, brightness, contrast, **saturate**,
hue, **grayscale**, sepia, invert, glow — **brightness, saturation and black-and-white are three of the
nine he named.** The compositor's own comment (line 1522) says an invalid assignment to `ctx.filter` is
**silently ignored**, so on a context without support the draw simply proceeds unfiltered: no error, no
toast, no dead badge. The ~190 per-pixel effects keep working, which is why only *these* look broken.
⚠️ **NOTHING IN THE CODEBASE FEATURE-DETECTS IT.** `fx-registry.js:561 supportsFilter` is about filter
CONTAINERS, not the canvas API.
✅ **THE DETECTOR IS BUILT AND SHIPPED (v13.71): `FM.ctxFilterOK()`.** It RENDERS a red pixel through
`grayscale(1)` and reads it back rather than sniffing the API — a context can accept the string, echo it
back and still draw untouched. It reports through the perf tool he already pastes: the DEVICE line ends
`canvas filter OK` / `MISSING`, and a MISSING report OPENS by naming all nine dead effects.
➡️ **THE NEXT MOVE IS ONE LINE FROM HIM: "what's slow" on the PHONE, send the DEVICE line.** No desktop
can answer this — that is the entire lesson of the last three sessions. **Do not build the fallback until
that line arrives**; if it says OK, the diagnosis is wrong and the fallback is a wasted session.
➡️ **THEN: a per-pixel fallback for the CSS_FX family.** grayscale/saturate/brightness/contrast/sepia/
invert/hue are trivial per-pixel maths and there are ~190 per-pixel effects to model it on; **blur and
glow are the hard two.** Feature-detect ONCE and cache it.
⚠️ **AND KILL THE SILENCE EITHER WAY** — an effect that cannot run on this device must SAY so, like the
dead-effect badge in #603. Three sessions were lost to a failure that leaves nothing behind.
🛠 **Probes kept:** `_645media.html` (footage), `_645tiles.html` (browser tiles), `_645strength.html`
(container strength + child params). All three pass on desktop, which is now the POINT, not a
disappointment. **A group-path probe was attempted and DELETED — it could not create a group
(`FM.groupLayers` / `FM.makeGroupFrom` are not the right entry points), so the group path is UNTESTED.**

✅ **#630 CLOSED v13.80 — groups zoom about their MIDDLE now.** `applyParentChain` scaled a child about
the parent's own (x,y) and `groupSelection` creates every group at **(0,0) on purpose**, so scaling threw
the contents at the project origin. `FM.groupPivot` + a pivot sandwich, applied **only when rotation or
scale is non-identity** so an untransformed group is byte-for-byte unchanged.
🚨 **THE BLAST RADIUS WAS REAL — three things broke and all three were worth knowing:**
**1.** `bakeGroupTransform` is `applyParentChain`'s algebra longhand for UNGROUP — a matched pair — and it
still baked about the origin, so ungrouping moved his layers. **Change them together, always.**
**2.** A shipped test asserted the OLD origin-scaling. Its concern was right, so it was kept by adding a
second child: the pair must **spread apart while staying centred**.
**3.** **#628 regressed for one run.** A group compensates by `(R·S − 1)·δ`, **zero at scale 1**, because
its children sit at `gx + P + R·S·(L − P)`. A normal layer's content is always offset by its anchor; a
group's is not. Verified 0.0px unscaled, 0.0px scaled, 13.6px uncompensated.
💡 **mutate.sh's "caught, but not by the test you expected" is a REAL result, not a nag** — #630's test
only asserted the maths, so it would have survived its own fix being deleted. It has a pixel half now.

✅ **#630 FULLY CLOSED v13.80 — BOTH clauses, and clause 2 caught a regression clause 1 had left.**
The anchor dot was switched off for groups outright (`layer.type !== 'group'`, commented *"a group has
no pivot of its own to show"* — true until clause 1). It shows at `g + P` now; the sandwich cancels for
the pivot point itself, so there is nothing to undo.
🚨 **AND THE MATCHED-PAIR FAILURE HAPPENED A THIRD TIME IN THE SAME ITEM.** `FM.groupBounds` — the
selection box, the **hit-test**, the drag and the resize — carried a byte-identical copy of the geometry
`applyParentChain` had just been taught to pivot. **MEASURED: at 1.6× the box sat 455px off the group.**
The size term was right, so nothing looked broken. It now shares ONE walk (`groupBoundsLocal`) and ONE
anchor reader (`pivotIn`) with the pivot.
💡 **THE LESSON, and it is now three for three: when you change how a transform is composed, grep for
every function that reproduces that algebra.** In this item that was `bakeGroupTransform` (ungroup),
a shipped test, the #628 compensation, and `groupBounds`. Four copies of one law.

✅ **#602 CLOSED v13.80** — clause 1 shipped v13.52; clause 2 was answered by reading all 199 effects
and the answer is *remove nothing* (Line height and Curve have no equivalent; Spacing was his own
request). It was holding the queue for a recommendation, not for work. **One standing offer left in the
entry: drop Animate→Typewriter for `textprogress`. Do not do it without his word** — deleting a control
he may be using is a direction call.

✅ **#604's CLIPPING HALF FIXED v13.80. 🛑 NOT the "no audio" bug — never report it as one.**
`buildAudioMix` summed and never limited; two ordinary layers at volume 1 hit **peak 1.52–1.61** and the
decoded export carried it, so overlapping sounds hard-clip through AAC. Flat gain to 0.995 when the sum
crosses 1.0 (AAC overshoots its input — 0.8000 in came back 0.8224, so 1.0 would clip on the way OUT).
❓ **#604 stays open on ONE action of his:** export on the PC, drag the .mp4 into a Chrome tab, play it.
Everything inside FreeMotion is measured and sound; nothing here can answer what the OS does next.

✅ **#629 CLOSED v13.79 — and HALF the guard already existed, which is why the code read fine.**
`restore()` filtered **`selectedIds`** to surviving layers and then assigned **`selectedId` raw** from the
snapshot — and a snapshot names whatever was selected *before* the undone layer existed. Nobody wrote a
"fall back to another layer" rule; the old selection simply came back with the old scene.
💡 **Worth reusing: when one of a pair of parallel fields is validated and the other is not, the bug hides
in the gap.** Grep for the sibling whenever you find a filter like that.

✅ **#628 CLOSED v13.78 — and the compensation was the ONLY thing moving his clips.**
`applyLayerTransform` never reads a group's anchor and a group has no content box, so moving the pivot
does **0.0px** on screen — the code then "corrected" for a movement that never happened. It also
multiplied by `layerSize`'s **100×100 media fallback** for a group whose real bounds are **900×300**
(25px shifted where 225 was needed). Now `FM.anchorPivotBox(layer)`.
🎯 **#630's CAUSE IS PROVEN BY THE SAME PROBE:** a group scaled 1.5x grows **identically** at anchor
0.5/0.5 and 0.0/0.0 — 0.0px apart. **There is no anchor to find because the renderer never reads one.**
`FM.anchorPivotBox` is the single place that must start returning `FM.groupBounds`.
🐛 **A DEAD TEST CAUGHT BEFORE SHIPPING — second time tonight this shape appeared.** Setting
`transform.anchorX` directly and asserting x/y did not move is **vacuously true**: writing the field never
runs the compensation. **If a fix lives in a closure, make the DECISION a seam and test that.**

✅ **#627 CLOSED v13.77 — and the jump was never broken.** Snap points include clip EDGES, and a clip's
right edge is `start + duration`: **the first instant the layer is no longer drawn.** So "jump to the end"
always landed one frame past the last visible one.
💡 **THE RULE IS ABOUT BLANKNESS, NOT EDGES** — special-casing "clip end minus a frame" would move the
playhead off a boundary he may have chosen (where you split, or butt the next clip). It steps back only
when the landing frame shows nothing and the one before shows something. A join between two butted clips
is left alone; a jump into empty space stays put rather than hunting.
🔗 **#626 and #627 both produced a black preview and were DIFFERENT bugs** — the entry said to check
rather than assume, and that was right.

✅ **#626 CLOSED v13.76 — his clips were in a GROUP, and a group does not follow its contents.**
Children 2.000 → 1.176 at 1.7x while **the group stayed 2.000**: 0.824s of empty tail inside it, **0 lit
pixels at t=1.95**. The project stays long because `autoFitDuration` measures the GROUP's end.
`FM.refitGroupsFor(layer)` fixes it, from the **re-time sites only**.
⚠️ **NOT from `autoFitDuration`, deliberately** — that runs every rebuild and **a group can be TRIMMED**
(the grips carry no type guard), so refitting there would silently undo a deliberate trim.
💡 **TWO HYPOTHESES WERE KILLED BY MEASUREMENT FIRST AND BOTH EARNED THEIR TIME:** there is no trailing
gap after top-level clips, and **an exhausted source FREEZES on its last frame rather than going black**
— which is what proved "black" means *nothing is drawn here* and sent the search inside a group.
✅ **#617 CLOSED** — clause 1's cause was the v13.72 stranding fix; clauses 3/4 gave the delete routes.

✅ **#625 CLOSED v13.75 — the duplicate keyframes, and BOTH halves had one cause.** The drag snaps to the
frame grid; every other write took the RAW playhead time. Measured: 12.5ms apart, past the 1ms dedup
window, **0.75px on screen** — so they draw on top of each other, and deleting one leaves the other.
**Snap at the write + a HALF-FRAME dedup window**, the second so his existing off-grid projects heal.
🐛 **THE MUTATION GATE CAUGHT THE TEST PASSING FOR THE WRONG REASON** — it drove `toggleKeyframe` only,
so deleting the snap in `upsertKeyframe` left the suite green. **`upsertKeyframe` is the AUTO-KEY path
(dragging an already-animated layer) and had NO coverage.** Always mutate a new assertion.
💡 **AND CHECK FOR AN EXISTING HELPER BEFORE WRITING ONE** — I re-implemented `FM.snapFrame` without
noticing it existed, in the same file that warns about the text-size number being written twice.

✅ **#623 CLOSED v13.74 — copy/paste a graph.** The hard part was the MODE: a curve lives in three
fields (`ez` / `bez` / `e`) and **which are SET is the mode**, so paste writes all three and clears what
must not survive — otherwise a Steps graph reads "Steps" and draws a bezier. **Its own clipboard**, since
the app's carries layers and pasting a graph over a layer would be worse than no feature.
🐛 **A SHIPPED TEST CAUGHT THE LAYOUT THE MOMENT THE BUTTONS EXISTED** — three 36px chips stacked in the
84px `.es-side` column hang 7px below the rail on a 290px panel. They wrap now (80px vs 124).
💡 **That test — "every rail button is really on screen" — is worth knowing about before adding ANY
control to the easing editor.** It measures every button in every rail and it is why this did not ship broken.

✅ **#622 CLOSED v13.73 — and the lesson generalises.** The view rail read 1x while the speed changed
from the transport. Not a missing call: **three displays of one value, two writers, each hand-patching a
different subset.** Wiring the pair he noticed would have left the next writer free to forget.
**The WRITER notifies now** — `FM.setPreviewRate` calls every subscriber, `FM.onPreviewRate(fn)` signs one
up. Both directions come free because neither is a binding any more.
💡 **WORTH REUSING: when a value has more than one display, notify from the setter.** A binding you have
to remember to add is the bug waiting to happen; this repo's whole safeguard doctrine says so.

✅ **#619 BUILT v13.72 — TEMPLATES ARE FILLABLE.** The Insert-your-Media sheet counted only video/image
layers, so it returned false and showed NOTHING for every template he has ever made — his are text and
shapes. He reported it twice as *"templates just create themselves as a project"*. Text and shape layers
are slots now, each with the control that edits it: **Your words**, **Your colour**, **Replace Media**.
🚨 **THE ENTRY HAD PARKED THIS ON "one word from him" AND HE HAD ALREADY GIVEN IT** — *"I know it's a big
thing to do idc"* is a pre-authorisation, and the entry's own header said *"do NOT park it on a decision
about scope"*. **Re-read what he wrote before asking him to choose; the answer is often already there.**
⚠️ **THREE SHIPPED TESTS ASSERTED THE OLD RULE AND WERE REVERSED ON PURPOSE** — one said outright *"a
shape and a text layer are not yours to replace"*. They were faithful tests of the shipped behaviour and
the shipped behaviour was the bug. Each carries why it flipped. **The control moved with them: the case
that must still stay silent is an EMPTY template.**
📐 Verified at 380px (tests/_619fill.html): 2 slots, opens, right control per chip, typing repaints the
preview, swatch writes the fill, field is 16px (iOS zoom guard), no sideways scroll.
❓ **LEFT OPEN until he has seen it** — asked twice, and wrongly marked done once already (#343).

🆕 **THIRTEEN NEW REQUESTS LOGGED, all verbatim: #645–#657.** #657 is a PC perf sample that reads
healthy — but it renders at **28% scale** to get there, and scrubbing was never sampled. **Get one from
the PHONE, with the playhead dragged**, before touching #95/#125/#387. #647 is already fixed and shipped.
· **#646** PC splash cuts from white to colour instead of fading — *"try really hard not to accidentally
  break anything"*, so narrow diff, and measure the MOBILE path before and after to prove it did not move.
· **#648** tapping a project in the home menu does not select — only press-and-hold works. **Check against
  #617 clause 3 (v13.61 routed draft cards through `selectify`) — this may be that regression.**
· **#649** the New-project dialog's TITLE is dark ink on a dark panel. **Same shape as #647 in the
  opposite direction** — a family rule that misses one member, now twice. Suspect a
  `html[data-home="light"]` rule reaching into a dark dialog floating over the light home.
· **#650** PC hover-expand on project cards, like the editor's Add menu. He named the reference — REUSE
  it. Gate behind `@media (hover: hover)` or it latches on touch.
· **#651** the editor's empty Template panel explains nothing. The HOME tab already has the right words.
· **#652** the ⋯ on a card: no circle at rest, a cursor-GLINTING blue circle on hover, a dot animation on
  tap for mobile. **Do it WITH #650 or the two will fight over the same hover.**
· **#653** no way to HEAR an audio effect while adjusting it. Read `audio-fx-live.js` first — and reuse
  the SFX list's row-preview rather than rebuilding it. Must not auto-play on open.
· **#654** ⭐ **the first report in this file from someone who is NOT Ezra** — a friend could not work out
  how to LEAVE the audio edit menu. **Look at the existing exit before adding a second one**; "I couldn't
  get out" is usually a close button that reads as decoration.
· **#655** groups get a disclosure ▸ on their timeline row. He wants it GONE — but the second half is
  *"it glitches out the timeline when you add a group"*. **Reproduce the glitch BEFORE deleting**, or the
  deletion gets credited with a fix it did not make. Check the arrow is not the only way into a group.
· **#656** the search bar still wears the DARK theme on the light home, and its hint line is unreadable.

🚨 **THAT IS THE THIRD LIGHT-THEME MISS IN A ROW — #647, #649, #656 — AND IT IS ONE BUG, NOT THREE.**
A rule under `html[data-home="light"]` names two or three elements and skips a neighbour, so dark-theme
ink survives on a white page. **Fix it as a CLASS: sweep every light rule in theme-glass.css and find the
text near it that was never given a light colour.** He has been finding these one screenshot at a time.

✅ **SHIPPED IN v13.70:** #647 (light-home empty-state headings were invisible — the override covered
`.hm-empty`/`.hm-empty-sub` and never `.hm-empty-title`) and **#617 clause 1**.
🔎 **#617 clause 1 — CAUSE FOUND AND FIXED, after the entry had given up on it.** `openForEdit` mints a
workspace then bails with `discardDraft(pid)` on failure — and **`create()` ends with `await this.open(id)`,
so the draft it just minted IS the current project, and `discardDraft` refuses on the current project by
design.** The line whose own comment said *"do not strand a draft"* stranded one every time. It strands
one per ELEMENT, not per tap (the next open matches it by `ofElement` and reuses it), which is why his
count crept. Fixed by landing back on `returnTo` first. **The refusal itself is correct and the test
asserts it survives.**

🔊 **#604 — every link inside FreeMotion is measured and SOUND. The exported file HAS audio in it**
(decoded: peak 0.82 / rms 0.55). moov textbook-correct, `esds` present. **It needs ONE action from him,
not another session: export on the PC, drag the .mp4 into a Chrome tab, press play.**
📐 **Found in passing, NOT fixed: the mix CLIPS** — two ordinary layers at volume 1 peak at 1.52–1.61.
`buildAudioMix` sums and never limits. Logged under #604 clause 2. **Not a fix for "no audio".**

🔎 **#602 clause 2 answered in code:** Spacing and Animate→Typewriter ARE duplicated by effects
(`textspacing`, `textprogress`); **Line height and Curve are duplicated by NOTHING**, so "remove the
circled four" would delete two features with no equivalent. A test locks that.

❓ **WAITING ON HIM (none of these hold the queue):** #602 (drop the Typewriter preset?), #604 (the Chrome
tab test), #610 (option A or B — mockup already sent), #619, #642, #643.

🛠 **`tools/probe.sh _name.html [secs]` runs ONE tests/_*.html probe headless** and refuses while a
mutation is in progress. Live probes: `_604sfx.html`, `_604boxes.html`, `_617drafts.html`.
⚠️ **#654/#655/#656 WERE WRITTEN INTO REQUESTS.md WHILE THE v13.70 SHIP WAS RUNNING**, deliberately: he
was about to reset the app and the alternative was losing them. They are doc-only, so they rode along in
that commit without being named in its message. **Nothing is missing — this line is the record of it.**
⚠️ **A BOX WALK IS CODE AND LIES LIKE ANY OTHER MEASUREMENT.** A scan reported `tkhd duration=0` on both
tracks — a parser bug (v0 tkhd duration is at byte 28, not 24). **The tell was that it accused the VIDEO
track too, which plainly plays.** If a probe indicts something that demonstrably works, suspect the probe.

🔊 **#604 — EVERY LINK INSIDE FREEMOTION IS NOW MEASURED AND SOUND. The exported file HAS audio in it.**
Decoded the real export back: peak 0.82 / rms 0.55 against a 0.80 / 0.57 source. Same with a video layer
plus a built-in SFX through the real path. The moov is textbook-correct — audio `tkhd` 1579, `mdhd`
1.579s, 74 samples, **`esds` present**. Mix → encode → mux → byte assembly → structure → audible content:
all verified. `deliver()` hands over the same immutable bytes and cannot change it.
🛑 **The entry's own "next step" was a DEAD END and is withdrawn:** "save the blob then re-scan it"
cannot fail, because `new File([blob])` reuses the same bytes. **Decoding it was the question worth
asking** — a box scan proves a track EXISTS, never that it carries sound.
⚠️ **A BOX WALK IS CODE AND LIES LIKE ANY OTHER MEASUREMENT.** My first scan reported `tkhd duration=0`
on BOTH tracks — a smoking gun, and a parser bug: version-0 `tkhd` duration is at byte 28, I read 24
(the reserved field, always zero). **The tell was that it was zero on the VIDEO track too, which plainly
plays.** If a probe indicts something that demonstrably works, suspect the probe.
🔍 **A COMMENT POINTING AT A TEST THAT DOES NOT EXIST IS WORSE THAN NO COMMENT.** exporter.js said the
streaming sink was "exposed for tests/_mp4sink.html" — no such file, and zero suite coverage of
`createMp4Sink`. It folds every 4 MB and splices out-of-order patches, **so an export under 4 MB
exercises none of it** while his real ones exercise all of it. Now tested byte-for-byte and CORRECT.
🛠 **`tools/probe.sh _name.html [secs]` runs ONE tests/_*.html probe headless** and refuses while a
mutation is in progress. Every ad-hoc probe before this was hand-rolled python pasted into a Bash call.
➡️ **#604 NOW NEEDS ONE ACTION FROM HIM, not another session: export on the PC, drag the .mp4 into a
Chrome tab, press play.** Sound there = the loss is the camera-roll import / player, outside the app.
No sound there = the project or environment, and the mixer's drop report will name it.
📐 **FOUND IN PASSING, NOT FIXED: THE MIX CLIPS.** Two ordinary layers at volume 1 peaked at 1.52–1.61.
`buildAudioMix` sums and never limits, so overlapping sounds hard-clip through AAC. Logged under #604's
second clause. **Not a fix for "no audio" and must not be sold as one.**

🔎 **#602 CLAUSE 2 ANSWERED BY READING THE CODE, and the entry's old claim was WRONG.** It asserted
*"Curve and Animate are the two genuinely duplicated by effects"* — nobody had looked. The real answer:
**Spacing is duplicated exactly** (`textspacing`) and **Animate's Typewriter preset is duplicated and
beaten** (`textprogress` reveals by WORD with a caret). **Line height and Curve are duplicated by
NOTHING** — no effect sets leading, and Curve is glyph LAYOUT (`drawArcLine` rotates each character to
the tangent) where bend/curl/wave displace pixels and smear the letters.
🚨 **So "remove the circled four" DELETES TWO FEATURES WITH NO EQUIVALENT.** A test now locks that door
and fails loudly if `textspacing`/`textprogress` ever vanish, since the whole conclusion rests on them.
💡 **THE LESSON WORTH CARRYING: an entry's own analysis is not evidence.** This one carried a confident,
wrong sentence for long enough that I nearly asked him to arbitrate between two readings of it. The
effects catalog has a `text` CATEGORY — six effects that read the STRING, not the pixels
(`TEXT_ONLY`, js/fx-registry.js:153). Six greps settled what a decision request would not have.

📐 **#621 MEASURED — rounded corners does NOTHING on a rotated layer.** 0°: 16.9% of the shape removed.
45°: **0.0%** — four pixels out of 9548. The mask is built in the AXIS-ALIGNED alpha box, and a rotated
rectangle's own corners sit at the MIDDLES of that box's edges, so nothing gets cut.
📐 **SIZE half: the corner is 53.8% of the short side at scale 0.25 and 33.0% at scale 1.0.** But this
half is **arguably correct** — an absolute radius is what CSS does. The surprise is the CLAMP to half
the short side on small shapes. **Rotation is a bug; size is a policy question for him.**
➡️ **NEXT TICK: mask in the layer's OWN space.** The kernel signature is `(A,B,W,H,bb,p,t)` and other
canvas effects also receive `layer` — so the rotation is reachable without new plumbing.
⚠️ **TWO PROBES WERE THROWN AWAY FIRST.** `renderScene` paints an opaque project background, so counting
ALPHA counts the background: every reading was "the whole canvas, and rounding removed 0". **Count the
shape's own COLOUR.** The control that caught it was `shapeFitsInsideFrame`.

✅ **#620 DONE — the magnet governs all four snap sites in Position / Scale.** ⚠️ **The canvas drag does
NOT snap and that is HIS doing** (the code quotes him asking for it to move to the trackpad), so his
words "on the canvas" meant those controls. **Read the comments before believing a report contradicts
the design — it may be quoting him from three weeks ago.**
🔒 **The test checks the SOURCE as well as the behaviour** — it counts `magnetOn()` references and fails
below five. **A gate nothing calls passes a behavioural test forever.**
🔒 **And it FAILS SAFE:** no `isSnapping` seam → snapping stays ON. A missing API is not a user choice.

🔁 **A CORRECT DECISION TAKEN SILENTLY IS REPORTED AS A BROKEN FEATURE — THREE TIMES TODAY.**
· **#603** — the app knew the layer had no colour and wrote it in a hover tooltip a phone cannot show.
· **#618 c2** — the card told him to use a menu item that menu did not contain.
· **#619** — the template media-swap opens only when there is media, and said nothing when there wasn't.
**Each was reported as "this doesn't work". None of them was wrong; all three were quiet.** When a
feature declines to act, that decision has to be visible or it reads as absence.
✅ **#619 ANSWERED: the feature EXISTS, is wired, and is correct** — `js/template-fill.js`, opened 420ms
after the push. Measured: text+shapes → 0 slots → no sheet; +1 image → 1 slot → opens. **His projects
are shapes and text**, so it has silently done nothing every time.
⚠️ **NOT TICKED.** He asked to swap MEDIA and his templates have none. **One word decides it: is the
explanation enough, or should shape/text layers be swappable too?** He pre-authorised the size.

🚨 **THREE TIMES NOW, A WHITE-ON-DARK COLOUR HAS SURVIVED INTO THE LIGHT LOOK AND GONE INVISIBLE**
— the selected tab (1.1:1), the wordmark (white art on a light bar), the pinned title (**1.02:1**, and
he had to report it). **When adding a theme, every hardcoded light TEXT colour is a candidate; the
backgrounds get noticed because you can see them.**
🔒 **So #644's test SWEEPS rather than naming a rule:** it walks the home screen's real text, measures
each element against its own nearest opaque ancestor (so a light badge on a dark thumbnail is fine), and
**pins a card first** — the pinned state is one most runs never reach, which is why this got through.
✅ **#618 CLOSED** — and note its header was left unticked for a turn while both clauses were ticked, so
"closed" was said before it was true. **Tick the HEADER, not just the clauses.**

✅ **#618 IS CLOSED.** Clause 2 was a **BROKEN INSTRUCTION**, not a workflow preference: the draft card
told him to use "⋯ → Save as element" and that menu did not contain it — the action was on the PROJECT
card's menu. **From the outside, an instruction you cannot follow and one you resent look identical**,
which is worth remembering the next time a report sounds like a matter of taste.
🔒 **Its test asserts the RELATIONSHIP, not the wording** — it reads the action out of the subtitle and
requires the menu to have it. Reword freely; drop the item and it fails.

🚨 **THE HISTORY LIED ONCE TODAY, AND THERE IS NOW A GATE FOR IT. READ THIS BEFORE SHIPPING.**
His report arrived while the v13.64 ship was mid-suite, and I went straight at it and edited the tree.
**`ship.sh` commits with `git add -A` AFTER the suite passes**, so the newer work was swept into the
older commit: `01dd9b3` says **v13.64** and describes thumbnails, while the files inside it say
**v13.65** and carry the wordmark and intro fixes. **Nothing broke in the app — everything is green and
pushed. What took the damage is the record**, which is the thing we both read to work out what changed.
The second ship then died with "nothing to commit", having run two suites for nothing.
✅ **STRUCTURAL FIX, not a note: `ship.sh` now refuses when the commit SUBJECT names a version that
disagrees with `index.html`.** Proven in both directions — it refuses `v13.99` against a v13.65 file and
lets a matching subject through. Only the subject is checked, and only when it names a version, so body
prose citing old versions and no-version docs commits are unaffected.
⚠️ **The rule this broke was already written down: DO NOT EDIT THE TREE WHILE A SUITE IS RUNNING.** It
was broken because a user report felt urgent. **Hold the edits; the ship is 4–8 minutes.**

🚨 **THE WORDMARK'S EFFECT LAYERS ARE MASKED WITH THE WORDMARK IMAGE — SIX REFERENCES, FOUR RULES.**
Swapping `.hm-brand-img`'s src at v13.62 left all six cut to the OLD logo, so a pale ghost of it sat
behind the new one in BOTH looks. **He spotted it and described it exactly: "an M as the backdrop for
the big M… it doesn't look the same."** If the wordmark ever changes again, change all six.
⚠️ **And the light look had switched off only TWO of the four brand effect layers** — `.hm-brand-wm::
before`/`::after` kept painting a dark-bar specular over black ink. All four off now.
📐 **#642: the intro's bars are arithmetic** — his film is 9:16, his phone ~9:19.5, so `height:100dvh`
made it wider than the screen and `max-width` clamped it into bands. **`object-fit: cover`**, measured
from his recording: at t=3.48 the middle read 255 while the bands read 124/162.
⚠️ **Sample a video through PLAYBACK, not seeking** — a seek-based probe returned the identical frame
eight times and would have been believed.
📌 **STILL WAITING ON HIM:** #602 · #610 (A or B) · #624 · **#643's taste half — he should see the
clean wordmark first, since the ghost and the shadow were what made it look bad** · #642 clause 3, a
nicer home background (#545: draw options).

✅ **#618 clause 1 DONE — element drafts show their picture.** The picture was **already stored**: a
draft IS a project, so autosave had been snapshotting it all along and the card never asked. Measured
first (1631 and 2919 chars of stored image data), so this was a 3-line lookup, not a pipeline.
🔁 **#641 — A REGRESSION FROM MY OWN #640 FIX, CAUGHT IN A SCREENSHOT TAKEN FOR SOMETHING ELSE.**
Read the two together: covering `#home-screen::before` with the colour wash destroyed its overscan
(#187's bar, white); moving the wash OFF it handed the dark ground back, because a `z-index:-1`
pseudo-element inside a positioned parent paints ABOVE the parent's background. **Two opposite bugs,
one rule.**
🔑 **RULE: `#home-screen::before`/`::after` may be RECOLOURED, never RE-BOXED.** No inset, no size, no
transform. The test asserts colour AND geometry together — either alone passes one of the two bugs.

🔎 **#617 clauses 1–2 INVESTIGATED, NOT FIXED, and the entry's assumed cause is REFUTED.** Three
measured attempts could not make v13.63 accumulate element drafts: editing with a commit is net zero,
editing without one REPLACES rather than piles up, and the + probe was inconclusive because it opens a
name prompt the probe never completed (**said as inconclusive, not counted as a refutation**).
❌ **The entry claimed `openForEdit` "reuses the element's own workspace".** It does not — it mints a
NEW id every time and cleans up the previous one. **A comment describing an OUTCOME, not a MECHANISM,
sent the investigation down the wrong path.** Worth remembering: this file's comments are excellent and
are still not the code.
⚠️ **Not ticked.** A cause I cannot reproduce is a cause I have not found. If his count grows again,
start at the + prompt and drive it to completion.

✅ **#639 IS CLOSED — the whole light look is done**, including the app icons he asked for as "the logo
for the app". **The queue-jump he authorised is finished, so the next tick returns to OLDEST-FIRST.**
⚠️ **Finishing the jumped item BEFORE going back was deliberate** — leaving clause 5 hanging is exactly
the quietly-dropped-clause failure REQUESTS.md exists to prevent.
📌 **STILL WAITING ON HIM:** #602 (which four options go) · #610 (A or B) · #624 (three readings) ·
#638 page 2 of the logo PDF (only matters if it carries clear-space / minimum-size rules).

✅ **#639 — THE LIGHT LOOK IS ON BY DEFAULT.** He explicitly told the loop to jump the queue for it and
in the same breath protected the rest: *"don't forget the other stuff and like still do the other stuff
just not right away."* **Nothing was dropped.** One switch (Settings → *New light look*) turns the whole
thing off: white home + light colourful top bar + his new intro + the mark-as-M wordmark.
⚠️ **STILL OPEN in #639: clause 5, the APP ICON / PWA icons.** Said plainly rather than quietly.
🚨 **TWO LESSONS FROM THIS ONE, both about things a screenshot cannot show:**
· **The wordmark is WHITE artwork.** On a light bar it is invisible while the `<img>` remains present,
  sized and "loaded". `filter: brightness(0)` is the only thing making it visible, and a test asserts it.
· **The splash reads its own copy of the light default**, because it runs before `settings.js` exists.
  The first version read a MISSING key as `false` and served the OLD intro on a fresh install while the
  rest of the app went light. **An absent key means "never chosen", not "chosen off".** A test fetches
  `index.html` and fails if the two defaults disagree.
📏 **And measuring the film changed its design:** portrait 9:16, 2.05s, starts #111, **ends PURE
WHITE** — so the splash box stopped being square, the ground became #111, and it animates to white.

✅ **#617 clause 3 DONE — element drafts take part in Select, and bulk delete really removes them.**
🚨 **A STALE COMMENT SENT THE FIRST DIAGNOSIS WRONG, AND TWO COMMENTS IN ONE FILE DISAGREED.**
`js/home.js:84` said Select was "projects tab only"; `render()` says "Select works on EVERY tab now
(v5.04)". The entry quoted the older one. **Real cause: draft cards never called `selectify`.** The
stale line is corrected in place — a comment contradicting another comment is how the same wrong turn
gets taken a third time.
⚠️ **AND THE SILENT HALF:** bulk delete uses `K.store.remove`, which on the Elements tab is
`FM.elements` — **a draft is a PROJECT wearing an Elements card**, so that call deletes nothing while
showing a tick, a count, a confirm and a toast. **When one grid mixes two stores, route by what the id
IS, not by which tab you are on.**

✅ **#617 clause 4 DONE — he can delete the draft he has open.** `discardDraftAnyway` switches away
first, then discards; the deliberate refusal in `discardDraft` is untouched and now asserted.
🚨 **#617 WAS PARKED AS "waiting on you" BY MY OWN CLASSIFIER, AND IT WAS A BUG HE WAS ACTIVELY
HITTING.** The trigger was a phrase in the entry — "that is his call to make" — about an OPTIONAL
follow-up. **`_classify.py` has a sanctioned token for this: the literal word `UNBLOCKED` in the body.**
Rewording round it did nothing; the token worked. ⚠️ **Never hand-edit a STATUS line — say `UNBLOCKED`.**
✍️ **POLISH-LOG CONVENTION, learned twice now:** `ship.sh` reads any `queue N` in the log line as a
CLAIM THAT N IS CLOSED and refuses if it is still open. Its only escape is `queue N (partial)`, which is
a lie when you are merely CITING an old entry. **Cite history as `#N`** — that form does not trip it.
(Second false positive of this shape; the first was a commit message mentioning `queue 249`.)
🐛 **AND A BUG THE DIFF COULD NOT SHOW:** the new method was written beside `commitDraft`, which is a
method of **`FM.elements`**, not `FM.projects` — so `this.list()`/`this.open()` addressed the wrong
object and the function did not exist where it was called. **Call the thing, do not read the diff.**

✅ **#616 DONE — the add row is quiet at rest, and a light runs up its frame on press.** Deliberately
NOT a conic comet: `hm-glint` orbits a CARD, and a conic gradient maps ANGLE not perimeter, so on a
746x40 row it would crawl up the sides and snap across the top. A rising band is what he described.
🚨 **RULE 11 EARNED ITS KEEP THIS TICK — READ THIS BEFORE MEASURING ANY ANIMATION.** The pulse first
measured as opacity flat at 0, `background-position` frozen, `animationend` never firing — **which
looks exactly like broken code.** A control counting `requestAnimationFrame` callbacks showed the pane
was **NOT FRONTED and firing ZERO frames**. Nothing had been measured. **`mcp__Claude_Browser__tabs_select`
fronts it; then it ran.** ⚠️ **Always run the rAF control before believing an animation is broken.**
🔒 **And that is why #616's test asserts WIRING, not motion** — the suite cannot guarantee a fronted tab,
so asserting travel would be flaky for a reason unrelated to the feature. The comment says so.

✅ **#613 DONE — his pick, option A.** The timeline + is a 26x18 mini CLIP instead of a bead, because a
circle was the only one on a screen of rounded rects. **The plus glyph is untouched — his explicit keep.**
⚠️ **THE PATTERN WORTH CARRYING: the big empty-state orb SHARES `.tl-addrow-plus`**, so changing the
base rule silently turned a design he likes into a rounded square. **It restores `border-radius: 50%`
explicitly and a test asserts it.** When a class is shared by two designs, changing one is two changes.
📌 **STILL WAITING ON HIM:** #602 (which four options go) · **#610 (A or B — his "Do A" was taken as
#613, and both offered an A)** · #624 (three readings) · **#638 the logo art** — the Claude Design link
**403s from here**, so he has to send a screenshot, an export, or the SVG.

✅ **#615 BUILT — the white home screen, OFF BY DEFAULT, switch in Settings.** All five clauses done.
The escape hatch he led with is a SETTING, not a code flag: he cannot edit code, so a switch only Claude
can reach is not a way back. Theme scoped to `html[data-home="light"]`, so `dark` is the app he had.
🐛 **A REAL BUG CAUGHT BY MEASURING, NOT LOOKING:** the selected-tab rule was `.hm-tab.on`; the class
is **`.active`**, so it matched nothing and the tab sat at **1.1:1** against its own pill. The
screenshot looked fine. **Read the computed value off the element — a plausible screenshot is not proof.**
➡️ **THIS UNBLOCKS #636 CLAUSE 3** (the new intro video "should work good with the new white background").
✅ **HE ANSWERED "Do A"** — logged against **#613** (the options he had just been sent). ⚠️ **#610 also
offered an "A" and both recommended A**, so #610 is asked again rather than assumed.
➡️ **NEXT TICK: build #613 A** — the mini clip on `.tl-addrow-plus`. **Keep the plus glyph; only the
round bead goes.**

🎨 **#613 — FOUR OPTIONS DRAWN AND SENT, NOT BUILT.** The timeline + is `.tl-addrow-plus`, **21x21
with a 15px glyph**, and it is the only CIRCLE in a timeline made of rounded rectangles — which is why
it reads as random. Options: **A mini clip (recommended)**, B insert caret, C stacked layers, D dashed
slot. All drawn to survive 21px, then checked blown up. **He picks a letter.**
⚠️ **Its flagged ambiguity was resolved by READING, not by asking a fourth question** — the arrows point
AT the + button, and "the little ball" names the circle. **He already has three open questions; adding a
fourth for something the screenshot answers is not neutral.**
📌 **FOUR THINGS NOW WAIT ON HIM:** #602 (which four options go) · #610 (A or B) · #613 (A/B/C/D) ·
#624 (three readings, two opposite).

🐛 **#611 WAS SHIPPED ONTO THE WRONG BUTTON AND NEARLY TICKED ON ITS OWN WRITE-UP. READ THIS ONE.**
v13.49 put his blue ring on `.fab-aura`, inside `#add-fab` — the EDITOR's FAB, `display: none` on the
home screen he photographed. The entry described the fix in convincing detail, `next.sh` flagged it as
"open but the body says it was fixed", and the obvious move was to tick it. **What caught it was opening
the screen he photographed and measuring the button he circled:** `#hm-new` had no `127,216,255`
anywhere, and `.fab-aura` measured **0x0, display:none**.
🔑 **So: a computed-style check is NOT proof. Assert the element is on screen too** — the new test does,
and that control is the half that matters.

🎨 **#610 — OPTIONS DRAWN AND SENT, NOT BUILT.** The panel really is five bare checkboxes; rendered
at 380px and looked at, he is right that it reads like a debug form. Two options went to him at ship
width: **A preview tiles (recommended)** — each tile renders what the thing does, which also answers
"what IS Trim path" — and **B switch rows + a live chip**. **He picks a letter; do not build first.**
🎨 **#637 — he answered the logo question: it is an abstract M, not an N.** That kills the only real
reservation (M is the right initial). **The bottom-right junction now matters MORE, not less** — it is
what makes the mark wobble between letters, and fixing that one join takes it from 7 to a solid 8.

✅ **#609 DONE — the Speed ruler was being drawn 139,999px wide**, past the browser's texture limit, so
its notches were downsampled into blurred smudges. It is now a 4000px window that re-anchors as you
scrub; range, `q`, `TICK` and the drag maths untouched, and a short ruler takes the OLD path byte for
byte. **The test's second half is the important one** — an ordinary row must stay un-windowed, because a
fix for one row that changed the other ~200 would be the worse bug.
📦 **`splash-v2.mp4` IS IN THE REPO, STAGED AND UNWIRED (#636).** He sent a new intro video made in
FreeMotion itself; it was copied in immediately because the upload folder is temporary. `splash.mp4` is
untouched beside it. ⚠️ **Clause 3 cannot be finished before #615 exists** — his video is black-edged,
like the current one, and on a white home screen that reads as a black rectangle.
🎨 **#637 — the logo was RATED (7/10) with it rendered at 16/24/32/48/64px, not judged big.** The
verdict and the numbers are in the entry. **One question is waiting on him: is the N deliberate, or
should the mark be an F or an M?**

✅ **#582 IS CLOSED — all three clauses.** Clause 2's answer was that the off-screen culling he asked for
was already there: **464 tile copies, ZERO outside the frame**, now asserted by a test. Two further
optimisations were tried and **rejected with numbers** (see the entry) so nobody spends a third tick.
⚠️ **THAT TEST WENT RED TWICE AND ITS OWN CONTROLS CAUGHT BOTH — read this before writing another.**
Both failures were the probe measuring nothing: a text layer whose font had not loaded, then a project
size set AFTER the layer was created. Each time Tiles got handed a full-frame placeholder and returned
early, and a bare count-the-draws assertion would have gone green on a render that never tiled.
🧩 **TWO PATTERNS IN HIS NEW REPORTS, and neither is visible one entry at a time:**
· **#626 + #627 + #631 are all "the end of the timeline is blank"** — sped-up clips, the jump-to-end
  button, and save-frame-as-PNG. A clip runs `[start, start+duration)`, so landing on exactly the end is
  the first instant nothing is there. **One boundary decision may fix all three. PROVE it first** —
  render at `end − 1/fps`, `end`, `end + 1/fps` and read the lit-pixel count.
· **#628 + #630 + #632 (+ the group in #627) are four GROUP reports in one sitting.** Anchor moves the
  children, zoom pivots at a corner, and the head column wastes width. #628 and #630 are very likely one
  bug — a group's anchor appears not to default to the centre (his screenshot: Anchor X 75%, Y 0%).

**Shipped this stretch:** timeline fling now scales with zoom so a swipe feels the same at any zoom
(614) · the effect plates are declared read-heavy and #582 clause 2's culling turned out to be already
done and already exact (582) · the text options sheet no longer sits on the picture you are editing
(602 clause 1) · a dead effect tile now says WHY in words a phone can read (603).
🚨 **HE HAS SENT TWENTY-THREE NEW REQUESTS (615–637) — all logged verbatim, only #609 started.**
White home screen (615) · the tacky blue add-row bars → a bottom-to-top pulse (616) · duplicate Element
drafts you cannot finish deleting (617) · elements show ◇ and still tell you to save by hand (618) ·
**templates just fork a project instead of offering the media swap — he pre-authorised the size of it:
"I know it's a big thing to do idc"** (619) · magnet off should stop canvas snapping (620) · rounded
corners change with size/rotation (621) · the speed jump buttons do not update the view rail (622) ·
copy/paste graphs (623) · hold-to-select and the edit menu (624, THREE readings, ask before building) ·
keyframes duplicating and refusing to delete (625) · a blank tail after speeding every clip up (626) ·
jump-to-end lands where the layer is invisible (627) · a group's anchor moves its children (628) · undo
that removes the selected layer should close everything (629) · zooming a group pivots at a corner (630)
· save-frame-as-PNG on the last frame is black (631) · wasted width in a group's head column (632).
🎯 **#609 IS DIAGNOSED AND READY TO BUILD — the measurement is done, the fix is named.** The Speed
ruler is drawn **139,999px wide** (`((100000−1)/5) × 7`), and with `will-change: transform` that blows
past the browser's max texture size, so the notches downsample into blurred smudges. **Do not change the
range, `q` or `TICK`** — `q` is forced to 5 on purpose (queue 455, "it goes up 10x at a time"). Draw only
the visible window and scroll the gradient with `background-position-x`. Check a NORMAL row too.
📌 **BLOCKED ON ONE WORD FROM HIM, both asked in the summary block:** #602 clause 2 (which of the
four circled options go) and #624 (three readings, two of them opposites).
🔑 **#129 is marked JUMPED** — nothing left to build, it waits on the next blank clip on his phone.
**Lift it the moment he reports one.**

🗒 *(previous handover, kept for its lessons)* **27 Aug, v13.48.**
**Shipped today for him:** tab row fills its bar and sticks (605) · benchmark lines no longer paint over
the left icon column (608) · playhead knob blue at rest, yellow on a benchmark (607) · add-layer grip
aligned to the layer handles (606.1) · blank clips report their real format instead of asserting H.265
(129) · seven warp effects faster, plus ~1.5x on every effect from PREVIEW_SS.
**Proven NOT broken, so nobody re-hunts them:** every Colouring effect · the B&W filters · their picker
tiles · the live effect preview · the exporter's audio track · the add-row overshoot geometry.
🎯 **NEXT, in order:** (1) **#604 — save the exported Blob, re-open it, re-scan for `mp4a`.** The file
HAS audio when it leaves the encoder, so the loss is in `deliver()` (exporter.js:66) or beyond. This is
the one blocking him from finishing a video. (2) **#602 clause 1** — panel covers the preview; find the
real open path first, `FM.textEdit.open` does not raise it. (3) **#606 clause 2** — the glyph is centred
in its button (offset 0,0) so measure what is PAINTED, not the rect. (4) #609 speed slider · #610
border/shadow design (#545 applies: draw options, show him).
⏱️ **AND KEEP BATCHING.** 99 commits in 20 hours, 51 docs-only, each running the suite — about half his
wall clock. `ship.sh` now refuses a docs-only ship within 12 minutes of the last commit; let notes ride
out with real changes.

🔑 **WHEN THREE REPORTS SHARE A SYMPTOM, THE BUG IS USUALLY THE SILENCE, NOT THE FEATURE (27 Aug).**
Queue 579 / 593 / 603 all say "the effects do nothing". Measured, in this order: the effects work, the
filters work, the picker tiles work, the live preview works AND is triggered on every tap. **Four
things proven fine, and each proof was a tick spent.** What is actually broken is that his stack
cancels itself — Sepia and Invert sit after Grayscale — and **nothing says so**. `FM.fxDeadOnLayer`
returns null for an effect that a later one completely overrides.
⚠️ **The lesson for the NEXT such report: before proving the feature works, ask what the app TELLS him
when it does not.** I checked the mechanism four times and the messaging zero times, and the messaging
was the fault every time.

⚠️ **CANVAS TIMING WITHOUT A READBACK MEASURES NOTHING — and it may undercut the v11.72-v12.30 numbers.**
Timing around `renderScene` with `performance.now()` reported **0.00 ms for EIGHT stacked blurs** on a
1080x1350 layer. Canvas work is QUEUED: `ctx.filter = 'blur(...)'` costs almost nothing on the CPU and
the real work lands on the GPU after the timer stops. Force a drain — `ctx.getImageData(0,0,1,1)` — or
the reading is of the queue, not the work.
❌ **AND THE CONCLUSION I DREW FROM THAT WAS WRONG — measured and withdrawn the same day.** I guessed the
split was CPU pixel-loops vs GPU filter-strings, and that v11.72-v12.30 had under-reported the GPU half.
**`--sweep` measured all 198 effects both ways and the GPU column is ~0 for every one of them** (only
`glow` shows any, 2.4 ms; several read slightly negative, i.e. noise). **The cost is CPU, essentially all
of it.** The flush still matters — without it blur reads 0.00 ms — but it did not uncover hidden work.
**The old per-effect numbers stand.** A plausible mechanism is not a measurement, and this one got as far
as a shipped commit before being checked.
📋 Scoping note for whoever picks this up: 198 effects x 10 renders at 1080x1350 with a flush **times
out a 30s browser call**. Sweep a subset, shrink the canvas, or drive it through `tools/_phoneprobe.py`
where there is a real timeout.

⚡ **v13.29: twirl 1.89x via the rotation identity — AND THE SAME CHANGE WAS REVERTED ON CURL. Read why.**
Twirl was the dearest warp (669 ms/frame). `a = atan2(dy,dx) + swirl` then rebuilding at radius r IS a
rotation of (dx,dy) by `swirl` — atan2 + cos + sin + two multiplies by r becomes cos + sin, and r
cancels. **17.8 -> 9.4 ms.** ❌ **On curl the identical change measured 1.11x** against a 3-4% noise
floor, so it was thrown away and curl keeps `atan2`. 🚨 **The rule that came out of it: this trick is
NOT free — the two routes differ by ~2e-13 px and `|0` truncation turns that into ~4% of samples
reading a NEIGHBOURING source pixel** (55/1365 on twirl, 42/1365 on curl). **Worth it at 1.89x on the
dearest effect; not worth it at 1.11x.** Weigh the pixel cost against the measured win EVERY time —
and the per-kernel `moveCap` in the test is where that judgement is recorded.
📋 **Still untouched and still dear** (half-res sweep): gridrepeat 38.4, kaleidoscope 35.8,
rasterextrude 35.3, radialrepeat 27.2, bend 26.2, innerpinch 23.3, ripple 21.1. ❌ **kaleidoscope and radialrepeat are NOT rotation-identity candidates — I wrote that here and it is
WRONG, checked by reading them.** The identity only collapses `atan2` when the angle is used for
nothing but *adding an offset and rebuilding*. Both of these **FOLD** the angle instead — `% slice`,
`Math.abs(a - slice/2)`, mirrored alternate wedges — and **you cannot fold an angle without knowing
it**, so atan2 is genuinely required. Same for polarcoords, which maps angle to an x coordinate.
✅ **What they CAN have is the plain `prep` hoist** (kaleidoscope resolves wCx/wCy + 2 evalProps per
pixel; radialrepeat 4). ⚠️ **Expect ~1.1x from that, not 1.9x** — curl's prep-only change measured
1.11x — so it is exact and free but small. **Do not promise a big win from it.**
📋 The honest shape of this work now: **fractalwarp won on DIVISIONS (11x), twirl on a removable atan2
(1.89x), and everything else so far is ~1.1x.** Before optimising the next kernel, look for those two
specific shapes rather than assuming the class is uniformly fixable. ⚠️ **rasterextrude
is NOT a WARP_FX kernel at all** — different signature, and it loops up to 100 `drawImage` calls, so it
needs its own approach rather than anything in this section.

⚡ **v13.28 TOOK THE FIRST ONE: fractalwarp 930.9 -> 83.2 ms (11x). AND IT CORRECTS THE PLAN BELOW.**
The `prep` hoist alone is NOT the win. Measured against two untouched controls (twirl, ripple, which
drift ~14% run to run): **curl and tunnel came in at ~1.2x, i.e. inside the noise — no claim made.**
fractalwarp won because it also did **a dozen DIVISIONS per pixel**, traded for multiplies by
precomputed reciprocals. 🚨 **So the remaining ten are dominated by TRIGONOMETRY, not by parameter
resolution, and need a different move: the ROTATION IDENTITY.** curl/twirl/kaleidoscope all compute
`a = atan2(dy,dx) + delta; return [cx + cos(a)*r, cy + sin(a)*r]` — which is just rotating (dx,dy) by
`delta`: `[cx + dx*cosD - dy*sinD, cy + dx*sinD + dy*cosD]`. **That deletes atan2 entirely** (the
dearest call in the loop) and `r` cancels out of the rotation. `delta` still varies per pixel, so one
sin/cos pair remains — but atan2 plus a cos plus a sin becomes a sin plus a cos.
⚠️ **It will NOT be bit-identical** — assert a tolerance and check truncation-to-integer, exactly as the
fractalwarp test does.
📋 Two method rules this earned, both the hard way:
· **Carry untouched effects as CONTROLS in any perf run.** They set the noise floor (14% here) and they
  are what stopped two ~1.2x readings being reported as wins.
· **Never compare rendered-picture hashes across page reloads** — the shape fixture is not
  deterministic, and the controls changed hash despite being untouched. Compare kernel to kernel.
🔒 **And a trap worth not repeating: a reference copy of a kernel must NOT live in `WARP_FX`.** Anything
in that table is treated as a shipping effect, so the "every effect does something at its defaults" test
found two that move 0.00 px. They live on `FM._warpRef` now, and the test refuses if one comes back.

🎯 **THE REAL ANSWER, AND IT IS ONE TECHNIQUE APPLIED ELEVEN TIMES. `--sweep`, 198 effects ranked.**
**37 of 198 cost over 8 ms at HALF resolution** (540x675), so roughly 4x that at his 1080x1350. And the
dear ones are not a scattering — **the top eleven are all GEOMETRIC WARPS**: gridrepeat 38.4, kaleidoscope
35.8, rasterextrude 35.3, curl 33.9, fractalwarp 28.3, radialrepeat 27.2, twirl 26.7, bend 26.2,
innerpinch 23.3, ripple 21.1, tunnel 21.0. Every one is per-pixel coordinate math over a SMOOTH field —
**exactly what turbulentdisplace was before v12.30 cut it 4.2x** with a coarse grid plus curved
interpolation. ✅ **So the fix is not eleven investigations, it is one proven technique ported eleven
times**, and v12.30 already paid for the hard part: it learned that straight-line interpolation between
grid points is out by ~10 px and a curve brings it to 0.07.
⚠️ **Stacking is NOT the problem — a 5-deep stack measured 0.93x the sum of its parts**, slightly better
than linear. There is no per-effect overhead to remove. Individual warps are simply expensive.

📍 **QUEUE STATE AFTER THE 27 AUG SWEEP — 42 open numbered items, TWO nominally actionable.**
· **#47** — labelled BIG, but its remaining half (export off the main thread) was long ago established
  as HIS decision: days of work on the 11k-line compositor for something he has never asked for.
· **#578** — clause 1 and the clause-2 defect both shipped (v12.94, v13.40). **The one real thread left
  is WHY ECHO ONLY BUILT ITS TRAIL UNDER THE PROBE I NOW BELIEVE IS WRONG** — 110→263 synced, flat
  unsynced, while the code says playback renders once per advancing frame. ⚠️ **Explaining that IS the
  work; do not edit the Echo branch first** — three claims on that entry already died from doing so.
· **#592 — MEASURED AND CLOSED-PENDING-HIS-WORD (27 Aug): zero overshoot at zooms 0.5/1/2/4 and with a
  short clip.** The entry's named suspect (`PAD`) is DISPROVEN — clips are themselves offset by PAD, so
  removing it would have CREATED the bug. ✅ **The entry's own "MEASURE IT before removing it" is what
  saved that**, which is the best argument yet for writing the doubt down beside the guess.
  📋 Staging gotcha worth keeping: **the add row is not drawn while a layer is SELECTED on a phone**
  (solo view skips it) — deselect, or you measure an empty DOM and conclude nothing.
🔑 **AND THE LESSON THAT FINALLY STUCK: phrase "waiting on him" in `_classify.py`'s OWN vocabulary**
("your call", "waiting on you") — #592's STATUS generated correctly as NEEDS YOU on the first ship,
where two hand-edits on #582 had been silently reverted.

📍 **(earlier) QUEUE WALK, 27 Aug — five items read in order, and FOUR are blocked on him.**
| item | state |
|---|---|
| *editing lags* (1st unnumbered) | measurable half DONE, summary in entry → **his verdict** |
| *effects-plan* (2nd unnumbered) | 3 features need a name from him; Gaussian Blur scoped & buildable |
| *visual identity* (3rd unnumbered) | BEFORE-PUBLISHING — deliberately not started |
| **#47** | crash-resume DONE v7.53-55; half (b) off-main-thread = **his decision**, days of work |
| **#95** | audio half fixed v7.33; timeline stand-in run at 6x today → **needs HIS device** |
| **#96** | three causes fixed (latest v12.36 matches his symptom exactly) → **needs his file** |
❌ **CORRECTION — I wrote "next unblocked work: #98, then #125, #129, #148, #202" and that was WRONG.
I had not read them. Read now, by hand, one at a time:**
· **#98** — (d) shipped v8.53, (c) settled by measurement, **(a)+(b) need ONE PHOTO from him** (an extra
  ✓ row flush on the keyboard is iOS Safari's own accessory bar, which no browser here can render).
· **#125** 🟠 needs him · **#148** 🟠 needs him · **#202** 📌 nothing to build · **#206** ⏸️ he asked me
  to leave it.
➡️ **SO THE ENTIRE PRE-#296 QUEUE IS AWAITING HIM.** This was CHECKED by reading each entry, not
concluded from the classifier — which is the distinction rule 8b insists on.
🔒 **NEVER HAND-EDIT A `**STATUS:` LINE IN REQUESTS.md — `ship.sh` REGENERATES THEM ALL, BY DESIGN.**
Line 203 of ship.sh runs `tools/status.sh`, which rewrites the STATUS on every open entry from
`_classify.py`, precisely so a hand-typed label cannot rot. **I edited 582's by hand twice, reported it
as fixed twice, and both times the next ship silently reverted it** — and the second time I told him I
could not account for it. This is the account: it was working exactly as intended.
➡️ **So a wrong STATUS is a CLASSIFIER bug and must be fixed in `_classify.py` (with a self-test —
it has 20 already), never in the prose.** Open case: **582 is labelled `🟢 READY` when its only
remaining clause is a pick for HIM**, so it should read `🟠 NEEDS YOU`. The classifier does not see
"answered, awaiting his decision" inside a clause list. ⚠️ **The `next.sh` guard added the same day
(honour NEEDS YOU / HELD) is still correct and stays** — it just cannot help until the classifier emits
the right verdict in the first place.

🧩 **#582 CLAUSE 2 IS ANSWERED AND IS NOW A DECISION FOR HIM, NOT A BUG (v13.41).** Tiles "Extend"
repeats the layer's alpha bbox outward; a one-line text box is ~50 px tall, so it repeats **18 times**
down a 900 px frame and reads as noise. Shake first enlarges the box to 146 px → **6 readable rows**.
**Same effect, same params — the box was correct both times** (`464x50` vs `547x146`, confirmed with the
new `FM._tilesLastBB` hook).
⚠️ **THREE THEORIES DIED HERE, ALL DEDUCED FROM THE PICTURE: padded plate → wrong default mode →
transposed bbox.** Each collapsed the moment the code was read or the value instrumented. 🔒 **RULE:
when a picture looks wrong, INSTRUMENT THE INPUT before theorising about the code** — a debug hook took
two minutes and settled what three rounds of reasoning got wrong.
📌 **Options put to him (a) cap repeats ~6 [recommended] (b) minimum tile size (c) leave it.**
**DO NOT pick one unilaterally — any of them changes every Tiles instance he has already placed.**

🚨 **UNRESOLVED INSTRUMENT CONFLICT ON MOTIONFLOW — DO NOT MAKE ANY FURTHER CLAIM ABOUT SMEAR UNTIL THIS
IS SETTLED. Two probes, opposite answers, same code.**
| regime | Smear @ default | Echo |
|---|---|---|
| pre-fix code, clock UNSYNCED | 111 / core 43 | 111 |
| pre-fix code, clock **SYNCED** | **110 / 42** (= no effect) | — |
| post-fix code, clock UNSYNCED | **117 / 26** (works) | 111 |
| post-fix code, clock **SYNCED** | **111 / 42** (no change) | **122** |
✅ **WHAT IS SOLID.** (1) **Echo was never broken** — with `FM.setTime(t)` synced to each step its trail
climbs **110 → 123 → 135 → 148 → 160 → 174 → 186 → 199 → 212 → 224 → 237 → 250 → 263** across 14
frames, which is unambiguous. My earlier "Echo is a no-op" was my probe resetting the frame cache.
(2) **Smear's original defect was REAL, not an artefact** — pre-fix code under the CORRECT synced probe
reads 110/42, identical to the effect being off. So v13.40 fixed something that genuinely needed it.
❓ **WHAT IS NOT SETTLED: whether v13.40's fix actually helps in the app.** It measures 117/26 unsynced
and 111/42 synced. Syncing makes the app repaint the layer at the same `t`, which sends the kernel down
the `repaint` path (`ref = rec.prev`) instead of `advance` (`ref = rec.cv`) — so the two regimes are
exercising DIFFERENT code paths, and neither is obviously "the real one".
✅ **SETTLED BY READING THE CODE (not by another measurement): playback takes the ADVANCE path.**
`tick()` (js/app.js:~1728) reads the clock into `FM.time` and calls `render()` **once per rAF frame**,
and `render()` (js/app.js:92) calls `renderScene(ctx, scene, FM.time)` exactly once. **One render per
frame, t advancing** — that is `advance`, `ref = rec.cv`.
❌ **AND THAT INVERSION WAS ITSELF WRONG — the mechanism is now fully explained (27 Aug). The SYNCED
probe is the correct one.** I reasoned that "unsynced = one render per advancing t = playback". It is
not: unsynced means **MY render plus the APP's render at a DIFFERENT time**, which playback never does.
**Measured: `FM.time` was 0 while my walk ran 0.40 → 0.83.** So the app's rAF render kept resetting
`rec.t` to 0, and every one of my renders was **more than the 0.35 s jump guard away from it** —
`advance` false EVERY frame, cache reset every frame. That is exactly the flat 110-110-110 Echo trace,
and syncing fixes it because `FM.time` then tracks the walk.
🚨 **IT ALSO EXPLAINS WHY THE READINGS KEPT CONTRADICTING EACH OTHER: the corruption depends on where
`FM.time` HAPPENS to be sitting**, which differed between runs. Not noise — a hidden variable.
🚨 **AND THE UNCOMFORTABLE CONSEQUENCE, which must not be buried: under the SYNCED regime the v13.40
Smear fix measures 111/42 pre-fix and 111/42 post-fix — NO IMPROVEMENT.** The 110 → 117 win was
measured unsynced, i.e. in the corrupted regime. **So v13.40 is NOT validated after all**; my "the clean
A/B was already in the table" conclusion is withdrawn too, because both of those rows were unsynced.
➡️ **NEXT: re-run the pre-fix / post-fix A/B with `FM.setTime(t)` on every step** (swap the old
compositor in via `git show <v13.40 commit>~1:js/compositor.js`, as before). ⚠️ **If it shows no gain,
say so to him and consider reverting v13.40** — it is a visual change that would then be buying nothing.
✅ **AND THE CLEAN A/B WAS ALREADY IN THE TABLE ABOVE — no re-run needed.** Rows 1 and 3 are BOTH
unsynced, i.e. both taken in the regime that matches playback:
**pre-fix 111 px / core 43  →  post-fix 117 px / core 26.** So v13.40 is validated on a like-for-like
comparison in the representative path, and the "110 → 117" figure quoted to him stands (110 is the
effect-OFF baseline, 111 the pre-fix effect-ON reading — within a pixel of each other, which was the
whole point).
⚠️ The 110/42 pre-fix reading was taken SYNCED and should not be quoted; it measures the repaint path.
⚠️ **STILL NOT UNDERSTOOD: Echo only built its trail under the SYNCED probe** (110→263) and stayed flat
unsynced. That is backwards from the above and is the one loose thread left. **Do not touch the Echo
branch until it is explained** — on this entry alone, three claims have already been withdrawn for
blaming code that turned out to be fine.
⚠️ **The fix is SHIPPED and is not harmful** — no holes, static frames untouched, suite green. But **the
"110 → 117" improvement I told him about is currently supported by only one of two regimes.**

↩️ **v13.40 IS REVERTED (v13.42). IT BOUGHT ONE PIXEL.** A/B with `FM.setTime(t)` on every step:
pre-fix none 110 / Smear 111 / Echo 135; post-fix none 108 / Smear 110 / Echo 135. **The 110 → 117 was
the corrupted probe.** Reverted surgically — the v13.41 `_tilesLastBB` hook is untouched.
✅ **SETTLED BY DIRECT COMPARISON (v13.43 hook `FM._mfRefVsA`): the UNSYNCED probe is CORRECT and the
SYNCED one is BROKEN.** Dumping the two frames the kernel actually compares, downsampled to 40px:
| probe | differing px | max delta | verdict |
|---|---|---|---|
| **synced** | **0 / 2000** | **0** | **IDENTICAL — it compares a frame with ITSELF** |
| unsynced | 10 / 2000 | 239 | genuinely different frames |
**Why:** `FM.setTime(t)` makes the app rAF-render the layer at that same `t`, which ROTATES the cache —
so my render then finds `rec.cv` holding the very frame it is about to draw. A field over two identical
frames reports zero motion, Smear bails at `wsum < 0.5`, and the Amount slider does nothing. **All of
that was the instrument.**
❌ **AND THAT CONSEQUENCE WAS WRONG TOO — MEASURED, and it finally resolves the whole mess. THE v13.42
REVERT WAS CORRECT. Do not re-apply v13.40.**
Re-measured the CURRENT (reverted = original) code with the validated probe, `refDiffers = 10` asserted:
**none 110 · Smear 117 · Echo 122.** **The ORIGINAL code already produces 117.**
🔑 **So v13.40's "110 → 117" was never before-vs-after. It was EFFECT-OFF vs EFFECT-ON.** I compared a
no-effect frame against a Smear frame and read it as a fix working. **The punch-out changed nothing,
the revert cost nothing, and the app is now in the right state.**
🔑 **AND THE TECHNIQUE THAT FINALLY WORKS: park `FM.time` INSIDE the walk range once, then walk without
re-syncing.** Not per-step syncing (that rotates the cache and hands the kernel identical frames), and
not leaving `FM.time` stale far away (that trips the 0.35 s guard every step). The earlier 111 readings
for Smear were the guard biting; 117 is the true value.
✅ **WHICH MEANS SMEAR IS NOT BROKEN — it gives +7 px on a 12.7 px/frame subject, and Echo +12.**
His *"kinda buns"* is then a JUDGEMENT about how subtle it is, not a defect — **and that is a
recommendation to put to him, not a bug to fix.**
🔒 **RULE EARNED THE HARD WAY: before trusting ANY temporal-effect measurement, assert that `ref` and the
current frame actually DIFFER.** The hook is permanent. Every one of the five wrong calls on this entry
would have been caught by that one assertion.

🗒️ **(superseded) STOP MAKING CLAIMS ABOUT SMEAR. BOTH PROBES ARE NOW DISQUALIFIED.**
Under the SYNCED probe the motion FIELD reports **zero motion** — 0 moving cells, max vector 0.00,
`wsum` 0 — so Smear bails at `wsum < 0.5`, draws the sharp frame and returns. **That is why the Amount
slider does nothing: 111 px at amount 1, 1.5, 2, 3 AND 4.** ⚠️ **But the clip demonstrably HAS motion**
(a disc crossing at 12.7 px/frame, and the unsynced probe measured its vector as [12, 0]). **A field that
sees no motion in obviously moving footage is a broken instrument, not a finding.**
🚨 **So: unsynced corrupts the frame CACHE (0.35 s jump guard), and synced apparently leaves `ref`
identical to the current frame — most likely because `FM.setTime(t)` makes the app rAF-render the layer
at the same `t`, rotating the cache so my render then compares a frame against ITSELF.**
➡️ **NEXT: verify that directly before any fix** — dump `ref` and `A` to two canvases and diff them.
**If they are identical, the probe is confirmed broken and needs a third design** (most likely: drive
rendering ONLY through the app's own play loop and sample the preview canvas, rather than calling
`renderScene` by hand at all). ⚠️ **Do NOT touch the smear branch until a probe exists that detects the
motion a human can see in the clip.** Four wrong claims and one shipped-then-reverted change came from
skipping exactly this step.

🔑 **THE ONE INSTRUMENT FLAW BEHIND EVERY WRONG MOTIONFLOW CLAIM TODAY, and there were four:** an
offscreen walk while the app's rAF render paints the SAME layer at a stale `FM.time` more than 0.35 s
away, resetting the kernel cache each step. **ALWAYS `FM.setTime(t)` BEFORE `renderScene(ctx, scene, t)`
when measuring ANY temporal effect** (motionflow, framestutter, temporaldenoise, timewarp).
✅ **What survives, measured honestly:** Smear does ~nothing at its default (+1 px on a 12.7 px/frame
subject) — **his "kinda buns" is REAL and 578 clause 2 is still open** — while **Echo works well**
(135 vs 110), which is the exact opposite of what I reported earlier today.

🗒️ **(reverted) v13.40 — Smear now REPLACES the moving object instead of veiling it.**
It drew the sharp frame at full opacity then laid ghosts at `min(0.5, 1.6/samples)` = 0.16 over the top,
so at the default nothing read: **111 px wide vs 110 with the effect OFF.** The base is now erased in
proportion to the smear's own mask (capped 0.9, so never a hole) and the ghost alpha is solved from the
coverage wanted. **Default now: 110 → 117 px, hard core 42 → 26, soft band 7 → 59.**
⚠️ **MY ACCEPTANCE TEST WAS >118 px AND THIS IS 117 — a genuine miss, recorded rather than re-scored.**
There is more available. **Next on this: Pixel (style 0) has NOT been re-measured since the fix** — it
has its own compositing path (the per-pixel branch below the smear one) and was equally invisible at
default, so it likely needs the same treatment.
📋 **Two corrections this entry cost, both mine, both the same root:** "no style smears at all" and
"Pixel shrinks the object 40%" were BOTH artefacts of a single over-strict brightness predicate.
🔒 **RULE: measure a visual change as a PROFILE ACROSS BANDS (strong / mid / faint), never one
threshold.** A faint result and no result look identical under one cut-off — and the wrong one of those
sends you rewriting working code.

🗒️ **(done, kept for the method) #578 CLAUSE 2 — MOTION BLUR (FOOTAGE) DOES NOT ACTUALLY SMEAR.** Measured 27 Aug, spec
and acceptance test both ready, so this is a build not an investigation.**
On real footage moving **12.7 px/frame**, the moving disc's width: none 108 px, **Pixel 65 (0.60x —
it ERODES the object)**, **Smear 106 (0.98x)**, Echo 108 (**1.00x, a literal no-op**), Blend 105.
**Nothing smears along the motion vector.** ⚠️ **And it means v12.94's default change hid the problem** —
it swapped a style that damages the picture for one within 2% of doing nothing.
📍 **Where:** `motionflow` at **js/compositor.js:8501**. The two-slot frame cache and its `advance`
guard (line ~8518) are FINE — a forward step of 1/30 s satisfies them, so the styles do receive a valid
previous frame and still produce no streak. **The fault is in what the style branches do with it**, below
that point. Read those before touching anything.
✅ **ACCEPTANCE TEST IS A NUMBER, not a look:** the disc must render **wider than 108 px**, and the probe
must carry the disc's x position as a control (**43 = frozen frame, 306 = real**).
⚠️ **`FM.seekVideosToTime` DOES NOT MOVE THE ELEMENT** — it cost two runs that reported "no effect" for
every style, which looks exactly like a finding. Drive `el.currentTime` and await `seeked`, and step
CONSECUTIVELY (a temporal effect measured on a frozen frame always reports nothing).

🎯 **AFTER THAT: GAUSSIAN BLUR'S MIX CONTROL** (scoped in the effects-plan entry, one
focused tick). After that the effects-plan entry names the route itself: **the BUG-HUNT backlog, then
his own list from #296 onward.**
⚠️ **Do NOT read "all blocked" as "nothing to do" — there is a scoped build waiting and a whole backlog
behind it.** And do not manufacture kernel micro-optimisations to look busy; that was already the
temptation once today.
⚠️ **The pattern is worth naming: his oldest reports are nearly all one answer away.** That is not a
reason to invent work — it is a reason to keep the questions short and in front of him. Four are live:
Corner Pin/LUT/Curves-or-none, .mov-or-.mp4 (#129), heavy-vs-light project (editing lags), B&W tiles
on reopen (#593).

🔵 **EFFECTS-PLAN (2nd unnumbered) IS ALSO BLOCKED ON HIM — checked 27 Aug, not assumed.** Its three
remaining features (**Corner Pin**, **LUT import**, **Curves**) each need a NEW KIND of control — canvas
drag handles, a file picker, a curve editor — and a day-plus each, so guessing wrong is expensive.
**A name, or "none", unblocks it.** ⚠️ Its one workable half is **Gaussian Blur**, now fully scoped in
the entry (add a `mix` param; when mix < 1 stop using the filter-string path and draw the plate twice —
sharp, then blurred at `globalAlpha = mix`). **Left unstarted on purpose: it changes DISPATCH for a very
widely used effect and deserves a whole tick, not the tail of one.** That is the next build if he does
not pick a feature.
📋 So the queue below both of these is **#47 (export must survive a crash, get off the main thread)**.

🔵 **"EDITING LAGS" IS NOW BLOCKED ON HIM, NOT ON WORK — its measurable half is finished (summary written
into the entry 27 Aug).** Editing proven fine at 6x throttle; seven effects optimised plus ~1.49x across
all 198 from PREVIEW_SS; the remaining cost is structural (a per-pixel JS loop at 1080x1350 needs ~50x,
the best single win was 11x) and the reduced raster + adaptive ladder are what carry it.
⚠️ **Per rule 4, blocked is not done — so the next tick moves DOWN the queue** to the next unnumbered
item (EFFECTS-PLAN build rounds), then #47. **Do not keep grinding kernels here for 1.1x while his
older untouched reports wait.**

✅ **DONE v13.39 — `PREVIEW_SS` IS NOW 1.25 AND EVERY EFFECT IS ~1.49x FASTER IN THE PREVIEW.**
Canvas 745x931 -> 626x783 (raster 0.69 -> 0.58), kaleidoscope 57.6 -> 38.6 ms through the REAL render
path, tracking the 1.42 pixel ratio. ⚠️ **The 1.76x quoted below is KERNEL-ONLY and overstates it —
1.49x is the honest figure and he has been told.** 1.0 was built, viewed at 2x on fine text and rejected
(rough strokes, colour fringing). Revert is one line, documented at the constant.

⚠️ **NEVER FLUSH WITH `getImageData` ON THE ON-SCREEN PREVIEW CANVAS — it costs ~7x and measures YOUR
PROBE, not the app.** Same effect, same size: 272.7 ms flushed on `#preview` vs **38.6 ms** on an
offscreen canvas. A readback on a canvas the compositor is also displaying forces a GPU->CPU sync that
the app never pays — **`getImageData` appears nowhere in app.js's render path** (checked). Always time
against an offscreen canvas of the same size.

🗒️ **(done, kept for the numbers) THE BIGGEST LEVER IN THE APP IS ONE CONSTANT: `PREVIEW_SS` (js/app.js:450).**
When the preview is downscaled (always, on a phone) the canvas is rendered **1.5x larger than the screen
can show** and the browser downsamples it — deliberate, to keep edges clean (`s * PREVIEW_SS`, line 462).
⚠️ **It is NOT a bug. I nearly reported it as one.** But it costs 2.23x the pixels of EVERY effect.
Measured on his phone-width layout (wrap 249 CSS px, dpr 2, 1080x1350), one kaleidoscope pass:
| PREVIEW_SS | canvas | kernel |
|---|---|---|
| 1.5 (today) | 747x934 | 29.0 ms |
| **1.25** | 598x747 | **16.5 ms (1.76x)** |
| 1.0 | 498x623 | 11.7 ms (2.48x) |
✅ **1.76x across ALL 198 EFFECTS from one number — larger than every kernel win today except
fractalwarp, and it is one line.** Export is untouched (full res), so the risk is preview softness only
and it reverts in one word.
🔴 **DO NOT SHIP IT BLIND — this is a VISUAL trade and #545 says he sees a picture first.** Next tick:
render the same frame at 1.5 / 1.25 / 1.0 at 380px, send him the three, recommend **1.25**. If he is
asleep, rule 16 applies: ship 1.25 AND send the picture with the alternatives named.

🚨🚨 **THE SCALE IS THE STORY, AND KERNEL OPTIMISATION CANNOT REACH IT. Measured 27 Aug at his REAL
1080x1350, interleaved, quality certified 1 -> 1, bare scene 1.6 ms:**
| effect | cost per frame |
|---|---|
| kaleidoscope | **762 ms** |
| glass | **481 ms** (range 474.8-502.9) |
| rasterextrude | 21 ms |
**The sweep called these 31.2 and 42.4** — it runs at a fraction of the plate, so its numbers are ~20x
too small in absolute terms. The RANKING it gives is still useful; the SCALE is not.
🚨 **So a single warp effect is 0.5-0.8 SECONDS a frame at his project size — and the best kernel win all
day was 2.73x.** Seven optimisations shaved a real but small slice off a number that needs ~50x. **The
per-pixel JS loop cannot get there**, and no amount of hoisting will change that.
✅ **WHICH MEANS THE THING THAT ACTUALLY SAVES HIM ALREADY EXISTS: the reduced raster.** `plateScale` /
`rasterFor` render the warp plate smaller and scale up, and the adaptive ladder drops to factor 0.62
under load — that is why the app stays usable at all. **The highest-value work is no longer optimising
kernels: it is checking that the reduced-raster path engages when it should, and how it looks when it
does.** ⚠️ Note the tension with LOOP rule 14: a reduced raster makes its own boundary differences, so
quality-vs-speed there is a real trade to measure, not a free win.
📋 Kernel work is still worth finishing where it is cheap and exact, but **stop treating it as the fix**.

✅ **SWEEP RE-RUN AFTER THE BATCH (certified factor 1 -> 1). IT CONFIRMS THE WINS — AND EXPOSES THE
SWEEP'S OWN PRECISION LIMIT. Read both halves.**
**Confirmed:** gridrepeat (was #1 at 36.5), ripple (21.1) and innerpinch (25.4) have all **fallen OUT of
the top 15**; twirl is 15.6 (was 26.7) and fractalwarp 19.4 (was 28.3).
⚠️ **BUT two readings do not square, so do NOT quote per-effect numbers from a sweep:**
· **radialrepeat reads 40.6 ms, HIGHER than its 27.7 before**, despite a rigorously measured 1.82x at
  kernel level (interleaved, warmed, control 1.058). It also reports CPU 19.1 / "GPU" 21.5 — and that
  CPU figure is exactly the improvement expected, so the extra 21.5 is a bad sample, not GPU work.
· **`glass` appears at #1 with 42.4 ms having been nowhere in the previous top 15.**
🔒 **THE RULE: the sweep is a COARSE RANKING — good for "which effects are dear", useless for "how much
did this change help".** It takes one median-of-7 per effect with no interleaving, no warmup and no
control. **For any before/after claim use the kernel-level method** (interleave, warm both, control
kernel near 1.000, compare against a `FM._warpRef` body).
📋 **`glass` (liquidglass) is the new #1 candidate at ~42 ms** — it stacks four operations (frost blur,
sharp bleed-through, specular sheen, two-sided bevel) and is NOT a WARP_FX kernel, so none of the three
shapes apply directly. Measure it properly before assuming anything.

⚡ **THE FOUR DEAREST EFFECTS ARE ALL CUT (v13.28-v13.34). THREE SHAPES ARE NOW NAMED — CHECK FOR THEM
BEFORE STARTING ANY KERNEL.**
| effect | was | now | how | exact? |
|---|---|---|---|---|
| fractalwarp | 930.9 ms | 83.2 ms (11x) | hoist + reciprocals | ~1e-13, 0 px moved |
| gridrepeat | 15.3 | 5.6 (2.73x) | hoist ONLY | **exact** |
| radialrepeat | 28.1 | 15.4 (1.82x) | hoist | **exact** |
| twirl | 17.8 | 9.4 (1.89x) | rotation identity | ~4% px moved (capped) |
| kaleidoscope | 29.9 | 19.6 (1.53x) | hoist | **exact** |
**① HOIST the evalProps** — every kernel resolves its params 1.46M times a frame. Always EXACT, and
1.5-2.7x on the kernels it suits. ⚠️ **BUT IT IS NOT ALWAYS A WIN, and this line used to claim it was.**
BULGE measured **0.74x — SLOWER** — prepped, byte-identical, control at 1.008, repeatable. Its
`r >= 1` early-out retires most pixels before any real work, so the loop is dominated by cheap
iterations where an extra object plus property loads cost more than the evalProps removed.
🔒 **So: MEASURE EVERY KERNEL, and be suspicious of any with a cheap early-out.** Reverted on bulge.
**② RECIPROCALS** for per-pixel divisions — paid 11x on fractalwarp. ⚠️ **Never on a kernel whose output
lands on integers** (gridrepeat: 17.7% of pixels moved, and it was SLOWER than the plain hoist).
**③ ROTATION IDENTITY** when the angle is only offset-and-rebuilt — 1.89x on twirl. ⚠️ **Not when the
angle is FOLDED** (kaleidoscope, radialrepeat, polarcoords) — you cannot fold what you have not measured.
📋 **NEXT: bend 26.1, innerpinch 25.4, ripple 21.1, bulge 18.7, lensblur 19.8, zoomstreaks 20.3,
spinstreaks 17.4, stretchseg 17.3** — all still resolve params per pixel, so shape ① applies to every
one. **Batch 3-5 of them per ship (rule 15).** Then RE-RUN `--sweep` to confirm the ranking moved.
⚠️ **Method that works and should not be re-derived:** interleave the two arms, warm both first, carry
an untouched kernel as a control and require its ratio near 1.000, and compare kernel-to-kernel against
a `FM._warpRef` legacy body — never rendered-picture hashes, never across page reloads.

✅ **THE FIRST TRUSTWORTHY RANKING — re-run 27 Aug with the quality gate reporting `factor 1 -> 1,
degraded: false`. USE THIS LIST, not v13.27's.** 38 of 198 over 8 ms. Dearest first:
gridrepeat 36.5, kaleidoscope 36.0, rasterextrude 34.2, radialrepeat 27.7, bend 26.1, innerpinch 25.4,
ripple 21.1, curl 20.3, zoomstreaks 20.3, fractalwarp 20.2, lensblur 19.8, bulge 18.7,
turbulentdisplace 18.3, spinstreaks 17.4, stretchseg 17.3.
✅ **It independently confirms both wins**: **twirl has fallen OUT of the top 15** (26.7 in the first
sweep) and fractalwarp is 20.2 (28.3 before). Neither was measured through the corrupted path.
✅ **Stacking re-confirmed as a non-issue**: 5-deep stack = 0.84x the sum of its parts.
🎯 **GRIDREPEAT IS READ AND IT HAS BOTH PAYING SHAPES — this is a straight implementation, do it first.**
Per pixel it resolves **4 evalProps** (count, rows, mirror, stagger) and performs **up to 5 DIVISIONS by
frame constants**: `y/grCellH` (twice — once in the stagger branch, once for grIy), `grX/grCellW`, and
both `(grX-grIx*grCellW)/grCellW` / `(y-grIy*grCellH)/grCellH`. That is the fractalwarp shape, which paid
11x. **Plan:** a `prep` returning `{mir, stag, cellW, cellH, icellW:1/cellW, icellH:1/cellH,
stagCell:stag*cellW}`, then replace every `/cell` with `*icell`.
⚠️ **The one hazard to check, and it is the twirl hazard again:** `Math.floor(y*icellH)` can disagree with
`Math.floor(y/cellH)` at an exact tile boundary, which flips a whole TILE index rather than nudging one
pixel — so a disagreement here is far more visible than twirl's 4%. **Keep a `_gridrepeatLegacy` on
`FM._warpRef` and require movedPixels === 0**; if it is not zero, keep the divisions for the two
`Math.floor` calls and use reciprocals only for the two fraction terms, which cannot flip an index.

📋 **Then kaleidoscope / radialrepeat / bend / innerpinch.** ⚠️ Remember the
two shapes that actually pay (v13.28-29): a removable `atan2`, or per-pixel DIVISIONS. gridrepeat and
radialrepeat do integer tiling and folding — look for divisions by frame constants there, not for an
atan2 to delete, and expect ~1.1x unless one of those two shapes is present.

🚨🚨 **THE APP'S ADAPTIVE QUALITY SILENTLY RESCALES MID-BENCHMARK — ANY renderScene TIMING TAKEN OVER A
LONG SESSION IS SUSPECT, INCLUDING SEVERAL OF MINE.** Measured 27 Aug: **ripple came in at 565 ms and
649 ms on fresh page loads and 75.5 ms later in the same session** — same code, same 1080x1350, no edit
between. The cause is the ladder in `playbackQualityInfo`: under sustained load it drops itself to tier 2
/ factor 0.62, which **shrinks the warp plate**, so later frames are measured at a smaller size and look
dramatically faster. **It degrades in ONE direction, so a benchmark run after heavy work always flatters
the change you just made.**
✅ **What is safe:** KERNEL-LEVEL microbenchmarks that call the map function directly in a loop and never
touch renderScene. twirl's 1.89x and the hypot-vs-sqrt reading were measured that way.
⚠️ **What is suspect:** anything timed through `renderScene` across a session — the raw effect numbers in
the v13.27 sweep, and fractalwarp's 930.9 -> 83.2 (the 11x is far too large to be quality drift alone,
and the kernel test confirms the algebra, but the exact figure should be re-taken).
🔒 **THE RULE: reload the page before each timing sample, or read `FM.playbackQualityInfo().factor` and
REJECT the sample unless it is 1.** Prefer kernel-level timing whenever the question is about a kernel.

🚨 **THE v13.27 EFFECT RANKING IS ABOUT THE FIXTURE, NOT THE APP — RE-RUN `--sweep` BEFORE USING IT.**
That sweep measured with `scene.project` left at whatever was last open (a **480x480** element), because
the plate is sized from `scene.project` and setting `scene.w/h` alone does nothing. At his real
1080x1350 the order is not the same order: **rasterextrude 35.3 ms ("3rd dearest") is 16.2 ms, while
ripple is 565 ms and bulge 514 ms.** ✅ **The reason is structural and worth keeping:** pixel kernels are
CPU loops that grow with AREA, rasterextrude is a fixed count of GPU blits that barely grows. So the
bigger the project, the more completely the CPU kernels dominate — and he edits at 1080x1350.
The probe now sets `scene.project` itself so this cannot recur.
❌ **And rasterextrude needs NO work: 16.2 ms at his size.** I guarded its per-frame canvas realloc
(`_reC.width = W` reallocates 5.8 MB every frame) expecting a win and measured **16.2 -> 18.8 ms against
a 6% noise floor — no improvement, possibly worse. Reverted.** Do not retry it.

🎯 **NEXT TICK: prep-hoist kaleidoscope + radialrepeat (exact, expect ~1.1x each). The genuinely dear
effects at his real size are the CPU pixel kernels — ripple ~565 ms, bulge ~514 ms — so re-rank with the
fixed sweep FIRST and work from that list, not the v13.27 one.**

🗒️ **(superseded) NEXT TICK: prep-hoist kaleidoscope + radialrepeat, then RASTEREXTRUDE —
the only top-5 effect still not understood.** It is not a WARP_FX kernel at all: different signature,
and it loops up to **100 `drawImage` calls** (one per unit of Depth). Nobody has measured where its
35 ms goes, and a loop bounded by a user-facing slider is a different kind of problem from a pixel
kernel — likely the biggest remaining win, and the least explored.

🎯 **SUPERSEDED — NEXT TICK: STACKED-EFFECT COMPOSITOR COST, MEASURED WITH `tools/_phoneprobe.py` AT 4-6x.**
This is not invented work — it is where his own steer (*"working on the lag being fixed for mobile would
also be good"*, below) and his OLDEST item now meet, with a number attached. v13.25 measured the app at
phone speed for the first time: the editing path is fine at 6x (tap 22 ms, scrub 3.8 ms, timeline 5.3 ms,
nothing scaling worse than linear) but **five effects on six SHAPES gives 45 fps on this Mac and 17 fps
at 6x**. The per-effect work of v11.72-v12.30 was measured one effect at a time and does not describe a
stack. ⚠️ **Measure the STACK, not the effect** — and re-run the probe after each change rather than
trusting a desktop reading, because 1x hides it almost entirely.
📋 Also open from the same run: the app's adaptive quality drops to tier 2 / factor 0.62 on its own at
4x. That is working as designed, but it means **a desktop measurement is taken at full quality and a
phone one is not** — compare like with like before claiming a win.

🔴 **SELF-CREATED WORK DOES NOT JUMP HIS QUEUE — he caught this on 26 Aug and was right.** #599 was
MY OWN item and took four ticks while #581, #583 and #585 — his requests, all older — waited. *"Blocked
on his answer"* is not an excuse when the item has a workable half: **#581 had a build available using
the default I had already recommended to him.** ⚠️ **An item I invented should wait LONGER than his, not
shorter.** When his queue looks blocked, re-read it for a workable half before inventing work.


### 📍 CURRENT STATE — keep this short; the history lives in [LOOP-HISTORY.md](LOOP-HISTORY.md)
**v13.21, 989 tests green, tree clean, `HEAD == ssh/main`.**

✅ **#599 IS CLOSED — all eight suspects accounted for, and the honest tally is worth keeping:**
**2 real gaps fixed** (#597 Focus on a flat scene, #598 both motion blurs on a still layer) · **5
effects given a "Needs a setting" marker they lacked**, by a rule DERIVED from the registry rather than
a hand list (it caught 3 nobody had measured) · **4 were my probe, not the app** · **~25 false
accusations caught before any reached him**, across three discarded methods.
✅ **AND THE LAST LEAD CLOSED CLEAN:** squish's `walls` is a segment (All / Floor / Sides / Floor+
ceiling), and "Floor" at the DEFAULT amount changes 0 px — but 330 at amount 2 and 2,220 with inset.
**Too subtle at defaults, not inert.** No claim made; the entry says so.

🚨 **A TEMPORAL EFFECT CANNOT BE MEASURED BY SAMPLING SCATTERED TIMES INTO FRESH CANVASES.** They
keep a previous-frame cache and js/compositor.js states plainly that *"a backwards seek or a >0.35s jump
just shows the frame unblurred"*. Sampling 0.5s apart made `temporaldenoise` and `framestutter` read
**0** and look broken; rendered at consecutive 1/30s frames onto ONE canvas they measure **39,916** and
**30,605**. **Render consecutively or do not measure them at all.**

🔓 **A REAL VIDEO LAYER CAN BE MADE IN A TEST — v13.17, and this unblocks more than #599.**
`canvas.captureStream()` → `MediaRecorder` → Blob → `File` → `FM.loadVideoFile()` → `FM.addMediaLayer()`
yields a genuine `type: 'video'` layer (measured: 159KB webm/vp9, 480×480, 1.78s, moving detailed
content). **"Cannot test that without footage" is no longer a valid reason to stop** — several entries
have used it.
⚠️ **AND THE FIRST RESULT SPLIT 3/3:** on a real clip with the control passing, all six #599 candidates
read 0 — but `lumamatte`/`compoundblur`/`lightwrap` need a SECOND layer (matte source, blur map,
background) and the scene had one, so those prove nothing. `temporaldenoise`/`framestutter`/`squish`
should act on a single moving clip and did not. **Only those three are candidates, and still not a bug
list.**

🔒 **A FAILED EDIT MUST NOT BE ABLE TO SHIP — `tools/apply.py`, and ship.sh refuses on `.edit-failed`.**
A release is several edits then ship.sh, chained on one line. **Chained with `;`, a failed edit is
INVISIBLE**: the traceback scrolls past, later steps run, the suite is green because the code was never
the problem, and the commit describes a change that is not in the tree. That happened at v13.25 — a
measurement table announced in the summary, in the commit and to his face, never reached the entry,
because one anchor had a line break in a different place. **Use `python3 tools/apply.py FILE <<'JSON'`
for multi-edit releases**: every anchor must match exactly once, nothing is written unless all do, and
a failure writes `.edit-failed` which **ship.sh trips over**. Being careful with `&&` is remembering.
✅ **"I CAN ONLY MEASURE THIS ON A DESKTOP" IS USUALLY FALSE — THROTTLE THE CPU. `tools/_phoneprobe.py`.**
Several entries park on "whether it feels right on your phone is the half I cannot take from you". The
FEEL is his; **the SPEED is measurable** — `Emulation.setCPUThrottlingRate` at 4-6x is roughly a phone
against this Mac. First use found the editing path fine at 6x but the COMPOSITOR at 17 fps with five
effects. **Prove the throttle applies with a control** (a path that should scale linearly — tap→inspector
went 3.5→22.1 at 6x) before believing anything else in the table.

⚠️ **A PROBE THAT REPORTS ZERO IS A BROKEN PROBE, NOT A FAST APP.** The same run first reported
`renderScene` at **0.00 ms at every throttle**. It was building effects as `{id, params}` when a real
instance is `{type, enabled, params}` — **silently ignored, timing an empty scene**, and the conclusion
would have been the exact opposite of the truth. **Build fixtures with the app's own constructor**
(`FM.fxRegistry.makeInstance`) and **make the probe THROW when it builds nothing**, rather than trusting
a hand-written literal to match a shape you did not check.

⚠️ **AN ENTRY'S CONFIDENT DIAGNOSIS CAN SIT UNVERIFIED FOR MONTHS — #129, checked 27 Aug.** It reasons
that a browser parses H.265 then refuses to decode. **Asked directly, this browser reports H.265 as
"probably" playable and MSE-supported, while refusing `video/quicktime` (.mov) outright** — and an iOS
screen recording IS a .mov. ⚠️ **Neither result transfers to his phone** (Safari decodes HEVC and .mov;
Chrome is the reverse), **which is the point: the diagnosis had never been verified anywhere.**
✅ **It sharpened the question from "do you see a toast" to "is the file .mov or .mp4", which his camera
roll answers.** **Probe `canPlayType` before theorising about codecs — it costs one call.**

🚨 **"BLOCKED ON EZRA" IS HIDING HIS OLDEST BUG REPORTS — audited 26 Aug and this is the real find.**
I had audited the 3 ACTIONABLE twice and never opened the **32 blocked**. They are not all questions:
· **#129** — *"a 2-second screen recording adds a clip with NO VIDEO"*
· **#202** — *"one simple video layer lags badly, and the video does not load properly"*
· **#96** — *"adding a SONG is really buggy and sometimes will not play at all"*
· **#95 / #125** — phone timeline lag, *"barely any layers"*
**These are BUGS, not decisions**, and several sat "blocked" because nobody could stage the media.
🔓 **THAT EXCUSE DIED at v13.17: a real video layer can be MADE** (canvas → MediaRecorder → File →
`FM.loadVideoFile` → `FM.addMediaLayer`). **#129 and #202 are directly about video and are now
testable.** ⚠️ **Work these before inventing anything** — they are the oldest things in the list and
they are HIS.
⚠️ **AND THE CLASSIFIER LESSON:** "blocked on Ezra" means *a session decided it was blocked*, not that
he was asked. **Re-open that pile whenever a capability changes** — a new way to test can unblock years
of it at once.

🛑 **THE QUEUE IS OUT OF WORK I CAN DO ALONE — audited BY HAND on 26 Aug, not taken from the
classifier (rule 8b).** It reports 4 actionable; opening each one shows all four are parked:
· **#578** clause 2 (*"needs a lot of work"*) and **#582** clause 2 (*"looked really bad"*) are LOOK
  judgements. I can change how they look and have no way to know whether it improved — that is the
  guessing this file forbids. **His eye or a picture is the only unblock.**
· **#592** does not reproduce: the decoration's right edge measures exactly on the clip's, twice.
· **#599** is mine, and six of its eight candidates cannot be judged without a real VIDEO layer, which
  this environment cannot stage. **The control refused to let me guess — three times now.**
⚠️ **So "0 actionable" here is a HAND-CHECKED result, not the classifier's opinion.** Rule 8b is
satisfied by that audit; **the cron keeps firing and nothing gets switched off.**
💡 **THE HIGHEST-VALUE THING IS A MESSAGE, NOT A COMMIT:** one screenshot with the timeline zoomed
out would likely close **#587 AND #592** together, and one word on #593 (do the tiles come good on
reopening?) would close the last real bug outstanding.

⚡ **THIS STRETCH — v13.05 → v13.16, closing #581, #582 (1+3), #584, #585, #586, #589, #590, #594, #595,
#596, #597, #598, #600, #601.** Two of those (#597, #598) were FOUND by sweeping rather than reported.

⚠️ **A WARNING THAT IS ALWAYS ON IS FURNITURE — assert that it DISAPPEARS.** #595's camera note must
vanish the moment a layer has depth, or it lies at precisely the moment he gets it right. The test
checks both directions.
⚠️ **NAME THE CONTROL, NOT JUST THE PROBLEM.** "Nothing has depth" is a diagnosis; "set Z beside X and Y
in Move & Transform" is an instruction. **The gap between those two is what made #595 a bug report.**
💡 **FOUR ITEMS THIS SESSION WERE ONE HABIT** — #572, #578, #595, #596: a control that works with
nothing to act on, or a feature never explained. **Amber `.fx-dead-tag` colour is now the shared
vocabulary for "this cannot do anything here" in three places.** Worth a deliberate sweep rather than
case-by-case.

✅ **THE CONTROL EARNED ITSELF ON ITS FIRST RUN (#599, v13.08).** Nine of ten known-good effects came
back alive on a gradient subject — including the very ones the earlier flat-square sweeps libelled
(brightness 218,700, vignette 155,147, posterize 201,882). **`pixelate` came back 0, so the sweep was
declared invalid and never ran.** Averaging a smooth ramp over a block returns the block's centre value,
so pixelation is near-identity on a gradient: **a gradient tests TONAL effects well and STRUCTURAL ones
badly.** The subject still needs high-frequency DETAIL — which is what `fx-thumbs`' photographs have and
what two hand-built subjects failed to imitate. **Keep `pixelate` in the control: it is the cheapest
detector of a subject with no fine structure.**

🚨 **A SWEEP THAT CAN ACCUSE WORKING CODE MUST CARRY A CONTROL — two attempts, two wrong lists.**
#599's second try returned 32 "dead" including `brightness`, `saturate`, `grayscale`, `sepia`. Flaws:
the effect landed on the wrong layer (**`layers.filter(...)[0]` is the NEWEST layer — new ones arrive at
index 0**), and a `> 6` diff threshold hid a real ~5-level change on a near-black subject.
**Build in a set of effects KNOWN to work and assert they come back alive. If the control fails, the
sweep is wrong.** Neither attempt had one, and both produced confident nonsense.

🚨 **THE "SILENTLY DEAD EFFECT" SWEEP NEEDS A PHOTOGRAPH, NOT A FLAT SHAPE — and I nearly reported
20 false positives.** Swept all 198 effects on a plain `#c05030` square and 20 changed **0 pixels at
every sampled time** with the browser silent. **They are almost all my SUBJECT, not the app:**
· **Posterize** quantises one colour to one colour — 0 is CORRECT on a flat fill.
· **Mirror** on a symmetric, centred rect changes nothing.
· **Vignette** darkens the CORNERS, which are empty when the shape sits in the middle.
· **Soft Glow / Light Glow** have brightness thresholds (35, 60) a mid-tone fill never crosses.
Their defaults are not zero — vignette 0.6, posterize 5 levels — so "ships switched off" is also wrong.
✅ **TO DO IT PROPERLY: use `fx-thumbs`' sample PHOTOGRAPHS** (tonal range, off-centre detail, real
highlights) and sample several times. **`FM.fxThumbs` already owns exactly that subject set.**
✅ **AND THE TIME CHECK EARNED ITSELF:** `blink`, `pulseopacity`, `glowscan`, `swing` and `pulse` looked
dead at t=2.0 and are simply time-varying — caught by re-testing at 0.35 / 1.1 / 3.7 (LOOP rule 10).

🔴 **#595 — I GAVE HIM A WRONG DIAGNOSIS AND HE DECIDED ON IT. Corrected at v13.03.** I said no layer
could have depth and a Z control needed building. **Both false:** `MT_PROPS.move = ['x','y','z']`, the
Move panel renders `400.0X 540.0Y 0.0Z`, and with a layer at z=900 an FOV change moves **77,759 px**.
**HOW: I read a fresh transform's keys, saw no `z`, grepped TWO files for `transform.z =`, found none,
and concluded the feature was absent.** `z` is absent until set, and the setter is a scrubber no `.z =`
grep can match. ⚠️ **ABSENCE OF A GREP HIT IS NOT ABSENCE OF A FEATURE — drive the UI before concluding
something does not exist.** One probe settled it.

🔴 **#595 SOLVED AND PARKED ON HIS CHOICE — the camera is fine, the SCENE has no depth.** FOV 5→159
and Distance −2000→4000 change 0 pixels (control: moving a layer changes 70,687). `FM.cameraLens`
computes F correctly and the projection reads `tr.z`… **but a transform has no `z` key and nothing sets
one**, so every layer is at z=0 and no lens can change a flat scene. **The panel's help text promises
parallax the app cannot perform.** Options in the entry: SAY so (cheap, #572's shape) or add a real Z
control (the renderer is already written for it — UI + data field, not a rewrite).
⚠️ **WHEN A CONTROL "DOES NOTHING", CHECK WHAT IT ACTS ON BEFORE CHECKING THE CONTROL.** Three items now
(#572, #578, #595) were correct controls with nothing to act on.

⚠️ **WHEN HE REORDERS SOMETHING, TEST THAT NOTHING WAS LOST — not just the new order.** Reordering a
literal array is exactly the edit that duplicates or drops an entry, and nothing announces it: six
sections instead of seven looks as plausible as seven. #594 asserts count, uniqueness and non-emptiness
alongside the position.
⚠️ **A PLACEMENT I REASONED MYSELF IS NOT A DECISION HE MADE.** Tuff was last because queue 349 argued it
was "newest and most specific". **Keep such notes when he overrules them** — the note still explained
what the thing IS; only its conclusion died.

🔴 **THREE OF HIS REPORTS IN A ROW DO NOT REPRODUCE IN THE PREVIEW — #587, #592, #593.** Each was
measured carefully and each came back clean. **That pattern is now more informative than any one of
them:** his phone differs systematically — most likely TIMELINE ZOOM (both #587 and #592 are about where
things land horizontally) or losing timing races the preview never loses (#593's provisional tile).
**Stop generating a fourth theory per item and ask him for the zoom / one zoomed-out screenshot.**
⚠️ **DERIVED NUMBERS LIE WHEN YOU ARE TIRED — PREFER DIRECT EDGE COMPARISONS.** On #592 I derived
px/sec from a clip width, got a figure inconsistent with that clip's own edges, and produced a fake
"124px overshoot". The two direct comparisons (decoration right vs clip right) were unambiguous: 0.

🔴 **`elementFromPoint` CANNOT SEE A PSEUDO-ELEMENT — never use it to ask "is this visible".**
#587's line is a `::after`, which receives no pointer events, so hit-testing reported the head on top at
every sample and proved nothing either way. **Screenshot for visibility; hit-test only for reachability.**
⚠️ **#587 NOW HAS TWO NEGATIVE REPRODUCTIONS** — default AND scrolled (marker staged at x41 inside the
head's 0–66, photographed, clean). **Parked on one question to him: was the timeline zoomed out?** Three
theories eliminated; a fourth would be invention.
⚠️ **#587 DID NOT REPRODUCE and the next step is written into the entry** — a marker at t=0.2 sits at
x198 while `.track-head` is 0–66 at z-index 8 with an opaque background over the marker's z-index 3, so
the head DOES cover it. His shot must be SCROLLED, and the element to check is the RULER's head cell,
not `.track-head`.
⚠️ **VERIFY THE REPLACEMENT ROUTE BEFORE DELETING THE ONLY OTHER ONE.** #590 removed "Remove marker"
from a menu; the head-tap route was measured removing a marker (1 → 0) first. **And a comment I wrote
claiming the head tap also unpins a thumbnail marker was WRONG** — `toggleMarkerAtPlayhead` finds with
`!m.thumb`, so it can never touch one. Corrected before shipping. **Check the claim you are about to
write into a comment, not just the code you are about to change.**

⚠️ **RULE 17 CAUGHT ME FOR REAL ON #584 — a test I wrote opened the effects browser and leaked twice.**
It reported six effects as indistinguishable from their subject (the thumbnail queue) AND made the
queue-477 dead-effect check fail on Channel Remap (a stale `FM._fxPreview`). **If a test must open a
browser: stub `fxThumbs.mountFilter`/`mount`, call `stopAll()`, and null `FM._fxPreview` in the finally.**
Better still, assert through a seam — #585 did, and stayed clean.
⚠️ **A TEST CAN ENCODE AN INSTRUCTION HE LATER REPLACES.** #481's test asserted the phone KEEPS its own
tab row, from his "on pc"; #584 asked for the opposite. **Invert such a test rather than deleting it**,
so the underlying thing (the toggle must exist somewhere) is still guarded.

⚠️ **BEFORE BUILDING A LAYOUT HE ASKS FOR, GREP FOR IT — IT MAY ALREADY EXIST BEHIND A GATE.** #584 was
already built for PC under #481 (the same request in his words) and gated on `fxb-in-inspector` because
he had said "on pc". **That gate was an inference from his phrasing, not an instruction**, and it cost a
second request. **When scoping a request to one surface because of how he worded it, say in the comment
that it is an inference** — so the next session knows it is removable rather than load-bearing.
⚠️ **WHEN CONTROLS SHARE A ROW, ASSERT OVERLAP, NOT POSITION.** Three tabs between two fixed buttons
collide silently at a narrow width — the tabs simply sit under the ✕ with nothing to say so.

⚠️ **A RENAME IS A LAYOUT CHANGE — measure the row, not just the words.** #583's label sits beside two
siblings at 380px; nothing in the code would have said if it pushed one off the edge. The test asserts
both.
⚠️ **"MAKE THESE TWO AGREE" DOES NOT ALWAYS MEAN "MAKE THEM IDENTICAL".** #583's button saves the whole
STACK and the ⋯ entry saves ONE effect. They now share the word "preset" and keep the words that
separate their scope — collapsing them would have put two different actions under one name in one panel.

🔴 **#582 IS REPRODUCED AND IT IS NOT A CRASH — nothing throws.** His three effects cost **78.7ms**
against **16.6ms** for the same three added up. **Motion Blur (Object) re-renders everything beneath it
once per sample** (2→16 samples takes it 40.6→169.4ms). The line is the slice count in js/compositor.js:
the normal path caps N by actual travel, **the mover path takes the full sample dial with no bound**,
and on that path each slice renders the COMPLETE stack. The uncapped branch is deliberate — travelPx
cannot see a mover — **but nothing replaced the cap.** Motion Blur (FOOTAGE) + the same two is 11.2ms,
so only the OBJECT one multiplies. **The fix is a quality tradeoff and is parked on his choice, in the
entry, with a recommendation.**
⚠️ **"IT BROKE THE APP" DID NOT MEAN AN EXCEPTION.** Console clean, nothing thrown, no corruption —
just a frame time his phone cannot survive. **Time the render before hunting for a throw.**

⚠️ **`FM.isFxContainer(inst)` IS THE WRONG GUARD WHEN BUILDING an instance.** It asks whether an
instance HAS an effects array, and a FRESH registry instance has no `effects` key — so the guard is
false for every container and children are silently dropped. Measured on #581: captured 4, restored 0.
**Let the sanitiser decide what a type may hold.**
⚠️ **"IT ACCEPTS X WITHOUT COMPLAINING" IS NOT "IT HANDLES X".** `capture()` took a filter container,
returned a valid-looking preset and threw nothing — while dropping everything inside it. **Check what
comes OUT, not whether the call succeeded.**

⚠️ **#593: TWO LEADS DISPROVEN BY MEASUREMENT — the tiles render CORRECTLY greyscale here** (noir
spread 0.06, platinum 0.05). It is NOT the `effects[0].type` keying and NOT `remountLive` losing the
meta; both were checked and both are sound. **The fault is device or timing, not branch logic** — most
likely the `provisional` frame `pump()` paints while a photograph is still decoding, which only shows on
a device slow enough to lose that race. **Ask him whether reopening the filter menu fixes them:** if yes
it is the decode race and nothing else.
⚠️ **`FM.fxThumbs.mountFilter(cv, id)` TAKES A CANVAS, NOT A CONTAINER.** Passing a div paints nothing
and reports nothing — it cost two probes.

🔴 **NEXT UP AND IT IS THE IMPORTANT ONE — #593.** He says *"Not a single black and white filter
actually make anything black and white"* and his screenshot proves it: the BLACK/WHITE tiles show full
colour photos. **I measured the RENDER in #579, said they were fine, and was measuring the wrong
surface — he judges by the TILES.** Same lesson as #572. The entry carries a strong lead: every mono
filter starts with `grayscale`, Blackout (which looks right) does not, and `generateFilter` keys its
scene on `box.effects[0].type`. **Not confirmed — the tile pixels have not been measured.** Do that
first.
🔎 **#581 IS SCOPED NOW — one missing piece, not a build from nothing.** `FM.effectPresets` already
does durable storage (`capture/save/custom/makeInstance`), and `capture()` accepts a filter container
without complaining — **but it DROPS the children** (`hasEffects: false`), storing a single effect's
params. **A custom filter saved through it today would be an empty shell, silently.** Make `capture`
preserve a container's `effects`, then a fave can point at a preset id and the existing row does the
rest. **Test that a saved custom filter still RENDERS** — an empty shell saves, loads and faves
perfectly, and only the picture is missing.
⚠️ **#581 was previously called "a real build"** — custom filters have no library id, so
favouriting one needs durable storage. Read #444 first; favourites are a second PLACE, not a move.

⚠️ **"MAKE IT THE SIZE OF X" ALMOST ALWAYS MEANS THE SHAPE OF X.** #580: a 1080x1920 project and a
1920x1080 clip share no dimension, so copying width and height literally is meaningless. The largest
rect with the target's ASPECT, centred, is what the request means.
⚠️ **FOR A CROP, ASSERT "ONE DIMENSION IS TAKEN WHOLE" AND "NEVER EXCEEDS THE SOURCE."** Neither is
obvious and both fail SILENTLY — the picture just looks subtly wrong, so the eye will not catch it.
⚠️ **Write the SAME representation the existing tool writes.** Reusing `layer.crop` meant Reset, the
scrubbers and the overlay all kept working for free; a parallel field would have needed each of them
taught about it.

⚠️ **A PAST TICK'S MEASUREMENT CAN BE WRONG TOO — RE-READ THE DEFINITION, NOT THE NAME.** #579 carried
"Blackout is a broken black-and-white filter, spread 25.5" from an earlier tick. **It is in the `tuff`
section on `saturate: 0.7`** — partial desaturation by design. The measurement was real; the CATEGORY
was assumed from the word "Black". **Open the definition before calling something broken.**
⚠️ **WHEN THE OBVIOUS METRIC IS CONSTANT ACROSS A FAMILY, FIND THE ONE THAT VARIES.** Every mono filter
measures zero colour spread, so "does it do something" cannot tell six of them apart — the queue-563
Bell/Ding trap with its usual check removed. TONE separates them, and that check caught Platinum and Fog
landing 4 levels apart on the first authoring: two identical light looks under two names.

⚠️ **CHANGING A DEFAULT SILENTLY REWRITES EXISTING WORK UNLESS `legacy` IS SET.** #578: `def` applies to
NEW instances; `legacy` is what an ABSENT key reads as. Every effect he had already placed was saved
without that key, so `def: 0 → 1` alone would have re-rendered all of them on next open. **Any "change
the default" request needs the legacy pin and a test for it** — the failure is invisible until he opens
an old project.
⚠️ **AN UNSCOPED CLAUSE IS NOT A LICENCE TO GUESS.** #578 clause 2 is *"needs a lot of work"*. Changing
sliders by feel is unmeasurable and un-reviewable — nobody could say whether it improved. **Ship the
specified half, leave the other open with the one question that would unblock it**, and say so plainly.

⚠️ **BEFORE DEFENDING A GUARD'S SIZE, FIND OUT WHAT ACTUALLY DOES THE GUARDING.** #577's 550ms hold
looked like the thing stopping a scroll from trimming. It was not — **an 8px move calls `disarm()`**, so
the timer's length was never the protection. Shortening it to 300ms cost nothing. **A number that feels
load-bearing often is not; check what else is holding the door.**
⚠️ **EXPOSE THE CONSTANT AND HAVE THE TEST READ IT** (`FM._trimArmMs`). A copied literal keeps passing
after the real value changes — that silent-pass is a failure shape this repo already knows.
⚠️ **CONSISTENCY LOSES TO A COMPLAINT.** 550 matched the Add menu and Presets hold, which was the right
call while nobody minded. He minded. Those two are untouched and the entry says so, rather than quietly
changing three gestures because one was mentioned.

⚠️ **"BLOCKED BY" USUALLY MEANS Z-INDEX, AND THE TEST MUST ASSERT CLICKABILITY, NOT POSITION.** #576's
options panel was placed correctly and still unusable: dock z80 over panel z79, so `elementFromPoint`
inside the overlap returned the dock's TEXTAREA. **A geometry-only assertion passes for exactly this
bug.** Use `elementFromPoint` and `contains()` whenever he says something is covered.
⚠️ **AND THE OBVIOUS FIX WAS THE WRONG ONE.** Raising the panel above the dock hides the words he is
typing behind the options — the same complaint with the halves swapped. **When two things fight for one
strip, moving one out beats restacking them.**
⚠️ Measure a neighbour's edge live rather than hard-coding it: `.te-dock` GROWS with the typed text.

🚨 **SOMETHING ABOVE THE INSPECTOR/CAPTIONS PANEL SWALLOWS `pointerdown` IN THE CAPTURE PHASE.**
Measured on #575: a drag dispatched at a control inside it fired `pointermove` and `pointerup` and
**never fired `pointerdown` at all**. **Any drag control added anywhere in that panel is dead on
arrival** — and it fails looking exactly like the bug it was meant to fix, which cost most of that tick.
**Bind the down on `document` in the CAPTURE phase** and filter by `closest()`; nothing can intercept
that. Also `touch-action: none` on the handle, or the browser claims the horizontal drag for scrolling.
⚠️ **"I CAN'T DO X" OFTEN MEANS THERE IS NO AFFORDANCE, NOT THAT X IS BLOCKED.** #575 read as a clamp;
the data model accepted every extension asked of it. There was simply no handle to drag. **Check whether
the operation is refused before hunting for what refuses it.**
⚠️ **A FIX CAN UNLOCK THE NEXT ITEM.** #574 made overlapping cues render; that is the only reason #575's
drag is allowed to cross a neighbour. Read consecutive entries together — they were sent together.

⚠️ **WHEN THE UI OFFERS SOMETHING THE RENDERER REFUSES, LOOK FOR A SILENT DISCARD — not a draw bug.**
#574 read like a rendering problem; it was `FM.activeCaption` keeping one cue and dropping the others
before the renderer was ever involved. **The data was thrown away upstream of the thing being blamed.**
⚠️ **ANY "pick the matching one" LOOP IS A CANDIDATE FOR THE SAME BUG.** `(!hit || c.start > hit.start)`
looks like a tiebreak and is actually a filter.
⚠️ **PROBE EVALUATION ORDER — my fourth instrument error today.** I built the result object AFTER
reassigning the fixture, so it reported the control's captions as the overlap result and I nearly
"fixed" a working change. Read fixtures into locals BEFORE mutating them.

⚠️ **"ADD MORE X" — MEASURE EACH NEW ONE AGAINST ITS NEAREST EXISTING NEIGHBOUR, not against nothing.**
#573 again, after #563's Bell that was the Ding. Asserting the new thing "does something" passes for a
rename. The five text presets that existed were all ONE idea (an entrance from alpha/shift/scale), so
the six added differ in KIND — and two of them never settle, which no previous preset did.
⚠️ **NEVER `Math.random()` IN A RENDER PATH.** It re-rolls per frame, so a shake boils, and the EXPORT
stops matching the preview he approved. Hash the (unit, time-step) instead and assert the same frame
twice is pixel-identical.
⚠️ **INSTRUMENT WRONG THREE TIMES IN ONE TICK** — `renderScene(ctx, scene, t)`, not `(ctx, t, size)`.
Read the signature before writing the probe; it is faster than three failed calls.

⚠️ **RULE 11 FIRED FOR REAL ON #571 CLAUSE 3, AND THE CONTROL IS THE ONLY REASON IT WAS CAUGHT.** The
burst's animations reported `running` and never advanced. A throwaway control animation sat at
currentTime 0 and rAF fired **0 frames in 450ms** with `document.hidden: true` — the PANE, not the code.
**Motion was therefore not tested and the entry says so.** The look was checked by freezing five bursts
at 70/180/300/430/550ms and photographing that, which works regardless of throttling and is worth
reusing.
⚠️ **AND THE THROTTLING PROVED A DESIGN CHOICE:** the `setTimeout` teardown fired where the frames did
not. `animationend` would have leaked nodes for as long as the app stayed open.
⚠️ **LOOK AT IT BEFORE CALLING IT DONE.** The first burst was structurally perfect and visually wrong —
half the screen wide when he had asked for a "nice little" reaction. Every probe passed. Only the
picture showed it.

⚠️ **WHEN HE REPORTS THE SAME THING A FOURTH TIME, THE ANSWER IS NOT THE FEATURE — IT IS THE SILENCE.**
#572 had been "answered" three times with "they work, your subject cannot show them". True, and useless:
the app already KNEW, and only said so after he had spent the pick. The fix moved the existing proof
earlier. **Ask where the app tells him, not just whether it is right.**
⚠️ **MY INSTRUMENT WAS WRONG AGAIN — fifth time.** The control first reported every effect dead on a
coloured shape. `FM.addShapeLayer` inserts at index 0, so `layers[length-1]` was the TEXT layer and the
fill went on the wrong object. **When a control fails, suspect the probe before the code.**

🛑 **HE HAS ASKED THE LOOP TO STOP LEADING WITH QUESTIONS (#591, 26 Aug):** *"I'm not in a rush to
answer every question coz you still have hours of work in the things that you can do."* Ask ONCE, in the
entry, and get on with it. Never park an item that has any workable part. Stop re-offering the
28-blocked-item bundle — offered twice, stays available, not raised again unless he asks.

⚠️ **WHEN AN INSTRUCTION IS OBEYED BY A PROPERTY AND THE PROPERTY LATER MOVES, THE INSTRUCTION IS
LOST.** #571 clause 1 is the clean case: queue 356 removed the empty state's outline by zeroing the ROW's
`border-color`; queue 550/551 then moved the outline onto `::before` and nobody carried 356 across, so a
stray 124px dashed bar came back months later. **When you relocate a painted thing, grep for every rule
that was suppressing it.**

⚠️ **"STILL DOESN'T WORK" CAN MEAN "WORKS, BUT NOT THE WAY IT FEELS LIKE IT SHOULD" — measure before
building.** #570 read as a dead feature. Sampled at 14 points through a 200px drag, the colour was
perfect and the position was neither late nor wrong — it just **moved once in the whole gesture**,
sitting still for the first 100px. **And the add row it reports on never moved at all**, which
contradicts the comment in js/timeline.js that justifies the mechanism on the row "visibly sliding".
There was nothing continuous to track, so the control could only ever step. That turns a bug ticket
into a taste call, which is HIS, so it was asked with a recommendation rather than guessed.
⚠️ **A SYNTHETIC DRAG CANNOT CLEAR A GESTURE BUG.** Dispatched PointerEvents on `.row-drag` do not rule
out what a real finger does. Say that in the entry rather than writing "not reproduced" and moving on.

**⚡ THIS STRETCH — v12.80 → v12.84, closing #526 (re-opened), #567, #566, #568, #588 and #569.**
**Logged and NOT started: #570–#587, #589, #590.** #582 ("I completely broke the app" — Motion Blur +
Shake + Tiles) is the highest-severity open item and is untouched; its entry says to reproduce it with
the console open before tuning anything.

❓ **ONE QUESTION IS BLOCKING #590 and it is one word:** does "get rid of the pop up menu when holding on
a benchmark to rename or delete" mean the POPUP or the FEATURE? Asked in the summary block. **#586, #587
and #590 are all the same object — do them in one pass**, not three.

🔴 **HE CAUGHT THE LOOP JUMPING THE QUEUE ON 26 AUG, and he was right.** *"Make sure you're logging all
my requests and doing stuff in order from oldest, you just started doing new stuff with way older things
un finished."* #588 (the newest item) was half-built while #568 onwards sat untouched. **`ship.sh`'s own
order gate then refused the commit for the same reason** — the gate worked, the obeying did not, which is
exactly what CLAUDE.md predicts. The entry carries `JUMPED:` with his quote.
**The audit he asked for, run with the tool rather than memory:** everything he has said IS logged,
INBOX empty — but **60 open, only 22 actionable, and 28 blocked waiting on HIM.** That backlog, not the
ordering, is what holds this list up. Worth raising with him whenever he is around.

⚠️ **"IT DOESN'T ALWAYS WORK" CAN MEAN DATA LOSS — check what the feature DESTROYS, not just what it
fails to do.** #569 read like a polish item. Measured, the Paste look dialog offered **Effects enabled
and pre-ticked with zero effects on the clipboard**, and pasting ran `target.effects = []` and **deleted
the target's effects** under a toast saying "Pasted style". The tell was that only `textOnly` was ever
checked — **one guard for one of eight cases** is a shape worth distrusting on sight.
⚠️ **`'x' in layer` IS ALMOST NEVER THE QUESTION.** The Volume tile was always on because every layer
carries a default volume, including a rectangle. Presence of a property is not presence of the thing.
⚠️ **ASSERT THE DESTRUCTIVE DIRECTION FIRST, THEN A WORKING ONE AS A CONTROL.** A "fix" that disables
every tile passes the first test and fails the second. Same shape as rule 9, and it caught nothing this
time only because the fix was right — which is the point of writing it before you know.

🧹 **THIS FILE WAS 1,033 LINES AND IS NOW 333.** The CURRENT STATE section says "keep this short" and had
regrown to ~810 lines of per-release narrative — the exact regrowth LOOP-HISTORY.md was created for, and
every tick was re-reading a day of history to find a handful of rules. The accounts are in
LOOP-HISTORY.md; the rules stayed here. **One of them was also WRONG and had been sitting in "current
state" for days** — a #539 note concluding "it is NOT two walls fighting", which v12.65 disproved and
v12.72 fixed on the opposite reading. **Stale state is worse than no state.**

⚠️ **AN "ADD X" REQUEST'S REAL RISK IS DUPLICATING WHAT IS ALREADY THERE.** #563 asked for a bell, and
`ding` sat directly above it claiming in its own comment to be "a bell rather than a beep". A third sine
would have shipped him the same sound twice and **every "does it make a noise" assertion would have
passed.** Look at the neighbours, and measure the new thing AGAINST the closest existing one.
⚠️ **THE PATH THAT IS NOT NORMALISED IS THE ONE THAT BREAKS.** The bell clipped on the ▶ and nowhere
else, because `renderBuffer` normalises and `preview()` does not. Two paths, one of them unguarded.

⚠️ **`catch (e) {}` IS WHY A BUG LIVES FOR MONTHS.** #562 was not flaky — **all 29 sound effects threw on
their first line**, every time, and the empty catch around them meant the app never said a word. Silent
failure and success look identical, so nobody could have found it by using the app. **When you touch a
swallowed catch, make it speak.** The fix was one argument; finding it was the whole job.
⚠️ **AND THE ENTRY'S SUSPECT WAS WRONG AGAIN** — it said "suspended AudioContext, no user gesture"; the
context measured `running`. That is four in a row (#539, #550, #559, #562). Read the entry for what he
ASKED; measure the app for what is wrong.

⚠️ **A BUG THAT TURNS UP A THIRD TIME IS A MISSING FUNCTION, NOT A THIRD FIX.** #561 was the on-canvas
overlay double-scale — v8.00 had already fixed it once in the drawing overlay, and it was sitting in the
point editor AND the mask editor with identical numbers (ratio 2.00 at 2x, offset 720,1200 at 4x). Three
hand-written copies of one rule is how it comes back a fourth time, so it is `FM.placeOverlayOnCanvas`
now and the test fails if any overlay module stops calling it.
⚠️ **AND SWEEP WHEN HE SAYS "probably other stuff" — he is usually right.** That is the only reason the
mask editor was found.
⚠️ **CHECK YOUR INSTRUMENT BEFORE BELIEVING A SECOND BUG.** My first sweep said the selection box drifted
too. It does not: I had mapped the project onto the canvas rect, and at high zoom the canvas is CLIPPED,
not scaled. Measuring against the shape's own rendered pixels gave 0,0,1,1 agreement. Same shape as the
rule-11 round on #548 — when a thing you did not touch measures broken, suspect the ruler.

⚠️ **CHECK WHAT IS ALREADY TRUE BEFORE BUILDING — it is the other half of rule 3, and #560 is the case
for it.** "Masks don't behave like effects" sounds like a migration. Opening the file first showed the
chevron, grip, eye, bin, swipe-to-delete, hold-to-reorder and the shared add route were ALL already
there from #360. What was actually left was a heading, a card style and a missing wrapper — an
afternoon, not a rewrite. **An entry records what he asked for on the day; it does not know what has
shipped since.**
✅ **The end-of-batch audit in `next.sh` earned itself on its first run**, catching #550 clause 1 ticked
DONE in the prose with an empty checkbox.

⚠️ **AN ENTRY'S DIAGNOSIS IS A HYPOTHESIS, NOT A FINDING — three in a row now.** Each of these was
written down confidently by a past session and each was wrong, and one measurement settled every one:
· **#539** — "the corner is a complete no-op, zero px differ". 1,410 pixels changed; the reading came
  from a bounding box the wall clips either way.
· **#550** — "the head divider runs the full height of every row here", so which line does he mean?
  It ran 21px in a 40px row on the add row and 41px everywhere else. There was one break, not a puzzle.
· **#559** — "a slider RANGE/curve problem: the useful part happens across a small part of the track".
  The response is dead linear end to end; the range was right and the RESOLUTION was wrong.
**Read the entry for what he ASKED. Measure the app for what is wrong.** The two are different, and the
entry is the one that goes stale.

⚠️ **"NEEDS HIM TO CIRCLE IT AGAIN" IS USUALLY A MEASUREMENT YOU HAVE NOT TAKEN.** #550 clause 2 sat
parked on that for a round, on the reasoning that "the head divider runs the full height of every row
here" — which was simply **false**, and one probe of the rendered page said so: the add row drew it 21px
in a 40px row while every other row drew 41px. There was exactly one break in that line anywhere, so
there was never anything to guess at. **Before asking him for another screenshot, measure the thing the
screenshot is of.**

⚠️ **CHECK RULE 11 BEFORE MEASURING ANYTHING THAT MOVES — I lost four rounds to it on #548.** Readings
said every animation was frozen at its first frame and every card sat 6px out. **All of it was the pane,
not the code:** `requestAnimationFrame` does not fire in a tab that is not fronted — a control loop
returned **zero frames in 500ms and hung outright**. The tell was the settings cog's `cv-grow`, which
predates the work entirely, also reporting `running` after 600ms: when something you did not touch
measures broken, the instrument is broken. **Front the tab (`tabs_select`) and run the control first.**
It did find a real bug, so the round was not wasted — a retry loop and a teardown watcher were both
rAF-driven and would never have run in a background tab.

🔒 **THE ONE THAT MATTERS FOR THE NEXT TICK: `ship.sh` NOW REFUSES TO WORK THE LIST OUT OF ORDER.**
I broke the oldest-first rule twice in one day — v12.69 shipped #556/#557/#558 with six lower items
workable, and v12.70 jumped #474 *while I was writing the gate that catches it*. `tools/next.sh` printed
the right answer both times; nothing was broken except the obeying, and by his own rule that is no
safeguard at all. **Use `./tools/next.sh` (or `next_up` in `tools/_classify.py`) and work what it says.**
To skip one legitimately, write **`JUMPED: <reason>`** in that entry — a declaration he can read, not a
silent reordering.

⚠️ **AND "BLOCKED ON A PICK" IS NOT BLOCKED WHILE HE IS ASLEEP (rule 16).** #524 sat parked on an A/B/C
table I had already written a recommendation for. That is not blocked, it is unstarted. Decide, ship, and
say plainly which option you took and how to overrule it. Only park what costs him something he should
choose — #539 clause 1 parks because both fixes add per-frame cost on the phone he has called laggy three
times, which is different from a taste call.

⚠️ **MEASURE THE PICTURE, NOT THE BOUNDING BOX.** #539's own entry recorded the corner as "zero px differ,
a complete no-op". It never was — 1,410 px changed. The wall clips the bbox either way, so a bbox cannot
see it, and that entry *warns about exactly this one paragraph earlier*. Count pixels.

⚠️ **THE RECURRING FAILURE THIS STRETCH, in four different disguises: I trusted a thing instead of
checking it.** Worth reading before the next tick, because each one LOOKED finished:
· **#540** — `layer.x` is not what moves a layer (`layer.transform.x` is). `evalProp` returns the right
  numbers for `layer.x` and the picture never moves, so motion blur correctly read "no movement" and I
  nearly concluded the algorithm had plateaued. **Four wrong measurements.** And my control compared the
  smear WIDTH at two times, which is identical whether it moved or not — **a control that cannot fail is
  not a control.**
· **#538** — a listener held on `#preview`, then on `#canvas-wrap`, silently never fired. That area is
  rebuilt, so a node captured at load is dead by the time the feature runs — **and that is the only state
  it runs in.** Document-level capture is the answer.
· **#549** — put the fix inside `renderScene`, which the EXPORTER draws through: a 2s clip came out 61
  frames. **The suite caught it in one line.** The rule belongs on the preview call site.
· **#555** — flipping `keyframable: false` → `true` made the ◆ appear and do NOTHING, because an animated
  colour is an object and 39 kernels read colours as strings. **A ◆ that does nothing is queue 529's
  complaint**, and it would have shipped looking finished. Measure PIXELS, not flags.
· **#539** — concluded "complete no-op, two walls not involved" from a BOUNDING BOX. Instrumenting said
  the opposite: it runs fully and cancels to identity. **A bbox cannot see a deformation that preserves
  extents.**

**📌 PARKED ON HIS PICK — genuinely waiting on him, not skipped.** Re-checked at v12.79:
· **#564** — Outline & Shadows, A/B/C drawn and waiting.
· **#215** — does a message appear when an export loses its audio?
· **#560** — masks now LOOK like effects; say *"migrate masks"* to move the model so one can be dragged
  past an effect. ~30 call sites, touches the render path.
· **#539 clauses 1–3** — the shake jitter is a damping decision that costs per-frame time on the phone;
  the layer picker needs arbitrary-shape collision.
· **#545** — a design-system project in his claude.ai account, tied to the held identity pass.
· Whether to rename "Stroke Colour".
**📌 #553's black bar** is untouched — never seen it; the push guard is containment, not a fix.
**📌 #566 logged 26 Aug**: Reverse swell and Glass break clip on the ▶ (preview is the one path that is
never normalised). Found by measuring, not reported by him.

