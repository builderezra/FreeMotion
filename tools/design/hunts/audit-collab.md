# AU5: audit of js/collab-core.js and js/collab-session.js on main v17.31 (fake network only)

Against `origin/main` 7125ecff. Branch `hunt/audit-collab`. **Measured** = I ran it here (headless Chromium, the suite's own driver, 1280 and 380), **Read** = I read the code, **Guess** = I did not check. **No real network was touched**: every wire is `FM.collab.link.LoopLink` (the in-page fake), the same one the existing collab tests use; no socket, no relay, no WebRTC.

**Bottom line, honestly.** The engine held up against a hard look: a randomised run of an owner and two REAL guest sessions (not the test file's model of a guest) with cuts, heals and offline edits, 6 seeds of 100 rounds in the suite and 12 seeds of 120 in my own runs, loses no edit, brings back no deleted layer, shows no layer twice and leaves no stale value over a newer one. **One real bug survived my attempts to refute it**, in the reload path, and it is fixed and proven.

## Fixed: red on main, green with the fix (1280 and 380), four mutations CAUGHT

| # | Where | What happens | Repro test | Fix |
|---|---|---|---|---|
| AU5-2 | `recoverOutbox` (`collab-session.js`, §12.4) with the host's `cas` (`collab-host.js`, §13.3) | **A guest that reloads can bring back a layer the owner deleted.** On a reload the guest rebuilds what it owes the owner as "my live document minus the persisted base". The base is written two seconds after a batch (`persistSoon`), and not at all when the device is out of room (`persistFailed` backs off to 30 s), so it can be stale: layers that only ARRIVED here since then look like layers this device made. If the owner deleted one of them while the guest was gone, the guest's hello gets a tail that says so, the tail removes the layer, and then the recovered `li` still goes out as a q:1 resend. The host reads an insert for an id it does not have as "genuinely a new key" (`cas`, §13.3 as written), accepts it, and **the owner's delete is undone for everybody**. Measured: owner has Y again, guest owed 3 ops (Y, Z, its own layer). | `AU5-2` (controls: the guest's own offline layer reaches the owner exactly once; Z, which nobody removed, is on the owner exactly once) | `recoverOutbox` marks the entry `recovered`; when a batch arrives that removes a layer, any `li` for that id inside a `recovered` entry is dropped (`dropRecoveredInserts`). A layer the person made offline is never removed by anyone, so it still goes; an id nobody removed is untouched |

Mutations (all CAUGHT, `au5_mut.log`): the drop never called (A1), the flag not set (A2), the match never true (A3), every `li` dropped (A4, caught by the "own layer still reaches the owner" control), and the host refusing every queued new layer (B1, caught by the AU5-1 fuzz). Busters bumped: `collab-session.js?v=13`. Neighbours with the fix (1280): every `921 S1` test (24 of 24) and every `921 S2` test (33 of 33) green; the AU5 pair green at 1280 and 380, and AU5-2 red on main at both.

`AU5-1` is a guard, not a repro: it is **green on main**. It is in the set so the property cannot rot (a change to the tail, the outbox, the CAS or the catch-up that loses an edit or duplicates a layer fails it by name).

`audit-collab-scripts/`: `au5-fuzz.js` (AU5-1) and `au5-stale.js` (AU5-2), both to append before `async function run()` in `tests/tests.js` (`?only=AU5`); `au5-fixes.patch` (against main, the app files on this branch carry them); `au5_mut.sh`, `au5_mut.log`.

## Where I chose NOT to fix a gap (said plainly)

- **The same stale-base case through a SNAPSHOT is not fixed.** After a host reload the epoch changes, the host has no ring, and the guest gets a snapshot instead of a tail. A recovered `li` for a layer the new snapshot lacks cannot be told from a layer the person made offline, because nothing records which is which. The honest fix is on the writing side (persist the base at the moment a batch lands, or stamp each recovered insert with whether this device ever received it), and that is a design call, so it is left. **Guess:** the window is a reload inside the two-second persist delay plus a host reload, which is narrow.
- **A stale base can also resend an old value over a newer one when the host's value has gone back to what the stale base held** (A to B to A): the CAS compares against the stale base, sees a match, and applies. Real, exotic, and not reproduced here (**Read** only).

## What I read, and how closely

Line by line: `onBatch`, `onSnap`, `onAck`, `replayOutstanding`, `recoverOutbox`, `setOnline`, `markOffline`, `persist`, `C.reopen`, the host's `receive`, `cas`, `sequence`, `tail` (collab-host.js 335 to 400, 840 to 960). Skimmed: `collab-core.js` (constants and the op grammar; it is configuration, there is little to get wrong).

**Not read closely, no claim either way:** presence, leases, comments and media in `collab-session.js` (about 900 lines of 2,037), the relay and rendezvous (not collab-core or collab-session), and the host's comment and role rules beyond what the tests already pin.

## Harness lessons (so the next person does not lose an hour to them)

Two things looked like engine bugs in my first long run and were my harness: (1) with `autoTick: false` **the owner's own `S.tick()` is what serves a catch-up the per-member budget put off** (`serveOwed`, one every 2 s after three), so a test that never ticks the owner sees a guest stuck one batch behind; (2) pumping each loop once, one after another, leaves the last hop queued on another loop, so equality has to be checked after pumping until every loop is empty. Both are fixed in the AU5-1 helper.

## Candidates I tried to refute and dropped

- A queued `li` over an element that is back is a CLASH, not an overwrite: already covered by a test and by `cas` (`el !== undefined` and `b` differs).
- A tx resent after the link went down goes out as q:1 (CAS), not q:0 (overwrite): covered by the existing test I read; the offline-add rounds of AU5-1 exercise it for real.
- The convergence fuzz in the suite uses a MODEL of a guest (`guest921`), not `FM.collab.Session`; that is why AU5-1 drives the real class, which is where AU5-2 lives.
