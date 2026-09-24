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
| `js/collab-media.js` | `FM.collab.media` | Manifest, want/have, bulk transfer, IndexedDB parts, resume, sameAs, replace/prev, fonts, storage checks, GC. (≈650) — **as built (S4) ≈760**, plus the `#collab-media` progress card; `sameAs` is the manifest's own grouping rather than a wire field (§15 as-built). |
| `js/collab-presence.js` | `FM.collab.presence` | `pr`/`PR` messages, canvas overlay, timeline paint, remote playheads, people chip, inspector chip, follow, lease UI. (≈750) — **as built (S5) ≈1170**, plus the `roster` and `lease-no` halves of §20 that nothing sent before S5 (see §18 "as built"). |
| `js/collab-ui.js` | `FM.collab.ui` | Share panel, Join sheet, knock card, banner, profile prompt, iOS landing card, Home hooks, Settings Labs rows. (≈1100) |
| `js/collab-comments.js` | `FM.collab.comments` | Comments card, composer, ruler marks. (≈400) |
| `vendor/qrcode-generator.js` | global `qrcode` | MIT, about 20 KB, loaded lazily with `?v=1`. |
| `vendor/jsqr.js` | global `jsQR` | Apache-2.0, about 130 KB, loaded lazily with `?v=1` (S8). |
| `tests/collab-agent.js` | test-only | RPC agent (§25.3). The app loads it only under the localhost + `fmtest=collab` gate. |
| `tests/_collab-probe.html` | test-only | Stage-0 probes (§28). |

**Styles:** add a `/* ═══ COLLAB (#921) ═══ */` section at the end of `styles.css`, plus glass overrides in `theme-glass.css`. **Do not create `collab.css`.** The buster gate only watches `styles.css` and `theme-glass.css`.

**As built (S3):** `collab-signal.js` ships the codes-only half only (§14.5/§14.6 as-built notes);
`collab-ui.js` ships the profile prompt, Share panel, Join sheet, knock card and banner and is ~700 lines
rather than 1100, because the link, QR, settings drill-in, Home badge and comments halves belong to the
stages that ship what they point at. The two `vendor/` files are not loaded at all yet.

**As built (S6):** `collab-signal.js` gains the relay (≈+700 lines: room codes, PBKDF2, the invite
link, the sealed envelope and its receiver rules, the hand-written MQTT 3.1.1 and PeerJS clients, the
rendezvous, one dial and one answer). **`vendor/qrcode-generator.js` is NOT used:** `js/collab-qr.js`
(≈230 lines, `FM.collab.qr`, loaded eagerly like every collab script) draws the invite's QR by hand —
the link is 88 bytes, a version-6 symbol at level M, so one mode, one level and ten versions cover it,
where the library is 20 KB for forty versions and four modes and would have had to be fetched (vendor/
does not hold it, and pulling a third-party file into the repo is a download nobody reviewed). The suite
checks it the only way that means anything: the browser's own `BarcodeDetector` reads the symbol back
and must get the link byte for byte (versions 1, 5, 6, 8 and 10 were decoded while it was written).

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
| `index.html` | `#topbar` | ~~Add `<button id="btn-share" class="hidden">`~~ **Not done, deliberately: `collab-ui.js` builds the button on install and removes it on uninstall, so with Labs off there is no collab DOM at all rather than hidden collab DOM (see §23).** | S3 |
| `js/app.js` | `pcTransportLayout` far list | Insert `'btn-share'` before `'btn-export'`. With Labs off the id does not exist, `grab` returns null and the row is byte-identical — which is what keeps the Studio layout test green. | S3 |
| `js/home.js` | card menu (:1283-1340), `.hm-top` (:2604-2616), `projectCard` (:1254) | Menu items and the `.hm-live` badge (§19.6). **S3 changes this file NOT AT ALL:** `#hm-search-btn` is static markup in index.html, so `collab-ui.js` inserts `#hm-join-btn` beside it on install whatever order things boot in, and a hook here would be a line with no way to fail. The menu items and the badge are link- and presence-shaped and move to S6/S5. | ~~S3~~ S5/S6 |
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
      **And a keyed element that still EXISTS goes back as an `ai` upsert with its anchor, never an `s` (S8).** The sender
      of a refused `ar` has already removed it from its own copy, and an `s` on a missing element is `'gone'`; a refused
      `am` needs its position back as well as its fields. A whole layer already went back as an `li`.
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

**As built (S3): `ask` DEFAULTS TO FALSE while codes are the only way in, and the record carries no
`code` or `codesOnly`.** `ask:true` is the right default for the INVITE LINK — a link can be forwarded,
so an unknown person can arrive and the owner must get a say. S3 has no link: the only way in is a
connection code he read out and whose answer he pasted back himself, and §14.5 says in as many words
that pasting the answer "counts as admitting the guest: no knock". Defaulting to `true` here would make
the app ask him to approve the thing he has just done, every time. The switch is live in the Share panel
(the "When someone joins with a code" row), so the knock card is reachable the moment he wants it; S6
ships the link and with it the `true` default for that half. `code` and `codesOnly` are absent because
the 9-character room code and the relay drivers they belong to are S6.

**As built (S6):**
- **`code` is in the record and `ask` defaults to TRUE** — for the link (D5). A room saved by S3 has no
  `code`; the first read gives it one AND sets `ask:true`, once: S3's stored `false` was S3's default for
  codes, not a choice he made about links, and there is no way to tell the two apart. The switch is right
  there in the panel.
- **`codesOnly` is NOT in the record.** It is the device setting `collabCodesOnly` (§19.8) and nothing
  else — one switch in one place, read wherever a relay would start.
- **`members` is keyed by the id the member's token is filed under** (`r` + 16 hex), not by the engine's
  mid (`m1`, `m2`…, which restart with every session): `{name, color, role, dev, tok, pmk, added, last}`.
  `pmk` is the profile key the joiner said hello with. `blocked` holds removed members' ids AND `p:<pmk>`,
  so a removed phone is refused both on its token and when it comes back through the link.
- **The UI remembers WHICH project the room is for** (`useRoom(pid)`). It used to keep one `hostRoom` for
  the page's life, so sharing A, switching to B and sharing B with a session that already existed ran B on
  A's link and member table. Found by the S6 suite run in order.
- **Resume on reopen (`paused → arming`) is real:** opening a project whose host record still exists
  (Stop sharing is what deletes it) arms it again on the SAME room — same link, same code — and says so.
  It is a new epoch even without a reload (guests take a snapshot instead of a tail); keeping the epoch
  across a project switch would mean keeping the host alive while its document is not open, which is
  exactly what `paused` stands down.
- **A guest reads `bye{why:'paused'}` as the wire going, NOT as the end.** Until S6 it set `ended`, which
  was harmless while nothing reconnected; with S6 it would have marked the copy ended on disk, started no
  reconnect, and DETACHED the copy on its next open — so an owner glancing at another project would have cut
  every guest loose for good. The guest now closes the link itself, goes offline, and the reconnect finds the
  owner when he reopens the project. Only `ended` and `removed` end a copy. Guarded by its own test.

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
  - **As built (S3): [Delete] is NOT offered, and the message no longer implies it is.** `FM.ask` builds
    exactly two buttons, so the dialog cannot express three answers; the S3 build shipped the three-answer
    *sentence* over the two-answer dialog, pointing at a `C.leave({keep:false})` branch with no caller
    anywhere in the app. The wording now describes what the two buttons do. The third button arrives with
    a third-button `FM.ask`, not before it.
  - **As built (S3): turning Labs off while a guest routes through `C.leave`, not `C.end`.** `C.end` is the
    owner's door and does not `detachLinked`, so the switch used to strand the linked copy — still marked
    `collab`, still holding the host's layer ids, with the only UI that could detach it removed in the same
    call.
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
- **As built (S4): `C.media.gcParts()` collects the `part` family, and still nothing sweeps at boot.** §23's bargain is that no collab code runs at load, and an IndexedDB sweep is the one thing in this table that would break it — so the collector runs when a SESSION ENDS, which is the moment an abandoned part is known to be abandoned. A part younger than a week, in a room that still exists, is somebody's resume point and is left alone; a part that is arriving right now is never a candidate. `ckpt` is trimmed by the arm that writes it (S3) and `base` by the guest that owns it (S2), so there is still no `FM.collab.gc()` and nothing needs one.
- **`FM.collab.gc()` is NOT in S2.** Of the three key families in the table, `ckpt` is written by arming (S3), `part` by media (S4), and `base` by S2 — so a collector shipped now would run at every boot, on every device, to collect two kinds of key that cannot exist yet. §23's bargain with a solo user is that `collab-core.js` does nothing at load; a boot-time IndexedDB sweep is the one thing in this table that would break it. It ships with the stage that creates the keys it collects.

**As built (S7), checkpoints:** written at arm (S3), **every 10 minutes while anything changes**, and at
Stop sharing; ten kept. "Changed" is the host's own counter — `epoch:seq` differs from the last save point's —
because every change anybody makes, his own included, is a sequenced batch, and comparing two numbers costs
nothing where hashing the document every tick would not. The timer (30 s) exists only while he hosts and goes
with the session. A save point's key time comes from one clock and never repeats (two in one millisecond used to
share a key). "Earlier versions…" is in the settings menu (§19.1 as built).

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

**As built (S6) — `startRecon` in `js/collab-ui.js`.**
- **An attempt is ONE offer and its wait (`ANSWER_WAIT`, 6 s); the schedule is the pause BETWEEN
  attempts.** Read literally, "every 3 s" against §14.3's "a host rejects more than 10 offers per minute"
  means one honest reconnecting guest (20 a minute) is refused by the very host it is trying to reach. So
  the host's ten is **per peer tag**, the room as a whole takes thirty (`OFFERS_ALL_PER_MIN`), and an
  attempt plus its pause is ≥ 9 s — under the ten. Both numbers are in `C.LIMITS` with this reasoning.
- **An immediate retry cancels an offer still waiting for its answer** (it went to a host that was not
  there) and sends a fresh one at once; an attempt that already has its answer is left to finish.
- **Three refusals stop it for good, by name:** `removed` and `ended` (the copy is marked, §12.3) and a
  token the owner no longer knows (`lost`: "This invite no longer works"). Everything else is a room that
  is not there yet.
- **A copy that joined by connection code has no reconnect** — it knows no room to find, and a relay
  topic derived from its token would need the owner to listen on one topic per member. Its banner keeps
  S3's sentence, which promises nothing. Codes only likewise: no relay, no reconnect.
- **The guest notices the owner going quiet** (§20 ping/pong, built here): a ping every 2 s, and six
  seconds with NOTHING from the owner on any channel closes the link, which is what starts the schedule.
  It is off unless the link is a real one (`setLiveness`), because a hand-ticked test would otherwise
  read the pause between two ticks as silence.
- **§12.3's "7 days of failed reconnects → detach" is NOT built.** It needs a failure count that
  survives launches for a rule whose only effect is a toast a week late; a room that says `ended` or
  `removed` detaches on the next open already.

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

**As built (S6):** the stash (`FM.collab.stashJoin`) runs at the FOOT of collab-core.js, after the
test-agent gate — `fmwipe=1` clears localStorage there, and a stash written first would be wiped by the
very reset that lets a tier-3 frame start clean. It writes only a well-formed 44-character invite, so a
hand-typed `#j=anything` cannot plant a value the join flow then has to distrust. Step 3 is a guarded
one-liner in app.js's boot tail (`FM.collab.ui.afterBoot()`), and the order is: the iOS landing card,
then Labs (a card with [Turn on]), then the profile, then the Join sheet filled in and already joining.
The invite is spent on use — joined, or put away — or after 24 h. iPadOS reports itself as a Mac, so a
Mac with a touch screen counts as iOS.

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

**As built (S6), §14.1–§14.4, each departure measured or reasoned:**
- **Who offers.** On the relay the GUEST offers (§14.4's table) with `createOffer({key:false})` — no `mk`
  in it, because the key it proves is the room's (or its member token) and a second key riding inside the
  sealed envelope authenticates nothing the envelope's key does not.
- **The code's HKDF salt is the PBKDF2 salt** (`freemotion-collab-code-v1`). §14.1 says only "the same
  four labels are derived from C"; the one value a joiner holding nine characters can know is a constant.
  PBKDF2 is 200 000 rounds, measured at 28 ms on his Mac, and cached per code so a reconnect every few
  seconds does not pay it each time.
- **The invite link is built on the live address** (`S.APP_URL`), not `location`: a link made on a local
  copy would otherwise send the phone to 127.0.0.1. The reader accepts any address — only the fragment
  matters — and never looks at the query.
- **`re` is added to the envelope's inner:** an answer names the nonce of the offer it answers, so a guest
  that has moved on to its next attempt can never pair an old answer with a new peer connection.
- **The nonce cache is also the de-duplication**, and a nonce is remembered only once it has DECRYPTED,
  so junk on a busy public broker cannot fill the cache and push a real nonce out of it. The same envelope
  arriving through three relays is acted on once (the suite counts both halves: three copies arrived,
  one was acted on).
- **Offers: ten a minute per peer tag, thirty for the room** — see §13.5 for why the literal "ten" would
  refuse the reconnect it exists for.
- **`relayGate()` is checked by every driver immediately before it constructs a socket,** and it refuses
  for Codes only and — on a loopback page — for any WebSocket class that is not a test fake
  (`FM_FAKE`) unless the page opted in with `?fmrelay=1`. That makes "the suite never touches the
  network" a lock: a test that forgot the fake broker gets a refused driver, not a connection from his Mac.
- **ICE servers are `[]` whenever Codes only is set, online or not** (the spec says "Codes only AND
  offline"). A STUN server is a third party that learns his address; the mode whose promise is "needs no
  third party" cannot ask one. Also `[]` offline and on loopback. The connection-code path (S3) stays at
  `[]` too — it is the fully serverless fallback for when relays are blocked.
- **`here` travels on MQTT only.** PeerJS delivers to one id at a time and the owner does not know his
  guests' ids; the brokers carry it to every guest listening on the room topic. A driver that comes back
  up after being down says `here` again (once a second at most).
- **PeerJS `ID-TAKEN`** (his previous page still holds the room's id for up to a minute after a reload)
  is retried at 1, 2, 4, 8 s for 60 s while MQTT carries the room; a guest's id is random and is simply
  redrawn.
- **A driver retries on its own** (3 s, then 10 s, then 30 s), and `kick()` — on foreground, `online` or a
  `here` — retries now. A refusal from the gate is not retried: waiting changes neither answer.

### 14.5 Connection codes (the fully serverless path)

- **Minimal codec:** `{v:1, r:'o'|'a', ufrag, pwd, fp:32 bytes (sha-256), setup, cands:[{t:host|srflx, ip:4B|16B or mdns:16B uuid, port:u16}] ≤6, mk?:16 bytes (offer only)}` → binary → Crockford base32 with the prefix `FM1-`. That is QR alphanumeric mode, about 250 characters for about 150 bytes (**Stage 0 measures the real size**).
- The remote SDP is rebuilt from a data-channel-only template: `m=application 9 UDP/DTLS/SCTP webrtc-datachannel`, `a=ice-ufrag/pwd`, `a=fingerprint:sha-256`, `a=setup`, `a=mid:0`, `a=sctp-port:5000`, `a=max-message-size:262144`, plus candidate lines. **The local description is never modified.**
- **Flow:**
  1. The host taps "Add someone with a code" and gets an offer code (QR plus text).
  2. The guest pastes or scans it and gets an answer code.
  3. The host pastes or scans the answer.
- The host pasting the answer **counts as admitting** the guest: no knock, role = link role.
- The auth handshake uses `mk`.

**As built (S3), measured rather than estimated.** The line above guesses "about 250 characters for about
150 bytes". In this repo's own headless Chrome a data-channel offer gathers **one** mDNS host candidate,
with a 4-character ufrag and a 24-character password: **103 bytes → a 165-character code**, and the offer
(which carries `mk`) is 195. The 250-character figure was the six-candidate case; two devices on one
Wi-Fi produce one. Three other departures, all in `js/collab-signal.js`:
- **The candidate address is re-validated on the way out, not pasted through.** A code is the one input
  in this feature a person types in by hand off another screen, so `buildSdp` interpolates only an
  address that has come back through the IPv4 / IPv6 / mDNS-UUID decoder. An SDP line is a parser's
  input and a `\r\n` inside a field would let a code inject whole attributes.
- **IPv6 is parsed with the browser's own URL parser** rather than by hand: `::`, `::ffff:1.2.3.4` and
  every zero-compression form are exactly where a hand-written splitter is wrong, and wrong here means a
  candidate that silently never connects.
- **PBKDF2 is NOT in this file yet.** §14.1 lists it, and its only job is turning a 9-character ROOM code
  into a rendezvous key — which needs a rendezvous, i.e. S6. A key-stretching function with no caller is
  something a later stage would have to re-check rather than write.

### 14.6 Auth handshake (ctl, before any document data)

```
H→G {t:'auth1', v:1, nH:<b64 16B>}
G→H {t:'auth2', nG, mode:'link'|'code'|'tok'|'conn', mid?, mac}
H→G {t:'auth3', mac}                       | {t:'deny', why:'auth'}
mac_G = HMAC(K, "fm-auth-g|"+sid+"|"+fpG+"|"+fpH+"|"+nH+"|"+nG)
mac_H = HMAC(K, "fm-auth-h|"+sid+"|"+fpG+"|"+fpH+"|"+nH+"|"+nG)
K = K_auth (link) | K_auth from C (code) | member tok (tok) | mk (conn)
```

- `fpG`/`fpH` are the `a=fingerprint:sha-256` values from the local and remote descriptions. A relay that inserts its own certificates makes the two MACs disagree **— as long as it does not hold `K`.**
- `LoopLink` uses `'loop'` for both fingerprints. Tier 4 tests the real binding, including a tampered fingerprint.

> ⚠️ **AND IN MODE `conn` IT DOES HOLD `K`, SO THE BINDING ALONE IS NOT ENOUGH (found in the S3 review).**
> `K = mk` there, and `mk` is packed **inside the offer code** — the very string one person copies into a
> chat app and the other pastes back. Anyone who can rewrite that message holds the key *and* the
> fingerprint it is meant to authenticate: they keep `mk`, substitute their own certificate and
> candidates, answer the owner with a second certificate of their own, and then compute **both** MACs,
> because each leg's MAC is over the fingerprints that leg really uses. Both handshakes resolve, both
> screens say connected, and the whole document flows through them with no warning anywhere. The binding
> is effective against a relay in the MEDIA path (a TURN server); it is not, on its own, against one in
> the CODE path. §14.1's room code does not have this problem — there the key never travels — which is
> where the original sentence came from.
>
> **So the handshake also derives a SHORT AUTHENTICATION STRING, and S3 gates admission on it:**
> `sas = base32(HKDF(K, salt = fpG|fpH, info = "fm-sas", 3 bytes))[0..5]` — five Crockford characters,
> returned on **both** sides of `S.handshake`. The Share panel shows them as *Step 3 · check these letters
> match theirs* with [They don't match] / [They match], and the Join sheet shows the joiner's copy to read
> back. `s.addPeer` does not run until the owner has confirmed. Under a relay the two legs hold different
> fingerprints, so the two strings differ and the person reading them aloud is the detector. **§14.6's
> invite link (S6) must not be built on the unqualified sentence above.**

**As built (S3), one addition to the `auth1` line and it is deliberate:** it carries `sid`, `nm` and `cl`
as well as `nH`, and the guest MACs over the `sid` the host stated.
On the CODE path there is no rendezvous and no invite link, so **the joining device has no other source
for the room id** it must write onto its linked copy (§12.2 `createLinked`), or for the host's name to
put on that card — `welcome` carries neither. They are unauthenticated at that instant, which is exactly
right for what they are: a display name and a room id. The MAC one line later covers `sid`, so a peer
that lied about it cannot then agree about the key, and the name is clamped like every other peer string
(§14.9). The alternative was widening `welcome`, which is the engine's message and is S2's, tested.
Also: **the handshake OWNS `ctl` while it runs and hands `onmessage` back exactly as it found it**, and a
refusal CLOSES the endpoint rather than merely rejecting — otherwise a denied peer is still holding an
open link that something could hand to a session.



**As built (S6), the handshake on the relay:**
- **The host does not know the key until `auth2` says which one** — the room's (mode `link`/`code`) or
  the member's token (`tok`). `S.handshake` takes `keyFor(mode, mid)` instead of `key`; it answers the
  key, or `{deny: why}`. The room's key is only ever valid on the room it came in on, so a code cannot
  authenticate on the link's topic.
- **A refusal carries its reason** when it is one the other device has a sentence for (`removed`,
  `full`, `ended`, `busy`); anything else — a wrong MAC, a timeout — is `auth`, which tells a prober
  nothing.
- **Who can sit in the middle, stated exactly** (the warning above, answered): a relay OPERATOR never holds
  the link, so it can neither open an envelope nor forge the MACs over its own certificates. Somebody who
  HOLDS THE LINK OR THE CODE can: decrypt a joiner's offer, answer first, and relay both legs. That person
  could also simply join, which is what the knock is for — so the five SAS letters are shown on the knock
  card ("Their screen shows K7F2M") and on the joiner's waiting line ("If they ask, your screen shows
  K7F2M"), offered rather than gated, because the link's promise is one tap. The link and the code are
  bearer secrets and the Share panel says so.
- **A hello that lands while the host is still deriving the letters is kept, not dropped** (`ep._early`,
  read by the owner's `awaitHello`): the guest answers `auth3` the moment its own check passes, and the
  host's `sas` is one more WebCrypto call after it sent `auth3`.

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

**As built (S6):**
- `hello` carries `proto`, `schema`, `app`, `mk` and `dev` on EVERY hello — the first and each reconnect —
  through one builder (`helloMsg`), so the knock card, the gate and the member table read the same fields.
- **A hello with no `proto` is let in.** Every S3–S5 build says hello without one (only the welcome
  carried it); those builds run PROTO 1 / SCHEMA_REV 2 exactly like this one, and S6 adds nothing to the
  wire an older build cannot ignore. Refusing them would refuse a compatible device for a field it was
  never asked to send.
- **Both sides gate.** The owner refuses with `deny{why, app, schema}` BEFORE any knock (a joiner he cannot
  work with is never put in front of him); the joiner also checks the WELCOME, because an owner on a build
  before S6 never gates at all.
- The owner's banner is "Sam has a newer FreeMotion" with **[Update now]** (the version label's own
  force-update) and a ×; the joiner reads "Ezra's FreeMotion needs an update before you can join — ask Ezra
  to tap the version number", or "Update to join — this FreeMotion is older than Ezra's" with **[Update]**,
  which re-stashes the invite first so the join resumes on the far side of the reload. A reconnect refused
  on version stops retrying and the banner says which side needs it.

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
  - **As changed by the S6 review:** that understated it — three relays, two STUN servers (Google, Cloudflare), public brokers anybody can listen on, and every link/code holder able to open a joiner's offer. The line now names all of them: "Free public services help the devices find each other: relays run by PeerJS, EMQX and HiveMQ, and Google and Cloudflare’s address lookup. They see your internet address and when a room is in use, and so can anyone watching those relays; anyone with the link or code can see the address of each device that connects. They never see your project — it goes straight between devices, encrypted." Settings → Labs says the same in short. Question 1 in §29 should be re-read against this wording.

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

**As built (S4). Eight departures, every one of them measured.**

- **`fid` is a hash of `fp`, not `'f' + n`.** A counter is state: it has to survive every manifest delta,
  a host reload and the two directions this module is symmetric in, and two peers counting independently
  hand the same name to different files. `fp` is already what §15.7 resumes by and what §15.2 dedupes by,
  so `fid = 'f' + cyrb53(fp)` is a name both ends compute rather than exchange, it is stable across a
  reload by construction, and it makes the part key (`collab:part:<sid>:<cyrb53(fp)>:<n>`) derivable from
  the fid alone. Two different files sharing a name, size and millisecond collapse into one entry —
  which is exactly what §15.2's own "another layer already holds a completed file with the same fp" rule
  does on purpose.
- **`media:[[newLid, srcLid]]` on the tx/b is NOT built, and is not needed.** §15.9 asks the bridge to
  tag a split, duplicate or paste so receivers copy locally. The manifest already carries that fact: two
  layers that share one File land on ONE entry with both layer ids on it, and §15.2 rule 2 copies the
  record across without a byte crossing. Adding the field would mean a new key on `tx`, on `b`, in the
  host sequencer and in the receive rules, to say a second time what the manifest says first. Measured
  by `921 S4 the manifest groups one file…`: two layers, one entry, one transfer, byte-identical.
- **A file smaller than one 4 MiB part has no resume point, by design.** A part is the unit that is
  KNOWN to be whole; a partial one persisted at an arbitrary moment cannot be told from a truncated one.
  So `splash.mp4` (649 KB) restarts from zero, which costs nothing, and the resume test uses a real ~9 MB
  image so the cut lands inside a second part.
- **The resume offset is the SUM of the stored part sizes, never `count × 4 MiB`.** The arithmetic is
  right only while every part is full; one short part makes the guest ask the sender to skip bytes that
  were never written, and the file is then the right LENGTH and wrong from that offset on. And if the
  sender answers from an offset that is neither ours nor zero, the transfer is abandoned rather than
  completed into a corrupt file (§14.9 — it is a peer, not a promise).
- **The bytes cross the §8.9 barrier; the APPLY waits behind it.** A completed file is parked until the
  export or the job finishes, then written. Holding the bytes as well would stall the other device's
  transfer for the length of a render and need the whole window re-sent; applying mid-export would change
  the frame under the renderer. It also makes §15.8's "Export anyway" honest: an export that starts
  without a clip finishes without it, rather than half with it.
- **§15.10's canvas checkerboard is S5, not S4.** It wants `boxFor` plus an overlay layer over the canvas,
  which is the surface S5 builds for presence; a second one shipped now would be torn out a stage later.
  The TIMELINE half ships: a `.clip.cm-missing` outline and a `.cm-prog` bar, painted from the same
  progress the card reads.
- **One new surface, not three.** §15.4's storage question and §15.8's export question are two-answer
  questions and go through `FM.ask` — the card family the app already has for exactly that, responsive at
  380 px, light/dark aware, Escape-trapping and proved since #919. The one thing the app has no shape for
  is a NON-question: a quiet line that says how far the download has got and, when it fails, says so.
  That is `#collab-media`, and it is the only visual S4 adds.
- **§21's media row lives in `C.media.LIMITS`, not `C.LIMITS`.** "All constants in collab-core.js" is
  about numbers more than one module reads; every one of these is read by `collab-media.js` and by nothing
  else, and `C.LIMITS` is frozen at parse time in a file three stages older. Frozen and exported, so the
  suite measures the real numbers rather than a copy.

**Seams this stage added to the engine** (`collab-session.js`): `S.sendMsg(mid, msg)`, `S.sendBulk(mid,
buf)` and `S.endpoint(mid)`, so the media module names a peer and sends without knowing whether it is
running on the owner or on a guest; `bulk` is routed straight to `C.media.onBulk` and the five media `ctl`
types are answered BEFORE §8.9's freeze queue, because none of them touches the document; and `S.tick`
ends by calling `C.media.tick(S)`. `LoopLink` now copies an ArrayBuffer as BYTES — `JSON.parse(JSON.
stringify(buf))` turns one into `{}` silently, so every frame "arrived" and the transfer completed with
nothing in it.

**Everything on a manifest is a stranger's string (§14.9), and two of them become more than data.** The
MIME is matched against a media-type shape before it reaches `new Blob`/`new File`, and a FONT FAMILY is
matched against `^[A-Za-z0-9][A-Za-z0-9 _-]{0,63}$` before it reaches `applyEmbedded` — it is registered
as a `FontFace` family and written into a font string that ends up in a `style` attribute and in
`ctx.font` on every device in the room, and the app's own import path takes that name from a file HE
picked rather than from a peer. An entry that fails either check is dropped whole: a font that does not
arrive is a smaller loss than one that does. A layer id is never used as a storage key until it has been
found in the OPEN document, so a manifest cannot make this device read or write a record belonging to a
project of his (mutation-proved).

**Found by the suite, and it is an APP hazard rather than a collab one: a filmstrip build is a global
queue.** `js/frames.js` builds one clip strip at a time across the whole app (`_stripQueue`), and a clip
that arrives triggers one. Tearing that `<video>` record out from under it — which `projects.remove` and
`releaseProjectMedia` both do — leaves the queue waiting on a seek that can never fire, and every
filmstrip after it is blocked for the life of the page. It bit the SUITE first (`timeline: Replace media
repaints the clip bar` failed only when an S4 test had run before it), and the S4 helper now waits the
build out. It is worth knowing about for S5 and for the real `leave`/`detach` paths: S4 does not change
it, and nothing in the app reports it.

**The part writes are chained and the part number is claimed synchronously.** `onBulk` is called from the
link's own dispatch and is not awaited, so a second frame can arrive while the first part is being
written: two flushes would read the same `inb.part`, write the SAME key twice, and the file would be
reassembled with a hole — a corruption with no error anywhere, because every write "succeeded".

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

### 16.4 As built (S7)

Everything in §16.1–§16.3 is built. Where the letter was wrong against the code, the safer reading was
measured and taken, and each is also a comment at the line that implements it:

- **⚠️ A comment's `by` and `at` are nobody's to write but the host's — an Editor's included.** §16.2 gives
  Owner and Editor "all ops" and, in the same breath, promises that comment identity "cannot be spoofed" by
  overwriting `by`/`at` on every `ai`. Both cannot be true: one `s P/comments/#i:c/by {name:'Ezra'}` from an
  Editor makes any comment read as his, and because ownership is read from `by.mid`, the person who wrote it
  can no longer edit it. So inside `P/comments` an Editor may insert, remove and move whole comments and
  replies (every insert is stamped), and change `text` and `resolved` — §16.1's "edit, delete or resolve
  anyone's" — and nothing else: not `by`, `at`, `id`, the pin (`lid`/`t`), and not the whole list at once
  (`collab-host.js` `editorCommentOp`). The S1 role table was changed to say so, with three new rows.
- **The FIRST comment is a whole-list set, and it is stamped too.** In a project whose document has no
  `comments` array yet, the diff sees a key only live has and emits `s P/comments [the comment]` — which the
  role table refused for a Commenter, so a Commenter could never post the first comment in a room. It is
  accepted where base has NO list, from anybody who may comment, and every element in it is stamped as the
  sender's exactly like an `ai` (`firstList`, `stampList`). Arming does NOT add an empty list to his project
  instead: that would be a document change on every Share and an extra step on his undo stack.
- **The backstop runs for every guest, not only the read-only roles, and it runs BEFORE the op is recorded,
  held or sent** (`collab-session.js` `pushLocal`, `revertToBase`). It asks the host's own `Host.allowed`
  against the same base the host will judge by, so the two can never disagree. For an Editor it only ever
  catches a comment stamp the host rewrote while a finger was down — a repair, said to nobody. For a Viewer
  or Commenter it writes base back and says once (4 s): "View only — ask Ezra for edit access" / "You can
  comment here — ask Ezra for edit access to change the project". **Nothing is sent**: the S2 test that
  measured the host's refusal and §8.2's forced list now makes its device believe it is still an Editor —
  which is exactly the moment a demotion is in flight.
- **Writing base back is the diff from live TO base, filtered to the refused paths** — not a hand-built
  inverse per op kind. The old owner-side `refuseLocal` wrote `s ['L', id]` for a refused delete, which
  `apply` answers `'gone'` for: an owner whose delete of a leased layer was refused lost the layer on his own
  screen while base kept it, and the next diff sent the delete again, every tick. A refused reorder puts
  the whole stack back to base's order.
- **The UI courtesy:** `body.collab-ro` (+ `.collab-viewer` / `.collab-commenter`) hides `#add-fab`, turns
  `#inspector` and `#key-rail` off, and puts one line above the inspector ("View only — you can watch, play
  and follow" / "Commenter — you can comment, not change the edit"). The inspector's controls container is
  `#inspector` itself (§16.3 left that to S7): the add menu lives inside it on a PC, so the one rule covers
  both. The canvas guards `startMove`'s drag (a locked press: it still tap-deselects, the view still pans
  and pinches), `startHandle`, and the layer pinch; the timeline guards the clip move (touch hold and
  mouse), trim, slip and keyframe drag — each after the selection handling, so a Viewer can still pick a clip
  to look at. Classes follow `role` the moment it lands (`bridge.onRole` → `ui.onRole`), with a toast
  "Ezra made you a Viewer", and go with the session. **They are also applied at `attach`**: somebody who
  JOINS as a Viewer gets no `role` message (nothing changed), and photographing a Viewer's phone showed the
  + and every inspector control live until the first role change — found by the picture, not by the suite,
  and the role test now starts as a Viewer. The layer actions (phone `#m-group/#m-dup/#m-maskgroup/#m-del`,
  PC `#btn-parent/#btn-group/#btn-maskgroup/#btn-del-layer`) are hidden and both name fields take no taps.
- **`roExport` is the Export button, not "save a copy".** §16.1 puts both behind the switch, but a guest's
  copy of the project is on its device by construction — the session cannot work otherwise — so claiming
  to block "keep my own copy" would be the dishonest half. The switch's own words say so: "Their device
  makes the video, so this only asks it not to — it can’t stop a screen recording, and their copy is on
  their device either way." A Viewer or Commenter pressing Export with it off gets an `FM.ask` "Exporting is
  turned off" and nothing opens.
- **`editorsInvite` hands an Editor the LINK, never the short code.** The owner listens on the code's topic
  only while it is fresh — half an hour after it was last on HIS screen (S6 review, `CODE_TTL`) — and he
  cannot know when an Editor's screen shows it, so a code shown there could be a door nobody listens at.
  The link does not lapse. Turning the switch off hides it again; "a link they already copied works until
  you reset it" is said under the switch. A Remove or a Reset re-sends the NEW link to every Editor who may
  invite, at once.
- **§20's `settings` is per member, not a broadcast.** One `s` to everybody would have handed the room's key
  to every Viewer. Each member gets `{roExport, editorsInvite, max, owner}` plus `link` only when it is an
  Editor and the switch is on — with the welcome, on every change, and again when its role changes.

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

- **Request:** presence `ls` is set to the tool's target layer while a tool is active: text-edit, mask, point-edit, crop, fill-drag, motion-path (`activeId`), draw, touchup, tracker or graph-editor. The target is `FM.scene.selectedId` unless the tool exposes its own id. **As built after the S5 review: fill-drag and an embedded (auto-started) point-edit are NOT leased** — they start themselves when a panel merely draws; see §18 "The S5 review".
- **Granting:** the host grants first come, first served, and publishes the lease in `roster.people[].ls`.
- **Denial:** a conflicting device gets `lease-no{lid, by}`, then `FM.cancelGesturesOn(lid)` and the toast "Sam is editing this — try again when they're done".
- **Expiry:** the tool closes (`ls:null`), the member disconnects, or 30 s pass without presence.
- **Delete-anyway:** deleting a leased layer is rejected, and the host's fix re-inserts it. The toast "Sam is editing 'Logo' — it wasn't deleted [Delete anyway]" sends `lr{f:1}`, which revokes the lease.

**As built (S5).** Everything above except Delete-anyway, which is S7's (its toast needs the three-button ask).
Three things were decided on the way, each in a comment in `js/collab-presence.js` as well:

- **A lease is refused BEFORE it is asked for, and the host still decides.** The presence tick sees a tool come
  up and knows at once whether somebody else holds that layer — the owner from `host.leases`, a guest from the
  last `roster` — so the refusal (close the tool through `FM.cancelGesturesOn`, toast "Sam Lee is editing this —
  try again when they're done") costs no round trip. Two people opening one layer in the same frame are separated
  by the host: first `pr` wins, the other gets `lease-no{lid, by}` on `ctl`.
- **⚠️ Only an EDITOR may hold a lease, and only on a layer that exists.** §17.2 grants "first come, first served"
  with no role in the sentence — but a lease blocks the OWNER's own edits on that layer (`H.local` in
  collab-host.js), so a viewer, or a hand-made `pr`, that could take one could lock him out of his own project one
  layer at a time for as long as it kept talking. Measured by `921 S5 a viewer cannot take a lease…`, mutation-
  proved. A viewer's tools cannot write anyway, so nothing is lost by not recording it.
- **The toast is throttled per layer (3 s).** A tool that does not close on request would otherwise be told so at
  the presence rate, fifteen times a second.
- **The lock shows in two places:** a 14 px lock in the holder's colour on the clip (`.clip .peer-lock`, on a
  dark backing so it reads on a clip of the same hue) and a lock glyph in the holder's name tag on the canvas.

---

### 17.3 As built (S7)

**Comments** are `js/collab-comments.js` (`FM.collab.comments`), installed only while Labs is on. Three
layouts were drawn first and rendered in the real app at 380 and 1280 (rule 16 / #545):

| option | what it is | at 380 / 1280 |
|---|---|---|
| **A · paper card** (built) | the notepad's card (§17.1): yellow glued edge, newest first, replies indented, resolved folded into "N resolved — show", the composer at the foot with the pin under the thumb | `comments-A-paper-380.png`, `comments-A-paper-1280.png` |
| B · inside the Share card | a thread list behind a [People \| Comments] segment in the dark sharing card | `comments-B-glass-380.png`, `comments-B-glass-1280.png` |
| C · speech bubble | one thread at a time, anchored at its ruler mark | `comments-C-bubble-380.png`, `comments-C-bubble-1280.png` |

A because a comment IS writing, and the app already has exactly one surface that says "people's writing"
at a glance. B made a comment look like one more sharing setting; C covers the ruler it points at on a phone
and still needs a list somewhere for the rest.

Departures from §17.1, each measured:
- **The ruler marks live in `#tl-ruler`, not `#tl-inner`.** The ruler row is `position: sticky`, so a mark
  in `#tl-inner` at ruler height scrolls away with the tracks, and `#tl-ruler` already carries the clip that
  keeps bookmarks off the icon column (queue 429). x is still `timeToX(t)`, less the ruler's offset. A mark is
  a `<button>` (the scrub skips buttons) whose pointerdown stops before the ruler's long-press menu.
- **A comment is timed even with no layer selected** — "At 0:04 on the timeline" — because the ruler mark is
  how anybody finds it again. Untick for a comment about the whole project.
- **Tapping a comment's "at 0:04" moves the playhead there** (and selects its layer for somebody who may edit).
- **`resolved` is written `false`, never deleted,** because the host lets a Commenter `s` his own `resolved`
  and refuses `d`.
- **The owner's own stamped comment is applied back to his live** (`pushLocal`, `commentStamp`), and a
  guest's own ack echo of a stamped comment is taken even while `P/comments` is held (the Post tap is still
  "interacting" for 250 ms) — otherwise live kept its guess at `at` and the next diff tried to send it.
- **Entry points:** a "Comments · N open" row in the Share panel and in the guest panel, and the ruler marks.
  The people chip's unread-count bubble (§18.5) is not built.
- **D9 holds and is tested:** an export with open comments goes straight to the export dialog; a note with
  `remind` still stops it (the control).

**Delete-anyway (§17.2):** the refused delete is put back where it was (the reverse diff above), and the
toast "Sam is editing “Logo” — it wasn’t deleted. Tap to delete anyway" is the button — `FM.toast`'s
`onTap`, so no three-button ask is needed. The tap runs the app's own `FM.deleteLayer` (its undo step, its
playback teardown) and the diff that carries it marks the `lr` `f:1`; `H.local` now revokes the lease on an
owner's forced delete as `receive` already did for a guest's.

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

### 18.8 As built (S5)

**Options were drawn first and rendered through the real app** (`tools/shot.py`, a real owner session, three
virtual guests on real LoopLinks sending real `pr` frames, the real module drawing them; the alternatives are CSS
or markup variants on top of it). Every PNG is kept, at 380×800 and 1280×900, named `<surface>-<option>-<width>.png`:

| surface | options (recommended first) | why the recommended one |
|---|---|---|
| people chip | **A1 stage top-left** · A2 stage top-right · A3 in the top bar | Measured: A2 sits on the view bar when it is open (chip 307–372 × 58–86 against the rail at 340–380 × 59–365 at 380 px). A3 pushed the project name AND the Export button off the phone's bar. A1 clears the canvas at 9:16 and 16:9 at both widths. |
| canvas selection | **B1 solid primary, dashed rest, one tag** · B2 tinted fill, all solid, a tag on every box · B3 corner brackets | B2's tint recolours the layer he is looking at and loses "which one are they editing"; B3 reads as crop marks and vanishes at phone size. |
| timeline selection | **C1 ring outside the clip, dots top-right** · C2 underline bar · C3 inset border | C1 leaves the clip's own colour untouched and the dark gap makes a ring in the clip's own hue still read. C3 was mistaken for the clip's border. |
| remote playhead | **D2 line + initial flag on the ruler** · D1 line + small triangle · D3 ruler marker only | Picked over the spec's bare line (D1): with three or more people a line's colour alone does not say whose it is, and the edge chip already carries the initial — so the initial is now always there, on screen or off. |
| pointer / tap | **E2 arrow + the same tag the outline wears** (initials on a phone, initials and name on a PC) · E1 arrow + initials only · E3 dot with halo + initials, filled tap | A pointer and an outline in one colour read as one person when they wear one tag. E3's dot hid what was under it. The arrow is 14 px, not §18.3's 12: at 1280 a 12 px arrow next to an 18 px tag read as a speck. |

**Decisions against the letter of §18, each measured, each commented in the code:**

- **Every `pr` carries the WHOLE state, not a delta** (§18.2 read as deltas plus a periodic full). `pres` is
  unordered and `maxRetransmits:0`, so a lost delta leaves a stale selection on somebody's screen and a late one can
  put back a selection that was already cleared. The complete state is a few hundred bytes (`sel` ≤ 64, and a frame
  that would pass 1 KB halves `sel` until it fits); `n` drops a late arrival outright. Still sent only on change,
  plus the heartbeat. The host's `PR` is split into ≤ 1 KB frames sharing one `n`, and a `full` frame is always
  taken — a host that reloaded counts from zero again.
- **The heartbeat is 2 s, not 5.** §22 greys an avatar after 6 s of silence, a number that came from the reliable
  2 s `ping` S6 builds. With presence the only liveness signal, a 5 s heartbeat on a lossy channel turns ONE dropped
  frame into a grey face; at 2 s three have to go missing in a row.
- **The send rate halves under backpressure only on `bufferedAmount`.** The RTT half needs S6's ping; a halving keyed
  to a number nobody measures would be decoration.
- **The people chip exists only while a session is live** (§18.5 has it as a "person+" Share button whenever Labs is
  on). The Share button already lives in both top bars (S3), and §23 promises no presence DOM without a session. Live
  and alone, the chip IS the person+ invite; with people, their faces (first on top, 3 then "+N", grey for away or
  silent, dashed for a reused colour, a conic ring with the percentage while their media is still arriving).
- **`md`** (a joining guest's media %) rides in `pr`: only the guest knows it, and §18.5's ring needs it.
- **The inspector line sits above `#inspector`, not inside `.panel-title`.** Measured at 1280: that strip is 306 px
  and the A/S/D key rail occupies 158–294 of it; on a phone `.panel-title` is `display:none`. One slim line, only while
  somebody else has his selected layer: "Sam Lee is here too", "Sam Lee is adjusting Opacity" (the last key segment of
  their held path through a small label map, raw key otherwise), "Sam Lee is editing this" while they hold its lease.
- **Follow compares on the FRAME when paused.** `FM.setTime` snaps to a frame, so an off-grid `ph` compared raw would
  re-seek, and re-render, on every tick for ever. Playing: past 0.4 s only (D19).
- **The two display switches (`collabCursors`, `collabSelections`) are local and on by default**, and
  `collabCursors` also suppresses taps. They are read on every draw and `syncLabs` — the one call every settings
  change makes — asks presence to redraw.
- **⚠️ Found on the way, an S3 bug with the #688 shape:** `settings.js` restores booleans through an explicit
  whitelist and `collabLabs` was never added to it — so the Labs switch was saved on every flip and reset to OFF on
  every launch, and S3's test only asked whether the key existed. It is in the whitelist now beside the two new keys,
  and `921 S5 the Labs switch and the two display switches survive a reload` is mutation-proved against dropping it.
- **Nothing on the phone's track head** (§18.4) — and on the phone's one-row solo view the other people's layers are
  named in the people rows ("Editor · on 'Logo' · Effects"), which is the same line the owner's Share panel shows.
- **The Home `.hm-live` badge is still not built.** §4.2 moved it to "S5/S6"; its linked-copy half ("SHARED · last
  synced") is link-shaped, and a badge that says LIVE on one kind of card and nothing on the other would be half an
  answer. S6.

**The S5 review (18 findings, each fixed with a `921 S5 review: …` test that fails against the pre-review tree):**

- **Only tools he ENTERS are leased.** §17.2's list included fill-drag and point-edit, but the Colour view of a
  gradient/image fill starts the fill drag by itself, and the Element view of a drawn shape starts Edit Points by
  itself (`isEmbedded`) — so LOOKING at a panel locked the layer for everybody, renewed by the heartbeat. Those two
  still own the canvas (the overlays stand aside) but take no lease; Edit Points entered on purpose still does.
- **A lease is re-checked on every frame, and a demotion releases it** (`H.setRole` and `leaseFor`): an editor
  demoted with the text editor open used to keep the layer. A viewer's device no longer sends `ls` at all.
- **Follow obeys only a current state.** It holds still on a `pr` older than a heartbeat + 1 s, or "playing" with a
  playhead that has not moved for 1 s, and it ENDS — with a toast saying why — when the person leaves, goes away,
  reads as offline, or this guest's own link drops. It used to replay a frozen "playing at 12.3" in 0.4 s loops.
- **A guest's presence ends with its session.** The bridge's `onEnd` detaches presence (the tick does too, as a
  backstop); an offline guest refuses nothing and paints no lock from its last roster.
- **On a guest, the host's silence is everybody's:** six seconds with no `PR` or `roster` greys every face. On the
  owner, the visibility handler sends his "away" at once (a locked phone may never run another tick).
- **Every `PR` frame fits in 1 KB, the owner's own included** — `fitPr` trims `sel` from the end, never `pri`, at
  the one place PR frames are built; his own screen still draws his whole selection.
- **The roster goes to any one peer at most every 500 ms**, never while that peer's `ctl` is backed up, and always
  the latest list. **Taps:** one ring per person per 600 ms, clamped to the project.
- **`pn`/`af` are looked up, never printed:** prototype-free label maps, `PN_LABELS` is now the inspector's real view
  keys, an unknown `af` key reads "a setting" and an unknown panel is not mentioned.
- **The render hook reads every geometry, then writes, and skips unchanged values** — it runs on every rendered
  frame. It computes nothing under a tool, with both switches off, or with nobody current. Pointers glide on
  `transform`, not left/top.
- **The panels are live:** presence tells an open Share/guest panel when what it shows changes (rows updated in
  place); a Follow on somebody who has left keeps the panel and says so; the Share panel's dot is the colour
  presence DRAWS the person in (the host re-colours clashes). Lease refusals name the holder ("Sam Lee is editing
  this") on both sides.
- **Two visual changes, rendered and offered as options (rule 16):** at ≥701 px the inspector line is a pill ON THE
  SEAM above the panel, taking no height from the band (in the flow it scrolled the solved card grid by ~29 px at
  1280×800 and moved it under his pointer); the phone keeps it in the flow. And the session banner starts just past
  the people chip when centring would put it under the chip (four+ people at 380 px), with its words in their own
  ellipsised span so a long "Following …" name can never push the × out.

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

**As built (S3): three layouts were drawn and rendered in the real app before anything was written, per
rule 16 and his standing #545 instruction. Every PNG is kept.**

| option | what it is | at 380 / 1280 |
|---|---|---|
| **steps** (built) | lean main view — people, one **[Add someone with a code]**, the ask row — and the code exchange is a drill-in step inside the same card | `share-steps-380.png`, `share-steps-1280.png` |
| one page | people, then the whole code exchange inline below them | `share-onepage-380.png`, `share-onepage-1280.png` |
| code first | the code block at the top, people underneath | `share-codefirst-380.png`, `share-codefirst-1280.png` |

The measurement that decided it: **the code is 165 characters**, which is six wrapped monospace lines at
380px and five at 1280px. Wherever it sits at rest it is the biggest thing in the card, and on the phone
both inline layouts pushed "who is here" off the screen. It is also the one part of this panel he uses
ONCE per person and then never again, where the people list is what he opens the panel to look at. So
the resting view is lean (§19.1's own word) and the exchange is a step you go into and come back from.

**What S3 does NOT build of §19.1, and why:** no link, no 9-character room code, no QR, no [Copy link] /
[Share…] and no "Reset link and code" — all four need the rendezvous (S6). No settings drill-in and no
"Earlier versions…" (S7 / checkpoints). The "General access" block is therefore one row, *When someone
joins with a code* [Ask me first | Let them in], which is the code half of §19.1's own segment.

**As built (S6): the invite, drawn three ways and rendered in the real app first (rule 16 / #545).**

| option | what it is | at 380 / 1280 |
|---|---|---|
| **link first** (built) | [Copy link] as the big button, [Share…] and [QR] beside it; the 9-character code under them at 22 px with its own [Copy]; the relay's status line; "Reset link and code" | `share-linkfirst-380.png`, `share-linkfirst-1280.png`, and with the QR open `share-linkfirst-qr-380.png` / `-1280.png` |
| code first | the room code on top at meeting-ID size, "Or send the link" below | `share-codefirst-380.png`, `share-codefirst-1280.png` |
| QR first | the QR open at rest, the link and the code under it | `share-qrfirst-380.png`, `share-qrfirst-1280.png` |

What decided it, measured: at 380 px the code-first code (30 px) **wraps onto two lines** ("8Q2-E0Z-" / "0R2")
and the link — the thing he will send nine times in ten — becomes the second choice; QR-first is 196 px of
symbol at rest that pushes the ask row and the connection-code door below the fold on a phone, for the one
case (both phones on one table) where a tap on [QR] costs nothing. Link first keeps the whole panel on one
phone screen with nothing cut, and the QR is one tap away.

Also as built: the ask row is labelled **"When someone uses the link"** with "The short code always asks you
first." under it — §19.1's "link or code" and §14.1's "code joins always knock" cannot both describe one
switch, and the safer reading keeps the knock on the code (nine characters read aloud are far easier to hand
on or overhear than a 44-character link). **A connection code (S3) never knocks**: pasting its answer and
confirming the five letters is the admission (§14.5), and S6's `ask:true` default would otherwise have put a
third "are you sure" after the two deliberate steps. "Add someone with a code" is now **"Connect with a code
instead"** — second choice, still one tap, the only way in with Codes only. §14.9's privacy line sits under it
word for word. With Codes only on, the invite block says so ("Codes only is on — the link and the short code
need the free relay…") and offers no link or code that could not work. **Reset link and code** mints a new
sid, key and code, restarts the relay on the new topics (the suite checks the brokers no longer hold the old
subscriptions), and says what it does to people already in: they stay; if they drop out they need the new link.
"They join as [Editor ▾]" and the settings drill-in are S7's.

**Guest panel, S5:** adds the people list — read-only, from the host's `roster`, in the same colours the owner
sees, each row with a [Follow] — and the owner's role menu gains Follow between the roles and Remove (§19.1).

**Guest panel as built:** state, role and [Leave] (which goes through `FM.collab.leave({keep:true})` —
§12.3's recommended answer). Follow and Comments are S5 / S7.

**As built (S7): the settings menu, drawn three ways first and rendered in the real app (rule 16 / #545).**

| option | what it is | at 380 / 1280 |
|---|---|---|
| **A · drill-in** (built) | ⚙ in the Share card's foot opens "Sharing settings" in the same card, with a ‹ back: You (name and colour) · People in this project (Editors can invite others, Viewers and commenters can export, Most people at once) · On this device (pointers, selections, Codes only) · Connection (status, "Having trouble? Connect with a code") · Earlier versions… · privacy · version | `settings-A-drillin-main-380.png`, `settings-A-drillin-settings-380.png`, and the `-1280` pair |
| B · tabs | [People \| Invite \| Settings] across the top of the card | `settings-B-tabs-people-380.png`, `settings-B-tabs-settings-380.png`, and the `-1280` pair |
| C · one page | every section on one long scroll, Docs' single dialog | `settings-C-onepage-380.png`, `settings-C-onepage-1280.png` |

A keeps the resting view to "who is here and how do I invite someone", which is what he opens the panel
for; B split the people from the invite; C put the settings two and a half screens down at 380 px.
Also as built:
- **The foot is [⚙] [Stop sharing] [Done], and "Comments" is a row in the body.** §19.1's four foot items do
  not fit 380 px (a 332 px content box; the drawn four cut Stop sharing in half), and Stop sharing is the one
  that must never be two taps away.
- **"New people join as [Editor ▾]"** is on the main view, under the ask row — Docs puts the role a link
  grants beside the link. It is where a stranger starts; a member keeps what he gave them.
- **"Most people at once"** offers 2 up to the device's cap (12 PC, 6 phone), counting him.
- **The three device switches write the one settings store** Settings → Labs uses, so the two places cannot
  disagree. **Name and colour** changes the host's own record of him too, so the next roster carries it.
- **Earlier versions…** lists the kept save points, newest first ("Today, 3:42 pm · 12 layers · 1080×1920"),
  each with [Restore] → "Bring this version back?" → a NEW project "<name> — Today, 3:42 pm" on Home, through
  `duplicateFrom` (new layer ids, clips copied under them, 915.3's rollback). The shared project is not
  touched. The card takes the saved document's size, not today's.
- **Guest panel:** its body scrolls now; it says what the role means ("You can watch, play and follow
  along." / "You can read and add comments…"), whether exporting is on, lists the people, has the Comments
  row, and — for an Editor the owner lets invite — the invite LINK with Copy / Share… / QR.

**As built (S7): the phone's Share button moved OFF the top bar, onto the stage.** Measured at 380 px with
Labs on: `#topbar-m` holds back 42 · name · version chip 65 · ? 42 · notes 42 · cog 42 · share 42 · export 38,
and the project-name field was left **34 px — "U.." for "Untitled"**. D18 predicted exactly this ("the phone top
bar has about 85 px to spare and the notes/cog gap is signed off (#189)") and put the presence chip on the stage
instead; §18.5 drew that chip, alone, as "a single 28 px round person+ Share button". So on a phone `#btn-share`
IS that chip at rest — same corner, same classes, same hide rules — and once a session is live the faces
(`#collab-people`) take its place (`#stage:has(> #collab-people) > #btn-share { display:none }`). The name is
80 px again (the same as with Labs off, which the test asserts). On a PC nothing moved. Drawn against: the
version chip shrunk to its icon (69 px for the name, and a signed-off chip loses its words) and the bar icons
narrowed (breaks the #189 gap). Before/after: `topbar-before-380.png`, `topbar-after-380.png`, and the
alternatives `topbar-B-verchip-380.png`, `topbar-C-narrow-380.png`.

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

**As built (S3): two layouts drawn, the leaner one built.**

| option | what it is | at 380 / 1280 |
|---|---|---|
| **inline** (built) | title, one sentence, one field with [Paste] beside it, and a single status line that REPLACES itself as the join proceeds | `join-inline-380.png`, `join-inline-1280.png`, plus `join-inline-midflow-380.png` and `final-join-light-380.png` |
| stacked | the same field, with all five progress lines listed up front as a numbered checklist | `join-stacked-380.png`, `join-stacked-1280.png` |

Listing all five answers "how long will this take" and costs something worse: it presents five things
that have not happened as a set of instructions, on the one screen where the person is already being
asked to do something unfamiliar.

**Also as built:** the sheet grows a second block once a code is accepted — **"Read this back to them"**
with the answer code and a Copy button — because on the code path the guest has to send something back,
which §19.2's list of progress lines does not mention. The `#j=` link field, [Scan QR] and the pending
join are S6 / S8; the field accepts `FM1-…` and says so.

⚠️ **A light-Home pass was needed and it was found by PHOTOGRAPHING the sheet, not by reading it.** The
code block, the Paste chip and the Copy button all declare `var(--panel-2)` / `var(--text)`, which are the
DARK theme's values, so on the white Home they rendered as near-black slabs on paper — the #864 / #649
family again, a rule that covers most of a family and misses the members declared outside it. The fix is
in `theme-glass.css` beside the `#fm-ask.fm-ask-light` rules, which the collaboration cards now share by
name rather than by copy.

**As built (S8): [Scan QR]** is a 44 px square beside [Paste] (the field keeps its width at 380), hidden under
Codes only (the only QR this app draws is an invite link). Tapped, the back camera opens in the sheet under the
field — 4:3, at most 42 % of the screen high, a square guide in the middle — read a few times a second by the
browser's BarcodeDetector, or by jsQR loaded from `cdn.jsdelivr.net/npm/jsqr@1.4.0` at that tap when there is none
(Safari) — once its integrity hash is pinned; until then Safari is told to use its camera app or paste (§26 S8). An invite goes into the field and the sheet says "Found an invite — tap Join to connect."; a QR code that
is not one says so and keeps looking; the camera stops on a find, on [Scan QR] again, on Cancel and when the sheet
closes (including a camera still starting). No camera / no permission / no reader each get one sentence that ends
"paste the link instead". Rendered: `join-scan-380.png`, `join-scan-1280.png`.

### 19.3 Knock card: `#collab-knock`

- Text: "Sam (iPhone) wants to join as Editor", with [Don't allow] [Let in].
- Requests queue one at a time. After 120 s the request auto-declines, with a quiet note in the people list.
- **Phone:** fixed, `top: calc(52px + env(safe-area-inset-top) + 8px)`, left and right 8 px, `z-index:225`. This avoids the toast at bottom 244 px and the FAB.
- **PC:** fixed at the top-right of the stage region, `top:12px; right:12px; width:320px`, `z-index:225`.

**As built (S6):** on the relay the card also shows **"Their screen shows K7F2M"** — the five letters this
leg of the handshake derived, which the joiner sees too ("If they ask, your screen shows K7F2M"). §14.6's
answer for the link: offered, not a gate. A request nobody answers declines itself after `KNOCK_TIMEOUT` and
leaves §19.3's quiet note in the Share panel ("Cass asked to join and was not let in — the request timed
out."), which is now kept until the panel is next drawn rather than cleared by opening it. Rendered:
`knock-380.png`, `knock-1280.png`.

### 19.4 Banner: `#collab-banner`

- Top of `#stage`, centred, 28 px pill, 12.5 px text, `max-width: calc(100% - 140px)` so it clears the people chip.
- **States:** offline ("Ezra is offline — your changes are kept here (3)"), paused, reconnecting, "Following Sam ×", "Update ready — applies when you leave", "View only".
- Uses the `ld-in-x` entrance.

**As built (S6):** the offline state promises a reconnect ONLY while one is running for this copy —
"Ezra is offline · reconnecting… your changes are kept (3)" — and keeps S3's sentence otherwise. The owner's
§14.7 state is the banner's first ACTION ("Sam has a newer FreeMotion [Update now] ×"). **On a phone both are
shorter** ("Reconnecting to Ezra… (3 kept)", "Sam is newer [Update now] ×"): photographed at 380 px the pill
is 240 px wide so it clears the people chip, and the long forms were cut mid-word, losing exactly the half
that says what to do. Rendered: `banner-reconnecting-380/1280.png`, `banner-newer-380/1280.png`.

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

**As built (S6), `#collab-landing`:** title "Open this in your FreeMotion app", the sentence above, three
numbered steps (Tap Copy invite · Open FreeMotion from your Home Screen · Tap Join, then Paste), then
[Join here in Safari instead] and [Copy invite]. It comes BEFORE the Labs question — which app to use is not
a setting — and it does not spend the invite (Safari may be opened again). "iOS" includes iPadOS, which
reports itself as a Mac with a touch screen. With Labs off the next card is **"Turn on Live collaboration to
join"** [Not now] [Turn on], which turns Labs on and carries straight on to the join. Rendered:
`landing-380.png`, `landing-1280.png`, `labs-ask-380.png`, `labs-ask-1280.png`, and the Join sheet waiting on a
knock with its letters, `join-waiting-380.png` / `-1280.png`.

### 19.8 App Settings (`js/settings.js`)

A "Labs" group near the end, built with `toggleRow`, `actionRow` and `segmentRow`:
- "Live collaboration (preview)" (`collabLabs`).
- When on: "Your name and colour" · "Show others' pointers" · "Show others' selections" · "Connect with codes only" (`collabCodesOnly`) · "Join a live project…".

**As built (S6):** "Connect with codes only" is a toggle saved with the other booleans (it is in `load()`'s
whitelist the same day it was added — the #688 bug with a privacy consequence would be worse than a colour),
and flipping it reaches anything already running: on, and the host's relay, a reconnect and a join in flight
all stop and every socket closes; off, and a sharing host's relay starts. The Labs switch's own sentence no
longer says "nothing goes through a server" — it says what the relay sees. Rendered: `settings-labs-380.png`.

**As built (S8): "Test connection"** sits in the Labs group under "Join a live project": [Test] and [Copy], then
one line per question with ✓ / ✕ / –, then the report. Not an actionRow — the answer is the row, so the panel
stays open. Rendered: `settings-labs-380.png`, `settings-labs-1280.png`.

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

**As built (S6):** `welcome` also carries `rid` and `tok` (to THAT member only — never the roster, never a
broadcast) and `hostName`; `hello` carries `proto, schema, app, mk, dev` every time; `ping`/`pong` exist
(the guest pings every 2 s, the owner answers from `onmessage`, never queued); `deny` is also sent AFTER the
handshake — the owner's answer to a reconnect's hello — and a guest session hands it to the app
(`onDeny`). S3's `refused` stays for the connection-code path.

**As built (S7):** `settings` is sent per member — `s:{roExport, editorsInvite, max, owner, link?}`, the
`link` only to an Editor and only while "Editors can invite others" is on (§16.4) — with the welcome, on every
change, and again when that member's role changes. The guest keeps only a link that is an invite link to this
app, and clamps `max`.

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

**As built (S4): the media row lives in `C.media.LIMITS` (frozen, exported), not in `C.LIMITS`** — see §15's as-built note. Every number in it is read by `collab-media.js` and by nothing else, and `C.LIMITS` is frozen at parse time in a file three stages older.
| Knock timeout | 120 s |
| Relay (S6) | driver up within 8 s; an attempt waits 6 s for its answer; offers 10/min per peer, 30/min per room; ≤ 4 offers being answered at once; PeerJS heartbeat 5 s, ID-TAKEN retried 60 s; MQTT keep-alive 30 s; envelope clock skew 120 s, nonce memory 10 min |
| Pending join | 24 h |
| `SCHEMA_REV` / `PROTO` | 1 / 1 |
| Catch-up copies (S8) | per member: 3 at once, then one every 2 s (`CATCHUP_BURST` / `CATCHUP_EVERY`); a request over budget is owed, not refused |
| Peer media manifest (S8) | 4000 entries, 2000 layers per entry (`collab-media.js` `PEER_MAX` / `LAYERS_PER_ENTRY`) |
| Ids (S8) | a layer id, uid or comment id is never one of the 13 `Object.prototype` names (`KEYVAL_RE`, `UID_RE`); a tx `cid` is a safe integer |

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

**As built (S6):** the relay rows are all built — "Couldn't reach the free connection service" with a way to
"Connect with a code instead"; "Couldn't connect directly. Put both devices on the same Wi-Fi, or turn off
mobile data."; "This invite no longer works — ask Ezra for a new link."; declined / full / removed; both
§14.7 lines; and, new, "Ezra's device isn't answering — ask them to open the project in FreeMotion, then try
again" after §13.5's first two minutes of a first join. A token the owner no longer knows ends a copy's
reconnect with "This invite no longer works…", and a copy the owner ended or removed detaches on its next
open with "Ezra stopped sharing — this is now your own copy" / "Ezra removed you — …".

---

## 23. Solo editing unchanged (clause 16)

- With Labs off, **no collab DOM exists**: no `#collab-people`, no `#hm-join-btn`, no `.hm-live`, **and no
  `#btn-share` at all**.
  **Corrected in S3, because the original line contradicted itself:** it said "no collab DOM exists… and
  `#btn-share` stays `.hidden`", and a hidden button is DOM. §4.2 wanted the button written into
  index.html's markup. `js/collab-ui.js` builds it on install and removes it on uninstall instead, for
  two reasons: the stronger promise is the one a person can check, and "there is no share button in the
  page" is checkable in one line where "there is one but it has a class on it" is one CSS regression away
  from being false; and the S2 inertness test already asserted `!document.getElementById('btn-share')`,
  so the gate that guards this needed no exemption for the stage that ships the UI.
- **No listeners, timers, WebSockets or RTCPeerConnections** exist until a session starts. `collab-core.js`'s only work at load is the `#j=` stash and the test-agent gate.
  **As built (S6):** the two document listeners (`visibilitychange`, `online`) exist only while he hosts or a
  relay join or reconnect is running, and every WebSocket is constructed behind `relayGate()` — which Codes
  only closes. The one card that may appear with Labs off is the invite's own "Turn on Live collaboration to
  join", and only when he opened an invite link.
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

**As built.** Everything in the tier-4 and UI lists above shipped, plus the profile prompt, the knock
card and the banner. Six things are worth naming because they are decisions rather than code:

- **`js/collab-signal.js` is the CODES-ONLY half and nothing else** (see §14.5's own "as built" note):
  the minimal-SDP codec, Crockford base32, HKDF/HMAC and the auth handshake. No driver, no invite link,
  no room code, no PBKDF2, no `fetch`, no `WebSocket`. The §23 guard test counts RTCPeerConnection,
  WebSocket and every off-origin `fetch` over a scripted solo session — with Labs OFF and again with Labs
  ON but nothing shared — and asserts zero, with a positive control that constructing an `RtcLink` does
  move the counter.
- **`RtcLink` lives at the foot of `collab-link.js` and implements the same interface as `LoopLink`**, so
  nothing in `collab-session.js` knows it exists. Three NEGOTIATED channels with fixed ids 0/1/2 (in-band
  negotiation makes the id depend on the DTLS role and costs a round trip per channel); `pres` is the one
  that is unordered with `maxRetransmits: 0`. Both `ctl` and `bulk` are framed and flow-controlled:
  **the chunk size is read off `pc.sctp.maxMessageSize`** at send time, never from a constant (Chrome
  reports 262144, other stacks 65536, and `send()` throws over the limit), and the pump refuses to send
  while `bufferedAmount` is over 4 MiB. Measured: 20 MB of bulk in 2.5 s with a peak buffer of 4,198,044
  bytes — the ceiling plus one chunk — and a 300 KB ctl message crossing as 78 frames, byte-identical.
- **The knock is driven by the guest's own `hello`, which the UI holds and replays.** The engine's
  `addPeer` binds the endpoint and mints the mid, and its `onHello` answers with the welcome and the
  snapshot — so there is no seam inside the engine at which to ask. Instead the UI waits for `hello`
  itself (buffering anything else that arrives, the same rule `C.join` follows on the other side), shows
  the card with the joiner's real name, and on approval calls `addPeer` and re-dispatches the held
  message. A refusal sends the `refused` the engine's `C.join` already understands.
- **Turning the Labs switch OFF ends a live session** rather than hiding it. A connection running behind
  a hidden UI is worse than no switch.
- **`#btn-share` is re-homed beside `#btn-export` on every install, and re-synced across every transport
  rebuild.** Three things had to be true at once and only the first was obvious: `pcTransportLayout`
  MOVES Export out of `#topbar` into the transport row, once, and latches, and `#topbar` is then not on
  screen at all on a desktop — so a button placed before that move and never looked at again is a button
  he cannot see (hence the far-list entry), and a button placed after it lands in the right row anyway
  (hence the re-homing). The third was found by the suite: **`pcTransportTeardown` deletes anything it
  did not borrow**, so a share button living in `#t-far` goes with the wrapper when a desktop window is
  narrowed past 701px, and nothing would ever put it back. `pcTransportLayout` now re-syncs on both
  paths; with Labs off it is a no-op, so the row he has today is byte-identical.
- **A 380px width assertion has to measure the LAYOUT box, and this cost a round of false alarms worth
  writing down.** `.fm-ask-card` swings in with `fm-hinge-panel` — `perspective(1600px) rotateX(-42deg)`
  — and `getBoundingClientRect()` returns the TRANSFORMED box, so a 364px sheet measures 433px for the
  first 360 ms of its life and the test reported a card wider than the screen three times running. The
  suite now settles the entrance and uses `offsetWidth`. (The sizing was tightened at the same time, and
  that part was real: `width: 100%` plus `margin: 0 8px` on a flex item lays out at viewport + 16, so the
  card is sized by `flex: 1 1 auto; min-width: 0` instead.)
- **"Stop sharing" REVOKES, it does not just tear down.** Found and fixed while finishing the stage, and
  it is the one defect in this card that was not cosmetic. `C.end()` ended the session and left the
  outstanding `offerLink` untouched, so the RTCPeerConnection behind the last code he read out stayed
  open and gathering — and because `drawCodeStep` deliberately reuses a live offer (one link per step,
  not one per draw), the NEXT Share handed out the SAME code, minted against the room he had just thrown
  away, whose answer would have run `addPeer` on the new session. The confirm card says "The codes you
  have handed out stop working" in as many words, which made it a false promise rather than a leak. One
  `dropOffer()` helper now closes the offer and resets the step, and both `Stop sharing` and `uninstall`
  go through it. Caught by `921 S3 Stop sharing revokes the code that was handed out`, which asserts the
  peer connection reaches `closed` AND that a second share mints a different code — the second half is
  the one a fix that nulled the reference without closing the connection would still fail.

- **`js/collab-ui.js` contains no `innerHTML`.** Every name and every code goes in as `textContent` or
  `.value`, and a colour is matched against the eight-entry palette rather than trusted — the swatch is
  painted into a `style` attribute, so "any string" would be an injection point.

**Not in S3, and why:** the `#j=` stash and `resumePendingJoin` (they need the invite link, S6); the
`#collab-people` chip, the Home `.hm-live` badge and the card menu items (all presence- or
link-shaped — S5/S6); `vendor/qrcode-generator.js` (there is no QR without a code short enough to scan
comfortably, which is the link's job); `collabCursors` / `collabSelections` / `collabCodesOnly` in
settings (a preference row that changes nothing is worse than no row — each arrives with the stage that
reads it).

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

**As built.** `js/collab-media.js` (≈760 lines), the export-dialog hook in `app.js`, the three engine
seams and the bulk routing in `collab-session.js`, the binary copy in `LoopLink`, the `#collab-media`
card and the timeline bar in `styles.css`, and six new agent actions (`addMedia`, `mediaState`,
`mediaWait`, `record`, `ink`, `collabKeys`, `prune`). Eleven tests, all of them `921 S4 …`:

- `the manifest groups one file for every layer that uses it, so a split and a duplicate transfer zero extra bytes`
- `splash.mp4, a PNG and a WAV all arrive, land in this device's own records, and the picture renders` — the real 649 336-byte file, compared byte for byte, and a PIXEL check: the count of the PNG's own colour on a frame rendered through the real compositor, against the same count on the empty scene
- `a link that dies mid-file resumes from the bytes already kept, and what lands is byte-identical`
- `the boot sweep never collects a half-arrived file, and neither does the media collector` — mutation-proved: removing `pruneOrphans`' `collab:` skip turns it red
- `a device with no room says so and writes nothing beyond what fits`
- `a guest export waits for the media it still needs, and "Export anyway" goes ahead` — including that `showExportDialog` really goes through the gate
- `replacing a clip keeps the one it replaced, and undoing the replace puts it back`
- `a font crosses with the document and is applied on the far side, byte for byte`
- `a manifest naming a layer id this device holds in ANOTHER project writes nothing` — mutation-proved: removing the open-document guard overwrites his clip in a project that is not even open
- `tier 3: a clip a guest adds reaches the host and every other peer, and draws there`
- `tier 3: the clips arrive into the guest's own copy and not one byte of its own projects moves`

⚠️ **A TIER-3 INSTANCE IS TICKED BY THE TEST, NOT BY A TIMER.** The agent arms every session with
`autoTick:false`, and §15's reconcile runs ON THE TICK — so a media wait that only polls waits for
something nothing will ever do. `t3until921` ticks every instance in the room, then asks.

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

**As built.** `js/collab-presence.js`, the lease UI and Follow, hooks in `collab-core.js` (attach/detach),
`collab-session.js` (the `pres` channel and presence's half of `ctl`, answered before §8.9's frozen queue like media;
`onJoin` on hello), `collab-ui.js` (people rows, Follow, the "Following Sam ×" banner state), `settings.js` (the two
switches, and the `collabLabs` whitelist fix), and the `PRESENCE` section of `styles.css`. The design step and every
decision are in §18.8. Fifteen tests, all `921 S5 …`, every one failing against HEAD (where the module is absent)
and every one ALSO mutation-proved against the behaviour it names — seventeen mutations, each keeping the module
and removing one rule (presence calling requestRender, `collabLabs` out of the whitelist, no dashed secondaries,
no local lease check, the viewer guard, Follow never ending, the cursor switch ignored, the chip moved onto the
canvas, detach leaving the canvas layer, the playhead 6 px out, the away face not greyed, the inspector ignoring
`af`, the guest ignoring `lease-no`, the clip dot without its dark edge, the guest panel empty, a refusal that does
not close the tool, the lock not painted from the roster):

- `a three-layer remote multi-select draws three outlines — one solid, two dashed — and rings the same three clips…` (PC 1280 AND phone 380 in one test)
- `two seconds of a remote pointer moving never renders the scene — requestRender and renderScene both stay at zero…` — spies on BOTH, because `FM.setTime` renders without going through `requestRender`; it waits 1.5 s first, because setting up the fixture leaves the app's own debounced re-rasterise and motion-idle sharpen in flight (measured: both landed inside the window and were blamed on the pointer)
- `a remote playhead sits at timeToX, and one off screen becomes a chip at the lane edge that takes you there`
- `the people chip shows three faces and +N, the ones away or silent go grey, and alone it is an invite`
- `follow tracks their playhead within 0.4 s, starts and stops with them, and ends on a local tap`
- `a text lease: while Sam types in a layer, opening it here is refused with a toast and the lock shows…`
- `a viewer cannot take a lease, and nobody can lease a layer that does not exist`
- `a text lease seen from a GUEST: the host's lease-no closes the editor there and says who has it`
- `the pointer and selection switches hide their own overlays, and only their own`
- `the people chip overlaps neither the view bar nor the canvas — 9:16 and 16:9 at 380×800, and at 1280×800` (resizes the runner frame's height as well as its width, and opens the view bar)
- `with no session there is no presence DOM, listener or timer, and ending a session takes all three away`
- `the inspector says when someone else is on the layer you have open, and what they are adjusting`
- `the eight person colours read on the dark canvas, are never mistaken for my selection, the keyframes or the playhead, and a clip dot carries a dark edge` — §18.1's contrast test. The palette is KEPT (people already chose from it in S3): lowest canvas contrast 4.35:1, lowest ΔE76 to a reserved colour 28, lowest pair 24. It sits within ΔE 8–14 of some CLIP_COLORS by design, so everything drawn ON a clip carries a dark edge, and the test checks that edge against all eight clip colours
- `the Labs switch and the two display switches survive a reload`
- `the guest panel lists who is here, printed as text, each with a Follow`

The S2 inertness test now allows `presence` in the namespace and asserts it holds no session, timer or listener at
load. The presence footprint is what §23 promises: nothing is built, bound or started until a session on the real app
attaches it, and `detach()` takes every element, listener, timer and class away.

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

**As built.** `js/collab-signal.js` (the relay), `js/collab-qr.js` (new), `js/collab-ui.js` (the invite
block, the host's relay and admission, the Join sheet's relay join, the reconnect, resume on reopen, the pending
invite, the landing and Labs cards, the wake lock, Codes only), `js/collab-session.js` (hello fields, the
member grant in `welcome`, mid reuse, ping/pong liveness, `deny`, the reopen fallback), `js/collab-core.js`
(the stash, two UI hooks, the S6 limits), `js/collab-bridge.js` (`onOffline`/`onEnded`/`onDeny` reach the UI),
`js/storage.js` (`rid`/`code` on a linked copy; `projects.patchCollab`), `js/settings.js` (`collabCodesOnly`),
`js/collab-link.js` (an offer with no key), one guarded line in `js/app.js`, one script tag in index.html, and
the S6 block of `styles.css` / `theme-glass.css`. Every decision against the spec's letter is in its section's
"as built (S6)" note: §4.1, §12.1, §13.5, §14.1–§14.4, §14.2, §14.6, §14.7, §19.1, §19.3, §19.4, §19.7, §19.8,
§20, §21, §22, §23.

Seventeen tests, all `921 S6 …`, all against in-page fakes of the three servers (`fakeNet921`: a broker that
parses MQTT with its OWN parser, and a PeerJS server with ids, EXPIRE and ID-TAKEN) and real peer connections
in one page — the suite needs no network, and `relayGate` makes that a lock rather than a habit:
- `the collaboration code can reach exactly the relays and STUN servers §14.4 names — no other host and no TURN — and the invite link points at the app itself` (the app's own local-only test never scanned the collab files)
- `the envelope seals and opens; a flipped byte, a wrong key, an old timestamp and a reused nonce are all refused; and what a relay carries holds no fingerprint`
- `an invite is read from the fragment only, and one that opened the app is stashed, taken off the address bar, and survives a ?fresh= reload` (a real boot on its own `*.localhost` origin, then the version tap's navigation)
- `a room code folds I, L, O and dashes the way people read it, and its PBKDF2 key is the same on every device and every build` (pinned, and recomputed with the browser's own PBKDF2)
- `the MQTT client speaks 3.1.1 to a broker: CONNECT, SUBSCRIBE and PUBLISH byte by byte, and an offer and its answer cross it sealed`
- `the PeerJS client against a fake server: OPEN, an offer relayed with its source, EXPIRE for a host that is not there, and a taken id retried until it frees`
- `with any one relay dead a real join still works, and an offer the three relays all deliver is acted on once`
- `the knock lets in, turns away, and declines by itself; a member’s token skips it next time; a removed member is refused by name` (through the panel's own Remove)
- `a shared copy finds its owner by itself: a here from the owner makes it offer again at once, its token lets it in, and a dropped link comes back with the banner saying so`
- `an owner who opens another project PAUSES the room — the copy stays linked and comes back by itself; only a real end ends it`
- `tap a link and you’re in: a stashed invite opens the Join sheet already joining, the owner lets it in, and the copy keeps the token that brings it back`
- `the version gate speaks on both screens: …` (the Join sheet's words and [Update], C.join's own gate, the owner's refusal and his [Update now])
- `an invite opened in Safari on an iPhone offers the installed app first, and nowhere else does`
- `Codes only opens no WebSocket at all — sharing, a pasted link and a dropped copy all stay off the network — and turning it off opens them`
- `the Share panel hands out a link, a QR the camera reads back as that link, and a 9-character code; Reset makes new ones and the owner stops listening on the old` (the QR is read by the browser's BarcodeDetector)
- `six seconds with nothing from the owner closes the guest’s link — which starts the reconnect — while a guest that hears its pongs stays on`
- `reopening a project he is sharing starts sharing again on the same link, and a phone that hosts holds a wake lock until sharing stops`

**Found by the suite or by reading the diff, fixed before it shipped:** the module-level `hostRoom` outlived
its project (§12.1 as-built); a hello racing the host's last WebCrypto call was dropped (§14.6 as-built); the
knock's timed-out note was cleared by the very opening of the panel that was meant to show it; a helper
named like S4's `until921` silently replaced it for the whole suite (renamed `until921S6`); `bye paused` ended
copies for good (above); a guest's own Leave closed its link and briefly started a reconnect (a stopping
session is not a wire that went); a foreground during a knock sent a second offer through a stopped
rendezvous and printed an error under a join that was going fine; a joiner that authenticated and never
said hello left its peer connection open on the owner's side; a role he changed was forgotten by the member
table, so a member came back from a phone lock as the link's default role.

**Proved:** every S6 test fails with the S6 source reverted; each changed JS file, reverted alone, turns at
least one S6 test red (the per-file map is in the builder's notes); both stylesheets are caught (a thumb-size
and one-line-code check at 380 px, and the landing card's light-Home ink); and nine behaviour mutations —
replay not refused, no de-duplication, an invite read from the query, a member's token still knocking, a
removed token refused as `auth` rather than by name, `here` ignored, silence ignored, the offer rate per room
instead of per peer, and `paused` read as ended — are each caught by the test that names the rule.

**Not in S6, and why:** §12.3's 7-day auto-detach (§13.5 as-built); a reconnect for a copy that joined by
connection code (§13.5 as-built); `here` over PeerJS (§14.4 as-built); keeping the epoch across a project
switch (§12.1 as-built); "They join as", the settings drill-in (S7); [Scan QR] (S8).
`/security-review` is the integrator's, before ship.

**The S6 review (21 confirmed findings), as fixed.** The structural change first, because four findings were
one design fault: every member's RECONNECT went through the link's (or the code's) topic, sealed with the room
key, so anybody holding the link — including somebody removed — could read each reconnect's SDP (the phone's
address), answer it first and send "removed", which the reconnect believed for good; and the link could not be
changed after a removal without cutting every other member loose.
- **The hub.** Each room has a `hub` (16 random bytes, never rotated) that the owner hands ONLY to members, in
  their `welcome`, beside the token. It names one topic and one PeerJS id; each member seals there with a key
  derived from its OWN token (`S.memberKeys`), and the owner opens hub envelopes by trying each member's key
  (`members()` on a host room). A token is good only in its own member room (`keyFor`). The linked copy stores
  `hub`; the reconnect never uses sid/sk/code again.
- **Signed refusals.** A refusal before auth3 is a claim, not an answer: the owner signs "removed" with the
  member's token (kept in `revoked`, twenty at most, only for this), and the guest reports `proven` only when
  the MAC checks. The reconnect ends a copy ONLY on a proven removed/ended; `auth` (a handshake timeout, a
  crypto hiccup, a wrong MAC) is retried — it used to detach the copy as "lost". The Join sheet retries an
  unproven refusal too.
- **Remove rotates** the link and code (the hub stays), so the removed person's link reaches nobody — even from
  another browser with "Let them in" on. The profile-key block is kept and documented as a hint. The dialog says
  it is permanent and that the link and code change. **Reset** no longer tells him members will need the new link.
- **Offline members** are listed in the Share panel with role and Remove.
- **No names in envelopes:** offers and answers carry only the SDP; each side's name travels inside the
  channel (auth1, hello).
- **The short code lives CODE_TTL (30 min) after it was last on screen.** Its topic is a fixed function of
  45 bits (the salt must be a constant a joiner can know), so the owner listens on — and announces `here` on —
  the code's topic only while it is fresh, and a lapsed code is replaced on the next open of the panel.
- **Budgets per door:** four pending admissions and thirty offers a minute for strangers (link/code), and their
  own for members — four code knocks cannot lock a member's reconnect out. A knock whose joiner leaves is taken
  down; a knock is answered "paused"/"ended" when its session stands down; "stopped waiting" is said.
- **Reconnect:** "Back in sync" waits for the owner's `welcome` (`onWelcome`); a reopened copy shows a
  "reconnecting" banner, and its Share button shows the guest panel with a Leave that works without a session.
- **Relay health:** the panel says "Reconnecting…" when every relay has dropped; an MQTT ping unanswered by the
  next one (or PING_WAIT after a foreground kick) takes the driver down so it reconnects.
- **Joining:** an invite from the address bar fills the Join sheet and waits for ONE tap (any page can navigate
  to a `#j=` address); a join lands in the editor, not on the old Home; a link that dies at the knock says so at
  once; [Update] on a short-code join keeps the code; "their device", never "them’s", and a short code is told to
  check the code; an invite pasted into an open tab (`hashchange`) is picked up; the iPhone landing card says to
  turn Live collaboration on first and names the ⎇ button.
- **Labs off** while sharing drops the room, so turning Labs on later does not re-share it.
- **Not done, and why:** tokens do not expire on their own (an idle limit would silently cut off a collaborator
  who simply did not open the project for a while — a call for Ezra; offline Remove covers the lost phone);
  offers are not moved to a host-only subtopic (a hostile link holder can subscribe to any topic on a public
  broker, and honest guests already drop other guests' offers); answers are not sealed to the offerer with
  ECDH (the owner must answer an offer before any authentication can run, so a link holder can always provoke
  an answer — rotating the link is the control); the `fm1/` prefix stays (an anonymous `#` subscriber sees every
  topic anyway, and the payload shape identifies the app); a joiner's `mk` still goes in the hello before
  admission (the owner's removed-device check needs it before the knock, and joining now takes a tap).

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

**As built.** `js/collab-comments.js` (new), the role filter's comment rule and the first list in
`js/collab-host.js`, the backstop, delete-anyway, `settings` and the stamped-comment echo in
`js/collab-session.js`, the role/settings/delete hooks in `js/collab-bridge.js`, the role answers in
`js/collab-core.js`, the settings menu, Earlier versions, the ten-minute save points, the guest panel, the role
classes and the phone's stage Share button in `js/collab-ui.js`, the canvas confirm and the export switch in
`js/app.js`, the gesture guards in `js/canvas-edit.js` and `js/timeline.js`, one script tag in index.html, and
the `COLLAB S7` block of `styles.css`. Every decision against the spec's letter is in §16.4, §17.3, §19.1 and
§12.4 "as built (S7)". Eleven tests, all `921 S7 …` (the eleventh is below):

- `the host refuses whatever a role may not do, whatever the device claims — a Viewer’s forged edit, a Commenter on somebody else’s comment, an Editor rewriting who wrote one — and stamps every comment with its real author`
- `an Editor changes the canvas only after “Change the canvas for everyone?” — Cancel changes nothing — a Viewer is told they can’t, and alone nobody is asked`
- `a role change reaches the other device at once — the gating classes, the note above the inspector and the + follow it — and a Viewer’s stray edit is written back without a word on the wire`
- `Remove sends “removed”, revokes the token and rotates the link and code — the old link reaches nobody — and an Editor allowed to invite is handed the NEW link, never the old`
- `comments: add, reply and resolve on the card, a mark on the ruler at the comment’s time that opens it, the other device sees it — and an export with open comments goes straight to the export dialog`
- `with “Viewers and commenters can export” off, a Viewer’s Export says so and opens nothing; on, it opens — and an Editor is never stopped`
- `deleting a layer somebody holds is refused and put back where it was, and “Delete anyway” deletes it and frees the lease — on the owner and on a guest`
- `save points: one when sharing starts, another only after ten minutes with a change, never more than ten — and “Earlier versions…” brings one back as a NEW project with its clips`
- `the sharing settings menu has every switch in one place, each reaches only the people it applies to, and it fits a 380 px phone`
- `with Labs on, a phone’s top bar keeps the project name whole — Share is the round invite on the stage, which opens the Share panel, and on a PC it stays beside Export`

Two older tests changed with the rules they measure: the S1 role table (owner and Editor may no longer rewrite
a comment wholesale, its author, its time or its pin) and the S2 viewer-refusal test (its device now believes it
is still an Editor, so the HOST's refusal and §8.2's forced list are still what it measures). The S2 inertness
test admits the new names and asserts that with no session this device reads as the owner, and that comments
are not installed with Labs off. The S3 phone-button test now looks for the button on the stage (or, with a
session live, the people chip that takes its corner); the S6 host scan includes `collab-comments.js`.
An eleventh test, `a Viewer’s drag on the canvas and on a clip moves nothing, not even for a tick — their tap
still selects — and an Editor’s same drag moves both`, measures the gesture guards MID-gesture (the pointerup's
commit would run the backstop and hide a missing guard).

**Proved:** every S7 test fails with the S7 source reverted; each changed file reverted alone turns at least one
S7 test red (collab-core, collab-ui, collab-comments and index.html on the stage gate; the rest on behaviour);
and ten behaviour mutations are each caught by the test that names the rule — no "if changed" on save points,
role classes never applied, role classes not applied at attach, the phone Share back in a bar, Remove not
re-sending the link, the link sent to every role, resolved comments keeping their ruler mark, the export switch
ignored, an owner's forced delete keeping the lease, the desktop delete still offered to a Viewer. The whole
`921` set is green at 1280 and at 380 (200 tests). `/security-review` is the integrator's, before ship.

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

**As built (S8).** Labs gating is still ON — he has not tried Mac ↔ iPhone yet, and that is his, not ours (Q7).
Seven tests, all `921 S8 …`, and every one written to FIND something. What they found is fixed below, each with the
test that fails without it.

*The tests* (seven — the six the brief names and the deterministic test for the one bug the eight-device fuzz found)
- `adversarial peer fuzz` — a minute (27 000 rounds, ~330 000 messages) from a Viewer, a Commenter and an Editor on
  `ctl`, `pres` and `bulk`, plus raw frames written under RtcLink's framing on a real WebRTC link, against the REAL
  app as owner (bridge, presence and media all live). Oracles: nothing throws (the pump, `C.lastError`, window
  errors and rejections); the layer ids and order, every layer field honest traffic does not write, the project and
  the owner's comment are byte-identical to the start; no hostile name ever lands; the member table and its roles
  never move; leases only on editors and existing layers; presence stays sanitised; the owner's screen, the room and
  an honest editor's copy stay identical; the honest editor's every tx is answered in the same exchange; every ping
  gets its pong; no single round holds the main thread past 250 ms (measured worst 83 ms); no member gets more
  document copies than the catch-up budget allows. Each hostile channel has a CONTROL proving it arrived.
- `eight devices converge` — owner + 7 guests, every one the real `Session`, 400 seeded rounds: renames, transforms,
  effects added / removed / edited concurrently, layers inserted / deleted / reordered, parents (including ones
  that close a loop), keyframes, comments, replies, resolves, undo; role changes; dropped links with offline work;
  leaves and fresh rejoins; an owner reload (new epoch → everybody back through a snapshot). Ends with every copy
  and every base identical and nothing outstanding. It found one bug (10 below) once replies, resolves, parents and
  keyframes were added to what it edits; after the fix, its own seed and eight more at 1500 rounds all converge.
- `a 500-layer project under a 4× CPU throttle` — through a real `Emulation.setCPUThrottlingRate` that the test asks
  `tests/_cdp.py` for (below), with a control that the throttled commits are really slower. Measured on this Mac:
  **before S8 the commit-hook diff was median 27.2 / p90 27.9 ms — 2 ms inside the 30 ms budget — and after it,
  median 13.7 / p90 15.2 ms; the hot tick median 3.1 / p90 3.7 ms against 8.** The numbers are in the test.
- `an accelerated one-hour soak` — the real app as owner on a fake clock, 3 600 one-second steps: guests joining and
  leaving every five minutes, one going quiet for two minutes every ten, a stream of new paths. Every step's ceiling
  is read — the ring (reached 2000), lastBy / lastW (reached 10 000), each member's ack cache (reached 64), the
  diagnostics, the deleted-comment memory, reports, pending, the presence people and DOM pools — and every table
  keyed by WHO must hold only who is here. Leases expire at 30 s of silence and presence purges at 60 s, measured.
- `[Scan QR]` — below. `Settings → Labs → Test connection` — below.

*Bugs the fuzz and the soak found (each fixed, each caught by its test with the fix reverted)*
1. **A `hello` made members, with the role it claimed.** `onHello` was `members[mid] || host.join(mid, {role: msg.role})`
   — a hello from an endpoint whose member had been dropped came back as an OWNER. Membership is now minted only by
   `addPeer`; a hello or a resync from a non-member is counted (`reports`, once a second) and not answered.
2. **A copy of the document was free to ask for.** Every `hello` (a tail up to 8 MB or a snapshot) and every
   `resync` made the owner clone, hash and send the whole document, unlimited. Now `CATCHUP_BURST` (3) at once and
   one per `CATCHUP_EVERY` (2 s) per member; a request over budget is OWED, newest wins, and the next tick with a
   token sends it — an honest guest still gets exactly one current copy.
3. **`cid: 1e300` passed validation** (it is ≥ 0 and floor() leaves it alone) and became `lastCid`, so every later
   tx from that device read as a duplicate. A cid must be a safe integer.
4. **An Editor could plant layers called `__proto__`, `constructor`, `toString`…** and the owner's autosave kept
   them. Collab is the one door a peer-chosen id enters by without being re-minted, and the app has plain `{}`
   tables keyed by layer id. `KEYVAL_RE` and `UID_RE` now refuse the thirteen `Object.prototype` names — a FIXED
   list, never read at run time, so two browsers agree to the letter.
5. **The owner downloaded fonts no layer used** — any `FMF…` family an Editor announced was fetched and installed for
   good. A font is wanted only while a text layer here uses it (the rule `scanLocal` advertises by).
6. **…and bytes for layers with no picture.** A manifest naming a shape or text layer made the owner ask for, and
   `writeRecord` store, a peer's bytes against it. Only media-carrying layers are wanted or written.
7. **The peer manifest grew without limit** (every new fid, every merged layer pair) and `planWants` walked all of it
   every sweep. Capped: 4000 entries, 2000 layers per entry.
8. **Any member could move another member's transfer window**, and `upto: Infinity` lifted §15.5's brake for good.
   An `ok` now moves only a transfer to the peer that sent it, and never past what was sent.
9. **Media kept what it had told every member who ever joined** (`told`, one table per mid, for the session). Pruned
   at `bye` and `dropPeer` (`C.media.forget`) and at every advertise.
10. **A refused delete of a keyed element never came back on the device that tried it** — found by the eight-device
   fuzz (seed 921008, round 397): a Commenter undid her own reply just as the owner made her a Viewer; the host refused
   it and, per §7.1 step 11, sent "the current value" — as an `s` on the reply's path, which her device could not
   apply because the reply was already gone from it (`apply` → 'gone'). Her copy never had the reply again. The same
   hole took an effect from an Editor who deleted it on a held layer, and left a refused `am` where the sender had
   moved it. **§7.1 step 11 now says a keyed element that still exists as an `ai` upsert with its anchor**
   (collab-host.js `presentOp`), exactly as a whole layer already went back as an `li`; the guest's §8.2 `forced`
   list does the same. Its own test: `a refused delete or move puts the element back…`.

One older test changed with the rules it measures: `921 S6 the collaboration code can reach exactly the relays…`
admits ONE more host, `cdn.jsdelivr.net/npm/jsqr@1.4.0`, in ONE file, `collab-qr.js`, and checks the reader uses it.

*Decisions against the spec's letter (each also in a code comment)*
- **§26's `vendor/jsqr.js` became a pinned CDN load** — the S8 brief asked for `cdn.jsdelivr.net/npm/`, and it is the
  safer of the two: an unreviewed 250 KB file in the repo and the service worker's cache forever, against an
  immutable npm version fetched only at the tap that needs it. **And it FAILS CLOSED until its integrity hash is
  pinned** (S8 security pass): a CDN script runs with everything the page can reach, and the page holds his AI key.
  Pinning means fetching the file once to hash it, which an unattended build does not do; until then a browser with
  no BarcodeDetector (Safari) is told "This browser can’t read QR codes here yet — open the link with your camera
  app, or paste it instead", is never asked for the camera, and downloads nothing. To turn it on, one line:
  `curl -s https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js | openssl dgst -sha384 -binary | openssl base64 -A`
  and put `'sha384-' + that` in `C.qr.JSQR_SRI` (js/collab-qr.js).
- **The scanner asks for the reader before the camera.** A browser that cannot read a code is never asked for camera
  permission, and no camera is started that a failed reader would leave running (the first version did — the stream
  arrived, the reader failed, and the error path had no stream to stop).
- **A scanned invite fills the field and waits for Join** (§19.2 says only "[Scan QR]"): S6's review made an invite
  in the address bar wait for one tap because anybody can send the browser to one; anybody can hold up a QR code.
- **"Test connection" is three questions, not a readout** (§25.5 names the numbers; §22 names the sentences): can this
  network reach the relays, can this device learn its public address, does this device's WebRTC work and how fast.
  Each is one plain line (§22's own words where they exist), the numbers go in a copyable report
  (`fm.lastConnReport`). Nothing is built until the tap (§23), Codes only wins over everything including the suite's
  stand-in, and a loopback page never reaches a real relay.
- **Two exact rewrites made the budget, not a cache.** §6.2 allowed a per-layer stringify fast path; S1 declined it
  as "an untested cache that decides what to diff". S8 keeps that position: `eq` answers `canon(a) === canon(b)`
  without building strings when the answer is already known (two strings, two booleans, two numbers, the same
  reference — each exact, each checked against canon in the perf test), and `diffObject` stops allocating a path per
  equal leaf. Every leaf is still compared on every commit.
- **The CPU throttle is the driver's, asked for by the page.** A page cannot throttle itself, and every tool reaches
  the suite through `tests/_cdp.py` (ship, prove, spotcheck, mutate), so it polls `__fmWantCpu = {rate, until}` and
  answers `__fmCpuRate`. `until` is the lock: past it the rate goes back to 1 whatever the page says.

*Layout pass (380 × 820 and 1280 × 860, every collaboration surface)* — the Share panel, its settings page, Earlier
versions, the Join sheet with and without the camera, the profile prompt, the knock card, the banner, the comments
card, the stage with three people (chip, outlines, pointers, ruler flags), a Viewer's guest panel, Settings → Labs
with a finished Test connection, the Labs question and the iOS landing card. Nothing off-screen or sticking out of
its card at either width. Small-target notes at 380 (all S3–S7 surfaces, left for his design pass rather than
restyled unasked): the role drop-downs (29 px), "Reset link and code" (26 px), the Ask/Let-in segments (28 px),
Restore in Earlier versions (28 px), and the comment pin chips (16 px).

*S8 review — 29 confirmed findings (25 distinct; 4 were the same defect found twice), each with a `921 S8r` test that
fails with the fix reverted.* What changed, and the decisions the spec did not already make:
- **Media never touches another project's clip** (collab-media.js `foreignIds`). The store is keyed by layer id for
  every project, and a peer writes layer ids: at `M.install` the ids of every OTHER project doc on the device (and
  every media-library key the open project does not use) are named once, and no read, advertise, stash, want or
  write touches one. Chosen over rejecting the `li` at the host because it covers BOTH directions — a guest cannot
  refuse the owner's ops without diverging.
- **A refused op's repair is budgeted** (`FIX_OPS` 200 / `FIX_BYTES` 512 KB per tx, `FIX_BURST` 1 MB refilled at
  `FIX_PER_SEC` 256 KB per member); past it the ack says `resync: 1` and the guest asks for one, paced by `catchUp`.
  A cached ack keeps no repair. RtcLink's send queue is NOT bounded: with the repair budgeted, an ack is at most
  512 KB and usually tiny, and a byte cap there would have to be sized against a legitimate snapshot.
- **`P/comments` text is a string and `resolved` a boolean for every role, and all comments together stay under
  `COMMENT_BYTES` 1 MB** (guests only; the owner's own device is never role-checked).
- **Project keys have shapes** (storage.js `sanitizeProjectFields`, run by `clampProjectDims` — so at every load,
  import and collab batch): markers `{t, label?, thumb?}`, `loopIn/loopOut` finite or null, `notes` an array,
  `thumbPinned` boolean, `background` a string or null (null is transparent), `name` a string.
- **Fonts from a room**: at most 12 fonts / 24 MB per session, and a font this session installed that no text layer
  in any project uses when it ends is removed from the font index. Not session-scoped registration: an Editor's font
  that the owner's project keeps using is the owner's to keep.
- **A removed member's token** gets its own door (one answer at a time, never a member's slot, its own flood count)
  and `REVOKED_TELLS` 3 answers in all; then its room leaves the hub and its envelopes stop opening. The hub is NOT
  rotated on Remove — a member whose phone was locked at that moment would lose its way back for good.
- **A knock is quiet** (RtcLink `quiet`): frames from a link waiting on the knock are counted and dropped unread, and
  past the hello's own budget (32 frames / 256 KB) the link closes and the card goes with it. **The room is counted
  again after "Let in"** (`deny('full')`).
- **Envelopes are rate-limited per room before decrypting** (`ENV_PER_SEC` 20, `ENV_BURST` 60). No key hint was added
  to the envelope: that is a wire change, and the budget bounds the cost without one.
- **Leave**: the card is marked `ended:'left'` first; a deferred app update waits until the copy has settled
  (`C.detach({holdReload})` + `C.runPendingReload`); a resume never starts a second copy while one runs
  (`C.leaving`); the room is checked first (§12.3 step 1: "Not enough room to keep a copy — [Delete it instead]
  [Stay in the session]"); the result is said either way. The owner forgets a member whose `bye` says `left`, and an
  offline row has **Forget** (no block, no rotation) beside Remove.
- **One tab per room** — §12.1 step 6's Web Lock, `fm-collab-host-<pid>`; the guest's is `fm-collab-guest-<gpid>`
  (the copy, not the sid: two copies of one room on one device are already refused by §12.2 check 3).
- **§13.1/§13.4 as specified**: myVersion is kept before an offline flush and offered as a 10 s tappable toast; a
  full outbox makes the guest read-only (edits written back from base) with the banner and its action.
- **"Not now" defers**: skipped clips stay marked missing, the card says "Media not downloaded · [Download now]", and
  an export asks first. **A guest phone receiving media holds a wake lock** and the card says to keep the screen on.
- **Every toast raised from a collaboration card is lifted above its scrim** (z 225, and it takes no taps unless it is
  a button); a refused copy puts the text in a selected field; Settings' Test connection Copy answers on its button.
- **Cards have a scrolling middle** (Join, profile, landing, Labs); the scanner video is capped at 30svh.
- **[Scan QR] only where a reader can exist** (`C.qr.canRead`); otherwise the sheet points at the Camera app.
- **§19.6 Home, built**: `.hm-live` "LIVE · n" / "SHARED" (owner's colour), "Shared by X · live now / last synced", and
  a linked copy's ⋯ is Open · Keep as my own copy · Export video · Leave & delete (no Duplicate, template, element or
  Share live…); his own projects get "Share live…". `duplicateFrom` never copies a `collab` record. **This is a
  visual change he has not seen as options** — the spec's own design, but it should go in front of him before it ships.
- Smaller: an ended guest session is stood down by a new join; a code-joined copy says it cannot reconnect by itself;
  an unanswered old link names a reset as a reason; the short code on an open panel is extended, never re-minted, and
  its half hour starts at the close; an "Owner" mark on the owner's comments while shared; light-theme ✓/✕ colours.

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