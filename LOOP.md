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

**Last shipped: v11.48** (queue 467). **Second hunt in a row that found NOTHING BROKEN** — recorded as a
result, not padded into one. No version bump, no app code changed this tick.

**0 actionable → BUG HUNT** (his standing instruction, queue 260 verbatim: *"When you finish the last
thing, do a bug and issue hunt. Also look for potential ideas and things to do."*). Findings get their OWN
numbered entry. **No findings means no entry** — never file an entry that says nothing.

**HUNT LOG — swept and CLEAN, do not re-check blind:**
- **All 27 audio effects** (v11.47 tick): offline, static AND every param animated min→max. No throws, no
  NaN, no silence. Proves v11.45's whole-window hook disturbed none of the other 26.
- **Project import, hostile files** (v11.48 tick): prototype pollution, remote / `javascript:` fillImage,
  prototype-chain effect types, the 2000-layer refusal — all clean. FOUND **#467**.
- **Undo / redo across the four newest features** (prev tick): TTS settings, split stairs, toggle-then-Add
  filters, audio-effect keyframe diamond. All correct both directions.
- **The queue-217 gate, VERIFIED not trusted** (prev tick): `reIdLayers` really is the single door, so
  #467's fix covers template insert, element insert and project duplicate too.
- **Timeline at 10 s / 10 min / 60 min** (prev tick): no throw, no unbounded DOM, sane scroll extent.
- **THE LIVE AUDIO PATH — all six newly-keyframable params** (this tick), driven through `applyAt` exactly
  as the app drives it, on a real connected AudioContext: reverb's room follows the playhead (0.5 s → 6 s,
  ONE convolver — the bank is correctly export-only); pitch's delay line tracks to four decimals
  (0 → 0.0414 → 0.1 against predicted 0.0414 / 0.1); distortion, bit crush and lo-fi each build their bank
  when animated and **none** when static. Also confirmed structurally: `schedule()` is called ONLY by
  `exporter.js`, so the reverb's offline-vs-live quantum split cannot leak between paths.

**STILL UN-SWEPT — start here next tick:** `exporter.js`'s own per-clip wiring end-to-end (the chain's
audio is verified, the exporter's assembly around it is not); a hostile TEMPLATE PACK through the real
insert UI (the data path is verified, the UI path is not).

**⚠️ NEW PROBE TRAP, now BUG-HUNT.md §8d — and the control rule caught it one tick after being written.**
A Web Audio node not connected through to `ctx.destination` is never processed, so `AudioParam.value`
never advances and reads as the construction-time default — identical to broken automation. A live pitch
probe read a flat 0 and looked like a dead feature; connected through a zero-gain sink it read exactly
right. The near-miss: `ctx.currentTime` DOES advance in a hidden pane, so the audio clock looks healthy
and invites the wrong conclusion. **What saved it was running a KNOWN-GOOD parameter through the identical
probe** — Echo/Delay's `time` read stale too, which proved the probe blind rather than the code.

**Running tally, said plainly:** across four hunts — **two real bugs** (#466, #467) and **seven probe
errors** caught before they reached him. Expect roughly half of what a hunt "finds" to be the probe.

**Waiting on Ezra — still the bottleneck:** 432, 456, 460, 454 second half, 202, 387, 215, 250, 342, 391,
395, 429, 418, 223 follow-ups; the unnumbered **"Editing lags"** (all fixes in — open only until he says it
feels better on his device); **whether an animated reverb stutters while previewing on his phone**; and
**392** — his verdict on Text to Voice, plus the cloud-vs-record choice.

**392's wall, so no future tick re-litigates it:** `speechSynthesis` speaks to the speakers and exposes no
stream, media element, or graph node. There is NO supported capture route in any browser. No capture → no
audio layer → nothing in an export. The only two real routes are BYOK cloud TTS or record/import a
voiceover, and **both are decisions only Ezra can make.**
