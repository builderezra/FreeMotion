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


### 14 Oct 2026, ~23:35 AWST — Ezra: go faster; use the weekly subscription up to near the Monday reset
**His words, verbatim:** "I think u are working too slow now, like i dont want usage gone before monday but atleast get close"

What it means:
- **It replaces his 13 Oct ceiling.** That was "Okay don't burn through my sub fully - slow it down if you have to", which gave ≤ ~80% at reset and ~8–9%/day.
- **The new target:** finish the week at roughly 90–95% of the weekly limit at the reset (Mon 19 Oct 16:00 AWST), without running out before it.
- **The pace from 33% on 14 Oct 23:35, with 4d16h left:** ≈ 12–13% per day.
- **The PM paces it.** It reads get_usage every tick and tells the builder to ease off only if it is heading past ~95% early.
- **Builder chat:** back to full pace now. Code-only fan-out in its own clone is allowed again (up to ~3 agents). New effects are un-paused.
- **When the API builder stops at its spend cap,** the builder chat becomes the full builder of ~/FreeMotion.

### 15 Oct 2026, ~01:15 AWST — PM: new helper/done branches (#966 §B; builder chat), plus one integration trap
**Built as code and pushed, not run yet** (each has its DONE line on helper/done):
- B33 Black & White Mixer
- B34 Graphic EQ (10-band)
- B31 Cartoon

B27 Venetian Blinds and B28 Radio Waves are finishing now. No more are being started: the PM cut the pace at 00:13.

**INTEGRATION TRAP:** apply `8a7b84dc` FIRST when landing any §B branch.
- That commit gives clarity a hazy inert frame and adds the B26 plate numbers. It touches tests.js only.
- It is NOT in the history of fb24f68b, the chain tip. fxnew-boom forked from 47735673.
- So boom, drums and every §B branch built on fb24f68b still carry the two-frame inert sweep, which goes red on Protect sky.

**Proven so far:** fxnew-all, fxnew-clarity and fxnew-boom.
**Drums:** the cymbal onset is missing in ba-dum-tss even at +7 dB. A 10-second envelope probe is queued for the next helper slot.

### 15 Oct 2026, ~00:45 AWST — PM: two more helper/done branches (#966 §B; builder chat). Built as code, not run yet
- B27 Venetian Blinds: `c2c95c83`
- B28 Radio Waves: `e72e16f9`

Both carry the pm29 trap, so apply `8a7b84dc` first.

The builder chat now works ONE agent at a time, to keep the weekly on his ~90–95%-at-reset pace (ez16).

### 15 Oct 2026, ~02:15 AWST — PM: more helper/done branches (#966 §B; builder chat)
**Built as code, not run yet:**
- B29 Lens Magnifier: `7c0c94d9`
- B30 Circle Array: `d93e2842`

**fxnew-drums:**
- The cymbal fix is `85b71929`: dum/kick brought down and the cymbal raised to 3, so the tss now sits at 1.5× the onset line, and "966 B22 Ba-dum-tss" passes in node.
- Its browser proof ran in the 01:31–02:11 slot. The verdict is still to come on helper/done.

**The helper's proofs now start the moment a slot appears** (scratchpad/slotqueue.sh, detached). The slot is handed back as soon as the queue can't fit the time left.
- In the last slot, bwmix ran out of time at 601 s and went back to the front of the queue with a 901 s estimate.
- The slot was returned at 02:10.

**Apply `8a7b84dc` first** to every §B branch (pm29).
