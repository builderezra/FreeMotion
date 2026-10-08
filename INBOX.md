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


### 08 Oct 2026, ~15:40 AWST — A working Glow Scan that pauses between sweeps is told it "changes nothing" (hunt MEDIUM #1)
**His words (verbatim):** none — a finding from the helper's intermittent census (H52), NOT his words.
**Logger's plan (not his words):**
- **What happens.** A Glow Scan with `{"pause":5}` on a 10 s clip is measured as `unknown`: every moment the does-nothing check samples lands in the pause. The panel then tells him a working effect changes nothing.
- **Where seen.** Red in the census's NORMAL 380 pass and its background-load 1280 pass (tree 5fe2deb0, branch `hunt/intermittent-census`, files `h52_pass_N380_s3.txt` and `h52_pass_L1280_s3.txt`). Green on the laptop, so it depends on timing.
- **Exact message.** "482 6.7 Glow Scan … a Glow Scan with {"pause":5} on a 10 s clip is measured as unknown - its sweep falls between the moments the check looks at, so the panel tells him a working effect changes nothing".
- **Where to look (the builder's read, 15:35).** `noopTimes` in js/fx-thumbs.js (`NOOP_SPREAD` plus `FM.fxNoopMoments`).
  - Check whether the sampled moments can all fall inside Glow Scan's pause window at pause 5 on a 10 s clip.
  - Fix options: Glow Scan supplies its own sweep moments through `FM.fxNoopMoments`; or an effect whose output depends on time with a pause reports `unknown` and never a no-op verdict.
- **Test.** The existing "482 6.7 Glow Scan" test must go red with the fix reverted under a slow clock or an offset first sample, which would make it deterministic, not dependent on timing. It must also still call Strength 0 a no-op.

### 08 Oct 2026, ~15:40 AWST — Under load the "changes nothing" hint goes silent, so its CONTROL tests go red (hunt LOW #3)
**His words (verbatim):** none — H52 census finding, NOT his words.
**Logger's plan (not his words):**
- **What happens.** Under 2x CPU throttle (T1280, T380) and background load (L1280), the does-nothing check gives no verdict even on effects that truly do nothing.
  - "690 a Spin added at the start of its clip…": "CONTROL: a Spin at speed 0 … got no changes-nothing line after 1.3 s — the check is not running here".
  - "482 6.7 Glow Scan": "CONTROL: a Glow Scan at Strength 0 is not measured as doing nothing".
  - "an effect that changes nothing on this layer is detected (queue 477)" and "794: the does-nothing-here probe…": "Channel Remap … the check said null (three times)".
- **Root cause (the builder's read, 15:35).** By design, `noopAt` in js/fx-thumbs.js drops any probe render over `NOOP_BUDGET_MS = 45` and returns null: "a hint that is absent on the heaviest effects is a fair price; a stutter is not". So on a slow phone the hint simply does not appear, which is the intended behaviour. v17.26's 477 fix (ask again while null) helps a cold first render but not a throttled machine, where every try is over budget.
- **Fix (test side, plus one tiny seam).** Add `FM.fxThumbs._noopBudget(ms)`, restored in `finally`. The four CONTROL tests lift the budget while they check the VERDICT, because they test correctness, not speed. Mutation-prove it. App behaviour is unchanged.

### 08 Oct 2026, ~15:40 AWST — A mouse flick that stalls just before release does not glide (hunt MEDIUM #2)
**His words (verbatim):** none — H52 census finding, NOT his words. It may be his own "not always" on glide (#715).
**Logger's plan (not his words):**
- **What happens.** Under 2x CPU throttle (T1280 and T380, `h52_pass_T*_s0.txt`), "glide (#715): a mouse flick glides…" fails with: "A: a mouse flick that stalled for two samples before the click released did NOT glide ({"radius":30.5} stayed) — the release velocity is still the last sample, not the last 100ms; this is the "not always"".
- **Cause.** The release velocity comes from the last pointer sample rather than the last ~100 ms. When the pointer event rate drops (a slow or busy machine), a real flick reads as a stop.
- **Fix.** Compute the release velocity over a time window, about the last 100 ms of samples, ignoring a final zero-movement sample. Keep "a parked pointer does not fling" and "fine mode never glides" true.
- **Test.** The existing #715 test's stalled-release case, run under a throttle or with a synthetic 2-sample stall, must be red with the fix reverted.

(Also seen once each in the throttled 380 pass, not logged as items:
- the sheet preview: "a previewed Invert changed nothing on the canvas (217,39,38) — the preview stack is not reaching the frame". Watch for a repeat.
- fxBounds 29.2 ms on 1080x1920 against its 3.2 ms budget, which is the throttle.
- 921 S3 Stop sharing is red in 4 of 5 container passes but green on the laptop, so the container is the cause.)
