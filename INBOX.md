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


### 18 Oct 2026, ~18:45 AWST — PM decision under his 11 Oct rule: fix the Full split bugs (#1176 #4, #7, #8) through the lock's instrument-change route
**Context:** bug hunt 2 (#1176) found that Follow, Luma Matte, masks and effect sources freeze on the first half after a split (#4, #8). It also found that at 50/60/120 fps the first or last frame can't be split and the toast is wrong (#7). Fixing these moves lines that the Full-unchanged lock's self-test plants anchor on. DESIGN.md:1262 said B4 (the Follow case) "waits for his own yes as its own item".

**Decided, not asked.** His 11 Oct words: "these are obvious fucking questions that should not need me … I do NOT GIVE A FUCK ABOUT MY OLD PROJECTS". His 1 Oct "i dont want the original editor changing in design and function" was about Simple work leaking into Full. That is what the lock guards. It was never a request to keep Full's bugs. The DESIGN.md "waits for his yes" note was the team's own caution, not his words.

**Route:**
1. v17.72 ships the five fixes that touch no anchored line (#1 undo during a split's load, #3 group/align moves, #2 emoji wrap, #5 paste-keyframe dedupe, #6 locked members in a group drag), with the plants file at v17.71's exact bytes.
2. Then an INSTRUMENT-CHANGE release: the re-anchored plants alone, with its ~3 h full-unchanged PASS. Matte and Follow plant the old id-only lookup, so the lock still goes red by name if Full ever regresses.
3. Then v17.73: #4, #7 and #8.
