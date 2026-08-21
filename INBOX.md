# Inbox — Ezra writes, Claude drains

Type requests here from your phone (GitHub app or github.com → this file → pencil → Commit).
**Nothing else writes to this file**, so you can never hit a conflict with work in progress.

Claude reads this at the start of every loop turn, moves anything found into REQUESTS.md
with a number, and empties the list below. If a line is still here, it has not been logged yet.

**No format needed.** One line, a paragraph, a screenshot description — whatever. Don't tidy it.

---

## ⛔ STOP — READ BEFORE STARTING THE NEXT ITEM (not a feature request, do not log in REQUESTS.md)

Ezra is away from the laptop, on his phone, steering from his OTHER FreeMotion session on this Mac.
He cannot see this session. He wants the loop PAUSED so he can watch and have input.
Direct messages to this session failed twice, so v11.13–v11.16 shipped unseen. Hence this file.

1. Finish ONLY the item you are on. Do not start another. Do not revert his work.
2. CronList → CronDelete every job → CronList again to confirm EMPTY. The cron is what makes this
   loop self-restart; stopping without deleting it does nothing.
3. Write HANDOVER.md (repo root), comprehensive, for a session with ZERO context: TL;DR; architecture
   map; the duplication trap (every rule that lives in two places — moveLayerToPlayhead vs moveClipTo,
   splitLayer vs the trim path, and the rest); the test suite and what green does NOT prove; release
   ritual; verbatim ./tools/next.sh; BUG-HUNT confirmed AND refuted; in-flight work; ranked open leads;
   Ezra's decisions and taste; traps; anything he said that never got logged.
4. CRITICAL — the 29 items you noted as needing his input: put ALL of them under a "NEEDS EZRA"
   heading, each with the real question and the options. He is on his phone and can answer them now.
   Do not compress this section. Include your LOOP.md / "continue" / blocking-question proposal too.
5. git push ssh main, verify HEAD == ssh/main. He reads it in the GitHub app.
6. Reply to the other session, then STOP. If something wakes you, don't resume — point at HANDOVER.md.
