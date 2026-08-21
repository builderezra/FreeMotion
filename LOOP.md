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

**Last shipped: v11.50** (queue 470). **This tick: nothing to build — verified the pipeline instead, and
recorded the live URL.** No code change, no version bump.

**0 actionable for the 14th tick. Inbox empty. Hunt list exhausted.**

**THIS TICK — verified, for the first time, that shipping actually REACHES HIM.** Fourteen ticks of
"pushed and verified" only ever proved `HEAD == ssh/main`; nothing had ever confirmed the deploy. It is
fine: <https://builderezra.github.io/FreeMotion/> serves **v11.50**, the live `js/storage.js` carries this
session's sanitisers and clamps, and `js/tts.js` (created this session) serves 200. So Text to Voice, the
reverb work and all four bug fixes are genuinely on his phone.
**The URL is now in CLAUDE.md** with the one-line check — nothing in the repo recorded it, so every
session had to guess or ask. Note that Pages lags a push by ~a minute, so a check straight after
`ship.sh` can legitimately show the previous version.

**⚠️ THE LOOP IS OUT OF WORK IT CAN DO ALONE — 14 ticks now.** The correct output for a tick with nothing
in it is ONE LINE. Do not invent a sweep; the enumerable list is done (all 27 audio effects; project
import; template AND element insert; undo/redo; the timeline at 60 min; live and export audio; the frame
loop; the service worker; clip boundaries; keyframe evaluation; the full 380px sweep for shape AND text
plus the text editor; group transforms at depth). A further hunt needs a genuinely NEW angle — fuzzing,
long-session memory, multi-tab, or a real-device report from him.

**Running tally across the whole run:** **four real bugs** (#466, #467, #468, #470), **one question for
him** (#469), **four coverage gaps closed**, **two safeguards built** (cache-buster gate, stale-summary
gate), **sixteen probe/harness errors** caught before they reached him.

**Everything now waits on Ezra**, and it is laid out for him at the TOP of REQUESTS.md as a table with
recommended defaults: 469, 460, 432, 456, 250, 395, 392, 387, 391, 342, 215; the unnumbered **"Editing
lags"**; **whether an animated reverb stutters while previewing**; plus the slower ones (95, 96, 98, 125,
129, 148, 179, 206, 361, 406, 418, 425, 429, 431, 454, the visual identity pass).
**He has also been offered the shortcut:** if he says the word, I ship the recommended defaults.

**392's wall, so no future tick re-litigates it:** `speechSynthesis` speaks to the speakers and exposes no
stream, media element, or graph node. There is NO supported capture route in any browser. No capture → no
audio layer → nothing in an export. The only two real routes are BYOK cloud TTS or record/import a
voiceover, and **both are decisions only Ezra can make.**
