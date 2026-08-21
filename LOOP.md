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

**Last shipped: v11.49** (queue 468). **This tick: no bug — group/parent transforms verified and PINNED.**
No app code changed, no version bump. Suite **815/815 green**, pushed and verified.

**0 actionable → BUG HUNT** (his standing instruction, queue 260 verbatim).

**THIS TICK — group / parent transform chains at depth. All correct:**
- **Translation composes exactly** at nesting depth 1–4 (+30 on the outermost group moves the grandchild
  by exactly 30), and each level contributes (+10 at three levels = +30).
- **Scale does BOTH things** — resizes the child AND pushes it further from the origin (40×40 at 200
  becomes 80×80 at 400). A chain that only resized in place would look plausible and be wrong.
- **Rotation composes** — a 360° turn returns the child to the identical position and size, and the
  quarter turns land exactly where the arithmetic predicts.
- **Cycles are safe.** `applyParentChain` guards with a `seen` Set; a parent cycle, a self-parent and a
  missing parent id each render without throwing and without hanging.
**Now pinned by a test** — the chain had STRUCTURAL cover (orphans, split parents, cycle termination) but
nothing measured the GEOMETRY, which is the entire point of grouping and is silent when wrong.

**⚠️ THREE WRONG READINGS THIS TICK, ALL ONE MISTAKE: a canvas too small to hold the answer.** "The group's
scale doesn't resize the child", "rotation makes it vanish", "scale on two groups draws nothing" — every one
was the child leaving a 200×200 frame, exactly as the arithmetic says it should. On a 1000×1000 canvas the
same code measured perfectly. **When a probe reports "nothing there", check the thing is still INSIDE the
frame before believing it** — the test now carries an explicit `offFrame` guard so it can never make that
mistake silently. Related to §8b/§8c in BUG-HUNT.md; the discipline is the same one those entries teach.

**HUNT LOG — swept and CLEAN, do not re-check blind:**
- **All 27 audio effects**; **project import with hostile files** (FOUND #467); **undo/redo across the four
  newest features**; **the queue-217 re-id gate**; **timeline at 10 s / 10 min / 60 min**; **the LIVE audio
  path for all six newly-keyframable params**; **the EXPORT audio path end-to-end**; **exportFitRect + the
  frame loop**; **the service worker's caching rules**; **clip frame boundaries** (pinned); **keyframe
  evaluation** (FOUND #468); **the full 380px per-category phone sweep** (FOUND #469, a question);
  **group/parent transform chains at depth** (this tick — pinned).

**STILL UN-SWEPT:** a hostile TEMPLATE PACK through the real insert UI; the phone sweep for a TEXT layer's
own categories (Customise Text / Captions — see §8e for why they need care).

**Running tally, said plainly:** across eleven hunts — **three real bugs** (#466, #467, #468), **one question
for him** (#469), **three coverage gaps closed** (exporter scheduling, clip frame edges, group transforms),
**one safeguard built**, **fourteen probe/harness errors** caught before they reached him.

**⚠️ SAID FOUR TIMES NOW.** The queue has been 0-actionable for ELEVEN ticks. The hunts are still producing
— but three of the last four produced TESTS for things that already worked, not fixes for things that did
not. That is worth something and it is not worth as much as one answer from him. **#469 needs one word.**

**Waiting on Ezra:** 469 (one word), 432, 456, 460, 454 second half, 202, 387, 215, 250, 342, 391, 395, 429,
418, 223; the unnumbered **"Editing lags"** (all fixes in — open only until he says it feels better on his
device); **whether an animated reverb stutters while previewing on his phone**; and **392** — his verdict on
Text to Voice, plus the cloud-vs-record choice.

**392's wall, so no future tick re-litigates it:** `speechSynthesis` speaks to the speakers and exposes no
stream, media element, or graph node. There is NO supported capture route in any browser. No capture → no
audio layer → nothing in an export. The only two real routes are BYOK cloud TTS or record/import a
voiceover, and **both are decisions only Ezra can make.**
