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

**Last shipped: v11.45** — the unnumbered **per-effect-slider keyframes** entry is **CLOSED**. Reverb
Size and Decay were the last two of six; counted from the live registry, **499/499 visual and 60/60
audio params are keyframable, none excluded**. Suite **809/809 green**, pushed and verified.
Four mutations caught: sampling the export window instead of the keyframes, tightening the room-dedupe
key, leaving the original room un-muted (double reverb), and a linear instead of equal-power crossfade.

**One mutation SURVIVED and was left alone deliberately** — removing `!isAnim()` from the bank guard.
A static reverb is protected by three independent conditions (no keyframe span → no valid window →
identical rooms collapse), so no single mutation can make one build a bank. Over-determined, not dead.

**Lessons from this tick, all of them about probes rather than code:**
- **TWO assertions failed against CORRECT code**, both by measuring the sweep at a moment it had already
  left — "it must still sound like the room it started in", asserted a third of the way through a
  four-second sweep. Before believing a red test on new code, check the moment, not just the metric.
- **A surviving mutation is a hole in the TEST.** Leaving the original room un-muted applies the reverb
  twice, and every case swept the room OPEN, where the leftover is the quiet room and invisible. The
  closing sweep is what made it visible (0.01720 against 0.00042).
- **`48000 * 2.3` is `110399.99999999999`.** Round every sample index; a fractional one reads `undefined`
  and looks exactly like an audio dropout.
- Before calling an artifact new, **measure whether the effect already does it at rest**.

**Next item:** run `./tools/next.sh`. With this entry closed the actionable list is likely down to
**392 (text to voice)**, which the classifier marks as needing its own session and which still wants a
decision from Ezra on cloud vs the browser's built-in voices.

**Waiting on Ezra:** 432 template icon letter, 456 create-button letter, 460 the two options, 454 second
half, 202 perf readout while playing, 387, 215, 250 does the slam still look wrong, 342, 391, 395 MP3
yes/no, 429, 418, 223 follow-ups. Plus the unnumbered **"Editing lags"** entry (both measured causes and
the memory leak are FIXED; open only until he says whether it feels better on his own device) and now
**whether an animated reverb stutters while PREVIEWING on his phone** — the one thing v11.45 could not
measure for him.
