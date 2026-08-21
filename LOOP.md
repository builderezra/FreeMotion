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

**Last shipped: v11.48** — queue **467**, a bug hunt finding. Suite **811/811 green**, pushed and verified.

**0 actionable → BUG HUNT** (his standing instruction, queue 260 verbatim: *"When you finish the last
thing, do a bug and issue hunt. Also look for potential ideas and things to do."*). Findings get their
OWN numbered entry — 260's rule: "a hunt that files its findings into a single bullet is a hunt whose
findings rot."

**HUNT LOG — areas swept, so they are not re-checked blind every session:**
- **All 27 audio effects** (v11.47 tick), offline render, static defaults AND every parameter animated
  min→max: no throws, no NaN, no silence. Also proves v11.45's whole-window hook disturbed none of them.
- **Project import, hostile files** (this tick). CLEAN: prototype pollution via `__proto__` /
  `constructor` in a layer or the project; remote and `javascript:` `fillImage` URLs (dropped);
  prototype-chain effect types `constructor` / `toString` (dropped); the 2000-layer refusal.
  FOUND: **#467**, layer timing never validated → a broken file imports as a 0-second empty project.
- **Text to Voice settings persistence** (v11.47 tick). Survives save/reload. FOUND: **#466** next to it.

**STILL UN-SWEPT — start here next tick:** the export pipeline end-to-end with the new reverb bank;
undo/redo across the newer panels (filters, faves, TTS); the timeline at very long durations; template /
element insert with a hostile pack (same door as import, different key).

**⚠️ THE SEAM LESSON, THIRD TIME NOW — a passing test can prove a function works and NOTHING about
whether anything calls it.** #467's mutation SURVIVED at first: deleting the sanitiser's call site left
every assertion green, because the test drove the function directly. Previous outings: #382's cost
counter, #455's rendered ruler, #394's call site. **Whenever a fix is "new function + one call site",
assert through the REAL entry point, not the function.**

**Probe discipline, earned the hard way:** check the SHAPE of what a function returns before believing
what you read out of it (three wrong readings in one tick — `serializeScene` is async, `storage.load()`
returns a boolean); round every sample index; and take a CLEAN CONTROL through the same probe before
calling anything a bug — "no clip element found" is usually a wrong selector, not a defect.

**Waiting on Ezra — still the bottleneck:** 432, 456, 460, 454 second half, 202, 387, 215, 250, 342, 391,
395, 429, 418, 223 follow-ups; the unnumbered **"Editing lags"** (all fixes in — open only until he says
it feels better on his device); **whether an animated reverb stutters while previewing on his phone**;
and **392** — his verdict on Text to Voice, plus the cloud-vs-record choice.

**392's wall, so no future tick re-litigates it:** `speechSynthesis` speaks to the speakers and exposes no
stream, media element, or graph node. There is NO supported capture route in any browser. No capture → no
audio layer → nothing in an export. The only two real routes are BYOK cloud TTS or record/import a
voiceover, and **both are decisions only Ezra can make.**
