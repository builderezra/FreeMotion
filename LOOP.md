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

**Last shipped: v11.50** (queue 470). **This tick: no new bug — the hunt list is EXHAUSTED, and a gap in my
own fix was found and closed.** No app code changed, no version bump. Suite **816/816 green**, pushed.

**0 actionable → BUG HUNT** (his standing instruction, queue 260 verbatim).

**⚠️ THE BIGGEST FINDING THIS TICK WAS ABOUT LAST TICK'S FIX.** #470 had TWO halves — the clamp on project
OPEN and the clamp in `templates.useAsNew` — and **only the first was tested**. Deleting the `useAsNew`
clamp left all 816 tests green, so the exact bug shipped one tick earlier could have walked straight back
in. Found by mutation-checking my own fix rather than trusting that it was covered. Now pinned end to end.
**Generalise it: a two-part fix needs a test for BOTH parts. "The suite is green" says nothing about the
part no assertion touches.** Mutation-check EACH half of a multi-site fix, not the fix.

**THIS TICK — the last two un-swept items, both CLEAN:**
- **The ELEMENTS insert path.** Refuted by reading first (it never touches the project object), then
  confirmed end to end: a hostile element pack had its timing (#467) and keyframe order (#468) repaired by
  the re-id gate, and the project was untouched.
- **The TEXT-layer panels at 380px** — all eight categories including Captions, plus the full-screen text
  editor itself: no horizontal overflow, no unreachable controls, no small tap targets. (16 controls read
  as "below the viewport" — that is the PARKED add-menu sheet, correctly off-screen. A probe that measures
  the whole page will find other surfaces; scope it or expect false positives.)

**✅ THE HUNT LIST IS NOW EXHAUSTED.** Every door and panel enumerated across twelve ticks has been swept:
all 27 audio effects; project import with hostile files; undo/redo across the newest features; the
queue-217 re-id gate; the timeline at 10 s / 10 min / 60 min; the live audio path; the export audio path
end-to-end; exportFitRect and the frame loop; the service worker; clip frame boundaries; keyframe
evaluation; the 380px sweep for BOTH shape and text layers plus the text editor; group/parent transforms at
depth; the template insert path; the elements insert path.
**Nothing obvious is left to sweep.** A further hunt needs a NEW angle (fuzzing, long-session memory,
multi-tab, or a real-device report) rather than another item off this list — and the honest read is that
the returns no longer justify inventing one.

**Running tally, said plainly:** across thirteen hunts — **four real bugs** (#466, #467, #468, #470), **one
question for him** (#469), **four coverage gaps closed** (exporter scheduling, clip frame edges, group
transforms, and half of #470's own fix), **one safeguard built**, **sixteen probe/harness errors** caught
before they reached him.

**⚠️ THE LOOP IS OUT OF WORK IT CAN DO ALONE.** Thirteen ticks, 0 actionable throughout, list exhausted.
Say so plainly rather than manufacturing a fourteenth sweep.

**Waiting on Ezra:** 469 (one word), 432, 456, 460, 454 second half, 202, 387, 215, 250, 342, 391, 395,
429, 418, 223; the unnumbered **"Editing lags"** (all fixes in — open only until he says it feels better on
his device); **whether an animated reverb stutters while previewing on his phone**; and **392** — his
verdict on Text to Voice, plus the cloud-vs-record choice.

**392's wall, so no future tick re-litigates it:** `speechSynthesis` speaks to the speakers and exposes no
stream, media element, or graph node. There is NO supported capture route in any browser. No capture → no
audio layer → nothing in an export. The only two real routes are BYOK cloud TTS or record/import a
voiceover, and **both are decisions only Ezra can make.**
