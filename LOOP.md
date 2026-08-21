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

**Last shipped: v11.48** (queue 467). **This tick: a hunt that found NOTHING — and that is a real result,
recorded so it is not repeated blind.** No version bump, no app code changed.

**0 actionable → BUG HUNT** (his standing instruction, queue 260 verbatim: *"When you finish the last
thing, do a bug and issue hunt. Also look for potential ideas and things to do."*). Findings get their OWN
numbered entry — 260's rule. **No findings this tick means no entry to file, not an entry saying nothing.**

**HUNT LOG — swept and CLEAN, do not re-check blind:**
- **All 27 audio effects** (v11.47 tick): offline render, static AND every param animated min→max. No
  throws, no NaN, no silence. Also proves v11.45's whole-window hook disturbed none of the other 26.
- **Project import, hostile files** (v11.48 tick). CLEAN on prototype pollution (`__proto__`,
  `constructor`, in a layer and in the project), remote and `javascript:` `fillImage` (dropped),
  prototype-chain effect types (dropped), the 2000-layer refusal. FOUND **#467**.
- **Undo / redo across all four recent features** (this tick): Text to Voice settings, the split stairs
  chain buttons, the toggle-then-Add filter flow, and an audio-effect keyframe diamond. **All correct**,
  undo and redo both.
- **The queue-217 structural claim, VERIFIED rather than trusted** (this tick): `reIdLayers` really is the
  single gate every batch of foreign layers passes, so #467's timing fix protects template insert, element
  insert and project duplicate too — not only file import. Driven through `_reIdLayers` directly.
- **Timeline at 10 s / 10 min / 60 min** (this tick): no throw, no unbounded DOM, scroll extent scales
  sanely. ⚠️ No timing claim from this — the preview pane reports `document.hidden` and throttles, so its
  numbers are worthless (rule 11).

**STILL UN-SWEPT — start here next tick:** the export pipeline end-to-end with the new reverb bank; a
hostile TEMPLATE PACK through the real insert UI (the data path is verified, the UI path is not); the
audio-fx live preview path (`applyAt`), which no hunt has touched.

**⚠️ THE REAL FINDING THIS TICK WAS ABOUT ME, and it is now in BUG-HUNT.md §8b/§8c where a hunt will look.**
Five probe errors in two ticks, all one shape — assuming an API or DOM shape and reading a falsy result as
a defect. `serializeScene` is ASYNC; `storage.load()` returns a BOOLEAN and loads into `FM.scene`;
`.flt-commit` is a CONTAINER whose inner button does the work. One nearly became a report that project
saving was broken, and one "the filter Add button does nothing" was entirely my click landing on a div.
**The rule now written at the top of BUG-HUNT.md: before believing any negative, put a KNOWN-GOOD case
through the identical probe. If the control also reads empty, the probe is broken — and it is, about half
the time.**

**Waiting on Ezra — still the bottleneck:** 432, 456, 460, 454 second half, 202, 387, 215, 250, 342, 391,
395, 429, 418, 223 follow-ups; the unnumbered **"Editing lags"** (all fixes in — open only until he says
it feels better on his device); **whether an animated reverb stutters while previewing on his phone**; and
**392** — his verdict on Text to Voice, plus the cloud-vs-record choice.

**392's wall, so no future tick re-litigates it:** `speechSynthesis` speaks to the speakers and exposes no
stream, media element, or graph node. There is NO supported capture route in any browser. No capture → no
audio layer → nothing in an export. The only two real routes are BYOK cloud TTS or record/import a
voiceover, and **both are decisions only Ezra can make.**
