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

**Last shipped: v11.47** — queue **466**, a bug hunt finding. Suite **810/810 green**, pushed and verified.

**⚠️ AN EMPTY QUEUE IS NOT A REASON TO STOP — correcting what this file said last tick.** It claimed
"say so in one line and stop", which was too absolute and would have wasted this tick. His standing
instruction (queue **260**, verbatim) is: *"When you finish the last thing, do a bug and issue hunt. Also
look for potential ideas and things to do."* That is exactly the empty-queue case, so **0 actionable →
BUG HUNT**, not silence. Findings get their OWN numbered entry (also 260's rule: "a hunt that files its
findings into a single bullet is a hunt whose findings rot").

**This hunt, for the record so it is not repeated blind.** Swept all **27 audio effects** through an
offline render — static defaults AND every parameter animated min→max at once — checking for throws,
NaN/Inf, silence and absurd peaks. **All clean**, which also proves the new whole-window scheduler hook
from v11.45 disturbed none of the other 26 effects. The one flag (gain peaking at 8.68 when animated to
maximum) is the probe being naive: a gain effect at maximum gain is *supposed* to be loud.
Then checked an assumption I had PUBLISHED but never verified — that Text to Voice settings survive a
save. They do. But the check found a different, real bug next to it: **#466**, my own regression from
v11.46, where changing the Speed erased the saved voice.

**THREE probe errors in a row while chasing it, all mine, all the same shape — assuming a return type
instead of looking:** `serializeScene` is ASYNC (un-awaited, so `.layers` was undefined and it looked
like the field was being dropped); `storage.load()` returns a BOOLEAN and loads into `FM.scene` rather
than returning the doc; and the first "autosave loses it" reading came from filtering a list that was
never there. **Every one produced a confident wrong conclusion, and one of them nearly became a report
that the save path was broken.** BUG-HUNT.md's rule, again: a measurement that cannot fail is not
evidence. Check the SHAPE of what a function returns before believing what you read out of it.

**Next tick:** the queue will still be 0 actionable, so hunt again. Areas NOT yet swept: the export
pipeline end-to-end with the new reverb bank; undo/redo across the newer panels; project import of a
hostile .fmotion.json; the timeline at very long durations.

**Waiting on Ezra — still the bottleneck:** 432, 456, 460, 454 second half, 202, 387, 215, 250, 342, 391,
395, 429, 418, 223 follow-ups; the unnumbered **"Editing lags"** (all fixes in — open only until he says
it feels better on his device); **whether an animated reverb stutters while previewing on his phone**;
and **392** — his verdict on Text to Voice, plus the cloud-vs-record choice.

**392's wall, so no future tick re-litigates it:** `speechSynthesis` speaks to the speakers and exposes no
stream, media element, or graph node. There is NO supported capture route in any browser. No capture → no
audio layer → nothing in an export. The only two real routes are BYOK cloud TTS or record/import a
voiceover, and **both are decisions only Ezra can make.**
