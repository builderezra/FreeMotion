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

**Last shipped: v11.50** (queue 470). **This tick: no code change — the bottleneck was addressed instead.**
Suite **816/816 green**, pushed and verified.

**0 actionable, hunt list exhausted (13 ticks).** So this tick used the OTHER half of his standing
instruction (queue 260): *"Also look for potential ideas and things to do."* The most valuable thing
available was not another sweep — it was making his 28 pending decisions actually answerable.

**WHAT CHANGED:**
1. **The top of REQUESTS.md is now "WHAT I NEED FROM YOU"** — a table of the 11 fastest questions, each
   with a recommended default, plus the two only his phone can answer. It replaces a **stale handover from
   18 Aug** that had been sitting there for four days quoting v9.94, "659 tests green", "70 items open",
   a next-actionable item that had long since shipped, and tooling (`tools/inbox.sh`) that no longer
   exists. That block is the first thing he opens, and it was lying to him.
2. **ship.sh now REFUSES if that summary's version stamp is behind the build.** Prose has no test, which
   is exactly how the last one rotted unnoticed. Proven both ways. Recorded in CLAUDE.md beside the other
   safeguards.

**⚠️ ONE ERROR CAUGHT IN MY OWN SUMMARY BEFORE IT SHIPPED:** I wrote "28 items open" when 28 is the number
WAITING ON HIM and 33 are open. Corrected. Writing a summary for him is exactly where a sloppy number does
the most damage, because it is the one thing he actually reads.

**HUNT LIST: EXHAUSTED.** Every door and panel enumerated has been swept — all 27 audio effects; project
import; template AND element insert; undo/redo; the timeline at 60 min; the live and export audio paths;
exportFitRect and the frame loop; the service worker; clip frame boundaries; keyframe evaluation; the full
380px sweep for shape AND text layers plus the text editor; group transforms at depth.
**A further hunt needs a NEW angle** (fuzzing, long-session memory, multi-tab, or a real-device report),
not another item off this list. Do not manufacture one.

**Running tally:** across thirteen hunts — **four real bugs** (#466, #467, #468, #470), **one question for
him** (#469), **four coverage gaps closed**, **two safeguards built** (cache-buster gate, stale-summary
gate), **sixteen probe/harness errors** caught before they reached him.

**⚠️ THE LOOP IS OUT OF WORK IT CAN DO ALONE.** Say so plainly each tick rather than inventing a sweep.
If a tick genuinely has nothing, ONE LINE is the correct output.

**Waiting on Ezra** — now listed for him at the top of REQUESTS.md with recommended defaults:
469, 460, 432, 456, 250, 395, 392, 387, 391, 342, 215; the unnumbered **"Editing lags"**; **whether an
animated reverb stutters while previewing**; and the slower ones (95, 96, 98, 125, 129, 148, 179, 206,
361, 406, 418, 425, 429, 431, 454, the visual identity pass).

**392's wall, so no future tick re-litigates it:** `speechSynthesis` speaks to the speakers and exposes no
stream, media element, or graph node. There is NO supported capture route in any browser. No capture → no
audio layer → nothing in an export. The only two real routes are BYOK cloud TTS or record/import a
voiceover, and **both are decisions only Ezra can make.**
