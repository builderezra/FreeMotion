# Release 2.6: the live session, finished (S6)

Branch with the code: `hunt/simple-2.6` (on top of `hunt/simple-2.5b`). Patches and scripts: `scripts-2.6/` (`2.6-src.patch` 11 files, `2.6-tests.patch`, `s6_mut.sh`). Labels: Verified = ran it here (Chromium 141, Linux container, fake network only), Read = read in code, Guess = not checked. All collaboration tests use `withCollab921` (a real host session and headless guests over a manual loop link, `iceServers: []`); nothing opens a socket.

Source of truth for the rows: BUILD-PLAN-PHASE2.md section 8, DESIGN section 3.7, 3.11 (the `live`, `away`, `offline` rows), 5.3, 10.1, 10.2, 11.

## 1. The eight pieces, as built

| Piece | Where (on `hunt/simple-2.6`) | What it does |
|---|---|---|
| **Arrange anyway** | `js/collab-ui.js` `waived`, `pruneWaived`, `U.roomEditors` (now skips waived), `U.offlineEditors`, `U.waiveOffline`; `js/spine-edit.js` `S.liveInfo`, `S.arrangeAnyway`, `refuse('live')` | The owner's line says *"Sam is offline · clips stay put"* with ONE button, **Arrange anyway**; it asks *"Anything Sam changed offline may land in the wrong place."* and on yes the offline remembered editors stop counting **for this session**. `waived` is emptied at every arm and at the end, and a waived rid that reconnects is pruned (lazily, by whoever asks), so the gate shuts again. Two or more offline: *"2 others offline · clips stay put"* + **Options ›**. |
| **Make Sam a Viewer** | `U.setMemberRole(midOrRid, role)` in `js/collab-ui.js`; `S.makeViewer`; `S.liveInfo` | One path for the People menu (now calls it) and the Simple line. It does `setPeerRole` THEN `noteRole` (the persisted row the gate and the reconnect read), then redraws. A dropped member has no mid, so only its row changes. The `live` line has one **Options ›** button whose menu holds *Make Sam a Viewer* and *Open in Full* (two or more editors: *Who can edit ›*, which opens the people list, and *Open in Full*). If Sam is typing, dragging, animating or holds a lease (`PZ.busyWith(mid)`, new, read-only) it asks first: *"Sam is typing · make Sam a Viewer anyway?"* / *"Sam's unsent change will be undone."* Never one tap. `simple-timeline.js` hands the pressed button's box to its handler so the menu opens beside it. |
| **`U.leaveKeep(pid, onConfirm)`** | `js/collab-ui.js`, before `drawLinkedPanel`; `refuse('offline')` | The Leave route of a linked copy as one function: the `LEAVE_KEEP` confirm, the `ended: 'left'` mark BEFORE the copy is made (a copy that cannot be finished is still never dialled again), `detachLinked`, the two sentences. The Friends card's Leave now calls it; the `offline` line on a linked copy shows **Make it my own** (**Mine** under 700 px). A live guest session takes the full `leaveKeeping` route (room check, "Leaving…"). |
| **Undo labels and the soft line** | `js/history.js` `stepDone`, `FM.history.lastStep`; `js/collab-session.js` `runStep` wrapper, `S.lastStep`, `closeStep` keeps `label`/`ed`; `js/collab-core.js` `C.lastStep`; `js/spine-edit.js` `S.undoSaid` | `FM.history.undo/redo` return `true`/`false` on every path (the solo path returned `undefined`) and set `FM.history.lastStep = {label, ed, arr, soft, who, adoptKept}` (null on false). Redo keeps the name. A soft skip in Simple: no toast, ONE `#sm-say` line *"Undid, except what Sam changed"* (+ **Close gaps** for an arranging step, full wording in its title); in Full, today's toast word for word. |
| **Lease half of undo's pre-flight** | `js/collab-session.js` `runStep0`, after the per-op filter and before `invertStep`; `S.blockersForLayers`, `S.undoBlocked` in `js/spine-edit.js` | For every step with `ed: 's'` while a session runs: if it has an `li`/`lr` op or writes more than one layer, someone else holding any of those layers refuses the whole undo with the busy line (*"Sam is editing 'Clip 1' · try again soon"*; Full: *"Can't undo — it has changed since"*), step put back unconsumed, nothing sent. |
| **Q29** | `js/collab-session.js` `onAck`, `wholeRefused`, `simpleSay`, `onClash` | A `'*'` refusal of a Simple-tagged tx (only those: `entry.ed === 's'`, set in `closeStep` from `meta.ed`) resyncs at once, says *"That change couldn't be sent to your friends, so it was put back."* (Simple: `#sm-say`; Full: toast) and drops every undo/redo step whose `cids` include the acked cid. A per-op `'limit'` refusal says *"Part of that change was too big to share, so it was put back."* A Full tx keeps today's handling. |
| **The `li` mask** | `js/collab-diff.js` `maskLayer`, the `li` rec stores `after` (masked) and `afterRaw`; `runStep0` compare | `kb`, `by` and the `sm` membership keys (`main stay tail tailEnd twin muteByMode snd cut`) are dropped on both sides, `start` still compared. If the mask hid a real difference the add is still taken back and counts as soft, so it is said. |
| **`S.othersSeq` / `st.adopt`** | `js/collab-session.js` (`othersSeq` counted in `applyIncoming`, `closeStep` stamps `seq`/`adopt`, `preSessionStep` stamps `seq = 0`, `adoptHit`); `js/spine-edit.js` runner passes `meta.adopt` | Adoption is not undone once anyone else wrote since, in a session or after one (it does not look at `S.active`). The edit it rode on still undoes and the line adds *"· the main track stays as set up"*. `adopt()` now also reports `sm/tailEnd`. |
| **Host clamp of `project.sm.v`** | `js/collab-bridge.js` `invariants().project` | `p.sm.v > FM.SM_V` becomes `FM.SM_V` on the host. The fingerprint reads `_clampProjectDims`, not this, so there is no `SCHEMA_REV` change (Read). |

## 2. Tests (10, `simple P2.6 · S6a ... S6i`, all `{ item: '980' }`)

| Test | What it proves | Fake network |
|---|---|---|
| S6a | connected line, drop, the *offline* line with only Arrange anyway, Not now keeps the gate, confirm waives, delete goes through, Sam back un-waives, second drop is a new question | host + one guest |
| S6b | Options menu holds exactly the two items, typing question (Not now / yes), role saved in the room AND the host, People-menu path, row (rid) path while connected and when dropped, bad role refused | host + one guest |
| S6c | linked copy: line and button (Mine at 380), Cancel runs nothing, yes runs `patchCollab(left)` then `detachLinked`, gate false after | none (stubs on `FM.projects`) |
| S6d x2 | solo and session true/false/lastStep/redo name/Full step; soft line in Simple (no toast, title) vs Full's toast | host + one guest |
| S6e | undo of a split refused while Sam holds A (nothing changed, nothing sent, step kept, busy line), whole once the lease is gone, a Full step never meets it | host + one guest |
| S6f | a real oversize tx refused whole by the host: line (Simple) / toast (Full), resync sent, screen reverted, undo step dropped; control: a Full step says nothing | host + guest, real refusal |
| S6g | `maskLayer` unit, then an add undone after Sam pinned it (taken back and said), content rename still refused | host + one guest |
| S6h | first arranging edit adopts, Sam writes, undo leaves adopted and says so; control: nobody writes, undo takes it all back | host + one guest |
| S6i | `invariants().project` clamp, then a newer guest's `sm.v` through the host | host + one guest |

## 3. What was run (Measured)
| run | result |
|---|---|
| the 10 on the 2.5b tip (`wt-s6red`, new tests, old source), 1280 | **0/10**. S6e, S6f, S6h, S6i, S6d and S6g are red by behaviour (undo ran, guest told nothing, un-adopted, clamp absent, `undefined` return, `maskLayer` missing). **S6a and S6b are red only through the `U._testRoom` seam**, which does not exist on the tip; their behaviour is proven by mutations M1 to M4, M17, M18 |
| the 10 on 2.6, 1280 and 380 | **10/10** at both |
| mutations (`scripts-2.6/s6_mut.sh`, 18) | **18 of 18 caught.** One survived first: M3 (drop `noteRole` in the connected-row branch of `setMemberRole`), because the Simple line passes a mid, not a row; S6b now also drives the row path while connected, M3 and M18 (the mid branch) are both caught |
| `?only=simple`, 1280 and 380 | **135/138 + 3 finger tests NOT RUN in a plain pass** (the same three as 2.5b; they pass under `FM_TOUCH_PAGE=1`, see BUILD-PLAN-PHASE2-2.5b.md) |
| `?only=921` (253 collaboration tests), 1280, 2.6 vs the 2.5b tip | **identical: 247/253 + 2 NOT RUN on both.** The six reds are the same on the tip, so 2.6 adds none: `duplicateFrom` (no project doc in the fixture), `Stop sharing revokes the code` (green alone, red in the full pass, on the tip too), `splash.mp4` (no decoded video here), `a shared copy finds its owner` (re-offer 3,024 ms, here), and two QR tests (no `BarcodeDetector`). A first pass of 2.6 had two more reds that WERE mine and are fixed: the seam guard that reads `history.undo`'s text (I had changed `return ok; }`) and the guard on the names `FM.collab` may carry (`lastStep`, now listed) |

## 4. Not built, not run, and calls I made
- **Seam, not the sheet.** S6a and S6b build the member table with `U._testRoom` (a suite seam added in `js/collab-ui.js`) instead of admitting Sam through the Share sheet, because admission needs real link auth. The admission code (Read, `js/collab-ui.js` around `rec.mid = mid; ridMid[rid] = mid`) is where a reconnect un-waives, and I did not drive that path; the test moves `ridMid` by hand. Guess: it behaves the same.
- **Two or more editors** (`Who can edit ›`) and **two or more offline** (*"2 others offline"*) are built but only the one-person lines are tested. The `Who can edit ›` item calls `FM.collab.ui.openPeople()`; I did not click it.
- **Phase 4 pieces left alone:** the seam chip route to Arrange anyway, the `away` line for a guest (*"An editor is offline · clips stay put"*), the drag half of undo's pre-flight (3b), per-key `ar`. Not in the 2.6 row.
- **Order restore for Simple's steps** (DESIGN section 11, `ed: 's'` pass 2 of `invertStep`, held with Phase 4a) is not in the 2.6 table and not built.
- **Cache-busters and the version label were not bumped.** This is a helper branch; `tools/ship.sh` will refuse the release until `?v=` for the 10 changed `js/*.js` files is bumped, and the POLISH-LOG line written, by whoever merges it.
- **`FM.history.undo()` now returns a boolean on the solo path.** Callers in `js/` only fire and forget (Read: `app.js:7219`, `:9039`, `spine-edit.js:1232`), so nothing there reads it; the `?only=simple` slice and the 921 slice are the check that no test did.
- **The owner's own phone** (a second device of the same person) is counted as another editor by `S.liveInfo`, as `othersCanEdit` already did; DESIGN names *"Your phone can edit"* for that case and I did not build the wording.

## 5. Ambiguities, my call, change any
1. **Where the typing confirm lives:** in `S.makeViewer` (Simple's side), not in `U.setMemberRole`, so the People menu keeps asking nothing (as today). DESIGN section 3.11 says the item asks; it does not say the People menu does.
2. **`Arrange anyway` waives every offline editor at once** when two or more are listed, not one by one.
3. **`S.othersSeq` counts ops, not batches** (`ops.length`), and also counts ops that the receive rules skip; a bump is only ever too early, never missed.
4. **The soft line says "someone else"** when `whoChanged` cannot name a person, as Full's toast does.
