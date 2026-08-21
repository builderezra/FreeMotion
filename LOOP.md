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

**Last shipped: v11.50** — queue **470**, and it is the most serious thing the hunts have found. Suite
**816/816 green**, pushed and verified. Mutation-checked.

**0 actionable → BUG HUNT** (his standing instruction, queue 260 verbatim).

**THIS TICK — the template insert path, the last untested door for foreign data. FOUND #470:**
`templates.useAsNew()` called `projects.create()` (which clamps the project size correctly) and then
replaced the whole live project with the pack's RAW object, throwing that clamp away. A template carrying
**16000×16000 at 999fps reached the live scene and was autosaved to disk.** Per `clampProjectDims`' own
note that is ~1GB per canvas: an OOM crash on open, and — being the CURRENT project — a crash again on
every relaunch. A brick.
**Fixed twice over:** the template path re-clamps, AND **every project re-clamps on OPEN**, so anything
already saved in a bad state repairs on the way in rather than taking the app down. The second is the
structural half — without it the fix would only protect new arrivals.
**What was FINE and is worth not re-checking:** the LAYERS in a hostile template pack were properly
sanitised. The queue-217 re-id gate really is the door every batch of foreign layers passes, and it
repaired both #467 timing and #468 keyframe order on the way in. Only the PROJECT object lacked a guard.

**⚠️ TWO REFUTED BY READING, IN MINUTES, BEFORE ANY PROBE:** `projects.create()` already clamps (its own
comment says why), and `applyScene` already clamps. Both hypotheses died in one `sed` of the source. The
one that survived reading is the one that turned out to be real. **Read first when the question is "does
this call the guard".**

**⚠️ THE TEST BROKE THREE OTHER TESTS FIRST — and restoring localStorage was NOT enough.** Opening a
project replaces the live scene (later tests: "no layer to work from"), and `open()` also pins storage's
internal `boundId` and adopts the doc revision the #306 stale-tab guard reads — so a fourth test failed
with "a normal save did not reach disk". **Re-OPENING the original project in `finally` is what re-pins
them.** Any future test that opens a project must do the same.

**HUNT LOG — swept and CLEAN, do not re-check blind:**
- **All 27 audio effects**; **project import with hostile files** (FOUND #467); **undo/redo across the four
  newest features**; **timeline at 10 s / 10 min / 60 min**; **the LIVE audio path for all six
  newly-keyframable params**; **the EXPORT audio path end-to-end**; **exportFitRect + the frame loop**;
  **the service worker's caching rules**; **clip frame boundaries** (pinned); **keyframe evaluation**
  (FOUND #468); **the full 380px per-category phone sweep** (FOUND #469, a question);
  **group/parent transform chains at depth** (pinned); **the template insert path** (this tick — FOUND
  #470; layers clean, project object was not).

**STILL UN-SWEPT:** the ELEMENTS insert path (same family as templates — check whether it assigns a
project object anywhere; the grep says it does not, so this is likely a quick read rather than a probe);
the phone sweep for a TEXT layer's own categories (Customise Text / Captions — see §8e).

**Running tally, said plainly:** across twelve hunts — **four real bugs** (#466, #467, #468, **#470**),
**one question for him** (#469), **three coverage gaps closed**, **one safeguard built**, **fifteen
probe/harness errors** caught before they reached him.

**Waiting on Ezra:** 469 (one word), 432, 456, 460, 454 second half, 202, 387, 215, 250, 342, 391, 395,
429, 418, 223; the unnumbered **"Editing lags"** (all fixes in — open only until he says it feels better on
his device); **whether an animated reverb stutters while previewing on his phone**; and **392** — his
verdict on Text to Voice, plus the cloud-vs-record choice.

**392's wall, so no future tick re-litigates it:** `speechSynthesis` speaks to the speakers and exposes no
stream, media element, or graph node. There is NO supported capture route in any browser. No capture → no
audio layer → nothing in an export. The only two real routes are BYOK cloud TTS or record/import a
voiceover, and **both are decisions only Ezra can make.**
