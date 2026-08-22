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
6. **Suite in the FOREGROUND with `timeout: 500000`.** Never background-and-poll.
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
    Check `document.hidden` before believing any timing measurement.
12. **A picture assertion cannot police a cost.** Sixteen identical renders average back to the same
    image — that mutation survived until the expensive path was counted. If a fix has a cost, measure
    the cost, not the output.

## STATE

**▶️ LOOP RUNNING — every minute, and it stays that way (rule 8b: never pause it).**

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
