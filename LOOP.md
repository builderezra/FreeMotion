# The keep-working loop

Say **"run the loop"** (or just "continue"). Do not paste the rules — they live here now, so they cost
nothing to send and can be edited in one place.

## What went wrong with the pasted version (20 Aug)

- **It re-sent ~500 tokens every turn.** Small next to a screenshot, but pure waste over dozens of turns.
- **"Never stop to report" fought the medium.** A turn always produces output, so the report happened
  anyway — just apologetically. Worse, it discouraged saying "I am blocked on you", which is the single
  most valuable thing to say when 30 of 45 items need his answer.
- **It kept firing when there was nothing to do**, producing no-op turns that still cost quota.

## The rules

1. **Resume** anything mid-task before starting something new.
2. **Inbox first:** `./tools/inbox.sh` → move anything found into REQUESTS.md with a number → `--done`.
3. **Then `./tools/next.sh`** and take the lowest-numbered ACTIONABLE item. It classifies the list now —
   blocked, held, standing note, long-term idea — so this does not need re-deriving each session.
4. **If nothing is actionable:** bug hunt (his standing fallback). Pick a subsystem, prove each defect
   with a measurement, fix it, guard it. Record clean results too — a negative saves the next session a
   night.
5. **Do it properly:** read the real code first; suite on port 8777 with `timeout: 500000`;
   mutation-check every new assertion with `tools/mutate.sh`; a real screenshot at 380px if the UI moved
   (`tests/_shotlive.py` if anything animates — `_shot.sh` uses virtual time and never finishes a
   transition).
6. **Ship:** version label + `?v=` for every file touched, POLISH-LOG entry, tick REQUESTS.md,
   `tools/ship.sh "message"`.
7. **Questions do not block, but they DO get raised.** Record it in the entry AND say it plainly in the
   reply. Carry on with everything that does not depend on the answer. Never sit silently on a blocker.
8. **When the queue is genuinely empty and the inbox is empty, say so in one line and stop.** Do not
   manufacture work to satisfy the loop — that is churn, and it costs review attention as well as quota.
