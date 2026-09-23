# COLLAB-DESIGN.md: FreeMotion #921 live collaboration (final spec)

Status: final design for builders. It combines the three designs and the two judge verdicts. Facts were re-checked read-only against the tree at v16.78 (working tree; last commit `618c50c8`). Line numbers are from that tree. Re-grep before editing, because the tree moves daily.

---

## 0. For Ezra (plain English, 10 lines)

1. You press **Share** on a project and send a link, or read out a 9-letter code. Friends tap it and land in the **same project**, live, on a phone or a PC.
2. Everyone sees everyone else's changes as they happen. You also see where they are: a coloured outline on the layers they have selected (several at once too), their pointer or taps, their playhead, and a row of faces for who is in.
3. **Your device is the "server".** Nothing of ours runs in the cloud. A free public "phone book" only helps the two devices find each other. It sees an address, never the project. A **codes-only** mode skips even that.
4. Roles work like Google Docs: **Editor, Commenter, Viewer**. You control everything: roles, removing people, ending the session. By default you approve each person before they get in.
5. Everyone can export on their own device. Leaving keeps a normal copy for them. Your own projects and theirs are never overwritten.
6. **Undo only undoes your own changes**, like Docs. It never wipes out a friend's work.
7. If someone's phone locks or drops out, they keep editing and it syncs when they're back. If their change clashes with a newer one, they're told, and they can save their version as a copy.
8. It stays hidden behind **Settings → Labs** until you have tried it on your Mac and iPhone. With it off, the app behaves exactly as today.
9. A save point is written before every session, and "Earlier versions…" can bring one back as a new project. A git tag is made before the first line of code.
10. Default limit is **8 people** (12 on a PC host, 6 on a phone host). Unlimited would need a real server.

---

## 1. His clauses → where each is handled

Source: REQUESTS.md #921, lines 32667 onwards. **Every clause must be ticked in that entry, one at a time, as its stage ships.**

| # | Clause (short) | Spec sections | Stage |
|---|---|---|---|
| 1 | Share a project live, both edit at once | §5–§11 | S2 (engine), S3 (real devices) |
| 2 | See what others do, change and click | §18 presence, §8 live ops | S5 |
| 3 | Their selection (and multi-select) shows for you | §18.3–18.4 | S5 |
| 4 | Who is inside the project | §18.5, §19 | S3 (list), S5 (avatars) |
| 5 | More than two people, sensible limit | §21 | S2 |
| 6 | No servers if possible, and say what still needs a third party | §14, §2 decision D3 | S3 (codes), S6 (relay) |
| 7 | PC ↔ mobile | §13, §14 | S3 |
| 8 | Seamless and easy on a phone | §14.2, §19.2, §19.7 | S6 |
| 9 | Its own Docs-style settings menu | §19.1 | S3, then S7 |
| 10 | Owner has full control | §16, §19.1 | S7 |
| 11 | Others can export and do whatever they want as editors | §16, §15.8 | S4, S7 |
| 12 | Viewer / Commenter / Editor | §16, §17 | S7 |
| 13 | Name and colour now, accounts later | §18.1 | S3 |
| 14 | Fully fledged | all | S0–S8 |
| 15 | Other agents verify it | §25, §26 | every stage, S8 |
| 16 | Don't break solo editing | §23 | every stage |
| 17 | Backups first; his projects are never overwritten | §24, §12 | S0, S2 |
| 18 | Not supervising: decide, write it down, show pictures | §2, §27, LOOP rule 16 | every stage |

---

## 2. Decisions made for Ezra (he is not supervising)

These follow LOOP.md rule 16. Each decision is appended to the #921 entry when the stage that relies on it ships. Visual decisions ship behind Labs, and the picture goes to him with the alternatives named.

| # | Decision | Reason |
|---|---|---|
| D1 | **Star topology.** The owner's device is the only sequencer. Guests connect only to the owner. **No host migration.** | "Runs off one person's thing", and the owner has full control. Electing a new authority needs consensus we do not have. |
| D2 | **Observer-diff engine, not a CRDT or Yjs.** Each device compares the live `FM.scene` against a plain-JSON `base` and turns differences into path ops. | It works with the 215 existing commit sites and about 20 live-write paths without touching any of them, and it catches paths nobody listed. Judge 1 scored it the best fit for the code. |
| D3 | **Connecting.** Encrypted envelopes go through public relays: PeerJS cloud on port 443, plus two public MQTT brokers, all in parallel. A **"Codes only"** mode exchanges connection codes by copy/QR and needs no third party. **No TURN.** | This is the only way to make the iPhone's frequent reconnects painless. Relays see IP addresses and timing only. Everything is behind Labs, so nothing leaves the device until he opts in. Relay versus codes-only is also Q1. |
| D4 | People limit: **8 by default**, up to **12 on a PC host**, **6 on a phone host**. | The host uploads every file to every joiner and fans out every change. |
| D5 | **Ask the owner before anyone joins** is on for links and always on for codes. A known member rejoining skips the ask. | Without accounts, a link can be forwarded. |
| D6 | **Undo covers your own changes only**, and only where nobody has changed the same thing since. | Docs behaviour. Solo undo would otherwise erase guests' work. |
| D7 | **Guests keep editing while offline.** On reconnect each queued change is a compare-and-set against the value that guest saw. Clashes are counted and shown, with **[Save my version as a copy]**. Nothing is lost silently. | Judges: offline loss must be bounded and visible, and arrival order must not overwrite newer work. |
| D8 | **Leave defaults to "Keep my own copy"**: the copy is re-id'd into a normal project. | His words: "export and do whatever they want". Re-id prevents IndexedDB key collisions with later sessions. |
| D9 | **Comments live in a separate `project.comments` list**, not in notes. | A note with `remind` blocks export (`notepad.js:36`). Other people's comments must never interrupt his exports. |
| D10 | Editors may change canvas size and fps, after a confirm: "This changes the canvas for everyone". | "Do whatever they want" as editors. |
| D11 | **Viewers and commenters can export** (owner toggle, default on). The UI says honestly that this cannot be enforced. | His words. |
| D12 | **Editors can invite** is off by default. | No accounts yet. |
| D13 | **Compatibility is by `PROTO` and `SCHEMA_REV`, not by exact app version.** A test forces a `SCHEMA_REV` bump whenever the sanitizer, derived writes, fx parameter definitions or op grammar change. | He ships 20–30 builds a day, and exact-version gating would make joining nearly impossible. |
| D14 | Collab scripts load **eagerly** as ordinary `<script src="js/collab-*.js?v=N">` tags. They are inert until a session starts. QR libraries are lazy. | `ship.sh`'s cache-buster gate (`tools/ship.sh:376-400`) only watches files referenced in index.html. The service worker caches `?v=` files offline. Fewer moving parts. |
| D15 | **Keyframe lists are one atomic value per property.** Text and captions are last-writer-wins, with **leases**: one person at a time per layer in the text and exclusive tools. There is no character-level merge. | Concurrent keyframing of the same property is rare. Leases also cover the draw tool's private undo stack and `erasedLayer`. |
| D16 | **Stable `uid` on effects, audioFx and behaviors.** It is stamped only while a session runs, and the three sanitizers are taught to keep it. | This removes index and occurrence guessing, which both judges named as a divergence source. With no uid, solo output is byte-identical (parity test). |
| D17 | Identity is a local `fm.profile = {mk, name, color}`. `mk` becomes the account id later. | Clause 13. |
| D18 | **The presence chip sits on `#stage` top-left** on both layouts, not in the phone top bar. PC also gets `#btn-share` in `#t-far`. | The phone top bar has about 85 px to spare and the notes/cog gap is signed off (#189). The chip also stays visible while editing. |
| D19 | **Follow** mirrors playhead and play state and scrolls the timeline to their layer. It does **not** mirror selection or viewport. | PC framing is wrong on a phone, and mirroring selection risks editing the wrong layer (the queue-629 reasoning). |
| D20 | Everything ships behind **Settings → Labs → "Live collaboration (preview)"**, default off, until he has done the two-device check. | Rule 16 plus "try not to break the thing". Only he can do the real-device check. |

---

## 3. Architecture

```
            ┌────────────── OWNER (host) ────────────────────────┐
 local UI → │ FM.scene (live) ─diff→ ops ─▶ Host.sequence()      │
            │      ▲                  │   role/lease/CAS/resolve │
            │      │ in-place apply   ▼   sanitize-on-clone      │
            │      └── base (authoritative JSON) ─ seq++ ─ ring  │
            └──────────────┬──────────────────────┬──────────────┘
                   ack/b   │ ctl pres bulk        │  b
            ┌──────────────▼───────┐      ┌───────▼──────────────┐
            │ GUEST A              │      │ GUEST B              │
            │ live ─diff→ tx ─────▶│      │ (same engine)        │
            │ base = confirmed +   │      │                      │
            │        pending       │      │                      │
            └──────────────────────┘      └──────────────────────┘
```

### Glossary (used everywhere below)

- **D** is the synced document: `{project minus denylist, layers}` (§5.1).
- **live** means the objects in `FM.scene`. The app keeps mutating them exactly as today.
- **base** is a plain-JSON tree for D.
  - On the host it is authoritative.
  - On a guest it is the host-confirmed state plus that guest's own outstanding ops.
- **op** is one path-level change (§6).
- **tx** is a guest's batch sent to the host. **b** is the host's broadcast batch. **ack** is the host's reply to the sender.
- **seq** is the host's batch counter. It resets when **epoch** changes; epoch is a random id per host page lifetime.
- **cid** is a guest's tx counter.
- **mid** is a member id. `'o'` is always the owner.
- **pending** means a guest's sent-but-unacknowledged ops, keyed by path.
- **outbox** means ops made while offline and not yet sent.
- **held** means paths this device changed during the current local interaction.
- **deferred** means remote values that arrived for held paths.
- **step** is one undo unit: the local ops between two `history.commit()` calls.
- **frozen** is true while `FM._exporting` is set. **busy** is true while an async job runs or history is muted.

---

## 4. Files

### 4.1 New files

All are plain classic scripts that attach to `window.FM`. There is no module system.

| File | Namespace | Contents (≈ lines) |
|---|---|---|
| `js/collab-core.js` | `FM.collab` | Constants (§21), `PROTO=1`, `SCHEMA_REV`, `SCHEMA_FP` and its fixture, and flags (`active`, `role`). Hook entry points (all no-ops while inactive, listed in §23). Stashes `#j=` into `fm.pendingJoin` at load. Loads `tests/collab-agent.js` under the test gate (§25.3). `fm.profile` helpers. (≈250) — **S1 ships only the constants and the fingerprint; the file must be INERT.** The `#j=` stash needs a join flow (S3) and the agent loader needs the agent to exist (S2); shipping either now would mean a localStorage write and a 404 `<script>` on every load for a feature nobody can reach. |
| `js/collab-path.js` | `FM.collab.path` | Path grammar, escaping and validation. `canon()` (sorted-key JSON with JSON semantics). `cyrb53()`. `eq()` (leaf equality). Keyed-array rules. `stampIds()`. (≈300) |
| `js/collab-diff.js` | `FM.collab.diff` | `diffDoc(base, live, opts)` returns `{ops, recs, orders}`. `apply(target, op)` in place. `applyOrder` / `orderStatementsFor` (§8.3a). LIS reorder. Inverse builders (`invert` per op, `invertStep` per step — §10.2). (≈650) |
| `js/collab-host.js` | `FM.collab.Host` | Sequencer pipeline (§7), member table, role filter, leases, CAS, invariants on clones, ring, `lastBy`. Pure: it takes a DocAdapter. (≈650) — **`invariants {layer, project, layers}` is REQUIRED and a missing hook throws at construction**, because a host that runs without them sequences documents no sanitizer ever saw, converges perfectly, and proves nothing. S1's `project` hook is the suite's clamp: `clampProjectDims` is private to storage.js and S1 may not move that file's `?v=`; S2's bridge exposes the real one. |
| `js/collab-session.js` | `FM.collab.Session` | Per-device engine: tick scheduler, commit hook, receive rules (§8), undo (§10), hash and resync (§11.4), offline outbox, persistence, link state machines (§12). Pure: it takes a DocAdapter plus a Link. (≈950) |
| `js/collab-bridge.js` | `FM.collab.bridge` | The FM.scene DocAdapter: `normalizeDerived`, `interacting()`, busy and frozen detection, `afterApply` (§8.6), refresh scheduling, interaction tracking listeners (installed only while active). (≈450) |
| `js/collab-link.js` | `FM.collab.link` | Link interface. `LoopLink` (in-page) and `PostLink` (postMessage, used only by tests). `RtcLink` (RTCPeerConnection, 3 channels, framing, backpressure). Minimal-SDP codec. (≈600) |
| `js/collab-signal.js` | `FM.collab.signal` | WebCrypto (HKDF, AES-GCM, HMAC, PBKDF2). Invite link and code codec. Envelope. `PeerJsDriver`, `MqttDriver`, `FakeDriver` (tests). Auth handshake. (≈650) |
| `js/collab-media.js` | `FM.collab.media` | Manifest, want/have, bulk transfer, IndexedDB parts, resume, sameAs, replace/prev, fonts, storage checks, GC. (≈650) |
| `js/collab-presence.js` | `FM.collab.presence` | `pr`/`PR` messages, canvas overlay, timeline paint, remote playheads, people chip, inspector chip, follow, lease UI. (≈750) |
| `js/collab-ui.js` | `FM.collab.ui` | Share panel, Join sheet, knock card, banner, profile prompt, iOS landing card, Home hooks, Settings Labs rows. (≈1100) |
| `js/collab-comments.js` | `FM.collab.comments` | Comments card, composer, ruler marks. (≈400) |
| `vendor/qrcode-generator.js` | global `qrcode` | MIT, about 20 KB, loaded lazily with `?v=1`. |
| `vendor/jsqr.js` | global `jsQR` | Apache-2.0, about 130 KB, loaded lazily with `?v=1` (S8). |
| `tests/collab-agent.js` | test-only | RPC agent (§25.3). The app loads it only under the localhost + `fmtest=collab` gate. |
| `tests/_collab-probe.html` | test-only | Stage-0 probes (§28). |

**Styles:** add a `/* ═══ COLLAB (#921) ═══ */` section at the end of `styles.css`, plus glass overrides in `theme-glass.css`. **Do not create `collab.css`.** The buster gate only watches `styles.css` and `theme-glass.css`.

**index.html:**
- Add `<script src="js/collab-core.js?v=1">` directly after `js/settings.js` (line 1017).
- Add the other `js/collab-*.js` tags at the end of the script list, before the inline service-worker block.
- Also add an inline constant listing the lazy vendor URLs, for example `<script>window.FM_COLLAB_LAZY={qr:'vendor/qrcode-generator.js?v=1',scan:'vendor/jsqr.js?v=1'}</script>`, so they are versioned in one visible place.

### 4.2 Changes to existing files

Every change is a guarded one-liner or a behaviour-identical extraction (§23).

| File | Function / line | Change | Stage |
|---|---|---|---|
| `js/history.js` | `restore()` (:31-100) | Extract the post-swap block (629 selection rule, `restoreReplacedMedia`, groupContext exit, `maskTool.resync`, time clamp) into `FM.history._afterExternalChange(wasSelected, {pause:true})`. `restore` calls it with `pause:true`; collab calls it with `pause:false`. | S0 |
| `js/history.js` | `commit()` (:137) | After the mute check and **before** `snap()`: `if (FM.collab && FM.collab.active) FM.collab.beforeSnap();`. After the push, right before `autosave`: `if (FM.collab && FM.collab.active) FM.collab.afterCommit();`. | S0 |
| `js/history.js` | `undo()` / `redo()` (:161-162) | First statement: `if (FM.collab && FM.collab.undoActive()) return FM.collab.undo();` (and `redo()` likewise). | S0 |
| `js/history.js` | `syncButtons()` (:98) | When `FM.collab && FM.collab.undoActive()`, `canU`/`canR` come from `FM.collab.canUndo()` / `canRedo()`. | S0 |
| `js/history.js` | `reset()` (:126) | At the end: `if (FM.collab) FM.collab.onReset();`. | S0 |
| `js/history.js` | new | `_snapshotsUpTo()` returns `stack.slice(0, index + 1)` (seeds pre-session undo). | S0 |
| `js/storage.js` | `sanitizeAudioFx` (:648), `sanitizeBehaviors` (:728), `sanitizeEffects` `out` (:959) | Keep `uid` when `typeof uid === 'string' && /^[a-z0-9]{4,16}$/.test(uid)`, including container children. | S0 |
| `js/storage.js` | `pruneOrphans()` (:1971, skip at :2009) | Never delete keys starting with `collab:`. Add the layer ids found in every `collab:ckpt:*` value to `keep`. | S0 |
| `js/storage.js` | `projects.remove()` (:1937) | Never delete an IndexedDB record whose key is a layer id in another `fm.proj.*` doc. Delete `collab:ckpt:<id>:*` and `fm.collab.host.<id>`. | S0 |
| `js/storage.js` | `projects.duplicate()` (:1842) | Factor the body into `projects.duplicateFrom(doc, {name, srcIds})`. `duplicate(id)` calls it; behaviour unchanged. | S0 |
| `js/storage.js` | `flushSync()` (:389) | First: `if (FM.collab && FM.collab.active) FM.collab.beforeFlush();`. | S0 |
| `js/storage.js` | `releaseUnreachableMedia` (:1651) | After the snapshot loop: `if (FM.collab && FM.collab.reachable(id)) return;`. | S0 |
| `js/storage.js` | new | `projects.createLinked(meta, D)` and `projects.detachLinked(gpid)` (§12). | S2 |
| `js/timeline.js` | `rebuild()` (:4832) | Extract the loopMode line into `FM.timeline.inheritLoopModes()`; `rebuild` calls it. | S0 |
| `js/timeline.js` | new | `FM.timeline.timeToX(t)`, which returns `HEAD_W + PAD + t*pxPerSec()` in `#tl-inner` coordinates. | S0 |
| `js/timeline.js` | new | `FM.timeline.onRebuilt(fn)`: listeners called at the end of every real rebuild, not a deferred one. | S0 |
| `js/canvas-edit.js` | `update()` (:711-808) | Extract the geometry into `FM.canvasEdit.boxFor(layer, t)`, which returns `{cx, cy, w, h, rot, skewX, skewY, wrapLocal:true}`. `update()` uses it with zero behaviour change. | S0 |
| `js/scene.js` | new | `FM.normalizeGroupOrder(layers)` returns an id array, or `null` when the order is already valid (§11.3). | S0 |
| `js/app.js` | new | `FM.jobBegin(label)` returns a TOKEN that `FM.jobEnd(token)` hands back; `FM.jobDepth()` is how many are open. A 20 s watchdog measures SILENCE — it re-arms on every begin and end, so a nested batch that keeps making progress is never cut — and force-clears only the entries whose own age ran out, reporting them to `fm.lastJobWarning` (never `fm.lastError`, which is the one report he is told to Copy and send). | S0 |
| `js/app.js` | job bracketing | `const job = FM.jobBegin(); try { … } finally { FM.jobEnd(job); }` around the bodies of `duplicateLayer` (:3558), `duplicateSelection` (:3612), `pasteClipboard` (:3678), `splitLayer` (:4000), `replaceMediaWith` (≈:3808), `templates.insertInto`, `elements.insert` (storage.js), and ai-chat `applyTurn` (ai-chat.js:121). | S0 |
| `js/app.js` | `deleteLayer` (:2999-3035) | Extract the per-layer playback teardown (≈:3025-3033: pause and mute the element, `clearFrameCache`, `clearClipStrip`, `audioFxLive.release`, and the audio restart when playing) into `FM.teardownLayerPlayback(id)` and `FM.restartAudioIfPlaying()`. | S0 |
| `js/app.js` | new | `FM.cancelGesturesOn(layerId)` (§8.7). | S0 |
| `js/app.js` | `warnOversizeProject` (:2493) | First: `if (FM.collab && FM.collab.isGuest()) return false;`. | S0 |
| `js/app.js` | `render()` (:94-106) | After `FM.canvasEdit.update()`: `if (FM.collab && FM.collab.active) FM.collab.presence.onRender();`. | S0 (hook), S5 (body) |
| `js/app.js` | `pcTransportLayout` far list (:6505) | Insert `'btn-share'` before `'btn-export'`. | S3 |
| `js/app.js` | canvas dialog apply (≈:7117) | When a session is live: `await FM.ask({title:'Change the canvas for everyone?', …})`. | S7 |
| `js/app.js` | `showExportDialog` (:4552) | Media-missing and role checks (§15.8). | S4 |
| `index.html` | `controllerchange` handler (:1098) | First: `if (window.FM && FM.collab && FM.collab.active) { FM.collab.deferReload(); return; }`. | S0 |
| `index.html` | `#topbar` | Add `<button id="btn-share" class="hidden" aria-label="Share">` (with svg) next to `#btn-export`. | S3 |
| `js/home.js` | card menu (:1283-1340), `.hm-top` (:2604-2616), `projectCard` (:1254) | Menu items, `#hm-join-btn` and `.hm-live` badge, all behind Labs (§19.6). | S3 |
| `js/settings.js` | `DEFAULTS` (:14), `build()` | Keys `collabLabs:false`, `collabCursors:true`, `collabSelections:true`, `collabCodesOnly:false`, plus the Labs group rows (§19.8). | S3 |
| `js/mobile.js` | none | No change. The phone entry is the stage chip. | — |
| `tests/tests.js` | | All collab tests (`prove.sh` reads only this file). | every stage |
| `tests/_cdp.py` | | Only if Stage 0 finds headless mDNS host candidates flaky: add `--disable-features=WebRtcHideLocalIpsWithMdns`. | S3 |

---

## 5. The synced document

### 5.1 What syncs: everything, minus a denylist

- `D.project` is `FM.scene.project` **minus** `ofTemplate, ofTemplateRev, ofElement, returnTo, fromTemplate` (the owner's workspace pointers).
- `D.layers` is `FM.scene.layers`.
- Never synced:
  - `selectedId` and `selectedIds` (they become presence);
  - every key starting with `_`, at any depth (the same rule as `FM.jsonReplacer`, `scene.js:729`);
  - all session state (`FM.time`, `FM.playing`, `FM.addAt`, `FM.viewport`, `FM.groupContext`, and so on).
- A new layer field syncs with no code change. **Never convert this into an allowlist** (see the memory note "whitelist drift").

### 5.2 Paths

- **In memory** a path is an array of segments. **On the wire** it is a string: segments joined with `/`, where each segment escapes `~`→`~0` and `/`→`~1`.
- **Roots** are `P` (project) and `L`. The segment after `L` is a layer id.
- **Object key segment:** must match `/^[A-Za-z$][\w$]{0,63}$/`, must not start with `_`, and must not be `__proto__`, `constructor` or `prototype`.
- **Keyed element segment:** `#i:<id>` for elements keyed by `id`, or `#u:<uid>` for elements keyed by `uid`. Keys must match `/^[\w.-]{1,64}$/`.
- **Numeric index segments do not exist.** An array is either keyed or atomic.
- Example: `L/layer_1k2m3_ab12x/effects/#u:k3f9a2qz/params/amount`.

### 5.3 Keyed and atomic arrays

The rule is evaluated identically on every device.

1. An array stored under a key in `KEYED = {effects:'uid', audioFx:'uid', behaviors:'uid', masks:'id', notes:'id', comments:'id', replies:'id'}` is keyed by that field. This applies at any depth, including `effects[].effects`.
2. Otherwise, if every element is an object with a unique string `id`, the array is keyed by `id` (future-proofing).
3. Otherwise the array is **atomic** and is set as a whole. This covers keyframe lists `kf`, `subs`, `points`, mask `path`, `captions` (including cue effects), `markers`, `crop` sub-arrays, `bez`, and everything else.

**⚠️ Rule 3's names are checked BEFORE rule 2 (S1 correction).** As written, rules 2 and 3 contradict each other: none of `kf`, `subs`, `points`, `path`, `captions`, `markers`, `bez`, `crop` carries an `id` today, so they agree today — but the day anyone adds one (a caption-cue id for the ruler marks, say) rule 2 would silently promote that array to element addressing and the atomic guarantee this section leans on would be gone from a list this section calls atomic. `FM.collab.path.ATOMIC` holds the names and is consulted first. Naming an array atomic costs a whole-value set; naming it keyed costs data.

**A declared key field that is missing or duplicated on any element makes the array atomic for that diff** rather than producing two ops addressing the same place. `stampIds` repairs the document on the next tick and it becomes keyed again.

An atomic value is always safe: it can lose a concurrent edit to a sibling element, but it never drops data.

### 5.4 Stamping uids: `FM.collab.path.stampIds(scene)`

- Runs **before every diff and before every remote apply**, and only while a session is active.
- For each uid-keyed array: any element without a valid `uid` gets `uid = 8 random base36 characters`.
- Within one array, a duplicated uid (from duplicating an effect, copy-paste or a preset) is re-stamped on the **later** occurrence.
- Solo projects never gain uids. Uids left in a doc after a session are inert. The S0 parity test proves uid-less sanitizer output is byte-identical to HEAD.
- **S1 must grep for any code that compares effect objects by `JSON.stringify` or enumerates their keys**, and must add a test showing an extra `uid` changes none of those results.

### 5.5 Leaf equality: `FM.collab.path.eq(a, b)`

- Uses JSON semantics: NaN and ±Infinity equal `null`, `-0` equals `0`, `undefined` equals absent.
- Objects are compared through `canon()`: sorted keys, `_` keys skipped.
- **An op whose value already equals the target is a no-op.** It is not sequenced, echoed or recorded. That is what makes deterministic derived writes converge without traffic (§11.1).

---

## 6. Ops, diff and apply (`js/collab-diff.js`)

### 6.1 Op grammar (exact JSON)

| `o` | Fields | Meaning |
|---|---|---|
| `s` | `p`, `v` | Set the value at `p`, creating the key if absent. `v` is any JSON value. |
| `d` | `p` | Delete the key at `p`. |
| `li` | `id`, `a`, `v` | Insert **or upsert** layer `id` directly after layer `a` in `layers`. `layers[0]` is the top of the stack; `a:null` means index 0. |
| `lr` | `id`, `f?` | Remove the layer. `f:1` means force past a lease (§17.3). |
| `mv` | `id`, `a` | Move the layer to directly after `a`. |
| `ai` | `p` (array path), `k` (keyed segment), `a` (keyed segment or null), `v` | Insert or upsert an element after `a`. |
| `ar` | `p` (element path) | Remove an element. |
| `am` | `p` (element path), `a` | Move an element after `a`. |

- An **outbox (queued) op** also carries `b`: the value the author saw before the op, with `undefined` sent as `{"$u":1}`.
  - For `lr` and `ar`, `b` is replaced by `bh` = `cyrb53(canon(element))`.
- `s`, `d`, `ai`, `ar` and `am` are "leaf-ish". `li`, `lr` and `mv` are **structural**. So are `ar` and `am` for the purposes of §8.3.

### 6.2 `diffDoc(base, live, {hot})` returns `{ops, recs}`

Ops are emitted in this order. Applying them in order to `base` reproduces `live` exactly; this is a Tier-1 property test.

1. **Removed layers:** for each id in base but not in live, emit `lr`.
   - rec: `{b: layerJSON, anchors: [up to 5 ids above it in base]}`.
2. **Order:**
   - Compute the LIS (longest increasing subsequence) of the common ids by their base index.
   - Walk live **top to bottom**. For a new id, emit `li{id, a: previous id in live or null, v: clone}`. For a common id not in the LIS, emit `mv{id, a: previous id in live}`.
   - rec for `mv`: `{aBefore: previous id in base}`.
3. **Per common layer:** a deep diff (§6.3).
   - With `hot` set, only layers in the hot set are deep-diffed. The id list is always compared.
   - A per-layer fast path (`JSON.stringify(layer, FM.jsonReplacer)` compared with a cached base string) is allowed. Correctness must not depend on it.
4. **Project:** a deep diff of `P`.

### 6.3 Deep diff: `diffNode(path, b, l)`

- Both values are plain objects: recurse over the union of keys, skipping `_` keys.
  - A key only in base gives `d`.
  - A key only in live gives `s`.
- Both values are keyed arrays of the same mode: run the same removed / LIS / new / moved algorithm, producing `ar`, `ai` and `am`, then recurse into common elements.
- Anything else (atomic array, primitive, or a type change such as static ↔ `{kf}`): if `!eq(b, l)`, emit `s{p, v: clone(l)}`.
- Each emitted op gets a rec `{b: clone(value in base before)}`. The session merges recs per step (§10.1).

### 6.4 `apply(target, op)` in place

It returns `'ok' | 'noop' | 'gone' | 'bad'`. `target` is either `base` (plain JSON) or live (via the adapter's `doc()`).

- **Resolve** by walking segments. A keyed segment finds the element by its key field. A missing container gives `'gone'`.
- **`s`:** if `eq(current, v)`, the result is `'noop'`. Otherwise:
  - object into object: `patchObject(existing, v)` recursively. Keys missing from `v` are deleted, **except `_` keys**.
  - array into array: `existing.length = 0; existing.push(...clone(v))`, which keeps the array identity for the mask-tool alias (`mask-tool.js:73,104`) and for `kfDrag`.
  - anything else: assign a clone.
- **After an `s` or `d` on a live layer:** delete the own `_`-prefixed keys of the written object and of the layer object, except `_expanded`. This is the same thing undo does to every layer and is known to be safe; it invalidates runtime caches such as `_wrapCache`.
- **`li`:** if the id exists, `patchObject(existing, v)` and then move it after `a`. Otherwise `splice` a clone in. If `a` is missing, the fallback is `a = null` (top). The host resolves this and broadcasts the anchor it actually used.
- **`lr`:** `splice` the layer out.
  - On live, first call `FM.teardownLayerPlayback(id)`.
  - The IndexedDB record and `FM.media` entry are kept, as `deleteLayer` keeps them for undo.
- **`mv`:** splice out and reinsert after `a`, with the same fallback as `li`.
- **`ai`, `ar`, `am`:** the same as `li`, `lr` and `mv`, inside keyed arrays.
- **`FM.scene.layers` is never reassigned.** Only `splice` is used.

---

## 7. Host sequencer (`FM.collab.Host`)

### 7.1 Per incoming guest `tx`, in this exact order

1. **Validate the message.** Size ≤ 4 MB, ops ≤ 5000, every path valid (§5.2), numbers finite, strings within caps (§21). Any failure rejects the whole tx: `ack{cid, seq:null, rej:[['*', 'bad']]}`, plus a diagnostics entry.
   - **No bare-root writes (S1):** an `s` or `d` whose path is just `P` or `L` is refused. `s{p:['L'], v:[…]}` is the one op that could put two layers with the same id into base, after which every id-keyed walk in the app is ambiguous. Nothing the diff emits is ever a bare root, so refusing them costs nothing. With that closed, and because `li` **upserts** by id, a repeated layer id is unreachable through this pipeline.
2. **Rate limit.** Token bucket of 30 tx/s with a burst of 60. Over the limit, drop the tx and flag the member in the roster.
3. **Dedupe.**
   - If `cid ≤ lastCid[mid]` and an ack is cached (the last 64 per member), resend that ack.
   - Otherwise, if `cid ≤ lastCid`, ignore the tx.
4. **Role filter per op** (§16.2). A failure goes into `rej` with `'role'`.
5. **Lease filter per op.** An op under `L/<id>` where the lease is held by another member goes into `rej` with `'lease'`, unless it is an `lr` with `f:1`.
6. **CAS for `q:1` txs, per op** (§13.3):
   - the current base value equals `b` (or `bh` matches): accept;
   - the current value equals `v`: `'noop'`, counted as success;
   - otherwise: add to `lost` with `'clash'`.
7. **Resolve and apply to base.**
   - `'gone'` goes into `rej` with `'gone'` (for `li`, use the fallback anchor instead).
   - Record the **resolved** op, with the anchor actually used.
8. **Invariants, on clones only; never on live.** For each touched layer (and the project, if touched):
   - `c = clone(base layer)`, then `FM.storage._sanitizeLayers([c])`, then `fix += diffNode(path, baseLayer, c)`.
   - Project: `clampProjectDims` on a clone, then diff.
   - Whole layer list, if any structural op or `parent` write happened:
     - `FM.repairParentCycles({layers: clone(base.layers)})`, then diff the `parent` fields;
     - `FM.normalizeGroupOrder(base.layers)`; a non-null result becomes `mv` fixes (LIS method).
   - Apply `fix` to base.
9. **Apply resolved ops plus fix to host live** under the receive rules (§8). The host's held paths are deferred; frozen or busy queues the live application; **base has already advanced**.
10. `seq++`.
    - Append `b{seq, by:mid, ops, fix, ord?}` to the ring (last 2000 batches or 8 MB). `ord` is the order statement (§8.3a), present only when the batch reordered something.
    - Update `lastCid[mid]` and `lastBy`.
    - For each accepted op, record `lastW[pathKey] = {seq, by}` (diagnostics only).
11. **Send.**
    - To the sender: `ack{cid, seq, ops, fix, rej, lost}`, where `fix` also contains the current host value for every rejected or lost path.
      **It names the deepest ancestor that still exists (S1).** If the refusal was `'gone'` because the *effect* the path runs through was deleted, then `d` on `…/#u:x/params/amount` is a lie about where the change is — and on a device that still holds that effect it would delete a real parameter. The truthful statement is `ar` on the element (or `lr` on the layer).
    - To every other member: `b{seq, by, ops, fix, ord?}`.
12. `FM.storage.autosave()`. **Required:** autosave is otherwise called only from commit, undo and redo (`history.js:158-162`).

### 7.2 The host's own local ops

The host's diff output skips steps 1–6 and runs steps 7–12 with `by:'o'`. Leases still apply: an owner op on a guest-leased layer is rejected locally with the toast "Sam is editing this — [Take over]". **Take over** revokes the lease.

### 7.3 Normalization on arm (host)

On arm, the host normalizes, pre-sanitizes on a clone, and applies any difference as an ordinary owner step labelled "Tidy-up for sharing" (§12.1 step 4). After that, base is a fixed point of the sanitizer, so the guests' defensive sanitize changes nothing and hashes match. **A Tier-1 test pins sanitizer idempotence.**

---

## 8. Receive rules: "the last person to let go wins"

### 8.1 Guests: pending

- Every op a guest sends is applied to its own base immediately, and **an `s` or a `d`** is recorded as `pending[pathKey] = cid`.
  **⚠️ Only `s` and `d` (S1 correction, found by the convergence fuzz at round 214 of 300).** A `mv`/`li`/`lr` has no path of its own — its key is the layer, `L/<id>` — so recording it marks that layer's whole subtree as pending, and the skip rule below then throws away every remote content op underneath it, in base as well as live, with nothing to bring them back: while my drag of a clip is in flight, your rename of it, your mask edit and your slider all vanish. A structural op claims a **position**, which §8.3a and the ack echo settle; only `s` and `d` claim a **value**, which is what "the last person to let go wins" is about.
- `ctl` is ordered, and the host processes txs sequentially. So when a remote `b` touching a pending path arrives before our `ack`, **the host sequenced theirs before ours**, and our value will win.
- Therefore **a remote non-structural op whose path overlaps a pending path is skipped in both base and live.**
- "Overlaps" means one path is a segment-prefix of the other, in either direction. The judge's descendant case is covered.

### 8.2 Every device: held and deferred

- While `bridge.interacting()` is true (§8.8), every path emitted by a local diff joins **held**.
- A remote op whose path overlaps a held path is applied to **base only**. The value is stored in `deferred[pathKey]` and live is left alone, so nobody's slider jumps under their finger.
- **Release** happens at the commit hook (`beforeSnap`), or at settle (interaction ended with no commit). For each held path that has a deferred value:
  - **Rolled back** (the live value equals the step's recorded `b`, as after `restoreGestures` at `timeline.js:541` or a pinch cancel): adopt the deferred value into live. Nothing is sent.
  - **Otherwise: re-assert.** Emit `s{p, v: live value}` even if it equals base. The host then sequences it last, so everyone converges on the value of whoever let go last.
- **Rejected paths** (lease or role) are put into `forced` and applied to live at release regardless, with a toast.
  **This is not cosmetic, and S2 measured why.** The ack already carries the host's value for every refused path (§7.1 step 11) — but a HELD path does not take it, because that is what held *means*. So without the `forced` exception the live value still differs from base at release, the re-assert fires, the host refuses it again, and **a viewer who merely rests a finger on a slider produces a tx every hundred milliseconds for as long as they hold it.** Dropping the held entry along with it is the half that stops the loop.
- Then `held`, `deferred` and `forced` are cleared.

### 8.3 Structural ops always win

When `lr`, `ar`, or an `s` that replaces an **ancestor container** of a pending or held path arrives:

- apply it to base **and** live;
- drop the pending and held entries underneath it;
- call `FM.cancelGesturesOn(layerId)` for every affected layer that is held or leased locally;
- show the toast "Sam deleted 'Title'".

`li`, `mv`, `ai` and `am` never conflict with pending content edits; they only move things.

### 8.3a Order is stated, not merged (S1 correction)

**Two relative moves made at the same moment do not commute, so ops alone do not converge.** Measured, from `A,B,C`:

| | |
|---|---|
| I drag A below C | `mv{A, a:C}` → my list `B,C,A` |
| you drag C above B | `mv{C, a:A}` → host `A,C,B` (sequenced first) |
| I apply yours to mine | `B,A,C` — host applies mine → `C,A,B` |
| my ack re-applies mine | `B,C,A` — host stays `C,A,B` |

Both devices are then certain and they disagree, neither produces another op, and the only thing that would ever notice is the 10-second divergence hash (§11.4) — i.e. his layer stack sits visibly wrong until a background timer happens to look.

So: **a batch that contains any order op also states the resulting key order, and the receiver adopts it.** `b` and `ack` carry `ord: [{p, f, k:[keys…]}]`, one entry per array the batch reordered (`p:null` is the layer list). The receiver applies the batch's ops, then rewrites only the slots holding a key the statement mentions — anything it has and the host does not (a layer it just made and has not sent) keeps its slot. The host is authoritative about order anyway; this says so instead of hoping relative moves commute. It costs an id list only on batches that actually reorder, never on a slider tick, and the sender's own pending move is re-applied by its ack immediately afterwards, so the last person to let go still wins.

**S2:** the bridge must defer an adoption while the layer list is HELD (§8.2), or the stack jumps under a finger that is mid-drag.

### 8.4 Flush before apply

Before applying any remote message, the device runs, in order:

1. `FM.flushPendingCommit()` (the 400 ms camera-wheel debounce, `canvas-edit.js:674`);
2. a hot-set diff tick.

This turns any local in-flight change into a pending or held path before remote values land.

### 8.5 Our own ack

1. Remove the pending entries for `cid`.
2. Apply `ack.ops` and `ack.fix` to base. Apply them to live except on paths that are held or pending under a **later** cid. This is the "echo re-apply" that repairs any host-side resolution difference.
3. If `lost` or `rej` is non-empty, go through §13.4 (offline clash) or show the role or lease toast.

### 8.6 After applying a batch: `bridge.afterApply(summary)`

1. Selection repair uses `FM.history._afterExternalChange(wasSelected, {pause:false})`: the queue-629 rule (select nothing when my primary layer is gone), dead ids filtered out of `selectedIds`, dead `groupContext` exited, `maskTool.resync()`, `restoreReplacedMedia()` when a `mediaRev` changed, and a time clamp. **Playback is never paused.**
2. `FM.addAt`: remember the id at `addAt` before applying, then re-point to its new index, or clamp.
3. Audio: if playing and the batch inserted or removed an audio-bearing layer, or touched `volume`, `fadeIn`, `fadeOut`, `audioFx`, `muted`, `solo`, `speed`, `start`, `trimStart`, `duration` or `reversed` on one, call `FM.restartAudioIfPlaying()`.
4. If project `width`, `height`, `fps` or `background` changed, call `FM.resizeCanvas()`.
5. Refresh:
   - always `FM.requestRender()`;
   - `FM.timeline.rebuild()` coalesced to at most 5 Hz whenever a layout path was touched (`start`, `duration`, `trimStart`, `name`, `visible`, `locked`, `labelColor`, `clipColor`, `parent`, `collapsed`, `li`, `lr`, `mv`) **or any path not in that list**. An unknown path costs a refresh, never staleness. `rebuild()` defers itself during gestures (`timeline.js:4793`);
   - `FM.inspector.refresh()` at most 2 Hz, only when my selected layer was touched, and **deferred while `bridge.interactingInInspector()`**, because `innerHTML=''` would kill a live `tickStrip` glide.
6. `FM.storage.autosave()`.
7. **Never** call `history.commit()`, `setTransform` or `setProp`; the last two pause playback.

### 8.7 `FM.cancelGesturesOn(layerId)` (new, app.js)

- Stops any of text-edit, mask, point-edit, crop, fill-drag, motion-path, draw, touchup, tracker or graph-editor that targets the id. It uses the same calls `projects.open` makes at `storage.js:1772-1776`.
- Ends a canvas drag whose `drag.layer.id` matches, and a timeline gesture whose `clipMove`, `trimDrag`, `slipDrag` or `kfDrag` belongs to the id. It does this through the timeline's existing `restoreGestures()` path, exported as `FM.timeline.abortGestures(pred)`.
- Applies the 629 rule.

### 8.8 `bridge.interacting()`

It is true when **any** of the following holds:

- a pointer is down (capture listeners for `pointerdown`, `pointerup` and `pointercancel`, counted by `pointerId`);
- focus is in an editable (input other than button/checkbox, textarea, or contenteditable);
- a non-modifier key is held;
- any tool reports `isActive()` (text-edit :635, mask :321, crop :165, fill-drag :173, motion-path :236, point-edit :365, plus draw, touchup and tracker);
- `now − lastLocalChangeAt < 250 ms` (covers glide momentum and timers).

`interactingInInspector()` is the same test with the pointer or focus target inside `#inspector-panel`.

The listeners are installed at session start and removed at the end.

### 8.9 Frozen and busy

- **frozen** is `FM._exporting`. **busy** is `FM.jobDepth() > 0 || FM.history.isMuted()`.
- While either is true:
  - diff ticks and sweeps stand down;
  - **guests queue whole incoming messages**;
  - **the host keeps sequencing into base** and queues only the live application.
- When both clear, drain the queue in order through the normal rules, then run a full diff.
- This fixes half-states from `splitLayer` (`app.js:4021` then `:4092`) and `pasteClipboard` (`:3707` then `:3753` then `:3768`), and exports reading live `FM.scene` (`exporter.js:907/1387/1451`).

---

## 9. When diffs run

| Trigger | Scope | Notes |
|---|---|---|
| `history.commit()`, via `beforeSnap` | full | Drains the frozen/busy queue, runs the release rules (§8.2), then `normalizeDerived()`, then `stampIds`, then the diff, then **closes the undo step** in `afterCommit`. Muted batches reach it once, at their final commit. |
| Active tick while `interacting()` | hot set: `P`, the order list, selected layers, the leased layer, layers changed last tick | Every 100 ms on PC, 125 ms on phone. Atomic values over 8 KB are sent at most at 2 Hz while interacting. |
| Idle sweep | full | Every `max(1000 ms, 20 × last full-diff ms)`. The safety net for async writers and anything unlisted. |
| Before a remote apply | hot | §8.4. |
| `visibilitychange` → hidden, and `beforeFlush` | full | Then persist (§12.4). |

**⚠️ THE ORDER ABOVE IS TWO CORRECTIONS ON WHAT THIS LINE ORIGINALLY SAID, both measured in S2.**

- **Release runs BEFORE the diff, not after.** The original order ("diff, then release rules") cannot work for the rollback half of §8.2: a gesture that was cancelled has live back at the value recorded before it started, while base already holds the remote value — so a diff taken first emits `s{p, v: b}`, which **undoes the other person's change and sends it**. Releasing first makes the rollback silent (base already agrees) and the re-assert half then falls out of the very next diff for free, because a held path whose live value differs from base is exactly what the diff emits.
- **The frozen/busy queue is drained here too.** §8.9 says "when both clear, drain the queue in order, then run a full diff", and the only thing that noticed they had cleared was the 100 ms tick — so a commit that happened in between (the very next thing a paste or a split does) snapshotted a document missing everything queued during the job. A commit is by definition the moment the app is coherent again.

**Never diff inside `render()`.** The compositor's synchronous blendMode swap (`compositor.js:14202`) must stay invisible to the diff.

**Adaptive rates:**
- If a hot diff takes more than 8 ms, or `ctl.bufferedAmount` exceeds 256 KB, ticks drop to 5 Hz and then 2 Hz.
- The commit-time flush always sends the final value.
- The host coalesces broadcasts to at most 20 Hz by keeping only the latest value per path within a 50 ms window. Structural ops are never coalesced.

---

## 10. Undo and redo (per person)

### 10.1 Recording

- Every op this device emits carries a rec. Within the **open step**, recs merge per path: keep the **earliest** `b` and the **latest** after-value.
- At the step close (`afterCommit`):
  - for every `li` rec, snapshot the layer's canonical JSON as `after`;
  - push the step onto `undoStack` (cap 120) only if it is non-empty;
  - clear `redoStack`.
- A commit that captured only remote changes creates no step.

### 10.2 `FM.collab.undo()`

```
flushPendingCommit(); tick('hot')
step = undoStack.pop() ?? preSessionStep()             // §10.4
inv = []; soft = 0; hardFail = false
for rec of reverse(step.recs):
  cur = valueAt(base, rec.path)
  s/d        : eq(cur, rec.after) ? inv.push(set rec.path := rec.b) : soft++
  li         : layer exists && canon(layer)==rec.after ? inv.push(lr) : hardFail=true
  lr         : !exists ? inv.push(li{v:rec.b, a:first surviving of rec.anchors ?? null}) : hardFail=true
  mv         : anchorNow==rec.aAfter ? inv.push(mv{a:rec.aBefore ?? fallback}) : hardFail=true
  ai/ar/am   : same pattern as li/lr/mv
if hardFail: toast "Can't undo — <who> changed it since"; step is consumed; return
apply inv to live (in place) → afterApply → immediate full diff (sends ops)
redoStack.push(inverse step recorded from that diff)
if soft: toast "Part of this was changed by <who> since, so it was left alone"
```

- `<who>` comes from `lastBy.get(path)` (an LRU of 10 000 entries updated on every remote apply), falling back to "someone else".
- A step that contains structural recs is all-or-nothing, so an ungroup is never half-undone.
- **⚠️ A reorder is undone by restating the order, not by inverting each `mv` (S1 correction).** The per-op inverse of a move is not the inverse of the step: from `A,B,C,D` → `C,A,D,B` the diff emits `mv{C,a:null}` then `mv{D,a:A}`, and replaying those two inverses in reverse order (each op's recorded base predecessor) gives `D,A,B,C`. The reason is that a reorder walk places each layer relative to a list that is half old and half new, so "the layer that used to be above me" is not where it came from. `FM.collab.diff.invertStep(res)` therefore inverts content and membership per op, in reverse, and then **restates** each disturbed array's recorded base order absolutely. That is n ops rather than the LIS-minimal count, which is the right trade for an undo: it is unconditional, it cannot be wrong, and `apply()` reports the ones that change nothing as `'noop'` so the host never sequences them.
- Undoing a delete brings the full layer back. Its media survives because `lr` keeps records and `reachable()` covers ids referenced by the undo and redo stacks.

### 10.3 Redo

The mirror of undo, guarded against the undo's after-values.

### 10.4 Pre-session steps (owner only)

- At arm: `preSnaps = FM.history._snapshotsUpTo()`.
- Undoing past the session start computes the step lazily: `diff(parse(preSnaps[k-1]).D, parse(preSnaps[k]).D)`, with `b` taken from k−1 and `after` from k. The same conditional algorithm then applies.
- Only the owner edited before the session, so attribution is exact.

### 10.5 Delegation lifetime

- `undoActive()` is true while the session is active, **and afterwards** until the project is switched or the page reloads. Solo undo therefore never reverts a guest's work after a session ends in the same page load.
- `history.restore()` never runs during that window. The snapshot stack keeps committing underneath, which keeps autosave and the media sweep unchanged.

---

## 11. Derived writes, invariants and divergence

### 11.1 `bridge.normalizeDerived()`

Runs at every diff and before hashing.

```
FM.autoFitDuration()                      // app.js:769 — project.duration, camera(start 0).duration, loopIn/Out clamp
FM.timeline.inheritLoopModes()            // extracted from timeline.js:4832
for each layer: FM.eachRefFx(layer, fx => FM._fillFxParams(fx))   // compositor.js:1788; caption-cue effects too
FM.collab.path.stampIds(FM.scene)
```

- All three writers are deterministic functions of D and of `SCHEMA_REV`.
- They become ordinary ops, which are no-ops on receivers (§5.5). They never sit as uncommitted differences, so they cannot trigger false masking, endless pumping or false undo blame (judge-1 D1 #1, #2, #14; D3 #10).

### 11.2 Sanitize on clones, patch in place

- Never run `storage.js` sanitizers on live objects during a session. They reassign `effects`, `masks`, `audioFx`, `behaviors` and `kf` (`storage.js:633, 699, 777, ≈966, 1079`).
- Always sanitize a clone, diff it, and apply the fix ops in place (§7.1 step 8).
- The guest's snapshot sanitize (§12.2) is also on the parsed copy, before it becomes live.

### 11.3 `FM.normalizeGroupOrder(layers)` (new, scene.js)

- A stable pre-order walk: each `type:'group'` layer is followed by its members (`child.parent === group.id`, where the parent is a live group), in their current relative order, recursively.
- Layers whose `parent` is a non-group (transform parenting) do not move.
- Returns `null` when the order is already valid.
- **Stage-0 gate:** a solo op fuzz (`groupSelection`, `ungroup`, `moveLayers`, `duplicate`, `paste`, `delete`, `split`, `insertLayer` inside Edit Group) must leave it returning `null` after every step. If it ever would change an app-produced state, **stop and redefine the invariant from what `moveLayers` and `groupSelection` actually maintain.**

### 11.4 Divergence detector

- **Trigger:** when the host has had no batch for 2 s, and at most every 10 s, it sends `hash{seq, h}` where `h = cyrb53(canon(base))`.
- A guest compares **only** when pending and outbox are empty, not frozen or busy, not held, and `seq` equals its `bs`.
- **Mismatch:**
  1. the guest sends `resync{seq, h}`;
  2. the host sends `snap`;
  3. the guest applies `diffDoc(base, snapD)` to base and to live in place (identity kept; held paths still deferred);
  4. a diagnostics report goes to Settings → Reports: first 50 differing paths, seq, epoch, app versions and `SCHEMA_REV`.
- **Escalation:** 3 resyncs within 10 minutes shows the toast "Sync had trouble — a report was saved" and pauses hashing for 10 minutes.

---

## 12. Lifecycle, storage and state machines

### 12.1 Host (per project)

```
off ──Share panel opened──▶ draft            (room {sid,sk,code} created in memory, sync crypto.getRandomValues)
draft ──Copy/Share/QR/code shown or first knock──▶ arming ──▶ armed
draft ──panel closed with nothing shared──▶ off (nothing persisted)
armed ──guest admitted──▶ live ──last guest gone──▶ armed
armed|live ──onReset() for another pid (projects.open/import/useAsNew/openForEdit)──▶ paused
paused ──shared project reopened in editor──▶ arming (same epoch if the page was not reloaded)
armed|live ──page hidden──▶ (links drop by themselves) ──visible──▶ rendezvous re-start + 'here' announce
any ──Stop sharing (FM.ask confirm)──▶ ending ──▶ off
```

**arming, step by step:**
1. `flushPendingCommit()` and `history.commit()`.
2. Checkpoint: `idbPut('collab:ckpt:<pid>:<ts>', docJSONString)`, keeping 10.
3. `normalizeDerived()`.
4. Pre-sanitize on a clone (§7.3); if anything changed, apply it and commit as the owner step "Tidy-up for sharing".
5. `base = clone(D)`.
6. Web Lock `fm-collab-host-<pid>` with `ifAvailable`. If it is unavailable: "Sharing is already running in another FreeMotion tab."
7. New `epoch` if the page was reloaded; `seq = 0`.
8. Start rendezvous (§14). Request a wake lock on phones.
9. Persist the host record.

**Host record** in localStorage (small, bounded): `fm.collab.host.<pid>`:

```
{v:1, sid, sk, code, created,
 settings:{ask:true, linkRole:'editor', editorsInvite:false, roExport:true, max:8, codesOnly:false},
 members:{<mid>:{name, color, role, dev, tok, added, last}}, blocked:[mid]}
```

**ending:**
- send `bye{why:'ended'}` to everyone;
- write a final checkpoint;
- delete the host record;
- the next Share creates a new sid, sk and code, so old links die.

While the owner is on Home, hosting continues with the owner shown as "away". Joiners' media is read from IndexedDB when it is not in `FM.media` (the `packFromProject` pattern, `storage.js:2042`).

### 12.2 Guest link

```
idle ─join(link|code|conn-code)─▶ checks ─▶ finding ─▶ connecting (ICE ≤20 s) ─▶ auth ─▶ hello ─▶ waiting(knock) ─▶ syncing ─▶ live
live ─6 s silence | channel close | ICE failed─▶ offline (keeps editing → outbox) ─retry─▶ finding …
any ─deny─▶ refused(why) · bye removed ─▶ removed · bye ended ─▶ ended · Leave ─▶ left
```

**checks, in order.** Nothing is written until all pass.
1. Labs is on. Otherwise: "Turn on Live collaboration to join" with [Turn on].
2. A profile exists. Otherwise the profile prompt (§18.1).
3. After `welcome`, before writing: **same-device refusal.** Scan every `fm.proj.*` doc. If any incoming layer id exists in a doc **other than this sid's linked copy**:
   - if it is the owner's own project: "You're hosting this project on this device."
   - if it is an older linked or kept copy: offer "You have an older copy of this project from Ezra. [Replace it with the live one] [Keep it as my own copy first]". The second choice detaches (re-ids) it, then joins.
4. localStorage room: if `used + 1.2 × snapBytes > 4.8 MB`: "Not enough room on this device (needs 1.3 MB, 0.6 MB free) — delete a project and try again."
5. Web Lock `fm-collab-guest-<sid>`. If taken: "This project is already open in another tab."

**syncing:**
1. The snap arrives.
2. Run `_sanitizeLayers`, `repairParentCycles` and `clampProjectDims` on the parsed D.
3. Create the copy: `FM.projects.createLinked(meta, D)`.
4. `FM.projects.open(gpid)`.
5. `base = clone(D)`.
6. Request media (§15).

The editor opens immediately; media streams in afterwards.

**`createLinked(meta, D)`:**
- `gpid = newId('p')`;
- write `fm.proj.<gpid> = {rev:1, project, layers, selectedId:null, selectedIds:[]}`;
- unshift the index entry `{…standard fields, collab:{v:1, sid, sk, hostName, hostColor, mid, tok, role, joined, epoch, seq, cid}}`.

**As built (S2): the sanitise of step 2 happens INSIDE `createLinked`, not at the call site.** Listing it as a separate step makes "we sanitised it" something every future caller has to remember, and this repo's rule is that anything important enough to forget is structural. The host has already normalised at arm (§7.3), so on a well-behaved room it changes nothing — the point is the room that is not well behaved, and everything a peer sends is untrusted (§14.9). `detachLinked` likewise goes through `projects.duplicateFrom`, so queue 915.3's rollback (a half-copy on a full device is taken back out rather than indexed) covers it; it also **deletes `collab` off the new card**, because a copy that is nobody's copy of anything must not look linked or carry the room's sid and key.

Secrets live in localStorage, like the AI key. The layer ids are the host's, so ops line up.

### 12.3 Leave, end and detach

- **Leave** asks through `FM.ask`: [Keep my own copy (recommended)] or [Delete]. Then `bye{why:'left'}` is sent.
- **`detachLinked(gpid)`:**
  1. Check the storage estimate for `total media + largest file`. If short, offer [Delete] or [Keep linked for now].
  2. `duplicateFrom(doc)`: new pid, `reIdLayers`, media copied under the new ids, rollback on failure.
  3. Remove the linked copy and its records.
  4. Open the new project if the linked one was open.
- **`bye{why:'ended'}` received,** or the owner's room found to be gone after 7 days of failed reconnects: the copy auto-detaches on next open, with the toast "Ezra stopped sharing — this is now your own copy."

### 12.4 Persistence and GC

| Key | Store | Written | GC |
|---|---|---|---|
| `fm.collab.host.<pid>` | localStorage | settings and member changes | project remove, stop sharing |
| `fm.profile` | localStorage | profile edit | never |
| `fm.pendingJoin` | localStorage | `#j=` seen at boot | on use, or after 24 h |
| `collab:ckpt:<pid>:<ts>` | IndexedDB | arm, every 10 min if changed, end | keep 10; project remove |
| `collab:base:<gpid>` | IndexedDB | guest, 2 s after pending and outbox become empty; best-effort on hidden | copy detached or removed |
| `collab:part:<sid>:<fpHash>:<n>` | IndexedDB | media receive (§15) | on file completion; older than 7 days; sid unknown |

- `pruneOrphans` skips everything under `collab:` (§4.2).
- `FM.collab.gc()` runs once after boot **whether or not Labs is on**, and applies the rules in the last column.
- **Guest reload recovery:** `outbox = diffDoc(persistedBase, live)`, with `b` taken from the persisted base. A stale base is safe because CAS is idempotent (§13.3).

**As built (S2), three departures, all measured:**

- **`collab:base:<gpid>` carries `cid` as well as `epoch` and `seq`, and `FM.collab.reopen()` restores it.** The host dedupes by "cid ≤ the last one I saw from you" (§7.1 step 3), so a guest that came back from a reload counting from zero had every recovered op silently **dropped as a duplicate** — and the acks looked right, because a cached one is resent. It is also what makes the replay idempotent in the other direction: an op that *was* delivered comes back under the same cid the host already answered, which is a cached ack rather than a second application.
- **`Session.persist()` refuses while anything is outstanding**, not just the 2-second scheduler. `base` is the confirmed document **plus this device's own unsent ops**, so persisting it mid-flight records work as if the host had taken it — and the recovery, which is `diffDoc(persistedBase, live)`, then finds no difference and the offline edit is gone with no trace anywhere. The scheduler already checked; a direct caller (a reload, a `visibilitychange`, a test) did not.
- **`FM.collab.gc()` is NOT in S2.** Of the three key families in the table, `ckpt` is written by arming (S3), `part` by media (S4), and `base` by S2 — so a collector shipped now would run at every boot, on every device, to collect two kinds of key that cannot exist yet. §23's bargain with a solo user is that `collab-core.js` does nothing at load; a boot-time IndexedDB sweep is the one thing in this table that would break it. It ships with the stage that creates the keys it collects.

**The `collab:` corner of IndexedDB reaches storage.js through three seams** — `FM.storage.collabPut/collabGet/collabDel` — rather than a second `openDB()` inside the collab modules. The database name, the store name and the quota handling are `storage.js`'s business, and the key prefix is *enforced* by those seams rather than trusted: anything outside `collab:` would be a media record, and a collab module writing one would be invisible to every rule that owns them.

---

## 13. Offline, reconnect and conflicts

### 13.1 While offline

- Ticks keep running. Ops go to the **outbox**, carrying `b`/`bh`, and are applied to base.
- The outbox is capped at 5000 ops or 4 MB. Beyond that the guest turns read-only with the banner "Too many offline changes to hold — [Save my version as a copy]".
- Banner: "Ezra is offline — your changes are kept here and will send when you reconnect (3)".

### 13.2 Reconnect

1. The guest sends `hello{…, have:{epoch, seq}}`.
2. The host replies with **tail** if the epoch matches and the ring covers `seq + 1…`; otherwise with **snap**.
3. **Tail:** the batches go through the normal receive rules. Outbox and pending count as pending, so ours win where the host has not yet seen them.
4. **Snap:**
   - keep `mine = pending ∪ outbox`;
   - `base := snapD`, then re-apply `mine` to base where they resolve;
   - live: apply `diffDoc(live, base)` except on paths overlapping `mine`.
5. Before sending, keep `myVersion = clone(D live)` in memory for 10 minutes.
6. Send everything outstanding as `tx{q:1}`, in cid order, in chunks of 500 ops or less.

### 13.3 Host CAS for `q:1`

The rule is in §7.1 step 6. It is stateless, so it survives a host reload.

- `li` never clashes (new id).
- `mv` and `am` apply if the element exists.
- `ai` never clashes (new key).

### 13.4 Showing clashes

- The acks' `lost` entries are summed. Toast (tappable, 10 s): "3 of your offline changes clashed with newer edits by Sam and weren't applied — [Save my version as a copy]".
- **Save my version as a copy** calls `duplicateFrom(myVersion)`.
- Edits to layers someone deleted come back as `rej 'gone'` and are counted into the same toast ("…2 were on layers Sam deleted").

### 13.5 Retry schedule

- Every 3 s for the first 2 minutes, then every 10 s until 10 minutes, then every 30 s.
- Retry immediately on `visibilitychange` → visible, on the `online` event, and on a received host `here` announce.

---

## 14. Signaling and security (`js/collab-signal.js`)

### 14.1 Keys

- Room: `sid` (16 bytes) and `sk` (16 bytes) from `crypto.getRandomValues`.
- Everything is derived with `HKDF-SHA256(ikm=sk, salt=sid, info=label)`:
  - `K_env` = HKDF(…, `'fm-env'`), 32 bytes → AES-GCM-256;
  - `K_auth` = HKDF(…, `'fm-auth'`) → HMAC-SHA256;
  - `topic` = hex(HKDF(…, `'fm-topic'`))[0:32];
  - `pjsHost` = `'fmh' + hex(HKDF(…, 'fm-pjs'))[0:24]`.
- **Code:** 9 Crockford-base32 characters (about 45 bits), displayed `K7F-Q2M-9XD`.
  - Input is normalized: uppercase; `I`/`L` → `1`; `O` → `0`; dashes and spaces stripped.
  - `C = PBKDF2-SHA256(code, salt='freemotion-collab-code-v1', 200000 iterations, 32 bytes)`.
  - The same four labels are derived from `C`.
  - The host listens on **both** the link rendezvous and the code rendezvous.
  - Code joins **always** knock.
- **Invite link:** `https://builderezra.github.io/FreeMotion/#j=` + base64url(`0x01 ‖ sid ‖ sk`), 44 characters.
  - Fragment only; GitHub Pages never sees it.
  - The link carries no role; the role is a host setting.

### 14.2 `#j=` at boot (collab-core.js top level)

1. Write `fm.pendingJoin = {j, at}`.
2. `history.replaceState(null, '', location.pathname + location.search)`.
3. After Home init: `FM.collab.ui.resumePendingJoin()`.

The stash happens **before** anything can reload the page: the version-tap `?fresh=` at `index.html:1124`, and `controllerchange` at `:1098`.

**iOS Safari, not standalone** (`!(navigator.standalone || matchMedia('(display-mode: standalone)').matches)`): show the landing card (§19.7) first.

### 14.3 Envelope (every rendezvous message)

```
{v:1, n:b64url(12B iv), c:b64url(AES-GCM(K_env, iv, utf8(JSON inner), AAD=utf8(topic)))}
inner = {t:'offer'|'answer'|'here', from:<random 8B peer tag>, to:<tag|null>, ts:<ms>, sdp?:<string>, nm?:<name ≤32>, cl?:<#rrggbb>}
```

The receiver rejects an envelope when:
- decryption fails;
- `|ts − now| > 120 s`;
- `n` has been seen before (cache 10 minutes);
- it is a host receiving more than 10 offers per minute.

### 14.4 Drivers (all run in parallel; first delivery wins; dedupe by `n`)

| Driver | Endpoint | Host behaviour | Guest behaviour |
|---|---|---|---|
| `PeerJsDriver` | `wss://0.peerjs.com/peerjs?key=peerjs&id=<id>&token=<rand>` (port 443). Hand-written client, about 150 lines; **not** the PeerJS library, so its default TURN relays can never be used. | Registers `pjsHost`. On `ID-TAKEN` after a reload, retries with backoff for 60 s. `HEARTBEAT` every 5 s. | Random id. Sends `{type:'OFFER', dst:pjsHost, payload:envelope}`. The answer comes back as `ANSWER`. On `EXPIRE`, retries per §13.5. |
| `MqttDriver` ×2 | `wss://broker.emqx.io:8084/mqtt`, `wss://broker.hivemq.com:8884/mqtt`. Hand-written MQTT 3.1.1 client: CONNECT, SUBSCRIBE, PUBLISH QoS0, PINGREQ. | Subscribes `fm1/<topic>`. Answers on `fm1/<topic>/<from>`. Publishes `here` on foreground and on arm. | Subscribes `fm1/<topic>/<own tag>` and `fm1/<topic>`, so it hears `here`. Publishes the offer on `fm1/<topic>`. |
| `FakeDriver` | Test switchboard | — | — |

- ICE servers: `[{urls:'stun:stun.l.google.com:19302'}, {urls:'stun:stun.cloudflare.com:3478'}]`. They become `[]` when Codes only is set and the device is offline.
- ICE is non-trickle: wait for `iceGatheringState === 'complete'`, capped at 3 s.
- When Codes only is on, no driver starts at all.

### 14.5 Connection codes (the fully serverless path)

- **Minimal codec:** `{v:1, r:'o'|'a', ufrag, pwd, fp:32 bytes (sha-256), setup, cands:[{t:host|srflx, ip:4B|16B or mdns:16B uuid, port:u16}] ≤6, mk?:16 bytes (offer only)}` → binary → Crockford base32 with the prefix `FM1-`. That is QR alphanumeric mode, about 250 characters for about 150 bytes (**Stage 0 measures the real size**).
- The remote SDP is rebuilt from a data-channel-only template: `m=application 9 UDP/DTLS/SCTP webrtc-datachannel`, `a=ice-ufrag/pwd`, `a=fingerprint:sha-256`, `a=setup`, `a=mid:0`, `a=sctp-port:5000`, `a=max-message-size:262144`, plus candidate lines. **The local description is never modified.**
- **Flow:**
  1. The host taps "Add someone with a code" and gets an offer code (QR plus text).
  2. The guest pastes or scans it and gets an answer code.
  3. The host pastes or scans the answer.
- The host pasting the answer **counts as admitting** the guest: no knock, role = link role.
- The auth handshake uses `mk`.

### 14.6 Auth handshake (ctl, before any document data)

```
H→G {t:'auth1', v:1, nH:<b64 16B>}
G→H {t:'auth2', nG, mode:'link'|'code'|'tok'|'conn', mid?, mac}
H→G {t:'auth3', mac}                       | {t:'deny', why:'auth'}
mac_G = HMAC(K, "fm-auth-g|"+sid+"|"+fpG+"|"+fpH+"|"+nH+"|"+nG)
mac_H = HMAC(K, "fm-auth-h|"+sid+"|"+fpG+"|"+fpH+"|"+nH+"|"+nG)
K = K_auth (link) | K_auth from C (code) | member tok (tok) | mk (conn)
```

- `fpG`/`fpH` are the `a=fingerprint:sha-256` values from the local and remote descriptions. A relay that inserts its own certificates makes the two MACs disagree.
- `LoopLink` uses `'loop'` for both fingerprints. Tier 4 tests the real binding, including a tampered fingerprint.

### 14.7 Version and schema gate

- `hello` carries `proto` and `schema`.
- If they are equal, joining is allowed **regardless of app version**.
- Host older than guest:
  - guest sees "Ezra's FreeMotion needs an update before you can join — ask Ezra to tap the version number";
  - host sees the banner "Sam has a newer FreeMotion. [Update now — the session reconnects in a few seconds]".
- Guest older: "Update to join" [Update] (the pending join is already stashed).
- **`SCHEMA_FP` test:** `FM.collab.schemaFingerprint()` must equal the `SCHEMA_FP` constant. The failure message reads: "The sync schema changed — bump FM.collab.SCHEMA_REV and set SCHEMA_FP to <new>."
  **As built (S1, completed in S2), two departures from the line above and both are deliberate:**
  - the terms are `canon(_sanitizeLayers(FIXTURE)) + canon(fxRegistry param defs) + canon(OP_GRAMMAR) + derivedFingerprint() + SCHEMA_REV`. The **op grammar** is included, which the line omitted: a changed op shape is exactly the incompatibility this gate exists to refuse, and it costs one `canon()` of a frozen literal.
    **S2 added the derived term and bumped `SCHEMA_REV` to 2**, as S1 said it would. It is measured by RUNNING the three writers of §11.1 against `C.DERIVED_FIXTURE()`, never by hashing their source: source text moves when a comment changes, and this gate *refuses a join*, so a false positive means two of his own devices cannot talk after a build that changed nothing — the exact thing the "compatibility is by PROTO + SCHEMA_REV, never by app version" rule exists to avoid. Running them means briefly swapping `FM.scene` for the fixture, because `autoFitDuration` and `inheritLoopModes` take no argument and read `FM.scene` directly. The swap is synchronous (nothing can interleave), restores in a `finally` including `FM.time`, and has its own control in the suite. Parameterising those two functions instead would be a refactor of `app.js` and `timeline.js` that S2 has no other reason to make, on the two functions the whole timeline depends on. The fixture carries **fixed uids**, because `stampIds` mints random ones and a fingerprint that changed on every measurement would be worse than none.
  - the fixture lives in `collab-core.js` beside the constant, not in the suite. Two sources of truth for one number means anyone editing the fixture to cover a new shape would "fix" the constant to match and the gate would quietly stop guarding anything. The suite only compares.

### 14.8 Service-worker update during a session

- `controllerchange` calls `FM.collab.deferReload()`. The banner reads "Update ready — it applies when you leave the session", and the reload runs after `bye` or leave.
- A version-tap while live asks: "Updating reconnects everyone — update now?"

### 14.9 Treat every peer as untrusted

- Validation happens on the host (§7.1) **and** on guests. Guests sanitize the snapshot and every fix path through the same clone sanitize, as protection against a hostile host.
- `fillImage` is accepted only as a `data:image/` URL (`sanitizeUnsafeValues`, `storage.js:985`).
- Names: at most 32 characters, control characters stripped. Colours must match `/^#[0-9a-f]{6}$/`.
- All UI text is set with `textContent` or `.value`. **There is no `innerHTML` with peer data anywhere.**
- Media must decode through `FM.loadVideoFile`/`loadImageFile` or it is dropped. MIME must be `image/*`, `video/*` or `audio/*`.
- **Nothing outside D, media and fonts is ever serialized.** A test seeds `fm.anthropic.key` with a canary and asserts that the canary appears in no outgoing frame.
- **Privacy line in the UI:** "The free relay sees your internet address and timing, never your project. Everything else goes straight between devices, encrypted."

---

## 15. Media (`js/collab-media.js`)

1. **Manifest** (host to guest, sent after `welcome`):

   ```
   mf {files:[{fid, fp, size, mime, kind:'video'|'image', name, lm, layers:[[lid, rev]], miss?:1}], fonts:[{fid:'font:<id>', family, name, size}]}
   ```

   - `fid` is `'f' + n`, one per distinct **File object** on the host (a WeakMap over `FM.media.get(id).file`, or the IndexedDB record's `file`).
   - `fp = name|size|lastModified`, used for resume across epochs.
   - `miss:1` means the host has no bytes for that file.
   - No content hashing, so there is no startup delay (judge 2).
2. **Need:** a layer is satisfied when an IndexedDB record exists with `rec.rev === (layer.mediaRev || 0)` and it decodes. Otherwise, if another layer in this copy already holds a completed file with the same `fp`, copy that record locally. Otherwise, `want`.
3. **Order:** layers visible at my playhead, then selected, then images, then video by `start`, then audio-only. At most 2 files in flight.
4. **Checks before the first `want`:**
   - with `navigator.storage.estimate()`, `need = Σ sizes + max size`. If short: "Not enough space for Ezra's media (needs 1.2 GB, 0.6 GB free) [Get what fits] [Skip media]";
   - if `Σ > 100 MB`: "Download 410 MB of media from Ezra? [Download] [Not now]";
   - if `estimate` is missing (old iOS), skip the checks and rely on `idbPut` returning false.
5. **Wire:**
   - `want{fid, from}`;
   - bulk frames with a 12-byte header `[u8 type][u8 0][u16 0][u32 xid][u32 seq]`:
     - type 1 = start, payload UTF-8 `{fid, from, size, kind:'media'|'snap'|'font'}`;
     - type 2 = data;
   - chunk size = `min(64 KiB, pc.sctp.maxMessageSize − 12)`, or 16 KiB when unknown;
   - sender flow control: pause when `bufferedAmount > 4 MiB`, resume on `bufferedamountlow` (threshold 1 MiB);
   - **receiver window:** the receiver sends `ok{xid, upto}` after each part is persisted, and the sender never runs more than 8 MiB ahead of `upto`, so IndexedDB speed bounds memory.
6. **Receive:**
   - accumulate chunks into 4 MiB parts: `idbPut('collab:part:<sid>:<cyrb53(fp)>:<n>', new Blob(chunks))`, holding `FM._mediaBusy`;
   - on completion:
     1. read the parts;
     2. `new File(parts, name, {type:mime, lastModified:lm})`;
     3. `idbPut(lid, {file, kind, rev})` for each needed layer;
     4. `FM.loadVideoFile` or `FM.loadImageFile`;
     5. `FM.media.set(lid, rec)`;
     6. `requestRender`, then the timeline strip refresh;
     7. delete the parts;
     8. send `have{fid}`.
7. **Resume:** after a reconnect, `want{fid, from: bytes persisted}`.
8. **Export on a guest:**
   - `showExportDialog` asks through `FM.ask`: "3 clips are still arriving (68%) — [Wait] [Export anyway]";
   - if the member's role is Viewer or Commenter and `roExport` is false: "Ezra turned off exporting for viewers."
9. **During the session:**
   - **Guest adds media:** after the `li` is acknowledged, the guest sends `ann{files:[…]}`, the host replies `want`, and the guest serves the file (the code is symmetric). The host then does `FM.media.set` and `FM.storage.save()`, which writes the blob because no record exists yet (`planBlobWrites`). The host then sends `mf` deltas to the others. Limits: warn above 200 MB, cap at the owner's setting (default 1 GB).
   - **Split, duplicate, paste:** the bridge adds `media:[[newLid, srcLid]]` to the tx or b when `FM.media.get(new).file === FM.media.get(src).file`. Receivers copy locally with no transfer.
   - **Replace media:** receivers of a changed `mediaRev` first stash the current record as `prev:<id>` (the same as `stashPrevMedia`, `storage.js:317`), then run the need check. Undo sets `mediaRev` back, and `FM.restoreReplacedMedia()` restores it on each peer.
   - **Fonts:** `want{fid:'font:<id>'}` uses the same transfer; the result goes to a dataURL and then `FM.fonts.applyEmbedded({[id]:{name, family, dataURL}})`. Fonts are capped at 4 MB.
10. **Placeholders:**
    - canvas: a checkerboard `.cb-missing` box with "Receiving 42%" at `boxFor(layer)`;
    - timeline: `.clip .cm-prog` progress bar, painted via `onRebuilt`;
    - `miss:1` shows "Ezra's device is missing this clip too".

---

## 16. Roles and permissions

### 16.1 Table

| | Owner | Editor | Commenter | Viewer |
|---|---|---|---|---|
| Any document op | ✓ | ✓ (canvas size and fps after a confirm) | — | — |
| `P/comments`: add, reply | ✓ | ✓ | ✓ | — |
| Comments: edit or delete own; resolve own | ✓ | ✓ | ✓ | — |
| Comments: edit, delete or resolve anyone's | ✓ | ✓ | — | — |
| Notes (`project.notes`, including `remind`) | ✓ | ✓ | read | read |
| Select, scrub, play, follow; own playhead | ✓ | ✓ | ✓ | ✓ |
| Export or save a copy locally | ✓ | ✓ | if `roExport` (default on) | if `roExport` |
| See link and code, show QR | ✓ | only if `editorsInvite` | — | — |
| Approve knocks, change roles, remove people, reset link, settings, stop sharing, earlier versions | ✓ | — | — | — |

### 16.2 Host filter (authoritative; `Host.allowed(role, op, baseDoc, mid)`)

- **Owner and Editor:** all ops.
- **Commenter:**
  - `ai` on `P/comments`. The element is validated against §17.1, and the host **overwrites** `by` and `at`.
  - `ai` on `P/comments/#i:<c>/replies`, with the same overwrite.
  - `s` on `P/comments/#i:<c>/text` or `.../resolved`, and `ar` on `P/comments/#i:<c>`, only when `comment.by.mid === mid`.
  - The same rules for own replies.
  - Anything else: `rej 'role'`.
- **Viewer:** no ops.
- For Editors and the Owner, comment elements added through `ai` also get `by`/`at` overwritten, so identity cannot be spoofed.

### 16.3 Local enforcement for read-only roles (structural backstop)

- At every diff tick, any changed path the role does not permit is written back from base into live, in place, and a toast shows once: "View only — ask Ezra for edit access".
- **UI courtesy:** `body.collab-ro` (and `.collab-commenter`) hides `#add-fab`, and guards gesture starts in the canvas-edit pointerdown and the timeline gesture start. Each is a single `if (FM.collab && FM.collab.readOnly()) return` placed after selection handling. The inspector gets `.collab-ro` styling with its controls' pointer events off; S7 identifies the controls container.
- Live role changes (`role{role}`) update these classes immediately.

---

## 17. Comments and leases

### 17.1 Comments (`js/collab-comments.js`)

- **Shape:**

  ```
  project.comments = [{id:'c_'+8, by:{mid, name, color}, at:<ms>, text:≤2000, lid?:<layerId>, t?:<sec>, resolved?:bool, replies:[{id:'r_'+8, by, at, text}]}]
  ```

  At most 500 comments. Replies are id-keyed.
- **Card:** the notepad family (`.np-card` class list plus the `pop-flip` entrance, `notepad.js:125`), body-level, textContent only. Newest first; resolved comments are collapsed.
- **Composer:** "Pin to '<layer>' at 0:04" checkbox, shown when a layer is selected.
- **Ruler marks:** `.tl-cmark` in `#tl-inner` at `FM.timeline.timeToX(t)`, painted via `onRebuilt`. Tapping one opens the card at that comment.
- **Entry points:** people chip menu "Comments (N)", the Share panel row, and the guest panel's segment.
- **Comments never affect export.** Only `notes[].remind` does, and commenters cannot write notes.

### 17.2 Leases (exclusive tools)

- **Request:** presence `ls` is set to the tool's target layer while a tool is active: text-edit, mask, point-edit, crop, fill-drag, motion-path (`activeId`), draw, touchup, tracker or graph-editor. The target is `FM.scene.selectedId` unless the tool exposes its own id.
- **Granting:** the host grants first come, first served, and publishes the lease in `roster.people[].ls`.
- **Denial:** a conflicting device gets `lease-no{lid, by}`, then `FM.cancelGesturesOn(lid)` and the toast "Sam is editing this — try again when they're done".
- **Expiry:** the tool closes (`ls:null`), the member disconnects, or 30 s pass without presence.
- **Delete-anyway:** deleting a leased layer is rejected, and the host's fix re-inserts it. The toast "Sam is editing 'Logo' — it wasn't deleted [Delete anyway]" sends `lr{f:1}`, which revokes the lease.

---

## 18. Presence (`js/collab-presence.js`)

### 18.1 Profile

- `fm.profile = {mk:<b64url 16B>, name, color}`, asked for at first Share or Join.
- The prompt is an `FM.ask`-family card: title "What should others see?", a name field, 8 swatches, and [Continue].
- **Palette** (the final set is chosen in the S5 design step and validated by a contrast test against the `CLIP_COLORS` in `scene.js:21`, accent `#5ac7ed`, white, `--kf #ffce4a` and `#1ed760`): `#ff6b6b #ff9f43 #a3e635 #a78bfa #f472b6 #6366f1 #d4a373 #e879f9`.
- The host assigns a free colour if two people chose the same one. People 9 to 12 reuse colours with a dashed ring.

### 18.2 Messages

**Guest to host** on `pres`, only when something changed. Rate cap: 10 Hz on phones (`matchMedia('(pointer:coarse)')`), 15 Hz on PC. A full message is sent every 5 s.

```
{t:'pr', n, st:'here'|'away', sel:[lid ≤64], pri:lid|null, ph:<sec 3dp>, pl:0|1, pn:<FM.inspector.currentView() ≤24>|null,
 tool:null|'text'|'mask'|'points'|'crop'|'fill'|'draw'|'motion'|'touchup'|'track'|'graph', ls:lid|null,
 act:null|'drag'|'trim'|'type'|'scrub'|'export', af:<path ≤200>|null,
 c:{s:'cv',x,y}|{s:'tl',t,l}|null, tap?:{s:'cv',x,y}|{s:'tl',t,l}}
```

- `c` is sent only for mouse pointers. `tap` is sent on touch `pointerdown` on the canvas or timeline.
- Canvas `x,y` are in project pixels.

**Host to each guest:** `{t:'PR', n, full:0|1, m:{<mid>:{…pr fields}}}`, at most 15 Hz, containing only members whose data changed. The owner is included as mid `'o'`. The rate halves when RTT > 300 ms or `ctl.bufferedAmount > 64 KB`.

### 18.3 Canvas

- **Container:** `div#collab-layer` inside `#canvas-wrap`, `z-index:5` (above `#select-box` 3 and `.snap-guide` 4, below `.anchor-dot` 6 and the tool overlays at 40 and up), `pointer-events:none`.
- **Boxes:** `.cb-box[data-mid]`, one per remote-selected layer **visible at my time**, placed with `FM.canvasEdit.boxFor(layer, FM.time)`. `border: calc(1.5px * var(--vz)) solid var(--peer)`. The primary box is solid; other selected layers are `dashed`.
- **Tags:**
  - phone: an initials chip of 18 px, only on the primary box;
  - PC: an initials chip plus the name, at 11 px;
  - both keep a fixed size under zoom with `scale: var(--vz)`.
- **Pointers:** `.cb-ptr`, a 12 px arrow plus an initials chip, hidden after 5 s idle.
- **Taps:** `.cb-tap`, a 24 px ring in the person's colour that fades out over 600 ms.
- **Missing media:** `.cb-missing` (§15).
- **The layer is hidden** while `FM.inspector.ownsCanvas()` (`inspector.js:6416`) or any tool overlay is up, and when `collabSelections`/`collabCursors` are off.
- **Redraw:**
  - from `presence.onRender()` (the hook after `canvasEdit.update()`);
  - on `PR` frames, through its **own** rAF that only moves overlay elements.
  - **Presence never calls `FM.requestRender()`.** A test spies on it.
- Elements are pooled; nothing is created per frame.

### 18.4 Timeline

- Painted by an `FM.timeline.onRebuilt` listener and on presence change. It **never triggers a rebuild itself**.
- **Rings:** `.clip[data-id].peer-sel` with `--peer` set inline:
  - `box-shadow: 0 0 0 1px #0b0d12, 0 0 0 3px var(--peer)`;
  - on a locally selected clip, which already has a white ring: `0 0 0 2px #fff, 0 0 0 3px #0b0d12, 0 0 0 5px var(--peer)`.
- **Dots:** `.clip .peer-dots` holds up to 2 dots of 6 px plus "+", inside the clip's top-right corner. **Nothing goes on the phone track head**, which has 3 px spare.
- **Lease lock:** `.clip .peer-lock`, a 10 px lock in the holder's colour.
- **Remote playheads:** `.tl-peerhead`, a 1.5 px line in `#tl-inner` at `timeToX(ph)`.
  - When it is off-screen: `.tl-peerchip.left` / `.right`, a 16 px initial at the lane edge at ruler height. Tapping it moves my playhead to theirs.
- **Phone solo view** (one selected layer, one row): other people's layers are named in the people panel instead ("Sam · on 'Logo' · Effects").

### 18.5 People chip (who is here): `#collab-people`

- Created by JavaScript as a child of `#stage`. It is absent unless Labs is on.
  - **Phone:** `position:absolute; top:6px; left:8px; height:28px`. Avatars are 24 px initials circles overlapping by 7 px, at most 3, then a "+N" pill.
  - **PC:** `top:10px; left:12px`, avatars 28 px.
  - Background `rgba(10,12,16,.55)` with `backdrop-filter: blur(8px)`, radius 14 px, `z-index:21`. The hit area is at least 44 px via `::before`.
- **States:**
  - Labs on, not shared: a single 28 px round "person+" Share button;
  - live: avatars, where grey means away or offline and a progress ring means joining, with a percentage;
  - a speech-bubble count when there are unread comments.
- **Hidden** under `body.text-editing`, when a tool owns the canvas, and in phone `sel-mode`.
- **Tap:** the owner gets the Share panel; a guest gets the people panel.
- **Placement check (S5 test):** the chip must not overlap `#view-bar` (right side, vertically centred, `styles.css:794-797`) or the canvas at 380×800 for 9:16 and 16:9 compositions, nor at 1280×800. Canvas sizes are listed in the MAP.

### 18.6 Inspector

- When someone else has my selected layer selected: a chip in the header, "Sam is here too" with avatar.
- When their `af` is set: "Sam is adjusting Opacity". The label is the last path segment, prettified through a small label map, falling back to the raw key.
- PC: inside `#inspector-panel .panel-title`, to the right of `#proj-name-s`. Phone: in the sheet header.
- Tinting the matching inspector row is **deferred** (it needs `data-path` on rows; see Q-later 9).

### 18.7 Follow

- From a person's row choose **Follow**. The chip "Following Sam ×" sits at the top of `#stage`, centred, and shares the `#collab-banner` slot.
- While following:
  - `FM.time` tracks their `ph`, re-seeking only when `|Δ| > 0.4 s` or when they pause or scrub;
  - their `pl` starts and stops my playback;
  - the timeline scrolls their primary layer's row into view (desktop only).
- Selection and viewport are **not** mirrored.
- Following ends on any local `pointerdown` on the canvas, timeline or inspector, or any keydown.

---

## 19. UI surfaces (all behind Labs; draw options first, per rule 16)

Common rules:
- Cards are body-level and use the `FM.ask` family (`js/ask.js`, `.fm-ask-card`: glass look, light/dark decided at open time). **Do not use `#hm-dialog`**, which lives inside `#home-screen` (`index.html:706`) and is hidden in the editor.
- Phone cards use `fm-hinge-panel`; PC cards use `FM.popFrom(card, button)`.
- `prefers-reduced-motion` is respected.
- All user text is set with `textContent` or `.value`.

### 19.1 Share panel (owner): `#collab-share.collab-card[role=dialog]`

- **Phone (≤700):** fixed bottom sheet, `left:8px; right:8px; bottom:0; max-height:82svh`, radius `16px 16px 0 0`, hinged at the bottom, `z-index:222`.
- **PC:** 380 px wide, `FM.popFrom(card, #btn-share)` or from `#collab-people`, `z-index:222`.

**Main view** (lean, like Docs):
1. `.cs-head`: `h2` "Share “<name>”", plus state `.cs-state`: "Not shared yet" / "Live · 3 here" / "Paused".
2. **People with access** (`ul.cs-people`): each row is avatar · name · "(you)" · device icon · status ("here" / "away" / "joining 42%" / "offline") · `button.cs-role` "Editor ▾". The role menu is `FM.contextMenu`: Editor, Commenter, Viewer, separator, Follow, Remove… (danger, with an `FM.ask` confirm).
3. **General access:**
   - row "When someone uses the link or code", segment [Ask me first | Let them in];
   - row "They join as" [Editor ▾];
   - buttons [Copy link] [Share…] [QR]. **Copy and Share run synchronously inside the tap handler.** The room was created synchronously when the panel opened; arming runs asynchronously afterwards;
   - the code `K7F-Q2M-9XD`, 22 px monospace, with [Copy];
   - link "Reset link and code".
4. `.cs-foot`: ⚙ (settings drill-in using the `sb-panel-in` family) · "Comments (3)" · [Stop sharing] (danger, `FM.ask`) · [Done].

**Settings drill-in:**
- Your name and colour.
- Editors can invite others (off).
- Viewers and commenters can export (on).
- Max people [8 ▾] (range per D4).
- Show others' pointers (on, local) and Show others' selections (on, local).
- Connection: [Free relay + codes (recommended) | Codes only].
- Status line ("Connected directly on this Wi-Fi" / "Connected over the internet" / "Waiting for people").
- "Having trouble? Connect with a code".
- "Earlier versions…" (checkpoint list; restoring creates a new project through `duplicateFrom`).
- Privacy line (§14.9).
- The version label.

**Guest panel** (same card): people list (read-only), "You're an Editor", name and colour, segment [People | Comments], Follow, [Keep my own copy], [Leave].

### 19.2 Join sheet: `#collab-join`

- Title "Join a live project".
- One field: "Paste an invite link or type a code". Input is auto-detected as a `#j=` link, a 9-character code, or a connection code beginning `FM1-`.
- Buttons: [Paste] (`navigator.clipboard.readText()` inside the tap), [Scan QR] (S8), [Join].
- Link: "Having trouble? Connect with a code".
- **Progress lines**, one at a time:
  1. "Finding Ezra…"
  2. "Connecting…"
  3. "Checking the invite…"
  4. "Waiting for Ezra to let you in…"
  5. "Downloading the project…"
  6. "Getting media 2/7 · 45%"
- **Entry points:** `#hm-join-btn` (Home `.hm-top`, before `#hm-search-btn`, 40 px icon), a pending join from a link, and the Settings Labs group.

### 19.3 Knock card: `#collab-knock`

- Text: "Sam (iPhone) wants to join as Editor", with [Don't allow] [Let in].
- Requests queue one at a time. After 120 s the request auto-declines, with a quiet note in the people list.
- **Phone:** fixed, `top: calc(52px + env(safe-area-inset-top) + 8px)`, left and right 8 px, `z-index:225`. This avoids the toast at bottom 244 px and the FAB.
- **PC:** fixed at the top-right of the stage region, `top:12px; right:12px; width:320px`, `z-index:225`.

### 19.4 Banner: `#collab-banner`

- Top of `#stage`, centred, 28 px pill, 12.5 px text, `max-width: calc(100% - 140px)` so it clears the people chip.
- **States:** offline ("Ezra is offline — your changes are kept here (3)"), paused, reconnecting, "Following Sam ×", "Update ready — applies when you leave", "View only".
- Uses the `ld-in-x` entrance.

### 19.5 Toasts

Toasts use `FM.toast(msg, ms, onTap)` (`app.js:1185`) for single actions. Multi-choice decisions use `FM.ask`.

### 19.6 Home (`js/home.js`)

- **Card badge** `.hm-live` in the thumbnail's free **bottom-right** corner:
  - owner: "LIVE · 3" while hosting;
  - linked copy: "SHARED" with the host's colour dot.
- `.hm-sub` on a linked copy: "Shared by Ezra · live now" or "Shared by Ezra · last synced 3:42 pm".
- **⋯ menu:**
  - owner projects: add "Share live…" after "Duplicate". It opens the project, then the Share panel;
  - linked copies: Open, Keep as my own copy, Export video, Leave & delete. "Share live…", "Save as template" and "Save as element" are **not** shown for linked copies.

### 19.7 iOS Safari landing card (`#collab-landing`)

- Shown when `#j=` is present on iOS outside standalone mode.
- Text: "Joining in Safari keeps this copy separate from your FreeMotion app."
- **[Copy invite]**, then "Open FreeMotion from your Home Screen → Join → Paste".
- Secondary action: "Join here in Safari instead", which proceeds normally.

### 19.8 App Settings (`js/settings.js`)

A "Labs" group near the end, built with `toggleRow`, `actionRow` and `segmentRow`:
- "Live collaboration (preview)" (`collabLabs`).
- When on: "Your name and colour" · "Show others' pointers" · "Show others' selections" · "Connect with codes only" (`collabCodesOnly`) · "Join a live project…".

---

## 20. Wire protocol (complete catalogue)

**Channels:** `ctl` (0, ordered, reliable, JSON strings), `pres` (1, `ordered:false`, `maxRetransmits:0`, JSON at most 1 KB), `bulk` (2, ordered, reliable, `ArrayBuffer`). All three use `negotiated:true` with fixed ids.

A `ctl` message over 16 KB is sent as `{t:'fr', k:<msgId>, i, n, s:<≤16 KB substring>}` fragments and reassembled in order.

| Type | Direction | Fields |
|---|---|---|
| `auth1` / `auth2` / `auth3` | §14.6 | §14.6 |
| `hello` | G→H | `proto, schema, app, me:{mk, name, color}, dev:'phone'\|'pc', have?:{epoch, seq}` |
| `wait` | H→G | — (knock pending) |
| `deny` | H→G | `why:'full'\|'declined'\|'auth'\|'removed'\|'ended'\|'host-older'\|'guest-older'\|'busy'`, `app?, schema?` |
| `welcome` | H→G | `sid, epoch, seq, you:{mid, role, color, tok?}, roster, settings, sync:'snap'\|'tail'` |
| `snap` | H→G (ctl header; bytes on bulk as kind `'snap'`) | `xid, bytes, gz:0\|1, epoch, seq, h`. The body is `canon({project, layers})`, gzipped with `CompressionStream` when present. |
| `tail` | H→G | `from, batches:[b…]` |
| `tx` | G→H | `cid, bs, q?:1, ops:[…], media?:[[newLid, srcLid]]` |
| `ack` | H→sender | `cid, seq\|null, ops, fix, rej:[[opIndex\|'*', why]], lost:[[opIndex, why]], ord?` |
| `b` | H→others | `seq, by, ops, fix, ord?, media?` |
| `ord` (on `b`/`ack`) | H→all | `[{p:<array path or null>, f:'id'\|'uid', k:[keys…]}]` — §8.3a, present only when the batch reordered something |
| `hash` / `resync` | H→G / G→H | `seq, h` |
| `roster` | H→all | `people:[{mid, name, color, role, dev, st:'here'\|'away'\|'off'\|'joining', media:0..1, ls}]` |
| `role` | H→G | `role` |
| `settings` | H→all | `s:{roExport, editorsInvite, max}` |
| `lease-no` | H→G | `lid, by` |
| `bye` | both ways | `why:'left'\|'paused'\|'ended'\|'removed'` |
| `ping` / `pong` | G→H every 2 s / H→G, answered from `onmessage` | `n, hc (host clock)` |
| `mf` | H→G | §15.1 (the full manifest, then deltas) |
| `ann` | G→H | `files:[…same shape]` |
| `want` / `ok` / `have` | both ways | `{fid, from}` / `{xid, upto}` / `{fid}` |
| `pr` / `PR` | pres | §18.2 |

**Bulk frame:** a 12-byte header (§15.5) followed by the payload.

---

## 21. Limits and constants (all in `collab-core.js`)

| Constant | Value |
|---|---|
| People | default 8; PC host max 12; phone host max 6 |
| Layers | 2000 (same as `applyScene`) |
| tx | ≤ 4 MB, ≤ 5000 ops; one op value ≤ 2 MB (a `fillImage` data URL) |
| String leaves | ≤ 200 000 characters (text, captions); names ≤ 32; comment ≤ 2000; comments ≤ 500 |
| Rates | tx 30/s (burst 60); presence ≤ 30/s accepted; offers 10/min |
| Ticks | 100 ms PC / 125 ms phone; atomic values > 8 KB ≤ 2 Hz while interacting; interaction quiet 250 ms |
| Sweep | `max(1000 ms, 20 × last full-diff ms)` |
| Host broadcast coalescing | 50 ms (≤ 20 Hz) |
| Liveness | ping 2 s; offline after 6 s silence; presence purged at 60 s; lease expiry 30 s |
| ICE | gathering cap 3 s; connect timeout 20 s |
| Retries | §13.5 |
| Ring | 2000 batches / 8 MB |
| Hash | idle 2 s, min 10 s; escalate at 3 in 10 min |
| Outbox | 5000 ops / 4 MB |
| Undo | 120 steps |
| Checkpoints | at arm, every 10 min if changed, at end; keep 10 |
| Media | chunk min(64 KiB, mms − 12) or 16 KiB; pause > 4 MiB; resume < 1 MiB; receiver window 8 MiB; parts 4 MiB; ask above 100 MB; guest file warn 200 MB, cap 1 GB |
| Knock timeout | 120 s |
| Pending join | 24 h |
| `SCHEMA_REV` / `PROTO` | 1 / 1 |

---

## 22. Failure handling (what the UI shows)

| Situation | Detection | UI |
|---|---|---|
| Relays unreachable | no driver connects within 8 s | "Couldn't reach the free connection service. [Connect with a code]" |
| ICE failed | `failed`, or 20 s in `checking` | "Couldn't connect directly. Put both devices on the same Wi-Fi, or turn off mobile data." |
| Wrong or expired invite | auth deny | "This invite no longer works — ask Ezra for a new link." |
| Full / declined / removed | `deny`, `bye` | "This project is full (8 people)." / "Ezra didn't let you in." / "Ezra removed you — your copy is kept." |
| Schema mismatch | `deny` | §14.7 messages, one per side |
| Host offline | 6 s silence | banner plus outbox count; automatic retry (§13.5) |
| Guest offline (seen from host) | 6 s silence | avatar greys; overlays fade at 10 s; removed at 60 s |
| Offline clash | `ack.lost` | §13.4 toast with [Save my version as a copy] |
| Rejected (role or lease) | `ack.rej` | "View only — ask Ezra for edit access" / "Sam is editing this" |
| Someone deleted what you had | structural apply | "Sam deleted 'Title'" (with "you had it selected" when true) |
| Undo blocked | §10.2 | "Can't undo — Sam changed it since" / "Part of this was changed by Sam since…" |
| Not enough storage | estimate, or `idbPut` false | §15.4 card; "Your device is full — 3 files couldn't be saved" |
| Desync | hash mismatch | silent resync plus report; escalation toast |
| Second tab | Web Lock | "…already open in another tab" |
| App update while live | `controllerchange` | banner "Update ready — applies when you leave the session" |
| Phone host locks screen | page hidden | guests see "Ezra is offline"; host sees "Keep FreeMotion open — the session pauses when your screen locks" (at arm, phones only) |
| Owner stops sharing | `bye ended` | "Ezra stopped sharing — this is now your own copy" |
| Export with media missing | §15.8 | `FM.ask` [Wait] [Export anyway] |

---

## 23. Solo editing unchanged (clause 16)

- With Labs off, **no collab DOM exists**: no `#collab-people`, no `#hm-join-btn`, no `.hm-live`, and `#btn-share` stays `.hidden`.
- **No listeners, timers, WebSockets or RTCPeerConnections** exist until a session starts. `collab-core.js`'s only work at load is the `#j=` stash and the test-agent gate.
- **Hook list.** Every hook is `FM.collab && FM.collab.active && …`, or a behaviour-identical extraction:

  | File | Hooks |
  |---|---|
  | history.js | ×6 |
  | storage.js | ×5 plus sanitizer uid keep |
  | app.js | render, `warnOversizeProject`, job brackets, grab list, canvas dialog, export dialog |
  | timeline.js | extractions only |
  | canvas-edit.js | `boxFor` extraction |
  | scene.js | new pure function |
  | index.html | `controllerchange` |
  | home.js / settings.js | Labs-gated |

- **Guard tests (S0 onwards, run on every ship):**
  - (a) the whole existing suite;
  - (b) **nothing leaves the device:** wrap `RTCPeerConnection`, `WebSocket` and `fetch` to count constructions, run a scripted edit / undo / export-dialog / Home session with Labs off and with Labs on but not sharing, and assert zero;
  - (c) with collab inactive, `FM.history.undo` restores a full snapshot exactly as today (compare against a stored snapshot string);
  - (d) sanitizer byte-identity for uid-less input;
  - (e) `boxFor` equals `#select-box` geometry;
  - (f) `normalizeGroupOrder` returns `null` on every app-produced order.

---

## 24. Backups and safety (clause 17)

- **Before S0's first edit:** `git tag pre-collab && git push ssh pre-collab`. `tools/rollback.sh` covers every stage release.
- **The owner's data:**
  - collab writes nothing until he opens Share;
  - arming writes a checkpoint **before** the pre-sanitize tidy-up;
  - checkpoint layer ids are in the prune keep-set;
  - "Earlier versions…" always restores as a **new** project.
- **Guests' data:**
  - collab writes only into its own new `p_` project and `collab:` keys;
  - a Tier-3 test asserts that every other `fm.proj.*` string and the full IndexedDB key/size/rev map are **byte-identical** before and after join, edit, leave-keep and leave-delete.
    **As built (S2), one exception, and it is the autosave rather than collab:** the project that was OPEN when he joined gets its `rev` bumped, because `projects.open()` flushes the outgoing document before switching (`storage.js` `writeScene`, `rev: dr + 1`). So the test asserts every OTHER document byte-identical, and for the open one the **content** — `project` and `layers`, the parts that are his work — byte-identical, with `rev` allowed to move. Reading `rev` as a violation would fail the assertion forever for a reason that has nothing to do with sharing; skipping the document entirely would prove nothing.
- **Hardening:** `projects.remove` never deletes a record another doc references (S0).

---

## 25. Test strategy

`tools/prove.sh` reads only `tests/tests.js`, so **every collab test lives there**, with `{item:'921'}` and `budgetMs` where needed. Every new test must fail against HEAD (new modules are absent there) **and** carry a positive control, per the memory note "a negative test needs a positive control". Key rules get `tools/mutate.sh` proofs (§25.6).

### 25.1 Tier 1: pure functions (fast, main frame)

These use `FM.collab.path`, `FM.collab.diff` and `Host`/`Session` with a **PlainAdapter** (plain objects, no DOM).

A seeded **kitchen-sink generator** produces scenes from every layer creator's shape:
- every `fxRegistry` type (via `makeInstance`) including filter containers;
- audioFx, behaviors, masks with animated paths, captions with cue effects;
- groups nested three deep, transform parents;
- `{kf}` containers with `loopMode`, `subs`, `crop`;
- notes, comments, markers, `fillImage` data URLs.

### 25.2 Tier 2: the real app plus virtual peers (one frame, LoopLink)

The real `FM` is host (then guest) against PlainAdapter peers. It is driven by real synthetic gestures using the existing helpers (`attached()`, pointer dispatch).

### 25.3 Tier 3: two or three real app instances

**Origins:**
- `http://h.localhost:<port>/index.html?fmtest=collab&tag=h&fresh=<ts>`, plus `a.` and `b.localhost`.
- Chrome maps `*.localhost` to loopback, and `tools/serve.sh:59` binds `127.0.0.1`.
- These are **separate origins**: separate localStorage, IndexedDB and Web Locks, with **no storage code changes**.

**Frames:**
- created by the test inside the runner's app frame, off-screen;
- host 1280×800 (PC layout), guest A **380×800 (phone layout)**, guest B 900×760;
- a booted trio is reused across a test group (`window.__collabTrio`), boot `budgetMs` 120 000.

**Agent (`tests/collab-agent.js`):**
- loaded by `collab-core.js` **only** when `location.hostname` matches `/^(127\.0\.0\.1|localhost|[a-z0-9-]+\.localhost)$/` **and** `fmtest=collab`;
- the same flag skips service-worker registration;
- **RPC:** parent to frame `{fmRpc:id, act, args}`, frame to parent `{fmRpc:id, ok, val|err}`;
- **fixed action table:** `state, hash, doc, projects, idbDump, select, setProp, commit, undo, redo, dragCanvas, dragClip, slider, typeText, addLayer, addMedia(kind), deleteLayer, group, ungroup, split, paste, exportBegin/End, dom(sel), settings, share, join, leave, role, kick, reload, wait`.
  **As built (S2)** the table is the subset S2 can reach plus six actions the S2 tests need and the list did not name: `ready` (the boot handshake), `setScene`/`flush` (a known document on disk to start a group from), `persist`/`rejoin` (§12.4's reload recovery, which cannot be driven any other way), `offline` (the device's half of a partition — the switchboard cuts the wire, this tells the instance the wire is cut, and keeping them separate is what lets a test assert each half), `saveMyVersion` (§13.4's offer, which has to be real), `jobBegin`/`jobEnd` and `end`/`wipe`. Everything involving media, gestures or grouping waits for the stage that ships it. There is deliberately **no `eval`**: an agent that could run anything is an agent whose result proves whatever it was told to prove.
- **`?fmwipe=1`** clears that origin's localStorage synchronously at `collab-core.js` parse time, before `storage.load()` runs. Without it the second run of the suite inherits the linked copies the first one made and the same-device refusal (§12.2 check 3) fires on state the test did not put there. It is stripped from the URL by the agent's `reload`, which is a *recovery*, not a reset.

**Switchboard (test frame):**
- routes `{fmLink:1, from, to, ch, data}` between frames;
- JSON strings for `ctl`/`pres`, and transferable `ArrayBuffer`s for `bulk`;
- a seeded scheduler for latency and jitter, reordering and drops on `pres`, `partition(tag)` / `heal(tag)`, and a bandwidth cap;
- `FakeDriver` carries rendezvous envelopes, so the full link, rendezvous, auth and hello flow runs offline.

**Fallback** if the Stage-0 probe shows `*.localhost` frames failing: same-origin frames with an `fmns=<tag>` shim, active on localhost only, that:
- overrides `window.localStorage` (a probe confirms `Object.defineProperty` works);
- wraps `IDBFactory.prototype.open` to prefix names;
- prefixes Web Lock names.

### 25.4 Tier 4: real WebRTC (one page)

Two `RTCPeerConnection`s with `iceServers: []` (headless, offline).

### 25.5 Tier 5: his devices (not builder-verifiable; listed for him)

- Mac Chrome ↔ iPhone PWA on the same Wi-Fi: codes, then link.
- iPhone on mobile data.
- Lock and unlock.
- A 300 MB join.
- In S8, **Settings → Labs → "Test connection"** records candidate types, SDP size, `maxMessageSize` and throughput into Reports.

### 25.6 Mutation proofs (`tools/mutate.sh`)

Each targets one rule:
- the equality no-op (mutated: a message storm, caught by a batch-count ceiling);
- the pending skip (a flicker count);
- structural-wins;
- re-assert at release;
- adopt-on-rollback;
- in-place apply (inspector closure detaches);
- LIS order;
- CAS;
- the undo guard;
- the export freeze;
- the busy barrier;
- the role filter;
- sanitize-on-clone (identity kept);
- same-device refusal;
- the prune exemption;
- the `SCHEMA_FP` gate;
- "presence never renders".

---

## 26. Staged build plan

**Every stage:**
- is shippable alone, with solo behaviour unchanged when Labs is off;
- ships through `tools/ship.sh` (both suite passes, `prove.sh`, buster gate);
- gets a **lenses + refuters review workflow** before shipping storage, media or network code (memory note);
- gets `/security-review` where marked;
- gets a 380 px and 1280 px screenshot check for anything visual;
- **sends Ezra the picture with alternatives named** (rule 16) and ticks the matching #921 clauses.

### S0 · Safety net and seams: no behaviour change

- **Contents:** tag `pre-collab`, then every S0 row in §4.2: history seams, uid keep in the sanitizers, prune exemption and ckpt keep, remove hardening, `duplicateFrom`, timeline extractions, `boxFor`, `normalizeGroupOrder`, job brackets, `cancelGesturesOn`, `teardownLayerPlayback`, the oversize guard, the `controllerchange` hook, the render hook stub. Also `tests/_collab-probe.html` (§28).
- **Tests:**
  - `921 S0 restore uses _afterExternalChange (629 rule intact)`
  - `921 S0 sanitizers keep a valid uid, drop an invalid one, uid-less output byte-identical`
  - `921 S0 pruneOrphans keeps collab: keys and checkpoint layer ids`
  - `921 S0 projects.remove spares records another doc references`
  - `921 S0 duplicateFrom copies independently and rolls back on failure`
  - `921 S0 inheritLoopModes/timeToX/onRebuilt: rebuild output unchanged, onRebuilt fires once`
  - `921 S0 boxFor equals #select-box geometry (rotated, parented, group, skew, text wrap)`
  - `921 S0 normalizeGroupOrder: null on every app-produced order (op fuzz), repairs a split group`
  - `921 S0 job brackets: depth returns to 0 even when the job throws; watchdog reports`
  - `921 S0 cancelGesturesOn stops tools and restores an in-flight clip drag`
  - `921 S0 nothing-leaves-the-device and undo parity guard tests (§23 b, c)`
- **Visible:** nothing.

### S1 · Pure core

- **Files:** `collab-path.js`, `collab-diff.js`, `collab-host.js`, and the constants in `collab-core.js`.
- **Tests:**
  - path escape round trip; rejects `__proto__`, `_x` and numeric segments
  - canon and eq (NaN, −0, undefined, key order)
  - `apply(diff(a,b),a) ≡ b` and the inverse round trip over 200 seeded kitchen-sink scenes
  - LIS gives the minimal `mv` count and the exact order
  - uid keyed arrays: concurrent `ai` from two peers both survive; `ar` beats a child `s`
  - stampIds (missing, duplicates, never on id-keyed arrays)
  - host role-filter table (role × op × path, exhaustive)
  - lease reject; CAS (b match, current == v, clash); `li` anchor fallback; `lr` force
  - sanitize-on-clone yields fix **and live array identities are unchanged**
  - cycle repair and group-order fix
  - **convergence fuzz:** host plus 3 PlainAdapter guests, 300 seeded rounds, with latency, pres reorder and drop, disconnect and rejoin, epoch bump, outbox. Invariants: equal hashes at quiescence; no deleted layer resurrected except by an explicit undo; no cycles; **no repeated layer id**; keyframes sorted.
    *(The guest is a test-local engine: §8.1, §8.3 and §13.2 over two plain trees. There is no `Session` until S2, and a PlainAdapter guest has no DOM, so the held/deferred half of §8.2 has nothing to defer and is tested in S2 against the real app.)*
    *("groups contiguous" was dropped: S0 measured that group contiguity is **not** an invariant of this app — three ordinary actions produce a scattered group, the compositor knows it, and `FM.normalizeGroupOrder` was redefined as a repeated-id repair. See its comment in `js/scene.js`.)*
  - hostile inputs (`__proto__`, `_canvas`, 10 MB string, https `fillImage`, 6000 ops, HTML name)
  - `_sanitizeLayers` idempotence on the kitchen sink, on a layer holding every registered effect, and on the project open in the runner (`tests/_fixtures` holds **media** only — there is no scene fixture on disk, so fetching from there would have checked nothing while looking thorough)
  - `SCHEMA_FP` gate
  - effect-JSON comparison audit (§5.4)
- **Visible:** nothing.

### S2 · Engine, bridge, loopback, guest copy, undo

- **Files:** `collab-session.js`, `collab-bridge.js`, `collab-link.js` (LoopLink and PostLink only), `tests/collab-agent.js`, the switchboard helper, and `storage.js` `createLinked`/`detachLinked`. The canary test for §14.9 lands here.
- **Tier-2 tests:**
  - one commit gives exactly one tx; a muted batch gives one tx
  - derived writes never leak (`afterKf` then rebuild sends nothing more; a render fill sends nothing)
  - in-place apply keeps the inspector closure live (control: a remote value shows after refresh)
  - slider drag plus a remote op on the same path: no jump, last to release wins in both orders (control: a different path applies mid-drag)
  - cancelled clip drag adopts the deferred remote value
  - remote delete during a canvas drag: gesture cancelled, selection cleared, toast
  - export freeze queues live application while host base advances
  - busy barrier: paste slot correct under a remote `lr`; no half-split is ever sent
  - host autosaves after a remote batch (doc rev increases)
  - per-person undo: skip on a changed path; delete restored with media; structural all-or-nothing; pre-session step
  - viewer local revert (control: an editor's edit sticks)
  - hash mismatch, resync, report, escalation
  - `controllerchange` deferral
- **Tier-3 tests:**
  - join and snapshot; **guest's own projects byte-identical**
  - same-device refusal, and Replace / Keep-first
  - concurrent edits converge across three instances
  - delete while another has it selected
  - undo is per person across instances
  - host reload: epoch, snap, pending resent
  - partition: clashes counted and "Save my version" creates a project
  - guest reload mid-offline is idempotent
  - leave-keep detaches with new ids, and a later rejoin does not collide
  - the 380 px guest frame works
- **Visible:** nothing (no Labs row yet).

**As built.** Everything above shipped. Four things are worth naming because they are not in the file list:

- **`FM.collab.share()`, `join()`, `leave()`, `reopen()` and `end()` are product code, in `collab-session.js`, not test code.** S3's Share panel and Join sheet call exactly these; what S3 adds around them is the Labs check, the profile prompt, the storage-room dialog, the knock and the signalling. The alternative — a join flow in the test rig and a second one in the UI — means the same-device refusal is proved against a mock and the real one is never tested.
- **New storage seams:** `FM.storage._clampProjectDims` (the host's project invariant; S1's suite carried a hand-written copy of the arithmetic, which is two sources of truth for one rule) and `FM.storage.collabPut/collabGet/collabDel` (§12.4).
- **`FM.collab._reload()`** is one level of indirection over `location.reload()`, purely so the §14.8 deferral is testable: a suite that cannot stand in for the reload can only assert that a flag was set, which is the half of the rule that does not matter.
- **`bridge.interacting()` asks nine tools three different questions.** Six answer `isActive()`; `FM.drawTool` is a plain state object with `.active`, `touchupTool` answers `isOpen()`, and the tracker answers `isPicking()`. A loop over `isActive` alone reads as thorough and silently covers two thirds of §8.8's list.

**Not in S2, and why:** `FM.collab.gc()` (see §12.4 — it would collect two kinds of key that cannot exist yet, at every boot, breaking §23's "nothing runs at load"); the `#j=` stash (S3, it needs a join flow before storing an invite means anything); and the `dragCanvas`/`dragClip`/`slider`/`group`/`split`/`addMedia` agent actions (the stages that ship what they drive).

### S3 · First real connection (no third party) and minimal UI

- **Files:** `RtcLink`, minimal-SDP codec and auth in `collab-link.js`/`collab-signal.js` (no drivers yet). `collab-ui.js` v1: profile prompt, Share panel (people, roles, "Add someone with a code", Stop sharing), Join sheet (connection codes), knock card, banner. Also `#btn-share` plus the grab list, the `#collab-people` chip in its basic form, Home badge, menu and `#hm-join-btn`, Settings Labs rows, and lazy `vendor/qrcode-generator.js`.
- **Tier-4 tests:**
  - channels open with negotiated ids
  - a 300 KB ctl fragmentation round trip
  - 20 MB bulk under backpressure (`bufferedAmount` never above 4 MiB plus one chunk)
  - chunk size respects `maxMessageSize`
  - real offer → codec → rebuilt SDP connects
  - auth: good; wrong key denied; **tampered fingerprint denied**
- **UI tests:**
  - HTML in a name renders as text
  - Share panel and Join sheet at 380 px: no horizontal overflow; at 1280 px, anchored to `#btn-share`
  - Labs off: no collab DOM
  - profile colour validation
- `/security-review`.
- **Visible:** first usable version for Ezra, behind Labs: Mac ↔ iPhone on the same Wi-Fi with codes.

### S4 · Media

- **File:** `collab-media.js`, plus the export-dialog hook.
- **Tests:**
  - manifest groups the same File; split and duplicate reuse locally (0 bytes transferred)
  - `splash.mp4` (649 KB, repo root), a PNG and a WAV all transfer, and the guest renders a non-blank frame (pixel check)
  - resume after the link dies mid-file (`from > 0`, identical bytes)
  - `pruneOrphans` during a transfer keeps the parts
  - replace media stashes prev, and undo restores it on both sides
  - a guest-added image reaches host IndexedDB and a third peer
  - insufficient storage gives the card and no writes beyond what fits
  - guest export waits and "Export anyway" works
  - fonts transfer and apply
- `/security-review`.
- **Visible:** real projects with footage.

### S5 · Presence visuals

- **Design step first:** render the people chip, canvas boxes, timeline rings and playheads, and the Share panel as options at 380 px and at 24 px/real size; pick the recommended one; send pictures (rule 16).
- **File:** `collab-presence.js`, plus lease UI and follow.
- **Tests:**
  - a 3-layer remote multi-select gives 3 `.cb-box` (1 solid, 2 dashed) and 3 `.clip.peer-sel` with the right `--peer`, on both the PC frame and the 380 frame
  - **`FM.requestRender` spy stays at 0** during 2 s of remote cursor movement
  - `.tl-peerhead` at `timeToX`; off-screen gives an edge chip
  - avatars and "+N"; away greys
  - follow tracks within 0.4 s and ends on a local tap
  - text lease: B is refused with a toast, and the lock shows
  - pointer and selection toggles hide overlays
  - the chip overlaps neither `#view-bar` nor the canvas at 380×800 (9:16 and 16:9) and 1280×800
- **Visible:** yes.

### S6 · Links, codes, relay and automatic reconnect

- **File:** `collab-signal.js` drivers (PeerJS on 443, MQTT ×2), envelope, invite link and 9-character code, `#j=` flow, member tokens (rejoin skips knock), §13.5 schedule, `here` announce, iOS landing card, wake lock, host resume on reopen, Codes-only setting, schema-gate UX.
- **Tests:**
  - envelope seal and open; tamper, replay (old ts, reused nonce) rejected; ciphertext contains no `a=fingerprint`
  - the link is read from the fragment only; `fm.pendingJoin` survives a `?fresh=` reload
  - Crockford normalization; PBKDF2 derivation stable
  - MQTT client against an in-page fake WebSocket broker (CONNECT, SUBSCRIBE, PUBLISH frames)
  - PeerJS client against a fake (OPEN, OFFER relay, EXPIRE, ID-TAKEN retry)
  - with one driver dead the join still works; deliveries dedupe
  - knock allow, deny and timeout; token rejoin skips knock; a removed member is refused
  - `here` triggers an immediate re-offer
  - schema-gate messages in both directions
  - iOS landing card for an iOS non-standalone user agent
  - Codes-only starts no WebSocket (constructor count)
- `/security-review`.
- **Visible:** "tap a link and you're in".

### S7 · Roles, comments, owner control

- **File:** `collab-comments.js`, role UI and gating, remove and rotate, editors-can-invite, viewers-can-export, delete-anyway, canvas-size confirm, "Earlier versions…".
- **Tests:**
  - a forged op injected at the host from a viewer is rejected; a commenter can add a comment and edit only their own; an editor can change the canvas after a confirm
  - live role change toggles gating classes immediately
  - remove sends `bye removed`, revokes the token, rotates link and code, and the old link fails auth
  - comments: add, reply, resolve; ruler mark at `t`; export is never blocked by comments
  - `roExport` off shows the message
  - deleting a leased layer is rejected, and force works
  - checkpoints: at arm, every 10 min if changed (fake clock), keep 10; restore creates a new project with media
- `/security-review`.
- **Visible:** yes.

### S8 · Hardening and release

- **Contents:**
  - adversarial peer fuzz: 60 s of malformed and oversized messages; the host never throws, never accepts invalid input and stays responsive
  - 8-peer loopback convergence fuzz
  - large project under CDP 4× CPU throttle: commit-hook diff ≤ 30 ms at 500 layers; hot tick ≤ 8 ms
  - accelerated 1-hour soak: `ring`, `lastBy`, `pending`, the ack cache and presence pools stay within their caps
  - in-app QR scanner (`BarcodeDetector` where present, else lazy `vendor/jsqr.js`) decodes generated codes
  - full 380 and 1280 layout pass
  - Labs "Test connection" row
  - multi-agent review with refuters (clause 15)
  - `/security-review`
  - `BEFORE-PUBLISHING.md` entries: "Share panel modelled on Google Docs"; "invite links show the UI to other people"
  - `CLAUDE.md` note on running the collab tests
- **Labs gating is kept** until he has done Tier 5 (Q7).

---

## 27. Judge findings and where they are fixed

| Finding | Fix |
|---|---|
| Derived writes pollute diffs, masking and undo (J1: D1 #1, #2, #14; D3 #10) | §11.1 `normalizeDerived` before every diff and hash; §5.5 equality no-op; leaf-level undo recs |
| Sanitizing live objects breaks identity (D3 #2) | §11.2 sanitize a clone, patch in place |
| Wrong undo "before" value (D3 #1) | §10.1 recs recorded at diff time |
| Own echo not re-applied (D3 #3) | §8.5 |
| Pending ignored descendants (D3 #4) | §8.1 two-way prefix overlap |
| Offline edits silently discarded (D3 #5); arrival-order overwrite (D1 #3) | §13 outbox, CAS, visible clash toast, save-as-copy |
| `li` anchor missing (D3 #6, D1 #7) | §6.4 upsert with fallback; host broadcasts the resolved anchor |
| Half-done async states, paste slot (D3 #7, D1 #10, D2 #14) | §8.9 busy barrier; S0 job brackets |
| False desync at join (D3 #8) | §7.3 pre-sanitize at arm |
| Host held by a timing guess (D3 #9) | §8.2 held and re-assert, released at commit or settle |
| Settle guard ran before the gesture's own handler (D1 #12) | §8.2 settle on the next tick after `interacting()` goes false |
| No autosave on remote apply (D1 #8, J2) | §7.1 step 12, §8.6 step 6 |
| No export freeze (D1 #9) | §8.9 |
| Effect index or occurrence guards (D1 #4, #5) | D16 uids |
| Draw tool unleased (D1 #15) | §17.2 |
| No divergence detector (D2 #3) | §11.4 |
| Collab metadata filling the localStorage quota (D2 #7) | §12.4 (IndexedDB) and the §12.2 room check |
| Tombstoned media lost on host reboot (D2 #8) | lr keeps records; checkpoint keep-set; `reachable()` |
| Old guest copies on the host's ids (D2 #10) | §12.3 detach re-ids; §12.2 refusal plus Replace / Keep-first |
| Per-frame clones (D2 #11) | no preview clones; real ops only |
| Session start dropped owner undo (D2 #12) | §10.4 pre-session steps |
| Exact version gate vs 30 builds a day (J2 #1) | D13, §14.7 |
| SW reload mid-session (J2 #2) | §14.8 |
| Copy and Share need transient activation (J2 #3) | §19.1 synchronous room creation |
| Guest could rescale via the oversize toast (J2 #4) | §4.2 `warnOversizeProject` guard |
| Guest doc vs 5 MB localStorage (J2 #5) | §12.2 check 4 |
| Presence forcing full renders (J2 #6) | §18.3 own rAF; spy test |
| Phone host backgrounded after sending the link (J2 #7) | §13.5 fast retries plus `here` |
| 380 px overlay crowding (J2 #8) | initials chips; edge chips |
| Media needs 2× space (J2 #9) | §15.4 `Σ + max` |
| Share UI built on the hidden `#hm-dialog` (J2 on D1) | §19 body-level `FM.ask` family |
| Presence hidden while editing; version pill removed (J2 on D1) | D18 stage chip; `#ver-m` untouched |
| Join link lost on reload (J2 on D1) | §14.2 stash before `replaceState` |
| Single broker; broker ports blocked (J2) | §14.4 PeerJS on 443 plus 2 MQTT in parallel |
| Follow mirrored the viewport; 0.1 s re-seek (J2) | D19, 0.4 s |
| `bye` on `pagehide` unreliable on iOS (J2 on D3) | liveness is by ping silence; `bye` is best-effort only |
| Hashing every file before the manifest (J2 on D3) | §15.1 File-identity fids, no hashing |

---

## 28. Unverified: Stage 0 probes must measure these (`tests/_collab-probe.html`)

1. `*.localhost` iframes load under headless Chrome through `serve.sh` (bound to 127.0.0.1) with separate, partitioned storage, working WebCrypto and working Web Locks. Otherwise use the `fmns` fallback (§25.3).
2. Two `RTCPeerConnection`s with `iceServers: []` connect headless. Measure mDNS flakiness; add the `_cdp.py` flag if needed.
3. Real SDP size and candidate count, `pc.sctp.maxMessageSize` and `CompressionStream` availability in headless Chrome. On iPhone this happens later through the S8 "Test connection" row.
4. The PeerJS server passes an opaque `payload` through untouched, and the EMQX/HiveMQ wss endpoints and ports answer (a manual probe, run once).
5. Diff cost at 500 layers under 4× CPU throttle. Sets the tick-rate defaults.
6. iOS memory when building a `File` from IndexedDB-backed Blob parts. This is his device check; flag it in Q-later.
7. No sanitizer strips unknown `project.comments` or `notes` fields on load. If one does, whitelist them, with a byte-identity test.
8. `FM.eachRefFx` and `FM._fillFxParams` cover caption-cue effects, so hashes stay stable.

---

## 29. Questions for Ezra later (each with a recommendation)

1. **The free relay sees internet addresses and timing, never the project. Allow it?** Recommended: **yes by default**, with "Codes only" always available. This is the one place "nothing leaves the device" bends.
2. **How many people?** Recommended: **8** (12 on a PC host, 6 on a phone host). Unlimited needs a real server later.
3. **Where things sit on screen** (sent as pictures): the people chip on the canvas area top-left (recommended), versus a top-bar button that squeezes the project name, versus a dot on the cog.
4. **Presence colours and the Share panel look** (sent as pictures). Recommended: the drawn default.
5. **Ask before people join?** Recommended: **on**, with "let them in" available for links.
6. **After sharing ends, guests keep a normal copy?** Recommended: **yes**, which matches "do whatever they want".
7. **Keep it under Labs until you've tried Mac ↔ iPhone yourself** (same Wi-Fi, then mobile data, then lock/unlock)? Recommended: **yes**. It takes about 5 minutes of your time and nobody else can do it.
8. **Hosting from a phone:** allowed, with "keep the app open". Recommended: host from the PC when you can.
9. **Later upgrades:** tint the exact inspector row someone is dragging; comment pins on the canvas; a bring-your-own relay (TURN) key, entered like the AI key, for the roughly 10–20% of cross-network connections that fail. Recommended: **later, in that order**.
10. **Before any public link, demo or tutorial**, the Alight-Motion-style UI needs its re-skin (BEFORE-PUBLISHING.md). Recommended: private invites to friends are fine now; re-skin before anything public.