# fz-seeds: hunt/fuzz-seeds ported onto v17.62

Branch `hunt/fz-seeds`, based on `hunt/v62f` 3987cbfa (v17.61, the new effect options and the clamp-echo fix).
The source is `hunt/fuzz-seeds` (96f55baf, 69860e32, 674234dc and 6e48d02f, on v17.34). Its write-up is
`tools/design/hunts/fuzz-seeds.md` on that branch.

**CODE ONLY.** Nothing here was run except `node --check`. **Read** means I read the code. **Measured there** means
hunt/fuzz-seeds measured it on v17.34. Nothing is Measured on this tree.

## Each fuzz-seeds fix

| fuzz-seeds | what | here | where |
|---|---|---|---|
| FZ1 `refreshDup` (product) | The host answered a resent tx with a stale cached ack. | **Ported**, adapted | `js/collab-host.js:904-964` (the note and `refreshDup`), and the call at `:983` (step 3) |
| FZ3 tidy at arming (product) | A comment list that repeats an id is made a set before anyone can join. | **Ported**, re-derived | `js/collab-session.js:1997-2038` (inside `tidyOnArm`) |
| FZ2 "duplicate-comment-id hardening" | FZ2 only *noted* the gap. FZ3 is its fix. | **Same as FZ3**. Nothing separate to port. | — |
| FZ1/FZ2 device tag in ids (fixture) | `mutate921(doc, seed, rounds, tag)` | **Ported**, plus one id more (see below) | `tests/tests.js:29338-29412` |
| FZ1 `inflight` (fixture) | The guest model keeps a tx that was sent online and never acked, and resends it. | **Ported**, plus one line more (see below) | `tests/tests.js:30787`, `:30885`, `:30903`, `:30916`, `:30949` |
| FZ1 `convergenceFuzz921(SEED)` | The fuzz becomes a function of its seed, for the battery. | **Ported** | `tests/tests.js:30959` (function), `:31190` (the pinned test) |
| FZ1 `?seed=N` seam | Pick the pinned test's seed from the page URL. | **Already present** in another form | The pinned test reads `(window.top \|\| window).location.search`. It is kept byte for byte. |
| FZ1/FZ2 battery (13 seeds) | Pinned seeds 23, 28, 30, 32, 38, 39, 43, 68, 107, 117, 119, 138 and 142 | **Ported**. Run time is TODO measure. | `tests/tests.js:155913` |
| `fz_range.sh` / `fz_seed.sh` | The seed sweep | **Ported as a tool**: `fz_sweep.sh` + `fz_verdict.py` (this folder) | Not run |
| d07240e7 | Cleanup of a private runner copy | **Dropped**. It is not needed. | — |
| `dup-comment-ids.test-snippet.js` | A throwaway reproduction | **Dropped**. Test 6 below covers it. | — |

### What changed in the adaptation, and why
- **`refreshDup`** matches FZ1's logic. The differences:
  - The comment says where a resend reaches step 3 on today's tree (Read).
  - The budget condition is written in a different order (`n > m.fixTokens || …`), so `mutate.sh` has a unique string to
    aim at. The same three limits apply.
  - ⚠️ **Read, worth knowing.** In the app, a reconnect goes through `collab-ui.js` → `S.addPeer(…, {mid: old})`, which
    calls `host.join`. That gives a **fresh member record** (lastCid -1, an empty ack cache), so a replayed tx after a real
    reconnect is a new q:1 tx that step 6's CAS answers. It never reaches the cached ack. The duplicate path is reached
    when the member record **survives** the resend:
    - LoopLink's heal on the same endpoint. This is what the engine test uses.
    - The #967 quiet link (`collab-session.js:1734`). The guest goes Offline on silence alone and keeps the link open.
      `markOffline` marks every outstanding tx unsent. Then its next edit's `flushOutstanding` resends a tx whose ack is
      still on the wire. The original ack lands, then the other device's batch, then the duplicate's cached ack, last,
      with the older value.
  - So the product bug is real, but it is rarer in the app than FZ1's write-up implied. FZ1's fuzz host never re-joins a
    member on reconnect, which is why the fuzz finds it so often.
- **The FZ3 tidy** keeps the original comment object when nothing in it changed, and clones only when a reply was
  dropped. Its ops and recs are the same shape as FZ3's: one `s P/comments` plus its `b`.
- **Fixture additions beyond FZ1/FZ2** (both fixture only, and both listed again below):
  1. The tag also goes into `fxadd`'s effect uid.
  2. A resend from `reconnect()` goes into `inflight` until its ack lands.

## The tests: block `// ── 921 fuzz seeds (hunt/fz-seeds) ──`, `tests/tests.js:155519-155918`

Helpers: `fzsRoom921` (the fuzz's Host plus `guest921`s, one hop at a time) and `fzsStart921`.

1. **`921 S1 fuzz seeds: a tx whose ack died with the line, sent again through the tail after somebody else changed the same value, does not put the older value back (the fuzz’s own guest model)`**
   - This is FZ1's scenario test, ported. It adds CONTROLs: the model kept the tx in flight, the resend is one q:1 tx, it
     came back through the tail, and the host answered from its ack cache.
   - **Red before the fix:** "g3 holds 111 (base 111) while the host and g2 hold 222 …". This is Read and hand-traced.
     It was Measured there on v17.34 ("g3 holds 111, the host and g2 222").
   - Red before the *fixture* fix: the CONTROL "the guest model forgot a tx it sent and never saw acknowledged".
2. **`921 S1 fuzz seeds: the real guest engine (FM.collab.Session) whose ack died with the line ends on the later value when the host answers its resend from the ack cache`**
   - **New.** It uses the clamp-echo rig: a real owner Session and Host, two real guest Sessions, and manual LoopLinks.
     Sam's link is partitioned with his ack on it, Mia moves the same value, and Sam's link is healed on the same
     endpoint.
   - **Red before the fix:** "Sam’s screen holds 111 (his base 111) while the host and Mia hold 222 …". This is Read and
     hand-traced through `onBatch` (both batches skipped as pending), `replayOutstanding`, step 3 and `onAck`.
   - CONTROLs: he came back by a tail, not a snapshot, and exactly one duplicate was answered.
3. **`921 S1 fuzz seeds: the refreshed ack of a resent tx is budgeted like a refusal’s repair: five later 150 000-character bodies are not all sent back, and the ack says resync`**
   - This is FZ1's budget test, ported.
   - **Red before the fix:** "the resent tx got no repair at all". The cached ack has an empty `fix`.
   - It also asserts that the repair carries 1 to 4 of the five bodies. With FIX_BYTES at 512 KB, three should fit (Read).
4. **`921 S1 fuzz seeds: a resent reorder or insert is answered with the stack and the element as they are now, not as the tx left them (the fuzz’s own guest model)`**
   - **New, and deterministic.** It stands in for what FZ1 only covered through battery seeds 68 and 119.
   - (a) **Red before:** "g3 holds the stack as B,C,A,D … while the host and g2 hold D,B,C,A". The cached `ord` was
     re-adopted.
   - (b) **Red before:** "g3 shows the layer it added as “X” … while the host and g2 call it “renamed by g2”". The cached
     `li` is an upsert of the whole element.
5. **`921 S1 fuzz seeds: two devices whose seeded walks coincide still mint different ids — a new layer, comment and effect each carry the device (the fuzz’s fixture)`**
   - **New**, and it tests the fixture.
   - Without the tag it is red: "two devices whose walks share a seed minted the SAME id". There are 400 one-step walks
     per device pair.
   - CONTROLs:
     - the tag changes no draw (the same `done` list);
     - each of the three kinds was minted at least once;
     - with no tag, the walk is the walk it always was.
   - ⚠️ **prove.sh cannot see this one fail.** Both of its sides run the new tests.js, so expect DEAD. Its proof is
     `mutate.sh` on `tests/tests.js` (below).
6. **`921 S1 fuzz seeds: sharing a project whose comment list repeats an id tidies it first, so the host and a guest never file a new comment in different places`**
   - This is FZ3's test, ported. It adds two checks: the kept `cdup` is the first one, and `S.tidied ≥ 1`.
   - **Red before the fix:** "the host base still holds a comment id twice". Measured there at 1280 and 380 on v17.34.
7. **`921 S1 fuzz seeds: the convergence fuzz holds for the seeds that once failed — ids minted by two devices, a tx whose ack died with the line, a stale order statement in a resent ack, and a comment id minted twice`**
   - This is the FZ1/FZ2 battery with its 13 seeds. `budgetMs: 300000`, as FZ1 had it. It is not the 60000 the other six
     use, because it is 13 whole fuzz passes.
   - **TODO measure** its run time. FZ1's note says about 60 s on its machine.
   - ⚠️ **Not known to be red before the fixes on this tree.** The fuzz has re-rolled since v17.34:
     - `mutate921`'s `fxadd` draws from the whole registry, which has grown;
     - seven effects gained params, which changes `kitchen921`'s draw count.
   - So each seed may no longer reach the case it once failed on. Tests 1 to 4 and 6 are the deterministic proof. This
     one is a net.

## Fixture changes (shared helpers), and why each is fixture-only
- **`mutate921(doc, seed, rounds, tag)`** (`tests.js:29347`). The device tag goes into a new layer's id (FZ1), a new
  comment's id (FZ2) and, **added here**, an `fxadd` effect uid.
  - The fuzz seeds each device's walk as `round*31+a*7+1` for the owner and `round*37+a*11+3` for a guest. These collide:
    7007 is both. So two devices minted one id for two different things. A real device cannot: `uid()`, `rid()` and
    `mintUid` end in random characters.
  - The tag changes no draw of the walk's own random numbers. Test 5 checks that.
  - The fxadd uid is my addition. Read: the same collision can put one uid on one layer twice, and `P.stampIds` then
    re-mints the later copy with **Math.random** (`collab-path.js:339`). That is nondeterminism inside a seeded fuzz.
    `'m' + tag + …` still matches `UID_RE` (`[a-z0-9]{4,16}`; at most 10 characters).
  - With no tag, the diff property test's call (`tests.js:~29602`) gets the ids it always had.
- **`guest921` `inflight`.** This is FZ1's change: a tx sent online is kept until its ack lands, and `reconnect()` sends it
  again ahead of the offline ones, in cid order. **Added here:** a resend from `reconnect()` is itself in flight until
  its ack lands (`tests.js:30949`). This mirrors the real Session, where `outstanding` holds every unacknowledged tx and
  `replayOutstanding` / `onSnap` resend it.
  - It makes the model do what the product does. It does not loosen any check.
  - The clamp-echo tests use `guest921` without reconnecting, so `inflight` is invisible to them (Read).
  - The one-line addition changes nothing in the fuzz as scheduled. A resend's ack always lands long before the next
    disconnect.
- **`convergenceFuzz921(SEED)`.** The pinned test's body was moved into a function, unchanged except for three things:
  1. `rng921(SEED)`;
  2. the tags on the two `mutate921` calls;
  3. the failure text, which prints `(seed ' + SEED + ')'`. That reads "seed 20260923" exactly as before for the pinned
     run.
  - **The seed expression, the title, the options, every invariant and every CONTROL are byte for byte.**
  - `trouble.slice(0, 4)` is kept. FZ1 widened it to 8; I did not.

## Busters and schema
- `js/collab-host.js?v=7` → `8`.
- `js/collab-session.js?v=18` → `19`.
- No other js file changed: not collab-core, diff, comments, bridge or ui.
- **SCHEMA_REV and SCHEMA_FP are unchanged, so there is no FP TO PIN.**
  - `refreshDup` changes only what the host sends back to a duplicate.
  - The tidy is in `tidyOnArm`, not the sanitiser. `C.schemaFingerprint` reads the sanitiser, the project clamp, the
    derived fixture and the registry, and none of them changed. The sanitiser's output is unchanged.
- No PROTO change. The guest needs nothing new: it already applies `ack.ops` then `ack.fix`.
- `COLLAB-DESIGN.md` §7.1 step 3 and §7.3 each gained a paragraph.

## Risks
- **The pinned seed re-rolls.** With `inflight`, a guest that drops resends what it had in flight. That means more
  messages, and every later latency draw from the shared `R` moves. So seed 20260923 walks a different path from the
  first lost ack on.
  - The tags do not move a draw by themselves. They only change what happens where a collision used to be.
  - So the pinned fuzz can land on a latent defect it never reached before, on either side of the fix.
  - **If it is red, read the shape before blaming this port.** Never change the seed. The clamp-echo NOTES carry the
    same warning.
- **The battery adds 13 fuzz passes to every `?only=921 S1` and every full suite pass.** It is the heaviest single test in
  S1. The builder may prefer to keep it but move it behind a hunt-only flag. That is his call, so I left it in, as FZ1 had
  it.
- **The battery may be red for a CONTROL, not a convergence.** For example, "no guest ever had to adopt the host's order"
  for some seed on today's re-rolled fixture. If so, it is the battery's seed choice, not the product. Re-pick from a
  fresh sweep. Do not weaken a CONTROL.
- **`refreshDup` and the clamp echo** (Read). A refreshed `fix` op on a path the echo also wrote passes through
  `ownCorrections`. That only matters when a *later* cid of ours holds the path and base and live still equal the echo. In
  that case it lands the present value in live one ack early, and the later tx's own ack follows. Idempotent.
- **A cached ack whose *fix* holds structural ops** (an `orderFix` `mv`, or a parent repair) on a tx that wrote only
  `s`/`d` which are all still current is returned unrefreshed, `ord` included. That is FZ1's behaviour, kept. Read: it
  needs a parent edit sequenced with a group-order repair, then somebody else's reorder, then a lost ack. I did not widen
  the fix for it.
- **Budget.** A refreshed ack spends the member's `fixTokens`, the same bucket a refusal's repair uses. A guest that
  resends many structural txs at once can run it down into `resync` sooner. That is by design: the copy then goes through
  `catchUp`'s budget.
- **A resend of a REFUSED tx now gets its repair again.** The S8 review made the cached copy of a repaired ack keep no
  repair and say `resync: 1` (`collab-host.js` "what is KEPT for a resend is not the repair"). That is still true: the cache
  is not changed. But the refreshed answer recomputes the repair, so an honest guest can get both the repair and the
  snapshot its `resync` asks for.
  - I considered skipping the refresh when the cached ack already says `resync`, and kept FZ1's behaviour. Read:
    `guest921` has no resync handling, so a lease-refused tx whose ack died, answered with no repair, would leave the fuzz
    diverged. FZ1 measured 150/150 with refresh-always.
  - The cost is the same per-member budget a fresh refused tx already spends, so a hostile Viewer gains nothing new.
  - The S8 adversarial fuzz resends older cids with role-refused ops (`tests.js:41018-41019`), so it now reaches
    `refreshDup`. That only ever reads base. Run it.
- **No existing test pins the duplicate's ack as identical to the cache** (grep of tests.js for `.dup`, `acks`, "cached
  ack"). `921 S8r a refused tx is repaired within a budget` checks the CACHED copy has no repair, which is still true.
- **The FZ3 tidy drops comments.** The later copy of a repeated id is gone from his document, as an undoable "Tidy-up for
  sharing" step. FZ3's reasoning: an element nobody can address by id is not a comment anybody can keep. Re-minting the
  id instead would be a one-line change, and it is a taste call if he wants it.

## What the builder must run
Run all of these with no ship, mutation or other heavy job alongside.
1. **The new block**, at 1280 and at 380: `?only=921 S1 fuzz seeds`. All 7 should be green. Measure test 7's run time and
   write it into its TODO.
2. **`?only=921 S1`** at 1280 and 380. This includes the pinned fuzz and both clamp-echo tests.
3. **Ideally the whole `?only=921`**, at 1280 and 380. S2 and S8 drive the real Session and Host.
   - S8's eight-device fuzz drops links and re-joins through `dropPeer` / `addPeer`, so its resends are fresh CAS txs and
     should not reach `refreshDup` (Read).
   - The adversarial fuzz does reach it (see Risks).
4. **`tools/mutate.sh --only`** on each product fix. Each one should be CAUGHT:
   - `js/collab-host.js` `"ack: refreshDup(m, tx, m.acks[i])"` → `"ack: m.acks[i]"`, expecting test 1. It should also turn
     2, 3 and 4 red.
   - `js/collab-host.js` `"      delete out.ord;"` → `"      void 0;"`, expecting test 4 (part a).
   - `js/collab-host.js` `"        stale.push(op);   // li"` → `"        if (op.o === 's' || op.o === 'd') stale.push(op);   // li"`, expecting test 4 (part b).
   - `js/collab-host.js` `"if (n > m.fixTokens || fixN >= LIM.FIX_OPS || fixBytes + n > LIM.FIX_BYTES)"` → `"if (false)"`, expecting test 3.
   - `js/collab-session.js` `"if (seenC[c.id]) { changed = true; continue; }"` → `"if (false) { changed = true; continue; }"`, expecting test 6.
   - `js/collab-session.js` `"if (seenR[r.id]) { cut = true; continue; }"` → `"if (false) { cut = true; continue; }"`, expecting test 6.
   - The fixture, on `tests/tests.js`:
     - `"const tg = (typeof tag === 'string') ? tag : '';"` → `"const tg = '';"`, expecting test 5;
     - `"g.inflight[cid] = tx;   // sent"` → `"void 0;   // sent"`, expecting test 1 (its CONTROL).
5. **Optional: the seed sweep.**
   - Command: `bash tools/design/plans/fz-seeds/fz_sweep.sh 1 150` (width 1280), then the same with `380`.
   - It writes `sweep_1_150_<width>.txt` here, one line per seed: PASS, FAIL or ERR. ERR is never a pass.
   - It serves the tree itself on a free port and refuses while a ship, mutation or spotcheck lock exists.
   - On v17.34 FZ1 measured 150/150 at 1280 with all three fixes. Any seed that fails here is a new finding. Read its
     shape and decide whether it joins the battery.
   - The `.sh` lost its exec bit on the Windows side, so run it with `bash`.
