# INBOX

Append requests below the divider. The building chat drains it: each entry moves into REQUESTS.md with a
number, then `tools/inbox.sh --done` removes only the lines it was shown, so anything added mid-drain stays.
The divider is the line of three dashes below. Keep that exact line out of this header prose: on 20 Sep
the old drain cut the file at the first three dashes in the header, and the inbox was blind for six days.

WHO WRITES HERE: Ezra from his phone, and the LOGGING CHAT (his arrangement, 26 Sep). The logging chat
writes one block per message he sends it:

    ### <date, time AWST> — <short title>
    **His words (verbatim):** …exactly what he typed, typos and all…
    **Logger's plan (not his words):** a READY-TO-BUILD plan: where in the code, the exact change,
    options already drawn/rendered (and his pick, when he has made it in the logging chat),
    measurements already taken, the test that proves it, and any question left (as a `❓ASK:` line).
    Big plans live in tools/design/plans/ and the block links them.

BUILDER: move the WHOLE block into the REQUESTS.md entry. His words go in as the verbatim quote and get
split into his numbered clauses as usual. The plan goes under them, labelled as the logger's plan.
Follow it; if the tree has moved and a step no longer fits, say so in the entry rather than improvising silently. Design requests still get drawn options before anything ships
(#545), and the queue order is unchanged: log it at the bottom and it waits its turn.

---


### 18 Oct 2026, ~12:15 AWST — Ezra: go overtime and use the whole weekly before the reset
**His words, verbatim:** "alright get builder working overtime now, weeks about to reset. burn all usage in smart ways tho"

What it means:
- **It replaces the 90–95% ceiling from his 14 Oct message** (ez16). The new target is about 100% of the weekly at the reset (Mon 19 Oct 16:00 AWST), used on work that is worth something.
- **The pace from 84% at 12:15 on 18 Oct, with 27.8 h left:** about 0.575% per hour, against roughly 0.4%/h for the 95% target.
- **Builder chat:** two code-only agents in parallel, and a third when the weekly is a point or more under the new line. The first runs the #966 options rounds. The second runs a bug hunt with refuters over everything shipped since v17.50. The third takes the next LAND-LIST item, or a Simple Phase 3 part that needs no pick from him.
- **The PM paces it.** It reads get_usage every tick and trims back to one agent if the weekly runs more than a point over the line.
- **"Smart ways":** no padding. Every agent works on something that ships, or that finds real defects (findings must survive a refuter).
