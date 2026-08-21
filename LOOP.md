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

**Last shipped: v11.49** (queue 468). **This tick found NO bug and only PARTLY finished its sweep — said
plainly rather than dressed up.** No app code changed, no version bump.

**0 actionable → BUG HUNT** (his standing instruction, queue 260 verbatim).

**THIS TICK — the phone layout at 380px with a BUSY project (12 layers).** What was actually established,
and it is less than intended:
- **The home / category grid: clean.** No horizontal overflow, page does not scroll sideways.
- **The Effects panel with effects applied: clean.** Widest control reaches 368 px of 380; nothing off the
  right edge; no sideways scroll.
- **NOT established: the per-category sweep.** It was abandoned after repeatedly hitting the harness, not
  after finding anything. Also NOT established: whether content BELOW the fold is reachable — the sheet's
  scroll container was never identified, so `everyControlReachable` above only means "within the panel's
  own box", which is not the same claim. **Do not read this as "the phone layout is verified".**

**⚠️ THE TRAPS THAT ATE THIS TICK are now BUG-HUNT.md §8e.** One panel PER CALL (30 s budget vs a UI that
needs many sequential steps); timers are throttled while the pane is hidden (`tabs_select` fixes it — and
measure a sleep, because `document.hidden` still reports true either way); `getComputedStyle` over a whole
panel is far slower than it looks; opening the `element` category on a TEXT layer launches the full-screen
editor and collapses the inspector to 0×0 so everything after reads zero; and repeated
`FM.inspector.back()` can unwind past the grid and leave the app out of edit mode entirely.

**NEXT TICK, do the sweep properly:** one category per call, on a SHAPE layer, re-asserting the selection
each time, with the tab fronted first. Identify the sheet's scroll container ONCE and then the
below-the-fold question can actually be answered.

**HUNT LOG — swept and CLEAN, do not re-check blind:**
- **All 27 audio effects**; **project import with hostile files** (FOUND #467); **undo/redo across the four
  newest features**; **the queue-217 re-id gate, verified not trusted**; **timeline at 10 s / 10 min /
  60 min**; **the LIVE audio path for all six newly-keyframable params**; **the EXPORT audio path
  end-to-end**; **exportFitRect + the frame loop**; **the service worker's caching rules**; **clip frame
  boundaries** (pinned by a test); **keyframe evaluation** (FOUND #468); **380px home grid + Effects panel
  with 12 layers** (this tick, partial).

**STILL UN-SWEPT:** the rest of the per-category phone sweep; a hostile TEMPLATE PACK through the real
insert UI; group/parent transform chains at depth.

**Running tally, said plainly:** across nine hunts — **three real bugs** (#466, #467, #468), **two coverage
gaps closed**, **one safeguard built**, **ten probe/harness errors** caught before they reached him, and
**one tick (this one) that produced almost nothing.** That last number matters: the returns are thinning.

**⚠️ SAID TO HIM TWICE NOW, and worth a third:** the queue has been 0-actionable for NINE ticks. Hunting is
his standing fallback, but the last four findings were malformed-FILE robustness rather than anything he
can see today, and this tick found nothing at all. **A few one-word answers would unblock far more real
work than another sweep.**

**Waiting on Ezra:** 432, 456, 460, 454 second half, 202, 387, 215, 250, 342, 391, 395, 429, 418, 223
follow-ups; the unnumbered **"Editing lags"** (all fixes in — open only until he says it feels better on his
device); **whether an animated reverb stutters while previewing on his phone**; and **392** — his verdict on
Text to Voice, plus the cloud-vs-record choice.

**392's wall, so no future tick re-litigates it:** `speechSynthesis` speaks to the speakers and exposes no
stream, media element, or graph node. There is NO supported capture route in any browser. No capture → no
audio layer → nothing in an export. The only two real routes are BYOK cloud TTS or record/import a
voiceover, and **both are decisions only Ezra can make.**
