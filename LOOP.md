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
10. **A picture assertion cannot police a cost.** Sixteen identical renders average back to the same
    image — that mutation survived until the expensive path was counted. If a fix has a cost, measure
    the cost, not the output.

## STATE — keep this current

**v11.26, suite 794 green. List: 41 open, 15 actionable.**

**In flight**
- **Per-effect-slider keyframes** (unnumbered, oldest actionable). Measured: the six rebuild-style audio
  params render at their START value; flipping `keyframable` would make the LAST keyframe win with
  diamonds that do nothing. Next step is the crossfaded shaper bank for Distortion, proven by tail RMS
  reaching ~0.98 while head stays ~0.35, then Bit Crush and Lo-Fi. Full design is in the entry.

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

**Waiting on Ezra — note, do not re-ask**
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
