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
11. **The preview pane reports `document.hidden: true` even when fronted, so CSS animations and
    timers are throttled in it.** Anything time-based measured there is worthless — a slam animation
    sampled at six points returned the same frozen transform every time and looked exactly like a bug.
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

**NEXT, oldest first from the audit lists:** (a Custom rung on the export frame-rate list — never
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
