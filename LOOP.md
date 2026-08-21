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

**Last shipped: v11.44** — the unnumbered **per-effect-slider keyframes** entry: Pitch Shift Semitones
is keyframable and glides. Suite **808/808 green**, pushed and verified (`HEAD == ssh/main`). Both
directions mutation-checked (force the static path → the glide never happens; drop the gate → a static
instance pays for scheduling).

**That entry is now 4 of 6 and STAYS OPEN.** Only **Reverb Size** and **Reverb Decay** are left. They
rebuild an impulse response, cost ~12.5 ms a frame, and are the two Ezra's *"put a warning next to it"*
answer was actually about. **Do NOT copy the shaper bank OR the Pitch Shift fix to them** — a bank of
convolvers is a different and much heavier proposition. That is the next tick.

**Two probe lessons from v11.44, both worth keeping:**
- `48000 * 2.3` is `110399.99999999999`. A fractional buffer index reads `undefined`, every comparison
  is false, and the window reports zero — which looked exactly like an audio dropout. **Round every
  sample index.**
- The animated render's quietest 10 ms (0.049 RMS) looked like a hole until the same probe was pointed
  at STATIC values: +9 st dips to 0.042 on its own. **Before calling an artifact new, measure whether
  the thing already does it at rest.**

**Note still live from v11.43:** adding a control to a filled panel is a layout change to every control
already in it — the fourth align button took the others from 48px to 34px. Measure the neighbours.

**Waiting on Ezra** (do not burn ticks guessing): 432 template icon letter, 456 create-button letter,
460 the two options, 454 second half, 202 perf readout while playing, 387, 215, 250 does the slam
still look wrong, 342, 391, 395 MP3 yes/no, 429, 418, 223 follow-ups. Also the unnumbered **"Editing
lags"** entry — both measured causes and the memory leak are FIXED; it is open only until he says
whether it feels better on his own device.
