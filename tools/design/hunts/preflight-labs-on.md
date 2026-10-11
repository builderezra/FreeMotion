# LAB1: cloud pre-flight of hunt/labs-on 2d005a1 (#921 clause 19, Work with friends on by default) against hunt/land-b1 c3205c8

**Status, 11 Oct (the new cloud helper): 1280 triage DONE; one REAL bug found (pre-existing, now on every device); a fix branch `hunt/labs-on-fixes` is being built and checked; the 380 comparison waits on land-b1's 380 pass.** Do not ship labs-on without the fix.

## Counts so far (slices of 60, fresh Chromium 141 per slice, same method as preflight-v17.39)
- labs-on @1280: {'PASS': 2216, 'FAIL': 72, 'NOTRUN': 93, 'HANG': 5}
- labs-on @380: {'PASS': 2217, 'FAIL': 72, 'NOTRUN': 93, 'HANG': 4}
- land-b1 @1280: {'PASS': 2222, 'FAIL': 66, 'NOTRUN': 93, 'HANG': 4}
- `921 clause 19 · Work with friends is part of the app…`: PASS at 1280 and 380.

## Reds on labs-on @1280 not red on land-b1 @1280 (9), triaged
- Red alone and paired on labs-on, green on land-b1: 921 S2 inert; 921 S6 invite fragment; 967 B4 1 one name.
- Green alone, red only paired on labs-on, and the paired control on land-b1 PASSES (so labs-on causes the interaction): 921 S2 tier 3 same-device; 921 S3 owner cannot admit; 921 S4 tier 3 clips arrive.
- Green on re-run (full-pass only): 921 S3 a peer that never says hello; 921 S3 a connection that never opens. NOT RUN alone: 690 after he opens an effect inside a filter (the hang was this container).
- Red on land-b1 but green on labs-on (2): `effects: every bounded kernel is safe…`, `482 6.7 Glow Scan…` (not caused by labs-on).

## The REAL bug (verified twice by the analysis and once more by hand: codeA === codeB)
Share project A, open "Swap codes with someone", switch to project B, share B: **B hands out A's swap code**, and A's peer connection stays open (`have-local-offer`). If the friend answers, he is asked the five letters on B's card and confirming admits them into B, a project he never offered. It is reachable on land-b1 with Labs switched on too, so it predates clause 19; clause 19 puts it on every device. Proposed one-line fix: `dropOffer();` after `stopCkpt();` in onDetach's owner branch (js/collab-ui.js ~4699).

## The analysis, verbatim
# labs-on (6f646fa) triage: the 6 reds

**Verdict:** all 6 reds are tests that still assume Labs is off on a fresh profile. Each one gets a small test fix, and all 6 passed after it. One of them, #5, also uncovered a real app bug. The bug already existed but was hidden while Labs was off by default; clause 19 now exposes it on every device. **A swap code he made while sharing project A gets handed out again when he shares project B after switching projects.** The fix is one line in `js/collab-ui.js`. #6 is **not** a path where receiving media deletes a user's project: it is pollution from the previous test, proven below. `921 clause 19` passes on labs-on at 1280 and 380.

All line numbers refer to the labs-on tree (`wt/labson`, 2d005a1). The full diff of every fix is in `scratchpad/lab1-fixes.diff`. Everything was run in a private copy (`scratchpad/wt/lab1t`, served on :8821), and neither worktree was edited.

| # | test | assumption or real | evidence (file:line) | exact fix |
|---|---|---|---|---|
| 1 | 921 S2 the collab core is inert… | **Test assumption** | settings.js:62 `collabLabs: true`; apply() → syncLabs (settings.js:146); the ON branch runs U.install → `C.comments.install()` (collab-ui.js:5393-5402, 5272); the OFF branch runs U.uninstall → `comments.uninstall()` (collab-ui.js:5442, 5286; collab-comments.js:571-586). The test never turns the switch off, but its assertion at tests.js:30695 says "with Labs off". | Turn Labs off for the body and put it back. After `const C = need921('inertness');` add `const wasLabs921 = FM.settings.get('collabLabs'); FM.settings.set('collabLabs', false); try {`. After the last CONTROL line add `} finally { FM.settings.set('collabLabs', wasLabs921); }`. |
| 2 | 921 S6 an invite is read from the fragment only… | **Test assumption** | collab-ui.js:5007 `if (!U.labsOn()) return labsCard(o);`. With Labs on, the invite skips the "Turn on" card and goes to `U.profile()` (5014), which opens the `#collab-profile` name prompt and then the Join sheet. The stash and the address-bar cleanup are unchanged. tests.js:37156 waits for `x.labsCard`, which never comes. | tests.js:37156-37159: `R.until('the booted app to have stashed the invite and put up the name prompt', async function () { const x = await R.rpc('jf','pendingJoin'); return x.pj && !x.labsCard && await R.rpc('jf','dom',{ sel: '#collab-profile' }) ? x : null; }, 20000)` |
| 3 | 967 B4 1 one name… | **Test assumption** (the copy change is deliberate) | settings.js:561: the hint drops "still being tested". tests.js:106598 requires exactly one occurrence. | tests.js:106598: `if (inPanel \|\| onRow) throw new Error(… '— #921 clause 19 took Work with friends out of testing')`. Optionally retitle "…and no screen says it is still being tested…" and keep the `967 B4 1 one name` prefix. Nothing else in the repo refers to the title. |
| 4 | 921 S2 tier 3: the same-device refusal… (paired) | **Test assumption** (pollution through the new default in the tier-3 frames) | Previous tier-3 tests end with `t3reset921` → h `end`, which leaves frame b open on an **ended** linked copy. The next test's `setScene` (collab-agent.js:144) overwrites that open copy and resets → U.afterReset (collab-ui.js:4727, which returned at once while Labs was off) → resumeOpen → detachEnded (4747 → 4610) → detachLinked (storage.js:2950: copy, `remove` at 2971, `open(nid)` at 2972). That runs in parallel with the test's `C.join`. In the trace, the join attached its session, then detachLinked's own `open` reset it and C.onReset stood it down as `paused` (collab-core.js:393-400). `leave` then finds no session and returns null. | rig921 `boot()` (tests.js:32230): `const r = await bootSrc(…); await rpc(tag, 'settings', { key: 'collabLabs', value: false }); return r;` This boots the frames the way every tier-3 test was written. |
| 5 | 921 S3 the owner cannot admit anybody without confirming the five letters… (paired) | **The red is test isolation, but it exposed a REAL bug that already existed. Clause 19 makes it reachable by default.** | `withLabs921` restores the previous value (tests.js:32895, 32911), which is now ON. Restoring ON tears nothing down, so the old OFF→dropOffer teardown (collab-ui.js:5441) no longer runs between tests. Instrumented: at #5's start Labs was on and the module still held the previous test's offer (RTCPeerConnection `have-local-offer`, from 'Stop sharing revokes…' second share). That session had been ended by withCollab921's raw `C.end()` (tests.js:31207). `.cs-add` reused that offer (collab-ui.js:2708-2711), so no fake link was made and `made[0]` was undefined. **The real user path:** a project switch stands the owner's session down, but U.onDetach's owner branch (collab-ui.js:4698) never calls `dropOffer`. hostConnect then binds whatever session is live at the time (2833). | **App fix:** add `dropOffer();` in U.onDetach's owner branch, after `stopCkpt();` (collab-ui.js:4699). That alone turns #5 paired green with no test change. Test-side fix as well: in withLabs921's finally, before the existing restore, add `FM.settings.set('collabLabs', false); try { C.ui.syncLabs(); } catch (e) {}`. |
| 6 | 921 S4 tier 3: the clips arrive into the guest's own copy… (paired) | **Test assumption / pollution. Not a media path.** | Same mechanism as #4, proven with a trace (below). The "deleted" project is the previous test's **ended linked copy**, which #6's `setScene` relabelled "his own project". detachEnded copied it to a new id and removed the original at t=5307 ms, before the join at 5409 ms. | Same rig fix as #4. |

## Verification

- **#1, #2, #3 with their fixes:** pass alone at 1280 and at 380 (with `921 clause 19`, 4/4). Run against **land-b1's settings.js**, #2 and #3 FAIL, so they count as catching tests for prove.sh. #1, the rig fix and the withLabs921 fix pass on both trees, because they only restore isolation.
- **#4 paired** (`after=921 S2 tier 3: a guest joins and gets`): before the fix it failed in 4 of the 5 runs that had the host-reload test before it. With only the partition test before it, it passed. So it depends on timing. With the fix, 4/4 green twice.
- **#5 paired** (`after=921 S3 arming writes a checkpoint`): 4/4 with the test fix, and 4/4 with only the app fix.
- **#6 paired** (`after=921 S4 replacing a clip keeps…`): 4/4 with the rig fix.
- **`?only=921` at 1280 with all test fixes:** 248/254, plus 3 NOT RUN HERE (BarcodeDetector ×2, the CPU-bench test). None of the 6 targets is red. All 3 remaining reds are **unrelated and already fail on land-b1**:
  - `921 S4 splash.mp4, a PNG and a WAV all arrive…`: fails alone on :8821, :8811 and :8812 (no decoded video element; this headless build's codecs).
  - `921 S6 a shared copy finds its owner by itself…`: fails alone on all three ("re-offer came 3026 ms after here").
  - `921 S3 Stop sharing revokes the code…`: passes alone, but fails in the slice `after=921 S2 tier 3: the same-device refusal&upto=…Stop sharing` on :8811 **and :8812** alike. This is an ordering problem that predates labs-on.
- **App fix with the other test fixes:** `?only=921 S3 + 967 B3` gives 39/40. The 1 is the same Stop-sharing ordering red.
- **`921 clause 19`:** passes on the untouched labs-on tree (:8811) at 1280 and 380.

## Details

### #5: the real bug (swap code reused across a project switch)

I reproduced it outside the tests with Playwright (`scratchpad/lab1-repro-offer.js`) using the app's own calls:
1. Make a name.
2. Share project A, tap "Swap codes with someone", and wait for the FM1 code.
3. Open project B the way Home does (`FM.projects.open`), or start a new project.
4. Share B and tap "Swap codes with someone".

Results (`SAME_CODE` means B was handed A's code):

| run | path | SAME_CODE | A's peer connection after the switch |
|---|---|---|---|
| labs-on, default | open B | **true** | still `have-local-offer` |
| labs-on, default | new project | **true** | still `have-local-offer` |
| land-b1, Labs switched on | open B | **true** | still `have-local-offer` |
| land-b1, default (Labs off) | — | — | no share UI to reach it |
| labs-on, control: Stop sharing instead of switching | — | false | `closed` |
| with the one-line app fix | open B | false | `closed` |
| with the one-line app fix | new project | false | `closed` |

How a user hits it, now on by default:
1. He shares A and reads the swap code to a friend.
2. He opens another project from Home and shares that one.
3. B's card shows the same code.
4. If the friend pastes their answer now, hostConnect admits them into **B**. This happens after the five-letter check, but B is a project he never offered them.

The A peer connection also stays open and gathering for the life of the page. Before clause 19, only devices that had turned Labs on could reach this.

### #4 and #6: what the earlier tests leave behind

- **The previous test** (e.g. `921 S4 tier 3: a clip a guest adds…`, tests.js:34625) ends with `t3reset921` → h `end`. That leaves frame a **open on its linked copy, marked ended**. At #6's start, a's list was: `p_…y3v4xqij "Media host" collab.ended='ended'` and `Untitled`.
- **#6's first step on a** is `setScene({names:['Mine one','Mine two'], name:'His own project'})`. That writes into **the open project**, which is that stale linked copy, and calls `history.reset()`.
- **While Labs was off**, U.afterReset returned immediately (collab-ui.js:4727). The stale copy just stayed, and the test's "own project" was really a linked copy all along.
- **With Labs on**, the reset leads to resumeOpen → detachEnded, which calls `detachLinked(old)` at 5296 ms:
  - it copies the project to a new id;
  - `remove(old)` runs at 5307 ms;
  - remove opens the copy at 5341 ms;
  - the join only starts at 5409 ms.
- **The test's `before` snapshot** landed in the middle of the remove. The index had already dropped the old id, but its doc key was still there: open's flush resurrects it and remove then deletes it again (storage.js:3115-3118). So `after` lacked `fm.proj.p_…y3v4xqij`, and the test reported "receiving the media DELETED one of his own projects".
- **No received media deleted anything.** The removed doc's content survives under the new id, holding 'Mine one/Mine two'.

#4 is the same mechanism, with b's stale ended copy racing `C.join`. The join attached at 14552 ms, and detachLinked's `open` at 14509 ms reset it at 14603 ms, which stood the session down as `paused`.

### Latent hardening, not reproduced as a user path

detachLinked takes its snapshot first, then awaits the media copies, then removes and opens (storage.js:2950-2972). Any edit that lands on the linked copy inside that window is dropped. In #6's own run, the `mine.png` layer added during the window ends up in no project. Its media record stays behind as an orphan.

In the real app the trigger is `projects.open()`. With 3×120 MB of media in this Chromium, the detach finished 9 ms after `open()` resolved (`scratchpad/lab1-repro-detach.js`), so a tap cannot land in time here, and I have not measured it on a phone. The same goes for the join-vs-detach race in #4: the UI holds `joinBusy`, and a real join takes seconds. If wanted: storage.js:2972 should not open the copy when another project or a session has taken over in the meantime, and the edits-during-copy window could be closed by comparing the linked doc's `rev` before removing it. Neither is needed for clause 19.

### Same restore pattern elsewhere

`921 S3 turning Labs off as a guest…` (tests.js:33788/33819) and `921 S7 with Labs on, a phone's top bar…` (39297/39350) also restore `wasLabs` without passing through OFF. They are not red now. The app fix covers the offer leak for them as well.


## 380 comparison (labs-on @380 vs land-b1 @380)
The same eight reds as at 1280 (all covered below), plus `482 6.7 Glow Scan …` which is red on land-b1 @1280 and on main alone too (flaky here). Nothing new at 380. `921 clause 19` PASSES at both widths.

## FIX READY: branch `hunt/labs-on-fixes` c96f4849 (8 commits on hunt/labs-on 2d005a1), checked adversarially twice

App (js/collab-ui.js, ?v=22):
- **A swap code belongs to the project it was made for** (63001b34, replacing round one's unconditional drop): drawCodeStep tags the offer with the project (`link._pid`) and drops a held code from another project before making one; hostConnect refuses an answer to another project's code ("That swap code was made for another project — tap ‹ Back and swap codes again for this one.") and keeps it; U.onDetach keeps an idle code through a project switch (the room is only paused) but drops it on a real end or an exchange already in flight; stopSharingNow drops the code made for the project being stopped. → **B never shows or admits with A's code, and a friend who answered A's code still gets into A after a switch to B and back** (both verified with two real Chromes).
- **A code dropped while still being made never lands on the next card** (b94a3446): its late code or late failure goes with its own link.

Tests:
- Five new 921 S3 tests, each RED with its own fix reverted (tools/mutate.sh --only CAUGHT at 1280 and 380): B gets a fresh code and A's answer cannot enter B; switch-back admits into A; an answer to one project's code never enters another, even from that code's own card; Stop sharing a project from its Home card drops that project's code; an exchange still connecting at a switch ends with its session. Plus the late-code test.
- The six Labs-on-default test fixes (653ed44a), with **no eraser between tests**: withLabs921 now FAILS a test that leaves a swap code, a pending five-letter check or an owner session held ("LEAK: …"), counting only what appeared after it began (c54652f4, c96f4849).
- 921 S2 inert runs its body with Work with friends OFF and ON-with-no-session (cc28ecef). 967 B4 1 retitled to what it asserts (61ac1d99).

Results on c96f4849: `?only=921` 255/260 at 1280 (2 NOT RUN: no BarcodeDetector; 3 red, each also red or flaky alone on land-b1/labs-on: 921 S0 duplicateFrom, 921 S4 splash.mp4, 921 S6 re-offer timing); `921 S3` 33/33 at 1280 and 380; 967 61/68 + 7 NOT RUN (phone-only); 945 8/8; 983 2/2.

Known, not fixed (pre-existing, labs-on behaves the same): ending or stopping ANOTHER project (Stop sharing on B's card, Not now on C's Carry on sharing?, Stop sharing on C's Home card) still drops A's waiting code, so a friend who answered must be sent a new code. And the Share card's refusal says "‹ Back and swap codes again", which then makes a fresh code for the current project (that card is no longer opened by any real button since #978).

**To land:** take `hunt/labs-on-fixes` instead of `hunt/labs-on` (it contains it), re-chained with the Full batch as planned.
