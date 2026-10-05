# FreeMotion data-safety review

Reviewed 1 October 2026 against commit `28104a3e83e01ac3880db3fac604a7444c7235aa` (v17.21), on isolated branch `chatgpt/data-safety`. All source references below use that snapshot. This report is the only added file; no application code or tests were changed.

## Result and evidence limits

Four nonduplicate findings were reproduced against the real `js/storage.js` module in Node v24.19.0, using isolated in-memory localStorage/IndexedDB adapters and small browser/FM stubs. These checks exercised actual save, load, migration, cleanup and duplication code. The adapters supplied explicit quota/read failures and a newer saved revision; they did not copy those algorithms into the test. No user's browser storage was touched.

“Confirmed” below means the specified state transition was reproduced at the storage API boundary. Real-browser/mobile end-to-end reproduction, actual failure rates, and device-specific interruption timing remain **UNVERIFIED**. The likelihood ranking is a qualitative judgment, not measured incidence. A review cannot establish that these are every possible way to lose work.

Read the requested storage, Home, scene, app autosave/media code and `js/history.js`, including save/load ordering, lifecycle flushes, revision handling, project operations, history snapshots, media restoration, migrations and orphan cleanup. Searched `audits/*.json` and `REQUESTS.md` by file/feature first and by each candidate's mechanism afterward. Previously recorded issues were excluded, including:

- #830: switching projects while a save rereads a released media registry.
- #829 and `audits/934-hunt.json`: replacement-media history and repeated undo losing the original.
- #834 u8: overlapping media hydration across projects.
- #915 and `audits/915-5-review.json`: duplicate document/write failures, template save-back loss, shared-media pointer rollback hazards and missing-media backup reporting.
- `audits/939-hunt.json`: an interrupted initial media save, an unchanged second tab causing false staleness, and Home rename being undone.
- `audits/935-hunt.json` / `audits/937-hunt.json`: text-edit undo loss and element/template initialization history loss.
- #673: malformed import creating a junk project; #748: repeated quota notifications.

The distinction matters: F1 is a stale tab overwriting **media bytes despite rejecting its document**, F2 is a **read** failure producing a successful incomplete duplicate, F3 is cleanup after **unreadable project metadata**, and F4 is **legacy migration deleting its source after a failed destination write**.

## F1 — A stale tab still overwrites newer media bytes

**Severity: high. Confidence: high. Status: CONFIRMED in an isolated storage reproduction.** Browser tab timing is **UNVERIFIED**.

**What the user does:** opens the same project in two tabs, replaces a clip in one tab and lets it save, then edits in the older tab. The older tab correctly refuses to save its scene document but still runs its blob-save loop.

**What is lost/broken:** the newer document continues to reference the replacement media revision, while IndexedDB now contains the older file/revision. Reopening can show the old take with the newer edit's timing/settings. The newer tab can still rescue its in-memory replacement by saving it again; closing it without another full media save removes that recovery opportunity. This does not prove that the user's original file outside FreeMotion is lost.

### Source evidence

`js/storage.js:111,115` refuses a stale document:

```js
if (_stale) { _writeFail = 'stale'; return false; }
```

```js
if (mine === null || mine !== workOf(raw)) { _stale = true; warnStale(); _writeFail = 'stale'; return false; }
```

However, `js/storage.js:743,747` captures the old tab's media jobs and keeps going after that refusal:

```js
let jobs = []; try { jobs = planBlobWrites(); } catch (e) {}
```

```js
let sceneOk = writeScene();   // rev-guarded; a quota failure shouldn't block the IDB media save below
```

`js/storage.js:789–797` treats any unequal media revision as something to overwrite, including a newer stored revision:

```js
const existing = await idbGet(db, job.id);
if (!existing || (existing.rev || 0) !== job.rev) {
```

```js
const asPtr = job.ref ? await idbPutPointer(db, job.id, { ref: job.ref, kind: job.kind, rev: job.rev }) : false;
const wrote = asPtr || await idbPut(db, job.id, { file: job.file, kind: job.kind, rev: job.rev });
if (wrote) landed.push({ id: job.id, rev: job.rev });
```

The warning at `js/storage.js:89` even promises:

```js
if (FM.toast) FM.toast('This tab is showing an older copy of the project — newer changes were saved elsewhere. Reload to catch up; nothing here has been saved over them.', 9000);
```

### Reproduction

1. Prepare project P with an image layer `clip`, document revision 1, layer `mediaRev: 0`, and stored image A at blob revision 0. Load it in tab A.
2. In tab B, replace that layer's file with B and save. Its document advances to revision 2 and layer `mediaRev: 1`; the blob under `clip` is B, revision 1.
3. Make a normal transform edit in tab A and allow its 600 ms autosave, or call `FM.storage.save()` to isolate the save boundary.
4. The stale warning appears; inspect P's document and the `clip` record.

**Observed in the controlled reproduction:** `_sceneRevState()` returned `{"lastRev":1,"stale":true,"disk":2}`. The saved layer still requested media revision **1**, but the blob was overwritten with **A, revision 0**. The warning quoted above was emitted. The harness disabled thumbnail/index refresh for this case; it used the real document guard and blob writer.

**Recovery/fix direction:** distinguish stale-document refusal from quota refusal before saving media; preserve appropriate saves for quota failures without letting a stale writer mutate the shared media state. Do not assume numeric media revisions can simply increase forever: undo intentionally restores older revisions, so ownership/serialization must be considered. No fix was made.

## F2 — Duplicate reports success when a source media read fails

**Severity: medium. Confidence: high. Status: CONFIRMED with an injected IndexedDB read error.** Natural-device incidence is **UNVERIFIED**.

**What the user does:** duplicates a project when an IndexedDB media read fails. Unlike a failed destination write, that read error is treated as an absent optional record.

**What is lost/broken:** a normal-looking copy is saved and indexed with its image/video layers but without their files. The source remains intact at this point. If the user trusts the duplicate and deletes the source, the copy has no media bytes of its own to restore. The destructive follow-on deletion was not needed to reproduce the broken copy and was not exercised.

### Source evidence

`js/storage.js:175` converts a read error to the same `null` returned for missing data:

```js
function idbGet(db, key) { return new Promise((res) => { try { const rq = db.transaction(STORE, 'readonly').objectStore(STORE).get(key); rq.onsuccess = () => res(rq.result); rq.onerror = () => res(null); } catch (e) { res(null); } }); }
```

`js/storage.js:2644,2655–2656` creates the duplicate document and index entry before copying its media:

```js
if (!writeJSON('fm.proj.' + nid, { project: Object.assign(JSON.parse(JSON.stringify(doc.project)), { name: name }), layers: re.layers, selectedId: null, selectedIds: [] })) return null;
```

```js
idx.unshift(card);
if (!this.saveIndex(idx)) { try { localStorage.removeItem('fm.proj.' + nid); } catch (e) {} return done(false); }
```

`js/storage.js:2659,2666–2667,2678` leaves success true when the read fails:

```js
let whole = true;
```

```js
const rec = await idbGetMedia(db, oldId);
if (!rec) continue;
```

```js
if (whole) return done(true);
```

Home trusts that return at `js/home.js:1423–1425`:

```js
const ok = await FM.projects.duplicate(p.id);
render();
if (!ok) { if (FM.toast) FM.toast('Could not duplicate — storage is full'); return; }
```

### Reproduction

1. Make a saved project P containing image layer `clip`, with a valid image record under `clip` in IndexedDB.
2. In a disposable test environment, fail only the `get('clip')` request during duplication by firing its `onerror`; allow opens, writes, index updates and thumbnail reads to succeed.
3. Call `FM.projects.duplicate('p')`, or use the card's Duplicate action with the same fault injection.
4. Inspect the resulting document's new layer ID and look for its media record.

**Observed:** duplicate returned `true`; the index gained `Original copy` with `layers: 1`; the copied document contained its re-ID'd layer; the only media key was still the source's `clip`; no warning was emitted. Shapes/text legitimately lack media, but the reproduced layer was an image with an existing source file.

**Recovery/fix direction:** preserve read-failure information, distinguish non-media layers from missing required media, and fail/roll back or explicitly report an incomplete copy. A successful write rollback already exists; the read-failure path bypasses it. No fix was made.

## F3 — Cleanup treats an unreadable project as having no media references

**Severity: high. Confidence: high. Status: CONFIRMED with malformed stored JSON.** The origin/frequency of such corruption and the full browser startup sequence are **UNVERIFIED**; no claim is made that ordinary `localStorage.setItem` partially writes JSON.

**What the user does:** reopens the app with an unreadable saved project, or opens another healthy project while the damaged one remains stored. Startup's orphan sweep can remove still-recoverable media belonging to the damaged document.

**What is lost:** non-library, non-shared layer blobs referenced only by the unreadable document. Before the sweep those bytes are recoverable independently of the document; afterward the app has deleted them. Blobs protected by another readable project, the media library, live memory, collaboration checkpoints or the unconditional `lib:` exemption are outside this finding. Copied/split layers with their own stored keys are relevant examples of records without a library keep-reference.

### Source evidence

`js/storage.js:18` turns any parse/read error into the supplied default:

```js
function readJSON(key, def) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : def; } catch (e) { return def; } }
```

`js/storage.js:2937–2939` records that a project exists, but an unreadable document contributes no layer references and does not stop cleanup:

```js
if (lk && lk.indexOf('fm.proj.') === 0) {
  projIds.add(lk.slice(8));
  const d = readJSON(lk, null); if (d && d.layers) d.layers.forEach(l => keep.add(l.id));
```

`js/storage.js:2991,2995–2998` selects and deletes the unprotected blobs. Its fresh second scan repeats the same parse-failure behavior:

```js
if (!keep.has(k)) candidates.push(k);
```

```js
const keep2 = collectKeep();
for (const k of candidates) {
  if (keep2.has(k) || ckptKeep.has(k) || FM.media.get(k)) continue;
  await idbDel(db, k);
```

`js/app.js:6877` invokes the sweep after the boot load promise resolves:

```js
if (FM.projects) FM.projects.pruneOrphans();   // boot sweep of orphaned media blobs
```

### Reproduction

1. In a disposable profile, save a project with an image stored under its own layer ID, absent from the Media library and every other project's/checkpoint's references.
2. Make only `fm.proj.<id>` unparsable; retain its index entry and its valid IndexedDB blob. This deliberately establishes the corrupt-project precondition rather than pretending corruption was naturally reproduced.
3. With no live media reference, call `FM.projects.pruneOrphans()` (the boot caller uses this same function).
4. Inspect that blob key afterward.

**Observed:** before the call, the mock IndexedDB contained `clip` with its original bytes; afterward it contained no keys. The malformed project document remained. No explicit project deletion had been requested.

**Additional recovery hazard, narrowly confirmed:** `js/storage.js:875–881` binds the current ID before JSON parsing and returns `false` on unreadable content. With an unreadable document lacking a recognizable leading revision, a subsequent `flushSync()` wrote the blank current scene over that raw document. The focused probe returned `load() === false`, then `flushSync() === true`, leaving `{"rev":1,...,"layers":[]}`. `js/storage.js:3776` / `3777` register pagehide/visibility flushes. Do **not** generalize this overwrite result to every corrupt file: a recognizable positive leading revision can instead trip the stale guard. The cleanup loss above does not depend on that overwrite variant.

**Recovery/fix direction:** a failed project read means its references are unknown, not empty. Retain/quarantine affected storage, avoid destructive cleanup until all required references can be established, and preserve the raw document before replacing it with a blank fallback. No fix was made.

## F4 — Legacy migration deletes the source after a quota-refused destination write

**Severity: high. Confidence: high. Status: CONFIRMED with an injected QuotaExceededError.** How many users still have this old storage format is **UNVERIFIED** and likely much smaller than the current-format population.

**What the user does:** opens a pre-multi-project installation whose project remains in `fm.scene`, while localStorage has insufficient headroom for another copy of that scene.

**What is lost:** the only saved scene document, including its edits and layer structure. The new index can advertise a project whose document was never written. Existing media bytes cannot reconstruct its transforms, timing, effects and text. A prior portable backup remains a possible external recovery source.

### Source evidence

The general writer at `js/storage.js:19` returns `false` on quota failure:

```js
function writeJSON(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { warnQuota(e); return false; } }
```

Migration discards that result and deletes the source at `js/storage.js:2435–2438`:

```js
if (legacy && legacy.project) {
  writeJSON('fm.proj.' + id, legacy);
  idx.unshift({ id: id, name: legacy.project.name || 'My project', created: Date.now(), modified: Date.now(), width: legacy.project.width, height: legacy.project.height, duration: legacy.project.duration, layers: (legacy.layers || []).length, thumb: null });
  try { localStorage.removeItem(SCENE_KEY); } catch (e) {}
```

`js/storage.js:2442` then saves the advertised project list:

```js
this.saveIndex(idx);
```

### Reproduction

1. Start with `fm.scene` containing a valid legacy project with at least one layer, no current project/index, and insufficient space to duplicate the document.
2. In a disposable fault-injection environment, throw `QuotaExceededError` for the destination `fm.proj.*` write. Permit removal and the smaller pointer/index writes, matching the fact that deleting the old scene frees space.
3. Call `FM.projects.migrate()`; `FM.storage.load()` also calls it at line 874.
4. Inspect `fm.scene`, the new `fm.proj.*` key and `fm.projects`.

**Observed:** `fm.scene` was gone; there was no replacement project document; `fm.currentProject` and an index card for `Legacy` remained. The generic storage-full toast was emitted, but the scene it tells the user to export has not been loaded into the editor. This is destruction during migration, not merely a paused autosave.

**Recovery/fix direction:** retain the legacy source until the destination document and index have successfully persisted and been verified; make retries safe. No fix was made.

## Remaining scope and recovery observations

- **Autosave and interruptions:** `js/storage.js:869` debounces real edits by 600 ms. Lifecycle handlers call the synchronous document flush, not a guaranteed completion of pending IndexedDB transactions. The interrupted-media-save case is already in `audits/939-hunt.json`, so it is not relisted. Operating-system termination without lifecycle delivery was not tested.
- **Undo/redo:** `js/history.js:25–28` snapshots project/layers with `FM.jsonReplacer`; lines 325–326 flush pending text/commit work before undo/redo and schedule autosave afterward. Media history is restored separately through `js/app.js:4625–4659`. No additional nonduplicate undo defect was established. The snapshot limit is bounded (120 entries plus a byte budget), so it is not a permanent backup.
- **Scene consistency:** reviewed `FM.cloneLayer`, runtime-key stripping and parent-cycle repair in `js/scene.js:757,807–829,867–888`. Parent repair has an explicit load warning. No new nonduplicate clone/parent loss was established.
- **Delete, rename and imports:** traced Home handlers into storage operations, quota rollback paths, re-ID and media hydration. Existing generic malformed-import, replacement-history and failed-pack-write findings were excluded. No claim is made that independent localStorage and IndexedDB operations form one atomic transaction.
- **Unreadable/old projects:** a startup catch can still open Home for other projects (`js/app.js:6878` onward), but that does not preserve every damaged project's bytes; see F3. Legacy source preservation fails as shown in F4. Backups are user-created, not an automatically verified recovery copy of every save.
- **Index/data agreement:** F2 creates a successful indexed but media-incomplete copy; F4 can leave an indexed project with no document. Other generic orphan-index proposals were not promoted to findings without evidence.

## Top 10 ranked by likelihood × impact

Only four nonduplicate findings were established. Positions 5–10 are intentionally unfilled. Likelihood is relative and conditional on the stated trigger, not a measured probability.

| Rank | Finding | Relative likelihood | Impact | Severity / confidence |
| --- | --- | --- | --- | --- |
| 1 | F1: stale tab overwrites newer media | Moderate when editing the same project in two tabs | Wrong take persists despite the stale-write protection | High / high |
| 2 | F2: Duplicate succeeds after a media read failure | Low to moderate; requires an IndexedDB read failure | Incomplete copy may be mistaken for a safe replacement | Medium / high |
| 3 | F3: cleanup deletes media of an unreadable project | Low; requires unreadable metadata and unprotected blobs | Removes recoverable source bytes without a delete request | High / high |
| 4 | F4: quota failure during legacy migration deletes the source | Low; legacy users near quota only | Entire saved scene document lost | High / high |
