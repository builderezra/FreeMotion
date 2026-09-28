# FreeMotion live collaboration (#921): how it works, and what a simple "main track" editor would need

Research note for the simple-mode design (step 1). Written 28 Sep 2026 from a read of the code at `2d06a3f5` (v17.11).
**Method:** I read the code and the spec (`COLLAB-DESIGN.md`). I did not run any tests or the app. Anything about
behaviour is from reading unless marked "tested by" with the test name. Things I could not confirm are marked
**UNVERIFIED**.

Files read: `js/collab-core.js`, `collab-path.js`, `collab-diff.js`, `collab-host.js`, `collab-session.js`,
`collab-bridge.js`, `collab-presence.js`, the header and version gate of `collab-signal.js`, the head of `collab-link.js`,
`COLLAB-DESIGN.md` §2–§9 and §16–§20, the #921 entry in `REQUESTS.md` (lines 32694–32744), and the `921 …` tests in
`tests/tests.js`. `collab-media.js`, `collab-comments.js`, `collab-ui.js` and `collab-qr.js` were only skimmed, where
this note needed them.

---

## 0. Summary

- **This is not a CRDT and not OT.** The spec calls it an **observer-diff engine with one sequencer** (`COLLAB-DESIGN.md`
  §2 D1, D2). Each device keeps a plain-JSON `base` and compares it with the live `FM.scene` on a timer and at every
  commit. It turns the differences into **path-level ops** (8 kinds). The owner's device is the only authority (star
  topology). It applies each op in arrival order and broadcasts numbered batches, which every device applies the same
  way. That is the whole convergence argument (`collab-host.js:1-8`).
- **Concurrent edits to the same field: last writer wins, per path, in the host's order.** Three local rules shape
  "last writer" into **"the last person to let go wins"** (`pending`, `held/deferred`, re-assert at release). Also:
  deletes always win, and ordering is **stated by the host** rather than merged. Keyframe lists, mask paths and caption
  lists are **atomic**: one whole value per property.
- **The same model is used by Figma.** Figma describes its multiplayer as server-authoritative with last-writer-wins per
  property (<https://www.figma.com/blog/how-figmas-multiplayer-technology-works/>). The difference is ordering: Figma
  orders children with a fractional-index property on each child, while FreeMotion uses anchor-based moves plus a
  host-stated order.
- **For simple mode, the core problem:** a ripple edit is sent as **many absolute `start` values**, and because keyframe
  times are **absolute project time** (`js/scene.js:373-380`), it also sends **every animated property's whole keyframe
  list** on every clip it shifts. Absolute values from two people do not compose. Two ripples, a ripple against a free
  move, or a ripple against a keyframe edit will converge (every device ends up identical), but the result is
  **wrong**: overlaps or gaps in the main track, or animation left behind its clip, and nobody is told.
- **The cheapest fix fits the existing machinery.** Store the **main-track order as its own keyed list**. Make clip
  `start` a **derived value** (the §11.1 derived-writer mechanism, which costs nothing on the wire). Put keyframes on
  clip-relative time, or give them an offset. Add `mode` to presence. The keyed-list ops (`ai/ar/am`), the host-stated
  order (`ord`), per-op anchor resolution and the host invariant step already exist. **No new op kind is needed.** Four
  existing behaviours would need changing: leases, held-order deferral, the undo of a reorder, and the anchor fallback.

---

## 1. Architecture at a glance

```
 OWNER (host)  FM.scene ──diff──▶ ops ──▶ Host: validate → rate → dedupe → role → lease → CAS
                  ▲                          → resolve anchors + apply to base → invariants on CLONES
                  │ in-place apply           → seq++ → ring → ack (sender) / b (everyone else)
                  └──── base (authoritative JSON) ◀──┘
                         ▲ tx (ctl)        │ ack / b / ord (ctl)
 GUEST         FM.scene ─diff─▶ tx    base = host-confirmed + my outstanding ops
```

- **Star, no host migration** (`COLLAB-DESIGN.md` §2 D1). Guests talk only to the owner.
- **Transport:** WebRTC data channels, three per peer: `ctl` (ordered, reliable JSON), `pres` (unordered, lossy, ≤1 KB),
  `bulk` (ArrayBuffers for media). See `COLLAB-DESIGN.md` §20 and `js/collab-link.js:1-26`.
  - Signalling uses copy/paste connection codes, or sealed envelopes through public PeerJS/MQTT relays
    (`js/collab-signal.js:1-39`).
- **Everything is behind Settings → Labs** and inert until a session is attached (`js/collab-core.js:1-15`, `:251-283`).
- **Status:** stages S0–S8 all shipped (v16.80–v16.89). It is waiting on Ezra's own Mac↔iPhone test before Labs gating
  comes off (`REQUESTS.md:32694-32744`).
- ⚠️ **The idea behind this project was logged before:** `REQUESTS.md:32745` is **#923**, "an easy editor and a deep
  editor in ONE app, switchable… CapCut and Alight Motion both in one", held on 23 Sep for his approval. It is the same
  idea as this project.

---

## 2. The sync model in detail

### 2.1 What the synced document (D) is

- `D = { project: FM.scene.project minus a denylist, layers: FM.scene.layers }`.
  - The denylist is the owner's workspace pointers: `ofTemplate, ofTemplateRev, ofElement, returnTo, fromTemplate`
    (`js/collab-session.js:28-43`).
  - `bridge.view()` builds D fresh on every call (`js/collab-bridge.js:116`). The tree that ops are **applied** to is
    `FM.scene` itself, never a copy (`:112`).
- **Everything else syncs by default.** Any new layer or project field travels with no collab code change. The spec
  forbids turning the denylist into an allowlist (`COLLAB-DESIGN.md` §5.1).
- **Never synced:**
  - any key starting with `_`, at any depth;
  - any key that is not a valid path segment (`/^[A-Za-z$][\w$]{0,63}$/` minus `constructor`/`prototype`,
    `js/collab-path.js:23-29`, `:175`).
  - `canon()` (the hash) and `clone()` drop exactly the same keys as the diff walk, so they cannot disagree
    (`js/collab-path.js:139-175`, `:221-247`; `collab-diff.js:30`).

### 2.2 Paths and arrays

- **Path grammar:** roots `P` and `L`. The segment after `L` is a layer id. Object keys, or keyed element segments `#i:<id>`
  / `#u:<uid>`. **There are no numeric index segments** (`js/collab-path.js:66-83`). At most 32 segments (`MAX_SEGS`,
  `:64`).
- **Keyed arrays are addressed element by element:**
  - `KEYED = {effects:'uid', audioFx:'uid', behaviors:'uid', masks:'id', notes:'id', comments:'id', replies:'id'}`
    (`js/collab-path.js:251`);
  - plus any non-empty array whose elements all carry a unique string `id` (rule 2, `:268-275`).
  - Effects, audioFx and behaviors get an 8-character `uid` stamped **only while a session runs** (`stampIds`,
    `:315-346`).
- **Atomic arrays are replaced whole:** `kf, subs, points, path, captions, markers, bez, crop, stops, segments, cues`
  (`ATOMIC`, `js/collab-path.js:262`). They are checked **before** the rule-2 sniff, so adding an `id` to caption cues
  can never silently turn the caption list into a keyed array.
- **An empty array under a key not declared in `KEYED` is atomic** (`:273`). This matters for any new list simple mode
  adds (see §9.4 A).
- **Equality:** JSON semantics, with sorted keys and `_` keys skipped (`js/collab-path.js:139-202`). **An op whose value
  already equals the target is a no-op:** it is never sequenced, echoed or recorded (`:177-181`; host `collab-host.js:667`).
  This one rule is what lets every device run the same derived writers without a message storm.

### 2.3 The op grammar: 8 kinds, all path-level

Defined as data in `C.OP_GRAMMAR` (`js/collab-core.js:116-120`). The grammar is part of the schema fingerprint.

| `o` | fields | meaning | apply |
|---|---|---|---|
| `s` | `p, v` | set the value at the path (creating it if absent) | `collab-diff.js:190-227` |
| `d` | `p` | delete the key | `:229-240` |
| `li` | `id, a, v` | insert **or upsert** a layer after layer `a` (`a:null` means the top, index 0) | `:242-261` |
| `lr` | `id, f?` | remove a layer (`f:1` means force past a lease) | `:263-274` |
| `mv` | `id, a` | move a layer to after `a` | `:276-286` |
| `ai` | `p, k, a, v` | insert/upsert an element into a keyed array after `a` | `:295-317` |
| `ar` | `p` | remove a keyed element | `:319-330` |
| `am` | `p, a` | move a keyed element after `a` | `:332-347` |

- **Applied in place, never by reassigning.** The inspector, the mask tool and keyframe drags hold references into
  `FM.scene`, so `apply` patches objects and refills arrays (`js/collab-diff.js:86-114`).
- **Nothing is incremental.** There is no "add delta", no "shift by", no counter. Every value op carries the absolute
  result.

### 2.4 How ops are produced: observer diff

- **`diffDoc(base, live, {hot})`** emits ops in a fixed order: removals, then order (LIS-minimal `li`/`mv`), then a deep
  diff of each layer, then the project (`js/collab-diff.js:425-485`). Keyed arrays get the same removed/LIS/new/moved walk
  (`:550-596`). Atomic arrays and type changes become a whole-value `s` (`:505-513`). Applying the ops to `base`
  reproduces `live` exactly; this is tested by `921 S1 diff then apply reproduces the target exactly…` (`tests/tests.js:29393`).
- **When it runs:**
  - A **hot tick** every 100 ms on PC and 125 ms on a phone (`collab-core.js:273-276`, `LIMITS.TICK_*`).
  - A **full diff** at every `history.commit()` (`beforeSnap`, `collab-session.js:1253-1263`), at `beforeFlush`, and after
    draining the frozen/busy queue (`:1282-1291`).
- **The hot set** is `P`, the selected layers, and the layers this device changed last tick. **If there are 12 layers or
  fewer, every layer is hot** (`collab-session.js:175-186`). The layer id list is always compared, so an insert or
  delete is never missed on a hot tick.
- ⚠️ **The spec's idle full sweep and host coalescing are not built.** `LIMITS.SWEEP_MIN`, `SWEEP_FACTOR`, `COALESCE`,
  `BIG_ATOMIC` and `BIG_ATOMIC_HZ` are declared (`collab-core.js:46-48`) and never referenced anywhere in `js/` or
  `tests/` (checked by grep).
  - So on a project with more than 12 layers, a change to a layer that is **not** hot waits for the next commit.
  - This matters for any derived change that fans out to many clips (see §9.4 A).
- **Before every diff:** `normalizeDerived()` runs the app's three deterministic derived writers (`autoFitDuration`,
  `inheritLoopModes`, `_fillFxParams`) plus `stampIds` (`collab-bridge.js:131-139`). Every device computes the same values,
  so the no-op rule makes them free on the wire (`COLLAB-DESIGN.md` §11.1).

### 2.5 The host pipeline (per guest tx)

`H.receive` (`js/collab-host.js:847-934`), in order:

1. **Validate the whole tx.** A malformed message rejects the whole tx.
2. **Token-bucket rate limit:** 30 tx/s, burst 60 (`:338-346`).
3. **Dedupe** by `cid`.
4. **Role filter** (`allowed`, `:129-162`).
5. **Lease check:** any op whose layer is leased by someone else is refused (`:871-872`).
6. **CAS** only when the tx is marked `q:1`, i.e. offline or replayed (`cas`, `:350-387`).
7. **Resolve and apply, one op at a time.** Each anchor is resolved against the base that op actually lands on, so a
   two-layer paste keeps its order (`:656-666`; tested by `921 S1 an anchor is resolved against the base the op actually
   lands on…`, `tests/tests.js:29546`).
8. **Invariants on clones, turned into `fix` ops** (`applyAndFix` / `invariantFix`, `:609-715`). The sanitiser, the
   project clamp, the parent-cycle repair and the duplicate-id order repair (`collab-bridge.js:142-150`).
9. **Sequence:** `seq++`, keep a ring buffer, attach `ord` statements, then ack the sender and broadcast `b` to everyone
   else (`sequence`, `:797-821`).

- **The owner's own edits** go through `H.local`. It skips role, rate and CAS, but **not leases** (`:826-843`).
- **Refused ops are answered with the host's current value** in the ack's `fix` list, so the sender does not sit on a value
  only it believes in. This is budgeted (`currentStateOps`/`presentOp`, `:751-795`, `:895-913`).
- ⚠️ **A tx is not atomic.** Refusals are per op (steps 4–7). Only a malformed tx is rejected whole. A composite edit can
  therefore land partly.

### 2.6 How concurrent edits resolve

- **Same leaf path (`s`/`d`):** the host applies in arrival order, and the last one sequenced wins. Online edits (`q:0`)
  are applied unconditionally. There is no compare-and-set unless the tx is an offline or replayed one
  (`collab-session.js:344-355`; `collab-host.js:873-877`).
- **Guest-side `pending` (§8.1).** A remote leaf op that overlaps a path this guest has sent and not yet had acked is
  **skipped in both base and live**. The host sequenced it earlier, so this device's value will arrive later and win
  (`collab-session.js:513`). Only `s`/`d` are recorded as pending (`:288-294`).
- **Every device: `held`/`deferred` (§8.2).**
  - While `bridge.interacting()` is true, every path this device emits joins `held`. Interacting means: a pointer down, a
    text box focused, a character key held, an exclusive tool open, or under 250 ms since the last local change
    (`collab-bridge.js:153-163`).
  - A remote op on a held path goes to **base only** and is parked in `deferred`, so nothing jumps under a finger
    (`collab-session.js:515-520`).
  - At release: if the person rolled the gesture back, the deferred value is adopted. Otherwise the next diff re-asserts
    the live value, and the host sequences it last (`release`, `:407-453`).
  - Tested by `921 S2 a slider under a finger never jumps, and the last person to let go wins — in both orders`
    (`tests/tests.js:31191`).
- **Structural ops always win (§8.3).**
  - `lr` and `ar` (and anything that replaces an ancestor of a claimed path) apply to base and live.
  - They drop pending and held entries underneath, and cancel gestures on that layer (`collab-session.js:483-487`,
    `:522-530`).
  - `li`, `mv`, `ai` and `am` only move things and never conflict with content edits.
- **Order is stated, not merged (§8.3a).**
  - Two relative moves do not commute; the measured counterexample is in `collab-diff.js:349-369`.
  - So any batch that reorders anything carries `ord: [{p, f, k:[keys…]}]`, the full resulting key order of each array it
    disturbed (`orderStatementsFor`, `:393-412`). Every receiver adopts it (`applyOrder`, `:370-390`).
  - Keys the receiver has but the host does not (a layer it just made and has not sent yet) keep their slots.
- **Atomic values** (keyframe lists, mask paths, caption lists) are whole-value LWW. The spec's own words: it "can lose a
  concurrent edit to a sibling element, but it never drops data" (`COLLAB-DESIGN.md` §5.3, D15).
  - There is no character-level text merge. Text is covered by **leases** instead (see §4.4).
- **Divergence backstop.**
  - When the host has been quiet for 2 s it broadcasts a hash, at most every 10 s (`maybeHash`, `collab-session.js:1067-1074`).
  - A guest with nothing outstanding that disagrees asks for a snapshot. Three disagreements in 10 minutes pause the
    check and show a toast (`onHash`, `:1041-1058`).
  - A gap in `seq` asks for a snapshot at once (`onBatch`, `:888-907`).
  - Snapshots are applied as an in-place diff, and then this device's outstanding ops are re-applied (`onSnap`, `:994-1025`).
- **Offline.**
  - A guest keeps editing into an outbox (≤5000 ops / 4 MB, after which it becomes read-only).
  - On reconnect, each op goes back as `q:1` carrying the value its author saw (`b`, or a hash `bh` for removals). The host
    CAS-checks each one.
  - Clashes are counted and toasted, with "save my version as a copy" (`collab-session.js:971-992`, `:1366-1401`;
    `collab-host.js:350-387`).

### 2.7 Reordering, insert and delete of layers

- `FM.scene.layers` is **Z-order**: `layers[0]` is the top of the stack. **Group membership is the `parent` link, not the
  array position** (`js/scene.js:890-922`).
- **Insert** is `li{id, a:<layer above it in live>, v:<whole layer>}`. An `li` on an id that already exists is an
  **upsert**: it patches the layer and moves it (`collab-diff.js:242-261`).
- **Delete** is `lr{id}`.
  - The diff record keeps the whole layer and up to 5 anchors above it, for undo (`collab-diff.js:437-445`).
  - Media records are kept on purpose so an undo can bring the layer back (`:268-273`; `C.reachable`,
    `collab-session.js:1404-1422`).
- **Reorder** is the minimum number of `mv{id, a}` (the moves outside the LIS, `collab-diff.js:447-471`) plus an `ord`
  statement.
- **Anchors are ids, not indexes.** "After layer W" survives concurrent inserts elsewhere.
- ⚠️ **If the anchor itself has been deleted, it resolves to `null`, which means the top (index 0)** (`resolveAnchor`,
  `collab-diff.js:128-134`). Undo re-inserts use `firstSurviving` over up to 5 recorded anchors (`:631-645`), but a live
  op carries only one.

---

## 3. Validation and sanitising of what comes in

Every peer is untrusted, including the owner's device (`COLLAB-DESIGN.md` §14.9).

- **Shape checks.** `validateTx` / `validOp` / `badValue` (`collab-host.js:164-244`) check:
  - a safe-integer `cid`;
  - ≤5000 ops and ≤4 MB per tx;
  - each op's required fields, valid paths, and ids/anchors against `KEYVAL_RE`;
  - no bare-root writes;
  - no `s`/`d` on a key field (`namesKeyField`, `collab-path.js:100-111`);
  - an element-path `s` must carry an object;
  - finite numbers, strings ≤200,000 characters, depth ≤32, no `__proto__`;
  - each value ≤2 MB.
- **Prototype names** (`toString`, `constructor`, …) can never be an id or a uid (`collab-path.js:30-43`, `:299`).
- **Invariants run on clones of the host's base** after each tx, and their difference is broadcast as `fix` ops
  (`collab-host.js:606-715`). They are the app's own rules: `FM.storage._sanitizeLayers`,
  `FM.storage._clampProjectDims`, `FM.repairParentCycles`, `FM.normalizeGroupOrder` (`collab-bridge.js:142-150`).
  - They run only for touched layers (`inv.layer`), when the project was touched (`inv.project`), or when something
    structural happened (`inv.layers`).
  - "Structural" includes `parent` writes and whole-layer writes (`collab-host.js:673-680`).
- **Comments:** the host stamps `by`/`at`, whitelists keys, caps lengths and counts, and turns a whole-list write into
  inserts (`collab-host.js:75-162`, `:419-604`).
- **Membership:**
  - A `hello` never creates a member and never names its own role (`collab-session.js:721-730`).
  - Member ids are minted by the owner (`:1493-1517`).
  - Copies of the document (snapshots and tails) are budgeted per member (`catchUp`, `:750-791`).
  - Media offers are editor-only (`:656-669`).
- **Version gate:** `PROTO` + `SCHEMA_REV` + `SCHEMA_FP` (`collab-core.js:22-29`, `:122-220`; `collab-signal.js:1549-1563`).
  - The fingerprint hashes four things: the sanitiser's output on a fixture, every effect's parameter definitions, the op
    grammar, and **the output of the derived writers run on a fixture** (`derivedFingerprint`, `collab-core.js:156-199`).
  - A mismatch refuses the join. Tested by `921 S1 the schema fingerprint gate` (`tests/tests.js:30320`).
  - ⚠️ **Not in the fingerprint:** the `KEYED`/`ATOMIC` tables (`collab-path.js:251, 262`) and the project `DENY` list
    (`collab-session.js:31`). Changing any of them needs a **manual** `SCHEMA_REV` bump. Otherwise a mixed room
    disagrees silently. For example, a build that denies a key diffs it as deleted, and sends `d` to everyone.
- **Presence input** is rebuilt field by field (`cleanPr`, `collab-presence.js:280-298`). Unknown fields are dropped, and
  every label lookup goes through a prototype-free table.

---

## 4. Host vs peers, roles, presence, leases, undo

### 4.1 Host and peers

- **The owner's `base` is the host's base** (one object, `collab-session.js:80-82`).
- **A guest's base** is the host-confirmed document plus its own outstanding ops.
- `C.share` does three things (`collab-session.js:1735-1813`):
  - tidies the document so it is a fixed point of the sanitiser ("tidy on arm"), committed as an undoable owner step;
  - builds the Host;
  - seeds the owner's pre-session undo.
- `C.join` does four things (`:1841-1949`):
  - takes a snapshot;
  - refuses if this device already holds those layer ids (`sameDeviceCopy`);
  - creates a **linked copy** as a new project;
  - replays whatever batches arrived during the join.
- Leave keeps a re-id'd copy by default (`:1956-1986`).

### 4.2 Roles

- **Owner, editor, commenter, viewer** (`collab-host.js:31`). The host is authoritative (`allowed`, `:129-162`).
- The guest's own device runs the same rule as a **backstop**: anything it may not send is written back from base into
  live (`backstop`/`revertToBase`, `collab-session.js:310-330`, `:1601-1637`).
- The UI courtesies are `C.myRole`/`C.readOnly` (`collab-core.js:374-395`).
- Role changes travel as a `role` message (`collab-session.js:839-846`, `:1521-1531`). A viewer can ask to edit
  (`:671-718`).
- ⚠️ **There is no per-mode or per-section permission.** An editor can send any op.

### 4.3 Presence (who is selecting what)

- **What is sent.** `pr` frames on the lossy `pres` channel carry the **whole state** each time (`collab-presence.js:236-270`):
  - `sel` (up to 64 layer ids) and `pri` (the primary selection);
  - `ph`/`pl` (playhead and playing);
  - `pn` (the inspector view);
  - `tool` (which exclusive tool) and `ls` (the layer that tool holds);
  - `act` (drag/trim/type/scrub/export) and `af` (**the first held path**, e.g. what is being dragged);
  - `c`/`tap` (pointer and taps);
  - `md` (media % while joining).
- **Rates:** capped at 15 Hz on PC and 10 Hz on a phone, plus a 2 s heartbeat (`:59-76`). The host fans out `PR` at ≤15 Hz.
- **The roster** goes on `ctl`: `{mid, name, color, role, st, ls, dup}` (`hostRoster`, `:509-530`).
- **Follow** mirrors the other person's playhead and play state only, never their selection (`:1274-1311`; spec D19).
- **Presence never renders the scene.** Tested by `921 S5 two seconds of a remote pointer moving never renders the scene…`
  (`tests/tests.js:35182`).
- ⚠️ **Presence carries no "mode" or "which editor" field.** It also has no notion of sections or tracks.

### 4.4 Leases: the only locks

- **What takes one:** opening an exclusive tool: text, mask, points (not embedded), crop, motion path, touch-up, tracker,
  draw, or graph editor (`LEASED`, `collab-presence.js:180-203`). The request rides in `pr.ls`.
- **Who grants it:** the host, first come first served, **editors only**, and only on a layer that exists (`leaseFor`,
  `:452-482`). A clash on the same frame is answered with `lease-no`.
- **Expiry:** after 30 s of silence (`hostTick`, `:539-548`), or when the tool closes.
- **What it blocks:** **every op on that layer from anyone else, the owner included** (`collab-host.js:834`, `:871-872`),
  except a forced delete (`lr{f:1}`, "Delete anyway", `collab-session.js:1660-1684`).
- ⚠️ **One lease per member, per layer, tool-driven.** There are no leases on project paths: `layerOf` returns null for
  `P/...` (`collab-host.js:37-42`). There are no section or track locks.

### 4.5 Undo in collab

Per person (`COLLAB-DESIGN.md` D6).

- **A step** is the local ops between two commits. Within a step, records merge per path: the earliest before-value and
  the latest after-value (`record`/`closeStep`, `collab-session.js:1078-1110`). Up to 120 steps.
- **`runStep`** (`:1140-1230`) checks each op before undoing it:
  - an `s`/`d` is undone only if the value is still what this person left. Otherwise it is **soft-skipped**, with the
    toast "Part of this was changed by Sam since, so it was left alone";
  - a structural op that cannot be honoured fails the **whole** step ("Can't undo — Sam changed it since").
- **The inverse** is built by `invertStep` (`collab-diff.js:647-684`) and sent as an ordinary diff. There is nothing
  undo-specific on the wire.
- ⚠️ **Undoing a reorder restates the entire recorded base order** of that array (pass 2, `collab-diff.js:672-682`). By
  reading, it would also revert a peer's **later** reorder of other elements in the same array. **UNVERIFIED:** I found no
  test that covers that case.
- **Other undo behaviour:**
  - The owner can undo past the session start into his own pre-session edits (`:1112-1127`).
  - Undo stays delegated after a session ends, until the project is switched (`collab-core.js:233-249`, `:316-330`).
- Tested by `921 S2 undo is per person…` (`tests/tests.js:31619`) and `921 S2 tier 3: three real instances converge… undo
  is per person` (`:32188`).

---

## 5. Per-device state that must NOT sync (view state)

**Already per-device:**
- `selectedId`/`selectedIds` (these become presence), `FM.time`, `FM.playing`, `FM.addAt`, `FM.viewport`,
  `FM.groupContext` (`COLLAB-DESIGN.md` §5.1);
- every `_` key (for example `_expanded` and render caches; `collab-diff.js:88-126`);
- the owner's template pointers (`DENY`).

**Synced today, and possibly a surprise:**
- **`collapsed` on a layer** syncs: it is a real key, and in `LAYOUT_KEYS` (`collab-bridge.js:338`). One person
  collapsing a group row collapses it for everyone.
- Project `markers` and the loop region (`loopIn`/`loopOut`) sync too.

**For simple mode:**
- **Which editor this device is showing** must not be written into `FM.scene` as a plain key. Neither must simple-timeline
  zoom, scroll, expanded sections or the current insert point. Otherwise the other person's editor flips.
- Safe homes: a `_`-prefixed key, a separate localStorage key, or a `DENY` entry. A `DENY` entry needs a manual
  `SCHEMA_REV` bump (§3).
- A project-level **"this project's home editor"** default is fine to sync.

---

## 6. Limits (`C.LIMITS`, `js/collab-core.js:35-112`)

| what | value |
|---|---|
| people | 8 by default, 12 with a PC host, 6 with a phone host |
| layers | 2000 (the host refuses `li` past that, `collab-host.js:565`) |
| per tx | 5000 ops, 4 MB; each op value 2 MB; string leaf 200,000 characters; path 32 segments |
| guest tx rate | 30/s, burst 60 (a flood is dropped silently and the member flagged) |
| presence | 30/s accepted; send 15 Hz on PC, 10 Hz on a phone; heartbeat 2 s; frame ≤1 KB; `sel` ≤64 |
| tick | 100 ms on PC, 125 ms on a phone; interacting "quiet" window 250 ms |
| undo | 120 steps per person |
| ring | 2000 batches / 8 MB (a guest further behind gets a snapshot) |
| outbox | 5000 ops / 4 MB, then read-only |
| lease | expires after 30 s of presence silence |
| liveness | ping 2 s; offline after 6 s; link closed after 120 s grace |
| declared, **unused** | `COALESCE`, `BIG_ATOMIC`, `BIG_ATOMIC_HZ`, `SWEEP_MIN`, `SWEEP_FACTOR` |

---

## 7. The tests

**253 tests** are named `921 S0…S8` (`grep -c` over `tests/tests.js`). All are tagged `{item:'921'}`, so `?only=921` runs
them. The ones that pin the behaviour this note relies on:

- `921 S1 diff then apply reproduces the target exactly, and the step inverse gets back, over 200 seeded kitchen-sink scenes` (`:29393`)
- `921 S1 the LIS reorder emits the minimal number of moves, and the exact order` (`:29507`)
- `921 S1 an anchor is resolved against the base the op actually lands on…` (`:29546`)
- `921 S1 convergence fuzz: a host and three guests, 300 seeded rounds…` (`:30707`)
- `921 S2 a slider under a finger never jumps, and the last person to let go wins — in both orders` (`:31191`)
- `921 S2 a held reorder parks the LAYER order only — every other order statement in the batch still reaches live` (`:31320`)
- `921 S2 undo is per person…` (`:31619`)
- `921 S8 eight devices converge: … 400 seeded rounds, with role changes, dropped links, leaves and rejoins` (`:40325`)
- `921 S8 adversarial peer fuzz…` (`:39953`)
- `921 S8 a refused delete or move puts the element back where it was…` (`:40959`)

**All of these prove convergence: every copy ends identical. None of them tests whether the converged document is
semantically valid** (for example "no gaps on a main track"), because no such invariant exists yet.

---

## 8. Facts about today's document model that decide the simple-mode collab design

1. **There are no tracks.** The layer array is Z-order. Time placement is `start` / `duration` / `trimStart` / `speed`
   stored on each layer. Groups are `parent` links (`js/scene.js:890-922`).
2. **Keyframe times are absolute project time.** Moving a clip in time calls `FM.shiftLayerKeyframes`, which rewrites
   every keyframe's `t` (`js/scene.js:373-380`).
   - Every `kf` list is an **atomic** value on the wire.
   - So **one clip move = one `s start` plus one whole-list `s` per animated property** (transform x/y/scale/rotation/
     opacity, effect params, volume, speed…).
3. **Caption cues are clip-local** (`js/scene.js:1142`). They move with their clip for free, and a ripple does not touch
   them.
4. **Project length is a derived writer:** `autoFitDuration` (`js/app.js:852-880`).
   - The **group span** refit (`FM.refitGroupsFor`, `js/app.js:809-850`) is deliberately **not** derived. It runs only at
     re-time sites, so a deliberate trim of a group is not undone.
5. **Layer lookups by id are everywhere, and ids are stable** across the session (`FM.uid` `l_…`). A keyed list of layer
   ids is a natural fit.

---

## 9. Analysis: a simple "magnetic main track" user and a free-layer user on one project

### 9.1 Which edits conflict, under the engine as it is today

Assume simple mode is built naively. Each operation mutates `start` on every affected clip, and shifts keyframes as the app
does today. The observer diff then sends the result.

| # | Simple user (S) | Free-layer user (C), at the same time | What the engine does | What people see |
|---|---|---|---|---|
| 1 | Ripple-trim clip 2: `duration` of 2, and `start` + every `kf` list of clips 3…N | Free-moves clip 5 (`start` + its `kf` lists) | Per-path LWW in host order. If C is still dragging, C's device defers S's values and re-asserts at release, so **C wins clip 5** | Clip 5 overlaps or gaps its neighbours. The "magnetic" rule is broken on everyone's screen, silently |
| 2 | Ripple shifts clip 4 by +2 s | Edits a keyframe on clip 4 (the whole `kf` list) | Atomic list: whoever is sequenced last wins **the whole list** | Either C's keyframe edit is lost, or clip 4's animation plays 2 s away from the clip. Both are silent |
| 3 | Inserts a clip at slot 3: `li` + ripple +d₁ | Another simple user deletes slot 6: `lr` + ripple −d₂ | Two sets of **absolute** starts, merged clip by clip in host order | Clips after slot 6 carry only one of the two shifts, so overlaps appear. The main track can end up with two clips on the same start |
| 4 | Delete clip 4: `lr` + ripple of 5…N leftward | Has the mask tool open on clip 4 (a lease) | `lr` refused (lease). The `s start` ops on 5…N are **accepted**, because a tx is not atomic (`collab-host.js:866-880`) | Clips 5…N slide over clip 4, which is still there. S gets "C is editing … Tap to delete anyway" |
| 5 | Ripple shifts clip 7 | Has the text editor open on title clip 7 (a lease) | `s L/7/start` and its keyframes refused | Clip 7 stays put and the others shift: an overlap. S gets a lease toast about a clip S never touched |
| 6 | Split clip 3 at the playhead: new `li` (a copy made from S's view) + trims on 3 | Changes an effect on clip 3 | The copy was taken before C's change arrived | The two halves disagree about the effect. Two free-layer users hit the same thing today |
| 7 | Undo of an insert-with-ripple | C has since moved one of the rippled clips | `runStep` soft-skips that path and undoes the rest (`collab-session.js:1149-1155`) | The inserted clip is gone and every clip shifts back except one: a gap or overlap, with a "part of this was left alone" toast |
| 8 | Reorders main-track clips (by rewriting starts) | Changes Z-order (`mv`) | Independent paths | Fine, **unless** main-track order is derived from Z-order. Keep them separate |
| 9 | Deletes clip 5 | Is editing clip 5's opacity | `lr` wins (§8.3). C's gesture is cancelled | Expected. The same as today |
| 10 | Comments pinned at time `t` on a clip | Ripple moves that clip | Comment `t` is absolute (`collab-host.js:428`, `lid`/`t`) | The pin stays at the old time while the clip moves away (minor) |

**The pattern:** a free move changes one clip's values. A ripple changes **many clips' absolute values, computed from the
sender's own view**. The engine resolves each path on its own, so the host's result is always a consistent document but
not a meaningful one. Rows 1–5 and 7 all come from this.

### 9.2 Existing mechanisms that can already carry "semantic" edits

| Mechanism | Where | What it can carry for simple mode |
|---|---|---|
| **Anchor-based keyed-array ops** `ai/ar/am` | `collab-diff.js:295-347` | "Insert clip X **after clip W**" is literally `ai{p:['P','mainTrack'], k:'#i:X', a:'#i:W'}`. The diff **emits these by itself** when the app edits a keyed array (`collab-diff.js:550-596`), so the simple editor only has to mutate an array and commit. This is better than "at index 3": it survives concurrent inserts elsewhere. |
| **Per-op anchor resolution on the host** | `collab-host.js:392-418`, `:656-666` | Every device splices into the same slot, even if one of them never saw the anchor. |
| **Host-stated order (`ord`)** | `collab-diff.js:370-412`; `collab-session.js:556-573` | Two people reordering the main track converge on the host's order, with no merge algorithm. |
| **Derived writers + the no-op rule** | `collab-bridge.js:131-139`; `collab-path.js:177-202` | A **pure function of D** (for example "each main-track clip starts where the previous one ends") costs nothing on the wire and self-heals after any concurrent change. |
| **Host invariants → `fix` ops** | `collab-host.js:606-715`; `collab-bridge.js:142-150` | The host can enforce a document rule on its authoritative base after every tx, and ship the correction **in the same batch**. |
| **CAS with `b` (`q:1`)** | `collab-host.js:350-387` | "Apply only if the value is still what I saw." It exists, but only offline and replayed txs use it (`collab-session.js:350`). It could be switched on for composite online edits. |
| **Leases** | `collab-presence.js:452-482`; `collab-host.js:871` | Exclusive per-layer tools. |
| **Presence `act` / `af` / `sel` / `pri`** | `collab-presence.js:236-270` | "Sam is trimming clip 3" can be drawn today from `af`, the held path. |

**What does not exist:**
- op kinds with intent ("ripple", "shift by Δ", "increment");
- tx-level atomicity;
- per-field merge other than keyed arrays;
- a way for a UI action to hand the session an op directly. Everything goes through the observer diff, which is the
  premise of `COLLAB-DESIGN.md` D2.

### 9.3 Two ways to carry a ripple

- **(a) Ship intent as new op kinds**, for example `{o:'ripple', …}`.
  - This changes `OP_GRAMMAR`, so the fingerprint and `SCHEMA_REV` move.
  - It needs a path from UI actions to the session that bypasses the diff, which breaks D2.
  - The host would also need its own implementation of every magnetic operation, kept in step with the app's.
  - **Not recommended.**
- **(b) Make the ripple a consequence, not a message. Recommended.**
  - Store **main-track order** as data that merges well: a keyed list.
  - Make **clip start times a derived function** of that list plus durations.
  - Then the only thing that travels for "insert clip at slot 3" is one `ai` (plus the new layer's `li`). Every device,
    and the host, re-derives the same starts, so they are no-ops on the wire.
  - Concurrent inserts, deletes and reorders compose, because they are element operations on a list, not absolute numbers.

### 9.4 What would need to be added so neither person breaks the other's work

Rough cost order, cheapest first. Each one says which existing line would change.

**A. Main-track order as its own list, and start times derived from it.**
- **The list.** Something like `project.mainTrack = [{id:<layerId>}, …]`.
  - Declare it in `KEYED` (`collab-path.js:251`) so it is keyed **even when empty**. As an undeclared key, an empty list is
    atomic (`:273`), so the first two clips added at the same moment would be two whole-list `s` ops, and the host keeps
    only one.
  - Adding to `KEYED` is **not** covered by the fingerprint, so **bump `SCHEMA_REV` by hand** (§3).
  - The alternative is per-layer fractional positions (Figma's approach,
    <https://www.figma.com/blog/how-figmas-multiplayer-technology-works/>). It also converges, but a lease on a clip would
    then block reordering that clip (see C). The project-level list avoids that, because leases do not apply to `P/...`.
- **The derived writer.** A pure `layoutMainTrack()` added to `bridge.normalizeDerived` (`collab-bridge.js:131-139`) and
  also called by the app at commit sites, as `autoFitDuration` is.
  - Add it to `DERIVED_FIXTURE` (`collab-core.js:177-188`) so `SCHEMA_FP` moves, and a build without it is refused at the
    door. Otherwise an old build free-moves clips and a new one snaps them back.
- **Also as a host invariant**, so the corrected starts ride in the same batch as the list change:
  - add a document-level hook beside `inv.layer/project/layers` (`collab-host.js:685-715`, `collab-bridge.js:142-150`);
  - trigger it when `P/mainTrack` changes, or when a main-track clip's `duration`/`trimStart`/`speed` changes.
  - Without this, a guest's derived starts can reach base late on projects with more than 12 layers, because hot ticks
    diff only hot layers (`collab-session.js:175-186`).
- **Tolerate dangling list entries** (a clip the other person deleted): layout skips them rather than pruning them.
  - This is the same stance as the tolerated dangling `parent` (`js/scene.js:858-866`).
  - Pruning would be a write that the other person's undo of the delete does not restore.

**B. Keyframes must stop being absolute for clips whose start is derived.** This is the hard one.
- A derived writer must be a pure function of D. "Shift the keyframes by the delta" is not: it needs the old start.
- So as long as keyframe times are absolute (`js/scene.js:373-380`), either every ripple rewrites every follower's
  atomic `kf` lists (row 2 of §9.1 stays broken), or the keyframes do not follow the clip.
- **Two options:**
  1. Store keyframe times clip-relative.
  2. Store a per-layer origin, so a keyframe is evaluated at `t − start + kfOrigin`.
- Either way, moving a clip becomes a **single-field** change that commutes with keyframe edits.
- This is an app-wide model change (`evalProp` is fed the raw playhead everywhere). **Hand this to the model researcher.**
  It also fixes a latent move-against-keyframe-edit race between two free-layer users today.

**C. Leases must not block derived fields.**
- By reading: a lease refuses **every** op on the layer (`collab-host.js:834`, `:871-872`). That includes the derived
  `start` of a leased main-track clip.
- Every device except the lease holder then gets a refusal toast about a clip it never touched, and a transient overlap,
  until the holder's own device sends the same derived value. The owner's device would do this on every tick
  (`refuseLocal` → `revertToBase` → re-derive, `collab-session.js:1654-1659`).
- **Fix:** exempt layout-derived paths from the lease check, or have the layout writer leave a leased clip for its holder
  to write. **UNVERIFIED:** not run; the derived writer does not exist yet.

**D. Hold a mid-drag keyed list the same way as the layer stack.**
- `adoptOrder` defers only the layer list's order statement (`st.p == null`, `collab-session.js:570`).
- `heldStructural` is set only for `li/lr/mv` (`:370`).
- A finger dragging a clip along the main track (`am` on `P/mainTrack`) would have a remote reorder adopted **mid-drag**,
  and the clip would jump under the finger.
- **Fix:** extend both to any keyed array this device currently holds.

**E. The anchor fallback.**
- An insert whose anchor was deleted at the same moment lands at **index 0** (`resolveAnchor`, `collab-diff.js:131-134`).
  For a layer stack that is "on top". For a main track it is "at the very beginning of the video", which is surprising.
- **Options:** carry several anchors (as undo records already do, `firstSurviving`, `:634-645`), or fall back to the end.
  - Either changes the op shape or the resolution rule, so **bump `SCHEMA_REV`**.

**F. Presence shows each person's mode.**
- Add `mode:'simple'|'full'` to `sample()` and `cleanPr` (`collab-presence.js:236-298`), and to the roster
  (`hostRoster`, `:509-530`). Draw it on the people chip.
- **Backward-compatible without a schema bump:** `cleanPr` builds a new object, so an old build just drops the field.
- On the simple timeline, draw the free-layer user's selection on the rows they are on. On the free-layer timeline,
  outline main-track clips while `af` shows the simple user holding `P/mainTrack`, e.g. "Sam is arranging the main track".

**G. Soft locks, not hard locks.**
- The existing tools already cover the ordinary case: held/deferred plus host-stated order plus derived layout.
- A **hard** section lock would need project-path leases, which do not exist (§4.4), and would block the free-layer user
  for the length of a drag.
- **Recommend:** presence hints only. Keep hard leases for the text/mask-style tools, as today.

**H. Composite edits that remain multi-op** (split = `li` + trims; conversion).
- These can land half-applied, because a tx is not atomic (`collab-host.js:866-880`).
- **Options:**
  - send them `q:1`, so the host CAS-refuses rather than overwrites;
  - add an all-or-nothing tx flag. A new tx field is **not** in the fingerprint and an old host would ignore it silently,
    so it needs a `PROTO` bump.

**I. Undo.**
- With order as the truth, undoing an insert is `ar` + `lr`, and layout re-derives: no soft-skip holes (fixes §9.1 row 7).
- **Change undo of a main-track reorder** to move only this person's clip back after its old anchor, using the per-op
  `invert` for `am` (`collab-diff.js:626-627`) instead of restating the whole list (`:672-682`). Otherwise one person's
  undo reverts the other person's later reorder. This follows from §4.5 and is unverified.

**J. View state stays local** (§5).
- Keep the editor mode, simple-timeline zoom and scroll, and expanded sections out of `FM.scene`, or `_`-prefixed.
- Decide whether `collapsed` should stay shared.

**K. Converting a project while others are in it.**
- **Free → simple** makes the main track contiguous, which rewrites many starts. Treat it like the canvas-size change:
  - owner or editor only;
  - confirm "This changes the project for everyone" when `C.othersHere()` (`collab-core.js:401-405`);
  - one commit, so it is one undo step.
- **Simple → free** needs no data change if simple mode is "a list plus a constraint over the same layers". The list is
  kept and ignored by the free editor, or the free editor shows the main-track clips marked, and treats dragging one off
  the list as "detach to overlay".
- **Needs a UX decision:** what a free-layer user's time-drag of a main-track clip means.
  - **(a)** It reorders within the main track (magnetic, like CapCut).
  - **(b)** It detaches the clip into a free overlay.
  - Not **(c)** "free move and the layout snaps it back", which is what a derived start gives by default: the clip fights
    the finger. The engine will enforce whichever is chosen, but the free editor's drag code must know.

### 9.5 Open questions for the design step

1. **Main track as a project list or a per-layer index?** This note leans to the project list (leases do not bite, and
   `ord` handles concurrent reorders), but both converge.
2. **Clip-relative keyframes (9.4 B):** can the model researcher confirm how many places feed `evalProp` absolute time?
3. **Transitions between main-track clips (overlaps by design):** does the derived layout subtract transition lengths,
   and where is that length stored so it merges?
4. **"Connected" overlays** (Final Cut Pro style, riding with a main-track clip): store as an anchor field on the overlay
   (`attachTo:<clipId>`, `offset`), with start derived. Same pattern as A. Not analysed further here.
5. **Does the ask-to-edit / role model need a "simple-only editor" role?** Nothing in the engine requires one.

---

## Sources

- **Code:**
  - `js/collab-core.js`, `js/collab-path.js`, `js/collab-diff.js`, `js/collab-host.js`, `js/collab-session.js`,
    `js/collab-bridge.js`, `js/collab-presence.js`, `js/collab-signal.js` (`:1-39`, `:1549-1567`),
    `js/collab-link.js` (`:1-26`);
  - `js/scene.js` (`:373-380`, `:858-922`, `:1142`), `js/app.js` (`:809-880`), `js/timeline.js` (`:618-628`);
  - `tests/tests.js` (lines cited above).
- **Spec:** `COLLAB-DESIGN.md` §2 (decisions D1–D20), §5–§11, §16–§18, §20–§21.
- **Requests:** `REQUESTS.md:32694-32744` (#921), `:32745` onward (#923, the earlier log of the two-editor idea).
- **Web:** Figma, "How Figma's multiplayer technology works":
  <https://www.figma.com/blog/how-figmas-multiplayer-technology-works/>. It describes server-authoritative per-property
  last-writer-wins, fractional indexing for child order, and the server rejecting parent changes that would make a cycle.
