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

**Last shipped: v11.49** — queue **468**, a bug hunt finding. Suite **814/814 green**, pushed and verified.
Both directions mutation-checked (unwiring the call site; removing the sort).

**0 actionable → BUG HUNT** (his standing instruction, queue 260 verbatim). Findings get their OWN numbered
entry; **no findings means no entry.**

**THIS TICK — keyframe evaluation at its boundaries.** Every WELL-FORMED case is correct: the value at an
exact keyframe time is that keyframe's value, it holds rather than extrapolating outside the range, a
linear midpoint is the midpoint, a lone keyframe is a constant. **Two file-only shapes were not:** unsorted
keyframes collapse an animation to a CONSTANT (evalProp walks in order and returns the first entry at every
time), and a `null` value evaluates to NaN at its own time. Fixed at import by a generic `{kf:[…]}` walk —
**#468**.
**Confirmed the app cannot produce either**, which is why this is a file concern rather than a live bug:
`toggleProp` substitutes 0 for a missing fallback, and all 199 visual effects and 60 audio params carry a
default. Checking that FIRST is what kept the entry honest — it would have been easy to write this up as
something he was hitting.

**HUNT LOG — swept and CLEAN, do not re-check blind:**
- **All 27 audio effects**; **project import with hostile files** (FOUND #467); **undo/redo across the four
  newest features**; **the queue-217 re-id gate, verified not trusted**; **timeline at 10 s / 10 min /
  60 min**; **the LIVE audio path for all six newly-keyframable params**; **the EXPORT audio path
  end-to-end**; **exportFitRect + the frame loop**; **the service worker's caching rules**; **clip frame
  boundaries** (pinned by a test); **keyframe evaluation** (this tick — well-formed cases all correct).

**STILL UN-SWEPT — start here next tick:** a hostile TEMPLATE PACK through the real insert UI (the data path
is verified via `_reIdLayers`, the UI path is not); the phone layout of the newest panels at 380px under a
LONG project (many layers); group/parent transform chains at depth.

**⚠️ THE CONTROL CAUGHT ME TWICE THIS TICK.** A hand-written layer JSON "proved" a null keyframe blanked the
picture — until the GOOD control drew nothing either, because my hand-built layer was missing fields the
renderer needs. Rebuilt with `FM.makeLayer` (the real constructor), both drew, and the true symptom turned
out to be milder: the layer is MISPLACED, not missing. **Build fixtures with the app's own constructors;
a hand-rolled object is a fixture that only proves itself.**

**Running tally, said plainly:** across eight hunts — **three real bugs** (#466, #467, #468), **two coverage
gaps closed** (exporter scheduling, clip frame edges), **one safeguard built** (cache-buster gate), and
**nine probe errors** caught before they reached him.

**⚠️ WORTH SAYING TO HIM, and it has now been said twice:** the queue has been 0-actionable for eight ticks.
Hunting is his standing fallback and it is still finding things, but three of the last four findings were
malformed-FILE robustness rather than anything he can see today. **A few one-word answers would unblock more
real work than another sweep.**

**Waiting on Ezra — still the bottleneck:** 432, 456, 460, 454 second half, 202, 387, 215, 250, 342, 391,
395, 429, 418, 223 follow-ups; the unnumbered **"Editing lags"** (all fixes in — open only until he says it
feels better on his device); **whether an animated reverb stutters while previewing on his phone**; and
**392** — his verdict on Text to Voice, plus the cloud-vs-record choice.

**392's wall, so no future tick re-litigates it:** `speechSynthesis` speaks to the speakers and exposes no
stream, media element, or graph node. There is NO supported capture route in any browser. No capture → no
audio layer → nothing in an export. The only two real routes are BYOK cloud TTS or record/import a
voiceover, and **both are decisions only Ezra can make.**
