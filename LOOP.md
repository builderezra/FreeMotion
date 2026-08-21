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

**Last shipped: v11.46** (Text to Voice). Since then, one tooling change with no version bump: the queue
classifier. Suite **810/810 green**, pushed and verified.

**⛔ THE ACTIONABLE QUEUE IS EMPTY. 0 actionable, 24 blocked on Ezra, 3 held, 1 big, 3 standing notes,
1 long-term.** Per the loop's own rule: **do not manufacture work.** If a tick finds nothing actionable,
say so in one line and stop. An empty queue is not an emergency and not a licence to invent a feature.

**What changed this tick, and why it was worth a tick.** `ANSWERED BY EZRA` was STICKY FOREVER: once an
entry contained it anywhere, every blocking phrase in it counted as stale history and the entry could
never block again. That is right for prose his answer superseded and wrong the moment a PARTIAL SHIP
raises a fresh question — #392 shipped one clause of four, asked him to choose between cloud TTS and
recording a voiceover, and came back ACTIONABLE with nothing that could be done. Three earlier cures for
this same shape were all explicit markers a future session had to REMEMBER to write, which this project
treats as no safeguard at all.
**The rule now uses a property the file already has:** entries are append-only, so they are chronological.
His answer silences only what PRECEDES it; blocking prose written after it has not been superseded by
anything. Verified against all 32 open entries — exactly one moved (#392, correctly) and nothing else.
It self-heals: his next `ANSWERED BY EZRA` resets the tail and the entry becomes workable again.
**And it can no longer rot silently:** `python3 tools/_classify.py` self-tests all 11 rules — each case
is a bug that really happened — and `tools/ship.sh` REFUSES to push when any of them fails. Proven by
breaking the new rule and watching the gate exit 1.

**Waiting on Ezra — this is the bottleneck now, not the work:**
432 template icon letter, 456 create-button letter, 460 the two options, 454 second half, 202 perf readout
while playing, 387, 215, 250 does the slam still look wrong, 342, 391, 395 MP3 yes/no, 429, 418, 223
follow-ups; the unnumbered **"Editing lags"** (all fixes in — open only until he says it feels better on
his own device); **whether an animated reverb stutters while previewing on his phone** (v11.45 could not
measure that); and **392** — his verdict on the shipped Text to Voice, plus the cloud-vs-record choice.

**392's wall, so no future tick re-litigates it:** `speechSynthesis` speaks to the speakers and exposes no
stream, media element, or graph node. There is NO supported capture route in any browser. No capture → no
audio layer → nothing in an export. The only two real routes are BYOK cloud TTS or record/import a
voiceover, and **both are decisions only Ezra can make.**

**Probe lessons worth keeping:** round every sample index (`48000 * 2.3` is not an integer); a surviving
mutation is a hole in the TEST, not proof the code is fine; check whether an effect already does the thing
at rest before calling an artifact new; and an assertion can fail against CORRECT code by measuring a
moment the animation has already left.
