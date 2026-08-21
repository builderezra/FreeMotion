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

**Last shipped: v11.48** (queue 467). **This tick: no bug — one refuted by reading, one invariant pinned.**
No app code changed, no version bump. Suite **813/813 green**, pushed and verified.

**0 actionable → BUG HUNT** (his standing instruction, queue 260 verbatim). Findings get their OWN numbered
entry; **no findings means no entry.**

**THIS TICK:**
- **Service worker — hypothesis REFUTED BY READING, in two minutes.** The guess was that `js/tts.js` (added
  v11.46) had been left out of a precache list. There IS no precache list, deliberately: the worker keys on
  the full URL including `?v=`, so there is nothing to keep in sync, and unversioned assets never get
  cached at all. That design and last tick's cache-buster gate reinforce each other — the gate guarantees
  the `?v=` promise the worker relies on. **Reading the file cost nothing; writing a probe first would have
  cost twenty minutes.**
- **Clip boundaries — correct, and now PINNED.** A clip is drawn on the exact frame it starts and not on
  the frame it ends, so a 2 s clip at 30fps is exactly 60 frames (30–89). Verified through real pixels from
  `FM.renderScene`, which is how the exporter draws. **Nothing tested this**, and a slip either way is one
  frame of flicker at every clip edge — miserable to diagnose from a report, invisible in a still. The new
  test counts the frames; the `t <= end` mutation (a clip rendering 61 frames) is caught by it ALONE, out
  of 813 tests.

**HUNT LOG — swept and CLEAN, do not re-check blind:**
- **All 27 audio effects**; **project import with hostile files** (FOUND #467); **undo/redo across the four
  newest features**; **the queue-217 re-id gate, verified not trusted**; **timeline at 10 s / 10 min /
  60 min**; **the LIVE audio path for all six newly-keyframable params**; **the EXPORT audio path
  end-to-end** including a clip starting mid-export; **exportFitRect + the frame loop**; **the service
  worker's caching rules**; **clip frame boundaries**.

**STILL UN-SWEPT — start here next tick:** a hostile TEMPLATE PACK through the real insert UI (the data path
is verified via `_reIdLayers`, the UI path is not); keyframe evaluation at exact keyframe times (same
off-by-one family as the clip edges, and equally untested); the phone layout of the newest panels at 380px
under a LONG project (many layers).

**⚠️ THE CHEAPEST TOOL IS READING THE SOURCE.** Two ticks running, a probe written against an assumed shape
cost a round trip (`exportFitRect` returns `{dx,dy,dw,dh}`, not `{x,y,w,h}` — nine false failures). This
tick the service-worker hypothesis died in one `grep` of the file's own header comment. **Read first when
the question is "what does this do"; probe when the question is "does it actually happen".**

**Running tally, said plainly:** across seven hunts — **two real bugs** (#466, #467), **two coverage gaps
closed** (exporter scheduling, clip frame edges), **one safeguard built** (cache-buster gate), and **eight
probe errors** caught before they reached him.

**Waiting on Ezra — still the bottleneck:** 432, 456, 460, 454 second half, 202, 387, 215, 250, 342, 391,
395, 429, 418, 223 follow-ups; the unnumbered **"Editing lags"** (all fixes in — open only until he says it
feels better on his device); **whether an animated reverb stutters while previewing on his phone**; and
**392** — his verdict on Text to Voice, plus the cloud-vs-record choice.

**392's wall, so no future tick re-litigates it:** `speechSynthesis` speaks to the speakers and exposes no
stream, media element, or graph node. There is NO supported capture route in any browser. No capture → no
audio layer → nothing in an export. The only two real routes are BYOK cloud TTS or record/import a
voiceover, and **both are decisions only Ezra can make.**
