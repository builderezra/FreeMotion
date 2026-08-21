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

**Last shipped: v11.49** (queue 468). **This tick: the 380px sweep FINISHED — no bug, one question filed
for Ezra (#469).** No app code changed, no version bump.

**0 actionable → BUG HUNT** (his standing instruction, queue 260 verbatim). Findings get their OWN numbered
entry.

**THE PHONE SWEEP IS DONE — all eight inspector categories at 380px with a 12-layer project.** No
horizontal overflow anywhere, nothing clipped, every control reachable. **Last tick's unanswered question
is answered:** the scroll container is **`#inspector-panel`** (`<aside class="panel open">`,
`overflow-y: auto`), so content below the fold IS reachable — the earlier "cannot confirm" is resolved.

**⚠️ AND LAST TICK'S FAILURE WAS ENTIRELY SELF-INFLICTED — now BUG-HUNT.md §8f.**
`FM.inspector.openCategory(k)` rebuilds the panel **synchronously in ~7 ms**; the sheet is already open so
nothing animates. Measured immediately vs after a 450 ms settle: identical in every respect. The sweep that
timed out THREE times with `sleep(250)` between categories finished all eight **in one call with no sleeps
at all**. A whole tick was spent waiting for an animation that does not happen. **Before adding a settle
wait, measure whether anything settles.**

**#469 FILED, and deliberately NOT acted on.** The ◆ keyframe buttons are 18×18 with zero padding
(Apple's guidance is 44×44). A false alarm was separated out in the same pass and recorded: the 15×15
checkboxes ARE wrapped in `<label>`, so their real target is the full 356×21 row — those are fine. The hit
area of the diamonds could be grown invisibly, **but the nearest neighbour is 9.8 px away and it is the
BACK button**, so growing it to the full gap would make taps meant for Back create keyframes instead.
Trading "hard to hit" for "adds animation you did not ask for" is his call, not mine. Three options with a
recommendation are in the entry; **it is a one-word answer and "leave it" closes it.**

**HUNT LOG — swept and CLEAN, do not re-check blind:**
- **All 27 audio effects**; **project import with hostile files** (FOUND #467); **undo/redo across the four
  newest features**; **the queue-217 re-id gate, verified not trusted**; **timeline at 10 s / 10 min /
  60 min**; **the LIVE audio path for all six newly-keyframable params**; **the EXPORT audio path
  end-to-end**; **exportFitRect + the frame loop**; **the service worker's caching rules**; **clip frame
  boundaries** (pinned by a test); **keyframe evaluation** (FOUND #468); **the full 380px per-category
  phone sweep** (this tick — FOUND #469, a question rather than a defect).

**STILL UN-SWEPT:** a hostile TEMPLATE PACK through the real insert UI; group/parent transform chains at
depth; the phone sweep for a TEXT layer's own categories (Customise Text / Captions — skipped here because
opening `element` on a text layer launches the full-screen editor, see §8e).

**Running tally, said plainly:** across ten hunts — **three real bugs** (#466, #467, #468), **one question
for him** (#469), **two coverage gaps closed**, **one safeguard built**, **eleven probe/harness errors**
caught before they reached him.

**⚠️ SAID THREE TIMES NOW:** the queue has been 0-actionable for TEN ticks. #469 is at least a cheap one —
one word. The others: 432, 456, 460, 454 second half, 202, 387, 215, 250, 342, 391, 395, 429, 418, 223;
the unnumbered **"Editing lags"** (all fixes in — open only until he says it feels better on his device);
and **whether an animated reverb stutters while previewing on his phone**; and **392** — his verdict on Text
to Voice, plus the cloud-vs-record choice.

**392's wall, so no future tick re-litigates it:** `speechSynthesis` speaks to the speakers and exposes no
stream, media element, or graph node. There is NO supported capture route in any browser. No capture → no
audio layer → nothing in an export. The only two real routes are BYOK cloud TTS or record/import a
voiceover, and **both are decisions only Ezra can make.**
