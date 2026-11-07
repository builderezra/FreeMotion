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


### 7 Nov 2026, ~13:50 AWST: "Intro still laggy" (#1232 clause 1, his second report)
**His words (verbatim):** "Intro still laggy"
**Logger:** this is #1232 clause 1 again. Nothing has touched the intro since v18.23: v18.24–v18.26 carried other items, and v18.27 (Simple) doesn't touch it either. So "still" is expected, not a failed fix. The plan in #1232 stands: measure first, in a booted app under a 4x CPU throttle, the take's frame times against the app's long tasks after load. The suspect is the post-load restore and Home render running during the 2.92 s take.
❓ASK: should #1232 jump the queue and go next after v18.27? (He jumped the intro itself, #1231, with "I want it now so yes".) Until he says so, it waits its turn.
