# G996: the cross-project guard `hunt/996-guard` e87c7535 (on 980-p21-r12 = 76f4a1b9)

**Verdict: the two 996 tests are good and the theory is right, but the fix breaks an existing test: `921 S2 a batch broadcast during the join handshake is kept and replayed, not read and dropped` goes RED (alone, both widths) and is green on 980-p21-r12.** Everything is on copies; the tree's own `tests/_cdp.py` (one `FM_NO_REAP` line in a copy), headless Chromium, 1280 and 380. "980-p21-r12" here is `76f4a1b9`, the parent of e87c7535.

## 1. The two 996 tests on e87c7535: GREEN at 1280 and 380
- `996 a reconnect whose stored base is still being read when he opens another project attaches to nothing, and the room never reaches that project`: ok, ok (its on-project control, "the linked copy was the open project when the reconnect began", holds).
- `996 a session that hears from the room while another project is open keeps the change in its base and leaves that project alone`: ok, ok (its control, "on its own project the room's snapshot lands at once", holds).

## 2. With `js/collab-session.js` taken from 980-p21-r12 (fix reverted): BOTH FAIL, at both widths
- reconnect test: `a session for the linked copy was attached while ANOTHER project was open (p_…) — its room would be written into that project`.
- room-while-away test: `a snapshot heard while another project was open rewrote the open scene: ["layer_…"] → ["layer_…"] (996 room only)`.
So both tests can see the bug. (On r12 itself the 996 tests do not exist: 0 of 0.)

## 3. `?only=921` (all of S0–S8, 253 tests) against 980-p21-r12, both widths

| | ran | red | NOT RUN HERE |
|---|---|---|---|
| 980-p21-r12 | 253 | 3 | 3 |
| e87c7535 | 253 | 5 | 3 |

The 3 reds both trees share (same at 1280 and 380): `921 S3 Stop sharing revokes the code…` (full-pass-only, known), `921 S4 splash.mp4, a PNG and a WAV all arrive…` (no H.264) and `921 S6 a shared copy finds its owner by itself…` (red on main alone too).

**Two extra reds on e87c7535, both widths:**
1. **`921 S2 a batch broadcast during the join handshake is kept and replayed, not read and dropped`: NEW, REAL.** RED ALONE on e87c7535 at 1280 and 380 (`the guest's document says "before" — it is editing a document that is missing the owner's work`); GREEN alone on 980-p21-r12 at both. The guest's BASE still says `during the handshake` (the first assertion passes), the live document does not. Why, from the code: the test stubs `FM.projects.createLinked` and `FM.projects.open` (open stays pending, "the WINDOW between the snapshot and S.setLink(), hundreds of milliseconds on a real device"), `S.pid` becomes the new copy's id (`js/collab-session.js:2012`, `S.pid = gpid`), but `FM.projects.currentId()` is still the project that was open. So `offProject()` is true for every batch the owner sends in that window and `applyLive` returns `'off'`: the room's change goes to base only. **The same window exists in the real join** (`open()` is what makes it long), so this is not only a test-fixture effect: an owner's edit that lands while the guest's copy is still opening stays out of the document the guest then edits. The gate treats "the open project is not the session's project yet" as "the session is over the wrong project", and during a join those are the same state for a few hundred ms. (What I did NOT check: whether anything after `open()` resolves replays base onto the document in the real app; the test says nothing does, and it is red.)
2. `921 S0 duplicateFrom copies independently and rolls back on failure`: **not caused by the fix.** It is the FIRST test of an `?only=921` run, and it is red alone and in the `921 S0` group on BOTH trees at both widths (`the fixture never had a project document to begin with`, the Home-open-at-boot first-test artifact); it happened to be green in the r12 full 921 run. Count only the target: no finding.

## 4. One half reverted at a time (each at 1280 and 380): each half is CAUGHT, by its own test

| revert | `996 a reconnect…` | `996 a session that hears…` | verdict |
|---|---|---|---|
| ONLY the reopen re-check (`if (FM.projects.currentId() !== gpid) return null;` in `reopen`) | **RED** (`a session for the linked copy was attached while ANOTHER project was open (p_…) — its room would be written into that project`) | ok | CAUGHT by the reconnect test |
| ONLY the `offProject()` gate (`offProject()` returns false, so every gated `applyLive`, `applyOrder`, autosave goes back to writing) | ok | **RED** (`a snapshot heard while another project was open rewrote the open scene: […] → […] (996 room only)`) | CAUGHT by the room-while-away test |
| ONLY the `applyLive` early return (`if (offProject()) return 'off'`) | ok | **RED** (same message) | CAUGHT by the room-while-away test |

Neither half survives. The two tests are independent: each catches its own half and passes the other's.

## 5. Does the theory match what I see? Yes.
With the fix reverted I ran the reconnect test with its early assertion switched off so it goes on to the next check: the session for the linked copy IS attached while the other project is open, and when the room then answers with its document, **the room's layer is written into the other project**: `the room's layer was written into the other project: ["996 his own layer","996 room only"]` (his own layer is still there next to the shared one; in the second test the open scene's layer ids are replaced outright). So a project switch during the async base read leaves the session over the OTHER project and the next snapshot writes it in place. **Not measured:** the autosave step of the theory (the tests look at the scene, not at what was stored); I did not read the other project's saved document back.

## 6. What to do with it
The guard is right for the case it was written for. Before it ships, the join window needs an exception (for example: `offProject()` is false while a join/open is in flight and `S.pid` is the project being opened, or the gate only applies when the session's adapter document is `FM.scene`), and `921 S2 a batch broadcast during the join handshake…` is the test that will say it is fixed.

DONE: preflight-996 — e87c7535: both 996 tests green and both fail on the r12 file; each half CAUGHT; theory confirmed (the room's layer lands in the other project); but 921 S2 "a batch broadcast during the join handshake" goes red with the fix (green on r12): a real regression.

---

# G996b: the new tip `hunt/996-guard` 469f82f3 (the gate applies only when `A.doc() === FM.scene`)

**Verdict: the regression is fixed and nothing new is red. At 1280 and 380: 921 S2 "a batch broadcast during the join handshake" is GREEN, both 996 tests are GREEN, both halves are still CAUGHT, and `?only=921` has no red that 980-p21-r12 does not have.** The diff against e87c7535 is the one line `if (!A.doc || A.doc() !== FM.scene) return false;` at the top of `offProject()` (+4 lines with its comment). Same method as above.

1. **`921 S2 a batch broadcast during the join handshake is kept and replayed, not read and dropped`: ok at 1280, ok at 380** (run alone; it was RED alone on e87c7535).
2. **Both 996 tests: ok, ok at 1280 and at 380** (reconnect test and room-while-away test, with their on-project controls).
3. **With `js/collab-session.js` from 980-p21-r12: both FAIL at both widths** (`a session for the linked copy was attached while ANOTHER project was open…` and `a snapshot heard while another project was open rewrote the open scene…`). So the new line did not blind the tests: the 996 tests use the app's own bridge, whose `doc()` is `FM.scene`, so the gate still applies to them.
4. **Half reverts, each at both widths: both halves CAUGHT again.** Only the reopen re-check reverted: reconnect test RED, room test ok. Only the `offProject()` gate off (it returns false first): room test RED, reconnect test ok. Only the `applyLive` early return reverted: room test RED, reconnect test ok.
5. **`?only=921` (253 tests), 469f82f3 against 980-p21-r12:**
   - 380: **247 ok, 3 red, 3 NOT RUN HERE on both trees, the same 3** (`921 S3 Stop sharing…`, `921 S4 splash.mp4…`, `921 S6 a shared copy finds its owner by itself…`). No new red.
   - 1280: 469f82f3 is 245 ok / 5 red, r12 is 247 ok / 3 red. The 2 extras: `921 S0 duplicateFrom copies independently and rolls back on failure` (the FIRST test of an `?only=921` run: red alone on both trees at both widths with `the fixture never had a project document to begin with`, the Home-open-at-boot artifact; count only the target, not a finding) and `921 S2 tier 3: the host reloads — a new epoch, a snapshot, and the guest's work made while it was gone is resent` (`timed out waiting for the guest to finish resending what it owed`): **green alone TWICE at 1280 and TWICE at 380 on 469f82f3 and on r12**, and green at 380 in the full 921 run, so a timing flake of a tier-3 test under four Chromes, not the gate.

DONE: preflight-996 / G996b — 469f82f3: 921 S2 join-window green again, both 996 tests green and both fail on the r12 file, both halves CAUGHT, ?only=921 no new red (one tier-3 timing flake at 1280, green alone).
