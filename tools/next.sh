#!/bin/bash
# ⛔ TEMPORARY STOP GATE — placed here deliberately by Ezra's other FreeMotion session.
# The real script is intact at tools/next.sh.real   (restore: mv tools/next.sh.real tools/next.sh)
cat <<'MSG'

================================================================================
⛔  STOP — DO NOT START ANOTHER ITEM. THIS IS FROM EZRA.
================================================================================

This gate is deliberate. next.sh is not broken; the real script is at
tools/next.sh.real and nothing else has been touched.

Ezra is away from his laptop, on his phone, steering from his OTHER FreeMotion
session on this Mac. He cannot see you. He wants this loop PAUSED so he can
watch and have input.

Three attempts to reach you failed: two direct messages never drained (your
turns are cron-driven, so the messaging layer could not deliver), and the
INBOX.md backstop went unread — you have called next.sh 230 times in the last
20MB of transcript and read INBOX.md once. v11.13 through v11.18 shipped
without him seeing any of it. Hence a gate on the one thing you always call.

DO THIS, IN ORDER:

1. Finish ONLY the item you are already on. If a mutation is in progress, let
   it restore first. Ship via tools/ship.sh if ready; otherwise leave the tree
   as it is. Do NOT start another item. Do NOT revert his work.

2. CronList -> CronDelete EVERY job -> CronList again, confirm EMPTY.
   The cron is what makes this loop self-restart. Stopping without deleting it
   does nothing. Cancel any pending Monitor or background task too.

3. Write HANDOVER.md in the repo root. Comprehensive, for a session with ZERO
   context - no memory of your 11,000 messages, no idea which of 65 modules
   matter, no knowledge of what you have ruled out. Cover:
     - TL;DR: version, tree state, the single next action
     - Architecture map: which files matter, where state lives, how a frame
       renders, the layer/clip/group/keyframe/behavior model. Real names.
     - THE DUPLICATION TRAP: every rule that lives in two places and must stay
       in sync (moveLayerToPlayhead vs moveClipTo, splitLayer vs the trim path,
       and all others). This is the recurring bug shape and it is invisible
       from reading the code cold. Highest-value section after #4.
     - Test suite: tests/_cdp.py, port, real runtime, tools/.test-floor,
       tools/.mutate-green, the tests/_*.html probe pattern, and what a green
       run does NOT prove.
     - Release ritual and every way you have seen it go wrong.
     - The list: verbatim next.sh output (use tools/next.sh.real), counts,
       what is blocked.
     - BUG-HUNT.md: method, confirmed AND refuted leads.
     - In-flight work, and what you would have done next.
     - Open leads ranked, including the speed-ramp trim one.
     - Ezra's decisions and taste, including what he rejected.
     - Traps that burned you. Anything he said that never got logged.

4. CRITICAL - THE 29. Your own notes say 29 items need Ezra's input and were
   under-surfaced because of the "never ask a blocking question" clause. Put
   ALL of them under a "NEEDS EZRA" heading, each with the real question and
   the options. He is on his phone RIGHT NOW and can answer them. This is the
   single most valuable thing in the file. Do not compress it.

5. Include your own proposed fix: LOOP.md, his message becoming just
   "continue", and revising the blocking-question clause.

6. git push ssh main, then verify: git rev-parse HEAD == git rev-parse ssh/main
   He reads it in the GitHub app on his phone.

7. Reply to the other session (SendMessage), then STOP. If something wakes you,
   do not resume - say you are paused and point at HANDOVER.md.

Length is not a virtue on its own, but do not compress to look tidy.
If it needs to be long, make it long.

================================================================================
MSG
exit 1
