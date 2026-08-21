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

## STATE — keep this current

**v11.42, suite 806 green. REQUESTS.md carries generated STATUS labels — `tools/status.sh`, refreshed by ship.sh.**

**In flight**
- **Per-effect-slider keyframes** (unnumbered, oldest actionable). **Three of six done** — Distortion
  Drive and Bit Crush Bits (v11.27), Lo-Fi Amount (v11.28), all via the crossfaded shaper bank in
  js/audio-fx.js (`curveBank`). Reverb Size/Decay rebuild an impulse response and Pitch Shift is a third
  mechanism again — **do NOT copy the bank to them**; they need their own answer or his say-so to drop.
- **#460 is the one to jump to if it reproduces** — see below.

**Newest in (21 Aug, from his phone — they WAIT their turn, oldest-first)**
- **#418 restated** — undo/redo icons: the ring-plus-triangle-head shape from his image, thinner stroke.
- **#455** — the speed slider jumps ~10x a step. Do not shrink the range (1000x is deliberate and
  tested); the range needs a log mapping so 1.5x is reachable.
- **#456** — the two rainbow Create buttons must differ in colour, both still animated, and the
  in-project one needs a better animation than a slow spin. Show him options with one marked recommended.
- **#429 answered** — "the cut-off point" is the track-head DIVIDER LINE, not the project end. The
  add-layer row's blue fill and its ⊕ must clip at it; bookmarks too. The 20 Aug photographs were all
  looking at the wrong place.
- **#457** — the export button was never meant to be rainbow; revert it. NOT the same as #456, which
  wants the two CREATE buttons rainbow. Do not conflate them.
- **#458** — 🚨 Save and Discard in the project's cog menu do nothing. Reproduce first and say what
  "doesn't work" means. Data-loss-shaped; tell him if it reproduces.
- **#459** — the open-project animation must be a SEQUENCE (card swipes left, THEN the project comes in
  from the right), not both at once. ⚠️ Fights queue 128, which split them ON PURPOSE to remove 113ms of
  dead time. Measure the total before and after and say so.

**Newest in (21 Aug, phone) — they wait their turn unless noted**
- **#460** — RESOLVED as a diagnosis: **nothing in Colouring is broken, 43 of 43 work.** A "four dead
  effects" report was published and RETRACTED the same session; the count went 9 → 6 → 4 → 2 → 0 and
  every drop was a blind spot in the probe, never a change to the app. His complaint still stands as a
  PRODUCT problem: on a flat magenta rect at default settings many effects show nothing (black shadows
  on a dark background, a red↔blue swap where red equals blue, glow with no highlights). **Waiting on
  him to pick: visible-by-default settings (recommended), or a note when an effect cannot act.**
  ⚠️ **RULE EARNED: a NEGATIVE probe result is a claim about the probe until proven otherwise. Only
  positives are trustworthy.** Never report an effect broken without a positive control proving the
  probe can see that kind of change.
- **#461** — an icon per effect category that suits its theme, replacing the meaningless gradients.
- **#462** — the FAVES notch becomes a real gold button.
- **#463** — filter sections like TUFF become one sideways-swiping rail, not two stacked rows.
- **#464** — filters get multi-select-then-Add. The effects browser already does this; reuse it.

**Waiting on Ezra — note, do not re-ask**
- **#250** — the slam's screen-breaking bug was fixed in v8.54 and re-verified 21 Aug (no scale in any
  keyframe, both guard tests green). Only his EYE is outstanding: trigger it once on the PC and say
  whether it still looks wrong.
- **#202** — one more perf readout **taken while playing**. The ladder is cleared (tested, v11.29) and
  his scene costs 163ms/frame on a fast Mac, so the slowness is workload, not a fault. His tier-0
  reading means the ladder was never consulted, which only happens on a sample taken while paused.
- **#387** — what was he doing in the 9.5s recording, playing or scrubbing? Measured: 96.2% of frames
  visually identical, a 1.10s freeze at 8.43s. The app IS stuttering; his report is confirmed.
- **#454 second half** — remove "Save whole look as preset…" entirely (recommended), or cut it to
  effects only?
- **#215** — the toast text if a silent export happens again. No toast + a silent file means the loss is
  in the muxer, the one region still without a witness.

**Tools worth knowing**
- `tests/_framediff.swift` turns any screen recording he sends into hard numbers. Chrome cannot decode
  iPhone HEVC; AVFoundation can. Build: `swiftc -O tests/_framediff.swift -o /tmp/framediff`.
- `tools/mutate.sh` refuses to run against a red tree and reports "caught, but not by the test you
  expected". It found a dead assertion in a test written the same hour.

**Corrections worth not repeating**
- MP4 frame BYTE SIZE is not visual change. Decode pixels. A wrong reading was published on that and
  retracted the same hour.
- A function only the tests call is not a seam, it is a decoration. `FM.drawTool._stop` was exported and
  exercised by three tests while nothing in the app ever called it.
