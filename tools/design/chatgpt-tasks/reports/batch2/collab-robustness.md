# FreeMotion live collaboration robustness review

Reviewed the committed `main` tree at `28104a3e` in `/private/tmp/freemotion-collab-robustness`. I read REQUESTS.md #921, #967, and #971 first and searched every `audits/*.json` for collaboration robustness coverage. #971's delayed reconnect delivery is recorded as fixed in v17.12, so it is not repeated here. The broad #921 work also records fixes for ordinary offline-operation replay; the first two findings below concern the separate Undo/Redo append path.

This was a source review, not a live two-device reproduction. Code paths and quoted lines are confirmed; outcomes marked **UNVERIFIED** need a runtime reproduction.

## Findings

### 1. Offline Undo/Redo replays without the host's stale-edit check

**Scenario and user-visible result:** A guest/editor loses the link, undoes or redoes an edit while offline, and the owner changes the same property before the guest reconnects. The guest's Undo/Redo entry is queued without `queued: true`. On reconnect, `flushOutstanding()` therefore sends it with `q: 0`; the host runs compare-and-set only for `q === 1`. The stale inverse can overwrite the owner's intervening change, so one person's edit disappears without a clash warning.

**Evidence:** `js/collab-session.js:1215-1220` — “`outstanding.push({ cid: S.cid, ops: ops, sent: false });`”. The shared sender at `js/collab-session.js:348-353` sets `q` only from `e.queued || e.replay`. The host guards CAS at `js/collab-host.js:873-876` — “`if (tx.q === 1) { const c = cas(op);`”.

**How to trigger:** Pair two devices with the guest as Editor. Disconnect the guest, make a change and undo or redo it there, change that same property on the owner, then restore the guest's connection. **UNVERIFIED:** the stale overwrite is implied by the confirmed `q` path; it was not reproduced in a browser.

**Severity:** High, because a peer's newer project change can be replaced. **Likelihood:** Low to medium; requires an offline interval plus overlapping Undo/Redo and owner edits. **Confidence:** High in the missing flag and conditional; medium in end-to-end manifestation.

### 2. Offline Undo/Redo bypasses the outbox size and read-only limits

**Scenario and user-visible result:** During a long outage, a guest repeatedly undoes/redoes large grouped edits. `runStep()` appends transactions directly to `outstanding`, but does not increment `outboxOps`/`outboxBytes` or run the cap check used by `pushLocal()`. The intended 5,000-op / 4 MiB cap can therefore be exceeded through Undo/Redo without the “Too many offline changes” read-only state. A very large backlog may consume phone memory and take a long time to send after reconnection.

**Evidence:** The direct append is `js/collab-session.js:1215-1220` — “`outstanding.push({ cid: S.cid, ops: ops, sent: false });`”. The cap is only applied in the normal path at `js/collab-session.js:296-305` — “`outboxOps += ops.length; outboxBytes += canon(ops).length;`” and the limit is `js/collab-core.js:75` — “`OUTBOX_OPS: 5000, OUTBOX_BYTES: 4 * 1024 * 1024`”.

**How to trigger:** On a guest device, disconnect, then undo/redo many large grouped operations (for example, operations affecting many layers) before reconnecting. **UNVERIFIED:** no runtime stress run was made; the separate append path and absent accounting are visible in source.

**Severity:** Medium. **Likelihood:** Low; requires a long outage and unusually large/repeated undo batches. **Confidence:** High in the bypass; medium in practical memory or delay impact.

### 3. The busy/frozen document-message queue has no visible bound

**Scenario and user-visible result:** While a guest is busy or frozen (for example, during a long export or operation), incoming document/control messages are appended as whole objects to `msgQueue`. There is no cap or coalescing at this insertion point. If updates keep arriving, the guest can accumulate stale work and memory; once the busy period ends, the queue drains in a burst and the screen may catch up late or stall.

**Evidence:** `js/collab-session.js:117` — “`const msgQueue = [];`”; `js/collab-session.js:815-817` — “`if ((frozen() || busy()) && msg.t !== 'welcome') { msgQueue.push({ kind: 'msg', msg: msg });`”. The queue is drained only when the session ticks and is no longer busy, at `js/collab-session.js:1282-1290`.

**How to trigger:** Keep a guest in a long-running busy/frozen operation while the owner makes frequent edits on a large project, then watch queue length and memory until the operation completes. **UNVERIFIED:** I did not measure growth or confirm which app operations keep this predicate true long enough; the source queue itself has no local maximum.

**Severity:** Medium. **Likelihood:** Low; requires sustained incoming edits during a long busy window. **Confidence:** High that this queue insertion is uncapped; low to medium on user-visible memory impact without measurement.

### 4. Shared-comment “time ago” labels depend on two devices’ wall-clock agreement

**Scenario and user-visible result:** The host stamps shared comments using its local clock, while each viewer computes “minutes ago” using its own local clock. If the host clock is significantly ahead, a guest can see “just now” for an unexpectedly long time; if it is behind, a new comment can appear old. This does not change the collaboration order or comment contents.

**Evidence:** `js/collab-host.js:532-533` — “`v.by = authorOf(m); v.at = now();`”; `js/collab-comments.js:79-85` — “`const m = Math.round((Date.now() - (+at || 0)) / 60000);`” and negative elapsed time returns “just now”.

**How to trigger:** Set the host device clock several hours ahead of a guest device, post a comment, and inspect its age on the guest. Repeat with the host clock behind. **UNVERIFIED:** no clock-skew device test was run.

**Severity:** Low. **Likelihood:** Low; requires notable device clock skew. **Confidence:** High in the clock-source mismatch and calculation; medium in what the user sees at a given skew.

## Reviewed scenarios with no additional finding

- **Phone sleep or signal loss:** the code marks a disconnected path, keeps a bounded reconnect schedule for link-based members, holds document/media sends while the RTC path is down, and treats #971's prior long retransmit delay as fixed. A guest who joined only with a swap code has no automatic rendezvous and is told to obtain a fresh code; that is the documented limitation, not a new finding.
- **Owner leaving:** links are ended/paused and guest copies remain local; reconnect requires the owner to resume sharing. No new source-supported loss was found in this pass.
- **Large projects and slow links:** project/layer, transaction, transfer, and catch-up limits exist. The four findings above describe the remaining code paths I could support without duplicating recorded findings.
