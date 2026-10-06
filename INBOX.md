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

### 07 Oct 2026, ~03:35 AWST — #1085 note: the 8.7 GB was VmData (reserved address space), not resident memory — PM finding, NOT his words

The cloud helper ran the full suite in its own Linux container while sampling memory. Renderer RSS peaked at about 1.1 GB, and roughly 250-300 MB never came back, though that was measured without a forced GC. It "could not reproduce 8.7 GB".
The PM's check (`tools/design/pm/helper-batch2-verified.json`, hunts): your own commit ca74942c quotes the kernel line "VmData 8760119296 exceed data ulimit 8589934592". That is **reserved data, not resident memory**, so the two numbers don't contradict each other.
For #1085:
- (a) a guard built on RSS would miss this, and on the Mac RSS FALLS exactly when memory is short (pages get swapped out). Sample VmData on Linux, and on the Mac a footprint figure such as `vmmap --summary` / phys_footprint, or call performance.measureUserAgentSpecificMemory in-page with a forced GC.
- (b) "pools only grow" is true only of `_fxScratch`; the pool canvases resize to the exact size on every use.
- (c) the Mac's real problem tonight was swap pressure from everything at once: two AIs, test Chrome, Spotlight and the keychain daemons. Treat the suite's footprint as one contributor, not the whole cause.

### 07 Oct 2026, ~04:05 AWST — (hunt MEDIUM) Opening a file can freeze the app: measured by the cloud helper — PM note, NOT his words

The cloud helper's `hunt/import-robustness` report (`tools/design/hunts/import-robustness.md` on that branch) was **measured in a real browser**, not just read, against v17.23. The PM has not re-verified it, so reproduce each case before fixing it.
- **Freezes:** 100 layers × 20 glows froze the tab for over 60 s; 120 blurs took 25 s; 40k keyframes took 9 s; 80k path points took 10 s; a 500-project backup took over 60 s.
- **Shape checks:** 200 fonts were accepted with no cap. `project` given as an array was accepted. `project: "x"` silently produced an empty project.

These come in through opening a shared project, a backup or a template, or through Work-with-friends. The smallest fixes are caps on layers, effects per layer, keyframes, path points and fonts, refused with a plain message, plus shape checks in the sanitiser (see the whitelist-drift memory: refuse bad shapes, keep plain fields). Log as one hunt item.

Also on helper branches, for later (queue order, not now): `design/beginner-traps` (3 HTML options per trap, one recommended) and `design/tutorials-tab` (3 layouts; A, cards, recommended). Both are design work, so the pictures go to Ezra before anything is built (#545). The PM will render them and show him.

