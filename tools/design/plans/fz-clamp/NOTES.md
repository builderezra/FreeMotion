# fz-clamp: the guest that never takes the host's clamp

Branch `hunt/fz-clamp`, based on main v17.61 `e12921fa`. CODE ONLY: nothing here was run except `node --check`.
**Read** = read the code, **Guess** = not checked. Nothing is **Measured**.

## What failed

The v17.62 ship (parked in the main checkout, `.claude/ship/ship.log`, 17 Oct 14:2x) went red on
`921 S1 convergence fuzz` (seed 20260923). The full text from the log (Read):

> g2's base differs from the host at layers/2/effects/3/params/center (5.868 vs 1) ;; g2's live tree differs … (5.868 vs 1)
> ;; g2's hash differs ;; **g2 is still holding 1 pending path(s) at rest, starting L/add_861_1/effects/#u:u1l69hz/params/center**

The last clause is the key one. It was cut off in the message handed to this branch.

## Root cause (Read): a livelock, not a lost correction

The brief's diagnosis was "the host's correction never reaches the sender". **That part is wrong.** The host does send
it. `js/collab-host.js:741` (`invariantFix`) computes the clamp, and `:983` puts it in the ack's `fix`, after the echo
`ops`. The guest then applies both to **base**.

What drops it is the guest's §8.5 rule for **live**:
- `js/collab-session.js:573` (HEAD): `if (!laterPending(p, oo.cid) && …) applyLive(op, sum)`
- the fuzz's model of the same rule, `tests/tests.js:30811` (HEAD, `guest921.applyRemote`)

The rule says an own ack does not touch live on a path that a **later** cid of ours still owns.

That is right for an echo, which is older than the later value. It is wrong for a correction, and here it never ends:
1. The guest has two txs on the centre in flight. It sent 5.868, then something else on the same path.
2. Ack 1 lands. Base becomes 1. Live keeps the out-of-range value, because tx 2 owns the path.
3. The next diff (`collab-session.js:271` pushLocal; `guest921.step`) sees base 1 against live 5.868, and sends 5.868 again as tx 3.
4. Ack 2 lands. Tx 3 now owns the path, so its correction is held back too.

This repeats once per round trip, for good. Pending never empties. §11.4's hash cannot heal it either, because
`onHash` stands down while anything is outstanding.

At the end of the fuzz's 60 quiescence rounds, g2 has just re-sent the value. That leaves base 5.868 and live 5.868, the
host at 1, and one pending path. **This is exactly the shape in the log.**

**How the pair got in flight (Guess, from the ids).** `add_861_1` is a layer that a guest added at round 286. Decoding
`seed.toString(36)` gives 10585, which is round 286, actor 0. Then a centre edit on it was sent before the `li` ack came
back. That `li` echo put the whole layer back into base as it was sent: the centre went back to 0.5, while live stayed
at 5.868 under the pending edit. From there, any diff starts the loop.

**Is it in the product too?** Yes, by reading. The real Session has the same rule. Its `onAck` → `flushBefore` →
`pushLocal` (`collab-session.js:989`) only makes the re-send more prompt.

**Triggers in the app.** Any host correction of an accepted value, with a second tx on that path in flight. Examples:
- a param range that differs between builds;
- the project clamp;
- `sm.v` capped by the bridge (`collab-bridge.js:151`);
- a parent-cycle repair on the same path.

## The fix (`js/collab-session.js`)

`ownCorrections(base, live, echo, fix)`, at `:95`, is pure and exported as `FM.collab.Session.ownCorrections`. A
correction (an `s`/`d` in `ack.fix`) **also reaches live past a later cid** when both of these hold:
- `ack.ops` echoes our own `s`/`d` at exactly that path;
- base AND live still hold what that echo wrote.

In other words, the later cid is the same value again, and the host will correct it the same way. It is measured before
the ack touches base. The changes:
- `applyIncoming` (`:607-631`) takes `echoN` (where the echo ends) and uses the rule. It counts `S.stats.corrected`.
- `onAck` (`:1048`) passes `echoN`.
- COLLAB-DESIGN.md §8.5 step 2 gets one paragraph saying so.

**Why it is safe**
- **A newer value still wins.** If the person moved on, live or base differs from the echo, so the correction waits for
  that value's own ack, as §8.5 always said.
- **It is safe on order and safe to repeat.** It only puts into live what base is already given. The later tx's own ack
  still lands afterwards (echo, then the same correction).
- **Held paths still wait.** The `overlapsHeld` guard is kept, so nothing jumps under a finger.
- **Refusal repairs are untouched.** A refused op is not in `ack.ops`, so it has no echo to match.
- **The owner is untouched.** His fix call passes no `echoN`.
- **Offline is handled.** A lost ack is replayed from the host's ack cache, which keeps the invariant fix. The rule is
  then asked again of the device's state at that time.
- **The wire is unchanged.** No PROTO change and no SCHEMA_REV change. **The sanitiser's output is unchanged.**

**The fuzz's guest model calls the engine's function rather than copying it.** `tests/tests.js` `guest921`
(`:30777-30783`, `applyRemote` `:30813`, `onAck` `:30887`) throws if the function is missing, and never skips. This is
**a fixture change to mirror the product**, not a weakening:
- the seed is unchanged (20260923);
- the convergence check is unchanged;
- the model simply follows the corrected §8.5.

## Tests (block `// ── 921 clamp echo (hunt/fz-clamp) ──`, tests.js `:154521-154749`)

1. **`921 S1 clamp echo: a guest that sends an out-of-range Tilt Shift centre twice before its first ack ends on the host's clamped 1 in base and on screen, and stops sending (the fuzz's own guest model)`**
   - **Setup:** the fuzz's Host, `invariants921`, owner `live`, and two `guest921`s. A Tilt Shift is added to
     `kitchen921(77)`. The guest sends 5.868, then 6.5, before its first ack, and the wire is stepped hop by hop.
   - **Asserts:** every tree is at 1, nothing is pending, and the canon equals the host's. Also: ≤ 4 txs sent, and the
     rule fired.
   - **Controls:** the host's ack really carries `s centre 1`. Two owner out-of-range edits converge to 1. A guest's
     in-range edit that is in flight across an owner clamp wins (§8.1). In-range 0.3 then 0.7 settle on 0.7, with no
     correction and the rule never firing.
   - **Red before the fix:** on HEAD's js, `guest921` throws "Session.ownCorrections is missing". With the rule disabled
     (a mutation), it reads "THE GUEST NEVER STOPS SENDING: after 20 round trips …" (the livelock).
2. **`921 S1 clamp echo: the real guest engine (FM.collab.Session) shows the host's clamped centre with a later tx on that path in flight, instead of sending its own value again on every round trip`**
   - **Setup:** a real owner Session around a real Host (`C.bridge.invariants()`), and two real guest Sessions over
     manual LoopLinks. This is the S8 rig, with no app underneath. The same two values are used.
   - **Red before the fix:** on HEAD's js it is red for the real reason: "THE ENGINE NEVER STOPS SENDING: after 30
     round trips …" (Read and hand-traced; not run).
   - **Controls:** the same as test 1, plus `stats.corrected ≥ 1`.

**The owner's shape cannot diverge.** He has no pending, and his corrections come back with his own batch (the fuzz's
`live`; in the engine, `applyIncoming(r.b.fix, {own:true})` with no cid). So his shape is a CONTROL inside each test,
not a test of its own: a separate test would be green on HEAD and prove.sh would refuse it.

## FZ1 verdict (`hunt/fuzz-seeds` 96f55baf / 69860e32 / 674234dc — **none of it is on main**)

**Not the same cause, and not touched.** FZ1 measured both shapes as the fixture minting one id on two devices. In
`mutate921`, the owner's and a guest's mutation seeds coincide (31r+7a+1 = 37r'+11a'+3). The shapes were:
- `layers/N/parent` differs;
- the owner holds 21 layers against 20.

Putting the device's tag into the ids made seeds 23, 28, 30, 32, 38 and 39 pass. FZ1 also found a real stale-ack replay
on the tail path (seed 43 and five more), fixed by `refreshDup` in collab-host.js. That is a different defect again, and
it has not landed.

This fix could only touch a seed whose failure is a correction loop. None of FZ1's were. **Guess:** FZ1's 150-seed
sweep ran on v17.34, where the fuzz picked different keys, so other seeds may hit this loop now. That is unmeasured.

## Not done
- Nothing was run: no suite, no browser, no node beyond `--check`. **Whether seed 20260923 is green on v17.62 with this is not known.** The diagnosis fits every clause of the log, but nothing proves it.
- FZ1's branch was not ported (refreshDup, the id tags, the `inflight` replay, the seed battery). Port it separately.
- The v17.62 tree was not touched. It still has its other red, `no effect erases the layer … (queue 264)`, which is unrelated.
- There is still no host-side guard for a hostile guest that keeps re-sending an out-of-range value on purpose. The token bucket already bounds that.

## Busters
- `js/collab-session.js?v=17` → `18` (index.html). This is the only js file changed.
- No collab-core, host, bridge or diff change.
- SCHEMA_REV and SCHEMA_FP are unchanged, so no `FP TO PIN`.

## Risks
- **The pinned fuzz re-rolls from the first time the rule fires.**
  - **Why:** the fuzz draws every message's latency from the same seeded `R`. A guest that stops re-sending sends fewer
    messages, so everything after that point takes a different path, on v17.61 and on v17.62 alike.
  - **What that means:** seed 20260923 can land on a different latent defect. The likeliest are FZ1's:
    - the fixture minting one layer or comment id on two devices;
    - the stale-ack replay on the tail path.
  - **If the fuzz is red with a different shape,** read that shape before blaming this fix. The cure for those is to
    port `hunt/fuzz-seeds`, not to change the seed.
- The rule makes live take a correction one ack earlier than before, in the one case it matches. No existing test
  asserts the old intermediate state (grep: no `laterPending` or "later cid" test), but the whole `921` stage should be
  run to be sure.
- In the real app the rule reads live through `doc()` (FM.scene). Off-project, `applyLive` still refuses (#996).

## What the builder must run
1. `?only=921 S1 clamp echo`: both green, at 1280 and 380.
2. `?only=921 S1 convergence fuzz`: the pinned seed, **on the v17.62 tree**, with this branch merged.
3. `?only=921 S1`, the whole stage.
4. Ideally `?only=921` at 1280 and 380. S2 and S8 drive the real Session, and S8's eight devices converge through this path.
5. `tools/mutate.sh --only` on the fix, for example:
   - `js/collab-session.js` `"take = eq(D.valueAt(live, f.p), v) && eq(D.valueAt(base, f.p), v);"` → `"take = false;"`, expecting both `921 S1 clamp echo:` titles to go red (CAUGHT);
   - `"if ((!later || corrected) && (!overlapsHeld(p)"` → `"if ((!later) && (!overlapsHeld(p)"`, expecting the engine test (title 2).
