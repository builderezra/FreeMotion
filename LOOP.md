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

**⚠️ 22 Aug — HE WAS RIGHT AND I WAS WRONG. "0 actionable" WAS FALSE.**
He said *"you did not meet every task i believe, double check again"* and then *"just check extra hard
theres no leftovers coz looking through uve missed a lot"*. Both were correct.

**An independent audit of all 34 open entries — agents re-reading each entry AND the code, with a second
pass trying to REFUTE every claim — found 19 entries with real buildable work.** My classifier had said
zero. It reads prose with regexes; it cannot tell "clause 3 needs Ezra" from "the whole entry is blocked",
and that is precisely the miss. **NEVER treat `tools/_classify.py` as proof there is no work. It is a
hint. When it says 0, AUDIT BY HAND.**

**ALSO FOUND, and worse: #426 was ticked `[x]` DONE while its own header read "⚠️ STAYS OPEN".** Every
queue tool matches `^- \[ \]`, so it was UNREACHABLE for weeks — the exact "nothing rots at the bottom"
failure next.sh exists to prevent, third distinct cause. Reopened; next.sh now detects the contradiction.

**THE 19 CONFIRMED-BUILDABLE ITEMS** (each survived an adversarial refutation pass; full first-steps in
`scratchpad/buildable.json`, and the raw audit in the task output). Work them OLDEST FIRST as always:
**47** (export safety — he authorised it: *"if there's a thing to make exporting safer then do it"*; the
smallest piece is telling him when crash-protection has silently switched off), **96** (a song's tail —
build `tests/_songtail.html`; ⚠️ the auditor's proposed clamp is a REGRESSION, do not apply it),
**202** (perf readout — record WHICH operation ran late, in js/perf-probe.js only), **206**, **215**,
**361**, **387**, **406**, **408**, **417**, **418** (the undo/redo icon he sent a picture of —
index.html:436), **428**, **432**, **456**, **460**, plus the identity pass (docs-only) and two unnumbered.

**✅ v11.51 — first item off that list, and it was his own explicit instruction.** *"presets are just for
effects not anything else, if it says preset remove any other function"* — a dead `cvCurrentCfg` and its
"Canvas presets (queue 183)" comment block were still in js/app.js, referenced by nothing. Removed.

**A SECOND AUDIT IS STILL RUNNING:** all **243 CLOSED multi-part requests**, decomposed into his verbatim
clauses and checked against the code, hunting for halves that were ticked DONE without being built. That
is the documented failure mode of this file (*"how do you leave all this out"*). Fold its results in here
when they land.

**392's wall, so no future tick re-litigates it:** `speechSynthesis` speaks to the speakers and exposes no
stream, media element, or graph node. There is NO supported capture route in any browser. No capture → no
audio layer → nothing in an export. The only two real routes are BYOK cloud TTS or record/import a
voiceover, and **both are decisions only Ezra can make.**
